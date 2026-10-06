/**
 * Unit & Integration Tests: Wallpaper Mode Performance, Shortcut Menu & Instant Lyrics Fetching
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
  console.log('\n--- Running Wallpaper Performance, Shortcut Menu & Instant Fetch Tests ---\n');

  const lyricsPlusSrc = fs.readFileSync(path.join(__dirname, '../src/services/lyrics/LyricsPlus.js'), 'utf-8');
  const rendererSrc = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf-8');
  const wallpaperCss = fs.readFileSync(path.join(__dirname, '../src/styles/_wallpaper.css'), 'utf-8');
  const settingsCss = fs.readFileSync(path.join(__dirname, '../src/styles/_settings.css'), 'utf-8');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf-8');
  const hudHtml = fs.readFileSync(path.join(__dirname, '../src/wallpaper_hud.html'), 'utf-8');
  const windowRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/window.rs'), 'utf-8');
  const libRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/lib.rs'), 'utf-8');
  const bridgeJs = fs.readFileSync(path.join(__dirname, '../src/tauri-bridge.js'), 'utf-8');

  // Test 1: LyricsPlus service default timeout is lowered to 2500ms
  test('1a. LyricsPlus service lowers timeout to 2500ms to eliminate 8s stall', () => {
    assert.ok(lyricsPlusSrc.includes('this.timeoutMs = options.timeoutMs || 2500;'), 'timeoutMs must default to 2500');
  });

  // Test 2: Primary lyrics providers run concurrently
  test('1b. renderer.js queries Rust multi-provider & LyricsPlus concurrently with fast-path race', () => {
    assert.ok(rendererSrc.includes('const rustPromise = rustLyricsFetch();'), 'Must initiate rustLyricsFetch promise');
    assert.ok(rendererSrc.includes('const lpPromise ='), 'Must initiate lpPromise');
    assert.ok(rendererSrc.includes('Promise.race([rustPromise, lpPromise])'), 'Must race for instant level 3 resolution');
    assert.ok(rendererSrc.includes('Promise.allSettled([rustPromise, lpPromise])'), 'Must settle both providers for upgrade');
  });

  // Test 3: Audio spectrum listener guards against null islandWave / bars in Wallpaper Mode
  test('2a. renderer.js audio visualizer listener guards islandWave and bars against null', () => {
    assert.ok(rendererSrc.includes('if (isDynamicIslandMode && islandWave && bars && bars.length > 0)'), 'Must guard island visualizer logic');
    assert.ok(rendererSrc.includes('if (settings.wallpaperMode && settings.wallpaperBeatBloom !== false)'), 'Wallpaper beat bloom must execute independently of islandWave');
  });

  // Test 4: Fluid WebGL mesh loop stops in Wallpaper Mode unless fluid background is explicitly selected
  test('2b. renderer.js stops WebGL mesh in Wallpaper Mode when bgStyle is not fluid', () => {
    assert.ok(rendererSrc.includes('const shouldRunMesh = !isDynamicIslandMode && !settings.taskbarMode && (currentBgStyle === \'fluid\') && !hasCustomBackground;'), 'shouldRunMesh must only be true for fluid background style');
  });

  // Test 5: Wallpaper background CSS optimizes blur and removes continuous pan keyframe
  test('2c. _wallpaper.css optimizes blur to 32px and removes 30s pan keyframes', () => {
    assert.ok(wallpaperCss.includes('filter: blur(32px) saturate(1.8) brightness(0.45);'), 'Wallpaper album blur should be 32px');
    assert.ok(!wallpaperCss.includes('animation: appleMusicBgPan'), 'appleMusicBgPan continuous animation must be removed');
  });

  // Test 6: Settings shortcuts table has interactive data-shortcut-action attributes
  test('3a. index.html defines data-shortcut-action on all shortcut rows', () => {
    assert.ok(indexHtml.includes('data-shortcut-action="cinematic"'), 'Cinematic row must have action attribute');
    assert.ok(indexHtml.includes('data-shortcut-action="island"'), 'Dynamic Island row must have action attribute');
    assert.ok(indexHtml.includes('data-shortcut-action="wallpaper"'), 'Wallpaper row must have action attribute');
    assert.ok(indexHtml.includes('data-shortcut-action="taskbar"'), 'Taskbar row must have action attribute');
    assert.ok(indexHtml.includes('data-shortcut-action="ghost"'), 'Ghost mode row must have action attribute');
    assert.ok(indexHtml.includes('data-shortcut-action="share"'), 'Share row must have action attribute');
    assert.ok(indexHtml.includes('data-shortcut-action="copy"'), 'Copy row must have action attribute');
    assert.ok(indexHtml.includes('data-shortcut-action="search"'), 'Search row must have action attribute');
    assert.ok(indexHtml.includes('data-shortcut-action="refetch"'), 'Refetch row must have action attribute');
    assert.ok(indexHtml.includes('data-shortcut-action="playpause"'), 'Play/pause row must have action attribute');
  });

  // Test 7: Shortcut rows have interactive hover & active styles in CSS
  test('3b. _settings.css gives .shortcut-row cursor: pointer and hover transitions', () => {
    assert.ok(settingsCss.includes('cursor: pointer;'), 'shortcut-row must have pointer cursor');
    assert.ok(settingsCss.includes('.shortcut-row:hover'), 'shortcut-row must have hover styles');
    assert.ok(settingsCss.includes('.shortcut-row:active'), 'shortcut-row must have active styles');
  });

  // Test 8: renderer.js binds click handlers for all shortcut rows
  test('3c. renderer.js binds click event listeners to .shortcut-row[data-shortcut-action]', () => {
    assert.ok(rendererSrc.includes("document.querySelectorAll('.shortcut-row[data-shortcut-action]').forEach"), 'Must query and bind shortcut rows');
    assert.ok(rendererSrc.includes("case 'cinematic':"), 'Must handle cinematic click action');
    assert.ok(rendererSrc.includes("case 'wallpaper':"), 'Must handle wallpaper click action');
    assert.ok(rendererSrc.includes("case 'copy':"), 'Must handle copy click action');
    assert.ok(rendererSrc.includes("case 'playpause':"), 'Must handle playpause click action');
  });

  // Test 9: Global shortcuts and in-app keydown cover Cinematic Mode, Copy Lyric & Escape
  test('3d. lib.rs and renderer.js wire Ctrl+Shift+C to Cinematic Mode and Ctrl+Alt+C to Copy Lyric', () => {
    assert.ok(libRs.includes('(text.contains("shift") && text.contains("keyc")) || (text.contains("shift") && text.contains("keyk"))'), 'Ctrl+Shift+C and Ctrl+Shift+K must trigger cinematic mode');
    assert.ok(libRs.includes('text.contains("alt") && text.contains("keyc")'), 'Ctrl+Alt+C must trigger copy-active-lyric');
    assert.ok(bridgeJs.includes('onToggleCinematicModeShortcut: (cb) => safeListen(\'toggle-cinematic-mode-shortcut\''), 'Bridge must expose onToggleCinematicModeShortcut');
    assert.ok(rendererSrc.includes('window.electronAPI.onToggleCinematicModeShortcut'), 'Renderer must listen to cinematic shortcut');
  });

  // Test 10: Wallpaper Mode uses Ctrl+Shift+W and does not hijack global Escape key
  test('4a. Wallpaper mode relies strictly on Ctrl+Shift+W without hijacking global Escape key', () => {
    assert.ok(!windowRs.includes('app.global_shortcut().register(sc)'), 'Must not register global escape in window.rs');
    assert.ok(libRs.includes('"ctrl+shift+w"'), 'Must register ctrl+shift+w in lib.rs');
    assert.ok(!libRs.includes('if text.contains("escape")'), 'lib.rs must not intercept global escape');
  });

  // Test 11: lib.rs triggers toggle-wallpaper-mode-shortcut on Ctrl+Shift+W
  test('4b. lib.rs global shortcut handler emits toggle-wallpaper-mode-shortcut on Ctrl+Shift+W', () => {
    assert.ok(libRs.includes('text.contains("shift") && text.contains("keyw")'), 'lib.rs must check for shift+w');
    assert.ok(libRs.includes('toggle-wallpaper-mode-shortcut'), 'Must emit toggle-wallpaper-mode-shortcut on Ctrl+Shift+W');
  });

  // Test 12: window.rs attaches to WorkerW and sets cursor events ignore for wallpaper mode
  test('4c. window.rs attaches to WorkerW and sets cursor events ignore for wallpaper mode', () => {
    assert.ok(windowRs.includes('workerw::attach_to_workerw(hwnd)'), 'Must attach to workerw');
    assert.ok(windowRs.includes('main_win.set_ignore_cursor_events(true)'), 'Must ignore cursor events in wallpaper mode');
  });

  // Test 13: wallpaper_hud.html has prominent emerald Esc badge and click/key listeners
  test('4d. wallpaper_hud.html renders prominent Esc badge and click/key exit handlers', () => {
    assert.ok(hudHtml.includes('<span class="wallpaper-exit-hint">Esc</span>'), 'HUD must render Esc hint badge');
    assert.ok(hudHtml.includes('exitWallpaperMode()'), 'HUD must define exitWallpaperMode');
    assert.ok(hudHtml.includes('btn.addEventListener(\'click\''), 'HUD must bind click listener');
    assert.ok(hudHtml.includes('e.key === \'Escape\''), 'HUD must handle Escape key');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
