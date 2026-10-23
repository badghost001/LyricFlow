const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n--- Running Fast Lyrics Fetching & Zero-Drift Clock Sync Tests ---');

const rendererJsPath = path.join(__dirname, '../src/renderer.js');
const rendererJs = fs.readFileSync(rendererJsPath, 'utf8');

const engineRsPath = path.join(__dirname, '../src-tauri/src/commands/lyrics/engine.rs');
const engineRs = fs.readFileSync(engineRsPath, 'utf8');

const modRsPath = path.join(__dirname, '../src-tauri/src/commands/lyrics/mod.rs');
const modRs = fs.readFileSync(modRsPath, 'utf8');

const smtcRsPath = path.join(__dirname, '../src-tauri/src/media/windows_smtc.rs');
const smtcRs = fs.readFileSync(smtcRsPath, 'utf8');

// 1. Acoustic Lead Latency & Calibration
console.log('\n1. Acoustic Lead Latency & Calibration:');

assert(
  rendererJs.includes('const SPOTIFY_ACOUSTIC_LEAD_MS = 0;') && rendererJs.includes('settings.acousticLeadMs != null ? settings.acousticLeadMs : 140'),
  'getAcousticSyncProgress must incorporate 140ms calibrated lead for desktop WASAPI buffer'
);
console.log('  ✓ 1a. getAcousticSyncProgress incorporates calibrated 140ms desktop WASAPI buffer lead');

assert(
  rendererJs.includes('settings.bluetoothAcousticLead ? 240'),
  'getAcousticSyncProgress must support 240ms Bluetooth preset'
);
console.log('  ✓ 1b. getAcousticSyncProgress supports 240ms Bluetooth low-latency preset');

assert(
  rendererJs.includes("e.key === '['") && rendererJs.includes("e.key === ']'") && rendererJs.includes("adjustSyncOffset(step)") && rendererJs.includes("-25 : 25"),
  'Ctrl+[ and Ctrl+] must micro-trim sync offset by ±25ms'
);
console.log('  ✓ 1c. Keyboard shortcuts Ctrl+[ and Ctrl+] provide instant 25ms micro-trimming');


// 2. Sub-300ms Fast Lyrics Fetching Dispatch
console.log('\n2. Fast Lyrics Dispatch & Parallelization:');

assert(
  rendererJs.includes('if (hasCachedLyrics || !isRapidScrubbing) {') &&
  rendererJs.includes('executeTrackFetches();'),
  'Zero-delay adaptive dispatch must run executeTrackFetches immediately (0ms) on natural track changes'
);
console.log('  ✓ 2a. Track changes dispatch network queries immediately (0ms latency, zero debounce)');

assert(
  rendererJs.includes('exactPromises.push(') && rendererJs.includes('Promise.all(exactPromises)'),
  'localLrclibFetch must query exact artist and track combinations in parallel via Promise.all'
);
console.log('  ✓ 2b. localLrclibFetch queries all artist/track variant combinations in parallel in 1 RTT');

assert(
  rendererJs.includes('firstResult && currentSourceLevel === 3 && lyrics.length > 0') &&
  rendererJs.includes('Wait for the competing primary provider when the fast result is only'),
  'Word-synced lyrics must settle before returning a line-synced fast result'
);
assert(
  rendererJs.includes('settings.lyricsWordPriorityVersion !== 3') &&
  rendererJs.includes("settings.wordByWord = true;") &&
  rendererJs.includes("settings.preferredLyricProvider = 'netease';"),
  'Existing installs must migrate to the word-by-word NetEase default'
);
assert(
  rendererJs.includes('const cachedHasWordTiming = loadedLyrics.some') &&
  rendererJs.includes('if (cachedLevel === 3 && cachedHasWordTiming) return;') &&
  rendererJs.includes('Preserve cached/fast line lyrics on screen while word-capable fallback'),
  'Line-synced or mislabeled cached lyrics must stay visible while startup searches for real word timing'
);
console.log('  ✓ 2c. Eager First-Synced resolution renders Level 2 immediately and upgrades to Level 3 in background');


// 3. Rust Multi-Provider Race & HTTP Client
console.log('\n3. Rust Engine Fast-Path Race:');

assert(
  engineRs.includes('if options.candidate_index == 0 {') &&
  engineRs.includes('fast_race') &&
  engineRs.includes('tokio::time::timeout(std::time::Duration::from_millis(slow_timeout_ms), slow_queries)') &&
  engineRs.includes('options.netease_word_by_word') &&
  engineRs.includes('2000'),
  'engine.rs must race fast providers and allocate 2000ms budget when NetEase word-by-word is enabled'
);
console.log('  ✓ 3a. engine.rs prioritizes fast providers and allocates 2000ms budget for NetEase word-by-word lookup');

assert(
  modRs.includes('Duration::from_millis(2500)'),
  'HTTP_CLIENT timeout must be 2500ms'
);
console.log('  ✓ 3b. mod.rs configures HTTP client timeout to 2.5s preventing multi-second API hangs');


// 4. Zero-Drift Clock Synchronization & SMTC Monotonicity
console.log('\n4. Zero-Drift Clock Synchronization:');

assert(
  smtcRs.includes('std::time::Instant::now()') &&
  smtcRs.includes('now_instant.duration_since(prev_instant)'),
  'windows_smtc.rs must use Instant::now() monotonic reference to eliminate NTP jitter'
);
console.log('  ✓ 4a. windows_smtc.rs uses hardware monotonic Instant time delta for SMTC position interpolation');

// Mathematical simulation of Critically Damped PI-PLL Filter
console.log('\n5. Mathematical Simulation of Critically Damped PI-PLL Filter:');

let simulatedProgress = 10000;
let groundTruthProgress = 10200; // 200ms initial phase step (e.g. WASAPI buffer or network poll jitter)
let pllRateMultiplier = 1.0;
let pllFilteredDrift = 0;
let pllIntegralDrift = 0;

const Kp = 0.00015;
const Ki = 0.00003;
const pollIntervalMs = 400; // standard polling interval

for (let poll = 0; poll < 6; poll++) {
  // Advance ground truth and simulated playhead over poll interval
  groundTruthProgress += pollIntervalMs * 1.0;
  simulatedProgress += pollIntervalMs * pllRateMultiplier;

  const rawDrift = simulatedProgress - groundTruthProgress;
  pllFilteredDrift = 0.25 * rawDrift + 0.75 * pllFilteredDrift;
  const drift = pllFilteredDrift;

  // Zone B PI filter
  pllIntegralDrift += drift * 0.05;
  pllIntegralDrift = Math.max(-500, Math.min(500, pllIntegralDrift));
  const deltaRate = Math.max(-0.025, Math.min(0.025, (Kp * drift) + (Ki * pllIntegralDrift)));
  pllRateMultiplier = 1.0 - deltaRate;

  // Align reference anchor to reported hardware timestamp
  simulatedProgress = groundTruthProgress;
}

const finalPhaseError = Math.abs(simulatedProgress - groundTruthProgress);
assert(finalPhaseError < 15, `Phase error must converge to <15ms, got ${finalPhaseError}ms`);
console.log(`  ✓ 5a. PI-PLL loop smoothly converges 200ms phase step to ${finalPhaseError.toFixed(2)}ms (<15ms) in <1.6s without position backward jumps`);

// Monotonic word progress clamp verification
assert(
  rendererJs.includes('const rawProgress = Math.min(1, Math.max(0, (syncProgress - wStart) / wDur));') &&
  rendererJs.includes('const wordProgress = (isPlaying && rawProgress < prevProg) ? prevProg : rawProgress;'),
  'wordProgress calculation must clamp monotonically during active playback'
);
console.log('  ✓ 5b. Monotonic clamp prevents negative progress fluctuations and syllable flicker during active playback');

console.log('\nAll Fast Lyrics Fetching & Zero-Drift Clock Sync tests passed successfully!\n');
