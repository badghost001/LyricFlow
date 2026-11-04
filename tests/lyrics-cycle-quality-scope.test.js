const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Lyrics Cycle, Quality Hierarchy & Scope Integrity Test Suite ---\n');

const rendererContent = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
const bridgeContent = fs.readFileSync(path.join(__dirname, '../src/tauri-bridge.js'), 'utf8');
const windowRsContent = fs.readFileSync(path.join(__dirname, '../src-tauri/src/commands/window.rs'), 'utf8');

// 1. isTrackStillCurrent scoping: Must be defined before try { in _executeFetchLyrics
const execStartIdx = rendererContent.indexOf('async function _executeFetchLyrics');
assert(execStartIdx !== -1, '_executeFetchLyrics must exist in renderer.js');
const tryIdx = rendererContent.indexOf('try {', execStartIdx);
assert(tryIdx !== -1, 'try { block must exist in _executeFetchLyrics');
const isTrackIdx = rendererContent.indexOf('const isTrackStillCurrent = () =>', execStartIdx);
assert(isTrackIdx !== -1, 'isTrackStillCurrent must be defined in _executeFetchLyrics');
assert(
  isTrackIdx < tryIdx,
  'isTrackStillCurrent must be defined BEFORE the try { block so it is available in catch and finally'
);
console.log('  ✓ 1. isTrackStillCurrent is scoped at function level before try block (accessible in catch and finally)');

// 2. Finally block must call isTrackStillCurrent without ReferenceError
const finallyIdx = rendererContent.indexOf('} finally {', tryIdx);
assert(finallyIdx !== -1, 'finally block must exist in _executeFetchLyrics');
const finallyBody = rendererContent.slice(finallyIdx, finallyIdx + 120);
assert(
  finallyBody.includes('if (isTrackStillCurrent())'),
  'finally block must call isTrackStillCurrent cleanly'
);
console.log('  ✓ 2. finally block uses scoped isTrackStillCurrent cleanly');

// 3. Provider Quality Hierarchy in applyLyricsData: LRCLIB cannot overwrite Apple Music at level 2
assert(
  rendererContent.includes('const isAppleUpgrade = isAppleMusicSource && !isCurrentApple;'),
  'applyLyricsData must enforce Apple Music provider upgrade check'
);
assert(
  rendererContent.includes('applyLyricsData REJECTED: incoming') &&
  rendererContent.includes('does not upgrade current'),
  'applyLyricsData must reject non-upgrading lyrics at same sourceLevel'
);
console.log('  ✓ 3. applyLyricsData preserves Apple Music lyrics and rejects lower-tier same-level overwrites (LRCLIB)');

assert(
  rendererContent.includes('incomingWordSyncUpgrade = sourceLevel >= 3 && currentSourceLevel < 3 && hasWordSync') &&
  rendererContent.includes('!incomingWordSyncUpgrade'),
  'NetEase word-synced lyrics must upgrade qApple line-synced lyrics, while qApple word-sync remains preferred'
);
console.log('NetEase word-sync upgrade over qApple line-sync is preserved');

// 4. Fallback engines (Proxy & LRCLIB) must not run if primary providers found synced lyrics
assert(
  rendererContent.includes('if ((lyrics.length === 0 || currentSourceLevel < 2) && isTrackStillCurrent())'),
  'Fallback proxyTask and lrclibTask must only run if primary engines found no synced match'
);
console.log('  ✓ 4. Fallback proxy/LRCLIB tasks are bypassed when primary engines have resolved synced lyrics');

// 5. tauri-bridge error listener includes source location info
assert(
  bridgeContent.includes('[Source: ') && bridgeContent.includes('e.lineno'),
  'tauri-bridge.js error listener must capture filename and line number'
);
console.log('  ✓ 5. tauri-bridge.js logs source file and line info for uncaught errors');

// 6. Rust eval calls in window.rs are protected by try { ... } catch (_) {}
assert(
  windowRsContent.includes('try {{ if (window.__onTaskbarLyric) window.__onTaskbarLyric({}); }} catch (_) {{}}') &&
  windowRsContent.includes('try {{ if (window.__onTaskbarConfig) window.__onTaskbarConfig({}); }} catch (_) {{}}'),
  'Rust taskbar eval format strings must be wrapped in try-catch'
);
console.log('  ✓ 6. Rust window.rs wraps eval invocations in try-catch guards');

console.log('\nAll Lyrics Cycle & Scope Integrity tests passed successfully!');
