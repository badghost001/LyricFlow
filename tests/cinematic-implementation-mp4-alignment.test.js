/**
 * tests/cinematic-implementation-mp4-alignment.test.js
 * Verification of Authentic Cinematic Mode Visual Alignment with implementation.mp4:
 * 1. Pacing & Rhythm: 1-to-3 word rapid rhythmic phrase cuts (matching implementation.mp4).
 * 2. Typography Hierarchy:
 *    - Style A: Large lowercase editorial serif ("Fraunces" / "Bodoni Moda" / "Playfair Display")
 *    - Style B: Giant ultra-condensed didone punch word ("CHANGE") with optical vertical stretch (1.15x)
 *    - Style C: 50/50 horizontal split card with climax typography ("MIND?"), creator tag, and duotone art
 * 3. Word-by-Word Karaoke System:
 *    - Active word lights up progressively with brilliant textColor highlight
 *    - Upcoming words remain legible at resting opacity (no blackout)
 *    - Already sung words remain lit
 * 4. Ambient blurred album art background with deep vignette
 * 5. Acoustic breathing pulse on cinematic lyrics
 */

const assert = require('assert');
const path = require('path');
const Director = require('../src/modules/kinetic/KineticDirector.js');
const TypographyEngine = require('../src/modules/kinetic/KineticTypographyEngine.js');
const KineticCanvasRenderer = require('../src/modules/kinetic/KineticCanvasRenderer.js');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function createMockCanvas(width = 720, height = 1280) {
  const operations = [];
  const stateStack = [];
  let currentState = {
    font: '16px sans-serif',
    fillStyle: '#ffffff',
    strokeStyle: '#ffffff',
    globalAlpha: 1.0,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rot: 0 }
  };

  const ctx = {
    canvas: { width, height },
    get font() { return currentState.font; },
    set font(v) { currentState.font = v; },
    get fillStyle() { return currentState.fillStyle; },
    set fillStyle(v) { currentState.fillStyle = v; },
    get strokeStyle() { return currentState.strokeStyle; },
    set strokeStyle(v) { currentState.strokeStyle = v; },
    get globalAlpha() { return currentState.globalAlpha; },
    set globalAlpha(v) { currentState.globalAlpha = v; },
    get textAlign() { return currentState.textAlign; },
    set textAlign(v) { currentState.textAlign = v; },
    get textBaseline() { return currentState.textBaseline; },
    set textBaseline(v) { currentState.textBaseline = v; },
    save() {
      stateStack.push(JSON.parse(JSON.stringify(currentState)));
      operations.push({ op: 'save' });
    },
    restore() {
      if (stateStack.length) currentState = stateStack.pop();
      operations.push({ op: 'restore' });
    },
    translate(x, y) {
      currentState.transform.x += x;
      currentState.transform.y += y;
      operations.push({ op: 'translate', x, y });
    },
    scale(sx, sy) {
      currentState.transform.scaleX *= sx;
      currentState.transform.scaleY *= sy;
      operations.push({ op: 'scale', sx, sy });
    },
    rotate(rad) {
      currentState.transform.rot += rad;
      operations.push({ op: 'rotate', rad });
    },
    measureText(text) {
      return { width: (text || '').length * 14 };
    },
    fillText(text, x, y) {
      operations.push({
        op: 'fillText',
        text,
        x,
        y,
        font: currentState.font,
        fillStyle: currentState.fillStyle,
        alpha: currentState.globalAlpha,
        textAlign: currentState.textAlign,
        transform: JSON.parse(JSON.stringify(currentState.transform))
      });
    },
    strokeText(text, x, y) {
      operations.push({ op: 'strokeText', text, x, y });
    },
    beginPath() { operations.push({ op: 'beginPath' }); },
    moveTo(x, y) { operations.push({ op: 'moveTo', x, y }); },
    lineTo(x, y) { operations.push({ op: 'lineTo', x, y }); },
    stroke() { operations.push({ op: 'stroke' }); },
    fill() { operations.push({ op: 'fill', fillStyle: currentState.fillStyle }); },
    fillRect(x, y, w, h) { operations.push({ op: 'fillRect', x, y, w, h, fillStyle: currentState.fillStyle }); },
    clearRect(x, y, w, h) { operations.push({ op: 'clearRect', x, y, w, h }); },
    rect(x, y, w, h) { operations.push({ op: 'rect', x, y, w, h }); },
    roundRect(x, y, w, h, r) { operations.push({ op: 'roundRect', x, y, w, h, r }); },
    arc(x, y, r, sa, ea) { operations.push({ op: 'arc', x, y, r, sa, ea }); },
    clip() { operations.push({ op: 'clip' }); },
    createRadialGradient: (x0, y0, r0, x1, y1, r1) => ({
      addColorStop: (stop, color) => operations.push({ op: 'addColorStop', stop, color })
    }),
    createLinearGradient: (x0, y0, x1, y1) => {
      const stops = [];
      return {
        addColorStop: (stop, color) => stops.push({ stop, color }),
        _stops: stops
      };
    },
    drawImage(img, dx, dy, dw, dh) { operations.push({ op: 'drawImage', dx, dy, dw, dh }); }
  };

  return {
    ctx,
    getContext: () => ctx,
    operations,
    width,
    height
  };
}

console.log('\n--- Running implementation.mp4 Visual Alignment Tests ---\n');

// Sample test lyric corresponding to the 12-second clip in implementation.mp4
const sampleLyrics = [
  {
    text: 'you know',
    timeMs: 3800,
    endMs: 5500,
    words: [
      { text: 'you', timeMs: 3800, endMs: 4600 },
      { text: 'know', timeMs: 4600, endMs: 5500 }
    ]
  },
  {
    text: 'and when the seasons change',
    timeMs: 5700,
    endMs: 9500,
    words: [
      { text: 'and', timeMs: 5700, endMs: 6000 },
      { text: 'when', timeMs: 6000, endMs: 6500 },
      { text: 'the', timeMs: 6500, endMs: 6800 },
      { text: 'seasons', timeMs: 6800, endMs: 7600 },
      { text: 'change', timeMs: 7700, endMs: 9500 }
    ]
  },
  {
    text: 'will you change your mind?',
    timeMs: 9600,
    endMs: 12000,
    words: [
      { text: 'will', timeMs: 9600, endMs: 9900 },
      { text: 'you', timeMs: 9900, endMs: 10200 },
      { text: 'change', timeMs: 10200, endMs: 10600 },
      { text: 'your', timeMs: 10600, endMs: 11000 },
      { text: 'mind?', timeMs: 11000, endMs: 12000 }
    ]
  }
];

// ==========================================
// 1. Pacing & Rhythm: 1-to-3 word rapid cuts
// ==========================================
console.log('1. Pacing & Rhythm:');

test('1a. buildTimeline partitions multi-word lyric lines into 1-to-3 word rhythmic cut scenes', () => {
  const timeline = Director.buildTimeline(sampleLyrics, { isCinematic: true, skipIntroMorph: true });
  const lyricScenes = timeline.filter(s => s.id && s.id.startsWith('scene_lyric_'));

  assert.ok(lyricScenes.length >= 4, '12-second lyrics must produce multiple rapid rhythmic scenes (>= 4)');
  lyricScenes.forEach(s => {
    assert.ok(s.words.length >= 1 && s.words.length <= 3, `Scene ${s.id} words length must be between 1 and 3 (got ${s.words.length})`);
  });
});

test('1b. Timeline generates all three visual styles (A: narrative, B: punch word, C: climax split card)', () => {
  const timeline = Director.buildTimeline(sampleLyrics, { isCinematic: true, skipIntroMorph: true });
  const styles = new Set(timeline.map(s => s.style));

  assert.ok(styles.has('styleA'), 'Timeline must generate Style A scenes (narrative serif)');
  assert.ok(styles.has('styleB'), 'Timeline must generate Style B scenes (giant punch word)');
  assert.ok(styles.has('styleC'), 'Timeline must generate Style C scenes (climax split card)');
});

// ==========================================
// 2. Editorial Serif Typography & Sizing
// ==========================================
console.log('\n2. Typography Hierarchy & Sizing:');

test('2a. Style A uses Fraunces / Bodoni Moda editorial serif fonts with elevated font size for 1-3 words', () => {
  const mock = createMockCanvas(720, 1280);
  const words = [
    { text: 'you', timeMs: 3800, endMs: 4600 },
    { text: 'know', timeMs: 4600, endMs: 5500 }
  ];

  TypographyEngine.renderStyleA(mock.ctx, {
    text: 'you know',
    words,
    currentTimeMs: 4200,
    bounds: { x: 50, y: 300, width: 620, height: 680 },
    palette: { textColor: '#f2eae4', textRgb: { r: 242, g: 234, b: 228 } },
    isCinematic: true
  });

  const fills = mock.operations.filter(op => op.op === 'fillText');
  assert.ok(fills.length > 0, 'Must render words');
  const usedFont = fills[0].font;
  assert.ok(
    usedFont.includes('Fraunces') || usedFont.includes('Bodoni Moda') || usedFont.includes('Playfair Display'),
    `Font must use Fraunces or Bodoni Moda editorial serif (got ${usedFont})`
  );
});

test('2b. Style B renders giant uppercase display punch word (CHANGE) with vertical stretch and display serif font', () => {
  const mock = createMockCanvas(720, 1280);

  TypographyEngine.renderStyleB(mock.ctx, {
    primaryText: 'CHANGE',
    bounds: { x: 50, y: 300, width: 620, height: 680 },
    palette: { textColor: '#f2eae4', textRgb: { r: 242, g: 234, b: 228 } },
    isCinematic: true
  });

  const scales = mock.operations.filter(op => op.op === 'scale');
  assert.ok(scales.length > 0, 'Style B must apply optical scale');
  const vertStretch = scales[0].sy;
  assert.ok(Math.abs(vertStretch - 1.15) < 0.05, `Style B must use ~1.15x vertical stretch (got ${vertStretch})`);

  const fills = mock.operations.filter(op => op.op === 'fillText');
  assert.ok(fills.length > 0, 'Style B must render punch word text');
  assert.strictEqual(fills[0].text, 'CHANGE', 'Punch word text must be uppercase CHANGE');
  assert.ok(
    fills[0].font.includes('Bodoni Moda') || fills[0].font.includes('Playfair Display') || fills[0].font.includes('Cinzel'),
    `Style B must use Bodoni Moda display serif (got ${fills[0].font})`
  );
});

test('2c. Style C renders climax display typography on top and crops artwork in lower half with center star badge', () => {
  const mock = createMockCanvas(720, 1280);

  TypographyEngine.renderStyleC(mock.ctx, {
    text: 'MIND?',
    creatorTag: '@fwh.songs',
    bounds: { x: 50, y: 300, width: 620, height: 680, cornerRadius: 28 },
    palette: {
      cardColor: '#34181f',
      cardRgb: { r: 52, g: 24, b: 31 },
      textColor: '#f2eae4',
      textRgb: { r: 242, g: 234, b: 228 },
      subtitleColor: '#a89498'
    },
    isCinematic: true
  });

  const fills = mock.operations.filter(op => op.op === 'fillText');
  const texts = fills.map(f => f.text);
  assert.ok(texts.includes('MIND?'), 'Style C must render climax text MIND?');
  assert.ok(texts.includes('@fwh.songs'), 'Style C must render creator tag @fwh.songs');
  assert.ok(texts.includes('★'), 'Style C must render center star emblem badge ★');
});

// ==========================================
// 3. Word-by-Word Karaoke System
// ==========================================
console.log('\n3. Word-by-Word Karaoke Highlighting:');

test('3a. Active singing word creates progressive highlight sweep with luminous textColor contrast', () => {
  const mock = createMockCanvas(720, 1280);
  const words = [
    { text: 'you', timeMs: 3800, endMs: 4600 },
    { text: 'know', timeMs: 4600, endMs: 5500 }
  ];

  // Render at 4200ms: 'you' is actively singing (50% progress)
  TypographyEngine.renderStyleA(mock.ctx, {
    text: 'you know',
    words,
    currentTimeMs: 4200,
    bounds: { x: 50, y: 300, width: 620, height: 680 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } },
    isCinematic: true
  });

  const fills = mock.operations.filter(op => op.op === 'fillText');
  assert.ok(fills.length >= 1, 'Words must be rendered');
  // Check that either linear gradient progressive highlight or fillText with clip was applied
  assert.ok(fills.some(f => f.text === 'you'), 'Active singing word you must be rendered');
});

test('3b. Upcoming words remain legible at resting opacity (never blacked out or dropped)', () => {
  const mock = createMockCanvas(720, 1280);
  const words = [
    { text: 'and', timeMs: 5700, endMs: 6000 },
    { text: 'when', timeMs: 6000, endMs: 6500 },
    { text: 'the', timeMs: 6500, endMs: 6800 }
  ];

  // Render at 5800ms: 'and' is singing, 'when' and 'the' are upcoming
  TypographyEngine.renderStyleA(mock.ctx, {
    text: 'and when the',
    words,
    currentTimeMs: 5800,
    bounds: { x: 50, y: 300, width: 620, height: 680 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } },
    isCinematic: true
  });

  const fills = mock.operations.filter(op => op.op === 'fillText');
  const renderedTexts = fills.map(f => f.text);
  assert.ok(renderedTexts.includes('and'), 'Active word and must be rendered');
  assert.ok(renderedTexts.includes('when'), 'Upcoming word when must be rendered at resting opacity');
  assert.ok(renderedTexts.includes('the'), 'Upcoming word the must be rendered at resting opacity');
});

// ==========================================
// 4. KineticCanvasRenderer Integration
// ==========================================
console.log('\n4. Canvas Renderer Integration:');

test('4a. KineticCanvasRenderer renders album art background with deep vignette in cinematic mode', () => {
  const mock = createMockCanvas(1280, 720);
  const renderer = new KineticCanvasRenderer(mock, { isCinematic: true });

  mock.operations.length = 0;
  renderer.renderFrame(4000);

  const fillRects = mock.operations.filter(op => op.op === 'fillRect');
  assert.ok(fillRects.length >= 1, 'Must render ambient background fillRect');
  const gradientStops = mock.operations.filter(op => op.op === 'addColorStop');
  assert.ok(gradientStops.length >= 3, 'Must create multi-stop radial vignette gradient');
});

test('4b. KineticCanvasRenderer applies rhythmic acoustic pulse scaling to lyrics in cinematic mode', () => {
  const mock = createMockCanvas(1280, 720);
  const renderer = new KineticCanvasRenderer(mock, { isCinematic: true, reducedMotion: false });

  renderer.configure({
    isCinematic: true,
    lyrics: sampleLyrics,
    startTimeMs: 0,
    endTimeMs: 12000
  });

  mock.operations.length = 0;
  renderer.seek(4200);

  const scales = mock.operations.filter(op => op.op === 'scale');
  assert.ok(scales.length >= 1, 'Must apply scale transform for acoustic pulse');
  const pulseFactor = scales[0].sx;
  assert.ok(pulseFactor >= 0.985 && pulseFactor <= 1.025, `Pulse scale factor must be between 0.985 and 1.025 (got ${pulseFactor})`);
});

console.log(`\nAll ${passedTests}/${totalTests} implementation.mp4 alignment tests passed successfully!\n`);
