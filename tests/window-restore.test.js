/**
 * Unit Tests for Main Window Size Restoration & Dynamic Island Boundary Guards
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

function runWindowRestoreTests() {
  console.log('\n--- Running Window Size Restoration & Dynamic Island Guard Tests ---\n');

  const windowRsPath = path.resolve(__dirname, '../src-tauri/src/commands/window.rs');
  const libRsPath = path.resolve(__dirname, '../src-tauri/src/lib.rs');
  const tauriBridgePath = path.resolve(__dirname, '../src/tauri-bridge.js');
  const rendererPath = path.resolve(__dirname, '../src/renderer.js');

  const windowRs = fs.readFileSync(windowRsPath, 'utf8');
  const libRs = fs.readFileSync(libRsPath, 'utf8');
  const tauriBridge = fs.readFileSync(tauriBridgePath, 'utf8');
  const renderer = fs.readFileSync(rendererPath, 'utf8');

  // Test 1: Window snapshot in window.rs guards against saving diminished/tiny dimensions
  test('1. set_dynamic_island_mode guards against saving tiny/island dimensions', () => {
    assert.ok(
      windowRs.includes('if size.width >= min_w && size.height >= min_h'),
      'Must enforce min_w and min_h check before saving SAVED_ISLAND_MAIN_SIZE'
    );
    assert.ok(
      windowRs.includes('min_w = (650.0 * scale)'),
      'Must define min width threshold of at least 650px scaled'
    );
    assert.ok(
      windowRs.includes('min_h = (450.0 * scale)'),
      'Must define min height threshold of at least 450px scaled'
    );
  });

  // Test 2: Window restoration in window.rs clamps to safe dimensions (680x480 minimum, 780x560 default)
  test('2. set_dynamic_island_mode exit clamps restored size to safe minimums', () => {
    assert.ok(
      windowRs.includes('let min_w = (680.0 * scale) as u32;'),
      'Must define min_w threshold for restoration'
    );
    assert.ok(
      windowRs.includes('let min_h = (480.0 * scale) as u32;'),
      'Must define min_h threshold for restoration'
    );
    assert.ok(
      windowRs.includes('let w = if sw < min_w { default_w } else { sw };'),
      'Must fallback to default_w if saved width is smaller than min_w'
    );
    assert.ok(
      windowRs.includes('let h = if sh < min_h { default_h } else { sh };'),
      'Must fallback to default_h if saved height is smaller than min_h'
    );
  });

  // Test 3: reset_window_size command exists in window.rs and sets standard 780x560 dimensions
  test('3. reset_window_size command exists in window.rs and sets standard 780x560 dimensions', () => {
    assert.ok(
      windowRs.includes('pub fn reset_window_size(window: WebviewWindow) -> Result<(), String>'),
      'Must define pub fn reset_window_size'
    );
    assert.ok(
      windowRs.includes('let sw = (780.0 * scale) as u32;'),
      'Must set width to 780 scaled'
    );
    assert.ok(
      windowRs.includes('let sh = (560.0 * scale) as u32;'),
      'Must set height to 560 scaled'
    );
    assert.ok(
      windowRs.includes('window.set_size(tauri::PhysicalSize::new(sw, sh))'),
      'Must apply PhysicalSize(sw, sh)'
    );
    assert.ok(
      windowRs.includes('window.center()'),
      'Must center the restored window on screen'
    );
  });

  // Test 4: lib.rs registers reset_window_size in tauri invoke handler
  test('4. lib.rs registers reset_window_size command handler', () => {
    assert.ok(
      libRs.includes('window::reset_window_size'),
      'Must register window::reset_window_size in generate_handler![]'
    );
  });

  // Test 5: tauri-bridge.js exposes resetWindowSize
  test('5. tauri-bridge.js exposes resetWindowSize on electronAPI', () => {
    assert.ok(
      tauriBridge.includes("resetWindowSize: () => safeInvoke('reset_window_size', {}, null)"),
      'Must export resetWindowSize safeInvoke'
    );
  });

  // Test 6: renderer.js binds double-click on hudHeader to reset window size
  test('6. renderer.js binds dblclick on hudHeader to restore window size', () => {
    assert.ok(
      renderer.includes('hudHeader.addEventListener("dblclick"') || renderer.includes("hudHeader.addEventListener('dblclick'"),
      'Must bind dblclick event listener on hudHeader'
    );
    assert.ok(
      renderer.includes('window.electronAPI.resetWindowSize()'),
      'Must invoke electronAPI.resetWindowSize()'
    );
  });

  // Test 7: renderer.js binds Ctrl+Alt+R shortcut for instant recovery
  test('7. renderer.js binds Ctrl+Alt+R keyboard shortcut for instant recovery', () => {
    assert.ok(
      renderer.includes("e.ctrlKey && e.altKey") && renderer.includes("KeyR"),
      'Must listen for Ctrl+Alt+R key combination'
    );
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runWindowRestoreTests();
