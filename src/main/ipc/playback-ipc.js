const { ipcMain, BrowserWindow, app, session, shell } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const { getScriptPath, getConfigPath } = require('../utils/paths');
const compilers = require('../compilers');

/**
 * Creates a normalized Spotify-compatible playback state object from local SMTC data.
 */
function mockSpotifyPlaybackState(localState) {
  if (!localState || localState.status === 'Closed' || !localState.title) {
    return null;
  }

  // Stable local ID based on title and artist
  const rawIdInput = `${localState.artist || 'Unknown'}_${localState.title || 'Unknown'}`;
  const trackId = `local_${Buffer.from(rawIdInput).toString('base64').replace(/=/g, '')}`;

  return {
    is_playing: localState.status === 'Playing',
    progress_ms: localState.position || 0,
    playback_rate: localState.playbackRate || 1.0,
    item: {
      id: trackId,
      name: localState.title,
      duration_ms: localState.duration || 0,
      artists: [
        { name: localState.artist || 'Unknown Artist' }
      ],
      album: {
        images: [] // Renderer will fetch art via iTunes Search API asynchronously if empty
      }
    }
  };
}

/**
 * Starts the persistent PowerShell process querying Windows System Media Transport Controls (SMTC).
 */
function startLocalPlaybackMonitor(context) {
  if (context.localPlaybackProcess) return;
  context.smtcRestartAttempts = 0;

  const scriptPath = getScriptPath('smtc_reader.ps1');
  const dll = compilers.win32.ensureWin32Helper(context);
  const args = [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath,
    '-ParentPid', process.pid.toString()
  ];
  if (dll) {
    args.push('-DllPath', dll);
  }

  try {
    context.localPlaybackProcess = spawn('powershell.exe', args);
  } catch (err) {
    console.error('[Playback] Failed to spawn local SMTC reader process:', err);
    return;
  }

  let buffer = '';
  context.localPlaybackProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        try {
          const parsed = JSON.parse(trimmed);
          const prevStatus = context.lastLocalPlaybackState ? context.lastLocalPlaybackState.status : null;
          const prevRate = context.lastLocalPlaybackState ? (context.lastLocalPlaybackState.playbackRate || 1.0) : 1.0;
          context.lastLocalPlaybackState = parsed;

          // Toggle window visibility based on taskbar auto-hide state
          if (context.isTaskbarMode && context.taskbarWindow && !context.taskbarWindow.isDestroyed()) {
            if (parsed.taskbarHidden && !context.fullscreenLyricsEnabled) {
              if (context.showTimeout) {
                clearTimeout(context.showTimeout);
                context.showTimeout = null;
              }
              if (context.taskbarWindow.isVisible()) {
                context.taskbarWindow.hide();
              }
            } else {
              if (!context.taskbarWindow.isVisible() && !context.showTimeout) {
                context.showTimeout = setTimeout(() => {
                  context.showTimeout = null;
                  if (context.isTaskbarMode && context.taskbarWindow && !context.taskbarWindow.isDestroyed() &&
                      context.lastLocalPlaybackState && (!context.lastLocalPlaybackState.taskbarHidden || context.fullscreenLyricsEnabled)) {
                    context.taskbarWindow.showInactive();
                    context.taskbarWindow.setAlwaysOnTop(true, 'screen-saver');
                    const { applyTaskbarWindowLayout } = require('../windows/taskbar-window');
                    applyTaskbarWindowLayout(context);
                  }
                }, 150);
              }
            }
          }

          if (parsed.status === 'Closed') {
            context.lastTrackId = null;
          }

          // Instantly push pause/play and playback speed changes to renderer — no Spotify API poll delay
          const rateChanged = parsed.playbackRate && Math.abs((parsed.playbackRate || 1.0) - prevRate) > 0.05;
          if (parsed.title && (parsed.status !== prevStatus || rateChanged) && (parsed.status === 'Playing' || parsed.status === 'Paused')) {
            if (context.mainWindow && !context.mainWindow.isDestroyed()) {
              context.mainWindow.webContents.send('smtc-playback-status', {
                isPlaying: parsed.status === 'Playing',
                position: parsed.position || 0,
                playbackRate: parsed.playbackRate || 1.0
              });
            }
          }

          if (parsed.status !== 'Closed' && parsed.title) {
            const trackId = `${parsed.artist}_${parsed.title}`;
            if (trackId !== context.lastTrackId) {
              context.lastTrackId = trackId;
              if (context.mainWindow && !context.mainWindow.isDestroyed()) {
                context.mainWindow.webContents.send('local-playback-change', mockSpotifyPlaybackState(parsed));
              }
            }
          }
        } catch (e) {
          console.warn('[Playback] SMTC parsing error:', e);
        }
      }
    }
  });

  context.localPlaybackProcess.on('close', (code) => {
    context.localPlaybackProcess = null;
    if (context.localPlaybackControllerProcess) {
      context.localPlaybackControllerProcess.kill();
      context.localPlaybackControllerProcess = null;
    }
    // Exponential back-off: 5s, 10s, 20s, 40s... max 60s
    context.smtcRestartAttempts++;
    const delay = Math.min(5000 * Math.pow(2, context.smtcRestartAttempts - 1), 60000);
    console.log(`[Playback] SMTC reader exited (code ${code}). Restart #${context.smtcRestartAttempts} in ${delay / 1000}s...`);
    if (context.smtcRestartAttempts <= 10) {
      setTimeout(() => startLocalPlaybackMonitor(context), delay);
    } else {
      console.error('[Playback] SMTC reader exceeded max restart attempts (10). Giving up.');
    }
  });

  context.localPlaybackProcess.on('error', (err) => {
    console.error('[Playback] SMTC reader process error:', err);
  });
}

/**
 * Registers all playback, authentication, and media control IPC handlers.
 */
function registerPlaybackIpc(context) {
  ipcMain.handle('get-local-playback', () => {
    return mockSpotifyPlaybackState(context.lastLocalPlaybackState);
  });

  ipcMain.on('trigger-local-playback-control', (event, action, positionMs = 0) => {
    compilers.media.triggerMediaControl(action, positionMs, context);
  });

  // Token Refresh Logic (PKCE - no client secret needed)
  ipcMain.handle('refresh-token', async () => {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      throw new Error('No configuration found');
    }

    let config;
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      throw new Error('Invalid configuration file');
    }

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: config.refresh_token,
        client_id: config.client_id
      })
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    const tokenData = await tokenRes.json();
    config.access_token = tokenData.access_token;
    if (tokenData.refresh_token) {
      config.refresh_token = tokenData.refresh_token;
    }
    config.expires_at = Math.floor(Date.now() / 1000) + tokenData.expires_in;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return config.access_token;
  });

  ipcMain.handle('get-access-token', async (event, spDc) => {
    try {
      const res = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
        headers: {
          'Cookie': `sp_dc=${spDc}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'App-Platform': 'WebPlayer'
        }
      });
      if (res.ok) {
        const data = await res.json();
        return data.accessToken;
      }
      return null;
    } catch (err) {
      console.error('[Playback] Failed to fetch access token:', err);
      return null;
    }
  });

  // OAuth & Web Session Management
  ipcMain.handle('login-via-web', () => {
    return new Promise((resolve) => {
      const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
      app.userAgentFallback = CHROME_UA;

      const loginWin = new BrowserWindow({
        width: 500,
        height: 720,
        show: true,
        title: 'Login to Spotify',
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      loginWin.center();
      loginWin.show();
      loginWin.focus();

      loginWin.webContents.setUserAgent(CHROME_UA);
      try {
        loginWin.webContents.session.setUserAgent(CHROME_UA);
      } catch (e) {}

      loginWin.webContents.setWindowOpenHandler(() => ({
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 720,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      }));

      loginWin.webContents.on('did-create-window', (childWin) => {
        childWin.webContents.setUserAgent(CHROME_UA);
      });

      loginWin.webContents.on('dom-ready', () => {
        loginWin.webContents.executeJavaScript(`
          try {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            delete window.gc;
          } catch(e) {}
        `);
      });

      let resolved = false;
      const finishLogin = (spDcValue) => {
        if (resolved) return;
        resolved = true;
        clearInterval(checkCookie);
        try {
          loginWin.webContents.session.cookies.removeListener('changed', cookieChangeListener);
        } catch (e) {}

        const config = {
          sp_dc: spDcValue,
          localMode: false
        };

        fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf8');

        if (!loginWin.isDestroyed()) {
          loginWin.close();
        }
        resolve(config);
      };

      const cookieChangeListener = (event, cookie, cause, removed) => {
        if (!removed && cookie.name === 'sp_dc' && cookie.value) {
          finishLogin(cookie.value);
        }
      };
      loginWin.webContents.session.cookies.on('changed', cookieChangeListener);

      const checkCookie = setInterval(async () => {
        if (loginWin.isDestroyed()) {
          clearInterval(checkCookie);
          if (!resolved) {
            resolved = true;
            try {
              loginWin.webContents.session.cookies.removeListener('changed', cookieChangeListener);
            } catch (e) {}
            resolve(null);
          }
          return;
        }

        try {
          const cookies = await loginWin.webContents.session.cookies.get({});
          const spDc = cookies.find(c => c.name === 'sp_dc' && c.value);
          if (spDc) {
            finishLogin(spDc.value);
          }
        } catch (e) {}
      }, 300);

      loginWin.loadURL('https://accounts.spotify.com/en/login?continue=https:%2F%2Fopen.spotify.com%2F');

      loginWin.on('closed', () => {
        clearInterval(checkCookie);
        try {
          loginWin.webContents.session.cookies.removeListener('changed', cookieChangeListener);
        } catch (e) {}
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      });
    });
  });

  ipcMain.handle('logout', async () => {
    await session.defaultSession.clearStorageData();
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  ipcMain.handle('start-oauth-server', (event, { clientId, codeVerifier, codeChallenge }) => {
    return new Promise((resolve, reject) => {
      if (context.oauthServer) {
        context.oauthServer.close();
      }

      context.oauthServer = http.createServer(async (req, res) => {
        const parsedUrl = new URL(req.url, 'http://127.0.0.1:4882');

        if (parsedUrl.pathname === '/callback') {
          const authCode = parsedUrl.searchParams.get('code');

          if (authCode) {
            try {
              const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                  client_id: clientId,
                  grant_type: 'authorization_code',
                  code: authCode,
                  redirect_uri: 'http://127.0.0.1:4882/callback',
                  code_verifier: codeVerifier
                })
              });

              if (!tokenRes.ok) {
                const errorText = await tokenRes.text();
                throw new Error(`Token exchange failed: ${errorText}`);
              }

              const tokenData = await tokenRes.json();

              const config = {
                client_id: clientId,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in
              };

              fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf8');

              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end('<html><body style="font-family: sans-serif; background: #121212; color: #1db954; text-align: center; padding-top: 50px;"><h1>Connection Successful!</h1><p style="color: #b3b3b3;">You can now close this tab and return to the LyricFlow app.</p></body></html>');

              context.oauthServer.close();
              context.oauthServer = null;
              resolve(config);
            } catch (err) {
              const safeErr = String(err && err.message ? err.message : 'Authentication failed')
                .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
              res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`<html><body style="font-family: sans-serif; background: #121212; color: #ff5555; text-align: center; padding-top: 50px;"><h1>Connection Failed</h1><p style="color: #b3b3b3;">Error: ${safeErr}</p></body></html>`);
              reject(err.message);
            }
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing authorization code');
            reject('Authorization code missing in callback URL');
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      });

      context.oauthServer.listen(4882, '127.0.0.1', (err) => {
        if (err) {
          reject(`Failed to start local server on port 4882: ${err.message}`);
          return;
        }

        const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=user-read-currently-playing%20user-read-playback-state%20user-modify-playback-state%20user-top-read%20user-library-read&redirect_uri=http://127.0.0.1:4882/callback&code_challenge_method=S256&code_challenge=${codeChallenge}`;
        shell.openExternal(authUrl);

        setTimeout(() => {
          if (context.oauthServer) {
            context.oauthServer.close();
            context.oauthServer = null;
            reject('OAuth authorization timed out after 5 minutes. Please try again.');
          }
        }, 5 * 60 * 1000);
      });
    });
  });
}

module.exports = {
  startLocalPlaybackMonitor,
  mockSpotifyPlaybackState,
  registerPlaybackIpc
};
