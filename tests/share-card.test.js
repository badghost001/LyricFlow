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
  hexToRgbObj,
  hexToRgba,
  getCardDimensions,
  getFontStack,
  getScaleMultiplier,
  formatLyricTimestamp,
  getFormattedLyricsForShare,
  buildShareTextQuote,
  drawScrubberBar,
  drawFilmGrain,
  drawFloatingMetadataPill,
  drawLandscapeMetadataCard,
  drawThemeBackground,
  renderCardContent,
  normalizeHarmonicPalette,
  tokenizeText,
  SHARE_CARD_PRESETS,
  applyPreset,
  shareState,
  analyzeArtworkComposition,
  drawGlassContainer,
  drawGlassBoxLayout,
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

console.log('\n── getScaleMultiplier ──');
assert(typeof getScaleMultiplier === 'function', 'getScaleMultiplier is exported');
assertEqual(getScaleMultiplier('compact'), 0.85, 'compact scale is 0.85');
assertEqual(getScaleMultiplier('normal'), 1.0, 'normal scale is 1.0');
assertEqual(getScaleMultiplier('large'), 1.18, 'large scale is 1.18');
assertEqual(getScaleMultiplier('heroic'), 1.36, 'heroic scale is 1.36');
assertEqual(getScaleMultiplier('unknown'), 1.0, 'unknown scale defaults to 1.0');

console.log('\n── formatLyricTimestamp ──');
assert(typeof formatLyricTimestamp === 'function', 'formatLyricTimestamp is exported');
assertEqual(formatLyricTimestamp(0), '0:00', '0 ms formats to 0:00');
assertEqual(formatLyricTimestamp(65000), '1:05', '65000 ms formats to 1:05');
assertEqual(formatLyricTimestamp(195000), '3:15', '195000 ms formats to 3:15');
assertEqual(formatLyricTimestamp(-500), '0:00', 'negative ms formats to 0:00');
assertEqual(formatLyricTimestamp(NaN), '0:00', 'NaN formats to 0:00');

console.log('\n── originalIndex preservation in getFormattedLyricsForShare ──');
const itemsWithIndex = getFormattedLyricsForShare([0, 1], sampleLines, 'original');
assertEqual(itemsWithIndex[0].originalIndex, 0, 'first item preserves originalIndex 0');
assertEqual(itemsWithIndex[1].originalIndex, 1, 'second item preserves originalIndex 1');

console.log('\n── drawScrubberBar ──');
assert(typeof drawScrubberBar === 'function', 'drawScrubberBar is exported');
const fakeCanvas = document.createElement('canvas');
const fakeCtxScrubber = fakeCanvas.getContext('2d');
let scrubberError = null;
try {
  drawScrubberBar(fakeCtxScrubber, 540, 900, 600, 45000, 180000, '#1DB954', false);
  drawScrubberBar(fakeCtxScrubber, 540, 900, 600, 0, 0, '#18181b', true);
} catch (e) {
  scrubberError = e;
}
assert(!scrubberError, 'drawScrubberBar renders cleanly without errors');

console.log('\n── drawFilmGrain ──');
assert(typeof drawFilmGrain === 'function', 'drawFilmGrain is exported');
let grainError = null;
try {
  drawFilmGrain(fakeCtxScrubber, 1080, 1920, 0.045);
} catch (e) {
  grainError = e;
}
assert(!grainError, 'drawFilmGrain executes safely');

console.log('\n── renderCardContent with all 10 Themes & 4 Formats ──');
assert(typeof renderCardContent === 'function', 'renderCardContent is exported');

const themes = ['mesh', 'obsidian', 'vinyl', 'glass', 'aurora', 'editorial', 'cyberpunk', 'cassette', 'bloom', 'sunset'];
const formats = ['story', 'square', 'portrait', 'landscape'];

let renderThemeErrors = 0;
themes.forEach(th => {
  try {
    const testState = {
      theme: th,
      format: 'story',
      transMode: 'bilingual',
      fontFamily: 'sans',
      fontScale: 'normal',
      textAlign: 'center',
      heroIndex: null,
      showAlbumArt: true,
      showWatermark: true,
      showTimestamp: true,
      showScrubber: true,
      showGrain: false,
      trackTitle: 'Midnight City',
      artistName: 'M83',
      palette: ['#1DB954', '#8b5cf6', '#3b82f6', '#f43f5e'],
      albumImg: null,
      selectedIndices: [0, 1],
      cachedLyrics: sampleLines,
      currentProgressMs: 65000,
      trackDurationMs: 240000,
    };
    renderCardContent(fakeCtxScrubber, 1080, 1920, testState);
  } catch (e) {
    console.error(`Theme ${th} render failed:`, e);
    renderThemeErrors++;
  }
});
assert(renderThemeErrors === 0, 'all 10 themes render without error');

let renderFormatErrors = 0;
formats.forEach(fmt => {
  try {
    const testState = {
      theme: 'bloom',
      format: fmt,
      transMode: 'original',
      fontFamily: 'serif',
      fontScale: 'large',
      textAlign: 'left',
      heroIndex: 0,
      showAlbumArt: true,
      showWatermark: true,
      showTimestamp: true,
      showScrubber: true,
      showGrain: true,
      trackTitle: 'Starboy',
      artistName: 'The Weeknd',
      palette: ['#ff007f', '#7928ca'],
      albumImg: null,
      selectedIndices: [0],
      cachedLyrics: sampleLines,
      currentProgressMs: 30000,
      trackDurationMs: 210000,
    };
    const dims = getCardDimensions(fmt);
    renderCardContent(fakeCtxScrubber, dims.width, dims.height, testState);
  } catch (e) {
    console.error(`Format ${fmt} render failed:`, e);
    renderFormatErrors++;
  }
});
assert(renderFormatErrors === 0, 'all 4 formats render with hero punchline & grain without error');

console.log('\n── Text Alignments (Left / Center / Right) ──');
let alignErrors = 0;
['left', 'center', 'right'].forEach(align => {
  try {
    const testState = {
      theme: 'sunset',
      format: 'story',
      transMode: 'original',
      fontFamily: 'mono',
      fontScale: 'heroic',
      textAlign: align,
      heroIndex: 0,
      showAlbumArt: true,
      showWatermark: true,
      showTimestamp: true,
      showScrubber: true,
      showGrain: false,
      trackTitle: 'Viva La Vida',
      artistName: 'Coldplay',
      palette: ['#f59e0b', '#ef4444'],
      albumImg: null,
      selectedIndices: [0, 1],
      cachedLyrics: sampleLines,
      currentProgressMs: 45000,
      trackDurationMs: 240000,
    };
    renderCardContent(fakeCtxScrubber, 1080, 1920, testState);
  } catch (e) {
    console.error(`Alignment ${align} render failed:`, e);
    alignErrors++;
  }
});
console.log('\n── drawFloatingMetadataPill & drawLandscapeMetadataCard ──');
assert(typeof drawFloatingMetadataPill === 'function', 'drawFloatingMetadataPill is exported');
assert(typeof drawLandscapeMetadataCard === 'function', 'drawLandscapeMetadataCard is exported');

let pillError = null;
try {
  const dummyState = {
    trackTitle: 'Starboy',
    artistName: 'The Weeknd',
    showAlbumArt: true,
    showWatermark: true,
    showScrubber: true,
    currentProgressMs: 45000,
    trackDurationMs: 220000,
    albumImg: null
  };
  drawFloatingMetadataPill(fakeCtxScrubber, 80, 1600, 920, 140, dummyState, '#1DB954', false, '"Outfit", sans-serif');
  drawFloatingMetadataPill(fakeCtxScrubber, 80, 1600, 920, 116, { ...dummyState, showScrubber: false }, '#18181b', true, '"Outfit", sans-serif');
  drawLandscapeMetadataCard(fakeCtxScrubber, 100, 200, 520, 440, dummyState, '#1DB954', false, '"Outfit", sans-serif');
} catch (e) {
  pillError = e;
}
assert(!pillError, 'drawFloatingMetadataPill & drawLandscapeMetadataCard render cleanly without errors');

console.log('\n── SHARE_CARD_PRESETS & applyPreset ──');
assert(typeof SHARE_CARD_PRESETS === 'object' && SHARE_CARD_PRESETS !== null, 'SHARE_CARD_PRESETS is exported');
assert(SHARE_CARD_PRESETS.classic && SHARE_CARD_PRESETS.classic.theme === 'classic', 'classic preset defined with theme "classic"');
assert(SHARE_CARD_PRESETS.cinematic && SHARE_CARD_PRESETS.cinematic.theme === 'cinematic', 'cinematic preset defined with theme "cinematic"');
assertEqual(SHARE_CARD_PRESETS.classic.format, 'story', 'classic preset defaults to story format');
assertEqual(SHARE_CARD_PRESETS.cinematic.format, 'story', 'cinematic preset defaults to story format');
assert(SHARE_CARD_PRESETS.cinematic.showGrain === true, 'cinematic preset enables subtle film grain');

assert(typeof applyPreset === 'function', 'applyPreset is exported');
applyPreset('classic', false);
assertEqual(shareState.designMode, 'classic', 'applyPreset("classic") sets shareState.designMode');
assertEqual(shareState.theme, 'classic', 'applyPreset("classic") sets shareState.theme');

applyPreset('cinematic', false);
assertEqual(shareState.designMode, 'cinematic', 'applyPreset("cinematic") sets shareState.designMode');
assertEqual(shareState.theme, 'cinematic', 'applyPreset("cinematic") sets shareState.theme');

applyPreset('glass', false);
assertEqual(shareState.designMode, 'glass', 'applyPreset("glass") sets shareState.designMode');
assertEqual(shareState.theme, 'glass', 'applyPreset("glass") sets shareState.theme');
assertEqual(shareState.cardContent, 'lyrics_art', 'applyPreset("glass") sets shareState.cardContent to lyrics_art');

console.log('\n── Frosted Glass Box Preset & Layout (Breaking The Habit Replica) ──');
assert(typeof drawGlassContainer === 'function', 'drawGlassContainer is exported');
let glassBoxContainerError = null;
try {
  drawGlassContainer(fakeCtxScrubber, 50, 50, 400, 300, 24);
} catch (e) {
  glassBoxContainerError = e;
}
assert(!glassBoxContainerError, 'drawGlassContainer executes cleanly without errors');

assert(typeof drawGlassBoxLayout === 'function', 'drawGlassBoxLayout is exported');

const glassTestLines = [
  { primary: "I don't know what's worth fighting for", secondary: null, originalIndex: 0 },
  { primary: "Or why I have to scream", secondary: null, originalIndex: 1 },
  { primary: "I don't know why I instigate", secondary: null, originalIndex: 2 },
  { primary: "And say what I don't mean", secondary: null, originalIndex: 3 }
];

const baseGlassState = {
  theme: 'glass',
  designMode: 'glass',
  trackTitle: 'Breaking the Habit',
  artistName: 'Linkin Park',
  albumImg: null,
  palette: ['#0e7490', '#3b82f6'],
  showScrubber: true,
  showWatermark: true,
  currentProgressMs: 72000,
  trackDurationMs: 198000,
  cachedLyrics: glassTestLines,
  selectedIndices: [0, 1, 2, 3]
};

// 1. Lyrics + Art (Vertical 9:16)
let glassLyricsVertError = null;
try {
  drawGlassBoxLayout(fakeCtxScrubber, 1080, 1920, glassTestLines, {
    ...baseGlassState,
    format: 'story',
    cardContent: 'lyrics_art'
  });
} catch (e) {
  glassLyricsVertError = e;
}
assert(!glassLyricsVertError, 'drawGlassBoxLayout renders Option 1 (Lyrics + Art) in Vertical (9:16)');

// 2. Lyrics + Art (Horizontal 16:9)
let glassLyricsHorizError = null;
try {
  drawGlassBoxLayout(fakeCtxScrubber, 1920, 1080, glassTestLines, {
    ...baseGlassState,
    format: 'landscape',
    cardContent: 'lyrics_art'
  });
} catch (e) {
  glassLyricsHorizError = e;
}
assert(!glassLyricsHorizError, 'drawGlassBoxLayout renders Option 1 (Lyrics + Art) in Horizontal (16:9)');

// 3. Art + Track (Vertical 9:16)
let glassArtVertError = null;
try {
  drawGlassBoxLayout(fakeCtxScrubber, 1080, 1920, glassTestLines, {
    ...baseGlassState,
    format: 'story',
    cardContent: 'art_track'
  });
} catch (e) {
  glassArtVertError = e;
}
assert(!glassArtVertError, 'drawGlassBoxLayout renders Option 2 (Art + Track) in Vertical (9:16)');

// 4. Art + Track (Horizontal 16:9)
let glassArtHorizError = null;
try {
  drawGlassBoxLayout(fakeCtxScrubber, 1920, 1080, glassTestLines, {
    ...baseGlassState,
    format: 'landscape',
    cardContent: 'art_track'
  });
} catch (e) {
  glassArtHorizError = e;
}
assert(!glassArtHorizError, 'drawGlassBoxLayout renders Option 2 (Art + Track) in Horizontal (16:9)');

// 5. Full renderCardContent dispatch for Glass Box
let glassRenderError = null;
try {
  renderCardContent(fakeCtxScrubber, 1080, 1920, {
    ...baseGlassState,
    format: 'story',
    cardContent: 'lyrics_art',
    showGrain: true
  });
} catch (e) {
  glassRenderError = e;
}
assert(!glassRenderError, 'renderCardContent dispatches to Glass Box layout cleanly');

console.log('\n── Japanese Typography Font Fallbacks ──');
const sansStack = getFontStack('sans');
assert(sansStack.includes('Noto Sans JP'), 'sans font stack includes Noto Sans JP');
assert(sansStack.includes('Yu Gothic') || sansStack.includes('Meiryo'), 'sans font stack includes Japanese system fonts');

const serifStack = getFontStack('serif');
assert(serifStack.includes('Shippori Mincho') || serifStack.includes('Yu Mincho'), 'serif font stack includes Japanese serif fonts');

const softStack = getFontStack('soft');
assert(softStack.includes('Noto Sans JP'), 'soft font stack includes Noto Sans JP fallback');

console.log('\n── Editorial Backgrounds (Classic & Cinematic) & Japanese Lyrics ──');
assert(typeof drawThemeBackground === 'function', 'drawThemeBackground is exported');
let bgError = null;
try {
  drawThemeBackground(fakeCtxScrubber, 1080, 1920, 'classic', null, ['#1DB954', '#8b5cf6']);
  drawThemeBackground(fakeCtxScrubber, 1080, 1920, 'cinematic', null, ['#1DB954', '#8b5cf6']);
  drawThemeBackground(fakeCtxScrubber, 1080, 1920, 'cinematic', { complete: true, naturalWidth: 500, naturalHeight: 500 }, ['#1DB954', '#8b5cf6']);
} catch (e) {
  bgError = e;
}
assert(!bgError, 'drawThemeBackground renders classic and cinematic backgrounds without error');

let jpRenderError = null;
try {
  const jpLines = [
    { text: '「萌える容姿でぼちぼちね」', subText: 'Moeru youshi de bochibochi ne', timeMs: 42000 }
  ];
  const jpStateClassic = {
    theme: 'classic',
    format: 'story',
    transMode: 'original',
    fontFamily: 'sans',
    fontScale: 'normal',
    textAlign: 'center',
    heroIndex: 0,
    showAlbumArt: true,
    showWatermark: true,
    showTimestamp: true,
    showScrubber: true,
    showGrain: false,
    trackTitle: 'Tokyo Drift',
    artistName: 'Teriyaki Boyz',
    palette: ['#ff0055', '#7928ca'],
    albumImg: null,
    selectedIndices: [0],
    cachedLyrics: jpLines,
    currentProgressMs: 42000,
    trackDurationMs: 250000,
  };
  renderCardContent(fakeCtxScrubber, 1080, 1920, jpStateClassic);

  const jpStateCinematic = {
    ...jpStateClassic,
    theme: 'cinematic',
    showGrain: true
  };
  renderCardContent(fakeCtxScrubber, 1080, 1920, jpStateCinematic);
} catch (e) {
  jpRenderError = e;
}
assert(!jpRenderError, 'renderCardContent renders Japanese editorial typography without error');

console.log('\n── normalizeHarmonicPalette (Tone-Mapping & Saturation Clamping) ──');
assert(typeof normalizeHarmonicPalette === 'function', 'normalizeHarmonicPalette is exported');
const greenHarmonic = normalizeHarmonicPalette(['#1DB954', '#8b5cf6']);
assert(greenHarmonic.ambientSat <= 35, 'ambient saturation clamped to <= 35% for green palette');
assert(greenHarmonic.darkNeutral.includes('4%'), 'dark foundational charcoal neutral has 4% lightness');
assertEqual(greenHarmonic.primaryWhite, '#f4f4f6', 'primary highlight is off-white #f4f4f6');

const neonHarmonic = normalizeHarmonicPalette(['#ff007f', '#7928ca']);
assert(neonHarmonic.ambientSat <= 35, 'ambient saturation clamped to <= 35% for neon magenta palette');
assert(neonHarmonic.darkNeutral.startsWith('hsla('), 'dark neutral is formatted as hsla string');

console.log('\n── tokenizeText with CJK Segmentation & Kinsoku Shori ──');
assert(typeof tokenizeText === 'function', 'tokenizeText is exported');
const jpTokens = tokenizeText('「萌える容姿でぼちぼちね」');
assert(jpTokens.isCJK === true, 'detects CJK characters in Japanese text');
assert(jpTokens.tokens.length >= 2, 'Japanese text broken into meaningful tokens without spaces');
assert(jpTokens.tokens[0].startsWith('「'), 'opening bracket attached to first word (Kinsoku Shori)');
assert(jpTokens.tokens[jpTokens.tokens.length - 1].endsWith('」'), 'closing bracket attached to last word (Kinsoku Shori)');

const enTokens = tokenizeText("But baby-girl, I'm not blaming you");
assert(enTokens.isCJK === false, 'detects Latin text as non-CJK');
assert(enTokens.tokens.length === 6, 'English text tokenized on words');
assertEqual(enTokens.tokens[1], 'baby-girl,', 'punctuation stays attached to preceding word');

console.log('\n── Balanced Line Wrapping (Knuth-Plass Rag Minimization) ──');
// Mock ctx where width = length * 15px
const mockMeasureCtx = { measureText: (t) => ({ width: t.length * 15 }) };

// English sentence: greedy wrapping at 260px would place "blaming you" or orphan "you"
const enBalanced = wrapText(mockMeasureCtx, "But baby-girl, I'm not blaming you", 260);
assert(enBalanced.length >= 2, 'wraps English sentence across multiple lines');
// Ensure no single-character or single short orphan word alone on the last line
assert(enBalanced[enBalanced.length - 1].length >= 5, 'last line is balanced and avoids orphan word');

// Japanese sentence wrapped with narrow width
const jpBalanced = wrapText(mockMeasureCtx, '「萌える容姿でぼちぼちね」', 120);
assert(jpBalanced.length >= 2, 'wraps Japanese sentence into multiple balanced lines');
assert(jpBalanced[0].startsWith('「'), 'Japanese first line preserves opening quote');
assert(jpBalanced[jpBalanced.length - 1].endsWith('」'), 'Japanese last line preserves closing quote');

console.log('\n── analyzeArtworkComposition (Subject Detection & Negative Space) ──');
assert(typeof analyzeArtworkComposition === 'function', 'analyzeArtworkComposition is exported');
const nullAnalysis = analyzeArtworkComposition(null);
assertEqual(nullAnalysis.focalZone, 'balanced', 'null img returns focalZone balanced');
assertEqual(nullAnalysis.quietZone, 'center', 'null img returns quietZone center');
assertEqual(nullAnalysis.hasSubject, false, 'null img reports hasSubject false');

const incompleteImg = { complete: false, naturalWidth: 0 };
const incAnalysis = analyzeArtworkComposition(incompleteImg);
assertEqual(incAnalysis.focalZone, 'balanced', 'incomplete img returns focalZone balanced');

console.log('\n── Album Artwork Color Ingestion (hexToRgbObj & rgb/rgba parsing) ──');
assert(typeof hexToRgbObj === 'function', 'hexToRgbObj is exported');
const rgbParsed = hexToRgbObj('rgb(255, 60, 0)');
assertEqual(rgbParsed.r, 255, 'rgb(255, 60, 0) parses red 255');
assertEqual(rgbParsed.g, 60, 'rgb(255, 60, 0) parses green 60');
assertEqual(rgbParsed.b, 0, 'rgb(255, 60, 0) parses blue 0');

const rgbaParsed = hexToRgbObj('rgba(0, 100, 255, 0.85)');
assertEqual(rgbaParsed.r, 0, 'rgba parses red 0');
assertEqual(rgbaParsed.g, 100, 'rgba parses green 100');
assertEqual(rgbaParsed.b, 255, 'rgba parses blue 255');

const hex3Parsed = hexToRgbObj('#f0a');
assertEqual(hex3Parsed.r, 255, '#f0a parses red 255');
assertEqual(hex3Parsed.g, 0, '#f0a parses green 0');
assertEqual(hex3Parsed.b, 170, '#f0a parses blue 170');

const hex6Parsed = hexToRgbObj('#ff3c00');
assertEqual(hex6Parsed.r, 255, '#ff3c00 parses red 255');
assertEqual(hex6Parsed.g, 60, '#ff3c00 parses green 60');
assertEqual(hex6Parsed.b, 0, '#ff3c00 parses blue 0');

const invalidFallback = hexToRgbObj('not-a-color');
assertEqual(invalidFallback.r, 29, 'invalid string falls back to default red 29');
assertEqual(invalidFallback.g, 185, 'invalid string falls back to default green 185');
assertEqual(invalidFallback.b, 84, 'invalid string falls back to default blue 84');

console.log('\n── Harmonic Palette Normalization with Authentic Album Colors ──');
const albumPalette = normalizeHarmonicPalette(['rgb(255, 60, 0)', 'rgb(0, 100, 255)']);
assert(albumPalette.ambientHue !== 141, 'ambientHue is not Spotify green fallback hue 141');
assertEqual(albumPalette.ambientHue, 14, 'ambientHue accurately reflects red-orange album hue 14');
assertEqual(albumPalette.secHue, 216, 'secHue accurately reflects blue secondary hue 216');
assert(albumPalette.ambientSat <= 35, 'ambientSat clamped to editorial saturation ceiling');
assert(albumPalette.darkNeutral.startsWith('hsla(14,'), 'darkNeutral incorporates authentic album hue');

console.log('\n── Classic Art Direction: Optical Balance & Refined Publication Header ──');
const baseCtx = document.createElement('canvas').getContext('2d');
const mockClassicCtx = {
  ...baseCtx,
  measureText: (t) => ({ width: t.length * 10 }),
  fillText: (text, x, y) => { classicTextCalls.push({ text, x, y }); }
};

// Test Classic background renders authentic publication header without '01 / TRACK ARCHIVE' or 'STEREO • HI-RES'
classicTextCalls = [];
drawThemeBackground(mockClassicCtx, 1080, 1920, 'classic', null, ['rgb(255, 60, 0)', 'rgb(0, 100, 255)'], {
  trackTitle: 'Midnight City',
  artistName: 'M83',
  trackDurationMs: 243000
});
const renderedTexts = classicTextCalls.map(c => c.text);
assert(!renderedTexts.includes('01 / TRACK ARCHIVE'), 'header eliminates hardcoded 01 / TRACK ARCHIVE');
assert(!renderedTexts.includes('STEREO • HI-RES'), 'header eliminates hardcoded STEREO • HI-RES');
assert(renderedTexts.some(t => t.includes('M83')), 'header contains authentic artist publication notation');
assert(renderedTexts.some(t => t.includes('MIDNIGHT CITY')), 'header contains authentic track title notation');

// Test Classic Story layout has no invisible-subject dodging
classicTextCalls = [];
const classicState = {
  theme: 'classic',
  format: 'story',
  fontFamily: 'sans',
  textAlign: 'center',
  fontScale: 'normal',
  showAlbumArt: true,
  showScrubber: true,
  showGrain: false,
  showWatermark: true,
  trackTitle: 'Midnight City',
  artistName: 'M83',
  palette: ['rgb(255, 60, 0)', 'rgb(0, 100, 255)'],
  albumImg: null,
  cachedLyrics: [{ text: 'Waiting in a car', timeMs: 12000 }],
  selectedIndices: [0]
};
renderCardContent(mockClassicCtx, 1080, 1920, classicState);
const lyricCall = classicTextCalls.find(c => c.text === 'Waiting in a car');
assert(lyricCall !== undefined, 'lyric line rendered');
assertEqual(lyricCall.x, 540, 'Classic layout centers lyric at 540 without invisible-subject dodging');

console.log('\n── Mixed-Script Whitespace Preservation ──');
const mixedTokens = tokenizeText('今夜は Tokyo Drift で走る');
assert(mixedTokens.isCJK === true, 'mixed Japanese/English detected as CJK');
const mixedWrapped = wrapText(mockMeasureCtx, '今夜は Tokyo Drift で走る', 1000);
assert(mixedWrapped.length >= 1, 'mixed script wraps successfully');
const allJoined = mixedWrapped.join(' ');
assert(allJoined.includes('Tokyo Drift'), 'preserves space between English words in mixed CJK lyrics');

console.log('\n── Scrubber Bar & Editorial Metadata Notation ──');
let timestampTextCalls = [];
const mockTimeCtx = {
  ...baseCtx,
  measureText: (t) => ({ width: t.length * 8 }),
  fillText: (t, x, y) => { timestampTextCalls.push(t); },
  strokeRect: () => {},
  fillRect: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {}
};
const { drawTimestampBadge, drawWatermarkPill } = require('../src/modules/share-card.js');
drawTimestampBadge(mockTimeCtx, 200, 200, 65000, '#1DB954');
assert(timestampTextCalls.some(t => t.includes('1:05')), 'renders formatted timestamp');
assert(!timestampTextCalls.some(t => t.includes('▶')), 'eliminates player play button glyph from timestamp badge');

let watermarkTextCalls = [];
const mockWatermarkCtx = {
  ...baseCtx,
  measureText: (t) => ({ width: t.length * 8 }),
  fillText: (t, x, y) => { watermarkTextCalls.push(t); }
};
drawWatermarkPill(mockWatermarkCtx, 200, 200, '#1DB954');
assert(watermarkTextCalls.some(t => t.includes('LYRICFLOW')), 'renders subtle editorial colophon branding');

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`Share Card Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
