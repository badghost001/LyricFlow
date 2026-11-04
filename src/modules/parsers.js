/**
 * LyricFlow - Parsers Module (LRC, Musixmatch, LyricsPlus)
 */

/**
 * Detects whether a lyric line represents contributor credits, production metadata,
 * or non-lyric structural information (e.g. Composer, Lyricist, Producer, OP, SP).
 */
function isLyricMetadataOrCreditLine(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (!t) return false;

  // 1. LRC ID tags
  if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(t)) return true;

  // 2. NetEase instrumental / system notice tags
  if (t.includes('纯音乐，请欣赏') || t.includes('此歌曲为没有填词的纯音乐')) return true;

  // 3. Multi-character Chinese credit tags followed by colon (: or ： or -)
  const chineseMultiRegex = /^\s*(作\s*词|作\s*曲|填\s*词|谱\s*曲|制\s*作\s*人|制\s*作|编\s*曲|混\s*音|母\s*带|监\s*制|录\s*音|和\s*声|和\s*音|弦\s*乐|吉\s*他|贝\s*斯|鼓\s*手|打\s*击\s*乐|键\s*盘|钢\s*琴|企\s*划|统\s*筹|文\s*案|发\s*行|出\s*品|版\s*权|鸣\s*谢|提\s*供|词\s*曲|词\s*\/\s*曲|原\s*唱|翻\s*唱|策\s*划|伴\s*奏|音\s*频|后\s*期|剪\s*辑|设\s*计|封\s*面|发\s*行\s*人|录\s*音\s*室|混\s*音\s*室|母\s*带\s*室|录\s*音\s*师|混\s*音\s*师|母\s*带\s*师)\s*[:：\-]/i;
  if (chineseMultiRegex.test(t)) return true;

  // 4. Single-character Chinese credit tags ("词" or "曲") followed by colon
  const chineseSingleRegex = /^\s*(词|曲)\s*[:：\-]/;
  if (chineseSingleRegex.test(t)) return true;

  // 5. English contributor credit phrases
  const englishPrefixRegex = /^\s*(written\s+by|lyrics?\s+by|composed?\s+by|produced?\s+by|arranged?\s+by|mixed?\s+by|mastered?\s+by|recorded?\s+by|engineered?\s+by|published?\s+by|released?\s+by|remixed?\s+by|performed?\s+by|songwriters?:|writers?:|samples?:|sampled\s+from:|lyricists?:|composers?:|producers?:|arrangers?:|audio\s+engineers?:|mixing\s+engineers?:|mastering\s+engineers?:|vocal\s+producers?:)/i;
  if (englishPrefixRegex.test(t)) return true;

  // 6. English role words followed by colon
  const englishRoleRegex = /^\s*(producer|producers|composer|composers|lyricist|lyricists|arranger|arrangers|mixer|mastering|engineer|vocals|backing\s+vocals|guitar|guitars|bass|drums|keyboard|keyboards|piano|strings|lyrics|music|op|sp)\s*[:：\-]/i;
  if (englishRoleRegex.test(t)) return true;

  return false;
}

/**
 * Cleans word/syllable token text:
 * 1. Collapses duplicate/repeated brackets (((, )), [[, ]], {{, }}, etc.) into single brackets.
 * 2. Removes internal spaces inside brackets within tokens.
 */
function cleanWordPunctuation(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;

  // Collapse duplicate/repeated consecutive brackets
  str = str
    .replace(/(?:\(\s*)+\(/g, '(')
    .replace(/(?:\)\s*)+\)/g, ')')
    .replace(/(?:\[\s*)+\[/g, '[')
    .replace(/(?:\]\s*)+\]/g, ']')
    .replace(/(?:\{\s*)+\{/g, '{')
    .replace(/(?:\}\s*)+\}/g, '}')
    .replace(/(?:（\s*)+（/g, '（')
    .replace(/(?:）\s*)+）/g, '）')
    .replace(/(?:【\s*)+【/g, '【')
    .replace(/(?:】\s*)+】/g, '】')
    .replace(/(?:《\s*)+《/g, '《')
    .replace(/(?:》\s*)+》/g, '》');

  while (/[\(\[\{（【《]\s*[\(\[\{（【《]/.test(str)) {
    str = str.replace(/[\(\[\{（【《]\s*[\(\[\{（【《]/g, '(');
  }
  while (/[\)\]\}）】》]\s*[\)\]\}）】》]/.test(str)) {
    str = str.replace(/[\)\]\}）】》]\s*[\)\]\}）】》]/g, ')');
  }

  // Remove internal spaces inside brackets within token
  str = str
    .replace(/([“‘«\(\{\[「『（【［｛《])[ \t]+/g, '$1')
    .replace(/[ \t]+([,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》])/g, '$1');

  return str;
}

/**
 * Cleans ground-truth lyric text by eliminating extraneous whitespace, double brackets,
 * spaces before/after brackets, spacing before punctuation, and artificial delimiters between continuous Hanzi.
 */
function cleanLyricText(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;

  // 1. Collapse duplicate/repeated consecutive brackets (with or without spaces between them)
  // Handles: ((, )), [[, ]], {{, }}, （（, ））, 【【, 】】, 《《, 》》, ( (, ) ), etc.
  str = str
    .replace(/(?:\(\s*)+\(/g, '(')
    .replace(/(?:\)\s*)+\)/g, ')')
    .replace(/(?:\[\s*)+\[/g, '[')
    .replace(/(?:\]\s*)+\]/g, ']')
    .replace(/(?:\{\s*)+\{/g, '{')
    .replace(/(?:\}\s*)+\}/g, '}')
    .replace(/(?:（\s*)+（/g, '（')
    .replace(/(?:）\s*)+）/g, '）')
    .replace(/(?:【\s*)+【/g, '【')
    .replace(/(?:】\s*)+】/g, '】')
    .replace(/(?:《\s*)+《/g, '《')
    .replace(/(?:》\s*)+》/g, '》');

  while (/[\(\[\{（【《]\s*[\(\[\{（【《]/.test(str)) {
    str = str.replace(/[\(\[\{（【《]\s*[\(\[\{（【《]/g, '(');
  }
  while (/[\)\]\}）】》]\s*[\)\]\}）】》]/.test(str)) {
    str = str.replace(/[\)\]\}）】》]\s*[\)\]\}）】》]/g, ')');
  }

  // 2. Collapse multiple spaces and tabs into a single space
  str = str.replace(/[ \t]+/g, ' ');

  // 3. Remove space inside brackets:
  // - after opening brackets/quotes: '( hello' -> '(hello'
  // - before closing brackets/quotes: 'hello )' -> 'hello)'
  str = str
    .replace(/([“‘«\(\{\[「『（【［｛《])[ \t]+/g, '$1')
    .replace(/[ \t]+([,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》])/g, '$1');

  // 4. Remove space between closing bracket and following punctuation: '(text) .' -> '(text).'
  str = str.replace(/([”’»\)}\]」』）】］｝》])[ \t]+([,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》])/g, '$1$2');

  // 5. Remove space before contraction apostrophe ('t, 's, 'm, 're, 've, 'll, 'd)
  str = str.replace(/[ \t]+(['’](?:t|s|m|re|ve|ll|d)\b)/gi, '$1');

  // 6. Remove artificial spaces between continuous Hanzi (Chinese characters)
  str = str.replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, '$1');

  return str.trim();
}

// Robust LRC Parser (handles Enhanced LRC syllable tags, bracket syllables, and legacy formats)
function parseLRC(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];

  // Extract [offset:+/-ms] tag if present (per standard LRC & Lyricify spec)
  // Positive offset: delays lyrics (adds offset to timestamps)
  // Negative offset: advances lyrics (subtracts offset from timestamps)
  let offsetMs = 0;
  const offsetMatch = lrcText.match(/\[offset:\s*([+-]?\d+)\s*\]/i);
  if (offsetMatch) {
    const parsedOffset = parseInt(offsetMatch[1], 10);
    if (!isNaN(parsedOffset)) {
      offsetMs = parsedOffset;
    }
  }

  const lines = lrcText.split('\n');
  const parsed = [];
  const tagTimeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g;

  // LRCLIB and some provider fallbacks return plain text rather than LRC.
  // Keep those lyrics visible with the unsynced sentinel instead of returning
  // an empty list and making the UI report that no lyrics exist.
  if (!tagTimeRegex.test(lrcText)) {
    return lines
      .map((line) => line
        .replace(/^\s*\[(?:ti|ar|al|by|offset|length|re|ve):[^\]]*\]\s*/ig, '')
        .replace(/^\s*\[(?:\d{1,2}:\d{2}(?:[.:]\d{2,3})?)\]/, '')
        .trim())
      .map(cleanLyricText)
      .filter((text) => text && !isLyricMetadataOrCreditLine(text) && !/^\[[^\]]+\]$/.test(text))
      .map((text) => ({ timeMs: 9999999, text }));
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. Extract leading line-level timestamps [mm:ss.xx]
    const lineTimestamps = [];
    let textStartIndex = 0;
    tagTimeRegex.lastIndex = 0;

    let m;
    while ((m = tagTimeRegex.exec(trimmed)) !== null) {
      if (m.index === textStartIndex) {
        const minutes = parseInt(m[1], 10);
        const seconds = parseInt(m[2], 10);
        const msPart = m[3] || "000";
        const ms = parseInt(msPart.padEnd(3, '0').substring(0, 3), 10);
        const rawMs = (minutes * 60 + seconds) * 1000 + ms;
        const totalMs = Math.max(0, rawMs + offsetMs);
        if (lineTimestamps.includes(totalMs)) {
          break; // Duplicate tag marks the start of bracket-based syllable tokens
        }
        lineTimestamps.push(totalMs);
        textStartIndex = tagTimeRegex.lastIndex;
      } else {
        break; // Reached text content; remaining tags are inline syllables
      }
    }

    if (lineTimestamps.length > 0) {
      const lineTime = lineTimestamps[0];
      const afterLineTags = trimmed.substring(textStartIndex).trim();
      let words = [];

      // Find first syllable tag candidate (either <mm:ss.xx> or [mm:ss.xx])
      const firstSylMatch = afterLineTags.match(/([<[])(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?([>\]])/);

      if (firstSylMatch) {
        const leadingText = afterLineTags.substring(0, firstSylMatch.index).trim();
        // If leading text is empty or pure opening punctuation/brackets (e.g. "(", "[", "\"", "“"),
        // this is PREFIX syllable format (<mm:ss.xx>word or [mm:ss.xx]word)
        const isPrefixFormat = !leadingText || /^[“‘«\(\{\[「『"'\s]+$/.test(leadingText);

        if (isPrefixFormat) {
          // Robust prefix syllable extraction:
          // Match all syllable tags and extract text strictly between consecutive tags
          // This ensures brackets, parentheses, and special characters inside words are never eaten or dropped!
          const sylTagRegex = /([<[])(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?([>\]])/g;
          const tags = [];
          let tagMatch;
          while ((tagMatch = sylTagRegex.exec(afterLineTags)) !== null) {
            const opener = tagMatch[1];
            const closer = tagMatch[5];
            if ((opener === '<' && closer === '>') || (opener === '[' && closer === ']')) {
              const min = parseInt(tagMatch[2], 10);
              const sec = parseInt(tagMatch[3], 10);
              const msStr = tagMatch[4] || "000";
              const ms = parseInt(msStr.padEnd(3, '0').substring(0, 3), 10);
              const rawSylMs = (min * 60 + sec) * 1000 + ms;
              const totalMs = Math.max(0, rawSylMs + offsetMs);
              tags.push({
                startIndex: tagMatch.index,
                endIndex: sylTagRegex.lastIndex,
                timeMs: totalMs
              });
            }
          }

          for (let ti = 0; ti < tags.length; ti++) {
            const curTag = tags[ti];
            const nextTag = tags[ti + 1];
            const wordRaw = afterLineTags.substring(curTag.endIndex, nextTag ? nextTag.startIndex : afterLineTags.length);
            const hasTrailingSpace = /\s$/.test(wordRaw);
            const hasLeadingSpace = /^\s/.test(wordRaw);
            let wordText = wordRaw.trim();

            // Prepend leading opening punctuation (e.g. "(") to the very first word
            if (ti === 0 && leadingText) {
              wordText = leadingText + wordText;
            }
            wordText = cleanWordPunctuation(wordText);

            if (wordText) {
              if (words.length > 0 && /^[,.!?;:’”'»\)}\]…~～、。，．！？–—"']+$/.test(wordText)) {
                words[words.length - 1].text = cleanWordPunctuation(words[words.length - 1].text.trimEnd() + wordText);
                if (hasTrailingSpace) {
                  words[words.length - 1].hasSpace = true;
                }
              } else {
                const isHyphenated = /[-–—]$/.test(wordText);
                if (words.length > 0 && hasLeadingSpace && !/[-–—]$/.test(words[words.length - 1].text)) {
                  words[words.length - 1].hasSpace = true;
                }
                words.push({
                  text: wordText,
                  timeMs: curTag.timeMs,
                  hasSpace: isHyphenated ? false : hasTrailingSpace
                });
              }
            } else if (words.length > 0) {
              // Trailing syllable tag without text explicitly marks the end time of the preceding word!
              words[words.length - 1].endMs = curTag.timeMs;
              words[words.length - 1].duration = Math.max(50, curTag.timeMs - words[words.length - 1].timeMs);
              words[words.length - 1]._explicitEnd = true;
            }
          }
        } else {
          // Postfix / Legacy format: text <mm:ss.xx> text <mm:ss.xx>
          const sylRegex = /<(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?>/g;
          let lastIdx = 0;
          let sylMatch;
          while ((sylMatch = sylRegex.exec(afterLineTags)) !== null) {
            const wordRaw = afterLineTags.substring(lastIdx, sylMatch.index);
            const wordText = wordRaw.trim();
            const min = parseInt(sylMatch[1], 10);
            const sec = parseInt(sylMatch[2], 10);
            const msStr = sylMatch[3] || "000";
            const ms = parseInt(msStr.padEnd(3, '0').substring(0, 3), 10);
            const totalMs = Math.max(0, (min * 60 + sec) * 1000 + ms + offsetMs);
            if (wordText) {
              const hasTrailingSpace = /\s$/.test(wordRaw);
              const isHyphenated = /[-–—]$/.test(wordText);
              words.push({ text: wordText, timeMs: totalMs, hasSpace: isHyphenated ? false : hasTrailingSpace });
            } else if (words.length > 0) {
              words[words.length - 1].endMs = totalMs;
              words[words.length - 1].duration = Math.max(50, totalMs - words[words.length - 1].timeMs);
              words[words.length - 1]._explicitEnd = true;
            }
            lastIdx = sylRegex.lastIndex;
          }
          const trailing = afterLineTags.substring(lastIdx).replace(sylRegex, '');
          const trailingTrim = trailing.trim();
          if (trailingTrim && words.length > 0) {
            words.push({ text: trailingTrim, timeMs: lineTime + 3000, hasSpace: false });
          }
        }
      }

      // Compute word endMs and duration using BetterLyrics-style resolution
      if (words.length > 0) {
        for (let wi = 0; wi < words.length; wi++) {
          if (words[wi].endMs && words[wi].duration && words[wi]._explicitEnd) {
            continue;
          }
          if (wi + 1 < words.length) {
            const nextStart = words[wi + 1].timeMs;
            const gap = Math.max(0, nextStart - words[wi].timeMs);
            // Inter-word pause protection:
            // If the gap to next word exceeds 2200ms, cap word singing duration to natural length
            // rather than stretching fill over an audible multi-second pause.
            if (gap > 2200) {
              const naturalDur = Math.max(400, Math.min(1800, (words[wi].text || '').length * 150 + 350));
              words[wi].endMs = words[wi].timeMs + naturalDur;
              words[wi].duration = naturalDur;
            } else {
              words[wi].endMs = nextStart;
              words[wi].duration = gap;
            }
          } else {
            const wordLen = (words[wi].text || '').trim().length;
            const naturalDur = Math.max(500, Math.min(2200, wordLen * 160 + 400));
            words[wi].endMs = words[wi].timeMs + naturalDur;
            words[wi].duration = naturalDur;
          }
        }
      }

      const rawClean = afterLineTags
        .replace(/<(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?>/g, '')
        .replace(/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g, '');

      // R4: Before collapsing multiple spaces, detect brackets preceded by 2+ spaces or a tab
      const secBracketMatch = rawClean.match(/^(.*?)(?:[ \t]{2,}|\t)((?:\([^()]+\)|\[[^\[\]]+\]|\{[^{}]+\})(?:[ \t]*(?:\([^()]+\)|\[[^\[\]]+\]|\{[^{}]+\}))*)\s*$/)
        || rawClean.match(/^(.*?)(?:[ \t]{2,}|\t)([\(\[\{（【][^\(\[\]\)\}）】]+[\)\]\}）】])\s*$/);
      let cleanText = '';
      let subText = undefined;
      let backingWords = undefined;
      let primaryWords = words;

      if (secBracketMatch) {
        cleanText = cleanLyricText(secBracketMatch[1]);
        subText = cleanLyricText(secBracketMatch[2]);

        // Map line.words to the primary vocal words
        if (words.length > 0) {
          let splitIdx = -1;
          for (let i = 1; i <= words.length; i++) {
            const candidate = cleanLyricText(words.slice(0, i).map(w => cleanWordPunctuation(w.text)).join(' '));
            if (candidate === cleanText) {
              splitIdx = i;
              break;
            }
          }
          if (splitIdx === -1) {
            for (let i = 0; i < words.length; i++) {
              const wt = cleanWordPunctuation(words[i].text).trim();
              if (/^[\(\[\{（【]/.test(wt)) {
                splitIdx = i;
                break;
              }
            }
          }
          if (splitIdx > 0) {
            primaryWords = words.slice(0, splitIdx);
            backingWords = words.slice(splitIdx);
          }
        }
      } else {
        cleanText = cleanLyricText(rawClean);
      }

      if (cleanText && !isLyricMetadataOrCreditLine(cleanText)) {
        for (const timeMs of lineTimestamps) {
          const lineWords = primaryWords.map(w => ({
            ...w,
            text: cleanWordPunctuation(w.text)
          }));
          const lineEntry = { timeMs, text: cleanText, words: lineWords };
          if (subText) {
            lineEntry.subText = subText; // legacy compatibility; migrated at fetch time
            lineEntry.backingText = subText;
          }
          if (backingWords?.length) lineEntry.backingWords = backingWords;
          parsed.push(lineEntry);
        }
      }
    }
  }

  parsed.sort((a, b) => a.timeMs - b.timeMs);

  // Refine final word's endMs to clamp against the start of the next line's vocal onset
  for (let li = 0; li < parsed.length; li++) {
    const curLine = parsed[li];
    const nextLine = parsed[li + 1];
    if (curLine.words && curLine.words.length > 0) {
      const lastW = curLine.words[curLine.words.length - 1];
      if (nextLine) {
        const nextVocalStart = (nextLine.words && nextLine.words.length > 0)
          ? nextLine.words[0].timeMs
          : nextLine.timeMs;
        if (lastW._explicitEnd) {
          if (lastW.endMs > nextVocalStart) {
            lastW.endMs = Math.max(lastW.timeMs + 50, nextVocalStart - 20);
            lastW.duration = Math.max(50, lastW.endMs - lastW.timeMs);
          }
        } else {
          if (nextVocalStart > lastW.timeMs) {
            lastW.endMs = Math.max(lastW.timeMs + 350, Math.min(lastW.endMs || (lastW.timeMs + 1500), nextVocalStart));
            lastW.duration = Math.max(100, lastW.endMs - lastW.timeMs);
          }
        }
      }
      delete lastW._explicitEnd;
    }
  }

  return parsed;
}

// Musixmatch JSON Parser (handles RichSync word-level timestamps)
function parseMusixmatch(data) {
  if (!data || !data.lyrics) return [];

  const parsed = data.lyrics
    .map(line => {
      const timeMs = parseInt(line.startTimeMs || 0);
      const text = (line.words || "").trim();

      // Filter out meta-lines or empty lines
      if (!text || isLyricMetadataOrCreditLine(text)) {
        return null;
      }

      let words = [];
      if (line.syllables && Array.isArray(line.syllables)) {
        words = line.syllables.map(s => ({
          text: s.text,
          timeMs: timeMs + (parseInt(s.offsetMs) || 0)
        }));
      }

      return { timeMs, text, words };
    })
    .filter(line => line !== null);

  parsed.sort((a, b) => a.timeMs - b.timeMs);
  return parsed;
}

// LyricsPlus JSON Parser (Deep-Scan for any word-level arrays)
function parseLyricsPlus(data) {
  if (!data) return [];

  let rawLines = [];
  if (Array.isArray(data)) rawLines = data;
  else rawLines = data.lyrics || data.lines || data.data || data.rows || [];

  if (!Array.isArray(rawLines)) return [];

  return rawLines.map(line => {
    const lineTimeMs = parseInt(line.startTimeMs || line.timeMs || (line.time * 1000) || line.offset || 0);

    // Extract text safely
    let text = "";
    if (typeof line.words === 'string') text = line.words;
    else if (typeof line.text === 'string') text = line.text;

    // DEEP-SCAN for word timing arrays
    let words = [];
    const timingArray = Object.values(line).find(val =>
      Array.isArray(val) && val.length > 0 && (typeof val[0] === 'object')
    );

    if (timingArray) {
      words = timingArray.map(w => {
        let wTime = parseInt(w.startTimeMs || w.timeMs || (w.time * 1000) || w.offsetMs || w.offset || w.t || 0);
        if (wTime < lineTimeMs && wTime < 60000) wTime += lineTimeMs;
        return {
          text: (w.text || w.string || w.word || w.w || "").trim(),
          timeMs: wTime
        };
      }).filter(w => w.text !== "");

      if (text.trim() === "" && words.length > 0) {
        text = words.map(w => w.text).join(" ");
      }
    } else if (text === "" && line.syllables) {
        text = line.syllables.map(s => s.text || "").join("");
    }

    // R4: Before collapsing multiple spaces, detect brackets preceded by 2+ spaces or a tab
    const secBracketMatch = text.match(/^(.*?)(?:[ \t]{2,}|\t)((?:\([^()]+\)|\[[^\[\]]+\]|\{[^{}]+\})(?:[ \t]*(?:\([^()]+\)|\[[^\[\]]+\]|\{[^{}]+\}))*)\s*$/)
      || text.match(/^(.*?)(?:[ \t]{2,}|\t)([\(\[\{（【][^\(\[\]\)\}）】]+[\)\]\}）】])\s*$/);
    let lineSubText = typeof line.subText === 'string' ? line.subText.trim() : undefined;
    let primaryWords = words;
    let backingWords = undefined;

    if (secBracketMatch) {
      text = secBracketMatch[1].trim();
      lineSubText = secBracketMatch[2].trim();

      if (words.length > 0) {
        let splitIdx = -1;
        for (let i = 1; i <= words.length; i++) {
          const candidate = words.slice(0, i).map(w => w.text).join(' ').trim();
          if (candidate === text) {
            splitIdx = i;
            break;
          }
        }
        if (splitIdx === -1) {
          for (let i = 0; i < words.length; i++) {
            if (/^[\(\[\{（【]/.test((words[i].text || '').trim())) {
              splitIdx = i;
              break;
            }
          }
        }
        if (splitIdx > 0) {
          primaryWords = words.slice(0, splitIdx);
          backingWords = words.slice(splitIdx);
        }
      }
    } else {
      text = text.trim();
    }

    const result = { timeMs: lineTimeMs, text, words: primaryWords };
    const rawSinger = line.singer || line.agent || line.vocalist || line.voice;
    if (rawSinger) result.singer = String(rawSinger).trim();
    if (lineSubText) result.subText = lineSubText;
    if (secBracketMatch) result.backingText = secBracketMatch[2].trim();
    else if (typeof line.backingText === 'string' && line.backingText.trim()) result.backingText = line.backingText.trim();
    if (backingWords?.length) result.backingWords = backingWords;
    return result;
  }).filter(l => l.text !== "" && !isLyricMetadataOrCreditLine(l.text));
}

// NetEase YRC Parser (word-by-word syllables)
function parseYRC(yrcText) {
  if (!yrcText || typeof yrcText !== 'string') return [];
  const lines = yrcText.split('\n');
  const parsed = [];
  const linePattern = /^\[(\d+),(\d+)\](.*)$/;
  const wordPattern = /\((\d+),(\d+),\d+\)([^(]*)/g;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const lineMatch = trimmed.match(linePattern);
    if (!lineMatch) continue;

    const lineStart = parseInt(lineMatch[1], 10);
    const lineDur = parseInt(lineMatch[2], 10);
    const content = lineMatch[3] || '';
    const words = [];

    let wordMatch;
    wordPattern.lastIndex = 0;
    while ((wordMatch = wordPattern.exec(content)) !== null) {
      const wStart = parseInt(wordMatch[1], 10);
      const wDur = parseInt(wordMatch[2], 10);
      const text = cleanWordPunctuation(wordMatch[3] || '');
      if (text) {
        if (words.length > 0 && /^[,.!?;:’”'»\)}\]…~～、。，．！？–—"']+$/.test(text.trim())) {
          const prev = words[words.length - 1];
          prev.text = cleanWordPunctuation(prev.text.trimEnd() + text);
          prev.endMs = Math.max(prev.endMs || 0, wStart + wDur);
          prev.duration = prev.endMs - prev.timeMs;
        } else {
          words.push({
            text,
            timeMs: wStart,
            endMs: wStart + wDur,
            duration: wDur
          });
        }
      }
    }

    const cleanText = cleanLyricText(words.map(w => w.text).join('').trim() || content.trim());
    if (cleanText && !isLyricMetadataOrCreditLine(cleanText)) {
      parsed.push({
        timeMs: lineStart,
        text: cleanText,
        words: words.length > 0 ? words : undefined
      });
    }
  }

  return parsed.sort((a, b) => a.timeMs - b.timeMs);
}

// Helper to convert YRC format into standard A2 Enhanced LRC format (<mm:ss.xx>word)
function yrcToEnhancedLRC(yrcText) {
  const parsed = parseYRC(yrcText);
  if (!parsed || parsed.length === 0) return '';
  return parsed.map(line => {
    const min = Math.floor(line.timeMs / 60000);
    const sec = Math.floor((line.timeMs % 60000) / 1000);
    const cs = Math.floor((line.timeMs % 1000) / 10);
    const lineTag = `[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}]`;
    if (!line.words || line.words.length === 0) {
      return `${lineTag} ${line.text}`;
    }
    const wordsPart = line.words.map(w => {
      const wMin = Math.floor(w.timeMs / 60000);
      const wSec = Math.floor((w.timeMs % 60000) / 1000);
      const wCs = Math.floor((w.timeMs % 1000) / 10);
      const wTag = `<${String(wMin).padStart(2, '0')}:${String(wSec).padStart(2, '0')}.${String(wCs).padStart(2, '0')}>`;
      return `${wTag}${w.text}`;
    }).join('');

    const lastW = line.words[line.words.length - 1];
    const endMs = lastW.endMs || (lastW.timeMs + (lastW.duration || 1000));
    const eMin = Math.floor(endMs / 60000);
    const eSec = Math.floor((endMs % 60000) / 1000);
    const eCs = Math.floor((endMs % 1000) / 10);
    const endTag = `<${String(eMin).padStart(2, '0')}:${String(eSec).padStart(2, '0')}.${String(eCs).padStart(2, '0')}>`;

    // Avoid injecting artificial space before trailing end tag
    return `${lineTag} ${wordsPart}${endTag}`;
  }).join('\n');
}

/**
 * Splits track artist string into individual artist names.
 * e.g. "Taylor Swift feat. Post Malone" -> ["Taylor Swift", "Post Malone"]
 * e.g. "Lady Gaga & Bradley Cooper" -> ["Lady Gaga", "Bradley Cooper"]
 */
function splitTrackArtists(artistStr) {
  if (!artistStr || typeof artistStr !== 'string') return [];
  const raw = artistStr.trim();
  if (!raw) return [];

  // Common collaborative delimiters
  const parts = raw.split(/\s+(?:feat\.?|ft\.?|featuring|with|vs\.?|x|\/|&|and)\s+|,\s*/i);
  const result = [];
  for (let part of parts) {
    let clean = part.replace(/^["']|["']$/g, '').trim();
    if (clean && !result.some(r => r.toLowerCase() === clean.toLowerCase())) {
      result.push(clean);
    }
  }
  return result;
}

/**
 * Resolves a singer identifier (e.g. "v1", "2", "Taylor", "Both") into a normalized singer object.
 */
function resolveSingerIdentifier(rawVal, knownArtists = []) {
  if (!rawVal || typeof rawVal !== 'string') {
    return { singer: 'Singer 1', singerId: 1, singerRole: 'primary' };
  }
  const v = rawVal.trim().toLowerCase();
  if (v === 'both' || v === 'all' || v === 'together' || v === 'unison' || v === 'duet' || v === 'chorus' || v === 'v1000' || v === 'v2000') {
    return { singer: 'Duet', singerId: 'both', singerRole: 'both' };
  }
  const numMatch = v.match(/^(?:v|singer|artist|agent)?\s*(\d+)$/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1000) {
      return { singer: 'Duet', singerId: 'both', singerRole: 'both' };
    }
    const role = num === 1 ? 'primary' : (num === 2 ? 'secondary' : 'tertiary');
    const singerName = (knownArtists && knownArtists[num - 1]) ? knownArtists[num - 1] : `Singer ${num}`;
    return { singer: singerName, singerId: num, singerRole: role };
  }
  // Check if rawVal matches any known artist name
  if (Array.isArray(knownArtists) && knownArtists.length > 0) {
    for (let i = 0; i < knownArtists.length; i++) {
      const art = knownArtists[i];
      if (art && (art.toLowerCase() === v || art.toLowerCase().includes(v) || v.includes(art.toLowerCase()))) {
        const role = i === 0 ? 'primary' : (i === 1 ? 'secondary' : 'tertiary');
        return { singer: art, singerId: i + 1, singerRole: role };
      }
    }
  }
  return { singer: rawVal.trim(), singerId: 2, singerRole: 'secondary' };
}

/**
 * Parses singer tags, role markers, or artist name prefixes from a lyric line.
 * Handles:
 * 1. [v1], [v2], [v3], [v:1], [v:2], [singer:1], [singer:Post Malone], [artist:2]
 * 2. v1:, v2:, Singer 1:, Singer 2:, Vocal 1 -
 * 3. Both:, [Both], (Both), All:, [All], Together:
 * 4. Known artist prefixes: "Lady Gaga: ...", "(Bradley Cooper) ...", "[Post Malone] ..."
 */
function parseSingerTag(lineText, knownArtists = []) {
  if (!lineText || typeof lineText !== 'string') return null;
  const t = lineText.trim();
  if (!t) return null;

  // 1. Bracket tags: [v1], [v2], [v:1], [v:2], [singer:1], [singer:name], [artist:1]
  const bracketMatch = t.match(/^\[(?:v|singer|artist|agent):?\s*([^\]]+)\]\s*(.*)$/i);
  if (bracketMatch) {
    const rawVal = bracketMatch[1].trim();
    const rest = bracketMatch[2].trim();
    const parsed = resolveSingerIdentifier(rawVal, knownArtists);
    return { ...parsed, cleanText: rest, matchedPrefix: bracketMatch[0].replace(rest, '').trim() };
  }

  // 2. Parentheses tags: (v1), (v2), (singer:1), (singer:name)
  const parenTagMatch = t.match(/^\((?:v|singer|artist|agent):?\s*([^)]+)\)\s*(.*)$/i);
  if (parenTagMatch) {
    const rawVal = parenTagMatch[1].trim();
    const rest = parenTagMatch[2].trim();
    const parsed = resolveSingerIdentifier(rawVal, knownArtists);
    return { ...parsed, cleanText: rest, matchedPrefix: parenTagMatch[0].replace(rest, '').trim() };
  }

  // 3. Colon / dash prefixes: v1:, v2:, Singer 1:, Singer 2:
  const prefixMatch = t.match(/^(?:v(\d+)|singer\s*(\d+)|vocal\s*(\d+))\s*[:：\-]\s*(.*)$/i);
  if (prefixMatch) {
    const num = parseInt(prefixMatch[1] || prefixMatch[2] || prefixMatch[3], 10);
    const rest = prefixMatch[4].trim();
    const role = num === 1 ? 'primary' : (num === 2 ? 'secondary' : 'tertiary');
    const singerName = (knownArtists && knownArtists[num - 1]) ? knownArtists[num - 1] : `Singer ${num}`;
    return { singer: singerName, singerId: num, singerRole: role, cleanText: rest, matchedPrefix: prefixMatch[0].replace(rest, '').trim() };
  }

  // 4. Both / All / Together / Chorus / Unison
  const bothMatch = t.match(/^(?:\[\s*(both|all|together|unison|duet)\s*\]|\(\s*(both|all|together|unison|duet)\s*\)|(?:both|all|together|unison|duet)\s*[:：\-])\s*[:：\-]?\s*(.*)$/i);
  if (bothMatch) {
    const rest = (bothMatch[3] !== undefined ? bothMatch[3] : bothMatch[2] || bothMatch[1] || '').trim();
    return { singer: 'Duet', singerId: 'both', singerRole: 'both', cleanText: rest, matchedPrefix: bothMatch[0].replace(rest, '').trim() };
  }

  // 4b. Bracket tags with section header + artist: [Verse 2: Drake], [Chorus: KAROL G], or [Drake]
  const sectionBracketMatch = t.match(/^\[\s*([^\]]+?)\s*\]\s*(.*)$/);
  if (sectionBracketMatch) {
    const inside = sectionBracketMatch[1].trim();
    const rest = sectionBracketMatch[2].trim();
    const isPureSection = /^(?:intro|outro|verse(?:\s*\d+)?|chorus(?:\s*\d+)?|bridge|hook|pre-chorus|instrumental|solo|breakdown|drop|interlude|coro|estrofa(?:\s*\d+)?|puente)$/i.test(inside);
    const colonSection = inside.match(/^(?:verse\s*\d*|chorus|coro|estrofa\s*\d*|bridge|hook|outro|intro)\s*[:：\-]\s*(.+)$/i);
    if (colonSection) {
      const singerPart = colonSection[1].trim();
      const parsed = resolveSingerIdentifier(singerPart, knownArtists);
      return { ...parsed, cleanText: rest, matchedPrefix: sectionBracketMatch[0].replace(rest, '').trim() };
    }
    const isMeta = /^(?:ti|ar|al|by|offset|length|re|ve):/i.test(inside);
    if (!isPureSection && !isMeta) {
      if (Array.isArray(knownArtists) && knownArtists.length > 0) {
        for (let i = 0; i < knownArtists.length; i++) {
          const art = knownArtists[i];
          if (art && (art.toLowerCase() === inside.toLowerCase() || art.toLowerCase().includes(inside.toLowerCase()) || inside.toLowerCase().includes(art.toLowerCase()))) {
            const role = i === 0 ? 'primary' : (i === 1 ? 'secondary' : 'tertiary');
            return { singer: art, singerId: i + 1, singerRole: role, cleanText: rest, matchedPrefix: sectionBracketMatch[0].replace(rest, '').trim() };
          }
        }
      }
      // Unrecognized bracketed text is often a section cue or vocal direction
      // (for example, [whispering]), so only known artists and explicit singer
      // markers should change the speaker lane.
    }
  }

  // 5. Match against known artists in metadata
  if (Array.isArray(knownArtists) && knownArtists.length > 0) {
    for (let i = 0; i < knownArtists.length; i++) {
      const artist = knownArtists[i];
      if (!artist || artist.length < 2) continue;
      const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // A: "Artist Name:" or "Artist Name -"
      const colonRegex = new RegExp(`^(?:\\[|\\()?\\s*${escaped}\\s*(?:\\]|\\))?\\s*[:：\\-]\\s*(.*)$`, 'i');
      const cm = t.match(colonRegex);
      if (cm) {
        const rest = cm[1].trim();
        const role = i === 0 ? 'primary' : (i === 1 ? 'secondary' : 'tertiary');
        return { singer: artist, singerId: i + 1, singerRole: role, cleanText: rest, matchedPrefix: cm[0].replace(rest, '').trim() };
      }

      // B: "[Artist Name] Rest of lyric" or "(Artist Name) Rest of lyric" or standalone "[Artist Name]" / "[Verse 2: Artist Name]"
      const bracketRegex = new RegExp(`^[\\[\\(]\\s*(?:(?:verse\\s*\\d*|chorus|coro|estrofa\\s*\\d*|bridge|hook|outro|intro)\\s*[:：\\-]?\\s*)?${escaped}\\s*[\\]\\)](?:\\s+(.*)|$)`, 'i');
      const bm = t.match(bracketRegex);
      if (bm) {
        const rest = (bm[1] || '').trim();
        const role = i === 0 ? 'primary' : (i === 1 ? 'secondary' : 'tertiary');
        return { singer: artist, singerId: i + 1, singerRole: role, cleanText: rest, matchedPrefix: bm[0].replace(rest, '').trim() };
      }

      // C: First name check if full name has multiple words and first name is unique
      const firstName = artist.split(/\s+/)[0];
      if (firstName && firstName.length >= 3 && !knownArtists.some((other, idx) => idx !== i && other.toLowerCase().includes(firstName.toLowerCase()))) {
        const fnEscaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const fnRegex = new RegExp(`^(?:\\[|\\()?\\s*${fnEscaped}\\s*(?:\\]|\\))?\\s*[:：\\-]\\s*(.*)$`, 'i');
        const fnm = t.match(fnRegex);
        if (fnm) {
          const rest = fnm[1].trim();
          const role = i === 0 ? 'primary' : (i === 1 ? 'secondary' : 'tertiary');
          return { singer: artist, singerId: i + 1, singerRole: role, cleanText: rest, matchedPrefix: fnm[0].replace(rest, '').trim() };
        }
      }
    }
  }

  return null;
}

/**
 * Processes an array of lyric lines and attributes multi-artist singers, duet roles,
 * and turn transitions when multiple artists are involved.
 */
function applyLyricsArtistSeparation(lines, artistInput) {
  if (!Array.isArray(lines) || lines.length === 0) return lines;

  const artistValues = Array.isArray(artistInput)
    ? artistInput.flatMap((item) => {
      if (typeof item === 'string') return [item];
      if (item && typeof item.name === 'string') return [item.name];
      return [];
    })
    : splitTrackArtists(artistInput);
  const knownArtists = [];
  for (const value of artistValues) {
    const clean = String(value || '').trim();
    if (clean && !knownArtists.some((artist) => artist.toLocaleLowerCase() === clean.toLocaleLowerCase())) {
      knownArtists.push(clean);
    }
  }

  // Only explicit line tags or singer properties can establish speaker lanes.
  // Track credits alone do not identify which singer performs each lyric line.
  let hasSingerTagsOrProps = lines.some(l => {
    if (!l) return false;
    if (l.singer || l.singerName || l.singerId != null || l.singerRole || l.agent || l.vocalist || l.voice || l.element?.singer || l.element?.agent) return true;
    const txt = l.text || '';
    return parseSingerTag(txt, knownArtists) !== null;
  });

  // Track credits without per-line attribution cannot safely be split by singer.
  if (!hasSingerTagsOrProps) {
    return lines;
  }

  // If this track has explicit duet attribution somewhere in the lyrics,
  // treat otherwise-unlabelled lines before the first tag as the lead artist.
  // This matches common qApple/LyricsPlus payloads that tag only guest verses.
  let currentSinger = knownArtists.length > 1
    ? { singer: knownArtists[0], singerId: 1, singerRole: 'primary' }
    : null;
  let previousSingerId = null;

  const filtered = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const rawText = line.text || '';
    const tagResult = parseSingerTag(rawText, knownArtists);

    if (tagResult) {
      currentSinger = {
        singer: tagResult.singer,
        singerId: tagResult.singerId,
        singerRole: tagResult.singerRole
      };
      if (tagResult.cleanText !== undefined) {
        line.text = tagResult.cleanText;
      }
      // If word-level timings exist, strip any word token that was part of the singer prefix tag
      if (Array.isArray(line.words) && line.words.length > 0 && tagResult.matchedPrefix) {
        const prefixLower = tagResult.matchedPrefix.toLowerCase();
        while (line.words.length > 0) {
          const firstWord = (line.words[0].text || line.words[0].word || '').trim().toLowerCase();
          if (!firstWord || prefixLower.includes(firstWord) || firstWord === '[' || firstWord === '(' || firstWord === ':' || firstWord === '-') {
            line.words.shift();
          } else {
            break;
          }
        }
      }
    } else if (line.singer || line.singerName || line.singerId != null || line.singerRole || line.agent || line.vocalist || line.voice || line.element?.singer || line.element?.agent) {
      const label = line.singer || line.singerName || line.agent || line.vocalist || line.voice || line.element?.singer || line.element?.agent;
      const rawVal = String(label || line.singerId || line.singerRole || '').trim();
      const resolved = resolveSingerIdentifier(rawVal, knownArtists);
      const explicitRole = ['primary', 'secondary', 'tertiary', 'both'].includes(String(line.singerRole || '').toLowerCase())
        ? String(line.singerRole).toLowerCase()
        : null;
      const singerRole = explicitRole || resolved.singerRole;
      const singerId = line.singerId != null
        ? line.singerId
        : (singerRole === 'primary' ? 1 : (singerRole === 'secondary' ? 2 : (singerRole === 'tertiary' ? 3 : resolved.singerId)));
      const indexedArtist = Number.isInteger(Number(singerId)) && Number(singerId) > 0
        ? knownArtists[Number(singerId) - 1]
        : null;
      const labelIsSingerIndex = /^(?:v|singer|artist|agent)?\s*\d+$/i.test(rawVal);
      currentSinger = {
        // LyricsPlus/qApple may provide singer="v1" / "v2" as a label.
        // Keep the resolved credit name for those indexed tags instead of
        // exposing the provider's internal identifier in the UI.
        singer: label && !labelIsSingerIndex ? String(label).trim() : (indexedArtist || resolved.singer),
        singerId,
        singerRole
      };
    }

    // Thoroughly strip any residual bracketed or colon-prefixed artist tags
    if (line.text) {
      line.text = line.text.replace(/^\[(?:(?:verse\s*\d*|chorus|coro|bridge|hook|outro|intro)\s*[:：\-]?\s*)?[^\]]+\]\s*/i, (match) => {
        const inside = match.replace(/[\[\]]/g, '').trim();
        const isTag = /^(?:v\d+|singer\s*\d+|both|duet|together|chorus)/i.test(inside) ||
          (knownArtists && knownArtists.some(a => a && (inside.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(inside.toLowerCase()))));
        return isTag ? '' : match;
      });
      line.text = line.text.replace(/^(?:v\d+|singer\s*\d+)\s*[:：\-]\s*/i, '');
      if (knownArtists && knownArtists.length > 0) {
        for (const art of knownArtists) {
          if (!art || art.length < 2) continue;
          const esc = art.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          line.text = line.text.replace(new RegExp(`^(?:\\[|\\()?\\s*${esc}\\s*(?:\\]|\\))?\\s*[:：\\-]\\s*`, 'i'), '');
        }
      }
      line.text = line.text.trim();
    }

    // If this line was purely a standalone section header (like "[Drake]" or "[Verse 2: Drake]")
    // that set the singer and has no lyric text or words remaining, omit it from the display list.
    const hasRemainingWords = Array.isArray(line.words) && line.words.some(w => (w.text || w.word || '').trim());
    if (!line.text && !hasRemainingWords) {
      continue;
    }

    if (currentSinger) {
      line.singer = currentSinger.singer;
      line.singerName = currentSinger.singer;
      line.singerId = currentSinger.singerId;
      line.singerRole = currentSinger.singerRole;

      const isTurnStart = previousSingerId !== currentSinger.singerId;
      line.singerTurnStart = isTurnStart;
      previousSingerId = currentSinger.singerId;
    }

    filtered.push(line);
  }

  return filtered;
}

// Expose on global window object and Node.js exports
if (typeof window !== 'undefined') {
  window.isLyricMetadataOrCreditLine = isLyricMetadataOrCreditLine;
  window.cleanLyricText = cleanLyricText;
  window.cleanWordPunctuation = cleanWordPunctuation;
  window.parseLRC = parseLRC;
  window.parseMusixmatch = parseMusixmatch;
  window.parseLyricsPlus = parseLyricsPlus;
  window.parseYRC = parseYRC;
  window.yrcToEnhancedLRC = yrcToEnhancedLRC;
  window.splitTrackArtists = splitTrackArtists;
  window.parseSingerTag = parseSingerTag;
  window.resolveSingerIdentifier = resolveSingerIdentifier;
  window.applyLyricsArtistSeparation = applyLyricsArtistSeparation;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isLyricMetadataOrCreditLine,
    cleanLyricText,
    cleanWordPunctuation,
    parseLRC,
    parseMusixmatch,
    parseLyricsPlus,
    parseYRC,
    yrcToEnhancedLRC,
    splitTrackArtists,
    parseSingerTag,
    resolveSingerIdentifier,
    applyLyricsArtistSeparation
  };
}
