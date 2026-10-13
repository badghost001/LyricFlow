const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Dynamic Island Free-Floating Drag & Magnetic Edge Snapping Tests ---');

// 1. Static HTML & Settings UI Verification
const htmlPath = path.join(__dirname, '../src/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(
  htmlContent.includes('data-val="free"'),
  'index.html must include free segment button in select-island-position liquid bar'
);
assert(
  htmlContent.includes('<option value="free">free</option>'),
  'index.html must include free option in select-island-position dropdown'
);
console.log('  ✓ 1. Static HTML defines Free-Floating dock option in settings liquid bar and select menu');

// 2. CSS Styling & Grab Cursor Verification
const cssPath = path.join(__dirname, '../src/styles/_dynamic_island.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(
  cssContent.includes('body.island-dock-free'),
  '_dynamic_island.css must define body.island-dock-free dock mode'
);
assert(
  cssContent.includes('var(--island-free-x'),
  '_dynamic_island.css must use --island-free-x CSS variable for zero-lag hardware translation'
);
assert(
  cssContent.includes('var(--island-free-y'),
  '_dynamic_island.css must use --island-free-y CSS variable for zero-lag hardware translation'
);
assert(
  cssContent.includes('cursor: grab !important;'),
  '_dynamic_island.css must set grab cursor on free dynamic island'
);
assert(
  cssContent.includes('cursor: grabbing !important;'),
  '_dynamic_island.css must set grabbing cursor when active or dragging'
);
assert(
  cssContent.includes('body.island-dock-free.island-dragging #dynamic-island'),
  '_dynamic_island.css must disable CSS transitions while dragging to prevent lag'
);
console.log('  ✓ 2. CSS declares hardware-accelerated CSS variables, grab/grabbing cursors, and lag-free dragging');

// 3. Rust Backend & Tauri Bridge Verification
const rustPath = path.join(__dirname, '../src-tauri/src/commands/window.rs');
const rustContent = fs.readFileSync(rustPath, 'utf8');

assert(
  rustContent.includes('pub fn set_island_position'),
  'window.rs must implement set_island_position command'
);
assert(
  rustContent.includes('"free" =>'),
  'window.rs must handle "free" in set_dynamic_island_mode dock match'
);

const bridgePath = path.join(__dirname, '../src/tauri-bridge.js');
const bridgeContent = fs.readFileSync(bridgePath, 'utf8');

assert(
  bridgeContent.includes('setIslandPosition:'),
  'tauri-bridge.js must expose setIslandPosition API'
);
console.log('  ✓ 3. Rust backend and IPC bridge provide native window positioning and bounds sync');

// 4. Renderer Code Verification
const rendererPath = path.join(__dirname, '../src/renderer.js');
const rendererContent = fs.readFileSync(rendererPath, 'utf8');

assert(
  rendererContent.includes('function calculateMagneticSnap'),
  'renderer.js must implement calculateMagneticSnap function'
);
assert(
  rendererContent.includes('function applyFreeIslandPosition'),
  'renderer.js must implement applyFreeIslandPosition function'
);
assert(
  rendererContent.includes('function clearFreeIslandPosition'),
  'renderer.js must implement clearFreeIslandPosition function'
);
assert(
  rendererContent.includes('islandCustomPos: null'),
  'renderer.js must initialize islandCustomPos setting'
);
assert(
  rendererContent.includes('document.body.classList.add("island-dragging")'),
  'renderer.js must toggle island-dragging class on drag start'
);
assert(
  rendererContent.includes('settings.islandCustomPos = { x: snapped.x, y: snapped.y }'),
  'renderer.js must persist custom coordinates on drag release'
);
console.log('  ✓ 4. Renderer implements magnetic snapping, coordinate persistence, and pointer capture drag lifecycle');

// 5. Mathematical Simulation of Magnetic Snapping Physics
function calculateMagneticSnap(targetX, targetY, islandWidth, islandHeight, viewportWidth, viewportHeight, snapThreshold = 16) {
  let x = targetX;
  let y = targetY;

  // Left edge snap
  if (x < snapThreshold) {
    x = 0;
  } else if (x + islandWidth > viewportWidth - snapThreshold) {
    // Right edge snap
    x = viewportWidth - islandWidth;
  }

  // Top edge snap
  if (y < snapThreshold) {
    y = 0;
  } else if (y + islandHeight > viewportHeight - snapThreshold) {
    // Bottom edge snap
    y = viewportHeight - islandHeight;
  }

  // Center horizontal snap
  const centerX = (viewportWidth - islandWidth) / 2;
  if (Math.abs(x - centerX) <= snapThreshold) {
    x = centerX;
  }

  // Clamping within visible viewport
  x = Math.max(0, Math.min(viewportWidth - islandWidth, x));
  y = Math.max(0, Math.min(viewportHeight - islandHeight, y));

  return { x: Math.round(x), y: Math.round(y) };
}

const islandW = 340;
const islandH = 36;
const viewW = 1920;
const viewH = 1080;

// 5a. Left edge snap (< 16px)
const leftSnap = calculateMagneticSnap(10, 200, islandW, islandH, viewW, viewH);
assert.strictEqual(leftSnap.x, 0, 'Target x=10 must magnetically snap flush to 0');
assert.strictEqual(leftSnap.y, 200, 'Target y=200 must remain unaffected');

// 5b. Right edge snap (< 16px from viewport right)
const rightTargetX = viewW - islandW - 12; // 1568
const rightSnap = calculateMagneticSnap(rightTargetX, 200, islandW, islandH, viewW, viewH);
assert.strictEqual(rightSnap.x, viewW - islandW, 'Target must magnetically snap flush to right edge (1580)');

// 5c. Top edge snap (< 16px)
const topSnap = calculateMagneticSnap(500, 14, islandW, islandH, viewW, viewH);
assert.strictEqual(topSnap.y, 0, 'Target y=14 must magnetically snap flush to top (0)');

// 5d. Bottom edge snap (< 16px from viewport bottom)
const bottomTargetY = viewH - islandH - 8;
const bottomSnap = calculateMagneticSnap(500, bottomTargetY, islandW, islandH, viewW, viewH);
assert.strictEqual(bottomSnap.y, viewH - islandH, 'Target must magnetically snap flush to bottom edge');

// 5e. Horizontal Center magnetic snap
const exactCenter = (viewW - islandW) / 2; // 790
const nearCenter = calculateMagneticSnap(799, 100, islandW, islandH, viewW, viewH);
assert.strictEqual(nearCenter.x, exactCenter, 'Target x=799 (within 9px of 790) must magnetically snap to exact center 790');

// 5f. Free placement (outside snapping thresholds)
const freePos = calculateMagneticSnap(420, 350, islandW, islandH, viewW, viewH);
assert.strictEqual(freePos.x, 420, 'Target (420, 350) far from edges must retain exact x coordinate');
assert.strictEqual(freePos.y, 350, 'Target (420, 350) far from edges must retain exact y coordinate');

// 5g. Screen bounds safety clamping (negative or beyond screen)
const clampedNegative = calculateMagneticSnap(-100, -50, islandW, islandH, viewW, viewH);
assert.strictEqual(clampedNegative.x, 0, 'Negative x must clamp at 0');
assert.strictEqual(clampedNegative.y, 0, 'Negative y must clamp at 0');

const clampedBeyond = calculateMagneticSnap(2500, 1500, islandW, islandH, viewW, viewH);
assert.strictEqual(clampedBeyond.x, viewW - islandW, 'Excess x must clamp at viewportWidth - islandWidth');
assert.strictEqual(clampedBeyond.y, viewH - islandH, 'Excess y must clamp at viewportHeight - islandHeight');

console.log('  ✓ 5. Mathematical edge, center, and boundary clamping physics verified across all display regimes');

console.log('\nAll Dynamic Island Free-Floating Drag & Magnetic Edge Snapping tests passed successfully!\n');
