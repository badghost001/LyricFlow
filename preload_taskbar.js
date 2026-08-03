const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskbarAPI', {
  // Toggle click-through on the whole window
  // ignore=true  → clicks pass through to taskbar (default)
  // ignore=false → clicks are captured (when hovering lyrics)
  setClickThrough: (ignore) => ipcRenderer.send('tb-click-through', ignore),

  // Persist the lyric text X offset after drag ends
  saveOffset: (x) => ipcRenderer.send('tb-save-offset', x),

  // Open/restore the main application window on click
  openApp: () => ipcRenderer.send('tb-open-app'),

  // Receive lyric text + progress from main process
  onUpdateLyric: (cb) => {
    ipcRenderer.on('update-taskbar-lyric', (_e, data) => cb(data));
  },

  // Receive accent color / text color / saved offset
  onSyncConfig: (cb) => {
    ipcRenderer.on('sync-taskbar-config', (_e, cfg) => cb(cfg));
  },
});
