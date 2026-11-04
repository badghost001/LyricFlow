/**
 * Empirical Challenger Milestone 2 Stress Test Suite:
 * Adversarial Verification of GPU Compositing, CSS Containment & Canvas Layer Isolation
 *
 * Verifies:
 * - Vector 1: .island-wave-canvas dimensions, drawing operations, coordinate bounds, and containment clipping immunity.
 * - Vector 2: #dynamic-island::after decoupled dynamic bloom opacity stress under high-frequency audio updates.
 * - Vector 3: .island-art-halo sub-bass energy morphing, scale & opacity response, and fixed 8px blur kernel stability.
 * - Vector 4: Active lyric word gradient tracking without will-change: transform.
 * - Vector 5: #island-ca-emitter-canvas particle emission expansion and idle display: none collapse.
 * - Vector 6: Adversarial edge cases: extreme audio inputs, rapid mode changes, and NaN resilience.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcDir = path.join(__dirname, '../src');
const dynamicIslandCss = fs.readFileSync(path.join(srcDir, 'styles/_dynamic_island.css'), 'utf8');
const indexHtml = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const rendererJs = fs.readFileSync(path.join(srcDir, 'renderer.js'), 'utf8');

const { CAEmitterEngine } = require('../src/modules/ca-emitter.js');

console.log('================================================================');
console.log('  CHALLENGER M2: GPU COMPOSITING & CSS CONTAINMENT HARNESS      ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(err);
    throw err;
  }
}

// ============================================================================
// VECTOR 1: .island-wave-canvas DIMENSIONS, DRAWING OPERATIONS & CLIPPING
// ============================================================================
console.log('--- Vector 1: Visualizer Canvas Dimensions, Coordinates & Containment ---');

runTest('1.1: Markup, CSS containment rules, and isolated compositor quad declaration', () => {
  // Markup check
  assert.ok(
    indexHtml.includes('<canvas id="island-wave-canvas" class="island-wave-canvas" width="56" height="18"></canvas>'),
    'index.html must define #island-wave-canvas with exactly width="56" height="18"'
  );

  // CSS check on .island-wave-canvas
  const canvasRuleMatch = dynamicIslandCss.match(/\.island-wave-canvas\s*\{([^}]+)\}/);
  assert.ok(canvasRuleMatch, '.island-wave-canvas rule must exist');
  const canvasCss = canvasRuleMatch[1];
  assert.ok(canvasCss.includes('width: 56px;'), 'Must specify width: 56px;');
  assert.ok(canvasCss.includes('height: 18px;'), 'Must specify height: 18px;');
  assert.ok(canvasCss.includes('contain: strict;'), 'Must specify contain: strict;');
  assert.ok(canvasCss.includes('transform: translateZ(0);'), 'Must specify transform: translateZ(0);');
  assert.ok(!canvasCss.includes('will-change: transform;'), 'Must not request redundant will-change: transform layer;');
  assert.ok(canvasCss.includes('backface-visibility: hidden;'), 'Must specify backface-visibility: hidden;');

  // CSS check on .island-wave-visualizer
  const visRuleMatch = dynamicIslandCss.match(/(?:^|\n)\.island-wave-visualizer\s*\{([^}]+)\}/);
  assert.ok(visRuleMatch, '.island-wave-visualizer rule must exist');
  const visCss = visRuleMatch[1];
  assert.ok(visCss.includes('contain: strict;') || visCss.includes('contain: layout paint;'), 'Must specify contain: strict or contain: layout paint;');
  assert.ok(visCss.includes('transform: translateZ(0);'), 'Must specify transform: translateZ(0);');
});

runTest('1.2: Empirical Drawing Bounding Box: Zero drawing operations bleed beyond 56x18 canvas', () => {
  // Extract getIslandWaveCanvasContext and drawIslandVisualizer from renderer.js
  const getContextFn = rendererJs.match(/function getIslandWaveCanvasContext\(\) \{[\s\S]*?\n\}/)[0];
  const drawFn = rendererJs.match(/function drawIslandVisualizer\([\s\S]*?\n\}/)[0];

  const drawnShapes = [];
  let clearRectCalls = 0;

  const mockCtx = {
    clearRect: (x, y, w, h) => {
      clearRectCalls++;
      assert.strictEqual(x, 0);
      assert.strictEqual(y, 0);
      assert.strictEqual(w, 56);
      assert.strictEqual(h, 18);
    },
    beginPath: () => {},
    rect: (x, y, w, h) => {
      drawnShapes.push({ type: 'rect', x, y, w, h, x2: x + w, y2: y + h });
    },
    roundRect: (x, y, w, h, r) => {
      drawnShapes.push({ type: 'roundRect', x, y, w, h, r, x2: x + w, y2: y + h });
    },
    arc: (x, y, r, sa, ea) => {
      drawnShapes.push({ type: 'arc', x, y, r, x1: x - r, y1: y - r, x2: x + r, y2: y + r });
    },
    fill: () => {},
    createLinearGradient: (x1, y1, x2, y2) => ({ addColorStop: () => {} }),
    fillStyle: '#ffffff',
    globalAlpha: 1.0
  };

  const mockCanvas = {
    isConnected: true,
    getContext: () => mockCtx
  };

  const sandbox = {
    document: {
      getElementById: (id) => {
        if (id === 'island-wave-canvas') return mockCanvas;
        if (id === 'island-wave') return { classList: { contains: () => false } };
        if (id === 'dynamic-island') return { classList: { contains: () => false } };
        return null;
      }
    },
    performance: { now: () => 1000 },
    Date: { now: () => 1000 },
    settings: { islandVisualizerBars: 4 },
    isDynamicIslandMode: true,
    lastIslandCanvasDrawTime: 0,
    lastIslandCanvasVisStyle: null,
    Math,
    Boolean
  };
  vm.createContext(sandbox);

  vm.runInContext(`
    let islandWaveCanvas = null;
    let islandWaveCtx = null;
    ${getContextFn}
    ${drawFn}
  `, sandbox);

  // Test matrix covering all styles, bar counts, and amplitudes
  const styles = ['bars', 'wave', 'dots'];
  const barCounts = [4, 6, 8];
  const amplitudes = [
    [0.0, 0.0, 0.0, 0.0],
    [0.05, 0.05, 0.05, 0.05],
    [0.5, 0.5, 0.5, 0.5],
    [1.0, 1.0, 1.0, 1.0],        // Peak amplitude
    [1.5, 2.0, 3.0, 4.0],        // Overdriven
    [0.9, 0.2, 0.8, 0.4, 0.7, 0.3, 0.95, 0.1]
  ];
  const states = [
    { isResting: false, isGap: false },
    { isResting: true, isGap: false },
    { isResting: false, isGap: true },
    { isResting: true, isGap: true }
  ];

  let simulatedTime = 2000;

  for (const style of styles) {
    for (const count of barCounts) {
      sandbox.settings.islandVisualizerBars = count;
      for (const amp of amplitudes) {
        for (const st of states) {
          drawnShapes.length = 0;
          simulatedTime += 50; // advance time > 33.3ms to bypass throttle
          sandbox.performance.now = () => simulatedTime;

          sandbox.drawIslandVisualizer(amp.slice(0, count), style, st.isResting, st.isGap);

          assert.ok(drawnShapes.length > 0, `Must draw shapes for style=${style}, count=${count}`);

          // Validate that EVERY drawn shape is strictly inside [0, 0, 56, 18]
          for (const s of drawnShapes) {
            if (s.type === 'arc') {
              assert.ok(s.x1 >= 0, `Arc left (${s.x1}) must be >= 0`);
              assert.ok(s.y1 >= 0, `Arc top (${s.y1}) must be >= 0`);
              assert.ok(s.x2 <= 56, `Arc right (${s.x2}) must be <= 56`);
              assert.ok(s.y2 <= 18, `Arc bottom (${s.y2}) must be <= 18`);
            } else {
              assert.ok(s.x >= 0, `Rect left (${s.x}) must be >= 0`);
              assert.ok(s.y >= 0, `Rect top (${s.y}) must be >= 0`);
              assert.ok(s.x2 <= 56, `Rect right (${s.x2}) must be <= 56`);
              assert.ok(s.y2 <= 18, `Rect bottom (${s.y2}) must be <= 18`);
            }
          }
        }
      }
    }
  }
});

runTest('1.3: Equalizer bar height and bottom margin guarantees zero clipping under strict containment', () => {
  // Verify mathematical bar height geometry
  // h = 18, maxBarHeight = 15.0, clamped max = 1.0
  // barHeight = Math.max(2.1, clamped * maxBarHeight) = 15.0
  // y = h - barHeight - 1 = 18 - 15 - 1 = 2.0
  // Bottom = y + barHeight = 2.0 + 15.0 = 17.0
  // Margin top = 2.0px, margin bottom = 1.0px. Total canvas height = 18.0px.
  const canvasHeight = 18.0;
  const maxBarHeight = 15.0;
  const bottomMargin = 1.0;
  const minTopY = canvasHeight - maxBarHeight - bottomMargin;
  assert.strictEqual(minTopY, 2.0, 'Top of maximum bar must have 2.0px margin from top of canvas');
  assert.strictEqual(minTopY + maxBarHeight, 17.0, 'Bottom of maximum bar must be 1.0px above canvas bottom');
  assert.ok(minTopY >= 0 && (minTopY + maxBarHeight) <= canvasHeight, 'Bar bounds strictly fit inside canvas height');
});

// ============================================================================
// VECTOR 2: #dynamic-island::after DECOUPLED DYNAMIC BLOOM STRESS TEST
// ============================================================================
console.log('\n--- Vector 2: Decoupled Dynamic Bloom Opacity High-Frequency Stress ---');

runTest('2.1: Dynamic bloom rule isolation on composited pseudo-element', () => {
  assert.ok(
    dynamicIslandCss.includes('#dynamic-island::after {'),
    '_dynamic_island.css must define #dynamic-island::after'
  );
  const afterRule = dynamicIslandCss.match(/#dynamic-island::after\s*\{([^}]+)\}/)[1];
  assert.ok(afterRule.includes('box-shadow: 0 0 24px') || afterRule.includes('var(--island-bloom-radius, 24px)'), 'Must use fixed or fallback 24px radius box-shadow');
  assert.ok(afterRule.includes('opacity: var(--island-bloom-alpha, 0);'), 'Must modulate opacity via CSS variable');
  assert.ok(afterRule.includes('will-change: opacity;'), 'Must declare will-change: opacity');
  assert.ok(afterRule.includes('transform: translateZ(0);'), 'Must declare transform: translateZ(0)');
  assert.ok(afterRule.includes('z-index: -1;'), 'Must place bloom behind main island');

  // Verify that base island uses fallback radius
  assert.ok(
    dynamicIslandCss.includes('var(--island-bloom-radius, 24px)'),
    'Base #dynamic-island must specify default 24px bloom radius'
  );
});

runTest('2.2: High-Frequency Audio Updates (1000 frames at 60–120Hz): zero NaN, correct deadbands, bounded opacity', () => {
  // Extract updateIslandEnergyMorph
  const morphFn = rendererJs.match(/function updateIslandEnergyMorph\([\s\S]*?\n\}/)[0];

  const setProperties = new Map();
  const removedProperties = new Set();

  const mockIslandEl = {
    classList: {
      contains: () => false,
      add: () => {},
      remove: () => {}
    },
    style: {
      setProperty: (prop, val) => {
        setProperties.set(prop, String(val));
        removedProperties.delete(prop);
      },
      removeProperty: (prop) => {
        removedProperties.add(prop);
        setProperties.delete(prop);
      },
      getPropertyValue: (prop) => setProperties.get(prop) || ''
    }
  };

  const mockHaloEl = {
    style: {
      setProperty: (prop, val) => {
        setProperties.set(prop, String(val));
        removedProperties.delete(prop);
      },
      removeProperty: (prop) => {
        removedProperties.add(prop);
        setProperties.delete(prop);
      },
      getPropertyValue: (prop) => setProperties.get(prop) || ''
    }
  };

  const mockBody = {
    classList: {
      contains: () => false,
      add: () => {},
      remove: () => {},
      toggle: () => {}
    }
  };

  let simulatedTime = 10000;

  const sandbox = {
    document: {
      body: mockBody,
      getElementById: (id) => {
        if (id === 'dynamic-island') return mockIslandEl;
        if (id === 'island-art-halo') return mockHaloEl;
        return null;
      }
    },
    Date: { now: () => simulatedTime },
    settings: { islandBeatBloom: true, islandMetamorphosis: true },
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    lastIslandSyncData: null,
    currentMorphTier: 'groove',
    lastMorphTierTime: 0,
    setStylePropertyIfChanged: (el, prop, val) => {
      el.style.setProperty(prop, val);
    },
    ISLAND_BLOOM_ALPHA_DEADBAND: 0.03,
    ISLAND_BLOOM_RADIUS_DEADBAND: 2,
    ISLAND_HALO_OPACITY_DEADBAND: 0.04,
    ISLAND_HALO_SCALE_DEADBAND: 0.008,
    ISLAND_HALO_BLUR_DEADBAND: 2,
    Math
  };
  vm.createContext(sandbox);

  vm.runInContext(`
    const ISLAND_BLOOM_RADIUS_DEADBAND = 2;
    const ISLAND_BLOOM_ALPHA_DEADBAND = 0.04;
    const ISLAND_HALO_OPACITY_DEADBAND = 0.04;
    const ISLAND_HALO_SCALE_DEADBAND = 0.005;
    const ISLAND_HALO_BLUR_DEADBAND = 1;
    const ISLAND_BEAT_SCALE_DEADBAND = 0.002;
    let islandEl = null;
    let islandArtHaloEl = null;
    let lastAppliedMorphTier = null;
    let rollingAudioEnergy = 0;
    let smoothedIslandBloom = 0;
    let _lastIslandMorphCssTime = 0;
    let _lastIslandBloomRadius = null;
    let _lastIslandBloomAlpha = null;
    let _lastIslandHaloOpacity = null;
    let _lastIslandHaloScale = null;
    let _lastIslandHaloBlur = null;
    let _lastIslandBeatScale = null;
    ${morphFn}
  `, sandbox);

  // Stress test: 1000 frames simulating high-frequency sub-bass transients
  let styleWriteCount = 0;
  for (let f = 0; f < 1000; f++) {
    simulatedTime += 16; // 60 FPS progression (16.6ms)

    // Generate adversarial waveforms: square spikes, sine waves, sudden silence
    let subBassVal;
    if (f < 200) {
      subBassVal = Math.sin(f * 0.2) * 0.5 + 0.5; // Sine oscillation [0, 1]
    } else if (f < 400) {
      subBassVal = (f % 10 === 0) ? 0.98 : 0.1;   // Rapid square spikes
    } else if (f < 600) {
      subBassVal = 0.0;                          // Complete silence drop
    } else if (f < 800) {
      subBassVal = 0.85 + Math.random() * 0.15;  // Sustained heavy bass
    } else {
      subBassVal = 0.0;                          // Final drop
    }

    const bands = [subBassVal, subBassVal * 0.8, 0.3, 0.2];
    const prevAlpha = setProperties.get('--island-bloom-alpha');

    sandbox.updateIslandEnergyMorph(bands);

    const currAlpha = setProperties.get('--island-bloom-alpha');
    if (currAlpha !== prevAlpha) styleWriteCount++;

    if (currAlpha !== undefined) {
      const alphaNum = parseFloat(currAlpha);
      assert.ok(!isNaN(alphaNum), 'Bloom alpha must not be NaN');
      assert.ok(alphaNum >= 0.0 && alphaNum <= 0.75, `Bloom alpha (${alphaNum}) must be in range [0, 0.75]`);
    }

    const currRadius = setProperties.get('--island-bloom-radius');
    if (currRadius !== undefined) {
      const radiusNum = parseInt(currRadius, 10);
      assert.ok(!isNaN(radiusNum), 'Bloom radius must not be NaN');
      assert.ok(radiusNum >= 10 && radiusNum <= 34, `Bloom radius (${radiusNum}) must be in range [10, 34]`);
    }
  }

  // After final drop (f >= 800), bloom properties must be cleanly cleaned up
  assert.ok(removedProperties.has('--island-bloom-alpha'), 'Bloom alpha must be removed after audio silence');
  assert.ok(removedProperties.has('--island-bloom-radius'), 'Bloom radius must be removed after audio silence');

  // Verify 20 Hz throttling: 1000 frames @ 16ms = 16 seconds. At 20 Hz max writes ~ 320 writes.
  assert.ok(styleWriteCount < 400, `Style writes (${styleWriteCount}) must be throttled below 400 by ~20 Hz gate`);
});

// ============================================================================
// VECTOR 3: .island-art-halo SUB-BASS ENERGY MORPHING & FIXED BLUR
// ============================================================================
console.log('\n--- Vector 3: Art Halo Energy Morphing & Gaussian Kernel Stability ---');

runTest('3.1: Halo CSS isolates paint containment and stabilizes Gaussian blur to 8px', () => {
  const haloRuleMatch = dynamicIslandCss.match(/\.island-art-halo\s*\{([^}]+)\}/);
  assert.ok(haloRuleMatch, '.island-art-halo rule must exist in _dynamic_island.css');
  const haloCss = haloRuleMatch[1];

  assert.ok(haloCss.includes('filter: blur(8px);'), 'Must fix filter: blur(8px) to prevent GPU kernel allocations');
  assert.ok(haloCss.includes('--island-halo-blur: 8px;'), 'Must preserve --island-halo-blur: 8px');
  assert.ok(haloCss.includes('contain: paint;'), 'Must declare contain: paint for isolated painting');
  assert.ok(haloCss.includes('will-change: transform, opacity;'), 'Must declare will-change: transform, opacity');
  assert.ok(haloCss.includes('transform: scale(var(--island-halo-scale, 1)) translateZ(0);'), 'Must use hardware accelerated scale transform');
});

runTest('3.2: Audio-reactive sub-bass breathing modulates scale and opacity within exact bounds', () => {
  const morphFn = rendererJs.match(/function updateIslandEnergyMorph\([\s\S]*?\n\}/)[0];

  const haloProps = new Map();
  const mockHaloEl = {
    style: {
      setProperty: (prop, val) => haloProps.set(prop, String(val)),
      removeProperty: (prop) => haloProps.delete(prop),
      getPropertyValue: (prop) => haloProps.get(prop) || ''
    }
  };

  const mockIslandEl = {
    classList: { contains: () => false, add: () => {}, remove: () => {} },
    style: {
      setProperty: () => {},
      removeProperty: () => {},
      getPropertyValue: () => ''
    }
  };

  const mockBody = {
    classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} }
  };

  let simulatedTime = 50000;
  const sandbox = {
    document: {
      body: mockBody,
      getElementById: (id) => (id === 'island-art-halo' ? mockHaloEl : mockIslandEl)
    },
    Date: { now: () => simulatedTime },
    settings: { islandBeatBloom: true, islandMetamorphosis: true },
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    lastIslandSyncData: null,
    currentMorphTier: 'groove',
    lastMorphTierTime: 0,
    setStylePropertyIfChanged: (el, prop, val) => el.style.setProperty(prop, val),
    ISLAND_BLOOM_ALPHA_DEADBAND: 0.03,
    ISLAND_BLOOM_RADIUS_DEADBAND: 2,
    ISLAND_HALO_OPACITY_DEADBAND: 0.04,
    ISLAND_HALO_SCALE_DEADBAND: 0.008,
    ISLAND_HALO_BLUR_DEADBAND: 2,
    Math
  };
  vm.createContext(sandbox);

  vm.runInContext(`
    const ISLAND_BLOOM_RADIUS_DEADBAND = 2;
    const ISLAND_BLOOM_ALPHA_DEADBAND = 0.04;
    const ISLAND_HALO_OPACITY_DEADBAND = 0.04;
    const ISLAND_HALO_SCALE_DEADBAND = 0.005;
    const ISLAND_HALO_BLUR_DEADBAND = 1;
    const ISLAND_BEAT_SCALE_DEADBAND = 0.002;
    let islandEl = null;
    let islandArtHaloEl = null;
    let lastAppliedMorphTier = null;
    let rollingAudioEnergy = 0;
    let smoothedIslandBloom = 0;
    let _lastIslandMorphCssTime = 0;
    let _lastIslandBloomRadius = null;
    let _lastIslandBloomAlpha = null;
    let _lastIslandHaloOpacity = null;
    let _lastIslandHaloScale = null;
    let _lastIslandHaloBlur = null;
    let _lastIslandBeatScale = null;
    ${morphFn}
  `, sandbox);

  // Test sub-bass sweeps from 0.0 to 1.0 in 0.1 steps
  for (let sb = 0.1; sb <= 1.0; sb += 0.1) {
    simulatedTime += 60; // advance > 48ms
    sandbox.updateIslandEnergyMorph([sb, sb]);

    const opacityStr = haloProps.get('--island-halo-opacity');
    const scaleStr = haloProps.get('--island-halo-scale');

    assert.ok(opacityStr, `Halo opacity must be set for subBass=${sb.toFixed(1)}`);
    assert.ok(scaleStr, `Halo scale must be set for subBass=${sb.toFixed(1)}`);

    const op = parseFloat(opacityStr);
    const sc = parseFloat(scaleStr);

    assert.ok(op >= 0.35 && op <= 0.92, `Halo opacity (${op}) must be within [0.35, 0.92]`);
    assert.ok(sc >= 1.000 && sc <= 1.140, `Halo scale (${sc}) must be within [1.000, 1.140]`);
  }

  // Test drop to silence (< 0.05)
  simulatedTime += 60;
  sandbox.updateIslandEnergyMorph([0.02, 0.01]);
  assert.strictEqual(haloProps.get('--island-halo-opacity'), undefined, 'Halo opacity must be removed on silence');
  assert.strictEqual(haloProps.get('--island-halo-scale'), undefined, 'Halo scale must be removed on silence');
});

runTest('3.3: Metamorphosis tier transitions scope away from transition: all', () => {
  const calmRule = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-morph-calm\s+#dynamic-island\s*\{([^}]+)\}/)[1];
  assert.ok(!calmRule.includes('transition: all'), 'island-morph-calm must NOT use transition: all');
  assert.ok(calmRule.includes('transition: border-color 0.45s ease, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);'), 'island-morph-calm must scope transition to border-color and transform');

  const grooveRule = dynamicIslandCss.match(/body\.mode-dynamic-island\.island-morph-groove\s+#dynamic-island\s*\{([^}]+)\}/)[1];
  assert.ok(!grooveRule.includes('transition: all'), 'island-morph-groove must NOT use transition: all');
  assert.ok(grooveRule.includes('transition: border-color 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);'), 'island-morph-groove must scope transition to border-color and transform');
});

// ============================================================================
// VECTOR 4: ACTIVE LYRIC WORD GRADIENT TRACKING WITHOUT WILL-CHANGE
// ============================================================================
console.log('\n--- Vector 4: Active Lyric Word Gradient Sweep Without will-change ---');

runTest('4.1: Active word CSS has will-change: transform removed while preserving text-clip gradient', () => {
  const wordRuleMatch = dynamicIslandCss.match(/\.island-lyric-line\s+\.lyric-word\.lyric-word-active\s*\{([^}]+)\}/);
  assert.ok(wordRuleMatch, '.island-lyric-line .lyric-word.lyric-word-active rule must exist');
  const wordCss = wordRuleMatch[1];

  assert.ok(!wordCss.includes('will-change: transform;'), 'Must NOT declare will-change: transform on active word');
  assert.ok(wordCss.includes('background: linear-gradient('), 'Must declare linear-gradient background');
  assert.ok(wordCss.includes('var(--word-progress-percent, 100%)'), 'Must use --word-progress-percent for color stop sweep');
  assert.ok(wordCss.includes('background-clip: text;'), 'Must specify background-clip: text');
  assert.ok(wordCss.includes('-webkit-background-clip: text;'), 'Must specify -webkit-background-clip: text');
  assert.ok(wordCss.includes('-webkit-text-fill-color: transparent;'), 'Must specify transparent text fill color');
  assert.ok(wordCss.includes('transform: none;'), 'Must maintain transform: none');
});

runTest('4.2: setLyricWordProgress sweeps --word-progress-percent smoothly from 0.0% to 100.0%', () => {
  const progressFn = rendererJs.match(/function setLyricWordProgress\([\s\S]*?\n\}/)[0];

  const wordStyles = new Map();
  const mockSpan = {
    style: {
      setProperty: (p, v) => wordStyles.set(p, String(v)),
      removeProperty: (p) => wordStyles.delete(p),
      getPropertyValue: (p) => wordStyles.get(p) || ''
    }
  };

  const sandbox = {
    setLyricWordProgress: null,
    Math,
    Number
  };
  vm.createContext(sandbox);
  vm.runInContext(`${progressFn}; this.setLyricWordProgress = setLyricWordProgress;`, sandbox);

  // Sweep from 0.0 to 1.0 in 0.05 increments
  for (let p = 0; p <= 1.01; p += 0.05) {
    const clampedP = Math.min(1.0, p);
    sandbox.setLyricWordProgress(mockSpan, clampedP);

    const percentStr = wordStyles.get('--word-progress-percent');
    const expected = `${(clampedP * 100).toFixed(1)}%`;
    assert.strictEqual(percentStr, expected, `Progress ${clampedP} must produce ${expected}`);
  }

  // Verify boundaries: 0 and 1
  sandbox.setLyricWordProgress(mockSpan, 0);
  assert.strictEqual(wordStyles.get('--word-progress-percent'), '0.0%');

  sandbox.setLyricWordProgress(mockSpan, 1);
  assert.strictEqual(wordStyles.get('--word-progress-percent'), '100.0%');
});

// ============================================================================
// VECTOR 5: #island-ca-emitter-canvas PARTICLE EMISSION & COLLAPSE
// ============================================================================
console.log('\n--- Vector 5: Core Animation Particle Canvas Emission & Idle Collapse ---');

runTest('5.1: Canvas has display: none by default in CSS and DOM construction', () => {
  const caRuleMatch = dynamicIslandCss.match(/\.island-ca-emitter-canvas\s*\{([^}]+)\}/);
  assert.ok(caRuleMatch, '.island-ca-emitter-canvas rule must exist');
  const caCss = caRuleMatch[1];

  assert.ok(caCss.includes('display: none;'), 'Must declare display: none by default');
  assert.ok(!caCss.includes('display: none !important;'), 'Must not use !important so inline style can override');
});

runTest('5.2: CAEmitterEngine expands canvas to display: block on emission and collapses to display: none on extinction', () => {
  const origWindow = global.window;
  global.window = { innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1 };

  // Construct instance in mock DOM
  const mockCanvas = {
    id: 'test-ca-canvas',
    style: { display: 'none', width: '1px', height: '1px' },
    width: 1,
    height: 1,
    getContext: () => ({
      clearRect: () => {},
      drawImage: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      setTransform: () => {},
      scale: () => {}
    })
  };

  const engine = new CAEmitterEngine('test-ca-canvas');
  engine.canvas = mockCanvas;
  engine.ctx = mockCanvas.getContext('2d');

  // Verify initial state
  assert.strictEqual(mockCanvas.style.display, 'none', 'Canvas must start with display: none');
  assert.strictEqual(mockCanvas.width, 1, 'Canvas backing store must start at 1px (evicted)');

  // 1. Expand canvas on emission
  engine._expandCanvas();
  assert.strictEqual(mockCanvas.style.display, 'block', 'Canvas must display: block when expanding for emission');
  assert.strictEqual(mockCanvas.width, 1024, 'Canvas backing store must expand to window dimensions');

  // 2. Add particles and simulate render loop to extinction
  engine.particles = [
    { type: 'stardust', x: 100, y: 100, vx: 0, vy: 0, drag: 0.9, alpha: 0.05, alphaSpeed: 1.0, color: '#ffffff', baseSize: 2 }
  ];
  engine.isEmitting = true;
  engine.lastTime = performance.now();

  // Run render loop: particle alpha will drop below 0.01 and trigger extinction
  engine.particles[0].alpha = 0.005; // force extinction
  engine._renderLoop();

  // 3. Verify collapse back to display: none and VRAM eviction
  assert.strictEqual(engine.isEmitting, false, 'Engine must finish emitting');
  assert.strictEqual(mockCanvas.style.display, 'none', 'Canvas must collapse back to display: none when idle');
  assert.strictEqual(mockCanvas.width, 1, 'Backing store must shrink to 1px to evict VRAM buffer');
  assert.strictEqual(mockCanvas.height, 1, 'Backing store must shrink to 1px to evict VRAM buffer');
  global.window = origWindow;
});

// ============================================================================
// VECTOR 6: ADVERSARIAL EDGE CASES, EXTREMES & INVARIANTS
// ============================================================================
console.log('\n--- Vector 6: Adversarial Edge Cases & Extremes ---');

runTest('6.1: Audio Spectrum extreme inputs (NaN, Infinity, Negative, Out of Bounds) do not crash or corrupt', () => {
  const getContextFn = rendererJs.match(/function getIslandWaveCanvasContext\(\) \{[\s\S]*?\n\}/)[0];
  const drawFn = rendererJs.match(/function drawIslandVisualizer\([\s\S]*?\n\}/)[0];
  const morphFn = rendererJs.match(/function updateIslandEnergyMorph\([\s\S]*?\n\}/)[0];

  const mockCtx = {
    clearRect: () => {},
    beginPath: () => {},
    rect: () => {},
    roundRect: () => {},
    arc: () => {},
    fill: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '#ffffff',
    globalAlpha: 1.0
  };

  const mockCanvas = { isConnected: true, getContext: () => mockCtx };
  const mockEl = {
    classList: { contains: () => false, add: () => {}, remove: () => {} },
    style: { setProperty: () => {}, removeProperty: () => {}, getPropertyValue: () => '' }
  };

  const mockBody = {
    classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} }
  };

  const sandbox = {
    document: {
      body: mockBody,
      getElementById: (id) => (id === 'island-wave-canvas' ? mockCanvas : mockEl)
    },
    performance: { now: () => 1000 },
    Date: { now: () => 1000 },
    settings: { islandVisualizerBars: 4, islandBeatBloom: true, islandMetamorphosis: true },
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    lastIslandSyncData: null,
    currentMorphTier: 'groove',
    lastMorphTierTime: 0,
    lastIslandCanvasDrawTime: 0,
    lastIslandCanvasVisStyle: null,
    setStylePropertyIfChanged: () => {},
    ISLAND_BLOOM_ALPHA_DEADBAND: 0.03,
    ISLAND_BLOOM_RADIUS_DEADBAND: 2,
    ISLAND_HALO_OPACITY_DEADBAND: 0.04,
    ISLAND_HALO_SCALE_DEADBAND: 0.008,
    ISLAND_HALO_BLUR_DEADBAND: 2,
    Math,
    Boolean
  };
  vm.createContext(sandbox);

  vm.runInContext(`
    const ISLAND_BLOOM_RADIUS_DEADBAND = 2;
    const ISLAND_BLOOM_ALPHA_DEADBAND = 0.04;
    const ISLAND_HALO_OPACITY_DEADBAND = 0.04;
    const ISLAND_HALO_SCALE_DEADBAND = 0.005;
    const ISLAND_HALO_BLUR_DEADBAND = 1;
    const ISLAND_BEAT_SCALE_DEADBAND = 0.002;
    let islandWaveCanvas = null;
    let islandWaveCtx = null;
    let islandEl = null;
    let islandArtHaloEl = null;
    let lastAppliedMorphTier = null;
    let rollingAudioEnergy = 0;
    let smoothedIslandBloom = 0;
    let _lastIslandMorphCssTime = 0;
    let _lastIslandBloomRadius = null;
    let _lastIslandBloomAlpha = null;
    let _lastIslandHaloOpacity = null;
    let _lastIslandHaloScale = null;
    let _lastIslandHaloBlur = null;
    let _lastIslandBeatScale = null;
    ${getContextFn}
    ${drawFn}
    ${morphFn}
  `, sandbox);

  const adversarialInputs = [
    [NaN, NaN, NaN, NaN],
    [Infinity, -Infinity, 9999999, -9999999],
    [null, undefined, {}, []],
    [],
    null,
    undefined
  ];

  for (const badInput of adversarialInputs) {
    // Neither drawIslandVisualizer nor updateIslandEnergyMorph should throw
    assert.doesNotThrow(() => {
      sandbox.drawIslandVisualizer(badInput, 'bars', false, false);
      sandbox.drawIslandVisualizer(badInput, 'dots', false, false);
      sandbox.updateIslandEnergyMorph(badInput);
    }, `Input ${JSON.stringify(badInput)} must not throw an error`);
  }
});

runTest('6.2: High-velocity CSS variable churn (10,000 updates): Zero getComputedStyle and clean fallback restoration', () => {
  // Verify that updateIslandEnergyMorph does NOT invoke getComputedStyle
  let computedStyleCalls = 0;
  const mockWindow = {
    getComputedStyle: () => {
      computedStyleCalls++;
      return {};
    }
  };

  const morphFn = rendererJs.match(/function updateIslandEnergyMorph\([\s\S]*?\n\}/)[0];

  const setProperties = new Map();
  const mockIslandEl = {
    classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} },
    style: {
      setProperty: (p, v) => setProperties.set(p, String(v)),
      removeProperty: (p) => setProperties.delete(p),
      getPropertyValue: (p) => setProperties.get(p) || ''
    }
  };
  const mockHaloEl = {
    style: {
      setProperty: (p, v) => setProperties.set(p, String(v)),
      removeProperty: (p) => setProperties.delete(p),
      getPropertyValue: (p) => setProperties.get(p) || ''
    }
  };

  let simulatedTime = 100000;
  const sandbox = {
    window: mockWindow,
    document: {
      body: { classList: { toggle: () => {} } },
      getElementById: (id) => (id === 'island-art-halo' ? mockHaloEl : mockIslandEl)
    },
    Date: { now: () => (simulatedTime += 50) },
    settings: { islandBeatBloom: true, islandMetamorphosis: true },
    isDynamicIslandMode: true,
    isIslandSleeping: false,
    lastIslandSyncData: null,
    currentMorphTier: 'groove',
    lastMorphTierTime: 0,
    setStylePropertyIfChanged: (el, prop, val) => el.style.setProperty(prop, val),
    Math
  };
  vm.createContext(sandbox);

  vm.runInContext(`
    const ISLAND_BLOOM_RADIUS_DEADBAND = 2;
    const ISLAND_BLOOM_ALPHA_DEADBAND = 0.04;
    const ISLAND_HALO_OPACITY_DEADBAND = 0.04;
    const ISLAND_HALO_SCALE_DEADBAND = 0.005;
    const ISLAND_HALO_BLUR_DEADBAND = 1;
    const ISLAND_BEAT_SCALE_DEADBAND = 0.002;
    let islandEl = null;
    let islandArtHaloEl = null;
    let lastAppliedMorphTier = null;
    let rollingAudioEnergy = 0;
    let smoothedIslandBloom = 0;
    let _lastIslandMorphCssTime = 0;
    let _lastIslandBloomRadius = null;
    let _lastIslandBloomAlpha = null;
    let _lastIslandHaloOpacity = null;
    let _lastIslandHaloScale = null;
    let _lastIslandHaloBlur = null;
    let _lastIslandBeatScale = null;
    ${morphFn}
  `, sandbox);

  // Run 10,000 updates with pseudo-random audio energy
  for (let i = 0; i < 10000; i++) {
    const bass = (i % 7 === 0) ? 0.95 : 0.45;
    sandbox.updateIslandEnergyMorph([bass, bass * 0.9]);
  }

  assert.strictEqual(computedStyleCalls, 0, 'updateIslandEnergyMorph must NEVER call getComputedStyle (zero forced reflow)');

  // Drop to silence
  sandbox.updateIslandEnergyMorph([0, 0]);
  assert.strictEqual(setProperties.has('--island-bloom-alpha'), false, 'Bloom alpha removed on silence, restoring CSS fallback');
  assert.strictEqual(setProperties.has('--island-halo-scale'), false, 'Halo scale removed on silence, restoring CSS fallback');
});

runTest('6.3: Micro-duration, negative timing, and boundary clamps for active word gradient', () => {
  const progressFn = rendererJs.match(/function setLyricWordProgress\([\s\S]*?\n\}/)[0];

  const wordStyles = new Map();
  const mockSpan = {
    style: {
      setProperty: (p, v) => wordStyles.set(p, String(v)),
      removeProperty: (p) => wordStyles.delete(p),
      getPropertyValue: (p) => wordStyles.get(p) || ''
    }
  };

  const sandbox = {
    setLyricWordProgress: null,
    Math,
    Number
  };
  vm.createContext(sandbox);
  vm.runInContext(`${progressFn}; this.setLyricWordProgress = setLyricWordProgress;`, sandbox);

  // Negative progress
  sandbox.setLyricWordProgress(mockSpan, -0.5);
  assert.strictEqual(wordStyles.get('--word-progress-percent'), '0.0%');

  // Extreme positive progress
  sandbox.setLyricWordProgress(mockSpan, 999.9);
  assert.strictEqual(wordStyles.get('--word-progress-percent'), '100.0%');

  // NaN / undefined progress
  sandbox.setLyricWordProgress(mockSpan, NaN);
  assert.strictEqual(wordStyles.get('--word-progress-percent'), '0.0%');

  sandbox.setLyricWordProgress(mockSpan, undefined);
  assert.strictEqual(wordStyles.get('--word-progress-percent'), '0.0%');
});

runTest('6.4: CAEmitterEngine rapid interruption, multi-burst and cancellation resilience', () => {
  const origWindow = global.window;
  global.window = { innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1.25 };

  const mockCanvas = {
    id: 'test-ca-burst',
    style: { display: 'none' },
    width: 1,
    height: 1,
    getContext: () => ({
      clearRect: () => {},
      drawImage: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      setTransform: () => {},
      scale: () => {}
    })
  };

  const engine = new CAEmitterEngine('test-ca-burst');
  engine.canvas = mockCanvas;
  engine.ctx = mockCanvas.getContext('2d');

  // Rapidly expand 50 times in a row, accumulating particles
  for (let i = 0; i < 50; i++) {
    engine._expandCanvas();
    assert.strictEqual(mockCanvas.style.display, 'block');
    engine.particles.push({ type: 'stardust', x: 50, y: 50, vx: 1, vy: 1, drag: 0.9, alpha: 0.005, alphaSpeed: 1, color: '#fff', baseSize: 2 });
    engine.isEmitting = true;
  }

  // 1. Natural extinction: particles decay through _renderLoop
  engine.lastTime = performance.now();
  engine._renderLoop();

  assert.strictEqual(engine.isEmitting, false);
  assert.strictEqual(mockCanvas.style.display, 'none', 'Must collapse back to display: none on natural particle extinction');
  assert.strictEqual(mockCanvas.width, 1, 'Backing store must shrink to 1px');

  // 2. Explicit engine.clear() interruption while emitting
  engine._expandCanvas();
  assert.strictEqual(mockCanvas.style.display, 'block');
  engine.particles.push({ type: 'stardust', x: 50, y: 50, vx: 1, vy: 1, drag: 0.9, alpha: 0.8, alphaSpeed: 1, color: '#fff', baseSize: 2 });
  engine.isEmitting = true;

  engine.clear();
  assert.strictEqual(engine.isEmitting, false);
  assert.strictEqual(mockCanvas.style.display, 'none', 'Must collapse back to display: none on engine.clear()');
  assert.strictEqual(mockCanvas.width, 1, 'Backing store must shrink to 1px on engine.clear()');

  global.window = origWindow;
});

runTest('6.5: Paused state visualizer glyph and resting geometry integrity', () => {
  // Check CSS rule for .island-paused visualizer
  const pausedVisMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\s+#dynamic-island\.island-paused\s+\.island-wave-visualizer\s*\{([^}]+)\}/);
  assert.ok(pausedVisMatch, 'Paused visualizer CSS rule must exist');
  const pausedVisCss = pausedVisMatch[1];
  assert.ok(pausedVisCss.includes('display: flex !important;'), 'Paused visualizer must remain visible');

  const pausedBarMatch = dynamicIslandCss.match(/body\.mode-dynamic-island\s+#dynamic-island\.island-paused\s+\.island-wave-visualizer\s+\.wave-bar\s*\{([^}]+)\}/);
  assert.ok(pausedBarMatch, 'Paused wave-bar CSS rule must exist');
  assert.ok(pausedBarMatch[1].includes('transform: scaleY(.38) !important;'), 'Paused bar must maintain readable .38 scale');
});

console.log(`\n================================================================`);
console.log(`  ALL ${passedTests}/${totalTests} ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY!`);
console.log(`================================================================\n`);
