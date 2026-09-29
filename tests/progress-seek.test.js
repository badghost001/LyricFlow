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

  // Test 8: Seek Lockout Window Prevents Stale Poll Snap-Back (Rubber-Banding)
  test('8. Seek lockout window drops stale pre-seek polls and prevents rubber-banding', () => {
    let currentProgress = 10000;
    let lastPollProgress = 10000;
    let lastUserSeekTimestamp = 0;
    let lastUserSeekTargetMs = 0;

    function simulateUserSeek(targetMs, now) {
      lastUserSeekTimestamp = now;
      lastUserSeekTargetMs = targetMs;
      currentProgress = targetMs;
      lastPollProgress = targetMs;
    }

    function simulateSyncPlaybackState(progressMs, now) {
      const isRecentSeek = (now - lastUserSeekTimestamp) < 1200;
      if (isRecentSeek && Math.abs(progressMs - lastUserSeekTargetMs) > 1500) {
        // Drop stale poll
        return false;
      }
      const drift = currentProgress - progressMs;
      if (Math.abs(drift) > 2500) {
        lastPollProgress = progressMs;
        currentProgress = progressMs;
      } else if (Math.abs(drift) > 300) {
        lastPollProgress = currentProgress - (drift * 0.12);
      }
      return true;
    }

    const t0 = 1000000;
    // User seeks from 10s to 50s
    simulateUserSeek(50000, t0);
    assert.strictEqual(currentProgress, 50000);

    // 150ms later, a stale poll from Spotify/SMTC arrives reporting old 10.2s position
    const t1 = t0 + 150;
    const acceptedStale = simulateSyncPlaybackState(10200, t1);
    assert.strictEqual(acceptedStale, false, 'Stale pre-seek poll must be dropped');
    assert.strictEqual(currentProgress, 50000, 'Current progress must NOT snap back to old position');

    // 600ms later, an updated poll arrives reporting 50.6s (within 1500ms of seek target)
    const t2 = t0 + 600;
    const acceptedFresh = simulateSyncPlaybackState(50600, t2);
    assert.strictEqual(acceptedFresh, true, 'Fresh post-seek poll must be accepted');

    // 1500ms later (after lockout expires), normal seek detection resumes
    const t3 = t0 + 1500;
    simulateSyncPlaybackState(20000, t3);
    assert.strictEqual(currentProgress, 20000, 'After lockout window expires, hard seeks are accepted');
  });

  // Test 9: Strict Monotonic Progression Clamping
  test('9. Strict monotonic progression clamp guarantees zero backward time-travel during playback', () => {
    let isPlaying = true;
    let lastUserSeekTimestamp = 0;

    function computePlayheadProgress(previousProgress, rawComputedProgress, now) {
      let progress = rawComputedProgress;
      const isRecentSeek = (now - lastUserSeekTimestamp) < 1200;
      if (isPlaying && !isRecentSeek && previousProgress > 0 && progress < previousProgress) {
        progress = previousProgress;
      }
      return progress;
    }

    const now = 2000000;
    // Case 1: Monotonic normal forward advance (10000 -> 10016)
    assert.strictEqual(computePlayheadProgress(10000, 10016, now), 10016);

    // Case 2: Jitter / clock slew attempts to travel backwards (10016 -> 9980)
    assert.strictEqual(
      computePlayheadProgress(10016, 9980, now),
      10016,
      'Progress must never travel backwards during active playback without seek'
    );

    // Case 3: Intentional user seek backwards (lastUserSeekTimestamp within 1200ms)
    lastUserSeekTimestamp = now - 100;
    assert.strictEqual(
      computePlayheadProgress(10016, 2000, now),
      2000,
      'Intentional user rewind must immediately be respected'
    );
  });

  // Test 10: Smooth Clock Slewing
  test('10. Smooth clock slewing gently corrects drift without sudden backward jumps', () => {
    let currentProgress = 30000;
    let lastPollProgress = 30000;

    function applyClockSlewing(progressMs) {
      const drift = currentProgress - progressMs;
      const absDrift = Math.abs(drift);
      if (absDrift > 300 && absDrift <= 2500) {
        const adjustment = drift * 0.12;
        lastPollProgress = currentProgress - adjustment;
      }
    }

    // Local clock is 500ms ahead of API (currentProgress = 30000, progressMs = 29500)
    applyClockSlewing(29500);
    // Adjustment is 500 * 0.12 = 60ms; reference gently adjusted to 29940ms
    assert.strictEqual(lastPollProgress, 29940);
    assert.ok(lastPollProgress >= 29500 && lastPollProgress <= 30000);
  });

  // Test 11: formatTime Edge Cases and Guards
  test('11. formatTime safely guards against null, undefined, NaN, and negative values', () => {
    function formatTime(ms) {
      if (!ms || isNaN(ms) || ms <= 0) return '0:00';
      const totalSec = Math.floor(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `${min}:${String(sec).padStart(2, '0')}`;
    }

    assert.strictEqual(formatTime(undefined), '0:00');
    assert.strictEqual(formatTime(null), '0:00');
    assert.strictEqual(formatTime(NaN), '0:00');
    assert.strictEqual(formatTime(-1000), '0:00');
    assert.strictEqual(formatTime(0), '0:00');
    assert.strictEqual(formatTime(5000), '0:05');
    assert.strictEqual(formatTime(65000), '1:05');
    assert.strictEqual(formatTime(215000), '3:35');
  });

  // Test 12: Progress Bar Time Stamps Display & Remaining Time Formatting
  test('12. Progress time display renders clean separator and supports remaining time toggle', () => {
    function formatTime(ms) {
      if (!ms || isNaN(ms) || ms <= 0) return '0:00';
      const totalSec = Math.floor(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `${min}:${String(sec).padStart(2, '0')}`;
    }

    function formatProgressDisplay(currentMs, durationMs, showRemaining) {
      const curStr = formatTime(currentMs);
      const durStr = showRemaining
        ? `-${formatTime(Math.max(0, durationMs - currentMs))}`
        : formatTime(durationMs);
      return `${curStr} / ${durStr}`;
    }

    // Standard total time mode at 1:15 of 3:45
    assert.strictEqual(formatProgressDisplay(75000, 225000, false), '1:15 / 3:45');

    // Remaining time toggle mode at 1:15 of 3:45 (remaining = 2:30)
    assert.strictEqual(formatProgressDisplay(75000, 225000, true), '1:15 / -2:30');

    // Start of song
    assert.strictEqual(formatProgressDisplay(0, 180000, false), '0:00 / 3:00');
    assert.strictEqual(formatProgressDisplay(0, 180000, true), '0:00 / -3:00');

    // Missing duration fallback
    assert.strictEqual(formatProgressDisplay(0, 0, false), '0:00 / 0:00');
  });

  console.log(`Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runProgressSeekTests();
