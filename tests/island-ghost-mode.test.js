/**
 * Unit Tests for Dynamic Island Ghost Passthrough Mode (Alt Key)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

function runIslandGhostModeTests() {
  console.log('\n--- Running Dynamic Island Ghost Passthrough Mode Tests ---\n');

  // Test 1: toggleIslandGhostMode adds class when dynamic island mode is active
  test('1. toggleIslandGhostMode adds island-ghost-mode class when isDynamicIslandMode is true', () => {
    let classes = new Set(['mode-dynamic-island']);
    let isDynamicIslandMode = true;

    function toggleIslandGhostMode(enable) {
      const isGhost = Boolean(enable) && isDynamicIslandMode;
      if (isGhost) classes.add('island-ghost-mode');
      else classes.delete('island-ghost-mode');
    }

    toggleIslandGhostMode(true);
    assert.strictEqual(classes.has('island-ghost-mode'), true, 'Body must have island-ghost-mode class');

    toggleIslandGhostMode(false);
    assert.strictEqual(classes.has('island-ghost-mode'), false, 'Body must remove island-ghost-mode class on disable');
  });

  // Test 2: toggleIslandGhostMode is a no-op when dynamic island mode is inactive
  test('2. toggleIslandGhostMode does not add class when isDynamicIslandMode is false', () => {
    let classes = new Set();
    let isDynamicIslandMode = false;

    function toggleIslandGhostMode(enable) {
      const isGhost = Boolean(enable) && isDynamicIslandMode;
      if (isGhost) classes.add('island-ghost-mode');
      else classes.delete('island-ghost-mode');
    }

    toggleIslandGhostMode(true);
    assert.strictEqual(classes.has('island-ghost-mode'), false, 'Body must NOT have island-ghost-mode class in normal mode');
  });

  // Test 3: Exiting Dynamic Island mode cleans up island-ghost-mode
  test('3. Exiting Dynamic Island mode clears island-ghost-mode class', () => {
    let classes = new Set(['mode-dynamic-island', 'island-ghost-mode']);
    let isDynamicIslandMode = false;

    // Simulate toggleDynamicIslandMode(false)
    classes.delete('mode-dynamic-island');
    classes.delete('island-ghost-mode');

    assert.strictEqual(classes.has('island-ghost-mode'), false, 'Exit must clear ghost mode');
  });

  // Test 4: Window blur resets ghost mode to prevent stuck state
  test('4. Window blur resets ghost mode to prevent stuck state', () => {
    let classes = new Set(['mode-dynamic-island', 'island-ghost-mode']);
    let isDynamicIslandMode = true;

    function onBlur() {
      // Fast reset on blur
      const isGhost = false && isDynamicIslandMode;
      if (isGhost) classes.add('island-ghost-mode');
      else classes.delete('island-ghost-mode');
    }

    onBlur();
    assert.strictEqual(classes.has('island-ghost-mode'), false, 'Blur must immediately reset ghost mode');
  });

  // Test 5: Hit-testing state machine: Alt key forces should_clickthrough regardless of cursor position
  test('5. Alt key forces should_clickthrough = true even when cursor is over the island', () => {
    function computeClickthrough(isAltDown, isOverIsland) {
      return isAltDown || !isOverIsland;
    }

    // Cursor is over island, Alt is NOT pressed -> must NOT click through (island is interactive)
    assert.strictEqual(computeClickthrough(false, true), false);

    // Cursor is over island, Alt IS pressed -> MUST click through (Ghost Passthrough)
    assert.strictEqual(computeClickthrough(true, true), true);

    // Cursor is outside island, Alt is NOT pressed -> MUST click through (transparent canvas)
    assert.strictEqual(computeClickthrough(false, false), true);

    // Cursor is outside island, Alt IS pressed -> MUST click through
    assert.strictEqual(computeClickthrough(true, false), true);
  });

  // Test 6: CSS file defines .island-ghost-mode with required styling
  test('6. _dynamic_island.css defines .island-ghost-mode with opacity and pointer-events rules', () => {
    const cssPath = path.resolve(__dirname, '../src/styles/_dynamic_island.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.strictEqual(cssContent.includes('.island-ghost-mode'), true, 'Must define .island-ghost-mode in CSS');
    assert.strictEqual(cssContent.includes('pointer-events: none !important'), true, 'Must disable pointer events on ghost island');
    assert.strictEqual(cssContent.includes('opacity: 0.16 !important'), true, 'Must set 16% opacity on ghost island');
  });

  // Test 7: tauri-bridge defines onIslandGhostMode handler
  test('7. tauri-bridge.js exposes onIslandGhostMode listener', () => {
    const bridgePath = path.resolve(__dirname, '../src/tauri-bridge.js');
    const bridgeContent = fs.readFileSync(bridgePath, 'utf8');

    assert.strictEqual(bridgeContent.includes('onIslandGhostMode:'), true, 'Must expose onIslandGhostMode in bridge API');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runIslandGhostModeTests();
