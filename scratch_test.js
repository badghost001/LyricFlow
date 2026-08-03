const url = `https://itunes.apple.com/search?term=${encodeURIComponent('Starboy The Weeknd')}&entity=song&limit=1`;
fetch(url).then(r=>r.json()).then(j=>console.log(j.results[0].artworkUrl100)).catch(e=>console.error(e));
