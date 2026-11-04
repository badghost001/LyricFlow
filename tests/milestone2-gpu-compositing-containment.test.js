/**
 * Milestone 2 Test Suite: GPU Compositing, CSS Containment & Canvas Layer Isolation
 *
 * Verifies:
 * - Feature 6: Canvas Layer & Paint Containment (.island-wave-visualizer and .island-wave-canvas)
 * - Feature 7: Bloom Shadow & Halo Blur Optimization (#dynamic-island::after and .island-art-halo)
 * - Feature 8: Active Word Layer Promotion Cleanup (.lyric-word.lyric-word-active)
 * - Feature 9: Inactive Overlay Canvas Suppression (#island-ca-emitter-canvas)
 * - Feature 10: Metamorphosis Transition Scoping (island-morph-calm and island-morph-groove)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  MILESTONE 2: GPU COMPOSITING & CSS CONTAINMENT TEST SUITE     ');
console.log('================================================================\n');

const cssPath = path.join(__dirname, '../src/styles/_dynamic_island.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

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

// ----------------------------------------------------------------------------
// 1. FEATURE 6: CANVAS LAYER & PAINT CONTAINMENT
// ----------------------------------------------------------------------------
console.log('--- Feature 6: Canvas Layer & Paint Containment ---');

runTest('6.1. .island-wave-visualizer contains its own strict paint/layout layer', () => {
  const visBlockMatch = cssContent.match(/(?:^|\n)\.island-wave-visualizer\s*\{([^}]+)\}/);
  assert.ok(visBlockMatch, '.island-wave-visualizer rule must be present in _dynamic_island.css');
  const visBlock = visBlockMatch[1];
  assert.ok(visBlock.includes('contain: strict;'), '.island-wave-visualizer must specify strict containment;');
  assert.ok(visBlock.includes('transform: translateZ(0);'), '.island-wave-visualizer must specify transform: translateZ(0);');
  assert.ok(!visBlock.includes('will-change: transform;'), 'The visualizer must not request a redundant transform layer');
});

runTest('6.2. .island-wave-canvas contains strict containment, backface-visibility, and GPU promotion', () => {
  const canvasBlockMatch = cssContent.match(/\.island-wave-canvas\s*\{([^}]+)\}/);
  assert.ok(canvasBlockMatch, '.island-wave-canvas rule must be present in _dynamic_island.css');
  const canvasBlock = canvasBlockMatch[1];
  assert.ok(canvasBlock.includes('width: 56px;'), '.island-wave-canvas must preserve width: 56px;');
  assert.ok(canvasBlock.includes('height: 18px;'), '.island-wave-canvas must preserve height: 18px;');
  assert.ok(canvasBlock.includes('contain: strict;'), '.island-wave-canvas must specify contain: strict;');
  assert.ok(canvasBlock.includes('transform: translateZ(0);'), '.island-wave-canvas must specify transform: translateZ(0);');
  assert.ok(!canvasBlock.includes('will-change: transform;'), '.island-wave-canvas must not request a redundant transform layer');
  assert.ok(canvasBlock.includes('backface-visibility: hidden;'), '.island-wave-canvas must specify backface-visibility: hidden;');
});

// ----------------------------------------------------------------------------
// 2. FEATURE 7: BLOOM SHADOW & HALO BLUR OPTIMIZATION
// ----------------------------------------------------------------------------
console.log('\n--- Feature 7: Bloom Shadow & Halo Blur Optimization ---');

runTest('7.1. Decoupled dynamic bloom isolated on composited pseudo-element', () => {
  assert.ok(
    cssContent.includes('#dynamic-island::after {'),
    '_dynamic_island.css must define #dynamic-island::after for decoupled dynamic bloom layer'
  );
  const afterBlockMatch = cssContent.match(/#dynamic-island::after\s*\{([^}]+)\}/);
  assert.ok(afterBlockMatch, '#dynamic-island::after rule must be present');
  const afterBlock = afterBlockMatch[1];
  assert.ok(afterBlock.includes('box-shadow: 0 0 var(--island-bloom-radius, 24px)'), '#dynamic-island::after must own the dynamic bloom shadow');
  assert.ok(afterBlock.includes('opacity: var(--island-bloom-alpha, 0);'), '#dynamic-island::after must modulate opacity');
  assert.ok(afterBlock.includes('will-change: opacity;'), '#dynamic-island::after must declare will-change: opacity;');
  assert.ok(afterBlock.includes('transform: translateZ(0);'), '#dynamic-island::after must be GPU composited with translateZ(0);');
  const islandBaseBlock = cssContent.match(/body\.mode-dynamic-island #dynamic-island\s*\{([^}]+)\}/)?.[1] || '';
  assert.ok(!islandBaseBlock.includes('--island-bloom-radius') && !islandBaseBlock.includes('--island-bloom-alpha'), 'Static island box-shadows must not depend on dynamic bloom variables');
});

runTest('7.2. .island-art-halo fixes Gaussian blur to 8px and promotes to isolated paint container', () => {
  const haloBlockMatch = cssContent.match(/\.island-art-halo\s*\{([^}]+)\}/);
  assert.ok(haloBlockMatch, '.island-art-halo rule must be present');
  const haloBlock = haloBlockMatch[1];
  assert.ok(haloBlock.includes('filter: blur(8px);'), '.island-art-halo must fix blur to 8px to prevent kernel recomputation');
  assert.ok(haloBlock.includes('filter: blur(8px);'), '.island-art-halo blur radius must remain fixed rather than being updated per audio sample');
  assert.ok(haloBlock.includes('contain: paint;'), '.island-art-halo must declare contain: paint;');
  assert.ok(haloBlock.includes('will-change: transform, opacity;'), '.island-art-halo must declare will-change: transform, opacity;');
  assert.ok(haloBlock.includes('transform: scale(var(--island-halo-scale, 1)) translateZ(0);'), '.island-art-halo must hardware accelerate transform');
});

// ----------------------------------------------------------------------------
// 3. FEATURE 8: ACTIVE WORD LAYER PROMOTION CLEANUP
// ----------------------------------------------------------------------------
console.log('\n--- Feature 8: Active Word Layer Promotion Cleanup ---');

runTest('8.1. .lyric-word-active has redundant will-change: transform removed', () => {
  const activeWordMatch = cssContent.match(/\.island-lyric-line\s+\.lyric-word\.lyric-word-active\s*\{([^}]+)\}/);
  assert.ok(activeWordMatch, '.island-lyric-line .lyric-word.lyric-word-active rule must be present');
  const activeWordBlock = activeWordMatch[1];
  assert.ok(
    !activeWordBlock.includes('will-change: transform;'),
    '.lyric-word.lyric-word-active must NOT declare redundant will-change: transform;'
  );
  assert.ok(activeWordBlock.includes('background-clip: text;'), 'Must preserve background-clip: text;');
  assert.ok(activeWordBlock.includes('transform: none;'), 'Must preserve transform: none;');
});

// ----------------------------------------------------------------------------
// 4. FEATURE 9: INACTIVE OVERLAY CANVAS SUPPRESSION
// ----------------------------------------------------------------------------
console.log('\n--- Feature 9: Inactive Overlay Canvas Suppression ---');

runTest('9.1. #island-ca-emitter-canvas has display: none by default in CSS', () => {
  const caBlockMatch = cssContent.match(/\.island-ca-emitter-canvas\s*\{([^}]+)\}/);
  assert.ok(caBlockMatch, '.island-ca-emitter-canvas rule must be present');
  const caBlock = caBlockMatch[1];
  assert.ok(caBlock.includes('display: none;'), '.island-ca-emitter-canvas must have display: none; when idle');
  assert.ok(!caBlock.includes('display: none !important;'), 'Must not use !important so inline style.display can override when active');
});

// ----------------------------------------------------------------------------
// 5. FEATURE 10: METAMORPHOSIS TRANSITION SCOPING
// ----------------------------------------------------------------------------
console.log('\n--- Feature 10: Metamorphosis Transition Scoping ---');

runTest('10.1. island-morph-calm and island-morph-groove scope transitions away from transition: all', () => {
  const calmMatch = cssContent.match(/body\.mode-dynamic-island\.island-morph-calm\s+#dynamic-island\s*\{([^}]+)\}/);
  assert.ok(calmMatch, 'island-morph-calm #dynamic-island rule must be present');
  const calmBlock = calmMatch[1];
  assert.ok(!calmBlock.includes('transition: all'), 'island-morph-calm must NOT use transition: all');
  assert.ok(calmBlock.includes('transition: border-color 0.45s ease, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);'), 'island-morph-calm must scope transition to border-color and transform');

  const grooveMatch = cssContent.match(/body\.mode-dynamic-island\.island-morph-groove\s+#dynamic-island\s*\{([^}]+)\}/);
  assert.ok(grooveMatch, 'island-morph-groove #dynamic-island rule must be present');
  const grooveBlock = grooveMatch[1];
  assert.ok(!grooveBlock.includes('transition: all'), 'island-morph-groove must NOT use transition: all');
  assert.ok(grooveBlock.includes('transition: border-color 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);'), 'island-morph-groove must scope transition to border-color and transform');
});

console.log(`\nAll ${passedTests}/${totalTests} Milestone 2 GPU & CSS Containment tests passed successfully!\n`);
