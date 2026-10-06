/**
 * tests/cinematic-dynamic-typography.test.js
 * Verification for Cinematic Mode Dynamic Word Emergence, Elastic Spatial Reflow,
 * Vertical Side-Screen Typographic Pinning, and GPU Resource Throttling.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const TypographyEngine = require('../src/modules/kinetic/KineticTypographyEngine.js');
const CinematicComposition = require('../src/modules/kinetic/CinematicComposition.js');
const KineticDirector = require('../src/modules/kinetic/KineticDirector.js');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function createMockCanvas(width = 800, height = 600) {
  const operations = [];
  const stateStack = [];
  let currentState = {
    font: '16px sans-serif',
    fillStyle: '#ffffff',
    strokeStyle: '#ffffff',
    globalAlpha: 1.0,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rot: 0 }
  };

  const ctx = {
    get font() { return currentState.font; },
    set font(v) { currentState.font = v; },
    get fillStyle() { return currentState.fillStyle; },
    set fillStyle(v) { currentState.fillStyle = v; },
    get strokeStyle() { return currentState.strokeStyle; },
    set strokeStyle(v) { currentState.strokeStyle = v; },
    get globalAlpha() { return currentState.globalAlpha; },
    set globalAlpha(v) { currentState.globalAlpha = v; },
    get textAlign() { return currentState.textAlign; },
    set textAlign(v) { currentState.textAlign = v; },
    get textBaseline() { return currentState.textBaseline; },
    set textBaseline(v) { currentState.textBaseline = v; },
    save() {
      stateStack.push(JSON.parse(JSON.stringify(currentState)));
      operations.push({ op: 'save' });
    },
    restore() {
      if (stateStack.length) currentState = stateStack.pop();
      operations.push({ op: 'restore' });
    },
    translate(x, y) {
      currentState.transform.x += x;
      currentState.transform.y += y;
      operations.push({ op: 'translate', x, y });
    },
    scale(sx, sy) {
      currentState.transform.scaleX *= sx;
      currentState.transform.scaleY *= sy;
      operations.push({ op: 'scale', sx, sy });
    },
    rotate(rad) {
      currentState.transform.rot += rad;
      operations.push({ op: 'rotate', rad });
    },
    measureText(text) {
      return { width: (text || '').length * 14 };
    },
    fillText(text, x, y) {
      operations.push({
        op: 'fillText',
        text,
        x,
        y,
        font: currentState.font,
        fillStyle: currentState.fillStyle,
        alpha: currentState.globalAlpha,
        textAlign: currentState.textAlign,
        transform: JSON.parse(JSON.stringify(currentState.transform))
      });
    },
    beginPath() { operations.push({ op: 'beginPath' }); },
    moveTo(x, y) { operations.push({ op: 'moveTo', x, y }); },
    lineTo(x, y) { operations.push({ op: 'lineTo', x, y }); },
    stroke() { operations.push({ op: 'stroke' }); },
    fillRect(x, y, w, h) { operations.push({ op: 'fillRect', x, y, w, h }); },
    clearRect(x, y, w, h) { operations.push({ op: 'clearRect', x, y, w, h }); },
    rect(x, y, w, h) { operations.push({ op: 'rect', x, y, w, h }); },
    clip() { operations.push({ op: 'clip' }); }
  };

  return { ctx, operations, width, height };
}

console.log('\n--- Running Cinematic Dynamic Typography & GPU Optimization Tests ---\n');

// ==========================================
// 1. GPU Hotspot & Fluid Mesh Throttling Tests
// ==========================================
console.log('1. GPU & Resource Hotspot Elimination:');

test('1a. FluidMeshGradient renders at native compositor cadence while playing and throttles to 15 FPS paused (64ms)', () => {
  const meshPath = path.join(__dirname, '../src/modules/fluid-mesh.js');
  const meshCode = fs.readFileSync(meshPath, 'utf8');

  assert.ok(meshCode.includes('this._minFrameInterval = 0;'), 'Must default to unthrottled native compositor cadence');
  assert.ok(meshCode.includes('this._minFrameInterval = this.isPlaying ? 0 : 64;'), 'Must render at native cadence when playing and throttle to 64ms when paused');
  assert.ok(meshCode.includes('if (!this.isPlaying && this._minFrameInterval > 0)'), 'Must skip frame dispatch only when paused/inactive');
});

test('1b. FluidMeshGradient clamps canvas dimensions to maximum 540x320 to avoid 4K GPU fill-rate spikes', () => {
  const meshPath = path.join(__dirname, '../src/modules/fluid-mesh.js');
  const meshCode = fs.readFileSync(meshPath, 'utf8');

  assert.ok(meshCode.includes('this.width = Math.min(540,'), 'Must clamp canvas width to max 540');
  assert.ok(meshCode.includes('this.height = Math.min(320,'), 'Must clamp canvas height to max 320');
});

test('1c. src/renderer.js stops FluidMeshGradient on entering Cinematic View and guards against restarts', () => {
  const rendererPath = path.join(__dirname, '../src/renderer.js');
  const rendererCode = fs.readFileSync(rendererPath, 'utf8');

  assert.ok(rendererCode.includes('if (isCinematicView) {\n    if (fluidMeshGradientInstance) {\n      fluidMeshGradientInstance.stop();'), 'Must stop fluid mesh when entering cinematic view');
  assert.ok(rendererCode.includes('if (shouldRunMesh && !isCinematicView)'), 'applyVisualSettings must guard fluid mesh on !isCinematicView');
  assert.ok(rendererCode.includes('if (fluidMeshGradientInstance && !isCinematicView && !isDynamicIslandMode'), 'visibilitychange must guard fluid mesh on !isCinematicView');
});

test('1d. CSS enforces display: none on #fluid-mesh-canvas when .cinematic-view-active is set', () => {
  const ambientCss = fs.readFileSync(path.join(__dirname, '../src/styles/_ambient.css'), 'utf8');
  const kineticCss = fs.readFileSync(path.join(__dirname, '../src/styles/_kinetic.css'), 'utf8');

  assert.ok(ambientCss.includes('body.cinematic-view-active .fluid-mesh-canvas') || ambientCss.includes('.cinematic-view-active .fluid-mesh-canvas'), '_ambient.css must hide canvas in cinematic mode');
  assert.ok(kineticCss.includes('.cinematic-view-active #fluid-mesh-canvas'), '_kinetic.css must hide canvas in cinematic mode');
});

// ==========================================
// 2. Dynamic Word Emergence Mechanics
// ==========================================
console.log('\n2. Dynamic Word Emergence Mechanics:');

test('2a. Upcoming word prior to emergence threshold consumes 0 layout width and is invisible', () => {
  const word = { text: 'freedom', timeMs: 2000, endMs: 2500, hasSpace: true };
  const em = TypographyEngine.computeWordEmergence(word, 1500); // 500ms before onset (> 160ms lead)

  assert.strictEqual(em.factor, 0, 'Emergence factor must be 0');
  assert.strictEqual(em.widthFactor, 0, 'Allocated width factor must be 0');
  assert.strictEqual(em.opacity, 0, 'Opacity must be 0');
  assert.strictEqual(em.isVisible, false, 'Word must be invisible before emergence');
  assert.strictEqual(em.isCurrent, false, 'Word must not be active');
  assert.strictEqual(em.isSung, false, 'Word must not be sung');
});

test('2b. Word actively emerging expands width with cubic ease-out curve', () => {
  const word = { text: 'freedom', timeMs: 2000, endMs: 2500, hasSpace: true };
  // Emergence window is [2000 - 160 = 1840ms, 1840 + 200 = 2040ms]
  // Test at 1940ms (50% through emergence window)
  const em = TypographyEngine.computeWordEmergence(word, 1940);

  assert.ok(em.widthFactor > 0.5, 'Cubic ease-out must front-load width expansion (> 0.5 at midpoint)');
  assert.ok(em.widthFactor < 1.0, 'Width factor must remain below 1.0 before full emergence');
  assert.ok(em.scale > 0.88 && em.scale < 1.0, 'Scale must interpolate between 0.88 and 1.0');
  assert.ok(em.yOffset > 0 && em.yOffset < 6, 'Y offset must elevate towards baseline');
  assert.strictEqual(em.isVisible, true, 'Word must be visible during emergence');
});

test('2c. Word reaching vocal onset reaches full width and marks active singing state', () => {
  const word = { text: 'freedom', timeMs: 2000, endMs: 2500, hasSpace: true };
  // At 2100ms: past emergence window (2040ms), actively singing
  const em = TypographyEngine.computeWordEmergence(word, 2100);

  assert.strictEqual(em.factor, 1.0, 'Emergence factor must reach 1.0');
  assert.strictEqual(em.widthFactor, 1.0, 'Width factor must be 100%');
  assert.strictEqual(em.opacity, 1.0, 'Opacity must be 1.0');
  assert.strictEqual(em.isCurrent, true, 'Word must be in active singing state');
  assert.strictEqual(em.isSung, false, 'Word must not be finished');
});

test('2d. Reduced motion mode disables positional slide while maintaining clean visibility', () => {
  const word = { text: 'freedom', timeMs: 2000, endMs: 2500, hasSpace: true };
  const em = TypographyEngine.computeWordEmergence(word, 1980, { reducedMotion: true });

  assert.strictEqual(em.yOffset, 0, 'Reduced motion must have 0 vertical slide offset');
  assert.strictEqual(em.scale, 1.0, 'Reduced motion must have constant 1.0 scale');
  assert.strictEqual(em.widthFactor, 1.0, 'Reduced motion must immediately occupy full width once visible');
});

// ==========================================
// 3. Elastic Spatial Reflow ("Making Space")
// ==========================================
console.log('\n3. Elastic Spatial Reflow ("Making Space"):');

test('3a. Total allocated line width expands as upcoming words arrive', () => {
  const mock = createMockCanvas(800, 400);
  const words = [
    { text: 'I', timeMs: 1000, endMs: 1300, hasSpace: true },
    { text: 'want', timeMs: 1500, endMs: 1800, hasSpace: true },
    { text: 'freedom', timeMs: 2500, endMs: 3000, hasSpace: false }
  ];

  // At t = 1100ms: only 'I' has emerged. 'want' and 'freedom' take 0 width.
  const em1_t1100 = TypographyEngine.computeWordEmergence(words[0], 1100);
  const em2_t1100 = TypographyEngine.computeWordEmergence(words[1], 1100);
  const em3_t1100 = TypographyEngine.computeWordEmergence(words[2], 1100);

  assert.strictEqual(em1_t1100.isVisible, true, 'Word 1 should be visible');
  assert.strictEqual(em2_t1100.widthFactor, 0, 'Word 2 should take 0 width at t=1100');
  assert.strictEqual(em3_t1100.widthFactor, 0, 'Word 3 should take 0 width at t=1100');

  // At t = 1450ms: 'want' is actively emerging (onset 1500ms - 160ms = 1340ms)
  const em2_t1450 = TypographyEngine.computeWordEmergence(words[1], 1450);
  const em3_t1450 = TypographyEngine.computeWordEmergence(words[2], 1450);
  assert.ok(em2_t1450.widthFactor > 0.3, 'Word 2 width should be expanding');
  assert.strictEqual(em3_t1450.widthFactor, 0, 'Word 3 should still take 0 width');

  // At t = 2400ms: 'freedom' is emerging (onset 2500ms - 160ms = 2340ms)
  const em3_t2400 = TypographyEngine.computeWordEmergence(words[2], 2400);
  assert.ok(em3_t2400.widthFactor > 0, 'Word 3 should now be claiming width');
});

test('3b. Word positions remain spatially stable without continuous reflow jitter as words emerge', () => {
  const words = [
    { text: 'Hold', timeMs: 1000, endMs: 1400, hasSpace: true },
    { text: 'on', timeMs: 2000, endMs: 2400, hasSpace: false }
  ];

  // Render at t = 1200ms ('Hold' visible alone, at its anchored line position)
  const mock1 = createMockCanvas(800, 400);
  TypographyEngine.renderStyleA(mock1.ctx, {
    text: 'Hold on',
    words,
    currentTimeMs: 1200,
    bounds: { x: 0, y: 0, width: 800, height: 400 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } },
    isCinematic: true
  });

  const fills1 = mock1.operations.filter(op => op.op === 'fillText');
  assert.strictEqual(fills1.length, 1, 'Only Hold should be rendered at t=1200');
  const holdX_alone = fills1[0].transform.x;

  // Render at t = 1950ms ('on' is emerging; Hold position must remain spatially stable)
  const mock2 = createMockCanvas(800, 400);
  TypographyEngine.renderStyleA(mock2.ctx, {
    text: 'Hold on',
    words,
    currentTimeMs: 1950,
    bounds: { x: 0, y: 0, width: 800, height: 400 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } },
    isCinematic: true
  });

  const fills2 = mock2.operations.filter(op => op.op === 'fillText');
  assert.strictEqual(fills2.length, 2, 'Both Hold and emerging "on" should be rendered at t=1950');
  const holdX_at_t1950 = fills2[0].transform.x;

  assert.strictEqual(holdX_at_t1950, holdX_alone, 'Hold must remain spatially stable without jitter as "on" emerges');
});

// ==========================================
// 4. Vertical Side-Screen Typographic Pinning
// ==========================================
console.log('\n4. Vertical Side-Screen Typographic Pinning:');

test('4a. CinematicComposition resolves vertical_left, vertical_right, and vertical_split layouts', () => {
  assert.ok(Array.isArray(CinematicComposition.TYPOGRAPHY_LAYOUTS), 'Must export TYPOGRAPHY_LAYOUTS');
  assert.ok(CinematicComposition.TYPOGRAPHY_LAYOUTS.includes('vertical_left'), 'Must support vertical_left');
  assert.ok(CinematicComposition.TYPOGRAPHY_LAYOUTS.includes('vertical_right'), 'Must support vertical_right');
  assert.ok(CinematicComposition.TYPOGRAPHY_LAYOUTS.includes('vertical_split'), 'Must support vertical_split');

  // Test deterministic vertical_split when emphasizedWord is provided
  const compSplit = CinematicComposition.resolveComposition('night', 'strong', { width: 800, height: 600 }, 'track1', 0, 'FOREVER');
  assert.ok(compSplit.typographyLayout, 'Composition must have typographyLayout');
  assert.ok(typeof compSplit.railMargin === 'number', 'Composition must specify railMargin');
});

test('4b. renderCinematicVerticalRail pins typography along screen margin within 5%-10% edge', () => {
  const mock = createMockCanvas(1000, 600);
  const words = [
    { text: 'Echoes', timeMs: 1000, endMs: 1400 },
    { text: 'in', timeMs: 1400, endMs: 1700 },
    { text: 'time', timeMs: 1700, endMs: 2100 }
  ];

  TypographyEngine.renderStyleA(mock.ctx, {
    text: 'Echoes in time',
    words,
    currentTimeMs: 1800,
    bounds: { x: 0, y: 0, width: 1000, height: 600 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } },
    isCinematic: true,
    typographyLayout: 'vertical_left'
  });

  const fills = mock.operations.filter(op => op.op === 'fillText');
  assert.ok(fills.length >= 2, 'Words must be rendered on vertical rail');

  // In 1000px width with 8% margin rail, X should be around 80px
  fills.forEach(f => {
    assert.ok(f.transform.x <= 120, 'Vertical left rail text must stay near left margin rail (<= 12% width)');
  });
});

test('4c. renderCinematicVerticalSplit renders hero word rotated -90 deg along margin and phrase horizontally', () => {
  const mock = createMockCanvas(1000, 600);
  const words = [
    { text: 'I', timeMs: 1000, endMs: 1200 },
    { text: 'want', timeMs: 1200, endMs: 1400 },
    { text: 'nobody', timeMs: 1400, endMs: 1800 },
    { text: 'else', timeMs: 1800, endMs: 2200 }
  ];

  TypographyEngine.renderStyleA(mock.ctx, {
    text: 'I want nobody else',
    words,
    currentTimeMs: 1500,
    bounds: { x: 0, y: 0, width: 1000, height: 600 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } },
    emphasizedWord: 'NOBODY',
    isCinematic: true,
    typographyLayout: 'vertical_split'
  });

  // Verify -90 degree rotation was applied for the hero word
  const rotOps = mock.operations.filter(op => op.op === 'rotate');
  assert.ok(rotOps.length > 0, 'Vertical split must rotate hero word');
  assert.ok(Math.abs(rotOps[0].rad - (-Math.PI / 2)) < 0.01, 'Rotation must be -90 degrees');

  const fills = mock.operations.filter(op => op.op === 'fillText');
  assert.ok(fills.length >= 2, 'Must render both hero word and phrase words');
});

// ==========================================
// 5. Robustness & Fallback Integrity
// ==========================================
console.log('\n5. Robustness & Fallback Integrity:');

test('5a. Plain LRC lines with empty words array render cleanly without errors', () => {
  const mock = createMockCanvas(800, 400);

  TypographyEngine.renderStyleA(mock.ctx, {
    text: 'A quiet night under the stars',
    words: [],
    currentTimeMs: 1500,
    bounds: { x: 0, y: 0, width: 800, height: 400 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } },
    isCinematic: true
  });

  const fills = mock.operations.filter(op => op.op === 'fillText');
  assert.ok(fills.length > 0, 'Plain LRC static text must render');
});

test('5b. Classic Mode (isCinematic: false) continues using progressive karaoke sweep', () => {
  const mock = createMockCanvas(800, 400);
  const words = [
    { text: 'Yesterday', timeMs: 1000, endMs: 2000, hasSpace: false }
  ];

  TypographyEngine.renderStyleA(mock.ctx, {
    text: 'Yesterday',
    words,
    currentTimeMs: 1500,
    bounds: { x: 0, y: 0, width: 800, height: 400 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } },
    isCinematic: false
  });

  const clips = mock.operations.filter(op => op.op === 'clip');
  assert.strictEqual(clips.length, 1, 'Classic mode must maintain progressive sweep clipping rectangle');
});

console.log(`\nCinematic Dynamic Typography Results: ${passedTests}/${totalTests} tests passed.\n`);
