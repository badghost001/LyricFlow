/**
 * tests/challenger-m1-empirical-matrix.test.js
 * Empirical Verification Matrix & Stress Harness for Milestone 1:
 * Phase 1 CPU Optimization - R1 Visualizer Canvas & Reactive Silence Watchdog
 *
 * Specific Mission Requirements:
 * 1. Dynamic Island visualizer canvas drawing across all styles (bars, dots, wave) and bar counts (4, 6, 8).
 * 2. In Webview2/DOM environment, 0 DOM writes happen on .wave-bar elements when canvas context is available.
 * 3. Fallback mechanism when canvas context is null.
 * 4. Silence transitions: 1,000 rapid cycles of audio packet bursts and silence; reactive one-shot setTimeout cleanly created and cleared, with 0 orphaned intervals.
 * 5. Silence thresholds (260ms active playback, 350ms stopped playback).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failureDetails.push({ name, error: err.message, stack: err.stack });
  }
}

console.log('================================================================');
console.log('  CHALLENGER M1: EMPIRICAL VERIFICATION MATRIX & STRESS HARNESS ');
console.log('================================================================\n');

const rootDir = path.resolve(__dirname, '..');
const rendererPath = path.join(rootDir, 'src/renderer.js');
const rendererCode = fs.readFileSync(rendererPath, 'utf8');

// 1. Extract canvas visualizer functions
const canvasFuncsMatch = rendererCode.match(/let islandWaveCanvas = null;[\s\S]*?function setVisualizerBarCount\(count\) \{[\s\S]*?\n\}/);
assert.ok(canvasFuncsMatch, 'Extract canvas visualizer functions');
const canvasFuncsCode = canvasFuncsMatch[0];

// 2. Extract checkVisualizerFallback
const checkFallbackMatch = rendererCode.match(/function checkVisualizerFallback\(\) \{[\s\S]*?\n\}/);
assert.ok(checkFallbackMatch, 'Extract checkVisualizerFallback');
const checkFallbackCode = checkFallbackMatch[0];

// 3. Extract watchdog variables and function
const watchdogMatch = rendererCode.match(/let visualizerFallbackInterval = null;[\s\S]*?function ensureVisualizerFallbackWatchdog\(\) \{[\s\S]*?\n\}/);
assert.ok(watchdogMatch, 'Extract ensureVisualizerFallbackWatchdog');
const watchdogCode = watchdogMatch[0];

// 4. Extract onAudioSpectrum callback
const spectrumPrefix = 'window.electronAPI.onAudioSpectrum((bands) => {';
const spectrumStart = rendererCode.indexOf(spectrumPrefix);
assert.ok(spectrumStart !== -1, 'Find onAudioSpectrum');
const bodyStart = spectrumStart + spectrumPrefix.length;
const spectrumCloseMatch = rendererCode.slice(bodyStart).match(/\n  \}\);\r?\n\}/);
assert.ok(spectrumCloseMatch, 'Find onAudioSpectrum close');
const spectrumClose = bodyStart + spectrumCloseMatch.index;
const spectrumListenerBody = rendererCode.substring(bodyStart, spectrumClose);

function buildSandboxSpectrumScript() {
  return `
    ${canvasFuncsCode}
    ${watchdogCode}
    ${checkFallbackCode}
    function __runAudioSpectrum(bands) {
      ${spectrumListenerBody}
    }
    if (window && window.electronAPI && typeof window.electronAPI.onAudioSpectrum === 'function') {
      window.electronAPI.onAudioSpectrum(__runAudioSpectrum);
    }
  `;
}

function createMockCanvasContext() {
  const calls = {
    clearRect: [],
    beginPath: 0,
    arc: [],
    rect: [],
    roundRect: [],
    fill: 0,
    createLinearGradient: [],
    fills: []
  };

  const ctx = {
    fillStyle: '#000000',
    globalAlpha: 1.0,
    clearRect: (x, y, w, h) => { calls.clearRect.push({ x, y, w, h }); },
    beginPath: () => { calls.beginPath++; },
    arc: (x, y, r, startAngle, endAngle) => { calls.arc.push({ x, y, r, startAngle, endAngle }); },
    rect: (x, y, w, h) => { calls.rect.push({ x, y, w, h }); },
    roundRect: (x, y, w, h, r) => { calls.roundRect.push({ x, y, w, h, r }); },
    fill: () => {
      calls.fill++;
      calls.fills.push({ fillStyle: ctx.fillStyle, globalAlpha: ctx.globalAlpha });
    },
    createLinearGradient: (x0, y0, x1, y1) => {
      const grad = { stops: [], addColorStop: (offset, color) => { grad.stops.push({ offset, color }); } };
      calls.createLinearGradient.push({ x0, y0, x1, y1, grad });
      return grad;
    },
    getCalls: () => calls,
    reset: () => {
      calls.clearRect.length = 0;
      calls.beginPath = 0;
      calls.arc.length = 0;
      calls.rect.length = 0;
      calls.roundRect.length = 0;
      calls.fill = 0;
      calls.createLinearGradient.length = 0;
      calls.fills.length = 0;
    }
  };
  return ctx;
}

// ============================================================================
// REQUIREMENT 1: Canvas Drawing Across All Styles (bars, dots, wave) & Counts (4, 6, 8)
// ============================================================================
console.log('--- REQUIREMENT 1: Visualizer Canvas Drawing Matrix (54 Configurations) ---');

const testStyles = ['bars', 'dots', 'wave'];
const testBarCounts = [4, 6, 8];
const testStates = [
  { name: 'Active Normal', isResting: false, isGap: false, isPaused: false, isInstrumental: false, expFill: '#ffffff', expAlpha: 1.0 },
  { name: 'Resting Normal', isResting: true, isGap: false, isPaused: false, isInstrumental: false, expFill: '#ffffff', expAlpha: 0.35 },
  { name: 'Active Gap', isResting: false, isGap: true, isPaused: false, isInstrumental: false, expFill: '#38bdf8', expAlpha: 1.0 },
  { name: 'Resting Gap', isResting: true, isGap: true, isPaused: false, isInstrumental: false, expFill: '#38bdf8', expAlpha: 0.9 },
  { name: 'Paused Track', isResting: false, isGap: false, isPaused: true, isInstrumental: false, expFill: '#38bdf8', expAlpha: 0.9 },
  { name: 'Instrumental Break', isResting: false, isGap: false, isPaused: false, isInstrumental: true, expFill: '#38bdf8', expAlpha: 1.0 }
];

for (const visStyle of testStyles) {
  for (const barCount of testBarCounts) {
    for (const st of testStates) {
      test(`Req1-Canvas: Style="${visStyle}", Count=${barCount}, State="${st.name}"`, () => {
        const mockCtx = createMockCanvasContext();
        const mockCanvas = { isConnected: true, getContext: (type) => (type === '2d' ? mockCtx : null) };

        const dynamicIslandClasses = new Set();
        if (st.isPaused) dynamicIslandClasses.add('island-paused');
        if (st.isInstrumental) dynamicIslandClasses.add('island-instrumental-active');

        const islandWaveClasses = new Set();
        if (st.isGap) islandWaveClasses.add('is-lyric-gap-active');

        const sandbox = {
          settings: { islandVisualizerBars: barCount },
          document: {
            getElementById: (id) => {
              if (id === 'island-wave-canvas') return mockCanvas;
              if (id === 'dynamic-island') return { classList: { contains: (c) => dynamicIslandClasses.has(c) } };
              if (id === 'island-wave') return { classList: { contains: (c) => islandWaveClasses.has(c) } };
              return null;
            }
          },
          pushDynamicIslandBounds: () => {}
        };

        vm.runInNewContext(`
          ${canvasFuncsCode}
          this.drawIslandVisualizer = drawIslandVisualizer;
        `, sandbox);

        const values = Array.from({ length: barCount }, (_, i) => 0.2 + (i / barCount) * 0.6);
        sandbox.drawIslandVisualizer(values, visStyle, st.isResting, st.isGap);

        const calls = mockCtx.getCalls();

        // Canvas dimensions: exactly 56x18 cleared
        assert.strictEqual(calls.clearRect.length, 1, 'ClearRect called once');
        assert.deepStrictEqual(calls.clearRect[0], { x: 0, y: 0, w: 56, h: 18 });

        // Fills count matches barCount
        assert.strictEqual(calls.fills.length, barCount);
        assert.strictEqual(calls.fills[0].globalAlpha, st.expAlpha, `Alpha mismatch for ${st.name}`);

        if (visStyle === 'dots') {
          assert.strictEqual(calls.arc.length, barCount);
          assert.strictEqual(calls.fills[0].fillStyle, st.expFill);
          for (let i = 0; i < barCount; i++) {
            const dot = calls.arc[i];
            assert.ok(dot.x >= 0 && dot.x <= 56, `Dot ${i} x out of bounds`);
            assert.ok(dot.y >= 0 && dot.y <= 18, `Dot ${i} y out of bounds`);
            assert.ok(dot.r > 0, `Dot ${i} radius must be > 0`);
          }
        } else if (visStyle === 'bars') {
          assert.strictEqual(calls.roundRect.length, barCount);
          assert.strictEqual(calls.fills[0].fillStyle, st.expFill);
          for (let i = 0; i < barCount; i++) {
            const bar = calls.roundRect[i];
            assert.ok(bar.x >= 0 && bar.x + bar.w <= 56, `Bar ${i} x span out of bounds`);
            assert.ok(bar.h >= 2.1 && bar.h <= 18, `Bar ${i} height out of bounds`);
            assert.strictEqual(Math.round(bar.y + bar.h), 17, `Bar ${i} bottom anchored at y+h=17`);
          }
        } else if (visStyle === 'wave') {
          assert.strictEqual(calls.createLinearGradient.length, barCount);
          assert.strictEqual(calls.roundRect.length, barCount);
        }
      });
    }
  }
}

test('Req1-Canvas: Extreme and boundary inputs (null, undefined, empty, negative, >1.0) handled safely', () => {
  const mockCtx = createMockCanvasContext();
  const mockCanvas = { isConnected: true, getContext: () => mockCtx };
  const sandbox = {
    settings: { islandVisualizerBars: 4 },
    document: { getElementById: (id) => (id === 'island-wave-canvas' ? mockCanvas : null) }
  };
  vm.runInNewContext(`${canvasFuncsCode}\nthis.drawIslandVisualizer = drawIslandVisualizer;`, sandbox);

  const edgeCases = [
    [-100, -0.5, 0.0, 0.0001],
    [1.0, 2.5, 100.0, 1000.0],
    [],
    null,
    undefined,
    Array(8).fill(0.5)
  ];

  for (const input of edgeCases) {
    mockCtx.reset();
    assert.doesNotThrow(() => {
      sandbox.drawIslandVisualizer(input, 'bars', false, false);
      sandbox.drawIslandVisualizer(input, 'dots', false, false);
      sandbox.drawIslandVisualizer(input, 'wave', false, false);
    });
    for (const r of mockCtx.getCalls().roundRect) {
      assert.ok(Number.isFinite(r.x) && r.x >= 0 && r.x <= 56);
      assert.ok(Number.isFinite(r.y) && r.y >= 0 && r.y <= 18);
      assert.ok(Number.isFinite(r.w) && r.w > 0);
      assert.ok(Number.isFinite(r.h) && r.h >= 2.1);
    }
  }
});

// ============================================================================
// REQUIREMENT 2: 0 DOM Writes on .wave-bar Elements When Canvas Context Available
// ============================================================================
console.log('\n--- REQUIREMENT 2: Zero DOM Writes on .wave-bar When Canvas Active ---');

test('Req2-ZeroDOM: Exactly 0 DOM writes happen on .wave-bar elements over 500 active frames when canvas is available', () => {
  const mockCtx = createMockCanvasContext();
  const mockCanvas = { isConnected: true, getContext: () => mockCtx };

  let domMutationCount = 0;
  const interceptedBar = (idx) => ({
    index: idx,
    isConnected: true,
    style: new Proxy({}, {
      set: (target, prop, val) => {
        domMutationCount++;
        target[prop] = val;
        return true;
      }
    }),
    setAttribute: () => { domMutationCount++; },
    classList: { add: () => {}, remove: () => {}, contains: () => false }
  });

  const mockBars = [interceptedBar(0), interceptedBar(1), interceptedBar(2), interceptedBar(3)];
  const mockIslandWave = {
    classList: { contains: () => false, add: () => {}, remove: () => {} },
    querySelectorAll: (sel) => (sel === '.wave-bar' ? mockBars : [])
  };

  let spectrumHandler = null;

  const sandbox = {
    Date: { now: () => 100000 },
    console: { log: () => {} },
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    isPlaying: true,
    settings: { wallpaperMode: false, islandVisualizerBars: 4, islandVisualizerStyle: 'bars' },
    document: {
      body: { classList: { contains: () => true } },
      getElementById: (id) => {
        if (id === 'island-wave-canvas') return mockCanvas;
        if (id === 'island-wave') return mockIslandWave;
        return null;
      }
    },
    window: { electronAPI: { onAudioSpectrum: (fn) => { spectrumHandler = fn; } } },
    lastSpectrumBars: mockBars,
    lastAudioEnergyTimestamp: 100000,
    isVisualizerResting: false,
    hasLoggedSpectrumTelemetry: true,
    updateIslandEnergyMorph: () => {},
    updateWallpaperLyricBeatBloom: () => {},
    syncAudioVisualizerState: () => {},
    checkVisualizerFallback: () => {}
  };

  vm.runInNewContext(buildSandboxSpectrumScript(), sandbox);
  assert.ok(typeof spectrumHandler === 'function', 'onAudioSpectrum handler bound');

  for (let frame = 0; frame < 500; frame++) {
    spectrumHandler([0.4 + 0.2 * Math.sin(frame), 0.3 + 0.2 * Math.cos(frame), 0.2, 0.1]);
  }

  assert.strictEqual(
    domMutationCount,
    0,
    `VIOLATION: Expected 0 DOM mutations on .wave-bar, but detected ${domMutationCount}`
  );
  assert.strictEqual(mockCtx.getCalls().clearRect.length, 500, 'Canvas clearRect called on all 500 frames');
  assert.strictEqual(mockCtx.getCalls().roundRect.length, 500 * 4, 'Canvas roundRect drawn on all 500 frames * 4 bars');
});

// ============================================================================
// REQUIREMENT 3: Fallback Mechanism When Canvas Context is Null
// ============================================================================
console.log('\n--- REQUIREMENT 3: Seamless Fallback When Canvas Context is Null ---');

test('Req3-Fallback: In headless VM without Canvas, updates .wave-bar transform styles cleanly for bars and dots', () => {
  let fallbackWrites = 0;
  const mockBars = [0, 1, 2, 3].map(i => ({
    style: {
      set transform(val) {
        fallbackWrites++;
        this._t = val;
      },
      get transform() { return this._t; }
    }
  }));

  const mockIslandWave = {
    classList: { contains: () => false, add: () => {}, remove: () => {} },
    querySelectorAll: () => mockBars
  };

  let spectrumHandler = null;

  const sandbox = {
    Date: { now: () => 200000 },
    console: { log: () => {} },
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    isPlaying: true,
    settings: { wallpaperMode: false, islandVisualizerBars: 4, islandVisualizerStyle: 'bars' },
    document: {
      body: { classList: { contains: () => true } },
      getElementById: (id) => {
        // Return null for canvas (headless Node.js environment)
        if (id === 'island-wave-canvas') return null;
        if (id === 'island-wave') return mockIslandWave;
        return null;
      }
    },
    window: { electronAPI: { onAudioSpectrum: (fn) => { spectrumHandler = fn; } } },
    lastSpectrumBars: mockBars,
    lastAudioEnergyTimestamp: 200000,
    isVisualizerResting: false,
    hasLoggedSpectrumTelemetry: true,
    updateIslandEnergyMorph: () => {},
    updateWallpaperLyricBeatBloom: () => {},
    syncAudioVisualizerState: () => {},
    checkVisualizerFallback: () => {}
  };

  vm.runInNewContext(buildSandboxSpectrumScript(), sandbox);

  // 1. Bars mode fallback
  spectrumHandler([0.5, 0.4, 0.3, 0.2]);
  assert.strictEqual(fallbackWrites, 4);
  assert.ok(mockBars[0].style.transform.startsWith('scaleY('), 'Must set scaleY in bars mode');

  // 2. Dots mode fallback
  sandbox.settings.islandVisualizerStyle = 'dots';
  spectrumHandler([0.5, 0.4, 0.3, 0.2]);
  assert.strictEqual(fallbackWrites, 8);
  assert.ok(mockBars[0].style.transform.includes('translateY('), 'Must set translateY in dots mode');
});

// ============================================================================
// REQUIREMENT 4: Silence Transitions: 1,000 Rapid Cycles Stress Test
// ============================================================================
console.log('\n--- REQUIREMENT 4: Silence Transitions: 1,000 Rapid Cycles & Zero Orphaned Intervals ---');

test('Req4-Silence1000: 1,000 rapid cycles of audio bursts and silence maintain 0 orphaned intervals and at most 1 one-shot timeout', () => {
  let virtualTime = 500000;
  const activeTimeouts = new Map();
  let nextTimerId = 1;
  let maxConcurrentTimeouts = 0;
  let intervalCount = 0;

  const mockSetTimeout = (fn, delay) => {
    const id = nextTimerId++;
    activeTimeouts.set(id, { fn, triggerTime: virtualTime + delay });
    if (activeTimeouts.size > maxConcurrentTimeouts) {
      maxConcurrentTimeouts = activeTimeouts.size;
    }
    return id;
  };

  const mockClearTimeout = (id) => {
    activeTimeouts.delete(id);
  };

  const mockSetInterval = () => {
    intervalCount++;
    return 999;
  };

  const mockClearInterval = () => {
    if (intervalCount > 0) intervalCount--;
  };

  const advanceTime = (ms) => {
    virtualTime += ms;
    const due = [];
    for (const [id, timer] of activeTimeouts.entries()) {
      if (timer.triggerTime <= virtualTime) due.push({ id, fn: timer.fn });
    }
    for (const d of due) {
      activeTimeouts.delete(d.id);
      d.fn();
    }
  };

  let spectrumHandler = null;

  const sandbox = {
    Date: { now: () => virtualTime },
    console: { log: () => {} },
    setTimeout: mockSetTimeout,
    clearTimeout: mockClearTimeout,
    setInterval: mockSetInterval,
    clearInterval: mockClearInterval,
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    isPlaying: true,
    settings: { wallpaperMode: false, islandVisualizerBars: 4, islandVisualizerStyle: 'bars' },
    document: {
      body: { classList: { contains: () => true } },
      getElementById: (id) => {
        if (id === 'island-wave-canvas') return { isConnected: true, getContext: () => createMockCanvasContext() };
        if (id === 'island-wave') return { classList: { contains: () => false, add: () => {}, remove: () => {} }, querySelectorAll: () => [] };
        return null;
      }
    },
    window: { electronAPI: { onAudioSpectrum: (fn) => { spectrumHandler = fn; } } },
    lastSpectrumBars: [],
    lastAudioEnergyTimestamp: virtualTime,
    isVisualizerResting: false,
    hasLoggedSpectrumTelemetry: true,
    updateIslandEnergyMorph: () => {},
    updateWallpaperLyricBeatBloom: () => {},
    syncAudioVisualizerState: () => {}
  };

  vm.runInNewContext(buildSandboxSpectrumScript(), sandbox);

  for (let cycle = 0; cycle < 1000; cycle++) {
    // 1. Audio burst
    const burstFrames = 2 + (cycle % 4);
    for (let b = 0; b < burstFrames; b++) {
      advanceTime(16);
      spectrumHandler([0.35, 0.28, 0.15, 0.08]);
    }
    // Non-zero energy must have immediately cleared pending silence timeout
    assert.strictEqual(activeTimeouts.size, 0, `Pending timeout must be 0 after burst at cycle ${cycle}`);

    // 2. Silence
    const silentFrames = (cycle % 7 === 0) ? 25 : 2;
    for (let s = 0; s < silentFrames; s++) {
      advanceTime(16);
      spectrumHandler([0.001, 0.0, 0.0, 0.0]); // below 0.002 noise floor
    }
    assert.ok(activeTimeouts.size <= 1, `Cycle ${cycle}: At most 1 one-shot timeout scheduled`);

    if (silentFrames >= 20) {
      // 25 * 16ms = 400ms > 260ms active threshold: timer must have fired and cleared
      assert.strictEqual(activeTimeouts.size, 0, `Cycle ${cycle}: Silence timeout must have executed`);
    }
  }

  assert.strictEqual(intervalCount, 0, 'Zero setInterval intervals created (no 140ms polling interval)');
  assert.ok(maxConcurrentTimeouts <= 1, `Max concurrent timeouts was ${maxConcurrentTimeouts}`);
  console.log(`    ✓ 1,000 cycles completed: 0 orphaned intervals, max concurrent timeouts = ${maxConcurrentTimeouts}`);
});

// ============================================================================
// REQUIREMENT 5: Silence Thresholds: Exact Millisecond Boundary Oracles
// ============================================================================
console.log('\n--- REQUIREMENT 5: Silence Thresholds (260ms Active, 350ms Stopped) ---');

function createThresholdHarness(isPlayingState) {
  let virtualTime = 1000000;
  const timers = [];
  let isResting = false;

  const mockIslandWave = {
    classList: {
      contains: (c) => (c === 'is-resting' ? isResting : false),
      add: (c) => { if (c === 'is-resting') isResting = true; },
      remove: (c) => { if (c === 'is-resting') isResting = false; }
    },
    querySelectorAll: () => []
  };

  let spectrumHandler = null;

  const sandbox = {
    Date: { now: () => virtualTime },
    console: { log: () => {} },
    setTimeout: (fn, delay) => {
      const t = { fn, due: virtualTime + delay, active: true };
      timers.push(t);
      return t;
    },
    clearTimeout: (t) => { if (t) t.active = false; },
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    isPlaying: isPlayingState,
    settings: { wallpaperMode: false, islandVisualizerBars: 4, islandVisualizerStyle: 'bars' },
    document: {
      body: { classList: { contains: () => isPlayingState } },
      getElementById: (id) => {
        if (id === 'island-wave-canvas') return { isConnected: true, getContext: () => createMockCanvasContext() };
        if (id === 'island-wave') return mockIslandWave;
        return null;
      }
    },
    window: { electronAPI: { onAudioSpectrum: (fn) => { spectrumHandler = fn; } } },
    lastSpectrumBars: [],
    lastAudioEnergyTimestamp: virtualTime,
    isVisualizerResting: false,
    hasLoggedSpectrumTelemetry: true,
    updateIslandEnergyMorph: () => {},
    updateWallpaperLyricBeatBloom: () => {},
    syncAudioVisualizerState: () => {}
  };

  vm.runInNewContext(buildSandboxSpectrumScript(), sandbox);

  return {
    advanceTo: (t) => {
      virtualTime = t;
      timers.forEach(tm => {
        if (tm.active && tm.due <= virtualTime) {
          tm.active = false;
          tm.fn();
        }
      });
    },
    sendSpectrum: (bands) => spectrumHandler(bands),
    isResting: () => isResting,
    getTime: () => virtualTime
  };
}

test('Req5-Threshold: Active playback uses 260ms threshold (settles at 261ms, not at 259ms)', () => {
  const env = createThresholdHarness(true); // isPlaying = true
  const t0 = env.getTime();

  env.sendSpectrum([0.4, 0.3, 0.2, 0.1]); // energy at t0
  assert.strictEqual(env.isResting(), false);

  env.advanceTo(t0 + 100);
  env.sendSpectrum([0.0, 0.0, 0.0, 0.0]);
  assert.strictEqual(env.isResting(), false, 'Must not rest at 100ms silence');

  env.advanceTo(t0 + 259);
  env.sendSpectrum([0.0, 0.0, 0.0, 0.0]);
  assert.strictEqual(env.isResting(), false, 'Must not rest at 259ms silence (< 260ms)');

  env.advanceTo(t0 + 261);
  assert.strictEqual(env.isResting(), true, 'Must settle to resting baseline at 261ms (> 260ms)');
});

test('Req5-Threshold: Stopped/paused playback uses 350ms threshold (settles at 351ms, not at 260ms)', () => {
  const env = createThresholdHarness(false); // isPlaying = false
  const t0 = env.getTime();

  env.sendSpectrum([0.4, 0.3, 0.2, 0.1]); // energy at t0
  assert.strictEqual(env.isResting(), false);

  env.advanceTo(t0 + 260);
  env.sendSpectrum([0.0, 0.0, 0.0, 0.0]);
  assert.strictEqual(env.isResting(), false, 'Must NOT rest at 260ms when stopped (threshold is 350ms)');

  env.advanceTo(t0 + 349);
  env.sendSpectrum([0.0, 0.0, 0.0, 0.0]);
  assert.strictEqual(env.isResting(), false, 'Must not rest at 349ms silence (< 350ms)');

  env.advanceTo(t0 + 351);
  env.sendSpectrum([0.0, 0.0, 0.0, 0.0]);
  assert.strictEqual(env.isResting(), true, 'Must settle to resting baseline at 351ms (> 350ms)');
});

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n================================================================');
console.log(`  MATRIX RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('================================================================\n');

if (failedTests > 0) {
  console.error(`FAILURE SUMMARY (${failedTests} tests failed):`);
  failureDetails.forEach(f => {
    console.error(`  ✗ ${f.name}: ${f.error}`);
  });
  process.exit(1);
} else {
  console.log('  GATE VERDICT: APPROVE (ALL 5 EMPIRICAL REQUIREMENTS 100% SATISFIED)\n');
  process.exit(0);
}
