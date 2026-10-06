/**
 * LyricFlow - LyricEngine
 * High-performance lyric synchronization engine.
 * Connects normalized lyrics to audio playback time with:
 * - O(1) continuous playhead stepping
 * - O(log N) binary search on seeking / jumps
 * - Precise word-level karaoke state tracking (upcoming, active, completed)
 * - Zero unnecessary DOM / UI re-renders
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LyricEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class LyricEngine {
    constructor() {
      this.lyrics = null;
      this.lines = [];
      this.type = 'LINE';

      this.currentLineIndex = -1;
      this.currentWordIndex = -1;
      this.lastTime = -1;
    }

    /**
     * Load normalized lyrics into the engine
     * @param {object|null} normalizedLyrics
     */
    setLyrics(normalizedLyrics) {
      this.lyrics = normalizedLyrics;
      this.lines = (normalizedLyrics && Array.isArray(normalizedLyrics.lines)) ? normalizedLyrics.lines : [];
      this.type = (normalizedLyrics && normalizedLyrics.type) ? normalizedLyrics.type : 'LINE';

      this.currentLineIndex = -1;
      this.currentWordIndex = -1;
      this.lastTime = -1;
    }

    /**
     * Clear loaded lyrics
     */
    clear() {
      this.setLyrics(null);
    }

    /**
     * Has lyrics loaded
     * @returns {boolean}
     */
    hasLyrics() {
      return this.lines.length > 0;
    }

    /**
     * Is the current lyrics word-synchronized
     * @returns {boolean}
     */
    isWordSynced() {
      return this.type === 'WORD' && this.lines.some(l => Array.isArray(l.words) && l.words.length > 0);
    }

    /**
     * Binary search to find the highest line index where line.start <= time
     * @private
     */
    _binarySearchLine(time) {
      const lines = this.lines;
      let low = 0;
      let high = lines.length - 1;
      let result = -1;

      while (low <= high) {
        const mid = (low + high) >> 1;
        if (lines[mid].start <= time) {
          result = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      // If binary search picked a line whose words haven't started singing yet,
      // but the previous line's words are still actively singing, stay on previous line!
      if (result > 0 && result < lines.length) {
        const prev = lines[result - 1];
        const cur = lines[result];
        if (Array.isArray(prev.words) && prev.words.length > 0) {
          const prevLastWord = prev.words[prev.words.length - 1];
          const curFirstWord = (Array.isArray(cur.words) && cur.words.length > 0) ? cur.words[0] : null;
          const curVocalStart = curFirstWord ? curFirstWord.start : cur.start;
          if (time < prevLastWord.end && time < curVocalStart) {
            result = result - 1;
          }
        }
      }

      return result;
    }

    /**
     * Find active word index within a line for the given time
     * @private
     */
    _findWordIndex(words, time) {
      if (!Array.isArray(words) || words.length === 0) return -1;

      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const nextStart = (i < words.length - 1) ? words[i + 1].start : Infinity;
        if (time >= w.start && time <= w.end && time < nextStart) {
          return i;
        }
      }

      // If time is past the last word but still in the line, or in a gap
      return -1;
    }

    /**
     * Update playback time (in seconds) and compute current synchronization state
     * Handles seeking forward, seeking backward, jumps, restarts, and smooth playback.
     *
     * @param {number} currentTime in seconds
     * @returns {object} Sync state
     */
    update(currentTime) {
      const time = Math.max(0, Number(currentTime) || 0);
      const lines = this.lines;

      if (lines.length === 0) {
        return {
          lineIndex: -1,
          currentLine: null,
          previousLine: null,
          nextLine: null,
          wordIndex: -1,
          currentWord: null,
          changedLine: false,
          changedWord: false
        };
      }

      const prevLineIndex = this.currentLineIndex;
      const prevWordIndex = this.currentWordIndex;
      let targetLineIndex = this.currentLineIndex;

      // 1. Check if time is before the very first line
      if (time < lines[0].start) {
        // Feature: highlight line 0 as upcoming before song start
        targetLineIndex = 0;
      }
      // 2. Fast Path: Check if time is still within the currently active line
      else if (targetLineIndex >= 0 && targetLineIndex < lines.length) {
        const curLine = lines[targetLineIndex];
        const nextLine = lines[targetLineIndex + 1];

        // Compute true vocal end for current line and vocal start for next line
        let curVocalEnd = curLine.end;
        if (Array.isArray(curLine.words) && curLine.words.length > 0) {
          const lw = curLine.words[curLine.words.length - 1];
          if (lw && lw.end && lw.end > 0) curVocalEnd = lw.end;
        }

        let nextVocalStart = nextLine ? nextLine.start : Infinity;
        if (nextLine && Array.isArray(nextLine.words) && nextLine.words.length > 0) {
          const fw = nextLine.words[0];
          if (fw && fw.start != null) nextVocalStart = fw.start;
        }

        // Prevent premature cutoff: do not advance to next line while current line's vocal is still singing
        // unless the next line's words have actually started.
        const switchPoint = nextLine
          ? ((curVocalEnd <= nextVocalStart) ? Math.max(curVocalEnd, Math.min(nextLine.start, nextVocalStart)) : nextVocalStart)
          : (curVocalEnd + 2.0);

        const isPastStart = time >= curLine.start;
        const isBeforeNext = time < switchPoint;

        if (isPastStart && isBeforeNext) {
          // Stay on current line!
        }
        // Stepped smoothly to next line?
        else if (nextLine && time >= switchPoint && (targetLineIndex + 2 >= lines.length || time < (lines[targetLineIndex + 2].start || Infinity))) {
          targetLineIndex++;
        }
        // Jump / seek detected -> fallback to fast O(log N) binary search
        else {
          targetLineIndex = this._binarySearchLine(time);
        }
      } else {
        // Initial lookup or reset -> O(log N) binary search
        targetLineIndex = this._binarySearchLine(time);
      }

      if (targetLineIndex < 0) {
        targetLineIndex = 0;
      } else if (targetLineIndex >= lines.length) {
        targetLineIndex = lines.length - 1;
      }

      this.currentLineIndex = targetLineIndex;
      const currentLine = lines[targetLineIndex] || null;
      const previousLine = targetLineIndex > 0 ? lines[targetLineIndex - 1] : null;
      const nextLine = targetLineIndex < lines.length - 1 ? lines[targetLineIndex + 1] : null;

      // 3. Word-level tracking when WORD synchronization is available
      let targetWordIndex = -1;
      let currentWord = null;

      if (this.isWordSynced() && currentLine && Array.isArray(currentLine.words) && currentLine.words.length > 0) {
        targetWordIndex = this._findWordIndex(currentLine.words, time);
        if (targetWordIndex >= 0) {
          currentWord = currentLine.words[targetWordIndex];
        }
      }

      this.currentWordIndex = targetWordIndex;
      this.lastTime = time;

      const changedLine = (prevLineIndex !== targetLineIndex);
      const changedWord = (prevWordIndex !== targetWordIndex);

      return {
        lineIndex: targetLineIndex,
        currentLine,
        previousLine,
        nextLine,
        wordIndex: targetWordIndex,
        currentWord,
        changedLine,
        changedWord
      };
    }

    /**
     * Get the state of a specific word at the given time
     * @param {number} lineIndex
     * @param {number} wordIndex
     * @param {number} currentTime in seconds
     * @returns {"upcoming"|"active"|"completed"}
     */
    getWordState(lineIndex, wordIndex, currentTime) {
      const line = this.lines[lineIndex];
      if (!line || !Array.isArray(line.words) || !line.words[wordIndex]) {
        return 'upcoming';
      }

      const word = line.words[wordIndex];
      const time = Number(currentTime) || 0;
      const nextWord = (wordIndex < line.words.length - 1) ? line.words[wordIndex + 1] : null;

      if (time < word.start) {
        return 'upcoming';
      } else if (nextWord ? (time >= word.start && time < nextWord.start && time <= word.end) : (time >= word.start && time <= word.end)) {
        return 'active';
      } else {
        return 'completed';
      }
    }

    /**
     * Get all word states for a given line at a specific time
     * @param {number} lineIndex
     * @param {number} currentTime in seconds
     * @returns {Array<"upcoming"|"active"|"completed">}
     */
    getLineWordStates(lineIndex, currentTime) {
      const line = this.lines[lineIndex];
      if (!line || !Array.isArray(line.words)) return [];

      const time = Number(currentTime) || 0;
      const count = line.words.length;
      return line.words.map((w, i) => {
        const nextW = (i < count - 1) ? line.words[i + 1] : null;
        if (time < w.start) return 'upcoming';
        if (nextW ? (time >= w.start && time < nextW.start && time <= w.end) : (time >= w.start && time <= w.end)) {
          return 'active';
        }
        return 'completed';
      });
    }
  }

  return LyricEngine;
});
