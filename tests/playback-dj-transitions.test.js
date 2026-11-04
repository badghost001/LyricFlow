const assert = require('assert');
const { PlaybackDjEngine } = require('../src/modules/playback-dj-engine.js');

console.log('--- Running Playback DJ Engine & Lyric-Aware Transitions Test Suite ---');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// 1. Lyric Outro Analysis & Contributor Filtering
test('1. analyzeTrackLyrics accurately locates final vocal line and strips credits', () => {
  const engine = new PlaybackDjEngine();

  const mockLyrics = [
    { text: 'First line of the song', timeMs: 10000, durationMs: 3000 },
    { text: 'Second verse rocking out', timeMs: 25000, durationMs: 4000 },
    {
      text: 'Final emotional hook that closes the performance',
      timeMs: 45000,
      durationMs: 5000,
      words: [
        { text: 'Final', start: 45, end: 46 },
        { text: 'performance', start: 48, end: 51.5 }
      ]
    },
    { text: 'Lyrics provided by Musixmatch', timeMs: 55000, durationMs: 3000 },
    { text: 'Written by: John Doe, Jane Smith', timeMs: 58000, durationMs: 3000 }
  ];

  const analysis = engine.analyzeTrackLyrics(mockLyrics);
  assert(analysis.lastVocalLine, 'Must find valid last vocal line');
  assert.strictEqual(analysis.lastVocalLine.text, 'Final emotional hook that closes the performance');
  assert.strictEqual(analysis.lastVocalEndMs, 51500, 'End timestamp must be 51500ms from last word end');
});

// 2. Audio Spectrum Live Energy Tracking & Solo Protection
test('2. recordSpectrumEnergy and isSoloActive detect instrumental breaks & guitar solos', () => {
  const engine = new PlaybackDjEngine({
    settings: { djPreserveSolos: true }
  });

  // Seed with normal verse energy (0.15 average)
  for (let i = 0; i < 20; i++) {
    engine.recordSpectrumEnergy([0.15, 0.20, 0.18, 0.12, 0.14, 0.10, 0.08, 0.05]);
  }

  // Heavy rock guitar solo / beat drop: high spectrum energy
  for (let i = 0; i < 10; i++) {
    engine.recordSpectrumEnergy([0.85, 0.90, 0.78, 0.65, 0.55, 0.45, 0.35, 0.25]);
  }
  assert.strictEqual(engine.isSoloActive(), true, 'Must detect active solo when energy is high');

  // Quiet outro fade / silence:
  for (let i = 0; i < 30; i++) {
    engine.recordSpectrumEnergy([0.01, 0.02, 0.01, 0.01, 0.00, 0.00, 0.00, 0.00]);
  }
  assert.strictEqual(engine.isSoloActive(), false, 'Must release solo protection when energy fades out');
});

// 3. Cosine Equal-Loudness Easing Curve
test('3. getCosineGain follows smooth equal-loudness easing curve', () => {
  assert.strictEqual(PlaybackDjEngine.getCosineGain(0), 1.0, 'Gain at t=0 must be 1.0');
  assert(Math.abs(PlaybackDjEngine.getCosineGain(1)) < 1e-6, 'Gain at t=1 must be 0.0');

  // Midway point
  const midGain = PlaybackDjEngine.getCosineGain(0.5);
  assert(midGain > 0.35 && midGain < 0.45, `Midpoint gain (${midGain}) should align with equal-loudness curve`);
});

// 4. State Machine Transition Evaluation & Solo Hold
test('4. evaluateLyricTransition holds during active solo and triggers on quiet outro', () => {
  const engine = new PlaybackDjEngine({
    settings: {
      djLyricAutoTransition: true,
      djOutroGraceSec: 2.0,
      djFadeDurationSec: 3.0,
      djPreserveSolos: true
    }
  });

  const mockLyrics = [
    { text: 'Main hook', timeMs: 30000, durationMs: 4000, words: [{ text: 'Main', start: 30, end: 32 }, { text: 'hook', start: 32, end: 34 }] }
  ];

  // Outro threshold is lastVocalEnd (34s) + grace (2s) = 36s. Song duration: 50s.

  // Case A: Before threshold arrives (32s)
  const resBefore = engine.evaluateLyricTransition({
    currentTimeMs: 32000,
    durationMs: 50000,
    lyrics: mockLyrics,
    isPlaying: true
  });
  assert.strictEqual(resBefore, null, 'No transition before outro threshold');

  // Case B: Past threshold (38s), but guitar solo is blaring
  for (let i = 0; i < 15; i++) {
    engine.recordSpectrumEnergy([0.70, 0.80, 0.75, 0.60, 0.50, 0.40, 0.30, 0.20]);
  }
  const resSolo = engine.evaluateLyricTransition({
    currentTimeMs: 38000,
    durationMs: 50000,
    lyrics: mockLyrics,
    isPlaying: true
  });
  assert(resSolo && resSolo.status === 'SOLO_ACTIVE', 'Must hold transition with SOLO_ACTIVE');

  // Case C: Past threshold (42s), solo has faded out
  for (let i = 0; i < 25; i++) {
    engine.recordSpectrumEnergy([0.02, 0.01, 0.01, 0.00, 0.00, 0.00, 0.00, 0.00]);
  }
  const resTransition = engine.evaluateLyricTransition({
    currentTimeMs: 42000,
    durationMs: 50000,
    lyrics: mockLyrics,
    isPlaying: true
  });
  assert(resTransition && resTransition.status === 'TRANSITIONING', 'Must trigger TRANSITIONING when outro is quiet');
  assert.strictEqual(resTransition.reason, 'OUTRO_VOCAL_COMPLETED');
});

// 5. Volume Ducking Cancellation Watchdog
test('5. cancelTransition and onSongChanged safely abort fader and restore volume', () => {
  const engine = new PlaybackDjEngine();
  engine.fadeState.isFading = true;
  engine.fadeState.currentVolume = 25;
  engine.fadeState.timerId = setInterval(() => {}, 100);

  engine.cancelTransition();
  assert.strictEqual(engine.fadeState.isFading, false, 'Fading must stop');
  assert.strictEqual(engine.fadeState.timerId, null, 'Timer must be cleared');
  assert.strictEqual(engine.fadeState.currentVolume, 100, 'Volume must restore to 100%');

  // Test onSongChanged resets state
  engine.isTransitionTriggered = true;
  engine.onSongChanged({ title: 'New Track', id: 'spotify:track:123' });
  assert.strictEqual(engine.isTransitionTriggered, false, 'Transition lock must reset for next track');
  assert.strictEqual(engine.currentTrackId, 'spotify:track:123');
});

// 6. Smart Queue Deduplication
test('6. enqueueSmartRecommendation respects deduplication set', async () => {
  const engine = new PlaybackDjEngine({
    settings: { djSmartQueue: true }
  });
  engine.enqueuedTrackUris.add('test-track-id');

  const res = await engine.enqueueSmartRecommendation({
    currentTrack: { id: 'test-track-id', title: 'Already Queued' },
    spotifyToken: 'fake-token'
  });
  assert.strictEqual(res, null, 'Must skip already queued track');
});

// 7. Verify renderer.js uses valid scope variables (no undeclared currentDuration)
test('7. renderer.js playhead integration uses valid trackDuration and no currentDuration', () => {
  const fs = require('fs');
  const path = require('path');
  const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert.strictEqual(rendererCode.includes('currentDuration'), false, 'renderer.js must never reference undeclared currentDuration');
  assert.strictEqual(rendererCode.includes('durationMs: trackDuration'), true, 'renderer.js must pass trackDuration to evaluateLyricTransition');
});

console.log(`\nPlayback DJ Engine Results: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
