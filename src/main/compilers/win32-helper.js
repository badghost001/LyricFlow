const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { getScriptPath } = require('../utils/paths');

const win32DllPath = path.join(os.tmpdir(), 'lyricflow_win32.dll');

/**
 * Ensures the native SMTC Win32 helper DLL is compiled and ready.
 * Compiles smtc_helper.cs using csc.exe from .NET Framework on Windows.
 * Returns the path to the compiled DLL, or null on failure.
 */
function ensureWin32Helper(context) {
  if (context && context.helpers.win32HelperReady) return win32DllPath;
  if (fs.existsSync(win32DllPath)) {
    if (context) context.helpers.win32HelperReady = true;
    return win32DllPath;
  }

  try {
    const csPath = getScriptPath('smtc_helper.cs');
    if (!fs.existsSync(csPath)) return null;

    const cscPaths = [
      'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
      'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
    ];
    const csc = cscPaths.find(p => fs.existsSync(p));
    if (!csc) return null;

    execFileSync(csc, ['/nologo', '/target:library', `/out:${win32DllPath}`, csPath], {
      timeout: 15000,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const ready = fs.existsSync(win32DllPath);
    if (context) context.helpers.win32HelperReady = ready;
    console.log('[SMTC] Win32 helper compiled to', win32DllPath);
    return ready ? win32DllPath : null;
  } catch (e) {
    console.warn('[SMTC] Failed to compile Win32 helper, falling back to dynamic PS1:', e.message);
    return null;
  }
}

module.exports = {
  win32DllPath,
  ensureWin32Helper
};
