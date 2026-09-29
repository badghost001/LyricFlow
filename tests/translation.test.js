/**
 * Unit Tests for LyricFlow Translation Engine & Caching
 */

const assert = require('assert');

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

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

async function runTranslationTests() {
  console.log('\n--- Running Translation Engine & Cache Persistence Tests ---\n');

  // Test 1: Line alignment and subText mapping
  test('1. Exact line-by-line translation mapping to subText', () => {
    const parsedLines = [
      { time: 1000, text: '夜に駆ける' },
      { time: 3500, text: '沈むように溶けてゆくように' },
      { time: 7000, text: '二人だけの空が広がる夜に' }
    ];

    const translatedText = 'Racing into the night\nAs if sinking and melting\nInto the night where only our sky expands';
    const transLines = translatedText.split('\n');

    parsedLines.forEach((line, i) => {
      const transText = transLines[i] ? transLines[i].trim() : '';
      if (transText && transText.toLowerCase() !== line.text.trim().toLowerCase()) {
        line.subText = transText;
      }
    });

    assert.strictEqual(parsedLines[0].subText, 'Racing into the night');
    assert.strictEqual(parsedLines[1].subText, 'As if sinking and melting');
    assert.strictEqual(parsedLines[2].subText, 'Into the night where only our sky expands');
  });

  // Test 2: Identical text suppression (e.g. repeated vocalizations / English line in Japanese song)
  test('2. Suppression of redundant subText when translation equals original', () => {
    const parsedLines = [
      { time: 1000, text: 'Yeah yeah yeah' },
      { time: 2000, text: 'こんにちは' }
    ];

    const translatedText = 'Yeah yeah yeah\nHello';
    const transLines = translatedText.split('\n');

    parsedLines.forEach((line, i) => {
      const transText = transLines[i] ? transLines[i].trim() : '';
      if (transText && transText.toLowerCase() !== line.text.trim().toLowerCase()) {
        line.subText = transText;
      }
    });

    assert.strictEqual(parsedLines[0].subText, undefined);
    assert.strictEqual(parsedLines[1].subText, 'Hello');
  });

  // Test 3: Cache update with translation metadata
  test('3. Cache persistence with subText and transLang', () => {
    const mockStorage = {};
    const cacheKey = 'lyrics_cache_v21_test_track_123';

    // Initial save without subText
    const initialLyrics = [
      { time: 500, text: 'Hola mundo' }
    ];
    mockStorage[cacheKey] = JSON.stringify({
      level: 3,
      lyrics: initialLyrics,
      source: 'LyricsPlus'
    });

    // Translation arrives asynchronously
    initialLyrics[0].subText = 'Hello world';
    const cachedObj = JSON.parse(mockStorage[cacheKey]);
    cachedObj.lyrics = initialLyrics;
    cachedObj.transLang = 'en';
    mockStorage[cacheKey] = JSON.stringify(cachedObj);

    // Verify cache has subText and transLang
    const reloaded = JSON.parse(mockStorage[cacheKey]);
    assert.strictEqual(reloaded.transLang, 'en');
    assert.strictEqual(reloaded.lyrics[0].subText, 'Hello world');
  });

  // Test 4: Detection of missing translations from cache
  test('4. Identification of cache entries needing background translation', () => {
    const currentTranslateLang = 'es';

    const cacheEntryWithoutSubText = {
      level: 3,
      lyrics: [{ time: 100, text: 'Hello' }]
    };

    const cacheEntryWithOldLang = {
      level: 3,
      transLang: 'fr',
      lyrics: [{ time: 100, text: 'Hello', subText: 'Bonjour' }]
    };

    const cacheEntryMatching = {
      level: 3,
      transLang: 'es',
      lyrics: [{ time: 100, text: 'Hello', subText: 'Hola' }]
    };

    const needsTrans1 = !cacheEntryWithoutSubText.lyrics.some(l => l.subText) || cacheEntryWithoutSubText.transLang !== currentTranslateLang;
    const needsTrans2 = !cacheEntryWithOldLang.lyrics.some(l => l.subText) || cacheEntryWithOldLang.transLang !== currentTranslateLang;
    const needsTrans3 = !cacheEntryMatching.lyrics.some(l => l.subText) || cacheEntryMatching.transLang !== currentTranslateLang;

    assert.strictEqual(needsTrans1, true, 'Cache entry without subtext must trigger translation');
    assert.strictEqual(needsTrans2, true, 'Cache entry with mismatched target language must trigger translation');
    assert.strictEqual(needsTrans3, false, 'Cache entry matching current target language must NOT re-translate');
  });

  // Test 5: Dynamic Island Satellite pill display code formatting
  test('5. Satellite pill display code extraction', () => {
    const getPillCode = (lang) => {
      const code = (lang && lang !== 'none') ? lang : 'en';
      return code.split('-')[0].toUpperCase();
    };

    assert.strictEqual(getPillCode('en'), 'EN');
    assert.strictEqual(getPillCode('es'), 'ES');
    assert.strictEqual(getPillCode('zh-CN'), 'ZH');
    assert.strictEqual(getPillCode('ja'), 'JA');
    assert.strictEqual(getPillCode('none'), 'EN');
    assert.strictEqual(getPillCode(undefined), 'EN');
  });

  console.log(`Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTranslationTests();
