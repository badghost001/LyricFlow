const fetch = require('node-fetch'); // Electron environment usually uses node-fetch or native fetch in v18+

async function testMainJsGeniusLogic() {
  const artistName = 'Kendrick Lamar';
  const trackName = 'Not Like Us';
  
  try {
    const cleanArtist = artistName.replace(/VEVO$/i, '').replace(/- Topic$/i, '').replace(/Official$/i, '').trim() || artistName;
    const cleanTrack = trackName.replace(/\[.*?\]/g, '').replace(/\(.*?(Official|Audio|Video).*?\)/ig, '').replace(/ - (Remastered|Radio Edit|Live|Instrumental|Acoustic|Single Version).*/i, '').trim() || trackName;
    
    const searchUrl = `https://genius.com/api/search/multi?per_page=1&q=${encodeURIComponent(cleanArtist + ' ' + cleanTrack)}`;
    console.log("Searching:", searchUrl);
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      console.log("Search failed", searchRes.status);
      return;
    }
    const searchData = await searchRes.json();
    
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
      if (songId) break;
    }
    
    if (!songId) {
      console.log("Song ID not found");
      return;
    }
    console.log("Found song ID:", songId);
    
    const referentsUrl = `https://genius.com/api/referents?song_id=${songId}&text_format=plain`;
    console.log("Fetching referents:", referentsUrl);
    const refRes = await fetch(referentsUrl);
    if (!refRes.ok) {
      console.log("Referents failed", refRes.status);
      return;
    }
    const refData = await refRes.json();
    
    const annotations = [];
    if (refData.response?.referents) {
      for (const ref of refData.response.referents) {
        if (ref.fragment && ref.annotations && ref.annotations[0] && ref.annotations[0].body) {
          annotations.push({
            fragment: ref.fragment,
            text: ref.annotations[0].body.plain
          });
        }
      }
    }
    console.log("Annotations found:", annotations.length);
    if (annotations.length > 0) {
      console.log(annotations[0]);
    }
  } catch (e) {
    console.error("Failed:", e);
  }
}

testMainJsGeniusLogic();
