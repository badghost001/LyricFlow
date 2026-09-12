const { ipcMain, desktopCapturer, Notification, nativeImage } = require('electron');
const { exec, execSync } = require('child_process');
const windowManager = require('../windows');
const trayManager = require('../tray');

/**
 * Registers IPC handlers for window control, modes, taskbar docking, and wallpaper embedding.
 */
function registerWindowIpc(context) {
  // App window management
  ipcMain.on('close-app', () => {
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      if (context.isTaskbarMode) {
        context.mainWindow.hide();
      } else {
        context.mainWindow.setSkipTaskbar(false);
        context.mainWindow.minimize();
      }
    }
  });

  ipcMain.on('minimize-app', () => {
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      if (!context.isTaskbarMode) context.mainWindow.setSkipTaskbar(false);
      setTimeout(() => {
        if (context.mainWindow && !context.mainWindow.isDestroyed()) {
          context.mainWindow.minimize();
        }
      }, 50);
    }
  });

  ipcMain.on('set-click-through', (event, ignore) => {
    if (context.mainWindow && !context.mainWindow.isDestroyed() && !context.isTaskbarMode) {
      context.mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  ipcMain.on('set-always-on-top', (event, alwaysOnTop) => {
    if (context.mainWindow && !context.mainWindow.isDestroyed() && !context.isTaskbarMode) {
      if (alwaysOnTop) {
        context.mainWindow.setAlwaysOnTop(true, 'screen-saver');
      } else {
        context.mainWindow.setAlwaysOnTop(false);
      }
    }
  });

  // Edge glow ambient lighting
  ipcMain.on('set-edge-glow', (event, enabled, color) => {
    windowManager.setEdgeGlow(enabled, color);
  });

  // Taskbar Mode IPC
  ipcMain.on('set-taskbar-mode', (event, enabled, fromTray = false) => {
    if (!context.mainWindow || context.mainWindow.isDestroyed()) return;
    if (context.isTaskbarMode === enabled) {
      trayManager.updateTrayMenu(enabled);
      return;
    }
    context.isTaskbarMode = enabled;
    trayManager.updateTrayMenu(enabled);

    if (enabled) {
      // Save normal window size/position
      const currentBounds = context.mainWindow.getBounds();
      if (currentBounds.height > 100 && !context.mainWindow.isMinimized()) {
        context.normalBounds = currentBounds;
      }

      context.mainWindow.hide();
      context.mainWindow.setOpacity(0); // Aggressive hide to prevent ghost windows

      setTimeout(() => {
        if (context.isTaskbarMode && context.mainWindow && !context.mainWindow.isDestroyed()) {
          context.mainWindow.hide();
        }
      }, 150);

      windowManager.createTaskbarWindow();
    } else {
      windowManager.restoreNormalWindow(fromTray);
    }
  });

  ipcMain.on('sync-taskbar-mode-state', (event, state) => {
    if (typeof state === 'boolean') {
      trayManager.updateTrayMenu(state);
    }
  });

  ipcMain.on('update-taskbar-lyric', (event, data) => {
    if (context.taskbarWindow && !context.taskbarWindow.isDestroyed()) {
      context.taskbarWindow.webContents.send('update-taskbar-lyric', data);
    }
  });

  ipcMain.on('sync-taskbar-config', (event, config) => {
    if (context.taskbarWindow && !context.taskbarWindow.isDestroyed()) {
      const strip = windowManager.getTaskbarBounds();
      const offset = config.lyricOffsetX !== undefined
        ? config.lyricOffsetX
        : (config.taskbarOffset !== undefined ? config.taskbarOffset : context.lastTaskbarOffset);
      context.lastTaskbarOffset = offset;
      context.taskbarWindow.webContents.send('sync-taskbar-config', {
        ...config,
        lyricOffsetX: offset,
        position: strip.position
      });
    }
  });

  ipcMain.on('tb-save-offset', (event, offsetX) => {
    context.lastTaskbarOffset = offsetX;
    if (context.mainWindow && !context.mainWindow.isDestroyed()) {
      context.mainWindow.webContents.send('tb-offset-saved', offsetX);
    }
  });

  ipcMain.on('tb-open-app', () => {
    windowManager.restoreNormalWindow();
  });

  ipcMain.on('tb-click-through', (event, ignore) => {
    if (context.taskbarWindow && !context.taskbarWindow.isDestroyed()) {
      context.taskbarWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  ipcMain.on('sync-taskbar-layout', (event, layout) => {
    windowManager.applyTaskbarWindowLayout(layout);
  });

  ipcMain.on('set-fullscreen-lyrics', (event, enabled) => {
    context.fullscreenLyricsEnabled = enabled;
    if (context.isTaskbarMode && context.taskbarWindow && !context.taskbarWindow.isDestroyed()) {
      if (enabled) {
        context.taskbarWindow.setBounds(windowManager.getTaskbarBounds());
      }
      windowManager.applyTaskbarInteractionMode();
    }
  });

  // Taskbar Color Registry Query
  ipcMain.handle('get-taskbar-color', () => {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve({ theme: 'dark', color: '#ffffff' });
        return;
      }

      const cmd = 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v SystemUsesLightTheme && reg query "HKCU\\Software\\Microsoft\\Windows\\DWM" /v ColorizationColor && reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v ColorPrevalence';

      exec(cmd, (error, stdout) => {
        if (error) {
          resolve({ theme: 'dark', color: '#ffffff' });
          return;
        }

        let systemUsesLightTheme = 0;
        let colorizationColor = '';
        let colorPrevalence = 0;

        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('SystemUsesLightTheme')) {
            const match = line.trim().match(/0x[0-9a-fA-F]+/);
            if (match) systemUsesLightTheme = parseInt(match[0], 16);
          }
          if (line.includes('ColorizationColor')) {
            const match = line.trim().match(/0x[0-9a-fA-F]+/);
            if (match) colorizationColor = match[0];
          }
          if (line.includes('ColorPrevalence')) {
            const match = line.trim().match(/0x[0-9a-fA-F]+/);
            if (match) colorPrevalence = parseInt(match[0], 16);
          }
        }

        const isDarkTheme = systemUsesLightTheme === 0;

        if (colorPrevalence === 1 && colorizationColor) {
          const colorVal = parseInt(colorizationColor, 16);
          const r = (colorVal >> 16) & 0xff;
          const g = (colorVal >> 8) & 0xff;
          const b = colorVal & 0xff;

          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const textColor = luminance > 0.5 ? '#121212' : '#ffffff';
          resolve({
            theme: luminance > 0.5 ? 'light' : 'dark',
            color: textColor,
            bgColor: `rgba(${r}, ${g}, ${b}, 0.85)`,
            accentColor: `rgb(${r}, ${g}, ${b})`
          });
        } else {
          if (isDarkTheme) {
            resolve({ theme: 'dark', color: '#ffffff', bgColor: 'rgba(32, 32, 32, 0.75)' });
          } else {
            resolve({ theme: 'light', color: '#121212', bgColor: 'rgba(243, 243, 243, 0.75)' });
          }
        }
      });
    });
  });

  // Wallpaper Mode IPC
  ipcMain.on('set-wallpaper-mode', (event, enabled) => {
    if (enabled) {
      windowManager.enableWallpaperMode();
    } else {
      windowManager.disableWallpaperMode();
    }
  });

  ipcMain.on('start-wallpaper-edit', () => {
    windowManager.startWallpaperEdit();
  });

  ipcMain.on('end-wallpaper-edit', () => {
    windowManager.endWallpaperEdit();
  });

  ipcMain.handle('get-desktop-wallpaper', async () => {
    try {
      const result = execSync(
        'powershell -NoProfile -Command "(Get-ItemProperty -Path \'HKCU:\\Control Panel\\Desktop\' -Name Wallpaper).Wallpaper"',
        { encoding: 'utf8', timeout: 3000 }
      ).trim();
      return result || null;
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('get-desktop-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return sources.map(s => ({ id: s.id, name: s.name }));
  });

  // Desktop Native Notification for Now Playing
  ipcMain.on('show-now-playing-notification', async (event, track) => {
    if (!track || !Notification.isSupported()) return;
    try {
      const title = track.name || track.title || 'Now Playing';
      let body = track.artist || (track.artists ? track.artists.map(a => a.name).join(', ') : '');
      if (track.playcount && track.playcount > 0) {
        body += (body ? ' • ' : '') + `Listened ${track.playcount} times`;
      }

      const options = {
        title: title,
        body: body || 'Spotify Lyrics Overlay',
        silent: true
      };

      if (track.albumArtUrl && typeof track.albumArtUrl === 'string' && track.albumArtUrl.startsWith('http')) {
        try {
          const res = await fetch(track.albumArtUrl);
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            const icon = nativeImage.createFromBuffer(buffer);
            if (!icon.isEmpty()) {
              options.icon = icon;
            }
          }
        } catch (_) {}
      }

      const notif = new Notification(options);
      notif.on('click', () => {
        if (context.mainWindow && !context.mainWindow.isDestroyed()) {
          if (context.mainWindow.isMinimized()) context.mainWindow.restore();
          context.mainWindow.show();
          context.mainWindow.focus();
        }
      });
      notif.show();
    } catch (err) {
      console.warn('[WindowIPC] Failed to show Now Playing notification:', err);
    }
  });

  ipcMain.on('show-next-up', (event, track) => {
    if (!track || !Notification.isSupported()) return;
    ipcMain.emit('show-now-playing-notification', event, track);
  });
}

module.exports = {
  registerWindowIpc
};
