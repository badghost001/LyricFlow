/**
 * Unit & Integration Tests: Taskbar Enhanced LRC Sentence Completion & Timings
 *
 * Verifies that in Taskbar Mode (and across all playback modes), Enhanced LRC lines
 * with word-by-word timestamps never prematurely switch before all words complete singing.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

function runTaskbarEnhancedLrcCompletionTests() {
  console.log('\n--- Running Taskbar Enhanced LRC Completion Tests ---\n');

  const rendererPath = path.resolve(__dirname, '../src/renderer.js');
  const enginePath = path.resolve(__dirname, '../src/services/lyrics/LyricsEngine.js');
  const waterfallPath = path.resolve(__dirname, '../src/services/lyrics/ExistingWaterfallProvider.js');
  const modelsPath = path.resolve(__dirname, '../src/services/lyrics/models.js');
  const parsersPath = path.resolve(__dirname, '../src/modules/parsers.js');

  const rendererJs = fs.readFileSync(rendererPath, 'utf8');
  const engineJs = fs.readFileSync(enginePath, 'utf8');
  const waterfallJs = fs.readFileSync(waterfallPath, 'utf8');
  const models = require(modelsPath);
  const LyricEngine = require(enginePath);
  const ExistingWaterfallProvider = require(waterfallPath);
  const parsers = require(parsersPath);

  // Test 1: renderer.js defines getLineVocalEndMs and getLineSwitchMs helpers
  test('1. renderer.js defines getLineVocalEndMs and getLineSwitchMs', () => {
    assert.ok(rendererJs.includes('function getLineVocalEndMs('), 'getLineVocalEndMs must be defined');
    assert.ok(rendererJs.includes('function getLineSwitchMs('), 'getLineSwitchMs must be defined');
  });

  // Test 2: getLyricWordEndMs does not clamp last word to nextLineMs - 50
  test('2. renderer.js getLyricWordEndMs caps against next line vocal onset, not early nextLineMs - 50', () => {
    assert.ok(!rendererJs.includes('nextLineMs - 50'), 'nextLineMs - 50 clamp must be removed');
    assert.ok(rendererJs.includes('nextVocalMs > startMs'), 'must check nextVocalMs against startMs');
  });

  // Test 3: Sandbox test of getLineSwitchMs and getLineVocalEndMs
  test('3. getLineSwitchMs stays on current line until final word completes singing', () => {
    const sandbox = {
      lyrics: [
        {
          timeMs: 10000,
          text: "I will always love you",
          words: [
            { text: "I", timeMs: 10000, endMs: 10500 },
            { text: "will", timeMs: 10500, endMs: 11000 },
            { text: "always", timeMs: 11000, endMs: 12000 },
            { text: "love", timeMs: 12000, endMs: 13000 },
            { text: "you", timeMs: 13000, endMs: 14500 } // Sings until 14.5s
          ]
        },
        {
          timeMs: 13500, // Early line tag [00:13.50]
          text: "Darling I do",
          words: [
            { text: "Darling", timeMs: 15000, endMs: 15800 },
            { text: "I", timeMs: 15800, endMs: 16200 },
            { text: "do", timeMs: 16200, endMs: 17000 }
          ]
        }
      ],
      Number,
      Math,
      Array,
      Infinity
    };

    // Extract helper functions into sandbox
    const code = `
      function getLyricWordEndMs(words, wordIndex, lineData, lineIndex) {
        const word = words[wordIndex];
        const startMs = (word.start != null && Number.isFinite(Number(word.start)))
          ? Number(word.start) * 1000
          : Number(word.timeMs);
        if (word.endMs != null && Number(word.endMs) > 0) return Number(word.endMs);
        return startMs + 1000;
      }

      ${rendererJs.substring(
        rendererJs.indexOf('function getLineVocalEndMs'),
        rendererJs.indexOf('let cachedIslandZoneWidth')
      )}
    `;

    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    const vocalEnd = sandbox.getLineVocalEndMs(sandbox.lyrics[0], 0);
    assert.strictEqual(vocalEnd, 14500, 'Current line vocal end must be 14500ms (end of last word)');

    const switchMs = sandbox.getLineSwitchMs(0);
    // Next line has timeMs=13500, but current vocal ends at 14500 and next vocal starts at 15000.
    // switchMs must be at least 14500ms, NEVER 13500ms!
    assert.ok(switchMs >= 14500, `switchMs (${switchMs}) must be >= 14500ms (never premature 13500ms)`);
    assert.ok(switchMs <= 15000, `switchMs (${switchMs}) must be <= 15000ms`);
  });

  // Test 4: activeLineIndex is updated in Taskbar Mode
  test('4. renderer.js updates activeLineIndex in taskbarMode (not stuck at -1)', () => {
    assert.ok(
      rendererJs.includes('activeLineIndex = activeIndex;'),
      'renderer.js must assign activeLineIndex = activeIndex in taskbar mode else branch'
    );
  });

  // Test 5: Word highlighting marks final word as completed when syncProgress >= wEnd
  test('5. renderer.js sets nextWStart to Infinity for final word so currentActiveWord transitions to -1 (completed)', () => {
    // Check main view and taskbar view
    const occurrences = (rendererJs.match(/: Infinity;\s*const wEnd = getLyricWordEndMs/g) || []).length;
    assert.ok(occurrences >= 2, 'Both main view and taskbar view must use Infinity fallback for last word');
  });

  // Test 6: ExistingWaterfallProvider.toNormalized does not clamp final word to early nextLine.timeMs
  test('6. ExistingWaterfallProvider.toNormalized calculates nextVocalSec from next line first word', () => {
    const rawLines = [
      {
        timeMs: 10000,
        text: "Sentence one",
        words: [
          { text: "Sentence", timeMs: 10000 },
          { text: "one", timeMs: 11500 } // natural duration ~1000ms -> ends at ~12500ms
        ]
      },
      {
        timeMs: 12000, // Early line header at 12.0s
        text: "Sentence two",
        words: [
          { text: "Sentence", timeMs: 14000 }, // Next vocal doesn't start until 14.0s
          { text: "two", timeMs: 15000 }
        ]
      }
    ];

    const normalized = ExistingWaterfallProvider.toNormalized(rawLines, 'Test', 'WORD_SYNCED');
    assert.ok(normalized, 'Normalized lyrics must be produced');
    const line0 = normalized.lines[0];
    const lastWord = line0.words[line0.words.length - 1];

    // Last word starts at 11.5s, should NOT be clamped to 12.0s (0.5s duration)
    // Next vocal is at 14.0s, so last word has full natural duration > 12.0s!
    assert.ok(lastWord.end > 12.0, `Last word end (${lastWord.end}s) must extend past early header (12.0s)`);
    assert.ok(line0.end >= lastWord.end, 'Line end must be at least last word end');
  });

  // Test 7: LyricsEngine.update prevents advancing to next line before vocal completes
  test('7. LyricsEngine.update does not advance line while current sentence words are singing', () => {
    const engine = new LyricEngine();
    const rawLines = [
      {
        timeMs: 10000,
        text: "Sentence one",
        words: [
          { text: "Sentence", timeMs: 10000, endMs: 11500 },
          { text: "one", timeMs: 11500, endMs: 13000 } // Sings until 13.0s
        ]
      },
      {
        timeMs: 12200, // Line tag at 12.2s
        text: "Sentence two",
        words: [
          { text: "Sentence", timeMs: 13500, endMs: 14200 },
          { text: "two", timeMs: 14200, endMs: 15000 }
        ]
      }
    ];

    const norm = ExistingWaterfallProvider.toNormalized(rawLines, 'Test', 'WORD_SYNCED');
    engine.setLyrics(norm);

    // At 11.0s: Line 0
    let state = engine.update(11.0);
    assert.strictEqual(state.lineIndex, 0, 'At 11.0s, lineIndex must be 0');

    // At 12.5s: syncProgress is past line 1 header (12.2s), but line 0 last word sings until 13.0s!
    // Engine MUST stay on line 0!
    state = engine.update(12.5);
    assert.strictEqual(state.lineIndex, 0, 'At 12.5s, lineIndex MUST stay on 0 while last word is singing');

    // At 13.1s: Line 0 last word completed! Engine advances to line 1
    state = engine.update(13.1);
    assert.strictEqual(state.lineIndex, 1, 'At 13.1s, lineIndex advances to 1 after line 0 finishes');
  });

  // Test 8: LyricsEngine._binarySearchLine preserves previous line if words are still singing
  test('8. LyricsEngine._binarySearchLine preserves previous line during seeks if words are singing', () => {
    const engine = new LyricEngine();
    const rawLines = [
      {
        timeMs: 10000,
        text: "Sentence one",
        words: [
          { text: "Sentence", timeMs: 10000, endMs: 11500 },
          { text: "one", timeMs: 11500, endMs: 13000 } // Sings until 13.0s
        ]
      },
      {
        timeMs: 12200, // Line tag at 12.2s
        text: "Sentence two",
        words: [
          { text: "Sentence", timeMs: 13500, endMs: 14200 },
          { text: "two", timeMs: 14200, endMs: 15000 }
        ]
      }
    ];

    const norm = ExistingWaterfallProvider.toNormalized(rawLines, 'Test', 'WORD_SYNCED');
    engine.setLyrics(norm);

    // Direct binary search at 12.6s (seek)
    const lineIdx = engine._binarySearchLine(12.6);
    assert.strictEqual(lineIdx, 0, 'Binary search at 12.6s must resolve to line 0 because words are singing');
  });

  // Test 9: renderer.js sets LyricsEngine on cache hits
  test('9. renderer.js initializes LyricsEngine when loading lyrics from cache', () => {
    assert.ok(
      rendererJs.includes('window.LyricsService.instance.engine.setLyrics(norm);'),
      'Cache hit block must invoke engine.setLyrics(norm)'
    );
  });

  // Test 10: Dynamic Island sync also uses getLineSwitchMs
  test('10. renderer.js getDynamicIslandSyncData uses getLineSwitchMs for accurate word completion', () => {
    assert.ok(
      rendererJs.includes('getLineSwitchMs(lastIdx)'),
      'getDynamicIslandSyncData must use getLineSwitchMs for lastIdx'
    );
  });

  console.log(`\nTaskbar Enhanced LRC Completion Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTaskbarEnhancedLrcCompletionTests();
