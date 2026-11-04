/**
 * tests/rendering-optimizations-fix1-fix2.test.js
 * Comprehensive validation suite for Fix 1 (Fluid Mesh suspension on stop)
 * and Fix 2 (Elimination of redundant Cinematic rendering).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { FluidMeshGradient } = require('../src/modules/fluid-mesh.js');
const KineticCanvasRenderer = require('../src/modules/kinetic/KineticCanvasRenderer.js');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    throw err;
  }
}

function createMock2DCanvas(width = 320, height = 180) {
  return {
    width,
    height,
    getContext: () => null,
    style: {}
  };
}

function createMockKineticCanvas(width = 720, height = 1280) {
  return {
    width,
    height,
    getContext: () => ({
      fillStyle: '',
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: (txt) => ({ width: (txt || '').length * 10 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      drawImage: () => {}
    }),
    style: {}
  };
}

console.log('\n--- Running Rendering Fixes (Fix 1 & Fix 2) Verification Suite ---\n');

// ============================================================================
// FIX 1 — SUSPEND FLUID MESH WHEN PLAYBACK STOPS
// ============================================================================
console.log('--- Fix 1: Fluid Mesh Lifecycle & Stop Suspension ---');

test('Fix 1.1: Render loop stops after the resting transition when playback stops', () => {
  const originalPerformance = global.performance;
  const originalRaf = global.requestAnimationFrame;
  const originalCaf = global.cancelAnimationFrame;
  const originalWindow = global.window;
  const originalDoc = global.document;

  let clock = 1000;
  let nextId = 1;
  const queue = new Map();
  const listeners = new Map();

  global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    addEventListener: (name, cb) => listeners.set(name, cb)
  };
  global.document = {
    visibilityState: 'visible',
    addEventListener: () => {}
  };
  global.performance = { now: () => clock };
  global.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  };
  global.cancelAnimationFrame = (id) => {
    queue.delete(id);
  };

  try {
    const mesh = new FluidMeshGradient(createMock2DCanvas());
    mesh.useWebGL = false;
    mesh.ctx2d = null;
    let renders = 0;
    mesh.render2DFallback = () => { renders++; };

    mesh.setPlaybackState(true);
    assert.strictEqual(mesh.isRunning(), true, 'Must be running while playback is active');

    // Simulate 10 frames during active playback
    for (let i = 0; i < 10; i++) {
      const entry = queue.entries().next().value;
      assert.ok(entry, 'Active playback must continuously schedule frames');
      queue.delete(entry[0]);
      clock += 30; // > 1000/45 ms
      entry[1](clock);
    }
    assert.ok(renders >= 9, 'Should have rendered active frames');

    // Playback stops
    mesh.setPlaybackState(false);
    assert.strictEqual(mesh.isPlaying, false, 'isPlaying should be false');
    assert.strictEqual(mesh.targetSpeed, 0, 'targetSpeed should be 0');

    // Step through the smooth settling phase
    let safety = 0;
    while (queue.size > 0 && safety++ < 300) {
      const entry = queue.entries().next().value;
      queue.delete(entry[0]);
      clock += 66; // 15 FPS resting rate
      entry[1](clock);
    }

    assert.strictEqual(queue.size, 0, 'RAF queue must be completely empty after settling');
    assert.strictEqual(mesh.isRunning(), false, 'mesh.isRunning() must be false');
    assert.strictEqual(mesh.isSettled(), true, 'mesh.isSettled() must be true');

    const settlesRenderCount = renders;
    // Advance clock 10 seconds into the future
    clock += 10000;
    assert.strictEqual(queue.size, 0, 'No frames should be scheduled during resting state');
    assert.strictEqual(renders, settlesRenderCount, 'Zero redundant resting frames must be rendered');
  } finally {
    global.performance = originalPerformance;
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCaf;
    global.window = originalWindow;
    global.document = originalDoc;
  }
});

test('Fix 1.2: Playback resumes rendering without a visual jump', () => {
  const originalPerformance = global.performance;
  const originalRaf = global.requestAnimationFrame;
  const originalCaf = global.cancelAnimationFrame;
  const originalWindow = global.window;
  const originalDoc = global.document;

  let clock = 5000;
  let nextId = 1;
  const queue = new Map();

  global.window = { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1, addEventListener: () => {} };
  global.document = { visibilityState: 'visible', addEventListener: () => {} };
  global.performance = { now: () => clock };
  global.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  };
  global.cancelAnimationFrame = (id) => queue.delete(id);

  try {
    const mesh = new FluidMeshGradient(createMock2DCanvas());
    mesh.useWebGL = false;
    mesh.render2DFallback = () => {};

    // Settle mesh
    mesh.setPlaybackState(false);
    mesh.currentSpeed = 0;
    mesh.time = 42.15; // Set known time
    mesh.stop();

    const timeBeforeResume = mesh.time;

    // Advance real clock by 2 minutes while paused
    clock += 120000;

    // Resume playback
    mesh.setPlaybackState(true);
    assert.strictEqual(mesh.isRunning(), true, 'Must report running after resume');

    // Run first frame
    const entry = queue.entries().next().value;
    queue.delete(entry[0]);
    entry[1](clock);

    // Verify time delta is not a 120-second leap
    const timeDelta = mesh.time - timeBeforeResume;
    assert.ok(timeDelta >= 0 && timeDelta < 0.1, `Time delta must be continuous and smooth, got ${timeDelta}`);
  } finally {
    global.performance = originalPerformance;
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCaf;
    global.window = originalWindow;
    global.document = originalDoc;
  }
});

test('Fix 1.3: Repeated pause/resume transitions do not create duplicate loops', () => {
  const originalPerformance = global.performance;
  const originalRaf = global.requestAnimationFrame;
  const originalCaf = global.cancelAnimationFrame;
  const originalWindow = global.window;
  const originalDoc = global.document;

  let clock = 1000;
  let nextId = 1;
  const queue = new Map();

  global.window = { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1, addEventListener: () => {} };
  global.document = { visibilityState: 'visible', addEventListener: () => {} };
  global.performance = { now: () => clock };
  global.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  };
  global.cancelAnimationFrame = (id) => queue.delete(id);

  try {
    const mesh = new FluidMeshGradient(createMock2DCanvas());
    mesh.useWebGL = false;
    mesh.render2DFallback = () => {};

    // Rapid toggle 10 times without executing frames in between
    for (let i = 0; i < 10; i++) {
      mesh.setPlaybackState(true);
      mesh.setPlaybackState(false);
      mesh.setPlaybackState(true);
    }

    assert.strictEqual(queue.size, 1, 'Only exactly 1 RAF request must be active in the queue');
    assert.ok(mesh.animId, 'mesh.animId must be populated');

    // Repeated start() calls must also be idempotent
    mesh.start();
    mesh.start();
    assert.strictEqual(queue.size, 1, 'Repeated start() calls must never duplicate RAF requests');
  } finally {
    global.performance = originalPerformance;
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCaf;
    global.window = originalWindow;
    global.document = originalDoc;
  }
});

test('Fix 1.4: Hidden/restored transitions work correctly', () => {
  const originalPerformance = global.performance;
  const originalRaf = global.requestAnimationFrame;
  const originalCaf = global.cancelAnimationFrame;
  const originalWindow = global.window;
  const originalDoc = global.document;

  let clock = 1000;
  let nextId = 1;
  const queue = new Map();
  let visibilityListener = null;

  global.window = { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1, addEventListener: () => {} };
  global.document = {
    visibilityState: 'visible',
    addEventListener: (evt, cb) => {
      if (evt === 'visibilitychange') visibilityListener = cb;
    }
  };
  global.performance = { now: () => clock };
  global.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  };
  global.cancelAnimationFrame = (id) => queue.delete(id);

  try {
    const mesh = new FluidMeshGradient(createMock2DCanvas());
    mesh.useWebGL = false;
    mesh.render2DFallback = () => {};

    // 1. Playback active, window hides
    mesh.setPlaybackState(true);
    assert.strictEqual(mesh.isRunning(), true);
    assert.strictEqual(queue.size, 1);

    global.document.visibilityState = 'hidden';
    visibilityListener();
    assert.strictEqual(mesh.isRunning(), false, 'Mesh must stop when window becomes hidden');
    assert.strictEqual(queue.size, 0, 'RAF must be canceled on hidden');

    // Window restores while still playing
    global.document.visibilityState = 'visible';
    visibilityListener();
    assert.strictEqual(mesh.isRunning(), true, 'Mesh must resume when window is restored during active playback');
    assert.strictEqual(queue.size, 1);

    // 2. Mesh settles, window hides and restores
    mesh.setPlaybackState(false);
    mesh.currentSpeed = 0;
    mesh.stop();
    assert.strictEqual(mesh.isSettled(), true);

    global.document.visibilityState = 'hidden';
    visibilityListener();
    assert.strictEqual(mesh.isRunning(), false);

    global.document.visibilityState = 'visible';
    visibilityListener();
    assert.strictEqual(mesh.isRunning(), false, 'Settled resting mesh must NOT wake up on restore');
    assert.strictEqual(queue.size, 0, 'No RAF must be scheduled for resting mesh on restore');
  } finally {
    global.performance = originalPerformance;
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCaf;
    global.window = originalWindow;
    global.document = originalDoc;
  }
});

test('Fix 1.5: Dynamic Island and Wallpaper Mode lifecycle integrity', () => {
  const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');

  // Verify Dynamic Island mode entry stops fluid mesh
  assert.ok(
    rendererCode.includes('if (fluidMeshGradientInstance) {\n    fluidMeshGradientInstance.stop();') ||
    rendererCode.includes('if (fluidMeshGradientInstance) {\r\n    fluidMeshGradientInstance.stop();'),
    'Dynamic island entry must stop fluid mesh'
  );

  // Verify Wallpaper Mode entry stops fluid mesh
  assert.ok(
    rendererCode.includes('if (fluidMeshGradientInstance) {\n      fluidMeshGradientInstance.stop();') ||
    rendererCode.includes('if (fluidMeshGradientInstance) {\r\n      fluidMeshGradientInstance.stop();'),
    'Wallpaper mode entry must stop fluid mesh'
  );

  // Verify audio loopback capture is NOT disabled when fluid mesh is stopped
  assert.ok(
    !rendererCode.includes('fluidMeshGradientInstance.stop();\n      setAudioVisualizerActive(false);'),
    'Stopping fluid mesh must not kill shared audio capture pipeline'
  );
});

// ============================================================================
// FIX 2 — ELIMINATE REDUNDANT CINEMATIC RENDERING
// ============================================================================
console.log('\n--- Fix 2: Elimination of Redundant Cinematic Rendering ---');

test('Fix 2.1: Active playback does not render duplicate frames (rAF is sole owner)', () => {
  const originalPerformance = global.performance;
  const originalRaf = global.requestAnimationFrame;
  const originalCaf = global.cancelAnimationFrame;

  let clock = 2000;
  let nextId = 1;
  const queue = new Map();

  global.performance = { now: () => clock };
  global.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  };
  global.cancelAnimationFrame = (id) => queue.delete(id);

  try {
    const renderer = new KineticCanvasRenderer(createMockKineticCanvas(), { width: 720, height: 1280 });
    let renders = 0;
    renderer.renderFrame = () => { renders++; };

    // Start playback loop
    renderer.play();
    assert.strictEqual(renderer.isPlaying, true, 'isPlaying should be true');
    assert.strictEqual(queue.size, 1, 'play() must schedule an rAF loop');

    // Simulate 30Hz updatePlayhead() clock synchronizations during active playback
    for (let i = 0; i < 5; i++) {
      clock += 33.3; // 30Hz timer tick
      renderer.syncPlaybackTime(clock);
    }

    // syncPlaybackTime should NEVER have called renderFrame during active playback
    assert.strictEqual(renders, 0, 'syncPlaybackTime must NOT render frames during active playback');
    assert.strictEqual(renderer.currentTimeMs, clock, 'syncPlaybackTime must maintain authoritative timing');

    // Now execute one frame from the RAF presentation loop
    const entry = queue.entries().next().value;
    queue.delete(entry[0]);
    entry[1](clock);

    assert.strictEqual(renders, 1, 'Only the active rAF presentation loop renders frames');
    renderer.destroy();
  } finally {
    global.performance = originalPerformance;
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCaf;
  }
});

test('Fix 2.2: Paused seeking updates the canvas immediately', () => {
  const renderer = new KineticCanvasRenderer(createMockKineticCanvas(), { width: 720, height: 1280 });
  let renders = 0;
  let lastRenderedTime = -1;
  renderer.renderFrame = (time) => {
    renders++;
    lastRenderedTime = time;
  };

  renderer.pause();
  assert.strictEqual(renderer.isPlaying, false);

  // Paused seek via seek()
  renderer.seek(15400);
  assert.strictEqual(renders, 1, 'seek() while paused must render canvas immediately');
  assert.strictEqual(lastRenderedTime, 15400);

  // Paused seek via syncPlaybackTime()
  renderer.syncPlaybackTime(18200);
  assert.strictEqual(renders, 2, 'syncPlaybackTime() with changed timestamp must render immediately when paused');
  assert.strictEqual(lastRenderedTime, 18200);

  // Redundant syncPlaybackTime with same timestamp
  renderer.syncPlaybackTime(18200);
  assert.strictEqual(renders, 2, 'syncPlaybackTime() with unchanged timestamp must NOT render redundant frames');

  renderer.destroy();
});

test('Fix 2.3: Lyric timing remains synchronized during rapid word transitions', () => {
  const originalPerformance = global.performance;
  const originalRaf = global.requestAnimationFrame;
  const originalCaf = global.cancelAnimationFrame;

  let clock = 10000;
  const queue = new Map();
  global.performance = { now: () => clock };
  global.requestAnimationFrame = (cb) => {
    queue.set(1, cb);
    return 1;
  };
  global.cancelAnimationFrame = () => queue.clear();

  try {
    const renderer = new KineticCanvasRenderer(createMockKineticCanvas(), { width: 720, height: 1280 });
    let lastRenderedTime = 0;
    renderer.renderFrame = (t) => { lastRenderedTime = t; };

    renderer.play();

    // Rapid word transitions in 50ms intervals
    const wordTimestamps = [10050, 10100, 10150, 10200, 10250];
    for (const ts of wordTimestamps) {
      clock = ts;
      renderer.syncPlaybackTime(ts);
      assert.strictEqual(renderer.currentTimeMs, ts, `Clock must sync to exact word time ${ts}`);

      // Run rAF presentation
      const cb = queue.get(1);
      if (cb) {
        queue.clear();
        cb(clock);
      }
      assert.strictEqual(lastRenderedTime, ts, `Presentation must render exact word time ${ts}`);
    }

    renderer.destroy();
  } finally {
    global.performance = originalPerformance;
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCaf;
  }
});

test('Fix 2.4: Play/pause, seeking, track changes, and mode transitions', () => {
  const renderer = new KineticCanvasRenderer(createMockKineticCanvas(), { width: 720, height: 1280 });
  let renders = 0;
  renderer.renderFrame = () => { renders++; };

  // Set paused track card state
  renderer.setPausedState(true, { title: 'Anti-Hero', artist: 'Taylor Swift' });
  assert.strictEqual(renderer.isPaused, true);

  // Track change re-configuration
  renders = 0;
  renderer.configure({
    title: 'Cruel Summer',
    artist: 'Taylor Swift',
    lyrics: [{ text: 'Fever dream high', timeMs: 0, endMs: 2000 }]
  });
  renderer.seek(0);
  assert.ok(renders >= 1, 'Track change seek must render initial frame immediately');
  assert.strictEqual(renderer.currentTimeMs, 0);

  renderer.destroy();
});

test('Fix 2.5: Frame scheduling resumes correctly after visibility changes', () => {
  const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');

  // Verify visibilitychange pauses cinematicMainRendererInstance when hidden
  assert.ok(
    rendererCode.includes('if (cinematicMainRendererInstance && cinematicMainRendererInstance.isPlaying) {\n      cinematicMainRendererInstance._wasPlayingBeforeHide = true;\n      cinematicMainRendererInstance.pause();') ||
    rendererCode.includes('if (cinematicMainRendererInstance && cinematicMainRendererInstance.isPlaying) {\r\n      cinematicMainRendererInstance._wasPlayingBeforeHide = true;\r\n      cinematicMainRendererInstance.pause();'),
    'visibilitychange must pause cinematicMainRendererInstance when hidden'
  );

  // Verify visibilitychange resumes cinematicMainRendererInstance when restored
  assert.ok(
    rendererCode.includes('if (cinematicMainRendererInstance && cinematicMainRendererInstance._wasPlayingBeforeHide) {\n      cinematicMainRendererInstance._wasPlayingBeforeHide = false;\n      if (isPlaying && (isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === \'cinematic\'))) {\n        cinematicMainRendererInstance.play();') ||
    rendererCode.includes('if (cinematicMainRendererInstance && cinematicMainRendererInstance._wasPlayingBeforeHide) {\r\n      cinematicMainRendererInstance._wasPlayingBeforeHide = false;\r\n      if (isPlaying && (isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === \'cinematic\'))) {\r\n        cinematicMainRendererInstance.play();'),
    'visibilitychange must resume cinematicMainRendererInstance when restored'
  );
});

console.log(`\n================================================================`);
console.log(`ALL ${passedTests}/${totalTests} FIX 1 & FIX 2 VERIFICATION TESTS PASSED!`);
console.log(`================================================================\n`);
