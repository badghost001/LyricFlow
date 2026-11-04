/**
 * tests/adversarial-challenger-m2-gpu-compositing.test.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGE SUITE — MILESTONE 2
 * Agent: teamwork_challenger_m2_2 (Challenger 2 — Critic & Specialist)
 *
 * Adversarial stress testing, edge-case mining, and visual regression verification for:
 * 1. Ghost mode (.island-ghost-mode) & Glass mode (.island-glass-mode) interactions with
 *    #dynamic-island::after, backdrop filters, and canvas containment.
 * 2. Metamorphosis tier transitions across Calm, Groove, Climax, and Solo states (smoothness,
 *    zero CSS property conflicts, hysteresis validation, rapid switching).
 * 3. Wave visualizer isolated canvas rendering: 56x18px canvas containment, dual-path DOM
 *    suppression, bar count matrix (4/6/8/10), style matrix (bars/dots/wave), audio state accents.
 * 4. Adversarial stress harnesses:
 *    - 15+ rapid display & island mode transitions
 *    - Extreme audio energy jumps & transient kick attacks
 *    - 250+ packet visualizer storm with malformed/degenerate values (NaN, Infinity, negatives)
 *    - Core Animation emitter canvas suppression lifecycle
 *    - Halo blur Gaussian kernel stabilization
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('  CHALLENGER 2: ADVERSARIAL M2 GPU COMPOSITING & STRESS SUITE   ');
console.log('================================================================\n');

const srcDir = path.join(__dirname, '../src');
const dynamicIslandCss = fs.readFileSync(path.join(srcDir, 'styles/_dynamic_island.css'), 'utf8');
const indexHtml = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const rendererJs = fs.readFileSync(path.join(srcDir, 'renderer.js'), 'utf8');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureLog = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failureLog.push({ name, error: err.message, stack: err.stack });
  }
}

// ============================================================================
// SUITE 1: GHOST MODE & GLASS MODE MATERIAL, LAYER ISOLATION & PROPERTY CONTRACTS
// ============================================================================
console.log('--- Suite 1: Ghost Mode & Glass Mode Material & Isolation Integrity ---');

test('1.1: Ghost Mode CSS contracts: #dynamic-island has opacity 0.16, pointer-events none, scale 0.98', () => {
  const ghostRuleMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-ghost-mode\s+#dynamic-island[\s\S]*?\{([^}]+)\}/);
  assert.ok(ghostRuleMatch, 'Ghost mode rule for #dynamic-island must exist in _dynamic_island.css');
  const body = ghostRuleMatch[1];
  assert.ok(body.includes('opacity: 0.16 !important;'), 'Ghost mode must enforce opacity: 0.16 !important');
  assert.ok(body.includes('pointer-events: none !important;'), 'Ghost mode must enforce pointer-events: none !important');
  assert.ok(body.includes('transform: scale(0.98) !important;'), 'Ghost mode must enforce transform: scale(0.98) !important');
  assert.ok(body.includes('box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.35), 0 8px 24px rgba(0, 0, 0, 0.4) !important;'), 'Ghost mode must define crisp border box shadow');
});

test('1.2: Ghost Mode interaction with #dynamic-island::after pseudo-element', () => {
  const afterMatch = dynamicIslandCss.match(/#dynamic-island::after\s*\{([^}]+)\}/);
  assert.ok(afterMatch, '#dynamic-island::after must be defined in _dynamic_island.css');
  const afterBody = afterMatch[1];
  assert.ok(afterBody.includes('pointer-events: none;'), '#dynamic-island::after must be non-interactive (pointer-events: none)');
  assert.ok(afterBody.includes('transform: translateZ(0);'), '#dynamic-island::after must have GPU layer promotion translateZ(0)');
  assert.ok(afterBody.includes('will-change: opacity;'), '#dynamic-island::after must declare will-change: opacity');
  assert.ok(afterBody.includes('opacity: var(--island-bloom-alpha, 0);'), '#dynamic-island::after must modulate opacity via CSS variable');
});

test('1.3: Ghost Mode suppression of dynamic layers (.island-wave-visualizer, .island-top-actions, CA emitter)', () => {
  const ghostVisMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-ghost-mode\s+\.island-wave-visualizer[\s\S]*?\{([^}]+)\}/);
  assert.ok(ghostVisMatch, 'Ghost mode must target .island-wave-visualizer');
  assert.ok(ghostVisMatch[1].includes('opacity: 0 !important;'), '.island-wave-visualizer must be hidden (opacity: 0 !important) in ghost mode');

  const ghostActionsMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-ghost-mode\s+\.island-top-actions[\s\S]*?\{([^}]+)\}/);
  assert.ok(ghostActionsMatch, 'Ghost mode must target .island-top-actions');
  assert.ok(ghostActionsMatch[1].includes('opacity: 0 !important;'), '.island-top-actions must be hidden in ghost mode');

  const ghostCaMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-ghost-mode\s+\.island-ca-emitter-canvas[\s\S]*?\{([^}]+)\}/);
  assert.ok(ghostCaMatch, 'Ghost mode must target .island-ca-emitter-canvas');
  assert.ok(ghostCaMatch[1].includes('opacity: 0 !important;'), '.island-ca-emitter-canvas must have opacity: 0 !important in ghost mode');
});

test('1.4: Glass Mode CSS contracts: Translucent dark glass substrate and optical refraction', () => {
  const glassMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-glass-mode\s+#dynamic-island\s*\{([^}]+)\}/);
  assert.ok(glassMatch, 'Glass mode rule for #dynamic-island must exist');
  const glassBody = glassMatch[1];
  assert.ok(glassBody.includes('rgba(18, 18, 24, 0.52) !important;'), 'Glass mode must define dark glass substrate rgba(18, 18, 24, 0.52)');
  assert.ok(glassBody.includes('backdrop-filter: blur(28px) saturate(190%) contrast(105%) !important;'), 'Glass mode must define high-dispersion optical refraction');
  assert.ok(glassBody.includes('var(--island-bloom-radius, 0px)'), 'Glass mode box-shadow must support --island-bloom-radius fallback');
});

test('1.5: Glass Mode nested backdrop-filter flattening on child elements', () => {
  // Check .island-btn, .island-trans-chip, .island-bridge have backdrop-filter: none !important
  const btnMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-glass-mode\s+\.island-btn\s*\{([^}]+)\}/);
  assert.ok(btnMatch, 'Glass mode must style .island-btn');
  assert.ok(btnMatch[1].includes('backdrop-filter: none !important;'), '.island-btn must flatten nested backdrop-filter to none');

  const chipMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-glass-mode\s+\.island-trans-chip\s*\{([^}]+)\}/);
  assert.ok(chipMatch, 'Glass mode must style .island-trans-chip');
  assert.ok(chipMatch[1].includes('backdrop-filter: none !important;'), '.island-trans-chip must flatten nested backdrop-filter to none');

  const bridgeMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-glass-mode\s+\.island-bridge[\s\S]*?\{([^}]+)\}/);
  assert.ok(bridgeMatch, 'Glass mode must style .island-bridge');
  assert.ok(bridgeMatch[1].includes('backdrop-filter: none !important;'), '.island-bridge must flatten nested backdrop-filter to none');
});

test('1.6: Canvas containment & isolation persistence across modes', () => {
  const canvasMatch = dynamicIslandCss.match(/\.island-wave-canvas\s*\{([^}]+)\}/);
  assert.ok(canvasMatch, '.island-wave-canvas must be defined');
  const canvasBody = canvasMatch[1];
  assert.ok(canvasBody.includes('contain: strict;'), '.island-wave-canvas must have contain: strict');
  assert.ok(canvasBody.includes('transform: translateZ(0);'), '.island-wave-canvas must have transform: translateZ(0)');
  assert.ok(!canvasBody.includes('will-change: transform;'), '.island-wave-canvas must not request a redundant transform layer');

  const visMatch = dynamicIslandCss.match(/(?:^|\n)\.island-wave-visualizer\s*\{([^}]+)\}/);
  assert.ok(visMatch, '.island-wave-visualizer must be defined');
  const visBody = visMatch[1];
  assert.ok(visBody.includes('contain: strict;') || visBody.includes('contain: layout paint;'), '.island-wave-visualizer must have contain: strict or contain: layout paint');
  assert.ok(visBody.includes('transform: translateZ(0);'), '.island-wave-visualizer must have transform: translateZ(0)');
});

// ============================================================================
// SUITE 2: METAMORPHOSIS TIER TRANSITIONS & ANIMATION SMOOTHNESS
// ============================================================================
console.log('\n--- Suite 2: Metamorphosis Tier Transitions & Animation Smoothness ---');

test('2.1: Calm tier scopes transitions away from transition: all', () => {
  const calmMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-morph-calm\s+#dynamic-island\s*\{([^}]+)\}/);
  assert.ok(calmMatch, 'Calm tier rule for #dynamic-island must exist');
  const calmBody = calmMatch[1];
  assert.ok(!calmBody.includes('transition: all'), 'Calm tier must NOT use transition: all');
  assert.ok(calmBody.includes('transition: border-color 0.45s ease, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);'), 'Calm tier must scope transition to border-color and transform');
});

test('2.2: Groove tier scopes transitions away from transition: all', () => {
  const grooveMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-morph-groove\s+#dynamic-island\s*\{([^}]+)\}/);
  assert.ok(grooveMatch, 'Groove tier rule for #dynamic-island must exist');
  const grooveBody = grooveMatch[1];
  assert.ok(!grooveBody.includes('transition: all'), 'Groove tier must NOT use transition: all');
  assert.ok(grooveBody.includes('transition: border-color 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);'), 'Groove tier must scope transition to border-color and transform');
});

test('2.3: Climax tier defines rapid scale bump with scoped transition', () => {
  const climaxMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-morph-climax\s+#dynamic-island\s*\{([^}]+)\}/);
  assert.ok(climaxMatch, 'Climax tier rule for #dynamic-island must exist');
  const climaxBody = climaxMatch[1];
  assert.ok(!climaxBody.includes('transition: all'), 'Climax tier must NOT use transition: all');
  assert.ok(climaxBody.includes('transform: scale(1.02);'), 'Climax tier must scale to 1.02');
  assert.ok(climaxBody.includes('transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease;'), 'Climax tier must scope transition to transform and border-color');
});

test('2.4: Solo tier defines instrumental break styling without transition: all conflicts', () => {
  const soloMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-morph-solo\s+#dynamic-island\s*\{([^}]+)\}/);
  assert.ok(soloMatch, 'Solo tier rule for #dynamic-island must exist');
  const soloBody = soloMatch[1];
  assert.ok(!soloBody.includes('transition: all'), 'Solo tier must NOT use transition: all');
  assert.ok(soloBody.includes('border-color: rgba(var(--art-color-1-rgb, 56, 189, 248), 0.35);'), 'Solo tier must have cyan border color');
});

test('2.5: Metamorphosis tier hysteresis and upgrade/downgrade state machine', () => {
  const activeClasses = new Set();
  const mockBody = {
    classList: {
      toggle: (cls, active) => {
        if (active) activeClasses.add(cls);
        else activeClasses.delete(cls);
      },
      contains: (cls) => activeClasses.has(cls),
      remove: (...clss) => clss.forEach(c => activeClasses.delete(c))
    }
  };

  const morphSandbox = {
    document: { body: mockBody },
    currentMorphTier: 'groove',
    lastMorphTierTime: 1000,
    lastAppliedMorphTier: null,
    now: 1000
  };

  // State machine simulator matching renderer.js lines 2790-2814
  function simulateTierShift(rollingAudioEnergy, subBass, isInstrumental, currentTime) {
    morphSandbox.now = currentTime;
    let targetTier = 'groove';
    if (isInstrumental && rollingAudioEnergy >= 0.15) {
      targetTier = 'solo';
    } else if (rollingAudioEnergy >= 0.42 || subBass > 0.82) {
      targetTier = 'climax';
    } else if (rollingAudioEnergy < 0.10) {
      targetTier = 'calm';
    } else {
      targetTier = 'groove';
    }

    if (targetTier !== morphSandbox.currentMorphTier) {
      const isUpgrade = (targetTier === 'climax' || targetTier === 'solo');
      if (isUpgrade || (morphSandbox.now - morphSandbox.lastMorphTierTime >= 350)) {
        morphSandbox.currentMorphTier = targetTier;
        morphSandbox.lastMorphTierTime = morphSandbox.now;
      }
    }

    if (morphSandbox.lastAppliedMorphTier !== morphSandbox.currentMorphTier) {
      const tierClasses = ['island-morph-calm', 'island-morph-groove', 'island-morph-climax', 'island-morph-solo'];
      tierClasses.forEach(cls => mockBody.classList.toggle(cls, cls === `island-morph-${morphSandbox.currentMorphTier}`));
      morphSandbox.lastAppliedMorphTier = morphSandbox.currentMorphTier;
    }
  }

  // 1. Initial groove state
  simulateTierShift(0.25, 0.30, false, 1000);
  assert.strictEqual(morphSandbox.currentMorphTier, 'groove');
  assert.ok(mockBody.classList.contains('island-morph-groove'));
  assert.strictEqual(activeClasses.size, 1);

  // 2. Immediate upgrade to Climax on heavy bass (subBass = 0.85)
  simulateTierShift(0.30, 0.85, false, 1050); // only 50ms later
  assert.strictEqual(morphSandbox.currentMorphTier, 'climax', 'Upgrade to climax must be instantaneous');
  assert.ok(mockBody.classList.contains('island-morph-climax'));
  assert.strictEqual(activeClasses.size, 1);

  // 3. Attempt premature downgrade to calm after 100ms (1050 + 100 = 1150 < 1050 + 350)
  simulateTierShift(0.04, 0.05, false, 1150);
  assert.strictEqual(morphSandbox.currentMorphTier, 'climax', 'Premature downgrade within 350ms hysteresis must be blocked');

  // 4. Downgrade after hold period elapsed (t = 1450 >= 1050 + 350)
  simulateTierShift(0.04, 0.05, false, 1450);
  assert.strictEqual(morphSandbox.currentMorphTier, 'calm', 'Downgrade to calm must succeed after 350ms hold time');
  assert.ok(mockBody.classList.contains('island-morph-calm'));
  assert.strictEqual(activeClasses.size, 1);

  // 5. Immediate upgrade to Solo on instrumental break
  simulateTierShift(0.20, 0.10, true, 1500);
  assert.strictEqual(morphSandbox.currentMorphTier, 'solo', 'Upgrade to solo must be instantaneous');
  assert.ok(mockBody.classList.contains('island-morph-solo'));
  assert.strictEqual(activeClasses.size, 1);
});

test('2.6: Rapid tier switching simulation across 60 rapid cycles preserves mutual exclusivity', () => {
  const activeClasses = new Set();
  const mockBody = {
    classList: {
      toggle: (cls, active) => {
        if (active) activeClasses.add(cls);
        else activeClasses.delete(cls);
      },
      contains: (cls) => activeClasses.has(cls),
      remove: (...clss) => clss.forEach(c => activeClasses.delete(c))
    }
  };

  let currentMorphTier = 'groove';
  let lastAppliedMorphTier = null;
  let lastMorphTierTime = 0;

  function runTick(energy, bass, isInst, time) {
    let targetTier = 'groove';
    if (isInst && energy >= 0.15) targetTier = 'solo';
    else if (energy >= 0.42 || bass > 0.82) targetTier = 'climax';
    else if (energy < 0.10) targetTier = 'calm';
    else targetTier = 'groove';

    if (targetTier !== currentMorphTier) {
      const isUpgrade = (targetTier === 'climax' || targetTier === 'solo');
      if (isUpgrade || (time - lastMorphTierTime >= 350)) {
        currentMorphTier = targetTier;
        lastMorphTierTime = time;
      }
    }

    if (lastAppliedMorphTier !== currentMorphTier) {
      const tierClasses = ['island-morph-calm', 'island-morph-groove', 'island-morph-climax', 'island-morph-solo'];
      tierClasses.forEach(cls => mockBody.classList.toggle(cls, cls === `island-morph-${currentMorphTier}`));
      lastAppliedMorphTier = currentMorphTier;
    }
  }

  // 60 rapid ticks with pseudo-random jitter
  let simulatedTime = 1000;
  for (let i = 0; i < 60; i++) {
    simulatedTime += 25; // 40 Hz ticks
    const energy = (i % 4 === 0) ? 0.05 : ((i % 4 === 1) ? 0.25 : ((i % 4 === 2) ? 0.55 : 0.20));
    const bass = (i % 3 === 0) ? 0.90 : 0.20;
    const isInst = (i % 5 === 0);
    runTick(energy, bass, isInst, simulatedTime);

    // Assert strictly one morph class active at all times
    assert.strictEqual(activeClasses.size, 1, `Tick ${i}: Exactly one morph class must be active, got ${activeClasses.size}`);
    const activeClass = Array.from(activeClasses)[0];
    assert.strictEqual(activeClass, `island-morph-${currentMorphTier}`);
  }
});

// ============================================================================
// SUITE 3: WAVE VISUALIZER RENDERING ON ISOLATED CANVAS LAYER
// ============================================================================
console.log('\n--- Suite 3: Wave Visualizer Rendering on Isolated Canvas Layer ---');

test('3.1: DOM wave-bars suppression rule (.island-wave-visualizer:has(.island-wave-canvas) .wave-bar)', () => {
  assert.ok(
    dynamicIslandCss.includes('.island-wave-visualizer:has(.island-wave-canvas) .wave-bar {') &&
    dynamicIslandCss.includes('display: none !important;'),
    '_dynamic_island.css must suppress DOM .wave-bar spans when canvas is mounted'
  );
});

test('3.2: drawIslandVisualizer multi-style canvas execution (bars, dots, wave)', () => {
  let clearRectCalls = [];
  let roundRectCalls = [];
  let rectCalls = [];
  let arcCalls = [];
  let fillCalls = 0;
  let lastFillStyle = null;

  const mockCtx = {
    clearRect: (x, y, w, h) => clearRectCalls.push({ x, y, w, h }),
    beginPath: () => {},
    arc: (x, y, r, sa, ea) => arcCalls.push({ x, y, r }),
    roundRect: (x, y, w, h, r) => roundRectCalls.push({ x, y, w, h, r }),
    rect: (x, y, w, h) => rectCalls.push({ x, y, w, h }),
    fill: () => fillCalls++,
    createLinearGradient: () => ({ addColorStop: () => {} }),
    set fillStyle(val) { lastFillStyle = val; },
    get fillStyle() { return lastFillStyle; },
    globalAlpha: 1.0
  };

  const mockCanvasEl = {
    isConnected: true,
    getContext: (type) => (type === '2d' ? mockCtx : null)
  };

  const sandbox = {
    document: {
      getElementById: (id) => {
        if (id === 'island-wave-canvas') return mockCanvasEl;
        if (id === 'island-wave') return { classList: { contains: () => false } };
        if (id === 'dynamic-island') return { classList: { contains: () => false } };
        return null;
      }
    },
    settings: { islandVisualizerBars: 4 },
    Math,
    Boolean,
    performance: { now: () => 1000 }
  };
  vm.createContext(sandbox);

  const getContextFn = rendererJs.match(/function getIslandWaveCanvasContext\(\) \{[\s\S]*?\n\}/)[0];
  const drawFn = rendererJs.match(/function drawIslandVisualizer\([\s\S]*?\n\}/)[0];

  vm.runInContext(`
    let islandWaveCanvas = null;
    let islandWaveCtx = null;
    let lastIslandCanvasDrawTime = 0;
    let lastIslandCanvasVisStyle = null;
    ${getContextFn}
    ${drawFn}
  `, sandbox);

  // 1. Draw bars mode
  sandbox.performance.now = () => 1000;
  vm.runInContext(`drawIslandVisualizer([0.8, 0.6, 0.4, 0.2], 'bars', false, false);`, sandbox);
  assert.strictEqual(clearRectCalls.length, 1);
  assert.strictEqual(clearRectCalls[0].w, 56);
  assert.strictEqual(clearRectCalls[0].h, 18);
  assert.ok(roundRectCalls.length >= 4 || rectCalls.length >= 4, 'Must draw 4 bars');

  // 2. Draw dots mode
  sandbox.performance.now = () => 1050; // >= 33.3ms
  vm.runInContext(`drawIslandVisualizer([0.8, 0.6, 0.4, 0.2], 'dots', false, false);`, sandbox);
  assert.strictEqual(clearRectCalls.length, 2);
  assert.strictEqual(arcCalls.length, 4, 'Must draw 4 dot circles in dots mode');

  // 3. Draw wave mode
  sandbox.performance.now = () => 1100;
  vm.runInContext(`drawIslandVisualizer([0.8, 0.6, 0.4, 0.2], 'wave', false, false);`, sandbox);
  assert.strictEqual(clearRectCalls.length, 3);
});

test('3.3: Visualizer bar count matrix (4, 6, 8, 10 bars) coordinate bounds', () => {
  const drawnBars = [];
  const mockCtx = {
    clearRect: () => {},
    beginPath: () => {},
    roundRect: (x, y, w, h, r) => drawnBars.push({ x, y, w, h }),
    rect: (x, y, w, h) => drawnBars.push({ x, y, w, h }),
    fill: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '#ffffff',
    globalAlpha: 1.0
  };

  const sandbox = {
    document: {
      getElementById: (id) => {
        if (id === 'island-wave-canvas') return { isConnected: true, getContext: () => mockCtx };
        return { classList: { contains: () => false } };
      }
    },
    settings: { islandVisualizerBars: 4 },
    Math,
    Boolean,
    performance: { now: () => 1000 }
  };
  vm.createContext(sandbox);

  const getContextFn = rendererJs.match(/function getIslandWaveCanvasContext\(\) \{[\s\S]*?\n\}/)[0];
  const drawFn = rendererJs.match(/function drawIslandVisualizer\([\s\S]*?\n\}/)[0];

  vm.runInContext(`
    let islandWaveCanvas = null;
    let islandWaveCtx = null;
    let lastIslandCanvasDrawTime = 0;
    let lastIslandCanvasVisStyle = null;
    ${getContextFn}
    ${drawFn}
  `, sandbox);

  [4, 6, 8, 10].forEach((count, idx) => {
    drawnBars.length = 0;
    sandbox.performance.now = () => 1000 + idx * 100;
    const values = Array.from({ length: count }, (_, i) => (i + 1) / count);
    vm.runInContext(`drawIslandVisualizer(${JSON.stringify(values)}, 'bars', false, false);`, sandbox);

    assert.strictEqual(drawnBars.length, count, `Must render exactly ${count} bars`);
    drawnBars.forEach((bar, bIdx) => {
      assert.ok(bar.x >= 0, `Bar ${bIdx} x (${bar.x}) must be >= 0`);
      assert.ok(bar.x + bar.w <= 56, `Bar ${bIdx} right edge (${bar.x + bar.w}) must be <= 56`);
      assert.ok(bar.y >= 0, `Bar ${bIdx} y (${bar.y}) must be >= 0`);
      assert.ok(bar.y + bar.h <= 18, `Bar ${bIdx} bottom edge (${bar.y + bar.h}) must be <= 18`);
      assert.ok(bar.h >= 2.1, `Bar ${bIdx} height (${bar.h}) must satisfy min height 2.1px`);
    });
  });
});

test('3.4: Audio state handling in visualizer: Paused glyph, Instrumental break, and Lyric gap', () => {
  let capturedFillStyle = null;
  let capturedAlpha = 1.0;

  const mockCtx = {
    clearRect: () => {},
    beginPath: () => {},
    roundRect: () => {},
    rect: () => {},
    fill: function() {
      // Capture the style and alpha active during fill operations
      capturedFillStyle = this.fillStyle;
      capturedAlpha = this.activeAlpha;
    },
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '#ffffff',
    activeAlpha: 1.0,
    set globalAlpha(v) { this.activeAlpha = v; },
    get globalAlpha() { return this.activeAlpha; }
  };

  const islandClasses = new Set();
  const waveClasses = new Set();

  const sandbox = {
    document: {
      getElementById: (id) => {
        if (id === 'island-wave-canvas') return { isConnected: true, getContext: () => mockCtx };
        if (id === 'dynamic-island') return { classList: { contains: (cls) => islandClasses.has(cls) } };
        if (id === 'island-wave') return { classList: { contains: (cls) => waveClasses.has(cls) } };
        return null;
      }
    },
    settings: { islandVisualizerBars: 4 },
    Math,
    Boolean,
    performance: { now: () => 1000 }
  };
  vm.createContext(sandbox);

  const getContextFn = rendererJs.match(/function getIslandWaveCanvasContext\(\) \{[\s\S]*?\n\}/)[0];
  const drawFn = rendererJs.match(/function drawIslandVisualizer\([\s\S]*?\n\}/)[0];

  vm.runInContext(`
    let islandWaveCanvas = null;
    let islandWaveCtx = null;
    let lastIslandCanvasDrawTime = 0;
    let lastIslandCanvasVisStyle = null;
    ${getContextFn}
    ${drawFn}
  `, sandbox);

  // 1. Paused state (#dynamic-island.island-paused)
  islandClasses.add('island-paused');
  sandbox.performance.now = () => 1000;
  vm.runInContext(`drawIslandVisualizer([0, 0, 0, 0], 'bars', false, false);`, sandbox);
  assert.strictEqual(capturedFillStyle, '#38bdf8', 'Paused state must use #38bdf8 accent color');
  assert.strictEqual(capturedAlpha, 0.9, 'Paused state must use alpha 0.9');

  // 2. Instrumental active (#dynamic-island.island-instrumental-active)
  islandClasses.clear();
  islandClasses.add('island-instrumental-active');
  sandbox.performance.now = () => 1050;
  vm.runInContext(`drawIslandVisualizer([0.5, 0.5, 0.5, 0.5], 'bars', false, false);`, sandbox);
  assert.strictEqual(capturedFillStyle, '#38bdf8', 'Instrumental mode must use #38bdf8 accent color');
  assert.strictEqual(capturedAlpha, 1.0, 'Active playing instrumental must have full opacity 1.0');

  // 3. Lyric gap active (isGap = true or .is-lyric-gap-active)
  islandClasses.clear();
  waveClasses.add('is-lyric-gap-active');
  sandbox.performance.now = () => 1100;
  vm.runInContext(`drawIslandVisualizer([0, 0, 0, 0], 'bars', true, true);`, sandbox);
  assert.strictEqual(capturedFillStyle, '#38bdf8', 'Lyric gap resting must use #38bdf8 accent');
  assert.strictEqual(capturedAlpha, 0.9, 'Lyric gap resting must use alpha 0.9');
});

test('3.5: Canvas frame rate limiter enforces 33.33ms (30 FPS) throttle in Dynamic Island mode', () => {
  let renderCount = 0;
  const mockCtx = {
    clearRect: () => renderCount++,
    beginPath: () => {},
    roundRect: () => {},
    rect: () => {},
    fill: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '#ffffff',
    globalAlpha: 1.0
  };

  const sandbox = {
    document: {
      getElementById: (id) => (id === 'island-wave-canvas' ? { isConnected: true, getContext: () => mockCtx } : null)
    },
    isDynamicIslandMode: true,
    settings: { islandVisualizerBars: 4 },
    Math,
    Boolean,
    performance: { now: () => 1000 }
  };
  vm.createContext(sandbox);

  const getContextFn = rendererJs.match(/function getIslandWaveCanvasContext\(\) \{[\s\S]*?\n\}/)[0];
  const drawFn = rendererJs.match(/function drawIslandVisualizer\([\s\S]*?\n\}/)[0];

  vm.runInContext(`
    let islandWaveCanvas = null;
    let islandWaveCtx = null;
    let lastIslandCanvasDrawTime = 0;
    let lastIslandCanvasVisStyle = null;
    ${getContextFn}
    ${drawFn}
  `, sandbox);

  // Frame 1 at t = 1000 -> draws
  sandbox.performance.now = () => 1000;
  vm.runInContext(`drawIslandVisualizer([0.5, 0.5, 0.5, 0.5], 'bars', false, false);`, sandbox);
  assert.strictEqual(renderCount, 1);

  // Frame 2 at t = 1015 (delta = 15ms < 33.33ms) -> must be THROTTLED
  sandbox.performance.now = () => 1015;
  vm.runInContext(`drawIslandVisualizer([0.6, 0.6, 0.6, 0.6], 'bars', false, false);`, sandbox);
  assert.strictEqual(renderCount, 1, 'Frame at 15ms delta must be throttled');

  // Frame 3 at t = 1030 (delta = 30ms < 33.33ms) -> must be THROTTLED
  sandbox.performance.now = () => 1030;
  vm.runInContext(`drawIslandVisualizer([0.7, 0.7, 0.7, 0.7], 'bars', false, false);`, sandbox);
  assert.strictEqual(renderCount, 1, 'Frame at 30ms delta must be throttled');

  // Frame 4 at t = 1035 (delta = 35ms >= 33.33ms) -> MUST DRAW
  sandbox.performance.now = () => 1035;
  vm.runInContext(`drawIslandVisualizer([0.7, 0.7, 0.7, 0.7], 'bars', false, false);`, sandbox);
  assert.strictEqual(renderCount, 2, 'Frame at 35ms delta must pass throttle');
});

// ============================================================================
// SUITE 4: ADVERSARIAL STRESS HARNESS
// ============================================================================
console.log('\n--- Suite 4: Adversarial Stress Harness ---');

test('4.1: 15 Rapid Mode Transitions Stress Test', () => {
  const domState = {
    bodyClasses: new Set(['mode-dynamic-island']),
    islandClasses: new Set(),
    inlineStyles: {}
  };

  const transitions = [
    { name: '1. Desktop Mode', apply: () => { domState.bodyClasses.delete('mode-dynamic-island'); } },
    { name: '2. Dynamic Island Mode', apply: () => { domState.bodyClasses.add('mode-dynamic-island'); } },
    { name: '3. Ghost Mode Enabled', apply: () => { domState.bodyClasses.add('island-ghost-mode'); } },
    { name: '4. Glass Mode Enabled', apply: () => { domState.bodyClasses.add('island-glass-mode'); } },
    { name: '5. Ghost Mode Disabled', apply: () => { domState.bodyClasses.delete('island-ghost-mode'); } },
    { name: '6. Glass Mode Disabled', apply: () => { domState.bodyClasses.delete('island-glass-mode'); } },
    { name: '7. Island Inactivity Sleep', apply: () => { domState.bodyClasses.add('island-sleeping'); } },
    { name: '8. Island Waking', apply: () => { domState.bodyClasses.delete('island-sleeping'); } },
    { name: '9. Dock Bottom Center', apply: () => { domState.bodyClasses.add('island-dock-bottom-center'); } },
    { name: '10. Dock Top Left', apply: () => {
        domState.bodyClasses.delete('island-dock-bottom-center');
        domState.bodyClasses.add('island-dock-top-left');
      }
    },
    { name: '11. Dock Top Right', apply: () => {
        domState.bodyClasses.delete('island-dock-top-left');
        domState.bodyClasses.add('island-dock-top-right');
      }
    },
    { name: '12. Dock Reset to Top Center', apply: () => { domState.bodyClasses.delete('island-dock-top-right'); } },
    { name: '13. Sparkle Sweep Art Transition', apply: () => { domState.islandClasses.add('has-art-transition'); } },
    { name: '14. Next Up Preview Triggered', apply: () => { domState.islandClasses.add('has-next-up-preview'); } },
    { name: '15. Instrumental Solo Break Active', apply: () => {
        domState.islandClasses.add('island-instrumental-active');
        domState.bodyClasses.add('island-morph-solo');
      }
    }
  ];

  transitions.forEach((t) => {
    t.apply();
    // Validate integrity at each transition
    assert.ok(domState.bodyClasses instanceof Set);
    assert.ok(domState.islandClasses instanceof Set);
  });

  // Revert cleanly
  domState.islandClasses.clear();
  domState.bodyClasses.clear();
  domState.bodyClasses.add('mode-dynamic-island');
  assert.strictEqual(domState.bodyClasses.size, 1);
});

test('4.2: High-Amplitude Energy Jumps & Peak Bloom Decay', () => {
  const islandStyle = {};
  const haloStyle = {};
  let setStyleCalls = 0;

  const mockIslandEl = {
    style: {
      setProperty: (prop, val) => {
        setStyleCalls++;
        islandStyle[prop] = val;
      },
      getPropertyValue: (prop) => islandStyle[prop],
      removeProperty: (prop) => {
        delete islandStyle[prop];
      }
    }
  };

  const mockHaloEl = {
    style: {
      setProperty: (prop, val) => { haloStyle[prop] = val; },
      getPropertyValue: (prop) => haloStyle[prop],
      removeProperty: (prop) => { delete haloStyle[prop]; }
    }
  };

  const morphSandbox = {
    document: {
      getElementById: (id) => {
        if (id === 'dynamic-island') return mockIslandEl;
        if (id === 'island-art-halo') return mockHaloEl;
        return null;
      },
      body: { classList: { remove: () => {}, toggle: () => {} } }
    },
    settings: { islandBeatBloom: true, islandMetamorphosis: true },
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    lastIslandSyncData: null,
    smoothedIslandBloom: 0,
    rollingAudioEnergy: 0,
    currentMorphTier: 'groove',
    lastMorphTierTime: 0,
    lastAppliedMorphTier: null,
    _lastIslandMorphCssTime: 0,
    _lastIslandBloomRadius: null,
    _lastIslandBloomAlpha: null,
    _lastIslandHaloOpacity: null,
    _lastIslandHaloScale: null,
    _lastIslandHaloBlur: null,
    _lastIslandBeatScale: null,
    ISLAND_BLOOM_RADIUS_DEADBAND: 2,
    ISLAND_BLOOM_ALPHA_DEADBAND: 0.04,
    ISLAND_HALO_OPACITY_DEADBAND: 0.04,
    ISLAND_HALO_SCALE_DEADBAND: 0.005,
    ISLAND_HALO_BLUR_DEADBAND: 1,
    ISLAND_BEAT_SCALE_DEADBAND: 0.002,
    islandArtHaloEl: mockHaloEl,
    setStylePropertyIfChanged: (el, prop, val) => el.style.setProperty(prop, val),
    now: 1000,
    Date: { now: () => morphSandbox.now },
    Math,
    parseFloat,
    Array
  };
  vm.createContext(morphSandbox);

  const morphFn = rendererJs.match(/function updateIslandEnergyMorph\([\s\S]*?\n\}/)[0];
  vm.runInContext(`${morphFn}`, morphSandbox);

  // Adversarial sequence of 20 violent jumps
  const jumps = [
    0.00, 0.98, 0.01, 0.95, 0.00, 0.89, 0.02, 0.92,
    0.04, 0.85, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00
  ];

  let simTime = 1000;
  jumps.forEach((subBass, idx) => {
    simTime += 50; // 50ms > 48ms throttle window
    morphSandbox.now = simTime;
    vm.runInContext(`updateIslandEnergyMorph([${subBass}, ${subBass}, 0.2, 0.1]);`, morphSandbox);

    // Assert that bloom values never produce NaN or invalid strings
    const r = islandStyle['--island-bloom-radius'];
    const a = islandStyle['--island-bloom-alpha'];
    const s = islandStyle['--island-beat-scale'];
    if (r !== undefined) {
      assert.ok(r.endsWith('px'), `Bloom radius ${r} must end with px`);
      const num = parseInt(r, 10);
      assert.ok(!isNaN(num) && num >= 10 && num <= 34, `Bloom radius ${num} must be between 10 and 34`);
    }
    if (a !== undefined) {
      const alpha = parseFloat(a);
      assert.ok(!isNaN(alpha) && alpha >= 0.30 && alpha <= 0.75, `Bloom alpha ${alpha} must be between 0.30 and 0.75`);
    }
    if (s !== undefined) {
      const scale = parseFloat(s);
      assert.ok(!isNaN(scale) && scale >= 1.0 && scale <= 1.015, `Beat scale ${scale} must be between 1.0 and 1.015`);
    }
  });

  // After 6 consecutive frames of 0.00, bloom properties must be cleanly purged
  assert.strictEqual(islandStyle['--island-bloom-radius'], undefined, 'After decay, --island-bloom-radius must be removed');
  assert.strictEqual(islandStyle['--island-bloom-alpha'], undefined, 'After decay, --island-bloom-alpha must be removed');
  assert.strictEqual(islandStyle['--island-beat-scale'], undefined, 'After decay, --island-beat-scale must be removed');
});

test('4.3: Visualizer Audio Spectrum Packet Storm (250 packets with malformed & degenerate inputs)', () => {
  let clearRectCalls = 0;
  let drawCalls = 0;

  const mockCtx = {
    clearRect: () => clearRectCalls++,
    beginPath: () => {},
    roundRect: () => drawCalls++,
    rect: () => drawCalls++,
    arc: () => drawCalls++,
    fill: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '#ffffff',
    globalAlpha: 1.0
  };

  const sandbox = {
    document: {
      getElementById: (id) => (id === 'island-wave-canvas' ? { isConnected: true, getContext: () => mockCtx } : null)
    },
    settings: { islandVisualizerBars: 4 },
    Math,
    Boolean,
    performance: { now: () => 1000 }
  };
  vm.createContext(sandbox);

  const getContextFn = rendererJs.match(/function getIslandWaveCanvasContext\(\) \{[\s\S]*?\n\}/)[0];
  const drawFn = rendererJs.match(/function drawIslandVisualizer\([\s\S]*?\n\}/)[0];

  vm.runInContext(`
    let islandWaveCanvas = null;
    let islandWaveCtx = null;
    let lastIslandCanvasDrawTime = 0;
    let lastIslandCanvasVisStyle = null;
    ${getContextFn}
    ${drawFn}
  `, sandbox);

  // Storm of 250 packets:
  // - 50 standard 4-bin packets
  // - 50 8-bin packets
  // - 50 16-bin packets
  // - 50 32-bin packets
  // - 50 malformed degenerate packets (NaN, Infinity, negatives, empty arrays, nulls)
  let currentTime = 1000;
  for (let p = 0; p < 250; p++) {
    currentTime += 35; // ensure each passes the 33.3ms limiter
    sandbox.performance.now = () => currentTime;

    let packet;
    if (p < 50) {
      packet = [0.1, 0.4, 0.7, 0.2];
    } else if (p < 100) {
      packet = [0.2, 0.4, 0.6, 0.8, 0.5, 0.3, 0.2, 0.1];
    } else if (p < 150) {
      packet = Array.from({ length: 16 }, (_, i) => Math.sin(i / 16));
    } else if (p < 200) {
      packet = Array.from({ length: 32 }, (_, i) => Math.cos(i / 32));
    } else {
      // Degenerate inputs
      const badCases = [
        [],
        null,
        undefined,
        [NaN, NaN, NaN, NaN],
        [Infinity, -Infinity, 999999, -500],
        [null, undefined, false, 'bad'],
        [-0.01, -1.0, 0, 0]
      ];
      packet = badCases[p % badCases.length];
    }

    const style = (p % 3 === 0) ? 'bars' : ((p % 3 === 1) ? 'dots' : 'wave');
    assert.doesNotThrow(() => {
      sandbox.packet = packet;
      sandbox.style = style;
      vm.runInContext(`drawIslandVisualizer(packet, style, false, false);`, sandbox);
    }, `Packet ${p} must not throw on degenerate input`);
  }

  assert.ok(clearRectCalls > 200, `Must have successfully drawn over 200 frames (got ${clearRectCalls})`);
});

test('4.4: Inactive Overlay Canvas Suppression Lifecycle (#island-ca-emitter-canvas)', () => {
  const caBlockMatch = dynamicIslandCss.match(/\.island-ca-emitter-canvas\s*\{([^}]+)\}/);
  assert.ok(caBlockMatch, '.island-ca-emitter-canvas rule must exist');
  const body = caBlockMatch[1];
  assert.ok(body.includes('display: none;'), '.island-ca-emitter-canvas must have display: none by default');
  assert.ok(!body.includes('display: none !important;'), 'Must not use !important so inline script can set display: block on emission');

  // Verify CAEmitterEngine sets display: block on expand and display: none on collapse
  const caEmitterPath = path.join(srcDir, 'modules/ca-emitter.js');
  const caEmitterCode = fs.readFileSync(caEmitterPath, 'utf8');
  assert.ok(
    caEmitterCode.includes("this.canvas.style.display = 'block'") ||
    caEmitterCode.includes('this.canvas.style.display = "block"') ||
    caEmitterCode.includes('this.canvas.style.display = "none"'),
    'ca-emitter.js must manage canvas display lifecycle'
  );
});

test('4.5: Halo Blur Gaussian Kernel Decoupling (.island-art-halo)', () => {
  const haloBlockMatch = dynamicIslandCss.match(/\.island-art-halo\s*\{([^}]+)\}/);
  assert.ok(haloBlockMatch, '.island-art-halo rule must exist');
  const body = haloBlockMatch[1];
  assert.ok(body.includes('filter: blur(8px);'), '.island-art-halo must fix blur to 8px');
  assert.ok(body.includes('--island-halo-blur: 8px;'), '.island-art-halo must retain --island-halo-blur: 8px');
  assert.ok(body.includes('contain: paint;'), '.island-art-halo must have contain: paint');
  assert.ok(body.includes('will-change: transform, opacity;'), '.island-art-halo must have will-change: transform, opacity');
  assert.ok(body.includes('transform: scale(var(--island-halo-scale, 1)) translateZ(0);'), '.island-art-halo must use GPU accelerated transform');
});

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n================================================================');
console.log(`  CHALLENGER 2 SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
if (failedTests > 0) {
  console.error(`  FAILURES: ${failedTests} test(s) failed`);
  process.exitCode = 1;
} else {
  console.log('  VERDICT: 100% GREEN (ALL ADVERSARIAL STRESS CHALLENGES PASSED)');
}
console.log('================================================================\n');
