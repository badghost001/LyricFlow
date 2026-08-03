const url = `https://news.google.com/rss/search?q=${encodeURIComponent('"Drake" (album OR release OR tour OR drops OR "new music" OR announces)')}`;
fetch(url).then(r=>r.text()).then(t=>console.log(t.substring(0,600))).catch(console.error);
