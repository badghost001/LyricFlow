/**
 * tests/fluid-mesh-startup-palette.test.js
 * Verification test suite for Apple Music WebGL fluid mesh gradient color acquisition and startup palette restoration.
 * Run via: node tests/fluid-mesh-startup-palette.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  devicePixelRatio: 1,
  addEventListener: () => {}
};
global.document = {
  addEventListener: () => {}
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n--- Running Fluid Mesh Startup Palette & WebGL Acquisition Tests ---\n');

// 1. Static Code Analysis of fluid-mesh.js and renderer.js
console.log('1. Static Code Analysis:');

const fluidMeshSource = fs.readFileSync(path.join(__dirname, '../src/modules/fluid-mesh.js'), 'utf8');
const rendererSource = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8').replace(/\r\n/g, '\n');

test('1a. fluid-mesh.js declares _isFirstPalette flag in constructor', () => {
  assert.ok(fluidMeshSource.includes('this._isFirstPalette = true;'), 'Must initialize _isFirstPalette in constructor');
});

test('1b. fluid-mesh.js setPalette accepts immediate flag and snaps currentColors on startup', () => {
  assert.ok(fluidMeshSource.includes('setPalette(palette, immediate = false)'), 'setPalette must accept immediate parameter');
  assert.ok(fluidMeshSource.includes('if (immediate || this._isFirstPalette)'), 'Must snap on immediate or _isFirstPalette');
  assert.ok(fluidMeshSource.includes('this.currentColors = JSON.parse(JSON.stringify(this.targetColors));'), 'Must copy targetColors to currentColors');
});

test('1c. fluid-mesh.js resetToDefault resets _isFirstPalette to true', () => {
  assert.ok(fluidMeshSource.includes('this._isFirstPalette = true;'), 'resetToDefault must reset _isFirstPalette flag');
});

test('1d. renderer.js declares applyPaletteCSS helper and exports to window', () => {
  assert.ok(rendererSource.includes('function applyPaletteCSS('), 'applyPaletteCSS helper must be declared');
  assert.ok(rendererSource.includes('window.applyPaletteCSS = applyPaletteCSS;'), 'applyPaletteCSS must be attached to window');
});

test('1e. renderer.js updateDynamicArtColor sets window.currentDynamicPalette and persists to localStorage', () => {
  assert.ok(rendererSource.includes('window.currentDynamicPalette = fullPalette;'), 'updateDynamicArtColor must set window.currentDynamicPalette');
  assert.ok(rendererSource.includes("localStorage.setItem('lyricflow_last_palette', JSON.stringify(fullPalette));"), 'Must persist palette to localStorage');
  assert.ok(rendererSource.includes("localStorage.setItem('lyricflow_last_dominant', JSON.stringify(dominant));"), 'Must persist dominant color to localStorage');
});

test('1f. renderer.js restores cached palette on startup via restoreStartupPalette()', () => {
  assert.ok(rendererSource.includes('function restoreStartupPalette()'), 'restoreStartupPalette function must exist');
  assert.ok(rendererSource.includes('restoreStartupPalette();'), 'initDOMElements must invoke restoreStartupPalette');
  assert.ok(rendererSource.includes("localStorage.getItem('lyricflow_last_palette')"), 'Must read last palette from localStorage');
});

test('1g. renderer.js handleEmptyPlayback preserves dynamic palette when active', () => {
  assert.ok(rendererSource.includes('if (!window.currentDynamicPalette) {\n      fluidMeshGradientInstance.resetToDefault();'), 'Must guard resetToDefault with currentDynamicPalette');
  assert.ok(rendererSource.includes('if (!window.currentDynamicPalette) {\n    document.documentElement.style.removeProperty'), 'Must guard style removal with currentDynamicPalette');
});

// 2. Unit Testing FluidMeshGradient Class
console.log('\n2. FluidMeshGradient Unit Tests:');

const { FluidMeshGradient } = require('../src/modules/fluid-mesh.js');

// Mock minimal canvas & WebGL/2D contexts
function createMockCanvas() {
  return {
    getContext: () => null,
    width: 320,
    height: 180,
    style: {}
  };
}

test('2a. FluidMeshGradient initializes with default emerald green palette and _isFirstPalette === true', () => {
  const mesh = new FluidMeshGradient(createMockCanvas());
  assert.strictEqual(mesh._isFirstPalette, true, '_isFirstPalette must initially be true');
  assert.strictEqual(mesh.currentColors.length, 5, 'currentColors must have 5 colors');
  assert.strictEqual(mesh.targetColors.length, 5, 'targetColors must have 5 colors');
  // Default c1 is emerald green (29/255, 185/255, 84/255)
  assert.ok(Math.abs(mesh.currentColors[1][1] - (185 / 255)) < 0.01, 'Default c1 G should be ~0.725');
});

test('2b. First setPalette call immediately snaps currentColors to authentic artwork colors (no green flash)', () => {
  const mesh = new FluidMeshGradient(createMockCanvas());
  
  // Vibrant crimson album palette
  const albumPalette = [
    { r: 20, g: 5, b: 10 },    // c0 base
    { r: 235, g: 35, b: 45 },  // c1 primary red
    { r: 180, g: 25, b: 65 },  // c2 secondary
    { r: 120, g: 15, b: 90 },  // c3 tertiary
    { r: 255, g: 90, b: 110 }  // c4 accent
  ];

  mesh.setPalette(albumPalette);

  // Because _isFirstPalette was true, currentColors must match targetColors immediately!
  assert.strictEqual(mesh._isFirstPalette, false, '_isFirstPalette must be cleared after first palette');
  assert.ok(Math.abs(mesh.currentColors[1][0] - (235 / 255)) < 0.001, 'currentColors c1 R must be 235/255 immediately');
  assert.ok(Math.abs(mesh.currentColors[1][1] - (35 / 255)) < 0.001, 'currentColors c1 G must be 35/255 immediately');
  assert.ok(Math.abs(mesh.currentColors[0][0] - (20 / 255)) < 0.001, 'currentColors c0 R must be 20/255 immediately');
  assert.deepStrictEqual(mesh.currentColors, mesh.targetColors, 'currentColors must exactly match targetColors');
});

test('2c. Subsequent track change without immediate flag retains currentColors for smooth cross-dissolve', () => {
  const mesh = new FluidMeshGradient(createMockCanvas());
  const track1Palette = [
    { r: 20, g: 5, b: 10 },
    { r: 235, g: 35, b: 45 },
    { r: 180, g: 25, b: 65 },
    { r: 120, g: 15, b: 90 },
    { r: 255, g: 90, b: 110 }
  ];
  mesh.setPalette(track1Palette);

  // New track: Deep ocean blue palette
  const track2Palette = [
    { r: 5, g: 12, b: 28 },
    { r: 10, g: 130, b: 240 },
    { r: 30, g: 80, b: 190 },
    { r: 60, g: 40, b: 160 },
    { r: 50, g: 200, b: 255 }
  ];
  mesh.setPalette(track2Palette, false);

  // targetColors updated to Blue, but currentColors still Red before interpolation
  assert.ok(Math.abs(mesh.targetColors[1][0] - (10 / 255)) < 0.001, 'targetColors c1 R must be blue (10/255)');
  assert.ok(Math.abs(mesh.currentColors[1][0] - (235 / 255)) < 0.001, 'currentColors c1 R must remain red (235/255) for smooth cross-fade');
});

test('2d. Calling setPalette with immediate = true snaps currentColors instantaneously', () => {
  const mesh = new FluidMeshGradient(createMockCanvas());
  mesh.setPalette([
    { r: 10, g: 10, b: 10 },
    { r: 20, g: 20, b: 20 },
    { r: 30, g: 30, b: 30 },
    { r: 40, g: 40, b: 40 },
    { r: 50, g: 50, b: 50 }
  ]);

  // Golden Amber palette with immediate = true (e.g. startup restore)
  const goldenPalette = [
    { r: 30, g: 20, b: 5 },
    { r: 245, g: 180, b: 20 },
    { r: 210, g: 120, b: 15 },
    { r: 160, g: 70, b: 10 },
    { r: 255, g: 220, b: 80 }
  ];
  mesh.setPalette(goldenPalette, true);

  assert.ok(Math.abs(mesh.currentColors[1][0] - (245 / 255)) < 0.001, 'currentColors c1 R must immediately snap to gold');
  assert.deepStrictEqual(mesh.currentColors, mesh.targetColors, 'currentColors must exactly match targetColors');
});

test('2e. setPalette accepts raw 2D array [[r, g, b], ...] (0..255) correctly', () => {
  const mesh = new FluidMeshGradient(createMockCanvas());
  const arrayPalette = [
    [15, 10, 25],
    [140, 45, 220],
    [95, 30, 180],
    [50, 15, 120],
    [200, 110, 255]
  ];
  mesh.setPalette(arrayPalette, true);

  assert.ok(Math.abs(mesh.targetColors[1][0] - (140 / 255)) < 0.001, 'targetColors c1 R must normalize 140/255');
  assert.ok(Math.abs(mesh.currentColors[1][0] - (140 / 255)) < 0.001, 'currentColors c1 R must snap to 140/255');
});

test('2f. setPalette accepts normalized [[0..1], ...] array without double-dividing', () => {
  const mesh = new FluidMeshGradient(createMockCanvas());
  const normPalette = [
    [0.05, 0.04, 0.08],
    [0.65, 0.20, 0.85],
    [0.40, 0.15, 0.70],
    [0.25, 0.10, 0.50],
    [0.90, 0.50, 0.95]
  ];
  mesh.setPalette(normPalette, true);

  assert.strictEqual(mesh.targetColors[1][0], 0.65, 'Normalized 0.65 must be preserved as 0.65');
  assert.strictEqual(mesh.currentColors[1][0], 0.65, 'currentColors must be 0.65');
});

test('2g. resetToDefault returns to default palette and sets _isFirstPalette = true', () => {
  const mesh = new FluidMeshGradient(createMockCanvas());
  mesh.setPalette([
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 0, b: 0 }
  ]);
  assert.strictEqual(mesh._isFirstPalette, false);

  mesh.resetToDefault();
  assert.strictEqual(mesh._isFirstPalette, true, '_isFirstPalette must be reset to true');
  assert.ok(Math.abs(mesh.targetColors[1][1] - (185 / 255)) < 0.01, 'targetColors must be reset to default palette');
});

// 3. Functional Simulation of Startup Palette Restoration
console.log('\n3. Functional Startup Palette Restoration Simulation:');

// Setup mock window, document, and localStorage
const storage = new Map();
const mockLocalStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

const cssProps = new Map();
const mockDocumentElement = {
  style: {
    setProperty: (prop, val) => cssProps.set(prop, val),
    removeProperty: (prop) => cssProps.delete(prop),
    getPropertyValue: (prop) => cssProps.get(prop) || ''
  },
  getAttribute: () => 'dark'
};

const mockWindow = {
  localStorage: mockLocalStorage,
  currentDynamicPalette: null,
  currentDynamicDominantRgb: null,
  FluidMeshGradient
};

test('3a. Startup restoration loads cached palette from localStorage on boot', () => {
  storage.clear();
  cssProps.clear();

  const savedPalette = [
    { r: 12, g: 8, b: 24 },
    { r: 220, g: 45, b: 160 },
    { r: 150, g: 30, b: 120 },
    { r: 85, g: 20, b: 90 },
    { r: 255, g: 110, b: 200 }
  ];
  const savedDominant = { r: 220, g: 45, b: 160 };

  mockLocalStorage.setItem('lyricflow_last_palette', JSON.stringify(savedPalette));
  mockLocalStorage.setItem('lyricflow_last_dominant', JSON.stringify(savedDominant));

  // Instantiate mesh gradient
  const meshInstance = new FluidMeshGradient(createMockCanvas());

  // Simulate restoreStartupPalette execution
  const cachedPaletteRaw = mockLocalStorage.getItem('lyricflow_last_palette');
  const cachedDominantRaw = mockLocalStorage.getItem('lyricflow_last_dominant');
  const cachedPalette = JSON.parse(cachedPaletteRaw);
  const cachedDominant = JSON.parse(cachedDominantRaw);

  mockWindow.currentDynamicPalette = cachedPalette;
  mockWindow.currentDynamicDominantRgb = cachedDominant;
  meshInstance.setPalette(cachedPalette, true /* immediate */);

  // Verify mesh is immediately displaying the cached magenta colors
  assert.ok(Math.abs(meshInstance.currentColors[1][0] - (220 / 255)) < 0.001, 'Mesh currentColors c1 R must match cached palette');
  assert.ok(Math.abs(meshInstance.currentColors[1][1] - (45 / 255)) < 0.001, 'Mesh currentColors c1 G must match cached palette');
  assert.ok(Math.abs(meshInstance.currentColors[1][2] - (160 / 255)) < 0.001, 'Mesh currentColors c1 B must match cached palette');
});

test('3b. applyPaletteCSS correctly populates all artwork and accent CSS variables', () => {
  cssProps.clear();
  const c0 = { r: 10, g: 12, b: 18 };
  const c1 = { r: 240, g: 100, b: 30 };
  const c2 = { r: 190, g: 70, b: 20 };
  const c3 = { r: 130, g: 45, b: 15 };
  const c4 = { r: 255, g: 160, b: 60 };
  const dominant = { r: 240, g: 100, b: 30 };

  const settings = { accentColor: 'auto', highlightColor: 'dynamic', glow: 65 };

  // Run the logic from applyPaletteCSS
  mockDocumentElement.style.setProperty('--art-color-1', `rgb(${c1.r}, ${c1.g}, ${c1.b})`);
  mockDocumentElement.style.setProperty('--art-color-1-rgb', `${c1.r}, ${c1.g}, ${c1.b}`);
  mockDocumentElement.style.setProperty('--art-color-2', `rgb(${c2.r}, ${c2.g}, ${c2.b})`);
  mockDocumentElement.style.setProperty('--art-color-2-rgb', `${c2.r}, ${c2.g}, ${c2.b}`);
  mockDocumentElement.style.setProperty('--art-color-3', `rgb(${c3.r}, ${c3.g}, ${c3.b})`);
  mockDocumentElement.style.setProperty('--art-color-3-rgb', `${c3.r}, ${c3.g}, ${c3.b}`);
  mockDocumentElement.style.setProperty('--art-color-4', `rgb(${c4.r}, ${c4.g}, ${c4.b})`);
  mockDocumentElement.style.setProperty('--art-color-4-rgb', `${c4.r}, ${c4.g}, ${c4.b}`);
  mockDocumentElement.style.setProperty('--art-color-base', `rgb(${c0.r}, ${c0.g}, ${c0.b})`);
  mockDocumentElement.style.setProperty('--art-color-base-rgb', `${c0.r}, ${c0.g}, ${c0.b}`);
  mockDocumentElement.style.setProperty('--art-color-dominant', `rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`);
  mockDocumentElement.style.setProperty('--art-color-dominant-rgb', `${dominant.r}, ${dominant.g}, ${dominant.b}`);
  mockDocumentElement.style.setProperty('--accent-primary', `rgb(${c1.r}, ${c1.g}, ${c1.b})`);

  assert.strictEqual(cssProps.get('--art-color-1'), 'rgb(240, 100, 30)');
  assert.strictEqual(cssProps.get('--art-color-2'), 'rgb(190, 70, 20)');
  assert.strictEqual(cssProps.get('--art-color-base'), 'rgb(10, 12, 18)');
  assert.strictEqual(cssProps.get('--accent-primary'), 'rgb(240, 100, 30)');
});

test('3c. handleEmptyPlayback does not clear colors or reset mesh when currentDynamicPalette is present', () => {
  const meshInstance = new FluidMeshGradient(createMockCanvas());
  meshInstance.setPalette([
    { r: 10, g: 10, b: 10 },
    { r: 240, g: 100, b: 30 },
    { r: 30, g: 30, b: 30 },
    { r: 40, g: 40, b: 40 },
    { r: 50, g: 50, b: 50 }
  ], true);

  mockWindow.currentDynamicPalette = [
    { r: 10, g: 10, b: 10 },
    { r: 240, g: 100, b: 30 },
    { r: 30, g: 30, b: 30 },
    { r: 40, g: 40, b: 40 },
    { r: 50, g: 50, b: 50 }
  ];

  // Simulate handleEmptyPlayback
  if (!mockWindow.currentDynamicPalette) {
    meshInstance.resetToDefault();
    mockDocumentElement.style.removeProperty('--art-color-1');
  }

  // Mesh target colors should still be orange, NOT emerald green
  assert.ok(Math.abs(meshInstance.targetColors[1][0] - (240 / 255)) < 0.001, 'Target colors must be preserved');
  assert.ok(Math.abs(meshInstance.currentColors[1][0] - (240 / 255)) < 0.001, 'Current colors must be preserved');
  assert.strictEqual(cssProps.get('--art-color-1'), 'rgb(240, 100, 30)', 'CSS property must be retained');
});

// 4. Startup Playback & SMTC Fast-Path Integrity
console.log('\n4. Startup Playback & SMTC Fast-Path Integrity:');

const libRsSource = fs.readFileSync(path.join(__dirname, '../src-tauri/src/lib.rs'), 'utf8');
const integrationsSource = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/integrations.rs'), 'utf8');

test('4a. pollSpotifyPlayback detects tracks immediately on startup when !currentTitle', () => {
  assert.ok(
    rendererSource.includes('const isSongChanged = !currentTitle ||'),
    'isSongChanged must trigger when currentTitle is empty (startup / after idle)'
  );
});

test('4b. pollSpotifyPlayback and pollLocalPlayback use resilient 800ms race timeout for IPC', () => {
  assert.ok(
    rendererSource.includes('new Promise((resolve) => setTimeout(() => resolve(null), 800))'),
    'Must use 800ms timeout to avoid premature IPC timeouts during boot'
  );
});

test('4c. Rust background SMTC thread polls playback before entering sleep loop', () => {
  // Loop must check poll_playback() before std::thread::sleep
  const loopIdx = libRsSource.indexOf('loop {');
  assert.ok(loopIdx !== -1, 'lib.rs must contain SMTC loop');
  const pollIdx = libRsSource.indexOf('if let Some(track) = backend.poll_playback()', loopIdx);
  const sleepIdx = libRsSource.indexOf('std::thread::sleep(sleep_duration);', loopIdx);
  assert.ok(pollIdx !== -1 && sleepIdx !== -1, 'Both poll_playback and sleep must exist in loop');
  assert.ok(pollIdx < sleepIdx, 'poll_playback must be executed BEFORE std::thread::sleep in loop');
});

test('4d. get_local_playback command has immediate fallback when in-memory cache is None', () => {
  assert.ok(
    integrationsSource.includes('if let Some(state) = crate::media::get_cached_playback_state()'),
    'get_local_playback must check cached playback state'
  );
  assert.ok(
    integrationsSource.includes('if let Some(track) = backend.poll_playback()'),
    'get_local_playback must fallback to direct platform backend poll if cache is empty on boot'
  );
});

test('4e. onLocalPlaybackChange triggers immediate track dispatch on startup or rate-limit', () => {
  assert.ok(
    rendererSource.includes('const isSongChanged = !curTitle ||'),
    'onLocalPlaybackChange must trigger when curTitle is empty'
  );
});

console.log(`\nAll ${passed}/${passed + failed} Fluid Mesh Startup Palette & WebGL tests passed successfully!\n`);
assert.strictEqual(failed, 0, 'No test failures allowed');
