const { app, BrowserWindow, session } = require('electron');

app.whenReady().then(async () => {
  try {
    await session.defaultSession.cookies.set({
      url: 'https://open.spotify.com',
      name: 'sp_dc',
      value: 'AQAeoWAaqf3GvFNJgwn57m-C7g1WoWn2O35h-ch3fVxAPxAPubAYOSYd4cJJtCu8gYe2ofQPZ7MHeblAyIxoqGjPo_kCVLYlORCigKEnwrssvkTu2oS2nhb9FMqutnhXr7PpWGXpYgKuhFJrf0-N6Xg7p7i0Hvm17zuEc_wje03lLn4q2A4eHVCiCYOGcBX5azhMVYpXBl8NgU7A_A',
      domain: '.spotify.com',
      path: '/',
      secure: true,
      httpOnly: true
    });

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const html = `
      <html>
      <body>
      <script>
        const { ipcRenderer } = require('electron');
        (async () => {
          try {
            console.log("Fetching token...");
            const tokenRes = await fetch("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
              credentials: "include",
              headers: {
                "accept": "application/json",
                "accept-language": "en-US,en;q=0.9",
                "app-platform": "WebPlayer",
                "sec-ch-ua": "\"Chromium\";v=\"120\", \"Not_A Brand\";v=\"8\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            });
            console.log("Token Status:", tokenRes.status);
            const tokenData = await tokenRes.json();
            console.log("Token response:", tokenData);
            
            if (!tokenData.accessToken) {
              ipcRenderer.send('done', 'No access token');
              return;
            }
            
            console.log("Fetching lyrics for Yellow (trackId: 3AJwUDP919kvQ9QcozQPxg)...");
            const spRes = await fetch("https://spclient.wg.spotify.com/color-lyrics/v2/track/3AJwUDP919kvQ9QcozQPxg?format=json&vocalRemoval=false&market=from_token", {
              headers: {
                "App-Platform": "WebPlayer",
                "Authorization": "Bearer " + tokenData.accessToken,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            });
            console.log("Lyrics Status:", spRes.status);
            const lyricsData = await spRes.text();
            console.log("Lyrics Response Length:", lyricsData.length);
            
            ipcRenderer.send('done', 'Success');
          } catch(e) {
            console.error("ERROR:", e);
            ipcRenderer.send('done', 'Error: ' + e.message);
          }
        })();
      </script>
      </body>
      </html>
    `;
    
    win.webContents.on('console-message', (e, level, msg) => {
      console.log("[RENDERER]", msg);
    });

    const { ipcMain } = require('electron');
    ipcMain.on('done', (e, msg) => {
      console.log("Finished:", msg);
      app.quit();
    });

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  } catch(e) {
    console.error("MAIN ERROR:", e);
    app.quit();
  }
});
