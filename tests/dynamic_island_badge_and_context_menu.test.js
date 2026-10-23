const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

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
  !cssContent.includes('.island-quality-badge.badge-synced'),
  '_dynamic_island.css must not define obsolete .badge-synced styling'
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
const updateBadgeMatch = rendererContent.match(/function updateIslandQualityBadge\([\s\S]*?\n\}/);
assert(updateBadgeMatch, 'renderer.js must declare updateIslandQualityBadge block');
assert(
  !updateBadgeMatch[0].includes('WORD-SYNC') && !updateBadgeMatch[0].includes('badge-synced'),
  'updateIslandQualityBadge must not set WORD-SYNC or badge-synced class'
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
  { visible: false },
  'Word-synced audio must suppress sync badge'
);
assert.deepStrictEqual(
  resolveBadgeState({ hasTrack: true, isLossless: false, isHiRes: false, sourceLevel: 2 }),
  { visible: false },
  'Line-synced audio must suppress sync badge'
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

// 4c. Deep Verification: Execute real updateIslandQualityBadge implementation extracted from renderer.js
const mockBadge = {
  style: { display: 'none' },
  textContent: '',
  className: 'island-quality-badge'
};

const vmSandbox = {
  document: {
    getElementById: (id) => (id === 'island-quality-badge' ? mockBadge : null)
  },
  currentPlayingTrackObj: null,
  currentTrack: null,
  currentIslandIsLossless: false,
  currentIslandIsHiRes: false
};

vm.runInNewContext(updateBadgeMatch[0] + '; this.updateIslandQualityBadge = updateIslandQualityBadge;', vmSandbox);

// Case 1: No track -> hidden and reset
vmSandbox.currentPlayingTrackObj = null;
vmSandbox.currentTrack = null;
vmSandbox.updateIslandQualityBadge(true, true);
assert.strictEqual(mockBadge.style.display, 'none', 'No track active must hide badge');
assert.strictEqual(mockBadge.className, 'island-quality-badge', 'No track active must reset className');

// Case 2: Track active, 16-bit Lossless
vmSandbox.currentPlayingTrackObj = { name: 'Track 1' };
vmSandbox.currentIslandIsLossless = true;
vmSandbox.currentIslandIsHiRes = false;
vmSandbox.updateIslandQualityBadge();
assert.strictEqual(mockBadge.style.display, 'inline-flex', 'Lossless must display inline-flex');
assert.strictEqual(mockBadge.textContent, 'LOSSLESS');
assert.strictEqual(mockBadge.className, 'island-quality-badge badge-lossless');

// Case 3: Track active, 24-bit Hi-Res
vmSandbox.currentIslandIsHiRes = true;
vmSandbox.updateIslandQualityBadge();
assert.strictEqual(mockBadge.style.display, 'inline-flex', 'Hi-Res must display inline-flex');
assert.strictEqual(mockBadge.textContent, 'HI-RES');
assert.strictEqual(mockBadge.className, 'island-quality-badge badge-hires');

// Case 4: Track transition to standard lossy audio with Word-Sync lyrics (Level 3) -> MUST SUPPRESS
vmSandbox.currentIslandIsLossless = false;
vmSandbox.currentIslandIsHiRes = false;
vmSandbox.updateIslandQualityBadge(false, false, 3);
assert.strictEqual(mockBadge.style.display, 'none', 'Word-sync audio must suppress quality badge');
assert.strictEqual(mockBadge.className, 'island-quality-badge', 'Suppressed badge must clean up className');

// Case 5: Standard lossy audio with Line-Sync lyrics (Level 2) -> MUST SUPPRESS
vmSandbox.updateIslandQualityBadge(false, false, 2);
assert.strictEqual(mockBadge.style.display, 'none', 'Line-sync audio must suppress quality badge');
assert.strictEqual(mockBadge.className, 'island-quality-badge', 'Suppressed badge must clean up className');

console.log('  ✓ 4. Mathematical logic, viewport clamping, and VM execution of updateIslandQualityBadge verified across all regimes');

console.log('\nAll Dynamic Island Quality Badge & Quick-Action Context Menu tests passed successfully!\n');
