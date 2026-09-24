/**
 * LyricFlow - Provider-Independent Internal Lyric Models
 * Standard internal representation with timestamps in seconds.
 *
 * type LyricWord = {
 *   text: string;
 *   start: number; // in seconds
 *   end: number;   // in seconds
 * };
 *
 * type LyricLine = {
 *   text: string;
 *   start: number; // in seconds
 *   end: number;   // in seconds
 *   words?: LyricWord[];
 *   subText?: string;
 * };
 *
 * type Lyrics = {
 *   type: "WORD" | "LINE";
 *   lines: LyricLine[];
 *   source: string;
 *   metadata?: object;
 * };
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LyricModels = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Create a normalized LyricWord
   * @param {string} text
   * @param {number} start in seconds
   * @param {number} end in seconds
   * @returns {object}
   */
  function createLyricWord(text, start, end) {
    const s = Math.max(0, Number(start) || 0);
    const e = Math.max(s, Number(end) || s);
    return {
      text: String(text || '').trim(),
      start: Number(s.toFixed(3)),
      end: Number(e.toFixed(3)),
      // Backwards-compatible millisecond helper for existing components
      timeMs: Math.round(s * 1000)
    };
  }

  /**
   * Create a normalized LyricLine
   * @param {string} text
   * @param {number} start in seconds
   * @param {number} end in seconds
   * @param {Array} words optional array of LyricWord
   * @param {string} subText optional translation or romanization
   * @returns {object}
   */
  function createLyricLine(text, start, end, words = undefined, subText = undefined) {
    const s = Math.max(0, Number(start) || 0);
    const e = Math.max(s, Number(end) || s);
    const line = {
      text: String(text || '').trim(),
      start: Number(s.toFixed(3)),
      end: Number(e.toFixed(3)),
      // Backwards-compatible millisecond helper for existing components
      timeMs: Math.round(s * 1000)
    };

    if (Array.isArray(words) && words.length > 0) {
      line.words = words;
    }

    if (subText && typeof subText === 'string' && subText.trim()) {
      line.subText = subText.trim();
    }

    return line;
  }

  /**
   * Create a NormalizedLyrics container
   * @param {"WORD"|"LINE"} type
   * @param {Array} lines
   * @param {string} source
   * @param {object} metadata
   * @returns {object}
   */
  function createNormalizedLyrics(type, lines, source = "Unknown", metadata = {}) {
    const normType = (type === "WORD" || type === "Word") ? "WORD" : "LINE";
    const validLines = Array.isArray(lines) ? lines : [];

    // Ensure lines are sorted strictly by start time
    validLines.sort((a, b) => a.start - b.start);

    return {
      type: normType,
      lines: validLines,
      source: String(source || "Unknown"),
      metadata: metadata && typeof metadata === 'object' ? metadata : {}
    };
  }

  /**
   * Validate if an object conforms to the NormalizedLyrics model
   * @param {*} lyrics
   * @returns {boolean}
   */
  function isValidLyrics(lyrics) {
    if (!lyrics || typeof lyrics !== 'object') return false;
    if (lyrics.type !== "WORD" && lyrics.type !== "LINE") return false;
    if (!Array.isArray(lyrics.lines) || lyrics.lines.length === 0) return false;
    return typeof lyrics.source === 'string';
  }

  return {
    createLyricWord,
    createLyricLine,
    createNormalizedLyrics,
    isValidLyrics
  };
});
