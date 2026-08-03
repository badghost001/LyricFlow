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
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const overLyric = el === lyricEl || lyricEl.contains(el);

  if (overLyric && isClickThrough) {
    isClickThrough = false;
    window.taskbarAPI.setClickThrough(false); // capture clicks
  } else if (!overLyric && !isClickThrough && !isDragging) {
    isClickThrough = true;
    window.taskbarAPI.setClickThrough(true);  // pass clicks through
  }
});

// ── Drag & Click (moves text on drag, opens app on single click) ───────────
let lyricOffsetX    = 0;
let dragStartMouseX = 0;
let dragStartOffset = 0;
let isDragging      = false;
let hasMoved        = false;

function applyOffset() {
  const maxOffset = (window.innerWidth / 2) - 40;
  lyricOffsetX = Math.max(-maxOffset, Math.min(maxOffset, lyricOffsetX));
  lyricEl.style.left      = `calc(50% + ${lyricOffsetX}px)`;
  lyricEl.style.transform = 'translateX(-50%)';
}

lyricEl.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  isDragging      = true;
  hasMoved        = false;
  dragStartMouseX = e.screenX;
  dragStartOffset = lyricOffsetX;
  lyricEl.classList.add('dragging');
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const deltaX = e.screenX - dragStartMouseX;
  if (Math.abs(deltaX) > 4) {
    hasMoved = true;
  }
  if (hasMoved) {
    lyricOffsetX = dragStartOffset + deltaX;
    applyOffset();
  }
}, { capture: false });

document.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  lyricEl.classList.remove('dragging');

  if (hasMoved) {
    window.taskbarAPI.saveOffset(lyricOffsetX);
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
      window.taskbarAPI.saveOffset(lyricOffsetX);
    }
    isClickThrough = true;
    window.taskbarAPI.setClickThrough(true);
  }
});

// ── IPC: lyrics + progress ─────────────────────────────────────────────────
window.taskbarAPI.onUpdateLyric((data) => {
  if (data.text !== undefined) {
    lyricEl.textContent = data.text || '♫';
  }
  if (data.progress !== undefined) {
    progressEl.style.width = data.progress + '%';
  }
});

// ── IPC: config ────────────────────────────────────────────────────────────
window.taskbarAPI.onSyncConfig((cfg) => {
  if (cfg.accentColor)    progressEl.style.background = cfg.accentColor;
  if (cfg.textColor)      lyricEl.style.color = cfg.textColor;
  if (cfg.lyricOffsetX !== undefined) {
    lyricOffsetX = cfg.lyricOffsetX;
    applyOffset();
  }
});
