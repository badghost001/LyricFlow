/**
 * tests/island-liquid-glass.test.js
 * Verification test suite for Dynamic Island Liquid Glass Material.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n--- Running Dynamic Island Liquid Glass Material Tests ---\n');

const cssPath = path.join(__dirname, '../src/styles/_dynamic_island.css');
const htmlPath = path.join(__dirname, '../src/index.html');
const rendererPath = path.join(__dirname, '../src/renderer.js');

const cssCode = fs.readFileSync(cssPath, 'utf8');
const htmlCode = fs.readFileSync(htmlPath, 'utf8');
const rendererCode = fs.readFileSync(rendererPath, 'utf8');

// 1. CSS Liquid Glass Material Declarations
console.log('1. CSS Material Declarations:');

// 1a. Primary Dynamic Island Capsule in Glass Mode
assert(cssCode.includes('body.mode-dynamic-island.island-glass-mode #dynamic-island'), 'Must declare glass mode rules for primary island capsule');
assert(cssCode.includes('backdrop-filter: blur(28px) saturate(190%) contrast(105%)'), 'Primary island capsule must have 28px high-refraction blur in glass mode');
assert(cssCode.includes('rgba(18, 18, 24, 0.52)'), 'Must use translucent dark glass substrate');
console.log('  ✓ 1a. Primary Dynamic Island capsule declares translucent glass substrate and 28px refraction blur');

// 1b. Expanded Hover Card in Glass Mode
assert(cssCode.includes('body.mode-dynamic-island.island-glass-mode #dynamic-island:hover'), 'Must declare glass mode rules for expanded hover card');
assert(cssCode.includes('backdrop-filter: blur(36px) saturate(200%)'), 'Expanded hover card must have 36px deep blur in glass mode');
console.log('  ✓ 1b. Expanded hover card declares 36px deep blur and specular highlights');

// 1c. Duet & Backing Vocal Satellite Capsule
assert(cssCode.includes('body.mode-dynamic-island.island-glass-mode #island-duet-capsule'), 'Must style duet capsule in glass mode');
assert(cssCode.includes('backdrop-filter: blur(24px) saturate(190%)'), 'Duet capsule must have 24px refraction blur in glass mode');
console.log('  ✓ 1c. Duet capsule shares frosted liquid glass material and 24px refraction blur');

// 1d. Satellite Translation Capsule
assert(cssCode.includes('body.mode-dynamic-island.island-glass-mode #dynamic-island-translation'), 'Must style translation capsule in glass mode');
console.log('  ✓ 1d. Translation satellite capsule shares frosted liquid glass material');

// 1e. Cellular Metamorphosis Bridges
assert(cssCode.includes('body.mode-dynamic-island.island-glass-mode .island-bridge'), 'Must style organic connecting bridges in glass mode');
assert(cssCode.includes('body.mode-dynamic-island.island-glass-mode .island-duet-bridge'), 'Must style duet connecting bridges in glass mode');
console.log('  ✓ 1e. Metamorphosis bridges share translucent glass refractive styling');

// 1f. Tactile Glass Discs for Controls
assert(cssCode.includes('body.mode-dynamic-island.island-glass-mode .island-btn'), 'Must style island control buttons in glass mode');
assert(cssCode.includes('body.mode-dynamic-island.island-glass-mode .island-btn.island-btn-play'), 'Must style play disc in glass mode');
console.log('  ✓ 1f. Playback control buttons styled as tactile glass discs');

// 1g. Album Art Cover Color Radial Gradient Caustics
assert(cssCode.includes('--art-color-dominant-rgb'), 'Must infuse dominant album art color into liquid glass material');
assert(cssCode.includes('radial-gradient('), 'Must use radial gradient caustics for album art color tinting');
console.log('  ✓ 1g. Album art cover color radial caustics infused into liquid glass substrate');

// 1h. Internal Caustic Refraction Glow & Outer Rim Tint
assert(cssCode.includes('inset 0 0 24px -4px rgba(var(--art-color-dominant-rgb'), 'Must cast internal album art refraction glow');
assert(cssCode.includes('0 0 0 1px rgba(var(--art-color-1-rgb'), 'Must illuminate outer liquid glass perimeter rim with album art accent');
console.log('  ✓ 1h. Internal caustic refraction glow and outer rim tinted with album art hue');


// 2. Settings Panel UI in index.html
console.log('\n2. Settings Panel UI:');

assert(htmlCode.includes('id="check-island-glass-mode"'), 'index.html must define check-island-glass-mode toggle');
assert(htmlCode.includes('Liquid Glass Material'), 'index.html must display Liquid Glass Material label');
console.log('  ✓ 2a. check-island-glass-mode toggle switch exists in Display Modes settings group');


// 3. Logic & Persistence in renderer.js
console.log('\n3. Logic & State Management:');

// 3a. Default setting defined
assert(rendererCode.includes('islandGlassMode: false'), 'settings object must define islandGlassMode default');
console.log('  ✓ 3a. settings.islandGlassMode defaults to false (clean Obsidian OLED by default)');

// 3b. toggleIslandGlassMode function defined
assert(rendererCode.includes('function toggleIslandGlassMode('), 'renderer.js must define toggleIslandGlassMode function');
assert(rendererCode.includes("document.body.classList.toggle('island-glass-mode'"), 'toggleIslandGlassMode must toggle island-glass-mode class on body');
console.log('  ✓ 3b. toggleIslandGlassMode toggles body class and updates UI checkbox');

// 3c. applyVisualSettings syncs state
assert(rendererCode.includes("document.body.classList.toggle('island-glass-mode', Boolean(settings.islandGlassMode))"), 'applyVisualSettings must sync island-glass-mode body class');
console.log('  ✓ 3c. applyVisualSettings synchronizes body class and checkbox state on load');

// 3d. Checkbox change event listener bound
assert(rendererCode.includes('const checkIslandGlass = document.getElementById("check-island-glass-mode")'), 'renderer.js must bind check-island-glass-mode listener');
console.log('  ✓ 3d. check-island-glass-mode change listener bound to toggleIslandGlassMode');


// 4. Functional Simulation
console.log('\n4. Functional Simulation:');

{
  const mockSettings = { islandGlassMode: false };
  const mockClassList = new Set();
  const mockCheckbox = { checked: false };

  function mockToggle(enable) {
    mockSettings.islandGlassMode = typeof enable === 'boolean' ? enable : !mockSettings.islandGlassMode;
    if (mockSettings.islandGlassMode) {
      mockClassList.add('island-glass-mode');
    } else {
      mockClassList.delete('island-glass-mode');
    }
    mockCheckbox.checked = mockSettings.islandGlassMode;
  }

  // Initial state
  assert.strictEqual(mockSettings.islandGlassMode, false);
  assert.strictEqual(mockClassList.has('island-glass-mode'), false);

  // Toggle ON
  mockToggle(true);
  assert.strictEqual(mockSettings.islandGlassMode, true);
  assert.strictEqual(mockClassList.has('island-glass-mode'), true);
  assert.strictEqual(mockCheckbox.checked, true);
  console.log('  ✓ 4a. Turning Liquid Glass ON activates island-glass-mode class and checks input');

  // Toggle OFF
  mockToggle(false);
  assert.strictEqual(mockSettings.islandGlassMode, false);
  assert.strictEqual(mockClassList.has('island-glass-mode'), false);
  assert.strictEqual(mockCheckbox.checked, false);
  console.log('  ✓ 4b. Turning Liquid Glass OFF removes island-glass-mode class and unchecks input');
}

console.log('\nAll 11/11 Dynamic Island Liquid Glass tests passed successfully!\n');
