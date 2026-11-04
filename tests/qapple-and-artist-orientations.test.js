/**
 * tests/qapple-and-artist-orientations.test.js
 * Verification suite for:
 * 1. Stripping of artist tags (both text tags and chip badges) in duet lyric rendering
 * 2. Distinct spatial orientations (left for Artist 1, right for Artist 2, center for duet)
 * 3. Purging legacy proxy data and replacing it with qApple word-by-word lyrics data
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const parsers = require('../src/modules/parsers.js');

const lyricsCssPath = path.join(__dirname, '..', 'src', 'styles', '_lyrics.css');
const lyricsCss = fs.readFileSync(lyricsCssPath, 'utf8');

const rendererJsPath = path.join(__dirname, '..', 'src', 'renderer.js');
const rendererJs = fs.readFileSync(rendererJsPath, 'utf8');

const engineRsPath = path.join(__dirname, '..', 'src-tauri', 'src', 'commands', 'lyrics', 'engine.rs');
const engineRs = fs.readFileSync(engineRsPath, 'utf8');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

console.log('\n--- Running qApple Word-By-Word & Duet Artist Orientation Test Suite ---\n');

// 1. Text artist tags are completely stripped
test('1. applyLyricsArtistSeparation thoroughly strips artist tags from lyric lines', () => {
  const rawLines = [
    { text: '[KAROL G] Bebé, yo te quiero', timeMs: 5000, words: [{ text: '[KAROL' }, { text: 'G]' }, { text: 'Bebé,' }, { text: 'yo' }, { text: 'te' }, { text: 'quiero' }] },
    { text: '[Verse 2: Drake]', timeMs: 15000 },
    { text: 'Drake: You know that I still think about us', timeMs: 16000 },
    { text: '[Both] Siempre juntos', timeMs: 25000 }
  ];

  const separated = parsers.applyLyricsArtistSeparation(rawLines, 'KAROL G & Drake');

  // Standalone header [Verse 2: Drake] must be omitted completely
  assert.strictEqual(separated.length, 3, 'Standalone header line must be omitted');

  // Line 1: KAROL G tag stripped
  assert.strictEqual(separated[0].singer, 'KAROL G');
  assert.strictEqual(separated[0].singerRole, 'primary');
  assert.strictEqual(separated[0].text, 'Bebé, yo te quiero');
  assert.strictEqual(separated[0].words[0].text, 'Bebé,', 'Word tokens for artist tag must be stripped');

  // Line 2: Drake colon prefix stripped
  assert.strictEqual(separated[1].singer, 'Drake');
  assert.strictEqual(separated[1].singerRole, 'secondary');
  assert.strictEqual(separated[1].text, 'You know that I still think about us');

  // Line 3: Both tag stripped
  assert.strictEqual(separated[2].singerRole, 'both');
  assert.strictEqual(separated[2].text, 'Siempre juntos');
});

// 2. Chip badges are stripped / hidden from the display
test('2. _lyrics.css suppresses .lyric-singer-chip to leave clean orientation-only lyrics', () => {
  assert.ok(lyricsCss.includes('.lyric-singer-chip {') && lyricsCss.includes('display: none !important;'),
    '_lyrics.css must set display: none !important on .lyric-singer-chip to strip artist badges');
});

// 3. Different orientations for different artists
test('3. _lyrics.css defines left orientation for primary and right orientation for secondary', () => {
  assert.ok(
    lyricsCss.includes('.lyric-line.lyric-singer-primary') &&
    lyricsCss.includes('text-align: left !important;') &&
    lyricsCss.includes('align-self: flex-start !important;'),
    'Primary artist must be left-aligned'
  );
  assert.ok(
    lyricsCss.includes('.lyric-line.lyric-singer-secondary') &&
    lyricsCss.includes('text-align: right !important;') &&
    lyricsCss.includes('align-self: flex-end !important;'),
    'Secondary artist must be right-aligned'
  );
  assert.ok(
    lyricsCss.includes('.lyric-line.lyric-singer-both') &&
    lyricsCss.includes('text-align: center !important;') &&
    lyricsCss.includes('align-self: center !important;'),
    'Duet unison must be center-aligned'
  );
});

// 4. Renderer sets dynamic inline text-align and transform origins
test('4. renderer.js configures left and right text-align for singer roles', () => {
  assert.ok(rendererJs.includes("el.style.textAlign = 'right';"), 'Must set text-align right for secondary singer');
  assert.ok(rendererJs.includes("el.style.textAlign = 'left';"), 'Must set text-align left for primary singer');
  assert.ok(rendererJs.includes("el.style.textAlign = 'center';"), 'Must set text-align center for unison');
});

// 5. Rust backend search_qapple replaced search_cloudflare_proxy
test('5. engine.rs defines search_qapple and does not call search_cloudflare_proxy', () => {
  assert.ok(engineRs.includes('async fn search_qapple('), 'engine.rs must declare search_qapple');
  assert.ok(!engineRs.includes('search_cloudflare_proxy'), 'engine.rs must purge search_cloudflare_proxy');
  assert.ok(engineRs.includes('source=apple'), 'search_qapple must query source=apple');
  assert.ok(engineRs.includes('SyncType::WordSynced'), 'qApple lyrics must be parsed as WordSynced');
  assert.ok(engineRs.includes('provider: "LyricsPlus (qApple)".to_string()'), 'Must label qApple provider');
});

// 6. Rust sort_lyrics_candidates places qApple WordSynced at top rank 0
test('6. engine.rs ranks qApple WordSynced as rank 0 priority', () => {
  assert.ok(
    engineRs.includes('(SyncType::WordSynced, "LyricsPlus (qApple)")') &&
    engineRs.includes('=> 0,'),
    'qApple WordSynced must be top priority rank 0 in sort_lyrics_candidates'
  );
});

// 7. Frontend purges proxy cache and replaces proxyFetch with qApple word-by-word
test('7. renderer.js purges stale proxy caches and replaces proxyFetch with qApple word-by-word', () => {
  assert.ok(
    rendererJs.includes('Purging stale proxy cached lyrics') ||
    rendererJs.includes('/proxy/i.test(cachedData.source)'),
    'renderer.js must purge cached proxy lyrics'
  );
  assert.ok(
    rendererJs.includes('qApple word-sync fetch querying') ||
    rendererJs.includes('preferQApple: true'),
    'proxyFetch in renderer.js must query qApple word-by-word lyrics'
  );
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
if (passedTests !== totalTests) {
  process.exit(1);
}
