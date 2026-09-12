/**
 * LyricFlow - Music News Module
 */

let activeNewsFilter = "";

async function fetchMusicNews() {
  const newsBody = document.getElementById("news-body");
  const inputNewsFilter = document.getElementById("input-news-filter");
  if (!newsBody) return;

  try {
    const queryText = (inputNewsFilter && inputNewsFilter.value) ? inputNewsFilter.value.trim() : "";
    let q = "";

    // Construct boolean query
    if (queryText !== "") {
      const topic = activeNewsFilter ? `OR ${activeNewsFilter}` : `OR "new music" OR announces`;
      q = `"${queryText}" (album OR release OR tour OR drops ${topic}) when:30d`;
    } else {
      let topic = `("new album" OR "tour announcement" OR "drops new" OR "album release" OR "new music")`;
      if (activeNewsFilter) {
        if (activeNewsFilter.includes("drama")) {
          topic = `(controversy OR drama OR feud OR statement)`;
        } else if (activeNewsFilter.includes("interview")) {
          topic = `(interview OR podcast OR "speaks out")`;
        } else if (activeNewsFilter.includes("billboard")) {
          topic = `("billboard hot 100" OR "charts" OR "debuts at number")`;
        } else if (activeNewsFilter.includes("album")) {
          topic = `("new album" OR "drops new" OR "album release")`;
        } else if (activeNewsFilter.includes("tour")) {
          topic = `("tour announcement" OR "world tour" OR dates)`;
        }
      }
      q = `("Billboard" OR "Rolling Stone") ${topic} when:7d`;
    }

    const text = await window.electronAPI.fetchMusicNews(q);
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");

    let items = Array.from(xml.querySelectorAll("item"));

    // Sort items by date descending (latest first)
    items.sort((a, b) => {
      const dateA = new Date(a.querySelector("pubDate")?.textContent || 0).getTime();
      const dateB = new Date(b.querySelector("pubDate")?.textContent || 0).getTime();
      return dateB - dateA;
    });

    // Deduplicate repeated news based on title similarity
    const uniqueItems = [];
    for (const item of items) {
      const rawTitle = item.querySelector("title")?.textContent || "Untitled";
      const source = item.querySelector("source")?.textContent || "Google News";

      let displayTitle = rawTitle;
      if (source !== "Google News" && rawTitle.endsWith(` - ${source}`)) {
        displayTitle = rawTitle.substring(0, rawTitle.lastIndexOf(` - ${source}`));
      }

      // Normalize and extract significant words
      const normalized = displayTitle.toLowerCase().replace(/[^a-z0-9\s]/g, "");
      const words = new Set(normalized.split(/\s+/).filter(w => w.length > 2));

      // Check overlap with already added items
      let isDuplicate = false;
      for (const added of uniqueItems) {
        let overlap = 0;
        for (const w of words) {
          if (added.words.has(w)) overlap++;
        }
        const minWords = Math.min(words.size, added.words.size);
        // If more than 65% of the shorter title's words match, it's a duplicate
        if (minWords > 0 && (overlap / minWords) > 0.65) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueItems.push({ item, displayTitle, source, words });
      }
    }

    // Take top 50 unique
    const finalItems = uniqueItems.slice(0, 50);

    if (finalItems.length === 0) {
      newsBody.innerHTML = `<div style="text-align: center; color: rgba(255,255,255,0.5); font-size: 13px; margin-top: 20px;">No news found.</div>`;
      return;
    }

    newsBody.innerHTML = finalItems.map(obj => {
      const { item, displayTitle, source } = obj;
      const rawLink = item.querySelector("link")?.textContent || "#";
      const pubDate = item.querySelector("pubDate")?.textContent || "";
      const dateStr = pubDate ? new Date(pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "";

      // Sanitize external RSS data to prevent XSS
      const safeTitle = escapeHTML(displayTitle);
      const safeSource = escapeHTML(source);
      const safeDate = escapeHTML(dateStr);
      const safeLink = rawLink.startsWith('http') ? encodeURI(rawLink) : '#';

      return `
        <a href="${safeLink}" target="_blank" style="display: block; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; text-decoration: none; border: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; cursor: pointer;">
          <div style="font-size: 13px; color: rgba(255,255,255,0.95); font-weight: 500; line-height: 1.4;">${safeTitle}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <div style="font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">${safeSource}</div>
            <div style="font-size: 10px; color: rgba(255,255,255,0.4);">${safeDate}</div>
          </div>
        </a>
      `;
    }).join("");

  } catch (err) {
    console.error("News Fetch Error:", err);
    newsBody.innerHTML = `<div style="text-align: center; color: #f87171; font-size: 13px; margin-top: 20px;">Failed to load headlines: ${escapeHTML(err.message)}</div>`;
  }
}

// Expose on global window object
window.fetchMusicNews = fetchMusicNews;
window.activeNewsFilter = activeNewsFilter;
