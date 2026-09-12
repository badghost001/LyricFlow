const EventEmitter = require('events');

class AppContext extends EventEmitter {
  constructor() {
    super();

    // Window instances
    this.mainWindow = null;
    this.taskbarWindow = null;
    this.edgeGlowWindow = null;
    this.wallpaperWindows = new Map(); // displayId -> BrowserWindow

    // System Tray
    this.tray = null;

    // Authentication & Network
    this.oauthServer = null;

    // Window layout & mode states
    this.normalBounds = null;
    this.isTaskbarMode = false;
    this.isWallpaperMode = false;
    this.taskbarLayout = { offset: 0, align: 'center', contentWidth: 280 };
    this.lastTaskbarOffset = 0;
    this.fullscreenLyricsEnabled = false;
    this.forceQuit = false;

    // Window recovery intervals
    this.restoreInterval = null;
    this.visibilityInterval = null;
    this.restoreTicks = 0;
    this.showTimeout = null;

    // SMTC and Local Playback processes
    this.localPlaybackProcess = null;
    this.localPlaybackControllerProcess = null;
    this.lastLocalPlaybackState = { status: 'Closed' };
    this.lastTrackId = null;
    this.smtcRestartAttempts = 0;

    // Native C# helper compiler paths & statuses
    this.helpers = {
      win32DllPath: null,
      win32HelperReady: false,
      wallpaperExePath: null,
      wallpaperHelperReady: false,
      mediaExePath: null,
      mediaHelperReady: false
    };
  }

  /**
   * Broadcast an IPC message to all alive windows (main, taskbar, edge-glow, wallpaper).
   */
  broadcast(channel, ...args) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
    if (this.taskbarWindow && !this.taskbarWindow.isDestroyed()) {
      this.taskbarWindow.webContents.send(channel, ...args);
    }
    if (this.edgeGlowWindow && !this.edgeGlowWindow.isDestroyed()) {
      this.edgeGlowWindow.webContents.send(channel, ...args);
    }
    for (const win of this.wallpaperWindows.values()) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, ...args);
      }
    }
  }

  /**
   * Safe getter for main window.
   */
  hasMainWindow() {
    return !!(this.mainWindow && !this.mainWindow.isDestroyed());
  }

  /**
   * Safe getter for taskbar window.
   */
  hasTaskbarWindow() {
    return !!(this.taskbarWindow && !this.taskbarWindow.isDestroyed());
  }
}

// Export singleton instance
module.exports = new AppContext();
