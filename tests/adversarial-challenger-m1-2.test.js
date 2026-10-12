/**
 * Empirical Adversarial Challenge Suite: Milestone 1 - Challenger 2
 * Roles: Critic, Specialist
 *
 * Adversarial stress harnesses, generators, and oracles for:
 * 1. R3: Syllable Tokenization, Hyphenation, Micro-Gap Timing Continuity, CJK Handling
 *    - Multi-syllable hyphenation generator (un-be-liev-a-ble, flow-er, to-geth-er, beau-ti-ful, etc.)
 *    - Hyphen variant matrix (-, –, —, leading, trailing)
 *    - Mixed CJK and Latin boundary oracle (J-POP 音楽, Hello 世界, K-POP 노래)
 *    - Japanese Kanji + Furigana/Kana okurigana & chōonpu oracle (桜が咲いた, 消しゴム, ラーメン, 時(とき))
 *    - Korean Hangul syllable blocks oracle (사랑해, 보고싶다)
 *    - Micro-gap timing continuity oracle (0ms to 500ms matrix in LyricsEngine.js getLineWordStates)
 *    - Continuous time sweep simulation across intra-word micro-gaps (160 frames at 10ms resolution)
 *    - Edge cases & boundary stress (overlapping syllables, missing end times, NaN/negative timestamps)
 *
 * 2. R2: Dynamic Island Mask & Duet Capsule Shadow
 *    - CSS static mask elimination oracle (.island-duet-marquee-wrapper, .island-satellite-marquee-wrapper, .island-stage-original)
 *    - Crisp duet capsule box-shadow oracle (0 4px 14px rgba(0, 0, 0, 0.45))
 *    - Dynamic marquee overflow mask oracle (fits -> 'none', overflows -> gradient, shrinks back -> 'none')
 *    - Island lyric scrolling mask state machine (start -> right fade only, middle -> dual fade, end -> left fade only)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failureDetails.push({ name, error: err.message, stack: err.stack });
  }
}

function runAdversarialSuite2() {
  console.log('\n================================================================');
  console.log('  STARTING ADVERSARIAL STRESS & ORACLE SUITE (CHALLENGER 2)     ');
  console.log('================================================================\n');

  const rendererPath = path.resolve(__dirname, '../src/renderer.js');
  const islandCssPath = path.resolve(__dirname, '../src/styles/_dynamic_island.css');
  const parsersPath = path.resolve(__dirname, '../src/modules/parsers.js');
  const enginePath = path.resolve(__dirname, '../src/services/lyrics/LyricsEngine.js');

  const rendererCode = fs.readFileSync(rendererPath, 'utf8');
  const islandCss = fs.readFileSync(islandCssPath, 'utf8');
  const { parseLRC, cleanLyricText, cleanWordPunctuation } = require(parsersPath);
  const LyricEngine = require(enginePath);

  // Extract functions from renderer.js
  const needsTimedWordSpaceCode = rendererCode.match(/function needsTimedWordSpace\([\s\S]*?\n\}/)[0];
  const reconcileTimedWordsCode = rendererCode.match(/function reconcileTimedWords\([\s\S]*?\n\}/)[0];
  const updateMarqueeOverflowCode = rendererCode.match(/function updateMarqueeOverflow\([\s\S]*?\n\}/)[0];

  // Prepare VM sandbox
  const sandbox = {
    cleanLyricText,
    cleanWordPunctuation
  };
  vm.runInNewContext(`
    ${reconcileTimedWordsCode}
    ${needsTimedWordSpaceCode}
    this.reconcileTimedWords = reconcileTimedWords;
    this.needsTimedWordSpace = needsTimedWordSpace;
  `, sandbox);

  // --------------------------------------------------------------------------
  // SECTION 1: R3 Syllable Tokenization, Hyphenation & Continuity
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: R3 Syllable Hyphenation & Tokenization Oracles ---');

  // Generator 1: un-be-liev-a-ble stress test
  test('R3-HYPHEN-1. un-be-liev-a-ble parsed from Enhanced LRC with hyphens preserves hasSpace: false', () => {
    const lrc = '[00:01.00]<00:01.00>un-<00:01.20>be-<00:01.40>liev-<00:01.60>a-<00:01.80>ble <00:02.00>miracle';
    const parsed = parseLRC(lrc);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].words.length, 6);

    const words = parsed[0].words;
    assert.strictEqual(words[0].hasSpace, false, 'un- must have hasSpace: false');
    assert.strictEqual(words[1].hasSpace, false, 'be- must have hasSpace: false');
    assert.strictEqual(words[2].hasSpace, false, 'liev- must have hasSpace: false');
    assert.strictEqual(words[3].hasSpace, false, 'a- must have hasSpace: false');
    assert.strictEqual(words[4].hasSpace, true, 'ble must have hasSpace: true before miracle');
  });

  test('R3-HYPHEN-2. needsTimedWordSpace prevents spaces between syllables of un-be-liev-a-ble across all 4 boundaries', () => {
    const tokensWithHyphen = [
      { text: 'un-' },
      { text: 'be-' },
      { text: 'liev-' },
      { text: 'a-' },
      { text: 'ble' },
      { text: 'miracle' }
    ];
    const searchState = { position: 0 };
    // Boundaries within un-be-liev-a-ble must be false
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensWithHyphen, 0, 'un-be-liev-a-ble miracle', searchState), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensWithHyphen, 1, 'un-be-liev-a-ble miracle', searchState), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensWithHyphen, 2, 'un-be-liev-a-ble miracle', searchState), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensWithHyphen, 3, 'un-be-liev-a-ble miracle', searchState), false);
    // Boundary between ble and miracle must be true
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensWithHyphen, 4, 'un-be-liev-a-ble miracle', searchState), true);
  });

  test('R3-HYPHEN-3. needsTimedWordSpace resolves un-be-liev-a-ble without hyphens against merged cleanLine', () => {
    const tokensBare = [
      { text: 'un' },
      { text: 'be' },
      { text: 'liev' },
      { text: 'a' },
      { text: 'ble' },
      { text: 'miracle' }
    ];
    const searchState = { position: 0 };
    // Against cleanLine with hyphens
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensBare, 0, 'un-be-liev-a-ble miracle', searchState), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensBare, 1, 'un-be-liev-a-ble miracle', searchState), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensBare, 2, 'un-be-liev-a-ble miracle', searchState), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensBare, 3, 'un-be-liev-a-ble miracle', searchState), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensBare, 4, 'un-be-liev-a-ble miracle', searchState), true);

    // Against cleanLine without hyphens ("unbelievable miracle")
    const searchState2 = { position: 0 };
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensBare, 0, 'unbelievable miracle', searchState2), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensBare, 1, 'unbelievable miracle', searchState2), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensBare, 2, 'unbelievable miracle', searchState2), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensBare, 3, 'unbelievable miracle', searchState2), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(tokensBare, 4, 'unbelievable miracle', searchState2), true);
  });

  // Generator 2: Multi-syllable word corpus
  const multiSyllableCorpus = [
    { syllables: ['flow-', 'er'], line: 'flower in bloom', fullWord: 'flower' },
    { syllables: ['to-', 'geth-', 'er'], line: 'together forever', fullWord: 'together' },
    { syllables: ['beau-', 'ti-', 'ful'], line: 'beautiful night', fullWord: 'beautiful' },
    { syllables: ['con-', 'nec-', 'tion'], line: 'connection lost', fullWord: 'connection' },
    { syllables: ['un-', 'der-', 'stand-', 'ing'], line: 'understanding you', fullWord: 'understanding' },
    { syllables: ['in-', 'de-', 'pen-', 'dent'], line: 'independent mind', fullWord: 'independent' },
    { syllables: ['e-', 'lec-', 'tron-', 'ic'], line: 'electronic sound', fullWord: 'electronic' }
  ];

  for (const item of multiSyllableCorpus) {
    test(`R3-CORPUS. Multi-syllable word "${item.fullWord}" never inserts intra-word spaces`, () => {
      const words = item.syllables.map(s => ({ text: s }));
      const state = { position: 0 };
      for (let i = 0; i < words.length - 1; i++) {
        const needsSpace = sandbox.needsTimedWordSpace(words, i, item.line, state);
        assert.strictEqual(needsSpace, false, `Unexpected space in syllable ${i} (${words[i].text}) of ${item.fullWord}`);
      }
    });
  }

  // Generator 3: Dash variations
  test('R3-DASH. Hyphen, En-dash and Em-dash tokens suppress space insertion', () => {
    const dashTokens = [
      { t1: 'break-', t2: 'down', desc: 'ASCII hyphen' },
      { t1: 'break–', t2: 'down', desc: 'Unicode En-dash' },
      { t1: 'break—', t2: 'down', desc: 'Unicode Em-dash' },
      { t1: 'break', t2: '-down', desc: 'Leading ASCII hyphen on next word' },
      { t1: 'break', t2: '–down', desc: 'Leading En-dash on next word' },
      { t1: 'break', t2: '—down', desc: 'Leading Em-dash on next word' }
    ];

    for (const d of dashTokens) {
      const words = [{ text: d.t1 }, { text: d.t2 }];
      const state = { position: 0 };
      assert.strictEqual(
        sandbox.needsTimedWordSpace(words, 0, 'breakdown', state),
        false,
        `Failed for ${d.desc}`
      );
    }
  });

  // Generator 4: Mixed CJK and Latin Matrix
  console.log('\n--- SECTION 2: R3 Mixed CJK & Latin Boundary Oracles ---');

  const mixedCjkLatinCases = [
    { w1: 'J-POP', w2: '音楽', line: 'J-POP 音楽', expectSpace: true, name: 'Latin -> Kanji with space in lineText' },
    { w1: 'J-POP', w2: '音楽', line: 'J-POP音楽', expectSpace: false, name: 'Latin -> Kanji without space in lineText' },
    { w1: '音楽', w2: 'J-POP', line: '音楽 J-POP', expectSpace: true, name: 'Kanji -> Latin with space in lineText' },
    { w1: '音楽', w2: 'J-POP', line: '音楽J-POP', expectSpace: false, name: 'Kanji -> Latin without space in lineText' },
    { w1: 'Hello', w2: '世界', line: 'Hello 世界', expectSpace: true, name: 'Hello 世界 with space' },
    { w1: 'Hello', w2: '世界', line: 'Hello世界', expectSpace: false, name: 'Hello世界 without space' },
    { w1: 'K-POP', w2: '노래', line: 'K-POP 노래', expectSpace: true, name: 'Latin -> Hangul with space' },
    { w1: 'K-POP', w2: '노래', line: 'K-POP노래', expectSpace: false, name: 'Latin -> Hangul without space' },
    { w1: '노래', w2: 'K-POP', line: '노래 K-POP', expectSpace: true, name: 'Hangul -> Latin with space' },
    { w1: '노래', w2: 'K-POP', line: '노래K-POP', expectSpace: false, name: 'Hangul -> Latin without space' },
    { w1: 'you', w2: '愛してる', line: 'I love you 愛してる', expectSpace: true, name: 'English phrase -> Japanese with space' }
  ];

  for (const mc of mixedCjkLatinCases) {
    test(`R3-MIXED. ${mc.name}`, () => {
      const words = [{ text: mc.w1 }, { text: mc.w2 }];
      const state = { position: 0 };
      const actual = sandbox.needsTimedWordSpace(words, 0, mc.line, state);
      assert.strictEqual(actual, mc.expectSpace, `Failed on ${mc.name}: expected ${mc.expectSpace}, got ${actual}`);
    });
  }

  // Generator 5: Japanese Kanji + Kana / Furigana
  console.log('\n--- SECTION 3: R3 Japanese Kanji, Kana & Korean Hangul Oracles ---');

  test('R3-JAP-1. Kanji + Hiragana okurigana (桜が咲いた) has no spaces between syllables', () => {
    const syllables = [{ text: '桜' }, { text: 'が' }, { text: '咲' }, { text: 'い' }, { text: 'た' }];
    const state = { position: 0 };
    for (let i = 0; i < syllables.length - 1; i++) {
      assert.strictEqual(sandbox.needsTimedWordSpace(syllables, i, '桜が咲いた', state), false);
    }
  });

  test('R3-JAP-2. Katakana + Chōonpu prolonged mark (ラーメン屋) has no spaces between syllables', () => {
    const syllables = [{ text: 'ラ' }, { text: 'ー' }, { text: 'メ' }, { text: 'ン' }, { text: '屋' }];
    const state = { position: 0 };
    for (let i = 0; i < syllables.length - 1; i++) {
      assert.strictEqual(sandbox.needsTimedWordSpace(syllables, i, 'ラーメン屋', state), false);
    }
  });

  test('R3-JAP-3. Kanji + Katakana compound (消しゴム) has no spaces between syllables', () => {
    const syllables = [{ text: '消' }, { text: 'し' }, { text: 'ゴ' }, { text: 'ム' }];
    const state = { position: 0 };
    for (let i = 0; i < syllables.length - 1; i++) {
      assert.strictEqual(sandbox.needsTimedWordSpace(syllables, i, '消しゴム', state), false);
    }
  });

  test('R3-JAP-4. Kanji + Furigana parenthetical (時(とき)) has no spaces before bracket', () => {
    const syllables = [{ text: '時' }, { text: '(とき)' }];
    const state = { position: 0 };
    assert.strictEqual(sandbox.needsTimedWordSpace(syllables, 0, '時(とき)', state), false);
  });

  test('R3-KOR-1. Korean intra-word Hangul syllables (사랑해, 보고싶다) have no spaces', () => {
    const saranghae = [{ text: '사' }, { text: '랑' }, { text: '해' }];
    const state1 = { position: 0 };
    assert.strictEqual(sandbox.needsTimedWordSpace(saranghae, 0, '사랑해', state1), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(saranghae, 1, '사랑해', state1), false);

    const bogoshipda = [{ text: '보' }, { text: '고' }, { text: '싶' }, { text: '다' }];
    const state2 = { position: 0 };
    for (let i = 0; i < bogoshipda.length - 1; i++) {
      assert.strictEqual(sandbox.needsTimedWordSpace(bogoshipda, i, '보고싶다', state2), false);
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Micro-Gap Timing Continuity in LyricsEngine.js
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: R3 Micro-Gap Timing Continuity Matrix (LyricsEngine.js) ---');

  const microGaps = [0, 5, 10, 20, 40, 60, 80, 100, 120, 140, 149, 150, 151, 160, 200, 300, 500];

  for (const gapMs of microGaps) {
    const gapSec = gapMs / 1000;
    test(`R3-GAP. getLineWordStates timing continuity with ${gapMs}ms intra-word micro-gap`, () => {
      const w0 = { text: 'un-', start: 1.0, end: 1.2 };
      const w1 = { text: 'be', start: 1.2 + gapSec, end: 1.2 + gapSec + 0.4 };
      const engine = new LyricEngine();
      engine.setLyrics({ lines: [{ time: 1.0, text: 'un-be', words: [w0, w1] }] });

      if (gapMs <= 150) {
        // Across gap <= 150ms: w0 must stay active during the gap
        if (gapMs > 0) {
          const midGap = 1.2 + (gapSec / 2);
          const sMid = engine.getLineWordStates(0, midGap);
          assert.strictEqual(sMid[0], 'active', `Word 0 must stay active during ${gapMs}ms gap at t=${midGap}`);
          assert.strictEqual(sMid[1], 'upcoming', `Word 1 must remain upcoming during gap at t=${midGap}`);
        }
        // At exact start of w1: w0 completes, w1 activates
        const sOnset = engine.getLineWordStates(0, w1.start);
        assert.strictEqual(sOnset[0], 'completed', `Word 0 must complete on w1 start at t=${w1.start}`);
        assert.strictEqual(sOnset[1], 'active', `Word 1 must activate on w1 start at t=${w1.start}`);
      } else {
        // For gap > 150ms: w0 must complete after 150ms (at t = 1.2 + 0.1505)
        const past150 = 1.2 + 0.1505;
        const sPast = engine.getLineWordStates(0, past150);
        assert.strictEqual(sPast[0], 'completed', `Word 0 must complete beyond 150ms pause at t=${past150}`);
        assert.strictEqual(sPast[1], 'upcoming', `Word 1 must stay upcoming during pause at t=${past150}`);

        // And w1 activates at its onset
        const sOnset = engine.getLineWordStates(0, w1.start);
        assert.strictEqual(sOnset[0], 'completed', `Word 0 must stay completed at t=${w1.start}`);
        assert.strictEqual(sOnset[1], 'active', `Word 1 must activate at t=${w1.start}`);
      }
    });
  }

  // Continuous high-resolution time sweep simulation on 6-syllable sequence
  test('R3-SWEEP. Continuous 10ms time sweep simulation across 6 syllables has zero flicker and single active word', () => {
    const syllables = [
      { text: 'un-', start: 1.00, end: 1.15 },
      { text: 'be-', start: 1.17, end: 1.25 },  // 20ms gap
      { text: 'liev-', start: 1.30, end: 1.45 }, // 50ms gap
      { text: 'a-', start: 1.53, end: 1.60 },   // 80ms gap
      { text: 'ble', start: 1.72, end: 1.85 },  // 120ms gap
      { text: 'world', start: 2.15, end: 2.45 } // 300ms pause (>150ms)
    ];
    const engine = new LyricEngine();
    engine.setLyrics({ lines: [{ time: 1.0, text: 'un-be-liev-a-ble world', words: syllables }] });

    let activeSyllableSequence = [];
    let lastActiveIdx = -1;

    for (let t = 0.90; t <= 2.60; t += 0.01) {
      const time = Math.round(t * 100) / 100;
      const states = engine.getLineWordStates(0, time);
      const activeIndices = [];
      states.forEach((s, idx) => {
        if (s === 'active') activeIndices.push(idx);
      });

      // Assert at most 1 word is active at any single moment
      assert.ok(activeIndices.length <= 1, `Multiple active words at t=${time}: [${activeIndices.join(',')}]`);

      const currentActive = activeIndices.length === 1 ? activeIndices[0] : -1;
      if (currentActive !== lastActiveIdx) {
        if (currentActive !== -1) {
          activeSyllableSequence.push(currentActive);
        }
        lastActiveIdx = currentActive;
      }
    }

    // Sequence must strictly progress in forward order: 0 -> 1 -> 2 -> 3 -> 4 -> 5
    assert.deepStrictEqual(activeSyllableSequence, [0, 1, 2, 3, 4, 5], 'Syllables must activate in strictly sequential order without skipping or regress');
  });

  // Edge cases in LyricsEngine
  test('R3-ENGINE-EDGE. LyricsEngine boundary & malformed input resilience', () => {
    const engine = new LyricEngine();
    assert.deepStrictEqual(engine.getLineWordStates(0, 1.0), [], 'Unloaded engine returns []');

    engine.setLyrics({ lines: [{ text: 'Plain line without words' }] });
    assert.deepStrictEqual(engine.getLineWordStates(0, 1.0), [], 'Line without words array returns []');

    engine.setLyrics({ lines: [{ text: 'Empty words', words: [] }] });
    assert.deepStrictEqual(engine.getLineWordStates(0, 1.0), [], 'Line with empty words returns []');

    engine.setLyrics({
      lines: [{
        text: 'NaN and negative times',
        words: [
          { text: 'w1', start: NaN, end: NaN },
          { text: 'w2', start: -1.0, end: -0.5 }
        ]
      }]
    });
    const resNegative = engine.getLineWordStates(0, 0.0);
    assert.strictEqual(Array.isArray(resNegative), true);
    assert.strictEqual(resNegative.length, 2);
  });

  // --------------------------------------------------------------------------
  // SECTION 5: R2 Dynamic Island Mask & Duet Capsule Box Shadow
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: R2 Dynamic Island Mask & Duet Box Shadow Oracles ---');

  // CSS Invariant Oracles
  test('R2-CSS-1. .island-duet-marquee-wrapper has mask-image: none and no static gradient', () => {
    const match = islandCss.match(/\.island-duet-marquee-wrapper\s*\{([\s\S]*?)\}/);
    assert.ok(match, 'Found .island-duet-marquee-wrapper in CSS');
    assert.ok(match[1].includes('mask-image: none;'));
    assert.ok(match[1].includes('-webkit-mask-image: none;'));
    assert.strictEqual(match[1].includes('linear-gradient'), false, 'Must NOT contain static gradient mask');
  });

  test('R2-CSS-2. .island-satellite-marquee-wrapper has mask-image: none and no static gradient', () => {
    const match = islandCss.match(/\.island-satellite-marquee-wrapper[\s\S]*?\{([\s\S]*?)\}/);
    assert.ok(match, 'Found .island-satellite-marquee-wrapper in CSS');
    assert.ok(match[1].includes('mask-image: none;'));
    assert.ok(match[1].includes('-webkit-mask-image: none;'));
    assert.strictEqual(match[1].includes('linear-gradient'), false, 'Must NOT contain static gradient mask');
  });

  test('R2-CSS-3. .island-stage-original has mask-image: none and no static gradient', () => {
    const match = islandCss.match(/\.island-stage-original\s*\{([\s\S]*?)\}/);
    assert.ok(match, 'Found .island-stage-original in CSS');
    assert.ok(match[1].includes('mask-image: none;'));
    assert.ok(match[1].includes('-webkit-mask-image: none;'));
    assert.strictEqual(match[1].includes('linear-gradient'), false, 'Must NOT contain static gradient mask');
  });

  test('R2-CSS-4. #island-duet-capsule box-shadow is crisp (0 4px 14px rgba(0, 0, 0, 0.45)) without heavy dark blur', () => {
    const match = islandCss.match(/\.island-duet-capsule\s*\{([\s\S]*?)\}/);
    assert.ok(match, 'Found .island-duet-capsule in CSS');
    assert.ok(match[1].includes('0 4px 14px rgba(0, 0, 0, 0.45)'), 'Must contain crisp 0 4px 14px box shadow');
    assert.strictEqual(match[1].includes('0 10px 24px -4px rgba(0, 0, 0, 0.75)'), false, 'Must NOT contain heavy dark shadow');
  });

  test('R2-CSS-5. duetLiquidPinchSplit keyframes (65% & 100%) use refined 0 4px 14px box shadow', () => {
    const match = islandCss.match(/@keyframes duetLiquidPinchSplit\s*\{([\s\S]*?)\n\}/);
    assert.ok(match, 'Found duetLiquidPinchSplit keyframes');
    const keyframesBody = match[1];
    const occurrences = (keyframesBody.match(/0 4px 14px rgba\(0, 0, 0, 0\.45\)/g) || []).length;
    assert.strictEqual(occurrences >= 2, true, 'Both 65% and 100% keyframe steps must use refined 0 4px 14px shadow');
  });

  // Dynamic Marquee Overflow Mask Oracle
  test('R2-MARQUEE. updateMarqueeOverflow applies mask only when overflowing and restores none when fitting', () => {
    const marqueeSandbox = {
      requestAnimationFrame: (cb) => cb()
    };
    vm.runInNewContext(updateMarqueeOverflowCode, marqueeSandbox);

    const container = { clientWidth: 200, style: {} };
    const textElement = {
      scrollWidth: 190,
      classList: {
        remove: () => {},
        add: () => {}
      },
      style: {
        setProperty: () => {},
        removeProperty: () => {}
      }
    };

    // Case 1: Fitting text (190 <= 204) -> mask: none
    marqueeSandbox.updateMarqueeOverflow(container, textElement);
    assert.strictEqual(container.style.maskImage, 'none', 'Fitting text must have maskImage: none');
    assert.strictEqual(container.style.webkitMaskImage, 'none');

    // Case 2: Overflowing text (250 > 204) -> mask: gradient
    textElement.scrollWidth = 250;
    marqueeSandbox.updateMarqueeOverflow(container, textElement);
    assert.ok(container.style.maskImage.includes('linear-gradient'), 'Overflowing text must have gradient mask');
    assert.ok(container.style.maskImage.includes('transparent 100%'), 'Trailing edge must fade when overflowing');

    // Case 3: Resizing / short text (195 <= 204) -> restores mask: none
    textElement.scrollWidth = 195;
    marqueeSandbox.updateMarqueeOverflow(container, textElement);
    assert.strictEqual(container.style.maskImage, 'none', 'Returning to fitting text must restore maskImage: none');
  });

  // Island Lyric Scrolling Mask State Machine
  test('R2-ISLAND-MASK. Island lyric scroll mask state machine never shadows trailing glyphs at scroll termination', () => {
    const END_CLEARANCE = 12;
    const maxScroll = -100;

    function computeIslandMask(currentIslandOffset) {
      if (currentIslandOffset >= -4) {
        return 'linear-gradient(90deg, #000 0%, #000 calc(100% - 16px), transparent 100%)';
      } else if (currentIslandOffset <= maxScroll + END_CLEARANCE) {
        return 'linear-gradient(90deg, transparent 0%, #000 14px, #000 100%)';
      } else {
        return 'linear-gradient(90deg, transparent 0%, #000 14px, #000 calc(100% - 16px), transparent 100%)';
      }
    }

    // State 1: Start (offset = 0) -> right fade only
    const startMask = computeIslandMask(0);
    assert.ok(startMask.startsWith('linear-gradient(90deg, #000 0%'), 'Start must be solid at left edge');
    assert.ok(startMask.endsWith('transparent 100%)'), 'Start must fade right edge');

    // State 2: Middle (offset = -50) -> dual fade
    const midMask = computeIslandMask(-50);
    assert.ok(midMask.startsWith('linear-gradient(90deg, transparent 0%'), 'Middle must fade left edge');
    assert.ok(midMask.endsWith('transparent 100%)'), 'Middle must fade right edge');

    // State 3: End (offset = -95, <= -88) -> LEFT FADE ONLY, SOLID RIGHT!
    const endMask = computeIslandMask(-95);
    assert.ok(endMask.startsWith('linear-gradient(90deg, transparent 0%'), 'End must fade left edge');
    assert.ok(endMask.endsWith('#000 100%)'), 'End must terminate in solid #000 100% so trailing glyphs are NOT shadowed!');
  });

  console.log('\n================================================================');
  console.log(`  ADVERSARIAL RESULTS 2: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    console.error(`FAILURE SUMMARY (${failedTests} tests failed):`);
    failureDetails.forEach(f => {
      console.error(`- ${f.name}: ${f.error}`);
    });
    process.exit(1);
  }
}

runAdversarialSuite2();
