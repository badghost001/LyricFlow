const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edgeGlowAPI', {
  onUpdateColor: (callback) => {
    ipcRenderer.removeAllListeners('update-edge-glow-color');
    ipcRenderer.on('update-edge-glow-color', (event, color) => callback(color));
  },
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources')
});
