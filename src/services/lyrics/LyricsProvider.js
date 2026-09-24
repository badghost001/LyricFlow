/**
 * LyricFlow - Base LyricsProvider
 * Extensible provider contract for all lyrics sources.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LyricsProvider = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class LyricsProvider {
    /**
     * @param {string} name Provider name (e.g. 'LyricsPlus', 'LRCLIB')
     */
    constructor(name) {
      if (!name || typeof name !== 'string') {
        throw new Error('LyricsProvider requires a valid provider name');
      }
      this.name = name;
    }

    /**
     * Fetch lyrics for the given track metadata
     * @param {object} trackMetadata
     * @param {string} trackMetadata.title
     * @param {string} trackMetadata.artist
     * @param {string} [trackMetadata.album]
     * @param {number} [trackMetadata.duration] in seconds
     * @param {string} [trackMetadata.isrc]
     * @param {string} [trackMetadata.platformId]
     * @param {string} [trackMetadata.source]
     * @param {object} [options]
     * @param {AbortSignal} [options.signal]
     * @param {boolean} [options.forceRefresh]
     * @returns {Promise<object|null>} Resolves to NormalizedLyrics or null
     */
    async getLyrics(trackMetadata, options = {}) {
      throw new Error(`Provider "${this.name}" must implement getLyrics()`);
    }
  }

  return LyricsProvider;
});
