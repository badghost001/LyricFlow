/**
 * Test Suite: Cinematic Mode Visibility & Dynamic Album Art Background
 * Verifies that lyrics remain visible continuously in cinematic mode (no blackouts),
 * upcoming words are legible at resting opacity, album art ambient projection renders,
 * and background never collapses to a flat black box.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const kineticRendererPath = path.join(__dirname, '../src/modules/kinetic/KineticCanvasRenderer.js');
const typographyEnginePath = path.join(__dirname, '../src/modules/kinetic/KineticTypographyEngine.js');
const rendererJsPath = path.join(__dirname, '../src/renderer.js');
const kineticCssPath = path.join(__dirname, '../src/styles/_kinetic.css');

console.log('\n--- Running Cinematic Visibility & Album Art Background Test Suite ---\n');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function createMockCanvas(width = 960, height = 600) {
  const operations = [];
  const stateStack = [];
  const state = {
    globalAlpha: 1.0,
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    filter: 'none'
  };

  const ctx = {
    canvas: { width, height },
    get globalAlpha() { return state.globalAlpha; },
    set globalAlpha(v) { state.globalAlpha = v; },
    get fillStyle() { return state.fillStyle; },
    set fillStyle(v) { state.fillStyle = v; },
    get strokeStyle() { return state.strokeStyle; },
    set strokeStyle(v) { state.strokeStyle = v; },
    get font() { return state.font; },
    set font(v) { state.font = v; },
    get textAlign() { return state.textAlign; },
    set textAlign(v) { state.textAlign = v; },
    get textBaseline() { return state.textBaseline; },
    set textBaseline(v) { state.textBaseline = v; },
    get filter() { return state.filter; },
    set filter(v) { state.filter = v; },

    save: () => {
      stateStack.push({ ...state });
      operations.push({ op: 'save' });
    },
    restore: () => {
      if (stateStack.length) Object.assign(state, stateStack.pop());
      operations.push({ op: 'restore' });
    },
    beginPath: () => operations.push({ op: 'beginPath' }),
    closePath: () => operations.push({ op: 'closePath' }),
    moveTo: (x, y) => operations.push({ op: 'moveTo', x, y }),
    lineTo: (x, y) => operations.push({ op: 'lineTo', x, y }),
    arc: (x, y, r, sa, ea) => operations.push({ op: 'arc', x, y, r }),
    roundRect: (x, y, w, h, r) => operations.push({ op: 'roundRect', x, y, w, h, r }),
    fill: () => operations.push({ op: 'fill', fillStyle: state.fillStyle, alpha: state.globalAlpha }),
    stroke: () => operations.push({ op: 'stroke', strokeStyle: state.strokeStyle, alpha: state.globalAlpha }),
    fillRect: (x, y, w, h) => operations.push({ op: 'fillRect', x, y, w, h, fillStyle: state.fillStyle, alpha: state.globalAlpha }),
    fillText: (text, x, y) => operations.push({ op: 'fillText', text, x, y, font: state.font, fillStyle: state.fillStyle, alpha: state.globalAlpha }),
    measureText: (txt) => ({ width: (txt || '').length * 12 }),
    translate: (x, y) => operations.push({ op: 'translate', x, y }),
    scale: (sx, sy) => operations.push({ op: 'scale', sx, sy }),
    createRadialGradient: (x0, y0, r0, x1, y1, r1) => ({
      addColorStop: (stop, color) => operations.push({ op: 'addColorStop', stop, color })
    }),
    drawImage: (img, dx, dy, dw, dh) => operations.push({ op: 'drawImage', dx, dy, dw, dh })
  };

  return {
    width,
    height,
    getContext: () => ctx,
    _operations: operations
  };
}

// 1. Album Art Image Fetching and Background Rendering
test('1a. setAlbumArt does not use crossOrigin anonymous so Spotify CDN loads without CORS failure', () => {
  const code = fs.readFileSync(kineticRendererPath, 'utf8');
  assert.ok(
    !code.includes("img.crossOrigin = 'anonymous'") && !code.includes('img.crossOrigin = "anonymous"'),
    'setAlbumArt must not set crossOrigin = anonymous to prevent CORS blocking on external CDNs'
  );
  assert.ok(
    code.includes("document.getElementById('widget-album-art')"),
    'setAlbumArt should check existing loaded DOM elements directly'
  );
});

test('1b. renderAlbumArtBackground generates dynamic palette radial gradient even if album art image is still loading', () => {
  const KineticCanvasRenderer = require(kineticRendererPath);
  const canvas = createMockCanvas(960, 600);
  const renderer = new KineticCanvasRenderer(canvas, { isCinematic: true });

  const ctx = canvas.getContext();
  canvas._operations.length = 0;
  renderer.renderAlbumArtBackground(ctx, 1000, {
    canvasColor: '#050508',
    cardRgb: { r: 55, g: 25, b: 40 },
    textRgb: { r: 230, g: 215, b: 220 }
  });

  const stops = canvas._operations.filter(op => op.op === 'addColorStop');
  assert.ok(stops.length >= 3, 'Must create multi-stop ambient gradient');
  const fills = canvas._operations.filter(op => op.op === 'fillRect');
  assert.ok(fills.length >= 1, 'Must fill stage with vibrant ambient gradient backdrop');
});

test('1c. _kinetic.css cinematic-main-stage uses background: transparent so canvas album art is not hidden behind pure black', () => {
  const css = fs.readFileSync(kineticCssPath, 'utf8');
  assert.ok(
    css.includes('.cinematic-main-stage') && css.includes('background: transparent !important;'),
    '_kinetic.css must set background: transparent !important for cinematic-main-stage'
  );
});

// 2. Lyrics Visibility and Continuous Legibility in Cinematic Mode
test('2a. In Cinematic Mode, lyrics remain visible during gaps and line transitions (no drop to 0)', () => {
  const KineticCanvasRenderer = require(kineticRendererPath);
  const canvas = createMockCanvas(960, 600);
  const lyrics = [
    { text: 'First lyric sentence', timeMs: 1000, endMs: 2500 },
    { text: 'Second lyric sentence', timeMs: 4500, endMs: 6000 }
  ];

  const renderer = new KineticCanvasRenderer(canvas, { isCinematic: true });
  renderer.configure({
    isCinematic: true,
    lyrics,
    artist: 'Artist',
    title: 'Song',
    startTimeMs: 0,
    endTimeMs: 10000
  });

  // Test during line 1 (1800ms)
  canvas._operations.length = 0;
  renderer.seek(1800);
  let textOps = canvas._operations.filter(op => op.op === 'fillText' && op.text.includes('first'));
  assert.ok(textOps.length > 0, 'Active line 1 must be rendered at 1800ms');

  // Test in gap between line 1 and line 2 (3500ms)
  canvas._operations.length = 0;
  renderer.seek(3500);
  textOps = canvas._operations.filter(op => op.op === 'fillText' && !op.text.includes('★') && !op.text.includes('◆'));
  assert.ok(textOps.length > 0, 'Lyrics must remain visible with minimum opacity during inter-line gap at 3500ms');
  assert.ok(textOps[0].alpha >= 0.70, `Alpha ${textOps[0].alpha} must remain >= 0.70 in gap`);
});

test('2b. In Cinematic Mode with timed words, upcoming words render with resting opacity (never skipped)', () => {
  const TypographyEngine = require(typographyEnginePath);
  const canvas = createMockCanvas(960, 600);
  const ctx = canvas.getContext();

  const words = [
    { text: 'I', timeMs: 2000, endMs: 2200 },
    { text: 'state', timeMs: 2300, endMs: 2600 },
    { text: 'simple', timeMs: 2700, endMs: 3100 },
    { text: 'facts', timeMs: 3200, endMs: 3700 }
  ];

  canvas._operations.length = 0;
  // Test at 2100ms: 'I' is actively singing; 'state', 'simple', 'facts' are upcoming
  TypographyEngine.renderCinematicHorizontalFluid(ctx, {
    words,
    currentTimeMs: 2100,
    bounds: { x: 0, y: 0, width: 960, height: 600 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } }
  });

  const filledWords = canvas._operations.filter(op => op.op === 'fillText').map(op => op.text);
  assert.ok(filledWords.includes('I'), 'Active word I must be rendered');
  assert.ok(filledWords.includes('state'), 'Upcoming word state must be rendered in resting state');
  assert.ok(filledWords.includes('simple'), 'Upcoming word simple must be rendered in resting state');
  assert.ok(filledWords.includes('facts'), 'Upcoming word facts must be rendered in resting state');
});

// 3. toggleCinematicView playback loop execution
test('3. renderer.js toggleCinematicView starts cinematicMainRendererInstance.play() and pauses on exit', () => {
  const renderer = fs.readFileSync(rendererJsPath, 'utf8');
  assert.ok(
    renderer.includes('cinematicMainRendererInstance.play();'),
    'toggleCinematicView must start cinematicMainRendererInstance.play() when entering cinematic view'
  );
  assert.ok(
    renderer.includes('cinematicMainRendererInstance.pause();'),
    'toggleCinematicView must pause cinematicMainRendererInstance when exiting cinematic view'
  );
});

console.log(`\nAll ${passed} Cinematic Visibility & Album Art Background tests passed successfully!`);
