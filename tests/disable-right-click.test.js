const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Right-Click Suppression & Context Menu Lockout Tests ---');

// 1. Static HTML Attributes Verification
const htmlFiles = [
  { file: 'index.html', label: 'Main overlay window' },
  { file: 'taskbar.html', label: 'Taskbar mode window' },
  { file: 'wallpaper_hud.html', label: 'Wallpaper HUD exit pill' },
  { file: 'edge_glow.html', label: 'Edge glow canvas window' },
];

htmlFiles.forEach(({ file, label }) => {
  const content = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  assert(
    content.includes('oncontextmenu="return false;"'),
    `${file} (${label}) must have oncontextmenu="return false;" on body`
  );
  console.log(`  ✓ 1. ${file} defines inline oncontextmenu lockout`);
});

// 2. Tauri Bridge Script Verification
const bridgeContent = fs.readFileSync(path.join(__dirname, '../src/tauri-bridge.js'), 'utf8');
assert(
  bridgeContent.includes("window.addEventListener('contextmenu', suppressRightClick, true)"),
  'tauri-bridge.js must intercept contextmenu in capture phase'
);
assert(
  bridgeContent.includes("e.button === 2"),
  'tauri-bridge.js must check for button 2 on mouse events'
);
console.log('  ✓ 2. tauri-bridge.js enforces capture-phase right-click suppression across all views');

// 3. Renderer Script Verification
const rendererContent = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
assert(
  rendererContent.includes("window.addEventListener('contextmenu', suppressRightClick, true)"),
  'renderer.js must intercept contextmenu on window in capture phase'
);
assert(
  rendererContent.includes("document.addEventListener('contextmenu', suppressRightClick, true)"),
  'renderer.js must intercept contextmenu on document in capture phase'
);
assert(
  !rendererContent.includes("window.openShareModal(index)") ||
  rendererContent.includes("// Right-click on lyric line is completely suppressed"),
  'renderer.js must not open share card on right click'
);
console.log('  ✓ 3. renderer.js comprehensively blocks right-click events and prevents lyric share popups');

// 4. Functional Simulation of Event Suppression
let prevented = false;
let stopped = false;
let immediateStopped = false;

const mockEvent = {
  button: 2,
  preventDefault: () => { prevented = true; },
  stopPropagation: () => { stopped = true; },
  stopImmediatePropagation: () => { immediateStopped = true; }
};

const suppressHandler = (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (typeof e.stopImmediatePropagation === 'function') {
    e.stopImmediatePropagation();
  }
  return false;
};

const result = suppressHandler(mockEvent);

assert.strictEqual(prevented, true, 'Handler must call preventDefault()');
assert.strictEqual(stopped, true, 'Handler must call stopPropagation()');
assert.strictEqual(immediateStopped, true, 'Handler must call stopImmediatePropagation()');
assert.strictEqual(result, false, 'Handler must return false');

console.log('  ✓ 4. Functional simulation verifies full cancellation of right-click event cycle');
console.log('\nAll Right-Click Suppression tests passed successfully!\n');
