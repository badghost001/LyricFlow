/**
 * scripts/kill-process.js
 * Safely terminates running instances of LyricFlow before compilation/dev runs
 * to release Windows OS file locks (os error 5) on the debug executable.
 */
const { execSync } = require('child_process');

try {
  if (process.platform === 'win32') {
    // taskkill returns code 128 / error if no process found, which is completely normal.
    execSync('taskkill /F /IM lyricflow.exe /T 2>nul || exit 0', { stdio: 'ignore', shell: true });
  } else {
    execSync('pkill -f lyricflow 2>/dev/null || true', { stdio: 'ignore', shell: true });
  }
} catch (_) {
  // Ignore errors if no process was running
}
