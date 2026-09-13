// === LyricFlow Taskbar Renderer ===
const tbContainer = document.getElementById('tb-container') || document.body;
const lyricEl    = document.getElementById('tb-lyric');
const progressEl = document.getElementById('tb-progress');

let dragStartMouseX = 0;
let isDragging      = false;
let hasMoved        = false;

tbContainer.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  isDragging = true;
  hasMoved = false;
  dragStartMouseX = e.screenX;
  tbContainer.classList.add('dragging');
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const deltaX = e.screenX - dragStartMouseX;
  if (Math.abs(deltaX) > 3) {
    hasMoved = true;
    dragStartMouseX = e.screenX;
    if (window.taskbarAPI && window.taskbarAPI.moveWindow) {
      window.taskbarAPI.moveWindow(deltaX);
    }
  }
});

document.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  tbContainer.classList.remove('dragging');

  if (!hasMoved) {
    // Single click: restore/open the main application window
    if (window.taskbarAPI && window.taskbarAPI.openApp) {
      window.taskbarAPI.openApp();
    }
  }
});

// IPC: lyrics + progress
if (window.taskbarAPI && window.taskbarAPI.onUpdateLyric) {
  window.taskbarAPI.onUpdateLyric((data) => {
    if (!data) return;
    if (data.hidden !== undefined) {
      if (data.hidden) {
        if (lyricEl) lyricEl.classList.add('tb-hidden');
        if (progressEl) progressEl.classList.add('tb-hidden');
      } else {
        if (lyricEl) lyricEl.classList.remove('tb-hidden');
        if (progressEl) progressEl.classList.remove('tb-hidden');
      }
    }

    if (data.text !== undefined && lyricEl) {
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

    if (data.progress !== undefined && progressEl) {
      progressEl.style.width = Math.min(100, Math.max(0, data.progress)) + '%';
    }
  });
}

// IPC: config sync
if (window.taskbarAPI && window.taskbarAPI.onSyncConfig) {
  window.taskbarAPI.onSyncConfig((cfg) => {
    if (!cfg) return;
    if (cfg.accentColor && progressEl) progressEl.style.background = cfg.accentColor;
    if (cfg.textColor && lyricEl) lyricEl.style.color = cfg.textColor;
  });
}
