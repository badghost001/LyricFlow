/**
 * Unit & Integration Tests: Loading UI Modernization & Facelift
 * Validates startup screen components, CSS animations, and lyric skeleton shimmer loader.
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

function runLoadingUITests() {
  console.log('\n--- Running Loading UI Facelift Test Suite ---\n');

  const indexPath = path.join(__dirname, '../src/index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  const componentsCssPath = path.join(__dirname, '../src/styles/_components.css');
  const componentsCss = fs.readFileSync(componentsCssPath, 'utf8');

  const lyricsCssPath = path.join(__dirname, '../src/styles/_lyrics.css');
  const lyricsCss = fs.readFileSync(lyricsCssPath, 'utf8');

  const rendererPath = path.join(__dirname, '../src/renderer.js');
  const rendererJs = fs.readFileSync(rendererPath, 'utf8');

  // 1. Startup DOM Structure Tests
  test('1a. Startup screen contains ambient aurora glow element', () => {
    assert.ok(indexHtml.includes('class="loading-aurora-glow"'), 'loading-aurora-glow element must exist in index.html');
  });

  test('1b. Startup screen contains dual acoustic ripple rings', () => {
    assert.ok(indexHtml.includes('class="loading-pulse-ring"'), 'loading-pulse-ring must exist');
    assert.ok(indexHtml.includes('class="loading-pulse-ring-outer"'), 'loading-pulse-ring-outer must exist for concentric ripple');
  });

  test('1c. Startup screen contains structured status pill with pulsing live dot', () => {
    assert.ok(indexHtml.includes('class="loading-status-pill"'), 'loading-status-pill wrapper must exist');
    assert.ok(indexHtml.includes('class="loading-status-dot"'), 'loading-status-dot element must exist');
    assert.ok(indexHtml.includes('id="loading-status-text"'), 'loading-status-text element must exist');
  });

  test('1d. Startup screen retains progress track and bar elements', () => {
    assert.ok(indexHtml.includes('class="loading-progress-track"'), 'loading-progress-track must exist');
    assert.ok(indexHtml.includes('id="loading-progress-bar"'), 'loading-progress-bar must exist');
  });

  // 2. CSS Styling & Animation Tests
  test('2a. Components CSS defines ambient aurora keyframes and frosted glass card', () => {
    assert.ok(componentsCss.includes('.loading-aurora-glow'), '.loading-aurora-glow style must be defined');
    assert.ok(componentsCss.includes('@keyframes loadingAuroraPulse'), 'loadingAuroraPulse keyframes must exist');
    assert.ok(componentsCss.includes('.loading-card'), '.loading-card style must exist');
    assert.ok(componentsCss.includes('.loading-status-pill'), '.loading-status-pill style must exist');
    assert.ok(componentsCss.includes('@keyframes loadingShimmerSweep'), 'loadingShimmerSweep keyframes must exist');
  });

  test('2b. Lyrics CSS defines Apple Music-style skeleton loader and light wave keyframes', () => {
    assert.ok(lyricsCss.includes('.lyrics-skeleton-container'), '.lyrics-skeleton-container style must be defined');
    assert.ok(lyricsCss.includes('.lyrics-skeleton-line'), '.lyrics-skeleton-line style must be defined');
    assert.ok(lyricsCss.includes('@keyframes skeletonWave'), 'skeletonWave keyframes must exist');
    assert.ok(lyricsCss.includes('@keyframes skeletonFadeIn'), 'skeletonFadeIn keyframes must exist');
  });

  // 3. Renderer Skeleton Function & DOM Injection
  test('3a. renderer.js defines renderLyricsSkeleton function', () => {
    assert.ok(rendererJs.includes('function renderLyricsSkeleton()'), 'renderLyricsSkeleton must be defined in renderer.js');
  });

  test('3b. renderLyricsSkeleton outputs staggered rounded capsule lines', () => {
    // Extract function and execute in sandbox
    const match = rendererJs.match(/function renderLyricsSkeleton\(\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(match, 'renderLyricsSkeleton function body must be parseable');
    const fn = new Function(match[1]);
    const html = fn();

    assert.ok(html.includes('class="lyrics-skeleton-container"'), 'Output must wrap in lyrics-skeleton-container');
    const lineMatches = html.match(/class="lyrics-skeleton-line"/g) || [];
    assert.ok(lineMatches.length >= 4, `Must generate at least 4 staggered skeleton lines (found ${lineMatches.length})`);
    assert.ok(html.includes('animation-delay:'), 'Skeleton lines must have staggered animation delays');
  });

  test('3c. handlePlaybackData injects skeleton loader on track change', () => {
    assert.ok(rendererJs.includes('lyricsContainer.innerHTML = renderLyricsSkeleton();'), 'handlePlaybackData must inject renderLyricsSkeleton()');
    assert.ok(rendererJs.includes("tbLyricLine.textContent = \"Loading lyrics...\";"), 'Taskbar text must be preserved');
  });

  // 4. Progress Text Cross-Fade Transition
  test('4a. setLoadingProgress applies updating class for smooth cross-fade', () => {
    assert.ok(rendererJs.includes('statusText.classList.add("updating")'), 'setLoadingProgress must add updating class on text change');
    assert.ok(rendererJs.includes('statusText.classList.remove("updating")'), 'setLoadingProgress must remove updating class after animation timeout');
  });

  console.log(`Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runLoadingUITests();
