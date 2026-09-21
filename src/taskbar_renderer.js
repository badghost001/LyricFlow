// === LyricFlow Taskbar Renderer ===
// Window is full taskbar width and docked to the Windows taskbar strip.
// Text is draggable along the strip and clicks pass through when not interacting with lyrics.

const lyricEl    = document.getElementById('tb-lyric');
const progressEl = document.getElementById('tb-progress');

let currentPosition = 'bottom'; // 'bottom' | 'top' | 'left' | 'right'
document.body.className = `pos-${currentPosition}`;

let lyricOffsetX = 0;
let lyricOffsetY = 0;

try {
  const savedX = parseFloat(localStorage.getItem('tb_lyric_offset_x'));
  const savedY = parseFloat(localStorage.getItem('tb_lyric_offset_y'));
  if (!isNaN(savedX)) lyricOffsetX = savedX;
  if (!isNaN(savedY)) lyricOffsetY = savedY;
} catch (e) {}

let dragStartMouseX = 0;
let dragStartMouseY = 0;
let dragStartOffset = 0;
let isDragging      = false;
let hasMoved        = false;

function isVertical() {
  return currentPosition === 'left' || currentPosition === 'right';
}

function reportBounds() {
  if (!window.taskbarAPI || !window.taskbarAPI.updateLyricBounds) return;
  if (!lyricEl || lyricEl.classList.contains('tb-hidden') || !lyricEl.textContent || lyricEl.textContent.trim() === '' || lyricEl.textContent === '♫') {
    window.taskbarAPI.updateLyricBounds({ x: 0, y: 0, width: 0, height: 0 });
    return;
  }
  const rect = lyricEl.getBoundingClientRect();
  window.taskbarAPI.updateLyricBounds({
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  });
}

function applyOffset() {
  if (isVertical()) {
    const maxOffset = Math.max(10, (window.innerHeight / 2) - 40);
    lyricOffsetY = Math.max(-maxOffset, Math.min(maxOffset, lyricOffsetY));
    lyricEl.style.top       = `calc(50% + ${lyricOffsetY}px)`;
    lyricEl.style.left      = '';
    lyricEl.style.transform = 'translateY(-50%)';
  } else {
    const maxOffset = Math.max(10, (window.innerWidth / 2) - 40);
    lyricOffsetX = Math.max(-maxOffset, Math.min(maxOffset, lyricOffsetX));
    lyricEl.style.left      = `calc(50% + ${lyricOffsetX}px)`;
    lyricEl.style.top       = '';
    lyricEl.style.transform = 'translateX(-50%)';
  }
  reportBounds();
}

applyOffset();

// ── Drag & Click interactions ──────────────────────────────────────────────
// Suppress context menu & right-click actions completely in taskbar mode
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
}, { capture: true });

lyricEl.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
}, { capture: true });

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

lyricEl.addEventListener('mousedown', (e) => {
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
  lyricEl.classList.add('dragging');
  if (window.taskbarAPI && window.taskbarAPI.setDragging) {
    window.taskbarAPI.setDragging(true);
  }
});

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

document.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  lyricEl.classList.remove('dragging');
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
});

// Restore/open main app on intentional double-click
lyricEl.addEventListener('dblclick', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (window.taskbarAPI && window.taskbarAPI.openApp) {
    window.taskbarAPI.openApp();
  }
});

// Middle-click to quickly toggle Play/Pause directly from the taskbar; ignore right click
lyricEl.addEventListener('auxclick', (e) => {
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

lyricEl.title = "Double-click to open LyricFlow\nDrag along taskbar to reposition\nMiddle-click to Play/Pause";

document.addEventListener('mouseleave', () => {
  if (isDragging) {
    isDragging = false;
    lyricEl.classList.remove('dragging');
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
    }
    reportBounds();
  }
});

// ── IPC: lyrics + progress ─────────────────────────────────────────────────
function handleTaskbarData(data) {
  if (!data) return;
  if (data.hidden !== undefined) {
    if (data.hidden) {
      lyricEl.classList.add('tb-hidden');
      progressEl.classList.add('tb-hidden');
    } else {
      lyricEl.classList.remove('tb-hidden');
      progressEl.classList.remove('tb-hidden');
    }
  }

  if (data.html !== undefined && data.html) {
    lyricEl.innerHTML = data.html;
    if (data.hidden !== true) {
      lyricEl.classList.remove('tb-hidden');
      progressEl.classList.remove('tb-hidden');
    }
  } else if (data.text !== undefined) {
    if (data.text) {
      lyricEl.textContent = data.text;
      if (data.hidden !== true) {
        lyricEl.classList.remove('tb-hidden');
        progressEl.classList.remove('tb-hidden');
      }
    } else if (!data.hidden) {
      lyricEl.textContent = '♫';
    }
  }

  if (data.progress !== undefined) {
    if (isVertical()) {
      progressEl.style.height = Math.min(100, Math.max(0, data.progress)) + '%';
      progressEl.style.width = '2px';
    } else {
      progressEl.style.width = Math.min(100, Math.max(0, data.progress)) + '%';
      progressEl.style.height = '2px';
    }
  }

  reportBounds();
}

// ── IPC: config ────────────────────────────────────────────────────────────
function handleTaskbarConfig(cfg) {
  if (!cfg) return;
  if (cfg.position && cfg.position !== currentPosition) {
    document.body.classList.remove(`pos-${currentPosition}`);
    currentPosition = cfg.position;
    document.body.classList.add(`pos-${currentPosition}`);
    applyOffset();
  }
  if (cfg.accentColor) progressEl.style.background = cfg.accentColor;
  if (cfg.textColor) lyricEl.style.color = cfg.textColor;
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
setTimeout(reportBounds, 300);
setTimeout(reportBounds, 1000);

// Notify main window that taskbar DOM is loaded and ready to receive lyrics
try {
  if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.emit) {
    window.__TAURI__.event.emit('taskbar-mode-ready', {});
  }
} catch (_) {}
