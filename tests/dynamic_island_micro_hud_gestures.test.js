const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Dynamic Island Micro-HUD & Gestures Tests ---');

// 1. CSS Declarations Verification
const cssPath = path.join(__dirname, '../src/styles/_dynamic_island.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(
  cssContent.includes('.island-hud-overlay'),
  '_dynamic_island.css must define .island-hud-overlay'
);
assert(
  cssContent.includes('#dynamic-island.island-has-hud .island-center-content'),
  '_dynamic_island.css must hide .island-center-content when island-has-hud is active'
);
assert(
  cssContent.includes('.island-art-tile:active'),
  '_dynamic_island.css must define active tactile bounce on .island-art-tile'
);
assert(
  cssContent.includes('cursor: pointer !important;'),
  '_dynamic_island.css must set pointer cursor on .island-art-wrapper'
);
console.log('  ✓ 1. CSS defines transparent HUD overlay, center-content morphing, and tactile squircle click feedback');

// 2. Renderer showIslandHud Logic Verification
const rendererPath = path.join(__dirname, '../src/renderer.js');
const rendererContent = fs.readFileSync(rendererPath, 'utf8');

assert(
  rendererContent.includes('islandEl.classList.add("island-has-hud")'),
  'showIslandHud must add island-has-hud class to dynamic island'
);
assert(
  rendererContent.includes('islandEl.classList.remove("island-has-hud")'),
  'showIslandHud must remove island-has-hud class upon exit'
);
assert(
  rendererContent.includes("typeof options === 'string'"),
  'showIslandHud must support backward-compatible string calls'
);
console.log('  ✓ 2. showIslandHud manages capsule-integrated state and supports polymorphic argument signatures');

// 3. Gesture Listener Verification
assert(
  rendererContent.includes("settings.islandDblClickAction || 'playPause'"),
  'dblclick listener must support customizable action with playPause default'
);
assert(
  rendererContent.includes("islandArtTileEl.addEventListener(\"click\""),
  'islandArtTileEl must have single-click listener to toggle playback'
);
assert(
  rendererContent.includes("controlPlayback('play-pause')"),
  'gestures must trigger controlPlayback with play-pause action'
);
console.log('  ✓ 3. Gestures wired: double-click capsule and single-click squircle both trigger instant play/pause');

// 4. Paused State Cleanup Verification
assert(
  rendererContent.includes("dynamicIslandEl.classList.remove('island-instrumental-active', 'island-has-hud')"),
  'syncDynamicIslandState must clean up island-has-hud and instrumental classes when paused'
);
console.log('  ✓ 4. syncDynamicIslandState cleans up HUD and active classes on pause');

console.log('\nAll Dynamic Island Micro-HUD & Gestures tests passed successfully!\n');
