/**
 * SoloistProvider — Spotify Soloist Local WebSocket API Client for LyricFlow
 *
 * Capabilities:
 * 1. Connects to Spotify Soloist Local WebSocket API (`ws://127.0.0.1:{port}`)
 * 2. Real-Time Push Playback Events: Sub-millisecond playhead position, track metadata,
 *    and playback state without cloud polling lag or clock drift.
 * 3. 80-Track Local Queue: Streams upcoming queued tracks locally for instant "Next Up"
 *    and Virtual DJ auto-transition synergy.
 * 4. Local Command Dispatch: Sends instant JSON command frames for play, pause, seek,
 *    volume, next, previous, and queueing with <1ms loopback latency.
 * 5. Resilient Auto-Reconnect: Exponential backoff recovery if the Soloist daemon restarts.
 */

class SoloistProvider {
  constructor(options = {}) {
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 4488;
    this.autoConnect = options.autoConnect !== false;
    this.ws = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.isSessionActive = false;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 20;

    this.currentTrack = null;
    this.playbackState = {
      isPlaying: false,
      positionMs: 0,
      durationMs: 0,
      volume: 100,
      shuffle: false,
      repeat: 'off',
      timestamp: Date.now()
    };
    this.upcomingQueue = [];

    this.callbacks = {
      onPlaybackState: [],
      onQueueUpdate: [],
      onConnectionChange: [],
      onAuthChange: []
    };
  }

  /**
   * Connect to Soloist WebSocket server
   */
  connect(host = this.host, port = this.port) {
    this.host = host || this.host;
    this.port = port || this.port;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }

    const wsUrl = `ws://${this.host}:${this.port}`;
    console.log(`[Soloist] Connecting to local WebSocket API: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn(`[Soloist] Connection error:`, err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log(`[Soloist] Connected to ${wsUrl}`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this._emit('onConnectionChange', { isConnected: true, host: this.host, port: this.port });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
        if (data) {
          this.handleMessage(data);
        }
      } catch (err) {
        console.error(`[Soloist] Error parsing message:`, err);
      }
    };

    this.ws.onerror = (err) => {
      console.warn(`[Soloist] Socket error:`, err);
    };

    this.ws.onclose = () => {
      console.log(`[Soloist] Disconnected from ${wsUrl}`);
      this.isConnected = false;
      this.isAuthenticated = false;
      this.isSessionActive = false;
      this._emit('onConnectionChange', { isConnected: false, host: this.host, port: this.port });
      this.scheduleReconnect();
    };
  }

  /**
   * Disconnect and stop auto-reconnecting
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.isConnected = false;
    this.isAuthenticated = false;
    this.isSessionActive = false;
    this._emit('onConnectionChange', { isConnected: false });
  }

  /**
   * Exponential backoff reconnect
   */
  scheduleReconnect() {
    if (!this.autoConnect) return;
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = Math.min(10000, 1000 * Math.pow(1.5, Math.min(this.reconnectAttempts, 6)));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * Inbound message event processor
   */
  handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    const eventType = msg.type || msg.event;

    // 1. Authentication state event
    if (eventType === 'auth_state') {
      this.isAuthenticated = Boolean(msg.authenticated || msg.status === 'ok' || msg.logged_in);
      if (typeof msg.is_active === 'boolean') {
        this.isSessionActive = msg.is_active;
      }
      this._emit('onAuthChange', {
        isAuthenticated: this.isAuthenticated,
        isActive: this.isSessionActive,
        deviceName: msg.device_name || null
      });
      return;
    }

    // 2. Playback state & real-time events (playback_changed, track_changed, position_sync)
    if (eventType === 'playback_state' || eventType === 'playback_changed' || eventType === 'track_changed' || eventType === 'position_sync' || msg.playback_state) {
      const state = msg.playback_state || msg;

      if (state.track) {
        const trackData = state.track;
        const artistName = trackData.artist ||
          (Array.isArray(trackData.artists) ? trackData.artists.map(a => a.name || a).join(', ') : 'Unknown Artist');

        this.currentTrack = {
          id: trackData.id || trackData.uri || '',
          uri: trackData.uri || '',
          title: trackData.title || trackData.name || '',
          name: trackData.title || trackData.name || '',
          artist: artistName,
          album: trackData.album || (trackData.album_name ? { name: trackData.album_name } : {}),
          albumArt: trackData.album_art || trackData.cover_url || trackData.art_url || null,
          durationMs: Number(trackData.duration_ms) || (Number(trackData.duration) * 1000) || (this.currentTrack?.durationMs || 0)
        };
      }

      if (typeof state.is_playing === 'boolean') {
        this.playbackState.isPlaying = state.is_playing;
      }
      if (state.position_ms != null || state.position != null) {
        this.playbackState.positionMs = Number(state.position_ms) || (Number(state.position) * 1000) || 0;
      }
      if (typeof state.volume === 'number') {
        this.playbackState.volume = Math.round(state.volume > 1 ? state.volume : state.volume * 100);
      }
      if (state.shuffle != null) this.playbackState.shuffle = Boolean(state.shuffle);
      if (state.repeat != null) this.playbackState.repeat = state.repeat;
      this.playbackState.durationMs = this.currentTrack ? this.currentTrack.durationMs : this.playbackState.durationMs;
      this.playbackState.timestamp = Date.now();
      this.isSessionActive = Boolean(this.currentTrack || this.playbackState.isPlaying);

      this._emit('onPlaybackState', {
        track: this.currentTrack,
        playback: this.playbackState
      });
      return;
    }

    // 3. Queue state & queue_changed event (up to 80 upcoming tracks)
    if (eventType === 'queue_state' || eventType === 'queue_changed' || msg.queue) {
      const queueItems = Array.isArray(msg.queue) ? msg.queue : (msg.items || []);
      this.upcomingQueue = queueItems.map(item => {
        const itemArtist = item.artist ||
          (Array.isArray(item.artists) ? item.artists.map(a => a.name || a).join(', ') : 'Unknown Artist');
        return {
          id: item.id || item.uri || '',
          uri: item.uri || '',
          title: item.title || item.name || '',
          name: item.title || item.name || '',
          artist: itemArtist,
          album: item.album || (item.album_name ? { name: item.album_name } : {}),
          albumArt: item.album_art || item.cover_url || null,
          durationMs: Number(item.duration_ms) || 0
        };
      });

      this._emit('onQueueUpdate', { queue: this.upcomingQueue });
      return;
    }

    // 4. Volume state event
    if (eventType === 'volume_state' || typeof msg.volume === 'number') {
      const vol = typeof msg.volume === 'number' ? Math.round(msg.volume > 1 ? msg.volume : msg.volume * 100) : 100;
      this.playbackState.volume = vol;
    }
  }

  /**
   * Dispatch JSON command to Soloist WebSocket API
   */
  sendCommand(command, params = {}) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== 1) {
      console.warn(`[Soloist] Cannot send command '${command}': not connected.`);
      return false;
    }

    const payload = JSON.stringify({
      type: 'command',
      command,
      ...params
    });

    try {
      this.ws.send(payload);
      return true;
    } catch (err) {
      console.error(`[Soloist] Failed to send command '${command}':`, err);
      return false;
    }
  }

  // Transport Control Conveniences
  play() {
    return this.sendCommand('play');
  }

  pause() {
    return this.sendCommand('pause');
  }

  togglePlayPause() {
    return this.sendCommand('play_pause');
  }

  next() {
    return this.sendCommand('next');
  }

  previous() {
    return this.sendCommand('previous');
  }

  seek(positionMs) {
    return this.sendCommand('seek', { position_ms: Math.max(0, Math.round(positionMs)) });
  }

  setVolume(volume0to100) {
    const vol = Math.max(0, Math.min(100, Math.round(volume0to100)));
    return this.sendCommand('volume', { volume: vol });
  }

  enqueue(uri) {
    if (!uri) return false;
    return this.sendCommand('queue', { uri });
  }

  // Event Subscription
  on(event, callback) {
    if (this.callbacks[event] && typeof callback === 'function') {
      this.callbacks[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }
  }

  _emit(event, payload) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`[Soloist] Callback error on '${event}':`, e);
        }
      });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SoloistProvider };
}

if (typeof window !== 'undefined') {
  window.SoloistProvider = SoloistProvider;
  if (!window.soloistProvider) {
    window.soloistProvider = new SoloistProvider({ autoConnect: false });
  }
}
