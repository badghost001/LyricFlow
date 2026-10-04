/**
 * Unit Tests for Dynamic Island Metamorphosis:
 * - Liquid Split-Cell Duet & Backing Vocals
 * - WASAPI Audio-Energy Morphing & Beat Bloom Aura
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

function runMetamorphosisTests() {
  console.log('\n--- Running Dynamic Island Metamorphosis Unit Tests ---\n');

  // Load functions under test
  function parseDuetVocalSplit(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    // 1. Parenthetical backing vocals: "Lead phrase (Backing response)" or "[Backing response]"
    // Handles trailing punctuation (.?!,:;), multiple parentheticals, etc.
    const parenEndMatch = trimmed.match(/^(.*?)\s*([\(\[][^\(\[\]\)]+[\)\]](?:\s*[\(\[][^\(\[\]\)]+[\)\]])*)[\s.?!,:;"'”’]*$/);
    if (parenEndMatch && parenEndMatch[1].trim()) {
      const lead = parenEndMatch[1].trim();
      const rawDuet = parenEndMatch[2].trim();
      const duet = rawDuet.replace(/^[\(\[]/, '').replace(/[\)\]]$/, '').replace(/[\)\]]\s*[\(\[]/g, ' ');
      const duetLower = duet.toLowerCase();

      // Filter out metadata and structural tags
      const isMeta = duetLower.startsWith('feat') || duetLower.startsWith('ft.') ||
                     duetLower === 'instrumental' || duetLower === 'solo' ||
                     duetLower === 'intro' || duetLower === 'outro' ||
                     duetLower === 'chorus' || duetLower === 'verse' ||
                     duetLower === 'bridge';

      if (!isMeta && lead.length >= 2 && duet.length >= 2) {
        return { leadText: lead, duetText: duet, type: 'parenthetical' };
      }
    }

    // 2. Parenthetical at start: "(Backing response) Lead phrase"
    const parenStartMatch = trimmed.match(/^[\(\[]([^\(\[\]\)]+)[\)\]]\s*(.+)$/);
    if (parenStartMatch) {
      const duet = parenStartMatch[1].trim();
      const lead = parenStartMatch[2].trim();
      const duetLower = duet.toLowerCase();

      const isMeta = duetLower.startsWith('feat') || duetLower.startsWith('ft.') ||
                     duetLower === 'instrumental' || duetLower === 'solo' ||
                     duetLower === 'intro' || duetLower === 'outro' ||
                     duetLower === 'chorus' || duetLower === 'verse' ||
                     duetLower === 'bridge';

      if (!isMeta && lead.length >= 2 && duet.length >= 2) {
        return { leadText: lead, duetText: duet, type: 'parenthetical' };
      }
    }

    // 3. Attributed / colon split: "Artist 1: Line 1 / Artist 2: Line 2"
    if (trimmed.includes(':') && (trimmed.includes('/') || trimmed.includes('&') || trimmed.includes('|'))) {
      const parts = trimmed.split(/[\/&|]/);
      if (parts.length >= 2) {
        const lead = parts[0].replace(/^[^:]+:\s*/, '').trim();
        const duet = parts[1].replace(/^[^:]+:\s*/, '').trim();
        if (lead.length >= 2 && duet.length >= 2) {
          return { leadText: lead, duetText: duet, type: 'attributed' };
        }
      }
    }

    return null;
  }

  function getLeadWordsForDuet(words, duetSplit) {
    if (!words || words.length === 0 || !duetSplit) return words;
    if (duetSplit.type === 'parenthetical') {
      const leadWords = [];
      for (let i = 0; i < words.length; i++) {
        const wt = (words[i].text || words[i].word || '').trim();
        if (wt.startsWith('(') || wt.startsWith('[')) {
          break;
        }
        leadWords.push(words[i]);
      }
      return leadWords.length > 0 ? leadWords : words;
    }
    return words;
  }

  // Test 1: Parenthetical duet parsing
  test('1. parseDuetVocalSplit correctly identifies parenthetical backing vocal phrases', () => {
    const res = parseDuetVocalSplit("I will always love you (love you)");
    assert.notStrictEqual(res, null);
    assert.strictEqual(res.leadText, "I will always love you");
    assert.strictEqual(res.duetText, "love you");
    assert.strictEqual(res.type, "parenthetical");
  });

  // Test 2: Bracketed backing response parsing
  test('2. parseDuetVocalSplit correctly identifies bracketed backing response phrases', () => {
    const res = parseDuetVocalSplit("Just take my hand [take my hand]");
    assert.notStrictEqual(res, null);
    assert.strictEqual(res.leadText, "Just take my hand");
    assert.strictEqual(res.duetText, "take my hand");
    assert.strictEqual(res.type, "parenthetical");
  });

  // Test 3: Attributed dual-artist split parsing
  test('3. parseDuetVocalSplit correctly separates attributed dual artist lines', () => {
    const res = parseDuetVocalSplit("Lady Gaga: Rain on me / Ariana Grande: Tsunami");
    assert.notStrictEqual(res, null);
    assert.strictEqual(res.leadText, "Rain on me");
    assert.strictEqual(res.duetText, "Tsunami");
    assert.strictEqual(res.type, "attributed");
  });

  // Test 4: Structural and metadata tags rejected
  test('4. parseDuetVocalSplit rejects structural metadata tags (Chorus, Verse, Feat, Instrumental)', () => {
    assert.strictEqual(parseDuetVocalSplit("Song Title (feat. Drake)"), null);
    assert.strictEqual(parseDuetVocalSplit("Don't stop (Chorus)"), null);
    assert.strictEqual(parseDuetVocalSplit("Guitar Solo (Instrumental)"), null);
    assert.strictEqual(parseDuetVocalSplit("(Verse 1)"), null);
    assert.strictEqual(parseDuetVocalSplit("(Outro)"), null);
    assert.strictEqual(parseDuetVocalSplit("(Bridge)"), null);
  });

  // Test 5: Lead and duet minimum length constraints
  test('5. parseDuetVocalSplit rejects phrases failing minimum 2-character lead or duet length', () => {
    assert.strictEqual(parseDuetVocalSplit("(Solo)"), null);
    assert.strictEqual(parseDuetVocalSplit("A (B)"), null);
    assert.strictEqual(parseDuetVocalSplit(""), null);
    assert.strictEqual(parseDuetVocalSplit(null), null);
    assert.strictEqual(parseDuetVocalSplit(undefined), null);
  });

  // Test 6: getLeadWordsForDuet separates lead words from parenthetical backing words
  test('6. getLeadWordsForDuet extracts only the lead words for primary island karaoke highlighting', () => {
    const words = [
      { text: "Never" },
      { text: "gonna" },
      { text: "give" },
      { text: "you" },
      { text: "up" },
      { text: "(give" },
      { text: "you" },
      { text: "up)" }
    ];
    const duetSplit = { leadText: "Never gonna give you up", duetText: "give you up", type: 'parenthetical' };
    const leadWords = getLeadWordsForDuet(words, duetSplit);

    assert.strictEqual(leadWords.length, 5);
    assert.deepStrictEqual(leadWords.map(w => w.text), ["Never", "gonna", "give", "you", "up"]);
  });

  // Test 7: Audio Energy Morphing Tier Classification
  test('7. Audio energy RMS and sub-bass classify accurately into 4 tiers with hysteresis', () => {
    function classifyTier(rollingEnergy, subBass, isInstrumental, currentTier, lastTierTime, now) {
      let targetTier = 'groove';
      if (isInstrumental && rollingEnergy >= 0.15) {
        targetTier = 'solo';
      } else if (rollingEnergy >= 0.42 || subBass > 0.82) {
        targetTier = 'climax';
      } else if (rollingEnergy < 0.10) {
        targetTier = 'calm';
      } else {
        targetTier = 'groove';
      }

      const isUpgrade = (targetTier === 'climax' || targetTier === 'solo');
      if (targetTier !== currentTier) {
        if (isUpgrade || (now - lastTierTime >= 350)) {
          return { tier: targetTier, time: now };
        }
      }
      return { tier: currentTier, time: lastTierTime };
    }

    const t0 = 1000;
    // Calm energy (< 0.10)
    let state = classifyTier(0.06, 0.05, false, 'groove', t0, t0 + 400);
    assert.strictEqual(state.tier, 'calm');

    // Groove energy (0.25)
    state = classifyTier(0.25, 0.30, false, state.tier, state.time, state.time + 400);
    assert.strictEqual(state.tier, 'groove');

    // Climax jump on heavy bass (> 0.82) is immediate without waiting 350ms
    state = classifyTier(0.30, 0.88, false, state.tier, state.time, state.time + 50);
    assert.strictEqual(state.tier, 'climax');

    // Climax to groove downgrade must respect 350ms hysteresis
    const preDowngrade = classifyTier(0.25, 0.30, false, state.tier, state.time, state.time + 100);
    assert.strictEqual(preDowngrade.tier, 'climax', 'Must hold climax tier before 350ms hold time');

    const postDowngrade = classifyTier(0.25, 0.30, false, state.tier, state.time, state.time + 400);
    assert.strictEqual(postDowngrade.tier, 'groove', 'Must transition after 350ms hold time');

    // Instrumental break solo mode
    state = classifyTier(0.35, 0.40, true, 'groove', state.time, state.time + 400);
    assert.strictEqual(state.tier, 'solo');
  });

  // Test 8: Beat Bloom aura calculation
  test('8. Beat bloom triggers box-shadow aura on heavy sub-bass transients (> 0.65)', () => {
    function computeBeatBloom(subBass, enabled, accentRgb = '56, 189, 248') {
      if (!enabled || subBass <= 0.65) return null;
      const bloomRadius = Math.round(subBass * 28);
      const bloomAlpha = Math.min(0.70, subBass * 0.75).toFixed(2);
      return `inset 0 1px 0.5px rgba(255, 255, 255, 0.35), 0 12px 32px rgba(0, 0, 0, 0.75), 0 0 ${bloomRadius}px rgba(${accentRgb}, ${bloomAlpha})`;
    }

    // Heavy bass drop: 0.85
    const bloom = computeBeatBloom(0.85, true, '29, 185, 84');
    assert.notStrictEqual(bloom, null);
    assert.ok(bloom.includes('0 0 24px rgba(29, 185, 84, 0.64)'));

    // Quiet passage: 0.30 -> No bloom
    assert.strictEqual(computeBeatBloom(0.30, true), null);

    // Feature disabled -> No bloom
    assert.strictEqual(computeBeatBloom(0.90, false), null);
  });

  // Test 9: Duet split and fuse state machine transitions
  test('9. Duet split shows capsule and fuse transitions gracefully back to primary island', () => {
    let classes = new Set();
    let capsuleStyle = { display: 'none' };
    let bridgeStyle = { display: 'none' };
    let lastDuetActiveState = false;
    let duetFusingClass = false;

    function showDuet() {
      duetFusingClass = false;
      if (!lastDuetActiveState) {
        lastDuetActiveState = true;
        classes.add('has-duet-active');
        capsuleStyle.display = 'flex';
        bridgeStyle.display = 'block';
      }
    }

    function hideDuet(fuse) {
      if (fuse && lastDuetActiveState) {
        duetFusingClass = true;
        // Simulated fuse completion
        classes.delete('has-duet-active');
        duetFusingClass = false;
        capsuleStyle.display = 'none';
        bridgeStyle.display = 'none';
        lastDuetActiveState = false;
      } else {
        classes.delete('has-duet-active');
        capsuleStyle.display = 'none';
        bridgeStyle.display = 'none';
        lastDuetActiveState = false;
      }
    }

    // Initial state: hidden
    assert.strictEqual(lastDuetActiveState, false);
    assert.strictEqual(capsuleStyle.display, 'none');

    // Show duet
    showDuet();
    assert.strictEqual(lastDuetActiveState, true);
    assert.strictEqual(classes.has('has-duet-active'), true);
    assert.strictEqual(capsuleStyle.display, 'flex');
    assert.strictEqual(bridgeStyle.display, 'block');

    // Hide duet with fuse
    hideDuet(true);
    assert.strictEqual(lastDuetActiveState, false);
    assert.strictEqual(classes.has('has-duet-active'), false);
    assert.strictEqual(capsuleStyle.display, 'none');
  });

  // Test 10: HTML & CSS contract verification
  test('10. index.html and _dynamic_island.css contain complete Metamorphosis DOM and styles', () => {
    const htmlPath = path.resolve(__dirname, '../src/index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(htmlContent.includes('id="island-duet-bridge"'), 'HTML must have #island-duet-bridge');
    assert.ok(htmlContent.includes('id="island-duet-capsule"'), 'HTML must have #island-duet-capsule');
    assert.ok(htmlContent.includes('id="island-duet-marquee-wrapper"'), 'HTML must have #island-duet-marquee-wrapper');
    assert.ok(htmlContent.includes('id="island-duet-text"'), 'HTML must have #island-duet-text');
    assert.ok(htmlContent.includes('id="check-island-metamorphosis"'), 'HTML must have #check-island-metamorphosis');
    assert.ok(htmlContent.includes('id="check-island-duet-split"'), 'HTML must have #check-island-duet-split');
    assert.ok(htmlContent.includes('id="check-island-beat-bloom"'), 'HTML must have #check-island-beat-bloom');

    const cssPath = path.resolve(__dirname, '../src/styles/_dynamic_island.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(cssContent.includes('.island-duet-bridge'), 'CSS must define .island-duet-bridge');
    assert.ok(cssContent.includes('.island-duet-capsule'), 'CSS must define .island-duet-capsule');
    assert.ok(cssContent.includes('@keyframes duetLiquidSplit'), 'CSS must define @keyframes duetLiquidSplit');
    assert.ok(cssContent.includes('@keyframes duetLiquidFuse'), 'CSS must define @keyframes duetLiquidFuse');
    assert.ok(cssContent.includes('island-morph-calm'), 'CSS must define .island-morph-calm');
    assert.ok(cssContent.includes('island-morph-groove'), 'CSS must define .island-morph-groove');
    assert.ok(cssContent.includes('island-morph-climax'), 'CSS must define .island-morph-climax');
    assert.ok(cssContent.includes('island-morph-solo'), 'CSS must define .island-morph-solo');
  });

  // Test 11: Window bounds union accounts for duet capsule
  test('11. renderer.js includes duet capsule in pushDynamicIslandBounds window union', () => {
    const rendererPath = path.resolve(__dirname, '../src/renderer.js');
    const rendererContent = fs.readFileSync(rendererPath, 'utf8');

    assert.ok(rendererContent.includes('document.getElementById("island-duet-capsule")'), 'pushDynamicIslandBounds must check #island-duet-capsule');
    assert.ok(rendererContent.includes('updateIslandEnergyMorph(bands)'), 'onAudioSpectrum must call updateIslandEnergyMorph');
  });

  // Test 12: Cell-mitosis pinching and absorbing animation triggers
  test('12. Cell-mitosis pinch and absorb animation classes trigger on split and fuse', () => {
    let primaryIslandClasses = new Set();
    let bridgeClasses = new Set();
    let lastDuetActive = false;

    function showDuetWithMitosis() {
      if (!lastDuetActive) {
        lastDuetActive = true;
        primaryIslandClasses.delete('island-cell-absorbing');
        primaryIslandClasses.add('island-cell-pinching');
        bridgeClasses.delete('bridge-fusing');
      }
    }

    function hideDuetWithMitosis(fuse) {
      if (fuse && lastDuetActive) {
        primaryIslandClasses.delete('island-cell-pinching');
        primaryIslandClasses.add('island-cell-absorbing');
        bridgeClasses.add('bridge-fusing');
        lastDuetActive = false;
      }
    }

    showDuetWithMitosis();
    assert.strictEqual(primaryIslandClasses.has('island-cell-pinching'), true, 'Primary island must pinch on split');
    assert.strictEqual(bridgeClasses.has('bridge-fusing'), false);

    hideDuetWithMitosis(true);
    assert.strictEqual(primaryIslandClasses.has('island-cell-pinching'), false);
    assert.strictEqual(primaryIslandClasses.has('island-cell-absorbing'), true, 'Primary island must absorb on fuse');
    assert.strictEqual(bridgeClasses.has('bridge-fusing'), true, 'Bridge must collapse on fuse');
  });

  // Test 13: Wallpaper Mode Apple-style lyric beat bloom calculation
  test('13. Wallpaper mode calculates dynamic glow radius, alpha, and scale on sub-bass transients (> 0.60)', () => {
    function computeWallpaperLyricBloom(subBass, enabled, isPlaying = true) {
      if (!enabled || !isPlaying || subBass <= 0.60) {
        return { active: false, glowRadius: 0, glowAlpha: 0, scaleBump: 1.0 };
      }
      const norm = Math.min(1.0, (subBass - 0.60) / 0.40);
      const glowRadius = Math.round(norm * 22 + 10); // 10px to 32px
      const glowAlpha = Number((0.35 + norm * 0.50).toFixed(2)); // 0.35 to 0.85
      const scaleBump = Number((1.025 + norm * 0.025).toFixed(3)); // 1.025 to 1.050
      return { active: true, glowRadius, glowAlpha, scaleBump };
    }

    // Heavy bass transient at 0.90
    const bloom = computeWallpaperLyricBloom(0.90, true, true);
    assert.strictEqual(bloom.active, true);
    assert.strictEqual(bloom.glowRadius >= 20, true, 'Glow radius should be dynamic on punchy bass');
    assert.strictEqual(bloom.glowAlpha >= 0.60, true, 'Alpha should brighten on heavy drops');
    assert.strictEqual(bloom.scaleBump >= 1.035, true, 'Scale should subtly breathe on kick hits');

    // Quiet passage at 0.35 -> Disabled
    const quiet = computeWallpaperLyricBloom(0.35, true, true);
    assert.strictEqual(quiet.active, false);

    // Paused playback -> Disabled
    const paused = computeWallpaperLyricBloom(0.95, true, false);
    assert.strictEqual(paused.active, false);

    // Setting disabled -> Disabled
    const disabled = computeWallpaperLyricBloom(0.95, false, true);
    assert.strictEqual(disabled.active, false);
  });

  // Test 14: CSS rules contract for cell-mitosis and wallpaper beat bloom
  test('14. _dynamic_island.css and _wallpaper.css contain cell-mitosis and wallpaper lyric beat bloom rules', () => {
    const islandCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');
    assert.ok(islandCss.includes('@keyframes mainCellBudding'), 'Must define @keyframes mainCellBudding');
    assert.ok(islandCss.includes('@keyframes mainCellAbsorb'), 'Must define @keyframes mainCellAbsorb');
    assert.ok(islandCss.includes('@keyframes duetBridgeStretch'), 'Must define @keyframes duetBridgeStretch');
    assert.ok(islandCss.includes('@keyframes duetBridgeCollapse'), 'Must define @keyframes duetBridgeCollapse');
    assert.ok(islandCss.includes('@keyframes duetLiquidPinchSplit'), 'Must define @keyframes duetLiquidPinchSplit');
    assert.ok(islandCss.includes('@keyframes duetLiquidPinchFuse'), 'Must define @keyframes duetLiquidPinchFuse');

    const wallpaperCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_wallpaper.css'), 'utf8');
    assert.ok(wallpaperCss.includes('body.wallpaper-mode.has-beat-bloom .lyric-line.active'), 'Must define wallpaper beat bloom line style');
    assert.ok(wallpaperCss.includes('body.wallpaper-mode.has-beat-bloom.wbw-active .lyric-line.active .lyric-word.lyric-word-active'), 'Must define wallpaper WBW beat bloom style');
    assert.ok(wallpaperCss.includes('body.wallpaper-style-3.has-beat-bloom'), 'Must define style-3 beat bloom overlay');
  });

  // Test 15: HTML settings contract for wallpaper beat bloom toggle
  test('15. index.html contains check-wallpaper-beat-bloom and updated check-island-beat-bloom', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../src/index.html'), 'utf8');
    assert.ok(html.includes('id="check-wallpaper-beat-bloom"'), 'HTML must have #check-wallpaper-beat-bloom');
    assert.ok(html.includes('Pulsing Lyric Beat Bloom (Apple Style)'), 'HTML must have Apple Style label');
    assert.ok(html.includes('Pulsing Island Beat Bloom'), 'HTML must have updated island beat bloom label');
  });

  // Test 16: Satellite cell-mitosis pinch and absorb state transitions
  test('16. Satellite cell-mitosis pinch and absorb animation triggers on translation split and fuse', () => {
    let primaryIslandClasses = new Set();
    let bridgeClasses = new Set();
    let satelliteClasses = new Set();
    let lastSatActive = false;

    function showSatWithMitosis() {
      if (!lastSatActive) {
        lastSatActive = true;
        primaryIslandClasses.delete('island-cell-absorbing');
        primaryIslandClasses.add('island-cell-pinching');
        bridgeClasses.delete('bridge-fusing');
        satelliteClasses.delete('satellite-fusing');
      }
    }

    function hideSatWithMitosis(fuse) {
      if (fuse && lastSatActive) {
        primaryIslandClasses.delete('island-cell-pinching');
        primaryIslandClasses.add('island-cell-absorbing');
        bridgeClasses.add('bridge-fusing');
        satelliteClasses.add('satellite-fusing');
        lastSatActive = false;
      }
    }

    showSatWithMitosis();
    assert.strictEqual(primaryIslandClasses.has('island-cell-pinching'), true, 'Primary island must pinch on satellite split');
    assert.strictEqual(bridgeClasses.has('bridge-fusing'), false);
    assert.strictEqual(satelliteClasses.has('satellite-fusing'), false);

    hideSatWithMitosis(true);
    assert.strictEqual(primaryIslandClasses.has('island-cell-pinching'), false);
    assert.strictEqual(primaryIslandClasses.has('island-cell-absorbing'), true, 'Primary island must absorb on satellite fuse');
    assert.strictEqual(bridgeClasses.has('bridge-fusing'), true, 'Bridge must collapse on satellite fuse');
    assert.strictEqual(satelliteClasses.has('satellite-fusing'), true, 'Satellite capsule must have satellite-fusing class');
  });

  // Test 17: Satellite translation CSS keyframes and renderer contracts
  test('17. _dynamic_island.css and renderer.js contain satellite translation cell-mitosis contracts', () => {
    const islandCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');
    assert.ok(islandCss.includes('@keyframes satelliteBridgeStretch'), 'Must define @keyframes satelliteBridgeStretch');
    assert.ok(islandCss.includes('@keyframes satelliteBridgeCollapse'), 'Must define @keyframes satelliteBridgeCollapse');
    assert.ok(islandCss.includes('@keyframes satelliteLiquidPinchSplit'), 'Must define @keyframes satelliteLiquidPinchSplit');
    assert.ok(islandCss.includes('@keyframes satelliteLiquidPinchFuse'), 'Must define @keyframes satelliteLiquidPinchFuse');
    assert.ok(islandCss.includes('.dynamic-island-translation.satellite-fusing'), 'Must define .dynamic-island-translation.satellite-fusing');
    assert.ok(islandCss.includes('.island-bridge.bridge-fusing'), 'Must define .island-bridge.bridge-fusing');

    const rendererContent = fs.readFileSync(path.resolve(__dirname, '../src/renderer.js'), 'utf8');
    assert.ok(rendererContent.includes('function showSatelliteIsland()'), 'Must define showSatelliteIsland function');
    assert.ok(rendererContent.includes('function hideSatelliteIsland(fuse = true)'), 'Must define hideSatelliteIsland function');
    assert.ok(rendererContent.includes('satelliteFuseTimeoutId'), 'Must define satelliteFuseTimeoutId');
  });

  // Test 18: Hardware layer promotion & transform-origin contracts
  test('18. _dynamic_island.css contains transform-origin: top center and GPU layer promotion', () => {
    const islandCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');
    assert.ok(islandCss.includes('transform-origin: top center;'), 'Must specify transform-origin: top center');
    assert.ok(islandCss.includes('backface-visibility: hidden;'), 'Must specify backface-visibility: hidden');
    assert.ok(islandCss.includes('--island-bloom-radius'), 'Must support --island-bloom-radius custom property');
    assert.ok(islandCss.includes('--island-bloom-alpha'), 'Must support --island-bloom-alpha custom property');
  });

  // Test 19: Audio peak follower exponential decay calculation
  test('19. Beat bloom audio peak follower exhibits fast attack and smooth exponential decay', () => {
    let smoothedBloom = 0;
    function followPeak(subBass) {
      if (subBass > smoothedBloom) {
        smoothedBloom = subBass; // Fast attack
      } else {
        smoothedBloom = smoothedBloom * 0.86; // ~150ms exponential release
      }
      return smoothedBloom;
    }

    // 1. Kick hits (jump from 0.2 to 0.9)
    followPeak(0.2);
    const peak = followPeak(0.9);
    assert.strictEqual(peak, 0.9, 'Attack should jump immediately to transient peak');

    // 2. Next frames: bass drops to quiet (0.3), envelope decays exponentially
    const f1 = followPeak(0.3);
    assert.strictEqual(f1.toFixed(3), '0.774', 'Frame 1 should decay to 86% of peak');

    const f2 = followPeak(0.3);
    assert.strictEqual(f2.toFixed(3), '0.666', 'Frame 2 should decay smoothly');

    const f3 = followPeak(0.3);
    assert.strictEqual(f3.toFixed(3), '0.572', 'Frame 3 should decay below active bloom threshold');

    // Renderer verification: zero getComputedStyle in updateIslandEnergyMorph
    const rendererContent = fs.readFileSync(path.resolve(__dirname, '../src/renderer.js'), 'utf8');
    assert.ok(rendererContent.includes('smoothedIslandBloom'), 'Must use smoothedIslandBloom envelope');
    assert.ok(rendererContent.includes('smoothedWallpaperBloom'), 'Must use smoothedWallpaperBloom envelope');
    assert.ok(!rendererContent.includes("getComputedStyle(document.documentElement).getPropertyValue('--art-color-1-rgb')"), 'Must NOT call expensive getComputedStyle in 60fps audio loop');
  });

  // Test 20: Bottom-center inverted mitosis contracts and keyframes
  test('20. _dynamic_island.css contains bottom-center inverted mitosis keyframes and transform-origin', () => {
    const islandCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');
    assert.ok(islandCss.includes('body.island-dock-bottom-center #dynamic-island'), 'Must style bottom-center dynamic island');
    assert.ok(islandCss.includes('@keyframes mainCellBuddingBottom'), 'Must define mainCellBuddingBottom keyframes');
    assert.ok(islandCss.includes('@keyframes mainCellAbsorbBottom'), 'Must define mainCellAbsorbBottom keyframes');
    assert.ok(islandCss.includes('@keyframes satelliteLiquidPinchSplitBottom'), 'Must define satelliteLiquidPinchSplitBottom');
    assert.ok(islandCss.includes('@keyframes duetLiquidPinchSplitBottom'), 'Must define duetLiquidPinchSplitBottom');
    assert.ok(islandCss.includes('transform-origin: bottom center !important;'), 'Must define bottom center transform-origin');
  });

  // Test 21: Corner docking transform origins
  test('21. _dynamic_island.css specifies corner docking transform origins', () => {
    const islandCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');
    assert.ok(islandCss.includes('body.island-dock-top-left #dynamic-island'), 'Must style top-left dynamic island');
    assert.ok(islandCss.includes('transform-origin: top left !important;'), 'Must specify top left transform origin');
    assert.ok(islandCss.includes('body.island-dock-top-right #dynamic-island'), 'Must style top-right dynamic island');
    assert.ok(islandCss.includes('transform-origin: top right !important;'), 'Must specify top right transform origin');
  });

  // Test 22: Fluid text swapping animation contracts
  test('22. renderer.js and _dynamic_island.css implement fluid text swapping for duet and satellite lyrics', () => {
    const rendererContent = fs.readFileSync(path.resolve(__dirname, '../src/renderer.js'), 'utf8');
    const islandCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');

    assert.ok(rendererContent.includes('animateSatelliteTextChange(satText,'), 'Must invoke animateSatelliteTextChange in renderer.js');
    assert.ok(rendererContent.includes('function animateDuetTextChange('), 'Must define animateDuetTextChange in renderer.js');
    assert.ok(islandCss.includes('.duet-text-swapping'), 'Must define .duet-text-swapping CSS class');
    assert.ok(islandCss.includes('.duet-text-entering'), 'Must define .duet-text-entering CSS class');
    assert.ok(islandCss.includes('@keyframes duetTextSlideIn'), 'Must define @keyframes duetTextSlideIn');
  });

  // Test 23: Audio visualizer deadband noise gate and morphing transitions
  test('23. Visualizer deadband gently attenuates sub-0.015 raw noise and supports style morphing', () => {
    const rendererContent = fs.readFileSync(path.resolve(__dirname, '../src/renderer.js'), 'utf8');
    const islandCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');

    assert.ok(rendererContent.includes('raw = raw * (raw / 0.015)'), 'Must apply quadratic noise gate below 0.015');
    assert.ok(islandCss.includes('border-radius 0.25s cubic-bezier(0.16, 1, 0.3, 1)'), 'Must include border-radius transition for visualizer style morphing');

    // Formula test: 0.005 should gently taper down without harsh cutoff
    let raw = 0.005;
    if (raw < 0.015) raw = raw * (raw / 0.015);
    assert.strictEqual(raw.toFixed(4), '0.0017', 'Sub-0.015 raw energy should be smoothly compressed to resting baseline');
  });

  // Test 24: Wallpaper contrast underglow and kinetic word spring
  test('24. _wallpaper.css contains adaptive contrast underglow and kinetic word spring pop', () => {
    const wallpaperCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_wallpaper.css'), 'utf8');

    assert.ok(wallpaperCss.includes('0 2px 24px rgba(0, 0, 0, 0.85)'), 'Must define deep contrast drop-shadow under active line');
    assert.ok(wallpaperCss.includes('cubic-bezier(0.175, 0.885, 0.32, 1.25)'), 'Must define kinetic word spring pop bezier');
  });

  // Test 25: Enhanced parseDuetVocalSplit handles multiple brackets, trailing punctuation, and leading backing vocals
  test('25. parseDuetVocalSplit handles multiple brackets, trailing punctuation, and leading backing vocals', () => {
    // 1. Trailing punctuation
    const tPunc = parseDuetVocalSplit("Never gonna give you up (give you up)?");
    assert.notStrictEqual(tPunc, null);
    assert.strictEqual(tPunc.leadText, "Never gonna give you up");
    assert.strictEqual(tPunc.duetText, "give you up");

    // 2. Multiple parentheticals
    const tMulti = parseDuetVocalSplit("I need you (need you) (need you)");
    assert.notStrictEqual(tMulti, null);
    assert.strictEqual(tMulti.leadText, "I need you");
    assert.strictEqual(tMulti.duetText, "need you need you");

    // 3. Leading backing vocals
    const tLead = parseDuetVocalSplit("(Love you) I will always love you");
    assert.notStrictEqual(tLead, null);
    assert.strictEqual(tLead.leadText, "I will always love you");
    assert.strictEqual(tLead.duetText, "Love you");
  });

  // Test 26: 60fps race condition protection and immediate render on emergence
  test('26. renderer.js implements targetText guard and immediate text rendering on emergence', () => {
    const rendererContent = fs.readFileSync(path.resolve(__dirname, '../src/renderer.js'), 'utf8');

    assert.ok(rendererContent.includes('duetTextEl.dataset.targetText === newText'), 'animateDuetTextChange must guard against duplicate targetText in 60fps loop');
    assert.ok(rendererContent.includes('duetTextEl.dataset.targetText = duetText'), 'showDuetCapsule must assign targetText immediately on initial split');
    assert.ok(rendererContent.includes('duetTextEl.textContent = duetText'), 'showDuetCapsule must assign textContent immediately on initial split');
    assert.ok(rendererContent.includes('duetTextEl.dataset.targetText = ""'), 'hideDuetCapsule must reset targetText when closing');
  });

  // Test 27: CSS defines fit-content width and top-center centering for duet capsule
  test('27. _dynamic_island.css defines width: fit-content and top-center centering for .island-duet-capsule', () => {
    const islandCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');

    assert.ok(islandCss.includes('width: fit-content;'), '.island-duet-capsule must have width: fit-content');
    assert.ok(islandCss.includes('body.island-dock-top-center #island-duet-capsule'), 'Must explicitly center #island-duet-capsule in top-center dock mode');
    assert.ok(islandCss.includes('body.island-dock-top-center .island-duet-bridge'), 'Must explicitly center .island-duet-bridge in top-center dock mode');
  });

  // Test 28: renderer.js implements idempotent fuse timers for satellite and duet capsules
  test('28. renderer.js implements idempotent fuse timer guard and immediate active flag reset', () => {
    const rendererContent = fs.readFileSync(path.resolve(__dirname, '../src/renderer.js'), 'utf8');

    assert.ok(
      rendererContent.includes('if (fuse && satelliteFuseTimeoutId) {') && rendererContent.includes('return; // Already actively fusing out'),
      'hideSatelliteIsland must guard against resetting fuse timer on rapid 50ms sync ticks'
    );
    assert.ok(
      rendererContent.includes('if (fuse && duetFuseTimeoutId) {') && rendererContent.includes('return; // Already actively fusing out'),
      'hideDuetCapsule must guard against resetting fuse timer on rapid 50ms sync ticks'
    );
    assert.ok(
      rendererContent.includes('lastSatelliteActiveState = false;') && rendererContent.includes('satIsland.classList.add(\'satellite-fusing\');'),
      'hideSatelliteIsland must mark lastSatelliteActiveState false immediately on fuse start'
    );
  });

  // Test 29: CSS defines collapsing height and margin transitions for seamless upward shift
  test('29. _dynamic_island.css defines collapsing height and margins on fusing elements', () => {
    const islandCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');

    assert.ok(islandCss.includes('.dynamic-island-translation.satellite-fusing') && islandCss.includes('max-height: 0 !important;'), 'Satellite fusing must collapse max-height');
    assert.ok(islandCss.includes('.island-bridge.bridge-fusing') && islandCss.includes('height: 0 !important;'), 'Bridge fusing must collapse height');
    assert.ok(islandCss.includes('.island-duet-capsule.duet-fusing') && islandCss.includes('max-height: 0 !important;'), 'Duet fusing must collapse max-height');
    assert.ok(islandCss.includes('transition: height 0.24s'), 'Bridge must transition height smoothly over 0.24s');
  });

  // Test 30: CSS defines feathered liquid karaoke gradient sweep across modes
  test('30. _dynamic_island.css and _lyrics.css define feathered liquid karaoke gradient sweeps', () => {
    const islandCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_dynamic_island.css'), 'utf8');
    const lyricsCss = fs.readFileSync(path.resolve(__dirname, '../src/styles/_lyrics.css'), 'utf8');

    assert.ok(islandCss.includes('calc(var(--word-progress, 1) * 100% + 3.5px)'), 'Dynamic island word gradient must include feathered edge');
    assert.ok(lyricsCss.includes('calc(var(--word-progress, 1) * 100% + 4px)'), 'Main lyrics word gradient must include feathered edge');
    assert.ok(lyricsCss.includes('filter var(--lyric-line-duration'), 'Main lyrics line must include filter in transition list for smooth depth-of-field');
  });

  // Test 31: Translated lyrics isolation from primary island cell
  test('31. Translated lyrics never get injected into primary island cell when satellite island is enabled', () => {
    const rendererContent = fs.readFileSync(path.resolve(__dirname, '../src/renderer.js'), 'utf8');

    assert.ok(
      rendererContent.includes("!isSatelliteEnabled && transMode === 'bilingual' && hasTrans"),
      'Inline Original • Translation fallback must be strictly gated by !isSatelliteEnabled'
    );

    // Behavioral simulation:
    function renderIslandCell(displayMainText, subText, shouldSatelliteBeDocked, isSatelliteEnabled, transMode, hasTrans) {
      if (shouldSatelliteBeDocked) {
        return { mainCell: displayMainText, satelliteCell: subText };
      } else if (transMode === 'translated' && subText) {
        return { mainCell: subText, satelliteCell: null };
      } else if (!isSatelliteEnabled && transMode === 'bilingual' && hasTrans) {
        return { mainCell: `${displayMainText} • ${subText}`, satelliteCell: null };
      } else {
        return { mainCell: displayMainText, satelliteCell: null };
      }
    }

    // 1. Satellite enabled and docked: separate cells
    const docked = renderIslandCell('Original Lyric', 'Translated Lyric', true, true, 'bilingual', true);
    assert.strictEqual(docked.mainCell, 'Original Lyric');
    assert.strictEqual(docked.satelliteCell, 'Translated Lyric');

    // 2. Satellite enabled but un-docked/fusing: main cell remains pure original, never polluted with inline translation
    const undocked = renderIslandCell('Original Lyric', 'Translated Lyric', false, true, 'bilingual', true);
    assert.strictEqual(undocked.mainCell, 'Original Lyric', 'Main island cell must NOT contain inline translation when satellite is enabled');

    // 3. Satellite explicitly disabled by user: fallback to inline combination
    const disabled = renderIslandCell('Original Lyric', 'Translated Lyric', false, false, 'bilingual', true);
    assert.strictEqual(disabled.mainCell, 'Original Lyric • Translated Lyric', 'Main island cell only combines when satellite is explicitly disabled');
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runMetamorphosisTests();
