const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  setClickThrough: (ignore) => ipcRenderer.send('set-click-through', ignore),
  syncTaskbarLayout: (layout) => ipcRenderer.send('sync-taskbar-layout', layout),
  setAlwaysOnTop: (alwaysOnTop) => ipcRenderer.send('set-always-on-top', alwaysOnTop),
  setEdgeGlow: (enabled, color) => ipcRenderer.send('set-edge-glow', enabled, color),
  refreshToken: () => ipcRenderer.invoke('refresh-token'),
  startOAuthServer: (clientId, codeVerifier, codeChallenge) => ipcRenderer.invoke('start-oauth-server', { clientId, codeVerifier, codeChallenge }),
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  getTaskbarColor: () => ipcRenderer.invoke('get-taskbar-color'),
  setTaskbarMode: (enabled, fromTray = false) => ipcRenderer.send('set-taskbar-mode', enabled, fromTray),
  setWallpaperMode: (enabled) => ipcRenderer.send('set-wallpaper-mode', enabled),
  syncTaskbarModeState: (isTaskbarMode) => ipcRenderer.send('sync-taskbar-mode-state', isTaskbarMode),
  syncTaskbarConfig: (config) => ipcRenderer.send('sync-taskbar-config', config),
  startTaskbarDrag: (data) => ipcRenderer.send('start-taskbar-drag', data),
  stopTaskbarDrag: () => ipcRenderer.send('stop-taskbar-drag'),
  updateTaskbarLyric: (data) => ipcRenderer.send('update-taskbar-lyric', data),
  showNextUp: (track) => ipcRenderer.send('show-next-up', track),
  updateNextUpPlaycount: (playcount) => ipcRenderer.send('update-next-up-playcount', playcount),
  getLocalPlayback: () => ipcRenderer.invoke('get-local-playback'),
  triggerLocalPlaybackControl: (action, position) => ipcRenderer.send('trigger-local-playback-control', action, position),
  selectBackgroundFile: () => ipcRenderer.invoke('select-background-file'),
  setFullscreenLyrics: (enabled) => ipcRenderer.send('set-fullscreen-lyrics', enabled),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getDesktopWallpaper: () => ipcRenderer.invoke('get-desktop-wallpaper'),
  loginViaWeb: () => ipcRenderer.invoke('login-via-web'),
  getAccessToken: (spDc) => ipcRenderer.invoke('get-access-token', spDc),
  logout: () => ipcRenderer.invoke('logout'),
  lastfmApi: (method, params, apiKey, apiSecret, sessionKey) => ipcRenderer.invoke('lastfm-api', { method, params, apiKey, apiSecret, sessionKey }),
  getGeniusFact: (artist, track) => ipcRenderer.invoke('get-genius-fact', artist, track),
  getGeniusAnnotations: (artist, track) => ipcRenderer.invoke('get-genius-annotations', artist, track),
  fetchGeniusFact: (trackName, artistName) => ipcRenderer.invoke('fetch-genius-fact', trackName, artistName),
  fetchGeniusLyrics: (trackName, artistName) => ipcRenderer.invoke('fetch-genius-lyrics', trackName, artistName),

  fetchSpotifyLyrics: (trackId, token) => ipcRenderer.invoke('fetch-spotify-lyrics', trackId, token),
  fetchNetEaseLyrics: (trackName, artistName) => ipcRenderer.invoke('fetch-netease-lyrics', trackName, artistName),
  
  // New features
  initDiscordRpc: (clientId) => ipcRenderer.send('init-discord-rpc', clientId),
  updateDiscordRpc: (data) => ipcRenderer.send('update-discord-rpc', data),
  translateText: (text, lang, skipLang) => ipcRenderer.invoke('translate-text', text, lang, skipLang),
  fetchMusicNews: (query) => ipcRenderer.invoke('fetch-music-news', query),

  // Listeners for main process events (removes previous listener to prevent accumulation)
  onToggleClickThrough: (callback) => {
    ipcRenderer.removeAllListeners('toggle-click-through-shortcut');
    ipcRenderer.on('toggle-click-through-shortcut', () => callback());
  },
  onWindowRestored: (callback) => {
    ipcRenderer.removeAllListeners('window-restored');
    ipcRenderer.on('window-restored', () => callback());
  },
  onForceNormalMode: (callback) => {
    ipcRenderer.removeAllListeners('force-normal-mode');
    ipcRenderer.on('force-normal-mode', () => callback());
  },
  onWallpaperModeState: (callback) => {
    ipcRenderer.removeAllListeners('set-wallpaper-mode-state');
    ipcRenderer.on('set-wallpaper-mode-state', (event, enabled) => callback(enabled));
  },
  onWallpaperEditStarted: (callback) => {
    ipcRenderer.removeAllListeners('wallpaper-edit-started');
    ipcRenderer.on('wallpaper-edit-started', () => callback());
  },
  onWallpaperEditEnded: (callback) => {
    ipcRenderer.removeAllListeners('wallpaper-edit-ended');
    ipcRenderer.on('wallpaper-edit-ended', () => callback());
  },
  startWallpaperEdit: () => ipcRenderer.send('start-wallpaper-edit'),
  endWallpaperEdit: () => ipcRenderer.send('end-wallpaper-edit'),
  onTrayPlaybackControl: (callback) => {
    ipcRenderer.removeAllListeners('tray-playback-control');
    ipcRenderer.on('tray-playback-control', (event, action) => callback(action));
  },
  onToggleTaskbarModeTray: (callback) => {
    ipcRenderer.removeAllListeners('toggle-taskbar-mode-tray');
    ipcRenderer.on('toggle-taskbar-mode-tray', () => callback());
  },
  onTrayShowSettings: (callback) => {
    ipcRenderer.removeAllListeners('tray-show-settings');
    ipcRenderer.on('tray-show-settings', () => callback());
  },
  onTrayEditWallpaper: (callback) => {
    ipcRenderer.removeAllListeners('tray-edit-wallpaper');
    ipcRenderer.on('tray-edit-wallpaper', () => callback());
  },
  onWallpaperEditStarted: (callback) => {
    ipcRenderer.removeAllListeners('wallpaper-edit-started');
    ipcRenderer.on('wallpaper-edit-started', () => callback());
  },
  onWallpaperEditEnded: (callback) => {
    ipcRenderer.removeAllListeners('wallpaper-edit-ended');
    ipcRenderer.on('wallpaper-edit-ended', () => callback());
  },
  onShowToast: (callback) => {
    ipcRenderer.removeAllListeners('show-toast');
    ipcRenderer.on('show-toast', (event, message) => callback(message));
  },
  onNudgeOverlay: (callback) => {
    ipcRenderer.removeAllListeners('nudge-overlay');
    ipcRenderer.on('nudge-overlay', (event, dx, dy) => callback(dx, dy));
  },
  onLocalPlaybackChange: (callback) => {
    ipcRenderer.removeAllListeners('local-playback-change');
    ipcRenderer.on('local-playback-change', (event, data) => callback(data));
  },
  onSmtcPlaybackStatus: (callback) => {
    ipcRenderer.removeAllListeners('smtc-playback-status');
    ipcRenderer.on('smtc-playback-status', (event, data) => callback(data));
  },
  onCopyActiveLyric: (callback) => {
    ipcRenderer.removeAllListeners('copy-active-lyric');
    ipcRenderer.on('copy-active-lyric', () => callback());
  },
  onShareActiveLyric: (callback) => {
    ipcRenderer.removeAllListeners('share-active-lyric');
    ipcRenderer.on('share-active-lyric', () => callback());
  },
  onTaskbarModeReady: (callback) => {
    ipcRenderer.removeAllListeners('taskbar-mode-ready');
    ipcRenderer.on('taskbar-mode-ready', () => callback());
  },
  onTaskbarDragEnded: (callback) => {
    ipcRenderer.removeAllListeners('taskbar-drag-ended');
    ipcRenderer.on('taskbar-drag-ended', (event, data) => callback(data));
  },
  onUpdateTaskbarLyric: (callback) => {
    ipcRenderer.removeAllListeners('update-taskbar-lyric');
    ipcRenderer.on('update-taskbar-lyric', (event, data) => callback(data));
  },
  onSyncTaskbarConfig: (callback) => {
    ipcRenderer.removeAllListeners('sync-taskbar-config');
    ipcRenderer.on('sync-taskbar-config', (event, data) => callback(data));
  }
});
