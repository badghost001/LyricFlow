/**
 * Unit Tests for Dynamic Island 3rd Panel (Duet Capsule) Pause Pull-In & Auto-Hide
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

function runPausePullInTests() {
  console.log('\n--- Running Dynamic Island 3rd Panel Pause Pull-In Tests ---\n');

  const cssPath = path.join(__dirname, '..', 'src', 'styles', '_dynamic_island.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  const rendererPath = path.join(__dirname, '..', 'src', 'renderer.js');
  const rendererContent = fs.readFileSync(rendererPath, 'utf8');

  // Test 1: CSS rules hide duet capsule and bridge on app-paused, not is-playing, and is-idle
  test('1. _dynamic_island.css defines paused and idle auto-hide for duet capsule and bridge', () => {
    assert(cssContent.includes('.island-duet-capsule:not(.duet-fusing)'), 'Missing :not(.duet-fusing) on duet capsule pause selector');
    assert(cssContent.includes('.island-duet-bridge:not(.bridge-fusing)'), 'Missing :not(.bridge-fusing) on duet bridge pause selector');
    assert(cssContent.includes('body.mode-dynamic-island.app-paused .island-duet-capsule:not(.duet-fusing)'), 'Missing app-paused duet capsule selector');
    assert(cssContent.includes('body.mode-dynamic-island:not(.is-playing) .island-duet-capsule:not(.duet-fusing)'), 'Missing :not(.is-playing) duet capsule selector');
    assert(cssContent.includes('body.mode-dynamic-island.is-idle .island-duet-capsule:not(.duet-fusing)'), 'Missing is-idle duet capsule selector');
  });

  // Test 2: CSS guards active duet capsule with playback state
  test('2. _dynamic_island.css guards has-duet-active with :not(.app-paused):not(.is-idle).is-playing', () => {
    assert(cssContent.includes('body.mode-dynamic-island.has-duet-active:not(.app-paused):not(.is-idle).is-playing .island-duet-capsule'),
      'Missing active playback state guard on duet capsule display: flex rule');
    assert(cssContent.includes('body.mode-dynamic-island.has-duet-active:not(.app-paused):not(.is-idle).is-playing .island-duet-bridge'),
      'Missing active playback state guard on duet bridge display: block rule');
  });

  // Test 3: syncDynamicIslandState pulls in or dismisses duet capsule when music stops/pauses
  test('3. renderer.js syncDynamicIslandState pulls in duet capsule when music stops/pauses', () => {
    assert(rendererContent.includes('if (lastDuetActiveState || document.body.classList.contains(\'has-duet-active\')) {'),
      'syncDynamicIslandState should check lastDuetActiveState or has-duet-active class');
    assert(rendererContent.includes('hideDuetCapsule(true);'),
      'syncDynamicIslandState should call hideDuetCapsule(true) to trigger liquid pull-in');
    assert(rendererContent.includes('document.body.classList.remove(\'has-duet-active\');'),
      'renderer.js should remove has-duet-active when dismissing duet capsule');
  });

  // Test 4: showDuetCapsule aborts and hides if music is paused or stopped
  test('4. renderer.js showDuetCapsule guards against paused or stopped playback', () => {
    const showDuetMatch = rendererContent.match(/function showDuetCapsule\s*\([^\)]*\)\s*\{([\s\S]*?)pushDynamicIslandBounds/);
    assert(showDuetMatch, 'showDuetCapsule function body not found');
    const body = showDuetMatch[1];
    assert(body.includes('!isPlaying') && body.includes('app-paused'),
      'showDuetCapsule must guard against !isPlaying and app-paused');
  });

  // Test 5: updateDynamicIslandLyric calculates isDuetEligible requiring isPlayingActive and !app-paused
  test('5. renderer.js updateDynamicIslandLyric requires isPlayingActive and !app-paused for duet eligibility', () => {
    assert(rendererContent.includes('isDuetEligible'), 'Missing isDuetEligible check in updateDynamicIslandLyric');
    assert(rendererContent.includes('!document.body.classList.contains(\'app-paused\')'),
      'isDuetEligible must check for !app-paused class');
    assert(rendererContent.includes('isPlayingActive'),
      'isDuetEligible must check for isPlayingActive');
  });

  // Test 6: hideDuetCapsule removes has-duet-active class on early exit and non-fuse cleanup
  test('6. renderer.js hideDuetCapsule guarantees has-duet-active class removal', () => {
    const hideDuetMatch = rendererContent.match(/function hideDuetCapsule\s*\([^\)]*\)\s*\{([\s\S]*?)function getWallpaperLyricsElement/);
    assert(hideDuetMatch, 'hideDuetCapsule function body not found');
    const body = hideDuetMatch[1];
    assert(body.includes('document.body.classList.remove(\'has-duet-active\')'),
      'hideDuetCapsule must remove has-duet-active');
  });

  // Test 7: Track reset in renderer.js clears duet capsule, bridge, and text elements
  test('7. renderer.js track change handler explicitly resets duet DOM and classes', () => {
    assert(rendererContent.includes('const duetCap = document.getElementById("island-duet-capsule");'),
      'Track reset should look up island-duet-capsule');
    assert(rendererContent.includes('duetCap.classList.remove(\'island-vaporizing\', \'island-materializing\', \'duet-fusing\');'),
      'Track reset should clear duet animation classes');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPausePullInTests();
