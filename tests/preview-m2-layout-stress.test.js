/**
 * tests/preview-m2-layout-stress.test.js
 * Empirical stress tests for Milestone 2:
 * Classic mode layout, optical balance, lyricMaxWidth adaptation,
 * metadata string generation/truncation, and renderCardContent execution.
 *
 * Requirements tested:
 * 1. Verify comp.hasSubject NO LONGER offsets lyrics horizontally in Classic mode
 *    across Story, Square, and Portrait layouts.
 * 2. Verify lyricMaxWidth adapts appropriately between compact lyrics (<= 2 lines)
 *    and long lyrics (3+ lines).
 * 3. Verify metadata string generation and truncation with long artist names (e.g. 100 chars),
 *    missing artists, missing tracks, zero/negative durations, and verify left & right labels
 *    do not collide.
 * 4. Verify renderCardContent executes without errors across Classic mode in all 4
 *    aspect ratios with mock canvas contexts (including defensive checks for missing state properties).
 */

// ─── Environment Setup ────────────────────────────────────────────────────────
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

// Canvas pixel buffer for mock offscreen canvas
let currentOffscreenPixels = new Uint8ClampedArray(16 * 16 * 4);

global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        width: 16,
        height: 16,
        getContext: () => ({
          drawImage: (img) => {
            if (img && img._data) {
              for (let i = 0; i < currentOffscreenPixels.length; i++) {
                currentOffscreenPixels[i] = img._data[i];
              }
            }
          },
          getImageData: () => ({ data: currentOffscreenPixels }),
          measureText: (t) => ({ width: (t ? String(t).length : 0) * 10 }),
          fillText: () => {},
          fillRect: () => {},
          clearRect: () => {},
          save: () => {},
          restore: () => {},
          scale: () => {},
          createLinearGradient: () => ({ addColorStop: () => {} }),
          createRadialGradient: () => ({ addColorStop: () => {} }),
          createPattern: () => ({}),
          createImageData: () => ({ data: new Uint8ClampedArray(128 * 128 * 4) }),
          putImageData: () => {},
          beginPath: () => {},
          closePath: () => {},
          fill: () => {},
          stroke: () => {},
          clip: () => {},
          strokeRect: () => {},
          arc: () => {},
          moveTo: () => {},
          lineTo: () => {},
          quadraticCurveTo: () => {}
        }),
        style: {}
      };
    }
    return { style: {} };
  },
  body: { classList: { add: () => {}, remove: () => {}, contains: () => false } }
};

global.window = {};

const {
  renderCardContent,
  drawThemeBackground,
  drawFloatingMetadataPill,
  drawScrubberBar,
  analyzeArtworkComposition
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

function assertCloseTo(actual, expected, tolerance = 0.5, message) {
  if (Math.abs(actual - expected) <= tolerance) {
    passed++;
    console.log(`  ✓ ${message} (${actual} ≈ ${expected})`);
  } else {
    failed++;
    const err = `${message} — Expected ~${expected}, Actual: ${actual} (diff: ${Math.abs(actual - expected)})`;
    failures.push(err);
    console.error(`  ✗ FAIL: ${err}`);
  }
}

// ─── Test Helper: Mock Canvas with Call Logging & Strict Coordinate Validation ───
function createStrictMockContext() {
  const log = {
    fillTextCalls: [],
    fillRectCalls: [],
    strokeRectCalls: [],
    strokeCalls: 0,
    fillCalls: 0,
    arcCalls: [],
    gradientsCreated: 0
  };

  const validateNumbers = (name, ...nums) => {
    for (let i = 0; i < nums.length; i++) {
      const v = nums[i];
      if (typeof v !== 'number' || isNaN(v) || !Number.isFinite(v)) {
        throw new Error(`NaN or non-finite coordinate in ${name} at arg index ${i}: ${v}`);
      }
    }
  };

  const ctx = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'center',
    shadowBlur: 0,
    shadowColor: 'transparent',
    shadowOffsetY: 0,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',

    measureText: (t) => ({ width: (t ? String(t).length : 0) * 10 }),

    fillText: (text, x, y) => {
      validateNumbers('fillText', x, y);
      log.fillTextCalls.push({ text: String(text), x, y, textAlign: ctx.textAlign, font: ctx.font });
    },

    fillRect: (x, y, w, h) => {
      validateNumbers('fillRect', x, y, w, h);
      log.fillRectCalls.push({ x, y, w, h });
    },

    strokeRect: (x, y, w, h) => {
      validateNumbers('strokeRect', x, y, w, h);
      log.strokeRectCalls.push({ x, y, w, h });
    },

    arc: (x, y, r, sa, ea) => {
      validateNumbers('arc', x, y, r, sa, ea);
      log.arcCalls.push({ x, y, r });
    },

    moveTo: (x, y) => validateNumbers('moveTo', x, y),
    lineTo: (x, y) => validateNumbers('lineTo', x, y),
    quadraticCurveTo: (cpx, cpy, x, y) => validateNumbers('quadraticCurveTo', cpx, cpy, x, y),

    beginPath: () => {},
    closePath: () => {},
    stroke: () => { log.strokeCalls++; },
    fill: () => { log.fillCalls++; },
    clip: () => {},
    save: () => {},
    restore: () => {},
    scale: (sx, sy) => validateNumbers('scale', sx, sy),
    clearRect: (x, y, w, h) => validateNumbers('clearRect', x, y, w, h),
    drawImage: () => {},

    createLinearGradient: (x0, y0, x1, y1) => {
      validateNumbers('createLinearGradient', x0, y0, x1, y1);
      log.gradientsCreated++;
      return { addColorStop: () => {} };
    },

    createRadialGradient: (x0, y0, r0, x1, y1, r1) => {
      validateNumbers('createRadialGradient', x0, y0, r0, x1, y1, r1);
      log.gradientsCreated++;
      return { addColorStop: () => {} };
    },

    createPattern: () => ({}),
    createImageData: () => ({ data: new Uint8ClampedArray(128 * 128 * 4) }),
    putImageData: () => {}
  };

  return { ctx, log };
}

// ─── Synthetic Images for Subject Detection ────────────────────────────────────
function createSyntheticImage(pattern) {
  const data = new Uint8ClampedArray(16 * 16 * 4);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const idx = (y * 16 + x) * 4;
      let val = 128; // neutral gray
      if (pattern === 'left') {
        val = x < 8 ? ((x + y) % 2 === 0 ? 255 : 0) : 128;
      } else if (pattern === 'right') {
        val = x >= 8 ? ((x + y) % 2 === 0 ? 255 : 0) : 128;
      } else if (pattern === 'center') {
        val = (x >= 4 && x < 12 && y >= 4 && y < 12) ? ((x + y) % 2 === 0 ? 255 : 0) : 128;
      } else if (pattern === 'balanced') {
        val = 128;
      }
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  return {
    complete: true,
    naturalWidth: 16,
    naturalHeight: 16,
    _data: data
  };
}

const imgLeftSubject = createSyntheticImage('left');
const imgRightSubject = createSyntheticImage('right');
const imgCenterSubject = createSyntheticImage('center');
const imgBalancedNoSubject = createSyntheticImage('balanced');

console.log('================================================================');
console.log('MILESTONE 2: CLASSIC LAYOUT & OPTICAL BALANCE STRESS HARNESS');
console.log('================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. REQUIREMENT 1: comp.hasSubject NO LONGER offsets lyrics in Classic mode
// ─────────────────────────────────────────────────────────────────────────────
console.log('── 1. comp.hasSubject Horizontal Offset Independence in Classic Mode ──');

// Verify synthetic image analysis works as expected
const compLeft = analyzeArtworkComposition(imgLeftSubject);
assert(compLeft.hasSubject === true && compLeft.focalZone === 'left', 'Synthetic left-subject image detects hasSubject: true and focalZone: "left"');
const compRight = analyzeArtworkComposition(imgRightSubject);
assert(compRight.hasSubject === true && compRight.focalZone === 'right', 'Synthetic right-subject image detects hasSubject: true and focalZone: "right"');
const compCenter = analyzeArtworkComposition(imgCenterSubject);
assert(compCenter.hasSubject === true && compCenter.focalZone === 'center', 'Synthetic center-subject image detects hasSubject: true and focalZone: "center"');
const compBalanced = analyzeArtworkComposition(imgBalancedNoSubject);
assert(compBalanced.hasSubject === false, 'Synthetic balanced image detects hasSubject: false');

const layoutsToTest = [
  { format: 'story', w: 1080, h: 1920, expectedCenterX: 540 },
  { format: 'square', w: 1080, h: 1080, expectedCenterX: 540 },
  { format: 'portrait', w: 1080, h: 1350, expectedCenterX: 540 }
];

const testArtworks = [
  { label: 'Left Subject (hasSubject=true, focalZone=left)', img: imgLeftSubject },
  { label: 'Right Subject (hasSubject=true, focalZone=right)', img: imgRightSubject },
  { label: 'Center Subject (hasSubject=true, focalZone=center)', img: imgCenterSubject },
  { label: 'Balanced (hasSubject=false)', img: imgBalancedNoSubject },
  { label: 'Null Image (no artwork)', img: null }
];

for (const layout of layoutsToTest) {
  console.log(`\n  Checking ${layout.format.toUpperCase()} layout (${layout.w} x ${layout.h}):`);

  for (const art of testArtworks) {
    const { ctx, log } = createStrictMockContext();
    const state = {
      theme: 'classic',
      format: layout.format,
      albumImg: art.img,
      palette: ['#ff3c00', '#0064ff'],
      selectedIndices: [0],
      cachedLyrics: [{ text: 'Testing Lyric Line', time: 1000 }],
      artistName: 'Test Artist',
      trackTitle: 'Test Track',
      textAlign: 'center'
    };

    renderCardContent(ctx, layout.w, layout.h, state);

    const lyricDraws = log.fillTextCalls.filter(c => c.text === 'Testing Lyric Line');
    assert(lyricDraws.length > 0, `${layout.format} + ${art.label} rendered lyric line`);

    const lyricCall = lyricDraws[0];
    assertEqual(
      lyricCall.x,
      layout.expectedCenterX,
      `Classic ${layout.format} with ${art.label} places lyrics at exactly X=${layout.expectedCenterX} (no dodging)`
    );
    assertEqual(
      lyricCall.textAlign,
      'center',
      `Classic ${layout.format} with ${art.label} preserves textAlign "center" (not forced to left)`
    );
  }

  // Contrast test with Cinematic mode to empirically confirm Cinematic DOES dodge while Classic does NOT
  const { ctx: cinCtx, log: cinLog } = createStrictMockContext();
  const cinState = {
    theme: 'cinematic',
    format: layout.format,
    albumImg: imgLeftSubject,
    palette: ['#ff3c00', '#0064ff'],
    selectedIndices: [0],
    cachedLyrics: [{ text: 'Testing Lyric Line', time: 1000 }],
    artistName: 'Test Artist',
    trackTitle: 'Test Track',
    textAlign: 'center'
  };
  renderCardContent(cinCtx, layout.w, layout.h, cinState);
  const cinDraws = cinLog.fillTextCalls.filter(c => c.text === 'Testing Lyric Line');
  assert(cinDraws.length > 0, `Cinematic ${layout.format} rendered lyric line`);
  const cinCall = cinDraws[0];
  assert(
    cinCall.x !== layout.expectedCenterX,
    `Cinematic ${layout.format} with left-subject dodges lyrics (X=${cinCall.x} !== ${layout.expectedCenterX})`
  );
  assertEqual(
    cinCall.textAlign,
    'left',
    `Cinematic ${layout.format} forces effectiveAlign to "left"`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REQUIREMENT 2: lyricMaxWidth Adapts Between Compact and Long Lyrics
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── 2. lyricMaxWidth Adaptation: Compact (<= 2 lines) vs Long (3+ lines) ──');

// Mathematical extraction helper: when textAlign is 'left', textX = cx - (maxWidth / 2)
// Since cx = 540 in Classic mode, maxWidth = (540 - textX) * 2
function extractLyricMaxWidth(format, lines, w = 1080, h = 1920) {
  const { ctx, log } = createStrictMockContext();
  const state = {
    theme: 'classic',
    format,
    albumImg: null,
    palette: ['#ff3c00'],
    selectedIndices: lines.map((_, i) => i),
    cachedLyrics: lines.map((l, i) => ({ text: l, time: i * 1000 })),
    artistName: 'Artist',
    trackTitle: 'Track',
    textAlign: 'left' // force left alignment to extract maxWidth from textX = cx - maxWidth / 2
  };
  renderCardContent(ctx, w, h, state);
  const lyricCall = log.fillTextCalls.find(c => lines.some(l => c.text.startsWith(l.slice(0, 5))));
  if (!lyricCall) {
    throw new Error(`Failed to find rendered lyric line for format ${format}`);
  }
  const cx = w / 2;
  const maxWidth = (cx - lyricCall.x) * 2;
  return maxWidth;
}

const formatsToTest = [
  { format: 'story', w: 1080, h: 1920, pillW: 920, compactFactor: 0.88, longFactor: 0.96 },
  { format: 'square', w: 1080, h: 1080, pillW: 960, compactFactor: 0.85, longFactor: 0.94 },
  { format: 'portrait', w: 1080, h: 1350, pillW: 940, compactFactor: 0.86, longFactor: 0.95 }
];

for (const fmt of formatsToTest) {
  const expectedCompact = fmt.pillW * fmt.compactFactor;
  const expectedLong = fmt.pillW * fmt.longFactor;

  console.log(`\n  Checking ${fmt.format.toUpperCase()}: expected compact = ${expectedCompact}, expected long = ${expectedLong}`);

  // Test Case A: 1 Line, short lyric (< 50 chars) -> Compact
  const mw1Short = extractLyricMaxWidth(fmt.format, ['Short punchy lyric'], fmt.w, fmt.h);
  assertCloseTo(mw1Short, expectedCompact, 0.5, `${fmt.format}: 1 short line uses compact width`);

  // Test Case B: 2 Lines, short lyric (< 50 total chars) -> Compact
  const mw2Short = extractLyricMaxWidth(fmt.format, ['First short line', 'Second short line'], fmt.w, fmt.h);
  assertCloseTo(mw2Short, expectedCompact, 0.5, `${fmt.format}: 2 short lines (<50 chars) uses compact width`);

  // Test Case C: 2 Lines, boundary 49 total chars -> Compact
  const line24 = 'A'.repeat(24);
  const line25 = 'B'.repeat(25);
  const mw2_49 = extractLyricMaxWidth(fmt.format, [line24, line25], fmt.w, fmt.h); // 49 chars
  assertCloseTo(mw2_49, expectedCompact, 0.5, `${fmt.format}: 2 lines with 49 chars (boundary <50) uses compact width`);

  // Test Case D: 2 Lines, boundary 50 total chars -> Long
  const mw2_50 = extractLyricMaxWidth(fmt.format, [line25, line25], fmt.w, fmt.h); // 50 chars
  assertCloseTo(mw2_50, expectedLong, 0.5, `${fmt.format}: 2 lines with 50 chars (boundary >=50) uses expanded long width`);

  // Test Case E: 1 Line, long lyric (>= 50 chars) -> Long
  const line55 = 'This is a single long lyric line exceeding fifty characters';
  const mw1Long = extractLyricMaxWidth(fmt.format, [line55], fmt.w, fmt.h);
  assertCloseTo(mw1Long, expectedLong, 0.5, `${fmt.format}: 1 long line (>=50 chars) uses expanded long width`);

  // Test Case F: 3 Lines, short lyrics (< 50 total chars) -> Long (lines.length > 2)
  const mw3Short = extractLyricMaxWidth(fmt.format, ['Line one', 'Line two', 'Line three'], fmt.w, fmt.h);
  assertCloseTo(mw3Short, expectedLong, 0.5, `${fmt.format}: 3 short lines (> 2 lines) uses expanded long width`);

  // Test Case G: 4 Lines, long lyrics -> Long
  const mw4Long = extractLyricMaxWidth(fmt.format, ['Line 1', 'Line 2', 'Line 3', 'Line 4'], fmt.w, fmt.h);
  assertCloseTo(mw4Long, expectedLong, 0.5, `${fmt.format}: 4 lines uses expanded long width`);

  // Test Case H: Compact width strictly smaller than long width
  assert(expectedCompact < expectedLong, `${fmt.format}: compact width (${expectedCompact}) strictly < long width (${expectedLong})`);

  // Test Case I: Optical margins check
  const sideMarginCompact = (fmt.w - expectedCompact) / 2;
  const sideMarginLong = (fmt.w - expectedLong) / 2;
  assert(sideMarginCompact > sideMarginLong, `${fmt.format}: compact side margin (${sideMarginCompact}px) > long side margin (${sideMarginLong}px)`);
  assert(sideMarginLong >= (fmt.w - fmt.pillW) / 2, `${fmt.format}: long width stays within pill bounding limits`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REQUIREMENT 3: Metadata String Generation and Truncation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── 3. Metadata String Generation and Truncation Edge Cases ──');

// 3.1 Classic Publication Header in drawThemeBackground
console.log('\n  3.1 Classic Publication Header:');

const headerTestCases = [
  {
    name: 'Standard artist and track with duration',
    state: { artistName: 'Radiohead', trackTitle: 'Creep', trackDurationMs: 238000 },
    check: (left, right) => {
      assertEqual(left, 'RELEASE // RADIOHEAD', 'Left label formats standard artist');
      assert(right.includes('CREEP') && right.includes('3:58'), 'Right label formats track and duration');
    }
  },
  {
    name: 'Long artist name (100 characters)',
    state: { artistName: 'A'.repeat(100), trackTitle: 'Song', trackDurationMs: 180000 },
    check: (left, right, ctx, maxLeftW) => {
      assert(left.startsWith('RELEASE // '), 'Left label starts with "RELEASE // "');
      assert(left.endsWith('…'), 'Left label ends with ellipsis "…"');
      const measuredLeftW = ctx.measureText(left).width;
      assert(
        measuredLeftW <= maxLeftW,
        `Left label total width (${measuredLeftW}) must NOT exceed allocated 52% width limit (${maxLeftW})`
      );
    }
  },
  {
    name: 'Missing artist (null)',
    state: { artistName: null, trackTitle: 'Song', trackDurationMs: 180000 },
    check: (left, right) => {
      assertEqual(left, 'EDITORIAL // ARCHIVE EDITION', 'Null artist defaults to "EDITORIAL // ARCHIVE EDITION"');
    }
  },
  {
    name: 'Missing artist (undefined)',
    state: { artistName: undefined, trackTitle: 'Song', trackDurationMs: 180000 },
    check: (left, right) => {
      assertEqual(left, 'EDITORIAL // ARCHIVE EDITION', 'Undefined artist defaults to "EDITORIAL // ARCHIVE EDITION"');
    }
  },
  {
    name: 'Missing artist (empty string "")',
    state: { artistName: '', trackTitle: 'Song', trackDurationMs: 180000 },
    check: (left, right) => {
      assertEqual(left, 'EDITORIAL // ARCHIVE EDITION', 'Empty artist defaults to "EDITORIAL // ARCHIVE EDITION"');
    }
  },
  {
    name: 'Missing artist (whitespace string "   ")',
    state: { artistName: '   ', trackTitle: 'Song', trackDurationMs: 180000 },
    check: (left, right) => {
      assertEqual(left, 'EDITORIAL // ARCHIVE EDITION', 'Whitespace artist defaults to "EDITORIAL // ARCHIVE EDITION"');
    }
  },
  {
    name: 'Missing track (null)',
    state: { artistName: 'Artist', trackTitle: null, trackDurationMs: 180000 },
    check: (left, right) => {
      assertEqual(right, 'SELECTED LYRIC EDITION', 'Null track defaults to "SELECTED LYRIC EDITION"');
    }
  },
  {
    name: 'Missing track (undefined)',
    state: { artistName: 'Artist', trackTitle: undefined, trackDurationMs: 180000 },
    check: (left, right) => {
      assertEqual(right, 'SELECTED LYRIC EDITION', 'Undefined track defaults to "SELECTED LYRIC EDITION"');
    }
  },
  {
    name: 'Missing track (empty string "")',
    state: { artistName: 'Artist', trackTitle: '', trackDurationMs: 180000 },
    check: (left, right) => {
      assertEqual(right, 'SELECTED LYRIC EDITION', 'Empty track defaults to "SELECTED LYRIC EDITION"');
    }
  },
  {
    name: 'Missing track (whitespace string "   ")',
    state: { artistName: 'Artist', trackTitle: '   ', trackDurationMs: 180000 },
    check: (left, right) => {
      assertEqual(right, 'SELECTED LYRIC EDITION', 'Whitespace track defaults to "SELECTED LYRIC EDITION"');
    }
  },
  {
    name: 'Zero duration (trackDurationMs = 0)',
    state: { artistName: 'Artist', trackTitle: 'My Song', trackDurationMs: 0 },
    check: (left, right) => {
      assertEqual(right, 'MY SONG', 'Zero duration omits time suffix (renders "MY SONG" without • 0:00)');
    }
  },
  {
    name: 'Negative duration (trackDurationMs = -5000)',
    state: { artistName: 'Artist', trackTitle: 'My Song', trackDurationMs: -5000 },
    check: (left, right) => {
      assertEqual(right, 'MY SONG', 'Negative duration omits time suffix (renders "MY SONG" without negative time)');
    }
  },
  {
    name: 'Both missing artist and missing track',
    state: { artistName: null, trackTitle: null, trackDurationMs: 0 },
    check: (left, right) => {
      assertEqual(left, 'EDITORIAL // ARCHIVE EDITION', 'Both missing: left is "EDITORIAL // ARCHIVE EDITION"');
      assertEqual(right, 'SELECTED LYRIC EDITION', 'Both missing: right is "SELECTED LYRIC EDITION"');
    }
  },
  {
    name: 'Long track title (100 characters)',
    state: { artistName: 'Artist', trackTitle: 'T'.repeat(100), trackDurationMs: 120000 },
    check: (left, right, ctx, maxLeftW, maxRightW) => {
      assert(right.endsWith('…') || right.includes('… •'), 'Long track is truncated with ellipsis "…"');
      const measuredRightW = ctx.measureText(right).width;
      assert(
        measuredRightW <= maxRightW,
        `Long track width (${measuredRightW}) must NOT exceed allocated 42% width limit (${maxRightW})`
      );
    }
  },
  {
    name: 'Both 100-character artist and 100-character track (Collision Guard)',
    state: { artistName: 'A'.repeat(100), trackTitle: 'T'.repeat(100), trackDurationMs: 120000 },
    check: (left, right, ctx, maxLeftW, maxRightW, availableW) => {
      const leftW = ctx.measureText(left).width;
      const rightW = ctx.measureText(right).width;
      const totalHeaderW = leftW + rightW;
      assert(
        totalHeaderW <= availableW,
        `Header non-collision guard: total header text width (${totalHeaderW}px) must be <= available width (${availableW}px) to prevent overlap`
      );
    }
  }
];

const w = 1080;
const h = 1920;
const margin = Math.min(80, w * 0.075);
const availableW = w - margin * 2;
const maxLeftW = availableW * 0.52;
const maxRightW = availableW * 0.42;

for (const tc of headerTestCases) {
  const { ctx, log } = createStrictMockContext();
  drawThemeBackground(ctx, w, h, 'classic', null, ['#ff3c00'], tc.state);

  const headerCalls = log.fillTextCalls.filter(c => c.y === 74);
  assert(headerCalls.length >= 2, `${tc.name}: draws both left and right header labels`);

  const leftCall = headerCalls.find(c => c.textAlign === 'left');
  const rightCall = headerCalls.find(c => c.textAlign === 'right');

  assert(Boolean(leftCall), `${tc.name}: left header call found`);
  assert(Boolean(rightCall), `${tc.name}: right header call found`);

  if (leftCall && rightCall) {
    tc.check(leftCall.text, rightCall.text, ctx, maxLeftW, maxRightW, availableW);
  }
}

// 3.2 Floating Metadata Pill Truncation and Robustness
console.log('\n  3.2 Floating Metadata Pill Truncation & Edge Cases:');

const pillEdgeCases = [
  { name: 'Long 100-char artist & title', artist: 'A'.repeat(100), track: 'T'.repeat(100), cur: 30000, tot: 180000, scrub: true },
  { name: 'Missing artist and title', artist: null, track: null, cur: 0, tot: 0, scrub: true },
  { name: 'Negative progress and duration', artist: 'Artist', track: 'Track', cur: -1000, tot: -5000, scrub: true },
  { name: 'Progress exceeds duration', artist: 'Artist', track: 'Track', cur: 250000, tot: 180000, scrub: true },
  { name: 'Scrubber disabled', artist: 'Artist', track: 'Track', cur: 0, tot: 180000, scrub: false }
];

for (const pec of pillEdgeCases) {
  const { ctx, log } = createStrictMockContext();
  const state = {
    theme: 'classic',
    artistName: pec.artist,
    trackTitle: pec.track,
    currentProgressMs: pec.cur,
    trackDurationMs: pec.tot,
    showScrubber: pec.scrub,
    showAlbumArt: true,
    showWatermark: true,
    albumImg: null
  };

  let threw = false;
  try {
    drawFloatingMetadataPill(ctx, 80, 1750, 920, pec.scrub ? 70 : 52, state, '#ff3c00', false, 'sans-serif');
  } catch (e) {
    threw = true;
    console.error(e);
  }
  assert(!threw, `drawFloatingMetadataPill executes cleanly for: ${pec.name}`);
}

// 3.3 Scrubber Bar Zero and Negative Duration Resilience
console.log('\n  3.3 Scrubber Bar (drawScrubberBar) Mathematical Resilience:');

const scrubberTests = [
  { cur: 0, tot: 0, label: '0 current, 0 total' },
  { cur: -100, tot: -500, label: 'negative current, negative total' },
  { cur: 50000, tot: 0, label: 'positive current, 0 total' },
  { cur: 200000, tot: 180000, label: 'current > total' },
  { cur: NaN, tot: NaN, label: 'NaN current, NaN total' },
  { cur: null, tot: null, label: 'null current, null total' }
];

for (const st of scrubberTests) {
  const { ctx, log } = createStrictMockContext();
  let scrubberError = false;
  try {
    drawScrubberBar(ctx, 540, 900, 600, st.cur, st.tot, '#ff3c00', false);
  } catch (e) {
    scrubberError = true;
    console.error(e);
  }
  assert(!scrubberError, `drawScrubberBar does not throw for: ${st.label}`);
  assert(log.arcCalls.length > 0, `drawScrubberBar rendered scrubber knob for: ${st.label}`);
  const knob = log.arcCalls[0];
  assert(knob.x >= 540 - 300 && knob.x <= 540 + 300 + 5, `Scrubber knob X (${knob.x}) is within valid bar bounds`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. REQUIREMENT 4: renderCardContent Executes Across All 4 Aspect Ratios
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── 4. renderCardContent Robust Execution Across All 4 Aspect Ratios ──');

const allAspectRatios = [
  { format: 'story', w: 1080, h: 1920 },
  { format: 'square', w: 1080, h: 1080 },
  { format: 'portrait', w: 1080, h: 1350 },
  { format: 'landscape', w: 1920, h: 1080 }
];

const lyricConfigurations = [
  { name: '1 Line English Short', lyrics: [{ text: 'Stay with me', time: 1000 }] },
  { name: '2 Lines English Compact', lyrics: [{ text: 'First line of lyric', time: 1000 }, { text: 'Second line of lyric', time: 2000 }] },
  { name: '4 Lines English Long', lyrics: [
      { text: 'Look at the stars', time: 1000 },
      { text: 'Look how they shine for you', time: 2000 },
      { text: 'And everything you do', time: 3000 },
      { text: 'Yeah they were all yellow', time: 4000 }
    ]
  },
  { name: 'Japanese CJK Lyrics', lyrics: [
      { text: '満月の夜に、君の手を握りしめて歩いた。', time: 1000 },
      { text: '「忘れないで」と囁いた声が今も響く。', time: 2000 }
    ]
  },
  { name: 'Empty Lyrics (Fallback)', lyrics: [] },
  { name: 'Massive 300-char Unbroken Line', lyrics: [{ text: 'LongWord'.repeat(35), time: 1000 }] }
];

const booleanOptions = [
  { showScrubber: false, showAlbumArt: false, showWatermark: false, showGrain: false },
  { showScrubber: true, showAlbumArt: true, showWatermark: true, showGrain: true }
];

const textAlignments = ['center', 'left', 'right'];
const fontFamilies = ['modern', 'serif', 'mono', 'soft'];

let matrixRenderCount = 0;
let matrixErrors = 0;

for (const ratio of allAspectRatios) {
  for (const lyricCfg of lyricConfigurations) {
    for (const bools of booleanOptions) {
      for (const align of textAlignments) {
        for (const font of fontFamilies) {
          const { ctx, log } = createStrictMockContext();
          const state = {
            theme: 'classic',
            format: ratio.format,
            albumImg: imgLeftSubject,
            palette: ['#ff3c00', '#0064ff'],
            selectedIndices: lyricCfg.lyrics.map((_, i) => i),
            cachedLyrics: lyricCfg.lyrics,
            artistName: 'Test Artist',
            trackTitle: 'Test Track',
            textAlign: align,
            fontFamily: font,
            fontScale: 'normal',
            trackDurationMs: 240000,
            currentProgressMs: 60000,
            ...bools
          };

          try {
            renderCardContent(ctx, ratio.w, ratio.h, state);
            matrixRenderCount++;
          } catch (e) {
            matrixErrors++;
            console.error(`Render failed for ${ratio.format} / ${lyricCfg.name} / ${align} / ${font}:`, e.message);
          }
        }
      }
    }
  }
}

assertEqual(matrixErrors, 0, `Full combination matrix rendered 0 errors (${matrixRenderCount} configurations tested)`);
assert(matrixRenderCount >= 500, `Matrix render count (${matrixRenderCount}) satisfies extensive permutation testing`);

// 4.2 Defensive state robustness checks
console.log('\n  4.2 Defensive State Robustness Checks:');

const defensiveStates = [
  {
    name: 'Null palette in drawThemeBackground',
    fn: (ctx) => drawThemeBackground(ctx, 1080, 1920, 'classic', null, null, null)
  },
  {
    name: 'Omitted selectedIndices in renderCardContent',
    fn: (ctx) => renderCardContent(ctx, 1080, 1920, {
      theme: 'classic',
      format: 'story',
      palette: ['#ff0000'],
      cachedLyrics: []
      // selectedIndices omitted
    })
  },
  {
    name: 'Omitted palette in renderCardContent',
    fn: (ctx) => renderCardContent(ctx, 1080, 1920, {
      theme: 'classic',
      format: 'story',
      selectedIndices: [],
      cachedLyrics: []
      // palette omitted
    })
  }
];

for (const def of defensiveStates) {
  const { ctx } = createStrictMockContext();
  let defError = false;
  let defErrMsg = '';
  try {
    def.fn(ctx);
  } catch (e) {
    defError = true;
    defErrMsg = e.message;
  }
  assert(!defError, `Defensive check: ${def.name} should not throw (Error: "${defErrMsg}")`);
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`STRESS TEST RESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nSUMMARY OF FAILURES:');
  failures.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
}
console.log('================================================================');

process.exit(failed > 0 ? 1 : 0);
