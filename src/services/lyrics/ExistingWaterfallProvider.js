/**
 * LyricFlow - ExistingWaterfallProvider
 * Adapts existing multi-provider system (Rust engine, Cloudflare proxy, LRCLIB, NetEase)
 * into the standardized LyricsProvider interface.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const models = require('./models');
    const LyricsProvider = require('./LyricsProvider');
    module.exports = factory(models, LyricsProvider);
  } else {
    root.ExistingWaterfallProvider = factory(root.LyricModels, root.LyricsProvider);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (LyricModels, LyricsProvider) {
  'use strict';

  const { createLyricWord, createLyricLine, createNormalizedLyrics } = LyricModels;

  class ExistingWaterfallProvider extends LyricsProvider {
    constructor() {
      super('ExistingWaterfall');
    }

    /**
     * Convert legacy parsed line items ({ timeMs, text, words: [{ text, timeMs }] })
     * into the standard NormalizedLyrics structure.
     */
    static toNormalized(parsedLines, providerName = 'Waterfall', syncType = null) {
      if (!Array.isArray(parsedLines) || parsedLines.length === 0) return null;

      const lines = [];
      const isWordType = syncType === 'WORD_SYNCED' || parsedLines.some(l => Array.isArray(l.words) && l.words.length > 0);

      for (let i = 0; i < parsedLines.length; i++) {
        const item = parsedLines[i];
        if (!item || !item.text) continue;

        const startSec = Math.max(0, (Number(item.timeMs || item.start * 1000 || 0)) / 1000);
        let endSec = startSec + 4.0;

        if (i < parsedLines.length - 1 && parsedLines[i + 1]?.timeMs !== undefined) {
          endSec = Math.max(startSec + 0.5, parsedLines[i + 1].timeMs / 1000);
        }

        let words = undefined;
        if (Array.isArray(item.words) && item.words.length > 0) {
          words = [];
          for (let wi = 0; wi < item.words.length; wi++) {
            const w = item.words[wi];
            const wStart = Math.max(startSec, (Number(w.timeMs || 0)) / 1000);
            let wEnd = wStart + 0.3;
            if (wi < item.words.length - 1 && item.words[wi + 1]?.timeMs !== undefined) {
              wEnd = Math.max(wStart + 0.05, item.words[wi + 1].timeMs / 1000);
            } else {
              wEnd = endSec;
            }
            words.push(createLyricWord(w.text, wStart, wEnd));
          }
        }

        lines.push(createLyricLine(item.text, startSec, endSec, words, item.subText));
      }

      if (lines.length === 0) return null;

      const hasWords = lines.some(l => Array.isArray(l.words) && l.words.length > 0);
      const finalType = (isWordType && hasWords) ? 'WORD' : 'LINE';

      return createNormalizedLyrics(finalType, lines, providerName);
    }

    async getLyrics(trackMetadata, options = {}) {
      // In renderer runtime, this can delegate to the existing waterfall or window.fetchExistingLyrics
      if (typeof window !== 'undefined' && typeof window.fetchExistingWaterfallLyrics === 'function') {
        try {
          return await window.fetchExistingWaterfallLyrics(trackMetadata, options);
        } catch (_) {
          return null;
        }
      }
      return null;
    }
  }

  return ExistingWaterfallProvider;
});
