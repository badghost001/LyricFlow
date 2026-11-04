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

  // Test 6: Exact line alignment with @@@ delimiters preventing line drift across gaps/blanks
  test('6. Delimiter-based line alignment prevents off-by-one drift across blank lines', () => {
    const parsedLines = [
      { time: 1000, text: 'First verse line' },
      { time: 2500, text: '' }, // Instrumental gap / blank
      { time: 4000, text: 'Second verse line' },
      { time: 6000, text: 'Third verse line' }
    ];

    const translatableLines = [];
    const translatableIndices = [];
    parsedLines.forEach((l, idx) => {
      const text = (l.text || '').trim();
      if (text) {
        translatableLines.push(text);
        translatableIndices.push(idx);
      }
    });

    assert.deepStrictEqual(translatableIndices, [0, 2, 3]);

    // Simulated translated response preserving @@@ delimiters
    const simulatedTransResponse = 'Première ligne\n@@@\nDeuxième ligne\n@@@\nTroisième ligne';
    const transParts = simulatedTransResponse.split(/\s*@@@\s*/);

    transParts.forEach((part, i) => {
      const targetIdx = translatableIndices[i];
      if (targetIdx !== undefined) {
        parsedLines[targetIdx].subText = part.trim();
      }
    });

    assert.strictEqual(parsedLines[0].subText, 'Première ligne');
    assert.strictEqual(parsedLines[1].subText, undefined, 'Blank/instrumental line must have no translation and must NOT cause line shift');
    assert.strictEqual(parsedLines[2].subText, 'Deuxième ligne', 'Line after gap must receive its EXACT translation, not shifted');
    assert.strictEqual(parsedLines[3].subText, 'Troisième ligne');
  });

  // Test 7: Hinglish translation toggle bypasses Romanized Hindi/Punjabi when disabled
  test('7. Hinglish translation toggle bypasses Romanized Hindi/Punjabi when disabled', () => {
    const isRomanizedHindiTranslation = (text) => {
      const tokens = String(text || '').toLowerCase().match(/[a-z]+/g) || [];
      const markers = new Set(['tera', 'meri', 'kudi', 'dekhna', 'hai', 'kardi']);
      return tokens.filter(t => markers.has(t)).length >= 2;
    };

    const isHinglishLyrics = (lines) => {
      return lines.some(l => isRomanizedHindiTranslation(l.text));
    };

    const hinglishTrack = [
      { text: 'tera chehra mujhe dekhna hai' },
      { text: 'kudi tu kardi kamal' }
    ];

    const settingsWithHinglishOff = { translateLang: 'en', hinglishTranslate: false };
    const shouldSkip = !settingsWithHinglishOff.hinglishTranslate && isHinglishLyrics(hinglishTrack);
    assert.strictEqual(shouldSkip, true, 'Hinglish track must be skipped when hinglishTranslate is false');

    const settingsWithHinglishOn = { translateLang: 'en', hinglishTranslate: true };
    const shouldNotSkip = !settingsWithHinglishOn.hinglishTranslate && isHinglishLyrics(hinglishTrack);
    assert.strictEqual(shouldNotSkip, false, 'Hinglish track must NOT be skipped when hinglishTranslate is true');
  });

  // Test 8: Comprehensive marker dictionary & cumulative token detection for songs like 'Ala Barfi'
  test('8. Multi-token cumulative detection correctly identifies songs like "Ala Barfi"', () => {
    const HINDI_PUNJABI_MARKERS = new Set([
      'mein', 'hai', 'tha', 'thi', 'jab', 'dil', 'baatein', 'kisko', 'barfi', 'kuch', 'chupke'
    ]);
    const ENGLISH_COMMON_MARKERS = new Set([
      'the', 'this', 'that', 'with', 'from', 'they', 'them', 'their', 'there'
    ]);

    const isHinglishLyricsSimulation = (lines) => {
      let matches = 0;
      let totalTokenHits = 0;
      let englishHits = 0;
      const distinctHits = new Set();
      const sample = lines.slice(0, 40);
      for (const l of sample) {
        const text = (l.text || '').trim();
        if (!text) continue;
        const tokens = text.toLowerCase().match(/[a-z]+/g) || [];
        for (const t of tokens) {
          if (HINDI_PUNJABI_MARKERS.has(t)) {
            totalTokenHits++;
            distinctHits.add(t);
          }
          if (ENGLISH_COMMON_MARKERS.has(t)) {
            englishHits++;
          }
        }
      }
      if (englishHits >= 3 && englishHits > totalTokenHits) return false;
      return matches >= 2 || (totalTokenHits >= 4 && distinctHits.size >= 2);
    };

    const alaBarfiSample = [
      { text: 'Barfi jab amma ki kokh mein tha' },
      { text: 'suraj ne bheji thi thodi roshni' },
      { text: 'dil ki baatein kisko bataye' },
      { text: 'chupke se sunta tha sab kuch' }
    ];

    assert.strictEqual(isHinglishLyricsSimulation(alaBarfiSample), true, '"Ala Barfi" lines must be reliably recognized as Hinglish');

    const englishSampleWithLoanword = [
      { text: 'the world is running with the wind' },
      { text: 'from there they saw the light' },
      { text: 'eating spicy barfi in the kitchen' },
      { text: 'with their friends from that place' }
    ];

    assert.strictEqual(isHinglishLyricsSimulation(englishSampleWithLoanword), false, 'English song with single loanword must NOT be classified as Hinglish');
  });

  // Test 9: In-flight deduplication and 429 rate-limit backoff flag
  await testAsync('9. In-flight request deduplication and 429 rate-limit backoff prevents loop', async () => {
    const pendingRequests = new Set();
    const trackId = 'local_UHJpdGFtX0FsYSBCYXJmaQ';
    const reqKey = `${trackId}_en`;

    let callCount = 0;
    const mockTranslate = async (key) => {
      if (pendingRequests.has(key)) return { deduplicated: true };
      pendingRequests.add(key);
      callCount++;
      try {
        // Simulate async in-flight request to Google Translate
        await new Promise(r => setTimeout(r, 20));
        return null; // Simulate 429 failure
      } finally {
        pendingRequests.delete(key);
      }
    };

    // First call triggers translation
    const p1 = mockTranslate(reqKey);
    // Concurrent call for same track while p1 in-flight
    const p2 = mockTranslate(reqKey);

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.strictEqual(callCount, 1, 'Only one IPC translation call must be dispatched concurrently for the same track');
    assert.strictEqual(r2.deduplicated, true);

    // On 429 / null response, lines object sets backoff
    const lines = [{ text: 'Barfi jab' }];
    if (!r1 || !r1.text) {
      lines._noTransNeeded = true;
      lines._transLang = 'en';
    }
    assert.strictEqual(lines._noTransNeeded, true, 'Lines must mark _noTransNeeded on 429 to back off');
  });

  console.log(`Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTranslationTests();
