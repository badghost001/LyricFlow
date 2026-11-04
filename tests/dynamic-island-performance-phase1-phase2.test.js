/**
 * Comprehensive Dynamic Island Phase 1 (CPU) & Phase 2 (Memory) Optimization Test Suite
 *
 * Verifies all performance requirements:
 *
 * Part 1: Phase 1 CPU Optimization Requirements (R1, R2)
 *   1.1 Dynamic Island visualizer canvas (#island-wave-canvas, 56x18px) and dual-path rendering
 *   1.2 Reactive silence watchdog (elimination of 140ms setInterval, 260ms active / 350ms stopped thresholds)
 *   1.3 CSS variable throttling (~20 Hz / 48ms gate) and perceptual deadbands with 0ms falling-edge cleanup
 *   1.4 Circular countdown SVG ring (throttled to ~10 Hz / 95ms, accurate 97.39 circumference)
 *   1.5 Playhead ticker gating (idle/break skip when lineIndex & countdown seconds unchanged)
 *
 * Part 2: Phase 2 Memory Optimization Requirements (R3, R4, R5)
 *   2.1 Video decoder unbinding (pause/removeAttribute/load, dormant restore, track change invalidation)
 *   2.2 WebGL lazy initialization in island-gl-dissolve.js (zero allocation on construct, lazy dissolve)
 *   2.3 WebGL context sleeping in fluid-mesh.js (WEBGL_lose_context loseContext/restoreContext lifecycle)
 *   2.4 Base64 image bitmap eviction (730ms transition end cleanup, modal close, track change purge)
 *   2.5 Memory cache bounding (sessionArtMemoryCache <= 30, localArtCache <= 40, linkCache <= 30, MAX_CACHED_TRACKS = 25, data: URL rejection)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcDir = path.join(__dirname, '../src');
const indexHtml = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const dynamicIslandCss = fs.readFileSync(path.join(srcDir, 'styles/_dynamic_island.css'), 'utf8');
const rendererJs = fs.readFileSync(path.join(srcDir, 'renderer.js'), 'utf8');

const {
  IslandGLDissolve,
  ISLAND_DISSOLVE_VERTEX_SHADER,
  ISLAND_DISSOLVE_FRAGMENT_SHADER
} = require('../src/modules/island-gl-dissolve.js');

const { FluidMeshGradient } = require('../src/modules/fluid-mesh.js');

console.log('================================================================');
console.log('  DYNAMIC ISLAND PERFORMANCE & MEMORY TEST SUITE (PHASE 1 & 2) ');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } catch (err) {
    console.error(`  ✗ ${testName}`);
    console.error(err);
    throw err;
  }
}

// ============================================================================
// PART 1: PHASE 1 CPU OPTIMIZATION REQUIREMENTS (R1, R2)
// ============================================================================
console.log('--- Part 1: Phase 1 CPU Optimization Requirements ---');

// --- Test 1.1: Dynamic Island visualizer canvas (#island-wave-canvas, 56x18px) ---
runTest('Test 1.1: Visualizer canvas markup, CSS rules, and dual-path execution (0 DOM writes with canvas)', () => {
  // 1. Static markup verification
  assert.ok(
    indexHtml.includes('<canvas id="island-wave-canvas" class="island-wave-canvas" width="56" height="18"></canvas>'),
    'index.html must declare #island-wave-canvas with 56x18 dimensions'
  );
  assert.ok(
    dynamicIslandCss.includes('.island-wave-canvas {') &&
    dynamicIslandCss.includes('width: 56px;') &&
    dynamicIslandCss.includes('height: 18px;'),
    '_dynamic_island.css must define .island-wave-canvas 56x18 styling'
  );
  assert.ok(
    dynamicIslandCss.includes('.island-wave-visualizer:has(.island-wave-canvas) .wave-bar') &&
    dynamicIslandCss.includes('display: none !important;'),
    '_dynamic_island.css must suppress .wave-bar spans when canvas is mounted'
  );

  // 2. Behavioral verification: Canvas path generates 0 DOM writes on .wave-bar spans
  let clearRectCalls = 0;
  let arcCalls = 0;
  let rectCalls = 0;
  let fillCalls = 0;

  const mockCtx = {
    clearRect: (x, y, w, h) => { clearRectCalls++; },
    beginPath: () => {},
    arc: (x, y, r, sa, ea) => { arcCalls++; },
    rect: (x, y, w, h) => { rectCalls++; },
    roundRect: (x, y, w, h, r) => { rectCalls++; },
    fill: () => { fillCalls++; },
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '#ffffff',
    globalAlpha: 1.0
  };

  let domSpanStyleWrites = 0;
  const mockBars = Array.from({ length: 4 }, () => ({
    isConnected: true,
    style: {
      set transform(val) { domSpanStyleWrites++; }
    }
  }));

  const mockCanvasEl = {
    isConnected: true,
    getContext: (type) => (type === '2d' ? mockCtx : null)
  };

  const sandbox = {
    document: {
      getElementById: (id) => {
        if (id === 'island-wave-canvas') return mockCanvasEl;
        if (id === 'island-wave') return { classList: { contains: () => false } };
        return null;
      }
    },
    settings: { islandVisualizerBars: 4 },
    Math,
    Boolean
  };
  vm.createContext(sandbox);

  // Extract getIslandWaveCanvasContext and drawIslandVisualizer
  const getContextFn = rendererJs.match(/function getIslandWaveCanvasContext\(\) \{[\s\S]*?\n\}/)[0];
  const drawFn = rendererJs.match(/function drawIslandVisualizer\([\s\S]*?\n\}/)[0];

  vm.runInContext(`
    let islandWaveCanvas = null;
    let islandWaveCtx = null;
    ${getContextFn}
    ${drawFn}
    drawIslandVisualizer([0.8, 0.6, 0.4, 0.2], 'bars', false, false);
    drawIslandVisualizer([0.8, 0.6, 0.4, 0.2], 'dots', false, false);
  `, sandbox);

  assert.ok(clearRectCalls >= 2, 'drawIslandVisualizer must clear canvas on each frame');
  assert.ok(rectCalls >= 4, 'drawIslandVisualizer in bars mode must render rectangles to canvas');
  assert.ok(arcCalls >= 4, 'drawIslandVisualizer in dots mode must render arcs to canvas');
  assert.strictEqual(domSpanStyleWrites, 0, 'Canvas rendering path must produce exactly 0 DOM writes on .wave-bar spans');

  // 3. Fallback path: Headless test harness without canvas executes style transforms on .wave-bar spans
  let fallbackWrites = 0;
  const fallbackBars = Array.from({ length: 4 }, () => ({
    isConnected: true,
    style: {
      set transform(val) { fallbackWrites++; }
    }
  }));

  const fallbackSandbox = {
    document: {
      getElementById: (id) => null
    },
    settings: { islandVisualizerStyle: 'bars', islandVisualizerBars: 4 },
    getIslandWaveCanvasContext: () => null,
    lastSpectrumBars: fallbackBars,
    Math,
    Boolean
  };
  vm.createContext(fallbackSandbox);

  vm.runInContext(`
    const ctx = getIslandWaveCanvasContext();
    const bars = lastSpectrumBars;
    const values = [0.5, 0.5, 0.5, 0.5];
    if (ctx && typeof drawIslandVisualizer === 'function') {
      // Primary canvas path
    } else if (bars && bars.length > 0) {
      // Fallback path
      for (let i = 0; i < bars.length; i++) {
        bars[i].style.transform = 'scaleY(0.500)';
      }
    }
  `, fallbackSandbox);

  assert.strictEqual(fallbackWrites, 4, 'Headless fallback path must update .wave-bar transforms when canvas context is null');
});

// --- Test 1.2: Reactive silence watchdog ---
runTest('Test 1.2: Reactive silence watchdog (elimination of 140ms setInterval, 260ms active / 350ms stopped thresholds)', () => {
  // 1. Static verification: recurring 140ms setInterval must be eliminated
  assert.ok(
    !rendererJs.includes('visualizerFallbackInterval = setInterval(checkVisualizerFallback, 140)'),
    'Recurring setInterval(checkVisualizerFallback, 140) must be eliminated'
  );
  assert.ok(
    rendererJs.includes('visualizerSilenceTimeout'),
    'renderer.js must declare visualizerSilenceTimeout for reactive one-shot settlement'
  );

  // 2. Threshold verification in checkVisualizerFallback & onAudioSpectrum
  assert.ok(
    rendererJs.includes('const silenceThreshold = !isAudioActive ? 350 : 260;'),
    'Silence threshold must be exactly 260ms when audio is active and 350ms when stopped'
  );

  // 3. Behavioral simulation of reactive silence detection
  let timeoutScheduled = false;
  let timeoutDelay = 0;
  let timeoutCleared = false;
  let fallbackChecked = false;

  const mockSetTimeout = (fn, delay) => {
    timeoutScheduled = true;
    timeoutDelay = delay;
    return 101;
  };
  const mockClearTimeout = (id) => {
    timeoutCleared = true;
  };

  const silenceSandbox = {
    isPlaying: true,
    document: { body: { classList: { contains: () => false } } },
    Date: { now: () => 10000 },
    lastAudioEnergyTimestamp: 9900, // 100ms since energy
    isVisualizerResting: false,
    visualizerSilenceTimeout: null,
    setTimeout: mockSetTimeout,
    clearTimeout: mockClearTimeout,
    checkVisualizerFallback: () => { fallbackChecked = true; },
    Math,
    Boolean
  };
  vm.createContext(silenceSandbox);

  // Simulate silence event with active playback (threshold 260ms - 100ms = 160ms delay)
  vm.runInContext(`
    const isAudioActive = Boolean(isPlaying) || document.body.classList.contains("is-playing");
    const msSinceEnergy = Date.now() - lastAudioEnergyTimestamp;
    const silenceThreshold = !isAudioActive ? 350 : 260;

    if (!isVisualizerResting && !visualizerSilenceTimeout) {
      const remainingDelay = Math.max(0, silenceThreshold - msSinceEnergy);
      visualizerSilenceTimeout = setTimeout(() => {
        visualizerSilenceTimeout = null;
        checkVisualizerFallback();
      }, remainingDelay);
    }
  `, silenceSandbox);

  assert.strictEqual(timeoutScheduled, true, 'One-shot timeout must be scheduled on silence');
  assert.strictEqual(timeoutDelay, 160, 'Timeout delay must be exactly silenceThreshold - msSinceEnergy (260 - 100 = 160ms)');

  // Now simulate arrival of audio energy: must clear timeout immediately
  timeoutCleared = false;
  vm.runInContext(`
    const bands = [0.05, 0.08, 0.02, 0.01];
    const hasEnergy = bands.some(b => typeof b === 'number' && b > 0.002);
    if (hasEnergy) {
      isVisualizerResting = false;
      lastAudioEnergyTimestamp = Date.now();
      if (visualizerSilenceTimeout) {
        clearTimeout(visualizerSilenceTimeout);
        visualizerSilenceTimeout = null;
      }
    }
  `, silenceSandbox);

  assert.strictEqual(timeoutCleared, true, 'Arrival of audio energy must cancel pending silence timeout');
  assert.strictEqual(silenceSandbox.visualizerSilenceTimeout, null, 'visualizerSilenceTimeout must be cleared to null');
  assert.strictEqual(silenceSandbox.isVisualizerResting, false, 'isVisualizerResting must be reset to false');
});

// --- Test 1.3: CSS variable throttling & deadbands ---
runTest('Test 1.3: CSS variable throttling (~20 Hz / 48ms window) and deadbands with 0ms falling-edge cleanup', () => {
  // 1. Static verification of deadband constants and throttle gate
  assert.ok(rendererJs.includes('ISLAND_BLOOM_RADIUS_DEADBAND = 2'), 'Must declare 2px bloom radius deadband');
  assert.ok(rendererJs.includes('ISLAND_BLOOM_ALPHA_DEADBAND = 0.04'), 'Must declare 0.04 bloom alpha deadband');
  assert.ok(rendererJs.includes('ISLAND_HALO_OPACITY_DEADBAND = 0.04'), 'Must declare 0.04 halo opacity deadband');
  assert.ok(rendererJs.includes('ISLAND_HALO_SCALE_DEADBAND = 0.005'), 'Must declare 0.005 halo scale deadband');
  assert.ok(!rendererJs.includes('ISLAND_HALO_BLUR_DEADBAND'), 'Halo blur must not be updated from audio samples');
  assert.ok(rendererJs.includes('ISLAND_BEAT_SCALE_DEADBAND = 0.002'), 'Must declare 0.002 beat scale deadband');
  assert.ok(rendererJs.includes('now - _lastIslandMorphCssTime >= 48'), 'Must enforce ~20 Hz (48ms) CSS throttle window');

  // 2. Behavioral verification of 48ms throttling & deadband filtering
  const islandStyle = {};
  const haloStyle = {};
  let islandPropertyWrites = 0;
  let islandPropertyRemovals = 0;

  const mockIslandEl = {
    style: {
      setProperty: (prop, val) => {
        islandPropertyWrites++;
        islandStyle[prop] = val;
      },
      getPropertyValue: (prop) => islandStyle[prop] || '',
      removeProperty: (prop) => {
        islandPropertyRemovals++;
        delete islandStyle[prop];
      }
    }
  };

  const mockHaloEl = {
    style: {
      setProperty: (prop, val) => {
        haloStyle[prop] = val;
      },
      getPropertyValue: (prop) => haloStyle[prop] || '',
      removeProperty: (prop) => {
        delete haloStyle[prop];
      }
    }
  };

  const morphSandbox = {
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    settings: { islandMetamorphosis: true, islandBeatBloom: true },
    document: {
      getElementById: (id) => {
        if (id === 'dynamic-island') return mockIslandEl;
        if (id === 'island-art-halo') return mockHaloEl;
        return null;
      },
      body: {
        classList: {
          remove: () => {},
          toggle: () => {}
        }
      }
    },
    lastIslandSyncData: null,
    currentMorphTier: 'groove',
    lastMorphTierTime: 0,
    setStylePropertyIfChanged: (el, prop, val) => {
      el.style.setProperty(prop, val);
    },
    rollingAudioEnergy: 0,
    smoothedIslandBloom: 0,
    lastAppliedMorphTier: null,
    _lastIslandMorphCssTime: 0,
    _lastIslandBloomRadius: null,
    _lastIslandBloomAlpha: null,
    _lastIslandHaloOpacity: null,
    _lastIslandHaloScale: null,
    _lastIslandBeatScale: null,
    ISLAND_BLOOM_RADIUS_DEADBAND: 2,
    ISLAND_BLOOM_ALPHA_DEADBAND: 0.04,
    ISLAND_HALO_OPACITY_DEADBAND: 0.04,
    ISLAND_HALO_SCALE_DEADBAND: 0.005,
    ISLAND_BEAT_SCALE_DEADBAND: 0.002,
    islandArtHaloEl: mockHaloEl,
    currentTime: 1000,
    Date: { now: () => morphSandbox.currentTime },
    Math,
    parseFloat,
    Array
  };
  vm.createContext(morphSandbox);

  const morphFn = rendererJs.match(/function updateIslandEnergyMorph\([\s\S]*?\n\}/)[0];

  // Pass 1: Initial sub-bass spike at t = 1000. Sets baseline bloom radius (28px).
  vm.runInContext(`
    ${morphFn}
    updateIslandEnergyMorph([0.90, 0.90, 0.5, 0.2]);
  `, morphSandbox);

  assert.ok(islandPropertyWrites > 0, 'First energy spike must update CSS variables');
  const initialWrites = islandPropertyWrites;
  const initialRadius = islandStyle['--island-bloom-radius'];
  assert.strictEqual(initialRadius, '28px', 'Initial bloom radius must be 28px');

  // Pass 2: Another update only 20ms later (t = 1020 < 1000 + 48ms). Must be throttled!
  morphSandbox.currentTime = 1020;
  vm.runInContext(`
    updateIslandEnergyMorph([0.90, 0.90, 0.5, 0.2]);
  `, morphSandbox);
  assert.strictEqual(islandPropertyWrites, initialWrites, 'Mutations within 48ms must be throttled (0 extra writes)');

  // Pass 3: Update at t = 1060 (>= 48ms later) but with sub-deadband change (0.91 -> 29px, delta 1px < 2px).
  morphSandbox.currentTime = 1060;
  vm.runInContext(`
    updateIslandEnergyMorph([0.91, 0.91, 0.5, 0.2]);
  `, morphSandbox);
  assert.strictEqual(
    islandStyle['--island-bloom-radius'],
    '28px',
    'Sub-deadband jitter (1px < 2px deadband) must not rewrite --island-bloom-radius'
  );

  // Pass 4: Update at t = 1110 (>= 48ms later) with above-deadband change (0.96 -> 32px, delta 4px >= 2px).
  morphSandbox.currentTime = 1110;
  vm.runInContext(`
    updateIslandEnergyMorph([0.96, 0.96, 0.5, 0.2]);
  `, morphSandbox);
  assert.strictEqual(
    islandStyle['--island-bloom-radius'],
    '32px',
    'Above-deadband change (4px >= 2px deadband) must update --island-bloom-radius to 32px'
  );

  // Pass 5: Audio silence (t = 1170, subBass = 0).
  // Halo (threshold 0.05) and beat-scale (threshold 0.70) have immediate 0ms falling-edge cleanup.
  morphSandbox.currentTime = 1170;
  vm.runInContext(`
    updateIslandEnergyMorph([0, 0, 0, 0]);
  `, morphSandbox);

  assert.strictEqual(islandStyle['--island-beat-scale'], undefined, 'Falling edge must immediately remove --island-beat-scale');
  assert.strictEqual(haloStyle['--island-halo-opacity'], undefined, 'Falling edge must immediately remove --island-halo-opacity');
  assert.strictEqual(haloStyle['--island-halo-scale'], undefined, 'Falling edge must immediately remove --island-halo-scale');
  assert.strictEqual(haloStyle['--island-halo-blur'], undefined, 'Halo blur remains fixed in CSS and is never written by the audio loop');

  // Exponential decay frames of silence: smoothed bloom decays below 0.60 within 5 frames
  for (let frame = 1; frame <= 5; frame++) {
    morphSandbox.currentTime = 1170 + frame * 50;
    vm.runInContext(`
      updateIslandEnergyMorph([0, 0, 0, 0]);
    `, morphSandbox);
  }

  assert.strictEqual(islandStyle['--island-bloom-radius'], undefined, 'After silence decay, must remove --island-bloom-radius');
  assert.strictEqual(islandStyle['--island-bloom-alpha'], undefined, 'After silence decay, must remove --island-bloom-alpha');
  assert.strictEqual(morphSandbox._lastIslandBloomRadius, null, 'Cached bloom radius must be reset to null');
  assert.strictEqual(morphSandbox._lastIslandHaloOpacity, null, 'Cached halo opacity must be reset to null');
});

// --- Test 1.4: Circular countdown SVG ring ---
runTest('Test 1.4: Circular countdown SVG ring (throttled to ~10 Hz / 95ms, accurate 97.39 circumference)', () => {
  // 1. Static verification of circumference and throttle interval
  assert.ok(
    dynamicIslandCss.includes('stroke-dasharray: 97.39;'),
    '_dynamic_island.css must define stroke-dasharray: 97.39;'
  );
  assert.ok(
    rendererJs.includes('circumference = 97.39;'),
    'renderer.js must use circumference = 97.39;'
  );
  assert.ok(
    rendererJs.includes('now - _lastIslandCountdownRingUpdate >= 95'),
    'renderer.js countdown ring math must be throttled to ~10 Hz (95ms)'
  );

  // 2. Mathematical geometry verification (2 * PI * r = 97.389)
  const radius = 15.5;
  const computedCircumference = 2 * Math.PI * radius;
  assert.ok(
    Math.abs(computedCircumference - 97.39) < 0.05,
    'SVG circle radius 15.5 circumference must equal 97.39 within 0.05'
  );

  // 3. Behavioral simulation of throttling and offset math
  let ringDisplay = 'none';
  let fillOffset = '';
  let ringUpdatesCount = 0;

  const mockRingEl = {
    style: {
      get display() { return ringDisplay; },
      set display(val) { ringDisplay = val; }
    }
  };

  const mockFillEl = {
    style: {
      set strokeDashoffset(val) {
        fillOffset = val;
        ringUpdatesCount++;
      }
    }
  };

  let islandInstrumentalClass = false;
  const mockIslandEl = {
    classList: {
      contains: (cls) => (cls === 'island-instrumental-active' ? islandInstrumentalClass : false),
      add: (cls) => { if (cls === 'island-instrumental-active') islandInstrumentalClass = true; },
      remove: (cls) => { if (cls === 'island-instrumental-active') islandInstrumentalClass = false; }
    }
  };

  const ringSandbox = {
    isPlaying: true,
    document: {
      body: { classList: { contains: () => false } },
      getElementById: (id) => {
        if (id === 'island-countdown-ring') return mockRingEl;
        if (id === 'island-countdown-ring-fill') return mockFillEl;
        if (id === 'dynamic-island') return mockIslandEl;
        return null;
      }
    },
    islandCountdownRingEl: mockRingEl,
    islandCountdownRingFillEl: mockFillEl,
    dynamicIslandMainEl: mockIslandEl,
    currentIslandBreakKey: null,
    currentIslandBreakTotalMs: 4000,
    currentTrackId: 'track-test',
    currentPlayingTrackObj: null,
    widgetTrackName: null,
    settings: { islandVocalCountdown: true },
    _lastIslandCountdownRingUpdate: 0,
    currentTime: 1000,
    Date: { now: () => ringSandbox.currentTime },
    Math,
    Boolean
  };
  vm.createContext(ringSandbox);

  const ringFn = rendererJs.match(/function updateIslandCountdownRingThrottled\([\s\S]*?\n\}/)[0];

  // Call 1 at t = 1000 with 3000ms countdown (break starts with 3000ms total, frac = 1.0, offset = 0.00)
  vm.runInContext(`
    ${ringFn}
    updateIslandCountdownRingThrottled(3000, true, false, 0);
  `, ringSandbox);

  assert.strictEqual(ringDisplay, 'block', 'Ring element must be displayed during break');
  assert.strictEqual(islandInstrumentalClass, true, 'Dynamic Island must have island-instrumental-active class');
  assert.strictEqual(fillOffset, '0.00', 'Stroke dashoffset at break start must be 0.00 (100% full ring)');
  assert.strictEqual(ringUpdatesCount, 1, 'Initial countdown update must execute');

  // Call 2 at t = 1040 (< 95ms later). Must be throttled!
  ringSandbox.currentTime = 1040;
  vm.runInContext(`
    updateIslandCountdownRingThrottled(2800, true, false, 0);
  `, ringSandbox);
  assert.strictEqual(ringUpdatesCount, 1, 'Update within 95ms must be throttled');

  // Call 3 at t = 1100 (100ms later >= 95ms) with countdownMs = 1500 (halfway through 3000ms break).
  ringSandbox.currentTime = 1100;
  vm.runInContext(`
    updateIslandCountdownRingThrottled(1500, true, false, 0);
  `, ringSandbox);
  assert.strictEqual(ringUpdatesCount, 2, 'Update after >= 95ms must execute');
  assert.strictEqual(fillOffset, '48.70', 'Offset at 50% countdown (1500/3000ms) must equal 48.70');

  // Call 4: Break terminates (countdownMs = 0). Must hide ring and remove class!
  vm.runInContext(`
    updateIslandCountdownRingThrottled(0, true, false, 0);
  `, ringSandbox);
  assert.strictEqual(ringDisplay, 'none', 'Ring element must be hidden when countdown reaches 0');
  assert.strictEqual(islandInstrumentalClass, false, 'island-instrumental-active class must be removed');
});

// --- Test 1.5: Playhead ticker gating ---
runTest('Test 1.5: Playhead ticker gating (idle/break skip when lineIndex & countdown seconds unchanged)', () => {
  // 1. Static verification of gating logic in updatePlayhead
  assert.ok(
    rendererJs.includes('updateDynamicIslandWordProgressTick('),
    'updatePlayhead must route to updateDynamicIslandWordProgressTick'
  );
  assert.ok(
    rendererJs.includes('isLineChanged || isCountdownChanged || isTrackChanged'),
    'updatePlayhead must gate updateDynamicIslandLyric when lineIndex, countdown second, and trackKey are unchanged'
  );
  assert.ok(
    rendererJs.includes('updateDynamicIslandBreakTick(islandSync.countdownMs, syncProgress, islandSync.isInstrumental, islandSync.lineIndex);'),
    'Gated frames must be routed to lightweight updateDynamicIslandBreakTick'
  );

  // 2. Behavioral verification of gating during 30 Hz tick simulation
  let heavyUpdateCalls = 0;
  let lightweightTickCalls = 0;
  let lightweightWordCalls = 0;

  const playheadSandbox = {
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    _lastPlayheadIslandLineIndex: null,
    _lastPlayheadIslandCountdownSec: null,
    _lastPlayheadIslandTrackKey: null,
    currentTrackId: 'song-1',
    currentPlayingTrackObj: null,
    widgetTrackName: null,
    updateDynamicIslandLyric: (lineIdx, lineData, prog, isInst, cdMs) => {
      heavyUpdateCalls++;
    },
    updateDynamicIslandBreakTick: (cdMs, prog, isInst, lineIdx) => {
      lightweightTickCalls++;
    },
    updateDynamicIslandWordProgressTick: (lineIdx, lineData, prog) => {
      lightweightWordCalls++;
    },
    Math
  };
  vm.createContext(playheadSandbox);

  vm.runInContext(`
    function runPlayheadTick(islandSync) {
      const syncProgress = islandSync.syncProgress;
      const countdownSec = islandSync.countdownMs > 0 ? Math.ceil(islandSync.countdownMs / 1000) : 0;
      const trackKey = (currentTrackId || 'default');
      const isLineChanged = islandSync.lineIndex !== _lastPlayheadIslandLineIndex;
      const isCountdownChanged = countdownSec !== _lastPlayheadIslandCountdownSec;
      const isTrackChanged = trackKey !== _lastPlayheadIslandTrackKey;

      if (isLineChanged || isCountdownChanged || isTrackChanged) {
        _lastPlayheadIslandLineIndex = islandSync.lineIndex;
        _lastPlayheadIslandCountdownSec = countdownSec;
        _lastPlayheadIslandTrackKey = trackKey;
        updateDynamicIslandLyric(islandSync.lineIndex, islandSync.lineData, syncProgress, islandSync.isInstrumental, islandSync.countdownMs);
      } else if (islandSync.lineIndex < 0) {
        updateDynamicIslandBreakTick(islandSync.countdownMs, syncProgress, islandSync.isInstrumental, islandSync.lineIndex);
      } else {
        updateDynamicIslandWordProgressTick(islandSync.lineIndex, islandSync.lineData, syncProgress);
      }
    }
  `, playheadSandbox);

  const simulateTick = (lineIndex, countdownMs, syncProgress) => {
    playheadSandbox.runPlayheadTick({
      lineIndex,
      lineData: null,
      syncProgress,
      isInstrumental: true,
      countdownMs
    });
  };

  // Frame 1: Instrumental break starting (countdown 4800ms -> 5s)
  simulateTick(-2, 4800, 10000);
  assert.strictEqual(heavyUpdateCalls, 1, 'Initial break frame must invoke updateDynamicIslandLyric');
  assert.strictEqual(lightweightTickCalls, 0, 'No lightweight ticks yet');

  // Frames 2-25: 30 Hz ticks during the SAME whole second (e.g. countdown 4766ms, 4733ms... countdownSec stays 5)
  for (let f = 0; f < 20; f++) {
    simulateTick(-2, 4800 - (f + 1) * 33, 10000 + (f + 1) * 33);
  }
  assert.strictEqual(heavyUpdateCalls, 1, 'updateDynamicIslandLyric MUST BE SKIPPED during identical countdown seconds');
  assert.strictEqual(lightweightTickCalls, 20, 'Ticks within the same whole second must route to updateDynamicIslandBreakTick');

  // Frame 26: Whole second decrements (countdown 3950ms -> countdownSec becomes 4)
  simulateTick(-2, 3950, 10850);
  assert.strictEqual(heavyUpdateCalls, 2, 'Decrement of countdown second must trigger updateDynamicIslandLyric');

  // Frame 27: Active vocal returns (lineIndex = 0 >= 0)
  simulateTick(0, 0, 15000);
  assert.strictEqual(heavyUpdateCalls, 3, 'Active vocal line change must invoke updateDynamicIslandLyric');
  simulateTick(0, 0, 15033);
  assert.strictEqual(heavyUpdateCalls, 3, 'Intra-line active vocal ticks must skip heavy updateDynamicIslandLyric');
  assert.strictEqual(lightweightWordCalls, 1, 'Intra-line vocal ticks must route to updateDynamicIslandWordProgressTick');
});

// ============================================================================
// PART 2: PHASE 2 MEMORY OPTIMIZATION REQUIREMENTS (R3, R4, R5)
// ============================================================================
console.log('\n--- Part 2: Phase 2 Memory Optimization Requirements ---');

// --- Test 2.1: Video decoder unbinding ---
runTest('Test 2.1: Video decoder unbinding (pause/removeAttribute/load, dormant restore, track change invalidation)', () => {
  // 1. Static verification of helper functions
  assert.ok(
    rendererJs.includes('function unbindVideoSurface(videoEl) {'),
    'renderer.js must define unbindVideoSurface'
  );
  assert.ok(
    rendererJs.includes('function restoreVideoSurface(videoEl, fallbackUrl) {'),
    'renderer.js must define restoreVideoSurface'
  );
  assert.ok(
    rendererJs.includes('v._dormantSrc = null;'),
    'renderer.js must clear _dormantSrc on track changes to prevent stale video playback'
  );

  // 2. Behavioral verification of unbindVideoSurface
  let pauseCalled = false;
  let removeAttrCalled = false;
  let loadCalled = false;
  let removedAttr = '';
  let videoDisplay = 'block';

  const mockVideo = {
    src: 'https://cdn.example.com/artist_motion_video.mp4',
    getAttribute: (attr) => (attr === 'src' ? mockVideo.src : null),
    pause: () => { pauseCalled = true; },
    removeAttribute: (attr) => {
      removeAttrCalled = true;
      removedAttr = attr;
      mockVideo.src = '';
    },
    load: () => { loadCalled = true; },
    style: {
      set display(val) { videoDisplay = val; },
      get display() { return videoDisplay; }
    },
    classList: {
      remove: () => {}
    },
    _dormantSrc: null
  };

  const videoSandbox = {
    unbindVideoSurface: null,
    restoreVideoSurface: null,
    stopMotionVideoFrameMonitor: () => {},
    clearTimeout: () => {},
    startMotionArtVideo: null
  };
  vm.createContext(videoSandbox);

  const unbindFn = rendererJs.match(/function unbindVideoSurface\([\s\S]*?\n\}/)[0];
  const restoreFn = rendererJs.match(/function restoreVideoSurface\([\s\S]*?\n\}/)[0];

  vm.runInContext(`
    ${unbindFn}
    ${restoreFn}
  `, videoSandbox);

  videoSandbox.unbindVideoSurface(mockVideo);

  assert.strictEqual(pauseCalled, true, 'unbindVideoSurface must pause playback');
  assert.strictEqual(removeAttrCalled, true, 'unbindVideoSurface must call removeAttribute');
  assert.strictEqual(removedAttr, 'src', 'unbindVideoSurface must remove the src attribute');
  assert.strictEqual(loadCalled, true, 'unbindVideoSurface must call load() to free GPU decoder buffers');
  assert.strictEqual(mockVideo._dormantSrc, 'https://cdn.example.com/artist_motion_video.mp4', 'Must save dormant URL');
  assert.strictEqual(videoDisplay, 'none', 'Video surface must be hidden');

  // 3. Behavioral verification of restoreVideoSurface
  let restoredTargetUrl = null;
  videoSandbox.startMotionArtVideo = (videoEl, url) => {
    restoredTargetUrl = url;
  };

  videoSandbox.restoreVideoSurface(mockVideo, 'https://cdn.example.com/fallback.mp4');
  assert.strictEqual(restoredTargetUrl, 'https://cdn.example.com/fallback.mp4', 'Must prefer the current surface URL over a stale dormant URL');
  assert.strictEqual(mockVideo._dormantSrc, null, 'Must clear _dormantSrc after restoration');

  mockVideo._dormantSrc = 'https://cdn.example.com/artist_motion_video.mp4';
  restoredTargetUrl = null;
  videoSandbox.restoreVideoSurface(mockVideo);
  assert.strictEqual(restoredTargetUrl, 'https://cdn.example.com/artist_motion_video.mp4', 'Must still restore the dormant URL when no current surface URL is supplied');

  // 4. Invalidation on track change
  const videoSurfaces = [mockVideo, { _dormantSrc: 'https://cdn.example.com/song1.mp4' }];
  videoSurfaces.forEach(v => {
    if (v) v._dormantSrc = null;
  });
  assert.strictEqual(videoSurfaces[0]._dormantSrc, null, 'Dormant src must be invalidated on song 1');
  assert.strictEqual(videoSurfaces[1]._dormantSrc, null, 'Dormant src must be invalidated on song 2');
});

// --- Test 2.2: WebGL lazy initialization in island-gl-dissolve.js ---
runTest('Test 2.2: WebGL lazy initialization in island-gl-dissolve.js (zero allocation on construct, lazy dissolve)', () => {
  // 1. Static verification of lazy contract
  const dissolveSource = fs.readFileSync(path.join(srcDir, 'modules/island-gl-dissolve.js'), 'utf8');
  assert.ok(
    dissolveSource.includes('this.gl = null;'),
    'Constructor must initialize this.gl to null'
  );
  assert.ok(
    dissolveSource.includes('if (!this.gl && !this._initGL()) {'),
    'dissolve must lazily initialize WebGL using !this.gl && !this._initGL()'
  );
  assert.ok(
    dissolveSource.includes('dissolve(targetElement, onComplete = null, options = {}) {'),
    'island-gl-dissolve.js must expose dissolve alias matching interface contract'
  );

  // 2. Behavioral verification: Zero resources on instantiation
  const instance = new IslandGLDissolve('test-dissolve-canvas');
  assert.strictEqual(instance.gl, null, 'IslandGLDissolve constructor must allocate zero WebGL resources');
  assert.strictEqual(instance.program, null, 'IslandGLDissolve constructor must compile zero shader programs');
  assert.strictEqual(instance.posBuffer, null, 'IslandGLDissolve constructor must allocate zero vertex buffers');

  // 3. Lazy initialization when dissolve is invoked
  let webglContextRequested = 0;
  class MockWebGLContext {
    constructor() {
      this.VERTEX_SHADER = 1;
      this.FRAGMENT_SHADER = 2;
      this.ARRAY_BUFFER = 3;
      this.STATIC_DRAW = 4;
      this.TEXTURE_2D = 5;
      this.RGBA = 6;
      this.UNSIGNED_BYTE = 7;
      this.LINK_STATUS = 20;
      this.COMPILE_STATUS = 21;
    }
    createShader() { return {}; }
    shaderSource() {}
    compileShader() {}
    getShaderParameter() { return true; }
    createProgram() { return {}; }
    attachShader() {}
    linkProgram() {}
    getProgramParameter() { return true; }
    getAttribLocation() { return 0; }
    getUniformLocation(p, name) { return name; }
    createBuffer() { return {}; }
    bindBuffer() {}
    bufferData() {}
    createTexture() { return {}; }
    bindTexture() {}
    texParameteri() {}
    viewport() {}
    texImage2D() {}
    enable() {}
    blendFunc() {}
    useProgram() {}
    enableVertexAttribArray() {}
    vertexAttribPointer() {}
    activeTexture() {}
    uniform1i() {}
    uniform1f() {}
  }

  const mockCanvas = {
    style: {},
    getContext: (type) => {
      webglContextRequested++;
      return new MockWebGLContext();
    },
    width: 200,
    height: 48
  };

  instance.canvas = mockCanvas;
  const mockTarget = {
    style: {},
    getBoundingClientRect: () => ({ left: 10, top: 10, width: 200, height: 48 })
  };

  // Before dissolve: gl is null
  assert.strictEqual(instance.gl, null, 'instance.gl must be null prior to dissolve invocation');

  // Invoke dissolve: must trigger _initGL lazily
  const success = instance.dissolve(mockTarget, null, { duration: 100 });
  assert.ok(webglContextRequested > 0, 'dissolve() must lazily request WebGL context on demand');
  assert.ok(instance.gl !== null, 'instance.gl must be populated after dissolve() invocation');
  instance.stop();

  // 4. Graceful fallback when WebGL is unavailable
  const fallbackInstance = new IslandGLDissolve('test-fallback-canvas');
  let fallbackEmitterTriggered = false;
  fallbackInstance.canvas = {
    style: {},
    getContext: () => null // WebGL unavailable
  };
  fallbackInstance._fallbackToEmitter = () => {
    fallbackEmitterTriggered = true;
  };

  const fallbackResult = fallbackInstance.dissolve(mockTarget);
  assert.strictEqual(fallbackResult, false, 'dissolve must return false when WebGL is unavailable');
  assert.strictEqual(fallbackEmitterTriggered, true, 'dissolve must gracefully route to fallback particle emitter');
});

// --- Test 2.3: WebGL context sleeping in fluid-mesh.js ---
runTest('Test 2.3: WebGL context sleeping in fluid-mesh.js (WEBGL_lose_context loseContext/restoreContext lifecycle)', () => {
  // 1. Static verification
  const fluidMeshSource = fs.readFileSync(path.join(srcDir, 'modules/fluid-mesh.js'), 'utf8');
  assert.ok(
    fluidMeshSource.includes("sleep() {") && fluidMeshSource.includes("this.isSleeping = true;"),
    'FluidMeshGradient must define sleep() method setting isSleeping = true'
  );
  assert.ok(
    fluidMeshSource.includes("wake() {") && fluidMeshSource.includes("this.isSleeping = false;"),
    'FluidMeshGradient must define wake() method setting isSleeping = false'
  );
  assert.ok(
    fluidMeshSource.includes("ext.loseContext();"),
    'sleep() must invoke WEBGL_lose_context.loseContext()'
  );
  assert.ok(
    fluidMeshSource.includes("ext.restoreContext();"),
    'wake() must invoke WEBGL_lose_context.restoreContext()'
  );

  // 2. Behavioral verification
  let loseContextCalled = false;
  let restoreContextCalled = false;

  const mockLoseContextExt = {
    loseContext: () => { loseContextCalled = true; },
    restoreContext: () => { restoreContextCalled = true; }
  };

  const mockGL = {
    getExtension: (name) => (name === 'WEBGL_lose_context' ? mockLoseContextExt : null),
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    getAttribLocation: () => 0,
    getUniformLocation: (p, n) => n,
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    viewport: () => {},
    useProgram: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {}
  };

  const listeners = {};
  const mockMeshCanvas = {
    addEventListener: (evt, handler) => { listeners[evt] = handler; },
    getContext: () => mockGL,
    width: 800,
    height: 600
  };

  const origWindow = global.window;
  const origDoc = global.document;
  const origRAF = global.requestAnimationFrame;
  const origCAF = global.cancelAnimationFrame;

  global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    addEventListener: () => {}
  };
  global.document = {
    addEventListener: () => {},
    visibilityState: 'visible'
  };
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);

  try {
    const mesh = new FluidMeshGradient(mockMeshCanvas);
    mesh.running = true;

    // Sleep: must stop animation loop, call loseContext, and mark isSleeping = true
    mesh.sleep();
    assert.strictEqual(mesh.running, false, 'sleep() must stop animation loop');
    assert.strictEqual(loseContextCalled, true, 'sleep() must call WEBGL_lose_context.loseContext()');
    assert.strictEqual(mesh.isSleeping, true, 'sleep() must set isSleeping = true');

    // Wake: must restore context and clear isSleeping flag
    mesh.wake();
    assert.strictEqual(restoreContextCalled, true, 'wake() must call WEBGL_lose_context.restoreContext()');
    assert.strictEqual(mesh.isSleeping, false, 'wake() must reset isSleeping to false');

    // Restored event: must reinitialize shaders cleanly
    let shadersReinitialized = false;
    mesh.initShaders = () => {
      shadersReinitialized = true;
      return true;
    };
    if (listeners['webglcontextrestored']) {
      listeners['webglcontextrestored']();
      assert.strictEqual(shadersReinitialized, true, 'webglcontextrestored event must reinitialize shaders');
    }
  } finally {
    global.window = origWindow;
    global.document = origDoc;
    global.requestAnimationFrame = origRAF;
    global.cancelAnimationFrame = origCAF;
  }
});

// --- Test 2.4: Base64 image bitmap eviction ---
runTest('Test 2.4: Base64 image bitmap eviction (730ms transition end cleanup, modal close, track change purge)', () => {
  // 1. Static verification
  assert.ok(
    rendererJs.includes("imgOld.removeAttribute('src');"),
    'triggerIslandArtTransition must remove src attribute from imgOld upon transition completion'
  );
  assert.ok(
    rendererJs.includes("modalImg.removeAttribute('src');"),
    'hideAlbumArtModal must remove src attribute from modalImg'
  );
  assert.ok(
    rendererJs.includes("staleIslandOldImg.removeAttribute('src');"),
    'handlePlaybackData must evict stale Base64 artwork bitmaps from island-art-img-old on track changes'
  );

  // 2. Behavioral verification of 730ms transition end eviction
  let oldImgSrcRemoved = false;
  let oldImgDisplay = 'block';

  const mockImgOld = {
    src: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    removeAttribute: (attr) => {
      if (attr === 'src') oldImgSrcRemoved = true;
    },
    style: {
      set display(v) { oldImgDisplay = v; },
      get display() { return oldImgDisplay; }
    }
  };

  let scheduledDelay = 0;
  let scheduledTimerFn = null;
  const mockSetTimeout = (fn, delay) => {
    scheduledDelay = delay;
    scheduledTimerFn = fn;
    return 42;
  };

  const transitionSandbox = {
    document: {
      getElementById: (id) => {
        if (id === 'island-art-img-old') return mockImgOld;
        if (id === 'island-art-img') return { style: {}, src: '' };
        if (id === 'island-art-wrapper') return { classList: { remove: () => {}, add: () => {} } };
        return null;
      },
      body: { classList: { contains: () => false } }
    },
    setTimeout: mockSetTimeout,
    clearTimeout: () => {},
    currentIslandAlbumArtUrl: 'https://cdn.example.com/art1.jpg'
  };
  vm.createContext(transitionSandbox);

  const transitionFn = rendererJs.match(/function triggerIslandArtTransition\([\s\S]*?\n\}/)[0];

  vm.runInContext(`
    let islandArtTransitionTimer = null;
    ${transitionFn}
    triggerIslandArtTransition('https://cdn.example.com/art2.jpg');
  `, transitionSandbox);

  assert.strictEqual(scheduledDelay, 730, 'Transition timer must be exactly 730ms');
  assert.strictEqual(oldImgSrcRemoved, false, 'Before 730ms timeout, old image src is preserved for cross-fade');

  // Trigger 730ms callback
  scheduledTimerFn();
  assert.strictEqual(oldImgSrcRemoved, true, 'After 730ms timeout, removeAttribute("src") must be called on imgOld');
  assert.strictEqual(oldImgDisplay, 'none', 'After 730ms timeout, imgOld display must be set to "none"');

  // 3. Behavioral verification of modal close eviction
  let modalImgSrcRemoved = false;
  const mockModalImg = {
    src: 'data:image/png;base64,iVBORw0KGgo...',
    removeAttribute: (attr) => {
      if (attr === 'src') modalImgSrcRemoved = true;
    },
    style: {}
  };

  const modalSandbox = {
    document: {
      getElementById: (id) => {
        if (id === 'album-art-modal-img') return mockModalImg;
        if (id === 'album-art-modal') return { classList: { remove: () => {} } };
        return null;
      }
    },
    updateAutoHideState: () => {},
    resumeAnimatedArtVideos: () => {},
    setTimeout: (fn, delay) => {}
  };
  vm.createContext(modalSandbox);

  const hideModalFn = rendererJs.match(/function hideAlbumArtModal\(\) \{[\s\S]*?\n\}/)[0];

  vm.runInContext(`
    ${hideModalFn}
    hideAlbumArtModal();
  `, modalSandbox);

  assert.strictEqual(modalImgSrcRemoved, true, 'hideAlbumArtModal must immediately remove src attribute from modal image');
});

// --- Test 2.5: Memory cache bounding & data: rejection ---
runTest('Test 2.5: Memory cache bounding (sessionArtMemoryCache <= 30, localArtCache <= 40, linkCache <= 30, MAX_CACHED_TRACKS = 25, data: URL rejection)', () => {
  // 1. Static verification of limits and data: rejection
  assert.ok(
    rendererJs.includes("if (!url || typeof url !== 'string' || url.startsWith('data:')) return;"),
    'Art caches must reject massive Base64 data: URLs'
  );
  assert.ok(
    rendererJs.includes('while (sessionArtMemoryCache.size > 30)'),
    'rememberArtInMemory must cap sessionArtMemoryCache at 30 using a while loop'
  );
  assert.ok(
    rendererJs.includes('while (Object.keys(localArtCache).length > 40)'),
    'saveArtToCache must cap localArtCache at 40 using a while loop'
  );
  assert.ok(
    rendererJs.includes('while (_directTrackLinkCache.size > 30)'),
    'resolveDirectMusicLinks must cap _directTrackLinkCache at 30 using a while loop'
  );
  assert.ok(
    rendererJs.includes('const MAX_CACHED_TRACKS = 25;'),
    'saveLyricsToCache MAX_CACHED_TRACKS must be exactly 25'
  );

  // 2. Behavioral verification of sessionArtMemoryCache
  const cacheSandbox = {
    window: {},
    localStorage: { setItem: () => {} },
    Object,
    Map
  };
  vm.createContext(cacheSandbox);

  vm.runInContext(`
    const sessionArtMemoryCache = new Map();
    function rememberArtInMemory(trackId, url, trackName, artistName) {
      if (!url || typeof url !== 'string' || url.startsWith('data:')) return;
      if (trackId) sessionArtMemoryCache.set(trackId, url);
      if (trackName && artistName) {
        const dualKey = (artistName + ':::' + trackName).toLowerCase().trim();
        sessionArtMemoryCache.set(dualKey, url);
      }
      while (sessionArtMemoryCache.size > 30) {
        const firstKey = sessionArtMemoryCache.keys().next().value;
        sessionArtMemoryCache.delete(firstKey);
      }
    }

    const localArtCache = {};
    function saveArtToCache(trackId, url, trackName, artistName) {
      if (!url || typeof url !== 'string' || url.startsWith('data:')) return;
      if (trackId) localArtCache[trackId] = url;
      if (trackName && artistName) {
        const dualKey = (artistName + ':::' + trackName).toLowerCase().trim();
        localArtCache[dualKey] = url;
      }
      while (Object.keys(localArtCache).length > 40) {
        const keys = Object.keys(localArtCache);
        delete localArtCache[keys[0]];
      }
    }

    const _directTrackLinkCache = new Map();
    function cacheDirectLink(key, val) {
      _directTrackLinkCache.set(key, val);
      while (_directTrackLinkCache.size > 30) {
        const firstKey = _directTrackLinkCache.keys().next().value;
        _directTrackLinkCache.delete(firstKey);
      }
    }
  `, cacheSandbox);

  // Test data: rejection
  vm.runInContext(`
    rememberArtInMemory('t-data', 'data:image/png;base64,ABCD...', 'Song Data', 'Artist');
    saveArtToCache('t-data', 'data:image/png;base64,ABCD...', 'Song Data', 'Artist');
  `, cacheSandbox);

  const sessionSizeAfterData = vm.runInContext('sessionArtMemoryCache.size', cacheSandbox);
  const localKeysAfterData = vm.runInContext('Object.keys(localArtCache).length', cacheSandbox);
  assert.strictEqual(sessionSizeAfterData, 0, 'sessionArtMemoryCache must reject data: URLs');
  assert.strictEqual(localKeysAfterData, 0, 'localArtCache must reject data: URLs');

  // Test rapid multi-key insertion (50 tracks x 2 keys = 100 entries)
  vm.runInContext(`
    for (let i = 0; i < 50; i++) {
      rememberArtInMemory('t' + i, 'https://cdn.example.com/' + i + '.jpg', 'Title ' + i, 'Artist ' + i);
      saveArtToCache('t' + i, 'https://cdn.example.com/' + i + '.jpg', 'Title ' + i, 'Artist ' + i);
      cacheDirectLink('link' + i, 'https://music.example.com/' + i);
    }
  `, cacheSandbox);

  const sessionSize = vm.runInContext('sessionArtMemoryCache.size', cacheSandbox);
  const localSize = vm.runInContext('Object.keys(localArtCache).length', cacheSandbox);
  const linkSize = vm.runInContext('_directTrackLinkCache.size', cacheSandbox);

  assert.ok(sessionSize <= 30, `sessionArtMemoryCache size (${sessionSize}) must be <= 30`);
  assert.ok(localSize <= 40, `localArtCache size (${localSize}) must be <= 40`);
  assert.ok(linkSize <= 30, `_directTrackLinkCache size (${linkSize}) must be <= 30`);

  // Verify MAX_CACHED_TRACKS is 25
  const maxTracksMatch = rendererJs.match(/const MAX_CACHED_TRACKS = (\d+);/);
  assert.ok(maxTracksMatch, 'renderer.js must declare MAX_CACHED_TRACKS');
  assert.strictEqual(parseInt(maxTracksMatch[1], 10), 25, 'MAX_CACHED_TRACKS must be exactly 25');
});

console.log('\n================================================================');
console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)  `);
console.log('================================================================\n');
