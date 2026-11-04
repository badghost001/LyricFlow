/**
 * Unit & Integration Tests: Taskbar Minimal & Glass Presentation Styles,
 * Hover Controls, Adaptive Safe-Zone Clamping, and IPC Synchronization.
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

function runTaskbarPresentationTests() {
  console.log('\n--- Running Taskbar Minimal/Glass Presentation & Controls Tests ---\n');

  const taskbarHtmlPath = path.resolve(__dirname, '../src/taskbar.html');
  const taskbarRendererPath = path.resolve(__dirname, '../src/taskbar_renderer.js');
  const rendererPath = path.resolve(__dirname, '../src/renderer.js');
  const indexPath = path.resolve(__dirname, '../src/index.html');
  const bridgePath = path.resolve(__dirname, '../src/tauri-bridge.js');

  const taskbarHtml = fs.readFileSync(taskbarHtmlPath, 'utf8');
  const taskbarRendererJs = fs.readFileSync(taskbarRendererPath, 'utf8');
  const rendererJs = fs.readFileSync(rendererPath, 'utf8');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  const bridgeJs = fs.readFileSync(bridgePath, 'utf8');

  // ── 1. HTML Markup & Styles ──
  test('1. taskbar.html default classes specify style-minimal on body and #tb-container', () => {
    assert.ok(taskbarHtml.includes('<body class="pos-bottom style-minimal"'), 'Body must default to style-minimal');
    assert.ok(taskbarHtml.includes('id="tb-container" class="style-minimal"'), '#tb-container must have style-minimal class');
  });

  test('2. taskbar.html defines clean Minimal presentation with transparent background', () => {
    const minimalRule = taskbarHtml.match(/\.style-minimal\s*#tb-container[^\{]*\{([^}]+)\}/);
    assert.ok(minimalRule, '.style-minimal #tb-container rule must exist in taskbar.html');
    assert.ok(minimalRule[1].includes('background: transparent;'), 'Minimal style must have transparent background');
    assert.ok(minimalRule[1].includes('box-shadow: none;'), 'Minimal style must have no box shadow');
  });

  test('3. taskbar.html defines Glass presentation with acrylic blur and subtle border', () => {
    const glassRule = taskbarHtml.match(/\.style-glass\s*#tb-container[^\{]*\{([^}]+)\}/);
    assert.ok(glassRule, '.style-glass #tb-container rule must exist in taskbar.html');
    assert.ok(glassRule[1].includes('backdrop-filter: blur('), 'Glass style must have backdrop-filter blur');
    assert.ok(glassRule[1].includes('border: 1px solid'), 'Glass style must have subtle border');
  });

  test('4. taskbar.html contains #tb-controls with previous, play/pause, and next buttons', () => {
    assert.ok(taskbarHtml.includes('id="tb-controls"'), '#tb-controls container must exist');
    assert.ok(taskbarHtml.includes('id="tb-btn-prev"'), '#tb-btn-prev must exist');
    assert.ok(taskbarHtml.includes('id="tb-btn-play"'), '#tb-btn-play must exist');
    assert.ok(taskbarHtml.includes('id="tb-btn-next"'), '#tb-btn-next must exist');
    assert.ok(taskbarHtml.includes('id="tb-icon-play"'), '#tb-icon-play SVG must exist');
    assert.ok(taskbarHtml.includes('id="tb-icon-pause"'), '#tb-icon-pause SVG must exist');
  });

  test('5. taskbar.html reveals playback controls smoothly on container hover', () => {
    const hoverRule = taskbarHtml.match(/#tb-container:hover\s*#tb-controls[^\{]*\{([^}]+)\}/);
    assert.ok(hoverRule, '#tb-container:hover #tb-controls rule must exist');
    assert.ok(hoverRule[1].includes('width: 74px;'), 'Hover rule must expand width to 74px');
    assert.ok(hoverRule[1].includes('opacity: 1;'), 'Hover rule must set opacity to 1');
    assert.ok(hoverRule[1].includes('pointer-events: auto;'), 'Hover rule must enable pointer-events');
  });

  test('6. taskbar.html active word accent uses green variable --tb-accent', () => {
    const activeWordRule = taskbarHtml.match(/\.tb-lyric-word\.lyric-word-active\s*\{([^}]+)\}/);
    assert.ok(activeWordRule, '.lyric-word-active rule must exist');
    assert.ok(activeWordRule[1].includes('var(--tb-accent, #1DB954)'), 'Active word must use --tb-accent variable');
  });

  // ── 2. Taskbar Renderer Logic ──
  test('7. taskbar_renderer.js exports setPresentationStyle supporting minimal and glass', () => {
    assert.ok(taskbarRendererJs.includes('function setPresentationStyle(style)'), 'setPresentationStyle function must exist');
    assert.ok(taskbarRendererJs.includes("'tb_presentation_style'"), 'Presentation style must persist in localStorage');
  });

  test('8. taskbar_renderer.js clamps lyric offset to prevent overlapping Start button or System Tray', () => {
    assert.ok(taskbarRendererJs.includes('const maxOffset = Math.max(20, Math.floor((screenW / 2) - 220));'), 'Horizontal offset must leave at least 220px margin');
    assert.ok(taskbarRendererJs.includes('lyricOffsetX = Math.max(-maxOffset, Math.min(maxOffset, lyricOffsetX));'), 'lyricOffsetX must be clamped within safe bounds');
  });

  test('9. taskbar_renderer.js deduplicates reportBounds IPC to minimize rendering overhead', () => {
    assert.ok(taskbarRendererJs.includes('lastReportedBounds'), 'lastReportedBounds cache variable must exist');
    assert.ok(taskbarRendererJs.includes('lastReportedBounds.x === nextBounds.x'), 'reportBounds must compare previous coordinates before emitting');
  });

  test('10. taskbar_renderer.js handles isPlaying update from main process', () => {
    assert.ok(taskbarRendererJs.includes('function updatePlayState(isPlaying)'), 'updatePlayState function must exist');
    assert.ok(taskbarRendererJs.includes('iconPlay.style.display = isPlaying ? \'none\' : \'block\';'), 'Play icon toggles based on isPlaying');
    assert.ok(taskbarRendererJs.includes('iconPause.style.display = isPlaying ? \'block\' : \'none\';'), 'Pause icon toggles based on isPlaying');
  });

  test('11. taskbar_renderer.js stops propagation on control clicks to avoid unwanted drag or double-click restore', () => {
    assert.ok(taskbarRendererJs.includes('btnPrev.addEventListener(\'click\''), 'btnPrev click handler must exist');
    assert.ok(taskbarRendererJs.includes('e.stopPropagation();'), 'Event propagation must be stopped on button clicks');
  });

  // ── 3. Settings UI & Renderer Integration ──
  test('12. index.html contains Presentation Style segmented bar in Taskbar Mode settings', () => {
    assert.ok(indexHtml.includes('id="setting-taskbar-style-row"'), 'Taskbar style settings row must exist');
    assert.ok(indexHtml.includes('data-target="select-taskbar-style"'), 'liquid-glass-bar must target select-taskbar-style');
    assert.ok(indexHtml.includes('id="select-taskbar-style"'), 'select-taskbar-style element must exist');
    assert.ok(indexHtml.includes('value="minimal"'), 'Minimal option must exist');
    assert.ok(indexHtml.includes('value="glass"'), 'Glass option must exist');
  });

  test('13. renderer.js initializes settings.taskbarStyle = "minimal" by default', () => {
    assert.ok(rendererJs.includes("taskbarStyle: 'minimal'"), "Default settings must define taskbarStyle: 'minimal'");
  });

  test('14. renderer.js binds selectTaskbarStyle and synchronizes changes to taskbar window', () => {
    assert.ok(rendererJs.includes('if (selectTaskbarStyle)'), 'selectTaskbarStyle listener must exist');
    assert.ok(rendererJs.includes('settings.taskbarStyle = e.target.value;'), 'Listener must update settings.taskbarStyle');
    assert.ok(rendererJs.includes('window.electronAPI.syncTaskbarConfig({'), 'Listener must call syncTaskbarConfig');
  });

  test('15. renderer.js sends isPlaying state in sendTaskbarLyric and sendTaskbarProgress', () => {
    assert.ok(rendererJs.includes('window.electronAPI.updateTaskbarLyric({ text, hidden, html, wordStates, isPlaying });'), 'sendTaskbarLyric must include isPlaying');
    assert.ok(rendererJs.includes('window.electronAPI.updateTaskbarLyric({ progress: pct, isPlaying });'), 'sendTaskbarProgress must include isPlaying');
  });

  test('16. tauri-bridge.js exposes nextTrack and prevTrack for taskbar controls', () => {
    assert.ok(bridgeJs.includes("nextTrack: () => safeInvoke('trigger_playback_control', { action: 'next'"), 'nextTrack bridge method must exist');
    assert.ok(bridgeJs.includes("prevTrack: () => safeInvoke('trigger_playback_control', { action: 'previous'"), 'prevTrack bridge method must exist');
  });

  console.log(`\nTaskbar Presentation Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTaskbarPresentationTests();
}

module.exports = { runTaskbarPresentationTests };
