/**
 * LyricFlow - LyricsPlus Service & Provider (v2 Endpoint)
 * Endpoint: https://lyricsplus.prjktla.my.id/v2/lyrics/get
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const models = require('./models');
    const LyricsProvider = require('./LyricsProvider');
    module.exports = factory(models, LyricsProvider);
  } else {
    root.LyricsPlus = factory(root.LyricModels, root.LyricsProvider);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (LyricModels, LyricsProvider) {
  'use strict';

  const { createLyricWord, createLyricLine, createNormalizedLyrics } = LyricModels;

  const API_ENDPOINT = 'https://lyricsplus.prjktla.my.id/v2/lyrics/get';

  // Development-only logging helper
  const isDev = () => {
    try {
      if (typeof window !== 'undefined') {
        return window.__DEV__ === true || localStorage.getItem('lyricflow_debug') === 'true';
      }
      if (typeof process !== 'undefined' && process.env) {
        return process.env.NODE_ENV !== 'production';
      }
    } catch (_) {}
    return false;
  };

  const devLog = (...args) => {
    if (isDev()) {
      console.log(...args);
    }
  };

  /**
   * Normalize input metadata according to Priority:
   * 1. ISRC
   * 2. platformId
   * 3. title + artist + album + duration
   * 4. title + artist
   */
  function normalizeMetadata(raw) {
    if (!raw || typeof raw !== 'object') return {};

    const cleanStr = (s) => (typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : null);

    const title = cleanStr(raw.title || raw.name || raw.trackName);
    const artist = cleanStr(raw.artist || raw.artistName || (raw.artists?.[0]?.name) || (typeof raw.artists?.[0] === 'string' ? raw.artists[0] : null));
    const album = cleanStr(raw.album?.name || raw.album || raw.albumName);
    const isrc = cleanStr(raw.isrc || raw.external_ids?.isrc);
    const platformId = cleanStr(raw.platformId || raw.id);

    let duration = null;
    if (raw.duration !== undefined && raw.duration !== null) {
      duration = Number(raw.duration);
    } else if (raw.duration_ms !== undefined && raw.duration_ms !== null) {
      duration = Number(raw.duration_ms) / 1000;
    } else if (raw.durationMs !== undefined && raw.durationMs !== null) {
      duration = Number(raw.durationMs) / 1000;
    }

    if (duration !== null && (!Number.isFinite(duration) || duration <= 0)) {
      duration = null;
    } else if (duration !== null) {
      duration = Math.round(duration);
    }

    const source = cleanStr(raw.source);

    return {
      title,
      artist,
      album,
      duration,
      isrc,
      platformId,
      source
    };
  }

  /**
   * Generate stable cache key for lyrics
   * Prefer ISRC, then artist + title + duration
   */
  function getCacheKey(meta) {
    if (meta.isrc && meta.isrc.trim()) {
      return `lyrics_plus_isrc_${meta.isrc.trim().toUpperCase()}`;
    }
    const cleanA = (meta.artist || '').toLowerCase().trim();
    const cleanT = (meta.title || '').toLowerCase().trim();
    const dur = meta.duration ? Math.round(Number(meta.duration)) : 0;
    return `lyrics_plus_track_${encodeURIComponent(cleanA)}_${encodeURIComponent(cleanT)}_${dur}`;
  }

  /**
   * Convert arbitrary time in ms or seconds to normalized seconds
   */
  function toSeconds(val, isDuration = false) {
    if (typeof val !== 'number') {
      val = parseFloat(val) || 0;
    }
    if (isDuration) {
      return val >= 40 ? val / 1000 : val;
    }
    return val >= 500 ? val / 1000 : val;
  }

  /**
   * Dedicated LyricsPlus service handling requests, responses, normalization and caching
   */
  class LyricsPlusService {
    constructor(options = {}) {
      this.endpoint = options.endpoint || API_ENDPOINT;
      this.timeoutMs = options.timeoutMs || 2500;
    }

    /**
     * Build the safe, URL-encoded request URL
     */
    buildRequestUrl(metadata) {
      const meta = normalizeMetadata(metadata);
      if (!meta.title || !meta.artist) {
        throw new Error('LyricsPlus requires at least track title and artist');
      }

      const params = new URLSearchParams();
      params.set('title', meta.title);
      params.set('artist', meta.artist);

      if (meta.album) params.set('album', meta.album);
      if (meta.duration && meta.duration > 0) params.set('duration', String(meta.duration));
      if (meta.isrc) params.set('isrc', meta.isrc);
      if (meta.platformId) params.set('platformId', meta.platformId);
      if (meta.source) params.set('source', meta.source);

      return `${this.endpoint}?${params.toString()}`;
    }

    /**
     * Retrieve normalized lyrics from cache if available
     */
    getCached(metadata) {
      const meta = normalizeMetadata(metadata);
      const key = getCacheKey(meta);
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
              devLog(`[lyrics] cache hit: ${meta.artist} - ${meta.title}`);
              return parsed;
            }
          }
        }
      } catch (_) {}
      return null;
    }

    /**
     * Save normalized lyrics to persistent storage
     */
    setCached(metadata, lyrics) {
      if (!lyrics || !Array.isArray(lyrics.lines) || lyrics.lines.length === 0) return;
      const meta = normalizeMetadata(metadata);
      const key = getCacheKey(meta);
      try {
        const payload = JSON.stringify(lyrics);
        if (typeof window !== 'undefined' && typeof window.safeStorageSet === 'function') {
          window.safeStorageSet(key, payload);
        } else if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, payload);
        }
      } catch (err) {
        devLog('[lyrics] cache write error:', err);
      }
    }

    /**
     * Invalidate cached lyrics for a track
     */
    invalidateCache(metadata) {
      const meta = normalizeMetadata(metadata);
      const key = getCacheKey(meta);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (_) {}
    }

    /**
     * Fetch lyrics from LyricsPlus API
     * @param {object} metadata
     * @param {object} [options]
     * @param {AbortSignal} [options.signal]
     * @param {boolean} [options.forceRefresh]
     * @returns {Promise<object|null>}
     */
    async fetch(metadata, options = {}) {
      const meta = normalizeMetadata(metadata);
      if (!meta.title || !meta.artist) {
        devLog('[lyrics] lyrics unavailable: missing title or artist');
        return null;
      }

      // Check cache first if not forced refresh
      if (!options.forceRefresh) {
        const cached = this.getCached(meta);
        if (cached) return cached;
      }

      const url = this.buildRequestUrl(meta);
      devLog(`[lyrics] fetching LyricsPlus: ${url}`);

      // Setup AbortController with timeout
      const controller = new AbortController();
      let timeoutId = null;

      const onExternalAbort = () => {
        controller.abort();
      };

      if (options.signal) {
        if (options.signal.aborted) {
          devLog('[lyrics] request cancelled');
          return null;
        }
        options.signal.addEventListener('abort', onExternalAbort);
      }

      timeoutId = setTimeout(() => {
        controller.abort();
      }, this.timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (options.signal) {
          options.signal.removeEventListener('abort', onExternalAbort);
        }

        if (response.status === 404) {
          devLog('[lyrics] lyrics unavailable (404 from LyricsPlus)');
          return null;
        }

        if (!response.ok) {
          devLog(`[lyrics] lyrics unavailable (HTTP ${response.status})`);
          return null;
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          devLog('[lyrics] lyrics unavailable: malformed JSON response', jsonErr);
          return null;
        }

        const normalized = this.normalizeResponse(data, meta);
        if (normalized) {
          if (normalized.type === 'WORD') {
            devLog(`[lyrics] found WORD lyrics (${normalized.lines.length} lines) from ${normalized.source}`);
          } else {
            devLog(`[lyrics] found LINE lyrics (${normalized.lines.length} lines) from ${normalized.source}`);
          }
          this.setCached(meta, normalized);
          return normalized;
        } else {
          devLog('[lyrics] lyrics unavailable: empty or unsupported result');
          return null;
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (options.signal) {
          options.signal.removeEventListener('abort', onExternalAbort);
        }

        if (err.name === 'AbortError' || controller.signal.aborted) {
          devLog('[lyrics] request cancelled');
          return null;
        }

        devLog('[lyrics] fetch error:', err.message || err);
        return null;
      }
    }

    /**
     * Normalize the raw LyricsPlus v2 JSON response into the NormalizedLyrics model.
     * Handles:
     * - Word-level synchronization (type: "Word") with syllables/words
     * - Line-level synchronization (type: "Line") without faking word timings
     * - Timestamp conversion to seconds
     * - Durations and line bounding
     */
    normalizeResponse(data, meta = {}) {
      if (!data || typeof data !== 'object') return null;

      // Handle explicit error responses
      if (data.error) {
        return null;
      }

      // Check lines array
      let rawLines = [];
      if (Array.isArray(data.lyrics)) {
        rawLines = data.lyrics;
      } else if (Array.isArray(data.lines)) {
        rawLines = data.lines;
      } else if (Array.isArray(data.data)) {
        rawLines = data.data;
      }

      if (!Array.isArray(rawLines) || rawLines.length === 0) {
        return null;
      }

      const winnerSource = data.processingTime?.winnerSource || data.selectedSongMetadata?.source || 'LyricsPlus';
      const sourceLabel = `LyricsPlus (${winnerSource})`;

      const isWordType = String(data.type || '').toLowerCase() === 'word';
      const parsedLines = [];

      for (let i = 0; i < rawLines.length; i++) {
        const item = rawLines[i];
        if (!item || typeof item !== 'object') continue;

        // Line start and duration
        const lineStartSec = toSeconds(item.time !== undefined ? item.time : (item.startTimeMs || item.start || 0), false);
        let lineDurSec = toSeconds(item.duration !== undefined ? item.duration : (item.durationMs || 0), true);

        // If line duration is not explicitly provided, estimate from next line
        if (lineDurSec <= 0) {
          if (i < rawLines.length - 1 && rawLines[i + 1]?.time !== undefined) {
            const nextStart = toSeconds(rawLines[i + 1].time, false);
            lineDurSec = Math.max(0.5, Math.min(nextStart - lineStartSec, 8.0));
          } else {
            lineDurSec = 4.0;
          }
        }

        const lineEndSec = lineStartSec + lineDurSec;
        const lineText = String(item.text || item.words || '').trim();
        if (!lineText) continue;

        // Process word-level timing if this is a word-synced response
        let words = undefined;
        const rawWords = Array.isArray(item.syllabus) ? item.syllabus : (Array.isArray(item.words) ? item.words : (Array.isArray(item.syllables) ? item.syllables : null));

        if (isWordType && Array.isArray(rawWords) && rawWords.length > 0) {
          const parsedWords = [];
          for (let wi = 0; wi < rawWords.length; wi++) {
            const w = rawWords[wi];
            if (!w || typeof w !== 'object') continue;

            const wText = String(w.text || w.word || '').trim();
            if (!wText) continue;

            const wStart = toSeconds(w.time !== undefined ? w.time : (w.startTimeMs || w.start || lineStartSec), false);
            let wDur = toSeconds(w.duration !== undefined ? w.duration : (w.durationMs || 0), true);

            if (wDur <= 0) {
              if (wi < rawWords.length - 1 && rawWords[wi + 1]?.time !== undefined) {
                const nextWStart = toSeconds(rawWords[wi + 1].time, false);
                wDur = Math.max(0.1, nextWStart - wStart);
              } else {
                wDur = Math.max(0.1, lineEndSec - wStart);
              }
            }

            const wEnd = wStart + wDur;
            parsedWords.push(createLyricWord(wText, wStart, wEnd));
          }

          if (parsedWords.length > 0) {
            words = parsedWords;
          }
        }

        parsedLines.push(createLyricLine(lineText, lineStartSec, lineEndSec, words));
      }

      if (parsedLines.length === 0) return null;

      // Determine overall normalized type:
      // If marked as WORD and has actual word timings -> "WORD"
      // Otherwise -> "LINE"
      const hasActualWordTimings = parsedLines.some(l => Array.isArray(l.words) && l.words.length > 0);
      const finalType = (isWordType && hasActualWordTimings) ? "WORD" : "LINE";

      return createNormalizedLyrics(finalType, parsedLines, sourceLabel, {
        winnerSource,
        metadata: data.selectedSongMetadata || meta
      });
    }
  }

  /**
   * LyricsPlusProvider implementing the LyricsProvider contract
   */
  class LyricsPlusProvider extends LyricsProvider {
    constructor(options = {}) {
      super('LyricsPlus');
      this.service = new LyricsPlusService(options);
    }

    async getLyrics(trackMetadata, options = {}) {
      return await this.service.fetch(trackMetadata, options);
    }
  }

  return {
    LyricsPlusService,
    LyricsPlusProvider,
    normalizeMetadata,
    getCacheKey,
    toSeconds
  };
});
