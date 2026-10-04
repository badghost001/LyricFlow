/**
 * tests/preview-m1-stress.test.js
 * Empirical stress tests for Milestone 1:
 * State persistence, preset transitions, and granular synchronization.
 *
 * Requirements tested:
 * 1. Custom → Classic → Cinematic → Custom cyclic switching preserves all custom keys.
 * 2. Rapid repeated switching does not degrade or lose state.
 * 3. Non-default and falsy custom values remain intact.
 * 4. Exported state and savedCustomConfig stay synchronized when granular controls change.
 * 5. Edge cases: Peeking drawer in preset modes, rapid random transitions, modal reopening.
 */

// ─── Environment Stubs ─────────────────────────────────────────────────────────

global.localStorage = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; }
  };
})();

class MockClassList {
  constructor() {
    this._set = new Set();
  }
  add(...names) { names.forEach(n => this._set.add(n)); }
  remove(...names) { names.forEach(n => this._set.delete(n)); }
  toggle(name, force) {
    if (typeof force === 'boolean') {
      if (force) this._set.add(name);
      else this._set.delete(name);
      return force;
    }
    if (this._set.has(name)) {
      this._set.delete(name);
      return false;
    } else {
      this._set.add(name);
      return true;
    }
  }
  contains(name) { return this._set.has(name); }
}

class MockDOMElement {
  constructor(tag, id = '', className = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = className;
    this.classList = new MockClassList();
    if (className) {
      className.split(/\s+/).filter(Boolean).forEach(c => this.classList.add(c));
    }
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.listeners = {};
    this.children = [];
    this.checked = false;
    this.textContent = '';
    this.innerHTML = '';
    this.scrollTop = 0;
    this.scrollHeight = 500;
    this.clientHeight = 200;
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  hasAttribute(k) { return k in this.attributes; }

  querySelector() { return null; }
  querySelectorAll() { return []; }
  appendChild(child) { this.children.push(child); }
  scrollTo() {}
  scrollIntoView() {}
  closest(sel) {
    if (sel === '.share-custom-chevron-btn' && this.classList.contains('share-custom-chevron-btn')) return this;
    return null;
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  dispatchEvent(eventObj) {
    const list = this.listeners[eventObj.type] || [];
    for (const fn of list) {
      fn(eventObj);
    }
  }

  click() {
    const event = {
      type: 'click',
      target: this,
      preventDefault: () => {},
      stopPropagation: () => {},
      closest: (sel) => {
        if (sel === '.share-custom-chevron-btn' && this.classList.contains('share-custom-chevron-btn')) return this;
        return null;
      }
    };
    this.dispatchEvent(event);
  }

  change(newChecked) {
    this.checked = newChecked;
    const event = {
      type: 'change',
      target: this,
      preventDefault: () => {},
      stopPropagation: () => {}
    };
    this.dispatchEvent(event);
  }

  getBoundingClientRect() {
    return { top: 100, bottom: 300, left: 0, right: 200, height: 200, width: 200 };
  }

  getContext() {
    return {
      measureText: (t) => ({ width: (t?.length || 0) * 7 }),
      fillText: () => {},
      fillRect: () => {},
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      drawImage: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createPattern: () => ({}),
      createImageData: () => ({ data: new Uint8ClampedArray(128 * 128 * 4) }),
      putImageData: () => {},
      beginPath: () => {},
      closePath: () => {},
      rect: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      roundRect: () => {},
      moveTo: () => {},
      lineTo: () => {},
      quadraticCurveTo: () => {},
      strokeRect: () => {},
      ellipse: () => {},
      setTransform: () => {},
      resetTransform: () => {},
    };
  }
}

const domRegistry = new Map();

function registerElement(el) {
  if (el.id) domRegistry.set('#' + el.id, el);
  return el;
}

// Pre-create modal elements
const modalRoot = registerElement(new MockDOMElement('div', 'share-card-modal'));
const canvas = registerElement(new MockDOMElement('canvas', 'share-preview-canvas'));
const controlsPane = registerElement(new MockDOMElement('div', 'share-controls-pane', 'share-controls-pane'));
const scrollArea = registerElement(new MockDOMElement('div', 'share-controls-scroll-area', 'share-controls-scroll-area'));
const customCard = registerElement(new MockDOMElement('div', 'preset-card-custom', 'share-custom-card'));
const chevronBtn = registerElement(new MockDOMElement('button', 'share-custom-chevron-btn', 'share-custom-chevron-btn'));
const drawer = registerElement(new MockDOMElement('div', 'share-custom-controls-drawer', 'share-custom-controls-drawer'));
const linePicker = registerElement(new MockDOMElement('div', 'share-line-picker', 'share-line-picker'));
const transSection = registerElement(new MockDOMElement('div', 'share-trans-section', 'share-trans-section'));

// Preset cards
const presetCardClassic = registerElement(new MockDOMElement('div', 'preset-card-classic', 'share-preset-card'));
presetCardClassic.dataset.design = 'classic';
const presetCardCinematic = registerElement(new MockDOMElement('div', 'preset-card-cinematic', 'share-preset-card'));
presetCardCinematic.dataset.design = 'cinematic';

// Granular controls
const ratioStory = new MockDOMElement('button', '', 'share-ratio-btn'); ratioStory.dataset.ratio = 'story';
const ratioSquare = new MockDOMElement('button', '', 'share-ratio-btn'); ratioSquare.dataset.ratio = 'square';
const ratioLandscape = new MockDOMElement('button', '', 'share-ratio-btn'); ratioLandscape.dataset.ratio = 'landscape';
const ratioFeed = new MockDOMElement('button', '', 'share-ratio-btn'); ratioFeed.dataset.ratio = 'portrait';
const ratioBtns = [ratioStory, ratioSquare, ratioLandscape, ratioFeed];

const themeMesh = new MockDOMElement('div', '', 'share-theme-card'); themeMesh.dataset.theme = 'mesh';
const themeVinyl = new MockDOMElement('div', '', 'share-theme-card'); themeVinyl.dataset.theme = 'vinyl';
const themeObsidian = new MockDOMElement('div', '', 'share-theme-card'); themeObsidian.dataset.theme = 'obsidian';
const themeCards = [themeMesh, themeVinyl, themeObsidian];

const fontSans = new MockDOMElement('button', '', 'share-font-btn'); fontSans.dataset.font = 'sans';
const fontSerif = new MockDOMElement('button', '', 'share-font-btn'); fontSerif.dataset.font = 'serif';
const fontMono = new MockDOMElement('button', '', 'share-font-btn'); fontMono.dataset.font = 'mono';
const fontBtns = [fontSans, fontSerif, fontMono];

const scaleNormal = new MockDOMElement('button', '', 'share-scale-btn'); scaleNormal.dataset.scale = 'normal';
const scaleHeroic = new MockDOMElement('button', '', 'share-scale-btn'); scaleHeroic.dataset.scale = 'heroic';
const scaleBtns = [scaleNormal, scaleHeroic];

const alignCenter = new MockDOMElement('button', '', 'share-align-btn'); alignCenter.dataset.align = 'center';
const alignLeft = new MockDOMElement('button', '', 'share-align-btn'); alignLeft.dataset.align = 'left';
const alignBtns = [alignCenter, alignLeft];

const transOrig = new MockDOMElement('button', '', 'share-trans-btn'); transOrig.dataset.trans = 'original';
const transBi = new MockDOMElement('button', '', 'share-trans-btn'); transBi.dataset.trans = 'bilingual';
const transBtns = [transOrig, transBi];

const toggleWatermark = registerElement(new MockDOMElement('input', 'share-toggle-watermark'));
const toggleTimestamp = registerElement(new MockDOMElement('input', 'share-toggle-timestamp'));
const toggleArt = registerElement(new MockDOMElement('input', 'share-toggle-art'));
const toggleScrubber = registerElement(new MockDOMElement('input', 'share-toggle-scrubber'));
const toggleGrain = registerElement(new MockDOMElement('input', 'share-toggle-grain'));
const toggle2x = registerElement(new MockDOMElement('input', 'share-toggle-2x'));

const previewClassic = registerElement(new MockDOMElement('canvas', 'preset-preview-classic'));
const previewCinematic = registerElement(new MockDOMElement('canvas', 'preset-preview-cinematic'));

global.document = {
  documentElement: {},
  getElementById: (id) => domRegistry.get('#' + id) || null,
  querySelector: (sel) => {
    if (sel.startsWith('#')) return domRegistry.get(sel) || null;
    if (sel === '.share-controls-pane') return controlsPane;
    if (sel === '.share-custom-chevron-btn') return chevronBtn;
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel === '.share-ratio-btn') return ratioBtns;
    if (sel === '.share-theme-card') return themeCards;
    if (sel === '.share-font-btn') return fontBtns;
    if (sel === '.share-scale-btn') return scaleBtns;
    if (sel === '.share-align-btn') return alignBtns;
    if (sel === '.share-trans-btn') return transBtns;
    if (sel === '.share-preset-card') return [presetCardClassic, presetCardCinematic];
    return [];
  },
  createElement: (tag) => new MockDOMElement(tag),
  createDocumentFragment: () => new MockDOMElement('div'),
  body: new MockDOMElement('body'),
  addEventListener: () => {},
  fonts: { ready: Promise.resolve() }
};

global.window = global;
global.window.addEventListener = () => {};
global.getComputedStyle = () => ({ getPropertyValue: () => '#1DB954' });
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
global.Image = class {
  constructor() {
    this.complete = true;
    this.naturalWidth = 500;
    this.naturalHeight = 500;
    setTimeout(() => this.onload && this.onload());
  }
};
global.Blob = class { constructor(p, o) { this.parts = p; this.type = o?.type || ''; } };
global.URL = { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} };
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.showToast = () => {};
global.lyrics = [
  { text: 'Look at the stars, look how they shine for you', subText: 'And everything you do', timeMs: 12000 }
];

// ─── Load Module ──────────────────────────────────────────────────────────────
const mod = require('../src/modules/share-card.js');
const {
  shareState,
  savedCustomConfig,
  applyPreset,
  activateCustomMode,
  toggleCustomDrawerOnly,
  toggleCustomMode,
  syncSavedCustomConfigFromState,
  restoreCustomConfigToState,
  markCustomModeActive,
  SHARE_CARD_PRESETS
} = mod;

// Initialize modal and bind event listeners once
global.openShareModal();

// ─── Test Runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failureDetails = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failed++;
    failureDetails.push({ test: name, error: err });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message || 'Mismatch'}\n    Expected: ${expectedStr}\n    Actual:   ${actualStr}`);
  }
}

console.log('════════════════════════════════════════════════════════════════');
console.log('   Empirical Challenger: Milestone 1 Stress Test Harness        ');
console.log('════════════════════════════════════════════════════════════════\n');

// ─── SUITE 1: Cyclic Switching Preserves All Custom Keys ──────────────────────
console.log('── Suite 1: Custom → Classic → Cinematic → Custom Cyclic Switching ──');

test('1.1: Default custom values preserved across full cycle', () => {
  // Set custom mode with defaults
  activateCustomMode(false);
  const initialKeys = { ...savedCustomConfig };

  applyPreset('classic', false);
  assertEqual(shareState.designMode, 'classic', 'classic activated');
  assertEqual(shareState.theme, 'classic', 'classic theme applied');

  applyPreset('cinematic', false);
  assertEqual(shareState.designMode, 'cinematic', 'cinematic activated');
  assertEqual(shareState.theme, 'cinematic', 'cinematic theme applied');

  activateCustomMode(false);
  assertEqual(shareState.designMode, 'custom', 'custom re-activated');

  // Verify all 12 keys
  const expectedKeys = [
    'format', 'theme', 'transMode', 'fontFamily', 'textAlign', 'fontScale',
    'showAlbumArt', 'showScrubber', 'showGrain', 'showWatermark', 'showTimestamp', 'export2x'
  ];
  for (const k of expectedKeys) {
    assertEqual(shareState[k], initialKeys[k], `shareState.${k} preserved after cycle`);
    assertEqual(savedCustomConfig[k], initialKeys[k], `savedCustomConfig.${k} preserved after cycle`);
  }
});

test('1.2: All 12 custom keys modified to distinct non-default values across full cycle', () => {
  const customSpec = {
    format: 'landscape',
    theme: 'vinyl',
    transMode: 'bilingual',
    fontFamily: 'serif',
    textAlign: 'left',
    fontScale: 'heroic',
    showAlbumArt: false,
    showScrubber: false,
    showGrain: false,
    showWatermark: false,
    showTimestamp: true,
    export2x: false
  };

  activateCustomMode(false);
  Object.assign(shareState, customSpec);
  syncSavedCustomConfigFromState();

  // Verify saved config matches
  for (const [k, v] of Object.entries(customSpec)) {
    assertEqual(savedCustomConfig[k], v, `Pre-cycle savedCustomConfig.${k} is set`);
  }

  // Switch to Classic
  applyPreset('classic', false);
  assertEqual(shareState.designMode, 'classic');
  assertEqual(shareState.theme, 'classic');
  assertEqual(shareState.format, 'story'); // classic preset defaults to story

  // Verify savedCustomConfig is NOT corrupted by Classic
  for (const [k, v] of Object.entries(customSpec)) {
    assertEqual(savedCustomConfig[k], v, `savedCustomConfig.${k} intact while in Classic`);
  }

  // Switch to Cinematic
  applyPreset('cinematic', false);
  assertEqual(shareState.designMode, 'cinematic');
  assertEqual(shareState.theme, 'cinematic');
  assertEqual(shareState.fontScale, 'large'); // cinematic preset defaults to large

  // Verify savedCustomConfig is NOT corrupted by Cinematic
  for (const [k, v] of Object.entries(customSpec)) {
    assertEqual(savedCustomConfig[k], v, `savedCustomConfig.${k} intact while in Cinematic`);
  }

  // Switch to Custom via activateCustomMode(false)
  activateCustomMode(false);
  assertEqual(shareState.designMode, 'custom');

  // Verify all 12 keys restored to shareState
  for (const [k, v] of Object.entries(customSpec)) {
    assertEqual(shareState[k], v, `shareState.${k} fully restored to custom value`);
    assertEqual(savedCustomConfig[k], v, `savedCustomConfig.${k} still intact`);
  }
});

test('1.3: Cycling via applyPreset("custom") delegates to activateCustomMode and restores state', () => {
  const customSpec = {
    format: 'square',
    theme: 'obsidian',
    transMode: 'translation',
    fontFamily: 'mono',
    textAlign: 'right',
    fontScale: 'compact',
    showAlbumArt: false,
    showScrubber: true,
    showGrain: false,
    showWatermark: false,
    showTimestamp: true,
    export2x: false
  };

  activateCustomMode(false);
  Object.assign(shareState, customSpec);
  syncSavedCustomConfigFromState();

  applyPreset('classic', false);
  applyPreset('cinematic', false);
  // Using applyPreset('custom') instead of activateCustomMode directly
  applyPreset('custom', false);

  assertEqual(shareState.designMode, 'custom', 'applyPreset("custom") activates custom');
  for (const [k, v] of Object.entries(customSpec)) {
    assertEqual(shareState[k], v, `shareState.${k} restored via applyPreset("custom")`);
  }
});

test('1.4: Metadata and non-visual state (trackTitle, selectedIndices, etc.) are unperturbed', () => {
  shareState.trackTitle = 'Bohemian Rhapsody';
  shareState.artistName = 'Queen';
  shareState.selectedIndices = [2, 3, 5];
  shareState.heroIndex = 3;
  shareState.palette = ['#ff0055', '#330022'];

  applyPreset('classic', false);
  applyPreset('cinematic', false);
  applyPreset('custom', false);

  assertEqual(shareState.trackTitle, 'Bohemian Rhapsody');
  assertEqual(shareState.artistName, 'Queen');
  assertEqual(shareState.selectedIndices, [2, 3, 5]);
  assertEqual(shareState.heroIndex, 3);
  assertEqual(shareState.palette, ['#ff0055', '#330022']);
});

// ─── SUITE 2: Rapid Repeated Switching ────────────────────────────────────────
console.log('\n── Suite 2: Rapid Repeated Switching Stress ──');

test('2.1: 500 cyclic transitions (Custom → Classic → Cinematic → Custom)', () => {
  const customSpec = {
    format: 'landscape',
    theme: 'cassette',
    transMode: 'bilingual',
    fontFamily: 'serif',
    textAlign: 'left',
    fontScale: 'heroic',
    showAlbumArt: false,
    showScrubber: false,
    showGrain: true,
    showWatermark: false,
    showTimestamp: true,
    export2x: false
  };

  activateCustomMode(false);
  Object.assign(shareState, customSpec);
  syncSavedCustomConfigFromState();

  const iterations = 500;
  for (let i = 0; i < iterations; i++) {
    applyPreset('classic', false);
    applyPreset('cinematic', false);
    activateCustomMode(false);
  }

  assertEqual(shareState.designMode, 'custom');
  for (const [k, v] of Object.entries(customSpec)) {
    assertEqual(shareState[k], v, `shareState.${k} intact after ${iterations} cycles`);
    assertEqual(savedCustomConfig[k], v, `savedCustomConfig.${k} intact after ${iterations} cycles`);
  }
});

test('2.2: 1000 random preset transitions among classic, cinematic, custom', () => {
  const customSpec = {
    format: 'square',
    theme: 'bloom',
    transMode: 'translation',
    fontFamily: 'soft',
    textAlign: 'center',
    fontScale: 'large',
    showAlbumArt: true,
    showScrubber: false,
    showGrain: false,
    showWatermark: false,
    showTimestamp: true,
    export2x: true
  };

  activateCustomMode(false);
  Object.assign(shareState, customSpec);
  syncSavedCustomConfigFromState();

  const presets = ['classic', 'cinematic', 'custom'];
  let pseudoRandom = 42;
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    pseudoRandom = (pseudoRandom * 1664525 + 1013904223) % 4294967296;
    const choice = presets[Math.floor((pseudoRandom / 4294967296) * presets.length)];
    if (choice === 'custom') {
      activateCustomMode(false);
    } else {
      applyPreset(choice, false);
    }
  }

  // Finally ensure return to custom
  activateCustomMode(false);
  assertEqual(shareState.designMode, 'custom');
  for (const [k, v] of Object.entries(customSpec)) {
    assertEqual(shareState[k], v, `shareState.${k} intact after 1000 random switches`);
    assertEqual(savedCustomConfig[k], v, `savedCustomConfig.${k} intact after 1000 random switches`);
  }
});

test('2.3: Repeated identical preset calls do not corrupt state', () => {
  const customSpec = {
    format: 'portrait',
    theme: 'sunset',
    transMode: 'original',
    fontFamily: 'mono',
    textAlign: 'right',
    fontScale: 'compact',
    showAlbumArt: false,
    showScrubber: false,
    showGrain: false,
    showWatermark: false,
    showTimestamp: false,
    export2x: false
  };

  activateCustomMode(false);
  Object.assign(shareState, customSpec);
  syncSavedCustomConfigFromState();

  // Repeated custom activations
  activateCustomMode(false);
  activateCustomMode(false);
  applyPreset('custom', false);

  for (const [k, v] of Object.entries(customSpec)) {
    assertEqual(shareState[k], v, `shareState.${k} intact after repeated custom calls`);
  }

  // Switch to classic multiple times
  applyPreset('classic', false);
  applyPreset('classic', false);
  applyPreset('classic', false);
  assertEqual(shareState.designMode, 'classic');

  // Verify savedCustomConfig was not wiped by repeated classic calls
  for (const [k, v] of Object.entries(customSpec)) {
    assertEqual(savedCustomConfig[k], v, `savedCustomConfig.${k} intact after repeated classic calls`);
  }

  activateCustomMode(false);
  for (const [k, v] of Object.entries(customSpec)) {
    assertEqual(shareState[k], v, `shareState.${k} restored after repeated classic calls`);
  }
});

// ─── SUITE 3: Non-default and Falsy Values Retention ──────────────────────────
console.log('\n── Suite 3: Non-Default and Falsy Custom Values Retention ──');

test('3.1: All falsy booleans retain false across preset transitions', () => {
  activateCustomMode(false);
  shareState.showAlbumArt = false;
  shareState.showScrubber = false;
  shareState.showGrain = false;
  shareState.showWatermark = false;
  shareState.export2x = false;
  syncSavedCustomConfigFromState();

  // Both Classic and Cinematic presets set showAlbumArt: true, showScrubber: true, showGrain: true, showWatermark: true
  applyPreset('classic', false);
  assertEqual(shareState.showAlbumArt, true, 'Classic preset has showAlbumArt true');
  assertEqual(shareState.showWatermark, true, 'Classic preset has showWatermark true');

  applyPreset('cinematic', false);
  assertEqual(shareState.showGrain, true, 'Cinematic preset has showGrain true');

  activateCustomMode(false);
  assertEqual(shareState.showAlbumArt, false, 'showAlbumArt false retained in custom');
  assertEqual(shareState.showScrubber, false, 'showScrubber false retained in custom');
  assertEqual(shareState.showGrain, false, 'showGrain false retained in custom');
  assertEqual(shareState.showWatermark, false, 'showWatermark false retained in custom');
  assertEqual(shareState.export2x, false, 'export2x false retained in custom');
});

test('3.2: Non-default showTimestamp: true retains true', () => {
  activateCustomMode(false);
  shareState.showTimestamp = true;
  syncSavedCustomConfigFromState();

  // Classic and Cinematic both define showTimestamp: false
  applyPreset('classic', false);
  assertEqual(shareState.showTimestamp, false, 'Classic has showTimestamp false');

  applyPreset('cinematic', false);
  assertEqual(shareState.showTimestamp, false, 'Cinematic has showTimestamp false');

  activateCustomMode(false);
  assertEqual(shareState.showTimestamp, true, 'showTimestamp true retained in custom');
});

test('3.3: All non-default string themes, formats, fonts, scales, alignments', () => {
  const themes = ['mesh', 'obsidian', 'vinyl', 'cassette', 'bloom', 'sunset', 'glass', 'aurora', 'editorial', 'cyberpunk'];
  for (const theme of themes) {
    activateCustomMode(false);
    shareState.theme = theme;
    syncSavedCustomConfigFromState();

    applyPreset('classic', false);
    applyPreset('cinematic', false);
    activateCustomMode(false);

    assertEqual(shareState.theme, theme, `Theme ${theme} preserved through cycle`);
  }

  const formats = ['story', 'square', 'portrait', 'landscape'];
  for (const fmt of formats) {
    activateCustomMode(false);
    shareState.format = fmt;
    syncSavedCustomConfigFromState();

    applyPreset('classic', false);
    applyPreset('cinematic', false);
    activateCustomMode(false);

    assertEqual(shareState.format, fmt, `Format ${fmt} preserved through cycle`);
  }

  const fontScales = ['compact', 'normal', 'large', 'heroic'];
  for (const scale of fontScales) {
    activateCustomMode(false);
    shareState.fontScale = scale;
    syncSavedCustomConfigFromState();

    applyPreset('classic', false);
    applyPreset('cinematic', false);
    activateCustomMode(false);

    assertEqual(shareState.fontScale, scale, `Font scale ${scale} preserved through cycle`);
  }
});

// ─── SUITE 4: Granular Control Synchronization ────────────────────────────────
console.log('\n── Suite 4: Granular Controls Synchronization ──');

test('4.1: DOM click on granular ratio button updates both shareState and savedCustomConfig', () => {
  activateCustomMode(false);
  ratioLandscape.click();

  assertEqual(shareState.format, 'landscape', 'shareState.format updated by DOM click');
  assertEqual(savedCustomConfig.format, 'landscape', 'savedCustomConfig.format updated by DOM click');
  assert(ratioLandscape.classList.contains('active'), 'Landscape button got active class');
});

test('4.2: DOM click on theme card updates both shareState and savedCustomConfig', () => {
  activateCustomMode(false);
  themeVinyl.click();

  assertEqual(shareState.theme, 'vinyl', 'shareState.theme updated by DOM click');
  assertEqual(savedCustomConfig.theme, 'vinyl', 'savedCustomConfig.theme updated by DOM click');
  assert(shareState.userPickedTheme, 'userPickedTheme marked true');
});

test('4.3: DOM change on checkbox toggles updates both shareState and savedCustomConfig', () => {
  activateCustomMode(false);

  toggleWatermark.change(false);
  assertEqual(shareState.showWatermark, false, 'shareState.showWatermark updated');
  assertEqual(savedCustomConfig.showWatermark, false, 'savedCustomConfig.showWatermark updated');

  toggleTimestamp.change(true);
  assertEqual(shareState.showTimestamp, true, 'shareState.showTimestamp updated');
  assertEqual(savedCustomConfig.showTimestamp, true, 'savedCustomConfig.showTimestamp updated');

  toggleArt.change(false);
  assertEqual(shareState.showAlbumArt, false, 'shareState.showAlbumArt updated');
  assertEqual(savedCustomConfig.showAlbumArt, false, 'savedCustomConfig.showAlbumArt updated');

  toggleScrubber.change(false);
  assertEqual(shareState.showScrubber, false, 'shareState.showScrubber updated');
  assertEqual(savedCustomConfig.showScrubber, false, 'savedCustomConfig.showScrubber updated');

  toggleGrain.change(false);
  assertEqual(shareState.showGrain, false, 'shareState.showGrain updated');
  assertEqual(savedCustomConfig.showGrain, false, 'savedCustomConfig.showGrain updated');

  toggle2x.change(false);
  assertEqual(shareState.export2x, false, 'shareState.export2x updated');
  assertEqual(savedCustomConfig.export2x, false, 'savedCustomConfig.export2x updated');
});

test('4.4: Granular modifications persist across preset switches after DOM clicks', () => {
  activateCustomMode(false);
  fontMono.click();
  scaleHeroic.click();
  alignLeft.click();
  transBi.click();

  assertEqual(shareState.fontFamily, 'mono');
  assertEqual(shareState.fontScale, 'heroic');
  assertEqual(shareState.textAlign, 'left');
  assertEqual(shareState.transMode, 'bilingual');

  // Switch away to Classic
  applyPreset('classic', false);
  assertEqual(shareState.fontFamily, 'sans');
  assertEqual(shareState.fontScale, 'normal');

  // Switch to Custom
  activateCustomMode(false);
  assertEqual(shareState.fontFamily, 'mono', 'fontFamily restored');
  assertEqual(shareState.fontScale, 'heroic', 'fontScale restored');
  assertEqual(shareState.textAlign, 'left', 'textAlign restored');
  assertEqual(shareState.transMode, 'bilingual', 'transMode restored');
});

// ─── SUITE 5: Accordion Chevron & Modal Interaction Decoupling ─────────────────
console.log('\n── Suite 5: Accordion Chevron & Interaction Decoupling ──');

test('5.1: Chevron button click toggles drawer WITHOUT changing active preset', () => {
  applyPreset('classic', false);
  assertEqual(shareState.designMode, 'classic');

  // Toggle drawer open via chevron
  chevronBtn.click();
  assertEqual(shareState.designMode, 'classic', 'designMode stays classic when opening drawer');
  assert(controlsPane.classList.contains('drawer-open'), 'drawer is opened');
  assertEqual(customCard.getAttribute('aria-expanded'), 'true', 'aria-expanded is true on custom card');
  assertEqual(chevronBtn.getAttribute('aria-expanded'), 'true', 'aria-expanded is true on chevron');

  // Toggle drawer closed via chevron
  chevronBtn.click();
  assertEqual(shareState.designMode, 'classic', 'designMode still classic after closing drawer');
  assert(!controlsPane.classList.contains('drawer-open'), 'drawer is closed');
  assertEqual(customCard.getAttribute('aria-expanded'), 'false', 'aria-expanded is false');
  assertEqual(chevronBtn.getAttribute('aria-expanded'), 'false', 'aria-expanded is false');
});

test('5.2: Clicking custom card activates Custom and opens drawer', () => {
  applyPreset('cinematic', false);
  assertEqual(shareState.designMode, 'cinematic');

  customCard.click();
  assertEqual(shareState.designMode, 'custom', 'custom activated by card click');
  assert(controlsPane.classList.contains('drawer-open'), 'drawer opened by card click');
  assertEqual(customCard.getAttribute('aria-expanded'), 'true');
});

test('5.3: Keyboard interaction (Enter & Space) on customCard and chevronBtn', () => {
  applyPreset('classic', false);
  assertEqual(shareState.designMode, 'classic');

  // Space key on chevron opens drawer without switching preset
  chevronBtn.dispatchEvent({
    type: 'keydown',
    key: ' ',
    preventDefault: () => {},
    stopPropagation: () => {}
  });
  assertEqual(shareState.designMode, 'classic', 'Space on chevron preserves classic mode');
  assert(controlsPane.classList.contains('drawer-open'), 'Space on chevron opens drawer');

  // Enter key on chevron closes drawer without switching preset
  chevronBtn.dispatchEvent({
    type: 'keydown',
    key: 'Enter',
    preventDefault: () => {},
    stopPropagation: () => {}
  });
  assertEqual(shareState.designMode, 'classic', 'Enter on chevron preserves classic mode');
  assert(!controlsPane.classList.contains('drawer-open'), 'Enter on chevron closes drawer');

  // Enter key on custom card activates custom mode and opens drawer
  customCard.dispatchEvent({
    type: 'keydown',
    key: 'Enter',
    target: customCard,
    preventDefault: () => {},
    stopPropagation: () => {}
  });
  assertEqual(shareState.designMode, 'custom', 'Enter on custom card activates custom');
  assert(controlsPane.classList.contains('drawer-open'), 'Enter on custom card opens drawer');
});

test('5.4: Custom mode collapse and reopen drawer preserves modified settings', () => {
  activateCustomMode(false);
  ratioFeed.click();
  themeObsidian.click();
  toggleWatermark.change(false);

  assertEqual(shareState.format, 'portrait');
  assertEqual(shareState.theme, 'obsidian');
  assertEqual(shareState.showWatermark, false);

  // Collapse drawer via chevron
  chevronBtn.click();
  assert(!controlsPane.classList.contains('drawer-open'), 'drawer collapsed');
  assertEqual(shareState.designMode, 'custom');

  // Reopen drawer via chevron
  chevronBtn.click();
  assert(controlsPane.classList.contains('drawer-open'), 'drawer reopened');
  assertEqual(shareState.designMode, 'custom');
  assertEqual(shareState.format, 'portrait', 'format preserved after accordion toggle');
  assertEqual(shareState.theme, 'obsidian', 'theme preserved after accordion toggle');
  assertEqual(shareState.showWatermark, false, 'showWatermark preserved after accordion toggle');
});

// ─── SUITE 6: Deep Edge Case & Hostile Attack Surface ─────────────────────────
console.log('\n── Suite 6: Deep Edge Case & Hostile Attack Surface ──');

test('6.1: Granular modification after card activation works seamlessly', () => {
  // Normal workflow: select Custom card, then edit a setting
  customCard.click();
  assertEqual(shareState.designMode, 'custom');
  fontSerif.click();
  assertEqual(shareState.fontFamily, 'serif');
  assertEqual(savedCustomConfig.fontFamily, 'serif');

  // Switch to Classic and back
  applyPreset('classic', false);
  customCard.click();
  assertEqual(shareState.fontFamily, 'serif');
});

test('6.2: Modal close and reopen maintains custom state', () => {
  activateCustomMode(false);
  themeObsidian.click();
  ratioSquare.click();
  assertEqual(shareState.theme, 'obsidian');
  assertEqual(shareState.format, 'square');

  // Simulate close and reopen
  global.closeShareModal();
  assertEqual(modalRoot.classList.contains('is-open'), false);

  global.openShareModal();
  assertEqual(modalRoot.classList.contains('is-open'), true);
  assertEqual(shareState.designMode, 'custom');
  assertEqual(shareState.theme, 'obsidian');
  assertEqual(shareState.format, 'square');
  assert(controlsPane.classList.contains('drawer-open'));
});

test('6.3: Interleaved random user operations (300 cycles of presets, granular clicks, toggles)', () => {
  activateCustomMode(false);
  const possibleRatios = [ratioStory, ratioSquare, ratioLandscape, ratioFeed];
  const possibleThemes = [themeMesh, themeVinyl, themeObsidian];
  const possibleFonts = [fontSans, fontSerif, fontMono];
  const possibleScales = [scaleNormal, scaleHeroic];
  const possibleAligns = [alignCenter, alignLeft];

  let rand = 777;
  for (let cycle = 0; cycle < 300; cycle++) {
    rand = (rand * 1103515245 + 12345) & 0x7fffffff;
    const op = rand % 6;

    if (op === 0) {
      // User activates custom card
      customCard.click();
    } else if (op === 1) {
      // User switches to Classic
      applyPreset('classic', false);
    } else if (op === 2) {
      // User switches to Cinematic
      applyPreset('cinematic', false);
    } else if (op === 3) {
      // User toggles chevron
      chevronBtn.click();
    } else if (op === 4) {
      // User modifies a granular control while ensuring in custom mode
      if (shareState.designMode !== 'custom') {
        customCard.click();
      }
      possibleRatios[cycle % possibleRatios.length].click();
      possibleThemes[cycle % possibleThemes.length].click();
      possibleFonts[cycle % possibleFonts.length].click();
      possibleScales[cycle % possibleScales.length].click();
      possibleAligns[cycle % possibleAligns.length].click();
      toggleWatermark.change(cycle % 2 === 0);
      toggleTimestamp.change(cycle % 3 === 0);
    } else if (op === 5) {
      // Modal close and reopen
      global.closeShareModal();
      global.openShareModal();
    }
  }

  // After 300 chaotic operations, user activates custom mode
  customCard.click();
  assertEqual(shareState.designMode, 'custom');

  // Verify all 12 keys are valid and matching in shareState and savedCustomConfig
  const expectedKeys = [
    'format', 'theme', 'transMode', 'fontFamily', 'textAlign', 'fontScale',
    'showAlbumArt', 'showScrubber', 'showGrain', 'showWatermark', 'showTimestamp', 'export2x'
  ];
  for (const k of expectedKeys) {
    assert(shareState[k] !== undefined && shareState[k] !== null, `shareState.${k} is defined`);
    assertEqual(shareState[k], savedCustomConfig[k], `shareState.${k} === savedCustomConfig.${k}`);
  }
});

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(64)}`);
console.log(`Stress Test Results: ${passed} passed, ${failed} failed`);
if (failureDetails.length > 0) {
  console.log('\nFailed Tests:');
  failureDetails.forEach(f => console.log(` - ${f.test}: ${f.error.message}`));
}
console.log(`${'═'.repeat(64)}`);

if (failed > 0) process.exit(1);
