/**
 * Unit & Integration Tests: Elimination of Long Weird Random Pause & Duration Desync
 * Verifies that small millisecond word/syllable durations (< 40ms, e.g. 27ms) are not
 * misinterpreted as seconds, and that line switch points and word ends never get trapped in the future.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { LyricsPlusService } = require('../src/services/lyrics/LyricsPlus');
const LyricEngine = require('../src/services/lyrics/LyricsEngine');
const ExistingWaterfallProvider = require('../src/services/lyrics/ExistingWaterfallProvider');

console.log('\n--- Running Lyrics Timing & Long Pause Elimination Tests ---\n');

// 1. Verify small syllable durations (< 40ms) in LyricsPlus normalization
(() => {
  const service = new LyricsPlusService();
  const mockApiResponse = {
    type: 'Word',
    lyrics: [
      {
        time: 72482,
        duration: 1650,
        text: 'Often lose faith and forget to pray',
        syllabus: [
          { time: 72441, duration: 304, text: 'Often ' },
          { time: 72921, duration: 200, text: 'lose ' },
          { time: 73121, duration: 200, text: 'faith ' },
          { time: 73321, duration: 184, text: 'and ' },
          { time: 73505, duration: 240, text: 'forget ' },
          { time: 73745, duration: 224, text: 'to ' },
          { time: 73969, duration: 27, text: 'pray' } // 27 milliseconds!
        ]
      },
      {
        time: 74244,
        duration: 1533,
        text: "You don't wanna land on the wing with the guys"
      }
    ],
    processingTime: { winnerSource: 'apple' }
  };

  const normalized = service.normalizeResponse(mockApiResponse, { title: 'Ungrateful', artist: 'Central Cee' });
  assert(normalized && normalized.lines.length === 2, 'Must parse 2 lines');

  const line35 = normalized.lines[0];
  assert.strictEqual(line35.text, 'Often lose faith and forget to pray');
  assert(line35.words && line35.words.length === 7, 'Must parse 7 words');

  const prayWord = line35.words[6];
  assert.strictEqual(prayWord.text, 'pray');
  assert.strictEqual(prayWord.start, 73.969);
  
  // Pray duration must be ~0.027s, ending at 73.996s, NOT 100.969s!
  assert(prayWord.end < 74.200, `Word "pray" end (${prayWord.end}s) must be < 74.2s, not inflated into 100s!`);
  assert(prayWord.end >= 73.990, `Word "pray" end (${prayWord.end}s) must be >= 73.99s`);

  console.log('  ✓ 1. Small syllable durations (< 40ms) correctly converted to fractions of second without 1000x inflation');
})();

// 2. Verify word end defensive bounding against next line start
(() => {
  const service = new LyricsPlusService();
  const mockApiResponse = {
    type: 'Word',
    lyrics: [
      {
        time: 10000,
        duration: 2000,
        text: 'Hello world',
        syllabus: [
          { time: 10000, duration: 1000, text: 'Hello' },
          { time: 11000, duration: 99999, text: 'world' } // Corrupt duration
        ]
      },
      {
        time: 12500,
        duration: 2000,
        text: 'Next line starts soon'
      }
    ]
  };

  const normalized = service.normalizeResponse(mockApiResponse, { title: 'Test', artist: 'Test' });
  const line0 = normalized.lines[0];
  const worldWord = line0.words[1];

  // Must be clamped to line end / next line onset, not 110s!
  assert(worldWord.end <= 12.500, `Corrupt word end (${worldWord.end}) must be clamped by next line start (12.5)`);
  console.log('  ✓ 2. Defensive word end capping prevents runaway word boundaries past next line onset');
})();

// 3. Verify LyricsEngine switchPoint never gets stuck past nextLine.start
(() => {
  const engine = new LyricEngine();
  const lyrics = {
    type: 'WORD',
    source: 'Test',
    lines: [
      {
        text: 'Line 1',
        start: 72.482,
        end: 74.132,
        words: [
          { text: 'pray', start: 73.969, end: 74.000 }
        ]
      },
      {
        text: 'Line 2',
        start: 74.244,
        end: 75.777,
        words: [
          { text: 'You', start: 74.244, end: 74.500 }
        ]
      }
    ]
  };

  engine.setLyrics(lyrics);
  
  // At 74.300s, engine must be on Line 1 (index 1), not stuck on Line 0!
  const state = engine.update(74.300);
  assert.strictEqual(state.lineIndex, 1, `Engine at 74.3s must advance to Line 2 (index 1), but got index ${state.lineIndex}`);
  console.log('  ✓ 3. LyricsEngine accurately advances to next line at start time without getting trapped');
})();

// 4. Verify renderer.js source checks
(() => {
  const rendererPath = path.resolve(__dirname, '../src/renderer.js');
  const code = fs.readFileSync(rendererPath, 'utf8');

  // getLyricWordEndMs checks
  assert(code.includes('rawDur >= 10 ? rawDur : rawDur * 1000'), 'getLyricWordEndMs must treat rawDur >= 10 as ms');
  assert(code.includes('Math.min(nextVocalStart, switchPoint)'), 'getLineSwitchMs must clamp switchPoint to nextVocalStart');
  assert(code.includes('lastIslandSyncData = null;'), 'applyLyricsData must invalidate lastIslandSyncData');

  console.log('  ✓ 4. renderer.js contains defensive duration parsing, switchPoint capping, and island sync invalidation');
})();

console.log('\nAll Lyrics Timing & Long Pause Elimination tests passed successfully!\n');
