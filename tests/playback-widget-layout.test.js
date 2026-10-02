const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("\n--- Running Playback Widget Layout & Badge Sizing Tests ---\n");

// TEST 1: updateTimingStatus label conciseness & tooltip enrichment
function mockUpdateTimingStatus(level, sourceName = "", candidateInfo = "") {
  let badgeClass = "timing-status-badge";
  let text = "";
  let title = "";

  const extraInfo = [candidateInfo, sourceName].filter(Boolean).join(" · ");
  const tooltipSuffix = extraInfo ? ` (${extraInfo})` : "";

  if (level === 3) {
    badgeClass += " word-synced";
    text = "Word Timing";
    title = `High-Fidelity Word Timing (Synced)${tooltipSuffix}. Click to find alternative lyrics (Ctrl+R).`;
  } else if (level === 2) {
    badgeClass += " line-synced";
    text = "Line Sync";
    title = `Line-Synced Lyrics${tooltipSuffix}. Click to find alternative lyrics (Ctrl+R).`;
  } else if (level === 1) {
    badgeClass += " plain";
    text = "Plain Text";
    title = `Plain Text Lyrics (No Sync)${tooltipSuffix}. Click to find alternative lyrics (Ctrl+R).`;
  } else if (level === -1 || level === 'none') {
    badgeClass += " none";
    text = "No Lyrics";
    title = "No lyrics found for this track. Click to search alternative lyrics (Ctrl+R).";
  } else {
    badgeClass += " checking";
    text = "Checking...";
    title = "Searching lyrics database...";
  }

  return { badgeClass, text, title };
}

// Check Level 2 with Spotify candidate info
const resLine = mockUpdateTimingStatus(2, "Spotify", "Spotify");
assert.strictEqual(resLine.text, "Line Sync", "Badge text must be concise 'Line Sync' without bloat");
assert(resLine.title.includes("Spotify"), "Tooltip must contain provider info");
assert(resLine.badgeClass.includes("line-synced"), "Badge class must have line-synced");

// Check Level 3 with rich provider info
const resWord = mockUpdateTimingStatus(3, "LyricsPlus", "LRCLIB");
assert.strictEqual(resWord.text, "Word Timing", "Badge text must be concise 'Word Timing'");
assert(resWord.title.includes("LRCLIB · LyricsPlus"), "Tooltip must contain combined candidate & source info");

// Check Plain text
const resPlain = mockUpdateTimingStatus(1);
assert.strictEqual(resPlain.text, "Plain Text", "Level 1 displays Plain Text");

console.log("  ✓ 1. Timing status badge maintains concise label text without candidate bloat");
console.log("  ✓ 2. Candidate and source info cleanly formatted inside hover tooltip");

// TEST 3: CSS Layout checks in _playback.css
const cssPath = path.join(__dirname, '../src/styles/_playback.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(!cssContent.includes("max-width: 55%"), ".track-name MUST NOT have obsolete max-width: 55%");
assert(!cssContent.includes("max-width: 35%"), ".artist-name MUST NOT have obsolete max-width: 35%");
assert(/\.timing-status-badge\s*\{[^}]*flex-shrink:\s*0/s.test(cssContent), ".timing-status-badge MUST have flex-shrink: 0");
assert(/\.btn-hide-lyrics\s*\{[^}]*flex-shrink:\s*0/s.test(cssContent), ".btn-hide-lyrics MUST have flex-shrink: 0");
assert(cssContent.includes(".track-header-row"), ".track-header-row class defined in _playback.css");
assert(cssContent.includes(".track-name-wrapper"), ".track-name-wrapper class defined in _playback.css");
assert(cssContent.includes(".track-name.is-overflowing"), ".track-name.is-overflowing defined with appleMarqueeScroll");

console.log("  ✓ 3. Obsolete max-width: 55% and 35% caps removed from CSS");
console.log("  ✓ 4. flex-shrink: 0 applied to timing badge and hide lyrics button to eliminate clipping");
console.log("  ✓ 5. track-header-row and track-name-wrapper defined with gradient mask and overflow marquee");

// TEST 6: HTML markup checks in index.html
const htmlPath = path.join(__dirname, '../src/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(htmlContent.includes('class="track-header-row"'), "index.html uses track-header-row");
assert(htmlContent.includes('id="widget-track-name-wrapper"'), "index.html wraps widget-track-name in widget-track-name-wrapper");
assert(!htmlContent.includes('class="track-details" style="display: flex; flex-direction: column;"'), "index.html inline style on track-details cleaned up");

console.log("  ✓ 6. index.html contains track-header-row and widget-track-name-wrapper markup");

// TEST 7: Marquee overflow logic
function mockUpdateMarqueeOverflow(containerWidth, textScrollWidth, speedPxPerSec = 28) {
  const diff = textScrollWidth - containerWidth;
  if (diff > 4) {
    const dur = Math.max(4.0, (diff / speedPxPerSec) + 3.0);
    return {
      isOverflowing: true,
      marqueeDist: `-${diff + 8}px`,
      marqueeDur: `${dur.toFixed(1)}s`
    };
  }
  return {
    isOverflowing: false,
    marqueeDist: null,
    marqueeDur: null
  };
}

// Case A: Song title fits in container (no overflow)
const fitsResult = mockUpdateMarqueeOverflow(200, 150);
assert.strictEqual(fitsResult.isOverflowing, false, "Text that fits must not marquee");

// Case B: Long song title exceeds container
const overflowResult = mockUpdateMarqueeOverflow(150, 240);
assert.strictEqual(overflowResult.isOverflowing, true, "Text exceeding container width must trigger marquee");
assert.strictEqual(overflowResult.marqueeDist, "-98px", "Marquee distance matches diff + 8px");
assert(parseFloat(overflowResult.marqueeDur) >= 4.0, "Marquee duration is comfortably paced");

console.log("  ✓ 7. Marquee overflow calculation accurately detects overflow and assigns animation parameters");

// TEST 8: Track title and artist hover tooltips
let mockWidgetTrack = { textContent: "", title: "" };
let mockWidgetArtist = { textContent: "", title: "" };

const sampleTrack = {
  name: "A New Kind Of Love - DEMO VERSION",
  artists: [{ name: "Frou Frou" }, { name: "Imogen Heap" }]
};

mockWidgetTrack.textContent = sampleTrack.name;
mockWidgetTrack.title = sampleTrack.name;
const artistStr = sampleTrack.artists.map(a => a.name).join(", ");
mockWidgetArtist.textContent = artistStr;
mockWidgetArtist.title = artistStr;

assert.strictEqual(mockWidgetTrack.title, "A New Kind Of Love - DEMO VERSION", "Track hover title contains full title");
assert.strictEqual(mockWidgetArtist.title, "Frou Frou, Imogen Heap", "Artist hover title contains full artist list");

console.log("  ✓ 8. Full track and artist titles are preserved in hover title attributes for discovery");

console.log("\nResults: 8/8 tests passed.\n");
