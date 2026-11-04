const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const loginCss = fs.readFileSync(path.join(root, 'src', 'styles', '_login.css'), 'utf8');
const studioCss = fs.readFileSync(path.join(root, 'src', 'styles', '_studio.css'), 'utf8');
const splitArtCss = fs.readFileSync(path.join(root, 'src', 'styles', '_studio_split_art.css'), 'utf8');

function requireMatch(source, pattern, message) {
  assert.match(source, pattern, message);
}

console.log('\n--- Motion Artwork Stability and Setup UI Regression Suite ---');

// Loop callbacks must never restart a decorative video after audio playback stops.
const timeUpdate = renderer.match(/videoEl\.addEventListener\('timeupdate', \(\) => \{([\s\S]*?)\n  \}\);/)?.[1] || '';
const ended = renderer.match(/videoEl\.addEventListener\('ended', \(\) => \{([\s\S]*?)\n  \}\);/)?.[1] || '';
requireMatch(timeUpdate, /isMotionVideoSurfaceActive\(videoEl\)/,
  'timeupdate loop must check that its surface is still active before rewinding or replaying');
requireMatch(ended, /isMotionVideoSurfaceActive\(videoEl\)/,
  'ended loop must check that playback still expects motion before replaying');

// Async playlist resolution and canplay events must not attach stale streams after a track/mode change.
const startVideo = renderer.match(/function startMotionArtVideo\(videoEl, sourceUrl\) \{([\s\S]*?)\n\}/)?.[1] || '';
requireMatch(startVideo, /_motionStartGeneration/,
  'each video source request must invalidate older asynchronous source requests');
requireMatch(startVideo, /currentAnimatedArtInfo === requestedArtInfo/,
  'an old track’s playlist resolution must be rejected after the active artwork changes');
requireMatch(startVideo, /!isMotionVideoSurfaceActive\(videoEl\)/,
  'inactive video surfaces must not start after an async callback completes');
requireMatch(startVideo, /videoEl\._motionRequestedUrl === sourceUrl/,
  'canplay callbacks must belong to the currently requested stream');

const unbind = renderer.match(/function unbindVideoSurface\(videoEl\) \{([\s\S]*?)\n\}/)?.[1] || '';
requireMatch(unbind, /_motionStartGeneration/,
  'unbinding a surface must cancel any pending asynchronous source start');

const pauseRecovery = renderer.match(/function bindMotionContinuityListeners\(videoEl\) \{([\s\S]*?)\n\}/)?.[1] || '';
requireMatch(pauseRecovery, /_motionSourcePending[\s\S]*?scheduleMotionVideoRecovery\(videoEl, \{ delayMs: 120 \}\)/,
  'focus-related decoder pauses must recover quickly without racing source loads or genuine playback pauses');
requireMatch(startVideo, /removeAttribute\('autoplay'\)/,
  'motion art must use explicit playback intent so a browser cannot autoplay a stale surface');

// User playback actions should synchronously pause or resume motion art with audio state.
const controlPlayback = renderer.match(/async function controlPlayback\(action, _retried = false\) \{([\s\S]*?)\n\s*\/\/ Spotify Soloist/)?.[1] || '';
requireMatch(controlPlayback, /isPlaying = false;[\s\S]*?pauseAnimatedArtVideosForPlaybackStop\(\)/,
  'optimistic pause must stop motion-art playback immediately');
requireMatch(controlPlayback, /isPlaying = true;[\s\S]*?resumeAnimatedArtVideos\(\)/,
  'optimistic resume must restore the active motion-art surface immediately');

// Small setup windows need readable source choices and tips instead of compressed two-column cards.
requireMatch(html, /class="onboarding-source-grid"/,
  'the music-source cards need a named responsive layout container');
requireMatch(html, /class="onboarding-tips-grid"/,
  'the setup tips need a named responsive layout container');
requireMatch(loginCss, /@media \(max-width: 620px\)[\s\S]*?\.onboarding-source-grid[\s\S]*?flex-direction:\s*column/,
  'music-source cards must stack on narrow setup windows');
requireMatch(loginCss, /@media \(max-width: 620px\)[\s\S]*?\.onboarding-tips-grid[\s\S]*?grid-template-columns:\s*1fr/,
  'setup tips must stack on narrow windows');
requireMatch(html, /class="onboarding-mode-preview-video"[^>]*preload="none"[^>]*data-preview-src=/,
  'mode preview videos must stay unloaded until the user selects a preview');
requireMatch(html, /id="ob-card-standard"[^>]*aria-pressed="true"/,
  'mode cards must expose their selected state to assistive technology');
requireMatch(renderer, /function playOnboardingModePreview\(/,
  'onboarding should load a mode recording only after the user selects its card');
requireMatch(renderer, /function stopOnboardingModePreview\(/,
  'onboarding should release the demo decoder when leaving the mode selection page');
requireMatch(renderer, /onplaying = \(\) => video\.closest\('\.onboarding-mode-preview-frame'\)\?\.classList\.add\('is-playing'\)/,
  'the selected onboarding demo should reveal its video layer only after playback begins');
requireMatch(loginCss, /\.onboarding-mode-preview-frame\.is-playing \.onboarding-mode-preview-video\s*\{\s*opacity: 1;/,
  'onboarding video layers must fade over their poster only while the selected demo is playing');
requireMatch(splitArtCss, /body\.layout-split:not\(\.wallpaper-mode\):not\(\.mode-dynamic-island\):not\(\.taskbar-mode\):not\(\.cinematic-view-active\) #screen-lyrics #studio-sidebar \.studio-art-container\s*\{[\s\S]*?top: clamp\(24px, 8vh, 76px\) !important;/,
  'regular split-view album art must use its independent upper-stage anchor');
requireMatch(splitArtCss, /body\.layout-split:not\(\.wallpaper-mode\):not\(\.mode-dynamic-island\):not\(\.taskbar-mode\):not\(\.cinematic-view-active\) #screen-lyrics #studio-sidebar > \.studio-track-meta\s*\{[\s\S]*?bottom: 8px !important;/,
  'track details must keep their own fixed anchor near the progress area');
requireMatch(splitArtCss, /body\.layout-split:not\(\.split-tall-art\):not\(\.has-animated-art-video\):not\(\.has-motion-tall-art\):is\(\.auto-hide-controls, \.auto-hide-collapsed, \.auto-hide-faded\)[\s\S]*?width: min\(100%, clamp\(190px, 40vh, 360px\)\) !important;/,
  'auto-hide must enlarge square artwork without moving the track-details rail');

// Resource-heavy settings should describe CPU and memory costs beneath their controls.
const performanceNotes = html.match(/<small class="setting-performance-note">[\s\S]*?<\/small>/g) || [];
assert.ok(performanceNotes.some(note => /CPU/i.test(note) && /RAM|memory/i.test(note)),
  'at least one performance note must explicitly describe CPU and RAM usage');
requireMatch(html, /id="check-motion-art"[\s\S]*?<small class="setting-performance-note">[\s\S]*?(?:CPU|RAM|memory)/i,
  'motion artwork must explain its CPU/RAM cost directly below the toggle');
requireMatch(html, /id="check-motion-dust"[\s\S]*?<small class="setting-performance-note">[\s\S]*?(?:CPU|RAM|memory)/i,
  'motion dust must explain its CPU/RAM cost directly below the toggle');
requireMatch(html, /id="check-motion-visualizer"[\s\S]*?<small class="setting-performance-note">[\s\S]*?(?:CPU|RAM|memory)/i,
  'the Island visualizer must explain its CPU/RAM cost directly below the toggle');

const demoDir = path.join(root, 'src', 'assets', 'onboarding', 'demos');
for (const demo of ['standard-overlay.mp4', 'taskbar-mode.mp4', 'wallpaper-mode.mp4', 'dynamic-island.mp4']) {
  const demoPath = path.join(demoDir, demo);
  assert.ok(fs.existsSync(demoPath), `onboarding demo clip ${demo} must exist`);
  assert.ok(fs.statSync(demoPath).size < 150_000, `${demo} must be compressed to avoid setup-screen loading lag`);
}

console.log('  ✓ motion loops respect playback state and active stream generations');
console.log('  ✓ setup wizard layout has narrow-window safeguards');
console.log('  ✓ resource-heavy setting notes name CPU and RAM costs');
