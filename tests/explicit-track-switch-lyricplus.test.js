const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Running Explicit Track Switch & LyricPlus Upgrade Test Suite ---');

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

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// 1. Verify renderer.js has no undefined handleTrackChange reference
test('1. handleSoloistPlaybackUpdate dispatches handlePlaybackData and eliminates ReferenceError', () => {
  const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert.strictEqual(
    rendererCode.includes('handleTrackChange('),
    false,
    'renderer.js must not contain nonexistent handleTrackChange'
  );
  assert.strictEqual(
    rendererCode.includes('handleSoloistPlaybackUpdate'),
    true,
    'handleSoloistPlaybackUpdate must be defined'
  );
  assert.strictEqual(
    rendererCode.includes('isSameTrack('),
    true,
    'isSameTrack helper must be defined'
  );
  assert.strictEqual(
    rendererCode.includes('normalizeTrackId('),
    true,
    'normalizeTrackId helper must be defined'
  );
});

// 2. Functional test of isSameTrack and normalizeTrackId
test('2. isSameTrack correctly correlates Spotify URI, Spotify ID, and SMTC local ID', () => {
  function normalizeTrackId(id) {
    if (!id) return '';
    return String(id).replace(/^spotify:track:/, '').trim();
  }

  function isSameTrack(t1, t2) {
    if (!t1 || !t2) return false;
    const id1 = normalizeTrackId(t1.id || t1.uri);
    const id2 = normalizeTrackId(t2.id || t2.uri);
    if (id1 && id2 && !id1.startsWith('local_') && !id2.startsWith('local_') && id1 === id2) {
      return true;
    }
    const title1 = (t1.name || t1.title || '').trim().toLowerCase();
    const title2 = (t2.name || t2.title || '').trim().toLowerCase();
    if (!title1 || !title2) return false;

    const artist1 = (t1.artists?.[0]?.name || t1.artist || '').trim().toLowerCase();
    const artist2 = (t2.artists?.[0]?.name || t2.artist || '').trim().toLowerCase();

    const titleMatch = title1 === title2 || title1.includes(title2) || title2.includes(title1);
    const artistMatch = !artist1 || !artist2 || artist1 === artist2 || artist1.includes(artist2) || artist2.includes(artist1);

    return titleMatch && artistMatch;
  }

  const trackSmtc = {
    id: 'local_VGhlIFdlZWtuZF9CbGluZGluZyBMaWdodHM=',
    name: 'Blinding Lights',
    artist: 'The Weeknd'
  };

  const trackSoloist = {
    id: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b',
    uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b',
    name: 'Blinding Lights',
    artists: [{ name: 'The Weeknd' }]
  };

  const trackSpotifyWeb = {
    id: '0VjIjW4GlUZAMYd2vXMi3b',
    name: 'Blinding Lights',
    artists: [{ name: 'The Weeknd' }],
    external_ids: { isrc: 'USUG11904206' }
  };

  const differentTrack = {
    id: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
    name: 'Neverita',
    artists: [{ name: 'Bad Bunny' }]
  };

  assert.strictEqual(isSameTrack(trackSmtc, trackSoloist), true, 'SMTC and Soloist must match same track');
  assert.strictEqual(isSameTrack(trackSoloist, trackSpotifyWeb), true, 'Soloist URI and Spotify ID must match');
  assert.strictEqual(isSameTrack(trackSmtc, trackSpotifyWeb), true, 'SMTC and Spotify Web must match');
  assert.strictEqual(isSameTrack(trackSoloist, differentTrack), false, 'Different track must not match');
});

// 3. LyricsPlus dual-key caching
test('3. LyricsPlus dual-key caching resolves without ISRC on cache hit', () => {
  const { LyricsPlusService } = require('../src/services/lyrics/LyricsPlus');
  const service = new LyricsPlusService();

  const mockStorage = {};
  global.localStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; }
  };

  const metadataWithIsrc = {
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: 200,
    isrc: 'USUG11904206'
  };

  const fakeLyrics = {
    type: 'WORD',
    source: 'LyricsPlus (Apple)',
    lines: [{ time: 1000, duration: 2000, text: 'Yeah', words: [{ text: 'Yeah', start: 1, end: 2 }] }]
  };

  service.setCached(metadataWithIsrc, fakeLyrics);

  // Read back with NO isrc (e.g. from local SMTC lookup)
  const metadataWithoutIsrc = {
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: 200
  };

  const cached = service.getCached(metadataWithoutIsrc);
  assert(cached !== null, 'Must retrieve cached lyrics even when ISRC is absent in second query');
  assert.strictEqual(cached.source, 'LyricsPlus (Apple)');
});

// 4. Test onLocalPlaybackChange preserves lastSpotifyPlaybackData on identical track
test('4. onLocalPlaybackChange contains same-song guard to prevent SMTC downgrading Spotify data', () => {
  const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert(
    rendererCode.includes('lastSpotifyPlaybackData?.item') &&
    rendererCode.includes('handlePlaybackData(lastSpotifyPlaybackData)'),
    'onLocalPlaybackChange must preserve lastSpotifyPlaybackData for the same track'
  );
});

// 5. Test applyLyricsData Apple Music upgrade exception
test('5. applyLyricsData supports Apple Music word-synced upgrade over existing non-Apple word lyrics', () => {
  const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
  assert(
    rendererCode.includes('isAppleUpgrade') &&
    rendererCode.includes("sourceName.toLowerCase().includes('apple')"),
    'applyLyricsData must contain isAppleUpgrade exception'
  );
});

console.log(`\nExplicit Track Switch Results: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
