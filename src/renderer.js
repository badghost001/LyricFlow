
// HTML escape utility to prevent XSS when inserting external data via innerHTML
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// DOM Elements
let screenLogin, screenLyrics, screenOnboarding, formAuth, btnSubmitAuth, authStatus, btnLocalMode;
let clientIDInput;
let lyricsViewport, lyricsContainer;
let widgetAlbumArt, widgetArtFallback, widgetTrackName, widgetArtistName, widgetPlaycount, widgetProgressFill, widgetTimeCurrent, widgetTimeDuration;
let btnClickThrough, checkAlwaysOnTop, btnMinimize, btnSettings, btnClose, btnSettingsClose, settingsPanel, btnLogout;
let btnSpotifyConnect, spotifySetupDiv, spotifyConnectedDiv, spotifyAccountStatus;
let btnNews, btnNewsClose, newsPanel, newsBody, inputNewsFilter;
let selectFontSize, valFontSize, selectAlign, sliderBgOpacity, valBgOpacity, sliderGlow, valGlow, selectTheme;
let selectFont, sliderLineSpacing, valLineSpacing, checkShowWidget, selectHighlightColor, selectDblclickAction;
let appContainer, ambientGlow, hudHeader, playbackWidget;
let toastNotification, historyContainer;
let searchOverlay, inputSearchLyrics, searchResultsInfo, inputSyncOffset, btnResetOffset;
let btnLoveTrack, svgLoveUnfilled, svgLoveFilled, btnLastfmConnect, lastfmConnectedDiv, checkLastfmScrobble, btnLastfmDisconnect, lastfmSetupDiv, lastfmWaitingDiv, btnLastfmReopen, btnLastfmCancel, lastfmAccountStatus;

// Playback & Taskbar Mode controls DOM
let btnPrev, btnPlayPause, btnNext, btnPlaySvg, btnPauseSvg, btnShareLyric, btnReloadLyrics, timingStatusBadge, btnSleepTimer, sleepTimerBadge;
let checkTaskbarMode, taskbarContainer, tbLyricLine, checkFullscreenLyrics, checkEdgeGlow, checkWallpaperMode, checkAutoHideTaskbar;
let selectWallpaperStyle;
let sliderOverlayX, valOverlayX, sliderOverlayY, valOverlayY, sliderOverlayWidth, valOverlayWidth, selectWallpaperFontSize;
let settingOverlayXRow, settingOverlayYRow, settingOverlayWidthRow, settingOverlayPosRow, settingWallpaperFontSizeRow, previewCanvas, previewBox;
let selectTbAlign, selectTbTranslation, sliderTbOffset, valTbOffset, settingTbAlignRow, settingTbTranslationRow, settingTbOffsetRow;
let checkAutoLaunch, sliderTbFontsize, valTbFontsize, settingTbFontsizeRow, tbProgress, settingFsLyricsRow;
let checkShowNextUp, checkShowGenius, selectGeniusPosition;
let checkAutoHideLyrics, selectAutoHideTrigger, selectAutoHideAction, sliderAutoHideDelay, valAutoHideDelay;
let settingAutoHideTriggerRow, settingAutoHideActionRow, settingAutoHideDelayRow;
let customBgVideo, customBgImg, wallpaperAlbumBg, inputBgFile, btnPickBg, btnClearBg, labelBgFilename;
let widgetAlbumArtVideo, wallpaperStyleArtVideo, wallpaperAlbumBgVideo;
let checkAnimatedAlbumArt, inputCustomArtGif, btnPickCustomArtGif, btnClearCustomArtGif, labelCustomArtGifFilename;
let currentPlayingTrackObj = null;
let currentStaticAlbumArtUrl = null;
let wallpaperStyleArt, wallpaperArtFallback, wallpaperTrackTitle, wallpaperTrackArtist;
let geniusFactCard, geniusFactContent;
let geniusFactInterval;
let geniusFactChunks = [];
let geniusFactIndex = 0;
let checkShowAnnotations, checkShowAnnotationPreview;
let geniusLiveMeaning, liveMeaningSnippet;
let geniusModal, geniusModalClose, geniusFragment, geniusAnnotationText;
let currentAnnotations = [];
let isFetchingLyrics = false;
let autoHideWakeTimer = null;
let isAutoHaltedTemporarily = false;
let checkAdaptiveBpm;

// App State
let config = null;
let settings = {
  theme: 'dark',
  accentColor: 'green',
  fontSize: 22,
  textAlign: 'center',
  bgOpacity: 85,
  glowIntensity: 60,
  fontFamily: 'Outfit',
  lineSpacing: 11,
  showWidget: true,
  hasCompletedSetup: false,
  highlightColor: 'dynamic',
  dblclickAction: 'copy',
  clickThrough: false,
  alwaysOnTop: false,
  wallpaperMode: false,
  wallpaperStyle: 'style1',
  wallpaperOverlayX: 50,
  wallpaperOverlayY: 50,
  wallpaperOverlayWidth: 60,
  wallpaperFontSize: 32,
  taskbarMode: false,
  autoHideTaskbarOnPause: false,
  taskbarAlign: 'center',
  tbAlign: 'center',
  tbTranslation: 'none',
  taskbarOffset: 0,
  tbOffset: 0,
  taskbarFontSize: 14,
  tbFontsize: 14,
  fullscreenLyrics: false,
  edgeGlow: false,
  autoLaunch: false,
  showNextUp: true,
  adaptiveBpm: true,
  showGenius: false,
  showGeniusFact: false,
  showAnnotations: true,
  showAnnotationPreview: false,
  geniusPosition: 'top-left',
  syncOffsetMs: 0,
  trackOffsets: {},
  lastfmScrobble: false,
  skipLang: 'en',
  autoHideLyrics: false,
  autoHideTrigger: 'paused',
  autoHideAction: 'collapse',
  autoHideDelay: 3,
  preferredLyricProvider: 'auto',
  preferredLyricProviders: []
};

// Playback State
let currentTrackId = null;
let trackDuration = 0;
let isPlaying = false;
let lastSpotifyPlaybackData = null;
let lyrics = [];
let activeLineIndex = -1;
let pollingIntervalId = null;
let currentProgress = 0;
let lastPollProgress = 0;
let lastPollTimestamp = Date.now();
let cachedLineEls = [];
let isDraggingTb = false;
let dragStartScreenX = 0;
let dragStartOffset = 0;
let hasMovedTb = false;
let lastTbContentWidth = 0;

function onTaskbarDragMove(e) {
  // No-op: drag movement is handled by main process cursor polling
}

function onTaskbarDragEnd() {
  if (isDraggingTb) endTaskbarDrag();
}
let userScrolling = false;
let userScrollTimeout = null;
let clickThroughState = null;

function setClickThroughCached(enable) {
  if (clickThroughState === enable) return;
  clickThroughState = enable;
  if (window.electronAPI && window.electronAPI.setClickThrough) {
    window.electronAPI.setClickThrough(enable);
  }
}

function clearLyricsCaches() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('lyrics_cache_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

let lastSentTaskbarMode = null;
let lastSentWallpaperMode = null;
let lastSentWallpaperMonitor = null;
let _lastSyncedTaskbarMode = null;
let localArtCache = {};
try {
  const savedArt = localStorage.getItem('lyricflow_local_art_cache');
  if (savedArt) localArtCache = JSON.parse(savedArt);
} catch (e) {}

function saveArtToCache(trackId, url, trackName, artistName) {
  if (!url) return;
  if (trackId) localArtCache[trackId] = url;
  if (trackName && artistName) {
    const dualKey = `${artistName}:::${trackName}`.toLowerCase().trim();
    localArtCache[dualKey] = url;
  }
  // Only persist http/https URLs to localStorage, never massive base64 data URLs
  if (url.startsWith('data:')) return;
  try {
    const keys = Object.keys(localArtCache);
    if (keys.length > 80) {
      delete localArtCache[keys[0]];
    }
    if (window.safeStorageSet) {
      window.safeStorageSet('lyricflow_local_art_cache', JSON.stringify(localArtCache));
    } else {
      localStorage.setItem('lyricflow_local_art_cache', JSON.stringify(localArtCache));
    }
  } catch (e) {}
}


function maybeSyncTaskbarLayout(force = false) {
  if (!settings.taskbarMode || !tbLyricLine) return;
  const width = measureTbContentWidth();
  if (force || width !== lastTbContentWidth) {
    lastTbContentWidth = width;
    syncTaskbarLayout();
  }
}
function measureTbContentWidth() {
  if (!tbLyricLine) return 200;
  const saved = {
    maxWidth: tbLyricLine.style.maxWidth,
    width: tbLyricLine.style.width,
    overflow: tbLyricLine.style.overflow,
    whiteSpace: tbLyricLine.style.whiteSpace
  };
  tbLyricLine.style.maxWidth = 'none';
  tbLyricLine.style.width = 'max-content';
  tbLyricLine.style.overflow = 'visible';
  tbLyricLine.style.whiteSpace = 'nowrap';
  const width = Math.ceil(tbLyricLine.getBoundingClientRect().width);
  tbLyricLine.style.maxWidth = saved.maxWidth;
  tbLyricLine.style.width = saved.width;
  tbLyricLine.style.overflow = saved.overflow;
  tbLyricLine.style.whiteSpace = saved.whiteSpace;
  return Math.min(Math.max(width, 80), 640);
}

function syncTaskbarLayout() {
  if (!settings.taskbarMode) return;
  const contentWidth = measureTbContentWidth();
  window.electronAPI.syncTaskbarModeState({
    action: 'syncLayout',
    offset: settings.taskbarOffset || 0,
    align: settings.taskbarAlign || 'center',
    contentWidth
  });
  
  if (window.electronAPI.syncTaskbarConfig) {
    const off = settings.taskbarOffset !== undefined ? settings.taskbarOffset : (settings.tbOffset || 0);
    window.electronAPI.syncTaskbarConfig({
      taskbarOffset: off,
      lyricOffsetX: off,
      taskbarAlign: settings.taskbarAlign || 'center',
      taskbarAccentColor: getComputedStyle(document.documentElement).getPropertyValue('--taskbar-accent-color').trim(),
      taskbarTextColor: getComputedStyle(document.documentElement).getPropertyValue('--taskbar-text-color').trim()
    });
  }
}

function startTaskbarDrag(screenX) {
  if (!settings.taskbarMode || !config || isDraggingTb || settings.fullscreenLyrics) return;

  isDraggingTb = true;
  hasMovedTb = false;

  if (tbLyricLine) tbLyricLine.style.cursor = 'grabbing';

  // Delegate drag to main process — it polls screen.getCursorScreenPoint()
  // and moves the window directly, avoiding the lost-mouse-events problem
  window.electronAPI.startTaskbarDrag({
    offset: settings.taskbarOffset || 0,
    align: settings.taskbarAlign || 'center'
  });

  // mouseup still fires because the cursor is over the OS taskbar area
  document.addEventListener('mouseup', onTaskbarDragEnd);
}

function endTaskbarDrag() {
  if (!isDraggingTb) return;
  isDraggingTb = false;

  document.removeEventListener('mouseup', onTaskbarDragEnd);

  if (tbLyricLine) tbLyricLine.style.cursor = 'grab';

  // Tell main process to stop cursor polling
  window.electronAPI.stopTaskbarDrag();
  // The main process will send 'taskbar-drag-ended' with final offset & moved state
}


function initDOMElements() {
  screenLogin = document.getElementById("screen-login");
  screenLyrics = document.getElementById("screen-lyrics");
  screenOnboarding = document.getElementById("screen-onboarding");
  formAuth = document.getElementById("form-auth");
  btnSubmitAuth = document.getElementById("btn-submit-auth");
  authStatus = document.getElementById("auth-status");
  clientIDInput = document.getElementById("client-id");
  btnLocalMode = document.getElementById("btn-local-mode");

  lyricsViewport = document.getElementById("lyrics-viewport");
  lyricsContainer = document.getElementById("lyrics-container");

  // Manual scroll detection: when user scrolls with mousewheel, pause auto-scroll within bounded range
  if (lyricsViewport) {
    lyricsViewport.addEventListener('wheel', (e) => {
      if (settings.taskbarMode || settings.compactMode) return;
      if (lyrics.length === 0) return;

      if (!cachedLineMetrics || cachedLineMetrics.length === 0) {
        measureLyricMetrics();
      }
      const count = cachedLineMetrics ? cachedLineMetrics.length : 0;
      if (count === 0) return;

      userScrolling = true;
      showResyncButton();

      const viewportHeight = cachedViewportHeight || (lyricsViewport ? lyricsViewport.clientHeight : 300);
      const firstMetric = cachedLineMetrics[0];
      const lastMetric = cachedLineMetrics[count - 1];

      // Center positions for first and last lines
      const firstLineCenterY = (viewportHeight / 2) - firstMetric.top - (firstMetric.height / 2);
      const lastLineCenterY = (viewportHeight / 2) - lastMetric.top - (lastMetric.height / 2);

      // Clamped limits with a 60px overscroll margin so lines can never be scrolled into the void
      const maxY = Math.max(firstLineCenterY, lastLineCenterY) + 60;
      const minY = Math.min(firstLineCenterY, lastLineCenterY) - 60;

      // Extract current translation
      const currentTransform = lyricsContainer.style.transform;
      const match = currentTransform.match(/translateY\((.+?)px\)/);
      const currentY = match ? parseFloat(match[1]) : firstLineCenterY;
      const delta = -e.deltaY;

      const clampedY = Math.max(minY, Math.min(maxY, currentY + delta));
      lyricsContainer.style.transform = `translateY(${clampedY}px)`;

      // Clear any previous auto-resync timeout and reset for 7 seconds
      if (userScrollTimeout) clearTimeout(userScrollTimeout);
      userScrollTimeout = setTimeout(() => {
        userScrolling = false;
        hideResyncButton();
        const idx = activeLineIndex;
        activeLineIndex = -1;
        scrollLyrics(idx);
      }, 7000);
    }, { passive: true });
  }

  widgetAlbumArt = document.getElementById("widget-album-art");
  widgetArtFallback = document.getElementById("widget-art-fallback");
  widgetTrackName = document.getElementById("widget-track-name");
  widgetArtistName = document.getElementById("widget-artist-name");
  widgetPlaycount = document.getElementById("widget-playcount");
  widgetProgressFill = document.getElementById("widget-progress-fill");
  widgetTimeCurrent = document.getElementById("widget-time-current");
  widgetTimeDuration = document.getElementById("widget-time-duration");

  btnClickThrough = document.getElementById("btn-click-through");

  // Controls & Taskbar DOM Elements
  checkTaskbarMode = document.getElementById("check-taskbar-mode");
  checkAutoHideTaskbar = document.getElementById("check-auto-hide-taskbar");
  checkWallpaperMode = document.getElementById("check-wallpaper-mode");
  selectWallpaperStyle = document.getElementById("select-wallpaper-style");
  previewCanvas = document.getElementById("preview-canvas");
  previewBox = document.getElementById("preview-box");
  sliderOverlayWidth = document.getElementById("slider-wallpaper-overlay-width");
  valOverlayWidth = document.getElementById("val-wallpaper-overlay-width");
  selectWallpaperFontSize = document.getElementById("select-wallpaper-font-size");
  settingWallpaperFontSizeRow = document.getElementById("setting-wallpaper-font-size-row");
  settingOverlayPosRow = document.getElementById("setting-wallpaper-overlay-pos");
  settingOverlayWidthRow = document.getElementById("setting-wallpaper-overlay-width");
  checkFullscreenLyrics = document.getElementById("check-fullscreen-lyrics");
  checkEdgeGlow = document.getElementById("check-edge-glow");
  taskbarContainer = document.getElementById("taskbar-container");
  tbLyricLine = document.getElementById("tb-lyric-line");
  tbProgress = document.getElementById("tb-progress");
  selectTbAlign = document.getElementById("select-tb-align");
  selectTbTranslation = document.getElementById("select-tb-translation");
  sliderTbOffset = document.getElementById("slider-tb-offset");
  valTbOffset = document.getElementById("val-tb-offset");
  settingTbAlignRow = document.getElementById("setting-tb-align-row");
  settingTbTranslationRow = document.getElementById("setting-tb-translation-row");
  settingTbOffsetRow = document.getElementById("setting-tb-offset-row");
  sliderTbFontsize = document.getElementById("slider-tb-fontsize");
  valTbFontsize = document.getElementById("val-tb-fontsize");
  settingTbFontsizeRow = document.getElementById("setting-tb-fontsize-row");
  settingFsLyricsRow = document.getElementById("setting-fs-lyrics-row");
  checkAutoLaunch = document.getElementById("check-auto-launch");
  checkShowNextUp = document.getElementById("check-show-next-up");
  checkAdaptiveBpm = document.getElementById("check-adaptive-bpm");
  checkShowGenius = document.getElementById("check-show-genius");
  selectGeniusPosition = document.getElementById("select-genius-position");

  customBgVideo = document.getElementById("custom-bg-video");
  customBgImg = document.getElementById("custom-bg-img");
  wallpaperAlbumBg = document.getElementById("wallpaper-album-bg");
  wallpaperStyleArt = document.getElementById("wallpaper-style-art");
  wallpaperArtFallback = document.getElementById("wallpaper-art-fallback");
  wallpaperTrackTitle = document.getElementById("wallpaper-track-title");
  wallpaperTrackArtist = document.getElementById("wallpaper-track-artist");
  inputBgFile = document.getElementById("input-bg-file");
  btnPickBg = document.getElementById("btn-pick-bg");
  btnClearBg = document.getElementById("btn-clear-bg");
  labelBgFilename = document.getElementById("label-bg-filename");

  widgetAlbumArtVideo = document.getElementById("widget-album-art-video");
  wallpaperStyleArtVideo = document.getElementById("wallpaper-style-art-video");
  wallpaperAlbumBgVideo = document.getElementById("wallpaper-album-bg-video");
  checkAnimatedAlbumArt = document.getElementById("check-animated-album-art");
  inputCustomArtGif = document.getElementById("input-custom-art-gif-file");
  btnPickCustomArtGif = document.getElementById("btn-pick-custom-art-gif");
  btnClearCustomArtGif = document.getElementById("btn-clear-custom-art-gif");
  labelCustomArtGifFilename = document.getElementById("label-custom-art-gif-filename");

  btnPrev = document.getElementById("btn-prev");
  btnPlayPause = document.getElementById("btn-play-pause");
  btnNext = document.getElementById("btn-next");
  btnPlaySvg = document.getElementById("svg-play");
  btnPauseSvg = document.getElementById("svg-pause");
  btnShareLyric = document.getElementById("btn-share-lyric");
  btnReloadLyrics = document.getElementById("btn-reload-lyrics");
  timingStatusBadge = document.getElementById("timing-status-badge");
  btnSleepTimer = document.getElementById("btn-sleep-timer");
  sleepTimerBadge = document.getElementById("sleep-timer-badge");
  checkAlwaysOnTop = document.getElementById("check-always-on-top");
  btnMinimize = document.getElementById("btn-minimize");
  btnSettings = document.getElementById("btn-settings");
  btnClose = document.getElementById("btn-close");
  btnSettingsClose = document.getElementById("btn-settings-close");
  settingsPanel = document.getElementById("settings-panel");
  btnLogout = document.getElementById("btn-logout");
  btnSpotifyConnect = document.getElementById("btn-spotify-connect");
  spotifySetupDiv = document.getElementById("spotify-setup");
  spotifyConnectedDiv = document.getElementById("spotify-connected");
  spotifyAccountStatus = document.getElementById("spotify-account-status");

  btnNews = document.getElementById("btn-news");
  btnNewsClose = document.getElementById("btn-news-close");
  newsPanel = document.getElementById("news-panel");
  newsBody = document.getElementById("news-body");
  inputNewsFilter = document.getElementById("input-news-filter");
  sliderOverlayX = document.getElementById("slider-overlay-x");
  valOverlayX = document.getElementById("val-overlay-x");
  sliderOverlayY = document.getElementById("slider-overlay-y");
  valOverlayY = document.getElementById("val-overlay-y");
  settingOverlayPosRow = document.getElementById("setting-wallpaper-overlay-pos");

  const presetPositions = {
    'btn-pos-tl': {x: 10, y: 10},
    'btn-pos-tr': {x: 90, y: 10},
    'btn-pos-c': {x: 50, y: 50},
    'btn-pos-bl': {x: 10, y: 90},
    'btn-pos-br': {x: 90, y: 90}
  };

  Object.keys(presetPositions).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        settings.wallpaperOverlayX = presetPositions[id].x;
        settings.wallpaperOverlayY = presetPositions[id].y;
        applyVisualSettings();
        saveLocalSettings();
      });
    }
  });

  const btnStartWallpaperEdit = document.getElementById("btn-start-wallpaper-edit");
  if (btnStartWallpaperEdit) {
    btnStartWallpaperEdit.addEventListener('click', () => {
      if (window.electronAPI && window.electronAPI.startWallpaperEdit) {
        window.electronAPI.startWallpaperEdit();
      }
    });
  }

  selectTheme = document.getElementById("select-theme");
  selectFontSize = document.getElementById("select-font-size");
  selectAlign = document.getElementById("select-align");
  sliderBgOpacity = document.getElementById("slider-bg-opacity");
  valBgOpacity = document.getElementById("val-bg-opacity");
  sliderGlow = document.getElementById("slider-glow");
  valGlow = document.getElementById("val-glow");
  selectFont = document.getElementById("select-font");
  sliderLineSpacing = document.getElementById("slider-line-spacing");
  valLineSpacing = document.getElementById("val-line-spacing");
  checkShowWidget = document.getElementById("check-show-widget");
  selectHighlightColor = document.getElementById("select-highlight-color");
  selectDblclickAction = document.getElementById("select-dblclick-action");

  appContainer = document.getElementById("app-container");
  ambientGlow = document.getElementById("ambient-glow");
  hudHeader = document.getElementById("hud-header");
  playbackWidget = document.getElementById("playback-widget");
  toastNotification = document.getElementById("toast-notification");
  historyContainer = document.getElementById("history-container");
  searchOverlay = document.getElementById("search-overlay");
  inputSearchLyrics = document.getElementById("input-search-lyrics");
  searchResultsInfo = document.getElementById("search-results-info");
  inputSyncOffset = document.getElementById("input-sync-offset");
  btnResetOffset = document.getElementById("btn-reset-offset");

  btnLoveTrack = document.getElementById("btn-love-track");
  svgLoveUnfilled = document.getElementById("svg-love-unfilled");
  svgLoveFilled = document.getElementById("svg-love-filled");

  btnLastfmConnect = document.getElementById("btn-lastfm-connect");
  lastfmConnectedDiv = document.getElementById("lastfm-connected");
  lastfmSetupDiv = document.getElementById("lastfm-setup");
  lastfmWaitingDiv = document.getElementById("lastfm-waiting");
  btnLastfmReopen = document.getElementById("btn-lastfm-reopen");
  btnLastfmCancel = document.getElementById("btn-lastfm-cancel");
  lastfmAccountStatus = document.getElementById("lastfm-account-status");
  geniusFactCard = document.getElementById("genius-fact-card");
  geniusFactContent = document.getElementById("genius-fact-content");
  checkLastfmScrobble = document.getElementById("check-lastfm-scrobble");
  btnLastfmDisconnect = document.getElementById("btn-lastfm-disconnect");

  checkAutoHideLyrics = document.getElementById("check-auto-hide-lyrics");
  selectAutoHideTrigger = document.getElementById("select-auto-hide-trigger");
  selectAutoHideAction = document.getElementById("select-auto-hide-action");
  sliderAutoHideDelay = document.getElementById("slider-auto-hide-delay");
  valAutoHideDelay = document.getElementById("val-auto-hide-delay");
  settingAutoHideTriggerRow = document.getElementById("setting-auto-hide-trigger-row");
  settingAutoHideActionRow = document.getElementById("setting-auto-hide-action-row");
  settingAutoHideDelayRow = document.getElementById("setting-auto-hide-delay-row");

  checkShowAnnotations = document.getElementById("check-show-annotations");
  checkShowAnnotationPreview = document.getElementById("check-show-annotation-preview");
  geniusLiveMeaning = document.getElementById("genius-live-meaning");
  liveMeaningSnippet = document.getElementById("live-meaning-snippet");
  geniusModal = document.getElementById("genius-modal");
  geniusModalClose = document.getElementById("genius-modal-close");
  geniusFragment = document.getElementById("genius-fragment");
  geniusAnnotationText = document.getElementById("genius-annotation-text");
}

async function bootstrapApp() {
  console.log('[LF-STARTUP] Bootstrap starting, readyState=' + document.readyState);
  const progressBar = document.getElementById("loading-progress-bar");
  const statusText = document.getElementById("loading-status-text");

  const setLoadingProgress = (pct, text) => {
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (statusText && text) statusText.textContent = text;
  };

  const dismissLoadingScreen = (immediate = false) => {
    const screenLoading = document.getElementById("screen-loading");
    if (!screenLoading || screenLoading.style.display === "none") return;
    if (immediate) {
      screenLoading.style.display = "none";
      screenLoading.classList.add("fade-out");
    } else {
      setLoadingProgress(100, "Ready!");
      screenLoading.classList.add("fade-out");
      setTimeout(() => {
        screenLoading.style.display = "none";
      }, 450);
    }
    if (!immediate && !settings.taskbarMode && window.electronAPI && typeof window.electronAPI.showMainWindow === 'function') {
      window.electronAPI.showMainWindow();
    }
  };

  // Fail-safe timeout: never let loading screen hang for more than 4 seconds
  const safetyTimeout = setTimeout(() => {
    console.warn("Safety timeout triggered: dismissing loading screen");
    if (!config) showLoginScreen();
    dismissLoadingScreen(false);
  }, 4000);

  try {
    // Check if launched silently via Windows startup (--startup)
    let isStartupMode = false;
    try {
      if (window.electronAPI && typeof window.electronAPI.invoke === 'function') {
        isStartupMode = await window.electronAPI.invoke('get_is_startup');
      }
    } catch (e) {}

    // Stage 1: Config & Auth Verification (Async from Rust)
    setLoadingProgress(20, "Starting LyricFlow...");
    try {
      if (window.electronAPI && typeof window.electronAPI.loadConfig === 'function') {
        config = await window.electronAPI.loadConfig();
      } else {
        config = null;
      }
    } catch (err) {
      console.error("Failed to load config:", err);
      config = null;
    }

    // If silent startup or taskbar mode, immediately bypass loading visuals
    if (isStartupMode || (config && (config.taskbar_mode || config.taskbarMode))) {
      dismissLoadingScreen(true);
    }

    // Stage 2: DOM Elements Binding & Visual Preferences (Immediate, synchronous)
    initDOMElements();
    loadLocalSettings(true); // skipIPC = true prevents duplicate IPC calls during boot

    // Stage 3: UI Handlers & History Render
    try {
      setupUIHandlers();
    } catch (err) {
      console.error("Error initializing UI handlers:", err);
    }
    try { renderHistory(); } catch (e) { console.warn("History render warning:", e); }

    // Stage 4: Launch Transition
    setLoadingProgress(45, "Connecting media services...");
    const isFirstTime = !localStorage.getItem("lyricflow_setup_done") && settings.hasCompletedSetup !== true;
    if (isFirstTime) {
      showOnboardingWizard();
      dismissLoadingScreen(false);
    } else if (config) {
      showLyricsScreen();
      updateSpotifyUI();

      if (!isStartupMode && !settings.taskbarMode) {
        setLoadingProgress(60, "Detecting playing track...");
        try {
          // Pre-populate track & lyrics before dissolving loading screen
          await Promise.race([
            pollSpotifyPlayback(),
            new Promise((r) => setTimeout(r, 1600))
          ]);

          if (currentTrackId) {
            const trackName = widgetTrackName.textContent || "track";
            setLoadingProgress(85, `Loading lyrics for ${trackName}...`);
            // Give up to 1200ms for in-flight lyrics fetching to finish
            const waitStart = Date.now();
            while (isFetchingLyrics && Date.now() - waitStart < 1200) {
              await new Promise(r => setTimeout(r, 80));
            }
          } else {
            handleEmptyPlayback();
          }
        } catch (e) {
          console.warn("[Startup] Playback pre-population notice:", e);
          handleEmptyPlayback();
        }
      }
      dismissLoadingScreen(false);
    } else {
      showLoginScreen();
      dismissLoadingScreen(false);
    }

    if (isSpotifyConnected()) {
      checkAndVerifySpotifyConnection().then(() => updateSpotifyUI());
    }
  } catch (globalErr) {
    console.error("Critical bootstrap error:", globalErr);
    try {
      showLoginScreen();
    } catch (e) {
      console.error("Error showing login screen in bootstrap fallback:", e);
    }
    dismissLoadingScreen(false);
  } finally {
    clearTimeout(safetyTimeout);
  }

  // Start the frame-perfect loop after startup is complete
  ensurePlayheadLoop();
  console.log('[LF-STARTUP] Bootstrap completed.');
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", bootstrapApp);
} else {
  bootstrapApp();
}

// Load settings from localStorage and config.json
function loadLocalSettings(skipIPC = false) {
  let parsed = null;
  const saved = localStorage.getItem("lyrics_overlay_settings");
  if (saved) {
    try {
      parsed = JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing localStorage settings:", e);
    }
  }

  // Dual-storage persistence: also merge settings from config.json
  if (config && config.settings) {
    parsed = { ...config.settings, ...(parsed || {}) };
  }

  if (parsed) {
    settings = { ...settings, ...parsed };
    
    // Ensure alias consistency between canonical and legacy names
    if (parsed.taskbarAlign) settings.tbAlign = parsed.taskbarAlign;
    else if (parsed.tbAlign) settings.taskbarAlign = parsed.tbAlign;

    if (parsed.taskbarOffset !== undefined) settings.tbOffset = parsed.taskbarOffset;
    else if (parsed.tbOffset !== undefined) settings.taskbarOffset = parsed.tbOffset;

    if (parsed.taskbarFontSize !== undefined) settings.tbFontsize = parsed.taskbarFontSize;
    else if (parsed.tbFontsize !== undefined) settings.taskbarFontSize = parsed.tbFontsize;

    if (parsed.showGenius !== undefined) settings.showGeniusFact = parsed.showGenius;
    else if (parsed.showGeniusFact !== undefined) settings.showGenius = parsed.showGeniusFact;

    // Migrate legacy default values
    if (settings.lineSpacing === 1.1 || settings.lineSpacing === 12 || !settings.lineSpacing) {
      settings.lineSpacing = 11;
    }
    if (settings.highlightColor === '#1DB954' || settings.highlightColor === '#1db954') {
      settings.highlightColor = 'dynamic';
    }
    if (settings.geniusPosition === 'top') {
      settings.geniusPosition = 'top-left';
    }

    if (settings.preferredLyricProvider && (!settings.preferredLyricProviders || settings.preferredLyricProviders.length === 0)) {
      if (settings.preferredLyricProvider === 'musixmatch') {
        settings.preferredLyricProviders = ['musixmatch', 'lrclib', 'netease'];
      } else if (settings.preferredLyricProvider === 'lrclib') {
        settings.preferredLyricProviders = ['lrclib', 'musixmatch', 'netease'];
      } else if (settings.preferredLyricProvider === 'netease') {
        settings.preferredLyricProviders = ['netease', 'lrclib', 'musixmatch'];
      } else {
        settings.preferredLyricProviders = [];
      }
    }
  }

  // Enforce optimal defaults requested by user:
  if (settings.bgOpacity === undefined || settings.bgOpacity === null) {
    settings.bgOpacity = 85;
  }
  if (!settings.fontSize || settings.fontSize < 16) {
    settings.fontSize = 22;
  }
  if (settings.autoHideTaskbarOnPause === undefined || settings.autoHideTaskbarOnPause === null) {
    settings.autoHideTaskbarOnPause = false;
  }

  // Force taskbarMode to false on startup so app always opens as a normal window (matches Electron line 240)
  settings.taskbarMode = false;
  settings.wallpaperMode = false;

  // Load custom GIF into memory if path is saved
  if (settings.customArtGifPath && !settings.customArtGifSrc) {
    if (window.electronAPI && typeof window.electronAPI.readFileDataUrl === 'function') {
      window.electronAPI.readFileDataUrl(settings.customArtGifPath).then(dataUrl => {
        if (dataUrl) {
          settings.customArtGifSrc = dataUrl;
          if (currentPlayingTrackObj) {
            updateAnimatedAlbumArt(currentPlayingTrackObj, currentStaticAlbumArtUrl);
          }
        }
      }).catch(err => {
        console.warn("[Renderer] Failed to load custom GIF from path:", err);
      });
    }
  }

  // Apply visual settings (skip IPC during bootstrapping to avoid redundant calls)
  applyVisualSettings(false, skipIPC);
}

let _saveDebounceTimer = null;
function saveLocalSettings() {
  if (_saveDebounceTimer) clearTimeout(_saveDebounceTimer);
  _saveDebounceTimer = setTimeout(async () => {
    try {
      // Create a lightweight copy for localStorage without giant data URLs
      const storageSettings = { ...settings };
      if (storageSettings.customArtGifSrc && storageSettings.customArtGifSrc.startsWith('data:')) {
        delete storageSettings.customArtGifSrc;
      }
      localStorage.setItem("lyrics_overlay_settings", JSON.stringify(storageSettings));
      // Persist directly to config.json for bulletproof persistence across sessions
      if (window.electronAPI && typeof window.electronAPI.saveConfig === 'function') {
        const curCfg = (await window.electronAPI.loadConfig()) || {};
        curCfg.settings = storageSettings;
        await window.electronAPI.saveConfig(curCfg);
      }
    } catch (e) {
      console.warn("Failed to persist settings:", e);
    }
  }, 150);
}

function setWallpaperAlbumArt(src) {
  if (!wallpaperAlbumBg) return;

  if (!src) {
    wallpaperAlbumBg.removeAttribute("src");
    wallpaperAlbumBg.classList.remove("has-art");
    if (wallpaperStyleArt) {
      wallpaperStyleArt.removeAttribute("src");
      wallpaperStyleArt.style.display = "none";
    }
    if (wallpaperArtFallback) wallpaperArtFallback.style.display = "flex";
    return;
  }

  if (wallpaperAlbumBg.src !== src) {
    wallpaperAlbumBg.src = src;
  }
  wallpaperAlbumBg.classList.add("has-art");

  if (wallpaperStyleArt && wallpaperStyleArt.src !== src) {
    wallpaperStyleArt.src = src;
  }
  if (wallpaperStyleArt) wallpaperStyleArt.style.display = "block";
  if (wallpaperArtFallback) wallpaperArtFallback.style.display = "none";
}

let animatedArtCache = {};
try {
  const cached = localStorage.getItem('lf_animated_art_cache');
  if (cached) {
    const parsed = JSON.parse(cached);
    // Strip out any stale Giphy GIF entries — they are inaccurate/unrelated to the track
    for (const [k, v] of Object.entries(parsed)) {
      const url = typeof v === 'object' ? v?.url : null;
      if (url && url.includes('giphy.com')) continue; // drop Giphy entries
      animatedArtCache[k] = v;
    }
  }
} catch (e) {}

function saveAnimatedArtCache(key, data) {
  try {
    animatedArtCache[key] = data;
    const keys = Object.keys(animatedArtCache);
    if (keys.length > 250) {
      delete animatedArtCache[keys[0]];
    }
    localStorage.setItem('lf_animated_art_cache', JSON.stringify(animatedArtCache));
  } catch (e) {}
}

function setAnimatedAlbumArt(animatedInfo, fallbackStaticUrl = null) {
  if (!animatedInfo || !animatedInfo.url) {
    document.body.classList.remove('has-animated-art-video');
    if (widgetAlbumArtVideo) {
      widgetAlbumArtVideo.pause();
      widgetAlbumArtVideo.removeAttribute('src');
      widgetAlbumArtVideo.style.display = 'none';
    }
    if (wallpaperStyleArtVideo) {
      wallpaperStyleArtVideo.pause();
      wallpaperStyleArtVideo.removeAttribute('src');
      wallpaperStyleArtVideo.style.display = 'none';
    }
    if (wallpaperAlbumBgVideo) {
      wallpaperAlbumBgVideo.pause();
      wallpaperAlbumBgVideo.removeAttribute('src');
      wallpaperAlbumBgVideo.style.display = 'none';
    }
    const staticUrl = fallbackStaticUrl || currentStaticAlbumArtUrl;
    if (staticUrl) {
      if (widgetAlbumArt) {
        if (widgetAlbumArt.src !== staticUrl) widgetAlbumArt.src = staticUrl;
        widgetAlbumArt.style.display = 'block';
      }
      if (widgetArtFallback) widgetArtFallback.style.display = 'none';
      setWallpaperAlbumArt(staticUrl);
    } else {
      if (widgetAlbumArt) widgetAlbumArt.style.display = 'none';
      if (widgetArtFallback) widgetArtFallback.style.display = 'flex';
      setWallpaperAlbumArt(null);
    }
    return;
  }

  const { type, url } = animatedInfo;

  if (type === 'video') {
    document.body.classList.add('has-animated-art-video');

    if (widgetAlbumArtVideo) {
      if (widgetAlbumArtVideo.src !== url) widgetAlbumArtVideo.src = url;
      widgetAlbumArtVideo.style.display = 'block';
      if (isPlaying) widgetAlbumArtVideo.play().catch(() => {});
      widgetAlbumArtVideo.onerror = () => {
        console.warn("[Renderer] Album art video playback failed, reverting to static:", url);
        widgetAlbumArtVideo.style.display = 'none';
        const fallback = fallbackStaticUrl || currentStaticAlbumArtUrl;
        if (fallback && widgetAlbumArt) {
          widgetAlbumArt.src = fallback;
          widgetAlbumArt.style.display = 'block';
          if (widgetArtFallback) widgetArtFallback.style.display = 'none';
        }
      };
    }
    if (widgetAlbumArt) widgetAlbumArt.style.display = 'none';
    if (widgetArtFallback) widgetArtFallback.style.display = 'none';

    if (wallpaperStyleArtVideo) {
      if (wallpaperStyleArtVideo.src !== url) wallpaperStyleArtVideo.src = url;
      wallpaperStyleArtVideo.style.display = 'block';
      if (isPlaying) wallpaperStyleArtVideo.play().catch(() => {});
    }
    if (wallpaperStyleArt) wallpaperStyleArt.style.display = 'none';
    if (wallpaperArtFallback) wallpaperArtFallback.style.display = 'none';

    if (wallpaperAlbumBgVideo && (!settings.customBgSrc || !hasCustomBackground)) {
      if (wallpaperAlbumBgVideo.src !== url) wallpaperAlbumBgVideo.src = url;
      wallpaperAlbumBgVideo.style.display = 'block';
      wallpaperAlbumBgVideo.style.opacity = '0.78';
      if (isPlaying) wallpaperAlbumBgVideo.play().catch(() => {});
    }
    if (wallpaperAlbumBg) wallpaperAlbumBg.style.display = 'none';
  } else {
    // GIF / Image
    document.body.classList.remove('has-animated-art-video');

    if (widgetAlbumArtVideo) {
      widgetAlbumArtVideo.pause();
      widgetAlbumArtVideo.removeAttribute('src');
      widgetAlbumArtVideo.style.display = 'none';
    }
    if (widgetAlbumArt) {
      if (widgetAlbumArt.src !== url) widgetAlbumArt.src = url;
      widgetAlbumArt.style.display = 'block';
      widgetAlbumArt.onerror = () => {
        console.warn("[Renderer] Album art GIF/image failed to load, reverting to static:", url);
        const fallback = fallbackStaticUrl || currentStaticAlbumArtUrl;
        if (fallback && widgetAlbumArt.src !== fallback) {
          widgetAlbumArt.src = fallback;
          widgetAlbumArt.style.display = 'block';
          if (widgetArtFallback) widgetArtFallback.style.display = 'none';
        } else if (!fallback) {
          widgetAlbumArt.style.display = 'none';
          if (widgetArtFallback) widgetArtFallback.style.display = 'flex';
        }
      };
    }
    if (widgetArtFallback) widgetArtFallback.style.display = 'none';

    if (wallpaperStyleArtVideo) {
      wallpaperStyleArtVideo.pause();
      wallpaperStyleArtVideo.removeAttribute('src');
      wallpaperStyleArtVideo.style.display = 'none';
    }
    if (wallpaperStyleArt) {
      if (wallpaperStyleArt.src !== url) wallpaperStyleArt.src = url;
      wallpaperStyleArt.style.display = 'block';
      wallpaperStyleArt.onerror = () => {
        const fallback = fallbackStaticUrl || currentStaticAlbumArtUrl;
        if (fallback && wallpaperStyleArt.src !== fallback) {
          wallpaperStyleArt.src = fallback;
          wallpaperStyleArt.style.display = 'block';
        }
      };
    }
    if (wallpaperArtFallback) wallpaperArtFallback.style.display = 'none';

    if (wallpaperAlbumBgVideo) {
      wallpaperAlbumBgVideo.pause();
      wallpaperAlbumBgVideo.removeAttribute('src');
      wallpaperAlbumBgVideo.style.display = 'none';
    }
    if (wallpaperAlbumBg) {
      if (wallpaperAlbumBg.src !== url) wallpaperAlbumBg.src = url;
      wallpaperAlbumBg.style.display = 'block';
      wallpaperAlbumBg.classList.add('has-art');
    }
  }
}

function pauseAnimatedArtVideos() {
  if (widgetAlbumArtVideo) widgetAlbumArtVideo.pause();
  if (wallpaperStyleArtVideo) wallpaperStyleArtVideo.pause();
  if (wallpaperAlbumBgVideo) wallpaperAlbumBgVideo.pause();
}

function resumeAnimatedArtVideos() {
  if (widgetAlbumArtVideo && widgetAlbumArtVideo.style.display === 'block') widgetAlbumArtVideo.play().catch(() => {});
  if (wallpaperStyleArtVideo && wallpaperStyleArtVideo.style.display === 'block') wallpaperStyleArtVideo.play().catch(() => {});
  if (wallpaperAlbumBgVideo && wallpaperAlbumBgVideo.style.display === 'block') wallpaperAlbumBgVideo.play().catch(() => {});
}

let currentAnimatedFetchToken = 0;

async function updateAnimatedAlbumArt(track, staticArtUrl) {
  if (!track || !track.name) {
    setAnimatedAlbumArt(null, staticArtUrl);
    return;
  }

  // Check if disabled in settings
  if (settings.animatedAlbumArt === false) {
    setAnimatedAlbumArt(null, staticArtUrl);
    return;
  }

  // Custom user GIF override (highest priority)
  if (settings.customArtGifSrc || settings.customArtGifPath) {
    let gifSrc = settings.customArtGifSrc;
    if (!gifSrc && settings.customArtGifPath && window.electronAPI && window.electronAPI.readFileDataUrl) {
      try {
        const dUrl = await window.electronAPI.readFileDataUrl(settings.customArtGifPath);
        if (dUrl) {
          settings.customArtGifSrc = dUrl;
          gifSrc = dUrl;
          saveLocalSettings();
        }
      } catch (e) {}
    }
    // Auto-heal old or raw paths to reliable data URLs
    if (gifSrc && (gifSrc.startsWith('http://asset.localhost/') || (!gifSrc.startsWith('data:') && !gifSrc.startsWith('http')))) {
      let rawPath = settings.customArtGifPath;
      if (!rawPath && gifSrc.startsWith('http://asset.localhost/')) {
        rawPath = decodeURIComponent(gifSrc.replace('http://asset.localhost/', ''));
      }
      if (rawPath && window.electronAPI && window.electronAPI.readFileDataUrl) {
        try {
          const dUrl = await window.electronAPI.readFileDataUrl(rawPath);
          if (dUrl) {
            settings.customArtGifPath = rawPath;
            settings.customArtGifSrc = dUrl;
            gifSrc = dUrl;
            saveLocalSettings();
          }
        } catch (e) {}
      }
    }
    if (gifSrc) {
      const isVideo = gifSrc.endsWith('.mp4') || gifSrc.endsWith('.webm') || gifSrc.startsWith('data:video');
      setAnimatedAlbumArt({ type: isVideo ? 'video' : 'gif', url: gifSrc }, staticArtUrl);
      return;
    }
  }

  const trackName = track.name;
  const artistName = track.artists?.[0]?.name || track.artist || '';
  const trackId = track.id || track.uri || '';
  const cacheKey = `${artistName} - ${trackName}`.toLowerCase().trim();

  // Cache check
  if (animatedArtCache[cacheKey]) {
    const cached = animatedArtCache[cacheKey];
    if (cached === 'notfound') {
      setAnimatedAlbumArt(null, staticArtUrl);
      return;
    }
    setAnimatedAlbumArt(cached, staticArtUrl);
    return;
  }

  const fetchToken = ++currentAnimatedFetchToken;

  // Tier 1: Spotify Canvas (MP4 loop)
  if (window.electronAPI && typeof window.electronAPI.fetchSpotifyCanvas === 'function') {
    let cleanId = trackId;
    if (cleanId.startsWith('spotify:track:')) cleanId = cleanId.replace('spotify:track:', '');
    if (cleanId && cleanId.length >= 10 && !cleanId.startsWith('local')) {
      const accessToken = (config && config.access_token) ? config.access_token : null;
      try {
        const canvasUrl = await window.electronAPI.fetchSpotifyCanvas(cleanId, accessToken);
        if (fetchToken !== currentAnimatedFetchToken) return;
        if (canvasUrl) {
          const item = { type: 'video', url: canvasUrl };
          saveAnimatedArtCache(cacheKey, item);
          setAnimatedAlbumArt(item, staticArtUrl);
          return;
        }
      } catch (e) {
        console.warn("[Canvas] Fetch error:", e);
      }
    }
  }

  // Fallback to static cover (Giphy GIF search removed — returns inaccurate/unrelated results)
  saveAnimatedArtCache(cacheKey, 'notfound');
  setAnimatedAlbumArt(null, staticArtUrl);
}

function applyVisualSettings(fromTray = false, skipIPC = false) {
  if (config && config.sp_dc) {
    const inputSpDc = document.getElementById("input-sp-dc");
    if (inputSpDc) inputSpDc.value = config.sp_dc;
  }

  if (settings.wallpaperMode && settings.taskbarMode) {
    settings.taskbarMode = false;
  }
  if (!['style1', 'style2', 'style3'].includes(settings.wallpaperStyle)) {
    settings.wallpaperStyle = 'style1';
  }

  // Custom Background Logic
  const customBgVideo = document.getElementById("custom-bg-video");
  const customBgImg = document.getElementById("custom-bg-img");
  const btnClearBg = document.getElementById("btn-clear-bg");
  const labelBgFilename = document.getElementById("label-bg-filename");

  // Handle legacy settings.customBg by migrating it to customBgSrc/Type
  if (settings.customBg && !settings.customBgSrc) {
    const isVideo = settings.customBg.endsWith('.mp4') || settings.customBg.endsWith('.webm');
    const raw = settings.customBg.replace(/\\/g, "/");
    settings.customBgSrc = (window.electronAPI?.convertFileSrc) ? window.electronAPI.convertFileSrc(settings.customBg) : `http://asset.localhost/${encodeURI(raw)}`;
    settings.customBgType = isVideo ? "video" : "image";
    settings.customBgName = settings.customBg.split(/[\\/]/).pop();
    delete settings.customBg; // Migrate away from old key
    saveLocalSettings();
  }
  
  if (settings.customBgSrc) {
    if (settings.customBgSrc.startsWith('file:///') || settings.customBgSrc.startsWith('lyricflow-media://local/')) {
      const raw = settings.customBgSrc.replace('file:///', '').replace('lyricflow-media://local/', '');
      settings.customBgSrc = (window.electronAPI?.convertFileSrc) ? window.electronAPI.convertFileSrc(raw) : `http://asset.localhost/${encodeURI(raw.replace(/\\/g, "/"))}`;
      saveLocalSettings();
    }
  }
  
  if (settings.customBgSrc && settings.customBgType) {
    if (labelBgFilename) labelBgFilename.textContent = settings.customBgName || "Selected File";
    if (btnClearBg) btnClearBg.style.display = "block";
    
    // Hide ambient glow when custom bg is active to prevent color clash
    const glowDiv = document.querySelector('.ambient-glow');
    if (glowDiv) glowDiv.style.opacity = '0';

    // Ensure transparent body so custom background is completely visible
    document.body.style.backgroundColor = 'transparent';

    if (settings.customBgType === "video") {
      if (customBgImg) customBgImg.style.display = "none";
      if (customBgVideo) {
        if (customBgVideo.src !== settings.customBgSrc) {
          customBgVideo.src = settings.customBgSrc;
        }
        customBgVideo.style.display = "block";
        customBgVideo.play().catch(() => {});
      }
    } else {
      if (customBgVideo) {
        customBgVideo.style.display = "none";
        customBgVideo.pause();
      }
      if (customBgImg) {
        if (customBgImg.src !== settings.customBgSrc) {
          customBgImg.src = settings.customBgSrc;
        }
        customBgImg.style.display = "block";
      }
    }
  } else {
    if (customBgVideo) {
      customBgVideo.style.display = "none";
      customBgVideo.pause();
      customBgVideo.removeAttribute("src");
      customBgVideo.load();
    }
    if (customBgImg) {
      customBgImg.style.display = "none";
      customBgImg.removeAttribute("src");
    }
    if (btnClearBg) btnClearBg.style.display = "none";
    if (labelBgFilename) labelBgFilename.textContent = "None selected";
    
    // Restore transparent body so overlay mode works normally
    document.body.style.backgroundColor = 'transparent';
    
    const glowDiv = document.querySelector('.ambient-glow');
    if (glowDiv) glowDiv.style.opacity = '1';
  }

  // Animated & GIF Album Art Settings Sync
  if (checkAnimatedAlbumArt) {
    checkAnimatedAlbumArt.checked = settings.animatedAlbumArt !== false;
  }
  if (settings.customArtGifSrc) {
    if (labelCustomArtGifFilename) labelCustomArtGifFilename.textContent = settings.customArtGifName || "Custom GIF Selected";
    if (btnClearCustomArtGif) btnClearCustomArtGif.style.display = "block";
  } else {
    if (labelCustomArtGifFilename) labelCustomArtGifFilename.textContent = "Auto (Spotify Canvas & Aesthetic GIFs)";
    if (btnClearCustomArtGif) btnClearCustomArtGif.style.display = "none";
  }

  if (settings.customArtGifSrc && (settings.customArtGifSrc.startsWith('http://asset.localhost/') || (!settings.customArtGifSrc.startsWith('data:') && !settings.customArtGifSrc.startsWith('http')))) {
    try {
      let rawPath = settings.customArtGifPath;
      if (!rawPath && settings.customArtGifSrc.startsWith('http://asset.localhost/')) {
        rawPath = decodeURIComponent(settings.customArtGifSrc.replace('http://asset.localhost/', ''));
      }
      if (rawPath && window.electronAPI && window.electronAPI.readFileDataUrl) {
        window.electronAPI.readFileDataUrl(rawPath).then(dataUrl => {
          if (dataUrl) {
            settings.customArtGifPath = rawPath;
            settings.customArtGifSrc = dataUrl;
            saveLocalSettings();
            if (currentPlayingTrackObj) {
              updateAnimatedAlbumArt(currentPlayingTrackObj, currentStaticAlbumArtUrl);
            }
          }
        }).catch(() => {});
      }
    } catch (e) {}
  }

  const wStyle = settings.wallpaperStyle || 'style1';
  const hasCustomBackground = Boolean(settings.customBgSrc && settings.customBgType && (!settings.wallpaperMode || wStyle !== 'style2'));

  if (settings.wallpaperMode && config) {
    if (screenLyrics) screenLyrics.style.display = "flex";
    if (screenLogin) screenLogin.style.display = "none";
  }

  document.body.classList.toggle("wallpaper-mode", settings.wallpaperMode === true);
  document.body.classList.toggle("wallpaper-style-1", settings.wallpaperMode && wStyle === 'style1');
  document.body.classList.toggle("wallpaper-style-2", settings.wallpaperMode && wStyle === 'style2');
  document.body.classList.toggle("wallpaper-style-3", settings.wallpaperMode && wStyle === 'style3');
  document.body.classList.toggle("custom-bg-active", hasCustomBackground);
  if (appContainer) {
    appContainer.classList.toggle("wallpaper-mode", settings.wallpaperMode === true);
    appContainer.classList.toggle("custom-bg-active", hasCustomBackground);
  }

  // Overlay Sliders UI (Style 3)
  const showOverlaySettings = wStyle === 'style3';
  if (settingOverlayPosRow) settingOverlayPosRow.style.display = showOverlaySettings ? 'flex' : 'none';
  if (settingOverlayWidthRow) settingOverlayWidthRow.style.display = showOverlaySettings ? 'flex' : 'none';
  if (settingWallpaperFontSizeRow) settingWallpaperFontSizeRow.style.display = showOverlaySettings ? 'flex' : 'none';

  const overlayX = settings.wallpaperOverlayX !== undefined ? settings.wallpaperOverlayX : 50;
  const overlayY = settings.wallpaperOverlayY !== undefined ? settings.wallpaperOverlayY : 50;
  const overlayWidth = settings.wallpaperOverlayWidth || 60;
  const overlayFontSize = settings.wallpaperFontSize || 32;

  document.documentElement.style.setProperty('--overlay-x', `${overlayX}%`);
  document.documentElement.style.setProperty('--overlay-y', `${overlayY}%`);
  document.documentElement.style.setProperty('--overlay-width', `${overlayWidth}%`);
  document.documentElement.style.setProperty('--wallpaper-font-size', `${overlayFontSize}px`);

  if (previewBox) {
    previewBox.style.left = `${overlayX}%`;
    previewBox.style.top = `${overlayY}%`;
  }
  if (sliderOverlayWidth) sliderOverlayWidth.value = overlayWidth;
  if (valOverlayWidth) valOverlayWidth.textContent = `${overlayWidth}%`;
  if (selectWallpaperFontSize) selectWallpaperFontSize.value = overlayFontSize;

  // Theme & Accent Color
  const currentTheme = settings.theme || 'dark';
  const currentAccent = settings.accentColor || 'green';
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.documentElement.setAttribute('data-accent', currentAccent);
  if (selectTheme) selectTheme.value = currentTheme;
  document.querySelectorAll('.accent-swatch').forEach(swatch => {
    swatch.classList.toggle('active', swatch.dataset.accent === currentAccent);
  });

  const ACCENT_COLOR_MAP = {
    green: '#1DB954',
    purple: '#8b5cf6',
    blue: '#3b82f6',
    rose: '#f43f5e',
    orange: '#f97316',
    teal: '#14b8a6'
  };
  const currentTbOffset = settings.taskbarOffset !== undefined ? settings.taskbarOffset : (settings.tbOffset || 0);
  settings.tbOffset = currentTbOffset;
  settings.taskbarOffset = currentTbOffset;
  if (!skipIPC && window.electronAPI && window.electronAPI.syncTaskbarConfig) {
    window.electronAPI.syncTaskbarConfig({
      accentColor: ACCENT_COLOR_MAP[currentAccent] || '#1DB954',
      lyricOffsetX: currentTbOffset,
      taskbarOffset: currentTbOffset
    });
  }

  // Font Size
  document.documentElement.style.setProperty('--font-size', `${settings.fontSize}px`);
  if (selectFontSize) selectFontSize.value = settings.fontSize;

  // Taskbar Font Size
  document.documentElement.style.setProperty('--tb-font-size', `${settings.taskbarFontSize || 14}px`);
  if (sliderTbFontsize) sliderTbFontsize.value = settings.taskbarFontSize || 14;
  if (valTbFontsize) valTbFontsize.textContent = `${settings.taskbarFontSize || 14}px`;

  // Text Align
  document.documentElement.style.setProperty('--text-align', settings.textAlign);
  if (selectAlign) selectAlign.value = settings.textAlign;

  // Overlay Opacity
  document.documentElement.style.setProperty('--bg-opacity', settings.bgOpacity / 100);
  if (sliderBgOpacity) sliderBgOpacity.value = settings.bgOpacity;
  if (valBgOpacity) valBgOpacity.textContent = `${settings.bgOpacity}%`;

  // Glow Intensity
  const glowVal = typeof settings.glow === 'number' ? settings.glow : (typeof settings.glowIntensity === 'number' ? settings.glowIntensity : 65);
  settings.glow = glowVal;
  settings.glowIntensity = glowVal;
  document.documentElement.style.setProperty('--glow-intensity', glowVal / 100);
  if (sliderGlow) sliderGlow.value = glowVal;
  if (valGlow) valGlow.textContent = `${glowVal}%`;
  const ambientDiv = document.getElementById("ambient-glow");
  if (ambientDiv) {
    ambientDiv.style.display = (glowVal === 0) ? 'none' : '';
  }

  // Font Family
  document.documentElement.style.setProperty('--font-family', settings.fontFamily);
  if (selectFont) selectFont.value = settings.fontFamily;

  // Line Spacing
  document.documentElement.style.setProperty('--line-spacing', `${settings.lineSpacing}px`);
  if (sliderLineSpacing) sliderLineSpacing.value = settings.lineSpacing;
  if (valLineSpacing) valLineSpacing.textContent = `${settings.lineSpacing}px`;

  // Highlight Color & Glow
  if (!settings.highlightColor) settings.highlightColor = 'dynamic';
  let colorVal = '#ffffff';
  let glowColor = 'rgba(255, 255, 255, 0.25)';
  const glowRaw = typeof settings.glowIntensity === 'number' ? settings.glowIntensity : (typeof settings.glow === 'number' ? settings.glow : 65);
  const glowInt = glowRaw / 100;

  if (settings.highlightColor === 'dynamic') {
    colorVal = 'var(--art-color-1, #1DB954)';
    glowColor = `rgba(var(--art-color-1-rgb, 29, 185, 84), ${glowInt})`;
  } else if (settings.highlightColor === 'green') {
    colorVal = '#1db954';
    glowColor = `rgba(29, 185, 84, ${glowInt})`;
  } else if (settings.highlightColor === 'white') {
    colorVal = '#ffffff';
    glowColor = `rgba(255, 255, 255, ${glowInt})`;
  } else if (settings.highlightColor === 'blue') {
    colorVal = '#00d2ff';
    glowColor = `rgba(0, 210, 255, ${glowInt})`;
  } else if (settings.highlightColor === 'purple') {
    colorVal = '#d946ef';
    glowColor = `rgba(217, 70, 239, ${glowInt})`;
  } else if (settings.highlightColor === 'midnight') {
    colorVal = '#6366f1';
    glowColor = `rgba(99, 102, 241, ${glowInt})`;
  } else if (settings.highlightColor === 'sunset') {
    colorVal = '#f97316';
    glowColor = `rgba(249, 115, 22, ${glowInt})`;
  }

  document.documentElement.style.setProperty('--highlight-color', colorVal);
  document.documentElement.style.setProperty('--highlight-glow', glowColor);
  if (selectHighlightColor) selectHighlightColor.value = settings.highlightColor;
  if (selectGeniusPosition) selectGeniusPosition.value = settings.geniusPosition || 'top-left';

  if (selectDblclickAction) selectDblclickAction.value = settings.dblclickAction || "rewind";

  // Show/Hide Playback Widget
  if (playbackWidget) {
    if (settings.showWidget) {
      playbackWidget.style.display = 'flex';
    } else {
      playbackWidget.style.display = 'none';
    }
  }
  if (checkShowWidget) checkShowWidget.checked = settings.showWidget;
  if (checkFullscreenLyrics) checkFullscreenLyrics.checked = settings.fullscreenLyrics || false;
  if (checkTaskbarMode) checkTaskbarMode.checked = settings.taskbarMode || false;
  if (checkAutoHideTaskbar) checkAutoHideTaskbar.checked = settings.autoHideTaskbarOnPause !== false;
  if (checkWallpaperMode) checkWallpaperMode.checked = settings.wallpaperMode || false;
  if (selectWallpaperStyle) selectWallpaperStyle.value = settings.wallpaperStyle || 'style1';
  const selWpMon = document.getElementById("select-wallpaper-monitor");
  if (selWpMon) selWpMon.value = settings.wallpaperMonitor || '0';

  // Window Toggles (sync UI states)


  if (settings.clickThrough) {
    if (btnClickThrough) btnClickThrough.classList.add("active");
  } else {
    if (btnClickThrough) btnClickThrough.classList.remove("active");
  }
  if (checkAlwaysOnTop) {
    checkAlwaysOnTop.checked = settings.alwaysOnTop;
  }

  // Render text shadows for glowing
  if (settings.glow > 0) {
    document.documentElement.style.setProperty('--lyric-shadow', `0 0 ${settings.glow / 5}px var(--highlight-glow)`);
    document.documentElement.style.setProperty('--tb-lyric-shadow', `0 0 ${settings.glow / 5}px rgba(0,0,0,0.5), 0 0 ${settings.glow / 2}px var(--highlight-glow)`);
  } else {
    document.documentElement.style.setProperty('--lyric-shadow', 'none');
    document.documentElement.style.setProperty('--tb-lyric-shadow', `0 0 4px rgba(0,0,0,0.8)`);
  }

  // Taskbar alignment styles
  if (settings.taskbarAlign === 'center') {
    document.documentElement.style.setProperty('--tb-align', 'center');
    document.documentElement.style.setProperty('--tb-flex-align', 'center');
  } else if (settings.taskbarAlign === 'right') {
    document.documentElement.style.setProperty('--tb-align', 'right');
    document.documentElement.style.setProperty('--tb-flex-align', 'flex-end');
  } else {
    document.documentElement.style.setProperty('--tb-align', 'left');
    document.documentElement.style.setProperty('--tb-flex-align', 'flex-start');
  }

  // Taskbar Translate Mode
  document.documentElement.style.setProperty('--tb-translate-display', settings.taskbarTranslate ? 'block' : 'none');

  // Compact Mode UI
  if (settings.compactMode && !settings.taskbarMode) {
    document.body.classList.add("compact-mode");
    if (appContainer) appContainer.classList.add("compact-mode");
  } else {
    document.body.classList.remove("compact-mode");
    if (appContainer) appContainer.classList.remove("compact-mode");
  }

  // Taskbar Mode UI
  if (settings.taskbarMode) {
    // Show settings row details
    if (settingTbAlignRow) settingTbAlignRow.style.display = 'flex';
    if (settingTbTranslationRow) settingTbTranslationRow.style.display = 'flex';
    if (settingTbOffsetRow) settingTbOffsetRow.style.display = 'flex';
    if (settingTbFontsizeRow) settingTbFontsizeRow.style.display = 'flex';
    if (settingFsLyricsRow) settingFsLyricsRow.style.display = 'flex';

    // Only send IPC if the mode actually changed to avoid hide/show cycles
    if (!skipIPC && lastSentTaskbarMode !== true) {
      lastSentTaskbarMode = true;
      window.electronAPI.setTaskbarMode(true, fromTray);
    }
    if (checkTaskbarMode) checkTaskbarMode.checked = true;
    updateTaskbarColors();
  } else {
    document.body.classList.remove("taskbar-mode");
    if (appContainer) appContainer.classList.remove("taskbar-mode");
    if (taskbarContainer) taskbarContainer.style.display = "none";

    // Hide settings row details
    if (settingTbAlignRow) settingTbAlignRow.style.display = "none";
    if (settingTbTranslationRow) settingTbTranslationRow.style.display = "none";
    if (settingTbOffsetRow) settingTbOffsetRow.style.display = "none";
    if (settingTbFontsizeRow) settingTbFontsizeRow.style.display = "none";
    if (settingFsLyricsRow) settingFsLyricsRow.style.display = "none";

    // Restore normal containers
    if (config) {
      if (screenLyrics) screenLyrics.style.display = "flex";
    } else {
      if (screenLogin) screenLogin.style.display = "flex";
    }

    // Only send IPC if the mode actually changed
    if (!skipIPC && lastSentTaskbarMode !== false) {
      lastSentTaskbarMode = false;
      window.electronAPI.setTaskbarMode(false, fromTray);
    }
    if (checkTaskbarMode) checkTaskbarMode.checked = false;
    if (tbPauseHideTimer) {
      clearTimeout(tbPauseHideTimer);
      tbPauseHideTimer = null;
    }
    isTbPlaybackHidden = false;
    updateTaskbarColors(); // clean up polling
  }

  // Taskbar alignments & offset rendering
  applyTaskbarOffset();
  // Width is managed by taskbar_renderer.js — do NOT call maybeSyncTaskbarLayout here
  // document.body.classList.toggle("wbw-active", settings.wordByWord === true); // MOVED to renderLyrics

  if (selectTbAlign) selectTbAlign.value = settings.taskbarAlign;
  if (sliderTbOffset) {
    sliderTbOffset.value = settings.taskbarOffset;
    if (valTbOffset) valTbOffset.textContent = `${settings.taskbarOffset}px`;
  }

  if (checkEdgeGlow) checkEdgeGlow.checked = settings.edgeGlow || false;

  if (!skipIPC) {
    // Sync tray state (only if changed)
    if (settings.taskbarMode !== _lastSyncedTaskbarMode) {
      _lastSyncedTaskbarMode = settings.taskbarMode;
      window.electronAPI.syncTaskbarModeState(settings.taskbarMode);
    }

    const currentWpMonitor = settings.wallpaperMonitor || '0';
    if ((settings.wallpaperMode || false) !== lastSentWallpaperMode || (settings.wallpaperMode && currentWpMonitor !== lastSentWallpaperMonitor)) {
      lastSentWallpaperMode = settings.wallpaperMode || false;
      lastSentWallpaperMonitor = currentWpMonitor;
      window.electronAPI.setWallpaperMode(lastSentWallpaperMode, currentWpMonitor);
    }

    if (settings.alwaysOnTop !== window._lastSyncedAlwaysOnTop) {
      window._lastSyncedAlwaysOnTop = settings.alwaysOnTop;
      window.electronAPI.setAlwaysOnTop(settings.alwaysOnTop || false);
    }

    // Sync fullscreen preference to main process (only if changed)
    if ((settings.fullscreenLyrics || false) !== window._lastSyncedFullscreen) {
      window._lastSyncedFullscreen = settings.fullscreenLyrics || false;
      window.electronAPI.setFullscreenLyrics(settings.fullscreenLyrics || false);
    }

    // Update Edge Glow Window
    const edgeGlowColor = document.documentElement.style.getPropertyValue('--art-color-1') || '#1DB954';
    const edgeGlowState = `${settings.edgeGlow}_${edgeGlowColor}`;
    if (window._lastSyncedEdgeGlow !== edgeGlowState) {
      window._lastSyncedEdgeGlow = edgeGlowState;
      window.electronAPI.setEdgeGlow(settings.edgeGlow || false, edgeGlowColor);
    }
  }

  if (inputSyncOffset) inputSyncOffset.value = settings.syncOffsetMs || 0;

  applyGeniusPosition();

  // Auto-Hide Lyrics controls sync
  if (checkAutoHideLyrics) checkAutoHideLyrics.checked = settings.autoHideLyrics || false;
  if (selectAutoHideTrigger) selectAutoHideTrigger.value = settings.autoHideTrigger || 'paused';
  if (selectAutoHideAction) selectAutoHideAction.value = settings.autoHideAction || 'collapse';
  const autoHideDelayVal = settings.autoHideDelay !== undefined ? settings.autoHideDelay : 3;
  if (sliderAutoHideDelay) sliderAutoHideDelay.value = autoHideDelayVal;
  if (valAutoHideDelay) valAutoHideDelay.textContent = `${autoHideDelayVal}s`;

  const showAutoHideRows = settings.autoHideLyrics ? 'flex' : 'none';
  if (settingAutoHideTriggerRow) settingAutoHideTriggerRow.style.display = showAutoHideRows;
  if (settingAutoHideActionRow) settingAutoHideActionRow.style.display = showAutoHideRows;
  if (settingAutoHideDelayRow) settingAutoHideDelayRow.style.display = showAutoHideRows;

  if (checkShowAnnotations) checkShowAnnotations.checked = settings.showAnnotations !== false;
  if (checkShowAnnotationPreview) checkShowAnnotationPreview.checked = settings.showAnnotationPreview === true;

  if (settings.wallpaperMode) {
    hideLiveMeaningPill();
    hideGeniusModal();
  } else if (settings.showAnnotations !== false && currentAnnotations.length === 0 && currentTrackId) {
    const trackName = widgetTrackName ? widgetTrackName.textContent : '';
    const artistName = widgetArtistName ? widgetArtistName.textContent : '';
    if (trackName && artistName) {
      fetchGeniusAnnotations(trackName, artistName, currentTrackId);
    }
  }
  attachAnnotationsToRenderedLyrics();

  updateAutoHideState();
}

function applyGeniusPosition() {
  if (!geniusFactCard) return;
  const pos = settings.geniusPosition || 'top-left';

  // Reset all positional inline styles
  geniusFactCard.style.top = '';
  geniusFactCard.style.bottom = '';
  geniusFactCard.style.left = '';
  geniusFactCard.style.right = '';
  geniusFactCard.style.transform = '';

  if (pos === 'top-left') {
    geniusFactCard.style.top = '60px';
    geniusFactCard.style.left = '20px';
  } else if (pos === 'top-center') {
    geniusFactCard.style.top = '60px';
    geniusFactCard.style.left = '50%';
    geniusFactCard.style.transform = 'translateX(-50%)';
  } else if (pos === 'top-right') {
    geniusFactCard.style.top = '60px';
    geniusFactCard.style.right = '20px';
  } else if (pos === 'bottom-left') {
    geniusFactCard.style.bottom = '120px';
    geniusFactCard.style.left = '20px';
  } else if (pos === 'bottom-center') {
    geniusFactCard.style.bottom = '120px';
    geniusFactCard.style.left = '50%';
    geniusFactCard.style.transform = 'translateX(-50%)';
  } else if (pos === 'bottom-right') {
    geniusFactCard.style.bottom = '120px';
    geniusFactCard.style.right = '20px';
  } else {
    geniusFactCard.style.top = '60px';
    geniusFactCard.style.left = '20px';
  }
}

// Lightweight helper to update taskbar lyric text alignment inside the compact window
function applyTaskbarOffset() {
  if (!taskbarContainer) return;
  const tbLyric = taskbarContainer.querySelector('.tb-lyric');
  if (!tbLyric) return;

  if (settings.taskbarAlign === 'left') {
    tbLyric.style.textAlign = 'left';
  } else if (settings.taskbarAlign === 'right') {
    tbLyric.style.textAlign = 'right';
  } else {
    tbLyric.style.textAlign = 'center';
  }
}

// Setup Event Handlers
function setupUIHandlers() {
  const obPage1 = document.getElementById('ob-page-1');
  const obPage2 = document.getElementById('ob-page-2');
  const obPage3 = document.getElementById('ob-page-3');
  const obPage4 = document.getElementById('ob-page-4');
  const obCardWallpaper = document.getElementById('ob-card-wallpaper');
  const obCardTaskbar = document.getElementById('ob-card-taskbar');
  const obCardStandard = document.getElementById('ob-card-standard');
  
  const btnNext1 = document.getElementById('btn-next-onboarding-1');
  const btnNext2 = document.getElementById('btn-next-onboarding-2');
  const btnNext3 = document.getElementById('btn-next-onboarding-3');
  const btnBack2 = document.getElementById('btn-back-onboarding-2');
  const btnBack3 = document.getElementById('btn-back-onboarding-3');
  const btnBack4 = document.getElementById('btn-back-onboarding-4');
  const btnFinishFinal = document.getElementById('btn-finish-onboarding-final');

  const dot1 = document.getElementById('ob-step-dot-1');
  const dot2 = document.getElementById('ob-step-dot-2');
  const dot3 = document.getElementById('ob-step-dot-3');
  const dot4 = document.getElementById('ob-step-dot-4');

  const obSliderOpacity = document.getElementById('ob-slider-opacity');
  const obValOpacity = document.getElementById('ob-val-opacity');
  const obSliderFontsize = document.getElementById('ob-slider-fontsize');
  const obValFontsize = document.getElementById('ob-val-fontsize');
  const obPreviewCard = document.getElementById('ob-preview-card');
  const obPreviewLineActive = document.getElementById('ob-preview-line-active');

  const obCardConnectSpotify = document.getElementById('ob-card-connect-spotify');
  const obCardLocalMode = document.getElementById('ob-card-local-mode');
  const obBtnLoginSpotify = document.getElementById('ob-btn-login-spotify');
  const obBtnSelectLocal = document.getElementById('ob-btn-select-local');

  const obBadgeStandard = document.getElementById('ob-badge-standard');
  const obBadgeTaskbar = document.getElementById('ob-badge-taskbar');
  const obBadgeWallpaper = document.getElementById('ob-badge-wallpaper');
  const obWallpaperMonitorSection = document.getElementById('ob-wallpaper-monitor-section');

  if (obPage1 && obPage2 && obPage3 && obPage4) {
    let pickedMode = settings.taskbarMode ? 'taskbar' : (settings.wallpaperMode ? 'wallpaper' : 'standard');

    const updateModeSelection = (mode, selectedElem) => {
      [obCardWallpaper, obCardTaskbar, obCardStandard].forEach(el => {
        if (el) {
          el.classList.remove('selected');
          el.style.borderColor = 'rgba(255,255,255,0.1)';
        }
      });
      [obBadgeStandard, obBadgeTaskbar, obBadgeWallpaper].forEach(b => {
        if (b) {
          b.textContent = 'Select';
          b.style.background = 'rgba(255,255,255,0.08)';
          b.style.color = 'rgba(255,255,255,0.8)';
          b.style.fontWeight = '600';
        }
      });

      if (selectedElem) {
        selectedElem.classList.add('selected');
        selectedElem.style.borderColor = '#1DB954';
      }
      pickedMode = mode;

      let activeBadge = null;
      if (mode === 'standard') activeBadge = obBadgeStandard;
      else if (mode === 'taskbar') activeBadge = obBadgeTaskbar;
      else if (mode === 'wallpaper') activeBadge = obBadgeWallpaper;

      if (activeBadge) {
        activeBadge.textContent = '✓ Selected';
        activeBadge.style.background = '#1DB954';
        activeBadge.style.color = '#000';
        activeBadge.style.fontWeight = '700';
      }

      if (mode === 'wallpaper') {
        if (obWallpaperMonitorSection) {
          obWallpaperMonitorSection.style.display = 'block';
          populateOnboardingMonitors();
        }
      } else {
        if (obWallpaperMonitorSection) {
          obWallpaperMonitorSection.style.display = 'none';
        }
      }
    };

    if (obCardStandard) obCardStandard.addEventListener('click', () => updateModeSelection('standard', obCardStandard));
    if (obCardTaskbar) obCardTaskbar.addEventListener('click', () => updateModeSelection('taskbar', obCardTaskbar));
    if (obCardWallpaper) obCardWallpaper.addEventListener('click', () => updateModeSelection('wallpaper', obCardWallpaper));

    // Page 1 -> Page 2
    if (btnNext1) {
      btnNext1.addEventListener('click', () => {
        obPage1.style.opacity = '0';
        if (dot1) dot1.classList.remove('active');
        if (dot2) dot2.classList.add('active');
        setTimeout(() => {
          obPage1.style.display = 'none';
          obPage2.style.display = 'flex';
          setTimeout(() => { obPage2.style.opacity = '1'; }, 30);
        }, 200);
      });
    }

    // Page 2: Live Customization Listeners
    if (obSliderOpacity && obValOpacity) {
      obSliderOpacity.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        settings.bgOpacity = val;
        obValOpacity.textContent = `${val}%`;
        if (obPreviewCard) {
          obPreviewCard.style.background = `rgba(10, 10, 15, ${val / 100})`;
        }
        document.documentElement.style.setProperty('--bg-opacity', val / 100);
      });
    }

    if (obSliderFontsize && obValFontsize) {
      obSliderFontsize.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        settings.fontSize = val;
        obValFontsize.textContent = `${val}px`;
        if (obPreviewLineActive) {
          obPreviewLineActive.style.fontSize = `${val}px`;
        }
        document.documentElement.style.setProperty('--font-size', `${val}px`);
      });
    }

    // Page 2 -> Page 1
    if (btnBack2) {
      btnBack2.addEventListener('click', () => {
        obPage2.style.opacity = '0';
        if (dot2) dot2.classList.remove('active');
        if (dot1) dot1.classList.add('active');
        setTimeout(() => {
          obPage2.style.display = 'none';
          obPage1.style.display = 'flex';
          setTimeout(() => { obPage1.style.opacity = '1'; }, 30);
        }, 200);
      });
    }

    // Page 2 -> Page 3
    if (btnNext2) {
      btnNext2.addEventListener('click', () => {
        obPage2.style.opacity = '0';
        if (dot2) dot2.classList.remove('active');
        if (dot3) dot3.classList.add('active');
        setTimeout(() => {
          obPage2.style.display = 'none';
          obPage3.style.display = 'flex';
          setTimeout(() => { obPage3.style.opacity = '1'; }, 30);
        }, 200);
      });
    }

    // Page 3: Audio Source Selection
    const selectSpotifySource = () => {
      if (obCardLocalMode) {
        obCardLocalMode.classList.remove('selected');
        obCardLocalMode.style.borderColor = 'rgba(255,255,255,0.1)';
      }
      if (obCardConnectSpotify) {
        obCardConnectSpotify.classList.add('selected');
        obCardConnectSpotify.style.borderColor = '#1DB954';
      }
      if (config) config.localMode = false;
      settings.localMode = false;
    };

    const selectLocalSource = () => {
      if (obCardConnectSpotify) {
        obCardConnectSpotify.classList.remove('selected');
        obCardConnectSpotify.style.borderColor = 'rgba(255,255,255,0.1)';
      }
      if (obCardLocalMode) {
        obCardLocalMode.classList.add('selected');
        obCardLocalMode.style.borderColor = '#1DB954';
      }
      if (config) config.localMode = true;
      settings.localMode = true;
    };

    if (obCardConnectSpotify) obCardConnectSpotify.addEventListener('click', selectSpotifySource);
    if (obCardLocalMode) obCardLocalMode.addEventListener('click', selectLocalSource);
    if (obBtnSelectLocal) {
      obBtnSelectLocal.addEventListener('click', (e) => {
        e.stopPropagation();
        selectLocalSource();
      });
    }

    if (obBtnLoginSpotify) {
      obBtnLoginSpotify.addEventListener('click', async (e) => {
        e.stopPropagation();
        obBtnLoginSpotify.textContent = "Connecting...";
        try {
          if (window.electronAPI && typeof window.electronAPI.loginViaWeb === 'function') {
            const res = await window.electronAPI.loginViaWeb();
            if (res && res.success) {
              obBtnLoginSpotify.textContent = "✓ Connected!";
              obBtnLoginSpotify.style.background = "#1DB954";
              selectSpotifySource();
            } else {
              obBtnLoginSpotify.textContent = "Try Again";
            }
          }
        } catch (err) {
          console.error("Login via onboarding error:", err);
          obBtnLoginSpotify.textContent = "Try Again";
        }
      });
    }

    // Page 3 -> Page 2
    if (btnBack3) {
      btnBack3.addEventListener('click', () => {
        obPage3.style.opacity = '0';
        if (dot3) dot3.classList.remove('active');
        if (dot2) dot2.classList.add('active');
        setTimeout(() => {
          obPage3.style.display = 'none';
          obPage2.style.display = 'flex';
          setTimeout(() => { obPage2.style.opacity = '1'; }, 30);
        }, 200);
      });
    }

    // Page 3 -> Page 4
    if (btnNext3) {
      btnNext3.addEventListener('click', () => {
        obPage3.style.opacity = '0';
        if (dot3) dot3.classList.remove('active');
        if (dot4) dot4.classList.add('active');
        setTimeout(() => {
          obPage3.style.display = 'none';
          obPage4.style.display = 'flex';
          setTimeout(() => { obPage4.style.opacity = '1'; }, 30);
        }, 200);
      });
    }

    // Page 4 -> Page 3
    if (btnBack4) {
      btnBack4.addEventListener('click', () => {
        obPage4.style.opacity = '0';
        if (dot4) dot4.classList.remove('active');
        if (dot3) dot3.classList.add('active');
        setTimeout(() => {
          obPage4.style.display = 'none';
          obPage3.style.display = 'flex';
          setTimeout(() => { obPage3.style.opacity = '1'; }, 30);
        }, 200);
      });
    }

    // Finalize Setup & Launch
    const finalizeSetup = async () => {
      if (pickedMode === 'wallpaper') {
        settings.wallpaperMode = true;
        settings.taskbarMode = false;
      } else if (pickedMode === 'taskbar') {
        settings.taskbarMode = true;
        settings.wallpaperMode = false;
      } else {
        settings.wallpaperMode = false;
        settings.taskbarMode = false;
      }
      
      settings.hasCompletedSetup = true;
      settings.firstRun = false;
      localStorage.setItem("lyricflow_setup_done", "true");
      saveLocalSettings();
      
      const screenOnboarding = document.getElementById('screen-onboarding');
      if (screenOnboarding) {
        screenOnboarding.classList.remove("active");
        screenOnboarding.style.display = "none";
      }
      
      applyVisualSettings();
      showLyricsScreen();
    };

    if (btnFinishFinal) {
      btnFinishFinal.addEventListener('click', finalizeSetup);
    }
  }

  // Floating Tip Banner Dismiss Handler
  const tipBanner = document.getElementById('floating-tip-banner');
  const btnDismissTip = document.getElementById('btn-dismiss-tip');
  if (btnDismissTip && tipBanner) {
    btnDismissTip.addEventListener('click', () => {
      localStorage.setItem('lyricflow_tip_dismissed', 'true');
      tipBanner.style.opacity = '0';
      tipBanner.style.transform = 'translate(-50%, 14px)';
      tipBanner.style.transition = 'all 0.25s ease';
      setTimeout(() => {
        tipBanner.style.display = 'none';
      }, 250);
    });
  }

  // Re-run setup wizard button from Settings Panel
  const btnRerunSetup = document.getElementById('btn-rerun-setup');
  if (btnRerunSetup) {
    btnRerunSetup.addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      if (panel) panel.classList.remove('open');
      showOnboardingWizard();
    });
  }
  // Auth Form Submission (Seamless Web Flow)
  const btnLoginWeb = document.getElementById("btn-login-web");
  if (btnLoginWeb) {
    btnLoginWeb.addEventListener("click", async () => {
      const originalText = btnLoginWeb.innerHTML;
      btnLoginWeb.innerHTML = '<span class="loading-spinner"></span> Connecting...';
      btnLoginWeb.disabled = true;

      if (authStatus) {
        authStatus.textContent = "Opening Spotify login window...";
        authStatus.className = "status-msg";
      }

      try {
        const authConfig = await window.electronAPI.loginViaWeb();
        if (authConfig) {
          config = authConfig;
          
          if (!config.localMode && config.sp_dc) {
            if (authStatus) authStatus.textContent = "Getting access token...";
            const token = await window.electronAPI.getAccessToken(config.sp_dc);
            if (token) {
              config.access_token = token;
              window.electronAPI.saveConfig(config);
            }
          }

          if (authStatus) {
            authStatus.textContent = "Successfully connected!";
            authStatus.className = "status-msg success";
          }
          window._spotifyUserDisplayName = null;
          updateSpotifyUI();
          checkAndVerifySpotifyConnection().then(() => updateSpotifyUI());
          setTimeout(() => {
            showLyricsScreen();
          }, 1000);
        } else {
          if (authStatus) {
            authStatus.textContent = "Login window was closed or failed.";
            authStatus.className = "status-msg error";
          }
          btnLoginWeb.innerHTML = originalText;
          btnLoginWeb.disabled = false;
        }
      } catch (err) {
        if (authStatus) {
          authStatus.textContent = "Error: " + err;
          authStatus.className = "status-msg error";
        }
        btnLoginWeb.innerHTML = originalText;
        btnLoginWeb.disabled = false;
      }
    });
  }

  if (btnLocalMode) {
    btnLocalMode.addEventListener("click", () => {
      config = { localMode: true };
      window._spotifyUserDisplayName = null;
      updateSpotifyUI();
      showLyricsScreen();
      try {
        window.electronAPI.saveConfig(config);
      } catch (err) {
        console.error("Failed to save local mode config:", err);
      }
    });
  }

  // Manual Cookie fallback on Login screen
  const btnToggleManual = document.getElementById("btn-toggle-manual-cookie");
  const manualCookieSection = document.getElementById("manual-cookie-section");
  const inputManualSpdc = document.getElementById("input-manual-spdc");
  const btnSubmitManual = document.getElementById("btn-submit-manual-cookie");

  if (btnToggleManual && manualCookieSection) {
    btnToggleManual.addEventListener("click", (e) => {
      e.preventDefault();
      const isHidden = manualCookieSection.style.display === "none";
      manualCookieSection.style.display = isHidden ? "block" : "none";
      btnToggleManual.textContent = isHidden ? "Hide manual cookie entry" : "Or enter sp_dc cookie manually";
      if (isHidden && inputManualSpdc) {
        inputManualSpdc.focus();
      }
    });
  }

  if (btnSubmitManual && inputManualSpdc) {
    btnSubmitManual.addEventListener("click", async () => {
      const spDcVal = inputManualSpdc.value.trim();
      if (!spDcVal) {
        if (authStatus) {
          authStatus.textContent = "Please paste a valid sp_dc cookie.";
          authStatus.className = "status-msg error";
        }
        return;
      }

      btnSubmitManual.disabled = true;
      btnSubmitManual.textContent = "Verifying...";
      if (authStatus) {
        authStatus.textContent = "Connecting to Spotify...";
        authStatus.className = "status-msg";
      }

      try {
        const token = await window.electronAPI.getAccessToken(spDcVal);
        if (token) {
          config = {
            sp_dc: spDcVal,
            access_token: token,
            localMode: false
          };
          await window.electronAPI.saveConfig(config);
          if (authStatus) {
            authStatus.textContent = "Successfully connected!";
            authStatus.className = "status-msg success";
          }
          window._spotifyUserDisplayName = null;
          updateSpotifyUI();
          checkAndVerifySpotifyConnection().then(() => updateSpotifyUI());
          setTimeout(() => {
            showLyricsScreen();
          }, 800);
        } else {
          if (authStatus) {
            authStatus.textContent = "Invalid or expired sp_dc cookie. Please check and try again.";
            authStatus.className = "status-msg error";
          }
          btnSubmitManual.disabled = false;
          btnSubmitManual.textContent = "Connect";
        }
      } catch (err) {
        if (authStatus) {
          authStatus.textContent = "Connection error: " + err;
          authStatus.className = "status-msg error";
        }
        btnSubmitManual.disabled = false;
        btnSubmitManual.textContent = "Connect";
      }
    });
  }

  const btnHideLyrics = document.getElementById("btn-hide-lyrics");
  if (btnHideLyrics) {
    btnHideLyrics.addEventListener("click", () => {
      if (!currentTrackId) return;

      // Add to local blacklist
      const blacklistKey = `blacklist_lyrics_${currentTrackId}`;
      localStorage.setItem(blacklistKey, "true");

      // Clear current lyrics from UI
      lyrics = [];
      lyricsContainer.innerHTML = '<div class="lyric-line placeholder" style="color: #ff5555;">Lyrics disabled for this track.</div>';
      updateTimingStatus(1);
      btnHideLyrics.style.display = "none";
      updateAutoHideState();

      showToast("Lyrics hidden. They will not show again for this song.", 3000, 'warning');
    });
  }

  const inputSpDc = document.getElementById("input-sp-dc");
  if (inputSpDc) {
    inputSpDc.addEventListener("change", async (e) => {
      const val = e.target.value.trim();
      if (config) {
        config.sp_dc = val;
        await window.electronAPI.saveConfig(config);

        // Immediately try to upgrade current lyrics to High-Fidelity
        if (currentTrackId && trackDuration > 0) {
            fetchLyrics(currentTrackId, widgetTrackName.textContent, widgetArtistName.textContent, trackDuration);
        }

        showToast("Spotify SP_DC Cookie Saved!", 2500, 'success');
      }
    });
  }





  const selectTranslate = document.getElementById("select-translate");
  if (selectTranslate) {
    selectTranslate.value = settings.translateLang || "none";
    selectTranslate.addEventListener("change", (e) => {
      settings.translateLang = e.target.value;
      saveLocalSettings();
      clearLyricsCaches();
      if (currentTrackId) {
        const title = widgetTrackName ? widgetTrackName.textContent : "";
        const artist = widgetArtistName ? widgetArtistName.textContent : "";
        fetchLyrics(currentTrackId, title, artist, trackDuration);
      }
    });
  }

  // Skip Translation For (language)
  const selectSkipLang = document.getElementById("select-skip-lang");
  if (selectSkipLang) {
    selectSkipLang.value = settings.skipLang || 'en';
    selectSkipLang.addEventListener("change", (e) => {
      settings.skipLang = e.target.value;
      saveLocalSettings();
      clearLyricsCaches();
      if (currentTrackId) {
        const title = widgetTrackName ? widgetTrackName.textContent : "";
        const artist = widgetArtistName ? widgetArtistName.textContent : "";
        fetchLyrics(currentTrackId, title, artist, trackDuration);
      }
    });
  }

  const selectArtSource = document.getElementById("select-art-source");
  if (selectArtSource) {
    selectArtSource.value = settings.artSource || 'itunes';
    selectArtSource.addEventListener("change", (e) => {
      settings.artSource = e.target.value;
      saveLocalSettings();
    });
  }



  // Settings Tab Navigation
  const settingsTabs = document.querySelectorAll(".settings-tab");
  const settingsTabContents = document.querySelectorAll(".settings-tab-content");
  if (settingsTabs.length > 0) {
    settingsTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const targetTab = tab.dataset.tab;
        settingsTabs.forEach(t => t.classList.remove("active"));
        settingsTabContents.forEach(c => {
          c.classList.toggle("active", c.dataset.tab === targetTab);
        });
        tab.classList.add("active");
      });
    });
  }

  // Settings Panel sliders
  if (selectFontSize) {
    selectFontSize.addEventListener("change", (e) => {
      settings.fontSize = parseInt(e.target.value, 10);
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  if (selectAlign) {
    selectAlign.addEventListener("change", (e) => {
      settings.textAlign = e.target.value;
      applyVisualSettings();
      saveLocalSettings();
      // Re-render lines to update alignment transform origins
      const lines = lyricsContainer.querySelectorAll('.lyric-line');
      lines.forEach(line => {
        line.style.transformOrigin = `${settings.textAlign} center`;
      });
    });
  }

  if (sliderBgOpacity) {
    sliderBgOpacity.addEventListener("input", (e) => {
      settings.bgOpacity = parseInt(e.target.value, 10);
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  // Custom Background file pick & clear listeners
  if (btnPickBg) {
    btnPickBg.addEventListener("click", async () => {
      if (window.electronAPI && window.electronAPI.selectBackgroundFile) {
        const filePath = await window.electronAPI.selectBackgroundFile();
        if (filePath) {
          const lower = filePath.toLowerCase();
          const isVideo = lower.endsWith(".mp4") || lower.endsWith(".webm");
          const fileSrc = (window.electronAPI && window.electronAPI.convertFileSrc)
            ? window.electronAPI.convertFileSrc(filePath)
            : `http://asset.localhost/${encodeURI(filePath.replace(/\\/g, "/"))}`;
          settings.customBgSrc = fileSrc;
          settings.customBgType = isVideo ? "video" : "image";
          settings.customBgName = filePath.split(/[\\/]/).pop();

          applyVisualSettings();
          saveLocalSettings();
        }
      } else {
        console.error("selectBackgroundFile IPC not available");
      }
    });
  }

  if (btnClearBg) {
    btnClearBg.addEventListener("click", () => {
      delete settings.customBgSrc;
      delete settings.customBgType;
      delete settings.customBgName;
      if (inputBgFile) inputBgFile.value = "";
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  // Animated Album Art & Custom GIF listeners
  if (checkAnimatedAlbumArt) {
    checkAnimatedAlbumArt.addEventListener("change", (e) => {
      settings.animatedAlbumArt = e.target.checked;
      applyVisualSettings();
      saveLocalSettings();
      if (currentPlayingTrackObj) {
        updateAnimatedAlbumArt(currentPlayingTrackObj, currentStaticAlbumArtUrl);
      }
    });
  }

  if (btnPickCustomArtGif) {
    btnPickCustomArtGif.addEventListener("click", async () => {
      let filePath = null;
      if (window.electronAPI && window.electronAPI.selectAnimatedArtFile) {
        filePath = await window.electronAPI.selectAnimatedArtFile();
      } else if (window.electronAPI && window.electronAPI.selectBackgroundFile) {
        filePath = await window.electronAPI.selectBackgroundFile();
      }
      if (filePath) {
        let fileSrc = null;
        if (window.electronAPI && window.electronAPI.readFileDataUrl) {
          try {
            fileSrc = await window.electronAPI.readFileDataUrl(filePath);
          } catch (err) {
            console.warn("Failed to load data URL for art file:", err);
          }
        }
        if (!fileSrc && window.electronAPI && window.electronAPI.convertFileSrc) {
          fileSrc = window.electronAPI.convertFileSrc(filePath);
        }
        if (!fileSrc) fileSrc = filePath;

        settings.customArtGifPath = filePath;
        settings.customArtGifSrc = fileSrc;
        settings.customArtGifName = filePath.split(/[\\/]/).pop();

        applyVisualSettings();
        saveLocalSettings();
        if (currentPlayingTrackObj) {
          updateAnimatedAlbumArt(currentPlayingTrackObj, currentStaticAlbumArtUrl);
        }
      }
    });
  }

  if (btnClearCustomArtGif) {
    btnClearCustomArtGif.addEventListener("click", () => {
      delete settings.customArtGifSrc;
      delete settings.customArtGifName;
      delete settings.customArtGifPath;
      if (inputCustomArtGif) inputCustomArtGif.value = "";
      applyVisualSettings();
      saveLocalSettings();
      if (currentPlayingTrackObj) {
        updateAnimatedAlbumArt(currentPlayingTrackObj, currentStaticAlbumArtUrl);
      }
    });
  }

  if (inputCustomArtGif) {
    inputCustomArtGif.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const fileSrc = (window.electronAPI && window.electronAPI.convertFileSrc && file.path)
          ? window.electronAPI.convertFileSrc(file.path)
          : URL.createObjectURL(file);
        settings.customArtGifSrc = fileSrc;
        settings.customArtGifName = file.name;
        applyVisualSettings();
        saveLocalSettings();
        if (currentPlayingTrackObj) {
          updateAnimatedAlbumArt(currentPlayingTrackObj, currentStaticAlbumArtUrl);
        }
      }
    });
  }

  if (sliderGlow) {
    sliderGlow.addEventListener("input", (e) => {
      settings.glow = parseInt(e.target.value, 10);
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  // Theme Appearance listener
  if (selectTheme) {
    selectTheme.addEventListener("change", (e) => {
      settings.theme = e.target.value;
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  // Accent Color swatches listener
  const accentSwatches = document.querySelectorAll('.accent-swatch');
  accentSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      settings.accentColor = swatch.dataset.accent;
      applyVisualSettings();
      saveLocalSettings();
    });
  });

  // Font Family selector listener
  if (selectFont) {
    selectFont.addEventListener("change", (e) => {
      settings.fontFamily = e.target.value;
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  // Line Spacing slider listener
  if (sliderLineSpacing) {
    sliderLineSpacing.addEventListener("input", (e) => {
      settings.lineSpacing = parseInt(e.target.value, 10);
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  // Show Music Controller checkbox listener
  if (checkShowWidget) {
    checkShowWidget.addEventListener("change", (e) => {
      settings.showWidget = e.target.checked;
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  // Highlight Color selector listener
  if (selectHighlightColor) {
    selectHighlightColor.addEventListener("change", (e) => {
      settings.highlightColor = e.target.value;
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  if (selectDblclickAction) {
    selectDblclickAction.addEventListener("change", (e) => {
      settings.dblclickAction = e.target.value;
      saveLocalSettings();
    });
  }

  // Toggles & Windows Management


  if (btnClickThrough) {
    btnClickThrough.addEventListener("click", () => {
      toggleClickThrough();
    });
  }

  // Removed broken toggleAlwaysOnTop listener

  // Minimize Application button listener
  if (btnMinimize) {
    btnMinimize.addEventListener("click", () => {
      window.electronAPI.minimizeApp();
    });
  }

  // Wallpaper Mode checkbox listener
  if (checkWallpaperMode) {
    checkWallpaperMode.addEventListener("change", (e) => {
      console.log('[WALLPAPER MODE UI] Checkbox changed:', e.target.checked);
      settings.wallpaperMode = e.target.checked;
      
      // If turning on Wallpaper Mode, turn off Taskbar Mode
      if (settings.wallpaperMode) {
        settings.taskbarMode = false;
        if (checkTaskbarMode) checkTaskbarMode.checked = false;
      }
      
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  if (selectWallpaperStyle) {
    selectWallpaperStyle.value = settings.wallpaperStyle || 'style1';
    selectWallpaperStyle.addEventListener("change", (e) => {
      settings.wallpaperStyle = ['style1', 'style2', 'style3'].includes(e.target.value) ? e.target.value : 'style1';
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  const selectWallpaperMonitor = document.getElementById("select-wallpaper-monitor");
  if (selectWallpaperMonitor) {
    selectWallpaperMonitor.value = settings.wallpaperMonitor || '0';
    selectWallpaperMonitor.addEventListener("change", (e) => {
      settings.wallpaperMonitor = e.target.value;
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  if (sliderOverlayWidth) {
    sliderOverlayWidth.addEventListener("input", (e) => {
      settings.wallpaperOverlayWidth = parseInt(e.target.value, 10);
      if (valOverlayWidth) valOverlayWidth.textContent = `${settings.wallpaperOverlayWidth}%`;
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  if (selectWallpaperFontSize) {
    selectWallpaperFontSize.addEventListener("change", (e) => {
      settings.wallpaperFontSize = parseInt(e.target.value, 10);
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  // Taskbar Mode checkbox listener
  if (checkTaskbarMode) {
    checkTaskbarMode.addEventListener("change", (e) => {
      settings.taskbarMode = e.target.checked;
      if (settings.taskbarMode) {
        settings.wallpaperMode = false;
        if (checkWallpaperMode) checkWallpaperMode.checked = false;
      }
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  // Auto-hide taskbar on pause listener
  if (checkAutoHideTaskbar) {
    checkAutoHideTaskbar.addEventListener("change", (e) => {
      settings.autoHideTaskbarOnPause = e.target.checked;
      handleTaskbarPauseAutoHide(!isPlaying);
      saveLocalSettings();
    });
  }

  // Fullscreen lyrics listener
  if (checkFullscreenLyrics) {
    checkFullscreenLyrics.addEventListener("change", (e) => {
      settings.fullscreenLyrics = e.target.checked;
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  if (checkEdgeGlow) {
    checkEdgeGlow.addEventListener("change", (e) => {
      settings.edgeGlow = e.target.checked;
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  // Taskbar Alignment alignment select listener
  if (selectTbAlign) {
    selectTbAlign.value = settings.taskbarAlign || 'center';
    selectTbAlign.addEventListener("change", (e) => {
      settings.taskbarAlign = e.target.value;
      applyTaskbarOffset();
      syncTaskbarLayout();
      saveLocalSettings();
    });
  }

  if (selectTbTranslation) {
    selectTbTranslation.value = settings.tbTranslationMode || 'both';
    selectTbTranslation.addEventListener("change", (e) => {
      settings.tbTranslationMode = e.target.value;
      // Force text re-render
      tbLyricLine.textContent = "";
      saveLocalSettings();
    });
  }

  // Taskbar Offset slider listener
  if (sliderTbOffset) {
    sliderTbOffset.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      settings.taskbarOffset = val;
      settings.tbOffset = val;
      if (valTbOffset) valTbOffset.textContent = `${val}px`;
      applyTaskbarOffset();
      saveLocalSettings();
      if (window.electronAPI && window.electronAPI.syncTaskbarConfig) {
        window.electronAPI.syncTaskbarConfig({
          lyricOffsetX: val,
          taskbarOffset: val
        });
      }
    });
  }

  // Taskbar Font Size slider listener
  if (sliderTbFontsize) {
    sliderTbFontsize.addEventListener("input", (e) => {
      settings.taskbarFontSize = parseInt(e.target.value, 10);
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  // Auto-launch setting listener
  if (checkAlwaysOnTop) {
    checkAlwaysOnTop.addEventListener("change", (e) => {
      settings.alwaysOnTop = e.target.checked;
      applyVisualSettings();
      saveLocalSettings();
    });
    window.electronAPI.getAutoLaunch().then(enabled => {
      checkAutoLaunch.checked = enabled;
    });
    checkAutoLaunch.addEventListener('change', (e) => {
      window.electronAPI.setAutoLaunch(e.target.checked);
    });
  }

  // Show Next Up Widget toggle
  if (checkShowNextUp) {
    checkShowNextUp.checked = settings.showNextUp !== false;
    checkShowNextUp.addEventListener('change', (e) => {
      settings.showNextUp = e.target.checked;
      saveLocalSettings();
    });
  }

  // Adaptive BPM Sync toggle
  if (checkAdaptiveBpm) {
    checkAdaptiveBpm.checked = settings.adaptiveBpm !== false;
    checkAdaptiveBpm.addEventListener('change', (e) => {
      settings.adaptiveBpm = e.target.checked;
      if (lyrics && lyrics.length > 0) adaptBpmSync(lyrics);
      saveLocalSettings();
    });
  }

  // Show Genius Facts toggle
  if (checkShowGenius) {
    checkShowGenius.checked = settings.showGeniusFact !== false;
    checkShowGenius.addEventListener('change', (e) => {
      settings.showGeniusFact = e.target.checked;
      saveLocalSettings();
      if (!settings.showGeniusFact && geniusFactCard) {
        geniusFactCard.classList.remove("has-content");
      } else if (settings.showGeniusFact && geniusFactChunks.length > 0 && geniusFactCard) {
        geniusFactCard.classList.add("has-content");
      }
    });
  }

  // Genius Fact Position select
  if (selectGeniusPosition) {
    selectGeniusPosition.value = settings.geniusPosition || 'top-left';
    selectGeniusPosition.addEventListener('change', (e) => {
      settings.geniusPosition = e.target.value;
      saveLocalSettings();
      applyGeniusPosition();
    });
  }

  // Show Real-Time Lyrics Meaning (Genius Annotations) toggle
  if (checkShowAnnotations) {
    checkShowAnnotations.checked = settings.showAnnotations !== false;
    checkShowAnnotations.addEventListener('change', (e) => {
      settings.showAnnotations = e.target.checked;
      saveLocalSettings();
      if (!settings.showAnnotations) {
        hideLiveMeaningPill();
      }
      attachAnnotationsToRenderedLyrics();
    });
  }

  // Show Annotation Preview Pill toggle
  if (checkShowAnnotationPreview) {
    checkShowAnnotationPreview.checked = settings.showAnnotationPreview === true;
    checkShowAnnotationPreview.addEventListener('change', (e) => {
      settings.showAnnotationPreview = e.target.checked;
      saveLocalSettings();
      if (!settings.showAnnotationPreview) {
        hideLiveMeaningPill();
      } else if (activeLineIndex >= 0 && lyrics[activeLineIndex] && lyrics[activeLineIndex].annotation) {
        showLiveMeaningPill(lyrics[activeLineIndex].annotation);
      }
    });
  }

  // Live Meaning Pill click handler
  if (geniusLiveMeaning) {
    geniusLiveMeaning.addEventListener('click', () => {
      const fragment = geniusLiveMeaning.dataset.fragment;
      const annotation = geniusLiveMeaning.dataset.annotation;
      if (fragment && annotation) {
        showGeniusModal(fragment, annotation);
      }
    });
  }

  // Genius Modal Handlers
  if (geniusModalClose) {
    geniusModalClose.addEventListener('click', hideGeniusModal);
  }
  if (geniusModal) {
    geniusModal.addEventListener('click', (e) => {
      if (e.target === geniusModal) {
        hideGeniusModal();
      }
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && geniusModal && geniusModal.classList.contains('show')) {
      hideGeniusModal();
    }
  });

  // Auto-Hide Lyrics event listeners
  if (checkAutoHideLyrics) {
    checkAutoHideLyrics.addEventListener("change", (e) => {
      settings.autoHideLyrics = e.target.checked;
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  if (selectAutoHideTrigger) {
    selectAutoHideTrigger.addEventListener("change", (e) => {
      settings.autoHideTrigger = e.target.value;
      updateAutoHideState();
      saveLocalSettings();
    });
  }

  if (selectAutoHideAction) {
    selectAutoHideAction.addEventListener("change", (e) => {
      settings.autoHideAction = e.target.value;
      if (isLyricsAutoHidden) {
        applyAutoHide(true);
      }
      saveLocalSettings();
    });
  }

  if (sliderAutoHideDelay) {
    sliderAutoHideDelay.addEventListener("input", (e) => {
      settings.autoHideDelay = parseInt(e.target.value, 10);
      if (valAutoHideDelay) valAutoHideDelay.textContent = `${settings.autoHideDelay}s`;
      saveLocalSettings();
    });
    sliderAutoHideDelay.addEventListener("change", () => {
      updateAutoHideState();
    });
  }



  // Playback Control button listeners
  if (btnPrev) btnPrev.addEventListener("click", () => controlPlayback('previous'));
  if (btnPlayPause) btnPlayPause.addEventListener("click", () => controlPlayback('play-pause'));
  if (btnNext) btnNext.addEventListener("click", () => controlPlayback('next'));
  

  // Lyrics Storage & Cache Handlers
  const btnClearCache = document.getElementById("btn-clear-cache");
  const cacheStatus = document.getElementById("cache-manager-status");

  if (btnClearCache) {
    btnClearCache.addEventListener("click", () => {
      clearLyricsCaches();
      if (cacheStatus) {
        cacheStatus.style.display = "block";
        cacheStatus.style.color = "#1DB954";
        cacheStatus.textContent = "All cached lyrics cleared successfully.";
        setTimeout(() => { cacheStatus.style.display = "none"; }, 3000);
      }
    });
  }

  // Sync Offset Inputs
  if (inputSyncOffset) {
    inputSyncOffset.addEventListener("change", (e) => {
      settings.syncOffsetMs = parseInt(e.target.value, 10) || 0;
      if (!settings.trackOffsets) settings.trackOffsets = {};
      if (currentTrackId) settings.trackOffsets[currentTrackId] = settings.syncOffsetMs;
      saveLocalSettings();
    });
  }
  if (btnResetOffset) {
    btnResetOffset.addEventListener("click", () => {
      settings.syncOffsetMs = 0;
      if (!settings.trackOffsets) settings.trackOffsets = {};
      if (currentTrackId) settings.trackOffsets[currentTrackId] = 0;
      if (inputSyncOffset) inputSyncOffset.value = 0;
      saveLocalSettings();
    });
  }

  // Hotkey listener inside DOM to unlock click-through (local fallback when focused)
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "L") {
      e.preventDefault();
      toggleClickThrough();
    }

    // Sync Offset Hotkeys
    if (e.altKey && e.key === '[') {
      settings.syncOffsetMs = (settings.syncOffsetMs || 0) - 500;
      if (!settings.trackOffsets) settings.trackOffsets = {};
      if (currentTrackId) settings.trackOffsets[currentTrackId] = settings.syncOffsetMs;
      if (inputSyncOffset) inputSyncOffset.value = settings.syncOffsetMs;
      saveLocalSettings();
      if (toastNotification) {
        toastNotification.textContent = `Offset: ${settings.syncOffsetMs}ms`;
        toastNotification.classList.add("show");
        setTimeout(() => toastNotification.classList.remove("show"), 1500);
      }
    }
    if (e.altKey && e.key === ']') {
      settings.syncOffsetMs = (settings.syncOffsetMs || 0) + 500;
      if (!settings.trackOffsets) settings.trackOffsets = {};
      if (currentTrackId) settings.trackOffsets[currentTrackId] = settings.syncOffsetMs;
      if (inputSyncOffset) inputSyncOffset.value = settings.syncOffsetMs;
      saveLocalSettings();
      if (toastNotification) {
        toastNotification.textContent = `Offset: ${settings.syncOffsetMs}ms`;
        toastNotification.classList.add("show");
        setTimeout(() => toastNotification.classList.remove("show"), 1500);
      }
    }
  });

  if (btnSettings) {
    btnSettings.addEventListener("click", async () => {
      if (settingsPanel) settingsPanel.classList.add("open");
      cancelAutoHide();
      updateSpotifyUI();
      if (isSpotifyConnected()) {
        checkAndVerifySpotifyConnection().then(() => updateSpotifyUI());
      }
      try {
        if (window.api && window.api.getDesktopWallpaper) {
          const wpPath = await window.api.getDesktopWallpaper();
          if (wpPath && previewCanvas) {
            previewCanvas.style.backgroundImage = `url('lyricflow-media://${wpPath.replace(/\\/g, '/')}')`;
            previewCanvas.style.backgroundSize = 'cover';
            previewCanvas.style.backgroundPosition = 'center';
          }
        }
      } catch (err) {
        console.error("Failed to load wallpaper for preview", err);
      }
    });
  }

  if (btnSettingsClose) {
    btnSettingsClose.addEventListener("click", () => {
      if (settingsPanel) settingsPanel.classList.remove("open");
      updateAutoHideState();
    });
  }

  if (btnNews) {
    btnNews.addEventListener("click", () => {
      if (newsPanel) {
        newsPanel.classList.add("open");
        if (settingsPanel) settingsPanel.classList.remove("open");
        fetchMusicNews(); // Fetch on open
      }
    });
  }

  if (btnNewsClose) {
    btnNewsClose.addEventListener("click", () => {
      if (newsPanel) newsPanel.classList.remove("open");
    });
  }

  if (inputNewsFilter) {
    let debounceTimer;
    inputNewsFilter.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      newsBody.innerHTML = `<div style="text-align: center; color: rgba(255,255,255,0.5); font-size: 13px; margin-top: 20px;">Searching headlines...</div>`;
      debounceTimer = setTimeout(() => {
        fetchMusicNews();
      }, 800);
    });
  }

  const newsPills = document.querySelectorAll(".news-pill");
  newsPills.forEach(pill => {
    pill.addEventListener("click", () => {
      newsPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeNewsFilter = pill.getAttribute("data-filter") || "";
      newsBody.innerHTML = `<div style="text-align: center; color: rgba(255,255,255,0.5); font-size: 13px; margin-top: 20px;">Filtering...</div>`;
      fetchMusicNews();
    });
  });

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      window.electronAPI.closeApp();
    });
  }

  // Spotify Account Management Handlers
  if (btnSpotifyConnect) {
    btnSpotifyConnect.addEventListener("click", async () => {
      btnSpotifyConnect.disabled = true;
      const originalText = btnSpotifyConnect.innerHTML;
      btnSpotifyConnect.innerHTML = '<span class="loading-spinner"></span> Connecting...';
      showToast("Opening Spotify login window...", 3000);

      try {
        const authConfig = await window.electronAPI.loginViaWeb();
        if (authConfig) {
          config = authConfig;
          if (!config.localMode && config.sp_dc) {
            const token = await window.electronAPI.getAccessToken(config.sp_dc);
            if (token) {
              config.access_token = token;
              window.electronAPI.saveConfig(config);
            }
          }
          window._spotifyUserDisplayName = null;
          await checkAndVerifySpotifyConnection();
          updateSpotifyUI();
          showToast("Successfully connected to Spotify!", 3000, 'success');
          startPolling();
        } else {
          showToast("Login window was closed or cancelled.", 3000, 'warning');
        }
      } catch (err) {
        console.error("Spotify login error:", err);
        showToast("Connection failed: " + err, 3000, 'warning');
      } finally {
        btnSpotifyConnect.innerHTML = originalText;
        btnSpotifyConnect.disabled = false;
        updateSpotifyUI();
      }
    });
  }



  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      if (confirm("Disconnect your Spotify account? LyricFlow will switch to Local Mode (Desktop audio / SMTC).")) {
        try {
          await window.electronAPI.resetConfig();
          window._spotifyUserDisplayName = null;
          config = { localMode: true };
          await window.electronAPI.saveConfig(config);
          updateSpotifyUI();
          showToast("Spotify account disconnected. Switched to Local Mode.", 3000, 'success');
          startPolling();
        } catch (e) {
          console.error("Failed to disconnect Spotify account:", e);
        }
      }
    });
  }

  // Last.fm Integration UI Handlers
  if (btnLastfmConnect) {
    btnLastfmConnect.addEventListener("click", async () => {
      btnLastfmConnect.disabled = true;
      if (lastfmSetupDiv) lastfmSetupDiv.style.display = "none";
      if (lastfmWaitingDiv) lastfmWaitingDiv.style.display = "flex";

      try {
        await window.lastFM.authenticate((status) => {
          if (status && status.state === 'connected') {
            showToast("Connected to Last.fm as " + (status.username || "user"), 3000, 'success');
            updateLastfmUI();
          }
        });
        showToast("Connected to Last.fm as " + (window.lastFM.username || "user"), 3000, 'success');
        updateLastfmUI();
      } catch (err) {
        if (!err.message || !err.message.includes("cancelled")) {
          alert("Last.fm Connection Failed: " + err.message);
        }
        updateLastfmUI();
      } finally {
        btnLastfmConnect.disabled = false;
      }
    });
  }

  if (btnLastfmReopen) {
    btnLastfmReopen.addEventListener("click", () => {
      window.lastFM.reopenAuthUrl();
    });
  }

  if (btnLastfmCancel) {
    btnLastfmCancel.addEventListener("click", () => {
      window.lastFM.cancelAuth();
      updateLastfmUI();
    });
  }

  if (btnLastfmDisconnect) {
    btnLastfmDisconnect.addEventListener("click", () => {
      if (confirm("Disconnect from Last.fm?")) {
        window.lastFM.disconnect();
        showToast("Disconnected from Last.fm", 2500);
        updateLastfmUI();
      }
    });
  }

  if (checkLastfmScrobble) {
    checkLastfmScrobble.addEventListener("change", (e) => {
      window.lastFM.isScrobblingEnabled = e.target.checked;
      window.lastFM.saveConfig();
    });
  }

  if (btnLoveTrack) {
    btnLoveTrack.addEventListener("click", () => {
      if (window.lastFM && window.lastFM.isConnected()) {
        window.lastFM.toggleLove();
      }
    });
  }

  // Update UI on load
  updateLastfmUI();

  // Dynamic hit testing on mousemove to enable/disable click-through and wake auto-hide
  window.addEventListener('mousemove', (e) => {
    if (settings.taskbarMode && config) return;

    // Auto-Hide recovery: moving mouse inside the window wakes up overlay
    if (settings.autoHideLyrics && (isLyricsAutoHidden || isAutoHaltedTemporarily || autoHideLyricsTimer)) {
      wakeAutoHideTemporarily();
    }

    // While on the login screen, never enable click-through
    if (!config) {
      setClickThroughCached(false);
      return;
    }

    if (!e.target || typeof e.target.closest !== 'function') return;

    const isOverInteractive = e.target.closest('button, input, select, .hud-header, .playback-widget, .settings-panel, a, label, .drag-handle, .lyrics-empty-state');
    if (isOverInteractive) {
      setClickThroughCached(false);
    } else {
      if (settings.clickThrough) {
        setClickThroughCached(true);
      }
    }
  });

  // Disable click-through on window focus, restore on blur (except in taskbar mode)
  window.addEventListener('focus', () => {
    if (settings.taskbarMode && config) {
      return;
    }
    if (settings.autoHideLyrics) {
      wakeAutoHideTemporarily(5000);
    }
    setClickThroughCached(false);
    forceRecalculateDragRegions();
  });

  window.addEventListener('blur', () => {
    if (settings.taskbarMode && config) {
      if (isDraggingTb) return;
      return;
    }
    if (config && settings.clickThrough) {
      setClickThroughCached(true);
    }
  });

  document.addEventListener('mouseleave', () => {
    if (settings.taskbarMode && config && isDraggingTb) {
      endTaskbarDrag();
    }
    if (isAutoHaltedTemporarily) {
      if (autoHideWakeTimer) clearTimeout(autoHideWakeTimer);
      autoHideWakeTimer = setTimeout(() => {
        autoHideWakeTimer = null;
        isAutoHaltedTemporarily = false;
        updateAutoHideState();
      }, 1200);
    }
  });

  window.addEventListener('mouseup', () => {
    if (settings.taskbarMode && isDraggingTb) {
      endTaskbarDrag();
    }
  });

  window.electronAPI.onTaskbarModeReady(() => {
    if (settings.taskbarMode) {
      // Send current lyric text to the new taskbar window
      if (tbLyricLine) {
        sendTaskbarLyric(tbLyricLine.textContent || "♪");
      }
      // Send current progress
      if (tbProgress) {
        sendTaskbarProgress(parseFloat(tbProgress.style.width) || 0);
      }
      // Push config (colors, offset, align) to the taskbar window directly
      if (window.electronAPI.syncTaskbarConfig) {
        const off = settings.taskbarOffset !== undefined ? settings.taskbarOffset : (settings.tbOffset || 0);
        window.electronAPI.syncTaskbarConfig({
          taskbarOffset: off,
          lyricOffsetX: off,
          taskbarAlign: settings.taskbarAlign || 'center',
          taskbarAccentColor: settings.taskbarAccentColor || '#1DB954',
          taskbarTextColor: settings.taskbarTextColor || '#ffffff',
        });
      }
    }
  });

  if (window.electronAPI.onSyncTaskbarConfig) {
    window.electronAPI.onSyncTaskbarConfig((config) => {
      const off = config.taskbarOffset !== undefined ? config.taskbarOffset : config.lyricOffsetX;
      if (off !== undefined) {
        settings.taskbarOffset = off;
        settings.tbOffset = off;
        if (sliderTbOffset) {
          sliderTbOffset.value = off;
          if (valTbOffset) valTbOffset.textContent = `${off}px`;
        }
        applyTaskbarOffset();
        saveLocalSettings();
      }
    });
  }

  if (window.electronAPI.onTbOffsetSaved) {
    window.electronAPI.onTbOffsetSaved((offset) => {
      settings.taskbarOffset = offset;
      settings.tbOffset = offset;
      if (sliderTbOffset) {
        sliderTbOffset.value = offset;
        if (valTbOffset) valTbOffset.textContent = `${offset}px`;
      }
      applyTaskbarOffset();
      saveLocalSettings();
    });
  }

  // Shortcut and system level listeners from main process
  window.electronAPI.onToggleClickThrough(() => {
    toggleClickThrough();
  });

  window.electronAPI.onWindowRestored(() => {
    // Disable click-through on restore to let users interact immediately
    if (settings.clickThrough) {
      toggleClickThrough();
    } else {
      setClickThroughCached(false);
    }
    forceRecalculateDragRegions();
  });

  if (window.electronAPI.onForceNormalMode) {
    window.electronAPI.onForceNormalMode(() => {
      if (settings.taskbarMode || settings.wallpaperMode) {
        settings.taskbarMode = false;
        settings.wallpaperMode = false;
        if (checkTaskbarMode) checkTaskbarMode.checked = false;
        if (checkWallpaperMode) checkWallpaperMode.checked = false;
        applyVisualSettings();
        saveLocalSettings();
      }
    });
  }

  if (window.electronAPI.onTaskbarModeReady) {
    window.electronAPI.onTaskbarModeReady(() => {
      console.log("[Renderer] Taskbar window ready, immediately pushing current state...");
      let curText = null;
      let curHtml = null;
      if (tbLyricLine && tbLyricLine.textContent && tbLyricLine.textContent !== "♫" && tbLyricLine.textContent.trim() !== "") {
        curText = tbLyricLine.textContent;
        curHtml = tbLyricLine.innerHTML || null;
      } else if (lyrics && lyrics.length > 0 && activeLineIndex >= 0 && lyrics[activeLineIndex]) {
        curText = lyrics[activeLineIndex].text;
      } else if (currentPlayingTrackObj && currentPlayingTrackObj.name) {
        const artName = (currentPlayingTrackObj.artists && currentPlayingTrackObj.artists[0]) ? currentPlayingTrackObj.artists[0].name : '';
        curText = artName ? `${currentPlayingTrackObj.name} • ${artName}` : currentPlayingTrackObj.name;
      }
      if (curText) {
        sendTaskbarLyric(curText, false, curHtml);
      }
      const currentAccent = settings.accentColor || 'green';
      const ACCENT_MAP = { green: '#1DB954', purple: '#8b5cf6', blue: '#3b82f6', rose: '#f43f5e', orange: '#f97316', teal: '#14b8a6' };
      const curTbOffset = settings.taskbarOffset !== undefined ? settings.taskbarOffset : (settings.tbOffset || 0);
      if (window.electronAPI.syncTaskbarConfig) {
        window.electronAPI.syncTaskbarConfig({
          accentColor: ACCENT_MAP[currentAccent] || '#1DB954',
          lyricOffsetX: curTbOffset,
          taskbarOffset: curTbOffset
        });
      }
      if (isPlaying) {
        ensurePlayheadLoop();
      }
    });
  }

  if (window.electronAPI.onWallpaperModeState) {
    window.electronAPI.onWallpaperModeState((enabled) => {
      settings.wallpaperMode = Boolean(enabled);
      if (settings.wallpaperMode) {
        settings.taskbarMode = false;
        if (checkTaskbarMode) checkTaskbarMode.checked = false;
      }
      if (checkWallpaperMode) checkWallpaperMode.checked = settings.wallpaperMode;
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  const desktopEditOverlay = document.getElementById('desktop-edit-overlay');
  const btnDesktopEditDone = document.getElementById('btn-desktop-edit-done');
  
  if (window.electronAPI.onWallpaperEditStarted) {
    window.electronAPI.onWallpaperEditStarted(() => {
      if (settingsPanel) settingsPanel.classList.remove('open');
      desktopEditOverlay.style.display = 'block';
      lyricsViewport.style.outline = '2px dashed rgba(255,255,255,0.8)';
      lyricsViewport.style.background = 'rgba(0,0,0,0.4)';
    });
  }

  if (window.electronAPI.onWallpaperEditEnded) {
    window.electronAPI.onWallpaperEditEnded(() => {
      desktopEditOverlay.style.display = 'none';
      lyricsViewport.style.outline = '';
      lyricsViewport.style.background = '';
      if (settingsPanel) settingsPanel.classList.add('open');
    });
  }

  if (desktopEditOverlay && btnDesktopEditDone) {
    let isDraggingDesktop = false;
    
    const updateDesktopPosition = (e) => {
      const rect = document.body.getBoundingClientRect();
      let x = e.clientX;
      let y = e.clientY;
      
      x = Math.max(0, Math.min(rect.width, x));
      y = Math.max(0, Math.min(rect.height, y));
      
      const percentX = Math.round((x / rect.width) * 100);
      const percentY = Math.round((y / rect.height) * 100);
      
      settings.wallpaperOverlayX = percentX;
      settings.wallpaperOverlayY = percentY;
      applyVisualSettings();
    };

    desktopEditOverlay.addEventListener('mousedown', (e) => {
      if (e.target === btnDesktopEditDone) return;
      isDraggingDesktop = true;
      updateDesktopPosition(e);
      document.body.style.cursor = 'crosshair';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDraggingDesktop) return;
      updateDesktopPosition(e);
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingDesktop) {
        isDraggingDesktop = false;
        document.body.style.cursor = '';
        saveLocalSettings();
      }
    });

    btnDesktopEditDone.addEventListener('click', () => {
      if (window.electronAPI.endWallpaperEdit) {
        window.electronAPI.endWallpaperEdit();
      }
    });
  }

  // Tray and Media Shortcut Event Listeners
  window.electronAPI.onTrayPlaybackControl((action) => {
    controlPlayback(action);
  });
  window.electronAPI.onLocalPlaybackChange((data) => {
    if (config && config.localMode) {
      handlePlaybackData(data);
    } else {
      // In Spotify Web API mode, only trigger an immediate sync poll if the song actually changed
      if (data && data.item) {
        const localTitle = data.item.name.toLowerCase().trim();
        const curTitle = (widgetTrackName?.textContent || "").toLowerCase().trim();
        if (localTitle && curTitle && localTitle !== curTitle && !localTitle.includes(curTitle) && !curTitle.includes(localTitle)) {
          pollSpotifyPlayback(true);
        }
      }
    }
  });

  // Instantly freeze/unfreeze the internal clock the moment Windows detects pause/play
  // Fires instantly (<250ms) across both Local Mode and Spotify Web API mode
  window.electronAPI.onSmtcPlaybackStatus((data) => {
    if (!config) return;
    if (typeof data.playbackRate === 'number' && data.playbackRate > 0) {
      const prevRate = window._currentPlaybackRate;
      window._currentPlaybackRate = data.playbackRate;
      if (prevRate !== data.playbackRate && lyrics && lyrics.length > 0) {
        adaptBpmSync(lyrics);
      }
    }
    if (data.isPlaying) {
      // Song resumed: restart the internal clock cleanly from current position
      if (!isPlaying) {
        if (typeof data.position === 'number' && data.position > 0 && Math.abs(data.position - currentProgress) > 2500) {
          lastPollProgress = data.position;
          currentProgress = data.position;
        } else {
          lastPollProgress = currentProgress;
        }
        lastPollTimestamp = Date.now();
        isPlaying = true;
        ensurePlayheadLoop();
        if (btnPlaySvg) btnPlaySvg.style.display = 'none';
        if (btnPauseSvg) btnPauseSvg.style.display = 'block';
        handleTaskbarPauseAutoHide(false);
        updateAutoHideState();
      }
    } else {
      // Song paused: freeze internal clock exactly here, right now, without backwards jump
      if (isPlaying) {
        if (typeof data.position === 'number' && data.position > 0 && Math.abs(data.position - currentProgress) < 2500) {
          currentProgress = data.position;
        }
        lastPollProgress = currentProgress;
        lastPollTimestamp = Date.now();
        isPlaying = false;
        if (btnPlaySvg) btnPlaySvg.style.display = 'block';
        if (btnPauseSvg) btnPauseSvg.style.display = 'none';
        handleTaskbarPauseAutoHide(true);
        updateAutoHideState();
      }
    }
  });

  let isTogglingFromTray = false;
  window.electronAPI.onToggleTaskbarModeTray(() => {
    isTogglingFromTray = true;
    const newState = !settings.taskbarMode;
    if (newState && !config) {
        showToast("Please log in to use Taskbar Mode.", 3000, 'warning');
        isTogglingFromTray = false;
        return;
    }
    settings.taskbarMode = newState;
    if (settings.taskbarMode) {
      settings.wallpaperMode = false;
      if (checkWallpaperMode) checkWallpaperMode.checked = false;
    }
    if (checkTaskbarMode) checkTaskbarMode.checked = settings.taskbarMode;
    applyVisualSettings(isTogglingFromTray);
    saveLocalSettings();
    isTogglingFromTray = false;
  });
  window.electronAPI.onTrayShowSettings(() => {
    if (settings.taskbarMode) {
      settings.taskbarMode = false;
      applyVisualSettings();
      saveLocalSettings();
    }
    updateSpotifyUI();
    if (isSpotifyConnected()) {
      checkAndVerifySpotifyConnection().then(() => updateSpotifyUI());
    }
    document.getElementById("settings-panel").classList.add("open");
    cancelAutoHide();
  });

  if (window.electronAPI.onShowToast) {
    window.electronAPI.onShowToast((message) => {
      showToast(message, 4000);
    });
  }

  if (window.electronAPI.onUpdateDownloaded) {
    window.electronAPI.onUpdateDownloaded(() => {
      showToast("Update installed! Restart LyricFlow to apply changes.", 8000, 'success');
    });
  }

  if (window.electronAPI.onNudgeOverlay) {
    window.electronAPI.onNudgeOverlay((dx, dy) => {
      if (settings.wallpaperMode && settings.wallpaperStyle === 'style3') {
        settings.wallpaperOverlayX = Math.max(0, Math.min(100, (settings.wallpaperOverlayX || 50) + dx));
        settings.wallpaperOverlayY = Math.max(0, Math.min(100, (settings.wallpaperOverlayY || 50) + dy));
        applyVisualSettings();
        saveLocalSettings();
      }
    });
  }

  // Lyric Copy shortcut listener
  window.electronAPI.onCopyActiveLyric(() => {
    if (lyrics.length > 0 && activeLineIndex >= 0 && activeLineIndex < lyrics.length) {
      const text = lyrics[activeLineIndex].text;
      if (window.electronAPI.copyToClipboard) {
        window.electronAPI.copyToClipboard(text);
      }
      navigator.clipboard.writeText(text).catch(() => {});
      showToast("Copied: " + text, 2000, 'success');
    }
  });


  // Lyric Share Card listener
  window.electronAPI.onShareActiveLyric(() => {
    generateShareCard();
  });
  if (btnShareLyric) {
    btnShareLyric.addEventListener("click", () => {
      generateShareCard();
    });
  }

  // Reload / Find Alternative Lyrics listeners
  if (btnReloadLyrics) {
    btnReloadLyrics.addEventListener("click", () => {
      cycleAlternativeLyrics();
    });
  }

  if (timingStatusBadge) {
    timingStatusBadge.addEventListener("click", (e) => {
      if (e.ctrlKey || e.altKey) {
        cycleAlternativeLyrics();
      } else {
        resyncPlayback();
      }
    });
  }

  const syncResumeBtn = document.getElementById("sync-resume-btn");
  if (syncResumeBtn) {
    syncResumeBtn.addEventListener("click", resyncPlayback);
  }

  const btnSyncLyrics = document.getElementById("btn-sync-lyrics");
  if (btnSyncLyrics) {
    btnSyncLyrics.addEventListener("click", resyncPlayback);
  }

  // Progress Bar Seek Listener (click-to-seek)
  const progressBarBg = document.querySelector(".progress-bar-bg");
  if (progressBarBg) {
    progressBarBg.addEventListener("click", (e) => {
      if (!config || trackDuration <= 0) return;
      const rect = progressBarBg.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const seekMs = Math.round(ratio * trackDuration);
      if (config.localMode) {
        lastPollProgress = seekMs;
        lastPollTimestamp = Date.now();
      } else if (config.access_token) {
        fetch('https://api.spotify.com/v1/me/player/seek?position_ms=' + seekMs, {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + config.access_token }
        }).catch(err => console.error("Seek error:", err));
      }
      setTimeout(pollSpotifyPlayback, 200);
    });
  }

  // Keyboard Shortcuts for Sync Nudging & Reload
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    if (((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) || e.key === 'F5') {
      e.preventDefault();
      cycleAlternativeLyrics();
      return;
    }

    if (e.key === 'ArrowLeft') {
      // Nudge lyrics BACK (delayed)
      settings.syncOffsetMs -= 100;
      showToast(`Offset: ${settings.syncOffsetMs}ms`, 1500);
      saveLocalSettings();
    } else if (e.key === 'ArrowRight') {
      // Nudge lyrics FORWARD (earlier)
      settings.syncOffsetMs += 100;
      showToast(`Offset: ${settings.syncOffsetMs}ms`, 1500);
      saveLocalSettings();
    }
  });

  // Ctrl+F Lyrics Search
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      if (settings.taskbarMode) return;
      e.preventDefault();
      if (searchOverlay.style.display === "none") {
        searchOverlay.style.display = "block";
        inputSearchLyrics.focus();
        inputSearchLyrics.value = "";
        searchResultsInfo.textContent = "0 matches";
      } else {
        closeSearch();
      }
    }
    if (e.key === 'Escape' && searchOverlay.style.display !== "none") {
      closeSearch();
    }
  });

  // Sleep Timer logic
  let sleepTimerState = 0; // 0=off, 1=15m, 2=30m, 3=1h, 4=2h
  let sleepTimerInterval = null;
  let sleepTimerEndsAt = 0;

  if (btnSleepTimer) {
    btnSleepTimer.addEventListener("click", () => {
      sleepTimerState = (sleepTimerState + 1) % 5;
      if (sleepTimerInterval) { clearInterval(sleepTimerInterval); sleepTimerInterval = null; }

      if (sleepTimerState === 0) {
        if (sleepTimerBadge) sleepTimerBadge.style.display = "none";
        btnSleepTimer.title = "Sleep Timer: Off";
        btnSleepTimer.style.color = "";
      } else {
        if (sleepTimerBadge) sleepTimerBadge.style.display = "block";
        btnSleepTimer.style.color = "#1DB954";

        let minutes = 0;
        if (sleepTimerState === 1) minutes = 15;
        else if (sleepTimerState === 2) minutes = 30;
        else if (sleepTimerState === 3) minutes = 60;
        else if (sleepTimerState === 4) minutes = 120;

        sleepTimerEndsAt = Date.now() + minutes * 60000;
        updateSleepTimerBadge();

        sleepTimerInterval = setInterval(() => {
          if (Date.now() >= sleepTimerEndsAt) {
            clearInterval(sleepTimerInterval);
            sleepTimerInterval = null;
            sleepTimerState = 0;
            if (sleepTimerBadge) sleepTimerBadge.style.display = "none";
            btnSleepTimer.title = "Sleep Timer: Off";
            btnSleepTimer.style.color = "";
            controlPlayback('play-pause'); // Actually pause
          } else {
            updateSleepTimerBadge();
          }
        }, 1000);
      }
    });
  }

  function updateSleepTimerBadge() {
    if (!sleepTimerBadge) return;
    const remainingMs = Math.max(0, sleepTimerEndsAt - Date.now());
    const remainingMin = Math.ceil(remainingMs / 60000);
    sleepTimerBadge.textContent = remainingMin + 'm';
    btnSleepTimer.title = `Sleep Timer: ${remainingMin}m remaining`;
  }

  let currentSearchMatches = [];
  if (inputSearchLyrics) {
    inputSearchLyrics.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      if (!lyricsContainer) return;
      const lineEls = lyricsContainer.querySelectorAll(".lyric-line");
      lineEls.forEach(el => el.classList.remove("search-match"));
      currentSearchMatches = [];

      if (!query) {
        if (searchResultsInfo) searchResultsInfo.textContent = "0 matches";
        return;
      }

      lineEls.forEach((el, index) => {
        if (el.textContent.toLowerCase().includes(query) && lyrics[index]) {
          el.classList.add("search-match");
          currentSearchMatches.push(index);
        }
      });

      if (searchResultsInfo) searchResultsInfo.textContent = `${currentSearchMatches.length} matches`;
      if (currentSearchMatches.length > 0) {
        scrollLyrics(currentSearchMatches[0]);
      }
    });

    inputSearchLyrics.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && currentSearchMatches.length > 0) {
        const targetIndex = currentSearchMatches[0];
        const targetLine = lyrics[targetIndex];
        if (targetLine) {
          const timeMs = targetLine.timeMs;
          if (config && config.localMode) {
            lastPollProgress = timeMs;
            lastPollTimestamp = Date.now();
          } else if (config && config.access_token) {
            fetch('https://api.spotify.com/v1/me/player/seek?position_ms=' + timeMs, {
              method: 'PUT',
              headers: { 'Authorization': 'Bearer ' + config.access_token }
            }).then(async res => {
              if (res.status === 401) {
                if (config.refresh_token) {
                  config.access_token = await window.electronAPI.refreshToken();
                }
                fetch('https://api.spotify.com/v1/me/player/seek?position_ms=' + timeMs, {
                  method: 'PUT',
                  headers: { 'Authorization': 'Bearer ' + config.access_token }
                });
              }
            }).catch(err => console.error("Failed to seek from search:", err));
          }
          scrollLyrics(targetIndex);
          setTimeout(pollSpotifyPlayback, 300);
        }
        closeSearch();
      }
    });
  }

  function closeSearch() {
    if (searchOverlay) searchOverlay.style.display = "none";
    if (lyricsContainer) {
      const lineEls = lyricsContainer.querySelectorAll(".lyric-line");
      lineEls.forEach(el => el.classList.remove("search-match"));
    }
    if (inputSearchLyrics) inputSearchLyrics.blur();
  }

  // Lyrics click & drag handler in Taskbar Mode (compact window — fully interactive)
  const taskbarDragTarget = taskbarContainer || tbLyricLine;
  if (taskbarDragTarget) {
    if (tbLyricLine) tbLyricLine.style.cursor = 'grab';
    taskbarDragTarget.style.cursor = 'grab';

    taskbarDragTarget.addEventListener('mousedown', (e) => {
      console.log('[TB-DRAG] mousedown fired on taskbar!', { taskbarMode: settings.taskbarMode, config: !!config, isDraggingTb, button: e.button, fullscreen: settings.fullscreenLyrics, target: e.target.className });
      if (!settings.taskbarMode || !config || isDraggingTb || e.button !== 0 || settings.fullscreenLyrics) return;
      if (e.target.closest('.tb-progress')) return;
      e.preventDefault();
      startTaskbarDrag(e.screenX);
    });

    // Debug: trace if mouse events reach the taskbar at all
    taskbarDragTarget.addEventListener('mouseenter', () => {
      console.log('[TB-DRAG] mouseenter on taskbar container');
    });
  }
  // Direct IPC forwarding helper — replaces the old MutationObserver approach.
  // Called explicitly wherever tbLyricLine content changes so we don't rely on
  // DOM mutation events in a hidden window.
}

let tbPauseHideTimer = null;
let isTbPlaybackHidden = false;

function sendTaskbarLyric(text, hidden = false, html = null) {
  if (!settings.taskbarMode || !window.electronAPI.updateTaskbarLyric) return;
  if (!hidden && tbPauseHideTimer) {
    clearTimeout(tbPauseHideTimer);
    tbPauseHideTimer = null;
  }
  isTbPlaybackHidden = !!hidden;
  window.electronAPI.updateTaskbarLyric({ text, hidden, html });
}

function handleTaskbarPauseAutoHide(isPaused) {
  if (!settings.taskbarMode || settings.autoHideTaskbarOnPause === false) {
    if (tbPauseHideTimer) {
      clearTimeout(tbPauseHideTimer);
      tbPauseHideTimer = null;
    }
    if (isTbPlaybackHidden) {
      isTbPlaybackHidden = false;
      const curText = (tbLyricLine && tbLyricLine.textContent) ? tbLyricLine.textContent : "";
      if (window.electronAPI.updateTaskbarLyric) {
        window.electronAPI.updateTaskbarLyric({ text: curText, hidden: false });
      }
    }
    return;
  }

  if (isPaused) {
    if (!tbPauseHideTimer && !isTbPlaybackHidden) {
      tbPauseHideTimer = setTimeout(() => {
        tbPauseHideTimer = null;
        isTbPlaybackHidden = true;
        if (window.electronAPI.updateTaskbarLyric) {
          window.electronAPI.updateTaskbarLyric({ text: "", progress: 0, hidden: true });
        }
      }, 10000);
    }
  } else {
    if (tbPauseHideTimer) {
      clearTimeout(tbPauseHideTimer);
      tbPauseHideTimer = null;
    }
    if (isTbPlaybackHidden) {
      isTbPlaybackHidden = false;
      const curText = (tbLyricLine && tbLyricLine.textContent) ? tbLyricLine.textContent : "";
      if (window.electronAPI.updateTaskbarLyric) {
        window.electronAPI.updateTaskbarLyric({ text: curText, hidden: false });
      }
    }
  }
}

let lastTbProgressTime = 0;
function sendTaskbarProgress(pct) {
  if (!settings.taskbarMode || !window.electronAPI.updateTaskbarLyric || isTbPlaybackHidden) return;
  const now = Date.now();
  if (now - lastTbProgressTime < 100) return; // Max 10fps for IPC progress
  lastTbProgressTime = now;
  window.electronAPI.updateTaskbarLyric({ progress: pct });
}

let autoHideLyricsTimer = null;
let isLyricsAutoHidden = false;

function wakeAutoHideTemporarily(durationMs = 3500) {
  if (!settings.autoHideLyrics || settings.taskbarMode || settings.wallpaperMode) return;

  isAutoHaltedTemporarily = true;
  if (isLyricsAutoHidden) {
    applyAutoHide(false);
  }

  if (autoHideWakeTimer) {
    clearTimeout(autoHideWakeTimer);
  }

  autoHideWakeTimer = setTimeout(() => {
    autoHideWakeTimer = null;
    isAutoHaltedTemporarily = false;
    updateAutoHideState();
  }, durationMs);
}

function checkShouldAutoHide() {
  if (!settings.autoHideLyrics || settings.taskbarMode || settings.wallpaperMode) return false;
  if (settingsPanel && settingsPanel.classList.contains("open")) return false;
  if (searchOverlay && searchOverlay.style.display !== "none") return false;
  if (geniusModal && geniusModal.classList.contains("show")) return false;
  if (isAutoHaltedTemporarily) return false;

  const isPausedOrStopped = !isPlaying;
  // While lyrics are actively loading, never assume track has no lyrics!
  const hasNoLyrics = !isFetchingLyrics && (!lyrics || lyrics.length === 0);

  if (settings.autoHideTrigger === 'paused') {
    return isPausedOrStopped;
  } else if (settings.autoHideTrigger === 'no_lyrics') {
    return hasNoLyrics;
  } else if (settings.autoHideTrigger === 'both') {
    return isPausedOrStopped || hasNoLyrics;
  }
  return false;
}

function updateAutoHideState() {
  if (!settings.autoHideLyrics || settings.taskbarMode || settings.wallpaperMode) {
    cancelAutoHide();
    return;
  }

  if (checkShouldAutoHide()) {
    if (!autoHideLyricsTimer && !isLyricsAutoHidden) {
      const delaySec = settings.autoHideDelay !== undefined ? Number(settings.autoHideDelay) : 3;
      const delayMs = Math.max(0, delaySec * 1000);
      if (delayMs <= 0) {
        applyAutoHide(true);
      } else {
        autoHideLyricsTimer = setTimeout(() => {
          autoHideLyricsTimer = null;
          if (checkShouldAutoHide()) {
            applyAutoHide(true);
          }
        }, delayMs);
      }
    }
  } else {
    cancelAutoHide();
  }
}

function cancelAutoHide() {
  if (autoHideLyricsTimer) {
    clearTimeout(autoHideLyricsTimer);
    autoHideLyricsTimer = null;
  }
  if (isLyricsAutoHidden) {
    applyAutoHide(false);
  }
}

function applyAutoHide(hide) {
  isLyricsAutoHidden = hide;
  if (!appContainer) return;

  if (hide) {
    if (settings.autoHideAction === 'window') {
      appContainer.classList.add('auto-hide-faded');
      appContainer.classList.remove('auto-hide-collapsed');
      document.body.classList.add('auto-hide-faded');
      document.body.classList.remove('auto-hide-collapsed');
      // Only set OS click-through if the user explicitly configured click-through!
      // Otherwise, the window MUST remain receptive to mouse events so mousemove can wake it up!
      if (settings.clickThrough) {
        setClickThroughCached(true);
      }
    } else {
      appContainer.classList.add('auto-hide-collapsed');
      appContainer.classList.remove('auto-hide-faded');
      document.body.classList.add('auto-hide-collapsed');
      document.body.classList.remove('auto-hide-faded');
      if (!settings.clickThrough) {
        setClickThroughCached(false);
      }
    }
  } else {
    appContainer.classList.remove('auto-hide-faded');
    appContainer.classList.remove('auto-hide-collapsed');
    document.body.classList.remove('auto-hide-faded');
    document.body.classList.remove('auto-hide-collapsed');
    if (!settings.clickThrough) {
      setClickThroughCached(false);
    }
  }
}



function toggleClickThrough() {
  settings.clickThrough = !settings.clickThrough;
  try {
    setClickThroughCached(settings.clickThrough);
    applyVisualSettings();
    saveLocalSettings();

    // Show a floating indicator if locked
    if (settings.clickThrough) {
      const banner = document.createElement("div");
      banner.id = "lock-banner";
      banner.style.cssText = "position: absolute; top: 52px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); border: 1px solid #1DB954; color: #1DB954; padding: 6px 14px; border-radius: 6px; font-size: 11.5px; font-weight: 600; z-index: 1000; pointer-events: none; transition: opacity 0.5s ease; box-shadow: 0 4px 14px rgba(0,0,0,0.6);";
      banner.textContent = "Click-Through Active • Press Ctrl+Shift+L to unlock";
      document.body.appendChild(banner);
      setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 500);
      }, 3500);
    } else {
      const existing = document.getElementById("lock-banner");
      if (existing) existing.remove();
      showToast("Click-Through Disabled (Interactive Mode)", 2500, 'success');
    }
  } catch (e) {
    console.error("toggleClickThrough error:", e);
  }
}


// Navigation Screens
function showLoginScreen() {
  if (screenOnboarding) {
    screenOnboarding.classList.remove("active");
    screenOnboarding.style.display = "none";
  }
  if (screenLyrics) {
    screenLyrics.classList.remove("active");
    screenLyrics.style.display = "none";
  }
  stopPolling();
  window._spotifyUserDisplayName = null;
  updateSpotifyUI();

  // Ensure taskbar mode is deactivated visually on logout/login screen
  applyVisualSettings();
  setClickThroughCached(false);
  if (window.electronAPI && typeof window.electronAPI.setClickThrough === 'function') {
    window.electronAPI.setClickThrough(false);
  }

  if (screenLogin) {
    screenLogin.classList.add("active");
    screenLogin.style.display = "flex";
  }
}

async function populateOnboardingMonitors() {
  const container = document.getElementById('ob-wallpaper-monitor-section');
  const btnGroup = document.getElementById('ob-monitor-btn-group');
  const badge = document.getElementById('ob-monitor-detected-badge');
  const selectSettingsMon = document.getElementById('select-wallpaper-monitor');
  if (!btnGroup) return;

  try {
    let monitors = [];
    if (window.electronAPI && typeof window.electronAPI.getAvailableMonitors === 'function') {
      monitors = await window.electronAPI.getAvailableMonitors();
    }
    if (!monitors || monitors.length === 0) {
      monitors = [{ id: 0, name: 'Screen 1 (Primary)', is_primary: true, width: window.screen.width, height: window.screen.height }];
    }

    if (badge) {
      if (monitors.length > 1) {
        badge.textContent = `${monitors.length} Displays Detected`;
        badge.style.color = '#1DB954';
      } else {
        badge.textContent = `1 Display Detected`;
        badge.style.color = 'rgba(255,255,255,0.5)';
      }
    }

    btnGroup.innerHTML = '';
    const currentPick = settings.wallpaperMonitor || '0';

    monitors.forEach((m, idx) => {
      const btn = document.createElement('button');
      btn.className = 'ob-monitor-btn';
      btn.dataset.monitorId = String(idx);
      const isSelected = String(idx) === currentPick;
      btn.style.cssText = `
        flex: 1 1 auto;
        min-width: 140px;
        height: 38px;
        padding: 0 14px;
        border-radius: 8px;
        border: 1px solid ${isSelected ? '#1DB954' : 'rgba(255,255,255,0.15)'};
        background: ${isSelected ? '#1DB954' : 'rgba(255,255,255,0.06)'};
        color: ${isSelected ? '#000' : '#fff'};
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
      `;
      btn.innerHTML = `🖥️ Screen ${idx + 1} <span style="font-size: 10.5px; opacity: 0.75;">(${m.width}×${m.height}${m.is_primary ? ' - Primary' : ''})</span>`;
      btn.addEventListener('click', () => {
        settings.wallpaperMonitor = String(idx);
        updateMonitorBtnGroup(btnGroup, String(idx));
      });
      btnGroup.appendChild(btn);
    });

    // All screens / span button
    const spanBtn = document.createElement('button');
    spanBtn.className = 'ob-monitor-btn';
    spanBtn.dataset.monitorId = 'all';
    const isSpanSelected = currentPick === 'all';
    spanBtn.style.cssText = `
      flex: 1 1 auto;
      min-width: 140px;
      height: 38px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid ${isSpanSelected ? '#1DB954' : 'rgba(255,255,255,0.15)'};
      background: ${isSpanSelected ? '#1DB954' : 'rgba(255,255,255,0.06)'};
      color: ${isSpanSelected ? '#000' : '#fff'};
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    `;
    spanBtn.innerHTML = `🌐 All Screens <span style="font-size: 10.5px; opacity: 0.75;">(Span / Every Screen)</span>`;
    spanBtn.addEventListener('click', () => {
      settings.wallpaperMonitor = 'all';
      updateMonitorBtnGroup(btnGroup, 'all');
    });
    btnGroup.appendChild(spanBtn);

    if (selectSettingsMon) {
      selectSettingsMon.innerHTML = '';
      monitors.forEach((m, idx) => {
        const opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = `Screen ${idx + 1} (${m.width}×${m.height}${m.is_primary ? ' - Primary' : ''})`;
        if (String(idx) === currentPick) opt.selected = true;
        selectSettingsMon.appendChild(opt);
      });
      const allOpt = document.createElement('option');
      allOpt.value = 'all';
      allOpt.textContent = 'All Screens (Span)';
      if (currentPick === 'all') allOpt.selected = true;
      selectSettingsMon.appendChild(allOpt);
    }
  } catch (err) {
    console.error("populateOnboardingMonitors error:", err);
  }
}

function updateMonitorBtnGroup(group, selectedId) {
  const btns = group.querySelectorAll('.ob-monitor-btn');
  btns.forEach(b => {
    const isSel = b.dataset.monitorId === selectedId;
    b.style.border = isSel ? '1px solid #1DB954' : '1px solid rgba(255,255,255,0.15)';
    b.style.background = isSel ? '#1DB954' : 'rgba(255,255,255,0.06)';
    b.style.color = isSel ? '#000' : '#fff';
  });
  const selectSettingsMon = document.getElementById('select-wallpaper-monitor');
  if (selectSettingsMon) selectSettingsMon.value = selectedId;
}

function showOnboardingWizard() {
  settings.taskbarMode = false;
  settings.wallpaperMode = false;
  if (window.electronAPI && window.electronAPI.setTaskbarMode) {
    window.electronAPI.setTaskbarMode(false);
  }
  if (window.electronAPI && window.electronAPI.setWallpaperMode) {
    window.electronAPI.setWallpaperMode(false);
  }

  if (screenLogin) {
    screenLogin.classList.remove("active");
    screenLogin.style.display = "none";
  }
  if (screenLyrics) {
    screenLyrics.classList.remove("active");
    screenLyrics.style.display = "none";
  }
  const screenOnboarding = document.getElementById("screen-onboarding");
  if (screenOnboarding) {
    screenOnboarding.classList.add("active");
    screenOnboarding.style.display = "flex";
    
    const p1 = document.getElementById('ob-page-1');
    const p2 = document.getElementById('ob-page-2');
    const p3 = document.getElementById('ob-page-3');
    const p4 = document.getElementById('ob-page-4');
    const d1 = document.getElementById('ob-step-dot-1');
    const d2 = document.getElementById('ob-step-dot-2');
    const d3 = document.getElementById('ob-step-dot-3');
    const d4 = document.getElementById('ob-step-dot-4');

    if (p1) { p1.style.display = 'flex'; p1.style.opacity = '1'; }
    if (p2) { p2.style.display = 'none'; p2.style.opacity = '0'; }
    if (p3) { p3.style.display = 'none'; p3.style.opacity = '0'; }
    if (p4) { p4.style.display = 'none'; p4.style.opacity = '0'; }
    if (d1) d1.classList.add('active');
    if (d2) d2.classList.remove('active');
    if (d3) d3.classList.remove('active');
    if (d4) d4.classList.remove('active');

    // Sync Mode Cards styling
    const obCardStandard = document.getElementById('ob-card-standard');
    const obCardTaskbar = document.getElementById('ob-card-taskbar');
    const obCardWallpaper = document.getElementById('ob-card-wallpaper');
    const obBadgeStandard = document.getElementById('ob-badge-standard');
    const obBadgeTaskbar = document.getElementById('ob-badge-taskbar');
    const obBadgeWallpaper = document.getElementById('ob-badge-wallpaper');
    const obWallpaperMonitorSection = document.getElementById('ob-wallpaper-monitor-section');

    const initialMode = settings.wallpaperMode ? 'wallpaper' : (settings.taskbarMode ? 'taskbar' : 'standard');

    [obCardStandard, obCardTaskbar, obCardWallpaper].forEach(c => {
      if (c) {
        c.classList.remove('selected');
        c.style.borderColor = 'rgba(255,255,255,0.1)';
      }
    });
    [obBadgeStandard, obBadgeTaskbar, obBadgeWallpaper].forEach(b => {
      if (b) {
        b.textContent = 'Select';
        b.style.background = 'rgba(255,255,255,0.08)';
        b.style.color = 'rgba(255,255,255,0.8)';
        b.style.fontWeight = '600';
      }
    });

    if (initialMode === 'wallpaper' && obCardWallpaper && obBadgeWallpaper) {
      obCardWallpaper.classList.add('selected');
      obCardWallpaper.style.borderColor = '#1DB954';
      obBadgeWallpaper.textContent = '✓ Selected';
      obBadgeWallpaper.style.background = '#1DB954';
      obBadgeWallpaper.style.color = '#000';
      obBadgeWallpaper.style.fontWeight = '700';
      if (obWallpaperMonitorSection) {
        obWallpaperMonitorSection.style.display = 'block';
        populateOnboardingMonitors();
      }
    } else if (initialMode === 'taskbar' && obCardTaskbar && obBadgeTaskbar) {
      obCardTaskbar.classList.add('selected');
      obCardTaskbar.style.borderColor = '#1DB954';
      obBadgeTaskbar.textContent = '✓ Selected';
      obBadgeTaskbar.style.background = '#1DB954';
      obBadgeTaskbar.style.color = '#000';
      obBadgeTaskbar.style.fontWeight = '700';
      if (obWallpaperMonitorSection) obWallpaperMonitorSection.style.display = 'none';
    } else if (obCardStandard && obBadgeStandard) {
      obCardStandard.classList.add('selected');
      obCardStandard.style.borderColor = '#1DB954';
      obBadgeStandard.textContent = '✓ Selected';
      obBadgeStandard.style.background = '#1DB954';
      obBadgeStandard.style.color = '#000';
      obBadgeStandard.style.fontWeight = '700';
      if (obWallpaperMonitorSection) obWallpaperMonitorSection.style.display = 'none';
    }

    const sliderOp = document.getElementById('ob-slider-opacity');
    const valOp = document.getElementById('ob-val-opacity');
    const sliderFs = document.getElementById('ob-slider-fontsize');
    const valFs = document.getElementById('ob-val-fontsize');
    const prevCard = document.getElementById('ob-preview-card');
    const prevLine = document.getElementById('ob-preview-line-active');

    if (sliderOp) sliderOp.value = settings.bgOpacity || 85;
    if (valOp) valOp.textContent = `${settings.bgOpacity || 85}%`;
    if (sliderFs) sliderFs.value = settings.fontSize || 22;
    if (valFs) valFs.textContent = `${settings.fontSize || 22}px`;
    if (prevCard) prevCard.style.background = `rgba(10, 10, 15, ${(settings.bgOpacity || 85) / 100})`;
    if (prevLine) prevLine.style.fontSize = `${settings.fontSize || 22}px`;
  }
}

function showLyricsScreen() {
  if (screenLogin) {
    screenLogin.classList.remove("active");
    screenLogin.style.display = "none";
  }
  if (screenOnboarding) {
    screenOnboarding.classList.remove("active");
    screenOnboarding.style.display = "none";
  }
  if (screenLyrics) {
    screenLyrics.classList.add("active");
    screenLyrics.style.display = "flex";
  }

  settings.firstRun = false;
  saveLocalSettings();

  startPolling();

  // Set default window properties from settings on start
  setClickThroughCached(settings.clickThrough || false);

  // Apply visual settings (including taskbarMode toggles) after config is set
  applyVisualSettings();

  // First-Run Floating Tip Banner Check
  const tipBanner = document.getElementById('floating-tip-banner');
  if (tipBanner) {
    const isDismissed = localStorage.getItem('lyricflow_tip_dismissed') === 'true';
    if (!isDismissed && !settings.taskbarMode && !settings.wallpaperMode) {
      tipBanner.style.display = 'flex';
      tipBanner.style.opacity = '1';
      tipBanner.style.transform = 'translate(-50%, 0)';
    } else {
      tipBanner.style.display = 'none';
    }
  }
}

// Spotify Poller Management
function startPolling() {
  stopPolling();
  pollSpotifyPlayback(); // Initial poll
  const interval = (config && config.localMode) ? 1000 : 1500;
  pollingIntervalId = setInterval(pollSpotifyPlayback, interval);
}

function stopPolling() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
}

async function pollSpotifyPlayback(_retried = false) {
  if (!config) return;

  if (config.localMode) {
    await pollLocalPlayback();
    return;
  }

  try {
    const fetchStart = Date.now();
    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { "Authorization": `Bearer ${config.access_token}` },
      signal: AbortSignal.timeout(8000)
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data && data.item) {
        lastSpotifyPlaybackData = JSON.parse(JSON.stringify(data));
        
        try {
          const localData = await window.electronAPI.getLocalPlayback();
          if (localData && localData.item) {
            const localTitle = localData.item.name.toLowerCase().trim();
            const spotTitle = data.item.name.toLowerCase().trim();
            const isSameSong = (localTitle === spotTitle || localTitle.includes(spotTitle) || spotTitle.includes(localTitle));

            if (isSameSong) {
              // Override Spotify Web API's lagging state with SMTC's instant state
              data.is_playing = localData.is_playing;
              if (localData.progress_ms > 0) {
                 // Subtract latency here so when it's added below, it perfectly matches the instant local time
                 data.progress_ms = localData.progress_ms - ((Date.now() - fetchStart) / 2);
              }
              if (localData.playback_rate) {
                 data.playback_rate = localData.playback_rate;
              }
            }
          }
        } catch (e) {}
        
        const latency = (Date.now() - fetchStart) / 2;
        data.progress_ms += latency;

        // If paused and same track already loaded, freeze clock cleanly and avoid full re-render jitter.
        if (!data.is_playing && data.item.id === currentTrackId) {
          if (isPlaying) {
            isPlaying = false;
            lastPollProgress = currentProgress;
            lastPollTimestamp = Date.now();
          }
          if (btnPlaySvg) btnPlaySvg.style.display = 'block';
          if (btnPauseSvg) btnPauseSvg.style.display = 'none';
          pauseAnimatedArtVideos();
          handleTaskbarPauseAutoHide(true);
          updateAutoHideState();
          return;
        }

        handlePlaybackData(data);
        return;
      }
    }

    if (res.status === 401 && !_retried) {
      if (config.refresh_token) {
        try {
          config.access_token = await window.electronAPI.refreshToken();
        } catch (e) {
          console.error("pollSpotifyPlayback refresh failed:", e);
        }
      } else if (config.sp_dc) {
        config.access_token = await window.electronAPI.getAccessToken(config.sp_dc);
      }
      
      if (config.access_token) {
        window.electronAPI.saveConfig(config);
        await pollSpotifyPlayback(true);
        return;
      } else {
        await pollLocalPlayback();
        return;
      }
    } else if (res.status !== 200) {
      await pollLocalPlayback();
      return;
    }

    await pollLocalPlayback();
  } catch (err) {
    await pollLocalPlayback();
    return;
  }
}

let localEmptyPollCount = 0;

async function pollLocalPlayback() {
  try {
    const data = await window.electronAPI.getLocalPlayback();
    if (data && data.item) {
      localEmptyPollCount = 0;
      if (typeof lastSpotifyPlaybackData !== 'undefined' && lastSpotifyPlaybackData && lastSpotifyPlaybackData.item) {
        const localTitle = data.item.name.toLowerCase().trim();
        const spotTitle = lastSpotifyPlaybackData.item.name.toLowerCase().trim();
        const isSameSong = (localTitle === spotTitle || localTitle.includes(spotTitle) || spotTitle.includes(localTitle));

        if (isSameSong) {
           lastSpotifyPlaybackData.is_playing = data.is_playing;
           lastSpotifyPlaybackData.progress_ms = data.progress_ms;
           if (data.playback_rate) {
              lastSpotifyPlaybackData.playback_rate = data.playback_rate;
           }
           if (!data.is_playing && lastSpotifyPlaybackData.item.id === currentTrackId) {
             if (isPlaying) {
               lastPollProgress = currentProgress;
               lastPollTimestamp = Date.now();
               isPlaying = false;
             }
             if (btnPlaySvg) btnPlaySvg.style.display = 'block';
             if (btnPauseSvg) btnPauseSvg.style.display = 'none';
             pauseAnimatedArtVideos();
             handleTaskbarPauseAutoHide(true);
             updateAutoHideState();
             return;
           }
           handlePlaybackData(lastSpotifyPlaybackData);
           return;
        } else {
           // Song changed! Clear stale lastSpotifyPlaybackData
           lastSpotifyPlaybackData = null;
        }
      }

      if (!data.is_playing && data.item.id === currentTrackId) {
        if (isPlaying) {
          lastPollProgress = currentProgress;
          lastPollTimestamp = Date.now();
          isPlaying = false;
        }
        if (btnPlaySvg) btnPlaySvg.style.display = 'block';
        if (btnPauseSvg) btnPauseSvg.style.display = 'none';
        pauseAnimatedArtVideos();
        handleTaskbarPauseAutoHide(true);
        updateAutoHideState();
        return;
      }
      handlePlaybackData(data);
    } else {
      localEmptyPollCount++;
      // Pause playback state but NEVER clear lyrics while song is paused
      if (isPlaying) {
        lastPollProgress = currentProgress;
        lastPollTimestamp = Date.now();
        isPlaying = false;
      }
      if (btnPlaySvg) btnPlaySvg.style.display = 'block';
      if (btnPauseSvg) btnPauseSvg.style.display = 'none';
      pauseAnimatedArtVideos();
      handleTaskbarPauseAutoHide(true);
      updateAutoHideState();
      if (localEmptyPollCount >= 60) {
        // Only clear if completely idle with no music player open for > 60 seconds
        handleEmptyPlayback();
      }
    }
  } catch (err) {
    console.error("Failed to poll local playback:", err);
    if (isPlaying) {
      lastPollProgress = currentProgress;
      lastPollTimestamp = Date.now();
      isPlaying = false;
    }
    if (btnPlaySvg) btnPlaySvg.style.display = 'block';
    if (btnPauseSvg) btnPauseSvg.style.display = 'none';
    pauseAnimatedArtVideos();
  }
}


function handleEmptyPlayback() {
  console.log("[Renderer] handleEmptyPlayback called");
  isPlaying = false;
  lastPollProgress = 0;
  lastPollTimestamp = Date.now();
  currentTrackId = null;
  currentPlayingTrackObj = null;
  currentStaticAlbumArtUrl = null;
  setAnimatedAlbumArt(null, null);
  currentExtractedArtUrl = null;
  trackDuration = 0;
  lyrics = [];
  activeLineIndex = -1;
  currentAnnotations = [];
  hideLiveMeaningPill();
  hideGeniusModal();

  document.body.classList.remove('is-playing', 'app-paused');
  document.body.classList.add('is-idle');

  // Standby Playback Widget
  widgetTrackName.textContent = "Ready to Flow";
  widgetArtistName.textContent = "Waiting for music...";
  if (wallpaperTrackTitle) wallpaperTrackTitle.textContent = "Ready to Flow";
  if (wallpaperTrackArtist) wallpaperTrackArtist.textContent = "Waiting for music...";
  setWallpaperAlbumArt(null);
  if (widgetPlaycount) widgetPlaycount.style.display = "none";
  widgetAlbumArt.style.display = "none";
  widgetArtFallback.style.display = "flex";
  widgetArtFallback.classList.add("idle-active");
  if (!widgetArtFallback.querySelector(".idle-eq-bars")) {
    widgetArtFallback.innerHTML = `
      <div class="idle-eq-bars">
        <div class="idle-eq-bar"></div>
        <div class="idle-eq-bar"></div>
        <div class="idle-eq-bar"></div>
        <div class="idle-eq-bar"></div>
      </div>
    `;
  }
  widgetProgressFill.classList.add("idle-shimmer");
  widgetTimeCurrent.textContent = "0:00";
  widgetTimeDuration.textContent = "0:00";

  // Mode-aware subtext
  let modeSubtext = "Start playing music on Spotify or your desktop player to flow synced lyrics.";
  if (config && config.localMode) {
    modeSubtext = "Listening for desktop music via Windows Media (Spotify, Apple Music, Tidal, VLC).";
  } else if (isSpotifyConnected()) {
    modeSubtext = "Connected to Spotify. Play any song in Spotify desktop or web to begin.";
  }

  // Recent tracks from listening_history
  let recentHtml = '';
  try {
    const rawHist = localStorage.getItem("listening_history");
    if (rawHist) {
      const parsedHist = JSON.parse(rawHist);
      if (Array.isArray(parsedHist) && parsedHist.length > 0) {
        const top3 = parsedHist.slice(0, 3);
        const chipsHtml = top3.map(item => `
          <button class="idle-recent-chip" data-title="${escapeHTML(item.title)}" data-artist="${escapeHTML(item.artist)}" title="${escapeHTML(item.title)} - ${escapeHTML(item.artist)}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.7;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>${escapeHTML(item.title)}</span>
          </button>
        `).join('');
        recentHtml = `
          <div class="idle-recent-row">
            <div class="idle-recent-label">Recent Tracks</div>
            ${chipsHtml}
          </div>
        `;
      }
    }
  } catch (e) {}

  lyricsContainer.style.transform = 'translateY(0px)';
  lyricsContainer.innerHTML = `
    <div class="lyrics-idle-hero">
      <div class="idle-visual-wrapper">
        <div class="idle-vinyl-disc"></div>
        <div class="idle-soundwaves">
          <div class="idle-wave-bar"></div>
          <div class="idle-wave-bar"></div>
          <div class="idle-wave-bar"></div>
          <div class="idle-wave-bar"></div>
          <div class="idle-wave-bar"></div>
        </div>
      </div>

      <div class="idle-hero-title">Ready to Flow</div>
      <div class="idle-hero-sub">${modeSubtext}</div>

      <div class="idle-actions-row">
        <button class="idle-action-chip btn-idle-spotify" id="btn-idle-open-spotify">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.308c-.216.354-.664.464-1.018.248-2.825-1.727-6.38-2.118-10.567-1.163-.404.093-.811-.161-.904-.565s.161-.811.565-.904c4.582-1.045 8.528-.593 11.676 1.332.354.216.464.664.248 1.018zm1.464-3.26c-.272.443-.84.584-1.283.312-3.235-1.988-8.167-2.566-12.015-1.401-.497.151-1.02-.128-1.171-.625s.128-1.02.625-1.171c4.394-1.333 9.83-.67 13.532 1.602.443.272.584.84.312 1.283zm.127-3.4c-3.88-2.304-10.283-2.516-13.993-1.417-.597.181-1.23-.153-1.41-1.229.181-.597.153-1.23 1.229-1.41 4.262-1.293 11.332-1.056 15.8 1.6.536.318.712 1.013.393 1.549s-1.013.712-1.549.393z"/></svg>
          <span>Open Spotify</span>
        </button>
        <button class="idle-action-chip btn-idle-search" id="btn-idle-search-lyrics">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span>Search Lyrics</span>
        </button>
      </div>

      ${recentHtml}

      <div class="idle-shortcuts-row">
        <span class="idle-shortcut-pill"><kbd>Ctrl</kbd>+<kbd>F</kbd> Search</span>
        <span class="idle-shortcut-pill"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> Toggle Overlay</span>
        <span class="idle-shortcut-pill"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> Taskbar Mode</span>
      </div>
    </div>
  `;

  // Attach event listeners to chips
  const openSpotBtn = lyricsContainer.querySelector('#btn-idle-open-spotify');
  if (openSpotBtn) {
    openSpotBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const a = document.createElement('a');
      a.href = 'spotify:';
      a.click();
    });
  }

  const searchBtn = lyricsContainer.querySelector('#btn-idle-search-lyrics');
  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (searchOverlay) {
        searchOverlay.style.display = "block";
        if (inputSearchLyrics) {
          inputSearchLyrics.value = "";
          inputSearchLyrics.focus();
        }
      }
    });
  }

  lyricsContainer.querySelectorAll('.idle-recent-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const title = chip.getAttribute('data-title') || '';
      const artist = chip.getAttribute('data-artist') || '';
      if (searchOverlay) {
        searchOverlay.style.display = "block";
        if (inputSearchLyrics) {
          inputSearchLyrics.value = `${title} ${artist}`.trim();
          inputSearchLyrics.focus();
          inputSearchLyrics.dispatchEvent(new Event('input'));
        }
      }
    });
  });

  if (tbLyricLine) {
    tbLyricLine.textContent = "";
    sendTaskbarLyric("");
  }
  handleTaskbarPauseAutoHide(true);
  updateAutoHideState();
}

function showNowPlayingNotification(trackInfo, playcount) {
  if (settings.showNextUp === false) return; // Follows the setting toggle
  if (!trackInfo) return;

  const trackName = trackInfo.name || trackInfo.title || 'Unknown Track';
  const artistName = trackInfo.artist || (trackInfo.artists ? trackInfo.artists.map(a => a.name).join(', ') : 'Unknown Artist');
  const artUrl = trackInfo.albumArtUrl || trackInfo.album?.images?.[0]?.url || '';

  if (window.electronAPI && window.electronAPI.showNowPlayingNotification) {
    window.electronAPI.showNowPlayingNotification({
      name: trackName,
      artist: artistName,
      albumArtUrl: artUrl,
      playcount: playcount
    });
  }
}

// Backwards compatibility alias
function showNowPlayingHud(trackInfo, playcount) {
  showNowPlayingNotification(trackInfo, playcount);
}

function adaptBpmSync(lyricsList) {
  const rate = window._currentPlaybackRate || 1.0;
  const speedScale = Math.max(0.4, Math.min(2.5, rate));

  if (!lyricsList || lyricsList.length < 2 || settings.adaptiveBpm === false) {
    const scrollDur = (0.45 / speedScale).toFixed(2);
    const lineDur = (0.35 / speedScale).toFixed(2);
    const wordDur = (0.20 / speedScale).toFixed(2);
    document.documentElement.style.setProperty('--lyric-scroll-duration', `${scrollDur}s`);
    document.documentElement.style.setProperty('--lyric-line-duration', `${lineDur}s`);
    document.documentElement.style.setProperty('--lyric-word-duration', `${wordDur}s`);
    window._currentBpmProfile = 'normal';
    return;
  }

  const firstTime = lyricsList[0].timeMs;
  const lastTime = lyricsList[lyricsList.length - 1].timeMs;
  if (lastTime <= firstTime) return;

  const totalSpan = lastTime - firstTime;
  const avgLineDuration = (totalSpan / (lyricsList.length - 1)) / speedScale;

  if (avgLineDuration < 1900) {
    // Fast cadence (Rap, EDM, punk, high-BPM > 135 or accelerated playback)
    const scrollDur = (0.20 / speedScale).toFixed(2);
    const lineDur = (0.18 / speedScale).toFixed(2);
    const wordDur = (0.09 / speedScale).toFixed(2);
    document.documentElement.style.setProperty('--lyric-scroll-duration', `${scrollDur}s`);
    document.documentElement.style.setProperty('--lyric-line-duration', `${lineDur}s`);
    document.documentElement.style.setProperty('--lyric-word-duration', `${wordDur}s`);
    window._currentBpmProfile = 'high';
  } else if (avgLineDuration < 3300) {
    // Medium cadence (Pop, Rock, standard 90-125 BPM)
    const scrollDur = (0.38 / speedScale).toFixed(2);
    const lineDur = (0.30 / speedScale).toFixed(2);
    const wordDur = (0.18 / speedScale).toFixed(2);
    document.documentElement.style.setProperty('--lyric-scroll-duration', `${scrollDur}s`);
    document.documentElement.style.setProperty('--lyric-line-duration', `${lineDur}s`);
    document.documentElement.style.setProperty('--lyric-word-duration', `${wordDur}s`);
    window._currentBpmProfile = 'medium';
  } else {
    // Slow cadence (Ballad, Acoustic, Ambient < 85 BPM)
    const scrollDur = (0.52 / speedScale).toFixed(2);
    const lineDur = (0.42 / speedScale).toFixed(2);
    const wordDur = (0.24 / speedScale).toFixed(2);
    document.documentElement.style.setProperty('--lyric-scroll-duration', `${scrollDur}s`);
    document.documentElement.style.setProperty('--lyric-line-duration', `${lineDur}s`);
    document.documentElement.style.setProperty('--lyric-word-duration', `${wordDur}s`);
    window._currentBpmProfile = 'slow';
  }
}

let currentExtractedArtUrl = null;

async function updateDynamicArtColor(artUrl) {
  if (!artUrl || artUrl === currentExtractedArtUrl) return;
  currentExtractedArtUrl = artUrl;
  try {
    const colors = await extractDominantColor(artUrl);
    if (!colors) return;
    const c1 = `rgb(${colors.r}, ${colors.g}, ${colors.b})`;
    const c2 = `rgb(${Math.max(0, colors.r - 80)}, ${Math.max(0, colors.g - 80)}, ${Math.max(0, colors.b - 80)})`;
    document.documentElement.style.setProperty('--art-color-1', c1);
    document.documentElement.style.setProperty('--art-color-1-rgb', `${colors.r}, ${colors.g}, ${colors.b}`);
    document.documentElement.style.setProperty('--art-color-2', c2);

    if (settings.highlightColor === 'dynamic') {
      const glowRaw = typeof settings.glowIntensity === 'number' ? settings.glowIntensity : (typeof settings.glow === 'number' ? settings.glow : 65);
      const glowInt = glowRaw / 100;
      document.documentElement.style.setProperty('--highlight-color', 'var(--art-color-1, #1DB954)');
      document.documentElement.style.setProperty('--highlight-glow', `rgba(${colors.r}, ${colors.g}, ${colors.b}, ${glowInt})`);
    }
  } catch (err) {
    console.warn("[Renderer] Failed to update dynamic art color:", err);
  }
}

let lastProcessedTrackId = null;
let lastAppliedAlbumArtUrl = null;
let trackSwitchDebounceTimer = null;

async function handlePlaybackData(data) {
  if (!data || !data.item) {
    handleEmptyPlayback();
    return;
  }

  const track = data.item;
  const isCurrentlyPlaying = data.is_playing;
  const progressMs = data.progress_ms;
  const isNewTrack = track.id !== currentTrackId;
  const now = Date.now();
  const prevRate = window._currentPlaybackRate || 1.0;

  // 1. Detect explicit playback rate from data (from SMTC reader or custom player)
  if (typeof data.playback_rate === 'number' && data.playback_rate > 0) {
    window._currentPlaybackRate = data.playback_rate;
  } else if (!window._currentPlaybackRate) {
    window._currentPlaybackRate = 1.0;
  }

  // 2. Playback speed auto-detection (for Spotify Web API / browser players at 1.25x, 1.5x, 2x)
  if (!isNewTrack && isCurrentlyPlaying && isPlaying && window._lastGroundTruthTime && window._lastGroundTruthProgress !== undefined) {
    const dt = now - window._lastGroundTruthTime;
    const dp = progressMs - window._lastGroundTruthProgress;
    // Typical poll interval (600ms - 4000ms) and forward progress without large manual seek
    if (dt >= 600 && dt <= 4000 && dp > 0 && dp < 12000) {
      const measuredRate = dp / dt;
      const candidates = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
      const matched = candidates.find(c => Math.abs(measuredRate - c) <= 0.16);
      if (matched && (!data.playback_rate || data.playback_rate === 1.0)) {
        if (matched === window._candidateRate) {
          window._candidateRateHits = (window._candidateRateHits || 0) + 1;
          if (window._candidateRateHits >= 2 && window._currentPlaybackRate !== matched) {
            window._currentPlaybackRate = matched;
          }
        } else {
          window._candidateRate = matched;
          window._candidateRateHits = 1;
        }
      }
    }
  }
  window._lastGroundTruthTime = now;
  window._lastGroundTruthProgress = progressMs;

  // If playback rate changed, adapt animations immediately
  if (window._currentPlaybackRate !== prevRate && lyrics && lyrics.length > 0) {
    adaptBpmSync(lyrics);
  }

  // SPECIAL FIX: Some browser players (Apple Music Web) report progressMs = 0
  // even when playing. We ignore 0-syncs if we are already playing to prevent
  // the slider from snapping back to the start.
  const isZeroReset = progressMs === 0 && isPlaying && !isNewTrack;

  if (isNewTrack && !isZeroReset) {
    // New song: snap immediately to the API timestamp
    lastPollProgress = progressMs;
    lastPollTimestamp = now;
    currentProgress = progressMs;
    window._candidateRate = null;
    window._candidateRateHits = 0;
  } else if (!isZeroReset && isCurrentlyPlaying) {
    if (!isPlaying) {
      // Transition from paused -> playing: cleanly reset clock reference to prevent forward elapsed time jump
      const resumePos = (typeof progressMs === 'number' && progressMs > 0 && Math.abs(progressMs - currentProgress) > 2500)
        ? progressMs
        : currentProgress;
      lastPollProgress = resumePos;
      currentProgress = resumePos;
      lastPollTimestamp = now;
    } else {
      const drift = currentProgress - progressMs;
      const absDrift = Math.abs(drift);

      if (absDrift > 2500) {
        // Hard seek / scrub detected — snap immediately
        lastPollProgress = progressMs;
        lastPollTimestamp = now;
        currentProgress = progressMs;
      } else if (absDrift > 300) {
        // Smooth clock slewing: gently adjust the clock reference by 15% of the drift
        // Shifting lastPollTimestamp by (drift * 0.15) pulls the clock into alignment
        // over several polls without ANY visible sudden jerk, stutter, or backward snap!
        lastPollTimestamp += (drift * 0.15);
      } else {
        // Within normal polling jitter (0-300ms):
        // Keep internal high-precision 60/144 FPS RAF clock running 100% undisturbed!
      }
    }
  } else if (!isZeroReset && !isCurrentlyPlaying) {
    // Song is PAUSED: freeze currentProgress exactly where it is right now.
    if (isPlaying) {
      lastPollProgress = currentProgress;
      lastPollTimestamp = now;
    }
  }

  isPlaying = isCurrentlyPlaying;
  document.body.classList.toggle('is-playing', isCurrentlyPlaying);
  document.body.classList.toggle('app-paused', !isCurrentlyPlaying);
  document.body.classList.remove('is-idle');
  if (widgetArtFallback) widgetArtFallback.classList.remove('idle-active');
  if (widgetProgressFill) widgetProgressFill.classList.remove('idle-shimmer');
  if (isPlaying) ensurePlayheadLoop();
  handleTaskbarPauseAutoHide(!isPlaying);
  updateAutoHideState();

  trackDuration = track.duration_ms;

  if (track && (!track.album || !track.album.images || !track.album.images.length)) {
    const primaryArtist = track.artists?.[0]?.name || '';
    const dualKey = `${primaryArtist}:::${track.name}`.toLowerCase().trim();
    const cachedArt = localArtCache[track.id] || localArtCache[dualKey];
    if (cachedArt && cachedArt !== 'fetching' && cachedArt !== 'notfound') {
      track.album = track.album || {};
      track.album.images = [{ url: cachedArt }, { url: cachedArt }, { url: cachedArt }];
    }
  }

  // Update Play/Pause button icons
  if (isPlaying) {
    if (btnPlaySvg) btnPlaySvg.style.display = 'none';
    if (btnPauseSvg) btnPauseSvg.style.display = 'block';
    resumeAnimatedArtVideos();
  } else {
    if (btnPlaySvg) btnPlaySvg.style.display = 'block';
    if (btnPauseSvg) btnPauseSvg.style.display = 'none';
    pauseAnimatedArtVideos();
  }

  const albumArtUrl = track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || track.album?.images?.[2]?.url;
  currentPlayingTrackObj = track;
  currentStaticAlbumArtUrl = albumArtUrl;

  const isSongChanged = track.id !== currentTrackId;

  // 1. Only touch Track Info DOM when track changes
  if (track.id !== lastProcessedTrackId) {
    lastProcessedTrackId = track.id;
    widgetTrackName.textContent = track.name;
    const artistText = track.artists.map(a => a.name).join(", ");
    widgetArtistName.textContent = artistText;
    if (wallpaperTrackTitle) wallpaperTrackTitle.textContent = track.name;
    if (wallpaperTrackArtist) wallpaperTrackArtist.textContent = artistText;
  }

  // 2. Only update Album Art & Animated Art when song or art URL changes
  if (isSongChanged || albumArtUrl !== lastAppliedAlbumArtUrl) {
    lastAppliedAlbumArtUrl = albumArtUrl;
    if (albumArtUrl) {
      widgetAlbumArt.src = albumArtUrl;
      widgetAlbumArt.style.display = "block";
      widgetArtFallback.style.display = "none";
      setWallpaperAlbumArt(albumArtUrl);
      updateDynamicArtColor(albumArtUrl);
    } else {
      widgetAlbumArt.style.display = "none";
      widgetArtFallback.style.display = "flex";
      setWallpaperAlbumArt(null);
    }
    updateAnimatedAlbumArt(track, albumArtUrl);
  }

  widgetTimeDuration.textContent = formatTime(trackDuration);

  // 3. Check if song changed
  if (isSongChanged) {
    currentTrackId = track.id;

    // Load per-song offset
    if (!settings.trackOffsets) settings.trackOffsets = {};
    settings.syncOffsetMs = settings.trackOffsets[currentTrackId] || 0;
    if (inputSyncOffset) inputSyncOffset.value = settings.syncOffsetMs;

    try {
      logTrackHistory(track);
    } catch (e) {
      console.warn("[History] Failed to log track history:", e);
    }
    lyrics = [];
    activeLineIndex = -1;
    userScrolling = false;
    hideResyncButton();
    if (widgetPlaycount) widgetPlaycount.style.display = "none";

    lyricsContainer.innerHTML = '<div class="lyric-line placeholder">Loading lyrics...</div>';
    lyricsContainer.style.transform = 'translateY(-50px)';
    if (tbLyricLine) {
      tbLyricLine.textContent = "Loading lyrics...";
      sendTaskbarLyric("Loading lyrics...");
    }

    // Hide and reset genius fact
    if (geniusFactCard) {
      geniusFactCard.classList.remove("has-content");
      geniusFactContent.textContent = "";
    }
    if (geniusFactInterval) {
      clearInterval(geniusFactInterval);
      geniusFactInterval = null;
    }
    geniusFactChunks = [];
    geniusFactIndex = 0;

    currentAnnotations = [];
    hideLiveMeaningPill();
    hideGeniusModal();

    if (window.lastFM) {
      window.lastFM.onTrackChange({
        title: track.name,
        artist: track.artists.map(a => a.name).join(", "),
        album: track.album?.name || ''
      });
    }

    // Trigger slide-in Next Up popup window!
    const popupArtUrl = track.album?.images?.[1]?.url || track.album?.images?.[0]?.url;
    // Treat data: URLs (low-res SMTC thumbnails ~234px) the same as missing art —
    // show as placeholder immediately but kick off a proper 600x600 fetch in the background.
    const artIsLowResDataUrl = albumArtUrl && albumArtUrl.startsWith('data:');
    if (artIsLowResDataUrl && currentTrackId === track.id) {
      widgetAlbumArt.src = albumArtUrl;
      widgetAlbumArt.style.display = 'block';
      widgetArtFallback.style.display = 'none';
    }
    if ((!albumArtUrl || artIsLowResDataUrl) && (!localArtCache[track.id] || localArtCache[track.id] === 'notfound')) {
      localArtCache[track.id] = 'fetching';
      fetchFallbackAlbumArt(track.name, track.artists?.[0]?.name || '').then(artUrl => {
        if (artUrl) {
          saveArtToCache(track.id, artUrl, track.name, track.artists?.[0]?.name || '');
        } else {
          localArtCache[track.id] = 'notfound';
          setTimeout(() => { if (localArtCache[track.id] === 'notfound') delete localArtCache[track.id]; }, 10000);
        }
        if (artUrl && currentTrackId === track.id) {
          track.album = track.album || { images: [] };
          track.album.images = [{ url: artUrl }, { url: artUrl }, { url: artUrl }];
          widgetAlbumArt.src = artUrl;
          widgetAlbumArt.style.display = "block";
          widgetArtFallback.style.display = "none";
          setWallpaperAlbumArt(artUrl);

          if (settings.showNextUp !== false) {
            showNowPlayingNotification({
              name: track.name,
              artist: track.artists.map(a => a.name).join(", "),
              albumArtUrl: artUrl
            });
          }

          updateDynamicArtColor(artUrl);
          currentStaticAlbumArtUrl = artUrl;
          updateAnimatedAlbumArt(track, artUrl);
        }
      });
    } else {
      if (settings.showNextUp !== false) {
        showNowPlayingNotification({
          name: track.name,
          artist: track.artists.map(a => a.name).join(", "),
          albumArtUrl: popupArtUrl
        });
      }
    }

    // Cancel previous pending fetches if songs are rapidly skipped
    if (trackSwitchDebounceTimer) {
      clearTimeout(trackSwitchDebounceTimer);
      trackSwitchDebounceTimer = null;
    }

    const targetTrackId = track.id;
    const targetTrackName = track.name;
    const targetArtistName = (track.artists && track.artists[0] && track.artists[0].name) ? track.artists[0].name : '';
    const targetTrackDuration = trackDuration;
    const finalIsrc = track.external_ids?.isrc || null;

    // Check if lyrics are already cached locally — if so, load instantly (0ms)!
    const cacheKey = `lyrics_cache_v21_${targetTrackId}`;
    const hasCachedLyrics = !!localStorage.getItem(cacheKey);

    const executeTrackFetches = () => {
      if (currentTrackId !== targetTrackId) return;
      fetchGeniusFact(targetTrackName, targetArtistName);
      fetchGeniusAnnotations(targetTrackName, targetArtistName, targetTrackId);
      fetchLyrics(targetTrackId, targetTrackName, targetArtistName || 'Unknown', targetTrackDuration, finalIsrc);
    };

    if (hasCachedLyrics) {
      executeTrackFetches();
    } else {
      // Debounce network requests by 120ms to keep up with rapid song skips!
      trackSwitchDebounceTimer = setTimeout(executeTrackFetches, 120);
    }
  }
}

// History logging
function logTrackHistory(track) {
  try {
    let albumArtUrl = track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || "";
    if (!albumArtUrl && localArtCache[track.id]) {
      albumArtUrl = localArtCache[track.id];
    }
    // Never persist massive base64 data URLs in localStorage history
    if (albumArtUrl && albumArtUrl.startsWith("data:")) {
      albumArtUrl = "";
    }

    const entry = {
      title: track.name,
      artist: track.artists.map(a => a.name).join(", "),
      timestamp: Date.now(),
      albumArtUrl
    };

    let history = [];
    try {
      history = JSON.parse(localStorage.getItem("listening_history") || "[]");
    } catch (e) { history = []; }

    history.unshift(entry);
    if (history.length > 40) history = history.slice(0, 40);

    if (window.safeStorageSet) {
      window.safeStorageSet("listening_history", JSON.stringify(history));
    } else {
      localStorage.setItem("listening_history", JSON.stringify(history));
    }
    renderHistory();
  } catch (err) {
    console.warn("[History] Failed to log track history:", err);
  }
}

async function renderHistory() {
  if (!historyContainer) return;

  const renderEntries = (entries) => {
    historyContainer.innerHTML = '';
    entries.forEach(entry => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.gap = '8px';
      div.style.alignItems = 'center';

      const img = document.createElement('img');
      img.src = entry.albumArtUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      img.style.width = '24px';
      img.style.height = '24px';
      img.style.borderRadius = '4px';
      img.style.objectFit = 'cover';
      img.style.backgroundColor = 'rgba(255,255,255,0.1)';

      const details = document.createElement('div');
      details.style.display = 'flex';
      details.style.flexDirection = 'column';
      details.style.overflow = 'hidden';

      const title = document.createElement('div');
      title.style.fontSize = '12px';
      title.style.color = '#ffffff';
      title.style.whiteSpace = 'nowrap';
      title.style.overflow = 'hidden';
      title.style.textOverflow = 'ellipsis';
      title.textContent = entry.title;

      const sub = document.createElement('div');
      sub.style.fontSize = '10px';
      sub.style.color = 'rgba(255,255,255,0.5)';
      sub.style.whiteSpace = 'nowrap';
      sub.style.overflow = 'hidden';
      sub.style.textOverflow = 'ellipsis';
      sub.textContent = `${entry.timeString} — ${entry.artist}`;

      details.appendChild(title);
      details.appendChild(sub);
      div.appendChild(img);
      div.appendChild(details);

      historyContainer.appendChild(div);
    });
  };

  if (window.lastFM && window.lastFM.isConnected()) {
    try {
      const lfmTracks = await window.lastFM.getRecentTracks(20);
      if (lfmTracks && lfmTracks.length > 0) {
        const entries = await Promise.all(lfmTracks.map(async track => {
          let artUrl = null;
          if (track.image && track.image.length > 0) {
            const img = track.image.find(i => i.size === "extralarge" || i.size === "large") || track.image[track.image.length - 1];
            if (img && img["#text"] && img["#text"].trim() !== "" && !img["#text"].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
              artUrl = img["#text"];
            }
          }

          const artistName = track.artist ? (track.artist["#text"] || track.artist.name) : 'Unknown';

          if (!artUrl) {
            artUrl = await fetchFallbackAlbumArt(track.name, artistName);
          }

          return {
            title: track.name,
            artist: artistName,
            timeString: track.date && track.date.uts ? new Date(track.date.uts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now Playing',
            albumArtUrl: artUrl
          };
        }));
        renderEntries(entries);
        return;
      }
    } catch (err) {
      console.error("Last.fm history error:", err);
    }
  }

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem("listening_history") || "[]");
  } catch (e) { console.error(e); }

  if (history.length === 0) {
    historyContainer.innerHTML = '<div style="font-size: 11px; color: rgba(255,255,255,0.4);">No history yet...</div>';
    return;
  }

  const entries = await Promise.all(history.map(async entry => {
    let artUrl = entry.albumArtUrl;
    if (!artUrl || artUrl.trim() === "") {
      artUrl = await fetchFallbackAlbumArt(entry.title, entry.artist);
    }

    return {
      title: entry.title,
      artist: entry.artist,
      timeString: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      albumArtUrl: artUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    };
  }));
  renderEntries(entries);
}




// Synced lyrics fetching & parsing with caching
let fetchAbortController = null;

// Track alternative candidates and rejected signatures per trackId
const trackLyricsCandidateIndex = {};
const rejectedLyricsSignatures = {};
let isReloadingLyrics = false;

// Synced lyrics fetching via V2 Unified Proxy (Spotify Internal) + Direct LRCLIB
async function fetchLyrics(trackId, trackName, artistName, durationMs, isrc = null, options = {}) {
  if (typeof isrc === 'object' && isrc !== null && Object.keys(options).length === 0) {
    options = isrc;
    isrc = null;
  }
  isFetchingLyrics = true;
  if (fetchAbortController) {
    fetchAbortController.abort();
  }
  fetchAbortController = new AbortController();
  const signal = fetchAbortController.signal;

  const cleanArtist = artistName.replace(/VEVO$/i, '').replace(/- Topic$/i, '').replace(/Official$/i, '').trim() || artistName;
  const cleanTrack = trackName
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?(Official|Audio|Video|feat\.|ft\.|with).*?\)/ig, '')
    .replace(/ - (Remastered|Radio Edit|Live|Instrumental|Acoustic|Single Version).*/i, '')
    .replace(/\s+(feat\.|ft\.).*$/i, '')
    .trim() || trackName;

  const cacheKey = `lyrics_cache_v21_${trackId}`;

  if (options.forceRefresh) {
    // Invalidate caches when user explicitly requests alternative / reload
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`lyrics_cache_${trackId}`);
    localStorage.removeItem(`blacklist_lyrics_${trackId}`);
    if (window.lrclibCache) delete window.lrclibCache[trackId];

    // Save signature of current lyrics so we don't serve identical rejected lyrics
    if (lyrics && lyrics.length > 0) {
      if (!rejectedLyricsSignatures[trackId]) rejectedLyricsSignatures[trackId] = new Set();
      const currentSig = lyrics.slice(0, 4).map(l => (l.text || "").trim().toLowerCase()).join("|");
      if (currentSig) rejectedLyricsSignatures[trackId].add(currentSig);
    }

    trackLyricsCandidateIndex[trackId] = (trackLyricsCandidateIndex[trackId] || 0) + 1;
  } else {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const cachedData = JSON.parse(cachedStr);
        if (trackId === currentTrackId && cachedData.lyrics?.length > 0) {
          lyrics = cachedData.lyrics;
          isFetchingLyrics = false;
          updateTimingStatus(cachedData.level || 2, cachedData.source || "", cachedData.candidateInfo || "");
          renderLyrics();
          adaptBpmSync(lyrics);
          if (cachedData.level === 3) return;
        }
      } catch (e) { console.error(e); }
    }
  }

  const durationSec = Math.round(durationMs / 1000);

  try {
    updateTimingStatus(0); // "Checking..."

    let currentSourceLevel = 0;

    const hasLrcTimestamps = (text) => {
      if (!text || typeof text !== 'string') return false;
      return /\[\d{1,2}:\d{2}[.:]\d{2,3}\]/.test(text);
    };

    const getLinesSignature = (lines) => {
      if (!lines || lines.length === 0) return "";
      return lines.slice(0, 4).map(l => (l.text || l.words || "").trim().toLowerCase()).join("|");
    };

    const applyLyricsData = async (parsedLines, sourceLevel, sourceName = "", candidateInfo = "") => {
      console.log(`[LF-LYRICS] applyLyricsData called: sourceLevel=${sourceLevel}, sourceName=${sourceName}, parsedLines.length=${parsedLines.length}, trackId=${trackId}, currentTrackId=${currentTrackId}`);
      // Strip structural tags that often have bad timestamps (e.g., "[Outro]", "Intro", "Chorus")
      parsedLines = parsedLines.filter(line => {
        if (!line.text) return false;
        const t = line.text.trim().toLowerCase();
        if (t.startsWith('[') && t.endsWith(']')) return false;
        if (/^(outro|intro|instrumental|chorus|verse|bridge|hook)(\s+\d+)?$/i.test(t)) return false;
        return true;
      });

      if (trackId !== currentTrackId || parsedLines.length === 0) {
        console.warn(`[LF-LYRICS] applyLyricsData REJECTED: trackId match=${trackId === currentTrackId}, filteredLines=${parsedLines.length}`);
        return false;
      }

      // Blacklist Check (only if not user-forced reload)
      if (!options.forceRefresh) {
        const blacklistKey = `blacklist_lyrics_${trackId}`;
        if (localStorage.getItem(blacklistKey)) {
          console.log(`[Lyrics] Skipping lyrics for ${trackId} (User Blacklisted)`);
          return false;
        }
      }

      // Density Check: If song is normal length but only has 1 or 2 lines, reject junk
      if (trackDuration > 45000 && parsedLines.length < 4) {
        console.warn(`[Lyrics] Rejected lyrics for ${trackId} because it only contained ${parsedLines.length} lines for a full song.`);
        return false;
      }

      if (sourceLevel < currentSourceLevel) {
        console.log(`[LF-LYRICS] applyLyricsData REJECTED: sourceLevel ${sourceLevel} < currentSourceLevel ${currentSourceLevel}`);
        return false;
      }
      if (sourceLevel === currentSourceLevel && lyrics.length > 0 && !options.forceRefresh) {
        return false;
      }

      // Clear any existing subText before processing
      parsedLines.forEach(line => {
        delete line.subText;
      });

      console.log(`[LF-LYRICS] applyLyricsData SUCCESS: setting ${parsedLines.length} lines, level=${sourceLevel}, source=${sourceName}`);
      lyrics = parsedLines;
      isFetchingLyrics = false;
      currentSourceLevel = sourceLevel;
      updateTimingStatus(sourceLevel, sourceName, candidateInfo);
      if (window.safeStorageSet) {
        window.safeStorageSet(cacheKey, JSON.stringify({ level: sourceLevel, lyrics, source: sourceName, candidateInfo, candidateIndex: trackLyricsCandidateIndex[trackId] || 0 }));
      } else {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ level: sourceLevel, lyrics, source: sourceName, candidateInfo, candidateIndex: trackLyricsCandidateIndex[trackId] || 0 }));
        } catch (_) {}
      }
      renderLyrics();
      adaptBpmSync(lyrics);

      const btnHide = document.getElementById("btn-hide-lyrics");
      if (btnHide) btnHide.style.display = "inline-flex";

      // Non-blocking Auto-Translation (runs in background without stalling lyrics rendering)
      if (settings.translateLang && settings.translateLang !== 'none') {
        const skipLang = settings.skipLang || 'none';
        const combinedText = parsedLines.map(l => l.text).join('\n');
        window.electronAPI.translateText(combinedText, settings.translateLang, skipLang)
          .then(transRes => {
            if (trackId !== currentTrackId) return;
            const transLines = (transRes && transRes.text) ? transRes.text.split('\n') : [];
            let hasNewTrans = false;
            parsedLines.forEach((line, i) => {
              const transText = transLines[i] ? transLines[i].trim() : '';
              if (transText && transText.toLowerCase() !== line.text.trim().toLowerCase()) {
                line.subText = transText;
                hasNewTrans = true;
              }
            });
            if (hasNewTrans && trackId === currentTrackId) {
              renderLyrics();
            }
          })
          .catch(err => { console.warn("[LF-LYRICS] Translation Notice:", err); });
      }

      return true;
    };

    let rateLimited = false;

    // 0. Rust Multi-Provider Engine (Fastest, zero CORS/CSP restrictions, queries Cloudflare Proxy + LRCLIB + Musixmatch)
    const rustLyricsFetch = async () => {
      try {
        if (!window.electronAPI || typeof window.electronAPI.searchSyncedLyrics !== 'function') return false;
        console.log(`[LF-LYRICS] rustLyricsFetch querying: track="${cleanTrack}", artist="${cleanArtist}", dur=${durationMs}`);
        const candidate = await window.electronAPI.searchSyncedLyrics(cleanTrack, cleanArtist, durationMs, {
          preferredProviders: settings.preferredLyricProviders || [],
          musixmatchToken: settings.musixmatchUserToken || null,
          spotifyToken: config?.access_token || null,
          spotifyTrackId: trackId?.startsWith('spotify:track:') ? trackId.replace('spotify:track:', '') : null,
          forceRefresh: !!options.forceRefresh,
          candidateIndex: trackLyricsCandidateIndex[trackId] || 0
        });
        if (candidate && trackId === currentTrackId) {
          console.log(`[LF-LYRICS] rustLyricsFetch received candidate from provider=${candidate.provider} (${candidate.syncType})`);
          let parsed = [];
          if (candidate.rawLRC) {
            parsed = parseLRC(candidate.rawLRC);
          } else if (candidate.parsedLines && candidate.parsedLines.length > 0) {
            parsed = candidate.parsedLines;
          }
          if (parsed.length > 0) {
            const hasWords = parsed.some(l => l.words && l.words.length > 0);
            const level = hasWords ? 3 : (candidate.syncType === 'WORD_SYNCED' ? 3 : (candidate.syncType === 'LINE_SYNCED' ? 2 : 1));
            return await applyLyricsData(parsed, level, candidate.provider, candidate.candidateInfo || "");
          }
        }
      } catch (e) {
        console.warn("[LF-LYRICS] rustLyricsFetch error:", e);
      }
      return false;
    };

    // 1. Fetch via Cloudflare Worker Proxy (Spotify Internal + Worker cache)
    const proxyFetch = async () => {
      try {
        const baseUrl = settings.customProxyUrl ? settings.customProxyUrl.replace(/\/$/, '') : 'https://lyricsplus.mathurdeepit12.workers.dev';
        let url = `${baseUrl}/lyrics?artist=${encodeURIComponent(cleanArtist)}&title=${encodeURIComponent(cleanTrack)}&trackId=${encodeURIComponent(trackId)}`;
        
        if (trackDuration > 0) {
          url += `&duration=${Math.round(trackDuration / 1000)}`;
        }
        if (config && config.access_token) {
          url += `&token=${encodeURIComponent(config.access_token)}`;
        }
        if (options.forceRefresh) {
          url += `&refresh=1&candidate=${trackLyricsCandidateIndex[trackId] || 1}&t=${Date.now()}`;
        }

        console.debug(`[LF-DEBUG] proxyFetch: cleanTrack="${cleanTrack}", cleanArtist="${cleanArtist}"`);
        const response = await fetch(url, { signal });
        console.debug(`[LF-DEBUG] proxyFetch response status: ${response.status}`);
        if (response.status === 429) rateLimited = true;
        if (response.ok) {
          const data = await response.json();
          console.debug(`[LF-DEBUG] proxyFetch data.source="${data.source}", syncType="${data.syncType}", linesCount=${data.lines?.length || 0}`);
          
          if (data.source === "Spotify" && data.lines && data.lines.length > 0) {
            const sig = getLinesSignature(data.lines);
            if (options.forceRefresh && rejectedLyricsSignatures[trackId]?.has(sig)) {
              console.debug(`[LF-DEBUG] proxyFetch returned identical rejected lyrics for ${trackId}, skipping for alternative candidate`);
              return false;
            }
            const level = (data.syncType === "WORD_SYNCED") ? 3 : 2;
            return await applyLyricsData(data.lines, level, "Spotify");
          } else if (data.source === "LRCLIB" && data.rawLRC) {
            const parsed = parseLRC(data.rawLRC);
            const sig = getLinesSignature(parsed);
            if (options.forceRefresh && rejectedLyricsSignatures[trackId]?.has(sig)) {
              console.debug(`[LF-DEBUG] proxyFetch LRCLIB returned identical rejected lyrics for ${trackId}`);
              return false;
            }
            if (parsed.length > 0) {
              const hasWords = parsed.some(l => l.words && l.words.length > 0);
              const level = hasWords ? 3 : (data.syncType === "LINE_SYNCED" ? 2 : 1);
              return await applyLyricsData(parsed, level, "LRCLIB (Proxy)");
            } else if (data.syncType === "UNSYNCED") {
              const plainParsed = data.rawLRC.split('\n').map(l => l.trim()).filter(l => l && !l.match(/^\[[a-z]+:/i)).map((text) => ({ timeMs: 9999999, text }));
              return await applyLyricsData(plainParsed, 1, "LRCLIB (Plain)");
            }
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.debug("[LF-DEBUG] Proxy Fetch Error:", e);
      }
      return false;
    };

    // 2. Direct LRCLIB Fetch (handles candidate searching & cycling)
    const localLrclibFetch = async () => {
      try {
        const candidateIdx = trackLyricsCandidateIndex[trackId] || 0;
        console.debug(`[LF-DEBUG] localLrclibFetch: candidateIdx=${candidateIdx}, currentSourceLevel=${currentSourceLevel}`);
        
        let candidatePool = [];
        let exactResult = null;

        // On initial attempt without force-refresh, try fast exact GET
        if (!options.forceRefresh && candidateIdx === 0) {
          const params = new URLSearchParams({ artist_name: cleanArtist, track_name: cleanTrack });
          if (durationSec > 0) params.set("duration", durationSec);
          try {
            const res = await fetch(`https://lrclib.net/api/get?${params}`, { signal });
            if (res.ok) {
              const d = await res.json();
              if (d && (hasLrcTimestamps(d.syncedLyrics) || d.plainLyrics)) {
                exactResult = d;
              }
            }
          } catch (e) { /* fallback to search */ }
        }

        if (!exactResult || !hasLrcTimestamps(exactResult.syncedLyrics)) {
          // Query both targeted search and keyword search
          const searchPromises = [
            fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTrack)}&artist_name=${encodeURIComponent(cleanArtist)}`, { signal })
              .then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTrack + " " + cleanArtist)}`, { signal })
              .then(r => r.ok ? r.json() : []).catch(() => [])
          ];

          const [resByMeta, resByQuery] = await Promise.all(searchPromises);
          const rawCandidates = [...(resByMeta || []), ...(resByQuery || [])];

          // Deduplicate by item ID
          const seenIds = new Set();
          const unique = [];
          for (const item of rawCandidates) {
            if (item && item.id && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              unique.push(item);
            }
          }

          // Filter by match
          const sArtist = cleanArtist.toLowerCase();
          const sTrack = cleanTrack.toLowerCase();
          const valid = unique.filter(r => {
            const rArtist = (r.artistName || "").toLowerCase();
            const rTrack = (r.trackName || "").toLowerCase();
            return rArtist.includes(sArtist) || sArtist.includes(rArtist) ||
                   rTrack.includes(sTrack) || sTrack.includes(rTrack);
          });

          // Sort synced candidates by duration proximity
          const syncedList = valid.filter(r => hasLrcTimestamps(r.syncedLyrics));
          const plainList = valid.filter(r => !hasLrcTimestamps(r.syncedLyrics) && r.plainLyrics);

          if (durationSec > 0) {
            syncedList.sort((a, b) => Math.abs((a.duration || 0) - durationSec) - Math.abs((b.duration || 0) - durationSec));
            plainList.sort((a, b) => Math.abs((a.duration || 0) - durationSec) - Math.abs((b.duration || 0) - durationSec));
          }

          candidatePool = [...syncedList, ...plainList];
        } else {
          candidatePool = [exactResult];
        }

        // On reload, filter out candidates matching rejected lyrics signatures
        if (options.forceRefresh && rejectedLyricsSignatures[trackId]?.size > 0 && candidatePool.length > 1) {
          const nonRejected = candidatePool.filter(c => {
            const lrc = c.syncedLyrics || c.plainLyrics || "";
            const lines = parseLRC(lrc);
            const sig = getLinesSignature(lines);
            return !rejectedLyricsSignatures[trackId].has(sig);
          });
          if (nonRejected.length > 0) candidatePool = nonRejected;
        }

        if (candidatePool.length === 0) {
          console.debug("[LF-DEBUG] localLrclibFetch: no valid candidates in pool");
          return false;
        }

        const chosenIdx = candidateIdx % candidatePool.length;
        const selected = candidatePool[chosenIdx];
        const isSynced = hasLrcTimestamps(selected.syncedLyrics);
        const lrcText = isSynced ? selected.syncedLyrics : selected.plainLyrics;

        if (!lrcText) return false;

        const parsed = parseLRC(lrcText);
        if (parsed.length > 0) {
          const hasWords = parsed.some(l => l.words && l.words.length > 0);
          const level = hasWords ? 3 : (isSynced ? 2 : 1);
          const candidateLabel = candidatePool.length > 1 ? `#${chosenIdx + 1}/${candidatePool.length}` : "";
          const applied = await applyLyricsData(parsed, level, "LRCLIB", candidateLabel);

          if (applied && options.forceRefresh) {
            showToast(`Loaded match #${chosenIdx + 1} of ${candidatePool.length} from LRCLIB (${isSynced ? 'Synced' : 'Plain'})`, 3000, 'success');
          }
          return applied;
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.debug("[LF-DEBUG] localLrclibFetch error:", e);
      }
      return false;
    };

    // 3. Fallback: Lyrics.ovh (Unsynced)
    const ovhFetch = async () => {
      try {
        if (lyrics.length > 0) return;
        const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTrack)}`;
        const response = await fetch(url, { signal });
        if (response.ok) {
          const data = await response.json();
          if (data.lyrics && trackId === currentTrackId && lyrics.length === 0) {
            const lines = data.lyrics.split('\n').map((text) => ({ timeMs: 9999999, text }));
            applyLyricsData(lines, 1, "lyrics.ovh");
          }
        }
      } catch (e) {}
    };

    // Run Rust multi-provider engine, Cloudflare proxy, and direct LRCLIB simultaneously for maximum speed & redundancy
    const rustTask = rustLyricsFetch();
    const proxyTask = proxyFetch();
    const lrclibTask = localLrclibFetch();

    await Promise.allSettled([rustTask, proxyTask, lrclibTask]);

    if (lyrics.length === 0 && trackId === currentTrackId) {
      await ovhFetch();
    }

    if (lyrics.length === 0 && options.forceRefresh && trackId === currentTrackId) {
      showToast("No alternative lyrics found in database for this track.", 3000, 'warning');
    }

    // Immediately resolve empty state: do not leave user hanging in limbo
    if (lyrics.length === 0 && trackId === currentTrackId) {
      isFetchingLyrics = false;
      renderLyrics();
    }

    manageLyricsCache(cacheKey);
  } catch (err) {
    if (err.name !== 'AbortError') console.error("Fetch Error:", err);
    if (lyrics.length === 0 && trackId === currentTrackId) {
      isFetchingLyrics = false;
      renderLyrics();
    }
  } finally {
    if (trackId === currentTrackId) {
      isFetchingLyrics = false;
    }
  }
}

function updateTimingStatus(level, sourceName = "", candidateInfo = "") {
  const badge = document.getElementById("timing-status-badge");
  if (!badge) return;

  const dot = badge.querySelector(".status-dot");
  const text = badge.querySelector(".status-text") || badge;

  badge.className = "timing-status-badge";

  if (level === 3) {
    badge.classList.add("word-synced");
    const label = candidateInfo ? `Word Timing (${candidateInfo})` : "Word Timing";
    text.textContent = label;
    badge.title = `High-Fidelity Word Timing (Synced)${sourceName ? ` from ${sourceName}` : ''}. Click to find alternative lyrics (Ctrl+R).`;
    badge.style.display = "inline-flex";
  } else if (level === 2) {
    badge.classList.add("line-synced");
    const label = candidateInfo ? `Line Sync (${candidateInfo})` : "Line Sync";
    text.textContent = label;
    badge.title = `Line-Synced Lyrics${sourceName ? ` from ${sourceName}` : ''}. Click to find alternative lyrics (Ctrl+R).`;
    badge.style.display = "inline-flex";
  } else if (level === 1) {
    badge.classList.add("plain");
    text.textContent = "Plain Text";
    badge.title = "Plain Text Lyrics (No Sync). Click to find alternative lyrics (Ctrl+R).";
    badge.style.display = "inline-flex";
  } else if (level === -1 || level === 'none') {
    badge.classList.add("none");
    text.textContent = "No Lyrics";
    badge.title = "No lyrics found for this track. Click to search alternative lyrics (Ctrl+R).";
    badge.style.display = "inline-flex";
  } else {
    badge.classList.add("checking");
    text.textContent = "Checking...";
    badge.title = "Searching lyrics database...";
    badge.style.display = "inline-flex";
  }
}

async function cycleAlternativeLyrics() {
  if (isReloadingLyrics) return;
  if (!currentTrackId) {
    showToast("No active track playing to reload lyrics.", 2000, 'warning');
    return;
  }
  const title = (widgetTrackName && widgetTrackName.textContent !== "Not Playing") ? widgetTrackName.textContent : "";
  const artist = (widgetArtistName && widgetArtistName.textContent !== "Spotify") ? widgetArtistName.textContent : "";
  if (!title) {
    showToast("Play a track first to reload lyrics.", 2000, 'warning');
    return;
  }

  isReloadingLyrics = true;

  // Spin reload buttons
  const reloadIcons = document.querySelectorAll(".reload-icon");
  reloadIcons.forEach(icon => icon.classList.add("rotating"));

  const curIdx = (trackLyricsCandidateIndex[currentTrackId] || 0) + 1;
  showToast(`Searching lyrics database for alternative #${curIdx + 1}...`, 3000, 'reload');

  try {
    await fetchLyrics(currentTrackId, title, artist, trackDuration, null, { forceRefresh: true });
  } catch (err) {
    console.error("Cycle lyrics error:", err);
    showToast("Error researching lyrics from database.", 3000, 'warning');
  } finally {
    setTimeout(() => {
      reloadIcons.forEach(icon => icon.classList.remove("rotating"));
      isReloadingLyrics = false;
    }, 600);
  }
}



async function fetchGeniusFact(trackName, artistName) {
  // Clear previous state immediately
  if (geniusFactInterval) {
    clearInterval(geniusFactInterval);
    geniusFactInterval = null;
  }
  geniusFactChunks = [];
  geniusFactIndex = 0;
  if (geniusFactCard) {
    geniusFactCard.classList.remove("has-content");
  }

  try {
    const description = await window.electronAPI.fetchGeniusFact(trackName, artistName);
    if (widgetTrackName && widgetTrackName.textContent !== trackName) return;
    if (description && description.trim() !== "?" && description.length > 20) {
      // Filter out generic "about" or placeholder descriptions that aren't actual facts
      const lowerDesc = description.toLowerCase();
      if (lowerDesc.includes("lyrics for this song") ||
          lowerDesc.includes("musixmatch") ||
          lowerDesc.includes("this song hasn't been") ||
          description.trim().startsWith("Contributor")) {
        return;
      }

      // Split description into meaningful chunks (sentences or short paragraphs)
      const rawChunks = description.split(/(?<=[.!?])\s+(?=[A-Z])/);

      // Combine very short chunks
      let currentChunk = "";
      geniusFactChunks = [];
      for (let i = 0; i < rawChunks.length; i++) {
        const chunk = rawChunks[i].trim();
        if (currentChunk.length + chunk.length < 150) {
          currentChunk += (currentChunk ? " " : "") + chunk;
        } else {
          if (currentChunk) geniusFactChunks.push(currentChunk);
          currentChunk = chunk;
        }
      }
      if (currentChunk) geniusFactChunks.push(currentChunk);

      geniusFactChunks = geniusFactChunks.filter(c => c.length > 10);
      geniusFactIndex = 0;

      if (geniusFactChunks.length > 0 && settings.showGeniusFact !== false) {
        if (geniusFactContent && geniusFactCard) {
          geniusFactContent.textContent = geniusFactChunks[0];
          geniusFactCard.classList.add("has-content");
        }

        if (geniusFactChunks.length > 1) {
          geniusFactInterval = setInterval(() => {
            if (!settings.showGeniusFact) return;
            geniusFactIndex = (geniusFactIndex + 1) % geniusFactChunks.length;
            if (geniusFactContent) {
              geniusFactContent.style.opacity = 0;
              setTimeout(() => {
                geniusFactContent.textContent = geniusFactChunks[geniusFactIndex];
                geniusFactContent.style.opacity = 1;
              }, 300);
            }
          }, 20000);
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch Genius fact from main process:", e);
  }
}

// ==========================================
// GENIUS REAL-TIME ANNOTATIONS & LIVE MEANING
// ==========================================

function normalizeForMatching(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, "'")
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findAnnotationForLine(lineText, annotations) {
  if (!lineText || !annotations || annotations.length === 0) return null;
  const normLine = normalizeForMatching(lineText);
  if (normLine.length < 5) return null;

  // 1. Exact normalized match
  for (const ann of annotations) {
    const normFrag = normalizeForMatching(ann.fragment);
    if (normFrag === normLine) return ann;
  }

  // 2. Substring match: fragment contains the line
  for (const ann of annotations) {
    const normFrag = normalizeForMatching(ann.fragment);
    if (normFrag.includes(normLine) && normLine.length >= 10) return ann;
  }

  // 3. Substring match: line contains the fragment
  for (const ann of annotations) {
    const normFrag = normalizeForMatching(ann.fragment);
    if (normFrag.length >= 10 && normLine.includes(normFrag)) return ann;
  }

  // 4. Token overlap match (>= 75% overlap on lines with 4+ words)
  const lineWords = normLine.split(' ').filter(w => w.length > 2);
  if (lineWords.length >= 4) {
    let bestAnn = null;
    let maxOverlap = 0;
    for (const ann of annotations) {
      const normFrag = normalizeForMatching(ann.fragment);
      let matchCount = 0;
      for (const w of lineWords) {
        if (normFrag.includes(w)) matchCount++;
      }
      const ratio = matchCount / lineWords.length;
      if (ratio >= 0.75 && ratio > maxOverlap) {
        maxOverlap = ratio;
        bestAnn = ann;
      }
    }
    if (bestAnn) return bestAnn;
  }

  return null;
}

async function fetchGeniusAnnotations(trackName, artistName, trackId) {
  currentAnnotations = [];
  hideLiveMeaningPill();

  if (settings.showAnnotations === false || settings.wallpaperMode) return;
  if (!trackName || !artistName) return;

  const currentFetchId = trackId;
  const cacheKey = `genius_annotations_${trackId || (artistName + '_' + trackName)}`;

  // 1. Check local cache first
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (currentTrackId !== currentFetchId) return;
        currentAnnotations = parsed;
        attachAnnotationsToRenderedLyrics();
        return;
      }
    } catch (e) {}
  }

  // 2. Query Genius API in background
  try {
    if (!window.electronAPI || !window.electronAPI.getGeniusAnnotations) return;
    const annotations = await window.electronAPI.getGeniusAnnotations(artistName, trackName);

    if (currentTrackId !== currentFetchId) return;

    if (Array.isArray(annotations) && annotations.length > 0) {
      currentAnnotations = annotations;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(annotations));
      } catch (e) {}
      attachAnnotationsToRenderedLyrics();
    }
  } catch (err) {
    console.error("Failed to fetch Genius annotations:", err);
  }
}

function attachAnnotationsToRenderedLyrics() {
  if (!lyrics || lyrics.length === 0) return;

  const allowAnnotations = settings.showAnnotations !== false && !settings.wallpaperMode;

  lyrics.forEach((line, index) => {
    const matched = allowAnnotations ? findAnnotationForLine(line.text, currentAnnotations) : null;
    line.annotation = matched;

    if (cachedLineEls && cachedLineEls[index]) {
      const el = cachedLineEls[index];
      if (matched) {
        el.classList.add('has-annotation');
        el.dataset.fragment = matched.fragment;
        el.dataset.annotation = matched.text;

        if (!el.querySelector('.lyric-annotation-btn')) {
          const btn = document.createElement('button');
          btn.className = 'lyric-annotation-btn';
          btn.title = 'View Genius Meaning (Crowdsourced Interpretation)';
          btn.setAttribute('aria-label', 'View Genius Meaning');
          btn.innerHTML = '💡';
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showGeniusModal(matched.fragment, matched.text);
          });
          el.appendChild(btn);
        }
      } else {
        el.classList.remove('has-annotation');
        delete el.dataset.fragment;
        delete el.dataset.annotation;
        const existingBtn = el.querySelector('.lyric-annotation-btn');
        if (existingBtn) existingBtn.remove();
      }
    }
  });

  // Update live meaning pill if active line has an annotation and preview is enabled
  if (allowAnnotations && settings.showAnnotationPreview === true && !settings.taskbarMode) {
    if (activeLineIndex >= 0 && lyrics[activeLineIndex] && lyrics[activeLineIndex].annotation) {
      showLiveMeaningPill(lyrics[activeLineIndex].annotation);
    } else {
      hideLiveMeaningPill();
    }
  } else {
    hideLiveMeaningPill();
  }
}

function showLiveMeaningPill(annotation) {
  if (settings.showAnnotationPreview !== true || settings.showAnnotations === false || settings.taskbarMode || settings.wallpaperMode || !annotation) {
    hideLiveMeaningPill();
    return;
  }
  const pill = document.getElementById('genius-live-meaning');
  const snippetEl = document.getElementById('live-meaning-snippet');
  if (!pill || !snippetEl) return;

  const cleanText = (annotation.text || '').replace(/\s+/g, ' ').trim();
  if (!cleanText) {
    hideLiveMeaningPill();
    return;
  }

  const firstSentence = cleanText.split(/(?<=[.?!])\s+/)[0] || cleanText;
  const snippet = firstSentence.length > 110 ? firstSentence.slice(0, 107) + '...' : firstSentence;

  snippetEl.textContent = snippet;
  pill.dataset.fragment = annotation.fragment || '';
  pill.dataset.annotation = annotation.text || '';
  pill.classList.add('show');
}

function hideLiveMeaningPill() {
  const pill = document.getElementById('genius-live-meaning');
  if (pill) {
    pill.classList.remove('show');
  }
}

function showGeniusModal(fragment, text) {
  const modal = document.getElementById('genius-modal');
  const fragEl = document.getElementById('genius-fragment');
  const textEl = document.getElementById('genius-annotation-text');
  if (!modal || !fragEl || !textEl) return;

  fragEl.textContent = fragment ? `"${fragment}"` : '';

  textEl.innerHTML = '';
  const paragraphs = (text || '').split(/\n\n+/).filter(p => p.trim().length > 0);
  if (paragraphs.length > 1) {
    paragraphs.forEach(p => {
      const pEl = document.createElement('p');
      pEl.style.marginBottom = '12px';
      pEl.textContent = p.trim();
      textEl.appendChild(pEl);
    });
  } else {
    textEl.textContent = text || 'No explanation available.';
  }

  modal.classList.add('show');
}

function hideGeniusModal() {
  const modal = document.getElementById('genius-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// Render lyrics to DOM
function renderLyrics() {
  if (lyrics.length === 0) {
    lyricsContainer.style.transform = 'translateY(0px)';
    lyricsContainer.innerHTML = `
      <div class="lyrics-empty-state">
        <div class="empty-state-icon">♪</div>
        <div class="empty-state-title">No lyrics found for this track</div>
        <div class="empty-state-sub">Instrumental or missing from lyrics database</div>
        <button class="empty-state-retry-btn" id="btn-retry-lyrics">↻ Search Alternatives</button>
      </div>
    `;
    const retryBtn = document.getElementById('btn-retry-lyrics');
    if (retryBtn) {
      retryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleAlternativeLyrics();
      });
    }
    document.body.classList.remove("wbw-active");
    if (tbLyricLine) {
      tbLyricLine.textContent = "No lyrics found";
      sendTaskbarLyric("No lyrics found");
    }
    cachedLineEls = [];
    cachedLineMetrics = [];
    activeLineIndex = -1;
    userScrolling = false;
    hideResyncButton();
    updateTimingStatus(-1);
    const btnHide = document.getElementById("btn-hide-lyrics");
    if (btnHide) btnHide.style.display = "none";
    updateAutoHideState();
    return;
  }

  // Only enable visual "dimming" of the line if we actually have words to highlight
  const hasAnyWordTiming = lyrics.some(l => l.words && l.words.length > 0);
  document.body.classList.toggle("wbw-active", settings.wordByWord && hasAnyWordTiming);

  lyricsContainer.innerHTML = "";
  const frag = document.createDocumentFragment();
  cachedLineEls = [];
  lyrics.forEach((line, index) => {
    const el = document.createElement("div");
    el.className = "lyric-line";
    el.dataset.index = index;
    el.style.transformOrigin = `${settings.textAlign} center`;

    const lineText = line.text || "•••";

    // Only enable word-by-word rendering if the source actually provided high-fidelity word timings.
    // This stops the inaccurate "guessing/dividing" fallback.
    const hasRealWordTiming = line.words && line.words.length > 0;

    if (settings.wordByWord && hasRealWordTiming) {
      // Need to preserve the actual word timing data instead of just extracting strings
      const wordList = line.words;

      wordList.forEach((word, wi) => {
        const span = document.createElement('span');
        span.className = 'lyric-word lyric-word-upcoming';
        span.textContent = word.text;
        span.dataset.wordIndex = wi;
        el.appendChild(span);
        // Add a space text node between words (except after last)
        if (wi < wordList.length - 1) {
          el.appendChild(document.createTextNode(' '));
        }
      });
    } else {
      el.textContent = lineText;
    }

    if (line.subText) {
      const subEl = document.createElement("div");
      subEl.className = "lyric-subtext";
      subEl.textContent = line.subText;
      subEl.style.fontSize = "0.65em";
      subEl.style.opacity = "0.75";
      subEl.style.marginTop = "6px";
      subEl.style.fontWeight = "400";
      subEl.style.whiteSpace = "pre-line";
      // Prevent the subText from interfering with word-by-word highlights
      subEl.style.pointerEvents = "none";
      el.appendChild(subEl);
    }

    let clickTimer = null;

    // Feature 1: Lyrics Click-to-Seek
    el.addEventListener("click", () => {
      if (!config) return;

      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        return;
      }

      clickTimer = setTimeout(() => {
        clickTimer = null;
        const timeMs = line.timeMs;
        if (config.localMode) {
          lastPollProgress = timeMs;
          lastPollTimestamp = Date.now();
        } else {
          fetch('https://api.spotify.com/v1/me/player/seek?position_ms=' + timeMs, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + config.access_token }
          }).catch(err => console.error("Failed to seek:", err));
        }
        userScrolling = false;
        if (userScrollTimeout) { clearTimeout(userScrollTimeout); userScrollTimeout = null; }
        hideResyncButton();
        scrollLyrics(index);
        setTimeout(pollSpotifyPlayback, 300);
      }, 250);
    });

    // Feature: Customizable Double-Click Action
    el.addEventListener("dblclick", () => {
      if (!config) return;
      const action = settings.dblclickAction || "rewind";

      if (action === "taskbar") {
        settings.taskbarMode = !settings.taskbarMode;
        if (checkTaskbarMode) checkTaskbarMode.checked = settings.taskbarMode;
        applyVisualSettings();
        saveLocalSettings();
      } else if (action === "rewind") {
        const timeMs = Math.max(0, line.timeMs - 10000);
        if (config.localMode) {
          lastPollProgress = timeMs;
          lastPollTimestamp = Date.now();
        } else {
          fetch('https://api.spotify.com/v1/me/player/seek?position_ms=' + timeMs, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + config.access_token }
          }).catch(err => console.error("Failed to seek (rewind):", err));
        }
        setTimeout(pollSpotifyPlayback, 300);
      }
    });

    frag.appendChild(el);
    cachedLineEls.push(el);
  });

  lyricsContainer.appendChild(frag);
  attachAnnotationsToRenderedLyrics();
  measureLyricMetrics();
  activeLineIndex = -1;
  scrollLyrics(0);
  updateAutoHideState();
}

let cachedViewportHeight = 0;
let cachedLineMetrics = [];

function measureLyricMetrics() {
  if (!lyricsViewport || !cachedLineEls || cachedLineEls.length === 0) return;
  const vh = lyricsViewport.clientHeight;
  if (vh <= 0) {
    requestAnimationFrame(measureLyricMetrics);
    return;
  }
  cachedViewportHeight = vh;
  cachedLineMetrics = cachedLineEls.map(el => ({
    top: el.offsetTop,
    height: el.clientHeight || 40
  }));

  // If line 1 still has top 0, layout wasn't ready yet — retry on next frame
  if (cachedLineEls.length > 1 && cachedLineMetrics[1].top === 0) {
    requestAnimationFrame(() => {
      cachedLineMetrics = cachedLineEls.map(el => ({
        top: el.offsetTop,
        height: el.clientHeight || 40
      }));
      if (!userScrolling && activeLineIndex >= 0) {
        const idx = activeLineIndex;
        activeLineIndex = -1;
        scrollLyrics(idx);
      }
    });
  }
}

window.addEventListener('resize', () => {
  measureLyricMetrics();
  if (!userScrolling && activeLineIndex >= 0) {
    const idx = activeLineIndex;
    activeLineIndex = -1;
    scrollLyrics(idx);
  }
});

window.addEventListener('blur', () => {
  document.body.classList.add('window-blurred');
});

window.addEventListener('focus', () => {
  document.body.classList.remove('window-blurred');
  if (isPlaying) ensurePlayheadLoop();
  measureLyricMetrics();
  if (!userScrolling && activeLineIndex >= 0) {
    const idx = activeLineIndex;
    activeLineIndex = -1;
    scrollLyrics(idx);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    document.body.classList.remove('window-blurred');
    if (isPlaying) ensurePlayheadLoop();
    measureLyricMetrics();
    if (!userScrolling && activeLineIndex >= 0) {
      const idx = activeLineIndex;
      activeLineIndex = -1;
      scrollLyrics(idx);
    }
  } else {
    document.body.classList.add('window-blurred');
  }
});

// Highlight and center active lyric line
function scrollLyrics(index) {
  if (index === activeLineIndex) return;
  if (cachedLineEls.length === 0) return;

  // Update classes
  if (activeLineIndex >= 0 && cachedLineEls[activeLineIndex]) {
    cachedLineEls[activeLineIndex].classList.remove("active");
  }

  activeLineIndex = index;

  if (activeLineIndex >= 0 && cachedLineEls[activeLineIndex]) {
    const activeEl = cachedLineEls[activeLineIndex];
    activeEl.classList.add("active");

    // Real-Time Genius Live Meaning sync (only if preview pill is enabled)
    if (settings.showAnnotations !== false && settings.showAnnotationPreview === true && !settings.taskbarMode && !settings.wallpaperMode) {
      if (lyrics[activeLineIndex] && lyrics[activeLineIndex].annotation) {
        showLiveMeaningPill(lyrics[activeLineIndex].annotation);
      } else {
        hideLiveMeaningPill();
      }
    } else {
      hideLiveMeaningPill();
    }

    // If user is manually scrolling, don't auto-scroll
    if (userScrolling) return;

    if (settings.compactMode) {
      lyricsContainer.style.transform = 'none';
      return;
    }

    // Verify metrics validity
    let metric = cachedLineMetrics[activeLineIndex];
    const viewportHeight = (lyricsViewport && lyricsViewport.clientHeight > 0) ? lyricsViewport.clientHeight : (cachedViewportHeight || 400);

    if (!metric || (activeLineIndex > 0 && metric.top === 0) || cachedViewportHeight === 0) {
      measureLyricMetrics();
      metric = cachedLineMetrics[activeLineIndex];
    }

    const offsetTop = (metric && metric.top !== undefined && (metric.top > 0 || activeLineIndex === 0)) ? metric.top : (activeEl.offsetTop || 0);
    const height = (metric && metric.height > 0) ? metric.height : (activeEl.clientHeight || 40);

    // Compute exact center position
    const translateY = Math.round((viewportHeight / 2) - offsetTop - (height / 2));
    lyricsContainer.style.transform = `translateY(${translateY}px)`;
  } else {
    hideLiveMeaningPill();
  }
}


// Global resync playback function: resets user scrolling, hides all sync buttons, and snaps to active line
function resyncPlayback() {
  userScrolling = false;
  if (userScrollTimeout) {
    clearTimeout(userScrollTimeout);
    userScrollTimeout = null;
  }
  hideResyncButton();
  const btnSync = document.getElementById("btn-sync-lyrics");
  if (btnSync) btnSync.style.display = 'none';
  const btnResume = document.getElementById("sync-resume-btn");
  if (btnResume) btnResume.style.display = 'none';

  if (!lyrics || lyrics.length === 0) return;

  const syncProgress = currentProgress + (settings.syncOffsetMs || 0);
  let targetIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].timeMs <= syncProgress) {
      targetIndex = i;
    } else {
      break;
    }
  }
  if (targetIndex === -1) targetIndex = 0;
  activeLineIndex = -1;
  scrollLyrics(targetIndex);
  showToast("Synced to current playback", 1500, 'success');
}

// Re-sync button: appears when user scrolls manually, click to re-enable auto-scroll
function showResyncButton() {
  let btn = document.getElementById('btn-resync-lyrics');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btn-resync-lyrics';
    btn.textContent = '⟳ Sync';
    btn.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      z-index: 9999; padding: 8px 20px; border-radius: 20px;
      background: rgba(29, 185, 84, 0.9); color: white; border: none;
      font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600;
      cursor: pointer; backdrop-filter: blur(10px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transition: opacity 0.3s, transform 0.3s;
      opacity: 0;
    `;
    btn.addEventListener('click', resyncPlayback);
    document.body.appendChild(btn);
  }
  btn.style.opacity = '1';
  btn.style.pointerEvents = 'auto';
}

function hideResyncButton() {
  const btn = document.getElementById('btn-resync-lyrics');
  if (btn) {
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';
  }
}

// State management for throttled RAF playhead loop
let isPlayheadLoopActive = false;
let playheadTimerId = null;

function ensurePlayheadLoop() {
  if (playheadTimerId) {
    clearTimeout(playheadTimerId);
    playheadTimerId = null;
  }
  if (!isPlayheadLoopActive) {
    isPlayheadLoopActive = true;
    if (document.visibilityState !== 'hidden') {
      requestAnimationFrame(updatePlayhead);
    } else {
      playheadTimerId = setTimeout(updatePlayhead, 25);
    }
  }
}

// Tick timer for smooth animations and progress bar fill (RAF during playback, throttled when paused)
function updatePlayhead() {
  isPlayheadLoopActive = true;
  if (playheadTimerId) {
    clearTimeout(playheadTimerId);
    playheadTimerId = null;
  }
  try {
    let previousProgress = currentProgress;
    if (config && isPlaying) {
      const rate = window._currentPlaybackRate || 1.0;
      const elapsed = (Date.now() - lastPollTimestamp) * rate;
      currentProgress = lastPollProgress + elapsed;
    } else {
      currentProgress = lastPollProgress;
    }

    if (currentProgress > trackDuration) {
      currentProgress = trackDuration;
    }

    // Update widget UI progress
    if (config) {
      const fillPercent = trackDuration > 0 ? (currentProgress / trackDuration) * 100 : 0;
      
      // Throttle progress bar visual updates (only update if changed significantly)
      if (Math.abs((window._lastFillPercent || 0) - fillPercent) > 0.1) {
        widgetProgressFill.style.width = `${fillPercent}%`;
        window._lastFillPercent = fillPercent;
      }

      const timeStr = formatTime(currentProgress);
      if (widgetTimeCurrent.textContent !== timeStr) {
        widgetTimeCurrent.textContent = timeStr;
      }

      if (settings.taskbarMode && tbProgress) {
        if (Math.abs((window._lastTbFillPercent || 0) - fillPercent) > 0.1) {
          tbProgress.style.width = `${fillPercent}%`;
          window._lastTbFillPercent = fillPercent;
        }
        sendTaskbarProgress(fillPercent);
      }

      // Update active lyric line based on time
      if (lyrics.length > 0) {
        // Latency Compensation: 0ms fixed offset (removed hardcoded compensation)
        const syncProgress = currentProgress + (settings.syncOffsetMs || 0);

        let activeIndex = -1;
        for (let i = 0; i < lyrics.length; i++) {
          if (lyrics[i].timeMs <= syncProgress) {
            activeIndex = i;
          } else {
            break;
          }
        }

        const isUnsynced = lyrics.length > 0 && lyrics[0].timeMs === 9999999;

        // Anti-Jitter / Hysteresis Protection:
        // When paused or during micro-timing variances, NEVER allow the active line
        // to jitter backwards to a previous line unless an intentional rewind (> 1200ms) occurred.
        if (activeLineIndex >= 0 && activeIndex < activeLineIndex && lyrics[activeLineIndex] && !isUnsynced) {
          const retreatThreshold = lyrics[activeLineIndex].timeMs - 1200;
          if (syncProgress >= retreatThreshold) {
            activeIndex = activeLineIndex;
          }
        }

        // Feature: Show first line immediately before its timestamp arrives
        if (activeIndex === -1 && lyrics.length > 0 && !isUnsynced) {
          activeIndex = 0;
        }

        scrollLyrics(activeIndex);

        // Word-by-Word karaoke highlight
        if (settings.wordByWord && activeIndex >= 0) {
          const activeEl = cachedLineEls[activeIndex];
          const lineData = lyrics[activeIndex];

          if (activeEl && lineData) {
            if (!activeEl._cachedWordSpans) {
              activeEl._cachedWordSpans = activeEl.querySelectorAll('.lyric-word');
            }
            const wordSpans = activeEl._cachedWordSpans;
            // Only process word highlights if spans actually exist (meaning we have real word data)
            if (wordSpans.length > 0 && lineData.words && lineData.words.length > 0) {
              let activeWordIdx = -1;

              for (let i = 0; i < lineData.words.length; i++) {
                if (lineData.words[i].timeMs <= syncProgress) {
                  activeWordIdx = i;
                } else {
                  break;
                }
              }

              // Only update if index changed
              if (activeEl.dataset.activeWord !== String(activeWordIdx)) {
                activeEl.dataset.activeWord = activeWordIdx;
                wordSpans.forEach((span, wi) => {
                  span.classList.toggle('lyric-word-passed', wi < activeWordIdx);
                  span.classList.toggle('lyric-word-active', wi === activeWordIdx);
                  span.classList.toggle('lyric-word-upcoming', wi > activeWordIdx);
                });
              }
            }
          }
        }


        // Update taskbar lyric line in Taskbar Mode
        if (settings.taskbarMode && tbLyricLine) {
          if (isUnsynced) {
            if (tbLyricLine.textContent !== "Unsynced lyrics") {
              tbLyricLine.textContent = "Unsynced lyrics";
              tbLyricLine.dataset.lineIndex = -1;
              sendTaskbarLyric("Unsynced lyrics");
            }
          } else if (lyrics[activeIndex]) {
            const lineData = lyrics[activeIndex];
            const hasRealWordTiming = lineData.words && lineData.words.length > 0;

            if (settings.wordByWord && hasRealWordTiming) {
              // Render word-by-word spans for taskbar if not already rendered for this line
              if (tbLyricLine.dataset.lineIndex !== String(activeIndex)) {
                tbLyricLine.innerHTML = '';
                tbLyricLine.dataset.lineIndex = activeIndex;

                // Use real words from source
                const words = lineData.words.map(w => w.text);

                words.forEach((word, wi) => {
                  const span = document.createElement('span');
                  span.className = 'lyric-word tb-lyric-word';
                  span.textContent = word;
                  tbLyricLine.appendChild(span);
                  if (wi < words.length - 1) {
                    tbLyricLine.appendChild(document.createTextNode(' '));
                  }
                });
                tbLyricLine._cachedWordSpans = null; // Clear cache when rebuilding
              }

              if (!tbLyricLine._cachedWordSpans) {
                tbLyricLine._cachedWordSpans = tbLyricLine.querySelectorAll('.tb-lyric-word');
              }

              // Apply highlight classes to taskbar words
              const wordSpans = tbLyricLine._cachedWordSpans;
              let activeWordIdx = -1;

              for (let i = 0; i < lineData.words.length; i++) {
                if (lineData.words[i].timeMs <= syncProgress) {
                  activeWordIdx = i;
                } else {
                  break;
                }
              }

              if (tbLyricLine.dataset.activeTbWord !== String(activeWordIdx)) {
                tbLyricLine.dataset.activeTbWord = activeWordIdx;
                wordSpans.forEach((span, wi) => {
                  span.classList.toggle('lyric-word-passed', wi < activeWordIdx);
                  span.classList.toggle('lyric-word-active', wi === activeWordIdx);
                  span.classList.toggle('lyric-word-upcoming', wi > activeWordIdx);
                });
                sendTaskbarLyric(tbLyricLine.textContent, false, tbLyricLine.innerHTML);
              }
            } else {
              // Standard full-line mode for taskbar
              let displayText = lineData.text;
              const tbTransMode = settings.tbTranslationMode || 'both';

              if (lineData.subText) {
                const cleanSub = lineData.subText.replace(/\n+/g, ' • ');
                if (tbTransMode === 'translated') {
                  displayText = cleanSub;
                } else if (tbTransMode === 'both') {
                  displayText = `${lineData.text} • ${cleanSub}`;
                }
              }

              if (tbLyricLine.textContent !== displayText) {
                tbLyricLine.textContent = displayText || "•••";
                tbLyricLine.dataset.lineIndex = activeIndex;
                sendTaskbarLyric(displayText || "•••");
              }
            }
          }
          // Width is managed by taskbar_renderer.js via scheduleResize — do NOT call here
        }
      }
    }

    // Last.fm Progress check for scrobbling (throttled to ~1Hz)
    if (window.lastFM && (!window._lastFmCheckTime || (Date.now() - window._lastFmCheckTime > 1000))) {
      window._lastFmCheckTime = Date.now();
      window.lastFM.updatePlaybackProgress(currentProgress, trackDuration);
    }
  } catch (err) {
    console.error("Error in updatePlayhead loop:", err);
  } finally {
    if (isPlaying) {
      if (document.visibilityState !== 'hidden') {
        requestAnimationFrame(updatePlayhead);
      } else {
        // Window is hidden (e.g. Taskbar Mode)! rAF is suspended by Chromium/WebView2 when hidden.
        // Use high-frequency setTimeout so taskbar lyrics and playhead continue running smoothly!
        playheadTimerId = setTimeout(updatePlayhead, 25);
      }
    } else {
      isPlayheadLoopActive = false;
    }
  }
}

document.addEventListener("visibilitychange", () => {
  if (isPlaying) {
    ensurePlayheadLoop();
  }
});



// Control Spotify Playback
async function controlPlayback(action, _retried = false) {
  // Optimistic UI toggle for instant user feedback
  if (action === 'play-pause') {
    if (isPlaying) {
      isPlaying = false;
      lastPollProgress = currentProgress;
      lastPollTimestamp = Date.now();
      if (btnPlaySvg) btnPlaySvg.style.display = 'block';
      if (btnPauseSvg) btnPauseSvg.style.display = 'none';
      handleTaskbarPauseAutoHide(true);
      updateAutoHideState();
    } else {
      isPlaying = true;
      lastPollProgress = currentProgress;
      lastPollTimestamp = Date.now();
      if (btnPlaySvg) btnPlaySvg.style.display = 'none';
      if (btnPauseSvg) btnPauseSvg.style.display = 'block';
      ensurePlayheadLoop();
      handleTaskbarPauseAutoHide(false);
      updateAutoHideState();
    }
  }

  // If in local mode, missing config, or no access token available, use local OS/Spotify controls directly
  if (!config || config.localMode || !config.access_token) {
    if (window.electronAPI && window.electronAPI.triggerLocalPlaybackControl) {
      window.electronAPI.triggerLocalPlaybackControl(action);
    }
    setTimeout(pollSpotifyPlayback, 120);
    return;
  }

  let url = '';
  let method = 'POST';

  if (action === 'previous') {
    url = 'https://api.spotify.com/v1/me/player/previous';
  } else if (action === 'next') {
    url = 'https://api.spotify.com/v1/me/player/next';
  } else if (action === 'play-pause') {
    // Note: isPlaying was already flipped above for optimistic UI
    url = isPlaying
      ? 'https://api.spotify.com/v1/me/player/play'
      : 'https://api.spotify.com/v1/me/player/pause';
    method = 'PUT';
  }

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        "Authorization": `Bearer ${config.access_token}`
      }
    });

    if (res.ok) {
      setTimeout(pollSpotifyPlayback, 250);
      return;
    }

    // 401: Token expired, attempt refresh once
    if (res.status === 401 && !_retried) {
      if (config.refresh_token) {
        try {
          config.access_token = await window.electronAPI.refreshToken();
        } catch (e) {
          console.warn("Token refresh failed during playback control:", e);
        }
      } else if (config.sp_dc) {
        try {
          config.access_token = await window.electronAPI.getAccessToken(config.sp_dc);
        } catch (e) {}
      }

      if (config.access_token) {
        return controlPlayback(action, true);
      }
    }

    // If Spotify Web API failed (e.g. 403 Premium Required, 404 No Active Connect Device, or 401 retry failed):
    // Fall back to native local playback control immediately so playback is never blocked!
    if (window.electronAPI && window.electronAPI.triggerLocalPlaybackControl) {
      window.electronAPI.triggerLocalPlaybackControl(action);
    }
    setTimeout(pollSpotifyPlayback, 200);
  } catch (err) {
    console.warn("Playback control network error, falling back to local control:", err);
    if (window.electronAPI && window.electronAPI.triggerLocalPlaybackControl) {
      window.electronAPI.triggerLocalPlaybackControl(action);
    }
    setTimeout(pollSpotifyPlayback, 200);
  }
}

// Query and monitor taskbar accent colors and light/dark theme contrast
let taskbarColorPollInterval = null;
async function updateTaskbarColors() {
  if (!settings.taskbarMode || !config) {
    if (taskbarColorPollInterval) {
      clearInterval(taskbarColorPollInterval);
      taskbarColorPollInterval = null;
    }
    return;
  }

  try {
    const taskbarSettings = await window.electronAPI.getTaskbarColor();
    if (taskbarSettings) {
      // Set text color on taskbar container
      document.documentElement.style.setProperty('--taskbar-text-color', taskbarSettings.color);

      // Determine accent color
      const accent = taskbarSettings.accentColor || '#1DB954';
      document.documentElement.style.setProperty('--taskbar-accent-color', accent);

      if (taskbarSettings.theme === 'light') {
        document.body.classList.add("taskbar-mode-light");
      } else {
        document.body.classList.remove("taskbar-mode-light");
      }
    }
  } catch (err) {
    console.error("Failed to query taskbar settings:", err);
  }

  if (!taskbarColorPollInterval) {
    taskbarColorPollInterval = setInterval(updateTaskbarColors, 60000); // 60s
  }
}

async function fetchFallbackAlbumArt(trackName, artistName) {
  if (!trackName) return null;
  const rawArtist = (artistName || "").replace(/\s*-\s*Topic$/i, "").trim();
  const rawTrack = trackName.trim();

  // Instant dual-key cache lookup (0ms)
  const dualKey = `${rawArtist}:::${rawTrack}`.toLowerCase().trim();
  if (localArtCache[dualKey] && localArtCache[dualKey] !== 'fetching' && localArtCache[dualKey] !== 'notfound') {
    return localArtCache[dualKey];
  }

  // Clean title: strip feature tags, parentheticals, and remaster tags
  const cleanTrack = rawTrack
    .replace(/\s*[\(\[](feat\.|ft\.|with|remix|version|deluxe|explicit|remastered|bonus).*?[\)\]]/ig, "")
    .replace(/\s*-\s*(feat\.|ft\.|with|remix|version|deluxe|explicit|remastered|bonus).*$/ig, "")
    .replace(/\s*\(.*?\)/g, "")
    .trim() || rawTrack;

  const cleanArtist = rawArtist
    .replace(/\s*[\(\[](feat\.|ft\.|with).*?[\)\]]/ig, "")
    .replace(/\s*,\s*.*$/, "")
    .trim() || rawArtist;

  // Native Rust query (runs iTunes + Deezer concurrently in Rust without browser CORS)
  const queryNative = async (t, a) => {
    if (window.electronAPI && typeof window.electronAPI.fetchTrackArtwork === 'function') {
      const nativeArt = await window.electronAPI.fetchTrackArtwork(t, a);
      if (nativeArt) return nativeArt;
    }
    throw new Error('Native not found');
  };

  // Fast helper with strict 1.8s timeout
  const queryItunes = async (queryStr) => {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(queryStr)}&limit=1&entity=song`;
      const res = await fetch(url, { signal: AbortSignal.timeout(1800) });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const raw = data.results[0].artworkUrl100 || data.results[0].artworkUrl60;
          if (raw) {
            return raw.replace(/\/\d+x\d+bb?\.(jpg|png|webp)/i, '/600x600bb.$1');
          }
        }
      }
    } catch (e) {}
    throw new Error('iTunes not found');
  };

  // Helper to query Deezer API with strict 1.8s timeout
  const queryDeezer = async (queryStr) => {
    try {
      const url = `https://api.deezer.com/search?q=${encodeURIComponent(queryStr)}&limit=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(1800) });
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const cover = data.data[0].album?.cover_xl || data.data[0].album?.cover_big || data.data[0].album?.cover_medium;
          if (cover) return cover;
        }
      }
    } catch (e) {}
    throw new Error('Deezer not found');
  };

  // Helper to query MusicBrainz
  const queryMusicBrainz = async (queryStr) => {
    try {
      const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(queryStr)}&fmt=json`;
      const res = await fetch(url, { headers: { 'User-Agent': 'LyricFlow/1.3.0 (contact@lyricflow.app)' }, signal: AbortSignal.timeout(1800) });
      if (res.ok) {
        const data = await res.json();
        if (data.recordings && data.recordings.length > 0) {
          for (const rec of data.recordings.slice(0, 3)) {
            const relId = rec.releases?.[0]?.id;
            if (relId) {
              return `https://coverartarchive.org/release/${relId}/front-500`;
            }
          }
        }
      }
    } catch (e) {}
    throw new Error('MusicBrainz not found');
  };

  // Helper to query Last.fm API with strict 1.8s timeout
  const queryLastFM = async (trackStr, artistStr) => {
    try {
      if (window.lastFM && typeof window.lastFM.getTrackAlbumArt === 'function') {
        const art = await Promise.race([
          window.lastFM.getTrackAlbumArt(trackStr, artistStr),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1800))
        ]);
        if (art) return art;
      }
    } catch (e) {}
    throw new Error('Last.fm not found');
  };

  try {
    // If user explicitly configured Last.fm as fallback source, try it first
    if (settings.artSource === 'lastfm') {
      try {
        const lfmArt = await queryLastFM(cleanTrack, cleanArtist);
        if (lfmArt) {
          saveArtToCache(null, lfmArt, rawTrack, rawArtist);
          return lfmArt;
        }
      } catch (e) {}
    }

    // Run ALL providers simultaneously in parallel — fastest response wins immediately!
    const candidates = [
      queryNative(cleanTrack, cleanArtist),
      queryItunes(`${cleanTrack} ${cleanArtist}`),
      queryDeezer(`${cleanTrack} ${cleanArtist}`),
      queryLastFM(cleanTrack, cleanArtist)
    ];

    if (cleanTrack !== rawTrack || cleanArtist !== rawArtist) {
      candidates.push(queryNative(rawTrack, rawArtist));
      candidates.push(queryItunes(`${rawTrack} ${rawArtist}`));
      candidates.push(queryDeezer(`${rawTrack} ${rawArtist}`));
    }

    try {
      const fastest = await Promise.any(candidates);
      if (fastest) {
        saveArtToCache(null, fastest, rawTrack, rawArtist);
        return fastest;
      }
    } catch (e) {
      // Primary batch failed, try single track search + MusicBrainz
      try {
        const fallback = await Promise.any([
          queryItunes(cleanTrack),
          queryLastFM(cleanTrack, cleanArtist),
          queryMusicBrainz(`${cleanTrack} ${cleanArtist}`)
        ]);
        if (fallback) {
          saveArtToCache(null, fallback, rawTrack, rawArtist);
          return fallback;
        }
      } catch (e2) {}
    }
  } catch (err) {
    console.error("Failed to fetch fallback album art:", err);
  }
  return null;
}

// --- Last.fm UI Helpers ---
function updateLastfmUI() {
  if (window.lastFM && window.lastFM.isConnected()) {
    if (lastfmSetupDiv) lastfmSetupDiv.style.display = "none";
    if (lastfmWaitingDiv) lastfmWaitingDiv.style.display = "none";
    if (lastfmConnectedDiv) lastfmConnectedDiv.style.display = "flex";
    if (lastfmAccountStatus) {
      lastfmAccountStatus.textContent = window.lastFM.username
        ? `Connected as ${window.lastFM.username}`
        : "Connected to Last.fm";
    }
    if (checkLastfmScrobble) checkLastfmScrobble.checked = window.lastFM.isScrobblingEnabled;
    if (btnLoveTrack) btnLoveTrack.style.display = "flex";
  } else {
    if (lastfmSetupDiv) lastfmSetupDiv.style.display = "flex";
    if (lastfmWaitingDiv) lastfmWaitingDiv.style.display = "none";
    if (lastfmConnectedDiv) lastfmConnectedDiv.style.display = "none";
    if (btnLoveTrack) btnLoveTrack.style.display = "none";
  }
}

// --- Spotify UI Helpers ---
function isSpotifyConnected() {
  return Boolean(config && !config.localMode && (config.sp_dc || config.access_token || config.refresh_token));
}

async function checkAndVerifySpotifyConnection() {
  if (!config || config.localMode || (!config.sp_dc && !config.access_token && !config.refresh_token)) {
    window._spotifyUserDisplayName = null;
    return false;
  }

  try {
    if (!config.access_token && config.sp_dc) {
      config.access_token = await window.electronAPI.getAccessToken(config.sp_dc);
      if (config.access_token) {
        window.electronAPI.saveConfig(config);
      }
    }

    if (config.access_token) {
      const res = await fetch("https://api.spotify.com/v1/me", {
        headers: { "Authorization": `Bearer ${config.access_token}` },
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const profile = await res.json();
        if (profile) {
          window._spotifyUserDisplayName = profile.display_name || profile.id || null;
          return true;
        }
      } else if (res.status === 401) {
        let newToken = null;
        if (config.refresh_token) {
          try {
            newToken = await window.electronAPI.refreshToken();
          } catch (e) {}
        } else if (config.sp_dc) {
          try {
            newToken = await window.electronAPI.getAccessToken(config.sp_dc);
          } catch (e) {}
        }

        if (newToken) {
          config.access_token = newToken;
          window.electronAPI.saveConfig(config);
          const retryRes = await fetch("https://api.spotify.com/v1/me", {
            headers: { "Authorization": `Bearer ${config.access_token}` },
            signal: AbortSignal.timeout(5000)
          });
          if (retryRes.ok) {
            const profile = await retryRes.json();
            if (profile) {
              window._spotifyUserDisplayName = profile.display_name || profile.id || null;
              return true;
            }
          }
        }
      }
    }
  } catch (err) {
    if (config.access_token || config.sp_dc) {
      return true;
    }
  }

  return Boolean(config && !config.localMode && (config.sp_dc || config.access_token));
}

function updateSpotifyUI() {
  const isConnected = isSpotifyConnected();

  if (spotifySetupDiv) {
    spotifySetupDiv.style.display = isConnected ? "none" : "flex";
  }
  if (spotifyConnectedDiv) {
    spotifyConnectedDiv.style.display = isConnected ? "flex" : "none";
  }
  if (spotifyAccountStatus) {
    if (window._spotifyUserDisplayName) {
      spotifyAccountStatus.textContent = `Connected as ${window._spotifyUserDisplayName}`;
    } else {
      spotifyAccountStatus.textContent = "Connected to Spotify";
    }
  }
}

window.updateLoveButtonUI = function(isLoved) {
  if (isLoved) {
    if (svgLoveUnfilled) svgLoveUnfilled.style.display = "none";
    if (svgLoveFilled) svgLoveFilled.style.display = "block";
  } else {
    if (svgLoveUnfilled) svgLoveUnfilled.style.display = "block";
    if (svgLoveFilled) svgLoveFilled.style.display = "none";
  }
};

window.updatePlaycountUI = function(playcount) {
  if (widgetPlaycount) {
    if (playcount > 0) {
      widgetPlaycount.textContent = `Listened ${playcount} times`;
      widgetPlaycount.style.display = "block";
    } else {
      widgetPlaycount.style.display = "none";
    }
  }

  if (window.electronAPI && window.electronAPI.updateNextUpPlaycount) {
    window.electronAPI.updateNextUpPlaycount(playcount);
  }
};

window.onLastfmArtFound = function(artUrl) {
  if (!artUrl) return;
  if (!widgetAlbumArt.src || widgetAlbumArt.style.display === 'none' || widgetAlbumArt.src.includes('data:image')) {
    widgetAlbumArt.src = artUrl;
    widgetAlbumArt.style.display = "block";
    if (widgetArtFallback) widgetArtFallback.style.display = "none";
    setWallpaperAlbumArt(artUrl);
    if (currentTrackId) {
      saveArtToCache(currentTrackId, artUrl);
    }
  }
};

