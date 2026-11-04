/**
 * Requirement R2 Test Suite: Motion Art & Fluid Mesh Defrosting under Overlays
 *
 * Verifies:
 * - 1. Video decoders protected on blur & visibilitychange during active song playback.
 * - 2. Fluid mesh focus defrost hook in renderer.js.
 * - 3. WebGL fluid mesh loop deadlock elimination in loop() and start().
 * - 4. Fluid mesh defrost() method and webglcontextrestored initial frame + loop restart.
 * - 5. Island GL Dissolve _initGL context-loss check and disintegrate watchdog timer.
 * - 6. Ambient CSS blur opacity scoped with :not(.is-playing).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('  REQUIREMENT R2: MOTION ART & FLUID MESH DEFROSTING TEST SUITE ');
console.log('================================================================\n');

const srcDir = path.join(__dirname, '../src');
const rendererJs = fs.readFileSync(path.join(srcDir, 'renderer.js'), 'utf8');
const fluidMeshJs = fs.readFileSync(path.join(srcDir, 'modules/fluid-mesh.js'), 'utf8');
const dissolveJs = fs.readFileSync(path.join(srcDir, 'modules/island-gl-dissolve.js'), 'utf8');
const ambientCss = fs.readFileSync(path.join(srcDir, 'styles/_ambient.css'), 'utf8');

const { FluidMeshGradient } = require('../src/modules/fluid-mesh.js');
const { IslandGLDissolve } = require('../src/modules/island-gl-dissolve.js');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(err);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// 1. VIDEO DECODER PROTECTION ON WINDOW BLUR & VISIBILITYCHANGE
// ----------------------------------------------------------------------------
console.log('--- 1. Video Decoder Protection on Blur & Visibility Change ---');

runTest('1.1: window.blur protects video decoders during active playback', () => {
  // Extract blur listener body that manages window-blurred
  const blurMatches = [...rendererJs.matchAll(/window\.addEventListener\('blur',\s*\(\)\s*=>\s*\{([\s\S]*?)\}\);/g)];
  const blurHandler = blurMatches.find(m => m[1].includes('window-blurred'));
  assert.ok(blurHandler, 'window blur listener managing window-blurred must exist');
  const blurBody = blurHandler[1];
  assert.ok(
    blurBody.includes('isPlaybackActive'),
    'blur listener must check isPlaybackActive before pausing videos'
  );
  assert.ok(
    !blurBody.includes('if (!settings.wallpaperMode || !isWallpaperDesktopFocused) pauseAnimatedArtVideos();'),
    'Legacy unconditional pauseAnimatedArtVideos on blur must be removed'
  );
  assert.ok(
    blurBody.includes('pauseAnimatedArtVideos();'),
    'pauseAnimatedArtVideos must still be called when not playing'
  );
});

runTest('1.2: document visibilitychange protects video decoders during active playback', () => {
  const visMatches = [...rendererJs.matchAll(/document\.addEventListener\(['"]visibilitychange['"],\s*\(\)\s*=>\s*\{([\s\S]*?)\}\);/g)];
  assert.ok(visMatches.length >= 2, 'Both visibilitychange listeners must exist');
  for (const match of visMatches) {
    const body = match[1];
    if (body.includes('pauseAnimatedArtVideos();')) {
      assert.ok(
        body.includes('isPlaybackActive'),
        'visibilitychange handler that pauses videos must guard with isPlaybackActive'
      );
    }
  }
});

// ----------------------------------------------------------------------------
// 2. FLUID MESH FOCUS DEFROST HOOK IN RENDERER.JS
// ----------------------------------------------------------------------------
console.log('\n--- 2. Fluid Mesh Focus Defrost Hook ---');

runTest('2.1: window.focus invokes fluidMeshGradientInstance.defrost() when available', () => {
  const focusMatches = [...rendererJs.matchAll(/window\.addEventListener\('focus',\s*\(\)\s*=>\s*\{([\s\S]*?)\}\);/g)];
  const focusHandler = focusMatches.find(m => m[1].includes('window-blurred'));
  assert.ok(focusHandler, 'window focus listener managing window-blurred must exist');
  const focusBody = focusHandler[1];
  assert.ok(
    focusBody.includes('fluidMeshGradientInstance.defrost()'),
    'focus listener must call fluidMeshGradientInstance.defrost()'
  );
  assert.ok(
    focusBody.includes('shouldRunFluidMesh()'),
    'focus listener must guard fluid mesh defrost with shouldRunFluidMesh()'
  );
});

// ----------------------------------------------------------------------------
// 3. FLUID MESH LOOP DEADLOCK ELIMINATION & START UNBLOCKING
// ----------------------------------------------------------------------------
console.log('\n--- 3. Fluid Mesh Loop Deadlock Elimination ---');

runTest('3.1: loop() does not break into setTimeout during throttling; ticks via direct rAF', () => {
  const loopMatch = fluidMeshJs.match(/loop\(\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(loopMatch, 'loop() method must exist in fluid-mesh.js');
  const loopBody = loopMatch[1];
  assert.ok(
    !loopBody.includes('this._settleTimerId = setTimeout('),
    'loop() must NOT break throttled frames into setTimeout'
  );
  assert.ok(
    loopBody.includes('this.animId = requestAnimationFrame(() => this.loop());'),
    'loop() must continue ticking via direct requestAnimationFrame'
  );
});

runTest('3.2: start() clears prior animId and _settleTimerId and never deadlocks', () => {
  const startMatch = fluidMeshJs.match(/start\(\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(startMatch, 'start() method must exist in fluid-mesh.js');
  const startBody = startMatch[1];
  assert.ok(
    !startBody.includes('if (this.running && (this.animId || this._settleTimerId)) return;'),
    'start() must NOT early-return when running with animId, which causes deadlock'
  );
  assert.ok(
    startBody.includes('cancelAnimationFrame(this.animId)'),
    'start() must cancel any existing frame ID'
  );
  assert.ok(
    startBody.includes('clearTimeout(this._settleTimerId)'),
    'start() must clear any existing settle timer ID'
  );
});

// ----------------------------------------------------------------------------
// 4. FLUID MESH DEFROST METHOD & CONTEXT RESTORATION
// ----------------------------------------------------------------------------
console.log('\n--- 4. Fluid Mesh Defrost Method & Context Restoration ---');

runTest('4.1: FluidMeshGradient provides a public defrost() method', () => {
  assert.strictEqual(
    typeof FluidMeshGradient.prototype.defrost,
    'function',
    'FluidMeshGradient must define defrost() on prototype'
  );

  let rendered = false;
  let started = false;
  const mockCanvas = {
    getContext: () => ({
      viewport: () => {},
      useProgram: () => {},
      uniform2f: () => {},
      uniform1f: () => {},
      uniform3fv: () => {},
      drawArrays: () => {},
      isContextLost: () => false
    }),
    addEventListener: () => {},
    style: {}
  };

  const mesh = new FluidMeshGradient(mockCanvas, { targetFps: 30 });
  mesh.useWebGL = true;
  mesh.renderWebGL = () => { rendered = true; };
  mesh.start = () => { started = true; };
  mesh.isPlaying = true;

  mesh.defrost();
  assert.strictEqual(mesh.isContextLost, false, 'defrost must reset isContextLost to false');
  assert.strictEqual(rendered, true, 'defrost must render an initial frame');
  assert.strictEqual(started, true, 'defrost must call start() when active');
});

runTest('4.2: webglcontextrestored in fluid-mesh.js renders initial frame and restarts loop', () => {
  const restoredMatch = fluidMeshJs.match(/this\.canvas\.addEventListener\('webglcontextrestored',\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*false\);/);
  assert.ok(restoredMatch, 'webglcontextrestored listener must exist in fluid-mesh.js');
  const restoredBody = restoredMatch[1];
  assert.ok(
    restoredBody.includes('this.renderWebGL()'),
    'webglcontextrestored must trigger initial frame rendering'
  );
  assert.ok(
    restoredBody.includes('this.start()'),
    'webglcontextrestored must restart loop via this.start()'
  );
});

// ----------------------------------------------------------------------------
// 5. ISLAND GL DISSOLVE CONTEXT LOSS & WATCHDOG TIMER
// ----------------------------------------------------------------------------
console.log('\n--- 5. Island GL Dissolve Context Loss & Watchdog Timer ---');

runTest('5.1: IslandGLDissolve._initGL verifies !this.gl.isContextLost() and clears stale context', () => {
  const initMatch = dissolveJs.match(/_initGL\(\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(initMatch, '_initGL method must exist');
  const initBody = initMatch[1];
  assert.ok(
    initBody.includes('!this.gl.isContextLost()') || initBody.includes('!this.gl.isContextLost'),
    '_initGL must check isContextLost on cached gl'
  );
  assert.ok(
    initBody.includes('this.gl = null;'),
    '_initGL must invalidate gl reference on context loss'
  );
});

runTest('5.2: IslandGLDissolve.disintegrate sets a safety watchdog timer to restore opacity', (done) => {
  assert.ok(
    dissolveJs.includes('this._watchdogTimer = setTimeout('),
    'disintegrate must schedule a watchdog timer'
  );
  assert.ok(
    dissolveJs.includes('this._watchdogTimer') && dissolveJs.includes('clearTimeout(this._watchdogTimer)'),
    'stop() and completion must clear the watchdog timer'
  );
});

// ----------------------------------------------------------------------------
// 6. AMBIENT CSS BLUR OPACITY SCOPING
// ----------------------------------------------------------------------------
console.log('\n--- 6. Ambient CSS Blur Opacity Scoping ---');

runTest('6.1: _ambient.css scopes body.window-blurred:not(.is-playing) .fluid-mesh-canvas', () => {
  assert.ok(
    ambientCss.includes('body.window-blurred:not(.is-playing) .fluid-mesh-canvas'),
    '_ambient.css must scope blur opacity reduction to :not(.is-playing)'
  );
  assert.ok(
    !ambientCss.includes('body.window-blurred .fluid-mesh-canvas {\n  opacity: 0.35 !important;'),
    'Unscoped body.window-blurred .fluid-mesh-canvas rule must be replaced'
  );
});

console.log(`\nAll ${passedTests}/${totalTests} Requirement R2 tests passed successfully!\n`);
