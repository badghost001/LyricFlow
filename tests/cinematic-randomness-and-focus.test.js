/**
 * tests/cinematic-randomness-and-focus.test.js
 * Verification for:
 * 1. Cinematic dynamic typography font scale randomness & punch words
 * 2. Paused track card rendering in Cinematic Mode
 * 3. Instant track detection (SMTC fast-path & adaptive polling)
 * 4. Wallpaper mode desktop focus suspension & instant resume
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const KineticDirector = require('../src/modules/kinetic/KineticDirector.js');
const TypographyEngine = require('../src/modules/kinetic/KineticTypographyEngine.js');
const KineticCanvasRenderer = require('../src/modules/kinetic/KineticCanvasRenderer.js');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function createMockCanvas(width = 800, height = 600) {
  const operations = [];
  const stateStack = [];
  let currentState = {
    font: '16px sans-serif',
    fillStyle: '#ffffff',
    strokeStyle: '#ffffff',
    globalAlpha: 1.0,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rot: 0 }
  };

  const ctx = {
    get font() { return currentState.font; },
    set font(v) { currentState.font = v; },
    get fillStyle() { return currentState.fillStyle; },
    set fillStyle(v) { currentState.fillStyle = v; },
    get strokeStyle() { return currentState.strokeStyle; },
    set strokeStyle(v) { currentState.strokeStyle = v; },
    get globalAlpha() { return currentState.globalAlpha; },
    set globalAlpha(v) { currentState.globalAlpha = v; },
    get textAlign() { return currentState.textAlign; },
    set textAlign(v) { currentState.textAlign = v; },
    get textBaseline() { return currentState.textBaseline; },
    set textBaseline(v) { currentState.textBaseline = v; },
    save() {
      stateStack.push(JSON.parse(JSON.stringify(currentState)));
      operations.push({ op: 'save' });
    },
    restore() {
      if (stateStack.length) currentState = stateStack.pop();
      operations.push({ op: 'restore' });
    },
    translate(x, y) {
      currentState.transform.x += x;
      currentState.transform.y += y;
      operations.push({ op: 'translate', x, y });
    },
    scale(sx, sy) {
      currentState.transform.scaleX *= sx;
      currentState.transform.scaleY *= sy;
      operations.push({ op: 'scale', sx, sy });
    },
    rotate(rad) {
      currentState.transform.rot += rad;
      operations.push({ op: 'rotate', rad });
    },
    measureText(text) {
      // Scale measured width by font size if parseable
      const match = currentState.font.match(/(\d+)px/);
      const size = match ? parseInt(match[1], 10) : 16;
      return { width: (text || '').length * (size * 0.55) };
    },
    fillText(text, x, y) {
      operations.push({
        op: 'fillText',
        text,
        x,
        y,
        font: currentState.font,
        fillStyle: currentState.fillStyle,
        alpha: currentState.globalAlpha,
        textAlign: currentState.textAlign,
        textBaseline: currentState.textBaseline,
        transform: JSON.parse(JSON.stringify(currentState.transform))
      });
    },
    beginPath() { operations.push({ op: 'beginPath' }); },
    closePath() { operations.push({ op: 'closePath' }); },
    moveTo(x, y) { operations.push({ op: 'moveTo', x, y }); },
    lineTo(x, y) { operations.push({ op: 'lineTo', x, y }); },
    arc(x, y, r, sa, ea) { operations.push({ op: 'arc', x, y, r }); },
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) { operations.push({ op: 'bezierCurveTo' }); },
    quadraticCurveTo(cpx, cpy, x, y) { operations.push({ op: 'quadraticCurveTo' }); },
    roundRect(x, y, w, h, r) { operations.push({ op: 'roundRect', x, y, w, h, r }); },
    fill() { operations.push({ op: 'fill' }); },
    stroke() { operations.push({ op: 'stroke' }); },
    fillRect(x, y, w, h) { operations.push({ op: 'fillRect', x, y, w, h }); },
    clearRect(x, y, w, h) { operations.push({ op: 'clearRect', x, y, w, h }); },
    rect(x, y, w, h) { operations.push({ op: 'rect', x, y, w, h }); },
    clip() { operations.push({ op: 'clip' }); }
  };

  const canvas = {
    width,
    height,
    getContext: () => ctx
  };

  return { canvas, ctx, operations, width, height };
}

console.log('\n--- Running Cinematic Randomness, Paused Track & Wallpaper Focus Tests ---\n');

// ========================================================
// 1. Cinematic Typography Font Scale Randomness Tests
// ========================================================
console.log('1. Cinematic Typography Font Scale Randomness:');

test('1a. assignCinematicPunchWords selects impactful words and excludes stop words', () => {
  const words = [
    { text: 'And', timeMs: 100, endMs: 300 },
    { text: 'in', timeMs: 300, endMs: 500 },
    { text: 'the', timeMs: 500, endMs: 700 },
    { text: 'midnight', timeMs: 700, endMs: 1200 },
    { text: 'silence', timeMs: 1200, endMs: 1600 }
  ];

  const annotated = KineticDirector.assignCinematicPunchWords(words, 'Track1', 0);
  assert.strictEqual(annotated.length, words.length);

  const punchWords = annotated.filter(w => w.isPunchWord);
  assert.ok(punchWords.length >= 1, 'Should pick at least 1 punch word');
  
  // Must not pick stop words ('And', 'in', 'the')
  punchWords.forEach(pw => {
    const clean = pw.text.toLowerCase().trim();
    assert.ok(!KineticDirector.CINEMATIC_STOP_WORDS.has(clean), `Punch word "${pw.text}" must not be a stop word`);
    assert.ok(pw.scaleMultiplier >= 1.55 && pw.scaleMultiplier <= 1.85, 'Scale multiplier must be in range [1.55, 1.85]');
  });
});

test('1b. Long phrases (>= 8 words) pick 2 punch words with non-adjacent spacing', () => {
  const words = [
    { text: 'Through', timeMs: 100 },
    { text: 'the', timeMs: 200 },
    { text: 'shadows', timeMs: 300 },
    { text: 'of', timeMs: 400 },
    { text: 'endless', timeMs: 500 },
    { text: 'eternity', timeMs: 600 },
    { text: 'we', timeMs: 700 },
    { text: 'discover', timeMs: 800 },
    { text: 'light', timeMs: 900 }
  ];

  const annotated = KineticDirector.assignCinematicPunchWords(words, 'Artist_Song', 1);
  const punchIndices = annotated.map((w, idx) => w.isPunchWord ? idx : -1).filter(idx => idx !== -1);
  assert.strictEqual(punchIndices.length, 2, 'Long phrase (9 words) must pick 2 punch words');
  assert.ok(Math.abs(punchIndices[0] - punchIndices[1]) > 1, 'Punch words should not be immediately adjacent');
});

test('1c. KineticTypographyEngine wrapTimedWords accounts for per-word font sizes', () => {
  const mock = createMockCanvas(800, 400);
  const words = [
    { text: 'Small', isPunchWord: false, scaleMultiplier: 1.0 },
    { text: 'Colossal', isPunchWord: true, scaleMultiplier: 1.8 }
  ];

  const lines = TypographyEngine.wrapTimedWords(mock.ctx, words, 600, {
    baseFont: '400 30px serif',
    getWordFont: (w) => w.isPunchWord ? '700 54px serif' : '400 30px serif'
  });

  assert.ok(lines.length >= 1, 'Must wrap words into lines');
  assert.ok(lines[0].width > 0, 'Line width must reflect measured words');
});

test('1d. renderCinematicHorizontalFluid aligns punch word and normal words on optical baseline with zero overlap', () => {
  const mock = createMockCanvas(1400, 600);
  const words = [
    { text: 'We', timeMs: 1000, endMs: 1400, isPunchWord: false, scaleMultiplier: 1.0, hasSpace: true },
    { text: 'CHAMPIONS', timeMs: 1400, endMs: 2000, isPunchWord: true, scaleMultiplier: 1.75, hasSpace: false }
  ];

  TypographyEngine.renderStyleA(mock.ctx, {
    text: 'We CHAMPIONS',
    words,
    currentTimeMs: 1600,
    bounds: { x: 0, y: 0, width: 1400, height: 600 },
    palette: { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } },
    isCinematic: true
  });

  const fills = mock.operations.filter(op => op.op === 'fillText');
  assert.strictEqual(fills.length, 2, 'Both words must be rendered');

  const normalFill = fills.find(f => f.text === 'We');
  const punchFill = fills.find(f => f.text === 'CHAMPIONS');

  assert.ok(normalFill && punchFill, 'Must find both text fills');
  assert.ok(punchFill.font.includes('700'), 'Punch word must render with bold display font');

  // Baseline check: punch word center Y must be elevated higher than normal word center Y
  // so their alphabetic baseline matches without vertical jumping
  assert.ok(punchFill.transform.y < normalFill.transform.y, 'Punch word center Y must elevate to match baseline');

  // Horizontal overlap check: punch word center X must be strictly to the right of normal word
  assert.ok(punchFill.transform.x > normalFill.transform.x, 'Words must be positioned horizontally without collision');
});

// ========================================================
// 2. Cinematic Paused Track Card Tests
// ========================================================
console.log('\n2. Cinematic Paused Track Card:');

test('2a. KineticCanvasRenderer setPausedState toggles pause state and stores track info', () => {
  const mock = createMockCanvas(1000, 600);
  const renderer = new KineticCanvasRenderer(mock.canvas, {
    width: 1000,
    height: 600,
    isCinematic: true,
    title: 'Initial Song',
    artist: 'Initial Artist'
  });
  renderer.ctx = mock.ctx;

  assert.strictEqual(renderer.isPaused, false);

  renderer.setPausedState(true, { title: 'Starboy', artist: 'The Weeknd' });
  assert.strictEqual(renderer.isPaused, true);
  assert.strictEqual(renderer.pausedTrackInfo.title, 'Starboy');
  assert.strictEqual(renderer.pausedTrackInfo.artist, 'The Weeknd');

  renderer.setPausedState(false);
  assert.strictEqual(renderer.isPaused, false);
});

test('2b. KineticCanvasRenderer renderPausedTrackCard renders song title, artist, and status', () => {
  const mock = createMockCanvas(1000, 600);
  const renderer = new KineticCanvasRenderer(mock.canvas, {
    width: 1000,
    height: 600,
    isCinematic: true,
    title: 'Blinding Lights',
    artist: 'The Weeknd'
  });
  renderer.ctx = mock.ctx;
  renderer.isPaused = true;
  renderer.pausedTrackInfo = { title: 'Blinding Lights', artist: 'The Weeknd' };

  renderer.renderFrame(1000);

  const fills = mock.operations.filter(op => op.op === 'fillText');
  const renderedTexts = fills.map(f => f.text);

  assert.ok(renderedTexts.some(t => t.includes('Blinding Lights')), 'Paused card must render Song Title');
  assert.ok(renderedTexts.some(t => t.includes('The Weeknd')), 'Paused card must render Artist Name');
  assert.ok(renderedTexts.some(t => t.includes('PAUSED')), 'Paused card must render PAUSED status badge');
});

// ========================================================
// 3. Instant Track Detection Tests
// ========================================================
console.log('\n3. Instant Track Detection:');

test('3a. integrations.rs get_local_playback contains no stale cache short-circuit', () => {
  const code = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/integrations.rs'), 'utf8');
  assert.ok(!code.includes('if let Some(cached) = crate::media::get_cached_playback_state() {'), 'Must not short-circuit with stale cache');
  assert.ok(code.includes('let backend = crate::media::get_platform_backend();'), 'Must query platform backend directly');
});

test('3b. renderer.js pollSpotifyPlayback implements SMTC fast-path track change detection', () => {
  const code = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert.ok(code.includes('FAST-PATH INSTANT TRACK DETECTION'), 'Must have SMTC fast-path');
  assert.ok(code.includes('localData = await localPlaybackPromise;'), 'Must resolve localPlaybackPromise immediately');
  assert.ok(code.includes('handlePlaybackData(localData);'), 'Must dispatch localData immediately on song change');
});

test('3c. renderer.js startPolling adapts interval (400ms near end of song, 800ms while playing)', () => {
  const code = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert.ok(code.includes('getInterval'), 'startPolling must compute adaptive interval');
  assert.ok(code.includes('400; // Poll faster when approaching track end'), 'Must poll faster near track end');
  assert.ok(code.includes('800;'), 'Must poll at 800ms base interval');
});

// ========================================================
// 4. Wallpaper Focus Suspension & Instant Resume Tests
// ========================================================
console.log('\n4. Wallpaper Focus Suspension & Instant Resume:');

test('4a. window.rs declares WALLPAPER_FOCUS_MONITOR_ACTIVE and emits wallpaper-focus-changed', () => {
  const code = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/window.rs'), 'utf8');
  assert.ok(code.includes('WALLPAPER_FOCUS_MONITOR_ACTIVE'), 'Must declare WALLPAPER_FOCUS_MONITOR_ACTIVE');
  assert.ok(code.includes('wallpaper-focus-changed'), 'Must emit wallpaper-focus-changed');
  assert.ok(code.includes('GetForegroundWindow'), 'Must check foreground window');
});

test('4b. tauri-bridge.js exposes onWallpaperFocusChanged listener', () => {
  const code = fs.readFileSync(path.join(__dirname, '../src/tauri-bridge.js'), 'utf8');
  assert.ok(code.includes('onWallpaperFocusChanged: (cb) => safeListen(\'wallpaper-focus-changed\''), 'Bridge must expose onWallpaperFocusChanged');
});

test('4c. renderer.js suspends cinematic canvas seek and DOM lyric scrolling when wallpaper is unfocused', () => {
  const code = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert.ok(code.includes('let isWallpaperDesktopFocused = true;'), 'Must track isWallpaperDesktopFocused');
  assert.ok(code.includes('window.electronAPI.onWallpaperFocusChanged'), 'Must listen to onWallpaperFocusChanged');
  assert.ok(code.includes('isWallpaperSuspended && !isDynamicIslandMode'), 'Must gate DOM lyric scrolling on wallpaper suspension');
  assert.ok(code.includes('if (isWallpaperDesktopFocused) {\n        const syncProgress = getAcousticSyncProgress();\n        cinematicMainRendererInstance.seek(syncProgress);\n      }'), 'Must only seek cinematic wallpaper when desktop is focused');
});

console.log(`\nAll ${passedTests}/${totalTests} Cinematic Randomness & Wallpaper Focus tests passed successfully!\n`);
