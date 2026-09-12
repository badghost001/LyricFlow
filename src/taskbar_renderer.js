// === LyricFlow Taskbar Renderer ===
// Window is full taskbar width and never moves.
// Click-through is ON by default — only disabled when hovering the lyrics.

const lyricEl    = document.getElementById('tb-lyric');
const progressEl = document.getElementById('tb-progress');

// ── Click-through toggle ───────────────────────────────────────────────────
// When the mouse is NOT over the lyric text, all clicks pass through to the
// taskbar underneath. When it IS over the lyric, clicks are captured for drag.

let isClickThrough = true;

// 'forward: true' means mousemove still gets forwarded even in click-through mode,
// so we can detect when the cursor enters the lyric area.
document.addEventListener('mousemove', (e) => {
  const overLyric = e.target === lyricEl || (lyricEl && lyricEl.contains(e.target));

  if (overLyric && isClickThrough) {
    isClickThrough = false;
    window.taskbarAPI.setClickThrough(false); // capture clicks
  } else if (!overLyric && !isClickThrough && !isDragging) {
    isClickThrough = true;
    window.taskbarAPI.setClickThrough(true);  // pass clicks through
  }
});

// ── Drag & Click (moves text on drag, opens app on single click) ───────────
let currentPosition = 'bottom'; // 'bottom' | 'top' | 'left' | 'right'
document.body.classList.add(`pos-${currentPosition}`);

let lyricOffsetX    = 0;
let lyricOffsetY    = 0;

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
}

applyOffset();


lyricEl.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  isDragging      = true;
  hasMoved        = false;
  dragStartMouseX = e.screenX;
  dragStartMouseY = e.screenY;
  dragStartOffset = isVertical() ? lyricOffsetY : lyricOffsetX;
  lyricEl.classList.add('dragging');
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

  if (hasMoved) {
    const offsetVal = isVertical() ? lyricOffsetY : lyricOffsetX;
    try {
      if (isVertical()) {
        localStorage.setItem('tb_lyric_offset_y', String(lyricOffsetY));
      } else {
        localStorage.setItem('tb_lyric_offset_x', String(lyricOffsetX));
      }
    } catch (e) {}
    window.taskbarAPI.saveOffset(offsetVal);
  } else {
    // Single click: restore/open the main application window
    window.taskbarAPI.openApp();
  }

  // Re-enable click-through now that drag/click is done
  isClickThrough = true;
  window.taskbarAPI.setClickThrough(true);
});

// If mouse leaves the window entirely during drag, cancel drag
document.addEventListener('mouseleave', () => {
  if (isDragging) {
    isDragging = false;
    lyricEl.classList.remove('dragging');
    if (hasMoved) {
      const offsetVal = isVertical() ? lyricOffsetY : lyricOffsetX;
      try {
        if (isVertical()) {
          localStorage.setItem('tb_lyric_offset_y', String(lyricOffsetY));
        } else {
          localStorage.setItem('tb_lyric_offset_x', String(lyricOffsetX));
        }
      } catch (e) {}
      window.taskbarAPI.saveOffset(offsetVal);
    }
    isClickThrough = true;
    window.taskbarAPI.setClickThrough(true);
  }
});

// ── IPC: lyrics + progress ─────────────────────────────────────────────────
window.taskbarAPI.onUpdateLyric((data) => {
  if (data.hidden !== undefined) {
    if (data.hidden) {
      lyricEl.classList.add('tb-hidden');
      progressEl.classList.add('tb-hidden');
    } else {
      lyricEl.classList.remove('tb-hidden');
      progressEl.classList.remove('tb-hidden');
    }
  }

  if (data.text !== undefined) {
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
      progressEl.style.height = data.progress + '%';
      progressEl.style.width = '2px';
    } else {
      progressEl.style.width = data.progress + '%';
      progressEl.style.height = '2px';
    }
  }
});

// ── IPC: config ────────────────────────────────────────────────────────────
window.taskbarAPI.onSyncConfig((cfg) => {
  if (cfg.position && cfg.position !== currentPosition) {
    document.body.classList.remove(`pos-${currentPosition}`);
    currentPosition = cfg.position;
    document.body.classList.add(`pos-${currentPosition}`);
    applyOffset();
  }
  if (cfg.accentColor)    progressEl.style.background = cfg.accentColor;
  if (cfg.textColor)      lyricEl.style.color = cfg.textColor;
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
});
