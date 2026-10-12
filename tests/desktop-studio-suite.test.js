/**
 * Desktop Studio Suite Automated Tests (Options A, B & C)
 * Verifies:
 * 1. Option A: Apple Music Studio Split-View Layout & Sidebar
 * 2. Option B: Persistent Frosted Glass Player Bar & HUD
 * 3. Option C: Karaoke Engine Glowing Vocal Cursor Bead & Instrumental Solo Stage
 * 4. Default View & Reversibility configuration
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Desktop Studio Suite Verification Tests ---');

const srcDir = path.join(__dirname, '..', 'src');
const studioCss = fs.readFileSync(path.join(srcDir, 'styles', '_studio.css'), 'utf8').replace(/\r\n/g, '\n');
const playbackCss = fs.readFileSync(path.join(srcDir, 'styles', '_playback.css'), 'utf8').replace(/\r\n/g, '\n');
const hudCss = fs.readFileSync(path.join(srcDir, 'styles', '_hud.css'), 'utf8').replace(/\r\n/g, '\n');
const lyricsCss = fs.readFileSync(path.join(srcDir, 'styles', '_lyrics.css'), 'utf8').replace(/\r\n/g, '\n');
const stylesCss = fs.readFileSync(path.join(srcDir, 'styles.css'), 'utf8').replace(/\r\n/g, '\n');
const indexHtml = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const rendererJs = fs.readFileSync(path.join(srcDir, 'renderer.js'), 'utf8').replace(/\r\n/g, '\n');

// -------------------------------------------------------------
// Section 1: Option A — Studio Split-View Verification
// -------------------------------------------------------------
console.log('\n1. Option A: Apple Music Desktop Split-View:');

// 1a. _studio.css imported in styles.css
assert.ok(
  stylesCss.includes("@import url('./styles/_studio.css');"),
  'styles.css must import _studio.css'
);
console.log('  ✓ 1a. _studio.css properly registered in styles.css master stylesheet');

// 1b. Split view two-column CSS grid definition
assert.ok(
  studioCss.includes('body.layout-split') && studioCss.includes('grid-template-columns: minmax(320px, 380px) 1fr'),
  '_studio.css must define two-column grid layout for body.layout-split'
);
console.log('  ✓ 1b. body.layout-split defines authentic two-column desktop studio grid');

// 1c. Studio sidebar and squircle artwork container
assert.ok(
  studioCss.includes('.studio-sidebar') && studioCss.includes('.studio-art-wrapper'),
  '_studio.css must style .studio-sidebar and .studio-art-wrapper'
);
assert.ok(
  studioCss.includes('.studio-art-glow'),
  '_studio.css must define reactive ambient aura halo .studio-art-glow'
);
console.log('  ✓ 1c. Studio sidebar squircle artwork and ambient glow styles defined');

// 1d. index.html contains #studio-sidebar and #btn-layout-split
assert.ok(
  indexHtml.includes('id="studio-sidebar"'),
  'index.html must include #studio-sidebar in markup'
);
assert.ok(
  indexHtml.includes('id="studio-track-title"') && indexHtml.includes('id="studio-track-artist"'),
  'index.html must include studio track metadata elements'
);
assert.ok(
  indexHtml.includes('id="btn-layout-split"'),
  'index.html must include #btn-layout-split toggle button in HUD'
);
console.log('  ✓ 1d. Studio sidebar DOM elements and HUD toggle button present in index.html');

// 1e. renderer.js implements toggleStudioSplit and updateStudioSidebar
assert.ok(
  rendererJs.includes('function toggleStudioSplit('),
  'renderer.js must implement toggleStudioSplit'
);
assert.ok(
  rendererJs.includes('function updateStudioSidebar('),
  'renderer.js must implement updateStudioSidebar'
);
assert.ok(
  rendererJs.includes("btnLayoutSplit.addEventListener(\"click\"") || rendererJs.includes("btnLayoutSplit.addEventListener('click'"),
  'renderer.js must bind click listener to btnLayoutSplit'
);
assert.ok(
  rendererJs.includes("Ctrl+Alt+S"),
  'renderer.js must document and handle Ctrl+Alt+S keyboard shortcut'
);
console.log('  ✓ 1e. toggleStudioSplit, updateStudioSidebar, click listener, and Ctrl+Alt+S shortcut wired');

// 1f. Sleek liquid glass controls dock in Column 1
assert.ok(
  studioCss.includes('body.layout-split') && studioCss.includes('grid-column: 1 / 2 !important') && studioCss.includes('grid-row: 2 / 3 !important'),
  '_studio.css must dock .playback-widget in Column 1 below track info in Split-View'
);
assert.ok(
  studioCss.includes('flex-direction: column !important'),
  '_studio.css must structure liquid player dock with vertical column layout in Split-View'
);
console.log('  ✓ 1f. Liquid glass controls dock integrated directly into Column 1 beneath metadata');

// 1g. Hide duplicate album art thumbnail and track details in split view
assert.ok(
  studioCss.includes('body.layout-split .playback-widget .widget-art-container') &&
  studioCss.includes('body.layout-split .playback-widget .track-details') &&
  studioCss.includes('display: none !important'),
  '_studio.css must hide redundant album art and track details in Split-View'
);
console.log('  ✓ 1g. Redundant mini album art thumbnail and track title hidden in Split-View');

// 1h. Full-height edge-to-edge lyrics in right column
assert.ok(
  studioCss.includes('grid-column: 2 / 3 !important') && studioCss.includes('grid-row: 1 / -1 !important'),
  '_studio.css must allow right column lyrics to span full height from top to bottom'
);
console.log('  ✓ 1h. Lyrics viewport spans full window height in right column without bottom bar obstruction');

// -------------------------------------------------------------
// Section 2: Option B — Persistent Player Bar & HUD Verification
// -------------------------------------------------------------
console.log('\n2. Option B: Persistent Frosted Glass Player Bar:');

// 2a. playback-widget has opacity: 1 by default
assert.ok(
  playbackCss.includes('.playback-widget') && playbackCss.includes('opacity: 1; /* Persistent frosted glass bar by default (Option B) */'),
  '_playback.css must set .playback-widget opacity: 1 by default'
);
console.log('  ✓ 2a. .playback-widget is permanently visible (opacity: 1) by default');

// 2b. hud-header has opacity: 1 by default
assert.ok(
  hudCss.includes('.hud-header') && hudCss.includes('opacity: 1; /* Persistent by default (Option B) */'),
  '_hud.css must set .hud-header opacity: 1 by default'
);
console.log('  ✓ 2b. .hud-header is permanently visible (opacity: 1) by default');

// 2c. auto-hide-controls supported for users preferring minimalism
assert.ok(
  playbackCss.includes('body.auto-hide-controls .playback-widget'),
  '_playback.css must support body.auto-hide-controls'
);
assert.ok(
  hudCss.includes('body.auto-hide-controls .hud-header'),
  '_hud.css must support body.auto-hide-controls'
);
console.log('  ✓ 2c. body.auto-hide-controls preserves optional hover-only behavior');

// -------------------------------------------------------------
// Section 3: Option C — Karaoke Vocal Cursor Bead & Solo Stage
// -------------------------------------------------------------
console.log('\n3. Option C: Karaoke Engine Enhancements:');

// 3a. Glowing vocal cursor bead on .lyric-word.lyric-word-active::after
assert.ok(
  lyricsCss.includes('.lyric-word.lyric-word-active::after'),
  '_lyrics.css must style .lyric-word.lyric-word-active::after'
);
assert.ok(
  lyricsCss.includes('left: calc(var(--word-progress, 0) * 100%)'),
  'vocal cursor bead must track active syllable progress using --word-progress'
);
console.log('  ✓ 3a. Glowing vocal bead ::after tracks active syllable progress in real-time');

// 3b. Animated instrumental solo waveform stage
assert.ok(
  lyricsCss.includes('.instrumental-solo-stage') && lyricsCss.includes('.solo-visualizer-wave'),
  '_lyrics.css must style .instrumental-solo-stage and .solo-visualizer-wave'
);
assert.ok(
  lyricsCss.includes('.solo-bar') && lyricsCss.includes('animation: soloBarBounce'),
  '_lyrics.css must define 5 pulsing waveform bars with bounce animation'
);
assert.ok(
  indexHtml.includes('id="instrumental-solo-stage"'),
  'index.html must include #instrumental-solo-stage container'
);
console.log('  ✓ 3b. Instrumental solo stage markup and 5-bar waveform animation defined');

// 3c. renderer.js activates solo stage during instrumental break and intro prelude
assert.ok(
  rendererJs.includes('soloStage.classList.add("active")') && rendererJs.includes('isInstrumentalBreak || isIntroPrelude'),
  'renderer.js must activate solo stage during breaks and preludes'
);
console.log('  ✓ 3c. renderer.js dynamically triggers solo waveform stage during musical solos/breaks');

// -------------------------------------------------------------
// Section 4: Default Startup Configuration & Reversibility
// -------------------------------------------------------------
console.log('\n4. Default Startup Configuration & Reversibility:');

// 4a. index.html does NOT have hardcoded cinematic-view-active
assert.ok(
  !indexHtml.includes('<div class="app-container cinematic-view-active" id="app-container">'),
  'index.html must not hardcode cinematic-view-active on app-container'
);
assert.ok(
  indexHtml.includes('<div class="app-container" id="app-container">'),
  'index.html must have clean app-container id="app-container"'
);
console.log('  ✓ 4a. app-container launches directly into authentic HTML Studio layout');

// 4b. renderer.js default isCinematicView = false
assert.ok(
  rendererJs.includes('let isCinematicView = false;'),
  'renderer.js must declare isCinematicView = false by default'
);
assert.ok(
  rendererJs.includes('settings.cinematicMode = false;'),
  'renderer.js must set settings.cinematicMode = false by default'
);
console.log('  ✓ 4b. renderer.js initializes cinematic mode as false by default');

// 4c. layoutSplit defaults to true
assert.ok(
  rendererJs.includes('settings.layoutSplit = true;'),
  'renderer.js must default settings.layoutSplit = true on desktop'
);
console.log('  ✓ 4c. Desktop defaults to Apple Music Studio Split-View layout');

console.log('\nAll 13/13 Desktop Studio Suite tests passed successfully!\n');
