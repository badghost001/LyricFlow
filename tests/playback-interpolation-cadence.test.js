const assert = require('assert');
const fs = require('fs');
const path = require('path');

const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
const start = renderer.indexOf('function schedulePlaybackInterpolation()');
const end = renderer.indexOf('\nfunction ensurePlayheadLoop()', start);
const interpolation = renderer.slice(start, end);
const stopStart = renderer.indexOf('function stopPlaybackInterpolation()');
const stopEnd = renderer.indexOf('\nfunction setMainProgressFill', stopStart);
const stop = renderer.slice(stopStart, stopEnd);

assert(start >= 0 && end > start, 'playback interpolation scheduler must exist');
assert.match(renderer, /const PLAYHEAD_FRAME_INTERVAL_MS = 33;/,
  'word-fill interpolation should use the existing 30 Hz cadence');
assert.match(renderer, /const PLAYBACK_STATE_SYNC_INTERVAL_MS = 125;/,
  'full lyric/layout reconciliation should use the slightly reduced 8 Hz cycle');
assert.match(interpolation, /playbackInterpolationTimerId = setTimeout\([\s\S]*?PLAYHEAD_FRAME_INTERVAL_MS\)/,
  'interpolation must wait between RAF callbacks instead of polling every display frame');
assert.doesNotMatch(interpolation, /playbackInterpolationRafId = requestAnimationFrame\(frame\);\s*\};/,
  'the active render loop must not enqueue itself at the display refresh rate');
assert.match(interpolation, /playbackInterpolationTimerId !== null/,
  'scheduler must avoid duplicate interpolation timers');
assert.match(stop, /clearTimeout\(playbackInterpolationTimerId\)/,
  'stopping interpolation must cancel the pending cadence timer');

console.log('Playback interpolation cadence regression test passed.');
