const { Menu, app } = require('electron');

/**
 * Builds the dynamic context menu for the system tray.
 */
function buildTrayMenu(context, isTaskbarMode, restoreNormalWindowFn) {
  return Menu.buildFromTemplate([
    { label: 'LyricFlow', enabled: false },
    { type: 'separator' },
    {
      label: 'Open App',
      click: () => {
        if (restoreNormalWindowFn) {
          restoreNormalWindowFn();
        }
      }
    },
    {
      label: isTaskbarMode ? 'Disable Taskbar Mode' : 'Enable Taskbar Mode',
      click: () => {
        if (context.mainWindow && !context.mainWindow.isDestroyed()) {
          context.mainWindow.webContents.send('toggle-taskbar-mode-tray');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Play / Pause',
      click: () => {
        if (context.mainWindow && !context.mainWindow.isDestroyed()) {
          context.mainWindow.webContents.send('tray-playback-control', 'play-pause');
        }
      }
    },
    {
      label: 'Next Song',
      click: () => {
        if (context.mainWindow && !context.mainWindow.isDestroyed()) {
          context.mainWindow.webContents.send('tray-playback-control', 'next');
        }
      }
    },
    {
      label: 'Previous Song',
      click: () => {
        if (context.mainWindow && !context.mainWindow.isDestroyed()) {
          context.mainWindow.webContents.send('tray-playback-control', 'previous');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Show Settings',
      click: () => {
        if (restoreNormalWindowFn) {
          restoreNormalWindowFn();
        }
        if (context.mainWindow && !context.mainWindow.isDestroyed()) {
          context.mainWindow.webContents.send('tray-show-settings');
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        context.forceQuit = true;
        app.quit();
      }
    }
  ]);
}

module.exports = {
  buildTrayMenu
};
