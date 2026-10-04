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

// Robust LRC Parser (handles Enhanced LRC syllable tags, bracket syllables, and legacy formats)
function parseLRC(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split('\n');
  const parsed = [];
  const tagTimeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g;
  const syllableTokenRegex = /([<[])(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?([>\]])([^<>[\]]*)/g;

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
        const totalMs = (minutes * 60 + seconds) * 1000 + ms;
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

      // Check if line begins with a syllable tag (Prefix format: <mm:ss.xx>word or [mm:ss.xx]word)
      const prefixMatch = afterLineTags.match(/^([<[])(\d{1,2}):(\d{2})/);
      if (prefixMatch) {
        syllableTokenRegex.lastIndex = 0;
        let tokenMatch;
        while ((tokenMatch = syllableTokenRegex.exec(afterLineTags)) !== null) {
          const min = parseInt(tokenMatch[2], 10);
          const sec = parseInt(tokenMatch[3], 10);
          const msStr = tokenMatch[4] || "000";
          const ms = parseInt(msStr.padEnd(3, '0').substring(0, 3), 10);
          const totalMs = (min * 60 + sec) * 1000 + ms;
          const text = (tokenMatch[6] || "").trim();
          if (text) {
            if (words.length > 0 && /^[,.!?;:’”'»\)}\]…~～、。，．！？–—"']+$/.test(text)) {
              words[words.length - 1].text += text;
            } else {
              words.push({ text, timeMs: totalMs });
            }
          }
        }
      } else if (/<(\d{1,2}):(\d{2})/.test(afterLineTags)) {
        // Postfix / Legacy format: text <mm:ss.xx> text <mm:ss.xx>
        const sylRegex = /<(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?>/g;
        let lastIdx = 0;
        let sylMatch;
        while ((sylMatch = sylRegex.exec(afterLineTags)) !== null) {
          const wordText = afterLineTags.substring(lastIdx, sylMatch.index).trim();
          if (wordText) {
            const min = parseInt(sylMatch[1], 10);
            const sec = parseInt(sylMatch[2], 10);
            const msStr = sylMatch[3] || "000";
            const ms = parseInt(msStr.padEnd(3, '0').substring(0, 3), 10);
            const totalMs = (min * 60 + sec) * 1000 + ms;
            words.push({ text: wordText, timeMs: totalMs });
          }
          lastIdx = sylRegex.lastIndex;
        }
        const trailing = afterLineTags.substring(lastIdx).replace(sylRegex, '').trim();
        if (trailing && words.length > 0) {
          words.push({ text: trailing, timeMs: lineTime + 3000 });
        }
      } else if (/\[(\d{1,2}):(\d{2})/.test(afterLineTags)) {
        // Inline bracket syllables inside text: e.g. "Hello [00:20.50]World"
        const bracketSylRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g;
        let lastIdx = 0;
        let bMatch;
        let nextTime = lineTime;
        while ((bMatch = bracketSylRegex.exec(afterLineTags)) !== null) {
          const wordText = afterLineTags.substring(lastIdx, bMatch.index).trim();
          if (wordText) {
            words.push({ text: wordText, timeMs: nextTime });
          }
          const min = parseInt(bMatch[1], 10);
          const sec = parseInt(bMatch[2], 10);
          const msStr = bMatch[3] || "000";
          const ms = parseInt(msStr.padEnd(3, '0').substring(0, 3), 10);
          nextTime = (min * 60 + sec) * 1000 + ms;
          lastIdx = bracketSylRegex.lastIndex;
        }
        const trailing = afterLineTags.substring(lastIdx).replace(bracketSylRegex, '').trim();
        if (trailing) {
          words.push({ text: trailing, timeMs: nextTime });
        }
      }

      // Compute word endMs and duration using BetterLyrics-style resolution
      if (words.length > 0) {
        for (let wi = 0; wi < words.length; wi++) {
          if (wi + 1 < words.length) {
            words[wi].endMs = words[wi + 1].timeMs;
            words[wi].duration = Math.max(0, words[wi].endMs - words[wi].timeMs);
          } else {
            words[wi].endMs = words[wi].timeMs + 1000;
            words[wi].duration = 1000;
          }
        }
      }

      const cleanText = afterLineTags
        .replace(/<(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?>/g, '')
        .replace(/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g, '')
        .trim();

      if (cleanText && !isLyricMetadataOrCreditLine(cleanText)) {
        for (const timeMs of lineTimestamps) {
          const lineWords = words.map(w => ({ ...w }));
          parsed.push({ timeMs, text: cleanText, words: lineWords });
        }
      }
    }
  }

  parsed.sort((a, b) => a.timeMs - b.timeMs);

  // Refine final word's endMs to clamp against the start of the next line
  for (let li = 0; li < parsed.length; li++) {
    const curLine = parsed[li];
    const nextLine = parsed[li + 1];
    if (curLine.words && curLine.words.length > 0) {
      const lastW = curLine.words[curLine.words.length - 1];
      if (nextLine) {
        lastW.endMs = Math.min(lastW.timeMs + 1500, nextLine.timeMs);
        lastW.duration = Math.max(100, lastW.endMs - lastW.timeMs);
      }
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
      const text = wordMatch[3] || '';
      if (text) {
        if (words.length > 0 && /^[,.!?;:’”'»\)}\]…~～、。，．！？–—"']+$/.test(text.trim())) {
          const prev = words[words.length - 1];
          prev.text = prev.text.trimEnd() + text;
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

    const cleanText = words.map(w => w.text).join('').trim() || content.trim();
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
    return `${lineTag} ${wordsPart}`;
  }).join('\n');
}

// Expose on global window object and Node.js exports
if (typeof window !== 'undefined') {
  window.isLyricMetadataOrCreditLine = isLyricMetadataOrCreditLine;
  window.parseLRC = parseLRC;
  window.parseMusixmatch = parseMusixmatch;
  window.parseLyricsPlus = parseLyricsPlus;
  window.parseYRC = parseYRC;
  window.yrcToEnhancedLRC = yrcToEnhancedLRC;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isLyricMetadataOrCreditLine,
    parseLRC,
    parseMusixmatch,
    parseLyricsPlus,
    parseYRC,
    yrcToEnhancedLRC
  };
}
