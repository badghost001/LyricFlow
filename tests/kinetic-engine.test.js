/**
 * Unit & Integration Tests: Kinetic Typography Video Engine
 * Validates:
 * 1. KineticShapeMorpher: 7 shapes, continuous perimeter points, morph interpolation, deterministic track seeding.
 * 2. KineticColorEngine: Album art MMCQ palette extraction, HSL luminance & saturation clamping, WCAG AA contrast, preset resolution.
 * 3. KineticTypographyEngine: Text measurement, font fitting, Style A narrative, Style B punch words, Style C split card.
 * 4. KineticDirector: Lyric phrase classification, beat-locked cut timing, and scene timeline generation.
 * 5. KineticCanvasRenderer: Initialization, timeline integration, frame rendering.
 */

const assert = require('assert');
const ShapeMorpher = require('../src/modules/kinetic/KineticShapeMorpher.js');
const ColorEngine = require('../src/modules/kinetic/KineticColorEngine.js');
const TypographyEngine = require('../src/modules/kinetic/KineticTypographyEngine.js');
const Director = require('../src/modules/kinetic/KineticDirector.js');
const KineticCanvasRenderer = require('../src/modules/kinetic/KineticCanvasRenderer.js');

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
    throw err;
  }
}

console.log('\n--- Running Kinetic Typography Video Engine Tests ---\n');

// ==========================================
// 1. KineticShapeMorpher Tests
// ==========================================
console.log('1. KineticShapeMorpher:');

test('1a. All 7 shape keys exist and are defined', () => {
  const expectedShapes = ['astroid', 'diamond', 'clover', 'rosette', 'heart', 'hexagon', 'circle'];
  assert.strictEqual(ShapeMorpher.SHAPE_KEYS.length, 7);
  expectedShapes.forEach((key) => {
    assert.ok(ShapeMorpher.SHAPES[key], `Shape ${key} should be defined`);
    assert.ok(ShapeMorpher.SHAPES[key].name, `Shape ${key} must have name`);
    assert.ok(ShapeMorpher.SHAPES[key].icon, `Shape ${key} must have icon`);
  });
});

test('1b. Shape point evaluation produces valid non-NaN coordinates for all shapes', () => {
  const bounds = { x: 100, y: 200, width: 500, height: 600, cornerRadius: 32 };
  ShapeMorpher.SHAPE_KEYS.forEach((shape) => {
    for (let s = 0; s <= 1.0; s += 0.1) {
      const pt = ShapeMorpher.getShapePoint(shape, s, 350, 500, 200, 200);
      assert.ok(!isNaN(pt.x), `x for ${shape} at s=${s} is NaN`);
      assert.ok(!isNaN(pt.y), `y for ${shape} at s=${s} is NaN`);
      assert.ok(isFinite(pt.x), `x for ${shape} at s=${s} is infinite`);
      assert.ok(isFinite(pt.y), `y for ${shape} at s=${s} is infinite`);
    }
  });
});

test('1c. Card perimeter point evaluation produces continuous boundary matching card dimensions', () => {
  const w = 500, h = 700, r = 32;
  const cx = 350, cy = 450;
  for (let s = 0; s <= 1.0; s += 0.05) {
    const pt = ShapeMorpher.getCardPerimeterPoint(s, cx, cy, w, h, r);
    assert.ok(!isNaN(pt.x) && !isNaN(pt.y), `pt at s=${s} must be valid`);
    // Boundary checks
    assert.ok(pt.x >= cx - w / 2 - 0.1, `pt.x (${pt.x}) must be >= left bound`);
    assert.ok(pt.x <= cx + w / 2 + 0.1, `pt.x (${pt.x}) must be <= right bound`);
    assert.ok(pt.y >= cy - h / 2 - 0.1, `pt.y (${pt.y}) must be >= top bound`);
    assert.ok(pt.y <= cy + h / 2 + 0.1, `pt.y (${pt.y}) must be <= bottom bound`);
  }
});

test('1d. Morphed points interpolate smoothly from shape (t=0) to card (t=1)', () => {
  const bounds = { x: 80, y: 280, width: 560, height: 720, cornerRadius: 36 };
  const pts0 = ShapeMorpher.getMorphedPoints('astroid', 0.0, bounds, { numPoints: 64 });
  const ptsMid = ShapeMorpher.getMorphedPoints('astroid', 0.5, bounds, { numPoints: 64 });
  const pts1 = ShapeMorpher.getMorphedPoints('astroid', 1.0, bounds, { numPoints: 64 });

  assert.strictEqual(pts0.length, 64);
  assert.strictEqual(ptsMid.length, 64);
  assert.strictEqual(pts1.length, 64);

  // t=0 should have smaller bounding box than t=1
  const minX0 = Math.min(...pts0.map((p) => p.x));
  const minX1 = Math.min(...pts1.map((p) => p.x));
  assert.ok(minX0 > minX1, `t=0 shape width should be smaller than fully expanded t=1 card`);
});

test('1e. Track-seeded auto shape selection is deterministic per song and varies across songs', () => {
  const s1 = ShapeMorpher.getShapeForTrack('Young the Giant', 'Mind Over Matter');
  const s1_again = ShapeMorpher.getShapeForTrack('Young the Giant', 'Mind Over Matter');
  assert.strictEqual(s1, s1_again, 'Same song must deterministically produce identical shape');

  const s2 = ShapeMorpher.getShapeForTrack('The Weeknd', 'Blinding Lights');
  const s3 = ShapeMorpher.getShapeForTrack('Billie Eilish', 'Bad Guy');
  const s4 = ShapeMorpher.getShapeForTrack('Kendrick Lamar', 'Not Like Us');

  // Verify at least some variety across different tracks
  const distinct = new Set([s1, s2, s3, s4]);
  assert.ok(distinct.size >= 2, 'Different songs should map to diverse shapes');
});

// ==========================================
// 2. KineticColorEngine Tests
// ==========================================
console.log('2. KineticColorEngine:');

test('2a. Color engine exposes all 7 curated presets', () => {
  const expectedPresets = [
    'velvet_plum', 'midnight_emerald', 'obsidian_gold',
    'cyberpunk_cobalt', 'crimson_noir', 'vintage_sepia', 'monochrome_slate'
  ];
  assert.strictEqual(ColorEngine.PRESET_KEYS.length, 7);
  expectedPresets.forEach((key) => {
    assert.ok(ColorEngine.PRESETS[key], `Preset ${key} must exist`);
    assert.ok(ColorEngine.PRESETS[key].cardColor, `Preset ${key} must have cardColor`);
    assert.ok(ColorEngine.PRESETS[key].textColor, `Preset ${key} must have textColor`);
  });
});

test('2b. Dynamic album art palette extraction clamps luminance & guarantees WCAG AA contrast (>= 4.5:1)', () => {
  // Test across diverse album art dominant colors (bright, dark, saturated, neutral)
  const testColors = [
    { r: 230, g: 30, b: 60 },   // bright crimson
    { r: 20, g: 180, b: 240 },  // vibrant cyan
    { r: 240, g: 220, b: 50 },  // bright yellow
    { r: 15, g: 25, b: 40 },    // dark navy
    { r: 180, g: 180, b: 180 }  // medium grey
  ];

  testColors.forEach((rgb) => {
    const palette = ColorEngine.deriveKineticPaletteFromRgb(rgb);
    assert.ok(palette.cardColor.startsWith('#'), 'cardColor must be hex');
    assert.ok(palette.textColor.startsWith('#'), 'textColor must be hex');

    const cardHsl = ColorEngine.rgbToHsl(palette.cardRgb.r, palette.cardRgb.g, palette.cardRgb.b);
    assert.ok(cardHsl.l >= 0.10 && cardHsl.l <= 0.22, `Card luminance (${cardHsl.l}) should be clamped in velvet range 10-22%`);

    const textHsl = ColorEngine.rgbToHsl(palette.textRgb.r, palette.textRgb.g, palette.textRgb.b);
    assert.ok(textHsl.l >= 0.75, `Text luminance (${textHsl.l}) should be antique pastel >= 75%`);

    const contrast = ColorEngine.getContrastRatio(palette.cardRgb, palette.textRgb);
    assert.ok(contrast >= 4.5, `Contrast ratio (${contrast.toFixed(2)}) must satisfy WCAG AA >= 4.5`);
  });
});

test('2c. resolvePalette correctly handles presets, album art, and custom color overrides', () => {
  const pPreset = ColorEngine.resolvePalette('midnight_emerald');
  assert.strictEqual(pPreset.id, 'midnight_emerald');
  assert.strictEqual(pPreset.cardColor, '#0f261e');

  const pCustom = ColorEngine.resolvePalette('custom', {
    custom: { cardColor: '#441122', textColor: '#ffeeee', canvasColor: '#050505' }
  });
  assert.strictEqual(pCustom.id, 'custom');
  assert.strictEqual(pCustom.cardColor, '#441122');
  assert.strictEqual(pCustom.textColor, '#ffeeee');
  assert.strictEqual(pCustom.canvasColor, '#050505');
});

// ==========================================
// 3. KineticTypographyEngine Tests
// ==========================================
console.log('3. KineticTypographyEngine:');

test('3a. Text wrapping accurately splits phrases across lines within max width', () => {
  // Mock canvas ctx measureText
  const mockCtx = {
    measureText: (text) => ({ width: text.length * 10 })
  };

  const res = TypographyEngine.measureWrappedLines(mockCtx, 'and when the seasons change will you stand by', 150);
  assert.ok(res.lines.length >= 3, `Should wrap into at least 3 lines, got ${res.lines.length}`);
  res.lines.forEach((l) => {
    assert.ok(mockCtx.measureText(l).width <= 150, `Line "${l}" exceeds max width`);
  });
});

test('3b. computeFitFontSize selects maximum font size without overflowing width or height', () => {
  const mockCtx = {
    measureText: (text) => ({ width: text.length * (parseInt(mockCtx.font) || 16) * 0.6 })
  };

  const bestSize = TypographyEngine.computeFitFontSize(
    mockCtx,
    'CHANGE',
    '{size} serif',
    400, // maxW
    200, // maxH
    24,
    180
  );

  assert.ok(bestSize >= 24 && bestSize <= 180, `Font size ${bestSize} should be in bounds`);
  mockCtx.font = `${bestSize}px serif`;
  assert.ok(mockCtx.measureText('CHANGE').width <= 400, 'Calculated font size must not exceed container width');
});

// ==========================================
// 4. KineticDirector Tests
// ==========================================
console.log('4. KineticDirector:');

test('4a. classifyPhrase correctly maps narrative, punch words, and climax questions', () => {
  // Narrative phrase (Style A)
  const a = Director.classifyPhrase('and when the seasons');
  assert.strictEqual(a.style, 'styleA');
  assert.strictEqual(a.primaryText, 'and when the seasons');

  // Punch word (Style B)
  const b1 = Director.classifyPhrase('CHANGE');
  assert.strictEqual(b1.style, 'styleB');
  assert.strictEqual(b1.primaryText, 'CHANGE');

  const b2 = Director.classifyPhrase('BY');
  assert.strictEqual(b2.style, 'styleB');
  assert.strictEqual(b2.primaryText, 'BY');

  // Multi-word punch with helper (Style B)
  const b3 = Director.classifyPhrase("you're on my", [{ text: "you're" }, { text: "on" }, { text: "my" }]);
  assert.strictEqual(b3.style, 'styleB');
  assert.strictEqual(b3.primaryText, "YOU'RE");
  assert.strictEqual(b3.secondaryText, 'on my');

  // Climax question (Style C)
  const c = Director.classifyPhrase('MIND?');
  assert.strictEqual(c.style, 'styleC');
  assert.strictEqual(c.primaryText, 'MIND?');
});

test('4b. buildTimeline generates complete scene sequence with intro morph and lyric cuts', () => {
  const lyrics = [
    { text: 'you know', timeMs: 3500, endMs: 4500 },
    { text: "you're on my", timeMs: 4500, endMs: 5500 },
    { text: 'mind?', timeMs: 5500, endMs: 6500 },
    { text: 'and when the seasons', timeMs: 6500, endMs: 8000 },
    { text: 'change', timeMs: 8000, endMs: 9500 },
    { text: 'will you stand', timeMs: 9500, endMs: 11000 },
    { text: 'by', timeMs: 11000, endMs: 12300 }
  ];

  const timeline = Director.buildTimeline(lyrics, {
    startTimeMs: 0,
    introDurationMs: 3500,
    artist: 'Young the Giant',
    title: 'Mind Over Matter'
  });

  assert.ok(timeline.length >= 8, `Timeline should contain intro morph + 7 lyric scenes, got ${timeline.length}`);
  assert.strictEqual(timeline[0].style, 'morph');
  assert.strictEqual(timeline[0].startTimeMs, 0);
  assert.strictEqual(timeline[0].endTimeMs, 3500);

  // Verify getSceneAt lookup
  const sceneAt2s = Director.getSceneAt(timeline, 2000);
  assert.strictEqual(sceneAt2s.style, 'morph');

  const sceneAt4s = Director.getSceneAt(timeline, 4000);
  assert.strictEqual(sceneAt4s.style, 'styleA');
  assert.strictEqual(sceneAt4s.primaryText, 'you know');

  const sceneAt5s = Director.getSceneAt(timeline, 5000);
  assert.strictEqual(sceneAt5s.style, 'styleB');

  const sceneAt6s = Director.getSceneAt(timeline, 6000);
  assert.strictEqual(sceneAt6s.style, 'styleC');
});

// ==========================================
// 5. KineticCanvasRenderer Integration Tests
// ==========================================
console.log('5. KineticCanvasRenderer:');

test('5a. Renderer initializes, sets 9:16 card proportions, and handles config changes', () => {
  // Mock canvas element
  const mockCanvas = {
    width: 720,
    height: 1280,
    getContext: () => ({
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      measureText: (text) => ({ width: text.length * 12 }),
      fillText: () => {},
      drawImage: () => {},
      clip: () => {},
      roundRect: () => {}
    })
  };

  const renderer = new KineticCanvasRenderer(mockCanvas, { width: 720, height: 1280 });
  assert.strictEqual(renderer.width, 720);
  assert.strictEqual(renderer.height, 1280);
  assert.ok(renderer.cardBounds.width > 500, 'Card width should be ~78% of 720');
  assert.ok(renderer.cardBounds.height > 600, 'Card height should be ~56% of 1280');

  renderer.configure({
    artist: 'Young the Giant',
    title: 'Mind Over Matter',
    shapeMode: 'manual',
    shapeType: 'diamond',
    colorMode: 'preset',
    presetKey: 'midnight_emerald'
  });

  assert.strictEqual(renderer.resolvedShape, 'diamond');
  assert.strictEqual(renderer.activePalette.id, 'midnight_emerald');

  // Verify renderFrame runs without error
  renderer.renderFrame(1500); // in intro
  renderer.renderFrame(5000); // past intro

  renderer.destroy();
});

test('2d. resolvePalette and deriveKineticPaletteFromRgb guarantee valid cardRgb and textRgb objects', () => {
  // Null/empty dominant RGB
  const pal1 = ColorEngine.deriveKineticPaletteFromRgb(null);
  assert.ok(pal1.cardRgb && typeof pal1.cardRgb.r === 'number', 'cardRgb.r must exist on null input');
  assert.ok(pal1.textRgb && typeof pal1.textRgb.r === 'number', 'textRgb.r must exist on null input');

  // All presets
  ColorEngine.PRESET_KEYS.forEach(key => {
    const pal = ColorEngine.resolvePalette(key);
    assert.ok(pal.cardRgb && typeof pal.cardRgb.r === 'number', `Preset ${key} must have cardRgb.r`);
    assert.ok(pal.textRgb && typeof pal.textRgb.r === 'number', `Preset ${key} must have textRgb.r`);
  });
});

test('4c. buildTimeline generates continuous scenes when lyrics are empty or spaced with gaps', () => {
  // Empty lyrics test
  const emptyTimeline = Director.buildTimeline([], {
    artist: 'Olivia Rodrigo',
    title: 'traitor'
  });
  assert.ok(emptyTimeline.length >= 2, 'Empty lyrics must still generate intro morph + track title scene');
  const midTrackScene = Director.getSceneAt(emptyTimeline, 30000);
  assert.ok(midTrackScene, 'Scene at 30s must exist');
  assert.strictEqual(midTrackScene.id, 'scene_placeholder_track');
  assert.strictEqual(midTrackScene.primaryText, 'TRAITOR');

  // Spaced lyrics test with intro gap
  const spacedLyrics = [
    { timeMs: 15000, text: 'Brown guilty eyes' },
    { timeMs: 25000, text: 'You stepped on me' }
  ];
  const spacedTimeline = Director.buildTimeline(spacedLyrics, {
    artist: 'Olivia Rodrigo',
    title: 'traitor'
  });
  // Intro gap scene at 8000ms (between 3500 and 15000)
  const gapScene = Director.getSceneAt(spacedTimeline, 8000);
  assert.ok(gapScene, 'Scene during pre-vocal gap must exist');
  assert.strictEqual(gapScene.id, 'scene_intro_title');

  // During first lyric
  const lyricScene1 = Director.getSceneAt(spacedTimeline, 18000);
  assert.ok(lyricScene1, 'Scene during first line must exist');
  assert.ok(lyricScene1.primaryText.includes('brown'), 'First lyric text should be active');
});

test('1f. All 7 shapes have unique icons and drawMorphedCard uses dynamic shape icon', () => {
  const expectedIcons = {
    astroid: '★',
    diamond: '◆',
    clover: '✤',
    rosette: '✿',
    heart: '♥',
    hexagon: '⬡',
    circle: '●'
  };
  ShapeMorpher.SHAPE_KEYS.forEach(key => {
    assert.strictEqual(ShapeMorpher.SHAPES[key].icon, expectedIcons[key], `Shape ${key} icon must match ${expectedIcons[key]}`);
  });

  // Verify drawMorphedCard with mock canvas ctx
  const mockCalls = [];
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    roundRect: () => {},
    fill: () => {},
    stroke: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fillText: (text, x, y) => { mockCalls.push({ text, x, y }); }
  };

  ShapeMorpher.drawMorphedCard(mockCtx, {
    shapeType: 'heart',
    progress: 1.0,
    bounds: { x: 10, y: 10, width: 100, height: 200, cornerRadius: 10 },
    showAccentStar: true
  });
  const heartCall = mockCalls.find(c => c.text === '♥');
  assert.ok(heartCall, 'drawMorphedCard with shapeType heart must render ♥ seal');
});

test('1g. drawMorphedCard renders keyword illustration in card background using active concept', () => {
  assert.strictEqual(ShapeMorpher.SHAPE_TO_CONCEPT.heart, 'love');
  assert.strictEqual(ShapeMorpher.SHAPE_TO_CONCEPT.astroid, 'night');
  assert.strictEqual(ShapeMorpher.SHAPE_TO_CONCEPT.clover, 'dream');
  assert.strictEqual(ShapeMorpher.SHAPE_TO_CONCEPT.diamond, 'memory');

  let motifCall = null;
  const mockMotifEngine = {
    drawMotif: (ctx, opts) => {
      motifCall = opts;
    }
  };
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    roundRect: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {}
  };

  // 1. With explicit lyric concept
  ShapeMorpher.drawMorphedCard(mockCtx, {
    shapeType: 'astroid',
    progress: 1.0,
    bounds: { x: 0, y: 0, width: 800, height: 600, cornerRadius: 24 },
    concept: 'rain',
    motifEngine: mockMotifEngine
  });
  assert.ok(motifCall, 'drawMotif must be called');
  assert.strictEqual(motifCall.concept, 'rain', 'Motif concept must be rain');

  // 2. Fallback to SHAPE_TO_CONCEPT mapping when concept not provided
  motifCall = null;
  ShapeMorpher.drawMorphedCard(mockCtx, {
    shapeType: 'heart',
    progress: 1.0,
    bounds: { x: 0, y: 0, width: 800, height: 600, cornerRadius: 24 },
    motifEngine: mockMotifEngine
  });
  assert.ok(motifCall, 'drawMotif must be called with mapped concept');
  assert.strictEqual(motifCall.concept, 'love', 'Heart shapeType must map to love concept illustration');

  // 3. When hasActiveMotifLayer is true, watermark in card background is skipped to avoid duplication
  motifCall = null;
  ShapeMorpher.drawMorphedCard(mockCtx, {
    shapeType: 'astroid',
    progress: 1.0,
    bounds: { x: 0, y: 0, width: 800, height: 600, cornerRadius: 24 },
    concept: 'night',
    motifEngine: mockMotifEngine,
    hasActiveMotifLayer: true
  });
  assert.strictEqual(motifCall, null, 'When hasActiveMotifLayer is true, background watermark must not duplicate foreground motif');
});

test('5b. KineticCanvasRenderer exposes triggerShapePreview and animates preview morph', () => {
  const mockCanvas = { getContext: () => ({ fillStyle: '', fillRect: () => {}, save: () => {}, restore: () => {}, beginPath: () => {}, roundRect: () => {}, fill: () => {}, stroke: () => {}, fillText: () => {} }) };
  const renderer = new KineticCanvasRenderer(mockCanvas, { width: 720, height: 1280 });
  assert.strictEqual(typeof renderer.triggerShapePreview, 'function', 'triggerShapePreview method must exist');

  renderer.triggerShapePreview('rosette');
  assert.strictEqual(renderer.resolvedShape, 'rosette', 'triggerShapePreview must update resolvedShape');
  renderer.destroy();
});

test('6a. renderer.js defines top-level _openShareWithIslandInterop and attaches to window', () => {
  const fs = require('fs');
  const path = require('path');
  const rendererSrc = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert.ok(rendererSrc.includes('function _openShareWithIslandInterop(idx)'), '_openShareWithIslandInterop must be declared');
  assert.ok(rendererSrc.includes('window._openShareWithIslandInterop = _openShareWithIslandInterop;'), 'Must be assigned to window');
});

test('7a. Video and card image export commands are registered in Rust, bridge, and share-card', () => {
  const fs = require('fs');
  const path = require('path');
  const videoRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/video.rs'), 'utf8');
  assert.ok(videoRs.includes('pub async fn export_kinetic_video'), 'export_kinetic_video command must exist');
  assert.ok(videoRs.includes('pub async fn save_card_image'), 'save_card_image command must exist');

  const libRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/lib.rs'), 'utf8');
  assert.ok(libRs.includes('video::save_card_image'), 'lib.rs must register save_card_image');

  const bridgeJs = fs.readFileSync(path.join(__dirname, '../src/tauri-bridge.js'), 'utf8');
  assert.ok(bridgeJs.includes('saveCardImage:'), 'tauri-bridge must expose saveCardImage');
  assert.ok(bridgeJs.includes('exportKineticVideo:'), 'tauri-bridge must expose exportKineticVideo');
});

test('8a. KineticTypographyEngine wrapTimedWords respects timed words and spacing boundaries', () => {
  const mockCtx = {
    measureText: (text) => ({ width: text.length * 10 })
  };
  const words = [
    { text: 'Hello', timeMs: 0, endMs: 500, hasSpace: true },
    { text: 'world', timeMs: 500, endMs: 1000, hasSpace: true },
    { text: 'cinematic', timeMs: 1000, endMs: 1500, hasSpace: false },
    { text: 'mode', timeMs: 1500, endMs: 2000, hasSpace: false }
  ];
  const lines = TypographyEngine.wrapTimedWords(mockCtx, words, 120);
  assert.ok(lines.length >= 2, 'Should wrap into multiple lines when exceeding maxWidth');
  assert.strictEqual(lines[0].words[0].text, 'Hello');
});

test('8b. KineticTypographyEngine renderStyleA executes progressive karaoke illumination for active word', () => {
  const clippedRects = [];
  const filledTexts = [];
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    rect: (x, y, w, h) => { clippedRects.push({ x, y, w, h }); },
    clip: () => {},
    fillText: (text, x, y) => { filledTexts.push({ text, x, y, fillStyle: mockCtx.fillStyle }); },
    measureText: (text) => ({ width: text.length * 10 }),
    fillStyle: '',
    shadowColor: '',
    shadowBlur: 0
  };

  const words = [
    { text: 'Past', timeMs: 0, endMs: 1000, hasSpace: true },
    { text: 'Singing', timeMs: 1000, endMs: 2000, hasSpace: true },
    { text: 'Future', timeMs: 2000, endMs: 3000, hasSpace: false }
  ];

  TypographyEngine.renderStyleA(mockCtx, {
    text: 'Past Singing Future',
    words,
    currentTimeMs: 1500, // midway through 'Singing'
    bounds: { x: 0, y: 0, width: 800, height: 400 },
    palette: {
      textColor: '#ffffff',
      textRgb: { r: 255, g: 255, b: 255 }
    }
  });

  // 'Past' is sung, 'Singing' is active with clip rect, 'Future' is unlit
  assert.ok(clippedRects.length > 0, 'Active singing word must produce a clipping rectangle for progressive sweep');
  assert.ok(filledTexts.some(t => t.text === 'Singing'), 'Active word Singing must be rendered');
  assert.ok(filledTexts.some(t => t.text === 'Past'), 'Past word must be rendered');
});

test('8c. KineticCanvasRenderer updateCardBounds creates horizontal wide stage on widescreen/desktop', () => {
  const mockCanvas = { getContext: () => ({ fillStyle: '', fillRect: () => {}, save: () => {}, restore: () => {}, beginPath: () => {}, roundRect: () => {}, fill: () => {}, stroke: () => {}, fillText: () => {} }) };
  
  // Horizontal desktop window
  const horizontalRenderer = new KineticCanvasRenderer(mockCanvas, { width: 1000, height: 600 });
  assert.ok(horizontalRenderer.cardBounds.width > horizontalRenderer.cardBounds.height, 'Card bounds must be horizontal widescreen');
  assert.strictEqual(horizontalRenderer.cardBounds.width, 950); // 95% of 1000
  assert.strictEqual(horizontalRenderer.cardBounds.height, 528); // 88% of 600

  // Vertical mobile story
  const verticalRenderer = new KineticCanvasRenderer(mockCanvas, { width: 720, height: 1280 });
  assert.ok(verticalRenderer.cardBounds.height > verticalRenderer.cardBounds.width, 'Card bounds must be vertical');
  assert.strictEqual(verticalRenderer.cardBounds.width, 562); // 78% of 720
  assert.strictEqual(verticalRenderer.cardBounds.height, 717); // 56% of 1280

  // Fullscreen Cinematic Stage (isCinematic: true) fills 100% stage with 0 cornerRadius
  const cinematicRenderer = new KineticCanvasRenderer(mockCanvas, { width: 1260, height: 860, isCinematic: true });
  assert.strictEqual(cinematicRenderer.cardBounds.width, 1260);
  assert.strictEqual(cinematicRenderer.cardBounds.height, 860);
  assert.strictEqual(cinematicRenderer.cardBounds.cornerRadius, 0);
});

test('8d. Cinematic Mode Main App Integration in index.html and renderer.js', () => {
  const fs = require('fs');
  const path = require('path');
  const htmlSrc = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  assert.ok(htmlSrc.includes('id="cinematic-main-stage"'), 'index.html must have #cinematic-main-stage');
  assert.ok(htmlSrc.includes('id="cinematic-main-canvas"'), 'index.html must have #cinematic-main-canvas');
  assert.ok(htmlSrc.includes('id="btn-cinematic-mode"'), 'index.html must have #btn-cinematic-mode');
  assert.ok(htmlSrc.includes('id="btn-cinematic-exit"'), 'index.html must have #btn-cinematic-exit');
  assert.ok(htmlSrc.includes('cinematic-view-active'), 'index.html app-container must have default cinematic-view-active class');

  const rendererSrc = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert.ok(rendererSrc.includes('function initCinematicMainStage()'), 'renderer.js must define initCinematicMainStage');
  assert.ok(rendererSrc.includes('function syncCinematicState()'), 'renderer.js must define syncCinematicState');
  assert.ok(rendererSrc.includes('function toggleCinematicView('), 'renderer.js must define toggleCinematicView');
  assert.ok(rendererSrc.includes('settings.cinematicMode = true;'), 'renderer.js must default settings.cinematicMode to true');
  assert.ok(rendererSrc.includes('cinematicMainRendererInstance.seek(syncProgress)'), 'updatePlayhead must drive cinematicMainRendererInstance.seek with synchronized progress');
  assert.ok(rendererSrc.includes('btn-cinematic-exit'), 'renderer.js must bind click on #btn-cinematic-exit');
});

test('8e. chunkIntoPhrases guarantees strictly 1 to 3 words per chunk across diverse sentence lengths', () => {
  const sentences = [
    'I tried so hard and got so far',
    'Caught in a landslide no escape from reality open your eyes look up to the skies and see',
    'Memories consume like opening the wound',
    'WAIT for me',
    'Is this the real life? Is this just fantasy?'
  ];

  sentences.forEach((sentence) => {
    const tokens = sentence.split(/\s+/).filter(Boolean);
    const chunks = Director.chunkIntoPhrases(tokens);
    chunks.forEach((chunk) => {
      assert.ok(chunk.length >= 1, `Chunk [${chunk.join(' ')}] must have at least 1 word`);
      assert.ok(chunk.length <= 3, `Chunk [${chunk.join(' ')}] length (${chunk.length}) must not exceed 3 words`);
    });
    // Flattened words must match original sentence
    const reconstructed = chunks.flat().join(' ');
    assert.strictEqual(reconstructed, tokens.join(' '), 'Chunking must preserve all words in order');
  });
});

test('8f. buildTimeline partitions multi-word lines into 1-to-3 words scenes with seamless timing', () => {
  const lineWords = [
    { text: 'I', timeMs: 1000, endMs: 1300 },
    { text: 'tried', timeMs: 1300, endMs: 1800 },
    { text: 'so', timeMs: 1800, endMs: 2200 },
    { text: 'hard', timeMs: 2200, endMs: 2800 },
    { text: 'and', timeMs: 2800, endMs: 3100 },
    { text: 'got', timeMs: 3100, endMs: 3500 },
    { text: 'so', timeMs: 3500, endMs: 3900 },
    { text: 'far', timeMs: 3900, endMs: 4500 }
  ];

  const lyrics = [
    { text: 'I tried so hard and got so far', timeMs: 1000, endMs: 4500, words: lineWords }
  ];

  const timeline = Director.buildTimeline(lyrics, { startTimeMs: 0, introDurationMs: 800 });
  const lyricScenes = timeline.filter(s => s.id && s.id.startsWith('scene_lyric_'));

  assert.ok(lyricScenes.length > 1, '8-word line must be partitioned into multiple scenes');
  lyricScenes.forEach((scene) => {
    const wordCount = scene.words.length;
    assert.ok(wordCount >= 1 && wordCount <= 3, `Scene "${scene.primaryText}" has ${wordCount} words; must be 1 to 3 words`);
    assert.ok(scene.endTimeMs > scene.startTimeMs, `Scene "${scene.primaryText}" duration must be positive`);
  });

  // Check seamless consecutive transitions
  for (let s = 0; s < lyricScenes.length - 1; s++) {
    assert.strictEqual(lyricScenes[s].endTimeMs, lyricScenes[s + 1].startTimeMs, 'Consecutive chunks must have continuous playback timing');
  }
});

test('8g. KineticDirector buildTimeline with skipIntroMorph/isCinematic starts lyrics with zero delay at first vocal onset', () => {
  const lyrics = [
    { text: 'Look into my eyes', timeMs: 600, endMs: 2000 }
  ];
  // In cinematic mode, the intro morph is skipped so lyrics at 600ms start immediately without waiting 2000ms
  const timeline = Director.buildTimeline(lyrics, { startTimeMs: 0, isCinematic: true, skipIntroMorph: true });
  const firstLyric = timeline.find(s => s.id && s.id.startsWith('scene_lyric_'));
  assert.ok(firstLyric, 'First lyric scene must exist in cinematic timeline');
  assert.strictEqual(firstLyric.startTimeMs, 600, 'First lyric must start at exact vocal timestamp (600ms) with zero artificial delay');
  
  const introMorph = timeline.find(s => s.id === 'scene_intro_morph');
  assert.strictEqual(introMorph, undefined, 'Intro shape morph must be skipped in live cinematic mode');
});

test('8h. KineticTypographyEngine renders clean, crisp, glow-free typography without shadowBlur', () => {
  const recorded = [];
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    rect: () => {},
    clip: () => {},
    fillText: (text) => recorded.push({ text, shadowBlur: mockCtx.shadowBlur, shadowColor: mockCtx.shadowColor }),
    measureText: (str) => ({ width: str.length * 10 }),
    translate: () => {},
    scale: () => {},
    shadowBlur: 0,
    shadowColor: 'transparent',
    font: '',
    fillStyle: '',
    textAlign: '',
    textBaseline: ''
  };

  const words = [
    { text: 'hello', timeMs: 1000, endMs: 1500 },
    { text: 'world', timeMs: 1500, endMs: 2000 }
  ];
  const bounds = { x: 0, y: 0, width: 800, height: 400 };
  const palette = { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } };

  // Render Style A at active timestamp (1200ms)
  TypographyEngine.renderStyleA(mockCtx, {
    text: 'hello world',
    words,
    currentTimeMs: 1200,
    bounds,
    palette
  });

  assert.ok(recorded.length > 0, 'Words must be rendered');
  recorded.forEach((item) => {
    assert.strictEqual(item.shadowBlur, 0, 'Rendered text must have 0 shadowBlur (no glowing neon)');
    assert.strictEqual(item.shadowColor, 'transparent', 'Rendered text must have transparent shadowColor (no fuzzy glow)');
  });
});

test('8i. KineticDirector generates animated break_morph shape transition and rotates shapes on gaps >= 3200ms', () => {
  const lyrics = [
    { text: 'Look into my eyes', timeMs: 1000, endMs: 3000 },
    // Gap of 4000ms (3000ms to 7000ms)
    { text: 'Tell me what you see', timeMs: 7000, endMs: 9500 }
  ];
  const timeline = Director.buildTimeline(lyrics, {
    startTimeMs: 0,
    isCinematic: true,
    skipIntroMorph: true,
    initialShape: 'astroid'
  });

  const breakMorph = timeline.find(s => s.style === 'break_morph');
  assert.ok(breakMorph, 'Must generate break_morph scene during >= 3200ms gap');
  assert.strictEqual(breakMorph.startTimeMs, 5600, 'Break morph starts 1400ms right before upcoming vocal');
  assert.strictEqual(breakMorph.endTimeMs, 7000, 'Break morph ends when next vocal starts');
  assert.notStrictEqual(breakMorph.shapeType, 'astroid', 'Break morph must change to a new shape in the rotation');

  // Verify second line inherits the new rotated shape
  const secondLyric = timeline.find(s => s.id && s.id.startsWith('scene_lyric_1'));
  assert.ok(secondLyric, 'Second lyric scene must exist');
  assert.strictEqual(secondLyric.shapeType, breakMorph.shapeType, 'Next lyric must inherit the rotated shape');
});

test('8j. KineticDirector triggers break_morph on moderate gaps (>= 1800ms) and rotates shapes across stanzas', () => {
  const lyrics = [
    { text: 'Line one', timeMs: 1000, endMs: 2500 },
    // Gap of 2000ms (2500ms to 4500ms) - should trigger break_morph!
    { text: 'Line two', timeMs: 4500, endMs: 6000 },
    // Short gap (600ms)
    { text: 'Line three', timeMs: 6600, endMs: 8000 },
    // Short gap (500ms)
    { text: 'Line four', timeMs: 8500, endMs: 10000 },
    // Short gap (500ms) - line 5 (i=4) should rotate shape across stanza boundary!
    { text: 'Line five', timeMs: 10500, endMs: 12000 }
  ];

  const timeline = Director.buildTimeline(lyrics, {
    startTimeMs: 0,
    isCinematic: true,
    skipIntroMorph: true,
    initialShape: 'astroid'
  });

  const breakMorphs = timeline.filter(s => s.style === 'break_morph');
  assert.strictEqual(breakMorphs.length, 1, 'Moderate gap of 2000ms must trigger break_morph');
  assert.ok(breakMorphs[0].startTimeMs >= 2500, 'Break morph must start after previous vocal ends');
  assert.strictEqual(breakMorphs[0].endTimeMs, 4500, 'Break morph ends when next vocal starts');

  const lineFour = timeline.find(s => s.id && s.id.startsWith('scene_lyric_3'));
  const lineFive = timeline.find(s => s.id && s.id.startsWith('scene_lyric_4'));
  assert.ok(lineFour && lineFive, 'Lyric scenes must exist');
  assert.notStrictEqual(lineFour.shapeType, lineFive.shapeType, 'Stanza boundary (every 4 lines) must rotate shapes even without gaps');
});

test('8k. CSS and renderer enforce complete suppression of resync buttons and white borders in cinematic mode', () => {
  const fs = require('fs');
  const path = require('path');
  const css = fs.readFileSync(path.join(__dirname, '../src/styles/_kinetic.css'), 'utf8');
  assert.ok(css.includes('body.cinematic-view-active #btn-resync-lyrics'), 'CSS must target body.cinematic-view-active #btn-resync-lyrics');
  assert.ok(css.includes('display: none !important'), 'CSS must enforce display: none !important');
  assert.ok(css.includes('opacity: 0 !important'), 'CSS must enforce opacity: 0 !important');
  assert.ok(css.includes('visibility: hidden !important'), 'CSS must enforce visibility: hidden !important');

  const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert.ok(renderer.includes('e.preventDefault();'), 'Cinematic stage wheel listener must prevent default');
  assert.ok(renderer.includes("if (isCinematicView || (document.body && document.body.classList.contains('cinematic-view-active')))"), 'showResyncButton must guard with cinematic view check');
});

console.log(`\nKinetic Typography Video Engine Results: ${passedTests}/${totalTests} tests passed.\n`);
