/**
 * Unit & Integration Tests: Wallpaper Mode Style Switching & Isolation Integrity
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

function runTests() {
  console.log('\n--- Running Wallpaper Style Switching & Isolation Integrity Tests ---\n');

  const rendererSrc = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf-8').replace(/\r\n/g, '\n');
  const wallpaperCss = fs.readFileSync(path.join(__dirname, '../src/styles/_wallpaper.css'), 'utf-8').replace(/\r\n/g, '\n');
  const kineticCss = fs.readFileSync(path.join(__dirname, '../src/styles/_kinetic.css'), 'utf-8').replace(/\r\n/g, '\n');
  const windowRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/window.rs'), 'utf-8').replace(/\r\n/g, '\n');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf-8').replace(/\r\n/g, '\n');

  // Test 1: Rust WALLPAPER_MODE_ACTIVE flag and guards
  test('1a. window.rs defines WALLPAPER_MODE_ACTIVE and updates it in set_wallpaper_mode', () => {
    assert.ok(windowRs.includes('pub static WALLPAPER_MODE_ACTIVE: AtomicBool'), 'Must declare WALLPAPER_MODE_ACTIVE atomic boolean');
    assert.ok(windowRs.includes('WALLPAPER_MODE_ACTIVE.store(enabled, Ordering::SeqCst);'), 'Must store enabled state in set_wallpaper_mode');
    assert.ok(windowRs.includes('pub fn is_wallpaper_mode_active() -> bool'), 'Must expose is_wallpaper_mode_active helper');
  });

  test('1b. window.rs guards set_cinematic_mode and reset_window_size against resizing wallpaper window', () => {
    assert.ok(windowRs.includes('if WALLPAPER_MODE_ACTIVE.load(Ordering::SeqCst) {\n        crate::log_to_file("[Window Command] set_cinematic_mode ignored: WALLPAPER_MODE_ACTIVE is true");\n        return Ok(());\n    }'), 'set_cinematic_mode must guard against WALLPAPER_MODE_ACTIVE');
    assert.ok(windowRs.includes('if WALLPAPER_MODE_ACTIVE.load(Ordering::SeqCst) {\n        crate::log_to_file("[Window Command] reset_window_size ignored: WALLPAPER_MODE_ACTIVE is true");\n        return Ok(());\n    }'), 'reset_window_size must guard against WALLPAPER_MODE_ACTIVE');
  });

  // Test 2: toggleCinematicView debouncing and wallpaper style switching
  test('2a. renderer.js debounces toggleCinematicView to prevent double-toggle glitch', () => {
    assert.ok(rendererSrc.includes('let _lastCinematicToggleTime = 0;'), 'Must track _lastCinematicToggleTime');
    assert.ok(rendererSrc.includes('now - _lastCinematicToggleTime < 250'), 'Must debounce rapid triggers');
  });

  test('2b. renderer.js toggleCinematicView cleanly toggles wallpaper style in wallpaper mode', () => {
    assert.ok(rendererSrc.includes("if (settings.wallpaperMode) {"), 'Must check settings.wallpaperMode');
    assert.ok(rendererSrc.includes("const nextStyle = (settings.wallpaperStyle === 'cinematic') ? 'style2' : 'cinematic';"), 'Must toggle style between cinematic and style2');
    assert.ok(rendererSrc.includes("setWallpaperStyle(nextStyle);"), 'Must invoke setWallpaperStyle with next style');
  });

  test('2c. renderer.js setWallpaperStyle updates UI selector panel and shows toast', () => {
    assert.ok(rendererSrc.includes("settings.wallpaperStyle = (style === 'style2') ? 'style2' : 'cinematic';"), 'Must set settings.wallpaperStyle');
    assert.ok(rendererSrc.includes("showWallpaperSelectorPanel();"), 'Must display wallpaper selector panel on switch');
    assert.ok(rendererSrc.includes("b.classList.toggle('active', b.dataset.style === settings.wallpaperStyle);"), 'Must synchronize active button state');
  });

  // Test 3: document.body class synchronization in applyVisualSettings
  test('3a. renderer.js applyVisualSettings syncs cinematic-view-active on document.body as well as appContainer', () => {
    assert.ok(rendererSrc.includes('document.body.classList.toggle("cinematic-view-active", isCinematicActive);'), 'Must synchronize cinematic-view-active on document.body');
    assert.ok(rendererSrc.includes('const isCinematicActive = (settings.cinematicMode !== false) && !settings.wallpaperMode && !settings.taskbarMode && !isDynamicIslandMode;'), 'isCinematicActive must be false in wallpaper mode');
  });

  // Test 4: CSS isolation between style 2 and cinematic
  test('4a. _wallpaper.css hides .cinematic-main-stage in wallpaper-style-2', () => {
    assert.ok(wallpaperCss.includes('body.wallpaper-mode.wallpaper-style-2 .cinematic-main-stage {\n  display: none !important;'), 'Must hide cinematic-main-stage in style2');
    assert.ok(wallpaperCss.includes('body.wallpaper-mode.wallpaper-style-2 .lyrics-scroll-container,'), 'Must keep lyrics-scroll-container visible in style2');
  });

  test('4b. _wallpaper.css shows .cinematic-main-stage in wallpaper-style-cinematic and hides lyrics container', () => {
    assert.ok(wallpaperCss.includes('body.wallpaper-mode.wallpaper-style-cinematic .cinematic-main-stage {\n  display: flex !important;'), 'Must show cinematic-main-stage in cinematic wallpaper mode');
    assert.ok(wallpaperCss.includes('body.wallpaper-mode.wallpaper-style-cinematic .lyrics-scroll-container,'), 'Must hide lyrics-scroll-container in cinematic wallpaper mode');
  });

  test('4c. _kinetic.css overrides black background and preserves style 2 elements in wallpaper mode', () => {
    assert.ok(kineticCss.includes('body.wallpaper-mode .cinematic-main-stage {\n  background-color: transparent !important;\n  background: transparent !important;\n}'), 'Must override black background in wallpaper mode');
    assert.ok(kineticCss.includes('body.wallpaper-mode.wallpaper-style-2 .lyrics-scroll-container,'), 'Must preserve lyrics-scroll-container in style2');
    assert.ok(kineticCss.includes('body.wallpaper-mode.wallpaper-style-2 .wallpaper-now-playing {'), 'Must preserve wallpaper-now-playing in style2');
  });

  test('4d. _wallpaper.css gives .lyrics-view fullscreen bounds and disables mask in cinematic wallpaper mode', () => {
    assert.ok(wallpaperCss.includes('body.wallpaper-mode.wallpaper-style-cinematic .lyrics-view {'), 'Must define lyrics-view in cinematic wallpaper mode');
    assert.ok(wallpaperCss.includes('-webkit-mask-image: none !important;'), 'Must clear mask-image in cinematic wallpaper mode');
    assert.ok(wallpaperCss.includes('overflow: visible !important;'), 'Must prevent overflow clipping in cinematic wallpaper mode');
  });

  // Test 5: index.html wallpaper mode selector panel hint
  test('5a. index.html wallpaper selector panel shows Ctrl+Shift+C Switch Style hint', () => {
    assert.ok(indexHtml.includes('Ctrl+Shift+C Switch Style • Ctrl+Shift+W Exit'), 'Must display shortcut hint in selector header');
  });

  // Test 6: syncCinematicState on track change and cache hit in wallpaper mode
  test('6a. renderer.js syncs cinematic state in wallpaper mode on track change and renderLyrics', () => {
    assert.ok(rendererSrc.includes("(isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === 'cinematic')) && cinematicMainRendererInstance"), 'Must sync cinematic state in wallpaper mode');
  });

  // Test 7: Smooth pulsing transition curves
  test('7a. _wallpaper.css provides smooth transition curves for beat bloom scale and text-shadow', () => {
    assert.ok(wallpaperCss.includes('transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.25, 1)'), 'Must have smooth scale transition');
  });

  // Test 8: Dynamic Island transparency isolation & Wallpaper Style 2 lyric focus
  test('8a. _dynamic_island.css and _kinetic.css isolate #app-container and cinematic stage from black backgrounds in island mode', () => {
    const dynamicIslandCss = fs.readFileSync(path.join(__dirname, '../src/styles/_dynamic_island.css'), 'utf-8');
    assert.ok(dynamicIslandCss.includes('body.mode-dynamic-island #app-container,'), 'Must override #app-container in dynamic island mode to transparent');
    assert.ok(dynamicIslandCss.includes('body.mode-dynamic-island .cinematic-main-stage,'), 'Must hide .cinematic-main-stage in dynamic island mode');
    assert.ok(kineticCss.includes('body.cinematic-view-active:not(.mode-dynamic-island):not(.wallpaper-mode):not(.taskbar-mode) #app-container'), 'Must not apply solid black background to app-container in dynamic island or wallpaper modes');
  });

  test('8b. renderer.js scrollLyrics and updatePlayhead evaluate isCinematicActive so lyrics focus in wallpaper-style-2', () => {
    assert.ok(rendererSrc.includes("const isCinematicActive = settings.wallpaperMode ? (settings.wallpaperStyle === 'cinematic') : Boolean(isCinematicView);"), 'Must compute isCinematicActive respecting wallpaper mode');
    assert.ok(rendererSrc.includes('if (isDynamicIslandMode || settings.taskbarMode || isCinematicActive) return;'), 'scrollLyrics must not bail out when in wallpaper-style-2');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
