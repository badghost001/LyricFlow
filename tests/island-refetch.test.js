/**
 * Unit Tests for Dynamic Island Lyrics Refetch Feature
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

function runIslandRefetchTests() {
  console.log('\n--- Running Dynamic Island Lyrics Refetch Tests ---\n');

  const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');
  const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');

  // Test 1: DOM Markup contains #island-btn-refetch in island-top-actions
  test('1. #island-btn-refetch exists in index.html inside .island-top-actions', () => {
    assert.ok(html.includes('id="island-btn-refetch"'), 'Must contain id="island-btn-refetch"');
    const actionsIdx = html.indexOf('class="island-top-actions"');
    const refetchIdx = html.indexOf('id="island-btn-refetch"');
    const transIdx = html.indexOf('id="island-btn-translate"');
    assert.ok(actionsIdx !== -1 && refetchIdx > actionsIdx, 'island-btn-refetch must be inside island-top-actions');
    assert.ok(refetchIdx < transIdx, 'island-btn-refetch should precede island-btn-translate');
    assert.ok(html.includes('class="reload-icon"'), 'island-btn-refetch must contain an SVG with reload-icon class');
  });

  // Test 2: CSS visibility rules hide button in compact view and reveal on hover
  test('2. CSS rules hide #island-btn-refetch by default and show it on #dynamic-island:hover', () => {
    assert.ok(css.includes('#dynamic-island .island-top-actions #island-btn-refetch'), 'Must have default hide rule for island-btn-refetch');
    assert.ok(css.includes('#dynamic-island:hover .island-top-actions #island-btn-refetch'), 'Must have hover show rule for island-btn-refetch');
  });

  // Test 3: CSS styling for .island-btn.island-btn-refetch
  test('3. CSS defines .island-btn.island-btn-refetch styles and spin animation', () => {
    assert.ok(css.includes('.island-btn.island-btn-refetch {'), 'Must style .island-btn.island-btn-refetch');
    assert.ok(css.includes('.island-btn.island-btn-refetch .reload-icon.rotating'), 'Must define spinning animation for rotating reload icon');
  });

  // Test 4: renderer.js binds click listener to #island-btn-refetch
  test('4. renderer.js binds click listener to #island-btn-refetch calling cycleAlternativeLyrics()', () => {
    assert.ok(renderer.includes('islandBtnRefetch.addEventListener("click"'), 'Must bind click to islandBtnRefetch');
    assert.ok(renderer.includes('cycleAlternativeLyrics()'), 'Must call cycleAlternativeLyrics');
  });

  // Test 5: renderer.js binds contextmenu on dynamicIslandEl
  test('5. renderer.js binds right-click (contextmenu) on dynamicIslandEl to cycleAlternativeLyrics()', () => {
    assert.ok(renderer.includes('dynamicIslandEl.addEventListener("contextmenu"'), 'Must bind contextmenu on dynamicIslandEl');
  });

  // Test 6: renderer.js binds click on islandStage when lyrics are empty
  test('6. renderer.js binds click on islandStage when lyrics are missing to cycleAlternativeLyrics()', () => {
    assert.ok(renderer.includes('islandStage.addEventListener("click"'), 'Must bind click on islandStage for empty lyrics state');
  });

  // Test 7: cycleAlternativeLyrics provides instant HUD feedback in Dynamic Island mode
  test('7. cycleAlternativeLyrics provides showIslandHud feedback in Dynamic Island mode', () => {
    assert.ok(renderer.includes('showIslandHud({ icon: "↻"'), 'Must show refetch HUD on island');
    assert.ok(renderer.includes('showIslandHud({ icon: "⚠️"'), 'Must show warning HUD on island when failed or no track');
  });

  // Test 8: updateDynamicIslandLyric displays hint when no lyrics exist
  test('8. updateDynamicIslandLyric formats no-lyrics hint and click instruction', () => {
    assert.ok(renderer.includes('island-no-lyrics-hint'), 'Must include island-no-lyrics-hint class');
    assert.ok(renderer.includes('No lyrics (Click ↻)'), 'Must prompt user to click refetch in idle line');
    assert.ok(renderer.includes('No lyrics found (Click ↻ to refetch)'), 'Must prompt user to click refetch in stage lyric');
  });

  // Test 9: index.html shortcuts list includes Refetch / Alternative Lyrics
  test('9. index.html shortcuts table documents Refetch / Alternative Lyrics shortcut', () => {
    assert.ok(html.includes('Refetch / Alternative Lyrics'), 'Must include shortcut row in settings');
    assert.ok(html.includes('Ctrl + R / F5'), 'Must list Ctrl + R / F5 keybinding');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runIslandRefetchTests();
