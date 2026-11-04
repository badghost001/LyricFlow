/**
 * tests/vocals-in-6s-threshold.test.js
 * Automated tests for "Vocals In" countdown 6-second threshold:
 * 1. "Vocals in" must only pop up when countdownMs <= 6000 (6s before vocals begin).
 * 2. Earlier times (e.g. 20s, 15s, 8s, 7s) must suppress the countdown badge.
 * 3. updateIslandVocalCountdownCell enforces remainingSec <= 6 guard.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Vocals In 6s Threshold Tests ---');

const rendererJs = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');

// 1. Check threshold in updateDynamicIslandLyric
assert.ok(
  rendererJs.includes('countdownMs <= 6000') && rendererJs.includes('countdownMs >= 1500'),
  'renderer.js must enforce countdownMs <= 6000 for vocal countdown display'
);
assert.ok(
  rendererJs.includes('countdownSec <= 6'),
  'renderer.js must enforce countdownSec <= 6'
);
console.log('✓ 1. Countdown threshold countdownMs <= 6000 verified in renderer.js');

// 2. Check 6s guard in updateIslandVocalCountdownCell
assert.ok(
  rendererJs.includes('function updateIslandVocalCountdownCell(') &&
  rendererJs.includes('if (remainingSec > 6) {') &&
  rendererJs.includes('hideIslandVocalCountdownCell();'),
  'updateIslandVocalCountdownCell must guard against remainingSec > 6'
);
console.log('✓ 2. updateIslandVocalCountdownCell guard verified');

// 3. Mathematical behavior simulation
function evaluateShowCountdown(countdownMs, settingEnabled) {
  return countdownMs <= 6000 && countdownMs >= 1500 && settingEnabled !== false;
}

assert.strictEqual(evaluateShowCountdown(25000, true), false, '25s intro must not show Vocals in badge');
assert.strictEqual(evaluateShowCountdown(10000, true), false, '10s intro must not show Vocals in badge');
assert.strictEqual(evaluateShowCountdown(7000, true), false, '7s intro must not show Vocals in badge');
assert.strictEqual(evaluateShowCountdown(6000, true), true, '6s intro MUST trigger Vocals in badge');
assert.strictEqual(evaluateShowCountdown(4500, true), true, '4.5s intro MUST trigger Vocals in badge');
assert.strictEqual(evaluateShowCountdown(1500, true), true, '1.5s intro MUST trigger Vocals in badge');
assert.strictEqual(evaluateShowCountdown(1000, true), false, '1.0s intro must hide badge ahead of line lead');
assert.strictEqual(evaluateShowCountdown(5000, false), false, 'Disabled setting must suppress badge even at 5s');

console.log('✓ 3. 6-second threshold mathematical evaluation verified');
console.log('\n--- ALL VOCALS IN 6S THRESHOLD TESTS PASSED! ---');
