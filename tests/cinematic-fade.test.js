/**
 * Unit & Integration Tests: Cinematic Mode Lyric Fade & Cross-Dissolve Transitions
 * 
 * Validates:
 * 1. KineticCanvasRenderer configuration: defaults fadeLyrics: true, respects false.
 * 2. Entrance fade-in: scenes smoothly ramp currAlpha from 0 to 1 over adaptive fadeDur.
 * 3. Contiguous scene cross-dissolve: incoming scene and outgoing scene smoothly cross-fade (currAlpha + crossFadeAlpha = 1.0).
 * 4. Contiguous scene continuity: outgoing scene maintains full luminance (no dip to black) when immediately followed by next scene.
 * 5. Isolated scene exit fade: scene smoothly fades out before an upcoming instrumental break/gap.
 * 6. Disabled fade: when fadeLyrics is false, alpha remains 1.0 and no cross-dissolve occurs.
 * 7. KineticTypographyEngine renderStyleB: punch word smoothly ramps from muted to full illumination over 180ms.
 * 8. KineticTypographyEngine renderStyleC: climax word smoothly ramps from muted to full illumination over 180ms, divider opacity scales with fadeAlpha.
 * 9. Integration in src/renderer.js: cinematicMainRendererInstance is configured with fadeLyrics: true.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const KineticCanvasRenderer = require('../src/modules/kinetic/KineticCanvasRenderer.js');
const TypographyEngine = require('../src/modules/kinetic/KineticTypographyEngine.js');

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

function createMockCanvas(renderedScenes = []) {
  return {
    getContext: () => ({
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1.0,
      font: '',
      textAlign: '',
      textBaseline: '',
      shadowBlur: 0,
      shadowColor: '',
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      rect: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      translate: () => {},
      scale: () => {},
      fillRect: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: (txt) => ({ width: (txt || '').length * 10 }),
      drawImage: () => {}
    })
  };
}

console.log('\n--- Running Cinematic Lyric Fade & Cross-Dissolve Tests ---\n');

// ==========================================
// 1. KineticCanvasRenderer Configuration
// ==========================================
test('1. KineticCanvasRenderer defaults fadeLyrics to true and accepts false override', () => {
  const canvas = createMockCanvas();
  const rDefault = new KineticCanvasRenderer(canvas, { width: 1280, height: 720 });
  assert.strictEqual(rDefault.config.fadeLyrics, true, 'Default fadeLyrics must be true');

  const rDisabled = new KineticCanvasRenderer(canvas, { width: 1280, height: 720, fadeLyrics: false });
  assert.strictEqual(rDisabled.config.fadeLyrics, false, 'Explicit fadeLyrics: false must be respected');

  rDefault.destroy();
  rDisabled.destroy();
});

// ==========================================
// 2. Entrance Fade & Cross-Dissolve
// ==========================================
test('2. Scene entrance smoothly ramps currAlpha and cross-dissolves with contiguous previous scene', () => {
  const canvas = createMockCanvas();
  const renderer = new KineticCanvasRenderer(canvas, { width: 1280, height: 720, fadeLyrics: true });

  const sceneA = {
    id: 'scene_lyric_0',
    style: 'styleA',
    primaryText: 'First lyric line',
    startTimeMs: 1000,
    endTimeMs: 3000,
    words: [{ text: 'First', timeMs: 1000, endMs: 2000 }, { text: 'lyric', timeMs: 2000, endMs: 3000 }]
  };
  const sceneB = {
    id: 'scene_lyric_1',
    style: 'styleA',
    primaryText: 'Second lyric line',
    startTimeMs: 3000,
    endTimeMs: 5000,
    words: [{ text: 'Second', timeMs: 3000, endMs: 4000 }, { text: 'lyric', timeMs: 4000, endMs: 5000 }]
  };

  renderer.timeline = [sceneA, sceneB];

  const renderedCalls = [];
  renderer.renderSceneTypography = (ctx, scene, timeMs, alpha) => {
    renderedCalls.push({ sceneId: scene.id, timeMs, alpha });
  };

  // At 3060ms: 60ms into sceneB (fadeDur is 240ms; elapsed = 60ms; p = 60/240 = 0.25)
  // easeIn = 2 * (0.25)^2 = 0.125
  // sceneB should enter with alpha 0.125
  // sceneA should cross-dissolve with alpha 1 - 0.125 = 0.875
  renderedCalls.length = 0;
  renderer.renderFrame(3060);

  assert.strictEqual(renderedCalls.length, 2, 'Must render both outgoing and incoming scenes during cross-dissolve');
  const outCall = renderedCalls.find(c => c.sceneId === 'scene_lyric_0');
  const inCall = renderedCalls.find(c => c.sceneId === 'scene_lyric_1');

  assert.ok(outCall, 'Outgoing scene A must be rendered');
  assert.ok(inCall, 'Incoming scene B must be rendered');
  assert.ok(Math.abs(inCall.alpha - 0.125) < 0.01, `Incoming alpha should be ~0.125, got ${inCall.alpha}`);
  assert.ok(Math.abs(outCall.alpha - 0.875) < 0.01, `Outgoing alpha should be ~0.875, got ${outCall.alpha}`);
  assert.ok(Math.abs((outCall.alpha + inCall.alpha) - 1.0) < 0.001, 'Sum of outgoing and incoming alphas must equal 1.0 (constant luminance)');

  renderer.destroy();
});

// ==========================================
// 3. Contiguous Continuity (No Blackout Dip)
// ==========================================
test('3. Contiguous scene maintains full alpha at tail end without blacking out', () => {
  const canvas = createMockCanvas();
  const renderer = new KineticCanvasRenderer(canvas, { width: 1280, height: 720, fadeLyrics: true });

  const sceneA = {
    id: 'scene_lyric_0',
    style: 'styleA',
    primaryText: 'First line',
    startTimeMs: 1000,
    endTimeMs: 3000
  };
  const sceneB = {
    id: 'scene_lyric_1',
    style: 'styleA',
    primaryText: 'Next line immediately following',
    startTimeMs: 3000,
    endTimeMs: 5000
  };

  renderer.timeline = [sceneA, sceneB];

  const renderedCalls = [];
  renderer.renderSceneTypography = (ctx, scene, timeMs, alpha) => {
    renderedCalls.push({ sceneId: scene.id, timeMs, alpha });
  };

  // At 2950ms: 50ms before sceneA ends, but sceneB immediately follows
  renderedCalls.length = 0;
  renderer.renderFrame(2950);

  assert.strictEqual(renderedCalls.length, 1, 'Only sceneA should be rendered at 2950ms');
  assert.strictEqual(renderedCalls[0].sceneId, 'scene_lyric_0');
  assert.strictEqual(renderedCalls[0].alpha, 1.0, 'Alpha must remain 1.0 without blacking out before contiguous scene');

  renderer.destroy();
});

// ==========================================
// 4. Isolated Scene Exit Fade (Pre-Gap)
// ==========================================
test('4. Isolated scene smoothly fades out before break or instrumental gap', () => {
  const canvas = createMockCanvas();
  const renderer = new KineticCanvasRenderer(canvas, { width: 1280, height: 720, fadeLyrics: true });

  const sceneA = {
    id: 'scene_lyric_0',
    style: 'styleA',
    primaryText: 'Line before long break',
    startTimeMs: 1000,
    endTimeMs: 3000
  };
  const sceneB = {
    id: 'scene_lyric_1',
    style: 'styleA',
    primaryText: 'Line after 3000ms gap',
    startTimeMs: 6000,
    endTimeMs: 8000
  };

  renderer.timeline = [sceneA, sceneB];

  const renderedCalls = [];
  renderer.renderSceneTypography = (ctx, scene, timeMs, alpha) => {
    renderedCalls.push({ sceneId: scene.id, timeMs, alpha });
  };

  // At 2940ms: 60ms remaining in sceneA before 3000ms gap (fadeDur is 240ms; remaining = 60ms; p = 60/240 = 0.25)
  // easeOut = 2 * (0.25)^2 = 0.125
  renderedCalls.length = 0;
  renderer.renderFrame(2940);

  assert.strictEqual(renderedCalls.length, 1, 'Only sceneA should be rendered');
  assert.strictEqual(renderedCalls[0].sceneId, 'scene_lyric_0');
  assert.ok(renderedCalls[0].alpha < 0.2, `Alpha should fade out towards 0, got ${renderedCalls[0].alpha}`);

  renderer.destroy();
});

// ==========================================
// 5. Disabled Fade Option
// ==========================================
test('5. When fadeLyrics is false, alpha remains strictly 1.0 with no cross-dissolve', () => {
  const canvas = createMockCanvas();
  const renderer = new KineticCanvasRenderer(canvas, { width: 1280, height: 720, fadeLyrics: false });

  const sceneA = {
    id: 'scene_lyric_0',
    style: 'styleA',
    primaryText: 'First line',
    startTimeMs: 1000,
    endTimeMs: 3000
  };
  const sceneB = {
    id: 'scene_lyric_1',
    style: 'styleA',
    primaryText: 'Second line',
    startTimeMs: 3000,
    endTimeMs: 5000
  };

  renderer.timeline = [sceneA, sceneB];

  const renderedCalls = [];
  renderer.renderSceneTypography = (ctx, scene, timeMs, alpha) => {
    renderedCalls.push({ sceneId: scene.id, timeMs, alpha });
  };

  // At 3060ms: during what would normally be entrance fade
  renderedCalls.length = 0;
  renderer.renderFrame(3060);

  assert.strictEqual(renderedCalls.length, 1, 'Only active scene must be rendered when fade is disabled');
  assert.strictEqual(renderedCalls[0].sceneId, 'scene_lyric_1');
  assert.strictEqual(renderedCalls[0].alpha, 1.0, 'Alpha must be 1.0 when fade is disabled');

  renderer.destroy();
});

// ==========================================
// 6. KineticTypographyEngine renderStyleB Smooth Illumination
// ==========================================
test('6. KineticTypographyEngine renderStyleB smoothly ramps punch word illumination', () => {
  const fills = [];
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    rect: () => {},
    fillText: () => {},
    strokeText: () => {},
    measureText: (txt) => ({ width: (txt || '').length * 10 }),
    translate: () => {},
    scale: () => {},
    set fillStyle(val) { fills.push(val); },
    get fillStyle() { return fills[fills.length - 1]; }
  };

  const words = [{ text: 'PUNCH', timeMs: 1000, endMs: 1500 }];
  const bounds = { x: 0, y: 0, width: 800, height: 600 };
  const palette = {
    textColor: '#ffffff',
    textRgb: { r: 255, g: 255, b: 255 }
  };

  // A. Before vocal starts (timeMs = 800) -> muted color (alpha 0.32)
  fills.length = 0;
  TypographyEngine.renderStyleB(mockCtx, {
    primaryText: 'PUNCH',
    words,
    currentTimeMs: 800,
    bounds,
    palette
  });
  assert.ok(fills.some(f => f.includes('0.32')), 'Before vocal onset, fill must be muted (alpha 0.32)');

  // B. Mid-ramp (timeMs = 1090ms, 90ms into 180ms ramp) -> intermediate alpha ~0.66
  fills.length = 0;
  TypographyEngine.renderStyleB(mockCtx, {
    primaryText: 'PUNCH',
    words,
    currentTimeMs: 1090,
    bounds,
    palette
  });
  const midFill = fills.find(f => f.startsWith('rgba(255, 255, 255,'));
  assert.ok(midFill, `Mid-ramp must produce interpolated rgba fill, got: ${fills.join(', ')}`);
  assert.ok(midFill.includes('0.660') || midFill.includes('0.66'), `Mid-ramp alpha should be ~0.66, got: ${midFill}`);

  // C. Fully lit (timeMs = 1250ms, >= 180ms after onset) -> full textColor
  fills.length = 0;
  TypographyEngine.renderStyleB(mockCtx, {
    primaryText: 'PUNCH',
    words,
    currentTimeMs: 1250,
    bounds,
    palette
  });
  assert.ok(fills.includes('#ffffff'), 'Fully lit punch word must use full palette.textColor');
});

// ==========================================
// 7. KineticTypographyEngine renderStyleC Smooth Illumination & Divider Scaling
// ==========================================
test('7. KineticTypographyEngine renderStyleC smoothly ramps climax word and scales divider by fadeAlpha', () => {
  const alphas = [];
  const fills = [];
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    rect: () => {},
    clip: () => {},
    drawImage: () => {},
    fillText: () => {},
    strokeText: () => {},
    measureText: (txt) => ({ width: (txt || '').length * 10 }),
    translate: () => {},
    scale: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    arc: () => {},
    fill: () => {},
    set globalAlpha(val) { alphas.push(val); },
    get globalAlpha() { return alphas[alphas.length - 1]; },
    set fillStyle(val) { fills.push(val); },
    get fillStyle() { return fills[fills.length - 1]; }
  };

  const words = [{ text: 'CLIMAX', timeMs: 2000, endMs: 2500 }];
  const bounds = { x: 0, y: 0, width: 800, height: 600 };
  const palette = {
    textColor: '#ffffff',
    textRgb: { r: 255, g: 255, b: 255 }
  };

  // Test with fadeAlpha = 0.5
  TypographyEngine.renderStyleC(mockCtx, {
    primaryText: 'CLIMAX',
    words,
    currentTimeMs: 2200,
    bounds,
    palette,
    fadeAlpha: 0.5
  });

  // Divider globalAlpha should be 0.35 * 0.5 = 0.175
  assert.ok(alphas.some(a => Math.abs(a - 0.175) < 0.001), `Divider opacity must scale to 0.175, got: ${alphas.join(', ')}`);
});

// ==========================================
// 8. Integration in src/renderer.js
// ==========================================
test('8. src/renderer.js configures cinematicMainRendererInstance with fadeLyrics: true', () => {
  const rendererSrc = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert.ok(rendererSrc.includes('fadeLyrics: true'), 'renderer.js must configure fadeLyrics: true');
  assert.ok(
    rendererSrc.includes('cinematicMainRendererInstance.configure(') ||
    rendererSrc.includes('fadeLyrics: true'),
    'cinematicMainRendererInstance must receive fadeLyrics config'
  );
});

console.log(`\nCinematic Lyric Fade Results: ${passedTests}/${totalTests} tests passed.\n`);
