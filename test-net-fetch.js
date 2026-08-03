const { app, net } = require('electron');

app.whenReady().then(async () => {
  try {
    console.log("[TEST] Fetching Spotify Token with net.fetch...");
    const tokenRes = await net.fetch("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
      headers: {
        "Cookie": "sp_dc=AQAeoWAaqf3GvFNJgwn57m-C7g1WoWn2O35h-ch3fVxAPxAPubAYOSYd4cJJtCu8gYe2ofQPZ7MHeblAyIxoqGjPo_kCVLYlORCigKEnwrssvkTu2oS2nhb9FMqutnhXr7PpWGXpYgKuhFJrf0-N6Xg7p7i0Hvm17zuEc_wje03lLn4q2A4eHVCiCYOGcBX5azhMVYpXBl8NgU7A_A"
      }
    });
    
    console.log("[TEST] Token Status:", tokenRes.status);
    const tokenText = await tokenRes.text();
    console.log("[TEST] Token Response Length:", tokenText.length);
    
    if (!tokenRes.ok) {
      console.log("[TEST] Failed to get token. Exiting.");
      app.quit();
      return;
    }
    
    const tokenData = JSON.parse(tokenText);
    if (!tokenData.accessToken) {
      console.log("[TEST] Token JSON has no accessToken. Exiting.");
      app.quit();
      return;
    }
    
    console.log("[TEST] Successfully got Access Token! Length:", tokenData.accessToken.length);
    console.log("[TEST] Is Anonymous?", tokenData.isAnonymous);
    
    console.log("[TEST] Fetching Lyrics for 'Yellow'...");
    const spRes = await net.fetch("https://spclient.wg.spotify.com/color-lyrics/v2/track/3AJwUDP919kvQ9QcozQPxg?format=json&vocalRemoval=false&market=from_token", {
      headers: {
        "App-Platform": "WebPlayer",
        "Authorization": "Bearer " + tokenData.accessToken
      }
    });
    
    console.log("[TEST] Lyrics Status:", spRes.status);
    const lyricsText = await spRes.text();
    console.log("[TEST] Lyrics Response Length:", lyricsText.length);
    if (lyricsText.length > 100) {
      console.log("[TEST] Lyrics Sample:", lyricsText.substring(0, 100) + "...");
    } else {
      console.log("[TEST] Lyrics Body:", lyricsText);
    }
    
    app.quit();
  } catch(e) {
    console.error("[TEST] ERROR:", e);
    app.quit();
  }
});
