
// Suppress context menu & all right-click actions completely across the entire app
if (typeof window !== 'undefined') {
  const suppressRightClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }
    return false;
  };

  window.addEventListener('contextmenu', suppressRightClick, true);
  if (typeof document !== 'undefined') {
    document.addEventListener('contextmenu', suppressRightClick, true);
  }

  ['auxclick', 'mousedown', 'mouseup'].forEach((evt) => {
    window.addEventListener(
      evt,
      (e) => {
        if (e.button === 2) {
          suppressRightClick(e);
        }
      },
      true
    );
  });
}

// HTML escape utility to prevent XSS when inserting external data via innerHTML
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string' || !str.includes('&')) return str || '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code));
}

// DOM Elements
let screenLogin, screenLyrics, screenOnboarding, formAuth, btnSubmitAuth, authStatus, btnLocalMode;
let clientIDInput;
let lyricsViewport, lyricsContainer;
let widgetAlbumArt, widgetArtFallback, widgetTrackName, widgetArtistName, widgetPlaycount, widgetProgressFill, widgetTimeCurrent, widgetTimeDuration;
let checkAlwaysOnTop, btnMinimize, btnSettings, btnClose, btnSettingsClose, settingsPanel, btnLogout;

let btnSpotifyConnect, spotifySetupDiv, spotifyConnectedDiv, spotifyAccountStatus;
let btnNews, btnNewsClose, newsPanel, newsBody, inputNewsFilter;
let selectFontSize, selectAlign, sliderBgOpacity, valBgOpacity, sliderGlow, valGlow, selectTheme;
let selectFont, sliderLineSpacing, valLineSpacing, checkShowWidget, selectHighlightColor, selectDblclickAction;
let appContainer, ambientGlow, hudHeader, playbackWidget;
let toastNotification, historyContainer;
let searchOverlay, inputSearchLyrics, searchResultsInfo, inputSyncOffset, btnResetOffset;
let btnLoveTrack, svgLoveUnfilled, svgLoveFilled, btnLastfmConnect, lastfmConnectedDiv, checkLastfmScrobble, btnLastfmDisconnect, lastfmSetupDiv, lastfmWaitingDiv, btnLastfmReopen, btnLastfmCancel, lastfmAccountStatus;

// Playback & Taskbar Mode controls DOM
let btnPrev, btnPlayPause, btnNext, btnPlaySvg, btnPauseSvg, btnShareLyric, btnReloadLyrics, btnRestoreLyrics, btnSleepTimer, sleepTimerBadge;
let checkTaskbarMode, selectTaskbarStyle, taskbarContainer, tbLyricLine, checkFullscreenLyrics, checkWallpaperMode, checkAutoHideTaskbar;
let selectWallpaperStyle;
let fluidMeshCanvas, selectBgStyle, sliderFluidSpeed, valFluidSpeed, settingFluidSpeedRow;
let fluidMeshGradientInstance = null;
let hasCustomBackground = false;
function isCustomBackgroundActive() {
  return Boolean(typeof settings !== 'undefined' && settings.customBgSrc && settings.customBgType && !settings.wallpaperMode);
}

function syncCustomBackgroundVideoPlayback() {
  const video = customBgVideo || document.getElementById('custom-bg-video');
  if (!video || !settings || settings.customBgType !== 'video' || !settings.customBgSrc) return;
  const isVisible = document.visibilityState !== 'hidden' && !document.body?.classList.contains('window-blurred');
  if (!isVisible) {
    video.pause();
    return;
  }
  if (video.src !== settings.customBgSrc) video.src = settings.customBgSrc;
  video.preload = 'auto';
  video.style.display = 'block';
  if (video.paused) video.play().catch(() => {});
}

function shouldRunFluidMesh() {
  if (typeof settings === 'undefined' || !settings) return false;
  const currentBgStyle = settings.bgStyle || 'fluid';
  const wallpaperSupportsMesh = !settings.wallpaperMode || settings.wallpaperStyle !== 'cinematic';
  const customBackgroundConfigured = Boolean(settings.customBgSrc && settings.customBgType);
  return !isDynamicIslandMode &&
    !settings.taskbarMode &&
    wallpaperSupportsMesh &&
    !isCinematicView &&
    currentBgStyle === 'fluid' &&
    !isCustomBackgroundActive() &&
    !(settings.wallpaperMode && customBackgroundConfigured);
}

function syncFluidMeshPlaybackState() {
  if (!fluidMeshGradientInstance) return;
  if (!shouldRunFluidMesh()) {
    fluidMeshGradientInstance.stop();
    return;
  }
  fluidMeshGradientInstance.setPlaybackState(
    isPlaying,
    window._currentBpmProfile || 'normal',
    settings.fluidSpeed !== undefined ? settings.fluidSpeed : 1.0
  );
}

function restoreCurrentFluidMeshPalette() {
  if (!fluidMeshGradientInstance || !shouldRunFluidMesh()) return false;
  // Resume a context that the browser/WebView lost while another surface was
  // active (for example, the Island window or a system overlay).
  fluidMeshGradientInstance.wake?.();
  fluidMeshGradientInstance.defrost?.();
  const palette = window.currentDynamicPalette;
  if (Array.isArray(palette) && palette.length >= 3) {
    // Island mode may discard the WebGL context. Snap the retained album
    // palette back in so the restored surface cannot linger on its blank frame.
    fluidMeshGradientInstance.setPalette(palette, true);
    return true;
  }
  return typeof restoreStartupPalette === 'function' && restoreStartupPalette();
}
let sliderOverlayX, valOverlayX, sliderOverlayY, valOverlayY, sliderOverlayWidth, valOverlayWidth, selectWallpaperFontSize;
let settingOverlayWidthRow, settingOverlayPosRow, settingWallpaperFontSizeRow, previewCanvas, previewBox;
let selectTbAlign, selectTbTranslation, sliderTbOffset, valTbOffset, settingTbAlignRow, settingTbTranslationRow, settingTbOffsetRow;
let checkAutoLaunch, sliderTbFontsize, valTbFontsize, settingTbFontsizeRow, tbProgress, settingFsLyricsRow;
let checkShowNextUp, checkShowGenius, selectGeniusPosition;
let checkAutoHideLyrics, selectAutoHideTrigger, selectAutoHideAction, sliderAutoHideDelay, valAutoHideDelay;
let settingAutoHideTriggerRow, settingAutoHideActionRow, settingAutoHideDelayRow;
let customBgVideo, customBgImg, wallpaperAlbumBg, inputBgFile, btnPickBg, btnClearBg, labelBgFilename;
let widgetAlbumArtVideo, wallpaperStyleArtVideo, wallpaperAlbumBgVideo, studioArtVideo;
let checkAnimatedAlbumArt, inputCustomArtGif, btnPickCustomArtGif, btnClearCustomArtGif, labelCustomArtGifFilename;
let currentPlayingTrackObj = null;
let currentTrack = null;
let currentStaticAlbumArtUrl = null;
let currentTitle = "";
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
let playbackControlsIdleTimer = null;
let checkAdaptiveBpm;
let checkWordByWord;
let checkNeteaseWordByWord;
let checkFilterCredits;
let selectPreferredProvider;
let isWallpaperDesktopFocused = true;
let currentSourceLevel = 0;
let currentLyricSourceName = '';
let currentLyricCandidateInfo = '';
let currentIslandIsLossless = false;
let currentIslandIsHiRes = false;
let isDynamicIslandMode = false;

// Global State & Timers hoisted to eliminate Temporal Dead Zone during bootstrap
let _saveDebounceTimer = null;
let currentAnimatedFetchToken = 0;
let currentAnimatedArtInfo = null;
if (typeof window !== 'undefined') {
  window.currentAnimatedArtInfo = null;
}
let tbPauseHideTimer = null;
let isTbPlaybackHidden = false;
let lastTbProgressTime = 0;
let autoHideLyricsTimer = null;
let isLyricsAutoHidden = false;
let currentPollGeneration = 0;
let isPollInProgress = false;
let localEmptyPollCount = 0;
let currentExtractedArtUrl = null;
let artPaletteRequestId = 0;
let lastProcessedTrackId = null;
let lastAppliedAlbumArtUrl = null;
let trackSwitchDebounceTimer = null;
let fetchAbortController = null;
const trackLyricsCandidateIndex = {};
const rejectedLyricsSignatures = {};
function shouldSkipRejectedLyricsCandidate(rejectedSignatures, signature, allowWordSyncUpgrade = false) {
  return Boolean(
    !allowWordSyncUpgrade &&
    rejectedSignatures &&
    rejectedSignatures.has(signature)
  );
}
let isReloadingLyrics = false;
const inFlightLyricsRequests = new Map();
const geniusAnnotationsCache = new Map();
let cachedViewportHeight = 0;
let cachedLineMetrics = [];
let isPlayheadLoopActive = false;
let playheadTimerId = null;
let taskbarColorPollInterval = null;

// Typography System - Standardized Safe Font Stacks with Fallbacks
const FONT_FAMILY_STACKS = {
  'Outfit': "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  'Inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  'Poppins': "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  'Nunito': "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  'Raleway': "'Raleway', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  'Space Grotesk': "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  'JetBrains Mono': "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
  'Georgia': "'Georgia', 'Times New Roman', 'Cambria', serif"
};

function resolveFontStack(fontName) {
  if (!fontName) return FONT_FAMILY_STACKS['Outfit'];
  if (FONT_FAMILY_STACKS[fontName]) return FONT_FAMILY_STACKS[fontName];
  if (fontName.includes(',') || fontName.startsWith("'") || fontName.startsWith('"')) {
    return fontName;
  }
  return fontName.includes(' ') ? `'${fontName}', sans-serif` : `${fontName}, sans-serif`;
}

// App State
let config = null;
let settings = {
  theme: 'dark',
  accentColor: 'green',
  fontSize: 22,
  textAlign: 'center',
  bgOpacity: 85,
  glowIntensity: 60,
  bgStyle: 'fluid',
  fluidSpeed: 1.0,
  fontFamily: 'Outfit',
  lineSpacing: 11,
  showWidget: true,
  hasCompletedSetup: false,
  highlightColor: 'dynamic',
  dblclickAction: 'copy',
  clickThrough: false,
  alwaysOnTop: false,
  cinematicMode: false,
  duetSeparation: true,
  layoutSplit: true,
  splitTallArtwork: true,
  wallpaperMode: false,
  wallpaperStyle: 'style2',
  wallpaperOverlayX: 50,
  wallpaperOverlayY: 50,
  wallpaperOverlayWidth: 60,
  wallpaperFontSize: 32,
  taskbarMode: false,
  taskbarStyle: 'minimal',
  tbStyle: 'minimal',
  autoHideTaskbarOnPause: false,
  taskbarAlign: 'center',
  tbAlign: 'center',
  tbTranslation: 'none',
  taskbarOffset: 0,
  tbOffset: 0,
  taskbarFontSize: 14,
  tbFontsize: 14,
  fullscreenLyrics: false,
  autoLaunch: false,
  showNextUp: true,
  adaptiveBpm: true,
  hinglishTranslate: false, // legacy default: hinglishTranslate: true,
  djLyricAutoTransition: false,
  djOutroGraceSec: 2.5,
  djPreserveSolos: true,
  djFadeDurationSec: 3.5,
  djSmartQueue: false,
  soloistEnabled: false,
  soloistHost: '127.0.0.1',
  soloistPort: 4488,
  soloistApiKey: 'spak_MvMTV9sUx815YUWewrdW2KlhUBX0eW5g',
  soloistDeviceName: 'LyricFlow',
  showGenius: false,
  showGeniusFact: false,
  showAnnotations: true,
  showAnnotationPreview: false,
  geniusPosition: 'top-left',
  syncOffsetMs: 0,
  trackOffsets: {},
  lastfmScrobble: false,
  translateLang: 'en',
  skipLang: 'none',
  autoHideLyrics: false,
  autoHideTrigger: 'paused',
  autoHideAction: 'collapse',
  autoHideDelay: 3,
  preferredLyricProvider: 'lyricsplus',
  preferredLyricProviders: ['netease', 'lrclib', 'musixmatch'],
  neteaseWordByWord: true,
  filterSongCredits: true,
  wordByWord: true,
  dynamicIslandMode: false,
  dynamicIslandPosition: 'top-center',
  islandCustomPos: null,
  islandVisualizerBars: 4,
  islandVisualizerStyle: 'bars',
  islandVocalCountdown: true,
  islandWheelGestures: true,
  islandTranslationMode: 'bilingual',
  islandInactivityTimeout: 30000,
  islandMetamorphosis: true,
  islandDuetSplit: true,
  islandGlassMode: false,
  islandBeatBloom: true,
  wallpaperBeatBloom: true,
  progressBarSeek: true,
  progressWheelSeek: true,
  animatedAlbumArt: true,
  motionBatterySaver: true
};

function resetPlaybackControlsIdleTimer() {
  if (playbackControlsIdleTimer) {
    clearTimeout(playbackControlsIdleTimer);
    playbackControlsIdleTimer = null;
  }

  if (!document.body) return;
  document.body.classList.remove('auto-hide-controls');
  try { if (typeof fitStudioTrackMetaLine === 'function') fitStudioTrackMetaLine(); } catch (_) {}
  document.getElementById('playback-widget')?.style.removeProperty('--playback-track-idle-shift');
  document.documentElement?.style.removeProperty('--playback-track-idle-shift');
  if (settings.taskbarMode || settings.wallpaperMode || settings.dynamicIslandMode ||
      document.body.classList.contains('taskbar-mode') ||
      document.body.classList.contains('wallpaper-mode') ||
      document.body.classList.contains('mode-dynamic-island')) return;

  const screenLyrics = document.getElementById('screen-lyrics');
  if (screenLyrics && !screenLyrics.classList.contains('active')) return;

  playbackControlsIdleTimer = setTimeout(() => {
    playbackControlsIdleTimer = null;
    const widget = document.getElementById('playback-widget');
    if (!document.body || !widget || settings.taskbarMode || settings.wallpaperMode || settings.dynamicIslandMode ||
        document.body.classList.contains('taskbar-mode') ||
        document.body.classList.contains('wallpaper-mode') ||
        document.body.classList.contains('mode-dynamic-island')) return;

    if (screenLyrics && !screenLyrics.classList.contains('active')) return;

    // Never auto-hide while the user is actively scrubbing or holding pointer down
    if (isScrubbingMainProgress || isScrubbingIslandProgress) return;

    // Do not auto-hide if focusing a text input / textarea
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'TEXTAREA' || (activeEl.tagName === 'INPUT' && activeEl.type !== 'range'))) {
      return;
    }
    // Release focus from buttons or progress sliders inside widget so sticky focus doesn't block autohide
    if (widget.contains(activeEl)) {
      try { activeEl.blur(); } catch (_) {}
    }

    const trackPanel = widget.querySelector(':scope > .widget-track-panel');
    const controls = widget.querySelector(':scope > .widget-controls');
    if (trackPanel && controls) {
      const trackRect = trackPanel.getBoundingClientRect();
      const controlsRect = controls.getBoundingClientRect();
      const stacked = controlsRect.top > trackRect.top + 2;
      document.body.classList.toggle('playback-controls-stacked', stacked);
      const shift = Math.max(0, controlsRect.top - trackRect.top) || 54;
      if (stacked || document.body.classList.contains('layout-split')) {
        widget.style.setProperty('--playback-track-idle-shift', `${shift}px`);
        document.documentElement?.style.setProperty('--playback-track-idle-shift', `${shift}px`);
      }
    }
    document.body.classList.add('auto-hide-controls');
    try { if (typeof fitStudioTrackMetaLine === 'function') fitStudioTrackMetaLine(); } catch (_) {}
  }, 2200);
}

// Playback State
let currentTrackId = null;
let currentTrackPlaybackSource = null;
let trackDuration = 0;
let isPlaying = false;
let lastSpotifyPlaybackData = null;
let lyrics = [];
let activeLineIndex = -1;
let pollingIntervalId = null;
let currentProgress = 0;
let lastPollProgress = 0;
function getHighResTime() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
}
let lastPollTimestamp = getHighResTime();
let cachedLineEls = [];
let isDraggingTb = false;
let hasMovedTb = false;
let lastTbContentWidth = 0;
let isScrubbingMainProgress = false;
let isScrubbingIslandProgress = false;
let lastUserSeekTimestamp = 0;
let lastUserSeekTargetMs = 0;

function openLyricsSearch(initialQuery = '', forceTrackSearch = false) {
  if (!searchOverlay) return;

  const catalogMode = forceTrackSearch || !Array.isArray(lyrics) || lyrics.length === 0;
  searchOverlay.dataset.searchMode = catalogMode ? 'catalog' : 'local';
  searchOverlay.classList.toggle('lyrics-track-search-active', catalogMode);
  searchOverlay.style.display = 'block';

  if (inputSearchLyrics) {
    inputSearchLyrics.placeholder = catalogMode
      ? 'Search for a song or artist to find lyrics…'
      : 'Find a phrase in the current lyrics…';
    inputSearchLyrics.value = String(initialQuery || '');
  }
  const results = document.getElementById('lyrics-search-results');
  if (results) {
    results.replaceChildren();
    results.hidden = !catalogMode;
  }
  if (searchResultsInfo) {
    searchResultsInfo.textContent = catalogMode ? 'Search by song or artist' : '0 matches';
  }

  if (inputSearchLyrics) {
    inputSearchLyrics.focus();
    inputSearchLyrics.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Acoustic Lead Calibration (ms)
// Calibrated Desktop Acoustic Lead Offset:
// Compensates for Windows WASAPI audio output buffer (~100-140ms) and Bluetooth queues
const SPOTIFY_ACOUSTIC_LEAD_MS = 0;

function getAcousticSyncProgress() {
  const leadOffset = (settings.bluetoothAcousticLead ? 240 : (settings.acousticLeadMs != null ? settings.acousticLeadMs : 140));
  return currentProgress + (settings.syncOffsetMs || 0) + SPOTIFY_ACOUSTIC_LEAD_MS + leadOffset;
}

function onTaskbarDragEnd() {
  if (isDraggingTb) endTaskbarDrag();
}
let userScrolling = false;
let userScrollTimeout = null;
let manualLyricScrollY = null;
let clickThroughState = null;

function setClickThroughCached(enable) {
  if (isDynamicIslandMode && enable) return;
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
    if (key && (key.startsWith('lyrics_cache_') || key.startsWith('lyrics_previous_lrc_') || key === 'lyricflow_lyrics_cache_index')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

const MAX_CACHED_TRACKS = 25; // Phase 2 memory optimization (reduced from const MAX_CACHED_TRACKS = 60;)
function saveLyricsToCache(cacheKey, dataObj) {
  try {
    const raw = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
    if (window.safeStorageSet) {
      window.safeStorageSet(cacheKey, raw);
    } else {
      localStorage.setItem(cacheKey, raw);
    }

    // Maintain bounded LRU index to prevent unbounded localStorage growth
    let cacheIndex = [];
    try {
      const savedIndex = localStorage.getItem('lyricflow_lyrics_cache_index');
      if (savedIndex) cacheIndex = JSON.parse(savedIndex);
    } catch (_) {}
    if (!Array.isArray(cacheIndex)) cacheIndex = [];

    // Move cacheKey to the front (most recent)
    cacheIndex = cacheIndex.filter(k => k !== cacheKey);
    cacheIndex.unshift(cacheKey);

    // Evict oldest items if exceeding capacity
    while (cacheIndex.length > MAX_CACHED_TRACKS) {
      const oldestKey = cacheIndex.pop();
      if (oldestKey) {
        localStorage.removeItem(oldestKey);
      }
    }
    localStorage.setItem('lyricflow_lyrics_cache_index', JSON.stringify(cacheIndex));
  } catch (e) {
    console.warn("[LF-CACHE] Failed to save lyrics to cache:", e);
  }
}

let isStartupMode = false;
let isTaskbarActiveInHost = false;
let lastSentTaskbarMode = null;
let lastSentWallpaperMode = null;
let lastSentWallpaperMonitor = null;
let _lastSyncedTaskbarMode = null;
let localArtCache = {};
try {
  // Purge deprecated v1 cache which may contain unverified/mismatched artwork
  localStorage.removeItem('lyricflow_local_art_cache');
  const savedArt = localStorage.getItem('lyricflow_local_art_cache_v2');
  if (savedArt) {
    const parsed = JSON.parse(savedArt);
    // Strip any data URLs that may have been stored in past sessions
    for (const [k, v] of Object.entries(parsed)) {
      // Older releases persisted failed lookups forever; allow this release to retry.
      if (v === 'notfound') continue;
      if (v && typeof v === 'string' && !v.startsWith('data:')) {
        localArtCache[k] = v;
      }
    }
  }
} catch (e) {}

function saveArtToCache(trackId, url, trackName, artistName) {
  // Only store and persist real web/http URLs, never massive base64 data URLs
  if (!url || typeof url !== 'string' || url.startsWith('data:')) return;
  if (trackId) localArtCache[trackId] = url;
  if (trackName && artistName) {
    const dualKey = `${artistName}:::${trackName}`.toLowerCase().trim();
    localArtCache[dualKey] = url;
  }
  try {
    while (Object.keys(localArtCache).length > 40) {
      const keys = Object.keys(localArtCache);
      delete localArtCache[keys[0]];
    }
    if (window.safeStorageSet) {
      window.safeStorageSet('lyricflow_local_art_cache_v2', JSON.stringify(localArtCache));
    } else {
      localStorage.setItem('lyricflow_local_art_cache_v2', JSON.stringify(localArtCache));
    }
  } catch (e) {}
}

const sessionArtMemoryCache = new Map();

function rememberArtInMemory(trackId, url, trackName, artistName) {
  if (!url || typeof url !== 'string' || url.startsWith('data:')) return;
  if (trackId) sessionArtMemoryCache.set(trackId, url);
  if (trackName && artistName) {
    const dualKey = `${artistName}:::${trackName}`.toLowerCase().trim();
    sessionArtMemoryCache.set(dualKey, url);
  }
  while (sessionArtMemoryCache.size > 30) {
    const firstKey = sessionArtMemoryCache.keys().next().value;
    sessionArtMemoryCache.delete(firstKey);
  }
}

/**
 * Detects whether a lyric line represents contributor credits, production metadata,
 * or non-lyric structural information (e.g. Composer, Lyricist, Producer, OP, SP).
 */
function isLyricMetadataOrCreditLine(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (!t) return false;

  // 1. LRC ID tags
  if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(t)) return true;

  // 2. NetEase instrumental / system notice tags
  if (t.includes('纯音乐，请欣赏') || t.includes('此歌曲为没有填词的纯音乐')) return true;

  // 3. Multi-character Chinese credit tags followed by colon (: or ： or -)
  const chineseMultiRegex = /^\s*(作\s*词|作\s*曲|填\s*词|谱\s*曲|制\s*作\s*人|制\s*作|编\s*曲|混\s*音|母\s*带|监\s*制|录\s*音|和\s*声|和\s*音|弦\s*乐|吉\s*他|贝\s*斯|鼓\s*手|打\s*击\s*乐|键\s*盘|钢\s*琴|企\s*划|统\s*筹|文\s*案|发\s*行|出\s*品|版\s*权|鸣\s*谢|提\s*供|词\s*曲|词\s*\/\s*曲|原\s*唱|翻\s*唱|策\s*划|伴\s*奏|音\s*频|后\s*期|剪\s*辑|设\s*计|封\s*面|发\s*行\s*人|录\s*音\s*室|混\s*音\s*室|母\s*带\s*室|录\s*音\s*师|混\s*音\s*师|母\s*带\s*师)\s*[:：\-]/i;
  if (chineseMultiRegex.test(t)) return true;

  // 4. Single-character Chinese credit tags ("词" or "曲") followed by colon
  const chineseSingleRegex = /^\s*(词|曲)\s*[:：\-]/;
  if (chineseSingleRegex.test(t)) return true;

  // 5. English contributor credit phrases
  const englishPrefixRegex = /^\s*(written\s+by|lyrics?\s+by|composed?\s+by|produced?\s+by|arranged?\s+by|mixed?\s+by|mastered?\s+by|recorded?\s+by|engineered?\s+by|published?\s+by|released?\s+by|remixed?\s+by|performed?\s+by|songwriters?:|writers?:|samples?:|sampled\s+from:|lyricists?:|composers?:|producers?:|arrangers?:|audio\s+engineers?:|mixing\s+engineers?:|mastering\s+engineers?:|vocal\s+producers?:)/i;
  if (englishPrefixRegex.test(t)) return true;

  // 6. English role words followed by colon
  const englishRoleRegex = /^\s*(producer|producers|composer|composers|lyricist|lyricists|arranger|arrangers|mixer|mastering|engineer|vocals|backing\s+vocals|guitar|guitars|bass|drums|keyboard|keyboards|piano|strings|lyrics|music|op|sp)\s*[:：\-]/i;
  if (englishRoleRegex.test(t)) return true;

  return false;
}

function extractLineText(l) {
  if (!l) return "";
  if (typeof l === "string") return l.trim();
  if (typeof l.text === "string" && l.text.trim()) return l.text.trim();
  if (typeof l.words === "string" && l.words.trim()) return l.words.trim();
  if (Array.isArray(l.words) && l.words.length > 0) {
    return l.words.map(w => (typeof w === 'string' ? w : (w.text || w.string || ""))).join(" ").trim();
  }
  return "";
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
      taskbarTextColor: getComputedStyle(document.documentElement).getPropertyValue('--taskbar-text-color').trim(),
      style: settings.taskbarStyle || 'minimal',
      taskbarStyle: settings.taskbarStyle || 'minimal'
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

let lastSpectrumBars = null;
let islandBoundsAnimFrame = null;

let lastPushedBounds = { x: -1, y: -1, width: -1, height: -1 };
const islandBoundsTransitionProperties = new Set();
const islandBoundsRelevantProperties = new Set(['width', 'height', 'transform']);

function pushDynamicIslandBounds(force = false) {
  if (!isDynamicIslandMode) return;
  // Suppress intermediate Win32 SetWindowPos calls during active transitions
  if (!force && islandBoundsTransitionProperties.size > 0) return;

  if (isIslandSleeping && document.body.classList.contains("island-sleeping")) {
    const zeroBounds = { x: 0, y: 0, width: 0, height: 0 };
    if (
      lastPushedBounds.x !== 0 ||
      lastPushedBounds.y !== 0 ||
      lastPushedBounds.width !== 0 ||
      lastPushedBounds.height !== 0
    ) {
      lastPushedBounds = zeroBounds;
      if (window.electronAPI && typeof window.electronAPI.updateIslandBounds === 'function') {
        window.electronAPI.updateIslandBounds(zeroBounds);
      }
    }
    return;
  }
  const pri = document.getElementById("dynamic-island");
  if (!pri || !window.electronAPI || typeof window.electronAPI.updateIslandBounds !== 'function') return;

  const r1 = pri.getBoundingClientRect();
  let unionLeft = r1.left;
  let unionTop = r1.top;
  let unionRight = r1.right;
  let unionBottom = r1.bottom;

  // If hovering / expanding or actively scrubbing progress, ensure target bounds cleanly cover expanded dimensions (460x140)
  if (
    isMouseOverDynamicIsland ||
    isScrubbingIslandProgress ||
    (pri && pri.classList.contains('is-scrubbing')) ||
    (typeof pri.matches === 'function' && pri.matches(':hover'))
  ) {
    const targetW = Math.min(460, ((typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1920) - 20);
    const targetH = 140;
    const midX = (unionLeft + unionRight) / 2;
    unionLeft = Math.min(unionLeft, midX - targetW / 2);
    unionRight = Math.max(unionRight, midX + targetW / 2);
    unionBottom = Math.max(unionBottom, unionTop + targetH);
  }

  // Include satellite translation island if visible
  const sat = document.getElementById("dynamic-island-translation");
  if (sat && sat.offsetWidth > 0 && sat.offsetHeight > 0) {
    const r2 = sat.getBoundingClientRect();
    if (r2.width > 0 && r2.height > 0) {
      unionLeft = Math.min(unionLeft, r2.left);
      unionTop = Math.min(unionTop, r2.top);
      unionRight = Math.max(unionRight, r2.right);
      unionBottom = Math.max(unionBottom, r2.bottom);
    }
  }

  // Include duet capsule if visible
  const duet = document.getElementById("island-duet-capsule");
  if (duet && duet.offsetWidth > 0 && duet.offsetHeight > 0) {
    const rDuet = duet.getBoundingClientRect();
    if (rDuet.width > 0 && rDuet.height > 0) {
      unionLeft = Math.min(unionLeft, rDuet.left);
      unionTop = Math.min(unionTop, rDuet.top);
      unionRight = Math.max(unionRight, rDuet.right);
      unionBottom = Math.max(unionBottom, rDuet.bottom);
    }
  }

  // Include in-app discovery prompt modal if open
  const promptModal = document.getElementById("island-prompt-modal");
  if (promptModal && promptModal.style.display !== 'none') {
    const r3 = promptModal.getBoundingClientRect();
    if (r3.width > 0 && r3.height > 0) {
      unionLeft = Math.min(unionLeft, r3.left);
      unionTop = Math.min(unionTop, r3.top);
      unionRight = Math.max(unionRight, r3.right);
      unionBottom = Math.max(unionBottom, r3.bottom);
    }
  }

  const newBounds = {
    x: Math.round(unionLeft),
    y: Math.round(unionTop),
    width: Math.round(unionRight - unionLeft),
    height: Math.round(unionBottom - unionTop)
  };

  // Skip IPC if bounds haven't changed
  if (
    lastPushedBounds.x === newBounds.x &&
    lastPushedBounds.y === newBounds.y &&
    lastPushedBounds.width === newBounds.width &&
    lastPushedBounds.height === newBounds.height
  ) {
    return;
  }

  lastPushedBounds = newBounds;
  window.electronAPI.updateIslandBounds(newBounds);
}

function startDynamicIslandBoundsTracking(durationMs = 280) {
  if (islandBoundsAnimFrame) {
    cancelAnimationFrame(islandBoundsAnimFrame);
    islandBoundsAnimFrame = null;
  }
  const startTime = performance.now();
  let lastTrackTime = 0;
  function track(now) {
    // R13: Throttle layout metric calculations to 20 Hz (50ms) to avoid browser reflow thrashing
    if (now - lastTrackTime >= 50) {
      pushDynamicIslandBounds();
      lastTrackTime = now;
    }
    if (now - startTime < durationMs && isDynamicIslandMode) {
      islandBoundsAnimFrame = requestAnimationFrame(track);
    } else {
      pushDynamicIslandBounds();
      islandBoundsAnimFrame = null;
    }
  }
  islandBoundsAnimFrame = requestAnimationFrame(track);
}

let currentIslandVolumePercent = 70;
let lastIslandMuteVolume = 70;
let isIslandMuted = false;
let islandHudTimeout = null;
let islandHudLeavingTimeout = null;

function applyIslandVisualizerStyle(style) {
  const s = style || settings.islandVisualizerStyle || 'bars';
  settings.islandVisualizerStyle = s;
  const islandWave = document.getElementById("island-wave");
  if (islandWave) {
    islandWave.classList.remove('visualizer-style-dots', 'visualizer-style-wave', 'visualizer-style-bars');
    if (s === 'dots') islandWave.classList.add('visualizer-style-dots');
    else if (s === 'wave') islandWave.classList.add('visualizer-style-wave');
    else islandWave.classList.add('visualizer-style-bars');
  }
}

function showIslandHud(options) {
  if (typeof options === 'string') {
    options = { text: options, showBar: false };
  }
  const { icon, text, percent, showBar = true } = options || {};
  const overlay = document.getElementById("island-hud-overlay");
  const iconEl = document.getElementById("island-hud-icon");
  const textEl = document.getElementById("island-hud-text");
  const barBg = document.getElementById("island-hud-bar-bg");
  const barFill = document.getElementById("island-hud-bar-fill");
  const islandEl = document.getElementById("dynamic-island");

  if (!overlay || !iconEl || !textEl) return;

  if (islandHudTimeout) clearTimeout(islandHudTimeout);
  if (islandHudLeavingTimeout) clearTimeout(islandHudLeavingTimeout);

  overlay.classList.remove("is-leaving");
  overlay.style.display = "flex";
  if (islandEl) islandEl.classList.add("island-has-hud");

  const volumeIcons = {
    'volume-high': '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h3l5 4V6l-5 4H4z"/><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11"/></svg>',
    'volume-low': '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h3l5 4V6l-5 4H4z"/><path d="M16 9a5 5 0 0 1 0 6"/></svg>',
    'volume-muted': '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h3l5 4V6l-5 4H4z"/><path d="m17 9 5 6m0-6-5 6"/></svg>'
  };
  if (volumeIcons[icon]) iconEl.innerHTML = volumeIcons[icon];
  else iconEl.textContent = icon || '';
  textEl.textContent = text || "";
  if (barBg && barFill) {
    barBg.style.display = showBar ? "block" : "none";
    if (typeof percent === "number") {
      barFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
  }

  islandHudTimeout = setTimeout(() => {
    overlay.classList.add("is-leaving");
    islandHudLeavingTimeout = setTimeout(() => {
      overlay.style.display = "none";
      overlay.classList.remove("is-leaving");
      if (islandEl) islandEl.classList.remove("island-has-hud");
    }, 200);
  }, 1200);
}

function updateIslandQualityBadge(overrideLossless, overrideHiRes, overrideSourceLevel) {
  const badge = document.getElementById("island-quality-badge");
  if (!badge) return;
  const hasTrack = Boolean(currentPlayingTrackObj || currentTrack);
  if (!hasTrack) {
    badge.style.display = 'none';
    badge.className = "island-quality-badge";
    return;
  }
  const isLossless = overrideLossless !== undefined ? Boolean(overrideLossless) : Boolean(currentIslandIsLossless);
  const isHiRes = overrideHiRes !== undefined ? Boolean(overrideHiRes) : Boolean(currentIslandIsHiRes);

  if (isLossless) {
    badge.textContent = isHiRes ? "HI-RES" : "LOSSLESS";
    badge.className = "island-quality-badge " + (isHiRes ? "badge-hires" : "badge-lossless");
    badge.style.display = "inline-flex";
  } else {
    badge.className = "island-quality-badge";
    badge.style.display = "none";
  }
}

function showIslandContextMenu(x, y) {
  const menu = document.getElementById("island-context-menu");
  if (!menu) return;
  menu.style.display = 'block';

  const island = document.getElementById("dynamic-island");
  const islandRect = island ? island.getBoundingClientRect() : null;
  const menuRect = menu.getBoundingClientRect();

  let posX = x;
  let posY = y;

  if (islandRect) {
    if (posX == null || posY == null) {
      posX = islandRect.left + (islandRect.width / 2) - (menuRect.width / 2);
      if (document.body.classList.contains("island-dock-bottom-center")) {
        posY = islandRect.top - menuRect.height - 8;
      } else {
        posY = islandRect.bottom + 8;
      }
    } else {
      if (document.body.classList.contains("island-dock-bottom-center")) {
        posY = Math.max(8, islandRect.top - menuRect.height - 8);
      } else {
        posY = islandRect.bottom + 8;
      }
      posX = Math.max(10, Math.min(window.innerWidth - menuRect.width - 10, posX - menuRect.width / 2));
    }
  } else {
    posX = Math.max(10, Math.min(window.innerWidth - menuRect.width - 10, (posX || 100)));
    posY = Math.max(10, Math.min(window.innerHeight - menuRect.height - 10, (posY || 100)));
  }

  menu.style.left = `${Math.round(posX)}px`;
  menu.style.top = `${Math.round(posY)}px`;

  requestAnimationFrame(() => {
    menu.classList.add("is-open");
  });
}

function hideIslandContextMenu() {
  const menu = document.getElementById("island-context-menu");
  if (!menu) return;
  menu.classList.remove("is-open");
  setTimeout(() => {
    if (!menu.classList.contains("is-open")) {
      menu.style.display = 'none';
    }
  }, 180);
}

// High-performance 2D Canvas Dynamic Island Visualizer (Phase 1.1 CPU Optimization)
let islandWaveCanvas = null;
let islandWaveCtx = null;

function getIslandWaveCanvasContext() {
  if (typeof document === 'undefined') return null;
  if (!islandWaveCanvas || !islandWaveCanvas.isConnected) {
    islandWaveCanvas = document.getElementById("island-wave-canvas");
    islandWaveCtx = (islandWaveCanvas && typeof islandWaveCanvas.getContext === 'function')
      ? islandWaveCanvas.getContext('2d')
      : null;
  }
  return islandWaveCtx;
}

let lastIslandCanvasDrawTime = 0;
let lastIslandCanvasVisStyle = null;

function drawIslandVisualizer(values, visStyle, isResting = false, isGap = false) {
  const ctx = getIslandWaveCanvasContext();
  if (!ctx) return;

  // High-Refresh-Rate Frame Rate Limiter (Phase 1.1):
  // Caps execution to 30 FPS (33.33ms) in Dynamic Island mode, 60 FPS (16.67ms) baseline
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const lastDraw = (typeof lastIslandCanvasDrawTime !== 'undefined') ? lastIslandCanvasDrawTime : (drawIslandVisualizer._lastDrawTime || 0);
  const lastStyle = (typeof lastIslandCanvasVisStyle !== 'undefined') ? lastIslandCanvasVisStyle : (drawIslandVisualizer._lastVisStyle || null);

  const dt = now - lastDraw;
  const frameIntervalLimit = (typeof isDynamicIslandMode !== 'undefined' && isDynamicIslandMode) ? 33.33 : 16.67;
  if (!isResting && dt > 0 && (dt < 33.33 && dt < frameIntervalLimit) && lastStyle === visStyle) {
    return;
  }
  if (typeof lastIslandCanvasDrawTime !== 'undefined') {
    lastIslandCanvasDrawTime = now;
  }
  if (typeof lastIslandCanvasVisStyle !== 'undefined') {
    lastIslandCanvasVisStyle = visStyle;
  }
  drawIslandVisualizer._lastDrawTime = now;
  drawIslandVisualizer._lastVisStyle = visStyle;

  const w = 56;
  const h = 18;
  ctx.clearRect(0, 0, w, h);

  const islandEl = (typeof document !== 'undefined') ? (typeof dynamicIslandMainEl !== 'undefined' ? (dynamicIslandMainEl || (dynamicIslandMainEl = document.getElementById("dynamic-island"))) : document.getElementById("dynamic-island")) : null;
  const isInstrumental = Boolean(islandEl && islandEl.classList.contains('island-instrumental-active'));
  const islandWave = (typeof document !== 'undefined') ? (typeof islandWaveEl !== 'undefined' ? (islandWaveEl || (islandWaveEl = document.getElementById("island-wave"))) : document.getElementById("island-wave")) : null;
  const isGapActive = Boolean(isGap || (islandWave && islandWave.classList.contains('is-lyric-gap-active')));
  const isPaused = Boolean(islandEl && islandEl.classList.contains('island-paused'));
  const isAccent = isInstrumental || isGapActive || isPaused;

  const barCount = (values && values.length > 0) ? values.length : ((typeof settings !== 'undefined' && settings.islandVisualizerBars) || 4);

  // Set visualizer opacity and color
  ctx.fillStyle = isAccent ? '#38bdf8' : '#ffffff';
  ctx.globalAlpha = isResting ? (isGapActive ? 0.9 : 0.35) : (isPaused ? 0.9 : 1.0);

  if (visStyle === 'dots') {
    const dotRadius = barCount >= 8 ? 1.8 : 2.0;
    const dotGap = barCount >= 8 ? 3.0 : (barCount >= 6 ? 3.5 : 4.5);
    const totalW = barCount * (dotRadius * 2) + (barCount - 1) * dotGap;
    const startX = (w - totalW) / 2 + dotRadius;
    const centerY = h / 2;

    for (let i = 0; i < barCount; i++) {
      let raw = (values && values[i] != null) ? values[i] : 0;
      if (isResting) {
        raw = isGapActive ? 0.25 : 0;
      } else {
        raw = Math.min(1.0, Math.pow(Math.max(0, raw), 0.72));
        if (raw < 0.015) raw = raw * (raw / 0.015);
      }

      const dotScale = isResting
        ? (isGapActive ? 1.0 : 0.8)
        : (isPaused ? 0.9 : (0.75 + raw * 0.95));
      const dotY = (isResting || isPaused)
        ? centerY
        : (centerY - raw * 5.0);
      const x = startX + i * (dotRadius * 2 + dotGap);
      const r = Math.max(1.0, dotRadius * dotScale);

      ctx.beginPath();
      ctx.arc(x, dotY, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Bars and Wave modes
    const barWidth = barCount >= 8 ? 2.5 : 3.0;
    const gap = barCount >= 8 ? 2.5 : (barCount >= 6 ? 3.0 : 4.0);
    const totalW = barCount * barWidth + (barCount - 1) * gap;
    const startX = (w - totalW) / 2;
    const maxBarHeight = 15.0;

    for (let i = 0; i < barCount; i++) {
      let raw = (values && values[i] != null) ? values[i] : 0;
      if (isResting) {
        raw = isGapActive ? 0.23 : 0;
      } else {
        raw = Math.min(1.0, Math.pow(Math.max(0, raw), 0.72));
        if (raw < 0.015) raw = raw * (raw / 0.015);
      }

      const clamped = isResting
        ? (isGapActive ? 0.34 : 0.14)
        : (isPaused ? 0.38 : Math.min(1.0, Math.max(0.14, 0.14 + raw * 0.86)));

      const barHeight = Math.max(2.1, clamped * maxBarHeight);
      const x = startX + i * (barWidth + gap);
      const y = h - barHeight - 1; // bottom anchored with 1px margin
      const radius = barWidth / 2;

      ctx.beginPath();
      if (visStyle === 'wave') {
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, isAccent ? '#38bdf8' : '#ffffff');
        grad.addColorStop(1, isAccent ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.45)');
        ctx.fillStyle = grad;
      }
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, barWidth, barHeight, radius);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1.0;
}

function setVisualizerBarCount(count) {
  const c = parseInt(count, 10) || 4;
  settings.islandVisualizerBars = c;
  const islandWave = document.getElementById("island-wave");
  if (islandWave) {
    const barsHtml = Array.from({ length: c }, (_, i) => `<span class="wave-bar bar-${i + 1}" style="display: none;"></span>`).join("");
    islandWave.innerHTML = `<canvas id="island-wave-canvas" class="island-wave-canvas" width="56" height="18"></canvas>${barsHtml}`;
    islandWaveCanvas = null;
    islandWaveCtx = null;
    lastSpectrumBars = islandWave.querySelectorAll(".wave-bar");
    applyIslandVisualizerStyle();
    if (typeof checkVisualizerFallback === 'function') {
      checkVisualizerFallback();
    }
  }
    const widthMap = { 4: '360px', 6: '375px', 8: '390px' };
  const compactWidth = widthMap[c] || '360px';
  document.documentElement.style.setProperty('--island-compact-width', compactWidth);
  const pausedWidthMap = { 4: '220px', 6: '230px', 8: '240px' };
  const pausedWidth = pausedWidthMap[c] || '210px';
  document.documentElement.style.setProperty('--island-paused-width', pausedWidth);
  setTimeout(pushDynamicIslandBounds, 50);
}

function applyFreeIslandPosition() {
  const dynamicIslandEl = document.getElementById("dynamic-island");
  if (!dynamicIslandEl) return;
  const pos = settings.islandCustomPos;
  const islandWidth = dynamicIslandEl.offsetWidth || 340;
  const viewportWidth = (typeof window !== 'undefined' ? window.innerWidth : 1920);
  const x = (pos && typeof pos.x === 'number') ? pos.x : Math.round((viewportWidth - islandWidth) / 2);
  const y = (pos && typeof pos.y === 'number') ? pos.y : 32;

  dynamicIslandEl.style.setProperty('--island-free-x', `${x}px`);
  dynamicIslandEl.style.setProperty('--island-free-y', `${y}px`);
}

function clearFreeIslandPosition() {
  const dynamicIslandEl = document.getElementById("dynamic-island");
  if (!dynamicIslandEl) return;
  dynamicIslandEl.style.removeProperty('--island-free-x');
  dynamicIslandEl.style.removeProperty('--island-free-y');
}

function calculateMagneticSnap(targetX, targetY, islandWidth, islandHeight, viewportWidth, viewportHeight, snapThreshold = 16) {
  let x = targetX;
  let y = targetY;

  // Left edge snap
  if (x < snapThreshold) {
    x = 0;
  } else if (x + islandWidth > viewportWidth - snapThreshold) {
    // Right edge snap
    x = viewportWidth - islandWidth;
  }

  // Top edge snap
  if (y < snapThreshold) {
    y = 0;
  } else if (y + islandHeight > viewportHeight - snapThreshold) {
    // Bottom edge snap
    y = viewportHeight - islandHeight;
  }

  // Center horizontal snap
  const centerX = (viewportWidth - islandWidth) / 2;
  if (Math.abs(x - centerX) <= snapThreshold) {
    x = centerX;
  }

  // Clamping within visible viewport
  x = Math.max(0, Math.min(viewportWidth - islandWidth, x));
  y = Math.max(0, Math.min(viewportHeight - islandHeight, y));

  return { x: Math.round(x), y: Math.round(y) };
}

const DYNAMIC_ISLAND_DOCK_POSITIONS = ['top-center', 'top-left', 'top-right', 'bottom-center', 'free'];

function normalizeDynamicIslandDockPosition(dockPos) {
  return DYNAMIC_ISLAND_DOCK_POSITIONS.includes(dockPos) ? dockPos : 'top-center';
}

function applyDynamicIslandDockClass(dockPos) {
  const pos = normalizeDynamicIslandDockPosition(dockPos || settings.dynamicIslandPosition);
  settings.dynamicIslandPosition = pos;
  const positionSelect = document.getElementById('select-island-position');
  if (positionSelect && positionSelect.value !== pos) positionSelect.value = pos;
  const allPositions = DYNAMIC_ISLAND_DOCK_POSITIONS;
  allPositions.forEach(p => {
    document.body.classList.remove(`island-dock-${p}`);
  });
  if (isDynamicIslandMode) {
    document.body.classList.add(`island-dock-${pos}`);
    if (pos === 'free') {
      applyFreeIslandPosition();
    } else {
      clearFreeIslandPosition();
    }
    setTimeout(pushDynamicIslandBounds, 50);
  }
}

let lastAudioEnergyTimestamp = 0;
let isVisualizerResting = false;

function checkVisualizerFallback() {
  const islandWave = isDynamicIslandMode ? document.getElementById("island-wave") : null;
  if (islandWave) {
    if (islandWave.classList.contains("is-fallback")) {
      islandWave.classList.remove("is-fallback");
    }
    const isAudioActive = Boolean(isPlaying) || document.body.classList.contains("is-playing");
    const msSinceEnergy = Date.now() - lastAudioEnergyTimestamp;

    const silenceThreshold = !isAudioActive ? 350 : 260;
    if (msSinceEnergy > silenceThreshold) {
      if (!isVisualizerResting) {
        isVisualizerResting = true;
        islandWave.classList.add("is-resting");
        const visStyle = settings.islandVisualizerStyle || 'bars';
        const gapBaseline = islandWave.classList.contains('is-lyric-gap-active');
        const ctx = (typeof getIslandWaveCanvasContext === 'function') ? getIslandWaveCanvasContext() : null;
        if (ctx && typeof drawIslandVisualizer === 'function') {
          drawIslandVisualizer(null, visStyle, true, gapBaseline);
        } else {
          const bars = lastSpectrumBars || islandWave.querySelectorAll(".wave-bar");
          if (bars && bars.length > 0) {
            bars.forEach(bar => {
              bar.style.transform = visStyle === 'dots'
                ? `scale(${gapBaseline ? '1' : '0.8'}) translateY(0px)`
                : `scaleY(${gapBaseline ? '0.34' : '0.14'})`;
            });
          }
        }
      }
    }
  }

  // Settle Instrumental Solo Stage and Desktop Live Visualizers during quiet passages
  const msSinceEnergyAll = Date.now() - lastAudioEnergyTimestamp;
  const isAudioActiveAll = Boolean(isPlaying) || document.body.classList.contains("is-playing");
  if (msSinceEnergyAll > (!isAudioActiveAll ? 350 : 260)) {
    const soloStage = document.getElementById("instrumental-solo-stage");
    if (soloStage) {
      const soloWave = soloStage.querySelector(".solo-visualizer-wave");
      if (soloWave && !soloWave.classList.contains("is-resting")) {
        soloWave.classList.add("is-resting");
        soloWave.classList.remove("is-live-audio");
        const soloBars = soloWave.querySelectorAll(".solo-bar");
        soloBars.forEach(b => {
          b.style.transform = 'scaleY(0.20)';
          b.style.opacity = '0.40';
        });
      }
    }
    const playerVis = document.getElementById("player-live-visualizer");
    if (playerVis && !playerVis.classList.contains("is-resting")) {
      playerVis.classList.add("is-resting");
      playerVis.querySelectorAll(".player-vis-bar").forEach(b => { b.style.transform = 'scaleY(0.18)'; });
    }
    const studioBadgeLive = document.getElementById("studio-badge-live");
    if (studioBadgeLive && !studioBadgeLive.classList.contains("is-resting")) {
      studioBadgeLive.classList.add("is-resting");
      studioBadgeLive.querySelectorAll(".studio-vis-bar").forEach(b => { b.style.transform = 'scaleY(0.18)'; });
    }
    syncAudioVisualizerState();
  }
}

// State management for Audio Visualizer Gating
let _currentAudioVisualizerActiveState = null;
function syncAudioVisualizerState() {
  // Track metadata remains populated while paused; only playback state may
  // keep audio capture active for the island visualizer.
  const isPlayingActive = (typeof isPlaying === 'undefined' && (typeof document === 'undefined' || !document.body)) ? true : Boolean((typeof isPlaying !== 'undefined' && isPlaying) || (typeof document !== 'undefined' && document.body && document.body.classList && typeof document.body.classList.contains === 'function' && document.body.classList.contains("is-playing")));
  const isIslandActive = Boolean(isDynamicIslandMode && !isIslandSleeping && isPlayingActive);
  const isWallpaperModeActive = Boolean(typeof settings !== 'undefined' && settings.wallpaperMode);
  const isWallpaperBloomActive = Boolean(isWallpaperModeActive && settings.wallpaperBeatBloom !== false && (typeof isWallpaperDesktopFocused === 'undefined' || isWallpaperDesktopFocused));
  const isVisible = document.visibilityState !== 'hidden' || isDynamicIslandMode || isWallpaperModeActive;

  // Consumer-aware desktop gating: only activate WASAPI loopback if an active visualizer consumer is mounted
  const soloStage = (typeof document !== 'undefined' && typeof document.getElementById === 'function') ? document.getElementById("instrumental-solo-stage") : null;
  const isSoloStageActive = Boolean(soloStage && soloStage.classList.contains("active"));
  const desktopLive = (typeof document !== 'undefined' && typeof document.getElementById === 'function') ? document.getElementById("player-live-visualizer") : null;
  const studioLive = (typeof document !== 'undefined' && typeof document.getElementById === 'function') ? document.getElementById("studio-badge-live") : null;
  const isDjActive = Boolean(
    typeof window !== 'undefined' &&
    window.djEngine &&
    (typeof window.djEngine.isDjProcessingEnabled === 'function' ? window.djEngine.isDjProcessingEnabled() : false)
  );
  const isSplitLayout = Boolean(typeof document !== 'undefined' && document.body && document.body.classList && typeof document.body.classList.contains === 'function' && document.body.classList.contains('layout-split'));
  const isDesktopVisActive = Boolean(
    (isSplitLayout && studioLive && (studioLive.offsetWidth > 0 || (studioLive.style && studioLive.style.display !== 'none' && studioLive.style.display !== '')) && (!studioLive.classList || typeof studioLive.classList.contains !== 'function' || !studioLive.classList.contains('is-resting'))) ||
    (!isSplitLayout && desktopLive && (desktopLive.offsetWidth > 0 || (desktopLive.style && desktopLive.style.display !== 'none' && desktopLive.style.display !== '')) && (!desktopLive.classList || typeof desktopLive.classList.contains !== 'function' || !desktopLive.classList.contains('is-resting')))
  );
  const hasDesktopVisualizer = Boolean(isSoloStageActive || isDesktopVisActive || isDjActive);
  const isDesktopActive = Boolean(!isDynamicIslandMode && !isWallpaperModeActive && hasDesktopVisualizer && isPlayingActive);

  const shouldBeActive = Boolean((isIslandActive || isWallpaperBloomActive || isDesktopActive) && isVisible);

  if (_currentAudioVisualizerActiveState !== shouldBeActive) {
    _currentAudioVisualizerActiveState = shouldBeActive;
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.setAudioVisualizerActive === 'function') {
      window.electronAPI.setAudioVisualizerActive(shouldBeActive);
    }
  }
  ensureVisualizerFallbackWatchdog();
}

let _currentMemoryTargetLevel = 'normal';
function updateMemoryTargetLevel(desiredLevel) {
  if (_currentMemoryTargetLevel === desiredLevel) return;
  _currentMemoryTargetLevel = desiredLevel;
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.setMemoryTargetLevel === 'function') {
    window.electronAPI.setMemoryTargetLevel(desiredLevel);
  }
}

// Low-overhead reactive silence watchdog (one-shot setTimeout instead of recurring setInterval)
let visualizerFallbackInterval = null; // Preserved identifier for legacy test sandboxes
let visualizerSilenceTimeout = null;

function ensureVisualizerFallbackWatchdog() {
  const isAnyActive = (isDynamicIslandMode && !isIslandSleeping) || (!isDynamicIslandMode && _currentAudioVisualizerActiveState);
  if (!isAnyActive) {
    if (typeof clearTimeout === 'function' && visualizerSilenceTimeout) {
      clearTimeout(visualizerSilenceTimeout);
      visualizerSilenceTimeout = null;
    }
    if (typeof clearInterval === 'function' && visualizerFallbackInterval) {
      clearInterval(visualizerFallbackInterval);
      visualizerFallbackInterval = null;
    }
  }
}

// High-performance audio spectrum event listener registry (Phase 3.1)
const audioSpectrumListeners = new Set();

function registerAudioSpectrumListener(fn) {
  if (typeof fn === 'function') {
    audioSpectrumListeners.add(fn);
  }
}

function unregisterAudioSpectrumListener(fn) {
  if (typeof fn === 'function') {
    audioSpectrumListeners.delete(fn);
  }
}

function syncDjSpectrumListener() {
  if (typeof window === 'undefined' || !window.djEngine) return;
  const isEnabled = typeof window.djEngine.isDjProcessingEnabled === 'function'
    ? window.djEngine.isDjProcessingEnabled()
    : Boolean(typeof settings !== 'undefined' && (settings.djAutoTransition || settings.djLyricAutoTransition || settings.djPreserveSolos || settings.djSmartQueue));

  if (isEnabled) {
    if (!window._djSpectrumListenerFn) {
      window._djSpectrumListenerFn = (bands) => {
        if (window.djEngine && typeof window.djEngine.recordSpectrumEnergy === 'function') {
          window.djEngine.recordSpectrumEnergy(bands);
        }
      };
    }
    registerAudioSpectrumListener(window._djSpectrumListenerFn);
  } else {
    if (window._djSpectrumListenerFn) {
      unregisterAudioSpectrumListener(window._djSpectrumListenerFn);
    }
    if (typeof window.djEngine.detach === 'function') {
      window.djEngine.detach();
    }
  }
  if (typeof syncAudioVisualizerState === 'function') {
    syncAudioVisualizerState();
  }
}

if (typeof window !== 'undefined') {
  window.audioSpectrumListeners = audioSpectrumListeners;
  window.registerAudioSpectrumListener = registerAudioSpectrumListener;
  window.unregisterAudioSpectrumListener = unregisterAudioSpectrumListener;
  window.syncDjSpectrumListener = syncDjSpectrumListener;
}

// Audio-Reactive Spectrum Equalizer Listener (Real Windows Loopback WASAPI Data)
let hasLoggedSpectrumTelemetry = false;
let _lastAudioSpectrumBands = null;
let _lastAudioSpectrumStyle = null;
if (window.electronAPI && typeof window.electronAPI.onAudioSpectrum === 'function') {
  window.electronAPI.onAudioSpectrum((bands) => {
    if (!Array.isArray(bands) || bands.length === 0) return;

    // Notify the fluid mesh of spectrum frames if active; mesh animation is
    // autonomously governed by its low-overhead frame rate governor.
    if (typeof shouldRunFluidMesh === 'function' && shouldRunFluidMesh() && window.fluidMesh) {
      if (typeof settings !== 'undefined' && settings.motionVisualizers === false) {
        window.fluidMesh.stop?.();
      } else if (typeof window.fluidMesh.renderSpectrumFrame === 'function') {
        window.fluidMesh.renderSpectrumFrame(bands);
      }
    }

    // Amplitude Deviation Threshold Gate (Phase 1.2 CPU Optimization):
    // Compare raw 8 bands against previous frame; if total absolute difference < 0.005,
    // short-circuit immediately to eliminate canvas redraws and CPU load on microscopic noise.
    let totalAbsDiff = 1.0;
    const lastBands = (typeof _lastAudioSpectrumBands !== 'undefined')
      ? _lastAudioSpectrumBands
      : (typeof window !== 'undefined' && window._lastAudioSpectrumBands ? window._lastAudioSpectrumBands : null);
    if (lastBands && lastBands.length === bands.length) {
      totalAbsDiff = 0;
      for (let i = 0; i < bands.length; i++) {
        totalAbsDiff += Math.abs((bands[i] || 0) - (lastBands[i] || 0));
      }
    }

    const hasEnergy = bands.some(b => typeof b === 'number' && b > 0.002);
    const curVisStyle = (typeof settings !== 'undefined' && settings.islandVisualizerStyle) ? settings.islandVisualizerStyle : 'bars';
    const lastVisStyle = (typeof _lastAudioSpectrumStyle !== 'undefined')
      ? _lastAudioSpectrumStyle
      : (typeof window !== 'undefined' && window._lastAudioSpectrumStyle ? window._lastAudioSpectrumStyle : null);
    const styleChanged = Boolean(lastVisStyle && lastVisStyle !== curVisStyle);

    if (!styleChanged && totalAbsDiff < 0.005) {
      // If already resting at baseline, or actively playing with imperceptible deviation, short-circuit immediately.
      // If not yet resting and audio dropped to silence, allow execution to fall through to settle into resting baseline.
      if (isVisualizerResting || hasEnergy) {
        return;
      }
    }
    if (typeof _lastAudioSpectrumBands !== 'undefined') {
      _lastAudioSpectrumBands = bands.slice();
    }
    if (typeof window !== 'undefined') {
      window._lastAudioSpectrumBands = bands.slice();
    }
    if (typeof _lastAudioSpectrumStyle !== 'undefined') {
      _lastAudioSpectrumStyle = curVisStyle;
    }
    if (typeof window !== 'undefined') {
      window._lastAudioSpectrumStyle = curVisStyle;
    }

    // Dispatch to registered audio spectrum listeners (Phase 3.1: e.g. DJ Engine when active)
    if (typeof audioSpectrumListeners !== 'undefined' && audioSpectrumListeners.size > 0) {
      for (const listener of audioSpectrumListeners) {
        try {
          listener(bands);
        } catch (e) {
          console.error('[LF-SPECTRUM] Listener error:', e);
        }
      }
    } else if (typeof window !== 'undefined' && window.audioSpectrumListeners && window.audioSpectrumListeners.size > 0) {
      for (const listener of window.audioSpectrumListeners) {
        try {
          listener(bands);
        } catch (e) {
          console.error('[LF-SPECTRUM] Listener error:', e);
        }
      }
    } else if (typeof window !== 'undefined' && window.djEngine && typeof window.djEngine.isDjProcessingEnabled === 'function' && window.djEngine.isDjProcessingEnabled()) {
      window.djEngine.recordSpectrumEnergy(bands);
    }
    // Keep a tiny spectrum snapshot for Cinematic Mode's existing RAF renderer.
    // No extra timer or IPC is introduced; the renderer smooths and decays this value.
    const cinematicActive = Boolean(document.body && (
      document.body.classList.contains('cinematic-view-active') ||
      (typeof settings !== 'undefined' && settings.wallpaperMode && settings.wallpaperStyle === 'cinematic')
    ));
    if (cinematicActive && typeof window !== 'undefined') {
      const bassBands = bands.slice(0, Math.min(2, bands.length));
      const bass = bassBands.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0) / Math.max(1, bassBands.length);
      window.__lfCinematicAudioLevels = { bass: Math.max(0, Math.min(1, bass)), timestamp: Date.now() };
    }
    if (document.body && document.body.classList && document.body.classList.contains('lf-reduced-visualizer-motion') && typeof settings !== 'undefined' && settings.motionVisualizers === false) return;
    // Execution Gating: verify at least one target visualizer UI or wallpaper beat bloom is active
    const soloStage = (!isDynamicIslandMode && !settings.wallpaperMode) ? document.getElementById("instrumental-solo-stage") : null;
    const isSoloStageActive = Boolean(soloStage && (soloStage.classList.contains("active") || soloStage.style.display !== 'none'));
    const isDesktopUiActive = Boolean(!isDynamicIslandMode && !settings.wallpaperMode && isSoloStageActive && (isPlaying || currentTitle || document.body.classList.contains("is-playing")));
    if (!isDynamicIslandMode && (!settings.wallpaperMode || settings.wallpaperBeatBloom === false) && !isSoloStageActive && !isDesktopUiActive) return;

    const islandWave = isDynamicIslandMode ? (typeof islandWaveEl !== 'undefined' ? (islandWaveEl || (islandWaveEl = document.getElementById("island-wave"))) : document.getElementById("island-wave")) : null;

    if (!hasLoggedSpectrumTelemetry) {
      hasLoggedSpectrumTelemetry = true;
      console.log('[LF-SPECTRUM] Live WASAPI audio spectrum active. Sample bands:', JSON.stringify(bands.map(b => Number(b.toFixed(3)))));
    }

    let bars = null;
    if (islandWave) {
      if (!lastSpectrumBars || lastSpectrumBars.length !== (settings.islandVisualizerBars || 4) || (lastSpectrumBars[0] && !lastSpectrumBars[0].isConnected)) {
        lastSpectrumBars = islandWave.querySelectorAll(".wave-bar");
      }
      bars = lastSpectrumBars;
    }

    // Audio energy floor checked (> 0.002 noise floor evaluated above)

    if (hasEnergy) {
      isVisualizerResting = false;
      lastAudioEnergyTimestamp = Date.now();
      if (typeof clearTimeout === 'function' && typeof visualizerSilenceTimeout !== 'undefined' && visualizerSilenceTimeout) {
        clearTimeout(visualizerSilenceTimeout);
        visualizerSilenceTimeout = null;
      }
    } else {
      const isAudioActive = Boolean(isPlaying) || document.body.classList.contains("is-playing");
      const msSinceEnergy = Date.now() - lastAudioEnergyTimestamp;
      const silenceThreshold = !isAudioActive ? 350 : 260;

      // Reactive one-shot silence detector: settle into resting baseline after silence threshold
      if (!isVisualizerResting && typeof visualizerSilenceTimeout !== 'undefined' && !visualizerSilenceTimeout && typeof setTimeout === 'function') {
        const remainingDelay = Math.max(0, silenceThreshold - msSinceEnergy);
        visualizerSilenceTimeout = setTimeout(() => {
          visualizerSilenceTimeout = null;
          checkVisualizerFallback();
          if (isDynamicIslandMode && typeof updateIslandEnergyMorph === 'function') updateIslandEnergyMorph([0, 0, 0, 0]);
          if (settings.wallpaperMode && typeof updateWallpaperLyricBeatBloom === 'function') updateWallpaperLyricBeatBloom(0);
        }, remainingDelay);
      }

      // When player is stopped/paused, only settle to resting baseline after >350ms of continuous silence
      if (!isAudioActive) {
        if (msSinceEnergy > 350) {
          if (typeof clearTimeout === 'function' && typeof visualizerSilenceTimeout !== 'undefined' && visualizerSilenceTimeout) {
            clearTimeout(visualizerSilenceTimeout);
            visualizerSilenceTimeout = null;
          }
          if (islandWave) {
            if (islandWave.classList.contains("is-fallback")) {
              islandWave.classList.remove("is-fallback");
            }
            if (!isVisualizerResting) {
              islandWave.classList.add("is-resting");
              const visStyle = settings.islandVisualizerStyle || 'bars';
              const gapBaseline = islandWave.classList.contains('is-lyric-gap-active');
              const ctx = (typeof getIslandWaveCanvasContext === 'function') ? getIslandWaveCanvasContext() : null;
              if (ctx && typeof drawIslandVisualizer === 'function') {
                drawIslandVisualizer(null, visStyle, true, gapBaseline);
              } else if (bars && bars.length > 0) {
                bars.forEach(bar => {
                  bar.style.transform = visStyle === 'dots'
                    ? `scale(${gapBaseline ? '1' : '0.8'}) translateY(0px)`
                    : `scaleY(${gapBaseline ? '0.34' : '0.14'})`;
                });
              }
              isVisualizerResting = true;
            }
          }
          checkVisualizerFallback();
          if (isDynamicIslandMode && typeof updateIslandEnergyMorph === 'function') updateIslandEnergyMorph([0, 0, 0, 0]);
          if (settings.wallpaperMode && typeof updateWallpaperLyricBeatBloom === 'function') updateWallpaperLyricBeatBloom(0);
          return;
        }
      } else {
        // Player is active but in a quiet passage or gap between tracks
        if (msSinceEnergy > silenceThreshold) {
          if (typeof clearTimeout === 'function' && typeof visualizerSilenceTimeout !== 'undefined' && visualizerSilenceTimeout) {
            clearTimeout(visualizerSilenceTimeout);
            visualizerSilenceTimeout = null;
          }
        }
        checkVisualizerFallback();
        if (isDynamicIslandMode && typeof updateIslandEnergyMorph === 'function') updateIslandEnergyMorph([0, 0, 0, 0]);
        if (settings.wallpaperMode && typeof updateWallpaperLyricBeatBloom === 'function') updateWallpaperLyricBeatBloom(0);
        return;
      }
    }

    // 1. Dynamic Island Visualizer (Bars, Dots, Wave)
    if (isDynamicIslandMode && islandWave && bars && bars.length > 0) {
      if (islandWave.classList.contains("is-fallback")) {
        islandWave.classList.remove("is-fallback");
      }
      islandWave.classList.remove("is-resting");

      const barCount = (bars && bars.length > 0) ? bars.length : (settings.islandVisualizerBars || 4);
      let values = [];
      if (barCount === 4) {
        // 4-Bar Equalizer:
        // Bar 0: Sub-bass & Kick transients (30 - 180 Hz)
        // Bar 1: Bass & Low-Mids / Snares (180 - 750 Hz)
        // Bar 2: Vocals & Mid-Presence (750 - 3500 Hz)
        // Bar 3: Hi-hats, Cymbals & Air (3500 - 15000 Hz)
        const b0 = Math.max(bands[0] || 0, bands[1] || 0) * 1.05;
        const b1 = Math.max(bands[2] || 0, bands[3] || 0) * 1.22;
        const b2 = Math.max(bands[4] || 0, bands[5] || 0) * 1.42;
        const b3 = Math.max(bands[6] || 0, bands[7] || 0) * 1.75;
        values = [b0, b1, b2, b3];
      } else if (barCount === 6) {
        values = [
          (bands[0] || 0) * 1.05,
          (bands[1] || 0) * 1.12,
          (((bands[2] || 0) + (bands[3] || 0)) * 0.5) * 1.25,
          (bands[4] || 0) * 1.38,
          (bands[5] || 0) * 1.55,
          Math.max(bands[6] || 0, bands[7] || 0) * 1.80
        ];
      } else {
        values = bands.slice(0, barCount).map((b, idx) => b * (1.0 + idx * 0.12));
      }

      const visStyle = settings.islandVisualizerStyle || 'bars';
      const ctx = (typeof getIslandWaveCanvasContext === 'function') ? getIslandWaveCanvasContext() : null;
      if (ctx && typeof drawIslandVisualizer === 'function') {
        // Primary path: Direct 2D Canvas rendering (zero DOM reflow and Blink recalcs)
        drawIslandVisualizer(values, visStyle, false, false);
      } else if (bars && bars.length > 0) {
        // Fallback path: Headless Node VM test mocks without Canvas support
        for (let i = 0; i < bars.length; i++) {
          let raw = values[i] != null ? values[i] : 0;
          // Perceptual dynamic expansion: power 0.72 brings out quiet vocal/hi-hat details
          raw = Math.min(1.0, Math.pow(Math.max(0, raw), 0.72));

          // Clean noise gate: sub-0.015 energy gently rolls off to zero to eliminate idle micro-twitch
          if (raw < 0.015) {
            raw = raw * (raw / 0.015);
          }

          if (visStyle === 'dots') {
            const dotScale = (0.75 + raw * 0.95).toFixed(2);
            const dotY = (-raw * 5.0).toFixed(1);
            bars[i].style.transform = `scale(${dotScale}) translateY(${dotY}px)`;
          } else {
            const clamped = Math.min(1.0, Math.max(0.14, 0.14 + raw * 0.86));
            bars[i].style.transform = `scaleY(${clamped.toFixed(3)})`;
          }
        }
      }

      // Dynamic Island Metamorphosis Energy Morphing
      updateIslandEnergyMorph(bands);
    }

    // 2. Apple-Style Wallpaper Lyric Beat Bloom
    if (settings.wallpaperMode && settings.wallpaperBeatBloom !== false) {
      if (typeof isWallpaperDesktopFocused === 'undefined' || isWallpaperDesktopFocused) {
        const subBass = Math.max((bands && bands[0]) || 0, (bands && bands[1]) || 0);
        updateWallpaperLyricBeatBloom(subBass);
      }
    }

    // 3. Instrumental Solo Stage Visualizer (Real WASAPI Audio Reactor)
    if (!isDynamicIslandMode && !settings.wallpaperMode && soloStage && (isSoloStageActive || soloStage.classList.contains("active"))) {
      const soloWave = soloStage.querySelector(".solo-visualizer-wave");
      if (soloWave) {
        const soloBars = soloWave.querySelectorAll(".solo-bar");
        if (soloBars && soloBars.length === 5) {
          soloWave.classList.add("is-live-audio");
          soloWave.classList.remove("is-resting");
          const s0 = Math.max(bands[0] || 0, bands[1] || 0) * 1.15;
          const s1 = (bands[2] || 0) * 1.30;
          const s2 = Math.max(bands[3] || 0, bands[4] || 0) * 1.50;
          const s3 = (bands[5] || 0) * 1.65;
          const s4 = Math.max(bands[6] || 0, bands[7] || 0) * 1.85;
          const soloValues = [s0, s1, s2, s3, s4];

          for (let i = 0; i < 5; i++) {
            let v = soloValues[i] || 0;
            v = Math.min(1.0, Math.pow(Math.max(0, v), 0.72));
            if (v < 0.015) v = v * (v / 0.015);
            const scale = Math.min(2.8, Math.max(0.20, 0.20 + v * 2.35));
            soloBars[i].style.transform = `scaleY(${scale.toFixed(3)})`;
            soloBars[i].style.opacity = Math.min(1.0, 0.55 + v * 0.45).toFixed(2);
          }
        }
      }
    }

    // 4. Desktop Live Equalizer (Player Bar & Studio Dock)
    if (!isDynamicIslandMode && !settings.wallpaperMode) {
      const desktopLive = document.getElementById("player-live-visualizer");
      const studioLive = document.getElementById("studio-badge-live");
      if (desktopLive || studioLive) {
        const d0 = Math.max(bands[0] || 0, bands[1] || 0) * 1.10;
        const d1 = (bands[2] || 0) * 1.25;
        const d2 = Math.max(bands[4] || 0, bands[5] || 0) * 1.45;
        const d3 = Math.max(bands[6] || 0, bands[7] || 0) * 1.75;
        const dVals = [d0, d1, d2, d3];
        const maxEnergy = Math.max(d0, d1, d2, d3);

        [desktopLive, studioLive].forEach(visContainer => {
          if (visContainer && visContainer.style && visContainer.style.display !== 'none') {
            if (typeof visContainer.offsetParent !== 'undefined' && visContainer.offsetParent === null) {
              return;
            }
            const isResting = visContainer.classList.contains("is-resting");
            if (isResting && maxEnergy < 0.015) {
              return;
            }
            visContainer.classList.add("is-live-audio");
            visContainer.classList.remove("is-resting");
            let dBars = visContainer._cachedVisBars;
            if (!dBars || !dBars.length || (dBars[0] && typeof dBars[0].isConnected !== 'undefined' && !dBars[0].isConnected)) {
              dBars = visContainer.querySelectorAll(".player-vis-bar, .studio-vis-bar");
              visContainer._cachedVisBars = dBars;
            }
            for (let i = 0; i < Math.min(dBars.length, 4); i++) {
              let v = dVals[i] || 0;
              v = Math.min(1.0, Math.pow(Math.max(0, v), 0.72));
              if (v < 0.015) v = v * (v / 0.015);
              const clamped = Math.min(1.0, Math.max(0.18, 0.18 + v * 0.82));
              const prevScale = dBars[i]._lastScale;
              if (prevScale === undefined || Math.abs(clamped - prevScale) >= 0.012 || (clamped === 0.18 && prevScale !== 0.18)) {
                dBars[i]._lastScale = clamped;
                dBars[i].style.transform = `scaleY(${clamped.toFixed(3)})`;
              }
            }
          }
        });
      }
    }
  });
}

function updateMarqueeOverflow(container, textElement, speedPxPerSec = 28) {
  if (!container || !textElement) return;
  textElement.classList.remove('is-overflowing');
  const diff = textElement.scrollWidth - container.clientWidth;
  if (diff > 4) {
    const dur = Math.max(4.0, (diff / speedPxPerSec) + 3.0);
    textElement.style.setProperty('--marquee-dist', `-${diff + 8}px`);
    textElement.style.setProperty('--marquee-dur', `${dur.toFixed(1)}s`);
    container.style.maskImage = 'linear-gradient(90deg, #000 0%, #000 calc(100% - 12px), transparent 100%)';
    container.style.webkitMaskImage = 'linear-gradient(90deg, #000 0%, #000 calc(100% - 12px), transparent 100%)';
    requestAnimationFrame(() => {
      textElement.classList.add('is-overflowing');
    });
  } else {
    container.style.maskImage = 'none';
    container.style.webkitMaskImage = 'none';
    textElement.style.removeProperty('--marquee-dist');
    textElement.style.removeProperty('--marquee-dur');
  }
}

let currentIslandAlbumArtUrl = null;
let islandArtTransitionTimer = null;

function triggerIslandArtTransition(newUrl) {
  const wrapper = document.getElementById("island-art-wrapper");
  const imgNew = document.getElementById("island-art-img");
  const imgOld = document.getElementById("island-art-img-old");
  const sweep = document.getElementById("island-art-sparkle-sweep");
  const dynamicIslandEl = document.getElementById("dynamic-island");

  if (!imgNew || !newUrl) return;

  if (!imgNew._hasArtListeners) {
    imgNew._hasArtListeners = true;
    imgNew.onload = () => {
      imgNew.style.display = 'block';
      imgNew.style.opacity = '1';
      imgNew.style.visibility = 'visible';
    };
    imgNew.onerror = () => {
      const fallback = currentStaticAlbumArtUrl || (typeof cachedCoverUrl !== 'undefined' ? cachedCoverUrl : null) || 'assets/icon.png';
      if (fallback && imgNew.src !== fallback) {
        imgNew.src = fallback;
      }
    };
  }

  const oldUrl = currentIslandAlbumArtUrl || (imgNew.getAttribute("src") || imgNew.src);
  currentIslandAlbumArtUrl = newUrl;
  if (document.body.classList.contains('lf-reduced-art-motion')) {
    imgNew.src = newUrl;
    imgNew.style.display = 'block';
    imgNew.style.opacity = '1';
    imgNew.style.visibility = 'visible';
    if (imgOld) imgOld.style.display = 'none';
    if (sweep) sweep.style.display = 'none';
    if (dynamicIslandEl) dynamicIslandEl.classList.remove('has-art-transition');
    return;
  }

  // Initial load, empty prior art, or same URL: instantaneous update
  if (!oldUrl || oldUrl === newUrl || oldUrl === '' || oldUrl.includes("about:blank") || !wrapper) {
    imgNew.src = newUrl;
    imgNew.style.display = 'block';
    imgNew.style.opacity = '1';
    imgNew.style.visibility = 'visible';
    imgNew.style.clipPath = '';
    if (imgOld) imgOld.style.display = 'none';
    if (sweep) sweep.style.display = 'none';
    if (dynamicIslandEl) dynamicIslandEl.classList.remove("has-art-transition");
    return;
  }

  // Clear any existing active transition timer
  if (islandArtTransitionTimer) {
    clearTimeout(islandArtTransitionTimer);
    islandArtTransitionTimer = null;
  }
  wrapper.classList.remove("art-transitioning");
  if (dynamicIslandEl) dynamicIslandEl.classList.remove("has-art-transition");
  void wrapper.offsetWidth; // Force reflow to re-trigger animations cleanly

  if (imgOld) {
    imgOld.src = oldUrl;
    imgOld.style.display = "block";
  }
  imgNew.src = newUrl;
  imgNew.style.display = "block";
  imgNew.style.opacity = "1";
  imgNew.style.visibility = "visible";

  if (sweep) {
    sweep.style.display = "block";
  }

  wrapper.classList.add("art-transitioning");
  if (dynamicIslandEl) dynamicIslandEl.classList.add("has-art-transition");

  islandArtTransitionTimer = setTimeout(() => {
    wrapper.classList.remove("art-transitioning");
    if (dynamicIslandEl) dynamicIslandEl.classList.remove("has-art-transition");
    if (imgOld) {
      imgOld.style.display = "none";
      imgOld.removeAttribute('src');
    }
    if (sweep) sweep.style.display = "none";
    if (imgNew) {
      imgNew.style.clipPath = "";
      imgNew.style.display = "block";
      imgNew.style.opacity = "1";
      imgNew.style.visibility = "visible";
    }
    islandArtTransitionTimer = null;
  }, 730);
}

// Reuse the island's small sparkle-wave language on the other album-art tiles.
// The old art remains visible underneath a brief particle shimmer, then fades away.
function setArtWithSparkle(img, url) {
  if (!img || !url) return;
  const oldUrl = img.currentSrc || img.src;
  if (img.src === url && oldUrl === url) return;
  if (document.body.classList.contains('lf-reduced-art-motion') || !oldUrl || oldUrl === url || oldUrl.includes('about:blank') || oldUrl.startsWith('data:image/svg+xml')) {
    if (img.src !== url) img.src = url;
    return;
  }
  if (img._artTransitionTimer) {
    clearTimeout(img._artTransitionTimer);
    img._artTransitionTimer = null;
  }
  const parent = img.parentElement;
  if (!parent) { img.src = url; return; }
  parent.querySelectorAll('.album-art-sparkle-old, .album-art-sparkle-wave').forEach(el => el.remove());
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  const oldLayer = document.createElement('img');
  oldLayer.src = oldUrl;
  oldLayer.alt = '';
  oldLayer.setAttribute('aria-hidden', 'true');
  oldLayer.className = 'album-art-sparkle-old';
  const computed = getComputedStyle(img);
  oldLayer.style.objectFit = computed.objectFit || 'cover';
  oldLayer.style.borderRadius = computed.borderRadius;
  parent.appendChild(oldLayer);
  img.src = url;
  const shimmer = document.createElement('span');
  shimmer.className = 'album-art-sparkle-wave';
  shimmer.setAttribute('aria-hidden', 'true');
  parent.appendChild(shimmer);
  requestAnimationFrame(() => {
    oldLayer.classList.add('is-revealing');
    shimmer.classList.add('is-sweeping');
  });
  img._artTransitionTimer = setTimeout(() => {
    oldLayer.remove();
    shimmer.remove();
    img._artTransitionTimer = null;
  }, 260);
}

function syncDynamicIslandState() {
  const isPlayingActive = Boolean(isPlaying);
  document.body.classList.toggle('is-playing', isPlayingActive);
  document.body.classList.toggle('app-paused', !isPlayingActive);

  const dynamicIslandEl = document.getElementById("dynamic-island");
  if (dynamicIslandEl) {
    dynamicIslandEl.classList.toggle('island-paused', !isPlayingActive);
    if (!isPlayingActive) {
      dynamicIslandEl.classList.remove('island-instrumental-active', 'island-has-hud');
      const ring = islandCountdownRingEl || document.getElementById("island-countdown-ring");
      if (ring) ring.style.display = 'none';
      currentIslandBreakTotalMs = 0;
      currentIslandBreakKey = null;
    }
  }

  const islandPlayIcon = document.getElementById("island-icon-play");
  const islandPauseIcon = document.getElementById("island-icon-pause");
  if (islandPlayIcon && islandPauseIcon) {
    islandPlayIcon.style.display = isPlayingActive ? 'none' : 'block';
    islandPauseIcon.style.display = isPlayingActive ? 'block' : 'none';
  }

  const islandArtImg = document.getElementById("island-art-img");
  if (islandArtImg) {
    const studioArtImg = document.getElementById("studio-art-img");
    const studioSrc = (studioArtImg && studioArtImg.src && !studioArtImg.src.includes('about:blank') && studioArtImg.style.display !== 'none') ? studioArtImg.src : '';
    const widgetSrc = (widgetAlbumArt && widgetAlbumArt.src && !widgetAlbumArt.src.includes('about:blank') && widgetAlbumArt.style.display !== 'none') ? widgetAlbumArt.src : '';
    const activeTrack = (typeof currentPlayingTrackObj !== 'undefined' && currentPlayingTrackObj) ? currentPlayingTrackObj : (typeof currentTrack !== 'undefined' ? currentTrack : null);
    const trackArt = activeTrack?.album?.images?.[2]?.url || activeTrack?.albumArtUrl || activeTrack?.album?.images?.[1]?.url || activeTrack?.album?.images?.[0]?.url || '';
    const cachedArt = activeTrack?.id ? (sessionArtMemoryCache.get(activeTrack.id) || localArtCache[activeTrack.id]) : '';

    const effectiveArt = studioSrc || widgetSrc || currentStaticAlbumArtUrl || trackArt || (cachedArt && cachedArt !== 'fetching' && cachedArt !== 'notfound' ? cachedArt : '') || (widgetAlbumArt?.src && !widgetAlbumArt.src.includes('about:blank') ? widgetAlbumArt.src : '') || (studioArtImg?.src && !studioArtImg.src.includes('about:blank') ? studioArtImg.src : '') || '';

    if (effectiveArt) {
      if (islandArtImg.src !== effectiveArt || currentIslandAlbumArtUrl !== effectiveArt) {
        triggerIslandArtTransition(effectiveArt);
      }
      islandArtImg.style.display = 'block';
      islandArtImg.style.opacity = '1';
      islandArtImg.style.visibility = 'visible';
    } else if (!document.body.classList.contains('has-animated-art-video')) {
      islandArtImg.style.display = 'none';
    }
  }

  const halo = document.getElementById("island-art-halo");
  if (halo) {
    const artColor = document.documentElement.style.getPropertyValue('--art-color-1') || 'rgba(255, 255, 255, 0.35)';
    halo.style.background = `radial-gradient(circle, ${artColor} 0%, transparent 70%)`;
  }

  const islandTitle = document.getElementById("island-track-title");
  const islandArtist = document.getElementById("island-track-artist");
  const trackObj = (typeof currentPlayingTrackObj !== 'undefined' && currentPlayingTrackObj) ? currentPlayingTrackObj : null;
  const trackTitle = (trackObj && trackObj.name) || (widgetTrackName && widgetTrackName.textContent ? widgetTrackName.textContent.trim() : 'LyricFlow');
  const trackArtist = (trackObj && trackObj.artists && trackObj.artists.length > 0)
    ? trackObj.artists.map(a => a.name).join(", ")
    : ((trackObj && trackObj.artist) || (widgetArtistName && widgetArtistName.textContent ? widgetArtistName.textContent.trim() : (isPlaying ? 'Playing...' : 'Waiting for music...')));

  if (islandTitle) {
    islandTitle.textContent = trackTitle;
    updateMarqueeOverflow(document.getElementById("island-title-wrapper"), islandTitle);
  }
  if (islandArtist) {
    islandArtist.textContent = trackArtist;
    updateMarqueeOverflow(document.getElementById("island-artist-wrapper"), islandArtist);
  }

  const islandPausedTitle = document.getElementById("island-paused-title");
  if (islandPausedTitle) {
    islandPausedTitle.textContent = trackTitle;
    updateMarqueeOverflow(document.getElementById("island-paused-title-wrapper"), islandPausedTitle);
  }

  // Dismiss or pull in satellite translation island and duet capsule when music stops/pauses
  if (!isPlayingActive) {
    if (lastSatelliteActiveState || document.body.classList.contains('has-satellite-active')) {
      hideSatelliteIsland(true);
    } else {
      hideSatelliteIsland(false);
      const satIsland = document.getElementById("dynamic-island-translation");
      if (satIsland) satIsland.style.display = 'none';
      const satBridge = document.getElementById("island-bridge");
      if (satBridge) satBridge.style.display = 'none';
      const satText = document.getElementById("island-satellite-text");
      if (satText) satText.textContent = '';
      document.body.classList.remove('has-satellite-active');
    }

    if (lastDuetActiveState || document.body.classList.contains('has-duet-active')) {
      hideDuetCapsule(true);
    } else {
      hideDuetCapsule(false);
      const duetCap = document.getElementById("island-duet-capsule");
      if (duetCap) duetCap.style.display = 'none';
      const duetBridge = document.getElementById("island-duet-bridge");
      if (duetBridge) duetBridge.style.display = 'none';
      const duetText = document.getElementById("island-duet-text");
      if (duetText) duetText.textContent = '';
      document.body.classList.remove('has-duet-active');
    }

    if (dynamicIslandEl && dynamicIslandEl.classList.contains('island-mode-stacked')) {
      dynamicIslandEl.classList.remove('island-mode-stacked');
    }
    const islandSubline = document.getElementById("island-lyric-subline");
    if (islandSubline) {
      islandSubline.style.display = 'none';
      islandSubline.textContent = '';
    }
  }

  if (!isScrubbingIslandProgress && trackDuration > 0) {
    setIslandProgress(currentProgress || 0, trackDuration);
  }

  const btnTrans = document.getElementById("island-btn-translate");
  if (btnTrans) {
    const isTransActive = (settings.islandTranslationMode || 'bilingual') !== 'none';
    btnTrans.classList.toggle('active', isTransActive);
  }

  if (typeof checkVisualizerFallback === 'function') {
    checkVisualizerFallback();
  }
}

let currentIslandOffset = 0;
let lastIslandActiveWordSpan = null;
let islandNowPlayingBufferUntil = 0;
let lastIslandPanTime = 0;

let islandProgressFillEl = null;
let islandProgressThumbEl = null;
let islandTimeCurrentEl = null;
let islandTimeRemainingEl = null;
let islandLineEl = null;
let islandSublineEl = null;
let islandExpLyricEl = null;
let dynamicIslandMainEl = null;
let islandBtnTranslateEl = null;
let satIslandEl = null;
let satBridgeEl = null;
let satTextEl = null;
let satLangEl = null;
let satMarqueeWrapperEl = null;
let islandLyricZoneEl = null;
let islandCountdownRingEl = null;
let islandCountdownRingFillEl = null;
let currentIslandBreakTotalMs = 0;
let currentIslandBreakKey = null;
let islandArtHaloEl = null;
let islandWaveEl = null;

function getDynamicIslandSyncData(syncProgress) {
  // 1. Now Playing 3-second intro buffer on song start / track change
  if (Date.now() < islandNowPlayingBufferUntil) {
    return { lineIndex: -4, lineData: null, isNowPlayingBuffer: true, isInstrumental: false, countdownMs: 0 };
  }

  if (!lyrics || lyrics.length === 0) {
    // Check if near end of song even without lyrics
    if (trackDuration > 0 && (trackDuration - syncProgress) <= 12000 && (trackDuration - syncProgress) > 500) {
      return { lineIndex: -3, lineData: null, isInstrumental: false, isSongEnd: true, countdownMs: Math.max(0, trackDuration - syncProgress) };
    }
    return { lineIndex: -1, lineData: null, isInstrumental: false };
  }

  const isUnsynced = lyrics[0].timeMs === 9999999;
  if (isUnsynced) {
    return { lineIndex: 0, lineData: lyrics[0], isInstrumental: false };
  }

  const firstLine = lyrics[0];
  const firstLineStart = (firstLine.timeMs != null && !isNaN(firstLine.timeMs))
    ? firstLine.timeMs
    : ((firstLine.start != null) ? firstLine.start * 1000 : 0);

  // 2. Song intro / prelude before first vocal line starts (280ms advance lead window)
  if (syncProgress < Math.max(0, firstLineStart - 280)) {
    const countdownMs = Math.max(0, firstLineStart - syncProgress);
    return { lineIndex: -1, lineData: null, isInstrumental: false, countdownMs };
  }

  function getLineTiming(line, next) {
    const start = (line.timeMs != null && !isNaN(line.timeMs))
      ? line.timeMs
      : ((line.start != null) ? line.start * 1000 : 0);

    const nextStart = next
      ? ((next.timeMs != null && !isNaN(next.timeMs)) ? next.timeMs : ((next.start != null) ? next.start * 1000 : Infinity))
      : Infinity;

    let end = 0;
    if (line.words && line.words.length > 0) {
      const lastW = line.words[line.words.length - 1];
      const lwStart = (lastW.start != null ? lastW.start * 1000 : lastW.timeMs) || start;
      const lwEnd = (lastW.endMs != null && lastW.endMs > 0)
        ? lastW.endMs
        : ((lastW.end != null && lastW.end > 0)
          ? ((lastW.end > 1000) ? lastW.end : lastW.end * 1000)
          : (lastW.durationMs ? lwStart + lastW.durationMs : (lastW.duration ? (lwStart + (lastW.duration >= 10 ? lastW.duration : lastW.duration * 1000)) : (lwStart + 450))));
      end = Math.max(lwEnd, lwStart + 450);
    } else if (line.endMs != null && line.endMs > 0) {
      end = line.endMs;
    } else if (line.end != null && line.end > 0) {
      end = (line.end > 1000) ? line.end : line.end * 1000;
    } else if (line.durationMs && line.durationMs > 0) {
      end = start + line.durationMs;
    } else if (line.duration && line.duration > 0) {
      const dur = Number(line.duration);
      end = start + (dur >= 20 ? dur : dur * 1000);
    } else {
      // Natural vocal duration for line-synced lyrics:
      // If gap to next line is reasonable (< 7s), line stays active for the phrase
      if (isFinite(nextStart) && nextStart > start) {
        const gap = nextStart - start;
        end = gap >= 7000 ? start + Math.min(gap - 2500, Math.max(3500, (line.text || '').length * 150)) : nextStart;
      } else {
        const textLen = (line.text || '').length;
        end = start + Math.max(3000, Math.min(10000, textLen * 160));
      }
    }

    if (isFinite(nextStart) && nextStart > start && end > nextStart) {
      end = nextStart;
    }

    return { start, end, nextStart };
  }

  // 3. Find matching line index with frame-accurate real-time synchrony (0ms offset)
  // O(1) Fast-Path forward check, binary search O(log N) on seeks (Zero allocation churn)
  function getLineStart(line) {
    if (!line) return 0;
    return (line.timeMs != null && !isNaN(line.timeMs))
      ? line.timeMs
      : ((line.start != null) ? line.start * 1000 : 0);
  }

  let idx = 0;
  const lastIdx = (lastIslandSyncData && typeof lastIslandSyncData.lineIndex === 'number') ? lastIslandSyncData.lineIndex : -1;
  let found = false;

  if (lastIdx >= 0 && lastIdx < lyrics.length) {
    const s0 = getLineStart(lyrics[lastIdx]);
    const sSwitch = (typeof getLineSwitchMs === 'function') ? getLineSwitchMs(lastIdx) : (lyrics[lastIdx + 1] ? getLineStart(lyrics[lastIdx + 1]) : Infinity);
    const effectiveS0 = Math.max(0, s0 - 280);
    if (syncProgress >= effectiveS0 && syncProgress < sSwitch) {
      idx = lastIdx;
      found = true;
    } else if (lyrics[lastIdx + 1] && syncProgress >= sSwitch) {
      const sSwitch2 = (typeof getLineSwitchMs === 'function') ? getLineSwitchMs(lastIdx + 1) : (lyrics[lastIdx + 2] ? getLineStart(lyrics[lastIdx + 2]) : Infinity);
      if (syncProgress < sSwitch2) {
        idx = lastIdx + 1;
        found = true;
      }
    }
  }

  if (!found) {
    let low = 0;
    let high = lyrics.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (getLineStart(lyrics[mid]) <= syncProgress) {
        idx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (idx > 0 && idx < lyrics.length && typeof getLineVocalEndMs === 'function') {
      const prevIdx = idx - 1;
      const prevLine = lyrics[prevIdx];
      if (prevLine && Array.isArray(prevLine.words) && prevLine.words.length > 0) {
        const prevVocalEnd = getLineVocalEndMs(prevLine, prevIdx);
        const curLine = lyrics[idx];
        const curVocalStart = (curLine.words && curLine.words.length > 0)
          ? ((curLine.words[0].start != null ? curLine.words[0].start * 1000 : curLine.words[0].timeMs) || curLine.timeMs)
          : curLine.timeMs;
        if (syncProgress < prevVocalEnd && syncProgress < curVocalStart) {
          idx = prevIdx;
        }
      }
    }
    // Advance lead window check for binary search (e.g. exiting break or seeking within 280ms of line onset)
    if (idx < lyrics.length - 1) {
      const sSwitch = (typeof getLineSwitchMs === 'function')
        ? getLineSwitchMs(idx)
        : (getLineStart(lyrics[idx + 1]) - 280);
      if (syncProgress >= sSwitch) {
        idx = idx + 1;
      }
    }
  }

  const curLine = lyrics[idx];
  const curTiming = getLineTiming(curLine, lyrics[idx + 1]);

  // 4. Outro / End-of-song detection: last line passed or final 12s of track
  const isLastLine = idx === lyrics.length - 1;
  const isPastLastLine = isLastLine && (syncProgress > curTiming.end + 1200);
  const isNearTrackEnd = (trackDuration > 0 && (trackDuration - syncProgress) <= 12000 && syncProgress > curTiming.end);

  if ((isPastLastLine || isNearTrackEnd) && trackDuration > 0 && (trackDuration - syncProgress) > 500) {
    const outroCountdownMs = Math.max(0, trackDuration - syncProgress);
    return { lineIndex: -3, lineData: null, isInstrumental: false, isSongEnd: true, countdownMs: outroCountdownMs };
  }

  // 5. Genuine Instrumental Break Detection:
  // Only trigger break if gap to next line is significant (>= 4.0s) AND there are at least 1.5s of instrumental silence after line dwell
  const isPastLine = syncProgress > curTiming.end + 1200;

  if (isPastLine && idx < lyrics.length - 1 && isFinite(curTiming.nextStart)) {
    const totalGap = curTiming.nextStart - curTiming.start;
    const breakDuration = curTiming.nextStart - (curTiming.end + 1200);
    const msUntilNext = curTiming.nextStart - syncProgress;
    // Only show instrumental break if it's a real musical interlude (>= 4.0s gap and >= 1.5s silence)
    // and stay in break until 280ms before next vocal line starts (msUntilNext > 280) so next line mounts and centers ahead of singing
    if (totalGap >= 4000 && breakDuration >= 1500 && msUntilNext > 280) {
      return { lineIndex: -2, lineData: null, isInstrumental: true, countdownMs: Math.max(0, msUntilNext) };
    }
  }

  return { lineIndex: idx, lineData: curLine, isInstrumental: false, countdownMs: 0 };
}

let lastPlaybackActivityMs = Date.now();
let isIslandSleeping = false;
let lastSatelliteActiveState = false;
let satelliteFuseTimeoutId = null;
let lastDuetActiveState = false;
let duetFuseTimeoutId = null;
let lastIslandSyncData = null;
let rollingAudioEnergy = 0.15;
let currentMorphTier = 'groove';
let lastMorphTierTime = Date.now();

// Metamorphosis: Duet & Backing Vocal Split Parser
function parseDuetVocalSplit(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 0. Explicit 2+ spaces or tab trigger before brackets (R4):
  // Detects: "Lead phrase  (Duet response)", "Lead  [Backing]", "Lead\t{Harmonies}", "Lead  （和声）", "Lead  【和声】"
  const twoSpaceMatch = text.match(/^(.*?)(?:[ \t]{2,}|\t)([\(\[\{（【][^\(\[\]\)\}）】]+[\)\]\}）】])[\s.?!,:;"'”’]*$/);
  if (twoSpaceMatch) {
    const lead = twoSpaceMatch[1].trim();
    const rawDuet = twoSpaceMatch[2].trim();
    const duet = rawDuet
      .replace(/^[\(\[\{（【]/, '')
      .replace(/[\)\]\}）】]$/, '')
      .replace(/[\)\]\}）】]\s*[\(\[\{（【]/g, ' ')
      .trim();
    const duetLower = duet.toLowerCase();
    const isMeta = duetLower.startsWith('feat') || duetLower.startsWith('ft.') ||
                   duetLower === 'instrumental' || duetLower === 'solo' ||
                   duetLower === 'intro' || duetLower === 'outro' ||
                   duetLower === 'chorus' || duetLower === 'verse' ||
                   duetLower === 'bridge';
    if (!isMeta && lead.length >= 1 && duet.length >= 1) {
      return { leadText: lead, duetText: duet, type: 'parenthetical' };
    }
  }

  // Some lyric sources separate a backing/ad-lib phrase using multiple spaces
  // but omit brackets. Run after bracket parsing so its cleanup takes priority.
  const spacedVocalMatch = trimmed.match(/^(.+?)[ \t]{2,}([^\s].+)$/);
  if (spacedVocalMatch && !/^[([{ï¼ˆã€]/.test(spacedVocalMatch[2]) &&
      spacedVocalMatch[1].trim().length >= 2 && spacedVocalMatch[2].trim().length >= 2) {
    return { leadText: spacedVocalMatch[1].trim(), duetText: spacedVocalMatch[2].trim(), type: 'spaced' };
  }

  // 1. Parenthetical backing vocals: "Lead phrase (Backing response)" or "[Backing response]"
  // Handles trailing punctuation (.?!,:;), multiple parentheticals, etc.
  const parenEndMatch = trimmed.match(/^(.*?)\s*([\(\[][^\(\[\]\)]+[\)\]](?:\s*[\(\[][^\(\[\]\)]+[\)\]])*)[\s.?!,:;"'”’]*$/);
  if (parenEndMatch && parenEndMatch[1].trim()) {
    const lead = parenEndMatch[1].trim();
    const rawDuet = parenEndMatch[2].trim();
    const duet = rawDuet.replace(/^[\(\[]/, '').replace(/[\)\]]$/, '').replace(/[\)\]]\s*[\(\[]/g, ' ');
    const duetLower = duet.toLowerCase();

    // Filter out metadata and structural tags
    const isMeta = duetLower.startsWith('feat') || duetLower.startsWith('ft.') ||
                   duetLower === 'instrumental' || duetLower === 'solo' ||
                   duetLower === 'intro' || duetLower === 'outro' ||
                   duetLower === 'chorus' || duetLower === 'verse' ||
                   duetLower === 'bridge';

    if (!isMeta && lead.length >= 2 && duet.length >= 2) {
      return { leadText: lead, duetText: duet, type: 'parenthetical' };
    }
  }

  // 2. Parenthetical at start: "(Backing response) Lead phrase"
  const parenStartMatch = trimmed.match(/^[\(\[]([^\(\[\]\)]+)[\)\]]\s*(.+)$/);
  if (parenStartMatch) {
    const duet = parenStartMatch[1].trim();
    const lead = parenStartMatch[2].trim();
    const duetLower = duet.toLowerCase();

    const isMeta = duetLower.startsWith('feat') || duetLower.startsWith('ft.') ||
                   duetLower === 'instrumental' || duetLower === 'solo' ||
                   duetLower === 'intro' || duetLower === 'outro' ||
                   duetLower === 'chorus' || duetLower === 'verse' ||
                   duetLower === 'bridge';

    if (!isMeta && lead.length >= 2 && duet.length >= 2) {
      return { leadText: lead, duetText: duet, type: 'parenthetical' };
    }
  }

  // 3. Attributed / colon split: "Artist 1: Line 1 / Artist 2: Line 2"
  if (trimmed.includes(':') && (trimmed.includes('/') || trimmed.includes('&') || trimmed.includes('|'))) {
    const parts = trimmed.split(/[\/&|]/);
    if (parts.length >= 2) {
      const lead = parts[0].replace(/^[^:]+:\s*/, '').trim();
      const duet = parts[1].replace(/^[^:]+:\s*/, '').trim();
      if (lead.length >= 2 && duet.length >= 2) {
        return { leadText: lead, duetText: duet, type: 'attributed' };
      }
    }
  }

  return null;
}

function getLeadWordsForDuet(words, duetSplit) {
  if (!words || words.length === 0 || !duetSplit) return words;
  if (duetSplit.type === 'parenthetical' || duetSplit.type === 'spaced') {
    const firstWordText = (words[0].text || words[0].word || '').trim();
    if (!/^[\(\[\{（【]/.test(firstWordText)) {
      const leadWords = [];
      for (let i = 0; i < words.length; i++) {
        const wt = (words[i].text || words[i].word || '').trim();
        if (/^[\(\[\{（【]/.test(wt)) {
          break;
        }
        leadWords.push(words[i]);
      }
      if (leadWords.length > 0 && leadWords.length < words.length) return leadWords;

      // Some providers include restored inter-word spaces in the display text
      // while omitting bracket markers from timed tokens. Match the lead
      // phrase prefix so backing tokens stay out of the lead karaoke line.
      const normalizeDuetWords = (value) => String(value || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      const targetLead = normalizeDuetWords(duetSplit.leadText);
      if (targetLead) {
        let matchedText = '';
        const matchedWords = [];
        for (const word of words) {
          const normalizedWord = normalizeDuetWords((word.text || word.word || '').trim());
          if (!normalizedWord) continue;
          matchedText += normalizedWord;
          matchedWords.push(word);
          if (matchedText === targetLead || matchedText.startsWith(targetLead)) return matchedWords;
          if (!targetLead.startsWith(matchedText)) break;
        }
      }
      return leadWords.length > 0 ? leadWords : words;
    } else {
      let pastParen = false;
      const leadWords = [];
      for (let i = 0; i < words.length; i++) {
        const wt = (words[i].text || words[i].word || '').trim();
        if (pastParen) {
          leadWords.push(words[i]);
        } else if (/[\)\]\}）】]/.test(wt)) {
          pastParen = true;
        }
      }
      return leadWords.length > 0 ? leadWords : words;
    }
  }
  return words;
}

function showSatelliteIsland() {
  const satIsland = document.getElementById("dynamic-island-translation");
  const satBridge = document.getElementById("island-bridge");
  const primaryIsland = document.getElementById("dynamic-island");
  if (!satIsland) return;

  if (satelliteFuseTimeoutId) {
    clearTimeout(satelliteFuseTimeoutId);
    satelliteFuseTimeoutId = null;
  }

  satIsland.classList.remove('satellite-fusing');
  if (satBridge) satBridge.classList.remove('bridge-fusing');

  if (!lastSatelliteActiveState) {
    lastSatelliteActiveState = true;
    document.body.classList.add('has-satellite-active');
    satIsland.style.display = 'flex';
    if (satBridge) {
      satBridge.style.display = 'block';
    }
    // Trigger organic cell-mitosis pinch animation on mother cell cleanly via rAF (zero layout thrashing)
    if (primaryIsland) {
      primaryIsland.classList.remove('island-cell-absorbing');
      primaryIsland.classList.remove('island-cell-pinching');
      requestAnimationFrame(() => {
        primaryIsland.classList.add('island-cell-pinching');
        setTimeout(() => {
          primaryIsland.classList.remove('island-cell-pinching');
        }, 400);
      });
    }
    pushDynamicIslandBounds();
    startDynamicIslandBoundsTracking(480);
  }
}

function hideSatelliteIsland(fuse = true) {
  const satIsland = document.getElementById("dynamic-island-translation");
  const satBridge = document.getElementById("island-bridge");
  const primaryIsland = document.getElementById("dynamic-island");
  if (!satIsland) return;

  if (fuse && satelliteFuseTimeoutId) {
    return; // Already actively fusing out; do not clear or restart timer!
  }

  if (satelliteFuseTimeoutId) {
    clearTimeout(satelliteFuseTimeoutId);
    satelliteFuseTimeoutId = null;
  }

  if (!lastSatelliteActiveState && !satelliteFuseTimeoutId && !document.body.classList.contains('has-satellite-active')) {
    if (satIsland.style.display !== 'none') satIsland.style.display = 'none';
    if (satBridge && satBridge.style.display !== 'none') satBridge.style.display = 'none';
    document.body.classList.remove('has-satellite-active');
    return;
  }

  if (fuse && (lastSatelliteActiveState || document.body.classList.contains('has-satellite-active'))) {
    lastSatelliteActiveState = false;
    satIsland.classList.add('satellite-fusing');
    if (satBridge) satBridge.classList.add('bridge-fusing');
    // Trigger organic cell-absorption reaction on mother cell cleanly via rAF (zero layout thrashing)
    if (primaryIsland) {
      primaryIsland.classList.remove('island-cell-pinching');
      primaryIsland.classList.remove('island-cell-absorbing');
      requestAnimationFrame(() => {
        primaryIsland.classList.add('island-cell-absorbing');
        setTimeout(() => {
          primaryIsland.classList.remove('island-cell-absorbing');
        }, 260);
      });
    }
    startDynamicIslandBoundsTracking(320);
    satelliteFuseTimeoutId = setTimeout(() => {
      satelliteFuseTimeoutId = null;
      document.body.classList.remove('has-satellite-active');
      satIsland.classList.remove('satellite-fusing');
      satIsland.style.display = 'none';
      if (satBridge) {
        satBridge.classList.remove('bridge-fusing');
        satBridge.style.display = 'none';
      }
      lastSatelliteActiveState = false;
      pushDynamicIslandBounds();
    }, 240);
  } else {
    lastSatelliteActiveState = false;
    document.body.classList.remove('has-satellite-active');
    satIsland.classList.remove('satellite-fusing');
    satIsland.style.display = 'none';
    if (satBridge) {
      satBridge.classList.remove('bridge-fusing');
      satBridge.style.display = 'none';
    }
    if (primaryIsland) {
      primaryIsland.classList.remove('island-cell-pinching', 'island-cell-absorbing');
    }
    pushDynamicIslandBounds();
  }
}

let duetTextAnimTimeout = null;
let duetTextCleanupTimeout = null;
function animateDuetTextChange(duetTextEl, duetMarqueeWrapper, newText) {
  if (!duetTextEl) return;
  if (duetTextEl.dataset.targetText === newText) return;
  duetTextEl.dataset.targetText = newText;

  if (!duetTextEl.textContent || duetTextEl.textContent === '•••' || duetTextEl.textContent === '♪ ♪ ♪') {
    if (duetTextAnimTimeout) { clearTimeout(duetTextAnimTimeout); duetTextAnimTimeout = null; }
    if (duetTextCleanupTimeout) { clearTimeout(duetTextCleanupTimeout); duetTextCleanupTimeout = null; }
    duetTextEl.classList.remove("duet-text-swapping", "duet-text-entering");
    duetTextEl.textContent = newText;
    if (duetMarqueeWrapper) updateMarqueeOverflow(duetMarqueeWrapper, duetTextEl);
    return;
  }
  if (duetTextAnimTimeout) clearTimeout(duetTextAnimTimeout);
  if (duetTextCleanupTimeout) clearTimeout(duetTextCleanupTimeout);

  duetTextEl.classList.remove("duet-text-entering");
  duetTextEl.classList.add("duet-text-swapping");

  duetTextAnimTimeout = setTimeout(() => {
    duetTextAnimTimeout = null;
    duetTextEl.textContent = newText;
    duetTextEl.classList.remove("duet-text-swapping");
    duetTextEl.classList.add("duet-text-entering");
    if (duetMarqueeWrapper) {
      updateMarqueeOverflow(duetMarqueeWrapper, duetTextEl);
    }
    duetTextCleanupTimeout = setTimeout(() => {
      duetTextCleanupTimeout = null;
      duetTextEl.classList.remove("duet-text-entering");
    }, 240);
  }, 120);
}

function showDuetCapsule(duetText) {
  const duetCap = document.getElementById("island-duet-capsule");
  const duetBridge = document.getElementById("island-duet-bridge");
  const duetTextEl = document.getElementById("island-duet-text");
  const duetMarquee = document.getElementById("island-duet-marquee-wrapper");
  const primaryIsland = document.getElementById("dynamic-island");
  if (!duetCap) return;

  // Never show or split duet capsule when music is paused, stopped, or island is sleeping!
  if (!isPlaying || document.body.classList.contains('app-paused') || isIslandSleeping) {
    hideDuetCapsule(false);
    return;
  }

  if (duetFuseTimeoutId) {
    clearTimeout(duetFuseTimeoutId);
    duetFuseTimeoutId = null;
  }

  duetCap.classList.remove('duet-fusing');
  const wasActive = lastDuetActiveState;
  if (!wasActive) {
    lastDuetActiveState = true;
    document.body.classList.add('has-duet-active');
    duetCap.style.display = 'flex';
    if (duetBridge) {
      duetBridge.classList.remove('bridge-fusing');
      duetBridge.style.display = 'block';
    }
    // Trigger organic cell-mitosis pinch animation on mother cell cleanly via rAF (zero layout thrashing)
    if (primaryIsland) {
      primaryIsland.classList.remove('island-cell-absorbing');
      primaryIsland.classList.remove('island-cell-pinching');
      requestAnimationFrame(() => {
        primaryIsland.classList.add('island-cell-pinching');
        setTimeout(() => {
          primaryIsland.classList.remove('island-cell-pinching');
        }, 400);
      });
    }

    // On initial cell emergence / split, render text immediately so cell is never empty while budding
    if (duetTextEl) {
      if (duetTextAnimTimeout) { clearTimeout(duetTextAnimTimeout); duetTextAnimTimeout = null; }
      if (duetTextCleanupTimeout) { clearTimeout(duetTextCleanupTimeout); duetTextCleanupTimeout = null; }
      duetTextEl.classList.remove("duet-text-swapping", "duet-text-entering");
      duetTextEl.dataset.targetText = duetText;
      duetTextEl.textContent = duetText;
      if (duetMarquee) updateMarqueeOverflow(duetMarquee, duetTextEl);
    }

    pushDynamicIslandBounds();
    startDynamicIslandBoundsTracking(480);
    return;
  }

  // Already active: check if text actually changed before animating
  if (duetTextEl && duetTextEl.dataset.targetText !== duetText && duetTextEl.textContent !== duetText) {
    animateDuetTextChange(duetTextEl, duetMarquee, duetText);
  }
}

function hideDuetCapsule(fuse = true) {
  const duetCap = document.getElementById("island-duet-capsule");
  const duetBridge = document.getElementById("island-duet-bridge");
  const duetTextEl = document.getElementById("island-duet-text");
  const primaryIsland = document.getElementById("dynamic-island");
  if (!duetCap) return;

  if (fuse && duetFuseTimeoutId) {
    return; // Already actively fusing out; do not clear or restart timer!
  }

  if (duetFuseTimeoutId) {
    clearTimeout(duetFuseTimeoutId);
    duetFuseTimeoutId = null;
  }
  if (duetTextAnimTimeout) {
    clearTimeout(duetTextAnimTimeout);
    duetTextAnimTimeout = null;
  }
  if (duetTextCleanupTimeout) {
    clearTimeout(duetTextCleanupTimeout);
    duetTextCleanupTimeout = null;
  }

  if (!lastDuetActiveState && !duetFuseTimeoutId && !document.body.classList.contains('has-duet-active')) {
    if (duetCap.style.display !== 'none') duetCap.style.display = 'none';
    if (duetBridge && duetBridge.style.display !== 'none') duetBridge.style.display = 'none';
    document.body.classList.remove('has-duet-active');
    return;
  }

  if (duetTextEl) {
    duetTextEl.dataset.targetText = "";
    duetTextEl.classList.remove("duet-text-swapping", "duet-text-entering", "is-overflowing");
  }

  if (fuse && (lastDuetActiveState || document.body.classList.contains('has-duet-active'))) {
    lastDuetActiveState = false;
    duetCap.classList.add('duet-fusing');
    if (duetBridge) duetBridge.classList.add('bridge-fusing');
    // Trigger organic cell-absorption reaction on mother cell cleanly via rAF (zero layout thrashing)
    if (primaryIsland) {
      primaryIsland.classList.remove('island-cell-pinching');
      primaryIsland.classList.remove('island-cell-absorbing');
      requestAnimationFrame(() => {
        primaryIsland.classList.add('island-cell-absorbing');
        setTimeout(() => {
          primaryIsland.classList.remove('island-cell-absorbing');
        }, 260);
      });
    }
    startDynamicIslandBoundsTracking(320);
    duetFuseTimeoutId = setTimeout(() => {
      duetFuseTimeoutId = null;
      document.body.classList.remove('has-duet-active');
      duetCap.classList.remove('duet-fusing');
      duetCap.style.display = 'none';
      if (duetBridge) {
        duetBridge.classList.remove('bridge-fusing');
        duetBridge.style.display = 'none';
      }
      if (duetTextEl) {
        duetTextEl.textContent = "";
      }
      lastDuetActiveState = false;
      pushDynamicIslandBounds();
    }, 240);
  } else {
    lastDuetActiveState = false;
    document.body.classList.remove('has-duet-active');
    duetCap.classList.remove('duet-fusing');
    duetCap.style.display = 'none';
    if (duetBridge) {
      duetBridge.classList.remove('bridge-fusing');
      duetBridge.style.display = 'none';
    }
    if (duetTextEl) {
      duetTextEl.textContent = "";
    }
    if (primaryIsland) {
      primaryIsland.classList.remove('island-cell-pinching', 'island-cell-absorbing');
    }
    pushDynamicIslandBounds();
  }
}

let lastWallpaperBloomState = false;
let smoothedWallpaperBloom = 0;
let _lastAppliedGlowRadius = null;
let _lastAppliedGlowAlpha = null;
let _lastAppliedScaleBump = null;

const WALLPAPER_BLOOM_ENTER = 0.07;
const WALLPAPER_BLOOM_RELEASE = 0.045;
const WALLPAPER_SCALE_DEADBAND = 0.004;
const WALLPAPER_ALPHA_DEADBAND = 0.04;
const WALLPAPER_GLOW_DEADBAND = 2; // px

function getWallpaperLyricsElement() {
  return document.getElementById('lyrics-container');
}
function setStylePropertyIfChanged(element, property, value) {
  if (!element) return;
  const cache = element._stylePropCache || (element._stylePropCache = Object.create(null));
  if (cache[property] !== value) {
    cache[property] = value;
    element.style.setProperty(property, value);
  }
}
function removeStylePropertyCached(element, property) {
  if (!element) return;
  if (element._stylePropCache) {
    delete element._stylePropCache[property];
  }
  element.style.removeProperty(property);
}
function updateWallpaperLyricBeatBloom(subBass) {
  const lyricsEl = getWallpaperLyricsElement();
  if (!settings.wallpaperMode || settings.wallpaperBeatBloom === false || !isPlaying || (typeof isWallpaperDesktopFocused !== 'undefined' && !isWallpaperDesktopFocused)) {
    smoothedWallpaperBloom = 0;
    if (lastWallpaperBloomState) {
      lastWallpaperBloomState = false;
      _lastAppliedGlowRadius = null;
      _lastAppliedGlowAlpha = null;
      _lastAppliedScaleBump = null;
      document.body.classList.remove('has-beat-bloom');
      if (lyricsEl) {
        lyricsEl.style.removeProperty('--wb-bloom-glow');
        lyricsEl.style.removeProperty('--wb-bloom-alpha');
        lyricsEl.style.removeProperty('--wb-beat-scale');
      }
    }
    return;
  }

  // Audio peak envelope: smooth attack & natural exponential release
  let currentSub = (typeof subBass === 'number' && !isNaN(subBass)) ? Math.max(0, subBass) : 0;

  // Fallback pulse generator: if WASAPI audio loopback is silent/unrouted (>1.2s without audio packet)
  // synthesize a smooth, organic bell-curve breathing pulse in sync with the song playback timeline
  if (currentSub < 0.05 && isPlaying && (Date.now() - lastAudioEnergyTimestamp > 1200)) {
    const cycleMs = 600; // 100 bpm relaxed breathing cadence
    const phaseNorm = (currentProgress % cycleMs) / cycleMs; // 0.0 to 1.0
    if (phaseNorm < 0.45) {
      const sinPhase = (phaseNorm / 0.45) * Math.PI;
      currentSub = 0.50 * Math.sin(sinPhase) * Math.sin(sinPhase); // smooth C^1 continuous bell curve
    } else {
      currentSub = 0;
    }
  }

  // Smooth attack and release filter (eliminates abrupt jumps and jitters)
  if (currentSub > smoothedWallpaperBloom) {
    smoothedWallpaperBloom += (currentSub - smoothedWallpaperBloom) * 0.42;
  } else {
    smoothedWallpaperBloom += (currentSub - smoothedWallpaperBloom) * 0.12;
  }

  // Schmitt trigger hysteresis: avoids rapid toggling from ambient noise near threshold
  const shouldBloom = lastWallpaperBloomState
    ? smoothedWallpaperBloom >= WALLPAPER_BLOOM_RELEASE
    : smoothedWallpaperBloom > WALLPAPER_BLOOM_ENTER;

  if (shouldBloom) {
    if (!lastWallpaperBloomState) {
      document.body.classList.add('has-beat-bloom');
      lastWallpaperBloomState = true;
      _lastAppliedGlowRadius = null;
      _lastAppliedGlowAlpha = null;
      _lastAppliedScaleBump = null;
    }
    const norm = Math.min(1.0, (smoothedWallpaperBloom - WALLPAPER_BLOOM_RELEASE) / (1.0 - WALLPAPER_BLOOM_RELEASE));
    const glowRadius = Math.round(norm * 24 + 8); // 8px to 32px
    const glowAlpha = Number((0.30 + norm * 0.60).toFixed(2)); // 0.30 to 0.90
    const scaleBump = Number((1.012 + norm * 0.038).toFixed(3)); // 1.012 to 1.050

    if (lyricsEl) {
      // Numeric deadbands: suppress imperceptible micro-variations
      if (_lastAppliedGlowRadius === null || Math.abs(glowRadius - _lastAppliedGlowRadius) >= WALLPAPER_GLOW_DEADBAND) {
        setStylePropertyIfChanged(lyricsEl, '--wb-bloom-glow', `${glowRadius}px`);
        _lastAppliedGlowRadius = glowRadius;
      }
      if (_lastAppliedGlowAlpha === null || Math.abs(glowAlpha - _lastAppliedGlowAlpha) >= WALLPAPER_ALPHA_DEADBAND) {
        setStylePropertyIfChanged(lyricsEl, '--wb-bloom-alpha', glowAlpha.toFixed(2));
        _lastAppliedGlowAlpha = glowAlpha;
      }
      if (_lastAppliedScaleBump === null || Math.abs(scaleBump - _lastAppliedScaleBump) >= WALLPAPER_SCALE_DEADBAND) {
        setStylePropertyIfChanged(lyricsEl, '--wb-beat-scale', scaleBump.toFixed(3));
        _lastAppliedScaleBump = scaleBump;
      }
    }
  } else if (lastWallpaperBloomState) {
    lastWallpaperBloomState = false;
    _lastAppliedGlowRadius = null;
    _lastAppliedGlowAlpha = null;
    _lastAppliedScaleBump = null;
    document.body.classList.remove('has-beat-bloom');
    if (lyricsEl) {
      lyricsEl.style.removeProperty('--wb-bloom-glow');
      lyricsEl.style.removeProperty('--wb-bloom-alpha');
      lyricsEl.style.removeProperty('--wb-beat-scale');
    }
  }
}

let smoothedIslandBloom = 0;
let lastAppliedMorphTier = null;

let _lastIslandMorphCssTime = 0;
let _lastIslandBloomRadius = null;
let _lastIslandBloomAlpha = null;
let _lastIslandHaloOpacity = null;
let _lastIslandHaloScale = null;
let _lastIslandBeatScale = null;

const ISLAND_BLOOM_ALPHA_DEADBAND = 0.04;
const ISLAND_BLOOM_RADIUS_DEADBAND = 2;
const ISLAND_HALO_OPACITY_DEADBAND = 0.04;
const ISLAND_HALO_SCALE_DEADBAND = 0.005;
const ISLAND_BEAT_SCALE_DEADBAND = 0.002;

function updateIslandEnergyMorph(bands) {
  if (!isDynamicIslandMode || isIslandSleeping) return;

  const islandEl = (typeof dynamicIslandMainEl !== 'undefined' ? dynamicIslandMainEl : null) || document.getElementById("dynamic-island");
  if (!islandEl) return;

  if (!settings.islandMetamorphosis) {
    if (lastAppliedMorphTier !== null) {
      document.body.classList.remove('island-morph-calm', 'island-morph-groove', 'island-morph-climax', 'island-morph-solo');
      lastAppliedMorphTier = null;
    }
    _lastIslandBloomRadius = null;
    _lastIslandBloomAlpha = null;
    _lastIslandHaloOpacity = null;
    _lastIslandHaloScale = null;
    _lastIslandBeatScale = null;
    islandEl.style.removeProperty('--island-bloom-radius');
    islandEl.style.removeProperty('--island-bloom-alpha');
    islandEl.style.removeProperty('--island-beat-scale');
    islandEl.style.removeProperty('box-shadow');
    const haloEl = islandArtHaloEl || (typeof document !== 'undefined' && document.getElementById ? document.getElementById("island-art-halo") : null);
    if (haloEl) {
      haloEl.style.removeProperty('--island-halo-opacity');
      haloEl.style.removeProperty('--island-halo-scale');
    }
    smoothedIslandBloom = 0;
    return;
  }

  // Calculate instant RMS energy across bands
  let sumSq = 0;
  let count = 0;
  if (Array.isArray(bands) && bands.length > 0) {
    for (let i = 0; i < bands.length; i++) {
      const v = typeof bands[i] === 'number' ? bands[i] : 0;
      sumSq += v * v;
      count++;
    }
  }
  const instantRms = count > 0 ? Math.sqrt(sumSq / count) : 0;

  // Exponential moving average smoothing: 88% history, 12% instant
  rollingAudioEnergy = rollingAudioEnergy * 0.88 + instantRms * 0.12;

  // Sub-bass intensity (first two bands: 30Hz - 250Hz)
  const subBass = Math.max((bands && bands[0]) || 0, (bands && bands[1]) || 0);

  // Dynamic Beat Bloom: fast peak attack + smooth ~150ms exponential decay (zero getComputedStyle)
  const now = Date.now();
  const canUpdateCss = (now - _lastIslandMorphCssTime >= 48); // ~20 Hz throttle

  if (settings.islandBeatBloom) {
    if (subBass > smoothedIslandBloom) {
      smoothedIslandBloom = subBass;
    } else {
      smoothedIslandBloom = smoothedIslandBloom * 0.86;
    }

    if (smoothedIslandBloom > 0.60) {
      if (canUpdateCss) {
        const norm = Math.min(1.0, (smoothedIslandBloom - 0.60) / 0.40);
        const bloomRadius = Math.round(norm * 24 + 10);
        const bloomAlpha = Math.min(0.75, (0.30 + norm * 0.45)).toFixed(2);
        if (_lastIslandBloomRadius === null || Math.abs(bloomRadius - _lastIslandBloomRadius) >= ISLAND_BLOOM_RADIUS_DEADBAND) {
          setStylePropertyIfChanged(islandEl, '--island-bloom-radius', `${bloomRadius}px`);
          _lastIslandBloomRadius = bloomRadius;
        }
        if (_lastIslandBloomAlpha === null || Math.abs(parseFloat(bloomAlpha) - parseFloat(_lastIslandBloomAlpha)) >= ISLAND_BLOOM_ALPHA_DEADBAND) {
          setStylePropertyIfChanged(islandEl, '--island-bloom-alpha', bloomAlpha);
          _lastIslandBloomAlpha = bloomAlpha;
        }
      }
    } else {
      if (_lastIslandBloomRadius !== null || _lastIslandBloomAlpha !== null) {
        _lastIslandBloomRadius = null;
        _lastIslandBloomAlpha = null;
        if (islandEl.style.getPropertyValue('--island-bloom-radius')) islandEl.style.removeProperty('--island-bloom-radius');
        if (islandEl.style.getPropertyValue('--island-bloom-alpha')) islandEl.style.removeProperty('--island-bloom-alpha');
      }
    }

    // Dynamic Album Art Squircle Halo (Audio-Reactive WASAPI Sub-Bass Breathing)
    const haloEl = islandArtHaloEl || (typeof document !== 'undefined' && document.getElementById ? document.getElementById("island-art-halo") : null);
    if (haloEl) {
      if (subBass > 0.05) {
        if (canUpdateCss) {
          const haloOpacity = Math.min(0.92, Math.max(0.35, 0.35 + subBass * 0.57)).toFixed(2);
          const haloScale = (1.0 + subBass * 0.14).toFixed(3);
          if (_lastIslandHaloOpacity === null || Math.abs(parseFloat(haloOpacity) - parseFloat(_lastIslandHaloOpacity)) >= ISLAND_HALO_OPACITY_DEADBAND) {
            setStylePropertyIfChanged(haloEl, '--island-halo-opacity', haloOpacity);
            _lastIslandHaloOpacity = haloOpacity;
          }
          if (_lastIslandHaloScale === null || Math.abs(parseFloat(haloScale) - parseFloat(_lastIslandHaloScale)) >= ISLAND_HALO_SCALE_DEADBAND) {
            setStylePropertyIfChanged(haloEl, '--island-halo-scale', haloScale);
            _lastIslandHaloScale = haloScale;
          }
        }
      } else {
        if (_lastIslandHaloOpacity !== null || _lastIslandHaloScale !== null) {
          _lastIslandHaloOpacity = null;
          _lastIslandHaloScale = null;
          if (haloEl.style.getPropertyValue('--island-halo-opacity')) haloEl.style.removeProperty('--island-halo-opacity');
          if (haloEl.style.getPropertyValue('--island-halo-scale')) haloEl.style.removeProperty('--island-halo-scale');
        }
      }
    }

    // Physical Kick-Transient Micro-Pulse (Sub-pixel spring response on heavy bass)
    if (subBass > 0.70) {
      if (canUpdateCss) {
        const kickBump = (1.0 + (subBass - 0.70) * 0.024).toFixed(3); // capped at ~1.007
        if (_lastIslandBeatScale === null || Math.abs(parseFloat(kickBump) - parseFloat(_lastIslandBeatScale)) >= ISLAND_BEAT_SCALE_DEADBAND) {
          setStylePropertyIfChanged(islandEl, '--island-beat-scale', kickBump);
          _lastIslandBeatScale = kickBump;
        }
      }
    } else {
      if (_lastIslandBeatScale !== null) {
        _lastIslandBeatScale = null;
        if (islandEl.style.getPropertyValue('--island-beat-scale')) islandEl.style.removeProperty('--island-beat-scale');
      }
    }

    if (canUpdateCss) {
      _lastIslandMorphCssTime = now;
    }
  } else {
    _lastIslandBloomRadius = null;
    _lastIslandBloomAlpha = null;
    _lastIslandHaloOpacity = null;
    _lastIslandHaloScale = null;
    _lastIslandBeatScale = null;
    if (islandEl.style.getPropertyValue('--island-bloom-radius')) islandEl.style.removeProperty('--island-bloom-radius');
    if (islandEl.style.getPropertyValue('--island-bloom-alpha')) islandEl.style.removeProperty('--island-bloom-alpha');
    if (islandEl.style.getPropertyValue('--island-beat-scale')) islandEl.style.removeProperty('--island-beat-scale');
    const haloEl = islandArtHaloEl || (islandArtHaloEl = document.getElementById("island-art-halo"));
    if (haloEl) {
      if (haloEl.style.getPropertyValue('--island-halo-opacity')) haloEl.style.removeProperty('--island-halo-opacity');
      if (haloEl.style.getPropertyValue('--island-halo-scale')) haloEl.style.removeProperty('--island-halo-scale');
    }
    smoothedIslandBloom = 0;
  }

  // Tier classification with 350ms hysteresis
  let targetTier = 'groove';

  const isInstrumental = Boolean(lastIslandSyncData && lastIslandSyncData.isInstrumental);

  if (isInstrumental && rollingAudioEnergy >= 0.15) {
    targetTier = 'solo';
  } else if (rollingAudioEnergy >= 0.42 || subBass > 0.82) {
    targetTier = 'climax';
  } else if (rollingAudioEnergy < 0.10) {
    targetTier = 'calm';
  } else {
    targetTier = 'groove';
  }

  // Enforce hysteresis hold time before downgrading tier
  if (targetTier !== currentMorphTier) {
    const isUpgrade = (targetTier === 'climax' || targetTier === 'solo');
    if (isUpgrade || (now - lastMorphTierTime >= 350)) {
      currentMorphTier = targetTier;
      lastMorphTierTime = now;
    }
  }

  // Update body classes
  if (lastAppliedMorphTier !== currentMorphTier) {
    const tierClasses = ['island-morph-calm', 'island-morph-groove', 'island-morph-climax', 'island-morph-solo'];
    tierClasses.forEach(cls => document.body.classList.toggle(cls, cls === `island-morph-${currentMorphTier}`));
    lastAppliedMorphTier = currentMorphTier;
  }
}

let satelliteTextAnimTimeout = null;
let satelliteTextCleanupTimeout = null;
function animateSatelliteTextChange(satText, satMarqueeWrapper, newText) {
  if (!satText) return;
  if (satText.dataset.targetText === newText) return;
  satText.dataset.targetText = newText;

  if (!satText.textContent || satText.textContent === '•••' || satText.textContent === '♪ ♪ ♪') {
    if (satelliteTextAnimTimeout) { clearTimeout(satelliteTextAnimTimeout); satelliteTextAnimTimeout = null; }
    if (satelliteTextCleanupTimeout) { clearTimeout(satelliteTextCleanupTimeout); satelliteTextCleanupTimeout = null; }
    satText.classList.remove("satellite-text-swapping", "satellite-text-entering");
    satText.textContent = newText;
    if (satMarqueeWrapper) updateMarqueeOverflow(satMarqueeWrapper, satText);
    return;
  }
  if (satelliteTextAnimTimeout) clearTimeout(satelliteTextAnimTimeout);
  if (satelliteTextCleanupTimeout) clearTimeout(satelliteTextCleanupTimeout);

  satText.classList.remove("satellite-text-entering");
  satText.classList.add("satellite-text-swapping");

  satelliteTextAnimTimeout = setTimeout(() => {
    satelliteTextAnimTimeout = null;
    satText.textContent = newText;
    satText.classList.remove("satellite-text-swapping");
    satText.classList.add("satellite-text-entering");
    if (satMarqueeWrapper) {
      updateMarqueeOverflow(satMarqueeWrapper, satText);
    }
    satelliteTextCleanupTimeout = setTimeout(() => {
      satelliteTextCleanupTimeout = null;
      satText.classList.remove("satellite-text-entering");
    }, 240);
  }, 120);
}

function resetSatelliteIslandState(immediate = true) {
  if (satelliteTextAnimTimeout) {
    clearTimeout(satelliteTextAnimTimeout);
    satelliteTextAnimTimeout = null;
  }
  if (satelliteTextCleanupTimeout) {
    clearTimeout(satelliteTextCleanupTimeout);
    satelliteTextCleanupTimeout = null;
  }

  const satIsland = document.getElementById("dynamic-island-translation");
  const satText = document.getElementById("island-satellite-text");

  hideSatelliteIsland(false);
  if (satIsland) {
    satIsland.classList.remove('island-vaporizing', 'island-materializing');
  }
  if (satText) {
    satText.dataset.targetText = "";
    satText.textContent = '•••';
    satText.classList.remove('satellite-text-swapping', 'satellite-text-entering', 'is-overflowing');
  }
  hideDuetCapsule(false);
  const duetText = document.getElementById("island-duet-text");
  if (duetText) {
    duetText.dataset.targetText = "";
    duetText.textContent = '';
    duetText.classList.remove('duet-text-swapping', 'duet-text-entering', 'is-overflowing');
  }
  if (immediate && window.caEmitterLayer && typeof window.caEmitterLayer.clear === 'function') {
    window.caEmitterLayer.clear();
  }
  pushDynamicIslandBounds();
}

function dismissSatelliteForUntranslatedTrack() {
  const satIsland = document.getElementById("dynamic-island-translation");
  const satBridge = document.getElementById("island-bridge");
  if (!lastSatelliteActiveState && (!satIsland || satIsland.style.display === 'none')) {
    return;
  }
  lastSatelliteActiveState = false;
  const ambientColor = (typeof getComputedStyle === 'function' && document.documentElement)
    ? (getComputedStyle(document.documentElement).getPropertyValue('--ambient-glow-color').trim() || '#38bdf8')
    : '#38bdf8';
  if (satIsland && satIsland.offsetWidth > 0 && window.caEmitterLayer) {
    window.caEmitterLayer.vaporize(satIsland, () => {
      document.body.classList.remove('has-satellite-active');
      satIsland.style.display = 'none';
      if (satBridge) satBridge.style.display = 'none';
      pushDynamicIslandBounds();
    }, { ambientColor });
  } else {
    document.body.classList.remove('has-satellite-active');
    if (satIsland) satIsland.style.display = 'none';
    if (satBridge) satBridge.style.display = 'none';
    pushDynamicIslandBounds();
  }
}

let dynamicIslandInactivityTimer = null;

function startDynamicIslandInactivityWatchdog() {
  if (dynamicIslandInactivityTimer) return;
  dynamicIslandInactivityTimer = setInterval(checkDynamicIslandInactivity, 1000);
}

function stopDynamicIslandInactivityWatchdog() {
  if (dynamicIslandInactivityTimer) {
    clearInterval(dynamicIslandInactivityTimer);
    dynamicIslandInactivityTimer = null;
  }
}

function checkDynamicIslandInactivity() {
  if (!isDynamicIslandMode) {
    stopDynamicIslandInactivityWatchdog();
    return;
  }
  const timeoutMs = (typeof settings.islandInactivityTimeout === 'number') ? settings.islandInactivityTimeout : 30000;
  if (timeoutMs <= 0) return; // 'Never'

  // If music is actively playing, keep activity timestamp fresh and wake island if sleeping
  if (isPlaying) {
    lastPlaybackActivityMs = Date.now();
    if (isIslandSleeping) {
      wakeDynamicIsland();
    }
    return;
  }

  // When paused, stopped, or no music, calculate elapsed idle time
  const idleTime = Date.now() - lastPlaybackActivityMs;
  if (idleTime >= timeoutMs && !isIslandSleeping) {
    console.log(`[DynamicIsland] Inactivity timeout reached (${idleTime}ms >= ${timeoutMs}ms). Sleeping island.`);
    sleepDynamicIsland();
  }
}

function sleepDynamicIsland() {
  if (isIslandSleeping || !isDynamicIslandMode) return;
  isIslandSleeping = true;
  lastSatelliteActiveState = false;
  hideDuetCapsule(false);
  document.body.classList.remove('island-morph-calm', 'island-morph-groove', 'island-morph-climax', 'island-morph-solo');
  const pri = document.getElementById("dynamic-island");
  if (pri) {
    pri.style.removeProperty('box-shadow');
    pri.style.removeProperty('--island-bloom-radius');
    pri.style.removeProperty('--island-bloom-alpha');
  }
  smoothedIslandBloom = 0;
  const sat = document.getElementById("dynamic-island-translation");
  const bridge = document.getElementById("island-bridge");
  const allowDust = !document.body.classList.contains('lf-reduced-dust-motion');

  const ambientColor = (typeof getComputedStyle === 'function' && document.documentElement)
    ? (getComputedStyle(document.documentElement).getPropertyValue('--ambient-glow-color').trim() || '#38bdf8')
    : '#38bdf8';
  const finishIslandSleep = () => {
    // A wake during the particle animation invalidates its delayed hide.
    if (!isIslandSleeping || !isDynamicIslandMode) return;
    document.body.classList.add("island-sleeping");
    const islandArtVideo = document.getElementById('island-art-video');
    if (islandArtVideo && !islandArtVideo.paused) {
      islandArtVideo.pause();
    }
    if (window.electronAPI && window.electronAPI.updateIslandBounds) {
      window.electronAPI.updateIslandBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
  };

  if (sat && sat.style.display !== 'none' && window.caEmitterLayer && allowDust) {
    window.caEmitterLayer.vaporize(sat, () => {
      document.body.classList.remove('has-satellite-active');
      sat.style.display = 'none';
      if (bridge) bridge.style.display = 'none';
    }, { ambientColor });
  } else {
    document.body.classList.remove('has-satellite-active');
    if (sat) sat.style.display = 'none';
    if (bridge) bridge.style.display = 'none';
  }

  if (!allowDust) {
    finishIslandSleep();
  } else if (pri && window.islandGlDissolve) {
    const usedWebGlDissolve = window.islandGlDissolve.disintegrate(pri, finishIslandSleep, { ambientColor });
    // Pair the pixel breakup with a clearly visible outward dust/spark burst.
    // The emitter timer is canceled by wakeDynamicIsland if playback resumes.
    if (usedWebGlDissolve && window.caEmitterLayer) {
      window.caEmitterLayer.vaporize(pri, null, { ambientColor, particleCount: 64 });
    }
  } else if (pri && window.caEmitterLayer) {
    window.caEmitterLayer.vaporize(pri, finishIslandSleep, { ambientColor, particleCount: 64 });
  } else if (pri) {
    finishIslandSleep();
  }
  syncAudioVisualizerState();
}

function wakeDynamicIsland() {
  const islandElement = document.getElementById("dynamic-island");
  if (window.caEmitterLayer && typeof window.caEmitterLayer.cancelVaporize === 'function') {
    window.caEmitterLayer.cancelVaporize(islandElement);
  }
  if (window.islandGlDissolve && typeof window.islandGlDissolve.stop === 'function') {
    window.islandGlDissolve.stop();
  }
  lastPlaybackActivityMs = Date.now();
  const wasSleeping = isIslandSleeping || document.body.classList.contains("island-sleeping");
  if (!wasSleeping) {
    return;
  }
  isIslandSleeping = false;
  lastSatelliteActiveState = false;
  document.body.classList.remove("island-sleeping");
  syncAudioVisualizerState();
  const islandArtVideo = document.getElementById('island-art-video');
  if (islandArtVideo && currentAnimatedArtInfo?.type === 'video' && islandArtVideo.paused && !islandArtVideo.classList.contains('is-error')) {
    islandArtVideo.play().catch(() => {});
  }
  const pri = islandElement;
  if (pri) {
    pri.style.display = '';
    pri.style.opacity = '';
    pri.classList.remove("island-vaporizing");
  }
  const ambientColor = (typeof getComputedStyle === 'function' && document.documentElement)
    ? (getComputedStyle(document.documentElement).getPropertyValue('--ambient-glow-color').trim() || '#38bdf8')
    : '#38bdf8';

  if (pri && window.caEmitterLayer) {
    window.caEmitterLayer.materialize(pri, () => {
      syncDynamicIslandState();
      pushDynamicIslandBounds();
    }, { ambientColor });
  } else {
    if (pri) pri.style.display = '';
    syncDynamicIslandState();
    pushDynamicIslandBounds();
  }
  if (lyrics && lyrics.length > 0 && activeLineIndex >= 0) {
    updateDynamicIslandLyric(activeLineIndex, lyrics[activeLineIndex], currentProgress);
  }
}

function showIslandSatellitePrompt() {
  if (settings.islandSatellitePrompted || !isDynamicIslandMode) return;
  const modal = document.getElementById("island-prompt-modal");
  if (!modal) return;
  modal.style.display = 'block';
  setTimeout(pushDynamicIslandBounds, 50);
}

function dismissIslandSatellitePrompt(enableSatellite) {
  settings.islandSatellitePrompted = true;
  settings.islandSatelliteEnabled = Boolean(enableSatellite);
  saveLocalSettings();
  const chk = document.getElementById("check-island-satellite");
  if (chk) chk.checked = settings.islandSatelliteEnabled;
  const modal = document.getElementById("island-prompt-modal");
  if (modal) modal.style.display = 'none';
  syncDynamicIslandState();
  setTimeout(pushDynamicIslandBounds, 60);
}

// Dedicated Dynamic Island Progress Engine
function setIslandProgress(curMs, durMs) {
  if (isScrubbingIslandProgress) return;
  if (!Number.isFinite(durMs) || durMs <= 0) return;
  const clampedMs = Math.max(0, Math.min(durMs, Number.isFinite(curMs) ? curMs : 0));
  const pct = Math.min(100, Math.max(0, (clampedMs / durMs) * 100));
  const pctStr = pct.toFixed(1) + '%';

  if (!islandProgressFillEl) islandProgressFillEl = document.getElementById("island-progress-fill");
  if (!islandProgressThumbEl) islandProgressThumbEl = document.getElementById("island-progress-thumb");
  if (!islandTimeCurrentEl) islandTimeCurrentEl = document.getElementById("island-time-current");
  if (!islandTimeRemainingEl) islandTimeRemainingEl = document.getElementById("island-time-remaining");

  if (islandProgressFillEl && islandProgressFillEl._lastWidth !== pctStr) {
    islandProgressFillEl.style.width = pctStr;
    islandProgressFillEl._lastWidth = pctStr;
  }
  if (islandProgressThumbEl && islandProgressThumbEl._lastLeft !== pctStr) {
    islandProgressThumbEl.style.left = pctStr;
    islandProgressThumbEl._lastLeft = pctStr;
  }
  if (islandTimeCurrentEl && typeof formatTime === 'function') {
    const text = formatTime(clampedMs);
    if (islandTimeCurrentEl.textContent !== text) islandTimeCurrentEl.textContent = text;
  }
  if (islandTimeRemainingEl && typeof formatTime === 'function') {
    const text = '-' + formatTime(Math.max(0, durMs - clampedMs));
    if (islandTimeRemainingEl.textContent !== text) islandTimeRemainingEl.textContent = text;
  }
}

// Scrubber time elapsed & remaining + fill & thumb progress helper
function updateIslandScrubberProgress(progress) {
  if (isScrubbingIslandProgress) return;
  if (trackDuration > 0) {
    setIslandProgress(currentProgress, trackDuration);
  }
}

// Circular countdown SVG ring helper throttled to ~10 Hz (every 95-100ms)
let _lastIslandCountdownRingUpdate = 0;

function updateIslandCountdownRingThrottled(countdownMs, isBreak, isOutro, targetIndex) {
  const isPlayingActive = Boolean(isPlaying);
  const isCountingDown = Boolean(
    isPlayingActive &&
    !document.body.classList.contains('app-paused') &&
    ((isBreak && countdownMs > 0) || (countdownMs >= 1000 && (isOutro || (typeof settings !== 'undefined' && settings.islandVocalCountdown !== false))))
  );

  const ringEl = islandCountdownRingEl || (islandCountdownRingEl = document.getElementById("island-countdown-ring"));
  const fillEl = islandCountdownRingFillEl || (islandCountdownRingFillEl = document.getElementById("island-countdown-ring-fill"));
  const dynamicIslandEl = dynamicIslandMainEl || (dynamicIslandMainEl = document.getElementById("dynamic-island"));

  if (isCountingDown && countdownMs > 0) {
    const trackObj = (typeof currentPlayingTrackObj !== 'undefined' && currentPlayingTrackObj) ? currentPlayingTrackObj : null;
    const trackTitle = (trackObj && trackObj.name) || (widgetTrackName && widgetTrackName.textContent ? widgetTrackName.textContent.trim() : 'LyricFlow');
    const breakKey = `${currentTrackId || trackTitle}:${targetIndex}`;
    if (currentIslandBreakKey !== breakKey || countdownMs > currentIslandBreakTotalMs) {
      currentIslandBreakKey = breakKey;
      currentIslandBreakTotalMs = Math.max(countdownMs, 2000);
    }

    if (ringEl && fillEl) {
      if (ringEl.style.display !== 'block') {
        ringEl.style.display = 'block';
      }
      if (dynamicIslandEl && !dynamicIslandEl.classList.contains('island-instrumental-active')) {
        dynamicIslandEl.classList.add('island-instrumental-active');
      }
      const now = Date.now();
      if (now - _lastIslandCountdownRingUpdate >= 95 || ringEl.style.display !== 'block') {
        _lastIslandCountdownRingUpdate = now;
        const frac = currentIslandBreakTotalMs > 0 ? Math.max(0, Math.min(1, countdownMs / currentIslandBreakTotalMs)) : 0;
        const circumference = 97.39;
        const offset = (1 - frac) * circumference;
        fillEl.style.strokeDashoffset = offset.toFixed(2);
      }
    }
  } else {
    if (dynamicIslandEl && dynamicIslandEl.classList.contains('island-instrumental-active')) {
      dynamicIslandEl.classList.remove('island-instrumental-active');
    }
    if (ringEl && ringEl.style.display !== 'none') {
      ringEl.style.display = 'none';
    }
    currentIslandBreakTotalMs = 0;
    currentIslandBreakKey = null;
    _lastIslandCountdownRingUpdate = 0;
  }
}

let _lastPlayheadIslandLineIndex = null;
let _lastPlayheadIslandCountdownSec = null;
let _lastPlayheadIslandTrackKey = null;

// Lightweight tick during idle, prelude, or instrumental breaks
function updateDynamicIslandBreakTick(countdownMs, syncProgress, isInstrumental, targetIndex) {
  if (isIslandSleeping) return;
  if (isPlaying) {
    lastPlaybackActivityMs = Date.now();
  }

  // 1. Scrubber update (if active)
  updateIslandScrubberProgress(currentProgress);

  // 2. Throttled ~10 Hz circular countdown ring update
  const isBreak = Boolean(isInstrumental || targetIndex === -2);
  const isOutro = targetIndex === -3;
  updateIslandCountdownRingThrottled(countdownMs, isBreak, isOutro, targetIndex);
}

// Focused lightweight update for intra-line word progress and panning only
function updateDynamicIslandWordProgressTick(targetIndex, lineData, syncProgress) {
  if (isIslandSleeping) return;
  if (isPlaying) {
    lastPlaybackActivityMs = Date.now();
  }

  // 1. Scrubber update (if active)
  updateIslandScrubberProgress(currentProgress);

  const islandLine = islandLineEl || (islandLineEl = document.getElementById("island-lyric-line"));
  if (!islandLine) return;

  const spans = islandLine._cachedWordSpans;
  const words = islandLine._cachedActiveWords || (lineData && lineData.words);
  const hasWords = Boolean(words && words.length > 0 && spans && spans.length > 0 && settings.wordByWord !== false);

  let activeWordSpan = null;
  let activeWordOffset = null;
  let currentActiveWordProgress = 0;
  let currentActiveIdx = -1;

  if (hasWords) {
    const wordsCount = Math.min(words.length, spans.length);

    let activeWordIdx = -1;
    for (let i = 0; i < wordsCount; i++) {
      const w = words[i];
      const wTime = (w.start != null ? w.start * 1000 : w.timeMs) || 0;
      if (wTime <= syncProgress) {
        activeWordIdx = i;
      } else {
        break;
      }
    }

    let currentActiveWord = activeWordIdx;
    if (activeWordIdx >= 0) {
      const curW = words[activeWordIdx];
      const wStart = (curW.start != null ? curW.start * 1000 : curW.timeMs) || 0;
      const nextW = words[activeWordIdx + 1];
      const nextWStart = nextW
        ? ((nextW.start != null ? nextW.start * 1000 : nextW.timeMs) || (wStart + 500))
        : Infinity;
      const wEnd = getLyricWordEndMs(words, activeWordIdx, lineData, targetIndex);
      if (syncProgress >= wEnd && syncProgress < nextWStart) {
        currentActiveWord = -1;
      }
    }

    currentActiveIdx = currentActiveWord;

    const stateKey = `${activeWordIdx}_${currentActiveWord}`;
    if (islandLine._lastWordStateKey !== stateKey) {
      islandLine._lastWordStateKey = stateKey;
      islandLine._lastActiveWordIdx = currentActiveWord;
      for (let wi = 0; wi < wordsCount; wi++) {
        const span = spans[wi];
        if (!span) continue;
        const isCompleted = wi < activeWordIdx || (wi === activeWordIdx && currentActiveWord === -1);
        const isActive = wi === currentActiveWord;
        const isUpcoming = wi > activeWordIdx;
        span.classList.toggle('lyric-word-completed', isCompleted);
        span.classList.toggle('lyric-word-passed', isCompleted);
        span.classList.toggle('lyric-word-active', isActive);
        span.classList.toggle('lyric-word-upcoming', isUpcoming);
        if (!isActive) {
          span.style.removeProperty('--word-progress');
          span.style.removeProperty('--word-progress-percent');
        }
      }
    }

    if (currentActiveWord >= 0 && words[currentActiveWord] && spans[currentActiveWord]) {
      const activeW = words[currentActiveWord];
      const wStart = (activeW.start != null ? activeW.start * 1000 : activeW.timeMs) || 0;
      const wEnd = getLyricWordEndMs(words, currentActiveWord, lineData, targetIndex);
      const wDur = Math.max(50, wEnd - wStart);
      const rawProgress = Math.min(1, Math.max(0, (syncProgress - wStart) / wDur));
      const prevProg = parseFloat(spans[currentActiveWord]?.style.getPropertyValue('--word-progress') || '0');
      currentActiveWordProgress = (isPlaying && rawProgress < prevProg) ? prevProg : rawProgress;

      activeWordSpan = spans[currentActiveWord];
      lastIslandActiveWordSpan = activeWordSpan;
      if (islandLine._cachedWordOffsets && islandLine._cachedWordOffsets[currentActiveWord]) {
        activeWordOffset = islandLine._cachedWordOffsets[currentActiveWord];
      }
      setLyricWordProgress(activeWordSpan, currentActiveWordProgress);
    } else if (lastIslandActiveWordSpan && activeWordIdx >= 0) {
      activeWordSpan = lastIslandActiveWordSpan;
      if (islandLine._cachedWordOffsets && islandLine._cachedWordOffsets[activeWordIdx]) {
        activeWordOffset = islandLine._cachedWordOffsets[activeWordIdx];
      }
    }
  }

  // Smooth Panning Math
  const islandZone = islandLyricZoneEl || (islandLyricZoneEl = document.getElementById("island-lyric-zone") || islandLine.parentElement);
  if (islandZone) {
    const zoneWidth = getCachedIslandZoneWidth(islandZone);
    const contentWidth = islandLine._cachedScrollWidth || zoneWidth;

    if (contentWidth > zoneWidth + 4) {
      const END_CLEARANCE = 28;
      const scrollableDistance = (contentWidth - zoneWidth) + END_CLEARANCE;
      const maxScroll = -scrollableDistance;
      let targetOffset = 0;

      if (activeWordOffset) {
        let spanCenter = activeWordOffset.center;
        if (currentActiveIdx >= 0 && words && currentActiveIdx < words.length - 1 && islandLine._cachedWordOffsets && islandLine._cachedWordOffsets[currentActiveIdx + 1]) {
          const nextCenter = islandLine._cachedWordOffsets[currentActiveIdx + 1].center;
          const p = Math.min(1, Math.max(0, currentActiveWordProgress || 0));
          const smoothP = p * p * (3 - 2 * p);
          spanCenter = spanCenter + (nextCenter - spanCenter) * smoothP;
        }
        const anchorX = zoneWidth * 0.38;
        const rawOffset = anchorX - spanCenter;
        targetOffset = Math.min(0, Math.max(maxScroll, rawOffset));
      } else if (activeWordSpan) {
        const spanCenter = (activeWordSpan.offsetLeft || 0) + ((activeWordSpan.offsetWidth || 0) / 2);
        const anchorX = zoneWidth * 0.38;
        const rawOffset = anchorX - spanCenter;
        targetOffset = Math.min(0, Math.max(maxScroll, rawOffset));
      } else if (lineData) {
        const lineStartTime = (lineData.timeMs != null && !isNaN(lineData.timeMs))
          ? lineData.timeMs
          : ((lineData.start != null) ? lineData.start * 1000 : 0);

        const nextLine = (lyrics && targetIndex >= 0 && targetIndex + 1 < lyrics.length) ? lyrics[targetIndex + 1] : null;
        const nextLineTime = nextLine
          ? ((nextLine.timeMs != null && !isNaN(nextLine.timeMs)) ? nextLine.timeMs : ((nextLine.start != null) ? nextLine.start * 1000 : 0))
          : 0;

        const textLen = (lineData.text || '').length;
        const estimatedVocalDur = Math.max(3000, Math.min(10000, textLen * 160));
        const naturalDur = (nextLineTime > lineStartTime && (nextLineTime - lineStartTime) <= 12000)
          ? (nextLineTime - lineStartTime)
          : estimatedVocalDur;
        const effectiveDur = (lineData.duration && lineData.duration > 0)
          ? lineData.duration
          : naturalDur;

        const elapsed = syncProgress - lineStartTime;
        const progressFrac = Math.min(1, Math.max(0, elapsed / Math.max(1000, effectiveDur)));

        let scrollRatio = 0;
        if (progressFrac <= 0.02) {
          scrollRatio = 0;
        } else if (progressFrac >= 0.96) {
          scrollRatio = 1;
        } else {
          const t = (progressFrac - 0.02) / 0.94;
          if (t < 0.1) {
            const easeT = t / 0.1;
            scrollRatio = 0.1 * (easeT * easeT * (3 - 2 * easeT));
          } else {
            scrollRatio = t;
          }
        }
        targetOffset = -scrollRatio * scrollableDistance;
        targetOffset = Math.min(0, Math.max(maxScroll, targetOffset));
      }

      const nowMs = performance.now();
      const dt = lastIslandPanTime > 0 ? Math.min(0.12, Math.max(0.008, (nowMs - lastIslandPanTime) / 1000)) : 0.016;
      lastIslandPanTime = nowMs;

      if (Math.abs(targetOffset - currentIslandOffset) > 120) {
        currentIslandOffset = targetOffset;
      } else if (Math.abs(targetOffset - currentIslandOffset) < 0.15) {
        currentIslandOffset = targetOffset;
      } else {
        const factor = 1 - Math.exp(-26 * dt);
        currentIslandOffset += (targetOffset - currentIslandOffset) * factor;
      }
      const panTransform = `translate3d(${currentIslandOffset.toFixed(2)}px, 0, 0)`;
      if (islandLine._lastPanTransform !== panTransform) {
        islandLine.style.transform = panTransform;
        islandLine._lastPanTransform = panTransform;
      }

      let desiredMask = '';
      if (currentIslandOffset >= -4) {
        desiredMask = 'linear-gradient(90deg, #000 0%, #000 calc(100% - 16px), transparent 100%)';
      } else if (currentIslandOffset <= maxScroll + END_CLEARANCE) {
        desiredMask = 'linear-gradient(90deg, transparent 0%, #000 14px, #000 100%)';
      } else {
        desiredMask = 'linear-gradient(90deg, transparent 0%, #000 14px, #000 calc(100% - 16px), transparent 100%)';
      }
      if (islandZone._currentMask !== desiredMask) {
        islandZone.style.maskImage = desiredMask;
        islandZone.style.webkitMaskImage = desiredMask;
        islandZone._currentMask = desiredMask;
      }
    } else {
      currentIslandOffset = 0;
      lastIslandPanTime = performance.now();
      if (islandLine._lastPanTransform !== 'translate3d(0px, 0, 0)') {
        islandLine.style.transform = 'translate3d(0px, 0, 0)';
        islandLine._lastPanTransform = 'translate3d(0px, 0, 0)';
      }
      if (islandZone._currentMask !== 'none') {
        islandZone.style.maskImage = 'none';
        islandZone.style.webkitMaskImage = 'none';
        islandZone._currentMask = 'none';
      }
    }
  }
}

function updateDynamicIslandLyric(targetIndex, lineData, syncProgress, isInstrumental = false, countdownMs = 0) {
  if (isIslandSleeping) return;
  if (isPlaying) {
    lastPlaybackActivityMs = Date.now();
  }

  _lastPlayheadIslandLineIndex = targetIndex;
  _lastPlayheadIslandCountdownSec = countdownMs > 0 ? Math.ceil(countdownMs / 1000) : 0;

  lastIslandSyncData = {
    lineIndex: targetIndex,
    lineData: lineData,
    syncProgress: syncProgress,
    isInstrumental: Boolean(isInstrumental || targetIndex === -2),
    countdownMs: countdownMs
  };

  const islandLine = islandLineEl || (islandLineEl = document.getElementById("island-lyric-line"));
  const islandSubline = islandSublineEl || (islandSublineEl = document.getElementById("island-lyric-subline"));
  const islandExpLyric = islandExpLyricEl || (islandExpLyricEl = document.getElementById("island-expanded-lyric"));
  const dynamicIslandEl = dynamicIslandMainEl || (dynamicIslandMainEl = document.getElementById("dynamic-island"));
  const btnTranslate = islandBtnTranslateEl || (islandBtnTranslateEl = document.getElementById("island-btn-translate"));
  const satIsland = satIslandEl || (satIslandEl = document.getElementById("dynamic-island-translation"));
  const satBridge = satBridgeEl || (satBridgeEl = document.getElementById("island-bridge"));
  const satText = satTextEl || (satTextEl = document.getElementById("island-satellite-text"));
  const satLang = satLangEl || (satLangEl = document.getElementById("island-satellite-lang"));
  const satMarqueeWrapper = satMarqueeWrapperEl || (satMarqueeWrapperEl = document.getElementById("island-satellite-marquee-wrapper"));

  if (!islandLine) return;
  if (lineData && targetIndex >= 0) hideIslandVocalCountdownCell();

  // 1. Scrubber time elapsed & remaining + fill & thumb
  updateIslandScrubberProgress(currentProgress);

  const transMode = settings.islandTranslationMode || 'bilingual';
  const isSatelliteEnabled = settings.islandSatelliteEnabled !== false && transMode !== 'none';

  // 1. Check if the song has at least one foreign translated line
  let trackHasTranslation = false;
  if (lyrics && lyrics.length > 0) {
    if (lyrics._hasTranslation === true) {
      trackHasTranslation = true;
    } else if (lyrics._noTransNeeded) {
      trackHasTranslation = false;
    } else {
      trackHasTranslation = lyrics.some(l => l.subText && l.subText.trim().length > 0 && l.subText.trim().toLowerCase() !== (l.text || '').trim().toLowerCase());
      if (trackHasTranslation) {
        lyrics._hasTranslation = true;
      }
    }
  }

  // 2. Check if the CURRENT line has a foreign translation (not English/identical)
  const curOrigText = (lineData && lineData.text) ? lineData.text.trim() : '';
  const curSubText = (lineData && lineData.subText) ? lineData.subText.trim() : '';
  const lineHasTranslation = Boolean(
    curSubText &&
    curSubText.length > 0 &&
    curSubText.toLowerCase() !== curOrigText.toLowerCase()
  );

  const isPlayingActive = Boolean(isPlaying);

  // 3. Docking rule: MUST have line translation AND music must be actively playing!
  const shouldSatelliteBeDocked = Boolean(
    isPlayingActive &&
    isSatelliteEnabled &&
    trackHasTranslation &&
    lineHasTranslation &&
    !isIslandSleeping
  );

  const subText = (isPlayingActive && lineHasTranslation) ? curSubText : '';
  const hasTrans = Boolean(isPlayingActive && subText && transMode !== 'none');

  if (btnTranslate) {
    const shouldBeActive = transMode !== 'none';
    if (btnTranslate.classList.contains('active') !== shouldBeActive) btnTranslate.classList.toggle('active', shouldBeActive);
  }

  // Ask user in LyricFlow via discovery prompt if they have not decided yet
  if (isDynamicIslandMode && trackHasTranslation && !settings.islandSatellitePrompted) {
    showIslandSatellitePrompt();
  }

  const trackObj = (typeof currentPlayingTrackObj !== 'undefined' && currentPlayingTrackObj) ? currentPlayingTrackObj : null;
  const trackTitle = (trackObj && trackObj.name) || (widgetTrackName && widgetTrackName.textContent ? widgetTrackName.textContent.trim() : 'LyricFlow');
  const trackArtist = (trackObj && trackObj.artists && trackObj.artists.length > 0)
    ? trackObj.artists.map(a => a.name).join(", ")
    : ((trackObj && trackObj.artist) || (widgetArtistName && widgetArtistName.textContent ? widgetArtistName.textContent.trim() : ''));

  const islandTitle = document.getElementById("island-track-title");
  const islandArtist = document.getElementById("island-track-artist");
  if (islandTitle && islandTitle.textContent !== trackTitle) {
    islandTitle.textContent = trackTitle;
    updateMarqueeOverflow(document.getElementById("island-title-wrapper"), islandTitle);
  }
  if (islandArtist && islandArtist.textContent !== trackArtist) {
    islandArtist.textContent = trackArtist;
    updateMarqueeOverflow(document.getElementById("island-artist-wrapper"), islandArtist);
  }

  // 4. Update Connected Satellite Island Lifecycle (Silent within song)
  if (satIsland && satBridge) {
    if (!trackHasTranslation) {
      // Song with NO translation: if it was active from previous track, vaporize it away
      if (lastSatelliteActiveState) {
        dismissSatelliteForUntranslatedTrack();
      } else {
        hideSatelliteIsland(false);
        if (satText) satText.classList.remove('is-overflowing');
      }
    } else if (shouldSatelliteBeDocked) {
      // Foreign language line: organic split-cell mitosis emergence
      showSatelliteIsland();
      if (satLang) {
        const langCode = (settings.translateLang && settings.translateLang !== 'none') ? settings.translateLang : 'en';
        satLang.textContent = langCode.split('-')[0].toUpperCase();
      }
      const displaySub = decodeHtmlEntities(subText);
      if (satText && satText.textContent !== displaySub) {
        animateSatelliteTextChange(satText, satMarqueeWrapper, displaySub);
      }
    } else {
      // English line in foreign song, or instrumental break: liquid droplet fuse back into mother cell
      hideSatelliteIsland(true);
    }
  }

  // 2. Idle, Intro, Instrumental Break, Outro, or Now Playing Buffer
  if (!lineData || targetIndex < 0) {
    const gapWave = document.getElementById('island-wave');
    const keepGapVisualizerVisible = Boolean(isPlayingActive && !document.body.classList.contains('app-paused'));
    if (gapWave) {
      const wasGapActive = gapWave.classList.contains('is-lyric-gap-active');
      gapWave.classList.toggle('is-lyric-gap-active', keepGapVisualizerVisible);
      // If the spectrum watchdog had already settled the bars before this lyric
      // gap began, promote them immediately instead of waiting for another sample.
      if (keepGapVisualizerVisible && !wasGapActive && (isVisualizerResting || document.body.classList.contains('lf-reduced-visualizer-motion'))) {
        const visStyle = settings.islandVisualizerStyle || 'bars';
        gapWave.querySelectorAll('.wave-bar').forEach(bar => {
          bar.style.transform = visStyle === 'dots' ? 'scale(1) translateY(0px)' : 'scaleY(0.34)';
        });
      }
    }
    hideSatelliteIsland(true);
    hideDuetCapsule(true);
    if (dynamicIslandEl && dynamicIslandEl.classList.contains('island-mode-stacked')) dynamicIslandEl.classList.remove('island-mode-stacked');
    if (islandSubline && islandSubline.style.display !== 'none') islandSubline.style.display = 'none';

    const isNowPlayingBuffer = targetIndex === -4;
    const isOutro = targetIndex === -3;
    const isBreak = isInstrumental || targetIndex === -2;

    let idleHtml;
    let expText;

    if (isNowPlayingBuffer) {
      idleHtml = `<span class="island-idle-text"><span class="island-idle-title">${escapeHTML(trackTitle)}</span>${trackArtist ? `<span class="island-idle-separator">•</span><span class="island-idle-artist island-track-artist">${escapeHTML(trackArtist)}</span>` : ''}</span>`;
      expText = trackArtist ? `${trackTitle} • ${trackArtist}` : trackTitle;
    } else if (isOutro) {
      idleHtml = `<span class="island-idle-text"><span class="island-idle-title">${escapeHTML(trackTitle)}</span>${trackArtist ? `<span class="island-idle-separator">•</span><span class="island-idle-artist">${escapeHTML(trackArtist)}</span>` : ''}</span>`;
      expText = trackTitle;
    } else {
      const showCountdown = countdownMs <= 6000 && countdownMs >= 1500 && settings.islandVocalCountdown !== false;
      const countdownSec = showCountdown ? Math.ceil(countdownMs / 1000) : 0;
      if (!showCountdown) hideIslandVocalCountdownCell();

      if (showCountdown && countdownSec > 0 && countdownSec <= 6) {
        idleHtml = `<span class="island-idle-text"><span class="island-countdown-pill island-vocal-pill"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg> Vocals in ${countdownSec}s</span> • <span class="island-idle-title">${escapeHTML(trackTitle)}</span></span>`;
        expText = `${trackTitle} • Vocals in ${countdownSec}s`;
        idleHtml = `<span class="island-idle-text"><span class="island-idle-title">${escapeHTML(trackTitle)}</span></span>`;
        expText = trackTitle;
        updateIslandVocalCountdownCell(trackTitle, countdownSec);
      } else if (isBreak) {
        idleHtml = `<span class="island-idle-text"><span class="island-idle-title">${escapeHTML(trackTitle)}</span><span class="island-idle-separator">•</span><span class="island-instrumental-dots">♪ ♪ ♪</span></span>`;
        expText = `${trackTitle} • Instrumental`;
      } else {
        const hasNoLyrics = (!lyrics || lyrics.length === 0) && currentTrackId;
        if (hasNoLyrics) {
          idleHtml = `<span class="island-idle-text"><span class="island-idle-title">${escapeHTML(trackTitle)}</span><span class="island-idle-separator">•</span><span class="island-no-lyrics-hint" title="No lyrics found - Click ↻ to search alternatives">No lyrics (Click ↻)</span></span>`;
          expText = `${trackTitle} • No lyrics found (Click ↻ to refetch)`;
        } else {
          idleHtml = `<span class="island-idle-text"><span class="island-idle-title">${escapeHTML(trackTitle)}</span>${trackArtist ? `<span class="island-idle-separator">•</span><span class="island-idle-artist">${escapeHTML(trackArtist)}</span>` : ''}</span>`;
          expText = trackTitle;
        }
      }
    }

    // Update Circular Instrumental & Vocal Countdown Ring (throttled to ~10 Hz)
    updateIslandCountdownRingThrottled(countdownMs, isBreak, isOutro, targetIndex);

    const stateKey = `${currentTrackId || trackTitle}:${targetIndex}:${countdownMs > 0 ? Math.ceil(countdownMs / 1000) : 0}`;
    if (islandLine.dataset.stateKey !== stateKey) {
      islandLine.dataset.stateKey = stateKey;
      islandLine.dataset.lineIndex = String(targetIndex);
      islandLine.dataset.subText = "";
      islandLine.dataset.transMode = transMode;
      islandLine.dataset.satellite = String(shouldSatelliteBeDocked);
      islandLine.dataset.duet = "false";
      islandLine.innerHTML = idleHtml;
      islandLine.style.transform = 'translate3d(0px, 0, 0)';
      currentIslandOffset = 0;
      lastIslandActiveWordSpan = null;
    }
    const islandZone = document.getElementById("island-lyric-zone") || islandLine.parentElement;
    if (islandZone && islandZone._currentMask !== 'none') {
      islandZone.style.maskImage = 'none';
      islandZone.style.webkitMaskImage = 'none';
      islandZone._currentMask = 'none';
    }
    if (islandExpLyric) {
      if (islandExpLyric.textContent !== expText) islandExpLyric.textContent = expText;
    }
    return;
  }

  const activeLyricWave = document.getElementById('island-wave');
  if (activeLyricWave) activeLyricWave.classList.remove('is-lyric-gap-active');

  // Deactivate Circular Instrumental Countdown Ring during active vocal lines
  updateIslandCountdownRingThrottled(0, false, false, targetIndex);

  // Duet / Backing Vocal Split handling
  const isDuetEligible = Boolean(
    isPlayingActive &&
    !document.body.classList.contains('app-paused') &&
    settings.islandDuetSplit !== false &&
    lineData &&
    lineData.text &&
    !isInstrumental &&
    targetIndex >= 0
  );
  let duetSplit = isDuetEligible ? parseDuetVocalSplit(lineData.text) : null;
  if (!duetSplit && isDuetEligible && lineData.backingText) {
    const backing = String(lineData.backingText).trim();
    if (backing) {
      duetSplit = {
        leadText: lineData.text,
        duetText: backing.replace(/^[\(\[\{（【]/, '').replace(/[\)\]\}）】]$/, '').trim(),
        type: 'parenthetical'
      };
    }
  }
  if (!duetSplit && isDuetEligible && lineData.subText && /^[\(\[\{（【].+[\)\]\}）】]$/.test(lineData.subText.trim())) {
    const rawDuet = lineData.subText.trim();
    const duetClean = rawDuet.replace(/^[\(\[\{（【]/, '').replace(/[\)\]\}）】]$/, '').trim();
    if (duetClean.length >= 1) {
      duetSplit = {
        leadText: lineData.text,
        duetText: duetClean,
        type: 'parenthetical'
      };
    }
  }

  if (duetSplit) {
    showDuetCapsule(duetSplit.duetText);
  } else {
    hideDuetCapsule(true);
  }

  // 3. Update Hero Expanded Stage Lyric
  if (islandExpLyric) {
    const expandedText = (transMode === 'translated' && subText && !shouldSatelliteBeDocked)
      ? subText
      : cleanLyricText(duetSplit ? `${duetSplit.leadText} (${duetSplit.duetText})` : (lineData.text || ''));
    if (islandExpLyric.textContent !== expandedText) islandExpLyric.textContent = expandedText;
  }

  // 5. Compact View Layout per Mode
  const isStackedMode = (!shouldSatelliteBeDocked && (transMode === 'stacked' || transMode === 'translated') && hasTrans);
  if (dynamicIslandEl) {
    if (dynamicIslandEl.classList.contains('island-mode-stacked') !== isStackedMode) {
      dynamicIslandEl.classList.toggle('island-mode-stacked', isStackedMode);
    }
  }
  if (islandSubline) {
    if (isStackedMode) {
      if (islandSubline.textContent !== subText) islandSubline.textContent = subText;
      if (islandSubline.style.display !== 'block') islandSubline.style.display = 'block';
    } else {
      if (islandSubline.style.display !== 'none') islandSubline.style.display = 'none';
    }
  }

  const displayMainText = cleanLyricText(duetSplit ? duetSplit.leadText : (lineData.text || ''));
  const rawActiveWords = duetSplit ? getLeadWordsForDuet(lineData.words, duetSplit) : lineData.words;
  const activeWords = (rawActiveWords && rawActiveWords.length > 0 && typeof reconcileTimedWords === 'function')
    ? reconcileTimedWords(rawActiveWords, displayMainText)
    : rawActiveWords;
  const isDuetActive = Boolean(duetSplit);
  // Keep the original timed lyric in the Island whenever real word timing is
  // available. Translation-only display mode must not suppress karaoke timing;
  // its translation remains available on the secondary line / satellite.
  const hasWords = Boolean(activeWords && activeWords.length > 0 && settings.wordByWord !== false);
  islandLine._cachedActiveWords = activeWords;
  const needsRerender = (
    islandLine.dataset.lineIndex !== String(targetIndex) ||
    islandLine.dataset.subText !== subText ||
    islandLine.dataset.transMode !== transMode ||
    islandLine.dataset.satellite !== String(shouldSatelliteBeDocked) ||
    islandLine.dataset.duet !== String(isDuetActive) ||
    islandLine.dataset.wordMode !== String(hasWords)
  );

  // 6. Line or Translation Changed: Re-render DOM
  if (needsRerender) {
    islandLine.dataset.stateKey = "";
    islandLine.dataset.lineIndex = String(targetIndex);
    islandLine.dataset.subText = subText;
    islandLine.dataset.transMode = transMode;
    islandLine.dataset.satellite = String(shouldSatelliteBeDocked);
    islandLine.dataset.duet = String(isDuetActive);
    islandLine.dataset.wordMode = String(hasWords);
    lastIslandActiveWordSpan = null;
    islandLine._lastWordStateKey = "";

    if (shouldSatelliteBeDocked) {
      // Clean original karaoke line without cut-offs; translation is in satellite capsule
      if (hasWords) {
        islandLine.innerHTML = timedWordSpansHtml(activeWords, displayMainText);
        islandLine._cachedWordSpans = islandLine.querySelectorAll('.lyric-word');
      } else {
        islandLine.textContent = displayMainText;
        islandLine._cachedWordSpans = null;
      }
    } else if (transMode === 'translated' && subText) {
      // Word-synced original takes priority over an untimed translation.
      if (hasWords) {
        islandLine.innerHTML = timedWordSpansHtml(activeWords, displayMainText);
        islandLine._cachedWordSpans = islandLine.querySelectorAll('.lyric-word');
      } else {
        islandLine.textContent = subText;
        islandLine._cachedWordSpans = null;
      }
    } else if (!isSatelliteEnabled && transMode === 'bilingual' && hasTrans) {
      // Inline Original • Translation fallback (ONLY when satellite is disabled in settings)
      const transHtml = `<span class="island-trans-divider"> • </span><span class="island-trans-inline">${escapeHTML(subText)}</span>`;
      if (hasWords) {
        islandLine.innerHTML = timedWordSpansHtml(activeWords, displayMainText) + transHtml;
        islandLine._cachedWordSpans = islandLine.querySelectorAll('.lyric-word');
      } else {
        islandLine.innerHTML = escapeHTML(displayMainText) + transHtml;
        islandLine._cachedWordSpans = null;
      }
    } else {
      // Stacked, hover-only, none, or song without translation
      if (hasWords) {
        islandLine.innerHTML = timedWordSpansHtml(activeWords, displayMainText);
        islandLine._cachedWordSpans = islandLine.querySelectorAll('.lyric-word');
      } else {
        islandLine.textContent = displayMainText;
        islandLine._cachedWordSpans = null;
      }
    }

    if (islandLine._cachedWordSpans && islandLine._cachedWordSpans.length > 0) {
      islandLine._cachedWordOffsets = Array.from(islandLine._cachedWordSpans).map(s => {
        const left = s.offsetLeft || 0;
        const width = s.offsetWidth || 0;
        return {
          offsetLeft: left,
          offsetWidth: width,
          center: left + (width / 2)
        };
      });
    } else {
      islandLine._cachedWordOffsets = null;
    }
    islandLine._cachedScrollWidth = islandLine.scrollWidth || 0;
    islandLine._lastActiveWordIdx = -2;
    islandLine._lastWordStateKey = "";

    currentIslandOffset = 0;
    islandLine.style.transform = 'translate3d(0px, 0, 0)';
  }

  // 6. Word-by-Word Karaoke State Update
  let activeWordSpan = null;
  let activeWordOffset = null;
  let currentActiveWordProgress = 0;
  let currentActiveIdx = -1;
  if (hasWords && islandLine._cachedWordSpans && islandLine._cachedWordSpans.length > 0) {
    const spans = islandLine._cachedWordSpans;
    const words = activeWords;
    const wordsCount = Math.min(words.length, spans.length);

    let activeWordIdx = -1;
    for (let i = 0; i < wordsCount; i++) {
      const w = words[i];
      const wTime = (w.start != null ? w.start * 1000 : w.timeMs) || 0;
      if (wTime <= syncProgress) {
        activeWordIdx = i;
      } else {
        break;
      }
    }

    let currentActiveWord = activeWordIdx;
    if (activeWordIdx >= 0) {
      const curW = words[activeWordIdx];
      const wStart = (curW.start != null ? curW.start * 1000 : curW.timeMs) || 0;
      const nextW = words[activeWordIdx + 1];
      const nextWStart = nextW
        ? ((nextW.start != null ? nextW.start * 1000 : nextW.timeMs) || (wStart + 500))
        : Infinity;
      const wEnd = getLyricWordEndMs(words, activeWordIdx, lineData, targetIndex);
      if (syncProgress >= wEnd && syncProgress < nextWStart) {
        currentActiveWord = -1;
      }
    }

    currentActiveIdx = currentActiveWord;

    const stateKey = `${activeWordIdx}_${currentActiveWord}`;
    if (islandLine._lastWordStateKey !== stateKey) {
      islandLine._lastWordStateKey = stateKey;
      islandLine._lastActiveWordIdx = currentActiveWord;
      for (let wi = 0; wi < wordsCount; wi++) {
        const span = spans[wi];
        if (!span) continue;
        const isCompleted = wi < activeWordIdx || (wi === activeWordIdx && currentActiveWord === -1);
        const isActive = wi === currentActiveWord;
        const isUpcoming = wi > activeWordIdx;
        span.classList.toggle('lyric-word-completed', isCompleted);
        span.classList.toggle('lyric-word-passed', isCompleted);
        span.classList.toggle('lyric-word-active', isActive);
        span.classList.toggle('lyric-word-upcoming', isUpcoming);
        if (!isActive) {
          span.style.removeProperty('--word-progress');
          span.style.removeProperty('--word-progress-percent');
        }
      }
    }

    if (currentActiveWord >= 0 && words[currentActiveWord] && spans[currentActiveWord]) {
      const activeW = words[currentActiveWord];
      const wStart = (activeW.start != null ? activeW.start * 1000 : activeW.timeMs) || 0;
      const nextW = words[currentActiveWord + 1];
      const nextWStart = nextW
        ? ((nextW.start != null ? nextW.start * 1000 : nextW.timeMs) || (wStart + 500))
        : getLyricWordEndMs(words, currentActiveWord, lineData, targetIndex);
      const wEnd = getLyricWordEndMs(words, currentActiveWord, lineData, targetIndex);
      const wDur = Math.max(50, wEnd - wStart);
      const rawProgress = Math.min(1, Math.max(0, (syncProgress - wStart) / wDur));
      const prevProg = parseFloat(spans[currentActiveWord]?.style.getPropertyValue('--word-progress') || '0');
      currentActiveWordProgress = (isPlaying && rawProgress < prevProg) ? prevProg : rawProgress;

      activeWordSpan = spans[currentActiveWord];
      lastIslandActiveWordSpan = activeWordSpan;
      if (islandLine._cachedWordOffsets && islandLine._cachedWordOffsets[currentActiveWord]) {
        activeWordOffset = islandLine._cachedWordOffsets[currentActiveWord];
      }
      setLyricWordProgress(activeWordSpan, currentActiveWordProgress);
    } else if (lastIslandActiveWordSpan && activeWordIdx >= 0) {
      activeWordSpan = lastIslandActiveWordSpan;
      if (islandLine._cachedWordOffsets && islandLine._cachedWordOffsets[activeWordIdx]) {
        activeWordOffset = islandLine._cachedWordOffsets[activeWordIdx];
      }
    }
  }

  // 7. Smooth Panning Math
  const islandZone = islandLyricZoneEl || (islandLyricZoneEl = document.getElementById("island-lyric-zone") || islandLine.parentElement);
  if (islandZone) {
    const zoneWidth = getCachedIslandZoneWidth(islandZone);
    const contentWidth = islandLine._cachedScrollWidth || zoneWidth;

    if (contentWidth > zoneWidth + 4) {
      // 28px clearance buffer ensures trailing characters are completely visible and never shadowed by container edges
      const END_CLEARANCE = 28;
      const scrollableDistance = (contentWidth - zoneWidth) + END_CLEARANCE;
      const maxScroll = -scrollableDistance;
      let targetOffset = 0;

      if (activeWordOffset) {
        let spanCenter = activeWordOffset.center;
        // Continuous intra-word smoothstep interpolation:
        // As current word progresses from 0 to 1, smoothly drift focus toward next word's center
        // so the island camera tracks the singer continuously rather than jumping discretely per word
        if (currentActiveIdx >= 0 && activeWords && currentActiveIdx < activeWords.length - 1 && islandLine._cachedWordOffsets && islandLine._cachedWordOffsets[currentActiveIdx + 1]) {
          const nextCenter = islandLine._cachedWordOffsets[currentActiveIdx + 1].center;
          const p = Math.min(1, Math.max(0, currentActiveWordProgress || 0));
          const smoothP = p * p * (3 - 2 * p);
          spanCenter = spanCenter + (nextCenter - spanCenter) * smoothP;
        }
        const anchorX = zoneWidth * 0.38;
        const rawOffset = anchorX - spanCenter;
        targetOffset = Math.min(0, Math.max(maxScroll, rawOffset));
      } else if (activeWordSpan) {
        const spanCenter = (activeWordSpan.offsetLeft || 0) + ((activeWordSpan.offsetWidth || 0) / 2);
        const anchorX = zoneWidth * 0.38;
        const rawOffset = anchorX - spanCenter;
        targetOffset = Math.min(0, Math.max(maxScroll, rawOffset));
      } else if (lineData) {
        const lineStartTime = (lineData.timeMs != null && !isNaN(lineData.timeMs))
          ? lineData.timeMs
          : ((lineData.start != null) ? lineData.start * 1000 : 0);

        const nextLine = (lyrics && targetIndex >= 0 && targetIndex + 1 < lyrics.length) ? lyrics[targetIndex + 1] : null;
        const nextLineTime = nextLine
          ? ((nextLine.timeMs != null && !isNaN(nextLine.timeMs)) ? nextLine.timeMs : ((nextLine.start != null) ? nextLine.start * 1000 : 0))
          : 0;

        const textLen = (lineData.text || '').length;
        const estimatedVocalDur = Math.max(3000, Math.min(10000, textLen * 160));
        const naturalDur = (nextLineTime > lineStartTime && (nextLineTime - lineStartTime) <= 12000)
          ? (nextLineTime - lineStartTime)
          : estimatedVocalDur;
        const effectiveDur = (lineData.duration && lineData.duration > 0)
          ? lineData.duration
          : naturalDur;

        const elapsed = syncProgress - lineStartTime;
        const progressFrac = Math.min(1, Math.max(0, elapsed / Math.max(1000, effectiveDur)));

        let scrollRatio = 0;
        if (progressFrac <= 0.02) {
          scrollRatio = 0;
        } else if (progressFrac >= 0.96) {
          scrollRatio = 1;
        } else {
          // Natural reading velocity with smooth onset
          const t = (progressFrac - 0.02) / 0.94;
          if (t < 0.1) {
            const easeT = t / 0.1;
            scrollRatio = 0.1 * (easeT * easeT * (3 - 2 * easeT));
          } else {
            scrollRatio = t;
          }
        }
        targetOffset = -scrollRatio * scrollableDistance;
        targetOffset = Math.min(0, Math.max(maxScroll, targetOffset));
      }

      const nowMs = performance.now();
      const dt = lastIslandPanTime > 0 ? Math.min(0.12, Math.max(0.008, (nowMs - lastIslandPanTime) / 1000)) : 0.016;
      lastIslandPanTime = nowMs;

      if (Math.abs(targetOffset - currentIslandOffset) > 120) {
        currentIslandOffset = targetOffset;
      } else {
        // High-fidelity liquid damping factor (k = 26):
        // Reaches 95% target convergence within 50-60ms, eliminating lag behind singing vocals
        const factor = 1 - Math.exp(-26 * dt);
        currentIslandOffset += (targetOffset - currentIslandOffset) * factor;
      }
      islandLine.style.transform = `translate3d(${currentIslandOffset.toFixed(2)}px, 0, 0)`;

      // Dynamic edge mask:
      // Start (offset >= -4): fade only right edge since start is flush
      // Middle: soft fade on both left and right edges
      // End (offset <= maxScroll + END_CLEARANCE): fade LEFT ONLY, do NOT shadow trailing characters at end!
      let desiredMask = '';
      if (currentIslandOffset >= -4) {
        desiredMask = 'linear-gradient(90deg, #000 0%, #000 calc(100% - 16px), transparent 100%)';
      } else if (currentIslandOffset <= maxScroll + END_CLEARANCE) {
        desiredMask = 'linear-gradient(90deg, transparent 0%, #000 14px, #000 100%)';
      } else {
        desiredMask = 'linear-gradient(90deg, transparent 0%, #000 14px, #000 calc(100% - 16px), transparent 100%)';
      }
      if (islandZone._currentMask !== desiredMask) {
        islandZone.style.maskImage = desiredMask;
        islandZone.style.webkitMaskImage = desiredMask;
        islandZone._currentMask = desiredMask;
      }
    } else {
      currentIslandOffset = 0;
      lastIslandPanTime = performance.now();
      islandLine.style.transform = 'translate3d(0px, 0, 0)';
      if (islandZone._currentMask !== 'none') {
        islandZone.style.maskImage = 'none';
        islandZone.style.webkitMaskImage = 'none';
        islandZone._currentMask = 'none';
      }
    }
  }
}

function cycleIslandTranslationMode() {
  const modes = ['bilingual', 'stacked', 'hover-only', 'translated', 'none'];
  const current = settings.islandTranslationMode || 'bilingual';
  const nextIdx = (modes.indexOf(current) + 1) % modes.length;
  const nextMode = modes[nextIdx];
  settings.islandTranslationMode = nextMode;
  saveLocalSettings();

  const selectTrans = document.getElementById("select-island-translation");
  if (selectTrans) {
    selectTrans.value = nextMode;
  }

  const modeLabels = {
    'bilingual': 'Inline (Original • Translation)',
    'stacked': 'Dual-Line Subtitle',
    'hover-only': 'Hover Preview Only',
    'translated': 'Translated Lyrics Only',
    'none': 'Translation Off'
  };

  if (typeof showToast === 'function') {
    showToast(`Island: ${modeLabels[nextMode] || nextMode}`, 2000);
  }

  // If user enabled an active translation mode, ensure a translation language is active
  if (nextMode !== 'none') {
    if (!settings.translateLang || settings.translateLang === 'none') {
      settings.translateLang = 'en';
      const selectTransEl = document.getElementById("select-translate");
      if (selectTransEl) selectTransEl.value = 'en';
      saveLocalSettings();
    }
    // If current song lacks translations, trigger background translation
    if (currentTrackId && lyrics && lyrics.length > 0 && !lyrics.some(l => l.subText && l.subText.trim())) {
      const curCacheKey = `lyrics_cache_v21_${currentTrackId}`;
      if (typeof triggerAutoTranslation === 'function') {
        triggerAutoTranslation(currentTrackId, lyrics, curCacheKey);
      }
    }
  }

  const islandLine = document.getElementById("island-lyric-line");
  if (islandLine) {
    islandLine.dataset.lineIndex = "";
    islandLine.dataset.transMode = "";
    islandLine.dataset.subText = "";
  }
  if (lyrics && lyrics.length > 0 && activeLineIndex >= 0) {
    const line = lyrics[activeLineIndex];
    updateDynamicIslandLyric(activeLineIndex, line, currentProgress);
  } else {
    syncDynamicIslandState();
  }
}

let isTransitioningMode = false;
let queuedModeTransition = null;
let isKineticMode = false;
let kineticRendererInstance = null;
let kineticIdleTimeout = null;
let isCinematicView = false;
let cinematicMainRendererInstance = null;

let currentMusicAppName = "Music";
let spotifyVolumeDebounceTimer = null;

function setSpotifyVolumeDebounced(percent) {
  if (spotifyVolumeDebounceTimer) clearTimeout(spotifyVolumeDebounceTimer);
  spotifyVolumeDebounceTimer = setTimeout(() => {
    if (config && config.access_token && !config.localMode) {
      fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${percent}`, {
        method: 'PUT',
        headers: { "Authorization": `Bearer ${config.access_token}` }
      }).catch(() => {});
    }
  }, 60);
}

async function syncMusicAppVolume() {
  if (config && config.access_token && !config.localMode) {
    if (lastSpotifyPlaybackData && lastSpotifyPlaybackData.device && typeof lastSpotifyPlaybackData.device.volume_percent === 'number') {
      currentIslandVolumePercent = lastSpotifyPlaybackData.device.volume_percent;
      isIslandMuted = currentIslandVolumePercent === 0;
      currentMusicAppName = "Spotify";
      return;
    }
  }
  if (window.electronAPI && typeof window.electronAPI.getMusicAppVolume === 'function') {
    try {
      const info = await window.electronAPI.getMusicAppVolume();
      if (info && typeof info.volumePercent === 'number') {
        currentIslandVolumePercent = info.volumePercent;
        isIslandMuted = Boolean(info.isMuted);
        if (info.appName) currentMusicAppName = info.appName;
      }
    } catch (_) {}
  }
}

async function adjustIslandVolume(deltaPercent, showHud = true) {
  const isSpotifyWeb = Boolean(config && config.access_token && !config.localMode);

  if (isSpotifyWeb) {
    currentIslandVolumePercent = Math.max(0, Math.min(100, currentIslandVolumePercent + deltaPercent));
    isIslandMuted = currentIslandVolumePercent === 0;
    currentMusicAppName = "Spotify";

    setSpotifyVolumeDebounced(currentIslandVolumePercent);

    if (window.electronAPI && typeof window.electronAPI.adjustMusicAppVolume === 'function') {
      window.electronAPI.adjustMusicAppVolume(deltaPercent).catch(() => {});
    }
  } else {
    // Control active music source application volume (WASAPI audio session per-app)
    if (window.electronAPI && typeof window.electronAPI.adjustMusicAppVolume === 'function') {
      try {
        const info = await window.electronAPI.adjustMusicAppVolume(deltaPercent);
        if (info && typeof info.volumePercent === 'number') {
          currentIslandVolumePercent = info.volumePercent;
          isIslandMuted = Boolean(info.isMuted);
          if (info.appName) currentMusicAppName = info.appName;
        } else {
          currentIslandVolumePercent = Math.max(0, Math.min(100, currentIslandVolumePercent + deltaPercent));
          isIslandMuted = currentIslandVolumePercent === 0;
        }
      } catch (err) {
        currentIslandVolumePercent = Math.max(0, Math.min(100, currentIslandVolumePercent + deltaPercent));
        isIslandMuted = currentIslandVolumePercent === 0;
      }
    } else if (window.electronAPI && window.electronAPI.triggerLocalPlaybackControl) {
      currentIslandVolumePercent = Math.max(0, Math.min(100, currentIslandVolumePercent + deltaPercent));
      isIslandMuted = currentIslandVolumePercent === 0;
      const action = deltaPercent > 0 ? "volume-up" : "volume-down";
      window.electronAPI.triggerLocalPlaybackControl(action, currentIslandVolumePercent);
    } else {
      currentIslandVolumePercent = Math.max(0, Math.min(100, currentIslandVolumePercent + deltaPercent));
      isIslandMuted = currentIslandVolumePercent === 0;
    }
  }

  let volIcon = "volume-high";
  if (isIslandMuted || currentIslandVolumePercent === 0) volIcon = "volume-muted";
  else if (currentIslandVolumePercent < 70) volIcon = "volume-low";

  const appLabel = currentMusicAppName ? `${currentMusicAppName}: ` : '';
  const hudText = isIslandMuted ? `${appLabel}Muted` : `${appLabel}${currentIslandVolumePercent}%`;

  if (isDynamicIslandMode && showHud) {
    showIslandHud({
      icon: volIcon,
      text: hudText,
      percent: currentIslandVolumePercent,
      showBar: true
    });
  } else if (!isDynamicIslandMode && showHud && typeof showToast === 'function') {
    showToast(`${volIcon} ${hudText}`, 1000);
  }
}

async function toggleAppMute() {
  const isSpotifyWeb = Boolean(config && config.access_token && !config.localMode);

  if (isSpotifyWeb) {
    if (isIslandMuted) {
      currentIslandVolumePercent = lastIslandMuteVolume || 50;
      isIslandMuted = false;
    } else {
      lastIslandMuteVolume = currentIslandVolumePercent || 50;
      currentIslandVolumePercent = 0;
      isIslandMuted = true;
    }
    currentMusicAppName = "Spotify";
    setSpotifyVolumeDebounced(currentIslandVolumePercent);
    if (window.electronAPI && typeof window.electronAPI.toggleMusicAppMute === 'function') {
      window.electronAPI.toggleMusicAppMute().catch(() => {});
    }
  } else {
    if (window.electronAPI && typeof window.electronAPI.toggleMusicAppMute === 'function') {
      try {
        const info = await window.electronAPI.toggleMusicAppMute();
        if (info && typeof info.volumePercent === 'number') {
          currentIslandVolumePercent = info.volumePercent;
          isIslandMuted = Boolean(info.isMuted);
          if (info.appName) currentMusicAppName = info.appName;
        } else {
          isIslandMuted = !isIslandMuted;
        }
      } catch (e) {
        isIslandMuted = !isIslandMuted;
      }
    } else if (window.electronAPI && window.electronAPI.triggerLocalPlaybackControl) {
      isIslandMuted = !isIslandMuted;
      window.electronAPI.triggerLocalPlaybackControl(
        isIslandMuted ? "volume-mute" : "volume",
        isIslandMuted ? 0 : (lastIslandMuteVolume || 50)
      );
    }
  }

  let volIcon = isIslandMuted ? "volume-muted" : "volume-high";
  const appLabel = currentMusicAppName ? `${currentMusicAppName}: ` : '';
  const hudText = isIslandMuted ? `${appLabel}Muted` : `${appLabel}${currentIslandVolumePercent}%`;

  if (isDynamicIslandMode) {
    showIslandHud({
      icon: volIcon,
      text: hudText,
      percent: isIslandMuted ? 0 : currentIslandVolumePercent,
      showBar: true
    });
  } else if (typeof showToast === 'function') {
    showToast(hudText, 1000);
  }
}

async function transitionToMode(targetMode) {
  if (isTransitioningMode) {
    queuedModeTransition = targetMode;
    return;
  }
  isTransitioningMode = true;

  try {
    // 1. Cleanly disengage active conflicting modes first
    if (isKineticMode && targetMode !== 'kinetic') {
      isKineticMode = false;
      document.body.classList.remove('mode-kinetic');
      const kineticContainer = document.getElementById("kinetic-mode-container");
      if (kineticContainer) kineticContainer.classList.remove("active");
      if (kineticRendererInstance) {
        kineticRendererInstance.pause();
      }
    }

    if (settings.wallpaperMode && targetMode !== 'wallpaper') {
      settings.wallpaperMode = false;
      if (checkWallpaperMode) checkWallpaperMode.checked = false;
      if (typeof updateWallpaperLyricBeatBloom === 'function') {
        updateWallpaperLyricBeatBloom(0);
      }
      clearWallpaperModePresentation();
      if (window.electronAPI && typeof window.electronAPI.setWallpaperMode === 'function') {
        await window.electronAPI.setWallpaperMode(false);
      }
    }

    if (isDynamicIslandMode && targetMode !== 'island') {
      clearInitialIslandHoverSuppression();
      isDynamicIslandMode = false;
      settings.dynamicIslandMode = false;
      isIslandSleeping = false;
      stopDynamicIslandInactivityWatchdog();
      document.body.classList.remove('mode-dynamic-island', 'island-sleeping', 'island-ghost-mode');
      const checkIsland = document.getElementById("check-dynamic-island");
      if (checkIsland) checkIsland.checked = false;
      const pri = document.getElementById("dynamic-island");
      if (pri) {
        pri.style.display = '';
        pri.classList.remove('island-vaporizing', 'island-materializing');
      }
      lastPushedBounds = { x: -1, y: -1, width: -1, height: -1 };
      if (window.electronAPI && typeof window.electronAPI.setDynamicIslandMode === 'function') {
        await window.electronAPI.setDynamicIslandMode(false);
      }
      try { syncActiveAnimatedVideoState(); } catch (e) {}
    }

    if (settings.taskbarMode && targetMode !== 'taskbar') {
      settings.taskbarMode = false;
      if (checkTaskbarMode) checkTaskbarMode.checked = false;
      document.body.classList.remove('taskbar-mode');
      lastSentTaskbarMode = false;
      if (window.electronAPI && typeof window.electronAPI.setTaskbarMode === 'function') {
        await window.electronAPI.setTaskbarMode(false);
      }
    }

    const wasCinematicBefore = Boolean(isCinematicView);
    if (isCinematicView && targetMode !== 'cinematic') {
      isCinematicView = false;
      settings.cinematicMode = false;
      document.body.classList.remove('cinematic-view-active');
      if (appContainer) {
        appContainer.classList.remove('cinematic-view-active');
      }
      if (cinematicMainRendererInstance) {
        cinematicMainRendererInstance.pause();
      }
      const btnCinematic = document.getElementById("btn-cinematic-mode") || document.getElementById("btn-kinetic-mode");
      if (btnCinematic) {
        btnCinematic.classList.remove("active");
        btnCinematic.setAttribute("title", "Classic Lyrics Mode (Click for Cinematic)");
      }
      if (window.electronAPI && typeof window.electronAPI.setCinematicMode === 'function') {
        await window.electronAPI.setCinematicMode(false).catch(() => {});
      }
    }

    // 2. Engage target mode cleanly
    if (targetMode === 'island') {
      isDynamicIslandMode = true;
      settings.dynamicIslandMode = true;
      startDynamicIslandInactivityWatchdog();
      document.body.classList.add('mode-dynamic-island');
      if (cinematicMainRendererInstance) {
        cinematicMainRendererInstance.pause();
      }
      if (fluidMeshGradientInstance) {
        fluidMeshGradientInstance.stop();
      }
      document.body.classList.remove('cinematic-view-active');
      if (appContainer) {
        appContainer.classList.remove('cinematic-view-active');
      }
      cancelAutoHide();
      if (appContainer) {
        appContainer.classList.remove('auto-hide-faded', 'auto-hide-collapsed');
      }
      document.body.classList.remove('island-sleeping', 'auto-hide-faded', 'auto-hide-collapsed');
      isIslandSleeping = false;
      isLyricsAutoHidden = false;

      const pri = document.getElementById("dynamic-island");
      if (pri) {
        pri.style.display = '';
        pri.classList.remove('island-vaporizing', 'island-materializing');
      }
      const sat = document.getElementById("dynamic-island-translation");
      if (sat) {
        sat.classList.remove('island-vaporizing', 'island-materializing');
      }
      const duet = document.getElementById("island-duet-capsule");
      if (duet) {
        duet.classList.remove('island-vaporizing', 'island-materializing');
      }

      const checkIsland = document.getElementById("check-dynamic-island");
      if (checkIsland) checkIsland.checked = true;
      const dockPos = normalizeDynamicIslandDockPosition(settings.dynamicIslandPosition);
      applyDynamicIslandDockClass(dockPos);

      if (window.electronAPI && typeof window.electronAPI.setDynamicIslandMode === 'function') {
        await window.electronAPI.setDynamicIslandMode(true, dockPos);
      }
      suppressInitialIslandHoverUntilPointerExits();
      try { syncActiveAnimatedVideoState(); } catch (e) {}
      try {
        syncDynamicIslandState();
        syncMusicAppVolume();
      } catch (err) {
        console.warn("[DynamicIsland] Error syncing state:", err);
      }
      if (fluidMeshGradientInstance) {
        // Island mode hides this surface. Stop its RAF but keep the WebGL
        // context alive: discarding/restoring the context here can lose the
        // rendered palette on a fast return to the normal window.
        fluidMeshGradientInstance.stop();
      }
      applyIslandVisualizerStyle(settings.islandVisualizerStyle || 'bars');
      syncAudioVisualizerState();
      lastPlaybackActivityMs = Date.now();
      pushDynamicIslandBounds();
      setTimeout(() => {
        pushDynamicIslandBounds();
        startDynamicIslandBoundsTracking(500);
      }, 60);
      try {
        const syncProgress = getAcousticSyncProgress();
        const islandSync = getDynamicIslandSyncData(syncProgress);
        updateDynamicIslandLyric(islandSync.lineIndex, islandSync.lineData, syncProgress, islandSync.isInstrumental, islandSync.countdownMs);
      } catch (err) {
        console.warn("[DynamicIsland] Error updating lyric on toggle:", err);
      }
      if (!settings.ghostModeTipShown) {
        settings.ghostModeTipShown = true;
        if (typeof saveLocalSettings === 'function') saveLocalSettings();
        setTimeout(() => {
          if (typeof showToast === 'function') {
            showToast("Tip: Hover & tap ` (Tilde) or Ctrl+Shift+G to click tabs behind the island", 4500);
          }
        }, 1000);
      }
    } else if (targetMode === 'wallpaper') {
      settings.wallpaperMode = true;
      if (checkWallpaperMode) checkWallpaperMode.checked = true;
      if (!settings.wallpaperStyle) {
        settings.wallpaperStyle = (typeof wasCinematicBefore !== 'undefined' && wasCinematicBefore) ? 'cinematic' : 'style2';
      }
      lastSentWallpaperMode = null;
      applyVisualSettings();
      if (fluidMeshGradientInstance && shouldRunFluidMesh()) {
        if (typeof fluidMeshGradientInstance.wake === 'function') {
          fluidMeshGradientInstance.wake();
        }
        if (typeof fluidMeshGradientInstance.defrost === 'function') {
          fluidMeshGradientInstance.defrost();
        }
        if (isPlaying || !fluidMeshGradientInstance.isSettled?.()) {
          fluidMeshGradientInstance.start();
        }
        if (window.currentDynamicPalette) {
          fluidMeshGradientInstance.setPalette(window.currentDynamicPalette);
        }
      }
      syncWallpaperTrackMetadata();
      showWallpaperSelectorPanel();
      if (typeof showToast === 'function') {
        showToast("Wallpaper Mode Active — Press Ctrl+Shift+W to return.", 4000);
      }
    } else if (targetMode === 'taskbar') {
      settings.taskbarMode = true;
      if (checkTaskbarMode) checkTaskbarMode.checked = true;
      if (fluidMeshGradientInstance) {
        fluidMeshGradientInstance.stop();
      }
      applyVisualSettings();
    } else if (targetMode === 'kinetic') {
      isKineticMode = true;
      document.body.classList.add('mode-kinetic');
      const kineticContainer = document.getElementById("kinetic-mode-container");
      if (kineticContainer) kineticContainer.classList.add("active");
      if (fluidMeshGradientInstance) {
        fluidMeshGradientInstance.stop();
      }
      initKineticMode();
      syncKineticState();
      if (isPlaying && kineticRendererInstance) {
        kineticRendererInstance.play();
      }
    } else {
      // Normal overlay mode
      hideWallpaperSelectorPanel();
      cancelAutoHide();
      showLyricsScreen();
      applyVisualSettings();
      if (typeof updateStudioSidebar === 'function') {
        updateStudioSidebar(currentPlayingTrackObj, currentStaticAlbumArtUrl);
      }
      if (typeof renderLyrics === 'function') {
        renderLyrics();
      }
      if (fluidMeshGradientInstance && shouldRunFluidMesh()) {
        if (typeof fluidMeshGradientInstance.wake === 'function') {
          fluidMeshGradientInstance.wake();
        }
        restoreCurrentFluidMeshPalette();
        if (isPlaying || !fluidMeshGradientInstance.isSettled?.()) {
          fluidMeshGradientInstance.start();
        }
      }
    }

    saveLocalSettings();
    updateModeButtonsState();
    syncAudioVisualizerState();
    syncActiveAnimatedVideoState();
  } finally {
    isTransitioningMode = false;
    const queuedTarget = queuedModeTransition;
    queuedModeTransition = null;
    if (queuedTarget) {
      setTimeout(() => transitionToMode(queuedTarget), 100);
    }
  }
}

let _lastModeToggleTimestamp = 0;

async function toggleDynamicIslandMode(forceState) {
  const now = Date.now();
  if (typeof forceState !== 'boolean' && (now - _lastModeToggleTimestamp) < 150) return;
  _lastModeToggleTimestamp = now;
  const targetState = typeof forceState === 'boolean' ? forceState : !isDynamicIslandMode;
  if (targetState === isDynamicIslandMode) return;
  await transitionToMode(targetState ? 'island' : 'normal');
}

async function toggleWallpaperMode(forceState) {
  const now = Date.now();
  if (typeof forceState !== 'boolean' && (now - _lastModeToggleTimestamp) < 150) return;
  _lastModeToggleTimestamp = now;
  const targetState = typeof forceState === 'boolean' ? forceState : !settings.wallpaperMode;
  if (targetState === settings.wallpaperMode) return;
  await transitionToMode(targetState ? 'wallpaper' : 'normal');
}

let wallpaperSelectorDismissTimer = null;

function showWallpaperSelectorPanel() {
  const panel = document.getElementById("wallpaper-mode-selector-panel");
  if (!panel) return;
  panel.style.display = 'block';
  requestAnimationFrame(() => panel.classList.add('visible'));

  const curStyle = settings.wallpaperStyle || 'cinematic';
  document.querySelectorAll('.wallpaper-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.style === curStyle);
  });

  if (wallpaperSelectorDismissTimer) clearTimeout(wallpaperSelectorDismissTimer);
  wallpaperSelectorDismissTimer = setTimeout(() => {
    hideWallpaperSelectorPanel();
  }, 6000);
}

function hideWallpaperSelectorPanel() {
  const panel = document.getElementById("wallpaper-mode-selector-panel");
  if (panel) {
    panel.classList.remove('visible');
    setTimeout(() => { panel.style.display = 'none'; }, 350);
  }
  if (wallpaperSelectorDismissTimer) {
    clearTimeout(wallpaperSelectorDismissTimer);
    wallpaperSelectorDismissTimer = null;
  }
}

function setWallpaperStyle(style) {
  settings.wallpaperStyle = (style === 'style2') ? 'style2' : 'cinematic';
  saveLocalSettings();
  applyVisualSettings();

  const isCinematic = (settings.wallpaperStyle === 'cinematic');
  if (isCinematic) {
    if (!cinematicMainRendererInstance) {
      initCinematicMainStage();
    } else {
      cinematicMainRendererInstance.setDimensions(window.innerWidth, window.innerHeight);
    }
    syncCinematicState();
    if (cinematicMainRendererInstance && isPlaying) {
      cinematicMainRendererInstance.play();
    }
  } else {
    if (cinematicMainRendererInstance) {
      cinematicMainRendererInstance.pause();
    }
    if (fluidMeshGradientInstance && shouldRunFluidMesh()) {
      fluidMeshGradientInstance.wake?.();
      if (isPlaying || !fluidMeshGradientInstance.isSettled?.()) {
        fluidMeshGradientInstance.start();
      }
      if (window.currentDynamicPalette) {
        fluidMeshGradientInstance.setPalette(window.currentDynamicPalette);
      }
    }
    measureLyricMetrics();
    const curIdx = (typeof getCurrentActiveLyricIndex === 'function') ? getCurrentActiveLyricIndex() : 0;
    if (curIdx >= 0) {
      activeLineIndex = -1;
      scrollLyrics(curIdx);
    }
  }

  try { syncActiveAnimatedVideoState(); } catch (_) {}

  // Update button active state in selector panel
  document.querySelectorAll('.wallpaper-opt-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.style === settings.wallpaperStyle);
  });
  // Update settings dropdown if exists
  if (selectWallpaperStyle) {
    selectWallpaperStyle.value = settings.wallpaperStyle;
  }

  showToast(isCinematic ? "Wallpaper Style: Cinematic Lyrics" : "Wallpaper Style: Apple Music Split View", 2500, 'info');
  showWallpaperSelectorPanel();
}


async function toggleTaskbarMode(forceState) {
  const targetState = typeof forceState === 'boolean' ? forceState : !settings.taskbarMode;
  if (targetState === settings.taskbarMode) return;
  await transitionToMode(targetState ? 'taskbar' : 'normal');
}

async function toggleKineticMode(forceState) {
  const targetState = typeof forceState === 'boolean' ? forceState : !isKineticMode;
  if (targetState === isKineticMode) return;
  await transitionToMode(targetState ? 'kinetic' : 'normal');
}

function _openShareWithIslandInterop(idx) {
  if (typeof showToast === 'function') {
    showToast("Lyric Share Card is in craftsmanship — coming in the next update!", 3200, 'info');
  }
}
window._openShareWithIslandInterop = _openShareWithIslandInterop;

const _directTrackLinkCache = new Map();

async function resolveDirectMusicLinks(title, artist) {
  if (!title || !artist) return { track: null };
  const key = `${artist} - ${title}`.trim().toLowerCase();
  const cached = _directTrackLinkCache.get(key);
  if (cached) return await cached;

  const pending = (async () => {
    let trackInfo = null;
    try {
      const apiKey = (window.lastFM && window.lastFM.apiKey) || '4f67d0ede6721fa7ade48e6800ae8935';
      const response = await window.electronAPI?.lastfmApi?.('track.getInfo', {
        artist,
        track: title,
        autocorrect: '1'
      }, apiKey, '', null);
      trackInfo = response?.track || null;
      if (trackInfo?.album?.title) {
        const albumTitle = trackInfo.album.title;
        window._lastfmDiscoveredAlbum = albumTitle;
        if (typeof currentPlayingTrackObj !== 'undefined' && currentPlayingTrackObj && !currentPlayingTrackObj.album?.name) {
          currentPlayingTrackObj.album = { ...(currentPlayingTrackObj.album || {}), name: albumTitle };
        }
        if (typeof window._triggerWordSyncWithAlbum === 'function') {
          window._triggerWordSyncWithAlbum(albumTitle);
        }
      }
    } catch (error) {
      console.warn('[Share] Last.fm track lookup failed:', error);
    }
    return { track: trackInfo };
  })();

  _directTrackLinkCache.set(key, pending);
  const result = await pending;
  _directTrackLinkCache.set(key, result);
  while (_directTrackLinkCache.size > 30) {
    const firstKey = _directTrackLinkCache.keys().next().value;
    _directTrackLinkCache.delete(firstKey);
  }
  return result;
}

function getCurrentSongShareLinks() {
  const track = (typeof currentPlayingTrackObj !== 'undefined' && currentPlayingTrackObj) ||
                (typeof currentTrack !== 'undefined' && currentTrack) || {};
  const rawTitle = track.name || track.title || (typeof currentTrackName !== 'undefined' ? currentTrackName : '') || document.getElementById('widget-track-name')?.textContent?.trim() || '';
  const title = /^(not playing|loading|spotify)$/i.test(rawTitle) ? '' : rawTitle;
  const artist = Array.isArray(track.artists)
    ? track.artists.map(item => item?.name).filter(Boolean).join(', ')
    : (track.artist || (typeof currentArtistName !== 'undefined' ? currentArtistName : '') || document.getElementById('widget-artist-name')?.textContent?.trim() || '');
  if (!title || !artist) return { title, artist, links: [] };

  const cacheKey = `${artist} - ${title}`.trim().toLowerCase();
  const cached = _directTrackLinkCache.get(cacheKey);
  const trackInfo = cached && typeof cached.then !== 'function' ? cached.track : null;
  if (!trackInfo) return { title, artist, links: [] };

  // Last.fm's track.getInfo is the source of truth. Never synthesize provider
  // search URLs or infer links from the active player's track ID.
  const links = [];
  const validateReturnedUrl = (name, value) => {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
      const host = parsed.hostname.toLowerCase();
      const allowed = {
        'Last.fm': ['last.fm', 'www.last.fm'],
        Spotify: ['open.spotify.com'],
        'Apple Music': ['music.apple.com'],
        'YouTube Music': ['music.youtube.com'],
        Deezer: ['deezer.com', 'www.deezer.com'],
        Tidal: ['tidal.com', 'www.tidal.com', 'listen.tidal.com'],
        SoundCloud: ['soundcloud.com', 'www.soundcloud.com'],
        'Amazon Music': ['music.amazon.com']
      }[name];
      if (!allowed || !allowed.includes(host)) return null;
      // Last.fm currently serializes canonical track URLs as http; upgrade
      // known provider URLs to HTTPS before exposing them as clickable links.
      parsed.protocol = 'https:';
      return parsed.href;
    } catch (_) { return null; }
  };
  const addReturned = (name, url) => {
    const verified = validateReturnedUrl(name, url);
    if (verified && !links.some(link => link.name === name)) links.push({ name, url: verified, direct: true });
  };

  addReturned('Last.fm', trackInfo.url);
  const providerLinks = trackInfo.external_urls || trackInfo.externalUrls || trackInfo.links || {};
  const providerNames = {
    Spotify: ['spotify', 'Spotify'],
    'Apple Music': ['apple_music', 'appleMusic', 'Apple Music'],
    'YouTube Music': ['youtube_music', 'youtubeMusic', 'YouTube Music'],
    Deezer: ['deezer', 'Deezer'],
    Tidal: ['tidal', 'Tidal'],
    SoundCloud: ['soundcloud', 'SoundCloud'],
    'Amazon Music': ['amazon_music', 'amazonMusic', 'Amazon Music']
  };
  for (const [name, keys] of Object.entries(providerNames)) {
    for (const key of keys) {
      const value = providerLinks[key];
      if (typeof value === 'string') addReturned(name, value);
      else if (value && typeof value.url === 'string') addReturned(name, value.url);
    }
  }

  return { title, artist, links };
}
function positionShareOptionsPopover() {
  const modal = document.getElementById('share-options-modal');
  const trigger = document.getElementById('btn-share-lyric');
  if (!modal || modal.hidden) return;

  const margin = 12;
  const gap = 10;
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
  const anchor = trigger?.getBoundingClientRect();
  const popover = modal.getBoundingClientRect();
  const popoverHeight = modal.querySelector('.share-options-dialog')?.getBoundingClientRect().height || popover.height;

  if (!anchor || (!anchor.width && !anchor.height)) {
    modal.style.left = `${margin}px`;
    modal.style.top = `${margin}px`;
    return;
  }

  const left = Math.max(margin, Math.min(
    viewportWidth - popover.width - margin,
    anchor.left + anchor.width / 2 - popover.width / 2
  ));
  const roomBelow = viewportHeight - anchor.bottom - gap - margin;
  const top = popoverHeight <= roomBelow
    ? anchor.bottom + gap
    : Math.max(margin, anchor.top - popoverHeight - gap);

  modal.style.left = `${Math.round(left)}px`;
  modal.style.top = `${Math.round(top)}px`;
}

function closeShareOptionsDialog({ restoreFocus = false } = {}) {
  const modal = document.getElementById('share-options-modal');
  const trigger = document.getElementById('btn-share-lyric');
  if (!modal) return;
  modal.hidden = true;
  trigger?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) trigger?.focus();
}

function openShareOptionsDialog() {
  const modal = document.getElementById('share-options-modal');
  const trigger = document.getElementById('btn-share-lyric');
  const trackLabel = document.getElementById('share-options-track');
  const song = getCurrentSongShareLinks();
  if (!modal) return;
  if (!modal.hidden) {
    closeShareOptionsDialog();
    return;
  }
  if (trackLabel) trackLabel.textContent = song.title ? `${song.title}${song.artist ? ` · ${song.artist}` : ''}` : 'Choose how you want to share it.';
  document.getElementById('share-options-main').hidden = false;
  document.getElementById('share-link-providers').hidden = true;
  modal.hidden = false;
  trigger?.setAttribute('aria-expanded', 'true');
  positionShareOptionsPopover();
  document.getElementById('btn-share-copy-link')?.focus();

  // Resolve and cache track links returned by Last.fm.
  if (song.title) {
    resolveDirectMusicLinks(song.title, song.artist).then(() => {
      const providersDiv = document.getElementById('share-link-providers');
      if (providersDiv && !providersDiv.hidden) {
        showSongProviderLinks();
      }
    });
  }
}

async function copyShareText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    if (!window.electronAPI?.copyToClipboard) throw error;
    await window.electronAPI.copyToClipboard(text);
  }
}

function showShareCopiedFeedback(button) {
  if (!button) return;
  const strong = button.querySelector('strong');
  if (strong) {
    if (!strong.dataset.originalLabel) strong.dataset.originalLabel = strong.textContent;
    strong.textContent = 'Copied!';
    button.classList.add('copied');
    if (button._copiedResetTimer) clearTimeout(button._copiedResetTimer);
    button._copiedResetTimer = setTimeout(() => {
      strong.textContent = strong.dataset.originalLabel || 'Copy music link';
      button.classList.remove('copied');
      button._copiedResetTimer = null;
    }, 1800);
    return;
  }
  const original = button.dataset.originalLabel || button.textContent || 'Copy';
  button.dataset.originalLabel = original;
  button.textContent = 'Copied!';
  button.classList.add('copied');
  if (button._copiedResetTimer) clearTimeout(button._copiedResetTimer);
  button._copiedResetTimer = setTimeout(() => {
    button.textContent = button.dataset.originalLabel || 'Copy';
    button.classList.remove('copied');
    button._copiedResetTimer = null;
  }, 1800);
}

function getMusicServiceLogo(name) {
  const icons = {
    Spotify: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1ed760"/><path d="M5 9c4.6-1.4 10.4-.9 14 1.4M6 12c4-1.1 8.8-.7 12 1.2M7 15c3.2-.8 6.8-.5 9.4 1" fill="none" stroke="#101410" stroke-width="1.7" stroke-linecap="round"/></svg>',
    'Apple Music': '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="lf-apple-music-new" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FC3C44"/><stop offset="50%" stop-color="#FA243C"/><stop offset="100%" stop-color="#E61E38"/></linearGradient></defs><rect width="24" height="24" rx="5.5" fill="url(#lf-apple-music-new)"/><path fill="#ffffff" d="M16.5 5.8c0-.05-.03-.09-.07-.12-.04-.03-.09-.04-.14-.03l-7.1 1.55c-.09.02-.16.1-.16.19v9.11c-.42-.33-.96-.53-1.55-.53-1.39 0-2.52 1.05-2.52 2.34 0 1.3 1.13 2.35 2.52 2.35 1.34 0 2.43-.98 2.51-2.23V9.89l5.4-1.18v6.8c-.42-.33-.96-.53-1.55-.53-1.39 0-2.52 1.05-2.52 2.34 0 1.3 1.13 2.35 2.52 2.35 1.34 0 2.43-.98 2.51-2.23V5.8z"/></svg>',
    'Last.fm': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5.5" fill="#D51007"/><path fill="#ffffff" d="M10.2 14.5c-.3.7-1 1.4-2.1 1.4-1.5 0-2.6-1.3-2.6-3.2 0-2.2 1.3-3.3 2.7-3.3 1.5 0 2.2.9 2.5 1.9l1.6-.7c-.5-1.5-1.8-2.6-4.1-2.6-2.6 0-4.6 1.8-4.6 4.7 0 2.7 1.7 4.7 4.5 4.7 2.1 0 3.3-1.1 3.8-2.2l-1.7-.7zm6.7-4.1c-1.3 0-2.1.7-2.5 1.4v-1.2h-1.6v6.7h1.6v-3.7c0-1.1.7-1.8 1.8-1.8.3 0 .6.1.8.2l.6-1.5c-.3-.1-.5-.1-.7-.1z"/></svg>',
    'YouTube Music': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#ff0033"/><path d="m10 7.8 6.4 4.2-6.4 4.2z" fill="#fff"/></svg>',
    Deezer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#a238ff" d="M2 16h4v4H2z"/><path fill="#ff4d6d" d="M7 13h4v7H7z"/><path fill="#ffb800" d="M12 10h4v10h-4z"/><path fill="#31d7b0" d="M17 6h5v14h-5z"/></svg>',
    Tidal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="m4 7 3-3 3 3-3 3zm5 5 3-3 3 3-3 3zm5-5 3-3 3 3-3 3zm-5 5 3 3-3 3-3-3z"/></svg>',
    SoundCloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#ff6a00" d="M3 14.2a3 3 0 0 1 2.4-2.9 5.5 5.5 0 0 1 10.7-.8A3.6 3.6 0 1 1 17 18H5.5A2.5 2.5 0 0 1 3 15.5z"/><path stroke="#fff" stroke-width="1" d="M5 14v3m2-4v4m2-5v5"/></svg>',
    'Amazon Music': '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M7 5.2c1.1-.8 2.5-1.2 4.4-1.2 3.8 0 5.7 1.6 5.7 4.8v6.4c0 .7.2 1.4.7 2l-2.4 1.3-1.5-1.8a5.7 5.7 0 0 1-4.1 1.7c-2.9 0-4.6-1.5-4.6-4s1.9-4.2 5-4.2c1.3 0 2.3.2 3.3.7V9.2c0-1.4-.8-2.1-2.4-2.1-1.2 0-2.4.3-3.6.9z"/><path d="M5 20c4 2.4 9 2.4 13.5-.2" fill="none" stroke="#ff9900" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };
  const logo = document.createElement('span');
  logo.className = `share-provider-logo share-provider-logo-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  logo.setAttribute('aria-label', `${name} logo`);
  logo.innerHTML = icons[name] || '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 8v8l7-4z" fill="currentColor"/></svg>';
  return logo;
}

function showSongProviderLinks() {
  const song = getCurrentSongShareLinks();
  const list = document.getElementById('share-provider-list');
  if (!list || song.links.length === 0) {
    showToast('No verified track link is available for this song.', 2400, 'warning');
    return;
  }
  list.replaceChildren();
  song.links.forEach(link => {
    const row = document.createElement('div');
    row.className = 'share-provider-row';
    const label = document.createElement('span');
    label.className = 'share-provider-name';
    row.appendChild(getMusicServiceLogo(link.name));
    label.append(document.createTextNode(link.name));
    const kind = document.createElement('small');
    kind.className = 'share-provider-kind';
    kind.textContent = 'Track link';
    label.appendChild(kind);
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'share-provider-open';
    open.textContent = 'Open';
    open.addEventListener('click', () => window.electronAPI?.openExternal?.(link.url));
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'share-provider-copy';
    copy.textContent = 'Copy';
    copy.setAttribute('aria-live', 'polite');
    copy.addEventListener('click', async () => {
      try {
        await copyShareText(link.url);
        showShareCopiedFeedback(copy);
        showToast(`${link.name} link copied.`, 1800, 'success');
      } catch (_) {
        showToast('Could not copy link.', 1800, 'warning');
      }
    });
    row.append(label, open, copy);
    list.appendChild(row);
  });
  document.getElementById('share-options-main').hidden = true;
  document.getElementById('share-link-providers').hidden = false;
  positionShareOptionsPopover();
  document.getElementById('btn-share-links-back')?.focus();
}

function bindShareOptionsDialog() {
  const modal = document.getElementById('share-options-modal');
  if (!modal || modal._bound) return;
  modal._bound = true;
  modal.querySelectorAll('[data-share-options-close]').forEach(button => button.addEventListener('click', () => {
    closeShareOptionsDialog({ restoreFocus: true });
  }));
  document.getElementById('btn-share-copy-link')?.addEventListener('click', async () => {
    const currentSong = getCurrentSongShareLinks();
    if (!currentSong.title || !currentSong.artist) {
      showToast('No track is currently playing.', 2000, 'warning');
      return;
    }
    await resolveDirectMusicLinks(currentSong.title, currentSong.artist);
    const song = getCurrentSongShareLinks();
    if (!song.links.length) {
      showToast('Last.fm did not return any track links for this song.', 2200, 'warning');
      return;
    }
    // Open the returned provider choices first; copying happens only after the
    // user chooses a specific service or selects Copy all service links.
    showSongProviderLinks();
  });
  document.getElementById('btn-share-open-card')?.addEventListener('click', () => {
    closeShareOptionsDialog({ restoreFocus: true });
    _openShareWithIslandInterop(activeLineIndex);
  });
  document.getElementById('btn-share-links-back')?.addEventListener('click', () => {
    document.getElementById('share-link-providers').hidden = true;
    document.getElementById('share-options-main').hidden = false;
    positionShareOptionsPopover();
    document.getElementById('btn-share-copy-link')?.focus();
  });
  document.getElementById('btn-share-copy-all-links')?.addEventListener('click', async () => {
    const song = getCurrentSongShareLinks();
    if (!song.links.length) return;
    const text = `${song.title}${song.artist ? ` — ${song.artist}` : ''}\n${song.links.map(link => `${link.name}: ${link.url}`).join('\n')}`;
    try {
      await copyShareText(text);
      showShareCopiedFeedback(document.getElementById('btn-share-copy-all-links'));
      showToast('Music service links copied.', 1800, 'success');
    } catch (_) {
      showToast('Could not copy links.', 1800, 'warning');
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closeShareOptionsDialog({ restoreFocus: true });
  });
  document.addEventListener('pointerdown', event => {
    if (modal.hidden) return;
    const target = event.target;
    if (modal.contains(target) || target.closest?.('#btn-share-lyric')) return;
    closeShareOptionsDialog();
  });
  window.addEventListener('resize', positionShareOptionsPopover);
  document.addEventListener('scroll', positionShareOptionsPopover, true);
  initAboutModals();
}

/* ==========================================================================
   Last.fm "About Song" & "About Artist" Apple HIG Insights Modal Handlers
   ========================================================================== */

function _formatLastfmCount(n) {
  const num = parseInt(n, 10);
  if (isNaN(num)) return '-';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString();
}

async function openAboutSongPopup(trackTitle, artistName) {
  const modal = document.getElementById('about-song-modal');
  if (!modal) return;

  const currentTrackObj = (typeof currentPlayingTrackObj !== 'undefined' ? currentPlayingTrackObj : null) ||
                          (typeof currentTrack !== 'undefined' ? currentTrack : null);
  const title = (trackTitle || currentTrackObj?.name || currentTrackObj?.title || currentTrackName || document.getElementById('widget-track-name')?.textContent || '').trim();
  const artist = (artistName || (Array.isArray(currentTrackObj?.artists) ? currentTrackObj.artists.map(a => a.name).join(', ') : currentTrackObj?.artist) || currentArtistName || document.getElementById('widget-artist-name')?.textContent || '').trim();

  if (!title || /^(not playing|loading|spotify)$/i.test(title)) {
    showToast('Play a song to view its story and Last.fm insights.', 2200, 'info');
    return;
  }

  // Populate immediate UI
  document.getElementById('about-song-title').textContent = title;
  const artistLink = document.getElementById('about-song-artist');
  if (artistLink) {
    artistLink.textContent = artist || 'Unknown Artist';
    artistLink.onclick = (e) => {
      e.preventDefault();
      closeAboutSongModal();
      openAboutArtistPage(artist);
    };
  }

  const albumName = (currentPlayingTrackObj?.album?.name) || (currentTrackObj?.album?.name) || 'Single / Album';
  document.getElementById('about-song-album').textContent = albumName;

  const currentArt = currentStaticAlbumArtUrl || (typeof cachedCoverUrl !== 'undefined' ? cachedCoverUrl : null) || 'assets/icon.png';
  document.getElementById('about-song-art').src = currentArt;

  document.getElementById('about-song-listeners').textContent = '...';
  document.getElementById('about-song-playcount').textContent = '...';
  document.getElementById('about-song-user-stat').textContent = '...';
  document.getElementById('about-song-tags').innerHTML = '';
  document.getElementById('about-song-wiki').innerHTML = '<div class="lf-skeleton-loading">Fetching track biography and wiki from Last.fm...</div>';

  modal.style.display = 'flex';
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');

  // Direct action links
  const directLinks = await resolveDirectMusicLinks(title, artist);
  const lfmLink = document.getElementById('about-song-link-lastfm');
  if (lfmLink) {
    lfmLink.href = directLinks?.['Last.fm'] || `https://www.last.fm/music/${encodeURIComponent(artist)}/_/${encodeURIComponent(title)}`;
    lfmLink.onclick = (e) => { e.preventDefault(); window.electronAPI?.openExternal?.(lfmLink.href) || window.open(lfmLink.href, '_blank'); };
  }
  const appleLink = document.getElementById('about-song-link-apple');
  if (appleLink) {
    appleLink.href = directLinks?.['Apple Music'] || `https://music.apple.com/us/search?term=${encodeURIComponent(artist + ' ' + title)}`;
    appleLink.onclick = (e) => { e.preventDefault(); window.electronAPI?.openExternal?.(appleLink.href) || window.open(appleLink.href, '_blank'); };
  }
  const spotLink = document.getElementById('about-song-link-spotify');
  if (spotLink) {
    spotLink.href = directLinks?.Spotify || `https://open.spotify.com/search/${encodeURIComponent(artist + ' ' + title)}`;
    spotLink.onclick = (e) => { e.preventDefault(); window.electronAPI?.openExternal?.(spotLink.href) || window.open(spotLink.href, '_blank'); };
  }

  // Fetch full track.getInfo from Last.fm
  try {
    const lfmApiKey = (window.lastFM && window.lastFM.apiKey) || '4f67d0ede6721fa7ade48e6800ae8935';
    const username = (window.lastFM && window.lastFM.username) || '';
    let data = null;
    if (window.electronAPI && typeof window.electronAPI.lastfmApi === 'function') {
      data = await window.electronAPI.lastfmApi('track.getInfo', {
        artist: artist,
        track: title,
        username: username,
        autocorrect: '1'
      }, lfmApiKey, '', null);
    } else {
      const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&username=${encodeURIComponent(username)}&api_key=${encodeURIComponent(lfmApiKey)}&format=json&autocorrect=1`;
      const res = await fetch(url);
      if (res.ok) data = await res.json();
    }

    if (data && data.track) {
      const trk = data.track;
      if (trk.album && trk.album.title) {
        document.getElementById('about-song-album').textContent = trk.album.title;
      }
      if (trk.album && Array.isArray(trk.album.image) && trk.album.image.length > 0) {
        const art = trk.album.image.find(i => i.size === 'extralarge' || i.size === 'large') || trk.album.image[trk.album.image.length - 1];
        if (art && art['#text'] && !art['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          document.getElementById('about-song-art').src = art['#text'];
        }
      }

      document.getElementById('about-song-listeners').textContent = _formatLastfmCount(trk.listeners);
      document.getElementById('about-song-playcount').textContent = _formatLastfmCount(trk.playcount);

      const userStat = document.getElementById('about-song-user-stat');
      const userLabel = document.getElementById('about-song-user-label');
      if (trk.userplaycount && parseInt(trk.userplaycount, 10) > 0) {
        userStat.textContent = parseInt(trk.userplaycount, 10).toLocaleString();
        userLabel.textContent = trk.userloved === '1' ? 'Scrobbles' : 'Your Scrobbles';
      } else if (trk.userloved === '1') {
        userStat.textContent = 'Loved';
        userLabel.textContent = 'Last.fm Status';
      } else {
        const dur = (typeof trackDuration === 'number' && trackDuration > 0)
          ? formatTime(trackDuration)
          : (trk.duration && parseInt(trk.duration, 10) > 0 ? formatTime(parseInt(trk.duration, 10) / 1000) : '-');
        userStat.textContent = dur;
        userLabel.textContent = 'Duration';
      }

      // Tags
      const tagsContainer = document.getElementById('about-song-tags');
      tagsContainer.innerHTML = '';
      if (trk.toptags && Array.isArray(trk.toptags.tag)) {
        trk.toptags.tag.slice(0, 6).forEach(tag => {
          const chip = document.createElement('span');
          chip.className = 'lf-tag-chip';
          chip.textContent = tag.name;
          tagsContainer.appendChild(chip);
        });
      }

      // Wiki / Story
      const wikiEl = document.getElementById('about-song-wiki');
      if (trk.wiki && (trk.wiki.summary || trk.wiki.content)) {
        const raw = trk.wiki.content || trk.wiki.summary;
        const clean = raw.replace(/<a\b[^>]*>Read more on Last\.fm<\/a>/gi, '').trim();
        const paras = clean.split(/\n\n+/).filter(Boolean);
        if (paras.length > 0) {
          wikiEl.innerHTML = paras.map(p => `<p>${escapeHTML(p)}</p>`).join('');
        } else {
          wikiEl.textContent = clean;
        }
      } else {
        wikiEl.innerHTML = `<p style="opacity: 0.6; font-style: italic;">No editorial bio is currently available for this track on Last.fm. Scrobble it to contribute to the music community!</p>`;
      }
    } else {
      document.getElementById('about-song-wiki').innerHTML = `<p style="opacity: 0.6; font-style: italic;">No additional track insights found on Last.fm for “${escapeHTML(title)}”.</p>`;
    }
  } catch (err) {
    console.warn('[About Song] Last.fm fetch error:', err);
    document.getElementById('about-song-wiki').innerHTML = `<p style="opacity: 0.6;">Unable to load Last.fm track information at this moment.</p>`;
  }
}

function closeAboutSongModal() {
  const modal = document.getElementById('about-song-modal');
  const songArt = document.getElementById('about-song-art');
  if (songArt && songArt.src && songArt.src.startsWith('data:')) {
    songArt.removeAttribute('src');
  }
  if (modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      if (!modal.classList.contains('is-open')) {
        modal.style.display = 'none';
      }
    }, 240);
  }
}

async function openAboutArtistPage(artistName) {
  const modal = document.getElementById('about-artist-modal');
  if (!modal) return;

  const currentTrackObj = (typeof currentPlayingTrackObj !== 'undefined' ? currentPlayingTrackObj : null) ||
                          (typeof currentTrack !== 'undefined' ? currentTrack : null);
  const artist = (artistName || (Array.isArray(currentTrackObj?.artists) ? currentTrackObj.artists.map(a => a.name).join(', ') : currentTrackObj?.artist) || currentArtistName || document.getElementById('widget-artist-name')?.textContent || '').trim();

  if (!artist || /^(not playing|loading|spotify)$/i.test(artist)) {
    showToast('Play an artist to view their biography and top tracks.', 2200, 'info');
    return;
  }

  document.getElementById('about-artist-title').textContent = artist;
  document.getElementById('about-artist-subtitle').textContent = `Last.fm Global Artist Profile`;

  const currentArt = currentStaticAlbumArtUrl || (typeof cachedCoverUrl !== 'undefined' ? cachedCoverUrl : null) || 'assets/icon.png';
  document.getElementById('about-artist-art').src = currentArt;

  document.getElementById('about-artist-listeners').textContent = '...';
  document.getElementById('about-artist-playcount').textContent = '...';
  document.getElementById('about-artist-tour').textContent = '...';
  document.getElementById('about-artist-tags').innerHTML = '';
  document.getElementById('about-artist-bio').innerHTML = '<div class="lf-skeleton-loading">Fetching artist biography and history from Last.fm...</div>';
  document.getElementById('about-artist-tracks').innerHTML = '<div class="lf-skeleton-loading" style="padding: 10px; font-size: 12px; color: rgba(255,255,255,0.6);">Loading top tracks...</div>';
  document.getElementById('about-artist-similar').innerHTML = '';

  modal.style.display = 'flex';
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');

  // Direct action links in footer
  const lfmLink = document.getElementById('about-artist-link-lastfm');
  if (lfmLink) {
    lfmLink.href = `https://www.last.fm/music/${encodeURIComponent(artist)}`;
    lfmLink.onclick = (e) => { e.preventDefault(); window.electronAPI?.openExternal?.(lfmLink.href) || window.open(lfmLink.href, '_blank'); };
  }
  const appleLink = document.getElementById('about-artist-link-apple');
  if (appleLink) {
    appleLink.href = `https://music.apple.com/us/search?term=${encodeURIComponent(artist)}`;
    appleLink.onclick = (e) => { e.preventDefault(); window.electronAPI?.openExternal?.(appleLink.href) || window.open(appleLink.href, '_blank'); };
  }
  const spotLink = document.getElementById('about-artist-link-spotify');
  if (spotLink) {
    spotLink.href = `https://open.spotify.com/search/${encodeURIComponent(artist)}`;
    spotLink.onclick = (e) => { e.preventDefault(); window.electronAPI?.openExternal?.(spotLink.href) || window.open(spotLink.href, '_blank'); };
  }

  const lfmApiKey = (window.lastFM && window.lastFM.apiKey) || '4f67d0ede6721fa7ade48e6800ae8935';

  // 1. Fetch artist.getInfo
  try {
    let infoData = null;
    if (window.electronAPI && typeof window.electronAPI.lastfmApi === 'function') {
      infoData = await window.electronAPI.lastfmApi('artist.getInfo', {
        artist: artist,
        autocorrect: '1'
      }, lfmApiKey, '', null);
    } else {
      const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getInfo&artist=${encodeURIComponent(artist)}&api_key=${encodeURIComponent(lfmApiKey)}&format=json&autocorrect=1`;
      const res = await fetch(url);
      if (res.ok) infoData = await res.json();
    }

    if (infoData && infoData.artist) {
      const a = infoData.artist;
      if (a.stats) {
        document.getElementById('about-artist-listeners').textContent = _formatLastfmCount(a.stats.listeners);
        document.getElementById('about-artist-playcount').textContent = _formatLastfmCount(a.stats.playcount);
      }
      document.getElementById('about-artist-tour').textContent = (a.ontour === '1') ? 'On Tour' : 'Off Tour';

      // Artist Image if available
      if (Array.isArray(a.image) && a.image.length > 0) {
        const art = a.image.find(i => i.size === 'mega' || i.size === 'extralarge') || a.image[a.image.length - 1];
        if (art && art['#text'] && !art['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          document.getElementById('about-artist-art').src = art['#text'];
        }
      }

      // Genre tags
      const tagsContainer = document.getElementById('about-artist-tags');
      tagsContainer.innerHTML = '';
      if (a.tags && Array.isArray(a.tags.tag)) {
        a.tags.tag.slice(0, 6).forEach(tag => {
          const chip = document.createElement('span');
          chip.className = 'lf-tag-chip';
          chip.textContent = tag.name;
          tagsContainer.appendChild(chip);
        });
      }

      // Biography
      const bioEl = document.getElementById('about-artist-bio');
      if (a.bio && (a.bio.content || a.bio.summary)) {
        const raw = a.bio.content || a.bio.summary;
        const clean = raw.replace(/<a\b[^>]*>Read more on Last\.fm<\/a>/gi, '').trim();
        const paras = clean.split(/\n\n+/).filter(Boolean);
        if (paras.length > 0) {
          bioEl.innerHTML = paras.map(p => `<p>${escapeHTML(p)}</p>`).join('');
        } else {
          bioEl.textContent = clean;
        }
      } else {
        bioEl.innerHTML = `<p style="opacity: 0.6; font-style: italic;">No biography available for this artist on Last.fm.</p>`;
      }

      // Similar Artists
      const simContainer = document.getElementById('about-artist-similar');
      simContainer.innerHTML = '';
      if (a.similar && Array.isArray(a.similar.artist)) {
        a.similar.artist.slice(0, 8).forEach(sim => {
          const chip = document.createElement('span');
          chip.className = 'lf-similar-chip';
          chip.textContent = sim.name;
          chip.title = `View ${sim.name}`;
          chip.onclick = () => openAboutArtistPage(sim.name);
          simContainer.appendChild(chip);
        });
      }
    } else {
      document.getElementById('about-artist-bio').innerHTML = `<p style="opacity: 0.6; font-style: italic;">No artist information found on Last.fm for “${escapeHTML(artist)}”.</p>`;
    }
  } catch (err) {
    console.warn('[About Artist] artist.getInfo error:', err);
    document.getElementById('about-artist-bio').innerHTML = `<p style="opacity: 0.6;">Unable to load artist biography at this time.</p>`;
  }

  // 2. Fetch artist.getTopTracks
  try {
    let topTracksData = null;
    if (window.electronAPI && typeof window.electronAPI.lastfmApi === 'function') {
      topTracksData = await window.electronAPI.lastfmApi('artist.getTopTracks', {
        artist: artist,
        limit: '5',
        autocorrect: '1'
      }, lfmApiKey, '', null);
    } else {
      const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getTopTracks&artist=${encodeURIComponent(artist)}&limit=5&api_key=${encodeURIComponent(lfmApiKey)}&format=json&autocorrect=1`;
      const res = await fetch(url);
      if (res.ok) topTracksData = await res.json();
    }

    const tracksList = document.getElementById('about-artist-tracks');
    tracksList.innerHTML = '';
    if (topTracksData && topTracksData.toptracks && Array.isArray(topTracksData.toptracks.track) && topTracksData.toptracks.track.length > 0) {
      topTracksData.toptracks.track.slice(0, 5).forEach((t, idx) => {
        const item = document.createElement('div');
        item.className = 'lf-track-item';
        item.title = `View story for “${t.name}”`;
        item.innerHTML = `
          <span class="lf-track-rank">${idx + 1}</span>
          <span class="lf-track-name">${escapeHTML(t.name)}</span>
          <span class="lf-track-plays">${_formatLastfmCount(t.playcount)} plays</span>
        `;
        item.onclick = () => {
          closeAboutArtistModal();
          openAboutSongPopup(t.name, artist);
        };
        tracksList.appendChild(item);
      });
    } else {
      tracksList.innerHTML = `<div style="font-size: 12px; opacity: 0.6; padding: 6px;">No top tracks listed on Last.fm.</div>`;
    }
  } catch (err) {
    console.warn('[About Artist] artist.getTopTracks error:', err);
  }
}

function closeAboutArtistModal() {
  const modal = document.getElementById('about-artist-modal');
  const artistArt = document.getElementById('about-artist-art');
  if (artistArt && artistArt.src && artistArt.src.startsWith('data:')) {
    artistArt.removeAttribute('src');
  }
  if (modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      if (!modal.classList.contains('is-open')) {
        modal.style.display = 'none';
      }
    }, 240);
  }
}

function initAboutModals() {
  if (window._aboutModalsInitialized) return;
  window._aboutModalsInitialized = true;

  document.getElementById('about-song-close')?.addEventListener('click', closeAboutSongModal);
  document.getElementById('about-song-backdrop')?.addEventListener('click', closeAboutSongModal);
  document.getElementById('about-artist-close')?.addEventListener('click', closeAboutArtistModal);
  document.getElementById('about-artist-backdrop')?.addEventListener('click', closeAboutArtistModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAboutSongModal();
      closeAboutArtistModal();
    }
  });

  // Global document delegated click listener so clicking track title or artist across any screen/view reliably opens modal
  document.addEventListener('click', (e) => {
    // If click is inside an open modal or interactive buttons, let modal/button handlers manage it
    if (e.target.closest('#about-song-modal, #about-artist-modal, #share-options-modal, #share-card-modal, .share-choice-card, .btn-action-round, #btn-share-copy-all-links, .btn-hide-lyrics, .btn-secondary, button, input')) {
      return;
    }

    const trackTarget = e.target.closest(
      '#widget-track-name, #widget-track-name-wrapper, .track-name, .track-name-wrapper, ' +
      '#island-track-title, .island-track-title, ' +
      '#wallpaper-track-title, .wallpaper-track-title, ' +
      '#studio-track-title, .studio-track-title'
    );
    if (trackTarget && !trackTarget.closest('.no-about-popup')) {
      e.preventDefault();
      e.stopPropagation();
      openAboutSongPopup();
      return;
    }

    const artistTarget = e.target.closest(
      '#widget-artist-name, #widget-artist-name-wrapper, .artist-name, .artist-name-wrapper, .track-artist, ' +
      '#island-track-artist, .island-track-artist, ' +
      '#wallpaper-track-artist, .wallpaper-track-artist, ' +
      '#studio-track-artist, .studio-track-artist'
    );
    if (artistTarget && !artistTarget.closest('.no-about-popup')) {
      e.preventDefault();
      e.stopPropagation();
      openAboutArtistPage();
      return;
    }
  });

  // Fallback direct bindings for specific elements
  const trackTitleElements = [
    document.getElementById('widget-track-name'),
    document.getElementById('widget-track-name-wrapper'),
    document.getElementById('island-track-title'),
    document.getElementById('wallpaper-track-title'),
    document.getElementById('studio-track-title')
  ];
  trackTitleElements.forEach(el => {
    if (el) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openAboutSongPopup();
      });
    }
  });

  // Artist name clicks open About Artist page
  const artistElements = [
    document.getElementById('widget-artist-name'),
    document.getElementById('widget-artist-name-wrapper'),
    document.getElementById('island-track-artist'),
    document.getElementById('wallpaper-track-artist'),
    document.getElementById('studio-track-artist')
  ];
  artistElements.forEach(el => {
    if (el) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openAboutArtistPage();
      });
    }
  });
}

function initKineticMode() {
  const canvas = document.getElementById("kinetic-canvas");
  if (!canvas) return;

  if (!kineticRendererInstance && window.KineticCanvasRenderer) {
    kineticRendererInstance = new window.KineticCanvasRenderer(canvas, { width: 720, height: 1280 });
  }

  const container = document.getElementById("kinetic-mode-container");
  const floatingBar = document.getElementById("kinetic-floating-bar");
  if (container && floatingBar && !container._kineticMoveBound) {
    container._kineticMoveBound = true;
    container.addEventListener("mousemove", () => {
      floatingBar.classList.remove("idle-hidden");
      if (kineticIdleTimeout) clearTimeout(kineticIdleTimeout);
      kineticIdleTimeout = setTimeout(() => {
        if (isKineticMode) floatingBar.classList.add("idle-hidden");
      }, 2500);
    });
  }

  const shapeSelect = document.getElementById("kinetic-shape-select");
  if (shapeSelect && !shapeSelect._bound) {
    shapeSelect._bound = true;
    shapeSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      const mode = (val === 'auto' || val === 'random') ? val : 'manual';
      if (kineticRendererInstance) {
        kineticRendererInstance.configure({
          shapeMode: mode,
          shapeType: val
        });
        if (typeof kineticRendererInstance.triggerShapePreview === 'function') {
          kineticRendererInstance.triggerShapePreview(val);
        }
      }
    });
  }

  const colorSelect = document.getElementById("kinetic-color-select");
  if (colorSelect && !colorSelect._bound) {
    colorSelect._bound = true;
    colorSelect.addEventListener("change", (e) => {
      if (kineticRendererInstance) {
        const val = e.target.value;
        const mode = val === 'album_art' ? 'album_art' : 'preset';
        kineticRendererInstance.configure({
          colorMode: mode,
          presetKey: val
        });
      }
    });
  }

  if (widgetAlbumArt && !widgetAlbumArt._kineticBound) {
    widgetAlbumArt._kineticBound = true;
    widgetAlbumArt.addEventListener("load", () => {
      if (isKineticMode && kineticRendererInstance) {
        syncKineticState();
      }
    });
  }

  const btnShare = document.getElementById("btn-kinetic-share");
  if (btnShare && !btnShare._bound) {
    btnShare._bound = true;
    btnShare.addEventListener("click", () => {
      if (typeof window.shareState !== 'undefined') {
        window.shareState.designMode = 'kinetic';
      }
      if (typeof _openShareWithIslandInterop === 'function') {
        _openShareWithIslandInterop(activeLineIndex);
      } else if (typeof window.openShareModal === 'function') {
        window.openShareModal(activeLineIndex);
      }
    });
  }

  const btnClose = document.getElementById("btn-kinetic-close");
  if (btnClose && !btnClose._bound) {
    btnClose._bound = true;
    btnClose.addEventListener("click", () => {
      toggleKineticMode(false);
    });
  }
}

function updateCinematicLyricsFallback() {
  const fallback = document.getElementById('cinematic-lyrics-fallback');
  if (fallback) {
    fallback.remove();
  }
}

function syncCinematicState() {
  if (!cinematicMainRendererInstance) {
    const canvas = document.getElementById("cinematic-main-canvas");
    if (canvas) {
      initCinematicMainStage();
      return;
    }
    return;
  }

  let domRgb = null;
  if (window.currentDynamicDominantRgb) {
    domRgb = window.currentDynamicDominantRgb;
  } else if (typeof currentDynamicAccentColor === 'string' && window.KineticColorEngine) {
    domRgb = window.KineticColorEngine.hexToRgb(currentDynamicAccentColor);
  }

  const trackObj = (typeof currentPlayingTrackObj !== 'undefined' && currentPlayingTrackObj) ? currentPlayingTrackObj : null;
  const artistName = (trackObj && trackObj.artists && trackObj.artists[0]?.name)
    || (trackObj && trackObj.artist)
    || (widgetArtistName && widgetArtistName.textContent ? widgetArtistName.textContent.trim() : '');
  const trackName = (trackObj && trackObj.name)
    || (trackObj && trackObj.title)
    || (widgetTrackName && widgetTrackName.textContent ? widgetTrackName.textContent.trim() : '');

  const lyricsToUse = (Array.isArray(lyrics) && lyrics.length > 0) ? lyrics : [];

  const isReducedMotion = Boolean(
    (settings && settings.reducedMotion) ||
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );

  const artImg = (widgetAlbumArt && widgetAlbumArt.complete && widgetAlbumArt.naturalWidth)
    ? widgetAlbumArt
    : (document.getElementById('studio-album-art') || document.getElementById('wallpaper-album-art'));
  const artUrl = currentStaticAlbumArtUrl
    || (trackObj && trackObj.album && trackObj.album.images && (trackObj.album.images[1]?.url || trackObj.album.images[0]?.url))
    || (typeof cachedCoverUrl !== 'undefined' ? cachedCoverUrl : '')
    || (artImg && artImg.src ? artImg.src : '');

  const badgeTitle = document.getElementById("cinematic-badge-title");
  const badgeArtist = document.getElementById("cinematic-badge-artist");
  if (badgeTitle && trackName) badgeTitle.textContent = trackName;
  if (badgeArtist && artistName) badgeArtist.textContent = artistName;

  // Keep album art as the cinematic background. The lyric layer itself omits it.
  if (typeof cinematicMainRendererInstance.setAlbumArt === 'function') {
    cinematicMainRendererInstance.setAlbumArt(artUrl || artImg);
  }
  cinematicMainRendererInstance.configure({
    isCinematic: true,
    skipIntroMorph: true,
    shapeMode: 'auto',
    colorMode: 'album_art',
    artist: artistName,
    title: trackName,
    creatorTag: artistName ? `@${artistName.replace(/\s+/g, '').toLowerCase()}` : '',
    artworkImage: (widgetAlbumArt && widgetAlbumArt.complete && widgetAlbumArt.naturalWidth) ? widgetAlbumArt : artImg,
    artworkUrl: artUrl,
    dominantRgb: domRgb,
    lyrics: lyricsToUse,
    startTimeMs: 0,
    endTimeMs: trackDuration || null,
    fadeLyrics: true,
    reducedMotion: isReducedMotion
  });

  const syncProgress = getAcousticSyncProgress();
  if (typeof cinematicMainRendererInstance.setPausedState === 'function') {
    cinematicMainRendererInstance.setPausedState(!isPlaying, { title: trackName, artist: artistName });
  }
  cinematicMainRendererInstance.seek(syncProgress);
  updateCinematicLyricsFallback(syncProgress);
}

function initCinematicMainStage() {
  const canvas = document.getElementById("cinematic-main-canvas");
  const stage = document.getElementById("cinematic-main-stage");
  const viewport = document.getElementById("lyrics-viewport");
  if (!canvas || (!stage && !viewport)) return;

  const targetEl = stage || viewport;
  const rect = targetEl ? targetEl.getBoundingClientRect() : { width: 0, height: 0 };
  const isWallpaper = Boolean(settings && settings.wallpaperMode);
  const width = isWallpaper ? Math.max(800, window.innerWidth || 1920) : Math.max(300, Math.floor(rect.width || window.innerWidth || 780));
  const height = isWallpaper ? Math.max(600, window.innerHeight || 1080) : Math.max(200, Math.floor(rect.height || window.innerHeight || 480));

  if (fluidMeshGradientInstance) {
    fluidMeshGradientInstance.stop();
  }

  if (!cinematicMainRendererInstance && window.KineticCanvasRenderer) {
    cinematicMainRendererInstance = new window.KineticCanvasRenderer(canvas, { width, height, isCinematic: true });
    syncCinematicState();
  } else if (cinematicMainRendererInstance) {
    cinematicMainRendererInstance.setDimensions(width, height);
  }

  // Bind cinematic track info badge click
  const trackBadge = document.getElementById("cinematic-track-badge");
  if (trackBadge && !trackBadge._boundTrackBadge) {
    trackBadge._boundTrackBadge = true;
    trackBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target && e.target.id === 'cinematic-badge-artist') {
        openAboutArtistPage();
      } else {
        openAboutSongPopup();
      }
    });
  }

  // Bind exit button click if not already bound
  const btnExit = document.getElementById("btn-cinematic-exit");
  if (btnExit && !btnExit._boundCinematicExit) {
    btnExit._boundCinematicExit = true;
    btnExit.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCinematicView(false);
    });
  }

  const btnSetWall = document.getElementById("btn-cinematic-set-wallpaper");
  if (btnSetWall && !btnSetWall._boundCinematicWall) {
    btnSetWall._boundCinematicWall = true;
    btnSetWall.addEventListener("click", (e) => {
      e.stopPropagation();
      settings.wallpaperStyle = 'cinematic';
      toggleWallpaperMode(true);
    });
  }

  // Prevent scroll and drag events on the cinematic stage from bubbling to lyricsViewport or triggering resync buttons
  if (stage && !stage._boundStopPropagation) {
    stage._boundStopPropagation = true;
    stage.addEventListener('wheel', (e) => {
      e.stopPropagation();
      e.preventDefault();
    }, { passive: false });
    stage.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
    stage.addEventListener('pointermove', (e) => { e.stopPropagation(); });
  }

  if (targetEl && !targetEl._cinematicResizeObserver && typeof ResizeObserver !== 'undefined') {
    targetEl._cinematicResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 50 && cr.height > 50 && cinematicMainRendererInstance) {
          cinematicMainRendererInstance.setDimensions(Math.floor(cr.width), Math.floor(cr.height));
          const syncPrg = getAcousticSyncProgress();
          cinematicMainRendererInstance.seek(syncPrg);
        }
      }
    });
    targetEl._cinematicResizeObserver.observe(targetEl);
  }

  syncCinematicState();
}

function purgeClassicLyricHighlightState() {
  activeLineIndex = -1;
  if (lyricsContainer) {
    const lines = lyricsContainer.querySelectorAll('.lyric-line');
    for (let i = 0; i < lines.length; i++) {
      lines[i].classList.remove('active', 'nearby-1');
      delete lines[i]._lastWordStates;
      delete lines[i]._activeWordIdx;
      delete lines[i]._cachedWordSpans;
      delete lines[i]._lastBackingWordStates;
      delete lines[i]._cachedBackingWordSpans;
    }
    const words = lyricsContainer.querySelectorAll('.lyric-word, .lyric-word-backing');
    for (let j = 0; j < words.length; j++) {
      const w = words[j];
      w.classList.remove('lyric-word-active', 'lyric-word-passed', 'lyric-word-completed');
      w.classList.add('lyric-word-upcoming');
      delete w._lastProgressValue;
      delete w._lastProgressPercent;
      w.style.removeProperty('--word-progress');
      w.style.removeProperty('--word-progress-percent');
      w.style.removeProperty('--word-fill-clip');
    }
  }
  if (Array.isArray(cachedLineEls)) {
    for (let i = 0; i < cachedLineEls.length; i++) {
      const lineEl = cachedLineEls[i];
      if (!lineEl) continue;
      lineEl.classList.remove('active', 'nearby-1');
      delete lineEl._lastWordStates;
      delete lineEl._activeWordIdx;
      delete lineEl._cachedWordSpans;
      delete lineEl._lastBackingWordStates;
      delete lineEl._cachedBackingWordSpans;
      const words = lineEl.querySelectorAll ? lineEl.querySelectorAll('.lyric-word, .lyric-word-backing') : [];
      for (let j = 0; j < words.length; j++) {
        const w = words[j];
        w.classList.remove('lyric-word-active', 'lyric-word-passed', 'lyric-word-completed');
        w.classList.add('lyric-word-upcoming');
        delete w._lastProgressValue;
        delete w._lastProgressPercent;
        w.style.removeProperty('--word-progress');
        w.style.removeProperty('--word-progress-percent');
        w.style.removeProperty('--word-fill-clip');
      }
    }
  }
  if (window._lastNearbyLines) {
    window._lastNearbyLines.forEach(el => { if (el) el.classList.remove('nearby-1'); });
    window._lastNearbyLines = null;
  }
}

let _lastCinematicToggleTime = 0;
function toggleCinematicView(forceState) {
  const now = Date.now();
  if (typeof forceState !== 'boolean') {
    if (now - _lastCinematicToggleTime < 250) {
      return;
    }
    _lastCinematicToggleTime = now;
  }

  if (settings.wallpaperMode) {
    if (typeof forceState === 'boolean') {
      return;
    }
    const nextStyle = (settings.wallpaperStyle === 'cinematic') ? 'style2' : 'cinematic';
    setWallpaperStyle(nextStyle);
    return;
  }

  const target = (typeof forceState === 'boolean') ? forceState : !isCinematicView;
  isCinematicView = target;
  if (target) {
    settings.cinematicMode = true;
  } else {
    settings.cinematicMode = false;
  }

  const appContainer = document.getElementById("app-container");
  const btnCinematic = document.getElementById("btn-cinematic-mode") || document.getElementById("btn-kinetic-mode");

  document.body.classList.toggle("cinematic-view-active", isCinematicView);
  if (appContainer) {
    appContainer.classList.toggle("cinematic-view-active", isCinematicView);
  }
  if (btnCinematic) {
    btnCinematic.classList.toggle("active", isCinematicView);
    btnCinematic.setAttribute("title", isCinematicView ? "Cinematic Lyrics Mode (Active - Click for Classic)" : "Classic Lyrics Mode (Click for Cinematic)");
  }

  // Never keep sync button visible in or transitioning from cinematic mode
  userScrolling = false;
  manualLyricScrollY = null;
  hideResyncButton();
  const oldResync = document.getElementById("btn-resync-lyrics");
  if (oldResync) oldResync.remove();
  const oldResume = document.getElementById("sync-resume-btn");
  if (oldResume && isCinematicView) {
    oldResume.style.display = "none";
    oldResume.style.opacity = "0";
    oldResume.style.pointerEvents = "none";
  }

  // Notify backend of cinematic mode state (window geometry stays stable at ideal 960x600 dimensions)
  if (window.electronAPI && typeof window.electronAPI.setCinematicMode === 'function') {
    window.electronAPI.setCinematicMode(isCinematicView).catch(() => {});
  }

  if (isCinematicView) {
    if (fluidMeshGradientInstance) {
      fluidMeshGradientInstance.stop();
    }
    // Purge classic line/word highlight state so it doesn't freeze in place while cinematic runs
    purgeClassicLyricHighlightState();
    if (!cinematicMainRendererInstance) {
      initCinematicMainStage();
    } else {
      const stage = document.getElementById("cinematic-main-stage");
      if (stage) {
        const rect = stage.getBoundingClientRect();
        const w = Math.max(300, Math.floor(rect.width || window.innerWidth || 960));
        const h = Math.max(200, Math.floor(rect.height || window.innerHeight || 600));
        cinematicMainRendererInstance.setDimensions(w, h);
      }
    }
    syncCinematicState();
    if (cinematicMainRendererInstance && isPlaying) {
      cinematicMainRendererInstance.play();
    }
  } else {
    if (cinematicMainRendererInstance) {
      cinematicMainRendererInstance.pause();
    }
    // Exiting cinematic mode: resume fluid mesh background if configured
    if (fluidMeshGradientInstance && shouldRunFluidMesh()) {
      fluidMeshGradientInstance.wake?.();
      if (isPlaying || !fluidMeshGradientInstance.isSettled?.()) {
        fluidMeshGradientInstance.start();
      }
      if (window.currentDynamicPalette) {
        fluidMeshGradientInstance.setPalette(window.currentDynamicPalette);
      }
    }

    // Exiting cinematic mode: restore classic lyrics focus and center active line
    userScrolling = false;
    manualLyricScrollY = null;
    hideResyncButton();

    // Thoroughly purge any stale active / nearby / word-progress state across all DOM and cached line elements
    purgeClassicLyricHighlightState();

    activeLineIndex = -1;

    requestAnimationFrame(() => {
      purgeClassicLyricHighlightState();
      measureLyricMetrics();
      if (lyrics && lyrics.length > 0) {
        const targetIndex = getCurrentActiveLyricIndex();
        if (targetIndex >= 0) {
          scrollLyrics(targetIndex);
          for (let p = 0; p < targetIndex; p++) {
            const pLine = cachedLineEls[p];
            if (pLine) {
              pLine.classList.remove('active', 'nearby-1');
              const pWords = pLine.querySelectorAll ? pLine.querySelectorAll('.lyric-word') : [];
              for (let pw = 0; pw < pWords.length; pw++) {
                pWords[pw].classList.remove('lyric-word-active', 'lyric-word-upcoming');
                pWords[pw].classList.add('lyric-word-completed', 'lyric-word-passed');
              }
            }
          }
        }
      }
    });
  }

  saveLocalSettings();
  updateModeButtonsState();
}

/**
 * Option A: Apple Music Studio Split-View Layout Toggle
 */
function supportsTallMotionArtwork(info = currentAnimatedArtInfo) {
  if (!info || info.type !== 'video' || !info.url) return false;
  const tallUrl = info.tallUrl || info.tall_url || '';
  const aspectRatio = String(info.aspectRatio || info.aspect_ratio || '').toLowerCase();
  const numericRatio = Number(aspectRatio);
  const ratioParts = aspectRatio.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
  const resolvedRatio = ratioParts ? Number(ratioParts[1]) / Number(ratioParts[2]) : numericRatio;
  const isPortrait = aspectRatio === 'tall' || aspectRatio === 'portrait' ||
    (Number.isFinite(resolvedRatio) && resolvedRatio > 0 && resolvedRatio < 0.95);
  return isPortrait || Boolean(tallUrl && tallUrl !== info.url);
}

function syncSplitTallArtworkAvailability() {
  const available = supportsTallMotionArtwork();
  const isSplit = document.body.classList.contains('layout-split');
  const enabled = available && isSplit && settings.splitTallArtwork !== false;
  document.body.classList.toggle('has-motion-tall-art', available);
  document.body.classList.toggle('split-tall-art', enabled);
  document.getElementById('app-container')?.classList.toggle('split-tall-art', enabled);
  const button = document.getElementById('btn-split-tall-art');
  if (button) {
    button.hidden = !available || !isSplit;
    button.classList.toggle('active', enabled);
    button.setAttribute('aria-pressed', String(enabled));
    button.title = enabled ? 'Use Square Artwork in Split View' : 'Use Tall Motion Artwork in Split View';
    button.setAttribute('aria-label', button.title);
  }
  return available;
}

let _lastStudioSplitToggleTime = 0;
function toggleStudioSplit(forceState) {
  const now = Date.now();
  if (typeof forceState !== 'boolean' && (now - _lastStudioSplitToggleTime) < 150) {
    return;
  }
  _lastStudioSplitToggleTime = now;
  const target = (typeof forceState === 'boolean') ? forceState : !document.body.classList.contains('layout-split');
  settings.layoutSplit = target;
  document.body.classList.toggle('layout-split', target);
  const appContainer = document.getElementById("app-container");
  if (appContainer) {
    appContainer.classList.toggle('layout-split', target);
  }
  syncSplitNoLyricsFocus();
  const btn = document.getElementById('btn-layout-split');
  if (btn) {
    btn.classList.toggle('active', target);
    btn.setAttribute('title', target ? 'Switch to Centered Layout (Ctrl+Alt+S)' : 'Switch to Split-View Layout (Ctrl+Alt+S)');
  }
  syncSplitTallArtworkAvailability();
  saveLocalSettings();
  const studioTallBgVideo = document.getElementById('studio-tall-bg-video');
  if (target && studioTallBgVideo) {
    studioTallBgVideo.pause();
    studioTallBgVideo.removeAttribute('src');
    studioTallBgVideo.style.display = 'none';
  }
  syncActiveAnimatedVideoState();
  if (typeof updateStudioSidebar === 'function') {
    updateStudioSidebar(currentPlayingTrackObj, currentStaticAlbumArtUrl);
  }
  invalidateLyricMetrics(true);
}
window.toggleStudioSplit = toggleStudioSplit;

function setSplitTallArtwork(enabled) {
  if (!supportsTallMotionArtwork()) return;
  settings.splitTallArtwork = Boolean(enabled);
  const studioArtVideo = document.getElementById('studio-art-video');
  if (studioArtVideo) {
    studioArtVideo._motionSquareFallbackTrack = null;
    studioArtVideo._motionRetryCount = 0;
  }
  syncSplitTallArtworkAvailability();
  saveLocalSettings();
  syncActiveAnimatedVideoState();
  if (typeof updateStudioSidebar === 'function') {
    updateStudioSidebar(currentPlayingTrackObj, currentStaticAlbumArtUrl);
  }
}

/**
 * Option A: Update Left Column Studio Sidebar
 */
function fitStudioTrackMetaLine() {
  const meta = document.querySelector('#studio-sidebar > .studio-track-meta');
  const sidebar = document.getElementById('studio-sidebar');
  if (!meta || !sidebar) return;

  const fitToSidebar = () => {
    // Expanded tall art in auto-hide has a fixed detail pill; transport hover/auto-hide must
    // not scale its title and artist with the artwork/sidebar transition.
    const isExpandedTallArt = document.body.classList.contains('layout-split') &&
      document.body.classList.contains('split-tall-art') &&
      (document.body.classList.contains('auto-hide-controls') ||
       document.body.classList.contains('auto-hide-collapsed') ||
       document.body.classList.contains('auto-hide-faded'));
    if (isExpandedTallArt) {
      meta.style.setProperty('--studio-track-meta-scale', '1');
      return;
    }

    meta.style.setProperty('--studio-track-meta-scale', '1');
    const availableWidth = Math.max(1, sidebar.clientWidth - 24);
    const contentWidth = meta.scrollWidth;
    const scale = contentWidth > availableWidth ? availableWidth / contentWidth : 1;
    meta.style.setProperty('--studio-track-meta-scale', String(scale));
  };

  if (!meta._studioMetaResizeObserver && typeof ResizeObserver !== 'undefined') {
    meta._studioMetaResizeObserver = new ResizeObserver(() => requestAnimationFrame(fitToSidebar));
    meta._studioMetaResizeObserver.observe(sidebar);
  }

  requestAnimationFrame(fitToSidebar);
}

function updateStudioSidebar(track, albumArtUrl) {
  try {
    if (isDynamicIslandMode || (typeof settings !== 'undefined' && (settings.wallpaperMode || settings.taskbarMode))) {
      return;
    }
    const titleEl = document.getElementById("studio-track-title");
    const artistEl = document.getElementById("studio-track-artist");
    const albumEl = document.getElementById("studio-track-album");
    const artImg = document.getElementById("studio-art-img");
    const artFallback = document.getElementById("studio-art-fallback");
    const badgesRow = document.getElementById("studio-badges-row") || document.querySelector(".studio-badges-row");
    const badgeProvider = document.getElementById("studio-badge-provider");
    const badgeQuality = document.getElementById("studio-badge-quality");
    const badgeText = document.getElementById("studio-badge-text");

    if (!track) {
      if (titleEl) titleEl.textContent = "Ready to Flow";
      if (artistEl) artistEl.textContent = "Waiting for music...";
      if (albumEl) albumEl.textContent = "";
      fitStudioTrackMetaLine();
      if (artImg) artImg.style.display = "none";
      if (artFallback) artFallback.style.display = "flex";
      if (badgesRow) {
        badgesRow.style.display = "none";
        badgesRow.classList.remove("has-badges");
      }
      if (badgeProvider) {
        badgeProvider.style.display = "none";
        badgeProvider.classList.remove("is-confirmed");
      }
      if (badgeQuality) {
        badgeQuality.style.display = "none";
        badgeQuality.classList.remove("is-confirmed");
      }
      const badgeLive = document.getElementById("studio-badge-live");
      if (badgeLive) {
        badgeLive.style.display = "none";
        badgeLive.classList.remove("is-confirmed");
      }
      const playerLiveVis = document.getElementById("player-live-visualizer");
      if (playerLiveVis) {
        playerLiveVis.style.display = "none";
      }
      return;
    }

    const trackName = track.name || "Ready to Flow";
    const artistText = Array.isArray(track.artists) ? track.artists.map(a => a.name).join(", ") : (track.artist || "LyricFlow Studio");
    const albumText = (track.album && track.album.name) ? track.album.name : (typeof track.album === 'string' ? track.album : "");

    if (titleEl) {
      titleEl.textContent = trackName;
      titleEl.title = trackName;
    }
    if (artistEl) {
      artistEl.textContent = artistText;
      artistEl.title = artistText;
    }
    fitStudioTrackMetaLine();
    if (albumEl) {
      albumEl.textContent = albumText;
      albumEl.title = albumText;
    }

    const effectiveArt = albumArtUrl || currentStaticAlbumArtUrl;
    if (effectiveArt) {
      if (artImg) {
        const expectedArt = new URL(String(effectiveArt), document.baseURI).href;
        artImg.onload = () => {
          if (artImg.src !== expectedArt) return;
          artImg.style.display = "block";
          artImg.style.opacity = "1";
          if (artFallback) artFallback.style.display = "none";
        };
        artImg.onerror = () => {
          if (artImg.src !== expectedArt) return;
          if (!document.body.classList.contains('has-animated-art-video')) {
            artImg.style.display = "none";
            if (artFallback) artFallback.style.display = "flex";
          }
        };
        const artAlreadyDecoded = artImg.complete && artImg.naturalWidth > 0 && artImg.src === expectedArt;
        if (!artAlreadyDecoded && artFallback && !document.body.classList.contains('has-animated-art-video')) {
          artFallback.style.display = "flex";
        }
        if (artImg.src !== expectedArt) {
          setArtWithSparkle(artImg, expectedArt);
        } else if (!artAlreadyDecoded) {
          // Retry a stale/broken source that may have been assigned before
          // WebView2 completed the previous track's image transition.
          artImg.src = expectedArt;
        }
        artImg.style.display = "block";
        artImg.style.opacity = "1";
      }
      if (artImg?.complete && artImg.naturalWidth > 0 && artFallback) artFallback.style.display = "none";
    } else {
      if (artImg) artImg.style.display = "none";
      if (artFallback) artFallback.style.display = "flex";
    }

    // Update Synced badge ONLY if state is confirmed (lyrics loaded and synced Level 2 or 3)
    const isConfirmedSynced = Boolean(lyrics && lyrics.length > 0 && currentSourceLevel >= 2);
    if (isConfirmedSynced && badgeProvider && badgeText) {
      const isWbw = currentSourceLevel === 3 || Boolean(lyrics[0].words && lyrics[0].words.length > 0);
      badgeText.textContent = isWbw ? "Word-Synced" : "Synced";
      badgeProvider.style.display = "inline-flex";
      badgeProvider.classList.add("is-confirmed");
    } else if (badgeProvider) {
      badgeProvider.style.display = "none";
      badgeProvider.classList.remove("is-confirmed");
    }

    // Check if quality badge is confirmed
    const isQualityVisible = Boolean(badgeQuality && badgeQuality.classList.contains("is-confirmed"));

    // Update live visualizers (Studio badge + Player bar)
    const isPlayingActive = Boolean(isPlaying || document.body.classList.contains("is-playing"));
    const badgeLive = document.getElementById("studio-badge-live");
    if (badgeLive) {
      if (isPlayingActive) {
        badgeLive.style.display = "inline-flex";
        badgeLive.classList.add("is-confirmed");
      } else {
        badgeLive.style.display = "none";
        badgeLive.classList.remove("is-confirmed");
      }
    }
    const isLiveVisible = Boolean(badgeLive && badgeLive.classList.contains("is-confirmed"));

    const playerLiveVis = document.getElementById("player-live-visualizer");
    if (playerLiveVis) {
      playerLiveVis.style.display = isPlayingActive ? "inline-flex" : "none";
    }

    // Show badges row only if at least one badge is confirmed and visible
    if (badgesRow) {
      const shouldShowRow = Boolean(isConfirmedSynced || isQualityVisible || isLiveVisible);
      badgesRow.style.display = shouldShowRow ? "flex" : "none";
      badgesRow.classList.toggle("has-badges", shouldShowRow);
    }
  } catch (err) {
    console.warn("[Studio] Error updating sidebar:", err);
  }
}
window.updateStudioSidebar = updateStudioSidebar;

function syncKineticState() {
  syncCinematicState();

  if (!kineticRendererInstance) return;

  const shapeSelect = document.getElementById("kinetic-shape-select");
  const colorSelect = document.getElementById("kinetic-color-select");

  const shapeVal = shapeSelect ? shapeSelect.value : 'auto';
  const colorVal = colorSelect ? colorSelect.value : 'album_art';

  let domRgb = null;
  if (window.currentDynamicDominantRgb) {
    domRgb = window.currentDynamicDominantRgb;
  } else if (typeof currentDynamicAccentColor === 'string' && window.KineticColorEngine) {
    domRgb = window.KineticColorEngine.hexToRgb(currentDynamicAccentColor);
  }

  const trackObj = (typeof currentPlayingTrackObj !== 'undefined' && currentPlayingTrackObj) ? currentPlayingTrackObj : null;
  const artistName = (trackObj && trackObj.artists && trackObj.artists[0]?.name)
    || (widgetArtistName && widgetArtistName.textContent ? widgetArtistName.textContent.trim() : '');
  const trackName = (trackObj && trackObj.name)
    || (widgetTrackName && widgetTrackName.textContent ? widgetTrackName.textContent.trim() : '');

  kineticRendererInstance.configure({
    shapeMode: (shapeVal === 'auto' || shapeVal === 'random') ? shapeVal : 'manual',
    shapeType: shapeVal,
    colorMode: colorVal === 'album_art' ? 'album_art' : 'preset',
    presetKey: colorVal,
    artist: artistName,
    title: trackName,
    creatorTag: artistName ? `@${artistName.replace(/\s+/g, '').toLowerCase()}` : '',
    artworkImage: (widgetAlbumArt && widgetAlbumArt.complete && widgetAlbumArt.naturalWidth) ? widgetAlbumArt : null,
    dominantRgb: domRgb,
    lyrics: lyrics || [],
    startTimeMs: 0,
    endTimeMs: trackDuration || null
  });

  kineticRendererInstance.seek(currentProgress);
}

function updateModeButtonsState() {
  const btnIsland = document.getElementById("btn-dynamic-island");
  const btnWallpaper = document.getElementById("btn-wallpaper-mode");
  const btnTaskbar = document.getElementById("btn-taskbar-mode");
  const btnKinetic = document.getElementById("btn-kinetic-mode");
  const btnCinematic = document.getElementById("btn-cinematic-mode");

  if (btnIsland) {
    btnIsland.classList.toggle("active", Boolean(isDynamicIslandMode));
  }
  if (btnWallpaper) {
    btnWallpaper.classList.toggle("active", Boolean(settings.wallpaperMode));
  }
  if (btnTaskbar) {
    btnTaskbar.classList.toggle("active", Boolean(settings.taskbarMode));
  }
  if (btnKinetic) {
    btnKinetic.classList.toggle("active", Boolean(isKineticMode));
  }
  if (btnCinematic) {
    btnCinematic.classList.toggle("active", Boolean(isCinematicView && !settings.wallpaperMode && !settings.taskbarMode && !isDynamicIslandMode));
  }
  const btnModeCinematic = document.getElementById("btn-mode-cinematic");
  const btnModeClassic = document.getElementById("btn-mode-classic");
  if (btnModeCinematic) btnModeCinematic.classList.toggle("active", Boolean(isCinematicView));
  if (btnModeClassic) btnModeClassic.classList.toggle("active", !isCinematicView);
}

let isMouseOverDynamicIsland = false;
let islandMouseLeaveTimer = null;

let initialIslandHoverExitHandler = null;

function clearInitialIslandHoverSuppression() {
  document.body?.classList.remove('island-hover-suppressed');
  if (!initialIslandHoverExitHandler) return;
  document.removeEventListener('pointermove', initialIslandHoverExitHandler, true);
  initialIslandHoverExitHandler = null;
}

function suppressInitialIslandHoverUntilPointerExits() {
  const island = document.getElementById('dynamic-island');
  if (!island || typeof island.matches !== 'function' || !island.matches(':hover')) return false;

  clearInitialIslandHoverSuppression();
  document.body.classList.add('island-hover-suppressed');
  initialIslandHoverExitHandler = (event) => {
    const rect = island.getBoundingClientRect();
    if (event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom) return;
    clearInitialIslandHoverSuppression();
  };
  document.addEventListener('pointermove', initialIslandHoverExitHandler, true);
  return true;
}

function handleIslandClusterEnter() {
  if (islandMouseLeaveTimer) {
    clearTimeout(islandMouseLeaveTimer);
    islandMouseLeaveTimer = null;
  }
  isMouseOverDynamicIsland = true;
  wakeDynamicIsland();
  pushDynamicIslandBounds(true);
  startDynamicIslandBoundsTracking(280);
}

function handleIslandClusterLeave() {
  if (isScrubbingIslandProgress) return;
  if (islandMouseLeaveTimer) {
    clearTimeout(islandMouseLeaveTimer);
    islandMouseLeaveTimer = null;
  }
  isMouseOverDynamicIsland = false;
  startDynamicIslandBoundsTracking(280);
}

let ghostModeAutoRestoreTimer = null;

function toggleIslandGhostMode(enable) {
  const isGhost = Boolean(enable) && isDynamicIslandMode;
  document.body.classList.toggle('island-ghost-mode', isGhost);

  if (ghostModeAutoRestoreTimer) {
    clearTimeout(ghostModeAutoRestoreTimer);
    ghostModeAutoRestoreTimer = null;
  }

  if (isGhost) {
    // Web/fallback safety timeout: auto-restore after 6s if not restored by native bridge
    ghostModeAutoRestoreTimer = setTimeout(() => {
      if (document.body.classList.contains('island-ghost-mode')) {
        toggleIslandGhostMode(false);
      }
    }, 6000);
  }
}

function toggleIslandGlassMode(enable) {
  settings.islandGlassMode = typeof enable === 'boolean' ? enable : !settings.islandGlassMode;
  document.body.classList.toggle('island-glass-mode', Boolean(settings.islandGlassMode));
  const checkIslandGlass = document.getElementById("check-island-glass-mode");
  if (checkIslandGlass) checkIslandGlass.checked = Boolean(settings.islandGlassMode);
  saveLocalSettings();
  if (isDynamicIslandMode) {
    showIslandHud(settings.islandGlassMode ? "Liquid Glass: ON" : "Liquid Glass: OFF");
  }
}

function initDOMElements() {
  initAboutModals();
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

  if (lyricsContainer && !lyricsContainer._delegatedEventsBound) {
    lyricsContainer._delegatedEventsBound = true;
    let clickTimer = null;

    // Delegated Feature 1: Lyrics Click-to-Seek
    lyricsContainer.addEventListener("click", (e) => {
      const lineEl = e.target.closest(".lyric-line");
      if (!lineEl || !lyricsContainer.contains(lineEl)) return;
      const index = parseInt(lineEl.dataset.index, 10);
      if (isNaN(index) || !lyrics || !lyrics[index]) return;
      const line = lyrics[index];
      if (!config) return;

      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        return;
      }

      clickTimer = setTimeout(() => {
        clickTimer = null;
        const timeMs = line.timeMs;
        seekPlayback(timeMs);
        userScrolling = false;
        manualLyricScrollY = null;
        if (userScrollTimeout) { clearTimeout(userScrollTimeout); userScrollTimeout = null; }
        hideResyncButton();
        activeLineIndex = -1;
        scrollLyrics(index);
        setTimeout(pollSpotifyPlayback, 300);
      }, 250);
    });

    // Delegated Feature: Customizable Double-Click Action
    lyricsContainer.addEventListener("dblclick", (e) => {
      const lineEl = e.target.closest(".lyric-line");
      if (!lineEl || !lyricsContainer.contains(lineEl)) return;
      const index = parseInt(lineEl.dataset.index, 10);
      if (isNaN(index) || !lyrics || !lyrics[index]) return;
      const line = lyrics[index];
      if (!config) return;
      const action = settings.dblclickAction || "rewind";

      if (action === "taskbar") {
        settings.taskbarMode = !settings.taskbarMode;
        if (checkTaskbarMode) checkTaskbarMode.checked = settings.taskbarMode;
        applyVisualSettings();
        saveLocalSettings();
      } else if (action === "rewind") {
        const timeMs = Math.max(0, line.timeMs - 10000);
        seekPlayback(timeMs);
        setTimeout(pollSpotifyPlayback, 300);
      }
    });

    // Right-click on lyric line is completely suppressed
    lyricsContainer.addEventListener("contextmenu", (e) => {
      const lineEl = e.target.closest(".lyric-line");
      if (lineEl && lyricsContainer.contains(lineEl)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });
  }

  // Manual scroll detection: when user scrolls with mousewheel or drags, pause auto-scroll within bounded range
  if (lyricsViewport) {
    lyricsViewport.addEventListener('wheel', (e) => {
      const isCinematicActive = settings.wallpaperMode ? (settings.wallpaperStyle === 'cinematic') : Boolean(isCinematicView);
      if (isCinematicActive || settings.taskbarMode || settings.compactMode) return;
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
      const lastLineStopY = Math.max(lastLineCenterY, (viewportHeight - 140) - lastMetric.top - lastMetric.height);
      const maxY = Math.max(firstLineCenterY, lastLineStopY) + 40;
      const minY = Math.min(firstLineCenterY, lastLineStopY);

      // Extract current translation (supports both translate3d and translateY, with 0 or 0px)
      let currentY;
      if (manualLyricScrollY !== null) {
        currentY = manualLyricScrollY;
      } else {
        const currentTransform = lyricsContainer.style.transform;
        const match = currentTransform ? currentTransform.match(/translate(?:3d\(0(?:px)?,\s*|Y\()(-?[\d.]+)px/) : null;
        if (match) {
          currentY = parseFloat(match[1]);
        } else if (activeLineIndex >= 0 && cachedLineMetrics && cachedLineMetrics[activeLineIndex]) {
          const m = cachedLineMetrics[activeLineIndex];
          currentY = Math.round((viewportHeight / 2) - m.top - (m.height / 2));
        } else {
          currentY = firstLineCenterY;
        }
      }
      const delta = -e.deltaY;

      manualLyricScrollY = Math.max(minY, Math.min(maxY, currentY + delta));
      lyricsContainer.style.transform = `translate3d(0, ${manualLyricScrollY}px, 0)`;

      // Clear any previous auto-resync timeout and reset for 7 seconds
      if (userScrollTimeout) clearTimeout(userScrollTimeout);
      userScrollTimeout = setTimeout(() => {
        userScrolling = false;
        manualLyricScrollY = null;
        hideResyncButton();
        const idx = activeLineIndex;
        activeLineIndex = -1;
        scrollLyrics(idx);
      }, 7000);
    }, { passive: true });

    // Pointer Drag-to-Scroll support on lyrics viewport
    let isPointerDraggingLyrics = false;
    let pointerDragStartY = 0;
    let pointerDragStartScrollY = 0;

    lyricsViewport.addEventListener('pointerdown', (e) => {
      const isCinematicActive = settings.wallpaperMode ? (settings.wallpaperStyle === 'cinematic') : Boolean(isCinematicView);
      if (isCinematicActive) return;
      if (e.button !== 0) return;
      if (e.target.closest('button, input, select, a, .share-line-chip, #btn-resync-lyrics')) return;
      if (settings.taskbarMode || settings.compactMode || lyrics.length === 0) return;

      isPointerDraggingLyrics = true;
      pointerDragStartY = e.clientY;

      if (manualLyricScrollY !== null) {
        pointerDragStartScrollY = manualLyricScrollY;
      } else {
        const viewportHeight = cachedViewportHeight || (lyricsViewport ? lyricsViewport.clientHeight : 300);
        if (activeLineIndex >= 0 && cachedLineMetrics && cachedLineMetrics[activeLineIndex]) {
          const m = cachedLineMetrics[activeLineIndex];
          pointerDragStartScrollY = Math.round((viewportHeight / 2) - m.top - (m.height / 2));
        } else {
          const currentTransform = lyricsContainer.style.transform;
          const match = currentTransform ? currentTransform.match(/translate(?:3d\(0(?:px)?,\s*|Y\()(-?[\d.]+)px/) : null;
          pointerDragStartScrollY = match ? parseFloat(match[1]) : 0;
        }
      }

      try { lyricsViewport.setPointerCapture(e.pointerId); } catch (_) {}
    });

    lyricsViewport.addEventListener('pointermove', (e) => {
      const isCinematicActive = settings.wallpaperMode ? (settings.wallpaperStyle === 'cinematic') : Boolean(isCinematicView);
      if (isCinematicActive || !isPointerDraggingLyrics) return;
      const delta = e.clientY - pointerDragStartY;
      if (Math.abs(delta) > 3) {
        userScrolling = true;
        showResyncButton();

        if (!cachedLineMetrics || cachedLineMetrics.length === 0) {
          measureLyricMetrics();
        }
        const count = cachedLineMetrics ? cachedLineMetrics.length : 0;
        if (count === 0) return;

        const viewportHeight = cachedViewportHeight || (lyricsViewport ? lyricsViewport.clientHeight : 300);
        const firstMetric = cachedLineMetrics[0];
        const lastMetric = cachedLineMetrics[count - 1];
        const firstLineCenterY = (viewportHeight / 2) - firstMetric.top - (firstMetric.height / 2);
        const lastLineCenterY = (viewportHeight / 2) - lastMetric.top - (lastMetric.height / 2);
        const lastLineStopY = Math.max(lastLineCenterY, (viewportHeight - 140) - lastMetric.top - lastMetric.height);
        const maxY = Math.max(firstLineCenterY, lastLineStopY) + 40;
        const minY = Math.min(firstLineCenterY, lastLineStopY);

        const targetY = pointerDragStartScrollY + delta;
        manualLyricScrollY = Math.max(minY, Math.min(maxY, targetY));
        lyricsContainer.style.transform = `translate3d(0, ${manualLyricScrollY}px, 0)`;

        if (userScrollTimeout) clearTimeout(userScrollTimeout);
        userScrollTimeout = setTimeout(() => {
          userScrolling = false;
          manualLyricScrollY = null;
          hideResyncButton();
          const idx = activeLineIndex;
          activeLineIndex = -1;
          scrollLyrics(idx);
        }, 7000);
      }
    });

    const stopPointerDrag = (e) => {
      if (isPointerDraggingLyrics) {
        isPointerDraggingLyrics = false;
        try { lyricsViewport.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };
    lyricsViewport.addEventListener('pointerup', stopPointerDrag);
    lyricsViewport.addEventListener('pointercancel', stopPointerDrag);
  }

  widgetAlbumArt = document.getElementById("widget-album-art");
  widgetArtFallback = document.getElementById("widget-art-fallback");
  widgetTrackName = document.getElementById("widget-track-name");
  widgetArtistName = document.getElementById("widget-artist-name");
  widgetPlaycount = document.getElementById("widget-playcount");
  widgetProgressFill = document.getElementById("widget-progress-fill");
  widgetTimeCurrent = document.getElementById("widget-time-current");
  widgetTimeDuration = document.getElementById("widget-time-duration");

  const widgetTrackWrap = document.getElementById("widget-track-name-wrapper");
  if (widgetTrackWrap && window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      if (typeof widgetTrackName !== 'undefined' && widgetTrackName) {
        updateMarqueeOverflow(widgetTrackWrap, widgetTrackName);
      }
    });
    ro.observe(widgetTrackWrap);
  }

  playbackWidget = document.getElementById("playback-widget");
  if (playbackWidget) {
    playbackWidget.addEventListener("wheel", (e) => {
      // Allow progress scrubber track to handle its own wheel seeking
      if (e.target.closest("#main-progress-track") || e.target.closest(".progress-bar-bg")) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 5 : -5;
      adjustIslandVolume(delta, true);
    }, { passive: false });

    playbackWidget.addEventListener("auxclick", (e) => {
      if (e.button !== 1) return;
      if (e.target.closest("#main-progress-track") || e.target.closest(".progress-bar-bg")) return;
      e.preventDefault();
      toggleAppMute();
    });
  }

  const progressTimeEl = document.querySelector(".progress-time");
  if (progressTimeEl) {
    progressTimeEl.addEventListener("click", () => {
      window._showRemainingTime = !window._showRemainingTime;
      if (trackDuration > 0 && widgetTimeDuration) {
        widgetTimeDuration.textContent = window._showRemainingTime
          ? `-${formatTime(Math.max(0, trackDuration - (currentProgress || 0)))}`
          : formatTime(trackDuration);
      }
    });
  }

  // Click on Album Art to Enlarge Lightbox Modal (Studio sidebar & Widget)
  const studioArtContainer = document.querySelector(".studio-art-container");
  const studioArtWrapper = document.getElementById("studio-art-wrapper");
  const studioTarget = studioArtWrapper || studioArtContainer;
  if (studioTarget) {
    studioTarget.title = "Click to enlarge";
    studioTarget.addEventListener("click", (e) => {
      e.stopPropagation();
      showAlbumArtModal();
    });
    studioTarget.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const trackObj = currentPlayingTrackObj || currentTrack;
      if (!trackObj || !trackObj.name) return;
      const artist = trackObj.artists?.[0]?.name || trackObj.artist || '';
      if (currentTrackId) delete localArtCache[currentTrackId];
      const dualKey = `${artist}:::${trackObj.name}`.toLowerCase().trim();
      delete localArtCache[dualKey];
      try {
        const artUrl = await fetchFallbackAlbumArt(trackObj.name, artist, trackObj.album?.name || '');
        if (artUrl) {
          saveArtToCache(currentTrackId, artUrl, trackObj.name, artist);
          if (widgetAlbumArt) {
            setArtWithSparkle(widgetAlbumArt, artUrl);
            widgetAlbumArt.style.display = 'block';
          }
          if (typeof updateStudioSidebar === 'function') {
            updateStudioSidebar(trackObj, artUrl);
          }
          setWallpaperAlbumArt(artUrl);
          updateDynamicArtColor(artUrl);
          currentStaticAlbumArtUrl = artUrl;
        }
      } catch (err) {}
    });
  }

  const artContainer = document.querySelector(".widget-art-container");
  if (artContainer) {
    artContainer.title = "Click to enlarge";
    artContainer.addEventListener("click", (e) => {
      e.stopPropagation();
      showAlbumArtModal();
    });
    artContainer.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const trackObj = currentPlayingTrackObj || currentTrack;
      if (!trackObj || !trackObj.name) return;
      console.log("[Artwork] Manual refetch triggered for", trackObj.name);

      if (currentTrackId) delete localArtCache[currentTrackId];
      const artist = trackObj.artists?.[0]?.name || trackObj.artist || '';
      const dualKey = `${artist}:::${trackObj.name}`.toLowerCase().trim();
      delete localArtCache[dualKey];

      if (widgetAlbumArt) widgetAlbumArt.style.opacity = '0.5';

      try {
        const artUrl = await fetchFallbackAlbumArt(trackObj.name, artist, trackObj.album?.name || '');
        if (artUrl) {
          saveArtToCache(currentTrackId, artUrl, trackObj.name, artist);
          if (widgetAlbumArt) {
            setArtWithSparkle(widgetAlbumArt, artUrl);
            widgetAlbumArt.style.display = 'block';
            widgetAlbumArt.style.opacity = '1';
          }
          if (widgetArtFallback) widgetArtFallback.style.display = 'none';
          setWallpaperAlbumArt(artUrl);
          updateDynamicArtColor(artUrl);
          currentStaticAlbumArtUrl = artUrl;
        } else {
          if (widgetAlbumArt) widgetAlbumArt.style.opacity = '1';
        }
      } catch (err) {
        if (widgetAlbumArt) widgetAlbumArt.style.opacity = '1';
      }
    });
  }

  const wallpaperArtShell = document.querySelector(".wallpaper-art-shell");
  if (wallpaperArtShell) {
    wallpaperArtShell.title = "Click to enlarge";
    wallpaperArtShell.addEventListener("click", (e) => {
      e.stopPropagation();
      showAlbumArtModal();
    });
  }

  const artModalClose = document.getElementById("album-art-modal-close");
  const artModalBackdrop = document.getElementById("album-art-modal-backdrop");
  const artModalDialog = document.querySelector(".album-art-modal-dialog");

  if (artModalClose) artModalClose.addEventListener("click", hideAlbumArtModal);
  if (artModalBackdrop) artModalBackdrop.addEventListener("click", hideAlbumArtModal);
  if (artModalDialog) {
    artModalDialog.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }



  // Controls & Taskbar DOM Elements
  checkTaskbarMode = document.getElementById("check-taskbar-mode");
  selectTaskbarStyle = document.getElementById("select-taskbar-style");
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
  checkWordByWord = document.getElementById("check-word-by-word");
  checkNeteaseWordByWord = document.getElementById("check-netease-word-by-word");
  checkFilterCredits = document.getElementById("check-filter-credits");
  selectPreferredProvider = document.getElementById("select-preferred-provider");
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
  studioArtVideo = document.getElementById("studio-art-video");
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
  btnRestoreLyrics = document.getElementById("btn-restore-lyrics");
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

  fluidMeshCanvas = document.getElementById("fluid-mesh-canvas");
  selectBgStyle = document.getElementById("select-bg-style");
  sliderFluidSpeed = document.getElementById("slider-fluid-speed");
  valFluidSpeed = document.getElementById("val-fluid-speed");
  settingFluidSpeedRow = document.getElementById("setting-fluid-speed-row");

  if (fluidMeshCanvas && window.FluidMeshGradient && !fluidMeshGradientInstance) {
    try {
      fluidMeshGradientInstance = new window.FluidMeshGradient(fluidMeshCanvas);
      window.fluidMesh = fluidMeshGradientInstance;
      window.fluidMeshGradientInstance = fluidMeshGradientInstance;
      if (shouldRunFluidMesh()) {
        fluidMeshGradientInstance.start();
      }
    } catch (e) {
      console.warn("[Renderer] Failed to initialize FluidMeshGradient:", e);
    }
  }

  // Restore cached palette on startup immediately so fluid mesh and UI reflect authentic album colors
  restoreStartupPalette();
}

function restoreStartupPalette() {
  try {
    const cachedPaletteRaw = localStorage.getItem('lyricflow_last_palette');
    const cachedDominantRaw = localStorage.getItem('lyricflow_last_dominant');
    let cachedPalette = null;
    let cachedDominant = null;
    if (cachedPaletteRaw) {
      cachedPalette = JSON.parse(cachedPaletteRaw);
    }
    if (cachedDominantRaw) {
      cachedDominant = JSON.parse(cachedDominantRaw);
    }

    if (cachedPalette && Array.isArray(cachedPalette) && cachedPalette.length >= 5) {
      window.currentDynamicPalette = cachedPalette;
      if (cachedDominant) {
        window.currentDynamicDominantRgb = cachedDominant;
      }
      if (fluidMeshGradientInstance) {
        fluidMeshGradientInstance.setPalette(cachedPalette, true /* immediate snap on startup */);
      }
      if (typeof applyPaletteCSS === 'function') {
        applyPaletteCSS(cachedPalette[0], cachedPalette[1], cachedPalette[2], cachedPalette[3], cachedPalette[4], cachedDominant || cachedPalette[1]);
      }
      return true;
    } else {
      // If no stored palette, check listening history for last known artwork URL and pre-extract
      const historyRaw = localStorage.getItem('listening_history');
      if (historyRaw) {
        const hist = JSON.parse(historyRaw);
        if (Array.isArray(hist) && hist.length > 0 && hist[0]?.albumArtUrl) {
          setTimeout(() => {
            if (!currentExtractedArtUrl && typeof updateDynamicArtColor === 'function') {
              updateDynamicArtColor(hist[0].albumArtUrl);
            }
          }, 0);
        }
      }
      return false;
    }
  } catch (e) {
    console.warn("[Startup] Failed restoring cached palette:", e);
    return false;
  }
}
window.restoreStartupPalette = restoreStartupPalette;

function updateSoloistStatusUI(isConnected, isAuthenticated, isActive) {
  const pill = document.getElementById("soloist-status-pill");
  if (!pill) return;
  if (isConnected) {
    if (isActive) {
      pill.textContent = "● HiFi Lossless (Active)";
      pill.style.background = "rgba(29, 185, 84, 0.25)";
      pill.style.color = "#1db954";
      pill.style.border = "1px solid rgba(29, 185, 84, 0.5)";
    } else if (isAuthenticated) {
      pill.textContent = "● Connected (Awaiting Stream)";
      pill.style.background = "rgba(255, 193, 7, 0.2)";
      pill.style.color = "#ffc107";
      pill.style.border = "1px solid rgba(255, 193, 7, 0.35)";
    } else {
      pill.textContent = "● Connected (Local API)";
      pill.style.background = "rgba(29, 185, 84, 0.2)";
      pill.style.color = "#1db954";
      pill.style.border = "1px solid rgba(29, 185, 84, 0.35)";
    }
  } else {
    pill.textContent = "○ Disconnected";
    pill.style.background = "rgba(255, 255, 255, 0.08)";
    pill.style.color = "rgba(255, 255, 255, 0.6)";
    pill.style.border = "none";
  }
}

function handleSoloistPlaybackUpdate(data) {
  if (!data || !data.track || !settings.soloistEnabled) return;
  const { track, playback } = data;

  const wasPlaying = isPlaying;
  const now = getHighResTime();
  const isRecentSeek = (Date.now() - lastUserSeekTimestamp) < 2500;
  if (isRecentSeek && typeof playback.positionMs === 'number' && Math.abs(playback.positionMs - lastUserSeekTargetMs) > 800) {
    playback.positionMs = lastUserSeekTargetMs;
  }
  lastPollTimestamp = now;
  lastPollProgress = playback.positionMs;
  currentProgress = playback.positionMs;
  trackDuration = track.durationMs;
  isPlaying = playback.isPlaying;

  const trackRawId = String(track.id || track.uri || '');
  const trackNormalizedId = trackRawId.replace(/^spotify:track:/, '');

  if (track.title && (track.title !== currentTitle || (trackNormalizedId && trackNormalizedId !== String(currentTrackId || '').replace(/^spotify:track:/, '')))) {
    const syntheticTrack = {
      id: trackNormalizedId || trackRawId,
      uri: track.uri || (trackNormalizedId ? `spotify:track:${trackNormalizedId}` : ''),
      name: track.title,
      title: track.title,
      artists: Array.isArray(track.artists) ? track.artists : [{ name: track.artist || 'Unknown Artist' }],
      artist: track.artist || (Array.isArray(track.artists) ? track.artists.map(a => a.name || a).join(', ') : 'Unknown Artist'),
      duration_ms: track.durationMs,
      external_ids: {
        isrc: track.isrc || track.external_ids?.isrc || null
      },
      album: {
        name: track.album?.name || (typeof track.album === 'string' ? track.album : ''),
        images: track.albumArt ? [{ url: track.albumArt }] : []
      }
    };
    handlePlaybackData({
      item: syntheticTrack,
      is_playing: playback.isPlaying,
      progress_ms: playback.positionMs
    });
  }

  // Position-sync messages update the interpolation anchor above. Do not run
  // the full DOM/playback reconciliation once per socket message; the normal
  // playhead loop and its local interpolation already render the latest time.
  if (isPlaying && !isPlayheadLoopActive) {
    ensurePlayheadLoop();
  } else if (!isPlaying && wasPlaying) {
    updatePlayhead();
  }
}

function handleSoloistQueueUpdate(data) {
  if (!data || !Array.isArray(data.queue) || data.queue.length === 0 || !settings.soloistEnabled) return;
  const nextTrack = data.queue[0];
  if (nextTrack && nextTrack.title) {
    upcomingTrackObj = {
      name: nextTrack.title,
      title: nextTrack.title,
      artist: nextTrack.artist,
      artists: [{ name: nextTrack.artist }],
      duration_ms: nextTrack.durationMs
    };
  }
}

async function bootstrapApp() {
  console.log('[LF-STARTUP] Bootstrap starting, readyState=' + document.readyState);

  // Storage Purge: purge legacy proxy lyrics in favor of qApple word-by-word
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('lyrics_cache_') || k.startsWith('lyrics_plus_track_'))) {
          const item = localStorage.getItem(k);
          if (item && /"source"\s*:\s*"[^"]*proxy/i.test(item)) {
            localStorage.removeItem(k);
          }
        }
      }
    }
  } catch (_) {}

  const progressBar = document.getElementById("loading-progress-bar");
  const statusText = document.getElementById("loading-status-text");
  let configLoadTimedOut = false;

  const setLoadingProgress = (pct, text) => {
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (statusText && text && statusText.textContent !== text) {
      statusText.classList.add("updating");
      setTimeout(() => {
        statusText.textContent = text;
        statusText.classList.remove("updating");
      }, 120);
    }
  };

  let safetyTimeout = null;
  const dismissLoadingScreen = (immediate = false) => {
    if (safetyTimeout) {
      clearTimeout(safetyTimeout);
      safetyTimeout = null;
    }
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

  // Fail-safe timeout: never let loading screen hang for more than 3.5 seconds
  safetyTimeout = setTimeout(() => {
    console.warn("Safety timeout triggered: dismissing loading screen");
    if (!config) config = { localMode: true };
    showLyricsScreen();
    if (typeof renderLyrics === 'function') renderLyrics();
    dismissLoadingScreen(true);
  }, 3500);

  try {
    // Check if launched silently via Windows startup (--startup) or with taskbar mode active
    isStartupMode = false;
    isTaskbarActiveInHost = false;
    try {
      if (window.electronAPI) {
        if (typeof window.electronAPI.getIsStartup === 'function') {
          isStartupMode = await Promise.race([
            window.electronAPI.getIsStartup(),
            new Promise(r => setTimeout(() => r(false), 2500))
          ]);
        } else if (typeof window.electronAPI.invoke === 'function') {
          isStartupMode = await Promise.race([
            window.electronAPI.invoke('get_is_startup'),
            new Promise(r => setTimeout(() => r(false), 2500))
          ]);
        }
        if (typeof window.electronAPI.isTaskbarModeActive === 'function') {
          isTaskbarActiveInHost = await Promise.race([
            window.electronAPI.isTaskbarModeActive(),
            new Promise(r => setTimeout(() => r(false), 2500))
          ]);
        }
      }
    } catch (e) {}

    // Stage 1: Config & Auth Verification (Async from Rust)
    setLoadingProgress(20, "Starting LyricFlow...");
    try {
      if (window.electronAPI && typeof window.electronAPI.loadConfig === 'function') {
        let configLoadTimeoutId = null;
        config = await Promise.race([
          window.electronAPI.loadConfig(),
          new Promise(r => {
            configLoadTimeoutId = setTimeout(() => {
              configLoadTimedOut = true;
              r(null);
            }, 2500);
          })
        ]);
        if (configLoadTimeoutId) clearTimeout(configLoadTimeoutId);
      } else {
        config = null;
      }
    } catch (err) {
      console.error("Failed to load config:", err);
      config = null;
    }

    // If silent startup or taskbar mode, immediately bypass loading visuals
    if (isStartupMode || isTaskbarActiveInHost || (config && (config.taskbar_mode || config.taskbarMode))) {
      dismissLoadingScreen(true);
      settings.taskbarMode = true;
      lastSentTaskbarMode = true;
    }

    // Stage 2: DOM Elements Binding & Visual Preferences (Immediate, synchronous)
    initDOMElements();
    const hadPersistedInstallState = Boolean(
      localStorage.getItem("lyrics_overlay_settings") ||
      (config && (
        (config.settings && Object.keys(config.settings).length > 0) ||
        config.sp_dc || config.access_token || config.localMode || config.window || config.window_bounds
      ))
    );
    loadLocalSettings(true); // skipIPC = true prevents duplicate IPC calls during boot

    // Existing installations predate the setup completion marker. Their saved
    // settings/config mean they have already been through the app; don't mistake
    // a missing marker for a first launch after an update.
    const onboardingWasStarted = localStorage.getItem("lyricflow_onboarding_started") === "true";
    if (hadPersistedInstallState && !onboardingWasStarted &&
        localStorage.getItem("lyricflow_setup_done") !== "true" && settings.hasCompletedSetup !== true) {
      settings.hasCompletedSetup = true;
      localStorage.setItem("lyricflow_setup_done", "true");
      saveLocalSettings();
    }

    // Stage 3: UI Handlers & History Render
    try {
      setupUIHandlers();
    } catch (err) {
      console.error("Error initializing UI handlers:", err);
    }
    try { renderHistory(); } catch (e) { console.warn("History render warning:", e); }

    // Stage 4: Launch Transition
    setLoadingProgress(45, "Connecting media services...");
    cancelAutoHide(); // Guarantee overlay is uncollapsed and visible on initial launch
    const isFirstTime = !isStartupMode &&
      !configLoadTimedOut &&
      localStorage.getItem("lyricflow_setup_done") !== "true" &&
      settings.hasCompletedSetup === false;
    if (isFirstTime) {
      localStorage.setItem("lyricflow_onboarding_started", "true");
      showOnboardingWizard();
      dismissLoadingScreen(false);
    } else {
      if (!config) {
        config = { localMode: true };
      }
      showLyricsScreen();
      updateSpotifyUI();

      if (!isStartupMode && !settings.taskbarMode) {
        setLoadingProgress(50, "Detecting music playback...");
        try {
          // Fast-Path: Instantly inspect local SMTC (Windows Media Controls, <20ms)
          // Eliminates cloud latency and prevents Spotify 429 stalls from blocking startup!
          if (window.electronAPI && typeof window.electronAPI.getLocalPlayback === 'function') {
            try {
              const localFast = await Promise.race([
                window.electronAPI.getLocalPlayback(),
                new Promise(r => setTimeout(() => r(null), 350))
              ]);
              if (localFast && localFast.item) {
                handlePlaybackData(localFast);
              }
            } catch (_) {}
          }

          // If local SMTC didn't resolve a track, query Spotify Web API
          if (!currentTrackId) {
            await Promise.race([
              pollSpotifyPlayback(),
              new Promise((r) => setTimeout(r, 2000))
            ]);
          } else {
            // Background-poll Spotify so it verifies tokens without blocking startup
            pollSpotifyPlayback().catch(() => {});
          }

          // Flush any pending track switch debounce timer immediately during startup
          if (trackSwitchDebounceTimer) {
            clearTimeout(trackSwitchDebounceTimer);
            trackSwitchDebounceTimer = null;
            if (currentPlayingTrackObj) {
              const t = currentPlayingTrackObj;
              const allArtists = (t.artists && Array.isArray(t.artists) && t.artists.length > 0)
                ? t.artists.map(a => a.name).filter(Boolean).join(", ")
                : (t.artist || '');
              const primaryArtist = (t.artists && t.artists[0] && t.artists[0].name)
                ? t.artists[0].name
                : (allArtists.split(/,| feat\.| ft\./i)[0].trim() || 'Unknown');
              fetchLyrics(t.id, t.name, allArtists || primaryArtist, trackDuration, t.external_ids?.isrc || null, {
                allArtists,
                primaryArtist,
                album: t.album?.name || ''
              });
            }
          }

          if (currentTrackId && currentPlayingTrackObj) {
            const trackName = currentPlayingTrackObj.name || widgetTrackName.textContent || "track";
            const artistName = (currentPlayingTrackObj.artists && currentPlayingTrackObj.artists[0]?.name) || widgetArtistName.textContent || "";
            setLoadingProgress(75, `Syncing lyrics: ${trackName}${artistName ? ' • ' + artistName : ''}...`);

            // Await until lyrics have parsed and rendered into DOM, or fetch completes, or max 2500ms
            const waitStart = Date.now();
            while (Date.now() - waitStart < 2500) {
              if (lyrics && lyrics.length > 0) {
                break; // Lyrics loaded and rendered into DOM!
              }
              if (!isFetchingLyrics && inFlightLyricsRequests.size === 0) {
                break; // Fetch completed
              }
              await new Promise(r => setTimeout(r, 50));
            }

            setLoadingProgress(95, "Composing stage...");
            await new Promise(r => setTimeout(r, 80));
          } else if (!isFetchingLyrics && inFlightLyricsRequests.size === 0) {
            handleEmptyPlayback();
          }
        } catch (e) {
          console.warn("[Startup] Playback pre-population notice:", e);
          if (!isFetchingLyrics && inFlightLyricsRequests.size === 0) {
            handleEmptyPlayback();
          }
        }
      }
      dismissLoadingScreen(false);
    }

    if (isSpotifyConnected()) {
      checkAndVerifySpotifyConnection().then(() => updateSpotifyUI());
    }
  } catch (globalErr) {
    console.error("Critical bootstrap error:", globalErr);
    try {
      showLyricsScreen();
    } catch (e) {
      console.error("Error showing lyrics screen in bootstrap fallback:", e);
    }
    dismissLoadingScreen(false);
  } finally {
    clearTimeout(safetyTimeout);
  }

  // Start the frame-perfect loop after startup is complete
  try {
    ensurePlayheadLoop();
  } catch (err) {
    console.error("Error starting playhead loop:", err);
  }
  syncAudioVisualizerState();

  // Initialize Spotify Soloist Local WebSocket API provider if enabled or configured
  try {
    if (window.SoloistProvider) {
      if (!window.soloistProvider) {
        window.soloistProvider = new window.SoloistProvider({
          host: settings.soloistHost || '127.0.0.1',
          port: settings.soloistPort || 4488,
          autoConnect: Boolean(settings.soloistEnabled)
        });
      }
      window.soloistProvider.on('onPlaybackState', (data) => {
        updateSoloistStatusUI(window.soloistProvider.isConnected, window.soloistProvider.isAuthenticated, true);
        handleSoloistPlaybackUpdate(data);
      });
      window.soloistProvider.on('onQueueUpdate', handleSoloistQueueUpdate);
      window.soloistProvider.on('onConnectionChange', (data) => {
        updateSoloistStatusUI(data.isConnected, window.soloistProvider.isAuthenticated, window.soloistProvider.isSessionActive);
      });
      window.soloistProvider.on('onAuthChange', (data) => {
        updateSoloistStatusUI(window.soloistProvider.isConnected, data.isAuthenticated, data.isActive);
      });
      if (settings.soloistEnabled) {
        if (settings.soloistApiKey && typeof startSoloistDaemon === 'function') {
          startSoloistDaemon(true).catch(() => {});
        } else {
          window.soloistProvider.connect(settings.soloistHost || '127.0.0.1', settings.soloistPort || 4488);
        }
      }
    }
  } catch (err) {
    console.warn("[Soloist] Startup initialization error:", err);
  }

  setTimeout(() => showWhatsNewForInstalledVersion(), 900);
  console.log('[LF-STARTUP] Bootstrap completed.');
}

async function showWhatsNewForInstalledVersion() {
  const modal = document.getElementById('whats-new-modal');
  const versionLabel = document.getElementById('whats-new-version');
  if (!modal || !window.electronAPI?.getAppVersion) return;
  try {
    const version = await window.electronAPI.getAppVersion();
    if (!version) return;
    const seenVersion = localStorage.getItem('lyricflow_whats_new_seen_version');
    if (seenVersion === version) return;
    if (versionLabel) versionLabel.textContent = `v${version}`;
    modal.hidden = false;
    const dismiss = () => {
      modal.hidden = true;
      localStorage.setItem('lyricflow_whats_new_seen_version', version);
      document.removeEventListener('keydown', onKeyDown);
      document.getElementById('btn-whats-new-done')?.removeEventListener('click', dismiss);
    };
    const onKeyDown = event => { if (event.key === 'Escape') dismiss(); };
    document.getElementById('btn-whats-new-done')?.addEventListener('click', dismiss);
    document.addEventListener('keydown', onKeyDown);
  } catch (error) {
    console.warn('[What’s New] Could not check installed version:', error);
  }
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

  // Prefer whichever settings snapshot was saved most recently. This recovers
  // changes made just before an OTA installer closes the app, even if its
  // debounced config.json write had not completed yet.
  if (config && config.settings) {
    const localSavedAt = Number(localStorage.getItem('lyricflow_settings_saved_at')) || 0;
    const configSavedAt = Number(config.settingsUpdatedAt) || 0;
    if (localSavedAt > configSavedAt) {
      parsed = { ...config.settings, ...(parsed || {}) };
    } else {
      parsed = { ...(parsed || {}), ...config.settings };
    }
  }

  if (parsed) {
    settings = { ...settings, ...parsed };
    if (isStartupMode || isTaskbarActiveInHost) {
      settings.taskbarMode = true;
      lastSentTaskbarMode = true;
    }
    
    // Ensure alias consistency between canonical and legacy names
    if (parsed.taskbarStyle) settings.tbStyle = parsed.taskbarStyle;
    else if (parsed.tbStyle) settings.taskbarStyle = parsed.tbStyle;
    if (!settings.taskbarStyle) settings.taskbarStyle = 'minimal';

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

    // Migrate translation defaults
    if (!settings.translateLang) {
      settings.translateLang = 'en';
    }
    if (settings.skipLang === undefined || settings.skipLang === 'en') {
      settings.skipLang = 'none';
    }
    if (settings.islandInactivityTimeout === undefined) {
      settings.islandInactivityTimeout = 30000;
    }

    if (settings.preferredLyricProvider && (!settings.preferredLyricProviders || settings.preferredLyricProviders.length === 0)) {
      if (settings.preferredLyricProvider === 'musixmatch') {
        settings.preferredLyricProviders = ['musixmatch', 'lrclib', 'netease'];
      } else if (settings.preferredLyricProvider === 'lrclib') {
        settings.preferredLyricProviders = ['lrclib', 'musixmatch', 'netease'];
      } else if (settings.preferredLyricProvider === 'lyricsplus' || settings.preferredLyricProvider === 'netease') {
        settings.preferredLyricProviders = ['netease', 'lrclib', 'musixmatch'];
      } else {
        settings.preferredLyricProviders = [];
      }
    } else if (settings.preferredLyricProvider === 'netease' && Array.isArray(settings.preferredLyricProviders) &&
               settings.preferredLyricProviders.length === 3 &&
               settings.preferredLyricProviders[0] === 'netease' &&
               settings.preferredLyricProviders[1] === 'musixmatch' &&
               settings.preferredLyricProviders[2] === 'lrclib') {
      settings.preferredLyricProviders = ['netease', 'lrclib', 'musixmatch'];
    }
  }

  // One-time upgrade: make word-level NetEase the actual default for existing
  // installs while retaining the settings toggles for subsequent user changes.
  if (settings.lyricsWordPriorityVersion !== 4) {
    settings.wordByWord = true;
    settings.neteaseWordByWord = true;
    settings.preferredLyricProvider = 'lyricsplus';
    settings.preferredLyricProviders = ['netease', 'lrclib', 'musixmatch'];
    settings.lyricsWordPriorityVersion = 4;
    saveLocalSettings();
  }

  // Defend normal desktop window mode from unintended auto-hide collapse
  if (config && config.settings && typeof config.settings.autoHideLyrics !== 'undefined') {
    settings.autoHideLyrics = Boolean(config.settings.autoHideLyrics);
  } else if (!parsed || typeof parsed.autoHideLyrics === 'undefined') {
    settings.autoHideLyrics = false;
  }

  // Enforce optimal defaults requested by user:
  if (!settings.bgStyle) {
    settings.bgStyle = 'fluid';
  }
  if (settings.fluidSpeed === undefined || settings.fluidSpeed === null) {
    settings.fluidSpeed = 1.0;
  }
  if (settings.bgOpacity === undefined || settings.bgOpacity === null) {
    settings.bgOpacity = 85;
  }
  if (!settings.fontSize || settings.fontSize < 16) {
    settings.fontSize = 22;
  }
  if (settings.autoHideTaskbarOnPause === undefined || settings.autoHideTaskbarOnPause === null) {
    settings.autoHideTaskbarOnPause = false;
  }

  // Force special modes to false on startup so app always opens as a normal window (matches Electron line 240)
  settings.taskbarMode = false;
  settings.wallpaperMode = false;
  settings.dynamicIslandMode = false;
  isDynamicIslandMode = false;
  settings.cinematicMode = false;
  isCinematicView = false;

  // Sanitize localStorage to purge any stale mode locks
  try {
    const rawSaved = localStorage.getItem("lyrics_overlay_settings");
    if (rawSaved) {
      const cleanSaved = JSON.parse(rawSaved);
      if (cleanSaved.autoHideLyrics && (!config || !config.settings || !config.settings.autoHideLyrics)) {
        cleanSaved.autoHideLyrics = false;
      }
      cleanSaved.cinematicMode = false;
      localStorage.setItem("lyrics_overlay_settings", JSON.stringify(cleanSaved));
    }
  } catch (_) {}

  if (typeof settings.layoutSplit === 'undefined') {
    settings.layoutSplit = true;
  }
  if (typeof settings.splitTallArtwork === 'undefined') {
    settings.splitTallArtwork = true;
  }
  if (typeof settings.wallpaperCinematic === 'undefined') {
    settings.wallpaperCinematic = true;
  }

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

  applyMotionPreferences();
  syncMotionPreferenceControls();
  updateLyricsDiagnostics();

  // Apply visual settings (skip IPC during bootstrapping to avoid redundant calls)
  applyVisualSettings(false, skipIPC);

  if (typeof syncDjSpectrumListener === 'function') {
    syncDjSpectrumListener();
  }

  if (isCinematicView) {
    initCinematicMainStage();
  }
}

_saveDebounceTimer = null;
let _saveSettingsRevision = 0;
function saveLocalSettings() {
  const revision = ++_saveSettingsRevision;
  const storageSettings = { ...settings };
  if (storageSettings.customArtGifSrc && storageSettings.customArtGifSrc.startsWith('data:')) {
    delete storageSettings.customArtGifSrc;
  }
  const savedAt = Date.now();

  // localStorage is synchronous: write this snapshot before the OTA installer
  // can exit the process. The config file remains the durable native copy.
  try {
    localStorage.setItem('lyrics_overlay_settings', JSON.stringify(storageSettings));
    localStorage.setItem('lyricflow_settings_saved_at', String(savedAt));
  } catch (e) {
    console.warn('Could not snapshot settings before deferred config save:', e);
  }

  if (_saveDebounceTimer) clearTimeout(_saveDebounceTimer);
  _saveDebounceTimer = setTimeout(async () => {
    try {
      // Persist directly to config.json for bulletproof persistence across sessions
      if (window.electronAPI && typeof window.electronAPI.saveConfig === 'function') {
        const curCfg = (await window.electronAPI.loadConfig()) || {};
        if (revision !== _saveSettingsRevision) return;
        curCfg.settings = storageSettings;
        curCfg.settingsUpdatedAt = savedAt;
        await window.electronAPI.saveConfig(curCfg);
      }
    } catch (e) {
      console.warn("Failed to persist settings:", e);
    }
  }, 150);
}

function applyMotionPreferences() {
  const master = Boolean(settings.reducedMotion);
  document.body.classList.toggle('lf-reduced-motion', master);
  document.body.classList.toggle('lf-reduced-art-motion', master || settings.motionAlbumArt === false);
  document.body.classList.toggle('lf-reduced-dust-motion', master || settings.motionIslandDust === false);
  document.body.classList.toggle('lf-reduced-visualizer-motion', master || settings.motionVisualizers === false);
}

function syncMotionPreferenceControls() {
  const controls = [
    ['check-reduced-motion', 'reducedMotion'],
    ['check-motion-art', 'motionAlbumArt'],
    ['check-motion-dust', 'motionIslandDust'],
    ['check-motion-visualizer', 'motionVisualizers']
  ];
  controls.forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (input) input.checked = key === 'reducedMotion' ? Boolean(settings[key]) : settings[key] !== false;
  });
}

let lastLyricsDiagnosticsUpdateAt = 0;
function updateLyricsDiagnostics() {
  const now = Date.now();
  if (now - lastLyricsDiagnosticsUpdateAt < 500) return;
  lastLyricsDiagnosticsUpdateAt = now;
  const trackEl = document.getElementById('diag-track');
  const playbackEl = document.getElementById('diag-playback');
  const lyricsEl = document.getElementById('diag-lyrics');
  if (!trackEl || !playbackEl || !lyricsEl) return;
  const track = currentPlayingTrackObj || {};
  const title = track.name || track.title || currentTitle || '';
  const artist = Array.isArray(track.artists) ? track.artists.map(a => a.name).filter(Boolean).join(', ') : (track.artist || '');
  const mediaSource = track.source || track.appName || track.app_name || 'Active media session';
  trackEl.textContent = title ? `${title}${artist ? ` — ${artist}` : ''}` : 'Waiting for music';
  const progressMs = typeof getAcousticSyncProgress === 'function' ? getAcousticSyncProgress() : 0;
  playbackEl.textContent = isPlaying ? `Playing · ${mediaSource} · ${formatTime(Math.max(0, progressMs))}` : (title ? `Paused · ${mediaSource}` : 'No active source');
  if (lyrics.length > 0) {
    const sync = currentSourceLevel >= 3 || lyrics.some(line => Array.isArray(line.words) && line.words.length) ? 'Word-by-word' : (currentSourceLevel >= 2 ? 'Line-synced' : 'Unsynced');
    lyricsEl.textContent = `${currentLyricSourceName || 'Unknown source'} · ${sync} · ${lyrics.length} lines`;
  } else {
    lyricsEl.textContent = isFetchingLyrics ? 'Searching…' : 'Not loaded';
  }
}

const WALLPAPER_PREBLUR_CACHE_MAX = 8;
const wallpaperPreblurCache = new Map();

function preRenderBlurredWallpaperArt(src, callback) {
  if (!src || typeof document === 'undefined') return;
  if (wallpaperPreblurCache.has(src)) {
    callback(wallpaperPreblurCache.get(src));
    return;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const targetSize = 160;
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) {
        callback(src);
        return;
      }
      ctx.filter = 'blur(6px) saturate(180%) brightness(45%)';
      ctx.drawImage(img, -8, -8, targetSize + 16, targetSize + 16);
      const preblurredUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (wallpaperPreblurCache.size >= WALLPAPER_PREBLUR_CACHE_MAX) {
        const firstKey = wallpaperPreblurCache.keys().next().value;
        wallpaperPreblurCache.delete(firstKey);
      }
      wallpaperPreblurCache.set(src, preblurredUrl);
      callback(preblurredUrl);
    } catch (_) {
      callback(src);
    }
  };
  img.onerror = () => callback(src);
  img.src = src;
}

function setWallpaperAlbumArt(src) {
  if (!wallpaperAlbumBg) return;

  if (!src) {
    wallpaperAlbumBg.removeAttribute("src");
    wallpaperAlbumBg.classList.remove("has-art", "has-preblurred-art");
    wallpaperAlbumBg.style.filter = '';
    if (wallpaperStyleArt) {
      wallpaperStyleArt.removeAttribute("src");
      wallpaperStyleArt.style.display = "none";
    }
    if (wallpaperArtFallback) wallpaperArtFallback.style.setProperty('display', 'flex', 'important');
    return;
  }

  preRenderBlurredWallpaperArt(src, (blurredUrl) => {
    if (!wallpaperAlbumBg) return;
    if (blurredUrl && blurredUrl !== src) {
      if (wallpaperAlbumBg.src !== blurredUrl) wallpaperAlbumBg.src = blurredUrl;
      wallpaperAlbumBg.classList.add("has-art", "has-preblurred-art");
      wallpaperAlbumBg.style.filter = 'none';
    } else {
      if (wallpaperAlbumBg.src !== src) wallpaperAlbumBg.src = src;
      wallpaperAlbumBg.classList.add("has-art");
      wallpaperAlbumBg.classList.remove("has-preblurred-art");
      wallpaperAlbumBg.style.filter = '';
    }
  });

  if (wallpaperStyleArt && wallpaperStyleArt.src !== src) {
    setArtWithSparkle(wallpaperStyleArt, src);
  }
  if (wallpaperStyleArt) {
    wallpaperStyleArt.onload = () => {
      if (wallpaperStyleArt.src === src && wallpaperArtFallback) wallpaperArtFallback.style.setProperty('display', 'none', 'important');
    };
    wallpaperStyleArt.onerror = () => {
      if (wallpaperStyleArt.src === src && wallpaperArtFallback && !wallpaperStyleArtVideo?.classList.contains('is-playing')) {
        wallpaperArtFallback.style.setProperty('display', 'flex', 'important');
      }
    };
    const imageReady = wallpaperStyleArt.complete && wallpaperStyleArt.naturalWidth > 0;
    if (!imageReady && !wallpaperStyleArtVideo?.classList.contains('is-playing') && wallpaperArtFallback) {
      wallpaperArtFallback.style.setProperty('display', 'flex', 'important');
    }
  }
  if (wallpaperStyleArt && !document.body.classList.contains('has-animated-art-video')) {
    wallpaperStyleArt.style.display = "block";
  }
  if (wallpaperStyleArt?.complete && wallpaperStyleArt.naturalWidth > 0 && wallpaperArtFallback) {
    wallpaperArtFallback.style.setProperty('display', 'none', 'important');
  }
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
    // Older cache snapshots may predate the current write cap. Bound them at
    // startup too, so a long-lived profile cannot retain an oversized object.
    const cachedKeys = Object.keys(animatedArtCache);
    while (cachedKeys.length > 24) {
      delete animatedArtCache[cachedKeys.shift()];
    }
  }
} catch (e) {}

function saveAnimatedArtCache(key, data) {
  try {
    if (!data || (typeof data.url === 'string' && data.url.startsWith('data:'))) return;
    if (!key || !data || typeof data !== 'object') return;
    const safeUrl = (value) => typeof value === 'string' &&
      value.length <= 12000 && !/^data:/i.test(value) ? value : null;
    const compact = {
      type: data.type === 'video' ? 'video' : (data.type || 'image'),
      url: safeUrl(data.url),
      tallUrl: safeUrl(data.tallUrl || data.tall_url),
      motionSourceVersion: data.motionSourceVersion === 1 ? 1 : undefined,
      source: typeof data.source === 'string' ? data.source.slice(0, 80) : undefined,
      aspectRatio: ['tall', 'square'].includes(String(data.aspectRatio || data.aspect_ratio || '').toLowerCase())
        ? String(data.aspectRatio || data.aspect_ratio).toLowerCase()
        : (Number.isFinite(Number(data.aspectRatio || data.aspect_ratio))
          ? Number(data.aspectRatio || data.aspect_ratio) : undefined)
    };
    if (!compact.url && !compact.tallUrl) return;
    animatedArtCache[key] = data;
    const entries = Object.entries(animatedArtCache);
    while (entries.length > 24) delete animatedArtCache[entries.shift()[0]];

    // This is an optional cache: never let it trigger the generic storage
    // recovery path, which can evict unrelated user data when quota is full.
    let snapshot = Object.fromEntries(Object.entries(animatedArtCache).map(([cacheKey, value]) => {
      if (cacheKey === key) return [cacheKey, compact];
      const entry = value && typeof value === 'object' ? value : {};
      return [cacheKey, {
        type: entry.type === 'video' ? 'video' : (entry.type || 'image'),
        url: safeUrl(entry.url),
        tallUrl: safeUrl(entry.tallUrl || entry.tall_url),
        motionSourceVersion: entry.motionSourceVersion === 1 ? 1 : undefined,
        source: typeof entry.source === 'string' ? entry.source.slice(0, 80) : undefined,
        aspectRatio: ['tall', 'square'].includes(String(entry.aspectRatio || entry.aspect_ratio || '').toLowerCase())
          ? String(entry.aspectRatio || entry.aspect_ratio).toLowerCase()
          : (Number.isFinite(Number(entry.aspectRatio || entry.aspect_ratio))
            ? Number(entry.aspectRatio || entry.aspect_ratio) : undefined)
      }];
    }));
    while (Object.keys(snapshot).length > 0) {
      const serialized = JSON.stringify(snapshot);
      if (serialized.length <= 96 * 1024) {
        try {
          localStorage.setItem('lf_animated_art_cache', serialized);
          return;
        } catch (_) { /* Evict old optional cache entries and retry. */ }
      }
      const oldest = Object.keys(snapshot).find(cacheKey => cacheKey !== key);
      if (!oldest) break;
      delete snapshot[oldest];
      delete animatedArtCache[oldest];
    }
    // Retry once with only the newest compact record. If storage is still full,
    // leave the in-memory cache usable and skip persistence without noise.
    try {
      const latest = JSON.stringify({ [key]: compact });
      if (latest.length <= 96 * 1024) localStorage.setItem('lf_animated_art_cache', latest);
    } catch (_) {}
  } catch (_) {}
}

// --- Battery-Saver Detection Engine for Motion Artwork ---
let isBatterySaverActive = false;

function initMotionBatterySaver() {
  if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
    navigator.getBattery().then(battery => {
      const handleBatteryUpdate = () => {
        const isLow = !battery.charging && battery.level <= 0.20;
        const shouldThrottle = isLow && settings.motionBatterySaver !== false;
        if (shouldThrottle !== isBatterySaverActive) {
          isBatterySaverActive = shouldThrottle;
          if (isBatterySaverActive) {
            console.info(`[MotionArt] Battery saver active (${Math.round(battery.level * 100)}% unplugged). Pausing motion loops.`);
            pauseAnimatedArtVideos();
            if (typeof showToast === 'function') {
              showToast(`Battery saver active (≤20%): Motion artwork paused to extend battery.`, 3500, 'info');
            }
          } else {
            console.info('[MotionArt] Battery saver cleared. Resuming motion loops.');
            resumeAnimatedArtVideos();
          }
        }
      };

      handleBatteryUpdate();
      battery.addEventListener('chargingchange', handleBatteryUpdate);
      battery.addEventListener('levelchange', handleBatteryUpdate);
    }).catch(() => {});
  }
}

// --- Live Video Ambilight & Chroma Frame Sampler (Throttled for zero-stutter playback) ---
class VideoFrameAmbilightSampler {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.timerId = null;
    this.targetFps = 0.67; // Sample every 1.5s - smooth breathing without GPU decode stalls
    this.intervalMs = 1500;
    this.lastC0 = null;
    this._isSampling = false;
    this.initCanvas();
  }

  initCanvas() {
    if (typeof document === 'undefined') return;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 16;
    this.canvas.height = 16;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  getActiveMotionVideo() {
    if (isDynamicIslandMode) {
      const v = document.getElementById('island-art-video');
      return (v && !v.paused && v.readyState >= 2 && v.style.display !== 'none') ? v : null;
    }
    if (settings.wallpaperMode) {
      const v = document.getElementById('wallpaper-album-bg-video') || document.getElementById('wallpaper-style-art-video');
      return (v && !v.paused && v.readyState >= 2 && v.style.display !== 'none') ? v : null;
    }
    const isSplit = document.body.classList.contains('layout-split');
    if (isSplit) {
      const v = document.getElementById('studio-art-video') || document.getElementById('studio-tall-bg-video');
      return (v && !v.paused && v.readyState >= 2 && v.style.display !== 'none') ? v : null;
    }
    const v = document.getElementById('widget-album-art-video');
    return (v && !v.paused && v.readyState >= 2 && v.style.display !== 'none') ? v : null;
  }

  start() {
    if (this.timerId) return;
    this.tick = this.tick.bind(this);
    this.timerId = setInterval(this.tick, this.intervalMs);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this._isSampling = false;
  }

  tick() {
    const isPlaybackActive = Boolean(isPlaying);
    if (typeof document !== 'undefined' && document.hidden && !isPlaybackActive) return;
    if (isBatterySaverActive && settings.motionBatterySaver !== false) return;
    if (isDynamicIslandMode || (typeof settings !== 'undefined' && (settings.wallpaperMode || settings.taskbarMode))) return;

    const video = this.getActiveMotionVideo();
    if (!video || !this.ctx || video.seeking || video.readyState < 3) return;
    if (this._isSampling) return;

    const processSource = (source) => {
      try {
        this.ctx.drawImage(source, 0, 0, 16, 16);
        if (source && typeof source.close === 'function') {
          source.close();
        }
        const imgData = this.ctx.getImageData(0, 0, 16, 16);
        const d = imgData.data;

        const getZoneRgb = (startX, startY, endX, endY) => {
          let r = 0, g = 0, b = 0, count = 0;
          for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
              const idx = (y * 16 + x) * 4;
              r += d[idx];
              g += d[idx + 1];
              b += d[idx + 2];
              count++;
            }
          }
          return count > 0 ? [r / count / 255, g / count / 255, b / count / 255] : [0.1, 0.1, 0.1];
        };

        const c0 = getZoneRgb(5, 5, 11, 11);
        const c1 = getZoneRgb(0, 0, 8, 8);
        const c2 = getZoneRgb(8, 0, 16, 8);
        const c3 = getZoneRgb(0, 8, 8, 16);
        const c4 = getZoneRgb(8, 8, 16, 16);

        // Delta threshold check: avoid triggering WebGL/CSS recalcs if colors haven't changed meaningfully
        if (this.lastC0 &&
            Math.abs(c0[0] - this.lastC0[0]) < 0.02 &&
            Math.abs(c0[1] - this.lastC0[1]) < 0.02 &&
            Math.abs(c0[2] - this.lastC0[2]) < 0.02) {
          return;
        }
        this.lastC0 = c0;

        const dynamicPalette = [c0, c1, c2, c3, c4];
        window.currentDynamicPalette = dynamicPalette;

        if (shouldRunFluidMesh() && window.fluidMesh && typeof window.fluidMesh.setPalette === 'function') {
          window.fluidMesh.setPalette(dynamicPalette, false);
        }

        if (document.documentElement) {
          const toRgbStr = (c) => `${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}`;
          document.documentElement.style.setProperty('--motion-primary-rgb', toRgbStr(c0));
          document.documentElement.style.setProperty('--motion-accent-rgb', toRgbStr(c1));
          document.documentElement.style.setProperty('--motion-glow-color', `rgba(${toRgbStr(c0)}, 0.45)`);
        }
      } catch (_) {
      } finally {
        this._isSampling = false;
      }
    };

    this._isSampling = true;
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(video, { resizeWidth: 16, resizeHeight: 16, resizeQuality: 'low' })
        .then((bitmap) => processSource(bitmap))
        .catch(() => processSource(video));
    } else {
      processSource(video);
    }
  }
}

const globalAmbilightSampler = new VideoFrameAmbilightSampler();

function isMotionVideoSurfaceActive(videoEl) {
  if (!videoEl || !currentAnimatedArtInfo || currentAnimatedArtInfo.type !== 'video' || !currentAnimatedArtInfo.url) return false;
  if (settings.animatedAlbumArt === false || (isBatterySaverActive && settings.motionBatterySaver !== false)) return false;
  // Playback state is authoritative. The body class is presentation state and
  // can lag briefly during optimistic play/pause transitions.
  const isPlaybackActive = Boolean(isPlaying);
  if (!isPlaybackActive) return false;

  const artModal = document.getElementById('album-art-modal');
  if (artModal && artModal.classList.contains('show')) {
    return false;
  }

  const split = document.body.classList.contains('layout-split');
  const wallpaperStyle = settings.wallpaperStyle || 'style2';
  switch (videoEl.id) {
    case 'island-art-video': return isDynamicIslandMode && !isIslandSleeping;
    case 'wallpaper-style-art-video': return settings.wallpaperMode && wallpaperStyle === 'style2';
    case 'wallpaper-album-bg-video':
      return settings.wallpaperMode && wallpaperStyle !== 'style2' && wallpaperStyle !== 'cinematic' &&
        (!settings.customBgSrc || !isCustomBackgroundActive());
    case 'studio-art-video': return !settings.wallpaperMode && !isDynamicIslandMode && !settings.taskbarMode && split;
    case 'widget-album-art-video': return !settings.wallpaperMode && !isDynamicIslandMode && !settings.taskbarMode && !split;
    default: return false;
  }
}

function getMotionVideoSurfaceSource(videoEl) {
  const info = currentAnimatedArtInfo;
  if (!info?.url) return null;
  if (videoEl._motionSquareFallbackTrack === info.url) return info.url;
  const isTallSurface = videoEl.id === 'wallpaper-style-art-video' || videoEl.id === 'wallpaper-album-bg-video' ||
    (videoEl.id === 'studio-art-video' && (settings.splitTallArtwork !== false) && supportsTallMotionArtwork());
  return isTallSurface ? (info.tallUrl || info.tall_url || info.url) : info.url;
}

function scheduleMotionVideoRecovery(videoEl, { delayMs = 250, reload = false, fallbackToSquare = false, replacePending = false } = {}) {
  if (!videoEl) return;
  // A focus recovery must supersede the long-delay retry installed by the
  // ordinary playback watchdog; otherwise the frozen surface keeps its stale
  // timer and the immediate decoder restart is silently discarded.
  if (videoEl._motionRecoveryTimer) {
    if (!replacePending) return;
    clearTimeout(videoEl._motionRecoveryTimer);
    videoEl._motionRecoveryTimer = null;
  }
  videoEl._motionRecoveryTimer = setTimeout(() => {
    videoEl._motionRecoveryTimer = null;
    if (!isMotionVideoSurfaceActive(videoEl)) return;

    const info = currentAnimatedArtInfo;
    let sourceUrl = getMotionVideoSurfaceSource(videoEl);
    if (!sourceUrl) return;
    if (fallbackToSquare && sourceUrl !== info.url) {
      videoEl._motionSquareFallbackTrack = info.url;
      sourceUrl = info.url;
    }

    if (reload) {
      const retryKey = `${info.url}|${sourceUrl}`;
      if (videoEl._motionRetryKey !== retryKey) {
        videoEl._motionRetryKey = retryKey;
        videoEl._motionRetryCount = 0;
      }
      if ((videoEl._motionRetryCount || 0) >= 2) {
        if (sourceUrl !== info.url) {
          videoEl._motionRetryCount = 0;
          videoEl._motionSquareFallbackTrack = info.url;
          startMotionArtVideo(videoEl, info.url);
        }
        return;
      }
      videoEl._motionRetryCount = (videoEl._motionRetryCount || 0) + 1;
      videoEl._motionRecoveryInProgress = true;
      videoEl.removeAttribute('src');
      videoEl.load();
      videoEl.classList.remove('is-playing', 'is-error');
      videoEl._motionRecoveryInProgress = false;
    }

    startMotionArtVideo(videoEl, sourceUrl);
  }, delayMs);
}

function attachResilientVideoLifecycle(videoEl, fallbackImgEl) {
  if (!videoEl || videoEl._hasResilientListeners) return;
  videoEl._hasResilientListeners = true;

  videoEl.loop = true;
  videoEl.preload = 'auto';
  videoEl.setAttribute('preload', 'auto');

  const markPlaying = () => {
    if (!videoEl.paused) {
      if (videoEl._motionRecoveryTimer) {
        clearTimeout(videoEl._motionRecoveryTimer);
        videoEl._motionRecoveryTimer = null;
      }
      videoEl.classList.add('is-playing');
      videoEl.classList.remove('is-error');
      if (videoEl.id === 'studio-art-video') {
        const studioFallback = document.getElementById('studio-art-fallback');
        if (studioFallback) studioFallback.style.display = 'none';
      }
    }
  };

  videoEl.addEventListener('playing', markPlaying);
  videoEl.addEventListener('timeupdate', () => {
    markPlaying();
    const currentTime = videoEl.currentTime || 0;
    videoEl._motionWatchdogLastTime = currentTime;
    videoEl._motionWatchdogProgressAt = Date.now();
    if (currentTime !== videoEl._motionLastProgressTime) {
      videoEl._motionRetryCount = 0;
      videoEl._motionLastProgressTime = currentTime;
    }
    // The split tall-art surface already has native looping enabled. Seeking it
    // to zero 150 ms before EOF interrupts the final frame and can flash a
    // stale/small first frame; let WebView2 perform its native loop instead.
    if (videoEl.id !== 'studio-art-video' && videoEl.duration > 0 && currentTime >= videoEl.duration - 0.15) {
      if (!videoEl._motionShouldPlay || !isMotionVideoSurfaceActive(videoEl)) return;
      videoEl.currentTime = 0;
      if (videoEl.paused) requestMotionVideoPlay(videoEl);
    }
  });

  // Seamless looping: ensure video wraps cleanly back to 0s without pause stutter
  videoEl.addEventListener('ended', () => {
    if (videoEl.id === 'studio-art-video') return;
    if (!videoEl._motionShouldPlay || !isMotionVideoSurfaceActive(videoEl)) return;
    videoEl.currentTime = 0;
    requestMotionVideoPlay(videoEl);
  });

  videoEl.addEventListener('error', (e) => {
    console.warn(`[MotionVideo] Error on ${videoEl.id || 'video'}:`, videoEl.error);
    videoEl.classList.remove('is-playing');
    videoEl.classList.add('is-error');
    videoEl.style.display = 'none';
    videoEl.style.opacity = '0';
    if (fallbackImgEl) {
      fallbackImgEl.style.setProperty('display', 'block', 'important');
      fallbackImgEl.style.opacity = '1';
    }
    if (videoEl.id === 'studio-art-video') {
      const studioFallback = document.getElementById('studio-art-fallback');
      const stillArt = document.getElementById('studio-art-img');
      if (studioFallback && (!stillArt || stillArt.naturalWidth === 0)) studioFallback.style.display = 'flex';
    }
    if (videoEl._motionShouldPlay && isMotionVideoSurfaceActive(videoEl)) {
      scheduleMotionVideoRecovery(videoEl, { delayMs: 500, reload: true, fallbackToSquare: true });
    }
  });
}

function requestMotionVideoPlay(videoEl, expectedGeneration = videoEl?._motionStartGeneration) {
  if (!videoEl || !videoEl._motionShouldPlay || !isMotionVideoSurfaceActive(videoEl)) return;
  const playPromise = videoEl.play();
  if (!playPromise || typeof playPromise.then !== 'function') return;
  playPromise.then(() => {
    if (videoEl._motionStartGeneration !== expectedGeneration) return;
    if (!videoEl._motionShouldPlay || !isMotionVideoSurfaceActive(videoEl)) {
      videoEl.pause();
      return;
    }
    videoEl.classList.add('is-playing');
    videoEl.classList.remove('is-error');
  }).catch((error) => {
    if (error?.name === 'AbortError') return;
    if (!videoEl._motionShouldPlay || !isMotionVideoSurfaceActive(videoEl)) return;
    if (error?.name === 'NotAllowedError') {
      const unlock = () => {
        if (videoEl._motionStartGeneration === expectedGeneration && videoEl._motionShouldPlay && isMotionVideoSurfaceActive(videoEl)) {
          requestMotionVideoPlay(videoEl, expectedGeneration);
        }
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      return;
    }
    console.warn(`[MotionVideo] play() failed on ${videoEl.id || 'video'}:`, error);
  });
}

function stopMotionVideoFrameMonitor(videoEl) {
  if (!videoEl) return;
  videoEl._motionFrameMonitorGeneration = (videoEl._motionFrameMonitorGeneration || 0) + 1;
  if (videoEl._motionFrameCallbackId != null && typeof videoEl.cancelVideoFrameCallback === 'function') {
    try { videoEl.cancelVideoFrameCallback(videoEl._motionFrameCallbackId); } catch (_) {}
  }
  videoEl._motionFrameCallbackId = null;
}

function startMotionVideoFrameMonitor(videoEl) {
  if (!videoEl || typeof videoEl.requestVideoFrameCallback !== 'function' || videoEl._motionFrameCallbackId != null) return;
  const generation = (videoEl._motionFrameMonitorGeneration || 0) + 1;
  videoEl._motionFrameMonitorGeneration = generation;
  const onFrame = () => {
    if (generation !== videoEl._motionFrameMonitorGeneration) return;
    videoEl._motionFrameCallbackId = null;
    if (!videoEl._motionShouldPlay || !isMotionVideoSurfaceActive(videoEl)) return;
    videoEl._motionLastPresentedFrameAt = Date.now();
    videoEl._motionFrameCallbackId = videoEl.requestVideoFrameCallback(onFrame);
  };
  videoEl._motionFrameCallbackId = videoEl.requestVideoFrameCallback(onFrame);
}

function startMotionArtVideo(videoEl, sourceUrl) {
  if (!videoEl || !sourceUrl) return;
  const startGeneration = (videoEl._motionStartGeneration || 0) + 1;
  videoEl._motionStartGeneration = startGeneration;
  videoEl._motionRequestedUrl = sourceUrl;
  videoEl._motionSourcePending = false;

  if (settings.animatedAlbumArt === false || (isBatterySaverActive && settings.motionBatterySaver !== false) ||
      !isMotionVideoSurfaceActive(videoEl)) {
    videoEl._motionShouldPlay = false;
    videoEl.pause();
    return;
  }
  videoEl._motionShouldPlay = true;
  if (videoEl.paused || videoEl.readyState < 2 || !Number.isFinite(videoEl._motionWatchdogProgressAt)) {
    videoEl._motionWatchdogLastTime = Number(videoEl.currentTime) || 0;
    videoEl._motionWatchdogProgressAt = Date.now();
    videoEl._motionLastPresentedFrameAt = Date.now();
  }
  startMotionVideoFrameMonitor(videoEl);
  const requestedArtInfo = currentAnimatedArtInfo;
  const isRequestCurrent = () => videoEl._motionStartGeneration === startGeneration &&
    videoEl._motionRequestedUrl === sourceUrl && currentAnimatedArtInfo === requestedArtInfo &&
    videoEl._motionShouldPlay && isMotionVideoSurfaceActive(videoEl);
  bindMotionContinuityListeners(videoEl);

  // Defensive check: ensure no raw m3u8 playlist is ever assigned to an HTML5 video element
  if (sourceUrl.includes('.m3u8')) {
    if (typeof window !== 'undefined' && window.AppleMotionArt && typeof window.AppleMotionArt.resolveProgressiveMp4 === 'function') {
      Promise.resolve().then(() => window.AppleMotionArt.resolveProgressiveMp4(sourceUrl)).then((directMp4) => {
        if (!isRequestCurrent()) return;
        if (directMp4) {
          startMotionArtVideo(videoEl, directMp4);
        } else if (requestedArtInfo?.url && requestedArtInfo.url !== sourceUrl && !requestedArtInfo.url.includes('.m3u8')) {
          videoEl._motionSquareFallbackTrack = requestedArtInfo.url;
          startMotionArtVideo(videoEl, requestedArtInfo.url);
        }
      }).catch((error) => {
        if (!isRequestCurrent()) return;
        console.warn(`[MotionVideo] Could not resolve playlist for ${videoEl.id || 'video'}:`, error);
        if (requestedArtInfo?.url && requestedArtInfo.url !== sourceUrl && !requestedArtInfo.url.includes('.m3u8')) {
          videoEl._motionSquareFallbackTrack = requestedArtInfo.url;
          startMotionArtVideo(videoEl, requestedArtInfo.url);
        }
      });
      return;
    }
    if (requestedArtInfo?.url && requestedArtInfo.url !== sourceUrl && !requestedArtInfo.url.includes('.m3u8')) {
      videoEl._motionSquareFallbackTrack = requestedArtInfo.url;
      startMotionArtVideo(videoEl, requestedArtInfo.url);
    }
    return;
  }

  const markPlaying = () => {
    if (isRequestCurrent() && !videoEl.paused) {
      videoEl._motionSourcePending = false;
      if (videoEl._motionRecoveryTimer) {
        clearTimeout(videoEl._motionRecoveryTimer);
        videoEl._motionRecoveryTimer = null;
      }
      videoEl.classList.add('is-playing');
      videoEl.classList.remove('is-error');
      if (videoEl.id === 'studio-art-video') {
        const studioFallback = document.getElementById('studio-art-fallback');
        if (studioFallback) studioFallback.style.display = 'none';
      }
    }
  };

  videoEl.muted = true;
  videoEl.defaultMuted = true;
  videoEl.setAttribute('muted', '');
  videoEl.loop = true;
  videoEl.preload = 'auto';
  videoEl.setAttribute('preload', 'auto');
  videoEl.playsInline = true;
  videoEl.setAttribute('playsinline', '');
  videoEl.removeAttribute('autoplay');
  videoEl.style.removeProperty('opacity');
  videoEl.style.display = 'block';
  if (videoEl.id === 'studio-art-video') {
    const stillArt = document.getElementById('studio-art-img');
    if (stillArt) {
      stillArt.style.setProperty('display', 'block', 'important');
      stillArt.style.opacity = '1';
    }
  }

  const currentSrc = videoEl.currentSrc || videoEl.src || '';
  const isAlreadyLoaded = currentSrc === sourceUrl || videoEl.src === sourceUrl;
  if (videoEl._motionSquareFallbackTrack !== currentAnimatedArtInfo?.url) {
    videoEl._motionSquareFallbackTrack = null;
  }

  if (!isAlreadyLoaded) {
    videoEl.classList.remove('is-playing', 'is-error');
    const onCanPlay = () => {
      videoEl.removeEventListener('canplay', onCanPlay);
      videoEl.removeEventListener('loadeddata', onCanPlay);
      if (isRequestCurrent()) {
        videoEl._motionSourcePending = false;
        requestMotionVideoPlay(videoEl, startGeneration);
      }
    };
    videoEl.addEventListener('canplay', onCanPlay, { once: true });
    videoEl.addEventListener('loadeddata', onCanPlay, { once: true });
    videoEl._motionSourcePending = true;
    videoEl.src = sourceUrl;
    videoEl.load();
    return;
  }

  if (!videoEl.paused) {
    markPlaying();
    // Keep studio-art-img visible underneath videoEl to prevent blank frames
    return;
  }

  requestMotionVideoPlay(videoEl, startGeneration);
}

// --- Latent Video Decoder Unbinding Helpers ---
function unbindVideoSurface(videoEl) {
  if (!videoEl) return;
  stopMotionVideoFrameMonitor(videoEl);
  videoEl._motionShouldPlay = false;
  videoEl._motionSourcePending = false;
  videoEl._motionStartGeneration = (videoEl._motionStartGeneration || 0) + 1;
  videoEl._motionRequestedUrl = null;
  const currentSrc = videoEl.getAttribute('src') || videoEl.src || videoEl.currentSrc;
  if (currentSrc && !videoEl._dormantSrc) {
    videoEl._dormantSrc = currentSrc;
  }
  if (videoEl._motionRecoveryTimer) {
    clearTimeout(videoEl._motionRecoveryTimer);
    videoEl._motionRecoveryTimer = null;
  }
  videoEl.pause();
  videoEl.preload = 'none';
  videoEl.removeAttribute('src');
  videoEl.load();
  videoEl.style.display = 'none';
  videoEl.classList.remove('is-playing', 'is-error');
}

function restoreVideoSurface(videoEl, fallbackUrl) {
  if (!videoEl) return;
  // The caller's URL reflects the currently selected surface (square or tall).
  // A dormant URL may belong to a previous mode or aspect ratio, so only use
  // it when no current URL was supplied.
  const targetUrl = fallbackUrl || videoEl._dormantSrc || (typeof currentAnimatedArtInfo !== 'undefined' ? currentAnimatedArtInfo?.url : null);
  videoEl._dormantSrc = null;
  if (targetUrl && typeof startMotionArtVideo === 'function') {
    startMotionArtVideo(videoEl, targetUrl);
  }
}

if (typeof window !== 'undefined') {
  window.unbindVideoSurface = unbindVideoSurface;
  window.restoreVideoSurface = restoreVideoSurface;
}

function syncActiveAnimatedVideoState() {
  const islandArtImg = document.getElementById('island-art-img');
  const islandArtVideo = document.getElementById('island-art-video');
  const studioArtVideo = document.getElementById('studio-art-video');
  const studioTallBgVideo = document.getElementById('studio-tall-bg-video');
  const wallpaperAlbumBg = document.getElementById('wallpaper-album-bg');
  const wallpaperStyleArt = document.getElementById('wallpaper-style-art');
  const studioArtImg = document.getElementById('studio-art-img');

  attachResilientVideoLifecycle(widgetAlbumArtVideo, widgetAlbumArt);
  attachResilientVideoLifecycle(islandArtVideo, islandArtImg);
  attachResilientVideoLifecycle(studioArtVideo, studioArtImg);
  attachResilientVideoLifecycle(wallpaperAlbumBgVideo, wallpaperAlbumBg);
  attachResilientVideoLifecycle(wallpaperStyleArtVideo, wallpaperStyleArt);

  if (!currentAnimatedArtInfo || currentAnimatedArtInfo.type !== 'video' || !currentAnimatedArtInfo.url || (isBatterySaverActive && settings.motionBatterySaver !== false)) {
    globalAmbilightSampler.stop();
    unbindVideoSurface(widgetAlbumArtVideo);
    unbindVideoSurface(studioArtVideo);
    unbindVideoSurface(studioTallBgVideo);
    unbindVideoSurface(islandArtVideo);
    unbindVideoSurface(wallpaperStyleArtVideo);
    unbindVideoSurface(wallpaperAlbumBgVideo);
    return;
  }

  const url = currentAnimatedArtInfo.url;
  const tallUrl = currentAnimatedArtInfo.tallUrl || currentAnimatedArtInfo.tall_url || url;
  const effectiveUrl = url;
  const effectiveTallUrl = tallUrl;

  // Keep provider URLs attached to the video elements; swapping active streams
  // to fetched Blob URLs was causing WebView2 playback to freeze in desktop views.

  if (isDynamicIslandMode) {
    // Dynamic Island mode: ONLY islandArtVideo runs
    unbindVideoSurface(widgetAlbumArtVideo);
    unbindVideoSurface(studioArtVideo);
    unbindVideoSurface(studioTallBgVideo);
    unbindVideoSurface(wallpaperStyleArtVideo);
    unbindVideoSurface(wallpaperAlbumBgVideo);
    if (islandArtVideo) {
      restoreVideoSurface(islandArtVideo, effectiveUrl);
    }
  } else if (settings.taskbarMode) {
    // Taskbar mode: unbind all main window video surfaces to release decoders
    unbindVideoSurface(widgetAlbumArtVideo);
    unbindVideoSurface(studioArtVideo);
    unbindVideoSurface(studioTallBgVideo);
    unbindVideoSurface(islandArtVideo);
    unbindVideoSurface(wallpaperStyleArtVideo);
    unbindVideoSurface(wallpaperAlbumBgVideo);
  } else if (settings.wallpaperMode) {
    // Style 2 uses one tall foreground video; the static cover supplies the
    // blurred backdrop. Avoid decoding a second full-screen video at once.
    const wallpaperStyle = settings.wallpaperStyle || 'style2';
    const useTallCover = wallpaperStyle === 'style2';
    const useMotionBackdrop = wallpaperStyle !== 'style2' && wallpaperStyle !== 'cinematic' &&
      (!settings.customBgSrc || !isCustomBackgroundActive());
    unbindVideoSurface(widgetAlbumArtVideo);
    unbindVideoSurface(studioArtVideo);
    unbindVideoSurface(studioTallBgVideo);
    unbindVideoSurface(islandArtVideo);
    if (wallpaperStyleArtVideo) {
      if (useTallCover) {
        restoreVideoSurface(wallpaperStyleArtVideo, effectiveTallUrl);
      } else {
        unbindVideoSurface(wallpaperStyleArtVideo);
      }
    }
    if (wallpaperAlbumBgVideo && useMotionBackdrop) {
      restoreVideoSurface(wallpaperAlbumBgVideo, effectiveTallUrl);
    } else if (wallpaperAlbumBgVideo) {
      unbindVideoSurface(wallpaperAlbumBgVideo);
    }
  } else {
    // Standard desktop mode:
    unbindVideoSurface(islandArtVideo);
    unbindVideoSurface(wallpaperStyleArtVideo);
    unbindVideoSurface(wallpaperAlbumBgVideo);

    const isSplit = document.body.classList.contains('layout-split');
    if (isSplit) {
      // Split Studio sidebar active
      unbindVideoSurface(widgetAlbumArtVideo);
      if (studioArtVideo) {
        // Keep both motion-art variants available as looping tracks: square is
        // the default, and the tall source is selected only when the user opts in.
        const useTallMotionArt = (settings.splitTallArtwork !== false) && supportsTallMotionArtwork();
        const splitMotionUrl = useTallMotionArt ? effectiveTallUrl : effectiveUrl;
        restoreVideoSurface(studioArtVideo, splitMotionUrl);
      }
      if (studioTallBgVideo) {
        // The split sidebar uses studio-art-video as its full tall-art surface;
        // this second layer is hidden by CSS and only wastes a video decoder.
        unbindVideoSurface(studioTallBgVideo);
      }
    } else {
      // Standard Overlay Mode: ONLY widgetAlbumArtVideo is visible!
      unbindVideoSurface(studioArtVideo);
      unbindVideoSurface(studioTallBgVideo);
      if (widgetAlbumArtVideo) {
        restoreVideoSurface(widgetAlbumArtVideo, effectiveUrl);
      }
    }
  }

  if (isPlaying && currentAnimatedArtInfo && currentAnimatedArtInfo.type === 'video') {
    globalAmbilightSampler.start();
  }
}

// Reactive motion continuity event listener binding
function bindMotionContinuityListeners(videoEl) {
  if (!videoEl || videoEl._motionContinuityBound) return;
  videoEl._motionContinuityBound = true;
  const onUnexpectedPause = () => {
    try {
      if (videoEl._motionRecoveryInProgress || videoEl._motionSourcePending || !videoEl._motionShouldPlay || !isMotionVideoSurfaceActive(videoEl)) return;
      if (videoEl.paused) {
        if (videoEl.readyState >= 2) {
          // A real audio pause can arrive just after the decoder's pause event.
          // Recheck playback state before attempting a quick resume.
          scheduleMotionVideoRecovery(videoEl, { delayMs: 120 });
        } else if (videoEl.src && !videoEl._motionRecoveryTimer) {
          scheduleMotionVideoRecovery(videoEl, { delayMs: 150 });
        }
      }
    } catch (_) {}
  };
  const onBufferStall = () => {
    if (!videoEl._motionShouldPlay || !isMotionVideoSurfaceActive(videoEl) || !videoEl.src || videoEl._motionRecoveryTimer) return;
    scheduleMotionVideoRecovery(videoEl, { delayMs: 12000, reload: true, fallbackToSquare: false });
  };
  videoEl.addEventListener('pause', onUnexpectedPause);
  videoEl.addEventListener('waiting', onBufferStall);
  videoEl.addEventListener('stalled', onBufferStall);
}

// Continuous playback watchdog: ensures tall/split motion video immediately resumes if paused
if (typeof window !== 'undefined' && !window._motionContinuityWatchdog) {
  window._motionContinuityWatchdog = setInterval(() => {
    try {
      const isPlaybackActive = Boolean(isPlaying);
      if (!isPlaybackActive) return;
      if (!currentAnimatedArtInfo || currentAnimatedArtInfo.type !== 'video' || !currentAnimatedArtInfo.url) return;

      const isSplit = document.body.classList.contains('layout-split');
      let targetVideo = null;
      if (settings.wallpaperMode) {
        const wallpaperStyle = settings.wallpaperStyle || 'style2';
        targetVideo = wallpaperStyle === 'style2'
          ? (wallpaperStyleArtVideo || document.getElementById('wallpaper-style-art-video'))
          : (wallpaperAlbumBgVideo || document.getElementById('wallpaper-album-bg-video'));
      } else if (isDynamicIslandMode) {
        targetVideo = document.getElementById('island-art-video');
      } else {
        targetVideo = isSplit
          ? document.getElementById('studio-art-video')
          : document.getElementById('widget-album-art-video');
      }

      if (targetVideo) {
        bindMotionContinuityListeners(targetVideo);
        if (targetVideo._motionShouldPlay && isMotionVideoSurfaceActive(targetVideo) && targetVideo.paused) {
          if (targetVideo.readyState >= 2) {
            requestMotionVideoPlay(targetVideo);
          } else if (targetVideo.src && !targetVideo._motionRecoveryTimer) {
            scheduleMotionVideoRecovery(targetVideo, { delayMs: 150 });
          } else if (!targetVideo.src) {
            const src = getMotionVideoSurfaceSource(targetVideo);
            if (src) startMotionArtVideo(targetVideo, src);
          }
        } else if (targetVideo._motionShouldPlay && isMotionVideoSurfaceActive(targetVideo) &&
                   !targetVideo.paused && targetVideo.readyState >= 2 && !targetVideo._motionSourcePending) {
          // WebView2 sometimes leaves a decoder marked as playing while its
          // decoded frame has stopped advancing (for example after an OS
          // overlay steals focus). Detect that separately from the paused
          // event path and restart only the affected surface.
          const now = Date.now();
          const currentTime = Number(targetVideo.currentTime) || 0;
          const previousTime = Number(targetVideo._motionWatchdogLastTime);
          const duration = Number(targetVideo.duration) || 0;
          const wrapped = duration > 0 && previousTime > duration - 0.25 && currentTime < 0.1;
          const advanced = Number.isFinite(previousTime) && (Math.abs(currentTime - previousTime) >= 0.02 || wrapped);
          const frameTime = Number(targetVideo._motionLastPresentedFrameAt);
          const presentedFramesStalled = Number.isFinite(frameTime) && now - frameTime >= 7500;
          if (advanced || !Number.isFinite(previousTime)) {
            targetVideo._motionWatchdogLastTime = currentTime;
            targetVideo._motionWatchdogProgressAt = now;
          }
          if ((presentedFramesStalled || now - (targetVideo._motionWatchdogProgressAt || now) >= 7500) &&
              !targetVideo._motionRecoveryInProgress) {
            targetVideo._motionWatchdogProgressAt = now;
            scheduleMotionVideoRecovery(targetVideo, {
              delayMs: 0,
              reload: true,
              fallbackToSquare: true,
              replacePending: true
            });
          }
        }
      }
    } catch (_) {}
  }, 2500); // Relaxed from 250ms to 2500ms safety net; reactive event listeners handle immediate recovery
}

function setAnimatedAlbumArt(animatedInfo, fallbackStaticUrl = null) {
  // Direct state changes (for example, losing the active media session) must
  // prevent an older asynchronous lookup from replacing the current artwork.
  currentAnimatedFetchToken++;
  currentAnimatedArtInfo = animatedInfo;
  if (typeof window !== 'undefined') {
    window.currentAnimatedArtInfo = animatedInfo;
  }
  syncSplitTallArtworkAvailability();
  const islandArtImg = document.getElementById('island-art-img');
  const islandArtVideo = document.getElementById('island-art-video');
  const studioArtImg = document.getElementById('studio-art-img');
  const studioArtVideo = document.getElementById('studio-art-video');
  const studioTallBgVideo = document.getElementById('studio-tall-bg-video');
  const studioArtFallback = document.getElementById('studio-art-fallback');

  const stopIslandArtVideo = () => {
    if (!islandArtVideo) return;
    islandArtVideo.pause();
    islandArtVideo.removeAttribute('src');
    islandArtVideo.load();
    islandArtVideo.style.display = 'none';
    islandArtVideo.classList.remove('is-playing', 'is-error');
  };

  if (!animatedInfo || !animatedInfo.url) {
    document.body.classList.remove('has-animated-art-video');
    if (widgetAlbumArtVideo) {
      widgetAlbumArtVideo.pause();
      widgetAlbumArtVideo.removeAttribute('src');
      widgetAlbumArtVideo.style.display = 'none';
    }
    if (studioArtVideo) {
      studioArtVideo.pause();
      studioArtVideo.removeAttribute('src');
      studioArtVideo.style.display = 'none';
    }
    const studioTallBgVideo = document.getElementById('studio-tall-bg-video');
    if (studioTallBgVideo) {
      studioTallBgVideo.pause();
      studioTallBgVideo.removeAttribute('src');
      studioTallBgVideo.style.display = 'none';
    }
    if (studioTallBgVideo) {
      studioTallBgVideo.pause();
      studioTallBgVideo.removeAttribute('src');
      studioTallBgVideo.style.display = 'none';
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
    stopIslandArtVideo();

    const staticUrl = fallbackStaticUrl || currentStaticAlbumArtUrl;
    if (staticUrl) {
      if (islandArtImg) {
        triggerIslandArtTransition(staticUrl);
        islandArtImg.style.display = 'block';
        islandArtImg.style.opacity = '1';
      }
      if (widgetAlbumArt) {
        if (widgetAlbumArt.src !== staticUrl) setArtWithSparkle(widgetAlbumArt, staticUrl);
        widgetAlbumArt.style.display = 'block';
      }
      if (studioArtImg) {
        if (studioArtImg.src !== staticUrl) setArtWithSparkle(studioArtImg, staticUrl);
        studioArtImg.style.display = 'block';
      }
      if (widgetArtFallback) widgetArtFallback.style.display = 'none';
      if (studioArtFallback) studioArtFallback.style.display = 'none';
      setWallpaperAlbumArt(staticUrl);
    } else {
      if (islandArtImg) islandArtImg.style.display = 'none';
      if (widgetAlbumArt) widgetAlbumArt.style.display = 'none';
      if (studioArtImg) studioArtImg.style.display = 'none';
      if (widgetArtFallback) widgetArtFallback.style.display = 'flex';
      if (studioArtFallback) studioArtFallback.style.display = 'flex';
      setWallpaperAlbumArt(null);
    }
    const artModal = document.getElementById("album-art-modal");
    if (artModal && artModal.classList.contains("show")) {
      showAlbumArtModal();
    }
    return;
  }

  const { type, url } = animatedInfo;

  if (type === 'video') {
    document.body.classList.add('has-animated-art-video');

    const staticFallback = fallbackStaticUrl || currentStaticAlbumArtUrl;
    if (widgetAlbumArt) {
      if (staticFallback && widgetAlbumArt.src !== staticFallback) setArtWithSparkle(widgetAlbumArt, staticFallback);
      widgetAlbumArt.style.display = 'block';
    }
    if (widgetArtFallback) widgetArtFallback.style.display = 'none';
    if (studioArtImg) {
      if (staticFallback && studioArtImg.src !== staticFallback) setArtWithSparkle(studioArtImg, staticFallback);
      studioArtImg.style.display = staticFallback ? 'block' : 'none';
    }
    if (studioArtFallback) {
      const stillReady = Boolean(staticFallback && studioArtImg?.complete && studioArtImg.naturalWidth > 0);
      studioArtFallback.style.display = stillReady ? 'none' : 'flex';
    }
    // Keep the correct still cover visible until the inline video has produced
    // a decoded frame; CSS hides it only after playback starts successfully.
    if (islandArtImg) {
      if (staticFallback) {
        triggerIslandArtTransition(staticFallback);
      }
      islandArtImg.style.display = 'block';
      islandArtImg.style.opacity = '1';
    }
    if (wallpaperStyleArt) {
      if (staticFallback && wallpaperStyleArt.src !== staticFallback) setArtWithSparkle(wallpaperStyleArt, staticFallback);
      wallpaperStyleArt.style.display = 'block';
      if (!staticFallback && wallpaperArtFallback) wallpaperArtFallback.style.setProperty('display', 'flex', 'important');
    }
    if (staticFallback) setWallpaperAlbumArt(staticFallback);

    syncActiveAnimatedVideoState();
  } else {
    // GIF / Image
    document.body.classList.remove('has-animated-art-video');
    syncActiveAnimatedVideoState();

    if (widgetAlbumArt) {
      if (widgetAlbumArt.src !== url) setArtWithSparkle(widgetAlbumArt, url);
      widgetAlbumArt.style.display = 'block';
      widgetAlbumArt.onerror = () => {
        const fallback = fallbackStaticUrl || currentStaticAlbumArtUrl;
        if (fallback && widgetAlbumArt.src !== fallback) {
          setArtWithSparkle(widgetAlbumArt, fallback);
          widgetAlbumArt.style.display = 'block';
          if (widgetArtFallback) widgetArtFallback.style.display = 'none';
        } else if (!fallback) {
          widgetAlbumArt.style.display = 'none';
          if (widgetArtFallback) widgetArtFallback.style.display = 'flex';
        }
      };
    }
    if (widgetArtFallback) widgetArtFallback.style.display = 'none';

    if (studioArtVideo) {
      studioArtVideo.pause();
      studioArtVideo.removeAttribute('src');
      studioArtVideo.style.display = 'none';
    }
    const studioTallBgVideo = document.getElementById('studio-tall-bg-video');
    if (studioTallBgVideo) {
      studioTallBgVideo.pause();
      studioTallBgVideo.removeAttribute('src');
      studioTallBgVideo.style.display = 'none';
    }
    if (studioArtImg) {
      if (studioArtImg.src !== url) setArtWithSparkle(studioArtImg, url);
      studioArtImg.style.display = 'block';
    }
    if (studioArtFallback) studioArtFallback.style.display = 'none';

    stopIslandArtVideo();
    if (islandArtImg) {
      triggerIslandArtTransition(url);
      islandArtImg.style.display = 'block';
      islandArtImg.style.opacity = '1';
    }

    if (wallpaperStyleArtVideo) {
      wallpaperStyleArtVideo.pause();
      wallpaperStyleArtVideo.removeAttribute('src');
      wallpaperStyleArtVideo.style.display = 'none';
    }
    if (wallpaperStyleArt) {
      if (wallpaperStyleArt.src !== url) setArtWithSparkle(wallpaperStyleArt, url);
      wallpaperStyleArt.style.display = 'block';
      wallpaperStyleArt.onerror = () => {
        const fallback = fallbackStaticUrl || currentStaticAlbumArtUrl;
        if (fallback && wallpaperStyleArt.src !== fallback) {
          setArtWithSparkle(wallpaperStyleArt, fallback);
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
      preRenderBlurredWallpaperArt(url, (blurredUrl) => {
        if (!wallpaperAlbumBg) return;
        if (blurredUrl && blurredUrl !== url) {
          if (wallpaperAlbumBg.src !== blurredUrl) wallpaperAlbumBg.src = blurredUrl;
          wallpaperAlbumBg.classList.add('has-art', 'has-preblurred-art');
          wallpaperAlbumBg.style.filter = 'none';
        } else {
          if (wallpaperAlbumBg.src !== url) wallpaperAlbumBg.src = url;
          wallpaperAlbumBg.classList.add('has-art');
          wallpaperAlbumBg.classList.remove('has-preblurred-art');
          wallpaperAlbumBg.style.filter = '';
        }
        wallpaperAlbumBg.style.display = 'block';
      });
    }
  }

  const artModal = document.getElementById("album-art-modal");
  if (artModal && artModal.classList.contains("show")) {
    showAlbumArtModal();
  }
}

function pauseAnimatedArtVideos() {
  globalAmbilightSampler.stop();
  [
    widgetAlbumArtVideo,
    document.getElementById('studio-art-video'),
    document.getElementById('studio-tall-bg-video'),
    wallpaperStyleArtVideo,
    wallpaperAlbumBgVideo,
    document.getElementById('island-art-video')
  ].forEach(unbindVideoSurface);
}

function pauseAnimatedArtVideosForPlaybackStop() {
  globalAmbilightSampler.stop();
  [
    widgetAlbumArtVideo,
    document.getElementById('studio-art-video'),
    document.getElementById('studio-tall-bg-video'),
    wallpaperStyleArtVideo,
    wallpaperAlbumBgVideo,
    document.getElementById('island-art-video')
  ].forEach((videoEl) => {
    if (!videoEl) return;
    stopMotionVideoFrameMonitor(videoEl);
    if (videoEl._motionRecoveryTimer) {
      clearTimeout(videoEl._motionRecoveryTimer);
      videoEl._motionRecoveryTimer = null;
    }
    videoEl._motionShouldPlay = false;
    videoEl._motionSourcePending = false;
    // Keep the decoded frame and source attached. Playback resume can continue
    // immediately, while a paused track no longer consumes a decoder loop.
    videoEl.pause();
  });
}

function resumeAnimatedArtVideos() {
  [
    widgetAlbumArtVideo,
    document.getElementById('studio-art-video'),
    wallpaperStyleArtVideo,
    wallpaperAlbumBgVideo,
    document.getElementById('island-art-video')
  ].forEach((videoEl) => {
    if (!videoEl) return;
    videoEl._motionRetryCount = 0;
    // A square fallback is only for the current decoder failure. Focus/visibility
    // restoration is a fresh attempt and must reselect the preferred tall source.
    videoEl._motionSquareFallbackTrack = null;
  });
  syncSplitTallArtworkAvailability();
  syncActiveAnimatedVideoState();
}

let motionArtFocusRecoveryTimers = [];
let motionArtFocusRecoveryGeneration = 0;

function scheduleMotionArtFocusRecovery() {
  motionArtFocusRecoveryTimers.forEach(timer => clearTimeout(timer));
  motionArtFocusRecoveryTimers = [];
  const generation = ++motionArtFocusRecoveryGeneration;
  const videos = [
    document.getElementById('studio-art-video'),
    document.getElementById('widget-album-art-video'),
    document.getElementById('island-art-video'),
    wallpaperStyleArtVideo,
    wallpaperAlbumBgVideo
  ].filter(Boolean);
  const baselineTimes = new Map(videos.map(video => [video, Number(video.currentTime) || 0]));

  // WebView2 can fire focus/visibility before its video decoder is ready again.
  // Recheck after layout/decoder wake-up, then recover a frozen frame once.
  [120, 420, 950].forEach((delayMs, index) => {
    const timer = setTimeout(() => {
      if (generation !== motionArtFocusRecoveryGeneration || document.visibilityState === 'hidden' ||
          !currentAnimatedArtInfo || currentAnimatedArtInfo.type !== 'video' ||
          (isBatterySaverActive && settings.motionBatterySaver !== false)) return;
      syncActiveAnimatedVideoState();
      videos.forEach(video => {
        if (!isMotionVideoSurfaceActive(video)) return;
        if (video.paused || video.readyState < 2) {
          startMotionArtVideo(video, getMotionVideoSurfaceSource(video));
          return;
        }
        if (index === 2 && Math.abs((Number(video.currentTime) || 0) - (baselineTimes.get(video) || 0)) < 0.04) {
          scheduleMotionVideoRecovery(video, { delayMs: 0, reload: true, fallbackToSquare: false, replacePending: true });
        }
      });
    }, delayMs);
    motionArtFocusRecoveryTimers.push(timer);
  });
}

currentAnimatedFetchToken = 0;

async function updateAnimatedAlbumArt(track, staticArtUrl) {
  // Invalidate older provider requests immediately, including when this track
  // resolves from cache or has no motion-art result.
  let fetchToken = ++currentAnimatedFetchToken;
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
      // Migrate stale negative entries instead of treating temporary provider
      // failures as permanent no-art results.
      delete animatedArtCache[cacheKey];
    } else if (cached?.type === 'video' && cached.motionSourceVersion !== 1) {
      // Old UI cache entries retained only the square URL, which prevented
      // the tall stream from being discovered for split and wallpaper views.
      delete animatedArtCache[cacheKey];
    } else {
      setAnimatedAlbumArt(cached, staticArtUrl);
      return;
    }
  }

  // Switch to this track's static cover immediately while Apple Motion Art is
  // resolving. Never leave the previous track's moving artwork on screen.
  setAnimatedAlbumArt(null, staticArtUrl);
  fetchToken = currentAnimatedFetchToken;

  // Apple Music Motion Artwork (Official MP4 / HLS high-definition loop)
  // Highly reliable, works with ANY music player (Windows SMTC, Apple Music, Spotify, YouTube Music, local files)
  try {
    let motionArt = null;
    const albumName = track.album?.name || (typeof track.album === 'string' ? track.album : '');
    if (window.AppleMotionArt && typeof window.AppleMotionArt.fetchAppleMotionArt === 'function') {
      motionArt = await window.AppleMotionArt.fetchAppleMotionArt(artistName, trackName, albumName);
    } else if (window.electronAPI && typeof window.electronAPI.fetchAppleMotionArt === 'function') {
      motionArt = await window.electronAPI.fetchAppleMotionArt(artistName, trackName, albumName);
    }
    if (fetchToken !== currentAnimatedFetchToken) return;
    if (motionArt && motionArt.url) {
      console.info(`[AppleMotion] Active for "${artistName} - ${trackName}":`, motionArt.url);
      const item = {
        type: 'video',
        url: motionArt.url,
        tallUrl: motionArt.tall_url || motionArt.tallUrl || motionArt.url,
        motionSourceVersion: 1,
        source: 'apple-motion',
        aspectRatio: motionArt.aspect_ratio || motionArt.aspectRatio || 'square',
        album: motionArt.album,
        artist: motionArt.artist
      };
      saveAnimatedArtCache(cacheKey, item);
      setAnimatedAlbumArt(item, staticArtUrl);
      return;
    }
  } catch (e) {
    console.warn("[AppleMotion] Fetch error:", e);
  }

  // Fallback to static cover (Giphy GIF search removed — returns inaccurate/unrelated results)
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
  // Wallpaper Style (cinematic or Apple Music split-view style2)
  if (!settings.wallpaperStyle) {
    settings.wallpaperStyle = 'style2';
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
        customBgVideo.preload = 'none';
        syncCustomBackgroundVideoPlayback();
      }
    } else {
      if (customBgVideo) {
        customBgVideo.style.display = "none";
        customBgVideo.pause();
        customBgVideo.preload = 'none';
        customBgVideo.removeAttribute('src');
        customBgVideo.load();
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
      customBgVideo.preload = 'none';
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
    if (labelCustomArtGifFilename) labelCustomArtGifFilename.textContent = "Automatic Motion Artwork";
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

  const currentWallStyle = settings.wallpaperStyle || 'style2';
  settings.wallpaperStyle = currentWallStyle;
  hasCustomBackground = isCustomBackgroundActive();

  if (settings.wallpaperMode && config) {
    if (screenLyrics) screenLyrics.style.display = "flex";
    if (screenLogin) screenLogin.style.display = "none";
  }

  const isWallCinematic = Boolean(settings.wallpaperMode && currentWallStyle === 'cinematic');
  const isWallSplit = Boolean(settings.wallpaperMode && currentWallStyle === 'style2');

  document.body.classList.toggle("wallpaper-mode", settings.wallpaperMode === true);
  document.body.classList.remove("wallpaper-style-1", "wallpaper-style-3");
  document.body.classList.toggle("wallpaper-style-cinematic", isWallCinematic);
  document.body.classList.toggle("wallpaper-style-2", isWallSplit);
  document.body.classList.toggle("custom-bg-active", hasCustomBackground);

  try {
  if (isWallCinematic) {
    if (!cinematicMainRendererInstance) {
      initCinematicMainStage();
    } else {
      cinematicMainRendererInstance.setDimensions(window.innerWidth, window.innerHeight);
    }
    syncCinematicState();
    if (isPlaying && cinematicMainRendererInstance) {
      cinematicMainRendererInstance.play();
    }
    if (fluidMeshGradientInstance) {
      fluidMeshGradientInstance.stop();
    }
  } else if (settings.wallpaperMode) {
    if (cinematicMainRendererInstance) {
      cinematicMainRendererInstance.pause();
    }
    if (fluidMeshGradientInstance && shouldRunFluidMesh()) {
      fluidMeshGradientInstance.wake?.();
      fluidMeshGradientInstance.defrost?.();
      if (isPlaying || !fluidMeshGradientInstance.isSettled?.()) {
        fluidMeshGradientInstance.start();
      }
      if (window.currentDynamicPalette) {
        fluidMeshGradientInstance.setPalette(window.currentDynamicPalette);
      }
    }
    if (settings.wallpaperStyle === 'style2' && typeof measureLyricMetrics === 'function') {
      measureLyricMetrics();
      const curIdx = (typeof getCurrentActiveLyricIndex === 'function') ? getCurrentActiveLyricIndex() : activeLineIndex;
      if (curIdx >= 0 && typeof scrollLyrics === 'function') {
        activeLineIndex = -1;
        scrollLyrics(curIdx);
      }
    }
  }
  } catch (err) {
    console.warn('[Wallpaper] Error configuring wallpaper visuals:', err);
  }

  if (selectWallpaperStyle) {
    selectWallpaperStyle.value = currentWallStyle;
  }
  const isCinematicActive = (settings.cinematicMode !== false) && !settings.wallpaperMode && !settings.taskbarMode && !isDynamicIslandMode;
  if (appContainer) {
    appContainer.classList.toggle("wallpaper-mode", settings.wallpaperMode === true);
    appContainer.classList.toggle("custom-bg-active", hasCustomBackground);
    appContainer.classList.toggle("cinematic-view-active", isCinematicActive);
  }
  document.body.classList.toggle("cinematic-view-active", isCinematicActive);

  // Apple Music Studio Split-View Layout Sync (Option A)
  const isSplitLayout = (settings.layoutSplit !== false);
  document.body.classList.toggle('layout-split', isSplitLayout);
  if (appContainer) appContainer.classList.toggle('layout-split', isSplitLayout);
  syncSplitNoLyricsFocus();
  syncSplitTallArtworkAvailability();
  const btnLayoutSplit = document.getElementById("btn-layout-split");
  if (btnLayoutSplit) {
    btnLayoutSplit.classList.toggle("active", isSplitLayout);
    btnLayoutSplit.setAttribute("title", isSplitLayout ? "Switch to Centered Layout (Ctrl+Alt+S)" : "Switch to Split-View Layout (Ctrl+Alt+S)");
  }
  if (typeof updateStudioSidebar === 'function') {
    updateStudioSidebar(currentPlayingTrackObj, currentStaticAlbumArtUrl);
  }

  // Dynamic Island Liquid Glass Material Sync
  document.body.classList.toggle('island-glass-mode', Boolean(settings.islandGlassMode));
  const checkIslandGlass = document.getElementById("check-island-glass-mode");
  if (checkIslandGlass) checkIslandGlass.checked = Boolean(settings.islandGlassMode);

  // Overlay Sliders UI (Style 3 removed)
  const showOverlaySettings = false;
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
  if (appContainer) {
    const pearlCustomBackground = currentTheme === 'light' && hasCustomBackground && !settings.wallpaperMode;
    if (pearlCustomBackground) {
      // The Pearl Light surface must not paint a white veil over user media.
      appContainer.style.setProperty('background', 'transparent', 'important');
      appContainer.style.setProperty('backdrop-filter', 'blur(28px) saturate(1.2)', 'important');
      appContainer.style.setProperty('-webkit-backdrop-filter', 'blur(28px) saturate(1.2)', 'important');
    } else {
      appContainer.style.removeProperty('background');
      appContainer.style.removeProperty('backdrop-filter');
      appContainer.style.removeProperty('-webkit-backdrop-filter');
    }
  }
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

  // Dynamic Island Visualizer Bars, Style & Dock Position
  setVisualizerBarCount(settings.islandVisualizerBars || 4);
  applyIslandVisualizerStyle(settings.islandVisualizerStyle || 'bars');
  applyDynamicIslandDockClass(settings.dynamicIslandPosition);
  const selectIslandStyleInit = document.getElementById("select-island-visualizer-style");
  if (selectIslandStyleInit) {
    selectIslandStyleInit.value = settings.islandVisualizerStyle || 'bars';
  }
  const checkIslandCountdownInit = document.getElementById("check-island-vocal-countdown");
  if (checkIslandCountdownInit) {
    checkIslandCountdownInit.checked = settings.islandVocalCountdown !== false;
  }
  const checkIslandWheelInit = document.getElementById("check-island-wheel-gestures");
  if (checkIslandWheelInit) {
    checkIslandWheelInit.checked = settings.islandWheelGestures !== false;
  }
  const selectIslandTransInit = document.getElementById("select-island-translation");
  if (selectIslandTransInit) {
    selectIslandTransInit.value = settings.islandTranslationMode || 'bilingual';
  }
  const checkIslandSatInit = document.getElementById("check-island-satellite");
  if (checkIslandSatInit) {
    checkIslandSatInit.checked = settings.islandSatelliteEnabled !== false;
  }
  const checkIslandMetaInit = document.getElementById("check-island-metamorphosis");
  if (checkIslandMetaInit) {
    checkIslandMetaInit.checked = settings.islandMetamorphosis !== false;
  }
  const checkIslandDuetInit = document.getElementById("check-island-duet-split");
  if (checkIslandDuetInit) {
    checkIslandDuetInit.checked = settings.islandDuetSplit !== false;
  }
  const checkIslandBloomInit = document.getElementById("check-island-beat-bloom");
  if (checkIslandBloomInit) {
    checkIslandBloomInit.checked = settings.islandBeatBloom !== false;
  }
  const selectIslandInactivityInit = document.getElementById("select-island-inactivity-timeout");
  if (selectIslandInactivityInit) {
    selectIslandInactivityInit.value = String(settings.islandInactivityTimeout ?? 30000);
  }
  const checkProgressBarSeekInit = document.getElementById("check-progress-bar-seek");
  if (checkProgressBarSeekInit) {
    checkProgressBarSeekInit.checked = settings.progressBarSeek !== false;
  }
  const checkProgressWheelSeekInit = document.getElementById("check-progress-wheel-seek");
  if (checkProgressWheelSeekInit) {
    checkProgressWheelSeekInit.checked = settings.progressWheelSeek !== false;
  }

  // Font Size
  document.documentElement.style.setProperty('--font-size', `${settings.fontSize}px`);
  if (selectFontSize) selectFontSize.value = settings.fontSize;
  const sliderFontSize = document.getElementById("slider-font-size");
  const valFontSizeEl = document.getElementById("val-font-size");
  if (sliderFontSize && settings.fontSize) {
    sliderFontSize.value = settings.fontSize;
    if (valFontSizeEl) valFontSizeEl.textContent = `${settings.fontSize}px`;
  }

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

  // Ambient background style (Apple Music Fluid WebGL vs Glowing Orbs vs Minimal)
  const currentBgStyle = settings.bgStyle || 'fluid';
  document.body.classList.toggle("bg-style-fluid", currentBgStyle === 'fluid');
  document.body.classList.toggle("bg-style-ambient", currentBgStyle === 'ambient');
  document.body.classList.toggle("bg-style-minimal", currentBgStyle === 'minimal');

  if (selectBgStyle) selectBgStyle.value = currentBgStyle;
  if (settingFluidSpeedRow) {
    settingFluidSpeedRow.style.display = (currentBgStyle === 'fluid') ? 'flex' : 'none';
  }

  const fluidSpeedVal = settings.fluidSpeed !== undefined ? settings.fluidSpeed : 1.0;
  if (sliderFluidSpeed) sliderFluidSpeed.value = Math.round(fluidSpeedVal * 100);
  if (valFluidSpeed) valFluidSpeed.textContent = `${fluidSpeedVal.toFixed(1)}x`;

  if (fluidMeshGradientInstance) {
    if (shouldRunFluidMesh()) {
      fluidMeshGradientInstance.wake?.();
      fluidMeshGradientInstance.defrost?.();
      fluidMeshGradientInstance.setPlaybackState(
        isPlaying,
        window._currentBpmProfile || 'normal',
        fluidSpeedVal
      );
      fluidMeshGradientInstance.setIntensity(glowVal / 100);
      if (window.currentDynamicPalette) {
        fluidMeshGradientInstance.setPalette(window.currentDynamicPalette);
      }
      if (isPlaying || !fluidMeshGradientInstance.isSettled?.()) {
        fluidMeshGradientInstance.start();
      }
    } else {
      fluidMeshGradientInstance.stop();
    }
  }

  // Font Family
  const resolvedFont = resolveFontStack(settings.fontFamily);
  document.documentElement.style.setProperty('--font-family', resolvedFont);
  if (selectFont) selectFont.value = settings.fontFamily;

  // Invalidate lyric metrics if typography signature changed
  const currentTypographySig = `${settings.fontFamily}_${settings.fontSize}_${settings.lineSpacing}_${settings.textAlign}`;
  if (window._lastAppliedTypography && window._lastAppliedTypography !== currentTypographySig) {
    if (typeof invalidateLyricMetrics === 'function') {
      invalidateLyricMetrics(true);
    }
  }
  window._lastAppliedTypography = currentTypographySig;

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
    const isLight = settings.theme === 'light' || document.documentElement.getAttribute('data-theme') === 'light';
    colorVal = isLight ? '#1d1d1f' : '#ffffff';
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
    if (settings.wallpaperMode || settings.taskbarMode || isDynamicIslandMode) {
      playbackWidget.style.display = 'none';
    } else if (settings.showWidget) {
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
  if (selectWallpaperStyle) selectWallpaperStyle.value = settings.wallpaperStyle || 'style2';
  const selWpMon = document.getElementById("select-wallpaper-monitor");
  if (selWpMon) selWpMon.value = settings.wallpaperMonitor || '0';
  const chkWpBeatBloom = document.getElementById("check-wallpaper-beat-bloom");
  if (chkWpBeatBloom) chkWpBeatBloom.checked = settings.wallpaperBeatBloom !== false;
  if (checkFilterCredits) checkFilterCredits.checked = settings.filterSongCredits !== false;

  // Window Toggles (sync UI states)


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

  if (selectTaskbarStyle) selectTaskbarStyle.value = settings.taskbarStyle || 'minimal';
  if (selectTbAlign) selectTbAlign.value = settings.taskbarAlign;
  if (sliderTbOffset) {
    sliderTbOffset.value = settings.taskbarOffset;
    if (valTbOffset) valTbOffset.textContent = `${settings.taskbarOffset}px`;
  }

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

  // Sync Liquid Glass Segmented Bars with current target values
  document.querySelectorAll('.liquid-glass-bar[data-target]').forEach(bar => {
    const targetId = bar.dataset.target;
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;
    const currentVal = String(targetEl.value);
    bar.querySelectorAll('.liquid-bar-segment').forEach(seg => {
      seg.classList.toggle('active', seg.dataset.val === currentVal);
    });
  });

  updateAutoHideState();
  updateModeButtonsState();
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

function getCanonicalTrackKey(track) {
  if (!track) return null;
  const title = (track.name || track.title || '').trim().toLowerCase();
  const artist = (track.artists?.[0]?.name || track.artist || '').trim().toLowerCase();
  return (title && artist) ? `canon_${artist}_${title}` : null;
}

function normalizeTrackId(id) {
  if (!id) return '';
  return String(id).replace(/^spotify:track:/, '').trim();
}

function isSameTrack(t1, t2) {
  if (!t1 || !t2) return false;
  const id1 = normalizeTrackId(t1.id || t1.uri);
  const id2 = normalizeTrackId(t2.id || t2.uri);
  if (id1 && id2 && !id1.startsWith('local_') && !id2.startsWith('local_') && id1 === id2) {
    return true;
  }
  const title1 = (t1.name || t1.title || '').trim().toLowerCase();
  const title2 = (t2.name || t2.title || '').trim().toLowerCase();
  if (!title1 || !title2) return false;

  const artist1 = (t1.artists?.[0]?.name || t1.artist || '').trim().toLowerCase();
  const artist2 = (t2.artists?.[0]?.name || t2.artist || '').trim().toLowerCase();

  const titleMatch = title1 === title2 || title1.includes(title2) || title2.includes(title1);
  const artistMatch = !artist1 || !artist2 || artist1 === artist2 || artist1.includes(artist2) || artist2.includes(artist1);

  return titleMatch && artistMatch;
}

function snapshotPlaybackTrack(track) {
  if (!track) return null;
  return {
    id: track.id || track.uri || '',
    name: track.name || track.title || '',
    title: track.title || track.name || '',
    artist: track.artist || '',
    artists: Array.isArray(track.artists)
      ? track.artists.map(artist => typeof artist === 'string' ? artist : { name: artist?.name || '' })
      : []
  };
}

function isPlaybackTrackSwitch(track, currentId, currentObj) {
  return Boolean(track && track.id !== currentId && !(currentObj && isSameTrack(track, currentObj)));
}

function shouldUseLocalPlaybackOnTrackMismatch(localTrack, spotifyTrack, trackAtRequestStart, sourceAtRequestStart) {
  if (!localTrack || !spotifyTrack || !trackAtRequestStart) return true;
  const localStillAtRequestTrack = isSameTrack(localTrack, trackAtRequestStart);
  const spotifyStillAtRequestTrack = isSameTrack(spotifyTrack, trackAtRequestStart);

  // The local sample was captured before the network request completed. If it
  // still describes the track that was already active when that request began,
  // it is stale when Spotify has since advanced to a different song.
  if (localStillAtRequestTrack && !spotifyStillAtRequestTrack) {
    // The UI may have reached the request-start track through SMTC before
    // Spotify's response arrived. Keep that live source when the cloud sample
    // disagrees; when Spotify was the active source, accept its track advance.
    return sourceAtRequestStart !== 'spotify-web-api';
  }

  // If SMTC moved during the request, its fresh post-response sample wins over
  // a Spotify response that still describes the request-start track.
  if (!localStillAtRequestTrack && spotifyStillAtRequestTrack) return true;

  // When both sources moved while the request was in flight, prefer the later
  // local sample fetched after the response; otherwise retain local playback.
  return true;
}

function isStaleSpotifyPlaybackResponse(trackAtRequestStart, responseTrack, activeTrack) {
  return Boolean(trackAtRequestStart && responseTrack && activeTrack &&
    !isSameTrack(activeTrack, trackAtRequestStart) &&
    isSameTrack(responseTrack, trackAtRequestStart));
}

function getTrackArtistText(track, fallback = '') {
  if (Array.isArray(track?.artists)) {
    const names = track.artists.map(artist => typeof artist === 'string' ? artist : artist?.name).filter(Boolean);
    if (names.length) return names.join(', ');
  }
  return (typeof track?.artist === 'string' && track.artist.trim()) || fallback;
}

function syncWallpaperTrackMetadata(track = currentPlayingTrackObj || currentTrack) {
  if (!wallpaperTrackTitle || !wallpaperTrackArtist) return;
  const title = (track?.name || track?.title || '').trim();
  const artist = getTrackArtistText(track, title ? 'Unknown Artist' : '');
  if (wallpaperTrackTitle.textContent !== (title || 'Not Playing')) {
    wallpaperTrackTitle.textContent = title || 'Not Playing';
  }
  if (wallpaperTrackArtist.textContent !== artist) {
    wallpaperTrackArtist.textContent = artist;
  }
  if (settings?.wallpaperMode) {
    const artUrl = (track?.album?.images && (track.album.images[1]?.url || track.album.images[0]?.url)) || currentStaticAlbumArtUrl || null;
    setWallpaperAlbumArt(artUrl);
  }
}

function clearWallpaperModePresentation() {
  document.body.classList.remove(
    'wallpaper-mode', 'wallpaper-style-1', 'wallpaper-style-2', 'wallpaper-style-3',
    'wallpaper-style-cinematic', 'custom-bg-active', 'has-beat-bloom'
  );
  if (wallpaperAlbumBg) {
    wallpaperAlbumBg.classList.remove('has-preblurred-art');
    wallpaperAlbumBg.style.filter = '';
  }
  if (appContainer) appContainer.classList.remove('wallpaper-mode', 'custom-bg-active');
}

function handleLocalOrPollPause(reportedPos) {
  const wasPlaying = isPlaying;
  const isRecentSeek = (Date.now() - lastUserSeekTimestamp) < 2500;
  if (isRecentSeek && typeof reportedPos === 'number' && reportedPos >= 0 && Math.abs(reportedPos - lastUserSeekTargetMs) > 800) {
    reportedPos = lastUserSeekTargetMs;
  }
  const isPosChanged = typeof reportedPos === 'number' && reportedPos >= 0 && Math.abs(currentProgress - reportedPos) > 150;
  if (wasPlaying) {
    if (typeof reportedPos === 'number' && reportedPos >= 0) {
      currentProgress = reportedPos;
    }
    lastPollProgress = currentProgress;
    lastPollTimestamp = getHighResTime();
    isPlaying = false;
    updateMemoryTargetLevel('low');
    syncFluidMeshPlaybackState();
    if (window.djEngine) {
      window.djEngine.cancelTransition();
    }
    window._pllRateMultiplier = 1.0;
    window._pllFilteredDrift = 0;
  } else if (isPosChanged) {
    currentProgress = reportedPos;
    lastPollProgress = reportedPos;
    lastPollTimestamp = getHighResTime();
    requestAnimationFrame(updatePlayhead);
    return;
  } else {
    // Already paused and position has not jumped: skip redundant tracking loops and RAF cascades
    return;
  }
  requestAnimationFrame(updatePlayhead);
  if (cinematicMainRendererInstance) {
    const trackObj = (typeof currentPlayingTrackObj !== 'undefined' && currentPlayingTrackObj) ? currentPlayingTrackObj : null;
    const artistName = (trackObj && trackObj.artists && trackObj.artists[0]?.name)
      || (trackObj && trackObj.artist)
      || (widgetArtistName && widgetArtistName.textContent ? widgetArtistName.textContent.trim() : '');
    const trackName = (trackObj && trackObj.name)
      || (trackObj && trackObj.title)
      || (widgetTrackName && widgetTrackName.textContent ? widgetTrackName.textContent.trim() : '');
    if (typeof cinematicMainRendererInstance.setPausedState === 'function') {
      cinematicMainRendererInstance.setPausedState(true, { title: trackName, artist: artistName });
    }
    cinematicMainRendererInstance.pause();
    cinematicMainRendererInstance.seek(getAcousticSyncProgress());
  }
  if (btnPlaySvg) btnPlaySvg.style.display = 'block';
  if (btnPauseSvg) btnPauseSvg.style.display = 'none';
  // Keep the current decoded artwork frame visible, but stop its decoder loop.
  handleTaskbarPauseAutoHide(true);
  updateAutoHideState();
  document.body.classList.toggle('is-playing', false);
  document.body.classList.toggle('app-paused', true);
  pauseAnimatedArtVideosForPlaybackStop();
  syncDynamicIslandState();
  if (isDynamicIslandMode) {
    startDynamicIslandBoundsTracking(450);
  }
  if (typeof checkVisualizerFallback === 'function') {
    checkVisualizerFallback();
  }
}

function getEffectiveTrackDuration() {
  if (typeof trackDuration === 'number' && trackDuration > 0) return trackDuration;
  if (typeof currentPlayingTrackObj === 'object' && currentPlayingTrackObj !== null) {
    if (typeof currentPlayingTrackObj.duration_ms === 'number' && currentPlayingTrackObj.duration_ms > 0) {
      return currentPlayingTrackObj.duration_ms;
    }
    if (typeof currentPlayingTrackObj.duration === 'number' && currentPlayingTrackObj.duration > 0) {
      return currentPlayingTrackObj.duration > 10000 ? currentPlayingTrackObj.duration : currentPlayingTrackObj.duration * 1000;
    }
  }
  if (Array.isArray(lyrics) && lyrics.length > 0) {
    const lastLine = lyrics[lyrics.length - 1];
    const lastTime = lastLine?.endMs || lastLine?.endTimeMs || (lastLine?.timeMs ? lastLine.timeMs + 5000 : 0);
    if (typeof lastTime === 'number' && lastTime > 0) return lastTime;
  }
  return 0;
}

function seekPlayback(targetMs) {
  if (trackDuration <= 0) {
    const dur = getEffectiveTrackDuration();
    if (dur > 0) {
      trackDuration = dur;
    } else {
      return;
    }
  }
  const seekMs = Math.max(0, Math.min(trackDuration, Math.round(targetMs)));
  const now = Date.now();
  lastUserSeekTimestamp = now;
  lastUserSeekTargetMs = seekMs;
  currentProgress = seekMs;
  lastPollProgress = seekMs;
  lastPollTimestamp = getHighResTime();
  if (window.djEngine) {
    window.djEngine.cancelTransition();
  }

  // Optimistic Instant UI Feedback: immediately update progress bar and time labels
  if (trackDuration > 0) {
    const pct = (seekMs / trackDuration) * 100;
    setMainProgressFill(pct);
    window._lastFillPercent = pct;
    if (!window._cachedMainThumb) {
      window._cachedMainThumb = document.getElementById("main-progress-thumb");
    }
    if (window._cachedMainThumb) {
      window._cachedMainThumb.style.left = `${pct}%`;
    }

    if (!islandProgressFillEl) islandProgressFillEl = document.getElementById("island-progress-fill");
    if (!islandProgressThumbEl) islandProgressThumbEl = document.getElementById("island-progress-thumb");
    if (!islandTimeCurrentEl) islandTimeCurrentEl = document.getElementById("island-time-current");
    if (!islandTimeRemainingEl) islandTimeRemainingEl = document.getElementById("island-time-remaining");

    const pctStr = pct.toFixed(1) + '%';
    if (islandProgressFillEl) {
      islandProgressFillEl.style.width = pctStr;
      islandProgressFillEl._lastWidth = pctStr;
    }
    if (islandProgressThumbEl) {
      islandProgressThumbEl.style.left = pctStr;
      islandProgressThumbEl._lastLeft = pctStr;
    }
    if (islandTimeCurrentEl) {
      islandTimeCurrentEl.textContent = formatTime(seekMs);
    }
    if (islandTimeRemainingEl) {
      islandTimeRemainingEl.textContent = '-' + formatTime(Math.max(0, trackDuration - seekMs));
    }
    setIslandProgress(seekMs, trackDuration);
  }
  if (widgetTimeCurrent) {
    widgetTimeCurrent.textContent = formatTime(seekMs);
  }
  if (widgetTimeDuration && trackDuration > 0) {
    widgetTimeDuration.textContent = window._showRemainingTime
      ? `-${formatTime(Math.max(0, trackDuration - seekMs))}`
      : formatTime(trackDuration);
  }

  // Spotify Soloist sub-millisecond local transport control
  if (window.soloistProvider && window.soloistProvider.isConnected && window.soloistProvider.isSessionActive) {
    window.soloistProvider.seek(seekMs);
  }

  // Native Local / Windows SMTC Playback Control
  if (window.electronAPI && window.electronAPI.triggerLocalPlaybackControl) {
    window.electronAPI.triggerLocalPlaybackControl("seek", seekMs);
  }

  // Spotify Web API Control: always trigger when token is available to control Spotify desktop / web reliably
  if (config && config.access_token) {
    fetch('https://api.spotify.com/v1/me/player/seek?position_ms=' + seekMs, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + config.access_token }
    }).then(async (res) => {
      if (res.status === 401 && config.refresh_token && window.electronAPI && window.electronAPI.refreshToken) {
        try {
          const newToken = await window.electronAPI.refreshToken();
          if (newToken) {
            config.access_token = newToken;
            fetch('https://api.spotify.com/v1/me/player/seek?position_ms=' + seekMs, {
              method: 'PUT',
              headers: { 'Authorization': 'Bearer ' + newToken }
            }).catch(() => {});
          }
        } catch (_) {}
      }
    }).catch(err => console.warn("Seek error:", err));
  }
}

function adjustSyncOffset(deltaMs) {
  if (!deltaMs || isNaN(deltaMs)) return;
  settings.syncOffsetMs = (settings.syncOffsetMs || 0) + deltaMs;
  if (!settings.trackOffsets) settings.trackOffsets = {};
  if (currentTrackId) {
    settings.trackOffsets[currentTrackId] = settings.syncOffsetMs;
  }
  const canonKey = getCanonicalTrackKey(currentPlayingTrackObj);
  if (canonKey) {
    settings.trackOffsets[canonKey] = settings.syncOffsetMs;
  }
  if (inputSyncOffset) {
    inputSyncOffset.value = settings.syncOffsetMs;
  }
  saveLocalSettings();

  const sign = settings.syncOffsetMs > 0 ? '+' : '';
  const msg = `Offset: ${sign}${settings.syncOffsetMs}ms`;
  if (typeof isDynamicIslandMode !== 'undefined' && isDynamicIslandMode && typeof showIslandHud === 'function') {
    showIslandHud({ icon: "⏱", text: msg, showBar: false });
  } else if (typeof showToast === 'function') {
    showToast(msg, 1500);
  }
}

// Setup Event Handlers
function setupUIHandlers() {
  if (!window._edgeGlowForcedOff && window.electronAPI?.setEdgeGlow) {
    window._edgeGlowForcedOff = true;
    window.electronAPI.setEdgeGlow(false, '#1DB954');
  }

  const obPage1 = document.getElementById('ob-page-1');
  const obPage2 = document.getElementById('ob-page-2');
  const obPage3 = document.getElementById('ob-page-3');
  const obPage4 = document.getElementById('ob-page-4');
  const obCardWallpaper = document.getElementById('ob-card-wallpaper');
  const obCardTaskbar = document.getElementById('ob-card-taskbar');
  const obCardStandard = document.getElementById('ob-card-standard');
  const obCardIsland = document.getElementById('ob-card-island');
  
  const btnNext1 = document.getElementById('btn-next-onboarding-1');
  const btnNext2 = document.getElementById('btn-next-onboarding-2');
  const btnNext3 = document.getElementById('btn-next-onboarding-3');
  const btnBack2 = document.getElementById('btn-back-onboarding-2');
  const btnBack3 = document.getElementById('btn-back-onboarding-3');
  const btnBack4 = document.getElementById('btn-back-onboarding-4');
  const btnFinishFinal = document.getElementById('btn-finish-onboarding-final');
  const btnSkipOnboarding = document.getElementById('btn-skip-onboarding');

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
  const obBadgeIsland = document.getElementById('ob-badge-island');
  const obWallpaperMonitorSection = document.getElementById('ob-wallpaper-monitor-section');

  if (obPage1 && obPage2 && obPage3 && obPage4) {
    let pickedMode = settings.dynamicIslandMode ? 'island' : (settings.taskbarMode ? 'taskbar' : (settings.wallpaperMode ? 'wallpaper' : 'standard'));
    let activeOnboardingPreview = null;

    function stopOnboardingModePreview() {
      if (!activeOnboardingPreview) return;
      const video = activeOnboardingPreview;
      activeOnboardingPreview = null;
      video.onplaying = null;
      video.onended = null;
      video.onerror = null;
      video.pause();
      try { video.currentTime = 0; } catch (_) {}
      video.closest('.onboarding-mode-preview-frame')?.classList.remove('is-playing');
      video.removeAttribute('src');
      video.load();
    }

    function playOnboardingModePreview(mode) {
      stopOnboardingModePreview();
      const card = document.querySelector(`#ob-card-${mode}`);
      const video = card?.querySelector('.onboarding-mode-preview-video');
      const previewSrc = video?.dataset.previewSrc;
      if (!video || !previewSrc || document.visibilityState === 'hidden') return;

      activeOnboardingPreview = video;
      video.onplaying = () => video.closest('.onboarding-mode-preview-frame')?.classList.add('is-playing');
      video.onended = stopOnboardingModePreview;
      video.onerror = stopOnboardingModePreview;
      video.src = previewSrc;
      video.load();
      const playRequest = video.play();
      if (playRequest && typeof playRequest.catch === 'function') {
        playRequest.catch(() => {
          if (activeOnboardingPreview === video) stopOnboardingModePreview();
        });
      }
    }

    if (!window._onboardingModePreviewVisibilityBound) {
      window._onboardingModePreviewVisibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') stopOnboardingModePreview();
      });
    }

    const updateModeSelection = (mode, selectedElem) => {
      [obCardWallpaper, obCardTaskbar, obCardStandard, obCardIsland].forEach(el => {
        if (el) {
          el.classList.remove('selected');
          el.style.borderColor = 'rgba(255,255,255,0.1)';
          el.setAttribute('aria-pressed', String(el === selectedElem));
        }
      });
      [obBadgeStandard, obBadgeTaskbar, obBadgeWallpaper, obBadgeIsland].forEach(b => {
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
      else if (mode === 'island') activeBadge = obBadgeIsland;

      if (activeBadge) {
        activeBadge.textContent = 'Selected';
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

    const bindModeCard = (element, mode) => {
      if (!element) return;
      const selectMode = () => {
        updateModeSelection(mode, element);
        playOnboardingModePreview(mode);
      };
      element.addEventListener('click', selectMode);
      element.addEventListener('keydown', (event) => {
        if (event.target !== element || event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        selectMode();
      });
    };
    bindModeCard(obCardStandard, 'standard');
    bindModeCard(obCardTaskbar, 'taskbar');
    bindModeCard(obCardWallpaper, 'wallpaper');
    bindModeCard(obCardIsland, 'island');

    const initialModeCard = {
      standard: obCardStandard,
      taskbar: obCardTaskbar,
      wallpaper: obCardWallpaper,
      island: obCardIsland
    }[pickedMode];
    updateModeSelection(pickedMode, initialModeCard);

    // Page 1 -> Page 2
    if (btnNext1) {
      btnNext1.addEventListener('click', () => {
        stopOnboardingModePreview();
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
            if (res && (res.sp_dc || res.access_token || res.success)) {
              obBtnLoginSpotify.textContent = "✓ Connected!";
              obBtnLoginSpotify.style.background = "#1DB954";
              config = res;
              config.localMode = false;
              if (res.sp_dc && !res.access_token) {
                try {
                  const token = await window.electronAPI.getAccessToken(res.sp_dc);
                  if (token) config.access_token = token;
                } catch(e) {}
              }
              if (window.electronAPI.saveConfig) {
                await window.electronAPI.saveConfig(config);
              }
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
      stopOnboardingModePreview();
      if (!config) config = { localMode: true };
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
      localStorage.removeItem("lyricflow_onboarding_started");
      saveLocalSettings();
      if (window.electronAPI?.saveConfig) {
        try { await window.electronAPI.saveConfig(config); } catch (_) {}
      }
      
      const screenOnboarding = document.getElementById('screen-onboarding');
      if (screenOnboarding) {
        screenOnboarding.classList.remove("active");
        screenOnboarding.style.display = "none";
      }
      
      applyVisualSettings();
      showLyricsScreen();
      if (pickedMode === 'island') {
        await toggleDynamicIslandMode(true);
      }
    };

    if (btnFinishFinal) {
      btnFinishFinal.addEventListener('click', finalizeSetup);
    }
    if (btnSkipOnboarding) {
      btnSkipOnboarding.addEventListener('click', finalizeSetup);
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
        if (authConfig && (authConfig.sp_dc || authConfig.access_token || authConfig.success)) {
          config = authConfig;
          config.localMode = false;
          
          if (!config.access_token && config.sp_dc) {
            if (authStatus) authStatus.textContent = "Getting access token...";
            try {
              const token = await window.electronAPI.getAccessToken(config.sp_dc);
              if (token) config.access_token = token;
            } catch (e) {}
          }
          if (window.electronAPI.saveConfig) {
            await window.electronAPI.saveConfig(config);
          }

          if (authStatus) {
            authStatus.textContent = "Successfully connected!";
            authStatus.className = "status-msg success";
          }
          window._spotifyUserDisplayName = null;
          updateSpotifyUI();
          checkAndVerifySpotifyConnection().then(() => updateSpotifyUI());
          setTimeout(() => {
            if (!settings.hasCompletedSetup && !localStorage.getItem("lyricflow_setup_done")) {
              showOnboardingWizard();
            } else {
              showLyricsScreen();
            }
          }, 1000);
        } else {
          if (authStatus) {
            authStatus.textContent = "Login window was closed or cancelled.";
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
        let token = null;
        try {
          token = await window.electronAPI.getAccessToken(spDcVal);
        } catch (e) {}

        config = {
          sp_dc: spDcVal,
          access_token: token || "",
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
            const trackObj = currentPlayingTrackObj || currentTrack;
            const title = (trackObj && (trackObj.name || trackObj.title)) || currentTitle || widgetTrackName?.textContent || '';
            const artist = (trackObj && trackObj.artists && Array.isArray(trackObj.artists) && trackObj.artists.length > 0)
              ? trackObj.artists.map(a => a.name).filter(Boolean).join(", ")
              : ((trackObj && trackObj.artist) || widgetArtistName?.textContent || '');
            if (title) {
              fetchLyrics(currentTrackId, title, artist, trackDuration);
            }
        }

        showToast("Spotify SP_DC Cookie Saved!", 2500, 'success');
      }
    });
  }





  const selectTranslate = document.getElementById("select-translate");
  if (selectTranslate) {
    selectTranslate.value = settings.translateLang || "en";
    selectTranslate.addEventListener("change", (e) => {
      settings.translateLang = e.target.value;
      saveLocalSettings();
      clearLyricsCaches();
      if (currentTrackId && lyrics && lyrics.length > 0) {
        if (settings.translateLang === 'none') {
          lyrics.forEach(l => { delete l.subText; });
          delete lyrics._transLang;
          delete lyrics._hasTranslation;
          delete lyrics._noTransNeeded;
          renderLyrics();
          const islandLine = document.getElementById("island-lyric-line");
          if (islandLine) {
            islandLine.dataset.lineIndex = "";
            islandLine.dataset.transMode = "";
            islandLine.dataset.subText = "";
          }
          if (activeLineIndex >= 0) {
            updateDynamicIslandLyric(activeLineIndex, lyrics[activeLineIndex], currentProgress);
          }
        } else {
          const curCacheKey = `lyrics_cache_v21_${currentTrackId}`;
          if (typeof triggerAutoTranslation === 'function') {
            triggerAutoTranslation(currentTrackId, lyrics, curCacheKey, true);
          }
        }
      }
    });
  }

  // Skip Translation For (language)
  const selectSkipLang = document.getElementById("select-skip-lang");
  if (selectSkipLang) {
    selectSkipLang.value = settings.skipLang || 'none';
    selectSkipLang.addEventListener("change", (e) => {
      settings.skipLang = e.target.value;
      saveLocalSettings();
      clearLyricsCaches();
      if (currentTrackId && lyrics && lyrics.length > 0 && settings.translateLang && settings.translateLang !== 'none') {
        const curCacheKey = `lyrics_cache_v21_${currentTrackId}`;
        if (typeof triggerAutoTranslation === 'function') {
          triggerAutoTranslation(currentTrackId, lyrics, curCacheKey, true);
        }
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

  // Liquid Glass Segmented Bars & Sliders
  function initLiquidGlassBars() {
    const bars = document.querySelectorAll('.liquid-glass-bar[data-target]');
    bars.forEach(bar => {
      const targetId = bar.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      const segments = bar.querySelectorAll('.liquid-bar-segment');
      segments.forEach(seg => {
        seg.addEventListener('click', (e) => {
          e.preventDefault();
          const val = seg.dataset.val;
          if (typeof val === 'undefined') return;
          targetEl.value = val;
          segments.forEach(s => s.classList.toggle('active', s === seg));
          targetEl.dispatchEvent(new Event('change', { bubbles: true }));
          targetEl.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
    });

    // View Mode bar (Cinematic vs Classic)
    const btnModeCinematic = document.getElementById("btn-mode-cinematic");
    const btnModeClassic = document.getElementById("btn-mode-classic");
    if (btnModeCinematic) {
      btnModeCinematic.addEventListener("click", () => {
        toggleCinematicView(true);
      });
    }
    if (btnModeClassic) {
      btnModeClassic.addEventListener("click", () => {
        toggleCinematicView(false);
      });
    }

    // Lyrics Font Size Liquid Slider
    const sliderFontSize = document.getElementById("slider-font-size");
    const valFontSizeEl = document.getElementById("val-font-size");
    if (sliderFontSize) {
      sliderFontSize.value = settings.fontSize || 22;
      if (valFontSizeEl) valFontSizeEl.textContent = `${sliderFontSize.value}px`;
      sliderFontSize.addEventListener("input", (e) => {
        const sizeVal = parseInt(e.target.value, 10);
        settings.fontSize = sizeVal;
        if (valFontSizeEl) {
          valFontSizeEl.textContent = `${sizeVal}px`;
          triggerSliderPulse(valFontSizeEl);
        }
        if (selectFontSize) selectFontSize.value = String(sizeVal);
        applyVisualSettings();
        saveLocalSettings();
        if (typeof invalidateLyricMetrics === 'function') {
          invalidateLyricMetrics(true);
        }
      });
    }
  }

  initLiquidGlassBars();

  // Settings Panel sliders
  if (selectFontSize) {
    selectFontSize.addEventListener("change", (e) => {
      settings.fontSize = parseInt(e.target.value, 10);
      applyVisualSettings();
      saveLocalSettings();
      invalidateLyricMetrics(true);
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
      invalidateLyricMetrics(true);
    });
  }

  // Helper: briefly pulse value label when slider changes
  function triggerSliderPulse(el) {
    if (!el) return;
    el.classList.remove('slider-value-changed');
    void el.offsetWidth; // force reflow
    el.classList.add('slider-value-changed');
  }

  if (sliderBgOpacity) {
    sliderBgOpacity.addEventListener("input", (e) => {
      settings.bgOpacity = parseInt(e.target.value, 10);
      applyVisualSettings();
      if (valBgOpacity) triggerSliderPulse(valBgOpacity);
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

  const appleMotionSearchForm = document.getElementById('apple-motion-search-form');
  const appleMotionSearchInput = document.getElementById('apple-motion-search-input');
  const appleMotionSearchStatus = document.getElementById('apple-motion-search-status');
  const appleMotionSearchResults = document.getElementById('apple-motion-search-results');
  if (appleMotionSearchForm && appleMotionSearchInput && appleMotionSearchStatus && appleMotionSearchResults) {
    appleMotionSearchForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const typedQuery = appleMotionSearchInput.value.trim();
      const currentArtist = currentPlayingTrackObj?.artists?.map((artist) => artist.name).filter(Boolean).join(' ') || '';
      const query = typedQuery || [currentTitle, currentArtist].filter(Boolean).join(' ');
      if (!query) {
        appleMotionSearchStatus.textContent = 'Enter an album or artist to search.';
        appleMotionSearchInput.focus();
        return;
      }

      appleMotionSearchInput.value = query;
      appleMotionSearchResults.replaceChildren();
      appleMotionSearchStatus.textContent = 'Searching Apple Music…';
      const submitButton = appleMotionSearchForm.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;

      try {
        const params = new URLSearchParams({ term: query, entity: 'album', media: 'music', limit: '12', country: 'US' });
        const response = await fetch(`https://itunes.apple.com/search?${params.toString()}`);
        if (!response.ok) throw new Error(`Apple Music search returned ${response.status}`);
        const payload = await response.json();
        const albums = (Array.isArray(payload.results) ? payload.results : [])
          .filter((album) => {
            if (!album.collectionName || !album.artistName || !album.collectionViewUrl) return false;
            const name = String(album.collectionName).toLowerCase();
            const artist = String(album.artistName).toLowerCase();
            const queryLower = query.toLowerCase();
            if (queryLower.includes('dj mix') || queryLower.includes('remix')) return true;
            const isComp = album.collectionType === 'Compilation' || album.isCompilation === true;
            if (isComp && !queryLower.includes('compilation')) return false;
            if (artist.includes('various artists') && !queryLower.includes('various artists')) return false;
            const blacklist = ['dj mix', 'apple music', 'rap life', '[mixed]', '(mixed)', 'megamix', 'continuous mix', 'remix collection'];
            return !blacklist.some((term) => name.includes(term));
          })
          .slice(0, 10);

        if (!albums.length) {
          appleMotionSearchStatus.textContent = 'No matching albums found. Try a shorter title or artist name.';
          return;
        }

        appleMotionSearchStatus.textContent = 'Choose an album to check for motion artwork.';
        albums.forEach((album) => {
          const row = document.createElement('div');
          row.className = 'apple-motion-result';
          const art = document.createElement('img');
          art.alt = '';
          art.loading = 'lazy';
          art.src = String(album.artworkUrl100 || '').replace(/\d+x\d+bb\.(jpg|png)$/i, '300x300bb.$1');
          const copy = document.createElement('div');
          copy.className = 'apple-motion-result-copy';
          const title = document.createElement('strong');
          title.textContent = album.collectionName;
          const artist = document.createElement('small');
          const year = album.releaseDate ? ` · ${String(album.releaseDate).slice(0, 4)}` : '';
          artist.textContent = `${album.artistName}${year}`;
          copy.append(title, artist);
          const openButton = document.createElement('button');
          openButton.type = 'button';
          openButton.className = 'file-picker-btn';
          openButton.textContent = 'Check motion art';
          openButton.addEventListener('click', async () => {
            const albumUrl = album.collectionViewUrl;
            let copied = false;
            try {
              if (window.electronAPI?.copyToClipboard) await window.electronAPI.copyToClipboard(albumUrl);
              else await navigator.clipboard.writeText(albumUrl);
              copied = true;
            } catch (error) { console.warn('[Animated Art] Could not copy album link:', error); }
            try {
              if (window.electronAPI?.openExternal) await window.electronAPI.openExternal('https://applemusic.aritra.ovh/');
            } catch (error) { console.warn('[Animated Art] Could not open the motion-art downloader:', error); }
            appleMotionSearchStatus.textContent = copied
              ? `Copied “${album.collectionName}” link. Paste it into Apple Music Art, download the MP4, then choose it above.`
              : `Paste this Apple Music link into Apple Music Art, download the MP4, then choose it above: ${albumUrl}`;
            showToast(copied ? 'Album link copied. Paste it into the motion-art downloader.' : 'Motion-art downloader opened.', 5000);
          });
          row.append(art, copy, openButton);
          appleMotionSearchResults.append(row);
        });
      } catch (error) {
        console.warn('[Animated Art] Apple Music search failed:', error);
        appleMotionSearchStatus.textContent = 'Apple Music search failed. Check your connection and try again.';
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  if (sliderGlow) {
    sliderGlow.addEventListener("input", (e) => {
      settings.glow = parseInt(e.target.value, 10);
      applyVisualSettings();
      if (valGlow) triggerSliderPulse(valGlow);
      saveLocalSettings();
    });
  }

  if (selectBgStyle) {
    selectBgStyle.addEventListener("change", (e) => {
      settings.bgStyle = e.target.value;
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  if (sliderFluidSpeed) {
    sliderFluidSpeed.addEventListener("input", (e) => {
      settings.fluidSpeed = parseFloat(e.target.value) / 100;
      if (valFluidSpeed) {
        valFluidSpeed.textContent = `${settings.fluidSpeed.toFixed(1)}x`;
        triggerSliderPulse(valFluidSpeed);
      }
      if (fluidMeshGradientInstance) {
        if (shouldRunFluidMesh()) {
          fluidMeshGradientInstance.setPlaybackState(isPlaying, window._currentBpmProfile || 'normal', settings.fluidSpeed);
        } else {
          fluidMeshGradientInstance.stop();
        }
      }
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
      invalidateLyricMetrics(true);
    });
  }

  // Line Spacing slider listener
  if (sliderLineSpacing) {
    sliderLineSpacing.addEventListener("input", (e) => {
      settings.lineSpacing = parseInt(e.target.value, 10);
      applyVisualSettings();
      if (valLineSpacing) triggerSliderPulse(valLineSpacing);
      saveLocalSettings();
      invalidateLyricMetrics(true);
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





  // Removed broken toggleAlwaysOnTop listener

  // Minimize Application button listener
  if (btnMinimize) {
    btnMinimize.addEventListener("click", () => {
      window.electronAPI.minimizeApp();
    });
  }

  // Double-click HUD header to reset window to standard 780x560
  if (hudHeader) {
    hudHeader.addEventListener("dblclick", (e) => {
      if (e.target.closest("button, input, select, .hud-btn")) return;
      if (window.electronAPI && typeof window.electronAPI.resetWindowSize === "function") {
        window.electronAPI.resetWindowSize();
      }
    });
  }

  // Dynamic Island HUD button listener
  const btnDynamicIsland = document.getElementById("btn-dynamic-island");
  if (btnDynamicIsland) {
    btnDynamicIsland.addEventListener("click", () => {
      toggleDynamicIslandMode();
    });
  }

  // Wallpaper Mode HUD button listener
  const btnWallpaperMode = document.getElementById("btn-wallpaper-mode");
  if (btnWallpaperMode) {
    btnWallpaperMode.addEventListener("click", () => {
      toggleWallpaperMode();
    });
  }

  // Taskbar Mode HUD button listener
  const btnTaskbarMode = document.getElementById("btn-taskbar-mode");
  if (btnTaskbarMode) {
    btnTaskbarMode.addEventListener("click", () => {
      toggleTaskbarMode();
    });
  }

  // Cinematic Lyrics Mode HUD button listener
  const btnCinematicMode = document.getElementById("btn-cinematic-mode") || document.getElementById("btn-kinetic-mode");
  if (btnCinematicMode) {
    btnCinematicMode.addEventListener("click", () => {
      toggleCinematicView();
    });
  }
  const btnCinematicExit = document.getElementById("btn-cinematic-exit");
  if (btnCinematicExit) {
    btnCinematicExit.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCinematicView(false);
    });
  }

  // Option A: Split-View Layout HUD button listener
  const btnLayoutSplit = document.getElementById("btn-layout-split");
  if (btnLayoutSplit) {
    btnLayoutSplit.addEventListener("click", () => {
      toggleStudioSplit();
    });
  }
  document.getElementById('btn-split-tall-art')?.addEventListener('click', () => {
    setSplitTallArtwork(!settings.splitTallArtwork);
  });

  // Dynamic Island hover controls
  const islandBtnPrev = document.getElementById("island-btn-prev");
  if (islandBtnPrev) {
    islandBtnPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      controlPlayback('previous');
    });
  }
  const islandBtnPlay = document.getElementById("island-btn-play");
  if (islandBtnPlay) {
    islandBtnPlay.addEventListener("click", (e) => {
      e.stopPropagation();
      controlPlayback('play-pause');
    });
  }
  const islandBtnNext = document.getElementById("island-btn-next");
  if (islandBtnNext) {
    islandBtnNext.addEventListener("click", (e) => {
      e.stopPropagation();
      controlPlayback('next');
    });
  }
  const islandBtnExpand = document.getElementById("island-btn-expand");
  if (islandBtnExpand) {
    islandBtnExpand.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDynamicIslandMode(false);
    });
  }
  const islandBtnRefetch = document.getElementById("island-btn-refetch");
  if (islandBtnRefetch) {
    islandBtnRefetch.addEventListener("click", (e) => {
      e.stopPropagation();
      cycleAlternativeLyrics();
    });
  }
  const islandBtnTranslate = document.getElementById("island-btn-translate");
  if (islandBtnTranslate) {
    islandBtnTranslate.addEventListener("click", (e) => {
      e.stopPropagation();
      cycleIslandTranslationMode();
    });
  }
  const islandBtnGhost = document.getElementById("island-btn-ghost");
  if (islandBtnGhost) {
    islandBtnGhost.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.electronAPI && typeof window.electronAPI.toggleDynamicIslandGhost === 'function') {
        window.electronAPI.toggleDynamicIslandGhost();
      } else {
        toggleIslandGhostMode(!document.body.classList.contains('island-ghost-mode'));
      }
    });
  }
  const dynamicIslandEl = document.getElementById("dynamic-island");
  if (dynamicIslandEl) {
    dynamicIslandEl.addEventListener("mouseenter", () => {
      handleIslandClusterEnter();
      const titleEl = document.getElementById("island-track-title");
      const artistEl = document.getElementById("island-track-artist");
      if (titleEl) updateMarqueeOverflow(document.getElementById("island-title-wrapper"), titleEl);
      if (artistEl) updateMarqueeOverflow(document.getElementById("island-artist-wrapper"), artistEl);
    });
    dynamicIslandEl.addEventListener("mousemove", () => {
      lastPlaybackActivityMs = Date.now();
    });
    dynamicIslandEl.addEventListener("mouseleave", () => {
      handleIslandClusterLeave();
    });
    dynamicIslandEl.addEventListener("transitionstart", (event) => {
      if (event.target !== dynamicIslandEl || !islandBoundsRelevantProperties.has(event.propertyName)) return;
      const wasIdle = islandBoundsTransitionProperties.size === 0;
      islandBoundsTransitionProperties.add(event.propertyName);
      if (wasIdle) {
        pushDynamicIslandBounds(true);
        startDynamicIslandBoundsTracking(280);
      }
    });
    const finishIslandBoundsTransition = (event) => {
      if (event.target !== dynamicIslandEl || !islandBoundsRelevantProperties.has(event.propertyName)) return;
      islandBoundsTransitionProperties.delete(event.propertyName);
      if (islandBoundsTransitionProperties.size > 0) return;
      pushDynamicIslandBounds(true);
      requestAnimationFrame(() => {
        const titleEl = document.getElementById("island-track-title");
        const artistEl = document.getElementById("island-track-artist");
        const pausedTitleEl = document.getElementById("island-paused-title");
        if (titleEl) updateMarqueeOverflow(document.getElementById("island-title-wrapper"), titleEl);
        if (artistEl) updateMarqueeOverflow(document.getElementById("island-artist-wrapper"), artistEl);
        if (pausedTitleEl) updateMarqueeOverflow(document.getElementById("island-paused-title-wrapper"), pausedTitleEl);
      });
    };
    dynamicIslandEl.addEventListener("transitionend", finishIslandBoundsTransition);
    dynamicIslandEl.addEventListener("transitioncancel", finishIslandBoundsTransition);
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        // Width/height transitions already have a throttled bounds tracker.
        // Avoid forced layout and duplicate IPC from per-frame observer callbacks.
        if (islandBoundsTransitionProperties.size > 0) return;
        pushDynamicIslandBounds();
      });
      ro.observe(dynamicIslandEl);
    }
 
    dynamicIslandEl.addEventListener("dblclick", (e) => {
      if (!isDynamicIslandMode) return;
      if (e.target.closest('.island-btn') || e.target.closest('#island-expanded-controls') || e.target.closest('.island-art-wrapper') || e.target.closest('#island-art-tile')) return;

      const dblAction = settings.islandDblClickAction || 'playPause';
      if (dblAction === 'restore') {
        toggleDynamicIslandMode(false);
      } else {
        e.preventDefault();
        e.stopPropagation();
        const willPlay = !isPlaying;
        controlPlayback('play-pause');
        showIslandHud({
          icon: willPlay ? "▶" : "⏸",
          text: willPlay ? "Playing" : "Paused",
          showBar: false
        });
      }
    });

    // Single Click on Album Art Squircle to Toggle Play/Pause
    const islandArtTileEl = document.getElementById("island-art-tile");
    if (islandArtTileEl) {
      islandArtTileEl.addEventListener("click", (e) => {
        if (!isDynamicIslandMode) return;
        if (e.target.closest('.island-btn')) return;
        e.stopPropagation();
        const willPlay = !isPlaying;
        controlPlayback('play-pause');
        showIslandHud({
          icon: willPlay ? "▶" : "⏸",
          text: willPlay ? "Playing" : "Paused",
          showBar: false
        });
      });
    }

    // Mouse Wheel Gestures: Island scrolling adjusts music source application volume
    // Shift + Scroll explicitly performs seeking (±5s)
    dynamicIslandEl.addEventListener("wheel", (e) => {
      if (!isDynamicIslandMode) return;
      if (settings.islandWheelGestures === false) return;

      e.preventDefault();

      // Shift + scroll or explicit intentional horizontal swipe performs seek
      const isExplicitSeek = e.shiftKey || (Math.abs(e.deltaX) > 25 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 2.5);

      if (isExplicitSeek) {
        // Seek ±5 seconds
        const deltaMs = (e.shiftKey ? (e.deltaY < 0 ? -5000 : 5000) : (e.deltaX < 0 ? -5000 : 5000));
        const newPos = Math.max(0, Math.min(trackDuration || 0, (currentProgress || 0) + deltaMs));
        seekPlayback(newPos);

        const jumpText = deltaMs > 0 ? `+5s (${formatTime(newPos)})` : `-5s (${formatTime(newPos)})`;
        const jumpIcon = deltaMs > 0 ? "⏩" : "⏪";
        showIslandHud({
          icon: jumpIcon,
          text: jumpText,
          percent: trackDuration > 0 ? (newPos / trackDuration) * 100 : 0,
          showBar: true
        });
      } else {
        // Standard scroll: Adjust active music source application volume (±5%)
        const deltaVol = (e.deltaY < 0 || e.deltaX > 0) ? 5 : -5;
        adjustIslandVolume(deltaVol);
      }
    }, { passive: false });

    // Middle Click to Toggle Mute / Unmute
    dynamicIslandEl.addEventListener("auxclick", (e) => {
      if (e.button !== 1 || !isDynamicIslandMode) return;
      e.preventDefault();
      toggleAppMute();
    });

    // Right Click on Dynamic Island to open Quick Action Context Menu
    dynamicIslandEl.addEventListener("contextmenu", (e) => {
      if (!isDynamicIslandMode) return;
      if (e.target.closest('#island-expanded-controls')) return;
      e.preventDefault();
      e.stopPropagation();
      showIslandContextMenu(e.clientX, e.clientY);
    });

    const islandStage = document.getElementById("island-stage");
    if (islandStage) {
      islandStage.addEventListener("click", (e) => {
        if (!isDynamicIslandMode) return;
        if ((!lyrics || lyrics.length === 0) && currentTrackId) {
          e.stopPropagation();
          cycleAlternativeLyrics();
        }
      });
    }

    // Dynamic Island Quick-Action Context Menu Wiring
    const ctxLyrics = document.getElementById("island-ctx-lyrics");
    if (ctxLyrics) {
      ctxLyrics.addEventListener("click", (e) => {
        e.stopPropagation();
        hideIslandContextMenu();
        cycleAlternativeLyrics();
      });
    }

    const ctxOffsetMinus = document.getElementById("island-ctx-offset-minus");
    if (ctxOffsetMinus) {
      ctxOffsetMinus.addEventListener("click", (e) => {
        e.stopPropagation();
        adjustSyncOffset(-500);
      });
    }

    const ctxOffsetReset = document.getElementById("island-ctx-offset-reset");
    if (ctxOffsetReset) {
      ctxOffsetReset.addEventListener("click", (e) => {
        e.stopPropagation();
        adjustSyncOffset(-(settings.syncOffsetMs || 0));
      });
    }

    const ctxOffsetPlus = document.getElementById("island-ctx-offset-plus");
    if (ctxOffsetPlus) {
      ctxOffsetPlus.addEventListener("click", (e) => {
        e.stopPropagation();
        adjustSyncOffset(500);
      });
    }

    const ctxTranslate = document.getElementById("island-ctx-translate");
    if (ctxTranslate) {
      ctxTranslate.addEventListener("click", (e) => {
        e.stopPropagation();
        hideIslandContextMenu();
        cycleIslandTranslationMode();
      });
    }

    const ctxGhost = document.getElementById("island-ctx-ghost");
    if (ctxGhost) {
      ctxGhost.addEventListener("click", (e) => {
        e.stopPropagation();
        hideIslandContextMenu();
        if (window.electronAPI && typeof window.electronAPI.toggleDynamicIslandGhost === 'function') {
          window.electronAPI.toggleDynamicIslandGhost();
        } else {
          toggleIslandGhostMode(!document.body.classList.contains('island-ghost-mode'));
        }
      });
    }

    const ctxRestore = document.getElementById("island-ctx-restore");
    if (ctxRestore) {
      ctxRestore.addEventListener("click", (e) => {
        e.stopPropagation();
        hideIslandContextMenu();
        toggleDynamicIslandMode(false);
      });
    }

    document.addEventListener("pointerdown", (e) => {
      const menu = document.getElementById("island-context-menu");
      if (menu && menu.style.display !== 'none' && !e.target.closest('#island-context-menu') && !e.target.closest('#dynamic-island')) {
        hideIslandContextMenu();
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const menu = document.getElementById("island-context-menu");
        if (menu && menu.style.display !== 'none') {
          hideIslandContextMenu();
        }
      }
    });

    // Free-Floating Draggable Island Gesture Handler
    let isIslandDragging = false;
    let dragStartPointerX = 0;
    let dragStartPointerY = 0;
    let dragStartIslandX = 0;
    let dragStartIslandY = 0;

    dynamicIslandEl.addEventListener("pointerdown", (e) => {
      if (!isDynamicIslandMode) return;
      if (settings.dynamicIslandPosition !== 'free' && !document.body.classList.contains('island-dock-free')) return;
      if (
        e.target.closest('.island-btn') ||
        e.target.closest('#island-expanded-controls') ||
        e.target.closest('.island-art-tile') ||
        e.target.closest('#island-context-menu') ||
        e.button !== 0
      ) {
        return;
      }

      isIslandDragging = true;
      dragStartPointerX = e.clientX;
      dragStartPointerY = e.clientY;

      const rect = dynamicIslandEl.getBoundingClientRect();
      dragStartIslandX = rect.left;
      dragStartIslandY = rect.top;

      document.body.classList.add("island-dragging");
      if (typeof dynamicIslandEl.setPointerCapture === 'function') {
        try { dynamicIslandEl.setPointerCapture(e.pointerId); } catch (_) {}
      }
    });

    dynamicIslandEl.addEventListener("pointermove", (e) => {
      if (!isIslandDragging) return;
      const deltaX = e.clientX - dragStartPointerX;
      const deltaY = e.clientY - dragStartPointerY;

      const rect = dynamicIslandEl.getBoundingClientRect();
      const islandWidth = rect.width || 340;
      const islandHeight = rect.height || 36;
      const viewportWidth = window.innerWidth || 1920;
      const viewportHeight = window.innerHeight || 1080;

      const rawX = dragStartIslandX + deltaX;
      const rawY = dragStartIslandY + deltaY;

      const snapped = calculateMagneticSnap(rawX, rawY, islandWidth, islandHeight, viewportWidth, viewportHeight, 16);

      dynamicIslandEl.style.setProperty('--island-free-x', `${snapped.x}px`);
      dynamicIslandEl.style.setProperty('--island-free-y', `${snapped.y}px`);
    });

    const finishIslandDrag = (e) => {
      if (!isIslandDragging) return;
      isIslandDragging = false;
      document.body.classList.remove("island-dragging");

      if (e && typeof dynamicIslandEl.releasePointerCapture === 'function' && e.pointerId != null) {
        try { dynamicIslandEl.releasePointerCapture(e.pointerId); } catch (_) {}
      }

      const rect = dynamicIslandEl.getBoundingClientRect();
      const islandWidth = rect.width || 340;
      const islandHeight = rect.height || 36;
      const viewportWidth = window.innerWidth || 1920;
      const viewportHeight = window.innerHeight || 1080;

      const snapped = calculateMagneticSnap(rect.left, rect.top, islandWidth, islandHeight, viewportWidth, viewportHeight, 16);
      dynamicIslandEl.style.setProperty('--island-free-x', `${snapped.x}px`);
      dynamicIslandEl.style.setProperty('--island-free-y', `${snapped.y}px`);

      settings.islandCustomPos = { x: snapped.x, y: snapped.y };
      saveLocalSettings();
      pushDynamicIslandBounds();

      if (window.electronAPI && typeof window.electronAPI.setIslandPosition === 'function') {
        window.electronAPI.setIslandPosition(snapped.x, snapped.y);
      }
    };

    dynamicIslandEl.addEventListener("pointerup", finishIslandDrag);
    dynamicIslandEl.addEventListener("pointercancel", finishIslandDrag);
  }

  function attachScrubberController({
    trackEl,
    fillEl,
    thumbEl,
    hoverEl,
    tooltipEl,
    timeCurrentEl,
    isIsland = false
  }) {
    if (!trackEl) return;

    let isScrubbing = false;
    let lastCommitSeekTimestamp = 0;
    let cachedTrackRect = null;
    let activePointerId = null;
    let hasDragged = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let pendingClickSeekTimer = null;

    function getRatio(e) {
      const rect = (isScrubbing && cachedTrackRect) ? cachedTrackRect : trackEl.getBoundingClientRect();
      if (!rect || !rect.width || rect.width <= 0) return 0;
      return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    }

    function updateVisuals(ratio, isDragging) {
      let dur = trackDuration;
      if (dur <= 0) {
        dur = getEffectiveTrackDuration();
        if (dur > 0) trackDuration = dur;
        else return;
      }
      const previewMs = Math.round(ratio * dur);
      const percent = ratio * 100;

      if (hoverEl && !isDragging) {
        hoverEl.style.width = `${percent}%`;
      }
      if (tooltipEl) {
        tooltipEl.style.left = `${percent}%`;
        const deltaSec = Math.round((previewMs - (currentProgress || 0)) / 1000);
        const deltaStr = deltaSec > 0 ? ` (+${deltaSec}s)` : (deltaSec < 0 ? ` (${deltaSec}s)` : "");
        tooltipEl.textContent = `${formatTime(previewMs)}${deltaStr}`;
      }
      if (isDragging) {
        if (fillEl) {
          if (isIsland) fillEl.style.width = `${percent}%`;
          else setMainProgressFill(percent);
        }
        if (thumbEl) thumbEl.style.left = `${percent}%`;
        if (timeCurrentEl) timeCurrentEl.textContent = formatTime(previewMs);
        if (isIsland) {
          const remEl = document.getElementById("island-time-remaining");
          if (remEl) {
            const remMs = Math.max(0, dur - previewMs);
            remEl.textContent = `-${formatTime(remMs)}`;
          }
        } else if (widgetTimeDuration && window._showRemainingTime) {
          const remMs = Math.max(0, dur - previewMs);
          widgetTimeDuration.textContent = `-${formatTime(remMs)}`;
        }
      }
    }

    const onWindowPointerUpFallback = (e) => {
      if (isScrubbing) {
        commitSeek(e);
      }
    };

    const onWindowPointerCancelFallback = (e) => {
      if (isScrubbing) {
        commitSeek(e);
      }
    };

    const onWindowPointerMoveFallback = (e) => {
      if (!isScrubbing) return;
      handlePointerMove(e);
    };

    trackEl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (settings.progressBarSeek === false) return;
      let dur = trackDuration;
      if (dur <= 0) {
        dur = getEffectiveTrackDuration();
        if (dur > 0) trackDuration = dur;
        else return;
      }
      e.preventDefault();
      e.stopPropagation();

      // Clear any pending single-click seek if a new interaction occurs
      if (pendingClickSeekTimer) {
        clearTimeout(pendingClickSeekTimer);
        pendingClickSeekTimer = null;
      }

      hasDragged = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      activePointerId = e.pointerId;

      // Cache track rect on pointerdown to eliminate layout thrashing during drag
      cachedTrackRect = trackEl.getBoundingClientRect();

      isScrubbing = true;
      if (isIsland) {
        isScrubbingIslandProgress = true;
        const island = document.getElementById("dynamic-island");
        if (island) island.classList.add("is-scrubbing");
        // Immediately enforce expanded 460x140 bounds to Rust without transition throttling
        pushDynamicIslandBounds(true);
      } else {
        isScrubbingMainProgress = true;
      }

      trackEl.classList.add("is-scrubbing");
      lastPlaybackActivityMs = Date.now();

      try {
        trackEl.setPointerCapture(e.pointerId);
      } catch (_) {}

      // Attach window-level fallbacks so drag never freezes if cursor exits window
      window.addEventListener("pointerup", onWindowPointerUpFallback, { passive: false });
      window.addEventListener("pointercancel", onWindowPointerCancelFallback, { passive: false });
      window.addEventListener("pointermove", onWindowPointerMoveFallback, { passive: false });

      const ratio = getRatio(e);
      updateVisuals(ratio, true);
    });

    function handlePointerMove(e) {
      let dur = trackDuration;
      if (dur <= 0) {
        dur = getEffectiveTrackDuration();
        if (dur > 0) trackDuration = dur;
        else return;
      }

      if (isScrubbing) {
        e.preventDefault();
        e.stopPropagation();

        if (!hasDragged && (Math.abs(e.clientX - dragStartX) > 2 || Math.abs(e.clientY - dragStartY) > 2)) {
          hasDragged = true;
        }

        lastPlaybackActivityMs = Date.now();
        const ratio = getRatio(e);
        updateVisuals(ratio, true);
      } else {
        if (settings.progressBarSeek !== false) {
          const ratio = getRatio(e);
          updateVisuals(ratio, false);
        }
      }
    }

    trackEl.addEventListener("pointermove", handlePointerMove);

    function commitSeek(e) {
      if (!isScrubbing) return;
      if (e) {
        try { e.preventDefault(); } catch (_) {}
        try { e.stopPropagation(); } catch (_) {}
      }

      // Detach window-level fallback listeners
      window.removeEventListener("pointerup", onWindowPointerUpFallback);
      window.removeEventListener("pointercancel", onWindowPointerCancelFallback);
      window.removeEventListener("pointermove", onWindowPointerMoveFallback);

      let dur = trackDuration;
      if (dur <= 0) {
        dur = getEffectiveTrackDuration();
        if (dur > 0) trackDuration = dur;
      }
      const ratio = getRatio(e);
      const seekMs = dur > 0 ? Math.round(ratio * dur) : 0;

      isScrubbing = false;
      cachedTrackRect = null;
      lastPlaybackActivityMs = Date.now();

      if (isIsland) {
        isScrubbingIslandProgress = false;
        const island = document.getElementById("dynamic-island");
        if (island) {
          island.classList.remove("is-scrubbing");
          // If the pointer was dragged outside the island and released, trigger deferred collapse
          if (typeof island.matches === 'function' && !island.matches(':hover')) {
            handleIslandClusterLeave();
          }
        }
      } else {
        isScrubbingMainProgress = false;
      }

      trackEl.classList.remove("is-scrubbing");

      const pointerIdToRelease = (e && e.pointerId != null) ? e.pointerId : activePointerId;
      if (pointerIdToRelease != null && typeof trackEl.releasePointerCapture === "function") {
        try { trackEl.releasePointerCapture(pointerIdToRelease); } catch (_) {}
      }
      activePointerId = null;

      // 300ms debounce guard against rapid seek commits
      if (Date.now() - lastCommitSeekTimestamp < 300) return;

      // Double-click vs single seek resolution:
      if (hasDragged) {
        // Immediate commit on drag release
        lastCommitSeekTimestamp = Date.now();
        seekPlayback(seekMs);

        if (isIsland && dur > 0) {
          const jumpDeltaSec = Math.round((seekMs - (lastPollProgress || 0)) / 1000);
          const icon = jumpDeltaSec >= 0 ? "⏩" : "⏪";
          showIslandHud({
            icon,
            text: `${formatTime(seekMs)}`,
            percent: (seekMs / dur) * 100,
            showBar: true
          });
        }
      } else {
        // Stationary tap/click
        if (e && e.detail && e.detail >= 2) {
          // Second click of a double-click: suppress seek to allow dblclick to execute
          lastCommitSeekTimestamp = Date.now();
          return;
        }

        // Commit seek immediately on release to eliminate 220ms lag and playhead rubber-banding
        lastCommitSeekTimestamp = Date.now();
        if (pendingClickSeekTimer) {
          clearTimeout(pendingClickSeekTimer);
          pendingClickSeekTimer = null;
        }
        seekPlayback(seekMs);

        if (isIsland && dur > 0) {
          const jumpDeltaSec = Math.round((seekMs - (lastPollProgress || 0)) / 1000);
          const icon = jumpDeltaSec >= 0 ? "⏩" : "⏪";
          showIslandHud({
            icon,
            text: `${formatTime(seekMs)}`,
            percent: (seekMs / dur) * 100,
            showBar: true
          });
        }
      }
    }

    trackEl.addEventListener("pointerup", commitSeek);
    trackEl.addEventListener("pointercancel", commitSeek);
    trackEl.addEventListener("lostpointercapture", (e) => {
      if (isScrubbing) commitSeek(e);
    });

    trackEl.addEventListener("click", (e) => {
      if (e.button !== 0) return;
      if (settings.progressBarSeek === false) return;
      if (Date.now() - lastCommitSeekTimestamp < 300) return;
      let dur = trackDuration;
      if (dur <= 0) {
        dur = getEffectiveTrackDuration();
        if (dur > 0) trackDuration = dur;
        else return;
      }
      e.preventDefault();
      e.stopPropagation();
      const ratio = getRatio(e);
      const seekMs = Math.round(ratio * dur);
      seekPlayback(seekMs);
    });

    trackEl.addEventListener("pointerleave", () => {
      if (!isScrubbing && hoverEl) {
        hoverEl.style.width = "0%";
      }
    });

    trackEl.addEventListener("wheel", (e) => {
      if (settings.progressWheelSeek === false) return;
      if (settings.progressBarSeek === false) return;
      let dur = trackDuration;
      if (dur <= 0) {
        dur = getEffectiveTrackDuration();
        if (dur > 0) trackDuration = dur;
        else return;
      }
      e.preventDefault();
      e.stopPropagation();

      const stepMs = e.shiftKey ? 15000 : 5000;
      const deltaMs = e.deltaY < 0 ? stepMs : -stepMs;
      const newPos = Math.max(0, Math.min(dur, (currentProgress || 0) + deltaMs));

      seekPlayback(newPos);

      const ratio = newPos / dur;
      if (fillEl) {
        if (isIsland) fillEl.style.width = `${ratio * 100}%`;
        else setMainProgressFill(ratio * 100);
      }
      if (thumbEl) thumbEl.style.left = `${ratio * 100}%`;
      if (timeCurrentEl) timeCurrentEl.textContent = formatTime(newPos);

      if (tooltipEl) {
        tooltipEl.style.left = `${ratio * 100}%`;
        const jumpText = deltaMs > 0 ? `+${stepMs / 1000}s (${formatTime(newPos)})` : `-${stepMs / 1000}s (${formatTime(newPos)})`;
        tooltipEl.textContent = jumpText;
      }

      if (isIsland) {
        showIslandHud({
          icon: deltaMs > 0 ? "⏩" : "⏪",
          text: deltaMs > 0 ? `+${stepMs / 1000}s` : `-${stepMs / 1000}s`,
          percent: ratio * 100,
          showBar: true
        });
      }
    }, { passive: false });

    // Double-click to quick jump ±10s
    trackEl.addEventListener("dblclick", (e) => {
      if (settings.progressBarSeek === false) return;

      // Cancel pending single-click seek
      if (pendingClickSeekTimer) {
        clearTimeout(pendingClickSeekTimer);
        pendingClickSeekTimer = null;
      }

      let dur = trackDuration;
      if (dur <= 0) {
        dur = getEffectiveTrackDuration();
        if (dur > 0) trackDuration = dur;
        else return;
      }
      e.preventDefault();
      e.stopPropagation();

      lastCommitSeekTimestamp = Date.now();
      lastPlaybackActivityMs = Date.now();

      const ratio = getRatio(e);
      const deltaMs = ratio >= 0.5 ? 10000 : -10000;
      const targetPos = Math.max(0, Math.min(dur, (currentProgress || 0) + deltaMs));

      seekPlayback(targetPos);

      if (isIsland) {
        showIslandHud({
          icon: deltaMs > 0 ? "⏩" : "⏪",
          text: deltaMs > 0 ? "+10s" : "-10s",
          percent: (targetPos / dur) * 100,
          showBar: true
        });
      }
    });
  }

  attachScrubberController({
    trackEl: document.getElementById("island-progress-track"),
    fillEl: document.getElementById("island-progress-fill"),
    thumbEl: document.getElementById("island-progress-thumb"),
    hoverEl: document.getElementById("island-progress-hover"),
    tooltipEl: document.getElementById("island-progress-tooltip"),
    timeCurrentEl: document.getElementById("island-time-current"),
    isIsland: true
  });

  const islandScrubberContainer = document.querySelector(".island-scrubber-container");
  if (islandScrubberContainer) {
    let lastIslandContainerSeekTimestamp = 0;
    const onIslandContainerSeek = (e) => {
      if (e.button !== 0 && e.button !== undefined) return;
      if (settings.progressBarSeek === false) return;
      const track = document.getElementById("island-progress-track");
      if (!track || e.target === track || track.contains(e.target)) return;
      if (Date.now() - lastIslandContainerSeekTimestamp < 300) return;
      lastIslandContainerSeekTimestamp = Date.now();
      let dur = trackDuration;
      if (dur <= 0) {
        dur = getEffectiveTrackDuration();
        if (dur > 0) trackDuration = dur;
        else return;
      }
      const rect = track.getBoundingClientRect();
      if (!rect.width) return;
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const seekMs = Math.round(ratio * dur);
      seekPlayback(seekMs);
      if (dur > 0 && typeof showIslandHud === 'function') {
        const jumpDeltaSec = Math.round((seekMs - (lastPollProgress || 0)) / 1000);
        const icon = jumpDeltaSec >= 0 ? "⏩" : "⏪";
        showIslandHud({
          icon,
          text: `${formatTime(seekMs)}`,
          percent: (seekMs / dur) * 100,
          showBar: true
        });
      }
    };
    islandScrubberContainer.addEventListener("pointerdown", onIslandContainerSeek);
    islandScrubberContainer.addEventListener("click", onIslandContainerSeek);
  }

  if (window.electronAPI && typeof window.electronAPI.onDynamicIslandModeChanged === 'function') {
    window.electronAPI.onDynamicIslandModeChanged((enabled) => {
      isDynamicIslandMode = Boolean(enabled);
      document.body.classList.toggle('mode-dynamic-island', isDynamicIslandMode);
      const checkIsland = document.getElementById("check-dynamic-island");
      if (checkIsland) checkIsland.checked = isDynamicIslandMode;
      if (isDynamicIslandMode) {
        if (typeof fluidMeshGradientInstance !== 'undefined' && fluidMeshGradientInstance) {
          // Island mode only hides the mesh surface. Keep its WebGL context
          // alive so the normal window can resume immediately on exit.
          fluidMeshGradientInstance.stop?.();
        }
        if (typeof syncActiveAnimatedVideoState === 'function') {
          try { syncActiveAnimatedVideoState(); } catch (e) {}
        }
        startDynamicIslandInactivityWatchdog();
        cancelAutoHide();
        if (appContainer) appContainer.classList.remove('auto-hide-faded', 'auto-hide-collapsed');
        document.body.classList.remove('island-sleeping', 'auto-hide-faded', 'auto-hide-collapsed');
        isIslandSleeping = false;
        isLyricsAutoHidden = false;
        const pri = document.getElementById("dynamic-island");
        if (pri) {
          pri.style.display = '';
          pri.classList.remove('island-vaporizing', 'island-materializing');
        }
        applyDynamicIslandDockClass(settings.dynamicIslandPosition);
        syncDynamicIslandState();
        pushDynamicIslandBounds();
        setTimeout(() => {
          pushDynamicIslandBounds();
          startDynamicIslandBoundsTracking(500);
        }, 60);
      } else {
        stopDynamicIslandInactivityWatchdog();
        if (fluidMeshGradientInstance && shouldRunFluidMesh()) {
          fluidMeshGradientInstance.wake?.();
          if (isPlaying || !fluidMeshGradientInstance.isSettled?.()) {
            fluidMeshGradientInstance.start();
          }
          restoreCurrentFluidMeshPalette();
        }
        applyVisualSettings();
      }
      syncAudioVisualizerState();
    });
  }

  if (window.electronAPI && typeof window.electronAPI.onIslandGhostMode === 'function') {
    window.electronAPI.onIslandGhostMode((enabled) => {
      toggleIslandGhostMode(enabled);
    });
  }

  const checkDynamicIsland = document.getElementById("check-dynamic-island");
  if (checkDynamicIsland) {
    checkDynamicIsland.checked = isDynamicIslandMode;
    checkDynamicIsland.addEventListener("change", (e) => {
      toggleDynamicIslandMode(e.target.checked);
    });
  }

  const checkIslandGlass = document.getElementById("check-island-glass-mode");
  if (checkIslandGlass) {
    checkIslandGlass.checked = Boolean(settings.islandGlassMode);
    checkIslandGlass.addEventListener("change", (e) => {
      toggleIslandGlassMode(e.target.checked);
    });
  }

  const selectIslandPosition = document.getElementById("select-island-position");
  if (selectIslandPosition) {
    settings.dynamicIslandPosition = normalizeDynamicIslandDockPosition(settings.dynamicIslandPosition);
    selectIslandPosition.value = settings.dynamicIslandPosition;
    selectIslandPosition.addEventListener("change", (e) => {
      settings.dynamicIslandPosition = normalizeDynamicIslandDockPosition(e.target.value);
      e.target.value = settings.dynamicIslandPosition;
      applyDynamicIslandDockClass(settings.dynamicIslandPosition);
      saveLocalSettings();
      if (isDynamicIslandMode && window.electronAPI && window.electronAPI.setDynamicIslandMode) {
        window.electronAPI.setDynamicIslandMode(true, settings.dynamicIslandPosition);
        setTimeout(() => {
          pushDynamicIslandBounds();
          startDynamicIslandBoundsTracking(500);
        }, 80);
      }
    });
  }

  const selectIslandVisualizerBars = document.getElementById("select-island-visualizer-bars");
  if (selectIslandVisualizerBars) {
    selectIslandVisualizerBars.value = String(settings.islandVisualizerBars || 4);
    selectIslandVisualizerBars.addEventListener("change", (e) => {
      const bars = parseInt(e.target.value, 10) || 4;
      setVisualizerBarCount(bars);
      saveLocalSettings();
    });
  }

  const selectIslandVisualizerStyle = document.getElementById("select-island-visualizer-style");
  if (selectIslandVisualizerStyle) {
    selectIslandVisualizerStyle.value = settings.islandVisualizerStyle || 'bars';
    selectIslandVisualizerStyle.addEventListener("change", (e) => {
      settings.islandVisualizerStyle = e.target.value;
      applyIslandVisualizerStyle(settings.islandVisualizerStyle);
      saveLocalSettings();
    });
  }

  const checkIslandVocalCountdown = document.getElementById("check-island-vocal-countdown");
  if (checkIslandVocalCountdown) {
    checkIslandVocalCountdown.checked = settings.islandVocalCountdown !== false;
    checkIslandVocalCountdown.addEventListener("change", (e) => {
      settings.islandVocalCountdown = e.target.checked;
      saveLocalSettings();
      syncDynamicIslandState();
    });
  }

  const checkIslandWheelGestures = document.getElementById("check-island-wheel-gestures");
  if (checkIslandWheelGestures) {
    checkIslandWheelGestures.checked = settings.islandWheelGestures !== false;
    checkIslandWheelGestures.addEventListener("change", (e) => {
      settings.islandWheelGestures = e.target.checked;
      saveLocalSettings();
    });
  }

  const selectIslandTranslation = document.getElementById("select-island-translation");
  if (selectIslandTranslation) {
    selectIslandTranslation.value = settings.islandTranslationMode || 'bilingual';
    selectIslandTranslation.addEventListener("change", (e) => {
      settings.islandTranslationMode = e.target.value;
      saveLocalSettings();
      const islandLine = document.getElementById("island-lyric-line");
      if (islandLine) {
        islandLine.dataset.lineIndex = "";
        islandLine.dataset.transMode = "";
      }
      if (lyrics && lyrics.length > 0 && activeLineIndex >= 0) {
        updateDynamicIslandLyric(activeLineIndex, lyrics[activeLineIndex], currentProgress);
      } else {
        syncDynamicIslandState();
      }
    });
  }

  const checkIslandSatellite = document.getElementById("check-island-satellite");
  if (checkIslandSatellite) {
    checkIslandSatellite.checked = settings.islandSatelliteEnabled !== false;
    checkIslandSatellite.addEventListener("change", (e) => {
      settings.islandSatelliteEnabled = e.target.checked;
      saveLocalSettings();
      syncDynamicIslandState();
      setTimeout(pushDynamicIslandBounds, 50);
    });
  }

  const checkIslandMetamorphosis = document.getElementById("check-island-metamorphosis");
  if (checkIslandMetamorphosis) {
    checkIslandMetamorphosis.checked = settings.islandMetamorphosis !== false;
    checkIslandMetamorphosis.addEventListener("change", (e) => {
      settings.islandMetamorphosis = e.target.checked;
      saveLocalSettings();
      if (!settings.islandMetamorphosis) {
        document.body.classList.remove('island-morph-calm', 'island-morph-groove', 'island-morph-climax', 'island-morph-solo');
        const pri = document.getElementById("dynamic-island");
        if (pri) pri.style.removeProperty('box-shadow');
      }
    });
  }

  const checkIslandDuetSplit = document.getElementById("check-island-duet-split");
  if (checkIslandDuetSplit) {
    checkIslandDuetSplit.checked = settings.islandDuetSplit !== false;
    checkIslandDuetSplit.addEventListener("change", (e) => {
      settings.islandDuetSplit = e.target.checked;
      saveLocalSettings();
      if (!settings.islandDuetSplit) {
        hideDuetCapsule(false);
      }
    });
  }

  const checkIslandBeatBloom = document.getElementById("check-island-beat-bloom");
  if (checkIslandBeatBloom) {
    checkIslandBeatBloom.checked = settings.islandBeatBloom !== false;
    checkIslandBeatBloom.addEventListener("change", (e) => {
      settings.islandBeatBloom = e.target.checked;
      saveLocalSettings();
      if (!settings.islandBeatBloom) {
        const pri = document.getElementById("dynamic-island");
        if (pri) pri.style.removeProperty('box-shadow');
      }
    });
  }

  const selectIslandInactivityTimeout = document.getElementById("select-island-inactivity-timeout");
  if (selectIslandInactivityTimeout) {
    selectIslandInactivityTimeout.value = String(settings.islandInactivityTimeout ?? 30000);
    selectIslandInactivityTimeout.addEventListener("change", (e) => {
      settings.islandInactivityTimeout = parseInt(e.target.value, 10);
      saveLocalSettings();
      lastPlaybackActivityMs = Date.now();
      if (isIslandSleeping) {
        wakeDynamicIsland();
      }
    });
  }

  const checkProgressBarSeek = document.getElementById("check-progress-bar-seek");
  if (checkProgressBarSeek) {
    checkProgressBarSeek.checked = settings.progressBarSeek !== false;
    checkProgressBarSeek.addEventListener("change", (e) => {
      settings.progressBarSeek = e.target.checked;
      saveLocalSettings();
    });
  }

  const checkProgressWheelSeek = document.getElementById("check-progress-wheel-seek");
  if (checkProgressWheelSeek) {
    checkProgressWheelSeek.checked = settings.progressWheelSeek !== false;
    checkProgressWheelSeek.addEventListener("change", (e) => {
      settings.progressWheelSeek = e.target.checked;
      saveLocalSettings();
    });
  }

  // Periodic Inactivity Checker (scoped strictly to dynamic island mode)
  if (isDynamicIslandMode) {
    startDynamicIslandInactivityWatchdog();
  }

  // Satellite chip click listener (cycles translation mode)
  const islandSatelliteChip = document.getElementById("island-satellite-chip");
  if (islandSatelliteChip) {
    islandSatelliteChip.addEventListener("click", (e) => {
      e.stopPropagation();
      cycleIslandTranslationMode();
    });
  }

  // Satellite Island hover & marquee tracking
  const dynamicIslandTranslationEl = document.getElementById("dynamic-island-translation");
  if (dynamicIslandTranslationEl) {
    dynamicIslandTranslationEl.addEventListener("mouseenter", () => {
      handleIslandClusterEnter();
      const satText = document.getElementById("island-satellite-text");
      const satWrap = document.getElementById("island-satellite-marquee-wrapper");
      if (satText && satWrap) updateMarqueeOverflow(satWrap, satText);
    });
    dynamicIslandTranslationEl.addEventListener("mousemove", () => {
      lastPlaybackActivityMs = Date.now();
    });
    dynamicIslandTranslationEl.addEventListener("mouseleave", () => {
      handleIslandClusterLeave();
    });
    dynamicIslandTranslationEl.addEventListener("transitionstart", () => {
      startDynamicIslandBoundsTracking(450);
    });
    dynamicIslandTranslationEl.addEventListener("transitionend", () => {
      pushDynamicIslandBounds();
    });
  }

  // Duet Backing Vocal Capsule hover & marquee tracking
  const dynamicIslandDuetEl = document.getElementById("island-duet-capsule");
  if (dynamicIslandDuetEl) {
    dynamicIslandDuetEl.addEventListener("mouseenter", () => {
      handleIslandClusterEnter();
      const duetText = document.getElementById("island-duet-text");
      const duetWrap = document.getElementById("island-duet-marquee-wrapper");
      if (duetText && duetWrap) updateMarqueeOverflow(duetWrap, duetText);
    });
    dynamicIslandDuetEl.addEventListener("mousemove", () => {
      lastPlaybackActivityMs = Date.now();
    });
    dynamicIslandDuetEl.addEventListener("mouseleave", () => {
      handleIslandClusterLeave();
    });
    dynamicIslandDuetEl.addEventListener("transitionstart", () => {
      startDynamicIslandBoundsTracking(450);
    });
    dynamicIslandDuetEl.addEventListener("transitionend", () => {
      pushDynamicIslandBounds();
    });
  }

  // In-App Discovery Prompt Modal Buttons
  const btnPromptEnable = document.getElementById("btn-island-prompt-enable");
  if (btnPromptEnable) {
    btnPromptEnable.addEventListener("click", (e) => {
      e.stopPropagation();
      dismissIslandSatellitePrompt(true);
    });
  }
  const btnPromptDismiss = document.getElementById("btn-island-prompt-dismiss");
  if (btnPromptDismiss) {
    btnPromptDismiss.addEventListener("click", (e) => {
      e.stopPropagation();
      dismissIslandSatellitePrompt(false);
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
      } else {
        updateWallpaperLyricBeatBloom(0);
      }
      
      applyVisualSettings();
      saveLocalSettings();
    });
  }

  const checkWallpaperBeatBloom = document.getElementById("check-wallpaper-beat-bloom");
  if (checkWallpaperBeatBloom) {
    checkWallpaperBeatBloom.checked = settings.wallpaperBeatBloom !== false;
    checkWallpaperBeatBloom.addEventListener("change", (e) => {
      settings.wallpaperBeatBloom = e.target.checked;
      saveLocalSettings();
      if (!settings.wallpaperBeatBloom) {
        updateWallpaperLyricBeatBloom(0);
      }
      syncAudioVisualizerState();
    });
  }

  if (selectWallpaperStyle) {
    selectWallpaperStyle.value = (settings.wallpaperStyle === 'style2') ? 'style2' : 'cinematic';
    selectWallpaperStyle.addEventListener("change", (e) => {
      setWallpaperStyle(e.target.value);
    });
  }

  const btnWallOptCinematic = document.getElementById("btn-wall-opt-cinematic");
  if (btnWallOptCinematic) {
    btnWallOptCinematic.addEventListener("click", (e) => {
      e.stopPropagation();
      setWallpaperStyle('cinematic');
      hideWallpaperSelectorPanel();
    });
  }

  const btnWallOptClassic = document.getElementById("btn-wall-opt-classic");
  if (btnWallOptClassic) {
    btnWallOptClassic.addEventListener("click", (e) => {
      e.stopPropagation();
      setWallpaperStyle('style2');
      hideWallpaperSelectorPanel();
    });
  }

  const btnCinematicSetWall = document.getElementById("btn-cinematic-set-wallpaper");
  if (btnCinematicSetWall && !btnCinematicSetWall._boundCinematicWall) {
    btnCinematicSetWall._boundCinematicWall = true;
    btnCinematicSetWall.addEventListener("click", (e) => {
      e.stopPropagation();
      setWallpaperStyle('cinematic');
      toggleWallpaperMode(true);
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

  // Taskbar Presentation Style listener
  if (selectTaskbarStyle) {
    selectTaskbarStyle.value = settings.taskbarStyle || 'minimal';
    selectTaskbarStyle.addEventListener("change", (e) => {
      settings.taskbarStyle = e.target.value;
      settings.tbStyle = e.target.value;
      saveLocalSettings();
      if (window.electronAPI.syncTaskbarConfig) {
        window.electronAPI.syncTaskbarConfig({
          style: settings.taskbarStyle,
          taskbarStyle: settings.taskbarStyle
        });
      }
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

  syncMotionPreferenceControls();
  ['check-reduced-motion', 'check-motion-art', 'check-motion-dust', 'check-motion-visualizer'].forEach(id => {
    const input = document.getElementById(id);
    if (!input || input._motionPreferenceBound) return;
    input._motionPreferenceBound = true;
    input.addEventListener('change', () => {
      const keys = {
        'check-reduced-motion': 'reducedMotion',
        'check-motion-art': 'motionAlbumArt',
        'check-motion-dust': 'motionIslandDust',
        'check-motion-visualizer': 'motionVisualizers'
      };
      settings[keys[id]] = input.checked;
      applyMotionPreferences();
      saveLocalSettings();
    });
  });

  const copyDiagnostics = document.getElementById('btn-copy-diagnostics');
  if (copyDiagnostics && !copyDiagnostics._bound) {
    copyDiagnostics._bound = true;
    copyDiagnostics.addEventListener('click', async () => {
      updateLyricsDiagnostics();
      const report = [
        `Track: ${document.getElementById('diag-track')?.textContent || 'Unknown'}`,
        `Playback: ${document.getElementById('diag-playback')?.textContent || 'Unknown'}`,
        `Lyrics: ${document.getElementById('diag-lyrics')?.textContent || 'Unknown'}`,
        `Track ID: ${currentTrackId || 'Unavailable'}`
      ].join('\n');
      try {
        await navigator.clipboard.writeText(report);
        showToast('Diagnostics copied.', 1800, 'success');
      } catch (_) {
        showToast('Could not copy diagnostics.', 1800, 'warning');
      }
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

  // Hinglish & Punjabi to English translator toggle (defaults to false to prevent 429 errors and garbled translations)
  // Default: settings.hinglishTranslate = false; (legacy default: settings.hinglishTranslate = true;)
  if (settings.hinglishTranslate === undefined) {
    settings.hinglishTranslate = false;
  }
  const checkTranslateHinglish = document.getElementById("check-translate-hinglish") || document.getElementById("check-hinglish-translate");
  if (checkTranslateHinglish) {
    checkTranslateHinglish.checked = Boolean(settings.hinglishTranslate);
    checkTranslateHinglish.addEventListener('change', (e) => {
      settings.hinglishTranslate = e.target.checked;
      saveLocalSettings();
      if (lyrics && lyrics.length > 0) {
        delete lyrics._transLang;
        delete lyrics._noTransNeeded;
        delete lyrics._translationSourceLang;
        if (!settings.hinglishTranslate && (lyrics._translationSourceLang === 'hinglish' || isHinglishLyrics(lyrics))) {
          lyrics.forEach(l => { delete l.subText; });
          lyrics._noTransNeeded = true;
          lyrics._hasTranslation = false;
          renderLyrics();
          const islandLine = document.getElementById("island-lyric-line");
          if (islandLine) {
            islandLine.dataset.subText = "";
          }
        } else {
          triggerAutoTranslation(currentTrackId, lyrics, `lyrics_cache_v21_${currentTrackId}`, true);
        }
      }
    });
  }

  // Virtual DJ & Auto-Transitions controls
  const checkDjTransitions = document.getElementById("check-dj-transitions");
  if (checkDjTransitions) {
    checkDjTransitions.checked = Boolean(settings.djLyricAutoTransition);
    checkDjTransitions.addEventListener('change', (e) => {
      settings.djLyricAutoTransition = e.target.checked;
      if (window.djEngine) window.djEngine.setSettings(settings);
      saveLocalSettings();
      if (typeof syncDjSpectrumListener === 'function') syncDjSpectrumListener();
    });
  }

  const inputDjGrace = document.getElementById("input-dj-grace");
  if (inputDjGrace) {
    inputDjGrace.value = settings.djOutroGraceSec !== undefined ? settings.djOutroGraceSec : 2.5;
    inputDjGrace.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        settings.djOutroGraceSec = val;
        if (window.djEngine) window.djEngine.setSettings(settings);
        saveLocalSettings();
      }
    });
  }

  const checkDjPreserveSolos = document.getElementById("check-dj-preserve-solos");
  if (checkDjPreserveSolos) {
    checkDjPreserveSolos.checked = settings.djPreserveSolos !== false;
    checkDjPreserveSolos.addEventListener('change', (e) => {
      settings.djPreserveSolos = e.target.checked;
      if (window.djEngine) window.djEngine.setSettings(settings);
      saveLocalSettings();
      if (typeof syncDjSpectrumListener === 'function') syncDjSpectrumListener();
    });
  }

  const inputDjFadeDuration = document.getElementById("input-dj-fade-duration");
  if (inputDjFadeDuration) {
    inputDjFadeDuration.value = settings.djFadeDurationSec !== undefined ? settings.djFadeDurationSec : 3.5;
    inputDjFadeDuration.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0.5) {
        settings.djFadeDurationSec = val;
        if (window.djEngine) window.djEngine.setSettings(settings);
        saveLocalSettings();
      }
    });
  }

  const checkDjSmartQueue = document.getElementById("check-dj-smart-queue");
  if (checkDjSmartQueue) {
    checkDjSmartQueue.checked = Boolean(settings.djSmartQueue);
    checkDjSmartQueue.addEventListener('change', (e) => {
      settings.djSmartQueue = e.target.checked;
      if (window.djEngine) window.djEngine.setSettings(settings);
      saveLocalSettings();
      if (typeof syncDjSpectrumListener === 'function') syncDjSpectrumListener();
      if (settings.djSmartQueue && currentTrack && window.djEngine) {
        window.djEngine.enqueueSmartRecommendation({
          currentTrack,
          spotifyToken: (typeof getSpotifyToken === 'function' ? getSpotifyToken() : null),
          lastFmApiKey: (config?.lastFmApiKey || null)
        });
      }
    });
  }

  // Spotify Soloist Local WebSocket API controls
  const checkSoloistEnabled = document.getElementById("check-soloist-enabled");
  const inputSoloistHost = document.getElementById("input-soloist-host");
  const inputSoloistPort = document.getElementById("input-soloist-port");
  const btnSoloistConnect = document.getElementById("btn-soloist-connect");

  if (checkSoloistEnabled) {
    checkSoloistEnabled.checked = Boolean(settings.soloistEnabled);
    checkSoloistEnabled.addEventListener('change', (e) => {
      settings.soloistEnabled = e.target.checked;
      saveLocalSettings();
      if (window.soloistProvider) {
        if (settings.soloistEnabled) {
          window.soloistProvider.connect(settings.soloistHost || '127.0.0.1', settings.soloistPort || 4488);
        } else {
          window.soloistProvider.disconnect();
        }
      }
    });
  }

  if (inputSoloistHost) {
    inputSoloistHost.value = settings.soloistHost || '127.0.0.1';
    inputSoloistHost.addEventListener('input', (e) => {
      settings.soloistHost = e.target.value.trim() || '127.0.0.1';
      saveLocalSettings();
    });
  }

  if (inputSoloistPort) {
    inputSoloistPort.value = settings.soloistPort || 4488;
    inputSoloistPort.addEventListener('input', (e) => {
      const p = parseInt(e.target.value, 10);
      if (!isNaN(p) && p > 0 && p <= 65535) {
        settings.soloistPort = p;
        saveLocalSettings();
      }
    });
  }

  const inputSoloistApiKey = document.getElementById("input-soloist-api-key");
  const btnSoloistToggleKey = document.getElementById("btn-soloist-toggle-key");
  const btnSoloistDaemon = document.getElementById("btn-soloist-daemon");
  const btnSoloistActivate = document.getElementById("btn-soloist-activate");
  const textSoloistDaemonStatus = document.getElementById("soloist-daemon-status-text");

  if (inputSoloistApiKey) {
    inputSoloistApiKey.value = settings.soloistApiKey || '';
    inputSoloistApiKey.addEventListener('input', (e) => {
      settings.soloistApiKey = e.target.value.trim();
      saveLocalSettings();
    });
  }

  if (btnSoloistToggleKey && inputSoloistApiKey) {
    btnSoloistToggleKey.addEventListener('click', () => {
      inputSoloistApiKey.type = inputSoloistApiKey.type === 'password' ? 'text' : 'password';
    });
  }

  async function syncSoloistDaemonStatus() {
    if (!window.__TAURI__?.core?.invoke) return;
    try {
      const status = await window.__TAURI__.core.invoke('get_soloist_daemon_status');
      if (!status) return;
      if (textSoloistDaemonStatus) {
        textSoloistDaemonStatus.textContent = status.is_running
          ? `Daemon: Running (PID ${status.pid || ''})`
          : (status.binary_found ? 'Daemon: Stopped' : 'Daemon: Binary not found');
        textSoloistDaemonStatus.style.color = status.is_running ? '#1db954' : 'rgba(255,255,255,0.65)';
      }
      if (btnSoloistDaemon) {
        if (status.is_running) {
          btnSoloistDaemon.textContent = 'Stop Soloist Daemon';
          btnSoloistDaemon.classList.remove('btn-primary');
          btnSoloistDaemon.classList.add('btn-secondary');
        } else {
          btnSoloistDaemon.textContent = 'Start Soloist Daemon';
          btnSoloistDaemon.classList.remove('btn-secondary');
          btnSoloistDaemon.classList.add('btn-primary');
        }
      }
    } catch (_) {}
  }
  window.syncSoloistDaemonStatus = syncSoloistDaemonStatus;

  async function startSoloistDaemon(silent = false) {
    if (!window.__TAURI__?.core?.invoke) return;
    try {
      const status = await window.__TAURI__.core.invoke('start_soloist_daemon', {
        apiKey: settings.soloistApiKey || 'spak_MvMTV9sUx815YUWewrdW2KlhUBX0eW5g',
        port: settings.soloistPort || 4488,
        deviceName: settings.soloistDeviceName || 'LyricFlow'
      });
      syncSoloistDaemonStatus();
      if (!silent && typeof showToast === 'function') {
        showToast('Spotify Soloist daemon started on 127.0.0.1:' + (settings.soloistPort || 4488), 2500, 'info');
      }
      if (window.soloistProvider) {
        setTimeout(() => {
          window.soloistProvider.connect(settings.soloistHost || '127.0.0.1', settings.soloistPort || 4488);
        }, 500);
      }
      return status;
    } catch (e) {
      console.warn('[Soloist] Failed to start daemon:', e);
      if (!silent && typeof showToast === 'function') {
        showToast('Failed to start Soloist: ' + e, 3500, 'error');
      }
    }
  }
  window.startSoloistDaemon = startSoloistDaemon;

  async function stopSoloistDaemon() {
    if (!window.__TAURI__?.core?.invoke) return;
    try {
      await window.__TAURI__.core.invoke('stop_soloist_daemon');
      syncSoloistDaemonStatus();
      if (typeof showToast === 'function') {
        showToast('Spotify Soloist daemon stopped', 2000, 'info');
      }
      if (window.soloistProvider) {
        window.soloistProvider.disconnect();
      }
    } catch (e) {
      console.warn('[Soloist] Failed to stop daemon:', e);
    }
  }
  window.stopSoloistDaemon = stopSoloistDaemon;

  if (btnSoloistDaemon) {
    btnSoloistDaemon.addEventListener('click', async () => {
      const status = await window.__TAURI__?.core?.invoke?.('get_soloist_daemon_status').catch(() => null);
      if (status && status.is_running) {
        stopSoloistDaemon();
      } else {
        startSoloistDaemon(false);
      }
    });
  }

  if (btnSoloistActivate) {
    btnSoloistActivate.addEventListener('click', async () => {
      if (typeof showToast === 'function') {
        showToast('Switching audio to LyricFlow Connect device...', 2000, 'info');
      }
      try {
        if (window.__TAURI__?.core?.invoke) {
          await window.__TAURI__.core.invoke('activate_soloist_device', { port: settings.soloistPort || 4488 });
        }
      } catch (_) {}

      // Also transfer via Spotify Web API if user token is present
      if (config && config.access_token) {
        try {
          const devRes = await fetch('https://api.spotify.com/v1/me/player/devices', {
            headers: { 'Authorization': `Bearer ${config.access_token}` }
          });
          if (devRes.ok) {
            const devData = await devRes.json();
            const target = (devData.devices || []).find(d => (d.name || '').toLowerCase() === (settings.soloistDeviceName || 'LyricFlow').toLowerCase());
            if (target && target.id) {
              await fetch('https://api.spotify.com/v1/me/player', {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${config.access_token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ device_ids: [target.id], play: true })
              });
              if (typeof showToast === 'function') {
                showToast('Now streaming audio directly to LyricFlow (HiFi)', 2500, 'info');
              }
            }
          }
        } catch (_) {}
      }
    });
  }

  syncSoloistDaemonStatus();

  if (btnSoloistConnect) {
    btnSoloistConnect.addEventListener('click', () => {
      if (window.soloistProvider) {
        window.soloistProvider.connect(settings.soloistHost || '127.0.0.1', settings.soloistPort || 4488);
        if (typeof showToast === 'function') {
          showToast(`Connecting to Soloist at ${settings.soloistHost || '127.0.0.1'}:${settings.soloistPort || 4488}...`, 2000, 'info');
        }
      }
    });
  }

  // Word-by-Word Karaoke Mode toggle
  if (checkWordByWord) {
    checkWordByWord.checked = settings.wordByWord !== false;
    checkWordByWord.addEventListener('change', (e) => {
      settings.wordByWord = e.target.checked;
      saveLocalSettings();
      if (lyrics && lyrics.length > 0) {
        renderLyrics();
      }
    });
  }

  // Multi-Artist Duet Separation toggle
  const checkDuetSeparation = document.getElementById("check-duet-separation");
  if (checkDuetSeparation) {
    checkDuetSeparation.checked = settings.duetSeparation !== false;
    checkDuetSeparation.addEventListener('change', (e) => {
      settings.duetSeparation = e.target.checked;
      saveLocalSettings();
      if (lyrics && lyrics.length > 0) {
        renderLyrics();
      }
    });
  }

  // NetEase Word-by-Word (YRC) toggle
  if (checkNeteaseWordByWord) {
    checkNeteaseWordByWord.checked = settings.neteaseWordByWord !== false;
    checkNeteaseWordByWord.addEventListener('change', (e) => {
      settings.neteaseWordByWord = e.target.checked;
      saveLocalSettings();
    });
  }

  // Filter Song Credits & Metadata toggle
  if (checkFilterCredits) {
    checkFilterCredits.checked = settings.filterSongCredits !== false;
    checkFilterCredits.addEventListener('change', (e) => {
      settings.filterSongCredits = e.target.checked;
      saveLocalSettings();
      if (currentTrackId) {
        refetchLyrics(false);
      }
    });
  }

  // Preferred Lyrics Provider select
  if (selectPreferredProvider) {
    selectPreferredProvider.value = settings.preferredLyricProvider || 'lyricsplus';
    selectPreferredProvider.addEventListener('change', (e) => {
      settings.preferredLyricProvider = e.target.value;
      if (settings.preferredLyricProvider === 'lyricsplus' || settings.preferredLyricProvider === 'netease') {
        settings.preferredLyricProviders = ['netease', 'lrclib', 'musixmatch'];
      } else if (settings.preferredLyricProvider === 'lrclib') {
        settings.preferredLyricProviders = ['lrclib', 'musixmatch', 'netease'];
      } else if (settings.preferredLyricProvider === 'musixmatch') {
        settings.preferredLyricProviders = ['musixmatch', 'lrclib', 'netease'];
      } else {
        settings.preferredLyricProviders = [];
      }
      saveLocalSettings();
      if (currentTrackId) {
        refetchLyrics(false);
      }
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
    if (e.key === 'Escape') {
      const shareModal = document.getElementById("share-card-modal");
      if (shareModal && shareModal.classList.contains("is-open")) {
        if (typeof closeShareModal === 'function') closeShareModal();
        return;
      }
      if (geniusModal && geniusModal.classList.contains('show')) {
        hideGeniusModal();
      } else if (isCinematicView) {
        toggleCinematicView(false);
        return;
      } else if (isKineticMode) {
        toggleKineticMode(false);
        return;
      } else if (isDynamicIslandMode) {
        if (document.body.classList.contains('island-ghost-mode')) {
          if (window.electronAPI && typeof window.electronAPI.toggleDynamicIslandGhost === 'function') {
            window.electronAPI.toggleDynamicIslandGhost();
          } else {
            toggleIslandGhostMode(false);
          }
          return;
        }
        toggleDynamicIslandMode(false);
      }
    }
    // These mode combinations are handled by the OS global-shortcut plugin in Tauri.
    // Keep this path only for browser/test fallback so a focused app cannot toggle twice.
    const hasNativeModeShortcuts = Boolean(window.electronAPI?.onToggleDynamicIslandShortcut);
    if (hasNativeModeShortcuts && e.ctrlKey && e.shiftKey && ['c', 'd', 'w', 'b', 'k'].includes(String(e.key).toLowerCase())) {
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+D or Ctrl+M to toggle Dynamic Island mode
    if ((e.ctrlKey && e.shiftKey && (e.code === 'KeyD' || e.key.toLowerCase() === 'd')) ||
        (e.ctrlKey && !e.shiftKey && (e.code === 'KeyM' || e.key.toLowerCase() === 'm'))) {
      e.preventDefault();
      toggleDynamicIslandMode();
    }
    // Ctrl+Shift+W to toggle Wallpaper mode
    if (e.ctrlKey && e.shiftKey && (e.code === 'KeyW' || e.key.toLowerCase() === 'w')) {
      e.preventDefault();
      toggleWallpaperMode();
    }
    // Ctrl+Shift+B to toggle Taskbar mode
    if (e.ctrlKey && e.shiftKey && (e.code === 'KeyB' || e.key.toLowerCase() === 'b')) {
      e.preventDefault();
      toggleTaskbarMode();
    }
    // Ctrl+Shift+C toggles cinematic view; Ctrl+Shift+K toggles kinetic mode.
    if (e.ctrlKey && e.shiftKey && (e.code === 'KeyC' || e.key.toLowerCase() === 'c')) {
      e.preventDefault();
      toggleCinematicView();
    }
    if (e.ctrlKey && e.shiftKey && (e.code === 'KeyK' || e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      toggleKineticMode();
    }
    // Ctrl+Shift+T to cycle Dynamic Island translation mode
    if (e.ctrlKey && e.shiftKey && (e.code === 'KeyT' || e.key.toLowerCase() === 't')) {
      e.preventDefault();
      cycleIslandTranslationMode();
    }
    // Ctrl+Alt+R to reset window size to standard (780x560)
    if (e.ctrlKey && e.altKey && (e.code === 'KeyR' || e.key.toLowerCase() === 'r')) {
      e.preventDefault();
      if (window.electronAPI && typeof window.electronAPI.resetWindowSize === 'function') {
        window.electronAPI.resetWindowSize();
      }
    }
    // Ctrl+Alt+S to toggle Studio Split-View Layout (Option A)
    if (e.ctrlKey && e.altKey && (e.code === 'KeyS' || e.key.toLowerCase() === 's')) {
      e.preventDefault();
      toggleStudioSplit();
    }
    // Ctrl+Shift+S to open Share Card Studio (Coming Soon)
    if (e.ctrlKey && e.shiftKey && (e.code === 'KeyS' || e.key.toLowerCase() === 's')) {
      e.preventDefault();
      _openShareWithIslandInterop(activeLineIndex);
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
      const canonKey = getCanonicalTrackKey(currentPlayingTrackObj);
      if (canonKey) settings.trackOffsets[canonKey] = settings.syncOffsetMs;
      saveLocalSettings();
    });
  }
  if (btnResetOffset) {
    btnResetOffset.addEventListener("click", () => {
      settings.syncOffsetMs = 0;
      if (!settings.trackOffsets) settings.trackOffsets = {};
      if (currentTrackId) settings.trackOffsets[currentTrackId] = 0;
      const canonKey = getCanonicalTrackKey(currentPlayingTrackObj);
      if (canonKey) settings.trackOffsets[canonKey] = 0;
      if (inputSyncOffset) inputSyncOffset.value = 0;
      saveLocalSettings();
    });
  }

  // Hotkey listener inside DOM to unlock click-through (local fallback when focused)
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "L") {
      e.preventDefault();
      if (!window.electronAPI?.onToggleClickThroughShortcut) toggleClickThrough();
    }

    // Sync Offset Hotkeys
    if (e.altKey && e.key === '[') {
      adjustSyncOffset(-500);
    }
    if (e.altKey && e.key === ']') {
      adjustSyncOffset(500);
    }
  });

  if (btnSettings) {
    btnSettings.addEventListener("click", async () => {
      if (settingsPanel) settingsPanel.classList.add("open");
      cancelAutoHide();
      updateSpotifyUI();
      if (selectFont) selectFont.value = settings.fontFamily || 'system';
      const selTranslate = document.getElementById("select-translate");
      if (selTranslate) selTranslate.value = settings.translateLang || 'en';
      if (selectPreferredProvider) selectPreferredProvider.value = settings.preferredLyricProvider || 'lyricsplus';
      const selSkipLang = document.getElementById("select-skip-lang");
      if (selSkipLang) selSkipLang.value = settings.skipLang || 'none';
      const selIslandPos = document.getElementById("select-island-position");
      if (selIslandPos) selIslandPos.value = typeof normalizeDynamicIslandDockPosition === 'function' ? normalizeDynamicIslandDockPosition(settings.dynamicIslandPosition) : (settings.dynamicIslandPosition || 'top-center');
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

  const btnNewsRefresh = document.getElementById("btn-news-refresh");
  if (btnNewsRefresh) {
    btnNewsRefresh.addEventListener("click", () => {
      btnNewsRefresh.classList.add("spinning");
      if (typeof fetchMusicNews === 'function') {
        fetchMusicNews(true).finally(() => {
          setTimeout(() => btnNewsRefresh.classList.remove("spinning"), 600);
        });
      } else {
        setTimeout(() => btnNewsRefresh.classList.remove("spinning"), 600);
      }
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
        if (authConfig && (authConfig.sp_dc || authConfig.access_token || authConfig.success)) {
          config = authConfig;
          config.localMode = false;
          if (!config.access_token && config.sp_dc) {
            try {
              const token = await window.electronAPI.getAccessToken(config.sp_dc);
              if (token) config.access_token = token;
            } catch (e) {}
          }
          if (window.electronAPI.saveConfig) {
            await window.electronAPI.saveConfig(config);
          }
          window._spotifyUserDisplayName = null;
          await checkAndVerifySpotifyConnection();
          updateSpotifyUI();
          showToast("Successfully connected to Spotify!", 3000, 'success');
          startPolling();
  initMotionBatterySaver();
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
  initMotionBatterySaver();
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
    // In split layout with tall artwork, only wake/exit autohide for tall artwork and music controls
    // when cursor is hovered over the expanded tall art or playback controls (not when moving over lyrics)
    const isSplitLayout = document.body.classList.contains('layout-split');
    const isTallArt = document.body.classList.contains('split-tall-art') || document.body.classList.contains('has-motion-tall-art');
    const isOverTallArtOrControls = e.target && typeof e.target.closest === 'function' &&
      e.target.closest('#studio-sidebar, .studio-art-container, #playback-widget, .hud-header');

    if (isSplitLayout && document.body.classList.contains('auto-hide-controls')) {
      if (isOverTallArtOrControls) {
        resetPlaybackControlsIdleTimer();
      }
    } else {
      resetPlaybackControlsIdleTimer();
    }
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

    const isOverInteractive = e.target.closest('button, input, select, .hud-header, .playback-widget, .settings-panel, a, label, .drag-handle, .lyrics-empty-state, .modal, .share-modal, #share-card-modal, #genius-modal, .lyrics-view, #lyrics-viewport, #lyrics-container, .lyric-line');
    if (isOverInteractive) {
      setClickThroughCached(false);
    }
  });

  window.addEventListener('mouseenter', () => {
    resetPlaybackControlsIdleTimer();
    if (settings.autoHideLyrics && (isLyricsAutoHidden || isAutoHaltedTemporarily || autoHideLyricsTimer)) {
      wakeAutoHideTemporarily(4000);
    }
    setClickThroughCached(false);
  });

  window.addEventListener('pointerdown', (e) => {
    resetPlaybackControlsIdleTimer();
    const widget = document.getElementById('playback-widget');
    if (widget && e.target && widget.contains(e.target)) {
      setTimeout(() => {
        if (document.activeElement && 
            document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA' &&
            document.activeElement.tagName !== 'SELECT' &&
            !document.activeElement.closest('.settings-panel')) {
          try { document.activeElement.blur(); } catch (_) {}
        }
      }, 0);
    }
  }, { passive: true });
  window.addEventListener('pointerup', (e) => {
    resetPlaybackControlsIdleTimer();
    if (document.activeElement && 
        document.activeElement.tagName !== 'INPUT' && 
        document.activeElement.tagName !== 'TEXTAREA' &&
        document.activeElement.tagName !== 'SELECT' &&
        !document.activeElement.closest('.settings-panel') &&
        !(e && e.target && e.target.closest && e.target.closest('.settings-panel'))) {
      try { document.activeElement.blur(); } catch (_) {}
    }
  }, { passive: true });
  window.addEventListener('keydown', resetPlaybackControlsIdleTimer);
  resetPlaybackControlsIdleTimer();


  // Disable click-through on window focus, restore on blur (except in taskbar mode)
  if (window.electronAPI && typeof window.electronAPI.onWindowFocusChanged === 'function') {
  window.electronAPI.onWindowFocusChanged((isFocused) => {
    if (isFocused) {
      document.body.classList.remove('window-blurred');
      syncCustomBackgroundVideoPlayback();
      syncAudioVisualizerState();
      if (isPlaying) {
        schedulePlaybackInterpolation();
        ensurePlayheadLoop();
      }
      if (currentAnimatedArtInfo?.type === 'video' && !(isBatterySaverActive && settings.motionBatterySaver !== false)) {
        resumeAnimatedArtVideos();
        scheduleMotionArtFocusRecovery();
      }
      if (fluidMeshGradientInstance && shouldRunFluidMesh()) {
        fluidMeshGradientInstance.wake?.();
        if (typeof fluidMeshGradientInstance.defrost === 'function') {
          fluidMeshGradientInstance.defrost();
        } else if (isPlaying || !fluidMeshGradientInstance.isSettled?.()) {
          fluidMeshGradientInstance.start();
        }
      }
      if (isPlaying) ensurePlayheadLoop();
    } else {
      if (islandMouseLeaveTimer) {
        clearTimeout(islandMouseLeaveTimer);
        islandMouseLeaveTimer = null;
      }
      isMouseOverDynamicIsland = false;
      document.body.classList.add('window-blurred');
      if (!isDynamicIslandMode) {
        stopPlaybackInterpolation();
      }
      syncAudioVisualizerState();
      if (fluidMeshGradientInstance && !settings.wallpaperMode) {
        fluidMeshGradientInstance.stop();
      }
      syncCustomBackgroundVideoPlayback();
      const isPlaybackActive = Boolean(isPlaying);
      if (!isPlaybackActive && !settings.wallpaperMode && !isDynamicIslandMode && !settings.taskbarMode) {
        pauseAnimatedArtVideos();
      }
    }
  });
}

window.addEventListener('focus', () => {
    if (settings.taskbarMode && config) {
      return;
    }
    if (settings.autoHideLyrics) {
      wakeAutoHideTemporarily(5000);
    }
    setClickThroughCached(false);
  });

  window.addEventListener('blur', () => {
    if (settings.taskbarMode && config) {
      if (isDraggingTb) return;
      return;
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
          style: settings.taskbarStyle || 'minimal',
          taskbarStyle: settings.taskbarStyle || 'minimal',
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


  window.electronAPI.onWindowRestored(() => {
    setClickThroughCached(false);
  });


  if (window.electronAPI.onForceNormalMode) {
    window.electronAPI.onForceNormalMode(async () => {
      console.log("[Renderer] Received onForceNormalMode — switching to normal mode");
      if (isTransitioningMode || (settings && (settings.wallpaperMode || isDynamicIslandMode || isKineticMode))) {
        console.log("[Renderer] Ignoring onForceNormalMode: mode transition in progress or special mode active");
        return;
      }
      await transitionToMode('normal');
      if (isCinematicView) {
        toggleCinematicView(false);
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
      } else {
        curText = "♫";
      }
      if (curText) {
        sendTaskbarLyric(curText, false, curHtml);
      }
      if (tbProgress) {
        sendTaskbarProgress(parseFloat(tbProgress.style.width) || 0);
      }
      const currentAccent = settings.accentColor || 'green';
      const ACCENT_MAP = { green: '#1DB954', purple: '#8b5cf6', blue: '#3b82f6', rose: '#f43f5e', orange: '#f97316', teal: '#14b8a6' };
      const curTbOffset = settings.taskbarOffset !== undefined ? settings.taskbarOffset : (settings.tbOffset || 0);
      if (window.electronAPI.syncTaskbarConfig) {
        window.electronAPI.syncTaskbarConfig({
          accentColor: ACCENT_MAP[currentAccent] || '#1DB954',
          lyricOffsetX: curTbOffset,
          taskbarOffset: curTbOffset,
          style: settings.taskbarStyle || 'minimal',
          taskbarStyle: settings.taskbarStyle || 'minimal',
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
      } else {
        isWallpaperDesktopFocused = true;
      }
      if (checkWallpaperMode) checkWallpaperMode.checked = settings.wallpaperMode;
      if (settings.wallpaperMode) syncWallpaperTrackMetadata();
      // The renderer's serialized mode transition owns presentation changes.
      // Applying settings here mid-handoff can restart desktop visuals before
      // the destination mode has initialized.
      if (!isTransitioningMode) applyVisualSettings();
      saveLocalSettings();
    });
  }

  isWallpaperDesktopFocused = true;
  if (window.electronAPI && typeof window.electronAPI.onWallpaperFocusChanged === 'function') {
    window.electronAPI.onWallpaperFocusChanged((isFocused) => {
      isWallpaperDesktopFocused = Boolean(isFocused);
      if (!settings.wallpaperMode) return;

      if (!isWallpaperDesktopFocused) {
        const isPlaybackActive = Boolean(isPlaying);
        if (!isPlaybackActive) {
          stopPlaybackInterpolation();
          // Desktop wallpaper is hidden behind other active applications.
          // Suspend high-frequency canvas rendering loop to eliminate GPU/CPU utilization (0% lag).
          if (cinematicMainRendererInstance) {
            cinematicMainRendererInstance.pause();
          }
          pauseAnimatedArtVideos();
          if (typeof updateWallpaperLyricBeatBloom === 'function') {
            updateWallpaperLyricBeatBloom(0);
          }
          syncAudioVisualizerState();
        }
      } else {
        // Desktop focus returned: immediately resume rendering at current acoustic timestamp with 0ms lag!
        syncAudioVisualizerState();
        resumeAnimatedArtVideos();
        scheduleMotionArtFocusRecovery();
        try { syncActiveAnimatedVideoState(); } catch (_) {}
        schedulePlaybackInterpolation();
        const syncProgress = getAcousticSyncProgress();
        if (settings.wallpaperStyle === 'cinematic' && cinematicMainRendererInstance) {
          cinematicMainRendererInstance.seek(syncProgress);
          if (isPlaying) {
            cinematicMainRendererInstance.play();
          }
        } else {
          const curIdx = (typeof getCurrentActiveLyricIndex === 'function') ? getCurrentActiveLyricIndex() : 0;
          if (curIdx >= 0) {
            scrollLyrics(curIdx);
          }
        }
      }
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
    if (!data?.item) return;
    data.source = 'windows-smtc';
    const smtcThumb = data.item.album?.images?.[1]?.url || data.item.album?.images?.[0]?.url;
    if (smtcThumb) {
      rememberArtInMemory(data.item.id, smtcThumb, data.item.name, data.item.artists?.[0]?.name || '');
    }

    // If Spotify Web API already provided richer metadata (with ISRC, album, real Spotify ID) for this exact same song,
    // do not downgrade the active player state back to raw synthetic SMTC local_... ID!
    if (typeof lastSpotifyPlaybackData !== 'undefined' && lastSpotifyPlaybackData?.item) {
      const localTitle = (data.item.name || '').toLowerCase().trim();
      const spotTitle = (lastSpotifyPlaybackData.item.name || '').toLowerCase().trim();
      const isSameSong = localTitle && spotTitle && (localTitle === spotTitle || localTitle.includes(spotTitle) || spotTitle.includes(localTitle));

      if (isSameSong) {
        lastSpotifyPlaybackData.is_playing = data.is_playing;
        lastSpotifyPlaybackData.progress_ms = data.progress_ms;
        lastSpotifyPlaybackData.timestamp = Date.now();
        lastSpotifyPlaybackData._isLocalProgress = true;
        if (data.playback_rate) {
          lastSpotifyPlaybackData.playback_rate = data.playback_rate;
        }
        handlePlaybackData(lastSpotifyPlaybackData);
        return;
      }
    }

    const isTrackChange = data.item.id !== currentTrackId;
    // A cloud poll can finish after an SMTC event already switched the UI.
    // Drop a response that still describes the track active when the request
    // began, or it can rewind the just-selected track to stale playback data.
    lastSpotifyPlaybackData = null;

    // SMTC is the live Windows player session. Apply its track immediately so
    // lyrics lookup does not depend on a Spotify account or a successful API
    // poll. Spotify polling can enrich metadata afterward when it is available.
    handlePlaybackData(data);
    if (isTrackChange && config && !config.localMode && config.access_token) {
      pollSpotifyPlayback(true).catch(error => {
        console.warn('[SMTC] Spotify metadata enrichment failed; keeping local playback data.', error);
      });
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
        const isRecentSeek = (Date.now() - lastUserSeekTimestamp) < 2500;
        if (!isRecentSeek && typeof data.position === 'number' && data.position >= 0) {
          lastPollProgress = data.position;
          currentProgress = data.position;
        } else if (isRecentSeek) {
          if (typeof data.position === 'number' && data.position >= 0 && Math.abs(data.position - lastUserSeekTargetMs) <= 800) {
            lastPollProgress = data.position;
            currentProgress = data.position;
          } else {
            lastPollProgress = lastUserSeekTargetMs;
            currentProgress = lastUserSeekTargetMs;
          }
        } else {
          lastPollProgress = currentProgress;
        }
        window._pllRateMultiplier = 1.0;
        window._pllFilteredDrift = 0;
        lastPollTimestamp = getHighResTime();
        isPlaying = true;
        updateMemoryTargetLevel('normal');
        syncFluidMeshPlaybackState();
        ensurePlayheadLoop();
        if (cinematicMainRendererInstance && typeof cinematicMainRendererInstance.setPausedState === 'function') {
          cinematicMainRendererInstance.setPausedState(false);
          cinematicMainRendererInstance.seek(getAcousticSyncProgress());
        }
        if (btnPlaySvg) btnPlaySvg.style.display = 'none';
        if (btnPauseSvg) btnPauseSvg.style.display = 'block';
        handleTaskbarPauseAutoHide(false);
        updateAutoHideState();
        document.body.classList.toggle('is-playing', true);
        document.body.classList.toggle('app-paused', false);
        resumeAnimatedArtVideos();
        syncDynamicIslandState();
        if (isDynamicIslandMode) {
          startDynamicIslandBoundsTracking(450);
        }
        if (typeof checkVisualizerFallback === 'function') {
          checkVisualizerFallback();
        }
      }
    } else {
      // Song paused: freeze internal clock cleanly and update frame without jumping
      handleLocalOrPollPause(data.position);
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
  window.electronAPI.onTrayShowSettings(async () => {
    console.log("[Renderer] Received onTrayShowSettings — switching to normal mode and opening settings");
    await transitionToMode('normal');
    if (isCinematicView) {
      toggleCinematicView(false);
    }
    updateSpotifyUI();
    if (isSpotifyConnected()) {
      checkAndVerifySpotifyConnection().then(() => updateSpotifyUI());
    }
    const settingsPanel = document.getElementById("settings-panel");
    if (settingsPanel) {
      settingsPanel.classList.add("open");
    }
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

  if (window.electronAPI.onAdjustSyncOffset) {
    window.electronAPI.onAdjustSyncOffset((delta) => {
      adjustSyncOffset(delta);
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


  // Lyric Share Card listener uses top-level _openShareWithIslandInterop

  window.electronAPI.onShareActiveLyric(() => {
    _openShareWithIslandInterop(activeLineIndex);
  });
  bindShareOptionsDialog();
  if (btnShareLyric) {
    btnShareLyric.addEventListener("click", () => {
      openShareOptionsDialog();
    });
  }

  // Global OS-Level Mode Shortcut Listeners
  if (window.electronAPI.onToggleCinematicModeShortcut) {
    window.electronAPI.onToggleCinematicModeShortcut(() => {
      toggleCinematicView();
    });
  }

  if (window.electronAPI.onToggleDynamicIslandShortcut) {
    window.electronAPI.onToggleDynamicIslandShortcut(() => {
      toggleDynamicIslandMode();
    });
  }

  if (window.electronAPI.onToggleKineticModeShortcut) {
    window.electronAPI.onToggleKineticModeShortcut(() => {
      toggleKineticMode();
    });
  }

  if (window.electronAPI.onToggleWallpaperModeShortcut) {
    window.electronAPI.onToggleWallpaperModeShortcut(() => {
      toggleWallpaperMode();
    });
  }

  if (window.electronAPI.onToggleTaskbarModeShortcut) {
    window.electronAPI.onToggleTaskbarModeShortcut(() => {
      toggleTaskbarMode();
    });
  }

  // Interactive Settings Shortcuts Table Click Actions
  bindKeyboardShortcutEditor();
  function toggleClickThrough() {
    if (isDynamicIslandMode) {
      if (window.electronAPI && window.electronAPI.toggleDynamicIslandGhost) {
        window.electronAPI.toggleDynamicIslandGhost();
      }
    } else {
      settings.clickThrough = !settings.clickThrough;
      setClickThroughCached(settings.clickThrough);
      showToast(`Ghost mode ${settings.clickThrough ? 'enabled' : 'disabled'}`, 1800, 'info');
      saveLocalSettings();
    }
  }

  if (window.electronAPI?.onToggleClickThroughShortcut) {
    window.electronAPI.onToggleClickThroughShortcut(toggleClickThrough);
  }

  document.querySelectorAll('.shortcut-row[data-shortcut-action]').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = row.getAttribute('data-shortcut-action');
      if (!action) return;

      switch (action) {
        case 'cinematic':
          toggleCinematicView();
          showToast(`Cinematic Stage ${isCinematicView ? 'enabled' : 'disabled'}`, 1800, 'info');
          break;
        case 'kinetic':
          toggleKineticMode();
          break;
        case 'island':
          toggleDynamicIslandMode();
          break;
        case 'wallpaper':
          toggleWallpaperMode();
          break;
        case 'taskbar':
          toggleTaskbarMode();
          break;
        case 'ghost':
          toggleClickThrough();
          break;
        case 'share':
          _openShareWithIslandInterop(activeLineIndex);
          break;
        case 'copy':
          if (lyrics.length > 0 && activeLineIndex >= 0 && activeLineIndex < lyrics.length) {
            const text = lyrics[activeLineIndex].text;
            if (window.electronAPI && window.electronAPI.copyToClipboard) {
              window.electronAPI.copyToClipboard(text);
            }
            navigator.clipboard.writeText(text).catch(() => {});
            showToast("Copied: " + text, 2000, 'success');
          } else {
            showToast("No active lyric line to copy", 2000, 'warning');
          }
          break;
        case 'search':
          if (searchOverlay) {
            openLyricsSearch();
            if (settingsModal) settingsModal.style.display = "none";
          }
          break;
        case 'refetch':
          cycleAlternativeLyrics();
          break;
        case 'playpause':
          controlPlayback('play-pause');
          break;
        case 'nextprev':
          controlPlayback('next');
          break;
        case 'nudgesync':
          adjustSyncOffset(100);
          break;
      }
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        row.click();
      }
    });
  });

  // Reload / Find Alternative Lyrics listeners
  if (btnReloadLyrics) {
    btnReloadLyrics.addEventListener("click", () => {
      cycleAlternativeLyrics();
    });
  }
  if (btnRestoreLyrics) {
    btnRestoreLyrics.addEventListener('click', restorePreviousLyrics);
  }


  const syncResumeBtn = document.getElementById("sync-resume-btn");
  if (syncResumeBtn) {
    syncResumeBtn.addEventListener("click", resyncPlayback);
  }

  const btnSyncLyrics = document.getElementById("btn-sync-lyrics");
  if (btnSyncLyrics) {
    btnSyncLyrics.addEventListener("click", resyncPlayback);
  }

  // Main Player Progress Bar & Scrubber
  attachScrubberController({
    trackEl: document.getElementById("main-progress-track") || document.querySelector(".progress-bar-bg"),
    fillEl: document.getElementById("widget-progress-fill"),
    thumbEl: document.getElementById("main-progress-thumb"),
    hoverEl: document.getElementById("main-progress-hover"),
    tooltipEl: document.getElementById("main-progress-tooltip"),
    timeCurrentEl: document.getElementById("widget-time-current"),
    isIsland: false
  });

  const mainProgressContainer = document.querySelector(".playback-widget .progress-bar-container");
  if (mainProgressContainer) {
    let lastContainerSeekTimestamp = 0;
    let isDraggingContainer = false;
    let containerCachedTrackRect = null;
    let containerActivePointerId = null;
    let lastContainerRatio = 0;

    function getContainerRatio(clientX, track) {
      const rect = (isDraggingContainer && containerCachedTrackRect) ? containerCachedTrackRect : track.getBoundingClientRect();
      if (!rect || !rect.width || rect.width <= 0) return 0;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    function updateContainerVisuals(ratio, dur) {
      const percent = ratio * 100;
      setMainProgressFill(percent);
      const thumb = document.getElementById("main-progress-thumb");
      if (thumb) thumb.style.left = `${percent}%`;
      const timeCurrentEl = document.getElementById("widget-time-current");
      const currentMs = Math.round(ratio * dur);
      if (timeCurrentEl) timeCurrentEl.textContent = formatTime(currentMs);
      if (widgetTimeDuration && window._showRemainingTime) {
        const remMs = Math.max(0, dur - currentMs);
        widgetTimeDuration.textContent = `-${formatTime(remMs)}`;
      }
      lastPlaybackActivityMs = Date.now();
    }

    const onContainerWindowPointerUpFallback = (e) => {
      if (isDraggingContainer) {
        commitContainerSeek(e);
      }
    };

    const onContainerWindowPointerCancelFallback = (e) => {
      if (isDraggingContainer) {
        commitContainerSeek(e);
      }
    };

    const onContainerWindowPointerMoveFallback = (e) => {
      if (!isDraggingContainer) return;
      handleContainerPointerMove(e);
    };

    const onContainerPointerDown = (e) => {
      if (e.button !== 0 && e.button !== undefined) return;
      if (settings.progressBarSeek === false) return;
      if (e.target.closest(".progress-time")) return;
      const track = document.getElementById("main-progress-track");
      if (!track || e.target === track || track.contains(e.target)) return;

      if (Date.now() - lastContainerSeekTimestamp < 300) return;

      let dur = trackDuration;
      if (dur <= 0) {
        dur = getEffectiveTrackDuration();
        if (dur > 0) trackDuration = dur;
        else return;
      }

      e.preventDefault();
      e.stopPropagation();

      isDraggingContainer = true;
      isScrubbingMainProgress = true;
      containerActivePointerId = e.pointerId;
      containerCachedTrackRect = track.getBoundingClientRect();
      track.classList.add("is-scrubbing");

      try {
        mainProgressContainer.setPointerCapture(e.pointerId);
      } catch (_) {}

      window.addEventListener("pointerup", onContainerWindowPointerUpFallback, { passive: false });
      window.addEventListener("pointercancel", onContainerWindowPointerCancelFallback, { passive: false });
      window.addEventListener("pointermove", onContainerWindowPointerMoveFallback, { passive: false });

      const ratio = getContainerRatio(e.clientX, track);
      lastContainerRatio = ratio;
      updateContainerVisuals(ratio, dur);
    };

    function handleContainerPointerMove(e) {
      if (!isDraggingContainer) return;
      let dur = trackDuration;
      if (dur <= 0) {
        dur = getEffectiveTrackDuration();
        if (dur > 0) trackDuration = dur;
        else return;
      }

      e.preventDefault();
      e.stopPropagation();

      const track = document.getElementById("main-progress-track");
      if (!track) return;
      const ratio = getContainerRatio(e.clientX, track);
      lastContainerRatio = ratio;
      updateContainerVisuals(ratio, dur);
    }

    function commitContainerSeek(e) {
      if (!isDraggingContainer) return;
      if (e) {
        try { e.preventDefault(); } catch (_) {}
        try { e.stopPropagation(); } catch (_) {}
      }

      window.removeEventListener("pointerup", onContainerWindowPointerUpFallback);
      window.removeEventListener("pointercancel", onContainerWindowPointerCancelFallback);
      window.removeEventListener("pointermove", onContainerWindowPointerMoveFallback);

      const track = document.getElementById("main-progress-track");
      let dur = trackDuration;
      if (dur <= 0) {
        dur = getEffectiveTrackDuration();
        if (dur > 0) trackDuration = dur;
      }

      let ratio = lastContainerRatio;
      if (e && typeof e.clientX === "number" && e.clientX !== 0 && track) {
        ratio = getContainerRatio(e.clientX, track);
      }
      const seekMs = dur > 0 ? Math.round(ratio * dur) : 0;

      isDraggingContainer = false;
      isScrubbingMainProgress = false;
      containerCachedTrackRect = null;
      if (track) track.classList.remove("is-scrubbing");

      const pointerIdToRelease = (e && e.pointerId != null) ? e.pointerId : containerActivePointerId;
      if (pointerIdToRelease != null && typeof mainProgressContainer.releasePointerCapture === "function") {
        try { mainProgressContainer.releasePointerCapture(pointerIdToRelease); } catch (_) {}
      }
      containerActivePointerId = null;

      lastContainerSeekTimestamp = Date.now();
      lastPlaybackActivityMs = Date.now();
      seekPlayback(seekMs);
    }

    mainProgressContainer.addEventListener("pointerdown", onContainerPointerDown);
    mainProgressContainer.addEventListener("pointermove", handleContainerPointerMove);
    mainProgressContainer.addEventListener("pointerup", commitContainerSeek);
    mainProgressContainer.addEventListener("pointercancel", commitContainerSeek);
    mainProgressContainer.addEventListener("lostpointercapture", (e) => {
      if (isDraggingContainer) commitContainerSeek(e);
    });

    // Suppress native click to prevent duplicate seek invocations when pointerup commits seek
    mainProgressContainer.addEventListener("click", (e) => {
      if (e.target.closest(".progress-time")) return;
      const track = document.getElementById("main-progress-track");
      if (track && (e.target === track || track.contains(e.target))) return;
      e.preventDefault();
      e.stopPropagation();
    });
  }

  // Keyboard Shortcuts for Modes, Playback, Sync Nudging & Reload
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    const hasNativeModeShortcuts = Boolean(window.electronAPI?.onToggleDynamicIslandShortcut);
    const keyLower = String(e.key).toLowerCase();
    const nativeGlobalCombo = hasNativeModeShortcuts && (
      (e.ctrlKey && e.shiftKey && ['c', 'd', 'w', 'b', 'k', 'g', 's'].includes(keyLower)) ||
      (e.ctrlKey && e.altKey && (keyLower === 'c' || keyLower === ' ' || e.code === 'Space' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
      (e.shiftKey && !e.ctrlKey && !e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key))
    );
    if (nativeGlobalCombo) {
      e.preventDefault();
      return;
    }

    // Modes & Overlays
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      toggleCinematicView();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      toggleKineticMode();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      toggleDynamicIslandMode();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'w' || e.key === 'W')) {
      e.preventDefault();
      toggleWallpaperMode();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleTaskbarMode();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
      e.preventDefault();
      toggleClickThrough();
      return;
    }

    // Copy Active Lyric
    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      if (lyrics.length > 0 && activeLineIndex >= 0 && activeLineIndex < lyrics.length) {
        const text = lyrics[activeLineIndex].text;
        if (window.electronAPI && window.electronAPI.copyToClipboard) {
          window.electronAPI.copyToClipboard(text);
        }
        navigator.clipboard.writeText(text).catch(() => {});
        showToast("Copied: " + text, 2000, 'success');
      }
      return;
    }

    // Playback Controls
    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.code === 'Space' || e.key === ' ')) {
      e.preventDefault();
      controlPlayback('play-pause');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'ArrowRight')) {
      e.preventDefault();
      controlPlayback('next');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'ArrowLeft')) {
      e.preventDefault();
      controlPlayback('previous');
      return;
    }

    if (((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) || e.key === 'F5') {
      e.preventDefault();
      cycleAlternativeLyrics();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      _openShareWithIslandInterop(activeLineIndex);
      return;
    }

    if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowDown')) {
      e.preventDefault();
      adjustSyncOffset(-100);
      return;
    } else if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowUp')) {
      e.preventDefault();
      adjustSyncOffset(100);
      return;
    } else if (e.key === 'ArrowLeft') {
      adjustSyncOffset(-100);
    } else if (e.key === 'ArrowRight') {
      adjustSyncOffset(100);
    }
  });

  // Ctrl+F Lyrics Search & Escape Handling
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      if (settings.taskbarMode) return;
      e.preventDefault();
      if (searchOverlay.style.display === "none") {
        openLyricsSearch();
      } else {
        closeSearch();
      }
    }
    if (e.key === 'Escape') {
      if (settings.wallpaperMode) {
        e.preventDefault();
        toggleWallpaperMode(false);
      }
      if (searchOverlay.style.display !== "none") {
        closeSearch();
      }
      const artModal = document.getElementById("album-art-modal");
      if (artModal && artModal.classList.contains("show")) {
        hideAlbumArtModal();
      }
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
  let searchHighlightedLines = [];
  let searchFrameId = null;
  let searchGeneration = 0;
  const lyricsSearchResults = document.getElementById('lyrics-search-results');
  let catalogSearchTimer = null;
  let catalogSearchController = null;
  let catalogSearchGeneration = 0;
  let catalogLyricsGeneration = 0;
  let catalogSearchTracks = [];
  let fetchFirstCatalogResultWhenReady = false;

  function cancelCatalogSearch(clearTracks = false) {
    catalogSearchGeneration += 1;
    catalogLyricsGeneration += 1;
    if (catalogSearchTimer !== null) {
      clearTimeout(catalogSearchTimer);
      catalogSearchTimer = null;
    }
    if (catalogSearchController) {
      catalogSearchController.abort();
      catalogSearchController = null;
    }
    fetchFirstCatalogResultWhenReady = false;
    if (clearTracks) catalogSearchTracks = [];
  }

  function renderCatalogTrackMatches(tracks) {
    if (!lyricsSearchResults) return;
    lyricsSearchResults.replaceChildren();
    lyricsSearchResults.hidden = tracks.length === 0;

    tracks.forEach((track) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lyrics-search-result';

      const copy = document.createElement('span');
      copy.className = 'lyrics-search-result-copy';
      const title = document.createElement('strong');
      title.textContent = track.trackName;
      const artist = document.createElement('span');
      artist.textContent = [track.artistName, track.collectionName].filter(Boolean).join(' · ');
      copy.append(title, artist);

      const action = document.createElement('span');
      action.className = 'lyrics-search-result-action';
      action.textContent = 'Find lyrics';
      button.append(copy, action);
      button.addEventListener('click', () => { void fetchCatalogTrackLyrics(track); });
      lyricsSearchResults.appendChild(button);
    });
  }

  function renderCatalogLyricsPreview(track, candidate, lines) {
    if (!lyricsSearchResults) return;
    lyricsSearchResults.replaceChildren();
    lyricsSearchResults.hidden = false;

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'lyrics-search-back';
    back.textContent = '← Back to song matches';
    back.addEventListener('click', () => {
      renderCatalogTrackMatches(catalogSearchTracks);
      if (searchResultsInfo) searchResultsInfo.textContent = 'Choose a song to fetch its lyrics';
    });

    const preview = document.createElement('div');
    preview.className = 'lyrics-search-preview';
    const heading = document.createElement('div');
    heading.className = 'lyrics-search-preview-heading';
    const title = document.createElement('strong');
    title.textContent = `${track.trackName} · ${track.artistName}`;
    const syncType = String(candidate.syncType || 'UNSYNCED').replaceAll('_', ' ').toLowerCase();
    const source = document.createElement('span');
    source.textContent = `${candidate.provider || 'Lyrics provider'} · ${syncType}`;
    heading.append(title, source);
    preview.appendChild(heading);

    lines.forEach((line) => {
      const text = typeof line === 'string'
        ? line
        : (line?.text || (Array.isArray(line?.words) ? line.words.map((word) => word?.text || '').join('') : ''));
      if (!String(text).trim()) return;
      const row = document.createElement('div');
      row.className = 'lyrics-search-preview-line';
      row.textContent = String(text);
      preview.appendChild(row);
    });

    lyricsSearchResults.append(back, preview);
  }

  async function fetchCatalogTrackLyrics(track) {
    if (!track || !window.electronAPI?.searchSyncedLyrics) {
      if (searchResultsInfo) searchResultsInfo.textContent = 'Lyrics search is unavailable in this runtime.';
      return;
    }

    cancelCatalogSearch();
    const requestGeneration = ++catalogLyricsGeneration;
    if (lyricsSearchResults) {
      lyricsSearchResults.replaceChildren();
      lyricsSearchResults.hidden = false;
    }
    if (searchResultsInfo) searchResultsInfo.textContent = `Searching lyrics for ${track.trackName}…`;

    try {
      const candidate = await window.electronAPI.searchSyncedLyrics(
        track.trackName,
        track.artistName,
        Math.max(0, Math.round(Number(track.trackTimeMillis) || 0)),
        {
          preferredProviders: settings.preferredLyricProviders || [],
          musixmatchToken: settings.musixmatchUserToken || null,
          spotifyToken: config?.access_token || null,
          candidateIndex: 0,
          neteaseWordByWord: settings.neteaseWordByWord !== false
        }
      );
      if (requestGeneration !== catalogLyricsGeneration) return;

      let lines = Array.isArray(candidate?.parsedLines) ? candidate.parsedLines : [];
      if (lines.length === 0 && candidate?.rawLRC) lines = parseLRC(candidate.rawLRC);
      if (!candidate || lines.length === 0) {
        if (searchResultsInfo) searchResultsInfo.textContent = `No lyrics found for ${track.trackName}. Try another match.`;
        renderCatalogTrackMatches(catalogSearchTracks);
        return;
      }

      if (searchResultsInfo) searchResultsInfo.textContent = `${lines.length} lyric lines`;
      renderCatalogLyricsPreview(track, candidate, lines);
    } catch (error) {
      if (requestGeneration !== catalogLyricsGeneration) return;
      console.warn('[Lyrics Search] Provider lookup failed:', error);
      if (searchResultsInfo) searchResultsInfo.textContent = 'Could not search lyrics. Check your connection and try again.';
      renderCatalogTrackMatches(catalogSearchTracks);
    }
  }

  function searchCatalogTracks(rawQuery, { immediate = false, fetchFirst = false } = {}) {
    cancelCatalogSearch(true);
    cancelLyricsSearch();
    clearLyricsSearchHighlights();
    const query = String(rawQuery || '').trim();
    fetchFirstCatalogResultWhenReady = Boolean(fetchFirst);
    if (lyricsSearchResults) {
      lyricsSearchResults.replaceChildren();
      lyricsSearchResults.hidden = !query;
    }

    if (!query) {
      if (searchResultsInfo) searchResultsInfo.textContent = 'Search by song or artist';
      return;
    }

    const requestGeneration = catalogSearchGeneration;
    if (searchResultsInfo) searchResultsInfo.textContent = 'Searching songs…';

    const performSearch = async () => {
      catalogSearchTimer = null;
      if (requestGeneration !== catalogSearchGeneration) return;
      const controller = new AbortController();
      catalogSearchController = controller;
      try {
        const params = new URLSearchParams({ term: query, entity: 'song', media: 'music', limit: '8', country: 'US' });
        const response = await fetch(`https://itunes.apple.com/search?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Song lookup returned ${response.status}`);
        const payload = await response.json();
        if (requestGeneration !== catalogSearchGeneration) return;

        catalogSearchTracks = (Array.isArray(payload.results) ? payload.results : [])
          .filter((item) => item.trackName && item.artistName)
          .slice(0, 8);
        if (catalogSearchTracks.length === 0) {
          if (searchResultsInfo) searchResultsInfo.textContent = 'No matching songs found. Try a song title or artist.';
          return;
        }

        renderCatalogTrackMatches(catalogSearchTracks);
        if (fetchFirstCatalogResultWhenReady) {
          fetchFirstCatalogResultWhenReady = false;
          void fetchCatalogTrackLyrics(catalogSearchTracks[0]);
        } else if (searchResultsInfo) {
          searchResultsInfo.textContent = 'Choose a song to fetch its lyrics';
        }
      } catch (error) {
        if (requestGeneration !== catalogSearchGeneration || error?.name === 'AbortError') return;
        console.warn('[Lyrics Search] Song lookup failed:', error);
        if (searchResultsInfo) searchResultsInfo.textContent = 'Song search failed. Check your connection and try again.';
      } finally {
        if (requestGeneration === catalogSearchGeneration) catalogSearchController = null;
      }
    };

    if (immediate) void performSearch();
    else catalogSearchTimer = setTimeout(performSearch, 280);
  }

  function cancelLyricsSearch() {
    searchGeneration += 1;
    if (searchFrameId !== null) {
      cancelAnimationFrame(searchFrameId);
      searchFrameId = null;
    }
  }

  function clearLyricsSearchHighlights() {
    searchHighlightedLines.forEach((lineEl) => lineEl?.classList.remove("search-match"));
    searchHighlightedLines = [];
    currentSearchMatches = [];
  }

  function searchLyricsInBatches(rawQuery) {
    cancelLyricsSearch();
    clearLyricsSearchHighlights();

    const query = String(rawQuery || "").toLowerCase();
    if (!query) {
      if (searchResultsInfo) searchResultsInfo.textContent = "0 matches";
      return;
    }

    const generation = searchGeneration;
    const sourceLines = cachedLineEls;
    const sourceLyrics = lyrics;
    const matches = [];
    let cursor = 0;

    const scanChunk = () => {
      searchFrameId = null;
      if (generation !== searchGeneration) return;
      if (sourceLines !== cachedLineEls || sourceLyrics !== lyrics || !lyricsContainer) return;

      const deadline = performance.now() + 4;
      let processed = 0;
      while (cursor < sourceLines.length && processed < 120 && performance.now() < deadline) {
        const lineEl = sourceLines[cursor++];
        processed += 1;
        const lyricIndex = Number.parseInt(lineEl?.dataset?.index, 10);
        if (!lineEl || !Number.isInteger(lyricIndex) || !sourceLyrics[lyricIndex]) continue;

        if (lineEl.textContent.toLowerCase().includes(query)) {
          lineEl.classList.add("search-match");
          searchHighlightedLines.push(lineEl);
          matches.push(lyricIndex);
        }
      }

      currentSearchMatches = matches;
      if (searchResultsInfo) {
        searchResultsInfo.textContent = cursor < sourceLines.length ? "Searching…" : `${matches.length} matches`;
      }

      if (cursor < sourceLines.length) {
        searchFrameId = requestAnimationFrame(scanChunk);
      }
    };

    if (searchResultsInfo) searchResultsInfo.textContent = "Searching…";
    searchFrameId = requestAnimationFrame(scanChunk);
  }

  if (inputSearchLyrics) {
    inputSearchLyrics.addEventListener("input", (e) => {
      if (searchOverlay?.dataset.searchMode === 'catalog') {
        searchCatalogTracks(e.target.value);
      } else {
        cancelCatalogSearch(true);
        searchLyricsInBatches(e.target.value);
      }
    });

    inputSearchLyrics.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && searchOverlay?.dataset.searchMode === 'catalog') {
        e.preventDefault();
        if (catalogSearchTracks.length > 0) {
          void fetchCatalogTrackLyrics(catalogSearchTracks[0]);
        } else {
          searchCatalogTracks(inputSearchLyrics.value, { immediate: true, fetchFirst: true });
        }
        return;
      }

      if (e.key === "Enter" && currentSearchMatches.length > 0) {
        const targetIndex = currentSearchMatches[0];
        const targetLine = lyrics[targetIndex];
        if (targetLine) {
          const timeMs = targetLine.timeMs;
          if (config && config.localMode) {
            lastPollProgress = timeMs;
            lastPollTimestamp = getHighResTime();
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
    if (searchOverlay) {
      searchOverlay.dataset.searchMode = 'local';
      searchOverlay.classList.remove('lyrics-track-search-active');
    }
    cancelCatalogSearch(true);
    if (lyricsSearchResults) {
      lyricsSearchResults.replaceChildren();
      lyricsSearchResults.hidden = true;
    }
    cancelLyricsSearch();
    clearLyricsSearchHighlights();
    if (searchResultsInfo) searchResultsInfo.textContent = "0 matches";
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

function bindKeyboardShortcutEditor() {
  const defaults = {
    cinematic: 'ctrl+shift+c', share: 'ctrl+shift+s', island: 'ctrl+shift+d',
    kinetic: 'ctrl+shift+k', wallpaper: 'ctrl+shift+w', taskbar: 'ctrl+shift+b',
    copy: 'ctrl+alt+c'
  };
  document.querySelectorAll('.shortcut-row[data-shortcut-action]').forEach(row => {
    const action = row.dataset.shortcutAction;
    if (!Object.hasOwn(defaults, action) || row.querySelector('.shortcut-change-btn')) return;
    const badge = row.querySelector('kbd');
    if (!badge) return;
    const initial = settings.keyboardShortcuts?.[action] || defaults[action];
    badge.textContent = formatShortcutLabel(initial);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shortcut-change-btn';
    button.textContent = 'Change';
    button.setAttribute('aria-label', `Change ${action} shortcut`);
    badge.after(button);
    button.addEventListener('click', event => {
      event.stopPropagation();
      button.textContent = 'Press keys…';
      button.classList.add('is-recording');
      const capture = async keyEvent => {
        if (keyEvent.key === 'Escape') {
          keyEvent.preventDefault();
          document.removeEventListener('keydown', capture, true);
          button.textContent = 'Change';
          button.classList.remove('is-recording');
          return;
        }
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(keyEvent.key)) return;
        const key = keyEvent.code.startsWith('Key') ? keyEvent.code.slice(3).toLowerCase()
          : keyEvent.code.startsWith('Digit') ? keyEvent.code.slice(5)
          : ({ Space: 'space', ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Backquote: 'grave' }[keyEvent.code] || keyEvent.key.toLowerCase());
        const parts = [];
        if (keyEvent.ctrlKey) parts.push('ctrl');
        if (keyEvent.altKey) parts.push('alt');
        if (keyEvent.shiftKey) parts.push('shift');
        if (keyEvent.metaKey) parts.push('super');
        if (!parts.length || !/^[a-z0-9]+$/.test(key)) {
          keyEvent.preventDefault();
          button.textContent = 'Use modifier + key';
          setTimeout(() => { if (button.isConnected) button.textContent = 'Press keys…'; }, 1000);
          return;
        }
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        document.removeEventListener('keydown', capture, true);
        const spec = [...parts, key].join('+');
        const result = await window.electronAPI?.invoke?.('rebind_global_shortcut', { action, shortcut: spec });
        button.classList.remove('is-recording');
        if (result) {
          settings.keyboardShortcuts = { ...(settings.keyboardShortcuts || {}), [action]: spec };
          badge.textContent = formatShortcutLabel(spec);
          button.textContent = 'Change';
          saveLocalSettings();
          showToast(`Shortcut changed to ${formatShortcutLabel(spec)}`, 2000, 'success');
        } else {
          button.textContent = 'Change';
          showToast('Shortcut unavailable or already in use.', 2200, 'warning');
        }
      };
      document.addEventListener('keydown', capture, true);
    });
  });
  const saved = settings.keyboardShortcuts || {};
  Object.entries(saved).forEach(([action, shortcut]) => {
    if (defaults[action] && shortcut !== defaults[action]) {
      window.electronAPI?.invoke?.('rebind_global_shortcut', { action, shortcut });
    }
  });
}

function formatShortcutLabel(spec) {
  return String(spec || '').split('+').map(part => ({ ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', super: 'Win', space: 'Space', left: '←', right: '→', up: '↑', down: '↓' }[part.toLowerCase()] || part.toUpperCase())).join(' + ');
}

tbPauseHideTimer = null;
isTbPlaybackHidden = false;

function sendTaskbarLyric(text, hidden = false, html = null, wordStates = null) {
  if (!settings.taskbarMode || !window.electronAPI.updateTaskbarLyric) return;
  if (!hidden && tbPauseHideTimer) {
    clearTimeout(tbPauseHideTimer);
    tbPauseHideTimer = null;
  }
  isTbPlaybackHidden = !!hidden;
  window.electronAPI.updateTaskbarLyric({ text, hidden, html, wordStates, isPlaying });
}

function handleTaskbarPauseAutoHide(isPaused) {
  if (settings.taskbarMode && window.electronAPI.updateTaskbarLyric) {
    window.electronAPI.updateTaskbarLyric({ isPlaying: !isPaused });
  }
  if (!settings.taskbarMode || settings.autoHideTaskbarOnPause === false) {
    if (tbPauseHideTimer) {
      clearTimeout(tbPauseHideTimer);
      tbPauseHideTimer = null;
    }
    if (isTbPlaybackHidden) {
      isTbPlaybackHidden = false;
      const curText = (tbLyricLine && tbLyricLine.textContent) ? tbLyricLine.textContent : "";
      if (window.electronAPI.updateTaskbarLyric) {
        window.electronAPI.updateTaskbarLyric({ text: curText, hidden: false, isPlaying: !isPaused });
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
          window.electronAPI.updateTaskbarLyric({ text: "", progress: 0, hidden: true, isPlaying: false });
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
        window.electronAPI.updateTaskbarLyric({ text: curText, hidden: false, isPlaying: true });
      }
    }
  }
}

lastTbProgressTime = 0;
function sendTaskbarProgress(pct) {
  if (!settings.taskbarMode || !window.electronAPI.updateTaskbarLyric || isTbPlaybackHidden) return;
  const now = Date.now();
  if (now - lastTbProgressTime < 250) return; // Taskbar progress is capped at 4 IPC updates per second.
  lastTbProgressTime = now;
  window.electronAPI.updateTaskbarLyric({ progress: pct, isPlaying });
}

autoHideLyricsTimer = null;
isLyricsAutoHidden = false;

function wakeAutoHideTemporarily(durationMs = 3500) {
  if (!settings.autoHideLyrics || settings.taskbarMode || settings.wallpaperMode || isDynamicIslandMode) return;

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
  if (!settings.autoHideLyrics || settings.taskbarMode || settings.wallpaperMode || isDynamicIslandMode) return false;
  if (settings.layoutSplit) return false;
  if (typeof document !== "undefined" && document.hasFocus && document.hasFocus()) return false;
  if (settingsPanel && settingsPanel.classList.contains("open")) return false;
  if (searchOverlay && searchOverlay.style.display !== "none") return false;
  if (geniusModal && geniusModal.classList.contains("show")) return false;
  if (isAutoHaltedTemporarily) return false;
  if (isFetchingLyrics || (inFlightLyricsRequests && inFlightLyricsRequests.size > 0)) return false;

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
  if (!settings.autoHideLyrics || settings.taskbarMode || settings.wallpaperMode || isDynamicIslandMode) {
    cancelAutoHide();
    return;
  }

  if (typeof document !== "undefined" && document.hasFocus && document.hasFocus()) {
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
    setClickThroughCached(false);

  }
}


// Navigation Screens

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
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>Screen ${idx + 1} <span style="font-size: 10.5px; opacity: 0.75;">(${m.width}×${m.height}${m.is_primary ? ' - Primary' : ''})</span>`;
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
    spanBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>All Screens <span style="font-size: 10.5px; opacity: 0.75;">(Span / Every Screen)</span>`;
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

      const wpBar = document.querySelector('.liquid-glass-bar[data-target="select-wallpaper-monitor"]');
      if (wpBar) {
        wpBar.innerHTML = '';
        monitors.forEach((m, idx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `liquid-bar-segment ${String(idx) === currentPick ? 'active' : ''}`;
          btn.dataset.val = String(idx);
          btn.textContent = `Screen ${idx + 1}${m.is_primary ? ' (Primary)' : ''}`;
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            selectSettingsMon.value = String(idx);
            selectSettingsMon.dispatchEvent(new Event('change', { bubbles: true }));
          });
          wpBar.appendChild(btn);
        });
        const allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.className = `liquid-bar-segment ${currentPick === 'all' ? 'active' : ''}`;
        allBtn.dataset.val = 'all';
        allBtn.textContent = 'All Screens (Span)';
        allBtn.addEventListener('click', (e) => {
          e.preventDefault();
          selectSettingsMon.value = 'all';
          selectSettingsMon.dispatchEvent(new Event('change', { bubbles: true }));
        });
        wpBar.appendChild(allBtn);
      }
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
  const wpBar = document.querySelector('.liquid-glass-bar[data-target="select-wallpaper-monitor"]');
  if (wpBar) {
    wpBar.querySelectorAll('.liquid-bar-segment').forEach(seg => {
      seg.classList.toggle('active', seg.dataset.val === selectedId);
    });
  }
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
    const obCardIsland = document.getElementById('ob-card-island');
    const obBadgeStandard = document.getElementById('ob-badge-standard');
    const obBadgeTaskbar = document.getElementById('ob-badge-taskbar');
    const obBadgeWallpaper = document.getElementById('ob-badge-wallpaper');
    const obBadgeIsland = document.getElementById('ob-badge-island');
    const obWallpaperMonitorSection = document.getElementById('ob-wallpaper-monitor-section');

    const initialMode = settings.dynamicIslandMode ? 'island' : (settings.wallpaperMode ? 'wallpaper' : (settings.taskbarMode ? 'taskbar' : 'standard'));

    [obCardStandard, obCardTaskbar, obCardWallpaper, obCardIsland].forEach(c => {
      if (c) {
        c.classList.remove('selected');
        c.style.borderColor = 'rgba(255,255,255,0.1)';
      }
    });
    [obBadgeStandard, obBadgeTaskbar, obBadgeWallpaper, obBadgeIsland].forEach(b => {
      if (b) {
        b.textContent = 'Select';
        b.style.background = 'rgba(255,255,255,0.08)';
        b.style.color = 'rgba(255,255,255,0.8)';
        b.style.fontWeight = '600';
      }
    });

    if (initialMode === 'island' && obCardIsland && obBadgeIsland) {
      obCardIsland.classList.add('selected');
      obCardIsland.style.borderColor = '#1DB954';
      obBadgeIsland.textContent = 'Selected';
      obBadgeIsland.style.background = '#1DB954';
      obBadgeIsland.style.color = '#000';
      obBadgeIsland.style.fontWeight = '700';
      if (obWallpaperMonitorSection) obWallpaperMonitorSection.style.display = 'none';
    } else if (initialMode === 'wallpaper' && obCardWallpaper && obBadgeWallpaper) {
      obCardWallpaper.classList.add('selected');
      obCardWallpaper.style.borderColor = '#1DB954';
      obBadgeWallpaper.textContent = 'Selected';
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
      obBadgeTaskbar.textContent = 'Selected';
      obBadgeTaskbar.style.background = '#1DB954';
      obBadgeTaskbar.style.color = '#000';
      obBadgeTaskbar.style.fontWeight = '700';
      if (obWallpaperMonitorSection) obWallpaperMonitorSection.style.display = 'none';
    } else if (obCardStandard && obBadgeStandard) {
      obCardStandard.classList.add('selected');
      obCardStandard.style.borderColor = '#1DB954';
      obBadgeStandard.textContent = 'Selected';
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
  const screenLoading = document.getElementById("screen-loading");
  if (screenLoading) {
    screenLoading.classList.remove("active");
    screenLoading.style.display = "none";
  }
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
    screenLyrics.style.display = "";
  }

  settings.firstRun = false;
  saveLocalSettings();

  startPolling();
  initMotionBatterySaver();

  // Set default window properties from settings on start
  setClickThroughCached(false);


  // Apply visual settings (including taskbarMode toggles) after config is set
  applyVisualSettings(false, isStartupMode || isTaskbarActiveInHost || settings.taskbarMode);

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
currentPollGeneration = 0;
isPollInProgress = false;

function startPolling() {
  stopPolling();
  const generation = ++currentPollGeneration;

  const getInterval = () => {
    if (config && config.localMode) return 800;
    if (isPlaying && trackDuration > 0 && currentProgress > 0 && (trackDuration - currentProgress <= 3500)) {
      return 400; // Poll faster when approaching track end for instantaneous next song detection
    }
    return 800;
  };

  const pollLoop = async () => {
    if (generation !== currentPollGeneration) return;
    if (isPollInProgress) {
      if (pollingIntervalId) {
        pollingIntervalId = setTimeout(pollLoop, 150);
      }
      return;
    }
    isPollInProgress = true;
    try {
      await pollSpotifyPlayback();
    } finally {
      isPollInProgress = false;
    }
    if (generation === currentPollGeneration && pollingIntervalId !== null) {
      pollingIntervalId = setTimeout(pollLoop, getInterval());
    }
  };

  pollingIntervalId = setTimeout(pollLoop, 0);
}

function stopPolling() {
  currentPollGeneration++;
  if (pollingIntervalId) {
    clearTimeout(pollingIntervalId);
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

  // Rate-limit cooldown guard
  if (window._spotifyRateLimitUntil && Date.now() < window._spotifyRateLimitUntil) {
    await pollLocalPlayback();
    return;
  }

  // Missing or expired token proactive acquisition
  if (!config.access_token) {
    if (config.sp_dc && (!window._spotifyTokenFailUntil || Date.now() > window._spotifyTokenFailUntil)) {
      try {
        config.access_token = await window.electronAPI.getAccessToken(config.sp_dc);
        if (config.access_token) {
          window.electronAPI.saveConfig(config);
        } else {
          window._spotifyTokenFailUntil = Date.now() + 30000;
        }
      } catch (e) {
        window._spotifyTokenFailUntil = Date.now() + 30000;
      }
    }
    if (!config.access_token) {
      await pollLocalPlayback();
      return;
    }
  }

  try {
    const fetchStart = Date.now();
    // Launch SMTC query concurrently with network round-trip to eliminate serial latency
    // Protected with resilient 800ms race timeout to prevent IPC congestion while guaranteeing prompt detection
    const localPlaybackPromise = (window.electronAPI && typeof window.electronAPI.getLocalPlayback === 'function')
      ? Promise.race([
          window.electronAPI.getLocalPlayback(),
          new Promise((resolve) => setTimeout(() => resolve(null), 800))
        ]).catch(() => null)
      : Promise.resolve(null);

    // FAST-PATH INSTANT TRACK DETECTION:
    // If local SMTC detects that the current song has changed (or on startup with !currentTitle), dispatch immediately (<20ms)
    // without stalling for Spotify Web API's 800ms-2000ms cloud network round-trip!
    let localData = null;
    try {
      localData = await localPlaybackPromise;
      if (localData && localData.item) {
        localData.source = 'windows-smtc';
        const localTitle = (localData.item.name || '').toLowerCase().trim();
        const currentTitle = (currentPlayingTrackObj && (currentPlayingTrackObj.name || currentPlayingTrackObj.title) || '').toLowerCase().trim();
        const isSongChanged = !currentTitle || (localTitle && localTitle !== currentTitle && !localTitle.includes(currentTitle) && !currentTitle.includes(localTitle));

        if (isSongChanged) {
          lastSpotifyPlaybackData = null;
          handlePlaybackData(localData);
          return;
        }
      }
    } catch (_) {}

    const trackAtSpotifyRequestStart = snapshotPlaybackTrack(currentPlayingTrackObj);
    const sourceAtSpotifyRequestStart = currentTrackPlaybackSource;
    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { "Authorization": `Bearer ${config.access_token}` },
      signal: AbortSignal.timeout(8000)
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data && data.item) {
        data.source = 'spotify-web-api';
        if (isStaleSpotifyPlaybackResponse(
          trackAtSpotifyRequestStart,
          data.item,
          snapshotPlaybackTrack(currentPlayingTrackObj)
        )) {
          return;
        }
        lastSpotifyPlaybackData = JSON.parse(JSON.stringify(data));
        
        try {
          if (!localData) {
            localData = await localPlaybackPromise;
          }
          // Fetch fresh local SMTC state upon network completion so it's not aged by the fetch duration!
          if (window.electronAPI && typeof window.electronAPI.getLocalPlayback === 'function') {
            const freshLocal = await Promise.race([
              window.electronAPI.getLocalPlayback(),
              new Promise((resolve) => setTimeout(() => resolve(null), 350))
            ]).catch(() => null);
            if (freshLocal && freshLocal.item) {
              freshLocal.source = 'windows-smtc';
              localData = freshLocal;
            }
          }

          if (localData && localData.item) {
            localData.source = 'windows-smtc';
            const localTitle = localData.item.name.toLowerCase().trim();
            const spotTitle = data.item.name.toLowerCase().trim();
            const isSameSong = (localTitle === spotTitle || localTitle.includes(spotTitle) || spotTitle.includes(localTitle));

            if (isSameSong) {
              // Override Spotify Web API's lagging state with SMTC's instant state
              data.is_playing = localData.is_playing;
              if (localData.progress_ms > 0) {
                 const sampleAge = localData.timestamp_ms ? (Date.now() - localData.timestamp_ms) : (Date.now() - fetchStart);
                 const rate = (typeof localData.playback_rate === 'number' && localData.playback_rate > 0) ? localData.playback_rate : 1.0;
                 // If the sample was captured prior to network fetch and freshLocal timed out, advance by sample age
                 const progressCompensation = (sampleAge > 40 && localData.is_playing) ? Math.round(sampleAge * rate) : 0;
                 data.progress_ms = localData.progress_ms + progressCompensation;
                 data.timestamp = Date.now();
                 data._isLocalProgress = true;
              }
              if (localData.playback_rate) {
                 data.playback_rate = localData.playback_rate;
              }
            } else if (shouldUseLocalPlaybackOnTrackMismatch(
              localData.item,
              data.item,
              trackAtSpotifyRequestStart,
              sourceAtSpotifyRequestStart
            )) {
              // A post-response SMTC sample is preferred only when it advanced
              // during this request or no prior track is known. If it is the
              // same request-start track, Spotify has already moved on and the
              // local sample is temporarily stale.
              lastSpotifyPlaybackData = null;
              handlePlaybackData(localData);
              return;
            }
          }
        } catch (e) {}
        
        if (!data._isLocalProgress) {
          const now = Date.now();
          const rtt = Math.max(0, now - fetchStart);
          let serverElapsed = 0;
          if (typeof data.timestamp === 'number' && data.timestamp > 0 && Math.abs(now - data.timestamp) < 15000) {
            serverElapsed = Math.max(0, now - data.timestamp);
            const rawElapsed = serverElapsed;
            // Bound server elapsed by realistic transit window (rtt + 60ms) to eliminate local clock skew bias!
            serverElapsed = Math.min(rawElapsed, rtt + 60);
          } else {
            serverElapsed = Math.max(0, Math.round(rtt / 2));
          }
          data.progress_ms += serverElapsed;
          data.timestamp = now;
        }

        // If paused and same track already loaded, freeze clock cleanly and avoid full re-render jitter.
        if (!data.is_playing && data.item.id === currentTrackId) {
          handleLocalOrPollPause(data.progress_ms);
          return;
        }

        handlePlaybackData(data);
        return;
      }
    }

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "10", 10);
      window._spotifyRateLimitUntil = Date.now() + (retryAfter * 1000);
      console.warn(`[Spotify API] Rate limited (429), cooling down for ${retryAfter}s; routing seamlessly to local SMTC.`);
      await pollLocalPlayback();
      return;
    }

    if (res.status === 401 && !_retried) {
      if (config.refresh_token) {
        try {
          config.access_token = await window.electronAPI.refreshToken();
        } catch (e) {
          console.error("pollSpotifyPlayback refresh failed:", e);
        }
      } else if (config.sp_dc) {
        try {
          config.access_token = await window.electronAPI.getAccessToken(config.sp_dc);
        } catch (e) {}
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

localEmptyPollCount = 0;

async function pollLocalPlayback() {
  try {
    const data = (window.electronAPI && typeof window.electronAPI.getLocalPlayback === 'function')
      ? await Promise.race([
          window.electronAPI.getLocalPlayback(),
          new Promise((resolve) => setTimeout(() => resolve(null), 800))
        ]).catch(() => null)
      : null;
    if (data && data.item) {
      localEmptyPollCount = 0;
      data.source = 'windows-smtc';
      // Compensate for sample age since the background SMTC thread polled the OS
      if (data.is_playing && data.progress_ms > 0) {
        const sampleAge = data.timestamp_ms ? Math.max(0, Date.now() - data.timestamp_ms) : 0;
        const rate = (typeof data.playback_rate === 'number' && data.playback_rate > 0) ? data.playback_rate : 1.0;
        if (sampleAge > 0 && sampleAge < 3000) {
          data.progress_ms += Math.round(sampleAge * rate);
        }
      }

      if (typeof lastSpotifyPlaybackData !== 'undefined' && lastSpotifyPlaybackData && lastSpotifyPlaybackData.item) {
        const localTitle = data.item.name.toLowerCase().trim();
        const spotTitle = lastSpotifyPlaybackData.item.name.toLowerCase().trim();
        const isSameSong = (localTitle === spotTitle || localTitle.includes(spotTitle) || spotTitle.includes(localTitle));

        if (isSameSong) {
           lastSpotifyPlaybackData.is_playing = data.is_playing;
           lastSpotifyPlaybackData.progress_ms = data.progress_ms;
           lastSpotifyPlaybackData.timestamp = Date.now();
           lastSpotifyPlaybackData._isLocalProgress = true;
           if (data.playback_rate) {
              lastSpotifyPlaybackData.playback_rate = data.playback_rate;
           }
           if (!data.is_playing && lastSpotifyPlaybackData.item.id === currentTrackId) {
             handleLocalOrPollPause(data.progress_ms);
             return;
           }
           handlePlaybackData(lastSpotifyPlaybackData);
           return;
        } else {
           // Song changed! Clear stale lastSpotifyPlaybackData
           lastSpotifyPlaybackData = null;
        }
      }

      data.timestamp = Date.now();
      data._isLocalProgress = true;
      data.source = 'windows-smtc';

      if (!data.is_playing && data.item.id === currentTrackId) {
        handleLocalOrPollPause(data.progress_ms);
        return;
      }
      handlePlaybackData(data);
    } else {
      localEmptyPollCount++;
      // Pause playback state but NEVER clear lyrics while song is paused
      handleLocalOrPollPause();
      if (localEmptyPollCount >= 60) {
        // Only clear if completely idle with no music player open for > 60 seconds
        handleEmptyPlayback();
      }
    }
  } catch (err) {
    console.error("Failed to poll local playback:", err);
    handleLocalOrPollPause();
  }
}


function handleEmptyPlayback() {
  if (!currentTrackId && document.body.classList.contains('is-idle') && lyricsContainer?.querySelector('.lyrics-idle-hero')) {
    // Empty-media polling is frequent. Keep the idle hero view mounted.
    return;
  }
  console.log("[Renderer] handleEmptyPlayback called");
  isPlaying = false;
  updateMemoryTargetLevel('low');
  if (cinematicMainRendererInstance) {
    cinematicMainRendererInstance.pause();
    if (typeof cinematicMainRendererInstance.setPausedState === 'function') {
      cinematicMainRendererInstance.setPausedState(true);
    }
  }
  lastPollProgress = 0;
  lastPollTimestamp = getHighResTime();
  currentTrackId = null;
  currentPlayingTrackObj = null;
  currentTrack = null;
  currentTitle = "";
  currentStaticAlbumArtUrl = null;
  currentIslandAlbumArtUrl = null;
  setAnimatedAlbumArt(null, null);
  currentExtractedArtUrl = null;
  trackDuration = 0;
  lyrics = [];
  currentIslandIsLossless = false;
  currentIslandIsHiRes = false;
  updateIslandQualityBadge();
  if (window.LyricsService?.instance?.engine) {
    window.LyricsService.instance.engine.clear();
  }
  activeLineIndex = -1;
  currentAnnotations = [];
  hideLiveMeaningPill();
  hideGeniusModal();

  if (fluidMeshGradientInstance) {
    if (!window.currentDynamicPalette) {
      fluidMeshGradientInstance.resetToDefault();
    }
    fluidMeshGradientInstance.setPlaybackState(false, 'normal', settings.fluidSpeed || 1.0);
  }

  if (!window.currentDynamicPalette) {
    document.documentElement.style.removeProperty('--art-color-1');
    document.documentElement.style.removeProperty('--art-color-1-rgb');
    document.documentElement.style.removeProperty('--art-color-2');
    document.documentElement.style.removeProperty('--art-color-2-rgb');
    document.documentElement.style.removeProperty('--art-color-3');
    document.documentElement.style.removeProperty('--art-color-3-rgb');
    document.documentElement.style.removeProperty('--art-color-4');
    document.documentElement.style.removeProperty('--art-color-4-rgb');
    document.documentElement.style.removeProperty('--art-color-base');
    document.documentElement.style.removeProperty('--art-color-base-rgb');
    document.documentElement.style.removeProperty('--art-color-dominant');
    document.documentElement.style.removeProperty('--art-color-dominant-rgb');
    if (!settings.accentColor || settings.accentColor === 'auto' || settings.accentColor === 'dynamic') {
      document.documentElement.style.removeProperty('--accent-primary');
      document.documentElement.style.removeProperty('--accent-primary-rgb');
      document.documentElement.style.removeProperty('--accent-bright');
      document.documentElement.style.removeProperty('--accent-bright-rgb');
      document.documentElement.style.removeProperty('--accent-secondary');
      document.documentElement.style.removeProperty('--accent-tertiary');
      document.documentElement.style.removeProperty('--accent-quaternary');
    }
    if (settings.highlightColor === 'dynamic') {
      document.documentElement.style.removeProperty('--highlight-color');
      document.documentElement.style.removeProperty('--highlight-glow');
    }
  }

  document.body.classList.remove('is-playing', 'app-paused');
  document.body.classList.add('is-idle');
  document.body.classList.remove('split-no-lyrics-focus');

  // Standby Playback Widget
  widgetTrackName.textContent = "Ready to Flow";
  widgetTrackName.title = "";
  widgetArtistName.textContent = "Waiting for music...";
  widgetArtistName.title = "";
  const idleTrackWrap = document.getElementById("widget-track-name-wrapper");
  if (idleTrackWrap) {
    updateMarqueeOverflow(idleTrackWrap, widgetTrackName);
  }
  if (wallpaperTrackTitle) wallpaperTrackTitle.textContent = "Ready to Flow";
  if (wallpaperTrackArtist) wallpaperTrackArtist.textContent = "Waiting for music...";
  setWallpaperAlbumArt(null);
  updateStudioSidebar(null, null);
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
        openLyricsSearch('', true);
      }
    });
  }

  lyricsContainer.querySelectorAll('.idle-recent-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const title = chip.getAttribute('data-title') || '';
      const artist = chip.getAttribute('data-artist') || '';
      if (searchOverlay) {
        openLyricsSearch(`${title} ${artist}`.trim(), true);
      }
    });
  });

  if (tbLyricLine) {
    tbLyricLine.textContent = "";
    sendTaskbarLyric("");
  }
  handleTaskbarPauseAutoHide(true);
  nextUpTriggeredTrackId = null;

  hideSatelliteIsland(false);
  hideDuetCapsule(false);
  const satIsland = document.getElementById("dynamic-island-translation");
  if (satIsland) {
    satIsland.style.display = 'none';
    satIsland.classList.remove('island-vaporizing', 'island-materializing', 'satellite-fusing');
  }
  const satBridge = document.getElementById("island-bridge");
  if (satBridge) satBridge.style.display = 'none';
  const satText = document.getElementById("island-satellite-text");
  if (satText) satText.textContent = '';
  document.body.classList.remove('has-satellite-active');

  const duetCap = document.getElementById("island-duet-capsule");
  if (duetCap) {
    duetCap.style.display = 'none';
    duetCap.classList.remove('island-vaporizing', 'island-materializing', 'duet-fusing');
  }
  const duetBridge = document.getElementById("island-duet-bridge");
  if (duetBridge) {
    duetBridge.style.display = 'none';
    duetBridge.classList.remove('bridge-fusing');
  }
  const duetText = document.getElementById("island-duet-text");
  if (duetText) duetText.textContent = '';
  document.body.classList.remove('has-duet-active');

  const dynIsland = document.getElementById("dynamic-island");
  if (dynIsland) dynIsland.classList.remove('island-mode-stacked');
  const subline = document.getElementById("island-lyric-subline");
  if (subline) {
    subline.style.display = 'none';
    subline.textContent = '';
  }
  syncDynamicIslandState();
  pushDynamicIslandBounds();

  updateAutoHideState();
}

function showNowPlayingNotification(trackInfo, playcount) {
  if (settings.showNextUp === false) return; // Follows the setting toggle
  if (!trackInfo) return;

  const trackName = trackInfo.name || trackInfo.title || 'Unknown Track';
  const artistName = trackInfo.artist || (trackInfo.artists ? trackInfo.artists.map(a => a.name).join(', ') : 'Unknown Artist');
  const artUrl = trackInfo.albumArtUrl || trackInfo.album?.images?.[1]?.url || trackInfo.album?.images?.[0]?.url || '';

  // 1. Dynamic Island Mode: Keep island in compact pill mode.
  // Expanded Now Playing card only reveals when user hovers over the island.
  if (isDynamicIslandMode) {
    return;
  }

  // 2. Standard / Wallpaper Mode: Show sleek in-app Apple liquid-glass toast HUD
  const toastNotification = document.getElementById("toast-notification");
  if (toastNotification) {
    if (window._nowPlayingToastTimeout) {
      clearTimeout(window._nowPlayingToastTimeout);
      window._nowPlayingToastTimeout = null;
    }
    toastNotification.classList.remove('next-up-toast');
    toastNotification.classList.add('now-playing-toast');
    const artImg = artUrl
      ? `<img src="${escapeHTML(artUrl)}" style="width:24px;height:24px;border-radius:6px;object-fit:cover;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,0.4);" />`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:#ffffff;"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;

    toastNotification.innerHTML = `
      ${artImg}
      <div style="display:flex;flex-direction:column;min-width:0;line-height:1.25;text-align:left;">
        <span style="font-weight:650;color:#ffffff;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(trackName)}</span>
        <span style="font-size:11px;color:rgba(255,255,255,0.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(artistName)}</span>
      </div>
    `;
    toastNotification.classList.add("show");

    window._nowPlayingToastTimeout = setTimeout(() => {
      toastNotification.classList.remove("show");
      toastNotification.classList.remove("now-playing-toast");
      window._nowPlayingToastTimeout = null;
    }, 4000);
  }

  // 3. Native Windows desktop notification only if explicitly enabled
  if (settings.nativeWindowsToast && window.electronAPI && window.electronAPI.showNowPlayingNotification) {
    window.electronAPI.showNowPlayingNotification({
      name: trackName,
      artist: artistName,
      albumArtUrl: artUrl,
      playcount: playcount
    });
  }
}

let nextUpTriggeredTrackId = null;
let islandNextUpTimeout = null;
let upcomingTrackObj = null;
let lastQueueFetchTime = 0;
let isFetchingQueue = false;

async function fetchUpcomingQueueTrack() {
  if (!config || !config.access_token || config.localMode || isFetchingQueue) return upcomingTrackObj;
  if (Date.now() - lastQueueFetchTime < 10000 && upcomingTrackObj) {
    return upcomingTrackObj;
  }
  isFetchingQueue = true;
  try {
    const res = await fetch("https://api.spotify.com/v1/me/player/queue", {
      headers: { "Authorization": `Bearer ${config.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      lastQueueFetchTime = Date.now();
      if (Array.isArray(data.queue) && data.queue.length > 0) {
        const pick = data.queue.find(item => item && item.id !== currentTrackId) || data.queue[0];
        if (pick) {
          upcomingTrackObj = pick;
        }
      }
    }
  } catch (e) {
    // Non-fatal, queue API might be rate-limited or unavailable
  } finally {
    isFetchingQueue = false;
  }
  return upcomingTrackObj;
}

function updateIslandVocalCountdownCell(trackTitle, remainingSec) {
  if (remainingSec > 6) {
    hideIslandVocalCountdownCell();
    return;
  }
  const island = document.getElementById('dynamic-island');
  const preview = document.getElementById('island-next-up-preview');
  const label = preview?.querySelector('.island-next-up-label');
  const title = document.getElementById('island-next-up-title');
  const countdown = document.getElementById('island-next-up-countdown');
  if (!island || !preview || !label || !title || !countdown) return;
  if (islandNextUpTimeout) clearTimeout(islandNextUpTimeout);
  islandNextUpTimeout = null;
  preview.dataset.kind = 'vocals';
  label.textContent = 'VOCALS IN';
  title.textContent = '';
  countdown.textContent = `${remainingSec}s`;
  preview.setAttribute('aria-label', `Vocals begin in ${remainingSec} seconds`);
  preview.style.display = 'flex';
  island.classList.add('has-next-up-preview');
  requestAnimationFrame(() => preview.classList.add('is-visible'));
}

function hideIslandVocalCountdownCell() {
  const island = document.getElementById('dynamic-island');
  const preview = document.getElementById('island-next-up-preview');
  if (!island || !preview || preview.dataset.kind !== 'vocals') return;
  preview.dataset.kind = '';
  preview.classList.remove('is-visible');
  if (islandNextUpTimeout) clearTimeout(islandNextUpTimeout);
  islandNextUpTimeout = setTimeout(() => {
    if (preview.dataset.kind !== 'vocals') {
      preview.style.display = 'none';
      island.classList.remove('has-next-up-preview');
    }
    islandNextUpTimeout = null;
  }, 220);
}

async function triggerNextUpPreview(trackInfo, remainingSec) {
  if (settings.showNextUp === false || !trackInfo) return;

  // Proactively fetch upcoming track from Spotify queue if not cached yet
  if (!upcomingTrackObj && config && config.access_token && !config.localMode) {
    await fetchUpcomingQueueTrack();
  }

  const upcoming = upcomingTrackObj;
  const isUpcomingKnown = Boolean(upcoming && (upcoming.name || upcoming.title));

  if (!isDynamicIslandMode) {
    if (settings.wallpaperMode || settings.taskbarMode) return;
    triggerNextUpDesktopNotification(trackInfo, remainingSec, upcoming);
    return;
  }

  const island = document.getElementById('dynamic-island');
  const preview = document.getElementById('island-next-up-preview');
  const title = document.getElementById('island-next-up-title');
  const countdown = document.getElementById('island-next-up-countdown');
  if (!island || !preview || !title || !countdown) return;
  const label = preview.querySelector('.island-next-up-label');

  if (islandNextUpTimeout) clearTimeout(islandNextUpTimeout);
  preview.dataset.kind = 'next-up';

  if (isUpcomingKnown) {
    if (label) label.textContent = 'NEXT UP';
    const upcomingArtist = upcoming.artists ? upcoming.artists.map(a => a.name).join(', ') : (upcoming.artist || '');
    title.textContent = `${upcoming.name || upcoming.title}${upcomingArtist ? ' • ' + upcomingArtist : ''}`;
    countdown.textContent = `Starts in ${remainingSec}s`;
  } else {
    // When upcoming queue track is unknown (e.g. SMTC or unexposed queue), accurately label as ending soon!
    // NEVER falsely label the current track as "NEXT UP".
    if (label) label.textContent = 'ENDING SOON';
    // The current song is already shown in the Island. Keep the ending
    // countdown focused on its status instead of repeating the song title.
    title.textContent = '';
    countdown.textContent = `${remainingSec}s remaining`;
  }

  preview.style.display = 'flex';
  island.classList.add('has-next-up-preview');
  requestAnimationFrame(() => preview.classList.add('is-visible'));
  islandNextUpTimeout = setTimeout(() => {
    preview.classList.remove('is-visible');
    islandNextUpTimeout = setTimeout(() => {
      preview.style.display = 'none';
      island.classList.remove('has-next-up-preview');
      islandNextUpTimeout = null;
    }, 220);
  }, 4000);
}

function triggerNextUpDesktopNotification(trackInfo, remainingSec, upcoming = null) {
  if (isDynamicIslandMode) return; // Dynamic Island displays its own in-capsule Next Up pill
  const toastNotification = document.getElementById("toast-notification");
  if (!toastNotification || !trackInfo) return;

  if (window._nowPlayingToastTimeout) {
    clearTimeout(window._nowPlayingToastTimeout);
    window._nowPlayingToastTimeout = null;
  }
  toastNotification.classList.remove('now-playing-toast');
  toastNotification.classList.add('next-up-toast');

  const isUpcomingKnown = Boolean(upcoming && (upcoming.name || upcoming.title));
  const trackName = isUpcomingKnown
    ? (upcoming.name || upcoming.title)
    : (trackInfo.name || trackInfo.title || 'Current Track');
  const artistName = isUpcomingKnown
    ? (upcoming.artist || (upcoming.artists ? upcoming.artists.map(a => a.name).join(', ') : ''))
    : (trackInfo.artist || (trackInfo.artists ? trackInfo.artists.map(a => a.name).join(', ') : ''));
  const artUrl = isUpcomingKnown
    ? (upcoming.albumArtUrl || upcoming.album?.images?.[1]?.url || upcoming.album?.images?.[0]?.url || '')
    : (trackInfo.albumArtUrl || trackInfo.album?.images?.[1]?.url || trackInfo.album?.images?.[0]?.url || currentStaticAlbumArtUrl || '');

  const artImg = artUrl
    ? `<img src="${escapeHTML(artUrl)}" style="width:24px;height:24px;border-radius:6px;object-fit:cover;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,0.4);" />`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:#ffffff;"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>`;

  const headerLabel = isUpcomingKnown ? `Next Up in ${remainingSec}s` : `Ending in ${remainingSec}s`;

  toastNotification.innerHTML = `
    ${artImg}
    <div style="display:flex;flex-direction:column;min-width:0;line-height:1.25;text-align:left;">
      <span style="font-weight:650;color:#ffffff;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${headerLabel}</span>
      <span style="font-size:11px;color:rgba(255,255,255,0.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(trackName)}${artistName ? ` • ${escapeHTML(artistName)}` : ''}</span>
    </div>
  `;
  toastNotification.classList.add("show");

  window._nowPlayingToastTimeout = setTimeout(() => {
    toastNotification.classList.remove("show");
    toastNotification.classList.remove("next-up-toast");
    window._nowPlayingToastTimeout = null;
  }, 4000);
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

  if (fluidMeshGradientInstance) {
    if (typeof shouldRunFluidMesh === 'function' && shouldRunFluidMesh()) {
      fluidMeshGradientInstance.setPlaybackState(
        isPlaying,
        window._currentBpmProfile || 'normal',
        settings.fluidSpeed !== undefined ? settings.fluidSpeed : 1.0
      );
    } else {
      fluidMeshGradientInstance.stop();
    }
  }
}

function applyPaletteCSS(c0, c1, c2, c3, c4, dominant) {
  if (!dominant) dominant = c1 || { r: 29, g: 185, b: 84 };
  if (!c0) c0 = { r: 8, g: 10, b: 18 };
  if (!c1) c1 = dominant;
  if (!c2) c2 = c1;
  if (!c3) c3 = c2;
  if (!c4) c4 = c1;

  // Export comprehensive artwork palette CSS variables
  document.documentElement.style.setProperty('--art-color-1', `rgb(${c1.r}, ${c1.g}, ${c1.b})`);
  document.documentElement.style.setProperty('--art-color-1-rgb', `${c1.r}, ${c1.g}, ${c1.b}`);
  document.documentElement.style.setProperty('--art-color-2', `rgb(${c2.r}, ${c2.g}, ${c2.b})`);
  document.documentElement.style.setProperty('--art-color-2-rgb', `${c2.r}, ${c2.g}, ${c2.b}`);
  document.documentElement.style.setProperty('--art-color-3', `rgb(${c3.r}, ${c3.g}, ${c3.b})`);
  document.documentElement.style.setProperty('--art-color-3-rgb', `${c3.r}, ${c3.g}, ${c3.b}`);
  document.documentElement.style.setProperty('--art-color-4', `rgb(${c4.r}, ${c4.g}, ${c4.b})`);
  document.documentElement.style.setProperty('--art-color-4-rgb', `${c4.r}, ${c4.g}, ${c4.b}`);
  document.documentElement.style.setProperty('--art-color-base', `rgb(${c0.r}, ${c0.g}, ${c0.b})`);
  document.documentElement.style.setProperty('--art-color-base-rgb', `${c0.r}, ${c0.g}, ${c0.b}`);
  document.documentElement.style.setProperty('--art-color-dominant', `rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`);
  document.documentElement.style.setProperty('--art-color-dominant-rgb', `${dominant.r}, ${dominant.g}, ${dominant.b}`);

  // Harmonize dynamic accent theme and share cards with authentic artwork colors
  if (!settings.accentColor || settings.accentColor === 'auto' || settings.accentColor === 'dynamic') {
    document.documentElement.style.setProperty('--accent-primary', `rgb(${c1.r}, ${c1.g}, ${c1.b})`);
    document.documentElement.style.setProperty('--accent-primary-rgb', `${c1.r}, ${c1.g}, ${c1.b}`);
    document.documentElement.style.setProperty('--accent-bright', `rgb(${c4.r}, ${c4.g}, ${c4.b})`);
    document.documentElement.style.setProperty('--accent-bright-rgb', `${c4.r}, ${c4.g}, ${c4.b}`);
    document.documentElement.style.setProperty('--accent-secondary', `rgb(${c2.r}, ${c2.g}, ${c2.b})`);
    document.documentElement.style.setProperty('--accent-tertiary', `rgb(${c3.r}, ${c3.g}, ${c3.b})`);
    document.documentElement.style.setProperty('--accent-quaternary', `rgb(${c4.r}, ${c4.g}, ${c4.b})`);
  }

  // Dynamic lyric text: keep text crisp white (or dark in light mode) with dynamic artwork glow aura
  if (settings.highlightColor === 'dynamic') {
    const glowRaw = typeof settings.glowIntensity === 'number' ? settings.glowIntensity : (typeof settings.glow === 'number' ? settings.glow : 65);
    const glowInt = glowRaw / 100;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light' || settings.theme === 'light';
    document.documentElement.style.setProperty('--highlight-color', isLight ? '#1d1d1f' : '#ffffff');
    document.documentElement.style.setProperty('--highlight-glow', `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${glowInt})`);
  }
}
window.applyPaletteCSS = applyPaletteCSS;

currentExtractedArtUrl = null;

async function updateDynamicArtColor(artUrl) {
  if (!artUrl || artUrl === currentExtractedArtUrl) return;
  const requestId = ++artPaletteRequestId;
  currentExtractedArtUrl = artUrl;
  try {
    const colorData = window.extractColorData
      ? await window.extractColorData(artUrl)
      : { dominant: await extractDominantColor(artUrl), palette: await extractColorPalette(artUrl) };

    // Ignore late image-analysis results when playback has already moved to
    // another album, so the mesh always reflects the visible current artwork.
    if (requestId !== artPaletteRequestId || artUrl !== currentExtractedArtUrl) return;

    const dominant = colorData?.dominant || { r: 29, g: 185, b: 84 };
    window.currentDynamicDominantRgb = dominant;
    const palette = colorData?.palette;
    const c0 = (palette && palette[0]) || colorData?.base || { r: 8, g: 10, b: 18 };
    const c1 = (palette && palette[1]) || colorData?.primary || dominant;
    const c2 = (palette && palette[2]) || colorData?.secondary || { r: Math.max(0, dominant.r - 40), g: Math.max(0, dominant.g - 40), b: Math.max(0, dominant.b - 40) };
    const c3 = (palette && palette[3]) || colorData?.tertiary || c2;
    const c4 = (palette && palette[4]) || colorData?.quaternary || c1;

    const fullPalette = [c0, c1, c2, c3, c4];
    window.currentDynamicPalette = fullPalette;

    // Persist palette to localStorage for instantaneous restoration on application startup
    try {
      localStorage.setItem('lyricflow_last_palette', JSON.stringify(fullPalette));
      localStorage.setItem('lyricflow_last_dominant', JSON.stringify(dominant));
      if (artUrl && !artUrl.startsWith('data:')) {
        localStorage.setItem('lyricflow_last_art_url', artUrl);
      }
    } catch (e) {}

    applyPaletteCSS(c0, c1, c2, c3, c4, dominant);

    if (fluidMeshGradientInstance) {
      if (shouldRunFluidMesh()) {
        fluidMeshGradientInstance.setPalette(fullPalette);
      } else {
        fluidMeshGradientInstance.stop();
      }
    }
    if (isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === 'cinematic')) {
      syncCinematicState();
    }
  } catch (err) {
    console.warn("[Renderer] Failed to update dynamic art color:", err);
  }
}

lastProcessedTrackId = null;
lastAppliedAlbumArtUrl = null;
trackSwitchDebounceTimer = null;

function renderLyricsSkeleton() {
  return `
    <div class="lyrics-skeleton-container" aria-label="Loading lyrics">
      <div class="lyrics-skeleton-line" style="width: 52%; animation-delay: 0s;"></div>
      <div class="lyrics-skeleton-line" style="width: 78%; animation-delay: 0.12s;"></div>
      <div class="lyrics-skeleton-line" style="width: 44%; animation-delay: 0.24s;"></div>
      <div class="lyrics-skeleton-line" style="width: 84%; animation-delay: 0.36s;"></div>
      <div class="lyrics-skeleton-line" style="width: 62%; animation-delay: 0.48s;"></div>
    </div>
  `;
}

async function handlePlaybackData(data) {
  if (!data || !data.item) {
    handleEmptyPlayback();
    return;
  }

  const track = data.item;
  const isCurrentlyPlaying = data.is_playing;
  if (isCurrentlyPlaying) {
    updateMemoryTargetLevel('normal');
  } else {
    updateMemoryTargetLevel('low');
  }
  const progressMs = data.progress_ms;
  const isNewTrack = isPlaybackTrackSwitch(track, currentTrackId, currentPlayingTrackObj);
  const now = Date.now();
  const perfNow = getHighResTime();
  const prevRate = window._currentPlaybackRate || 1.0;

  // 1. Detect explicit playback rate from data (from SMTC reader or custom player)
  const isExplicitRateSource = data.source === 'windows-smtc' || (typeof data.playback_rate === 'number' && data.playback_rate > 0);
  if (typeof data.playback_rate === 'number' && data.playback_rate > 0) {
    window._currentPlaybackRate = data.playback_rate;
  } else if (!window._currentPlaybackRate || !isExplicitRateSource) {
    // Music tracks must play at normal 1.0x rate unless explicitly specified by native SMTC
    window._currentPlaybackRate = 1.0;
  }

  // 2. Playback speed auto-detection disabled for music streaming to eliminate network polling jitter falsely triggering 1.25x / 1.5x
  window._candidateRate = null;
  window._candidateRateHits = 0;
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

  if (data.device && typeof data.device.volume_percent === 'number') {
    currentIslandVolumePercent = data.device.volume_percent;
    isIslandMuted = currentIslandVolumePercent === 0;
    currentMusicAppName = "Spotify";
  }

  if (!isScrubbingMainProgress && !isScrubbingIslandProgress) {
    if (isNewTrack && !isZeroReset) {
      // New song: snap immediately to the API timestamp
      lastPollProgress = progressMs;
      lastPollTimestamp = perfNow;
      currentProgress = progressMs;
      window._pllRateMultiplier = 1.0;
      window._pllFilteredDrift = 0;
      window._pllIntegralDrift = 0;
      window._candidateRate = null;
      window._candidateRateHits = 0;
    } else if (!isZeroReset && isCurrentlyPlaying) {
      if (!isPlaying) {
        // Transition from paused -> playing: cleanly reset clock reference to prevent forward elapsed time jump
        const isRecentSeek = (now - lastUserSeekTimestamp) < 2500;
        const resumePos = (!isRecentSeek && typeof progressMs === 'number' && progressMs >= 0)
          ? progressMs
          : currentProgress;
        lastPollProgress = resumePos;
        currentProgress = resumePos;
        lastPollTimestamp = perfNow;
        window._pllRateMultiplier = 1.0;
        window._pllFilteredDrift = 0;
        window._pllIntegralDrift = 0;
      } else {
        const isRecentSeek = (now - lastUserSeekTimestamp) < 2500;
        if (isRecentSeek && Math.abs(progressMs - lastUserSeekTargetMs) > 800) {
          // Drop stale pre-seek poll from SMTC / Spotify to prevent snap-back rubber-banding!
        } else {
          const rawDrift = currentProgress - progressMs;
          const absRawDrift = Math.abs(rawDrift);

          // Low-pass Exponential Moving Average (EMA) drift filter:
          // Rejects high-frequency network/IPC polling jitter while smoothly tracking true clock drift
          if (window._pllFilteredDrift == null || !Number.isFinite(window._pllFilteredDrift)) {
            window._pllFilteredDrift = rawDrift;
          } else {
            const alpha = 0.25;
            window._pllFilteredDrift = (alpha * rawDrift) + ((1.0 - alpha) * window._pllFilteredDrift);
          }
          const drift = window._pllFilteredDrift;
          const absDrift = Math.abs(drift);

          if (absDrift > 1500 || absRawDrift > 1500) {
            // Zone D: Hard seek / scrub detected — snap immediately
            lastPollProgress = progressMs;
            lastPollTimestamp = perfNow;
            currentProgress = progressMs;
            window._pllRateMultiplier = 1.0;
            window._pllFilteredDrift = 0;
            window._pllIntegralDrift = 0;
            window._allowClockConvergence = true;
          } else if (absDrift > 400) {
            // Zone C: Medium drift (400ms - 1500ms):
            // Slew-limited convergence: adjust clock smoothly toward ground truth
            let adjustment = drift * 0.35;
            if (Math.abs(adjustment) > 30) {
              adjustment = Math.sign(adjustment) * 30;
            }
            currentProgress = currentProgress - adjustment;
            lastPollProgress = currentProgress;
            lastPollTimestamp = perfNow;
            const pllDirection = Math.sign(drift);
            window._pllRateMultiplier = 1.0 - (pllDirection * 0.025);
            window._allowClockConvergence = true;
          } else if (absDrift > 20) {
            // Zone B: Standard polling drift (20ms - 400ms):
            // Critically damped Proportional-Integral (PI) Clock Filter!
            // Maintains stable ground-truth phase anchor and steers rate smoothly
            if (window._pllIntegralDrift == null || !Number.isFinite(window._pllIntegralDrift)) {
              window._pllIntegralDrift = 0;
            }
            window._pllIntegralDrift += drift * 0.05;
            window._pllIntegralDrift = Math.max(-500, Math.min(500, window._pllIntegralDrift));
            const propTerm = drift / 2500;
            const Kp = 0.00015;
            const Ki = 0.00003;
            const deltaRate = (Kp * drift) + (Ki * window._pllIntegralDrift);
            const clampedDeltaRate = Math.max(-0.025, Math.min(0.025, deltaRate));
            window._pllRateMultiplier = 1.0 - clampedDeltaRate;
            lastPollProgress = progressMs;
            lastPollTimestamp = perfNow;
          } else {
            // Zone A: Sub-25ms drift: within single video frame accuracy (16.6ms at 60Hz)
            // Micro-trim rate (±0.2%) to bleed residual offset toward 0ms
            const microTrim = Math.max(-0.0015, Math.min(0.0015, drift / 10000));
            window._pllRateMultiplier = 1.0 - microTrim;
            lastPollProgress = progressMs;
            lastPollTimestamp = perfNow;
          }
        }
      }
    } else if (!isZeroReset && !isCurrentlyPlaying) {
      // Song is PAUSED: freeze currentProgress exactly at reported position
      const isRecentSeek = (now - lastUserSeekTimestamp) < 2500;
      if (isRecentSeek && typeof progressMs === 'number' && progressMs >= 0 && Math.abs(progressMs - lastUserSeekTargetMs) > 800) {
        progressMs = lastUserSeekTargetMs;
      }
      if (typeof progressMs === 'number' && progressMs >= 0) {
        currentProgress = progressMs;
      }
      lastPollProgress = currentProgress;
      lastPollTimestamp = perfNow;
      window._pllRateMultiplier = 1.0;
      window._pllFilteredDrift = 0;
    }
  }

  const wasPlaying = isPlaying;
  isPlaying = isCurrentlyPlaying;
  if (!wasPlaying && isCurrentlyPlaying) {
    lastPlaybackActivityMs = Date.now();
    if (isIslandSleeping) {
      wakeDynamicIsland();
    }
  }
  if (wasPlaying !== isCurrentlyPlaying) {
    if (isDynamicIslandMode) {
      startDynamicIslandBoundsTracking(450);
    }
    syncAudioVisualizerState();
    if (!isCurrentlyPlaying && typeof checkVisualizerFallback === 'function') {
      checkVisualizerFallback();
    }
  }
  document.body.classList.toggle('is-playing', isCurrentlyPlaying);
  document.body.classList.toggle('app-paused', !isCurrentlyPlaying);
  if (wasPlaying !== isCurrentlyPlaying) {
    if (isCurrentlyPlaying && !isNewTrack) {
      resumeAnimatedArtVideos();
    } else if (!isCurrentlyPlaying) {
      pauseAnimatedArtVideosForPlaybackStop();
    }
  }
  document.body.classList.remove('is-idle');
  if (widgetArtFallback) widgetArtFallback.classList.remove('idle-active');
  if (widgetProgressFill) widgetProgressFill.classList.remove('idle-shimmer');
  if (isPlaying) ensurePlayheadLoop();
  handleTaskbarPauseAutoHide(!isPlaying);
  updateAutoHideState();

  syncFluidMeshPlaybackState();

  if (cinematicMainRendererInstance) {
    if (typeof cinematicMainRendererInstance.setPausedState === 'function') {
      cinematicMainRendererInstance.setPausedState(!isCurrentlyPlaying, {
        title: track.name || track.title || '',
        artist: (track.artists && track.artists[0]?.name) || track.artist || ''
      });
    }
    if (isCurrentlyPlaying) {
      if (isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === 'cinematic')) {
        cinematicMainRendererInstance.play();
      } else {
        cinematicMainRendererInstance.pause();
      }
    } else {
      cinematicMainRendererInstance.pause();
    }
  }

  const rawDur = track.duration_ms != null
    ? track.duration_ms
    : (track.duration != null ? (track.duration > 10000 ? track.duration : track.duration * 1000) : null);
  const reportedDuration = Number(rawDur);
  if (Number.isFinite(reportedDuration) && reportedDuration > 0) {
    trackDuration = reportedDuration;
  } else if (isNewTrack) {
    // Keep unknown SMTC duration at zero for this new track; same-track polls
    // with a transient zero must not erase a previously valid duration.
    trackDuration = 0;
  }

  if (track && (!track.album || !track.album.images || !track.album.images.length)) {
    const primaryArtist = track.artists?.[0]?.name || '';
    const dualKey = `${primaryArtist}:::${track.name}`.toLowerCase().trim();
    const cachedArt = sessionArtMemoryCache.get(track.id) || sessionArtMemoryCache.get(dualKey) || localArtCache[track.id] || localArtCache[dualKey];
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
    globalAmbilightSampler.stop();
  }

  const albumArtUrl = track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || track.album?.images?.[2]?.url;
  if (albumArtUrl) {
    rememberArtInMemory(track.id, albumArtUrl, track.name, track.artists?.[0]?.name || '');
  }
  const prevTrackObj = currentPlayingTrackObj;
  const isSameSong = Boolean(prevTrackObj && isSameTrack(track, prevTrackObj));
  const isSongChanged = !prevTrackObj || !isSameSong;
  const isIdUpgrade = Boolean(prevTrackObj && isSameSong && track.id !== currentTrackId);

  // If this is metadata enrichment for the same song (e.g. Spotify cloud sync arriving after SMTC/Soloist),
  // merge external_ids and album details into currentPlayingTrackObj.
  if (isSameSong && prevTrackObj) {
    if (track.external_ids?.isrc && !prevTrackObj.external_ids?.isrc) {
      prevTrackObj.external_ids = { ...(prevTrackObj.external_ids || {}), isrc: track.external_ids.isrc };
    }
    if (track.album?.name && !prevTrackObj.album?.name) {
      prevTrackObj.album = { ...(prevTrackObj.album || {}), name: track.album.name };
    }
    if (track.id && !track.id.startsWith('local_') && currentTrackId && currentTrackId.startsWith('local_')) {
      currentTrackId = track.id;
    }
  }

  currentPlayingTrackObj = track;
  currentTrack = track;
  currentTitle = (track && (track.name || track.title)) || "";
  currentStaticAlbumArtUrl = albumArtUrl;
  updateLyricsDiagnostics();

  // If track metadata was upgraded for the same song (e.g. from local_ to Spotify ID with ISRC):
  if (isIdUpgrade && currentSourceLevel < 3) {
    const allArtists = (track.artists && Array.isArray(track.artists) && track.artists.length > 0)
      ? track.artists.map(a => a.name).filter(Boolean).join(", ")
      : (track.artist || '');
    const primaryArtist = (track.artists && track.artists[0] && track.artists[0].name)
      ? track.artists[0].name
      : (allArtists.split(/,| feat\.| ft\./i)[0].trim() || 'Unknown');
    fetchLyrics(track.id, track.name, allArtists || primaryArtist, trackDuration, track.external_ids?.isrc || null, {
      allArtists,
      primaryArtist,
      album: track.album?.name || ''
    });
  }

  // 1. Only touch Track Info DOM when track changes
  if (isSongChanged || track.id !== lastProcessedTrackId) {
    lastProcessedTrackId = track.id;
    nextUpTriggeredTrackId = null;
    upcomingTrackObj = null;

    // Invalidate dormant video sources on track change to prevent stale video art playback
    if (typeof document !== 'undefined') {
      const _allMotionArtVideos = [
        document.getElementById('studio-art-video'),
        document.getElementById('widget-album-art-video'),
        document.getElementById('studio-tall-bg-video'),
        document.getElementById('wallpaper-style-art-video'),
        document.getElementById('wallpaper-album-bg-video'),
        document.getElementById('island-art-video')
      ];
      _allMotionArtVideos.forEach(v => {
        if (v) v._dormantSrc = null;
      });
    }

    // Evict stale Base64 artwork bitmaps on track changes
    const staleIslandOldImg = document.getElementById("island-art-img-old");
    if (staleIslandOldImg) {
      staleIslandOldImg.removeAttribute('src');
      staleIslandOldImg.style.display = 'none';
    }
    const modalEl = document.getElementById('album-art-modal');
    if (modalEl && !modalEl.classList.contains('show')) {
      const staleModalImg = document.getElementById('album-art-modal-img');
      if (staleModalImg) staleModalImg.removeAttribute('src');
    }
    // Flush held GPU textures and RAM during track transition gap
    updateMemoryTargetLevel('low');
    if (window.djEngine) {
      window.djEngine.onSongChanged(track);
      if (settings.djSmartQueue) {
        window.djEngine.enqueueSmartRecommendation({
          currentTrack: track,
          spotifyToken: (typeof getSpotifyToken === 'function' ? getSpotifyToken() : null),
          lastFmApiKey: (config?.lastFmApiKey || null)
        });
      }
    }
    if (config && config.access_token && !config.localMode) {
      setTimeout(fetchUpcomingQueueTrack, 2000);
    }
    if (widgetTrackName) {
      widgetTrackName.textContent = track.name;
      widgetTrackName.title = track.name;
    }
    const artistText = (track.artists && Array.isArray(track.artists)) ? track.artists.map(a => a.name).join(", ") : (track.artist || '');
    if (widgetArtistName) {
      widgetArtistName.textContent = artistText;
      widgetArtistName.title = artistText;
    }
    if (!isDynamicIslandMode && !settings.wallpaperMode && !settings.taskbarMode) {
      const trackWrap = document.getElementById("widget-track-name-wrapper");
      if (trackWrap && widgetTrackName) {
        updateMarqueeOverflow(trackWrap, widgetTrackName);
      }
    }
    if (settings.wallpaperMode) {
      syncWallpaperTrackMetadata(track);
    }
  }

  // 2. Only update Album Art & Animated Art when song or art URL changes
  if (isSongChanged || albumArtUrl !== lastAppliedAlbumArtUrl) {
    lastAppliedAlbumArtUrl = albumArtUrl;
    if (albumArtUrl) {
      if (!isDynamicIslandMode && !settings.wallpaperMode && !settings.taskbarMode) {
        if (!document.body.classList.contains('has-animated-art-video')) {
          setArtWithSparkle(widgetAlbumArt, albumArtUrl);
          widgetAlbumArt.style.display = "block";
        }
        widgetArtFallback.style.display = "none";
      }
      if (settings.wallpaperMode) {
        setWallpaperAlbumArt(albumArtUrl);
      }
      updateDynamicArtColor(albumArtUrl);
    } else {
      if (!isDynamicIslandMode && !settings.wallpaperMode && !settings.taskbarMode) {
        widgetAlbumArt.style.display = "none";
        widgetArtFallback.style.display = "flex";
      }
      if (settings.wallpaperMode) {
        setWallpaperAlbumArt(null);
      }
    }
    updateAnimatedAlbumArt(track, albumArtUrl);
    try {
      updateStudioSidebar(track, albumArtUrl);
    } catch (e) {
      console.warn("[Studio] Error updating sidebar:", e);
    }
  }

  // Audio quality verification: strictly pop up Lossless badge only when verified
  const badgeQuality = document.getElementById("studio-badge-quality");
  const badgesRow = document.getElementById("studio-badges-row") || document.querySelector(".studio-badges-row");
  const badgeProvider = document.getElementById("studio-badge-provider");

  const isLossless = Boolean(
    data.audio_quality === 'lossless' ||
    data.is_lossless ||
    (track.encoding && /flac|alac|wav|aiff|dsd/i.test(track.encoding)) ||
    (typeof data.bit_depth === 'number' && data.bit_depth >= 16 && typeof data.sample_rate === 'number' && data.sample_rate >= 44100 && /flac|alac|wav|lossless/i.test(data.encoding || ''))
  );

  if (isDynamicIslandMode) {
    currentIslandIsLossless = isLossless;
    currentIslandIsHiRes = isLossless && Boolean(data.bit_depth && data.bit_depth > 16);
    updateIslandQualityBadge();

    try {
      syncDynamicIslandState();
    } catch (err) {
      console.warn("[DynamicIsland] Error syncing state in handlePlaybackData:", err);
    }
  }

  if (badgeQuality) {
    if (isLossless) {
      badgeQuality.textContent = (data.bit_depth && data.bit_depth > 16) ? "Hi-Res Lossless" : "Lossless";
      badgeQuality.style.display = "inline-flex";
      badgeQuality.classList.add("is-confirmed");
      if (badgesRow) {
        badgesRow.style.display = "flex";
        badgesRow.classList.add("has-badges");
      }
    } else {
      badgeQuality.style.display = "none";
      badgeQuality.classList.remove("is-confirmed");
      if (badgesRow && (!badgeProvider || !badgeProvider.classList.contains("is-confirmed"))) {
        badgesRow.style.display = "none";
        badgesRow.classList.remove("has-badges");
      }
    }
  }

  const artModal = document.getElementById("album-art-modal");
  if (artModal && artModal.classList.contains("show")) {
    showAlbumArtModal();
  }

  widgetTimeDuration.textContent = formatTime(trackDuration);

  // 3. Check if song changed
  if (isSongChanged) {
    if (globalSyllableDOMPool && lyricsContainer) {
      globalSyllableDOMPool.releaseAll(lyricsContainer);
    }
    currentTrackId = track.id;
    currentTrackPlaybackSource = data.source || (data._isLocalProgress || config?.localMode ? 'windows-smtc' : 'spotify-web-api');
    const primaryArtistName = Array.isArray(track.artists) ? track.artists.map(a => a?.name).filter(Boolean).join(', ') : (track.artist || '');
    if (track.name) resolveDirectMusicLinks(track.name, primaryArtistName);
    wakeAutoHideTemporarily(6000);
    islandNowPlayingBufferUntil = Date.now() + 3000;
    manualLyricScrollY = null;

    if (isDynamicIslandMode) {
      const islandLine = document.getElementById("island-lyric-line");
      if (islandLine) {
        islandLine.dataset.stateKey = "";
        islandLine.dataset.lineIndex = "-4";
      }

      try {
        syncDynamicIslandState();
        const islandSync = getDynamicIslandSyncData(currentProgress);
        updateDynamicIslandLyric(islandSync.lineIndex, islandSync.lineData, currentProgress, islandSync.isInstrumental, islandSync.countdownMs);
      } catch (err) {
        console.warn("[DynamicIsland] Error on song change update:", err);
      }
    }

    // Load per-song offset (checking both specific provider ID and canonical title/artist key)
    if (!settings.trackOffsets) settings.trackOffsets = {};
    const canonOffsetKey = getCanonicalTrackKey(track);
    const loadedOffset = (settings.trackOffsets[currentTrackId] != null)
      ? settings.trackOffsets[currentTrackId]
      : (canonOffsetKey && settings.trackOffsets[canonOffsetKey] != null ? settings.trackOffsets[canonOffsetKey] : 0);
    settings.syncOffsetMs = loadedOffset || 0;
    if (inputSyncOffset) inputSyncOffset.value = settings.syncOffsetMs;

    try {
      logTrackHistory(track);
    } catch (e) {
      console.warn("[History] Failed to log track history:", e);
    }
    lyrics = [];
    currentSourceLevel = 0;
    cachedLineEls = [];
    cachedLineMetrics = [];
    if (lyricsContainer) {
      lyricsContainer.replaceChildren();
    }
    _lastPlayheadIslandLineIndex = -1;
    _lastPlayheadIslandCountdownSec = -1;
    _lastPlayheadIslandTrackKey = '';
    currentLyricSourceName = '';
    currentLyricCandidateInfo = '';
    window._lastFillPercent = -1;
    if (isKineticMode && kineticRendererInstance) {
      syncKineticState();
    }
    if ((isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === 'cinematic')) && cinematicMainRendererInstance) {
      syncCinematicState();
    }
    activeLineIndex = -1;
    userScrolling = false;
    hideResyncButton();
    const targetCacheKey = `lyrics_cache_v21_${currentTrackId}`;
    let isKnownUntranslated = false;
    try {
      const cachedRaw = localStorage.getItem(targetCacheKey);
      if (cachedRaw) {
        const cObj = JSON.parse(cachedRaw);
        if (cObj.noTransNeeded) isKnownUntranslated = true;
      }
    } catch (_) {}

    if (isDynamicIslandMode) {
      if (isKnownUntranslated) {
        dismissSatelliteForUntranslatedTrack();
      } else {
        const satText = document.getElementById("island-satellite-text");
        if (satText && satText.textContent !== '•••') {
          satText.textContent = '•••';
        }
      }
    }
    if (widgetPlaycount) widgetPlaycount.style.display = "none";

    lyricsContainer.innerHTML = renderLyricsSkeleton();
    lyricsContainer.style.transform = 'translateY(0px)';
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

    // Authentic player art (including SMTC data: URLs) is authoritative ground truth.
    if (albumArtUrl && currentTrackId === track.id) {
      if (!document.body.classList.contains('has-animated-art-video')) {
        if (widgetAlbumArt.src !== albumArtUrl) {
          setArtWithSparkle(widgetAlbumArt, albumArtUrl);
        }
        widgetAlbumArt.style.display = 'block';
      }
      widgetArtFallback.style.display = 'none';
    }

    if (!albumArtUrl && (!localArtCache[track.id] || localArtCache[track.id] === 'notfound')) {
      localArtCache[track.id] = 'fetching';
      fetchFallbackAlbumArt(track.name, track.artists?.[0]?.name || '', track.album?.name || '').then(artUrl => {
        if (artUrl) {
          saveArtToCache(track.id, artUrl, track.name, track.artists?.[0]?.name || '');
          rememberArtInMemory(track.id, artUrl, track.name, track.artists?.[0]?.name || '');
        } else {
          localArtCache[track.id] = 'notfound';
          setTimeout(() => { if (localArtCache[track.id] === 'notfound') delete localArtCache[track.id]; }, 10000);
        }
        if (artUrl && currentTrackId === track.id) {
          track.album = track.album || { images: [] };
          track.album.images = [{ url: artUrl }, { url: artUrl }, { url: artUrl }];
          setArtWithSparkle(widgetAlbumArt, artUrl);
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
          try { updateStudioSidebar(track, artUrl); } catch (e) {}
          try { syncDynamicIslandState(); } catch (e) {}
          const artModal = document.getElementById("album-art-modal");
          if (artModal && artModal.classList.contains("show")) {
            showAlbumArtModal();
          }
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
    const allArtists = (track.artists && Array.isArray(track.artists) && track.artists.length > 0)
      ? track.artists.map(a => a.name).filter(Boolean).join(", ")
      : (track.artist || '');
    const primaryArtist = (track.artists && track.artists[0] && track.artists[0].name)
      ? track.artists[0].name
      : (allArtists.split(/,| feat\.| ft\./i)[0].trim() || 'Unknown');
    const targetArtistName = allArtists || primaryArtist;
    const targetAlbumName = track.album?.name || '';
    const targetTrackDuration = trackDuration;
    const finalIsrc = track.external_ids?.isrc || null;

    // Check if lyrics are already cached locally — if so, load instantly (0ms)!
    const cacheKey = `lyrics_cache_v21_${targetTrackId}`;
    const hasCachedLyrics = !!localStorage.getItem(cacheKey);

    const executeTrackFetches = () => {
      if (currentTrackId !== targetTrackId) return;
      fetchGeniusFact(targetTrackName, primaryArtist);
      fetchGeniusAnnotations(targetTrackName, primaryArtist, targetTrackId);
      fetchLyrics(targetTrackId, targetTrackName, targetArtistName || 'Unknown', targetTrackDuration, finalIsrc, {
        allArtists,
        primaryArtist,
        album: targetAlbumName
      });
    };

    const nowTs = Date.now();
    window._recentTrackSkips = (window._recentTrackSkips || []).filter(t => (nowTs - t) < 300);
    window._recentTrackSkips.push(nowTs);
    const isRapidScrubbing = window._recentTrackSkips.length > 2;

    if (hasCachedLyrics || !isRapidScrubbing) {
      // Zero-delay dispatch: single skips and song progressions execute immediately (0ms)!
      executeTrackFetches();
    } else {
      // Throttle network requests by 80ms ONLY during rapid scrubbing (>2 skips within 300ms)
      trackSwitchDebounceTimer = setTimeout(executeTrackFetches, 25);
    }
  }
}

// History logging
function logTrackHistory(track) {
  try {
    let albumArtUrl = track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || "";
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
    if (history.length > 25) history = history.slice(0, 25);

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
fetchAbortController = null;

// Track alternative candidates and rejected signatures per trackId
isReloadingLyrics = false;

/**
 * Non-blocking Auto-Translation Engine
 * Translates song lyrics into target language and persists translations into cache.
 */
const HINDI_PUNJABI_MARKERS = new Set([
  // Punjabi markers
  'kade', 'milke', 'betho', 'kariye', 'vaaj', 'mardi', 'fado', 'taareyan', 'mainu', 'tenu', 'assi',
  'tussi', 'sanhu', 'sohni', 'sohna', 'kudi', 'munda', 'jatt', 'jatti', 'gabru', 'billo', 'chhad',
  'chhadke', 'pind', 'naal', 'nachdi', 'karda', 'kardi', 'karde', 'kiven', 'hor', 'gallan', 'yaari',
  'boliyan', 'bhangra', 'gediyan', 'patiala', 'amritsar', 'punjab', 'punjabi', 'chandigarh', 'jhanjhar',
  'surma', 'kolo', 'veere', 'sohneya', 'mutiyar', 'jind', 'jindri', 'ni', 'sardar', 'sajjna', 'channa',
  'chann', 'akhiyan', 'akh', 'dilbar', 'dildar', 'veh', 'vich', 'tethon', 'methon', 'rehnda', 'rehndi',
  'rehnde', 'kudiye', 'mundeya', 'nachna', 'nach', 'giddha', 'jattwaad', 'gabruu', 'salwar', 'jhanjran', 'jhanjar',
  // Hindi markers
  'mein', 'mai', 'hai', 'hain', 'hoon', 'ho', 'tha', 'thi', 'the', 'thay', 'hoga', 'hogi', 'hoge',
  'tum', 'tumhe', 'tumko', 'tera', 'teri', 'tere', 'tujhe', 'tujhko', 'aap', 'aapko', 'hum', 'humein',
  'hume', 'hamara', 'hamari', 'mera', 'meri', 'mere', 'kya', 'kyun', 'kyu', 'kaise', 'kahan', 'yahan',
  'wahan', 'yeh', 'woh', 'nahi', 'nahin', 'mat', 'kyunki', 'jab', 'tab', 'bhi', 'toh', 'agar', 'lekin',
  'saath', 'zindagi', 'pyar', 'pyaar', 'ishq', 'mohabbat', 'deewana', 'dil', 'dhadkan', 'aankhon',
  'raat', 'subah', 'shaam', 'duniya', 'khushi', 'dard', 'chahiye', 'mujhe', 'mujhko', 'raha', 'rahi',
  'rahe', 'karo', 'karna', 'karke', 'mujhse', 'kuch', 'koi', 'yaha', 'waha', 've', 'sajna', 'yaara',
  'rab', 'rabb', 'tu', 'tune', 'tumhara', 'tumhari', 'tumhare', 'apna', 'apni', 'apne', 'humara',
  'humari', 'humare', 'unka', 'unki', 'unke', 'iska', 'iski', 'iske', 'uska', 'uski', 'uske',
  'inse', 'usse', 'unse', 'kaun', 'kisko', 'kisne', 'kiske', 'kidhar', 'kidar', 'kab', 'kaisa',
  'kaisi', 'kitna', 'kitni', 'kitne', 'isliye', 'phir', 'fir', 'abhi', 'ab', 'kabhi', 'hamesha',
  'har', 'sab', 'sabka', 'sabki', 'bahut', 'bohot', 'zyada', 'kam', 'sirf', 'bas', 'bilkul',
  'accha', 'acha', 'achha', 'acchi', 'achhi', 'bura', 'buri', 'sahi', 'galat', 'chal', 'chalo',
  'chale', 'chali', 'chalta', 'chalti', 'chalte', 'ja', 'jaa', 'jao', 'jaana', 'jaane', 'aaja',
  'aajao', 'aana', 'aaye', 'gaya', 'gayi', 'gaye', 'kar', 'karu', 'karoon', 'kare', 'karen',
  'karta', 'karti', 'karte', 'kiya', 'kiye', 'karne', 'hota', 'hoti', 'hote', 'hua', 'hui',
  'hue', 'rakh', 'rakhna', 'dono', 'diya', 'diye', 'le', 'lo', 'lena', 'mile', 'milta',
  'milti', 'milna', 'bol', 'bolo', 'bola', 'boli', 'suno', 'suna', 'dekho', 'dekh', 'dekha',
  'dekhi', 'samajh', 'samjha', 'pata', 'maloom', 'waqt', 'lamha', 'lamhe', 'pal', 'sapna',
  'sapne', 'khwab', 'khwaab', 'yaad', 'yaadein', 'jaan', 'zara', 'aashiq', 'sajni', 'maahi',
  'mahi', 'sanam', 'piya', 'saajan', 'saiyaan', 'saiyan', 'haye', 'haaye', 'oye', 'uff',
  'jiya', 'jiyara', 'naina', 'roop', 'rang', 'chand', 'chaand', 'taare', 'mausam', 'baarish',
  'badal', 'hawa', 'saans', 'saanson', 'aankhein', 'aankhen', 'honth', 'labon', 'rasta',
  'raaste', 'manzil', 'tanha', 'tanhai', 'intezaar', 'intezar', 'wafa', 'bewafa', 'dilruba',
  'kismat', 'naseeb', 'khuda', 'barfi', 'paas', 'aas', 'baat', 'baatein', 'baatain'
]);

const ENGLISH_COMMON_MARKERS = new Set([
  'the', 'this', 'that', 'with', 'from', 'they', 'them', 'their', 'there',
  'what', 'when', 'where', 'which', 'would', 'could', 'should', 'about',
  'into', 'because', 'through', 'people', 'around', 'just', 'like', 'know'
]);

function isRomanizedHindiTranslation(text) {
  const value = String(text || '').trim().toLowerCase();
  if (!value || /[\u0900-\u097f]/u.test(value)) return false;
  const tokens = value.match(/[a-z]+/g) || [];
  if (tokens.length < 2) return false;
  const markerTokens = tokens.filter(token => HINDI_PUNJABI_MARKERS.has(token));
  const distinctMarkerCount = new Set(markerTokens).size;
  const density = markerTokens.length / tokens.length;
  return distinctMarkerCount >= 2 && markerTokens.length >= 2 && density >= (tokens.length <= 4 ? 0.5 : 0.35);
}

function isHinglishLyrics(lines) {
  if (!lines || !Array.isArray(lines) || lines.length === 0) return false;
  let matches = 0;
  let totalTokenHits = 0;
  let englishHits = 0;
  const distinctHits = new Set();
  const sample = lines.slice(0, 40);
  for (const l of sample) {
    const text = (l.text || '').trim();
    if (!text) continue;
    if (isRomanizedHindiTranslation(text)) {
      matches++;
    }
    const tokens = text.toLowerCase().match(/[a-z]+/g) || [];
    for (const t of tokens) {
      if (HINDI_PUNJABI_MARKERS.has(t)) {
        totalTokenHits++;
        distinctHits.add(t);
      }
      if (ENGLISH_COMMON_MARKERS.has(t)) {
        englishHits++;
      }
    }
  }
  // English tracks with rare loanwords: don't classify as Hinglish if English dominates
  if (englishHits >= 3 && englishHits > totalTokenHits) {
    return false;
  }
  return matches >= 2 || (totalTokenHits >= 4 && distinctHits.size >= 2);
}

async function triggerAutoTranslation(targetTrackId, linesToTranslate, cacheKey = null, force = false) {
  if (!settings.translateLang || settings.translateLang === 'none') return;
  if (!linesToTranslate || !Array.isArray(linesToTranslate) || linesToTranslate.length === 0) return;
  if (!window.electronAPI || typeof window.electronAPI.translateText !== 'function') return;

  // If Hinglish translation is disabled in settings, skip Romanized Hindi/Punjabi tracks
  if (!settings.hinglishTranslate && isHinglishLyrics(linesToTranslate)) {
    console.log('[LF-LYRICS] Auto-translation skipped: Hinglish translation disabled in settings');
    linesToTranslate.forEach(line => { delete line.subText; });
    linesToTranslate._transLang = settings.translateLang;
    linesToTranslate._translationSourceLang = 'hinglish';
    linesToTranslate._noTransNeeded = true;
    linesToTranslate._hasTranslation = false;
    if (cacheKey) {
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cachedObj = JSON.parse(cachedRaw);
          cachedObj.lyrics = linesToTranslate;
          cachedObj.transLang = settings.translateLang;
          cachedObj.translationSourceLang = 'hinglish';
          cachedObj.noTransNeeded = true;
          saveLyricsToCache(cacheKey, cachedObj);
        }
      } catch (_) {}
    }
    if (targetTrackId === currentTrackId) {
      dismissSatelliteForUntranslatedTrack();
      renderLyrics();
      const islandLine = document.getElementById('island-lyric-line');
      if (islandLine) {
        islandLine.dataset.lineIndex = '';
        islandLine.dataset.transMode = '';
        islandLine.dataset.subText = '';
      }
      if (lyrics && lyrics.length > 0 && activeLineIndex >= 0) {
        updateDynamicIslandLyric(activeLineIndex, lyrics[activeLineIndex], currentProgress);
      }
    }
    return;
  }

  // If already translated into this exact language and not forced, skip
  const hasExistingTranslation = linesToTranslate.some(l => l.subText && l.subText.trim());
  if (!force && linesToTranslate._transLang === settings.translateLang &&
      ((!hasExistingTranslation && linesToTranslate._noTransNeeded) ||
       (hasExistingTranslation && linesToTranslate._translationSourceLang &&
        linesToTranslate._translationSourceLang.split('-')[0].toLowerCase() !== settings.translateLang.split('-')[0].toLowerCase()))) {
    return;
  }

  // R9: 60-Second Translation Stream Circuit Breaker
  if (!force && typeof window !== 'undefined' && window._translationCircuitBreakerUntil && Date.now() < window._translationCircuitBreakerUntil) {
    console.warn(`[LF-LYRICS] Translation circuit breaker active (cooldown for 60s); fast-failing outbound request for ${targetTrackId}`);
    linesToTranslate._noTransNeeded = true;
    linesToTranslate._transLang = settings.translateLang;
    return;
  }

  const skipLang = settings.skipLang || 'none';
  const translatableLines = [];
  const translatableIndices = [];

  linesToTranslate.forEach((l, idx) => {
    const text = (l.text || '').replace(/[\r\n]+/g, ' ').trim();
    if (text) {
      translatableLines.push(text);
      translatableIndices.push(idx);
    }
  });

  if (translatableLines.length === 0) return;

  const combinedText = translatableLines.join('\n@@@\n');

  if (!triggerAutoTranslation._pendingRequests) {
    triggerAutoTranslation._pendingRequests = new Set();
  }
  const translationRequestId = `${targetTrackId}_${settings.translateLang}`;
  if (triggerAutoTranslation._pendingRequests.has(translationRequestId) && !force) {
    return;
  }
  triggerAutoTranslation._pendingRequests.add(translationRequestId);
  triggerAutoTranslation._activeRequest = translationRequestId;

  try {
    const transRes = await window.electronAPI.translateText(combinedText, settings.translateLang, skipLang);
    // Ignore stale request if a newer translation was triggered
    if (triggerAutoTranslation._activeRequest !== translationRequestId) return;

    if (!transRes || !transRes.text) {
      if (transRes && transRes.skipped) {
        console.log(`[LF-LYRICS] Auto-translation skipped: original track matches target/skip language (${transRes.src})`);
        linesToTranslate.forEach(line => { delete line.subText; });
        linesToTranslate._transLang = settings.translateLang;
        linesToTranslate._translationSourceLang = transRes.src || 'unknown';
        linesToTranslate._noTransNeeded = true;
        linesToTranslate._hasTranslation = false;
        if (cacheKey) {
          try {
            const cachedRaw = localStorage.getItem(cacheKey);
            if (cachedRaw) {
              const cachedObj = JSON.parse(cachedRaw);
              cachedObj.lyrics = linesToTranslate;
              cachedObj.transLang = settings.translateLang;
              cachedObj.translationSourceLang = transRes.src || 'unknown';
              cachedObj.noTransNeeded = true;
              saveLyricsToCache(cacheKey, cachedObj);
            }
          } catch (_) {}
        }
        if (targetTrackId === currentTrackId) {
          dismissSatelliteForUntranslatedTrack();
          renderLyrics();
          const islandLine = document.getElementById('island-lyric-line');
          if (islandLine) {
            islandLine.dataset.lineIndex = '';
            islandLine.dataset.transMode = '';
            islandLine.dataset.subText = '';
          }
          if (lyrics && lyrics.length > 0 && activeLineIndex >= 0) {
            updateDynamicIslandLyric(activeLineIndex, lyrics[activeLineIndex], currentProgress);
          }
        }
      } else {
        // Translation failed (e.g. 429 Too Many Requests or network error).
        // Trip circuit breaker for 60 seconds to protect event loop & external endpoints
        if (typeof window !== 'undefined') {
          window._translationCircuitBreakerUntil = Date.now() + 60000;
        }
        console.warn(`[LF-LYRICS] Auto-translation rate-limited or unavailable for ${targetTrackId}; circuit breaker tripped for 60s`);
        linesToTranslate._noTransNeeded = true;
        linesToTranslate._transLang = settings.translateLang;
      }
      return;
    }

    const sourceLang = String(transRes.src || '').split('-')[0].toLowerCase();
    const targetLang = String(settings.translateLang || '').split('-')[0].toLowerCase();
    if ((!settings.hinglishTranslate && sourceLang === 'hinglish') ||
        (sourceLang && targetLang && sourceLang === targetLang && sourceLang !== 'hinglish')) {
      linesToTranslate.forEach(line => { delete line.subText; });
      linesToTranslate._transLang = settings.translateLang;
      linesToTranslate._translationSourceLang = transRes.src;
      linesToTranslate._noTransNeeded = true;
      linesToTranslate._hasTranslation = false;
      if (cacheKey) {
        try {
          const cachedRaw = localStorage.getItem(cacheKey);
          if (cachedRaw) {
            const cachedObj = JSON.parse(cachedRaw);
            cachedObj.lyrics = linesToTranslate;
            cachedObj.transLang = settings.translateLang;
            cachedObj.translationSourceLang = transRes.src;
            cachedObj.noTransNeeded = true;
            saveLyricsToCache(cacheKey, cachedObj);
          }
        } catch (_) {}
      }
      if (targetTrackId === currentTrackId) {
        dismissSatelliteForUntranslatedTrack();
        renderLyrics();
        const islandLine = document.getElementById('island-lyric-line');
        if (islandLine) {
          islandLine.dataset.lineIndex = '';
          islandLine.dataset.transMode = '';
          islandLine.dataset.subText = '';
        }
        if (lyrics && lyrics.length > 0 && activeLineIndex >= 0) {
          updateDynamicIslandLyric(activeLineIndex, lyrics[activeLineIndex], currentProgress);
        }
      }
      return;
    }

    const hasDelimiters = transRes.text.includes('@@@');
    const transLines = hasDelimiters ? transRes.text.split(/\s*@@@\s*/) : transRes.text.split('\n');
    let hasNewTrans = false;

    if (hasDelimiters) {
      const limit = Math.min(transLines.length, translatableIndices.length);
      for (let i = 0; i < limit; i++) {
        let transText = transLines[i] ? transLines[i].trim() : '';
        transText = decodeHtmlEntities(transText);
        if (isRomanizedHindiTranslation(transText)) {
          transText = '';
        }
        const targetIdx = translatableIndices[i];
        const origText = (linesToTranslate[targetIdx].text || '').trim();
        if (transText && transText.toLowerCase() !== origText.toLowerCase()) {
          linesToTranslate[targetIdx].subText = transText;
          hasNewTrans = true;
        }
      }
    } else {
      const limit = Math.min(transLines.length, linesToTranslate.length);
      for (let i = 0; i < limit; i++) {
        let transText = transLines[i] ? transLines[i].trim() : '';
        transText = decodeHtmlEntities(transText);
        if (isRomanizedHindiTranslation(transText)) {
          transText = '';
        }
        const origText = (linesToTranslate[i].text || '').trim();
        if (transText && transText.toLowerCase() !== origText.toLowerCase()) {
          linesToTranslate[i].subText = transText;
          hasNewTrans = true;
        }
      }
    }

    linesToTranslate._transLang = settings.translateLang;
    linesToTranslate._translationSourceLang = transRes.src || 'unknown';
    if (hasNewTrans) {
      linesToTranslate._hasTranslation = true;
      delete linesToTranslate._noTransNeeded;
    } else {
      linesToTranslate._noTransNeeded = true;
      linesToTranslate._hasTranslation = false;
      if (targetTrackId === currentTrackId) {
        dismissSatelliteForUntranslatedTrack();
      }
    }

    // Persist updated lyrics with subText back into cache
    if (cacheKey) {
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cachedObj = JSON.parse(cachedRaw);
          cachedObj.lyrics = linesToTranslate;
          cachedObj.transLang = settings.translateLang;
          cachedObj.translationSourceLang = transRes.src || 'unknown';
          if (!hasNewTrans) cachedObj.noTransNeeded = true;
          saveLyricsToCache(cacheKey, cachedObj);
        }
      } catch (_) {}
    }

    if (hasNewTrans) {
      // If track is still active, update UI immediately
      if (targetTrackId === currentTrackId) {
        renderLyrics();
        const islandLine = document.getElementById("island-lyric-line");
        if (islandLine) {
          islandLine.dataset.lineIndex = "";
          islandLine.dataset.transMode = "";
          islandLine.dataset.subText = "";
        }
        if (lyrics && lyrics.length > 0 && activeLineIndex >= 0) {
          updateDynamicIslandLyric(activeLineIndex, lyrics[activeLineIndex], currentProgress);
        }
      }
    } else {
      // Track has no translation needed: ensure satellite is reset & turned off
      if (targetTrackId === currentTrackId) {
        resetSatelliteIslandState(false);
      }
    }
  } catch (err) {
    if (typeof window !== 'undefined') {
      window._translationCircuitBreakerUntil = Date.now() + 60000;
    }
    console.warn("[LF-LYRICS] Translation Notice (Circuit Breaker Tripped):", err);
    linesToTranslate._noTransNeeded = true;
    linesToTranslate._transLang = settings.translateLang;
  } finally {
    if (triggerAutoTranslation._pendingRequests) {
      triggerAutoTranslation._pendingRequests.delete(translationRequestId);
    }
  }
}

const previousLyricsStorageKey = (trackId) => `lyrics_previous_lrc_${trackId}`;

function updatePreviousLyricsRestoreButton() {
  const hasPrevious = Boolean(currentTrackId && localStorage.getItem(previousLyricsStorageKey(currentTrackId)));
  if (btnRestoreLyrics) btnRestoreLyrics.style.display = hasPrevious ? 'inline-flex' : 'none';
}

function savePreviousLyricsSnapshot(trackId, cacheKey) {
  if (!trackId) return;
  let snapshot = null;
  if (trackId === currentTrackId && Array.isArray(lyrics) && lyrics.length > 0) {
    snapshot = { lyrics, level: currentSourceLevel, source: currentLyricSourceName, candidateInfo: currentLyricCandidateInfo };
  } else {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && Array.isArray(cached.lyrics) && cached.lyrics.length > 0) snapshot = cached;
    } catch (_) {}
  }
  if (!snapshot) return;
  try {
    localStorage.setItem(previousLyricsStorageKey(trackId), JSON.stringify({
      lyrics: JSON.parse(JSON.stringify(snapshot.lyrics)),
      level: Number(snapshot.level) || 2,
      source: snapshot.source || '',
      candidateInfo: snapshot.candidateInfo || '',
      savedAt: Date.now()
    }));
    if (trackId === currentTrackId) updatePreviousLyricsRestoreButton();
  } catch (err) {
    console.warn('[LF-LYRICS] Could not preserve previous lyrics before refetch:', err);
  }
}

function restorePreviousLyrics() {
  if (!currentTrackId) {
    showToast('Play a track before restoring lyrics.', 2200, 'warning');
    return false;
  }
  let snapshot;
  try {
    snapshot = JSON.parse(localStorage.getItem(previousLyricsStorageKey(currentTrackId)) || 'null');
  } catch (_) { snapshot = null; }
  if (!snapshot || !Array.isArray(snapshot.lyrics) || snapshot.lyrics.length === 0) {
    updatePreviousLyricsRestoreButton();
    showToast('No previous lyrics are saved for this track.', 2400, 'warning');
    return false;
  }

  // Stop an in-flight refetch from replacing the restored lyrics a moment later.
  if (fetchAbortController) {
    try { fetchAbortController.abort(); } catch (_) {}
    fetchAbortController = null;
  }
  isReloadingLyrics = false;

  lyrics = JSON.parse(JSON.stringify(snapshot.lyrics));
  currentSourceLevel = Number(snapshot.level) || 2;
  lastIslandSyncData = null;
  updateTimingStatus(currentSourceLevel, snapshot.source || '', snapshot.candidateInfo || '');
  if (window.LyricsService?.instance?.engine && window.ExistingWaterfallProvider?.toNormalized) {
    try {
      const normalized = window.ExistingWaterfallProvider.toNormalized(
        lyrics,
        snapshot.source || 'Restored lyrics',
        currentSourceLevel === 3 ? 'WORD_SYNCED' : 'LINE_SYNCED'
      );
      if (normalized) window.LyricsService.instance.engine.setLyrics(normalized);
    } catch (err) {
      console.warn('[LF-LYRICS] Could not restore synchronized engine state:', err);
    }
  }
  try {
    saveLyricsToCache(`lyrics_cache_v21_${currentTrackId}`, {
      level: currentSourceLevel,
      lyrics,
      source: snapshot.source || 'Restored lyrics',
      candidateInfo: snapshot.candidateInfo || '',
      candidateIndex: trackLyricsCandidateIndex[currentTrackId] || 0
    });
  } catch (err) {
    console.warn('[LF-LYRICS] Could not update restored lyric cache:', err);
  }
  renderLyrics();
  adaptBpmSync(lyrics);
  updatePreviousLyricsRestoreButton();
  showToast('Previous lyrics restored.', 2200, 'success');
  return true;
}

// Synced lyrics fetching via V2 Unified Proxy (Spotify Internal) + Direct LRCLIB
async function fetchLyrics(trackId, trackName, artistName, durationMs, isrc = null, options = {}) {
  if (typeof isrc === 'object' && isrc !== null && Object.keys(options).length === 0) {
    options = isrc;
    isrc = null;
  }
  if (!options.forceRefresh && inFlightLyricsRequests.has(trackId)) {
    return inFlightLyricsRequests.get(trackId);
  }
  const reqPromise = _executeFetchLyrics(trackId, trackName, artistName, durationMs, isrc, options);
  inFlightLyricsRequests.set(trackId, reqPromise);
  try {
    return await reqPromise;
  } finally {
    inFlightLyricsRequests.delete(trackId);
  }
}

async function _executeFetchLyrics(trackId, trackName, artistName, durationMs, isrc = null, options = {}) {
  isFetchingLyrics = true;
  if (fetchAbortController) {
    fetchAbortController.abort();
  }
  fetchAbortController = new AbortController();
  const signal = fetchAbortController.signal;

  const cleanArtist = artistName.replace(/VEVO$/i, '').replace(/- Topic$/i, '').replace(/Official$/i, '').trim() || artistName;
  const cleanTrack = trackName
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?(Official|Audio|Video|feat\.|ft\.|with|from|soundtrack|theme|ost).*?\)/ig, '')
    .replace(/\(.*?\b(?:feat(?:uring)?|ft)\b.*?\)/ig, '')
    .replace(/ - (Remastered|Radio Edit|Live|Instrumental|Acoustic|Single Version|From .*).*/i, '')
    .replace(/\s+(?:feat(?:uring)?|ft)\.?\s+.*$/i, '')
    .replace(/\s+(feat\.|ft\.).*$/i, '')
    .trim() || trackName;
  // qApple needs the feature credit to distinguish an alternate recording
  // from the standard cut; the general provider query can keep using cleanTrack.
  const qAppleTrack = /\b(?:feat(?:uring)?|ft)\.?\s/i.test(trackName) ? trackName.trim() : cleanTrack;

  const isTrackStillCurrent = () => {
    if (trackId === currentTrackId) return true;
    if (trackId && currentTrackId && normalizeTrackId(trackId) === normalizeTrackId(currentTrackId)) return true;
    if (currentPlayingTrackObj && isSameTrack({ id: trackId, name: cleanTrack, artist: cleanArtist }, currentPlayingTrackObj)) return true;
    return false;
  };

  let appliedNewLyricsInThisFetch = false;

  const cacheKey = `lyrics_cache_v21_${trackId}`;

  if (!options.forceRefresh && rejectedLyricsSignatures[trackId]) {
    delete rejectedLyricsSignatures[trackId];
  }

  if (options.forceRefresh) {
    savePreviousLyricsSnapshot(trackId, cacheKey);
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
        // Integrity check: If this is Yeat "Back Home" (194s ADL track) but cached lyrics are the 2023 AftërLyfe "Back homë" ("flew it to milan" / "working on dying"), bust cache immediately!
        const isYeatBackHome = cleanTrack.toLowerCase() === "back home" && cleanArtist.toLowerCase().includes("yeat");
        const isPollutedYeatLyrics = isYeatBackHome && Array.isArray(cachedData.lyrics) && cachedData.lyrics.some(l => {
          const t = (l.text || "").toLowerCase();
          return t.includes("working on dying") || t.includes("flew it to milan") || t.includes("fly no jet");
        });
        const isStaleQAppleTimingCache = /qapple|apple/i.test(String(cachedData.source || '')) &&
          (cachedData.qappleTimeNormalizationVersion !== 2 ||
            cachedData.qappleTrackValidationVersion !== 4);

        if (isPollutedYeatLyrics) {
          console.warn("[LF-LYRICS] Detected corrupted/polluted cache for Yeat - Back Home. Busting stale cache.");
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`lyrics_cache_${trackId}`);
          if (!rejectedLyricsSignatures[trackId]) rejectedLyricsSignatures[trackId] = new Set();
          const currentSig = cachedData.lyrics.slice(0, 4).map(l => (l.text || "").trim().toLowerCase()).join("|");
          if (currentSig) rejectedLyricsSignatures[trackId].add(currentSig);
        } else if (isStaleQAppleTimingCache) {
          console.log(`[LF-LYRICS] Purging qApple cache with outdated timestamp or track validation for ${trackId}`);
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`lyrics_cache_${trackId}`);
        } else if (cachedData.source && /proxy/i.test(cachedData.source)) {
          console.log(`[LF-LYRICS] Purging stale proxy cached lyrics for ${trackId}`);
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`lyrics_cache_${trackId}`);
        } else if (trackId === currentTrackId && cachedData.lyrics?.length > 0) {
          let loadedLyrics = cachedData.lyrics;
          if (settings.filterSongCredits !== false) {
            loadedLyrics = loadedLyrics.filter(l => !isLyricMetadataOrCreditLine(extractLineText(l)));
          }
          if (!settings.hinglishTranslate && (cachedData.translationSourceLang === 'hinglish' || isHinglishLyrics(loadedLyrics))) {
            loadedLyrics.forEach(l => { delete l.subText; });
            cachedData.noTransNeeded = true;
            delete cachedData.transLang;
          }
          const exactTrackArtists = currentPlayingTrackObj?.artists?.map((artist) => artist?.name).filter(Boolean);
          const trackArtistInput = exactTrackArtists?.length
            ? exactTrackArtists
            : ((options && options.allArtists) || artistName || '');
          if (typeof applyLyricsArtistSeparation === 'function') {
            loadedLyrics = applyLyricsArtistSeparation(loadedLyrics, trackArtistInput);
          }
          lyrics = loadedLyrics;
          lyrics._transLang = cachedData.transLang;
          lyrics._translationSourceLang = cachedData.translationSourceLang || null;
          lyrics._hasTranslation = loadedLyrics.some(l => l.subText && l.subText.trim().length > 0 && l.subText.trim().toLowerCase() !== (l.text || '').trim().toLowerCase());
          if (cachedData.noTransNeeded) lyrics._noTransNeeded = true;
          isFetchingLyrics = false;
          const cachedHasWordTiming = loadedLyrics.some(line => Array.isArray(line.words) && line.words.length > 0);
          const cachedLevel = cachedHasWordTiming ? 3 : Math.min(Number(cachedData.level) || 2, 2);
          currentSourceLevel = cachedLevel;
          updateTimingStatus(cachedLevel, cachedData.source || "", cachedData.candidateInfo || "");

          // Reconcile timed words with typography and punctuation rules for cached lyrics
          if (typeof reconcileTimedWords === 'function') {
            lyrics.forEach(line => {
              if (line.words && line.words.length > 0) {
                line.words = reconcileTimedWords(line.words, line.text || "");
              }
            });
          }

          // Keep lyric engine synchronized with standard internal NormalizedLyrics on cache hits
          if (window.LyricsService?.instance?.engine) {
            if (window.ExistingWaterfallProvider && typeof window.ExistingWaterfallProvider.toNormalized === 'function') {
              const norm = window.ExistingWaterfallProvider.toNormalized(
                lyrics,
                cachedData.source || "Cached",
                cachedData.level === 3 ? 'WORD_SYNCED' : 'LINE_SYNCED'
              );
              if (norm) {
                window.LyricsService.instance.engine.setLyrics(norm);
              }
            }
          }

          renderLyrics();
          adaptBpmSync(lyrics);
          if (isKineticMode && kineticRendererInstance) {
            syncKineticState();
          }
          if ((isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === 'cinematic')) && cinematicMainRendererInstance) {
            syncCinematicState();
          }

          // Non-blocking Auto-Translation check on cached lyrics
          if (settings.translateLang && settings.translateLang !== 'none') {
            const hasSubText = lyrics.some(l => l.subText && l.subText.trim());
            const langMatches = cachedData.transLang === settings.translateLang;
            const sourceLang = String(cachedData.translationSourceLang || '').split('-')[0].toLowerCase();
            const targetLang = String(settings.translateLang).split('-')[0].toLowerCase();
            const needsTranslationValidation = hasSubText && (!sourceLang || sourceLang === targetLang);
            if ((!hasSubText && !cachedData.noTransNeeded) || !langMatches || needsTranslationValidation) {
              triggerAutoTranslation(trackId, lyrics, cacheKey);
            }
          }

          // Older caches could be mislabeled word-synced even though no timed
          // word tokens were stored. Keep them visible, but query for real WBW.
          const cachedIsQApple = /qapple|apple/i.test(String(cachedData.source || ''));
          if (cachedLevel === 3 && cachedHasWordTiming && cachedIsQApple) return;
        }
      } catch (e) { console.error(e); }
    }
  }

  const durationSec = Math.round(durationMs / 1000);

  try {
    if (lyrics.length > 0 && currentSourceLevel > 0) {
      // Keep the currently displayed cache/provider quality as the baseline.
      // Resetting this before refresh lets an unsynced response replace better
      // cached lyrics while providers are being rechecked.
      updateTimingStatus(currentSourceLevel, currentLyricSourceName, currentLyricCandidateInfo);
    } else {
      updateTimingStatus(0); // "Checking..."
      currentSourceLevel = 0;
      currentLyricSourceName = '';
      currentLyricCandidateInfo = '';
    }

    const hasLrcTimestamps = (text) => {
      if (!text || typeof text !== 'string') return false;
      return /\[\d{1,2}:\d{2}[.:]\d{2,3}\]/.test(text);
    };

    const extractLineText = (l) => {
      if (!l) return "";
      if (typeof l === "string") return l.trim();
      if (typeof l.text === "string" && l.text.trim()) return l.text.trim();
      if (typeof l.words === "string" && l.words.trim()) return l.words.trim();
      if (Array.isArray(l.words) && l.words.length > 0) {
        return l.words.map(w => (typeof w === 'string' ? w : (w.text || w.string || ""))).join(" ").trim();
      }
      return "";
    };

    const getLinesSignature = (lines) => {
      if (!lines || !Array.isArray(lines) || lines.length === 0) return "";
      return lines
        .map(extractLineText)
        .filter(t => t.length > 0)
        .slice(0, 4)
        .map(t => t.toLowerCase())
        .join("|");
    };

    const isPollutedYeatLyrics = (lines) => {
      if (!lines || !Array.isArray(lines)) return false;
      const isYeatBackHome = cleanTrack.toLowerCase() === "back home" && (cleanArtist.toLowerCase().includes("yeat") || (options.allArtists && options.allArtists.toLowerCase().includes("yeat")));
      if (!isYeatBackHome) return false;
      return lines.some(l => {
        const t = extractLineText(l).toLowerCase();
        return t.includes("working on dying") || t.includes("flew it to milan") || t.includes("fly no jet");
      });
    };

    const applyLyricsData = async (parsedLines, sourceLevel, sourceName = "", candidateInfo = "", normalizedLyricsObj = null) => {
      const previousLyricsSignature = (lyrics || []).map(extractLineText).join('\n').toLowerCase();
      const previousHadWordTiming = Array.isArray(lyrics) && lyrics.some(line => Array.isArray(line.words) && line.words.length > 0);
      console.log(`[LF-LYRICS] applyLyricsData called: sourceLevel=${sourceLevel}, sourceName=${sourceName}, parsedLines.length=${parsedLines.length}, trackId=${trackId}, currentTrackId=${currentTrackId}`);
      // Strip structural tags and credit metadata (e.g., "[Outro]", "Intro", "制作人 : ...", "Lyrics by ...")
      const rawTrackArtistInput = (options && options.allArtists) || artistName || (currentPlayingTrackObj && currentPlayingTrackObj.artists && currentPlayingTrackObj.artists.map(a => a.name).join(' & ')) || '';
      parsedLines = parsedLines.filter(line => {
        if (!line.text) return false;
        const t = line.text.trim().toLowerCase();
        if (t.startsWith('[') && t.endsWith(']')) {
          if (typeof parseSingerTag === 'function' && parseSingerTag(line.text.trim(), rawTrackArtistInput)) {
            return true;
          }
          return false;
        }
        if (/^(outro|intro|instrumental|chorus|verse|bridge|hook)(\s+\d+)?$/i.test(t)) return false;
        if (settings.filterSongCredits !== false && isLyricMetadataOrCreditLine(extractLineText(line))) return false;
        return true;
      });

      if (!isTrackStillCurrent() || parsedLines.length === 0) {
        console.warn(`[LF-LYRICS] applyLyricsData REJECTED: trackId match=${isTrackStillCurrent()}, filteredLines=${parsedLines.length}`);
        return false;
      }

      // Automatically reject known polluted Yeat "Back Home" entries (2023 AftërLyfe lyrics uploaded under 194s track)
      if (isPollutedYeatLyrics(parsedLines)) {
        console.warn(`[LF-LYRICS] applyLyricsData REJECTED: detected polluted/mismatched Yeat - Back Home lyrics`);
        return false;
      }

      // Check rejected lyrics signature (only during manual candidate cycling/refresh)
      const linesSig = getLinesSignature(parsedLines);
      const isAppleMusicSource = sourceName && (sourceName.toLowerCase().includes('apple') || sourceName.toLowerCase().includes('qapple'));
      const isCurrentApple = currentLyricSourceName && (currentLyricSourceName.toLowerCase().includes('apple') || currentLyricSourceName.toLowerCase().includes('qapple'));
      const hasWordSync = sourceLevel === 3 || parsedLines.some(l => Array.isArray(l.words) && l.words.length > 0);
      const isQualityUpgrade = hasWordSync && !previousHadWordTiming;

      if (options.forceRefresh && rejectedLyricsSignatures[trackId]?.has(linesSig)) {
        if (isAppleMusicSource || isQualityUpgrade || sourceLevel > currentSourceLevel) {
          console.log(`[LF-LYRICS] applyLyricsData: allowing ${sourceName} past rejected-signature check for quality evaluation`);
        } else {
          console.warn(`[LF-LYRICS] applyLyricsData REJECTED: signature matches previously rejected lyrics for ${trackId}`);
          return false;
        }
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

      // Allow same-level replacement: level 2 lyrics replace level 2, and level 3 lyrics replace level 3
      const allowSameLevelReplacement = (sourceLevel >= 2 && sourceLevel === currentSourceLevel);

      // Prefer qApple at equal quality, but allow a genuine word-sync result
      // from NetEase (or another provider) to upgrade qApple line-synced lyrics.
      // Once qApple has timed words, keep its source priority unless same-level replacement applies.
      const incomingWordSyncUpgrade = sourceLevel >= 3 && currentSourceLevel < 3 && hasWordSync;
      if (!allowSameLevelReplacement && isCurrentApple && currentSourceLevel >= 2 && !isAppleMusicSource &&
          !incomingWordSyncUpgrade) {
        console.log(`[LF-LYRICS] applyLyricsData REJECTED: preserving priority qApple (${currentLyricSourceName}, lvl ${currentSourceLevel}) over non-Apple incoming ${sourceName} (lvl ${sourceLevel})`);
        return false;
      }

      if (sourceLevel < currentSourceLevel) {
        console.log(`[LF-LYRICS] applyLyricsData REJECTED: sourceLevel ${sourceLevel} < currentSourceLevel ${currentSourceLevel}`);
        return false;
      }
      if (sourceLevel === currentSourceLevel && lyrics.length > 0) {
        const currentSig = getLinesSignature(lyrics);
        if (sourceName === currentLyricSourceName && linesSig === currentSig && !options.forceRefresh) {
          console.log(`[LF-LYRICS] applyLyricsData REJECTED: identical lyrics already active from ${sourceName}`);
          return false;
        }
        // Upgrade exception:
        // 1. Level 2 lyrics replace level 2, and level 3 lyrics replace level 3
        // 2. If incoming is official Apple Music / qApple and existing was non-Apple
        // 3. If incoming has real word timing and existing does not
        const isAppleUpgrade = isAppleMusicSource && !isCurrentApple;
        if (!allowSameLevelReplacement && !isAppleUpgrade && !isQualityUpgrade) {
          console.log(`[LF-LYRICS] applyLyricsData REJECTED: incoming ${sourceName} (lvl ${sourceLevel}) does not upgrade current ${currentLyricSourceName} (lvl ${currentSourceLevel})`);
          return false;
        }
      }

      // Clear any existing subText before processing, and normalize millisecond helpers
      parsedLines.forEach(line => {
        if (!line.backingText && typeof line.text === 'string') {
          const suffix = line.text.match(/^(.*?)[ \t]{2,}((?:\([^()]+\)|\[[^\[\]]+\]|\{[^{}]+\})(?:[ \t]*(?:\([^()]+\)|\[[^\[\]]+\]|\{[^{}]+\}))*)\s*$/);
          if (suffix && suffix[1].trim() && suffix[2].trim()) {
            const leadText = suffix[1].trimEnd();
            const backingText = suffix[2].trim();
            line.backingText = backingText;
            line.text = leadText;

            if (Array.isArray(line.words) && line.words.length > 1) {
              const normalizeWords = value => String(value || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
              const targetLead = normalizeWords(leadText);
              let accumulated = '';
              for (let wi = 0; wi < line.words.length - 1; wi++) {
                const token = String(line.words[wi]?.text || '').trim();
                if (wi > 0 && /^[([{]/.test(token)) {
                  line.backingWords = line.words.slice(wi);
                  line.words = line.words.slice(0, wi);
                  break;
                }
                accumulated += normalizeWords(token);
                if (accumulated === targetLead) {
                  line.backingWords = line.words.slice(wi + 1);
                  line.words = line.words.slice(0, wi + 1);
                  break;
                }
                if (!targetLead.startsWith(accumulated)) break;
              }
            }
          }
        }
        if (!line.backingText && typeof line.subText === 'string' && /^[\(\[\{（【].+[\)\]\}）】]$/.test(line.subText.trim())) {
          line.backingText = line.subText.trim();
        }
        delete line.subText;
        if (line.timeMs == null && line.start != null) {
          line.timeMs = Math.round(Number(line.start) * 1000);
        }
        if (line.endMs == null && line.end != null) {
          line.endMs = Math.round(Number(line.end) > 1000 ? Number(line.end) : Number(line.end) * 1000);
        }
        if (line.words && Array.isArray(line.words)) {
          line.words.forEach(w => {
            if (w.timeMs == null && w.start != null) {
              w.timeMs = Math.round(Number(w.start) * 1000);
            }
            if (w.endMs == null && w.end != null) {
              w.endMs = Math.round(Number(w.end) > 1000 ? Number(w.end) : Number(w.end) * 1000);
            }
          });
        }
        if (Array.isArray(line.backingWords)) {
          line.backingWords.forEach(w => {
            if (w.timeMs == null && w.start != null) w.timeMs = Math.round(Number(w.start) * 1000);
            if (w.endMs == null && w.end != null) w.endMs = Math.round(Number(w.end) > 1000 ? Number(w.end) : Number(w.end) * 1000);
          });
          if (line.backingText && typeof reconcileTimedWords === 'function') {
            line.backingWords = reconcileTimedWords(line.backingWords, line.backingText);
          }
        }
      });
      delete parsedLines._hasTranslation;
      delete parsedLines._noTransNeeded;

      console.log(`[LF-LYRICS] applyLyricsData SUCCESS: setting ${parsedLines.length} lines, level=${sourceLevel}, source=${sourceName}`);
      const fetchedLyricsSignature = parsedLines.map(extractLineText).join('\n').toLowerCase();
      const fetchedHasWordTiming = parsedLines.some(line => Array.isArray(line.words) && line.words.length > 0);
      lyrics = parsedLines;
      lastIslandSyncData = null;
      isFetchingLyrics = false;
      currentSourceLevel = sourceLevel;
      appliedNewLyricsInThisFetch = true;
      updateTimingStatus(sourceLevel, sourceName, candidateInfo);

      if (options.forceRefresh && isDynamicIslandMode) {
        showIslandHud({ icon: "✓", text: `${sourceName || "Lyrics"} loaded`, showBar: false });
      }
      if (previousLyricsSignature && fetchedLyricsSignature && !isDynamicIslandMode &&
          (previousLyricsSignature !== fetchedLyricsSignature || (fetchedHasWordTiming && !previousHadWordTiming))) {
        showToast(`Lyrics updated from ${sourceName || 'the lyrics database'}.`, 3200, 'success');
      }

      // Apply multi-artist lyric separation and singer attribution
      const exactTrackArtists = currentPlayingTrackObj?.artists?.map((artist) => artist?.name).filter(Boolean)
        || currentPlayingTrackObj?.item?.artists?.map((artist) => artist?.name).filter(Boolean);
      const trackArtistInput = exactTrackArtists?.length
        ? exactTrackArtists
        : ((options && options.allArtists) || artistName || '');
      if (typeof applyLyricsArtistSeparation === 'function') {
        parsedLines = applyLyricsArtistSeparation(parsedLines, trackArtistInput);
      }

      // Reconcile timed words with typography and punctuation rules BEFORE initializing engine
      // This ensures 1:1 token matching between DOM word spans and engine word states
      if (typeof reconcileTimedWords === 'function') {
        parsedLines.forEach(line => {
          if (line.words && line.words.length > 0) {
            line.words = reconcileTimedWords(line.words, line.text || "");
          }
        });
      }
      lyrics = parsedLines;

      // Keep lyric engine synchronized with standard internal NormalizedLyrics
      if (window.LyricsService?.instance?.engine) {
        if (normalizedLyricsObj && window.LyricModels && window.LyricModels.isValidLyrics(normalizedLyricsObj)) {
          window.LyricsService.instance.engine.setLyrics(normalizedLyricsObj);
        } else if (window.ExistingWaterfallProvider && typeof window.ExistingWaterfallProvider.toNormalized === 'function') {
          const norm = window.ExistingWaterfallProvider.toNormalized(
            parsedLines,
            sourceName,
            sourceLevel === 3 ? 'WORD_SYNCED' : 'LINE_SYNCED'
          );
          if (norm) {
            window.LyricsService.instance.engine.setLyrics(norm);
          }
        }
      }
      saveLyricsToCache(cacheKey, {
        level: sourceLevel,
        lyrics,
        source: sourceName,
        candidateInfo,
        candidateIndex: trackLyricsCandidateIndex[trackId] || 0,
        ...( /qapple|apple/i.test(String(sourceName || '')) ? { qappleTimeNormalizationVersion: 2, qappleTrackValidationVersion: 4 } : {})
      });
      renderLyrics();
      adaptBpmSync(lyrics);
      if (isKineticMode && kineticRendererInstance) {
        syncKineticState();
      }
      if ((isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === 'cinematic')) && cinematicMainRendererInstance) {
        syncCinematicState();
      }
      if (typeof updateStudioSidebar === 'function' && (currentPlayingTrackObj || currentTrack)) {
        updateStudioSidebar(currentPlayingTrackObj || currentTrack, currentStaticAlbumArtUrl);
      }

      // Pop up studio synced badge ONLY on confirmed state (sourceLevel >= 2)
      const badgesRow = document.getElementById("studio-badges-row") || document.querySelector(".studio-badges-row");
      const badgeProvider = document.getElementById("studio-badge-provider");
      const badgeQuality = document.getElementById("studio-badge-quality");
      const badgeText = document.getElementById("studio-badge-text");

      if (sourceLevel >= 2 && badgeProvider && badgeText) {
        badgeText.textContent = (sourceLevel === 3) ? "Word-Synced" : "Synced";
        badgeProvider.style.display = "inline-flex";
        badgeProvider.classList.add("is-confirmed");
        if (badgesRow) {
          badgesRow.style.display = "flex";
          badgesRow.classList.add("has-badges");
        }
      } else if (badgeProvider) {
        badgeProvider.style.display = "none";
        badgeProvider.classList.remove("is-confirmed");
        if (badgesRow && (!badgeQuality || !badgeQuality.classList.contains("is-confirmed"))) {
          badgesRow.style.display = "none";
          badgesRow.classList.remove("has-badges");
        }
      }

      const btnHide = document.getElementById("btn-hide-lyrics");
      if (btnHide) btnHide.style.display = "inline-flex";

      // Non-blocking Auto-Translation (runs in background without stalling lyrics rendering)
      triggerAutoTranslation(trackId, parsedLines, cacheKey);

      return true;
    };

    let rateLimited = false;

    // Primary Provider: LyricsPlus v2 endpoint (rich word-by-word synced + line synced)
    const lyricsPlusFetch = async (customTimeout = null) => {
      try {
        if (!window.LyricsService || !window.LyricsService.instance) return false;
        const resolvedAlbum = options.album
          || currentPlayingTrackObj?.album?.name
          || (typeof currentPlayingTrackObj?.album === 'string' ? currentPlayingTrackObj.album : null)
          || (typeof currentLastfmAlbum === 'string' ? currentLastfmAlbum : null)
          || window._lastfmDiscoveredAlbum
          || (_directTrackLinkCache.get(`${cleanArtist} - ${cleanTrack}`.trim().toLowerCase())?.track?.album?.title)
          || null;
        const trackMeta = {
          title: qAppleTrack,
          artist: cleanArtist,
          artists: (typeof splitTrackArtists === 'function' ? splitTrackArtists(cleanArtist) : [cleanArtist]),
          album: typeof resolvedAlbum === 'string' ? resolvedAlbum : null,
          duration: durationSec,
          isrc: isrc || currentPlayingTrackObj?.external_ids?.isrc || null,
          platformId: trackId?.startsWith('spotify:track:') ? trackId.replace('spotify:track:', '') : trackId,
          source: (config && config.localMode) ? 'Local' : 'Spotify'
        };

        if (options.forceRefresh) {
          window.LyricsService.instance.lyricsPlusProvider.service.invalidateCache(trackMeta);
        }

        // qApple's upstream scraper can take several seconds on a cold cache.
        // Keep the preferred provider's request alive instead of prematurely
        // falling through to lower-priority providers.
        const effectiveTimeout = customTimeout != null ? customTimeout : 8500;

        const lpResult = await window.LyricsService.instance.lyricsPlusProvider.getLyrics(trackMeta, {
          signal,
          timeoutMs: effectiveTimeout,
          forceRefresh: !!options.forceRefresh,
          preferQApple: true
        });

        if (lpResult && Array.isArray(lpResult.lines) && lpResult.lines.length > 0 && isTrackStillCurrent()) {
          const hasWords = lpResult.lines.some(l => Array.isArray(l.words) && l.words.length > 0);
          const hasLineTimings = lpResult.lines.some(l => (l.timeMs != null && l.timeMs < 9999999) || (l.start != null && l.start < 9999));
          const isUnsynced = lpResult.type === 'UNSYNCED' || (!hasWords && !hasLineTimings);
          const level = hasWords ? 3 : (isUnsynced ? 1 : 2);
          return await applyLyricsData(lpResult.lines, level, lpResult.source || 'LyricsPlus', '', lpResult);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.debug('[LF-LYRICS] LyricsPlus query notice:', err);
        }
      }
      return false;
    };

    let hasTriggeredUpgradeProbe = false;

    window._triggerWordSyncWithAlbum = (discoveredAlbum) => {
      if (!isTrackStillCurrent() || currentSourceLevel >= 3) return;
      options.album = discoveredAlbum;
      hasTriggeredUpgradeProbe = false;
      triggerWordSyncUpgradeProbe();
    };

    const triggerWordSyncUpgradeProbe = () => {
      if (hasTriggeredUpgradeProbe) return;
      if (options.forceRefresh) return;
      if (settings.wordByWord === false || settings.neteaseWordByWord === false) return;
      const isCurrentApple = currentLyricSourceName && (currentLyricSourceName.toLowerCase().includes('apple') || currentLyricSourceName.toLowerCase().includes('qapple'));
      if (currentSourceLevel >= 3 && isCurrentApple) return;
      if (!isTrackStillCurrent()) return;

      hasTriggeredUpgradeProbe = true;
      console.log(`[LF-LYRICS] Scheduling background word-sync upgrade probe for ${trackId} (current level=${currentSourceLevel})`);

      void (async () => {
        try {
          if (!isTrackStillCurrent()) return;
          const isAppleActive = currentLyricSourceName && (currentLyricSourceName.toLowerCase().includes('apple') || currentLyricSourceName.toLowerCase().includes('qapple'));
          if (currentSourceLevel >= 3 && isAppleActive) return;
          let upgraded = false;
          if (settings.preferredLyricProvider === 'lyricsplus' || settings.wordByWord !== false) {
            upgraded = await lyricsPlusFetch(8500);
          }
          if (!upgraded && isTrackStillCurrent() && currentSourceLevel < 3) {
            upgraded = await rustLyricsFetch(0, true);
          }
          if (upgraded) {
            console.log(`[LF-LYRICS] Word-sync upgrade successfully applied for ${trackId}`);
          }
        } catch (err) {
          console.debug('[LF-LYRICS] Word-sync upgrade probe notice:', err);
        }
      })();
    };

    // 0. Rust Multi-Provider Engine (Fastest, zero CORS/CSP restrictions, queries Cloudflare Proxy + LRCLIB + Musixmatch)
    const rustLyricsFetch = async (candidateIndexOverride = null, isWordSyncUpgradeProbe = false) => {
      try {
        if (!window.electronAPI || typeof window.electronAPI.searchSyncedLyrics !== 'function') return false;
        const candidateIndex = candidateIndexOverride == null
          ? (trackLyricsCandidateIndex[trackId] || 0)
          : candidateIndexOverride;
        console.log(`[LF-LYRICS] rustLyricsFetch querying: track="${cleanTrack}", artist="${cleanArtist}", dur=${durationMs}, candidate=${candidateIndex}${isWordSyncUpgradeProbe ? ', word-sync-upgrade' : ''}`);
        const candidate = await window.electronAPI.searchSyncedLyrics(qAppleTrack, cleanArtist, durationMs, {
          preferredProviders: settings.preferredLyricProviders || [],
          musixmatchToken: settings.musixmatchUserToken || null,
          spotifyToken: config?.access_token || null,
          spotifyTrackId: trackId?.startsWith('spotify:track:') ? trackId.replace('spotify:track:', '') : null,
          forceRefresh: !!options.forceRefresh,
          candidateIndex,
          neteaseWordByWord: settings.neteaseWordByWord !== false,
          wordSyncUpgrade: isWordSyncUpgradeProbe
        });
        if (candidate && isTrackStillCurrent()) {
          console.log(`[LF-LYRICS] rustLyricsFetch received candidate from provider=${candidate.provider} (${candidate.syncType})`);
          let parsed = [];
          if (candidate.parsedLines && candidate.parsedLines.length > 0) {
            parsed = candidate.parsedLines;
          } else if (candidate.rawLRC) {
            parsed = parseLRC(candidate.rawLRC);
          }
          if (parsed.length > 0) {
            if (isPollutedYeatLyrics(parsed)) {
              console.debug(`[LF-DEBUG] rustLyricsFetch candidate matched polluted Yeat lyrics for ${trackId}, skipping`);
              return false;
            }
            const sig = getLinesSignature(parsed);
            const hasWords = parsed.some(l => l.words && l.words.length > 0);
            if (candidate.syncType === 'WORD_SYNCED' && !hasWords) {
              console.warn(`[LF-LYRICS] Rejected mislabeled word-synced candidate without timed words from ${candidate.provider}`);
              return false;
            }
            const level = hasWords ? 3 : (candidate.syncType === 'LINE_SYNCED' ? 2 : 1);
            const upgradesCurrentSync = level === 3 && currentSourceLevel < 3;
            if (options.forceRefresh && shouldSkipRejectedLyricsCandidate(
              rejectedLyricsSignatures[trackId],
              sig,
              upgradesCurrentSync
            )) {
              console.debug(`[LF-DEBUG] rustLyricsFetch candidate matched rejected signature for ${trackId}, skipping non-upgrade`);
              return false;
            }

            // On upgrade probe, only apply if candidate is an actual word-synced upgrade
            if (isWordSyncUpgradeProbe && level < 3) {
              return false;
            }

            const applied = await applyLyricsData(parsed, level, candidate.provider, candidate.candidateInfo || "");

            // If initial lookup yielded only line-synced lyrics, trigger upgrade probe in background
            if (applied && level < 3 && candidateIndex === 0 &&
                !isWordSyncUpgradeProbe && !options.forceRefresh &&
                settings.wordByWord !== false && settings.neteaseWordByWord !== false &&
                isTrackStillCurrent()) {
              triggerWordSyncUpgradeProbe();
            }
            return applied;
          }
        }
      } catch (e) {
        console.warn("[LF-LYRICS] rustLyricsFetch error:", e);
      }
      return false;
    };

    // 1. Direct qApple Word-by-Word Fetch (Replaced legacy proxy data with qApple word-by-word)
    const proxyFetch = async () => {
      try {
        if (!window.LyricsService || !window.LyricsService.instance) return false;
        console.debug(`[LF-DEBUG] qApple word-sync fetch querying: track="${qAppleTrack}", artist="${cleanArtist}"`);
        const norm = await window.LyricsService.instance.lyricsPlusProvider.getLyrics({
          title: qAppleTrack,
          artist: cleanArtist,
          artists: (typeof splitTrackArtists === 'function' ? splitTrackArtists(cleanArtist) : [cleanArtist]),
          album: options.album || currentPlayingTrackObj?.album?.name || null,
          duration: durationSec,
          isrc: isrc || currentPlayingTrackObj?.external_ids?.isrc || null,
          source: (config && config.localMode) ? 'Local' : 'Spotify'
        }, {
          preferQApple: true,
          forceRefresh: options.forceRefresh,
          signal
        });
        if (norm && norm.lines && norm.lines.length > 0 && isTrackStillCurrent()) {
          const parsed = norm.lines.map(l => ({
            timeMs: l.timeMs,
            text: l.text,
            words: l.words,
            subText: l.subText,
            singer: l.singer
          }));
          const hasWords = parsed.some(l => l.words && l.words.length > 0);
          const level = hasWords ? 3 : 2;
          return await applyLyricsData(parsed, level, "LyricsPlus (qApple)", "qApple (Word)");
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.debug("[LF-DEBUG] qApple fetch error:", e);
      }
      return false;
    };

    // 2. Direct LRCLIB Fetch (handles candidate searching & cycling)
    const localLrclibFetch = async () => {
      try {
        const candidateIdx = trackLyricsCandidateIndex[trackId] || 0;
        console.debug(`[LF-DEBUG] localLrclibFetch: candidateIdx=${candidateIdx}, currentSourceLevel=${currentSourceLevel}`);

        const canonicalMeta = (value) => String(value || '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
          .replace(/\s*[-–—]\s*(?:\d{4}\s*)?(?:remaster(?:ed)?|radio edit|single version|official audio|lyrics?)\b.*$/i, ' ')
          .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
        const lrclibMetadataMatches = (item) => {
          const resultTitle = canonicalMeta(item?.trackName);
          const resultArtist = canonicalMeta(item?.artistName);
          const wantedTitle = canonicalMeta(cleanTrack);
          const wantedArtist = canonicalMeta(cleanArtist);
          const allArtistNames = canonicalMeta(options.allArtists || cleanArtist);
          if (!resultTitle || !resultArtist || !wantedTitle || !wantedArtist) return false;
          const titleMatches = resultTitle === wantedTitle || resultTitle.startsWith(`${wantedTitle} `) || wantedTitle.startsWith(`${resultTitle} `);
          const artistMatches = resultArtist === wantedArtist || resultArtist.includes(wantedArtist) || wantedArtist.includes(resultArtist) ||
            (allArtistNames && (resultArtist.includes(allArtistNames) || allArtistNames.includes(resultArtist)));
          return titleMatches && artistMatches;
        };
        
        let candidatePool = [];
        let exactResult = null;

        // On initial attempt without force-refresh, try fast exact GET.
        // Try both original track name and cleanTrack across artist variants (primary + all artists)
        if (!options.forceRefresh && candidateIdx === 0) {
          const originalTrackName = trackName;
          const artistVariants = [
            cleanArtist,
            ...(options.allArtists && options.allArtists !== cleanArtist ? [options.allArtists] : []),
            ...(options.primaryArtist && options.primaryArtist !== cleanArtist ? [options.primaryArtist] : [])
          ];
          const trackVariants = (originalTrackName && originalTrackName !== cleanTrack)
            ? [originalTrackName, cleanTrack]
            : [cleanTrack];

          const exactPromises = [];
          for (const aName of artistVariants) {
            for (const tName of trackVariants) {
              const params = new URLSearchParams({ artist_name: aName, track_name: tName });
              if (durationSec > 0) params.set("duration", durationSec);
              exactPromises.push(
                fetch(`https://lrclib.net/api/get?${params}`, { signal })
                  .then(async (res) => {
                    if (!res.ok) return null;
                    const d = await res.json();
                    if (d && (hasLrcTimestamps(d.syncedLyrics) || d.plainLyrics)) {
                      const lrc = d.syncedLyrics || d.plainLyrics;
                      const parsed = parseLRC(lrc);
                      if (!isPollutedYeatLyrics(parsed)) {
                        const sig = getLinesSignature(parsed);
                        if (!rejectedLyricsSignatures[trackId]?.has(sig)) {
                          return d;
                        }
                      }
                    }
                    return null;
                  })
                  .catch(() => null)
              );
            }
          }

          if (exactPromises.length > 0) {
            const results = await Promise.all(exactPromises);
            exactResult = results.find(r => r && hasLrcTimestamps(r.syncedLyrics)) || results.find(Boolean) || null;
            if (exactResult) {
              console.debug(`[LF-DEBUG] LRCLIB parallel exact GET matched in 1 RTT`);
            }
          }
        }

        if (!exactResult || !hasLrcTimestamps(exactResult.syncedLyrics)) {
          // Query targeted search and keyword search across primary artist and all artists
          const searchQueries = [
            fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTrack)}&artist_name=${encodeURIComponent(cleanArtist)}`, { signal })
              .then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTrack + " " + cleanArtist)}`, { signal })
              .then(r => r.ok ? r.json() : []).catch(() => [])
          ];

          if (options.allArtists && options.allArtists !== cleanArtist) {
            searchQueries.push(
              fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTrack + " " + options.allArtists)}`, { signal })
                .then(r => r.ok ? r.json() : []).catch(() => [])
            );
          }

          const searchResults = await Promise.all(searchQueries);
          const rawCandidates = searchResults.flat();

          // Deduplicate by item ID AND lyrics content signature (to collapse duplicate lyrics)
          const seenIds = new Set();
          const seenSigs = new Set();
          const unique = [];
          for (const item of rawCandidates) {
            if (item && item.id && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              const lrc = item.syncedLyrics || item.plainLyrics || "";
              const lines = parseLRC(lrc);
              const sig = getLinesSignature(lines);
              if (sig && !seenSigs.has(sig)) {
                seenSigs.add(sig);
                unique.push(item);
              } else if (!sig) {
                unique.push(item);
              }
            }
          }

          // Filter by match (and discard known polluted entries)
          const sArtist = cleanArtist.toLowerCase();
          const sAllArtists = (options.allArtists || cleanArtist).toLowerCase();
          const sTrack = cleanTrack.toLowerCase();
          const valid = unique.filter(r => {
            if (!lrclibMetadataMatches(r)) return false;
            const lrc = r.syncedLyrics || r.plainLyrics || "";
            const lines = parseLRC(lrc);
            if (isPollutedYeatLyrics(lines)) return false;
            const rArtist = (r.artistName || "").toLowerCase();
            const rTrack = (r.trackName || "").toLowerCase();
            const artistMatches = rArtist.includes(sArtist) || sArtist.includes(rArtist) ||
                                  (sAllArtists && (rArtist.includes(sAllArtists) || sAllArtists.includes(rArtist)));
            const trackMatches = rTrack.includes(sTrack) || sTrack.includes(rTrack);
            return artistMatches && trackMatches;
          });

          // Sort synced candidates by composite score: title/artist match quality first, then duration proximity.
          const titleMatchScore = (r) => {
            const rTrack = (r.trackName || '').toLowerCase();
            const rArtist = (r.artistName || '').toLowerCase();
            const origLower = trackName.toLowerCase();
            if (rTrack === origLower && (rArtist.includes(sArtist) || sArtist.includes(rArtist))) return 0; // exact original match
            if ((origLower.includes(rTrack) || rTrack.includes(origLower)) && rArtist.includes(sArtist)) return 1;
            if (rTrack === sTrack) return 2;
            return 3;
          };

          const syncedList = valid.filter(r => hasLrcTimestamps(r.syncedLyrics));
          const plainList = valid.filter(r => !hasLrcTimestamps(r.syncedLyrics) && r.plainLyrics);

          const compositeSort = (a, b) => {
            const scoreDiff = titleMatchScore(a) - titleMatchScore(b);
            if (scoreDiff !== 0) return scoreDiff;
            if (durationSec > 0) return Math.abs((a.duration || 0) - durationSec) - Math.abs((b.duration || 0) - durationSec);
            return 0;
          };
          syncedList.sort(compositeSort);
          plainList.sort(compositeSort);

          // When synced lyrics exist, pool must strictly contain synced lyrics.
          // Candidate cycling must never downgrade from synced to static plain text.
          candidatePool = syncedList.length > 0 ? syncedList : plainList;
          if (candidatePool.length === 0 && exactResult && lrclibMetadataMatches(exactResult) && exactResult.plainLyrics &&
              !candidatePool.some(item => item.id === exactResult.id)) {
            candidatePool.push(exactResult);
          }
        } else {
          candidatePool = lrclibMetadataMatches(exactResult) ? [exactResult] : [];
        }

        // On reload, filter out candidates matching rejected lyrics signatures
        if (options.forceRefresh && rejectedLyricsSignatures[trackId]?.size > 0 && candidatePool.length > 0) {
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

    // LyricsPlus' primary endpoint defaults to qApple. Let that preferred
    // source apply first, then query Rust providers when qApple has no usable
    // word-synced result. Fallback providers can still improve line-only data.
    await lyricsPlusFetch();
    const hasQAppleWordTiming = currentSourceLevel >= 3 &&
      /qapple|apple/i.test(String(currentLyricSourceName || '')) &&
      lyrics.some(line => Array.isArray(line.words) && line.words.length > 0);
    if (hasQAppleWordTiming && isTrackStillCurrent()) {
      manageLyricsCache(cacheKey);
      return;
    }

    await rustLyricsFetch();

    if (lyrics.length > 0 && isTrackStillCurrent()) {
      const hasRealWordTiming = lyrics.some(line => Array.isArray(line.words) && line.words.length > 0);
      if (currentSourceLevel < 3 && !hasRealWordTiming) {
        triggerWordSyncUpgradeProbe();
      }
      const isCurrentApple = currentLyricSourceName && (currentLyricSourceName.toLowerCase().includes('apple') || currentLyricSourceName.toLowerCase().includes('qapple'));
      if (!isCurrentApple && settings.wordByWord !== false && currentSourceLevel < 3) {
        triggerWordSyncUpgradeProbe();
      }
      if ((hasRealWordTiming && isCurrentApple) || settings.wordByWord === false || currentSourceLevel >= 2) {
        manageLyricsCache(cacheKey);
        return;
      }
    }

    // 2. Fallback: Direct web proxy & LRCLIB if primary engines found no synced match
    if ((lyrics.length === 0 || currentSourceLevel < 2) && isTrackStillCurrent()) {
      const proxyTask = proxyFetch();
      const lrclibTask = localLrclibFetch();
      await Promise.allSettled([proxyTask, lrclibTask]);
    }

    if (lyrics.length > 0 && isTrackStillCurrent() && currentSourceLevel < 3) {
      triggerWordSyncUpgradeProbe();
    }

    if (lyrics.length === 0 && isTrackStillCurrent()) {
      await ovhFetch();
    }

    if (lyrics.length === 0 && options.forceRefresh && isTrackStillCurrent()) {
      if (isDynamicIslandMode) {
        showIslandHud({ icon: "!", text: "No alternatives", showBar: false });
      } else {
        showToast("No alternative lyrics found in database for this track.", 3000, 'warning');
      }
    }

    // Immediately resolve empty state: do not leave user hanging in limbo
    if (lyrics.length === 0 && isTrackStillCurrent()) {
      isFetchingLyrics = false;
      renderLyrics();
    }

    manageLyricsCache(cacheKey);
  } catch (err) {
    if (err.name !== 'AbortError') console.error("Fetch Error:", err);
    if (lyrics.length === 0 && isTrackStillCurrent()) {
      isFetchingLyrics = false;
      renderLyrics();
    }
  } finally {
    if (isTrackStillCurrent()) {
      isFetchingLyrics = false;
    }
  }
}

function updateTimingStatus(level, sourceName = "", candidateInfo = "") {
  if (typeof level === 'number') {
    currentSourceLevel = level > 0 ? level : 0;
  }
  if (sourceName) currentLyricSourceName = sourceName;
  if (candidateInfo) currentLyricCandidateInfo = candidateInfo;
  updateIslandQualityBadge();
  updateLyricsDiagnostics();
}

async function cycleAlternativeLyrics() {
  if (isReloadingLyrics) return;
  if (!currentTrackId) {
    if (isDynamicIslandMode) {
      showIslandHud({ icon: "⚠️", text: "No track playing", showBar: false });
    } else {
      showToast("No active track playing to reload lyrics.", 2000, 'warning');
    }
    return;
  }
  const trackObj = currentPlayingTrackObj || currentTrack;
  const title = (trackObj && (trackObj.name || trackObj.title))
    || currentTitle
    || ((widgetTrackName && widgetTrackName.textContent !== "Not Playing") ? widgetTrackName.textContent : "");
  const artist = (trackObj && trackObj.artists && Array.isArray(trackObj.artists) && trackObj.artists.length > 0)
    ? trackObj.artists.map(a => a.name).filter(Boolean).join(", ")
    : ((trackObj && trackObj.artist) || ((widgetArtistName && widgetArtistName.textContent !== "Spotify") ? widgetArtistName.textContent : ""));
  if (!title) {
    if (isDynamicIslandMode) {
      showIslandHud({ icon: "⚠️", text: "Play track first", showBar: false });
    } else {
      showToast("Play a track first to reload lyrics.", 2000, 'warning');
    }
    return;
  }

  isReloadingLyrics = true;

  // Spin reload buttons
  const reloadIcons = document.querySelectorAll(".reload-icon");
  reloadIcons.forEach(icon => icon.classList.add("rotating"));

  const curIdx = (trackLyricsCandidateIndex[currentTrackId] || 0) + 1;
  if (isDynamicIslandMode) {
    showIslandHud({ icon: "↻", text: `Refetching lyrics #${curIdx + 1}...`, showBar: false });
  } else {
    showToast(`Searching lyrics database for alternative #${curIdx + 1}...`, 3000, 'reload');
  }

  try {
    await fetchLyrics(currentTrackId, title, artist, trackDuration, null, { forceRefresh: true });
  } catch (err) {
    console.error("Cycle lyrics error:", err);
    if (isDynamicIslandMode) {
      showIslandHud({ icon: "⚠️", text: "Refetch failed", showBar: false });
    } else {
      showToast("Error researching lyrics from database.", 3000, 'warning');
    }
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

  if (settings.showGeniusFact === false || settings.wallpaperMode || settings.taskbarMode) return;

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

  // 1. Purge legacy localStorage entry if present to reclaim quota
  try {
    if (localStorage.getItem(cacheKey)) {
      localStorage.removeItem(cacheKey);
    }
  } catch (_) {}

  // 2. Check in-memory LRU cache first (bounded to 10 entries)
  if (geniusAnnotationsCache.has(cacheKey)) {
    const cached = geniusAnnotationsCache.get(cacheKey);
    if (Array.isArray(cached)) {
      if (currentTrackId !== currentFetchId) return;
      currentAnnotations = cached;
      if (cached.length > 0) attachAnnotationsToRenderedLyrics();
      return;
    }
  }

  // 3. Query Genius API in background
  try {
    if (!window.electronAPI || !window.electronAPI.getGeniusAnnotations) return;
    const annotations = await window.electronAPI.getGeniusAnnotations(artistName, trackName);

    if (currentTrackId !== currentFetchId) return;

    if (Array.isArray(annotations)) {
      currentAnnotations = annotations;
      if (geniusAnnotationsCache.size >= 10) {
        const firstKey = geniusAnnotationsCache.keys().next().value;
        if (firstKey) geniusAnnotationsCache.delete(firstKey);
      }
      // Cache misses too: Genius can be unavailable or have no annotations
      // for a track, and retrying on each renderer refresh only creates noise.
      geniusAnnotationsCache.set(cacheKey, annotations);
      if (annotations.length > 0) attachAnnotationsToRenderedLyrics();
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
          btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2.5"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/></svg>';
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showGeniusModal(matched.fragment, matched.text);
          });
          const firstSub = el.querySelector('.lyric-subtext, .lyric-backing-text');
          if (firstSub) {
            el.insertBefore(btn, firstSub);
          } else {
            el.appendChild(btn);
          }
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

  // Wake from auto-hide, restore opacity and ensure click reception
  cancelAutoHide();
  setClickThroughCached(false);
  if (isDynamicIslandMode) {
    window._returnToIslandAfterGenius = true;
    toggleDynamicIslandMode(false);
  }

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
  updateAutoHideState();
  if (window._returnToIslandAfterGenius) {
    window._returnToIslandAfterGenius = false;
    toggleDynamicIslandMode(true);
  }
}

function showAlbumArtModal() {
  const modal = document.getElementById('album-art-modal');
  const imgEl = document.getElementById('album-art-modal-img');
  const vidEl = document.getElementById('album-art-modal-video');
  const titleEl = document.getElementById('album-art-modal-title');
  const artistEl = document.getElementById('album-art-modal-artist');
  if (!modal || !imgEl) return;

  const studioArtImg = document.getElementById("studio-art-img");
  const studioArtVideo = document.getElementById("studio-art-video");

  const hasActiveMotion = document.body.classList.contains('has-animated-art-video') && currentAnimatedArtInfo && currentAnimatedArtInfo.type === 'video' && currentAnimatedArtInfo.url;
  const isSplit = document.body.classList.contains('layout-split');
  const preferTall = (isSplit && settings.splitTallArtwork !== false && supportsTallMotionArtwork()) ||
    (settings.wallpaperMode && settings.wallpaperStyle === 'style2');
  const effectiveMotionUrl = preferTall
    ? (currentAnimatedArtInfo?.tallUrl || currentAnimatedArtInfo?.tall_url || currentAnimatedArtInfo?.url)
    : currentAnimatedArtInfo?.url;
  const activeVideoSrc = hasActiveMotion ? effectiveMotionUrl : null;

  // Prioritize active studio artwork or widget thumbnail or cached artwork URL
  const visibleArt = (studioArtImg && studioArtImg.src && studioArtImg.style.display !== 'none')
    ? studioArtImg.src
    : ((widgetAlbumArt && widgetAlbumArt.src && widgetAlbumArt.style.display !== 'none')
      ? widgetAlbumArt.src
      : (currentStaticAlbumArtUrl || (widgetAlbumArt && widgetAlbumArt.src ? widgetAlbumArt.src : '')));

  if (hasActiveMotion && vidEl && activeVideoSrc) {
    pauseAnimatedArtVideos();
    vidEl.muted = true;
    vidEl.defaultMuted = true;
    vidEl.setAttribute('muted', '');
    vidEl.loop = true;
    vidEl.preload = 'auto';
    vidEl.playsInline = true;
    vidEl.setAttribute('playsinline', '');
    if (vidEl.src !== activeVideoSrc) {
      vidEl.src = activeVideoSrc;
    }
    vidEl.style.display = 'block';
    vidEl.play().catch(() => {});
    imgEl.style.display = 'none';
  } else if (visibleArt && !visibleArt.includes('data:image/svg+xml')) {
    if (imgEl.src !== visibleArt) {
      imgEl.src = visibleArt;
    }
    imgEl.style.display = 'block';
    if (vidEl) {
      vidEl.pause();
      vidEl.preload = 'none';
      vidEl.removeAttribute('src');
      vidEl.style.display = 'none';
    }
  } else {
    return;
  }

  const studioTitle = document.getElementById("studio-track-title");
  const studioArtist = document.getElementById("studio-track-artist");

  const trackName = (studioTitle && studioTitle.textContent && studioTitle.textContent !== "Not Playing")
    ? studioTitle.textContent
    : ((widgetTrackName && widgetTrackName.textContent !== "Not Playing")
      ? widgetTrackName.textContent
      : ((typeof currentTrackName !== 'undefined' ? currentTrackName : '') || currentPlayingTrackObj?.name || "Unknown Track"));

  const artistName = (studioArtist && studioArtist.textContent && studioArtist.textContent !== "LyricFlow Studio")
    ? studioArtist.textContent
    : ((widgetArtistName && widgetArtistName.textContent !== "Spotify")
      ? widgetArtistName.textContent
      : ((typeof currentArtistName !== 'undefined' ? currentArtistName : '') || currentPlayingTrackObj?.artists?.[0]?.name || "Unknown Artist"));

  if (titleEl) titleEl.textContent = trackName;
  if (artistEl) artistEl.textContent = artistName;

  cancelAutoHide();
  setClickThroughCached(false);

  modal.style.display = 'flex';
  void modal.offsetWidth;
  modal.classList.add('show');
}

function hideAlbumArtModal() {
  const modal = document.getElementById('album-art-modal');
  const vidEl = document.getElementById('album-art-modal-video');
  const modalImg = document.getElementById('album-art-modal-img');
  if (!modal) return;
  modal.classList.remove('show');
  if (vidEl) {
    vidEl.pause();
    vidEl.removeAttribute('src');
    vidEl.load();
    vidEl.preload = 'none';
    vidEl.style.display = 'none';
  }
  if (modalImg) {
    modalImg.removeAttribute('src');
    modalImg.style.display = 'none';
  }
  updateAutoHideState();
  resumeAnimatedArtVideos();
  setTimeout(() => {
    if (!modal.classList.contains('show')) {
      modal.style.display = 'none';
      resumeAnimatedArtVideos();
    }
  }, 280);
}

// Render lyrics to DOM
function getLyricWordEndMs(words, wordIndex, lineData, lineIndex) {
  const word = words && words[wordIndex];
  if (!word) return 0;
  if (word._cachedEndMs !== undefined) return word._cachedEndMs;

  const startMs = (word.start != null && Number.isFinite(Number(word.start)))
    ? Number(word.start) * 1000
    : (Number(word.timeMs) || 0);

  const nextLine = (Array.isArray(lyrics) && lineIndex >= 0 && lyrics[lineIndex + 1]) ? lyrics[lineIndex + 1] : null;
  const nextLineMs = nextLine ? (Number(nextLine.timeMs) || (Number(nextLine.start) * 1000) || 0) : Infinity;
  const nextVocalMs = (nextLine && nextLine.words && nextLine.words.length > 0)
    ? ((nextLine.words[0].start != null ? nextLine.words[0].start * 1000 : nextLine.words[0].timeMs) || nextLineMs)
    : nextLineMs;

  let rawEndMs = 0;
  if (word.endMs != null && Number(word.endMs) > 0) rawEndMs = Number(word.endMs);
  else if (word.end != null && Number(word.end) > 0) rawEndMs = (Number(word.end) > 1000) ? Number(word.end) : Number(word.end) * 1000;
  else if (word.durationMs != null && Number(word.durationMs) > 0) rawEndMs = startMs + Number(word.durationMs);
  else if (word.duration != null && Number(word.duration) > 0) {
    const rawDur = Number(word.duration);
    rawEndMs = startMs + (rawDur >= 10 ? rawDur : rawDur * 1000);
  }

  if (rawEndMs > startMs) {
    // Defensive cap: If word end exceeds next line onset or extreme bounds, cap it
    if (isFinite(nextVocalMs) && nextVocalMs > startMs && rawEndMs > nextVocalMs) {
      const res = Math.max(startMs + 200, nextVocalMs);
      word._cachedEndMs = res;
      return res;
    }
    const lineEndMs = lineData?.end ? ((Number(lineData.end) > 1000) ? Number(lineData.end) : Number(lineData.end) * 1000) : 0;
    if (lineEndMs > startMs && rawEndMs > lineEndMs + 1500) {
      word._cachedEndMs = lineEndMs;
      return lineEndMs;
    }
    word._cachedEndMs = rawEndMs;
    return rawEndMs;
  }

  const nextWord = words[wordIndex + 1];
  if (nextWord) {
    const nextStart = (nextWord.start != null && Number.isFinite(Number(nextWord.start)))
      ? Number(nextWord.start) * 1000
      : Number(nextWord.timeMs);
    if (Number.isFinite(nextStart) && nextStart > startMs) {
      word._cachedEndMs = nextStart;
      return nextStart;
    }
  }

  // --- Fallback for the LAST word of a line ---
  const wordTextLen = (word.text || '').trim().length;
  const naturalWordDur = Math.max(500, Math.min(2200, wordTextLen * 160 + 400));

  // If next line starts soon, cap to before next line's vocal onset
  if (isFinite(nextVocalMs) && nextVocalMs > startMs && nextVocalMs < startMs + naturalWordDur) {
    const res = Math.max(startMs + 350, nextVocalMs);
    word._cachedEndMs = res;
    return res;
  }

  // If lineData has an explicit line duration or end that is reasonable (< 3500ms from startMs):
  const lineStartMs = Number(lineData?.timeMs) || (Number(lineData?.start) * 1000) || startMs;
  let lineEndMs = 0;
  if (lineData?.end != null && Number(lineData.end) > 0) lineEndMs = (Number(lineData.end) > 1000) ? Number(lineData.end) : Number(lineData.end) * 1000;
  else if (lineData?.durationMs != null && Number(lineData.durationMs) > 0) lineEndMs = lineStartMs + Number(lineData.durationMs);
  else if (lineData?.duration != null && Number(lineData.duration) > 0) {
    const duration = Number(lineData.duration);
    lineEndMs = lineStartMs + (duration >= 20 ? duration : duration * 1000);
  }
  if (lineEndMs > startMs && (lineEndMs - startMs) <= 3500) {
    word._cachedEndMs = lineEndMs;
    return lineEndMs;
  }

  const finalRes = startMs + naturalWordDur;
  word._cachedEndMs = finalRes;
  return finalRes;
}

function getLineVocalEndMs(line, lineIndex) {
  if (!line) return 0;
  if (Array.isArray(line.words) && line.words.length > 0) {
    return getLyricWordEndMs(line.words, line.words.length - 1, line, lineIndex);
  }
  if (line.end != null && Number(line.end) > 0) return (Number(line.end) > 1000) ? Number(line.end) : Number(line.end) * 1000;
  if (line.endMs != null && Number(line.endMs) > 0) return Number(line.endMs);
  if (line.duration != null && Number(line.duration) > 0) {
    const dur = Number(line.duration);
    return (Number(line.timeMs) || 0) + (dur >= 20 ? dur : dur * 1000);
  }
  if (line.durationMs != null && Number(line.durationMs) > 0) {
    return (Number(line.timeMs) || 0) + Number(line.durationMs);
  }
  if (Array.isArray(lyrics) && lyrics[lineIndex + 1]) {
    const startMs = Number(line.timeMs) || 0;
    const nextStartMs = Number(lyrics[lineIndex + 1].timeMs) || 0;
    const gap = nextStartMs - startMs;
    // For line-synced lyrics with a real musical break (>= 4s), estimate vocal duration from text length
    if (gap >= 4000) {
      const textLen = (line.text || '').length;
      const naturalDur = Math.max(2500, Math.min(gap - 1500, textLen * 180 + 1000));
      return startMs + naturalDur;
    }
    return nextStartMs;
  }
  return (Number(line.timeMs) || 0) + 4000;
}

function getLineSwitchMs(curIdx) {
  if (!Array.isArray(lyrics) || curIdx < 0 || curIdx >= lyrics.length) return Infinity;
  if (curIdx === lyrics.length - 1) return Infinity;
  const curLine = lyrics[curIdx];
  const nextLine = lyrics[curIdx + 1];
  if (!nextLine) return Infinity;

  const nextLineMs = Number(nextLine.timeMs) || (Number(nextLine.start) * 1000) || 0;

  if (curLine && Array.isArray(curLine.words) && curLine.words.length > 0) {
    const curVocalEnd = getLineVocalEndMs(curLine, curIdx);
    const nextVocalStart = (nextLine.words && nextLine.words.length > 0)
      ? ((nextLine.words[0].start != null ? nextLine.words[0].start * 1000 : nextLine.words[0].timeMs) || nextLineMs)
      : nextLineMs;

    // Optical advance lead window (280ms):
    // Advance focus smoothly 280ms before next vocal onset so scrolling centers ahead of phonation
    const leadMs = (nextVocalStart - curVocalEnd >= 400) ? 280 : 0;
    const effectiveNextStart = Math.max(curVocalEnd, nextVocalStart - leadMs);

    const switchPoint = (curVocalEnd <= effectiveNextStart)
      ? Math.max(curVocalEnd, Math.min(nextLineMs, effectiveNextStart))
      : effectiveNextStart;

    // Safety clamp: Switch point must NEVER exceed the next line's vocal start timestamp
    return Math.min(nextVocalStart, switchPoint);
  }

  // Line-synced lyrics (no words): advance lead window
  const curStart = Number(curLine?.timeMs) || (Number(curLine?.start) * 1000) || 0;
  if (nextLineMs > curStart + 600) {
    return Math.max(curStart + 400, nextLineMs - 280);
  }

  return nextLineMs;
}

let cachedIslandZoneWidth = 0;
let islandZoneResizeObserver = null;
function getCachedIslandZoneWidth(zone) {
  if (!zone) return 250;
  if (!islandZoneResizeObserver && typeof ResizeObserver !== 'undefined') {
    islandZoneResizeObserver = new ResizeObserver(entries => {
      const entry = entries.find(item => item.target?.id === 'island-lyric-zone') || entries[0];
      if (entry) cachedIslandZoneWidth = entry.contentRect.width || entry.target.clientWidth || cachedIslandZoneWidth;
    });
    islandZoneResizeObserver.observe(zone);
  }
  if (!cachedIslandZoneWidth) cachedIslandZoneWidth = zone.clientWidth || 250;
  return cachedIslandZoneWidth;
}

function setLyricWordProgress(span, progress) {
  if (!span) return;
  const bounded = Math.min(1, Math.max(0, Number(progress) || 0));
  const previous = span._lastProgressValue !== undefined
    ? span._lastProgressValue
    : (span.style.getPropertyValue('--word-progress') ? Number(span.style.getPropertyValue('--word-progress')) : NaN);
  const percentValue = `${(bounded * 100).toFixed(1)}%`;
  const prevPercent = span._lastProgressPercent !== undefined
    ? span._lastProgressPercent
    : (span.style.getPropertyValue('--word-progress-percent') || '');
  if (Number.isFinite(previous) && previous === bounded && prevPercent === percentValue) return;
  if (Number.isFinite(previous) && Math.abs(bounded - previous) < 0.005 && bounded !== 0 && bounded !== 1) {
    if (!prevPercent) {
      span._lastProgressPercent = percentValue;
      span.style.setProperty('--word-progress-percent', percentValue);
    }
    return;
  }
  const value = bounded.toFixed(3);
  span._lastProgressValue = bounded;
  span._lastProgressPercent = percentValue;
  span.style.setProperty('--word-progress', value);
  span.style.setProperty('--word-progress-percent', percentValue);
}

function updateBackingWordHighlights(lineEl, lineData, syncProgress, playing) {
  const words = Array.isArray(lineData?.backingWords) ? lineData.backingWords : [];
  if (!lineEl || !words.length) return;
  if (!lineEl._cachedBackingWordSpans) {
    lineEl._cachedBackingWordSpans = lineEl.querySelectorAll('.lyric-word-backing');
  }
  const spans = lineEl._cachedBackingWordSpans;
  if (!spans || spans.length !== words.length) return;

  const getStart = word => (word.start != null ? Number(word.start) * 1000 : Number(word.timeMs || 0));
  const getEnd = (word, index) => {
    if (word.endMs != null) return Number(word.endMs);
    if (word.end != null) return Number(word.end) > 1000 ? Number(word.end) : Number(word.end) * 1000;
    if (word.durationMs != null) return getStart(word) + Number(word.durationMs);
    if (word.duration != null) return getStart(word) + Number(word.duration) * (Number(word.duration) > 50 ? 1 : 1000);
    if (words[index + 1]) return Math.max(getStart(word) + 50, getStart(words[index + 1]));
    return getStart(word) + 800;
  };

  let activeIndex = -1;
  const states = words.map((word, index) => {
    const start = getStart(word);
    const end = Math.max(start + 50, getEnd(word, index));
    if (syncProgress >= start && syncProgress < end) activeIndex = index;
    if (syncProgress >= end) return 'completed';
    if (syncProgress >= start) return 'active';
    return 'upcoming';
  });
  const key = states.join(',');
  if (lineEl._lastBackingWordStates !== key) {
    lineEl._lastBackingWordStates = key;
    spans.forEach((span, index) => {
      const state = states[index] || 'upcoming';
      span.classList.toggle('lyric-word-completed', state === 'completed');
      span.classList.toggle('lyric-word-passed', state === 'completed');
      span.classList.toggle('lyric-word-active', state === 'active');
      span.classList.toggle('lyric-word-upcoming', state === 'upcoming');
      if (state !== 'active') {
        delete span._lastProgressValue;
        delete span._lastProgressPercent;
        span.style.removeProperty('--word-progress');
        span.style.removeProperty('--word-progress-percent');
      }
    });
  }
  if (activeIndex >= 0) {
    const start = getStart(words[activeIndex]);
    const end = Math.max(start + 50, getEnd(words[activeIndex], activeIndex));
    const progress = Math.min(1, Math.max(0, (syncProgress - start) / (end - start)));
    const oldProgress = parseFloat(spans[activeIndex]._lastProgressValue !== undefined ? spans[activeIndex]._lastProgressValue : (spans[activeIndex].style.getPropertyValue('--word-progress') || '0'));
    setLyricWordProgress(spans[activeIndex], playing && progress < oldProgress ? oldProgress : progress);
  }
}

/**
 * Cleans word/syllable token text:
 * 1. Collapses duplicate/repeated brackets (((, )), [[, ]], {{, }}, etc.) into single brackets.
 * 2. Removes internal spaces inside brackets within tokens.
 */
function cleanWordPunctuation(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;

  // Collapse duplicate/repeated consecutive brackets
  str = str
    .replace(/(?:\(\s*)+\(/g, '(')
    .replace(/(?:\)\s*)+\)/g, ')')
    .replace(/(?:\[\s*)+\[/g, '[')
    .replace(/(?:\]\s*)+\]/g, ']')
    .replace(/(?:\{\s*)+\{/g, '{')
    .replace(/(?:\}\s*)+\}/g, '}')
    .replace(/(?:（\s*)+（/g, '（')
    .replace(/(?:）\s*)+）/g, '）')
    .replace(/(?:【\s*)+【/g, '【')
    .replace(/(?:】\s*)+】/g, '】')
    .replace(/(?:《\s*)+《/g, '《')
    .replace(/(?:》\s*)+》/g, '》');

  while (/[\(\[\{（【《]\s*[\(\[\{（【《]/.test(str)) {
    str = str.replace(/[\(\[\{（【《]\s*[\(\[\{（【《]/g, '(');
  }
  while (/[\)\]\}）】》]\s*[\)\]\}）】》]/.test(str)) {
    str = str.replace(/[\)\]\}）】》]\s*[\)\]\}）】》]/g, ')');
  }

  // Remove internal spaces inside brackets within token
  str = str
    .replace(/([“‘«\(\{\[「『（【［｛《])[ \t]+/g, '$1')
    .replace(/[ \t]+([,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》])/g, '$1');

  return str;
}

/**
 * Cleans ground-truth lyric text by eliminating extraneous whitespace, double brackets,
 * spaces before/after brackets, spacing before punctuation, and artificial delimiters between continuous Hanzi.
 */
function cleanLyricText(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;

  // 1. Collapse duplicate/repeated consecutive brackets (with or without spaces between them)
  // Handles: ((, )), [[, ]], {{, }}, （（, ））, 【【, 】】, 《《, 》》, ( (, ) ), etc.
  str = str
    .replace(/(?:\(\s*)+\(/g, '(')
    .replace(/(?:\)\s*)+\)/g, ')')
    .replace(/(?:\[\s*)+\[/g, '[')
    .replace(/(?:\]\s*)+\]/g, ']')
    .replace(/(?:\{\s*)+\{/g, '{')
    .replace(/(?:\}\s*)+\}/g, '}')
    .replace(/(?:（\s*)+（/g, '（')
    .replace(/(?:）\s*)+）/g, '）')
    .replace(/(?:【\s*)+【/g, '【')
    .replace(/(?:】\s*)+】/g, '】')
    .replace(/(?:《\s*)+《/g, '《')
    .replace(/(?:》\s*)+》/g, '》');

  while (/[\(\[\{（【《]\s*[\(\[\{（【《]/.test(str)) {
    str = str.replace(/[\(\[\{（【《]\s*[\(\[\{（【《]/g, '(');
  }
  while (/[\)\]\}）】》]\s*[\)\]\}）】》]/.test(str)) {
    str = str.replace(/[\)\]\}）】》]\s*[\)\]\}）】》]/g, ')');
  }

  // 2. Collapse multiple spaces and tabs into a single space
  str = str.replace(/[ \t]+/g, ' ');

  // 3. Remove space inside brackets:
  // - after opening brackets/quotes: '( hello' -> '(hello'
  // - before closing brackets/quotes: 'hello )' -> 'hello)'
  str = str
    .replace(/([“‘«\(\{\[「『（【［｛《])[ \t]+/g, '$1')
    .replace(/[ \t]+([,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》])/g, '$1');

  // 4. Remove space between closing bracket and following punctuation: '(text) .' -> '(text).'
  str = str.replace(/([”’»\)}\]」』）】］｝》])[ \t]+([,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》])/g, '$1$2');

  // 5. Remove space before contraction apostrophe ('t, 's, 'm, 're, 've, 'll, 'd)
  str = str.replace(/[ \t]+(['’](?:t|s|m|re|ve|ll|d)\b)/gi, '$1');

  // 6. Remove artificial spaces between continuous Hanzi (Chinese characters)
  str = str.replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, '$1');

  return str.trim();
}

/**
 * Reconciles word-by-word timing tokens with line text and typography rules:
 * 1. Attaches punctuation from lineText to words if omitted by timing providers.
 * 2. Merges standalone punctuation tokens into adjacent words (Kinsoku Shori).
 * 3. Eliminates unwanted spaces before commas, periods, colons, closing brackets/quotes.
 * 4. Ensures appropriate spacing after commas and punctuation in Latin text.
 */
function reconcileTimedWords(words, lineText) {
  if (!Array.isArray(words) || words.length === 0) return [];
  const cleanLine = typeof lineText === 'string' ? cleanLyricText(lineText) : '';
  if (!cleanLine && words.length > 0) return words;

  let tokens = words.map(w => ({
    ...w,
    text: cleanWordPunctuation(String(w?.text ?? w ?? ''))
  }));

  const CLOSING_PUNCT = /^[,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》"']+$/;
  const OPENING_PUNCT = /^[“‘«\(\{\[「『（【［｛《"']+$/;

  // Step 1: Merge orphan punctuation tokens (Kinsoku Shori)
  const merged = [];
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i];
    const curText = cur.text.trim();

    if (!curText) continue;

    // A. If token is pure closing punctuation, glue onto previous token
    if (merged.length > 0 && CLOSING_PUNCT.test(curText)) {
      const prev = merged[merged.length - 1];
      prev.text = cleanWordPunctuation(prev.text.trimEnd() + curText);
      if (cur.endMs != null) prev.endMs = Math.max(prev.endMs || 0, cur.endMs);
      if (cur.duration != null && prev.duration != null) prev.duration += cur.duration;
      continue;
    }

    // B. If token is pure opening punctuation, prepend to next token
    if (OPENING_PUNCT.test(curText) && i + 1 < tokens.length) {
      tokens[i + 1].text = cleanWordPunctuation(curText + tokens[i + 1].text.trimStart());
      tokens[i + 1].timeMs = Math.min(tokens[i + 1].timeMs || cur.timeMs, cur.timeMs || tokens[i + 1].timeMs);
      continue;
    }

    merged.push(cur);
  }

  if (merged.length === 0) return [];

  // Step 2: Reconcile with lineText to restore missing punctuation
  if (cleanLine) {
    let lineIdx = 0;
    for (let i = 0; i < merged.length; i++) {
      const cur = merged[i];
      const curBare = cur.text.replace(/^[^a-zA-Z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]+/, '')
                              .replace(/[^a-zA-Z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]+$/, '');
      const searchTarget = curBare || cur.text.trim();
      if (!searchTarget) continue;

      const found = cleanLine.indexOf(searchTarget, lineIdx);
      if (found !== -1) {
        if (found > lineIdx) {
          const between = cleanLine.substring(lineIdx, found).trim();
          if (between && /^[“‘«\(\{\[「『（【［｛《"']+$/.test(between)) {
            if (!cur.text.startsWith(between)) {
              cur.text = cleanWordPunctuation(between + cur.text);
            }
          }
        }

        const afterWordIdx = found + searchTarget.length;
        lineIdx = afterWordIdx;

        let punctEnd = lineIdx;
        while (punctEnd < cleanLine.length && /[,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》"']/.test(cleanLine[punctEnd])) {
          punctEnd++;
        }

        if (punctEnd > lineIdx) {
          const punct = cleanLine.substring(lineIdx, punctEnd);
          const nextToken = (i + 1 < merged.length) ? String(merged[i + 1]?.text ?? '').trimStart() : '';
          const nextAlreadyHasPunct = nextToken.startsWith(punct) || (punct.length > 0 && nextToken.startsWith(punct[0]));
          if (!nextAlreadyHasPunct && !cur.text.trimEnd().endsWith(punct)) {
            cur.text = cleanWordPunctuation(cur.text.trimEnd() + punct);
          }
          lineIdx = punctEnd;
        }
      }
    }
  }

  return merged.map(w => ({
    ...w,
    text: cleanWordPunctuation(w.text)
  }));
}

function needsTimedWordSpace(words, wordIndex, lineText, searchState) {
  if (wordIndex >= words.length - 1) return false;
  const word = String(words[wordIndex]?.text ?? words[wordIndex] ?? '');
  const nextWord = String(words[wordIndex + 1]?.text ?? words[wordIndex + 1] ?? '');

  const curTrim = word.trim();
  const nextTrim = nextWord.trim();
  if (!curTrim || !nextTrim) return false;

  // RULE 1: NEVER insert a space BEFORE closing punctuation or commas!
  if (/^[,.!?;:’”»\)}\]…~～、。，．！？–—）】］｝》]/.test(nextTrim)) {
    return false;
  }

  // RULE 2: NEVER insert a space after opening punctuation!
  if (/[“‘«\(\{\[「『（【［｛《]$/.test(curTrim)) {
    return false;
  }

  // RULE 3: NEVER insert a space before contractions ('t, 's, 'm, 're, 've, 'll, 'd)
  if (/^['’](t|s|m|re|ve|ll|d)\b/i.test(nextTrim)) {
    return false;
  }

  // RULE 3a: Hyphenated syllable continuation (flow-, to-, geth-, beau-)
  if (/[-–—]$/.test(curTrim) || /^[-–—]/.test(nextTrim)) {
    return false;
  }

  // RULE 3b: Consecutive CJK characters (Hanzi, Japanese Hiragana/Katakana \u3040-\u30ff, Korean Hangul \uac00-\ud7af)
  const CJK_CHAR = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/;
  if (CJK_CHAR.test(curTrim.slice(-1)) && CJK_CHAR.test(nextTrim[0])) {
    return false;
  }

  // RULE 3c: Strictly preserve explicit hasSpace === false from parser or word token
  if (words[wordIndex]?.hasSpace === false) {
    return false;
  }

  // RULE 3d: Syllable continuity check: If merged word exists in cleanLine, NEVER insert space!
  const cleanLine = typeof lineText === 'string' ? cleanLyricText(lineText) : '';
  const cleanCur = curTrim.replace(/^[“‘«\(\{\[「『（【［｛《"']+/, '').replace(/[,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》"']+$/, '');
  const cleanNext = nextTrim.replace(/^[“‘«\(\{\[「『（【［｛《"']+/, '').replace(/[,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》"']+$/, '');
  const bareCur = cleanCur.replace(/[-–—]/g, '');
  const bareNext = cleanNext.replace(/[-–—]/g, '');
  if (cleanLine && bareCur && bareNext) {
    const lowerLine = cleanLine.toLowerCase();
    const mBare = (bareCur + bareNext).toLowerCase();
    const mHyphen = (bareCur + '-' + bareNext).toLowerCase();
    const mOrig = (cleanCur + cleanNext).toLowerCase();
    if (lowerLine.includes(mBare) || lowerLine.includes(mHyphen) || lowerLine.includes(mOrig)) {
      return false;
    }
  }

  // Explicit hasSpace === true
  if (words[wordIndex]?.hasSpace === true) {
    return true;
  }

  // RULE 4: Align with ground-truth lineText if available
  const needle = curTrim;
  const found = needle && cleanLine ? cleanLine.indexOf(needle, searchState.position) : -1;
  if (found >= 0) {
    searchState.position = found + needle.length;
    while (/[,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》"']/.test(cleanLine[searchState.position] || '')) {
      searchState.position++;
    }
    if (/\s/.test(cleanLine[searchState.position] || '')) {
      while (/\s/.test(cleanLine[searchState.position] || '')) searchState.position++;
      return true;
    }
    // lineText is present and explicitly has NO space here: these are syllables of the same word or CJK
    return false;
  }

  // RULE 5: If word has explicit trailing space or nextWord has explicit leading space
  if (/\s$/.test(word) || /^\s/.test(nextWord)) return true;

  // RULE 6: Always space after punctuation or closing brackets when followed by alphanumeric or opening brackets
  if (/[,.!?;:\)}\]’”»）】］｝》]$/.test(curTrim) && /^[a-zA-Z0-9“‘«\(\{\[「『（【［｛《]/.test(nextTrim)) {
    return true;
  }

  // RULE 7: Between alphanumeric Latin characters or before opening brackets
  const curEndsAlphaNum = /[a-zA-Z0-9]$/.test(curTrim);
  const nextStartsAlphaNum = /^[a-zA-Z0-9]/.test(nextTrim);
  const nextStartsOpeningBracket = /^[“‘«\(\{\[「『（【［｛《]/.test(nextTrim);

  if (curEndsAlphaNum && (nextStartsAlphaNum || nextStartsOpeningBracket)) {
    return true;
  }

  return false;
}

// --- Syllable DOM Pool (Recycles timed word spans to eliminate V8 GC spikes) ---
class SyllableDOMPool {
  constructor(initialSize = 32) {
    this.pool = [];
    if (typeof document !== 'undefined') {
      try {
        for (let i = 0; i < initialSize; i++) {
          this.pool.push(document.createElement('span'));
        }
      } catch (_) {}
    }
  }

  acquire(className, text, dataName, dataValue) {
    let span = this.pool.pop();
    if (!span && typeof document !== 'undefined') {
      span = document.createElement('span');
    }
    if (span) {
      span.className = className || '';
      span.textContent = text || '';
      if (span.dataset) {
        span.dataset.wordText = text || '';
        if (dataName) span.dataset[dataName] = dataValue;
      }
    }
    return span;
  }

  release(span) {
    if (!span) return;
    span.className = '';
    span.textContent = '';
    if (this.pool.length < 128) {
      this.pool.push(span);
    }
  }

  releaseAll(container) {
    if (!container || !container.querySelectorAll) return;
    try {
      const spans = container.querySelectorAll('.lyric-word, .tb-lyric-word, .tb-word-space');
      for (let i = 0; i < spans.length; i++) {
        this.release(spans[i]);
      }
    } catch (_) {}
  }
}
const globalSyllableDOMPool = new SyllableDOMPool();
if (typeof window !== 'undefined') {
  window._syllableDOMPool = globalSyllableDOMPool;
}

function appendTimedWordSpans(container, words, lineText, className, dataName) {
  const reconciled = reconcileTimedWords(words, lineText);
  const searchState = { position: 0 };
  const isTaskbar = className && className.includes('tb-lyric-word');
  const pool = (typeof window !== 'undefined' && window._syllableDOMPool) || (typeof globalSyllableDOMPool !== 'undefined' ? globalSyllableDOMPool : null);
  reconciled.forEach((word, index) => {
    const rawText = String(word?.text ?? word ?? '');
    const cleanWord = rawText.trim();
    let span = null;
    if (pool && typeof pool.acquire === 'function') {
      span = pool.acquire(className, cleanWord, dataName, index);
    } else {
      span = document.createElement('span');
      span.className = className;
      span.textContent = cleanWord;
      if (span.dataset) {
        span.dataset.wordText = cleanWord;
        if (dataName) span.dataset[dataName] = index;
      }
    }
    container.appendChild(span);
    if (index < reconciled.length - 1 && needsTimedWordSpace(reconciled, index, lineText || '', searchState)) {
      if (isTaskbar) {
        let spaceSpan = null;
        if (pool && typeof pool.acquire === 'function') {
          spaceSpan = pool.acquire('tb-word-space', ' ', null, null);
        } else {
          spaceSpan = document.createElement('span');
          spaceSpan.className = 'tb-word-space';
          spaceSpan.textContent = ' ';
        }
        container.appendChild(spaceSpan);
      } else {
        container.appendChild(document.createTextNode(' '));
      }
    }
  });
}

function timedWordSpansHtml(words, lineText) {
  const reconciled = reconcileTimedWords(words, lineText);
  const searchState = { position: 0 };
  return reconciled.map((word, index) => {
    const text = String(word?.text ?? word ?? '');
    const cleanText = text.trim();
    const span = `<span class="lyric-word" data-word-idx="${index}" data-word-text="${escapeHTML(cleanText)}">${escapeHTML(cleanText)}</span>`;
    return span + (index < reconciled.length - 1 && needsTimedWordSpace(reconciled, index, lineText || '', searchState) ? '<span class="island-word-space"> </span>' : '');
  }).join('');
}

function renderLyrics() {
  syncSplitNoLyricsFocus();
  updatePreviousLyricsRestoreButton();
  if (globalSyllableDOMPool && lyricsContainer) {
    globalSyllableDOMPool.releaseAll(lyricsContainer);
  }
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
    manualLyricScrollY = null;
    hideResyncButton();
    updateTimingStatus(-1);
    const btnHide = document.getElementById("btn-hide-lyrics");
    if (btnHide) btnHide.style.display = "none";
    updateAutoHideState();
    if ((isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === 'cinematic')) && cinematicMainRendererInstance) {
      syncCinematicState();
    }
    return;
  }

  // Only enable visual "dimming" of the line if we actually have words to highlight
  const hasAnyWordTiming = lyrics.some(l => l.words && l.words.length > 0);
  document.body.classList.toggle("wbw-active", (settings.wordByWord !== false) && hasAnyWordTiming);

  lyricsContainer.replaceChildren();
  manualLyricScrollY = null;
  const frag = document.createDocumentFragment();
  cachedLineEls = [];
  lyrics.forEach((line, index) => {
    const el = document.createElement("div");
    el.className = "lyric-line";
    el.dataset.index = index;
    el.style.transformOrigin = `${settings.textAlign} center`;

    // Multi-Artist Duet Separation (Duet Layout & Vocal Color Tints)
    if (settings.duetSeparation !== false && line.singerRole) {
      el.classList.add(`lyric-singer-${line.singerRole}`);
      if (line.singerId != null) {
        el.classList.add(`lyric-singer-${line.singerId}`);
      }
      if (line.singerRole === 'secondary' || line.singerId === 2 || line.singerRole === 'tertiary' || line.singerId === 3) {
        el.style.textAlign = 'right';
        el.style.alignSelf = 'flex-end';
        el.style.transformOrigin = 'right center';
      } else if (line.singerRole === 'both') {
        el.style.textAlign = 'center';
        el.style.alignSelf = 'center';
        el.style.transformOrigin = 'center center';
      } else if (line.singerRole === 'primary' || line.singerId === 1) {
        el.style.textAlign = 'left';
        el.style.alignSelf = 'flex-start';
        el.style.transformOrigin = 'left center';
      }
    }

    const lineText = line.text ? cleanLyricText(line.text) : "•••";

    // Only enable word-by-word rendering if the source actually provided high-fidelity word timings.
    // This stops the inaccurate "guessing/dividing" fallback.
    const hasRealWordTiming = line.words && line.words.length > 0;

    if ((settings.wordByWord !== false) && hasRealWordTiming) {
      line.words = reconcileTimedWords(line.words, lineText);
      const wordList = line.words;
      appendTimedWordSpans(el, wordList, lineText, 'lyric-word lyric-word-upcoming', 'wordIndex');
    } else {
      el.textContent = lineText;
    }

    // Artist Pill Badges & Avatar Chips (Stripped to let clean orientation distinguish artists)
    if (settings.duetSeparation !== false && settings.showArtistChips === true && line.singerName && (line.singerTurnStart || index === 0)) {
      const chip = document.createElement("div");
      chip.className = `lyric-singer-chip lyric-singer-chip-${line.singerRole || '1'}`;
      const avatarChar = (line.singerRole === 'both') ? '♪' : (line.singerName.charAt(0).toUpperCase() || '♪');
      chip.innerHTML = `<span class="singer-chip-avatar">${avatarChar}</span><span class="singer-chip-name">${escapeHTML(line.singerName)}</span>`;
      el.insertBefore(chip, el.firstChild);
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

    if (line.backingText) {
      const backingEl = document.createElement("div");
      backingEl.className = "lyric-backing-text";
      backingEl.style.fontSize = "0.72em";
      backingEl.style.opacity = "0.72";
      backingEl.style.marginTop = "3px";
      backingEl.style.fontWeight = "400";
      backingEl.style.whiteSpace = "pre-line";
      backingEl.style.pointerEvents = "none";
      const backingWords = Array.isArray(line.backingWords) ? line.backingWords : [];
      if (settings.wordByWord !== false && backingWords.length) {
        line.backingWords = reconcileTimedWords(backingWords, line.backingText);
        appendTimedWordSpans(backingEl, line.backingWords, line.backingText,
          'lyric-word lyric-word-backing lyric-word-upcoming', 'backingWordIndex');
      } else {
        backingEl.textContent = line.backingText;
      }
      el.appendChild(backingEl);
    }

    frag.appendChild(el);
    cachedLineEls.push(el);
  });

  lyricsContainer.replaceChildren(frag);
  attachAnnotationsToRenderedLyrics();
  measureLyricMetrics();
  const currentSyncMs = (typeof getAcousticSyncProgress === 'function') ? getAcousticSyncProgress() : currentProgress;
  const initialActiveIdx = (isPlaying || currentSyncMs > 500) && typeof getCurrentActiveLyricIndex === 'function'
    ? getCurrentActiveLyricIndex(currentSyncMs)
    : 0;
  activeLineIndex = -1;
  scrollLyrics(Math.max(0, initialActiveIdx));
  if (typeof updatePlayhead === 'function' && isPlaying) {
    updatePlayhead();
  }
  wakeAutoHideTemporarily(6000);
  updateAutoHideState();
  if ((isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === 'cinematic')) && cinematicMainRendererInstance) {
    syncCinematicState();
  }
}

function syncSplitNoLyricsFocus() {
  if (!document.body) return false;
  const instrumentalLabel = /^(?:[\[(\{]\s*)?(?:instrumental|music(?: only)?|solo|interlude|intro(?:duction)?|outro|break|no vocals|(?:[♪♫]\s*)+)(?:\s*[\])\}])?$/i;
  const hasVocalLyrics = Array.isArray(lyrics) && lyrics.some((line) => {
    const text = extractLineText(line).replace(/\s+/g, ' ').trim();
    return Boolean(text) && !instrumentalLabel.test(text);
  });
  const hasTrack = Boolean(currentTrackId || currentPlayingTrackObj || currentTitle) &&
    !document.body.classList.contains('is-idle');
  const enabled = Boolean(settings?.layoutSplit && hasTrack && !hasVocalLyrics);
  document.body.classList.toggle('split-no-lyrics-focus', enabled);
  return enabled;
}

cachedViewportHeight = 0;
cachedLineMetrics = [];

let _invalidateLyricMetricsRafId = null;

function invalidateLyricMetrics(andScroll = true) {
  cachedLineMetrics = [];
  cachedViewportHeight = 0;
  if (!lyrics || lyrics.length === 0 || !cachedLineEls || cachedLineEls.length === 0) return;

  if (_invalidateLyricMetricsRafId !== null) {
    cancelAnimationFrame(_invalidateLyricMetricsRafId);
  }
  _invalidateLyricMetricsRafId = requestAnimationFrame(() => {
    _invalidateLyricMetricsRafId = null;
    measureLyricMetrics();
    if (andScroll && activeLineIndex >= 0 && !userScrolling) {
      const idx = activeLineIndex;
      activeLineIndex = -1;
      scrollLyrics(idx);
    }
  });
}

let _measureMetricsRafId = null;
let _measureMetricsRetryCount = 0;

function scheduleMeasureLyricMetrics() {
  if (_measureMetricsRafId !== null) return;
  if (isDynamicIslandMode || (typeof settings !== 'undefined' && settings.taskbarMode)) return;
  _measureMetricsRafId = requestAnimationFrame(() => {
    _measureMetricsRafId = null;
    measureLyricMetrics();
  });
}

function measureLyricMetrics() {
  if (_measureMetricsRafId !== null) {
    cancelAnimationFrame(_measureMetricsRafId);
    _measureMetricsRafId = null;
  }
  if (!lyricsViewport || !cachedLineEls || cachedLineEls.length === 0) return;
  if (isDynamicIslandMode || (typeof settings !== 'undefined' && settings.taskbarMode)) return;
  const vh = lyricsViewport.clientHeight;
  if (vh <= 0) {
    return;
  }
  cachedViewportHeight = vh;

  const firstEl = cachedLineEls[0];
  const firstTop = firstEl ? firstEl.offsetTop : 0;
  const firstHeight = firstEl ? (firstEl.clientHeight || 44) : 44;

  // Layout not ready yet; defer at most once without thrashing child elements
  if (cachedLineEls.length > 1 && firstTop === 0 && firstHeight <= 0) {
    if (_measureMetricsRetryCount < 1) {
      _measureMetricsRetryCount++;
      scheduleMeasureLyricMetrics();
    } else {
      _measureMetricsRetryCount = 0;
    }
    return;
  }
  _measureMetricsRetryCount = 0;

  const count = cachedLineEls.length;
  const metrics = new Array(count);
  let accumulatedTop = firstTop;

  for (let i = 0; i < count; i++) {
    const el = cachedLineEls[i];
    // Replace 100-line el.offsetTop forced reflows with calculated monotonic offsets;
    // only read line clientHeight for multiline wrapping tolerance.
    const h = (i === 0) ? firstHeight : (el.clientHeight || firstHeight);
    metrics[i] = {
      top: accumulatedTop,
      height: h
    };
    accumulatedTop += h;
  }
  cachedLineMetrics = metrics;
}

window.addEventListener('resize', () => {
  measureLyricMetrics();
  if (!userScrolling && activeLineIndex >= 0) {
    const idx = activeLineIndex;
    activeLineIndex = -1;
    scrollLyrics(idx);
  }
  const trackWrap = document.getElementById("widget-track-name-wrapper");
  if (trackWrap && typeof widgetTrackName !== 'undefined' && widgetTrackName) {
    updateMarqueeOverflow(trackWrap, widgetTrackName);
  }
});

// Monitor asynchronous font downloads (Google Fonts) and remeasure lyrics upon font load
if (typeof document !== 'undefined' && document.fonts) {
  if (document.fonts.ready) {
    document.fonts.ready.then(() => {
      invalidateLyricMetrics(true);
    }).catch(() => {});
  }
  if (typeof document.fonts.addEventListener === 'function') {
    document.fonts.addEventListener('loadingdone', () => {
      invalidateLyricMetrics(true);
    });
  }
}

// Tap to Ghost Passthrough mode: hover + ` (Tilde) or Ctrl+Shift+G to toggle
window.addEventListener('keydown', (e) => {
  // Micro-trim sync offset with Ctrl+[ (subtract 25ms) and Ctrl+] (add 25ms)
  if (e.ctrlKey && !e.shiftKey && (e.key === '[' || e.key === ']' || e.code === 'BracketLeft' || e.code === 'BracketRight')) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
      return;
    }
    e.preventDefault();
    const step = (e.key === '[' || e.code === 'BracketLeft') ? -25 : 25;
    if (typeof adjustSyncOffset === 'function') {
      adjustSyncOffset(step);
      const displayMs = `${settings.syncOffsetMs > 0 ? '+' : ''}${settings.syncOffsetMs}ms`;
      if (typeof showToast === 'function') {
        showToast(`Sync Offset: ${displayMs}`, 1500, 'info');
      } else if (typeof showIslandHud === 'function') {
        showIslandHud({ icon: "⏱", text: `Offset: ${displayMs}`, showBar: false });
      }
    }
    return;
  }

  if (isDynamicIslandMode) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
      return;
    }
    const isTilde = e.key === '`' || e.code === 'Backquote';
    const isCombo = e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'G';
    const isGhostActive = document.body.classList.contains('island-ghost-mode');
    if (isCombo && window.electronAPI?.onToggleDynamicIslandShortcut) {
      e.preventDefault();
      return;
    }
    if (isCombo || (isTilde && (isMouseOverDynamicIsland || isGhostActive))) {
      e.preventDefault();
      if (window.electronAPI && typeof window.electronAPI.toggleDynamicIslandGhost === 'function') {
        window.electronAPI.toggleDynamicIslandGhost();
      } else {
        toggleIslandGhostMode(!isGhostActive);
      }
    }
  }
});

window.addEventListener('blur', () => {
  if (islandMouseLeaveTimer) {
    clearTimeout(islandMouseLeaveTimer);
    islandMouseLeaveTimer = null;
  }
  isMouseOverDynamicIsland = false;
  document.body.classList.add('window-blurred');
  if (!isDynamicIslandMode && typeof stopPlaybackInterpolation === 'function') {
    stopPlaybackInterpolation();
  }
  if (typeof syncAudioVisualizerState === 'function') {
    syncAudioVisualizerState();
  }
  if (typeof fluidMeshGradientInstance !== 'undefined' && fluidMeshGradientInstance && !settings.wallpaperMode) {
    fluidMeshGradientInstance.stop();
  }
  if (typeof syncCustomBackgroundVideoPlayback === 'function') {
    syncCustomBackgroundVideoPlayback();
  }
  const isPlaybackActive = Boolean(isPlaying);
  if (!isPlaybackActive && !settings.wallpaperMode && !isDynamicIslandMode && !settings.taskbarMode) {
    pauseAnimatedArtVideos();
  }
  if (!isPlaybackActive && typeof updateMemoryTargetLevel === 'function') {
    updateMemoryTargetLevel('low');
  }
});

window.addEventListener('focus', () => {
  document.body.classList.remove('window-blurred');
  syncCustomBackgroundVideoPlayback();
  syncAudioVisualizerState();
  if (isPlaying) {
    schedulePlaybackInterpolation();
    ensurePlayheadLoop();
  }
  if (currentAnimatedArtInfo?.type === 'video' && !(isBatterySaverActive && settings.motionBatterySaver !== false)) {
    resumeAnimatedArtVideos();
    scheduleMotionArtFocusRecovery();
  }
  if (fluidMeshGradientInstance && shouldRunFluidMesh()) {
    fluidMeshGradientInstance.wake?.();
    if (typeof fluidMeshGradientInstance.defrost === 'function') {
      fluidMeshGradientInstance.defrost();
    } else if (isPlaying || !fluidMeshGradientInstance.isSettled?.()) {
      fluidMeshGradientInstance.start();
    }
  }
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
    syncCustomBackgroundVideoPlayback();
    if (currentAnimatedArtInfo?.type === 'video' && !(isBatterySaverActive && settings.motionBatterySaver !== false)) {
      resumeAnimatedArtVideos();
      scheduleMotionArtFocusRecovery();
    }
    if (isPlaying) ensurePlayheadLoop();
    measureLyricMetrics();
    if (!userScrolling && activeLineIndex >= 0) {
      const idx = activeLineIndex;
      activeLineIndex = -1;
      scrollLyrics(idx);
    }
  } else {
    document.body.classList.add('window-blurred');
    syncCustomBackgroundVideoPlayback();
    const isPlaybackActive = Boolean(isPlaying);
    if (!isPlaybackActive && !settings.wallpaperMode && !isDynamicIslandMode && !settings.taskbarMode) {
      pauseAnimatedArtVideos();
    }
    if (!isPlaybackActive && typeof updateMemoryTargetLevel === 'function') {
      updateMemoryTargetLevel('low');
    }
  }
});

// Highlight and center active lyric line
function scrollLyrics(index) {
  const isCinematicActive = settings.wallpaperMode ? (settings.wallpaperStyle === 'cinematic') : Boolean(isCinematicView);
  if (isDynamicIslandMode || settings.taskbarMode || isCinematicActive) return;
  if (index === activeLineIndex && cachedLineEls[activeLineIndex] && cachedLineEls[activeLineIndex].classList.contains("active")) return;
  if (cachedLineEls.length === 0) return;

  // Clear nearby-1 from previous adjacent lines
  if (window._lastNearbyLines) {
    window._lastNearbyLines.forEach(el => {
      if (el) el.classList.remove("nearby-1");
    });
    window._lastNearbyLines = null;
  }

  // Update classes
  if (lyricsContainer) {
    const staleActives = lyricsContainer.querySelectorAll('.lyric-line.active');
    for (let k = 0; k < staleActives.length; k++) {
      if (staleActives[k] !== cachedLineEls[index]) {
        staleActives[k].classList.remove('active');
      }
    }
  }
  if (activeLineIndex >= 0 && cachedLineEls[activeLineIndex]) {
    cachedLineEls[activeLineIndex].classList.remove("active");
  }

  activeLineIndex = index;

  if (activeLineIndex >= 0 && cachedLineEls[activeLineIndex]) {
    const activeEl = cachedLineEls[activeLineIndex];
    activeEl.classList.add("active");

    // Raise the adjacent lines slightly without blurring the lyric text.
    const newNearby = [];
    if (activeLineIndex > 0 && cachedLineEls[activeLineIndex - 1]) {
      cachedLineEls[activeLineIndex - 1].classList.add("nearby-1");
      newNearby.push(cachedLineEls[activeLineIndex - 1]);
    }
    if (activeLineIndex + 1 < cachedLineEls.length && cachedLineEls[activeLineIndex + 1]) {
      cachedLineEls[activeLineIndex + 1].classList.add("nearby-1");
      newNearby.push(cachedLineEls[activeLineIndex + 1]);
    }
    window._lastNearbyLines = newNearby;

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

    // Verify metrics validity without forced synchronous reflow
    let metric = cachedLineMetrics[activeLineIndex];
    const viewportHeight = cachedViewportHeight > 0 ? cachedViewportHeight : 400;

    if (!metric && cachedViewportHeight > 0) {
      scheduleMeasureLyricMetrics();
    }

    const offsetTop = (metric && metric.top !== undefined && (metric.top > 0 || activeLineIndex === 0)) ? metric.top : (activeLineIndex * 40);
    const height = (metric && metric.height > 0) ? metric.height : 40;

    // Compute exact center position
    const translateY = Math.round((viewportHeight / 2) - offsetTop - (height / 2));
    lyricsContainer.style.transform = `translate3d(0, ${translateY}px, 0)`;
  } else {
    hideLiveMeaningPill();
    if (activeLineIndex === -1 && cachedLineEls.length > 0 && !userScrolling && !settings.compactMode) {
      const metric0 = cachedLineMetrics[0];
      const viewportHeight = cachedViewportHeight > 0 ? cachedViewportHeight : 400;
      const top0 = metric0 ? metric0.top : 0;
      const h0 = metric0 ? metric0.height : 40;
      const translateY = Math.round((viewportHeight / 2) - top0 - (h0 / 2));
      lyricsContainer.style.transform = `translate3d(0, ${translateY}px, 0)`;
    }
  }
}


// Accurate active lyric line resolver accounting for LyricsEngine, word timings and boundary hysteresis
function getCurrentActiveLyricIndex(syncProgress = null) {
  if (!lyrics || lyrics.length === 0) return -1;
  const progress = (syncProgress !== null) ? syncProgress : getAcousticSyncProgress();

  if (window.LyricsService?.instance?.engine?.hasLyrics()) {
    const syncState = window.LyricsService.instance.engine.update(progress / 1000);
    if (syncState && typeof syncState.lineIndex === 'number' && syncState.lineIndex >= 0) {
      return syncState.lineIndex;
    }
  }

  if (activeLineIndex >= 0 && activeLineIndex < lyrics.length) {
    const curTime = lyrics[activeLineIndex].timeMs;
    const prevSwitchTime = activeLineIndex > 0 ? getLineSwitchMs(activeLineIndex - 1) : curTime;
    const effectiveStartTime = Math.min(curTime, prevSwitchTime);
    const switchTime = getLineSwitchMs(activeLineIndex);
    if (progress >= effectiveStartTime && progress < switchTime) {
      return activeLineIndex;
    } else if (progress >= switchTime && activeLineIndex + 1 < lyrics.length) {
      const nextSwitchTime = getLineSwitchMs(activeLineIndex + 1);
      if (progress < nextSwitchTime) {
        return activeLineIndex + 1;
      }
    }
  }

  let low = 0;
  let high = lyrics.length - 1;
  let activeIndex = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lyrics[mid].timeMs <= progress) {
      activeIndex = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (activeIndex > 0 && activeIndex < lyrics.length) {
    const prevIdx = activeIndex - 1;
    const prevLine = lyrics[prevIdx];
    if (prevLine && Array.isArray(prevLine.words) && prevLine.words.length > 0) {
      const prevVocalEnd = getLineVocalEndMs(prevLine, prevIdx);
      const curLine = lyrics[activeIndex];
      const curVocalStart = (curLine.words && curLine.words.length > 0)
        ? ((curLine.words[0].start != null ? curLine.words[0].start * 1000 : curLine.words[0].timeMs) || curLine.timeMs)
        : curLine.timeMs;
      if (progress < prevVocalEnd && progress < curVocalStart) {
        activeIndex = prevIdx;
      }
    }
  }

  if (activeIndex >= 0 && activeIndex < lyrics.length - 1) {
    const switchTime = getLineSwitchMs(activeIndex);
    if (progress >= switchTime) {
      activeIndex = activeIndex + 1;
    }
  }

  const isUnsynced = lyrics.length > 0 && lyrics[0].timeMs === 9999999;
  const firstLineStart = (lyrics[0] && (lyrics[0].timeMs != null ? lyrics[0].timeMs : (lyrics[0].start != null ? lyrics[0].start * 1000 : 0))) || 0;
  const isIntroPrelude = !isUnsynced && progress < Math.max(0, firstLineStart - 350);
  if (isIntroPrelude) {
    return -1;
  }

  return (activeIndex === -1 && lyrics.length > 0) ? 0 : activeIndex;
}

// Global resync playback function: resets user scrolling, hides all sync buttons, and snaps to active line
function resyncPlayback() {
  userScrolling = false;
  manualLyricScrollY = null;
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

  measureLyricMetrics();
  const targetIndex = getCurrentActiveLyricIndex();
  activeLineIndex = -1;
  scrollLyrics(targetIndex);
  ensurePlayheadLoop();
  showToast("Synced to current playback", 1500, 'success');
}

// Re-sync button: appears when user scrolls manually, click to re-enable auto-scroll
function showResyncButton() {
  if (isCinematicView || (document.body && document.body.classList.contains('cinematic-view-active'))) {
    const existing = document.getElementById('btn-resync-lyrics');
    if (existing) existing.remove();
    return;
  }
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
    if (isCinematicView || (document.body && document.body.classList.contains('cinematic-view-active'))) {
      btn.style.display = 'none';
      btn.remove();
    }
  }
}

// State management for throttled RAF playhead loop
isPlayheadLoopActive = false;
playheadTimerId = null;
// Full lyric/layout reconciliation is heavier than word-fill interpolation.
// Run it at 8 Hz; active word progress remains interpolated at 30 Hz below.
const PLAYBACK_STATE_SYNC_INTERVAL_MS = 125;
const PLAYHEAD_FRAME_INTERVAL_MS = 33;
const TASKBAR_PLAYHEAD_INTERVAL_MS = 250;
let playbackInterpolationRafId = null;
let playbackInterpolationTimerId = null;

function stopPlaybackInterpolation() {
  if (playbackInterpolationRafId !== null) {
    cancelAnimationFrame(playbackInterpolationRafId);
    playbackInterpolationRafId = null;
  }
  if (playbackInterpolationTimerId !== null) {
    clearTimeout(playbackInterpolationTimerId);
    playbackInterpolationTimerId = null;
  }
}

function setMainProgressFill(percent) {
  if (!widgetProgressFill) widgetProgressFill = document.getElementById("widget-progress-fill");
  if (!widgetProgressFill || !Number.isFinite(percent)) return;
  if (widgetProgressFill.classList.contains("idle-shimmer")) {
    widgetProgressFill.classList.remove("idle-shimmer");
  }
  const ratio = Math.min(1, Math.max(0, percent / 100));
  // Main progress uses its CSS ratio transform. Clear stale inline widths so
  // scrubbing and playback updates cannot apply the ratio twice.
  if (widgetProgressFill.style.width) widgetProgressFill.style.removeProperty('width');
  if (widgetProgressFill._lastProgressRatio === ratio) return;
  widgetProgressFill._lastProgressRatio = ratio;
  widgetProgressFill.style.setProperty('--progress-ratio', ratio.toFixed(5));
}

let _lastPlaybackInterpolationTime = 0;

function schedulePlaybackInterpolation() {
  if (playbackInterpolationRafId !== null || playbackInterpolationTimerId !== null || !isPlaying || document.visibilityState === 'hidden' ||
      (!isDynamicIslandMode && typeof document !== 'undefined' && document.body && document.body.classList.contains('window-blurred')) ||
      (settings.wallpaperMode && !isWallpaperDesktopFocused) || settings.taskbarMode) return;
  const needsLyricInterpolation = !isDynamicIslandMode && settings.wordByWord !== false && activeLineIndex >= 0 &&
    !isKineticMode && !isCinematicView && Boolean(lyrics[activeLineIndex]?.words?.length);
  const islandLineData = (Number.isInteger(_lastPlayheadIslandLineIndex) && _lastPlayheadIslandLineIndex >= 0)
    ? lyrics[_lastPlayheadIslandLineIndex] : null;
  const lineEl = islandLineEl || (islandLineEl = (typeof document !== 'undefined' ? document.getElementById("island-lyric-line") : null));
  const lineScrollWidth = (lineEl && (lineEl._cachedScrollWidth || lineEl.scrollWidth)) || 0;
  const needsIslandInterpolation = Boolean(
    isDynamicIslandMode && !isIslandSleeping &&
    (Boolean(islandLineData?.words?.length) || lineScrollWidth > (cachedIslandZoneWidth || 250) + 4 || (islandLineEl && islandLineEl._cachedScrollWidth > (cachedIslandZoneWidth || 250) + 4) || (isDynamicIslandMode && !isIslandSleeping))
  );
  if (!needsLyricInterpolation && !needsIslandInterpolation) return;

  const frame = (timestamp) => {
    playbackInterpolationRafId = null;
    if (!isPlaying || document.visibilityState === 'hidden' ||
        (!isDynamicIslandMode && typeof document !== 'undefined' && document.body && document.body.classList.contains('window-blurred')) ||
        (settings.wallpaperMode && !isWallpaperDesktopFocused) || settings.taskbarMode) return;
    const hasMainWord = !isDynamicIslandMode && settings.wordByWord !== false && activeLineIndex >= 0 &&
      !isKineticMode && !isCinematicView && Boolean(lyrics[activeLineIndex]?.words?.length);
    const islandLineData = (Number.isInteger(_lastPlayheadIslandLineIndex) && _lastPlayheadIslandLineIndex >= 0)
      ? lyrics[_lastPlayheadIslandLineIndex] : null;
    const curLineEl = islandLineEl || (islandLineEl = (typeof document !== 'undefined' ? document.getElementById("island-lyric-line") : null));
    const curScrollWidth = (curLineEl && (curLineEl._cachedScrollWidth || curLineEl.scrollWidth)) || 0;
    const hasIslandWord = Boolean(
      isDynamicIslandMode && !isIslandSleeping &&
      (Boolean(islandLineData?.words?.length) || curScrollWidth > (cachedIslandZoneWidth || 250) + 4 || (islandLineEl && islandLineEl._cachedScrollWidth > (cachedIslandZoneWidth || 250) + 4) || (isDynamicIslandMode && !isIslandSleeping))
    );
    if (!hasMainWord && !hasIslandWord) return;

    const now = (typeof timestamp === 'number') ? timestamp : ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());
    _lastPlaybackInterpolationTime = now;

    // Unified playhead timing: word fills calibrate against current monotonic clock
    // without repeating the main progress bar / duration string DOM writes.

    // Update only the already-active spans here. Line selection, DOM rebuilding,
    // taskbar IPC, and other state reconciliation stay on the 8 Hz ticker.
    const syncProgress = (hasMainWord || hasIslandWord) ? getAcousticSyncProgress() : 0;
    if (hasMainWord) {
      const activeEl = cachedLineEls[activeLineIndex];
      const lineData = lyrics[activeLineIndex];
      if (activeEl && lineData?.words?.length) {
        if (!activeEl._cachedWordSpans) activeEl._cachedWordSpans = activeEl.querySelectorAll('.lyric-word');
        const spans = activeEl._cachedWordSpans;
        let wordIndex = (typeof activeEl._activeWordIdx === 'number' && activeEl._activeWordIdx >= 0 && activeEl._activeWordIdx < spans.length)
          ? activeEl._activeWordIdx
          : -1;
        if (wordIndex < 0 || !spans[wordIndex] || !spans[wordIndex].classList.contains('lyric-word-active')) {
          wordIndex = -1;
          for (let i = 0; i < spans.length; i++) {
            if (spans[i].classList.contains('lyric-word-active')) { wordIndex = i; break; }
          }
          if (wordIndex >= 0) activeEl._activeWordIdx = wordIndex;
        }
        if (wordIndex >= 0 && lineData.words[wordIndex] && spans[wordIndex]) {
          const word = lineData.words[wordIndex];
          const startMs = (word.start != null ? Number(word.start) * 1000 : Number(word.timeMs)) || 0;
          const endMs = getLyricWordEndMs(lineData.words, wordIndex, lineData, activeLineIndex);
          setLyricWordProgress(spans[wordIndex], (syncProgress - startMs) / Math.max(50, endMs - startMs));
        }
      }
    }
    if (hasIslandWord) {
      const islandLine = lyrics[_lastPlayheadIslandLineIndex];
      if (islandLine && (!window._lastPlayheadIslandTickTime || (performance.now() - window._lastPlayheadIslandTickTime > 8))) {
        updateDynamicIslandWordProgressTick(_lastPlayheadIslandLineIndex, islandLine, syncProgress);
      }
    }

    // 60 FPS unthrottled RAF for Dynamic Island lyrics scrolling and panning.
    // Desktop word fills continue on the 30 Hz timer to keep general CPU minimal.
    if (isDynamicIslandMode && !isIslandSleeping) {
      playbackInterpolationRafId = requestAnimationFrame(frame);
    } else {
      playbackInterpolationTimerId = setTimeout(() => {
        playbackInterpolationTimerId = null;
        if (!isPlaying || document.visibilityState === 'hidden' ||
            (!isDynamicIslandMode && typeof document !== 'undefined' && document.body && document.body.classList.contains('window-blurred')) ||
            (settings.wallpaperMode && !isWallpaperDesktopFocused) || settings.taskbarMode) return;
        playbackInterpolationRafId = requestAnimationFrame(frame);
      }, PLAYHEAD_FRAME_INTERVAL_MS);
    }
  };

  playbackInterpolationRafId = requestAnimationFrame(frame);
}

function ensurePlayheadLoop() {
  schedulePlaybackInterpolation();
  if (isPlayheadLoopActive) {
    // A focus/visibility/playback event can arrive while the 8 Hz timer is
    // pending. Canceling that timer without scheduling its replacement leaves
    // the loop marked active forever, freezing lyric timestamps.
    if (playheadTimerId && document.visibilityState !== 'hidden') {
      clearTimeout(playheadTimerId);
      playheadTimerId = null;
      requestAnimationFrame(updatePlayhead);
    }
    return;
  }

  // A paused player gets one-shot UI refreshes from its state/seek handlers;
  // it must not start a recurring playhead loop until playback resumes.
  if (!isPlaying) return;

  isPlayheadLoopActive = true;
  if (document.visibilityState !== 'hidden') {
    requestAnimationFrame(updatePlayhead);
  } else {
    const requiresHighFreqTick = Boolean(typeof settings !== 'undefined' && (settings.taskbarMode || isDynamicIslandMode || settings.wallpaperMode));
    playheadTimerId = setTimeout(updatePlayhead, requiresHighFreqTick ? 25 : 1000);
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
    // Local SMTC playback can run without a Spotify config. Keep interpolating
    // from the latest playback anchor in that case, instead of stepping only
    // when the next native playback event arrives.
    if (isPlaying) {
      const baseRate = window._currentPlaybackRate || 1.0;
      const pllRate = window._pllRateMultiplier || 1.0;
      const rate = baseRate * pllRate;
      const elapsed = (getHighResTime() - lastPollTimestamp) * rate;
      currentProgress = lastPollProgress + elapsed;
    } else {
      currentProgress = lastPollProgress;
    }

    const isRecentSeek = (Date.now() - lastUserSeekTimestamp) < 2500;
    if (window._allowClockConvergence) {
      window._allowClockConvergence = false;
    } else if (isPlaying && !isRecentSeek && previousProgress > 0 && currentProgress < previousProgress) {
      // Enforce strict monotonic progression during active playback:
      // prevents micro backward time-travel caused by network clock slew or polling jitter
      currentProgress = previousProgress;
    }

    // SMTC providers may report an unknown duration (0) while still exposing
    // a live playback session. Treat 0 as "unknown", not as a zero-length track,
    // or this clamp pins the lyric clock at 0:00 forever.
    if (trackDuration > 0 && currentProgress > trackDuration) {
      currentProgress = trackDuration;
    }

    // Update widget UI progress
    const fillPercent = trackDuration > 0 ? (currentProgress / trackDuration) * 100 : 0;
      
      if (!isScrubbingMainProgress) {
        const isDesktopUiVisible = !isDynamicIslandMode && !settings.wallpaperMode && !settings.taskbarMode && !isKineticMode && !isCinematicView;
        if (isDesktopUiVisible) {
          // Throttle progress bar visual updates (only update if changed significantly)
          setMainProgressFill(fillPercent);
          if (Math.abs((window._lastFillPercent || 0) - fillPercent) > 0.1) {
            window._lastFillPercent = fillPercent;
            if (!window._cachedMainThumb) {
              window._cachedMainThumb = document.getElementById("main-progress-thumb");
            }
            if (window._cachedMainThumb) {
              window._cachedMainThumb.style.left = `${fillPercent}%`;
            }
          }

          const timeStr = formatTime(currentProgress);
          if (widgetTimeCurrent && widgetTimeCurrent.textContent !== timeStr) {
            widgetTimeCurrent.textContent = timeStr;
          }

          if (widgetTimeDuration && trackDuration > 0) {
            const durStr = window._showRemainingTime
              ? `-${formatTime(Math.max(0, trackDuration - currentProgress))}`
              : formatTime(trackDuration);
            if (widgetTimeDuration.textContent !== durStr) {
              widgetTimeDuration.textContent = durStr;
            }
          }
        }
      }

      if (isDynamicIslandMode && !isScrubbingIslandProgress && trackDuration > 0) {
        setIslandProgress(currentProgress, trackDuration);
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
        // Latency Compensation: 220ms acoustic lead compensation calibrated for WASAPI buffer & Spotify polling lag
        const syncProgress = getAcousticSyncProgress();

        let activeIndex = -1;
        const isUnsynced = lyrics.length > 0 && lyrics[0].timeMs === 9999999;

        if (window.LyricsService?.instance?.engine?.hasLyrics()) {
          const syncState = window.LyricsService.instance.engine.update(syncProgress / 1000);
          activeIndex = syncState.lineIndex;
        } else {
          // O(1) Fast-Path forward check, binary search O(log N) on seeks
          if (activeLineIndex >= 0 && activeLineIndex < lyrics.length) {
            const curTime = lyrics[activeLineIndex].timeMs;
            const switchTime = getLineSwitchMs(activeLineIndex);
            if (syncProgress >= curTime && syncProgress < switchTime) {
              activeIndex = activeLineIndex;
            } else if (syncProgress >= switchTime && activeLineIndex + 1 < lyrics.length) {
              const nextSwitchTime = getLineSwitchMs(activeLineIndex + 1);
              if (syncProgress < nextSwitchTime) {
                activeIndex = activeLineIndex + 1;
              }
            }
          }
          if (activeIndex === -1) {
            let low = 0;
            let high = lyrics.length - 1;
            while (low <= high) {
              const mid = (low + high) >> 1;
              if (lyrics[mid].timeMs <= syncProgress) {
                activeIndex = mid;
                low = mid + 1;
              } else {
                high = mid - 1;
              }
            }
            // Word-by-word boundary refinement:
            // If binary search picked a line whose words haven't started singing yet,
            // but previous line's words are still actively singing, stay on previous line!
            if (activeIndex > 0 && activeIndex < lyrics.length) {
              const prevIdx = activeIndex - 1;
              const prevLine = lyrics[prevIdx];
              if (prevLine && Array.isArray(prevLine.words) && prevLine.words.length > 0) {
                const prevVocalEnd = getLineVocalEndMs(prevLine, prevIdx);
                const curLine = lyrics[activeIndex];
                const curVocalStart = (curLine.words && curLine.words.length > 0)
                  ? ((curLine.words[0].start != null ? curLine.words[0].start * 1000 : curLine.words[0].timeMs) || curLine.timeMs)
                  : curLine.timeMs;
                if (syncProgress < prevVocalEnd && syncProgress < curVocalStart) {
                  activeIndex = prevIdx;
                }
              }
            }
          }
        }

        // Anti-Jitter / Hysteresis Protection:
        // When paused or during micro-timing variances, avoid flickering right on the line boundary.
        // Calibrated 100ms threshold prevents premature forward-locking while keeping line switches crisp.
        if (activeLineIndex >= 0 && activeIndex < activeLineIndex && lyrics[activeLineIndex] && !isUnsynced) {
          const retreatThreshold = lyrics[activeLineIndex].timeMs - 100;
          if (syncProgress >= retreatThreshold) {
            activeIndex = activeLineIndex;
          }
        }

        // Feature: Show first line immediately before its timestamp arrives
        const firstLineStart = (lyrics[0] && (lyrics[0].timeMs != null ? lyrics[0].timeMs : (lyrics[0].start != null ? lyrics[0].start * 1000 : 0))) || 0;
        const isIntroPrelude = !isUnsynced && syncProgress < Math.max(0, firstLineStart - 350);
        if (activeIndex === -1 && lyrics.length > 0 && !isUnsynced && !isIntroPrelude) {
          activeIndex = 0;
        }

        // Genuine Instrumental Break Detection for main view & taskbar:
        // If current vocal has finished and next line is >= 4s away, enter resting instrumental state
        let isInstrumentalBreak = false;
        let msUntilNextVocal = 0;
        if (activeIndex >= 0 && activeIndex < lyrics.length - 1 && !isUnsynced) {
          const curLine = lyrics[activeIndex];
          const curVocalEnd = getLineVocalEndMs(curLine, activeIndex);
          const nextLine = lyrics[activeIndex + 1];
          const nextStart = (nextLine.timeMs != null ? nextLine.timeMs : (nextLine.start != null ? nextLine.start * 1000 : 0)) || 0;
          const totalGap = nextStart - curVocalEnd;
          if (totalGap >= 4000 && syncProgress > (curVocalEnd + 1200) && syncProgress < (nextStart - 280)) {
            isInstrumentalBreak = true;
            msUntilNextVocal = Math.max(0, nextStart - syncProgress);
          }
        }

        // Run main app lyrics scrolling and word-by-word highlighting when in normal window mode (not cinematic view) or classic split wallpaper mode
        const isWallpaperSuspended = Boolean(settings.wallpaperMode && !isWallpaperDesktopFocused);
        const isCinematicActive = settings.wallpaperMode ? (settings.wallpaperStyle === 'cinematic') : Boolean(isCinematicView);
        const shouldScrollMainLyrics = !isWallpaperSuspended && !isDynamicIslandMode && !settings.taskbarMode && !isCinematicActive;
        const effectiveDisplayIndex = isIntroPrelude ? -1 : activeIndex;
        if (shouldScrollMainLyrics) {
          scrollLyrics(effectiveDisplayIndex);

          // Virtual DJ: evaluate lyric-aware outro transition fader
          if (window.djEngine && isPlaying && !isIntroPrelude && trackDuration > 0) {
            window.djEngine.evaluateLyricTransition({
              currentTimeMs: syncProgress,
              durationMs: trackDuration,
              lyrics,
              isPlaying,
              track: (typeof currentPlayingTrackObj !== 'undefined' ? currentPlayingTrackObj : currentTrack),
              spotifyDeviceId: (typeof currentDeviceId !== 'undefined' ? currentDeviceId : null),
              spotifyToken: (config && config.access_token) || (typeof getSpotifyToken === 'function' ? getSpotifyToken() : null)
            });
          }

          // Update Instrumental Solo Stage (Floating pill indicator)
          const soloStage = document.getElementById("instrumental-solo-stage");
          if (soloStage) {
            if (isInstrumentalBreak || isIntroPrelude) {
              if (!soloStage.classList.contains("active")) {
                soloStage.classList.add("active");
                syncAudioVisualizerState();
              }
              const soloCountdown = document.getElementById("solo-countdown");
              if (soloCountdown) {
                if (isIntroPrelude) {
                  const sRem = Math.ceil(Math.max(0, firstLineStart - syncProgress) / 1000);
                  soloCountdown.textContent = sRem > 0 ? `Intro (${sRem}s)` : `Intro prelude`;
                } else {
                  const sRem = Math.ceil(msUntilNextVocal / 1000);
                  soloCountdown.textContent = sRem > 0 ? `Solo break (${sRem}s)` : `Instrumental break`;
                }
              }
            } else {
              if (soloStage.classList.contains("active")) {
                soloStage.classList.remove("active");
                const soloWave = soloStage.querySelector(".solo-visualizer-wave");
                if (soloWave) {
                  soloWave.classList.remove("is-live-audio");
                  soloWave.classList.add("is-resting");
                }
                syncAudioVisualizerState();
              }
            }
          }

          // Word-by-Word karaoke highlight
          if ((settings.wordByWord !== false) && effectiveDisplayIndex >= 0) {
            const activeEl = cachedLineEls[effectiveDisplayIndex];
            const lineData = lyrics[effectiveDisplayIndex];

            if (activeEl && lineData) {
              updateBackingWordHighlights(activeEl, lineData, syncProgress, isPlaying);
              if (!activeEl._cachedWordSpans) {
                activeEl._cachedWordSpans = activeEl.querySelectorAll('.lyric-word');
              }
              const wordSpans = activeEl._cachedWordSpans;
              // Only process word highlights if spans actually exist (meaning we have real word data)
              if (wordSpans.length > 0 && lineData.words && lineData.words.length > 0) {
                const engine = window.LyricsService?.instance?.engine;
                let wordStates = null;
                if (engine && engine.hasLyrics()) {
                  wordStates = engine.getLineWordStates(activeIndex, syncProgress / 1000);
                }

                if (wordStates && wordStates.length === wordSpans.length) {
                  const statesKey = wordStates.join(',');
                  if (activeEl._lastWordStates !== statesKey) {
                    activeEl._lastWordStates = statesKey;
                    wordSpans.forEach((span, wi) => {
                      const st = wordStates[wi] || 'upcoming';
                      span.classList.toggle('lyric-word-completed', st === 'completed');
                      span.classList.toggle('lyric-word-passed', st === 'completed');
                      span.classList.toggle('lyric-word-active', st === 'active');
                      span.classList.toggle('lyric-word-upcoming', st === 'upcoming');
                      if (st !== 'active') {
                        delete span._lastProgressValue;
                        delete span._lastProgressPercent;
                        span.style.removeProperty('--word-progress');
                        span.style.removeProperty('--word-progress-percent');
                      }
                    });
                  }
                  const activeWi = wordStates.indexOf('active');
                  activeEl._activeWordIdx = activeWi;
                  if (activeWi >= 0 && lineData.words[activeWi] && wordSpans[activeWi]) {
                    const activeW = lineData.words[activeWi];
                    const wStart = (activeW.start != null ? activeW.start * 1000 : activeW.timeMs) || 0;
                    const wEnd = getLyricWordEndMs(lineData.words, activeWi, lineData, activeIndex);
                    const wDur = Math.max(50, wEnd - wStart);
                    const rawProgress = Math.min(1, Math.max(0, (syncProgress - wStart) / wDur));
                    const prevProg = (wordSpans[activeWi]?._lastProgressValue !== undefined)
                      ? wordSpans[activeWi]._lastProgressValue
                      : parseFloat(wordSpans[activeWi]?.style.getPropertyValue('--word-progress') || '0');
                    const wordProgress = (isPlaying && rawProgress < prevProg) ? prevProg : rawProgress;
                    setLyricWordProgress(wordSpans[activeWi], wordProgress);
                  }
                } else {
                  let activeWordIdx = -1;
                  for (let i = 0; i < lineData.words.length; i++) {
                    const w = lineData.words[i];
                    const wTime = (w.start != null ? w.start * 1000 : w.timeMs) || 0;
                    if (wTime <= syncProgress) {
                      activeWordIdx = i;
                    } else {
                      break;
                    }
                  }

                  let currentActiveWord = activeWordIdx;
                  if (activeWordIdx >= 0) {
                    const curW = lineData.words[activeWordIdx];
                    const wStart = (curW.start != null ? curW.start * 1000 : curW.timeMs) || 0;
                    const nextW = lineData.words[activeWordIdx + 1];
                    const nextWStart = nextW
                      ? ((nextW.start != null ? nextW.start * 1000 : nextW.timeMs) || (wStart + 500))
                      : Infinity;
                    const wEnd = getLyricWordEndMs(lineData.words, activeWordIdx, lineData, activeIndex);
                    if (syncProgress >= wEnd && syncProgress < nextWStart) {
                      currentActiveWord = -1;
                    }
                  }

                  const stateKey = `${activeWordIdx}_${currentActiveWord}`;
                  if (activeEl.dataset.activeWord !== stateKey) {
                    activeEl.dataset.activeWord = stateKey;
                    wordSpans.forEach((span, wi) => {
                      const isCompleted = wi < activeWordIdx || (wi === activeWordIdx && currentActiveWord === -1);
                      const isActive = wi === currentActiveWord;
                      const isUpcoming = wi > activeWordIdx;
                      span.classList.toggle('lyric-word-completed', isCompleted);
                      span.classList.toggle('lyric-word-passed', isCompleted);
                      span.classList.toggle('lyric-word-active', isActive);
                      span.classList.toggle('lyric-word-upcoming', isUpcoming);
                      if (!isActive) {
                        delete span._lastProgressValue;
                        delete span._lastProgressPercent;
                        span.style.removeProperty('--word-progress');
                        span.style.removeProperty('--word-progress-percent');
                      }
                    });
                  }
                  activeEl._activeWordIdx = currentActiveWord;

                  if (currentActiveWord >= 0 && lineData.words[currentActiveWord] && wordSpans[currentActiveWord]) {
                    const activeW = lineData.words[currentActiveWord];
                    const wStart = (activeW.start != null ? activeW.start * 1000 : activeW.timeMs) || 0;
                    const nextW = lineData.words[currentActiveWord + 1];
                    const nextWStart = nextW
                      ? ((nextW.start != null ? nextW.start * 1000 : nextW.timeMs) || (wStart + 500))
                      : getLyricWordEndMs(lineData.words, currentActiveWord, lineData, activeIndex);
                    const wEnd = getLyricWordEndMs(lineData.words, currentActiveWord, lineData, activeIndex);
                    const wDur = Math.max(50, wEnd - wStart);
                    const rawProgress = Math.min(1, Math.max(0, (syncProgress - wStart) / wDur));
                    const prevProg = (wordSpans[currentActiveWord]?._lastProgressValue !== undefined)
                      ? wordSpans[currentActiveWord]._lastProgressValue
                      : parseFloat(wordSpans[currentActiveWord]?.style.getPropertyValue('--word-progress') || '0');
                    const wordProgress = (isPlaying && rawProgress < prevProg) ? prevProg : rawProgress;
                    setLyricWordProgress(wordSpans[currentActiveWord], wordProgress);
                  }
                }
              }
            }
          }
        } else {
          if (activeLineIndex >= 0 && cachedLineEls[activeLineIndex]) {
            cachedLineEls[activeLineIndex].classList.remove('active', 'nearby-1');
          }
          activeLineIndex = activeIndex;
        }

        // Update Dynamic Island lyric line with smart synchronization & playhead gating
        try {
          if (isDynamicIslandMode && !isIslandSleeping) {
            const islandSync = getDynamicIslandSyncData(syncProgress);
            const countdownSec = islandSync.countdownMs > 0 ? Math.ceil(islandSync.countdownMs / 1000) : 0;
            const trackKey = (currentTrackId || (currentPlayingTrackObj && currentPlayingTrackObj.id) || (widgetTrackName && widgetTrackName.textContent ? widgetTrackName.textContent.trim() : '') || 'default');
            const isLineChanged = islandSync.lineIndex !== _lastPlayheadIslandLineIndex;
            const isCountdownChanged = countdownSec !== _lastPlayheadIslandCountdownSec;
            const isTrackChanged = trackKey !== _lastPlayheadIslandTrackKey;

            if (isLineChanged || isCountdownChanged || isTrackChanged) {
              _lastPlayheadIslandLineIndex = islandSync.lineIndex;
              _lastPlayheadIslandCountdownSec = countdownSec;
              _lastPlayheadIslandTrackKey = trackKey;
              updateDynamicIslandLyric(islandSync.lineIndex, islandSync.lineData, syncProgress, islandSync.isInstrumental, islandSync.countdownMs);
            } else if (islandSync.lineIndex < 0) {
              // Gated fast-path for idle / break ticks: skip redundant string parsing, marquee checks, and DOM innerHTML/dataset writes
              updateDynamicIslandBreakTick(islandSync.countdownMs, syncProgress, islandSync.isInstrumental, islandSync.lineIndex);
            } else {
              // Focused lightweight word-progress and panning update for intra-line ticks
              window._lastPlayheadIslandTickTime = performance.now();
              updateDynamicIslandWordProgressTick(islandSync.lineIndex, islandSync.lineData, syncProgress);
            }
          }
        } catch (err) {
          console.warn("[DynamicIsland] Error updating lyric line:", err);
        }

        // Update taskbar lyric line in Taskbar Mode
        if (settings.taskbarMode && tbLyricLine) {
          if (isIntroPrelude) {
            const trackTitle = (currentPlayingTrackObj && (currentPlayingTrackObj.name || currentPlayingTrackObj.title)) || '';
            const countdownSec = Math.ceil(Math.max(0, firstLineStart - syncProgress) / 1000);
            const introMsg = (countdownSec > 0 && countdownSec <= 10) ? `Intro (${countdownSec}s)` : (trackTitle || "•••");
            if (tbLyricLine.textContent !== introMsg) {
              tbLyricLine.textContent = introMsg;
              tbLyricLine.dataset.lineIndex = -1;
              sendTaskbarLyric(introMsg);
            }
          } else if (isInstrumentalBreak) {
            const nextL = lyrics[activeIndex + 1];
            const nextStart = (nextL.timeMs != null ? nextL.timeMs : (nextL.start != null ? nextL.start * 1000 : 0)) || 0;
            const msUntilNext = Math.max(0, nextStart - syncProgress);
            const countdownSec = Math.ceil(msUntilNext / 1000);
            const breakMsg = (countdownSec > 0 && countdownSec <= 12) ? `Instrumental (${countdownSec}s)` : "Instrumental Break";
            if (tbLyricLine.textContent !== breakMsg) {
              tbLyricLine.textContent = breakMsg;
              tbLyricLine.dataset.lineIndex = -2;
              sendTaskbarLyric(breakMsg);
            }
          } else if (isUnsynced) {
            if (tbLyricLine.textContent !== "Unsynced lyrics") {
              tbLyricLine.textContent = "Unsynced lyrics";
              tbLyricLine.dataset.lineIndex = -1;
              sendTaskbarLyric("Unsynced lyrics");
            }
          } else if (lyrics[activeIndex]) {
            const lineData = lyrics[activeIndex];
            const hasRealWordTiming = lineData.words && lineData.words.length > 0;

            if ((settings.wordByWord !== false) && hasRealWordTiming) {
              // Render word-by-word spans for taskbar if not already rendered for this line
              const taskbarLineChanged = tbLyricLine.dataset.lineIndex !== String(activeIndex);
              if (taskbarLineChanged) {
                tbLyricLine.innerHTML = '';
                tbLyricLine.dataset.lineIndex = activeIndex;
                tbLyricLine._lastTbStates = null;
                tbLyricLine.dataset.activeTbWord = '';

                // Keep syllables flush together and preserve spaces between timed words.
                const words = lineData.words;
                const tbLineText = cleanLyricText(lineData.text || '');
                appendTimedWordSpans(tbLyricLine, words, tbLineText, 'lyric-word tb-lyric-word', null);
                tbLyricLine._cachedWordSpans = null; // Clear cache when rebuilding
              }

              if (!tbLyricLine._cachedWordSpans) {
                tbLyricLine._cachedWordSpans = tbLyricLine.querySelectorAll('.tb-lyric-word');
              }

              // Apply highlight classes to taskbar words
              const engine = window.LyricsService?.instance?.engine;
              let tbWordStates = null;
              if (engine && engine.hasLyrics()) {
                tbWordStates = engine.getLineWordStates(activeIndex, syncProgress / 1000);
              }

              const tbSpans = tbLyricLine._cachedWordSpans;
              if (tbWordStates && tbSpans && tbWordStates.length === tbSpans.length) {
                const tbKey = tbWordStates.join(',');
                if (tbLyricLine._lastTbStates !== tbKey) {
                  tbLyricLine._lastTbStates = tbKey;
                  tbSpans.forEach((span, wi) => {
                    const st = tbWordStates[wi] || 'upcoming';
                    span.classList.toggle('lyric-word-completed', st === 'completed');
                    span.classList.toggle('lyric-word-passed', st === 'completed');
                    span.classList.toggle('lyric-word-active', st === 'active');
                    span.classList.toggle('lyric-word-upcoming', st === 'upcoming');
                  });
                  // Replace taskbar markup once per line; later frames only send
                  // compact word states so WebView2 doesn't rebuild the lyric DOM.
                  sendTaskbarLyric(tbLyricLine.textContent, false,
                    taskbarLineChanged ? tbLyricLine.innerHTML : null,
                    taskbarLineChanged ? null : tbWordStates);
                }
              } else {
                let activeWordIdx = -1;
                for (let i = 0; i < lineData.words.length; i++) {
                  const w = lineData.words[i];
                  const wTime = (w.start != null ? w.start * 1000 : w.timeMs) || 0;
                  if (wTime <= syncProgress) {
                    activeWordIdx = i;
                  } else {
                    break;
                  }
                }

                let currentActiveWord = activeWordIdx;
                if (activeWordIdx >= 0) {
                  const curW = lineData.words[activeWordIdx];
                  const wStart = (curW.start != null ? curW.start * 1000 : curW.timeMs) || 0;
                  const nextW = lineData.words[activeWordIdx + 1];
                  const nextWStart = nextW
                    ? ((nextW.start != null ? nextW.start * 1000 : nextW.timeMs) || (wStart + 500))
                    : Infinity;
                  const wEnd = getLyricWordEndMs(lineData.words, activeWordIdx, lineData, activeIndex);
                  if (syncProgress >= wEnd && syncProgress < nextWStart) {
                    currentActiveWord = -1;
                  }
                }

                const tbStateKey = `${activeWordIdx}_${currentActiveWord}`;
                if (tbLyricLine.dataset.activeTbWord !== tbStateKey) {
                  tbLyricLine.dataset.activeTbWord = tbStateKey;
                  if (tbSpans) {
                    tbSpans.forEach((span, wi) => {
                      const isCompleted = wi < activeWordIdx || (wi === activeWordIdx && currentActiveWord === -1);
                      const isActive = wi === currentActiveWord;
                      const isUpcoming = wi > activeWordIdx;
                      span.classList.toggle('lyric-word-completed', isCompleted);
                      span.classList.toggle('lyric-word-passed', isCompleted);
                      span.classList.toggle('lyric-word-active', isActive);
                      span.classList.toggle('lyric-word-upcoming', isUpcoming);
                    });
                  }
                  const fallbackStates = Array.from(tbSpans || [], (span) =>
                    span.classList.contains('lyric-word-active') ? 'active' :
                    span.classList.contains('lyric-word-completed') ? 'completed' : 'upcoming');
                  sendTaskbarLyric(tbLyricLine.textContent, false,
                    taskbarLineChanged ? tbLyricLine.innerHTML : null,
                    taskbarLineChanged ? null : fallbackStates);
                }
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
    if (lyrics.length === 0) {
      try {
        if (isDynamicIslandMode && !isIslandSleeping) {
          updateDynamicIslandLyric(-1, null, currentProgress, false);
        }
      } catch (_) {}
    }

    // Track End "Next Up" Display (< 6 Seconds) for Desktop Window
    if (isPlaying && trackDuration > 0) {
      const syncProg = getAcousticSyncProgress();
      const remainingMs = trackDuration - syncProg;
      if (remainingMs <= 6000 && remainingMs > 0) {
        if (nextUpTriggeredTrackId !== currentTrackId) {
          nextUpTriggeredTrackId = currentTrackId;
          const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
          triggerNextUpPreview(currentPlayingTrackObj || currentTrack, remainingSec);
        }
      } else if (remainingMs > 7000) {
        nextUpTriggeredTrackId = null;
      }
    }

    if (isKineticMode && kineticRendererInstance) {
      kineticRendererInstance.syncPlaybackTime(currentProgress);
    }

    const isCinematicWallpaperActive = Boolean(settings.wallpaperMode && ((settings.wallpaperStyle || 'cinematic') === 'cinematic'));
    if (cinematicMainRendererInstance && !settings.wallpaperMode && !settings.taskbarMode && !isDynamicIslandMode && document.visibilityState !== 'hidden') {
      if (isCinematicView) {
        const syncProgress = getAcousticSyncProgress();
        cinematicMainRendererInstance.syncPlaybackTime(syncProgress);
      }
    } else if (cinematicMainRendererInstance && isCinematicWallpaperActive && !settings.taskbarMode && !isDynamicIslandMode) {
      if (isWallpaperDesktopFocused) {
        const syncProgress = getAcousticSyncProgress();
        cinematicMainRendererInstance.syncPlaybackTime(syncProgress);
      }
    }
    if (isCinematicView || isCinematicWallpaperActive) {
      updateCinematicLyricsFallback(getAcousticSyncProgress());
    }

    // Last.fm Progress check for scrobbling (throttled to ~1Hz)
    if (settingsPanel?.classList.contains('open')) updateLyricsDiagnostics();
    if (window.lastFM && (!window._lastFmCheckTime || (Date.now() - window._lastFmCheckTime > 1000))) {
      window._lastFmCheckTime = Date.now();
      window.lastFM.updatePlaybackProgress(currentProgress, trackDuration);
    }
  } catch (err) {
    console.error("Error in updatePlayhead loop:", err);
  } finally {
    if (isPlaying) {
      if (document.visibilityState !== 'hidden') {
        if (settings.taskbarMode) {
          playheadTimerId = setTimeout(updatePlayhead, TASKBAR_PLAYHEAD_INTERVAL_MS);
        } else {
          requestAnimationFrame(updatePlayhead);
        }
      } else {
        // Window is hidden: check if visual modes that require high-frequency updates are active
        const requiresHighFreqTick = Boolean(typeof settings !== 'undefined' && (settings.taskbarMode || isDynamicIslandMode || (settings.wallpaperMode && isWallpaperDesktopFocused)));
        playheadTimerId = setTimeout(updatePlayhead, requiresHighFreqTick ? 25 : PLAYHEAD_FRAME_INTERVAL_MS);
      }
    } else {
      isPlayheadLoopActive = false;
      stopPlaybackInterpolation();
    }
    if (isPlaying && playbackInterpolationRafId === null && playbackInterpolationTimerId === null) {
      schedulePlaybackInterpolation();
    }
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === 'hidden') {
    if (typeof stopPlaybackInterpolation === 'function') {
      stopPlaybackInterpolation();
    }
    const isPlaybackActive = Boolean(isPlaying);
    if (!isPlaybackActive && !settings.wallpaperMode && !isDynamicIslandMode && !settings.taskbarMode) {
      pauseAnimatedArtVideos();
    }
    if (!isPlaybackActive && typeof updateMemoryTargetLevel === 'function') {
      updateMemoryTargetLevel('low');
    }
    if (typeof fluidMeshGradientInstance !== 'undefined' && fluidMeshGradientInstance) {
      fluidMeshGradientInstance.stop();
    }
    if (cinematicMainRendererInstance && cinematicMainRendererInstance.isPlaying) {
      cinematicMainRendererInstance._wasPlayingBeforeHide = true;
      cinematicMainRendererInstance.pause();
    }
  } else {
    if (typeof schedulePlaybackInterpolation === 'function') {
      schedulePlaybackInterpolation();
    }
    if (typeof fluidMeshGradientInstance !== 'undefined' && fluidMeshGradientInstance && typeof shouldRunFluidMesh === 'function' && shouldRunFluidMesh()) {
      fluidMeshGradientInstance.wake?.();
      if (typeof fluidMeshGradientInstance.defrost === 'function') {
        fluidMeshGradientInstance.defrost();
      } else if (isPlaying || !fluidMeshGradientInstance.isSettled?.()) {
        fluidMeshGradientInstance.start();
      }
      if (window.currentDynamicPalette) {
        fluidMeshGradientInstance.setPalette(window.currentDynamicPalette);
      }
    }
    if (cinematicMainRendererInstance && cinematicMainRendererInstance._wasPlayingBeforeHide) {
      cinematicMainRendererInstance._wasPlayingBeforeHide = false;
      if (isPlaying && (isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === 'cinematic'))) {
        cinematicMainRendererInstance.play();
      }
    }
    if (isPlaying) {
      ensurePlayheadLoop();
    }
  }
  if (typeof syncAudioVisualizerState === 'function') {
    syncAudioVisualizerState();
  }
});



// Control Spotify Playback
async function controlPlayback(action, _retried = false) {
  // Optimistic UI toggle for instant user feedback
  if (action === 'play-pause') {
    if (isPlaying) {
      isPlaying = false;
    updateMemoryTargetLevel('low');
      if (cinematicMainRendererInstance) {
        cinematicMainRendererInstance.pause();
      }
    if (window.djEngine) {
      window.djEngine.cancelTransition();
    }
      lastPollProgress = currentProgress;
      lastPollTimestamp = getHighResTime();
      if (btnPlaySvg) btnPlaySvg.style.display = 'block';
      if (btnPauseSvg) btnPauseSvg.style.display = 'none';
      handleTaskbarPauseAutoHide(true);
      updateAutoHideState();
      if (typeof checkVisualizerFallback === 'function') checkVisualizerFallback();
    } else {
      isPlaying = true;
      lastPollProgress = currentProgress;
      lastPollTimestamp = getHighResTime();
      if (cinematicMainRendererInstance && (isCinematicView || (settings.wallpaperMode && settings.wallpaperStyle === 'cinematic'))) {
        cinematicMainRendererInstance.play();
      }
      if (btnPlaySvg) btnPlaySvg.style.display = 'none';
      if (btnPauseSvg) btnPauseSvg.style.display = 'block';
      ensurePlayheadLoop();
      handleTaskbarPauseAutoHide(false);
      updateAutoHideState();
      syncAudioVisualizerState();
    }
    syncDynamicIslandState();
    if (isPlaying) {
      resumeAnimatedArtVideos();
    } else {
      pauseAnimatedArtVideosForPlaybackStop();
    }
  }

  // Spotify Soloist sub-millisecond local transport control
  if (window.soloistProvider && window.soloistProvider.isConnected && window.soloistProvider.isSessionActive) {
    if (action === 'play-pause') {
      if (isPlaying) {
        window.soloistProvider.play();
      } else {
        window.soloistProvider.pause();
      }
    } else if (action === 'next') {
      window.soloistProvider.next();
    } else if (action === 'previous') {
      window.soloistProvider.previous();
    }
    return;
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
taskbarColorPollInterval = null;
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

let _inFlightArtPromises = new Map();

async function fetchFallbackAlbumArt(trackName, artistName, albumName = null) {
  if (!trackName) return null;
  const rawArtist = (artistName || "").replace(/\s*-\s*Topic$/i, "").trim();
  const rawTrack = trackName.trim();

  // Instant dual-key cache lookup (0ms)
  const dualKey = `${rawArtist}:::${rawTrack}`.toLowerCase().trim();
  if (localArtCache[dualKey] && localArtCache[dualKey] !== 'fetching' && localArtCache[dualKey] !== 'notfound') {
    return localArtCache[dualKey];
  }
  if (_inFlightArtPromises.has(dualKey)) {
    return await _inFlightArtPromises.get(dualKey);
  }

  const artPromise = (async () => {
    // 1. Scored Native Retrieval Pipeline (Spotify Web API album-art flow, iTunes, Deezer, NetEase)
    if (window.electronAPI && typeof window.electronAPI.fetchTrackArtwork === 'function') {
      try {
        const nativeArt = await window.electronAPI.fetchTrackArtwork(rawTrack, rawArtist, albumName);
        if (nativeArt) {
          saveArtToCache(null, nativeArt, rawTrack, rawArtist);
          return nativeArt;
        }
      } catch (e) {
        console.warn("[Artwork] Native fetchTrackArtwork error:", e);
      }
    }

    // 2. Verified Last.fm fallback (autocorrect disabled, candidate artist verified)
    if (window.lastFM && typeof window.lastFM.getTrackAlbumArt === 'function') {
      try {
        const lfmArt = await window.lastFM.getTrackAlbumArt(rawTrack, rawArtist);
        if (lfmArt) {
          saveArtToCache(null, lfmArt, rawTrack, rawArtist);
          return lfmArt;
        }
      } catch (e) {}
    }

    return null;
  })();

  _inFlightArtPromises.set(dualKey, artPromise);
  try {
    return await artPromise;
  } finally {
    _inFlightArtPromises.delete(dualKey);
  }
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
      } else if (res.status === 429) {
        // Rate-limited by Spotify edge, but token is authentic
        return true;
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
  if (!widgetAlbumArt.src || widgetAlbumArt.style.display === 'none') {
    setArtWithSparkle(widgetAlbumArt, artUrl);
    widgetAlbumArt.style.display = "block";
    if (widgetArtFallback) widgetArtFallback.style.display = "none";
    setWallpaperAlbumArt(artUrl);
    if (currentTrackId) {
      saveArtToCache(currentTrackId, artUrl);
    }
    updateDynamicArtColor(artUrl);
    currentStaticAlbumArtUrl = artUrl;
    const artModal = document.getElementById("album-art-modal");
    if (artModal && artModal.classList.contains("show")) {
      showAlbumArtModal();
    }
  }
};

if (typeof window !== 'undefined') {
  window.FONT_FAMILY_STACKS = FONT_FAMILY_STACKS;
  window.resolveFontStack = resolveFontStack;
  window.invalidateLyricMetrics = invalidateLyricMetrics;
  window.toggleDynamicIslandMode = toggleDynamicIslandMode;
  window.toggleWallpaperMode = toggleWallpaperMode;
  window.toggleTaskbarMode = toggleTaskbarMode;
  window.toggleKineticMode = toggleKineticMode;
  window.toggleCinematicView = toggleCinematicView;
  window.initCinematicMainStage = initCinematicMainStage;
  window.syncCinematicState = syncCinematicState;
  window.updateModeButtonsState = updateModeButtonsState;
  window.appendTimedWordSpans = appendTimedWordSpans;
  window.needsTimedWordSpace = needsTimedWordSpace;
  window.reconcileTimedWords = reconcileTimedWords;
  window.isWallpaperDesktopFocused = isWallpaperDesktopFocused;
  window.updateIslandQualityBadge = updateIslandQualityBadge;
  window.showIslandContextMenu = showIslandContextMenu;
  window.hideIslandContextMenu = hideIslandContextMenu;
  window.adjustSyncOffset = adjustSyncOffset;
  window.applyFreeIslandPosition = applyFreeIslandPosition;
  window.clearFreeIslandPosition = clearFreeIslandPosition;
  window.calculateMagneticSnap = calculateMagneticSnap;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FONT_FAMILY_STACKS,
    resolveFontStack,
    invalidateLyricMetrics,
    measureLyricMetrics,
    toggleDynamicIslandMode,
    toggleWallpaperMode,
    toggleTaskbarMode,
    toggleKineticMode,
    toggleCinematicView,
    initCinematicMainStage,
    syncCinematicState,
    updateModeButtonsState,
    appendTimedWordSpans,
    needsTimedWordSpace,
    reconcileTimedWords,
    isWallpaperDesktopFocused,
    updateIslandQualityBadge,
    showIslandContextMenu,
    hideIslandContextMenu,
    adjustSyncOffset,
    applyFreeIslandPosition,
    clearFreeIslandPosition,
    calculateMagneticSnap
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => bootstrapApp());
  } else {
    setTimeout(() => bootstrapApp(), 0);
  }
}

