/**
 * Unit Tests for Multi-Artist Lyric Separation (Duet Layout, Singer Chips & Vocal Color Tints)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

function runDuetSeparationTests() {
  console.log('\n--- Running Multi-Artist Lyric Separation & Duet Formatting Tests ---\n');

  const parsersPath = path.resolve(__dirname, '../src/modules/parsers.js');
  const lyricsCssPath = path.resolve(__dirname, '../src/styles/_lyrics.css');
  const rendererJsPath = path.resolve(__dirname, '../src/renderer.js');
  const indexHtmlPath = path.resolve(__dirname, '../src/index.html');

  const parsers = require(parsersPath);
  const lyricsCss = fs.readFileSync(lyricsCssPath, 'utf8');
  const rendererJs = fs.readFileSync(rendererJsPath, 'utf8');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  // Test 1: splitTrackArtists correctly handles various collaborative delimiters
  test('1. splitTrackArtists splits collaborative artists across all common delimiters', () => {
    assert.deepStrictEqual(parsers.splitTrackArtists('Adele'), ['Adele']);
    assert.deepStrictEqual(parsers.splitTrackArtists('Taylor Swift feat. Post Malone'), ['Taylor Swift', 'Post Malone']);
    assert.deepStrictEqual(parsers.splitTrackArtists('Lady Gaga & Bradley Cooper'), ['Lady Gaga', 'Bradley Cooper']);
    assert.deepStrictEqual(parsers.splitTrackArtists('The Weeknd, Daft Punk'), ['The Weeknd', 'Daft Punk']);
    assert.deepStrictEqual(parsers.splitTrackArtists('Ed Sheeran with Justin Bieber'), ['Ed Sheeran', 'Justin Bieber']);
    assert.deepStrictEqual(parsers.splitTrackArtists('Bruno Mars / Anderson .Paak'), ['Bruno Mars', 'Anderson .Paak']);
    assert.deepStrictEqual(parsers.splitTrackArtists('Drake ft. Rihanna'), ['Drake', 'Rihanna']);
  });

  // Test 2: parseSingerTag detects standard bracket, colon, and role prefixes
  test('2. parseSingerTag parses bracket tags, colon prefixes, and duet/chorus tags', () => {
    const artists = ['Taylor Swift', 'Post Malone'];

    // [v1] and [v2]
    const v1 = parsers.parseSingerTag('[v1] Touch me while your boys play Grand Theft Auto', artists);
    assert.ok(v1);
    assert.strictEqual(v1.singer, 'Taylor Swift');
    assert.strictEqual(v1.singerId, 1);
    assert.strictEqual(v1.singerRole, 'primary');
    assert.strictEqual(v1.cleanText, 'Touch me while your boys play Grand Theft Auto');

    const v2 = parsers.parseSingerTag('[v2] I had some help', artists);
    assert.ok(v2);
    assert.strictEqual(v2.singer, 'Post Malone');
    assert.strictEqual(v2.singerId, 2);
    assert.strictEqual(v2.singerRole, 'secondary');
    assert.strictEqual(v2.cleanText, 'I had some help');

    // Both / Duet / Chorus
    const both = parsers.parseSingerTag('[Both] We did it together', artists);
    assert.ok(both);
    assert.strictEqual(v1.singerRole, 'primary');
    assert.strictEqual(both.singerRole, 'both');
    assert.strictEqual(both.cleanText, 'We did it together');

    // Colon prefixes
    const singerCol = parsers.parseSingerTag('Singer 2: Another verse begins', artists);
    assert.ok(singerCol);
    assert.strictEqual(singerCol.singerRole, 'secondary');
    assert.strictEqual(singerCol.cleanText, 'Another verse begins');

    // Known artist names
    const nameMatch = parsers.parseSingerTag('Taylor: Say you remember me', artists);
    assert.ok(nameMatch);
    assert.strictEqual(nameMatch.singer, 'Taylor Swift');
    assert.strictEqual(nameMatch.cleanText, 'Say you remember me');
  });

  // Test 3: applyLyricsArtistSeparation preserves solo tracks without modifications
  test('3. applyLyricsArtistSeparation leaves single-artist tracks without singer tags untouched', () => {
    const soloLines = [
      { text: 'Hello, it is me', timeMs: 1000 },
      { text: 'I was wondering if after all these years', timeMs: 4000 }
    ];
    const result = parsers.applyLyricsArtistSeparation(soloLines, 'Adele');
    assert.strictEqual(result[0].singerRole, undefined);
    assert.strictEqual(result[0].singerName, undefined);
    assert.strictEqual(result[1].singerRole, undefined);
  });

  // Test 4: applyLyricsArtistSeparation propagates turns and strips prefix tags
  test('4. applyLyricsArtistSeparation tracks singer turns and strips prefixes', () => {
    const duetLines = [
      { text: '[v1] Line by first singer', timeMs: 1000, words: [{ text: '[v1]', timeMs: 1000 }, { text: 'Line', timeMs: 1200 }] },
      { text: 'Second line also by first singer', timeMs: 3000 },
      { text: 'Post Malone: Response line by second singer', timeMs: 6000 },
      { text: 'Second line of response', timeMs: 8000 },
      { text: 'Both: Singing together in harmony', timeMs: 11000 }
    ];
    const result = parsers.applyLyricsArtistSeparation(duetLines, 'Taylor Swift feat. Post Malone');

    // Line 0: Taylor Swift start
    assert.strictEqual(result[0].singerName, 'Taylor Swift');
    assert.strictEqual(result[0].singerRole, 'primary');
    assert.strictEqual(result[0].singerTurnStart, true);
    assert.strictEqual(result[0].text, 'Line by first singer');
    assert.strictEqual(result[0].words[0].text, 'Line'); // [v1] stripped

    // Line 1: Inherits Taylor Swift (not turn start)
    assert.strictEqual(result[1].singerName, 'Taylor Swift');
    assert.strictEqual(result[1].singerRole, 'primary');
    assert.strictEqual(result[1].singerTurnStart, false);

    // Line 2: Switches to Post Malone (turn start)
    assert.strictEqual(result[2].singerName, 'Post Malone');
    assert.strictEqual(result[2].singerRole, 'secondary');
    assert.strictEqual(result[2].singerTurnStart, true);
    assert.strictEqual(result[2].text, 'Response line by second singer');

    // Line 3: Inherits Post Malone (not turn start)
    assert.strictEqual(result[3].singerName, 'Post Malone');
    assert.strictEqual(result[3].singerRole, 'secondary');
    assert.strictEqual(result[3].singerTurnStart, false);

    // Line 4: Both / Unison (turn start)
    assert.strictEqual(result[4].singerRole, 'both');
    assert.strictEqual(result[4].singerTurnStart, true);
    assert.strictEqual(result[4].text, 'Singing together in harmony');
  });

  // Test 5: CSS verifies left vs right alignment and center duet layout
  test('5. _lyrics.css defines left, right, and center spatial duet alignments', () => {
    assert.ok(
      lyricsCss.includes('.lyric-line.lyric-singer-primary') ||
      lyricsCss.includes('.lyric-line.lyric-singer-1'),
      'Must declare .lyric-line.lyric-singer-1/primary class rule'
    );
    assert.ok(
      lyricsCss.includes('.lyric-line.lyric-singer-secondary') ||
      lyricsCss.includes('.lyric-line.lyric-singer-2'),
      'Must declare .lyric-line.lyric-singer-2/secondary class rule'
    );
    assert.ok(
      lyricsCss.includes('.lyric-line.lyric-singer-both'),
      'Must declare .lyric-line.lyric-singer-both class rule'
    );
    assert.ok(
      lyricsCss.includes('transform-origin: right center !important;'),
      'Singer 2 must transform-origin right center'
    );
  });

  // Test 6: CSS verifies artist pill badge and avatar chip styling
  test('6. _lyrics.css defines .lyric-singer-chip with backdrop blur and avatar styling', () => {
    assert.ok(lyricsCss.includes('.lyric-singer-chip {'), 'Must declare .lyric-singer-chip');
    assert.ok(lyricsCss.includes('backdrop-filter: blur'), 'Must use frosted glass backdrop filter');
    assert.ok(lyricsCss.includes('.singer-chip-avatar {'), 'Must declare .singer-chip-avatar');
    assert.ok(lyricsCss.includes('.singer-chip-name {'), 'Must declare .singer-chip-name');
  });

  // Test 7: CSS verifies distinctive vocal color tints per artist
  test('7. _lyrics.css defines distinctive vocal color tints and active glows for all roles', () => {
    assert.ok(lyricsCss.includes('.lyric-singer-chip.lyric-singer-chip-1') || lyricsCss.includes('.lyric-singer-chip.lyric-singer-chip-primary'), 'Singer 1 chip tint must exist');
    assert.ok(lyricsCss.includes('.lyric-singer-chip.lyric-singer-chip-2') || lyricsCss.includes('.lyric-singer-chip.lyric-singer-chip-secondary'), 'Singer 2 chip tint must exist');
    assert.ok(lyricsCss.includes('.lyric-singer-chip.lyric-singer-chip-both'), 'Singer Both chip tint must exist');
    assert.ok(lyricsCss.includes('.lyric-line.lyric-singer-2.active'), 'Singer 2 active line styling must exist');
    assert.ok(lyricsCss.includes('.lyric-line.lyric-singer-both.active'), 'Singer Both active line styling must exist');
  });

  // Test 8: index.html and renderer.js wire up duet separation setting
  test('8. index.html and renderer.js wire up Multi-Artist Duet Separation toggle and render pipeline', () => {
    assert.ok(indexHtml.includes('id="check-duet-separation"'), 'Must have check-duet-separation input in index.html');
    assert.ok(rendererJs.includes('duetSeparation: true'), 'Must default duetSeparation to true in renderer.js');
    assert.ok(rendererJs.includes('checkDuetSeparation'), 'Must bind checkDuetSeparation event listener');
    assert.ok(rendererJs.includes('applyLyricsArtistSeparation'), 'Must invoke applyLyricsArtistSeparation in renderer.js');
    assert.ok(rendererJs.includes('lyric-singer-chip'), 'Must render lyric-singer-chip in renderLyrics');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runDuetSeparationTests();
