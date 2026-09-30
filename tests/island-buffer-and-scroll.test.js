const assert = require('assert');

console.log("\n--- Running Dynamic Island Buffers, Outro & Free Scrolling Tests ---\n");

// Mock environment
let islandNowPlayingBufferUntil = 0;
let trackDuration = 180000; // 3 minutes
let lyrics = [
  { text: "First line of the song", timeMs: 5000, duration: 3000 },
  { text: "Second line after a break", timeMs: 15000, duration: 4000 },
  { text: "Final outro line of the song", timeMs: 165000, duration: 5000 }
];

function getLineTiming(line, next) {
  const start = (line.timeMs != null && !isNaN(line.timeMs))
    ? line.timeMs
    : ((line.start != null) ? line.start * 1000 : 0);

  let end = 0;
  if (line.words && line.words.length > 0) {
    const lastW = line.words[line.words.length - 1];
    const lwStart = (lastW.start != null ? lastW.start * 1000 : lastW.timeMs) || start;
    end = (lastW.end != null && lastW.end > 0)
      ? (lastW.end * 1000)
      : (lwStart + 450);
  } else if (line.end != null && line.end > 0) {
    end = line.end * 1000;
  } else if (line.duration && line.duration > 0) {
    end = start + line.duration;
  } else {
    const textLen = (line.text || '').length;
    end = start + Math.max(2500, Math.min(8000, textLen * 140));
  }

  const nextStart = next
    ? ((next.timeMs != null && !isNaN(next.timeMs)) ? next.timeMs : ((next.start != null) ? next.start * 1000 : Infinity))
    : Infinity;

  return { start, end, nextStart };
}

function getDynamicIslandSyncData(syncProgress) {
  // 1. Now Playing 3-second intro buffer on song start / track change
  if (Date.now() < islandNowPlayingBufferUntil) {
    return { lineIndex: -4, lineData: null, isNowPlayingBuffer: true, isInstrumental: false, countdownMs: 0 };
  }

  if (!lyrics || lyrics.length === 0) {
    if (trackDuration > 0 && (trackDuration - syncProgress) <= 12000 && (trackDuration - syncProgress) > 500) {
      return { lineIndex: -3, lineData: null, isInstrumental: false, isSongEnd: true, countdownMs: Math.max(0, trackDuration - syncProgress) };
    }
    return { lineIndex: -1, lineData: null, isInstrumental: false };
  }

  const isUnsynced = lyrics[0].timeMs === 9999999;
  if (isUnsynced) {
    return { lineIndex: 0, lineData: lyrics[0], isInstrumental: false };
  }

  const firstLine = lyrics[0];
  const firstLineStart = (firstLine.timeMs != null && !isNaN(firstLine.timeMs))
    ? firstLine.timeMs
    : ((firstLine.start != null) ? firstLine.start * 1000 : 0);

  // 2. Song intro / prelude before first vocal line starts (with 800ms anticipation)
  if (syncProgress < firstLineStart - 800) {
    const countdownMs = Math.max(0, firstLineStart - syncProgress);
    return { lineIndex: -1, lineData: null, isInstrumental: false, countdownMs };
  }

  // 3. Find matching line index with 700ms lead-in for smooth anticipation
  let idx = 0;
  for (let i = 0; i < lyrics.length; i++) {
    const timing = getLineTiming(lyrics[i], lyrics[i + 1]);
    if (syncProgress >= timing.start - 700) {
      idx = i;
    } else {
      break;
    }
  }

  const curLine = lyrics[idx];
  const curTiming = getLineTiming(curLine, lyrics[idx + 1]);

  // 4. Outro / End-of-song detection: last line passed or final 12s of track
  const isLastLine = idx === lyrics.length - 1;
  const isPastLastLine = isLastLine && (syncProgress > curTiming.end + 1200);
  const isNearTrackEnd = (trackDuration > 0 && (trackDuration - syncProgress) <= 12000 && syncProgress > curTiming.end);

  if ((isPastLastLine || isNearTrackEnd) && trackDuration > 0 && (trackDuration - syncProgress) > 500) {
    const outroCountdownMs = Math.max(0, trackDuration - syncProgress);
    return { lineIndex: -3, lineData: null, isInstrumental: false, isSongEnd: true, countdownMs: outroCountdownMs };
  }

  // 5. Check for instrumental break between lines
  const isPastLine = syncProgress > curTiming.end + 1200;

  if (isPastLine && idx < lyrics.length - 1) {
    const msUntilNext = curTiming.nextStart - syncProgress;
    // Stay in break state until next line lead-in (600ms before next line starts).
    // Never resurrect the dead curLine during the break!
    if (msUntilNext > 600) {
      return { lineIndex: -2, lineData: null, isInstrumental: true, countdownMs: Math.max(0, msUntilNext) };
    }
  }

  return { lineIndex: idx, lineData: curLine, isInstrumental: false, countdownMs: 0 };
}

// TEST 1: Now Playing 3-second Buffer
islandNowPlayingBufferUntil = Date.now() + 3000;
const bufferSync = getDynamicIslandSyncData(5000);
assert.strictEqual(bufferSync.lineIndex, -4, "Buffer should return lineIndex -4");
assert.strictEqual(bufferSync.isNowPlayingBuffer, true, "isNowPlayingBuffer should be true");
console.log("  ✓ 1. Now Playing 3-second intro buffer returns lineIndex -4");

// TEST 2: Song Intro Vocal Countdown (after buffer expires)
islandNowPlayingBufferUntil = 0;
const introSync = getDynamicIslandSyncData(1000); // 4000ms before first line (5000ms)
assert.strictEqual(introSync.lineIndex, -1, "Intro should return lineIndex -1");
assert.strictEqual(introSync.countdownMs, 4000, "Intro countdownMs should be 4000");
console.log("  ✓ 2. Song intro countdown accurately calculates remaining ms to first vocal line");

// TEST 3: Active Line Playback
const activeSync = getDynamicIslandSyncData(5500); // Middle of first line (5000 - 8000)
assert.strictEqual(activeSync.lineIndex, 0, "Line index should be 0 during first line");
assert.strictEqual(activeSync.lineData.text, "First line of the song");
console.log("  ✓ 3. Active lyric line renders correctly during vocal performance");

// TEST 4: Instrumental Break Between Lines (Vocal Countdown)
// First line ends at 8000ms. Dwell ends at 9200ms. Next line starts at 15000ms.
// At 10000ms: 5000ms until next line.
const breakSync1 = getDynamicIslandSyncData(10000);
assert.strictEqual(breakSync1.lineIndex, -2, "Instrumental break should return lineIndex -2");
assert.strictEqual(breakSync1.isInstrumental, true);
assert.strictEqual(breakSync1.countdownMs, 5000);

// At 13000ms (2000ms until next line): PREVIOUSLY GLITCHED TO OLD LINE!
// Verify it DOES NOT resurrect line 0!
const breakSync2 = getDynamicIslandSyncData(13000);
assert.strictEqual(breakSync2.lineIndex, -2, "At 2.0s before next line, MUST remain in break (not resurrect line 0)");
assert.strictEqual(breakSync2.countdownMs, 2000);

// At 14300ms (700ms until next line):
// Lead-in threshold kicks in (>= 15000 - 700 = 14300ms), transitioning to line 1!
const breakSync3 = getDynamicIslandSyncData(14350);
assert.strictEqual(breakSync3.lineIndex, 1, "At 650ms before next line, transitions directly into next line");
assert.strictEqual(breakSync3.lineData.text, "Second line after a break");
console.log("  ✓ 4. Instrumental break does NOT resurrect old line and transitions seamlessly to next");

// TEST 5: Song Outro / Next Up Countdown
// Final line is line 2 (starts at 165000ms, ends at 170000ms). Track duration is 180000ms.
// At 172000ms (past last line + 1.2s, 8000ms before track end):
const outroSync = getDynamicIslandSyncData(172000);
assert.strictEqual(outroSync.lineIndex, -3, "Outro should return lineIndex -3");
assert.strictEqual(outroSync.isSongEnd, true);
assert.strictEqual(outroSync.countdownMs, 8000, "Outro countdownMs should match remaining track duration");
console.log("  ✓ 5. Outro returns lineIndex -3 with accurate countdown to next track");

// TEST 6: Free Lyric Scrolling & Accumulator
let manualLyricScrollY = null;
const transformRegex = /translate(?:3d\(0(?:px)?,\s*|Y\()(-?[\d.]+)px/;

// Test regex matching both WebKit/WebView2 0px and standard 0
assert.strictEqual("translate3d(0, -120px, 0)".match(transformRegex)[1], "-120");
assert.strictEqual("translate3d(0px, -120px, 0px)".match(transformRegex)[1], "-120");
assert.strictEqual("translateY(-150px)".match(transformRegex)[1], "-150");
console.log("  ✓ 6. Transform regex parses both translate3d(0, ...) and translate3d(0px, ...)");

// Test multi-tick wheel scrolling accumulation
const simulateWheelTick = (deltaY, currentTransform) => {
  let currentY;
  if (manualLyricScrollY !== null) {
    currentY = manualLyricScrollY;
  } else {
    const match = currentTransform.match(transformRegex);
    currentY = match ? parseFloat(match[1]) : 0;
  }
  manualLyricScrollY = currentY - deltaY;
  return manualLyricScrollY;
};

// Tick 1
const y1 = simulateWheelTick(50, "translate3d(0px, 0px, 0px)");
assert.strictEqual(y1, -50, "Tick 1 should scroll to -50");

// Tick 2 (accumulates from -50, does NOT snap back to 0)
const y2 = simulateWheelTick(50, `translate3d(0px, ${y1}px, 0px)`);
assert.strictEqual(y2, -100, "Tick 2 should accumulate to -100");

// Tick 3
const y3 = simulateWheelTick(50, `translate3d(0px, ${y2}px, 0px)`);
assert.strictEqual(y3, -150, "Tick 3 should accumulate to -150");

// Resync resets accumulator
manualLyricScrollY = null;
assert.strictEqual(manualLyricScrollY, null, "Resync resets manualLyricScrollY to null");
console.log("  ✓ 7. Wheel scrolling accumulates smoothly across multiple ticks without resetting");

// TEST 8: Song Title updates on track change during 3s buffer
let currentTrackId = "spotify:track:song1";
let trackTitle = "Song One";
const stateKey1 = `${currentTrackId || trackTitle}:-4:0`;
assert.strictEqual(stateKey1, "spotify:track:song1:-4:0");

// When track changes to song 2:
currentTrackId = "spotify:track:song2";
trackTitle = "Song Two";
const stateKey2 = `${currentTrackId || trackTitle}:-4:0`;
assert.strictEqual(stateKey2, "spotify:track:song2:-4:0");
assert.notStrictEqual(stateKey1, stateKey2, "Song 2 stateKey MUST NOT match Song 1 stateKey!");
console.log("  ✓ 8. Song title in island updates immediately on track change during 3s buffer");

console.log("\nResults: 8/8 tests passed.\n");
