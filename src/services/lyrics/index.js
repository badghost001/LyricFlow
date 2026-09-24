/**
 * LyricFlow - Unified Lyrics Service & Orchestrator
 * Manages provider waterfall (LyricsPlus primary -> existing fallbacks),
 * request cancellation, race condition guard, and lyric engine.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const models = require('./models');
    const LyricsProvider = require('./LyricsProvider');
    const { LyricsPlusService, LyricsPlusProvider } = require('./LyricsPlus');
    const LyricEngine = require('./LyricsEngine');
    const ExistingWaterfallProvider = require('./ExistingWaterfallProvider');
    module.exports = factory(models, LyricsProvider, LyricsPlusProvider, LyricEngine, ExistingWaterfallProvider);
  } else {
    root.LyricsService = factory(
      root.LyricModels,
      root.LyricsProvider,
      root.LyricsPlus.LyricsPlusProvider,
      root.LyricEngine,
      root.ExistingWaterfallProvider
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  LyricModels,
  LyricsProvider,
  LyricsPlusProvider,
  LyricEngine,
  ExistingWaterfallProvider
) {
  'use strict';

  class LyricsManager {
    constructor() {
      this.lyricsPlusProvider = new LyricsPlusProvider();
      this.waterfallProvider = new ExistingWaterfallProvider();
      this.engine = new LyricEngine();

      this.currentRequestId = 0;
      this.currentTrackIdentifier = null;
      this.activeAbortController = null;
    }

    /**
     * Cancel any pending in-flight request
     */
    cancelPending() {
      if (this.activeAbortController) {
        this.activeAbortController.abort();
        this.activeAbortController = null;
      }
    }

    /**
     * Get track key identifier for race-condition tracking
     */
    _getTrackId(meta) {
      if (!meta) return '';
      if (meta.isrc) return `isrc:${meta.isrc}`;
      if (meta.trackId) return `id:${meta.trackId}`;
      if (meta.platformId) return `pid:${meta.platformId}`;
      return `meta:${meta.artist || ''}:::${meta.title || ''}`;
    }

    /**
     * Main fetch method.
     * Primary: LyricsPlus
     * Fallback: Existing waterfall
     *
     * @param {object} trackMetadata
     * @param {object} [options]
     * @param {boolean} [options.forceRefresh]
     * @returns {Promise<object|null>} Resolves to NormalizedLyrics or null
     */
    async fetchLyrics(trackMetadata, options = {}) {
      // 1. Cancel previous in-flight request
      this.cancelPending();

      const requestId = ++this.currentRequestId;
      const trackId = this._getTrackId(trackMetadata);
      this.currentTrackIdentifier = trackId;

      this.activeAbortController = new AbortController();
      const signal = this.activeAbortController.signal;

      const mergedOptions = { ...options, signal };

      try {
        // 2. Query primary provider: LyricsPlus
        const lpResult = await this.lyricsPlusProvider.getLyrics(trackMetadata, mergedOptions);

        // Race condition check: Did track change while waiting for response?
        if (requestId !== this.currentRequestId || this.currentTrackIdentifier !== trackId || signal.aborted) {
          return null;
        }

        if (lpResult && LyricModels.isValidLyrics(lpResult)) {
          this.engine.setLyrics(lpResult);
          return lpResult;
        }

        // 3. Fallback: Existing Waterfall Provider (Rust / Cloudflare / LRCLIB / NetEase)
        const fallbackResult = await this.waterfallProvider.getLyrics(trackMetadata, mergedOptions);

        if (requestId !== this.currentRequestId || this.currentTrackIdentifier !== trackId || signal.aborted) {
          return null;
        }

        if (fallbackResult && LyricModels.isValidLyrics(fallbackResult)) {
          this.engine.setLyrics(fallbackResult);
          return fallbackResult;
        }

        // 4. All providers exhausted
        this.engine.clear();
        return null;
      } catch (err) {
        if (err.name === 'AbortError' || signal.aborted) {
          return null;
        }
        console.warn('[LyricsManager] Fetch error:', err);
        return null;
      } finally {
        if (this.currentRequestId === requestId) {
          this.activeAbortController = null;
        }
      }
    }
  }

  // Create singleton instance for application use
  const instance = new LyricsManager();

  return {
    LyricsManager,
    instance,
    LyricModels,
    LyricsProvider,
    LyricsPlusProvider,
    LyricEngine,
    ExistingWaterfallProvider
  };
});
