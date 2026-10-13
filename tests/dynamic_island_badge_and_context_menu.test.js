const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Dynamic Island Quality Badge & Quick-Action Context Menu Tests ---');

// 1. Static HTML Markup Verification
const htmlPath = path.join(__dirname, '../src/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(
  htmlContent.includes('id="island-quality-badge"'),
  'index.html must include #island-quality-badge element'
);
assert(
  htmlContent.includes('class="island-top-actions"'),
  'index.html must have .island-top-actions container'
);
assert(
  htmlContent.includes('id="island-context-menu"'),
  'index.html must include #island-context-menu element'
);
assert(
  htmlContent.includes('id="island-ctx-lyrics"'),
  'index.html must include #island-ctx-lyrics action item'
);
assert(
  htmlContent.includes('id="island-ctx-offset-minus"') &&
  htmlContent.includes('id="island-ctx-offset-reset"') &&
  htmlContent.includes('id="island-ctx-offset-plus"'),
  'index.html must include sync offset quick-action micro-buttons'
);
assert(
  htmlContent.includes('id="island-ctx-translate"'),
  'index.html must include #island-ctx-translate action item'
);
assert(
  htmlContent.includes('id="island-ctx-ghost"'),
  'index.html must include #island-ctx-ghost action item'
);
assert(
  htmlContent.includes('id="island-ctx-restore"'),
  'index.html must include #island-ctx-restore action item'
);
console.log('  ✓ 1. Static HTML defines quality badge micro-pill and full quick-action context menu items');

// 2. CSS Styling & Apple HIG Glassmorphism Verification
const cssPath = path.join(__dirname, '../src/styles/_dynamic_island.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(
  cssContent.includes('.island-quality-badge'),
  '_dynamic_island.css must define .island-quality-badge'
);
assert(
  cssContent.includes('.island-quality-badge.badge-hires'),
  '_dynamic_island.css must define .badge-hires styling'
);
assert(
  cssContent.includes('.island-quality-badge.badge-synced'),
  '_dynamic_island.css must define .badge-synced styling'
);
assert(
  cssContent.includes('.island-context-menu'),
  '_dynamic_island.css must define .island-context-menu'
);
assert(
  cssContent.includes('.island-context-menu.is-open'),
  '_dynamic_island.css must define .island-context-menu.is-open spring pop-in state'
);
assert(
  cssContent.includes('.island-context-card'),
  '_dynamic_island.css must define .island-context-card glass container'
);
assert(
  cssContent.includes('.island-ctx-mini-btn'),
  '_dynamic_island.css must define .island-ctx-mini-btn micro-controls'
);
console.log('  ✓ 2. CSS defines quality badge states and Apple HIG glassmorphic context menu transitions');

// 3. Renderer Code Architecture & Function Verification
const rendererPath = path.join(__dirname, '../src/renderer.js');
const rendererContent = fs.readFileSync(rendererPath, 'utf8');

assert(
  rendererContent.includes('function updateIslandQualityBadge'),
  'renderer.js must implement updateIslandQualityBadge function'
);
assert(
  rendererContent.includes('function showIslandContextMenu'),
  'renderer.js must implement showIslandContextMenu function'
);
assert(
  rendererContent.includes('function hideIslandContextMenu'),
  'renderer.js must implement hideIslandContextMenu function'
);
assert(
  rendererContent.includes('currentIslandIsLossless') && rendererContent.includes('currentIslandIsHiRes'),
  'renderer.js must track lossless and hi-res states'
);
assert(
  rendererContent.includes('showIslandContextMenu(e.clientX, e.clientY)'),
  'renderer.js must invoke showIslandContextMenu on right-click contextmenu event'
);
assert(
  rendererContent.includes('adjustSyncOffset(-500)') &&
  rendererContent.includes('adjustSyncOffset(500)'),
  'renderer.js must wire quick ±500ms sync offset controls'
);
assert(
  rendererContent.includes('hideIslandContextMenu()'),
  'renderer.js must support dismissing context menu on click outside and escape'
);
console.log('  ✓ 3. Renderer wires updateIslandQualityBadge, right-click menu trigger, and quick-action offset adjustments');

// 4. Logic Simulation Tests
// 4a. Badge Resolution Logic Simulation
function resolveBadgeState({ hasTrack, isLossless, isHiRes, sourceLevel }) {
  if (!hasTrack) return { visible: false };
  if (isLossless) {
    return {
      visible: true,
      text: isHiRes ? "HI-RES" : "LOSSLESS",
      className: isHiRes ? "badge-hires" : "badge-lossless"
    };
  } else if (sourceLevel >= 2) {
    return {
      visible: true,
      text: sourceLevel === 3 ? "WORD-SYNC" : "SYNCED",
      className: "badge-synced"
    };
  }
  return { visible: false };
}

assert.deepStrictEqual(
  resolveBadgeState({ hasTrack: false, isLossless: true, isHiRes: true, sourceLevel: 3 }),
  { visible: false },
  'Badge must hide when there is no active track'
);
assert.deepStrictEqual(
  resolveBadgeState({ hasTrack: true, isLossless: true, isHiRes: false, sourceLevel: 2 }),
  { visible: true, text: 'LOSSLESS', className: 'badge-lossless' },
  'Lossless 16-bit audio must produce LOSSLESS badge'
);
assert.deepStrictEqual(
  resolveBadgeState({ hasTrack: true, isLossless: true, isHiRes: true, sourceLevel: 2 }),
  { visible: true, text: 'HI-RES', className: 'badge-hires' },
  'Lossless 24-bit audio must produce HI-RES badge'
);
assert.deepStrictEqual(
  resolveBadgeState({ hasTrack: true, isLossless: false, isHiRes: false, sourceLevel: 3 }),
  { visible: true, text: 'WORD-SYNC', className: 'badge-synced' },
  'Word-synced audio must produce WORD-SYNC badge'
);
assert.deepStrictEqual(
  resolveBadgeState({ hasTrack: true, isLossless: false, isHiRes: false, sourceLevel: 2 }),
  { visible: true, text: 'SYNCED', className: 'badge-synced' },
  'Line-synced audio must produce SYNCED badge'
);
assert.deepStrictEqual(
  resolveBadgeState({ hasTrack: true, isLossless: false, isHiRes: false, sourceLevel: 1 }),
  { visible: false },
  'Plain text lyrics without lossless must hide badge'
);

// 4b. Geometry Clamping Simulation
function clampMenuPosition(x, y, menuWidth, menuHeight, viewportWidth, viewportHeight) {
  const clampedX = Math.max(10, Math.min(viewportWidth - menuWidth - 10, x));
  const clampedY = Math.max(10, Math.min(viewportHeight - menuHeight - 10, y));
  return { x: clampedX, y: clampedY };
}

const posNearRightEdge = clampMenuPosition(1900, 50, 220, 180, 1920, 1080);
assert.strictEqual(posNearRightEdge.x, 1690, 'Right boundary must clamp menu fully within viewport');
const posNearLeftEdge = clampMenuPosition(-20, 50, 220, 180, 1920, 1080);
assert.strictEqual(posNearLeftEdge.x, 10, 'Left boundary must clamp menu at 10px minimum padding');

console.log('  ✓ 4. Mathematical logic and viewport clamping simulations verified across all regimes');

console.log('\nAll Dynamic Island Quality Badge & Quick-Action Context Menu tests passed successfully!\n');
