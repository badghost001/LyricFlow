/**
 * Unit Tests for Lyric Parsers (LRC, Musixmatch, LyricsPlus)
 */

const assert = require('assert');
const { parseLRC, parseMusixmatch, parseLyricsPlus, parseYRC, yrcToEnhancedLRC, isLyricMetadataOrCreditLine } = require('../src/modules/parsers.js');

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

function runParserTests() {
  console.log('\n--- Running Lyric Parsers Unit Tests ---\n');

  // Test 1: Standard LRC Parsing
  test('1. parseLRC correctly parses standard mm:ss.xx lines', () => {
    const lrc = `[00:04.20]Intro line
[00:12.50]Second lyric line
[01:05.123]Line past one minute`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 3);
    assert.strictEqual(res[0].timeMs, 4200);
    assert.strictEqual(res[0].text, 'Intro line');
    assert.strictEqual(res[1].timeMs, 12500);
    assert.strictEqual(res[1].text, 'Second lyric line');
    assert.strictEqual(res[2].timeMs, 65123);
    assert.strictEqual(res[2].text, 'Line past one minute');
  });

  // Test 2: Enhanced Syllable LRC Parsing (Legacy Postfix Format)
  test('2. parseLRC extracts syllable tags (<mm:ss.xx>) into word array (Legacy)', () => {
    const lrc = `[00:10.00]Never <00:10.40>gonna <00:10.80>give <00:11.20>you <00:11.50>up`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].timeMs, 10000);
    assert.strictEqual(res[0].words.length >= 4, true);
    assert.strictEqual(res[0].words[0].text, 'Never');
    assert.strictEqual(res[0].words[0].timeMs, 10400);
  });

  // Test 2b: Standard A2 Enhanced LRC Format (Prefix Syllable Tags)
  test('2b. parseLRC extracts standard A2 Enhanced LRC (<mm:ss.xx>word) with correct start/end times', () => {
    const lrc = `[00:10.00] <00:10.00>Never <00:10.40>gonna <00:10.80>give <00:11.20>you <00:11.50>up`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].timeMs, 10000);
    assert.strictEqual(res[0].words.length, 5);
    assert.strictEqual(res[0].words[0].text, 'Never');
    assert.strictEqual(res[0].words[0].timeMs, 10000);
    assert.strictEqual(res[0].words[0].endMs, 10400);
    assert.strictEqual(res[0].words[0].duration, 400);

    assert.strictEqual(res[0].words[1].text, 'gonna');
    assert.strictEqual(res[0].words[1].timeMs, 10400);
    assert.strictEqual(res[0].words[1].endMs, 10800);
    assert.strictEqual(res[0].words[1].duration, 400);

    assert.strictEqual(res[0].words[4].text, 'up');
    assert.strictEqual(res[0].words[4].timeMs, 11500);
    assert.strictEqual(res[0].words[4].duration >= 500, true);
  });

  // Test 2c: Bracket-Based Syllable Tokens ([mm:ss.xx]word)
  test('2c. parseLRC handles bracket-based syllable tokens ([mm:ss.xx]word)', () => {
    const lrc = `[00:20.00][00:20.00]Hello [00:20.50]World`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].timeMs, 20000);
    assert.strictEqual(res[0].words.length, 2);
    assert.strictEqual(res[0].words[0].text, 'Hello');
    assert.strictEqual(res[0].words[0].timeMs, 20000);
    assert.strictEqual(res[0].words[0].endMs, 20500);
    assert.strictEqual(res[0].words[1].text, 'World');
    assert.strictEqual(res[0].words[1].timeMs, 20500);
  });

  // Test 3: Musixmatch RichSync Parsing
  test('3. parseMusixmatch parses word-level synced RichSync structures', () => {
    const mxm = {
      lyrics: [
        {
          startTimeMs: 5500,
          words: 'I see fire',
          syllables: [
            { text: 'I', offsetMs: 0 },
            { text: 'see', offsetMs: 300 },
            { text: 'fire', offsetMs: 800 }
          ]
        }
      ]
    };
    const res = parseMusixmatch(mxm);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].timeMs, 5500);
    assert.strictEqual(res[0].text, 'I see fire');
    assert.strictEqual(res[0].words.length, 3);
    assert.strictEqual(res[0].words[0].text, 'I');
    assert.strictEqual(res[0].words[0].timeMs, 5500);
    assert.strictEqual(res[0].words[2].text, 'fire');
    assert.strictEqual(res[0].words[2].timeMs, 6300);
  });

  // Test 4: LyricsPlus Deep-Scan Parsing
  test('4. parseLyricsPlus parses syllable timing arrays and handles offset fallbacks', () => {
    const lp = [
      {
        startTimeMs: 12000,
        words: [
          { text: 'Hello', startTimeMs: 12000 },
          { text: 'world', startTimeMs: 12500 }
        ]
      }
    ];
    const res = parseLyricsPlus(lp);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].timeMs, 12000);
    assert.strictEqual(res[0].text, 'Hello world');
    assert.strictEqual(res[0].words.length, 2);
    assert.strictEqual(res[0].words[1].timeMs, 12500);
  });

  // Test 5: Empty/Null Guard Handling
  test('5. Parsers return empty array on invalid or null input without throwing', () => {
    assert.deepStrictEqual(parseLRC(null), []);
    assert.deepStrictEqual(parseLRC(''), []);
    assert.deepStrictEqual(parseMusixmatch(null), []);
    assert.deepStrictEqual(parseLyricsPlus(null), []);
    assert.deepStrictEqual(parseYRC(null), []);
    assert.deepStrictEqual(parseYRC(''), []);
    assert.strictEqual(yrcToEnhancedLRC(null), '');
    assert.strictEqual(yrcToEnhancedLRC(''), '');
  });

  // Test 6a: NetEase YRC Word-by-Word Parsing
  test('6a. parseYRC parses NetEase YRC word-by-word syllables with timing and duration', () => {
    const yrc = `[12000,3200](12000,500,0)Ne(12500,400,0)ver (12900,600,0)gon(13500,700,0)na
[16000,2000](16000,1000,0)give (17000,1000,0)up`;
    const res = parseYRC(yrc);
    assert.strictEqual(res.length, 2);
    assert.strictEqual(res[0].timeMs, 12000);
    assert.strictEqual(res[0].text, 'Never gonna');
    assert.strictEqual(res[0].words.length, 4);

    assert.strictEqual(res[0].words[0].text, 'Ne');
    assert.strictEqual(res[0].words[0].timeMs, 12000);
    assert.strictEqual(res[0].words[0].endMs, 12500);
    assert.strictEqual(res[0].words[0].duration, 500);

    assert.strictEqual(res[0].words[1].text, 'ver ');
    assert.strictEqual(res[0].words[1].timeMs, 12500);
    assert.strictEqual(res[0].words[1].endMs, 12900);
    assert.strictEqual(res[0].words[1].duration, 400);

    assert.strictEqual(res[1].timeMs, 16000);
    assert.strictEqual(res[1].text, 'give up');
    assert.strictEqual(res[1].words.length, 2);
  });

  // Test 6b: yrcToEnhancedLRC Conversion
  test('6b. yrcToEnhancedLRC converts YRC to standard A2 Enhanced LRC format', () => {
    const yrc = `[12000,3200](12000,500,0)Never (12500,400,0)gonna (12900,600,0)give (13500,700,0)you
[16000,2000](16000,2000,0)up`;
    const elrc = yrcToEnhancedLRC(yrc);
    assert.ok(elrc.includes('[00:12.00]'));
    assert.ok(elrc.includes('<00:12.00>Never '));
    assert.ok(elrc.includes('<00:12.50>gonna '));
    assert.ok(elrc.includes('[00:16.00]'));

    // Verify round-trip parsing through parseLRC
    const roundTrip = parseLRC(elrc);
    assert.strictEqual(roundTrip.length, 2);
    assert.strictEqual(roundTrip[0].timeMs, 12000);
    assert.strictEqual(roundTrip[0].words.length, 4);
    assert.strictEqual(roundTrip[0].words[0].text, 'Never');
    assert.strictEqual(roundTrip[0].words[0].timeMs, 12000);
  });

  // Test 6c: parseYRC Fallback on lines without syllable tokens
  test('6c. parseYRC handles non-syllable fallback lines gracefully', () => {
    const yrc = `[10000,3000]Plain text line without syllables\n[15000,2000](15000,1000,0)Synced (16000,1000,0)line`;
    const res = parseYRC(yrc);
    assert.strictEqual(res.length, 2);
    assert.strictEqual(res[0].timeMs, 10000);
    assert.strictEqual(res[0].text, 'Plain text line without syllables');
    assert.strictEqual(res[0].words, undefined);
    assert.strictEqual(res[1].words.length, 2);
  });

  // Test 7a: ExistingWaterfallProvider converts YRC lines to Normalized with durationMs
  test('7a. ExistingWaterfallProvider.toNormalized preserves durationMs and calculates precise word end', () => {
    const ExistingWaterfallProvider = require('../src/services/lyrics/ExistingWaterfallProvider.js');
    const parsedLines = [
      {
        timeMs: 12000,
        text: 'Never gonna',
        words: [
          { text: 'Ne', timeMs: 12000, durationMs: 500 },
          { text: 'ver ', timeMs: 12500, durationMs: 400 },
          { text: 'gon', timeMs: 12900, durationMs: 600 },
          { text: 'na', timeMs: 13500, durationMs: 700 }
        ]
      }
    ];
    const norm = ExistingWaterfallProvider.toNormalized(parsedLines, 'NetEase', 'WORD_SYNCED');
    assert.strictEqual(norm.type, 'WORD');
    assert.strictEqual(norm.lines.length, 1);
    assert.strictEqual(norm.lines[0].words.length, 4);
    assert.strictEqual(norm.lines[0].words[0].start, 12);
    assert.strictEqual(norm.lines[0].words[0].end, 12.5);
    assert.strictEqual(norm.lines[0].words[1].start, 12.5);
    assert.strictEqual(norm.lines[0].words[1].end, 12.9);
  });

  // Test 7b: Syllable whitespace reconstruction algorithm matches full line text without double spaces
  test('7b. Syllable whitespace reconstruction reconstructs words without double spaces or inner splits', () => {
    const lineText = 'Never gonna';
    const wordList = [
      { text: 'Ne', timeMs: 12000 },
      { text: 'ver ', timeMs: 12500 },
      { text: 'gon', timeMs: 12900 },
      { text: 'na', timeMs: 13500 }
    ];

    let renderedText = '';
    let searchPos = 0;
    wordList.forEach((word, wi) => {
      renderedText += word.text;
      const foundIdx = lineText.indexOf(word.text.trim(), searchPos);
      if (foundIdx !== -1) {
        searchPos = foundIdx + word.text.trim().length;
      }
      if (wi < wordList.length - 1) {
        const hasTrailingSpace = /\s$/.test(word.text);
        const nextHasLeadingSpace = /^\s/.test(wordList[wi + 1].text);
        if (!hasTrailingSpace && !nextHasLeadingSpace) {
          if (foundIdx !== -1 && lineText[searchPos] === ' ') {
            renderedText += ' ';
            searchPos++;
          }
        }
      }
    });

    assert.strictEqual(renderedText, 'Never gonna');
  });

  // Test 8a: isLyricMetadataOrCreditLine correctly detects credits & metadata
  test('8a. isLyricMetadataOrCreditLine detects Chinese & English credits and ID tags', () => {
    assert.strictEqual(isLyricMetadataOrCreditLine('制作人 : Michael Jackson/Teddy Riley'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('词 : Michael Jackson/Teddy Riley/Nate Smith'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('作曲 : Teron Beal/Teddy Riley'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('作词 : David Burke'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('作曲 : David Burke'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('编曲 : Teddy Riley'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('混音 : Serban Ghenea'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('OP : Sony/ATV Music Publishing'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('SP : Sony/ATV Music Publishing'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('Written by David Burke'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('Lyrics by Michael Jackson'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('Produced by Teddy Riley'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('Producer: Teddy Riley'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('Composer: Teron Beal'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('纯音乐，请欣赏'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('[ar:Michael Jackson]'), true);
    assert.strictEqual(isLyricMetadataOrCreditLine('[ti:Remember The Time]'), true);

    // Legitimate singable lyrics must NOT be flagged
    assert.strictEqual(isLyricMetadataOrCreditLine('Never gonna give you up'), false);
    assert.strictEqual(isLyricMetadataOrCreditLine("I said, ooh, I'm blinded by the lights"), false);
    assert.strictEqual(isLyricMetadataOrCreditLine('词不达意'), false);
    assert.strictEqual(isLyricMetadataOrCreditLine('曲终人散'), false);
    assert.strictEqual(isLyricMetadataOrCreditLine('Produced like magic in the dark'), false);
  });

  // Test 8b: parseLRC strips credit metadata lines
  test('8b. parseLRC strips credit metadata lines from LRC input', () => {
    const rawLrc = `[00:00.00]制作人 : Michael Jackson/Teddy Riley
[00:01.00]词 : Michael Jackson
[00:02.00]作曲 : Teddy Riley
[00:15.50]Do you remember when we fell in love
[00:20.00]We were so young and innocent then`;

    const res = parseLRC(rawLrc);
    assert.strictEqual(res.length, 2);
    assert.strictEqual(res[0].timeMs, 15500);
    assert.strictEqual(res[0].text, 'Do you remember when we fell in love');
    assert.strictEqual(res[1].timeMs, 20000);
    assert.strictEqual(res[1].text, 'We were so young and innocent then');
  });

  // Test 8c: parseYRC strips credit metadata lines
  test('8c. parseYRC strips credit metadata lines from YRC input', () => {
    const rawYrc = `[0,2000](0,500,0)制作人(500,500,0) : (1000,1000,0)Michael Jackson
[2000,2000](2000,500,0)词(2500,500,0) : (3000,1000,0)Teddy Riley
[12000,3000](12000,1000,0)Do (13000,1000,0)you (14000,1000,0)remember
[16000,2000](16000,1000,0)the (17000,1000,0)time`;

    const res = parseYRC(rawYrc);
    assert.strictEqual(res.length, 2);
    assert.strictEqual(res[0].timeMs, 12000);
    assert.strictEqual(res[0].text, 'Do you remember');
    assert.strictEqual(res[1].timeMs, 16000);
    assert.strictEqual(res[1].text, 'the time');
  });

  // Test 9a: parseYRC glues standalone punctuation tokens to preceding word
  test('9a. parseYRC glues standalone punctuation tokens to preceding word and absorbs duration', () => {
    const rawYrc = `[1000,2000](1000,500,0)No(1500,200,0), (1700,500,0)I (2200,600,0)can't`;
    const res = parseYRC(rawYrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].words.length, 3);
    assert.strictEqual(res[0].words[0].text, 'No, ');
    assert.strictEqual(res[0].words[0].timeMs, 1000);
    assert.strictEqual(res[0].words[0].duration, 700);
    assert.strictEqual(res[0].words[0].endMs, 1700);
    assert.strictEqual(res[0].words[1].text, 'I ');
    assert.strictEqual(res[0].words[2].text, "can't");
  });

  // Test 9b: parseLRC glues standalone punctuation tokens in enhanced LRC to preceding word
  test('9b. parseLRC glues standalone punctuation tokens in enhanced LRC to preceding word', () => {
    const rawLrc = `[00:10.00] <00:10.00>No <00:10.50>, <00:10.80>I <00:11.20>can't`;
    const res = parseLRC(rawLrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].words.length, 3);
    assert.strictEqual(res[0].words[0].text, 'No,');
    assert.strictEqual(res[0].words[0].timeMs, 10000);
    assert.strictEqual(res[0].words[0].endMs, 10800);
    assert.strictEqual(res[0].words[1].text, 'I');
    assert.strictEqual(res[0].words[2].text, "can't");
  });

  // Test 10a: parseLRC handles [offset:+/-ms] tag per standard LRC & Lyricify specification
  test('10a. parseLRC handles [offset:+/-ms] tag and shifts line & syllable timestamps', () => {
    const lrcPositiveOffset = `[offset: 500]
[00:10.00] <00:10.00>Never <00:10.40>gonna <00:10.80>give <00:11.20>you`;
    const resPos = parseLRC(lrcPositiveOffset);
    assert.strictEqual(resPos.length, 1);
    // 10000ms + 500ms offset = 10500ms
    assert.strictEqual(resPos[0].timeMs, 10500);
    assert.strictEqual(resPos[0].words[0].timeMs, 10500);
    assert.strictEqual(resPos[0].words[1].timeMs, 10900);

    const lrcNegativeOffset = `[offset: -300]
[00:10.00] <00:10.00>Never <00:10.40>gonna`;
    const resNeg = parseLRC(lrcNegativeOffset);
    // 10000ms + (-300ms) offset = 9700ms
    assert.strictEqual(resNeg[0].timeMs, 9700);
    assert.strictEqual(resNeg[0].words[0].timeMs, 9700);
    assert.strictEqual(resNeg[0].words[1].timeMs, 10100);
  });

  // Test 10b: Trailing syllable tags accurately set last word's endMs and duration
  test('10b. parseLRC extracts trailing syllable tags for exact last-word endMs and sustained durations', () => {
    const lrc = `[00:10.00] <00:10.00>Hold <00:10.50>on <00:14.20>`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].words.length, 2);
    assert.strictEqual(res[0].words[0].text, 'Hold');
    assert.strictEqual(res[0].words[0].timeMs, 10000);
    assert.strictEqual(res[0].words[0].endMs, 10500);
    assert.strictEqual(res[0].words[0].duration, 500);

    assert.strictEqual(res[0].words[1].text, 'on');
    assert.strictEqual(res[0].words[1].timeMs, 10500);
    // Sustained note for 3.7 seconds!
    assert.strictEqual(res[0].words[1].endMs, 14200);
    assert.strictEqual(res[0].words[1].duration, 3700);
  });

  // Test 10c: Inter-word pauses are protected against multi-second fill stretching
  test('10c. parseLRC caps natural word duration over long inter-word pauses', () => {
    const lrc = `[00:10.00] <00:10.00>Hold <00:10.40>on <00:15.00>to <00:15.50>me`;
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].words.length, 4);
    // Gap from 10400 to 15000 is 4600ms (silence/pause). Word "on" should not stretch to 4.6s!
    const wordOn = res[0].words[1];
    assert.strictEqual(wordOn.text, 'on');
    assert.strictEqual(wordOn.timeMs, 10400);
    assert.ok(wordOn.duration <= 1800, `Duration should be capped, was ${wordOn.duration}ms`);
    assert.strictEqual(wordOn.endMs, 10400 + wordOn.duration);
  });

  // Test 10d: yrcToEnhancedLRC emits trailing closing tag and round-trips exact durations
  test('10d. yrcToEnhancedLRC emits trailing closing tag and preserves round-trip word ends', () => {
    const yrc = `[12000,4000](12000,500,0)Never (12500,400,0)gonna (12900,600,0)give (13500,2500,0)you`;
    const elrc = yrcToEnhancedLRC(yrc);
    // 13500 + 2500 = 16000 -> <00:16.00> closing tag
    assert.ok(elrc.includes('<00:16.00>'), `Expected trailing <00:16.00> in output: ${elrc}`);

    const parsed = parseLRC(elrc);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].words.length, 4);
    const lastWord = parsed[0].words[3];
    assert.strictEqual(lastWord.text, 'you');
    assert.strictEqual(lastWord.timeMs, 13500);
    assert.strictEqual(lastWord.endMs, 16000);
    assert.strictEqual(lastWord.duration, 2500);
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runParserTests();
