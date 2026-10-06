const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n--- Running Wallpaper Escape, Enhanced LRC Sync, Cinematic & Modal Aspect Tests ---\n');

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
  }
}

// ==========================================
// 1. Wallpaper Mode Escape Hatch Tests
// ==========================================

test('1a. src/wallpaper_hud.html exists with escape pill and listeners', () => {
  const hudPath = path.join(__dirname, '../src/wallpaper_hud.html');
  assert.ok(fs.existsSync(hudPath), 'src/wallpaper_hud.html must exist');
  const hudHtml = fs.readFileSync(hudPath, 'utf8');
  assert.ok(hudHtml.includes('id="btn-exit"'), 'Must define #btn-exit button');
  assert.ok(hudHtml.includes('Exit Wallpaper'), 'Must include "Exit Wallpaper" text');
  assert.ok(hudHtml.includes('exitWallpaperMode'), 'Must define exitWallpaperMode handler');
  assert.ok(hudHtml.includes('Escape'), 'Must listen to Escape key');
  assert.ok(hudHtml.includes('set_wallpaper_mode'), 'Must invoke set_wallpaper_mode IPC');
});

test('1b. src-tauri/capabilities/default.json grants permissions to wallpaper-hud', () => {
  const capPath = path.join(__dirname, '../src-tauri/capabilities/default.json');
  const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
  assert.ok(Array.isArray(cap.windows), 'capabilities must define windows array');
  assert.ok(cap.windows.includes('wallpaper-hud'), 'capabilities must include "wallpaper-hud"');
});

test('1c. src-tauri/src/commands/window.rs manages wallpaper mode lifecycle cleanly', () => {
  const winRsPath = path.join(__dirname, '../src-tauri/src/commands/window.rs');
  const winRs = fs.readFileSync(winRsPath, 'utf8');
  assert.ok(winRs.includes('attach_to_workerw'), 'window.rs must attach to workerw on enable');
  assert.ok(winRs.includes('detach_from_workerw'), 'window.rs must detach from workerw on disable');
  assert.ok(winRs.includes('hud_win.hide()'), 'window.rs must hide wallpaper-hud if present on disable');
});

test('1d. src/renderer.js alerts user with toast on entering Wallpaper Mode', () => {
  const rendererPath = path.join(__dirname, '../src/renderer.js');
  const rendererCode = fs.readFileSync(rendererPath, 'utf8');
  assert.ok(
    rendererCode.includes('Wallpaper Mode Active — Press Ctrl+Shift+W to return.'),
    'Must display on-screen exit hint toast when activating wallpaper mode'
  );
});

// ==========================================
// 2. Complete & Proper Enhanced LRC Sync Tests
// ==========================================

test('2a. src/renderer.js disables jittery dp/dt candidate rate auto-detection for Spotify', () => {
  const rendererPath = path.join(__dirname, '../src/renderer.js');
  const rendererCode = fs.readFileSync(rendererPath, 'utf8');
  assert.ok(!rendererCode.includes('measuredRate = dp / dt'), 'Must not auto-detect playback rate from HTTP polling dp / dt');
  assert.ok(rendererCode.includes('window._candidateRate = null'), 'Must keep candidate rate cleared');
  assert.ok(rendererCode.includes('window._currentPlaybackRate = 1.0'), 'Must enforce strictly 1.0x rate for music tracks');
});

test('2b. src/renderer.js uses 20ms continuous smooth drift convergence', () => {
  const rendererPath = path.join(__dirname, '../src/renderer.js');
  const rendererCode = fs.readFileSync(rendererPath, 'utf8');
  assert.ok(rendererCode.includes('absDrift > 20'), 'Must converge drift exceeding 20ms');
  assert.ok(rendererCode.includes('adjustment = drift * 0.35'), 'Must apply smooth proportional damping');
  assert.ok(rendererCode.includes('lastPollProgress = currentProgress'), 'Must re-anchor clock base to prevent timestamp aging');
});

test('2c. src/renderer.js queries SMTC concurrently in pollSpotifyPlayback', () => {
  const rendererPath = path.join(__dirname, '../src/renderer.js');
  const rendererCode = fs.readFileSync(rendererPath, 'utf8');
  assert.ok(rendererCode.includes('const localPlaybackPromise'), 'Must launch SMTC query concurrently');
  assert.ok(rendererCode.includes('await localPlaybackPromise'), 'Must await localPlaybackPromise inside json handler');
});

// ==========================================
// 3. Cinematic Mode Plain LRC Handling Tests
// ==========================================

test('3a. KineticDirector sets words: [] for plain LRC lines without word timestamps', () => {
  const Director = require('../src/modules/kinetic/KineticDirector.js');
  const plainLyrics = [
    { text: 'I walk a lonely road', timeMs: 1000, endMs: 4000 }
  ];

  const timeline = Director.buildTimeline(plainLyrics, { startTimeMs: 0, isCinematic: true, skipIntroMorph: true });
  const scenes = timeline.filter(s => s.id && s.id.startsWith('scene_lyric_'));
  assert.ok(scenes.length > 0, 'Timeline must contain lyric scenes');
  scenes.forEach(scene => {
    assert.deepStrictEqual(scene.words, [], 'Plain LRC scenes must strictly have words: [] to prevent fake word sync');
  });
});

test('3b. KineticTypographyEngine renderStyleA does not progressive-sweep on words: []', () => {
  const TypographyEngine = require('../src/modules/kinetic/KineticTypographyEngine.js');
  let clipCalls = 0;
  let filledTexts = [];

  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    rect: () => {},
    clip: () => { clipCalls++; },
    fillText: (txt) => { filledTexts.push(txt); },
    strokeText: () => {},
    measureText: (str) => ({ width: str.length * 10 }),
    translate: () => {},
    scale: () => {},
    font: '',
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 1,
    strokeStyle: ''
  };

  const bounds = { x: 0, y: 0, width: 800, height: 400 };
  const palette = { textColor: '#ffffff', textRgb: { r: 255, g: 255, b: 255 } };

  // Render plain line with words: []
  TypographyEngine.renderStyleA(mockCtx, {
    text: 'i walk a lonely road',
    words: [],
    currentTimeMs: 2500,
    bounds,
    palette
  });

  assert.strictEqual(clipCalls, 0, 'Must not execute progressive karaoke clip sweeps when words is empty');
  assert.ok(filledTexts.length > 0, 'Must render complete static line');
  assert.ok(filledTexts.some(t => t.includes('lonely')), 'Rendered line must contain lyric content');
});

// ==========================================
// 4. Cinematic Enlarged Typography Hairline Tests
// ==========================================

test('4a. KineticTypographyEngine uses robust serifDisplay font family', () => {
  const enginePath = path.join(__dirname, '../src/modules/kinetic/KineticTypographyEngine.js');
  const engineCode = fs.readFileSync(enginePath, 'utf8');
  assert.ok(
    engineCode.includes('serifDisplay: \'"Playfair Display", "Fraunces"'),
    'serifDisplay must prioritize Playfair Display and Fraunces over Didone hairlines'
  );
});

test('4b. KineticTypographyEngine renderStyleB vertical stretch <= 1.18 and reinforces stroke', () => {
  const enginePath = path.join(__dirname, '../src/modules/kinetic/KineticTypographyEngine.js');
  const engineCode = fs.readFileSync(enginePath, 'utf8');
  const stretchMatch = engineCode.match(/const\s+verticalStretch\s*=\s*([0-9.]+);/);
  assert.ok(stretchMatch, 'Must define verticalStretch in renderStyleB');
  const stretch = parseFloat(stretchMatch[1]);
  assert.ok(stretch <= 1.18 && stretch >= 1.0, `verticalStretch (${stretch}) must be moderate (<= 1.18) to avoid hairline distortion`);
  assert.ok(engineCode.includes('ctx.strokeText(upperText, 0, 0)'), 'Must reinforce giant display punch words with strokeText');
});

test('4c. KineticTypographyEngine renderStyleC vertical scale <= 1.15 and reinforces stroke', () => {
  const enginePath = path.join(__dirname, '../src/modules/kinetic/KineticTypographyEngine.js');
  const engineCode = fs.readFileSync(enginePath, 'utf8');
  assert.ok(engineCode.includes('ctx.scale(1.0, 1.12)'), 'renderStyleC must use balanced 1.12 vertical scale');
  assert.ok(engineCode.includes('ctx.strokeText(topText, 0, 0)'), 'Must reinforce climax punch text with strokeText');
});

// ==========================================
// 5. Album Art Modal Dynamic Aspect Ratio Tests
// ==========================================

test('5a. _playback.css album-art-modal-media-wrapper uses dynamic intrinsic sizing', () => {
  const cssPath = path.join(__dirname, '../src/styles/_playback.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('.album-art-modal-media-wrapper {'), 'Must define .album-art-modal-media-wrapper');
  assert.ok(css.includes('width: max-content;'), 'Media wrapper must use width: max-content for intrinsic sizing');
  assert.ok(css.includes('height: max-content;'), 'Media wrapper must use height: max-content for intrinsic sizing');
  assert.ok(css.includes('max-width: min(560px, 85vw);'), 'Must allow expanded max-width for horizontal covers');
  assert.ok(css.includes('max-height: min(480px, 68vh);'), 'Must constrain max-height comfortably within viewport');
});

test('5b. _playback.css modal image and video use object-fit: contain to prevent horizontal stretching', () => {
  const cssPath = path.join(__dirname, '../src/styles/_playback.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('object-fit: contain;'), 'Modal media must use object-fit: contain to preserve aspect ratio');
  assert.ok(css.includes('width: auto;'), 'Modal media must use width: auto to adapt naturally to intrinsic ratio');
  assert.ok(css.includes('height: auto;'), 'Modal media must use height: auto to adapt naturally to intrinsic ratio');
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
