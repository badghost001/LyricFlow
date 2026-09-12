/**
 * LyricFlow Tauri Compatibility Bridge
 * Polyfills `window.electronAPI` to seamlessly map frontend calls to Tauri v2 Rust commands.
 */
(function () {
  if (!window.__TAURI_INTERNALS__) {
    // Not running inside Tauri (e.g. running in standard Electron)
    return;
  }

  const { invoke } = window.__TAURI__.core;
  const { listen, emit } = window.__TAURI__.event;

  const listeners = new Map();

  function registerListener(event, callback) {
    if (listeners.has(event)) {
      // Unlisten previous
      listeners.get(event)();
      listeners.delete(event);
    }
    listen(event, (e) => callback(e.payload)).then((unlisten) => {
      listeners.set(event, unlisten);
    });
  }

  window.electronAPI = {
    loadConfig: () => invoke('load_config'),
    saveConfig: (config) => invoke('save_config', { config }),
    resetConfig: () => invoke('reset_config'),
    setClickThrough: (ignore) => invoke('set_click_through', { ignore }),
    syncTaskbarLayout: (layout) => emit('sync-taskbar-layout', layout),
    setAlwaysOnTop: (alwaysOnTop) => invoke('set_always_on_top', { alwaysOnTop }),
    setEdgeGlow: (enabled, color) => invoke('set_edge_glow', { enabled, color }),
    refreshToken: () => Promise.resolve(null),
    startOAuthServer: () => Promise.resolve(null),
    closeApp: () => invoke('close_app'),
    minimizeApp: () => invoke('minimize_app'),
    getTaskbarColor: () => Promise.resolve(null),
    setTaskbarMode: (enabled, fromTray = false) => invoke('set_taskbar_mode', { enabled, fromTray }),
    setWallpaperMode: (enabled) => invoke('set_wallpaper_mode', { enabled }),
    syncTaskbarModeState: (isTaskbarMode) => emit('sync-taskbar-mode-state', isTaskbarMode),
    syncTaskbarConfig: (config) => emit('sync-taskbar-config', config),
    startTaskbarDrag: (data) => emit('start-taskbar-drag', data),
    stopTaskbarDrag: () => emit('stop-taskbar-drag'),
    updateTaskbarLyric: (data) => emit('update-taskbar-lyric', data),
    showNextUp: () => {},
    showNowPlayingNotification: (track) => invoke('show_now_playing_notification', { track }),
    updateNextUpPlaycount: () => {},
    getLocalPlayback: () => invoke('get_local_playback'),
    triggerLocalPlaybackControl: (action, position = 0) => invoke('trigger_playback_control', { action, positionMs: position }),
    selectBackgroundFile: () => Promise.resolve(null),
    setFullscreenLyrics: () => {},
    getAutoLaunch: () => Promise.resolve(false),
    setAutoLaunch: () => Promise.resolve(false),
    getDesktopWallpaper: () => invoke('get_desktop_wallpaper'),
    loginViaWeb: () => Promise.resolve(null),
    getAccessToken: () => Promise.resolve(null),
    logout: () => Promise.resolve(),
    lastfmApi: (method, params, apiKey, apiSecret, sessionKey) =>
      invoke('lastfm_api', { data: { method, params, apiKey, apiSecret, sessionKey } }),
    getGeniusFact: (artist, track) => invoke('get_genius_fact', { artist, track }),
    getGeniusAnnotations: (artist, track) => invoke('get_genius_annotations', { artist, track }),
    fetchGeniusFact: (trackName, artistName) => invoke('fetch_genius_fact', { trackName, artistName }),
    fetchGeniusLyrics: (trackName, artistName) => invoke('fetch_genius_lyrics', { trackName, artistName }),
    fetchSpotifyLyrics: (trackId, token) => invoke('fetch_spotify_lyrics', { trackId, token }),
    fetchNetEaseLyrics: (trackName, artistName) => invoke('fetch_netease_lyrics', { trackName, artistName }),
    initDiscordRpc: (clientId) => invoke('init_discord_rpc', { clientId }),
    updateDiscordRpc: (data) => invoke('update_discord_rpc', { data }),
    translateText: (text) => Promise.resolve(text),
    fetchMusicNews: () => Promise.resolve([]),

    // Event Listeners
    onToggleClickThrough: (cb) => registerListener('toggle-click-through-shortcut', () => cb()),
    onWindowRestored: (cb) => registerListener('window-restored', () => cb()),
    onForceNormalMode: (cb) => registerListener('force-normal-mode', () => cb()),
    onWallpaperModeState: (cb) => registerListener('set-wallpaper-mode-state', (payload) => cb(payload)),
    onWallpaperEditStarted: (cb) => registerListener('wallpaper-edit-started', () => cb()),
    onWallpaperEditEnded: (cb) => registerListener('wallpaper-edit-ended', () => cb()),
    startWallpaperEdit: () => emit('wallpaper-edit-started'),
    endWallpaperEdit: () => emit('wallpaper-edit-ended'),
    onTrayPlaybackControl: (cb) => registerListener('tray-playback-control', (payload) => cb(payload)),
    onToggleTaskbarModeTray: (cb) => registerListener('toggle-taskbar-mode-tray', () => cb()),
    onTrayShowSettings: (cb) => registerListener('tray-show-settings', () => cb()),
    onTrayEditWallpaper: (cb) => registerListener('tray-edit-wallpaper', () => cb()),
    onShowToast: (cb) => registerListener('show-toast', (payload) => cb(payload)),
    onNudgeOverlay: (cb) => registerListener('nudge-overlay', (payload) => cb(payload.dx, payload.dy)),
    onLocalPlaybackChange: (cb) => registerListener('local-playback-change', (payload) => cb(payload)),
    onSmtcPlaybackStatus: (cb) => registerListener('smtc-playback-status', (payload) => cb(payload)),
    onCopyActiveLyric: (cb) => registerListener('copy-active-lyric', () => cb()),
    onShareActiveLyric: (cb) => registerListener('share-active-lyric', () => cb()),
    onTaskbarModeReady: (cb) => registerListener('taskbar-mode-ready', () => cb()),
    onTaskbarDragEnded: (cb) => registerListener('taskbar-drag-ended', (payload) => cb(payload)),
    onUpdateTaskbarLyric: (cb) => registerListener('update-taskbar-lyric', (payload) => cb(payload)),
    onSyncTaskbarConfig: (cb) => registerListener('sync-taskbar-config', (payload) => cb(payload)),
    onTbOffsetSaved: (cb) => registerListener('tb-offset-saved', (payload) => cb(payload)),
  };

  console.log('[LyricFlow] Tauri v2 bridge initialized successfully.');
})();
