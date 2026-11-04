/**
 * Milestone 2 & 3 Performance & Memory Optimization Test Suite
 *
 * Validates R6 - R15 optimizations:
 *  - R6: VideoFrameAmbilightSampler 16x16 downsampling & async createImageBitmap
 *  - R7: KineticCanvasRenderer occlusion gating & 15 FPS interlude downclocking
 *  - R8: SyllableDOMPool node recycling
 *  - R9: Translation stream 60-second circuit breaker
 *  - R10: Motion continuity watchdog event-driven conversion & relaxed timer
 *  - R11: Playback DJ engine circular buffer & O(1) rolling sum
 *  - R12: CAEmitterEngine lazy canvas allocation & VRAM eviction
 *  - R13: Dynamic Island bounds tracking 20Hz downsample
 *  - R14: Composite backdrop-filter density reduction
 *  - R15: Inactivity watchdog mode scoping
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const rendererJs = fs.readFileSync(path.join(srcDir, 'renderer.js'), 'utf8');
const djEngineJs = fs.readFileSync(path.join(srcDir, 'modules/playback-dj-engine.js'), 'utf8');
const caEmitterJs = fs.readFileSync(path.join(srcDir, 'modules/ca-emitter.js'), 'utf8');
const kineticJs = fs.readFileSync(path.join(srcDir, 'modules/kinetic/KineticCanvasRenderer.js'), 'utf8');
const componentsCss = fs.readFileSync(path.join(srcDir, 'styles/_components.css'), 'utf8');

console.log('================================================================');
console.log('  RUNNING MILESTONE 2 & 3 PERFORMANCE OPTIMIZATIONS TEST SUITE  ');
console.log('================================================================\n');

// --- 1. VideoFrameAmbilightSampler ---
console.log('1. Video-Frame Ambilight Downsampling (R6):');
assert.ok(
  rendererJs.includes('this.canvas.width = 16;') && rendererJs.includes('this.canvas.height = 16;'),
  'VideoFrameAmbilightSampler must initialize canvas dimensions to 16x16'
);
assert.ok(
  rendererJs.includes("createImageBitmap(video, { resizeWidth: 16, resizeHeight: 16, resizeQuality: 'low' })"),
  'VideoFrameAmbilightSampler must use createImageBitmap with 16x16 low quality downsampling'
);
assert.ok(
  rendererJs.includes('this._isSampling = true;'),
  'VideoFrameAmbilightSampler must guard against concurrent sampling passes'
);
console.log('  ✓ 16x16 downsampling and async createImageBitmap GPU pipeline verified');

// --- 2. KineticCanvasRenderer Occlusion & 15 FPS Downclocking ---
console.log('\n2. KineticCanvasRenderer Occlusion & Interlude Gating (R7):');
assert.ok(
  kineticJs.includes("const isHidden = typeof document !== 'undefined' && document.hidden;"),
  'KineticCanvasRenderer must check document.hidden'
);
assert.ok(
  kineticJs.includes('(now - (this._lastRenderTime || 0)) >= 66'),
  'KineticCanvasRenderer must downclock to ~15 FPS during instrumental gaps'
);
console.log('  ✓ Occlusion bypass and 15 FPS instrumental downclocking verified');

// --- 3. SyllableDOMPool Recycling ---
console.log('\n3. SyllableDOMPool Word-by-Word Recycling (R8):');
assert.ok(
  rendererJs.includes('class SyllableDOMPool'),
  'renderer.js must define SyllableDOMPool class'
);
assert.ok(
  rendererJs.includes('pool.acquire(className, cleanWord, dataName, index)'),
  'appendTimedWordSpans must acquire spans from SyllableDOMPool'
);
console.log('  ✓ SyllableDOMPool node recycling verified');

// --- 4. Translation Stream Circuit Breaker ---
console.log('\n4. Translation Stream Circuit Breaker (R9):');
assert.ok(
  rendererJs.includes('window._translationCircuitBreakerUntil && Date.now() < window._translationCircuitBreakerUntil'),
  'triggerAutoTranslation must check translation circuit breaker before network request'
);
assert.ok(
  rendererJs.includes('window._translationCircuitBreakerUntil = Date.now() + 60000;'),
  'triggerAutoTranslation must trip circuit breaker for 60 seconds on rate-limit or error'
);
console.log('  ✓ 60-second translation circuit breaker verified');

// --- 5. Motion Continuity Watchdog Conversion ---
console.log('\n5. Motion Continuity Watchdog Event-Driven Conversion (R10):');
assert.ok(
  rendererJs.includes('function bindMotionContinuityListeners(videoEl)'),
  'renderer.js must define reactive bindMotionContinuityListeners'
);
assert.ok(
  rendererJs.includes("videoEl.addEventListener('pause', onUnexpectedPause);") &&
  rendererJs.includes("videoEl.addEventListener('waiting', onBufferStall);") &&
  rendererJs.includes("videoEl.addEventListener('stalled', onBufferStall);"),
  'bindMotionContinuityListeners must attach a pause recovery handler and separate buffer-stall handlers'
);
assert.ok(
  rendererJs.includes('}, 2500);'),
  'Continuous watchdog interval must be relaxed from 250ms to 2500ms safety net'
);
console.log('  ✓ Reactive pause/waiting event binding and relaxed interval verified');

// --- 6. Playback DJ Engine Circular Buffer ---
console.log('\n6. Playback DJ Engine Ingress Gate & Circular Buffer (R11):');
assert.ok(
  djEngineJs.includes('if (!this.isDjProcessingEnabled()) return;'),
  'Playback DJ engine must short-circuit if DJ processing is disabled'
);
assert.ok(
  djEngineJs.includes('this._energyRingCapacity = 250;') &&
  djEngineJs.includes('this._energyRingBuffer = new Float32Array(this._energyRingCapacity);'),
  'Playback DJ engine must allocate a static Float32Array circular ring buffer'
);
assert.ok(
  djEngineJs.includes('this._energyRollingSum = this._energyRollingSum - oldVal + this.instantEnergy;'),
  'Playback DJ engine must calculate energy with O(1) rolling sum'
);
console.log('  ✓ DJ processing gate and O(1) circular ring buffer verified');

// --- 7. CAEmitterEngine Lazy Canvas Backing Store ---
console.log('\n7. CAEmitterEngine Lazy Allocation & VRAM Eviction (R12):');
assert.ok(
  caEmitterJs.includes('_collapseCanvas()'),
  'CAEmitterEngine must define _collapseCanvas() to free VRAM when idle'
);
assert.ok(
  caEmitterJs.includes('_expandCanvas()'),
  'CAEmitterEngine must define _expandCanvas() to allocate backing store only when emitting'
);
assert.ok(
  caEmitterJs.includes('this.canvas.width = 1;') && caEmitterJs.includes('this.canvas.height = 1;'),
  '_collapseCanvas must shrink canvas backing store to 1x1'
);
console.log('  ✓ Lazy canvas backing store and idle VRAM eviction verified');

// --- 8. Dynamic Island Bounds Tracking Downsample ---
console.log('\n8. Dynamic Island Bounds Tracking 20Hz Downsample (R13):');
assert.ok(
  rendererJs.includes('now - lastTrackTime >= 50'),
  'startDynamicIslandBoundsTracking must throttle layout queries to 20 Hz (50ms)'
);
console.log('  ✓ 20 Hz bounds tracking downsample verified');

// --- 9. Inactivity Watchdog Mode Scoping ---
console.log('\n9. Dynamic Island Inactivity Watchdog Mode Scoping (R15):');
assert.ok(
  rendererJs.includes('function startDynamicIslandInactivityWatchdog()'),
  'renderer.js must define startDynamicIslandInactivityWatchdog'
);
assert.ok(
  rendererJs.includes('function stopDynamicIslandInactivityWatchdog()'),
  'renderer.js must define stopDynamicIslandInactivityWatchdog'
);
assert.ok(
  !rendererJs.includes('// Periodic Inactivity Checker (1-second tick)\n  setInterval(checkDynamicIslandInactivity, 1000);'),
  'Global 1-second interval must NOT run unconditionally on startup'
);
console.log('  ✓ Mode-scoped inactivity timer lifecycle verified');

// --- 10. Composite Backdrop-Filter Flattening ---
console.log('\n10. Composite Backdrop-Filter Density Reduction (R14):');
const geniusModalBlock = componentsCss.match(/\.genius-modal\s*\{[\s\S]*?\}/);
assert.ok(
  geniusModalBlock && geniusModalBlock[0].includes('backdrop-filter: none;'),
  '.genius-modal must use backdrop-filter: none to eliminate nested blur'
);
const syncResumeBlock = componentsCss.match(/\.sync-resume-btn\s*\{[\s\S]*?\}/);
assert.ok(
  syncResumeBlock && syncResumeBlock[0].includes('backdrop-filter: none;'),
  '.sync-resume-btn must use backdrop-filter: none'
);
console.log('  ✓ Nested CSS backdrop-filter flattening verified');

console.log('\n================================================================');
console.log('  ALL MILESTONE 2 & 3 OPTIMIZATION TESTS PASSED (100% GREEN)    ');
console.log('================================================================');
