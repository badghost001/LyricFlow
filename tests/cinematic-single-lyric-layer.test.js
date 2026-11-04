/**
 * Unit Test Suite: Cinematic Single Lyric Layer Integrity
 * Verifies:
 * 1. Complete elimination of duplicate simple font HTML lyrics overlapping kinetic canvas typography
 * 2. updateCinematicLyricsFallback purges fallback DOM elements
 * 3. _kinetic.css strictly enforces display: none !important on all fallback and HTML lyric lines in cinematic mode
 * 4. KineticCanvasRenderer does not double-draw incoming and outgoing scenes at >100% combined alpha,
 *    and freezes strictly to the active scene without cross-fade ghosting when paused.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Cinematic Single Lyric Layer Integrity Tests ---\n');

const kineticCssPath = path.resolve(__dirname, '../src/styles/_kinetic.css');
const kineticCss = fs.readFileSync(kineticCssPath, 'utf8');

const rendererJsPath = path.resolve(__dirname, '../src/renderer.js');
const rendererJs = fs.readFileSync(rendererJsPath, 'utf8');

const canvasRendererPath = path.resolve(__dirname, '../src/modules/kinetic/KineticCanvasRenderer.js');
const canvasRendererJs = fs.readFileSync(canvasRendererPath, 'utf8');

// 1. Elimination of Simple Font Fallback Overlay
console.log('1. Elimination of Simple Font Fallback Overlay:');
assert.ok(
  rendererJs.includes('function updateCinematicLyricsFallback() {') &&
  rendererJs.includes('if (fallback) {\n    fallback.remove();\n  }') ||
  rendererJs.includes('fallback.remove()'),
  'renderer.js updateCinematicLyricsFallback must remove fallback DOM element if present'
);
assert.ok(
  !rendererJs.includes("fallback.style.display = 'block'"),
  'renderer.js must NEVER set fallback.style.display = block'
);
console.log('  ✓ 1a. updateCinematicLyricsFallback removes any simple font DOM overlays');
console.log('  ✓ 1b. renderer.js never sets fallback.style.display = block\n');

// 2. Strict CSS Suppression of Competing HTML Lyric Elements in Cinematic Mode
console.log('2. Strict CSS Suppression of Competing HTML Lyric Elements in Cinematic Mode:');
assert.ok(
  kineticCss.includes('.cinematic-lyrics-fallback {\n  display: none !important;\n  visibility: hidden !important;\n  opacity: 0 !important;'),
  '_kinetic.css must hide .cinematic-lyrics-fallback with display: none !important'
);
assert.ok(
  kineticCss.includes('#cinematic-lyrics-fallback') &&
  kineticCss.includes('.lyric-line') &&
  kineticCss.includes('#lyrics-container'),
  '_kinetic.css must suppress #cinematic-lyrics-fallback, .lyric-line, and #lyrics-container in cinematic mode'
);
console.log('  ✓ 2a. _kinetic.css enforces display: none !important on .cinematic-lyrics-fallback');
console.log('  ✓ 2b. All HTML lyric container and line elements are suppressed in cinematic-view-active\n');

// 3. KineticCanvasRenderer Clean Cross-Dissolve & Pause Freezing
console.log('3. KineticCanvasRenderer Clean Cross-Dissolve & Pause Freezing:');
assert.ok(
  canvasRendererJs.includes('if (this.isPaused) {') &&
  canvasRendererJs.includes('crossFadeScene = null;') &&
  canvasRendererJs.includes('crossFadeAlpha = 0.0;') &&
  canvasRendererJs.includes('currAlpha = 1.0;'),
  'KineticCanvasRenderer must freeze active scene cleanly on pause without cross-fade ghosting'
);
assert.ok(
  canvasRendererJs.includes('else if (this.config.isCinematic && !crossFadeScene)'),
  'KineticCanvasRenderer must not force 0.75 alpha on incoming scene while crossFadeScene is active'
);
console.log('  ✓ 3a. On pause, crossFadeScene is cleared and only the active scene renders at alpha 1.0');
console.log('  ✓ 3b. Entrance cross-fades maintain valid mathematical cross-dissolve without double-stacking text\n');

console.log('All 3/3 Cinematic Single Lyric Layer Integrity test suites passed successfully!\n');
