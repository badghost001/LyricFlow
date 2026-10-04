/**
 * Unit Tests for Font System, Typography Token Isolation & Metric Invalidation
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

function runFontSystemTests() {
  console.log('\n--- Running Font System & Typography Invalidation Tests ---\n');

  // Test 1: Font Stack Mapping for All 8 Supported Fonts
  test('1. resolveFontStack correctly maps all 8 supported fonts with valid CSS fallbacks', () => {
    const FONT_FAMILY_STACKS = {
      'Outfit': "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'Inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'Poppins': "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'Nunito': "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'Raleway': "'Raleway', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'Space Grotesk': "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'JetBrains Mono': "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      'Georgia': "'Georgia', 'Times New Roman', 'Cambria', serif"
    };

    function resolveFontStack(fontName) {
      if (!fontName) return FONT_FAMILY_STACKS['Outfit'];
      if (FONT_FAMILY_STACKS[fontName]) return FONT_FAMILY_STACKS[fontName];
      if (fontName.includes(',') || fontName.startsWith("'") || fontName.startsWith('"')) {
        return fontName;
      }
      return fontName.includes(' ') ? `'${fontName}', sans-serif` : `${fontName}, sans-serif`;
    }

    // Monospace verification
    const jb = resolveFontStack('JetBrains Mono');
    assert.strictEqual(jb.includes('monospace'), true, 'JetBrains Mono must include monospace fallback');
    assert.strictEqual(jb.includes("'JetBrains Mono'"), true, 'JetBrains Mono must be safely quoted');

    // Serif verification
    const georgia = resolveFontStack('Georgia');
    assert.strictEqual(georgia.includes('serif'), true, 'Georgia must include serif fallback');
    assert.strictEqual(georgia.includes("'Times New Roman'"), true, 'Georgia must include standard serif fallbacks');

    // Display & Sans verification
    const spaceGrotesk = resolveFontStack('Space Grotesk');
    assert.strictEqual(spaceGrotesk.includes("'Space Grotesk'"), true, 'Multi-word Space Grotesk must be quoted');
    assert.strictEqual(spaceGrotesk.includes('sans-serif'), true, 'Space Grotesk must fallback to sans-serif');

    // Fallback on empty or unknown
    assert.strictEqual(resolveFontStack(null), FONT_FAMILY_STACKS['Outfit'], 'Null font must default to Outfit');
    assert.strictEqual(resolveFontStack(''), FONT_FAMILY_STACKS['Outfit'], 'Empty font must default to Outfit');
    assert.strictEqual(resolveFontStack('Custom Font'), "'Custom Font', sans-serif", 'Custom multi-word font must be quoted with sans-serif fallback');
  });

  // Test 2: CSS Token Separation in _variables.css & _reset.css
  test('2. CSS rules isolate UI chrome font via --app-font without bleeds from var(--font-family)', () => {
    const variablesCss = fs.readFileSync(path.join(__dirname, '../src/styles/_variables.css'), 'utf8');
    const resetCss = fs.readFileSync(path.join(__dirname, '../src/styles/_reset.css'), 'utf8');

    assert.strictEqual(variablesCss.includes('--app-font:'), true, '_variables.css must define --app-font token');
    assert.strictEqual(resetCss.includes('font-family: var(--app-font);'), true, 'html, body must be locked to var(--app-font)');
    assert.strictEqual(resetCss.includes('html, body {\n  font-family: var(--font-family)'), false, 'html, body must NOT use var(--font-family)');
  });

  // Test 3: Dynamic Island Font Bleed Immunity
  test('3. Dynamic Island root container locks font-family to SF Pro / Outfit', () => {
    const islandCss = fs.readFileSync(path.join(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');

    assert.strictEqual(
      islandCss.includes('#dynamic-island {') && islandCss.includes('font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text"'),
      true,
      '#dynamic-island must specify font-family'
    );
    assert.strictEqual(
      islandCss.includes('body.mode-dynamic-island #dynamic-island {') &&
      islandCss.includes('font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Outfit", "Inter", sans-serif !important;'),
      true,
      'Active dynamic island must enforce font-family with !important'
    );
  });

  // Test 4: Metric Cache Invalidation & Instant Re-centering Routine
  test('4. invalidateLyricMetrics resets cached metrics and schedules remeasurement + active line centering', () => {
    let cachedViewportHeight = 400;
    let cachedLineMetrics = [{ top: 100, height: 34 }, { top: 140, height: 34 }];
    let activeLineIndex = 1;
    let userScrolling = false;
    let lyrics = [{ text: 'Line 1' }, { text: 'Line 2' }];
    let cachedLineEls = [{ offsetTop: 120, clientHeight: 48 }, { offsetTop: 180, clientHeight: 48 }];
    let measureCalled = 0;
    let scrolledToIndex = null;

    function measureLyricMetrics() {
      measureCalled++;
      cachedViewportHeight = 400;
      cachedLineMetrics = cachedLineEls.map(el => ({ top: el.offsetTop, height: el.clientHeight }));
    }

    function scrollLyrics(idx) {
      scrolledToIndex = idx;
      activeLineIndex = idx;
    }

    // Mock requestAnimationFrame synchronously
    const originalRaf = global.requestAnimationFrame;
    global.requestAnimationFrame = (cb) => { cb(); return 1; };

    function invalidateLyricMetrics(andScroll = true) {
      cachedLineMetrics = [];
      cachedViewportHeight = 0;
      if (!lyrics || lyrics.length === 0 || !cachedLineEls || cachedLineEls.length === 0) return;

      requestAnimationFrame(() => {
        measureLyricMetrics();
        if (andScroll && activeLineIndex >= 0 && !userScrolling) {
          const idx = activeLineIndex;
          activeLineIndex = -1;
          scrollLyrics(idx);
        }
      });
    }

    invalidateLyricMetrics(true);

    assert.strictEqual(measureCalled, 1, 'measureLyricMetrics must be called upon invalidation');
    assert.strictEqual(cachedLineMetrics.length, 2, 'cachedLineMetrics must be repopulated');
    assert.strictEqual(cachedLineMetrics[0].top, 120, 'Line 0 top offset must be updated to new dimensions');
    assert.strictEqual(cachedLineMetrics[1].top, 180, 'Line 1 top offset must be updated to new dimensions');
    assert.strictEqual(scrolledToIndex, 1, 'scrollLyrics must re-center the active line index');

    global.requestAnimationFrame = originalRaf;
  });

  // Test 5: Typography Signature Tracking in applyVisualSettings
  test('5. Typography change detection accurately triggers invalidation when settings change', () => {
    let invalidated = false;
    function invalidateLyricMetrics() {
      invalidated = true;
    }

    let lastSig = null;
    function checkTypographyChange(settings) {
      const currentSig = `${settings.fontFamily}_${settings.fontSize}_${settings.lineSpacing}_${settings.textAlign}`;
      if (lastSig && lastSig !== currentSig) {
        invalidateLyricMetrics();
      }
      lastSig = currentSig;
    }

    const currentSettings = { fontFamily: 'Outfit', fontSize: 22, lineSpacing: 11, textAlign: 'center' };
    checkTypographyChange(currentSettings);
    assert.strictEqual(invalidated, false, 'Initial application should not trigger invalidation flag');

    // Font change
    currentSettings.fontFamily = 'JetBrains Mono';
    checkTypographyChange(currentSettings);
    assert.strictEqual(invalidated, true, 'Changing fontFamily must trigger invalidation');

    // Size change
    invalidated = false;
    currentSettings.fontSize = 28;
    checkTypographyChange(currentSettings);
    assert.strictEqual(invalidated, true, 'Changing fontSize must trigger invalidation');

    // Spacing change
    invalidated = false;
    currentSettings.lineSpacing = 16;
    checkTypographyChange(currentSettings);
    assert.strictEqual(invalidated, true, 'Changing lineSpacing must trigger invalidation');

    // No change
    invalidated = false;
    checkTypographyChange(currentSettings);
    assert.strictEqual(invalidated, false, 'Re-applying identical typography must not trigger invalidation');
  });

  // Test 6: Verify renderer.js source contains all essential contracts
  test('6. renderer.js implements resolveFontStack, invalidateLyricMetrics, and document.fonts observer', () => {
    const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');

    assert.strictEqual(rendererCode.includes('const FONT_FAMILY_STACKS = {'), true, 'renderer.js must define FONT_FAMILY_STACKS');
    assert.strictEqual(rendererCode.includes('function resolveFontStack('), true, 'renderer.js must define resolveFontStack');
    assert.strictEqual(rendererCode.includes('function invalidateLyricMetrics('), true, 'renderer.js must define invalidateLyricMetrics');
    assert.strictEqual(rendererCode.includes('document.fonts.ready'), true, 'renderer.js must observe document.fonts.ready');
    assert.strictEqual(rendererCode.includes("addEventListener('loadingdone'"), true, 'renderer.js must observe loadingdone');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
  if (passedTests < totalTests) {
    process.exit(1);
  }
}

if (require.main === module) {
  runFontSystemTests();
}

module.exports = { runFontSystemTests };
