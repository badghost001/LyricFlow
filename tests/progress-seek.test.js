/**
 * Unit Tests for Interactive Progress Bar Seeking, Drag Scrubbing, & Relative Delta Calculations
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

function runProgressSeekTests() {
  console.log('\n--- Running Progress Bar Seeking & Scrubbing Unit Tests ---\n');

  // Test 1: Ratio calculation and bounds clamping
  test('1. Ratio calculation strictly clamps to [0, 1] range and handles zero-width gracefully', () => {
    function getRatio(clientX, rect) {
      if (!rect || !rect.width || rect.width <= 0) return 0;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    const rect = { left: 100, width: 400 };

    // Exact start, middle, and end
    assert.strictEqual(getRatio(100, rect), 0.0);
    assert.strictEqual(getRatio(300, rect), 0.5);
    assert.strictEqual(getRatio(500, rect), 1.0);

    // Out of bounds to the left and right
    assert.strictEqual(getRatio(20, rect), 0.0, 'Values to the left must clamp to 0.0');
    assert.strictEqual(getRatio(650, rect), 1.0, 'Values to the right must clamp to 1.0');

    // Zero-width rect safety
    assert.strictEqual(getRatio(150, { left: 100, width: 0 }), 0.0);
    assert.strictEqual(getRatio(150, null), 0.0);
  });

  // Test 2: Seek Milliseconds Conversion from Duration
  test('2. Millisecond conversion converts ratio to track duration and clamps to [0, trackDuration]', () => {
    function ratioToSeekMs(ratio, trackDuration) {
      if (!trackDuration || trackDuration <= 0) return 0;
      const clampedRatio = Math.max(0, Math.min(1, ratio));
      return Math.round(clampedRatio * trackDuration);
    }

    const trackDuration = 240000; // 4 minutes

    assert.strictEqual(ratioToSeekMs(0.0, trackDuration), 0);
    assert.strictEqual(ratioToSeekMs(0.25, trackDuration), 60000); // 1:00
    assert.strictEqual(ratioToSeekMs(0.5, trackDuration), 120000); // 2:00
    assert.strictEqual(ratioToSeekMs(0.75, trackDuration), 180000); // 3:00
    assert.strictEqual(ratioToSeekMs(1.0, trackDuration), 240000); // 4:00

    // Missing or invalid duration
    assert.strictEqual(ratioToSeekMs(0.5, 0), 0);
    assert.strictEqual(ratioToSeekMs(0.5, -5000), 0);
  });

  // Test 3: Relative Seek Ahead / Rewind Delta Calculations
  test('3. Relative seek ahead and rewind calculations clamp strictly within track boundaries', () => {
    const trackDuration = 180000; // 3 minutes

    function computeNewPosition(currentProgress, deltaMs) {
      return Math.max(0, Math.min(trackDuration, (currentProgress || 0) + deltaMs));
    }

    // Step +5s from 30s -> 35s
    assert.strictEqual(computeNewPosition(30000, 5000), 35000);

    // Step +15s (Shift+Wheel) from 30s -> 45s
    assert.strictEqual(computeNewPosition(30000, 15000), 45000);

    // Step -5s from 30s -> 25s
    assert.strictEqual(computeNewPosition(30000, -5000), 25000);

    // Rewind past beginning (e.g. from 2s with -5s) -> clamps to 0s
    assert.strictEqual(computeNewPosition(2000, -5000), 0);

    // Seek ahead past end (e.g. from 178s with +5s) -> clamps to 180s
    assert.strictEqual(computeNewPosition(178000, 5000), 180000);
  });

  // Test 4: Double-Click Quick Jump (Right = +10s, Left = -10s)
  test('4. Double-click on right half jumps ahead +10s, left half rewinds -10s', () => {
    const trackDuration = 200000;

    function getDblClickDelta(ratio) {
      return ratio >= 0.5 ? 10000 : -10000;
    }

    function applyDblClickSeek(currentProgress, ratio) {
      const delta = getDblClickDelta(ratio);
      return Math.max(0, Math.min(trackDuration, currentProgress + delta));
    }

    // Double click at 70% of bar while at 40s -> jumps ahead +10s to 50s
    assert.strictEqual(applyDblClickSeek(40000, 0.70), 50000);

    // Double click at 20% of bar while at 40s -> rewinds -10s to 30s
    assert.strictEqual(applyDblClickSeek(40000, 0.20), 30000);

    // Double click on left half near start (at 4s) -> clamps to 0s
    assert.strictEqual(applyDblClickSeek(4000, 0.15), 0);
  });

  // Test 5: Scrubbing State Locks Out Playhead Overwrites
  test('5. Active scrubbing flag locks out automatic playhead progress overwrites', () => {
    let isScrubbingMainProgress = false;
    let displayedWidth = '25%';
    let displayedTime = '1:00';

    function simulatePlayheadTick(newProgressMs, trackDuration) {
      const fillPercent = (newProgressMs / trackDuration) * 100;
      if (!isScrubbingMainProgress) {
        displayedWidth = `${fillPercent}%`;
        displayedTime = `${Math.floor(newProgressMs / 1000)}s`;
      }
    }

    // Step A: Normal playhead tick while NOT scrubbing -> updates UI
    simulatePlayheadTick(60000, 240000);
    assert.strictEqual(displayedWidth, '25%');
    assert.strictEqual(displayedTime, '60s');

    // Step B: User starts dragging at 75% -> set isScrubbingMainProgress = true
    isScrubbingMainProgress = true;
    displayedWidth = '75%';
    displayedTime = '180s';

    // Step C: Playhead ticks in background while user drags -> MUST NOT OVERWRITE DRAGGING STATE
    simulatePlayheadTick(65000, 240000);
    assert.strictEqual(displayedWidth, '75%', 'Scrubber position must remain locked at user drag position');
    assert.strictEqual(displayedTime, '180s', 'Displayed time must remain locked at user drag position');

    // Step D: User releases mouse -> commit seek, isScrubbingMainProgress = false
    isScrubbingMainProgress = false;
    simulatePlayheadTick(180000, 240000);
    assert.strictEqual(displayedWidth, '75%');
    assert.strictEqual(displayedTime, '180s');
  });

  // Test 6: Settings Toggle Gates Seeking & Wheel Gestures
  test('6. Settings flags properly gate scrubber seeking and wheel gestures', () => {
    const settings = {
      progressBarSeek: true,
      progressWheelSeek: true
    };

    function canInitiateSeek() {
      return settings.progressBarSeek !== false;
    }

    function canWheelSeek() {
      return settings.progressBarSeek !== false && settings.progressWheelSeek !== false;
    }

    assert.strictEqual(canInitiateSeek(), true);
    assert.strictEqual(canWheelSeek(), true);

    // Disable wheel seek only
    settings.progressWheelSeek = false;
    assert.strictEqual(canInitiateSeek(), true, 'Click/drag seeking remains enabled');
    assert.strictEqual(canWheelSeek(), false, 'Wheel seeking is blocked');

    // Disable entire progress bar seek
    settings.progressBarSeek = false;
    assert.strictEqual(canInitiateSeek(), false, 'Click/drag seeking is blocked');
    assert.strictEqual(canWheelSeek(), false, 'Wheel seeking is blocked');
  });

  // Test 7: Seek Ahead Tooltip Delta Formatting
  test('7. Floating tooltip displays preview time with relative seek-ahead delta tag', () => {
    function formatTime(ms) {
      const totalSec = Math.floor(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    function formatTooltipText(previewMs, currentProgressMs) {
      const deltaSec = Math.round((previewMs - (currentProgressMs || 0)) / 1000);
      const deltaStr = deltaSec > 0 ? ` (+${deltaSec}s)` : (deltaSec < 0 ? ` (${deltaSec}s)` : '');
      return `${formatTime(previewMs)}${deltaStr}`;
    }

    // Hovering ahead by 45s: at 60s, preview 105s (1:45)
    assert.strictEqual(formatTooltipText(105000, 60000), '1:45 (+45s)');

    // Hovering behind by 20s: at 60s, preview 40s (0:40)
    assert.strictEqual(formatTooltipText(40000, 60000), '0:40 (-20s)');

    // Hovering at current playhead: at 60s, preview 60s (1:00)
    assert.strictEqual(formatTooltipText(60000, 60000), '1:00');
  });

  console.log(`Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runProgressSeekTests();
