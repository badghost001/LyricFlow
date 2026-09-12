const mainWindow = require('./main-window');
const taskbarWindow = require('./taskbar-window');
const wallpaperWindow = require('./wallpaper-window');
const edgeGlowWindow = require('./edge-glow-window');

class WindowManager {
  constructor() {
    this.context = null;
  }

  init(context) {
    this.context = context;
  }

  createMainWindow() {
    return mainWindow.createMainWindow(this.context);
  }

  restoreNormalWindow(fromTray = false) {
    return mainWindow.restoreNormalWindow(this.context, fromTray);
  }

  focusMainWindow() {
    return mainWindow.focusMainWindow(this.context);
  }

  getTaskbarBounds() {
    return taskbarWindow.getTaskbarBounds();
  }

  createTaskbarWindow() {
    return taskbarWindow.createTaskbarWindow(this.context);
  }

  destroyTaskbarWindow() {
    return taskbarWindow.destroyTaskbarWindow(this.context);
  }

  applyTaskbarWindowLayout(layout) {
    return taskbarWindow.applyTaskbarWindowLayout(this.context, layout);
  }

  applyTaskbarInteractionMode() {
    return taskbarWindow.applyTaskbarInteractionMode(this.context);
  }

  enableWallpaperMode() {
    return wallpaperWindow.enableWallpaperMode(this.context);
  }

  disableWallpaperMode() {
    return wallpaperWindow.disableWallpaperMode(this.context, (ctx) => mainWindow.restoreNormalWindow(ctx));
  }

  startWallpaperEdit() {
    return wallpaperWindow.startWallpaperEdit(this.context);
  }

  endWallpaperEdit() {
    return wallpaperWindow.endWallpaperEdit(this.context);
  }

  setEdgeGlow(enabled, color) {
    return edgeGlowWindow.setEdgeGlow(this.context, enabled, color);
  }
}

module.exports = new WindowManager();
