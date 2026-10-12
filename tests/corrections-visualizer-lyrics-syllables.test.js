/**
 * Acceptance & Unit Tests: Visualizer Resilience, Duet Margins, Syllables & Secondary Lyrics
 *
 * Verifies:
 * 1. 2-space bracket secondary lyrics detection in parseLRC, parseLyricsPlus and parseDuetVocalSplit
 * 2. Syllable continuity without unwanted spaces in multi-syllable words, hyphens and CJK
 * 3. Timing continuity across intra-word micro-gaps in LyricsEngine.js (getLineWordStates)
 * 4. Audio visualizer state persistence under hidden visibility in Wallpaper Mode & Rust buffer resilience
 * 5. Absence of static right-edge mask-image on .island-duet-marquee-wrapper and styling refinement
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

function runTests() {
  console.log('\n--- Running Corrections: Visualizer, Duet, Syllables & Brackets Tests ---\n');

  const parsersPath = path.resolve(__dirname, '../src/modules/parsers.js');
  const rendererPath = path.resolve(__dirname, '../src/renderer.js');
  const islandCssPath = path.resolve(__dirname, '../src/styles/_dynamic_island.css');
  const lyricsEnginePath = path.resolve(__dirname, '../src/services/lyrics/LyricsEngine.js');
  const audioRsPath = path.resolve(__dirname, '../src-tauri/src/audio.rs');

  const parsersCode = fs.readFileSync(parsersPath, 'utf8');
  const rendererCode = fs.readFileSync(rendererPath, 'utf8');
  const islandCss = fs.readFileSync(islandCssPath, 'utf8');
  const audioRsCode = fs.readFileSync(audioRsPath, 'utf8');

  const { parseLRC, parseLyricsPlus, cleanLyricText, cleanWordPunctuation } = require(parsersPath);
  const LyricEngine = require(lyricsEnginePath);

  // Set up VM sandbox for renderer functions
  const needsTimedWordSpaceCode = rendererCode.match(/function needsTimedWordSpace\([\s\S]*?\n\}/)[0];
  const parseDuetVocalSplitCode = rendererCode.match(/function parseDuetVocalSplit\([\s\S]*?\n\}/)[0];

  const sandbox = {
    cleanLyricText,
    cleanWordPunctuation,
    console
  };

  vm.runInNewContext(`
    ${needsTimedWordSpaceCode}
    ${parseDuetVocalSplitCode}
    this.needsTimedWordSpace = needsTimedWordSpace;
    this.parseDuetVocalSplit = parseDuetVocalSplit;
  `, sandbox);

  // -------------------------------------------------------------
  // SUITE 1: 2-Space Bracket Secondary Lyrics Detection
  // -------------------------------------------------------------
  test('1a. parseLRC detects 2 spaces before bracket as subText', () => {
    const lrc = '[00:10.00]Never gonna give you up  (give you up)';
    const parsed = parseLRC(lrc);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].text, 'Never gonna give you up');
    assert.ok(parsed[0].subText && parsed[0].subText.includes('give you up'));
  });

  test('1b. parseLRC detects tab before bracket as subText', () => {
    const lrc = '[00:15.00]Stand by me\t[backing chorus]';
    const parsed = parseLRC(lrc);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].text, 'Stand by me');
    assert.ok(parsed[0].subText && parsed[0].subText.includes('backing chorus'));
  });

  test('1c. parseLRC detects full-width Chinese brackets preceded by 2 spaces', () => {
    const lrc = '[00:20.00]海阔天空  （海阔天空）';
    const parsed = parseLRC(lrc);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].text, '海阔天空');
    assert.ok(parsed[0].subText && parsed[0].subText.includes('海阔天空'));
  });

  test('1d. parseLRC maps line.words to primary vocal words when secondary brackets present', () => {
    const lrc = '[00:10.00]<00:10.00>Never <00:10.50>gonna <00:11.00>give  <00:11.50>(never <00:12.00>gonna)';
    const parsed = parseLRC(lrc);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].text, 'Never gonna give');
    assert.strictEqual(parsed[0].words.length, 3);
    assert.strictEqual(parsed[0].words[0].text, 'Never');
    assert.strictEqual(parsed[0].words[1].text, 'gonna');
    assert.strictEqual(parsed[0].words[2].text, 'give');
  });

  test('1e. parseLyricsPlus extracts secondary brackets after 2 spaces', () => {
    const data = [
      {
        startTimeMs: 12000,
        text: 'Hold on tight  [backing vocal]',
        words: [
          { text: 'Hold', startTimeMs: 12000 },
          { text: 'on', startTimeMs: 12300 },
          { text: 'tight', startTimeMs: 12600 },
          { text: '[backing', startTimeMs: 13000 },
          { text: 'vocal]', startTimeMs: 13300 }
        ]
      }
    ];
    const parsed = parseLyricsPlus(data);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].text, 'Hold on tight');
    assert.strictEqual(parsed[0].subText, '[backing vocal]');
    assert.strictEqual(parsed[0].words.length, 3);
  });

  test('1f. parseDuetVocalSplit routes 2+ spaces before brackets to duet capsule', () => {
    const resParen = sandbox.parseDuetVocalSplit('Never gonna give you up  (give you up)');
    assert.ok(resParen);
    assert.strictEqual(resParen.leadText, 'Never gonna give you up');
    assert.strictEqual(resParen.duetText, 'give you up');

    const resSquare = sandbox.parseDuetVocalSplit('Take my hand  [take my hand]');
    assert.ok(resSquare);
    assert.strictEqual(resSquare.leadText, 'Take my hand');
    assert.strictEqual(resSquare.duetText, 'take my hand');

    const resChinese = sandbox.parseDuetVocalSplit('主唱旋律  （和声回应）');
    assert.ok(resChinese);
    assert.strictEqual(resChinese.leadText, '主唱旋律');
    assert.strictEqual(resChinese.duetText, '和声回应');
  });

  // -------------------------------------------------------------
  // SUITE 2: Syllable Tokenization, Hyphenation & Spacing
  // -------------------------------------------------------------
  test('2a. needsTimedWordSpace does not insert space after hyphenated token (flow-er)', () => {
    const words = [{ text: 'flow-' }, { text: 'er' }];
    const state = { position: 0 };
    const res = sandbox.needsTimedWordSpace(words, 0, 'flow-er', state);
    assert.strictEqual(res, false, 'No space between flow- and er');
  });

  test('2b. needsTimedWordSpace does not insert space for multi-syllable word in cleanLine (to-geth-er)', () => {
    const words = [{ text: 'to-' }, { text: 'geth-' }, { text: 'er' }];
    const state = { position: 0 };
    assert.strictEqual(sandbox.needsTimedWordSpace(words, 0, 'together', state), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(words, 1, 'together', state), false);
  });

  test('2c. needsTimedWordSpace does not insert space for beautiful when cleanLine contains merged word', () => {
    const words = [{ text: 'beau' }, { text: 'ti' }, { text: 'ful' }];
    const state = { position: 0 };
    assert.strictEqual(sandbox.needsTimedWordSpace(words, 0, 'beautiful', state), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(words, 1, 'beautiful', state), false);
  });

  test('2d. needsTimedWordSpace strictly preserves hasSpace === false', () => {
    const words = [{ text: 'mis', hasSpace: false }, { text: 'take' }];
    const state = { position: 0 };
    assert.strictEqual(sandbox.needsTimedWordSpace(words, 0, '', state), false);
  });

  test('2e. needsTimedWordSpace does not insert spaces between Japanese Hiragana and Katakana', () => {
    const hiraWords = [{ text: 'あ' }, { text: 'り' }, { text: 'が' }, { text: 'と' }, { text: 'う' }];
    const stateH = { position: 0 };
    for (let i = 0; i < hiraWords.length - 1; i++) {
      assert.strictEqual(sandbox.needsTimedWordSpace(hiraWords, i, 'ありがとう', stateH), false);
    }

    const kataWords = [{ text: 'コ' }, { text: 'ン' }, { text: 'ピ' }, { text: 'ュ' }, { text: 'ー' }, { text: 'タ' }];
    const stateK = { position: 0 };
    for (let i = 0; i < kataWords.length - 1; i++) {
      assert.strictEqual(sandbox.needsTimedWordSpace(kataWords, i, 'コンピュータ', stateK), false);
    }
  });

  test('2f. needsTimedWordSpace does not insert spaces between Korean Hangul syllables', () => {
    const hangulWords = [{ text: '사' }, { text: '랑' }, { text: '해' }];
    const stateHangul = { position: 0 };
    assert.strictEqual(sandbox.needsTimedWordSpace(hangulWords, 0, '사랑해', stateHangul), false);
    assert.strictEqual(sandbox.needsTimedWordSpace(hangulWords, 1, '사랑해', stateHangul), false);
  });

  test('2g. needsTimedWordSpace preserves spaces between normal Latin words', () => {
    const words = [{ text: 'Hello' }, { text: 'world' }];
    const state = { position: 0 };
    assert.strictEqual(sandbox.needsTimedWordSpace(words, 0, 'Hello world', state), true);
  });

  // -------------------------------------------------------------
  // SUITE 3: Timing Continuity Across Micro-Gaps (LyricsEngine)
  // -------------------------------------------------------------
  test('3a. getLineWordStates keeps active syllable continuous across 80ms micro-gap', () => {
    const engine = new LyricEngine();
    const words = [
      { text: 'beau-', start: 1.0, end: 1.2 },
      { text: 'ti-', start: 1.28, end: 1.45 },
      { text: 'ful', start: 1.5, end: 1.8 }
    ];
    engine.setLyrics({
      type: 'WORD',
      lines: [{ text: 'beautiful', start: 1.0, end: 2.0, words }]
    });

    // During micro-gap at 1.24s (between 1.20 and 1.28)
    const states = engine.getLineWordStates(0, 1.24);
    assert.strictEqual(states[0], 'active', 'Syllable 0 must stay active across intra-word micro-gap');
    assert.strictEqual(states[1], 'upcoming');
  });

  test('3b. getLineWordStates completes active word after 150ms during long pause', () => {
    const engine = new LyricEngine();
    const words = [
      { text: 'Wait', start: 1.0, end: 1.2 },
      { text: 'here', start: 2.5, end: 3.0 }
    ];
    engine.setLyrics({
      type: 'WORD',
      lines: [{ text: 'Wait here', start: 1.0, end: 3.5, words }]
    });

    // At 1.30s (within 150ms headroom)
    const statesActive = engine.getLineWordStates(0, 1.30);
    assert.strictEqual(statesActive[0], 'active');

    // At 1.45s (> 1.2 + 0.15 = 1.35s)
    const statesCompleted = engine.getLineWordStates(0, 1.45);
    assert.strictEqual(statesCompleted[0], 'completed', 'Word must complete during long pause');
    assert.strictEqual(statesCompleted[1], 'upcoming');
  });

  // -------------------------------------------------------------
  // SUITE 4: Audio Visualizer Persistence in Wallpaper Mode & Rust Buffer
  // -------------------------------------------------------------
  test('4a. syncAudioVisualizerState treats wallpaperMode as active under hidden visibility', () => {
    assert.ok(
      rendererCode.includes('settings.wallpaperMode') &&
      rendererCode.includes('isWallpaperModeActive') &&
      rendererCode.includes('isVisible = document.visibilityState !== \'hidden\' || isDynamicIslandMode || isWallpaperModeActive'),
      'Must ensure wallpaper mode is active regardless of document.visibilityState'
    );
  });

  test('4b. onAudioSpectrum evaluates hasEnergy directly from WASAPI bands', () => {
    assert.ok(
      rendererCode.includes('hasEnergy') && rendererCode.includes('onAudioSpectrum'),
      'Must allow WASAPI energy to drive visualization'
    );
    assert.ok(
      rendererCode.includes('msSinceEnergy > 350'),
      'Must settle to resting baseline only after >350ms silence when stopped/paused'
    );
  });

  test('4c. audio.rs initializes with 500ms buffer and handles AUDCLNT_E_BUFFER_ERROR non-fatally', () => {
    assert.ok(audioRsCode.includes('5000000'), 'audio.rs must initialize WASAPI buffer with 5000000 (500ms)');
    assert.ok(audioRsCode.includes('AUDCLNT_E_BUFFER_ERROR'), 'audio.rs must handle AUDCLNT_E_BUFFER_ERROR');
    assert.ok(!audioRsCode.includes('std::thread::sleep(Duration::from_millis(100));'), 'audio.rs must eliminate nested 100ms silence sleep');
  });

  // -------------------------------------------------------------
  // SUITE 5: Elimination of Static Gradient Masks on Dynamic Island
  // -------------------------------------------------------------
  test('5a. .island-duet-marquee-wrapper does NOT contain static mask-image', () => {
    const match = islandCss.match(/\.island-duet-marquee-wrapper\s*\{([^}]+)\}/);
    assert.ok(match, '.island-duet-marquee-wrapper must exist in CSS');
    assert.strictEqual(match[1].includes('mask-image: linear-gradient'), false, 'Must eliminate static mask-image');
    assert.strictEqual(match[1].includes('-webkit-mask-image: linear-gradient'), false, 'Must eliminate static -webkit-mask-image');
  });

  test('5b. .island-satellite-marquee-wrapper does NOT contain static right-edge mask', () => {
    const match = islandCss.match(/\.island-satellite-marquee-wrapper\s*\{([^}]+)\}/);
    if (match) {
      assert.strictEqual(match[1].includes('mask-image: linear-gradient'), false);
    }
  });

  test('5c. .island-stage-original does NOT contain static right-edge mask', () => {
    const match = islandCss.match(/\.island-stage-original\s*\{([^}]+)\}/);
    assert.ok(match, '.island-stage-original must exist in CSS');
    assert.strictEqual(match[1].includes('mask-image: linear-gradient'), false);
  });

  test('5d. #island-duet-capsule box-shadow is crisp and subtle', () => {
    assert.ok(
      islandCss.includes('0 4px 14px rgba(0, 0, 0, 0.45)') ||
      islandCss.includes('0 4px 14px rgba(0,0,0,0.45)'),
      'Must use crisp 0 4px 14px shadow on duet capsule'
    );
  });

  console.log(`\nCorrections & Visualizer Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
