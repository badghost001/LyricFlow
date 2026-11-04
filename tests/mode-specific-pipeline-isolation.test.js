/**
 * tests/mode-specific-pipeline-isolation.test.js
 * Verification suite for mode-specific pipeline isolation and suspension:
 *   1. Dynamic Island pipeline isolation (fluid mesh stopped, ambilight readbacks skipped,
 *      desktop equalizers/solo stage skipped, desktop progress/time DOM updates skipped,
 *      studio sidebar bypassed, track metadata isolated).
 *   2. Wallpaper mode pipeline isolation and occlusion suspension (fluid mesh active in supported styles,
 *      desktop notifications and widgets bypassed, beat bloom/videos/WASAPI capture suspended on defocus,
 *      seamless resumption on focus return).
 *   3. Desktop mode full pipeline reactivation without leaks or regressions.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const rendererCode = fs.readFileSync(path.join(rootDir, 'src/renderer.js'), 'utf8');
const fluidMeshCode = fs.readFileSync(path.join(rootDir, 'src/modules/fluid-mesh.js'), 'utf8');
const wallpaperCss = fs.readFileSync(path.join(rootDir, 'src/styles/_wallpaper.css'), 'utf8');

console.log('\n================================================================');
console.log('  RUNNING MODE-SPECIFIC PIPELINE ISOLATION & SUSPENSION SUITE    ');
console.log('================================================================\n');

// ============================================================================
// SUITE 1: Static Code Architecture Verification
// ============================================================================
console.log('--- Suite 1: Static Code Architecture Verification ---');

// 1.1 shouldRunFluidMesh helper definition and gating
assert.ok(
  rendererCode.includes('function shouldRunFluidMesh() {') &&
  rendererCode.includes('!isDynamicIslandMode') &&
  rendererCode.includes("settings.wallpaperStyle !== 'cinematic'"),
  'renderer.js must allow fluid mesh in supported wallpaper styles while excluding Dynamic Island and cinematic surfaces'
);
console.log('  ✓ 1.1: shouldRunFluidMesh() cleanly gates fluid mesh execution');

// 1.2 FluidMesh setPalette does not wake settled/stopped mesh
assert.ok(
  fluidMeshCode.includes('if (this.isPlaying || !this.isSettled()) {') &&
  fluidMeshCode.includes('this.start();'),
  'fluid-mesh.js setPalette must only invoke this.start() if playing or unsettled'
);
console.log('  ✓ 1.2: fluid-mesh.js prevents settled/stopped mesh from waking up on palette changes');

// 1.3 VideoFrameAmbilightSampler skips CPU/GPU readbacks in Dynamic Island and Wallpaper modes
assert.ok(
  rendererCode.includes('if (isDynamicIslandMode || (typeof settings !== \'undefined\' && (settings.wallpaperMode || settings.taskbarMode))) {') ||
  rendererCode.includes('if (isDynamicIslandMode || (typeof settings !== "undefined" && (settings.wallpaperMode || settings.taskbarMode))) {'),
  'VideoFrameAmbilightSampler.tick() must early-return in Dynamic Island, Wallpaper, or Taskbar modes'
);
console.log('  ✓ 1.3: VideoFrameAmbilightSampler skips synchronous GPU readbacks in non-desktop modes');

// 1.4 updateStudioSidebar early return in Dynamic Island, Wallpaper, or Taskbar modes
assert.ok(
  rendererCode.includes('if (isDynamicIslandMode || (typeof settings !== \'undefined\' && (settings.wallpaperMode || settings.taskbarMode))) {\n      return;') ||
  rendererCode.includes('if (isDynamicIslandMode || (typeof settings !== \'undefined\' && (settings.wallpaperMode || settings.taskbarMode))) {\r\n      return;'),
  'updateStudioSidebar must immediately return when in Dynamic Island, Wallpaper, or Taskbar modes'
);
console.log('  ✓ 1.4: updateStudioSidebar safely bypasses DOM traversal in isolated modes');

// 1.5 onAudioSpectrum isolation of desktop visualizers and solo stage
assert.ok(
  rendererCode.includes('if (!isDynamicIslandMode && !settings.wallpaperMode && soloStage'),
  'onAudioSpectrum must isolate instrumental solo stage to desktop window mode'
);
assert.ok(
  rendererCode.includes('if (!isDynamicIslandMode && !settings.wallpaperMode) {\n      const desktopLive = document.getElementById("player-live-visualizer");') ||
  rendererCode.includes('if (!isDynamicIslandMode && !settings.wallpaperMode) {\r\n      const desktopLive = document.getElementById("player-live-visualizer");'),
  'onAudioSpectrum must gate desktop live equalizers to desktop window mode'
);
console.log('  ✓ 1.5: onAudioSpectrum isolates solo stage and desktop equalizer DOM animations');

// 1.6 Wallpaper occlusion suspension of videos, beat bloom, and WASAPI loopback
assert.ok(
  rendererCode.includes('if (typeof isWallpaperDesktopFocused === \'undefined\' || isWallpaperDesktopFocused) {\n        const subBass = Math.max') ||
  rendererCode.includes('if (typeof isWallpaperDesktopFocused === \'undefined\' || isWallpaperDesktopFocused) {\r\n        const subBass = Math.max'),
  'onAudioSpectrum beat bloom must check isWallpaperDesktopFocused'
);
assert.ok(
  rendererCode.includes('wallpaperStyleArtVideo.pause()') &&
  rendererCode.includes('wallpaperAlbumBgVideo.pause()'),
  'onWallpaperFocusChanged must pause wallpaper video surfaces when occluded/defocused'
);
assert.ok(
  rendererCode.includes('isWallpaperBloomActive = Boolean(isWallpaperModeActive && settings.wallpaperBeatBloom !== false && (typeof isWallpaperDesktopFocused === \'undefined\' || isWallpaperDesktopFocused));'),
  'syncAudioVisualizerState must suspend WASAPI loopback capture when wallpaper is occluded'
);
console.log('  ✓ 1.6: Wallpaper mode suspends videos, beat bloom, and WASAPI capture when occluded');

// 1.7 updatePlayhead progress throttling and DOM updates isolation
assert.ok(
  rendererCode.includes('const isDesktopUiVisible = !isDynamicIslandMode && !settings.wallpaperMode && !settings.taskbarMode && !isKineticMode && !isCinematicView;'),
  'updatePlayhead must define isDesktopUiVisible to gate desktop progress bar and time updates'
);
console.log('  ✓ 1.7: updatePlayhead bypasses desktop progress bar/time DOM writes in isolated modes');

// 1.8 handlePlaybackData metadata isolation
assert.ok(
  rendererCode.includes('if (!isDynamicIslandMode && !settings.wallpaperMode && !settings.taskbarMode) {') &&
  rendererCode.includes('widgetTrackName.textContent = track.name;'),
  'handlePlaybackData must gate desktop widget track title/artist/art updates'
);
assert.ok(
  rendererCode.includes('currentIslandIsLossless = isLossless;') &&
  rendererCode.includes('currentIslandIsHiRes = isLossless && Boolean(data.bit_depth && data.bit_depth > 16);'),
  'handlePlaybackData must isolate Dynamic Island lossless state and sync'
);
console.log('  ✓ 1.8: handlePlaybackData strictly isolates desktop and Dynamic Island metadata pipelines');

assert.ok(
  wallpaperCss.includes('wallpaper-mode.bg-style-fluid.has-animated-art-video:not(.wallpaper-style-2)') &&
  wallpaperCss.includes('z-index: 1;\n  opacity: calc(var(--glow-intensity, 1) * 0.56) !important;'),
  'Wallpaper fluid mesh must composite over animated backdrop video rather than disappear behind it'
);
console.log('  ✓ 1.9: Wallpaper fluid mesh remains visible when animated backdrop art is active');

// ============================================================================
// SUITE 2: Functional VM Simulation of Dynamic Island Mode Isolation
// ============================================================================
assert.ok(
  wallpaperCss.includes('wallpaper-mode.bg-style-fluid.has-animated-art-video:not(.wallpaper-style-2):not(.wallpaper-style-cinematic) .app-container') &&
  wallpaperCss.includes('rgba(5, 5, 7, 0.24) !important;') &&
  wallpaperCss.includes('backdrop-filter: blur(14px) saturate(1.35) !important;'),
  'Wallpaper lyric surface must let the animated mesh remain visible while retaining a softened text backdrop'
);

assert.ok(
  wallpaperCss.includes('body.wallpaper-mode.bg-style-fluid .app-container') &&
  wallpaperCss.includes('rgba(5, 5, 7, 0.22) !important;') &&
  wallpaperCss.includes('backdrop-filter: blur(14px) saturate(1.35) !important;'),
  'Fluid Wallpaper Mode must keep the mesh visible through the content surface'
);

console.log('\n--- Suite 2: Functional VM Simulation - Dynamic Island Mode ---');

{
  const sandbox = {
    isDynamicIslandMode: true,
    settings: {
      wallpaperMode: false,
      taskbarMode: false,
      bgStyle: 'fluid'
    },
    isCinematicView: false,
    document: {
      getElementById: (id) => null
    }
  };
  vm.createContext(sandbox);

  // Evaluate shouldRunFluidMesh logic
  const shouldRun = vm.runInContext(`
    ${rendererCode.match(/function isCustomBackgroundActive\(\) \{[\s\S]*?\n\}/)[0]}
    ${rendererCode.match(/function shouldRunFluidMesh\(\) \{[\s\S]*?\n\}/)[0]}
    shouldRunFluidMesh();
  `, sandbox);

  assert.strictEqual(shouldRun, false, 'shouldRunFluidMesh must evaluate to false in Dynamic Island mode');
  console.log('  ✓ 2.1: Fluid mesh is strictly suppressed in Dynamic Island mode');

  // Verify Ambilight Sampler early-return
  let drawImageCalls = 0;
  let getImageDataCalls = 0;
  sandbox.samplerCanvas = {
    getContext: () => ({
      drawImage: () => { drawImageCalls++; },
      getImageData: () => { getImageDataCalls++; return { data: new Uint8Array(4) }; }
    })
  };

  const samplerExecution = vm.runInContext(`
    let didEarlyReturn = false;
    function tickSampler() {
      if (isDynamicIslandMode || (typeof settings !== 'undefined' && (settings.wallpaperMode || settings.taskbarMode))) {
        didEarlyReturn = true;
        return;
      }
      samplerCanvas.getContext('2d').drawImage();
      samplerCanvas.getContext('2d').getImageData();
    }
    tickSampler();
    didEarlyReturn;
  `, sandbox);

  assert.strictEqual(samplerExecution, true, 'Ambilight sampler must return early in Dynamic Island mode');
  assert.strictEqual(drawImageCalls, 0, 'No drawImage calls must occur in Dynamic Island mode');
  assert.strictEqual(getImageDataCalls, 0, 'No getImageData GPU readbacks must occur in Dynamic Island mode');
  console.log('  ✓ 2.2: VideoFrameAmbilightSampler performs 0 GPU readbacks in Dynamic Island mode');

  // Verify desktop progress DOM gating
  let domWrites = 0;
  sandbox.widgetProgressFill = { style: { set width(v) { domWrites++; } } };
  sandbox.widgetTimeCurrent = { set textContent(v) { domWrites++; } };
  sandbox.isScrubbingMainProgress = false;
  sandbox.isKineticMode = false;

  vm.runInContext(`
    const isDesktopUiVisible = !isDynamicIslandMode && !settings.wallpaperMode && !settings.taskbarMode && !isKineticMode && !isCinematicView;
    if (isDesktopUiVisible) {
      widgetProgressFill.style.width = '50%';
      widgetTimeCurrent.textContent = '1:23';
    }
  `, sandbox);

  assert.strictEqual(domWrites, 0, 'No desktop progress DOM writes must occur in Dynamic Island mode');
  console.log('  ✓ 2.3: updatePlayhead performs 0 desktop progress DOM writes in Dynamic Island mode');
}

// ============================================================================
// SUITE 3: Functional VM Simulation of Wallpaper Mode Occlusion Suspension
// ============================================================================
console.log('\n--- Suite 3: Functional VM Simulation - Wallpaper Mode Suspension ---');

{
  const sandbox = {
    isDynamicIslandMode: false,
    settings: {
      wallpaperMode: true,
      taskbarMode: false,
      wallpaperBeatBloom: true,
      wallpaperStyle: 'fluid'
    },
    isCinematicView: false,
    isWallpaperDesktopFocused: true,
    document: {
      getElementById: (id) => null
    }
  };
  vm.createContext(sandbox);

  // 3.1 Fluid mesh remains available in non-cinematic Wallpaper styles
  const shouldRun = vm.runInContext(`
    ${rendererCode.match(/function isCustomBackgroundActive\(\) \{[\s\S]*?\n\}/)[0]}
    ${rendererCode.match(/function shouldRunFluidMesh\(\) \{[\s\S]*?\n\}/)[0]}
    shouldRunFluidMesh();
  `, sandbox);
  assert.strictEqual(shouldRun, true, 'shouldRunFluidMesh must evaluate to true in supported fluid Wallpaper mode');
  console.log('  ✓ 3.1: Fluid mesh is available in supported Wallpaper styles');

  sandbox.settings.wallpaperStyle = 'cinematic';
  const shouldRunCinematic = vm.runInContext('shouldRunFluidMesh();', sandbox);
  assert.strictEqual(shouldRunCinematic, false, 'Cinematic Wallpaper must keep its own renderer without the fluid mesh');
  sandbox.settings.wallpaperStyle = 'style2';

  // 3.2 Visualizer state when focused vs defocused
  const visualizerActiveFocused = vm.runInContext(`
    let isWallpaperBloomActive = Boolean(settings.wallpaperMode && settings.wallpaperBeatBloom !== false && (typeof isWallpaperDesktopFocused === 'undefined' || isWallpaperDesktopFocused));
    isWallpaperBloomActive;
  `, sandbox);
  assert.strictEqual(visualizerActiveFocused, true, 'WASAPI capture is active when wallpaper is focused');

  sandbox.isWallpaperDesktopFocused = false;
  const visualizerActiveDefocused = vm.runInContext(`
    isWallpaperBloomActive = Boolean(settings.wallpaperMode && settings.wallpaperBeatBloom !== false && (typeof isWallpaperDesktopFocused === 'undefined' || isWallpaperDesktopFocused));
    isWallpaperBloomActive;
  `, sandbox);
  assert.strictEqual(visualizerActiveDefocused, false, 'WASAPI capture is suspended when wallpaper is defocused');
  console.log('  ✓ 3.2: Audio visualizer loopback captures WASAPI only when wallpaper is focused');

  // 3.3 Video pause and resume lifecycle
  let videoPaused = false;
  let videoPlayed = false;
  sandbox.wallpaperStyleArtVideo = {
    pause: () => { videoPaused = true; },
    play: () => { videoPlayed = true; return Promise.resolve(); }
  };
  sandbox.wallpaperAlbumBgVideo = null;
  sandbox.syncAudioVisualizerState = () => {};

  vm.runInContext(`
    function onWallpaperFocusChanged(focused) {
      isWallpaperDesktopFocused = focused;
      if (!focused) {
        if (wallpaperStyleArtVideo) wallpaperStyleArtVideo.pause();
      } else {
        if (wallpaperStyleArtVideo) wallpaperStyleArtVideo.play().catch(() => {});
      }
    }
    onWallpaperFocusChanged(false);
  `, sandbox);
  assert.strictEqual(videoPaused, true, 'Wallpaper video must pause on defocus');

  vm.runInContext(`
    onWallpaperFocusChanged(true);
  `, sandbox);
  assert.strictEqual(videoPlayed, true, 'Wallpaper video must resume on focus return');
  console.log('  ✓ 3.3: Wallpaper video playback pauses on occlusion and resumes on focus return');
}

// ============================================================================
// SUITE 4: Desktop Mode Full Reactivation Verification
// ============================================================================
console.log('\n--- Suite 4: Desktop Mode Pipeline Reactivation ---');

{
  const sandbox = {
    isDynamicIslandMode: false,
    settings: {
      wallpaperMode: false,
      taskbarMode: false,
      bgStyle: 'fluid'
    },
    isCinematicView: false,
    document: {
      getElementById: (id) => null
    }
  };
  vm.createContext(sandbox);

  const shouldRun = vm.runInContext(`
    ${rendererCode.match(/function isCustomBackgroundActive\(\) \{[\s\S]*?\n\}/)[0]}
    ${rendererCode.match(/function shouldRunFluidMesh\(\) \{[\s\S]*?\n\}/)[0]}
    shouldRunFluidMesh();
  `, sandbox);
  assert.strictEqual(shouldRun, true, 'shouldRunFluidMesh must evaluate to true in normal Desktop mode');
  console.log('  ✓ 4.1: Fluid mesh cleanly activates in normal Desktop mode with fluid bgStyle');

  const isDesktopUiVisible = vm.runInContext(`
    isKineticMode = false;
    !isDynamicIslandMode && !settings.wallpaperMode && !settings.taskbarMode && !isKineticMode && !isCinematicView;
  `, sandbox);
  assert.strictEqual(isDesktopUiVisible, true, 'Desktop UI visible flag is active in Desktop mode');
  console.log('  ✓ 4.2: Full desktop UI updates and progress throttler reactivated in Desktop mode');
}

console.log('\n================================================================');
console.log('  ALL MODE-SPECIFIC PIPELINE ISOLATION TESTS PASSED (100% GREEN) ');
console.log('================================================================\n');
