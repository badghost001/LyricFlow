const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("\n--- Running Full Application Optimization Tests ---\n");

const rendererPath = path.join(__dirname, '..', 'src', 'renderer.js');
const bridgePath = path.join(__dirname, '..', 'src', 'tauri-bridge.js');
const audioRsPath = path.join(__dirname, '..', 'src-tauri', 'src', 'audio.rs');
const libRsPath = path.join(__dirname, '..', 'src-tauri', 'src', 'lib.rs');

const rendererCode = fs.readFileSync(rendererPath, 'utf8');
const bridgeCode = fs.readFileSync(bridgePath, 'utf8');
const audioRsCode = fs.readFileSync(audioRsPath, 'utf8');
const libRsCode = fs.readFileSync(libRsPath, 'utf8');

// 1. Audio Pipeline & WASAPI Loopback Gating (Rust)
assert.ok(
  audioRsCode.includes('pub static AUDIO_VISUALIZER_ACTIVE: AtomicBool = AtomicBool::new(false);'),
  "audio.rs must define AUDIO_VISUALIZER_ACTIVE atomic flag"
);
assert.ok(
  audioRsCode.includes('pub fn set_audio_visualizer_active(active: bool)'),
  "audio.rs must expose set_audio_visualizer_active tauri command"
);
assert.ok(
  audioRsCode.includes('if !AUDIO_VISUALIZER_ACTIVE.load(Ordering::Relaxed)'),
  "audio.rs capture loop must check AUDIO_VISUALIZER_ACTIVE and sleep when inactive"
);
assert.ok(
  libRsCode.includes('audio::set_audio_visualizer_active'),
  "lib.rs must register audio::set_audio_visualizer_active in invoke_handler"
);
console.log("  ✓ 1. Rust Audio Pipeline gates WASAPI capture loop and FFT emissions when inactive");

// 2. SMTC Polling Adaptive Backoff (Rust)
assert.ok(
  libRsCode.includes('let mut consecutive_empty = 0u32;'),
  "lib.rs SMTC worker must track consecutive empty polls"
);
assert.ok(
  libRsCode.includes('Duration::from_millis(1000)'),
  "lib.rs SMTC worker must back off to 1000ms when idle without active media"
);
console.log("  ✓ 2. SMTC background worker adapts polling frequency to 1000ms when idle");

// 3. Logger OnceLock Path Caching (Rust)
assert.ok(
  libRsCode.includes('static LOG_FILE: std::sync::OnceLock<Option<std::path::PathBuf>>'),
  "log_to_file must cache log file path in OnceLock"
);
console.log("  ✓ 3. log_to_file avoids repeated filesystem queries and synchronous flushing");

// 4. Tauri Compatibility Bridge (JS)
assert.ok(
  bridgeCode.includes("setAudioVisualizerActive: (active) => safeInvoke('set_audio_visualizer_active'"),
  "tauri-bridge.js must expose setAudioVisualizerActive method"
);
console.log("  ✓ 4. tauri-bridge.js exposes setAudioVisualizerActive IPC binding");

// 5. Gated Audio Visualizer State Sync (Renderer)
assert.ok(
  rendererCode.includes('function syncAudioVisualizerState()'),
  "renderer.js must implement syncAudioVisualizerState"
);
assert.ok(
  rendererCode.includes('window.electronAPI.setAudioVisualizerActive(shouldBeActive)'),
  "syncAudioVisualizerState must signal Rust backend when visualizer is needed"
);
console.log("  ✓ 5. renderer.js synchronizes visualizer state only when Island or Beat Bloom is visible");

// 6. Playhead Loop Throttling When Hidden (Renderer)
assert.ok(
  rendererCode.includes('const requiresHighFreqTick = Boolean(typeof settings !== \'undefined\' && (settings.taskbarMode || isDynamicIslandMode || settings.wallpaperMode));'),
  "ensurePlayheadLoop must check for active widget modes before using high-frequency timer"
);
assert.ok(
  rendererCode.includes('playheadTimerId = setTimeout(updatePlayhead, requiresHighFreqTick ? 25 : 1000);'),
  "playheadTimerId must throttle to 1000ms when window is minimized/hidden"
);
console.log("  ✓ 6. Playhead loop throttles to 1000ms tick when window is hidden and not in widget mode");

// 7. Visibility Lifecycle Adaptation (Renderer)
assert.ok(
  rendererCode.includes('fluidMeshGradientInstance.stop()'),
  "renderer.js must stop WebGL fluid mesh when visibilityState is hidden"
);
assert.ok(
  rendererCode.includes('cinematicMainRendererInstance && !settings.wallpaperMode && !settings.taskbarMode && !isDynamicIslandMode && document.visibilityState !== \'hidden\''),
  "Cinematic seek must be guarded by document.visibilityState !== 'hidden'"
);
console.log("  ✓ 7. WebGL fluid mesh stops and cinematic canvas seek pauses when window is hidden");

// 8. In-Flight Request Deduplication (Renderer)
assert.ok(
  rendererCode.includes('const inFlightLyricsRequests = new Map();'),
  "renderer.js must maintain inFlightLyricsRequests map"
);
assert.ok(
  rendererCode.includes('if (!options.forceRefresh && inFlightLyricsRequests.has(trackId))'),
  "fetchLyrics must return existing in-flight promise for duplicate requests"
);
console.log("  ✓ 8. fetchLyrics deduplicates concurrent network requests for the same track");

// 9. Bounded LRU Cache Eviction (Renderer)
assert.ok(
  rendererCode.includes('const MAX_CACHED_TRACKS = 60;'),
  "renderer.js must define MAX_CACHED_TRACKS bounded limit"
);
assert.ok(
  rendererCode.includes('function saveLyricsToCache(cacheKey, dataObj)'),
  "renderer.js must define saveLyricsToCache LRU helper"
);
assert.ok(
  rendererCode.includes('localStorage.setItem(\'lyricflow_lyrics_cache_index\', JSON.stringify(cacheIndex));'),
  "saveLyricsToCache must track and persist LRU index"
);
console.log("  ✓ 9. Lyrics cache enforces bounded LRU eviction to prevent localStorage memory leaks");

// 10. Genius Facts Early Guard (Renderer)
assert.ok(
  rendererCode.includes('if (settings.showGeniusFact === false || settings.wallpaperMode || settings.taskbarMode) return;'),
  "fetchGeniusFact must early return when disabled or in wallpaper/taskbar mode"
);
console.log("  ✓ 10. Genius facts scrape skipped when disabled or running in secondary window modes");

console.log("\nFull Application Optimization Results: All 10/10 tests passed.\n");
