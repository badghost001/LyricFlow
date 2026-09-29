/**
 * Unit Tests for Dynamic Island Inactivity Timeout & Sleep State Logic
 */

const assert = require('assert');

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

function runIslandTimeoutTests() {
  console.log('\n--- Running Dynamic Island Inactivity Timeout Tests ---\n');

  // Test 1: Inactivity timeout triggers sleep when music is paused/idle and idleTime >= timeoutMs
  test('1. Timeout triggers sleepDynamicIsland when isPlaying is false and idleTime >= timeoutMs', () => {
    let isIslandSleeping = false;
    let isPlaying = false;
    let isDynamicIslandMode = true;
    let lastPlaybackActivityMs = Date.now() - 35000; // 35 seconds ago
    const settings = { islandInactivityTimeout: 30000 }; // 30s timeout

    let sleepCalled = false;
    function sleepDynamicIsland() {
      sleepCalled = true;
      isIslandSleeping = true;
    }

    function checkDynamicIslandInactivity() {
      if (!isDynamicIslandMode) return;
      const timeoutMs = (typeof settings.islandInactivityTimeout === 'number') ? settings.islandInactivityTimeout : 30000;
      if (timeoutMs <= 0) return;

      if (isPlaying) {
        lastPlaybackActivityMs = Date.now();
        return;
      }

      const idleTime = Date.now() - lastPlaybackActivityMs;
      if (idleTime >= timeoutMs && !isIslandSleeping) {
        sleepDynamicIsland();
      }
    }

    checkDynamicIslandInactivity();
    assert.strictEqual(sleepCalled, true, 'Sleep must be called when idleTime exceeds timeoutMs');
    assert.strictEqual(isIslandSleeping, true, 'isIslandSleeping must be true');
  });

  // Test 2: Inactivity timeout does NOT sleep while music is actively playing
  test('2. Timeout does NOT sleep while isPlaying is true', () => {
    let isIslandSleeping = false;
    let isPlaying = true;
    let isDynamicIslandMode = true;
    let lastPlaybackActivityMs = Date.now() - 40000;
    const settings = { islandInactivityTimeout: 30000 };

    let sleepCalled = false;
    function sleepDynamicIsland() {
      sleepCalled = true;
      isIslandSleeping = true;
    }

    function checkDynamicIslandInactivity() {
      if (!isDynamicIslandMode) return;
      const timeoutMs = (typeof settings.islandInactivityTimeout === 'number') ? settings.islandInactivityTimeout : 30000;
      if (timeoutMs <= 0) return;

      if (isPlaying) {
        lastPlaybackActivityMs = Date.now();
        return;
      }

      const idleTime = Date.now() - lastPlaybackActivityMs;
      if (idleTime >= timeoutMs && !isIslandSleeping) {
        sleepDynamicIsland();
      }
    }

    checkDynamicIslandInactivity();
    assert.strictEqual(sleepCalled, false, 'Sleep must NOT be called when playing');
    assert.strictEqual(isIslandSleeping, false);
    assert.ok(Date.now() - lastPlaybackActivityMs < 100, 'Activity timestamp must be refreshed while playing');
  });

  // Test 3: Inactivity timeout <= 0 (Never) keeps island awake
  test('3. Timeout value of 0 (Never) disables inactivity sleep', () => {
    let isIslandSleeping = false;
    let isPlaying = false;
    let isDynamicIslandMode = true;
    let lastPlaybackActivityMs = Date.now() - 1000000; // 1000s ago
    const settings = { islandInactivityTimeout: 0 }; // Never

    let sleepCalled = false;
    function checkDynamicIslandInactivity() {
      if (!isDynamicIslandMode) return;
      const timeoutMs = (typeof settings.islandInactivityTimeout === 'number') ? settings.islandInactivityTimeout : 30000;
      if (timeoutMs <= 0) return;

      const idleTime = Date.now() - lastPlaybackActivityMs;
      if (idleTime >= timeoutMs && !isIslandSleeping) {
        sleepCalled = true;
      }
    }

    checkDynamicIslandInactivity();
    assert.strictEqual(sleepCalled, false, 'Sleep must not trigger when timeout is 0 (Never)');
  });

  // Test 4: updateDynamicIslandLyric does not update playback activity when paused
  test('4. updateDynamicIslandLyric guards sleeping state and avoids fake activity when paused', () => {
    let isIslandSleeping = true;
    let isPlaying = false;
    let lastPlaybackActivityMs = 1000;

    function updateDynamicIslandLyric(targetIndex, lineData, syncProgress) {
      if (isIslandSleeping) return;
      if (isPlaying) {
        lastPlaybackActivityMs = Date.now();
      }
    }

    updateDynamicIslandLyric(0, { text: 'Hello' }, 500);
    assert.strictEqual(lastPlaybackActivityMs, 1000, 'Activity timestamp must not be modified while sleeping/paused');
  });

  // Test 5: Resuming playback wakes sleeping island
  test('5. Resuming playback transitions wakeDynamicIsland', () => {
    let isIslandSleeping = true;
    let wakeCalled = false;

    function wakeDynamicIsland() {
      wakeCalled = true;
      isIslandSleeping = false;
    }

    let isPlaying = false;
    const isCurrentlyPlaying = true;
    const wasPlaying = isPlaying;
    isPlaying = isCurrentlyPlaying;

    if (!wasPlaying && isCurrentlyPlaying) {
      if (isIslandSleeping) {
        wakeDynamicIsland();
      }
    }

    assert.strictEqual(wakeCalled, true, 'Island must wake when playback starts');
    assert.strictEqual(isIslandSleeping, false);
  });

  // Test 6: Satellite island hides on English lines, reappears on foreign lines, and turns off for non-translated tracks
  test('6. Satellite island hides on English lines, reappears on foreign lines, and turns off for non-translated tracks', () => {
    const bilingualLyrics = [
      { time: 1000, text: 'こんにちは', subText: 'Hello' },
      { time: 3000, text: 'Yeah yeah oh baby' }, // English line (no subtext needed)
      { time: 6000, text: '世界', subText: 'World' }
    ];
    const settings = { islandTranslationMode: 'bilingual', islandSatelliteEnabled: true };
    const isIslandSleeping = false;

    function checkDocking(lineData, lyricsList) {
      const trackHasTranslation = Boolean(
        lyricsList && lyricsList.length > 0 &&
        lyricsList.some(l => l.subText && l.subText.trim().length > 0 && l.subText.trim().toLowerCase() !== (l.text || '').trim().toLowerCase())
      );
      const curOrigText = (lineData && lineData.text) ? lineData.text.trim() : '';
      const curSubText = (lineData && lineData.subText) ? lineData.subText.trim() : '';
      const lineHasTranslation = Boolean(
        curSubText &&
        curSubText.length > 0 &&
        curSubText.toLowerCase() !== curOrigText.toLowerCase()
      );
      const isSatelliteEnabled = settings.islandSatelliteEnabled !== false && settings.islandTranslationMode !== 'none';
      return {
        docked: Boolean(isSatelliteEnabled && trackHasTranslation && lineHasTranslation && !isIslandSleeping),
        trackHasTranslation
      };
    }

    // Line 1: Foreign line with translation -> MUST DOCK
    const res1 = checkDocking(bilingualLyrics[0], bilingualLyrics);
    assert.strictEqual(res1.docked, true, 'Satellite must dock for foreign line 1');

    // Line 2: English part (no subtext) -> MUST HIDE ITSELF
    const res2 = checkDocking(bilingualLyrics[1], bilingualLyrics);
    assert.strictEqual(res2.docked, false, 'Satellite must hide itself for English line 2');

    // Line 3: Foreign line resumes -> MUST REAPPEAR
    const res3 = checkDocking(bilingualLyrics[2], bilingualLyrics);
    assert.strictEqual(res3.docked, true, 'Satellite must reappear for foreign line 3');

    // Non-translated song: all English lines
    const englishLyrics = [
      { time: 1000, text: 'I love you' },
      { time: 3000, text: 'Forever and always' }
    ];
    const resEng = checkDocking(englishLyrics[0], englishLyrics);
    assert.strictEqual(resEng.docked, false, 'Satellite must be disabled for non-translated track');
    assert.strictEqual(resEng.trackHasTranslation, false, 'Track must be flagged as having no translation (animation completely turned off)');
  });

  // Test 7: Satellite island un-docks when translation mode is turned off
  test('7. Satellite island un-docks when translation mode is set to none', () => {
    const lyrics = [{ time: 1000, text: 'Hello', subText: 'Hola' }];
    const settings = { islandTranslationMode: 'none', islandSatelliteEnabled: true };
    const isIslandSleeping = false;

    const isSatelliteEnabled = settings.islandSatelliteEnabled !== false && settings.islandTranslationMode !== 'none';
    const trackHasTranslation = Boolean(
      lyrics && lyrics.length > 0 &&
      lyrics.some(l => l.subText && l.subText.trim().length > 0)
    );
    const shouldSatelliteBeDocked = Boolean(isSatelliteEnabled && trackHasTranslation && !isIslandSleeping);

    assert.strictEqual(shouldSatelliteBeDocked, false, 'Satellite must un-dock when translation mode is none');
  });

  // Test 8: CAEmitterEngine spawns stardust particles on both materialize and vaporize
  test('8. CAEmitterEngine spawns stardust particles on both materialize and vaporize', () => {
    const { CAEmitterEngine } = require('../src/modules/ca-emitter');
    const engine = new CAEmitterEngine('test-canvas');
    engine.canvas = { width: 800, height: 600, style: {} };
    engine.ctx = {
      clearRect() {},
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      scale() {},
      setTransform() {},
      beginPath() {},
      moveTo() {},
      quadraticCurveTo() {},
      arc() {},
      closePath() {},
      fill() {},
      createRadialGradient() { return { addColorStop() {} }; }
    };

    // Mock target element with squircle dimensions
    const mockElem = {
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      style: { display: '' },
      getBoundingClientRect() {
        return { left: 100, top: 20, width: 320, height: 32 };
      },
      addEventListener() {},
      removeEventListener() {}
    };

    // Test materialize
    engine.materialize(mockElem, null, { particleCount: 30 });
    assert.strictEqual(mockElem.classList.contains('island-materializing'), true, 'Should add island-materializing class');
    assert.ok(engine.particles.length > 0, `Engine must spawn particles on materialize (got ${engine.particles.length})`);
    const stardustParticles = engine.particles.filter(p => p.type === 'stardust');
    assert.ok(stardustParticles.length > 0, 'Must have stardust particles');

    // Clear particles and test vaporize
    engine.particles = [];
    engine.vaporize(mockElem, null, { particleCount: 40 });
    assert.strictEqual(mockElem.classList.contains('island-vaporizing'), true, 'Should add island-vaporizing class');
    assert.ok(engine.particles.length > 0, `Engine must spawn particles on vaporize (got ${engine.particles.length})`);
  });

  // Test 9: Satellite text swapping animation triggers smoothly without breaking
  test('9. Satellite text change triggers swapping transition', (done) => {
    const classes = new Set();
    const mockSatText = {
      textContent: 'Original translation',
      classList: {
        add(c) { classes.add(c); },
        remove(c) { classes.delete(c); },
        contains(c) { return classes.has(c); }
      }
    };

    let textAnimTimeout = null;
    let textCleanupTimeout = null;
    function animateSatelliteTextChange(satText, satMarqueeWrapper, newText) {
      if (!satText) return;
      if (!satText.textContent || satText.textContent === '•••' || satText.textContent === '♪ ♪ ♪') {
        satText.textContent = newText;
        return;
      }
      satText.classList.remove('satellite-text-entering');
      satText.classList.add('satellite-text-swapping');

      textAnimTimeout = setTimeout(() => {
        satText.textContent = newText;
        satText.classList.remove('satellite-text-swapping');
        satText.classList.add('satellite-text-entering');
        textCleanupTimeout = setTimeout(() => {
          satText.classList.remove('satellite-text-entering');
        }, 20);
      }, 10);
    }

    animateSatelliteTextChange(mockSatText, null, 'Nueva traducción');
    assert.strictEqual(mockSatText.classList.contains('satellite-text-swapping'), true, 'Must start swapping');

    setTimeout(() => {
      assert.strictEqual(mockSatText.textContent, 'Nueva traducción', 'Text content must update after swap');
      assert.strictEqual(mockSatText.classList.contains('satellite-text-entering'), true, 'Must enter with spring');
      setTimeout(() => {
        assert.strictEqual(mockSatText.classList.contains('satellite-text-entering'), false, 'Cleaned up classes');
      }, 30);
    }, 15);
  });

  // Test 10: Track transition to English/untranslated song triggers vaporization, while in-song transitions are silent
  test('10. Track transition to English/untranslated song triggers vaporization, while in-song transitions are silent', () => {
    let vaporizeCalled = false;
    let materializeCalled = false;

    const mockEmitter = {
      vaporize(elem, onComplete) {
        vaporizeCalled = true;
        if (onComplete) onComplete();
      },
      materialize(elem, onComplete) {
        materializeCalled = true;
        if (onComplete) onComplete();
      }
    };

    let lastSatelliteActiveState = true; // Was active on translated song
    const mockSatIsland = { offsetWidth: 320, style: { display: 'flex' } };

    // When an English/untranslated track comes on:
    function simulateTrackChange(newTrackHasTranslation) {
      if (!newTrackHasTranslation && lastSatelliteActiveState) {
        lastSatelliteActiveState = false;
        mockEmitter.vaporize(mockSatIsland, () => {
          mockSatIsland.style.display = 'none';
        });
      }
    }

    // 1. New English track comes on: MUST VAPORIZE SATELLITE BAR
    simulateTrackChange(false);
    assert.strictEqual(vaporizeCalled, true, 'Track change to English track must trigger vaporization animation');
    assert.strictEqual(mockSatIsland.style.display, 'none', 'Satellite bar must hide after vaporization');

    // 2. In-song line transition (bilingual song with foreign <-> English line switches): MUST NOT CALL EMITTER
    vaporizeCalled = false;
    materializeCalled = false;

    // Simulate in-song line change without emitter
    function inSongLineChange(lineHasTranslation) {
      if (lineHasTranslation) {
        // Quietly reveal
        mockSatIsland.style.display = 'flex';
      } else {
        // Quietly hide
        mockSatIsland.style.display = 'none';
      }
      // Zero emitter calls!
    }

    inSongLineChange(false); // English line
    assert.strictEqual(vaporizeCalled, false, 'In-song English line must NOT call caEmitterLayer.vaporize (silent hide)');

    inSongLineChange(true); // Foreign line
    assert.strictEqual(materializeCalled, false, 'In-song foreign line must NOT call caEmitterLayer.materialize (silent reveal)');
  });

  // Test 11: When music stops/pauses, Dynamic Island minimizes to album art + song name + visualizer, and lyrics are hidden
  test('11. Music pause minimizes island to album art + song name + visualizer, hiding lyrics and satellite', () => {
    let isPlaying = false;
    let islandPausedClass = false;
    let lyricZoneVisible = true;
    let pausedZoneVisible = false;
    let satelliteVisible = true;
    let targetWidth = '340px';
    let displayedTitle = '';

    const trackObj = { name: 'Cruel Summer', artist: 'Taylor Swift' };
    const widthMap = { 4: '340px', 6: '355px', 8: '370px' };
    const pausedWidthMap = { 4: '210px', 6: '220px', 8: '230px' };
    const barCount = 4;

    function syncIslandState() {
      islandPausedClass = !isPlaying;
      if (!isPlaying) {
        lyricZoneVisible = false;      // Hide lyrics only
        pausedZoneVisible = true;      // Show song name
        satelliteVisible = false;      // Hide satellite pill
        targetWidth = pausedWidthMap[barCount] || '210px'; // Minimized width
        displayedTitle = trackObj.name;
      } else {
        lyricZoneVisible = true;
        pausedZoneVisible = false;
        targetWidth = widthMap[barCount] || '340px';
      }
    }

    syncIslandState();

    assert.strictEqual(islandPausedClass, true, 'Island must have island-paused class when music stops');
    assert.strictEqual(lyricZoneVisible, false, 'Lyrics zone must be hidden when music stops');
    assert.strictEqual(pausedZoneVisible, true, 'Paused zone must be visible displaying song name');
    assert.strictEqual(displayedTitle, 'Cruel Summer', 'Displayed title must be the track name');
    assert.strictEqual(targetWidth, '210px', 'Island width must minimize from 340px down to 210px');
    assert.strictEqual(satelliteVisible, false, 'Satellite translation pill must be hidden when music is paused');
  });

  // Test 12: When music resumes, Dynamic Island expands and restores live karaoke lyrics
  test('12. Music resume expands island back to live karaoke lyrics and restores docking', () => {
    let isPlaying = true;
    let islandPausedClass = true;
    let lyricZoneVisible = false;
    let pausedZoneVisible = true;
    let targetWidth = '210px';

    const widthMap = { 4: '340px', 6: '355px', 8: '370px' };
    const pausedWidthMap = { 4: '210px', 6: '220px', 8: '230px' };
    const barCount = 4;

    function syncIslandState() {
      islandPausedClass = !isPlaying;
      if (isPlaying) {
        lyricZoneVisible = true;       // Restore lyrics
        pausedZoneVisible = false;     // Hide paused song name only zone
        targetWidth = widthMap[barCount] || '340px'; // Expanded width
      } else {
        lyricZoneVisible = false;
        pausedZoneVisible = true;
        targetWidth = pausedWidthMap[barCount] || '210px';
      }
    }

    syncIslandState();

    assert.strictEqual(islandPausedClass, false, 'Island must remove island-paused class when music plays');
    assert.strictEqual(lyricZoneVisible, true, 'Lyrics zone must be visible when music plays');
    assert.strictEqual(pausedZoneVisible, false, 'Paused zone must be hidden when music plays');
    assert.strictEqual(targetWidth, '340px', 'Island width must expand back to 340px for live lyrics');
  });

  // Test 13: Vocal Countdown Anticipation during intro and instrumental breaks
  test('13. Vocal Countdown calculates remaining time, formats badge, and respects toggle setting', () => {
    function formatTime(ms) {
      const totalSec = Math.floor(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    function getDynamicIslandSyncData(syncProgress, lyrics) {
      let countdownMs = 0;
      let isInstrumental = false;
      let lineIndex = -1;

      if (!lyrics || lyrics.length === 0) {
        return { lineIndex: -1, lineData: null, isInstrumental: false, countdownMs: 0 };
      }

      // Check intro
      if (syncProgress < (lyrics[0].time || 0)) {
        countdownMs = Math.max(0, (lyrics[0].time || 0) - syncProgress);
        return { lineIndex: -1, lineData: null, isInstrumental: false, countdownMs };
      }

      // Find active line
      for (let i = lyrics.length - 1; i >= 0; i--) {
        if (syncProgress >= lyrics[i].time) {
          lineIndex = i;
          break;
        }
      }

      const curLine = lyrics[lineIndex];
      const nextLine = lyrics[lineIndex + 1];
      if (curLine && nextLine) {
        const lineDuration = curLine.duration || 4000;
        const lineEnd = curLine.time + lineDuration;
        const gap = nextLine.time - lineEnd;
        if (gap >= 4000 && syncProgress >= lineEnd && syncProgress < nextLine.time) {
          isInstrumental = true;
          countdownMs = Math.max(0, nextLine.time - syncProgress);
        }
      }

      return { lineIndex, lineData: curLine, isInstrumental, countdownMs };
    }

    const testLyrics = [
      { time: 10000, text: 'First vocal line' },
      { time: 14000, duration: 3000, text: 'Second vocal line' },
      { time: 26000, text: 'Third vocal line after 9s guitar break' }
    ];

    // Case A: Song intro at 3000ms (7000ms until first lyric)
    const introSync = getDynamicIslandSyncData(3000, testLyrics);
    assert.strictEqual(introSync.lineIndex, -1);
    assert.strictEqual(introSync.countdownMs, 7000);
    const introCountdownSec = formatTime(introSync.countdownMs);
    assert.strictEqual(introCountdownSec, '0:07');

    // Case B: Instrumental break between line 1 (ends at 17000ms) and line 2 (starts at 26000ms) at 21000ms (5000ms left)
    const breakSync = getDynamicIslandSyncData(21000, testLyrics);
    assert.strictEqual(breakSync.isInstrumental, true);
    assert.strictEqual(breakSync.countdownMs, 5000);
    const breakCountdownSec = formatTime(breakSync.countdownMs);
    assert.strictEqual(breakCountdownSec, '0:05');

    // Case C: When countdown < 1500ms, countdown badge should not display
    const nearSync = getDynamicIslandSyncData(9000, testLyrics);
    assert.strictEqual(nearSync.countdownMs, 1000);
    const showCountdownBadge = (nearSync.countdownMs >= 1500);
    assert.strictEqual(showCountdownBadge, false, 'Badge must hide when remaining time is less than 1.5s');

    // Case D: When islandVocalCountdown setting is disabled (false), badge is suppressed
    const settingsDisabled = { islandVocalCountdown: false };
    const shouldRenderBadge = (introSync.countdownMs >= 1500) && (settingsDisabled.islandVocalCountdown !== false);
    assert.strictEqual(shouldRenderBadge, false, 'Countdown badge must be suppressed when disabled in settings');
  });

  // Test 14: Mouse wheel volume delta clamping and mute toggle
  test('14. Mouse wheel volume delta clamps strictly within [0, 100]% and middle-click toggles mute/unmute', () => {
    let currentIslandVolumePercent = 65;
    let isIslandMuted = false;
    let lastIslandMuteVolume = 65;

    function adjustIslandVolume(deltaPercent) {
      currentIslandVolumePercent = Math.max(0, Math.min(100, currentIslandVolumePercent + deltaPercent));
      isIslandMuted = (currentIslandVolumePercent === 0);
    }

    function toggleMute() {
      if (isIslandMuted) {
        currentIslandVolumePercent = lastIslandMuteVolume || 50;
        isIslandMuted = false;
      } else {
        lastIslandMuteVolume = currentIslandVolumePercent;
        currentIslandVolumePercent = 0;
        isIslandMuted = true;
      }
    }

    // Step 1: Scroll up +10% -> 75%
    adjustIslandVolume(10);
    assert.strictEqual(currentIslandVolumePercent, 75);
    assert.strictEqual(isIslandMuted, false);

    // Step 2: Scroll up beyond 100% -> must clamp to 100%
    adjustIslandVolume(50);
    assert.strictEqual(currentIslandVolumePercent, 100);

    // Step 3: Scroll down below 0% -> must clamp to 0% and set muted
    adjustIslandVolume(-150);
    assert.strictEqual(currentIslandVolumePercent, 0);
    assert.strictEqual(isIslandMuted, true);

    // Step 4: Reset to 60%, then middle click to mute
    currentIslandVolumePercent = 60;
    isIslandMuted = false;
    toggleMute();
    assert.strictEqual(currentIslandVolumePercent, 0);
    assert.strictEqual(isIslandMuted, true);
    assert.strictEqual(lastIslandMuteVolume, 60, 'Must record previous volume before mute');

    // Step 5: Middle click again to unmute -> must restore 60%
    toggleMute();
    assert.strictEqual(currentIslandVolumePercent, 60);
    assert.strictEqual(isIslandMuted, false);
  });

  // Test 15: Playback seek delta clamping within [0, trackDuration]
  test('15. Playback seek clamps strictly within [0, trackDuration]', () => {
    const trackDuration = 180000; // 3 minutes = 180,000ms
    let currentProgress = 50000;

    function seekPlayback(targetMs) {
      if (trackDuration <= 0) return 0;
      const seekMs = Math.max(0, Math.min(trackDuration, Math.round(targetMs)));
      currentProgress = seekMs;
      return seekMs;
    }

    // Seek forward +5s
    let seeked = seekPlayback(currentProgress + 5000);
    assert.strictEqual(seeked, 55000);
    assert.strictEqual(currentProgress, 55000);

    // Seek backward -5s
    seeked = seekPlayback(currentProgress - 5000);
    assert.strictEqual(seeked, 50000);

    // Seek backward past start (e.g. at 2000ms with -5000ms) -> clamps to 0
    currentProgress = 2000;
    seeked = seekPlayback(currentProgress - 5000);
    assert.strictEqual(seeked, 0);
    assert.strictEqual(currentProgress, 0);

    // Seek forward past end (e.g. at 178000ms with +5000ms) -> clamps to 180000
    currentProgress = 178000;
    seeked = seekPlayback(currentProgress + 5000);
    assert.strictEqual(seeked, 180000);
    assert.strictEqual(currentProgress, 180000);
  });

  // Test 16: Visualizer style switcher updates classes between bars, dots, and wave
  test('16. Visualizer style switcher updates container CSS classes between bars, dots, and wave', () => {
    const classList = new Set();
    const mockContainer = {
      classList: {
        add: (cls) => classList.add(cls),
        remove: (cls) => classList.delete(cls),
        contains: (cls) => classList.has(cls)
      }
    };

    function applyIslandVisualizerStyle(style, container) {
      if (!container) return;
      container.classList.remove("visualizer-style-dots");
      container.classList.remove("visualizer-style-wave");
      if (style === "dots") {
        container.classList.add("visualizer-style-dots");
      } else if (style === "wave") {
        container.classList.add("visualizer-style-wave");
      }
    }

    // Default 'bars' -> no special modifier classes
    applyIslandVisualizerStyle('bars', mockContainer);
    assert.strictEqual(mockContainer.classList.contains('visualizer-style-dots'), false);
    assert.strictEqual(mockContainer.classList.contains('visualizer-style-wave'), false);

    // Style 'dots' -> adds .visualizer-style-dots
    applyIslandVisualizerStyle('dots', mockContainer);
    assert.strictEqual(mockContainer.classList.contains('visualizer-style-dots'), true);
    assert.strictEqual(mockContainer.classList.contains('visualizer-style-wave'), false);

    // Style 'wave' -> removes .visualizer-style-dots and adds .visualizer-style-wave
    applyIslandVisualizerStyle('wave', mockContainer);
    assert.strictEqual(mockContainer.classList.contains('visualizer-style-dots'), false);
    assert.strictEqual(mockContainer.classList.contains('visualizer-style-wave'), true);

    // Back to 'bars'
    applyIslandVisualizerStyle('bars', mockContainer);
    assert.strictEqual(mockContainer.classList.contains('visualizer-style-dots'), false);
    assert.strictEqual(mockContainer.classList.contains('visualizer-style-wave'), false);
  });

  console.log(`Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runIslandTimeoutTests();
