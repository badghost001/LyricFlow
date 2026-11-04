/**
 * Unit & Integration Tests: Wallpaper Mode Style 2 Fluid Mesh,
 * Taskbar Mode Clean Transition, and Level 2 / Level 3 Lyric Replacement.
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
  console.log('\n--- Running Wallpaper Style 2 Fluid Mesh & Same-Level Lyrics Tests ---\n');

  const rendererSrc = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf-8').replace(/\r\n/g, '\n');
  const wallpaperCss = fs.readFileSync(path.join(__dirname, '../src/styles/_wallpaper.css'), 'utf-8').replace(/\r\n/g, '\n');
  const fluidMeshSrc = fs.readFileSync(path.join(__dirname, '../src/modules/fluid-mesh.js'), 'utf-8').replace(/\r\n/g, '\n');
  const windowRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/window.rs'), 'utf-8').replace(/\r\n/g, '\n');
  const tauriBridgeSrc = fs.readFileSync(path.join(__dirname, '../src/tauri-bridge.js'), 'utf-8').replace(/\r\n/g, '\n');

  // Test 1: Same-level lyric replacement logic
  test('1a. applyLyricsData allows level 2 lyrics to replace level 2 and level 3 to replace level 3', () => {
    assert.ok(
      rendererSrc.includes('const allowSameLevelReplacement = (sourceLevel >= 2 && sourceLevel === currentSourceLevel);'),
      'applyLyricsData must define allowSameLevelReplacement for levels >= 2'
    );
    assert.ok(
      rendererSrc.includes('if (!allowSameLevelReplacement && !isAppleUpgrade && !isQualityUpgrade)'),
      'applyLyricsData must not reject incoming lyrics when allowSameLevelReplacement is true'
    );
  });

  test('1b. applyLyricsData does not allow stale/lower quality lyrics to downgrade higher quality', () => {
    assert.ok(
      rendererSrc.includes('if (sourceLevel < currentSourceLevel)'),
      'Must still reject incoming lyrics when sourceLevel < currentSourceLevel'
    );
  });

  test('1c. applyLyricsData bypasses qApple priority lock when same-level replacement is active', () => {
    assert.ok(
      rendererSrc.includes('if (!allowSameLevelReplacement && isCurrentApple && currentSourceLevel >= 2 && !isAppleMusicSource'),
      'Must allow other providers at equal level (2 or 3) to replace qApple'
    );
  });

  // Test 2: Fluid Mesh in Wallpaper Mode Style 2
  test('2a. transitionToMode preserves wallpaperStyle style2 and does not overwrite it to cinematic', () => {
    assert.ok(
      rendererSrc.includes("if (!settings.wallpaperStyle) {\n        settings.wallpaperStyle = (typeof wasCinematicBefore !== 'undefined' && wasCinematicBefore) ? 'cinematic' : 'style2';\n      }"),
      'Must only default wallpaperStyle when not already set'
    );
  });

  test('2b. transitionToMode wallpaper branch wakes and defrosts fluidMeshGradientInstance for style 2', () => {
    const wpBranch = rendererSrc.slice(rendererSrc.indexOf("targetMode === 'wallpaper'"), rendererSrc.indexOf("targetMode === 'taskbar'"));
    assert.ok(wpBranch.includes('fluidMeshGradientInstance.wake?.();') || wpBranch.includes('fluidMeshGradientInstance.wake()'), 'Must wake fluid mesh in wallpaper transition');
    assert.ok(wpBranch.includes('fluidMeshGradientInstance.defrost?.();') || wpBranch.includes('fluidMeshGradientInstance.defrost()'), 'Must defrost fluid mesh in wallpaper transition');
    assert.ok(wpBranch.includes('fluidMeshGradientInstance.start();'), 'Must start fluid mesh in wallpaper transition');
  });

  test('2c. applyVisualSettings wallpaperMode branch revives fluidMesh for style 2', () => {
    const applyVisualWallBranch = rendererSrc.slice(rendererSrc.indexOf("else if (settings.wallpaperMode) {"), rendererSrc.indexOf("selectWallpaperStyle.value = currentWallStyle;"));
    assert.ok(applyVisualWallBranch.includes('fluidMeshGradientInstance.wake?.();'), 'applyVisualSettings must wake fluid mesh');
    assert.ok(applyVisualWallBranch.includes('fluidMeshGradientInstance.defrost?.();'), 'applyVisualSettings must defrost fluid mesh');
  });

  test('2d. fluid-mesh.js loop does not stop on window-blurred in wallpaper mode', () => {
    assert.ok(
      fluidMeshSrc.includes("const isWallpaper = typeof document !== 'undefined' && Boolean(document.body && document.body.classList.contains('wallpaper-mode'));"),
      'fluid-mesh loop must inspect wallpaper-mode class on body'
    );
    assert.ok(
      fluidMeshSrc.includes("!isWallpaper && document.body && document.body.classList.contains('window-blurred')"),
      'fluid-mesh loop must ignore window-blurred when in wallpaper mode'
    );
  });

  test('2e. window blur event listeners do not stop fluid mesh in wallpaper mode', () => {
    assert.ok(
      rendererSrc.includes('if (fluidMeshGradientInstance && !settings.wallpaperMode) {\n        fluidMeshGradientInstance.stop();\n      }'),
      'First blur handler must check !settings.wallpaperMode before stopping fluid mesh'
    );
    assert.ok(
      rendererSrc.includes('if (typeof fluidMeshGradientInstance !== \'undefined\' && fluidMeshGradientInstance && !settings.wallpaperMode) {\n    fluidMeshGradientInstance.stop();\n  }'),
      'Second blur handler must check !settings.wallpaperMode before stopping fluid mesh'
    );
  });

  test('2f. _wallpaper.css lowers wallpaper-album-bg opacity in style 2 so fluid mesh is visible', () => {
    assert.ok(
      wallpaperCss.includes('body.wallpaper-mode.wallpaper-style-2 .wallpaper-album-bg {\n  display: block;\n  opacity: 0.28 !important;'),
      'wallpaper-style-2 .wallpaper-album-bg opacity must be 0.28 to let mesh shine through'
    );
  });

  // Test 3: Clean transition between taskbar mode and wallpaper mode
  test('3a. window.rs set_taskbar_mode only emits force-normal-mode when from_tray is true', () => {
    assert.ok(
      windowRs.includes('if from_tray.unwrap_or(false) {\n            let _ = app.emit("force-normal-mode", ());\n        }'),
      'Rust set_taskbar_mode must guard force-normal-mode emission with from_tray'
    );
  });

  test('3b. tauri-bridge.js taskbarAPI.openApp passes fromTray: true to restore normal mode', () => {
    assert.ok(
      tauriBridgeSrc.includes("openApp: () => safeInvoke('set_taskbar_mode', { enabled: false, fromTray: true }),"),
      'taskbarAPI.openApp must pass fromTray: true'
    );
  });

  test('3c. renderer.js onForceNormalMode ignores event during mode transitions or active wallpaper mode', () => {
    assert.ok(
      rendererSrc.includes('if (isTransitioningMode || (settings && (settings.wallpaperMode || isDynamicIslandMode || isKineticMode)))'),
      'onForceNormalMode must guard against active transitions or wallpaper mode'
    );
  });

  test('3d. transitionToMode taskbar branch uses stop() instead of sleep() to prevent context loss', () => {
    const taskbarBranch = rendererSrc.slice(rendererSrc.indexOf("targetMode === 'taskbar'"), rendererSrc.indexOf("targetMode === 'kinetic'"));
    assert.ok(
      taskbarBranch.includes('fluidMeshGradientInstance.stop();'),
      'taskbar branch must cleanly stop mesh without sleep() context loss'
    );
    assert.ok(
      !taskbarBranch.includes('fluidMeshGradientInstance.sleep()'),
      'taskbar branch must not invoke sleep()'
    );
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
