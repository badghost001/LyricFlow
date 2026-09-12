const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync, execFile: execFileAsync, spawn } = require('child_process');
const { getScriptPath } = require('../utils/paths');

const mediaExePath = path.join(os.tmpdir(), 'lyricflow_media.exe');

/**
 * Ensures media_control_helper.cs is compiled into an executable on Windows for fast media commands (<15ms).
 */
function ensureMediaHelper(context) {
  if (context && context.helpers.mediaHelperReady) return mediaExePath;
  if (fs.existsSync(mediaExePath)) {
    if (context) context.helpers.mediaHelperReady = true;
    return mediaExePath;
  }

  try {
    const csPath = getScriptPath('media_control_helper.cs');
    if (!fs.existsSync(csPath)) return null;

    const cscPaths = [
      'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
      'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
    ];
    const csc = cscPaths.find(p => fs.existsSync(p));
    if (!csc) return null;

    execFileSync(csc, ['/nologo', '/target:exe', `/out:${mediaExePath}`, csPath], {
      timeout: 15000,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const ready = fs.existsSync(mediaExePath);
    if (context) context.helpers.mediaHelperReady = ready;
    console.log('[Media] Native helper compiled to', mediaExePath);
    return ready ? mediaExePath : null;
  } catch (e) {
    console.warn('[Media] Failed to compile helper:', e.message);
    return null;
  }
}

/**
 * Gets or lazily spawns the persistent PowerShell SMTC controller process.
 */
function getOrCreateLocalPlaybackController(context) {
  if (context && context.localPlaybackControllerProcess &&
      context.localPlaybackControllerProcess.stdin &&
      context.localPlaybackControllerProcess.stdin.writable) {
    return context.localPlaybackControllerProcess;
  }

  try {
    const proc = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', getScriptPath('smtc_controller.ps1')
    ]);

    if (context) {
      context.localPlaybackControllerProcess = proc;
    }

    proc.on('close', () => {
      if (context && context.localPlaybackControllerProcess === proc) {
        context.localPlaybackControllerProcess = null;
      }
    });

    proc.on('error', (err) => {
      console.error('[Media] Local playback controller process error:', err);
      if (context && context.localPlaybackControllerProcess === proc) {
        context.localPlaybackControllerProcess = null;
      }
    });

    return proc;
  } catch (err) {
    console.error('[Media] Failed to spawn local SMTC controller process:', err);
    return null;
  }
}

/**
 * Fallback media control using persistent controller stdin or on-demand smtc_control.ps1.
 */
function fallbackLocalPlaybackControl(action, positionMs = 0, context) {
  const controller = getOrCreateLocalPlaybackController(context);
  if (controller && controller.stdin && controller.stdin.writable && action !== 'seek') {
    controller.stdin.write(action + '\n');
  } else {
    const scriptPath = getScriptPath('smtc_control.ps1');
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-action', action];
    if (action === 'seek') {
      const safePos = Math.max(0, Math.floor(Number(positionMs) || 0));
      args.push('-position');
      args.push(safePos.toString());
    }
    spawn('powershell.exe', args);
  }
}

/**
 * High-performance media playback control dispatcher.
 * Uses native Win32/Spotify helper (<15ms) when available, with graceful SMTC fallback.
 */
function triggerMediaControl(action, positionMs = 0, context) {
  if (!['play-pause', 'next', 'previous', 'seek'].includes(action)) {
    console.warn(`[IPC] triggerMediaControl blocked invalid action: ${action}`);
    return;
  }

  const exe = ensureMediaHelper(context);
  if (exe && action !== 'seek') {
    execFileAsync(exe, [action], (err) => {
      if (err) {
        console.error('[Media] Native control error, falling back to SMTC:', err.message);
        fallbackLocalPlaybackControl(action, positionMs, context);
      }
    });
    return;
  }

  fallbackLocalPlaybackControl(action, positionMs, context);
}

module.exports = {
  mediaExePath,
  ensureMediaHelper,
  getOrCreateLocalPlaybackController,
  fallbackLocalPlaybackControl,
  triggerMediaControl
};
