const { BrowserWindow, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { getConfigPath, getAssetPath, getHtmlPath, getPreloadPath } = require('../utils/paths');
const { destroyTaskbarWindow, applyTaskbarInteractionMode } = require('./taskbar-window');

/**
 * Creates the primary LyricFlow overlay window.
 */
function createMainWindow(context) {
  let bounds = { width: 720, height: 700 };
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (conf.bounds) {
        const primaryDisplay = screen.getPrimaryDisplay();
        if (conf.bounds.width >= primaryDisplay.bounds.width && conf.bounds.height >= primaryDisplay.bounds.height) {
          bounds = { width: 720, height: 700 };
        } else {
          bounds = conf.bounds;
        }
      }
    }
  } catch (e) {
    console.error('[MainWindow] Failed to load bounds:', e);
  }

  const mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    show: false, // Prevents DWM transparent window hitching
    resizable: true,
    hasShadow: false,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: getPreloadPath('preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  context.mainWindow = mainWindow;

  // Reveal window smoothly once painted, with fallback
  let showFallbackTimer = null;
  const revealMainWindow = () => {
    if (showFallbackTimer) {
      clearTimeout(showFallbackTimer);
      showFallbackTimer = null;
    }
    if (mainWindow && !mainWindow.isDestroyed() && !context.isTaskbarMode) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
    }
  };
  mainWindow.once('ready-to-show', revealMainWindow);
  showFallbackTimer = setTimeout(revealMainWindow, 400);

  mainWindow.setIgnoreMouseEvents(false);

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] [Line ${line}] ${message}`);
  });

  mainWindow.loadFile(getHtmlPath('index.html'));

  // Redirect target="_blank" links to default system browser (validated)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (e) => {
    e.preventDefault();
  });

  // Intercept window close: minimize to taskbar in normal mode, hide in taskbar mode
  mainWindow.on('close', (e) => {
    if (!context.forceQuit) {
      e.preventDefault();
      if (context.isTaskbarMode) {
        mainWindow.hide();
      } else {
        mainWindow.setSkipTaskbar(false);
        mainWindow.minimize();
      }
      return;
    }

    // Save bounds on explicit quit
    if (!context.isTaskbarMode && !context.isWallpaperMode) {
      try {
        const primaryDisplay = screen.getPrimaryDisplay();
        const b = mainWindow.getBounds();
        if (b.width < primaryDisplay.bounds.width && b.height < primaryDisplay.bounds.height) {
          const cp = getConfigPath();
          let conf = {};
          if (fs.existsSync(cp)) conf = JSON.parse(fs.readFileSync(cp, 'utf8'));
          conf.bounds = b;
          fs.writeFileSync(cp, JSON.stringify(conf, null, 2), 'utf8');
        }
      } catch (err) {
        console.error('[MainWindow] Failed to save bounds:', err);
      }
    }
  });

  mainWindow.on('closed', () => {
    context.mainWindow = null;
    if (context.restoreInterval) {
      clearInterval(context.restoreInterval);
      context.restoreInterval = null;
    }
    if (context.visibilityInterval) {
      clearInterval(context.visibilityInterval);
      context.visibilityInterval = null;
    }
    if (context.oauthServer) {
      context.oauthServer.close();
      context.oauthServer = null;
    }
  });

  mainWindow.on('focus', () => {
    if (context.isTaskbarMode) {
      mainWindow.setSkipTaskbar(true);
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
  });

  mainWindow.on('blur', () => {
    if (context.isTaskbarMode) {
      mainWindow.setSkipTaskbar(true);
    }
  });

  mainWindow.on('show', () => {
    if (context.isTaskbarMode) {
      mainWindow.setSkipTaskbar(true);
    }
  });

  mainWindow.on('minimize', (event) => {
    if (context.isTaskbarMode) {
      event.preventDefault();

      if (context.restoreInterval) {
        clearInterval(context.restoreInterval);
      }

      context.restoreTicks = 0;
      context.restoreInterval = setInterval(() => {
        if (!context.mainWindow || !context.isTaskbarMode || context.restoreTicks > 10) {
          clearInterval(context.restoreInterval);
          context.restoreInterval = null;
          return;
        }

        context.restoreTicks++;
        context.mainWindow.restore();
      }, 250);
    }
  });

  mainWindow.on('restore', () => {
    if (context.isTaskbarMode) {
      // In taskbar mode, re-hide immediately — the main window should stay hidden.
      applyTaskbarInteractionMode(context);
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.setSkipTaskbar(true);
      mainWindow.hide();
      return;
    }
    // Re-assert alwaysOnTop to bypass Windows desktop manager reset bugs
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      context.mainWindow.webContents.send('window-restored');
    }
  });

  // Periodically enforce visibility and skipTaskbar state in Taskbar Mode.
  // This bypasses Windows DWM hiding the window during "Show Desktop" (Win+D / swipe gestures).
  if (context.visibilityInterval) {
    clearInterval(context.visibilityInterval);
  }
  context.visibilityInterval = setInterval(() => {
    if (context.taskbarWindow && context.isTaskbarMode) {
      if (context.lastLocalPlaybackState && (!context.lastLocalPlaybackState.taskbarHidden || context.fullscreenLyricsEnabled) && !context.showTimeout) {
        if (!context.taskbarWindow.isVisible()) {
          context.taskbarWindow.showInactive();
        }
        context.taskbarWindow.setAlwaysOnTop(true, 'screen-saver');
        context.taskbarWindow.setSkipTaskbar(true);
      }
    }
  }, 1000);

  return mainWindow;
}

/**
 * Restores main overlay window from Taskbar Mode back to Normal Mode.
 */
function restoreNormalWindow(context, fromTray = false) {
  if (!context.mainWindow || context.mainWindow.isDestroyed()) return;
  context.isTaskbarMode = false;
  destroyTaskbarWindow(context);

  context.mainWindow.setFocusable(true);
  context.mainWindow.setSkipTaskbar(false);
  context.mainWindow.setIgnoreMouseEvents(false);
  context.mainWindow.setAlwaysOnTop(false);
  context.mainWindow.setOpacity(1);

  if (context.normalBounds) {
    context.mainWindow.setBounds(context.normalBounds);
  } else {
    context.mainWindow.setSize(720, 560);
    context.mainWindow.center();
  }

  if (!fromTray) {
    context.mainWindow.show();
    context.mainWindow.focus();
  }
  context.mainWindow.webContents.send('window-restored');
  context.mainWindow.webContents.send('force-normal-mode');
  context.emit('mode:normal-restored');
}

/**
 * Focuses existing main window or restores if minimized.
 */
function focusMainWindow(context) {
  if (context.mainWindow && !context.mainWindow.isDestroyed()) {
    if (context.mainWindow.isMinimized()) context.mainWindow.restore();
    context.mainWindow.show();
    context.mainWindow.focus();
  }
}

module.exports = {
  createMainWindow,
  restoreNormalWindow,
  focusMainWindow
};
