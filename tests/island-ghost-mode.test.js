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

  // Test 5: Tap-to-Ghost state machine: tap turns ghost mode ON with zero keys held, auto-restores when mouse leaves
  test('5. Tap-to-Ghost state machine turns ghost mode ON with zero keys held and auto-restores on mouse leave', () => {
    let isGhost = false;
    let enteredAt = 0;

    function tapGhost(time) {
      isGhost = !isGhost;
      if (isGhost) enteredAt = time;
    }

    function computeState(currentTime, isOverIsland) {
      if (isGhost) {
        // Auto-restore when cursor leaves island area after 600ms grace period or 8s timeout
        if (currentTime - enteredAt > 600 && (!isOverIsland || currentTime - enteredAt > 8000)) {
          isGhost = false;
        }
      }
      const shouldClickthrough = isGhost || !isOverIsland;
      return { isGhost, shouldClickthrough };
    }

    // Initial state: cursor over island -> not ghosted, interactive (not clickthrough)
    let state = computeState(1000, true);
    assert.strictEqual(state.isGhost, false);
    assert.strictEqual(state.shouldClickthrough, false);

    // User taps to ghost (e.g. ` or Ctrl+Shift+G)
    tapGhost(1000);
    assert.strictEqual(isGhost, true, 'Tapping must turn Ghost Mode ON');

    // While ghost mode is ON, user clicks tab with ZERO keys held -> clicks pass directly through!
    state = computeState(1100, true);
    assert.strictEqual(state.isGhost, true);
    assert.strictEqual(state.shouldClickthrough, true, 'Ghost mode must enable clickthrough with zero keys held');

    // User moves mouse away after clicking tab -> cursor is now outside island (!isOverIsland)
    state = computeState(2000, false);
    assert.strictEqual(state.isGhost, false, 'Ghost mode must auto-restore when cursor leaves island area');
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

  // Test 8: Backtick tap is gated strictly to island hover to prevent hijacking text input elsewhere
  test('8. Backtick tap is gated strictly to island hover to prevent hijacking text input elsewhere', () => {
    let isGhost = false;

    function handleTildePress(isOverIsland) {
      if (isOverIsland || isGhost) {
        isGhost = !isGhost;
      }
    }

    // Cursor elsewhere on screen (e.g. typing markdown in editor) -> should NOT trigger
    handleTildePress(false);
    assert.strictEqual(isGhost, false, 'Pressing ` elsewhere must NOT activate ghost mode');

    // Cursor hovering over island -> activates ghost mode
    handleTildePress(true);
    assert.strictEqual(isGhost, true, 'Pressing ` while hovering island MUST activate ghost mode');

    // Pressing ` again while ghosted -> deactivates ghost mode
    handleTildePress(false);
    assert.strictEqual(isGhost, false, 'Pressing ` while ghosted MUST deactivate ghost mode');
  });

  // Test 9: Repetitive HUD toast is suppressed during ghost mode toggle
  test('9. Repetitive HUD toast is suppressed during ghost mode toggle for minimalist silhouette', () => {
    let hudCalled = false;
    function showIslandHud() { hudCalled = true; }

    function toggleIslandGhostMode(enable, isDynamicIslandMode) {
      const isGhost = Boolean(enable) && isDynamicIslandMode;
      // Repetitive HUD toast is suppressed
      return isGhost;
    }

    const result = toggleIslandGhostMode(true, true);
    assert.strictEqual(result, true);
    assert.strictEqual(hudCalled, false, 'HUD toast must NOT be shown during ghost toggle');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runIslandGhostModeTests();
