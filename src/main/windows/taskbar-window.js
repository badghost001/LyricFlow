const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { getHtmlPath, getPreloadPath } = require('../utils/paths');

/**
 * Calculates the bounding rectangle of the Windows taskbar strip across various placements.
 */
function getTaskbarBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { bounds, workArea } = primaryDisplay;

  let x = bounds.x, y = bounds.y + workArea.height;
  let width = bounds.width, height = bounds.height - workArea.height;
  let position = 'bottom';

  if (workArea.y > bounds.y) {
    // Taskbar on top
    y = bounds.y;
    height = workArea.y - bounds.y;
    position = 'top';
  } else if (workArea.x > bounds.x) {
    // Taskbar on left
    x = bounds.x;
    width = workArea.x - bounds.x;
    y = bounds.y;
    height = bounds.height;
    position = 'left';
  } else if (workArea.width < bounds.width) {
    // Taskbar on right
    x = bounds.x + workArea.width;
    width = bounds.width - workArea.width;
    y = bounds.y;
    height = bounds.height;
    position = 'right';
  }

  if (height <= 0 || width <= 0) {
    // Auto-hide fallback
    height = 48;
    width = bounds.width;
    y = bounds.height - 48;
    x = bounds.x;
    position = 'bottom';
  }

  return { x, y, width, height, position };
}

/**
 * Creates the transparent overlay window docked directly on the Windows Taskbar.
 */
function createTaskbarWindow(context) {
  if (context.taskbarWindow && !context.taskbarWindow.isDestroyed()) return;

  const strip = getTaskbarBounds();

  const taskbarWin = new BrowserWindow({
    x: strip.x,
    y: strip.y,
    width: strip.width,
    height: strip.height,
    frame: false,
    transparent: true,
    resizable: false,
    thickFrame: false,
    type: 'toolbar',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    movable: false,
    webPreferences: {
      preload: getPreloadPath('preload_taskbar.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  context.taskbarWindow = taskbarWin;

  taskbarWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  taskbarWin.webContents.on('will-navigate', (e) => e.preventDefault());

  taskbarWin.loadFile(getHtmlPath('taskbar.html'));
  taskbarWin.setAlwaysOnTop(true, 'screen-saver');

  taskbarWin.webContents.once('did-finish-load', () => {
    if (taskbarWin && !taskbarWin.isDestroyed()) {
      // Start in click-through mode — clicks pass through to taskbar.
      // forward:true ensures mousemove still reaches the renderer to detect hover over lyric text.
      taskbarWin.setIgnoreMouseEvents(true, { forward: true });
      taskbarWin.webContents.send('sync-taskbar-config', {
        position: strip.position,
        lyricOffsetX: context.lastTaskbarOffset
      });
    }
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      context.mainWindow.webContents.send('taskbar-mode-ready');
    }
  });

  taskbarWin.on('closed', () => {
    if (context.taskbarWindow === taskbarWin) {
      context.taskbarWindow = null;
    }
  });
}

/**
 * Applies layout bounds to the taskbar window.
 */
function applyTaskbarWindowLayout(context, layout) {
  if (!context.taskbarWindow || context.taskbarWindow.isDestroyed()) return;
  const strip = getTaskbarBounds();
  try {
    context.taskbarWindow.setBounds({ x: strip.x, y: strip.y, width: strip.width, height: strip.height });
    context.taskbarWindow.webContents.send('sync-taskbar-config', { position: strip.position });
  } catch (err) {
    console.error('[TaskbarWindow] Failed to set taskbarWindow bounds:', err);
  }
}

/**
 * Adjusts focus and mouse event capture depending on fullscreen mode.
 */
function applyTaskbarInteractionMode(context) {
  if (!context.taskbarWindow || context.taskbarWindow.isDestroyed() || !context.isTaskbarMode) return;
  if (context.fullscreenLyricsEnabled) {
    context.taskbarWindow.setFocusable(false);
    context.taskbarWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    context.taskbarWindow.setFocusable(true);
    context.taskbarWindow.setIgnoreMouseEvents(false);
  }
}

/**
 * Destroys the taskbar overlay window cleanly.
 */
function destroyTaskbarWindow(context) {
  if (context.taskbarWindow && !context.taskbarWindow.isDestroyed()) {
    context.taskbarWindow.close();
  }
  context.taskbarWindow = null;
}

module.exports = {
  getTaskbarBounds,
  createTaskbarWindow,
  applyTaskbarWindowLayout,
  applyTaskbarInteractionMode,
  destroyTaskbarWindow
};
