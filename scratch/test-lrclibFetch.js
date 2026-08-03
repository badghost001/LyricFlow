const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
        } else if (res.statusCode === 404) {
          resolve(null);
        } else {
          resolve({ status: res.statusCode, error: data });
        }
      });
    }).on('error', reject);
  });
}

function parseLRC(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g;

  lines.forEach((line) => {
    const timeMatches = [...line.matchAll(timeRegex)];
    if (timeMatches.length === 0) return;
    const text = line.replace(timeRegex, '').trim();
    if (!text) return;

    timeMatches.forEach((match) => {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
      const timeMs = (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
      parsed.push({ timeMs, text });
    });
  });

  return parsed.sort((a, b) => a.timeMs - b.timeMs);
}

async function run() {
  const artist = encodeURIComponent("Drake");
  const track = encodeURIComponent("Whisper My Name");
  const durationSec = 214; 

  const exactUrl = `https://lrclib.net/api/get?artist_name=${artist}&track_name=${track}&duration=${durationSec}`;
  let res = await fetchJson(exactUrl);
  
  if (res && res.syncedLyrics && !/\[\d{2}:/.test(res.syncedLyrics)) {
      console.log("Faking syncedLyrics to null due to missing timestamps");
      res.syncedLyrics = null;
  }

  if (!res || !res.syncedLyrics) {
      console.log("Searching...");
      const searchUrl = `https://lrclib.net/api/search?q=${artist}+${track}`;
      const searchData = await fetchJson(searchUrl);
      
      const validMatches = searchData.filter(r => Math.abs(r.duration - durationSec) <= 5);
      if (validMatches.length > 0) {
        console.log("Found valid matches");
        const bestSync = validMatches.find(r => r.syncedLyrics && /\[\d{2}:/.test(r.syncedLyrics));
        if (bestSync) res = bestSync;
        else if (!res) res = validMatches[0];
      } else {
        console.log("No valid matches, falling back to anySync");
        const anySync = searchData.find(r => r.syncedLyrics && /\[\d{2}:/.test(r.syncedLyrics));
        if (anySync) res = anySync;
        else if (!res) res = searchData[0];
      }
  }

  console.log("Final res selected:", res ? res.id : "null");
  const lrcText = res.syncedLyrics || res.plainLyrics;
  if (lrcText) {
      const parsed = parseLRC(lrcText);
      console.log("Parsed length:", parsed.length);
      if (parsed.length > 0) {
          console.log("Calling applyLyricsData with level 2/3");
      } else if (res.plainLyrics) {
          console.log("Calling applyLyricsData with level 1 (Plain text)");
      }
  }
}
run();
