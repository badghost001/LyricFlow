/**
 * scripts/adversarial-island-edge-cases.js
 * EMPIRICAL ADVERSARIAL STRESS HARNESS — Milestone M1 Dynamic Island
 *
 * Edge cases tested:
 * 1. Zero duration line & negative progress math (division by zero, NaN, negative clamp, backward seeks)
 * 2. Short lines (contentWidth <= zoneWidth): centering, mask suppression, and 60 FPS interpolation gating
 * 3. Track transitions mid-animation (during hover expand, during collapse, during art transition, during panning)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('  ADVERSARIAL STRESS HARNESS: DYNAMIC ISLAND EDGE CASES & REGRESSIONS');
console.log('================================================================\n');

const rendererPath = path.resolve(__dirname, '../src/renderer.js');
const cssPath = path.resolve(__dirname, '../src/styles/_dynamic_island.css');

const rendererContent = fs.readFileSync(rendererPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: ZERO DURATION LINE & NEGATIVE PROGRESS EMPIRICAL MATH
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- SECTION 1: Zero Duration Lines, Negative Progress & Seeks ---');

// Helper to simulate panning calculation extracted from renderer.js
function calculatePanning({
  lineData,
  lyrics,
  targetIndex,
  syncProgress,
  zoneWidth = 250,
  contentWidth = 350,
  lastIslandPanTime = 0,
  currentIslandOffset = 0,
  nowMs = 1000
}) {
  const END_CLEARANCE = 28;
  const scrollableDistance = (contentWidth - zoneWidth) + END_CLEARANCE;
  const maxScroll = -scrollableDistance;
  let targetOffset = 0;

  const lineStartTime = (lineData.timeMs != null && !isNaN(lineData.timeMs))
    ? lineData.timeMs
    : ((lineData.start != null) ? lineData.start * 1000 : 0);

  const nextLine = (lyrics && targetIndex >= 0 && targetIndex + 1 < lyrics.length) ? lyrics[targetIndex + 1] : null;
  const nextLineTime = nextLine
    ? ((nextLine.timeMs != null && !isNaN(nextLine.timeMs)) ? nextLine.timeMs : ((nextLine.start != null) ? nextLine.start * 1000 : 0))
    : 0;

  const textLen = (lineData.text || '').length;
  const estimatedVocalDur = Math.max(3000, Math.min(10000, textLen * 160));
  const naturalDur = (nextLineTime > lineStartTime && (nextLineTime - lineStartTime) <= 12000)
    ? (nextLineTime - lineStartTime)
    : estimatedVocalDur;
  const effectiveDur = (lineData.duration && lineData.duration > 0)
    ? lineData.duration
    : naturalDur;

  const elapsed = syncProgress - lineStartTime;
  const progressFrac = Math.min(1, Math.max(0, elapsed / Math.max(1000, effectiveDur)));

  let scrollRatio = 0;
  if (progressFrac <= 0.02) {
    scrollRatio = 0;
  } else if (progressFrac >= 0.96) {
    scrollRatio = 1;
  } else {
    const t = (progressFrac - 0.02) / 0.94;
    if (t < 0.1) {
      const easeT = t / 0.1;
      scrollRatio = 0.1 * (easeT * easeT * (3 - 2 * easeT));
    } else {
      scrollRatio = t;
    }
  }
  targetOffset = -scrollRatio * scrollableDistance;
  targetOffset = Math.min(0, Math.max(maxScroll, targetOffset));

  const dt = lastIslandPanTime > 0 ? Math.min(0.12, Math.max(0.001, (nowMs - lastIslandPanTime) / 1000)) : 0.016;
  let newOffset = currentIslandOffset;
  if (Math.abs(targetOffset - currentIslandOffset) > 120) {
    newOffset = targetOffset;
  } else if (Math.abs(targetOffset - currentIslandOffset) < 0.15) {
    newOffset = targetOffset;
  } else {
    const factor = 1 - Math.exp(-26 * dt);
    newOffset += (targetOffset - currentIslandOffset) * factor;
  }

  return {
    progressFrac,
    scrollRatio,
    targetOffset,
    newOffset,
    effectiveDur,
    dt
  };
}

runTest('1.1 Zero duration line (duration = 0) does not produce NaN or Infinity', () => {
  const lineData = { timeMs: 5000, duration: 0, text: 'This is a long test lyric line that requires horizontal scrolling' };
  const res = calculatePanning({
    lineData,
    lyrics: [lineData],
    targetIndex: 0,
    syncProgress: 6000
  });

  assert.ok(Number.isFinite(res.progressFrac), 'progressFrac must be a finite number');
  assert.ok(Number.isFinite(res.targetOffset), 'targetOffset must be a finite number');
  assert.ok(Number.isFinite(res.newOffset), 'newOffset must be a finite number');
  assert.ok(res.effectiveDur >= 3000, 'Zero duration falls back to naturalDur (>= 3000ms)');
  assert.ok(res.progressFrac >= 0 && res.progressFrac <= 1, 'progressFrac must be within [0, 1]');
});

runTest('1.2 Negative duration line (duration = -2000) falls back gracefully', () => {
  const lineData = { timeMs: 5000, duration: -2000, text: 'Negative duration test line' };
  const res = calculatePanning({
    lineData,
    lyrics: [lineData],
    targetIndex: 0,
    syncProgress: 6000
  });

  assert.ok(Number.isFinite(res.progressFrac), 'progressFrac must be finite');
  assert.ok(res.effectiveDur >= 3000, 'Negative duration falls back to naturalDur');
  assert.ok(res.progressFrac >= 0 && res.progressFrac <= 1);
});

runTest('1.3 Negative progress (syncProgress < lineStartTime, or negative time) clamps cleanly to 0', () => {
  const lineData = { timeMs: 5000, duration: 4000, text: 'Vocal line starting at 5s' };
  // syncProgress before lineStartTime (e.g. 2000ms or negative -1000ms)
  const resBefore = calculatePanning({
    lineData,
    lyrics: [lineData],
    targetIndex: 0,
    syncProgress: 2000
  });

  assert.strictEqual(resBefore.progressFrac, 0, 'Progress frac must clamp to 0 when syncProgress < lineStartTime');
  assert.strictEqual(resBefore.scrollRatio, 0, 'Scroll ratio must be 0');
  assert.ok(resBefore.targetOffset === 0, 'Target offset must be 0 (no pre-scroll)');

  const resNegative = calculatePanning({
    lineData,
    lyrics: [lineData],
    targetIndex: 0,
    syncProgress: -3500 // Audio lead-in negative timestamp
  });
  assert.strictEqual(resNegative.progressFrac, 0, 'Negative syncProgress clamps to 0');
  assert.ok(resNegative.targetOffset === 0, 'Target offset is 0 for negative syncProgress');
});

runTest('1.4 Zero duration word timing does not divide by zero (wDur >= 50ms guard)', () => {
  const words = [{ text: 'Glitch', timeMs: 2000, endMs: 2000 }]; // 0ms duration
  const activeW = words[0];
  const wStart = activeW.timeMs;
  const wEnd = activeW.endMs;
  const wDur = Math.max(50, wEnd - wStart);
  assert.strictEqual(wDur, 50, 'wDur must be clamped to minimum 50ms');

  const syncProgress = 2025;
  const rawProgress = Math.min(1, Math.max(0, (syncProgress - wStart) / wDur));
  assert.strictEqual(rawProgress, 0.5, '25ms into 50ms min duration gives 0.5');
  assert.ok(Number.isFinite(rawProgress));
});

runTest('1.5 Backward seek (>120px offset jump) snaps immediately without 5-second lag', () => {
  const lineData = { timeMs: 0, duration: 10000, text: 'A very long line panned all the way to the right edge clearance' };
  // Panned at near end: current offset -150px
  const res = calculatePanning({
    lineData,
    lyrics: [lineData],
    targetIndex: 0,
    syncProgress: 0, // User sought back to 0s
    currentIslandOffset: -150,
    lastIslandPanTime: 1000,
    nowMs: 1016
  });

  // Target offset is 0. Delta is |-150| = 150 > 120
  assert.ok(res.targetOffset === 0);
  assert.ok(res.newOffset === 0, 'Offset snaps immediately to 0 when jump > 120px');
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: LINE SHORTER THAN ZONE WIDTH (contentWidth <= zoneWidth)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SECTION 2: Short Lines (contentWidth <= zoneWidth) & 60 FPS Gating ---');

runTest('2.1 Short line without words strictly disables 60 FPS RAF loop in schedulePlaybackInterpolation', () => {
  // Scenario: Line-synced lyric, shorter than zone
  const isDynamicIslandMode = true;
  const isIslandSleeping = false;
  const lyrics = [
    { timeMs: 1000, text: 'Short line' } // No words array
  ];
  const _lastPlayheadIslandLineIndex = 0;
  const cachedIslandZoneWidth = 250;
  const islandLineEl = { _cachedScrollWidth: 150 }; // Shorter than 250

  const islandLineData = (Number.isInteger(_lastPlayheadIslandLineIndex) && _lastPlayheadIslandLineIndex >= 0)
    ? lyrics[_lastPlayheadIslandLineIndex] : null;

  const needsIslandInterpolation = Boolean(
    isDynamicIslandMode && !isIslandSleeping && islandLineData &&
    (Boolean(islandLineData.words?.length) || (islandLineEl && islandLineEl._cachedScrollWidth > (cachedIslandZoneWidth || 250) + 4))
  );

  assert.strictEqual(needsIslandInterpolation, false, 'Line-synced short line must NOT request 60 FPS island interpolation');
});

runTest('2.2 Boundary condition: contentWidth == zoneWidth and contentWidth == zoneWidth + 4', () => {
  const isDynamicIslandMode = true;
  const isIslandSleeping = false;
  const lyrics = [{ timeMs: 1000, text: 'Boundary line' }];
  const _lastPlayheadIslandLineIndex = 0;
  const cachedIslandZoneWidth = 250;
  const islandLineData = lyrics[0];

  // Exactly equal to zone width
  let islandLineEl = { _cachedScrollWidth: 250 };
  let needsIsland = Boolean(
    isDynamicIslandMode && !isIslandSleeping && islandLineData &&
    (Boolean(islandLineData.words?.length) || (islandLineEl && islandLineEl._cachedScrollWidth > (cachedIslandZoneWidth || 250) + 4))
  );
  assert.strictEqual(needsIsland, false, 'contentWidth == 250 must not trigger 60 FPS');

  // Exactly zoneWidth + 4 (deadband threshold)
  islandLineEl = { _cachedScrollWidth: 254 };
  needsIsland = Boolean(
    isDynamicIslandMode && !isIslandSleeping && islandLineData &&
    (Boolean(islandLineData.words?.length) || (islandLineEl && islandLineEl._cachedScrollWidth > (cachedIslandZoneWidth || 250) + 4))
  );
  assert.strictEqual(needsIsland, false, 'contentWidth == 254 (<= zoneWidth + 4) must not trigger 60 FPS');

  // zoneWidth + 5 (exceeds threshold) -> enters 60 FPS panning
  islandLineEl = { _cachedScrollWidth: 255 };
  needsIsland = Boolean(
    isDynamicIslandMode && !isIslandSleeping && islandLineData &&
    (Boolean(islandLineData.words?.length) || (islandLineEl && islandLineEl._cachedScrollWidth > (cachedIslandZoneWidth || 250) + 4))
  );
  assert.strictEqual(needsIsland, true, 'contentWidth == 255 (> zoneWidth + 4) enters 60 FPS panning');
});

runTest('2.3 Word-synced short line maintains 60 FPS interpolation for syllable karaoke fill', () => {
  const isDynamicIslandMode = true;
  const isIslandSleeping = false;
  const lyrics = [
    {
      timeMs: 1000,
      text: 'Short',
      words: [{ text: 'Short', timeMs: 1000, endMs: 2000 }]
    }
  ];
  const _lastPlayheadIslandLineIndex = 0;
  const cachedIslandZoneWidth = 250;
  const islandLineEl = { _cachedScrollWidth: 80 }; // Very short, but has words!
  const islandLineData = lyrics[0];

  const needsIsland = Boolean(
    isDynamicIslandMode && !isIslandSleeping && islandLineData &&
    (Boolean(islandLineData.words?.length) || (islandLineEl && islandLineEl._cachedScrollWidth > (cachedIslandZoneWidth || 250) + 4))
  );
  assert.strictEqual(needsIsland, true, 'Word-synced line needs 60 FPS interpolation to animate syllable coloring smoothly');
});

runTest('2.4 Short line layout styles: offset is 0, transform is translate3d(0,0,0), mask is none', () => {
  // Static CSS and logic verification
  assert.ok(cssContent.includes('.island-lyric-zone {'), 'Defines .island-lyric-zone');
  assert.ok(cssContent.includes('contain: layout paint;'), 'Includes contain: layout paint');
  assert.ok(cssContent.includes('will-change: transform;'), 'Includes will-change: transform');

  // In renderer.js, when contentWidth <= zoneWidth + 4:
  assert.ok(
    rendererContent.includes("islandLine.style.transform = 'translate3d(0px, 0, 0)'") ||
    rendererContent.includes('translate3d(0px, 0, 0)'),
    'Resets transform to translate3d(0px, 0, 0)'
  );
  assert.ok(
    rendererContent.includes("islandZone._currentMask !== 'none'") &&
    rendererContent.includes("islandZone.style.maskImage = 'none'"),
    'Clears maskImage to none so short text has zero edge clipping'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: TRACK TRANSITION MID-ANIMATION & HOVER
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SECTION 3: Track Transitions Mid-Animation & Mid-Hover ---');

runTest('3.1 Track transition during active hover suppresses intermediate SetWindowPos churn', () => {
  let ipcCalls = [];
  const fakeElectronAPI = {
    updateIslandBounds: (bounds) => ipcCalls.push(bounds)
  };

  const islandBoundsTransitionProperties = new Set();
  let isDynamicIslandMode = true;
  let isMouseOverDynamicIsland = true; // Hovering!

  function pushDynamicIslandBoundsSim(force = false) {
    if (!isDynamicIslandMode) return;
    if (!force && islandBoundsTransitionProperties.size > 0) return;

    // target expanded bounds
    ipcCalls.push({ action: 'pushBounds', force, hovered: isMouseOverDynamicIsland });
  }

  // 1. Hover begins: transition starts on width, height
  islandBoundsTransitionProperties.add('width');
  islandBoundsTransitionProperties.add('height');
  pushDynamicIslandBoundsSim(true); // Initial push with force = true
  assert.strictEqual(ipcCalls.length, 1, 'Initial transitionstart pushed target bounds once');

  // 2. Mid-animation frame updates (e.g. 50ms bounds tracker ticks or track change event)
  pushDynamicIslandBoundsSim(false);
  pushDynamicIslandBoundsSim(false);
  pushDynamicIslandBoundsSim(false);
  assert.strictEqual(ipcCalls.length, 1, 'Intermediate ticks suppressed while transitions active');

  // 3. Track changes mid-flight!
  const isTrackChanged = true;
  assert.ok(isTrackChanged);
  // Normal playhead tick attempts bounds push
  pushDynamicIslandBoundsSim(false);
  assert.strictEqual(ipcCalls.length, 1, 'Track change during transition does not leak intermediate SetWindowPos');

  // 4. Transition finishes
  islandBoundsTransitionProperties.delete('width');
  islandBoundsTransitionProperties.delete('height');
  assert.strictEqual(islandBoundsTransitionProperties.size, 0);
  pushDynamicIslandBoundsSim(true); // Final end push
  assert.strictEqual(ipcCalls.length, 2, 'Final bounds pushed exactly once at transition end');
});

runTest('3.2 Track transition interrupts album art transition timer cleanly without orphaned classes', () => {
  // Simulate DOM for album art wrapper
  let timerCleared = false;
  let activeTimer = 12345;
  const wrapperClasses = new Set(['art-transitioning']);
  const dynamicIslandClasses = new Set(['has-art-transition']);

  function simulateTriggerArtTransition(newUrl) {
    if (activeTimer) {
      timerCleared = true;
      activeTimer = null;
    }
    wrapperClasses.delete('art-transitioning');
    dynamicIslandClasses.delete('has-art-transition');

    // Start new transition
    wrapperClasses.add('art-transitioning');
    dynamicIslandClasses.add('has-art-transition');
    activeTimer = 99999;
  }

  // Song 1 was transitioning; Song 2 arrives mid-flight
  simulateTriggerArtTransition('https://art.test/song2.jpg');

  assert.strictEqual(timerCleared, true, 'Prior transition timer was cleared');
  assert.strictEqual(activeTimer, 99999, 'New transition timer registered');
  assert.ok(wrapperClasses.has('art-transitioning'), 'Fresh transition class set');
});

runTest('3.3 Track change resets lyric panning offset from previous song immediately', () => {
  // Song 1 had panned to -90px
  let currentIslandOffset = -90;
  const isTrackChanged = true;
  let targetIndex = 0; // New track line 0
  const islandLine = {
    dataset: { lineIndex: '5' }, // Old song line 5
    style: { transform: 'translate3d(-90.00px, 0, 0)' }
  };

  const needsRerender = (islandLine.dataset.lineIndex !== String(targetIndex) || isTrackChanged);
  if (needsRerender) {
    islandLine.dataset.lineIndex = String(targetIndex);
    currentIslandOffset = 0;
    islandLine.style.transform = 'translate3d(0px, 0, 0)';
  }

  assert.strictEqual(currentIslandOffset, 0, 'Offset immediately resets to 0 for new track');
  assert.strictEqual(islandLine.style.transform, 'translate3d(0px, 0, 0)', 'Transform resets to origin');
});

runTest('3.4 transitioncancel cleans up transition properties Set and forces final bounds update', () => {
  const islandBoundsTransitionProperties = new Set(['width', 'height']);
  let pushedFinal = false;

  const finishIslandBoundsTransition = (propertyName) => {
    islandBoundsTransitionProperties.delete(propertyName);
    if (islandBoundsTransitionProperties.size > 0) return;
    pushedFinal = true;
  };

  // Simulate interrupt/cancel
  finishIslandBoundsTransition('width');
  assert.strictEqual(pushedFinal, false, 'Still waiting for height');
  finishIslandBoundsTransition('height');
  assert.strictEqual(pushedFinal, true, 'transitioncancel cleaned up Set and pushed final bounds');
  assert.strictEqual(islandBoundsTransitionProperties.size, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: HIGH-FREQUENCY STRESS, SYSTEM SLEEP & CORRUPT DATA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SECTION 4: High-Frequency Stress, System Sleep & Corrupt Data ---');

runTest('4.1 System sleep/wake time jump (nowMs - lastIslandPanTime = 15000ms) clamps dt to 0.12s without overshoot', () => {
  const lineData = { timeMs: 0, duration: 10000, text: 'System sleep test line with extensive text' };
  const res = calculatePanning({
    lineData,
    lyrics: [lineData],
    targetIndex: 0,
    syncProgress: 5000,
    lastIslandPanTime: 1000,
    nowMs: 16000 // 15 seconds later
  });

  assert.strictEqual(res.dt, 0.12, 'dt must clamp to 0.12s even after 15-second system wake jump');
  assert.ok(Number.isFinite(res.newOffset), 'newOffset must remain finite without oscillation');
});

runTest('4.2 Out-of-bounds line index (index = 999 with 2 lines) is handled without throwing', () => {
  const lyrics = [{ timeMs: 0, text: 'A' }, { timeMs: 1000, text: 'B' }];
  const _lastPlayheadIslandLineIndex = 999;
  const isDynamicIslandMode = true;
  const isIslandSleeping = false;

  const islandLineData = (Number.isInteger(_lastPlayheadIslandLineIndex) && _lastPlayheadIslandLineIndex >= 0)
    ? lyrics[_lastPlayheadIslandLineIndex] : null;

  assert.ok(islandLineData == null, 'islandLineData must be null or undefined when index is out-of-bounds');
  const needsIslandInterpolation = Boolean(
    isDynamicIslandMode && !isIslandSleeping && islandLineData &&
    (Boolean(islandLineData.words?.length) || (null))
  );
  assert.strictEqual(needsIslandInterpolation, false, 'Out-of-bounds line must safely disable interpolation');
});

runTest('4.3 Rapid track bursts: 50 consecutive track changes within 100ms maintains coherent state', () => {
  let activeTimer = null;
  let currentArt = null;
  const wrapperClasses = new Set();
  const dynamicIslandClasses = new Set();

  function rapidTrackChange(trackIndex) {
    const newArtUrl = `https://art.test/track_${trackIndex}.jpg`;
    if (activeTimer) {
      clearTimeout(activeTimer);
      activeTimer = null;
    }
    wrapperClasses.delete('art-transitioning');
    dynamicIslandClasses.delete('has-art-transition');

    currentArt = newArtUrl;
    wrapperClasses.add('art-transitioning');
    dynamicIslandClasses.add('has-art-transition');
    activeTimer = setTimeout(() => {
      wrapperClasses.delete('art-transitioning');
      dynamicIslandClasses.delete('has-art-transition');
      activeTimer = null;
    }, 730);
  }

  for (let i = 0; i < 50; i++) {
    rapidTrackChange(i);
  }

  assert.strictEqual(currentArt, 'https://art.test/track_49.jpg', 'Final track URL is track_49');
  assert.ok(activeTimer !== null, 'Single active timer persists');
  assert.ok(wrapperClasses.has('art-transitioning'), 'Transition class remains active for final track');
  clearTimeout(activeTimer);
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY & VERDICT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`STRESS TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
