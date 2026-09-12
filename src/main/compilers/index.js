const win32Helper = require('./win32-helper');
const wallpaperHelper = require('./wallpaper-helper');
const mediaHelper = require('./media-helper');

class CompilerManager {
  constructor() {
    this.context = null;
  }

  init(context) {
    this.context = context;
    // Store default paths in context
    this.context.helpers.win32DllPath = win32Helper.win32DllPath;
    this.context.helpers.wallpaperExePath = wallpaperHelper.wallpaperExePath;
    this.context.helpers.mediaExePath = mediaHelper.mediaExePath;
  }

  /**
   * Pre-compile all native C# helpers during deferred idle startup (3s after boot)
   * so every user action (wallpaper toggle, play/pause, SMTC reader) runs instantly.
   */
  precompileAll() {
    console.log('[Compilers] Pre-compiling native C# helpers in background...');
    wallpaperHelper.ensureWallpaperHelper(this.context);
    mediaHelper.ensureMediaHelper(this.context);
    win32Helper.ensureWin32Helper(this.context);
  }

  get win32() {
    return win32Helper;
  }

  get wallpaper() {
    return wallpaperHelper;
  }

  get media() {
    return mediaHelper;
  }
}

module.exports = new CompilerManager();
