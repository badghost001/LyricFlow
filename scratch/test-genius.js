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
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const url = `https://genius.com/api/search/multi?per_page=1&q=Kendrick%20Lamar%20Not%20Like%20Us`;
  const data = await fetchJson(url);
  console.log(JSON.stringify(data.response.sections[0].hits[0], null, 2));
}

run();
