const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("\n--- Running Dynamic Island Music Source Volume Tests ---\n");

// 1. Verify src/renderer.js implementation
const rendererPath = path.join(__dirname, '..', 'src', 'renderer.js');
const rendererCode = fs.readFileSync(rendererPath, 'utf8');

// 1a. Verify wheel event handler on dynamicIslandEl routes standard scrolling to adjustIslandVolume
assert.ok(
  rendererCode.includes('dynamicIslandEl.addEventListener("wheel"'),
  "dynamicIslandEl should have a wheel event listener"
);

assert.ok(
  rendererCode.includes('adjustIslandVolume(deltaVol)'),
  "Wheel event listener should call adjustIslandVolume for vertical scrolling"
);

assert.ok(
  rendererCode.includes('const isExplicitSeek = e.shiftKey || (Math.abs(e.deltaX) > 25 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 2.5);'),
  "Only explicit Shift-scroll or strong intentional horizontal swipe should seek; standard scroll is volume"
);
console.log("  ✓ 1a. Dynamic Island wheel event routes standard scrolling directly to adjustIslandVolume");

// 1b. Verify adjustIslandVolume targets the music source application
assert.ok(
  rendererCode.includes('window.electronAPI.adjustMusicAppVolume'),
  "adjustIslandVolume must call window.electronAPI.adjustMusicAppVolume for native player control"
);

assert.ok(
  rendererCode.includes('setSpotifyVolumeDebounced'),
  "adjustIslandVolume must debounce Spotify Web API volume requests to avoid rate limits"
);

assert.ok(
  rendererCode.includes('const appLabel = currentMusicAppName ? `${currentMusicAppName}: ` : \'\';'),
  "Dynamic Island HUD must display active music source application name"
);
console.log("  ✓ 1b. adjustIslandVolume targets active music source application and formats HUD with app label");

// 1c. Verify toggleAppMute targets active music source application
assert.ok(
  rendererCode.includes('window.electronAPI.toggleMusicAppMute'),
  "toggleAppMute must invoke toggleMusicAppMute for active music player"
);
console.log("  ✓ 1c. toggleAppMute toggles mute for active music player rather than master mute");

// 1d. Verify syncMusicAppVolume updates volume on mode transition, mouseenter, and track changes
assert.ok(
  rendererCode.includes('async function syncMusicAppVolume()'),
  "syncMusicAppVolume function must exist"
);

assert.ok(
  rendererCode.includes('window.electronAPI.getMusicAppVolume'),
  "syncMusicAppVolume must query window.electronAPI.getMusicAppVolume"
);

assert.ok(
  rendererCode.includes('syncMusicAppVolume();') && rendererCode.includes('syncDynamicIslandState();'),
  "syncMusicAppVolume must be called during island transition and track updates"
);
console.log("  ✓ 1d. syncMusicAppVolume syncs island volume state on mount, hover, and track change");

// 2. Verify src/tauri-bridge.js exposes volume APIs
const bridgePath = path.join(__dirname, '..', 'src', 'tauri-bridge.js');
const bridgeCode = fs.readFileSync(bridgePath, 'utf8');

assert.ok(
  bridgeCode.includes("getMusicAppVolume: () => safeInvoke('get_music_app_volume'"),
  "tauri-bridge.js must expose getMusicAppVolume"
);
assert.ok(
  bridgeCode.includes("adjustMusicAppVolume: (delta = null, target = null) =>"),
  "tauri-bridge.js must expose adjustMusicAppVolume"
);
assert.ok(
  bridgeCode.includes("toggleMusicAppMute: () => safeInvoke('toggle_music_app_mute'"),
  "tauri-bridge.js must expose toggleMusicAppMute"
);
console.log("  ✓ 2. tauri-bridge.js exposes getMusicAppVolume, adjustMusicAppVolume, and toggleMusicAppMute");

// 3. Verify Rust backend in src-tauri
const smtcPath = path.join(__dirname, '..', 'src-tauri', 'src', 'media', 'windows_smtc.rs');
const smtcCode = fs.readFileSync(smtcPath, 'utf8');

assert.ok(
  smtcCode.includes('pub fn set_music_app_volume') &&
  smtcCode.includes('pub fn step_music_app_volume') &&
  smtcCode.includes('pub fn get_music_app_volume_info') &&
  smtcCode.includes('pub fn toggle_music_app_mute'),
  "windows_smtc.rs must implement per-app volume functions via WASAPI"
);

assert.ok(
  smtcCode.includes('ISimpleAudioVolume') && smtcCode.includes('IAudioSessionEnumerator'),
  "windows_smtc.rs must use WASAPI ISimpleAudioVolume and IAudioSessionEnumerator"
);

assert.ok(
  smtcCode.includes('"volume-up" =>') && smtcCode.includes('step_music_app_volume(5.0)'),
  "trigger_control volume-up must step music app volume instead of master volume"
);

assert.ok(
  smtcCode.includes('"volume-down" =>') && smtcCode.includes('step_music_app_volume(-5.0)'),
  "trigger_control volume-down must step music app volume instead of master volume"
);
console.log("  ✓ 3. windows_smtc.rs implements per-app WASAPI volume control for music players");

// 4. Verify commands registered in lib.rs
const libPath = path.join(__dirname, '..', 'src-tauri', 'src', 'lib.rs');
const libCode = fs.readFileSync(libPath, 'utf8');

assert.ok(
  libCode.includes('integrations::get_music_app_volume') &&
  libCode.includes('integrations::adjust_music_app_volume') &&
  libCode.includes('integrations::toggle_music_app_mute'),
  "lib.rs must register get_music_app_volume, adjust_music_app_volume, and toggle_music_app_mute"
);
console.log("  ✓ 4. lib.rs registers music app volume commands in invoke_handler");

console.log("\nDynamic Island Music Source Volume Results: All tests passed.\n");
