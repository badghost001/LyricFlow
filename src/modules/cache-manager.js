/**
 * LyricFlow - Offline Cache Manager Module
 */

function clearLyricsCaches() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('lyrics_cache_') || key.startsWith('blacklist_lyrics_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn("Error clearing lyrics caches:", e);
  }
}

// Emergency cleanup when localStorage approaches or hits quota
function autoPruneStorage() {
  try {
    // 1. Clean listening_history if bloated with base64 images
    const rawHist = localStorage.getItem("listening_history");
    if (rawHist) {
      if (rawHist.length > 400000 || rawHist.includes("data:image")) {
        try {
          const hist = JSON.parse(rawHist);
          const sanitized = hist.slice(0, 30).map(entry => ({
            ...entry,
            albumArtUrl: (entry.albumArtUrl && entry.albumArtUrl.startsWith("data:")) ? "" : entry.albumArtUrl
          }));
          localStorage.setItem("listening_history", JSON.stringify(sanitized));
        } catch (_) {
          localStorage.removeItem("listening_history");
        }
      }
    }

    // 2. Clean local_art_cache if oversized
    const rawArt = localStorage.getItem("lyricflow_local_art_cache");
    if (rawArt && (rawArt.length > 400000 || rawArt.includes("data:image"))) {
      localStorage.removeItem("lyricflow_local_art_cache");
    }

    // 3. Purge older lyrics caches if too many exist
    const lyricsKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("lyrics_cache_v21_")) {
        lyricsKeys.push(k);
      }
    }
    if (lyricsKeys.length > 80) {
      for (let i = 0; i < lyricsKeys.length - 50; i++) {
        localStorage.removeItem(lyricsKeys[i]);
      }
    }
  } catch (e) {
    console.warn("Storage prune error:", e);
  }
}

// Bulletproof safe setItem wrapper that gracefully recovers from QuotaExceededError
function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`[Storage] QuotaExceededError on '${key}', attempting emergency storage purge:`, e);
    autoPruneStorage();
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.error(`[Storage] Fatal quota error on '${key}':`, retryErr);
      return false;
    }
  }
}

// LRU cache eviction helper for lyrics cache
function manageLyricsCache(cacheKey) {
  try {
    let index = [];
    const storedIndex = localStorage.getItem("lyrics_cache_index");
    if (storedIndex) {
      try {
        index = JSON.parse(storedIndex);
      } catch (_) {
        index = [];
      }
    }

    // Remove if already exists (push to end/most recent)
    index = index.filter(item => item && item.key !== cacheKey);

    // Add new key with timestamp
    index.push({ key: cacheKey, time: Date.now() });

    // Limit to 60 entries to prevent filling up storage
    if (index.length > 60) {
      const toRemove = index.slice(0, index.length - 60);
      toRemove.forEach(item => {
        if (item && item.key) localStorage.removeItem(item.key);
      });
      index = index.slice(index.length - 60);
    }

    safeStorageSet("lyrics_cache_index", JSON.stringify(index));
  } catch (e) {
    console.error("Lyrics cache management error:", e);
  }
}

// Run initial storage health check immediately
autoPruneStorage();

// Expose on global window object
window.clearLyricsCaches = clearLyricsCaches;
window.manageLyricsCache = manageLyricsCache;
window.safeStorageSet = safeStorageSet;
window.autoPruneStorage = autoPruneStorage;
