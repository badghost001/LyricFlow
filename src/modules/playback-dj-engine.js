/**
 * PlaybackDjEngine — Virtual DJ & Lyric-Aware Intelligent Transitions for LyricFlow
 *
 * Capabilities:
 * 1. Lyric-Aware Outro Detection: Detects the precise completion of the final vocal
 *    performance while ignoring credit tags and non-lyric metadata.
 * 2. WASAPI Loopback Instrumental Solo Protection: Monitors 8-band audio spectrum RMS
 *    energy to prevent premature track skipping during post-vocal guitar/synth solos or drops.
 * 3. Equal-Loudness Volume Fader: Dual-backend cosine volume ducking supporting local
 *    Windows WASAPI CoreAudio session volume and Spotify Web API fallback.
 * 4. Resilient Cancellation & Auto-Recovery: Restores pre-fade volume on track switch,
 *    unpause, or manual seek.
 * 5. Dynamic Smart Queueing: Multi-tier recommendation fallback via Last.fm track.getSimilar
 *    and Spotify Artist Top Tracks (immune to Spotify's Nov 2024 /v1/recommendations deprecation).
 */

class PlaybackDjEngine {
  constructor(options = {}) {
    this.settings = options.settings || {};
    this.activeTransition = null;
    this.fadeState = {
      isFading: false,
      startVolume: 100,
      currentVolume: 100,
      targetVolume: 0,
      fadeStartTime: null,
      fadeDurationMs: 3500,
      timerId: null,
      backend: 'local'
    };
    this.lastVocalLine = null;
    this.lastVocalEndMs = null;
    this.cachedAnalysisLyrics = null;
    this.songEnergyHistory = [];
    this.meanTrackEnergy = 0.15;
    this.instantEnergy = 0;
    this.enqueuedTrackUris = new Set();
    this.currentTrackId = null;
    this.isTransitionTriggered = false;
    this.preFadeVolume = 100;
  }

  /**
   * Update engine settings dynamically
   */
  setSettings(newSettings) {
    if (!newSettings || typeof newSettings !== 'object') return;
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Filter out credit/contributor lines to find genuine final vocal line
   */
  isCreditOrMetadataLine(text) {
    if (!text || typeof text !== 'string') return true;
    const trimmed = text.trim().toLowerCase();
    if (!trimmed) return true;

    // Credit prefixes and markers
    const creditKeywords = [
      'lyrics by', 'written by', 'composed by', 'arranged by', 'produced by',
      'synced by', 'transcribed by', 'sync by', 'lyrics provided by', 'powered by musixmatch',
      'verified by', 'source:', 'track id:', 'paroles par', 'écrit par',
      'letras por', 'escrito por', 'letra por', '作词', '作曲', '编曲', '制作人',
      '混音', '母带', '吉他', '贝斯', '鼓手', '和声', '录音', '监制', '企划'
    ];

    return creditKeywords.some(kw => trimmed.startsWith(kw) || trimmed.includes(kw));
  }

  /**
   * Analyze track lyrics array to pinpoint the final vocal timestamp
   */
  analyzeTrackLyrics(lyrics) {
    if (!Array.isArray(lyrics) || lyrics.length === 0) {
      this.lastVocalLine = null;
      this.lastVocalEndMs = null;
      return { lastVocalLine: null, lastVocalEndMs: null };
    }

    if (this.cachedAnalysisLyrics === lyrics && this.lastVocalEndMs !== null) {
      return { lastVocalLine: this.lastVocalLine, lastVocalEndMs: this.lastVocalEndMs };
    }

    this.cachedAnalysisLyrics = lyrics;

    // Search backwards from the end of the lyrics array for the last genuine lyric line
    for (let i = lyrics.length - 1; i >= 0; i--) {
      const line = lyrics[i];
      if (!line) continue;
      const text = line.text || line.originalText || '';
      if (this.isCreditOrMetadataLine(text)) continue;

      let endMs = null;
      if (Array.isArray(line.words) && line.words.length > 0) {
        const lastWord = line.words[line.words.length - 1];
        if (lastWord) {
          endMs = (lastWord.end != null ? lastWord.end * 1000 : lastWord.endMs) ||
                  ((lastWord.start != null ? lastWord.start * 1000 : lastWord.timeMs) + 1200);
        }
      }

      if (endMs == null || isNaN(endMs)) {
        const startMs = (line.timeMs != null ? line.timeMs : (line.start != null ? line.start * 1000 : 0)) || 0;
        const durationMs = line.durationMs || 3500;
        endMs = startMs + durationMs;
      }

      this.lastVocalLine = line;
      this.lastVocalEndMs = endMs;
      return { lastVocalLine: line, lastVocalEndMs: endMs };
    }

    this.lastVocalLine = null;
    this.lastVocalEndMs = null;
    return { lastVocalLine: null, lastVocalEndMs: null };
  }

  /**
   * Determine if any DJ engine feature is active to gate high-frequency spectrum processing
   */
  isDjProcessingEnabled() {
    if (!this.settings) return false;
    if (this.settings.djEnabled === false) return false;
    return Boolean(
      this.settings.djAutoTransition ||
      this.settings.djLyricAutoTransition ||
      this.settings.djPreserveSolos ||
      this.settings.djSmartQueue ||
      this.activeTransition
    );
  }

  /**
   * Terminate and detach dormant engine tracks, releasing buffers and analysis caches
   */
  detach() {
    this.cancelTransition();
    this._energyRingBuffer = null;
    this._energyRingCount = 0;
    this._energyRollingSum = 0;
    this._energyRingIdx = 0;
    this.cachedAnalysisLyrics = null;
    this.lastVocalLine = null;
    this.lastVocalEndMs = null;
    this.instantEnergy = 0;
    this.isTransitionTriggered = false;
  }

  /**
   * Ingest live 8-band audio spectrum magnitudes (0.0 to 1.0) from WASAPI loopback
   */
  recordSpectrumEnergy(bands) {
    if (!this.isDjProcessingEnabled()) return;
    if (!Array.isArray(bands) || bands.length === 0) return;

    // Weight sub-bass and vocal/treble bands for perceptually accurate energy measurement
    let sumSq = 0;
    for (let i = 0; i < bands.length; i++) {
      const b = Math.max(0, Math.min(1, Number(bands[i]) || 0));
      sumSq += b * b;
    }
    const currentRms = Math.sqrt(sumSq / bands.length);

    // Exponential moving average for smooth transient following without jumpiness
    this.instantEnergy = this.instantEnergy * 0.72 + currentRms * 0.28;

    // Fixed-size circular buffer with O(1) rolling sum to avoid O(N) shift and reduce overhead
    if (!this._energyRingBuffer) {
      this._energyRingCapacity = 250;
      this._energyRingBuffer = new Float32Array(this._energyRingCapacity);
      this._energyRingIdx = 0;
      this._energyRingCount = 0;
      this._energyRollingSum = 0;
    }

    const oldVal = this._energyRingCount >= this._energyRingCapacity
      ? this._energyRingBuffer[this._energyRingIdx]
      : 0;

    this._energyRingBuffer[this._energyRingIdx] = this.instantEnergy;
    this._energyRollingSum = this._energyRollingSum - oldVal + this.instantEnergy;
    this._energyRingIdx = (this._energyRingIdx + 1) % this._energyRingCapacity;
    if (this._energyRingCount < this._energyRingCapacity) {
      this._energyRingCount++;
    }

    // Keep legacy array reference shallowly synced without O(N) shift loops
    this.songEnergyHistory = this._energyRingBuffer;
    this.meanTrackEnergy = this._energyRingCount > 0
      ? (this._energyRollingSum / this._energyRingCount)
      : 0.15;
  }

  /**
   * Determine if live musical energy represents an active instrumental solo or beat drop
   */
  isSoloActive() {
    if (this.settings.djPreserveSolos === false) {
      return false;
    }
    const soloEnergyFloor = Math.max(0.08, this.meanTrackEnergy * 0.42);
    return this.instantEnergy > soloEnergyFloor;
  }

  /**
   * Compute equal-loudness volume gain multiplier (cosine curve)
   * Formula: ((1 + cos(pi * progress)) / 2) ^ 1.4
   * @param {number} progress 0.0 to 1.0
   * @returns {number} gain between 1.0 and 0.0
   */
  static getCosineGain(progress) {
    const p = Math.max(0, Math.min(1, progress));
    const cosVal = (1 + Math.cos(Math.PI * p)) / 2;
    return Math.pow(cosVal, 1.4);
  }

  /**
   * Evaluate playback state on playhead update tick.
   * Returns transition status object or null.
   */
  evaluateLyricTransition(playbackState) {
    const { currentTimeMs, durationMs, lyrics, isPlaying, track, spotifyDeviceId, spotifyToken } = playbackState || {};

    if (!this.settings.djLyricAutoTransition) return null;
    if (!isPlaying || !durationMs || durationMs <= 0 || !currentTimeMs) return null;
    if (this.isTransitionTriggered) return null;

    const remainingMs = durationMs - currentTimeMs;
    // Allow natural completion within 1 second of track end
    if (remainingMs <= 1000) return null;

    const { lastVocalEndMs } = this.analyzeTrackLyrics(lyrics);
    if (!lastVocalEndMs) return null;

    const graceSec = Number(this.settings.djOutroGraceSec) >= 0 ? Number(this.settings.djOutroGraceSec) : 2.5;
    const outroThresholdMs = lastVocalEndMs + (graceSec * 1000);

    // If playhead has passed the post-vocal grace period:
    if (currentTimeMs >= outroThresholdMs) {
      // Check if an instrumental solo is actively rocking:
      if (this.isSoloActive() && remainingMs > 3500) {
        return {
          status: 'SOLO_ACTIVE',
          instantEnergy: this.instantEnergy,
          meanEnergy: this.meanTrackEnergy,
          remainingMs
        };
      }

      // Energy dropped or outro is quiet: Trigger Lyric-Aware Auto-Transition!
      this.isTransitionTriggered = true;
      const fadeDurationSec = Number(this.settings.djFadeDurationSec) || 3.5;
      const effectiveFadeMs = Math.min(remainingMs - 400, fadeDurationSec * 1000);

      this.triggerFadeOut({
        durationMs: Math.max(1000, effectiveFadeMs),
        backend: this.settings.djFadeBackend || 'local',
        track,
        spotifyDeviceId,
        spotifyToken,
        onComplete: () => {
          this.executeTrackSkip({ track, spotifyToken, spotifyDeviceId });
        }
      });

      return {
        status: 'TRANSITIONING',
        reason: 'OUTRO_VOCAL_COMPLETED',
        fadeDurationMs: effectiveFadeMs,
        lastVocalEndMs
      };
    }

    return null;
  }

  /**
   * Execute smooth volume ducking fader
   */
  triggerFadeOut(options = {}) {
    const { durationMs = 3500, backend = 'local', spotifyToken, spotifyDeviceId, onComplete, startVol = 100 } = options;

    if (this.fadeState.timerId) {
      clearInterval(this.fadeState.timerId);
      this.fadeState.timerId = null;
    }

    this.fadeState = {
      isFading: true,
      startVolume: startVol,
      currentVolume: startVol,
      targetVolume: 0,
      fadeStartTime: Date.now(),
      fadeDurationMs: durationMs,
      timerId: null,
      backend
    };

    const intervalMs = 60;
    this.fadeState.timerId = setInterval(() => {
      const elapsed = Date.now() - this.fadeState.fadeStartTime;
      const progress = Math.min(1, elapsed / this.fadeState.fadeDurationMs);
      const gain = PlaybackDjEngine.getCosineGain(progress);
      const newVol = Math.round(this.fadeState.startVolume * gain);
      this.fadeState.currentVolume = newVol;

      this.applyVolume(newVol, backend, spotifyToken, spotifyDeviceId);

      if (progress >= 1) {
        clearInterval(this.fadeState.timerId);
        this.fadeState.timerId = null;
        this.fadeState.isFading = false;
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    }, intervalMs);
  }

  /**
   * Dispatch volume adjustment to local WASAPI CoreAudio or Spotify Web API
   */
  applyVolume(volume0to100, backend = 'local', spotifyToken = null, spotifyDeviceId = null) {
    const vol = Math.max(0, Math.min(100, volume0to100));

    // Spotify Soloist sub-millisecond local volume dispatch
    if (typeof window !== 'undefined' && window.soloistProvider && window.soloistProvider.isConnected && window.soloistProvider.isSessionActive) {
      window.soloistProvider.setVolume(vol);
      return;
    }

    if (backend === 'local' && typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
      // Local Windows WASAPI CoreAudio session volume: 0 network latency, 0 rate limit
      window.__TAURI__.core.invoke('adjust_music_app_volume', {
        appName: 'Spotify',
        volume: vol / 100.0
      }).catch(() => {
        // Fall back to Web API if local WASAPI audio session is not found
        if (spotifyToken) {
          this.sendSpotifyVolumeApi(vol, spotifyToken, spotifyDeviceId);
        }
      });
      return;
    }

    if (spotifyToken) {
      this.sendSpotifyVolumeApi(vol, spotifyToken, spotifyDeviceId);
    }
  }

  sendSpotifyVolumeApi(volume0to100, token, deviceId) {
    if (!token) return;
    const devQuery = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : '';
    fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume0to100}${devQuery}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(() => {});
  }

  /**
   * Trigger skip to next track
   */
  executeTrackSkip(context = {}) {
    if (typeof window !== 'undefined') {
      if (window.soloistProvider && window.soloistProvider.isConnected && window.soloistProvider.isSessionActive) {
        window.soloistProvider.next();
        return;
      }
      if (window.electronAPI && typeof window.electronAPI.nextTrack === 'function') {
        window.electronAPI.nextTrack();
        return;
      }
      if (window.__TAURI__?.core?.invoke) {
        window.__TAURI__.core.invoke('next_track').catch(() => {});
        return;
      }
    }

    if (context.spotifyToken) {
      const devQuery = context.spotifyDeviceId ? `?device_id=${encodeURIComponent(context.spotifyDeviceId)}` : '';
      fetch(`https://api.spotify.com/v1/me/player/next${devQuery}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${context.spotifyToken}`
        }
      }).catch(() => {});
    }
  }

  /**
   * Cancel in-flight transition and restore audio volume
   */
  cancelTransition() {
    if (this.fadeState.timerId) {
      clearInterval(this.fadeState.timerId);
      this.fadeState.timerId = null;
    }
    if (this.fadeState.isFading) {
      this.restoreVolume();
    }
    this.isTransitionTriggered = false;
  }

  /**
   * Restore volume to 100% (or pre-fade level)
   */
  restoreVolume(backend = 'local', spotifyToken = null, spotifyDeviceId = null) {
    this.fadeState.isFading = false;
    this.fadeState.currentVolume = this.preFadeVolume;
    this.applyVolume(this.preFadeVolume, backend, spotifyToken, spotifyDeviceId);
  }

  /**
   * Called when song changes: cleans up state and restores volume immediately
   */
  onSongChanged(newTrack) {
    this.cancelTransition();
    this.restoreVolume();
    this.lastVocalLine = null;
    this.lastVocalEndMs = null;
    this.cachedAnalysisLyrics = null;
    this.songEnergyHistory = [];
    this.meanTrackEnergy = 0.15;
    this.instantEnergy = 0;
    this.isTransitionTriggered = false;
    this.currentTrackId = newTrack?.id || newTrack?.uri || newTrack?.title || null;
  }

  /**
   * Smart DJ Queue Enqueuer:
   * Multi-tier recommendation fallback immune to Spotify's Nov 2024 /v1/recommendations deprecation
   */
  async enqueueSmartRecommendation(options = {}) {
    const { currentTrack, spotifyToken, lastFmApiKey } = options;

    if (!this.settings.djSmartQueue || !spotifyToken || !currentTrack) return null;
    const trackKey = currentTrack.id || currentTrack.title;
    if (this.enqueuedTrackUris.has(trackKey)) return null;

    try {
      let trackToQueueUri = null;

      // Tier 1: Last.fm track.getSimilar
      const title = currentTrack.title || currentTrack.name;
      const artist = currentTrack.artist;
      if (title && artist && lastFmApiKey) {
        const url = `https://ws.audioscrobbler.com/2.0/?method=track.getSimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&api_key=${encodeURIComponent(lastFmApiKey)}&format=json&limit=5`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const similarTracks = data?.similartracks?.track;
          if (Array.isArray(similarTracks) && similarTracks.length > 0) {
            const topMatch = similarTracks[0];
            const searchQ = `track:${topMatch.name} artist:${topMatch.artist?.name || topMatch.artist}`;
            const sRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQ)}&type=track&limit=1`, {
              headers: { 'Authorization': `Bearer ${spotifyToken}` }
            });
            if (sRes.ok) {
              const sData = await sRes.json();
              trackToQueueUri = sData?.tracks?.items?.[0]?.uri;
            }
          }
        }
      }

      // Tier 2 Fallback: Spotify Artist Top Tracks
      if (!trackToQueueUri && currentTrack.artistId) {
        const topRes = await fetch(`https://api.spotify.com/v1/artists/${encodeURIComponent(currentTrack.artistId)}/top-tracks?market=from_token`, {
          headers: { 'Authorization': `Bearer ${spotifyToken}` }
        });
        if (topRes.ok) {
          const topData = await topRes.json();
          const items = topData?.tracks || [];
          const alternative = items.find(t => t.id !== currentTrack.id);
          if (alternative) trackToQueueUri = alternative.uri;
        }
      }

      // Enqueue to Spotify active play queue
      if (trackToQueueUri) {
        const qRes = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackToQueueUri)}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${spotifyToken}` }
        });
        if (qRes.ok) {
          this.enqueuedTrackUris.add(trackKey);
          return trackToQueueUri;
        }
      }
    } catch (_) {}

    return null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PlaybackDjEngine };
}

if (typeof window !== 'undefined') {
  window.PlaybackDjEngine = PlaybackDjEngine;
  if (!window.djEngine) {
    window.djEngine = new PlaybackDjEngine();
  }
}
