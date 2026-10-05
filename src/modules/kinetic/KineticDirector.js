/**
 * LyricFlow - Kinetic Director Engine
 * Sequencer and classifier that transforms Enhanced LRC / YRC word timestamps into
 * rhythmic, beat-locked kinetic scenes matching the reference art direction.
 * Automatically classifies lyric lines into:
 * - Morph Intro (0s - 3.5s or pre-vocal duration)
 * - Style A (Narrative editorial lowercase serif)
 * - Style B (Display ultra-condensed punch word)
 * - Style C (Split-card climax reveal with album art)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KineticDirector = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Cleans punctuation and whitespace from lyric token.
   */
  function cleanToken(str) {
    return (str || '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
  }

  /**
   * Classifies a phrase or line into Style A, Style B, or Style C.
   */
  function classifyPhrase(lineText, words = [], isClimaxCandidate = false) {
    const raw = (lineText || '').trim();
    const tokenList = words && words.length ? words.map((w) => w.text) : raw.split(/\s+/).filter(Boolean);

    // Climax candidate (e.g. has '?' or marked by user / director)
    if (isClimaxCandidate || raw.includes('?')) {
      return {
        style: 'styleC',
        primaryText: raw.replace(/\?$/, '?').toUpperCase(),
        secondaryText: ''
      };
    }

    // Single punch word (e.g. "CHANGE", "BY", "STOP")
    if (tokenList.length === 1) {
      return {
        style: 'styleB',
        primaryText: raw.toUpperCase(),
        secondaryText: ''
      };
    }

    // Exclamation / all-caps punch
    if (raw.endsWith('!') || (raw.length > 2 && raw === raw.toUpperCase() && tokenList.length <= 2)) {
      return {
        style: 'styleB',
        primaryText: raw.replace(/!+$/, '').toUpperCase(),
        secondaryText: ''
      };
    }

    // 2-word phrase
    if (tokenList.length === 2) {
      const conversational = new Set(['you', 'know', 'i', 'think', 'maybe', 'we', 'are', 'and', 'so', 'oh', 'yeah', 'if', 'it']);
      const isConversational = tokenList.every((w) => conversational.has(w.toLowerCase().trim()));
      if (isConversational) {
        return {
          style: 'styleA',
          primaryText: raw.toLowerCase(),
          secondaryText: ''
        };
      }
      const w1 = tokenList[0], w2 = tokenList[1];
      if (Math.abs(w1.length - w2.length) >= 3) {
        const punch = w1.length > w2.length ? w1 : w2;
        const helper = w1.length > w2.length ? w2 : w1;
        return {
          style: 'styleB',
          primaryText: punch.toUpperCase(),
          secondaryText: helper,
          secondaryPosition: w1.length > w2.length ? 'below' : 'above'
        };
      }
      return {
        style: 'styleA',
        primaryText: raw.toLowerCase(),
        secondaryText: ''
      };
    }

    // Check if line contains a dominant punch word with small helper words (e.g. "you're on my")
    if (tokenList.length === 3) {
      const helperWords = new Set(['on', 'in', 'at', 'by', 'my', 'the', 'a', 'an', 'to', 'of', 'for', 'and', 'or', 'so']);
      const helpers = tokenList.filter((w) => helperWords.has(w.toLowerCase().trim()));
      if (helpers.length >= 1) {
        const punchWord = tokenList.reduce((max, w) => w.length > max.length ? w : max, tokenList[0]);
        const otherWords = tokenList.filter((w) => w !== punchWord).join(' ');
        const punchIdx = tokenList.indexOf(punchWord);
        return {
          style: 'styleB',
          primaryText: punchWord.toUpperCase(),
          secondaryText: otherWords,
          secondaryPosition: punchIdx === 0 ? 'below' : 'above'
        };
      }
    }

    // Default to narrative stacked serif
    return {
      style: 'styleA',
      primaryText: raw.toLowerCase(),
      secondaryText: ''
    };
  }

  /**
   * Partitions an array of word objects or token strings into 1-to-3 word chunks,
   * matching the rapid, rhythmic, editorial visual cuts of the reference video.
   */
  function chunkIntoPhrases(tokens) {
    if (!tokens || !tokens.length) return [];
    if (tokens.length <= 3) return [tokens];

    const chunks = [];
    let i = 0;
    while (i < tokens.length) {
      const rem = tokens.length - i;
      if (rem <= 3) {
        chunks.push(tokens.slice(i));
        break;
      }

      if (rem === 4) {
        // Balanced 2 + 2 for visual harmony
        chunks.push(tokens.slice(i, i + 2));
        chunks.push(tokens.slice(i + 2, i + 4));
        break;
      }

      const w0 = typeof tokens[i] === 'string' ? tokens[i] : (tokens[i].text || '');
      const clean0 = cleanToken(w0);
      const isPunch0 = clean0.length > 2 && (clean0 === clean0.toUpperCase() || w0.endsWith('!') || clean0.length >= 8);

      // If current word is a standalone punch word, give it its own cut
      if (isPunch0 && rem >= 2) {
        chunks.push(tokens.slice(i, i + 1));
        i += 1;
        continue;
      }

      // Check punctuation boundaries
      const w1 = typeof tokens[i + 1] === 'string' ? tokens[i + 1] : (tokens[i + 1].text || '');
      const w2 = (i + 2 < tokens.length) ? (typeof tokens[i + 2] === 'string' ? tokens[i + 2] : (tokens[i + 2].text || '')) : '';

      if (/[.,;:!?—-]/.test(w0)) {
        chunks.push(tokens.slice(i, i + 1));
        i += 1;
      } else if (/[.,;:!?—-]/.test(w1)) {
        chunks.push(tokens.slice(i, i + 2));
        i += 2;
      } else if (/[.,;:!?—-]/.test(w2)) {
        chunks.push(tokens.slice(i, i + 3));
        i += 3;
      } else {
        // Rhythmic alternation: 2 or 3 words
        let take = 2;
        if (rem % 2 !== 0 && rem - 3 !== 1) {
          take = 3;
        } else if (rem >= 6 && clean0.length <= 3) {
          take = 3;
        }
        chunks.push(tokens.slice(i, i + take));
        i += take;
      }
    }
    return chunks;
  }

  /**
   * Builds an executable timeline of scenes from a slice of lyrics.
   * options:
   *   startTimeMs: start of video or segment (default 0)
   *   endTimeMs: end of video or segment
   *   introDurationMs: duration for the shape morph intro (default 3500ms)
   *   artist: artist name
   *   title: track title
   */
  function buildTimeline(lyricsSlice = [], options = {}) {
    const {
      startTimeMs = 0,
      endTimeMs = null,
      introDurationMs = 3500,
      artist = '',
      title = '',
      creatorTag = ''
    } = options;

    const scenes = [];
    const SHAPE_KEYS = ['astroid', 'diamond', 'clover', 'rosette', 'heart', 'hexagon', 'circle'];
    let currentShapeIndex = options.initialShape ? Math.max(0, SHAPE_KEYS.indexOf(options.initialShape)) : 0;
    if (currentShapeIndex === -1) currentShapeIndex = 0;
    let currentShape = SHAPE_KEYS[currentShapeIndex];

    // 1. Intro Morph Scene (0ms to introDurationMs or first lyric start)
    const hasLyrics = Boolean(lyricsSlice.length);
    const isUnsynced = hasLyrics && (lyricsSlice[0].timeMs >= 9000000 || typeof lyricsSlice[0].timeMs !== 'number' || isNaN(lyricsSlice[0].timeMs));

    if (isUnsynced) {
      // Synthesize realistic 3.5s per line pacing for unsynced tracks
      const baseStart = startTimeMs + (skipIntroMorph ? 0 : introDurationMs);
      lyricsSlice.forEach((l, idx) => {
        l.timeMs = baseStart + idx * 3500;
        l.endMs = l.timeMs + 3200;
      });
    }

    let firstLyricStart = hasLyrics && typeof lyricsSlice[0].timeMs === 'number' && !isNaN(lyricsSlice[0].timeMs)
      ? lyricsSlice[0].timeMs
      : startTimeMs + introDurationMs;

    if (hasLyrics && Array.isArray(lyricsSlice[0].words) && lyricsSlice[0].words.length > 0) {
      const fw = lyricsSlice[0].words[0];
      const fwTime = (typeof fw.timeMs === 'number' ? fw.timeMs : (fw.start != null ? fw.start * 1000 : null));
      if (typeof fwTime === 'number' && !isNaN(fwTime)) {
        firstLyricStart = fwTime;
      }
    }

    const skipIntroMorph = Boolean(options.skipIntroMorph || options.isCinematic);
    const maxIntroAllowed = Math.max(0, firstLyricStart - startTimeMs);
    const actualIntroDuration = skipIntroMorph ? 0 : Math.min(introDurationMs, maxIntroAllowed);
    const introEnd = startTimeMs + actualIntroDuration;

    if (actualIntroDuration > 0) {
      scenes.push({
        id: 'scene_intro_morph',
        startTimeMs,
        endTimeMs: introEnd,
        style: 'morph',
        shapeType: currentShape,
        primaryText: '',
        secondaryText: '',
        artist,
        title
      });
    }

    // If no lyrics, build a continuous title scene so the card never sits blank
    if (!lyricsSlice.length) {
      const displayTitle = title || 'LyricFlow';
      const displayArtist = artist || '';
      scenes.push({
        id: 'scene_placeholder_track',
        index: 0,
        startTimeMs: introEnd,
        endTimeMs: endTimeMs || (startTimeMs + 3600000),
        style: displayTitle.length > 15 ? 'styleA' : 'styleB',
        shapeType: currentShape,
        primaryText: displayTitle.toUpperCase(),
        secondaryText: displayArtist,
        secondaryPosition: 'below',
        creatorTag: creatorTag || (artist ? `@${artist.replace(/\s+/g, '').toLowerCase()}` : ''),
        rawText: displayTitle
      });
      return scenes;
    }

    // If there is an intro gap before the first vocal, show track title/artist scene
    if (firstLyricStart > introEnd) {
      const displayTitle = title || 'LyricFlow';
      const displayArtist = artist || '';
      scenes.push({
        id: 'scene_intro_title',
        index: -1,
        startTimeMs: introEnd,
        endTimeMs: firstLyricStart,
        style: displayTitle.length > 15 ? 'styleA' : 'styleB',
        shapeType: currentShape,
        primaryText: displayTitle.toUpperCase(),
        secondaryText: displayArtist,
        secondaryPosition: 'below',
        creatorTag: creatorTag || (artist ? `@${artist.replace(/\s+/g, '').toLowerCase()}` : ''),
        rawText: displayTitle
      });
    }

    // Pick 1 hero climax candidate (e.g. line with '?' or midpoint line)
    let climaxIdx = lyricsSlice.findIndex((l) => (l.text || '').includes('?'));
    if (climaxIdx === -1 && lyricsSlice.length >= 3) {
      climaxIdx = Math.floor(lyricsSlice.length * 0.45);
    }

    // 2. Build cut scenes partitioned into 1 to 3 words at a time (reference video rhythm)
    for (let i = 0; i < lyricsSlice.length; i++) {
      const line = lyricsSlice[i];
      const hasTimedWords = Array.isArray(line.words) && line.words.length > 0 && typeof line.words[0].timeMs === 'number';

      const lineVocalStart = (hasTimedWords && typeof line.words[0].timeMs === 'number')
        ? line.words[0].timeMs
        : ((typeof line.timeMs === 'number' && !isNaN(line.timeMs)) ? line.timeMs : (introEnd + i * 2000));

      let lineVocalEnd = line.endMs;
      if (!lineVocalEnd || lineVocalEnd <= lineVocalStart) {
        if (hasTimedWords) {
          const lastWord = line.words[line.words.length - 1];
          lineVocalEnd = (lastWord && lastWord.endMs) ? lastWord.endMs : (lineVocalStart + 3500);
        } else {
          lineVocalEnd = lineVocalStart + 4000;
        }
      }

      const nextLine = lyricsSlice[i + 1];
      const nextLineStart = (i < lyricsSlice.length - 1 && nextLine)
        ? (Array.isArray(nextLine.words) && nextLine.words.length > 0 && typeof nextLine.words[0].timeMs === 'number'
            ? nextLine.words[0].timeMs
            : (typeof nextLine.timeMs === 'number' ? nextLine.timeMs : null))
        : null;

      const gapToNext = (nextLineStart !== null) ? (nextLineStart - lineVocalEnd) : 0;
      const isBreak = (gapToNext >= 1800);

      // When there is an interlude or break (>= 1.8s), hold the preceding lyrics active on screen
      // until right before the upcoming lyrics start (600-1400ms before next vocal), then execute the shape morph.
      // This eliminates abrupt halt, blankness, or frozen static shapes between vocal sections.
      const BREAK_MORPH_DURATION = Math.min(1400, Math.max(600, gapToNext - 400));
      const transitionStart = (isBreak && nextLineStart !== null)
        ? Math.max(lineVocalEnd, nextLineStart - BREAK_MORPH_DURATION)
        : null;

      const end = (nextLineStart !== null)
        ? (isBreak ? transitionStart : nextLineStart)
        : lineVocalEnd;

      const isClimaxLine = (i === climaxIdx);

      if (hasTimedWords) {
        const wordChunks = chunkIntoPhrases(line.words);
        for (let c = 0; c < wordChunks.length; c++) {
          const cWords = wordChunks[c];
          const cStart = (typeof cWords[0].timeMs === 'number') ? cWords[0].timeMs : lineVocalStart;
          
          let cEnd;
          if (c < wordChunks.length - 1) {
            const nextC = wordChunks[c + 1];
            cEnd = (nextC && nextC[0] && typeof nextC[0].timeMs === 'number')
              ? nextC[0].timeMs
              : (cWords[cWords.length - 1].endMs || cStart + 1200);
          } else {
            cEnd = end;
          }
          if (cEnd <= cStart) {
            cEnd = cStart + Math.max(350, (cWords[cWords.length - 1].endMs || cStart + 400) - cStart);
          }

          const cText = cWords.map(w => w.text).join(' ');
          const isClimax = (isClimaxLine && c === wordChunks.length - 1) || cText.includes('?');
          const classification = classifyPhrase(cText, cWords, isClimax);

          scenes.push({
            id: `scene_lyric_${i}_${c}`,
            index: i,
            chunkIndex: c,
            startTimeMs: cStart,
            endTimeMs: cEnd,
            style: classification.style,
            shapeType: currentShape,
            primaryText: classification.primaryText,
            secondaryText: classification.secondaryText,
            secondaryPosition: classification.secondaryPosition || 'below',
            creatorTag: creatorTag || (artist ? `@${artist.replace(/\s+/g, '').toLowerCase()}` : ''),
            rawText: cText,
            words: cWords
          });
        }
      } else {
        // Plain LRC line (no word timestamps)
        const rawTokens = (line.text || '').trim().split(/\s+/).filter(Boolean);
        if (rawTokens.length <= 3) {
          // 1 to 3 words: single scene
          const classification = classifyPhrase(line.text, [], isClimaxLine);
          scenes.push({
            id: `scene_lyric_${i}`,
            index: i,
            chunkIndex: 0,
            startTimeMs: lineVocalStart,
            endTimeMs: end,
            style: classification.style,
            shapeType: currentShape,
            primaryText: classification.primaryText,
            secondaryText: classification.secondaryText,
            secondaryPosition: classification.secondaryPosition || 'below',
            creatorTag: creatorTag || (artist ? `@${artist.replace(/\s+/g, '').toLowerCase()}` : ''),
            rawText: line.text,
            words: line.words || []
          });
        } else {
          // Partition rawTokens into 1 to 3 words
          const tokenChunks = chunkIntoPhrases(rawTokens);
          const totalChars = Math.max(1, rawTokens.reduce((sum, t) => sum + t.length, 0));
          const totalDur = Math.max(600, end - lineVocalStart);
          let cursor = lineVocalStart;

          for (let c = 0; c < tokenChunks.length; c++) {
            const cTokens = tokenChunks[c];
            const chunkChars = cTokens.reduce((sum, t) => sum + t.length, 0);
            let dur = (c === tokenChunks.length - 1)
              ? (end - cursor)
              : Math.round(totalDur * (chunkChars / totalChars));
            dur = Math.max(350, dur);
            const cStart = cursor;
            const cEnd = (c === tokenChunks.length - 1) ? Math.max(cStart + 350, end) : (cursor + dur);
            cursor = cEnd;

            // Synthesize timed words for word-level highlight
            const cDur = Math.max(1, cEnd - cStart);
            let wCur = cStart;
            const cWords = cTokens.map((tok, wIdx) => {
              const wDur = Math.round(cDur * (tok.length / Math.max(1, chunkChars)));
              const wStart = wCur;
              const wEnd = (wIdx === cTokens.length - 1) ? cEnd : (wCur + wDur);
              wCur = wEnd;
              return {
                text: tok,
                timeMs: wStart,
                endMs: wEnd,
                hasSpace: (wIdx < cTokens.length - 1)
              };
            });

            const cText = cTokens.join(' ');
            const isClimax = (isClimaxLine && c === tokenChunks.length - 1) || cText.includes('?');
            const classification = classifyPhrase(cText, cWords, isClimax);

            scenes.push({
              id: `scene_lyric_${i}_${c}`,
              index: i,
              chunkIndex: c,
              startTimeMs: cStart,
              endTimeMs: cEnd,
              style: classification.style,
              shapeType: currentShape,
              primaryText: classification.primaryText,
              secondaryText: classification.secondaryText,
              secondaryPosition: classification.secondaryPosition || 'below',
              creatorTag: creatorTag || (artist ? `@${artist.replace(/\s+/g, '').toLowerCase()}` : ''),
              rawText: cText,
              words: cWords
            });
          }
        }
      }

      // If there is a break before the next line, insert an animated shape transition scene right before upcoming lyrics and change shapes
      if (isBreak && transitionStart !== null) {
        currentShapeIndex = (currentShapeIndex + 1) % SHAPE_KEYS.length;
        currentShape = SHAPE_KEYS[currentShapeIndex];

        scenes.push({
          id: `scene_break_morph_${i}`,
          index: i,
          chunkIndex: -1,
          startTimeMs: transitionStart,
          endTimeMs: nextLineStart,
          style: 'break_morph',
          shapeType: currentShape,
          primaryText: '',
          secondaryText: '',
          artist,
          title
        });
      } else if ((i + 1) % 4 === 0) {
        // Also rotate shape across musical stanzas (every 4 lines) so faster songs also feature shape variety
        currentShapeIndex = (currentShapeIndex + 1) % SHAPE_KEYS.length;
        currentShape = SHAPE_KEYS[currentShapeIndex];
      }
    }

    // Sort by startTimeMs and ensure continuity
    scenes.sort((a, b) => a.startTimeMs - b.startTimeMs);

    return scenes;
  }

  /**
   * Finds active scene at given timestamp.
   */
  function getSceneAt(timeline, timeMs) {
    if (!timeline || !timeline.length) return null;

    if (timeMs <= timeline[0].startTimeMs) {
      return timeline[0];
    }

    for (let i = 0; i < timeline.length; i++) {
      const scene = timeline[i];
      if (timeMs >= scene.startTimeMs && timeMs < scene.endTimeMs) {
        return scene;
      }
    }

    // If timeMs falls into an unmapped gap between scenes or past end,
    // find the latest scene that has already started
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeMs >= timeline[i].startTimeMs) {
        return timeline[i];
      }
    }

    // Past the last scene, return the last one
    return timeline[timeline.length - 1];
  }

  return {
    cleanToken,
    classifyPhrase,
    chunkIntoPhrases,
    buildTimeline,
    getSceneAt
  };
});
