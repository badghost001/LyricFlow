class LastFMManager {
  constructor() {
    this.apiKey = '4f67d0ede6721fa7ade48e6800ae8935';
    this.apiSecret = '9a63ba71c239fa7e46923848be172a39';
    this.sessionKey = '';
    this.username = '';
    this.isScrobblingEnabled = true;
    
    this.currentTrack = null;
    this.hasScrobbledCurrent = false;
    this.playStartTime = 0;
    this.scrobbleTimeout = null;
    this.isLoved = false;
  }

  loadConfig() {
    const saved = localStorage.getItem("lastfm_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.sessionKey = parsed.sessionKey || '';
        this.username = parsed.username || '';
        if (parsed.isScrobblingEnabled !== undefined) {
          this.isScrobblingEnabled = parsed.isScrobblingEnabled;
        }
      } catch(e) {}
    }
  }

  saveConfig() {
    localStorage.setItem("lastfm_config", JSON.stringify({
      sessionKey: this.sessionKey,
      username: this.username,
      isScrobblingEnabled: this.isScrobblingEnabled
    }));
  }

  isConnected() {
    return !!this.sessionKey;
  }

  async authenticate(onStatusChange = null) {
    this._authCancelled = false;
    this._currentAuthUrl = null;
    this._currentToken = null;

    try {
      // 1. Request token from Last.fm
      const tokenRes = await window.electronAPI.lastfmApi('auth.getToken', {}, this.apiKey, this.apiSecret, null);
      if (!tokenRes || !tokenRes.token) {
        throw new Error((tokenRes && tokenRes.message) || 'Failed to acquire authentication token from Last.fm');
      }
      
      const token = tokenRes.token;
      this._currentToken = token;
      
      // 2. Open auth URL in user's default browser
      const authUrl = `https://www.last.fm/api/auth/?api_key=${this.apiKey}&token=${token}`;
      this._currentAuthUrl = authUrl;
      
      if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
        await window.electronAPI.openExternal(authUrl);
      } else {
        window.open(authUrl, '_blank');
      }

      if (typeof onStatusChange === 'function') {
        onStatusChange({ state: 'waiting', authUrl, token });
      }

      // 3. Automated background polling (checks every 2.5s for up to 60 attempts / 150s)
      for (let attempt = 0; attempt < 60; attempt++) {
        if (this._authCancelled) {
          throw new Error("Authorization cancelled by user");
        }

        await new Promise(r => setTimeout(r, 2500));

        if (this._authCancelled) {
          throw new Error("Authorization cancelled by user");
        }

        try {
          const sessionRes = await window.electronAPI.lastfmApi('auth.getSession', { token }, this.apiKey, this.apiSecret, null);
          
          if (sessionRes && sessionRes.session && sessionRes.session.key) {
            this.sessionKey = sessionRes.session.key;
            this.username = sessionRes.session.name || '';
            this.saveConfig();

            if (typeof onStatusChange === 'function') {
              onStatusChange({ state: 'connected', username: this.username });
            }
            return true;
          }

          // Error 14 = "Unauthorized Token - This token has not been authorized" (User hasn't clicked Allow yet)
          // Error 4 = "Unauthorized Token - This token has not been issued"
          if (sessionRes && sessionRes.error && sessionRes.error !== 14 && sessionRes.error !== 4) {
            throw new Error(sessionRes.message || 'Session acquisition failed');
          }
        } catch (pollErr) {
          const msg = pollErr && pollErr.message ? pollErr.message : '';
          if (!msg.includes("Unauthorized Token") && !msg.includes("14") && !msg.includes("4")) {
            throw pollErr;
          }
        }
      }

      throw new Error("Authorization timed out. Please try again.");
    } catch (err) {
      if (typeof onStatusChange === 'function') {
        onStatusChange({ state: 'error', error: err.message });
      }
      throw err;
    } finally {
      this._currentToken = null;
      this._currentAuthUrl = null;
    }
  }

  cancelAuth() {
    this._authCancelled = true;
  }

  async reopenAuthUrl() {
    if (this._currentAuthUrl) {
      if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
        await window.electronAPI.openExternal(this._currentAuthUrl);
      } else {
        window.open(this._currentAuthUrl, '_blank');
      }
    }
  }

  disconnect() {
    this.sessionKey = '';
    this.username = '';
    this.saveConfig();
  }

  async onTrackChange(trackInfo) {
    if (!this.isConnected()) return;
    
    this.currentTrack = trackInfo;
    this.hasScrobbledCurrent = false;
    this.playStartTime = Date.now();
    this.isLoved = false;
    
    if (this.scrobbleTimeout) {
      clearTimeout(this.scrobbleTimeout);
      this.scrobbleTimeout = null;
    }

    try {
      // Update Now Playing
      if (this.isScrobblingEnabled) {
        await window.electronAPI.lastfmApi('track.updateNowPlaying', {
          artist: trackInfo.artist,
          track: trackInfo.title,
          album: trackInfo.album || ''
        }, this.apiKey, this.apiSecret, this.sessionKey);
      }

      // Get Track Info to see if it's loved
      const infoRes = await window.electronAPI.lastfmApi('track.getInfo', {
        artist: trackInfo.artist,
        track: trackInfo.title,
        username: this.username
      }, this.apiKey, this.apiSecret, null);
      
      if (infoRes && infoRes.track) {
        this.isLoved = infoRes.track.userloved === "1";
        this.userPlaycount = infoRes.track.userplaycount || 0;
        // Update UI
        if (window.updateLoveButtonUI) {
          window.updateLoveButtonUI(this.isLoved);
        }
        if (window.updatePlaycountUI) {
          window.updatePlaycountUI(this.userPlaycount);
        }
        if (infoRes.track.album) {
          const artUrl = this.extractImageFromList(infoRes.track.album.image);
          if (artUrl && window.onLastfmArtFound) {
            window.onLastfmArtFound(artUrl);
          }
        }
      }
    } catch(err) {
      console.error("Last.fm track change error:", err);
    }
  }

  extractImageFromList(images) {
    if (!images || !Array.isArray(images) || images.length === 0) return null;
    const img = images.find(i => i.size === "extralarge" || i.size === "large") || images[images.length - 1];
    const url = img && img["#text"] ? img["#text"].trim() : "";
    if (url && !url.includes("2a96cbd8b46e442fc41c2b86b821562f")) {
      return url;
    }
    return null;
  }

  async getTrackAlbumArt(track, artist) {
    if (!track) return null;
    try {
      const infoRes = await window.electronAPI.lastfmApi('track.getInfo', {
        artist: artist || '',
        track: track,
        autocorrect: '1'
      }, this.apiKey, this.apiSecret, null);

      if (infoRes && infoRes.track && infoRes.track.album) {
        const art = this.extractImageFromList(infoRes.track.album.image);
        if (art) return art;

        if (infoRes.track.album.title) {
          const albumRes = await window.electronAPI.lastfmApi('album.getInfo', {
            artist: infoRes.track.album.artist || artist || '',
            album: infoRes.track.album.title,
            autocorrect: '1'
          }, this.apiKey, this.apiSecret, null);
          if (albumRes && albumRes.album) {
            const albumArt = this.extractImageFromList(albumRes.album.image);
            if (albumArt) return albumArt;
          }
        }
      }
    } catch (e) {
      console.warn("Last.fm getTrackAlbumArt failed:", e);
    }
    return null;
  }

  updatePlaybackProgress(currentMs, durationMs) {
    if (!this.isConnected() || !this.isScrobblingEnabled || !this.currentTrack || this.hasScrobbledCurrent) return;
    
    // Scrobble if 50% played or 4 minutes played, whichever comes first
    const fourMins = 4 * 60 * 1000;
    const scrobblePoint = Math.min(durationMs / 2, fourMins);
    
    // We also require at least 30 seconds to scrobble
    if (currentMs >= scrobblePoint && currentMs > 30000) {
      this.scrobbleCurrentTrack();
    }
  }

  async scrobbleCurrentTrack() {
    if (!this.currentTrack) return;
    this.hasScrobbledCurrent = true;
    
    try {
      const timestamp = Math.floor(this.playStartTime / 1000);
      await window.electronAPI.lastfmApi('track.scrobble', {
        artist: this.currentTrack.artist,
        track: this.currentTrack.title,
        album: this.currentTrack.album || '',
        timestamp: timestamp.toString()
      }, this.apiKey, this.apiSecret, this.sessionKey);
      
      console.log("Scrobbled track to Last.fm!");
    } catch(err) {
      console.error("Scrobble failed:", err);
      this.hasScrobbledCurrent = false; // retry later maybe
    }
  }

  async toggleLove() {
    if (!this.isConnected() || !this.currentTrack) return;
    
    const method = this.isLoved ? 'track.unlove' : 'track.love';
    const originalState = this.isLoved;
    this.isLoved = !this.isLoved;
    
    if (window.updateLoveButtonUI) {
      window.updateLoveButtonUI(this.isLoved);
    }
    
    try {
      await window.electronAPI.lastfmApi(method, {
        artist: this.currentTrack.artist,
        track: this.currentTrack.title
      }, this.apiKey, this.apiSecret, this.sessionKey);
    } catch (err) {
      console.error("Failed to toggle love:", err);
      this.isLoved = originalState;
      if (window.updateLoveButtonUI) {
        window.updateLoveButtonUI(this.isLoved);
      }
    }
  }

  async getRecentTracks(limit = 20) {
    if (!this.isConnected()) return [];
    try {
      const res = await window.electronAPI.lastfmApi('user.getRecentTracks', {
        user: this.username,
        limit: limit.toString()
      }, this.apiKey, this.apiSecret, null);
      
      if (res && res.recenttracks && res.recenttracks.track) {
        return res.recenttracks.track;
      }
      return [];
    } catch(err) {
      console.error("Failed to fetch recent tracks from Last.fm:", err);
      return [];
    }
  }
}

window.lastFM = new LastFMManager();
window.lastFM.loadConfig();
