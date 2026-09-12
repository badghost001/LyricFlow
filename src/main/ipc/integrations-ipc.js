const { ipcMain } = require('electron');
const md5 = require('md5');

let rpc = null;
let rpcReady = false;
let translationCooldownUntil = 0;

/**
 * Registers IPC handlers for third-party integrations (Genius, Discord RPC, Last.fm, News, Translations).
 */
function registerIntegrationsIpc(context) {
  // Genius Song Facts
  ipcMain.handle('fetch-genius-fact', async (event, trackName, artistName) => {
    try {
      const cleanArtist = artistName.replace(/VEVO$/i, '').replace(/- Topic$/i, '').replace(/Official$/i, '').trim() || artistName;
      const cleanTrack = trackName.replace(/\[.*?\]/g, '').replace(/\(.*?(Official|Audio|Video).*?\)/ig, '').replace(/ - (Remastered|Radio Edit|Live|Instrumental|Acoustic|Single Version).*/i, '').trim() || trackName;

      const searchUrl = `https://genius.com/api/search/multi?per_page=1&q=${encodeURIComponent(cleanArtist + ' ' + cleanTrack)}`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(5000)
      });
      if (!searchRes.ok) return null;
      const searchData = await searchRes.json();

      let songId = null;
      const sections = searchData.response?.sections || [];
      for (const section of sections) {
        if (section.type === 'song' || section.type === 'top_hit') {
          for (const hit of section.hits) {
            if (hit.type === 'song' && hit.result) {
              songId = hit.result.id;
              break;
            }
          }
        }
        if (songId) break;
      }

      if (!songId) return null;

      const factUrl = `https://genius.com/api/songs/${songId}?text_format=plain`;
      const factRes = await fetch(factUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(5000)
      });
      if (!factRes.ok) return null;
      const songData = await factRes.json();

      return songData.response?.song?.description?.plain || null;
    } catch (e) {
      console.error('[Genius] Failed to fetch Genius fact:', e);
      return null;
    }
  });

  // Genius Lyric Annotations
  ipcMain.handle('get-genius-annotations', async (event, artistName, trackName) => {
    try {
      const cleanArtist = artistName.replace(/VEVO$/i, '').replace(/- Topic$/i, '').replace(/Official$/i, '').trim() || artistName;
      const cleanTrack = trackName.replace(/\[.*?\]/g, '').replace(/\(.*?(Official|Audio|Video).*?\)/ig, '').replace(/ - (Remastered|Radio Edit|Live|Instrumental|Acoustic|Single Version).*/i, '').trim() || trackName;

      const searchUrl = `https://genius.com/api/search/multi?per_page=1&q=${encodeURIComponent(cleanArtist + ' ' + cleanTrack)}`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(5000)
      });
      if (!searchRes.ok) return [];
      const searchData = await searchRes.json();

      let songId = null;
      const sections = searchData.response?.sections || [];
      for (const section of sections) {
        if (section.type === 'song' || section.type === 'top_hit') {
          for (const hit of section.hits) {
            if (hit.type === 'song' && hit.result) {
              songId = hit.result.id;
              break;
            }
          }
        }
        if (songId) break;
      }

      if (!songId) return [];

      const referentsUrl = `https://genius.com/api/referents?song_id=${songId}&per_page=50&text_format=plain`;
      const refRes = await fetch(referentsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(6000)
      });
      if (!refRes.ok) return [];
      const refData = await refRes.json();

      const annotations = [];
      if (refData.response?.referents) {
        for (const ref of refData.response.referents) {
          const bodyText = ref.annotations?.[0]?.body?.plain || ref.annotations?.[0]?.body?.text || '';
          if (ref.fragment && bodyText && bodyText.trim() !== '?' && bodyText.trim().length > 10) {
            annotations.push({
              fragment: ref.fragment,
              text: bodyText.trim()
            });
          }
        }
      }
      return annotations;
    } catch (e) {
      console.error('[Genius] Failed to fetch Genius annotations:', e);
      return [];
    }
  });

  // Discord Rich Presence
  ipcMain.on('init-discord-rpc', (event, clientId) => {
    try {
      if (rpc) return;
      const DiscordRPC = require('discord-rpc');
      DiscordRPC.register(clientId);
      rpc = new DiscordRPC.Client({ transport: 'ipc' });

      rpc.on('ready', () => {
        rpcReady = true;
        console.log('[Discord RPC] Ready');
      });

      rpc.on('error', () => {});
      rpc.on('disconnected', () => { rpcReady = false; });

      if (rpc.transport) {
        rpc.transport.on('close', () => { rpcReady = false; });
      }

      rpc.login({ clientId }).catch(() => {});
    } catch (err) {
      console.error('[Discord RPC] Failed to init:', err);
    }
  });

  ipcMain.on('update-discord-rpc', (event, data) => {
    if (!rpcReady || !rpc) return;
    try {
      if (data.clear) {
        rpc.clearActivity().catch(console.error);
        return;
      }

      const activity = {
        details: data.trackName ? `Listening to ${data.trackName}` : 'Idle',
        state: data.artistName ? data.artistName : 'Looking for lyrics...',
        instance: false,
      };

      if (data.albumArtUrl && data.albumArtUrl.startsWith('http')) {
        activity.largeImageKey = data.albumArtUrl;
        activity.largeImageText = data.albumName || 'LyricFlow';
      }

      rpc.setActivity(activity).catch(err => console.error('[Discord RPC] Activity Error:', err));
    } catch (err) {
      console.error('[Discord RPC] Update failed:', err);
    }
  });

  // Last.fm API
  ipcMain.handle('lastfm-api', async (event, { method, params, apiKey, apiSecret, sessionKey }) => {
    try {
      params = params || {};
      params.api_key = apiKey;
      params.method = method;
      if (sessionKey) {
        params.sk = sessionKey;
      }

      const authRequired = ['auth.getSession', 'track.updateNowPlaying', 'track.scrobble', 'track.love', 'track.unlove'].includes(method);

      if (authRequired && apiSecret) {
        const sortedKeys = Object.keys(params).sort();
        let sigString = '';
        for (const key of sortedKeys) {
          if (key !== 'format' && key !== 'api_sig') {
            sigString += `${key}${params[key]}`;
          }
        }
        sigString += apiSecret;
        params.api_sig = md5(sigString);
      }

      params.format = 'json';

      let url = 'https://ws.audioscrobbler.com/2.0/';
      let fetchOptions = { method: authRequired ? 'POST' : 'GET' };

      if (authRequired) {
        fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        fetchOptions.body = new URLSearchParams(params).toString();
      } else {
        url += '?' + new URLSearchParams(params).toString();
      }

      const res = await fetch(url, fetchOptions);
      return await res.json();
    } catch (err) {
      console.error('[Last.fm] API Error:', err);
      throw err;
    }
  });

  // Music News
  ipcMain.handle('fetch-music-news', async (event, query) => {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (err) {
      console.error('[Music News] Error:', err);
      throw err;
    }
  });

  // Translations
  ipcMain.handle('translate-text', async (event, text, targetLang, skipLang) => {
    if (Date.now() < translationCooldownUntil) {
      return { text: null, src: 'cooldown' };
    }
    try {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: 'auto',
        tl: targetLang,
        dt: 't'
      });

      const body = new URLSearchParams({ q: text });

      const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: body.toString()
      });

      if (!response.ok) {
        throw new Error(`Google API returned ${response.status}`);
      }

      const data = await response.json();
      const fullTranslation = data[0].map(item => item[0]).join('');
      const srcLang = data[2] || 'unknown';

      if (srcLang.toLowerCase() === targetLang.toLowerCase() ||
          (skipLang && skipLang !== 'none' && srcLang.toLowerCase() === skipLang.toLowerCase())) {
        return { text: null, src: srcLang };
      }

      return { text: fullTranslation, src: srcLang };
    } catch (err) {
      if (err.message && (err.message.includes('429') || err.message.includes('Too Many Requests'))) {
        translationCooldownUntil = Date.now() + 3600000; // 1 hour
      } else {
        console.error('[Translation] Failed:', err);
      }
      return null;
    }
  });
}

module.exports = {
  registerIntegrationsIpc
};
