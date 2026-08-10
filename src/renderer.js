
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
let btnNews, btnNewsClose, newsPanel, newsBody, inputNewsFilter;
let selectFontSize, valFontSize, selectAlign, sliderBgOpacity, valBgOpacity, sliderGlow, valGlow;
let selectFont, sliderLineSpacing, valLineSpacing, checkShowWidget, selectHighlightColor, selectDblclickAction;
let appContainer, ambientGlow, hudHeader, playbackWidget;
let toastNotification, historyContainer;
let searchOverlay, inputSearchLyrics, searchResultsInfo, inputSyncOffset, btnResetOffset;
let btnLoveTrack, svgLoveUnfilled, svgLoveFilled, btnLastfmConnect, lastfmConnectedDiv, checkLastfmScrobble, btnLastfmDisconnect, lastfmSetupDiv;

// Playback & Taskbar Mode controls DOM
let btnPrev, btnPlayPause, btnNext, btnPlaySvg, btnPauseSvg, btnShareLyric, btnSleepTimer, sleepTimerBadge;
let checkTaskbarMode, taskbarContainer, tbLyricLine, checkFullscreenLyrics, checkEdgeGlow, checkWallpaperMode;
let selectWallpaperStyle;
let sliderOverlayX, valOverlayX, sliderOverlayY, valOverlayY, sliderOverlayWidth, valOverlayWidth, selectWallpaperFontSize;
let settingOverlayXRow, settingOverlayYRow, settingOverlayWidthRow, settingOverlayPosRow, settingWallpaperFontSizeRow, previewCanvas, previewBox;
let selectTbAlign, selectTbTranslation, sliderTbOffset, valTbOffset, settingTbAlignRow, settingTbTranslationRow, settingTbOffsetRow;
let checkAutoLaunch, sliderTbFontsize, valTbFontsize, settingTbFontsizeRow, tbProgress, settingFsLyricsRow;
let checkShowNextUp, checkShowGenius, selectGeniusPosition;
let customBgVideo, customBgImg, wallpaperAlbumBg, inputBgFile, btnPickBg, btnClearBg, labelBgFilename;
let wallpaperStyleArt, wallpaperArtFallback, wallpaperTrackTitle, wallpaperTrackArtist;
let geniusFactCard, geniusFactContent;
let geniusFactInterval;
let geniusFactChunks = [];
let geniusFactIndex = 0;
let activeNewsFilter = "";

// App State
let config = null;
let settings = {
  fontSize: 32,
  textAlign: 'center',
  bgOpacity: 0,
  glowIntensity: 60,
  fontFamily: 'Outfit',
  lineSpacing: 1.1,
  showWidget: true,
  highlightColor: '#1DB954',
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
  tbAlign: 'center',
  tbTranslation: 'none',
  tbOffset: 0,
  tbFontsize: 14,
  fullscreenLyrics: false,
  edgeGlow: false,
  autoLaunch: false,
  showNextUp: false,
  showGenius: false,
  geniusPosition: 'top',
  discordRpc: false,
  syncOffsetMs: 0,
  trackOffsets: {},
  lastfmScrobble: false,
  skipLang: 'en'
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
let lastSentTaskbarMode = null;
let lastSentWallpaperMode = null;
let _lastSyncedTaskbarMode = null;
let _lastSyncedFullscreen = null;
let localArtCache = {};

// Click-Through State Management
function setClickThroughCached(state) {
  if (state === clickThroughState) return;
  clickThroughState = state;
  window.electronAPI.setClickThrough(state);
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
    window.electronAPI.syncTaskbarConfig({
      taskbarOffset: settings.taskbarOffset || 0,
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


window.addEventListener("DOMContentLoaded", async () => {
  // Initialize DOM queries
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

  // Manual scroll detection: when user scrolls with mousewheel, pause auto-scroll
  if (lyricsViewport) {
    lyricsViewport.addEventListener('wheel', (e) => {
      if (settings.taskbarMode || settings.compactMode) return;
      if (lyrics.length === 0) return;
      
      userScrolling = true;
      showResyncButton();
      
      // Move the lyrics container manually
      const currentTransform = lyricsContainer.style.transform;
      const match = currentTransform.match(/translateY\((.+?)px\)/);
      const currentY = match ? parseFloat(match[1]) : 0;
      const delta = -e.deltaY;
      lyricsContainer.style.transform = `translateY(${currentY + delta}px)`;
      
      // Clear any previous auto-resync timeout
      if (userScrollTimeout) clearTimeout(userScrollTimeout);
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

  btnPrev = document.getElementById("btn-prev");
  btnPlayPause = document.getElementById("btn-play-pause");
  btnNext = document.getElementById("btn-next");
  btnPlaySvg = document.getElementById("svg-play");
  btnPauseSvg = document.getElementById("svg-pause");
  btnShareLyric = document.getElementById("btn-share-lyric");
  btnSleepTimer = document.getElementById("btn-sleep-timer");
  sleepTimerBadge = document.getElementById("sleep-timer-badge");
  checkAlwaysOnTop = document.getElementById("check-always-on-top");
  btnMinimize = document.getElementById("btn-minimize");
  btnSettings = document.getElementById("btn-settings");
  btnClose = document.getElementById("btn-close");
  btnSettingsClose = document.getElementById("btn-settings-close");
  settingsPanel = document.getElementById("settings-panel");
  btnLogout = document.getElementById("btn-logout");

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



  selectFontSize = document.getElementById("select-font-size");
  // valFontSize is no longer needed but leaving variable to avoid breaking anything
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
  geniusFactCard = document.getElementById("genius-fact-card");
  geniusFactContent = document.getElementById("genius-fact-content");
  checkLastfmScrobble = document.getElementById("check-lastfm-scrobble");
  btnLastfmDisconnect = document.getElementById("btn-lastfm-disconnect");

  renderHistory();

  // Load settings from local storage
  loadLocalSettings();
  setupUIHandlers();

  // Check if config exists in Electron main process
  try {
    config = await window.electronAPI.loadConfig();
    if (config) {
      showLyricsScreen();
    } else {
      showLoginScreen();
    }
  } catch (err) {
    console.error("Failed to load config:", err);
    showLoginScreen();
  }

  // Start the frame-perfect loop
  requestAnimationFrame(updatePlayhead);
});

// Load settings from localStorage
function loadLocalSettings() {
  const saved = localStorage.getItem("lyrics_overlay_settings");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      settings = { ...settings, ...parsed };
      
      // FORCE firstRun to true so the user can see the new window
      settings.firstRun = true;
      
      // Force taskbarMode, wallpaperMode, and alwaysOnTop to false on startup so it always opens as a normal window
      if (settings.taskbarMode) {
        settings.taskbarMode = false;
      }
      if (settings.wallpaperMode) {
        settings.wallpaperMode = false;
      }
      settings.alwaysOnTop = false;
      saveLocalSettings();
    } catch (e) {
      console.error("Error parsing settings:", e);
    }
  }

  // Apply visual settings
  applyVisualSettings();
}

let _saveDebounceTimer = null;
function saveLocalSettings() {
  if (_saveDebounceTimer) clearTimeout(_saveDebounceTimer);
  _saveDebounceTimer = setTimeout(() => {
    localStorage.setItem("lyrics_overlay_settings", JSON.stringify(settings));
  }, 150);
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

function applyVisualSettings(fromTray = false) {
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
    settings.customBgSrc = `file:///${settings.customBg.replace(/\\/g, "/")}`;
    settings.customBgType = isVideo ? "video" : "image";
    settings.customBgName = settings.customBg.split(/[\\/]/).pop();
    delete settings.customBg; // Migrate away from old key
    saveLocalSettings();
  }
  
  if (settings.customBgSrc) {
    if (settings.customBgSrc.startsWith('lyricflow-media://local/')) {
      settings.customBgSrc = settings.customBgSrc.replace('lyricflow-media://local/', 'file:///');
      saveLocalSettings();
    } else if (settings.customBgSrc.startsWith('lyricflow-media:///')) {
      settings.customBgSrc = settings.customBgSrc.replace('lyricflow-media:///', 'file:///');
      saveLocalSettings();
    }
  }
  
  if (settings.customBgSrc && settings.customBgType) {
    if (labelBgFilename) labelBgFilename.textContent = settings.customBgName || "Selected File";
    if (btnClearBg) btnClearBg.style.display = "block";
    
    // Make body opaque so custom bg doesn't merge with desktop/other apps
    document.body.style.backgroundColor = '#000';
    
    // Hide ambient glow when custom bg is active
    const glowDiv = document.querySelector('.ambient-glow');
    if (glowDiv) glowDiv.style.opacity = '0';

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

  const wStyle = settings.wallpaperStyle || 'style1';
  const hasCustomBackground = Boolean(settings.customBgSrc && settings.customBgType && wStyle !== 'style2');

  if (settings.wallpaperMode) {
    if (screenLyrics) screenLyrics.style.display = "flex";
    if (screenLogin) screenLogin.style.display = "none";
  }

  document.body.classList.toggle("wallpaper-mode", settings.wallpaperMode === true);
  document.body.classList.toggle("wallpaper-style-1", settings.wallpaperMode && wStyle === 'style1');
  document.body.classList.toggle("wallpaper-style-2", settings.wallpaperMode && wStyle === 'style2');
  document.body.classList.toggle("wallpaper-style-3", settings.wallpaperMode && wStyle === 'style3');
  document.body.classList.toggle("custom-bg-active", settings.wallpaperMode && hasCustomBackground);
  if (appContainer) appContainer.classList.toggle("wallpaper-mode", settings.wallpaperMode === true);

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
  document.documentElement.style.setProperty('--glow-intensity', settings.glow / 100);
  if (sliderGlow) sliderGlow.value = settings.glow;
  if (valGlow) valGlow.textContent = `${settings.glow}%`;

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
  const glowInt = settings.glow / 100;

  if (settings.highlightColor === 'dynamic') {
    colorVal = 'var(--art-color-1)';
    glowColor = `rgba(var(--art-color-1-rgb, 167, 139, 250), ${glowInt})`;
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
  if (checkWallpaperMode) checkWallpaperMode.checked = settings.wallpaperMode || false;
  if (selectWallpaperStyle) selectWallpaperStyle.value = settings.wallpaperStyle || 'style1';

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
    document.body.classList.add("taskbar-mode");
    if (appContainer) appContainer.classList.add("taskbar-mode");
    if (taskbarContainer) taskbarContainer.style.display = "flex";

    // Hide standard screen containers
    if (screenLyrics) screenLyrics.style.display = "none";
    if (screenLogin) screenLogin.style.display = "none";

    // Show settings row details
    if (settings.taskbarMode) {
      if (settingTbAlignRow) settingTbAlignRow.style.display = 'flex';
      if (settingTbTranslationRow) settingTbTranslationRow.style.display = 'flex';
      if (settingTbOffsetRow) settingTbOffsetRow.style.display = 'flex';
      if (settingTbFontsizeRow) settingTbFontsizeRow.style.display = 'flex';
      if (settingFsLyricsRow) settingFsLyricsRow.style.display = 'flex';
    }

    // Only send IPC if the mode actually changed to avoid hide/show cycles
    if (lastSentTaskbarMode !== true) {
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
    if (lastSentTaskbarMode !== false) {
      lastSentTaskbarMode = false;
      window.electronAPI.setTaskbarMode(false, fromTray);
    }
    if (checkTaskbarMode) checkTaskbarMode.checked = false;
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

  // Sync tray state (only if changed)
  if (settings.taskbarMode !== _lastSyncedTaskbarMode) {
    _lastSyncedTaskbarMode = settings.taskbarMode;
    window.electronAPI.syncTaskbarModeState(settings.taskbarMode);
  }

  if ((settings.wallpaperMode || false) !== lastSentWallpaperMode) {
    lastSentWallpaperMode = settings.wallpaperMode || false;
    window.electronAPI.setWallpaperMode(lastSentWallpaperMode);
  }

  if (settings.alwaysOnTop !== window._lastSyncedAlwaysOnTop) {
    window._lastSyncedAlwaysOnTop = settings.alwaysOnTop;
    window.electronAPI.setAlwaysOnTop(settings.alwaysOnTop || false);
  }

  // Sync fullscreen preference to main process (only if changed)
  if ((settings.fullscreenLyrics || false) !== _lastSyncedFullscreen) {
    _lastSyncedFullscreen = settings.fullscreenLyrics || false;
    window.electronAPI.setFullscreenLyrics(settings.fullscreenLyrics || false);
  }

  // Update Edge Glow Window
  if (checkEdgeGlow) checkEdgeGlow.checked = settings.edgeGlow || false;
  
  const edgeGlowColor = document.documentElement.style.getPropertyValue('--art-color-1') || '#1DB954';
  const edgeGlowState = `${settings.edgeGlow}_${edgeGlowColor}`;
  if (window._lastSyncedEdgeGlow !== edgeGlowState) {
    window._lastSyncedEdgeGlow = edgeGlowState;
    window.electronAPI.setEdgeGlow(settings.edgeGlow || false, edgeGlowColor);
  }

  if (inputSyncOffset) inputSyncOffset.value = settings.syncOffsetMs || 0;

  applyGeniusPosition();
}

function applyGeniusPosition() {
  if (!geniusFactCard) return;
  const pos = settings.geniusPosition || 'top-left';

  // Reset all positional inline styles
  geniusFactCard.style.top = '';
  geniusFactCard.style.bottom = '';
  geniusFactCard.style.left = '';
  geniusFactCard.style.right = '';

  if (pos === 'top-left') {
    geniusFactCard.style.top = '60px';
    geniusFactCard.style.left = '20px';
  } else if (pos === 'top-right') {
    geniusFactCard.style.top = '60px';
    geniusFactCard.style.right = '20px';
  } else if (pos === 'bottom-left') {
    geniusFactCard.style.bottom = '120px';
    geniusFactCard.style.left = '20px';
  } else if (pos === 'bottom-right') {
    geniusFactCard.style.bottom = '120px';
    geniusFactCard.style.right = '20px';
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
  const obCardWallpaper = document.getElementById('ob-card-wallpaper');
  const obCardTaskbar = document.getElementById('ob-card-taskbar');
  const obCardStandard = document.getElementById('ob-card-standard');
  const obCardStyle1 = document.getElementById('ob-card-style1');
  const obCardStyle2 = document.getElementById('ob-card-style2');
  const obCardStyle3 = document.getElementById('ob-card-style3');
  
  const btnNextPage = document.getElementById('btn-next-onboarding');
  const btnFinish1 = document.getElementById('btn-finish-onboarding-1');
  const btnFinish2 = document.getElementById('btn-finish-onboarding-2');
  const btnBack = document.getElementById('btn-back-onboarding');

  if (obPage1 && obPage2 && obCardWallpaper && obCardTaskbar && obCardStandard) {
    let pickedMode = null;
    let pickedStyle = null;
    
    const updateModeSelection = (mode, selectedElem) => {
      [obCardWallpaper, obCardTaskbar, obCardStandard].forEach(el => el.classList.remove('selected'));
      selectedElem.classList.add('selected');
      pickedMode = mode;
      
      if (mode === 'wallpaper') {
        btnNextPage.style.display = 'block';
        btnFinish1.style.display = 'none';
        
        // Use timeout to allow display:block to render before fading in
        setTimeout(() => {
          btnNextPage.style.opacity = '1';
          btnNextPage.style.pointerEvents = 'auto';
        }, 10);
      } else {
        btnNextPage.style.display = 'none';
        btnFinish1.style.display = 'block';
        
        setTimeout(() => {
          btnFinish1.style.opacity = '1';
          btnFinish1.style.pointerEvents = 'auto';
        }, 10);
      }
    };

    const updateStyleSelection = (style, selectedElem) => {
      [obCardStyle1, obCardStyle2, obCardStyle3].forEach(el => el.classList.remove('selected'));
      selectedElem.classList.add('selected');
      pickedStyle = style;
      btnFinish2.style.opacity = '1';
      btnFinish2.style.pointerEvents = 'auto';
    };

    obCardStandard.addEventListener('click', () => updateModeSelection('standard', obCardStandard));
    obCardWallpaper.addEventListener('click', () => updateModeSelection('wallpaper', obCardWallpaper));
    obCardTaskbar.addEventListener('click', () => updateModeSelection('taskbar', obCardTaskbar));
    
    if (obCardStyle1) obCardStyle1.addEventListener('click', () => updateStyleSelection('style1', obCardStyle1));
    if (obCardStyle2) obCardStyle2.addEventListener('click', () => updateStyleSelection('style2', obCardStyle2));
    if (obCardStyle3) obCardStyle3.addEventListener('click', () => updateStyleSelection('style3', obCardStyle3));

    // Next Button (Transition to Page 2)
    btnNextPage.addEventListener('click', () => {
      obPage1.style.opacity = '0';
      setTimeout(() => {
        obPage1.style.display = 'none';
        obPage2.style.display = 'flex';
        setTimeout(() => {
          obPage2.style.opacity = '1';
        }, 50);
      }, 300);
    });

    // Back Button (Transition to Page 1)
    btnBack.addEventListener('click', () => {
      obPage2.style.opacity = '0';
      setTimeout(() => {
        obPage2.style.display = 'none';
        obPage1.style.display = 'flex';
        setTimeout(() => {
          obPage1.style.opacity = '1';
        }, 50);
      }, 300);
    });

    const finalizeSetup = () => {
      if (pickedMode === 'wallpaper') {
        settings.wallpaperMode = true;
        settings.taskbarMode = false;
        settings.wallpaperStyle = pickedStyle || 'style3';
      } else if (pickedMode === 'taskbar') {
        settings.taskbarMode = true;
        settings.wallpaperMode = false;
      } else if (pickedMode === 'standard') {
        settings.wallpaperMode = false;
        settings.taskbarMode = false;
      }
      
      settings.firstRun = false;
      saveLocalSettings();
      
      const screenOnboarding = document.getElementById('screen-onboarding');
      if (screenOnboarding) {
        screenOnboarding.classList.remove("active");
        screenOnboarding.style.display = "none";
      }
      
      applyVisualSettings();
      
      if (screenLyrics) {
        screenLyrics.style.display = 'flex';
        screenLyrics.classList.add('active');
      }
      
      // Auto-open settings on first run so they can adjust font size/etc
      if (settingsPanel) settingsPanel.classList.add("open");
    };

    btnFinish1.addEventListener('click', finalizeSetup);
    btnFinish2.addEventListener('click', finalizeSetup);
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
    btnLocalMode.addEventListener("click", async () => {
      config = { localMode: true };
      try {
        await window.electronAPI.saveConfig(config);
        showLyricsScreen();
      } catch (err) {
        console.error("Failed to save local mode config:", err);
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

      if (toastNotification) {
        toastNotification.textContent = "Lyrics hidden. They will not show again for this song.";
        toastNotification.classList.add("show");
        setTimeout(() => toastNotification.classList.remove("show"), 3000);
      }
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

        if (toastNotification) {
          toastNotification.textContent = "Spotify SP_DC Cookie Saved!";
          toastNotification.classList.add("show");
          setTimeout(() => toastNotification.classList.remove("show"), 2000);
        }
      }
    });
  }

  // Discord RPC
  const checkDiscordRpc = document.getElementById("check-discord-rpc");
  if (checkDiscordRpc) {
    checkDiscordRpc.checked = settings.discordRpc || false;
    checkDiscordRpc.addEventListener("change", (e) => {
      settings.discordRpc = e.target.checked;
      saveLocalSettings();
      if (settings.discordRpc) {
        window.electronAPI.initDiscordRpc('383226320970055681');
      } else {
        window.electronAPI.updateDiscordRpc({ clear: true });
      }
    });
    // Auto init on startup if enabled
    if (settings.discordRpc) {
      window.electronAPI.initDiscordRpc('383226320970055681');
    }
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
          const isVideo = filePath.endsWith(".mp4") || filePath.endsWith(".webm");
          const fileSrc = `file:///${filePath.replace(/\\/g, "/")}`;
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

  if (sliderGlow) {
    sliderGlow.addEventListener("input", (e) => {
      settings.glow = parseInt(e.target.value, 10);
      applyVisualSettings();
      saveLocalSettings();
    });
  }

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
      settings.taskbarOffset = parseInt(e.target.value, 10);
      applyVisualSettings();
      saveLocalSettings();
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



  // Playback Control button listeners
  if (btnPrev) btnPrev.addEventListener("click", () => controlPlayback('previous'));
  if (btnPlayPause) btnPlayPause.addEventListener("click", () => controlPlayback('play-pause'));
  if (btnNext) btnNext.addEventListener("click", () => controlPlayback('next'));
  

  // Offline Cache Manager Handlers
  const btnCacheTopTracks = document.getElementById("btn-cache-top-tracks");
  const btnClearCache = document.getElementById("btn-clear-cache");
  const cacheStatus = document.getElementById("cache-manager-status");

  if (btnClearCache) {
    btnClearCache.addEventListener("click", () => {
      clearLyricsCaches();
      if (cacheStatus) {
        cacheStatus.style.display = "block";
        cacheStatus.style.color = "#1DB954";
        cacheStatus.textContent = "Cache cleared successfully.";
        setTimeout(() => { cacheStatus.style.display = "none"; }, 3000);
      }
    });
  }

  if (btnCacheTopTracks) {
    btnCacheTopTracks.addEventListener("click", () => {
      startPreCacheRoutine();
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

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      if (confirm("Disconnect your Spotify account? This will close the lyrics display.")) {
        try {
          await window.electronAPI.resetConfig();
          config = null;
          if (settingsPanel) settingsPanel.classList.remove("open");
          showLoginScreen();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  // Last.fm Integration UI Handlers
  if (btnLastfmConnect) {
    btnLastfmConnect.addEventListener("click", async () => {
      btnLastfmConnect.disabled = true;
      btnLastfmConnect.textContent = "Connecting...";
      try {
        await window.lastFM.authenticate();
        updateLastfmUI();
      } catch (err) {
        alert("Last.fm Connection Failed: " + err.message);
      }
      btnLastfmConnect.disabled = false;
      btnLastfmConnect.textContent = "Connect Last.fm";
    });
  }

  if (btnLastfmDisconnect) {
    btnLastfmDisconnect.addEventListener("click", () => {
      if (confirm("Disconnect from Last.fm?")) {
        window.lastFM.disconnect();
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

  // Dynamic hit testing on mousemove to enable/disable click-through
  window.addEventListener('mousemove', (e) => {
    if (settings.taskbarMode && config) return;

    if (!e.target || typeof e.target.closest !== 'function') return;

    const isOverInteractive = e.target.closest('button, input, select, .hud-header, .playback-widget, .settings-panel, a, label, .drag-handle');
    if (isOverInteractive) {
      setClickThroughCached(false);
    } else {
      if (config && settings.clickThrough) {
        setClickThroughCached(true);
      }
    }
  });

  // Disable click-through on window focus, restore on blur (except in taskbar mode)
  window.addEventListener('focus', () => {
    if (settings.taskbarMode && config) {
      return;
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
        window.electronAPI.syncTaskbarConfig({
          taskbarOffset: settings.taskbarOffset || 0,
          taskbarAlign: settings.taskbarAlign || 'center',
          taskbarAccentColor: settings.taskbarAccentColor || '#1DB954',
          taskbarTextColor: settings.taskbarTextColor || '#ffffff',
        });
      }
    }
  });

  if (window.electronAPI.onSyncTaskbarConfig) {
    window.electronAPI.onSyncTaskbarConfig((config) => {
      if (config.taskbarOffset !== undefined) {
        settings.taskbarOffset = config.taskbarOffset;
        if (sliderTbOffset) {
          sliderTbOffset.value = config.taskbarOffset;
          if (valTbOffset) valTbOffset.textContent = `${config.taskbarOffset}px`;
        }
        saveLocalSettings();
      }
    });
  }

  // Shortcut and system level listeners from main process
  window.electronAPI.onToggleClickThrough(() => {
    toggleClickThrough();
  });

  window.electronAPI.onWindowRestored(() => {
    // Cleanly exit taskbar mode in renderer state when restored
    if (settings.taskbarMode) {
      settings.taskbarMode = false;
      if (checkTaskbarMode) checkTaskbarMode.checked = false;
      applyVisualSettings();
      saveLocalSettings();
    }
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
    }
  });

  // Instantly freeze/unfreeze the internal clock the moment Windows detects pause/play
  // This fires BEFORE the Spotify API poll and eliminates the jump-ahead-then-back jitter
  window.electronAPI.onSmtcPlaybackStatus((data) => {
    if (!config || config.localMode) return; // Only matters in Spotify API mode
    if (data.isPlaying) {
      // Song resumed: restart the internal clock from current frozen position
      if (!isPlaying) {
        if (typeof data.position === 'number') {
          lastPollProgress = data.position;
          currentProgress = data.position;
        } else {
          lastPollProgress = currentProgress;
        }
        lastPollTimestamp = Date.now();
        isPlaying = true;
        if (btnPlaySvg) btnPlaySvg.style.display = 'none';
        if (btnPauseSvg) btnPauseSvg.style.display = 'block';
      }
    } else {
      // Song paused: freeze internal clock exactly here, right now
      if (isPlaying) {
        if (typeof data.position === 'number') {
          lastPollProgress = data.position;
          currentProgress = data.position;
        } else {
          lastPollProgress = currentProgress;
        }
        lastPollTimestamp = Date.now();
        isPlaying = false;
        if (btnPlaySvg) btnPlaySvg.style.display = 'block';
        if (btnPauseSvg) btnPauseSvg.style.display = 'none';
      }
    }
  });

  let isTogglingFromTray = false;
  window.electronAPI.onToggleTaskbarModeTray(() => {
    isTogglingFromTray = true;
    const newState = !settings.taskbarMode;
    if (newState && !config) {
        if (toastNotification) {
          toastNotification.textContent = "Please log in to use Taskbar Mode.";
          toastNotification.classList.add("show");
          setTimeout(() => toastNotification.classList.remove("show"), 3000);
        }
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
    document.getElementById("settings-panel").classList.add("open");
  });

  if (window.electronAPI.onShowToast) {
    window.electronAPI.onShowToast((message) => {
      if (toastNotification) {
        toastNotification.textContent = message;
        toastNotification.classList.add("show");
        setTimeout(() => toastNotification.classList.remove("show"), 5000);
      }
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
      navigator.clipboard.writeText(text).then(() => {
        if (toastNotification) {
          toastNotification.textContent = "Copied: " + text;
          toastNotification.classList.add("show");
          setTimeout(() => {
            toastNotification.classList.remove("show");
          }, 2000);
        }
      }).catch(err => console.error("Clipboard write failed:", err));
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

  // Keyboard Shortcuts for Sync Nudging
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === 'ArrowLeft') {
      // Nudge lyrics BACK (delayed)
      settings.syncOffsetMs -= 100;
      showSyncToast();
      saveLocalSettings();
    } else if (e.key === 'ArrowRight') {
      // Nudge lyrics FORWARD (earlier)
      settings.syncOffsetMs += 100;
      showSyncToast();
      saveLocalSettings();
    }

    function showSyncToast() {
      if (toastNotification) {
        toastNotification.textContent = `Offset: ${settings.syncOffsetMs}ms`;
        toastNotification.classList.add("show");
        setTimeout(() => toastNotification.classList.remove("show"), 1500);
      }
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
  inputSearchLyrics.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const lineEls = lyricsContainer.querySelectorAll(".lyric-line");
    lineEls.forEach(el => el.classList.remove("search-match"));
    currentSearchMatches = [];

    if (!query) {
      searchResultsInfo.textContent = "0 matches";
      return;
    }

    lineEls.forEach((el, index) => {
      if (el.textContent.toLowerCase().includes(query) && lyrics[index]) {
        el.classList.add("search-match");
        currentSearchMatches.push(index);
      }
    });

    searchResultsInfo.textContent = `${currentSearchMatches.length} matches`;
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
        if (config.localMode) {
          lastPollProgress = timeMs;
          lastPollTimestamp = Date.now();
        } else {
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

  function closeSearch() {
    searchOverlay.style.display = "none";
    const lineEls = lyricsContainer.querySelectorAll(".lyric-line");
    lineEls.forEach(el => el.classList.remove("search-match"));
    inputSearchLyrics.blur();
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

function sendTaskbarLyric(text) {
  if (!settings.taskbarMode || !window.electronAPI.updateTaskbarLyric) return;
  window.electronAPI.updateTaskbarLyric({ text });
}

let lastTbProgressTime = 0;
function sendTaskbarProgress(pct) {
  if (!settings.taskbarMode || !window.electronAPI.updateTaskbarLyric) return;
  const now = Date.now();
  if (now - lastTbProgressTime < 100) return; // Max 10fps for IPC progress
  lastTbProgressTime = now;
  window.electronAPI.updateTaskbarLyric({ progress: pct });
}



function toggleClickThrough() {
  if (!config) return; // Do not allow click-through if not logged in

  settings.clickThrough = !settings.clickThrough;
  try {
    setClickThroughCached(settings.clickThrough);
    applyVisualSettings();
    saveLocalSettings();

    // Show a floating indicator if locked
    if (settings.clickThrough) {
      const banner = document.createElement("div");
      banner.id = "lock-banner";
      banner.style.cssText = "position: absolute; top: 52px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); border: 1px solid #1DB954; color: #1DB954; padding: 6px 12px; border-radius: 6px; font-size: 11px; z-index: 1000; pointer-events: none; transition: opacity 0.5s ease;";
      banner.textContent = "Click-Through Active. Alt+Tab & Press Ctrl+Shift+L to unlock.";
      document.body.appendChild(banner);
      setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 500);
      }, 3500);
    }
  } catch (e) {
    console.error(e);
  }
}

// Navigation Screens
function showLoginScreen() {
  screenLyrics.classList.remove("active");
  screenLyrics.style.display = "none";
  screenLogin.classList.add("active");
  screenLogin.style.display = "flex";
  stopPolling();

  // Ensure taskbar mode is deactivated visually on logout/login screen
  applyVisualSettings();
  setClickThroughCached(false);
}

function showLyricsScreen() {
  if (screenLogin) {
    screenLogin.classList.remove("active");
    screenLogin.style.display = "none";
  }
  
  if (settings.firstRun !== false && screenOnboarding) {
    screenOnboarding.style.display = "block";
    screenOnboarding.classList.add("active");
    if (screenLyrics) {
      screenLyrics.style.display = "none";
      screenLyrics.classList.remove("active");
    }
  } else {
    if (screenLyrics) {
      screenLyrics.classList.add("active");
      screenLyrics.style.display = "flex";
    }
  }

  if (settings.offlineMode) { 
    // Handle offline logic if needed
  }
  
  startPolling();

  // Set default window properties from settings on start
  setClickThroughCached(settings.clickThrough);

  // Apply visual settings (including taskbarMode toggles) after config is set
  applyVisualSettings();
}

// Spotify Poller Management
function startPolling() {
  stopPolling();
  pollSpotifyPlayback(); // Initial poll
  const interval = (config && config.localMode) ? 200 : 1500;
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
            const durationDiff = Math.abs((localData.item.duration_ms || 0) - (data.item.duration_ms || 0));
            const isSameSong = durationDiff < 3000 || localTitle === spotTitle || localTitle.includes(spotTitle) || spotTitle.includes(localTitle);

            if (isSameSong) {
              // Override Spotify Web API's lagging state with SMTC's instant state
              data.is_playing = localData.is_playing;
              if (localData.progress_ms > 0) {
                 // Subtract latency here so when it's added below, it perfectly matches the instant local time
                 data.progress_ms = localData.progress_ms - ((Date.now() - fetchStart) / 2);
              }
            } else if (localData.is_playing && !data.is_playing) {
              // SMTC is playing something else, and Spotify is paused.
              handlePlaybackData(localData);
              return;
            }
          }
        } catch (e) {}
        
        const latency = (Date.now() - fetchStart) / 2;
        data.progress_ms += latency;

        // KEY FIX: If paused and same track already loaded, skip full UI update.
        // Calling handlePlaybackData with a lagging progress_ms while paused is what
        // causes the lyrics to jitter/snap backward every 1.5s poll.
        if (!data.is_playing && data.item.id === currentTrackId) {
          isPlaying = false;
          // Update play/pause button only
          if (btnPlaySvg) btnPlaySvg.style.display = 'block';
          if (btnPauseSvg) btnPauseSvg.style.display = 'none';
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
        pollSpotifyPlayback(true);
      } else {
        await pollLocalPlayback();
      }
      return;
    }

    await pollLocalPlayback();
  } catch (err) {
    await pollLocalPlayback();
  }
}

async function pollLocalPlayback() {
  try {
    const data = await window.electronAPI.getLocalPlayback();
    if (data && data.item) {
      if (typeof lastSpotifyPlaybackData !== 'undefined' && lastSpotifyPlaybackData && lastSpotifyPlaybackData.item) {
        const localTitle = data.item.name.toLowerCase().trim();
        const spotTitle = lastSpotifyPlaybackData.item.name.toLowerCase().trim();
        const durationDiff = Math.abs((data.item.duration_ms || 0) - (lastSpotifyPlaybackData.item.duration_ms || 0));
        const isSameSong = durationDiff < 3000 || localTitle === spotTitle || localTitle.includes(spotTitle) || spotTitle.includes(localTitle);

        if (isSameSong) {
           lastSpotifyPlaybackData.is_playing = data.is_playing;
           lastSpotifyPlaybackData.progress_ms = data.progress_ms;
           handlePlaybackData(lastSpotifyPlaybackData);
           return;
        }
      }
      handlePlaybackData(data);
    } else {
      handleEmptyPlayback();
    }
  } catch (err) {
    console.error("Failed to poll local playback:", err);
    handleEmptyPlayback();
  }
}

function handleEmptyPlayback() {
  console.log("[Renderer] handleEmptyPlayback called");
  isPlaying = false;
  lastPollProgress = 0;
  lastPollTimestamp = Date.now();
  currentTrackId = null;
  trackDuration = 0;
  lyrics = [];
  activeLineIndex = -1;

  widgetTrackName.textContent = "Not Playing";
  widgetArtistName.textContent = "Spotify";
  if (wallpaperTrackTitle) wallpaperTrackTitle.textContent = "Not Playing";
  if (wallpaperTrackArtist) wallpaperTrackArtist.textContent = "Spotify";
  setWallpaperAlbumArt(null);
  if (widgetPlaycount) widgetPlaycount.style.display = "none";
  widgetAlbumArt.style.display = "none";
  widgetArtFallback.style.display = "flex";
  widgetProgressFill.style.width = "0%";
  widgetTimeCurrent.textContent = "0:00";
  widgetTimeDuration.textContent = "0:00";

  lyricsContainer.innerHTML = '<div class="lyric-line placeholder">Start playing Spotify...</div>';
  lyricsContainer.style.transform = 'translateY(-50px)';
  if (tbLyricLine) {
    tbLyricLine.textContent = "";
    sendTaskbarLyric("");
  }
}

async function handlePlaybackData(data) {
  if (!data || !data.item) {
    handleEmptyPlayback();
    return;
  }

  const track = data.item;
  const isCurrentlyPlaying = data.is_playing;
  const progressMs = data.progress_ms;

  // Real-time synchronization: Sync Latching Logic
  const isNewTrack = track.id !== currentTrackId;

  // SPECIAL FIX: Some browser players (Apple Music Web) report progressMs = 0
  // even when playing. We ignore 0-syncs if we are already playing to prevent
  // the slider from snapping back to the start.
  const isZeroReset = progressMs === 0 && isPlaying && !isNewTrack;

  if (isNewTrack && !isZeroReset) {
    // New song: snap immediately to the API timestamp
    lastPollProgress = progressMs;
    lastPollTimestamp = Date.now();
    currentProgress = progressMs;
  } else if (!isZeroReset && isCurrentlyPlaying) {
    // Song is playing: only correct if drift is genuinely large (user manually seeked)
    const timeDrift = currentProgress - progressMs;
    if (Math.abs(timeDrift) > 5000) {
      // Manual seek detected — snap hard
      lastPollProgress = progressMs;
      lastPollTimestamp = Date.now();
      currentProgress = progressMs;
    }
    // Otherwise: trust our internal clock. Do NOT touch lastPollProgress/lastPollTimestamp.
    // The 60fps updatePlayhead() tick is more accurate than the API polling interval.
  } else if (!isZeroReset && !isCurrentlyPlaying) {
    // Song is PAUSED: freeze currentProgress exactly where it is right now.
    // NEVER snap to the API progress_ms when paused — it is always lagging behind
    // and causes the visible backwards jitter.
    lastPollProgress = currentProgress;
    lastPollTimestamp = Date.now();
  }

  isPlaying = isCurrentlyPlaying;
  trackDuration = track.duration_ms;

  if (track && (!track.album || !track.album.images || !track.album.images.length)) {
    const cachedArt = localArtCache[track.id];
    if (cachedArt && cachedArt !== 'fetching' && cachedArt !== 'notfound') {
      track.album = track.album || {};
      track.album.images = [{ url: cachedArt }, { url: cachedArt }, { url: cachedArt }];
    }
  }

  // Update Play/Pause button icons
  if (isPlaying) {
    if (btnPlaySvg) btnPlaySvg.style.display = 'none';
    if (btnPauseSvg) btnPauseSvg.style.display = 'block';
  } else {
    if (btnPlaySvg) btnPlaySvg.style.display = 'block';
    if (btnPauseSvg) btnPauseSvg.style.display = 'none';
  }

  // Track Info UI update
  widgetTrackName.textContent = track.name;
  const artistText = track.artists.map(a => a.name).join(", ");
  widgetArtistName.textContent = artistText;
  if (wallpaperTrackTitle) wallpaperTrackTitle.textContent = track.name;
  if (wallpaperTrackArtist) wallpaperTrackArtist.textContent = artistText;

  const albumArtUrl = track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || track.album?.images?.[2]?.url;
  if (albumArtUrl) {
    widgetAlbumArt.src = albumArtUrl;
    widgetAlbumArt.style.display = "block";
    widgetArtFallback.style.display = "none";
    setWallpaperAlbumArt(albumArtUrl);
  } else {
    widgetAlbumArt.style.display = "none";
    widgetArtFallback.style.display = "flex";
    setWallpaperAlbumArt(null);
  }

  widgetTimeDuration.textContent = formatTime(trackDuration);

  // Update Discord RPC
  if (settings.discordRpc) {
    window.electronAPI.updateDiscordRpc({
      trackName: track.name,
      artistName: widgetArtistName.textContent,
      albumName: track.album?.name,
      albumArtUrl: albumArtUrl,
      isPlaying: isPlaying
    });
  }

    // Check if song changed
  if (track.id !== currentTrackId) {
    currentTrackId = track.id;

    // Load per-song offset
    if (!settings.trackOffsets) settings.trackOffsets = {};
    settings.syncOffsetMs = settings.trackOffsets[currentTrackId] || 0;
    if (inputSyncOffset) inputSyncOffset.value = settings.syncOffsetMs;

    logTrackHistory(track);
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

    const isrc = track.external_ids?.isrc || null;
    fetchLyrics(track.id, track.name, track.artists[0].name, trackDuration, isrc);
    fetchGeniusFact(track.name, track.artists[0].name);

    if (window.lastFM) {
      window.lastFM.onTrackChange({
        title: track.name,
        artist: track.artists.map(a => a.name).join(", "),
        album: track.album?.name || ''
      });
    }

    // Trigger slide-in Next Up popup window!
    const popupArtUrl = track.album?.images?.[1]?.url || track.album?.images?.[0]?.url;
    if (!albumArtUrl && !localArtCache[track.id]) {
      localArtCache[track.id] = 'fetching';
      fetchFallbackAlbumArt(track.name, track.artists?.[0]?.name || '').then(artUrl => {
        localArtCache[track.id] = artUrl || 'notfound';
        if (artUrl && currentTrackId === track.id) {
          track.album.images = [{ url: artUrl }, { url: artUrl }, { url: artUrl }];
          widgetAlbumArt.src = artUrl;
          widgetAlbumArt.style.display = "block";
          widgetArtFallback.style.display = "none";
          setWallpaperAlbumArt(artUrl);

          if (!settings.taskbarMode && settings.showNextUp) {
            window.electronAPI.showNextUp({
              name: track.name,
              artist: track.artists.map(a => a.name).join(", "),
              albumArtUrl: artUrl
            });
          }

          extractDominantColor(artUrl).then(colors => {
            const c1 = `rgb(${colors.r}, ${colors.g}, ${colors.b})`;
            const c2 = `rgb(${Math.max(0, colors.r - 80)}, ${Math.max(0, colors.g - 80)}, ${Math.max(0, colors.b - 80)})`;
            document.documentElement.style.setProperty('--art-color-1', c1);
            document.documentElement.style.setProperty('--art-color-1-rgb', `${colors.r}, ${colors.g}, ${colors.b}`);
            document.documentElement.style.setProperty('--art-color-2', c2);
            if (settings.highlightColor === 'dynamic') {
              applyVisualSettings();
            }
          });
        }
      });
    } else {
      if (!settings.taskbarMode && settings.showNextUp) {
        window.electronAPI.showNextUp({
          name: track.name,
          artist: track.artists.map(a => a.name).join(", "),
          albumArtUrl: popupArtUrl
        });
      }
    }

    // Extract dynamic ambient color from album art
    if (albumArtUrl) {
      extractDominantColor(albumArtUrl).then(colors => {
        // Darken color 2 for depth
        const c1 = `rgb(${colors.r}, ${colors.g}, ${colors.b})`;
        const c2 = `rgb(${Math.max(0, colors.r - 80)}, ${Math.max(0, colors.g - 80)}, ${Math.max(0, colors.b - 80)})`;
        document.documentElement.style.setProperty('--art-color-1', c1);
        document.documentElement.style.setProperty('--art-color-1-rgb', `${colors.r}, ${colors.g}, ${colors.b}`);
        document.documentElement.style.setProperty('--art-color-2', c2);

        // Re-apply settings if highlight color is dynamic to refresh the glow
        if (settings.highlightColor === 'dynamic') {
          applyVisualSettings();
        }
      });
    }

    // Fetch Lyrics with track ID for caching
    const finalIsrc = track.external_ids?.isrc || null;
    fetchLyrics(track.id, track.name, track.artists?.[0]?.name || 'Unknown', trackDuration, finalIsrc);
  }
}

// History logging
function logTrackHistory(track) {
  let albumArtUrl = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || "";
  if (!albumArtUrl && localArtCache[track.id]) {
    albumArtUrl = localArtCache[track.id];
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
  } catch (e) { console.error(e); }

  history.unshift(entry);
  if (history.length > 200) history = history.slice(0, 200);

  localStorage.setItem("listening_history", JSON.stringify(history));
  renderHistory();
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
            if (img && img["#text"] && img["#text"].trim() !== "") artUrl = img["#text"];
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

// Generate Lyric Share Card
function generateShareCard() {
  if (lyrics.length === 0 || activeLineIndex < 0 || activeLineIndex >= lyrics.length) {
    if (toastNotification) {
      toastNotification.textContent = "No lyric active to share!";
      toastNotification.classList.add("show");
      setTimeout(() => toastNotification.classList.remove("show"), 2000);
    }
    return;
  }

  if (toastNotification) {
    toastNotification.textContent = "Generating share card...";
    toastNotification.classList.add("show");
  }

  const text = lyrics[activeLineIndex].text;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080; // Square format for Insta/Twitter
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#121212';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const albumUrl = widgetAlbumArt.src;
  if (!albumUrl || albumUrl.includes('data:image')) {
     drawTextOnlyCard(ctx, text, canvas);
     finishShareCard(canvas);
     return;
  }

  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = () => {
    // Draw blurred background
    ctx.filter = 'blur(40px) brightness(0.4)';
    ctx.drawImage(img, -100, -100, canvas.width + 200, canvas.height + 200);
    ctx.filter = 'none';

    // Draw Album Art thumbnail
    const thumbSize = 260;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.drawImage(img, canvas.width / 2 - thumbSize / 2, 180, thumbSize, thumbSize);
    ctx.restore();

    drawTextOnlyCard(ctx, text, canvas);
    finishShareCard(canvas);
  };
  img.onerror = () => {
     drawTextOnlyCard(ctx, text, canvas);
     finishShareCard(canvas);
  };
  img.src = albumUrl;
}

function drawTextOnlyCard(ctx, text, canvas) {
  // Lyric text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Wrap text
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < 880) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  const lineHeight = 90;
  const startY = canvas.height / 2 + 100 - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
  });

  // Track info
  ctx.font = 'bold 36px "Segoe UI", sans-serif';
  ctx.fillStyle = '#1DB954';
  ctx.fillText(widgetTrackName.textContent, canvas.width / 2, canvas.height - 140);

  ctx.font = 'normal 26px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText(widgetArtistName.textContent, canvas.width / 2, canvas.height - 90);

  // Watermark
  ctx.font = 'bold 20px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillText("LyricFlow", canvas.width / 2, canvas.height - 40);
}

function finishShareCard(canvas) {
  canvas.toBlob(blob => {
    const item = new window.ClipboardItem({ "image/png": blob });
    navigator.clipboard.write([item]).then(() => {
      if (toastNotification) {
        toastNotification.textContent = "Share Card copied to clipboard!";
        toastNotification.classList.add("show");
        setTimeout(() => toastNotification.classList.remove("show"), 2000);
      }
    }).catch(err => {
      console.error("Failed to write to clipboard:", err);
      if (toastNotification) {
        toastNotification.textContent = "Failed to copy image.";
        setTimeout(() => toastNotification.classList.remove("show"), 2000);
      }
    });
  });
}

// LRU cache eviction helper for lyrics cache
function manageLyricsCache(cacheKey) {
  try {
    let index = [];
    const storedIndex = localStorage.getItem("lyrics_cache_index");
    if (storedIndex) {
      index = JSON.parse(storedIndex);
    }

    // Remove if already exists (push to end/most recent)
    index = index.filter(item => item.key !== cacheKey);

    // Add new key with timestamp
    index.push({ key: cacheKey, time: Date.now() });

    // Limit to 150 entries
    if (index.length > 150) {
      const toRemove = index.slice(0, index.length - 150);
      toRemove.forEach(item => {
        localStorage.removeItem(item.key);
      });
      index = index.slice(index.length - 150);
    }

    localStorage.setItem("lyrics_cache_index", JSON.stringify(index));
  } catch (e) {
    console.error("Lyrics cache management error:", e);
  }
}

// Synced lyrics fetching & parsing with caching
let fetchAbortController = null;

// Synced lyrics fetching via V2 Unified Proxy (Spotify Internal) + Direct LRCLIB
async function fetchLyrics(trackId, trackName, artistName, durationMs, isrc = null) {
  if (fetchAbortController) {
    fetchAbortController.abort();
  }
  fetchAbortController = new AbortController();
  const signal = fetchAbortController.signal;

  const cleanArtist = artistName.replace(/VEVO$/i, '').replace(/- Topic$/i, '').replace(/Official$/i, '').trim() || artistName;
  const cleanTrack = trackName.replace(/\[.*?\]/g, '').replace(/\(.*?(Official|Audio|Video).*?\)/ig, '').replace(/ - (Remastered|Radio Edit|Live|Instrumental|Acoustic|Single Version).*/i, '').trim() || trackName;

  const cacheKey = `lyrics_cache_v21_${trackId}`;
  const cachedStr = localStorage.getItem(cacheKey);

  if (cachedStr) {
    try {
      const cachedData = JSON.parse(cachedStr);
      if (trackId === currentTrackId && cachedData.lyrics?.length > 0) {
        lyrics = cachedData.lyrics;
        updateTimingStatus(cachedData.level || 2);
        renderLyrics();
        if (cachedData.level === 3) return;
      }
    } catch (e) { console.error(e); }
  }

  const durationSec = Math.round(durationMs / 1000);

  try {
    updateTimingStatus(0); // "Checking..."

    let currentSourceLevel = 0;

    const applyLyricsData = async (parsedLines, sourceLevel) => {
      // Strip structural tags that often have bad timestamps (e.g., "[Outro]", "Intro", "Chorus")
      parsedLines = parsedLines.filter(line => {
        if (!line.text) return false;
        const t = line.text.trim().toLowerCase();
        // Remove bracketed structure tags e.g. [Chorus]
        if (t.startsWith('[') && t.endsWith(']')) return false;
        // Remove naked structure tags
        if (/^(outro|intro|instrumental|chorus|verse|bridge|hook)(\s+\d+)?$/i.test(t)) return false;
        return true;
      });

      if (trackId !== currentTrackId || parsedLines.length === 0) return false;

      // 1. Blacklist Check: Has the user manually hidden lyrics for this specific source/track?
      const blacklistKey = `blacklist_lyrics_${trackId}`;
      if (localStorage.getItem(blacklistKey)) {
        console.log(`[Lyrics] Skipping lyrics for ${trackId} (User Blacklisted)`);
        return false;
      }

      // 2. Quality Check: (Removed strict duration mismatch rejection as it breaks Radio Edits vs Album versions)

      // 3. Density Check: If the song is normal length but only has 1 or 2 lines of lyrics, it's likely a junk/empty sync (e.g. just "♪" or "Instrumental"). Reject it so we can fall back to another source.
      if (trackDuration > 45000 && parsedLines.length < 4) {
        console.warn(`[Lyrics] Rejected lyrics for ${trackId} because it only contained ${parsedLines.length} lines for a full song.`);
        return false;
      }

      if (sourceLevel <= currentSourceLevel) return false;

      // Clear any existing subText from parsedLines before processing
      parsedLines.forEach(line => {
        delete line.subText;
      });

      const combinedText = parsedLines.map(l => l.text).join('\n');

      // 1. Auto-Translation Promise (with skipLang support)
      let transPromise = Promise.resolve(null);
      if (settings.translateLang && settings.translateLang !== 'none') {
        const skipLang = settings.skipLang || 'none';
        transPromise = window.electronAPI.translateText(combinedText, settings.translateLang, skipLang)
          .catch(err => { console.error("Translation Error:", err); return null; });
      }

      try {
        const transRes = await transPromise;

        // Ensure track hasn't changed while we were fetching
        if (trackId !== currentTrackId) return false;

        const transLines = (transRes && transRes.text) ? transRes.text.split('\n') : [];

        parsedLines.forEach((line, i) => {
          const transText = transLines[i] ? transLines[i].trim() : '';
          if (transText && transText.toLowerCase() !== line.text.trim().toLowerCase()) {
            line.subText = transText;
          }
        });
      } catch (err) {
        console.error("Translation processing error:", err);
      }

      // Ensure track hasn't changed while we were fetching translations/transliterations
      if (trackId !== currentTrackId) return false;

      lyrics = parsedLines;
      currentSourceLevel = sourceLevel;
      updateTimingStatus(sourceLevel);
      localStorage.setItem(cacheKey, JSON.stringify({ level: sourceLevel, lyrics }));
      renderLyrics();

      // Show 'Hide Lyrics' button in UI
      const btnHide = document.getElementById("btn-hide-lyrics");
      if (btnHide) btnHide.style.display = "flex";

      return true;
    };

    let rateLimited = false;

    // 1. Fetch LRCLIB Direct


    // 2. Fetch via Custom Proxy (No Local Web Token due to IP Ban)
    const proxyFetch = async () => {
      try {
        const baseUrl = settings.customProxyUrl ? settings.customProxyUrl.replace(/\/$/, '') : 'https://lyricsplus.mathurdeepit12.workers.dev';
        let url = `${baseUrl}/lyrics?artist=${encodeURIComponent(cleanArtist)}&title=${encodeURIComponent(cleanTrack)}&trackId=${trackId}`;
        
        if (trackDuration > 0) {
          url += `&duration=${Math.round(trackDuration / 1000)}`;
        }
        if (config && config.access_token) {
          url += `&token=${encodeURIComponent(config.access_token)}`;
        }

        const response = await fetch(url, { signal });
        if (response.status === 429) rateLimited = true;
        if (response.ok) {
          const data = await response.json();
          if (data.source === "Spotify" && data.lines && data.lines.length > 0) {
            applyLyricsData(data.lines, (data.syncType === "WORD_SYNCED") ? 3 : 2);
            return true;
          } else if (data.source === "LRCLIB" && data.rawLRC) {
            const parsed = parseLRC(data.rawLRC);
            if (parsed.length > 0) {
              const hasWords = parsed.some(l => l.words && l.words.length > 0);
              applyLyricsData(parsed, hasWords ? 3 : (data.syncType === "LINE_SYNCED" ? 2 : 1));
            } else if (data.syncType === "UNSYNCED") {
              const plainParsed = data.rawLRC.split('\n').map(l => l.trim()).filter(l => l && !l.match(/^\[[a-z]+:/i)).map((text) => ({ timeMs: 9999999, text }));
              applyLyricsData(plainParsed, 1);
            }
            return true;
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error("Proxy Fetch Error:", e);
      }
      return false;
    };

    // 2. Fallback: Local LRCLIB (In case Cloudflare proxy is rate-limited by LRCLIB)
    const localLrclibFetch = async () => {
      try {
        if (lyrics.length > 0) return false;
        
        let data = null;

        // Attempt 1: Exact get with duration
        const params = new URLSearchParams({ artist_name: cleanArtist, track_name: cleanTrack });
        if (trackDuration > 0) params.set("duration", Math.round(trackDuration / 1000));
        let res = await fetch(`https://lrclib.net/api/get?${params}`, { signal });
        if (res.ok) data = await res.json();
        
        // Attempt 2: Exact get WITHOUT duration (duration often mismatches by a few seconds)
        if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
          const paramsNoDur = new URLSearchParams({ artist_name: cleanArtist, track_name: cleanTrack });
          let resNoDur = await fetch(`https://lrclib.net/api/get?${paramsNoDur}`, { signal });
          if (resNoDur.ok) data = await resNoDur.json();
        }

        // Attempt 3: Search using track_name and artist_name explicitly
        if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
          const searchParams = new URLSearchParams({ track_name: cleanTrack, artist_name: cleanArtist });
          const searchRes = await fetch(`https://lrclib.net/api/search?${searchParams}`, { signal });
          if (searchRes.ok) {
            const results = await searchRes.json();
            if (results && results.length > 0) {
              data = results.find(r => r.syncedLyrics) || results[0];
            }
          }
        }

        // Attempt 4: Fallback generic search (q=)
        if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
          const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTrack + " " + cleanArtist)}`, { signal });
          if (searchRes.ok) {
            const results = await searchRes.json();
            if (results && results.length > 0) {
              data = results.find(r => r.syncedLyrics) || results[0];
            }
          }
        }
        
        if (data && (data.syncedLyrics || data.plainLyrics)) {
          const lrcText = data.syncedLyrics || data.plainLyrics;
          const parsed = parseLRC(lrcText);
          if (parsed.length > 0) {
            const hasWords = parsed.some(l => l.words && l.words.length > 0);
            applyLyricsData(parsed, hasWords ? 3 : (data.syncedLyrics ? 2 : 1));
          } else if (!data.syncedLyrics) {
            const plainParsed = lrcText.split('\n').map(l => l.trim()).filter(l => l && !l.match(/^\[[a-z]+:/i)).map((text) => ({ timeMs: 9999999, text }));
            applyLyricsData(plainParsed, 1);
          }
          return true;
        }
      } catch (e) {}
      return false;
    };

    // 4. Last Resort: Lyrics.ovh (Unsynced)
    const ovhFetch = async () => {
      try {
        if (lyrics.length > 0) return; // Only run if others failed
        const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTrack)}`;
        const response = await fetch(url, { signal });
        if (response.ok) {
          const data = await response.json();
          if (data.lyrics && trackId === currentTrackId && lyrics.length === 0) {
            const lines = data.lyrics.split('\n').map((text) => ({ timeMs: 9999999, text }));
            applyLyricsData(lines, 1);
          }
        }
      } catch (e) {}
    };

    // Start proxy fetch, if it fails, run local LRCLIB fallback
    proxyFetch().then(proxySuccess => {
      if (!proxySuccess && lyrics.length === 0 && trackId === currentTrackId) {
        localLrclibFetch().then(localSuccess => {
          if (!localSuccess && lyrics.length === 0 && trackId === currentTrackId) {
            ovhFetch();
          }
        });
      }
    });

    // Safety timeout: if nothing loaded after 12 seconds, show placeholder
    setTimeout(() => {
      if (trackId === currentTrackId && lyrics.length === 0) {
        const msg = rateLimited ? "Rate limited by server. Please wait a moment..." : "Lyrics unavailable.";
        lyricsContainer.innerHTML = `<div class="lyric-line placeholder">${msg}</div>`;
        if (tbLyricLine) { tbLyricLine.textContent = msg; sendTaskbarLyric(msg); }
        updateTimingStatus(1);
      }
    }, 12000);

    manageLyricsCache(cacheKey);
  } catch (err) {
    if (err.name !== 'AbortError') console.error("Fetch Error:", err);
  }
}



function updateTimingStatus(level) {
  const badge = document.getElementById("timing-status-badge");
  if (!badge) return;

  if (level === 3) {
    badge.textContent = "High-Fidelity Word Timing";
    badge.style.color = "#1db954";
    badge.style.display = "inline";
  } else if (level === 2) {
    badge.textContent = "Line Sync (Standard)";
    badge.style.color = "#fbbf24";
    badge.style.display = "inline";
  } else if (level === 1) {
    badge.textContent = "Plain Text (No Sync)";
    badge.style.color = "rgba(255,255,255,0.4)";
    badge.style.display = "inline";
  } else {
    badge.textContent = "Checking...";
    badge.style.color = "rgba(255,255,255,0.2)";
    badge.style.display = "inline";
  }
}

// Robust LRC Parser (handles Enhanced LRC syllable tags)
function parseLRC(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g;
  const syllableRegex = /<(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?>/g;

  for (const line of lines) {
    const lineTimestamps = [];
    let match;
    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const msPart = match[3] || "000";
      const ms = parseInt(msPart.padEnd(3, '0').substring(0, 3), 10);
      lineTimestamps.push((minutes * 60 + seconds) * 1000 + ms);
    }

    if (lineTimestamps.length > 0) {
      let fullText = line.replace(timeRegex, '').trim();
      let words = [];
      let lastIndex = 0;
      let sylMatch;
      syllableRegex.lastIndex = 0;

      while ((sylMatch = syllableRegex.exec(fullText)) !== null) {
          const wordText = fullText.substring(lastIndex, sylMatch.index).trim();
          if (wordText) {
              const minutes = parseInt(sylMatch[1], 10);
              const seconds = parseInt(sylMatch[2], 10);
              const msPart = sylMatch[3] || "000";
              const ms = parseInt(msPart.padEnd(3, '0').substring(0, 3), 10);
              const wTime = (minutes * 60 + seconds) * 1000 + ms;
              words.push({ text: wordText, timeMs: wTime });
          }
          lastIndex = syllableRegex.lastIndex;
      }

      const finalWordText = fullText.substring(lastIndex).replace(syllableRegex, '').trim();
      if (finalWordText && words.length > 0) {
          words.push({ text: finalWordText, timeMs: 9999999 });
      }

      const cleanText = fullText.replace(syllableRegex, '').trim();

      for (const timeMs of lineTimestamps) {
        let lineWords = [];
        if (words.length > 0) {
            lineWords = words.map(w => ({
                text: w.text,
                timeMs: w.timeMs === 9999999 ? (timeMs + 3000) : w.timeMs
            }));
        }
        parsed.push({ timeMs, text: cleanText, words: lineWords });
      }
    }
  }

  parsed.sort((a, b) => a.timeMs - b.timeMs);
  return parsed;
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

// Musixmatch JSON Parser (handles RichSync word-level timestamps)
function parseMusixmatch(data) {
  if (!data || !data.lyrics) return [];

  const parsed = data.lyrics
    .map(line => {
      const timeMs = parseInt(line.startTimeMs || 0);
      const text = (line.words || "").trim();

      // Filter out meta-lines or empty lines
      if (!text || text.startsWith("Lyricist:") || text.startsWith("Composer:")) {
        return null;
      }

      let words = [];
      if (line.syllables && Array.isArray(line.syllables)) {
        words = line.syllables.map(s => ({
          text: s.text,
          timeMs: timeMs + (parseInt(s.offsetMs) || 0)
        }));
      }

      return { timeMs, text, words };
    })
    .filter(line => line !== null);

  parsed.sort((a, b) => a.timeMs - b.timeMs);
  return parsed;
}

// LyricsPlus JSON Parser (handles RichSync word-level timestamps)
// LyricsPlus JSON Parser (Deep-Scan for any word-level arrays)
function parseLyricsPlus(data) {
  if (!data) return [];

  let rawLines = [];
  if (Array.isArray(data)) rawLines = data;
  else rawLines = data.lyrics || data.lines || data.data || data.rows || [];

  if (!Array.isArray(rawLines)) return [];

  return rawLines.map(line => {
    const lineTimeMs = parseInt(line.startTimeMs || line.timeMs || (line.time * 1000) || line.offset || 0);

    // Extract text safely
    let text = "";
    if (typeof line.words === 'string') text = line.words;
    else if (typeof line.text === 'string') text = line.text;

    // DEEP-SCAN for word timing arrays
    let words = [];
    const timingArray = Object.values(line).find(val =>
      Array.isArray(val) && val.length > 0 && (typeof val[0] === 'object')
    );

    if (timingArray) {
      words = timingArray.map(w => {
        let wTime = parseInt(w.startTimeMs || w.timeMs || (w.time * 1000) || w.offsetMs || w.offset || w.t || 0);
        if (wTime < lineTimeMs && wTime < 60000) wTime += lineTimeMs;
        return {
          text: (w.text || w.string || w.word || w.w || "").trim(),
          timeMs: wTime
        };
      }).filter(w => w.text !== "");

      if (text.trim() === "" && words.length > 0) {
        text = words.map(w => w.text).join(" ");
      }
    } else if (text === "" && line.syllables) {
        text = line.syllables.map(s => s.text || "").join("");
    }

    return { timeMs: lineTimeMs, text: text.trim(), words };
  }).filter(l => l.text !== "");
}




// Render lyrics to DOM
function renderLyrics() {
  if (lyrics.length === 0) {
    lyricsContainer.innerHTML = '<div class="lyric-line placeholder">No lyrics found</div>';
    document.body.classList.remove("wbw-active");
    if (tbLyricLine) {
      tbLyricLine.textContent = "No lyrics found";
      sendTaskbarLyric("No lyrics found");
    }
    cachedLineEls = [];
    return;
  }

  // Only enable visual "dimming" of the line if we actually have words to highlight
  const hasAnyWordTiming = lyrics.some(l => l.words && l.words.length > 0);
  document.body.classList.toggle("wbw-active", settings.wordByWord && hasAnyWordTiming);

  lyricsContainer.innerHTML = "";
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

    lyricsContainer.appendChild(el);
  });

  cachedLineEls = Array.from(lyricsContainer.querySelectorAll(".lyric-line"));
  activeLineIndex = -1;
  scrollLyrics(0);
}

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

    // If user is manually scrolling, don't auto-scroll
    if (userScrolling) return;

    if (settings.compactMode) {
      lyricsContainer.style.transform = 'none';
      return;
    }

    // Calculate scrolling translation
    const viewportHeight = lyricsViewport.clientHeight;
    const offsetTop = activeEl.offsetTop;
    const height = activeEl.clientHeight;

    // Compute exact center position
    const translateY = (viewportHeight / 2) - offsetTop - (height / 2);
    lyricsContainer.style.transform = `translateY(${translateY}px)`;
  }
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
    btn.addEventListener('click', () => {
      userScrolling = false;
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
      // Force re-center on current active line
      const idx = activeLineIndex;
      activeLineIndex = -1;
      scrollLyrics(idx);
    });
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

  // 60FPS tick timer for smooth animations and progress bar fill
function updatePlayhead() {
  let previousProgress = currentProgress;
  if (config && isPlaying) {
    const elapsed = Date.now() - lastPollTimestamp;
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

  // Last.fm Progress check for scrobbling
  if (window.lastFM) {
    window.lastFM.updatePlaybackProgress(currentProgress, trackDuration);
  }

  requestAnimationFrame(updatePlayhead);
}

// Image Dominant Color Extractor
function extractDominantColor(imgUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 10, 10);
        const data = ctx.getImageData(0, 0, 10, 10).data;

        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
          count++;
        }

        const r = Math.floor(rSum / count);
        const g = Math.floor(gSum / count);
        const b = Math.floor(bSum / count);

        // Ensure color isn't completely dark or washed out (adjust contrast)
        const max = Math.max(r, g, b);
        let factor = 1;
        if (max > 0 && max < 100) factor = 120 / max; // boost dark colors

        resolve({
          r: Math.min(255, Math.round(r * factor)),
          g: Math.min(255, Math.round(g * factor)),
          b: Math.min(255, Math.round(b * factor))
        });
      } catch (e) {
        resolve({ r: 29, g: 185, b: 84 }); // fallback Spotify Green
      }
    };
    img.onerror = () => {
      resolve({ r: 29, g: 185, b: 84 });
    };
    img.src = imgUrl;
  });
}

// Helpers
function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

// Workaround for Windows Electron frameless window dragging issues
function forceRecalculateDragRegions() {
  const dragHandles = document.querySelectorAll('.drag-handle');
  dragHandles.forEach(el => {
    el.style.webkitAppRegion = 'none';
  });
  document.body.offsetHeight; // Force reflow
  setTimeout(() => {
    dragHandles.forEach(el => {
      el.style.webkitAppRegion = 'drag';
    });
  }, 100);
}

// Control Spotify Playback
async function controlPlayback(action, _retried = false) {
  if (!config) return;

  if (config.localMode) {
    window.electronAPI.triggerLocalPlaybackControl(action);
    setTimeout(pollSpotifyPlayback, 100);
    return;
  }

  let url = '';
  let method = 'POST';

  if (action === 'previous') {
    url = 'https://api.spotify.com/v1/me/player/previous';
  } else if (action === 'next') {
    url = 'https://api.spotify.com/v1/me/player/next';
  } else if (action === 'play-pause') {
    url = isPlaying
      ? 'https://api.spotify.com/v1/me/player/pause'
      : 'https://api.spotify.com/v1/me/player/play';
    method = 'PUT';
  }

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        "Authorization": `Bearer ${config.access_token}`
      }
    });

    if (res.status === 401) {
      if (_retried) {
        console.error("controlPlayback token refresh failed. Falling back to local playback instead of logging out.");
        // We DO NOT reset the config. The token might just be temporarily invalid or sp_dc expired.
        // The app will fall back to local playback on the next poll.
        return;
      }
      if (config.refresh_token) {
        try {
          config.access_token = await window.electronAPI.refreshToken();
        } catch (e) {
          console.error("Failed to refresh token:", e);
          return;
        }
      } else if (config.sp_dc) {
        const newAccess = await window.electronAPI.getAccessToken(config.sp_dc);
        if (newAccess) {
          config.access_token = newAccess;
        } else {
          return; // token expired, don't retry and loop
        }
      }
      return controlPlayback(action, true);
    }

    setTimeout(pollSpotifyPlayback, 300);
  } catch (err) {
    console.error("Playback control error:", err);
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
  try {
    const query = encodeURIComponent(`${trackName} ${artistName}`);
    const source = settings.artSource || 'itunes';

    if (source === 'lastfm') {
      const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=4d2626ea4637769ef9d4e56eb6cb66db&artist=${encodeURIComponent(artistName)}&track=${encodeURIComponent(trackName)}&format=json`);
      if (res.ok) {
        const data = await res.json();
        if (data.track && data.track.album && data.track.album.image) {
          const images = data.track.album.image;
          const largest = images[images.length - 1]['#text'];
          if (largest) return largest;
        }
      }
    } else if (source === 'musicbrainz') {
      const res = await fetch(`https://musicbrainz.org/ws/2/recording/?query=recording:${encodeURIComponent(trackName)}%20AND%20artist:${encodeURIComponent(artistName)}&fmt=json`, {
        headers: { 'User-Agent': 'SpotifyLyricsOverlay/1.0.0' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.recordings && data.recordings.length > 0) {
          const releaseId = data.recordings[0].releases?.[0]?.id;
          if (releaseId) {
            return `https://coverartarchive.org/release/${releaseId}/front-500`;
          }
        }
      }
    }

    // Default: iTunes
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&limit=1&entity=song`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg');
      }
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
    if (lastfmConnectedDiv) lastfmConnectedDiv.style.display = "flex";
    if (checkLastfmScrobble) checkLastfmScrobble.checked = window.lastFM.isScrobblingEnabled;
    if (btnLoveTrack) btnLoveTrack.style.display = "flex";
  } else {
    if (lastfmSetupDiv) lastfmSetupDiv.style.display = "flex";
    if (lastfmConnectedDiv) lastfmConnectedDiv.style.display = "none";
    if (btnLoveTrack) btnLoveTrack.style.display = "none";
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

async function fetchMusicNews() {
  if (!newsBody) return;

  try {
    const queryText = (inputNewsFilter && inputNewsFilter.value) ? inputNewsFilter.value.trim() : "";
    let q = "";

    // Construct boolean query
    if (queryText !== "") {
      const topic = activeNewsFilter ? `OR ${activeNewsFilter}` : `OR "new music" OR announces`;
      q = `"${queryText}" (album OR release OR tour OR drops ${topic}) when:30d`;
    } else {
      let topic = `("new album" OR "tour announcement" OR "drops new" OR "album release" OR "new music")`;
      if (activeNewsFilter) {
        if (activeNewsFilter.includes("drama")) {
          topic = `(controversy OR drama OR feud OR statement)`;
        } else if (activeNewsFilter.includes("interview")) {
          topic = `(interview OR podcast OR "speaks out")`;
        } else if (activeNewsFilter.includes("billboard")) {
          topic = `("billboard hot 100" OR "charts" OR "debuts at number")`;
        } else if (activeNewsFilter.includes("album")) {
          topic = `("new album" OR "drops new" OR "album release")`;
        } else if (activeNewsFilter.includes("tour")) {
          topic = `("tour announcement" OR "world tour" OR dates)`;
        }
      }
      q = `("Billboard" OR "Rolling Stone") ${topic} when:7d`;
    }

    const text = await window.electronAPI.fetchMusicNews(q);
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");

    let items = Array.from(xml.querySelectorAll("item"));

    // Sort items by date descending (latest first)
    items.sort((a, b) => {
      const dateA = new Date(a.querySelector("pubDate")?.textContent || 0).getTime();
      const dateB = new Date(b.querySelector("pubDate")?.textContent || 0).getTime();
      return dateB - dateA;
    });

    // Deduplicate repeated news based on title similarity
    const uniqueItems = [];
    for (const item of items) {
      const rawTitle = item.querySelector("title")?.textContent || "Untitled";
      const source = item.querySelector("source")?.textContent || "Google News";

      let displayTitle = rawTitle;
      if (source !== "Google News" && rawTitle.endsWith(` - ${source}`)) {
        displayTitle = rawTitle.substring(0, rawTitle.lastIndexOf(` - ${source}`));
      }

      // Normalize and extract significant words
      const normalized = displayTitle.toLowerCase().replace(/[^a-z0-9\s]/g, "");
      const words = new Set(normalized.split(/\s+/).filter(w => w.length > 2));

      // Check overlap with already added items
      let isDuplicate = false;
      for (const added of uniqueItems) {
        let overlap = 0;
        for (const w of words) {
          if (added.words.has(w)) overlap++;
        }
        const minWords = Math.min(words.size, added.words.size);
        // If more than 65% of the shorter title's words match, it's a duplicate
        if (minWords > 0 && (overlap / minWords) > 0.65) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueItems.push({ item, displayTitle, source, words });
      }
    }

    // Take top 50 unique
    const finalItems = uniqueItems.slice(0, 50);

    if (finalItems.length === 0) {
      newsBody.innerHTML = `<div style="text-align: center; color: rgba(255,255,255,0.5); font-size: 13px; margin-top: 20px;">No news found.</div>`;
      return;
    }

    newsBody.innerHTML = finalItems.map(obj => {
      const { item, displayTitle, source } = obj;
      const rawLink = item.querySelector("link")?.textContent || "#";
      const pubDate = item.querySelector("pubDate")?.textContent || "";
      const dateStr = pubDate ? new Date(pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "";

      // Sanitize external RSS data to prevent XSS
      const safeTitle = escapeHTML(displayTitle);
      const safeSource = escapeHTML(source);
      const safeDate = escapeHTML(dateStr);
      const safeLink = rawLink.startsWith('http') ? encodeURI(rawLink) : '#';

      return `
        <a href="${safeLink}" target="_blank" style="display: block; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; text-decoration: none; border: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; cursor: pointer;">
          <div style="font-size: 13px; color: rgba(255,255,255,0.95); font-weight: 500; line-height: 1.4;">${safeTitle}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <div style="font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">${safeSource}</div>
            <div style="font-size: 10px; color: rgba(255,255,255,0.4);">${safeDate}</div>
          </div>
        </a>
      `;
    }).join("");

  } catch (err) {
    console.error("News Fetch Error:", err);
    newsBody.innerHTML = `<div style="text-align: center; color: #f87171; font-size: 13px; margin-top: 20px;">Failed to load headlines: ${escapeHTML(err.message)}</div>`;
  }
}

// ==========================================
// OFFLINE CACHE MANAGER
// ==========================================
async function startPreCacheRoutine() {
  const cacheStatus = document.getElementById("cache-manager-status");
  const btnCacheTopTracks = document.getElementById("btn-cache-top-tracks");
  if (!cacheStatus || !btnCacheTopTracks) return;

  if (config.localMode || (!config.access_token && !config.sp_dc)) {
    cacheStatus.style.display = "block";
    cacheStatus.style.color = "#f43f5e";
    cacheStatus.textContent = "Error: Please login to Spotify via Web first to use this feature.";
    setTimeout(() => { cacheStatus.style.display = "none"; cacheStatus.style.color = "#1DB954"; }, 4000);
    return;
  }

  try {
    btnCacheTopTracks.disabled = true;
    cacheStatus.style.display = "block";
    cacheStatus.style.color = "#1DB954";
    cacheStatus.textContent = "Fetching your Top Tracks...";

    let res = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=long_term", {
      headers: { "Authorization": `Bearer ${config.access_token}` }
    });

    if (res.status === 401) {
      if (config.refresh_token) {
        config.access_token = await window.electronAPI.refreshToken();
      } else if (config.sp_dc) {
        config.access_token = await window.electronAPI.getAccessToken(config.sp_dc);
      }
      res = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=long_term", {
        headers: { "Authorization": `Bearer ${config.access_token}` }
      });
    }

    if (res.status === 403) {
      cacheStatus.style.color = "#f43f5e";
      cacheStatus.textContent = "Error: Caching top tracks requires an OAuth login. The current Web login token does not have permission.";
      setTimeout(() => { cacheStatus.style.display = "none"; cacheStatus.style.color = "#1DB954"; }, 6000);
      btnCacheTopTracks.disabled = false;
      return;
    }

    if (!res.ok) throw new Error("Failed to fetch top tracks");
    const data = await res.json();
    const tracks = data.items;

    if (!tracks || tracks.length === 0) {
      cacheStatus.textContent = "No top tracks found.";
      btnCacheTopTracks.disabled = false;
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      cacheStatus.textContent = `Caching ${i + 1}/${tracks.length}: ${t.name}...`;
      
      const trackId = t.id;
      const cached = localStorage.getItem(`lyrics_cache_${trackId}`);
      if (cached) {
        successCount++;
        continue; // Already cached
      }

      // Try to fetch silently
      try {
        const title = t.name;
        const artist = t.artists.map(a => a.name).join(", ");
        const duration = t.duration_ms;
        const isrc = t.external_ids?.isrc;
        
        let found = false;
        
        // 1. Proxy
        const proxyUrl = settings.customProxyUrl ? settings.customProxyUrl : "https://lyricflow-proxy.badghost.workers.dev";
        const proxyRes = await fetch(`${proxyUrl}/lyrics?trackId=${trackId}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`);
        if (proxyRes.ok) {
          const proxyData = await proxyRes.json();
          if (proxyData.lyrics && proxyData.lyrics.lines && proxyData.lyrics.lines.length > 0) {
            localStorage.setItem(`lyrics_cache_${trackId}`, JSON.stringify(proxyData.lyrics));
            found = true;
          }
        }

        // 2. LRCLIB
        if (!found) {
          let lrcUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}&duration=${Math.floor(duration/1000)}`;
          const lrcRes = await fetch(lrcUrl);
          if (lrcRes.ok) {
            const lrcData = await lrcRes.json();
            if (lrcData && lrcData.syncedLyrics) {
              const parsed = parseLrcString(lrcData.syncedLyrics);
              if (parsed.length > 0) {
                const lyricPayload = { lines: parsed.map(p => ({ startTimeMs: p.time, words: p.text, syllables: [] })), syncType: "LINE_SYNCED" };
                localStorage.setItem(`lyrics_cache_${trackId}`, JSON.stringify(lyricPayload));
                found = true;
              }
            }
          }
        }

        // 3. OVH (Unsynced)
        if (!found) {
          const ovhRes = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
          if (ovhRes.ok) {
            const ovhData = await ovhRes.json();
            if (ovhData.lyrics) {
              const lines = ovhData.lyrics.split('\n').filter(l => l.trim().length > 0).map((l, idx) => ({
                startTimeMs: idx * 3000,
                words: l,
                syllables: []
              }));
              const lyricPayload = { lines, syncType: "UNSYNCED" };
              localStorage.setItem(`lyrics_cache_${trackId}`, JSON.stringify(lyricPayload));
              found = true;
            }
          }
        }

        if (found) successCount++;
        else failCount++;
      } catch (err) {
        console.error("Cache pre-fetch error:", err);
        failCount++;
      }
      
      // Delay to avoid strict rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }

    cacheStatus.textContent = `Done! Cached ${successCount} songs (${failCount} failed).`;
    setTimeout(() => { cacheStatus.style.display = "none"; }, 5000);
  } catch (err) {
    console.error(err);
    cacheStatus.style.color = "#f43f5e";
    cacheStatus.textContent = "Error: " + err.message;
  } finally {
    btnCacheTopTracks.disabled = false;
  }
}
