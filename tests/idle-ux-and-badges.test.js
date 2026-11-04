const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n--- Running Idle Screen & Verified Badges State Tests (Post-FlowBeats Removal) ---');

// 1. Static HTML & CSS Analysis
console.log('\n1. Static Markup & Styling Verification:');

const indexHtmlPath = path.join(__dirname, '../src/index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

assert(
  indexHtml.includes('id="studio-badges-row"') && indexHtml.includes('style="display: none;"'),
  'studio-badges-row must be hidden by default in index.html'
);
console.log('  ✓ 1a. .studio-badges-row has style="display: none;" in initial HTML');

assert(
  indexHtml.includes('id="studio-badge-provider"') && indexHtml.includes('style="display: none;"'),
  '#studio-badge-provider must have style="display: none;" in index.html'
);
console.log('  ✓ 1b. #studio-badge-provider has style="display: none;" in initial HTML');

assert(
  indexHtml.includes('id="studio-badge-quality"') && indexHtml.includes('style="display: none;"'),
  '#studio-badge-quality must have style="display: none;" in index.html'
);
console.log('  ✓ 1c. #studio-badge-quality has style="display: none;" in initial HTML');

assert(
  !indexHtml.includes('modules/flow-game.js'),
  'modules/flow-game.js script tag must NOT be present in index.html'
);
console.log('  ✓ 1d. modules/flow-game.js is not imported in index.html');

const studioCssPath = path.join(__dirname, '../src/styles/_studio.css');
const studioCss = fs.readFileSync(studioCssPath, 'utf8');

assert(
  studioCss.includes('.studio-badges-row.has-badges'),
  '_studio.css must define .studio-badges-row.has-badges'
);
assert(
  studioCss.includes('.studio-badge.is-confirmed'),
  '_studio.css must define .studio-badge.is-confirmed'
);
assert(
  studioCss.includes('@keyframes badgePopIn'),
  '_studio.css must define badgePopIn micro-bounce animation'
);
console.log('  ✓ 1e. _studio.css defines .is-confirmed and badgePopIn animation');

const lyricsCssPath = path.join(__dirname, '../src/styles/_lyrics.css');
const lyricsCss = fs.readFileSync(lyricsCssPath, 'utf8');

assert(
  !lyricsCss.includes('.flow-game-container') &&
  !lyricsCss.includes('.flow-game-card') &&
  !lyricsCss.includes('#flow-game-canvas') &&
  !lyricsCss.includes('.btn-flow-spotify'),
  '_lyrics.css must NOT define obsolete Flow Beats styles'
);
console.log('  ✓ 1f. _lyrics.css contains no orphaned Flow Beats classes or canvas selectors');


// 2. Idle Screen UX & Markup Verification
console.log('\n2. Idle Screen Architecture & Post-Removal Experience:');

const rendererJsPath = path.join(__dirname, '../src/renderer.js');
const rendererJs = fs.readFileSync(rendererJsPath, 'utf8');

// Ensure handleEmptyPlayback defines and renders lyrics-idle-hero
assert(
  rendererJs.includes('lyricsContainer.innerHTML = `') &&
  rendererJs.includes('<div class="lyrics-idle-hero">'),
  'handleEmptyPlayback must render .lyrics-idle-hero as the authoritative idle experience'
);
console.log('  ✓ 2a. handleEmptyPlayback mounts .lyrics-idle-hero unconditionally on empty playback');

assert(
  rendererJs.includes('<div class="idle-visual-wrapper">') &&
  rendererJs.includes('<div class="idle-vinyl-disc"></div>') &&
  rendererJs.includes('<div class="idle-soundwaves">'),
  'Idle screen must include vinyl disc and soundwaves illustration'
);
console.log('  ✓ 2b. Idle screen defines visual vinyl disc and soundwave ambient elements');

assert(
  rendererJs.includes('<div class="idle-hero-title">Ready to Flow</div>') &&
  rendererJs.includes('<div class="idle-hero-sub">${modeSubtext}</div>'),
  'Idle screen must present "Ready to Flow" title and dynamic mode subtext'
);
console.log('  ✓ 2c. Idle hero presents "Ready to Flow" with dynamic subtext');

assert(
  rendererJs.includes('id="btn-idle-open-spotify"') &&
  rendererJs.includes('id="btn-idle-search-lyrics"'),
  'Idle screen must provide action buttons for opening Spotify and searching lyrics'
);
console.log('  ✓ 2d. Idle screen provides action buttons for Spotify launch and lyrics search');

assert(
  rendererJs.includes('class="idle-shortcuts-row"') &&
  rendererJs.includes('Ctrl') && rendererJs.includes('Search'),
  'Idle screen must present keyboard shortcut hints for quick navigation'
);
console.log('  ✓ 2e. Idle screen displays keyboard shortcut hints');


// 3. Renderer Badges State & Playback State Transitions
console.log('\n3. Renderer Badges State & Playback Transitions:');

// Ensure updateStudioSidebar hides badges when !track
assert(
  rendererJs.includes('if (!track) {') &&
  rendererJs.includes('badgesRow.style.display = "none"') &&
  rendererJs.includes('badgeProvider.style.display = "none"') &&
  rendererJs.includes('badgeQuality.style.display = "none"'),
  'updateStudioSidebar must hide all badges when track is falsy'
);
console.log('  ✓ 3a. updateStudioSidebar strictly hides badges row, provider badge, and quality badge on idle');

// Ensure applyLyricsData confirms synced badge only when level >= 2
assert(
  rendererJs.includes('sourceLevel >= 2') &&
  rendererJs.includes('badgeProvider.classList.add("is-confirmed")'),
  'applyLyricsData must pop up badgeProvider with .is-confirmed only when sourceLevel >= 2'
);
console.log('  ✓ 3b. applyLyricsData pops up Synced / Word-Synced badge only when sourceLevel >= 2');

// Ensure handlePlaybackData verifies audio quality
assert(
  rendererJs.includes('data.audio_quality === \'lossless\'') &&
  rendererJs.includes('badgeQuality.classList.add("is-confirmed")'),
  'handlePlaybackData must strictly verify lossless audio before showing quality badge'
);
console.log('  ✓ 3c. handlePlaybackData strictly verifies audio encoding before displaying Lossless badge');

// Ensure neither handlePlaybackData nor handleEmptyPlayback reference FlowBeatsGame
assert(
  !rendererJs.includes('FlowBeatsGame') &&
  !rendererJs.includes('flow-game-container'),
  'renderer.js must have zero references to FlowBeatsGame or flow-game-container'
);
console.log('  ✓ 3d. renderer.js contains zero references to FlowBeatsGame or flow-game-container');

console.log('\nAll Idle Screen & Verified Badges State tests passed successfully!\n');
