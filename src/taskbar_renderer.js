// === LyricFlow Taskbar Renderer ===
// Clean, minimal lyric presentation docked to the Windows taskbar strip.
// Text is draggable along the available taskbar strip and clicks pass through when not interacting.
// Optional Glass presentation style supported; hover reveals compact playback controls.

const containerEl = document.getElementById('tb-container');
const lyricEl     = document.getElementById('tb-lyric');
const progressEl  = document.getElementById('tb-progress');
const controlsEl  = document.getElementById('tb-controls');
const btnPrev     = document.getElementById('tb-btn-prev');
const btnPlay     = document.getElementById('tb-btn-play');
const btnNext     = document.getElementById('tb-btn-next');
const iconPlay    = document.getElementById('tb-icon-play');
const iconPause   = document.getElementById('tb-icon-pause');

let currentPosition = 'bottom'; // 'bottom' | 'top' | 'left' | 'right'
let currentStyle    = 'minimal'; // 'minimal' (default) | 'glass'

document.body.className = `pos-${currentPosition} style-${currentStyle}`;

let lyricOffsetX = 0;
let lyricOffsetY = 0;

try {
  const savedX = parseFloat(localStorage.getItem('tb_lyric_offset_x'));
  const savedY = parseFloat(localStorage.getItem('tb_lyric_offset_y'));
  if (!isNaN(savedX)) lyricOffsetX = savedX;
  if (!isNaN(savedY)) lyricOffsetY = savedY;
  const savedStyle = localStorage.getItem('tb_presentation_style');
  if (savedStyle === 'glass' || savedStyle === 'minimal') {
    currentStyle = savedStyle;
  }
} catch (e) {}

let dragStartMouseX = 0;
let dragStartMouseY = 0;
let dragStartOffset = 0;
let isDragging      = false;
let hasMoved        = false;
let lastReportedBounds = null;

function isVertical() {
  return currentPosition === 'left' || currentPosition === 'right';
}

function setPresentationStyle(style) {
  currentStyle = (style === 'glass') ? 'glass' : 'minimal';
  document.body.classList.remove('style-minimal', 'style-glass');
  document.body.classList.add(`style-${currentStyle}`);
  if (containerEl) {
    containerEl.classList.remove('style-minimal', 'style-glass');
    containerEl.classList.add(`style-${currentStyle}`);
  }
  try {
    localStorage.setItem('tb_presentation_style', currentStyle);
  } catch (_) {}
  reportBounds();
}

function updatePlayState(isPlaying) {
  if (iconPlay && iconPause) {
    iconPlay.style.display = isPlaying ? 'none' : 'block';
    iconPause.style.display = isPlaying ? 'block' : 'none';
  }
}

function reportBounds() {
  if (!window.taskbarAPI || !window.taskbarAPI.updateLyricBounds) return;
  const target = containerEl || lyricEl;
  if (!target || target.classList.contains('tb-hidden') || !lyricEl || !lyricEl.textContent || lyricEl.textContent.trim() === '') {
    if (lastReportedBounds && lastReportedBounds.width === 0) return;
    lastReportedBounds = { x: 0, y: 0, width: 0, height: 0 };
    window.taskbarAPI.updateLyricBounds(lastReportedBounds);
    return;
  }
  const rect = target.getBoundingClientRect();
  const nextBounds = {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
  if (lastReportedBounds &&
      lastReportedBounds.x === nextBounds.x &&
      lastReportedBounds.y === nextBounds.y &&
      lastReportedBounds.width === nextBounds.width &&
      lastReportedBounds.height === nextBounds.height) {
    return;
  }
  lastReportedBounds = nextBounds;
  window.taskbarAPI.updateLyricBounds(nextBounds);
}

function applyOffset() {
  const target = containerEl || lyricEl;
  if (!target) return;

  if (isVertical()) {
    // Leave safe space at top (Start button ~60px) and bottom (clock/tray ~90px)
    const screenH = window.innerHeight || 1080;
    const maxOffset = Math.max(20, Math.floor((screenH / 2) - 100));
    lyricOffsetY = Math.max(-maxOffset, Math.min(maxOffset, lyricOffsetY));
    target.style.top       = `calc(50% + ${lyricOffsetY}px)`;
    target.style.left      = '50%';
    target.style.transform = 'translate(-50%, -50%)';
  } else {
    // Leave safe space at left (Start button + app icons, min 180px) and right (system tray / clock, min 220px)
    const screenW = window.innerWidth || 1920;
    const maxOffset = Math.max(20, Math.floor((screenW / 2) - 220));
    lyricOffsetX = Math.max(-maxOffset, Math.min(maxOffset, lyricOffsetX));
    target.style.left      = `calc(50% + ${lyricOffsetX}px)`;
    target.style.top       = '50%';
    target.style.transform = 'translate(-50%, -50%)';
  }
  reportBounds();
}

setPresentationStyle(currentStyle);
applyOffset();

// ── Hover Controls Interaction ─────────────────────────────────────────────
if (btnPrev) {
  btnPrev.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.taskbarAPI && window.taskbarAPI.prevTrack) {
      window.taskbarAPI.prevTrack();
    }
  });
}

if (btnPlay) {
  btnPlay.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.taskbarAPI && window.taskbarAPI.togglePlayPause) {
      window.taskbarAPI.togglePlayPause();
    }
  });
}

if (btnNext) {
  btnNext.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.taskbarAPI && window.taskbarAPI.nextTrack) {
      window.taskbarAPI.nextTrack();
    }
  });
}

// ── Drag & Click interactions ──────────────────────────────────────────────
// Suppress context menu & right-click actions completely in taskbar mode
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
}, { capture: true });

const dragTarget = containerEl || lyricEl;

if (dragTarget) {
  dragTarget.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, { capture: true });

  dragTarget.addEventListener('mousedown', (e) => {
    // Ignore clicks inside controls so buttons receive normal clicks
    if (e.target && e.target.closest && e.target.closest('#tb-controls')) {
      return;
    }
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging      = true;
    hasMoved        = false;
    dragStartMouseX = e.screenX;
    dragStartMouseY = e.screenY;
    dragStartOffset = isVertical() ? lyricOffsetY : lyricOffsetX;
    dragTarget.classList.add('dragging');
    if (window.taskbarAPI && window.taskbarAPI.setDragging) {
      window.taskbarAPI.setDragging(true);
    }
  });

  // Restore/open main app on intentional double-click
  dragTarget.addEventListener('dblclick', (e) => {
    if (e.target && e.target.closest && e.target.closest('#tb-controls')) return;
    e.preventDefault();
    e.stopPropagation();
    if (window.taskbarAPI && window.taskbarAPI.openApp) {
      window.taskbarAPI.openApp();
    }
  });

  // Middle-click to quickly toggle Play/Pause directly from the taskbar; ignore right click
  dragTarget.addEventListener('auxclick', (e) => {
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      if (window.taskbarAPI && window.taskbarAPI.togglePlayPause) {
        window.taskbarAPI.togglePlayPause();
      }
    }
  });

  dragTarget.title = "Double-click to open LyricFlow\nDrag along taskbar to reposition\nMiddle-click to Play/Pause";
}

window.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    e.preventDefault();
    e.stopPropagation();
  }
}, { capture: true });

window.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    e.preventDefault();
    e.stopPropagation();
  }
}, { capture: true });

window.addEventListener('click', (e) => {
  if (e.button === 2) {
    e.preventDefault();
    e.stopPropagation();
  }
}, { capture: true });

window.addEventListener('auxclick', (e) => {
  if (e.button === 2) {
    e.preventDefault();
    e.stopPropagation();
  }
}, { capture: true });

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const delta = isVertical() ? (e.screenY - dragStartMouseY) : (e.screenX - dragStartMouseX);
  if (Math.abs(delta) > 4) {
    hasMoved = true;
  }
  if (hasMoved) {
    if (isVertical()) {
      lyricOffsetY = dragStartOffset + delta;
    } else {
      lyricOffsetX = dragStartOffset + delta;
    }
    applyOffset();
  }
}, { capture: false });

function endDrag() {
  if (!isDragging) return;
  isDragging = false;
  if (dragTarget) dragTarget.classList.remove('dragging');
  if (window.taskbarAPI && window.taskbarAPI.setDragging) {
    window.taskbarAPI.setDragging(false);
  }

  if (hasMoved) {
    const offsetVal = isVertical() ? lyricOffsetY : lyricOffsetX;
    try {
      if (isVertical()) {
        localStorage.setItem('tb_lyric_offset_y', String(lyricOffsetY));
      } else {
        localStorage.setItem('tb_lyric_offset_x', String(lyricOffsetX));
      }
    } catch (e) {}
    if (window.taskbarAPI && window.taskbarAPI.saveOffset) {
      window.taskbarAPI.saveOffset(offsetVal);
    }
    reportBounds();
  }
}

document.addEventListener('mouseup', endDrag);
document.addEventListener('mouseleave', endDrag);

function sanitizeTaskbarHtml(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const dangerous = doc.querySelectorAll('script, iframe, object, embed, style, link, meta, base');
    dangerous.forEach(el => el.remove());
    const allElements = doc.body.querySelectorAll('*');
    allElements.forEach(el => {
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        if (attr.name.startsWith('on') || attr.name === 'src' || attr.name === 'href') {
          el.removeAttribute(attr.name);
        }
      }
    });

    // Ensure whitespace text nodes between tb-lyric-word elements become tb-word-space elements
    // so CSS flexbox will never collapse or drop them
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      if (node.nodeValue === ' ' || /^\s+$/.test(node.nodeValue)) {
        const prev = node.previousElementSibling || node.previousSibling;
        if (prev && prev.nodeType === 1 && prev.classList && prev.classList.contains('tb-lyric-word')) {
          const spaceSpan = doc.createElement('span');
          spaceSpan.className = 'tb-word-space';
          spaceSpan.textContent = ' ';
          node.parentNode.replaceChild(spaceSpan, node);
        }
      }
    }

    return doc.body.innerHTML;
  } catch (_) {
    return '';
  }
}

// ── IPC: lyrics + progress ─────────────────────────────────────────────────
function handleTaskbarData(data) {
  if (!data) return;
  let layoutChanged = false;
  const target = containerEl || lyricEl;

  if (data.isPlaying !== undefined) {
    updatePlayState(Boolean(data.isPlaying));
  }

  if (data.hidden !== undefined) {
    const wasHidden = target ? target.classList.contains('tb-hidden') : false;
    if (data.hidden) {
      if (target) target.classList.add('tb-hidden');
      if (lyricEl) lyricEl.classList.add('tb-hidden');
      if (progressEl) progressEl.classList.add('tb-hidden');
    } else {
      if (target) target.classList.remove('tb-hidden');
      if (lyricEl) lyricEl.classList.remove('tb-hidden');
      if (progressEl) progressEl.classList.remove('tb-hidden');
    }
    layoutChanged = wasHidden !== !!data.hidden;
  }

  if (data.html !== undefined && data.html) {
    if (lyricEl) {
      lyricEl.innerHTML = sanitizeTaskbarHtml(data.html);
      layoutChanged = true;
    }
    if (data.hidden !== true) {
      if (target) target.classList.remove('tb-hidden');
      if (lyricEl) lyricEl.classList.remove('tb-hidden');
      if (progressEl) progressEl.classList.remove('tb-hidden');
    }
  } else if (data.text !== undefined &&
      !(Array.isArray(data.wordStates) && lyricEl && lyricEl.querySelector('.tb-lyric-word'))) {
    if (data.text) {
      if (lyricEl && lyricEl.textContent !== data.text) {
        lyricEl.textContent = data.text;
        layoutChanged = true;
      }
      if (data.hidden !== true) {
        if (target) target.classList.remove('tb-hidden');
        if (lyricEl) lyricEl.classList.remove('tb-hidden');
        if (progressEl) progressEl.classList.remove('tb-hidden');
      }
    } else if (!data.hidden && lyricEl) {
      lyricEl.textContent = '♫';
    }
  }

  if (Array.isArray(data.wordStates) && lyricEl) {
    const spans = lyricEl.querySelectorAll('.tb-lyric-word');
    if (spans.length === data.wordStates.length) {
      spans.forEach((span, index) => {
        const state = data.wordStates[index] || 'upcoming';
        span.classList.toggle('lyric-word-completed', state === 'completed');
        span.classList.toggle('lyric-word-passed', state === 'completed');
        span.classList.toggle('lyric-word-active', state === 'active');
        span.classList.toggle('lyric-word-upcoming', state === 'upcoming');
      });
    }
  }

  if (data.progress !== undefined && progressEl) {
    const pct = Math.min(100, Math.max(0, data.progress));
    if (isVertical()) {
      progressEl.style.height = pct + '%';
      progressEl.style.width = '2px';
    } else {
      progressEl.style.width = pct + '%';
      progressEl.style.height = '2px';
    }
  }

  if (layoutChanged) reportBounds();
}

// ── IPC: config ────────────────────────────────────────────────────────────
function handleTaskbarConfig(cfg) {
  if (!cfg) return;
  if (cfg.style !== undefined) {
    setPresentationStyle(cfg.style);
  } else if (cfg.taskbarStyle !== undefined) {
    setPresentationStyle(cfg.taskbarStyle);
  }
  if (cfg.position && cfg.position !== currentPosition) {
    document.body.classList.remove(`pos-${currentPosition}`);
    currentPosition = cfg.position;
    document.body.classList.add(`pos-${currentPosition}`);
    applyOffset();
  }
  if (cfg.accentColor) {
    document.documentElement.style.setProperty('--tb-accent', cfg.accentColor);
    if (progressEl) progressEl.style.background = cfg.accentColor;
  }
  if (cfg.textColor) {
    document.documentElement.style.setProperty('--tb-text', cfg.textColor);
    if (lyricEl) lyricEl.style.color = cfg.textColor;
  }
  const newOffset = cfg.lyricOffsetX !== undefined ? cfg.lyricOffsetX : cfg.taskbarOffset;
  if (newOffset !== undefined && !isDragging) {
    if (isVertical()) {
      lyricOffsetY = newOffset;
      try { localStorage.setItem('tb_lyric_offset_y', String(lyricOffsetY)); } catch (e) {}
    } else {
      lyricOffsetX = newOffset;
      try { localStorage.setItem('tb_lyric_offset_x', String(lyricOffsetX)); } catch (e) {}
    }
    applyOffset();
  }
}

window.__onTaskbarLyric = handleTaskbarData;
window.__onTaskbarConfig = handleTaskbarConfig;

if (window.taskbarAPI && window.taskbarAPI.onUpdateLyric) {
  window.taskbarAPI.onUpdateLyric(handleTaskbarData);
}
if (window.taskbarAPI && window.taskbarAPI.onSyncConfig) {
  window.taskbarAPI.onSyncConfig(handleTaskbarConfig);
}

// Report initial bounds on load and resize
window.addEventListener('resize', () => {
  applyOffset();
});
setTimeout(reportBounds, 250);
setTimeout(reportBounds, 800);

// Notify main window that taskbar DOM is loaded and ready to receive lyrics
try {
  if (window.taskbarAPI && typeof window.taskbarAPI.taskbarReady === 'function') {
    window.taskbarAPI.taskbarReady();
  } else if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.emit) {
    window.__TAURI__.event.emit('taskbar-mode-ready', {});
  }
} catch (_) {}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sanitizeTaskbarHtml,
    handleTaskbarData,
    handleTaskbarConfig,
    setPresentationStyle,
    applyOffset,
    reportBounds
  };
}
