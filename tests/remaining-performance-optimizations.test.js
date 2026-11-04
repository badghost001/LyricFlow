/**
 * tests/remaining-performance-optimizations.test.js
 * Verification suite for the three remaining performance optimizations:
 *   1. Logging and IPC warning cleanup (Tauri bridge callback filtering & multiplexing, Rust async logging)
 *   2. Wallpaper Beat-Bloom Deadband and Hysteresis
 *   3. Consumer-Aware Audio Visualizer IPC Gating
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const rendererCode = fs.readFileSync(path.join(rootDir, 'src/renderer.js'), 'utf8');
const bridgeCode = fs.readFileSync(path.join(rootDir, 'src/tauri-bridge.js'), 'utf8');
const libRsCode = fs.readFileSync(path.join(rootDir, 'src-tauri/src/lib.rs'), 'utf8');

console.log('\n================================================================');
console.log('  RUNNING REMAINING PERFORMANCE OPTIMIZATIONS VERIFICATION SUITE  ');
console.log('================================================================\n');

// ============================================================================
// SUITE 1: Logging and IPC Warning Cleanup
// ============================================================================
console.log('--- Suite 1: Logging and IPC Warning Cleanup ---');

// 1.1 Tauri bridge callback filtering in console.warn, console.error, error handlers
assert.ok(
  bridgeCode.includes('if (typeof msg === \'string\' && msg.includes("Couldn\'t find callback id"))'),
  'console.warn must narrowly drop benign "Couldn\'t find callback id" messages'
);
assert.ok(
  bridgeCode.includes('if (msg.includes("Couldn\'t find callback id") || msg.includes("log_debug") || msg.includes("[Tauri Bridge] invoke(\'log_debug\')")) return;'),
  'queueLog must filter callback id warnings and prevent circular echo logging'
);
console.log('  ✓ 1.1: Stale callback ID warnings filtered and circular logging prevented in tauri-bridge.js');

// 1.2 Listener multiplexing and unlisten support in safeListen
assert.ok(
  bridgeCode.includes('const eventCallbacks = new Map();'),
  'tauri-bridge.js must declare eventCallbacks registry for multi-subscriber multiplexing'
);
assert.ok(
  bridgeCode.includes('cbs.delete(callback);'),
  'safeListen must return an unlistener that cleanly removes the registered callback'
);
console.log('  ✓ 1.2: Event listener multiplexing and unlisten lifecycle verified in safeListen');

// 1.3 Asynchronous buffered logging worker in Rust
assert.ok(
  libRsCode.includes('static LOG_FILE: std::sync::OnceLock<Option<std::path::PathBuf>>'),
  'lib.rs must cache LOG_FILE path in OnceLock'
);
assert.ok(
  libRsCode.includes('static LOG_CHANNEL: std::sync::OnceLock<SyncSender<String>>'),
  'lib.rs must define asynchronous channel for non-blocking file logging'
);
assert.ok(
  libRsCode.includes('sender.try_send(msg.to_string())'),
  'log_to_file must use non-blocking try_send so callers never block on disk I/O'
);
assert.ok(
  libRsCode.includes('[LOG DEDUP] (Previous message repeated'),
  'lib.rs background logger must deduplicate consecutive identical messages'
);
console.log('  ✓ 1.3: Asynchronous buffered non-blocking logger verified in Rust backend');


// ============================================================================
// SUITE 2: Wallpaper Beat-Bloom Deadband and Hysteresis
// ============================================================================
console.log('\n--- Suite 2: Wallpaper Beat-Bloom Deadband and Hysteresis ---');

// Extract updateWallpaperLyricBeatBloom and related variables
const bloomMatch = rendererCode.match(/let lastWallpaperBloomState = false;[\s\S]*?\nfunction updateWallpaperLyricBeatBloom\(subBass\) \{[\s\S]*?\n\}/);
assert.ok(bloomMatch, 'Found updateWallpaperLyricBeatBloom in renderer.js');

function createBloomSandbox() {
  const appliedStyles = new Map();
  const classListSet = new Set();

  const mockLyricsEl = {
    style: {
      getPropertyValue: (prop) => appliedStyles.get(prop) || '',
      setProperty: (prop, val) => { appliedStyles.set(prop, String(val)); },
      removeProperty: (prop) => { appliedStyles.delete(prop); }
    }
  };

  const sandbox = {
    settings: { wallpaperMode: true, wallpaperBeatBloom: true },
    isPlaying: true,
    lastAudioEnergyTimestamp: Date.now(),
    currentProgress: 0,
    document: {
      getElementById: (id) => id === 'lyrics-container' ? mockLyricsEl : null,
      body: {
        classList: {
          add: (cls) => classListSet.add(cls),
          remove: (cls) => classListSet.delete(cls),
          contains: (cls) => classListSet.has(cls)
        }
      }
    },
    Math: Math,
    Number: Number,
    appliedStyles,
    classListSet
  };

  vm.runInNewContext(`
    ${bloomMatch[0]}
    this.updateWallpaperLyricBeatBloom = updateWallpaperLyricBeatBloom;
    this.getSmoothed = () => smoothedWallpaperBloom;
    this.getState = () => lastWallpaperBloomState;
  `, sandbox);

  return sandbox;
}

// 2.1 Ambient noise below enter threshold (0.07) does NOT activate beat-bloom
{
  const sb = createBloomSandbox();
  // Feed ambient noise hovering around 0.05 - 0.06
  for (let i = 0; i < 30; i++) {
    sb.updateWallpaperLyricBeatBloom(0.055);
  }
  assert.strictEqual(sb.getState(), false, 'Ambient energy (0.055) below enter threshold (0.07) must not trigger bloom');
  assert.strictEqual(sb.classListSet.has('has-beat-bloom'), false, 'classList must not contain has-beat-bloom');
  console.log('  ✓ 2.1: Ambient noise below 0.07 enter threshold safely ignored');
}

// 2.2 Kick transient above enter threshold (0.07) triggers bloom immediately
{
  const sb = createBloomSandbox();
  sb.updateWallpaperLyricBeatBloom(0.50); // Kick transient
  assert.strictEqual(sb.getState(), true, 'Kick transient (0.50) must trigger bloom state');
  assert.strictEqual(sb.classListSet.has('has-beat-bloom'), true, 'classList must contain has-beat-bloom');
  assert.ok(sb.appliedStyles.has('--wb-bloom-glow'), '--wb-bloom-glow must be applied');
  assert.ok(sb.appliedStyles.has('--wb-bloom-alpha'), '--wb-bloom-alpha must be applied');
  assert.ok(sb.appliedStyles.has('--wb-beat-scale'), '--wb-beat-scale must be applied');
  console.log('  ✓ 2.2: Kick transient instantly activates bloom with full CSS variables');
}

// 2.3 Schmitt trigger hysteresis: stays active between 0.045 and 0.07 until dropping below 0.045
{
  const sb = createBloomSandbox();
  // Enter bloom
  sb.updateWallpaperLyricBeatBloom(0.50);
  assert.strictEqual(sb.getState(), true);

  // Now decay into hysteresis band: sub-bass drops to 0.055 (above release 0.045, below enter 0.07)
  for (let i = 0; i < 10; i++) {
    sb.updateWallpaperLyricBeatBloom(0.055);
  }
  assert.strictEqual(sb.getState(), true, 'Bloom must remain active within hysteresis deadband (0.055 > 0.045)');
  assert.strictEqual(sb.classListSet.has('has-beat-bloom'), true);

  // Now decay to absolute silence (< 0.045)
  for (let i = 0; i < 40; i++) {
    sb.updateWallpaperLyricBeatBloom(0.0);
  }
  assert.strictEqual(sb.getState(), false, 'Bloom must cleanly deactivate when dropping below release threshold 0.045');
  assert.strictEqual(sb.classListSet.has('has-beat-bloom'), false);
  assert.strictEqual(sb.appliedStyles.size, 0, 'All CSS variables must be removed on deactivation');
  console.log('  ✓ 2.3: Schmitt trigger hysteresis eliminates chatter and deactivates cleanly below 0.045');
}

// 2.4 Numeric deadbands suppress imperceptible CSS writes
{
  const sb = createBloomSandbox();
  // Allow attack envelope to reach steady state at 0.40
  for (let i = 0; i < 25; i++) {
    sb.updateWallpaperLyricBeatBloom(0.40);
  }
  const initialGlow = sb.appliedStyles.get('--wb-bloom-glow');
  const initialAlpha = sb.appliedStyles.get('--wb-bloom-alpha');
  const initialScale = sb.appliedStyles.get('--wb-beat-scale');

  // Apply imperceptible micro-variation (< 2px glow, < 0.04 alpha, < 0.004 scale)
  sb.updateWallpaperLyricBeatBloom(0.402);
  assert.strictEqual(sb.appliedStyles.get('--wb-bloom-glow'), initialGlow, 'Glow must not write on <2px delta');
  assert.strictEqual(sb.appliedStyles.get('--wb-bloom-alpha'), initialAlpha, 'Alpha must not write on <0.04 delta');
  assert.strictEqual(sb.appliedStyles.get('--wb-beat-scale'), initialScale, 'Scale must not write on <0.004 delta');

  // Apply significant transient jump (0.85)
  sb.updateWallpaperLyricBeatBloom(0.85);
  assert.notStrictEqual(sb.appliedStyles.get('--wb-bloom-glow'), initialGlow, 'Glow must update on strong transient');
  assert.notStrictEqual(sb.appliedStyles.get('--wb-bloom-alpha'), initialAlpha, 'Alpha must update on strong transient');
  assert.notStrictEqual(sb.appliedStyles.get('--wb-beat-scale'), initialScale, 'Scale must update on strong transient');
  console.log('  ✓ 2.4: Numeric deadbands suppress micro-variations while preserving full transient response');
}


// ============================================================================
// SUITE 3: Consumer-Aware Audio Visualizer IPC Gating
// ============================================================================
console.log('\n--- Suite 3: Consumer-Aware Audio Visualizer IPC Gating ---');

// Extract syncAudioVisualizerState
const syncMatch = rendererCode.match(/function syncAudioVisualizerState\(\) \{[\s\S]*?\n\}/);
assert.ok(syncMatch, 'Found syncAudioVisualizerState in renderer.js');

function createSyncSandbox({
  isIsland = false,
  isSleeping = false,
  isWallpaper = false,
  isBloom = true,
  isPlaying = true,
  hasSoloStage = false,
  hasLivePlayer = false,
  hasLiveStudio = false,
  visibilityState = 'visible'
} = {}) {
  let ipcDispatchedState = null;
  let callCount = 0;

  const mockSoloStage = hasSoloStage ? {
    classList: { contains: (cls) => cls === 'active' },
    style: { display: 'block' }
  } : null;

  const mockPlayerLive = hasLivePlayer ? {
    style: { display: 'inline-flex' }
  } : null;

  const mockStudioLive = hasLiveStudio ? {
    style: { display: 'inline-flex' }
  } : null;

  const sandbox = {
    isDynamicIslandMode: isIsland,
    isIslandSleeping: isSleeping,
    settings: {
      wallpaperMode: isWallpaper,
      wallpaperBeatBloom: isBloom
    },
    isPlaying: isPlaying,
    currentTitle: isPlaying ? 'Track Title' : '',
    document: {
      visibilityState: visibilityState,
      body: { classList: { contains: (cls) => cls === 'is-playing' && isPlaying } },
      getElementById: (id) => {
        if (id === 'instrumental-solo-stage') return mockSoloStage;
        if (id === 'player-live-visualizer') return mockPlayerLive;
        if (id === 'studio-badge-live') return mockStudioLive;
        return null;
      }
    },
    window: {
      electronAPI: {
        setAudioVisualizerActive: (val) => {
          callCount++;
          ipcDispatchedState = val;
        }
      }
    },
    _currentAudioVisualizerActiveState: null,
    visualizerFallbackInterval: null,
    ensureVisualizerFallbackWatchdog: () => {},
    getDispatched: () => ipcDispatchedState,
    getCallCount: () => callCount
  };

  vm.runInNewContext(`
    ${syncMatch[0]}
    this.syncAudioVisualizerState = syncAudioVisualizerState;
  `, sandbox);

  return sandbox;
}

// 3.1 Normal Desktop Mode (playing track with lyrics, NO active solo stage or equalizer)
{
  const sb = createSyncSandbox({
    isIsland: false,
    isWallpaper: false,
    isPlaying: true,
    hasSoloStage: false,
    hasLivePlayer: false,
    hasLiveStudio: false
  });
  sb.syncAudioVisualizerState();
  assert.strictEqual(
    sb.getDispatched(),
    false,
    'Normal desktop mode without active visualizer UI must deactivate WASAPI capture loop (IPC = false)'
  );
  console.log('  ✓ 3.1: Normal desktop playback gates audio visualizer capture to false (0 wasted IPC events)');
}

// 3.2 Instrumental Break Starts (solo stage activates)
{
  const sb = createSyncSandbox({
    isIsland: false,
    isWallpaper: false,
    isPlaying: true,
    hasSoloStage: true
  });
  sb.syncAudioVisualizerState();
  assert.strictEqual(
    sb.getDispatched(),
    true,
    'Instrumental break activation must immediately activate WASAPI capture loop (IPC = true)'
  );
  console.log('  ✓ 3.2: Instrumental solo stage entrance instantly activates audio visualizer loop');
}

// 3.3 Dynamic Island Mode
{
  const sb = createSyncSandbox({
    isIsland: true,
    isSleeping: false,
    isWallpaper: false,
    isPlaying: true,
    hasSoloStage: false
  });
  sb.syncAudioVisualizerState();
  assert.strictEqual(
    sb.getDispatched(),
    true,
    'Dynamic Island mode must keep visualizer capture active'
  );
  console.log('  ✓ 3.3: Dynamic Island mode preserves active visualizer capture');
}

// 3.4 Wallpaper Mode with Beat Bloom
{
  const sb = createSyncSandbox({
    isIsland: false,
    isWallpaper: true,
    isBloom: true,
    isPlaying: true,
    hasSoloStage: false
  });
  sb.syncAudioVisualizerState();
  assert.strictEqual(
    sb.getDispatched(),
    true,
    'Wallpaper mode with beat bloom enabled must keep visualizer capture active'
  );
  console.log('  ✓ 3.4: Wallpaper beat-bloom mode activates audio visualizer capture');
}

// 3.5 Hidden Window Suspension
{
  const sb = createSyncSandbox({
    isIsland: false,
    isWallpaper: false,
    isPlaying: true,
    hasSoloStage: true,
    visibilityState: 'hidden'
  });
  sb.syncAudioVisualizerState();
  assert.strictEqual(
    sb.getDispatched(),
    false,
    'Hidden desktop window must suspend visualizer capture even if solo stage is active'
  );
  console.log('  ✓ 3.5: Hidden window visibility state cleanly suspends audio capture');
}

console.log('\n================================================================');
console.log('  ALL REMAINING PERFORMANCE OPTIMIZATION TESTS PASSED (12/12)     ');
console.log('================================================================\n');
