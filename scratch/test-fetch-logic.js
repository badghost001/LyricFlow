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

async function run() {
  const artist = encodeURIComponent("Drake");
  const track = encodeURIComponent("Whisper My Name");
  const durationSec = 214; // Typical spotify duration

  console.log("1. Testing Proxy Fetch...");
  const proxyUrl = `https://lyricsplus.mathurdeepit12.workers.dev/lyrics?artist=${artist}&title=${track}&trackId=test&duration=${durationSec}`;
  const proxyFallback = `https://lyricsplus.mathurdeepit12.workers.dev/lyrics?artist=${artist}&title=${track}&trackId=test`;
  
  let proxyData = await fetchJson(proxyUrl);
  if (!proxyData) {
      console.log("Proxy 404, falling back...");
      proxyData = await fetchJson(proxyFallback);
  }
  console.log("Proxy returned:", proxyData ? "YES" : "NO", proxyData ? proxyData.source : "");
  if (proxyData && proxyData.rawLRC) {
      console.log("Proxy rawLRC snippets:", proxyData.rawLRC.substring(0, 100));
  }

  console.log("\n2. Testing LRCLib API directly...");
  const exactUrl = `https://lrclib.net/api/get?artist_name=${artist}&track_name=${track}&duration=${durationSec}`;
  let exactData = await fetchJson(exactUrl);
  console.log("LRCLib Exact Match:", exactData ? (exactData.syncedLyrics ? "Has Synced" : "Has Plain") : "404");

  const searchUrl = `https://lrclib.net/api/search?q=${artist}+${track}`;
  const searchData = await fetchJson(searchUrl);
  if (Array.isArray(searchData)) {
    console.log(`LRCLib Search returned ${searchData.length} results.`);
    const validMatches = searchData.filter(r => Math.abs(r.duration - durationSec) <= 5);
    console.log(`Valid matches (+/- 5s): ${validMatches.length}`);
    
    if (validMatches.length > 0) {
        const bestSync = validMatches.find(r => r.syncedLyrics && /\[\d{2}:/.test(r.syncedLyrics));
        console.log("Best Sync among valid:", bestSync ? bestSync.id : "None");
    }
    
    const anySync = searchData.find(r => r.syncedLyrics && /\[\d{2}:/.test(r.syncedLyrics));
    console.log("Any Sync in all results:", anySync ? anySync.id : "None");
  }
}
run();
