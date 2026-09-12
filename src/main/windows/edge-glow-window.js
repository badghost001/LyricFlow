const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { getHtmlPath, getPreloadPath } = require('../utils/paths');

/**
 * Controller for desktop ambient edge glow lighting window.
 */
function setEdgeGlow(context, enabled, color) {
  if (enabled) {
    if (!context.edgeGlowWindow || context.edgeGlowWindow.isDestroyed()) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { bounds } = primaryDisplay;

      const edgeGlowWin = new BrowserWindow({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        focusable: false,
        webPreferences: {
          preload: getPreloadPath('preload_edge_glow.js'),
          contextIsolation: true,
          nodeIntegration: false
        }
      });

      context.edgeGlowWindow = edgeGlowWin;

      edgeGlowWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      edgeGlowWin.webContents.on('will-navigate', (e) => e.preventDefault());
      edgeGlowWin.setIgnoreMouseEvents(true, { forward: true });
      edgeGlowWin.setAlwaysOnTop(true, 'screen-saver');

      edgeGlowWin.loadFile(getHtmlPath('edge_glow.html')).then(() => {
        if (color && !edgeGlowWin.isDestroyed()) {
          edgeGlowWin.webContents.send('update-edge-glow-color', color);
        }
      });

      edgeGlowWin.on('closed', () => {
        if (context.edgeGlowWindow === edgeGlowWin) {
          context.edgeGlowWindow = null;
        }
      });
    } else {
      if (color && !context.edgeGlowWindow.isDestroyed()) {
        context.edgeGlowWindow.webContents.send('update-edge-glow-color', color);
      }
    }
  } else {
    if (context.edgeGlowWindow && !context.edgeGlowWindow.isDestroyed()) {
      context.edgeGlowWindow.close();
      context.edgeGlowWindow = null;
    }
  }
}

module.exports = {
  setEdgeGlow
};
