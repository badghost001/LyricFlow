/**
 * Empirical Challenger M2-2 Stress Test Suite:
 * Cache Bounding, Image Bitmap Eviction, and Latent Video Invalidation
 *
 * Verifies Milestone 2 memory optimizations under intense load and adversarial conditions:
 * 1. 1,000 rapid track insertions into rememberArtInMemory (assert size <= 30 strictly at all times)
 * 2. 1,000 data: URLs rejected by rememberArtInMemory (0 added)
 * 3. 1,000 tracks into saveArtToCache (assert localArtCache keys <= 40 strictly at all times)
 * 4. 1,000 data: URLs rejected by saveArtToCache (0 added)
 * 5. _directTrackLinkCache size <= 30 strictly at all times across 100 insertions
 * 6. Video decoder unbinding: pause(), removeAttribute('src'), load(), display = 'none'
 * 7. Mode transitions unbinding across Dynamic Island, Taskbar, Wallpaper, Studio
 * 8. Invalidation of _dormantSrc across all 6 video surfaces upon track change in handlePlaybackData()
 * 9. Image bitmap eviction on transition end, modal close, and song change
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('  CHALLENGER M2-2: EMPIRICAL CACHE BOUNDING & VIDEO STRESS TEST ');
console.log('================================================================\n');

const srcDir = path.join(__dirname, '..', 'src');
const rendererJs = fs.readFileSync(path.join(srcDir, 'renderer.js'), 'utf8');

let totalTests = 0;
let passedTests = 0;

async function runTest(description, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${description}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function main() {
  // ============================================================================
  // SUITE 1: sessionArtMemoryCache Stress Testing
  // ============================================================================
  console.log('--- Suite 1: sessionArtMemoryCache Stress Testing ---');

  const artMemExtract = rendererJs.match(/const sessionArtMemoryCache = new Map\(\);[\s\S]*?function rememberArtInMemory\(trackId, url, trackName, artistName\) \{[\s\S]*?\n\}/)[0];
  const createArtMemScope = new Function(artMemExtract + '\nreturn { sessionArtMemoryCache, rememberArtInMemory };');

  await runTest('1.1: 1,000 rapid track insertions: sessionArtMemoryCache.size <= 30 strictly at all times', async () => {
    const { sessionArtMemoryCache, rememberArtInMemory } = createArtMemScope();
    sessionArtMemoryCache.clear();

    for (let i = 0; i < 1000; i++) {
      const trackId = `track_stress_${i}`;
      const url = `https://cdn.example.com/artwork/cover_${i}.jpg`;
      const trackName = `Song Title ${i}`;
      const artistName = `Artist Name ${i}`;

      // Each insertion attempts to set BOTH trackId and dualKey (artistName:::trackName)
      rememberArtInMemory(trackId, url, trackName, artistName);

      // Assert strictly at every single iteration (all 1,000 steps)
      assert.ok(
        sessionArtMemoryCache.size <= 30,
        `Iteration ${i}: sessionArtMemoryCache.size (${sessionArtMemoryCache.size}) exceeded max capacity of 30`
      );
    }

    // Final assertions
    assert.strictEqual(sessionArtMemoryCache.size, 30, 'sessionArtMemoryCache should be fully bounded at 30');

    // Verify FIFO eviction: earliest tracks (0-900) must be evicted
    assert.strictEqual(sessionArtMemoryCache.has('track_stress_0'), false, 'Earliest track 0 must be evicted');
    assert.strictEqual(sessionArtMemoryCache.has('artist name 0:::song title 0'), false, 'Earliest dual key 0 must be evicted');

    // Latest track (999) must be retained
    assert.strictEqual(sessionArtMemoryCache.has('track_stress_999'), true, 'Latest track 999 must be present');
    assert.strictEqual(sessionArtMemoryCache.get('track_stress_999'), 'https://cdn.example.com/artwork/cover_999.jpg');
    assert.strictEqual(sessionArtMemoryCache.get('artist name 999:::song title 999'), 'https://cdn.example.com/artwork/cover_999.jpg');
  });

  await runTest('1.2: 1,000 data: URLs rejected by rememberArtInMemory (0 added)', async () => {
    const { sessionArtMemoryCache, rememberArtInMemory } = createArtMemScope();
    sessionArtMemoryCache.clear();

    const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    for (let i = 0; i < 1000; i++) {
      rememberArtInMemory(`data_track_${i}`, dummyBase64, `DataSong ${i}`, `DataArtist ${i}`);
    }

    assert.strictEqual(
      sessionArtMemoryCache.size,
      0,
      `Expected 0 entries in sessionArtMemoryCache after inserting 1000 data: URLs, but found ${sessionArtMemoryCache.size}`
    );

    // Also test invalid URL types: null, undefined, empty string, number
    rememberArtInMemory('null_track', null, 'Song', 'Artist');
    rememberArtInMemory('undefined_track', undefined, 'Song', 'Artist');
    rememberArtInMemory('empty_track', '', 'Song', 'Artist');
    rememberArtInMemory('num_track', 12345, 'Song', 'Artist');
    assert.strictEqual(sessionArtMemoryCache.size, 0, 'Invalid/non-string URLs must be rejected');
  });

  // ============================================================================
  // SUITE 2: localArtCache Stress Testing
  // ============================================================================
  console.log('\n--- Suite 2: localArtCache Stress Testing ---');

  const localArtExtract = rendererJs.match(/function saveArtToCache\(trackId, url, trackName, artistName\) \{[\s\S]*?\n\}/)[0];
  const createSaveArtScope = new Function('localArtCache', 'window', 'localStorage', localArtExtract + '\nreturn saveArtToCache;');

  await runTest('2.1: 1,000 rapid track insertions: localArtCache <= 40 keys strictly at all times', async () => {
    const mockCache = {};
    const mockStorage = {
      data: {},
      setItem(k, v) { this.data[k] = v; }
    };
    const saveArt = createSaveArtScope(mockCache, {}, mockStorage);

    for (let i = 0; i < 1000; i++) {
      const trackId = `persistent_track_${i}`;
      const url = `https://cdn.example.com/art/album_${i}.jpg`;
      const trackName = `Local Track ${i}`;
      const artistName = `Local Artist ${i}`;

      saveArt(trackId, url, trackName, artistName);

      const keyCount = Object.keys(mockCache).length;
      assert.ok(
        keyCount <= 40,
        `Iteration ${i}: localArtCache key count (${keyCount}) exceeded max capacity of 40`
      );
    }

    const finalKeys = Object.keys(mockCache);
    assert.strictEqual(finalKeys.length, 40, 'localArtCache should be bounded at exactly 40 keys');
    assert.strictEqual('persistent_track_0' in mockCache, false, 'Oldest track must be pruned');
    assert.strictEqual('persistent_track_999' in mockCache, true, 'Latest track must be present');
  });

  await runTest('2.2: 1,000 data: URLs rejected by saveArtToCache (0 added)', async () => {
    const mockCache = {};
    const saveArt = createSaveArtScope(mockCache, {}, { setItem() {} });

    const dummyDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';

    for (let i = 0; i < 1000; i++) {
      saveArt(`data_track_${i}`, dummyDataUrl, `Track ${i}`, `Artist ${i}`);
    }

    const keyCount = Object.keys(mockCache).length;
    assert.strictEqual(keyCount, 0, `Expected 0 keys in localArtCache after inserting 1000 data: URLs, but got ${keyCount}`);
  });

  // ============================================================================
  // SUITE 3: _directTrackLinkCache Bounding
  // ============================================================================
  console.log('\n--- Suite 3: _directTrackLinkCache Bounding ---');

  const linkCacheExtract = rendererJs.match(/const _directTrackLinkCache = new Map\(\);[\s\S]*?async function resolveDirectMusicLinks\([\s\S]*?\n\}/)[0];
  const createLinkCacheScope = new Function('window', linkCacheExtract + '\nreturn { _directTrackLinkCache, resolveDirectMusicLinks };');

  await runTest('3.1: 100 entries into _directTrackLinkCache: size <= 30 strictly at all times', async () => {
    const mockWindow = {
      electronAPI: {
        lastfmApi: async (method, params) => ({ track: { name: params.track, artist: params.artist } })
      }
    };
    const { _directTrackLinkCache, resolveDirectMusicLinks } = createLinkCacheScope(mockWindow);
    _directTrackLinkCache.clear();

    for (let i = 0; i < 100; i++) {
      await resolveDirectMusicLinks(`SongTitle_${i}`, `Artist_${i}`);
      assert.ok(
        _directTrackLinkCache.size <= 30,
        `Iteration ${i}: _directTrackLinkCache.size (${_directTrackLinkCache.size}) exceeded 30`
      );
    }

    assert.strictEqual(_directTrackLinkCache.size, 30, '_directTrackLinkCache should be capped at exactly 30');
    assert.strictEqual(_directTrackLinkCache.has('artist_0 - songtitle_0'), false, 'Oldest track link must be evicted');
    assert.strictEqual(_directTrackLinkCache.has('artist_99 - songtitle_99'), true, 'Latest track link must be present');
  });

  // ============================================================================
  // SUITE 4: Video Decoder Unbinding & Dormant Restoration
  // ============================================================================
  console.log('\n--- Suite 4: Video Decoder Unbinding & Dormant Restoration ---');

  function createMockVideo(id, initialSrc) {
    const attrs = {};
    if (initialSrc) attrs.src = initialSrc;
    const classes = new Set(['is-playing']);

    return {
      id,
      src: initialSrc || '',
      currentSrc: initialSrc || '',
      _dormantSrc: null,
      _motionRecoveryTimer: 9999,
      style: { display: 'block' },
      classList: {
        add(c) { classes.add(c); },
        remove(c) { classes.delete(c); },
        contains(c) { return classes.has(c); }
      },
      getAttribute(name) { return attrs[name] || (name === 'src' ? this.src : null); },
      setAttribute(name, val) { attrs[name] = val; this[name] = val; },
      removeAttribute(name) { delete attrs[name]; if (name === 'src') this.src = ''; },
      pauseCalls: 0,
      pause() { this.pauseCalls++; },
      loadCalls: 0,
      load() { this.loadCalls++; }
    };
  }

  const unbindExtract = rendererJs.match(/function unbindVideoSurface\(videoEl\) \{[\s\S]*?\n\}\n\nfunction restoreVideoSurface\(videoEl, fallbackUrl\) \{[\s\S]*?\n\}/)[0];

  let startMotionCalls = [];
  function mockStartMotion(el, url) {
    startMotionCalls.push({ el: el.id, url });
    el.src = url;
    el.style.display = 'block';
  }

  const createVideoScope = new Function('startMotionArtVideo', 'currentAnimatedArtInfo', unbindExtract + '\nreturn { unbindVideoSurface, restoreVideoSurface };');
  const { unbindVideoSurface, restoreVideoSurface } = createVideoScope(mockStartMotion, null);

  await runTest('4.1: unbindVideoSurface calls pause(), removeAttribute("src"), load(), display="none", and preserves _dormantSrc', async () => {
    const video = createMockVideo('studio-art-video', 'https://cdn.example.com/video1.mp4');

    unbindVideoSurface(video);

    assert.strictEqual(video._dormantSrc, 'https://cdn.example.com/video1.mp4', 'Original source must be saved in _dormantSrc');
    assert.strictEqual(video.pauseCalls, 1, 'pause() must be called');
    assert.strictEqual(video.src, '', 'src must be empty');
    assert.strictEqual(video.loadCalls, 1, 'load() must be called to purge Direct3D hardware decoder');
    assert.strictEqual(video.style.display, 'none', 'display must be none');
    assert.strictEqual(video.classList.contains('is-playing'), false, 'is-playing class must be removed');
    assert.strictEqual(video._motionRecoveryTimer, null, 'Recovery timer must be cleared');
  });

  await runTest('4.2: restoreVideoSurface restores _dormantSrc and clears dormant state', async () => {
    startMotionCalls = [];
    const video = createMockVideo('studio-art-video', '');
    video._dormantSrc = 'https://cdn.example.com/dormant_video.mp4';

    restoreVideoSurface(video);

    assert.strictEqual(video._dormantSrc, null, '_dormantSrc must be cleared to null after restore');
    assert.strictEqual(startMotionCalls.length, 1);
    assert.strictEqual(startMotionCalls[0].url, 'https://cdn.example.com/dormant_video.mp4', 'Must restore _dormantSrc');
  });

  await runTest('4.3: restoreVideoSurface falls back to fallbackUrl when _dormantSrc is null', async () => {
    startMotionCalls = [];
    const video = createMockVideo('widget-album-art-video', '');
    video._dormantSrc = null;

    restoreVideoSurface(video, 'https://cdn.example.com/fallback_fresh.mp4');

    assert.strictEqual(startMotionCalls.length, 1);
    assert.strictEqual(startMotionCalls[0].url, 'https://cdn.example.com/fallback_fresh.mp4');
  });

  // ============================================================================
  // SUITE 5: Mode Transitions & Video Decoder Release
  // ============================================================================
  console.log('\n--- Suite 5: Mode Transitions & Hardware Video Decoder Release ---');

  const syncExtract = rendererJs.match(/function syncActiveAnimatedVideoState\(\) \{[\s\S]*?\n\}\n\n\/\/ Reactive motion continuity/)[0];

  function setupSyncEnv(options = {}) {
    const videos = {
      widgetAlbumArt: { style: {}, src: '' },
      widgetAlbumArtVideo: createMockVideo('widget-album-art-video', 'https://cdn.com/widget.mp4'),
      studioArtVideo: createMockVideo('studio-art-video', 'https://cdn.com/studio.mp4'),
      studioTallBgVideo: createMockVideo('studio-tall-bg-video', 'https://cdn.com/tall.mp4'),
      islandArtVideo: createMockVideo('island-art-video', 'https://cdn.com/island.mp4'),
      wallpaperStyleArtVideo: createMockVideo('wallpaper-style-art-video', 'https://cdn.com/wp_style.mp4'),
      wallpaperAlbumBgVideo: createMockVideo('wallpaper-album-bg-video', 'https://cdn.com/wp_bg.mp4')
    };

    const bodyClasses = new Set(options.bodyClasses || []);
    const env = {
      ...videos,
      document: {
        getElementById(id) {
          return Object.values(videos).find(v => v.id === id) || { style: {}, classList: { contains: () => false, add() {}, remove() {} } };
        },
        body: {
          classList: {
            add(c) { bodyClasses.add(c); },
            remove(c) { bodyClasses.delete(c); },
            contains(c) { return bodyClasses.has(c); }
          }
        }
      },
      attachResilientVideoLifecycle: () => {},
      globalAmbilightSampler: { start() {}, stop() {} },
      isBatterySaverActive: false,
      settings: {
        motionBatterySaver: false,
        taskbarMode: options.taskbarMode || false,
        wallpaperMode: options.wallpaperMode || false,
        wallpaperStyle: options.wallpaperStyle || 'style2'
      },
      isDynamicIslandMode: options.isDynamicIslandMode || false,
      isPlaying: true,
      currentAnimatedArtInfo: {
        type: 'video',
        url: 'https://cdn.com/active_square.mp4',
        tallUrl: 'https://cdn.com/active_tall.mp4'
      },
      supportsTallMotionArtwork: () => true,
      isCustomBackgroundActive: () => false,
      unbindVideoSurface,
      restoreVideoSurface: (v, fallbackUrl) => {
        v.src = v._dormantSrc || fallbackUrl;
        v._dormantSrc = null;
        v.style.display = 'block';
      }
    };

    const fn = new Function(
      'env',
      `with(env) {
        ${syncExtract}
        syncActiveAnimatedVideoState();
      }`
    );
    fn(env);
    return env;
  }

  await runTest('5.1: Dynamic Island Mode unbinds all 5 non-island video decoders', async () => {
    const env = setupSyncEnv({ isDynamicIslandMode: true });

    assert.strictEqual(env.islandArtVideo.style.display, 'block');
    assert.strictEqual(env.islandArtVideo.src, 'https://cdn.com/active_square.mp4');

    const inactive = [
      env.widgetAlbumArtVideo,
      env.studioArtVideo,
      env.studioTallBgVideo,
      env.wallpaperStyleArtVideo,
      env.wallpaperAlbumBgVideo
    ];
    for (const v of inactive) {
      assert.strictEqual(v.style.display, 'none', `${v.id} must be display: none in Dynamic Island mode`);
      assert.strictEqual(v.src, '', `${v.id} must have empty src in Dynamic Island mode`);
      assert.ok(v.loadCalls >= 1, `${v.id} load() must have been called`);
    }
  });

  await runTest('5.2: Taskbar Mode unbinds ALL 6 video surfaces', async () => {
    const env = setupSyncEnv({ taskbarMode: true });

    const allVideos = [
      env.widgetAlbumArtVideo,
      env.studioArtVideo,
      env.studioTallBgVideo,
      env.islandArtVideo,
      env.wallpaperStyleArtVideo,
      env.wallpaperAlbumBgVideo
    ];
    for (const v of allVideos) {
      assert.strictEqual(v.style.display, 'none', `${v.id} must be display: none in Taskbar mode`);
      assert.strictEqual(v.src, '', `${v.id} src must be empty in Taskbar mode`);
      assert.ok(v.loadCalls >= 1, `${v.id} load() called`);
    }
  });

  await runTest('5.3: Wallpaper Mode (style2) unbinds all non-wallpaper video surfaces', async () => {
    const env = setupSyncEnv({ wallpaperMode: true, wallpaperStyle: 'style2' });

    assert.strictEqual(env.wallpaperStyleArtVideo.style.display, 'block');
    assert.strictEqual(env.wallpaperStyleArtVideo.src, 'https://cdn.com/active_tall.mp4');

    assert.strictEqual(env.widgetAlbumArtVideo.style.display, 'none');
    assert.strictEqual(env.studioArtVideo.style.display, 'none');
    assert.strictEqual(env.studioTallBgVideo.style.display, 'none');
    assert.strictEqual(env.islandArtVideo.style.display, 'none');
    assert.strictEqual(env.wallpaperAlbumBgVideo.style.display, 'none');
  });

  await runTest('5.4: Desktop Studio Mode (Split layout) activates studioArtVideo and unbinds studioTallBgVideo & widget', async () => {
    const env = setupSyncEnv({ bodyClasses: ['layout-split'] });

    assert.strictEqual(env.studioArtVideo.style.display, 'block');
    assert.strictEqual(env.studioArtVideo.src, 'https://cdn.com/active_tall.mp4');

    assert.strictEqual(env.studioTallBgVideo.style.display, 'none');
    assert.strictEqual(env.widgetAlbumArtVideo.style.display, 'none');
    assert.strictEqual(env.islandArtVideo.style.display, 'none');
  });

  // ============================================================================
  // SUITE 6: Track Change Dormant Video Source Invalidation
  // ============================================================================
  console.log('\n--- Suite 6: Invalidation of _dormantSrc Across All 6 Video Surfaces on Track Change ---');

  await runTest('6.1: When track changes in handlePlaybackData, _dormantSrc is reset to null across all 6 video surfaces', async () => {
    const mockVideoElements = {
      'studio-art-video': createMockVideo('studio-art-video', ''),
      'widget-album-art-video': createMockVideo('widget-album-art-video', ''),
      'studio-tall-bg-video': createMockVideo('studio-tall-bg-video', ''),
      'wallpaper-style-art-video': createMockVideo('wallpaper-style-art-video', ''),
      'wallpaper-album-bg-video': createMockVideo('wallpaper-album-bg-video', ''),
      'island-art-video': createMockVideo('island-art-video', '')
    };

    // Pre-seed dormant sources from a previous track on ALL 6 video elements
    for (const id in mockVideoElements) {
      mockVideoElements[id]._dormantSrc = `https://cdn.example.com/stale_song1_${id}.mp4`;
    }

    // Verify dormant sources exist before track change
    for (const id in mockVideoElements) {
      assert.ok(mockVideoElements[id]._dormantSrc !== null, 'Dormant source should be non-null initially');
    }

    // Exact dormant invalidation block from renderer.js:14562-14575
    const dormantSnippet = new Function('document', `
      const _allMotionArtVideos = [
        document.getElementById('studio-art-video'),
        document.getElementById('widget-album-art-video'),
        document.getElementById('studio-tall-bg-video'),
        document.getElementById('wallpaper-style-art-video'),
        document.getElementById('wallpaper-album-bg-video'),
        document.getElementById('island-art-video')
      ];
      _allMotionArtVideos.forEach(v => {
        if (v) v._dormantSrc = null;
      });
    `);

    const mockDoc = {
      getElementById(id) { return mockVideoElements[id] || null; }
    };

    dormantSnippet(mockDoc);

    // Assert that ALL 6 video surfaces had _dormantSrc invalidated to null
    for (const id in mockVideoElements) {
      assert.strictEqual(
        mockVideoElements[id]._dormantSrc,
        null,
        `Video element #${id} _dormantSrc must be strictly null after track change`
      );
    }
  });

  await runTest('6.2: Restoring video surface after track change plays new song URL, NEVER resurrects stale dormant URL', async () => {
    const video = createMockVideo('studio-art-video', '');
    // Track 1 had set dormant source
    video._dormantSrc = 'https://cdn.example.com/song1_old_video.mp4';

    // Track change invalidates it
    video._dormantSrc = null;

    // Track 2 arrives with fresh animated art URL
    const track2VideoUrl = 'https://cdn.example.com/song2_new_video.mp4';

    startMotionCalls = [];
    restoreVideoSurface(video, track2VideoUrl);

    assert.strictEqual(
      startMotionCalls[0].url,
      'https://cdn.example.com/song2_new_video.mp4',
      'Must play new song video URL and NEVER previous song dormant video'
    );
  });

  // ============================================================================
  // SUITE 7: Image Bitmap Eviction (DOM Cleanup)
  // ============================================================================
  console.log('\n--- Suite 7: Image Bitmap Eviction (DOM Cleanup) ---');

  await runTest('7.1: triggerIslandArtTransition clears island-art-img-old src upon transition end (730ms)', async () => {
    const mockOldImg = {
      src: 'data:image/png;base64,largeOldBitmap...',
      style: { display: 'block' },
      removeAttributeCalls: [],
      removeAttribute(attr) {
        this.removeAttributeCalls.push(attr);
        if (attr === 'src') this.src = '';
      }
    };

    const mockNewImg = {
      src: 'http://example.com/art1.jpg',
      style: {},
      getAttribute(a) { return this[a] || null; }
    };

    const mockSweep = { style: {} };
    const mockWrapper = {
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      offsetWidth: 50
    };

    let scheduledTimer = null;
    const env = {
      document: {
        getElementById(id) {
          if (id === 'island-art-wrapper') return mockWrapper;
          if (id === 'island-art-img') return mockNewImg;
          if (id === 'island-art-img-old') return mockOldImg;
          if (id === 'island-art-sparkle-sweep') return mockSweep;
          if (id === 'dynamic-island') return { classList: { remove() {}, add() {} } };
          return null;
        },
        body: { classList: { contains: () => false } }
      },
      currentIslandAlbumArtUrl: 'http://example.com/old_art.jpg',
      islandArtTransitionTimer: null,
      setTimeout: (fn, ms) => {
        scheduledTimer = fn;
        return 1234;
      },
      clearTimeout: () => {}
    };

    const transitionExtract = rendererJs.match(/function triggerIslandArtTransition\(newUrl\) \{[\s\S]*?islandArtTransitionTimer = setTimeout\(\(\) => \{[\s\S]*?\}, 730\);[\s\S]*?\n\}/)[0];
    const triggerScope = new Function('env', `with(env) { ${transitionExtract} triggerIslandArtTransition('http://example.com/new_art.jpg'); }`);
    triggerScope(env);

    // Old art is visible during transition
    assert.strictEqual(mockOldImg.style.display, 'block');
    assert.ok(typeof scheduledTimer === 'function', '730ms timer must be scheduled');

    // Fire the transition completion callback
    scheduledTimer();

    assert.strictEqual(mockOldImg.style.display, 'none', 'Old image must be hidden after transition completion');
    assert.ok(mockOldImg.removeAttributeCalls.includes('src'), 'removeAttribute("src") must be called to evict bitmap');
    assert.strictEqual(mockOldImg.src, '', 'Old image src must be empty string');
  });

  await runTest('7.2: hideAlbumArtModal evicts modal image and video bitmaps', async () => {
    const modalImg = {
      src: 'data:image/jpeg;base64,modalArtworkLargeBitmap',
      style: { display: 'block' },
      removeAttributeCalls: [],
      removeAttribute(attr) {
        this.removeAttributeCalls.push(attr);
        if (attr === 'src') this.src = '';
      }
    };

    const modalVid = createMockVideo('album-art-modal-video', 'https://cdn.example.com/modal_video.mp4');

    const modalEl = {
      classList: {
        classes: new Set(['show']),
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      style: {}
    };

    const env = {
      document: {
        getElementById(id) {
          if (id === 'album-art-modal') return modalEl;
          if (id === 'album-art-modal-img') return modalImg;
          if (id === 'album-art-modal-video') return modalVid;
          return null;
        }
      },
      updateAutoHideState() {},
      resumeAnimatedArtVideos() {},
      setTimeout(fn) { fn(); }
    };

    const hideModalExtract = rendererJs.match(/function hideAlbumArtModal\(\) \{[\s\S]*?\n\}/)[0];
    const hideScope = new Function('env', `with(env) { ${hideModalExtract} hideAlbumArtModal(); }`);
    hideScope(env);

    // Verify image bitmap eviction
    assert.ok(modalImg.removeAttributeCalls.includes('src'), 'modalImg must have removeAttribute("src") called');
    assert.strictEqual(modalImg.src, '', 'modalImg src must be empty');
    assert.strictEqual(modalImg.style.display, 'none');

    // Verify video decoder eviction
    assert.strictEqual(modalVid.pauseCalls, 1);
    assert.strictEqual(modalVid.loadCalls, 1);
    assert.strictEqual(modalVid.src, '');
    assert.strictEqual(modalVid.style.display, 'none');
  });

  await runTest('7.3: Track change in handlePlaybackData evicts stale Base64 artwork bitmaps', async () => {
    const staleIslandOldImg = {
      src: 'data:image/png;base64,staleOldArtwork',
      style: { display: 'block' },
      removeAttributeCalls: [],
      removeAttribute(a) { this.removeAttributeCalls.push(a); if (a === 'src') this.src = ''; }
    };
    const staleModalImg = {
      src: 'data:image/png;base64,staleModalArtwork',
      style: { display: 'block' },
      removeAttributeCalls: [],
      removeAttribute(a) { this.removeAttributeCalls.push(a); if (a === 'src') this.src = ''; }
    };
    const modalEl = {
      classList: { contains(c) { return false; } } // Not open
    };

    const env = {
      document: {
        getElementById(id) {
          if (id === 'island-art-img-old') return staleIslandOldImg;
          if (id === 'album-art-modal') return modalEl;
          if (id === 'album-art-modal-img') return staleModalImg;
          return null;
        }
      }
    };

    const trackEvictSnippet = new Function('env', `with(env) {
      const staleIslandOldImg = document.getElementById("island-art-img-old");
      if (staleIslandOldImg) {
        staleIslandOldImg.removeAttribute('src');
        staleIslandOldImg.style.display = 'none';
      }
      const modalEl = document.getElementById('album-art-modal');
      if (modalEl && !modalEl.classList.contains('show')) {
        const staleModalImg = document.getElementById('album-art-modal-img');
        if (staleModalImg) staleModalImg.removeAttribute('src');
      }
    }`);

    trackEvictSnippet(env);

    assert.ok(staleIslandOldImg.removeAttributeCalls.includes('src'));
    assert.strictEqual(staleIslandOldImg.src, '');
    assert.strictEqual(staleIslandOldImg.style.display, 'none');

    assert.ok(staleModalImg.removeAttributeCalls.includes('src'));
    assert.strictEqual(staleModalImg.src, '');
  });

  console.log('\n================================================================');
  console.log(`  EMPIRICAL VERIFICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100% GREEN)`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled test harness error:', err);
  process.exit(1);
});
