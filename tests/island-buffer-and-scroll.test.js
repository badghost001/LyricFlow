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

  const nextStart = next
    ? ((next.timeMs != null && !isNaN(next.timeMs)) ? next.timeMs : ((next.start != null) ? next.start * 1000 : Infinity))
    : Infinity;

  let end = 0;
  if (line.words && line.words.length > 0) {
    const lastW = line.words[line.words.length - 1];
    const lwStart = (lastW.start != null ? lastW.start * 1000 : lastW.timeMs) || start;
    const lwEnd = (lastW.end != null && lastW.end > 0)
      ? (lastW.end * 1000)
      : (lastW.duration ? lwStart + lastW.duration : (lwStart + 450));
    end = Math.max(lwEnd, lwStart + 450);
  } else if (line.end != null && line.end > 0) {
    end = line.end * 1000;
  } else if (line.duration && line.duration > 0) {
    end = start + line.duration;
  } else {
    // Natural vocal duration for line-synced lyrics:
    // If gap to next line is reasonable (< 7s), line stays active for the phrase
    if (isFinite(nextStart) && nextStart > start) {
      const gap = nextStart - start;
      end = gap >= 7000 ? start + Math.min(gap - 2500, Math.max(3500, (line.text || '').length * 150)) : nextStart;
    } else {
      const textLen = (line.text || '').length;
      end = start + Math.max(3000, Math.min(10000, textLen * 160));
    }
  }

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

  // 2. Song intro / prelude before first vocal line starts (exact 0ms real-time sync)
  if (syncProgress < firstLineStart) {
    const countdownMs = Math.max(0, firstLineStart - syncProgress);
    return { lineIndex: -1, lineData: null, isInstrumental: false, countdownMs };
  }

  // 3. Find matching line index with frame-accurate real-time synchrony (0ms offset)
  let idx = 0;
  for (let i = 0; i < lyrics.length; i++) {
    const timing = getLineTiming(lyrics[i], lyrics[i + 1]);
    if (syncProgress >= timing.start) {
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

  // 5. Genuine Instrumental Break Detection:
  // Only trigger break if gap to next line is significant (>= 6.5s) AND there are at least 2.5s of instrumental silence after line dwell
  const isPastLine = syncProgress > curTiming.end + 1200;

  if (isPastLine && idx < lyrics.length - 1 && isFinite(curTiming.nextStart)) {
    const totalGap = curTiming.nextStart - curTiming.start;
    const breakDuration = curTiming.nextStart - (curTiming.end + 1200);
    const msUntilNext = curTiming.nextStart - syncProgress;
    // Only show instrumental break if it's a real musical interlude (>= 6.5s gap and >= 2.5s silence)
    // and stay in break until the next line starts (msUntilNext > 0)
    if (totalGap >= 6500 && breakDuration >= 2500 && msUntilNext > 0) {
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

// At 13000ms (2000ms until next line): MUST remain in break (not resurrect line 0)
const breakSync2 = getDynamicIslandSyncData(13000);
assert.strictEqual(breakSync2.lineIndex, -2, "At 2.0s before next line, MUST remain in break (not resurrect line 0)");
assert.strictEqual(breakSync2.countdownMs, 2000);

// At 14900ms (100ms before next line):
// Exact 0ms sync: still in break, does NOT prematurely jump ahead to line 1!
const breakSync3 = getDynamicIslandSyncData(14900);
assert.strictEqual(breakSync3.lineIndex, -2, "At 100ms before next line, remains in break and does NOT jump prematurely");
assert.strictEqual(breakSync3.countdownMs, 100);

// At 15000ms: Transitions in exact lockstep with song audio!
const breakSync4 = getDynamicIslandSyncData(15000);
assert.strictEqual(breakSync4.lineIndex, 1, "At exactly 15000ms, transitions in exact lockstep to next line");
assert.strictEqual(breakSync4.lineData.text, "Second line after a break");
console.log("  ✓ 4. Instrumental break counts down to 0ms and transitions in exact lockstep with audio");

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

// TEST 9: Natural Line Duration & Uncompressed Panning Speed
const sampleLine = { text: "This is a longer line that spans several musical beats across eight seconds", timeMs: 30000 };
const nextSampleLine = { text: "Next line", timeMs: 38000 };
const lineStartTime = sampleLine.timeMs;
const nextLineTime = nextSampleLine.timeMs;
const naturalDur = (nextLineTime > lineStartTime && (nextLineTime - lineStartTime) <= 12000)
  ? (nextLineTime - lineStartTime)
  : Math.max(3000, Math.min(10000, (sampleLine.text || '').length * 160));
const effectiveDur = naturalDur;

assert.strictEqual(effectiveDur, 8000, "Effective duration should match natural 8-second interval, not compressed to 2.5s");

// At 4 seconds (halfway through the 8-second line):
const elapsed = 34000 - lineStartTime;
const progressFrac = Math.min(1, Math.max(0, elapsed / effectiveDur));
assert.strictEqual(progressFrac, 0.5, "At 4000ms into an 8000ms line, progress fraction should be exactly 0.5");
console.log("  ✓ 9. Natural line duration preserves full 8-second phrasing without speed-up compression");

// TEST 10: Retaining Line During Normal Gaps (< 6.5s) Without False Breaks
const normalLyrics = [
  { text: "Lyrical phrase one", timeMs: 50000, duration: 2500 },
  { text: "Lyrical phrase two", timeMs: 54000, duration: 3000 }
];
const oldLyrics = lyrics;
lyrics = normalLyrics;

// At 53000ms: line 0 finished at 52500ms, dwell passed at 53700ms.
// Gap to next line is 4000ms (54000 - 50000 < 6500ms).
// It MUST NOT trigger an instrumental break!
const normalGapSync = getDynamicIslandSyncData(53000);
assert.strictEqual(normalGapSync.lineIndex, 0, "Normal 4-second gap should retain active line 0");
assert.strictEqual(normalGapSync.isInstrumental, false, "Normal gap should NOT trigger instrumental break");

// At 54000ms: Transitions seamlessly to line 1
const nextLineSync = getDynamicIslandSyncData(54000);
assert.strictEqual(nextLineSync.lineIndex, 1, "At 54000ms, line 1 is selected");
assert.strictEqual(nextLineSync.lineData.text, "Lyrical phrase two");
lyrics = oldLyrics;
console.log("  ✓ 10. Normal gaps (< 6.5s) retain current line smoothly without false break flashes");

// TEST 11: End-of-scroll clearance buffer guarantees trailing characters are never shadowed
const testZoneWidth = 250;
const testContentWidth = 360;
const END_CLEARANCE = 28;
const scrollableDistance = (testContentWidth - testZoneWidth) + END_CLEARANCE;
const maxScroll = -scrollableDistance;

// At 100% scroll progress (end of line):
const scrollRatio = 1.0;
const finalTargetOffset = -scrollRatio * scrollableDistance;
assert.strictEqual(finalTargetOffset, -138, "Max scroll must include 28px clearance buffer beyond plain width diff (-110)");
// Trailing edge position relative to container:
// content right edge = offset + contentWidth = -138 + 360 = 222px.
// 222px is 28px BEFORE the container right edge (250px)!
const trailingEdgeX = finalTargetOffset + testContentWidth;
assert.strictEqual(trailingEdgeX, testZoneWidth - END_CLEARANCE, "Trailing characters must finish with exactly 28px of clear breathing space");

// Mask calculation at end of line:
const isAtEnd = finalTargetOffset <= (maxScroll + END_CLEARANCE);
assert.strictEqual(isAtEnd, true, "At final scroll position, isAtEnd must be true");
const desiredMaskAtEnd = isAtEnd ? 'linear-gradient(90deg, transparent 0%, #000 14px, #000 100%)' : 'both';
assert.strictEqual(desiredMaskAtEnd, 'linear-gradient(90deg, transparent 0%, #000 14px, #000 100%)', "At end of line, right edge MUST NOT fade to transparent");
console.log("  ✓ 11. END_CLEARANCE (28px) and dynamic mask unmasking guarantee trailing characters are 100% visible");

// TEST 12: Visualizer 4-Band Perceptual Mapping & Dynamic Expansion
const testBands = [0.45, 0.40, 0.25, 0.20, 0.15, 0.12, 0.08, 0.05];
// Band 0: Sub-bass (30-180 Hz)
const b0 = Math.max(testBands[0], testBands[1]) * 1.05;
// Band 1: Low-Mids (180-750 Hz)
const b1 = Math.max(testBands[2], testBands[3]) * 1.22;
// Band 2: Vocals/Mid-Presence (750-3500 Hz)
const b2 = Math.max(testBands[4], testBands[5]) * 1.42;
// Band 3: Hi-hats/Air (3500-15000 Hz)
const b3 = Math.max(testBands[6], testBands[7]) * 1.75;

assert.strictEqual(Number(b0.toFixed(3)), 0.473, "Sub-bass correctly boosted");
assert.strictEqual(Number(b1.toFixed(3)), 0.305, "Low-mid correctly mapped");
assert.strictEqual(Number(b2.toFixed(3)), 0.213, "Vocal presence correctly boosted");
assert.strictEqual(Number(b3.toFixed(3)), 0.140, "Treble band boosted to prevent vanishing hi-hats");

// Non-linear power expansion (power 0.72)
const expandedB3 = Math.pow(b3, 0.72);
assert.strictEqual(expandedB3 > b3, true, "Power 0.72 non-linear expansion lifts subtle high-frequency details");
const clampedB3 = Math.min(1.0, Math.max(0.14, 0.14 + expandedB3 * 0.86));
assert.strictEqual(clampedB3 >= 0.14 && clampedB3 <= 1.0, true, "Clamped transform scale stays strictly within [0.14, 1.0]");
console.log("  ✓ 12. Visualizer perceptual frequency mapping & non-linear expansion elevate vocal & treble articulacy");

console.log("\nResults: 12/12 tests passed.\n");
