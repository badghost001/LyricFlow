/**
 * tests/cinematic-pause-highlight-freeze.test.js
 * Verification test to ensure:
 * 1. KineticCanvasRenderer cleanly cancels RAF loop and halts time accumulation on pause.
 * 2. Words in cinematic mode do NOT continually re-highlight over and over when paused.
 * 3. syncPlaybackTime when paused does not trigger a recurring animation loop.
 * 4. setPausedState(true) invokes pause() and halts playback time advancement.
 * 5. Resuming playback cleanly re-engages the playhead loop.
 */

const assert = require('assert');
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
    canvas: { width, height },
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
    measureText(text) {
      return { width: (text || '').length * 12 };
    },
    fillText(text, x, y) {
      operations.push({ op: 'fillText', text, x, y });
    },
    fillRect(x, y, w, h) { operations.push({ op: 'fillRect', x, y, w, h }); },
    clearRect(x, y, w, h) { operations.push({ op: 'clearRect', x, y, w, h }); },
    beginPath() { operations.push({ op: 'beginPath' }); },
    closePath() { operations.push({ op: 'closePath' }); },
    moveTo(x, y) { operations.push({ op: 'moveTo', x, y }); },
    lineTo(x, y) { operations.push({ op: 'lineTo', x, y }); },
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) { operations.push({ op: 'bezierCurveTo' }); },
    quadraticCurveTo(cpx, cpy, x, y) { operations.push({ op: 'quadraticCurveTo' }); },
    stroke() { operations.push({ op: 'stroke' }); },
    fill() { operations.push({ op: 'fill' }); },
    arc(x, y, r) { operations.push({ op: 'arc', x, y, r }); },
    rect(x, y, w, h) { operations.push({ op: 'rect', x, y, w, h }); },
    roundRect(x, y, w, h, r) { operations.push({ op: 'roundRect', x, y, w, h, r }); },
    clip() { operations.push({ op: 'clip' }); },
    createLinearGradient: () => ({
      addColorStop: () => {}
    }),
    createRadialGradient: () => ({
      addColorStop: () => {}
    })
  };

  return { canvas: { width, height, getContext: () => ctx }, ctx, operations };
}

console.log('\n--- Running Cinematic Pause Highlight Freeze Tests ---\n');

test('1a. setPausedState(true) halts playback, cancels RAF, and freezes playhead clock', () => {
  const mock = createMockCanvas();
  const renderer = new KineticCanvasRenderer(mock.canvas, {
    width: 800,
    height: 600,
    isCinematic: true,
    lyrics: [
      { text: 'Hold on tight', timeMs: 1000, endMs: 3000, words: [{ text: 'Hold', timeMs: 1000, endMs: 1500 }] }
    ]
  });
  renderer.ctx = mock.ctx;

  // Start playback
  renderer.play();
  assert.strictEqual(renderer.isPlaying, true, 'Renderer must be playing after play()');
  assert.ok(renderer._rafId !== null, 'RAF must be scheduled during playback');

  // Pause playback
  renderer.setPausedState(true, { title: 'Hold on tight', artist: 'Artist' });
  assert.strictEqual(renderer.isPaused, true, 'isPaused must be true');
  assert.strictEqual(renderer.isPlaying, false, 'isPlaying must become false when paused');
  assert.strictEqual(renderer._rafId, null, 'RAF must be cancelled on pause');

  // Verify clock does not advance
  const pausedTime = 1250;
  renderer.currentTimeMs = pausedTime;
  renderer.syncPlaybackTime(pausedTime);
  assert.strictEqual(renderer.currentTimeMs, pausedTime, 'Clock must remain frozen at paused time');

  renderer.destroy();
});

test('1b. Repeated syncPlaybackTime while paused does not advance clock or run infinite loops', () => {
  const mock = createMockCanvas();
  const renderer = new KineticCanvasRenderer(mock.canvas, {
    width: 800,
    height: 600,
    isCinematic: true,
    lyrics: [
      { text: 'Never let go', timeMs: 2000, endMs: 5000, words: [{ text: 'Never', timeMs: 2000, endMs: 2800 }] }
    ]
  });
  renderer.ctx = mock.ctx;

  renderer.setPausedState(true);
  const pausedPoint = 2400;
  renderer.seek(pausedPoint);

  let renderCount = 0;
  const originalRenderFrame = renderer.renderFrame.bind(renderer);
  renderer.renderFrame = (t) => {
    renderCount++;
    originalRenderFrame(t);
  };

  // Simulate repeated 500ms polling ticks from Spotify while paused at 2400ms
  for (let i = 0; i < 10; i++) {
    renderer.syncPlaybackTime(pausedPoint);
  }

  // After seek, unchanged syncs must NOT re-render or re-sweep
  assert.strictEqual(renderCount, 0, 'Unchanged paused timestamp must not re-render repeatedly');
  assert.strictEqual(renderer.currentTimeMs, pausedPoint, 'Current time must stay exactly at pausedPoint');
  assert.strictEqual(renderer.isPlaying, false, 'Renderer must stay not-playing');

  renderer.destroy();
});

test('1c. Resuming playback after pause restarts playhead loop seamlessly', () => {
  const mock = createMockCanvas();
  const renderer = new KineticCanvasRenderer(mock.canvas, {
    width: 800,
    height: 600,
    isCinematic: true
  });
  renderer.ctx = mock.ctx;

  renderer.setPausedState(true);
  assert.strictEqual(renderer.isPlaying, false);

  // Resume playback
  renderer.setPausedState(false);
  assert.strictEqual(renderer.isPaused, false);
  assert.strictEqual(renderer.isPlaying, true, 'isPlaying must become true on un-pause');
  assert.ok(renderer._rafId !== null, 'RAF loop must be re-engaged on un-pause');

  renderer.destroy();
});

console.log(`\nAll ${passedTests}/${totalTests} Cinematic Pause Highlight Freeze tests passed successfully!\n`);
