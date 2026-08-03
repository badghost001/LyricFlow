const { app, BrowserWindow, ipcMain } = require('electron');

app.whenReady().then(() => {
  return new Promise((resolve) => {
    try {
      const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
      
      win.webContents.session.cookies.set({
        url: 'https://open.spotify.com',
        name: 'sp_dc',
        value: 'AQAeoWAaqf3GvFNJgwn57m-C7g1WoWn2O35h-ch3fVxAPxAPubAYOSYd4cJJtCu8gYe2ofQPZ7MHeblAyIxoqGjPo_kCVLYlORCigKEnwrssvkTu2oS2nhb9FMqutnhXr7PpWGXpYgKuhFJrf0-N6Xg7p7i0Hvm17zuEc_wje03lLn4q2A4eHVCiCYOGcBX5azhMVYpXBl8NgU7A_A',
        domain: '.spotify.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'no_restriction'
      }).then(() => {
        console.log("[TEST] Navigating...");
        win.loadURL("https://open.spotify.com/get_access_token?reason=transport&productType=web_player");
      });

      win.webContents.on('did-finish-load', async () => {
        console.log("[TEST] Finished load.");
        try {
          const jsonText = await win.webContents.executeJavaScript('document.body.innerText');
          const data = JSON.parse(jsonText);
          console.log("[TEST] Is Anonymous:", data.isAnonymous);
          console.log("[TEST] Token Length:", data.accessToken ? data.accessToken.length : 0);
          app.quit();
        } catch (e) {
          console.error("[TEST] Error:", e);
          app.quit();
        }
      });
    } catch (e) {
      console.error("[TEST] Exception:", e);
      app.quit();
    }
  });
});
