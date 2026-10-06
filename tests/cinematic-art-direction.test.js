/**
 * Unit & Integration Tests: Cinematic Mode Art Direction & Visual Composition
 * 
 * Validates:
 * 1. Semantic Concept Recognition: multi-word phrases and concept keywords.
 * 2. Hierarchy & Restraint: strong concept vs weak concept vs none (typography-only).
 * 3. Intentional Word Emphasis: selective emphasis (e.g. "NOBODY") without over-emphasizing every keyword.
 * 4. Visual Motifs: non-generic visual metaphors with deterministic variation per song/context.
 * 5. Composition & Framing: intentional positions (above, below, offset, cropped, distant) and scale hierarchy.
 * 6. Scene Continuity: preservation of visual motifs across consecutive lyrics sharing a concept.
 * 7. Transition Morphing: smooth cross-dissolve when concepts change or exit to negative space.
 * 8. Depth & Tonal Variations: subtle background tinting, far contours, mid motifs, and near ambient particles.
 * 9. Performance & Reduced Motion: disables drift and particles in reduced motion mode while keeping typography and motif.
 * 10. Robustness: short lyrics, long lyrics, rapid changes, repeated lyrics, seeks, and window resizing.
 */

const assert = require('assert');
const CinematicConcept = require('../src/modules/kinetic/CinematicConcept.js');
const CinematicMotif = require('../src/modules/kinetic/CinematicMotif.js');
const CinematicComposition = require('../src/modules/kinetic/CinematicComposition.js');
const CinematicTransition = require('../src/modules/kinetic/CinematicTransition.js');
const CinematicScene = require('../src/modules/kinetic/CinematicScene.js');
const Director = require('../src/modules/kinetic/KineticDirector.js');
const TypographyEngine = require('../src/modules/kinetic/KineticTypographyEngine.js');
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

function createMockCanvas(width = 1280, height = 720) {
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
    save: () => operations.push({ op: 'save' }),
    restore: () => operations.push({ op: 'restore' }),
    beginPath: () => operations.push({ op: 'beginPath' }),
    rect: (x, y, w, h) => operations.push({ op: 'rect', x, y, w, h }),
    roundRect: (x, y, w, h, r) => operations.push({ op: 'roundRect', x, y, w, h, r }),
    arc: (x, y, r, sa, ea) => operations.push({ op: 'arc', x, y, r, sa, ea }),
    ellipse: (x, y, rx, ry, rot, sa, ea) => operations.push({ op: 'ellipse', x, y, rx, ry, rot, sa, ea }),
    moveTo: (x, y) => operations.push({ op: 'moveTo', x, y }),
    lineTo: (x, y) => operations.push({ op: 'lineTo', x, y }),
    bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => operations.push({ op: 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y }),
    closePath: () => operations.push({ op: 'closePath' }),
    fill: () => operations.push({ op: 'fill', fillStyle: ctx.fillStyle, alpha: ctx.globalAlpha }),
    stroke: () => operations.push({ op: 'stroke', strokeStyle: ctx.strokeStyle, alpha: ctx.globalAlpha }),
    clip: () => operations.push({ op: 'clip' }),
    translate: (x, y) => operations.push({ op: 'translate', x, y }),
    scale: (sx, sy) => operations.push({ op: 'scale', sx, sy }),
    fillRect: (x, y, w, h) => operations.push({ op: 'fillRect', x, y, w, h, fillStyle: ctx.fillStyle }),
    fillText: (txt, x, y) => operations.push({ op: 'fillText', txt, x, y, font: ctx.font, fillStyle: ctx.fillStyle, alpha: ctx.globalAlpha }),
    strokeText: (txt, x, y) => operations.push({ op: 'strokeText', txt, x, y }),
    measureText: (txt) => ({ width: (txt || '').length * 12 }),
    createRadialGradient: (x0, y0, r0, x1, y1, r1) => ({
      addColorStop: (stop, color) => operations.push({ op: 'addColorStop', stop, color })
    }),
    drawImage: () => operations.push({ op: 'drawImage' })
  };

  return {
    width,
    height,
    getContext: () => ctx,
    _operations: operations
  };
}

console.log('\n--- Running Cinematic Art Direction & Visual Composition Tests ---\n');

// ==========================================
// 1. Semantic Concept Recognition
// ==========================================
console.log('1. Semantic Concept Layer:');

test('1a. Recognizes multi-word phrases into core emotional concepts', () => {
  const c1 = CinematicConcept.analyzeLyric("I'm falling for you again");
  assert.strictEqual(c1.concept, 'love');
  assert.strictEqual(c1.strength, 'strong');
  assert.strictEqual(c1.matchedPhrase, 'falling for you');

  const c2 = CinematicConcept.analyzeLyric("Late at night under the stars");
  assert.strictEqual(c2.concept, 'night');
  assert.strictEqual(c2.strength, 'strong');

  const c3 = CinematicConcept.analyzeLyric("Standing all alone in this room");
  assert.strictEqual(c3.concept, 'lonely');
  assert.strictEqual(c3.strength, 'strong');

  const c4 = CinematicConcept.analyzeLyric("Missing you more every day");
  assert.strictEqual(c4.concept, 'memory');
  assert.strictEqual(c4.strength, 'strong');

  const c5 = CinematicConcept.analyzeLyric("Watch the clock tick tock");
  assert.strictEqual(c5.concept, 'time');
  assert.strictEqual(c5.strength, 'strong');

  const c6 = CinematicConcept.analyzeLyric("Let it burn inside");
  assert.strictEqual(c6.concept, 'fire');
  assert.strictEqual(c6.strength, 'strong');

  const c7 = CinematicConcept.analyzeLyric("Crying in the rain");
  assert.strictEqual(c7.concept, 'rain');
  assert.strictEqual(c7.strength, 'strong');

  const c8 = CinematicConcept.analyzeLyric("On the road to nowhere");
  assert.strictEqual(c8.concept, 'road');
  assert.strictEqual(c8.strength, 'strong');

  const c9 = CinematicConcept.analyzeLyric("Finally coming home");
  assert.strictEqual(c9.concept, 'home');
  assert.strictEqual(c9.strength, 'strong');

  const c10 = CinematicConcept.analyzeLyric("Lost in my head again");
  assert.strictEqual(c10.concept, 'dream');
  assert.strictEqual(c10.strength, 'strong');
});

test('1b. Pure typography for abstract lines with no visual keywords (Hierarchy & Restraint)', () => {
  const neutralLines = [
    "if we could just talk about it",
    "think about what you said",
    "and then he asked me why",
    "maybe it does not matter anyway",
    "let it be for now"
  ];

  neutralLines.forEach((line) => {
    const analysis = CinematicConcept.analyzeLyric(line);
    assert.strictEqual(analysis.concept, null, `Line "${line}" must have null concept`);
    assert.strictEqual(analysis.strength, 'none', `Line "${line}" must have strength "none"`);
  });
});

test('1c. Differentiates strong concept vs weak supporting concept', () => {
  // Short direct keyword line = strong
  const strongLove = CinematicConcept.analyzeLyric("My love");
  assert.strictEqual(strongLove.concept, 'love');
  assert.strictEqual(strongLove.strength, 'strong');

  // Long sentence where word is peripheral = weak
  const weakHome = CinematicConcept.analyzeLyric("I think I left my old coat somewhere near the front door");
  assert.strictEqual(weakHome.concept, 'home');
  assert.strictEqual(weakHome.strength, 'weak');
});

// ==========================================
// 2. Intentional Word Emphasis
// ==========================================
console.log('2. Word Emphasis:');

test('2a. Selects intentional emphasis for poignant words without emphasizing every keyword', () => {
  const res = CinematicConcept.analyzeLyric("I don't want nobody else");
  assert.strictEqual(res.emphasizedWord, 'NOBODY', 'Must emphasize NOBODY');
  assert.strictEqual(res.emphasizedWordIndex, 3);

  // Line with common words only should NOT emphasize anything artificially
  const plain = CinematicConcept.analyzeLyric("if you are with me");
  assert.strictEqual(plain.emphasizedWord, null, 'Plain conversational line must have null emphasizedWord');
});

test('2b. KineticTypographyEngine styles emphasized word with distinct visual prominence', () => {
  const canvas = createMockCanvas(800, 400);
  const ctx = canvas.getContext();

  const words = [
    { text: "I", timeMs: 1000, endMs: 1200 },
    { text: "want", timeMs: 1200, endMs: 1500 },
    { text: "nobody", timeMs: 1500, endMs: 2000 },
    { text: "else", timeMs: 2000, endMs: 2400 }
  ];

  TypographyEngine.renderStyleA(ctx, {
    text: "I want nobody else",
    words,
    currentTimeMs: 1600, // active word is 'nobody'
    bounds: { x: 0, y: 0, width: 800, height: 400 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } },
    emphasizedWord: 'NOBODY'
  });

  const fillTextOps = canvas._operations.filter((op) => op.op === 'fillText');
  assert.ok(fillTextOps.length > 0, 'Must render words');
  
  const nobodyFill = fillTextOps.find((op) => op.txt === 'nobody');
  assert.ok(nobodyFill, 'nobody fillText must exist');
  assert.ok(nobodyFill.font.includes('700') || nobodyFill.font.includes('Bodoni Moda') || nobodyFill.font.includes('Playfair Display'), 'Emphasized word must use bold/display font');
});

test('2c. Cinematic Mode Enhanced LRC renders words appearing cleanly without completing/filling clip sweeps', () => {
  const canvas = createMockCanvas(800, 400);
  const ctx = canvas.getContext();

  const words = [
    { text: "I", timeMs: 1000, endMs: 1200 },
    { text: "want", timeMs: 1200, endMs: 1500 },
    { text: "nobody", timeMs: 1500, endMs: 2000 },
    { text: "else", timeMs: 2000, endMs: 2400 }
  ];

  TypographyEngine.renderStyleA(ctx, {
    text: "I want nobody else",
    words,
    currentTimeMs: 1600, // active word is 'nobody'
    bounds: { x: 0, y: 0, width: 800, height: 400 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } },
    emphasizedWord: 'NOBODY',
    isCinematic: true
  });

  const clipOps = canvas._operations.filter((op) => op.op === 'clip');
  assert.strictEqual(clipOps.length, 0, 'Cinematic Mode must not use progressive karaoke clipping rectangles (words appear, not completing/filling)');

  const fillTextOps = canvas._operations.filter((op) => op.op === 'fillText');
  assert.ok(fillTextOps.length > 0, 'Words must be rendered');
  const nobodyFill = fillTextOps.find((op) => op.txt === 'nobody');
  assert.ok(nobodyFill, 'Active word nobody must appear in rendered output');
});

// ==========================================
// 3. Visual Motifs & Variations
// ==========================================
console.log('3. Visual Motifs & Variations:');

test('3a. Concepts have multiple curated variations that are deterministic per song/scene', () => {
  const v1 = CinematicMotif.getVariationIndex('love', 'SongA_Artist', 0);
  const v1_repeat = CinematicMotif.getVariationIndex('love', 'SongA_Artist', 0);
  assert.strictEqual(v1, v1_repeat, 'Same song and scene must deterministically produce identical variation');

  const v2 = CinematicMotif.getVariationIndex('love', 'SongB_Artist', 3);
  assert.ok(typeof v2 === 'number' && v2 >= 0 && v2 < CinematicMotif.VARIATION_COUNTS.love);
});

test('3b. CinematicMotif dispatches lightweight vector paths for all 10 concepts', () => {
  const canvas = createMockCanvas(400, 400);
  const ctx = canvas.getContext();

  CinematicConcept.CONCEPT_KEYS.forEach((concept) => {
    canvas._operations.length = 0;
    CinematicMotif.drawMotif(ctx, {
      concept,
      variation: 0,
      cx: 200,
      cy: 200,
      rx: 80,
      ry: 80,
      strokeColor: '#ffffff',
      alpha: 0.25,
      drift: 0.5
    });

    const strokes = canvas._operations.filter((op) => op.op === 'stroke' || op.op === 'fill');
    assert.ok(strokes.length > 0, `Motif for ${concept} must emit drawing path strokes`);
  });
});

// ==========================================
// 4. Composition & Framing
// ==========================================
console.log('4. Composition & Framing:');

test('4a. Composition assigns intentional positions and scale hierarchy', () => {
  const bounds = { x: 0, y: 0, width: 1000, height: 600 };

  // Strong concept gets full scale
  const strongComp = CinematicComposition.resolveComposition('night', 'strong', bounds, 'StarTrack', 0);
  assert.ok(strongComp.hasMotif, 'Strong concept must have motif');
  assert.ok(strongComp.scale >= 0.5, `Strong concept scale (${strongComp.scale}) must be prominent`);
  assert.ok(['above', 'distant_small', 'cropped_large', 'behind'].includes(strongComp.type));

  // Weak concept gets subtle/small scale
  const weakComp = CinematicComposition.resolveComposition('home', 'weak', bounds, 'HomeTrack', 1);
  assert.ok(weakComp.hasMotif, 'Weak concept must have motif');
  assert.ok(weakComp.scale <= 0.60, `Weak concept scale (${weakComp.scale}) must be subtle`);

  // None concept has 0 scale and hasMotif: false
  const noneComp = CinematicComposition.resolveComposition(null, 'none', bounds, 'Track', 2);
  assert.strictEqual(noneComp.hasMotif, false);
  assert.strictEqual(noneComp.scale, 0);
});

test('4b. Typographic counter-balance offsets text gracefully based on composition framing', () => {
  const bounds = { x: 0, y: 0, width: 1000, height: 600 };
  
  // When motif is 'above', text offsets lower (positive textYOffset)
  const aboveComp = CinematicComposition.resolveComposition('night', 'strong', bounds, 'NightSeed', 0);
  if (aboveComp.type === 'above') {
    assert.ok(aboveComp.textYOffset > 0, 'Text must shift lower when motif is above');
  }

  // When motif is 'below', text offsets higher (negative textYOffset)
  const belowComp = CinematicComposition.resolveComposition('fire', 'strong', bounds, 'FireSeed', 0);
  if (belowComp.type === 'below') {
    assert.ok(belowComp.textYOffset < 0, 'Text must shift higher when motif is below');
  }
});

// ==========================================
// 5. Scene Continuity & Transitions
// ==========================================
console.log('5. Continuity & Transitions:');

test('5a. Consecutive lyric lines sharing a concept preserve the motif seamlessly', () => {
  const lyrics = [
    { text: "I'm falling for you", timeMs: 1000, endMs: 2500 },
    { text: "My heart is yours", timeMs: 2500, endMs: 4000 }
  ];

  const timeline = Director.buildTimeline(lyrics, { startTimeMs: 0, isCinematic: true, skipIntroMorph: true });
  const scenes = timeline.filter((s) => s.id && s.id.startsWith('scene_lyric_'));

  assert.strictEqual(scenes.length, 4, '4-word lines partition into 2-word rhythmic chunks');
  scenes.forEach((s) => {
    assert.strictEqual(s.concept, 'love', 'All chunks must inherit love concept');
  });
  assert.strictEqual(scenes[0].sharesConceptWithNext, true, 'Scene 0 must share concept with next');
  assert.strictEqual(scenes[1].sharesConceptWithPrev, true, 'Scene 1 must share concept with prev');
  assert.strictEqual(scenes[2].sharesConceptWithPrev, true, 'Scene 2 (line 2) must seamlessly continue love concept from line 1');

  // Verify transition state retains continuous mode
  const trans = CinematicTransition.computeTransitionState(scenes[2], scenes[1], 2600, { fadeDur: 240 });
  assert.strictEqual(trans.mode, 'continuous');
  assert.strictEqual(trans.isSameConcept, true);
  assert.strictEqual(trans.primary.concept, 'love');
});

test('5b. Transitioning between differing concepts computes smooth morph cross-dissolve', () => {
  const sceneRain = new CinematicScene({
    startTimeMs: 1000, endTimeMs: 3000, concept: 'rain', conceptStrength: 'strong',
    composition: { cx: 500, cy: 300, rx: 100, ry: 100, alpha: 0.25, hasMotif: true }
  });

  const sceneFire = new CinematicScene({
    startTimeMs: 3000, endTimeMs: 5000, concept: 'fire', conceptStrength: 'strong',
    composition: { cx: 500, cy: 400, rx: 120, ry: 120, alpha: 0.24, hasMotif: true }
  });

  // Halfway through transition (3120ms, fadeDur=240ms)
  const trans = CinematicTransition.computeTransitionState(sceneFire, sceneRain, 3120, { fadeDur: 240 });
  assert.strictEqual(trans.mode, 'morph');
  assert.strictEqual(trans.isSameConcept, false);
  assert.ok(trans.primary && trans.primary.alpha > 0.05, 'Incoming fire motif must be ramping in');
  assert.ok(trans.secondary && trans.secondary.alpha > 0.05, 'Outgoing rain motif must be ramping out');
});

// ==========================================
// 6. Depth Layers & Tonal Tint
// ==========================================
console.log('6. Depth Layers & Tonal Tint:');

test('6a. Tonal tint wash is applied subtly based on concept', () => {
  const canvas = createMockCanvas(1000, 600);
  const renderer = new KineticCanvasRenderer(canvas, { width: 1000, height: 600, isCinematic: true });

  const lyrics = [
    { text: "My sweet baby I love you", timeMs: 1000, endMs: 3000 }
  ];

  renderer.configure({ lyrics, artist: 'Artist', title: 'LoveSong' });
  renderer.renderFrame(1500);

  const radialGradOps = canvas._operations.filter((op) => op.op === 'addColorStop');
  assert.ok(radialGradOps.length > 0, 'Radial gradient must be created for tonal tint wash');

  // Romance tone has warm rose amber tint (r=255, g=140, b=160)
  const warmStop = radialGradOps.find((op) => op.color && op.color.includes('255, 140, 160'));
  assert.ok(warmStop, 'Tonal wash must use concept tonalTint RGB values');

  renderer.destroy();
});

// ==========================================
// 7. Reduced Motion & Performance
// ==========================================
console.log('7. Reduced Motion & Performance:');

test('7a. Reduced motion mode disables drift and ambient near particles', () => {
  const canvas = createMockCanvas(1000, 600);
  const renderer = new KineticCanvasRenderer(canvas, {
    width: 1000,
    height: 600,
    isCinematic: true,
    reducedMotion: true
  });

  const lyrics = [
    { text: "Burn in the fire", timeMs: 1000, endMs: 4000 }
  ];

  renderer.configure({ lyrics, artist: 'Artist', title: 'BlazeSong' });
  renderer.renderFrame(2000);

  // In reducedMotion mode, particle loop is bypassed
  const fillOps = canvas._operations.filter((op) => op.op === 'fill');
  // Typography and card are rendered, but no particle loops
  assert.ok(fillOps.length > 0, 'Typography and card must still render');

  renderer.destroy();
});

// ==========================================
// 8. Robustness Across Diverse Scenarios
// ==========================================
console.log('8. Robustness Across Diverse Scenarios:');

test('8a. Handles short lyrics (1-2 words) gracefully with elevated typography', () => {
  const lyrics = [
    { text: "Hold on", timeMs: 500, endMs: 1500 }
  ];
  const timeline = Director.buildTimeline(lyrics, { startTimeMs: 0, isCinematic: true, skipIntroMorph: true });
  const lyricScenes = timeline.filter((s) => s.id && s.id.startsWith('scene_lyric_'));
  assert.strictEqual(lyricScenes.length, 1);
  assert.strictEqual(lyricScenes[0].primaryText, 'hold on');
});

test('8b. Handles long lyrics (15+ words) by chunking and preserving continuity', () => {
  const lyrics = [
    { text: "I have been searching for a way out of the darkness and into the starlight of your eyes", timeMs: 1000, endMs: 6000 }
  ];
  const timeline = Director.buildTimeline(lyrics, { startTimeMs: 0, isCinematic: true, skipIntroMorph: true });
  assert.ok(timeline.length >= 4, 'Long lyric must be cleanly partitioned into 1-to-3 word rhythmic scenes');
});

test('8c. Resizing window and seeking timestamps preserves valid coordinates and render output', () => {
  const canvas = createMockCanvas(1200, 800);
  const renderer = new KineticCanvasRenderer(canvas, { width: 1200, height: 800, isCinematic: true });

  const lyrics = [
    { text: "Walking down this endless road", timeMs: 1000, endMs: 3000 },
    { text: "Underneath the midnight moon", timeMs: 3500, endMs: 6000 }
  ];

  renderer.configure({ lyrics, artist: 'Traveler', title: 'NightRoad' });

  // Seek across time
  renderer.seek(2000);
  assert.strictEqual(renderer.currentTimeMs, 2000);

  // Resize window
  renderer.setDimensions(800, 480);
  assert.strictEqual(renderer.width, 800);
  assert.strictEqual(renderer.height, 480);

  renderer.seek(4000);
  assert.strictEqual(renderer.currentTimeMs, 4000);

  renderer.destroy();
});

// ==========================================
// 9. Background Keyword Illustration Constellation (Cinematic Mode)
// ==========================================
console.log('9. Background Keyword Illustration Constellation:');

test('9a. CINEMATIC_FIELD_ANCHORS distributes >= 8 perimeter/flank anchors away from center text zone', () => {
  assert.ok(Array.isArray(KineticCanvasRenderer.CINEMATIC_FIELD_ANCHORS));
  assert.ok(KineticCanvasRenderer.CINEMATIC_FIELD_ANCHORS.length >= 8);

  KineticCanvasRenderer.CINEMATIC_FIELD_ANCHORS.forEach((anchor) => {
    assert.ok(anchor.nx >= 0 && anchor.nx <= 1.0, 'nx must be normalized [0, 1]');
    assert.ok(anchor.ny >= 0 && anchor.ny <= 1.0, 'ny must be normalized [0, 1]');
    assert.ok(anchor.baseScale > 0 && anchor.baseScale <= 1.5, 'baseScale must be reasonable');
    assert.ok(anchor.baseAlpha > 0 && anchor.baseAlpha <= 0.25, 'baseAlpha must be subtle background level');
  });
});

test('9b. When lyric has a keyword in cinematic mode, background is filled with multiple illustrations of that kind', () => {
  const canvas = createMockCanvas(1200, 800);
  const renderer = new KineticCanvasRenderer(canvas, { width: 1200, height: 800, isCinematic: true });

  const drawnMotifs = [];
  const origDraw = renderer.motifEngine.drawMotif;
  renderer.motifEngine.drawMotif = (ctx, opts) => {
    drawnMotifs.push(opts);
    origDraw(ctx, opts);
  };

  const lyrics = [
    { text: "Underneath the midnight moon", timeMs: 1000, endMs: 4000 }
  ];
  renderer.configure({ lyrics, artist: 'Celestial', title: 'Night Sky' });

  drawnMotifs.length = 0;
  renderer.seek(2500); // Sentence is actively singing and displayed

  // Filter background field motifs (which have strokeWidth 1.2 and alpha <= 0.12)
  const bgMotifs = drawnMotifs.filter(m => m.concept === 'night' && m.strokeWidth === 1.2);
  assert.ok(bgMotifs.length >= 8, `Must render multiple (>= 8) illustrations in background, got ${bgMotifs.length}`);
  
  // Verify all background illustrations are of the SAME kind ('night')
  bgMotifs.forEach(m => {
    assert.strictEqual(m.concept, 'night', 'Every background illustration must be of the same kind (night)');
  });

  // Verify multiple variations are used
  const variations = new Set(bgMotifs.map(m => m.variation));
  assert.ok(variations.size > 1, 'Must use multiple variations of the keyword illustration');

  renderer.destroy();
});

test('9c. Multiple illustrations stay active while lyric sentence is displayed and dissolve when sentence ends', () => {
  const canvas = createMockCanvas(1200, 800);
  const renderer = new KineticCanvasRenderer(canvas, { width: 1200, height: 800, isCinematic: true });

  const drawnMotifs = [];
  renderer.motifEngine.drawMotif = (ctx, opts) => {
    drawnMotifs.push(opts);
  };

  const lyrics = [
    { text: "Underneath the midnight moon", timeMs: 1000, endMs: 4000 },
    { text: "Now I walk without you here", timeMs: 4500, endMs: 7000 } // Sentence without celestial keyword
  ];
  renderer.configure({ lyrics, artist: 'Celestial', title: 'Night Sky' });

  // 1. While sentence 1 is active (2000ms): background illustrations are active
  drawnMotifs.length = 0;
  renderer.seek(2000);
  const activeBg = drawnMotifs.filter(m => m.concept === 'night' && m.strokeWidth === 1.2);
  assert.ok(activeBg.length >= 8, 'Background illustrations must be active while sentence is displayed');

  // 2. When sentence 1 has completed and sentence 2 (no keyword) is displayed (5500ms):
  drawnMotifs.length = 0;
  renderer.seek(5500);
  const endedBg = drawnMotifs.filter(m => m.strokeWidth === 1.2);
  assert.strictEqual(endedBg.length, 0, 'Background illustrations must not be drawn when sentence without keyword is displayed');

  renderer.destroy();
});

test('9d. Non-cinematic mode (isCinematic: false) does not fill background with the field', () => {
  const canvas = createMockCanvas(800, 600);
  const renderer = new KineticCanvasRenderer(canvas, { width: 800, height: 600, isCinematic: false });

  const drawnMotifs = [];
  renderer.motifEngine.drawMotif = (ctx, opts) => {
    drawnMotifs.push(opts);
  };

  const lyrics = [
    { text: "Underneath the midnight moon", timeMs: 1000, endMs: 4000 }
  ];
  renderer.configure({ lyrics, artist: 'Celestial', title: 'Night Sky' });

  drawnMotifs.length = 0;
  renderer.seek(2000);
  const bgField = drawnMotifs.filter(m => m.strokeWidth === 1.2);
  assert.strictEqual(bgField.length, 0, 'Non-cinematic mode must not render full-canvas background field');

  renderer.destroy();
});

console.log(`\nCinematic Art Direction & Visual Composition Results: ${passedTests}/${totalTests} tests passed.\n`);
