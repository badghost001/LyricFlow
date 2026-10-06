/**
 * Unit & Integration Tests: Enhanced LRC Synchronization & Drift Protection
 */

const assert = require('assert');
const { parseLRC, parseYRC, yrcToEnhancedLRC, cleanLyricText, cleanWordPunctuation } = require('../src/modules/parsers.js');
const ExistingWaterfallProvider = require('../src/services/lyrics/ExistingWaterfallProvider.js');
const LyricEngine = require('../src/services/lyrics/LyricsEngine.js');

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

function runEnhancedLrcSyncTests() {
  console.log('\n--- Running Enhanced LRC Sync & Drift Protection Tests ---\n');

  // Test 1: [offset: 500] delays timestamps by 500ms (standard LRC / Lyricify behavior)
  test('1. parseLRC [offset: 500] delays timestamps by 500ms', () => {
    const lrc = `[offset: 500]
[00:10.00] <00:10.00>Never <00:10.40>gonna <00:10.80>give <00:11.20>you`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].timeMs, 10500);
    assert.strictEqual(res[0].words[0].timeMs, 10500);
    assert.strictEqual(res[0].words[0].endMs, 10900);
    assert.strictEqual(res[0].words[1].timeMs, 10900);
    assert.strictEqual(res[0].words[1].endMs, 11300);
  });

  // Test 2: [offset: -400] advances timestamps by 400ms
  test('2. parseLRC [offset: -400] advances timestamps by 400ms', () => {
    const lrc = `[offset: -400]
[00:10.00] <00:10.00>Never <00:10.40>gonna`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].timeMs, 9600);
    assert.strictEqual(res[0].words[0].timeMs, 9600);
    assert.strictEqual(res[0].words[0].endMs, 10000);
    assert.strictEqual(res[0].words[1].timeMs, 10000);
  });

  // Test 3: Trailing syllable tag without text accurately specifies last-word endMs
  test('3. parseLRC preserves exact endMs on final word via trailing syllable tag', () => {
    const lrc = `[00:10.00] <00:10.00>Never <00:10.40>gonna <00:10.80>give <00:11.20>you <00:11.50>up <00:14.50>`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].words.length, 5);
    const lastWord = res[0].words[4];
    assert.strictEqual(lastWord.text, 'up');
    assert.strictEqual(lastWord.timeMs, 11500);
    assert.strictEqual(lastWord.endMs, 14500);
    assert.strictEqual(lastWord.duration, 3000);
  });

  // Test 4: Long vocal gap does not stretch preceding word fill across multi-second pause
  test('4. parseLRC caps natural word duration over multi-second inter-word pauses', () => {
    const lrc = `[00:10.00] <00:10.00>Hold <00:10.50>on <00:15.00>to <00:15.50>me`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].words.length, 4);
    const wordOn = res[0].words[1];
    assert.strictEqual(wordOn.text, 'on');
    assert.strictEqual(wordOn.timeMs, 10500);
    // Gap is 4500ms, duration must be capped under 1800ms
    assert.ok(wordOn.duration <= 1800, `Duration was ${wordOn.duration}ms, expected <= 1800ms`);
    assert.strictEqual(wordOn.endMs, 10500 + wordOn.duration);
  });

  // Test 5: yrcToEnhancedLRC serialization emits closing tag and preserves round-trip timing
  test('5. yrcToEnhancedLRC preserves exact word endMs through round-trip parseLRC', () => {
    const yrc = `[12000,4500](12000,500,0)Take (12500,500,0)on (13000,3500,0)me`;
    const elrc = yrcToEnhancedLRC(yrc);
    assert.ok(elrc.includes('<00:16.50>'), `Expected trailing <00:16.50> tag in ${elrc}`);

    const parsed = parseLRC(elrc);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].words.length, 3);
    assert.strictEqual(parsed[0].words[2].text, 'me');
    assert.strictEqual(parsed[0].words[2].timeMs, 13000);
    assert.strictEqual(parsed[0].words[2].endMs, 16500);
    assert.strictEqual(parsed[0].words[2].duration, 3500);
  });

  // Test 6: ExistingWaterfallProvider.toNormalized respects w.endMs and does not clamp wStart forward
  test('6. toNormalized respects w.endMs and adapts line start/end to word bounds', () => {
    const parsedLines = [
      {
        timeMs: 10500, // Line tag is slightly after the first syllable
        text: 'Hello world',
        words: [
          { text: 'Hello', timeMs: 10200, endMs: 10900 },
          { text: 'world', timeMs: 11000, endMs: 13500 }
        ]
      }
    ];
    const norm = ExistingWaterfallProvider.toNormalized(parsedLines, 'Test', 'WORD_SYNCED');
    assert.strictEqual(norm.type, 'WORD');
    const line = norm.lines[0];
    assert.strictEqual(line.start, 10.2); // Not clamped to 10.5!
    assert.strictEqual(line.end, 13.5);
    assert.strictEqual(line.words[0].start, 10.2);
    assert.strictEqual(line.words[0].end, 10.9);
    assert.strictEqual(line.words[1].start, 11.0);
    assert.strictEqual(line.words[1].end, 13.5);
  });

  // Test 7: LyricEngine anti-cutting protection prevents premature line jump
  test('7. LyricEngine does not advance to next line while current line final word is singing', () => {
    const parsedLines = [
      {
        timeMs: 10000,
        text: 'First line singing',
        words: [
          { text: 'First', timeMs: 10000, endMs: 10500 },
          { text: 'line', timeMs: 10500, endMs: 11000 },
          { text: 'singing', timeMs: 11000, endMs: 14000 } // Sustained until 14.0s
        ]
      },
      {
        timeMs: 12000, // Author placed next line tag at 12.0s!
        text: 'Second line coming',
        words: [
          { text: 'Second', timeMs: 14500, endMs: 15000 }, // Vocal starts at 14.5s
          { text: 'line', timeMs: 15000, endMs: 15500 },
          { text: 'coming', timeMs: 15500, endMs: 16000 }
        ]
      }
    ];

    const norm = ExistingWaterfallProvider.toNormalized(parsedLines, 'Test', 'WORD_SYNCED');
    const engine = new LyricEngine();
    engine.setLyrics(norm);

    // At 11.5s: First line is singing "singing"
    let state = engine.update(11.5);
    assert.strictEqual(state.lineIndex, 0);
    assert.strictEqual(state.wordIndex, 2);

    // At 12.5s: Next line tag [00:12.00] has passed, BUT "singing" is active until 14.0s!
    // Engine MUST stay on line 0 (no premature cutoff)
    state = engine.update(12.5);
    assert.strictEqual(state.lineIndex, 0, 'Engine must NOT jump to line 1 at 12.5s while line 0 is singing');
    assert.strictEqual(state.wordIndex, 2);

    // At 13.8s: Still in line 0's sustained note
    state = engine.update(13.8);
    assert.strictEqual(state.lineIndex, 0);

    // At 14.5s: Second line vocal starts
    state = engine.update(14.5);
    assert.strictEqual(state.lineIndex, 1);
    assert.strictEqual(state.wordIndex, 0);
  });

  // Test 8: Binary search preserves active line when jumping into sustained vocal
  test('8. LyricEngine binary search preserves active line on seeking into sustained vocal', () => {
    const parsedLines = [
      {
        timeMs: 10000,
        text: 'First line singing',
        words: [
          { text: 'First', timeMs: 10000, endMs: 10500 },
          { text: 'singing', timeMs: 10500, endMs: 14000 }
        ]
      },
      {
        timeMs: 12000,
        text: 'Second line',
        words: [
          { text: 'Second', timeMs: 14500, endMs: 15000 }
        ]
      }
    ];
    const norm = ExistingWaterfallProvider.toNormalized(parsedLines, 'Test', 'WORD_SYNCED');
    const engine = new LyricEngine();
    engine.setLyrics(norm);

    // Seeking directly to 13.0s:
    const state = engine.update(13.0);
    assert.strictEqual(state.lineIndex, 0);
    assert.strictEqual(state.wordIndex, 1);
  });

  // Test 9: Enhanced LRC lines starting with parentheses/brackets
  test('9. parseLRC preserves lines wrapped in parentheses or brackets', () => {
    const lrc = `[00:10.00] (<00:10.00>Never <00:10.40>gonna <00:10.80>give)`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].words.length, 3);
    assert.strictEqual(res[0].words[0].text, '(Never');
    assert.strictEqual(res[0].words[0].timeMs, 10000);
    assert.strictEqual(res[0].words[1].text, 'gonna');
    assert.strictEqual(res[0].words[1].timeMs, 10400);
    assert.strictEqual(res[0].words[2].text, 'give)');
    assert.strictEqual(res[0].words[2].timeMs, 10800);
    assert.strictEqual(res[0].text, '(Never gonna give)');
  });

  // Test 10: Enhanced LRC syllable words containing brackets [backing]
  test('10. parseLRC captures words with square brackets [backing]', () => {
    const lrc = `[00:10.00] <00:10.00>[backing] <00:10.50>vocals`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].words.length, 2);
    assert.strictEqual(res[0].words[0].text, '[backing]');
    assert.strictEqual(res[0].words[0].timeMs, 10000);
    assert.strictEqual(res[0].words[1].text, 'vocals');
    assert.strictEqual(res[0].words[1].timeMs, 10500);
    assert.strictEqual(res[0].text, '[backing] vocals');
  });

  // Test 11: Enhanced LRC words with parentheses (Yeah)
  test('11. parseLRC preserves parenthesized syllables (Yeah)', () => {
    const lrc = `[00:10.00] <00:10.00>(Yeah) <00:10.50>(yeah) <00:11.00>yeah`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].words.length, 3);
    assert.strictEqual(res[0].words[0].text, '(Yeah)');
    assert.strictEqual(res[0].words[0].timeMs, 10000);
    assert.strictEqual(res[0].words[1].text, '(yeah)');
    assert.strictEqual(res[0].words[1].timeMs, 10500);
    assert.strictEqual(res[0].words[2].text, 'yeah');
    assert.strictEqual(res[0].words[2].timeMs, 11000);
  });

  // Test 12: Bracket-based syllable tags with bracketed text inside
  test('12. parseLRC handles bracket tags with bracket text inside', () => {
    const lrc = `[00:10.00] [00:10.00][backing] [00:10.50]vocals`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].words.length, 2);
    assert.strictEqual(res[0].words[0].text, '[backing]');
    assert.strictEqual(res[0].words[0].timeMs, 10000);
    assert.strictEqual(res[0].words[1].text, 'vocals');
    assert.strictEqual(res[0].words[1].timeMs, 10500);
  });

  // Test 13: Enhanced LRC eliminates double spaces around syllable tags
  test('13. parseLRC eliminates multiple spaces around syllable tags', () => {
    const lrc = `[00:10.00] <00:10.00>Never <00:10.40> gonna <00:10.80> give <00:11.20> you`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].text, 'Never gonna give you');
    assert.strictEqual(res[0].words.length, 4);
    assert.strictEqual(res[0].words[0].text, 'Never');
    assert.strictEqual(res[0].words[1].text, 'gonna');
    assert.strictEqual(res[0].words[2].text, 'give');
    assert.strictEqual(res[0].words[3].text, 'you');
  });

  // Test 14: Enhanced LRC removes spaces before punctuation
  test('14. parseLRC eliminates random spaces before punctuation', () => {
    const lrc = `[00:10.00] <00:10.00>Hello <00:10.40>, <00:10.60>world <00:10.80>!`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].text, 'Hello, world!');
    assert.strictEqual(res[0].words.length, 2);
    assert.strictEqual(res[0].words[0].text, 'Hello,');
    assert.strictEqual(res[0].words[1].text, 'world!');
  });

  // Test 15: Intra-word syllables preserve hasSpace: false
  test('15. parseLRC preserves hasSpace flag on intra-word syllables', () => {
    const lrc = `[00:10.00] <00:10.00>in<00:10.10>vis<00:10.20>i<00:10.30>ble <00:10.50>light`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].text, 'invisible light');
    assert.strictEqual(res[0].words.length, 5);
    assert.strictEqual(res[0].words[0].hasSpace, false);
    assert.strictEqual(res[0].words[1].hasSpace, false);
    assert.strictEqual(res[0].words[2].hasSpace, false);
    assert.strictEqual(res[0].words[3].hasSpace, true);
    assert.strictEqual(res[0].words[4].hasSpace, false);
  });

  // Test 16: Contraction syllable splits do not duplicate apostrophes
  test('16. parseLRC preserves contraction syllables cleanly', () => {
    const lrc = `[00:10.00] <00:10.00>don<00:10.20>'t <00:10.40>stop <00:10.60>you<00:10.80>'re <00:11.00>right`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].text, "don't stop you're right");
    assert.strictEqual(res[0].words[0].text, 'don');
    assert.strictEqual(res[0].words[1].text, "'t");
    assert.strictEqual(res[0].words[2].text, 'stop');
    assert.strictEqual(res[0].words[3].text, 'you');
    assert.strictEqual(res[0].words[4].text, "'re");
  });

  // Test 17: Eliminates artificial delimiter spaces between continuous Hanzi
  test('17. parseLRC removes artificial spaces between continuous Hanzi', () => {
    const lrc = `[00:10.00] <00:10.00> 我 <00:10.40> 爱 <00:10.80> 你`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].text, '我爱你');
  });

  // Test 18: Preserves intentional phrase spaces in Japanese/English mixed lyrics
  test('18. parseLRC preserves phrase spaces in Japanese lyrics', () => {
    const lrc = `[00:10.00] <00:10.00>Every<00:10.20>day <00:10.40>ずっと <00:10.80>夢<00:11.00>見<00:11.20>てた`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].text, 'Everyday ずっと 夢見てた');
  });

  // Test 19: Eliminates double brackets and collapses to single bracket
  test('19. cleanLyricText eliminates double brackets and collapses to single bracket', () => {
    assert.strictEqual(cleanLyricText('((Never gonna give you up))'), '(Never gonna give you up)');
    assert.strictEqual(cleanLyricText('(( Never gonna give you up ))'), '(Never gonna give you up)');
    assert.strictEqual(cleanLyricText('( ( Never gonna give you up ) )'), '(Never gonna give you up)');
    assert.strictEqual(cleanLyricText('[[ backing vocals ]]'), '[backing vocals]');
    assert.strictEqual(cleanLyricText('【【中文歌词】】'), '【中文歌词】');
    assert.strictEqual(cleanLyricText('（（ 全角括号 ））'), '（全角括号）');
    assert.strictEqual(cleanLyricText('{{ curly braces }}'), '{curly braces}');
    assert.strictEqual(cleanLyricText('{{curly braces}}'), '{curly braces}');
    assert.strictEqual(cleanLyricText('《《书名号》》'), '《书名号》');
  });

  // Test 20: Eliminates extra space before and after brackets
  test('20. cleanLyricText eliminates extra space before and after brackets', () => {
    assert.strictEqual(cleanLyricText('word   (backing)   vocals'), 'word (backing) vocals');
    assert.strictEqual(cleanLyricText('(backing)   .'), '(backing).');
    assert.strictEqual(cleanLyricText('(backing)   ,'), '(backing),');
    assert.strictEqual(cleanLyricText('  ((  hello world  ))  '), '(hello world)');
    assert.strictEqual(cleanLyricText('word  ( inside )  word'), 'word (inside) word');
    assert.strictEqual(cleanLyricText('word   [backing]   vocals'), 'word [backing] vocals');
    assert.strictEqual(cleanLyricText('(test)    (another)'), '(test) (another)');
  });

  // Test 21: parseLRC removes double brackets and normalizes word tokens
  test('21. parseLRC removes double brackets and normalizes word tokens', () => {
    const lrc = `[00:10.00] ((<00:10.00>Never <00:10.40>gonna <00:10.80>give))`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].text, '(Never gonna give)');
    assert.strictEqual(res[0].words.length, 3);
    assert.strictEqual(res[0].words[0].text, '(Never');
    assert.strictEqual(res[0].words[1].text, 'gonna');
    assert.strictEqual(res[0].words[2].text, 'give)');
  });

  // Test 22: parseLRC collapses bracket spacing in word tokens and handles ad-libs
  test('22. parseLRC collapses bracket spacing in word tokens and handles ad-libs', () => {
    const lrc = `[00:10.00] <00:10.00>word <00:10.40> ((backing)) <00:10.80>vocals`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].text, 'word (backing) vocals');
    assert.strictEqual(res[0].words.length, 3);
    assert.strictEqual(res[0].words[0].text, 'word');
    assert.strictEqual(res[0].words[1].text, '(backing)');
    assert.strictEqual(res[0].words[2].text, 'vocals');
  });

  // Test 23: cleanWordPunctuation collapses repeated brackets and removes interior spaces
  test('23. cleanWordPunctuation collapses repeated brackets and removes interior spaces', () => {
    assert.strictEqual(cleanWordPunctuation('((Never'), '(Never');
    assert.strictEqual(cleanWordPunctuation('( (Never'), '(Never');
    assert.strictEqual(cleanWordPunctuation('give))'), 'give)');
    assert.strictEqual(cleanWordPunctuation('give) )'), 'give)');
    assert.strictEqual(cleanWordPunctuation('[[backing]]'), '[backing]');
    assert.strictEqual(cleanWordPunctuation('【【中文】】'), '【中文】');
    assert.strictEqual(cleanWordPunctuation('（（全角））'), '（全角）');
  });

  // Test 24: SPOTIFY_ACOUSTIC_LEAD_MS in renderer.js is strictly 0 to prevent lyrics racing ahead
  test('24. renderer.js sets SPOTIFY_ACOUSTIC_LEAD_MS to 0 to prevent racing lyrics and pause rubber-banding', () => {
    const fs = require('fs');
    const path = require('path');
    const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
    const match = rendererCode.match(/const\s+SPOTIFY_ACOUSTIC_LEAD_MS\s*=\s*(\d+);/);
    assert.ok(match, 'SPOTIFY_ACOUSTIC_LEAD_MS definition must exist');
    assert.strictEqual(Number(match[1]), 0, 'SPOTIFY_ACOUSTIC_LEAD_MS must be 0ms to eliminate forward racing');
  });

  // Test 25: renderer.js defines handleLocalOrPollPause with immediate playhead and cinematic stage refresh
  test('25. renderer.js defines handleLocalOrPollPause with immediate playhead & cinematic stage update', () => {
    const fs = require('fs');
    const path = require('path');
    const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
    assert.ok(rendererCode.includes('function handleLocalOrPollPause('), 'handleLocalOrPollPause function must exist');
    assert.ok(rendererCode.includes('cinematicMainRendererInstance.seek(getAcousticSyncProgress())'), 'Must seek cinematic stage on pause');
    assert.ok(rendererCode.includes('requestAnimationFrame(updatePlayhead)'), 'Must refresh playhead frame on pause');
  });

  // Test 26: renderer.js handlePlaybackData incorporates drift convergence for drift > 20ms
  test('26. renderer.js handlePlaybackData incorporates drift convergence for drift > 20ms', () => {
    const fs = require('fs');
    const path = require('path');
    const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
    assert.ok(rendererCode.includes('absDrift > 20'), 'Must contain 20ms threshold for smooth drift convergence');
    assert.ok(rendererCode.includes('currentProgress - adjustment'), 'Must smoothly adjust currentProgress toward reported position');
  });

  console.log(`\nEnhanced LRC Sync Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runEnhancedLrcSyncTests();

