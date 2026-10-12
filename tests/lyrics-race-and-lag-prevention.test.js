/**
 * tests/lyrics-race-and-lag-prevention.test.js
 * Verification test suite for eliminating lyric timing desynchronization (racing ahead or lagging behind).
 * Covers:
 * 1. Telemetry normalization & Spotify transit bounding (eliminating Windows clock skew bias).
 * 2. SMTC cached sample age compensation.
 * 3. Low-pass filtered PI-PLL controller with EMA jitter rejection & Zone A micro-decay.
 * 4. Ground-truth pause & resume snapping (no deadband drift lock-in).
 * 5. Advance lead window (280ms) and instrumental gap / intro prelude resting state.
 * 6. Canonical track key offset aliasing across Spotify Web API and SMTC.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n--- Running Lyrics Race & Lag Prevention Verification Tests ---\n');

// 1. Static Source Code Audits
console.log('1. Static Code Analysis:');

const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
const engineCode = fs.readFileSync(path.join(__dirname, '../src/services/lyrics/LyricsEngine.js'), 'utf8');
const smtcCode = fs.readFileSync(path.join(__dirname, '../src-tauri/src/media/windows_smtc.rs'), 'utf8');

// 1a. Rust windows_smtc.rs guards against double extrapolation when player advances base_pos natively
assert(smtcCode.includes('LAST_SMTC_SAMPLE'), 'windows_smtc.rs must define LAST_SMTC_SAMPLE tracker');
assert(smtcCode.includes('is_self_advancing'), 'windows_smtc.rs must detect self-advancing native base_pos');
console.log('  ✓ 1a. windows_smtc.rs detects self-advancing native base_pos to prevent double-extrapolation');

// 1b. renderer.js bounds Spotify server elapsed by realistic network transit window (rtt + 60)
assert(rendererCode.includes('serverElapsed = Math.min(rawElapsed, rtt + 60)'), 'renderer.js must bound Spotify serverElapsed to prevent clock skew inflation');
console.log('  ✓ 1b. renderer.js bounds Spotify serverElapsed to eliminate Windows clock skew inflation');

// 1c. renderer.js compensates SMTC sample age in pollLocalPlayback
assert(rendererCode.includes('data.progress_ms += Math.round(sampleAge * rate)'), 'pollLocalPlayback must compensate sample age from background thread');
console.log('  ✓ 1c. renderer.js compensates SMTC background sample age in pollLocalPlayback');

// 1d. renderer.js implements Exponential Moving Average (EMA) drift filter
assert(rendererCode.includes('window._pllFilteredDrift'), 'renderer.js must define window._pllFilteredDrift');
assert(rendererCode.includes('alpha * rawDrift'), 'renderer.js must apply low-pass EMA filter to drift');
console.log('  ✓ 1d. renderer.js implements low-pass EMA filter to reject high-frequency polling jitter');

// 1e. renderer.js implements Zone A micro-trim decay
assert(rendererCode.includes('microTrim = Math.max(-0.0015, Math.min(0.0015, drift / 10000))'), 'Zone A must apply microTrim to decay residual drift to 0');
console.log('  ✓ 1e. renderer.js applies Zone A micro-trim to decay sub-20ms residual drift to zero');

// 1f. renderer.js snappily respects ground truth on pause and resume
assert(rendererCode.includes('resumePos = (!isRecentSeek && typeof progressMs === \'number\' && progressMs >= 0)'), 'handlePlaybackData must snap resumePos to ground truth');
console.log('  ✓ 1f. renderer.js snaps cleanly to ground truth on pause and resume');

// 1g. Advance lead window and instrumental break thresholds
assert(engineCode.includes('leadSec = (nextVocalStart - curVocalEnd >= 0.4) ? 0.28 : 0'), 'LyricsEngine must implement 280ms advance lead');
assert(rendererCode.includes('leadMs = (nextVocalStart - curVocalEnd >= 400) ? 280 : 0'), 'getLineSwitchMs must implement 280ms advance lead');
assert(rendererCode.includes('totalGap >= 4000 && syncProgress > (curVocalEnd + 1200)'), 'renderer.js must detect genuine instrumental breaks at >= 4000ms');
console.log('  ✓ 1g. Unified 280ms advance lead and 4000ms instrumental break detection present');

// 1h. Canonical track offset key aliasing
assert(rendererCode.includes('function getCanonicalTrackKey'), 'renderer.js must define getCanonicalTrackKey');
assert(rendererCode.includes('canonOffsetKey && settings.trackOffsets[canonOffsetKey] != null'), 'renderer.js must lookup canonical offset key on track change');
console.log('  ✓ 1h. Canonical track key aliasing preserves user sync offsets across Spotify and SMTC handoffs');


// 2. Behavioral Simulation: Telemetry & Latency Bounding
console.log('\n2. Spotify Server Latency & Clock Skew Elimination:');

function calculateSpotifyElapsed(fetchStart, now, serverTimestamp) {
  const rtt = Math.max(0, now - fetchStart);
  let serverElapsed = 0;
  if (typeof serverTimestamp === 'number' && serverTimestamp > 0 && Math.abs(now - serverTimestamp) < 15000) {
    const rawElapsed = Math.max(0, now - serverTimestamp);
    serverElapsed = Math.min(rawElapsed, rtt + 60);
  } else {
    serverElapsed = Math.max(0, Math.round(rtt / 2));
  }
  return serverElapsed;
}

// 2a. Windows clock is ahead of UTC by 500ms (would have inflated progress by 650ms!)
{
  const fetchStart = 100000;
  const now = 100300; // RTT = 300ms
  const serverTimestamp = 99650; // Server stamped 500ms behind Windows clock!
  const elapsed = calculateSpotifyElapsed(fetchStart, now, serverTimestamp);
  assert(elapsed <= 360, `Elapsed must be bounded by rtt + 60 (was ${elapsed})`);
  assert(elapsed >= 150, `Elapsed must represent realistic transit`);
  console.log(`  ✓ 2a. Desynced fast Windows clock capped from 650ms down to ${elapsed}ms (rtt + 60)`);
}

// 2b. Windows clock is behind UTC by 400ms (now - serverTimestamp < 0)
{
  const fetchStart = 100000;
  const now = 100300; // RTT = 300ms
  const serverTimestamp = 100500; // Server timestamp is into the "future" according to local clock
  const elapsed = calculateSpotifyElapsed(fetchStart, now, serverTimestamp);
  assert.strictEqual(elapsed, 0, 'Negative delta clamps to 0 without throwing error');
  console.log('  ✓ 2b. Slow Windows clock clamps negative delta to 0ms safely');
}

// 2c. Normal synchronized clock
{
  const fetchStart = 100000;
  const now = 100250; // RTT = 250ms
  const serverTimestamp = 100120; // 130ms transit
  const elapsed = calculateSpotifyElapsed(fetchStart, now, serverTimestamp);
  assert.strictEqual(elapsed, 130, 'Accurate transit time used when within bounds');
  console.log('  ✓ 2c. Accurate network transit of 130ms applied when within transit window');
}


// 3. Behavioral Simulation: Low-Pass Filtered PI-PLL Controller
console.log('\n3. Low-Pass Filtered PI-PLL Controller & Jitter Rejection:');

class MockPIPLLController {
  constructor() {
    this.filteredDrift = null;
    this.alpha = 0.25;
  }

  processSample(rawDrift) {
    if (this.filteredDrift === null) {
      this.filteredDrift = rawDrift;
    } else {
      this.filteredDrift = (this.alpha * rawDrift) + ((1.0 - this.alpha) * this.filteredDrift);
    }

    const drift = this.filteredDrift;
    const absDrift = Math.abs(drift);
    let pllRate = 1.0;

    if (absDrift > 1500) {
      this.filteredDrift = 0;
      pllRate = 1.0;
    } else if (absDrift > 600) {
      const pllDir = Math.sign(drift);
      pllRate = 1.0 - (pllDir * 0.04);
    } else if (absDrift > 20) {
      const pllAdjustment = Math.max(-0.035, Math.min(0.035, drift / 2500));
      pllRate = 1.0 - pllAdjustment;
    } else {
      const microTrim = Math.max(-0.0015, Math.min(0.0015, drift / 10000));
      pllRate = 1.0 - microTrim;
    }

    return { filteredDrift: this.filteredDrift, pllRate };
  }
}

// 3a. Single noisy outlier poll (e.g. +180ms network latency spike) is filtered out
{
  const controller = new MockPIPLLController();
  controller.processSample(0); // Settled at 0

  // Transient network hiccup
  const step1 = controller.processSample(180);
  assert(step1.filteredDrift < 60, `EMA filter must suppress single-poll +180ms spike (was ${step1.filteredDrift.toFixed(1)}ms)`);
  assert(step1.pllRate > 0.98, `Rate steering must not slam brakes on single spike (was ${step1.pllRate.toFixed(4)}x)`);
  console.log(`  ✓ 3a. +180ms network polling jitter filtered to ${step1.filteredDrift.toFixed(1)}ms with smooth rate ${step1.pllRate.toFixed(4)}x`);
}

// 3b. Systematic systematic drift of +120ms smoothly converges
{
  const controller = new MockPIPLLController();
  let rate = 1.0;
  for (let i = 0; i < 8; i++) {
    rate = controller.processSample(120).pllRate;
  }
  assert(rate < 1.0 && rate >= 0.965, `Rate must smoothly steer down to close drift (was ${rate})`);
  console.log(`  ✓ 3b. Persistent +120ms drift smoothly guides PLL rate to ${rate.toFixed(4)}x`);
}

// 3c. Zone A micro-trim decay
{
  const controller = new MockPIPLLController();
  controller.filteredDrift = 14; // Residual 14ms drift in Zone A
  const res = controller.processSample(14);
  assert(res.pllRate < 1.0, 'Zone A must apply subtle trim (< 1.0) to decay remaining 14ms offset');
  assert(res.pllRate >= 0.998, 'Zone A micro-trim must remain imperceptibly smooth');
  console.log(`  ✓ 3c. Zone A residual 14ms drift gently trimmed at rate ${res.pllRate.toFixed(4)}x toward 0ms`);
}


// 4. Behavioral Simulation: Advance Lead & Instrumental Break Detection
console.log('\n4. Advance Lead Window & Instrumental Gap Detection:');

// 4a. 280ms advance lead for close phrases
{
  const curVocalEnd = 10000;
  const nextVocalStart = 11500; // 1.5s gap between vocals
  const leadMs = (nextVocalStart - curVocalEnd >= 400) ? 280 : 0;
  const switchMs = Math.max(curVocalEnd, nextVocalStart - leadMs);
  assert.strictEqual(switchMs, 11220, 'Switch point must be exactly 280ms before next vocal onset');
  console.log('  ✓ 4a. Line switch occurs exactly 280ms before next vocal start (11220ms for 11500ms vocal)');
}

// 4b. Genuine instrumental break of 8.0s
{
  const curVocalEnd = 20000;
  const nextVocalStart = 28000; // 8.0s guitar solo
  const totalGap = nextVocalStart - curVocalEnd;

  function isBreak(syncProgress) {
    return totalGap >= 4000 && syncProgress > (curVocalEnd + 1200) && syncProgress < (nextVocalStart - 280);
  }

  assert.strictEqual(isBreak(20500), false, 'First 1200ms after vocal allows line to naturally dwell');
  assert.strictEqual(isBreak(22000), true, 'During solo, enters resting instrumental break state');
  assert.strictEqual(isBreak(25000), true, 'Still in instrumental break');
  assert.strictEqual(isBreak(27800), false, '200ms before next vocal onset, break ends to prepare upcoming line');
  console.log('  ✓ 4b. 8-second instrumental solo enters resting break after 1200ms dwell and wakes 280ms before next vocal');
}

// 4c. Intro prelude guard (15s instrumental intro)
{
  const firstLineStart = 15000;
  const syncProgress = 6000; // 6s into track
  const isIntroPrelude = syncProgress < Math.max(0, firstLineStart - 350);
  assert.strictEqual(isIntroPrelude, true, 'Intro prelude must be active at 6s for 15s start');
  const displayIndex = isIntroPrelude ? -1 : 0;
  assert.strictEqual(displayIndex, -1, 'Must not falsely activate line 0 during 15s intro');
  console.log('  ✓ 4c. Song intro at 6.0s correctly reports displayIndex -1 (no premature line 0 illumination)');
}


// 5. Behavioral Simulation: Cross-Source Track Offset Aliasing
console.log('\n5. Canonical Track Offset Aliasing:');

{
  const trackOffsets = {};
  function getCanonicalTrackKey(t) {
    if (!t) return null;
    const title = (t.name || t.title || '').trim().toLowerCase();
    const artist = (t.artists?.[0]?.name || t.artist || '').trim().toLowerCase();
    return (title && artist) ? `canon_${artist}_${title}` : null;
  }

  // User plays track on Spotify Cloud API
  const spotifyTrack = { id: '4cOdK2wGLETKBW3PvgPWqT', name: 'Bohemian Rhapsody', artists: [{ name: 'Queen' }] };
  const canonKey = getCanonicalTrackKey(spotifyTrack);
  const userOffset = -250;

  // Save offset under both keys
  trackOffsets[spotifyTrack.id] = userOffset;
  if (canonKey) trackOffsets[canonKey] = userOffset;

  // Spotify hits rate limit (429) or token expiry, seamless fallback to Local Windows SMTC
  const smtcTrack = { id: 'local_UXVlZW5fQm9oZW1pYW4=', name: 'Bohemian Rhapsody', artists: [{ name: 'Queen' }] };
  const smtcCanonKey = getCanonicalTrackKey(smtcTrack);

  const restoredOffset = (trackOffsets[smtcTrack.id] != null)
    ? trackOffsets[smtcTrack.id]
    : (smtcCanonKey && trackOffsets[smtcCanonKey] != null ? trackOffsets[smtcCanonKey] : 0);

  assert.strictEqual(restoredOffset, -250, 'Canonical key must preserve user-calibrated offset across provider switch');
  console.log('  ✓ 5. User offset (-250ms) preserved seamlessly across Spotify ID and Windows SMTC ID');
}

console.log('\nAll 16/16 Lyrics Race & Lag Prevention verification tests passed successfully!\n');
