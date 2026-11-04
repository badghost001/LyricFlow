const assert = require('assert');
const { SoloistProvider } = require('../src/modules/soloist-provider.js');

console.log('--- Running Spotify Soloist WebSocket Provider Test Suite ---');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// 1. Initialization & Defaults
test('1. SoloistProvider initializes with default loopback configuration', () => {
  const provider = new SoloistProvider({ host: '127.0.0.1', port: 4488, autoConnect: false });
  assert.strictEqual(provider.host, '127.0.0.1');
  assert.strictEqual(provider.port, 4488);
  assert.strictEqual(provider.isConnected, false);
  assert.strictEqual(provider.isAuthenticated, false);
  assert.strictEqual(provider.isSessionActive, false);
});

// 2. Auth State Processing
test('2. handleMessage processes auth_state events accurately', () => {
  const provider = new SoloistProvider({ autoConnect: false });
  let authEmitted = null;
  provider.on('onAuthChange', (data) => { authEmitted = data; });

  provider.handleMessage({ type: 'auth_state', authenticated: true });
  assert.strictEqual(provider.isAuthenticated, true);
  assert.strictEqual(authEmitted.isAuthenticated, true);

  provider.handleMessage({ type: 'auth_state', authenticated: false });
  assert.strictEqual(provider.isAuthenticated, false);
});

// 3. Playback State Event Ingestion & Normalization
test('3. handleMessage processes playback_state with sub-millisecond precision', () => {
  const provider = new SoloistProvider({ autoConnect: false });
  let emittedState = null;
  provider.on('onPlaybackState', (data) => { emittedState = data; });

  provider.handleMessage({
    type: 'playback_state',
    is_playing: true,
    position_ms: 45280,
    volume: 85,
    shuffle: true,
    repeat: 'context',
    track: {
      id: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
      uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
      title: 'Neverita',
      artists: [{ name: 'Bad Bunny' }],
      album_name: 'Un Verano Sin Ti',
      duration_ms: 220000
    }
  });

  assert.strictEqual(provider.isSessionActive, true);
  assert.strictEqual(provider.playbackState.isPlaying, true);
  assert.strictEqual(provider.playbackState.positionMs, 45280);
  assert.strictEqual(provider.playbackState.volume, 85);
  assert.strictEqual(provider.currentTrack.title, 'Neverita');
  assert.strictEqual(provider.currentTrack.artist, 'Bad Bunny');
  assert.strictEqual(provider.currentTrack.durationMs, 220000);
  assert(emittedState !== null, 'Must emit onPlaybackState event');
  assert.strictEqual(emittedState.track.title, 'Neverita');
});

// 4. Local 80-Track Queue Ingestion
test('4. handleMessage processes up to 80 upcoming queue items', () => {
  const provider = new SoloistProvider({ autoConnect: false });
  let emittedQueue = null;
  provider.on('onQueueUpdate', (data) => { emittedQueue = data; });

  const mockItems = [];
  for (let i = 1; i <= 25; i++) {
    mockItems.push({
      id: `track-${i}`,
      title: `Song ${i}`,
      artist: `Artist ${i}`,
      duration_ms: 180000 + i * 1000
    });
  }

  provider.handleMessage({
    type: 'queue_state',
    queue: mockItems
  });

  assert.strictEqual(provider.upcomingQueue.length, 25);
  assert.strictEqual(provider.upcomingQueue[0].title, 'Song 1');
  assert.strictEqual(provider.upcomingQueue[0].artist, 'Artist 1');
  assert.strictEqual(provider.upcomingQueue[24].title, 'Song 25');
  assert(emittedQueue !== null && emittedQueue.queue.length === 25, 'Must emit onQueueUpdate event');
});

// 5. Command Dispatching (Mocked WebSocket Frame Verification)
test('5. sendCommand dispatches valid JSON text frames for playback controls', () => {
  const sentFrames = [];
  const mockWs = {
    readyState: 1, // WebSocket.OPEN
    send: (str) => { sentFrames.push(JSON.parse(str)); }
  };

  const provider = new SoloistProvider({ autoConnect: false });
  provider.isConnected = true;
  provider.ws = mockWs;

  provider.play();
  provider.pause();
  provider.seek(65000);
  provider.setVolume(75);
  provider.next();
  provider.previous();
  provider.enqueue('spotify:track:xyz');

  assert.strictEqual(sentFrames.length, 7);
  assert.deepStrictEqual(sentFrames[0], { type: 'command', command: 'play' });
  assert.deepStrictEqual(sentFrames[1], { type: 'command', command: 'pause' });
  assert.deepStrictEqual(sentFrames[2], { type: 'command', command: 'seek', position_ms: 65000 });
  assert.deepStrictEqual(sentFrames[3], { type: 'command', command: 'volume', volume: 75 });
  assert.deepStrictEqual(sentFrames[4], { type: 'command', command: 'next' });
  assert.deepStrictEqual(sentFrames[5], { type: 'command', command: 'previous' });
  assert.deepStrictEqual(sentFrames[6], { type: 'command', command: 'queue', uri: 'spotify:track:xyz' });
});

// 6. Callback Unsubscription
test('6. off cleanly unsubscribes event listeners', () => {
  const provider = new SoloistProvider({ autoConnect: false });
  let count = 0;
  const listener = () => { count++; };

  provider.on('onAuthChange', listener);
  provider.handleMessage({ type: 'auth_state', authenticated: true });
  assert.strictEqual(count, 1);

  provider.off('onAuthChange', listener);
  provider.handleMessage({ type: 'auth_state', authenticated: true });
  assert.strictEqual(count, 1, 'Listener must not fire after unsubscription');
});

// 7. Live Soloist auth_state format with logged_in and is_active
test('7. handleMessage processes live soloist auth_state format with logged_in and device_name', () => {
  const provider = new SoloistProvider({ autoConnect: false });
  provider.handleMessage({
    type: 'auth_state',
    logged_in: false,
    is_active: false,
    device_name: 'LyricFlow'
  });
  assert.strictEqual(provider.isAuthenticated, false);
  assert.strictEqual(provider.isSessionActive, false);

  provider.handleMessage({
    type: 'auth_state',
    logged_in: true,
    is_active: true,
    device_name: 'LyricFlow'
  });
  assert.strictEqual(provider.isAuthenticated, true);
  assert.strictEqual(provider.isSessionActive, true);
});

// 8. Individual Soloist event streams (track_changed, playback_changed, position_sync)
test('8. handleMessage processes track_changed, playback_changed, and position_sync streams', () => {
  const provider = new SoloistProvider({ autoConnect: false });

  // 1. track_changed
  provider.handleMessage({
    type: 'track_changed',
    track: {
      uri: 'spotify:track:123',
      title: 'Lossless Track',
      artist: 'Drake',
      duration_ms: 195000
    }
  });
  assert.strictEqual(provider.currentTrack.title, 'Lossless Track');
  assert.strictEqual(provider.currentTrack.artist, 'Drake');
  assert.strictEqual(provider.currentTrack.durationMs, 195000);

  // 2. playback_changed
  provider.handleMessage({
    type: 'playback_changed',
    is_playing: true
  });
  assert.strictEqual(provider.playbackState.isPlaying, true);

  // 3. position_sync
  provider.handleMessage({
    type: 'position_sync',
    position_ms: 12450
  });
  assert.strictEqual(provider.playbackState.positionMs, 12450);
});

console.log(`\nSpotify Soloist Provider Results: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
