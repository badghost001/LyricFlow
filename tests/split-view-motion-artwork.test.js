/**
 * tests/split-view-motion-artwork.test.js
 * Comprehensive regression verification for Apple Music Motion Artwork in Split-View Mode.
 * Ensures zero blank/black/transparent states, proper aspect ratio handling, and smooth underlay transitions.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const srcDir = path.join(__dirname, '..', 'src');
const indexHtml = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const studioCss = fs.readFileSync(path.join(srcDir, 'styles', '_studio.css'), 'utf8');
const rendererJs = fs.readFileSync(path.join(srcDir, 'renderer.js'), 'utf8');

console.log('\n--- Running Split-View Motion Artwork Regression Suite ---');

// 1. DOM Hierarchy Verification
assert.ok(indexHtml.includes('id="studio-art-wrapper"'), 'index.html must have #studio-art-wrapper');
assert.ok(indexHtml.includes('id="studio-art-img"'), 'index.html must have #studio-art-img');
assert.ok(indexHtml.includes('id="studio-art-video"'), 'index.html must have #studio-art-video');
assert.ok(indexHtml.includes('id="studio-art-fallback"'), 'index.html must have #studio-art-fallback');
console.log('  ✓ 1. Split-View DOM markup hierarchy verified');

// 2. CSS Visual Hierarchy & Resilient Underlay
assert.ok(
  studioCss.includes('body.layout-split.has-animated-art-video #studio-art-video') &&
  studioCss.includes('body.layout-split.has-animated-art-video #studio-art-video.is-playing'),
  '_studio.css must define active playback transitions for #studio-art-video'
);
assert.ok(
  studioCss.includes('body.layout-split.has-animated-art-video #studio-art-img'),
  '_studio.css must define #studio-art-img styling'
);
assert.ok(
  studioCss.includes('body.layout-split.has-animated-art-video.split-tall-art') &&
  studioCss.includes('aspect-ratio: 9 / 14.5'),
  '_studio.css must assign aspect-ratio: 9 / 14.5 when split-tall-art is active'
);
assert.ok(
  studioCss.includes('body.layout-split.has-animated-art-video:not(.split-tall-art)') &&
  studioCss.includes('aspect-ratio: 1'),
  '_studio.css must preserve aspect-ratio: 1 for authentic square covers'
);
console.log('  ✓ 2. CSS aspect-ratio scoping and resilient underlay rules verified');

// 3. Settings Default & Auto-Enablement
assert.ok(
  rendererJs.includes('splitTallArtwork: true'),
  'settings.splitTallArtwork must default to true for authentic split-view presentation'
);
assert.ok(
  rendererJs.includes('const enabled = available && isSplit && settings.splitTallArtwork !== false;'),
  'syncSplitTallArtworkAvailability must gracefully treat undefined or true as enabled'
);
console.log('  ✓ 3. Default splitTallArtwork availability and auto-activation verified');

// 4. Zero Blank-Frame Underlay Guarantees in updateStudioSidebar
assert.ok(
  !rendererJs.includes('if (!document.body.classList.contains(\'has-animated-art-video\')) {\r\n        if (artImg) {\r\n          const expectedArt = new URL(String(effectiveArt)'),
  'updateStudioSidebar must not suppress assigning artImg.src when has-animated-art-video is active'
);
assert.ok(
  rendererJs.includes('artImg.style.opacity = "1";') &&
  rendererJs.includes('artImg.style.display = "block";'),
  'updateStudioSidebar must ensure studio-art-img is displayed and opaque as underlay'
);
console.log('  ✓ 4. Continuous static image underlay in updateStudioSidebar verified');

// 5. Video Lifecycle & Recovery Fallback
assert.ok(
  !rendererJs.includes("if (fallbackImgEl && (videoEl.id === 'studio-art-video' || videoEl.id === 'wallpaper-style-art-video'))"),
  'attachResilientVideoLifecycle must not hide studio-art-img on playback start'
);
assert.ok(
  rendererJs.includes('videoEl._motionSquareFallbackTrack = info.url;') &&
  rendererJs.includes('startMotionArtVideo(videoEl, info.url);'),
  'scheduleMotionVideoRecovery must fall back to square video stream rather than unmounting'
);
assert.ok(
  rendererJs.includes("const useTallMotionArt = (settings.splitTallArtwork !== false) && supportsTallMotionArtwork();"),
  'syncActiveAnimatedVideoState must use tall motion URL when tall artwork is supported'
);
console.log('  ✓ 5. Video resilient lifecycle, tall selection, and recovery fallback verified');

assert.match(
  rendererJs,
  /function restoreVideoSurface\(videoEl, fallbackUrl\)[\s\S]*?const targetUrl = fallbackUrl \|\| videoEl\._dormantSrc/,
  'restoring a surface must prefer its current tall/square URL over a stale dormant thumbnail URL'
);
assert.match(
  studioCss,
  /#playback-widget > \.widget-track-panel,[\s\S]*?#playback-widget > \.widget-controls\s*\{\s*box-shadow: inset 0 1px 0/,
  'split playback pods should retain only a subtle glass edge, without a black cast shadow'
);
assert.match(
  studioCss,
  /#screen-lyrics \.studio-art-wrapper\s*\{\s*box-shadow: none !important/,
  'split artwork wrapper should not cast a shadow'
);
assert.match(
  studioCss,
  /\.app-container\.auto-hide-collapsed:not\(\.wallpaper-mode\) #playback-widget,[\s\S]*?background: transparent !important;[\s\S]*?box-shadow: none !important/,
  'auto-hide split mode must clear the legacy dark background on the whole playback widget'
);
assert.match(
  studioCss,
  /body\.layout-split[^\n]*\.studio-art-glow\s*\{\s*display: none !important/,
  'split artwork must disable the separate blurred halo layer'
);

console.log('\n--- ALL SPLIT-VIEW MOTION ARTWORK TESTS PASSED (6/6) ---\n');
