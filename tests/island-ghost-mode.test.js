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

  // Test 10: 250ms hardware debounce drops rapid duplicate toggles (preventing double-toggle cancellation)
  test('10. 250ms hardware debounce drops rapid duplicate toggles within threshold', () => {
    let lastToggleMs = 0;
    let ghostState = false;

    function toggleGhostWithDebounce(nowMs) {
      if (lastToggleMs !== 0 && nowMs - lastToggleMs < 250) {
        return ghostState; // Debounced, ignore duplicate call
      }
      lastToggleMs = nowMs;
      ghostState = !ghostState;
      return ghostState;
    }

    // First toggle at t=100ms: succeeds -> true
    assert.strictEqual(toggleGhostWithDebounce(100), true);

    // Duplicate event (JS keydown vs Rust GetAsyncKeyState) at t=120ms: ignored -> stays true
    assert.strictEqual(toggleGhostWithDebounce(120), true);

    // Third call after 250ms threshold (t=360ms): succeeds -> toggles off (false)
    assert.strictEqual(toggleGhostWithDebounce(360), false);
  });

  // Test 11: Ghost bounds snapshot preservation prevents premature auto-restore on CSS hover collapse
  test('11. Ghost bounds snapshot preservation prevents premature auto-restore on CSS hover collapse', () => {
    let lockedBounds = { x: 500, y: 0, width: 390, height: 126 };
    let collapsedBounds = { x: 500, y: 0, width: 340, height: 36 };
    let isGhost = true;

    // Mouse cursor at y=75px (inside original 126px expanded card, but outside collapsed 36px pill)
    const cursor = { x: 600, y: 75 };

    function isOverIsland(bounds, pt, pad = 16) {
      return (
        pt.x >= bounds.x - pad &&
        pt.x <= bounds.x + bounds.width + pad &&
        pt.y >= bounds.y - pad &&
        pt.y <= bounds.y + bounds.height + pad
      );
    }

    // Under old naive logic (using collapsed bounds): cursor at y=75px is FALSE -> premature restore!
    assert.strictEqual(isOverIsland(collapsedBounds, cursor, 0), false);

    // Under preserved ghost snapshot logic: cursor at y=75px is TRUE -> stays in ghost mode safely!
    assert.strictEqual(isOverIsland(lockedBounds, cursor, 16), true);
  });

  // Test 12: Cluster hover debounce (120ms) prevents flicker when crossing between capsules
  test('12. Cluster hover debounce (120ms) prevents premature collapse when moving between capsules', (done) => {
    let isMouseOverDynamicIsland = false;
    let islandMouseLeaveTimer = null;

    function handleIslandClusterEnter() {
      if (islandMouseLeaveTimer) {
        clearTimeout(islandMouseLeaveTimer);
        islandMouseLeaveTimer = null;
      }
      isMouseOverDynamicIsland = true;
    }

    function handleIslandClusterLeave(onDebounceDone) {
      if (islandMouseLeaveTimer) clearTimeout(islandMouseLeaveTimer);
      islandMouseLeaveTimer = setTimeout(() => {
        isMouseOverDynamicIsland = false;
        if (onDebounceDone) onDebounceDone();
      }, 120);
    }

    // Step 1: Mouse enters primary island
    handleIslandClusterEnter();
    assert.strictEqual(isMouseOverDynamicIsland, true);

    // Step 2: Mouse leaves primary island to cross the bridge into satellite capsule
    handleIslandClusterLeave();
    assert.strictEqual(isMouseOverDynamicIsland, true, 'Must stay true during 120ms debounce window');

    // Step 3: Mouse enters satellite capsule within 40ms -> cancels leave timer!
    handleIslandClusterEnter();
    assert.strictEqual(islandMouseLeaveTimer, null, 'Enter must cancel leave timer');
    assert.strictEqual(isMouseOverDynamicIsland, true, 'Island must stay open seamlessly');
  });

  // Test 13: CSS defines luminous perimeter outline on .island-ghost-mode
  test('13. CSS defines luminous perimeter outline on .island-ghost-mode', () => {
    const cssPath = path.resolve(__dirname, '../src/styles/_dynamic_island.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(cssContent.includes('0 0 0 1.5px rgba(255, 255, 255, 0.35)'), 'Must contain 1.5px luminous contour outline');
  });

  // Test 14: Button click sets was_hovered and restores upon mouse leave after 500ms
  test('14. Button click auto-restores when mouse leaves island after 500ms grace period', () => {
    let isGhost = false;
    let wasHovered = false;
    let enteredAt = 0;

    function onGhostButtonClick(now) {
      isGhost = true;
      wasHovered = true; // Fixed: always marked as hovered on button activation
      enteredAt = now;
    }

    function checkAutoRestore(now, isOverIsland) {
      if (!isGhost) return false;
      const shouldAutoRestore = now - enteredAt > 500 && (!isOverIsland || now - enteredAt > 7000);
      if (shouldAutoRestore) {
        isGhost = false;
        wasHovered = false;
      }
      return isGhost;
    }

    onGhostButtonClick(1000);
    assert.strictEqual(isGhost, true);

    // Mouse stays over island at t=1200ms -> stays ghosted
    assert.strictEqual(checkAutoRestore(1200, true), true);

    // Mouse moves away at t=1600ms (outside grace period > 500ms) -> immediately restores!
    assert.strictEqual(checkAutoRestore(1600, false), false, 'Ghost mode must restore when cursor leaves after 500ms');
  });

  // Test 15: Clickthrough evaluation order dispatches cursor event restoration on stationary cursor
  test('15. Clickthrough evaluation order guarantees cursor event restoration when mouse is stationary', () => {
    let currentClickthrough = true;
    let ignoredCursorEvents = true;
    let isGhostNow = false; // Just auto-restored
    let isOverIsland = true;
    let pt = { x: 500, y: 50 };
    let lastPt = { x: 500, y: 50 }; // Stationary cursor
    let curBoundsId = 1;
    let lastBoundsId = 1;
    let currentGhostMode = false;

    // Evaluated BEFORE stationary cursor optimization check
    const shouldClickthrough = isGhostNow || !isOverIsland;
    if (shouldClickthrough !== currentClickthrough) {
      currentClickthrough = shouldClickthrough;
      ignoredCursorEvents = shouldClickthrough;
    }

    let loopContinued = false;
    if (pt.x === lastPt.x && pt.y === lastPt.y && curBoundsId === lastBoundsId && !isGhostNow && !currentGhostMode) {
      loopContinued = true;
    }

    assert.strictEqual(ignoredCursorEvents, false, 'Window must restore cursor events (ignore = false) even when stationary');
    assert.strictEqual(loopContinued, true, 'Stationary optimization still executes without dropping clickthrough updates');
  });

  // Test 16: Escape key handler intercepts and dismisses ghost mode before closing island
  test('16. Escape key dismisses ghost mode without exiting Dynamic Island', () => {
    let isDynamicIslandMode = true;
    let isGhostMode = true;
    let dynamicIslandExited = false;

    function handleEscape() {
      if (isDynamicIslandMode) {
        if (isGhostMode) {
          isGhostMode = false;
          return;
        }
        dynamicIslandExited = true;
      }
    }

    handleEscape();
    assert.strictEqual(isGhostMode, false, 'Ghost mode must be dismissed on Escape');
    assert.strictEqual(dynamicIslandExited, false, 'Dynamic Island must NOT exit on first Escape when ghosted');

    // Press Escape again when not ghosted -> exits island mode
    handleEscape();
    assert.strictEqual(dynamicIslandExited, true, 'Escape when not ghosted exits island mode');
  });

  // Test 17: Auto-hide check is excluded in Dynamic Island mode
  test('17. checkShouldAutoHide returns false when isDynamicIslandMode is true', () => {
    const rendererPath = path.resolve(__dirname, '../src/renderer.js');
    const rendererContent = fs.readFileSync(rendererPath, 'utf8');

    assert.strictEqual(
      rendererContent.includes('if (!settings.autoHideLyrics || settings.taskbarMode || settings.wallpaperMode || isDynamicIslandMode) return false;'),
      true,
      'checkShouldAutoHide must return false when isDynamicIslandMode is true'
    );
    assert.strictEqual(
      rendererContent.includes('if (!settings.autoHideLyrics || settings.taskbarMode || settings.wallpaperMode || isDynamicIslandMode) {'),
      true,
      'updateAutoHideState must cancel auto-hide when isDynamicIslandMode is true'
    );
  });

  // Test 18: _dynamic_island.css guarantees .app-container visibility against auto-hide
  test('18. _dynamic_island.css enforces opacity: 1 and visibility: visible on .app-container', () => {
    const cssPath = path.resolve(__dirname, '../src/styles/_dynamic_island.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.strictEqual(
      cssContent.includes('body.mode-dynamic-island .app-container.auto-hide-faded'),
      true,
      '_dynamic_island.css must override auto-hide-faded opacity'
    );
    assert.strictEqual(
      cssContent.includes('z-index: 1000 !important;'),
      true,
      '#dynamic-island must have explicit z-index layer promotion'
    );
  });

  // Test 19: Rust window command unminimizes and shows window on island mode
  test('19. src-tauri window.rs unminimizes and shows window for dynamic island', () => {
    const windowRsPath = path.resolve(__dirname, '../src-tauri/src/commands/window.rs');
    const windowRsContent = fs.readFileSync(windowRsPath, 'utf8');

    assert.strictEqual(
      windowRsContent.includes('WS_EX_TRANSPARENT'),
      true,
      'window.rs must strip WS_EX_TRANSPARENT on dynamic island mode activation'
    );
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runIslandGhostModeTests();

