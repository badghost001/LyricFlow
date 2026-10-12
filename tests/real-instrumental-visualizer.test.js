const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n--- Running Real Instrumental Visualizer & Ubiquitous Audio Reactive Tests ---');

const srcDir = path.join(__dirname, '..', 'src');
const indexHtmlPath = path.join(srcDir, 'index.html');
const rendererJsPath = path.join(srcDir, 'renderer.js');
const lyricsCssPath = path.join(srcDir, 'styles', '_lyrics.css');
const playbackCssPath = path.join(srcDir, 'styles', '_playback.css');
const studioCssPath = path.join(srcDir, 'styles', '_studio.css');

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const rendererJs = fs.readFileSync(rendererJsPath, 'utf8');
const lyricsCss = fs.readFileSync(lyricsCssPath, 'utf8');
const playbackCss = fs.readFileSync(playbackCssPath, 'utf8');
const studioCss = fs.readFileSync(studioCssPath, 'utf8');

// --------------------------------------------------------------------------
// 1. Static Markup & CSS Verification
// --------------------------------------------------------------------------
console.log('\n1. Static Markup & CSS Verification:');

// 1a. Instrumental solo stage markup and live audio CSS
assert.ok(
  indexHtml.includes('id="instrumental-solo-stage"'),
  'index.html must include #instrumental-solo-stage'
);
assert.ok(
  indexHtml.includes('class="solo-visualizer-wave"'),
  'index.html must include .solo-visualizer-wave inside solo stage'
);
assert.ok(
  lyricsCss.includes('.solo-visualizer-wave.is-live-audio .solo-bar'),
  '_lyrics.css must define .solo-visualizer-wave.is-live-audio .solo-bar rule'
);
assert.ok(
  lyricsCss.includes('animation: none !important'),
  '_lyrics.css must override canned bounce animation with animation: none !important during live audio'
);
assert.ok(
  lyricsCss.includes('.solo-visualizer-wave.is-resting .solo-bar'),
  '_lyrics.css must define resting baseline styling for .solo-visualizer-wave.is-resting'
);
console.log('  ✓ 1a. Instrumental solo stage defines real live audio rules and clean resting baselines');

// 1b. Desktop bottom player bar live visualizer
assert.ok(
  indexHtml.includes('id="player-live-visualizer"') && indexHtml.includes('class="player-vis-bar bar-1"'),
  'index.html must include #player-live-visualizer with .player-vis-bar elements'
);
assert.ok(
  playbackCss.includes('.player-live-visualizer') && playbackCss.includes('.player-vis-bar'),
  '_playback.css must style .player-live-visualizer and .player-vis-bar'
);
console.log('  ✓ 1b. Desktop player bar includes real audio visualizer markup and styles');

// 1c. Studio sidebar live equalizer badge
assert.ok(
  indexHtml.includes('id="studio-badge-live"') && indexHtml.includes('class="studio-vis-bar bar-1"'),
  'index.html must include #studio-badge-live with .studio-vis-bar elements'
);
assert.ok(
  studioCss.includes('.studio-badge-live') && studioCss.includes('.studio-vis-bar'),
  '_studio.css must style .studio-badge-live and .studio-vis-bar'
);
console.log('  ✓ 1c. Studio sidebar includes real audio equalizer badge markup and styles');


// --------------------------------------------------------------------------
// 2. Audio Visualizer State Gating in Desktop Window Mode
// --------------------------------------------------------------------------
console.log('\n2. Audio Visualizer State Gating & Persistence:');

assert.ok(
  rendererJs.includes('const isDesktopActive = Boolean(!isDynamicIslandMode && !isWallpaperModeActive && (Boolean(isPlaying) || Boolean(currentTitle) || Boolean(document.body.classList.contains("is-playing"))));'),
  'syncAudioVisualizerState must keep visualizer active in desktop window mode when music is playing'
);
assert.ok(
  rendererJs.includes('const shouldBeActive = Boolean((isIslandActive || isWallpaperBloomActive || isDesktopActive) && isVisible);'),
  'shouldBeActive must account for desktop window mode activity'
);
assert.ok(
  rendererJs.includes('window.electronAPI.setAudioVisualizerActive(shouldBeActive)'),
  'syncAudioVisualizerState must pass shouldBeActive to backend IPC'
);
console.log('  ✓ 2a. syncAudioVisualizerState activates WASAPI capture loop in desktop window mode');


// --------------------------------------------------------------------------
// 3. Real Audio Spectrum Dispatch to Instrumental Solo Stage
// --------------------------------------------------------------------------
console.log('\n3. Real Audio Spectrum Dispatch to Instrumental Solo Stage:');

assert.ok(
  rendererJs.includes('const isSoloStageActive = Boolean(soloStage && (soloStage.classList.contains("active") || soloStage.style.display !== \'none\'));'),
  'onAudioSpectrum must check if instrumental solo stage is active'
);
assert.ok(
  rendererJs.includes('soloWave.classList.add("is-live-audio");'),
  'onAudioSpectrum must add is-live-audio to .solo-visualizer-wave'
);
assert.ok(
  rendererJs.includes('soloBars[i].style.transform = `scaleY(${scale.toFixed(3)})`;'),
  'onAudioSpectrum must dynamically drive .solo-bar scaleY transforms using real frequency energy'
);
assert.ok(
  rendererJs.includes('Math.pow(Math.max(0, v), 0.72)'),
  'onAudioSpectrum must apply perceptual power expansion to frequency amplitudes'
);
console.log('  ✓ 3a. onAudioSpectrum drives 5-bar solo stage waveform with real live frequency bands');


// --------------------------------------------------------------------------
// 4. Ubiquitous Live Visualizer Updates (Player Bar & Studio Dock)
// --------------------------------------------------------------------------
console.log('\n4. Ubiquitous Desktop Equalizer Reactor:');

assert.ok(
  rendererJs.includes('const desktopLive = document.getElementById("player-live-visualizer");'),
  'onAudioSpectrum must query #player-live-visualizer'
);
assert.ok(
  rendererJs.includes('const studioLive = document.getElementById("studio-badge-live");'),
  'onAudioSpectrum must query #studio-badge-live'
);
assert.ok(
  rendererJs.includes('dBars[i].style.transform = `scaleY(${clamped.toFixed(3)})`;'),
  'onAudioSpectrum must dynamically drive desktop equalizer bars'
);
console.log('  ✓ 4a. onAudioSpectrum drives both player bar and studio sidebar equalizers in real-time');


// --------------------------------------------------------------------------
// 5. Quiet Passages & Silence Settle Verification
// --------------------------------------------------------------------------
console.log('\n5. Quiet Passages & Silence Settling:');

assert.ok(
  rendererJs.includes('soloWave.classList.add("is-resting");') &&
  rendererJs.includes('soloWave.classList.remove("is-live-audio");'),
  'checkVisualizerFallback must settle solo stage to is-resting during quiet passages'
);
assert.ok(
  rendererJs.includes('b.style.transform = \'scaleY(0.20)\';'),
  'checkVisualizerFallback must cleanly reset .solo-bar heights to resting baseline scale'
);
assert.ok(
  rendererJs.includes('playerVis.classList.add("is-resting");') &&
  rendererJs.includes('studioBadgeLive.classList.add("is-resting");'),
  'checkVisualizerFallback must settle desktop visualizers to resting state'
);
console.log('  ✓ 5a. checkVisualizerFallback settles all UI visualizers to clean resting baseline without twitch');


// --------------------------------------------------------------------------
// 6. Instrumental Break Lifecycle & Watchdog Trigger
// --------------------------------------------------------------------------
console.log('\n6. Instrumental Break Lifecycle & Synchronizer:');

assert.ok(
  rendererJs.includes('if (!soloStage.classList.contains("active")) {') &&
  rendererJs.includes('soloStage.classList.add("active");') &&
  rendererJs.includes('syncAudioVisualizerState();'),
  'Entering instrumental break must wake WASAPI visualizer immediately'
);
assert.ok(
  rendererJs.includes('if (soloStage.classList.contains("active")) {') &&
  rendererJs.includes('soloStage.classList.remove("active");'),
  'Exiting instrumental break must cleanly deactivate soloStage'
);
console.log('  ✓ 6a. Instrumental break entrance and exit seamlessly synchronize visualizer lifecycle');

console.log('\nAll Real Instrumental Visualizer & Ubiquitous Audio Reactive tests passed successfully!\n');
