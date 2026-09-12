/**
 * LyricFlow - Parsers Module (LRC, Musixmatch, LyricsPlus)
 */

// Robust LRC Parser (handles Enhanced LRC syllable tags)
function parseLRC(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g;
  const syllableRegex = /<(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?>/g;

  for (const line of lines) {
    const lineTimestamps = [];
    let match;
    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const msPart = match[3] || "000";
      const ms = parseInt(msPart.padEnd(3, '0').substring(0, 3), 10);
      lineTimestamps.push((minutes * 60 + seconds) * 1000 + ms);
    }

    if (lineTimestamps.length > 0) {
      let fullText = line.replace(timeRegex, '').trim();
      let words = [];
      let lastIndex = 0;
      let sylMatch;
      syllableRegex.lastIndex = 0;

      while ((sylMatch = syllableRegex.exec(fullText)) !== null) {
          const wordText = fullText.substring(lastIndex, sylMatch.index).trim();
          if (wordText) {
              const minutes = parseInt(sylMatch[1], 10);
              const seconds = parseInt(sylMatch[2], 10);
              const msPart = sylMatch[3] || "000";
              const ms = parseInt(msPart.padEnd(3, '0').substring(0, 3), 10);
              const wTime = (minutes * 60 + seconds) * 1000 + ms;
              words.push({ text: wordText, timeMs: wTime });
          }
          lastIndex = syllableRegex.lastIndex;
      }

      const finalWordText = fullText.substring(lastIndex).replace(syllableRegex, '').trim();
      if (finalWordText && words.length > 0) {
          words.push({ text: finalWordText, timeMs: 9999999 });
      }

      const cleanText = fullText.replace(syllableRegex, '').trim();

      for (const timeMs of lineTimestamps) {
        let lineWords = [];
        if (words.length > 0) {
            lineWords = words.map(w => ({
                text: w.text,
                timeMs: w.timeMs === 9999999 ? (timeMs + 3000) : w.timeMs
            }));
        }
        parsed.push({ timeMs, text: cleanText, words: lineWords });
      }
    }
  }

  parsed.sort((a, b) => a.timeMs - b.timeMs);
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
      if (!text || text.startsWith("Lyricist:") || text.startsWith("Composer:")) {
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
  }).filter(l => l.text !== "");
}

// Expose on global window object
window.parseLRC = parseLRC;
window.parseMusixmatch = parseMusixmatch;
window.parseLyricsPlus = parseLyricsPlus;
