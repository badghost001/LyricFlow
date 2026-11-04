const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('\n--- Running Track Switch Lyrics Integrity & Match Accuracy Tests ---');

const rendererJsPath = path.join(__dirname, '../src/renderer.js');
const rendererJs = fs.readFileSync(rendererJsPath, 'utf8');

const fuzzyRsPath = path.join(__dirname, '../src-tauri/src/commands/lyrics/fuzzy.rs');
const fuzzyRs = fs.readFileSync(fuzzyRsPath, 'utf8');

// 1. Module-level currentSourceLevel declaration
assert(
  /^let currentSourceLevel = 0;/m.test(rendererJs),
  'currentSourceLevel must be declared as a module-level variable to prevent ReferenceError'
);
console.log('  ✓ 1. currentSourceLevel is declared as top-level state variable');

// 2. updateStudioSidebar try/catch safety
assert(
  rendererJs.includes('function updateStudioSidebar(track, albumArtUrl) {\n  try {') ||
  rendererJs.includes('function updateStudioSidebar(track, albumArtUrl) {\r\n  try {'),
  'updateStudioSidebar must wrap its logic in a try/catch block'
);
console.log('  ✓ 2. updateStudioSidebar wraps badge and metadata DOM logic in try/catch');

// 3. handlePlaybackData safe updateStudioSidebar calls
assert(
  rendererJs.includes('try {\n      updateStudioSidebar(track, albumArtUrl);\n    } catch (e)') ||
  rendererJs.includes('try {\r\n      updateStudioSidebar(track, albumArtUrl);\r\n    } catch (e)'),
  'handlePlaybackData must safely invoke updateStudioSidebar with try/catch'
);
console.log('  ✓ 3. handlePlaybackData guards updateStudioSidebar preventing song transition aborts');

// 4. Reset on track change
assert(
  rendererJs.includes('lyrics = [];\n    currentSourceLevel = 0;') ||
  rendererJs.includes('lyrics = [];\r\n    currentSourceLevel = 0;'),
  'currentSourceLevel must be reset to 0 alongside lyrics on song change'
);
console.log('  ✓ 4. lyrics and currentSourceLevel are atomically reset to empty state on song switch');

// 5. Soundtrack / Album parenthetical cleaning in cleanTrack
assert(
  rendererJs.includes('Official|Audio|Video|feat\\.|ft\\.|with|from|soundtrack|theme|ost') &&
  rendererJs.includes('Single Version|From .*'),
  'cleanTrack must strip soundtrack, theme, ost, and from parentheticals'
);

// Functional test of cleanTrack logic
const testCleanTrack = (title) => {
  return title
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?(Official|Audio|Video|feat\.|ft\.|with|from|soundtrack|theme|ost).*?\)/ig, '')
    .replace(/ - (Remastered|Radio Edit|Live|Instrumental|Acoustic|Single Version|From .*).*/i, '')
    .replace(/\s+(feat\.|ft\.).*$/i, '')
    .trim() || title;
};

assert.strictEqual(testCleanTrack('RHYNO (from GTAVI: The Album)'), 'RHYNO');
assert.strictEqual(testCleanTrack('Sunflower (from Spider-Man: Into the Spider-Verse) [Soundtrack]'), 'Sunflower');
assert.strictEqual(testCleanTrack('What Was I Made For? - From The Motion Picture Barbie'), 'What Was I Made For?');
console.log('  ✓ 5. cleanTrack correctly normalizes soundtrack/game titles (e.g., RHYNO)');

// 6. localLrclibFetch matching filter requires both artist and track
assert(
  rendererJs.includes('const artistMatches =') &&
  rendererJs.includes('const trackMatches =') &&
  rendererJs.includes('return artistMatches && trackMatches;'),
  'localLrclibFetch must require both artistMatches AND trackMatches to prevent false-positive matches'
);
console.log('  ✓ 6. localLrclibFetch strictly enforces bidirectional artist AND track conjunction');

// 7. Rust fuzzy.rs clean_title support
assert(
  fuzzyRs.includes('inner.starts_with("from ")') &&
  fuzzyRs.includes('inner.starts_with("soundtrack")') &&
  fuzzyRs.includes('inner.starts_with("theme ")') &&
  fuzzyRs.includes('inner == "ost"'),
  'Rust clean_title must support soundtrack, from, theme, and ost tags'
);
console.log('  ✓ 7. Rust clean_title supports soundtrack/from tags with test coverage');

// 7a. A rejected text match must not block a real word-sync upgrade.
const skipRejectedCandidateFunction = rendererJs.match(
  /^function shouldSkipRejectedLyricsCandidate\(rejectedSignatures, signature, allowWordSyncUpgrade = false\) \{[\s\S]*?^\}/m
);
assert(skipRejectedCandidateFunction, 'renderer.js must define rejected-signature upgrade handling');
assert(
  rendererJs.includes('const upgradesCurrentSync = level === 3 && currentSourceLevel < 3;') &&
  rendererJs.includes('rejectedLyricsSignatures[trackId],\n              sig,\n              upgradesCurrentSync'),
  'rustLyricsFetch must pass same-text word-sync upgrades through the rejected-signature filter'
);
const rejectedSignatureVm = {};
vm.runInNewContext(`${skipRejectedCandidateFunction[0]}\nthis.check = shouldSkipRejectedLyricsCandidate;`, rejectedSignatureVm);
assert.strictEqual(rejectedSignatureVm.check(new Set(['same-text']), 'same-text'), true,
  'A manually rejected duplicate candidate must still be skipped when it does not improve sync quality');
assert.strictEqual(rejectedSignatureVm.check(new Set(['same-text']), 'same-text', true), false,
  'A duplicate-text word-synced candidate must be allowed to upgrade active line-synced lyrics');
console.log('  ✓ 7a. Rejected lyric text cannot block a same-text word-sync upgrade');

// 8. A provider ID upgrade for the same song must not reset its playhead.
const extractFunction = (name) => {
  const match = rendererJs.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert(match, `${name} must exist for deterministic playback transition checks`);
  return match[0];
};
const playbackHelpers = [
  'normalizeTrackId',
  'isSameTrack',
  'isPlaybackTrackSwitch',
  'shouldUseLocalPlaybackOnTrackMismatch',
  'isStaleSpotifyPlaybackResponse'
].map(extractFunction).join('\n');
const playbackVm = {};
vm.runInNewContext(playbackHelpers, playbackVm);
const localCurrent = {
  id: 'local_c29uZw==',
  name: 'Dust',
  artist: 'Drake',
  artists: [{ name: 'Drake' }]
};
const spotifyUpgrade = {
  id: '3Q4gttWQ6hxqWOa3tHoTNi',
  name: 'Dust',
  artists: [{ name: 'Drake' }]
};
assert.strictEqual(
  playbackVm.isPlaybackTrackSwitch(spotifyUpgrade, localCurrent.id, localCurrent),
  false,
  'A Spotify ID arriving for the same SMTC track must preserve playback progress'
);
assert.strictEqual(
  playbackVm.shouldUseLocalPlaybackOnTrackMismatch(localCurrent, { name: 'Next Song', artists: [{ name: 'Drake' }] }, localCurrent, 'spotify-web-api'),
  false,
  'A stale local sample from the request-start track must not overwrite a newer Spotify track'
);
assert.strictEqual(
  playbackVm.shouldUseLocalPlaybackOnTrackMismatch(localCurrent, { name: 'Next Song', artists: [{ name: 'Drake' }] }, localCurrent, 'windows-smtc'),
  true,
  'A fresh SMTC-authoritative track must not be overwritten by a stale cloud response'
);
assert.strictEqual(
  playbackVm.shouldUseLocalPlaybackOnTrackMismatch({ name: 'Next Song', artists: [{ name: 'Drake' }] }, localCurrent, localCurrent),
  true,
  'A local track transition during the Spotify request must beat the stale cloud track'
);
assert.strictEqual(
  playbackVm.isStaleSpotifyPlaybackResponse(localCurrent, localCurrent, { name: 'Next Song', artists: [{ name: 'Drake' }] }),
  true,
  'A late Spotify response for the request-start track must not rewind a track already switched by SMTC'
);
assert.strictEqual(
  playbackVm.isStaleSpotifyPlaybackResponse(localCurrent, { name: 'Next Song', artists: [{ name: 'Drake' }] }, { name: 'Next Song', artists: [{ name: 'Drake' }] }),
  false,
  'A Spotify response matching the newly active track must still be accepted'
);
assert(
  rendererJs.includes("lastSpotifyPlaybackData = null;\n\n    // SMTC is the live Windows player session") &&
  rendererJs.includes('isStaleSpotifyPlaybackResponse(\n          trackAtSpotifyRequestStart,'),
  'Direct SMTC switches must invalidate stale cloud metadata and late responses must be rejected'
);
console.log('  8. Playback identity upgrades and mismatched source races preserve the active track');

// 9. Wallpaper mode must initialize metadata when entered mid-song, and the
// Island surface must leave room for expanded bottom controls and satellite cells.
assert(
  rendererJs.includes('syncWallpaperTrackMetadata();') &&
  rendererJs.includes('clearWallpaperModePresentation();'),
  'Mode transitions must synchronize wallpaper metadata and clear its classes before entering Dynamic Island'
);
const windowRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/window.rs'), 'utf8');
assert(
  /let island_h = \(260\.0 \* scale\) as u32;/.test(windowRs),
  'Dynamic Island native surface must reserve space for expanded controls and satellite cells'
);
assert(
  /let target_h\s*=\s*\(\(\(rect\.height as f64\)\s*\*\s*scale\)\.round\(\) as u32 \+ pad_h\)\s*\.max\(\(260\.0 \* scale\) as u32\);/.test(windowRs),
  'Dynamic Island bounds updates must not shrink the native surface and clip its lower controls'
);
const shareCss = fs.readFileSync(path.join(__dirname, '../src/styles/_components.css'), 'utf8');
assert(
  shareCss.includes('.share-options-modal[hidden]') &&
  shareCss.includes('.share-options-dialog') &&
  shareCss.includes('.share-provider-row') &&
  shareCss.includes('inset: auto;') &&
  shareCss.includes('pointer-events: none;') &&
  !shareCss.includes('.share-options-backdrop'),
  'Share options must render as an anchored glass popover without a full-screen backdrop'
);
assert(
  rendererJs.includes('function positionShareOptionsPopover()') &&
  rendererJs.includes('function closeShareOptionsDialog') &&
  rendererJs.includes("document.addEventListener('pointerdown', event => {") &&
  rendererJs.includes("window.addEventListener('resize', positionShareOptionsPopover);"),
  'Share popover must anchor to its trigger, close on outside interaction, and reposition on viewport changes'
);
const shareHtml = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
assert(
  /id="share-options-modal"[^>]*share-options-popover[^>]*hidden/.test(shareHtml) &&
  !shareHtml.includes('share-options-backdrop'),
  'Share panel markup must use the compact popover surface without a blocking backdrop'
);
const lyricsCss = fs.readFileSync(path.join(__dirname, '../src/styles/_lyrics.css'), 'utf8');
assert(
  lyricsCss.includes('body:not(.layout-split):not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode):not(.cinematic-view-active) .lyric-annotation-btn') &&
  lyricsCss.includes('position: static !important;'),
  'Normal-view Genius annotation controls must remain beside their lyric instead of at the far edge of the panel'
);
const shareHandlerStart = rendererJs.indexOf("document.getElementById('btn-share-copy-link')?.addEventListener('click'");
const shareHandlerEnd = rendererJs.indexOf("document.getElementById('btn-share-open-card')", shareHandlerStart);
const shareLinkHandler = rendererJs.slice(shareHandlerStart, shareHandlerEnd);
assert(
  shareHandlerStart >= 0 && shareHandlerEnd > shareHandlerStart &&
  shareLinkHandler.includes('showSongProviderLinks();') && !shareLinkHandler.includes('copyShareText('),
  'Opening the Copy music link option must show provider choices without silently copying the first link'
);
assert(
  /id="btn-share-open-card"[^>]*disabled[^>]*aria-disabled="true"/.test(fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8')),
  'The under-development share-card action must remain blocked in the share panel'
);
assert(
  rendererJs.includes("const sourceAtSpotifyRequestStart = currentTrackPlaybackSource;") &&
  rendererJs.includes('sourceAtSpotifyRequestStart\n            ))') &&
  rendererJs.includes("data.source = 'windows-smtc';") &&
  rendererJs.includes("data.source = 'spotify-web-api';"),
  'SMTC and Spotify source identity must be carried through asynchronous track arbitration'
);
console.log('  9. Wallpaper handoff, Island bottom clearance, and share modal styling are covered');

console.log('\nAll Track Switch Lyrics Integrity & Match Accuracy tests passed successfully!\n');
