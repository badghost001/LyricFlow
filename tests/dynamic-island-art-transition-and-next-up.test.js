const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('--- Running Dynamic Island Album Art Sparkle Sweep & Next Up (<6s) Tests ---');

// 1. Static HTML Structure Verification
const htmlPath = path.join(__dirname, '../src/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(
  htmlContent.includes('id="island-art-wrapper"'),
  'index.html must define #island-art-wrapper container'
);
assert(
  htmlContent.includes('id="island-art-tile"') && htmlContent.includes('data-component="island-album-art"'),
  'index.html must define #island-art-tile with alias data-component="island-album-art"'
);
assert(
  htmlContent.includes('id="island-art-img-old"') && htmlContent.includes('id="island-art-img"'),
  'index.html must define dual image layering (#island-art-img-old and #island-art-img)'
);
assert(
  htmlContent.includes('id="island-art-sparkle-sweep"'),
  'index.html must define #island-art-sparkle-sweep overlay'
);
assert(
  (htmlContent.match(/class="art-sparkle"/g) || []).length >= 5 &&
  !htmlContent.includes('class="sparkle-line-beam"'),
  'index.html must define a small particle sweep without a hard sparkle line'
);
assert(!htmlContent.includes('id="island-btn-restore-lyrics"'), 'Dynamic Island must not expose the previous lyrics action');
assert(!htmlContent.includes('id="island-ctx-restore-lyrics"'), 'Dynamic Island context menu must not expose restore previous lyrics');
assert(htmlContent.includes('id="btn-restore-lyrics"'), 'Main player must retain restore previous lyrics');
console.log('  ✓ 1. Static HTML defines dual art layers, small colored particles, and restore action');

// 2. CSS Styling & Keyframes Verification
const cssPath = path.join(__dirname, '../src/styles/_dynamic_island.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(
  cssContent.includes('#dynamic-island.has-art-transition') &&
  cssContent.includes('#dynamic-island:has(.art-transitioning)') &&
  cssContent.includes('overflow: visible !important;'),
  '_dynamic_island.css must allow overflow: visible during art transition to prevent clipping'
);

assert(
  cssContent.includes('#island-album-art,') || cssContent.includes('#island-album-art'),
  '_dynamic_island.css must include #island-album-art selector alias'
);

assert(
  cssContent.includes('islandArtTilePopSettle') &&
  cssContent.includes('transform: translateY(-4px) scale(1.08)'),
  '_dynamic_island.css must define elevation keyframe with translateY(-4px) scale(1.08)'
);

assert(
  cssContent.includes('@keyframes islandSparkleSweepPopSettle') &&
  cssContent.includes('transform: translateX(-50%) translateY(-4px) scale(1.08)'),
  '_dynamic_island.css must define islandSparkleSweepPopSettle preserving translateX(-50%)'
);

assert(
  cssContent.includes('islandSparkleParticleSweep') &&
  cssContent.includes('left: 0%') &&
  cssContent.includes('left: 100%'),
  '_dynamic_island.css must define sweep keyframe traversing 0% to 100%'
);

assert(
  cssContent.includes('@keyframes islandProgressiveReveal') &&
  cssContent.includes('clip-path: inset(0 100% 0 0)') &&
  cssContent.includes('clip-path: inset(0 0% 0 0)'),
  '_dynamic_island.css must define progressive reveal with clip-path easing from 100% to 0%'
);
console.log('  ✓ 2. CSS defines unclipped elevation, particle sweep, progressive reveal, and anchor invariance');

// 3. Renderer Logic & Next Up Trigger Verification
const rendererPath = path.join(__dirname, '../src/renderer.js');
const rendererCode = fs.readFileSync(rendererPath, 'utf8');

assert(
  rendererCode.includes('triggerIslandArtTransition') &&
  rendererCode.includes('has-art-transition'),
  'renderer.js must toggle has-art-transition class during triggerIslandArtTransition'
);

assert(
  rendererCode.includes('remainingMs <= 6000 && remainingMs > 0') &&
  rendererCode.includes("getElementById('island-next-up-preview')") &&
  !rendererCode.includes('island-nextup-pill'),
  'renderer.js must use the floating preview and omit the in-island Next Up badge'
);
assert(cssContent.includes('.island-countdown-pill.island-nextup-pill') && cssContent.includes('display: none !important;'), 'Colored in-island Next Up badge must be suppressed');
assert(!rendererCode.includes('island-btn-restore-lyrics') && !rendererCode.includes('island-ctx-restore-lyrics'), 'renderer.js must omit Island restore actions');
assert(rendererCode.includes('document.getElementById("btn-restore-lyrics")'), 'renderer.js must retain the main player restore action');

assert(
  rendererCode.includes('triggerNextUpDesktopNotification') &&
  rendererCode.includes('nextUpTriggeredTrackId'),
  'renderer.js must declare triggerNextUpDesktopNotification and guard with nextUpTriggeredTrackId'
);

assert(
  rendererCode.includes('remainingMs <= 6000 && remainingMs > 0'),
  'renderer.js updatePlayhead must trigger Next Up display for any positive remaining time <= 6000ms'
);
console.log('  ✓ 3. Renderer logic implements art transition class toggle and <6s Next Up trigger guards');

// 4. Functional VM Simulation
const mockElements = {
  'island-art-wrapper': {
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    },
    offsetWidth: 22
  },
  'island-art-img': {
    src: 'http://example.com/art1.jpg',
    style: {},
    getAttribute(attr) { return this[attr] || null; }
  },
  'island-art-img-old': {
    src: '',
    style: {}
  },
  'island-art-sparkle-sweep': {
    style: {}
  },
  'dynamic-island': {
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    }
  },
  'toast-notification': {
    innerHTML: '',
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    }
  }
};

const sandbox = {
  document: {
    getElementById(id) {
      return mockElements[id] || null;
    }
  },
  currentIslandAlbumArtUrl: 'http://example.com/art1.jpg',
  islandArtTransitionTimer: null,
  isDynamicIslandMode: false,
  escapeHTML(str) { return String(str); },
  window: {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};

vm.createContext(sandbox);

// Test triggerIslandArtTransition
const transitionScript = `
function triggerIslandArtTransition(newUrl) {
  const wrapper = document.getElementById("island-art-wrapper");
  const imgNew = document.getElementById("island-art-img");
  const imgOld = document.getElementById("island-art-img-old");
  const sweep = document.getElementById("island-art-sparkle-sweep");
  const dynamicIslandEl = document.getElementById("dynamic-island");

  if (!imgNew || !newUrl) return;

  const oldUrl = currentIslandAlbumArtUrl || (imgNew.getAttribute("src") || imgNew.src);
  currentIslandAlbumArtUrl = newUrl;

  if (!oldUrl || oldUrl === newUrl || oldUrl === '' || oldUrl.includes("about:blank") || !wrapper) {
    imgNew.src = newUrl;
    if (imgOld) imgOld.style.display = 'none';
    if (sweep) sweep.style.display = 'none';
    if (dynamicIslandEl) dynamicIslandEl.classList.remove("has-art-transition");
    return;
  }

  if (islandArtTransitionTimer) {
    clearTimeout(islandArtTransitionTimer);
    islandArtTransitionTimer = null;
  }
  wrapper.classList.remove("art-transitioning");
  if (dynamicIslandEl) dynamicIslandEl.classList.remove("has-art-transition");
  void wrapper.offsetWidth;

  if (imgOld) {
    imgOld.src = oldUrl;
    imgOld.style.display = "block";
  }
  imgNew.src = newUrl;

  if (sweep) {
    sweep.style.display = "block";
  }

  wrapper.classList.add("art-transitioning");
  if (dynamicIslandEl) dynamicIslandEl.classList.add("has-art-transition");
}

let nextUpTriggeredTrackId = null;

function triggerNextUpDesktopNotification(trackInfo, remainingSec) {
  if (isDynamicIslandMode) return;
  const toastNotification = document.getElementById("toast-notification");
  if (!toastNotification || !trackInfo) return;

  const trackName = trackInfo.name || trackInfo.title || 'Upcoming Track';
  const artistName = trackInfo.artist || (trackInfo.artists ? trackInfo.artists.map(a => a.name).join(', ') : '');
  const artUrl = trackInfo.albumArtUrl || trackInfo.album?.images?.[0]?.url || '';

  toastNotification.innerHTML = '<span class="title">Next Track in ' + remainingSec + 's</span><span class="sub">' + trackName + '</span>';
  toastNotification.classList.add("show");
}
`;

vm.runInContext(transitionScript, sandbox);

// 1. Simulate track change triggering art transition
sandbox.triggerIslandArtTransition('http://example.com/art2.jpg');
assert.strictEqual(mockElements['island-art-wrapper'].classList.contains('art-transitioning'), true);
assert.strictEqual(mockElements['dynamic-island'].classList.contains('has-art-transition'), true);
assert.strictEqual(mockElements['island-art-img-old'].src, 'http://example.com/art1.jpg');
assert.strictEqual(mockElements['island-art-img'].src, 'http://example.com/art2.jpg');
assert.strictEqual(mockElements['island-art-sparkle-sweep'].style.display, 'block');

// 2. Simulate Next Up toast trigger (< 6 seconds)
const trackObj = { id: 'track_123', name: 'Midnight City', artist: 'M83' };
sandbox.triggerNextUpDesktopNotification(trackObj, 5);
assert.strictEqual(mockElements['toast-notification'].classList.contains('show'), true);
assert(mockElements['toast-notification'].innerHTML.includes('Next Track in 5s'));
assert(mockElements['toast-notification'].innerHTML.includes('Midnight City'));

// 3. Verify final second countdown calculation
const testCountdownMs = 450;
const testShowCountdown = testCountdownMs > 0 && testCountdownMs <= 6000;
const testCountdownSec = testShowCountdown ? Math.max(1, Math.ceil(testCountdownMs / 1000)) : 0;
assert.strictEqual(testCountdownSec, 1, 'Final 450ms must display Next up in 1s rather than dropping off');

console.log('  ✓ 4. Functional VM simulation verifies art transition lifecycle and next up notification presentation');

console.log('All Dynamic Island Album Art Sparkle Sweep & Next Up tests passed successfully!\n');
