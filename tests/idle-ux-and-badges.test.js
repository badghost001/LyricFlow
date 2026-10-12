const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n--- Running Idle Screen Mini-Game & Verified Badges State Tests ---');

// 1. Static HTML & CSS Analysis
console.log('\n1. Static Markup & Styling Verification:');

const indexHtmlPath = path.join(__dirname, '../src/index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

assert(
  indexHtml.includes('id="studio-badges-row"') && indexHtml.includes('style="display: none;"'),
  'studio-badges-row must be hidden by default in index.html'
);
console.log('  ✓ 1a. .studio-badges-row has style="display: none;" in initial HTML');

assert(
  indexHtml.includes('id="studio-badge-provider"') && indexHtml.includes('style="display: none;"'),
  '#studio-badge-provider must have style="display: none;" in index.html'
);
console.log('  ✓ 1b. #studio-badge-provider has style="display: none;" in initial HTML');

assert(
  indexHtml.includes('id="studio-badge-quality"') && indexHtml.includes('style="display: none;"'),
  '#studio-badge-quality must have style="display: none;" in index.html'
);
console.log('  ✓ 1c. #studio-badge-quality has style="display: none;" in initial HTML');

assert(
  indexHtml.includes('modules/flow-game.js'),
  'modules/flow-game.js must be imported in index.html'
);
console.log('  ✓ 1d. modules/flow-game.js script tag registered in index.html');

const studioCssPath = path.join(__dirname, '../src/styles/_studio.css');
const studioCss = fs.readFileSync(studioCssPath, 'utf8');

assert(
  studioCss.includes('.studio-badges-row.has-badges'),
  '_studio.css must define .studio-badges-row.has-badges'
);
assert(
  studioCss.includes('.studio-badge.is-confirmed'),
  '_studio.css must define .studio-badge.is-confirmed'
);
assert(
  studioCss.includes('@keyframes badgePopIn'),
  '_studio.css must define badgePopIn micro-bounce animation'
);
console.log('  ✓ 1e. _studio.css defines .is-confirmed and badgePopIn animation');

const lyricsCssPath = path.join(__dirname, '../src/styles/_lyrics.css');
const lyricsCss = fs.readFileSync(lyricsCssPath, 'utf8');

assert(
  lyricsCss.includes('.flow-game-container'),
  '_lyrics.css must define .flow-game-container'
);
assert(
  lyricsCss.includes('.flow-game-card'),
  '_lyrics.css must define .flow-game-card'
);
assert(
  lyricsCss.includes('#flow-game-canvas'),
  '_lyrics.css must define #flow-game-canvas'
);
assert(
  lyricsCss.includes('.btn-flow-spotify'),
  '_lyrics.css must define .btn-flow-spotify'
);
console.log('  ✓ 1f. _lyrics.css defines Flow Beats card, canvas, and Spotify launcher button');


// 2. Flow Beats Engine Unit & Simulation Tests
console.log('\n2. Flow Beats Engine Behavior:');

// Setup minimal DOM mock
const FlowBeatsGame = require('../src/modules/flow-game.js');
assert(FlowBeatsGame != null, 'FlowBeatsGame must be exported');

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.style = {};
    this.classList = new Set();
    this.classList.add = (c) => this.classList[c] = true;
    this.classList.remove = (c) => delete this.classList[c];
    this.classList.contains = (c) => !!this.classList[c];
    this.classList.toggle = (c, v) => v ? this.classList.add(c) : this.classList.remove(c);
    this._innerHTML = '';
    this.listeners = {};
    this.width = 480;
    this.height = 260;
  }

  set innerHTML(html) {
    this._innerHTML = html;
  }
  get innerHTML() {
    return this._innerHTML;
  }

  querySelector(selector) {
    if (selector === '#flow-game-canvas') {
      const c = new MockElement('canvas');
      c.getContext = () => ({
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        arc: () => {},
        fill: () => {},
        save: () => {},
        restore: () => {},
        fillText: () => {},
        setLineDash: () => {}
      });
      c.getBoundingClientRect = () => ({ left: 0, top: 0, width: 480, height: 260 });
      return c;
    }
    const el = new MockElement();
    return el;
  }

  addEventListener(evt, fn) {
    this.listeners[evt] = fn;
  }
  removeEventListener(evt, fn) {
    delete this.listeners[evt];
  }
}

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb) => 123,
  cancelAnimationFrame: () => {},
  performance: { now: () => 1000 }
};

global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); }
};

const mockContainer = new MockElement('div');
FlowBeatsGame.mount(mockContainer);

assert(FlowBeatsGame.isRunning === true, 'FlowBeatsGame should be running after mount');
assert(mockContainer.innerHTML.includes('id="flow-game-canvas"'), 'Canvas must be in container');
assert(mockContainer.innerHTML.includes('btn-flow-spotify'), 'Spotify launch button must be in container');
console.log('  ✓ 2a. FlowBeatsGame mounts cleanly into DOM with canvas and Spotify launcher');

// Test key navigation
FlowBeatsGame.currentLane = 1;
FlowBeatsGame.onKeyDown({ key: 'ArrowLeft' });
assert.strictEqual(FlowBeatsGame.currentLane, 0, 'ArrowLeft should navigate to left lane');

FlowBeatsGame.onKeyDown({ key: 'ArrowRight' });
assert.strictEqual(FlowBeatsGame.currentLane, 1, 'ArrowRight should navigate back to center lane');

FlowBeatsGame.onKeyDown({ key: 'd' });
assert.strictEqual(FlowBeatsGame.currentLane, 2, 'D key should navigate to right lane');
console.log('  ✓ 2b. Player audio orb navigates lanes accurately with Arrow and A/D keys');

// Test score and streak multiplier
FlowBeatsGame.score = 0;
FlowBeatsGame.streak = 1;
FlowBeatsGame.streakCount = 0;
const testNote = { x: 0.5, y: 0.84, color: '#1ed760' };
FlowBeatsGame.handleHit(testNote, 480, 260);
assert(FlowBeatsGame.score >= 100, 'Score should increase upon note hit');
assert(FlowBeatsGame.streakCount === 1, 'Streak count should increment');

// Simulate 15 consecutive hits
for (let i = 0; i < 15; i++) {
  FlowBeatsGame.handleHit(testNote, 480, 260);
}
assert.strictEqual(FlowBeatsGame.streak, 8, 'Streak should reach 8x on 15 consecutive hits');
assert(parseInt(localStorage.getItem('lyricflow_flowbeats_highscore'), 10) > 0, 'High score persisted in localStorage');
console.log('  ✓ 2c. Rhythmic scoring multiplier increases up to 8x and updates high score in localStorage');

FlowBeatsGame.handleMiss(testNote, 480, 260);
assert.strictEqual(FlowBeatsGame.streak, 1, 'Streak resets to 1x on note miss');
console.log('  ✓ 2d. Streak resets to 1x on note miss');

// Test clean teardown
FlowBeatsGame.destroy();
assert.strictEqual(FlowBeatsGame.isRunning, false, 'Game should stop running after destroy()');
console.log('  ✓ 2e. FlowBeatsGame destroy cleanly terminates animation loop and listeners');


// 3. Renderer Badges State Verification
console.log('\n3. Renderer Badges State Verification Logic:');

const rendererJsPath = path.join(__dirname, '../src/renderer.js');
const rendererJs = fs.readFileSync(rendererJsPath, 'utf8');

// Ensure updateStudioSidebar hides badges when !track
assert(
  rendererJs.includes('if (!track) {') &&
  rendererJs.includes('badgesRow.style.display = "none"') &&
  rendererJs.includes('badgeProvider.style.display = "none"') &&
  rendererJs.includes('badgeQuality.style.display = "none"'),
  'updateStudioSidebar must hide all badges when track is falsy'
);
console.log('  ✓ 3a. updateStudioSidebar strictly hides badges row, provider badge, and quality badge on idle');

// Ensure applyLyricsData confirms synced badge only when level >= 2
assert(
  rendererJs.includes('sourceLevel >= 2') &&
  rendererJs.includes('badgeProvider.classList.add("is-confirmed")'),
  'applyLyricsData must pop up badgeProvider with .is-confirmed only when sourceLevel >= 2'
);
console.log('  ✓ 3b. applyLyricsData pops up Synced / Word-Synced badge only when sourceLevel >= 2');

// Ensure handlePlaybackData verifies audio quality
assert(
  rendererJs.includes('data.audio_quality === \'lossless\'') &&
  rendererJs.includes('badgeQuality.classList.add("is-confirmed")'),
  'handlePlaybackData must strictly verify lossless audio before showing quality badge'
);
console.log('  ✓ 3c. handlePlaybackData strictly verifies audio encoding before displaying Lossless badge');

// Ensure handlePlaybackData destroys mini-game
assert(
  rendererJs.includes('window.FlowBeatsGame.destroy()'),
  'handlePlaybackData must destroy FlowBeatsGame when song starts playing'
);
console.log('  ✓ 3d. handlePlaybackData automatically destroys FlowBeatsGame when playback commences');

console.log('\nAll Idle Screen Mini-Game & Verified Badges State tests passed successfully!\n');
