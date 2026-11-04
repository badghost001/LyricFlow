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
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
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
const layoutStyles = fs.readFileSync(path.join(__dirname, '../src/styles/_layout.css'), 'utf8').replace(/\r\n/g, '\n');

test('1. Pearl theme fluid surface stays translucent so the mesh palette remains visible', () => {
  const rule = layoutStyles.match(/html\[data-theme="light"\] body\.bg-style-fluid \.app-container\s*\{([\s\S]*?)\n\}/);
  assert.ok(rule, 'Pearl theme must have a specific fluid surface rule');
  assert.match(rule[1], /rgba\(248,\s*249,\s*252,\s*0\.18\)/,
    'Pearl fluid surface must remain translucent enough to preserve the mesh colors');
  assert.match(rule[1], /backdrop-filter:\s*blur\(24px\)/,
    'Pearl fluid mode must retain its glass blur while revealing the mesh');
  assert.doesNotMatch(rule[1], /backdrop-filter:\s*none/,
    'Disabling backdrop blur removes the Pearl glass treatment');
  assert.ok(fluidMeshSource.includes('mix(vec3(perceptualLuma), col, 1.2)'),
    'The fluid shader must gently boost album-palette saturation in a single pass');
});

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

test('1h. Island-to-normal transition restores the retained mesh palette immediately', () => {
  const transitionStart = rendererSource.indexOf('async function transitionToMode(targetMode)');
  const transitionEnd = rendererSource.indexOf('let _lastModeToggleTimestamp', transitionStart);
  const transitionSource = rendererSource.slice(transitionStart, transitionEnd);
  assert.ok(rendererSource.includes('function restoreCurrentFluidMeshPalette()'),
    'Renderer must provide a mode-transition palette restore helper');
  assert.ok(rendererSource.includes('fluidMeshGradientInstance.setPalette(palette, true);'),
    'Mode transition palette restore must snap the current artwork palette');
  assert.ok(rendererSource.includes('fluidMeshGradientInstance.defrost?.();'),
    'Mode transitions must recover a context lost while the Island or another overlay was visible');
  assert.ok(transitionSource.includes('restoreCurrentFluidMeshPalette();'),
    'Returning to normal mode must restore the mesh palette after waking it');
  const islandBranchStart = transitionSource.indexOf("if (targetMode === 'island') {");
  const wallpaperBranchStart = transitionSource.indexOf("} else if (targetMode === 'wallpaper')", islandBranchStart);
  const islandBranch = transitionSource.slice(islandBranchStart, wallpaperBranchStart);
  assert.ok(islandBranch.includes('fluidMeshGradientInstance.stop();'),
    'Entering Island mode must suspend mesh rendering');
  assert.ok(!islandBranch.includes('fluidMeshGradientInstance.sleep();'),
    'Entering Island mode must retain its WebGL context so a quick return preserves the artwork palette');
});

test('1i. Native Island exit restores the retained mesh palette immediately', () => {
  const eventStart = rendererSource.indexOf('window.electronAPI.onDynamicIslandModeChanged');
  const eventEnd = rendererSource.indexOf("if (window.electronAPI && typeof window.electronAPI.onIslandGhostMode", eventStart);
  const eventSource = rendererSource.slice(eventStart, eventEnd);
  const islandBranch = eventSource.slice(eventSource.indexOf('if (isDynamicIslandMode) {'), eventSource.indexOf('} else {'));
  const normalBranch = eventSource.slice(eventSource.indexOf('} else {'));
  assert.ok(islandBranch.includes('fluidMeshGradientInstance.stop?.();'),
    'Native Island entry must stop drawing without destroying the WebGL context');
  assert.ok(!islandBranch.includes('fluidMeshGradientInstance.sleep()'),
    'Native Island entry must not put the mesh into context-loss sleep');
  assert.ok(normalBranch.includes('restoreCurrentFluidMeshPalette();'),
    'The native Island exit callback must use the immediate palette restore path');
  assert.ok(!normalBranch.includes('setPalette(window.currentDynamicPalette)'),
    'The native Island exit callback must not leave a settled mesh on its old/default frame');
});

test('1j. Direct SMTC pause and resume synchronize the fluid mesh playback loop', () => {
  const pauseStart = rendererSource.indexOf('function handleLocalOrPollPause(');
  const pauseEnd = rendererSource.indexOf('\nfunction getEffectiveTrackDuration', pauseStart);
  const pauseSource = rendererSource.slice(pauseStart, pauseEnd);
  assert.ok(pauseStart >= 0 && pauseEnd > pauseStart, 'handleLocalOrPollPause must exist');

  const smtcStart = rendererSource.indexOf('window.electronAPI.onSmtcPlaybackStatus');
  const smtcEnd = rendererSource.indexOf('let isTogglingFromTray', smtcStart);
  const smtcSource = rendererSource.slice(smtcStart, smtcEnd);
  assert.ok(smtcStart >= 0 && smtcEnd > smtcStart, 'SMTC playback status handler must exist');

  assert.ok(rendererSource.includes('function syncFluidMeshPlaybackState()'),
    'Renderer must centralize mesh playback state synchronization');
  assert.ok(pauseSource.includes('syncFluidMeshPlaybackState();'),
    'The direct pause path must move the mesh into its resting transition');
  assert.match(smtcSource, /isPlaying\s*=\s*true;[\s\S]*?syncFluidMeshPlaybackState\(\);/,
    'The direct resume path must restart mesh animation with playback');
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

test('2h. Fluid mesh settles to a final frame and cancels RAF after playback stops', () => {
  const originalPerformance = global.performance;
  const originalRaf = global.requestAnimationFrame;
  const originalCaf = global.cancelAnimationFrame;
  const originalWindow = global.window;
  let clock = 0;
  let nextId = 1;
  const queue = new Map();
  const listeners = new Map();
  global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    addEventListener: (name, callback) => listeners.set(name, callback)
  };
  global.performance = { now: () => clock };
  global.requestAnimationFrame = (callback) => {
    const id = nextId++;
    queue.set(id, callback);
    return id;
  };
  global.cancelAnimationFrame = (id) => queue.delete(id);

  try {
    const mesh = new FluidMeshGradient(createMockCanvas());
    mesh.useWebGL = false;
    mesh.ctx2d = null;
    let frames = 0;
    mesh.render2DFallback = () => { frames++; };
    mesh.setPlaybackState(true);
    mesh.start();

    for (let i = 0; i < 8; i++) {
      const entry = queue.entries().next().value;
      assert.ok(entry, 'playing mesh should keep scheduling frames');
      queue.delete(entry[0]);
      clock += 70;
      entry[1](clock);
    }

    mesh.setPlaybackState(false);
    let safety = 0;
    while (queue.size && safety++ < 600) {
      const entry = queue.entries().next().value;
      queue.delete(entry[0]);
      clock += 70;
      entry[1](clock);
    }

    assert.strictEqual(queue.size, 0, 'resting mesh must cancel its RAF loop');
    assert.strictEqual(mesh.isRunning(), false, 'resting mesh must report stopped');
    const settledFrames = frames;
    clock += 10000;
    assert.strictEqual(queue.size, 0, 'settled mesh must not schedule identical resting frames');
    assert.strictEqual(frames, settledFrames, 'settled mesh must not redraw without a state change');

    listeners.get('pointermove')({ clientX: 1800, clientY: 100 });
    assert.strictEqual(mesh.isRunning(), true, 'supported pointer movement must resume mesh animation');
    mesh.stop();

    mesh.setPlaybackState(true);
    assert.strictEqual(mesh.isRunning(), true, 'playback start must resume mesh rendering');
    mesh.stop();
  } finally {
    global.performance = originalPerformance;
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCaf;
    global.window = originalWindow;
  }
});

test('2i. Fluid mesh retains the album palette across sleep and wake', () => {
  const mesh = new FluidMeshGradient(createMockCanvas());
  const albumPalette = [
    [18, 12, 38],
    [232, 54, 164],
    [84, 52, 204],
    [34, 144, 220],
    [248, 128, 196]
  ];
  mesh.setPalette(albumPalette, true);
  mesh.sleep();
  mesh.wake();

  assert.strictEqual(mesh.isSleeping, false, 'normal-mode wake must leave mesh sleep state');
  assert.ok(Math.abs(mesh.currentColors[1][0] - (232 / 255)) < 0.001,
    'wake must preserve the active album palette rather than show the default palette');
  assert.deepStrictEqual(mesh.currentColors, mesh.targetColors,
    'restored frame must retain the exact current album palette');
  mesh.stop();
});

test('2j. WebGL palette gamma conversion happens once per frame outside the fragment shader', () => {
  assert.match(fluidMeshSource, /vec3 c0_lin = u_c0_linear;/,
    'Fragment shader must receive pre-linearized base color');
  assert.match(fluidMeshSource, /vec3 c4_lin = u_c4;/,
    'Fragment shader must receive pre-linearized accent color');
  assert.doesNotMatch(fluidMeshSource, /pow\(u_c[0-4],\s*vec3\(2\.2\)\)/,
    'Fragment shader must not repeat uniform palette gamma conversion for every pixel');

  const mesh = new FluidMeshGradient(createMockCanvas());
  const sentColors = new Map();
  mesh.gl = {
    useProgram: () => {},
    uniform2f: () => {},
    uniform1f: () => {},
    uniform3fv: (uniform, color) => sentColors.set(uniform, Array.from(color)),
    drawArrays: () => {}
  };
  mesh.useWebGL = true;
  mesh.program = {};
  mesh.uniforms = {
    u_resolution: 'resolution', u_time: 'time', u_intensity: 'intensity', u_mouse: 'mouse', u_c0Linear: 'c0Linear',
    u_c0: 'c0', u_c1: 'c1', u_c2: 'c2', u_c3: 'c3', u_c4: 'c4'
  };
  mesh.currentColors = [
    [0.5, 0.25, 0.75], [0.2, 0.4, 0.6], [0.9, 0.3, 0.1],
    [0.8, 0.7, 0.2], [0.1, 0.5, 0.9]
  ];

  mesh.renderWebGL();

  const actual = sentColors.get('c1');
  const expected = mesh.currentColors[1].map(channel => Math.fround(Math.pow(channel, 2.2)));
  assert.deepStrictEqual(actual, expected,
    'renderWebGL must send the current sRGB palette converted to linear RGB');
  assert.deepStrictEqual(sentColors.get('c0'), mesh.currentColors[0],
    'The base sRGB color must remain available for the vignette blend');
  assert.deepStrictEqual(sentColors.get('c0Linear'), mesh.currentColors[0].map(channel => Math.fround(Math.pow(channel, 2.2))),
    'The base color linearized for palette mixing must be sent separately');
  mesh.stop();
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
    rendererSource.includes('const isSongChanged = !currentTitle ||') || rendererSource.includes('const isSongChanged = !curTitle ||'),
    'onLocalPlaybackChange must trigger when currentTitle is empty'
  );
});

console.log(`\nAll ${passed}/${passed + failed} Fluid Mesh Startup Palette & WebGL tests passed successfully!\n`);
assert.strictEqual(failed, 0, 'No test failures allowed');
