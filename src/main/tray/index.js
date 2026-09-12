const { Tray, nativeImage } = require('electron');
const { getAssetPath } = require('../utils/paths');
const { buildTrayMenu } = require('./menu-builder');
const windowManager = require('../windows');

class TrayManager {
  constructor() {
    this.context = null;
    this.tray = null;
  }

  init(context) {
    this.context = context;
    this.createTray();

    // Re-build menu when mode changes
    this.context.on('mode:normal-restored', () => {
      this.updateTrayMenu(false);
    });
  }

  createTray() {
    if (this.tray) return;

    let icon = nativeImage.createFromPath(getAssetPath('icon.png'));
    // Resize to 16x16 for the Windows system tray (large images won't render)
    if (!icon.isEmpty()) {
      icon = icon.resize({ width: 16, height: 16 });
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip('LyricFlow');

    this.tray.on('click', () => {
      if (this.context.mainWindow && !this.context.mainWindow.isDestroyed()) {
        if (this.context.isTaskbarMode) {
          this.context.mainWindow.webContents.send('toggle-taskbar-mode-tray');
        } else {
          if (this.context.mainWindow.isVisible() && !this.context.mainWindow.isMinimized()) {
            this.context.mainWindow.hide();
          } else {
            windowManager.restoreNormalWindow();
          }
        }
      }
    });

    this.tray.on('right-click', () => {
      if (this.tray) {
        this.tray.popUpContextMenu();
      }
    });

    this.updateTrayMenu(false);
    this.context.tray = this.tray;
  }

  updateTrayMenu(isTaskbarMode) {
    if (!this.tray) return;
    const menu = buildTrayMenu(this.context, isTaskbarMode, () => windowManager.restoreNormalWindow());
    this.tray.setContextMenu(menu);
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      if (this.context) this.context.tray = null;
    }
  }
}

module.exports = new TrayManager();
