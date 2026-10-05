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
  const englishPrefixRegex = /^\s*(written\s+by|lyrics?\s+by|composed?\s+by|produced?\s+by|arranged?\s+by|mixed?\s+by|mastered?\s+by|recorded?\s+by|engineered?\s+by|published?\s+by|released?\s+by|remixed?\s+by|performed?\s+by|songwriters?:|lyricists?:|composers?:|producers?:|arrangers?:|audio\s+engineers?:|mixing\s+engineers?:|mastering\s+engineers?:|vocal\s+producers?:)/i;
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
                if (words.length > 0 && hasLeadingSpace) {
                  words[words.length - 1].hasSpace = true;
                }
                words.push({
                  text: wordText,
                  timeMs: curTag.timeMs,
                  hasSpace: hasTrailingSpace
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
              words.push({ text: wordText, timeMs: totalMs, hasSpace: hasTrailingSpace });
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
      const cleanText = cleanLyricText(rawClean);

      if (cleanText && !isLyricMetadataOrCreditLine(cleanText)) {
        for (const timeMs of lineTimestamps) {
          const lineWords = words.map(w => ({
            ...w,
            text: cleanWordPunctuation(w.text)
          }));
          parsed.push({ timeMs, text: cleanText, words: lineWords });
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
          lastW.endMs = Math.min(lastW.endMs || (lastW.timeMs + 1500), nextVocalStart);
          lastW.duration = Math.max(100, lastW.endMs - lastW.timeMs);
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

    return { timeMs: lineTimeMs, text: text.trim(), words };
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
    yrcToEnhancedLRC
  };
}
