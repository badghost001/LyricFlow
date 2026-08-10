const { app, BrowserWindow, ipcMain, shell, globalShortcut, screen, Tray, Menu, nativeImage, session, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { exec, spawn } = require('child_process');
const md5 = require('md5');
const { autoUpdater } = require('electron-updater');

process.noDeprecation = true;
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // REMOVED: Disabling TLS validation is a critical security risk

// Register custom protocol for local media before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'lyricflow-media', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }
]);

app.commandLine.appendSwitch('no-sandbox');

// Suppress known upstream dependency errors from logging to console
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('connection closed') && err.stack && err.stack.includes('discord-rpc')) {
    // Discord was closed or disconnected, ignore
    return;
  }
  console.error("Uncaught Exception:", err);
});

// Optimize memory and disable unneeded Chromium features
app.commandLine.appendSwitch('disable-site-isolation-trials'); // Huge memory saver
app.commandLine.appendSwitch('js-flags', '--expose-gc'); // Allow manual garbage collection
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Certificate error bypass removed for security — was causing MITM vulnerability
// app.commandLine.appendSwitch('ignore-certificate-errors');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow = null;
let oauthServer = null;
let normalBounds = null;
let nextUpWindow = null;
let edgeGlowWindow = null;
let taskbarWindow = null;
let tray = null;
let isTaskbarMode = false;
let taskbarLayout = { offset: 0, align: 'center', contentWidth: 280 };
let restoreInterval = null;
let visibilityInterval = null;
let restoreTicks = 0;
let showTimeout = null;
let fullscreenLyricsEnabled = false;
let forceQuit = false;

let localPlaybackProcess = null;
let localPlaybackControllerProcess = null;
let lastLocalPlaybackState = { status: 'Closed' };
let lastTrackId = null;
let smtcRestartAttempts = 0;

// Helper to get script paths correctly when running inside an ASAR archive
function getScriptPath(scriptName) {
  let p = path.join(__dirname, scriptName);
  if (p.includes('app.asar')) {
    p = p.replace('app.asar', 'app.asar.unpacked');
  }
  return p;
}

// Get path for config file (with migration from old app name)
function getConfigPath() {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  const configPath = path.join(userDataPath, 'config.json');

  // Migrate config from the old "spotify-lyrics-overlay" userData folder if it exists
  if (!fs.existsSync(configPath)) {
    const oldConfigPath = path.join(path.dirname(userDataPath), 'spotify-lyrics-overlay', 'config.json');
    if (fs.existsSync(oldConfigPath)) {
      try {
        fs.copyFileSync(oldConfigPath, configPath);
        console.log('Migrated config from old app folder.');
      } catch (e) {
        console.error('Failed to migrate old config:', e);
      }
    }
  }
  return configPath;
}

// Start persistent PowerShell process to query Windows SMTC
function startLocalPlaybackMonitor() {
  if (localPlaybackProcess) return;
  smtcRestartAttempts = 0; // Reset counter on successful start

  const scriptPath = getScriptPath('smtc_reader.ps1');
  
  try {
    localPlaybackProcess = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath
    ]);
    localPlaybackControllerProcess = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', getScriptPath('smtc_controller.ps1')
    ]);
  } catch (err) {
    console.error("Failed to spawn local SMTC processes:", err);
    return;
  }
  
  let buffer = '';
  localPlaybackProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        try {
          const parsed = JSON.parse(trimmed);
          const prevStatus = lastLocalPlaybackState ? lastLocalPlaybackState.status : null;
          lastLocalPlaybackState = parsed;
          
          // Toggle window visibility based on taskbar auto-hide state
          if (isTaskbarMode && taskbarWindow && !taskbarWindow.isDestroyed()) {
            if (parsed.taskbarHidden && !fullscreenLyricsEnabled) {
              if (showTimeout) {
                clearTimeout(showTimeout);
                showTimeout = null;
              }
              if (taskbarWindow.isVisible()) {
                taskbarWindow.hide();
              }
            } else {
              if (!taskbarWindow.isVisible() && !showTimeout) {
                showTimeout = setTimeout(() => {
                  showTimeout = null;
                  if (isTaskbarMode && taskbarWindow && !taskbarWindow.isDestroyed() && lastLocalPlaybackState && (!lastLocalPlaybackState.taskbarHidden || fullscreenLyricsEnabled)) {
                    taskbarWindow.showInactive();
                    taskbarWindow.setAlwaysOnTop(true, 'screen-saver');
                    applyTaskbarWindowLayout();
                  }
                }, 300);
              }
            }
          }
          
          if (parsed.status === 'Closed') {
            lastTrackId = null;
          }

          // Instantly push pause/play state changes to renderer — no Spotify API poll delay
          if (parsed.title && parsed.status !== prevStatus && (parsed.status === 'Playing' || parsed.status === 'Paused')) {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('smtc-playback-status', {
                isPlaying: parsed.status === 'Playing',
                position: parsed.position || 0
              });
            }
          }

          if (parsed.status !== 'Closed' && parsed.title) {
            const trackId = `${parsed.artist}_${parsed.title}`;
            if (trackId !== lastTrackId) {
              lastTrackId = trackId;
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('local-playback-change', mockSpotifyPlaybackState(parsed));
              }
            }
          }
        } catch (e) {
          console.warn("SMTC parsing error:", e);
        }
      }
    }
  });

  localPlaybackProcess.on('close', (code) => {
    localPlaybackProcess = null;
    if (localPlaybackControllerProcess) {
      localPlaybackControllerProcess.kill();
      localPlaybackControllerProcess = null;
    }
    // Exponential back-off: 5s, 10s, 20s, 40s... max 60s
    smtcRestartAttempts++;
    const delay = Math.min(5000 * Math.pow(2, smtcRestartAttempts - 1), 60000);
    console.log(`SMTC reader exited (code ${code}). Restart #${smtcRestartAttempts} in ${delay/1000}s...`);
    if (smtcRestartAttempts <= 10) {
      setTimeout(startLocalPlaybackMonitor, delay);
    } else {
      console.error('SMTC reader exceeded max restart attempts (10). Giving up.');
    }
  });
  
  localPlaybackProcess.on('error', (err) => {
    console.error("SMTC reader process error:", err);
  });
}

function mockSpotifyPlaybackState(localState) {
  if (!localState || localState.status === 'Closed' || !localState.title) {
    return null;
  }

  // Create a stable local ID based on title and artist
  const rawIdInput = `${localState.artist || 'Unknown'}_${localState.title || 'Unknown'}`;
  const trackId = `local_${Buffer.from(rawIdInput).toString('base64').replace(/=/g, '')}`;

  return {
    is_playing: localState.status === 'Playing',
    progress_ms: localState.position || 0,
    item: {
      id: trackId,
      name: localState.title,
      duration_ms: localState.duration || 0,
      artists: [
        { name: localState.artist || 'Unknown Artist' }
      ],
      album: {
        images: [] // Renderer will fetch this using iTunes Search API asynchronously if empty
      }
    }
  };
}

// 1. Create Main Overlay Window
function createWindow() {
  let bounds = { width: 720, height: 700 };
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (conf.bounds) bounds = conf.bounds;
    }
  } catch(e) {
    console.error("Failed to load bounds:", e);
  }

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    // type: 'toolbar', // Removed to fix app disappearing from taskbar on minimize
    alwaysOnTop: false,
    skipTaskbar: false,
    show: true,
    resizable: true,
    hasShadow: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // webSecurity: false, // REMOVED: Disabling web security weakens same-origin policy
      backgroundThrottling: false
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] [Line ${line}] ${message}`);
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Redirect target="_blank" links to default system browser (validated)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (e, url) => {
    e.preventDefault();
  });

  // Intercept the window close: minimize to taskbar in normal mode, hide in taskbar mode
  mainWindow.on('close', (e) => {
    if (!forceQuit) {
      e.preventDefault();
      if (isTaskbarMode) {
        mainWindow.hide();
      } else {
        mainWindow.setSkipTaskbar(false);
        mainWindow.minimize();
      }
      return;
    }
    // Save bounds
    if (!isTaskbarMode) {
      try {
        const b = mainWindow.getBounds();
        const cp = getConfigPath();
        let conf = {};
        if (fs.existsSync(cp)) conf = JSON.parse(fs.readFileSync(cp, 'utf8'));
        conf.bounds = b;
        fs.writeFileSync(cp, JSON.stringify(conf, null, 2), 'utf8');
      } catch (err) {
        console.error("Failed to save bounds:", err);
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (restoreInterval) {
      clearInterval(restoreInterval);
      restoreInterval = null;
    }
    if (visibilityInterval) {
      clearInterval(visibilityInterval);
      visibilityInterval = null;
    }
    if (oauthServer) {
      oauthServer.close();
    }
  });

  mainWindow.on('focus', () => {
    if (isTaskbarMode) {
      mainWindow.setSkipTaskbar(true);
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
  });

  mainWindow.on('blur', () => {
    if (isTaskbarMode) {
      mainWindow.setSkipTaskbar(true);
    }
  });

  mainWindow.on('show', () => {
    if (isTaskbarMode) {
      mainWindow.setSkipTaskbar(true);
    }
  });

  mainWindow.on('minimize', (event) => {
    if (isTaskbarMode) {
      event.preventDefault();
      
      if (restoreInterval) {
        clearInterval(restoreInterval);
      }
      
      restoreTicks = 0;
      restoreInterval = setInterval(() => {
        if (!mainWindow || !isTaskbarMode || restoreTicks > 10) {
          clearInterval(restoreInterval);
          restoreInterval = null;
          return;
        }
        
        restoreTicks++;
        mainWindow.restore();
      }, 250);
    }
  });

  mainWindow.on('restore', () => {
    if (isTaskbarMode) {
      // In taskbar mode, re-hide immediately — the main window should stay hidden.
      applyTaskbarInteractionMode();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.setSkipTaskbar(true);
      mainWindow.hide();
      return;
    }
    // Re-assert alwaysOnTop to bypass Windows desktop manager reset bugs
    if (mainWindow) {
      mainWindow.webContents.send('window-restored');
    }
  });

  // Periodically enforce visibility and skipTaskbar state in Taskbar Mode.
  // This bypasses Windows DWM hiding the window during "Show Desktop" (Win+D / touchpad swipe gestures).
  visibilityInterval = setInterval(() => {
    if (taskbarWindow && isTaskbarMode) {
      if (lastLocalPlaybackState && (!lastLocalPlaybackState.taskbarHidden || fullscreenLyricsEnabled) && !showTimeout) {
        if (!taskbarWindow.isVisible()) {
          taskbarWindow.showInactive();
        }
        taskbarWindow.setAlwaysOnTop(true, 'screen-saver');
        taskbarWindow.setSkipTaskbar(true);
      }
    }
  }, 1000);
}

if (global.gc) {
  setInterval(() => {
    try { global.gc(); } catch (e) { console.error("GC Error:", e); }
  }, 60000);
}

app.whenReady().then(async () => {
  // Handle custom media protocol
  protocol.handle('lyricflow-media', (request) => {
    let url = request.url.replace('lyricflow-media://', 'file://');
    // Ensure proper triple slashes for local files
    url = url.replace('file:////', 'file:///');
    return net.fetch(url);
  });

  // Stagger startup to prevent CPU spikes
  setTimeout(() => {
    startLocalPlaybackMonitor();
  }, 3000);
  
  createWindow();
  createTray();
  
  // Setup OTA updates
  autoUpdater.autoDownload = true;
  autoUpdater.on('update-available', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('show-toast', 'Downloading update...');
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
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });
  autoUpdater.on('error', (err) => {
    console.error('Update error:', err);
  });
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});

  screen.on('display-metrics-changed', () => {
    if (taskbarWindow && isTaskbarMode && !taskbarWindow.isDestroyed()) {
      taskbarWindow.setBounds(getTaskbarBounds());
    }
  });

  // Register global shortcut to toggle click-through from anywhere
  globalShortcut.register('CommandOrControl+Shift+L', () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-click-through-shortcut');
    }
  });

  // Register global shortcut to copy active lyric
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (mainWindow) {
      mainWindow.webContents.send('copy-active-lyric');
    }
  });

  // Register global shortcut to share active lyric
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (mainWindow) {
      mainWindow.webContents.send('share-active-lyric');
    }
  });

  // Nudge shortcuts for Wallpaper Style 3 positioning
  const nudgeStep = 1;
  globalShortcut.register('CommandOrControl+Shift+Left', () => {
    if (mainWindow) mainWindow.webContents.send('nudge-overlay', -nudgeStep, 0);
  });
  globalShortcut.register('CommandOrControl+Shift+Right', () => {
    if (mainWindow) mainWindow.webContents.send('nudge-overlay', nudgeStep, 0);
  });
  globalShortcut.register('CommandOrControl+Shift+Up', () => {
    if (mainWindow) mainWindow.webContents.send('nudge-overlay', 0, -nudgeStep);
  });
  globalShortcut.register('CommandOrControl+Shift+Down', () => {
    if (mainWindow) mainWindow.webContents.send('nudge-overlay', 0, nudgeStep);
  });

  // Register global media keys and custom shortcuts
  try {
    globalShortcut.register('MediaPlayPause', () => {
      if (mainWindow) mainWindow.webContents.send('tray-playback-control', 'play-pause');
    });
    globalShortcut.register('MediaNextTrack', () => {
      if (mainWindow) mainWindow.webContents.send('tray-playback-control', 'next');
    });
    globalShortcut.register('MediaPreviousTrack', () => {
      if (mainWindow) mainWindow.webContents.send('tray-playback-control', 'previous');
    });
    globalShortcut.register('CommandOrControl+Alt+Space', () => {
      if (mainWindow) mainWindow.webContents.send('tray-playback-control', 'play-pause');
    });
    globalShortcut.register('CommandOrControl+Alt+Right', () => {
      if (mainWindow) mainWindow.webContents.send('tray-playback-control', 'next');
    });
    globalShortcut.register('CommandOrControl+Alt+Left', () => {
      if (mainWindow) mainWindow.webContents.send('tray-playback-control', 'previous');
    });
  } catch (err) {
    console.error("Failed to register media shortcuts:", err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Only quit if user explicitly requested it via tray > Quit.
  // Otherwise keep the app alive in the system tray.
  if (forceQuit) {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Clean up global shortcuts & tray
  globalShortcut.unregisterAll();
  if (tray) {
    tray.destroy();
    tray = null;
  }
  if (localPlaybackProcess) {
    localPlaybackProcess.kill();
    localPlaybackProcess = null;
  }
  if (localPlaybackControllerProcess) {
    localPlaybackControllerProcess.kill();
    localPlaybackControllerProcess = null;
  }
  if (edgeGlowWindow && !edgeGlowWindow.isDestroyed()) {
    edgeGlowWindow.close();
  }
});


// ── Taskbar IPC: forward lyrics and config to taskbar window ──────────────
ipcMain.on('update-taskbar-lyric', (event, data) => {
  if (taskbarWindow && !taskbarWindow.isDestroyed()) {
    taskbarWindow.webContents.send('update-taskbar-lyric', data);
  }
});

ipcMain.on('sync-taskbar-config', (event, config) => {
  if (taskbarWindow && !taskbarWindow.isDestroyed()) {
    taskbarWindow.webContents.send('sync-taskbar-config', config);
  }
});

// Persist lyric text offset (drag position within window)
ipcMain.on('tb-save-offset', (event, offsetX) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tb-offset-saved', offsetX);
  }
});

// Restore main app window when clicking taskbar lyrics
ipcMain.on('tb-open-app', () => {
  restoreNormalWindow();
});

// Toggle click-through on the taskbar overlay window.
// ignore=true  → clicks pass through to taskbar (default, used everywhere except over lyrics)
// ignore=false → clicks captured (only when mouse is hovering the lyric text)
ipcMain.on('tb-click-through', (event, ignore) => {
  if (taskbarWindow && !taskbarWindow.isDestroyed()) {
    taskbarWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

// Legacy handler — kept for compatibility with main renderer sending syncLayout
ipcMain.on('sync-taskbar-mode-state', (event, state) => {
  if (typeof state === 'boolean') {
    updateTrayMenu(state);
  }
  // Layout is now driven entirely by tb-set-width from the taskbar renderer itself
});

ipcMain.handle('load-config', async () => {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const data = await fs.promises.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read config:", err);
    return null;
  }
});

ipcMain.handle('save-config', async (event, config) => {
  const configPath = getConfigPath();
  try {
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Failed to save config:", err);
    return false;
  }
});

ipcMain.handle('reset-config', async () => {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      await fs.promises.unlink(configPath);
      // Clear all session cookies so the user is actually logged out of Spotify in the Electron browser
      const { session } = require('electron');
      await session.defaultSession.clearStorageData({ storages: ['cookies'] });
      return true;
    } catch (err) {
      console.error("Failed to delete config:", err);
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

// 3. Window State Controllers IPC Handlers
ipcMain.on('set-click-through', (event, ignore) => {
  if (mainWindow && !isTaskbarMode) {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

ipcMain.on('sync-taskbar-layout', (event, layout) => {
  applyTaskbarWindowLayout(layout);
});

ipcMain.on('set-always-on-top', (event, alwaysOnTop) => {
  if (mainWindow && !isTaskbarMode) {
    if (alwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    } else {
      mainWindow.setAlwaysOnTop(false);
    }
  }
});

// Wallpaper Mode — compile wallpaper_helper.cs to exe on first run for fast attach/detach
const { execFileSync, execFile: execFileAsync } = require('child_process');
const os = require('os');
const wallpaperExePath = path.join(os.tmpdir(), 'lyricflow_wallpaper_helper.exe');
let wallpaperHelperReady = false;

function ensureWallpaperHelper() {
  if (wallpaperHelperReady) return true;
  if (fs.existsSync(wallpaperExePath)) { wallpaperHelperReady = true; return true; }
  try {
    const csPath = getScriptPath('wallpaper_helper.cs');
    if (!fs.existsSync(csPath)) return false;
    // Use csc.exe from .NET Framework (ships with every Windows install)
    const cscPaths = [
      'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
      'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
    ];
    const csc = cscPaths.find(p => fs.existsSync(p));
    if (!csc) return false;
    execFileSync(csc, ['/nologo', '/target:exe', `/out:${wallpaperExePath}`, csPath], { timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] });
    wallpaperHelperReady = fs.existsSync(wallpaperExePath);
    console.log('[Wallpaper] Helper compiled to', wallpaperExePath);
    return wallpaperHelperReady;
  } catch (e) {
    console.warn('[Wallpaper] Failed to compile helper, falling back to PS1:', e.message);
    return false;
  }
}

function runWallpaperHelper(hwnd, mode, callback) {
  if (ensureWallpaperHelper()) {
    // Fast path: native exe, ~20ms cold start
    execFileAsync(wallpaperExePath, [hwnd, mode], (err, stdout) => {
      if (err) console.error(`Wallpaper ${mode} (exe) error:`, err.message);
      else console.log(`Wallpaper ${mode} (exe):`, stdout.trim());
      if (callback) callback(err);
    });
  } else {
    // Slow fallback: PowerShell, ~700ms cold start
    const scriptPath = getScriptPath('wallpaper.ps1');
    execFileAsync('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath, '-HandleString', hwnd, '-Mode', mode
    ], (err, stdout) => {
      if (err) console.error(`Wallpaper ${mode} (ps1) error:`, err.message);
      else console.log(`Wallpaper ${mode} (ps1):`, stdout.trim());
      if (callback) callback(err);
    });
  }
}

// Pre-compile on app start so first toggle is instant
app.whenReady().then(() => { setTimeout(ensureWallpaperHelper, 3000); });

// Wallpaper Mode IPC Handlers
ipcMain.on('set-wallpaper-mode', (event, enabled) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const { screen } = require('electron');

  if (enabled) {
    // Resize to cover full primary display first
    const primaryDisplay = screen.getPrimaryDisplay();
    const { bounds } = primaryDisplay;
    mainWindow.setResizable(true);
    mainWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
    mainWindow.setSkipTaskbar(true);
    mainWindow.setAlwaysOnTop(false); // Must NOT be always-on-top for WorkerW embed to work

    const hwnd = mainWindow.getNativeWindowHandle().readBigInt64LE(0).toString();
    runWallpaperHelper(hwnd, 'attach');
  } else {
    const hwnd = mainWindow.getNativeWindowHandle().readBigInt64LE(0).toString();
    runWallpaperHelper(hwnd, 'detach');
    
    // Defer the restoration slightly. If the user is transitioning to Taskbar mode,
    // the next IPC will set isTaskbarMode=true and hide the window.
    // If they are just returning to Normal mode, this will properly restore the bounds and styles.
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (!isTaskbarMode) {
        restoreNormalWindow();
      }
    }, 50);
  }
  mainWindow.webContents.send('set-wallpaper-mode-state', enabled);
});

ipcMain.on('start-wallpaper-edit', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setIgnoreMouseEvents(false);
  const hwnd = mainWindow.getNativeWindowHandle().readBigInt64LE(0).toString();
  // Temporarily detach so it pops over desktop icons for editing
  runWallpaperHelper(hwnd, 'detach');
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.webContents.send('wallpaper-edit-started');
});

ipcMain.on('end-wallpaper-edit', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setAlwaysOnTop(false);
  const hwnd = mainWindow.getNativeWindowHandle().readBigInt64LE(0).toString();
  // Re-attach behind desktop icons
  runWallpaperHelper(hwnd, 'attach');
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.webContents.send('wallpaper-edit-ended');
});

ipcMain.handle('get-desktop-wallpaper', async () => {
  try {
    const { execSync } = require('child_process');
    const result = execSync(
      'powershell -NoProfile -Command "(Get-ItemProperty -Path \'HKCU:\\Control Panel\\Desktop\' -Name Wallpaper).Wallpaper"',
      { encoding: 'utf8', timeout: 3000 }
    ).trim();
    return result || null;
  } catch (e) {
    return null;
  }
});


// Edge Glow Window Controller
ipcMain.on('set-edge-glow', (event, enabled, color) => {
  if (enabled) {
    if (!edgeGlowWindow || edgeGlowWindow.isDestroyed()) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { bounds } = primaryDisplay;
      
      edgeGlowWindow = new BrowserWindow({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        focusable: false,
        webPreferences: {
          preload: path.join(__dirname, 'preload_edge_glow.js'),
          contextIsolation: true,
          nodeIntegration: false
        }
      });
      
      edgeGlowWindow.setIgnoreMouseEvents(true, { forward: true });
      edgeGlowWindow.setAlwaysOnTop(true, 'screen-saver');
      edgeGlowWindow.loadFile(path.join(__dirname, 'src', 'edge_glow.html')).then(() => {
        if (color) edgeGlowWindow.webContents.send('update-edge-glow-color', color);
      });
    } else {
      if (color) edgeGlowWindow.webContents.send('update-edge-glow-color', color);
    }
  } else {
    if (edgeGlowWindow && !edgeGlowWindow.isDestroyed()) {
      edgeGlowWindow.close();
      edgeGlowWindow = null;
    }
  }
});

// ── Taskbar bounds helpers ─────────────────────────────────────────────────
function getTaskbarBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { bounds, workArea } = primaryDisplay;

  let x = bounds.x, y = bounds.y + workArea.height;
  let width = bounds.width, height = bounds.height - workArea.height;

  if (workArea.y > bounds.y) {          // taskbar on top
    y = bounds.y; height = workArea.y - bounds.y;
  } else if (workArea.x > bounds.x) {   // taskbar on left
    x = bounds.x; width = workArea.x - bounds.x; y = bounds.y; height = bounds.height;
  } else if (workArea.width < bounds.width) { // taskbar on right
    x = bounds.x + workArea.width; width = bounds.width - workArea.width; y = bounds.y; height = bounds.height;
  }

  if (height <= 0 || width <= 0) {      // auto-hide fallback
    height = 48; width = bounds.width; y = bounds.height - 48; x = bounds.x;
  }
  return { x, y, width, height };
}

// ── Create / destroy taskbar window ───────────────────────────────────────
function createTaskbarWindow() {
  if (taskbarWindow) return;

  const strip = getTaskbarBounds();

  taskbarWindow = new BrowserWindow({
    x: strip.x, y: strip.y,
    width: strip.width, height: strip.height,
    frame: false,
    transparent: true,
    resizable: false,
    thickFrame: false,
    type: 'toolbar',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload_taskbar.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  taskbarWindow.loadFile(path.join(__dirname, 'src', 'taskbar.html'));
  taskbarWindow.setAlwaysOnTop(true, 'screen-saver');

  taskbarWindow.webContents.once('did-finish-load', () => {
    if (taskbarWindow && !taskbarWindow.isDestroyed()) {
      // Start in click-through mode — clicks pass through to taskbar.
      // forward:true ensures mousemove still reaches the renderer so it can
      // detect when the cursor enters the lyric text and disable click-through.
      taskbarWindow.setIgnoreMouseEvents(true, { forward: true });
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('taskbar-mode-ready');
    }
  });
}

function applyTaskbarInteractionMode() {
  if (!taskbarWindow || !isTaskbarMode) return;
  if (fullscreenLyricsEnabled) {
    taskbarWindow.setFocusable(false);
    taskbarWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    taskbarWindow.setFocusable(true);
    taskbarWindow.setIgnoreMouseEvents(false);
  }
}

function destroyTaskbarWindow() {
  if (taskbarWindow && !taskbarWindow.isDestroyed()) {
    taskbarWindow.close();
  }
  taskbarWindow = null;
}

function restoreNormalWindow(fromTray = false) {
  if (!mainWindow) return;
  isTaskbarMode = false;
  destroyTaskbarWindow();

  mainWindow.setFocusable(true);
  mainWindow.setSkipTaskbar(false);
  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setOpacity(1);

  if (normalBounds) {
    mainWindow.setBounds(normalBounds);
  } else {
    mainWindow.setSize(720, 560);
    mainWindow.center();
  }

  if (!fromTray) {
    mainWindow.show();
    mainWindow.focus();
  }
  mainWindow.webContents.send('window-restored');
  mainWindow.webContents.send('force-normal-mode');
  updateTrayMenu(false);
}

ipcMain.on('set-taskbar-mode', (event, enabled, fromTray = false) => {
  if (!mainWindow) return;
  if (isTaskbarMode === enabled) {
    updateTrayMenu(enabled); 
    return;
  }
  isTaskbarMode = enabled;
  updateTrayMenu(enabled);
  
  if (enabled) {
    // Save normal window size/position
    const currentBounds = mainWindow.getBounds();
    if (currentBounds.height > 100 && !mainWindow.isMinimized()) {
      normalBounds = currentBounds;
    }
    
    // Hide the main window instead of resizing it
    mainWindow.hide();
    mainWindow.setOpacity(0); // Aggressive hide to prevent ghost windows
    
    // Forcefully hide again after a short delay in case OS events (like SetParent or SkipTaskbar) unhide it
    setTimeout(() => {
      if (isTaskbarMode && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
      }
    }, 150);
    
    createTaskbarWindow();
  } else {
    restoreNormalWindow(fromTray);
  }
});

// Query registry to find taskbar colors and contrast
ipcMain.handle('get-taskbar-color', () => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ theme: 'dark', color: '#ffffff' });
      return;
    }
    
    // Run PowerShell queries in parallel or sequence to check personalization settings
    const cmd = 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v SystemUsesLightTheme && reg query "HKCU\\Software\\Microsoft\\Windows\\DWM" /v ColorizationColor && reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v ColorPrevalence';
    
    exec(cmd, (error, stdout) => {
      if (error) {
        resolve({ theme: 'dark', color: '#ffffff' });
        return;
      }
      
      let systemUsesLightTheme = 0; // default dark
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
      
      // If taskbar uses accent color
      if (colorPrevalence === 1 && colorizationColor) {
        const colorVal = parseInt(colorizationColor, 16);
        // colorizationColor is usually ARGB (0xAARRGGBB) or ABGR
        // Let's parse it safely
        const r = (colorVal >> 16) & 0xff;
        const g = (colorVal >> 8) & 0xff;
        const b = colorVal & 0xff;
        
        // Calculate contrast/luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const textColor = luminance > 0.5 ? '#121212' : '#ffffff';
        resolve({
          theme: luminance > 0.5 ? 'light' : 'dark',
          color: textColor,
          bgColor: `rgba(${r}, ${g}, ${b}, 0.85)`,
          accentColor: `rgb(${r}, ${g}, ${b})`
        });
      } else {
        // Default taskbar color
        if (isDarkTheme) {
          resolve({ theme: 'dark', color: '#ffffff', bgColor: 'rgba(32, 32, 32, 0.75)' });
        } else {
          resolve({ theme: 'light', color: '#121212', bgColor: 'rgba(243, 243, 243, 0.75)' });
        }
      }
    });
  });
});

ipcMain.on('close-app', () => {
  // Minimize to taskbar in normal mode, hide to tray in taskbar mode
  if (mainWindow) {
    if (isTaskbarMode) {
      mainWindow.hide();
    } else {
      mainWindow.setSkipTaskbar(false);
      mainWindow.minimize();
    }
  }
});

ipcMain.on('minimize-app', () => {
  if (mainWindow) {

    if (!isTaskbarMode) mainWindow.setSkipTaskbar(false);
    setTimeout(() => {
      mainWindow.minimize();
    }, 50);
  }
});

ipcMain.handle('fetch-genius-fact', async (event, trackName, artistName) => {
  try {
    const cleanArtist = artistName.replace(/VEVO$/i, '').replace(/- Topic$/i, '').replace(/Official$/i, '').trim() || artistName;
    const cleanTrack = trackName.replace(/\[.*?\]/g, '').replace(/\(.*?(Official|Audio|Video).*?\)/ig, '').replace(/ - (Remastered|Radio Edit|Live|Instrumental|Acoustic|Single Version).*/i, '').trim() || trackName;
    
    const searchUrl = `https://genius.com/api/search/multi?per_page=1&q=${encodeURIComponent(cleanArtist + ' ' + cleanTrack)}`;
    const searchRes = await fetch(searchUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(5000) 
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    
    let songId = null;
    const sections = searchData.response?.sections || [];
    for (const section of sections) {
      if (section.type === "song" || section.type === "top_hit") {
        for (const hit of section.hits) {
          if (hit.type === "song" && hit.result) {
            songId = hit.result.id;
            break;
          }
        }
      }
      if (songId) break;
    }
    
    if (!songId) return null;
    
    const factUrl = `https://genius.com/api/songs/${songId}?text_format=plain`;
    const factRes = await fetch(factUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(5000) 
    });
    if (!factRes.ok) return null;
    const songData = await factRes.json();
    
    return songData.response?.song?.description?.plain || null;
  } catch (e) {
    console.error("Failed to fetch Genius fact in main:", e);
    return null;
  }
});

ipcMain.handle('get-genius-annotations', async (event, artistName, trackName) => {
  try {
    const cleanArtist = artistName.replace(/VEVO$/i, '').replace(/- Topic$/i, '').replace(/Official$/i, '').trim() || artistName;
    const cleanTrack = trackName.replace(/\[.*?\]/g, '').replace(/\(.*?(Official|Audio|Video).*?\)/ig, '').replace(/ - (Remastered|Radio Edit|Live|Instrumental|Acoustic|Single Version).*/i, '').trim() || trackName;
    
    const searchUrl = `https://genius.com/api/search/multi?per_page=1&q=${encodeURIComponent(cleanArtist + ' ' + cleanTrack)}`;
    const searchRes = await fetch(searchUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(5000) 
    });
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    
    let songId = null;
    const sections = searchData.response?.sections || [];
    for (const section of sections) {
      if (section.type === "song" || section.type === "top_hit") {
        for (const hit of section.hits) {
          if (hit.type === "song" && hit.result) {
            songId = hit.result.id;
            break;
          }
        }
      }
      if (songId) break;
    }
    
    if (!songId) return [];
    
    const referentsUrl = `https://genius.com/api/referents?song_id=${songId}&text_format=plain`;
    const refRes = await fetch(referentsUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(5000) 
    });
    if (!refRes.ok) return [];
    const refData = await refRes.json();
    
    const annotations = [];
    if (refData.response?.referents) {
      for (const ref of refData.response.referents) {
        if (ref.fragment && ref.annotations && ref.annotations[0] && ref.annotations[0].body) {
          annotations.push({
            fragment: ref.fragment,
            text: ref.annotations[0].body.plain
          });
        }
      }
    }
    return annotations;
  } catch (e) {
    console.error("Failed to fetch Genius annotations:", e);
    return [];
  }
});





// Local Playback IPC Handlers
ipcMain.handle('get-local-playback', () => {
  return mockSpotifyPlaybackState(lastLocalPlaybackState);
});

ipcMain.handle('get-desktop-sources', async () => {
  const { desktopCapturer } = require('electron');
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  return sources.map(s => ({ id: s.id, name: s.name }));
});

ipcMain.on('trigger-local-playback-control', (event, action, positionMs = 0) => {
  if (!['play-pause', 'next', 'previous', 'seek'].includes(action)) {
    console.warn(`[IPC] trigger-local-playback-control blocked invalid action: ${action}`);
    return;
  }
  if (localPlaybackControllerProcess && localPlaybackControllerProcess.stdin.writable && action !== 'seek') {
    localPlaybackControllerProcess.stdin.write(action + '\n');
  } else {
    // Fallback or one-off runs
    const scriptPath = getScriptPath('smtc_control.ps1');
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-action', action];
    if (action === 'seek') {
      args.push('-position');
      args.push(positionMs.toString());
    }
    spawn('powershell.exe', args);
  }
});


ipcMain.on('set-fullscreen-lyrics', (event, enabled) => {
  fullscreenLyricsEnabled = enabled;
  if (isTaskbarMode && taskbarWindow && !taskbarWindow.isDestroyed()) {
    if (enabled) {
      // Fullscreen mode: expand to full taskbar strip
      taskbarWindow.setBounds(getTaskbarBounds());
    }
    applyTaskbarInteractionMode();
  }
});

// 4. Token Refresh Logic (PKCE - no client secret needed)
ipcMain.handle('refresh-token', async () => {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    throw new Error("No configuration found");
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    throw new Error("Invalid configuration file");
  }

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refresh_token,
      client_id: config.client_id
    })
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  const tokenData = await tokenRes.json();
  config.access_token = tokenData.access_token;
  if (tokenData.refresh_token) {
    config.refresh_token = tokenData.refresh_token;
  }
  config.expires_at = Math.floor(Date.now() / 1000) + tokenData.expires_in;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  return config.access_token;
});

// Last.fm API Handler
ipcMain.handle('lastfm-api', async (event, { method, params, apiKey, apiSecret, sessionKey }) => {
  try {
    params = params || {};
    params.api_key = apiKey;
    params.method = method;
    if (sessionKey) {
      params.sk = sessionKey;
    }

    // Sort params alphabetically by key
    const sortedKeys = Object.keys(params).sort();
    let sigString = '';
    for (const key of sortedKeys) {
      if (key !== 'format') {
        sigString += `${key}${params[key]}`;
      }
    }
    sigString += apiSecret;

    // Calculate api_sig
    params.api_sig = md5(sigString);
    params.format = 'json';

    const usePost = ['auth.getSession', 'track.updateNowPlaying', 'track.scrobble', 'track.love', 'track.unlove'].includes(method);
    
    let url = 'https://ws.audioscrobbler.com/2.0/';
    let fetchOptions = { method: usePost ? 'POST' : 'GET' };

    if (usePost) {
      fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      fetchOptions.body = new URLSearchParams(params).toString();
    } else {
      url += '?' + new URLSearchParams(params).toString();
    }

    const res = await fetch(url, fetchOptions);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Last.fm API Error:', err);
    throw err;
  }
});

ipcMain.handle('get-access-token', async (event, spDc) => {
  try {
    const res = await fetch("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
      headers: {
        "Cookie": `sp_dc=${spDc}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "App-Platform": "WebPlayer"
      }
    });
    if (res.ok) {
      const data = await res.json();
      return data.accessToken;
    }
    return null;
  } catch (err) {
    console.error("Failed to fetch access token:", err);
    return null;
  }
});

// 5. OAuth and Session Management
ipcMain.handle('login-via-web', () => {
  return new Promise((resolve) => {
    const loginWin = new BrowserWindow({
      width: 500,
      height: 700,
      show: true,
      title: 'Login to Spotify',
      webPreferences: {
        // No preload — login window only needs cookie access, not the full API bridge
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Fix Google/Apple/Facebook login blocks by masquerading as a standard browser
    loginWin.webContents.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

    loginWin.loadURL('https://accounts.spotify.com/en/login?continue=https:%2F%2Fopen.spotify.com%2F');

    const checkCookie = setInterval(async () => {
      if (loginWin.isDestroyed()) {
        clearInterval(checkCookie);
        return;
      }
      
      const cookies = await loginWin.webContents.session.cookies.get({ domain: '.spotify.com' });
      const spDc = cookies.find(c => c.name === 'sp_dc');
      
      if (spDc) {
        clearInterval(checkCookie);
        const config = {
          sp_dc: spDc.value,
          localMode: false // Web API polling for Premium users
        };
        
        // Save config
        fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf8');
        
        loginWin.close();
        resolve(config);
      }
    }, 1000);

    loginWin.on('closed', () => {
      clearInterval(checkCookie);
      resolve(null);
    });
  });
});

ipcMain.handle('logout', async () => {
  await session.defaultSession.clearStorageData();
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
});

ipcMain.handle('start-oauth-server', (event, { clientId, codeVerifier, codeChallenge }) => {
  return new Promise((resolve, reject) => {
    if (oauthServer) {
      oauthServer.close();
    }

    oauthServer = http.createServer(async (req, res) => {
      const parsedUrl = new URL(req.url, 'http://127.0.0.1:4882');
      
      if (parsedUrl.pathname === '/callback') {
        const authCode = parsedUrl.searchParams.get('code');
        
        if (authCode) {
          try {
            // Exchange authorization code for tokens using PKCE verifier
            const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                client_id: clientId,
                grant_type: 'authorization_code',
                code: authCode,
                redirect_uri: 'http://127.0.0.1:4882/callback',
                code_verifier: codeVerifier
              })
            });

            if (!tokenRes.ok) {
              const errorText = await tokenRes.text();
              throw new Error(`Token exchange failed: ${errorText}`);
            }

            const tokenData = await tokenRes.json();
            
            const config = {
              client_id: clientId,
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in
            };

            // Save config file
            fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf8');

            // Send success response
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end("<html><body style=\"font-family: sans-serif; background: #121212; color: #1db954; text-align: center; padding-top: 50px;\"><h1>Connection Successful!</h1><p style=\"color: #b3b3b3;\">You can now close this tab and return to the LyricFlow app.</p></body></html>");
            
            // Clean up and resolve
            oauthServer.close();
            oauthServer = null;
            resolve(config);
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<html><body style="font-family: sans-serif; background: #121212; color: #ff5555; text-align: center; padding-top: 50px;"><h1>Connection Failed</h1><p style="color: #b3b3b3;">Error: ${err.message}</p></body></html>`);
            reject(err.message);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end("Missing authorization code");
          reject("Authorization code missing in callback URL");
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end("Not Found");
      }
    });

    oauthServer.listen(4882, '127.0.0.1', (err) => {
      if (err) {
        reject(`Failed to start local server on port 4882: ${err.message}`);
        return;
      }

      // Open Spotify auth page in default system browser with PKCE parameters and modify state scope
      // Added user-top-read and user-library-read for the Offline Lyrics Cache Manager
      const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=user-read-currently-playing%20user-read-playback-state%20user-modify-playback-state%20user-top-read%20user-library-read&redirect_uri=http://127.0.0.1:4882/callback&code_challenge_method=S256&code_challenge=${codeChallenge}`;
      shell.openExternal(authUrl);

      // Timeout after 5 minutes to prevent the port from being held forever
      setTimeout(() => {
        if (oauthServer) {
          oauthServer.close();
          oauthServer = null;
          reject('OAuth authorization timed out after 5 minutes. Please try again.');
        }
      }, 5 * 60 * 1000);
    });
  });
});

// Web Player Token logic removed because the residential IP is permanently banned by Spotify Varnish.



ipcMain.on('show-next-up', (event, track) => {
  createNextUpWindow(track);
});

ipcMain.on('update-next-up-playcount', (event, playcount) => {
  if (nextUpWindow && !nextUpWindow.isDestroyed() && playcount > 0) {
    nextUpWindow.webContents.executeJavaScript(`
      const pc = document.getElementById('nextup-playcount');
      if (pc) pc.textContent = "Listened ${playcount} times";
    `).catch(() => {});
  }
});

// System Tray helper functions
function createTray() {
  if (tray) return;
  
  let icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
  // Resize to 16x16 for the system tray (large images won't render)
  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 16, height: 16 });
  }
  
  tray = new Tray(icon);
  tray.setToolTip('LyricFlow');

  tray.on('click', () => {
    if (mainWindow) {
      if (isTaskbarMode) {
        mainWindow.webContents.send('toggle-taskbar-mode-tray');
      } else {
        if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
          mainWindow.hide();
        } else {
          restoreNormalWindow();
        }
      }
    }
  });

  tray.on('right-click', () => {
    tray.popUpContextMenu();
  });
  
  updateTrayMenu(false);
}

function updateTrayMenu(isTaskbarMode) {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'LyricFlow', enabled: false },
    { type: 'separator' },
    {
      label: 'Open App',
      click: () => {
        restoreNormalWindow();
      }
    },
    { 
      label: isTaskbarMode ? 'Disable Taskbar Mode' : 'Enable Taskbar Mode',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('toggle-taskbar-mode-tray');
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Play / Pause', 
      click: () => {
        if (mainWindow) mainWindow.webContents.send('tray-playback-control', 'play-pause');
      }
    },
    { 
      label: 'Next Song', 
      click: () => {
        if (mainWindow) mainWindow.webContents.send('tray-playback-control', 'next');
      }
    },
    { 
      label: 'Previous Song', 
      click: () => {
        if (mainWindow) mainWindow.webContents.send('tray-playback-control', 'previous');
      }
    },
    { type: 'separator' },
    { 
      label: 'Show Settings', 
      click: () => {
        if (mainWindow) {
          restoreNormalWindow();
          mainWindow.webContents.send('tray-show-settings');
        }
      }
    },
    { 
      label: 'Quit', 
      click: () => {
        forceQuit = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
}

// Escaping utility for template interpolation to prevent syntax/HTML breakages
function escapeHtmlAndBackticks(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Next Up Slide-up Window helper function
function createNextUpWindow(track) {
  if (nextUpWindow && !nextUpWindow.isDestroyed()) {
    nextUpWindow.destroy();
  }
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  
  const width = 320;
  const height = 90;
  const x = workArea.x + workArea.width - width - 24;
  const y = workArea.y + workArea.height - height - 24;
  
  nextUpWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: { preload: __dirname + '/preload.js',
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  const escapedTitle = escapeHtmlAndBackticks(track.name);
  const escapedArtist = escapeHtmlAndBackticks(track.artist);
  const artUrl = track.albumArtUrl ? track.albumArtUrl.replace(/"/g, '&quot;') : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
        body {
          font-family: 'Outfit', sans-serif;
          background: transparent;
          color: #ffffff;
          overflow: hidden;
          padding: 10px;
        }
        .container {
          display: flex;
          align-items: center;
          background: rgba(22, 22, 22, 0.75);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          width: 100%;
          height: 100%;
          padding: 10px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          transform: translateY(120px);
          animation: slideUp 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes slideUp {
          to { transform: translateY(0); }
        }
        .art {
          width: 50px;
          height: 50px;
          border-radius: 6px;
          object-fit: cover;
          border: 1px solid rgba(255,255,255,0.1);
          margin-right: 12px;
          flex-shrink: 0;
        }
        .art-fallback {
          width: 50px;
          height: 50px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: rgba(255,255,255,0.4);
        }
        .info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }
        .badge {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #1db954;
        }
        .title {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .artist {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .playcount {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 2px;
          white-space: nowrap;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${artUrl ? `<img class="art" src="${artUrl}" />` : `
          <div class="art-fallback">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
        `}
        <div class="info">
          <span class="badge">Now Playing</span>
          <span class="title">${escapedTitle}</span>
          <span class="artist">${escapedArtist}</span>
          <span class="playcount" id="nextup-playcount"></span>
        </div>
      </div>
    </body>
    </html>
  `;
  
  nextUpWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  
  nextUpWindow.once('ready-to-show', () => {
    if (nextUpWindow && !nextUpWindow.isDestroyed()) {
      nextUpWindow.showInactive();
      nextUpWindow.setSkipTaskbar(true);
    }
  });
  
  setTimeout(() => {
    if (nextUpWindow && !nextUpWindow.isDestroyed()) {
      nextUpWindow.webContents.executeJavaScript(`
        const container = document.querySelector('.container');
        if (container) {
          container.style.transition = 'transform 0.4s cubic-bezier(0.5, 0, 0.75, 0)';
          container.style.transform = 'translateY(120px)';
        }
      `).catch(err => {
        console.error("executeJavaScript animation error:", err);
      }).then(() => {
        setTimeout(() => {
          if (nextUpWindow && !nextUpWindow.isDestroyed()) nextUpWindow.destroy();
        }, 400);
      });
    }
  }, 4200);
}

// ==========================================
// NEW FEATURES: Discord RPC & Translations
// ==========================================

let rpc = null;
let rpcReady = false;

ipcMain.on('init-discord-rpc', (event, clientId) => {
  try {
    if (rpc) return; // already init
    const DiscordRPC = require('discord-rpc');
    DiscordRPC.register(clientId);
    rpc = new DiscordRPC.Client({ transport: 'ipc' });
    
    rpc.on('ready', () => {
      rpcReady = true;
      console.log('Discord RPC Ready');
    });

    rpc.on('error', (err) => {
      // Silently catch rpc errors
    });

    rpc.on('disconnected', () => {
      rpcReady = false;
    });

    // Prevent IPCTransport from throwing unhandled connection closed errors
    if (rpc.transport) {
      rpc.transport.on('close', () => {
        rpcReady = false;
      });
    }
    
    rpc.login({ clientId }).catch(() => {
      // Discord not running, silently fail
    });
  } catch (err) {
    console.error('Failed to init Discord RPC:', err);
  }
});

ipcMain.on('update-discord-rpc', (event, data) => {
  if (!rpcReady || !rpc) return;
  try {
    if (data.clear) {
      rpc.clearActivity().catch(console.error);
      return;
    }

    const activity = {
      details: data.trackName ? `Listening to ${data.trackName}` : 'Idle',
      state: data.artistName ? data.artistName : 'Looking for lyrics...',
      instance: false,
    };
    
    if (data.albumArtUrl && data.albumArtUrl.startsWith('http')) {
      activity.largeImageKey = data.albumArtUrl;
      activity.largeImageText = data.albumName || 'LyricFlow';
    }
    
    // Omit smallImageKey entirely unless we know it's a valid uploaded asset
    
    rpc.setActivity(activity).catch(err => console.error("Discord RPC Activity Error:", err));
  } catch (err) {
    console.error('RPC update failed:', err);
  }
});



// Music News
ipcMain.handle('fetch-music-news', async (event, query) => {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } catch (err) {
    console.error("Music News Error:", err);
    throw err;
  }
});

// Translation
let translationCooldownUntil = 0;

ipcMain.handle('translate-text', async (event, text, targetLang, skipLang) => {
  if (Date.now() < translationCooldownUntil) {
    return { text: null, src: 'cooldown' };
  }
  try {
    // Replace unstable @vitalets/google-translate-api with a robust direct POST request
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'auto',
      tl: targetLang,
      dt: 't'
    });
    
    const body = new URLSearchParams({ q: text });
    
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: body.toString()
    });

    if (!response.ok) {
      throw new Error(`Google API returned ${response.status}`);
    }

    const data = await response.json();
    
    // data[0] contains an array of translated segments, data[2] is the detected language
    const fullTranslation = data[0].map(item => item[0]).join('');
    const srcLang = data[2] || 'unknown';
    
    // Skip translation if the song is already in the target language, 
    // OR if the song's language matches the user's explicit skip preference.
    if (srcLang.toLowerCase() === targetLang.toLowerCase() || (skipLang && skipLang !== 'none' && srcLang.toLowerCase() === skipLang.toLowerCase())) {
      return { text: null, src: srcLang };
    }
    
    return { text: fullTranslation, src: srcLang };
  } catch (err) {
    if (err.message && (err.message.includes('429') || err.message.includes('Too Many Requests'))) {
      translationCooldownUntil = Date.now() + 3600000; // 1 hour
    } else {
      console.error('Translation failed:', err);
    }
    return null;
  }
});


