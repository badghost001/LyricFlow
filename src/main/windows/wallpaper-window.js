const { screen } = require('electron');
const { runWallpaperHelper } = require('../compilers/wallpaper-helper');

/**
 * Enables Wallpaper Mode by expanding mainWindow and embedding it behind desktop icons.
 */
function enableWallpaperMode(context) {
  if (!context.mainWindow || context.mainWindow.isDestroyed()) return;

  context.isWallpaperMode = true;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { bounds } = primaryDisplay;

  // Save normal window bounds before expanding to full display
  const currentBounds = context.mainWindow.getBounds();
  if (currentBounds.width < bounds.width || currentBounds.height < bounds.height) {
    context.normalBounds = currentBounds;
  }

  context.mainWindow.setResizable(true);
  context.mainWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
  context.mainWindow.setSkipTaskbar(true);
  context.mainWindow.setAlwaysOnTop(false); // Must NOT be always-on-top for WorkerW embed to work

  const hwnd = context.mainWindow.getNativeWindowHandle().readBigInt64LE(0).toString();
  runWallpaperHelper(hwnd, 'attach', null, context);

  context.mainWindow.webContents.send('set-wallpaper-mode-state', true);
}

/**
 * Disables Wallpaper Mode, detaches window from WorkerW, and restores normal window mode.
 */
function disableWallpaperMode(context, restoreFn) {
  if (!context.mainWindow || context.mainWindow.isDestroyed()) return;

  context.isWallpaperMode = false;
  const hwnd = context.mainWindow.getNativeWindowHandle().readBigInt64LE(0).toString();
  runWallpaperHelper(hwnd, 'detach', null, context);

  setTimeout(() => {
    if (!context.mainWindow || context.mainWindow.isDestroyed()) return;
    if (!context.isTaskbarMode && restoreFn) {
      restoreFn(context);
    }
  }, 50);

  context.mainWindow.webContents.send('set-wallpaper-mode-state', false);
}

/**
 * Temporarily detaches wallpaper window to allow interactive positioning/drag over desktop icons.
 */
function startWallpaperEdit(context) {
  if (!context.mainWindow || context.mainWindow.isDestroyed()) return;
  context.mainWindow.setIgnoreMouseEvents(false);
  const hwnd = context.mainWindow.getNativeWindowHandle().readBigInt64LE(0).toString();
  runWallpaperHelper(hwnd, 'detach', null, context);
  context.mainWindow.setAlwaysOnTop(true, 'screen-saver');
  context.mainWindow.webContents.send('wallpaper-edit-started');
}

/**
 * Re-attaches wallpaper window behind desktop icons when editing completes.
 */
function endWallpaperEdit(context) {
  if (!context.mainWindow || context.mainWindow.isDestroyed()) return;
  context.mainWindow.setAlwaysOnTop(false);
  const hwnd = context.mainWindow.getNativeWindowHandle().readBigInt64LE(0).toString();
  runWallpaperHelper(hwnd, 'attach', null, context);
  context.mainWindow.setIgnoreMouseEvents(true, { forward: true });
  context.mainWindow.webContents.send('wallpaper-edit-ended');
}

module.exports = {
  enableWallpaperMode,
  disableWallpaperMode,
  startWallpaperEdit,
  endWallpaperEdit
};
