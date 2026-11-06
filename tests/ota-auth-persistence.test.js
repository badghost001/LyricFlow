/**
 * OTA Authentication & Multi-Service Session Persistence Verification Tests
 * Verifies that Spotify sp_dc and Last.fm session logins are retained across OTA updates.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n--- Running OTA Authentication & Session Persistence Tests ---');

// 1. Static Verification of Rust Engine Configuration Persistence
console.log('\n1. Rust Engine Configuration Merging:');
const configRsPath = path.join(__dirname, '../src-tauri/src/commands/config.rs');
const configRs = fs.readFileSync(configRsPath, 'utf8');

assert(
  configRs.includes('if let Some(new_obj) = config.as_object()') &&
  configRs.includes('final_obj.insert(k.clone(), v.clone());'),
  'save_config in config.rs must merge new keys into existing config without erasing authentication state'
);
console.log('  ✓ 1a. config.rs safely merges top-level configuration keys to preserve sp_dc, access_token, and lastfm');

// 2. LastFMManager Dual-Storage Redundancy
console.log('\n2. LastFMManager Dual-Storage Redundancy:');

// Mock browser environment
const mockStorage = new Map();
global.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear()
};

let capturedSaveConfig = null;
global.window = {
  electronAPI: {
    saveConfig: async (cfg) => {
      capturedSaveConfig = cfg;
    }
  }
};

// Load LastFMManager class definition
const lastfmJsPath = path.join(__dirname, '../src/lastfm.js');
const lastfmJsCode = fs.readFileSync(lastfmJsPath, 'utf8');
const scriptContext = new Function(lastfmJsCode + '\nreturn LastFMManager;')();
const manager = new scriptContext();

// Test 2a: Restoring Last.fm session from persistent config when localStorage is completely empty (OTA update scenario)
mockStorage.clear();
capturedSaveConfig = null;

manager.loadConfig({
  sessionKey: 'test_persistent_session_key_123',
  username: 'test_user',
  isScrobblingEnabled: true
});

assert.strictEqual(manager.sessionKey, 'test_persistent_session_key_123');
assert.strictEqual(manager.username, 'test_user');
assert.strictEqual(manager.isScrobblingEnabled, true);
assert.strictEqual(manager.isConnected(), true);
assert(mockStorage.has('lastfm_config'), 'loadConfig must re-seed localStorage from persistent disk data');
console.log('  ✓ 2a. Last.fm session successfully restored from disk config when localStorage was wiped during OTA update');

// Test 2b: Saving Last.fm session mirrors to both localStorage and disk config
manager.sessionKey = 'new_authenticated_key_456';
manager.username = 'lyricflow_fan';
manager.isScrobblingEnabled = true;
manager.saveConfig();

const savedInStorage = JSON.parse(mockStorage.get('lastfm_config'));
assert.strictEqual(savedInStorage.sessionKey, 'new_authenticated_key_456');
assert.strictEqual(capturedSaveConfig?.lastfm?.sessionKey, 'new_authenticated_key_456');
assert.strictEqual(capturedSaveConfig?.lastfm?.username, 'lyricflow_fan');
console.log('  ✓ 2b. saveConfig dual-writes to localStorage and invokes saveConfig IPC for persistent disk mirroring');

// Test 2c: Disconnecting cleans both stores
manager.disconnect();
assert.strictEqual(manager.sessionKey, '');
assert.strictEqual(manager.username, '');
assert.strictEqual(manager.isConnected(), false);
const disconnectedStorage = JSON.parse(mockStorage.get('lastfm_config'));
assert.strictEqual(disconnectedStorage.sessionKey, '');
assert.strictEqual(capturedSaveConfig?.lastfm?.sessionKey, '');
console.log('  ✓ 2c. disconnect cleanly clears authentication in both storage tiers');

// 3. Renderer OTA Setup-Bypass & Persistence Guard
console.log('\n3. Renderer Setup Guard & Persistent State Detection:');
const rendererPath = path.join(__dirname, '../src/renderer.js');
const renderer = fs.readFileSync(rendererPath, 'utf8');

assert(
  renderer.includes('window.lastFM.loadConfig(config?.lastfm);'),
  'renderer.js must hydrate Last.fm session from config.lastfm on boot'
);
console.log('  ✓ 3a. renderer.js hydrates Last.fm session during bootstrap');

assert(
  renderer.includes('localStorage.setItem("lyricflow_sp_dc", config.sp_dc);') &&
  renderer.includes('localStorage.getItem("lyricflow_sp_dc");'),
  'renderer.js must maintain dual-storage redundancy for Spotify sp_dc'
);
console.log('  ✓ 3b. renderer.js maintains dual-storage synchronization for Spotify sp_dc');

assert(
  renderer.includes('config = { ...(config || {}), ...(authConfig || {}), localMode: false };') &&
  renderer.includes('config = { ...(config || {}), ...(res || {}), localMode: false };'),
  'Spotify login handlers must merge auth into existing config object without wiping other services'
);
console.log('  ✓ 3c. Spotify login handlers safely merge auth data preserving settings and Last.fm session');

assert(
  renderer.includes('localStorage.getItem("lastfm_config")') &&
  renderer.includes('config.lastfm && config.lastfm.sessionKey') &&
  renderer.includes('localStorage.removeItem("lyricflow_onboarding_started");'),
  'Returning authenticated users must never be forced into first-run onboarding'
);
console.log('  ✓ 3d. Existing authenticated users bypass onboarding wizard after OTA updates');

console.log('\nAll OTA Authentication & Session Persistence tests passed successfully!\n');
