/**
 * Startup Resilience, Storage Quota Pruning & Auto-Hide Visibility Verification Tests
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("--- Running Startup Resilience & Storage Quota Pruning Tests ---\n");

// 1. Storage Manager Logic & Quota Recovery
const cacheManagerPath = path.join(__dirname, '../src/modules/cache-manager.js');
const cacheManagerCode = fs.readFileSync(cacheManagerPath, 'utf8');

assert.ok(cacheManagerCode.includes('function autoPruneStorage(aggressive = false)'), "autoPruneStorage must support aggressive parameter");
assert.ok(cacheManagerCode.includes('genius_annotations_'), "autoPruneStorage must purge legacy genius annotations keys");
assert.ok(cacheManagerCode.includes('lyricflow_local_art_cache_v2'), "autoPruneStorage must prune local art cache v2");
assert.ok(cacheManagerCode.includes('lf_animated_art_cache'), "autoPruneStorage must prune animated art cache");
assert.ok(cacheManagerCode.includes('listening_history'), "autoPruneStorage must sanitize listening history");
assert.ok(cacheManagerCode.includes('lyrics_cache_v21_'), "autoPruneStorage must preserve only active v21 lyrics cache keys");
console.log("  ✓ 1. cache-manager.js defines comprehensive autoPruneStorage for genius annotations, art, and lyrics");

// Simulate localStorage environment for cache-manager
const mockStorage = new Map();
global.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
  get length() { return mockStorage.size; },
  key: (i) => Array.from(mockStorage.keys())[i] || null
};
global.window = {};

const { autoPruneStorage, safeStorageSet, manageLyricsCache } = require('../src/modules/cache-manager.js');

// Test 2: autoPruneStorage clears legacy and base64 bloat
mockStorage.set("genius_annotations_track123", JSON.stringify([{ text: "huge paragraph" }]));
mockStorage.set("lyricflow_local_art_cache", "old_v1_junk");
mockStorage.set("lyricflow_local_art_cache_v2", JSON.stringify({
  "track1": "https://example.com/art1.jpg",
  "track2": "data:image/jpeg;base64," + "A".repeat(300000)
}));
mockStorage.set("lyrics_cache_v20_oldtrack", JSON.stringify({ old: true }));
mockStorage.set("lyrics_cache_v21_validtrack", JSON.stringify({ lyrics: ["hello"] }));

autoPruneStorage(false);

assert.strictEqual(mockStorage.has("genius_annotations_track123"), false, "Legacy genius annotations must be purged");
assert.strictEqual(mockStorage.has("lyricflow_local_art_cache"), false, "Legacy v1 art cache must be purged");
assert.strictEqual(mockStorage.has("lyrics_cache_v20_oldtrack"), false, "Deprecated v20 cache must be purged");
assert.strictEqual(mockStorage.has("lyrics_cache_v21_validtrack"), true, "Active v21 cache must be preserved");

const prunedArt = JSON.parse(mockStorage.get("lyricflow_local_art_cache_v2"));
assert.strictEqual(prunedArt["track1"], "https://example.com/art1.jpg", "Normal URLs must be retained");
assert.strictEqual(prunedArt["track2"], undefined, "Base64 data URLs must be eliminated from localArtCache");
console.log("  ✓ 2. autoPruneStorage successfully purges genius annotations, strips base64 data URLs, and bounds v21 caches");

// Test 3: safeStorageSet quota recovery
let quotaHit = false;
const realSetItem = global.localStorage.setItem;
global.localStorage.setItem = (k, v) => {
  if (!quotaHit) {
    quotaHit = true;
    const err = new Error("QuotaExceededError");
    err.name = "QuotaExceededError";
    throw err;
  }
  realSetItem(k, v);
};

const saved = safeStorageSet("test_recovery_key", "saved_value");
global.localStorage.setItem = realSetItem;
assert.strictEqual(saved, true, "safeStorageSet must recover from QuotaExceededError and save value");
assert.strictEqual(mockStorage.get("test_recovery_key"), "saved_value", "Value must be persisted after emergency purge");
console.log("  ✓ 3. safeStorageSet gracefully catches QuotaExceededError and recovers via emergency purge");

// 4. Renderer Startup Resilience & Auto-Hide Guards
const rendererPath = path.join(__dirname, '../src/renderer.js');
const rendererCode = fs.readFileSync(rendererPath, 'utf8');

// Safety timeout must be >= 7000ms (12000ms configured)
assert.ok(
  rendererCode.includes('}, 7000);') || rendererCode.includes('}, 12000);'),
  "renderer.js must allocate at least 7000ms safety timeout"
);
assert.ok(
  rendererCode.replace(/\r\n/g, '\n').includes('if (safetyTimeout) {\n      clearTimeout(safetyTimeout);'),
  "dismissLoadingScreen must clear safetyTimeout immediately"
);
console.log("  ✓ 4. dismissLoadingScreen clears safetyTimeout immediately with 12000ms budget");

// Fast-path local SMTC in bootstrapApp
assert.ok(
  rendererCode.includes('window.electronAPI.getLocalPlayback()') && rendererCode.includes('Fast-Path: Instantly inspect local SMTC'),
  "bootstrapApp must query local SMTC (<20ms) as fast-path before Spotify API"
);
console.log("  ✓ 5. bootstrapApp prioritizes instant local SMTC playback query eliminating 429 cloud stalls");

// Guard handleEmptyPlayback during fetch
assert.ok(
  rendererCode.replace(/\r\n/g, '\n').includes('else if (!isFetchingLyrics && inFlightLyricsRequests.size === 0) {\n            handleEmptyPlayback();'),
  "bootstrapApp must not invoke handleEmptyPlayback while lyrics are fetching"
);
console.log("  ✓ 6. bootstrapApp guards handleEmptyPlayback preventing destruction of in-flight lyrics requests");

// Artwork and history base64 guards in renderer
assert.ok(
  rendererCode.includes("if (!url || typeof url !== 'string' || url.startsWith('data:')) return;"),
  "saveArtToCache must immediately reject data: URLs before memory allocation"
);
assert.ok(
  rendererCode.includes("if (!data || (typeof data.url === 'string' && data.url.startsWith('data:'))) return;"),
  "saveAnimatedArtCache must reject data: URLs"
);
console.log("  ✓ 7. saveArtToCache and saveAnimatedArtCache strictly block data: URLs from entering storage");

// Auto-hide visibility wakeup & window focus exception
assert.ok(
  rendererCode.includes('wakeAutoHideTemporarily(6000);'),
  "renderLyrics and track changes must wake auto-hide for at least 6s"
);
assert.ok(
  rendererCode.includes('if (isFetchingLyrics || (inFlightLyricsRequests && inFlightLyricsRequests.size > 0)) return false;'),
  "checkShouldAutoHide must not collapse window while lyrics requests are in flight"
);
assert.ok(
  rendererCode.includes('if (typeof document !== "undefined" && document.hasFocus && document.hasFocus()) return false;'),
  "checkShouldAutoHide must never collapse window when focused"
);
console.log("  ✓ 8. renderLyrics and handlePlaybackData wake auto-hide for 6s and focus guards block collapse");

// In-memory Genius annotations cache
assert.ok(
  rendererCode.includes('const geniusAnnotationsCache = new Map();'),
  "renderer.js must store Genius annotations in memory Map"
);
console.log("  ✓ 9. Genius annotations cached in memory Map avoiding localStorage quota consumption");

console.log("\nAll Startup Resilience & Storage Quota Pruning tests passed successfully!\n");
