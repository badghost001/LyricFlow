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
function autoPruneStorage(aggressive = false) {
  try {
    // 0. Purge all legacy genius_annotations_ keys from localStorage (moved to in-memory cache)
    const geniusKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("genius_annotations_")) {
        geniusKeys.push(k);
      }
    }
    geniusKeys.forEach(k => localStorage.removeItem(k));

    // 1. Remove legacy v1 art cache unconditionally
    localStorage.removeItem("lyricflow_local_art_cache");

    // 2. Clean local_art_cache_v2 (frequently bloated by base64 SMTC thumbnails)
    const rawArtV2 = localStorage.getItem("lyricflow_local_art_cache_v2");
    if (rawArtV2) {
      if (aggressive || rawArtV2.length > 200000 || rawArtV2.includes("data:")) {
        localStorage.removeItem("lyricflow_local_art_cache_v2");
        if (!aggressive) {
          try {
            const parsed = JSON.parse(rawArtV2);
            const sanitized = {};
            let count = 0;
            for (const [k, v] of Object.entries(parsed)) {
              if (v && typeof v === "string" && !v.startsWith("data:") && count < 30) {
                sanitized[k] = v;
                count++;
              }
            }
            if (Object.keys(sanitized).length > 0) {
              localStorage.setItem("lyricflow_local_art_cache_v2", JSON.stringify(sanitized));
            }
          } catch (_) {}
        }
      }
    }

    // 3. Clean lf_animated_art_cache
    const rawAnim = localStorage.getItem("lf_animated_art_cache");
    if (rawAnim) {
      if (aggressive || rawAnim.length > 200000 || rawAnim.includes("data:")) {
        localStorage.removeItem("lf_animated_art_cache");
        if (!aggressive) {
          try {
            const parsed = JSON.parse(rawAnim);
            const sanitized = {};
            let count = 0;
            for (const [k, v] of Object.entries(parsed)) {
              if (v && (!v.url || !v.url.startsWith("data:")) && count < 20) {
                sanitized[k] = v;
                count++;
              }
            }
            if (Object.keys(sanitized).length > 0) {
              localStorage.setItem("lf_animated_art_cache", JSON.stringify(sanitized));
            }
          } catch (_) {}
        }
      }
    }

    // 4. Clean listening_history if bloated with base64 images
    const rawHist = localStorage.getItem("listening_history");
    if (rawHist) {
      if (aggressive || rawHist.length > 200000 || rawHist.includes("data:image")) {
        localStorage.removeItem("listening_history");
        if (!aggressive) {
          try {
            const hist = JSON.parse(rawHist);
            const sanitized = hist.slice(0, 20).map(entry => ({
              ...entry,
              albumArtUrl: (entry.albumArtUrl && entry.albumArtUrl.startsWith("data:")) ? "" : entry.albumArtUrl
            }));
            localStorage.setItem("listening_history", JSON.stringify(sanitized));
          } catch (_) {}
        }
      }
    }

    // 5. Purge obsolete/unversioned lyrics caches (anything other than v21)
    const obsoleteLyricsKeys = [];
    const v21Keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("lyrics_cache_") && !k.startsWith("lyrics_cache_v21_")) {
        obsoleteLyricsKeys.push(k);
      } else if (k.startsWith("lyrics_cache_v21_")) {
        v21Keys.push(k);
      } else if (k.startsWith("blacklist_lyrics_")) {
        obsoleteLyricsKeys.push(k);
      }
    }
    obsoleteLyricsKeys.forEach(k => localStorage.removeItem(k));

    // 6. Bound v21 lyrics caches aggressively (max 15 entries normally, 5 if aggressive)
    const maxEntries = aggressive ? 5 : 15;
    if (v21Keys.length > maxEntries) {
      // Read lyrics cache index if available
      let cacheIndex = [];
      try {
        const stored = localStorage.getItem("lyricflow_lyrics_cache_index") || localStorage.getItem("lyrics_cache_index");
        if (stored) cacheIndex = JSON.parse(stored);
      } catch (_) {}

      const keepKeys = new Set();
      if (Array.isArray(cacheIndex)) {
        cacheIndex.slice(-maxEntries).forEach(item => {
          const key = typeof item === "string" ? item : item?.key;
          if (key) keepKeys.add(key);
        });
      }

      v21Keys.forEach(k => {
        if (!keepKeys.has(k) && keepKeys.size >= maxEntries) {
          localStorage.removeItem(k);
        } else if (!keepKeys.has(k)) {
          keepKeys.add(k);
        }
      });

      // Extra pruning if still over limit
      const remainingV21 = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("lyrics_cache_v21_")) remainingV21.push(k);
      }
      if (remainingV21.length > maxEntries) {
        for (let i = 0; i < remainingV21.length - maxEntries; i++) {
          localStorage.removeItem(remainingV21[i]);
        }
      }

      try {
        const remaining = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("lyrics_cache_v21_")) remaining.push(k);
        }
        localStorage.setItem("lyricflow_lyrics_cache_index", JSON.stringify(remaining));
        localStorage.removeItem("lyrics_cache_index");
      } catch (_) {}
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
    autoPruneStorage(true);
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
    const indexKey = "lyricflow_lyrics_cache_index";
    const storedIndex = localStorage.getItem(indexKey) || localStorage.getItem("lyrics_cache_index");
    if (storedIndex) {
      try {
        index = JSON.parse(storedIndex);
      } catch (_) {
        index = [];
      }
    }

    // Normalize index elements to string keys
    index = index.map(item => (typeof item === "string" ? item : item?.key)).filter(Boolean);

    // Remove if already exists (push to end/most recent)
    index = index.filter(k => k !== cacheKey);
    index.push(cacheKey);

    // Limit to 25 entries to prevent filling up storage
    const MAX_ENTRIES = 25;
    if (index.length > MAX_ENTRIES) {
      const toRemove = index.slice(0, index.length - MAX_ENTRIES);
      toRemove.forEach(k => {
        if (k) localStorage.removeItem(k);
      });
      index = index.slice(index.length - MAX_ENTRIES);
    }

    safeStorageSet(indexKey, JSON.stringify(index));
  } catch (e) {
    console.error("Lyrics cache management error:", e);
  }
}

// Run initial storage health check immediately
autoPruneStorage(false);

// Expose on global window object
if (typeof window !== "undefined") {
  window.clearLyricsCaches = clearLyricsCaches;
  window.manageLyricsCache = manageLyricsCache;
  window.safeStorageSet = safeStorageSet;
  window.autoPruneStorage = autoPruneStorage;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { clearLyricsCaches, autoPruneStorage, safeStorageSet, manageLyricsCache };
}
