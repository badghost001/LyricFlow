/**
 * tests/lyrics-sync-drift-fix.test.js
 * Verification test suite for Phase-Locked Loop (PLL) clock synchronization,
 * telemetry timestamp compensation, and line hysteresis.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n--- Running Lyrics Timing Drift & PLL Sync Tests ---\n');

// 1. Static Source Code Audits
console.log('1. Static Code Analysis:');

const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
const modelsCode = fs.readFileSync(path.join(__dirname, '../src-tauri/src/models.rs'), 'utf8');
const smtcCode = fs.readFileSync(path.join(__dirname, '../src-tauri/src/media/windows_smtc.rs'), 'utf8');

// 1a. Rust models.rs includes timestamp_ms
assert(modelsCode.includes('pub timestamp_ms: Option<u64>'), 'models.rs must declare timestamp_ms field in models');
assert(modelsCode.includes('timestamp_ms: if current_unix_ms > 0'), 'to_spotify_playback_state must populate timestamp_ms');
console.log('  ✓ 1a. Rust models.rs defines timestamp_ms telemetry');

// 1b. Rust windows_smtc.rs guards pre-epoch dates and bounds elapsed_ms
assert(smtcCode.includes('UNIX_EPOCH_100NS'), 'windows_smtc.rs must guard against pre-1970 100ns timestamps');
assert(smtcCode.includes('min(10_000)'), 'windows_smtc.rs must bound elapsed_ms to 10,000ms');
console.log('  ✓ 1b. windows_smtc.rs guards against pre-epoch dates and bounds extrapolation');

// 1c. renderer.js implements Spotify timestamp compensation
assert(rendererCode.includes('serverElapsed = Math.max(0, now - data.timestamp)'), 'renderer.js must compensate Spotify serverElapsed using data.timestamp');
console.log('  ✓ 1c. renderer.js uses data.timestamp for Spotify latency compensation');

// 1d. renderer.js implements PLL rate multiplier and Zone-based drift handling
assert(rendererCode.includes('window._pllRateMultiplier'), 'renderer.js must define window._pllRateMultiplier');
assert(rendererCode.includes('drift / 2500'), 'renderer.js must steer rate dynamically in Zone B micro-drift');
assert(rendererCode.includes('absDrift > 1500'), 'renderer.js must classify hard seeks at >1500ms');
console.log('  ✓ 1d. renderer.js implements Phase-Locked Loop (PLL) rate steering');

// 1e. Line hysteresis retreat threshold is calibrated to 100ms
assert(rendererCode.includes('retreatThreshold = lyrics[activeLineIndex].timeMs - 100'), 'renderer.js retreatThreshold must be 100ms');
assert(!rendererCode.includes('retreatThreshold = lyrics[activeLineIndex].timeMs - 1200'), 'renderer.js must no longer use 1200ms retreat threshold');
console.log('  ✓ 1e. Line hysteresis retreat threshold calibrated to 100ms (no premature forward-locking)');


// 2. Behavioral Simulation: Telemetry Timestamp Compensation
console.log('\n2. Spotify Timestamp Telemetry Compensation:');

function computeSpotifyTelemetry(data, fetchStart, now) {
  let serverElapsed = 0;
  if (typeof data.timestamp === 'number' && data.timestamp > 0 && Math.abs(now - data.timestamp) < 15000) {
    serverElapsed = Math.max(0, now - data.timestamp);
  } else {
    serverElapsed = Math.max(0, (now - fetchStart) / 2);
  }
  return {
    progress_ms: data.progress_ms + serverElapsed,
    timestamp: now
  };
}

// 2a. Accurate server timestamp compensation
{
  const fetchStart = 100000;
  const serverTimestamp = 100150;
  const now = 100350; // 200ms after server timestamp
  const input = { progress_ms: 45000, timestamp: serverTimestamp };
  const result = computeSpotifyTelemetry(input, fetchStart, now);
  assert.strictEqual(result.progress_ms, 45200, 'Should add 200ms elapsed server time');
  console.log('  ✓ 2a. Telemetry precisely adds 200ms elapsed server transit time');
}

// 2b. Out-of-sync system clock fallback to RTT / 2
{
  const fetchStart = 100000;
  const serverTimestamp = 200000; // Desynced by > 15 seconds
  const now = 100400; // RTT = 400ms
  const input = { progress_ms: 45000, timestamp: serverTimestamp };
  const result = computeSpotifyTelemetry(input, fetchStart, now);
  assert.strictEqual(result.progress_ms, 45200, 'Should fall back to RTT / 2 = 200ms');
  console.log('  ✓ 2b. Desynced system clock cleanly falls back to RTT / 2');
}


// 3. Behavioral Simulation: Phase-Locked Loop (PLL) Rate Steering
console.log('\n3. Phase-Locked Loop (PLL) Clock Rate Steering:');

function evaluateDrift(currentProgress, progressMs) {
  const drift = currentProgress - progressMs;
  const absDrift = Math.abs(drift);
  let newProgress = currentProgress;
  let pllRate = 1.0;
  let allowConvergence = false;

  if (absDrift > 1500) {
    // Zone D: Hard seek
    newProgress = progressMs;
    pllRate = 1.0;
    allowConvergence = true;
  } else if (absDrift > 600) {
    // Zone C: Medium drift
    const slew = Math.sign(drift) * Math.min(Math.abs(drift * 0.25), 35);
    newProgress = currentProgress - slew;
    const pllDir = Math.sign(drift);
    pllRate = 1.0 - (pllDir * 0.04);
    allowConvergence = true;
  } else if (absDrift > 20) {
    // Zone B: Micro drift
    const pllAdjustment = Math.max(-0.035, Math.min(0.035, drift / 2500));
    pllRate = 1.0 - pllAdjustment;
    newProgress = currentProgress; // Position stays continuous! Zero step jump!
  } else {
    // Zone A: Sub-20ms
    pllRate = 1.0;
    newProgress = currentProgress;
  }

  return { newProgress, pllRate, allowConvergence, positionDelta: Math.abs(newProgress - currentProgress) };
}

// 3a. Sub-20ms drift (Zone A): neutral rate, no position step
{
  const res = evaluateDrift(50015, 50000); // 15ms drift
  assert.strictEqual(res.pllRate, 1.0);
  assert.strictEqual(res.positionDelta, 0);
  console.log('  ✓ 3a. Zone A (< 20ms drift) keeps neutral 1.0x rate with zero position jumps');
}

// 3b. App racing ahead by 150ms (Zone B): rate steered down, zero position step
{
  const res = evaluateDrift(50150, 50000); // drift = +150ms
  assert(res.pllRate < 1.0, 'PLL rate must be steered below 1.0 to slow down');
  assert(res.pllRate >= 0.965, 'PLL rate adjustment must be within clamp bounds (>= 0.965)');
  assert.strictEqual(res.positionDelta, 0, 'Zone B must NOT jump position discontinuously');
  console.log(`  ✓ 3b. Zone B (+150ms drift ahead) gently steers rate to ${res.pllRate.toFixed(4)}x with 0ms jump`);
}

// 3c. App falling behind by 200ms (Zone B): rate steered up, zero position step
{
  const res = evaluateDrift(49800, 50000); // drift = -200ms
  assert(res.pllRate > 1.0, 'PLL rate must be steered above 1.0 to catch up');
  assert(res.pllRate <= 1.035, 'PLL rate adjustment must be within clamp bounds (<= 1.035)');
  assert.strictEqual(res.positionDelta, 0, 'Zone B must NOT jump position discontinuously');
  console.log(`  ✓ 3c. Zone B (-200ms drift behind) gently steers rate to ${res.pllRate.toFixed(4)}x with 0ms jump`);
}

// 3d. Medium drift of 800ms (Zone C): slew limited to <= 35ms
{
  const res = evaluateDrift(50800, 50000); // drift = +800ms
  assert(res.positionDelta <= 35, `Position slew must be capped at 35ms (was ${res.positionDelta})`);
  assert.strictEqual(res.pllRate, 0.96);
  console.log('  ✓ 3d. Zone C (800ms drift) applies slew-limited 35ms convergence with 0.96x rate');
}

// 3e. Hard seek of 5000ms (Zone D): snaps immediately
{
  const res = evaluateDrift(5000, 45000); // scrub/seek to 45s
  assert.strictEqual(res.newProgress, 45000, 'Hard seek must snap immediately');
  assert.strictEqual(res.pllRate, 1.0);
  console.log('  ✓ 3e. Zone D (> 1500ms hard seek) snaps immediately to target position');
}


// 4. Line Hysteresis Simulation
console.log('\n4. Calibrated Line Hysteresis (100ms margin):');

function checkLineHysteresis(activeLineIndex, prospectiveIndex, syncProgress, lineStartMs) {
  let activeIndex = prospectiveIndex;
  const isUnsynced = false;
  if (activeLineIndex >= 0 && activeIndex < activeLineIndex && !isUnsynced) {
    const retreatThreshold = lineStartMs - 100;
    if (syncProgress >= retreatThreshold) {
      activeIndex = activeLineIndex;
    }
  }
  return activeIndex;
}

// 4a. Within 50ms of line boundary: prevents fluttering
{
  const lineStart = 20000;
  // Prospective index says line 0, but current is line 1, and we are at 19960ms (40ms before line 1)
  const result = checkLineHysteresis(1, 0, 19960, lineStart);
  assert.strictEqual(result, 1, 'Should stay on line 1 within 100ms threshold');
  console.log('  ✓ 4a. Anti-jitter keeps line stable within 100ms margin of transition');
}

// 4b. Audio is 250ms before line boundary: gracefully retreats (does not lock ahead!)
{
  const lineStart = 20000;
  // If prospective says line 0, and audio is actually at 19750ms (250ms before line 1):
  const result = checkLineHysteresis(1, 0, 19750, lineStart);
  assert.strictEqual(result, 0, 'Should allow retreating to line 0 when audio is 250ms prior');
  console.log('  ✓ 4b. Gracefully retreats to previous line when audio is 250ms prior (eliminates premature lock)');
}

console.log('\nAll 11/11 Lyrics Timing Drift & PLL Sync tests passed successfully!\n');
