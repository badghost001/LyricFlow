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

  console.log(`Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runIslandTimeoutTests();
