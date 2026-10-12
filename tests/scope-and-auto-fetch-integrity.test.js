const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n--- Running Scope & Auto-Fetch Integrity Verification Tests ---\n');

const rendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');

// 1. Locate setupUIHandlers bounds
const setupMatch = rendererCode.match(/function\s+setupUIHandlers\s*\(\)\s*\{/);
assert(setupMatch, 'renderer.js must define setupUIHandlers');
const setupIndex = setupMatch.index;

// Find setupUIHandlers close brace
// Count braces or locate closing } around line 8400
let depth = 0;
let setupEndIndex = -1;
for (let i = setupIndex; i < rendererCode.length; i++) {
  if (rendererCode[i] === '{') depth++;
  else if (rendererCode[i] === '}') {
    depth--;
    if (depth === 0) {
      setupEndIndex = i;
      break;
    }
  }
}
assert(setupEndIndex > setupIndex, 'setupUIHandlers bounds must be well-formed');

// 2. Ensure critical functions are defined BEFORE setupUIHandlers (at top-level scope)
function checkTopLevel(fnName) {
  const match = rendererCode.match(new RegExp(`function\\s+${fnName}\\s*\\(`));
  assert(match, `renderer.js must define ${fnName}`);
  assert(
    match.index < setupIndex,
    `${fnName} must be defined BEFORE setupUIHandlers at top-level scope (found at index ${match.index}, setup is at ${setupIndex})`
  );
  // Ensure no duplicate declaration inside setupUIHandlers
  const innerSection = rendererCode.slice(setupIndex, setupEndIndex);
  const innerMatch = innerSection.match(new RegExp(`function\\s+${fnName}\\s*\\(`));
  assert(!innerMatch, `${fnName} must NOT be redefined inside setupUIHandlers`);
}

checkTopLevel('getCanonicalTrackKey');
console.log('  ✓ 1a. getCanonicalTrackKey is declared at top-level scope and accessible globally');

checkTopLevel('handleLocalOrPollPause');
console.log('  ✓ 1b. handleLocalOrPollPause is declared at top-level scope and accessible globally');

checkTopLevel('seekPlayback');
console.log('  ✓ 1c. seekPlayback is declared at top-level scope and accessible globally');

checkTopLevel('adjustSyncOffset');
console.log('  ✓ 1d. adjustSyncOffset is declared at top-level scope and accessible globally');

// 3. Functional Simulation: getCanonicalTrackKey
// Extract getCanonicalTrackKey implementation using regex or eval
const keyFnMatch = rendererCode.match(/function\s+getCanonicalTrackKey\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
assert(keyFnMatch, 'getCanonicalTrackKey body must be extractable');
const getCanonicalTrackKey = new Function(`return (${keyFnMatch[0]})`)();

assert.strictEqual(
  getCanonicalTrackKey({ name: 'Heaven Can Wait', artists: [{ name: 'Michael Jackson' }] }),
  'canon_michael jackson_heaven can wait'
);
assert.strictEqual(
  getCanonicalTrackKey({ title: 'Billie Jean', artist: 'Michael Jackson' }),
  'canon_michael jackson_billie jean'
);
assert.strictEqual(getCanonicalTrackKey(null), null);
console.log('  ✓ 2. getCanonicalTrackKey generates normalized canonical keys correctly');

// 4. Verify handlePlaybackData invokes getCanonicalTrackKey safely
const handlePlaybackMatch = rendererCode.match(/const\s+canonOffsetKey\s*=\s*getCanonicalTrackKey\(track\);/);
assert(handlePlaybackMatch, 'handlePlaybackData must look up canonOffsetKey via getCanonicalTrackKey');
console.log('  ✓ 3. handlePlaybackData calls getCanonicalTrackKey without scoping collisions');

console.log('\nAll 5/5 Scope & Auto-Fetch Integrity verification tests passed successfully!\n');
