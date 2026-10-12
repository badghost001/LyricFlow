/**
 * Empirical Adversarial Challenge Suite: Milestone 1
 * Roles: Critic, Specialist
 *
 * Exhaustive Stress Harness, Generator & Oracle Testing for:
 * 1. R4: 2+ Spaces / Tab Delimited Brackets Secondary Lyrics & Duet Vocal Splitting
 *    - Whitespace generators (2, 3, 5, 20 spaces; 1, 2, 5 tabs; mixed tabs/spaces)
 *    - Negative cases (0 spaces, 1 space, invalid bracket formatting)
 *    - Punctuation & bracket type matrix: (), [], {}, （）, 【】
 *    - Trailing punctuation resilience (. , ! ? : ; " ' ” ’ ...)
 *    - Nested & multiple bracket behavior
 *    - Word slicing oracle for Enhanced LRC & LyricsPlus
 *    - ReDoS / catastrophic backtracking stress harness (10,000 char inputs)
 *    - Metadata exclusion oracle (feat, instrumental, solo, chorus, etc.)
 *
 * 2. R1: Audio Visualizer Resilience, Silence Grace & Wallpaper Mode Gating
 *    - Full 32-state truth table matrix test for syncAudioVisualizerState
 *    - Exact millisecond-boundary silence settling oracle for onAudioSpectrum (>350ms)
 *    - High-frequency silence/energy jitter stress test (5,000 frames)
 *    - Visualizer style transforms (bars vs dots, 4 bars vs 6 bars)
 *    - Rust audio.rs invariant verification (500ms buffer, AUDCLNT_E_BUFFER_ERROR recovery, fresh COM enumerator)
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

function runAdversarialSuite() {
  console.log('\n================================================================');
  console.log('  STARTING ADVERSARIAL STRESS & ORACLE SUITE (CHALLENGER M1)    ');
  console.log('================================================================\n');

  const parsersPath = path.resolve(__dirname, '../src/modules/parsers.js');
  const rendererPath = path.resolve(__dirname, '../src/renderer.js');
  const islandCssPath = path.resolve(__dirname, '../src/styles/_dynamic_island.css');
  const audioRsPath = path.resolve(__dirname, '../src-tauri/src/audio.rs');

  const parsersCode = fs.readFileSync(parsersPath, 'utf8');
  const rendererCode = fs.readFileSync(rendererPath, 'utf8');
  const islandCss = fs.readFileSync(islandCssPath, 'utf8');
  const audioRsCode = fs.readFileSync(audioRsPath, 'utf8');

  const { parseLRC, parseLyricsPlus, cleanLyricText, cleanWordPunctuation } = require(parsersPath);

  // Extract functions from renderer.js
  const parseDuetVocalSplitMatch = rendererCode.match(/function parseDuetVocalSplit\([\s\S]*?\n\}/);
  assert.ok(parseDuetVocalSplitMatch, 'Found parseDuetVocalSplit in renderer.js');
  const duetSandbox = {};
  vm.runInNewContext(parseDuetVocalSplitMatch[0] + '\nthis.parseDuetVocalSplit = parseDuetVocalSplit;', duetSandbox);
  const parseDuetVocalSplit = duetSandbox.parseDuetVocalSplit;

  const syncAudioVisualizerStateMatch = rendererCode.match(/function syncAudioVisualizerState\(\) \{[\s\S]*?\n\}/);
  assert.ok(syncAudioVisualizerStateMatch, 'Found syncAudioVisualizerState in renderer.js');
  const syncAudioVisualizerStateCode = syncAudioVisualizerStateMatch[0];

  // Extract onAudioSpectrum callback body reliably
  const spectrumPrefix = 'window.electronAPI.onAudioSpectrum((bands) => {';
  const spectrumStart = rendererCode.indexOf(spectrumPrefix);
  assert.ok(spectrumStart !== -1, 'Found onAudioSpectrum in renderer.js');
  const bodyStart = spectrumStart + spectrumPrefix.length;
  // find the closing of onAudioSpectrum: '  });\n}' around line 809
  const spectrumClose = rendererCode.indexOf('  });\n}', bodyStart);
  assert.ok(spectrumClose !== -1, 'Found closing of onAudioSpectrum');
  const listenerBody = rendererCode.substring(bodyStart, spectrumClose);

  console.log('--- SECTION 1: R4 Whitespace Generator & Bracket Matrix Oracles ---');

  // Generator 1: Variable whitespace lengths before bracket
  const spaceCounts = [2, 3, 4, 5, 8, 15, 32];
  for (const count of spaceCounts) {
    test(`R4-GEN-1. parseLRC with ${count} spaces preceding brackets`, () => {
      const spaces = ' '.repeat(count);
      const lrc = `[00:05.00]Gotta make you understand${spaces}(make you understand)`;
      const res = parseLRC(lrc);
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].text, 'Gotta make you understand');
      assert.strictEqual(res[0].subText, '(make you understand)');
    });

    test(`R4-GEN-2. parseDuetVocalSplit with ${count} spaces preceding brackets`, () => {
      const spaces = ' '.repeat(count);
      const res = parseDuetVocalSplit(`Lead melody${spaces}(Harmonies)`);
      assert.ok(res, `Failed on ${count} spaces`);
      assert.strictEqual(res.leadText, 'Lead melody');
      assert.strictEqual(res.duetText, 'Harmonies');
    });
  }

  // Generator 2: Variable tabs preceding bracket
  const tabCounts = [1, 2, 3, 5];
  for (const count of tabCounts) {
    test(`R4-GEN-3. parseLRC with ${count} tabs preceding brackets`, () => {
      const tabs = '\t'.repeat(count);
      const lrc = `[00:05.00]Echoes in the dark${tabs}[echoes]`;
      const res = parseLRC(lrc);
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].text, 'Echoes in the dark');
      assert.strictEqual(res[0].subText, '[echoes]');
    });

    test(`R4-GEN-4. parseDuetVocalSplit with ${count} tabs preceding brackets`, () => {
      const tabs = '\t'.repeat(count);
      const res = parseDuetVocalSplit(`Echoes in the dark${tabs}[echoes]`);
      assert.ok(res, `Failed on ${count} tabs`);
      assert.strictEqual(res.leadText, 'Echoes in the dark');
      assert.strictEqual(res.duetText, 'echoes');
    });
  }

  // Generator 3: Mixed spaces and tabs preceding bracket
  const mixedWhitespace = [
    ' \t',
    '\t ',
    '  \t',
    '\t  ',
    ' \t ',
    '   \t\t   ',
    '\t\t \t'
  ];
  for (const ws of mixedWhitespace) {
    test(`R4-GEN-5. parseLRC with mixed whitespace "${ws.replace(/\t/g, '\\t').replace(/ /g, '·')}"`, () => {
      const lrc = `[00:05.00]Mixed whitespace test${ws}{backing vocal}`;
      const res = parseLRC(lrc);
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].text, 'Mixed whitespace test');
      assert.strictEqual(res[0].subText, '{backing vocal}');
    });

    test(`R4-GEN-6. parseDuetVocalSplit with mixed whitespace "${ws.replace(/\t/g, '\\t').replace(/ /g, '·')}"`, () => {
      const res = parseDuetVocalSplit(`Mixed whitespace test${ws}{backing vocal}`);
      assert.ok(res, `Failed on mixed whitespace ${JSON.stringify(ws)}`);
      assert.strictEqual(res.leadText, 'Mixed whitespace test');
      assert.strictEqual(res.duetText, 'backing vocal');
    });
  }

  // Generator 4: All bracket variants
  const bracketVariants = [
    { open: '(', close: ')', name: 'ASCII round' },
    { open: '[', close: ']', name: 'ASCII square' },
    { open: '{', close: '}', name: 'ASCII curly' },
    { open: '（', close: '）', name: 'Fullwidth round' },
    { open: '【', close: '】', name: 'Fullwidth black lenticular' }
  ];
  for (const b of bracketVariants) {
    test(`R4-BRACKET. parseLRC bracket variant ${b.name}: ${b.open}text${b.close}`, () => {
      const lrc = `[00:05.00]Main line  ${b.open}Secondary text${b.close}`;
      const res = parseLRC(lrc);
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].text, 'Main line');
      assert.ok(res[0].subText && res[0].subText.includes('Secondary text'), `Failed for ${b.name}`);
    });

    test(`R4-BRACKET. parseDuetVocalSplit bracket variant ${b.name}: ${b.open}text${b.close}`, () => {
      const res = parseDuetVocalSplit(`Main line  ${b.open}Secondary text${b.close}`);
      assert.ok(res, `Failed for ${b.name}`);
      assert.strictEqual(res.leadText, 'Main line');
      assert.strictEqual(res.duetText, 'Secondary text');
    });
  }

  // Generator 5: Trailing punctuation handling
  const trailingPunctuation = ['.', '!', '?', '...', ',', ';', ':', '"', '\'', '”', '’'];
  for (const p of trailingPunctuation) {
    test(`R4-PUNCT. parseDuetVocalSplit with trailing punctuation "${p}"`, () => {
      const str = `I feel alive  (so alive)${p}`;
      const res = parseDuetVocalSplit(str);
      assert.ok(res, `Failed with trailing punctuation "${p}"`);
      assert.strictEqual(res.leadText, 'I feel alive');
      assert.strictEqual(res.duetText, 'so alive');
    });
  }

  // Negative test cases for R4
  test('R4-NEG-1. Single space does NOT trigger 2-space branch in parseLRC', () => {
    const lrc = '[00:05.00]Don\'t let me down (don\'t let me down)';
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    // Single space does not trigger secondary lyrics bracket split in parseLRC
    assert.strictEqual(res[0].subText, undefined);
    assert.ok(res[0].text.includes('don\'t let me down'));
  });

  test('R4-NEG-2. Zero space does NOT trigger 2-space branch in parseLRC', () => {
    const lrc = '[00:05.00]Song(backing)';
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].subText, undefined);
  });

  test('R4-NEG-3. Empty brackets "  ()" do not match secondary lyrics regex', () => {
    const lrc = '[00:05.00]Empty bracket test  ()';
    const res = parseLRC(lrc);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].subText, undefined);
  });

  test('R4-NEG-4. Metadata tags in brackets are excluded in parseDuetVocalSplit', () => {
    const metaCases = [
      'Song title  (feat. Drake)',
      'Song title  (ft. Rihanna)',
      'Interlude  (Instrumental)',
      'Guitar part  (Solo)',
      'Main theme  (Chorus)',
      'Opening line  (Verse)',
      'Intro track  (Intro)',
      'Closing track  (Outro)',
      'Transition  (Bridge)'
    ];
    for (const text of metaCases) {
      const res = parseDuetVocalSplit(text);
      assert.strictEqual(res, null, `Should have filtered out metadata: ${text}`);
    }
  });

  // ReDoS & Stress Harness for parseDuetVocalSplit & parseLRC
  test('R4-STRESS-1. Catastrophic backtracking check on 10,000 char malformed inputs', () => {
    const largeLead = 'a'.repeat(5000);
    const unclosedBracket = '  (' + 'b'.repeat(5000);
    const t0 = Date.now();
    const res = parseDuetVocalSplit(largeLead + unclosedBracket);
    const elapsed = Date.now() - t0;
    assert.strictEqual(res, null);
    assert.ok(elapsed < 200, `ReDoS risk detected! Took ${elapsed}ms`);
  });

  test('R4-STRESS-2. Random fuzz stress on parseDuetVocalSplit (1,000 iterations)', () => {
    const chars = ' abcdefghij1234567890()[]{}（）【】\t\n.,!?:;';
    const t0 = Date.now();
    for (let i = 0; i < 1000; i++) {
      let str = '';
      const len = Math.floor(Math.random() * 80) + 5;
      for (let j = 0; j < len; j++) {
        str += chars[Math.floor(Math.random() * chars.length)];
      }
      parseDuetVocalSplit(str);
    }
    const elapsed = Date.now() - t0;
    assert.ok(elapsed < 1000, `Fuzz stress exceeded 1000ms: took ${elapsed}ms`);
  });

  // Word slicing oracle for Enhanced LRC
  test('R4-ORACLE-1. Enhanced LRC syllable slicing with 2-space secondary lyrics', () => {
    const lrc = '[00:10.00]<00:10.00>Hold <00:10.40>on <00:10.80>tight  <00:11.20>(hold <00:11.60>on)';
    const parsed = parseLRC(lrc);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].text, 'Hold on tight');
    assert.strictEqual(parsed[0].subText, '(hold on)');
    assert.strictEqual(parsed[0].words.length, 3);
    assert.strictEqual(parsed[0].words.map(w => w.text).join(' '), 'Hold on tight');
  });

  test('R4-ORACLE-2. Enhanced LRC syllable slicing when lead line contains punctuation', () => {
    const lrc = '[00:10.00]<00:10.00>Never, <00:10.40>gonna! <00:10.80>give  <00:11.20>(give)';
    const parsed = parseLRC(lrc);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].words.length, 3);
    assert.strictEqual(parsed[0].words[0].text, 'Never,');
    assert.strictEqual(parsed[0].words[1].text, 'gonna!');
    assert.strictEqual(parsed[0].words[2].text, 'give');
  });

  test('R4-ORACLE-3. parseLyricsPlus word slicing with 2-space brackets', () => {
    const payload = [
      {
        startTimeMs: 5000,
        text: 'Carry on my wayward son  [backing choir]',
        words: [
          { text: 'Carry', startTimeMs: 5000 },
          { text: 'on', startTimeMs: 5300 },
          { text: 'my', startTimeMs: 5500 },
          { text: 'wayward', startTimeMs: 5800 },
          { text: 'son', startTimeMs: 6200 },
          { text: '[backing', startTimeMs: 6600 },
          { text: 'choir]', startTimeMs: 7000 }
        ]
      }
    ];
    const parsed = parseLyricsPlus(payload);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].text, 'Carry on my wayward son');
    assert.strictEqual(parsed[0].subText, '[backing choir]');
    assert.strictEqual(parsed[0].words.length, 5);
    assert.strictEqual(parsed[0].words.map(w => w.text).join(' '), 'Carry on my wayward son');
  });

  console.log('\n--- SECTION 2: R1 Audio Visualizer Resilience & Gating Oracles ---');

  // Complete 32-state truth table generator for syncAudioVisualizerState
  test('R1-ORACLE-1. Full 32-state truth table matrix test for syncAudioVisualizerState()', () => {
    const booleanOptions = [false, true];
    const visibilityOptions = ['visible', 'hidden'];

    let stateEvaluationCount = 0;

    for (const isIsland of booleanOptions) {
      for (const isSleeping of booleanOptions) {
        for (const isWallpaper of booleanOptions) {
          for (const isBloom of booleanOptions) {
            for (const visState of visibilityOptions) {
              stateEvaluationCount++;

              // Mathematical ground truth oracle
              const isIslandActive = Boolean(isIsland && !isSleeping);
              const isWallpaperBloomActive = Boolean(isWallpaper && isBloom);
              const isVisible = visState !== 'hidden' || isIsland || isWallpaper;
              const expectedActive = (isIslandActive || isWallpaperBloomActive) && isVisible;

              // Mock execution environment
              let dispatchedActive = null;
              let callsCount = 0;

              const sandbox = {
                isDynamicIslandMode: isIsland,
                isIslandSleeping: isSleeping,
                settings: {
                  wallpaperMode: isWallpaper,
                  wallpaperBeatBloom: isBloom
                },
                document: {
                  visibilityState: visState
                },
                window: {
                  electronAPI: {
                    setAudioVisualizerActive: (val) => {
                      callsCount++;
                      dispatchedActive = val;
                    }
                  }
                },
                _currentAudioVisualizerActiveState: null,
                visualizerFallbackInterval: null,
                ensureVisualizerFallbackWatchdog: () => {}
              };

              vm.runInNewContext(`
                ${syncAudioVisualizerStateCode}
                this.syncAudioVisualizerState = syncAudioVisualizerState;
              `, sandbox);

              sandbox.syncAudioVisualizerState();

              assert.strictEqual(
                dispatchedActive,
                expectedActive,
                `State mismatch on combo: Island=${isIsland}, Sleeping=${isSleeping}, Wallpaper=${isWallpaper}, Bloom=${isBloom}, Visibility=${visState}. Expected=${expectedActive}, Got=${dispatchedActive}`
              );

              // Deduplication test: running again with identical state must NOT dispatch IPC again
              sandbox.syncAudioVisualizerState();
              assert.strictEqual(
                callsCount,
                1,
                `IPC call must be deduplicated when state is unchanged. Called ${callsCount} times.`
              );
            }
          }
        }
      }
    }

    assert.strictEqual(stateEvaluationCount, 32, 'Must evaluate exactly 32 distinct state combinations');
  });

  // Exact millisecond-boundary silence settling oracle for onAudioSpectrum
  test('R1-ORACLE-2. Millisecond boundary test for onAudioSpectrum silence settling grace period', () => {
    function createMockSpectrumEnvironment(initialTimestamp, isPlayingState) {
      let restingClassAdded = false;
      let nowTime = initialTimestamp;

      const mockBars = [
        { style: {} },
        { style: {} },
        { style: {} },
        { style: {} }
      ];

      const mockIslandWave = {
        classList: {
          contains: (cls) => cls === 'is-resting' ? restingClassAdded : false,
          add: (cls) => { if (cls === 'is-resting') restingClassAdded = true; },
          remove: (cls) => { if (cls === 'is-resting') restingClassAdded = false; }
        },
        querySelectorAll: () => mockBars
      };

      const env = {
        Date: { now: () => nowTime },
        console: { log: () => {} },
        isDynamicIslandMode: true,
        isIslandSleeping: false,
        isPlaying: isPlayingState,
        document: {
          body: { classList: { contains: () => isPlayingState } },
          getElementById: (id) => id === 'island-wave' ? mockIslandWave : null
        },
        settings: {
          wallpaperMode: false,
          wallpaperBeatBloom: false,
          islandVisualizerStyle: 'bars',
          islandVisualizerBars: 4
        },
        lastSpectrumBars: mockBars,
        lastAudioEnergyTimestamp: initialTimestamp,
        isVisualizerResting: false,
        hasLoggedSpectrumTelemetry: true,
        updateIslandEnergyMorph: () => {},
        updateWallpaperLyricBeatBloom: () => {},
        checkVisualizerFallback: () => {},
        setTime: (t) => { nowTime = t; },
        getIsResting: () => restingClassAdded,
        getBarTransforms: () => mockBars.map(b => b.style.transform)
      };

      const wrappedCode = `
        function handleSpectrum(bands) {
          ${listenerBody}
        }
        this.handleSpectrum = handleSpectrum;
      `;

      vm.runInNewContext(wrappedCode, env);
      return env;
    }

    const t0 = 1000000;
    const env = createMockSpectrumEnvironment(t0, false);

    // Step 1: Active audio frame at t0
    env.handleSpectrum([0.45, 0.32, 0.18, 0.09]);
    assert.strictEqual(env.getIsResting(), false, 'Visualizer must not be resting on active audio');

    // Step 2: Silence at t0 + 100ms (< 350ms)
    env.setTime(t0 + 100);
    env.handleSpectrum([0.001, 0.0, 0.0, 0.0]); // Below 0.002 noise floor
    assert.strictEqual(env.getIsResting(), false, 'Visualizer must not rest after 100ms silence');

    // Step 3: Silence at t0 + 349ms (< 350ms)
    env.setTime(t0 + 349);
    env.handleSpectrum([0.0, 0.0, 0.0, 0.0]);
    assert.strictEqual(env.getIsResting(), false, 'Visualizer must not rest at 349ms silence');

    // Step 4: Silence at t0 + 351ms (> 350ms) -> MUST SETTLE
    env.setTime(t0 + 351);
    env.handleSpectrum([0.0, 0.0, 0.0, 0.0]);
    assert.strictEqual(env.getIsResting(), true, 'Visualizer MUST settle to resting baseline after >350ms silence');
    assert.strictEqual(env.getBarTransforms()[0], 'scaleY(0.14)', 'Bars must scale to resting 0.14');

    // Step 5: Sound resumes immediately at t0 + 400ms -> MUST WAKE UP
    env.setTime(t0 + 400);
    env.handleSpectrum([0.25, 0.30, 0.15, 0.08]);
    assert.strictEqual(env.getIsResting(), false, 'Visualizer must immediately wake up from resting on audio energy');
  });

  // High-frequency silence/energy jitter stress test (5,000 frames)
  test('R1-STRESS-1. Rapid 5,000 frame silence/energy flip-flop stress test', () => {
    let nowTime = 2000000;
    const mockBars = [{ style: {} }, { style: {} }, { style: {} }, { style: {} }];
    let isRestingClass = false;

    const env = {
      Date: { now: () => nowTime },
      console: { log: () => {} },
      isDynamicIslandMode: true,
      isIslandSleeping: false,
      isPlaying: false,
      document: {
        body: { classList: { contains: () => false } },
        getElementById: () => ({
          classList: {
            contains: (c) => c === 'is-resting' ? isRestingClass : false,
            add: (c) => { if (c === 'is-resting') isRestingClass = true; },
            remove: (c) => { if (c === 'is-resting') isRestingClass = false; }
          },
          querySelectorAll: () => mockBars
        })
      },
      settings: {
        wallpaperMode: false,
        wallpaperBeatBloom: false,
        islandVisualizerStyle: 'bars',
        islandVisualizerBars: 4
      },
      lastSpectrumBars: mockBars,
      lastAudioEnergyTimestamp: nowTime,
      isVisualizerResting: false,
      hasLoggedSpectrumTelemetry: true,
      updateIslandEnergyMorph: () => {},
      updateWallpaperLyricBeatBloom: () => {},
      checkVisualizerFallback: () => {}
    };

    vm.runInNewContext(`
      function handleSpectrum(bands) {
        ${listenerBody}
      }
      this.handleSpectrum = handleSpectrum;
    `, env);

    const startTime = Date.now();
    for (let i = 0; i < 5000; i++) {
      nowTime += 20; // 20ms frame tick
      const hasSound = (i % 20) < 10; // 200ms sound, 200ms silence
      const frame = hasSound
        ? [0.2 + Math.random() * 0.5, 0.1 + Math.random() * 0.4, 0.1, 0.05]
        : [0.0, 0.0, 0.0, 0.0];
      env.handleSpectrum(frame);
    }
    const duration = Date.now() - startTime;
    assert.ok(duration < 1500, `Jitter test took too long: ${duration}ms for 5000 frames`);
  });

  // Dynamic Island visualizer dots style transform
  test('R1-STYLE. Dots visualizer style transforms correctly upon silence settling', () => {
    let nowTime = 3000000;
    const mockBars = [{ style: {} }, { style: {} }, { style: {} }, { style: {} }];
    let isRestingClass = false;

    const env = {
      Date: { now: () => nowTime },
      console: { log: () => {} },
      isDynamicIslandMode: true,
      isIslandSleeping: false,
      isPlaying: false,
      document: {
        body: { classList: { contains: () => false } },
        getElementById: () => ({
          classList: {
            contains: (c) => c === 'is-resting' ? isRestingClass : false,
            add: (c) => { if (c === 'is-resting') isRestingClass = true; },
            remove: (c) => { if (c === 'is-resting') isRestingClass = false; }
          },
          querySelectorAll: () => mockBars
        })
      },
      settings: {
        wallpaperMode: false,
        wallpaperBeatBloom: false,
        islandVisualizerStyle: 'dots',
        islandVisualizerBars: 4
      },
      lastSpectrumBars: mockBars,
      lastAudioEnergyTimestamp: nowTime,
      isVisualizerResting: false,
      hasLoggedSpectrumTelemetry: true,
      updateIslandEnergyMorph: () => {},
      updateWallpaperLyricBeatBloom: () => {},
      checkVisualizerFallback: () => {}
    };

    vm.runInNewContext(`
      function handleSpectrum(bands) {
        ${listenerBody}
      }
      this.handleSpectrum = handleSpectrum;
    `, env);

    nowTime += 400; // Exceeds 350ms
    env.handleSpectrum([0.0, 0.0, 0.0, 0.0]);
    assert.strictEqual(mockBars[0].style.transform, 'scale(0.8) translateY(0px)');
  });

  // Additional Adversarial Edge Cases
  test('R4-UNICODE. parseDuetVocalSplit with Arabic, Emoji, and CJK fullwidth brackets', () => {
    const arabic = parseDuetVocalSplit('صوت رئيسي  (صوت خلفي)');
    assert.ok(arabic);
    assert.strictEqual(arabic.leadText, 'صوت رئيسي');
    assert.strictEqual(arabic.duetText, 'صوت خلفي');

    const emoji = parseDuetVocalSplit('Singing loudly 🎵  (Echo 🎶)');
    assert.ok(emoji);
    assert.strictEqual(emoji.leadText, 'Singing loudly 🎵');
    assert.strictEqual(emoji.duetText, 'Echo 🎶');

    const cjk = parseDuetVocalSplit('日本語メイン  （バックコーラス）');
    assert.ok(cjk);
    assert.strictEqual(cjk.leadText, '日本語メイン');
    assert.strictEqual(cjk.duetText, 'バックコーラス');
  });

  test('R4-NESTED. parseDuetVocalSplit fails safely to null on nested brackets without crashing', () => {
    const nested = parseDuetVocalSplit('Lead phrase  (Backing (extra) vocal)');
    assert.strictEqual(nested, null);
  });

  test('R1-MALFORMED. onAudioSpectrum handles malformed, NaN, null, and truncated bands gracefully', () => {
    const mockBars = [{ style: {} }, { style: {} }, { style: {} }, { style: {} }];
    const env = {
      Date: { now: () => 1000 },
      console: { log: () => {} },
      isDynamicIslandMode: true,
      isIslandSleeping: false,
      isPlaying: true,
      document: {
        body: { classList: { contains: () => true } },
        getElementById: () => ({
          classList: { contains: () => false, add: () => {}, remove: () => {} },
          querySelectorAll: () => mockBars
        })
      },
      settings: {
        wallpaperMode: false,
        wallpaperBeatBloom: false,
        islandVisualizerStyle: 'bars',
        islandVisualizerBars: 4
      },
      lastSpectrumBars: mockBars,
      lastAudioEnergyTimestamp: 1000,
      isVisualizerResting: false,
      hasLoggedSpectrumTelemetry: true,
      updateIslandEnergyMorph: () => {},
      updateWallpaperLyricBeatBloom: () => {},
      checkVisualizerFallback: () => {}
    };

    vm.runInNewContext(`
      function handleSpectrum(bands) {
        ${listenerBody}
      }
      this.handleSpectrum = handleSpectrum;
    `, env);

    // Test malformed arrays
    env.handleSpectrum([NaN, null, undefined, -1]);
    env.handleSpectrum([0.1]); // only 1 element when 4 expected
    assert.ok(mockBars[0].style.transform.startsWith('scaleY'));
    env.handleSpectrum([]);
    env.handleSpectrum(null);
    env.handleSpectrum(undefined);
  });

  // Rust WASAPI Audio Pipeline Invariant Verification
  test('R1-RUST-1. WASAPI buffer duration is 500ms (5000000 in 100ns units)', () => {
    const initMatch = audioRsCode.match(/client\.Initialize\([\s\S]*?5000000[\s\S]*?\)/);
    assert.ok(initMatch, 'WASAPI capture must initialize with 5000000 buffer headroom');
  });

  test('R1-RUST-2. AUDCLNT_E_BUFFER_ERROR handled non-fatally in both packet size & buffer fetching', () => {
    const packetErrorMatch = audioRsCode.match(/Err\(ref e\) if e\.code\(\) == AUDCLNT_E_BUFFER_ERROR => 0/);
    assert.ok(packetErrorMatch, 'GetNextPacketSize must recover from AUDCLNT_E_BUFFER_ERROR without fatal reconnect');

    const getBufferErrorMatch = audioRsCode.match(/if e\.code\(\) == AUDCLNT_E_BUFFER_ERROR[\s\S]*?break;/);
    assert.ok(getBufferErrorMatch, 'GetBuffer must handle AUDCLNT_E_BUFFER_ERROR non-fatally');
  });

  test('R1-RUST-3. Fresh COM enumerator lifecycle enforced across all recovery branches', () => {
    // Check start_res failure
    const startFailureMatch = audioRsCode.match(/if start_res\.is_err\(\) \{[\s\S]*?enumerator = None;/);
    assert.ok(startFailureMatch, 'enumerator must be cleared to None on Start() failure');

    // Check should_reconnect branch
    const reconnectMatch = audioRsCode.match(/if should_reconnect \{[\s\S]*?enumerator = None;/);
    assert.ok(reconnectMatch, 'enumerator must be cleared to None on should_reconnect');

    // Check init failure
    const initFailureMatch = audioRsCode.match(/None => \{[\s\S]*?enumerator = None;/);
    assert.ok(initFailureMatch, 'enumerator must be cleared to None on init failure');
  });

  test('R1-RUST-4. Absence of stacked 100ms thread sleeps in silence envelope decay', () => {
    const decayBlock = audioRsCode.match(/if consecutive_silence > 15 \{([\s\S]*?)\n\s*\} else \{/);
    assert.ok(decayBlock, 'Envelope decay block found');
    assert.strictEqual(
      decayBlock[1].includes('sleep'),
      false,
      'Envelope decay branch must NOT contain thread sleep'
    );
  });

  console.log('\n================================================================');
  console.log(`  ADVERSARIAL RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    console.error(`FAILURE SUMMARY (${failedTests} tests failed):`);
    failureDetails.forEach(f => {
      console.error(`- ${f.name}: ${f.error}`);
    });
    process.exit(1);
  }
}

runAdversarialSuite();
