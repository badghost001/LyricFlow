/**
 * Comprehensive Verification Suite for 3-Phase CPU Reduction Plan:
 *
 * Phase 1: Fixing the Graphics & Visualizer Canvas (src/renderer.js)
 *   1.1 High-Refresh-Rate Frame Rate Limiter (caps to 60 FPS / 16.67ms dt lock)
 *   1.2 Amplitude Deviation Threshold Gate (< 0.005 deadband short-circuit)
 *
 * Phase 2: Fixing the Window & Thread Framework (src-tauri/)
 *   2.1 Dynamic Win32 Window Structural Bounds Shrinking (commands/window.rs)
 *   2.2 WebView2 Compositor Flags & Grayscale Font Smoothing (main.rs & _dynamic_island.css)
 *
 * Phase 3: Fixing Frontend Logic Engines (src/playback-dj-engine.js & src/renderer.js)
 *   3.1 Cleanly Detach and Terminate Dormant Engine Tracks (detach() & audioSpectrumListeners registry)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcDir = path.join(__dirname, '../src');
const rendererJs = fs.readFileSync(path.join(srcDir, 'renderer.js'), 'utf8');
const dynamicIslandCss = fs.readFileSync(path.join(srcDir, 'styles/_dynamic_island.css'), 'utf8');
const windowRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/window.rs'), 'utf8');
const mainRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/main.rs'), 'utf8');

const { PlaybackDjEngine } = require('../src/modules/playback-dj-engine.js');

console.log('================================================================');
console.log('  RUNNING 3-PHASE CPU REDUCTION VERIFICATION SUITE              ');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

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

// ============================================================================
// PHASE 1: GRAPHICS & VISUALIZER CANVAS (src/renderer.js)
// ============================================================================
console.log('--- Phase 1: Graphics & Visualizer Canvas ---');

runTest('1.1. High-Refresh-Rate Frame Rate Limiter enforces 16.67ms (60 FPS) delta lock', () => {
  let clearRectCalls = 0;
  const mockCtx = {
    clearRect: () => { clearRectCalls++; },
    beginPath: () => {},
    roundRect: () => {},
    rect: () => {},
    arc: () => {},
    fill: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '#fff',
    globalAlpha: 1.0
  };

  let mockTime = 1000;
  const sandbox = {
    document: {
      getElementById: (id) => {
        if (id === 'island-wave-canvas') return { getContext: () => mockCtx, isConnected: true };
        if (id === 'dynamic-island') return { classList: { contains: () => false } };
        return null;
      }
    },
    settings: { islandVisualizerBars: 4 },
    performance: { now: () => mockTime },
    Date: { now: () => mockTime },
    Math,
    Boolean
  };
  vm.createContext(sandbox);

  const getContextFn = rendererJs.match(/function getIslandWaveCanvasContext\(\) \{[\s\S]*?\n\}/)[0];
  const drawFn = rendererJs.match(/function drawIslandVisualizer\([\s\S]*?\n\}/)[0];

  vm.runInContext(`
    let islandWaveCanvas = null;
    let islandWaveCtx = null;
    let lastIslandCanvasDrawTime = 0;
    let lastIslandCanvasVisStyle = null;
    ${getContextFn}
    ${drawFn}
  `, sandbox);

  // Call 1 at t = 1000: Must draw
  mockTime = 1000;
  vm.runInContext(`drawIslandVisualizer([0.8, 0.6, 0.4, 0.2], 'bars', false, false);`, sandbox);
  assert.strictEqual(clearRectCalls, 1, 'Initial frame at t=1000 must render');

  // Call 2 at t = 1005 (dt = 5ms < 16.67ms): Must ABORT on high refresh monitor
  mockTime = 1005;
  vm.runInContext(`drawIslandVisualizer([0.8, 0.6, 0.4, 0.2], 'bars', false, false);`, sandbox);
  assert.strictEqual(clearRectCalls, 1, '5ms frame delta must be throttled');

  // Call 3 at t = 1014 (dt = 14ms < 16.67ms): Must ABORT
  mockTime = 1014;
  vm.runInContext(`drawIslandVisualizer([0.8, 0.6, 0.4, 0.2], 'bars', false, false);`, sandbox);
  assert.strictEqual(clearRectCalls, 1, '14ms frame delta must be throttled');

  // Call 4 at t = 1018 (dt = 18ms >= 16.67ms): Must DRAW
  mockTime = 1018;
  vm.runInContext(`drawIslandVisualizer([0.8, 0.6, 0.4, 0.2], 'bars', false, false);`, sandbox);
  assert.strictEqual(clearRectCalls, 2, '18ms frame delta (>=16.67ms) must render');

  // Call 5 at t = 1020 with isResting = true: Resting state change must bypass limiter
  mockTime = 1020;
  vm.runInContext(`drawIslandVisualizer(null, 'bars', true, false);`, sandbox);
  assert.strictEqual(clearRectCalls, 3, 'Resting frame must bypass limiter for immediate settling');

  // Call 6 at t = 1022 with style change ('dots'): Style morph must bypass limiter
  mockTime = 1022;
  vm.runInContext(`drawIslandVisualizer([0.5, 0.4, 0.3, 0.2], 'dots', false, false);`, sandbox);
  assert.strictEqual(clearRectCalls, 4, 'Style change to dots must bypass limiter');
});

runTest('1.2. Amplitude Deviation Threshold Gate (< 0.005) short-circuits redraws during steady and silent audio', () => {
  let canvasClears = 0;
  const mockBars = Array.from({ length: 4 }, () => ({ isConnected: true, style: {} }));
  const mockCtx = {
    clearRect: () => { canvasClears++; },
    beginPath: () => {},
    roundRect: () => {},
    rect: () => {},
    arc: () => {},
    fill: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '#fff',
    globalAlpha: 1.0
  };

  let registeredSpectrumCallback = null;
  const sandbox = {
    window: {
      electronAPI: {
        onAudioSpectrum: (cb) => { registeredSpectrumCallback = cb; },
        setAudioVisualizerActive: () => {}
      }
    },
    document: {
      getElementById: (id) => {
        if (id === 'island-wave-canvas') return { getContext: () => mockCtx, isConnected: true };
        if (id === 'island-wave') return { classList: { contains: () => false, add: () => {}, remove: () => {} }, querySelectorAll: () => mockBars };
        if (id === 'dynamic-island') return { classList: { contains: () => false } };
        return null;
      },
      body: { classList: { contains: () => true } }
    },
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    isPlaying: true,
    settings: {
      islandVisualizerBars: 4,
      islandVisualizerStyle: 'bars',
      wallpaperMode: false,
      islandBeatBloom: false
    },
    lastSpectrumBars: mockBars,
    performance: { now: () => 200000 },
    Date: { now: () => 200000 },
    lastAudioEnergyTimestamp: 200000,
    isVisualizerResting: false,
    visualizerSilenceTimeout: null,
    updateIslandEnergyMorph: () => {},
    updateWallpaperLyricBeatBloom: () => {},
    checkVisualizerFallback: () => {},
    Math,
    Boolean
  };
  vm.createContext(sandbox);

  // Extract listener definition and onAudioSpectrum call
  const startIdx = rendererJs.indexOf('// High-performance audio spectrum event listener registry');
  const endIdx = rendererJs.indexOf('function updateMarqueeOverflow');
  const codeSegment = rendererJs.substring(startIdx, endIdx);

  const getContextFn = rendererJs.match(/function getIslandWaveCanvasContext\(\) \{[\s\S]*?\n\}/)[0];
  const drawFn = rendererJs.match(/function drawIslandVisualizer\([\s\S]*?\n\}/)[0];

  vm.runInContext(`
    let islandWaveCanvas = null;
    let islandWaveCtx = null;
    let lastIslandCanvasDrawTime = 0;
    let lastIslandCanvasVisStyle = null;
    let lastSpectrumBars = null;
    ${getContextFn}
    ${drawFn}
    ${codeSegment}
  `, sandbox);

  assert.ok(typeof registeredSpectrumCallback === 'function', 'onAudioSpectrum callback must be registered');

  // Frame 1: Active audio stream -> renders
  registeredSpectrumCallback([0.40, 0.30, 0.20, 0.10, 0.05, 0.02, 0.01, 0.005]);
  assert.strictEqual(canvasClears, 1, 'Initial frame must render');

  // Frame 2: Microscopic noise fluctuation (total diff = 0.002 < 0.005) -> MUST SHORT-CIRCUIT
  registeredSpectrumCallback([0.4005, 0.3005, 0.2005, 0.1005, 0.05, 0.02, 0.01, 0.005]);
  assert.strictEqual(canvasClears, 1, 'Micro-fluctuation < 0.005 total deviation must be short-circuited');

  // Frame 3: Another micro-fluctuation (total diff < 0.005) -> MUST SHORT-CIRCUIT
  registeredSpectrumCallback([0.4008, 0.3002, 0.2004, 0.1002, 0.05, 0.02, 0.01, 0.005]);
  assert.strictEqual(canvasClears, 1, 'Subsequent micro-fluctuation must remain short-circuited');

  // Frame 4: Perceptible musical transient (total diff > 0.05 >= 0.005) -> MUST RENDER
  sandbox.performance.now = () => 200050; // advance time by 50ms
  registeredSpectrumCallback([0.55, 0.42, 0.25, 0.12, 0.08, 0.03, 0.02, 0.01]);
  assert.strictEqual(canvasClears, 2, 'Audio transient >= 0.005 deviation must render');

  // Frame 5: Resting state silence check
  sandbox.isVisualizerResting = true;
  // Electrical line noise while resting (< 0.005 deviation)
  registeredSpectrumCallback([0.0001, 0.0002, 0.0001, 0.0001, 0, 0, 0, 0]);
  registeredSpectrumCallback([0.0002, 0.0001, 0.0002, 0.0001, 0, 0, 0, 0]);
  assert.strictEqual(canvasClears, 2, 'Resting electrical noise must short-circuit, yielding 0% CPU');
});

// ============================================================================
// PHASE 2: WINDOW & THREAD FRAMEWORK (src-tauri/)
// ============================================================================
console.log('\n--- Phase 2: Window & Thread Framework ---');

runTest('2.1. Dynamic Win32 Window Structural Bounds Shrinking in update_island_bounds', () => {
  assert.ok(
    windowRs.includes('pub fn update_island_bounds(window: WebviewWindow, rect: LyricBounds)'),
    'update_island_bounds must accept window and LyricBounds'
  );
  assert.ok(
    windowRs.includes('DYNAMIC_ISLAND_ACTIVE.load(Ordering::SeqCst)') &&
    windowRs.includes('SetWindowPos(') &&
    windowRs.includes('SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE'),
    'update_island_bounds must dynamically contract Win32 window bounds via SetWindowPos in Island mode'
  );
  assert.ok(
    windowRs.includes('DYNAMIC_ISLAND_ACTIVE.store(false, Ordering::SeqCst);') &&
    windowRs.includes('HWND_NOTOPMOST') &&
    windowRs.includes('window.set_size(tauri::PhysicalSize::new(rw, rh))'),
    'Exiting Dynamic Island mode must expand physical window bounds back out'
  );
});

runTest('2.2. WebView2 Compositor Flags & Grayscale Subpixel Font Smoothing', () => {
  assert.ok(
    mainRs.includes('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS') &&
    mainRs.includes('--disable-font-subpixel-positioning') &&
    mainRs.includes('--disable-lcd-text'),
    'main.rs must configure Chromium flags to disable subpixel text rendering overhead'
  );
  assert.ok(
    dynamicIslandCss.includes('html.mode-dynamic-island,') &&
    dynamicIslandCss.includes('body.mode-dynamic-island {') &&
    dynamicIslandCss.includes('-webkit-font-smoothing: antialiased') &&
    dynamicIslandCss.includes('-moz-osx-font-smoothing: grayscale'),
    '_dynamic_island.css must enforce grayscale font smoothing in Dynamic Island mode'
  );
});

// ============================================================================
// PHASE 3: FRONTEND LOGIC ENGINES (src/playback-dj-engine.js & src/renderer.js)
// ============================================================================
console.log('\n--- Phase 3: Frontend Logic Engines ---');

runTest('3.1. Cleanly Detach and Terminate Dormant DJ Engine Tracks & Spectrum Listeners', () => {
  const engine = new PlaybackDjEngine();
  engine.setSettings({
    djEnabled: true,
    djAutoTransition: true,
    djLyricAutoTransition: true,
    djPreserveSolos: true,
    djSmartQueue: true
  });

  // Populate state
  engine.recordSpectrumEnergy([0.8, 0.6, 0.4, 0.2]);
  engine.cachedAnalysisLyrics = [{ text: 'Hello' }];
  engine.lastVocalLine = { text: 'Hello' };
  engine.lastVocalEndMs = 5000;
  engine.instantEnergy = 0.5;

  assert.strictEqual(engine.isDjProcessingEnabled(), true, 'Engine must report enabled when settings are true');
  assert.ok(engine._energyRingBuffer !== null, 'Energy ring buffer should be initialized');

  // Execute detach()
  engine.detach();

  assert.strictEqual(engine._energyRingBuffer, null, 'Ring buffer must be nullified on detach');
  assert.strictEqual(engine._energyRingCount, 0, 'Ring count must reset to 0');
  assert.strictEqual(engine._energyRollingSum, 0, 'Rolling sum must reset to 0');
  assert.strictEqual(engine.cachedAnalysisLyrics, null, 'Cached analysis lyrics must be cleared');
  assert.strictEqual(engine.lastVocalLine, null, 'lastVocalLine must be reset');
  assert.strictEqual(engine.lastVocalEndMs, null, 'lastVocalEndMs must be reset');
  assert.strictEqual(engine.instantEnergy, 0, 'instantEnergy must be reset to 0');

  // Verify syncDjSpectrumListener wiring in renderer.js
  assert.ok(
    rendererJs.includes('function syncDjSpectrumListener()'),
    'renderer.js must declare syncDjSpectrumListener'
  );
  assert.ok(
    rendererJs.includes('registerAudioSpectrumListener') &&
    rendererJs.includes('unregisterAudioSpectrumListener'),
    'renderer.js must declare register/unregister spectrum listener functions'
  );
  assert.ok(
    rendererJs.includes('window.djEngine.detach()'),
    'syncDjSpectrumListener must invoke detach() when DJ mode is deactivated'
  );
  assert.ok(
    rendererJs.includes('const isDjActive = Boolean(') &&
    rendererJs.includes('window.djEngine.isDjProcessingEnabled()'),
    'hasDesktopVisualizer in syncAudioVisualizerState must check isDjProcessingEnabled()'
  );
});

console.log('\n================================================================');
console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY (100%)       `);
console.log('================================================================');
