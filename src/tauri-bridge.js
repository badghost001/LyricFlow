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
      if (cmd !== 'log_debug') {
        console.warn(`[Tauri Bridge] invoke('${cmd}') warning/error:`, err);
      }
      return fallback;
    }
  }

  function safeFormatArg(a) {
    if (a === null) return 'null';
    if (a === undefined) return 'undefined';
    if (a instanceof Error) return a.stack || (`${a.name}: ${a.message}`);
    if (typeof a === 'object') {
      try {
        return JSON.stringify(a);
      } catch (_) {
        try {
          return Object.prototype.toString.call(a);
        } catch (_) {
          return '[Unserializable Object]';
        }
      }
    }
    return String(a);
  }

  // Intercept console and uncaught errors to forward to Rust debug log
  try {
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;
    const origDebug = console.debug;
    const origInfo = console.info;

    const logQueue = [];
    let isDrainingLogs = false;

    function queueLog(msg) {
      if (logQueue.length >= 80) logQueue.shift();
      logQueue.push(msg);
      drainLogs();
    }

    async function drainLogs() {
      if (isDrainingLogs) return;
      isDrainingLogs = true;
      try {
        while (logQueue.length > 0) {
          const batch = logQueue.splice(0, 5).join('\n');
          await safeInvoke('log_debug', { msg: batch });
        }
      } finally {
        isDrainingLogs = false;
      }
    }

    console.log = function (...args) {
      origLog.apply(console, args);
      queueLog('[LOG] ' + args.map(safeFormatArg).join(' '));
    };
    console.debug = function (...args) {
      origDebug.apply(console, args);
      queueLog('[DEBUG] ' + args.map(safeFormatArg).join(' '));
    };
    console.info = function (...args) {
      origInfo.apply(console, args);
      queueLog('[INFO] ' + args.map(safeFormatArg).join(' '));
    };
    console.warn = function (...args) {
      origWarn.apply(console, args);
      queueLog('[WARN] ' + args.map(safeFormatArg).join(' '));
    };
    console.error = function (...args) {
      origError.apply(console, args);
      queueLog('[ERROR] ' + args.map(safeFormatArg).join(' '));
    };
    window.addEventListener('error', function (e) {
      const errDetail = e && e.error ? safeFormatArg(e.error) : ((e ? e.message : 'Unknown') + ' at ' + (e ? e.filename : '') + ':' + (e ? e.lineno : ''));
      queueLog('[UNCAUGHT ERROR] ' + errDetail);
    });
    window.addEventListener('unhandledrejection', function (e) {
      const reason = e && e.reason ? (e.reason.stack || e.reason.message || safeFormatArg(e.reason)) : 'Unknown rejection';
      queueLog('[UNHANDLED PROMISE REJECTION] ' + reason);
    });
  } catch (_) {}

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
    showMainWindow: () => safeInvoke('show_main_window', {}, null),
    openExternal: (url) => safeInvoke('open_external', { url }, null),
    lastfmApi: (method, params = {}, apiKey = '', apiSecret = '', sessionKey = '') =>
      safeInvoke('lastfm_api', { data: { method, params, apiKey, apiSecret, sessionKey } }, null),
    getTaskbarColor: () => safeInvoke('get_taskbar_color', {}, { theme: 'dark', color: '#ffffff', accentColor: '#1DB954' }),
    setTaskbarMode: (enabled, fromTray = false) => safeInvoke('set_taskbar_mode', { enabled, fromTray }, null),
    getAvailableMonitors: () => safeInvoke('get_available_monitors', {}, []),
    setWallpaperMode: (enabled, monitorTarget = null) => safeInvoke('set_wallpaper_mode', { enabled, monitorTarget: monitorTarget ? String(monitorTarget) : null }, null),
    syncTaskbarModeState: (isTaskbarMode) => safeEmit('sync-taskbar-mode-state', isTaskbarMode),
    syncTaskbarConfig: (config) => safeInvoke('sync_taskbar_config', { config }, null),
    startTaskbarDrag: (data) => safeEmit('start-taskbar-drag', data),
    stopTaskbarDrag: () => safeEmit('stop-taskbar-drag'),
    updateTaskbarLyric: (data) => safeInvoke('update_taskbar_lyric', { data }, null),
    showNextUp: (track) => safeInvoke('show_now_playing_notification', { track }, null),
    showNowPlayingNotification: (track) => safeInvoke('show_now_playing_notification', { track }, null),
    updateNextUpPlaycount: () => {},
    getLocalPlayback: () => safeInvoke('get_local_playback', {}, null),
    triggerLocalPlaybackControl: (action, position = 0) =>
      safeInvoke('trigger_playback_control', { action, positionMs: position }, false),
    selectBackgroundFile: () => safeInvoke('select_background_file', {}, null),
    selectAnimatedArtFile: () => safeInvoke('select_animated_art_file', {}, null),
    convertFileSrc: (filePath) => {
      if (!filePath) return '';
      if (filePath.startsWith('data:') || filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
      }
      if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.convertFileSrc === 'function') {
        return window.__TAURI_INTERNALS__.convertFileSrc(filePath);
      }
      if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.convertFileSrc === 'function') {
        return window.__TAURI__.core.convertFileSrc(filePath);
      }
      const normalized = filePath.replace(/\\/g, '/');
      return `http://asset.localhost/${encodeURI(normalized)}`;
    },
    readFileDataUrl: (path) => safeInvoke('read_file_data_url', { path }, null),
    fetchImageDataUrl: (url) => safeInvoke('fetch_image_data_url', { url }, null),
    fetchTrackArtwork: (track, artist) => safeInvoke('fetch_track_artwork', { track, artist }, null),
    fetchSpotifyCanvas: (trackId, token) => safeInvoke('fetch_spotify_canvas', { trackId, token }, null),
    searchMusicGif: (trackName, artistName) => safeInvoke('search_music_gif', { trackName, artistName }, null),
    setFullscreenLyrics: (enabled) => safeInvoke('set_fullscreen_lyrics', { enabled }, null),
    getAutoLaunch: () => safeInvoke('get_auto_launch', {}, false),
    setAutoLaunch: (enabled) => safeInvoke('set_auto_launch', { enabled }, false),
    getDesktopWallpaper: () => safeInvoke('get_desktop_wallpaper', {}, null),
    loginViaWeb: () => safeInvoke('login_via_web', {}, null),
    getAccessToken: (spDc) => safeInvoke('get_access_token', { spDc }, null),
    logout: () => safeInvoke('reset_config', {}, null),
    openExternal: (url) => safeInvoke('open_external', { url }, null),
    lastfmApi: (method, params, apiKey, apiSecret, sessionKey) =>
      safeInvoke('lastfm_api', { data: { method, params, apiKey, apiSecret, sessionKey } }, null),
    getGeniusFact: (artist, track) => safeInvoke('get_genius_fact', { artist, track }, null),
    getGeniusAnnotations: (artist, track) => safeInvoke('get_genius_annotations', { artist, track }, []),
    fetchGeniusFact: (trackName, artistName) => safeInvoke('fetch_genius_fact', { trackName, artistName }, null),
    fetchGeniusLyrics: (trackName, artistName) => safeInvoke('fetch_genius_lyrics', { trackName, artistName }, null),
    fetchSpotifyLyrics: (trackId, token) => safeInvoke('fetch_spotify_lyrics', { trackId, token }, null),
    fetchNetEaseLyrics: (trackName, artistName) => safeInvoke('fetch_netease_lyrics', { trackName, artistName }, null),
    searchSyncedLyrics: (trackName, artistName, durationMs, options) =>
      safeInvoke('search_synced_lyrics', { trackName, artistName, durationMs, options }, null),
    getLyricsCandidates: (trackName, artistName, durationMs, options) =>
      safeInvoke('get_lyrics_candidates', { trackName, artistName, durationMs, options }, []),
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
    startWallpaperEdit: () => safeInvoke('start_wallpaper_edit'),
    endWallpaperEdit: () => safeInvoke('end_wallpaper_edit'),
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
    moveWindow: (deltaX) => safeInvoke('move_taskbar_window', { deltaX }),
    saveOffset: (x) => {
      safeEmit('tb-save-offset', x);
      safeEmit('tb-offset-saved', x);
    },
    openApp: () => safeInvoke('set_taskbar_mode', { enabled: false }),
    togglePlayPause: () => safeInvoke('trigger_playback_control', { action: 'play-pause', positionMs: 0 }, false),
    onUpdateLyric: (cb) => safeListen('update-taskbar-lyric', (data) => cb(data)),
    onSyncConfig: (cb) => safeListen('sync-taskbar-config', (cfg) => cb(cfg)),
    updateLyricBounds: (rect) => safeInvoke('update_taskbar_lyric_bounds', { rect }),
    setDragging: (dragging) => safeInvoke('set_taskbar_dragging', { dragging }),
  };

  // Edge Glow window bridge polyfill
  window.edgeGlowAPI = {
    onUpdateColor: (cb) => safeListen('update-edge-glow-color', (color) => cb(color)),
    getDesktopSources: () => Promise.resolve([]),
  };

  // Global external link interceptor: open target=_blank and external links in system browser
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const link = e.target && e.target.closest ? e.target.closest('a') : null;
      if (link && link.href) {
        const href = link.href;
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('spotify:')) {
          if (link.target === '_blank' || !href.includes(window.location.host)) {
            e.preventDefault();
            safeInvoke('open_external', { url: href });
          }
        }
      }
    });
  }

  console.log('[LyricFlow Bridge] All bridge APIs initialized successfully.');
})();
