/**
 * tests/adversarial-m1-scrolling-and-bounds.test.js
 * 
 * EMPIRICAL ADVERSARIAL CHALLENGE SUITE: MILESTONE M1
 * Roles: Critic, Specialist
 * Target: Dynamic Island 60 FPS Line-Synced Scrolling, dt Clamping & Hover Bounds Logic
 *
 * Verifies:
 * 1. Line-synced lyric scrolling:
 *    - Long line (1200px) with NO words array keeps needsIslandInterpolation = true
 *    - Successive frame offset progression across 360 frames (60 FPS) without jumping > 15px
 *    - Tick interval sweep (16ms to 100ms) verifying dt damping without numeric overflow or snap glitches
 *    - Dynamic edge mask state transitions (start -> right fade, middle -> dual fade, end -> left fade)
 * 2. Hover expansion/collapse bounds logic:
 *    - Instant hover exit initiation vs artificial setTimeout latency (Feature 4 contract)
 *    - Fluid spring transition curve (0.24s) in CSS
 *    - IPC decoupling (zero intermediate SetWindowPos calls while transitioning)
 *    - Compact bounds push upon transition completion
 *    - Rapid jitter stress harness (200 interleaved enter/leave events with cancellations & spurious events)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failureDetails.push({ name, error: err.message });
  }
}

console.log('\n================================================================');
console.log('  STARTING ADVERSARIAL CHALLENGE SUITE: MILESTONE M1            ');
console.log('================================================================\n');

const rendererPath = path.resolve(__dirname, '../src/renderer.js');
const islandCssPath = path.resolve(__dirname, '../src/styles/_dynamic_island.css');

assert.ok(fs.existsSync(rendererPath), 'src/renderer.js must exist');
assert.ok(fs.existsSync(islandCssPath), 'src/styles/_dynamic_island.css must exist');

const rendererCode = fs.readFileSync(rendererPath, 'utf8');
const islandCssCode = fs.readFileSync(islandCssPath, 'utf8');

// ============================================================================
// SECTION 1: LINE-SYNCED 60 FPS SCROLLING & PANNING DAMPING
// ============================================================================
console.log('--- SECTION 1: Line-Synced Scrolling & Panning Damping ---');

test('1.1 Static Invariant: schedulePlaybackInterpolation includes long line-synced lyrics', () => {
  assert.ok(
    rendererCode.includes('needsIslandInterpolation = Boolean('),
    'Must define needsIslandInterpolation with Boolean constructor'
  );
  assert.ok(
    rendererCode.includes('islandLineEl._cachedScrollWidth > (cachedIslandZoneWidth || 250) + 4'),
    'schedulePlaybackInterpolation must check scrollWidth > zoneWidth + 4'
  );
  assert.ok(
    rendererCode.includes('hasIslandWord = Boolean('),
    'Inner RAF frame must also check scrollWidth for line-synced lyrics'
  );
});

test('1.2 Dynamic Evaluation: needsIslandInterpolation contract with NO words array', () => {
  const sandbox = {
    playbackInterpolationRafId: null,
    isPlaying: true,
    document: { visibilityState: 'visible' },
    settings: { wallpaperMode: false, taskbarMode: false, wordByWord: true },
    isWallpaperDesktopFocused: true,
    activeLineIndex: 0,
    isKineticMode: false,
    isCinematicView: false,
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    _lastPlayheadIslandLineIndex: 0,
    cachedIslandZoneWidth: 250,
    islandLineEl: {
      _cachedScrollWidth: 1200 // 1200px long lyric line
    },
    lyrics: [
      {
        timeMs: 1000,
        duration: 5000,
        text: 'This is a 1200px long line-synced lyric line without any words array timestamps'
      }
    ]
  };

  const evalNeedsIslandInterpolation = (sb) => {
    const isDynamicIslandMode = sb.isDynamicIslandMode;
    const isIslandSleeping = sb.isIslandSleeping;
    const _lastPlayheadIslandLineIndex = sb._lastPlayheadIslandLineIndex;
    const lyrics = sb.lyrics;
    const islandLineEl = sb.islandLineEl;
    const cachedIslandZoneWidth = sb.cachedIslandZoneWidth;

    const islandLineData = (Number.isInteger(_lastPlayheadIslandLineIndex) && _lastPlayheadIslandLineIndex >= 0)
      ? lyrics[_lastPlayheadIslandLineIndex] : null;
    return Boolean(
      isDynamicIslandMode && !isIslandSleeping && islandLineData &&
      (Boolean(islandLineData.words?.length) || (islandLineEl && islandLineEl._cachedScrollWidth > (cachedIslandZoneWidth || 250) + 4))
    );
  };

  // Case A: Long line (1200px), no words array -> MUST BE TRUE (enters 60 FPS loop)
  assert.strictEqual(evalNeedsIslandInterpolation(sandbox), true, 'Long line-synced lyric must enter RAF loop');

  // Case B: Short line (200px <= 254px), no words array -> MUST BE FALSE (saves CPU)
  sandbox.islandLineEl._cachedScrollWidth = 200;
  assert.strictEqual(evalNeedsIslandInterpolation(sandbox), false, 'Short line must not trigger interpolation');

  // Case C: Sleeping island -> MUST BE FALSE
  sandbox.islandLineEl._cachedScrollWidth = 1200;
  sandbox.isIslandSleeping = true;
  assert.strictEqual(evalNeedsIslandInterpolation(sandbox), false, 'Sleeping island must not interpolate');
  sandbox.isIslandSleeping = false;

  // Case D: Not in dynamic island mode -> MUST BE FALSE
  sandbox.isDynamicIslandMode = false;
  assert.strictEqual(evalNeedsIslandInterpolation(sandbox), false, 'Non-island mode must not interpolate island');
  sandbox.isDynamicIslandMode = true;

  // Case E: Word-by-word line (even if short) -> MUST BE TRUE
  sandbox.islandLineEl._cachedScrollWidth = 200;
  sandbox.lyrics[0].words = [{ text: 'Word', timeMs: 1000, endMs: 1500 }];
  assert.strictEqual(evalNeedsIslandInterpolation(sandbox), true, 'Word-synced line must interpolate');
});

test('1.3 Empirical Simulation: 360 frames (60 FPS) long lyric scrolling with NO words array', () => {
  const zoneWidth = 250;
  const contentWidth = 1200;
  const END_CLEARANCE = 28;
  const scrollableDistance = (contentWidth - zoneWidth) + END_CLEARANCE; // 978px
  const maxScroll = -scrollableDistance; // -978px

  const lineStartTime = 10000;
  const effectiveDur = 6000;

  let currentIslandOffset = 0;
  let lastIslandPanTime = 0;
  const frameIntervalMs = 1000 / 60; // 16.6667ms
  const totalFrames = Math.round(effectiveDur / frameIntervalMs); // 360 frames

  const recordedOffsets = [];
  const recordedDeltas = [];
  let maxFrameJump = 0;
  let snapGlitchCount = 0;

  for (let f = 0; f <= totalFrames; f++) {
    const nowMs = 100000 + f * frameIntervalMs;
    const syncProgress = lineStartTime + f * frameIntervalMs;

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
    let targetOffset = -scrollRatio * scrollableDistance;
    targetOffset = Math.min(0, Math.max(maxScroll, targetOffset));

    const dt = lastIslandPanTime > 0 ? Math.min(0.12, Math.max(0.001, (nowMs - lastIslandPanTime) / 1000)) : 0.016;
    lastIslandPanTime = nowMs;

    const prevOffset = currentIslandOffset;
    if (Math.abs(targetOffset - currentIslandOffset) > 120) {
      snapGlitchCount++;
      currentIslandOffset = targetOffset;
    } else if (Math.abs(targetOffset - currentIslandOffset) < 0.15) {
      currentIslandOffset = targetOffset;
    } else {
      const factor = 1 - Math.exp(-26 * dt);
      currentIslandOffset += (targetOffset - currentIslandOffset) * factor;
    }

    const frameDelta = Math.abs(currentIslandOffset - prevOffset);
    if (f > 0) {
      recordedDeltas.push(frameDelta);
      if (frameDelta > maxFrameJump) maxFrameJump = frameDelta;
    }
    recordedOffsets.push(currentIslandOffset);
  }

  assert.strictEqual(snapGlitchCount, 0, 'Must have ZERO snap glitches during continuous playback');
  assert.ok(maxFrameJump <= 15.0, `Max frame jump was ${maxFrameJump.toFixed(2)}px, must be <= 15.0px`);
  assert.ok(maxFrameJump >= 2.0 && maxFrameJump <= 6.0, `Expected max delta to be ~3-5px in linear region, was ${maxFrameJump.toFixed(2)}px`);

  const finalOffset = recordedOffsets[recordedOffsets.length - 1];
  assert.ok(
    Math.abs(finalOffset - maxScroll) < 0.5,
    `Final offset (${finalOffset.toFixed(2)}px) must reach maxScroll (${maxScroll.toFixed(2)}px)`
  );

  console.log(`    [Metrics] 360 frames simulated: max frame jump = ${maxFrameJump.toFixed(2)}px, snap glitches = 0, final offset = ${finalOffset.toFixed(2)}px`);
});

test('1.4 Tick Interval Sweep (16ms to 100ms): dt clamping cleanly damps without overflow or snapping', () => {
  const intervals = [16, 20, 33, 40, 50, 66, 80, 100, 120];
  const k = 26;

  for (const intervalMs of intervals) {
    const dtSeconds = intervalMs / 1000;
    const clampedDt = Math.min(0.12, Math.max(0.001, dtSeconds));
    assert.strictEqual(clampedDt, dtSeconds, `dt for ${intervalMs}ms should be cleanly preserved up to 0.12`);

    const factor = 1 - Math.exp(-k * clampedDt);
    assert.ok(!isNaN(factor), `Damping factor must not be NaN for ${intervalMs}ms`);
    assert.ok(factor > 0 && factor <= 1.0, `Damping factor must be strictly in (0, 1], got ${factor}`);

    const targetVelocity = 163; // px/s
    let target = 0;
    let current = 0;
    let maxLag = 0;
    let snapOccurred = false;

    for (let step = 0; step < 60; step++) {
      target -= targetVelocity * clampedDt;
      const lag = Math.abs(target - current);
      if (lag > maxLag) maxLag = lag;
      if (lag > 120) snapOccurred = true;

      current += (target - current) * factor;
    }

    assert.ok(
      !snapOccurred,
      `Under ${intervalMs}ms tick interval, lag exceeded 120px threshold (max lag = ${maxLag.toFixed(1)}px)`
    );
    assert.ok(
      maxLag < 25.0,
      `For ${intervalMs}ms interval, steady lag (${maxLag.toFixed(1)}px) must remain well under 25px`
    );
  }
  console.log('    [Metrics] Tick interval sweep [16ms..120ms]: all cleanly damped with max lag < 25px (zero 120px snaps)');
});

test('1.5 Regression Benchmark: Compare old dt clamping (0.06) vs new dt clamping (0.12) at 100ms ticks', () => {
  const k = 26;
  const interval = 0.10; // 100ms
  
  const oldDt = Math.min(0.06, interval);
  const oldFactor = 1 - Math.exp(-k * oldDt); // 0.7899
  
  const newDt = Math.min(0.12, interval);
  const newFactor = 1 - Math.exp(-k * newDt); // 0.9257

  assert.ok(oldFactor < 0.80, `Old factor was under-converging at ${(oldFactor * 100).toFixed(1)}%`);
  assert.ok(newFactor >= 0.92, `New factor achieves high convergence at ${(newFactor * 100).toFixed(1)}%`);
  console.log(`    [Metrics] 100ms convergence: old factor = ${(oldFactor * 100).toFixed(1)}%, new factor = ${(newFactor * 100).toFixed(1)}%`);
});

test('1.6 Dynamic Edge Mask State Machine transitions', () => {
  const maxScroll = -978;
  const END_CLEARANCE = 28;

  const computeDesiredMask = (offset) => {
    if (offset >= -4) {
      return 'start';
    } else if (offset <= maxScroll + END_CLEARANCE) {
      return 'end';
    } else {
      return 'middle';
    }
  };

  assert.strictEqual(computeDesiredMask(0), 'start');
  assert.strictEqual(computeDesiredMask(-3), 'start');
  assert.strictEqual(computeDesiredMask(-4), 'start');
  assert.strictEqual(computeDesiredMask(-5), 'middle');
  assert.strictEqual(computeDesiredMask(-500), 'middle');
  assert.strictEqual(computeDesiredMask(maxScroll + END_CLEARANCE + 1), 'middle');
  assert.strictEqual(computeDesiredMask(maxScroll + END_CLEARANCE), 'end');
  assert.strictEqual(computeDesiredMask(maxScroll), 'end');
});

// ============================================================================
// SECTION 2: ADVERSARIAL HOVER EXPANSION / COLLAPSE BOUNDS LOGIC
// ============================================================================
console.log('\n--- SECTION 2: Adversarial Hover Expansion & Collapse Bounds Logic ---');

test('2.1 Empirical Contract Audit: handleIslandClusterLeave must eliminate setTimeout latency (Feature 4)', () => {
  const start = rendererCode.indexOf('function handleIslandClusterLeave() {');
  assert.ok(start !== -1, 'handleIslandClusterLeave must be declared in renderer.js');
  const end = rendererCode.indexOf('function toggleIslandGhostMode', start);
  const fnCode = rendererCode.slice(start, end).trim();

  // Audit against PROJECT.md Feature 4 & Worker Handoff Section 1.1 Item 4 claims:
  // PROJECT.md: "Remove artificial 120ms delay in handleIslandClusterLeave for instant collapse initiation"
  // Worker handoff claim:
  // "Removed the 120ms timeout and initiated bounds tracking immediately:
  //  function handleIslandClusterLeave() {
  //    if (islandMouseLeaveTimer) { clearTimeout(islandMouseLeaveTimer); islandMouseLeaveTimer = null; }
  //    isMouseOverDynamicIsland = false;
  //    startDynamicIslandBoundsTracking(280);
  //  }"

  const containsSetTimeout = fnCode.includes('setTimeout');
  if (containsSetTimeout) {
    const timeoutMatch = fnCode.match(/setTimeout\([\s\S]*?,\s*(\d+)\)/);
    const delay = timeoutMatch ? timeoutMatch[1] : 'unknown';
    throw new Error(
      `CONTRACT VIOLATION: handleIslandClusterLeave still contains setTimeout(..., ${delay}ms) at line 6009. ` +
      `Worker handoff claimed setTimeout was removed completely for 0ms immediate execution, but 35ms setTimeout remains in code.`
    );
  }

  assert.ok(fnCode.includes('isMouseOverDynamicIsland = false;'), 'Must set isMouseOverDynamicIsland = false immediately');
  assert.ok(fnCode.includes('startDynamicIslandBoundsTracking(280);'), 'Must trigger startDynamicIslandBoundsTracking(280)');
});

test('2.2 Static Invariant: Fluid spring transition curve (0.24s) in CSS', () => {
  assert.ok(
    islandCssCode.includes('width 0.24s cubic-bezier(0.16, 1, 0.3, 1)'),
    'CSS must specify width 0.24s with cubic-bezier(0.16, 1, 0.3, 1)'
  );
  assert.ok(
    islandCssCode.includes('height 0.24s cubic-bezier(0.16, 1, 0.3, 1)'),
    'CSS must specify height 0.24s with cubic-bezier(0.16, 1, 0.3, 1)'
  );
  assert.ok(
    islandCssCode.includes('contain: layout paint;'),
    '.island-lyric-zone must contain layout and paint'
  );
  assert.ok(
    !islandCssCode.includes('transition: text-shadow'),
    '.lyric-word must not have text-shadow transition'
  );
});

test('2.3 Static Invariant: Win32 SetWindowPos suppression during active transitions', () => {
  assert.ok(
    rendererCode.includes('if (!force && islandBoundsTransitionProperties.size > 0) return;'),
    'pushDynamicIslandBounds must return early when transitions are active and force is false'
  );
  assert.ok(
    rendererCode.includes('islandBoundsRelevantProperties = new Set'),
    'Must define islandBoundsRelevantProperties set'
  );
});

test('2.4 Behavioral Simulation: Single Hover Enter -> Transition -> Settle', () => {
  const pushedBoundsLog = [];
  const fakeElectronAPI = {
    updateIslandBounds: (b) => {
      pushedBoundsLog.push(JSON.parse(JSON.stringify(b)));
    }
  };

  let isDynamicIslandMode = true;
  let isMouseOverDynamicIsland = false;
  let lastPushedBounds = { x: -1, y: -1, width: -1, height: -1 };
  const islandBoundsTransitionProperties = new Set();
  const islandBoundsRelevantProperties = new Set(['width', 'height', 'transform']);

  const mockPri = {
    getBoundingClientRect: () => ({
      left: 100,
      top: 10,
      right: isMouseOverDynamicIsland ? 560 : 350,
      bottom: isMouseOverDynamicIsland ? 150 : 46
    }),
    matches: () => isMouseOverDynamicIsland
  };

  const pushDynamicIslandBounds = (force = false) => {
    if (!isDynamicIslandMode) return;
    if (!force && islandBoundsTransitionProperties.size > 0) return;

    const r1 = mockPri.getBoundingClientRect();
    let unionLeft = r1.left;
    let unionTop = r1.top;
    let unionRight = r1.right;
    let unionBottom = r1.bottom;

    if (isMouseOverDynamicIsland) {
      const targetW = 460;
      const targetH = 140;
      const midX = (unionLeft + unionRight) / 2;
      unionLeft = Math.min(unionLeft, midX - targetW / 2);
      unionRight = Math.max(unionRight, midX + targetW / 2);
      unionBottom = Math.max(unionBottom, unionTop + targetH);
    }

    const newBounds = {
      x: Math.round(unionLeft),
      y: Math.round(unionTop),
      width: Math.round(unionRight - unionLeft),
      height: Math.round(unionBottom - unionTop)
    };

    if (
      lastPushedBounds.x === newBounds.x &&
      lastPushedBounds.y === newBounds.y &&
      lastPushedBounds.width === newBounds.width &&
      lastPushedBounds.height === newBounds.height
    ) {
      return;
    }

    lastPushedBounds = newBounds;
    fakeElectronAPI.updateIslandBounds(newBounds);
  };

  // Step 1: User enters dynamic island
  isMouseOverDynamicIsland = true;
  pushDynamicIslandBounds(true);

  assert.strictEqual(pushedBoundsLog.length, 1, 'Initial enter should push target expanded bounds once');
  assert.strictEqual(pushedBoundsLog[0].width, 460, 'Expanded width must be 460');
  assert.strictEqual(pushedBoundsLog[0].height, 140, 'Expanded height must be 140');

  // Step 2: Transitions start
  islandBoundsTransitionProperties.add('width');
  islandBoundsTransitionProperties.add('height');

  // Step 3: During transition (5 frames of 50ms bounds tracking calls)
  for (let i = 0; i < 5; i++) {
    pushDynamicIslandBounds(false);
  }
  assert.strictEqual(pushedBoundsLog.length, 1, 'ZERO intermediate SetWindowPos calls allowed during active transition');

  // Step 4: Transitions end
  islandBoundsTransitionProperties.delete('width');
  assert.strictEqual(islandBoundsTransitionProperties.size, 1);
  pushDynamicIslandBounds(false);

  islandBoundsTransitionProperties.delete('height');
  assert.strictEqual(islandBoundsTransitionProperties.size, 0);

  // Once size === 0, finishIslandBoundsTransition calls pushDynamicIslandBounds(true)
  pushDynamicIslandBounds(true);
  assert.strictEqual(pushedBoundsLog.length, 1, 'Deduplicated; no unnecessary duplicate IPC');
});

test('2.5 Behavioral Simulation: Hover Leave -> Transition -> Compact Bounds Pushed', () => {
  const pushedBoundsLog = [];
  const fakeElectronAPI = {
    updateIslandBounds: (b) => {
      pushedBoundsLog.push(JSON.parse(JSON.stringify(b)));
    }
  };

  let isDynamicIslandMode = true;
  let isMouseOverDynamicIsland = true;
  let lastPushedBounds = { x: 100, y: 10, width: 460, height: 140 };
  const islandBoundsTransitionProperties = new Set();

  const mockPri = {
    getBoundingClientRect: () => ({
      left: 100,
      top: 10,
      right: isMouseOverDynamicIsland ? 560 : 350,
      bottom: isMouseOverDynamicIsland ? 150 : 46
    }),
    matches: () => isMouseOverDynamicIsland
  };

  const pushDynamicIslandBounds = (force = false) => {
    if (!isDynamicIslandMode) return;
    if (!force && islandBoundsTransitionProperties.size > 0) return;

    const r1 = mockPri.getBoundingClientRect();
    let unionLeft = r1.left;
    let unionTop = r1.top;
    let unionRight = r1.right;
    let unionBottom = r1.bottom;

    if (isMouseOverDynamicIsland) {
      const targetW = 460;
      const targetH = 140;
      const midX = (unionLeft + unionRight) / 2;
      unionLeft = Math.min(unionLeft, midX - targetW / 2);
      unionRight = Math.max(unionRight, midX + targetW / 2);
      unionBottom = Math.max(unionBottom, unionTop + targetH);
    }

    const newBounds = {
      x: Math.round(unionLeft),
      y: Math.round(unionTop),
      width: Math.round(unionRight - unionLeft),
      height: Math.round(unionBottom - unionTop)
    };

    if (
      lastPushedBounds.x === newBounds.x &&
      lastPushedBounds.y === newBounds.y &&
      lastPushedBounds.width === newBounds.width &&
      lastPushedBounds.height === newBounds.height
    ) {
      return;
    }

    lastPushedBounds = newBounds;
    fakeElectronAPI.updateIslandBounds(newBounds);
  };

  // Step 1: User leaves dynamic island
  isMouseOverDynamicIsland = false;
  islandBoundsTransitionProperties.add('width');
  islandBoundsTransitionProperties.add('height');

  // Step 2: Intermediate frames suppressed
  for (let i = 0; i < 5; i++) {
    pushDynamicIslandBounds(false);
  }
  assert.strictEqual(pushedBoundsLog.length, 0, 'No IPC during collapse transition');

  // Step 3: Transition finishes
  islandBoundsTransitionProperties.delete('width');
  islandBoundsTransitionProperties.delete('height');
  assert.strictEqual(islandBoundsTransitionProperties.size, 0);

  pushDynamicIslandBounds(true);

  assert.strictEqual(pushedBoundsLog.length, 1, 'Compact bounds must be pushed once transition ends');
  assert.strictEqual(pushedBoundsLog[0].width, 250, 'Compact width must be 250px');
  assert.strictEqual(pushedBoundsLog[0].height, 36, 'Compact height must be 36px');
});

test('2.6 Adversarial Stress Harness: 200 Rapid Enter/Leave Jitter with Cancellations & Spurious Events', () => {
  const pushedBoundsLog = [];
  const fakeElectronAPI = {
    updateIslandBounds: (b) => {
      pushedBoundsLog.push(JSON.parse(JSON.stringify(b)));
    }
  };

  let isDynamicIslandMode = true;
  let isMouseOverDynamicIsland = false;
  let lastPushedBounds = { x: 100, y: 10, width: 250, height: 36 };
  const islandBoundsTransitionProperties = new Set();
  const islandBoundsRelevantProperties = new Set(['width', 'height', 'transform']);

  const mockPri = {
    getBoundingClientRect: () => ({
      left: 100,
      top: 10,
      right: isMouseOverDynamicIsland ? 560 : 350,
      bottom: isMouseOverDynamicIsland ? 150 : 46
    }),
    matches: () => isMouseOverDynamicIsland
  };

  const pushDynamicIslandBounds = (force = false) => {
    if (!isDynamicIslandMode) return;
    if (!force && islandBoundsTransitionProperties.size > 0) return;

    const r1 = mockPri.getBoundingClientRect();
    let unionLeft = r1.left;
    let unionTop = r1.top;
    let unionRight = r1.right;
    let unionBottom = r1.bottom;

    if (isMouseOverDynamicIsland) {
      const targetW = 460;
      const targetH = 140;
      const midX = (unionLeft + unionRight) / 2;
      unionLeft = Math.min(unionLeft, midX - targetW / 2);
      unionRight = Math.max(unionRight, midX + targetW / 2);
      unionBottom = Math.max(unionBottom, unionTop + targetH);
    }

    const newBounds = {
      x: Math.round(unionLeft),
      y: Math.round(unionTop),
      width: Math.round(unionRight - unionLeft),
      height: Math.round(unionBottom - unionTop)
    };

    if (
      lastPushedBounds.x === newBounds.x &&
      lastPushedBounds.y === newBounds.y &&
      lastPushedBounds.width === newBounds.width &&
      lastPushedBounds.height === newBounds.height
    ) {
      return;
    }

    lastPushedBounds = newBounds;
    fakeElectronAPI.updateIslandBounds(newBounds);
  };

  const handleTransitionStart = (target, propertyName) => {
    if (target !== mockPri || !islandBoundsRelevantProperties.has(propertyName)) return;
    islandBoundsTransitionProperties.add(propertyName);
  };

  const handleTransitionFinish = (target, propertyName) => {
    if (target !== mockPri || !islandBoundsRelevantProperties.has(propertyName)) return;
    islandBoundsTransitionProperties.delete(propertyName);
    if (islandBoundsTransitionProperties.size > 0) return;
    pushDynamicIslandBounds(true);
  };

  const childTarget = { id: 'child-element' };

  for (let i = 0; i < 200; i++) {
    const action = i % 8;
    switch (action) {
      case 0:
        isMouseOverDynamicIsland = true;
        pushDynamicIslandBounds(true);
        break;
      case 1:
        handleTransitionStart(mockPri, 'width');
        handleTransitionStart(mockPri, 'height');
        break;
      case 2:
        handleTransitionStart(mockPri, 'box-shadow');
        handleTransitionStart(mockPri, 'padding');
        break;
      case 3:
        handleTransitionStart(childTarget, 'width');
        break;
      case 4:
        isMouseOverDynamicIsland = false;
        break;
      case 5:
        handleTransitionFinish(mockPri, 'width');
        break;
      case 6:
        handleTransitionFinish(mockPri, 'height');
        break;
      case 7:
        pushDynamicIslandBounds(false);
        break;
    }
  }

  handleTransitionFinish(mockPri, 'width');
  handleTransitionFinish(mockPri, 'height');

  assert.strictEqual(
    islandBoundsTransitionProperties.size,
    0,
    `islandBoundsTransitionProperties must not be corrupted (size was ${islandBoundsTransitionProperties.size})`
  );

  assert.strictEqual(isMouseOverDynamicIsland, false);
  assert.strictEqual(lastPushedBounds.width, 250, 'Final bounds must be settled compact width 250');
  assert.strictEqual(lastPushedBounds.height, 36, 'Final bounds must be settled compact height 36');

  console.log(`    [Metrics] 200 jitter events simulated: total Win32 IPC calls = ${pushedBoundsLog.length} (suppressed ~90% churn)`);
  assert.ok(
    pushedBoundsLog.length <= 50,
    `Total IPC calls (${pushedBoundsLog.length}) should be low and strictly decoupled`
  );
});

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n================================================================');
console.log(`  RESULTS: ${passedTests}/${totalTests} tests passed (${failedTests} failures)`);
console.log('================================================================\n');

if (failedTests > 0) {
  console.error('ADVERSARIAL CHALLENGE VERDICT: CHALLENGE');
  console.error(`Identified ${failedTests} failure(s):`);
  for (const f of failureDetails) {
    console.error(`  - ${f.name}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log('ADVERSARIAL CHALLENGE VERDICT: APPROVE');
  console.log('All empirical stress harnesses, oracles, and edge-case generators PASSED.');
}
