/**
 * LyricFlow Tauri Compatibility Bridge
 * Polyfills `window.electronAPI`, `window.edgeGlowAPI`, and `window.taskbarAPI`
 * to seamlessly map frontend calls to Tauri v2 Rust commands.
 */
(function () {
  console.log('[LyricFlow Bridge] Initializing Tauri v2 bridge...');

  function getInvoke() {
    if (typeof window !== 'undefined') {
      if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
        return window.__TAURI__.core.invoke;
      }
      if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') {
        return window.__TAURI_INTERNALS__.invoke;
      }
    }
    return null;
  }

  function getEvent() {
    if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.event) {
      return window.__TAURI__.event;
    }
    return null;
  }

  async function safeInvoke(cmd, args = {}, fallback = null) {
    try {
      const fn = getInvoke();
      if (!fn) {
        return fallback;
      }
      return await fn(cmd, args);
    } catch (err) {
      console.warn(`[Tauri Bridge] invoke('${cmd}') warning/error:`, err);
      return fallback;
    }
  }

  async function safeEmit(event, payload) {
    try {
      const ev = getEvent();
      if (ev && typeof ev.emit === 'function') {
        return await ev.emit(event, payload);
      }
    } catch (err) {
      console.warn(`[Tauri Bridge] emit('${event}') warning/error:`, err);
    }
  }

  const listeners = new Map();

  function safeListen(event, callback) {
    try {
      const ev = getEvent();
      if (!ev || typeof ev.listen !== 'function') {
        // Retry shortly in case Tauri global event API is still initializing
        setTimeout(() => {
          const retryEv = getEvent();
          if (retryEv && typeof retryEv.listen === 'function') {
            retryEv.listen(event, (e) => {
              try { callback(e ? e.payload : null); } catch (cbErr) { console.error(`[Tauri Bridge] callback error for '${event}':`, cbErr); }
            }).then((unlisten) => {
              listeners.set(event, unlisten);
            }).catch((e) => console.warn(`[Tauri Bridge] retry listen failed for '${event}':`, e));
          }
        }, 150);
        return;
      }

      if (listeners.has(event)) {
        try { listeners.get(event)(); } catch (_) {}
        listeners.delete(event);
      }

      ev.listen(event, (e) => {
        try {
          callback(e ? e.payload : null);
        } catch (cbErr) {
          console.error(`[Tauri Bridge] Error in callback for event '${event}':`, cbErr);
        }
      }).then((unlisten) => {
        listeners.set(event, unlisten);
      }).catch((listenErr) => {
        console.warn(`[Tauri Bridge] Failed to listen to '${event}':`, listenErr);
      });
    } catch (err) {
      console.warn(`[Tauri Bridge] safeListen exception for '${event}':`, err);
    }
  }

  window.electronAPI = {
    loadConfig: () => safeInvoke('load_config', {}, null),
    saveConfig: (config) => safeInvoke('save_config', { config }, true),
    resetConfig: () => safeInvoke('reset_config', {}, null),
    setClickThrough: (ignore) => safeInvoke('set_click_through', { ignore }, null),
    syncTaskbarLayout: (layout) => safeEmit('sync-taskbar-layout', layout),
    setAlwaysOnTop: (alwaysOnTop) => safeInvoke('set_always_on_top', { alwaysOnTop }, null),
    setEdgeGlow: (enabled, color) => safeInvoke('set_edge_glow', { enabled, color }, null),
    refreshToken: () => safeInvoke('refresh_token', {}, null),
    startOAuthServer: (clientId, codeVerifier, codeChallenge) =>
      safeInvoke('start_oauth_server', { clientId, codeVerifier, codeChallenge }, null),
    closeApp: () => safeInvoke('close_app', {}, null),
    minimizeApp: () => safeInvoke('minimize_app', {}, null),
    getTaskbarColor: () => safeInvoke('get_taskbar_color', {}, { theme: 'dark', color: '#ffffff', accentColor: '#1DB954' }),
    setTaskbarMode: (enabled, fromTray = false) => safeInvoke('set_taskbar_mode', { enabled, fromTray }, null),
    setWallpaperMode: (enabled) => safeInvoke('set_wallpaper_mode', { enabled }, null),
    syncTaskbarModeState: (isTaskbarMode) => safeEmit('sync-taskbar-mode-state', isTaskbarMode),
    syncTaskbarConfig: (config) => safeEmit('sync-taskbar-config', config),
    startTaskbarDrag: (data) => safeEmit('start-taskbar-drag', data),
    stopTaskbarDrag: () => safeEmit('stop-taskbar-drag'),
    updateTaskbarLyric: (data) => safeEmit('update-taskbar-lyric', data),
    showNextUp: (track) => safeInvoke('show_now_playing_notification', { track }, null),
    showNowPlayingNotification: (track) => safeInvoke('show_now_playing_notification', { track }, null),
    updateNextUpPlaycount: () => {},
    getLocalPlayback: () => safeInvoke('get_local_playback', {}, null),
    triggerLocalPlaybackControl: (action, position = 0) =>
      safeInvoke('trigger_playback_control', { action, positionMs: position }, false),
    selectBackgroundFile: async () => {
      const res = await safeInvoke('select_background_file', {}, null);
      if (res) return res;
      return new Promise((resolve) => {
        let input = document.getElementById('input-bg-file');
        if (!input) {
          input = document.createElement('input');
          input.type = 'file';
          input.accept = 'video/mp4,video/webm,image/jpeg,image/png,image/gif';
          input.style.display = 'none';
          document.body.appendChild(input);
        }
        input.onchange = () => {
          if (input.files && input.files[0]) {
            const file = input.files[0];
            resolve(file.path || (window.URL ? URL.createObjectURL(file) : null));
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    },
    setFullscreenLyrics: (enabled) => safeInvoke('set_fullscreen_lyrics', { enabled }, null),
    getAutoLaunch: () => safeInvoke('get_auto_launch', {}, false),
    setAutoLaunch: (enabled) => safeInvoke('set_auto_launch', { enabled }, false),
    getDesktopWallpaper: () => safeInvoke('get_desktop_wallpaper', {}, null),
    loginViaWeb: () => safeInvoke('login_via_web', {}, null),
    getAccessToken: (spDc) => safeInvoke('get_access_token', { spDc }, null),
    logout: () => safeInvoke('reset_config', {}, null),
    lastfmApi: (method, params, apiKey, apiSecret, sessionKey) =>
      safeInvoke('lastfm_api', { data: { method, params, apiKey, apiSecret, sessionKey } }, null),
    getGeniusFact: (artist, track) => safeInvoke('get_genius_fact', { artist, track }, null),
    getGeniusAnnotations: (artist, track) => safeInvoke('get_genius_annotations', { artist, track }, []),
    fetchGeniusFact: (trackName, artistName) => safeInvoke('fetch_genius_fact', { trackName, artistName }, null),
    fetchGeniusLyrics: (trackName, artistName) => safeInvoke('fetch_genius_lyrics', { trackName, artistName }, null),
    fetchSpotifyLyrics: (trackId, token) => safeInvoke('fetch_spotify_lyrics', { trackId, token }, null),
    fetchNetEaseLyrics: (trackName, artistName) => safeInvoke('fetch_netease_lyrics', { trackName, artistName }, null),
    initDiscordRpc: (clientId) => safeInvoke('init_discord_rpc', { clientId }, null),
    updateDiscordRpc: (data) => safeInvoke('update_discord_rpc', { data }, null),
    translateText: (text, targetLang, skipLang) =>
      safeInvoke('translate_text', { text, targetLang, skipLang }, { text: null, src: 'error' }),
    fetchMusicNews: (query) => safeInvoke('fetch_music_news', { query }, ''),

    // Event Listeners
    onToggleClickThrough: (cb) => safeListen('toggle-click-through-shortcut', () => cb()),
    onWindowRestored: (cb) => safeListen('window-restored', () => cb()),
    onForceNormalMode: (cb) => safeListen('force-normal-mode', () => cb()),
    onWallpaperModeState: (cb) => safeListen('set-wallpaper-mode-state', (payload) => cb(payload)),
    onWallpaperEditStarted: (cb) => safeListen('wallpaper-edit-started', () => cb()),
    onWallpaperEditEnded: (cb) => safeListen('wallpaper-edit-ended', () => cb()),
    startWallpaperEdit: () => safeEmit('wallpaper-edit-started'),
    endWallpaperEdit: () => safeEmit('wallpaper-edit-ended'),
    onTrayPlaybackControl: (cb) => safeListen('tray-playback-control', (payload) => cb(payload)),
    onToggleTaskbarModeTray: (cb) => safeListen('toggle-taskbar-mode-tray', () => cb()),
    onTrayShowSettings: (cb) => safeListen('tray-show-settings', () => cb()),
    onTrayEditWallpaper: (cb) => safeListen('tray-edit-wallpaper', () => cb()),
    copyToClipboard: (text) => safeInvoke('copy_to_clipboard', { text }, null),
    onShowToast: (cb) => safeListen('show-toast', (payload) => cb(payload)),
    onUpdateDownloaded: (cb) => safeListen('update-downloaded', () => cb()),
    onNudgeOverlay: (cb) => safeListen('nudge-overlay', (payload) => {
      let dx = 0, dy = 0;
      if (Array.isArray(payload)) {
        dx = payload[0] || 0;
        dy = payload[1] || 0;
      } else if (payload && typeof payload === 'object') {
        dx = payload.dx || 0;
        dy = payload.dy || 0;
      }
      cb(dx, dy);
    }),
    onLocalPlaybackChange: (cb) => safeListen('local-playback-change', (payload) => cb(payload)),
    onSmtcPlaybackStatus: (cb) => safeListen('smtc-playback-status', (payload) => cb(payload)),
    onCopyActiveLyric: (cb) => safeListen('copy-active-lyric', () => cb()),
    onShareActiveLyric: (cb) => safeListen('share-active-lyric', () => cb()),
    onTaskbarModeReady: (cb) => safeListen('taskbar-mode-ready', () => cb()),
    onTaskbarDragEnded: (cb) => safeListen('taskbar-drag-ended', (payload) => cb(payload)),
    onUpdateTaskbarLyric: (cb) => safeListen('update-taskbar-lyric', (payload) => cb(payload)),
    onSyncTaskbarConfig: (cb) => safeListen('sync-taskbar-config', (payload) => cb(payload)),
    onTbOffsetSaved: (cb) => safeListen('tb-offset-saved', (payload) => cb(payload)),
  };

  // Taskbar window bridge polyfill
  window.taskbarAPI = {
    setClickThrough: (ignore) => safeInvoke('set_click_through', { ignore }),
    saveOffset: (x) => {
      safeEmit('tb-save-offset', x);
      safeEmit('tb-offset-saved', x);
    },
    openApp: () => safeInvoke('set_taskbar_mode', { enabled: false }),
    onUpdateLyric: (cb) => safeListen('update-taskbar-lyric', (data) => cb(data)),
    onSyncConfig: (cb) => safeListen('sync-taskbar-config', (cfg) => cb(cfg)),
  };

  // Edge Glow window bridge polyfill
  window.edgeGlowAPI = {
    onUpdateColor: (cb) => safeListen('update-edge-glow-color', (color) => cb(color)),
    getDesktopSources: () => Promise.resolve([]),
  };

  console.log('[LyricFlow Bridge] All bridge APIs initialized successfully.');
})();
