/**
 * LyricFlow - Offline Cache Manager Module
 */

function clearLyricsCaches() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('lyrics_cache_') || key.startsWith('blacklist_lyrics_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

// LRU cache eviction helper for lyrics cache
function manageLyricsCache(cacheKey) {
  try {
    let index = [];
    const storedIndex = localStorage.getItem("lyrics_cache_index");
    if (storedIndex) {
      index = JSON.parse(storedIndex);
    }

    // Remove if already exists (push to end/most recent)
    index = index.filter(item => item.key !== cacheKey);

    // Add new key with timestamp
    index.push({ key: cacheKey, time: Date.now() });

    // Limit to 150 entries
    if (index.length > 150) {
      const toRemove = index.slice(0, index.length - 150);
      toRemove.forEach(item => {
        localStorage.removeItem(item.key);
      });
      index = index.slice(index.length - 150);
    }

    localStorage.setItem("lyrics_cache_index", JSON.stringify(index));
  } catch (e) {
    console.error("Lyrics cache management error:", e);
  }
}

// Expose on global window object
window.clearLyricsCaches = clearLyricsCaches;
window.manageLyricsCache = manageLyricsCache;
