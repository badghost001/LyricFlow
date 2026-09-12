const { app, BrowserWindow } = require('electron');
const appBootstrap = require('./src/main/app');
const context = require('./src/main/context');
const compilers = require('./src/main/compilers');
const windowManager = require('./src/main/windows');
const trayManager = require('./src/main/tray');
const ipcHub = require('./src/main/ipc');
const { startLocalPlaybackMonitor } = require('./src/main/ipc/playback-ipc');

// 1. Configure Chromium GPU switches, occlusion flags, and privilege schemes
appBootstrap.setupChromiumFlags();
appBootstrap.setupProcessHandlers();

// 2. Single-instance application lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    windowManager.focusMainWindow();
  });

  // 3. Application Lifecycle
  app.whenReady().then(async () => {
    // Protocol handler
    appBootstrap.registerProtocols();

    // Initialize IPC registry
    ipcHub.init(context);

    // Initialize native C# compilers
    compilers.init(context);

    // Initialize Window Manager
    windowManager.init(context);

    // Initialize System Tray
    trayManager.init(context);

    // Register global shortcuts and screen listeners
    appBootstrap.setupGlobalShortcuts(context);
    appBootstrap.setupScreenListeners(context);

    // Create primary overlay window
    windowManager.createMainWindow();

    // Stagger background tasks to ensure 0ms launch lag
    setTimeout(() => {
      startLocalPlaybackMonitor(context);
      compilers.precompileAll();
    }, 3000);

    // Setup OTA updates deferred by 15 seconds
    appBootstrap.setupAutoUpdater(context);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    // Only quit if user explicitly requested it via tray > Quit.
    // Otherwise keep the app alive in the system tray.
    if (context.forceQuit) {
      app.quit();
    }
  });

  app.on('will-quit', () => {
    appBootstrap.cleanup(context);
  });
}
