/**
 * Dynamic Island WebGL Telegram-Style Disintegration & NetEase Word-by-Word Test Suite
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Running Dynamic Island WebGL Disintegration & NetEase Tests ---\n');

const htmlContent = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
const cssContent = fs.readFileSync(path.join(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');
const rendererJs = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
const engineRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/lyrics/engine.rs'), 'utf8');
const {
  IslandGLDissolve,
  ISLAND_DISSOLVE_VERTEX_SHADER,
  ISLAND_DISSOLVE_FRAGMENT_SHADER
} = require('../src/modules/island-gl-dissolve.js');

// 1. Static Markup & CSS Verification
console.log('1. Static Markup & CSS Verification:');

assert(
  htmlContent.includes('<script src="modules/island-gl-dissolve.js" defer></script>'),
  'index.html must register modules/island-gl-dissolve.js script tag'
);
console.log('  ✓ 1a. modules/island-gl-dissolve.js script tag registered in index.html');

assert(
  htmlContent.includes('id="island-gl-dissolve-canvas"') &&
  htmlContent.includes('class="island-gl-dissolve-canvas"'),
  'index.html must define #island-gl-dissolve-canvas element'
);
console.log('  ✓ 1b. #island-gl-dissolve-canvas declared in index.html');

assert(
  cssContent.includes('.island-gl-dissolve-canvas') &&
  cssContent.includes('position: fixed') &&
  cssContent.includes('z-index: 999999'),
  '_dynamic_island.css must define fixed position and top z-index for WebGL dissolve overlay'
);
console.log('  ✓ 1c. _dynamic_island.css defines .island-gl-dissolve-canvas fixed overlay styles');

// 2. GLSL Fragment & Vertex Shader Verification
console.log('\n2. GLSL Shader Pipeline Verification:');

assert(
  ISLAND_DISSOLVE_FRAGMENT_SHADER.includes('random(vec2 uv)') &&
  ISLAND_DISSOLVE_FRAGMENT_SHADER.includes('43758.5453123'),
  'Fragment shader must implement pseudo-random noise generator'
);
console.log('  ✓ 2a. Pseudo-random noise generator confirmed');

assert(
  ISLAND_DISSOLVE_FRAGMENT_SHADER.includes('float dissolveFactor = u_progress * 1.5;') &&
  ISLAND_DISSOLVE_FRAGMENT_SHADER.includes('float threshold = noise + (uv.x * 0.3);') &&
  ISLAND_DISSOLVE_FRAGMENT_SHADER.includes('if (dissolveFactor > threshold) {') &&
  ISLAND_DISSOLVE_FRAGMENT_SHADER.includes('discard;'),
  'Fragment shader must implement directional disintegration gradient and discard threshold'
);
console.log('  ✓ 2b. Directional disintegration gradient and discard threshold confirmed');

assert(
  ISLAND_DISSOLVE_FRAGMENT_SHADER.includes('uv.y += (dissolveFactor - (threshold - 0.15)) * 0.05;') &&
  ISLAND_DISSOLVE_FRAGMENT_SHADER.includes('smoothstep(threshold, threshold - 0.1, dissolveFactor)'),
  'Fragment shader must simulate upward drifting ash particles and edge alpha fading'
);
console.log('  ✓ 2c. Ash particle upward drift and smoothstep edge alpha fade confirmed');

assert(
  ISLAND_DISSOLVE_VERTEX_SHADER.includes('attribute vec2 a_position;') &&
  ISLAND_DISSOLVE_VERTEX_SHADER.includes('attribute vec2 a_texCoord;') &&
  ISLAND_DISSOLVE_VERTEX_SHADER.includes('v_texCoord = a_texCoord;'),
  'Vertex shader must pass clip space position and texture coordinates'
);
console.log('  ✓ 2d. Vertex shader quad geometry confirmed');

// 3. IslandGLDissolve Engine Lifecycle Simulation
console.log('\n3. IslandGLDissolve Engine Lifecycle:');

// Mock WebGL context and DOM for unit execution
class MockGL {
  constructor() {
    this.VERTEX_SHADER = 1;
    this.FRAGMENT_SHADER = 2;
    this.ARRAY_BUFFER = 3;
    this.STATIC_DRAW = 4;
    this.TEXTURE_2D = 5;
    this.RGBA = 6;
    this.UNSIGNED_BYTE = 7;
    this.COLOR_BUFFER_BIT = 8;
    this.TRIANGLE_STRIP = 9;
    this.BLEND = 10;
    this.SRC_ALPHA = 11;
    this.ONE_MINUS_SRC_ALPHA = 12;
    this.TEXTURE0 = 13;
    this.LINEAR = 14;
    this.CLAMP_TO_EDGE = 15;
    this.TEXTURE_WRAP_S = 16;
    this.TEXTURE_WRAP_T = 17;
    this.TEXTURE_MIN_FILTER = 18;
    this.TEXTURE_MAG_FILTER = 19;
    this.LINK_STATUS = 20;
    this.COMPILE_STATUS = 21;
    this.uniforms = {};
  }
  createShader() { return {}; }
  shaderSource() {}
  compileShader() {}
  getShaderParameter() { return true; }
  createProgram() { return {}; }
  attachShader() {}
  linkProgram() {}
  getProgramParameter() { return true; }
  getAttribLocation() { return 0; }
  getUniformLocation(prog, name) { return name; }
  createBuffer() { return {}; }
  bindBuffer() {}
  bufferData() {}
  createTexture() { return {}; }
  bindTexture() {}
  texParameteri() {}
  viewport() {}
  texImage2D() {}
  enable() {}
  blendFunc() {}
  useProgram() {}
  enableVertexAttribArray() {}
  vertexAttribPointer() {}
  activeTexture() {}
  uniform1i() {}
  uniform1f(loc, val) { this.uniforms[loc] = val; }
  clearColor() {}
  clear() {}
  drawArrays() {}
}

const mockCanvas = {
  style: {},
  getContext: (type) => (type.includes('webgl') ? new MockGL() : null),
  width: 200,
  height: 48
};

const instance = new IslandGLDissolve('mock-canvas');
instance.canvas = mockCanvas;
const initialized = instance._initGL();
assert(initialized, 'IslandGLDissolve must successfully compile shaders and link WebGL program');
console.log('  ✓ 3a. IslandGLDissolve compiles shaders and links program with Mock WebGL context');

// Verify snapshot fallback / generation
const mockElement = {
  style: {},
  getBoundingClientRect: () => ({ left: 100, top: 20, width: 220, height: 44 }),
  querySelector: () => null
};

let completedCalled = false;
instance.disintegrate(mockElement, () => {
  completedCalled = true;
}, { duration: 50 });

assert(mockElement.style.opacity === '0', 'disintegrate must immediately hide targetElement from DOM');
console.log('  ✓ 3b. disintegrate immediately transfers visibility to WebGL overlay');

// Advance animation
assert(instance.animating === true, 'instance must be animating');
instance.stop();
assert(instance.animating === false, 'stop must cancel active disintegration and reset state');
assert(mockElement.style.opacity === '', 'stop must restore element opacity');
console.log('  ✓ 3c. stop cleanly terminates disintegration loop and restores element style');

// 4. Renderer Inactivity Sleep & Wake Integration
console.log('\n4. Renderer Inactivity Sleep & Wake Integration:');

assert(
  rendererJs.includes('if (pri && window.islandGlDissolve) {') &&
  rendererJs.includes('window.islandGlDissolve.disintegrate(pri,') &&
  rendererJs.includes('window.caEmitterLayer.vaporize(pri,'),
  'renderer.js must wire islandGlDissolve.disintegrate with caEmitterLayer fallback on sleepDynamicIsland'
);
console.log('  ✓ 4a. sleepDynamicIsland wires islandGlDissolve.disintegrate with caEmitterLayer fallback');

assert(
  rendererJs.includes('if (window.islandGlDissolve && typeof window.islandGlDissolve.stop === \'function\') {') &&
  rendererJs.includes('window.islandGlDissolve.stop();'),
  'renderer.js must stop active disintegration on wakeDynamicIsland'
);
console.log('  ✓ 4b. wakeDynamicIsland stops active disintegration immediately on wake');

// 5. NetEase Word-by-Word Budget & Priority
console.log('\n5. NetEase Word-by-Word Budget & Priority:');

assert(
  engineRs.includes('options.netease_word_by_word') &&
  engineRs.includes('2000'),
  'engine.rs must grant 2000ms network budget when NetEase word-by-word is enabled'
);
console.log('  ✓ 5a. engine.rs grants 2000ms budget for overseas NetEase YRC word-by-word queries');

assert(
  engineRs.includes('(SyncType::WordSynced, _) => 1') &&
  engineRs.includes('(SyncType::LineSynced, "LRCLIB") => 3'),
  'engine.rs sorting ranks WordSynced (rank 1) ahead of LineSynced (rank 3)'
);
console.log('  ✓ 5b. engine.rs prioritizes NetEase WordSynced candidates ahead of line-synced alternatives');

console.log('\nAll Dynamic Island WebGL Disintegration & NetEase tests passed successfully!\n');
