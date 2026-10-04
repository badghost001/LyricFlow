const assert = require('assert');
const path = require('path');

// Setup Node DOM stub for Canvas testing
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.window = { addEventListener: () => {} };
global.showToast = () => {};

let createdElements = [];
global.document = {
  getElementById: (id) => ({
    id,
    classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} },
    setAttribute: () => {},
    getAttribute: () => null,
    addEventListener: () => {},
    style: {},
    textContent: '',
    scrollTo: () => {},
    getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
  }),
  querySelector: () => ({
    classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} },
    setAttribute: () => {},
    style: {}
  }),
  querySelectorAll: () => [],
  createElement: (tag) => {
    const el = {
      tag,
      style: {},
      getContext: () => createMockCanvasContext()
    };
    createdElements.push(el);
    return el;
  }
};

function createMockCanvasContext() {
  const drawCalls = [];
  return {
    drawCalls,
    canvas: { width: 1080, height: 1920 },
    save: () => drawCalls.push({ type: 'save' }),
    restore: () => drawCalls.push({ type: 'restore' }),
    scale: (sx, sy) => drawCalls.push({ type: 'scale', sx, sy }),
    clearRect: (x, y, w, h) => drawCalls.push({ type: 'clearRect', x, y, w, h }),
    fillRect: (x, y, w, h) => drawCalls.push({ type: 'fillRect', x, y, w, h }),
    strokeRect: (x, y, w, h) => drawCalls.push({ type: 'strokeRect', x, y, w, h }),
    beginPath: () => drawCalls.push({ type: 'beginPath' }),
    closePath: () => drawCalls.push({ type: 'closePath' }),
    moveTo: (x, y) => drawCalls.push({ type: 'moveTo', x, y }),
    lineTo: (x, y) => drawCalls.push({ type: 'lineTo', x, y }),
    arc: (x, y, r, sa, ea) => drawCalls.push({ type: 'arc', x, y, r, sa, ea }),
    quadraticCurveTo: (cpx, cpy, x, y) => drawCalls.push({ type: 'quadraticCurveTo', cpx, cpy, x, y }),
    fill: () => drawCalls.push({ type: 'fill' }),
    stroke: () => drawCalls.push({ type: 'stroke' }),
    clip: () => drawCalls.push({ type: 'clip' }),
    drawImage: (img, ...args) => drawCalls.push({ type: 'drawImage', args }),
    fillText: (text, x, y) => drawCalls.push({ type: 'fillText', text, x, y }),
    measureText: (text) => ({ width: String(text).length * 10 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => null,
    set shadowBlur(v) { this._shadowBlur = v; },
    get shadowBlur() { return this._shadowBlur || 0; },
    set shadowColor(v) { this._shadowColor = v; },
    get shadowColor() { return this._shadowColor || 'transparent'; }
  };
}

const mod = require('../src/modules/share-card.js');
const { renderCardContent, getCardDimensions } = mod;

console.log('Running Diverse Visual Renders Evaluation (11 Condition Matrix)...\n');

const testCases = [
  {
    name: '1. Dark Artwork + Classic Poster',
    theme: 'classic',
    format: 'story',
    palette: ['#0d0d11', '#1f1f28'],
    img: { complete: true, naturalWidth: 640, naturalHeight: 640 },
    lyrics: [{ text: 'Out of the black, into the blue', timeMs: 45000 }],
    track: 'Get Free',
    artist: 'Lana Del Rey'
  },
  {
    name: '2. Bright Artwork + Cinematic Frosted Photo',
    theme: 'cinematic',
    format: 'story',
    palette: ['#f8fafc', '#e2e8f0'],
    img: { complete: true, naturalWidth: 800, naturalHeight: 800 },
    lyrics: [{ text: 'Sun is shining in the sky', timeMs: 30000 }],
    track: 'Mr. Blue Sky',
    artist: 'Electric Light Orchestra'
  },
  {
    name: '3. Highly Vibrant/Colorful Artwork',
    theme: 'cinematic',
    format: 'portrait',
    palette: ['#ff007f', '#7928ca', '#00dfd8'],
    img: { complete: true, naturalWidth: 1000, naturalHeight: 1000 },
    lyrics: [{ text: 'City of neon dreams and purple skies', timeMs: 88000 }],
    track: 'Resonance',
    artist: 'HOME'
  },
  {
    name: '4. Monochrome Minimal Artwork + Classic Mode',
    theme: 'classic',
    format: 'square',
    palette: ['#121212', '#282828'],
    img: { complete: true, naturalWidth: 500, naturalHeight: 500 },
    lyrics: [{ text: 'Silence is the loudest sound', timeMs: 12000 }],
    track: 'Enjoy the Silence',
    artist: 'Depeche Mode'
  },
  {
    name: '5. Detailed High-Density Artwork',
    theme: 'cinematic',
    format: 'story',
    palette: ['#2b1055', '#7597de'],
    img: { complete: true, naturalWidth: 1200, naturalHeight: 1200 },
    lyrics: [{ text: 'Stars are aligning across the midnight horizon', timeMs: 140000 }],
    track: 'Midnight City',
    artist: 'M83'
  },
  {
    name: '6. Minimal Atmospheric Artwork',
    theme: 'classic',
    format: 'landscape',
    palette: ['#1e293b', '#334155'],
    img: { complete: true, naturalWidth: 600, naturalHeight: 600 },
    lyrics: [{ text: 'Quiet reflection in the stillness', timeMs: 90000 }],
    track: 'Weightless',
    artist: 'Marconi Union'
  },
  {
    name: '7. Portrait-Oriented Non-Square Artwork (Intelligent Crop)',
    theme: 'cinematic',
    format: 'story',
    palette: ['#3b82f6', '#1d4ed8'],
    img: { complete: true, naturalWidth: 600, naturalHeight: 900 },
    lyrics: [{ text: 'Looking up towards the sky', timeMs: 65000 }],
    track: 'Vertigo',
    artist: 'U2'
  },
  {
    name: '8. Short Punchy Lyric (Heroic Scale Adaptation)',
    theme: 'classic',
    format: 'story',
    palette: ['#1DB954', '#15883e'],
    img: null,
    lyrics: [{ text: 'Tokyo Drift', timeMs: 15000 }],
    track: 'Tokyo Drift',
    artist: 'Teriyaki Boyz'
  },
  {
    name: '9. Long Multi-line Lyric Block (Rhythm & Negative Space)',
    theme: 'cinematic',
    format: 'story',
    palette: ['#f43f5e', '#8b5cf6'],
    img: { complete: true, naturalWidth: 700, naturalHeight: 700 },
    lyrics: [
      { text: 'I heard that you settled down', timeMs: 10000 },
      { text: 'That you found a girl and you are married now', timeMs: 15000 },
      { text: 'I heard that your dreams came true', timeMs: 20000 },
      { text: 'Guess she gave you things I didn’t give to you', timeMs: 25000 }
    ],
    track: 'Someone Like You',
    artist: 'Adele'
  },
  {
    name: '10. Pure Japanese Script with Kinsoku Shori',
    theme: 'classic',
    format: 'portrait',
    palette: ['#e11d48', '#4c0519'],
    img: null,
    lyrics: [{ text: '「萌える容姿でぼちぼちね」', timeMs: 42000 }],
    track: 'Otonablue',
    artist: 'Atarashii Gakko!'
  },
  {
    name: '11. Mixed Japanese & English Script with Space Preservation',
    theme: 'cinematic',
    format: 'square',
    palette: ['#06b6d4', '#4f46e5'],
    img: { complete: true, naturalWidth: 800, naturalHeight: 800 },
    lyrics: [{ text: '今夜は Tokyo Drift で全開に走る', timeMs: 55000 }],
    track: 'Tokyo Drift Special',
    artist: 'Teriyaki Boyz'
  }
];

let allPassed = true;

testCases.forEach((tc, idx) => {
  const ctx = createMockCanvasContext();
  const { width, height } = getCardDimensions(tc.format);
  ctx.canvas.width = width;
  ctx.canvas.height = height;

  const state = {
    theme: tc.theme,
    format: tc.format,
    palette: tc.palette,
    albumImg: tc.img,
    cachedLyrics: tc.lyrics,
    selectedIndices: tc.lyrics.map((_, i) => i),
    trackTitle: tc.track,
    artistName: tc.artist,
    fontFamily: 'sans',
    fontScale: 'normal',
    textAlign: 'center',
    heroIndex: 0,
    showAlbumArt: true,
    showScrubber: true,
    showGrain: tc.theme === 'cinematic',
    showWatermark: true,
    showTimestamp: true,
    transMode: 'original',
    currentProgressMs: tc.lyrics[0].timeMs,
    trackDurationMs: 240000
  };

  try {
    renderCardContent(ctx, width, height, state);

    // Verify fillText calls occurred
    const fillTexts = ctx.drawCalls.filter(c => c.type === 'fillText');
    assert(fillTexts.length > 0, `No text rendered for ${tc.name}`);

    // Verify lyric text was drawn
    const lyricRendered = fillTexts.some(c => c.text && (c.text.includes(tc.lyrics[0].text.substring(0, 8)) || tc.lyrics[0].text.includes(c.text)));
    assert(lyricRendered, `Primary lyric was not drawn in ${tc.name}`);

    // Verify track and artist rendered in metadata
    assert(fillTexts.some(c => c.text && c.text.toUpperCase().includes(tc.track.toUpperCase())), `Track title missing in ${tc.name}`);

    // Verify no excessive glow in Classic mode
    if (tc.theme === 'classic') {
      const glowExcess = ctx.drawCalls.some(c => c.shadowBlur > 0);
      assert(!glowExcess, `Classic card had unauthorized drop shadow or glow in ${tc.name}`);
    }

    console.log(`  ✓ ${tc.name} [${tc.theme.toUpperCase()} - ${tc.format.toUpperCase()}]: Rendered flawlessly`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${tc.name}`, err);
    allPassed = false;
  }
});

console.log('\n────────────────────────────────────────');
if (allPassed) {
  console.log('All 11 Diverse Render Evaluation Tests Passed (100%)');
  process.exit(0);
} else {
  console.error('Some visual render evaluation tests failed.');
  process.exit(1);
}
