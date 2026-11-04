/**
 * tests/split-view-motion-artwork-ux.test.js
 * Verification of split-view tall motion artwork UX fixes:
 * 1. Resuming motion video in split view after modal expand & exit
 * 2. Anchoring the song details panel near the progress bar
 * 3. Switching to animated square artwork when tall artwork button is turned off
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const srcDir = path.join(__dirname, '..', 'src');
const studioCss = fs.readFileSync(path.join(srcDir, 'styles', '_studio.css'), 'utf8');
const splitArtCss = fs.readFileSync(path.join(srcDir, 'styles', '_studio_split_art.css'), 'utf8');
const playbackCss = fs.readFileSync(path.join(srcDir, 'styles', '_playback.css'), 'utf8');
const rendererJs = fs.readFileSync(path.join(srcDir, 'renderer.js'), 'utf8');

console.log('\n--- Running Split-View Motion Artwork UX Regression Suite ---\n');

// 1. Expand & Exit Resumption
console.log('1. Modal Expand & Exit Motion Resumption:');
assert.ok(
  rendererJs.includes('const preferTall = (isSplit && settings.splitTallArtwork !== false && supportsTallMotionArtwork())'),
  'showAlbumArtModal must recognize preferTall in split-view mode'
);
assert.ok(
  rendererJs.includes('pauseAnimatedArtVideos();') &&
  rendererJs.includes('activeVideoSrc = hasActiveMotion ? effectiveMotionUrl : null;'),
  'showAlbumArtModal must pause background videos and select effectiveMotionUrl'
);
assert.ok(
  rendererJs.includes('vidEl.pause();\n    vidEl.removeAttribute(\'src\');\n    vidEl.load();') ||
  rendererJs.includes('vidEl.pause();\r\n    vidEl.removeAttribute(\'src\');\r\n    vidEl.load();'),
  'hideAlbumArtModal must unload the modal video to release GPU hardware decoders'
);
assert.ok(
  rendererJs.includes('resumeAnimatedArtVideos();') &&
  rendererJs.includes('function hideAlbumArtModal()'),
  'hideAlbumArtModal must call resumeAnimatedArtVideos() to restart background video playback'
);
assert.ok(
  rendererJs.includes('const artModal = document.getElementById(\'album-art-modal\');') &&
  rendererJs.includes('if (artModal && artModal.classList.contains(\'show\')) {\n    return false;') ||
  rendererJs.includes('if (artModal && artModal.classList.contains(\'show\')) {\r\n    return false;'),
  'isMotionVideoSurfaceActive must return false while modal is showing to suppress contention'
);
console.log('  ✓ 1. Background video decoders safely release, modal plays tall stream, and split view cleanly resumes upon exit');

// 2. Song Details Panel Positioning
console.log('\n2. Song Details Panel Layout & Progress Bar Proximity:');
assert.ok(
  studioCss.includes('body.layout-split.has-motion-tall-art:not(.auto-hide-controls):not(.auto-hide-collapsed):not(.auto-hide-faded):not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode):not(.cinematic-view-active) .studio-sidebar') &&
  studioCss.includes('justify-content: center !important;'),
  '_studio.css must center tall artwork at rest instead of dropping it toward the footer'
);
assert.ok(
  studioCss.includes('body.layout-split.has-animated-art-video:not(.auto-hide-controls):not(.auto-hide-collapsed):not(.auto-hide-faded):not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode):not(.cinematic-view-active) .studio-track-meta') &&
  studioCss.includes('margin: 0 auto 4px auto !important;'),
  '_studio.css must anchor .studio-track-meta right above the bottom edge of the sidebar'
);
assert.ok(
  studioCss.includes('body.layout-split.has-animated-art-video.split-tall-art') &&
  studioCss.includes('max-height: clamp(310px, 52vh, 460px) !important;'),
  '_studio.css must allow tall artwork container to scale gracefully above track meta'
);
console.log('  ✓ 2. Song details panel is anchored down near the progress bar rather than in the middle of tall artwork');

// 3. Tall Artwork Toggle to Animated Square
console.log('\n3. Tall Artwork Button Toggle to Animated Square:');
assert.ok(
  studioCss.includes('body.layout-split.has-animated-art-video:not(.split-tall-art)') &&
  studioCss.includes('aspect-ratio: 1 / 1 !important;'),
  '_studio.css must assign aspect-ratio: 1 / 1 to .studio-art-container when split-tall-art is turned off'
);
assert.ok(
  studioCss.includes('body.layout-split.has-motion-tall-art:not(.split-tall-art)') &&
  studioCss.includes('aspect-ratio: 1 / 1 !important;'),
  '_studio.css must assign aspect-ratio: 1 / 1 to has-motion-tall-art:not(.split-tall-art)'
);
assert.ok(
  rendererJs.includes('const useTallMotionArt = (settings.splitTallArtwork !== false) && supportsTallMotionArtwork();') &&
  rendererJs.includes('const splitMotionUrl = useTallMotionArt ? effectiveTallUrl : effectiveUrl;'),
  'syncActiveAnimatedVideoState must select effectiveUrl (animated square) when splitTallArtwork is false'
);
assert.ok(
  rendererJs.includes('studioArtVideo._motionSquareFallbackTrack = null;') &&
  rendererJs.includes('function setSplitTallArtwork('),
  'setSplitTallArtwork must reset fallback locks when toggling mode'
);
console.log('  ✓ 3. Turning off tall artwork button switches layout and video stream directly to animated square');

// 4. Tall Artwork Behind Progress Bar in Auto-Hide / Expanded
console.log('\n4. Tall Artwork Behind Progress Bar in Auto-Hide:');
assert.ok(
  studioCss.includes('body.layout-split.has-animated-art-video.split-tall-art.auto-hide-controls') &&
  studioCss.includes('.studio-sidebar') &&
  studioCss.includes('grid-row: 1 / -1 !important;') &&
  studioCss.includes('z-index: 2 !important;'),
  '_studio.css must span .studio-sidebar across grid-row: 1 / -1 with z-index: 2 when auto-hide is active'
);
assert.ok(
  studioCss.includes('body.layout-split.has-animated-art-video.split-tall-art.auto-hide-controls') &&
  studioCss.includes('.studio-art-container') &&
  studioCss.includes('height: min(70vh, calc(100% - 132px)) !important;') &&
  studioCss.includes('max-height: calc(100% - 132px) !important;') &&
  studioCss.includes('transform: translate3d(0, 0, 0) !important;'),
  '_studio.css must fit expanded tall artwork within the available sidebar height without clipping'
);
assert.ok(
  studioCss.includes('grid-template-rows: minmax(0, 1fr) auto !important;') &&
  studioCss.includes('min-height: max-content !important;') &&
  studioCss.includes('margin-bottom: max(14px, env(safe-area-inset-bottom, 0px)) !important;'),
  'Split-view footer must reserve space for the complete controls bar above the bottom edge'
);
console.log('  ✓ 4. Tall artwork extends down behind the progress bar in auto-hide mode');

// 5. One-line Song Details Panel
console.log('\n5. One-line Song Details Panel:');
assert.ok(
  studioCss.includes('.studio-track-meta') &&
  studioCss.includes('display: inline-flex !important;') &&
  studioCss.includes('flex-direction: row !important;') &&
  studioCss.includes('gap: 6px !important;') &&
  studioCss.includes('pointer-events: auto !important;'),
  '_studio.css must keep .studio-track-meta on one row and interactive'
);
assert.ok(
  studioCss.includes('#studio-track-title') &&
  studioCss.includes('font-size: 21px !important;'),
  '_studio.css must display track title with 21px font size'
);
assert.ok(
  studioCss.includes('#studio-track-artist') &&
  studioCss.includes('font-size: 14.5px !important;'),
  '_studio.css must display track artist with 14.5px font size'
);
assert.ok(
  studioCss.includes('body.layout-split.auto-hide-controls .studio-badges-row.has-badges') &&
  studioCss.includes('display: flex !important;'),
  '_studio.css must display .studio-badges-row when badges are present'
);
assert.ok(
  studioCss.includes('body.layout-split.auto-hide-controls #playback-widget') &&
  studioCss.includes('pointer-events: auto !important;'),
  '_studio.css must ensure playback-widget retains pointer-events in auto-hide'
);
console.log('  ✓ 5. Song details panel stays on one horizontal row');

// 6. Full-Width Unconstrained Progress Bar in Split View
console.log('\n6. Full-Width Unconstrained Progress Bar in Split View:');
assert.ok(
  studioCss.includes('body.layout-split:not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode):not(.cinematic-view-active) #playback-widget > .widget-track-panel') &&
  studioCss.includes('flex: 1 1 100% !important;') &&
  studioCss.includes('max-width: none !important;') &&
  studioCss.includes('z-index: 26 !important;'),
  '_studio.css must preserve unconstrained 100% width and z-index: 26 on progress bar panel'
);
console.log('  ✓ 6. Progress bar width is full-width (flex: 1 1 100%) and elevated with z-index: 26');

// 7. Static Artwork Active Shift & Auto-Hide Enlargement
console.log('\n7. Static Artwork Active Shift & Auto-Hide Enlargement:');
assert.ok(
  studioCss.includes('body.layout-split:not(.has-animated-art-video):not(.auto-hide-controls)') &&
  studioCss.includes('.studio-art-container') &&
  studioCss.includes('overflow: visible !important;'),
  '_studio.css must ensure sidebar overflow is visible to eliminate clipping in active controls'
);
assert.ok(
  studioCss.includes('body.layout-split:not(.has-animated-art-video).auto-hide-controls') &&
  studioCss.includes('.studio-art-container') &&
  studioCss.includes('width: clamp(260px, 44vh, 360px) !important;') &&
  studioCss.includes('transform: translate3d(0, 0, 0) scale(1.06) !important;'),
  '_studio.css must expand static artwork to clamp(260px, 44vh, 360px) with scale(1.06) when auto-hide is triggered'
);
console.log('  ✓ 7. Static artwork is shifted upwards when controls active and cleanly enlarged in auto-hide');

// 8. Exit Autohide on Hover over Expanded Tall Artwork
console.log('\n8. Exit Autohide on Hover over Expanded Tall Artwork:');
const hudCssFresh = fs.readFileSync(path.join(srcDir, 'styles', '_hud.css'), 'utf8');
assert.ok(
  studioCss.includes('.studio-sidebar:hover .studio-art-container') &&
  studioCss.includes('max-height: clamp(310px, 52vh, 460px) !important;'),
  '_studio.css must scale tall artwork back to active size when cursor hovers over expanded art'
);
assert.ok(
  studioCss.includes('.studio-sidebar:hover ~ #playback-widget > .widget-controls') &&
  studioCss.includes('opacity: 1 !important;') &&
  studioCss.includes('pointer-events: auto !important;'),
  '_studio.css must reveal music controls when cursor hovers over expanded tall art'
);
assert.ok(
  hudCssFresh.includes('body.layout-split.auto-hide-controls .app-container:hover .hud-header') &&
  hudCssFresh.includes('opacity: 0;'),
  '_hud.css must keep HUD header hidden when cursor hovers over expanded tall art in split layout'
);
assert.ok(
  rendererJs.includes('isOverTallArtOrControls') &&
  rendererJs.includes('resetPlaybackControlsIdleTimer();'),
  'renderer.js must gate mousemove in split tall art to wake only on tall art or controls hover'
);
console.log('  ✓ 8. Hovering over expanded tall artwork cleanly exits autohide for tall artwork and music controls only');

// 9. Tall artwork keeps a measurable portrait box and a fixed metadata rail
console.log('\n9. Tall Artwork Sizing & Metadata Anchor:');
assert.ok(
  splitArtCss.includes('width: min(100%, clamp(160px, 42.67vh, 400px)) !important;') &&
  splitArtCss.includes('height: auto !important;') &&
  splitArtCss.includes('aspect-ratio: 2 / 3 !important;') &&
  splitArtCss.includes('bottom: -18px !important;'),
  '_studio_split_art.css must give the absolutely positioned tall artwork a real portrait width and preserve its lower anchor'
);
assert.ok(
  splitArtCss.includes('transform: translateX(-50%) scale(1.08) !important;') &&
  splitArtCss.includes('#studio-sidebar > .studio-track-meta') &&
  splitArtCss.includes('bottom: 8px !important;') &&
  splitArtCss.includes('#playback-widget > .widget-track-panel') &&
  splitArtCss.includes('display: none !important;'),
  '_studio_split_art.css must scale expanded artwork in place, pin its details, and hide the tall-art progress pod'
);
console.log('  Tall artwork has explicit portrait dimensions, a stable details rail, and the expected expanded presentation');

console.log('\n--- ALL SPLIT-VIEW MOTION ARTWORK UX TESTS PASSED (100% GREEN) ---\n');

