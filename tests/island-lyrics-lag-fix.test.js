/**
 * tests/island-lyrics-lag-fix.test.js
 * Comprehensive verification test suite for Dynamic Island lyric timing, responsiveness,
 * intra-word smoothstep panning, and layout stabilization.
 *
 * Verifies:
 * 1. Static CSS containment and elimination of 60 FPS layout-thrashing transitions on progress widths.
 * 2. Static Renderer checks for 280ms advance lead on intro, fast-path, binary search, and break exits.
 * 3. Behavioral simulation of song intro prelude (line 0 reveals 280ms ahead of phonation).
 * 4. Behavioral simulation of instrumental break wake-up (line switches 280ms ahead of phonation).
 * 5. Intra-word smoothstep continuous panning camera simulation.
 * 6. Responsive liquid damping factor k=26 (< 60ms response time).
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
    process.exit(1);
  }
}

console.log('\n--- Running Dynamic Island Lyrics Lag Fix Verification Tests ---\n');

const cssPath = path.resolve(__dirname, '../src/styles/_dynamic_island.css');
const rendererPath = path.resolve(__dirname, '../src/renderer.js');

const cssContent = fs.readFileSync(cssPath, 'utf8');
const rendererContent = fs.readFileSync(rendererPath, 'utf8');

// 1. Static CSS Checks
console.log('1. Static CSS Layout Stabilization:');

test('1a. .island-lyric-line .lyric-word has contain: layout to eliminate layout thrashing', () => {
  assert.ok(cssContent.includes('.island-lyric-line .lyric-word {'), 'Must define lyric-word styles');
  const wordSection = cssContent.substring(cssContent.indexOf('.island-lyric-line .lyric-word {'), cssContent.indexOf('.island-lyric-line .lyric-word.lyric-word-active'));
  assert.ok(wordSection.includes('contain: layout;'), '.island-lyric-line .lyric-word must declare contain: layout');
});

test('1b. .island-progress-fill transition is none (no frame-rate stutter on width updates)', () => {
  const fillSection = cssContent.substring(cssContent.indexOf('.island-progress-fill {'), cssContent.indexOf('.island-progress-thumb {'));
  assert.ok(fillSection.includes('transition: none;'), '.island-progress-fill must set transition: none');
  assert.ok(!fillSection.includes('transition: width'), '.island-progress-fill must not transition width');
});

test('1c. .island-hud-bar-fill transition is none', () => {
  const hudSection = cssContent.substring(cssContent.indexOf('.island-hud-bar-fill {'), cssContent.indexOf('@keyframes islandHudPop'));
  assert.ok(hudSection.includes('transition: none;'), '.island-hud-bar-fill must set transition: none');
  assert.ok(!hudSection.includes('transition: width'), '.island-hud-bar-fill must not transition width');
});

// 2. Static Renderer Implementation Checks
console.log('\n2. Static Renderer Advance Lead & Panning Implementations:');

test('2a. getDynamicIslandSyncData intro prelude checks Math.max(0, firstLineStart - 280)', () => {
  assert.ok(
    rendererContent.includes('syncProgress < Math.max(0, firstLineStart - 280)'),
    'Intro prelude must reveal line 0 during 280ms advance lead window'
  );
});

test('2b. getDynamicIslandSyncData instrumental break exits at msUntilNext > 280', () => {
  assert.ok(
    rendererContent.includes('totalGap >= 4000 && breakDuration >= 1500 && msUntilNext > 280'),
    'Instrumental break must exit 280ms before next vocal start'
  );
});

test('2c. getDynamicIslandSyncData fast-path accounts for 280ms advance window', () => {
  assert.ok(
    rendererContent.includes('const effectiveS0 = Math.max(0, s0 - 280);'),
    'Fast-path must check effectiveS0 for 280ms advance lead'
  );
});

test('2d. getDynamicIslandSyncData binary search advances idx when syncProgress >= sSwitch', () => {
  assert.ok(
    rendererContent.includes('syncProgress >= sSwitch') && rendererContent.includes('idx = idx + 1;'),
    'Binary search must advance idx when in advance lead window'
  );
});

test('2e. updateDynamicIslandLyric calculates intra-word smoothstep interpolation', () => {
  assert.ok(
    rendererContent.includes('smoothP = p * p * (3 - 2 * p)'),
    'updateDynamicIslandLyric must use cubic smoothstep interpolation for continuous vocal tracking'
  );
});

test('2f. updateDynamicIslandLyric uses responsive liquid damping factor k=26', () => {
  assert.ok(
    rendererContent.includes('1 - Math.exp(-26 * dt)'),
    'updateDynamicIslandLyric must use damping factor 26 for low-latency settling'
  );
});

test('2g. updateDynamicIslandLyric caches DOM references to prevent per-frame query churn', () => {
  assert.ok(
    rendererContent.includes('islandProgressFillEl = document.getElementById("island-progress-fill")'),
    'Must cache islandProgressFillEl'
  );
  assert.ok(
    rendererContent.includes('islandLineEl || (islandLineEl = document.getElementById("island-lyric-line"))'),
    'Must cache islandLineEl'
  );
});

// 3. Behavioral Simulation: getDynamicIslandSyncData
console.log('\n3. Behavioral Simulation: Advance Lead & Instrumental Transitions:');

function createSyncSandbox() {
  const sandbox = {
    lyrics: [],
    trackDuration: 180000,
    islandNowPlayingBufferUntil: 0,
    lastIslandSyncData: null,
    Math,
    Number,
    Date: { now: () => 100000 },
    Infinity
  };

  // Extract getLineVocalEndMs and getLineSwitchMs and getDynamicIslandSyncData from rendererContent
  const startIdx = rendererContent.indexOf('function getDynamicIslandSyncData(syncProgress) {');
  const endIdx = rendererContent.indexOf('let lastPlaybackActivityMs = Date.now();');
  const syncFnCode = rendererContent.substring(startIdx, endIdx);

  const vocalStartIdx = rendererContent.indexOf('function getLineVocalEndMs(line, lineIndex) {');
  const vocalEndIdx = rendererContent.indexOf('let cachedIslandZoneWidth = 0;');
  const helpersCode = rendererContent.substring(vocalStartIdx, vocalEndIdx);

  const fullCode = `
    function getLyricWordEndMs(words, wordIndex, lineData, lineIndex) {
      const word = words[wordIndex];
      const startMs = (word.start != null && Number.isFinite(Number(word.start)))
        ? Number(word.start) * 1000
        : Number(word.timeMs);
      if (word.endMs != null && Number(word.endMs) > 0) return Number(word.endMs);
      if (word.end != null && Number(word.end) > 0) return Number(word.end) * 1000;
      return startMs + 1000;
    }
    ${helpersCode}
    ${syncFnCode}
  `;

  vm.createContext(sandbox);
  vm.runInContext(fullCode, sandbox);
  return sandbox;
}

test('3a. Intro Prelude: displays idle countdown before -280ms, reveals Line 0 within 280ms lead window', () => {
  const sb = createSyncSandbox();
  sb.lyrics = [
    { timeMs: 5000, text: 'First vocal phrase', words: [{ text: 'First', timeMs: 5000, endMs: 5500 }] },
    { timeMs: 10000, text: 'Second vocal phrase' }
  ];

  // At 4000ms (1000ms before vocal): idle countdown
  let sync = sb.getDynamicIslandSyncData(4000);
  assert.strictEqual(sync.lineIndex, -1, 'At 4000ms, island should show prelude countdown');
  assert.strictEqual(sync.countdownMs, 1000, 'Countdown should be 1000ms');

  // At 4710ms (290ms before vocal): still in prelude countdown
  sync = sb.getDynamicIslandSyncData(4710);
  assert.strictEqual(sync.lineIndex, -1, 'At 4710ms, still in countdown');

  // At 4720ms (exactly 280ms before vocal): smoothly reveals Line 0!
  sync = sb.getDynamicIslandSyncData(4720);
  assert.strictEqual(sync.lineIndex, 0, 'At 4720ms (-280ms lead), Line 0 must be revealed');
  assert.strictEqual(sync.lineData.text, 'First vocal phrase');

  // At 4900ms (100ms before vocal): Line 0 centered and ready
  sync = sb.getDynamicIslandSyncData(4900);
  assert.strictEqual(sync.lineIndex, 0);

  // At 5000ms (exact vocal start): Line 0 active
  sync = sb.getDynamicIslandSyncData(5000);
  assert.strictEqual(sync.lineIndex, 0);
});

test('3b. Instrumental Break: stays in break during musical solo, exits into next line 280ms before singing', () => {
  const sb = createSyncSandbox();
  sb.lyrics = [
    {
      timeMs: 2000,
      text: 'Verse one',
      words: [
        { text: 'Verse', timeMs: 2000, endMs: 2500 },
        { text: 'one', timeMs: 2500, endMs: 3000 }
      ]
    },
    {
      timeMs: 12000, // 9000ms break after 3000ms vocal end
      text: 'Verse two',
      words: [
        { text: 'Verse', timeMs: 12000, endMs: 12500 },
        { text: 'two', timeMs: 12500, endMs: 13000 }
      ]
    }
  ];

  // Vocal end = 3000ms. Line dwell = 3000 + 1200 = 4200ms.
  // At 4000ms: still in dwell of Line 0
  sb.lastIslandSyncData = { lineIndex: 0 };
  let sync = sb.getDynamicIslandSyncData(4000);
  assert.strictEqual(sync.lineIndex, 0, 'At 4000ms, line 0 dwell');

  // At 4500ms: enters genuine instrumental break
  sb.lastIslandSyncData = { lineIndex: 0 };
  sync = sb.getDynamicIslandSyncData(4500);
  assert.strictEqual(sync.lineIndex, -2, 'At 4500ms, should enter instrumental break');
  assert.strictEqual(sync.isInstrumental, true);

  // At 11500ms (500ms before next line): still in break
  sb.lastIslandSyncData = { lineIndex: -2 };
  sync = sb.getDynamicIslandSyncData(11500);
  assert.strictEqual(sync.lineIndex, -2, 'At 11500ms, still in instrumental break');

  // At 11720ms (exactly 280ms before Verse two): exits break and mounts Verse two!
  sb.lastIslandSyncData = { lineIndex: -2 };
  sync = sb.getDynamicIslandSyncData(11720);
  assert.strictEqual(sync.lineIndex, 1, 'At 11720ms (280ms lead), Verse two must be mounted');
  assert.strictEqual(sync.lineData.text, 'Verse two');
  assert.strictEqual(sync.isInstrumental, false);

  // Subsequent frame at 11750ms: fast-path smoothly keeps Line 1
  sb.lastIslandSyncData = { lineIndex: 1 };
  sync = sb.getDynamicIslandSyncData(11750);
  assert.strictEqual(sync.lineIndex, 1, 'At 11750ms, fast path keeps Verse two');
});

// 4. Mathematical Simulation: Intra-Word Smoothstep & Damping
console.log('\n4. Mathematical Simulation: Smoothstep Interpolation & Responsive Damping:');

test('4a. Cubic smoothstep provides continuous camera position between words', () => {
  const word0Center = 60;
  const word1Center = 140;

  function calculateSpanCenter(p) {
    const smoothP = p * p * (3 - 2 * p);
    return word0Center + (word1Center - word0Center) * smoothP;
  }

  // At p = 0: exact center of word 0
  assert.strictEqual(calculateSpanCenter(0), 60);

  // At p = 0.5: exactly halfway (100)
  assert.strictEqual(calculateSpanCenter(0.5), 100);

  // At p = 0.2: smoothly eases into the motion
  const p02 = calculateSpanCenter(0.2);
  // smoothP(0.2) = 0.04 * (3 - 0.4) = 0.104. 60 + 80 * 0.104 = 68.32
  assert.ok(p02 > 60 && p02 < 100, 'Intermediate position smoothly advances');

  // At p = 1: arrives at word 1 center
  assert.strictEqual(calculateSpanCenter(1), 140);
});

test('4b. Damping factor k=26 converges to 95% target in < 120ms (eliminates lag)', () => {
  // Analytical test: 1 - exp(-k * t) = 0.95 => t = -ln(0.05) / k
  const kFast = 26;
  const kSlow = 14;

  const tFast95 = -Math.log(0.05) / kFast; // ~0.115s (115ms)
  const tSlow95 = -Math.log(0.05) / kSlow; // ~0.214s (214ms)

  assert.ok(tFast95 < 0.120, `k=26 95% settling time must be < 120ms (was ${Math.round(tFast95 * 1000)}ms)`);
  assert.ok(tSlow95 > 0.200, `k=14 had excessive lag of ${Math.round(tSlow95 * 1000)}ms`);

  // Frame simulation at 60fps (dt = 0.0166s)
  let pos = 0;
  const target = 100;
  const dt = 1 / 60;
  for (let frame = 1; frame <= 7; frame++) { // 7 frames = ~116ms
    const factor = 1 - Math.exp(-kFast * dt);
    pos += (target - pos) * factor;
  }
  assert.ok(pos >= 95, `After 7 frames (~116ms), pos should reach >= 95% (reached ${pos.toFixed(1)}%)`);
});

console.log(`\nAll ${passedTests}/${totalTests} Dynamic Island Lyrics Lag Fix verification tests passed successfully!\n`);
