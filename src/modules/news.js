/**
 * LyricFlow - Music News Module (v2)
 * Improved: caching, skeleton loaders, relative timestamps, smarter queries, refresh button
 */

let activeNewsFilter = "";
let _newsCache = {}; // key: filter+query -> { html, timestamp }
const NEWS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let _lastFetchTime = null;

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function showNewsSkeleton(newsBody, count = 5) {
  newsBody.innerHTML = Array.from({ length: count }, () => `
    <div class="news-skeleton">
      <div class="news-skeleton-meta"></div>
      <div class="news-skeleton-title"></div>
      <div class="news-skeleton-title short"></div>
    </div>
  `).join("");
}

async function fetchMusicNews(bypassCache = false) {
  const newsBody = document.getElementById("news-body");
  const inputNewsFilter = document.getElementById("input-news-filter");
  const updatedLabel = document.getElementById("news-last-updated");
  if (!newsBody) return;

  const queryText = (inputNewsFilter && inputNewsFilter.value) ? inputNewsFilter.value.trim() : "";
  let q = "";

  if (queryText !== "") {
    const topic = activeNewsFilter ? `OR ${activeNewsFilter}` : `OR "new music" OR announces`;
    q = `"${queryText}" (album OR release OR tour OR drops ${topic}) when:14d`;
  } else {
    let topic = `("new album" OR "tour announcement" OR "drops new" OR "album release" OR "new music" OR "music video")` ;
    if (activeNewsFilter) {
      if (activeNewsFilter.includes("drama")) {
        topic = `(controversy OR drama OR feud OR statement OR "speaks out")`;
      } else if (activeNewsFilter.includes("interview")) {
        topic = `(interview OR podcast OR "sits down with" OR "talks about")`;
      } else if (activeNewsFilter.includes("billboard")) {
        topic = `("billboard hot 100" OR "charts" OR "debuts at number" OR "certified platinum")`;
      } else if (activeNewsFilter.includes("album")) {
        topic = `("new album" OR "drops new" OR "album release" OR "deluxe edition")`;
      } else if (activeNewsFilter.includes("tour")) {
        topic = `("tour announcement" OR "world tour" OR "concert dates" OR dates)`;
      }
    }
    q = `("Billboard" OR "Rolling Stone" OR "Pitchfork" OR "NME" OR "Variety" OR "Complex") music ${topic} when:3d`;
  }

  const cacheKey = `${activeNewsFilter}||${queryText}`;
  const cached = _newsCache[cacheKey];
  if (!bypassCache && cached && (Date.now() - cached.timestamp) < NEWS_CACHE_TTL) {
    newsBody.innerHTML = cached.html;
    if (updatedLabel) {
      const mins = Math.round((Date.now() - cached.timestamp) / 60000);
      updatedLabel.textContent = mins < 1 ? "Updated just now" : `Updated ${mins}m ago`;
    }
    return;
  }

  showNewsSkeleton(newsBody);

  try {
    const text = await window.electronAPI.fetchMusicNews(q);
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");

    let items = Array.from(xml.querySelectorAll("item"));

    items.sort((a, b) => {
      const dateA = new Date(a.querySelector("pubDate")?.textContent || 0).getTime();
      const dateB = new Date(b.querySelector("pubDate")?.textContent || 0).getTime();
      return dateB - dateA;
    });

    const uniqueItems = [];
    for (const item of items) {
      const rawTitle = item.querySelector("title")?.textContent || "Untitled";
      const source = item.querySelector("source")?.textContent || "Google News";

      let displayTitle = rawTitle;
      if (source !== "Google News" && rawTitle.endsWith(` - ${source}`)) {
        displayTitle = rawTitle.substring(0, rawTitle.lastIndexOf(` - ${source}`));
      }

      const normalized = displayTitle.toLowerCase().replace(/[^a-z0-9\s]/g, "");
      const words = new Set(normalized.split(/\s+/).filter(w => w.length > 2));

      let isDuplicate = false;
      for (const added of uniqueItems) {
        let overlap = 0;
        for (const w of words) {
          if (added.words.has(w)) overlap++;
        }
        const minWords = Math.min(words.size, added.words.size);
        if (minWords > 0 && (overlap / minWords) > 0.65) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueItems.push({ item, displayTitle, source, words });
      }
    }

    const finalItems = uniqueItems.slice(0, 50);

    if (finalItems.length === 0) {
      newsBody.innerHTML = `<div class="news-empty">No headlines found. Try a different filter or artist name.</div>`;
      return;
    }

    const html = finalItems.map(obj => {
      const { item, displayTitle, source } = obj;
      const rawLink = item.querySelector("link")?.textContent || "#";
      const pubDate = item.querySelector("pubDate")?.textContent || "";
      const relativeTime = timeAgo(pubDate);
      const safeTitle = escapeHTML(displayTitle);
      const safeSource = escapeHTML(source);
      const safeTime = escapeHTML(relativeTime);
      const safeLink = rawLink.startsWith('http') ? encodeURI(rawLink) : '#';

      return `
        <a class="news-card" href="${safeLink}" target="_blank">
          <div class="news-card-meta">
            <span class="news-source-badge">${safeSource}</span>
            <span class="news-timestamp">${safeTime}</span>
          </div>
          <div class="news-card-title">${safeTitle}</div>
        </a>
      `;
    }).join("");

    newsBody.innerHTML = html;
    _newsCache[cacheKey] = { html, timestamp: Date.now() };
    _lastFetchTime = Date.now();

    if (updatedLabel) updatedLabel.textContent = "Updated just now";

  } catch (err) {
    console.error("News Fetch Error:", err);
    newsBody.innerHTML = `<div class="news-empty error">Failed to load headlines: ${escapeHTML(err.message)}</div>`;
  }
}

// Expose on global window object
window.fetchMusicNews = fetchMusicNews;
window.activeNewsFilter = activeNewsFilter;
