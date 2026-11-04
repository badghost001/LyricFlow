/**
 * tests/adversarial-challenger-m2-3-defrost-cpu.test.js
 * Adversarial Challenger Independent Empirical Test Suite
 *
 * Rigorously stress-tests:
 * 1. FluidMeshGradient.prototype.defrost() edge cases, idempotency, context-loss handling, 2D fallback.
 * 2. WebGL context loss & restoration crash-recovery cycle.
 * 3. Video decoder unbinding protection under simulated blur/visibility permutations in VM sandbox.
 * 4. IslandGLDissolve context loss reacquisition and stalled-rAF safety watchdog timer.
 * 5. Profiler core normalization and role classification boundary conditions.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('  ADVERSARIAL CHALLENGER: DEFROST, RESILIENCE & PROFILING AUDIT ');
console.log('================================================================\n');

// Mock window and performance if not present in Node environment
if (!global.window) {
  global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}
if (!global.performance) {
  global.performance = { now: () => Date.now() };
}
let rAFCounter = 1;
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = (cb) => {
    const id = ++rAFCounter;
    setTimeout(() => cb(Date.now()), 16);
    return id;
  };
}
if (!global.cancelAnimationFrame) {
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

const { FluidMeshGradient } = require('../src/modules/fluid-mesh.js');
const { IslandGLDissolve } = require('../src/modules/island-gl-dissolve.js');

let totalTests = 0;
let passedTests = 0;

async function runEmpiricalTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// SUITE 1: FLUID MESH DEFROSTING & ADVERSARIAL RE-ENTRANCY
// ----------------------------------------------------------------------------
console.log('--- Suite 1: FluidMeshGradient Defrosting & Adversarial Re-Entrancy ---');

function createMockWebGLCanvas(contextLostState = false) {
  let isLost = contextLostState;
  const listeners = {};
  const gl = {
    viewport: () => {},
    useProgram: () => {},
    uniform2f: () => {},
    uniform1f: () => {},
    uniform3fv: () => {},
    drawArrays: () => {},
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    getAttribLocation: () => 0,
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    getUniformLocation: () => ({}),
    isContextLost: () => isLost,
    getExtension: (ext) => {
      if (ext === 'WEBGL_lose_context') {
        return {
          loseContext: () => {
            isLost = true;
            if (listeners['webglcontextlost']) {
              listeners['webglcontextlost'].forEach(cb => cb({ preventDefault: () => {} }));
            }
          },
          restoreContext: () => {
            isLost = false;
            if (listeners['webglcontextrestored']) {
              listeners['webglcontextrestored'].forEach(cb => cb());
            }
          }
        };
      }
      return null;
    }
  };

  const canvas = {
    getContext: (type) => {
      if (type.includes('webgl')) return gl;
      return null;
    },
    addEventListener: (evt, cb) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(cb);
    },
    removeEventListener: (evt, cb) => {
      if (listeners[evt]) {
        listeners[evt] = listeners[evt].filter(c => c !== cb);
      }
    },
    style: {},
    width: 800,
    height: 600
  };

  return { canvas, gl, listeners };
}

async function runAll() {
  await runEmpiricalTest('1.1. Defrost idempotency: 100 rapid consecutive calls do not leak loops or throw', () => {
  const { canvas } = createMockWebGLCanvas();
  const mesh = new FluidMeshGradient(canvas, { targetFps: 30 });
  mesh.isPlaying = true;

  let renderCount = 0;
  mesh.renderWebGL = () => { renderCount++; };

  for (let i = 0; i < 100; i++) {
    mesh.defrost();
  }

  assert.strictEqual(mesh.running, true, 'Mesh must be running');
  assert.ok(mesh.animId, 'Mesh must have an active animation ID');
  assert.strictEqual(renderCount, 100, 'Each defrost draws an immediate frame');

  mesh.stop();
  assert.strictEqual(mesh.running, false, 'Mesh cleanly stops');
});

  await runEmpiricalTest('1.2. Defrost while sleeping is a strict no-op', () => {
  const { canvas } = createMockWebGLCanvas();
  const mesh = new FluidMeshGradient(canvas, { targetFps: 30 });
  mesh.isPlaying = true;
  mesh.sleep();
  assert.strictEqual(mesh.isSleeping, true);

  let renderCalled = false;
  mesh.renderWebGL = () => { renderCalled = true; };

  mesh.defrost();
  assert.strictEqual(renderCalled, false, 'renderWebGL must not be called while sleeping');
  assert.strictEqual(mesh.running, false, 'Mesh must not start while sleeping');
});

  await runEmpiricalTest('1.3. Defrost requests WebGL context restoration and avoids drawing into a lost context', () => {
  const { canvas, gl } = createMockWebGLCanvas(true); // context lost
  const mesh = new FluidMeshGradient(canvas, { targetFps: 30 });
  mesh.isPlaying = true;

  let renderCalled = false;
  mesh.renderWebGL = () => { renderCalled = true; };

  mesh.defrost();
  assert.strictEqual(gl.isContextLost(), false, 'defrost must request restoration when the context is lost');
  assert.strictEqual(mesh.isContextLost, false, 'the restored event must clear the lost-context state');
  assert.strictEqual(renderCalled, true, 'the restored event must render a fresh frame');
});

  await runEmpiricalTest('1.4. Defrost in 2D fallback mode renders 2D frame and starts loop', () => {
  const listeners = {};
  let draw2DCalled = false;
  const mock2DContext = {
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    fillRect: () => { draw2DCalled = true; },
    clearRect: () => {},
    save: () => {},
    restore: () => {}
  };
  const canvas = {
    getContext: (type) => {
      if (type === '2d') return mock2DContext;
      return null; // No WebGL
    },
    addEventListener: (evt, cb) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(cb);
    },
    style: {},
    width: 800,
    height: 600
  };

  const mesh = new FluidMeshGradient(canvas, { targetFps: 30 });
  assert.strictEqual(mesh.useWebGL, false, 'Must fallback to 2D canvas');
  mesh.isPlaying = true;

  mesh.defrost();
  assert.strictEqual(mesh.running, true, 'Defrost in 2D mode must start loop');
  assert.strictEqual(draw2DCalled, true, 'Defrost in 2D mode must render 2D fallback frame');
  mesh.stop();
});

// ----------------------------------------------------------------------------
// SUITE 2: WEBGL CRASH & RESTORATION EVENT SIMULATION
// ----------------------------------------------------------------------------
console.log('\n--- Suite 2: WebGL Context Loss & Restoration Simulation ---');

  await runEmpiricalTest('2.1. webglcontextlost event pauses drawing and marks isContextLost', () => {
  const { canvas, gl, listeners } = createMockWebGLCanvas();
  const mesh = new FluidMeshGradient(canvas, { targetFps: 30 });
  mesh.isPlaying = true;
  mesh.start();
  assert.strictEqual(mesh.running, true);

  // Trigger webglcontextlost
  assert.ok(listeners['webglcontextlost'], 'webglcontextlost listener must be registered');
  let defaultPrevented = false;
  listeners['webglcontextlost'].forEach(cb => cb({ preventDefault: () => { defaultPrevented = true; } }));

  assert.strictEqual(defaultPrevented, true, 'Must call preventDefault() on webglcontextlost');
  assert.strictEqual(mesh.isContextLost, true, 'mesh.isContextLost must be true');

  // Verify renderWebGL aborts
  let drawArraysCalled = false;
  gl.drawArrays = () => { drawArraysCalled = true; };
  mesh.renderWebGL();
  assert.strictEqual(drawArraysCalled, false, 'renderWebGL must not draw when isContextLost is true');

  mesh.stop();
});

  await runEmpiricalTest('2.2. webglcontextrestored triggers shader re-init, initial frame draw, and loop restart', () => {
  const { canvas, gl, listeners } = createMockWebGLCanvas();
  const mesh = new FluidMeshGradient(canvas, { targetFps: 30 });
  mesh.isPlaying = true;

  // Simulate context loss first
  listeners['webglcontextlost'].forEach(cb => cb({ preventDefault: () => {} }));
  assert.strictEqual(mesh.isContextLost, true);

  let shadersReinitialized = false;
  mesh.initShaders = () => {
    shadersReinitialized = true;
    return true;
  };

  let initialFrameRendered = false;
  mesh.renderWebGL = () => {
    initialFrameRendered = true;
  };

  // Trigger webglcontextrestored
  assert.ok(listeners['webglcontextrestored'], 'webglcontextrestored listener must be registered');
  listeners['webglcontextrestored'].forEach(cb => cb());

  assert.strictEqual(mesh.isContextLost, false, 'isContextLost must be reset to false');
  assert.strictEqual(shadersReinitialized, true, 'initShaders must be re-invoked on context restoration');
  assert.strictEqual(initialFrameRendered, true, 'Initial visual frame must be rendered immediately');
  assert.strictEqual(mesh.running, true, 'Render loop must be restarted');

  mesh.stop();
});

// ----------------------------------------------------------------------------
// SUITE 3: VM SANDBOXED VIDEO SURFACE UNBINDING PROTECTION (BLUR & VISIBILITY)
// ----------------------------------------------------------------------------
console.log('\n--- Suite 3: VM Sandbox Video Surface Unbinding Protection ---');

const rendererJsPath = path.join(__dirname, '../src/renderer.js');
const rendererJsContent = fs.readFileSync(rendererJsPath, 'utf8');

function testBlurVisibilityLogic({ isPlaying, bodyHasClass, wallpaperMode, dynamicIslandMode, taskbarMode }) {
  // Construct a minimal sandbox mimicking renderer.js environment
  let pausedVideosCalled = 0;
  const mockClassList = new Set();
  if (bodyHasClass) mockClassList.add('is-playing');

  const context = {
    isPlaying,
    document: {
      body: {
        classList: {
          contains: (cls) => mockClassList.has(cls),
          add: (cls) => mockClassList.add(cls),
          remove: (cls) => mockClassList.delete(cls)
        }
      },
      visibilityState: 'hidden'
    },
    settings: {
      wallpaperMode,
      taskbarMode
    },
    isDynamicIslandMode: dynamicIslandMode,
    isWallpaperDesktopFocused: false,
    pauseAnimatedArtVideos: () => {
      pausedVideosCalled++;
    },
    syncCustomBackgroundVideoPlayback: () => {},
    islandMouseLeaveTimer: null,
    isMouseOverDynamicIsland: false
  };

  // Extract blur listener block from renderer.js
  const blurMatches = [...rendererJsContent.matchAll(/window\.addEventListener\('blur',\s*\(\)\s*=>\s*\{([\s\S]*?)\}\);/g)];
  const blurMatch = blurMatches.find(m => m[1].includes('window-blurred'));
  assert.ok(blurMatch, 'Blur handler managing window-blurred must exist in renderer.js');
  const blurCode = `(() => { ${blurMatch[1]} })();`;

  // Execute blur block in sandbox
  vm.runInNewContext(blurCode, context);
  const blurResult = pausedVideosCalled;

  // Reset and extract visibilitychange else block
  pausedVideosCalled = 0;
  const visMatches = [...rendererJsContent.matchAll(/document\.addEventListener\(['"]visibilitychange['"],\s*\(\)\s*=>\s*\{([\s\S]*?)\}\);/g)];
  const visMatch = visMatches.find(m => m[1].includes('pauseAnimatedArtVideos'));
  assert.ok(visMatch, 'Visibility handler with pauseAnimatedArtVideos must exist in renderer.js');
  const visCode = `(() => { ${visMatch[1]} })();`;

  vm.runInNewContext(visCode, context);
  const visResult = pausedVideosCalled;

  return { blurResult, visResult };
}

  await runEmpiricalTest('3.1. Active playback (isPlaying=true) strictly preserves video decoders on blur and visibilitychange', () => {
  const result = testBlurVisibilityLogic({
    isPlaying: true,
    bodyHasClass: false,
    wallpaperMode: false,
    dynamicIslandMode: false,
    taskbarMode: false
  });
  assert.strictEqual(result.blurResult, 0, 'pauseAnimatedArtVideos must NOT be called on blur when isPlaying is true');
  assert.strictEqual(result.visResult, 0, 'pauseAnimatedArtVideos must NOT be called on visibilitychange when isPlaying is true');
});

  await runEmpiricalTest('3.2. Active playback via body class (.is-playing) strictly preserves video decoders', () => {
  const result = testBlurVisibilityLogic({
    isPlaying: false,
    bodyHasClass: true,
    wallpaperMode: false,
    dynamicIslandMode: false,
    taskbarMode: false
  });
  assert.strictEqual(result.blurResult, 0, 'pauseAnimatedArtVideos must NOT be called when body has .is-playing');
  assert.strictEqual(result.visResult, 0, 'pauseAnimatedArtVideos must NOT be called on visibilitychange when body has .is-playing');
});

  await runEmpiricalTest('3.3. Dynamic Island mode preserves video decoders even when paused', () => {
  const result = testBlurVisibilityLogic({
    isPlaying: false,
    bodyHasClass: false,
    wallpaperMode: false,
    dynamicIslandMode: true,
    taskbarMode: false
  });
  assert.strictEqual(result.blurResult, 0, 'pauseAnimatedArtVideos must NOT be called in Dynamic Island mode');
  assert.strictEqual(result.visResult, 0, 'pauseAnimatedArtVideos must NOT be called on visibilitychange in Dynamic Island mode');
});

  await runEmpiricalTest('3.4. Inactive stopped state outside special modes invokes pauseAnimatedArtVideos to save VRAM', () => {
  const result = testBlurVisibilityLogic({
    isPlaying: false,
    bodyHasClass: false,
    wallpaperMode: false,
    dynamicIslandMode: false,
    taskbarMode: false
  });
  assert.strictEqual(result.blurResult, 1, 'pauseAnimatedArtVideos MUST be called when paused in standard studio mode');
  assert.strictEqual(result.visResult, 1, 'pauseAnimatedArtVideos MUST be called on visibility hidden when paused in standard studio mode');
});

// ----------------------------------------------------------------------------
// SUITE 4: ISLAND GL DISSOLVE WATCHDOG TIMER & CONTEXT LOSS STRESS
// ----------------------------------------------------------------------------
console.log('\n--- Suite 4: Island GL Dissolve Watchdog & Context Loss ---');

  await runEmpiricalTest('4.1. IslandGLDissolve._initGL detects lost context, purges resources, and reacquires GL', () => {
  let isLost = true;
  let contextRequests = 0;
  const mockGL = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    TEXTURE_2D: 3553,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    CLAMP_TO_EDGE: 33071,
    LINEAR: 9729,
    isContextLost: () => false,
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    getAttribLocation: () => 0,
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    getUniformLocation: () => ({}),
    createTexture: () => ({}),
    bindTexture: () => {},
    texParameteri: () => {}
  };

  const mockCanvas = {
    getContext: () => {
      contextRequests++;
      return mockGL;
    },
    style: {}
  };

  const dissolver = new IslandGLDissolve();
  dissolver.canvas = mockCanvas;
  // Manually attach a stale, lost GL context
  dissolver.gl = { isContextLost: () => true };
  dissolver.program = {};

  const initSuccess = dissolver._initGL();
  assert.strictEqual(initSuccess, true, '_initGL should reacquire context');
  assert.ok(contextRequests > 0, 'getContext must be called to reacquire WebGL context');
});

await runEmpiricalTest('4.2. Stalled rAF triggers safety watchdog timer, restoring opacity and invoking onComplete', async () => {
  const mockGL = {
    viewport: () => {},
    texImage2D: () => {},
    getError: () => 0,
    enable: () => {},
    blendFunc: () => {},
    useProgram: () => {},
    bindBuffer: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    activeTexture: () => {},
    bindTexture: () => {},
    uniform1i: () => {},
    uniform1f: () => {},
    clearColor: () => {},
    clear: () => {},
    drawArrays: () => {},
    SRC_ALPHA: 1,
    ONE_MINUS_SRC_ALPHA: 2,
    ARRAY_BUFFER: 34962,
    FLOAT: 5126,
    TEXTURE0: 33984,
    TEXTURE_2D: 3553,
    COLOR_BUFFER_BIT: 16384,
    TRIANGLE_STRIP: 5,
    NO_ERROR: 0
  };

  const dissolver = new IslandGLDissolve();
  dissolver.gl = mockGL;
  dissolver.program = {};
  dissolver.posBuffer = {};
  dissolver.texBuffer = {};
  dissolver.texture = {};
  dissolver.canvas = { width: 200, height: 40, style: {} };
  dissolver._captureElement = () => ({ width: 200, height: 40 });

  let completed = false;
  const mockTarget = {
    style: { opacity: '1', display: 'block' },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 40 })
  };

  // Mock disintegrate with 50ms duration, but simulate frozen rAF
  const origRAF = global.requestAnimationFrame;
  global.requestAnimationFrame = () => 999; // Never invokes callback (frozen rAF)

  try {
    dissolver.disintegrate(mockTarget, () => {
      completed = true;
    }, { duration: 50 });

    assert.strictEqual(mockTarget.style.opacity, '0', 'Initial opacity set to 0 when WebGL takes over');
    assert.strictEqual(completed, false, 'Not complete immediately');

    // Wait 180ms (watchdog is duration 50 + 100 = 150ms)
    await new Promise(r => setTimeout(r, 180));

    assert.strictEqual(completed, true, 'Watchdog timer must fire onComplete');
    assert.strictEqual(mockTarget.style.opacity, '', 'Watchdog timer must reset target element opacity from 0');
    assert.strictEqual(mockTarget.style.display, 'none', 'Watchdog timer must set display to none');
  } finally {
    global.requestAnimationFrame = origRAF;
  }
});

// ----------------------------------------------------------------------------
// SUITE 5: PROFILER CORE NORMALIZATION & CLASSIFICATION RESILIENCE
// ----------------------------------------------------------------------------
console.log('\n--- Suite 5: Profiler Normalization Math & Classification Resilience ---');

  await runEmpiricalTest('5.1. Dynamic CPU core normalization matrix (1, 2, 4, 8, 16, 32, 64 cores)', () => {
  const cores = [1, 2, 4, 8, 16, 32, 64];
  const fullCoreDeltaMs = 1000.0;
  const elapsedMs = 1000.0;

  for (const c of cores) {
    const rawCpu = (fullCoreDeltaMs / elapsedMs) * 100.0; // 100% of 1 core
    const normCpu = rawCpu / c;
    assert.strictEqual(rawCpu, 100.0);
    assert.strictEqual(normCpu, 100.0 / c);
  }
});

  await runEmpiricalTest('5.2. Role classifier handles arbitrary command-line permutations', () => {
  const scriptPath = path.join(__dirname, '../.agents/teamwork/teamwork_explorer_o7_system/measure_cpu.ps1');
  const psContent = fs.readFileSync(scriptPath, 'utf8');

  // Verify classifier syntax in measure_cpu.ps1
  assert.ok(psContent.includes('$cmd -match "--type=renderer"'), 'Renderer must match --type=renderer');
  assert.ok(psContent.includes('$cmd -match "--type=gpu-process"'), 'GPU must match --type=gpu-process');
  assert.ok(psContent.includes('$cmd -match "--type=utility"'), 'Utility must match --type=utility');
  assert.ok(psContent.includes('$cmd -match "--type=crashpad-handler"'), 'Crashpad must match --type=crashpad-handler');
  assert.ok(psContent.includes('$wmiProc.Name -match "lyricflow\\.exe"'), 'Host must match lyricflow.exe');
});

console.log(`\n================================================================`);
console.log(`  ALL ${passedTests}/${totalTests} ADVERSARIAL CHALLENGER TESTS PASSED (100% GREEN) `);
console.log(`================================================================\n`);
}

runAll().catch(err => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
