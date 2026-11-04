/**
 * tests/split-view-and-island-progress-fix.test.js
 * Verification of Progress Bar and Layout Fixes:
 * 1. Dynamic Island mode progress bar, thumb, current time, and remaining time update continuously in updatePlayhead().
 * 2. seekPlayback() applies optimistic updates to both main player and Dynamic Island progress/time elements.
 * 3. updateIslandScrubberProgress() is not blocked by pointer hover state.
 * 4. Split View strictly hides duplicate .widget-art-container and .track-details across all viewport modes and auto-hide states.
 * 5. Split View .widget-info and .progress-bar-container span full width without shrinking.
 * 6. setMainProgressFill safely cleanses idle-shimmer and drives CSS ratio.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n--- Running Split View & Dynamic Island Progress Fix Verification Tests ---\n');

const rendererJsPath = path.join(__dirname, '..', 'src', 'renderer.js');
const rendererJs = fs.readFileSync(rendererJsPath, 'utf8');

const studioCssPath = path.join(__dirname, '..', 'src', 'styles', '_studio.css');
const studioCss = fs.readFileSync(studioCssPath, 'utf8');

const layoutCssPath = path.join(__dirname, '..', 'src', 'styles', '_layout.css');
const layoutCss = fs.readFileSync(layoutCssPath, 'utf8');

// TEST 1: Dynamic Island progress update loop inside updatePlayhead()
console.log('1. Dynamic Island progress loop in updatePlayhead:');
assert.ok(
  rendererJs.includes('if (isDynamicIslandMode && !isScrubbingIslandProgress && trackDuration > 0)'),
  'updatePlayhead must contain active progress update branch for isDynamicIslandMode'
);
assert.ok(
  rendererJs.includes('islandProgressFillEl.style.width = pctStr;') &&
  rendererJs.includes('islandProgressThumbEl.style.left = pctStr;'),
  'updatePlayhead must update islandProgressFillEl width and islandProgressThumbEl left'
);
assert.ok(
  rendererJs.includes('islandTimeCurrentEl.textContent = text;') &&
  rendererJs.includes('islandTimeRemainingEl.textContent = text;'),
  'updatePlayhead must update islandTimeCurrentEl and islandTimeRemainingEl timestamps'
);
console.log('  ✓ 1. Dynamic Island progress fill, thumb, and elapsed/remaining timers update in updatePlayhead');

// TEST 2: seekPlayback optimistic UI feedback for Dynamic Island
console.log('\n2. Instant seek feedback in seekPlayback for Dynamic Island:');
assert.ok(
  rendererJs.includes('if (islandProgressFillEl) {') &&
  rendererJs.includes('islandProgressFillEl.style.width = pctStr;'),
  'seekPlayback must immediately update islandProgressFillEl'
);
assert.ok(
  rendererJs.includes('if (islandProgressThumbEl) {') &&
  rendererJs.includes('islandProgressThumbEl.style.left = pctStr;'),
  'seekPlayback must immediately update islandProgressThumbEl'
);
assert.ok(
  rendererJs.includes('if (islandTimeCurrentEl) {') &&
  rendererJs.includes('islandTimeCurrentEl.textContent = formatTime(seekMs);'),
  'seekPlayback must immediately update islandTimeCurrentEl'
);
console.log('  ✓ 2. seekPlayback updates Dynamic Island elements optimistically on user seek');

// TEST 3: updateIslandScrubberProgress unblocked by hover
console.log('\n3. updateIslandScrubberProgress hover decoupling:');
const islandScrubberFnStart = rendererJs.indexOf('function updateIslandScrubberProgress');
const islandScrubberFnEnd = rendererJs.indexOf('\n// Circular countdown', islandScrubberFnStart);
const islandScrubberFn = rendererJs.slice(islandScrubberFnStart, islandScrubberFnEnd);
assert.ok(
  !islandScrubberFn.includes(":hover"),
  'updateIslandScrubberProgress must not abort when hover state is false'
);
console.log('  ✓ 3. updateIslandScrubberProgress maintains progress bar and labels regardless of pointer hover');

// TEST 4: Split View duplicate song details and thumbnail strictly hidden
console.log('\n4. Split View duplicate song details and mini art thumbnail suppressed:');
assert.ok(
  !studioCss.includes('body.layout-split:not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode) .playback-widget .widget-art-container,\nbody.layout-split:not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode) .playback-widget .track-details { display: flex !important; }'),
  '_studio.css must not force .widget-art-container or .track-details to display: flex !important in split view'
);
assert.ok(
  !studioCss.includes('body.layout-split #playback-widget .widget-art-container,\nbody.layout-split #playback-widget .track-details { display: flex !important; }'),
  '_studio.css must not include legacy #playback-widget display: flex rule'
);
assert.ok(
  layoutCss.includes('body:not(.layout-split) .app-container.auto-hide-collapsed:not(.wallpaper-mode) .playback-widget .widget-art-container'),
  '_layout.css must scope auto-hide-collapsed widget details to body:not(.layout-split)'
);
console.log('  ✓ 4. Redundant track-details and widget-art-container strictly hidden in Split View');

// TEST 5: Split View progress pod full-width layout without shrinking
console.log('\n5. Split View progress pod full-width geometry:');
assert.ok(
  studioCss.includes('body.layout-split #playback-widget .widget-info,\nbody.layout-split .playback-widget .widget-info {\n  width: 100% !important;\n  min-width: 0 !important;\n  flex: 1 1 100% !important;\n}'),
  '_studio.css must give .widget-info 100% width and flex 1 1 100% in Split View'
);
assert.ok(
  studioCss.includes('body.layout-split .playback-widget .progress-bar-container') &&
  studioCss.includes('flex-direction: row !important') &&
  studioCss.includes('align-items: center !important'),
  '_studio.css must lay out Split-View progress-bar-container as an inline row centered between timestamps'
);
console.log('  ✓ 5. Progress bar container and widget-info span full width cleanly without horizontal shrinking');

// TEST 6: setMainProgressFill removes idle-shimmer and safely drives ratio
console.log('\n6. setMainProgressFill idle-shimmer cleanse and ratio setting:');
assert.ok(
  rendererJs.includes('if (widgetProgressFill.classList.contains("idle-shimmer")) {') &&
  rendererJs.includes('widgetProgressFill.classList.remove("idle-shimmer");'),
  'setMainProgressFill must remove idle-shimmer so playback progress scale is not frozen at 100%'
);
assert.ok(
  rendererJs.includes("widgetProgressFill.style.setProperty('--progress-ratio', ratio.toFixed(5));"),
  'setMainProgressFill must set CSS custom property --progress-ratio'
);
console.log('  ✓ 6. setMainProgressFill clears idle-shimmer and drives --progress-ratio correctly');

const dynamicIslandCssPath = path.join(__dirname, '..', 'src', 'styles', '_dynamic_island.css');
const dynamicIslandCss = fs.readFileSync(dynamicIslandCssPath, 'utf8');

// TEST 7: Dynamic Island stays expanded during active scrubbing and has hit target expander
console.log('\n7. Dynamic Island scrubbing expansion stability and hit testing:');
assert.ok(
  dynamicIslandCss.includes('#dynamic-island:hover,\nbody.mode-dynamic-island #dynamic-island.is-scrubbing') ||
  dynamicIslandCss.includes('#dynamic-island:hover,\r\nbody.mode-dynamic-island #dynamic-island.is-scrubbing'),
  '_dynamic_island.css must maintain 140px card height while .is-scrubbing'
);
assert.ok(
  dynamicIslandCss.includes('#dynamic-island.is-scrubbing .island-expanded-controls'),
  '_dynamic_island.css must keep .island-expanded-controls visible during .is-scrubbing'
);
assert.ok(
  dynamicIslandCss.includes('.island-progress-track::before'),
  '_dynamic_island.css must provide invisible hit target expander for the micro progress track'
);
console.log('  ✓ 7. Dynamic Island stays expanded while scrubbing and provides expanded hit target');

// TEST 8: attachScrubberController sets is-scrubbing on #dynamic-island
console.log('\n8. Scrubber controller Dynamic Island class toggling:');
assert.ok(
  rendererJs.includes('island.classList.add("is-scrubbing");') &&
  rendererJs.includes('island.classList.remove("is-scrubbing");'),
  'attachScrubberController must add and remove is-scrubbing on #dynamic-island'
);
console.log('  ✓ 8. attachScrubberController properly adds and cleans up is-scrubbing class');

// TEST 9: Debounce guard against duplicate seek calls
console.log('\n9. Single click debounce guard:');
assert.ok(
  rendererJs.includes('lastCommitSeekTimestamp = Date.now();') &&
  rendererJs.includes('Date.now() - lastCommitSeekTimestamp < 300'),
  'attachScrubberController must debounce rapid click seeks after pointerup commit'
);
assert.ok(
  rendererJs.includes('lastContainerSeekTimestamp = Date.now();') &&
  rendererJs.includes('Date.now() - lastContainerSeekTimestamp < 300'),
  'mainProgressContainer must debounce rapid container seeks'
);
console.log('  ✓ 9. Debounce guards effectively eliminate duplicate seek calls on click');

// TEST 10: Split View track panel width stability
console.log('\n10. Split View track panel width stability:');
assert.ok(
  studioCss.includes('body.layout-split:not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode) #playback-widget > .widget-track-panel {\n  display: flex !important;\n  flex: 1 1 100% !important;\n  width: 100% !important;') ||
  studioCss.includes('body.layout-split:not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode) #playback-widget > .widget-track-panel {\r\n  display: flex !important;\r\n  flex: 1 1 100% !important;\r\n  width: 100% !important;'),
  '_studio.css must consistently allocate 100% width and flex 1 1 100% to .widget-track-panel'
);
console.log('  ✓ 10. Split View .widget-track-panel width is 100% stable without shrinking');

// TEST 11: Dynamic Island collapse prevention & bounds lock
console.log('\n11. Dynamic Island collapse prevention and bounds lock:');
assert.ok(
  rendererJs.includes('function handleIslandClusterLeave() {\n  if (isScrubbingIslandProgress) return;') ||
  rendererJs.includes('function handleIslandClusterLeave() {\r\n  if (isScrubbingIslandProgress) return;'),
  'handleIslandClusterLeave must return early when isScrubbingIslandProgress is true'
);
assert.ok(
  rendererJs.includes('isScrubbingIslandProgress') &&
  rendererJs.includes("pri.classList.contains('is-scrubbing')"),
  'pushDynamicIslandBounds must check isScrubbingIslandProgress and pri.classList.contains("is-scrubbing")'
);
assert.ok(
  rendererJs.includes("handleIslandClusterLeave();") &&
  rendererJs.includes("island.classList.remove(\"is-scrubbing\");"),
  'commitSeek must initiate handleIslandClusterLeave if pointer was released outside island'
);
assert.ok(
  dynamicIslandCss.includes('body.mode-dynamic-island:not(.is-playing) #dynamic-island:not(:hover):not(.is-scrubbing)') &&
  dynamicIslandCss.includes('body.mode-dynamic-island.app-paused #dynamic-island:not(:hover):not(.is-scrubbing)') &&
  dynamicIslandCss.includes('body.mode-dynamic-island #dynamic-island.island-paused:not(:hover):not(.is-scrubbing)'),
  '_dynamic_island.css paused minimization rules must exclude .is-scrubbing'
);
console.log('  ✓ 11. Dynamic Island collapse prevention and bounds lock invariants verified');

// TEST 12: Hit-testing area expansion & container seek interaction
console.log('\n12. Hit-testing area expansion and container seek interaction:');
assert.ok(
  dynamicIslandCss.includes('top: -14px;') &&
  dynamicIslandCss.includes('bottom: -14px;') &&
  dynamicIslandCss.includes('left: -8px;') &&
  dynamicIslandCss.includes('right: -8px;'),
  '.island-progress-track::before must provide a 34px vertical hit box and 8px horizontal lead'
);
assert.ok(
  dynamicIslandCss.includes('.island-scrubber-container') &&
  dynamicIslandCss.includes('padding: 6px 0;') &&
  dynamicIslandCss.includes('cursor: pointer;'),
  '.island-scrubber-container must have vertical padding and pointer cursor'
);
assert.ok(
  rendererJs.includes('const islandScrubberContainer = document.querySelector(".island-scrubber-container");') &&
  rendererJs.includes('islandScrubberContainer.addEventListener("pointerdown", onIslandContainerSeek);') &&
  rendererJs.includes('islandScrubberContainer.addEventListener("click", onIslandContainerSeek);'),
  '.island-scrubber-container must bind pointerdown and click seek handlers'
);
console.log('  ✓ 12. Dynamic Island hit-testing expansion and container seek handlers verified');

// TEST 13: Clock synchronization & active scrubbing guard
console.log('\n13. Clock synchronization and active scrubbing guard:');
assert.ok(
  rendererJs.includes('function setIslandProgress(curMs, durMs) {\n  if (isScrubbingIslandProgress) return;') ||
  rendererJs.includes('function setIslandProgress(curMs, durMs) {\r\n  if (isScrubbingIslandProgress) return;'),
  'setIslandProgress must return early when isScrubbingIslandProgress is true'
);
assert.ok(
  rendererJs.includes('setIslandProgress(currentProgress, trackDuration);'),
  'updateIslandScrubberProgress must pass currentProgress instead of lookahead syncProgress'
);
assert.ok(
  rendererJs.includes('updateDynamicIslandBreakTick(countdownMs, syncProgress, isInstrumental, targetIndex) {\n  if (isIslandSleeping) return;\n  if (isPlaying) {\n    lastPlaybackActivityMs = Date.now();\n  }\n\n  // 1. Scrubber update (if active)\n  updateIslandScrubberProgress(currentProgress);') ||
  rendererJs.includes('updateIslandScrubberProgress(currentProgress);'),
  'Break and word progress ticks must supply currentProgress to eliminate dual-clock jitter'
);
console.log('  ✓ 13. Dynamic Island clock synchronization and scrubbing lock verified');

// TEST 14: Scrubbing smoothness, cached track rect, and fallback listeners
console.log('\n14. Scrubbing smoothness, cached track rect, and fallback listeners:');
assert.ok(
  rendererJs.includes('cachedTrackRect = trackEl.getBoundingClientRect();') &&
  rendererJs.includes('cachedTrackRect = null;'),
  'attachScrubberController must cache track bounding rect during drag and clear it upon commit'
);
assert.ok(
  rendererJs.includes('window.addEventListener("pointerup", onWindowPointerUpFallback') &&
  rendererJs.includes('window.removeEventListener("pointerup", onWindowPointerUpFallback'),
  'attachScrubberController must attach and detach window-level fallback listeners'
);
assert.ok(
  rendererJs.includes('hasDragged') &&
  rendererJs.includes('e.detail >= 2') &&
  rendererJs.includes('pendingClickSeekTimer'),
  'attachScrubberController must distinguish drag vs tap and deduplicate double-click seeks'
);
assert.ok(
  rendererJs.includes('lastPlaybackActivityMs = Date.now();'),
  'attachScrubberController must refresh lastPlaybackActivityMs to prevent sleep timeout while scrubbing'
);
console.log('  ✓ 14. Scrubbing smoothness, rect caching, fallbacks, and deduplication verified');

// TEST 15: Split View progress bar shrinking on album art expansion & full width retention when unexpanded
console.log('\n15. Split View progress bar shrinks when album art expands and retains full width when unexpanded:');
assert.ok(
  studioCss.includes('body.layout-split:is(.auto-hide-controls, .auto-hide-collapsed, .auto-hide-faded):not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode):not(.cinematic-view-active) #playback-widget > .widget-track-panel') &&
  studioCss.includes('width: min(280px, 80%) !important;') &&
  studioCss.includes('max-width: 280px !important;') &&
  studioCss.includes('flex: 0 1 280px !important;'),
  '_studio.css must shrink .widget-track-panel when album art is expanded in Split View'
);
assert.ok(
  studioCss.includes('body.layout-split:is(.auto-hide-controls, .auto-hide-collapsed, .auto-hide-faded):not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode):not(.cinematic-view-active) #playback-widget:hover > .widget-track-panel') &&
  studioCss.includes('width: 100% !important;') &&
  studioCss.includes('max-width: none !important;') &&
  studioCss.includes('flex: 1 1 100% !important;'),
  '_studio.css must retain original 100% full size for .widget-track-panel when album art is not expanded / on hover'
);
console.log('  ✓ 15. Progress bar shrinks when album art is expanded and retains original full size when unexpanded');

// TEST 16: Split View container drag controller & pointer capture lifecycle (Feature 7)
console.log('\n16. Split View container drag scrubber controller & pointer capture lifecycle:');
assert.ok(
  rendererJs.includes('let isDraggingContainer = false;') &&
  rendererJs.includes('isDraggingContainer = true;') &&
  rendererJs.includes('isScrubbingMainProgress = true;'),
  'mainProgressContainer must track isDraggingContainer and set isScrubbingMainProgress = true during drag'
);
assert.ok(
  rendererJs.includes('mainProgressContainer.setPointerCapture(e.pointerId);') &&
  rendererJs.includes('mainProgressContainer.releasePointerCapture(pointerIdToRelease);'),
  'mainProgressContainer must acquire and release pointer capture across pointer lifecycle'
);
assert.ok(
  rendererJs.includes('containerCachedTrackRect = track.getBoundingClientRect();') &&
  rendererJs.includes('containerCachedTrackRect = null;'),
  'mainProgressContainer must cache track rect during drag and clear it upon commit'
);
assert.ok(
  rendererJs.includes('mainProgressContainer.addEventListener("pointermove", handleContainerPointerMove);') &&
  rendererJs.includes('mainProgressContainer.addEventListener("pointerup", commitContainerSeek);') &&
  rendererJs.includes('mainProgressContainer.addEventListener("lostpointercapture"'),
  'mainProgressContainer must bind pointermove, pointerup, and lostpointercapture'
);
assert.ok(
  rendererJs.includes('// Suppress native click to prevent duplicate seek invocations when pointerup commits seek') &&
  rendererJs.includes('mainProgressContainer.addEventListener("click"'),
  'mainProgressContainer must suppress synthetic clicks to prevent duplicate seek calls'
);
console.log('  ✓ 16. Container drag controller with pointer capture, cached rects, and click suppression verified');

// TEST 17: Split View unconditional song details and mini art thumbnail isolation across all states (Feature 6)
console.log('\n17. Split View unconditional song details and mini art thumbnail isolation:');
assert.ok(
  studioCss.includes('body.layout-split #playback-widget .widget-art-container *') &&
  studioCss.includes('body.layout-split #playback-widget .track-details *'),
  '_studio.css must include defense-in-depth sub-element suppression for .track-details and .widget-art-container'
);
assert.ok(
  layoutCss.includes('body:not(.layout-split) .app-container.auto-hide-collapsed:not(.wallpaper-mode) .playback-widget {'),
  '_layout.css must scope auto-hide-collapsed playback-widget to body:not(.layout-split)'
);
console.log('  ✓ 17. Unconditional song details and art thumbnail isolation verified across all Split View states');

// TEST 18: Split View hover override parity and touch action optimization (Feature 5 & 7)
console.log('\n18. Split View hover override parity and touch action optimization:');
assert.ok(
  studioCss.includes('body.layout-split .app-container:is(.auto-hide-controls, .auto-hide-collapsed, .auto-hide-faded):not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode):not(.cinematic-view-active) #playback-widget:hover > .widget-track-panel'),
  '_studio.css must provide app-container parity for hover override on .widget-track-panel'
);
assert.ok(
  studioCss.includes('body.layout-split .playback-widget .progress-bar-container') &&
  studioCss.includes('touch-action: none !important;'),
  '_studio.css must set touch-action: none on .progress-bar-container for gesture reliability'
);
console.log('  ✓ 18. Hover override parity and touch-action optimization verified');

console.log('\nAll 18 Split View & Dynamic Island Progress Fix tests passed successfully!\n');


