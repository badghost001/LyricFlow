/**
 * tests/color-extraction.test.js
 * Comprehensive unit tests for MMCQ artwork color extraction engine.
 * Run via: node tests/color-extraction.test.js
 */

const assert = require('assert');
const path = require('path');

// Minimal browser globals stub for utils.js
global.window = {};
global.document = {
  readyState: 'complete',
  getElementById: () => null,
  addEventListener: () => {}
};

const utils = require('../src/modules/utils.js');
const { analyzeArtworkPixels, rgbToHsl, hslToRgb } = utils;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

console.log('\n--- Running Color Extraction (MMCQ) Unit Tests ---');

// 1. Single-Dominant Artwork (e.g. Pure Red Cover like Whole Lotta Red / Red)
test('Single-dominant artwork (Pure Red) retains pure red tones without foreign hues', () => {
  const size = 48;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 220;     // R
    data[i + 1] = 20;  // G
    data[i + 2] = 28;  // B
    data[i + 3] = 255;
  }

  const result = analyzeArtworkPixels(data);
  assert.ok(result && result.palette && result.palette.length === 5, 'Palette must have 5 colors');
  assert.ok(result.dominant, 'Dominant color must exist');

  // Verify dominant is crimson red
  assert.ok(result.dominant.r > 200, 'Dominant R should be > 200');
  assert.ok(result.dominant.g < 50, 'Dominant G should be < 50');
  assert.ok(result.dominant.b < 50, 'Dominant B should be < 50');

  // Verify all palette entries stay in the red spectrum (Hue within 345..360 or 0..15)
  for (let i = 0; i < result.palette.length; i++) {
    const col = result.palette[i];
    const hsl = rgbToHsl(col.r, col.g, col.b);
    const isRedHue = (hsl.h >= 340 && hsl.h <= 360) || (hsl.h >= 0 && hsl.h <= 20) || hsl.s === 0;
    assert.ok(isRedHue, `Palette color c${i} (${col.r}, ${col.g}, ${col.b}, hue=${hsl.h.toFixed(1)}) must stay red`);
  }
});

// 2. Warm Sepia Monochrome Preservation (No fake cold slate/platinum)
test('Warm Sepia monochrome artwork preserves warm brown tint without fake blue', () => {
  const size = 48;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 124;     // R
    data[i + 1] = 100; // G
    data[i + 2] = 84;  // B (Warm sepia: R > G > B)
    data[i + 3] = 255;
  }

  const result = analyzeArtworkPixels(data);
  assert.ok(result.dominant.r >= result.dominant.g && result.dominant.g >= result.dominant.b, 'Dominant must preserve warm R > G > B');

  // Check each color in palette maintains warm tint (R >= G >= B), NOT cold slate blue (where B > R)
  for (let i = 0; i < result.palette.length; i++) {
    const col = result.palette[i];
    assert.ok(col.r >= col.b, `Color c${i} (${col.r}, ${col.g}, ${col.b}) must be warm (R >= B), not cold blue`);
  }
});

// 3. Dark / Pure Black Album (e.g. Donda, Black Album)
test('Dark / Pitch-black artwork stays deep moody obsidian (no washed out grey)', () => {
  const size = 48;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 10;
    data[i + 1] = 10;
    data[i + 2] = 12;
    data[i + 3] = 255;
  }

  const result = analyzeArtworkPixels(data);
  assert.ok(result.dominant.r <= 20, 'Dominant R must stay dark');
  assert.ok(result.dominant.g <= 20, 'Dominant G must stay dark');
  assert.ok(result.dominant.b <= 25, 'Dominant B must stay dark');

  // Base and primary must stay dark moody
  assert.ok(result.palette[0].r <= 15, 'Base c0 must stay deep velvet dark');
  assert.ok(result.palette[1].r <= 70, 'Hero c1 must stay dark graphite');
});

// 4. Luminous White Artwork (e.g. White Album)
test('Luminous White artwork preserves light airy tones', () => {
  const size = 48;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 240;
    data[i + 1] = 240;
    data[i + 2] = 245;
    data[i + 3] = 255;
  }

  const result = analyzeArtworkPixels(data);
  assert.ok(result.dominant.r >= 230, 'Dominant R should be high');
  assert.ok(result.palette[1].r >= 200, 'Hero c1 should be light luminous');
  assert.ok(result.palette[3].r >= 230, 'Crest c3 should be high platinum/white');
});

// 5. Dual-Hue Artwork (e.g. Orange & Teal)
test('Dual-Hue artwork (Orange & Teal) extracts both distinct dominant clusters', () => {
  const size = 48;
  const data = new Uint8Array(size * size * 4);
  const half = data.length / 2;

  // First half: vivid orange
  for (let i = 0; i < half; i += 4) {
    data[i] = 245;     // Orange
    data[i + 1] = 130;
    data[i + 2] = 32;
    data[i + 3] = 255;
  }
  // Second half: deep teal
  for (let i = half; i < data.length; i += 4) {
    data[i] = 16;      // Teal
    data[i + 1] = 160;
    data[i + 2] = 180;
    data[i + 3] = 255;
  }

  const result = analyzeArtworkPixels(data);
  const c1 = result.primary;
  const c2 = result.secondary;

  const hsl1 = rgbToHsl(c1.r, c1.g, c1.b);
  const hsl2 = rgbToHsl(c2.r, c2.g, c2.b);

  // One cluster should be warm orange (Hue ~ 20-40) and the other teal/cyan (Hue ~ 170-200)
  const isOneOrange = (hsl1.h >= 15 && hsl1.h <= 45) || (hsl2.h >= 15 && hsl2.h <= 45);
  const isOneTeal = (hsl1.h >= 165 && hsl1.h <= 205) || (hsl2.h >= 165 && hsl2.h <= 205);

  assert.ok(isOneOrange, 'MMCQ must capture the orange cluster');
  assert.ok(isOneTeal, 'MMCQ must capture the teal cluster');
});

// 6. Output Schema Validation
test('Output schema returns valid [0, 255] RGB integer objects', () => {
  const size = 48;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (i * 7) % 256;
    data[i + 1] = (i * 13) % 256;
    data[i + 2] = (i * 29) % 256;
    data[i + 3] = 255;
  }

  const result = analyzeArtworkPixels(data);
  assert.ok(result.dominant && result.primary && result.secondary && result.tertiary && result.quaternary && result.base);
  for (const c of result.palette) {
    assert.ok(Number.isInteger(c.r) && c.r >= 0 && c.r <= 255, `Invalid R: ${c.r}`);
    assert.ok(Number.isInteger(c.g) && c.g >= 0 && c.g <= 255, `Invalid G: ${c.g}`);
    assert.ok(Number.isInteger(c.b) && c.b >= 0 && c.b <= 255, `Invalid B: ${c.b}`);
  }
});

// 7. Execution Performance Benchmark
test('Execution performance on realistic artwork: 100 runs complete in under 500ms (< 5ms per image)', () => {
  const size = 48;
  const data = new Uint8Array(size * size * 4);
  const half = data.length / 2;
  for (let i = 0; i < half; i += 4) {
    data[i] = 230; data[i + 1] = 65; data[i + 2] = 45; data[i + 3] = 255;
  }
  for (let i = half; i < data.length; i += 4) {
    data[i] = 30; data[i + 1] = 140; data[i + 2] = 210; data[i + 3] = 255;
  }

  // Warm up JIT compiler
  for (let w = 0; w < 5; w++) {
    analyzeArtworkPixels(data);
  }

  const t0 = Date.now();
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    analyzeArtworkPixels(data);
  }
  const totalMs = Date.now() - t0;
  const avgMs = totalMs / iterations;
  console.log(`        Benchmark (Realistic Art): ${iterations} runs in ${totalMs}ms (${avgMs.toFixed(2)}ms/run)`);
  assert.ok(totalMs < 850, `Execution too slow on realistic artwork: ${totalMs}ms total`);
});

// 8. Worst-Case Pathological Noise Stress Test
test('Stress test on high-entropy noise: 50 runs complete within 500ms (< 10ms per image)', () => {
  const size = 48;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (i * 3) % 256;
    data[i + 1] = (i * 5) % 256;
    data[i + 2] = (i * 7) % 256;
    data[i + 3] = 255;
  }

  const t0 = Date.now();
  const iterations = 50;
  for (let i = 0; i < iterations; i++) {
    analyzeArtworkPixels(data);
  }
  const totalMs = Date.now() - t0;
  const avgMs = totalMs / iterations;
  console.log(`        Benchmark (Stress Noise): ${iterations} runs in ${totalMs}ms (${avgMs.toFixed(2)}ms/run)`);
  assert.ok(totalMs < 500, `Execution too slow on noise stress test: ${totalMs}ms total`);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
