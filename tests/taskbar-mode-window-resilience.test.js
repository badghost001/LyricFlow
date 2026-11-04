const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('\n--- Running Taskbar Mode Window Resilience Tests ---');

// 1. Verify tauri.conf.json window declarations
const tauriConfRaw = fs.readFileSync(path.join(__dirname, '../src-tauri/tauri.conf.json'), 'utf8');
const tauriConf = JSON.parse(tauriConfRaw);

const mainWinConf = tauriConf.app.windows.find(w => w.label === 'main');
const tbWinConf = tauriConf.app.windows.find(w => w.label === 'taskbar');

assert(mainWinConf, 'main window must be configured in tauri.conf.json');
assert.strictEqual(
  mainWinConf.additionalBrowserArgs,
  undefined,
  'main window must not have unique additionalBrowserArgs that conflict with other windows'
);
assert.strictEqual(tbWinConf, undefined, 'taskbar WebView must not be allocated until Taskbar Mode is enabled');

console.log('  ✓ 1. tauri.conf.json windows configured consistently without conflicting browser args');

// 2. Verify window.rs resilience checks
const windowRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/window.rs'), 'utf8');

assert(
  windowRs.includes('WebviewWindowBuilder::new(') &&
    windowRs.includes('"taskbar"') &&
    windowRs.includes('WebviewUrl::App("taskbar.html".into())'),
  'window.rs must create the taskbar WebView on demand'
);

assert(
  windowRs.includes('.inner_size(1920.0, 48.0)') &&
    windowRs.includes('.transparent(true)') &&
    windowRs.includes('.always_on_top(true)') &&
    windowRs.includes('.skip_taskbar(true)'),
  'on-demand taskbar creation must preserve its existing window configuration'
);

assert(
  windowRs.includes('is_healthy') && windowRs.includes('w.hwnd().is_ok()'),
  'window.rs must check whether the existing taskbar window is healthy via hwnd().is_ok()'
);

assert(
  windowRs.includes('Existing taskbar window was unhealthy or closed, destroying it...'),
  'window.rs must destroy unhealthy taskbar window before rebuilding dynamically'
);

assert(
  windowRs.includes('let taskbar_succeeded = tb_win.hwnd().is_ok() || vis;'),
  'window.rs must verify taskbar succeeded before parking main window'
);

assert(
  windowRs.includes('Keeping main window on-screen'),
  'window.rs must keep main window on-screen if taskbar window failed to become ready'
);

console.log('  ✓ 2. window.rs validates window health and safely prevents parking main off-screen if taskbar fails');

// 3. Verify lib.rs intercepts CloseRequested on taskbar
const libRs = fs.readFileSync(path.join(__dirname, '../src-tauri/src/lib.rs'), 'utf8');

assert(
  libRs.includes('else if window.label() == "taskbar"') && libRs.includes('api.prevent_close();'),
  'lib.rs must prevent close on taskbar window and hide it instead'
);

console.log('  ✓ 3. lib.rs prevents destruction of taskbar window on CloseRequested');

// 4. Verify taskbar.html transparent background
const taskbarHtml = fs.readFileSync(path.join(__dirname, '../src/taskbar.html'), 'utf8');

assert(
  taskbarHtml.includes('background: transparent;'),
  'taskbar.html must have background: transparent to avoid black box artifact'
);

console.log('  ✓ 4. taskbar.html defines background: transparent');

console.log('\nTaskbar Mode Window Resilience: 4/4 tests passed.\n');
