/**
 * tests/challenger-stress-harness-r1-r5.test.js
 * Adversarial Stress & Edge Case Harness for R1–R5
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appleMotionJs = require('../src/modules/apple-motion-art.js');
let shareModule = null;
try {
  shareModule = require('../src/modules/share-card.js');
} catch (_) {}

let passed = 0;
let failed = 0;

function stress(title, fn) {
  try {
    fn();
    console.log(`  [STRESS-PASS] ${title}`);
    passed++;
  } catch (e) {
    console.error(`  [STRESS-FAIL] ${title}`);
    console.error(`                ${e.message}`);
    failed++;
  }
}

console.log('\n--- Running Adversarial Stress & Edge Case Harness ---');

// 1. Stress: Malformed & Hostile inputs to cleanString
stress('R1.S1: cleanString handles null, undefined, numeric, emoji, and hostile inputs without crashing', () => {
  assert.strictEqual(appleMotionJs.cleanString(null), '');
  assert.strictEqual(appleMotionJs.cleanString(undefined), '');
  assert.strictEqual(appleMotionJs.cleanString(''), '');
  assert.strictEqual(appleMotionJs.cleanString('   '), '');
  assert.strictEqual(appleMotionJs.cleanString('Drake 🎵🔥'), 'Drake 🎵🔥');
  assert.strictEqual(appleMotionJs.cleanString("B’s On The Table (feat. 21 Savage & Friends)"), "B's On The Table");
  assert.strictEqual(appleMotionJs.cleanString("Drake - Topic"), "Drake");
  assert.strictEqual(appleMotionJs.cleanString("Album [Deluxe Anniversary Edition 2024]"), "Album");
});

// 2. Stress: Mixed-case & Unicode mix keywords in isDisqualifiedAppleCollection
stress('R1.S2: isDisqualifiedAppleCollection handles chaotic casing, unicode brackets, and curator anomalies', () => {
  assert.strictEqual(appleMotionJs.isDisqualifiedAppleCollection("dJ mIx Vol. 1", "DJ Shadow", false, null), true);
  assert.strictEqual(appleMotionJs.isDisqualifiedAppleCollection("PARTY [MIXED]", "Drake", false, null), true);
  assert.strictEqual(appleMotionJs.isDisqualifiedAppleCollection("Drake (mixed)", "Drake", false, null), true);
  assert.strictEqual(appleMotionJs.isDisqualifiedAppleCollection("Summer Continuous Mix", "Drake", false, null), true);
  assert.strictEqual(appleMotionJs.isDisqualifiedAppleCollection("Drake Megamix 2024", "Drake", false, null), true);
  assert.strictEqual(appleMotionJs.isDisqualifiedAppleCollection("Drake Remix Collection", "Drake", false, null), true);
  assert.strictEqual(appleMotionJs.isDisqualifiedAppleCollection("Drake", "Drake", true, null, "Drake"), true); // Compilation
  assert.strictEqual(appleMotionJs.isDisqualifiedAppleCollection("Drake", "Various Artists", false, null, "Drake"), true); // Various Artists
  assert.strictEqual(appleMotionJs.isDisqualifiedAppleCollection("Drake Hits", "Drake", false, "Apple Music Hip-Hop", "Drake"), true); // Curator Apple Music

  // When query IS for compilation or various artists:
  assert.strictEqual(appleMotionJs.isDisqualifiedAppleCollection("Drake Compilation", "Drake", true, null, "Drake Compilation"), false);
  assert.strictEqual(appleMotionJs.isDisqualifiedAppleCollection("Various Artists Hits", "Various Artists", false, null, "Various Artists"), false);
});

if (shareModule) {
// 3. Stress: Scrubber with NaN, null, floating point, and extreme values
stress('R5.S1: updateClipScrubberUI survives NaN, undefined, negative float, and enormous integers', () => {
  const sliderEl = { min: '0', max: '0', value: '0' };
  const displayEl = { textContent: '' };

  global.document = {
    getElementById: (id) => {
      if (id === 'share-kinetic-start-slider') return sliderEl;
      if (id === 'share-clip-time-display') return displayEl;
      return null;
    }
  };

  shareModule.shareState.trackDurationMs = 120000; // 2:00 -> max 110s

  // NaN input -> defaults to 0
  shareModule.updateClipScrubberUI(NaN);
  assert.strictEqual(shareModule.shareState.clipStartSec, 0);
  assert.strictEqual(displayEl.textContent, '0:00 - 0:10');

  // Undefined input -> defaults to 0
  shareModule.updateClipScrubberUI(undefined);
  assert.strictEqual(shareModule.shareState.clipStartSec, 0);

  // Floating point input -> floors to integer
  shareModule.updateClipScrubberUI(45.89);
  assert.strictEqual(shareModule.shareState.clipStartSec, 45);
  assert.strictEqual(displayEl.textContent, '0:45 - 0:55');

  // Enormous float -> clamped to max
  shareModule.updateClipScrubberUI(9999999.9);
  assert.strictEqual(shareModule.shareState.clipStartSec, 110);
  assert.strictEqual(displayEl.textContent, '1:50 - 2:00');

  // Negative float -> clamped to 0
  shareModule.updateClipScrubberUI(-99.5);
  assert.strictEqual(shareModule.shareState.clipStartSec, 0);
  assert.strictEqual(displayEl.textContent, '0:00 - 0:10');
});

// 4. Stress: Zero-duration or sub-10s track duration
stress('R5.S2: updateClipScrubberUI handles zero-length or sub-10s tracks gracefully without negative ranges', () => {
  const sliderEl = { min: '0', max: '0', value: '0' };
  const displayEl = { textContent: '' };

  global.document = {
    getElementById: (id) => {
      if (id === 'share-kinetic-start-slider') return sliderEl;
      if (id === 'share-clip-time-display') return displayEl;
      return null;
    }
  };

  // 0ms track
  shareModule.shareState.trackDurationMs = 0;
  shareModule.updateClipScrubberUI(10);
  // trackDur fallback is 180000 if <= 0
  assert(shareModule.shareState.clipStartSec >= 0);

  // 5000ms track (5 seconds)
  shareModule.shareState.trackDurationMs = 5000;
  shareModule.updateClipScrubberUI(10);
  assert.strictEqual(shareModule.shareState.clipStartSec, 0);
  assert.strictEqual(sliderEl.max, '0');
  assert.strictEqual(displayEl.textContent, '0:00 - 0:10');
});
}

console.log(`\nStress Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
process.exit(0);
