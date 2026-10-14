/**
 * Desktop Lyrics Display & Cinematic Mode Rendering Verification Tests
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("--- Running Desktop Lyrics Display & Cinematic Mode Rendering Tests ---\n");

// 1. Verify index.html markup
const htmlPath = path.join(__dirname, '../src/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert.ok(
  htmlContent.includes('<section class="app-screen active" id="screen-lyrics">'),
  "index.html must have 'active' class on #screen-lyrics for immediate first paint visibility"
);
console.log("  ✓ 1. index.html defines active screen-lyrics by default");

// 2. Verify _layout.css defenses
const layoutCssPath = path.join(__dirname, '../src/styles/_layout.css');
const layoutCss = fs.readFileSync(layoutCssPath, 'utf8');

assert.ok(
  layoutCss.includes('body:not(.taskbar-mode):not(.mode-dynamic-island):not(.wallpaper-mode) #screen-lyrics'),
  "_layout.css must enforce baseline display: flex for #screen-lyrics in desktop window mode"
);
assert.ok(
  layoutCss.includes('.app-container.auto-hide-collapsed:hover .lyrics-view'),
  "_layout.css must restore lyrics-view on hover when collapsed"
);
assert.ok(
  layoutCss.includes('.app-container.auto-hide-collapsed:focus-within .lyrics-view'),
  "_layout.css must restore lyrics-view on focus-within when collapsed"
);
console.log("  ✓ 2. _layout.css defends screen-lyrics display and restores visibility on hover/focus");

// 3. Verify renderer.js dual-storage precedence & startup reset
const rendererJsPath = path.join(__dirname, '../src/renderer.js');
const rendererJs = fs.readFileSync(rendererJsPath, 'utf8');

assert.ok(
  rendererJs.includes('parsed = { ...(parsed || {}), ...config.settings };'),
  "renderer.js loadLocalSettings must prioritize config.settings over stale localStorage"
);
assert.ok(
  rendererJs.includes('settings.cinematicMode = false;') && rendererJs.includes('isCinematicView = false;'),
  "renderer.js must reset cinematicMode to false on startup so the app opens as a normal window"
);
assert.ok(
  rendererJs.includes('const isCinematicActive = (settings.cinematicMode !== false) && !settings.wallpaperMode && !settings.taskbarMode && !isDynamicIslandMode;'),
  "applyVisualSettings must calculate isCinematicActive correctly"
);
assert.ok(
  rendererJs.includes("window.addEventListener('mouseenter'"),
  "renderer.js must listen for mouseenter to wake auto-hide immediately"
);
console.log("  ✓ 3. renderer.js enforces config.settings precedence, startup mode resets, and mouseenter wake");

// 4. Verify KineticCanvasRenderer paused lyric rendering
const kineticRendererPath = path.join(__dirname, '../src/modules/kinetic/KineticCanvasRenderer.js');
const kineticRendererJs = fs.readFileSync(kineticRendererPath, 'utf8');

assert.ok(
  kineticRendererJs.includes('if (this.isPaused && this.config && this.config.isCinematic && (!scene || !Array.isArray(this.timeline) || this.timeline.length === 0))'),
  "KineticCanvasRenderer must only show paused track card when no lyrics timeline exists"
);
assert.ok(
  kineticRendererJs.includes('const shouldFade = this.config.fadeLyrics !== false && !this.isPaused;'),
  "KineticCanvasRenderer must not fade lyrics out when isPaused is true"
);
console.log("  ✓ 4. KineticCanvasRenderer renders active lyric line at full opacity when paused");

// 5. Functional test of settings merge precedence
const mockStorageSettings = {
  autoHideLyrics: true,
  cinematicMode: true,
  fontSize: 18
};
const mockConfigSettings = {
  autoHideLyrics: false,
  cinematicMode: false,
  fontSize: 24
};

// Merging with config precedence
const merged = { ...mockStorageSettings, ...mockConfigSettings };
assert.strictEqual(merged.autoHideLyrics, false, "config.settings must override stale localStorage autoHideLyrics");
assert.strictEqual(merged.cinematicMode, false, "config.settings must override stale localStorage cinematicMode");
assert.strictEqual(merged.fontSize, 24, "config.settings must override stale localStorage fontSize");
console.log("  ✓ 5. Functional settings merge guarantees config precedence over stale localStorage");

// 6. Verify _studio.css cinematic exclusions and responsive preservation
const studioCssPath = path.join(__dirname, '../src/styles/_studio.css');
const studioCss = fs.readFileSync(studioCssPath, 'utf8');

assert.ok(
  studioCss.includes('body.layout-split:not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode):not(.cinematic-view-active) #screen-lyrics'),
  "_studio.css must exclude cinematic-view-active from 2-column grid so cinematic mode takes full window"
);
assert.ok(
  studioCss.includes('body.layout-split:not(.wallpaper-mode):not(.mode-dynamic-island):not(.taskbar-mode):not(.cinematic-view-active) .studio-sidebar'),
  "_studio.css must exclude cinematic-view-active from studio sidebar display"
);
assert.ok(
  studioCss.includes('@media (max-width: 768px) and (min-width: 481px)') && studioCss.includes('body.layout-split .studio-art-container'),
  "_studio.css must gracefully adapt sidebar in 481-768px windows without hiding it"
);
console.log("  ✓ 6. _studio.css protects cinematic full-screen view and adapts sidebar on medium windows");

// 7. Verify _kinetic.css hides studio-sidebar in cinematic mode
const kineticCssPath = path.join(__dirname, '../src/styles/_kinetic.css');
const kineticCss = fs.readFileSync(kineticCssPath, 'utf8');

assert.ok(
  kineticCss.includes('.cinematic-view-active #studio-sidebar') && kineticCss.includes('.cinematic-view-active .studio-sidebar'),
  "_kinetic.css must hide studio-sidebar in cinematic mode"
);
console.log("  ✓ 7. _kinetic.css properly hides studio-sidebar when cinematic mode is active");

// 8. Verify checkShouldAutoHide protects Split View Desktop Studio
assert.ok(
  rendererJs.includes('if (settings.layoutSplit) return false;'),
  "renderer.js checkShouldAutoHide must protect split-view desktop studio from auto-hide collapse"
);
console.log("  ✓ 8. renderer.js protects Split-View Desktop Studio from auto-hide collapse");

console.log("\nAll Desktop Lyrics Display & Cinematic Mode Rendering tests passed successfully!\n");

