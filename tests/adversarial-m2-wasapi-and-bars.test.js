/**
 * tests/adversarial-m2-wasapi-and-bars.test.js
 * Adversarial Empirical Verification & Stress Test Harness for Milestone M2:
 * 
 * Feature 7: Normal Layout WASAPI Loopback Gating & Instrumental Break Lifecycle
 *   - WASAPI loopback audio capture gated off (false) when visualizers are unmounted or resting.
 *   - Settle to .is-resting dispatches setAudioVisualizerActive(false).
 *   - Instrumental solo stage entrance instantly awakens WASAPI loopback (true).
 *   - 100 rapid cycles (200 transitions) between singing and instrumental passages.
 *   - Visibility and pause state gating during active solo stage.
 *   - Split View vs Normal View consumer deduplication.
 * 
 * Feature 8: Visualizer Bar DOM Thrashing Elimination & Frame Simulation
 *   - 500-frame 60 Hz audio spectrum simulation.
 *   - DOM caching: querySelectorAll called exactly once and cached on visContainer._cachedVisBars.
 *   - Disconnection handling: re-query only when elements are disconnected (!dBars[0].isConnected).
 *   - 0.012 delta deadband: 100% suppression of sub-threshold transform writes over 500 frames.
 *   - Boundary snap: forced snap to scaleY(0.180) when clamped is 0.18 even if delta < 0.012.
 *   - Resting visualizer gating: exactly 0 style mutations during 500 quiet frames (< 0.015 energy).
 *   - Hidden container gating: exactly 0 style mutations when offsetParent === null or display === 'none'.
 *   - Concurrent multi-container isolation across player bar and studio sidebar equalizers.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const rendererPath = path.join(rootDir, 'src', 'renderer.js');
const rendererJs = fs.readFileSync(rendererPath, 'utf8');

// Extract verbatim implementations from src/renderer.js
const syncMatch = rendererJs.match(/let _currentAudioVisualizerActiveState = null;[\s\S]*?function syncAudioVisualizerState\(\) \{[\s\S]*?\n\}/);
assert.ok(syncMatch, 'Must locate syncAudioVisualizerState in src/renderer.js');

const fallbackMatch = rendererJs.match(/function checkVisualizerFallback\(\) \{[\s\S]*?\n\}/);
assert.ok(fallbackMatch, 'Must locate checkVisualizerFallback in src/renderer.js');

const desktopEqMatch = rendererJs.match(/\/\/ 4\. Desktop Live Equalizer[\s\S]*?\[desktopLive, studioLive\]\.forEach[\s\S]*?\}\);\s*\}\s*\}/);
assert.ok(desktopEqMatch, 'Must locate desktop live equalizer block in src/renderer.js');

console.log('\n================================================================');
console.log('  MILESTONE M2: EMPIRICAL ADVERSARIAL STRESS TEST SUITE         ');
console.log('  Target: Feature 7 (WASAPI Gating) & Feature 8 (Visualizer Bars)');
console.log('================================================================\n');

// Helper to create mock DOM elements
function createMockElement(id, initialClasses = [], display = 'inline-flex') {
  const classSet = new Set(initialClasses);
  let transformValue = '';
  let transformWriteCount = 0;

  const el = {
    id,
    classList: {
      contains: (cls) => classSet.has(cls),
      add: (cls) => classSet.add(cls),
      remove: (cls) => classSet.delete(cls),
      toggle: (cls, force) => {
        if (force !== undefined) {
          if (force) classSet.add(cls); else classSet.delete(cls);
          return force;
        }
        if (classSet.has(cls)) { classSet.delete(cls); return false; }
        classSet.add(cls); return true;
      }
    },
    style: {
      display,
      get transform() { return transformValue; },
      set transform(val) {
        transformValue = val;
        transformWriteCount++;
      }
    },
    offsetParent: {}, // default visible
    getTransformWriteCount: () => transformWriteCount,
    resetTransformWriteCount: () => { transformWriteCount = 0; }
  };
  return el;
}

// -----------------------------------------------------------------------------
// PART 1: FEATURE 7 STRESS TESTING (WASAPI Loopback Gating & Transitions)
// -----------------------------------------------------------------------------
console.log('--- PART 1: Feature 7 Stress Testing (WASAPI Loopback Gating) ---');

function createFeature7Sandbox(initialOptions = {}) {
  const isSoloActive = Boolean(initialOptions.soloStageActive);
  const state = {
    ipcCalls: [],
    soloStage: initialOptions.hasSoloStage ? createMockElement('instrumental-solo-stage', isSoloActive ? ['active'] : [], isSoloActive ? 'flex' : 'none') : null,
    playerLive: initialOptions.hasPlayerLive ? createMockElement('player-live-visualizer', initialOptions.playerLiveResting ? ['is-resting'] : [], 'inline-flex') : null,
    studioLive: initialOptions.hasStudioLive ? createMockElement('studio-badge-live', initialOptions.studioLiveResting ? ['is-resting'] : [], 'inline-flex') : null,
    isSplitLayout: Boolean(initialOptions.isSplitLayout),
    isPlaying: initialOptions.isPlaying !== undefined ? initialOptions.isPlaying : true,
    isDynamicIslandMode: Boolean(initialOptions.isDynamicIslandMode),
    isIslandSleeping: Boolean(initialOptions.isIslandSleeping),
    visibilityState: initialOptions.visibilityState || 'visible',
    settings: {
      wallpaperMode: Boolean(initialOptions.wallpaperMode),
      wallpaperBeatBloom: initialOptions.wallpaperBeatBloom !== undefined ? initialOptions.wallpaperBeatBloom : true
    },
    isWallpaperDesktopFocused: initialOptions.isWallpaperDesktopFocused !== undefined ? initialOptions.isWallpaperDesktopFocused : true,
    djEngine: initialOptions.djEngine || null
  };

  const sandbox = {
    get isDynamicIslandMode() { return state.isDynamicIslandMode; },
    set isDynamicIslandMode(v) { state.isDynamicIslandMode = v; },
    get isIslandSleeping() { return state.isIslandSleeping; },
    set isIslandSleeping(v) { state.isIslandSleeping = v; },
    settings: state.settings,
    get isWallpaperDesktopFocused() { return state.isWallpaperDesktopFocused; },
    set isWallpaperDesktopFocused(v) { state.isWallpaperDesktopFocused = v; },
    get isPlaying() { return state.isPlaying; },
    set isPlaying(v) { state.isPlaying = v; },
    get djEngine() { return state.djEngine; },
    set djEngine(v) { state.djEngine = v; },
    document: {
      get visibilityState() { return state.visibilityState; },
      body: {
        classList: {
          contains: (cls) => {
            if (cls === 'layout-split') return state.isSplitLayout;
            if (cls === 'is-playing') return state.isPlaying;
            return false;
          }
        }
      },
      getElementById: (id) => {
        if (id === 'instrumental-solo-stage') return state.soloStage;
        if (id === 'player-live-visualizer') return state.playerLive;
        if (id === 'studio-badge-live') return state.studioLive;
        return null;
      }
    },
    window: {
      electronAPI: {
        setAudioVisualizerActive: (active) => {
          state.ipcCalls.push({ active, timestamp: Date.now() });
        }
      },
      get djEngine() { return state.djEngine; }
    },
    _currentAudioVisualizerActiveState: null,
    visualizerFallbackInterval: null,
    visualizerSilenceTimeout: null,
    ensureVisualizerFallbackWatchdog: () => {},
    // Expose control to test
    _state: state
  };

  vm.createContext(sandbox);
  vm.runInContext(`
    ${syncMatch[0]}
    this.syncAudioVisualizerState = syncAudioVisualizerState;
    this.getCurrentState = () => _currentAudioVisualizerActiveState;
    this.setCurrentState = (val) => { _currentAudioVisualizerActiveState = val; };
  `, sandbox);

  return sandbox;
}

// 1.1 Normal Desktop Mode singing without active visualizers dispatches false
{
  const sb = createFeature7Sandbox({
    hasSoloStage: true,
    soloStageActive: false,
    hasPlayerLive: false,
    hasStudioLive: false,
    isPlaying: true
  });
  sb.syncAudioVisualizerState();
  assert.strictEqual(sb.getCurrentState(), false, 'Normal layout with no active visualizer must set state to false');
  assert.strictEqual(sb._state.ipcCalls.length, 1, 'Expected exactly 1 IPC call');
  assert.strictEqual(sb._state.ipcCalls[0].active, false, 'Expected setAudioVisualizerActive(false)');
  console.log('  ✓ 1.1: Normal Desktop mode gates WASAPI audio capture to false during vocal playback');
}

// 1.2 Settling to .is-resting dispatches setAudioVisualizerActive(false)
{
  const sb = createFeature7Sandbox({
    hasSoloStage: true,
    soloStageActive: false,
    hasPlayerLive: true,
    playerLiveResting: false,
    isPlaying: true
  });
  // Initially player-live-visualizer is not resting -> WASAPI active
  sb.syncAudioVisualizerState();
  assert.strictEqual(sb.getCurrentState(), true, 'Active player visualizer must activate WASAPI');
  assert.strictEqual(sb._state.ipcCalls[0].active, true, 'Dispatched true');

  // Settle player visualizer to .is-resting
  sb._state.playerLive.classList.add('is-resting');
  sb.syncAudioVisualizerState();
  assert.strictEqual(sb.getCurrentState(), false, 'Resting player visualizer must deactivate WASAPI');
  assert.strictEqual(sb._state.ipcCalls[1].active, false, 'Dispatched false upon settling');
  console.log('  ✓ 1.2: Visualizer settling to .is-resting cleanly triggers setAudioVisualizerActive(false)');
}

// 1.3 Instrumental Break Entrance triggers setAudioVisualizerActive(true) immediately
{
  const sb = createFeature7Sandbox({
    hasSoloStage: true,
    soloStageActive: false,
    hasPlayerLive: true,
    playerLiveResting: true, // player live is resting
    isPlaying: true
  });
  sb.syncAudioVisualizerState();
  assert.strictEqual(sb.getCurrentState(), false, 'Initially resting and inactive');

  // Break starts: soloStage becomes active
  sb._state.soloStage.classList.add('active');
  sb.syncAudioVisualizerState();
  assert.strictEqual(sb.getCurrentState(), true, 'Solo stage entrance must awaken WASAPI capture');
  assert.strictEqual(sb._state.ipcCalls.slice(-1)[0].active, true, 'Immediate dispatch of true');

  // Break ends: soloStage becomes inactive
  sb._state.soloStage.classList.remove('active');
  sb.syncAudioVisualizerState();
  assert.strictEqual(sb.getCurrentState(), false, 'Solo stage exit must immediately gate WASAPI capture');
  assert.strictEqual(sb._state.ipcCalls.slice(-1)[0].active, false, 'Immediate dispatch of false');
  console.log('  ✓ 1.3: Instrumental break entrance and exit awaken and gate WASAPI capture immediately');
}

// 1.4 Stress Test: 100 rapid transitions between singing and instrumental passages
{
  const sb = createFeature7Sandbox({
    hasSoloStage: true,
    soloStageActive: false,
    hasPlayerLive: true,
    playerLiveResting: true, // rests during singing
    isPlaying: true
  });
  sb.syncAudioVisualizerState();
  sb._state.ipcCalls = []; // reset log

  const CYCLES = 100;
  for (let i = 0; i < CYCLES; i++) {
    // 1. Enter instrumental break
    sb._state.soloStage.classList.add('active');
    sb.syncAudioVisualizerState();
    assert.strictEqual(sb.getCurrentState(), true, `Cycle ${i}: Must be active during break`);

    // Redundant syncAudioVisualizerState call mid-break should NOT emit duplicate IPC
    sb.syncAudioVisualizerState();

    // 2. Exit instrumental break (return to vocal)
    sb._state.soloStage.classList.remove('active');
    sb.syncAudioVisualizerState();
    assert.strictEqual(sb.getCurrentState(), false, `Cycle ${i}: Must be inactive during vocal`);

    // Redundant syncAudioVisualizerState call during vocal should NOT emit duplicate IPC
    sb.syncAudioVisualizerState();
  }

  // Exactly CYCLES * 2 IPC dispatches (alternating true and false)
  assert.strictEqual(sb._state.ipcCalls.length, CYCLES * 2, `Expected exactly ${CYCLES * 2} IPC dispatches for ${CYCLES} transitions`);
  for (let i = 0; i < sb._state.ipcCalls.length; i++) {
    const expected = (i % 2 === 0); // even = true (break entered), odd = false (break exited)
    assert.strictEqual(sb._state.ipcCalls[i].active, expected, `IPC dispatch #${i} expected ${expected}`);
  }
  console.log(`  ✓ 1.4: 100 rapid singing/break cycles (200 transitions) executed with 0 dropped states and 0 redundant IPC calls`);
}

// 1.5 Occlusion and Pause State Gating during Instrumental Break
{
  const sb = createFeature7Sandbox({
    hasSoloStage: true,
    soloStageActive: true, // in break
    isPlaying: true,
    visibilityState: 'visible'
  });
  sb.syncAudioVisualizerState();
  assert.strictEqual(sb.getCurrentState(), true, 'Active in break');

  // Window hidden -> WASAPI capture suspended
  sb._state.visibilityState = 'hidden';
  sb.syncAudioVisualizerState();
  assert.strictEqual(sb.getCurrentState(), false, 'Window hidden must gate WASAPI even during solo stage');

  // Window restored -> WASAPI capture resumed
  sb._state.visibilityState = 'visible';
  sb.syncAudioVisualizerState();
  assert.strictEqual(sb.getCurrentState(), true, 'Window visible restores WASAPI capture');

  // Playback paused -> WASAPI capture suspended
  sb._state.isPlaying = false;
  sb.syncAudioVisualizerState();
  assert.strictEqual(sb.getCurrentState(), false, 'Playback pause must gate WASAPI capture');

  // Playback resumed -> WASAPI capture resumed
  sb._state.isPlaying = true;
  sb.syncAudioVisualizerState();
  assert.strictEqual(sb.getCurrentState(), true, 'Playback resume restores WASAPI capture');
  console.log('  ✓ 1.5: Window occlusion and playback pause/resume cleanly govern audio visualizer lifecycle');
}

// 1.6 Split View vs Normal View Visualizer Deduplication
{
  // Split View: studio-badge-live takes precedence, player-live-visualizer is ignored
  const sbSplit = createFeature7Sandbox({
    isSplitLayout: true,
    hasSoloStage: false,
    hasPlayerLive: true,
    playerLiveResting: false, // player live active (suppressed in split view)
    hasStudioLive: true,
    studioLiveResting: true,  // studio live is resting
    isPlaying: true
  });
  sbSplit.syncAudioVisualizerState();
  assert.strictEqual(sbSplit.getCurrentState(), false, 'In Split view with resting studio badge, player-live must NOT activate WASAPI');

  // Awaken studio badge in Split View
  sbSplit._state.studioLive.classList.remove('is-resting');
  sbSplit.syncAudioVisualizerState();
  assert.strictEqual(sbSplit.getCurrentState(), true, 'Awakened studio badge in Split View activates WASAPI');

  // Normal Layout: player-live-visualizer takes precedence, studio-badge-live is ignored
  const sbNormal = createFeature7Sandbox({
    isSplitLayout: false,
    hasSoloStage: false,
    hasPlayerLive: true,
    playerLiveResting: true,  // player live resting
    hasStudioLive: true,
    studioLiveResting: false, // studio badge has no is-resting
    isPlaying: true
  });
  sbNormal.syncAudioVisualizerState();
  assert.strictEqual(sbNormal.getCurrentState(), false, 'In Normal view with resting player visualizer, studio badge must NOT activate WASAPI');
  console.log('  ✓ 1.6: Split View and Normal Layout cleanly isolate and deduplicate visualizer consumers');
}

// -----------------------------------------------------------------------------
// PART 2: FEATURE 8 STRESS TESTING (DOM Caching, Deadband, 500-Frame Sim)
// -----------------------------------------------------------------------------
console.log('\n--- PART 2: Feature 8 Stress Testing (DOM Caching & 500-Frame Sim) ---');

function createBar(initialScale = 0.18) {
  let scale = initialScale;
  let transformStr = `scaleY(${scale.toFixed(3)})`;
  let writeCount = 0;
  return {
    isConnected: true,
    _lastScale: undefined,
    style: {
      get transform() { return transformStr; },
      set transform(val) {
        transformStr = val;
        writeCount++;
      }
    },
    getWriteCount: () => writeCount,
    resetWriteCount: () => { writeCount = 0; }
  };
}

function createVisContainer(id, numBars = 4) {
  const bars = Array.from({ length: numBars }, () => createBar(0.18));
  let querySelectorAllCount = 0;
  const classListSet = new Set(['is-resting']);

  const container = {
    id,
    classList: {
      contains: (cls) => classListSet.has(cls),
      add: (cls) => classListSet.add(cls),
      remove: (cls) => classListSet.delete(cls)
    },
    style: { display: 'inline-flex' },
    offsetParent: {}, // visible
    _cachedVisBars: null,
    querySelectorAll: (sel) => {
      querySelectorAllCount++;
      return bars;
    },
    getQueryCount: () => querySelectorAllCount,
    getBars: () => bars,
    replaceBars: (newBars) => {
      // Mark old bars as disconnected
      bars.forEach(b => { b.isConnected = false; });
      newBars.forEach(b => { b.isConnected = true; });
      container.querySelectorAll = (sel) => {
        querySelectorAllCount++;
        return newBars;
      };
    }
  };
  return container;
}

function runDesktopEqualizer(desktopLive, studioLive, bands) {
  const sandbox = {
    isDynamicIslandMode: false,
    settings: { wallpaperMode: false },
    document: {
      getElementById: (id) => {
        if (id === 'player-live-visualizer') return desktopLive;
        if (id === 'studio-badge-live') return studioLive;
        return null;
      }
    },
    bands
  };
  vm.createContext(sandbox);
  vm.runInContext(desktopEqMatch[0], sandbox);
}

// 2.1 500 Frames of Audio Spectrum at 60 Hz: querySelectorAll called exactly ONCE
{
  const desktopContainer = createVisContainer('player-live-visualizer', 4);
  const FRAMES = 500;

  for (let frame = 0; frame < FRAMES; frame++) {
    // Generate realistic fluctuating audio bands [0..1]
    const baseEnergy = 0.2 + 0.5 * Math.sin(frame * 0.05);
    const bands = [
      Math.max(0, baseEnergy + 0.1 * Math.sin(frame * 0.2)),
      Math.max(0, baseEnergy + 0.08 * Math.cos(frame * 0.15)),
      Math.max(0, baseEnergy * 0.8),
      Math.max(0, baseEnergy * 0.7),
      Math.max(0, baseEnergy * 0.6),
      Math.max(0, baseEnergy * 0.5),
      Math.max(0, baseEnergy * 0.4),
      Math.max(0, baseEnergy * 0.3)
    ];

    runDesktopEqualizer(desktopContainer, null, bands);
  }

  assert.strictEqual(desktopContainer.getQueryCount(), 1, `querySelectorAll must be called exactly 1 time across ${FRAMES} frames, got ${desktopContainer.getQueryCount()}`);
  assert.ok(desktopContainer._cachedVisBars, 'visContainer._cachedVisBars must be populated');
  assert.strictEqual(desktopContainer._cachedVisBars.length, 4, 'Cached NodeList must contain 4 bars');
  console.log(`  ✓ 2.1: 500 frames of 60 Hz audio updates called querySelectorAll exactly 1 time (cached on _cachedVisBars)`);
}

// 2.2 Cache invalidation when bar elements are disconnected (!dBars[0].isConnected)
{
  const desktopContainer = createVisContainer('player-live-visualizer', 4);
  runDesktopEqualizer(desktopContainer, null, [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  assert.strictEqual(desktopContainer.getQueryCount(), 1, 'Initial querySelectorAll call');

  // Simulate DOM re-render: replace bars with new instances, marking old as disconnected
  const newBars = Array.from({ length: 4 }, () => createBar(0.18));
  desktopContainer.replaceBars(newBars);

  // Next frame should detect !dBars[0].isConnected and re-query
  runDesktopEqualizer(desktopContainer, null, [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6]);
  assert.strictEqual(desktopContainer.getQueryCount(), 2, 'querySelectorAll must re-query when cached bars are disconnected');

  // Next 100 frames must reuse the new cache without re-querying
  for (let f = 0; f < 100; f++) {
    runDesktopEqualizer(desktopContainer, null, [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4]);
  }
  assert.strictEqual(desktopContainer.getQueryCount(), 2, 'No further querySelectorAll calls after re-caching');
  console.log('  ✓ 2.2: Re-queries DOM once on element disconnection (!isConnected) and re-caches cleanly');
}

// 2.3 0.012 Delta Deadband Sub-Threshold Jitter Suppression (500 frames)
{
  const desktopContainer = createVisContainer('player-live-visualizer', 4);
  const bars = desktopContainer.getBars();
  const FRAMES = 500;

  // Frame 0: Baseline establish with steady signal
  runDesktopEqualizer(desktopContainer, null, [0.30, 0.30, 0.30, 0.30, 0.30, 0.30, 0.30, 0.30]);
  const initialWrites = bars.reduce((sum, b) => sum + b.getWriteCount(), 0);
  assert.strictEqual(initialWrites, 4, 'Frame 0 must establish initial transforms (4 writes)');
  bars.forEach(b => b.resetWriteCount());

  // Frames 1..500: Micro-fluctuations strictly under 0.010 delta (noise / jitter)
  for (let f = 1; f < FRAMES; f++) {
    const jitter = (Math.sin(f * 1.7) * 0.005); // +/- 0.005 max variation
    const bands = [
      0.30 + jitter,
      0.30 + jitter,
      0.30 + jitter,
      0.30 + jitter,
      0.30 + jitter,
      0.30 + jitter,
      0.30 + jitter,
      0.30 + jitter
    ];
    runDesktopEqualizer(desktopContainer, null, bands);
  }

  const jitterWrites = bars.reduce((sum, b) => sum + b.getWriteCount(), 0);
  assert.strictEqual(jitterWrites, 0, `Sub-threshold jitter must trigger 0 transform writes over ${FRAMES} frames, got ${jitterWrites}`);
  console.log(`  ✓ 2.3: 0.012 delta deadband suppressed 100% of sub-threshold transform writes over 500 jittery frames (0 writes)`);
}

// 2.4 Realistic Dynamic Range 500-Frame Simulation (Write Suppression Metric)
{
  const desktopContainer = createVisContainer('player-live-visualizer', 4);
  const bars = desktopContainer.getBars();
  const FRAMES = 500;

  let totalRawCalculations = FRAMES * 4; // 2000 opportunities
  let frameUpdates = 0;

  for (let f = 0; f < FRAMES; f++) {
    // Generate realistic musical phrasing: 120 BPM quarter notes (25 frames @ 60Hz) with attack & sustain
    const noteIndex = Math.floor(f / 25);
    const notePhase = f % 25;
    const noteAmps = [
      [0.70, 0.55, 0.40, 0.30],
      [0.45, 0.65, 0.50, 0.35],
      [0.85, 0.70, 0.60, 0.45],
      [0.30, 0.40, 0.35, 0.25]
    ][noteIndex % 4];

    // During attack (0..4 frames), note rises; during sustain (5..24 frames), vibrato is under deadband
    const vibrato = Math.sin(notePhase * 0.8) * 0.003;
    const attackMult = notePhase < 5 ? (notePhase + 1) / 5 : 1.0;
    const bands = [
      noteAmps[0] * attackMult + vibrato,
      noteAmps[1] * attackMult + vibrato,
      noteAmps[2] * attackMult + vibrato,
      noteAmps[3] * attackMult + vibrato,
      noteAmps[2] * attackMult * 0.8,
      noteAmps[3] * attackMult * 0.7,
      noteAmps[0] * attackMult * 0.5,
      noteAmps[1] * attackMult * 0.4
    ];
    runDesktopEqualizer(desktopContainer, null, bands);
  }

  const actualWrites = bars.reduce((sum, b) => sum + b.getWriteCount(), 0);
  const suppressionPct = ((totalRawCalculations - actualWrites) / totalRawCalculations) * 100;

  assert.ok(actualWrites < totalRawCalculations * 0.5, `Expected > 50% write suppression, got ${suppressionPct.toFixed(1)}%`);
  console.log(`  ✓ 2.4: Dynamic audio simulation over 500 frames suppressed ${suppressionPct.toFixed(1)}% of transform writes (${actualWrites} actual vs ${totalRawCalculations} raw)`);
}

// 2.5 Clean Baseline Snap to scaleY(0.180) on Silence
{
  const desktopContainer = createVisContainer('player-live-visualizer', 4);
  const bars = desktopContainer.getBars();

  // Set bar scale artificially near baseline: 0.186 (delta = 0.006, strictly < 0.012 deadband)
  runDesktopEqualizer(desktopContainer, null, [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]);
  bars.forEach(b => {
    b._lastScale = 0.186;
    b.resetWriteCount();
  });

  // Feed dead silence (energy 0 -> clamped = 0.18)
  // Even though |0.18 - 0.186| = 0.006 < 0.012, condition (clamped === 0.18 && prevScale !== 0.18) must force the snap!
  runDesktopEqualizer(desktopContainer, null, [0, 0, 0, 0, 0, 0, 0, 0]);

  bars.forEach((b, idx) => {
    assert.strictEqual(b.getWriteCount(), 1, `Bar ${idx} must write transform on silence snap`);
    assert.strictEqual(b.style.transform, 'scaleY(0.180)', `Bar ${idx} must snap cleanly to scaleY(0.180)`);
    assert.strictEqual(b._lastScale, 0.18, `Bar ${idx} _lastScale must be 0.18`);
  });
  console.log('  ✓ 2.5: Zero energy cleanly snaps bars to scaleY(0.180) baseline despite sub-0.012 delta');
}

// 2.6 Resting Visualizer Gate: 500 Quiet Frames (< 0.015) Produce Exactly 0 Style Mutations
{
  const desktopContainer = createVisContainer('player-live-visualizer', 4);
  desktopContainer.classList.add('is-resting');
  const bars = desktopContainer.getBars();
  const FRAMES = 500;

  for (let f = 0; f < FRAMES; f++) {
    // Very quiet signal: maxEnergy < 0.015
    const bands = [0.005, 0.004, 0.003, 0.002, 0.001, 0.001, 0.001, 0.001];
    runDesktopEqualizer(desktopContainer, null, bands);
  }

  const writes = bars.reduce((sum, b) => sum + b.getWriteCount(), 0);
  assert.strictEqual(writes, 0, 'Resting visualizer with quiet audio must trigger 0 style mutations');
  assert.strictEqual(desktopContainer.getQueryCount(), 0, 'Resting visualizer must trigger 0 querySelectorAll calls');
  assert.ok(desktopContainer.classList.contains('is-resting'), 'Container must remain is-resting without twitching');
  console.log(`  ✓ 2.6: Resting visualizer (< 0.015 energy) triggers exactly 0 style mutations and 0 DOM queries over 500 frames`);
}

// 2.7 Hidden Visualizer Gate: offsetParent === null Produces Exactly 0 Style Mutations
{
  const desktopContainer = createVisContainer('player-live-visualizer', 4);
  desktopContainer.offsetParent = null; // element or parent is hidden (display: none in CSS)
  desktopContainer.classList.remove('is-resting');
  const bars = desktopContainer.getBars();
  const FRAMES = 500;

  for (let f = 0; f < FRAMES; f++) {
    // Loud audio
    const bands = [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9];
    runDesktopEqualizer(desktopContainer, null, bands);
  }

  const writes = bars.reduce((sum, b) => sum + b.getWriteCount(), 0);
  assert.strictEqual(writes, 0, 'Hidden visualizer (offsetParent === null) must trigger 0 style mutations');
  assert.strictEqual(desktopContainer.getQueryCount(), 0, 'Hidden visualizer must trigger 0 querySelectorAll calls');
  console.log(`  ✓ 2.7: Hidden visualizer (offsetParent === null) triggers exactly 0 style mutations over 500 frames`);
}

// 2.8 Hidden Visualizer Gate: style.display === 'none' Produces Exactly 0 Style Mutations
{
  const desktopContainer = createVisContainer('player-live-visualizer', 4);
  desktopContainer.style.display = 'none';
  desktopContainer.classList.remove('is-resting');
  const bars = desktopContainer.getBars();
  const FRAMES = 500;

  for (let f = 0; f < FRAMES; f++) {
    // Loud audio
    const bands = [0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95];
    runDesktopEqualizer(desktopContainer, null, bands);
  }

  const writes = bars.reduce((sum, b) => sum + b.getWriteCount(), 0);
  assert.strictEqual(writes, 0, 'Hidden visualizer (display: none) must trigger 0 style mutations');
  assert.strictEqual(desktopContainer.getQueryCount(), 0, 'Hidden visualizer must trigger 0 querySelectorAll calls');
  console.log(`  ✓ 2.8: Hidden visualizer (style.display === 'none') triggers exactly 0 style mutations over 500 frames`);
}

// 2.9 Concurrent Multi-Container Isolation (Player Bar + Studio Sidebar)
{
  const playerContainer = createVisContainer('player-live-visualizer', 4);
  const studioContainer = createVisContainer('studio-badge-live', 4);
  const FRAMES = 500;

  for (let f = 0; f < FRAMES; f++) {
    const bands = [0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.02];
    runDesktopEqualizer(playerContainer, studioContainer, bands);
  }

  assert.strictEqual(playerContainer.getQueryCount(), 1, 'Player container must query DOM exactly 1 time');
  assert.strictEqual(studioContainer.getQueryCount(), 1, 'Studio container must query DOM exactly 1 time');
  assert.notStrictEqual(playerContainer._cachedVisBars, studioContainer._cachedVisBars, 'Both containers must maintain distinct bar caches');
  console.log('  ✓ 2.9: Concurrent multi-container updates maintain isolated caches without DOM collision');
}

console.log('\n================================================================');
console.log('  ALL EMPIRICAL ADVERSARIAL STRESS TESTS PASSED (100% SUCCESS)  ');
console.log('================================================================\n');
