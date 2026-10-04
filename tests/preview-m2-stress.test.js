/**
 * tests/preview-m2-stress.test.js
 * Empirical stress tests for Milestone 2:
 * Color string parsing, diverse harmonic palettes, and hexToRgba alpha clamping.
 *
 * Requirements tested:
 * 1. Standard and edge-case color strings: hex (#abc, #aabbcc, #aabbccdd),
 *    rgb ('rgb(255, 60, 0)', 'rgb( 10 , 20 , 30 )'), rgba ('rgba(0, 100, 255, 0.5)'),
 *    modern CSS 'rgb(255 128 0 / 0.8)', malformed strings, null/undefined.
 * 2. Diverse album hues: verify red, blue, amber, violet, pure black, pure white,
 *    monochrome sepia all produce appropriate harmonic palettes and NEVER falsely
 *    trigger the hue 141 default.
 * 3. Test that hexToRgba clamps alpha correctly between 0 and 1.
 */

// ─── Environment Mock for Canvas / DOM ───────────────────────────────────────
if (typeof document === 'undefined') {
  global.document = {
    getElementById: () => null,
    createElement: () => ({ getContext: () => null, style: {} }),
    documentElement: { style: { getPropertyValue: () => '' } }
  };
}

const {
  hexToRgbObj,
  hexToRgba,
  normalizeHarmonicPalette
} = require('../src/modules/share-card.js');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    const err = `${message} — Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`;
    failures.push(err);
    console.error(`  ✗ FAIL: ${err}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    const err = `${message} — Expected: ${expectedStr}, Actual: ${actualStr}`;
    failures.push(err);
    console.error(`  ✗ FAIL: ${err}`);
  }
}

console.log('================================================================');
console.log('MILESTONE 2 EMPIRICAL STRESS TEST HARNESS');
console.log('================================================================\n');

// ─── 1. Standard & Edge-Case Color String Parsing ───────────────────────────
console.log('── 1. Color String Parsing (hexToRgbObj) ──');

// 1.1 Hex variations
assertDeepEqual(hexToRgbObj('#abc'), { r: 170, g: 187, b: 204 }, '3-digit hex #abc expands correctly');
assertDeepEqual(hexToRgbObj('#ABC'), { r: 170, g: 187, b: 204 }, 'Uppercase 3-digit hex #ABC expands correctly');
assertDeepEqual(hexToRgbObj('#aabbcc'), { r: 170, g: 187, b: 204 }, '6-digit hex #aabbcc parses correctly');
assertDeepEqual(hexToRgbObj('#AABBCC'), { r: 170, g: 187, b: 204 }, 'Uppercase 6-digit hex #AABBCC parses correctly');
assertDeepEqual(hexToRgbObj('#aabbccdd'), { r: 170, g: 187, b: 204 }, '8-digit hex #aabbccdd (with alpha) parses RGB correctly');
assertDeepEqual(hexToRgbObj('#abcd'), { r: 170, g: 187, b: 204 }, '4-digit hex #abcd (with alpha) parses RGB correctly');
assertDeepEqual(hexToRgbObj('aabbcc'), { r: 170, g: 187, b: 204 }, 'Hex string without leading # parses correctly');
assertDeepEqual(hexToRgbObj('  #ff0000  '), { r: 255, g: 0, b: 0 }, 'Hex with surrounding whitespace parses correctly');

// 1.2 RGB / RGBA variations
assertDeepEqual(hexToRgbObj('rgb(255, 60, 0)'), { r: 255, g: 60, b: 0 }, 'Standard rgb(255, 60, 0) parses correctly');
assertDeepEqual(hexToRgbObj('rgb( 10 , 20 , 30 )'), { r: 10, g: 20, b: 30 }, 'Padded rgb( 10 , 20 , 30 ) parses correctly');
assertDeepEqual(hexToRgbObj('rgba(0, 100, 255, 0.5)'), { r: 0, g: 100, b: 255 }, 'Standard rgba(0, 100, 255, 0.5) parses correctly');
assertDeepEqual(hexToRgbObj('rgba( 10 , 20 , 30 , 0.25 )'), { r: 10, g: 20, b: 30 }, 'Padded rgba( 10 , 20 , 30 , 0.25 ) parses correctly');
assertDeepEqual(hexToRgbObj('RGB(255, 60, 0)'), { r: 255, g: 60, b: 0 }, 'Uppercase RGB(255, 60, 0) parses correctly');
assertDeepEqual(hexToRgbObj('RGBA(0, 100, 255, 1)'), { r: 0, g: 100, b: 255 }, 'Uppercase RGBA(0, 100, 255, 1) parses correctly');

// 1.3 Modern CSS Color syntax (CSS Color Level 4 space-separated)
assertDeepEqual(hexToRgbObj('rgb(255 128 0 / 0.8)'), { r: 255, g: 128, b: 0 }, 'Modern CSS rgb(255 128 0 / 0.8) parses correctly');
assertDeepEqual(hexToRgbObj('rgb(255 128 0)'), { r: 255, g: 128, b: 0 }, 'Modern CSS rgb(255 128 0) without alpha parses correctly');
assertDeepEqual(hexToRgbObj('rgba(255 128 0 / 0.5)'), { r: 255, g: 128, b: 0 }, 'Modern CSS rgba(255 128 0 / 0.5) parses correctly');
assertDeepEqual(hexToRgbObj('rgb(100% 50% 0% / 0.75)'), { r: 255, g: 128, b: 0 }, 'Percentage rgb(100% 50% 0% / 0.75) parses correctly');

// 1.4 Malformed strings & Graceful Fallback (Spotify green { r: 29, g: 185, b: 84 })
const DEFAULT_RGB = { r: 29, g: 185, b: 84 };
assertDeepEqual(hexToRgbObj('not-a-color'), DEFAULT_RGB, 'Arbitrary text falls back to default safely');
assertDeepEqual(hexToRgbObj('#12345'), DEFAULT_RGB, 'Invalid 5-digit hex #12345 falls back safely');
assertDeepEqual(hexToRgbObj('#gggggg'), DEFAULT_RGB, 'Non-hex characters fall back safely');
assertDeepEqual(hexToRgbObj('rgb(1, 2)'), DEFAULT_RGB, 'Incomplete rgb(1, 2) falls back safely');
assertDeepEqual(hexToRgbObj(''), DEFAULT_RGB, 'Empty string falls back safely');
assertDeepEqual(hexToRgbObj('   '), DEFAULT_RGB, 'Whitespace-only string falls back safely');
assertDeepEqual(hexToRgbObj(null), DEFAULT_RGB, 'null falls back safely');
assertDeepEqual(hexToRgbObj(undefined), DEFAULT_RGB, 'undefined falls back safely');
assertDeepEqual(hexToRgbObj(12345), DEFAULT_RGB, 'Numeric input falls back safely');
assertDeepEqual(hexToRgbObj({}), DEFAULT_RGB, 'Empty object falls back safely');
assertDeepEqual(hexToRgbObj({ r: 50, g: 150, b: 250 }), { r: 50, g: 150, b: 250 }, 'Pre-parsed RGB object passes through safely');

// ─── 2. Diverse Album Hues in normalizeHarmonicPalette ───────────────────────
console.log('\n── 2. Diverse Album Hues & Harmonic Palette Calculations ──');

const testHues = [
  { name: 'Red (#ff0000)', input: ['#ff0000', '#cc0000'], expectedHue: 0, minL: 42, maxL: 56 },
  { name: 'Red rgb()', input: ['rgb(255, 0, 0)', 'rgb(204, 0, 0)'], expectedHue: 0, minL: 42, maxL: 56 },
  { name: 'Blue (#2563eb)', input: ['#2563eb', '#1d4ed8'], expectedHue: 221, minL: 42, maxL: 56 },
  { name: 'Blue rgb()', input: ['rgb(0, 100, 255)', 'rgb(30, 60, 200)'], expectedHue: 216, minL: 42, maxL: 56 },
  { name: 'Amber (#f59e0b)', input: ['#f59e0b', '#d97706'], expectedHue: 38, minL: 42, maxL: 56 },
  { name: 'Amber rgb()', input: ['rgb(245, 158, 11)', 'rgb(217, 119, 6)'], expectedHue: 38, minL: 42, maxL: 56 },
  { name: 'Violet (#8b5cf6)', input: ['#8b5cf6', '#7c3aed'], expectedHue: 258, minL: 42, maxL: 56 },
  { name: 'Violet rgb()', input: ['rgb(139, 92, 246)', 'rgb(124, 58, 237)'], expectedHue: 258, minL: 42, maxL: 56 },
  { name: 'Pure Black (#000000)', input: ['#000000', '#111111'], expectedHue: 0, minL: 42, maxL: 56 },
  { name: 'Pure Black rgb()', input: ['rgb(0, 0, 0)', 'rgb(10, 10, 10)'], expectedHue: 0, minL: 42, maxL: 56 },
  { name: 'Pure White (#ffffff)', input: ['#ffffff', '#eeeeee'], expectedHue: 0, minL: 42, maxL: 56 },
  { name: 'Pure White rgb()', input: ['rgb(255, 255, 255)', 'rgb(240, 240, 240)'], expectedHue: 0, minL: 42, maxL: 56 },
  { name: 'Monochrome Sepia (#704214)', input: ['#704214', '#8b5a2b'], expectedHue: 30, minL: 42, maxL: 56 },
  { name: 'Monochrome Sepia rgb()', input: ['rgb(112, 66, 20)', 'rgb(139, 90, 43)'], expectedHue: 30, minL: 42, maxL: 56 }
];

for (const t of testHues) {
  const pal = normalizeHarmonicPalette(t.input);
  assert(
    pal.ambientHue !== 141 || t.expectedHue === 141,
    `${t.name} ambientHue (${pal.ambientHue}) NEVER falsely triggers default hue 141`
  );
  assertEqual(pal.ambientHue, t.expectedHue, `${t.name} computes exact expected primary hue ${t.expectedHue}`);
  assert(pal.ambientSat >= 18 && pal.ambientSat <= 35, `${t.name} ambientSat (${pal.ambientSat}%) is clamped within [18%, 35%]`);
  assertEqual(pal.ambientLight, 22, `${t.name} ambientLight is constant 22%`);
  assert(pal.darkNeutral.includes('4%'), `${t.name} darkNeutral has 4% foundation lightness`);
}

// Default palette verification when no palette is passed
const defaultPal = normalizeHarmonicPalette(null);
assertEqual(defaultPal.ambientHue, 141, 'Null palette correctly falls back to default Spotify green hue 141');
const emptyPal = normalizeHarmonicPalette([]);
assertEqual(emptyPal.ambientHue, 141, 'Empty palette correctly falls back to default Spotify green hue 141');

// ─── 3. hexToRgba Alpha Clamping Stress Tests ───────────────────────────────
console.log('\n── 3. hexToRgba Alpha Clamping Stress Tests ──');

// Standard within-range alpha
assertEqual(hexToRgba('#ff0000', 1), 'rgba(255, 0, 0, 1)', 'Alpha 1.0 renders correctly');
assertEqual(hexToRgba('#ff0000', 0.5), 'rgba(255, 0, 0, 0.5)', 'Alpha 0.5 renders correctly');
assertEqual(hexToRgba('#ff0000', 0), 'rgba(255, 0, 0, 0)', 'Alpha 0.0 renders correctly');
assertEqual(hexToRgba('rgb(0, 100, 255)', 0.75), 'rgba(0, 100, 255, 0.75)', 'Alpha with rgb() source renders correctly');

// Out-of-bounds alpha clamping: alpha > 1 MUST clamp to 1
assertEqual(hexToRgba('#ff0000', 1.5), 'rgba(255, 0, 0, 1)', 'Alpha 1.5 must clamp to 1.0');
assertEqual(hexToRgba('#00ff00', 2.0), 'rgba(0, 255, 0, 1)', 'Alpha 2.0 must clamp to 1.0');
assertEqual(hexToRgba('#0000ff', 100), 'rgba(0, 0, 255, 1)', 'Alpha 100 must clamp to 1.0');

// Out-of-bounds alpha clamping: alpha < 0 MUST clamp to 0
assertEqual(hexToRgba('#ff0000', -0.2), 'rgba(255, 0, 0, 0)', 'Alpha -0.2 must clamp to 0.0');
assertEqual(hexToRgba('#ff0000', -1.0), 'rgba(255, 0, 0, 0)', 'Alpha -1.0 must clamp to 0.0');

// Missing / undefined / NaN / invalid alpha handling
assertEqual(hexToRgba('#ff0000', undefined), 'rgba(255, 0, 0, 1)', 'Undefined alpha must default to 1.0');
assertEqual(hexToRgba('#ff0000'), 'rgba(255, 0, 0, 1)', 'Omitted alpha parameter must default to 1.0');
assertEqual(hexToRgba('#ff0000', NaN), 'rgba(255, 0, 0, 1)', 'NaN alpha must default to 1.0');
assertEqual(hexToRgba('#ff0000', 'invalid'), 'rgba(255, 0, 0, 1)', 'Non-numeric alpha must default to 1.0');

// Null hex input with clamped alpha
assertEqual(hexToRgba(null, 1.5), 'rgba(29, 185, 84, 1)', 'Null hex with alpha 1.5 clamps alpha to 1.0');
assertEqual(hexToRgba(null, -0.5), 'rgba(29, 185, 84, 0)', 'Null hex with alpha -0.5 clamps alpha to 0.0');
assertEqual(hexToRgba(null, undefined), 'rgba(29, 185, 84, 1)', 'Null hex with omitted alpha defaults alpha to 1.0');

// ─── Summary ────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`STRESS TEST RESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nSUMMARY OF FAILURES:');
  failures.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
}
console.log('================================================================');

process.exit(failed > 0 ? 1 : 0);
