/**
 * tests/wallpaper-mode-controls.test.js
 * Verification test to ensure progress bar and controls are completely removed in wallpaper mode.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Check _wallpaper.css
const wallpaperCss = fs.readFileSync(path.join(__dirname, '../src/styles/_wallpaper.css'), 'utf8');

// Assert wallpaper mode hides playback widget, track panel (progress bar), controls, and studio sidebar
assert(wallpaperCss.includes('body.wallpaper-mode #playback-widget'), '_wallpaper.css must target #playback-widget with ID selector');
assert(wallpaperCss.includes('body.wallpaper-mode .progress-bar-container'), '_wallpaper.css must hide .progress-bar-container');
assert(wallpaperCss.includes('body.wallpaper-mode #main-progress-track'), '_wallpaper.css must hide #main-progress-track');
assert(wallpaperCss.includes('body.wallpaper-mode .widget-controls'), '_wallpaper.css must hide .widget-controls');
assert(wallpaperCss.includes('body.wallpaper-mode #studio-sidebar'), '_wallpaper.css must hide #studio-sidebar');
console.log('✓ _wallpaper.css thoroughly hides playback-widget, progress bar, controls, and studio sidebar');

// 2. Check _studio.css
const studioCss = fs.readFileSync(path.join(__dirname, '../src/styles/_studio.css'), 'utf8');

// Assert split view rules do NOT force display on playback-widget or controls in wallpaper mode
assert(!studioCss.includes('body.layout-split #playback-widget {\n  display: flex'), '_studio.css must not un-scopedly force display:flex on #playback-widget');
assert(studioCss.includes('body.layout-split:not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode) #playback-widget'), '_studio.css must exclude wallpaper-mode from #playback-widget display rule');
assert(studioCss.includes('body.layout-split:not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode) #playback-widget > .widget-controls'), '_studio.css must exclude wallpaper-mode from .widget-controls');
assert(studioCss.includes('body.layout-split:not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode) #playback-widget > .widget-track-panel'), '_studio.css must exclude wallpaper-mode from .widget-track-panel');
console.log('✓ _studio.css split view rules properly exclude wallpaper-mode');

// 3. Check _layout.css
const layoutCss = fs.readFileSync(path.join(__dirname, '../src/styles/_layout.css'), 'utf8');
assert(!layoutCss.includes('.app-container.auto-hide-collapsed .playback-widget {\n  display: flex'), '_layout.css must not un-scopedly force display on auto-hide in wallpaper mode');
assert(layoutCss.includes('.app-container.auto-hide-collapsed:not(.wallpaper-mode) .playback-widget'), '_layout.css must exclude wallpaper-mode from auto-hide playback-widget');
console.log('✓ _layout.css auto-hide excludes wallpaper-mode');

// 4. Check renderer.js
const rendererJs = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8').replace(/\r\n/g, '\n');
assert(rendererJs.includes('if (settings.wallpaperMode || settings.taskbarMode || isDynamicIslandMode) {\n      playbackWidget.style.display = \'none\';'), 'renderer.js applyVisualSettings must explicitly set playbackWidget.style.display = none in wallpaperMode');
console.log('✓ renderer.js applyVisualSettings sets display: none in wallpaper mode');

console.log('\n--- ALL WALLPAPER MODE CONTROLS REMOVAL TESTS PASSED! ---');
