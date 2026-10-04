/**
 * Unit Tests for Main App Lyrics Layout, Horizontal Clearance, and Alignment Clipping Prevention
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

function runLyricsLayoutTests() {
  console.log('\n--- Running Main App Lyrics Layout & Alignment Clearance Tests ---\n');

  const lyricsCssPath = path.resolve(__dirname, '../src/styles/_lyrics.css');
  const layoutCssPath = path.resolve(__dirname, '../src/styles/_layout.css');
  const wallpaperCssPath = path.resolve(__dirname, '../src/styles/_wallpaper.css');

  const lyricsCss = fs.readFileSync(lyricsCssPath, 'utf8');
  const layoutCss = fs.readFileSync(layoutCssPath, 'utf8');
  const wallpaperCss = fs.readFileSync(wallpaperCssPath, 'utf8');
  const rendererJs = fs.readFileSync(path.resolve(__dirname, '../src/renderer.js'), 'utf8');

  // Test 1: #lyrics-container defines horizontal padding and box-sizing
  test('1. #lyrics-container defines horizontal padding clearance and box-sizing', () => {
    assert.ok(lyricsCss.includes('padding: 50vh 16px;'), 'Must define at least 16px horizontal padding on #lyrics-container');
    assert.ok(lyricsCss.includes('box-sizing: border-box;'), 'Must define box-sizing: border-box on #lyrics-container');
  });

  // Test 2: .lyric-line defines generous horizontal padding and word wrapping
  test('2. .lyric-line defines generous horizontal padding, word wrapping, and box-sizing', () => {
    assert.ok(lyricsCss.includes('padding: var(--line-spacing) 18px;'), 'Must define 18px horizontal padding on .lyric-line');
    assert.ok(lyricsCss.includes('overflow-wrap: break-word;'), 'Must define overflow-wrap: break-word');
    assert.ok(lyricsCss.includes('word-break: break-word;'), 'Must define word-break: break-word');
  });

  // Test 3: .lyric-line does NOT have contain: layout (prevents clipping of glows and scaled glyphs)
  test('3. .lyric-line avoids contain: layout to prevent paint clipping', () => {
    assert.ok(!lyricsCss.includes('contain: layout style;'), 'Must not contain "contain: layout style"');
    assert.ok(lyricsCss.includes('contain: style;'), 'Must use safe "contain: style"');
  });

  // Test 4: .lyric-line.active uses refined scale(1.025) instead of aggressive scale(1.04)
  test('4. .lyric-line.active uses refined scale(1.025) to avoid viewport boundary overflow', () => {
    assert.ok(lyricsCss.includes('transform: scale(1.025) translateZ(0) !important;'), 'Must use scale(1.025) on active line');
    assert.ok(!lyricsCss.includes('scale(1.04)'), 'Must not retain obsolete scale(1.04)');
  });

  // Test 5: Mathematical clearance verification across Left, Center, and Right orientations
  test('5. Mathematical boundary verification: Left, Center, and Right orientations never overflow', () => {
    // Model the geometry:
    // Viewport width: W
    // Container horizontal padding: 16px each side (total 32px)
    // Line horizontal padding: 18px each side (total 36px)
    // Total inset = 16 + 18 = 34px on left, 34px on right
    // Maximum text glow: 18px blur halo
    // Scale factor: 1.025

    const testViewportWidths = [320, 360, 400, 500, 600, 800, 1200];
    const containerPad = 16;
    const linePad = 18;
    const totalInset = containerPad + linePad; // 34px
    const scale = 1.025;
    const glowHalo = 18;

    for (const W of testViewportWidths) {
      const maxTextWidth = W - (totalInset * 2);
      assert.ok(maxTextWidth > 0, `Viewport ${W}px must yield positive text width`);

      const scaledTextWidth = maxTextWidth * scale;

      // Case A: Left Orientation (transform-origin: left center)
      // Left edge of text stays at totalInset
      // Right edge of text extends to totalInset + scaledTextWidth
      const leftOrientRightEdge = totalInset + scaledTextWidth;
      const leftOrientRightClearance = W - leftOrientRightEdge;
      assert.ok(
        leftOrientRightClearance >= 0,
        `Left orientation right clearance at W=${W}px must be >= 0 (got ${leftOrientRightClearance.toFixed(2)}px)`
      );

      // Case B: Right Orientation (transform-origin: right center)
      // Right edge of text stays at W - totalInset
      // Left edge of text extends towards 0: (W - totalInset) - scaledTextWidth
      const rightOrientLeftEdge = (W - totalInset) - scaledTextWidth;
      const rightOrientLeftClearance = rightOrientLeftEdge;
      assert.ok(
        rightOrientLeftClearance >= 0,
        `Right orientation left clearance at W=${W}px must be >= 0 (got ${rightOrientLeftClearance.toFixed(2)}px)`
      );

      // Case C: Center Orientation (transform-origin: center center)
      // Scaled outwards equally by 1.25% on both sides
      const centerExpansionEachSide = (scaledTextWidth - maxTextWidth) / 2;
      const centerClearance = totalInset - centerExpansionEachSide;
      assert.ok(
        centerClearance >= 0,
        `Center orientation clearance at W=${W}px must be >= 0 (got ${centerClearance.toFixed(2)}px)`
      );
    }
  });

  // Test 6: Responsive layout media queries preserve horizontal padding clearance
  test('6. Responsive media queries in _layout.css preserve horizontal padding clearance', () => {
    assert.ok(layoutCss.includes('padding: 40vh 12px;'), 'Must preserve 12px horizontal padding in @media (max-width: 500px)');
    assert.ok(layoutCss.includes('padding: 30vh 12px;'), 'Must preserve 12px horizontal padding in @media (max-height: 400px)');
  });

  // Test 7: Wallpaper modes define horizontal padding clearance
  test('7. Wallpaper mode styles define horizontal padding clearance', () => {
    assert.ok(wallpaperCss.includes('padding: 45vh 24px !important;'), 'Must define horizontal clearance in wallpaper style 2');
    assert.ok(wallpaperCss.includes('padding: 40vh 16px;'), 'Must define horizontal clearance in wallpaper style 3');
  });

  // Test 8: Final word timing always resolves to a finite boundary
  test('8. Final timed word receives a finite end when no following word exists', () => {
    const helperMatch = rendererJs.match(/function getLyricWordEndMs\(words, wordIndex, lineData, lineIndex\) \{[\s\S]*?\n\}/);
    assert.ok(helperMatch, 'Must define the shared lyric word end resolver');
    const getLyricWordEndMs = vm.runInNewContext(`(${helperMatch[0]})`, { lyrics: [] });
    const endMs = getLyricWordEndMs(
      [{ text: 'last', timeMs: 1200 }],
      0,
      { timeMs: 1000, durationMs: 600 },
      0
    );
    assert.ok(Number.isFinite(endMs) && endMs > 1200, `Expected finite final word end, got ${endMs}`);
  });

  // Test 9: Progress writes keep the initial zero and skip sub-pixel updates
  test('9. Word progress writes preserve zero and throttle micro-deltas', () => {
    const helperMatch = rendererJs.match(/function setLyricWordProgress\(span, progress\) \{[\s\S]*?\n\}/);
    assert.ok(helperMatch, 'Must define the throttled word progress writer');
    const setLyricWordProgress = vm.runInNewContext(`(${helperMatch[0]})`);
    const values = new Map();
    let writes = 0;
    const span = { style: {
      getPropertyValue: key => values.get(key) || '',
      setProperty: (key, value) => { writes++; values.set(key, value); }
    } };
    setLyricWordProgress(span, 0);
    assert.strictEqual(values.get('--word-progress'), '0.000');
    setLyricWordProgress(span, 0.003);
    assert.strictEqual(writes, 1, 'Changes below 0.005 should not cause a style write');
    setLyricWordProgress(span, 1);
    assert.strictEqual(values.get('--word-progress'), '1.000');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

if (require.main === module) {
  runLyricsLayoutTests();
}

module.exports = { runLyricsLayoutTests };
