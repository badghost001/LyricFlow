
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
let fluidMeshCanvas, selectBgStyle, sliderFluidSpeed, valFluidSpeed, settingFluidSpeedRow;
let fluidMeshGradientInstance = null;
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
let checkWordByWord;
let checkNeteaseWordByWord;
let checkFilterCredits;
let selectPreferredProvider;

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
  wallpaperMode: false,
  wallpaperStyle: 'style2',
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
  translateLang: 'en',
  skipLang: 'none',
  autoHideLyrics: false,
  autoHideTrigger: 'paused',
  autoHideAction: 'collapse',
  autoHideDelay: 3,
  preferredLyricProvider: 'auto',
  preferredLyricProviders: [],
  neteaseWordByWord: true,
  filterSongCredits: true,
  wordByWord: true,
  dynamicIslandMode: false,
  dynamicIslandPosition: 'top-center',
  islandVisualizerBars: 4,
  islandVisualizerStyle: 'bars',
  islandVocalCountdown: true,
  islandWheelGestures: true,
  islandTranslationMode: 'bilingual',
  islandInactivityTimeout: 30000,
  islandMetamorphosis: true,
  islandDuetSplit: true,
  islandBeatBloom: true,
  wallpaperBeatBloom: true,
  progressBarSeek: true,
  progressWheelSeek: true
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
let isScrubbingMainProgress = false;
let isScrubbingIslandProgress = false;
let lastUserSeekTimestamp = 0;
let lastUserSeekTargetMs = 0;

// Acoustic Lead Calibration (ms)
// Set to 0 so internal playhead matches exact acoustic track timestamps without racing ahead.
// Fine-tuning offset can still be adjusted by user via settings.syncOffsetMs.
const SPOTIFY_ACOUSTIC_LEAD_MS = 0;

function getAcousticSyncProgress() {
  return currentProgress + (settings.syncOffsetMs || 0) + SPOTIFY_ACOUSTIC_LEAD_MS;
}

function onTaskbarDragMove(e) {
  // No-op: drag movement is handled by main process cursor polling
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
  // Purge deprecated v1 cache which may contain unverified/mismatched artwork
  localStorage.removeItem('lyricflow_local_art_cache');
  const savedArt = localStorage.getItem('lyricflow_local_art_cache_v2');
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
    if (keys.length > 120) {
      delete localArtCache[keys[0]];
    }
    if (window.safeStorageSet) {
      window.safeStorageSet('lyricflow_local_art_cache_v2', JSON.stringify(localArtCache));
    } else {
      localStorage.setItem('lyricflow_local_art_cache_v2', JSON.stringify(localArtCache));
    }
  } catch (e) {}
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
  const englishPrefixRegex = /^\s*(written\s+by|lyrics?\s+by|composed?\s+by|produced?\s+by|arranged?\s+by|mixed?\s+by|mastered?\s+by|recorded?\s+by|engineered?\s+by|published?\s+by|released?\s+by|remixed?\s+by|performed?\s+by|songwriters?:|lyricists?:|composers?:|producers?:|arrangers?:|audio\s+engineers?:|mixing\s+engineers?:|mastering\s+engineers?:|vocal\s+producers?:)/i;
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

let isDynamicIslandMode = false;
let lastSpectrumBars = null;
let islandBoundsAnimFrame = null;

let lastPushedBounds = { x: -1, y: -1, width: -1, height: -1 };

function pushDynamicIslandBounds() {
  if (!isDynamicIslandMode) return;
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

function startDynamicIslandBoundsTracking(durationMs = 450) {
  if (islandBoundsAnimFrame) {
    cancelAnimationFrame(islandBoundsAnimFrame);
    islandBoundsAnimFrame = null;
  }
  const startTime = performance.now();
  function track(now) {
    pushDynamicIslandBounds();
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

function showIslandHud({ icon, text, percent, showBar = true }) {
  const overlay = document.getElementById("island-hud-overlay");
  const iconEl = document.getElementById("island-hud-icon");
  const textEl = document.getElementById("island-hud-text");
  const barBg = document.getElementById("island-hud-bar-bg");
  const barFill = document.getElementById("island-hud-bar-fill");

  if (!overlay || !iconEl || !textEl) return;

  if (islandHudTimeout) clearTimeout(islandHudTimeout);
  if (islandHudLeavingTimeout) clearTimeout(islandHudLeavingTimeout);

  overlay.classList.remove("is-leaving");
  overlay.style.display = "flex";

  iconEl.textContent = icon || "🔊";
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
    }, 200);
  }, 1200);
}

function setVisualizerBarCount(count) {
  const c = parseInt(count, 10) || 4;
  settings.islandVisualizerBars = c;
  const islandWave = document.getElementById("island-wave");
  if (islandWave) {
    islandWave.innerHTML = Array.from({ length: c }, (_, i) => `<span class="wave-bar bar-${i + 1}"></span>`).join("");
    lastSpectrumBars = islandWave.querySelectorAll(".wave-bar");
    applyIslandVisualizerStyle();
    if (typeof checkVisualizerFallback === 'function') {
      checkVisualizerFallback();
    }
  }
  const widthMap = { 4: '340px', 6: '355px', 8: '370px' };
  const compactWidth = widthMap[c] || '340px';
  document.documentElement.style.setProperty('--island-compact-width', compactWidth);
  const pausedWidthMap = { 4: '210px', 6: '220px', 8: '230px' };
  const pausedWidth = pausedWidthMap[c] || '210px';
  document.documentElement.style.setProperty('--island-paused-width', pausedWidth);
  setTimeout(pushDynamicIslandBounds, 50);
}

function applyDynamicIslandDockClass(dockPos) {
  const pos = dockPos || settings.dynamicIslandPosition || 'top-center';
  const allPositions = ['top-center', 'top-left', 'top-right', 'bottom-center'];
  allPositions.forEach(p => {
    document.body.classList.remove(`island-dock-${p}`);
  });
  if (isDynamicIslandMode) {
    document.body.classList.add(`island-dock-${pos}`);
    setTimeout(pushDynamicIslandBounds, 50);
  }
}

let lastAudioEnergyTimestamp = 0;
let isVisualizerResting = false;

function checkVisualizerFallback() {
  if (!isDynamicIslandMode || isIslandSleeping) return;
  const islandWave = document.getElementById("island-wave");
  if (!islandWave) return;
  const isAudioActive = Boolean(isPlaying) || document.body.classList.contains("is-playing");

  if (!isAudioActive) {
    if (isVisualizerResting) return;
    isVisualizerResting = true;
    if (islandWave.classList.contains("is-fallback")) {
      islandWave.classList.remove("is-fallback");
    }
    const bars = lastSpectrumBars || islandWave.querySelectorAll(".wave-bar");
    const visStyle = settings.islandVisualizerStyle || 'bars';
    bars.forEach(bar => {
      bar.style.transform = visStyle === 'dots' ? 'scale(0.8) translateY(0px)' : 'scaleY(0.14)';
    });
    return;
  }

  // Audio is actively playing; decay bars smoothly toward authentic resting baseline during quiet interludes
  const msSinceEnergy = Date.now() - lastAudioEnergyTimestamp;
  if (msSinceEnergy > 260) {
    if (isVisualizerResting) return;
    isVisualizerResting = true;
    const bars = lastSpectrumBars || islandWave.querySelectorAll(".wave-bar");
    const visStyle = settings.islandVisualizerStyle || 'bars';
    bars.forEach(bar => {
      if (visStyle === 'dots') {
        bar.style.transform = 'scale(0.8) translateY(0px)';
      } else {
        bar.style.transform = 'scaleY(0.14)';
      }
    });
  }
}

// Low-overhead watchdog ensuring bars smoothly settle to resting baseline during quiet passages
setInterval(checkVisualizerFallback, 140);

// Audio-Reactive Spectrum Equalizer Listener (Real Windows Loopback WASAPI Data)
let hasLoggedSpectrumTelemetry = false;
if (window.electronAPI && typeof window.electronAPI.onAudioSpectrum === 'function') {
  window.electronAPI.onAudioSpectrum((bands) => {
    if (!Array.isArray(bands) || bands.length === 0) return;
    // Execution Gating: if neither Dynamic Island nor Wallpaper Beat Bloom is active, skip all DOM processing
    if (!isDynamicIslandMode && (!settings.wallpaperMode || settings.wallpaperBeatBloom === false)) return;

    const islandWave = isDynamicIslandMode ? document.getElementById("island-wave") : null;
    if (isDynamicIslandMode && !islandWave) return;

    if (!hasLoggedSpectrumTelemetry) {
      hasLoggedSpectrumTelemetry = true;
      console.log('[LF-SPECTRUM] Live WASAPI audio spectrum active. Sample bands:', JSON.stringify(bands.map(b => Number(b.toFixed(3)))));
    }

    let bars = null;
    if (islandWave) {
      if (!lastSpectrumBars || lastSpectrumBars.length !== (settings.islandVisualizerBars || 4)) {
        lastSpectrumBars = islandWave.querySelectorAll(".wave-bar");
      }
      bars = lastSpectrumBars;
    }

    const isAudioActive = Boolean(isPlaying) || document.body.classList.contains("is-playing");
    if (!isAudioActive) {
      if (islandWave && bars) {
        if (islandWave.classList.contains("is-fallback")) {
          islandWave.classList.remove("is-fallback");
        }
        const visStyle = settings.islandVisualizerStyle || 'bars';
        bars.forEach(bar => {
          bar.style.transform = visStyle === 'dots' ? 'scale(0.8) translateY(0px)' : 'scaleY(0.14)';
        });
      }
      if (isDynamicIslandMode) updateIslandEnergyMorph([0, 0, 0, 0]);
      if (settings.wallpaperMode) updateWallpaperLyricBeatBloom(0);
      return;
    }

    // Check if bands contain non-zero audio energy (> 0.002 noise floor)
    const hasEnergy = bands.some(b => typeof b === 'number' && b > 0.002);
    if (!hasEnergy) {
      checkVisualizerFallback();
      if (isDynamicIslandMode) updateIslandEnergyMorph([0, 0, 0, 0]);
      if (settings.wallpaperMode) updateWallpaperLyricBeatBloom(0);
      return;
    }

    isVisualizerResting = false;

    lastAudioEnergyTimestamp = Date.now();
    if (islandWave.classList.contains("is-fallback")) {
      islandWave.classList.remove("is-fallback");
    }

    const barCount = bars.length;
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

    // Dynamic Island Metamorphosis Energy Morphing
    updateIslandEnergyMorph(bands);

    // Apple-Style Wallpaper Lyric Beat Bloom
    const subBass = Math.max((bands && bands[0]) || 0, (bands && bands[1]) || 0);
    updateWallpaperLyricBeatBloom(subBass);
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
    requestAnimationFrame(() => {
      textElement.classList.add('is-overflowing');
    });
  } else {
    textElement.style.removeProperty('--marquee-dist');
    textElement.style.removeProperty('--marquee-dur');
  }
}

function syncDynamicIslandState() {
  const isPlayingActive = Boolean(isPlaying);
  document.body.classList.toggle('is-playing', isPlayingActive);
  document.body.classList.toggle('app-paused', !isPlayingActive);

  const dynamicIslandEl = document.getElementById("dynamic-island");
  if (dynamicIslandEl) {
    dynamicIslandEl.classList.toggle('island-paused', !isPlayingActive);
  }

  const islandPlayIcon = document.getElementById("island-icon-play");
  const islandPauseIcon = document.getElementById("island-icon-pause");
  if (islandPlayIcon && islandPauseIcon) {
    islandPlayIcon.style.display = isPlayingActive ? 'none' : 'block';
    islandPauseIcon.style.display = isPlayingActive ? 'block' : 'none';
  }

  const islandArtImg = document.getElementById("island-art-img");
  if (islandArtImg) {
    const artUrl = (widgetAlbumArt && widgetAlbumArt.src && widgetAlbumArt.style.display !== 'none')
      ? widgetAlbumArt.src
      : (currentStaticAlbumArtUrl || (widgetAlbumArt && widgetAlbumArt.src ? widgetAlbumArt.src : ''));
    if (artUrl && islandArtImg.src !== artUrl) {
      islandArtImg.src = artUrl;
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

  if (!isScrubbingIslandProgress) {
    const fill = document.getElementById("island-progress-fill");
    const thumb = document.getElementById("island-progress-thumb");
    const timeCurrent = document.getElementById("island-time-current");
    const timeRemaining = document.getElementById("island-time-remaining");
    if (trackDuration > 0) {
      const curMs = Math.max(0, Math.min(trackDuration, currentProgress || 0));
      const pct = Math.min(100, Math.max(0, (curMs / trackDuration) * 100));
      if (fill && fill.style.width !== `${pct}%`) fill.style.width = `${pct}%`;
      if (thumb && thumb.style.left !== `${pct}%`) thumb.style.left = `${pct}%`;
      if (timeCurrent && typeof formatTime === 'function') {
        const text = formatTime(curMs);
        if (timeCurrent.textContent !== text) timeCurrent.textContent = text;
      }
      if (timeRemaining && typeof formatTime === 'function') {
        const text = '-' + formatTime(Math.max(0, trackDuration - curMs));
        if (timeRemaining.textContent !== text) timeRemaining.textContent = text;
      }
    }
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

  // 2. Song intro / prelude before first vocal line starts (exact 0ms real-time sync)
  if (syncProgress < firstLineStart) {
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
          ? (lastW.end * 1000)
          : (lastW.durationMs ? lwStart + lastW.durationMs : (lastW.duration ? lwStart + lastW.duration : (lwStart + 450))));
      end = Math.max(lwEnd, lwStart + 450);
    } else if (line.end != null && line.end > 0) {
      end = line.end * 1000;
    } else if (line.duration && line.duration > 0) {
      end = start + line.duration;
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
    const sNext = lyrics[lastIdx + 1] ? getLineStart(lyrics[lastIdx + 1]) : Infinity;
    if (syncProgress >= s0 && syncProgress < sNext) {
      idx = lastIdx;
      found = true;
    } else if (lyrics[lastIdx + 1] && syncProgress >= sNext) {
      const sNext2 = lyrics[lastIdx + 2] ? getLineStart(lyrics[lastIdx + 2]) : Infinity;
      if (syncProgress < sNext2) {
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
  // Only trigger break if gap to next line is significant (>= 6.5s) AND there are at least 2.5s of instrumental silence after line dwell
  const isPastLine = syncProgress > curTiming.end + 1200;

  if (isPastLine && idx < lyrics.length - 1 && isFinite(curTiming.nextStart)) {
    const totalGap = curTiming.nextStart - curTiming.start;
    const breakDuration = curTiming.nextStart - (curTiming.end + 1200);
    const msUntilNext = curTiming.nextStart - syncProgress;
    // Only show instrumental break if it's a real musical interlude (>= 6.5s gap and >= 2.5s silence)
    // and stay in break until the next line starts (msUntilNext > 0)
    if (totalGap >= 6500 && breakDuration >= 2500 && msUntilNext > 0) {
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
  if (duetSplit.type === 'parenthetical') {
    const firstWordText = (words[0].text || words[0].word || '').trim();
    if (!firstWordText.startsWith('(') && !firstWordText.startsWith('[')) {
      const leadWords = [];
      for (let i = 0; i < words.length; i++) {
        const wt = (words[i].text || words[i].word || '').trim();
        if (wt.startsWith('(') || wt.startsWith('[')) {
          break;
        }
        leadWords.push(words[i]);
      }
      return leadWords.length > 0 ? leadWords : words;
    } else {
      let pastParen = false;
      const leadWords = [];
      for (let i = 0; i < words.length; i++) {
        const wt = (words[i].text || words[i].word || '').trim();
        if (pastParen) {
          leadWords.push(words[i]);
        } else if (wt.includes(')') || wt.includes(']')) {
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
function getWallpaperLyricsElement() {
  return document.getElementById('lyrics-container');
}
function setStylePropertyIfChanged(element, property, value) {
  if (element && element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
}
function updateWallpaperLyricBeatBloom(subBass) {
  const lyricsEl = getWallpaperLyricsElement();
  if (!settings.wallpaperMode || settings.wallpaperBeatBloom === false || !isPlaying) {
    smoothedWallpaperBloom = 0;
    if (lastWallpaperBloomState) {
      lastWallpaperBloomState = false;
      document.body.classList.remove('has-beat-bloom');
      if (lyricsEl) {
        lyricsEl.style.removeProperty('--wb-bloom-glow');
        lyricsEl.style.removeProperty('--wb-bloom-alpha');
        lyricsEl.style.removeProperty('--wb-beat-scale');
      }
    }
    return;
  }

  // Audio peak envelope: instantaneous attack on bass kicks, exponential decay (~150ms release)
  let currentSub = (typeof subBass === 'number' && !isNaN(subBass)) ? Math.max(0, subBass) : 0;

  // Fallback pulse generator: if WASAPI audio loopback is silent/unrouted (>1.2s without audio packet)
  // synthesize a smooth rhythmic beat pulse in sync with the song playback timeline
  if (currentSub < 0.05 && isPlaying && (Date.now() - lastAudioEnergyTimestamp > 1200)) {
    const beatPhase = (currentProgress % 500); // 120 bpm pulse cadence
    if (beatPhase < 140) {
      currentSub = 0.55 * (1.0 - (beatPhase / 140));
    }
  }

  if (currentSub > smoothedWallpaperBloom) {
    smoothedWallpaperBloom = currentSub;
  } else {
    smoothedWallpaperBloom = smoothedWallpaperBloom * 0.84;
  }

  const triggerThreshold = 0.20;
  if (smoothedWallpaperBloom > triggerThreshold) {
    if (!lastWallpaperBloomState) document.body.classList.add('has-beat-bloom');
    lastWallpaperBloomState = true;
    const norm = Math.min(1.0, (smoothedWallpaperBloom - triggerThreshold) / (1.0 - triggerThreshold));
    const glowRadius = Math.round(norm * 22 + 10); // 10px to 32px
    const glowAlpha = (0.45 + norm * 0.45).toFixed(2); // 0.45 to 0.90
    const scaleBump = (1.025 + norm * 0.035).toFixed(3); // 1.025 to 1.060

    if (lyricsEl) {
      setStylePropertyIfChanged(lyricsEl, '--wb-bloom-glow', `${glowRadius}px`);
      setStylePropertyIfChanged(lyricsEl, '--wb-bloom-alpha', glowAlpha);
      setStylePropertyIfChanged(lyricsEl, '--wb-beat-scale', scaleBump);
    }
  } else if (lastWallpaperBloomState) {
    lastWallpaperBloomState = false;
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
function updateIslandEnergyMorph(bands) {
  if (!isDynamicIslandMode || isIslandSleeping) return;

  const islandEl = document.getElementById("dynamic-island");
  if (!islandEl) return;

  if (!settings.islandMetamorphosis) {
    if (lastAppliedMorphTier !== null) {
      document.body.classList.remove('island-morph-calm', 'island-morph-groove', 'island-morph-climax', 'island-morph-solo');
      lastAppliedMorphTier = null;
    }
    islandEl.style.removeProperty('--island-bloom-radius');
    islandEl.style.removeProperty('--island-bloom-alpha');
    islandEl.style.removeProperty('box-shadow');
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
  if (settings.islandBeatBloom) {
    if (subBass > smoothedIslandBloom) {
      smoothedIslandBloom = subBass;
    } else {
      smoothedIslandBloom = smoothedIslandBloom * 0.86;
    }

    if (smoothedIslandBloom > 0.60) {
      const norm = Math.min(1.0, (smoothedIslandBloom - 0.60) / 0.40);
      const bloomRadius = Math.round(norm * 24 + 10);
      const bloomAlpha = Math.min(0.75, (0.30 + norm * 0.45)).toFixed(2);
      setStylePropertyIfChanged(islandEl, '--island-bloom-radius', `${bloomRadius}px`);
      setStylePropertyIfChanged(islandEl, '--island-bloom-alpha', bloomAlpha);
    } else {
      if (islandEl.style.getPropertyValue('--island-bloom-radius')) islandEl.style.removeProperty('--island-bloom-radius');
      if (islandEl.style.getPropertyValue('--island-bloom-alpha')) islandEl.style.removeProperty('--island-bloom-alpha');
    }
  } else {
    if (islandEl.style.getPropertyValue('--island-bloom-radius')) islandEl.style.removeProperty('--island-bloom-radius');
    if (islandEl.style.getPropertyValue('--island-bloom-alpha')) islandEl.style.removeProperty('--island-bloom-alpha');
    smoothedIslandBloom = 0;
  }

  // Tier classification with 350ms hysteresis
  const now = Date.now();
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

function checkDynamicIslandInactivity() {
  if (!isDynamicIslandMode) return;
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

  const ambientColor = (typeof getComputedStyle === 'function' && document.documentElement)
    ? (getComputedStyle(document.documentElement).getPropertyValue('--ambient-glow-color').trim() || '#38bdf8')
    : '#38bdf8';

  if (sat && sat.style.display !== 'none' && window.caEmitterLayer) {
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

  if (pri && window.caEmitterLayer) {
    window.caEmitterLayer.vaporize(pri, () => {
      document.body.classList.add("island-sleeping");
      if (window.electronAPI && window.electronAPI.updateIslandBounds) {
        window.electronAPI.updateIslandBounds({ x: 0, y: 0, width: 0, height: 0 });
      }
    }, { ambientColor });
  } else if (pri) {
    document.body.classList.add("island-sleeping");
    if (window.electronAPI && window.electronAPI.updateIslandBounds) {
      window.electronAPI.updateIslandBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
  }
}

function wakeDynamicIsland() {
  lastPlaybackActivityMs = Date.now();
  const wasSleeping = isIslandSleeping || document.body.classList.contains("island-sleeping");
  if (!wasSleeping) {
    return;
  }
  isIslandSleeping = false;
  lastSatelliteActiveState = false;
  document.body.classList.remove("island-sleeping");
  const pri = document.getElementById("dynamic-island");
  if (pri) {
    pri.style.display = '';
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

function updateDynamicIslandLyric(targetIndex, lineData, syncProgress, isInstrumental = false, countdownMs = 0) {
  if (isIslandSleeping) return;
  if (isPlaying) {
    lastPlaybackActivityMs = Date.now();
  }

  lastIslandSyncData = {
    lineIndex: targetIndex,
    lineData: lineData,
    syncProgress: syncProgress,
    isInstrumental: Boolean(isInstrumental || targetIndex === -2),
    countdownMs: countdownMs
  };

  const islandLine = document.getElementById("island-lyric-line");
  const islandSubline = document.getElementById("island-lyric-subline");
  const islandExpLyric = document.getElementById("island-expanded-lyric");
  const dynamicIslandEl = document.getElementById("dynamic-island");
  const btnTranslate = document.getElementById("island-btn-translate");
  const satIsland = document.getElementById("dynamic-island-translation");
  const satBridge = document.getElementById("island-bridge");
  const satText = document.getElementById("island-satellite-text");
  const satLang = document.getElementById("island-satellite-lang");
  const satMarqueeWrapper = document.getElementById("island-satellite-marquee-wrapper");

  if (!islandLine) return;

  // 1. Scrubber time elapsed & remaining + fill & thumb
  if (!isScrubbingIslandProgress) {
    const fill = document.getElementById("island-progress-fill");
    const thumb = document.getElementById("island-progress-thumb");
    const timeCurrent = document.getElementById("island-time-current");
    const timeRemaining = document.getElementById("island-time-remaining");
    if (trackDuration > 0) {
      const curMs = Math.max(0, Math.min(trackDuration, syncProgress || 0));
      const pct = Math.min(100, Math.max(0, (curMs / trackDuration) * 100));
      if (fill) fill.style.width = `${pct}%`;
      if (thumb) thumb.style.left = `${pct}%`;
      if (timeCurrent && typeof formatTime === 'function') {
        const curStr = formatTime(curMs);
        if (timeCurrent.textContent !== curStr) timeCurrent.textContent = curStr;
      }
      if (timeRemaining && typeof formatTime === 'function') {
        const remStr = '-' + formatTime(Math.max(0, trackDuration - curMs));
        if (timeRemaining.textContent !== remStr) timeRemaining.textContent = remStr;
      }
    }
  }

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
      idleHtml = `<span class="island-idle-text"><span class="island-idle-title">${escapeHTML(trackTitle)}</span>${trackArtist ? ` • <span class="island-track-artist">${escapeHTML(trackArtist)}</span>` : ''}</span>`;
      expText = trackArtist ? `${trackTitle} • ${trackArtist}` : trackTitle;
    } else if (isOutro) {
      const showCountdown = countdownMs >= 1000;
      const countdownSec = showCountdown ? Math.ceil(countdownMs / 1000) : 0;
      if (showCountdown && countdownSec > 0) {
        idleHtml = `<span class="island-idle-text"><span class="island-countdown-pill island-nextup-pill"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg> Next up in ${countdownSec}s</span> • <span class="island-idle-title">${escapeHTML(trackTitle)}</span></span>`;
        expText = `${trackTitle} • Next up in ${countdownSec}s`;
      } else {
        idleHtml = `<span class="island-idle-text"><span class="island-idle-title">${escapeHTML(trackTitle)}</span>${trackArtist ? ` • ${escapeHTML(trackArtist)}` : ''}</span>`;
        expText = trackTitle;
      }
    } else {
      const showCountdown = countdownMs >= 1500 && settings.islandVocalCountdown !== false;
      const countdownSec = showCountdown ? Math.ceil(countdownMs / 1000) : 0;

      if (showCountdown && countdownSec > 0) {
        idleHtml = `<span class="island-idle-text"><span class="island-countdown-pill island-vocal-pill"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg> Vocals in ${countdownSec}s</span> • <span class="island-idle-title">${escapeHTML(trackTitle)}</span></span>`;
        expText = `${trackTitle} • Vocals in ${countdownSec}s`;
      } else if (isBreak) {
        idleHtml = `<span class="island-idle-text"><span class="island-idle-title">${escapeHTML(trackTitle)}</span> • <span class="island-instrumental-dots">♪ ♪ ♪</span></span>`;
        expText = `${trackTitle} • Instrumental`;
      } else {
        const hasNoLyrics = (!lyrics || lyrics.length === 0) && currentTrackId;
        if (hasNoLyrics) {
          idleHtml = `<span class="island-idle-text"><span class="island-idle-title">${escapeHTML(trackTitle)}</span> • <span class="island-no-lyrics-hint" title="No lyrics found - Click ↻ or right-click to search alternatives">No lyrics (Click ↻)</span></span>`;
          expText = `${trackTitle} • No lyrics found (Click ↻ to refetch)`;
        } else {
          idleHtml = `<span class="island-idle-text"><span class="island-idle-title">${escapeHTML(trackTitle)}</span>${trackArtist ? ` • ${escapeHTML(trackArtist)}` : ''}</span>`;
          expText = trackTitle;
        }
      }
    }

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
  const duetSplit = isDuetEligible ? parseDuetVocalSplit(lineData.text) : null;

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
  const isStackedMode = (!shouldSatelliteBeDocked && transMode === 'stacked' && hasTrans);
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
  const activeWords = duetSplit ? getLeadWordsForDuet(lineData.words, duetSplit) : lineData.words;
  const isDuetActive = Boolean(duetSplit);
  const hasWords = Boolean(activeWords && activeWords.length > 0 && transMode !== 'translated');
  const needsRerender = (
    islandLine.dataset.lineIndex !== String(targetIndex) ||
    islandLine.dataset.subText !== subText ||
    islandLine.dataset.transMode !== transMode ||
    islandLine.dataset.satellite !== String(shouldSatelliteBeDocked) ||
    islandLine.dataset.duet !== String(isDuetActive)
  );

  // 6. Line or Translation Changed: Re-render DOM
  if (needsRerender) {
    islandLine.dataset.stateKey = "";
    islandLine.dataset.lineIndex = String(targetIndex);
    islandLine.dataset.subText = subText;
    islandLine.dataset.transMode = transMode;
    islandLine.dataset.satellite = String(shouldSatelliteBeDocked);
    islandLine.dataset.duet = String(isDuetActive);
    lastIslandActiveWordSpan = null;

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
      // Translated only mode
      islandLine.textContent = subText;
      islandLine._cachedWordSpans = null;
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

    currentIslandOffset = 0;
    islandLine.style.transform = 'translate3d(0px, 0, 0)';
  }

  // 6. Word-by-Word Karaoke State Update
  let activeWordSpan = null;
  let activeWordOffset = null;
  if (hasWords && islandLine._cachedWordSpans && islandLine._cachedWordSpans.length > 0) {
    const spans = islandLine._cachedWordSpans;
    const words = activeWords;
    const wordsCount = words.length;

    let currentActiveIdx = -1;
    for (let wi = 0; wi < wordsCount; wi++) {
      const w = words[wi];
      const wStart = (w.start != null ? w.start * 1000 : w.timeMs) || 0;
      const wEnd = getLyricWordEndMs(words, wi, lineData, targetIndex);

      if (syncProgress >= wStart && syncProgress < wEnd) {
        currentActiveIdx = wi;
        break;
      }
    }

    // Only mutate DOM classes if the active word index actually changed
    if (islandLine._lastActiveWordIdx !== currentActiveIdx) {
      islandLine._lastActiveWordIdx = currentActiveIdx;
      for (let wi = 0; wi < wordsCount; wi++) {
        const span = spans[wi];
        if (!span) continue;
        if (currentActiveIdx === -1) {
          const w = words[wi];
          const wStart = (w.start != null ? w.start * 1000 : w.timeMs) || 0;
          if (syncProgress < wStart) {
            span.className = 'lyric-word lyric-word-upcoming';
          } else {
            span.className = 'lyric-word lyric-word-completed lyric-word-passed';
          }
        } else if (wi < currentActiveIdx) {
          span.className = 'lyric-word lyric-word-completed lyric-word-passed';
        } else if (wi === currentActiveIdx) {
          span.className = 'lyric-word lyric-word-active';
        } else {
          span.className = 'lyric-word lyric-word-upcoming';
        }
        if (wi !== currentActiveIdx) {
          span.style.removeProperty('--word-progress');
        }
      }
    }

    if (currentActiveIdx >= 0) {
      activeWordSpan = spans[currentActiveIdx];
      lastIslandActiveWordSpan = activeWordSpan;
      if (islandLine._cachedWordOffsets && islandLine._cachedWordOffsets[currentActiveIdx]) {
        activeWordOffset = islandLine._cachedWordOffsets[currentActiveIdx];
      }
      const curW = words[currentActiveIdx];
      if (curW && activeWordSpan) {
        const curStart = (curW.start != null ? curW.start * 1000 : curW.timeMs) || 0;
        const curEnd = getLyricWordEndMs(words, currentActiveIdx, lineData, targetIndex);
        const curDur = Math.max(50, curEnd - curStart);
        const wordProgress = Math.min(1, Math.max(0, (syncProgress - curStart) / curDur));
        setLyricWordProgress(activeWordSpan, wordProgress);
      }
    } else if (lastIslandActiveWordSpan) {
      activeWordSpan = lastIslandActiveWordSpan;
      if (islandLine._cachedWordOffsets && islandLine._cachedWordOffsets.length > 0) {
        activeWordOffset = islandLine._cachedWordOffsets[islandLine._cachedWordOffsets.length - 1];
      }
    }
  }

  // 7. Smooth Panning Math
  const islandZone = document.getElementById("island-lyric-zone") || islandLine.parentElement;
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
        const spanCenter = activeWordOffset.center;
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
        if (progressFrac <= 0.08) {
          scrollRatio = 0;
        } else if (progressFrac >= 0.92) {
          scrollRatio = 1;
        } else {
          const t = (progressFrac - 0.08) / 0.84;
          scrollRatio = 0.5 - 0.5 * Math.cos(t * Math.PI);
        }
        targetOffset = -scrollRatio * scrollableDistance;
        targetOffset = Math.min(0, Math.max(maxScroll, targetOffset));
      }

      const nowMs = performance.now();
      const dt = lastIslandPanTime > 0 ? Math.min(0.06, Math.max(0.001, (nowMs - lastIslandPanTime) / 1000)) : 0.016;
      lastIslandPanTime = nowMs;

      if (Math.abs(targetOffset - currentIslandOffset) > 140) {
        currentIslandOffset = targetOffset;
      } else {
        const factor = 1 - Math.exp(-14 * dt);
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
let isKineticMode = false;
let kineticRendererInstance = null;
let kineticIdleTimeout = null;
let isCinematicView = true;
let cinematicMainRendererInstance = null;

async function transitionToMode(targetMode) {
  if (isTransitioningMode) return;
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
      document.body.classList.remove('wallpaper-mode', 'custom-bg-active', 'has-beat-bloom');
      if (window.electronAPI && typeof window.electronAPI.setWallpaperMode === 'function') {
        await window.electronAPI.setWallpaperMode(false);
      }
    }

    if (isDynamicIslandMode && targetMode !== 'island') {
      isDynamicIslandMode = false;
      settings.dynamicIslandMode = false;
      isIslandSleeping = false;
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
    }

    if (settings.taskbarMode && targetMode !== 'taskbar') {
      settings.taskbarMode = false;
      if (checkTaskbarMode) checkTaskbarMode.checked = false;
      document.body.classList.remove('taskbar-mode');
      if (window.electronAPI && typeof window.electronAPI.setTaskbarMode === 'function') {
        await window.electronAPI.setTaskbarMode(false);
      }
    }

    // 2. Engage target mode cleanly
    if (targetMode === 'island') {
      isDynamicIslandMode = true;
      settings.dynamicIslandMode = true;
      document.body.classList.add('mode-dynamic-island');
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
      const dockPos = settings.dynamicIslandPosition || 'top-center';
      applyDynamicIslandDockClass(dockPos);

      if (window.electronAPI && typeof window.electronAPI.setDynamicIslandMode === 'function') {
        await window.electronAPI.setDynamicIslandMode(true, dockPos);
      }
      try {
        syncDynamicIslandState();
      } catch (err) {
        console.warn("[DynamicIsland] Error syncing state:", err);
      }
      if (fluidMeshGradientInstance) {
        fluidMeshGradientInstance.stop();
      }
      applyIslandVisualizerStyle(settings.islandVisualizerStyle || 'bars');
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
      applyVisualSettings();
    } else if (targetMode === 'taskbar') {
      settings.taskbarMode = true;
      if (checkTaskbarMode) checkTaskbarMode.checked = true;
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
      applyVisualSettings();
      if (fluidMeshGradientInstance && (settings.bgStyle || 'fluid') === 'fluid') {
        fluidMeshGradientInstance.start();
      }
    }

    saveLocalSettings();
    updateModeButtonsState();
  } finally {
    isTransitioningMode = false;
  }
}

async function toggleDynamicIslandMode(forceState) {
  const targetState = typeof forceState === 'boolean' ? forceState : !isDynamicIslandMode;
  if (targetState === isDynamicIslandMode) return;
  await transitionToMode(targetState ? 'island' : 'normal');
}

async function toggleWallpaperMode(forceState) {
  const targetState = typeof forceState === 'boolean' ? forceState : !settings.wallpaperMode;
  if (targetState === settings.wallpaperMode) return;
  await transitionToMode(targetState ? 'wallpaper' : 'normal');
}

async function toggleTaskbarMode(forceState) {
  const targetState = typeof forceState === 'boolean' ? forceState : !settings.taskbarMode;
  if (targetState === settings.taskbarMode) return;
  if (targetState && !config && !(typeof isSpotifyConnected === 'function' && isSpotifyConnected()) && !isPlaying && !currentTrackId) {
    if (typeof showToast === 'function') {
      showToast("Please play music or connect Spotify to use Taskbar Mode.", 3000, 'warning');
    }
    return;
  }
  await transitionToMode(targetState ? 'taskbar' : 'normal');
}

async function toggleKineticMode(forceState) {
  const targetState = typeof forceState === 'boolean' ? forceState : !isKineticMode;
  if (targetState === isKineticMode) return;
  await transitionToMode(targetState ? 'kinetic' : 'normal');
}

function _openShareWithIslandInterop(idx) {
  const preferredIdx = (typeof idx === 'number' && idx >= 0) ? idx : null;
  if (typeof isDynamicIslandMode !== 'undefined' && isDynamicIslandMode) {
    window._returnToIslandAfterShare = true;
    if (window.electronAPI && window.electronAPI.setDynamicIslandMode) {
      window.electronAPI.setDynamicIslandMode(false);
    }
    setTimeout(() => {
      if (typeof window.openShareModal === 'function') window.openShareModal(preferredIdx);
    }, 200);
    return;
  }
  if (typeof isKineticMode !== 'undefined' && isKineticMode) {
    window._returnToKineticAfterShare = true;
    if (typeof window.shareState !== 'undefined') {
      window.shareState.designMode = 'kinetic';
    }
  }
  if (typeof window.openShareModal === 'function') {
    window.openShareModal(preferredIdx);
  } else if (typeof generateShareCard === 'function') {
    generateShareCard();
  }
}
window._openShareWithIslandInterop = _openShareWithIslandInterop;

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

  cinematicMainRendererInstance.configure({
    isCinematic: true,
    skipIntroMorph: true,
    shapeMode: 'auto',
    colorMode: 'album_art',
    artist: artistName,
    title: trackName,
    creatorTag: artistName ? `@${artistName.replace(/\s+/g, '').toLowerCase()}` : '',
    artworkImage: (widgetAlbumArt && widgetAlbumArt.complete && widgetAlbumArt.naturalWidth) ? widgetAlbumArt : null,
    dominantRgb: domRgb,
    lyrics: lyricsToUse,
    startTimeMs: 0,
    endTimeMs: trackDuration || null
  });

  const syncProgress = getAcousticSyncProgress();
  cinematicMainRendererInstance.seek(syncProgress);
}

function initCinematicMainStage() {
  const canvas = document.getElementById("cinematic-main-canvas");
  const stage = document.getElementById("cinematic-main-stage");
  const viewport = document.getElementById("lyrics-viewport");
  if (!canvas || (!stage && !viewport)) return;

  const targetEl = stage || viewport;
  const rect = targetEl.getBoundingClientRect();
  const width = Math.max(300, Math.floor(rect.width || window.innerWidth || 780));
  const height = Math.max(200, Math.floor(rect.height || window.innerHeight || 480));

  if (!cinematicMainRendererInstance && window.KineticCanvasRenderer) {
    cinematicMainRendererInstance = new window.KineticCanvasRenderer(canvas, { width, height, isCinematic: true });
  } else if (cinematicMainRendererInstance) {
    cinematicMainRendererInstance.setDimensions(width, height);
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

function toggleCinematicView(forceState) {
  const target = (typeof forceState === 'boolean') ? forceState : !isCinematicView;
  isCinematicView = target;
  settings.cinematicMode = target;

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

  // Dynamically enlarge window in cinematic mode (matching user layout ~1260x860) and restore original dimensions on exit
  if (window.electronAPI && typeof window.electronAPI.setCinematicMode === 'function') {
    window.electronAPI.setCinematicMode(isCinematicView).catch(() => {});
  }

  if (isCinematicView) {
    if (!cinematicMainRendererInstance) {
      initCinematicMainStage();
    } else {
      const stage = document.getElementById("cinematic-main-stage");
      if (stage) {
        const rect = stage.getBoundingClientRect();
        const w = Math.max(300, Math.floor(rect.width || window.innerWidth || 780));
        const h = Math.max(200, Math.floor(rect.height || window.innerHeight || 480));
        cinematicMainRendererInstance.setDimensions(w, h);
      }
      syncCinematicState();
    }
  } else {
    // Exiting cinematic mode: restore classic lyrics focus and center active line
    userScrolling = false;
    manualLyricScrollY = null;
    hideResyncButton();

    requestAnimationFrame(() => {
      measureLyricMetrics();
      if (lyrics && lyrics.length > 0) {
        const syncProgress = getAcousticSyncProgress();
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
      }
    });
  }

  saveLocalSettings();
  updateModeButtonsState();
}

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

function handleIslandClusterEnter() {
  if (islandMouseLeaveTimer) {
    clearTimeout(islandMouseLeaveTimer);
    islandMouseLeaveTimer = null;
  }
  isMouseOverDynamicIsland = true;
  wakeDynamicIsland();
  startDynamicIslandBoundsTracking(450);
}

function handleIslandClusterLeave() {
  if (islandMouseLeaveTimer) clearTimeout(islandMouseLeaveTimer);
  islandMouseLeaveTimer = setTimeout(() => {
    isMouseOverDynamicIsland = false;
    startDynamicIslandBoundsTracking(450);
  }, 120);
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

  // Manual scroll detection: when user scrolls with mousewheel or drags, pause auto-scroll within bounded range
  if (lyricsViewport) {
    lyricsViewport.addEventListener('wheel', (e) => {
      if (isCinematicView || settings.taskbarMode || settings.compactMode) return;
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
      if (isCinematicView) return;
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
      if (isCinematicView || !isPointerDraggingLyrics) return;
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
        const maxY = Math.max(firstLineCenterY, lastLineCenterY) + 60;
        const minY = Math.min(firstLineCenterY, lastLineCenterY) - 60;

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

  // Click on Album Art to Enlarge Lightbox Modal
  const artContainer = document.querySelector(".widget-art-container");
  if (artContainer) {
    artContainer.title = "Click to enlarge (Right-click to refetch album artwork)";
    artContainer.addEventListener("click", (e) => {
      e.stopPropagation();
      showAlbumArtModal();
    });
    artContainer.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!currentTrack || !currentTrack.name) return;
      console.log("[Artwork] Manual refetch triggered for", currentTrack.name);

      if (currentTrackId) delete localArtCache[currentTrackId];
      const artist = currentTrack.artists?.[0]?.name || '';
      const dualKey = `${artist}:::${currentTrack.name}`.toLowerCase().trim();
      delete localArtCache[dualKey];

      if (widgetAlbumArt) widgetAlbumArt.style.opacity = '0.5';

      try {
        const artUrl = await fetchFallbackAlbumArt(currentTrack.name, artist, currentTrack.album?.name || '');
        if (artUrl) {
          saveArtToCache(currentTrackId, artUrl, currentTrack.name, artist);
          if (widgetAlbumArt) {
            widgetAlbumArt.src = artUrl;
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

  fluidMeshCanvas = document.getElementById("fluid-mesh-canvas");
  selectBgStyle = document.getElementById("select-bg-style");
  sliderFluidSpeed = document.getElementById("slider-fluid-speed");
  valFluidSpeed = document.getElementById("val-fluid-speed");
  settingFluidSpeedRow = document.getElementById("setting-fluid-speed-row");

  if (fluidMeshCanvas && window.FluidMeshGradient && !fluidMeshGradientInstance) {
    try {
      fluidMeshGradientInstance = new window.FluidMeshGradient(fluidMeshCanvas);
    } catch (e) {
      console.warn("[Renderer] Failed to initialize FluidMeshGradient:", e);
    }
  }
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
      if (window.electronAPI) {
        if (typeof window.electronAPI.getIsStartup === 'function') {
          isStartupMode = await window.electronAPI.getIsStartup();
        } else if (typeof window.electronAPI.invoke === 'function') {
          isStartupMode = await window.electronAPI.invoke('get_is_startup');
        }
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
      } else if (settings.preferredLyricProvider === 'netease') {
        settings.preferredLyricProviders = ['netease', 'lrclib', 'musixmatch'];
      } else {
        settings.preferredLyricProviders = [];
      }
    }
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

  if (typeof settings.cinematicMode === 'undefined') {
    settings.cinematicMode = true;
  }
  if (typeof settings.wallpaperCinematic === 'undefined') {
    settings.wallpaperCinematic = true;
  }
  isCinematicView = Boolean(settings.cinematicMode);

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

  if (isCinematicView) {
    initCinematicMainStage();
  }
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
    const artModal = document.getElementById("album-art-modal");
    if (artModal && artModal.classList.contains("show")) {
      showAlbumArtModal();
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
  const artModal = document.getElementById("album-art-modal");
  if (artModal && artModal.classList.contains("show")) {
    showAlbumArtModal();
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
  // Exclusively Apple Music Split View (style2) - legacy styles 1 and 3 removed
  settings.wallpaperStyle = 'style2';

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

  const wStyle = 'style2';
  settings.wallpaperStyle = 'style2';
  const hasCustomBackground = Boolean(settings.customBgSrc && settings.customBgType && !settings.wallpaperMode);

  if (settings.wallpaperMode && config) {
    if (screenLyrics) screenLyrics.style.display = "flex";
    if (screenLogin) screenLogin.style.display = "none";
  }

  document.body.classList.toggle("wallpaper-mode", settings.wallpaperMode === true);
  document.body.classList.remove("wallpaper-style-1", "wallpaper-style-3");
  document.body.classList.toggle("wallpaper-style-2", settings.wallpaperMode === true);
  document.body.classList.toggle("custom-bg-active", hasCustomBackground);
  if (appContainer) {
    appContainer.classList.toggle("wallpaper-mode", settings.wallpaperMode === true);
    appContainer.classList.toggle("custom-bg-active", hasCustomBackground);
    const isCinematicActive = (settings.cinematicMode !== false) && !settings.wallpaperMode && !settings.taskbarMode && !isDynamicIslandMode;
    appContainer.classList.toggle("cinematic-view-active", isCinematicActive);
  }

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
    const isWallpaperStyle2 = settings.wallpaperMode && (settings.wallpaperStyle === 'style2');
    const shouldRunMesh = !isDynamicIslandMode && ((currentBgStyle === 'fluid') || isWallpaperStyle2) && !settings.taskbarMode && (!hasCustomBackground || isWallpaperStyle2);
    if (shouldRunMesh) {
      fluidMeshGradientInstance.start();
      fluidMeshGradientInstance.setPlaybackState(
        isPlaying,
        window._currentBpmProfile || 'normal',
        fluidSpeedVal
      );
      fluidMeshGradientInstance.setIntensity(glowVal / 100);
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
  if (selectWallpaperStyle) selectWallpaperStyle.value = 'style2';
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
            showLyricsScreen();
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
            fetchLyrics(currentTrackId, widgetTrackName.textContent, widgetArtistName.textContent, trackDuration);
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
        fluidMeshGradientInstance.setPlaybackState(isPlaying, window._currentBpmProfile || 'normal', settings.fluidSpeed);
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
    dynamicIslandEl.addEventListener("transitionstart", () => {
      startDynamicIslandBoundsTracking(450);
    });
    dynamicIslandEl.addEventListener("transitionend", () => {
      pushDynamicIslandBounds();
    });
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        pushDynamicIslandBounds();
        const titleEl = document.getElementById("island-track-title");
        const artistEl = document.getElementById("island-track-artist");
        const pausedTitleEl = document.getElementById("island-paused-title");
        if (titleEl) updateMarqueeOverflow(document.getElementById("island-title-wrapper"), titleEl);
        if (artistEl) updateMarqueeOverflow(document.getElementById("island-artist-wrapper"), artistEl);
        if (pausedTitleEl) updateMarqueeOverflow(document.getElementById("island-paused-title-wrapper"), pausedTitleEl);
      });
      ro.observe(dynamicIslandEl);
    }

function seekPlayback(targetMs) {
  if (trackDuration <= 0) return;
  const seekMs = Math.max(0, Math.min(trackDuration, Math.round(targetMs)));
  const now = Date.now();
  lastUserSeekTimestamp = now;
  lastUserSeekTargetMs = seekMs;
  currentProgress = seekMs;
  lastPollProgress = seekMs;
  lastPollTimestamp = now;

  if (window.electronAPI && window.electronAPI.triggerLocalPlaybackControl) {
    window.electronAPI.triggerLocalPlaybackControl("seek", seekMs);
  }
  if (config && config.access_token && !config.localMode) {
    fetch('https://api.spotify.com/v1/me/player/seek?position_ms=' + seekMs, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + config.access_token }
    }).catch(err => console.warn("Seek error:", err));
  }
}

function adjustIslandVolume(deltaPercent, showHud = true) {
  currentIslandVolumePercent = Math.max(0, Math.min(100, currentIslandVolumePercent + deltaPercent));
  isIslandMuted = currentIslandVolumePercent === 0;

  let volIcon = "🔊";
  if (currentIslandVolumePercent === 0) volIcon = "🔇";
  else if (currentIslandVolumePercent < 35) volIcon = "🔈";
  else if (currentIslandVolumePercent < 70) volIcon = "🔉";

  if (window.electronAPI && window.electronAPI.triggerLocalPlaybackControl) {
    if (deltaPercent > 0) {
      window.electronAPI.triggerLocalPlaybackControl("volume-up", currentIslandVolumePercent);
    } else if (deltaPercent < 0) {
      window.electronAPI.triggerLocalPlaybackControl("volume-down", currentIslandVolumePercent);
    } else {
      window.electronAPI.triggerLocalPlaybackControl("volume", currentIslandVolumePercent);
    }
  }

  if (config && config.access_token && !config.localMode) {
    fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${currentIslandVolumePercent}`, {
      method: 'PUT',
      headers: { "Authorization": `Bearer ${config.access_token}` }
    }).catch(() => {});
  }

  if (isDynamicIslandMode && showHud) {
    showIslandHud({
      icon: volIcon,
      text: `${currentIslandVolumePercent}%`,
      percent: currentIslandVolumePercent,
      showBar: true
    });
  } else if (!isDynamicIslandMode && showHud && typeof showToast === 'function') {
    showToast(`${volIcon} Volume: ${currentIslandVolumePercent}%`, 1000);
  }
}

function toggleAppMute() {
  if (isIslandMuted) {
    currentIslandVolumePercent = lastIslandMuteVolume || 50;
    isIslandMuted = false;
    if (isDynamicIslandMode) {
      showIslandHud({ icon: "🔊", text: `${currentIslandVolumePercent}%`, percent: currentIslandVolumePercent, showBar: true });
    } else if (typeof showToast === 'function') {
      showToast(`🔊 Volume: ${currentIslandVolumePercent}%`, 1000);
    }
    if (window.electronAPI && window.electronAPI.triggerLocalPlaybackControl) {
      window.electronAPI.triggerLocalPlaybackControl("volume", currentIslandVolumePercent);
    }
  } else {
    lastIslandMuteVolume = currentIslandVolumePercent;
    currentIslandVolumePercent = 0;
    isIslandMuted = true;
    if (isDynamicIslandMode) {
      showIslandHud({ icon: "🔇", text: "Muted", percent: 0, showBar: true });
    } else if (typeof showToast === 'function') {
      showToast("🔇 Muted", 1000);
    }
    if (window.electronAPI && window.electronAPI.triggerLocalPlaybackControl) {
      window.electronAPI.triggerLocalPlaybackControl("volume-mute", 0);
    }
  }
  if (config && config.access_token && !config.localMode) {
    fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${currentIslandVolumePercent}`, {
      method: 'PUT',
      headers: { "Authorization": `Bearer ${config.access_token}` }
    }).catch(() => {});
  }
}

    dynamicIslandEl.addEventListener("dblclick", (e) => {
      if (!e.target.closest('.island-btn')) {
        toggleDynamicIslandMode(false);
      }
    });

    // Mouse Wheel Gestures: Volume (Vertical) & Seek (Shift + Vertical / Horizontal)
    dynamicIslandEl.addEventListener("wheel", (e) => {
      if (!isDynamicIslandMode) return;
      if (settings.islandWheelGestures === false) return;

      e.preventDefault();

      const isSeek = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);

      if (isSeek) {
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
        // Volume ±5%
        const deltaVol = e.deltaY < 0 ? 5 : -5;
        adjustIslandVolume(deltaVol);
      }
    }, { passive: false });

    // Middle Click to Toggle Mute / Unmute
    dynamicIslandEl.addEventListener("auxclick", (e) => {
      if (e.button !== 1 || !isDynamicIslandMode) return;
      e.preventDefault();
      toggleAppMute();
    });

    // Right Click on Dynamic Island to Refetch / Cycle Alternative Lyrics
    dynamicIslandEl.addEventListener("contextmenu", (e) => {
      if (!isDynamicIslandMode) return;
      if (e.target.closest('#island-expanded-controls')) return;
      e.preventDefault();
      e.stopPropagation();
      cycleAlternativeLyrics();
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

    function getRatio(e) {
      const rect = trackEl.getBoundingClientRect();
      if (!rect.width || rect.width <= 0) return 0;
      return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    }

    function updateVisuals(ratio, isDragging) {
      if (trackDuration <= 0) return;
      const previewMs = Math.round(ratio * trackDuration);
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
        if (fillEl) fillEl.style.width = `${percent}%`;
        if (thumbEl) thumbEl.style.left = `${percent}%`;
        if (timeCurrentEl) timeCurrentEl.textContent = formatTime(previewMs);
        if (isIsland) {
          const remEl = document.getElementById("island-time-remaining");
          if (remEl) {
            const remMs = Math.max(0, trackDuration - previewMs);
            remEl.textContent = `-${formatTime(remMs)}`;
          }
        } else if (widgetTimeDuration && window._showRemainingTime) {
          const remMs = Math.max(0, trackDuration - previewMs);
          widgetTimeDuration.textContent = `-${formatTime(remMs)}`;
        }
      }
    }

    trackEl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || trackDuration <= 0) return;
      if (settings.progressBarSeek === false) return;
      e.preventDefault();
      e.stopPropagation();

      isScrubbing = true;
      if (isIsland) isScrubbingIslandProgress = true;
      else isScrubbingMainProgress = true;

      trackEl.classList.add("is-scrubbing");
      try { trackEl.setPointerCapture(e.pointerId); } catch (_) {}

      const ratio = getRatio(e);
      updateVisuals(ratio, true);
    });

    trackEl.addEventListener("pointermove", (e) => {
      if (trackDuration <= 0) return;
      const ratio = getRatio(e);

      if (isScrubbing) {
        e.preventDefault();
        e.stopPropagation();
        updateVisuals(ratio, true);
      } else {
        if (settings.progressBarSeek !== false) {
          updateVisuals(ratio, false);
        }
      }
    });

    function commitSeek(e) {
      if (!isScrubbing) return;
      e.preventDefault();
      e.stopPropagation();

      const ratio = getRatio(e);
      const seekMs = Math.round(ratio * trackDuration);

      isScrubbing = false;
      if (isIsland) isScrubbingIslandProgress = false;
      else isScrubbingMainProgress = false;

      trackEl.classList.remove("is-scrubbing");
      try { trackEl.releasePointerCapture(e.pointerId); } catch (_) {}

      seekPlayback(seekMs);

      if (isIsland) {
        const jumpDeltaSec = Math.round((seekMs - (lastPollProgress || 0)) / 1000);
        const icon = jumpDeltaSec >= 0 ? "⏩" : "⏪";
        showIslandHud({
          icon,
          text: `${formatTime(seekMs)}`,
          percent: (seekMs / trackDuration) * 100,
          showBar: true
        });
      }
    }

    trackEl.addEventListener("pointerup", commitSeek);
    trackEl.addEventListener("pointercancel", commitSeek);

    trackEl.addEventListener("pointerleave", () => {
      if (!isScrubbing && hoverEl) {
        hoverEl.style.width = "0%";
      }
    });

    trackEl.addEventListener("wheel", (e) => {
      if (settings.progressWheelSeek === false || trackDuration <= 0) return;
      if (settings.progressBarSeek === false) return;
      e.preventDefault();
      e.stopPropagation();

      const stepMs = e.shiftKey ? 15000 : 5000;
      const deltaMs = e.deltaY < 0 ? stepMs : -stepMs;
      const newPos = Math.max(0, Math.min(trackDuration, (currentProgress || 0) + deltaMs));

      seekPlayback(newPos);

      const ratio = newPos / trackDuration;
      if (fillEl) fillEl.style.width = `${ratio * 100}%`;
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
      if (trackDuration <= 0 || settings.progressBarSeek === false) return;
      e.preventDefault();
      e.stopPropagation();

      const ratio = getRatio(e);
      const deltaMs = ratio >= 0.5 ? 10000 : -10000;
      const targetPos = Math.max(0, Math.min(trackDuration, (currentProgress || 0) + deltaMs));

      seekPlayback(targetPos);

      if (isIsland) {
        showIslandHud({
          icon: deltaMs > 0 ? "⏩" : "⏪",
          text: deltaMs > 0 ? "+10s" : "-10s",
          percent: (targetPos / trackDuration) * 100,
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

  if (window.electronAPI && typeof window.electronAPI.onDynamicIslandModeChanged === 'function') {
    window.electronAPI.onDynamicIslandModeChanged((enabled) => {
      isDynamicIslandMode = Boolean(enabled);
      document.body.classList.toggle('mode-dynamic-island', isDynamicIslandMode);
      const checkIsland = document.getElementById("check-dynamic-island");
      if (checkIsland) checkIsland.checked = isDynamicIslandMode;
      if (isDynamicIslandMode) {
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
      }
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

  const selectIslandPosition = document.getElementById("select-island-position");
  if (selectIslandPosition) {
    selectIslandPosition.value = settings.dynamicIslandPosition || 'top-center';
    selectIslandPosition.addEventListener("change", (e) => {
      settings.dynamicIslandPosition = e.target.value;
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

  // Periodic Inactivity Checker (1-second tick)
  setInterval(checkDynamicIslandInactivity, 1000);

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
    });
  }

  if (selectWallpaperStyle) {
    selectWallpaperStyle.value = 'style2';
    selectWallpaperStyle.addEventListener("change", (e) => {
      settings.wallpaperStyle = 'style2';
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
        fetchLyrics(currentTrackId, { forceRefresh: true });
      }
    });
  }

  // Preferred Lyrics Provider select
  if (selectPreferredProvider) {
    selectPreferredProvider.value = settings.preferredLyricProvider || 'auto';
    selectPreferredProvider.addEventListener('change', (e) => {
      settings.preferredLyricProvider = e.target.value;
      if (settings.preferredLyricProvider === 'netease') {
        settings.preferredLyricProviders = ['netease', 'lrclib', 'musixmatch'];
      } else if (settings.preferredLyricProvider === 'lrclib') {
        settings.preferredLyricProviders = ['lrclib', 'musixmatch', 'netease'];
      } else if (settings.preferredLyricProvider === 'musixmatch') {
        settings.preferredLyricProviders = ['musixmatch', 'lrclib', 'netease'];
      } else {
        settings.preferredLyricProviders = [];
      }
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
    // Ctrl+Shift+C or Ctrl+Shift+K to toggle Cinematic Mode
    if (e.ctrlKey && e.shiftKey && (e.code === 'KeyC' || e.key.toLowerCase() === 'c' || e.code === 'KeyK' || e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      toggleCinematicView();
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

  function adjustSyncOffset(deltaMs) {
    if (!deltaMs || isNaN(deltaMs)) return;
    settings.syncOffsetMs = (settings.syncOffsetMs || 0) + deltaMs;
    if (!settings.trackOffsets) settings.trackOffsets = {};
    if (currentTrackId) {
      settings.trackOffsets[currentTrackId] = settings.syncOffsetMs;
    }
    if (inputSyncOffset) {
      inputSyncOffset.value = settings.syncOffsetMs;
    }
    saveLocalSettings();

    const sign = settings.syncOffsetMs > 0 ? '+' : '';
    const msg = `Offset: ${sign}${settings.syncOffsetMs}ms`;
    if (typeof isDynamicIslandMode !== 'undefined' && isDynamicIslandMode && typeof showIslandHud === 'function') {
      showIslandHud({ icon: "⏱", text: msg, showBar: false });
    } else {
      showToast(msg, 1500);
    }
  }

  // Hotkey listener inside DOM to unlock click-through (local fallback when focused)
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "L") {
      e.preventDefault();
      toggleClickThrough();
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

    const isOverInteractive = e.target.closest('button, input, select, .hud-header, .playback-widget, .settings-panel, a, label, .drag-handle, .lyrics-empty-state, .modal, .share-modal, #share-card-modal, #genius-modal, .lyrics-view, #lyrics-viewport, #lyrics-container, .lyric-line');
    if (isOverInteractive) {
      setClickThroughCached(false);
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


  window.electronAPI.onWindowRestored(() => {
    setClickThroughCached(false);
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

  function handleLocalOrPollPause(reportedPos) {
    if (isPlaying) {
      if (typeof reportedPos === 'number' && reportedPos > 0 && Math.abs(reportedPos - currentProgress) < 1500) {
        currentProgress = reportedPos;
      }
      lastPollProgress = currentProgress;
      lastPollTimestamp = Date.now();
      isPlaying = false;
    }
    requestAnimationFrame(updatePlayhead);
    if (isCinematicView && cinematicMainRendererInstance) {
      cinematicMainRendererInstance.seek(getAcousticSyncProgress());
    }
    if (btnPlaySvg) btnPlaySvg.style.display = 'block';
    if (btnPauseSvg) btnPauseSvg.style.display = 'none';
    pauseAnimatedArtVideos();
    handleTaskbarPauseAutoHide(true);
    updateAutoHideState();
    document.body.classList.toggle('is-playing', false);
    document.body.classList.toggle('app-paused', true);
    syncDynamicIslandState();
    if (isDynamicIslandMode) {
      startDynamicIslandBoundsTracking(450);
    }
    if (typeof checkVisualizerFallback === 'function') {
      checkVisualizerFallback();
    }
  }

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
        document.body.classList.toggle('is-playing', true);
        document.body.classList.toggle('app-paused', false);
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
  if (btnShareLyric) {
    btnShareLyric.addEventListener("click", () => {
      _openShareWithIslandInterop(activeLineIndex);
    });
  }

  // Global OS-Level Mode Shortcut Listeners
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

  // Keyboard Shortcuts for Sync Nudging & Reload
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

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
    if (e.key === 'Escape') {
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
  if (!settings.autoHideLyrics || settings.taskbarMode || settings.wallpaperMode || isDynamicIslandMode) {
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
  setClickThroughCached(false);


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
                 data.progress_ms = localData.progress_ms;
                 data._isLocalProgress = true;
              }
              if (localData.playback_rate) {
                 data.playback_rate = localData.playback_rate;
              }
            }
          }
        } catch (e) {}
        
        if (!data._isLocalProgress) {
          const latency = Math.min(60, Math.max(0, (Date.now() - fetchStart) / 2));
          data.progress_ms += latency;
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
  if (window.LyricsService?.instance?.engine) {
    window.LyricsService.instance.engine.clear();
  }
  activeLineIndex = -1;
  currentAnnotations = [];
  hideLiveMeaningPill();
  hideGeniusModal();

  if (fluidMeshGradientInstance) {
    fluidMeshGradientInstance.resetToDefault();
    fluidMeshGradientInstance.setPlaybackState(false, 'normal', settings.fluidSpeed || 1.0);
  }

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

  document.body.classList.remove('is-playing', 'app-paused');
  document.body.classList.add('is-idle');

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
  const artUrl = trackInfo.albumArtUrl || trackInfo.album?.images?.[0]?.url || '';

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

  if (fluidMeshGradientInstance) {
    fluidMeshGradientInstance.setPlaybackState(
      isPlaying,
      window._currentBpmProfile || 'normal',
      settings.fluidSpeed !== undefined ? settings.fluidSpeed : 1.0
    );
  }
}

let currentExtractedArtUrl = null;

async function updateDynamicArtColor(artUrl) {
  if (!artUrl || artUrl === currentExtractedArtUrl) return;
  currentExtractedArtUrl = artUrl;
  try {
    const colorData = window.extractColorData
      ? await window.extractColorData(artUrl)
      : { dominant: await extractDominantColor(artUrl), palette: await extractColorPalette(artUrl) };

    const dominant = colorData?.dominant || { r: 29, g: 185, b: 84 };
    window.currentDynamicDominantRgb = dominant;
    const palette = colorData?.palette;
    const c0 = (palette && palette[0]) || colorData?.base || { r: 8, g: 10, b: 18 };
    const c1 = (palette && palette[1]) || colorData?.primary || dominant;
    const c2 = (palette && palette[2]) || colorData?.secondary || { r: Math.max(0, dominant.r - 40), g: Math.max(0, dominant.g - 40), b: Math.max(0, dominant.b - 40) };
    const c3 = (palette && palette[3]) || colorData?.tertiary || c2;
    const c4 = (palette && palette[4]) || colorData?.quaternary || c1;

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

    if (fluidMeshGradientInstance && palette) {
      fluidMeshGradientInstance.setPalette(palette);
    }
    syncCinematicState();
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
  const isExplicitRateSource = data.source === 'windows-smtc' || (typeof data.playback_rate === 'number' && data.playback_rate > 0);
  if (typeof data.playback_rate === 'number' && data.playback_rate > 0) {
    window._currentPlaybackRate = data.playback_rate;
  } else if (!window._currentPlaybackRate) {
    window._currentPlaybackRate = 1.0;
  }

  // 2. Playback speed auto-detection (ONLY for web players that lack explicit playback_rate reporting)
  if (!isExplicitRateSource && !isNewTrack && isCurrentlyPlaying && isPlaying && window._lastGroundTruthTime && window._lastGroundTruthProgress !== undefined) {
    const dt = now - window._lastGroundTruthTime;
    const dp = progressMs - window._lastGroundTruthProgress;
    // Typical poll interval (800ms - 4000ms) and forward progress without large manual seek
    if (dt >= 800 && dt <= 4000 && dp > 0 && dp < 12000) {
      const measuredRate = dp / dt;
      const candidates = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
      // Use tight tolerance (0.04) and 6 hits to avoid false matches due to polling network jitter
      const matched = candidates.find(c => Math.abs(measuredRate - c) <= 0.04);
      if (matched) {
        if (matched === window._candidateRate) {
          window._candidateRateHits = (window._candidateRateHits || 0) + 1;
          const requiredHits = (matched === 1.0) ? 2 : 6;
          if (window._candidateRateHits >= requiredHits && window._currentPlaybackRate !== matched) {
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

  if (!isScrubbingMainProgress && !isScrubbingIslandProgress) {
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
        const resumePos = (typeof progressMs === 'number' && progressMs > 0 && Math.abs(progressMs - currentProgress) > 1500)
          ? progressMs
          : currentProgress;
        lastPollProgress = resumePos;
        currentProgress = resumePos;
        lastPollTimestamp = now;
      } else {
        const isRecentSeek = (now - lastUserSeekTimestamp) < 1200;
        if (isRecentSeek && Math.abs(progressMs - lastUserSeekTargetMs) > 1500) {
          // Drop stale pre-seek poll from SMTC / Spotify to prevent snap-back rubber-banding!
        } else {
          const drift = currentProgress - progressMs;
          const absDrift = Math.abs(drift);

          if (absDrift > 1500) {
            // Hard seek / scrub detected — snap immediately
            lastPollProgress = progressMs;
            lastPollTimestamp = now;
            currentProgress = progressMs;
          } else if (absDrift > 80) {
            // Smoothly converge internal clock to ground truth progressMs
            // Gently pull internal progress toward reported progress to prevent drift from accumulating
            const adjustment = drift * 0.4;
            currentProgress = currentProgress - adjustment;
            lastPollProgress = currentProgress;
            lastPollTimestamp = now;
            window._allowClockConvergence = true;
          } else {
            // Re-anchor clock base at current progress to prevent timestamp aging
            lastPollProgress = currentProgress;
            lastPollTimestamp = now;
          }
        }
      }
    } else if (!isZeroReset && !isCurrentlyPlaying) {
      // Song is PAUSED: freeze currentProgress exactly at reported position
      if (typeof progressMs === 'number' && progressMs > 0 && Math.abs(progressMs - currentProgress) > 1000) {
        currentProgress = progressMs;
      }
      lastPollProgress = currentProgress;
      lastPollTimestamp = now;
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
  if (wasPlaying !== isCurrentlyPlaying && isDynamicIslandMode) {
    startDynamicIslandBoundsTracking(450);
  }
  document.body.classList.toggle('is-playing', isCurrentlyPlaying);
  document.body.classList.toggle('app-paused', !isCurrentlyPlaying);
  document.body.classList.remove('is-idle');
  if (widgetArtFallback) widgetArtFallback.classList.remove('idle-active');
  if (widgetProgressFill) widgetProgressFill.classList.remove('idle-shimmer');
  if (isPlaying) ensurePlayheadLoop();
  handleTaskbarPauseAutoHide(!isPlaying);
  updateAutoHideState();

  if (fluidMeshGradientInstance) {
    fluidMeshGradientInstance.setPlaybackState(
      isPlaying,
      window._currentBpmProfile || 'normal',
      settings.fluidSpeed !== undefined ? settings.fluidSpeed : 1.0
    );
  }

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
    widgetTrackName.title = track.name;
    const artistText = track.artists.map(a => a.name).join(", ");
    widgetArtistName.textContent = artistText;
    widgetArtistName.title = artistText;
    if (wallpaperTrackTitle) wallpaperTrackTitle.textContent = track.name;
    if (wallpaperTrackArtist) wallpaperTrackArtist.textContent = artistText;

    const trackWrap = document.getElementById("widget-track-name-wrapper");
    if (trackWrap) {
      updateMarqueeOverflow(trackWrap, widgetTrackName);
    }
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

  const artModal = document.getElementById("album-art-modal");
  if (artModal && artModal.classList.contains("show")) {
    showAlbumArtModal();
  }

  try {
    syncDynamicIslandState();
  } catch (err) {
    console.warn("[DynamicIsland] Error syncing state in handlePlaybackData:", err);
  }

  widgetTimeDuration.textContent = formatTime(trackDuration);

  // 3. Check if song changed
  if (isSongChanged) {
    currentTrackId = track.id;
    islandNowPlayingBufferUntil = Date.now() + 3000;
    manualLyricScrollY = null;

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
    if (isKineticMode && kineticRendererInstance) {
      syncKineticState();
    }
    if (isCinematicView || cinematicMainRendererInstance) {
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

    if (isKnownUntranslated) {
      dismissSatelliteForUntranslatedTrack();
    } else {
      const satText = document.getElementById("island-satellite-text");
      if (satText && satText.textContent !== '•••') {
        satText.textContent = '•••';
      }
    }
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

    // Authentic player art (including SMTC data: URLs) is authoritative ground truth.
    if (albumArtUrl && currentTrackId === track.id) {
      widgetAlbumArt.src = albumArtUrl;
      widgetAlbumArt.style.display = 'block';
      widgetArtFallback.style.display = 'none';
    }

    if (!albumArtUrl && (!localArtCache[track.id] || localArtCache[track.id] === 'notfound')) {
      localArtCache[track.id] = 'fetching';
      fetchFallbackAlbumArt(track.name, track.artists?.[0]?.name || '', track.album?.name || '').then(artUrl => {
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

/**
 * Non-blocking Auto-Translation Engine
 * Translates song lyrics into target language and persists translations into cache.
 */
async function triggerAutoTranslation(targetTrackId, linesToTranslate, cacheKey = null, force = false) {
  if (!settings.translateLang || settings.translateLang === 'none') return;
  if (!linesToTranslate || !Array.isArray(linesToTranslate) || linesToTranslate.length === 0) return;
  if (!window.electronAPI || typeof window.electronAPI.translateText !== 'function') return;

  // If already translated into this exact language and not forced, skip
  if (!force && linesToTranslate._transLang === settings.translateLang && (linesToTranslate._noTransNeeded || linesToTranslate.some(l => l.subText && l.subText.trim()))) {
    return;
  }

  const skipLang = settings.skipLang || 'none';
  const combinedText = linesToTranslate.map(l => (l.text || '').replace(/[\r\n]+/g, ' ').trim()).join('\n');
  if (!combinedText.trim()) return;

  const translationRequestId = `${targetTrackId}_${settings.translateLang}`;
  triggerAutoTranslation._activeRequest = translationRequestId;

  try {
    const transRes = await window.electronAPI.translateText(combinedText, settings.translateLang, skipLang);
    // Ignore stale request if a newer translation was triggered
    if (triggerAutoTranslation._activeRequest !== translationRequestId) return;

    if (!transRes || !transRes.text) {
      if (transRes && transRes.skipped) {
        console.log(`[LF-LYRICS] Auto-translation skipped: original track matches target/skip language (${transRes.src})`);
        linesToTranslate._transLang = settings.translateLang;
        linesToTranslate._noTransNeeded = true;
        if (targetTrackId === currentTrackId) {
          dismissSatelliteForUntranslatedTrack();
        }
      }
      return;
    }

    const transLines = transRes.text.split('\n');
    let hasNewTrans = false;
    const limit = Math.min(transLines.length, linesToTranslate.length);

    for (let i = 0; i < limit; i++) {
      let transText = transLines[i] ? transLines[i].trim() : '';
      transText = decodeHtmlEntities(transText);
      const origText = (linesToTranslate[i].text || '').trim();
      if (transText && transText.toLowerCase() !== origText.toLowerCase()) {
        linesToTranslate[i].subText = transText;
        hasNewTrans = true;
      }
    }

    linesToTranslate._transLang = settings.translateLang;
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
          if (!hasNewTrans) cachedObj.noTransNeeded = true;
          if (window.safeStorageSet) {
            window.safeStorageSet(cacheKey, JSON.stringify(cachedObj));
          } else {
            localStorage.setItem(cacheKey, JSON.stringify(cachedObj));
          }
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
    console.warn("[LF-LYRICS] Translation Notice:", err);
  }
}

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
        // Integrity check: If this is Yeat "Back Home" (194s ADL track) but cached lyrics are the 2023 AftërLyfe "Back homë" ("flew it to milan" / "working on dying"), bust cache immediately!
        const isYeatBackHome = cleanTrack.toLowerCase() === "back home" && cleanArtist.toLowerCase().includes("yeat");
        const isPollutedYeatLyrics = isYeatBackHome && Array.isArray(cachedData.lyrics) && cachedData.lyrics.some(l => {
          const t = (l.text || "").toLowerCase();
          return t.includes("working on dying") || t.includes("flew it to milan") || t.includes("fly no jet");
        });

        if (isPollutedYeatLyrics) {
          console.warn("[LF-LYRICS] Detected corrupted/polluted cache for Yeat - Back Home. Busting stale cache.");
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`lyrics_cache_${trackId}`);
          if (!rejectedLyricsSignatures[trackId]) rejectedLyricsSignatures[trackId] = new Set();
          const currentSig = cachedData.lyrics.slice(0, 4).map(l => (l.text || "").trim().toLowerCase()).join("|");
          if (currentSig) rejectedLyricsSignatures[trackId].add(currentSig);
        } else if (trackId === currentTrackId && cachedData.lyrics?.length > 0) {
          let loadedLyrics = cachedData.lyrics;
          if (settings.filterSongCredits !== false) {
            loadedLyrics = loadedLyrics.filter(l => !isLyricMetadataOrCreditLine(extractLineText(l)));
          }
          lyrics = loadedLyrics;
          lyrics._transLang = cachedData.transLang;
          lyrics._hasTranslation = loadedLyrics.some(l => l.subText && l.subText.trim().length > 0 && l.subText.trim().toLowerCase() !== (l.text || '').trim().toLowerCase());
          if (cachedData.noTransNeeded) lyrics._noTransNeeded = true;
          isFetchingLyrics = false;
          updateTimingStatus(cachedData.level || 2, cachedData.source || "", cachedData.candidateInfo || "");
          renderLyrics();
          adaptBpmSync(lyrics);
          if (isKineticMode && kineticRendererInstance) {
            syncKineticState();
          }
          if (isCinematicView || cinematicMainRendererInstance) {
            syncCinematicState();
          }

          // Non-blocking Auto-Translation check on cached lyrics
          if (settings.translateLang && settings.translateLang !== 'none') {
            const hasSubText = lyrics.some(l => l.subText && l.subText.trim());
            const langMatches = cachedData.transLang === settings.translateLang;
            if ((!hasSubText && !cachedData.noTransNeeded) || !langMatches) {
              triggerAutoTranslation(trackId, lyrics, cacheKey);
            }
          }

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
      console.log(`[LF-LYRICS] applyLyricsData called: sourceLevel=${sourceLevel}, sourceName=${sourceName}, parsedLines.length=${parsedLines.length}, trackId=${trackId}, currentTrackId=${currentTrackId}`);
      // Strip structural tags and credit metadata (e.g., "[Outro]", "Intro", "制作人 : ...", "Lyrics by ...")
      parsedLines = parsedLines.filter(line => {
        if (!line.text) return false;
        const t = line.text.trim().toLowerCase();
        if (t.startsWith('[') && t.endsWith(']')) return false;
        if (/^(outro|intro|instrumental|chorus|verse|bridge|hook)(\s+\d+)?$/i.test(t)) return false;
        if (settings.filterSongCredits !== false && isLyricMetadataOrCreditLine(extractLineText(line))) return false;
        return true;
      });

      if (trackId !== currentTrackId || parsedLines.length === 0) {
        console.warn(`[LF-LYRICS] applyLyricsData REJECTED: trackId match=${trackId === currentTrackId}, filteredLines=${parsedLines.length}`);
        return false;
      }

      // Automatically reject known polluted Yeat "Back Home" entries (2023 AftërLyfe lyrics uploaded under 194s track)
      if (isPollutedYeatLyrics(parsedLines)) {
        console.warn(`[LF-LYRICS] applyLyricsData REJECTED: detected polluted/mismatched Yeat - Back Home lyrics`);
        return false;
      }

      // Check rejected lyrics signature (e.g. user clicked reload or cycling)
      const linesSig = getLinesSignature(parsedLines);
      if (rejectedLyricsSignatures[trackId]?.has(linesSig)) {
        console.warn(`[LF-LYRICS] applyLyricsData REJECTED: signature matches previously rejected lyrics for ${trackId}`);
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
      delete parsedLines._hasTranslation;
      delete parsedLines._noTransNeeded;

      console.log(`[LF-LYRICS] applyLyricsData SUCCESS: setting ${parsedLines.length} lines, level=${sourceLevel}, source=${sourceName}`);
      lyrics = parsedLines;
      isFetchingLyrics = false;
      currentSourceLevel = sourceLevel;
      updateTimingStatus(sourceLevel, sourceName, candidateInfo);

      if (options.forceRefresh && isDynamicIslandMode) {
        showIslandHud({ icon: "✓", text: `${sourceName || "Lyrics"} loaded`, showBar: false });
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
      if (window.safeStorageSet) {
        window.safeStorageSet(cacheKey, JSON.stringify({ level: sourceLevel, lyrics, source: sourceName, candidateInfo, candidateIndex: trackLyricsCandidateIndex[trackId] || 0 }));
      } else {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ level: sourceLevel, lyrics, source: sourceName, candidateInfo, candidateIndex: trackLyricsCandidateIndex[trackId] || 0 }));
        } catch (_) {}
      }
      renderLyrics();
      adaptBpmSync(lyrics);
      if (isKineticMode && kineticRendererInstance) {
        syncKineticState();
      }
      if (isCinematicView || cinematicMainRendererInstance) {
        syncCinematicState();
      }

      const btnHide = document.getElementById("btn-hide-lyrics");
      if (btnHide) btnHide.style.display = "inline-flex";

      // Non-blocking Auto-Translation (runs in background without stalling lyrics rendering)
      triggerAutoTranslation(trackId, parsedLines, cacheKey);

      return true;
    };

    let rateLimited = false;

    // Primary Provider: LyricsPlus v2 endpoint (rich word-by-word synced + line synced)
    const lyricsPlusFetch = async () => {
      try {
        if (!window.LyricsService || !window.LyricsService.instance) return false;
        const trackMeta = {
          title: cleanTrack,
          artist: cleanArtist,
          album: currentPlayingTrackObj?.album?.name || null,
          duration: durationSec,
          isrc: isrc || currentPlayingTrackObj?.external_ids?.isrc || null,
          platformId: trackId?.startsWith('spotify:track:') ? trackId.replace('spotify:track:', '') : trackId,
          source: (config && config.localMode) ? 'Local' : 'Spotify'
        };

        if (options.forceRefresh) {
          window.LyricsService.instance.lyricsPlusProvider.service.invalidateCache(trackMeta);
        }

        const lpResult = await window.LyricsService.instance.lyricsPlusProvider.getLyrics(trackMeta, {
          signal,
          forceRefresh: !!options.forceRefresh
        });

        if (lpResult && Array.isArray(lpResult.lines) && lpResult.lines.length > 0 && trackId === currentTrackId) {
          const hasWords = lpResult.type === 'WORD' && lpResult.lines.some(l => l.words && l.words.length > 0);
          const level = hasWords ? 3 : 2;
          return await applyLyricsData(lpResult.lines, level, lpResult.source || 'LyricsPlus', '', lpResult);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.debug('[LF-LYRICS] LyricsPlus query notice:', err);
        }
      }
      return false;
    };

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
          candidateIndex: trackLyricsCandidateIndex[trackId] || 0,
          neteaseWordByWord: settings.neteaseWordByWord !== false
        });
        if (candidate && trackId === currentTrackId) {
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
            if (rejectedLyricsSignatures[trackId]?.has(sig)) {
              console.debug(`[LF-DEBUG] rustLyricsFetch candidate matched rejected signature for ${trackId}, skipping`);
              return false;
            }
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
            if (isPollutedYeatLyrics(data.lines)) {
              console.debug(`[LF-DEBUG] proxyFetch Spotify returned polluted Yeat lyrics for ${trackId}, skipping`);
              return false;
            }
            const sig = getLinesSignature(data.lines);
            if (rejectedLyricsSignatures[trackId]?.has(sig)) {
              console.debug(`[LF-DEBUG] proxyFetch returned identical rejected lyrics for ${trackId}, skipping for alternative candidate`);
              return false;
            }
            const level = (data.syncType === "WORD_SYNCED") ? 3 : 2;
            return await applyLyricsData(data.lines, level, "Spotify");
          } else if (data.source === "LRCLIB" && data.rawLRC) {
            const parsed = parseLRC(data.rawLRC);
            if (isPollutedYeatLyrics(parsed)) {
              console.debug(`[LF-DEBUG] proxyFetch LRCLIB returned polluted Yeat lyrics for ${trackId}, skipping`);
              return false;
            }
            const sig = getLinesSignature(parsed);
            if (rejectedLyricsSignatures[trackId]?.has(sig)) {
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

          for (const aName of artistVariants) {
            if (exactResult) break;
            for (const tName of trackVariants) {
              try {
                const params = new URLSearchParams({ artist_name: aName, track_name: tName });
                if (durationSec > 0) params.set("duration", durationSec);
                const res = await fetch(`https://lrclib.net/api/get?${params}`, { signal });
                if (res.ok) {
                  const d = await res.json();
                  if (d && (hasLrcTimestamps(d.syncedLyrics) || d.plainLyrics)) {
                    const lrc = d.syncedLyrics || d.plainLyrics;
                    const parsed = parseLRC(lrc);
                    if (!isPollutedYeatLyrics(parsed)) {
                      const sig = getLinesSignature(parsed);
                      if (!rejectedLyricsSignatures[trackId]?.has(sig)) {
                        exactResult = d;
                        console.debug(`[LF-DEBUG] LRCLIB exact GET matched with artist="${aName}", track="${tName}"`);
                        break;
                      }
                    } else {
                      console.debug(`[LF-DEBUG] LRCLIB exact GET rejected polluted Yeat lyrics for artist="${aName}", track="${tName}"`);
                    }
                  }
                }
              } catch (e) { /* continue */ }
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
            const lrc = r.syncedLyrics || r.plainLyrics || "";
            const lines = parseLRC(lrc);
            if (isPollutedYeatLyrics(lines)) return false;
            const rArtist = (r.artistName || "").toLowerCase();
            const rTrack = (r.trackName || "").toLowerCase();
            return rArtist.includes(sArtist) || sArtist.includes(rArtist) ||
                   rArtist.includes(sAllArtists) || sAllArtists.includes(rArtist) ||
                   rTrack.includes(sTrack) || sTrack.includes(rTrack);
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

          candidatePool = [...syncedList, ...plainList];
        } else {
          candidatePool = [exactResult];
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

    // 1. Run Primary Provider (LyricsPlus v2)
    let lpSuccess = false;
    if (!options.forceRefresh || trackLyricsCandidateIndex[trackId] === 1) {
      lpSuccess = await lyricsPlusFetch();
    }

    if (lpSuccess) {
      manageLyricsCache(cacheKey);
      return;
    }

    // 2. Query Rust multi-provider engine (combines Proxy + LRCLIB + Musixmatch + NetEase with ranking & candidate cycling)
    const rustSuccess = await rustLyricsFetch();
    if (rustSuccess) {
      manageLyricsCache(cacheKey);
      return;
    }

    // 3. Fallback: Direct web proxy & LRCLIB if Rust engine found no match
    const proxyTask = proxyFetch();
    const lrclibTask = localLrclibFetch();
    await Promise.allSettled([proxyTask, lrclibTask]);

    if (lyrics.length === 0 && trackId === currentTrackId) {
      await ovhFetch();
    }

    if (lyrics.length === 0 && options.forceRefresh && trackId === currentTrackId) {
      if (isDynamicIslandMode) {
        showIslandHud({ icon: "⚠️", text: "No alternatives", showBar: false });
      } else {
        showToast("No alternative lyrics found in database for this track.", 3000, 'warning');
      }
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
  const extraInfo = [candidateInfo, sourceName].filter(Boolean).join(" · ");
  const tooltipSuffix = extraInfo ? ` (${extraInfo})` : "";

  if (level === 3) {
    badge.classList.add("word-synced");
    text.textContent = "Word Timing";
    badge.title = `High-Fidelity Word Timing (Synced)${tooltipSuffix}. Click to find alternative lyrics (Ctrl+R).`;
    badge.style.display = "inline-flex";
  } else if (level === 2) {
    badge.classList.add("line-synced");
    text.textContent = "Line Sync";
    badge.title = `Line-Synced Lyrics${tooltipSuffix}. Click to find alternative lyrics (Ctrl+R).`;
    badge.style.display = "inline-flex";
  } else if (level === 1) {
    badge.classList.add("plain");
    text.textContent = "Plain Text";
    badge.title = `Plain Text Lyrics (No Sync)${tooltipSuffix}. Click to find alternative lyrics (Ctrl+R).`;
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

  // Refresh marquee on track name since badge visibility/width changes available space
  const trackWrap = document.getElementById("widget-track-name-wrapper");
  if (trackWrap && typeof widgetTrackName !== 'undefined' && widgetTrackName) {
    updateMarqueeOverflow(trackWrap, widgetTrackName);
  }
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
  const title = (widgetTrackName && widgetTrackName.textContent !== "Not Playing") ? widgetTrackName.textContent : "";
  const artist = (widgetArtistName && widgetArtistName.textContent !== "Spotify") ? widgetArtistName.textContent : "";
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
          btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2.5"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/></svg>';
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

  const isVideoActive = widgetAlbumArtVideo && widgetAlbumArtVideo.style.display !== 'none' && widgetAlbumArtVideo.src;
  // Always strictly prioritize the exact artwork currently visible in the minimized widget thumbnail
  const visibleArt = (widgetAlbumArt && widgetAlbumArt.src && widgetAlbumArt.style.display !== 'none')
    ? widgetAlbumArt.src
    : (currentStaticAlbumArtUrl || (widgetAlbumArt && widgetAlbumArt.src ? widgetAlbumArt.src : ''));

  if (isVideoActive && vidEl) {
    if (vidEl.src !== widgetAlbumArtVideo.src) {
      vidEl.src = widgetAlbumArtVideo.src;
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
      vidEl.style.display = 'none';
    }
  } else {
    return;
  }

  const trackName = (widgetTrackName && widgetTrackName.textContent !== "Not Playing")
    ? widgetTrackName.textContent
    : ((typeof currentTrackName !== 'undefined' ? currentTrackName : '') || "Unknown Track");
  const artistName = (widgetArtistName && widgetArtistName.textContent !== "Spotify")
    ? widgetArtistName.textContent
    : ((typeof currentArtistName !== 'undefined' ? currentArtistName : '') || "Unknown Artist");

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
  if (!modal) return;
  modal.classList.remove('show');
  if (vidEl) {
    vidEl.pause();
  }
  updateAutoHideState();
  setTimeout(() => {
    if (!modal.classList.contains('show')) {
      modal.style.display = 'none';
    }
  }, 280);
}

// Render lyrics to DOM
function getLyricWordEndMs(words, wordIndex, lineData, lineIndex) {
  const word = words && words[wordIndex];
  if (!word) return 0;
  const startMs = (word.start != null && Number.isFinite(Number(word.start)))
    ? Number(word.start) * 1000
    : (Number(word.timeMs) || 0);
  if (word.endMs != null && Number(word.endMs) > 0) return Number(word.endMs);
  if (word.end != null && Number(word.end) > 0) return Number(word.end) * 1000;
  if (word.durationMs != null && Number(word.durationMs) > 0) return startMs + Number(word.durationMs);
  if (word.duration != null && Number(word.duration) > 0) {
    const duration = Number(word.duration);
    return startMs + (duration > 50 ? duration : duration * 1000);
  }
  const nextWord = words[wordIndex + 1];
  if (nextWord) {
    const nextStart = (nextWord.start != null && Number.isFinite(Number(nextWord.start)))
      ? Number(nextWord.start) * 1000
      : Number(nextWord.timeMs);
    if (Number.isFinite(nextStart) && nextStart > startMs) return nextStart;
  }

  // --- Fallback for the LAST word of a line ---
  const wordTextLen = (word.text || '').trim().length;
  const naturalWordDur = Math.max(500, Math.min(2200, wordTextLen * 160 + 400));

  // If next line starts soon, cap to before next line
  if (Array.isArray(lyrics) && lineIndex >= 0 && lyrics[lineIndex + 1]) {
    const nextLine = lyrics[lineIndex + 1];
    const nextLineMs = Number(nextLine.timeMs) || (Number(nextLine.start) * 1000) || 0;
    if (nextLineMs > startMs && nextLineMs < startMs + naturalWordDur) {
      return Math.max(startMs + 50, nextLineMs - 50);
    }
  }

  // If lineData has an explicit line duration or end that is reasonable (< 3500ms from startMs):
  const lineStartMs = Number(lineData?.timeMs) || (Number(lineData?.start) * 1000) || startMs;
  let lineEndMs = 0;
  if (lineData?.end != null && Number(lineData.end) > 0) lineEndMs = Number(lineData.end) * 1000;
  else if (lineData?.durationMs != null && Number(lineData.durationMs) > 0) lineEndMs = lineStartMs + Number(lineData.durationMs);
  else if (lineData?.duration != null && Number(lineData.duration) > 0) {
    const duration = Number(lineData.duration);
    lineEndMs = lineStartMs + (duration > 50 ? duration : duration * 1000);
  }
  if (lineEndMs > startMs && (lineEndMs - startMs) <= 3500) {
    return lineEndMs;
  }

  return startMs + naturalWordDur;
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
  const previousValue = span.style.getPropertyValue('--word-progress');
  const previous = previousValue ? Number(previousValue) : NaN;
  if (Number.isFinite(previous) && previous === bounded) return;
  if (Number.isFinite(previous) && Math.abs(bounded - previous) < 0.005 && bounded !== 0 && bounded !== 1) return;
  const value = bounded.toFixed(3);
  span.style.setProperty('--word-progress', value);
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

  // RULE 3b: NEVER insert space between continuous Hanzi characters
  const curIsHanzi = /[\u4e00-\u9fff]$/.test(curTrim);
  const nextIsHanzi = /^[\u4e00-\u9fff]/.test(nextTrim);
  if (curIsHanzi && nextIsHanzi) {
    return false;
  }

  // RULE 4: Align with ground-truth lineText if available
  const cleanLine = typeof lineText === 'string' ? cleanLyricText(lineText) : '';
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

  // Syllable continuity check: If cleanLine contains syllables together without space, NEVER insert space!
  const cleanCur = curTrim.replace(/^[“‘«\(\{\[「『（【［｛《"']+/, '').replace(/[,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》"']+$/, '');
  const cleanNext = nextTrim.replace(/^[“‘«\(\{\[「『（【［｛《"']+/, '').replace(/[,.!?;:’”'»\)}\]…~～、。，．！？–—）】］｝》"']+$/, '');
  if (cleanCur && cleanNext && cleanLine && cleanLine.includes(cleanCur + cleanNext)) {
    return false;
  }

  // If word token carries explicit spacing decision from parser (e.g. w.hasSpace === false)
  if (words[wordIndex]?.hasSpace === false && !/^\s/.test(nextWord)) {
    return false;
  }
  if (words[wordIndex]?.hasSpace === true) {
    return true;
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

function appendTimedWordSpans(container, words, lineText, className, dataName) {
  const reconciled = reconcileTimedWords(words, lineText);
  const searchState = { position: 0 };
  reconciled.forEach((word, index) => {
    const rawText = String(word?.text ?? word ?? '');
    const span = document.createElement('span');
    span.className = className;
    span.textContent = rawText.trim();
    if (dataName) span.dataset[dataName] = index;
    container.appendChild(span);
    if (index < reconciled.length - 1 && needsTimedWordSpace(reconciled, index, lineText || '', searchState)) {
      container.appendChild(document.createTextNode(' '));
    }
  });
}

function timedWordSpansHtml(words, lineText) {
  const reconciled = reconcileTimedWords(words, lineText);
  const searchState = { position: 0 };
  return reconciled.map((word, index) => {
    const text = String(word?.text ?? word ?? '');
    const span = `<span class="lyric-word" data-word-idx="${index}">${escapeHTML(text.trim())}</span>`;
    return span + (index < reconciled.length - 1 && needsTimedWordSpace(reconciled, index, lineText || '', searchState) ? ' ' : '');
  }).join('');
}

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
    manualLyricScrollY = null;
    hideResyncButton();
    updateTimingStatus(-1);
    const btnHide = document.getElementById("btn-hide-lyrics");
    if (btnHide) btnHide.style.display = "none";
    updateAutoHideState();
    if (isCinematicView || cinematicMainRendererInstance) {
      syncCinematicState();
    }
    return;
  }

  // Only enable visual "dimming" of the line if we actually have words to highlight
  const hasAnyWordTiming = lyrics.some(l => l.words && l.words.length > 0);
  document.body.classList.toggle("wbw-active", (settings.wordByWord !== false) && hasAnyWordTiming);

  lyricsContainer.innerHTML = "";
  manualLyricScrollY = null;
  const frag = document.createDocumentFragment();
  cachedLineEls = [];
  lyrics.forEach((line, index) => {
    const el = document.createElement("div");
    el.className = "lyric-line";
    el.dataset.index = index;
    el.style.transformOrigin = `${settings.textAlign} center`;

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
        seekPlayback(timeMs);
        userScrolling = false;
        manualLyricScrollY = null;
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
        seekPlayback(timeMs);
        setTimeout(pollSpotifyPlayback, 300);
      }
    });

    // Feature: Right-click lyric line to open share card at that line
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (typeof window.openShareModal === 'function') {
        window.openShareModal(index);
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
  if (isCinematicView || cinematicMainRendererInstance) {
    syncCinematicState();
  }
}

let cachedViewportHeight = 0;
let cachedLineMetrics = [];

function invalidateLyricMetrics(andScroll = true) {
  cachedLineMetrics = [];
  cachedViewportHeight = 0;
  if (!lyrics || lyrics.length === 0 || !cachedLineEls || cachedLineEls.length === 0) return;

  requestAnimationFrame(() => {
    measureLyricMetrics();
    if (andScroll && activeLineIndex >= 0 && !userScrolling) {
      const idx = activeLineIndex;
      activeLineIndex = -1;
      scrollLyrics(idx);
    }
  });
}

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
  if (isDynamicIslandMode) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
      return;
    }
    const isTilde = e.key === '`' || e.code === 'Backquote';
    const isCombo = e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'G';
    const isGhostActive = document.body.classList.contains('island-ghost-mode');
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
  if (isDynamicIslandMode || settings.taskbarMode || isCinematicView) return;
  if (index === activeLineIndex) return;
  if (cachedLineEls.length === 0) return;

  // Clear nearby-1 from previous adjacent lines
  if (window._lastNearbyLines) {
    window._lastNearbyLines.forEach(el => {
      if (el) el.classList.remove("nearby-1");
    });
    window._lastNearbyLines = null;
  }

  // Update classes
  if (activeLineIndex >= 0 && cachedLineEls[activeLineIndex]) {
    cachedLineEls[activeLineIndex].classList.remove("active");
  }

  activeLineIndex = index;

  if (activeLineIndex >= 0 && cachedLineEls[activeLineIndex]) {
    const activeEl = cachedLineEls[activeLineIndex];
    activeEl.classList.add("active");

    // Apply Apple Music cinematic optical blur to adjacent lines (±1)
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
    lyricsContainer.style.transform = `translate3d(0, ${translateY}px, 0)`;
  } else {
    hideLiveMeaningPill();
  }
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

  const syncProgress = getAcousticSyncProgress();
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

    const isRecentSeek = (Date.now() - lastUserSeekTimestamp) < 1200;
    if (window._allowClockConvergence) {
      window._allowClockConvergence = false;
    } else if (isPlaying && !isRecentSeek && previousProgress > 0 && currentProgress < previousProgress) {
      // Enforce strict monotonic progression during active playback:
      // prevents micro backward time-travel caused by network clock slew or polling jitter
      currentProgress = previousProgress;
    }

    if (currentProgress > trackDuration) {
      currentProgress = trackDuration;
    }

    // Update widget UI progress
    if (config) {
      const fillPercent = trackDuration > 0 ? (currentProgress / trackDuration) * 100 : 0;
      
      if (!isScrubbingMainProgress) {
        // Throttle progress bar visual updates (only update if changed significantly)
        if (Math.abs((window._lastFillPercent || 0) - fillPercent) > 0.1) {
          widgetProgressFill.style.width = `${fillPercent}%`;
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
            const nextLine = lyrics[activeLineIndex + 1];
            if (syncProgress >= curTime && (!nextLine || syncProgress < nextLine.timeMs)) {
              activeIndex = activeLineIndex;
            } else if (nextLine && syncProgress >= nextLine.timeMs) {
              const lineAfter = lyrics[activeLineIndex + 2];
              if (!lineAfter || syncProgress < lineAfter.timeMs) {
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
          }
        }

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

        // Only run main app lyrics scrolling and word-by-word highlighting when in normal window mode (not cinematic view)
        if (!isDynamicIslandMode && !settings.taskbarMode && !isCinematicView) {
          scrollLyrics(activeIndex);

          // Word-by-Word karaoke highlight
          if ((settings.wordByWord !== false) && activeIndex >= 0) {
            const activeEl = cachedLineEls[activeIndex];
            const lineData = lyrics[activeIndex];

            if (activeEl && lineData) {
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
                        span.style.removeProperty('--word-progress');
                      }
                    });
                  }
                  const activeWi = wordStates.indexOf('active');
                  if (activeWi >= 0 && lineData.words[activeWi] && wordSpans[activeWi]) {
                    const activeW = lineData.words[activeWi];
                    const wStart = (activeW.start != null ? activeW.start * 1000 : activeW.timeMs) || 0;
                    const wEnd = getLyricWordEndMs(lineData.words, activeWi, lineData, activeIndex);
                    const wDur = Math.max(50, wEnd - wStart);
                    const wordProgress = Math.min(1, Math.max(0, (syncProgress - wStart) / wDur));
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
                      : getLyricWordEndMs(lineData.words, activeWordIdx, lineData, activeIndex);
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
                        span.style.removeProperty('--word-progress');
                      }
                    });
                  }

                  if (currentActiveWord >= 0 && lineData.words[currentActiveWord] && wordSpans[currentActiveWord]) {
                    const activeW = lineData.words[currentActiveWord];
                    const wStart = (activeW.start != null ? activeW.start * 1000 : activeW.timeMs) || 0;
                    const nextW = lineData.words[currentActiveWord + 1];
                    const nextWStart = nextW
                      ? ((nextW.start != null ? nextW.start * 1000 : nextW.timeMs) || (wStart + 500))
                      : getLyricWordEndMs(lineData.words, currentActiveWord, lineData, activeIndex);
                    const wEnd = getLyricWordEndMs(lineData.words, currentActiveWord, lineData, activeIndex);
                    const wDur = Math.max(50, wEnd - wStart);
                    const wordProgress = Math.min(1, Math.max(0, (syncProgress - wStart) / wDur));
                    setLyricWordProgress(wordSpans[currentActiveWord], wordProgress);
                  }
                }
              }
            }
          }
        }

        // Update Dynamic Island lyric line with smart synchronization
        try {
          if (isDynamicIslandMode && !isIslandSleeping) {
            const islandSync = getDynamicIslandSyncData(syncProgress);
            updateDynamicIslandLyric(islandSync.lineIndex, islandSync.lineData, syncProgress, islandSync.isInstrumental, islandSync.countdownMs);
          }
        } catch (err) {
          console.warn("[DynamicIsland] Error updating lyric line:", err);
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

            if ((settings.wordByWord !== false) && hasRealWordTiming) {
              // Render word-by-word spans for taskbar if not already rendered for this line
              if (tbLyricLine.dataset.lineIndex !== String(activeIndex)) {
                tbLyricLine.innerHTML = '';
                tbLyricLine.dataset.lineIndex = activeIndex;

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
                  sendTaskbarLyric(tbLyricLine.textContent, false, tbLyricLine.innerHTML);
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
                    : getLyricWordEndMs(lineData.words, activeWordIdx, lineData, activeIndex);
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
                  sendTaskbarLyric(tbLyricLine.textContent, false, tbLyricLine.innerHTML);
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
    } else {
      try {
        if (isDynamicIslandMode && !isIslandSleeping) {
          updateDynamicIslandLyric(-1, null, currentProgress, false);
        }
      } catch (_) {}
    }

    if (isKineticMode && kineticRendererInstance) {
      kineticRendererInstance.seek(currentProgress);
    }

    if (isCinematicView && cinematicMainRendererInstance && !settings.wallpaperMode && !settings.taskbarMode && !isDynamicIslandMode) {
      const syncProgress = getAcousticSyncProgress();
      cinematicMainRendererInstance.seek(syncProgress);
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
    syncDynamicIslandState();
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

async function fetchFallbackAlbumArt(trackName, artistName, albumName = null) {
  if (!trackName) return null;
  const rawArtist = (artistName || "").replace(/\s*-\s*Topic$/i, "").trim();
  const rawTrack = trackName.trim();

  // Instant dual-key cache lookup (0ms)
  const dualKey = `${rawArtist}:::${rawTrack}`.toLowerCase().trim();
  if (localArtCache[dualKey] && localArtCache[dualKey] !== 'fetching' && localArtCache[dualKey] !== 'notfound') {
    return localArtCache[dualKey];
  }

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
  if (!widgetAlbumArt.src || widgetAlbumArt.style.display === 'none') {
    widgetAlbumArt.src = artUrl;
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
    updateModeButtonsState
  };
}
