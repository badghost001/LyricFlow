/**
 * tests/challenger-m2-webgl-lifecycle-stress.test.js
 * Empirical Challenger Adversarial Stress Suite for Milestone 2 WebGL Lifecycle:
 * 1. WebGL Lazy Initialization in IslandGLDissolve
 * 2. WebGL Context Sleeping/Waking in FluidMeshGradient
 * 3. 100 Rapid Mode Transitions across Studio, Dynamic Island, and Taskbar
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Global window & document mock environment
if (!global.window) {
  global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
}
if (!global.cancelAnimationFrame) {
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

const { IslandGLDissolve } = require('../src/modules/island-gl-dissolve.js');
const { FluidMeshGradient } = require('../src/modules/fluid-mesh.js');

let passedTests = 0;
let totalTests = 0;

function runEmpiricalTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.stack || err.message}`);
    process.exitCode = 1;
  }
}

async function runAsyncEmpiricalTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.stack || err.message}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// Mock WebGL & 2D Context Infrastructure
// -----------------------------------------------------------------------------

class MockLoseContextExtension {
  constructor(gl) {
    this.gl = gl;
    this.loseCount = 0;
    this.restoreCount = 0;
  }
  loseContext() {
    this.loseCount++;
    if (this.gl.canvas && typeof this.gl.canvas._triggerEvent === 'function') {
      this.gl.canvas._triggerEvent('webglcontextlost', {
        preventDefault: () => {}
      });
    }
  }
  restoreContext() {
    this.restoreCount++;
    if (this.gl.canvas && typeof this.gl.canvas._triggerEvent === 'function') {
      this.gl.canvas._triggerEvent('webglcontextrestored', {});
    }
  }
}

class MockWebGLRenderingContext {
  constructor(canvas) {
    this.canvas = canvas;
    this.VERTEX_SHADER = 0x8B31;
    this.FRAGMENT_SHADER = 0x8B30;
    this.ARRAY_BUFFER = 0x8892;
    this.STATIC_DRAW = 0x88E4;
    this.TEXTURE_2D = 0x0DE1;
    this.RGBA = 0x1908;
    this.UNSIGNED_BYTE = 0x1401;
    this.COLOR_BUFFER_BIT = 0x00004000;
    this.TRIANGLES = 0x0004;
    this.TRIANGLE_STRIP = 0x0005;
    this.LINEAR = 0x2601;
    this.CLAMP_TO_EDGE = 0x812F;
    this.TEXTURE_WRAP_S = 0x2802;
    this.TEXTURE_WRAP_T = 0x2803;
    this.TEXTURE_MIN_FILTER = 0x2800;
    this.TEXTURE_MAG_FILTER = 0x2801;
    this.LINK_STATUS = 0x8B82;
    this.COMPILE_STATUS = 0x8B81;
    this.FLOAT = 0x1406;
    this.BLEND = 0x0BE2;
    this.SRC_ALPHA = 0x0302;
    this.ONE_MINUS_SRC_ALPHA = 0x0303;
    this.TEXTURE0 = 0x84C0;
    this.NO_ERROR = 0;

    this.shadersCreated = 0;
    this.programsCreated = 0;
    this.buffersCreated = 0;
    this.texturesCreated = 0;
    this.drawCalls = 0;
    this.useProgramCalls = 0;

    this.loseContextExt = new MockLoseContextExtension(this);
  }

  getExtension(name) {
    if (name === 'WEBGL_lose_context') {
      return this.loseContextExt;
    }
    return null;
  }

  createShader() {
    this.shadersCreated++;
    return { id: this.shadersCreated };
  }
  shaderSource() {}
  compileShader() {}
  getShaderParameter() { return true; }
  getShaderInfoLog() { return ''; }
  deleteShader() {}

  createProgram() {
    this.programsCreated++;
    return { id: this.programsCreated };
  }
  attachShader() {}
  linkProgram() {}
  getProgramParameter() { return true; }
  getProgramInfoLog() { return ''; }
  useProgram() { this.useProgramCalls++; }

  getAttribLocation() { return 0; }
  enableVertexAttribArray() {}
  vertexAttribPointer() {}

  getUniformLocation(p, name) { return { name }; }
  uniform1f() {}
  uniform1i() {}
  uniform2f() {}
  uniform3fv() {}

  createBuffer() {
    this.buffersCreated++;
    return { id: this.buffersCreated };
  }
  bindBuffer() {}
  bufferData() {}

  createTexture() {
    this.texturesCreated++;
    return { id: this.texturesCreated };
  }
  bindTexture() {}
  texParameteri() {}
  texImage2D() {}
  viewport() {}
  getError() { return 0; }

  enable() {}
  blendFunc() {}
  activeTexture() {}
  clearColor() {}
  clear() {}

  drawArrays() {
    this.drawCalls++;
  }
}

function createMock2DContext() {
  return {
    scale: () => {},
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    beginPath: () => {},
    arc: () => {},
    roundRect: () => {},
    rect: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    clip: () => {},
    save: () => {},
    restore: () => {},
    drawImage: () => {},
    fillText: () => {}
  };
}

function createMockDOMCanvas(width = 300, height = 150) {
  const listeners = new Map();
  const canvas = {
    id: 'mock-canvas',
    width,
    height,
    style: {},
    parentElement: null,
    _getContextCalls: 0,
    _glInstance: null,
    _ctx2d: null,
    addEventListener(evt, handler) {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(handler);
    },
    removeEventListener(evt, handler) {
      if (!listeners.has(evt)) return;
      const arr = listeners.get(evt);
      const idx = arr.indexOf(handler);
      if (idx !== -1) arr.splice(idx, 1);
    },
    _triggerEvent(evt, data) {
      if (listeners.has(evt)) {
        for (const fn of listeners.get(evt)) {
          fn(data);
        }
      }
    },
    getContext(type) {
      canvas._getContextCalls++;
      if (type.includes('webgl')) {
        if (!canvas._glInstance) {
          canvas._glInstance = new MockWebGLRenderingContext(canvas);
        }
        return canvas._glInstance;
      }
      if (type === '2d') {
        if (!canvas._ctx2d) {
          canvas._ctx2d = createMock2DContext();
        }
        return canvas._ctx2d;
      }
      return null;
    }
  };
  return canvas;
}

// Helper to setup mock document environment with 2D offscreen support
function setupMockDocument(mainCanvas) {
  const originalDoc = global.document;
  global.document = {
    getElementById: (id) => (mainCanvas && (id === mainCanvas.id || id === 'island-gl-dissolve-canvas') ? mainCanvas : null),
    createElement: (tag) => {
      if (tag === 'canvas') {
        return createMockDOMCanvas(200, 50);
      }
      return { style: {} };
    },
    body: {
      appendChild: (el) => {
        if (el) el.parentElement = global.document.body;
      }
    }
  };
  if (mainCanvas) mainCanvas.parentElement = global.document.body;
  return () => {
    global.document = originalDoc;
  };
}

// =============================================================================
// MAIN RUNNER
// =============================================================================
async function runAllTests() {
  console.log('================================================================');
  console.log('  CHALLENGER M2: EMPIRICAL WEBGL LIFECYCLE STRESS TEST SUITE   ');
  console.log('================================================================\n');

  // =============================================================================
  // TEST SUITE 1: IslandGLDissolve WebGL Lazy Initialization
  // =============================================================================
  console.log('--- Suite 1: IslandGLDissolve WebGL Lazy Initialization ---');

  runEmpiricalTest('1.1 Zero WebGL context or canvas allocation at instantiation', () => {
    const originalDoc = global.document;
    let elementCreated = false;
    let elementQueried = false;

    global.document = {
      getElementById: () => {
        elementQueried = true;
        return null;
      },
      createElement: () => {
        elementCreated = true;
        return createMockDOMCanvas();
      },
      body: { appendChild: () => {} }
    };

    try {
      const instance = new IslandGLDissolve('test-dissolve-canvas');

      assert.strictEqual(instance.gl, null, 'instance.gl must be null at startup');
      assert.strictEqual(instance.canvas, null, 'instance.canvas must be null at startup');
      assert.strictEqual(instance.program, null, 'instance.program must be null at startup');
      assert.strictEqual(instance.posBuffer, null, 'posBuffer must be null at startup');
      assert.strictEqual(instance.texture, null, 'texture must be null at startup');
      assert.strictEqual(elementCreated, false, 'No canvas element must be created at startup');
      assert.strictEqual(elementQueried, false, 'No DOM element query at startup');
    } finally {
      global.document = originalDoc;
    }
  });

  runEmpiricalTest('1.2 On-demand allocation upon dissolve() execution', () => {
    const mockCanvas = createMockDOMCanvas(200, 50);
    mockCanvas.id = 'test-dissolve-canvas';
    const restoreDoc = setupMockDocument(mockCanvas);

    try {
      const instance = new IslandGLDissolve('test-dissolve-canvas');
      assert.strictEqual(instance.gl, null);
      assert.strictEqual(mockCanvas._getContextCalls, 0);

      const targetEl = {
        style: {},
        getBoundingClientRect: () => ({ left: 20, top: 20, width: 200, height: 48 }),
        querySelector: () => null
      };

      const result = instance.dissolve(targetEl);

      assert.strictEqual(result, true, 'dissolve() must return true when WebGL succeeds');
      assert.ok(mockCanvas._getContextCalls > 0, 'getContext must be invoked on demand');
      assert.ok(instance.gl !== null, 'instance.gl must be initialized');
      assert.ok(instance.program !== null, 'WebGL program must be compiled');
      assert.ok(instance.posBuffer !== null, 'Quad vertex buffer must be allocated');
      assert.ok(instance.texture !== null, 'Snapshot texture must be created');
      assert.strictEqual(instance.animating, true, 'Dissolve animation must be running');
      assert.strictEqual(targetEl.style.opacity, '0', 'Target element must be hidden by overlay');

      instance.stop();
    } finally {
      restoreDoc();
    }
  });

  runEmpiricalTest('1.3 Subsequent dissolve() calls reuse WebGL context without recompilation', () => {
    const mockCanvas = createMockDOMCanvas(200, 50);
    mockCanvas.id = 'test-dissolve-canvas';
    const restoreDoc = setupMockDocument(mockCanvas);

    try {
      const instance = new IslandGLDissolve('test-dissolve-canvas');
      const targetEl1 = {
        style: {},
        getBoundingClientRect: () => ({ left: 10, top: 10, width: 100, height: 40 }),
        querySelector: () => null
      };
      const targetEl2 = {
        style: {},
        getBoundingClientRect: () => ({ left: 20, top: 20, width: 120, height: 44 }),
        querySelector: () => null
      };

      // First dissolve
      instance.dissolve(targetEl1);
      const gl = instance.gl;
      const initialPrograms = gl.programsCreated;
      const initialShaders = gl.shadersCreated;
      const initialBuffers = gl.buffersCreated;
      const initialContextCalls = mockCanvas._getContextCalls;

      instance.stop();

      // Second dissolve
      instance.dissolve(targetEl2);

      assert.strictEqual(mockCanvas._getContextCalls, initialContextCalls, 'Must not request new WebGL context on reuse');
      assert.strictEqual(gl.programsCreated, initialPrograms, 'Must not re-link program on subsequent dissolve');
      assert.strictEqual(gl.shadersCreated, initialShaders, 'Must not re-compile shaders on subsequent dissolve');
      assert.strictEqual(gl.buffersCreated, initialBuffers, 'Must not reallocate vertex buffers on subsequent dissolve');
      assert.strictEqual(instance.gl, gl, 'Must retain original gl context reference');

      instance.stop();
    } finally {
      restoreDoc();
    }
  });

  runEmpiricalTest('1.4 Graceful fallback to caEmitterLayer when WebGL context returns null', () => {
    const originalDoc = global.document;
    const originalEmitter = global.window.caEmitterLayer;

    // Mock canvas that returns null for WebGL
    const nullCanvas = {
      id: 'test-null-canvas',
      style: {},
      parentElement: null,
      getContext: () => null
    };

    let vaporizeCalled = false;
    let vaporizeTarget = null;

    global.document = {
      getElementById: () => nullCanvas,
      createElement: () => nullCanvas,
      body: { appendChild: () => {} }
    };
    nullCanvas.parentElement = global.document.body;

    global.window.caEmitterLayer = {
      vaporize: (el, cb) => {
        vaporizeCalled = true;
        vaporizeTarget = el;
        if (cb) cb();
      }
    };

    try {
      const instance = new IslandGLDissolve('test-null-canvas');
      let onCompleteCalled = false;

      const targetEl = {
        style: {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 150, height: 40 }),
        querySelector: () => null
      };

      const res = instance.dissolve(targetEl, () => { onCompleteCalled = true; });

      assert.strictEqual(res, false, 'dissolve() must return false on WebGL unavailable');
      assert.strictEqual(instance.gl, null, 'instance.gl must remain null');
      assert.strictEqual(vaporizeCalled, true, 'caEmitterLayer.vaporize must be called as fallback');
      assert.strictEqual(vaporizeTarget, targetEl, 'Vaporize must target the dissolve capsule');
      assert.strictEqual(onCompleteCalled, true, 'onComplete callback must be fired by fallback');
    } finally {
      global.document = originalDoc;
      global.window.caEmitterLayer = originalEmitter;
    }
  });

  runEmpiricalTest('1.5 Graceful fallback when both WebGL and caEmitterLayer are unavailable', () => {
    const originalDoc = global.document;
    const originalEmitter = global.window.caEmitterLayer;
    delete global.window.caEmitterLayer;

    const nullCanvas = {
      id: 'test-headless',
      style: {},
      parentElement: null,
      getContext: () => null
    };

    global.document = {
      getElementById: () => nullCanvas,
      createElement: () => nullCanvas,
      body: { appendChild: () => {} }
    };
    nullCanvas.parentElement = global.document.body;

    try {
      const instance = new IslandGLDissolve('test-headless');
      let completed = false;
      const targetEl = {
        style: {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 30 }),
        querySelector: () => null
      };

      const res = instance.dissolve(targetEl, () => { completed = true; });

      assert.strictEqual(res, false, 'Must return false');
      assert.strictEqual(targetEl.style.display, 'none', 'Must directly hide element if no emitter available');
      assert.strictEqual(completed, true, 'Must execute completion callback');
    } finally {
      global.document = originalDoc;
      global.window.caEmitterLayer = originalEmitter;
    }
  });

  // =============================================================================
  // TEST SUITE 2: FluidMeshGradient WebGL Context Sleeping & Waking
  // =============================================================================
  console.log('\n--- Suite 2: FluidMeshGradient WebGL Context Sleeping & Waking ---');

  runEmpiricalTest('2.1 FluidMeshGradient initial WebGL allocation & extension registration', () => {
    const mockCanvas = createMockDOMCanvas(320, 180);
    const mesh = new FluidMeshGradient(mockCanvas);

    assert.strictEqual(mesh.useWebGL, true, 'useWebGL must be true with valid mock WebGL');
    assert.ok(mesh.gl !== null, 'WebGL context must be initialized');
    assert.strictEqual(mesh.isSleeping, false, 'isSleeping must initially be false');
    assert.strictEqual(mesh.isContextLost, false, 'isContextLost must initially be false');
  });

  runEmpiricalTest('2.2 sleep() invokes loseContext() on WEBGL_lose_context and updates flags', () => {
    const mockCanvas = createMockDOMCanvas(320, 180);
    const mesh = new FluidMeshGradient(mockCanvas);
    const ext = mesh.gl.getExtension('WEBGL_lose_context');

    mesh.start();
    assert.strictEqual(mesh.running, true, 'Mesh must be running after start()');

    mesh.sleep();

    assert.strictEqual(mesh.running, false, 'sleep() must stop animation loop');
    assert.strictEqual(mesh.isSleeping, true, 'isSleeping must be true after sleep()');
    assert.strictEqual(ext.loseCount, 1, 'loseContext() must be called on extension exactly once');
    assert.strictEqual(mesh.isContextLost, true, 'isContextLost must be updated via webglcontextlost event');
  });

  runEmpiricalTest('2.3 renderWebGL() immediately aborts when sleeping or context is lost', () => {
    const mockCanvas = createMockDOMCanvas(320, 180);
    const mesh = new FluidMeshGradient(mockCanvas);
    const gl = mesh.gl;

    // Active rendering test
    mesh.renderWebGL();
    assert.strictEqual(gl.drawCalls, 1, 'Active mesh must perform draw call');

    // Sleep test
    mesh.sleep();
    const drawsBefore = gl.drawCalls;
    mesh.renderWebGL();
    assert.strictEqual(gl.drawCalls, drawsBefore, 'renderWebGL() must perform 0 draws while sleeping');

    // Direct isContextLost test
    mesh.isSleeping = false;
    mesh.isContextLost = true;
    mesh.renderWebGL();
    assert.strictEqual(gl.drawCalls, drawsBefore, 'renderWebGL() must perform 0 draws while context is lost');
  });

  runEmpiricalTest('2.4 wake() invokes restoreContext() and triggers shader reinitialization', () => {
    const mockCanvas = createMockDOMCanvas(320, 180);
    const mesh = new FluidMeshGradient(mockCanvas);
    const gl = mesh.gl;
    const ext = gl.getExtension('WEBGL_lose_context');

    mesh.sleep();
    assert.strictEqual(mesh.isSleeping, true);
    assert.strictEqual(mesh.isContextLost, true);

    const programsBefore = gl.programsCreated;

    mesh.wake();

    assert.strictEqual(mesh.isSleeping, false, 'wake() must clear isSleeping');
    assert.strictEqual(ext.restoreCount, 1, 'restoreContext() must be called on extension');
    assert.strictEqual(mesh.isContextLost, false, 'webglcontextrestored must clear isContextLost');
    assert.strictEqual(gl.programsCreated, programsBefore + 1, 'webglcontextrestored must reinitialize shaders and link program');

    // Verify renderWebGL works normally again
    const drawsBefore = gl.drawCalls;
    mesh.renderWebGL();
    assert.strictEqual(gl.drawCalls, drawsBefore + 1, 'renderWebGL must resume successful rendering after wake');
  });

  runEmpiricalTest('2.5 Idempotency: Multiple sleep() calls do not corrupt state or over-invoke loseContext', () => {
    const mockCanvas = createMockDOMCanvas(320, 180);
    const mesh = new FluidMeshGradient(mockCanvas);
    const ext = mesh.gl.getExtension('WEBGL_lose_context');

    mesh.sleep();
    mesh.sleep();
    mesh.sleep();

    assert.strictEqual(mesh.isSleeping, true);
    assert.strictEqual(ext.loseCount, 1, 'loseContext() must not be called repeatedly when already sleeping');

    mesh.wake();
    mesh.wake();

    assert.strictEqual(mesh.isSleeping, false);
    assert.strictEqual(ext.restoreCount, 1, 'restoreContext() must not be called repeatedly when already awake');
  });

  // =============================================================================
  // TEST SUITE 3: 100 Rapid Mode Transitions Across Studio, Island, and Taskbar
  // =============================================================================
  console.log('\n--- Suite 3: 100 Rapid Mode Transitions Stress Simulation ---');

  await runAsyncEmpiricalTest('3.1 100 Rapid sequential mode transitions (Studio -> Island -> Taskbar -> Studio)', async () => {
    const mockCanvas = createMockDOMCanvas(320, 180);
    const mesh = new FluidMeshGradient(mockCanvas);
    const ext = mesh.gl.getExtension('WEBGL_lose_context');

    let currentMode = 'studio';
    let modeChangeCount = 0;

    // Mock renderer transition function matching src/renderer.js logic
    async function simulateSwitchDisplayMode(targetMode) {
      modeChangeCount++;
      if (targetMode === 'island') {
        if (mesh) {
          if (typeof mesh.sleep === 'function') mesh.sleep();
          else mesh.stop();
        }
        currentMode = 'island';
      } else if (targetMode === 'taskbar') {
        if (mesh) {
          if (typeof mesh.sleep === 'function') mesh.sleep();
          else mesh.stop();
        }
        currentMode = 'taskbar';
      } else {
        // studio / normal
        if (mesh) {
          if (typeof mesh.wake === 'function') mesh.wake();
          mesh.start();
        }
        currentMode = 'studio';
      }
    }

    // Execute 100 complete cycles (300 mode transitions)
    for (let i = 0; i < 100; i++) {
      // 1. Switch to Island Mode
      await simulateSwitchDisplayMode('island');
      assert.strictEqual(mesh.isSleeping, true, `Cycle ${i}: Mesh must be sleeping in Island mode`);
      assert.strictEqual(mesh.running, false, `Cycle ${i}: Mesh RAF must be stopped in Island mode`);

      // 2. Switch to Taskbar Mode
      await simulateSwitchDisplayMode('taskbar');
      assert.strictEqual(mesh.isSleeping, true, `Cycle ${i}: Mesh must remain sleeping in Taskbar mode`);
      assert.strictEqual(mesh.running, false, `Cycle ${i}: Mesh RAF must be stopped in Taskbar mode`);

      // 3. Switch back to Studio Mode
      await simulateSwitchDisplayMode('studio');
      assert.strictEqual(mesh.isSleeping, false, `Cycle ${i}: Mesh must be awake in Studio mode`);
      assert.strictEqual(mesh.running, true, `Cycle ${i}: Mesh RAF must be running in Studio mode`);
    }

    assert.strictEqual(modeChangeCount, 300, 'All 300 mode transitions must have executed');
    assert.strictEqual(currentMode, 'studio', 'Final mode must be studio');
    assert.strictEqual(mesh.isSleeping, false, 'Mesh must finish in awake state');
    assert.strictEqual(mesh.isContextLost, false, 'WebGL context must not be lost after settling in Studio');
    assert.strictEqual(ext.loseCount, 100, 'loseContext() called exactly 100 times for 100 sleep cycles');
    assert.strictEqual(ext.restoreCount, 100, 'restoreContext() called exactly 100 times for 100 wake cycles');
  });

  await runAsyncEmpiricalTest('3.2 Chaotic un-awaited burst transitions stress-test', async () => {
    const mockCanvas = createMockDOMCanvas(320, 180);
    const mesh = new FluidMeshGradient(mockCanvas);

    let isTransitioningMode = false;
    let queuedModeTransition = null;
    let currentMode = 'studio';

    async function mockTransitionToMode(targetMode) {
      if (isTransitioningMode) {
        queuedModeTransition = targetMode;
        return;
      }
      isTransitioningMode = true;

      try {
        if (targetMode === 'island') {
          if (mesh && typeof mesh.sleep === 'function') mesh.sleep();
          currentMode = 'island';
        } else if (targetMode === 'taskbar') {
          if (mesh && typeof mesh.sleep === 'function') mesh.sleep();
          currentMode = 'taskbar';
        } else {
          if (mesh && typeof mesh.wake === 'function') mesh.wake();
          currentMode = 'studio';
        }
      } finally {
        isTransitioningMode = false;
        const queued = queuedModeTransition;
        queuedModeTransition = null;
        if (queued) {
          await mockTransitionToMode(queued);
        }
      }
    }

    const modes = ['island', 'taskbar', 'studio', 'island', 'studio', 'taskbar'];
    // Fire 100 rapid concurrent requests
    const promises = [];
    for (let i = 0; i < 100; i++) {
      const target = modes[i % modes.length];
      promises.push(mockTransitionToMode(target));
    }

    await Promise.all(promises);

    // Guarantee final settling to Studio
    await mockTransitionToMode('studio');

    assert.strictEqual(currentMode, 'studio');
    assert.strictEqual(mesh.isSleeping, false, 'Settled mesh in Studio mode must be awake');
    assert.strictEqual(mesh.isContextLost, false, 'Settled mesh must have active WebGL context');
  });

  // =============================================================================
  // TEST SUITE 4: Adversarial Edge Cases & Hostile Input Resilience
  // =============================================================================
  console.log('\n--- Suite 4: Adversarial Edge Cases & Hostile Input Resilience ---');

  runEmpiricalTest('4.1 FluidMeshGradient handles missing WEBGL_lose_context extension gracefully', () => {
    const mockCanvas = createMockDOMCanvas(320, 180);
    // WebGL context without WEBGL_lose_context support
    const gl = mockCanvas.getContext('webgl');
    gl.getExtension = () => null; // Driver returns null

    const mesh = new FluidMeshGradient(mockCanvas);
    mesh.start();
    assert.strictEqual(mesh.running, true);

    // Sleep without extension
    mesh.sleep();
    assert.strictEqual(mesh.running, false, 'stop() must still halt loop even without extension');
    assert.strictEqual(mesh.isSleeping, true, 'isSleeping must be true');

    // Drawing while sleeping must still be prevented
    const drawsBefore = gl.drawCalls;
    mesh.renderWebGL();
    assert.strictEqual(gl.drawCalls, drawsBefore, 'Must not draw even without WEBGL_lose_context extension');

    // Wake without extension
    mesh.wake();
    assert.strictEqual(mesh.isSleeping, false, 'wake() must reset isSleeping flag');
  });

  runEmpiricalTest('4.2 FluidMeshGradient 2D Canvas fallback mode handles sleep and wake without errors', () => {
    const mockCanvas = {
      width: 320,
      height: 180,
      style: {},
      addEventListener: () => {},
      getContext: (type) => (type === '2d' ? createMock2DContext() : null)
    };

    const mesh = new FluidMeshGradient(mockCanvas);
    assert.strictEqual(mesh.useWebGL, false, 'Must enter 2D mode when WebGL is unavailable');
    assert.strictEqual(mesh.gl, null);

    mesh.start();
    assert.strictEqual(mesh.running, true);

    assert.doesNotThrow(() => {
      mesh.sleep();
    }, 'sleep() must not throw in 2D mode');
    assert.strictEqual(mesh.running, false);

    assert.doesNotThrow(() => {
      mesh.wake();
    }, 'wake() must not throw in 2D mode');
  });

  runEmpiricalTest('4.3 IslandGLDissolve handles null, zero-geometry, and hidden elements without throwing', () => {
    const mockCanvas = createMockDOMCanvas(200, 50);
    const restoreDoc = setupMockDocument(mockCanvas);

    try {
      const instance = new IslandGLDissolve('test-edge-canvas');

      let cbNull = false;
      const resNull = instance.dissolve(null, () => { cbNull = true; });
      assert.strictEqual(resNull, false, 'Null target must return false');
      assert.strictEqual(cbNull, true, 'Null target must invoke callback');

      let cbZero = false;
      const zeroEl = {
        style: {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 })
      };
      const resZero = instance.dissolve(zeroEl, () => { cbZero = true; });
      assert.strictEqual(resZero, false, 'Zero width/height must return false');
      assert.strictEqual(cbZero, true, 'Zero width/height must invoke callback');

      let cbHidden = false;
      const hiddenEl = {
        style: { display: 'none' },
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 40 })
      };
      const resHidden = instance.dissolve(hiddenEl, () => { cbHidden = true; });
      assert.strictEqual(resHidden, false, 'Hidden target must return false');
      assert.strictEqual(cbHidden, true, 'Hidden target must invoke callback');
    } finally {
      restoreDoc();
    }
  });

  runEmpiricalTest('4.4 IslandGLDissolve mid-animation interruption and rapid re-entrancy', () => {
    const mockCanvas = createMockDOMCanvas(200, 50);
    const restoreDoc = setupMockDocument(mockCanvas);

    try {
      const instance = new IslandGLDissolve('test-reentrancy-canvas');

      const target1 = {
        style: {},
        getBoundingClientRect: () => ({ left: 10, top: 10, width: 100, height: 40 }),
        querySelector: () => null
      };
      const target2 = {
        style: {},
        getBoundingClientRect: () => ({ left: 20, top: 20, width: 120, height: 44 }),
        querySelector: () => null
      };

      // Start target1
      instance.dissolve(target1);
      assert.strictEqual(instance.animating, true);
      assert.strictEqual(instance.activeTarget, target1);
      assert.strictEqual(target1.style.opacity, '0');

      // Interrupt with target2 while target1 is still animating
      instance.dissolve(target2);
      assert.strictEqual(instance.animating, true);
      assert.strictEqual(instance.activeTarget, target2);
      assert.strictEqual(target1.style.opacity, '', 'Previous target opacity must be restored on interrupt');
      assert.strictEqual(target2.style.opacity, '0', 'New target opacity must be hidden');

      instance.stop();
      assert.strictEqual(instance.animating, false);
      assert.strictEqual(target2.style.opacity, '', 'Target2 opacity must be restored on stop');
    } finally {
      restoreDoc();
    }
  });

  // =============================================================================
  // SUMMARY & VERDICT
  // =============================================================================
  console.log('\n================================================================');
  console.log(`  RESULTS: ${passedTests} / ${totalTests} EMPIRICAL TESTS PASSED  `);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('STATUS: VERIFIED (100% EMPIRICAL PASS)');
    process.exit(0);
  } else {
    console.error(`STATUS: FAILED (${totalTests - passedTests} failures)`);
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
