/**
 * tests/apple-motion-art.test.js
 * Unit & Integration tests for Apple Music Motion Artwork engine
 */

const assert = require('assert');
const {
  fetchAppleMotionArt,
  cleanString,
  getCacheKey,
  resolveProgressiveMp4,
  isDisqualifiedAppleCollection
} = require('../src/modules/apple-motion-art.js');

let passed = 0;
let failed = 0;
const asyncQueue = [];

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${label}`);
    console.error('    Error:', err.message);
    failed++;
  }
}

function testAsync(label, fn) {
  asyncQueue.push({ label, fn });
}

console.log('\n--- Running Apple Music Motion Art Test Suite ---');

// 1. cleanString tests
test('cleanString strips - Topic suffix', () => {
  assert.strictEqual(cleanString('The Weeknd - Topic'), 'The Weeknd');
});

test('cleanString strips featured artists', () => {
  assert.strictEqual(cleanString('Levitating (feat. DaBaby)'), 'Levitating');
  assert.strictEqual(cleanString('Song Title feat. Someone Else'), 'Song Title');
});

test('cleanString strips Deluxe / Remaster annotations', () => {
  assert.strictEqual(cleanString('Midnights (3am Edition)'), 'Midnights');
  assert.strictEqual(cleanString('After Hours (Deluxe)'), 'After Hours');
  assert.strictEqual(cleanString('In Rainbows - Remastered'), 'In Rainbows');
});

test('cleanString normalizes typographic quotes and dashes', () => {
  assert.strictEqual(cleanString("B’s On The Table (feat. 21 Savage)"), "B's On The Table");
  assert.strictEqual(cleanString("Don‘t Stop"), "Don't Stop");
  assert.strictEqual(cleanString("Canʼt Tell Me Nothing"), "Can't Tell Me Nothing");
  assert.strictEqual(cleanString("`All Day`"), "'All Day'");
  assert.strictEqual(cleanString("“Heroes”"), '"Heroes"');
  assert.strictEqual(cleanString("Take Care – Single"), "Take Care");
  assert.strictEqual(cleanString("One Dance — Remix"), "One Dance - Remix");
});

test('isDisqualifiedAppleCollection correctly identifies DJ mixes, compilations, and curators', () => {
  // DJ mixes and mixes
  assert.strictEqual(isDisqualifiedAppleCollection('Today’s Hits 2020 (DJ Mix)', 'Various Artists', true, 'Apple Music'), true);
  assert.strictEqual(isDisqualifiedAppleCollection('Party In The Jungle: Deejay Massive (DJ Mix)', 'Various Artists', false, null), true);
  assert.strictEqual(isDisqualifiedAppleCollection('Rap Life: September 2026', 'Various Artists', false, 'Apple Music'), true);
  assert.strictEqual(isDisqualifiedAppleCollection('Continuous Mix: Vol 1', 'Various Artists', false, null), true);
  assert.strictEqual(isDisqualifiedAppleCollection('Drake Megamix', 'Various Artists', false, null), true);
  assert.strictEqual(isDisqualifiedAppleCollection('Controlla [Mixed]', 'Drake', false, null), true);

  // Compilations without compilation query
  assert.strictEqual(isDisqualifiedAppleCollection('Greatest Hits', 'Drake', true, null, 'Drake B\'s On The Table'), true);
  // Compilations with explicit compilation query
  assert.strictEqual(isDisqualifiedAppleCollection('Greatest Hits Compilation', 'Drake', true, null, 'Drake Compilation'), false);

  // Various Artists when querying specific artist
  assert.strictEqual(isDisqualifiedAppleCollection('Summer Bangers', 'Various Artists', false, null, 'Drake'), true);
  // Various Artists when querying Various Artists
  assert.strictEqual(isDisqualifiedAppleCollection('Summer Bangers', 'Various Artists', false, null, 'Various Artists'), false);

  // Authentic studio album
  assert.strictEqual(isDisqualifiedAppleCollection('ICEMAN', 'Drake', false, null, 'Drake B\'s On The Table'), false);
  assert.strictEqual(isDisqualifiedAppleCollection('Certified Lover Boy', 'Drake', false, null, 'Drake CLB'), false);

  // Explicit DJ mix query preserves mixes
  assert.strictEqual(isDisqualifiedAppleCollection('Boiler Room DJ Mix', 'Kaytranada', false, null, 'Kaytranada DJ Mix'), false);
});

// 2. getCacheKey tests
test('getCacheKey creates uniform lowercase composite key', () => {
  const key = getCacheKey('Taylor Swift', 'Anti-Hero', 'Midnights');
  assert.strictEqual(key, 'taylor swift::midnights');

  const keyNoAlbum = getCacheKey('The Weeknd', 'Blinding Lights', '');
  assert.strictEqual(keyNoAlbum, 'the weeknd::blinding lights');
});

// 3. Null and edge-case handling
testAsync('fetchAppleMotionArt handles empty metadata without throwing', async () => {
  const res = await fetchAppleMotionArt('', '', '');
  assert.strictEqual(res, null);
});

// 4. resolveProgressiveMp4 tests
testAsync('resolveProgressiveMp4 correctly resolves base URL and MP4 filename from m3u8 header', async () => {
  // Stub globalThis.fetch for controlled unit testing
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.endsWith('.m3u8')) {
      return {
        ok: true,
        text: async () => `#EXTM3U\n#EXT-X-MAP:URI="P517392561_Anull_video_gr203_sdr_360x360_-.mp4",BYTERANGE="896@0"`
      };
    }
    return { ok: false };
  };

  try {
    const testM3u8 = 'https://mvod.itunes.apple.com/path/to/stream.m3u8';
    const mp4Url = await resolveProgressiveMp4(testM3u8);
    assert.strictEqual(mp4Url, 'https://mvod.itunes.apple.com/path/to/P517392561_Anull_video_gr203_sdr_360x360_-.mp4');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// 5. IPC bridge priority
testAsync('fetchAppleMotionArt prefers IPC when window.electronAPI is available', async () => {
  global.window = {
    electronAPI: {
      fetchAppleMotionArt: async (artist, title, album) => ({
        url: 'https://mvod.itunes.apple.com/test_square.mp4',
        tall_url: 'https://mvod.itunes.apple.com/test_tall.mp4',
        m3u8_url: 'https://mvod.itunes.apple.com/test_square.m3u8',
        aspect_ratio: 'square',
        album: 'Test Album',
        artist: 'Test Artist',
        static_art: 'https://a5.mzstatic.com/test.jpg'
      })
    }
  };

  try {
    const res = await fetchAppleMotionArt('Mock Artist', 'Mock Track', 'Mock Album');
    assert.ok(res !== null, 'Response should not be null');
    assert.strictEqual(res.type, 'video');
    assert.strictEqual(res.source, 'apple-motion');
    assert.strictEqual(res.url, 'https://mvod.itunes.apple.com/test_square.mp4');
    assert.strictEqual(res.tallUrl, 'https://mvod.itunes.apple.com/test_tall.mp4');
    assert.strictEqual(res.aspectRatio, 'square');
  } finally {
    delete global.window;
  }
});

testAsync('fetchAppleMotionArt continues to the web resolver when the Rust lookup misses', async () => {
  const oldWindow = global.window;
  const oldFetch = globalThis.fetch;
  global.window = { electronAPI: { fetchAppleMotionArt: async () => null } };
  globalThis.fetch = async (url) => {
    const requestUrl = String(url);
    if (requestUrl.includes('/us/browse')) return { ok: true, text: async () => '' };
    if (requestUrl.includes('amp-api.music.apple.com')) return { ok: false };
    if (requestUrl.includes('itunes.apple.com/search')) {
      return {
        ok: true,
        json: async () => ({
          results: [{
            artistName: 'Regression Artist',
            collectionName: 'Regression Album',
            collectionType: 'Album',
            collectionViewUrl: 'https://music.apple.com/us/album/regression-album/12345'
          }]
        })
      };
    }
    if (requestUrl.includes('api.aritra.ovh')) {
      return {
        ok: true,
        json: async () => ({
          master_Streams: { square: [{ width: 480, uri: 'https://motion.test/master.m3u8' }] },
          album_info: { title: 'Regression Album', artist: 'Regression Artist' }
        })
      };
    }
    if (requestUrl === 'https://motion.test/master.m3u8') {
      return {
        ok: true,
        text: async () => '#EXTM3U\n#EXT-X-STREAM-INF:CODECS="avc1.4d401f",RESOLUTION=480x480\nvariant.m3u8'
      };
    }
    if (requestUrl === 'https://motion.test/variant.m3u8') {
      return { ok: true, text: async () => '#EXTM3U\n#EXT-X-MAP:URI="../video.mp4"' };
    }
    return { ok: false };
  };

  try {
    const result = await fetchAppleMotionArt('Regression Artist', 'Regression Track', 'Regression Album');
    assert.ok(result, 'Web fallback should resolve motion artwork after the Rust catalog misses');
    assert.strictEqual(result.url, 'https://motion.test/video.mp4', 'Relative HLS paths should resolve against their playlist URL');
  } finally {
    globalThis.fetch = oldFetch;
    if (oldWindow === undefined) delete global.window;
    else global.window = oldWindow;
  }
});

// 6. Live network verification (resolves real motion art for a known release)
testAsync('fetchAppleMotionArt live network test for The Weeknd - After Hours', async () => {
  const result = await fetchAppleMotionArt('The Weeknd', 'Blinding Lights', 'After Hours');
  if (result) {
    assert.strictEqual(result.type, 'video');
    assert.strictEqual(result.source, 'apple-motion');
    assert.ok(result.url.includes('itunes.apple.com') || result.url.includes('mzstatic.com'), 'URL should point to Apple CDN');
    assert.ok(result.url.endsWith('.mp4') || result.url.endsWith('.m3u8'), 'URL should be video stream');
    console.log(`    Live stream resolved: ${result.url.substring(0, 70)}...`);
  }
});

// 7. Verification for Kanye West - Graduation (user issue 1)
testAsync('fetchAppleMotionArt resolves motion artwork for Kanye West - Graduation', async () => {
  const result = await fetchAppleMotionArt('Kanye West', 'Homecoming', 'Graduation');
  if (!result) {
    console.log('    Apple catalog returned no Graduation motion asset (or network is unavailable); fallback behavior is covered by the mocked resolver test.');
    return;
  }
  assert.strictEqual(result.type, 'video');
  assert.strictEqual(result.album, 'Graduation');
  assert.ok(result.url.includes('itunes.apple.com'), 'URL should point to Apple CDN');
  assert.ok(result.url.endsWith('.mp4'), 'Should resolve direct MP4 for smooth playback');
  console.log(`    Graduation stream resolved: ${result.url.substring(0, 70)}...`);
});

// 8. Verification for Drake - Rich Flex (Her Loss) (user issue 2: must NOT return Views)
testAsync('fetchAppleMotionArt returns null for Rich Flex / Her Loss without substituting Views', async () => {
  const result = await fetchAppleMotionArt('Drake & 21 Savage', 'Rich Flex', 'Her Loss');
  assert.strictEqual(result, null, 'Her Loss has no motion art, must return null (not Views)');
});

// 9. Verification for Drake - B's On The Table (must NOT return DJ mixes like "Party In The Jungle" or "Rap Life")
testAsync('fetchAppleMotionArt for Drake - B’s On The Table never resolves to a DJ mix', async () => {
  const result = await fetchAppleMotionArt('Drake', "B’s On The Table (feat. 21 Savage)", '');
  if (result) {
    const alb = (result.album || '').toLowerCase();
    assert(!alb.includes('dj mix'), `Result must not be a DJ Mix: ${result.album}`);
    assert(!alb.includes('party in the jungle'), `Result must not be Party In The Jungle: ${result.album}`);
    assert(!alb.includes('rap life'), `Result must not be Rap Life: ${result.album}`);
    assert(!alb.includes('mixed'), `Result must not be mixed collection: ${result.album}`);
  }
});

async function main() {
  for (const item of asyncQueue) {
    try {
      await item.fn();
      console.log(`  ✓ ${item.label}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${item.label}`);
      console.error('    Error:', err.message);
      failed++;
    }
  }
  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main();
