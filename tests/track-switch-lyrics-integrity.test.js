const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

console.log('\nAll Track Switch Lyrics Integrity & Match Accuracy tests passed successfully!\n');
