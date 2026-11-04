/**
 * Comprehensive Unit Tests for LyricsPlus Integration & LyricEngine
 * Tests all required cases from prompt Section 14.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createLyricWord, createLyricLine, createNormalizedLyrics, isValidLyrics } = require('../src/services/lyrics/models');
const { LyricsPlusService, LyricsPlusProvider, normalizeMetadata, getCacheKey, responseMatchesRequestedTrack, isQAppleLyrics } = require('../src/services/lyrics/LyricsPlus');
const LyricEngine = require('../src/services/lyrics/LyricsEngine');
const ExistingWaterfallProvider = require('../src/services/lyrics/ExistingWaterfallProvider');
const { LyricsManager } = require('../src/services/lyrics/index');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

// Mock localStorage for testing
const mockStorage = {};
global.localStorage = {
  getItem: (k) => (k in mockStorage ? mockStorage[k] : null),
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

async function runAllTests() {
  console.log('\n--- Running LyricsPlus & LyricEngine Test Suite ---\n');

  test('LyricsPlus rejects lyrics whose selected song metadata does not match', () => {
    const requested = { title: 'Mockingbird', artist: 'Eminem' };
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Mockingbird', artist: 'Eminem' }
    }, requested), true);
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Without Me', artist: 'Eminem' }
    }, requested), false);
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Mockingbird', artist: 'Drake' }
    }, requested), false);
  });

  test('LyricsPlus rejects incompatible track versions (e.g. remixes, live, re-records) for standard requests', () => {
    const requested = { title: 'Pompeii', artist: 'Bastille' };
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Pompeii (Kat Krazy Remix)', artist: 'Bastille' }
    }, requested), false, 'Must reject Kat Krazy Remix when Pompeii original is requested');
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Pompeii (Audien Remix)', artist: 'Bastille' }
    }, requested), false, 'Must reject Audien Remix when Pompeii original is requested');
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Pompeii MMXXIII', artist: 'Bastille' }
    }, requested), false, 'Must reject MMXXIII anniversary re-recording when Pompeii original is requested');
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Pompeii (Live from Capitol Studios 2013)', artist: 'Bastille' }
    }, requested), false, 'Must reject Live recording when Pompeii original is requested');
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Pompeii - Remastered 2023', artist: 'Bastille' }
    }, requested), true, 'Must accept Remastered recording when Pompeii original is requested');
  });

  test('LyricsPlus accurately separates solo and featured tracks (e.g. Levitating feat. DaBaby vs Levitating)', () => {
    const solo = { title: 'Levitating', artist: 'Dua Lipa' };
    const feat = { title: 'Levitating (feat. DaBaby)', artist: 'Dua Lipa' };
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Levitating', artist: 'Dua Lipa' }
    }, solo), true);
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Levitating (feat. DaBaby)', artist: 'Dua Lipa' }
    }, solo), false, 'Must reject feat. DaBaby when solo Levitating requested');
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Levitating (feat. DaBaby)', artist: 'Dua Lipa' }
    }, feat), true);
    assert.strictEqual(responseMatchesRequestedTrack({
      selectedSongMetadata: { title: 'Levitating', artist: 'Dua Lipa' }
    }, feat), false, 'Must reject solo when feat. DaBaby requested');
  });

  // 1. WORD-level LyricsPlus response
  test('1. WORD-level LyricsPlus response normalization', () => {
    const service = new LyricsPlusService();
    const mockApiResponse = {
      type: 'Word',
      lyrics: [
        {
          time: 12300,
          duration: 3500,
          text: "It's me, my honesty's",
          syllabus: [
            { time: 12300, duration: 250, text: "It's " },
            { time: 12550, duration: 350, text: "me, " },
            { time: 12900, duration: 300, text: "my " },
            { time: 13200, duration: 900, text: "honesty's" }
          ]
        }
      ],
      processingTime: { winnerSource: 'apple' }
    };

    const normalized = service.normalizeResponse(mockApiResponse, { title: 'Anti-Hero', artist: 'Taylor Swift' });
    assert(normalized !== null, 'Expected normalized object');
    assert.strictEqual(normalized.type, 'WORD', 'Expected type to be WORD');
    assert.strictEqual(normalized.lines.length, 1);

    const line = normalized.lines[0];
    assert.strictEqual(line.text, "It's me, my honesty's");
    assert.strictEqual(line.start, 12.30);
    assert.strictEqual(line.end, 15.80);
    assert(Array.isArray(line.words), 'Expected words array');
    assert.strictEqual(line.words.length, 4);

    assert.strictEqual(line.words[0].text, "It's");
    assert.strictEqual(line.words[0].start, 12.30);
    assert.strictEqual(line.words[0].end, 12.55);

    assert.strictEqual(line.words[1].text, "me,");
    assert.strictEqual(line.words[1].start, 12.55);
    assert.strictEqual(line.words[1].end, 12.90);

    assert.strictEqual(line.words[2].text, "my");
    assert.strictEqual(line.words[2].start, 12.90);
    assert.strictEqual(line.words[2].end, 13.20);

    assert.strictEqual(line.words[3].text, "honesty's");
    assert.strictEqual(line.words[3].start, 13.20);
    assert.strictEqual(line.words[3].end, 14.10);
  });

  // 2. LINE-level LyricsPlus response
  test('2. LINE-level LyricsPlus response normalization', () => {
    const service = new LyricsPlusService();
    const mockApiResponse = {
      type: 'Line',
      lyrics: [
        {
          time: 5000,
          duration: 4000,
          text: "Just a regular line-synced lyric"
        },
        {
          time: 9500,
          duration: 3000,
          text: "Second line of the song"
        }
      ],
      processingTime: { winnerSource: 'lrclib' }
    };

    const normalized = service.normalizeResponse(mockApiResponse, { title: 'Song', artist: 'Artist' });
    assert(normalized !== null);
    assert.strictEqual(normalized.type, 'LINE', 'Expected type to be LINE');
    assert.strictEqual(normalized.lines.length, 2);
    assert.strictEqual(normalized.lines[0].start, 5.0);
    assert.strictEqual(normalized.lines[0].end, 9.0);
    assert.strictEqual(normalized.lines[0].words, undefined, 'Line-level lyrics must not have dummy words');
    assert.strictEqual(normalized.lines[1].start, 9.5);
    assert.strictEqual(normalized.lines[1].end, 12.5);
  });

  // 2b. UNSYNCED / type: "None" LyricsPlus response
  test('2b. UNSYNCED / type: "None" LyricsPlus response normalization', () => {
    const service = new LyricsPlusService();
    const mockApiResponse = {
      type: 'None',
      lyrics: [
        { time: 0, duration: 0, text: "Do that, do that Coke" },
        { time: 0, duration: 0, text: "Do that cash shit" }
      ],
      processingTime: { winnerSource: 'apple' }
    };

    const normalized = service.normalizeResponse(mockApiResponse, { title: 'gravity', artist: 'sosocamo' });
    assert(normalized !== null);
    assert.strictEqual(normalized.type, 'UNSYNCED', 'Expected type to be UNSYNCED');
    assert.strictEqual(normalized.lines.length, 2);
    assert.strictEqual(normalized.lines[0].timeMs, 9999999);
    assert.strictEqual(normalized.lines[1].timeMs, 9999999);
  });

  test('qApple timestamps after 200 seconds stay in seconds and explicit millisecond fields stay precise', () => {
    const service = new LyricsPlusService();
    const lateSongResponse = {
      type: 'Word',
      metadata: { source: 'Apple' },
      lyrics: [
        {
          time: 204,
          duration: 1.5,
          text: 'Come and get your love',
          syllabus: [
            { time: 204, duration: 0.4, text: 'Come ' },
            { time: 204.4, duration: 0.5, text: 'and get ' },
            { time: 204.9, duration: 0.6, text: 'your love' }
          ]
        },
        { time: 206, duration: 1, text: 'Come and get your love' }
      ]
    };
    const lateSong = service.normalizeResponse(lateSongResponse, { duration: 207 });
    assert.strictEqual(lateSong.lines[0].start, 204);
    assert.strictEqual(lateSong.lines[0].words[0].start, 204);
    assert.strictEqual(lateSong.lines[1].start, 206);

    const explicitMsResponse = {
      type: 'Word',
      metadata: { source: 'Apple' },
      lyrics: [{
        startTimeMs: 125,
        durationMs: 500,
        text: 'A word',
        syllabus: [{ startTimeMs: 125, durationMs: 300, text: 'A word' }]
      }]
    };
    const explicitMs = service.normalizeResponse(explicitMsResponse, { duration: 207 });
    assert.strictEqual(explicitMs.lines[0].start, 0.125);
    assert.strictEqual(explicitMs.lines[0].words[0].start, 0.125);
    assert.strictEqual(explicitMs.lines[0].words[0].end, 0.425);
  });

  // 3. Empty response
  test('3. Empty response handling', () => {
    const service = new LyricsPlusService();
    assert.strictEqual(service.normalizeResponse(null), null);
    assert.strictEqual(service.normalizeResponse({}), null);
    assert.strictEqual(service.normalizeResponse({ lyrics: [] }), null);
    assert.strictEqual(service.normalizeResponse({ error: { status: 404 } }), null);
  });

  // 4. Malformed response
  test('4. Malformed response handling', () => {
    const service = new LyricsPlusService();
    assert.strictEqual(service.normalizeResponse({ type: 'Word', lyrics: 'not an array' }), null);
    assert.strictEqual(service.normalizeResponse({ lyrics: [{ invalid: true }] }), null);
  });

  // 5. Missing duration
  test('5. Missing duration handling', () => {
    const service = new LyricsPlusService();
    const mockApiResponse = {
      type: 'Line',
      lyrics: [
        { time: 2000, text: "Line 1 with no duration" },
        { time: 6000, text: "Line 2" }
      ]
    };
    const normalized = service.normalizeResponse(mockApiResponse, {});
    assert(normalized !== null);
    assert.strictEqual(normalized.lines[0].start, 2.0);
    assert(normalized.lines[0].end >= 2.5, 'End time should be safely estimated from next line');
    assert.strictEqual(normalized.lines[1].start, 6.0);
  });

  // 6. Missing album
  test('6. Missing album parameter handling', () => {
    const service = new LyricsPlusService();
    const url = service.buildRequestUrl({ title: 'Song', artist: 'Artist' });
    assert(url.includes('title=Song'));
    assert(url.includes('artist=Artist'));
    assert(!url.includes('album='), 'Album parameter must not be present when not provided');
  });

  test('6a. LyricsPlus API source list is distinct from the current music app', () => {
    const service = new LyricsPlusService();
    const url = new URL(service.buildRequestUrl({
      title: 'Song', artist: 'Artist', source: 'Spotify', platformId: 'local_abc123'
    }, undefined, { forceRefresh: true }));
    assert.strictEqual(url.searchParams.get('source'), 'apple,lyricsplus,musixmatch,spotify,musixmatch-word');
    assert.strictEqual(url.searchParams.get('platformId'), null, 'Synthetic local SMTC IDs must not be sent as provider track IDs');
    assert.strictEqual(url.searchParams.get('forceReload'), 'true', 'Refetch must bypass upstream cache');
  });

  await testAsync('6b. LyricsPlus fails over to a mirror and preserves sub-second millisecond timings', async () => {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url) => {
      calls.push(String(url));
      if (String(url).startsWith('https://primary.test/')) {
        return { ok: false, status: 503 };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          KpoeTools: 'v2',
          type: 'Word',
          metadata: { source: 'Apple', timeUnit: 'ms' },
          lyrics: [{
            time: 160, duration: 1000, text: 'Hello',
            syllabus: [{ time: 160, duration: 300, text: 'Hello' }]
          }]
        })
      };
    };

    try {
      const service = new LyricsPlusService({
        endpoints: ['https://primary.test/v2/lyrics/get', 'https://mirror.test/v2/lyrics/get'],
        timeoutMs: 50
      });
      const result = await service.fetch({ title: 'Song', artist: 'Artist' }, { forceRefresh: true });
      assert.strictEqual(calls.length, 2, 'The configured mirror should be tried after the primary fails');
      assert(result && result.type === 'WORD');
      assert.strictEqual(result.source, 'LyricsPlus (Apple)');
      assert.strictEqual(result.lines[0].start, 0.16);
      assert.strictEqual(result.lines[0].words[0].start, 0.16);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await testAsync('6c. LyricsPlus source fallback retry remains bounded by its request timeout', async () => {
    const originalFetch = global.fetch;
    const parentController = new AbortController();
    const observedSignals = [];
    let calls = 0;
    global.fetch = async (_url, options = {}) => {
      calls++;
      if (calls === 1) return { ok: false, status: 404 };
      observedSignals.push(options.signal);
      return new Promise((_resolve, reject) => {
        const abort = () => reject(Object.assign(new Error('aborted by request timeout'), { name: 'AbortError' }));
        if (options.signal?.aborted) abort();
        else options.signal?.addEventListener('abort', abort, { once: true });
      });
    };

    try {
      const service = new LyricsPlusService({ endpoint: 'https://primary.test/v2/lyrics/get', timeoutMs: 20 });
      const result = await service.fetchEndpoint(service.endpoint, { title: 'Song', artist: 'Artist' }, {
        signal: parentController.signal
      });
      assert.strictEqual(result, null);
      assert.strictEqual(calls, 2, 'The source-less retry should be made once');
      assert.strictEqual(observedSignals[0].aborted, true, 'The retry must be aborted by the per-request timeout');
      assert.strictEqual(parentController.signal.aborted, false, 'The request timeout must not abort the caller');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await testAsync('6d. qApple is requested before alternatives and bypasses non-qApple cache entries', async () => {
    const originalFetch = global.fetch;
    const calls = [];
    const metadata = { title: 'Song', artist: 'Artist' };
    global.fetch = async (url) => {
      calls.push(String(url));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          KpoeTools: 'v2',
          type: 'Word',
          lyrics: [{
            time: 1000,
            duration: 700,
            text: 'Hello world',
            syllabus: [
              { time: 1000, duration: 300, text: 'Hello ' },
              { time: 1300, duration: 400, text: 'world' }
            ]
          }]
        })
      };
    };

    try {
      const endpoint = 'https://lyricsplus.binimum.org/v2/lyrics/get';
      const service = new LyricsPlusService({ endpoints: [endpoint], timeoutMs: 50 });
      service.cacheAndReturn(metadata, createNormalizedLyrics('WORD', [
        createLyricLine('Old cached line', 1, 3, [createLyricWord('Old', 1, 2)])
      ], 'LyricsPlus (NetEase)', { winnerSource: 'NetEase' }));

      const result = await service.fetch(metadata, { preferQApple: true });
      assert.strictEqual(calls.length, 1, 'Non-qApple cached lyrics must not bypass the preferred qApple request');
      assert.strictEqual(new URL(calls[0]).searchParams.get('source'), 'apple',
        'The preferred qApple request must explicitly select Apple on the v2 endpoint');
      assert(result && result.type === 'WORD');
      assert.strictEqual(result.source, 'LyricsPlus (qApple)');
      assert.strictEqual(isQAppleLyrics(result), true);

      const mirrorUrl = new URL(service.buildRequestUrl(metadata, 'https://mirror.test/lyrics', { preferQApple: true }));
      assert.strictEqual(mirrorUrl.searchParams.get('source'), 'apple',
        'The mirror must query Apple alone before any multi-source fallback');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await testAsync('6e. LyricsPlus LRCLIB matches are discarded for the native LRCLIB integration', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'Word',
        processingTime: { winnerSource: 'lrclib' },
        lyrics: [{
          time: 1000,
          duration: 600,
          text: 'Duplicate source',
          syllabus: [{ time: 1000, duration: 600, text: 'Duplicate source' }]
        }]
      })
    });
    try {
      const endpoint = 'https://lyricsplus.binimum.org/v2/lyrics/get';
      const service = new LyricsPlusService({ endpoints: [endpoint], timeoutMs: 50 });
      service.invalidateCache({ title: 'Song', artist: 'Artist' });
      const result = await service.fetch({ title: 'Song', artist: 'Artist' });
      assert.strictEqual(result, null,
        'The LyricsPlus aggregator must not return an LRCLIB result when LyricFlow has a native LRCLIB provider');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await testAsync('6e1. qApple mode rejects an explicitly non-Apple v2 winner', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'Word',
        source: 'NetEase',
        lyrics: [{
          time: 1000,
          duration: 600,
          text: 'Wrong source',
          syllabus: [{ time: 1000, duration: 600, text: 'Wrong source' }]
        }]
      })
    });
    try {
      const endpoint = 'https://lyricsplus.binimum.org/v2/lyrics/get';
      const service = new LyricsPlusService({ endpoints: [endpoint], timeoutMs: 50 });
      const result = await service.fetch({ title: 'Strict source song', artist: 'Artist' }, { preferQApple: true });
      assert.strictEqual(result, null, 'A known NetEase response must not be relabeled as qApple');
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('6f. Renderer awaits qApple before starting the Rust/NetEase fallback', () => {
    const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
    const primaryStart = renderer.indexOf("// LyricsPlus' primary endpoint defaults to qApple.");
    const qAppleAwait = renderer.indexOf('await lyricsPlusFetch();', primaryStart);
    const rustFallback = renderer.indexOf('await rustLyricsFetch();', qAppleAwait);
    assert(primaryStart >= 0 && qAppleAwait > primaryStart && rustFallback > qAppleAwait,
      'qApple must finish applying before Rust providers, including NetEase, start');
    assert(renderer.includes('preferQApple: true'),
      'The renderer must request qApple explicitly from LyricsPlus');
    assert.match(renderer, /const effectiveTimeout = customTimeout != null \? customTimeout : 8500;/,
      'The preferred qApple request must not time out at the old 2.5 second default');
    assert(renderer.includes("preferredLyricProviders: ['netease', 'lrclib', 'musixmatch']"),
      'NetEase remains the first Rust fallback and can supply word-synced lyrics when qApple has no match');
    assert.strictEqual(new LyricsPlusService().timeoutMs, 8500,
      'LyricsPlus default timeout must allow the qApple scraper cold-cache window');
    const providerSource = fs.readFileSync(path.join(__dirname, '../src/services/lyrics/LyricsPlus.js'), 'utf8');
    assert(providerSource.includes('lyricsplus.prjktla.my.id/v2/lyrics/get'),
      'The provider must retain an active public v2 mirror when its primary host is unavailable');
  });

  // 7. Request cancellation
  await testAsync('7. Request cancellation with AbortController', async () => {
    const service = new LyricsPlusService();
    const controller = new AbortController();
    controller.abort(); // already aborted

    const result = await service.fetch({ title: 'Test', artist: 'Test' }, { signal: controller.signal });
    assert.strictEqual(result, null, 'Aborted fetch should cleanly return null');
  });

  // 8. Track switching while request is pending (race conditions)
  await testAsync('8. Track switching while request is pending', async () => {
    const manager = new LyricsManager();

    // Mock provider with artificial delay
    manager.lyricsPlusProvider.getLyrics = async (meta, opts) => {
      await new Promise(r => setTimeout(r, meta.title === 'Song A' ? 80 : 10));
      return createNormalizedLyrics('LINE', [
        createLyricLine(`Lyrics for ${meta.title}`, 1.0, 4.0)
      ], 'Mock');
    };

    // User starts Song A, then quickly switches to Song B
    const fetchPromiseA = manager.fetchLyrics({ title: 'Song A', artist: 'Artist' });
    const fetchPromiseB = manager.fetchLyrics({ title: 'Song B', artist: 'Artist' });

    const [resA, resB] = await Promise.all([fetchPromiseA, fetchPromiseB]);

    assert.strictEqual(resA, null, 'Song A should be discarded because user switched to Song B');
    assert(resB !== null, 'Song B should be resolved');
    assert.strictEqual(resB.lines[0].text, 'Lyrics for Song B');
  });

  // 9. Seeking forward in LyricEngine
  test('9. Seeking forward in LyricEngine', () => {
    const engine = new LyricEngine();
    const lyrics = createNormalizedLyrics('LINE', [
      createLyricLine("Line 1", 0.0, 5.0),
      createLyricLine("Line 2", 5.0, 10.0),
      createLyricLine("Line 3", 10.0, 15.0),
      createLyricLine("Line 4", 20.0, 25.0)
    ], 'Test');

    engine.setLyrics(lyrics);

    // Initial playback at 1.0s
    let state = engine.update(1.0);
    assert.strictEqual(state.lineIndex, 0);

    // Jump forward to 21.0s (Seeking forward)
    state = engine.update(21.0);
    assert.strictEqual(state.lineIndex, 3);
    assert.strictEqual(state.currentLine.text, "Line 4");
  });

  // 10. Seeking backward in LyricEngine
  test('10. Seeking backward in LyricEngine', () => {
    const engine = new LyricEngine();
    const lyrics = createNormalizedLyrics('LINE', [
      createLyricLine("Line 1", 0.0, 5.0),
      createLyricLine("Line 2", 5.0, 10.0),
      createLyricLine("Line 3", 10.0, 15.0),
      createLyricLine("Line 4", 20.0, 25.0)
    ], 'Test');

    engine.setLyrics(lyrics);

    // At line 3 (time 12.0s)
    engine.update(12.0);
    assert.strictEqual(engine.currentLineIndex, 2);

    // User seeks backward to 2.0s
    const state = engine.update(2.0);
    assert.strictEqual(state.lineIndex, 0);
    assert.strictEqual(state.currentLine.text, "Line 1");
  });

  // 11. Exact word start time (currentTime === word.start)
  test('11. Exact word start time (currentTime === word.start)', () => {
    const engine = new LyricEngine();
    const words = [
      createLyricWord("Hello", 10.0, 11.5),
      createLyricWord("World", 11.5, 13.0)
    ];
    const lyrics = createNormalizedLyrics('WORD', [
      createLyricLine("Hello World", 10.0, 13.0, words)
    ], 'Test');

    engine.setLyrics(lyrics);

    // At exact start of word 0 (10.0)
    const state0 = engine.update(10.0);
    assert.strictEqual(state0.wordIndex, 0);
    assert.strictEqual(engine.getWordState(0, 0, 10.0), 'active');

    // At exact start of word 1 (11.5)
    const state1 = engine.update(11.5);
    assert.strictEqual(state1.wordIndex, 1);
    assert.strictEqual(engine.getWordState(0, 1, 11.5), 'active');
  });

  // 12. Exact word end time (currentTime === word.end)
  test('12. Exact word end time (currentTime === word.end)', () => {
    const engine = new LyricEngine();
    const words = [
      createLyricWord("Testing", 5.0, 7.0)
    ];
    const lyrics = createNormalizedLyrics('WORD', [
      createLyricLine("Testing", 5.0, 8.0, words)
    ], 'Test');

    engine.setLyrics(lyrics);

    // At exact end of word (7.0s)
    const state = engine.update(7.0);
    assert.strictEqual(engine.getWordState(0, 0, 7.0), 'active', 'Exact word end is active');

    // Immediately past word end (7.001s)
    assert.strictEqual(engine.getWordState(0, 0, 7.001), 'completed', 'Past word end is completed');
  });

  test('old qApple lyric caches are invalidated after timestamp normalization changes', () => {
    const service = new LyricsPlusService();
    const meta = { title: 'Come and Get Your Love', artist: 'Redbone', duration: 207 };
    const key = getCacheKey(meta);
    const oldCached = createNormalizedLyrics('WORD', [
      createLyricLine('Come and get your love', 0.204, 0.2055)
    ], 'LyricsPlus (qApple)');
    localStorage.setItem(key, JSON.stringify(oldCached));
    assert.strictEqual(service.getCached(meta), null, 'Previously normalized qApple cache must be fetched again');
    assert.strictEqual(localStorage.getItem(key), null, 'Stale qApple cache entry must be removed');

    service.setCached(meta, oldCached);
    const updated = service.getCached(meta);
    assert.strictEqual(updated.qappleTimeNormalizationVersion, 2, 'New qApple cache entry must carry the timing schema version');
  });

  // 13. Lyrics cache hit (with ISRC and with artist+title+duration)
  test('13. Lyrics cache hit with ISRC and artist+title+duration', () => {
    const service = new LyricsPlusService();
    const metaISRC = { title: 'Anti-Hero', artist: 'Taylor Swift', isrc: 'USUG12205736' };
    const sampleLyrics = createNormalizedLyrics('WORD', [
      createLyricLine("I have this thing", 5.0, 9.0)
    ], 'LyricsPlus (Apple)');

    // Save to cache
    service.setCached(metaISRC, sampleLyrics);

    // Retrieve
    const cachedISRC = service.getCached(metaISRC);
    assert(cachedISRC !== null);
    assert.strictEqual(cachedISRC.lines[0].text, "I have this thing");

    // Cache by title + artist + duration
    const metaTrack = { title: 'Song X', artist: 'Artist Y', duration: 180 };
    const trackLyrics = createNormalizedLyrics('LINE', [
      createLyricLine("Sample line", 2.0, 6.0)
    ], 'LyricsPlus');

    service.setCached(metaTrack, trackLyrics);
    const cachedTrack = service.getCached(metaTrack);
    assert(cachedTrack !== null);
    assert.strictEqual(cachedTrack.lines[0].text, "Sample line");
  });

  // 14. Timestamp boundary edge cases
  test('14. Timestamp boundary edge cases (all 5 states)', () => {
    const engine = new LyricEngine();
    const words = [
      createLyricWord("Karaoke", 10.0, 12.0)
    ];
    const lyrics = createNormalizedLyrics('WORD', [
      createLyricLine("Karaoke", 10.0, 12.0, words)
    ], 'Test');

    engine.setLyrics(lyrics);

    // Case 1: currentTime < word.start
    assert.strictEqual(engine.getWordState(0, 0, 9.999), 'upcoming');

    // Case 2: currentTime === word.start
    assert.strictEqual(engine.getWordState(0, 0, 10.000), 'active');

    // Case 3: currentTime > word.start && currentTime < word.end
    assert.strictEqual(engine.getWordState(0, 0, 11.250), 'active');

    // Case 4: currentTime === word.end
    assert.strictEqual(engine.getWordState(0, 0, 12.000), 'active');

    // Case 5: currentTime > word.end
    assert.strictEqual(engine.getWordState(0, 0, 12.001), 'completed');
  });

  // 15. Fallback from LyricsPlus to ExistingWaterfallProvider
  await testAsync('15. Fallback from LyricsPlus to ExistingWaterfallProvider', async () => {
    const manager = new LyricsManager();

    // LyricsPlus fails / returns null
    manager.lyricsPlusProvider.getLyrics = async () => null;

    // Existing waterfall succeeds
    manager.waterfallProvider.getLyrics = async () => {
      return createNormalizedLyrics('LINE', [
        createLyricLine("Fallback lyric line", 0.0, 4.0)
      ], 'LRCLIB (Fallback)');
    };

    const result = await manager.fetchLyrics({ title: 'Obscure Track', artist: 'Unknown' });
    assert(result !== null);
    assert.strictEqual(result.source, 'LRCLIB (Fallback)');
    assert.strictEqual(result.lines[0].text, 'Fallback lyric line');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
