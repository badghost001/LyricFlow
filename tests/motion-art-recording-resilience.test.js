/**
 * tests/motion-art-recording-resilience.test.js
 * Verification of motion artwork resilience during screen recording and background capture.
 * Ensures tall motion artwork, ambilight glow, and playback tickers do NOT freeze or pause
 * when Windows screen recording overlays, OBS, or Snipping Tool trigger document.visibilityState = 'hidden'.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const srcDir = path.join(__dirname, '..', 'src');
const rendererJs = fs.readFileSync(path.join(srcDir, 'renderer.js'), 'utf8');

console.log('\n--- Running Motion Art Recording Resilience Regression Suite ---\n');

// 1. isMotionVideoSurfaceActive check
console.log('1. Surface Active State During Background Capture:');
const activeSurfaceBody = rendererJs.match(/function isMotionVideoSurfaceActive\(videoEl\)\s*\{([\s\S]*?)\n\}/)?.[1] || '';
assert.match(activeSurfaceBody, /const isPlaybackActive = Boolean\(isPlaying\);/,
  'the current playback state must be authoritative for motion-art activity');
assert.match(activeSurfaceBody, /if \(!isPlaybackActive\) return false;/,
  'motion artwork must stop when playback is actually paused');
assert.doesNotMatch(activeSurfaceBody, /document\.visibilityState|document\.hidden|isWallpaperDesktopFocused|window-blurred/,
  'focus, desktop ownership, and document visibility must not stop motion art during active playback');
console.log('  ✓ Video surface remains active during active playback even under document.visibilityState = "hidden"');

// 1b. Focus restoration must clear a temporary square-stream fallback.
assert.match(
  rendererJs,
  /function resumeAnimatedArtVideos\(\)\s*\{[\s\S]*?videoEl\._motionSquareFallbackTrack = null;[\s\S]*?syncSplitTallArtworkAvailability\(\);[\s\S]*?syncActiveAnimatedVideoState\(\);/,
  'resumeAnimatedArtVideos must clear a transient square fallback and reselect supported tall artwork'
);
assert.match(
  rendererJs,
  /window\.addEventListener\('focus',[\s\S]*?resumeAnimatedArtVideos\(\);/,
  'window focus must run the full motion-art resume path'
);
console.log('  ✓ Focus restoration retries the preferred tall artwork instead of keeping a square fallback');

assert.match(
  rendererJs,
  /function scheduleMotionVideoRecovery\(videoEl, \{[^}]*replacePending = false[\s\S]*?if \(videoEl\._motionRecoveryTimer\) \{\s*if \(!replacePending\) return;\s*clearTimeout\(videoEl\._motionRecoveryTimer\);/,
  'focus recovery must be able to replace an existing delayed watchdog retry'
);
assert.match(
  rendererJs,
  /scheduleMotionVideoRecovery\(video, \{ delayMs: 0, reload: true, fallbackToSquare: false, replacePending: true \}\)/,
  'a motion video with a frozen frame after focus must trigger an immediate decoder restart'
);

// 2. startMotionArtVideo check
console.log('\n2. Motion Video Start and Playback Gating:');
const startMotionVideoBody = rendererJs.match(/function startMotionArtVideo\(videoEl, sourceUrl\)\s*\{([\s\S]*?)\n\}/)?.[1] || '';
assert.match(startMotionVideoBody, /!isMotionVideoSurfaceActive\(videoEl\)/,
  'startMotionArtVideo must use the shared playback and surface-activity gate');
assert.ok(startMotionVideoBody.indexOf('!isMotionVideoSurfaceActive(videoEl)') < startMotionVideoBody.indexOf('videoEl.src = sourceUrl'),
  'inactive surfaces must be rejected before attaching a source or starting its decoder');
console.log('  ✓ startMotionArtVideo does not pause or block video playback during active audio playback');

// 2b. Paused playback must suspend inline motion-video decoding without unloading its last frame.
console.log('\n2b. Motion Video Idle Suspension:');
assert.match(
  activeSurfaceBody,
  /if\s*\(!isPlaybackActive\)\s*return false;/,
  'Motion surfaces must be inactive when playback is paused, including Island and Wallpaper modes'
);
const startVideoBody = rendererJs.match(/function startMotionArtVideo\(videoEl, sourceUrl\)\s*\{([\s\S]*?)\n\}/)?.[1] || '';
const pauseGateIndex = startVideoBody.indexOf('!isMotionVideoSurfaceActive(videoEl)');
const sourceAssignmentIndex = startVideoBody.indexOf('videoEl.src = sourceUrl');
assert.ok(pauseGateIndex >= 0 && pauseGateIndex < sourceAssignmentIndex,
  'Paused playback must not initialize a new inline video decoder');
assert.match(
  rendererJs,
  /function pauseAnimatedArtVideosForPlaybackStop\(\)\s*\{[\s\S]*?videoEl\.pause\(\);[\s\S]*?\n\}/,
  'Playback pause must pause inline videos while retaining their source and last frame'
);
assert.doesNotMatch(
  rendererJs.match(/function pauseAnimatedArtVideosForPlaybackStop\(\)\s*\{([\s\S]*?)\n\}/)?.[1] || '',
  /removeAttribute\(['"]src['"]\)|unbindVideoSurface\(/,
  'Playback pause must preserve the decoded frame rather than unload the surface'
);
assert.match(
  rendererJs,
  /function handleLocalOrPollPause\(reportedPos\)\s*\{[\s\S]*?classList\.toggle\('is-playing', false\);[\s\S]*?pauseAnimatedArtVideosForPlaybackStop\(\);/,
  'The direct SMTC pause path must suspend motion after clearing the active-playback class'
);
assert.match(
  rendererJs,
  /document\.body\.classList\.toggle\('is-playing', isCurrentlyPlaying\);\s*document\.body\.classList\.toggle\('app-paused', !isCurrentlyPlaying\);\s*if \(wasPlaying !== isCurrentlyPlaying\)\s*\{\s*if \(isCurrentlyPlaying(?: && !isNewTrack)?\)\s*\{[\s\S]*?resumeAnimatedArtVideos\(\);[\s\S]*?\}\s*else if \(!isCurrentlyPlaying\)\s*\{\s*pauseAnimatedArtVideosForPlaybackStop\(\);/,
  'The regular playback-data pause path must also suspend motion videos'
);
assert.match(
  rendererJs,
  /if \(data\.isPlaying\)\s*\{[\s\S]*?resumeAnimatedArtVideos\(\);/,
  'The direct SMTC resume path must restart the current motion-art surface'
);
console.log('  ✓ Paused playback releases video decoding and resume restores the same motion surface');

// 3. Continuity Watchdog check
console.log('\n3. Continuous Playback Watchdog Resilience:');
assert.ok(
  !rendererJs.includes("window._motionContinuityWatchdog = setInterval(() => {\r\n    try {\r\n      if (document.hidden) return;") &&
  !rendererJs.includes("window._motionContinuityWatchdog = setInterval(() => {\n    try {\n      if (document.hidden) return;"),
  '_motionContinuityWatchdog must not bail out early when document.hidden is true'
);
assert.ok(
  rendererJs.includes("window._motionContinuityWatchdog = setInterval(() => {") &&
  rendererJs.includes("const isPlaybackActive = Boolean(isPlaying);"),
  '_motionContinuityWatchdog must check isPlaybackActive and continue monitoring during screen recording'
);
console.log('  ✓ Watchdog continues watching and resuming paused video during screen capture');

// 4. visibilitychange Event Listener check
console.log('\n4. Visibility Change Event Handling:');
const visibilityHandlers = [...rendererJs.matchAll(/document\.addEventListener\(["']visibilitychange["'],\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\}\);/g)];
const motionVisibilityHandler = visibilityHandlers.find(match => match[1].includes('pauseAnimatedArtVideos();'))?.[1] || '';
assert.match(motionVisibilityHandler, /const isPlaybackActive = Boolean\(isPlaying\);/,
  'visibility recovery must use playback state rather than a stale CSS playing class');
assert.match(motionVisibilityHandler, /if \(!isPlaybackActive[\s\S]*?pauseAnimatedArtVideos\(\);/,
  'visibilitychange must not pause motion art during active playback');
console.log('  ✓ pauseAnimatedArtVideos() is suppressed during active playback on visibilitychange');

// 5. VideoFrameAmbilightSampler check
console.log('\n5. Ambilight Sampler Continuity:');
assert.ok(
  rendererJs.includes("if (typeof document !== 'undefined' && document.hidden && !isPlaybackActive) return;"),
  'VideoFrameAmbilightSampler must continue sampling while isPlaybackActive is true'
);
console.log('  ✓ Ambilight sampler continues updating glow during recording');

// 6. Playhead Timer Ticking Smoothness
console.log('\n6. Playhead Ticker Smoothness:');
assert.ok(
  rendererJs.includes("playheadTimerId = setTimeout(updatePlayhead, requiresHighFreqTick ? 25 : PLAYHEAD_FRAME_INTERVAL_MS);"),
  'updatePlayhead must tick at PLAYHEAD_FRAME_INTERVAL_MS rather than throttling to 500ms during playback'
);
console.log('  ✓ updatePlayhead maintains smooth 30 FPS timer during screen recording');

// 7. Wallpaper Mode Tall Artwork Resilience During Recording
console.log('\n7. Wallpaper Mode Tall Artwork Resilience During Recording:');
assert.match(activeSurfaceBody, /case 'wallpaper-style-art-video': return settings\.wallpaperMode && wallpaperStyle === 'style2';/,
  'wallpaper motion-art eligibility must not depend on desktop focus during active playback');
console.log('  ✓ Wallpaper video surface remains active during screen recording when playback is active');

assert.match(
  rendererJs,
  /window\.electronAPI\.onWallpaperFocusChanged\(\(isFocused\) => \{[\s\S]*?if \(!isWallpaperDesktopFocused\) \{[\s\S]*?const isPlaybackActive = Boolean\(isPlaying[\s\S]*?if \(!isPlaybackActive\) \{[\s\S]*?pauseAnimatedArtVideos\(\);/,
  'onWallpaperFocusChanged must NOT pause animated art videos during active playback'
);
console.log('  ✓ onWallpaperFocusChanged preserves tall motion artwork during active recording');

assert.match(
  rendererJs,
  /window\.electronAPI\.onWallpaperFocusChanged\(\(isFocused\) => \{[\s\S]*?\} else \{[\s\S]*?resumeAnimatedArtVideos\(\);[\s\S]*?scheduleMotionArtFocusRecovery\(\);/,
  'onWallpaperFocusChanged must invoke resumeAnimatedArtVideos and scheduleMotionArtFocusRecovery when desktop focus returns'
);
console.log('  ✓ onWallpaperFocusChanged properly recovers motion loops on focus restoration');

assert.match(
  rendererJs,
  /window\._motionContinuityWatchdog = setInterval\(\(\) => \{[\s\S]*?if \(settings\.wallpaperMode\) \{[\s\S]*?wallpaperStyle === 'style2'[\s\S]*?wallpaperStyleArtVideo[\s\S]*?wallpaperAlbumBgVideo/,
  '_motionContinuityWatchdog must monitor wallpaperStyleArtVideo and wallpaperAlbumBgVideo'
);
console.log('  ✓ _motionContinuityWatchdog actively checks and recovers wallpaper motion artwork');

console.log('\n--- ALL MOTION ART RECORDING RESILIENCE TESTS PASSED (100% GREEN) ---\n');
