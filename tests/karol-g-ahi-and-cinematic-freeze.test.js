/**
 * tests/karol-g-ahi-and-cinematic-freeze.test.js
 * Verification test suite for:
 * 1. Multi-artist separation on "Ahí" by KAROL G & Drake (element.singer v1/v2 & bracket tags).
 * 2. Standalone section tags ([Drake], [Verse 2: Drake]) set singer turn and omit empty display line.
 * 3. Cinematic Canvas 30 FPS frame governor & redundant render elimination.
 * 4. Classic lyric highlight purge & exit cinematic mode clean state restore.
 * 5. Taskbar mode Win32 decoupling & unrestricted toggling.
 * 6. qApple / AM / iTunes source acceptance without rejection.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const parsers = require('../src/modules/parsers.js');
const { LyricsPlusService } = require('../src/services/lyrics/LyricsPlus.js');
const KineticCanvasRenderer = require('../src/modules/kinetic/KineticCanvasRenderer.js');

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
    process.exit(1);
  }
}

console.log('\n--- Running KAROL G "Ahí", Cinematic Mode & Taskbar Fixes Test Suite ---\n');

// 1. "Ahí" by KAROL G & Drake with element.singer "v1" and "v2"
test('1. Duet separation on Ahí by KAROL G & Drake maps v1 to KAROL G and v2 to Drake', () => {
  const ahiLines = [
    { text: 'Ahi donde me pongo sentimental', timeMs: 12000, singer: 'v1' },
    { text: 'Tu recuerdo me vuelve a buscar', timeMs: 16000, singer: 'v1' },
    { text: 'You know that I still think about us', timeMs: 32000, singer: 'v2' },
    { text: 'Late nights driving down the boulevard', timeMs: 36000, singer: 'v2' }
  ];

  const separated = parsers.applyLyricsArtistSeparation(ahiLines, 'KAROL G & Drake');

  assert.strictEqual(separated.length, 4);

  // KAROL G lines
  assert.strictEqual(separated[0].singer, 'KAROL G');
  assert.strictEqual(separated[0].singerRole, 'primary');
  assert.strictEqual(separated[0].singerTurnStart, true);

  assert.strictEqual(separated[1].singer, 'KAROL G');
  assert.strictEqual(separated[1].singerRole, 'primary');
  assert.strictEqual(separated[1].singerTurnStart, false);

  // Drake lines
  assert.strictEqual(separated[2].singer, 'Drake');
  assert.strictEqual(separated[2].singerRole, 'secondary');
  assert.strictEqual(separated[2].singerTurnStart, true);

  assert.strictEqual(separated[3].singer, 'Drake');
  assert.strictEqual(separated[3].singerRole, 'secondary');
  assert.strictEqual(separated[3].singerTurnStart, false);
});

// 2. Standalone section tag [Drake] sets singer turn and removes empty header line
test('2. Standalone [Drake] and [Verse 2: Drake] tags set singer turn and omit empty header line', () => {
  const ahiLrcLines = [
    { text: 'Intro verse by KAROL G', timeMs: 10000 },
    { text: '[Drake]', timeMs: 28000 },
    { text: 'Yeah, look', timeMs: 29000 },
    { text: 'Never thought it would end like this', timeMs: 31000 }
  ];

  const separated = parsers.applyLyricsArtistSeparation(ahiLrcLines, 'KAROL G & Drake');

  // The standalone "[Drake]" line must be consumed and omitted
  assert.strictEqual(separated.length, 3);
  assert.strictEqual(separated[0].text, 'Intro verse by KAROL G');
  assert.strictEqual(separated[0].singer, 'KAROL G');
  assert.strictEqual(separated[0].singerRole, 'primary');

  assert.strictEqual(separated[1].text, 'Yeah, look');
  assert.strictEqual(separated[1].singer, 'Drake');
  assert.strictEqual(separated[1].singerRole, 'secondary');
  assert.strictEqual(separated[1].singerTurnStart, true);

  assert.strictEqual(separated[2].text, 'Never thought it would end like this');
  assert.strictEqual(separated[2].singer, 'Drake');
  assert.strictEqual(separated[2].singerRole, 'secondary');
  assert.strictEqual(separated[2].singerTurnStart, false);
});

// 3. parseSingerTag parses section-colon headers: [Verse 2: Drake]
test('3. parseSingerTag correctly resolves [Verse 2: Drake] and [Chorus: KAROL G]', () => {
  const artists = ['KAROL G', 'Drake'];
  const res1 = parsers.parseSingerTag('[Verse 2: Drake] I had to make a change', artists);
  assert.ok(res1);
  assert.strictEqual(res1.singer, 'Drake');
  assert.strictEqual(res1.singerRole, 'secondary');
  assert.strictEqual(res1.cleanText, 'I had to make a change');

  const res2 = parsers.parseSingerTag('[Chorus: KAROL G] Ahi donde me duele', artists);
  assert.ok(res2);
  assert.strictEqual(res2.singer, 'KAROL G');
  assert.strictEqual(res2.singerRole, 'primary');
  assert.strictEqual(res2.cleanText, 'Ahi donde me duele');
});

// 4. LyricsPlus normalizer extracts element.singer from Binimum / qApple JSON
test('4. LyricsPlus normalizeResponse correctly extracts item.element.singer for qApple', () => {
  const provider = new LyricsPlusService();
  const rawData = {
    type: 'word',
    metadata: {
      agents: {
        v1: { name: 'KAROL G', alias: 'v1' },
        v2: { name: 'Drake', alias: 'v2' }
      }
    },
    lines: [
      {
        text: 'Parte de KAROL G',
        startTimeMs: 1000,
        durationMs: 4000,
        element: { singer: 'v1' },
        words: [{ text: 'Parte', startTimeMs: 1000, durationMs: 500 }]
      },
      {
        text: 'Drake verse line',
        startTimeMs: 6000,
        durationMs: 4000,
        element: { singer: 'v2' },
        words: [{ text: 'Drake', startTimeMs: 6000, durationMs: 500 }]
      }
    ]
  };

  const normalized = provider.normalizeResponse(rawData, { title: 'Ahí', artist: 'KAROL G & Drake' });
  assert.ok(normalized);
  assert.strictEqual(normalized.lines[0].singer, 'KAROL G');
  assert.strictEqual(normalized.lines[1].singer, 'Drake');
});

// 5. CinematicCanvasRenderer 30 FPS governor in loop
test('5. KineticCanvasRenderer source declares 30 FPS cinematic frame governor', () => {
  const kineticJs = fs.readFileSync(path.resolve(__dirname, '../src/modules/kinetic/KineticCanvasRenderer.js'), 'utf8');
  assert.ok(
    kineticJs.includes('isCinematicThrottle') && kineticJs.includes('< 30'),
    'KineticCanvasRenderer must throttle frames to ~30ms in cinematic mode to cut GPU/CPU usage'
  );
  assert.ok(
    kineticJs.includes('if (this.isPlaying && !this.isPaused)'),
    'KineticCanvasRenderer must avoid redundant renderFrame calls during active RAF playback'
  );
});

// 6. Classic lyric highlight purge & reset
test('6. renderer.js purgeClassicLyricHighlightState thoroughly cleans all lines, words, and resets activeLineIndex', () => {
  const rendererJs = fs.readFileSync(path.resolve(__dirname, '../src/renderer.js'), 'utf8');
  assert.ok(
    rendererJs.includes('function purgeClassicLyricHighlightState() {') &&
    rendererJs.includes('activeLineIndex = -1;') &&
    rendererJs.includes("w.classList.add('lyric-word-upcoming');") &&
    rendererJs.includes("delete w._lastProgressValue;"),
    'purgeClassicLyricHighlightState must purge activeLineIndex, word progress, and set upcoming'
  );
});

// 7. Taskbar mode decoupled from Shell_TrayWnd
test('7. Taskbar mode Win32 window is decoupled from Shell_TrayWnd parent on Windows 11', () => {
  const windowRs = fs.readFileSync(path.resolve(__dirname, '../src-tauri/src/commands/window.rs'), 'utf8');
  assert.ok(
    !windowRs.includes('SetWindowLongPtrW(hwnd_val, GWLP_HWNDPARENT'),
    'tb_win must NOT set GWLP_HWNDPARENT to Shell_TrayWnd, ensuring it floats directly above Windows 11 taskbar'
  );
});

// 8. qApple regex accepts AM and iTunes reported sources without rejection
test('8. LyricsPlus accepts AM and iTunes reported sources as qApple', () => {
  const lpJs = fs.readFileSync(path.resolve(__dirname, '../src/services/lyrics/LyricsPlus.js'), 'utf8');
  assert.ok(
    lpJs.includes('!/apple|qapple|^am$|itunes|^lyricsplus$/i.test(reportedSource)'),
    'LyricsPlus must accept reportedSource matching AM, iTunes, and Apple'
  );
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
if (passedTests !== totalTests) {
  process.exit(1);
}
