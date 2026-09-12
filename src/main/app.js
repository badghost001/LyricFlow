const { app, protocol, net, globalShortcut, screen } = require('electron');
const windowManager = require('./windows');

/**
 * Configure Chromium GPU compositing, occlusion, and hardware rasterization flags.
 * MUST be called before app.ready.
 */
function setupChromiumFlags() {
  process.noDeprecation = true;

  // Register custom protocol for local media before app is ready
  protocol.registerSchemesAsPrivileged([
    { scheme: 'lyricflow-media', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }
  ]);

  app.commandLine.appendSwitch('no-sandbox');

  // Optimize GPU rasterization, memory bandwidth, and eliminate DWM transparent window stutter
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');

  if (process.platform === 'win32') {
    app.setAppUserModelId(process.execPath);
  }
}

/**
 * Configure uncaught exception filtering and process hygiene.
 */
function setupProcessHandlers() {
  process.on('uncaughtException', (err) => {
    if (err.message && err.message.includes('connection closed') && err.stack && err.stack.includes('discord-rpc')) {
      // Discord closed or disconnected, ignore
      return;
    }
    console.error('[Process] Uncaught Exception:', err);
  });

  if (global.gc) {
    setInterval(() => {
      try { global.gc(); } catch (e) { console.error('[Process] GC Error:', e); }
    }, 60000);
  }
}

/**
 * Handles custom media protocol 'lyricflow-media://'
 */
function registerProtocols() {
  protocol.handle('lyricflow-media', (request) => {
    let url = request.url.replace('lyricflow-media://', 'file://');
    url = url.replace('file:////', 'file:///');
    return net.fetch(url);
  });
}

/**
 * Sets up global shortcuts for overlay controls and media navigation.
 */
function setupGlobalShortcuts(context) {
  // Toggle click-through
  globalShortcut.register('CommandOrControl+Shift+L', () => {
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      context.mainWindow.webContents.send('toggle-click-through-shortcut');
    }
  });

  // Copy active lyric
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      context.mainWindow.webContents.send('copy-active-lyric');
    }
  });

  // Share active lyric
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      context.mainWindow.webContents.send('share-active-lyric');
    }
  });

  // Nudge shortcuts for Wallpaper Style 3 positioning
  const nudgeStep = 1;
  globalShortcut.register('CommandOrControl+Shift+Left', () => {
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      context.mainWindow.webContents.send('nudge-overlay', -nudgeStep, 0);
    }
  });
  globalShortcut.register('CommandOrControl+Shift+Right', () => {
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      context.mainWindow.webContents.send('nudge-overlay', nudgeStep, 0);
    }
  });
  globalShortcut.register('CommandOrControl+Shift+Up', () => {
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      context.mainWindow.webContents.send('nudge-overlay', 0, -nudgeStep);
    }
  });
  globalShortcut.register('CommandOrControl+Shift+Down', () => {
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      context.mainWindow.webContents.send('nudge-overlay', 0, nudgeStep);
    }
  });

  // Media keys and shortcuts
  try {
    globalShortcut.register('MediaPlayPause', () => {
      if (context.mainWindow && !context.mainWindow.isDestroyed()) {
        context.mainWindow.webContents.send('tray-playback-control', 'play-pause');
      }
    });
    globalShortcut.register('MediaNextTrack', () => {
      if (context.mainWindow && !context.mainWindow.isDestroyed()) {
        context.mainWindow.webContents.send('tray-playback-control', 'next');
      }
    });
    globalShortcut.register('MediaPreviousTrack', () => {
      if (context.mainWindow && !context.mainWindow.isDestroyed()) {
        context.mainWindow.webContents.send('tray-playback-control', 'previous');
      }
    });
    globalShortcut.register('CommandOrControl+Alt+Space', () => {
      if (context.mainWindow && !context.mainWindow.isDestroyed()) {
        context.mainWindow.webContents.send('tray-playback-control', 'play-pause');
      }
    });
    globalShortcut.register('CommandOrControl+Alt+Right', () => {
      if (context.mainWindow && !context.mainWindow.isDestroyed()) {
        context.mainWindow.webContents.send('tray-playback-control', 'next');
      }
    });
    globalShortcut.register('CommandOrControl+Alt+Left', () => {
      if (context.mainWindow && !context.mainWindow.isDestroyed()) {
        context.mainWindow.webContents.send('tray-playback-control', 'previous');
      }
    });
  } catch (err) {
    console.error('[Shortcuts] Failed to register media shortcuts:', err);
  }
}

/**
 * Listens for display resolution and layout changes to keep taskbar mode aligned.
 */
function setupScreenListeners(context) {
  screen.on('display-metrics-changed', () => {
    if (context.taskbarWindow && context.isTaskbarMode && !context.taskbarWindow.isDestroyed()) {
      windowManager.applyTaskbarWindowLayout();
    }
  });
}

/**
 * Initializes automatic background updates, deferred by 15s to keep launch instantaneous.
 */
function setupAutoUpdater(context) {
  setTimeout(() => {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.autoDownload = true;
      autoUpdater.on('update-available', () => {
        if (context.mainWindow && !context.mainWindow.isDestroyed()) {
          context.mainWindow.webContents.send('show-toast', 'Downloading update...');
        }
      });
      autoUpdater.on('update-downloaded', () => {
        const { dialog } = require('electron');
        dialog.showMessageBox({
          type: 'info',
          title: 'Update Ready',
          message: 'A new version of LyricFlow has been downloaded. Would you like to restart and install it now?',
          buttons: ['Restart Now', 'Later']
        }).then((result) => {
          if (result.response === 0) {
            context.forceQuit = true;
            autoUpdater.quitAndInstall(false, true);
          }
        });
      });
      autoUpdater.on('error', (err) => {
        console.error('[AutoUpdater] Update error:', err);
      });
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    } catch (e) {
      console.warn('[AutoUpdater] Deferred autoUpdater initialization failed:', e);
    }
  }, 15000);
}

/**
 * Cleans up global resources, shortcuts, and background helper processes.
 */
function cleanup(context) {
  globalShortcut.unregisterAll();

  if (context.tray) {
    context.tray.destroy();
    context.tray = null;
  }
  if (context.localPlaybackProcess) {
    context.localPlaybackProcess.kill();
    context.localPlaybackProcess = null;
  }
  if (context.localPlaybackControllerProcess) {
    context.localPlaybackControllerProcess.kill();
    context.localPlaybackControllerProcess = null;
  }
  if (context.edgeGlowWindow && !context.edgeGlowWindow.isDestroyed()) {
    context.edgeGlowWindow.close();
    context.edgeGlowWindow = null;
  }
}

module.exports = {
  setupChromiumFlags,
  setupProcessHandlers,
  registerProtocols,
  setupGlobalShortcuts,
  setupScreenListeners,
  setupAutoUpdater,
  cleanup
};
