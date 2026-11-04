/**
 * tests/adversarial-m2-2-container-seek.test.js
 * Dedicated Automated Stress Test Suite for Milestone 2:
 * Feature 7: Container Click & Drag Seek Reliability in src/renderer.js
 *
 * Empirical Challenger Verification:
 * 1. Click & Long-Press Behavior (delayed click > 300ms, rapid consecutive clicks, deduplication)
 * 2. Pointer Capture & Drag Lifecycle across extreme coordinates (negative X, 0, mid, beyond width)
 * 3. Abnormal Release Fault Tolerance (pointercancel, lostpointercapture, window fallbacks)
 * 4. Debounce Guard Precision (< 300ms window)
 * 5. setMainProgressFill & --progress-ratio Contract Verification
 * 6. CSS Gesture & Container Invariants
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock DOM Implementation
// ─────────────────────────────────────────────────────────────────────────────

class MockClassList {
  constructor() {
    this._classes = new Set();
  }
  add(...classes) {
    for (const c of classes) this._classes.add(c);
  }
  remove(...classes) {
    for (const c of classes) this._classes.delete(c);
  }
  contains(c) {
    return this._classes.has(c);
  }
  toggle(c, force) {
    if (force !== undefined) {
      if (force) this.add(c);
      else this.remove(c);
      return force;
    }
    if (this.contains(c)) {
      this.remove(c);
      return false;
    } else {
      this.add(c);
      return true;
    }
  }
}

class MockElement {
  constructor(tag, id = '', className = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = className;
    this.classList = new MockClassList();
    if (className) {
      for (const c of className.split(/\s+/).filter(Boolean)) {
        this.classList.add(c);
      }
    }
    const styleProps = {};
    this.style = new Proxy({
      _props: styleProps,
      setProperty: (prop, val) => {
        styleProps[prop] = String(val);
      },
      getPropertyValue: (prop) => styleProps[prop] || '',
      removeProperty: (prop) => {
        delete styleProps[prop];
      }
    }, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return styleProps[prop] || '';
      },
      set: (target, prop, value) => {
        if (prop in target) {
          target[prop] = value;
        } else {
          styleProps[prop] = String(value);
        }
        return true;
      }
    });
    this.textContent = '';
    this.children = [];
    this.parentElement = null;
    this.listeners = {};
    this.capturedPointers = new Set();
    this.releasedPointers = new Set();
    this._rect = { left: 100, top: 50, width: 400, height: 20 };
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }

  contains(child) {
    if (!child) return false;
    if (child === this) return true;
    for (const c of this.children) {
      if (c.contains(child)) return true;
    }
    return false;
  }

  closest(selector) {
    let cur = this;
    while (cur) {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        if (cur.classList.contains(cls)) return cur;
      } else if (selector.startsWith('#')) {
        const id = selector.slice(1);
        if (cur.id === id) return cur;
      }
      cur = cur.parentElement;
    }
    return null;
  }

  getBoundingClientRect() {
    return { ...this._rect };
  }

  setPointerCapture(pointerId) {
    this.capturedPointers.add(pointerId);
  }

  releasePointerCapture(pointerId) {
    this.capturedPointers.delete(pointerId);
    this.releasedPointers.add(pointerId);
  }

  addEventListener(type, handler, options) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push({ handler, options });
  }

  removeEventListener(type, handler) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(l => l.handler !== handler);
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    event.currentTarget = this;
    if (this.listeners[event.type]) {
      for (const { handler } of [...this.listeners[event.type]]) {
        handler(event);
      }
    }
    if (event.bubbles !== false && !event.propagationStopped && this.parentElement) {
      this.parentElement.dispatchEvent(event);
    }
    return !event.defaultPrevented;
  }
}

class MockEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.bubbles = init.bubbles !== undefined ? init.bubbles : true;
    this.button = init.button !== undefined ? init.button : 0;
    this.pointerId = init.pointerId !== undefined ? init.pointerId : 1;
    this.clientX = init.clientX !== undefined ? init.clientX : 0;
    this.clientY = init.clientY !== undefined ? init.clientY : 0;
    this.detail = init.detail !== undefined ? init.detail : 1;
    this.target = init.target || null;
    this.currentTarget = null;
    this.defaultPrevented = false;
    this.propagationStopped = false;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }

  stopPropagation() {
    this.propagationStopped = true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sandbox Factory: Loads Real Code from src/renderer.js
// ─────────────────────────────────────────────────────────────────────────────

function createTestHarness(options = {}) {
  const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');

  // Extract setMainProgressFill
  const fillStart = rendererCode.indexOf('function setMainProgressFill(percent) {');
  assert.ok(fillStart !== -1, 'setMainProgressFill must exist in src/renderer.js');
  const fillEnd = rendererCode.indexOf('\nlet _lastPlaybackInterpolationTime', fillStart);
  assert.ok(fillEnd !== -1, 'End of setMainProgressFill must be located');
  const setMainProgressFillCode = rendererCode.slice(fillStart, fillEnd);

  // Extract attachScrubberController
  const controllerStart = rendererCode.indexOf('function attachScrubberController({');
  assert.ok(controllerStart !== -1, 'attachScrubberController must exist in src/renderer.js');
  const controllerEnd = rendererCode.indexOf('\n  attachScrubberController({', controllerStart + 1);
  assert.ok(controllerEnd !== -1, 'End of attachScrubberController must be located');
  const attachScrubberControllerCode = rendererCode.slice(controllerStart, controllerEnd);

  // Extract container seek controller block
  const containerStart = rendererCode.indexOf('const mainProgressContainer = document.querySelector(".playback-widget .progress-bar-container");');
  assert.ok(containerStart !== -1, 'mainProgressContainer controller block must exist in src/renderer.js');
  const containerEnd = rendererCode.indexOf('\n  // Keyboard Shortcuts for Modes, Playback', containerStart);
  assert.ok(containerEnd !== -1, 'End of mainProgressContainer controller block must be located');
  const containerCode = rendererCode.slice(containerStart, containerEnd);

  // Build DOM Structure
  const playbackWidget = new MockElement('div', 'playback-widget', 'playback-widget');
  const widgetTrackPanel = new MockElement('div', '', 'widget-track-panel');
  const widgetInfo = new MockElement('div', '', 'widget-info');
  const container = new MockElement('div', '', 'progress-bar-container');
  const track = new MockElement('div', 'main-progress-track', 'progress-bar-bg');
  const fill = new MockElement('div', 'widget-progress-fill', 'progress-bar-fill');
  const thumb = new MockElement('div', 'main-progress-thumb', 'progress-bar-thumb');
  const hover = new MockElement('div', 'main-progress-hover', 'progress-bar-hover');
  const tooltip = new MockElement('div', 'main-progress-tooltip', 'progress-tooltip');
  const progressTime = new MockElement('div', '', 'progress-time');
  const timeCurrent = new MockElement('span', 'widget-time-current', '');
  const timeDuration = new MockElement('span', 'widget-time-duration', '');

  track.appendChild(hover);
  track.appendChild(fill);
  track.appendChild(thumb);
  track.appendChild(tooltip);

  progressTime.appendChild(timeCurrent);
  progressTime.appendChild(timeDuration);

  container.appendChild(track);
  container.appendChild(progressTime);

  widgetInfo.appendChild(container);
  widgetTrackPanel.appendChild(widgetInfo);
  playbackWidget.appendChild(widgetTrackPanel);

  // Configure Track Geometry: left=100, width=400 (x: 100 to 500)
  track._rect = { left: 100, top: 50, width: 400, height: 12 };
  container._rect = { left: 80, top: 40, width: 440, height: 32 };

  // Spies and Trackers
  const seeksDispatched = [];
  let currentTime = 1000000;

  const mockWindowListeners = {};
  const mockWindow = {
    _showRemainingTime: Boolean(options.showRemainingTime),
    addEventListener: (type, handler, opts) => {
      if (!mockWindowListeners[type]) mockWindowListeners[type] = [];
      mockWindowListeners[type].push({ handler, opts });
    },
    removeEventListener: (type, handler) => {
      if (!mockWindowListeners[type]) return;
      mockWindowListeners[type] = mockWindowListeners[type].filter(l => l.handler !== handler);
    },
    dispatchEvent: (event) => {
      if (mockWindowListeners[event.type]) {
        for (const { handler } of [...mockWindowListeners[event.type]]) {
          handler(event);
        }
      }
    }
  };

  const elementsById = {
    'playback-widget': playbackWidget,
    'main-progress-track': track,
    'widget-progress-fill': fill,
    'main-progress-thumb': thumb,
    'main-progress-hover': hover,
    'main-progress-tooltip': tooltip,
    'widget-time-current': timeCurrent,
    'widget-time-duration': timeDuration
  };

  const mockDocument = {
    getElementById: (id) => elementsById[id] || null,
    querySelector: (sel) => {
      if (sel === '.playback-widget .progress-bar-container') return container;
      if (sel === '#main-progress-track' || sel === '.progress-bar-bg') return track;
      if (sel === '#widget-progress-fill') return fill;
      if (sel === '#main-progress-thumb') return thumb;
      if (sel === '#widget-time-current') return timeCurrent;
      return null;
    },
    querySelectorAll: () => []
  };

  function formatTime(ms) {
    if (!ms || isNaN(ms) || ms <= 0) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  }

  const sandbox = {
    window: mockWindow,
    document: mockDocument,
    widgetProgressFill: fill,
    widgetTimeDuration: timeDuration,
    formatTime,
    trackDuration: options.trackDuration !== undefined ? options.trackDuration : 240000,
    getEffectiveTrackDuration: () => options.effectiveDuration !== undefined ? options.effectiveDuration : 240000,
    settings: {
      progressBarSeek: options.progressBarSeek !== undefined ? options.progressBarSeek : true,
      progressWheelSeek: true
    },
    isScrubbingMainProgress: false,
    lastPlaybackActivityMs: 0,
    seekPlayback: (seekMs) => {
      seeksDispatched.push({ seekMs, timestamp: currentTime });
    },
    currentProgress: options.currentProgress !== undefined ? options.currentProgress : 0,
    lastPollProgress: 0,
    showIslandHud: () => {},
    handleIslandClusterLeave: () => {},
    Date: {
      now: () => currentTime
    },
    Math,
    Number,
    setTimeout,
    clearTimeout
  };

  // Run setMainProgressFill in context
  vm.runInNewContext(setMainProgressFillCode, sandbox);

  // Run attachScrubberController in context
  vm.runInNewContext(attachScrubberControllerCode, sandbox);
  if (options.attachTrackController) {
    sandbox.attachScrubberController({
      trackEl: track,
      fillEl: fill,
      thumbEl: thumb,
      hoverEl: hover,
      tooltipEl: tooltip,
      timeCurrentEl: timeCurrent,
      isIsland: false
    });
  }

  // Run container seek controller in context
  vm.runInNewContext(containerCode, sandbox);

  return {
    sandbox,
    container,
    track,
    fill,
    thumb,
    progressTime,
    timeCurrent,
    timeDuration,
    mockWindow,
    mockWindowListeners,
    seeksDispatched,
    setTime: (t) => { currentTime = t; },
    advanceTime: (ms) => { currentTime += ms; },
    getTime: () => currentTime
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE ADVERSARIAL STRESS TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n======================================================================');
console.log('CHALLENGER M2-2: Container Click & Drag Seek Stress Test Suite');
console.log('======================================================================\n');

// ─── SUITE 1: DOM & Controller Setup Invariants ─────────────────────────────
console.log('--- Suite 1: DOM & Controller Setup Invariants ---');

test('1.1. mainProgressContainer controller registers all essential pointer listeners', () => {
  const h = createTestHarness();
  assert.strictEqual(typeof h.container.listeners['pointerdown']?.[0]?.handler, 'function');
  assert.strictEqual(typeof h.container.listeners['pointermove']?.[0]?.handler, 'function');
  assert.strictEqual(typeof h.container.listeners['pointerup']?.[0]?.handler, 'function');
  assert.strictEqual(typeof h.container.listeners['pointercancel']?.[0]?.handler, 'function');
  assert.strictEqual(typeof h.container.listeners['lostpointercapture']?.[0]?.handler, 'function');
  assert.strictEqual(typeof h.container.listeners['click']?.[0]?.handler, 'function');
});

test('1.2. Source code wraps setPointerCapture and releasePointerCapture in try-catch', () => {
  const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert.match(
    rendererCode,
    /try\s*\{\s*mainProgressContainer\.setPointerCapture\(e\.pointerId\);\s*\}\s*catch\s*\(_\)\s*\{\}/,
    'setPointerCapture must be guarded with try-catch'
  );
  assert.match(
    rendererCode,
    /try\s*\{\s*mainProgressContainer\.releasePointerCapture\(pointerIdToRelease\);\s*\}\s*catch\s*\(_\)\s*\{\}/,
    'releasePointerCapture must be guarded with try-catch'
  );
});

// ─── SUITE 2: Click & Long-Press Behavior ────────────────────────────────────
console.log('\n--- Suite 2: Click & Long-Press Behavior (Deduplication & Rejection) ---');

test('2.1. Long-press (>300ms) pointerdown followed by click dispatches EXACTLY ONE seek', () => {
  const h = createTestHarness({ trackDuration: 200000 });
  h.setTime(1000);

  // User presses at clientX = 200 (track: 100 to 500, ratio = 0.25 -> 50000ms)
  const downEv = new MockEvent('pointerdown', { clientX: 200, pointerId: 1 });
  h.container.dispatchEvent(downEv);

  assert.strictEqual(h.sandbox.isScrubbingMainProgress, true, 'isScrubbingMainProgress must be true during press');
  assert.strictEqual(h.seeksDispatched.length, 0, 'No seek dispatched on pointerdown');

  // 350ms elapsed before release (long press)
  h.advanceTime(350);

  // User releases at same position
  const upEv = new MockEvent('pointerup', { clientX: 200, pointerId: 1 });
  h.container.dispatchEvent(upEv);

  assert.strictEqual(h.seeksDispatched.length, 1, 'pointerup must dispatch seek once');
  assert.strictEqual(h.seeksDispatched[0].seekMs, 50000);
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false, 'isScrubbingMainProgress must be restored to false');

  // Browser immediately fires synthetic click after pointerup
  const clickEv = new MockEvent('click', { clientX: 200 });
  h.container.dispatchEvent(clickEv);

  assert.strictEqual(clickEv.defaultPrevented, true, 'click event default must be prevented');
  assert.strictEqual(clickEv.propagationStopped, true, 'click event propagation must be stopped');
  assert.strictEqual(h.seeksDispatched.length, 1, 'click MUST NOT dispatch a duplicate seek!');
});

test('2.2. Rapid consecutive clicks within 300ms debounce interval are strictly suppressed', () => {
  const h = createTestHarness({ trackDuration: 240000 });
  h.setTime(5000);

  // Click 1 at t=5000 (clientX = 200 -> ratio 0.25 -> 60000ms)
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 200, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 200, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('click', { clientX: 200 }));

  assert.strictEqual(h.seeksDispatched.length, 1, 'First click commits seek');
  assert.strictEqual(h.seeksDispatched[0].seekMs, 60000);

  // Click 2 at t=5050 (50ms later, clientX = 300) -> must be debounced
  h.advanceTime(50);
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 300, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 300, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('click', { clientX: 300 }));
  assert.strictEqual(h.seeksDispatched.length, 1, 'Click at +50ms must be dropped by debounce');

  // Click 3 at t=5150 (150ms later, clientX = 400) -> must be debounced
  h.advanceTime(100);
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 400, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 400, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('click', { clientX: 400 }));
  assert.strictEqual(h.seeksDispatched.length, 1, 'Click at +150ms must be dropped by debounce');

  // Click 4 at t=5290 (290ms later) -> still within 300ms interval
  h.advanceTime(140);
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 400, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 400, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('click', { clientX: 400 }));
  assert.strictEqual(h.seeksDispatched.length, 1, 'Click at +290ms must still be dropped');

  // Click 5 at t=5310 (310ms after first seek, clientX = 500 -> ratio 1.0 -> 240000ms) -> accepted!
  h.advanceTime(20);
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 500, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 500, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('click', { clientX: 500 }));

  assert.strictEqual(h.seeksDispatched.length, 2, 'Click after 310ms must commit cleanly');
  assert.strictEqual(h.seeksDispatched[1].seekMs, 240000);
});

test('2.3. Non-primary mouse buttons (right click, middle click) do not initiate seek', () => {
  const h = createTestHarness();
  h.setTime(1000);

  // Middle click (button 1)
  h.container.dispatchEvent(new MockEvent('pointerdown', { button: 1, clientX: 250 }));
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false);
  h.container.dispatchEvent(new MockEvent('pointerup', { button: 1, clientX: 250 }));
  assert.strictEqual(h.seeksDispatched.length, 0, 'Middle click must not seek');

  // Right click (button 2)
  h.container.dispatchEvent(new MockEvent('pointerdown', { button: 2, clientX: 250 }));
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false);
  h.container.dispatchEvent(new MockEvent('pointerup', { button: 2, clientX: 250 }));
  assert.strictEqual(h.seeksDispatched.length, 0, 'Right click must not seek');
});

test('2.4. Pointer events on .progress-time child are ignored by container seek handler', () => {
  const h = createTestHarness();
  h.setTime(1000);

  const downEv = new MockEvent('pointerdown', { clientX: 250, target: h.timeCurrent });
  h.container.dispatchEvent(downEv);

  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false, 'Clicks on progress time must not start container scrub');
  assert.strictEqual(h.seeksDispatched.length, 0);

  const clickEv = new MockEvent('click', { target: h.timeCurrent });
  h.container.dispatchEvent(clickEv);
  assert.strictEqual(clickEv.defaultPrevented, false, 'Time toggle click must NOT be prevented');
});

test('2.5. Pointer events on #main-progress-track or its children are ignored by container handler', () => {
  const h = createTestHarness();
  h.setTime(1000);

  // Target track directly
  const trackDown = new MockEvent('pointerdown', { clientX: 250, target: h.track });
  h.container.dispatchEvent(trackDown);
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false, 'Direct track clicks must bypass container handler');

  // Target track child fill element
  const fillDown = new MockEvent('pointerdown', { clientX: 250, target: h.fill });
  h.container.dispatchEvent(fillDown);
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false, 'Track child clicks must bypass container handler');

  // Click on track is NOT prevented by container
  const trackClick = new MockEvent('click', { target: h.track });
  h.container.dispatchEvent(trackClick);
  assert.strictEqual(trackClick.defaultPrevented, false, 'Track click must not be suppressed by container');
});

test('2.6. settings.progressBarSeek === false completely gates container seeking', () => {
  const h = createTestHarness({ progressBarSeek: false });
  h.setTime(1000);

  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 300, pointerId: 1 }));
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false, 'Seeking must be blocked when disabled');

  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 300, pointerId: 1 }));
  assert.strictEqual(h.seeksDispatched.length, 0, 'No seek should be committed');
});

test('2.7. Zero or negative track duration safely aborts container seek without error', () => {
  const h = createTestHarness({ trackDuration: 0, effectiveDuration: 0 });
  h.setTime(1000);

  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 300, pointerId: 1 }));
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false, 'Zero duration must abort seek initiation');
  assert.strictEqual(h.seeksDispatched.length, 0);
});

// ─── SUITE 3: Pointer Capture & Drag Lifecycle Across Extreme Coordinates ────
console.log('\n--- Suite 3: Pointer Capture & Drag Lifecycle Across Extreme Coordinates ---');

test('3.1. Pointerdown acquires pointer capture and attaches window fallback listeners', () => {
  const h = createTestHarness();
  h.setTime(1000);

  const downEv = new MockEvent('pointerdown', { clientX: 200, pointerId: 42 });
  h.container.dispatchEvent(downEv);

  assert.ok(h.container.capturedPointers.has(42), 'setPointerCapture must be called with pointerId');
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, true);
  assert.strictEqual(h.track.classList.contains('is-scrubbing'), true);

  // Check window fallback listeners were attached
  assert.strictEqual(h.mockWindowListeners['pointerup']?.length, 1);
  assert.strictEqual(h.mockWindowListeners['pointercancel']?.length, 1);
  assert.strictEqual(h.mockWindowListeners['pointermove']?.length, 1);
});

test('3.2. Pointermove across extreme coordinates (negative X, 0, mid, beyond width) clamps smoothly', () => {
  const h = createTestHarness({ trackDuration: 200000 }); // 200s track, rect: left=100, width=400
  h.setTime(1000);

  // Initiate drag at 25% (clientX = 200)
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 200, pointerId: 1 }));
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.25000');
  assert.strictEqual(h.thumb.style.left, '25%');
  assert.strictEqual(h.timeCurrent.textContent, '0:50');

  // Move 1: Extreme negative coordinate clientX = -500 (far off to the left)
  h.container.dispatchEvent(new MockEvent('pointermove', { clientX: -500, pointerId: 1 }));
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.00000', 'Negative X must clamp ratio to 0.0');
  assert.strictEqual(h.thumb.style.left, '0%');
  assert.strictEqual(h.timeCurrent.textContent, '0:00');
  assert.strictEqual(h.seeksDispatched.length, 0, 'Pointermove must never dispatch seek');

  // Move 2: Exact clientX = 0
  h.container.dispatchEvent(new MockEvent('pointermove', { clientX: 0, pointerId: 1 }));
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.00000', 'clientX=0 must clamp ratio to 0.0');

  // Move 3: Left boundary clientX = 100
  h.container.dispatchEvent(new MockEvent('pointermove', { clientX: 100, pointerId: 1 }));
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.00000');
  assert.strictEqual(h.thumb.style.left, '0%');
  assert.strictEqual(h.timeCurrent.textContent, '0:00');

  // Move 4: Exact mid-point clientX = 300 (ratio 0.5)
  h.container.dispatchEvent(new MockEvent('pointermove', { clientX: 300, pointerId: 1 }));
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.50000', 'Mid-point must be exactly 0.5');
  assert.strictEqual(h.thumb.style.left, '50%');
  assert.strictEqual(h.timeCurrent.textContent, '1:40');

  // Move 5: Right boundary clientX = 500 (ratio 1.0)
  h.container.dispatchEvent(new MockEvent('pointermove', { clientX: 500, pointerId: 1 }));
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '1.00000');
  assert.strictEqual(h.thumb.style.left, '100%');
  assert.strictEqual(h.timeCurrent.textContent, '3:20');

  // Move 6: Extreme beyond-width coordinate clientX = 1500 (far off to the right)
  h.container.dispatchEvent(new MockEvent('pointermove', { clientX: 1500, pointerId: 1 }));
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '1.00000', 'Values > width must clamp to 1.0');
  assert.strictEqual(h.thumb.style.left, '100%');
  assert.strictEqual(h.timeCurrent.textContent, '3:20');

  // Move 7: Back to 75% (clientX = 400)
  h.container.dispatchEvent(new MockEvent('pointermove', { clientX: 400, pointerId: 1 }));
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.75000');
  assert.strictEqual(h.thumb.style.left, '75%');
  assert.strictEqual(h.timeCurrent.textContent, '2:30');

  assert.strictEqual(h.sandbox.isScrubbingMainProgress, true, 'isScrubbingMainProgress must remain true throughout drag');
  assert.strictEqual(h.seeksDispatched.length, 0, 'No seeks committed during dragging phase');

  // Commit on pointerup at clientX = 400
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 400, pointerId: 1 }));

  assert.strictEqual(h.seeksDispatched.length, 1, 'Exactly one seek committed on pointerup');
  assert.strictEqual(h.seeksDispatched[0].seekMs, 150000, 'Seek target must match 75% of 200,000ms');
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false, 'isScrubbingMainProgress restored to false');
  assert.strictEqual(h.track.classList.contains('is-scrubbing'), false, 'is-scrubbing class removed from track');
  assert.ok(h.container.releasedPointers.has(1), 'Pointer capture must be released');
  assert.strictEqual(h.mockWindowListeners['pointermove']?.length, 0, 'Window listeners detached');
});

test('3.3. Remaining time toggle renders negative remaining timestamp during drag', () => {
  const h = createTestHarness({ trackDuration: 240000, showRemainingTime: true });
  h.setTime(1000);

  // Drag to 25% (60s elapsed of 240s -> remaining = 180s = -3:00)
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 200, pointerId: 1 }));
  assert.strictEqual(h.timeCurrent.textContent, '1:00');
  assert.strictEqual(h.timeDuration.textContent, '-3:00', 'Duration element must show remaining time');

  // Drag to 75% (180s elapsed -> remaining = 60s = -1:00)
  h.container.dispatchEvent(new MockEvent('pointermove', { clientX: 400, pointerId: 1 }));
  assert.strictEqual(h.timeCurrent.textContent, '3:00');
  assert.strictEqual(h.timeDuration.textContent, '-1:00');

  // Drag to 100% (remaining = 0s = -0:00)
  h.container.dispatchEvent(new MockEvent('pointermove', { clientX: 500, pointerId: 1 }));
  assert.strictEqual(h.timeCurrent.textContent, '4:00');
  assert.strictEqual(h.timeDuration.textContent, '-0:00');

  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 500, pointerId: 1 }));
  assert.strictEqual(h.seeksDispatched[0].seekMs, 240000);
});

// ─── SUITE 4: Abnormal Release & Fault Tolerance ────────────────────────────
console.log('\n--- Suite 4: Abnormal Release & Fault Tolerance (pointercancel, lostpointercapture, window fallback) ---');

test('4.1. pointercancel cleans up drag state cleanly and commits with lastContainerRatio', () => {
  const h = createTestHarness({ trackDuration: 180000 });
  h.setTime(1000);

  // Drag to 60% (clientX = 340)
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 340, pointerId: 10 }));
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, true);

  // System interrupts with pointercancel (e.g. system modal, notification, gesture takeover)
  const cancelEv = new MockEvent('pointercancel', { pointerId: 10 });
  h.container.dispatchEvent(cancelEv);

  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false, 'isScrubbingMainProgress must be reset on pointercancel');
  assert.strictEqual(h.track.classList.contains('is-scrubbing'), false);
  assert.ok(h.container.releasedPointers.has(10), 'Pointer capture must be released on pointercancel');
  assert.strictEqual(h.mockWindowListeners['pointerup']?.length, 0, 'Window listeners must be detached');

  assert.strictEqual(h.seeksDispatched.length, 1, 'pointercancel must commit seek');
  assert.strictEqual(h.seeksDispatched[0].seekMs, 108000, 'Must commit using lastContainerRatio (60% of 180s = 108s)');
});

test('4.2. lostpointercapture during active drag gracefully commits seek and cleans up', () => {
  const h = createTestHarness({ trackDuration: 100000 });
  h.setTime(1000);

  // Drag to 40% (clientX = 260)
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 260, pointerId: 7 }));
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, true);

  // OS drops capture
  const lostEv = new MockEvent('lostpointercapture', { pointerId: 7 });
  h.container.dispatchEvent(lostEv);

  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false);
  assert.strictEqual(h.track.classList.contains('is-scrubbing'), false);
  assert.strictEqual(h.seeksDispatched.length, 1);
  assert.strictEqual(h.seeksDispatched[0].seekMs, 40000);
});

test('4.3. Normal pointerup followed by lostpointercapture DOES NOT dispatch duplicate seek', () => {
  const h = createTestHarness({ trackDuration: 100000 });
  h.setTime(1000);

  // Normal drag release sequence: pointerdown -> pointerup -> lostpointercapture
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 300, pointerId: 5 }));
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 300, pointerId: 5 }));

  assert.strictEqual(h.seeksDispatched.length, 1, 'First seek committed by pointerup');

  // Subsequent lostpointercapture emitted by browser after pointer capture release
  h.container.dispatchEvent(new MockEvent('lostpointercapture', { pointerId: 5 }));

  assert.strictEqual(h.seeksDispatched.length, 1, 'Subsequent lostpointercapture MUST NOT dispatch duplicate seek');
});

test('4.4. Window fallback listener recovers drag commit when pointer is released outside container', () => {
  const h = createTestHarness({ trackDuration: 200000 });
  h.setTime(1000);

  // Start drag inside container
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 300, pointerId: 8 }));
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, true);

  // Drag pointer far outside window and release
  const windowUpEv = new MockEvent('pointerup', { clientX: 450, pointerId: 8 });
  h.mockWindow.dispatchEvent(windowUpEv);

  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false, 'Window fallback must release scrubbing lock');
  assert.strictEqual(h.seeksDispatched.length, 1, 'Window fallback must commit seek');
  // clientX = 450 -> (450 - 100) / 400 = 0.875 -> 175,000ms
  assert.strictEqual(h.seeksDispatched[0].seekMs, 175000);
  assert.strictEqual(h.mockWindowListeners['pointerup']?.length, 0, 'Window listeners must be cleaned up');
});

test('4.5. Degenerate zero-width track rect returns ratio 0 safely without division by zero', () => {
  const h = createTestHarness();
  h.track._rect = { left: 100, top: 50, width: 0, height: 12 };
  h.setTime(1000);

  // Pointerdown on zero-width track
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 150, pointerId: 1 }));
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.00000');

  // Pointermove
  h.container.dispatchEvent(new MockEvent('pointermove', { clientX: 250, pointerId: 1 }));
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.00000');

  // Pointerup
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 250, pointerId: 1 }));
  assert.strictEqual(h.seeksDispatched[0].seekMs, 0, 'Zero-width rect must seek to 0ms without NaN');
});

// ─── SUITE 5: Debounce Guard Timing Precision ───────────────────────────────
console.log('\n--- Suite 5: Debounce Guard Timing Precision ---');

test('5.1. Rapid seek attempts at exactly t=0, t=100, t=200, t=299 are dropped; t=300 is accepted', () => {
  const h = createTestHarness({ trackDuration: 100000 });
  h.setTime(10000);

  // Seek 1 at t=10000
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 200, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 200, pointerId: 1 }));
  assert.strictEqual(h.seeksDispatched.length, 1);

  // Attempt at t=10100 (100ms later)
  h.setTime(10100);
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 300, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 300, pointerId: 1 }));
  assert.strictEqual(h.seeksDispatched.length, 1);

  // Attempt at t=10200 (200ms later)
  h.setTime(10200);
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 300, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 300, pointerId: 1 }));
  assert.strictEqual(h.seeksDispatched.length, 1);

  // Attempt at t=10299 (299ms later - 1ms before window)
  h.setTime(10299);
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 300, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 300, pointerId: 1 }));
  assert.strictEqual(h.seeksDispatched.length, 1);

  // Attempt at t=10300 (300ms later - exactly at window threshold)
  h.setTime(10300);
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 300, pointerId: 1 }));
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 300, pointerId: 1 }));
  assert.strictEqual(h.seeksDispatched.length, 2, 'Seek at exactly 300ms must be accepted');
});

test('5.2. attachScrubberController commitSeek source enforces 300ms debounce guard', () => {
  const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert.match(
    rendererCode,
    /\/\/ 300ms debounce guard against rapid seek commits\s*if\s*\(Date\.now\(\)\s*-\s*lastCommitSeekTimestamp\s*<\s*300\)\s*return;/,
    'attachScrubberController must have explicit 300ms guard at top of commitSeek'
  );
});

// ─── SUITE 6: Contract Verification for setMainProgressFill ─────────────────
console.log('\n--- Suite 6: Contract Verification for setMainProgressFill & --progress-ratio ---');

test('6.1. setMainProgressFill cleanses .idle-shimmer class if present', () => {
  const h = createTestHarness();
  h.fill.classList.add('idle-shimmer');
  assert.strictEqual(h.fill.classList.contains('idle-shimmer'), true);

  h.sandbox.setMainProgressFill(50);
  assert.strictEqual(h.fill.classList.contains('idle-shimmer'), false, 'idle-shimmer class must be removed');
});

test('6.2. setMainProgressFill removes inline style.width to prevent double scaling', () => {
  const h = createTestHarness();
  h.fill.style.width = '50%';

  h.sandbox.setMainProgressFill(75);
  assert.strictEqual(h.fill.style.width, '', 'Inline style.width must be removed');
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.75000');
});

test('6.3. setMainProgressFill sets CSS custom property --progress-ratio to 5 decimal places', () => {
  const h = createTestHarness();

  h.sandbox.setMainProgressFill(0);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.00000');

  h.sandbox.setMainProgressFill(33.333333);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.33333');

  h.sandbox.setMainProgressFill(100);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '1.00000');
});

test('6.4. setMainProgressFill safely clamps out-of-range percent values', () => {
  const h = createTestHarness();

  // Negative values clamp to 0.00000
  h.sandbox.setMainProgressFill(-25);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.00000');

  // Values > 100 clamp to 1.00000
  h.sandbox.setMainProgressFill(150);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '1.00000');
});

test('6.5. setMainProgressFill safely handles non-finite values (NaN, null, undefined, Infinity)', () => {
  const h = createTestHarness();
  h.sandbox.setMainProgressFill(50);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.50000');

  // Non-finite values must not throw and must leave previous ratio untouched
  h.sandbox.setMainProgressFill(NaN);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.50000');

  h.sandbox.setMainProgressFill(null);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.50000');

  h.sandbox.setMainProgressFill(undefined);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.50000');

  h.sandbox.setMainProgressFill(Infinity);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.50000');
});

test('6.6. setMainProgressFill skips redundant property setting via _lastProgressRatio cache', () => {
  const h = createTestHarness();
  h.sandbox.setMainProgressFill(50);
  assert.strictEqual(h.fill._lastProgressRatio, 0.5);

  let setPropertyCallCount = 0;
  const originalSetProperty = h.fill.style.setProperty;
  h.fill.style.setProperty = (p, v) => {
    setPropertyCallCount++;
    originalSetProperty(p, v);
  };

  // Calling with identical ratio must be a no-op
  h.sandbox.setMainProgressFill(50);
  assert.strictEqual(setPropertyCallCount, 0, 'Redundant ratio update must not write to style');

  // Calling with different ratio must write
  h.sandbox.setMainProgressFill(60);
  assert.strictEqual(setPropertyCallCount, 1, 'New ratio must write to style');
});

// ─── SUITE 7: CSS & Gesture Invariants Verification ─────────────────────────
console.log('\n--- Suite 7: CSS & Gesture Invariants Verification ---');

test('7.1. _studio.css enforces touch-action: none on .progress-bar-container', () => {
  const studioCss = fs.readFileSync(path.join(__dirname, '../src/styles/_studio.css'), 'utf8');
  assert.match(
    studioCss,
    /\.playback-widget\s+\.progress-bar-container[\s\S]*?touch-action:\s*none\s*!important;/,
    '.progress-bar-container must specify touch-action: none !important for gesture reliability'
  );
});

test('7.2. _studio.css specifies dynamic shrink and unexpanded hover retention rules', () => {
  const studioCss = fs.readFileSync(path.join(__dirname, '../src/styles/_studio.css'), 'utf8');
  assert.ok(
    studioCss.includes('width: min(280px, 80%) !important;') &&
    studioCss.includes('max-width: 280px !important;') &&
    studioCss.includes('flex: 0 1 280px !important;'),
    'Shrink rule min(280px, 80%) must exist for expanded artwork idle state'
  );
  assert.ok(
    studioCss.includes('width: 100% !important;') &&
    studioCss.includes('max-width: none !important;') &&
    studioCss.includes('flex: 1 1 100% !important;'),
    'Full width 100% must be retained when unexpanded or hovered'
  );
});

// ─── SUITE 8: Co-existence & Mutual Exclusion (Track Scrubber vs Container) ─
console.log('\n--- Suite 8: Co-existence & Mutual Exclusion (Track Scrubber vs Container) ---');

test('8.1. Direct drag on #main-progress-track bubbles through container but is ignored by container handler', () => {
  const h = createTestHarness({ attachTrackController: true, trackDuration: 200000 });
  h.setTime(1000);

  // User presses directly on track (clientX = 200 -> ratio 0.25 -> 50000ms)
  const trackDown = new MockEvent('pointerdown', { clientX: 200, target: h.track, pointerId: 1 });
  h.track.dispatchEvent(trackDown);

  // Drag on track
  const trackMove = new MockEvent('pointermove', { clientX: 300, target: h.track, pointerId: 1 });
  h.track.dispatchEvent(trackMove);

  // Release on track
  const trackUp = new MockEvent('pointerup', { clientX: 300, target: h.track, pointerId: 1 });
  h.track.dispatchEvent(trackUp);

  // Subsequent click
  const trackClick = new MockEvent('click', { clientX: 300, target: h.track });
  h.track.dispatchEvent(trackClick);

  // Exactly one seek dispatched from track controller, ZERO duplicate seeks from container
  assert.strictEqual(h.seeksDispatched.length, 1, 'Exactly one seek dispatched when interacting with track');
  assert.strictEqual(h.seeksDispatched[0].seekMs, 100000, '50% of 200s is 100s');
});

test('8.2. Click on container padding outside track engages container handler exclusively', () => {
  const h = createTestHarness({ attachTrackController: true, trackDuration: 200000 });
  h.setTime(5000);

  // User clicks on container padding (clientX = 150 -> (150 - 100) / 400 = 0.125 -> 25000ms)
  const containerDown = new MockEvent('pointerdown', { clientX: 150, target: h.container, pointerId: 2 });
  h.container.dispatchEvent(containerDown);

  const containerUp = new MockEvent('pointerup', { clientX: 150, target: h.container, pointerId: 2 });
  h.container.dispatchEvent(containerUp);

  const containerClick = new MockEvent('click', { clientX: 150, target: h.container });
  h.container.dispatchEvent(containerClick);

  assert.strictEqual(h.seeksDispatched.length, 1, 'Container handler must commit seek');
  assert.strictEqual(h.seeksDispatched[0].seekMs, 25000);
});

// ─── SUITE 9: Active Scrubbing Overwrite Lockout Invariant ───────────────────
console.log('\n--- Suite 9: Active Scrubbing Overwrite Lockout Invariant ---');

test('9.1. Active container drag strictly locks out background playhead progress overwrites', () => {
  const h = createTestHarness({ trackDuration: 200000 });
  h.setTime(1000);

  // Simulate playhead updater function mirroring updatePlayhead in src/renderer.js
  function simulatePlayheadTick(currentProgress) {
    if (!h.sandbox.isScrubbingMainProgress) {
      const fillPercent = (currentProgress / 200000) * 100;
      h.sandbox.setMainProgressFill(fillPercent);
      h.thumb.style.left = `${fillPercent}%`;
      h.timeCurrent.textContent = h.sandbox.formatTime(currentProgress);
    }
  }

  // Initial playback state: 20s (10%)
  simulatePlayheadTick(20000);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.10000');
  assert.strictEqual(h.thumb.style.left, '10%');
  assert.strictEqual(h.timeCurrent.textContent, '0:20');

  // User begins dragging on container at 70% (clientX = 380)
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 380, pointerId: 1 }));
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, true);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.70000');
  assert.strictEqual(h.thumb.style.left, '70%');
  assert.strictEqual(h.timeCurrent.textContent, '2:20');

  // Background playhead ticks at 21s, 22s, 23s while user is holding/scrubbing
  simulatePlayheadTick(21000);
  simulatePlayheadTick(22000);
  simulatePlayheadTick(23000);

  // Position must remain LOCKED at user drag position (70%), NOT snapped back to 10%
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.70000', 'Playhead tick must NOT overwrite drag ratio');
  assert.strictEqual(h.thumb.style.left, '70%', 'Playhead tick must NOT overwrite thumb left');
  assert.strictEqual(h.timeCurrent.textContent, '2:20', 'Playhead tick must NOT overwrite current time');

  // User releases at 70%
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 380, pointerId: 1 }));
  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false);

  // Subsequent playhead tick at new position (140s = 70%)
  simulatePlayheadTick(141000);
  assert.strictEqual(h.fill.style.getPropertyValue('--progress-ratio'), '0.70500', 'Playback ticks resume updating after release');
});

// ─── SUITE 10: High-Frequency Oscillating Drag Stress Harness ────────────────
console.log('\n--- Suite 10: High-Frequency Oscillating Drag Stress Harness ---');

test('10.1. 100-step high-frequency oscillating pointermove across bounds never throws or produces NaN', () => {
  const h = createTestHarness({ trackDuration: 300000 });
  h.setTime(1000);

  // Begin drag
  h.container.dispatchEvent(new MockEvent('pointerdown', { clientX: 200, pointerId: 1 }));

  // Deterministic pseudo-random seed generator
  let seed = 123456789;
  function rand() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  // 100 rapid oscillating moves across negative (-1000 to 0), valid (0 to 600), and beyond (600 to 2000)
  for (let i = 0; i < 100; i++) {
    const rawX = (rand() * 3000) - 1000; // range [-1000, 2000]
    h.container.dispatchEvent(new MockEvent('pointermove', { clientX: rawX, pointerId: 1 }));

    const currentRatioStr = h.fill.style.getPropertyValue('--progress-ratio');
    const ratioNum = parseFloat(currentRatioStr);

    assert.ok(!isNaN(ratioNum), `Ratio must not be NaN at step ${i} (rawX: ${rawX})`);
    assert.ok(ratioNum >= 0.0 && ratioNum <= 1.0, `Ratio ${ratioNum} must be bounded in [0, 1] at step ${i}`);
    assert.strictEqual(h.sandbox.isScrubbingMainProgress, true);
    assert.strictEqual(h.seeksDispatched.length, 0, 'No seeks during rapid move phase');
  }

  // Final release at clientX = 400 (track: 100 to 500 -> (400-100)/400 = 0.75 -> 225,000ms)
  h.container.dispatchEvent(new MockEvent('pointerup', { clientX: 400, pointerId: 1 }));

  assert.strictEqual(h.sandbox.isScrubbingMainProgress, false);
  assert.strictEqual(h.seeksDispatched.length, 1);
  assert.strictEqual(h.seeksDispatched[0].seekMs, 225000);
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n======================================================================');
console.log(`Results: ${passedTests}/${totalTests} tests passed (${failedTests} failures).`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}

