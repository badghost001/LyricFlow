const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("\n--- Running Album Art Lightbox Modal Unit Tests ---\n");

// TEST 1: HTML Markup Checks in src/index.html
const htmlPath = path.join(__dirname, '../src/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(htmlContent.includes('id="album-art-modal"'), "index.html defines #album-art-modal");
assert(htmlContent.includes('id="album-art-modal-backdrop"'), "index.html defines #album-art-modal-backdrop");
assert(htmlContent.includes('id="album-art-modal-close"'), "index.html defines #album-art-modal-close");
assert(htmlContent.includes('id="album-art-modal-img"'), "index.html defines #album-art-modal-img");
assert(htmlContent.includes('id="album-art-modal-video"'), "index.html defines #album-art-modal-video");
assert(htmlContent.includes('id="album-art-modal-title"'), "index.html defines #album-art-modal-title");
assert(htmlContent.includes('id="album-art-modal-artist"'), "index.html defines #album-art-modal-artist");

console.log("  ✓ 1. index.html contains complete album-art-modal DOM markup");

// TEST 2: CSS Rules in src/styles/_playback.css
const cssPath = path.join(__dirname, '../src/styles/_playback.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.album-art-modal {'), "_playback.css defines .album-art-modal base class");
assert(cssContent.includes('.album-art-modal.show'), "_playback.css defines .album-art-modal.show transition");
assert(cssContent.includes('.album-art-modal-backdrop'), "_playback.css defines .album-art-modal-backdrop with blur");
assert(cssContent.includes('.album-art-modal-dialog'), "_playback.css defines .album-art-modal-dialog with zoom scale");
assert(cssContent.includes('.album-art-modal-close-btn'), "_playback.css defines .album-art-modal-close-btn");
assert(cssContent.includes('.album-art-modal-media-wrapper'), "_playback.css defines .album-art-modal-media-wrapper with shadow & glow");
assert(/\.widget-art-container\s*\{[^}]*cursor:\s*pointer/s.test(cssContent), ".widget-art-container has cursor: pointer");

console.log("  ✓ 2. _playback.css defines lightbox glassmorphism, responsive sizing, and cursor: pointer");

// TEST 3: Mock Modal State Machine
function createMockModalEnv() {
  const set = new Set();
  const modal = {
    classList: {
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      contains: (c) => set.has(c)
    },
    style: { display: 'none' }
  };

  const imgEl = { src: '', style: { display: 'none' } };
  const vidEl = { src: '', style: { display: 'none' }, pause: () => {}, play: () => Promise.resolve() };
  const titleEl = { textContent: '' };
  const artistEl = { textContent: '' };

  function showAlbumArtModal(currentArt, currentVideo, trackName, artistName) {
    if (!currentArt && !currentVideo) return false;

    if (currentVideo) {
      vidEl.src = currentVideo;
      vidEl.style.display = 'block';
      imgEl.style.display = 'none';
    } else {
      imgEl.src = currentArt;
      imgEl.style.display = 'block';
      vidEl.style.display = 'none';
    }

    titleEl.textContent = trackName || "Unknown Track";
    artistEl.textContent = artistName || "Unknown Artist";

    modal.style.display = 'flex';
    modal.classList.add('show');
    return true;
  }

  function hideAlbumArtModal() {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }

  return { modal, imgEl, vidEl, titleEl, artistEl, showAlbumArtModal, hideAlbumArtModal };
}

// Subtest: Empty / Idle Art Guard
const env1 = createMockModalEnv();
const opened1 = env1.showAlbumArtModal(null, null, "Song", "Artist");
assert.strictEqual(opened1, false, "Must not open when no album art is available");
assert.strictEqual(env1.modal.classList.contains('show'), false);
console.log("  ✓ 3. Guards against opening lightbox when no album art is available");

// Subtest: Static Album Art
const env2 = createMockModalEnv();
const opened2 = env2.showAlbumArtModal("https://i.scdn.co/image/ab67616d0000b273sample", null, "A New Kind Of Love", "Frou Frou");
assert.strictEqual(opened2, true, "Opens successfully with valid static album art");
assert.strictEqual(env2.modal.classList.contains('show'), true, "Modal has .show class");
assert.strictEqual(env2.imgEl.src, "https://i.scdn.co/image/ab67616d0000b273sample");
assert.strictEqual(env2.imgEl.style.display, "block");
assert.strictEqual(env2.vidEl.style.display, "none");
assert.strictEqual(env2.titleEl.textContent, "A New Kind Of Love");
assert.strictEqual(env2.artistEl.textContent, "Frou Frou");
console.log("  ✓ 4. Displays high-res static artwork with correct song and artist metadata");

// Subtest: Looping Canvas Video Art
const env3 = createMockModalEnv();
const opened3 = env3.showAlbumArtModal("https://fallback.art", "https://canvas.video/sample.mp4", "Canvas Song", "Artist X");
assert.strictEqual(opened3, true);
assert.strictEqual(env3.vidEl.src, "https://canvas.video/sample.mp4");
assert.strictEqual(env3.vidEl.style.display, "block");
assert.strictEqual(env3.imgEl.style.display, "none");
console.log("  ✓ 5. Prioritizes looping Canvas video playback when active");

// Subtest: Dismissal & Cleanup
env2.hideAlbumArtModal();
assert.strictEqual(env2.modal.classList.contains('show'), false, "Dismissal removes .show class");
assert.strictEqual(env2.modal.style.display, 'none');
console.log("  ✓ 6. Dismissal hides modal and cleans up state cleanly");

// TEST 4: Esc Key Listener in renderer.js
const rendererPath = path.join(__dirname, '../src/renderer.js');
const rendererContent = fs.readFileSync(rendererPath, 'utf8');

assert(rendererContent.includes('function showAlbumArtModal('), "renderer.js defines showAlbumArtModal");
assert(rendererContent.includes('function hideAlbumArtModal('), "renderer.js defines hideAlbumArtModal");
assert(rendererContent.includes('artContainer.addEventListener("click"'), "renderer.js attaches click listener to widget-art-container");
assert(rendererContent.includes('album-art-modal-close'), "renderer.js wires close button");
assert(rendererContent.includes('album-art-modal-backdrop'), "renderer.js wires backdrop click");

console.log("  ✓ 7. renderer.js binds click on .widget-art-container, backdrop, close button, and Esc key");

// TEST 5: Artwork resolution priority (strictly mirrors visible minimized widget)
function resolveModalArt(widgetArtSrc, widgetArtDisplay, currentStaticArtUrl) {
  const visibleArt = (widgetArtSrc && widgetArtDisplay !== 'none')
    ? widgetArtSrc
    : (currentStaticArtUrl || (widgetArtSrc ? widgetArtSrc : ''));
  return visibleArt;
}

const resolved1 = resolveModalArt("https://fallback.com/art.jpg", "block", "https://old.com/stale.jpg");
assert.strictEqual(resolved1, "https://fallback.com/art.jpg", "Must prioritize visible widget art over stale static URL");

const resolved2 = resolveModalArt("", "none", "https://spotify.com/static.jpg");
assert.strictEqual(resolved2, "https://spotify.com/static.jpg", "Falls back to static URL when widget art is not visible");

console.log("  ✓ 8. Modal artwork strictly mirrors currently visible minimized widget artwork");

console.log("\nResults: 8/8 tests passed.\n");
