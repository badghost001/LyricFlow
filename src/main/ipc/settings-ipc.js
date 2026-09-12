const { ipcMain, app, session } = require('electron');
const fs = require('fs');
const { getConfigPath } = require('../utils/paths');

/**
 * Registers IPC handlers for configuration and application settings.
 */
function registerSettingsIpc(context) {
  ipcMain.handle('load-config', async () => {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return null;
    }
    try {
      const data = await fs.promises.readFile(configPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('[Settings] Failed to read config:', err);
      return null;
    }
  });

  ipcMain.handle('save-config', async (event, config) => {
    const configPath = getConfigPath();
    try {
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('[Settings] Failed to save config:', err);
      return false;
    }
  });

  ipcMain.handle('reset-config', async () => {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      try {
        await fs.promises.unlink(configPath);
        // Clear all session cookies so user is actually logged out of Spotify in the Electron browser
        await session.defaultSession.clearStorageData({ storages: ['cookies'] });
        return true;
      } catch (err) {
        console.error('[Settings] Failed to delete config:', err);
      }
    }
    return false;
  });

  ipcMain.handle('get-auto-launch', () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('set-auto-launch', (event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    return enabled;
  });
}

module.exports = {
  registerSettingsIpc
};
