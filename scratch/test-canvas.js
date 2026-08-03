const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
        } else {
          resolve({ status: res.statusCode });
        }
      });
    }).on('error', reject);
  });
}

async function testGeniusAnnotations() {
  console.log("Testing Genius Annotations...");
  const searchUrl = `https://genius.com/api/search/multi?per_page=1&q=Kendrick%20Lamar%20Not%20Like%20Us`;
  const searchData = await fetchJson(searchUrl);
  
  let songId = null;
  const sections = searchData.response?.sections || [];
  for (const section of sections) {
    if (section.type === "song" || section.type === "top_hit") {
      for (const hit of section.hits) {
        if (hit.type === "song" && hit.result) {
          songId = hit.result.id;
          break;
        }
      }
    }
  }

  if (!songId) {
    console.log("No song found.");
    return;
  }

  console.log(`Found Song ID: ${songId}`);
  const referentsUrl = `https://genius.com/api/referents?song_id=${songId}&text_format=plain`;
  const referentsData = await fetchJson(referentsUrl);
  
  if (referentsData && referentsData.response && referentsData.response.referents) {
    console.log(`Found ${referentsData.response.referents.length} annotations!`);
    const firstRef = referentsData.response.referents[0];
    console.log(`Lyric Snippet: "${firstRef.fragment}"`);
    console.log(`Annotation: "${firstRef.annotations[0].body.plain}"`);
  } else {
    console.log("No annotations found or failed.");
  }
}

testGeniusAnnotations();
