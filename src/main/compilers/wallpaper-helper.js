const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync, execFile: execFileAsync } = require('child_process');
const { getScriptPath } = require('../utils/paths');

const wallpaperExePath = path.join(os.tmpdir(), 'lyricflow_wallpaper_helper.exe');

/**
 * Ensures wallpaper_helper.cs is compiled into an executable on Windows for fast attach/detach.
 */
function ensureWallpaperHelper(context) {
  if (context && context.helpers.wallpaperHelperReady) return true;
  if (fs.existsSync(wallpaperExePath)) {
    if (context) context.helpers.wallpaperHelperReady = true;
    return true;
  }

  try {
    const csPath = getScriptPath('wallpaper_helper.cs');
    if (!fs.existsSync(csPath)) return false;

    // Use csc.exe from .NET Framework (ships with every Windows install)
    const cscPaths = [
      'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
      'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
    ];
    const csc = cscPaths.find(p => fs.existsSync(p));
    if (!csc) return false;

    execFileSync(csc, ['/nologo', '/target:exe', `/out:${wallpaperExePath}`, csPath], {
      timeout: 15000,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const ready = fs.existsSync(wallpaperExePath);
    if (context) context.helpers.wallpaperHelperReady = ready;
    console.log('[Wallpaper] Helper compiled to', wallpaperExePath);
    return ready;
  } catch (e) {
    console.warn('[Wallpaper] Failed to compile helper, falling back to PS1:', e.message);
    return false;
  }
}

/**
 * Executes wallpaper attach/detach operation with fast native executable or PowerShell fallback.
 */
function runWallpaperHelper(hwnd, mode, callback, context) {
  if (ensureWallpaperHelper(context)) {
    // Fast path: native exe, ~20ms cold start
    execFileAsync(wallpaperExePath, [hwnd, mode], (err, stdout) => {
      if (err) console.error(`Wallpaper ${mode} (exe) error:`, err.message);
      else console.log(`Wallpaper ${mode} (exe):`, stdout.trim());
      if (callback) callback(err);
    });
  } else {
    // Slow fallback: PowerShell, ~700ms cold start
    const scriptPath = getScriptPath('wallpaper.ps1');
    execFileAsync('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath, '-HandleString', hwnd, '-Mode', mode
    ], (err, stdout) => {
      if (err) console.error(`Wallpaper ${mode} (ps1) error:`, err.message);
      else console.log(`Wallpaper ${mode} (ps1):`, stdout.trim());
      if (callback) callback(err);
    });
  }
}

module.exports = {
  wallpaperExePath,
  ensureWallpaperHelper,
  runWallpaperHelper
};
