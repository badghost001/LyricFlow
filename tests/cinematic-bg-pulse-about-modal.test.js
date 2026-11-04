/**
 * Test Suite: Cinematic Mode Album Art Ambient Background, Vector Illustrations,
 * Lyrics Pulsing, Hinglish/Punjabi Default, and About Modals Opening
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rendererJsPath = path.join(__dirname, '../src/renderer.js');
const indexHtmlPath = path.join(__dirname, '../src/index.html');
const aboutCssPath = path.join(__dirname, '../src/styles/_about_modals.css');
const kineticRendererPath = path.join(__dirname, '../src/modules/kinetic/KineticCanvasRenderer.js');
const cinematicMotifPath = path.join(__dirname, '../src/modules/kinetic/CinematicMotif.js');
const cinematicConceptPath = path.join(__dirname, '../src/modules/kinetic/CinematicConcept.js');

console.log('\n--- Running Cinematic BG, Pulsing, Vector Motifs & About Modals Test Suite ---\n');

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

// Mock Canvas 2D Context for verifying vector motifs and canvas background
function createMockCanvas(width = 800, height = 600) {
  const operations = [];
  const ctx = {
    canvas: { width, height },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1.0,
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowBlur: 0,
    shadowColor: '',
    filter: 'none',
    save: () => operations.push({ op: 'save' }),
    restore: () => operations.push({ op: 'restore' }),
    beginPath: () => operations.push({ op: 'beginPath' }),
    arc: (x, y, r, sa, ea) => operations.push({ op: 'arc', x, y, r, sa, ea }),
    ellipse: (x, y, rx, ry, rot, sa, ea) => operations.push({ op: 'ellipse', x, y, rx, ry, rot, sa, ea }),
    moveTo: (x, y) => operations.push({ op: 'moveTo', x, y }),
    lineTo: (x, y) => operations.push({ op: 'lineTo', x, y }),
    bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => operations.push({ op: 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y }),
    closePath: () => operations.push({ op: 'closePath' }),
    fill: () => operations.push({ op: 'fill', fillStyle: ctx.fillStyle }),
    stroke: () => operations.push({ op: 'stroke', strokeStyle: ctx.strokeStyle }),
    translate: (x, y) => operations.push({ op: 'translate', x, y }),
    scale: (sx, sy) => operations.push({ op: 'scale', sx, sy }),
    fillRect: (x, y, w, h) => operations.push({ op: 'fillRect', x, y, w, h }),
    fillText: (txt, x, y) => operations.push({ op: 'fillText', txt, x, y }),
    measureText: (txt) => ({ width: (txt || '').length * 12 }),
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

// 1. About Modals Initialized on Boot and Hooked via Delegation
test('1a. initAboutModals is called during initDOMElements() startup sequence', () => {
  const renderer = fs.readFileSync(rendererJsPath, 'utf8').replace(/\r\n/g, '\n');
  assert.ok(
    renderer.includes('function initDOMElements() {\n  initAboutModals();') ||
    renderer.includes('initAboutModals();\n  screenLogin'),
    'initAboutModals() must be called directly within initDOMElements() on app launch'
  );
});

test('1b. initAboutModals implements global document delegated click listeners for track and artist targets', () => {
  const renderer = fs.readFileSync(rendererJsPath, 'utf8');
  assert.ok(
    renderer.includes("document.addEventListener('click'") &&
    renderer.includes('openAboutSongPopup()') &&
    renderer.includes('openAboutArtistPage()'),
    'initAboutModals must register delegated click listeners for track and artist elements'
  );
  assert.ok(
    renderer.includes('.track-name-wrapper') && renderer.includes('.artist-name-wrapper'),
    'Delegated listener must handle wrapper containers as well as direct text nodes'
  );
});

test('1c. openAboutSongPopup and openAboutArtistPage enforce display: flex and is-open', () => {
  const renderer = fs.readFileSync(rendererJsPath, 'utf8');
  assert.ok(
    renderer.includes("modal.style.display = 'flex';") &&
    renderer.includes("modal.classList.add('is-open');"),
    'Modals must set display: flex and is-open when invoked'
  );
});

test('1d. _about_modals.css guarantees pointer affordances and disables window dragging on track/artist elements', () => {
  const css = fs.readFileSync(aboutCssPath, 'utf8');
  assert.ok(css.includes('-webkit-app-region: no-drag !important;'), 'Must suppress app-region drag to prevent click theft');
  assert.ok(css.includes('pointer-events: auto !important;'), 'Must force pointer-events: auto');
  assert.ok(css.includes('cursor: pointer !important;'), 'Must display pointer cursor');
});

// 2. Hinglish & Punjabi to English Option Removed and Permanently Defaulted to True
test('2a. index.html does not contain the check-hinglish-translate settings toggle row', () => {
  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  assert.strictEqual(
    html.includes('id="check-hinglish-translate"'),
    false,
    'Hinglish & Punjabi checkbox must be removed from settings UI'
  );
});

test('2b. renderer.js locks settings.hinglishTranslate to true by default', () => {
  const renderer = fs.readFileSync(rendererJsPath, 'utf8');
  assert.ok(
    renderer.includes('hinglishTranslate: true,'),
    'settings.hinglishTranslate must default to true'
  );
  assert.ok(
    renderer.includes('settings.hinglishTranslate = true;'),
    'settings.hinglishTranslate must be locked to true'
  );
});

// 3. Cinematic Mode Album Art Ambient Background
test('3a. KineticCanvasRenderer implements setAlbumArt and renderAlbumArtBackground', () => {
  const KineticCanvasRenderer = require(kineticRendererPath);
  const canvas = createMockCanvas(800, 600);
  const renderer = new KineticCanvasRenderer(canvas, { isCinematic: true });

  assert.strictEqual(typeof renderer.setAlbumArt, 'function', 'setAlbumArt must be a method on KineticCanvasRenderer');
  assert.strictEqual(typeof renderer.renderAlbumArtBackground, 'function', 'renderAlbumArtBackground must be defined');

  // Test setAlbumArt with mock image
  const mockImg = { tagName: 'IMG', naturalWidth: 600, naturalHeight: 600, src: 'https://example.com/art.jpg' };
  renderer.setAlbumArt(mockImg);
  assert.strictEqual(renderer.albumArtImage, mockImg, 'albumArtImage must be set');
});

test('3b. KineticCanvasRenderer renders album art background with cover scale and radial vignette in cinematic mode', () => {
  const KineticCanvasRenderer = require(kineticRendererPath);
  const canvas = createMockCanvas(1200, 800);
  const renderer = new KineticCanvasRenderer(canvas, { isCinematic: true });
  const mockImg = { tagName: 'IMG', naturalWidth: 500, naturalHeight: 500, src: 'https://example.com/cover.jpg' };
  renderer.setAlbumArt(mockImg);

  const ctx = canvas.getContext();
  canvas._operations.length = 0;
  renderer.renderAlbumArtBackground(ctx, 1000, { canvasColor: '#070709' });

  const drawOps = canvas._operations.filter(op => op.op === 'drawImage');
  assert.ok(drawOps.length > 0, 'Must invoke drawImage with album art');
  
  const vignetteOps = canvas._operations.filter(op => op.op === 'addColorStop');
  assert.ok(vignetteOps.length >= 3, 'Must apply multi-stop radial vignette for high-contrast typography');
});

test('3c. renderer.js syncCinematicState passes artworkUrl and invokes setAlbumArt', () => {
  const renderer = fs.readFileSync(rendererJsPath, 'utf8');
  assert.ok(
    renderer.includes('cinematicMainRendererInstance.setAlbumArt(artUrl || artImg)'),
    'syncCinematicState must provide album art source to cinematic renderer'
  );
});

// 4. Vector Illustrations Motifs Expansion
test('4a. CinematicConcept includes music, galaxy, nature, and horizon concepts', () => {
  const CinematicConcept = require(cinematicConceptPath);
  assert.ok(CinematicConcept.CONCEPTS.music, 'music concept must be defined');
  assert.ok(CinematicConcept.CONCEPTS.galaxy, 'galaxy concept must be defined');
  assert.ok(CinematicConcept.CONCEPTS.nature, 'nature concept must be defined');
  assert.ok(CinematicConcept.CONCEPTS.horizon, 'horizon concept must be defined');

  assert.strictEqual(CinematicConcept.analyzeLyric("Hear the sweet melody").concept, 'music');
  assert.strictEqual(CinematicConcept.analyzeLyric("Orbiting in the galaxy").concept, 'galaxy');
  assert.strictEqual(CinematicConcept.analyzeLyric("Bloom like a rose in the spring").concept, 'nature');
  assert.strictEqual(CinematicConcept.analyzeLyric("Sunrise on the horizon").concept, 'horizon');
});

test('4b. CinematicMotif defines variations and draws vector paths for all new concepts', () => {
  const CinematicMotif = require(cinematicMotifPath);
  assert.strictEqual(CinematicMotif.VARIATION_COUNTS.music, 3);
  assert.strictEqual(CinematicMotif.VARIATION_COUNTS.galaxy, 3);
  assert.strictEqual(CinematicMotif.VARIATION_COUNTS.nature, 3);
  assert.strictEqual(CinematicMotif.VARIATION_COUNTS.horizon, 3);

  const canvas = createMockCanvas(400, 400);
  const ctx = canvas.getContext();

  ['music', 'galaxy', 'nature', 'horizon'].forEach(concept => {
    for (let v = 0; v < 3; v++) {
      canvas._operations.length = 0;
      CinematicMotif.drawMotif(ctx, {
        concept,
        variation: v,
        cx: 200,
        cy: 200,
        rx: 80,
        ry: 80,
        strokeColor: '#ffffff',
        alpha: 0.25,
        drift: 0.5
      });
      const strokes = canvas._operations.filter(op => op.op === 'stroke' || op.op === 'fill');
      assert.ok(strokes.length > 0, `Motif ${concept} variation ${v} must emit drawing path strokes`);
    }
  });
});

// 5. Cinematic Mode Lyrics Pulsing
test('5a. KineticCanvasRenderer applies rhythmic scale pulse transform to lyrics in cinematic mode', () => {
  const KineticCanvasRenderer = require(kineticRendererPath);
  const canvas = createMockCanvas(800, 600);
  const renderer = new KineticCanvasRenderer(canvas, { isCinematic: true, reducedMotion: false });
  const ctx = canvas.getContext();

  const scene = {
    style: 'styleA',
    primaryText: 'Pulsing active lyric line',
    words: [],
    startTimeMs: 1000,
    endTimeMs: 4000
  };

  canvas._operations.length = 0;
  renderer.renderSceneTypography(ctx, scene, 2000, 1.0);

  const scaleOps = canvas._operations.filter(op => op.op === 'scale');
  assert.ok(scaleOps.length > 0, 'Cinematic Mode typography must apply rhythmic pulse scale');
  
  // Verify scale value breathes subtly around 1.0 (~1.000 to ~1.015)
  const scaleVal = scaleOps[0].sx;
  assert.ok(scaleVal >= 0.985 && scaleVal <= 1.025, `Scale ${scaleVal} must be within subtle organic range`);
});

test('5b. Reduced motion mode disables pulsing in cinematic mode', () => {
  const KineticCanvasRenderer = require(kineticRendererPath);
  const canvas = createMockCanvas(800, 600);
  const renderer = new KineticCanvasRenderer(canvas, { isCinematic: true, reducedMotion: true });
  const ctx = canvas.getContext();

  const scene = {
    style: 'styleA',
    primaryText: 'Pulsing lyric line',
    words: [],
    startTimeMs: 1000,
    endTimeMs: 4000
  };

  canvas._operations.length = 0;
  renderer.renderSceneTypography(ctx, scene, 2000, 1.0);

  const scaleOps = canvas._operations.filter(op => op.op === 'scale');
  assert.strictEqual(scaleOps.length, 0, 'Reduced motion must suppress pulse scale transform');
});

console.log(`\nAll ${passed} Cinematic BG, Pulsing, Vector Motifs & About Modals tests passed successfully!`);
