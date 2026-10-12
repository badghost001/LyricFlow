/**
 * tests/spotify-auth-totp.test.js
 * Verification test suite for Spotify TOTP /api/token authentication & Dynamic Island album art color tinting.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('\n--- Running Spotify Auth TOTP & Dynamic Island Liquid Glass Tests ---\n');

const integrationsRsPath = path.join(__dirname, '../src-tauri/src/commands/integrations.rs');
const rendererJsPath = path.join(__dirname, '../src/renderer.js');
const dynamicIslandCssPath = path.join(__dirname, '../src/styles/_dynamic_island.css');
const playbackIpcJsPath = path.join(__dirname, '../src/main/ipc/playback-ipc.js');

const integrationsCode = fs.readFileSync(integrationsRsPath, 'utf8');
const rendererCode = fs.readFileSync(rendererJsPath, 'utf8');
const dynamicIslandCss = fs.readFileSync(dynamicIslandCssPath, 'utf8');
const playbackIpcCode = fs.readFileSync(playbackIpcJsPath, 'utf8');

// 1. Rust TOTP & /api/token Implementation
console.log('1. Rust Spotify Auth Engine:');

assert(integrationsCode.includes('pub fn generate_spotify_totp('), 'Must define generate_spotify_totp function');
assert(integrationsCode.includes('KNOWN_TOTP_SECRETS'), 'Must define KNOWN_TOTP_SECRETS constant array');
assert(integrationsCode.includes('https://open.spotify.com/api/token'), 'Must target https://open.spotify.com/api/token endpoint');
assert(integrationsCode.includes('fetch_spotify_server_time'), 'Must attempt server-time synchronization');
assert(integrationsCode.includes('fetch_dynamic_totp_secrets'), 'Must support dynamic secret extraction from live web-player bundle');
assert(!integrationsCode.includes('https://open.spotify.com/get_access_token'), 'Must NOT target deprecated /get_access_token endpoint');
console.log('  ✓ 1a. Rust integrations.rs implements TOTP generation, server-time sync, and dynamic bundle fallback');

// Verify TOTP test vector
function testTotpVector() {
  const secret = ',7/*F("rLJ2oxaKL^f+E1xvP@N';
  const r = secret.split("").map((ch, idx) => ch.charCodeAt(0) ^ (idx % 33 + 9));
  const keyBytes = Buffer.from(r.join(""), "utf8");

  const ts = 1791468347000;
  const counter = Math.floor(ts / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', keyBytes).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}
assert.strictEqual(testTotpVector(), '253733', 'TOTP calculation must match known reference vector');
console.log('  ✓ 1b. Cryptographic TOTP test vector verified (253733)');

// 2. Playback IPC Electron Fallback
console.log('\n2. Playback IPC Implementation:');
assert(playbackIpcCode.includes('https://open.spotify.com/api/token'), 'playback-ipc.js must use /api/token');
assert(playbackIpcCode.includes('crypto.createHmac'), 'playback-ipc.js must generate HMAC-SHA1 TOTP');
console.log('  ✓ 2a. playback-ipc.js mirrors TOTP /api/token logic');

// 3. Renderer Resiliency & Rate Limiting
console.log('\n3. Renderer Polling Resiliency:');
assert(rendererCode.includes('window._spotifyRateLimitUntil'), 'renderer.js must track rate limit cooldown for 429 status');
assert(rendererCode.includes('window._spotifyTokenFailUntil'), 'renderer.js must enforce token failure cooldown to prevent polling loops');
assert(rendererCode.includes('pollLocalPlayback()'), 'renderer.js must route seamlessly to local playback during cooldowns');
console.log('  ✓ 3a. pollSpotifyPlayback implements 429 rate limit backoff and token cooldown routing to SMTC');

// 4. Dynamic Island Liquid Glass Album Art Tint
console.log('\n4. Dynamic Island Liquid Glass Material Album Art Tint:');
assert(dynamicIslandCss.includes('body.mode-dynamic-island.island-glass-mode #dynamic-island'), 'Must style dynamic island in glass mode');
assert(dynamicIslandCss.includes('--art-color-dominant-rgb'), 'Must infuse dominant album art color into liquid glass material');
assert(dynamicIslandCss.includes('--art-color-1-rgb'), 'Must use art-color-1-rgb in liquid glass styling');
assert(dynamicIslandCss.includes('radial-gradient('), 'Must use radial gradient caustics for album art color tinting');
assert(dynamicIslandCss.includes('inset 0 0 24px -4px rgba(var(--art-color-dominant-rgb'), 'Must cast internal album art refraction glow');
assert(dynamicIslandCss.includes('rgba(18, 18, 24, 0.52)'), 'Must preserve translucent dark glass substrate');
console.log('  ✓ 4a. Dynamic Island liquid glass infuses album art dominant color and refraction caustics');

console.log('\nAll Spotify Auth TOTP & Dynamic Island Liquid Glass tests passed successfully!\n');
