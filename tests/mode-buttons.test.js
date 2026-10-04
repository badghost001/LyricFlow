/**
 * tests/mode-buttons.test.js
 * Unit and DOM verification tests for the Main Interface Mode Buttons
 * (Wallpaper Mode, Taskbar Mode, Dynamic Island).
 *
 * Run via: node tests/mode-buttons.test.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('--- Running Main Interface Mode Buttons Tests ---\n');

const htmlPath = path.join(__dirname, '../src/index.html');
const hudCssPath = path.join(__dirname, '../src/styles/_hud.css');
const rendererJsPath = path.join(__dirname, '../src/renderer.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const hudCssContent = fs.readFileSync(hudCssPath, 'utf8');
const rendererJsContent = fs.readFileSync(rendererJsPath, 'utf8');

// 1. DOM Verification in src/index.html
console.log('1. DOM Markup in src/index.html:');
assert(htmlContent.includes('id="btn-wallpaper-mode"'), '#btn-wallpaper-mode exists in index.html');
assert(htmlContent.includes('id="btn-taskbar-mode"'), '#btn-taskbar-mode exists in index.html');
assert(htmlContent.includes('id="btn-dynamic-island"'), '#btn-dynamic-island exists in index.html');
assert(htmlContent.includes('class="hud-controls-divider"'), '.hud-controls-divider exists in window-controls');
assert(htmlContent.includes('Wallpaper Desktop Mode (Ctrl+Shift+W)'), 'Wallpaper button includes correct title and shortcut tooltip');
assert(htmlContent.includes('Taskbar Mode (Ctrl+Shift+B)'), 'Taskbar button includes correct title and shortcut tooltip');
assert(htmlContent.includes('Dynamic Island Mini Mode (Ctrl+Shift+D)'), 'Dynamic Island button includes correct title and shortcut tooltip');

// Check order inside .window-controls
const windowControlsMatch = htmlContent.match(/<div class="window-controls">([\s\S]*?)<\/header>/);
assert(windowControlsMatch !== null, 'window-controls container found in index.html');
if (windowControlsMatch) {
  const controlsInner = windowControlsMatch[1];
  const wpIdx = controlsInner.indexOf('id="btn-wallpaper-mode"');
  const tbIdx = controlsInner.indexOf('id="btn-taskbar-mode"');
  const diIdx = controlsInner.indexOf('id="btn-dynamic-island"');
  assert(wpIdx !== -1 && tbIdx !== -1 && diIdx !== -1, 'All three mode buttons are located inside window-controls');
  assert(wpIdx < tbIdx && tbIdx < diIdx, 'Mode buttons are sequentially arranged (Wallpaper, Taskbar, Dynamic Island)');
}

// Check Settings Shortcuts list
console.log('\n2. Settings Panel Shortcuts List:');
assert(htmlContent.includes('Wallpaper Mode') && htmlContent.includes('Ctrl + Shift + W'), 'Settings panel lists Wallpaper Mode (Ctrl + Shift + W)');
assert(htmlContent.includes('Taskbar Mode') && htmlContent.includes('Ctrl + Shift + B'), 'Settings panel lists Taskbar Mode (Ctrl + Shift + B)');

// 2. CSS Styles in src/styles/_hud.css
console.log('\n3. CSS Styling in src/styles/_hud.css:');
assert(hudCssContent.includes('.hud-controls-divider'), '.hud-controls-divider CSS rule is defined');
assert(hudCssContent.includes('[data-theme="light"] .hud-controls-divider'), '.hud-controls-divider light theme rule is defined');
assert(hudCssContent.includes('.hud-btn.active'), '.hud-btn.active glowing state rule is defined');

// 3. Renderer JavaScript Logic & Mutual Exclusivity
console.log('\n4. Mode Controller & Event Listeners in src/renderer.js:');
assert(/function\s+toggleWallpaperMode/.test(rendererJsContent), 'toggleWallpaperMode function is defined');
assert(/function\s+toggleTaskbarMode/.test(rendererJsContent), 'toggleTaskbarMode function is defined');
assert(rendererJsContent.includes('function updateModeButtonsState()'), 'updateModeButtonsState function is defined');
assert(rendererJsContent.includes('btnWallpaperMode.addEventListener("click"'), 'btnWallpaperMode click listener is registered');
assert(rendererJsContent.includes('btnTaskbarMode.addEventListener("click"'), 'btnTaskbarMode click listener is registered');
assert(rendererJsContent.includes('KeyW') && rendererJsContent.includes('toggleWallpaperMode()'), 'Ctrl+Shift+W shortcut is wired to toggleWallpaperMode()');
assert(rendererJsContent.includes('KeyB') && rendererJsContent.includes('toggleTaskbarMode()'), 'Ctrl+Shift+B shortcut is wired to toggleTaskbarMode()');

// 4. Functional Simulation of Mutual Exclusivity
console.log('\n5. Functional Simulation of Mutual Exclusivity:');
const state = {
  dynamicIslandMode: false,
  wallpaperMode: false,
  taskbarMode: false,
};
const domButtons = {
  island: { active: false, classList: { toggle: (cls, on) => { domButtons.island.active = on; } } },
  wallpaper: { active: false, classList: { toggle: (cls, on) => { domButtons.wallpaper.active = on; } } },
  taskbar: { active: false, classList: { toggle: (cls, on) => { domButtons.taskbar.active = on; } } }
};

function simUpdateButtons() {
  domButtons.island.classList.toggle('active', state.dynamicIslandMode);
  domButtons.wallpaper.classList.toggle('active', state.wallpaperMode);
  domButtons.taskbar.classList.toggle('active', state.taskbarMode);
}

function simToggleWallpaper() {
  state.wallpaperMode = !state.wallpaperMode;
  if (state.wallpaperMode) {
    state.dynamicIslandMode = false;
    state.taskbarMode = false;
  }
  simUpdateButtons();
}

function simToggleTaskbar() {
  state.taskbarMode = !state.taskbarMode;
  if (state.taskbarMode) {
    state.dynamicIslandMode = false;
    state.wallpaperMode = false;
  }
  simUpdateButtons();
}

function simToggleDynamicIsland() {
  state.dynamicIslandMode = !state.dynamicIslandMode;
  if (state.dynamicIslandMode) {
    state.wallpaperMode = false;
    state.taskbarMode = false;
  }
  simUpdateButtons();
}

// Initial state: normal mode
simUpdateButtons();
assert(!domButtons.wallpaper.active && !domButtons.taskbar.active && !domButtons.island.active, 'Initially no buttons active in normal mode');

// Activate Wallpaper Mode
simToggleWallpaper();
assert(state.wallpaperMode === true && domButtons.wallpaper.active === true, 'Wallpaper Mode enabled and active class applied');
assert(domButtons.taskbar.active === false && domButtons.island.active === false, 'Taskbar and Island inactive when Wallpaper Mode active');

// Switch directly to Taskbar Mode
simToggleTaskbar();
assert(state.taskbarMode === true && domButtons.taskbar.active === true, 'Taskbar Mode enabled and active class applied');
assert(state.wallpaperMode === false && domButtons.wallpaper.active === false, 'Wallpaper Mode automatically disengaged');
assert(domButtons.island.active === false, 'Dynamic Island remains inactive');

// Switch directly to Dynamic Island Mode
simToggleDynamicIsland();
assert(state.dynamicIslandMode === true && domButtons.island.active === true, 'Dynamic Island enabled and active class applied');
assert(state.taskbarMode === false && domButtons.taskbar.active === false, 'Taskbar Mode automatically disengaged');
assert(state.wallpaperMode === false && domButtons.wallpaper.active === false, 'Wallpaper Mode remains disengaged');

// Exit Dynamic Island Mode back to Normal
simToggleDynamicIsland();
assert(state.dynamicIslandMode === false && domButtons.island.active === false, 'Dynamic Island disabled');
assert(!domButtons.wallpaper.active && !domButtons.taskbar.active, 'All mode buttons clear upon returning to normal overlay');

// Summary
console.log(`\n${'─'.repeat(40)}`);
console.log(`Main Interface Mode Buttons Tests: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
