/**
 * tests/share-card.test.js
 * Unit tests for src/modules/share-card.js helper functions.
 * Run via: node tests/share-card.test.js
 */

// ─── Minimal environment stubs ──────────────────────────────────────────────

// Stub localStorage
global.localStorage = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; }
  };
})();

// Stub document so the IIFE can query selectors without crashing
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        getContext: () => ({
          measureText: (t) => ({ width: t.length * 7 }),
          fillText: () => {},
          fillRect: () => {},
          clearRect: () => {},
          save: () => {},
          restore: () => {},
          scale: () => {},
          drawImage: () => {},
          createLinearGradient: () => ({ addColorStop: () => {} }),
          createRadialGradient: () => ({ addColorStop: () => {} }),
          beginPath: () => {},
          arc: () => {},
          fill: () => {},
          stroke: () => {},
          clip: () => {},
          roundRect: () => {},
          moveTo: () => {},
          lineTo: () => {},
          ellipse: () => {},
          setTransform: () => {},
          resetTransform: () => {},
        }),
        toDataURL: () => 'data:image/png;base64,stub',
        toBlob: (cb) => cb(new Blob()),
        width: 0,
        height: 0,
        style: {}
      };
    }
    return { style: {}, className: '', textContent: '', innerHTML: '', appendChild: () => {}, addEventListener: () => {} };
  },
  createDocumentFragment: () => ({ appendChild: () => {} }),
  body: { classList: { add: () => {}, remove: () => {}, contains: () => false }, style: {} },
  addEventListener: () => {}
};
global.window = {
  electronAPI: null,
  _returnToIslandAfterShare: false,
};
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
global.Image = class { constructor() { setTimeout(() => this.onerror && this.onerror()); } };
global.Blob = class { constructor(p, o) { this.parts = p; this.type = o?.type || ''; } };
global.URL = { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} };
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Stub showToast (used inside share-card.js)
global.showToast = () => {};

// ─── Load the module ─────────────────────────────────────────────────────────
// share-card.js exposes test hooks via module.exports when running in Node
let mod;
try {
  mod = require('../src/modules/share-card.js');
} catch (e) {
  console.error('Failed to load share-card.js:', e.message);
  process.exit(1);
}

const {
  wrapText,
  truncateText,
  hexToRgba,
  getCardDimensions,
  getFontStack,
  getFormattedLyricsForShare,
  buildShareTextQuote,
} = mod;

// ─── Test harness ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function assertEqual(a, b, label) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}\n    Expected: ${JSON.stringify(b)}\n    Got:      ${JSON.stringify(a)}`);
    failed++;
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

console.log('\n── hexToRgba ──');
assert(typeof hexToRgba === 'function', 'hexToRgba is exported');
assertEqual(hexToRgba('#ff0000', 1), 'rgba(255, 0, 0, 1)', '#ff0000 → red');
assertEqual(hexToRgba('#00ff00', 0.5), 'rgba(0, 255, 0, 0.5)', '#00ff00 at 50% alpha');
assertEqual(hexToRgba('#0000ff', 0), 'rgba(0, 0, 255, 0)', '#0000ff fully transparent');
assertEqual(hexToRgba('#ffffff', 0.8), 'rgba(255, 255, 255, 0.8)', '#ffffff at 80% alpha');
// Short hex (#RGB) support
assert(hexToRgba('#000', 1) !== undefined, 'short hex does not throw');

console.log('\n── truncateText ──');
assert(typeof truncateText === 'function', 'truncateText is exported');
const fakeCtxTrunc = { measureText: (t) => ({ width: t.length * 8 }) };
assertEqual(truncateText(fakeCtxTrunc, 'Hello', 1000), 'Hello', 'no truncation when within limit');
const truncated = truncateText(fakeCtxTrunc, 'Hello World This Is A Long String', 40);
assert(truncated.endsWith('…') || truncated.length <= 7, 'truncates long string with ellipsis');

console.log('\n── wrapText ──');
assert(typeof wrapText === 'function', 'wrapText is exported');
const fakeCtx = { measureText: (t) => ({ width: t.length * 8 }) };
const lines = wrapText(fakeCtx, 'Hello World', 1000);
assert(Array.isArray(lines), 'returns an array');
assert(lines.length >= 1, 'at least one line returned');

// Wrapping should split at word boundary when text is wider than maxWidth
const narrowLines = wrapText(fakeCtx, 'Hello World', 40); // 40px — fits ~5 chars
assert(narrowLines.length >= 2, 'wraps into multiple lines for narrow maxWidth');

console.log('\n── getCardDimensions ──');
assert(typeof getCardDimensions === 'function', 'getCardDimensions is exported');

const story = getCardDimensions('story');
assert(story && story.width > 0 && story.height > 0, 'story format has dimensions');
assert(story.height > story.width, 'story is portrait (height > width)');

const square = getCardDimensions('square');
assert(square && square.width === square.height, 'square format is 1:1');

const landscape = getCardDimensions('landscape');
assert(landscape && landscape.width > landscape.height, 'landscape format is landscape (width > height)');

const feed = getCardDimensions('feed');
assert(feed && feed.height > feed.width, 'feed format is portrait (height > width)');

// Unknown format falls back gracefully
const unknown = getCardDimensions('unknown');
assert(unknown && unknown.width > 0, 'unknown format falls back to a default');

console.log('\n── getFontStack ──');
assert(typeof getFontStack === 'function', 'getFontStack is exported');

const modern = getFontStack('modern');
assert(typeof modern === 'string' && modern.length > 0, 'modern returns a string');

const serif = getFontStack('serif');
assert(serif.toLowerCase().includes('serif'), 'serif stack contains "serif"');

const mono = getFontStack('mono');
assert(mono.toLowerCase().includes('mono') || mono.toLowerCase().includes('courier'), 'mono stack has mono font');

const soft = getFontStack('soft');
assert(typeof soft === 'string' && soft.length > 0, 'soft returns a string');

// Unknown family falls back gracefully
const unknown2 = getFontStack('unknown');
assert(typeof unknown2 === 'string' && unknown2.length > 0, 'unknown family falls back');

console.log('\n── getFormattedLyricsForShare ──');
assert(typeof getFormattedLyricsForShare === 'function', 'getFormattedLyricsForShare is exported');

const sampleLines = [
  { text: 'Hello world', subText: 'Hola mundo', timeMs: 1000 },
  { text: 'Goodbye', subText: null, timeMs: 2000 },
];
const sampleIndices = [0, 1];

const original = getFormattedLyricsForShare(sampleIndices, sampleLines, 'original');
assert(Array.isArray(original), 'original mode returns an array');
assert(original.length === 2, 'original mode returns both lines');
assert(original.every(l => l && l.primary), 'each item has a primary text');
assert(original.every(l => !l.secondary), 'original mode has no secondary text');

const bilingual = getFormattedLyricsForShare(sampleIndices, sampleLines, 'bilingual');
assert(Array.isArray(bilingual) && bilingual.length > 0, 'bilingual mode returns an array');
assert(bilingual.some(l => l && l.secondary), 'bilingual mode includes secondary text where available');

const transOnly = getFormattedLyricsForShare(sampleIndices, sampleLines, 'translation');
assert(Array.isArray(transOnly), 'translation mode returns an array');
assert(transOnly.every(l => l && l.primary && l.primary.length > 0), 'translation mode has non-empty primary text');

console.log('\n── buildShareTextQuote ──');
assert(typeof buildShareTextQuote === 'function', 'buildShareTextQuote is exported');

const quote = buildShareTextQuote([0, 1], sampleLines, 'Test Song', 'Test Artist');
assert(typeof quote === 'string', 'returns a string');
assert(quote.includes('Hello'), 'includes lyric text');
assert(quote.includes('Test Song'), 'includes song title');
assert(quote.includes('Test Artist'), 'includes artist name');

// buildShareTextQuote formats a plain text quote with LyricFlow watermark
const bilingualQuote = buildShareTextQuote([0], sampleLines, 'Test Song', 'Test Artist');
assert(typeof bilingualQuote === 'string' && bilingualQuote.includes('LyricFlow'), 'quote includes LyricFlow watermark');

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`Share Card Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
