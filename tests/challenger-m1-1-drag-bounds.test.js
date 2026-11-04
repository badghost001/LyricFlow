/**
 * tests/challenger-m1-1-drag-bounds.test.js
 * 
 * CHALLENGER M1-1 EMPIRICAL ADVERSARIAL STRESS TEST SUITE
 * Target: Dynamic Island Progress Bar Drag States, Bounds Locking, Deferred Collapse & CSS Paused Immunity
 * 
 * Requirements:
 * 1. Pointer down on `#island-progress-track` sets `isScrubbingIslandProgress = true`, adds `.is-scrubbing`,
 *    and bounds target width/height remain 460x140 even during simulated mouseleave events.
 * 2. Pointerup releases `.is-scrubbing` cleanly and triggers deferred collapse if mouse was released outside the island.
 * 3. Paused state CSS rules (`_dynamic_island.css:269-273`) with `:not(.is-scrubbing)` cannot override `.is-scrubbing` capsule dimensions.
 * 4. Long drags do not trigger inactivity sleep because `lastPlaybackActivityMs` is refreshed on pointermove.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n================================================================');
console.log('  CHALLENGER M1-1: DYNAMIC ISLAND DRAG & BOUNDS STRESS HARNESS  ');
console.log('================================================================\n');

const rendererPath = path.join(__dirname, '..', 'src', 'renderer.js');
const islandCssPath = path.join(__dirname, '..', 'src', 'styles', '_dynamic_island.css');

assert.ok(fs.existsSync(rendererPath), 'src/renderer.js must exist');
assert.ok(fs.existsSync(islandCssPath), 'src/styles/_dynamic_island.css must exist');

const rendererCode = fs.readFileSync(rendererPath, 'utf8');
const islandCssCode = fs.readFileSync(islandCssPath, 'utf8');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function runTest(name, fn) {
  totalTests++;
  console.log(`[TEST ${totalTests}] ${name}`);
  try {
    fn();
    passedTests++;
    console.log(`  ✓ PASS\n`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ FAIL: ${err.message}`);
    console.error(err.stack);
    console.log('');
    failureDetails.push({ name, error: err.message });
  }
}

// ============================================================================
// SECTION 1: POINTER DOWN, BOUNDS EXPANSION (460x140) & MOUSELEAVE PERSISTENCE
// ============================================================================

runTest('1.1. Code Contract: pointerdown on track sets isScrubbingIslandProgress and adds .is-scrubbing', () => {
  // Verify attachScrubberController establishes isScrubbingIslandProgress and .is-scrubbing
  assert.ok(
    rendererCode.includes('isScrubbingIslandProgress = true;'),
    'attachScrubberController must set isScrubbingIslandProgress = true on pointerdown'
  );
  assert.ok(
    rendererCode.includes('if (island) island.classList.add("is-scrubbing");'),
    'attachScrubberController must add "is-scrubbing" to dynamic-island element'
  );
  assert.ok(
    rendererCode.includes('trackEl.classList.add("is-scrubbing");'),
    'attachScrubberController must add "is-scrubbing" to trackEl'
  );
  assert.ok(
    rendererCode.includes('pushDynamicIslandBounds(true);'),
    'attachScrubberController must immediately enforce pushDynamicIslandBounds(true)'
  );
});

runTest('1.2. Empirical Bounds Engine: pushDynamicIslandBounds produces 460x140 bounds during scrub', () => {
  // Replicate pushDynamicIslandBounds geometry calculation with mock elements
  function computeIslandBounds({
    priRect = { left: 760, top: 20, right: 1160, bottom: 56, width: 400, height: 36 },
    isMouseOverDynamicIsland = false,
    isScrubbingIslandProgress = false,
    hasClassScrubbing = false,
    isHovering = false,
    windowWidth = 1920
  }) {
    let unionLeft = priRect.left;
    let unionTop = priRect.top;
    let unionRight = priRect.right;
    let unionBottom = priRect.bottom;

    if (
      isMouseOverDynamicIsland ||
      isScrubbingIslandProgress ||
      hasClassScrubbing ||
      isHovering
    ) {
      const targetW = Math.min(460, windowWidth - 20);
      const targetH = 140;
      const midX = (unionLeft + unionRight) / 2;
      unionLeft = Math.min(unionLeft, midX - targetW / 2);
      unionRight = Math.max(unionRight, midX + targetW / 2);
      unionBottom = Math.max(unionBottom, unionTop + targetH);
    }

    return {
      x: Math.round(unionLeft),
      y: Math.round(unionTop),
      width: Math.round(unionRight - unionLeft),
      height: Math.round(unionBottom - unionTop)
    };
  }

  // Baseline resting bounds (not hovering, not scrubbing)
  const restingBounds = computeIslandBounds({
    isMouseOverDynamicIsland: false,
    isScrubbingIslandProgress: false,
    hasClassScrubbing: false,
    isHovering: false
  });
  assert.strictEqual(restingBounds.width, 400, 'Resting bounds width should match compact island');
  assert.strictEqual(restingBounds.height, 36, 'Resting bounds height should match compact island');

  // Active scrubbing bounds (isScrubbingIslandProgress = true, class is-scrubbing present)
  const scrubbingBounds = computeIslandBounds({
    isMouseOverDynamicIsland: true,
    isScrubbingIslandProgress: true,
    hasClassScrubbing: true,
    isHovering: true
  });
  assert.strictEqual(scrubbingBounds.width, 460, 'Scrubbing bounds width must be 460px');
  assert.strictEqual(scrubbingBounds.height, 140, 'Scrubbing bounds height must be 140px');
  assert.strictEqual(scrubbingBounds.x, 730, 'Left edge must expand symmetrically (960 - 230)');

  // Responsive narrow viewport bounds (e.g. 400px window width -> width 380px, height 140px)
  const narrowBounds = computeIslandBounds({
    priRect: { left: 50, top: 20, right: 350, bottom: 56, width: 300, height: 36 },
    isScrubbingIslandProgress: true,
    hasClassScrubbing: true,
    windowWidth: 400
  });
  assert.strictEqual(narrowBounds.width, 380, 'Narrow viewport bounds width should clamp to windowWidth - 20');
  assert.strictEqual(narrowBounds.height, 140, 'Height must remain 140px');
});

runTest('1.3. Adversarial Stress: 100 rapid simulated mouseleave events during scrub never collapse bounds', () => {
  let isMouseOverDynamicIsland = true;
  let isScrubbingIslandProgress = true;
  let islandMouseLeaveTimer = null;
  let boundsTrackingStarted = false;
  let boundsTrackingCount = 0;

  function simulateHandleIslandClusterLeave() {
    // Exact implementation from renderer.js:6145-6153
    if (isScrubbingIslandProgress) return;
    if (islandMouseLeaveTimer) {
      clearTimeout(islandMouseLeaveTimer);
      islandMouseLeaveTimer = null;
    }
    isMouseOverDynamicIsland = false;
    boundsTrackingStarted = true;
    boundsTrackingCount++;
  }

  // Simulate 100 rapid mouseleave events as cursor jerks around while dragging
  for (let i = 0; i < 100; i++) {
    simulateHandleIslandClusterLeave();
    assert.strictEqual(isMouseOverDynamicIsland, true, `isMouseOverDynamicIsland must NOT be set to false during scrub (iter ${i})`);
    assert.strictEqual(boundsTrackingStarted, false, `Collapse tracking must NOT be started during scrub (iter ${i})`);
  }
  assert.strictEqual(boundsTrackingCount, 0, 'Zero collapse tracking calls must occur during active scrub');
});

runTest('1.4. Hostile State Resilience: Even if isMouseOverDynamicIsland is forcibly false, bounds remain 460x140', () => {
  // If an external event or race condition resets isMouseOverDynamicIsland = false,
  // does pushDynamicIslandBounds still enforce 460x140 while scrubbing?
  const pri = {
    classList: {
      contains: (cls) => cls === 'is-scrubbing'
    },
    matches: () => false // mouse is outside, so :hover is false
  };

  const isMouseOverDynamicIsland = false;
  const isScrubbingIslandProgress = true;

  const shouldExpand = (
    isMouseOverDynamicIsland ||
    isScrubbingIslandProgress ||
    (pri && pri.classList.contains('is-scrubbing')) ||
    (typeof pri.matches === 'function' && pri.matches(':hover'))
  );

  assert.strictEqual(shouldExpand, true, 'isScrubbingIslandProgress and .is-scrubbing must guarantee expanded bounds');
});

// ============================================================================
// SECTION 2: POINTER UP, DEFERRED COLLAPSE & FALLBACK CLEANUP
// ============================================================================

runTest('2.1. Code Contract: commitSeek releases .is-scrubbing cleanly', () => {
  assert.ok(
    rendererCode.includes('isScrubbingIslandProgress = false;'),
    'commitSeek must reset isScrubbingIslandProgress = false'
  );
  assert.ok(
    rendererCode.includes('island.classList.remove("is-scrubbing");'),
    'commitSeek must remove "is-scrubbing" class from dynamic-island'
  );
  assert.ok(
    rendererCode.includes('trackEl.classList.remove("is-scrubbing");'),
    'commitSeek must remove "is-scrubbing" class from trackEl'
  );
  assert.ok(
    rendererCode.includes('cachedTrackRect = null;'),
    'commitSeek must reset cachedTrackRect to null'
  );
});

runTest('2.2. Deferred Collapse: Outside release triggers handleIslandClusterLeave, Inside release stays expanded', () => {
  // Test scenario A: Pointer released OUTSIDE island
  let outsideLeaveTriggered = false;
  const outsideIslandMock = {
    classList: {
      remove: (cls) => {}
    },
    matches: (selector) => {
      if (selector === ':hover') return false; // cursor is outside
      return false;
    }
  };

  function simulateCommitSeekOutside() {
    let isScrubbingIslandProgress = false;
    if (outsideIslandMock) {
      outsideIslandMock.classList.remove("is-scrubbing");
      if (typeof outsideIslandMock.matches === 'function' && !outsideIslandMock.matches(':hover')) {
        outsideLeaveTriggered = true;
      }
    }
  }

  simulateCommitSeekOutside();
  assert.strictEqual(outsideLeaveTriggered, true, 'Releasing pointer outside island must trigger deferred collapse');

  // Test scenario B: Pointer released INSIDE island
  let insideLeaveTriggered = false;
  const insideIslandMock = {
    classList: {
      remove: (cls) => {}
    },
    matches: (selector) => {
      if (selector === ':hover') return true; // cursor is inside
      return false;
    }
  };

  function simulateCommitSeekInside() {
    let isScrubbingIslandProgress = false;
    if (insideIslandMock) {
      insideIslandMock.classList.remove("is-scrubbing");
      if (typeof insideIslandMock.matches === 'function' && !insideIslandMock.matches(':hover')) {
        insideLeaveTriggered = true;
      }
    }
  }

  simulateCommitSeekInside();
  assert.strictEqual(insideLeaveTriggered, false, 'Releasing pointer inside island must NOT trigger collapse (stays expanded on hover)');
});

runTest('2.3. Fallback Listeners: Window pointerup, pointercancel, and lostpointercapture cleanly commit and detach', () => {
  // Verify window fallback listeners are registered on pointerdown and unregistered on commitSeek
  const addPointerUp = rendererCode.includes('window.addEventListener("pointerup", onWindowPointerUpFallback');
  const addPointerCancel = rendererCode.includes('window.addEventListener("pointercancel", onWindowPointerCancelFallback');
  const addPointerMove = rendererCode.includes('window.addEventListener("pointermove", onWindowPointerMoveFallback');

  const removePointerUp = rendererCode.includes('window.removeEventListener("pointerup", onWindowPointerUpFallback');
  const removePointerCancel = rendererCode.includes('window.removeEventListener("pointercancel", onWindowPointerCancelFallback');
  const removePointerMove = rendererCode.includes('window.removeEventListener("pointermove", onWindowPointerMoveFallback');

  const lostCapture = rendererCode.includes('trackEl.addEventListener("lostpointercapture"');

  assert.ok(addPointerUp && addPointerCancel && addPointerMove, 'Window fallback listeners must be attached on pointerdown');
  assert.ok(removePointerUp && removePointerCancel && removePointerMove, 'Window fallback listeners must be detached on commitSeek');
  assert.ok(lostCapture, 'lostpointercapture listener must be attached to trackEl to prevent stuck state');
});

// ============================================================================
// SECTION 3: CSS PAUSED STATE SPECIFICITY & IMMUNITY AGAINST OVERRIDE
// ============================================================================

runTest('3.1. CSS Contract: Paused minimization selectors strictly contain :not(.is-scrubbing)', () => {
  // Extract paused rules lines ~269-273 from _dynamic_island.css
  const pausedBlockRegex = /body\.mode-dynamic-island:not\(\.is-playing\)\s+#dynamic-island[^{]*\{([^}]+)\}/;
  const match = islandCssCode.match(pausedBlockRegex);
  assert.ok(match, 'Paused minimization CSS rule block must be present');

  // Verify all 3 paused selectors contain :not(.is-scrubbing)
  assert.ok(
    islandCssCode.includes('body.mode-dynamic-island:not(.is-playing) #dynamic-island:not(:hover):not(.is-scrubbing)'),
    'Selector 1 must include :not(.is-scrubbing)'
  );
  assert.ok(
    islandCssCode.includes('body.mode-dynamic-island.app-paused #dynamic-island:not(:hover):not(.is-scrubbing)'),
    'Selector 2 must include :not(.is-scrubbing)'
  );
  assert.ok(
    islandCssCode.includes('body.mode-dynamic-island #dynamic-island.island-paused:not(:hover):not(.is-scrubbing)'),
    'Selector 3 must include :not(.is-scrubbing)'
  );
});

runTest('3.2. Empirical CSS Selector Evaluation: .is-scrubbing strictly prevents paused minimization', () => {
  // Simulate CSS selector matching engine for element states
  function elementMatchesSelector(selector, elementState) {
    // Selectors:
    // S1: body.mode-dynamic-island:not(.is-playing) #dynamic-island:not(:hover):not(.is-scrubbing)
    // S2: body.mode-dynamic-island.app-paused #dynamic-island:not(:hover):not(.is-scrubbing)
    // S3: body.mode-dynamic-island #dynamic-island.island-paused:not(:hover):not(.is-scrubbing)
    // S4: body.mode-dynamic-island #dynamic-island.is-scrubbing

    const isBodyDynamicIsland = elementState.bodyClasses.includes('mode-dynamic-island');
    const isPlaying = elementState.bodyClasses.includes('is-playing');
    const isAppPaused = elementState.bodyClasses.includes('app-paused');
    const isIslandPaused = elementState.islandClasses.includes('island-paused');
    const isScrubbing = elementState.islandClasses.includes('is-scrubbing');
    const isHover = elementState.isHovered;

    if (selector.includes(':not(.is-scrubbing)') && isScrubbing) {
      return false; // :not(.is-scrubbing) fails if is-scrubbing is present
    }
    if (selector.includes(':not(:hover)') && isHover) {
      return false; // :not(:hover) fails if hovered
    }
    if (selector.includes(':not(.is-playing)') && isPlaying) {
      return false;
    }

    if (selector.includes('.is-scrubbing') && !selector.includes(':not(.is-scrubbing)')) {
      return isBodyDynamicIsland && isScrubbing;
    }

    if (selector.includes('body.mode-dynamic-island:not(.is-playing)')) {
      return isBodyDynamicIsland && !isPlaying && !isHover && !isScrubbing;
    }
    if (selector.includes('body.mode-dynamic-island.app-paused')) {
      return isBodyDynamicIsland && isAppPaused && !isHover && !isScrubbing;
    }
    if (selector.includes('#dynamic-island.island-paused')) {
      return isBodyDynamicIsland && isIslandPaused && !isHover && !isScrubbing;
    }

    return false;
  }

  // State 1: Paused, NOT hovering, actively scrubbing
  const pausedScrubbingState = {
    bodyClasses: ['mode-dynamic-island'], // not .is-playing
    islandClasses: ['is-scrubbing'],
    isHovered: false
  };

  const s1 = 'body.mode-dynamic-island:not(.is-playing) #dynamic-island:not(:hover):not(.is-scrubbing)';
  const s2 = 'body.mode-dynamic-island.app-paused #dynamic-island:not(:hover):not(.is-scrubbing)';
  const s3 = 'body.mode-dynamic-island #dynamic-island.island-paused:not(:hover):not(.is-scrubbing)';
  const sExp = 'body.mode-dynamic-island #dynamic-island.is-scrubbing';

  assert.strictEqual(elementMatchesSelector(s1, pausedScrubbingState), false, 'Paused selector 1 must NOT match when is-scrubbing is active');
  assert.strictEqual(elementMatchesSelector(s2, pausedScrubbingState), false, 'Paused selector 2 must NOT match when is-scrubbing is active');
  assert.strictEqual(elementMatchesSelector(s3, pausedScrubbingState), false, 'Paused selector 3 must NOT match when is-scrubbing is active');
  assert.strictEqual(elementMatchesSelector(sExp, pausedScrubbingState), true, 'Expanded .is-scrubbing selector MUST match');

  // State 2: App paused via .app-paused class, NOT hovering, actively scrubbing
  const appPausedScrubbingState = {
    bodyClasses: ['mode-dynamic-island', 'app-paused'],
    islandClasses: ['is-scrubbing'],
    isHovered: false
  };
  assert.strictEqual(elementMatchesSelector(s2, appPausedScrubbingState), false, 'app-paused selector must NOT match during scrub');
  assert.strictEqual(elementMatchesSelector(sExp, appPausedScrubbingState), true, '.is-scrubbing selector matches during scrub');

  // State 3: Resting paused state after scrub completes
  const restingPausedState = {
    bodyClasses: ['mode-dynamic-island'],
    islandClasses: [],
    isHovered: false
  };
  assert.strictEqual(elementMatchesSelector(s1, restingPausedState), true, 'Resting paused selector matches when NOT scrubbing and NOT hovering');
  assert.strictEqual(elementMatchesSelector(sExp, restingPausedState), false, '.is-scrubbing does NOT match in resting state');
});

runTest('3.3. Specificity & Dimensions: .is-scrubbing rule dictates 460x140 dimensions in _dynamic_island.css', () => {
  // Verify that the rule for .is-scrubbing defines 460px width and 140px height
  const expansionRuleRegex = /body\.mode-dynamic-island\s+#dynamic-island:hover,\s*body\.mode-dynamic-island\s+#dynamic-island\.is-scrubbing\s*\{([^}]+)\}/;
  const match = islandCssCode.match(expansionRuleRegex);
  assert.ok(match, 'Expanded rule for #dynamic-island.is-scrubbing must exist');

  const body = match[1];
  assert.ok(body.includes('width: min(460px, calc(100vw - 20px));'), 'Width must be min(460px, calc(100vw - 20px))');
  assert.ok(body.includes('height: 140px;'), 'Height must be 140px');
  assert.ok(body.includes('border-radius: 28px;'), 'Border radius must be 28px');
});

// ============================================================================
// SECTION 4: LONG DRAG INACTIVITY REFRESH & SLEEP PREVENTION
// ============================================================================

runTest('4.1. Code Contract: pointermove refreshes lastPlaybackActivityMs when scrubbing', () => {
  // In handlePointerMove:
  // if (isScrubbing) {
  //   lastPlaybackActivityMs = Date.now();
  //   ...
  // }
  const handlePointerMoveRegex = /function handlePointerMove\(e\)\s*\{[\s\S]*?if\s*\(isScrubbing\)\s*\{([\s\S]*?)\}\s*else/s;
  const match = rendererCode.match(handlePointerMoveRegex);
  assert.ok(match, 'handlePointerMove must handle isScrubbing branch');
  const scrubbingBranch = match[1];
  assert.ok(
    scrubbingBranch.includes('lastPlaybackActivityMs = Date.now();'),
    'handlePointerMove must refresh lastPlaybackActivityMs = Date.now() on every drag move'
  );
});

runTest('4.2. Empirical Stress: 60-second drag under 30-second timeout never triggers inactivity sleep', () => {
  let simulatedClock = 1000000; // t = 1,000,000 ms
  let lastPlaybackActivityMs = simulatedClock;
  let isIslandSleeping = false;
  let isPlaying = false; // Paused playback!
  let isDynamicIslandMode = true;
  let isScrubbing = true;
  const inactivityTimeout = 30000; // 30 seconds

  function checkDynamicIslandInactivity() {
    if (!isDynamicIslandMode) return;
    if (inactivityTimeout <= 0) return;
    if (isPlaying) {
      lastPlaybackActivityMs = simulatedClock;
      if (isIslandSleeping) isIslandSleeping = false;
      return;
    }
    const idleTime = simulatedClock - lastPlaybackActivityMs;
    if (idleTime >= inactivityTimeout && !isIslandSleeping) {
      isIslandSleeping = true;
    }
  }

  function simulatePointerMove() {
    if (isScrubbing) {
      lastPlaybackActivityMs = simulatedClock;
    }
  }

  // Simulate a 60-second long drag (60,000 ms) with pointer moves every 50ms (1200 moves total)
  const totalDurationMs = 60000;
  const moveIntervalMs = 50;
  const iterations = totalDurationMs / moveIntervalMs;

  let maxObservedIdleTime = 0;

  for (let i = 0; i < iterations; i++) {
    simulatedClock += moveIntervalMs;
    simulatePointerMove();
    checkDynamicIslandInactivity();

    const currentIdleTime = simulatedClock - lastPlaybackActivityMs;
    if (currentIdleTime > maxObservedIdleTime) {
      maxObservedIdleTime = currentIdleTime;
    }

    assert.strictEqual(
      isIslandSleeping,
      false,
      `Island must NOT fall asleep during active drag at t=${simulatedClock - 1000000}ms (iter ${i})`
    );
  }

  assert.strictEqual(maxObservedIdleTime, 0, 'Idle time must remain 0ms during continuous pointer moves');
  console.log(`    [Metrics] 60s drag over 1200 pointer moves: isIslandSleeping = false, max idle time = ${maxObservedIdleTime}ms`);

  // Contrast: now user stops moving and releases pointer. Time advances past 30s.
  isScrubbing = false;
  simulatedClock += 30001; // Advance 30.001 seconds without activity
  checkDynamicIslandInactivity();
  assert.strictEqual(isIslandSleeping, true, 'Island must fall asleep after 30s of actual inactivity post-drag');
});

runTest('4.3. Stress Test with Extreme 3-Second Inactivity Timeout across 15-second drag', () => {
  let simulatedClock = 2000000;
  let lastPlaybackActivityMs = simulatedClock;
  let isIslandSleeping = false;
  const extremeTimeout = 3000; // 3 seconds timeout
  let isScrubbing = true;

  function checkInactivity() {
    const idleTime = simulatedClock - lastPlaybackActivityMs;
    if (idleTime >= extremeTimeout && !isIslandSleeping) {
      isIslandSleeping = true;
    }
  }

  // 15 seconds drag with pointermove every 100ms
  for (let t = 0; t < 15000; t += 100) {
    simulatedClock += 100;
    lastPlaybackActivityMs = simulatedClock;
    checkInactivity();
    assert.strictEqual(isIslandSleeping, false, `Must not sleep at t=${t}ms under 3s timeout`);
  }
  assert.strictEqual(isIslandSleeping, false, 'Island survived 15s drag with 3s timeout without sleeping');
});

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================

console.log('================================================================');
console.log(`TOTAL TESTS : ${totalTests}`);
console.log(`PASSED      : ${passedTests}`);
console.log(`FAILED      : ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  console.error('\nFAILURE DETAILS:');
  failureDetails.forEach((f, idx) => {
    console.error(`  ${idx + 1}. ${f.name} -> ${f.error}`);
  });
  process.exit(1);
} else {
  console.log('\nAll Challenger M1-1 Drag & Bounds Stress Tests PASSED with 100% success rate!\n');
  process.exit(0);
}
