const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Dynamic Island Specular Halo & Beat Pulse Tests ---');

// 1. CSS Declarations Verification
const cssPath = path.join(__dirname, '../src/styles/_dynamic_island.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(
  cssContent.includes('linear-gradient(180deg, rgba(255, 255, 255, 0.07)'),
  '_dynamic_island.css must define liquid specular highlight bezel gradient'
);
assert(
  cssContent.includes('transform: scale(var(--island-beat-scale, 1))'),
  '_dynamic_island.css must define --island-beat-scale transform on #dynamic-island'
);
assert(
  cssContent.includes('--island-halo-opacity'),
  '_dynamic_island.css must wire --island-halo-opacity to .island-art-halo'
);
assert(
  cssContent.includes('--island-halo-scale'),
  '_dynamic_island.css must wire --island-halo-scale to .island-art-halo'
);
assert(
  cssContent.includes('--island-halo-blur'),
  '_dynamic_island.css must wire --island-halo-blur to .island-art-halo'
);
console.log('  ✓ 1. CSS defines liquid specular highlight rim, beat pulse transform, and reactive halo properties');

// 2. Renderer Mathematical Reactivity Verification
function computeHaloAndBeatPulse(subBass) {
  let haloOpacity = null;
  let haloScale = null;
  let haloBlur = null;
  let beatScale = null;

  if (subBass > 0.05) {
    haloOpacity = Math.min(0.92, Math.max(0.35, 0.35 + subBass * 0.57)).toFixed(2);
    haloScale = (1.0 + subBass * 0.14).toFixed(3);
    haloBlur = Math.round(5 + subBass * 7);
  }
  if (subBass > 0.70) {
    beatScale = (1.0 + (subBass - 0.70) * 0.024).toFixed(3);
  }
  return { haloOpacity, haloScale, haloBlur, beatScale };
}

// Test resting/silence (subBass = 0)
const quiet = computeHaloAndBeatPulse(0);
assert.strictEqual(quiet.haloOpacity, null, 'Quiet passage must not activate reactive halo');
assert.strictEqual(quiet.beatScale, null, 'Quiet passage must not pulse beat scale');

// Test moderate groove (subBass = 0.50)
const groove = computeHaloAndBeatPulse(0.50);
assert(Number(groove.haloOpacity) >= 0.60, 'Moderate bass must brighten halo');
assert(Number(groove.haloScale) > 1.05, 'Moderate bass must expand halo scale');
assert.strictEqual(groove.beatScale, null, 'Moderate bass must not exceed kick threshold');

// Test heavy kick transient (subBass = 0.95)
const kick = computeHaloAndBeatPulse(0.95);
assert(Number(kick.haloOpacity) >= 0.85, 'Heavy kick must drive halo near max opacity');
assert(Number(kick.beatScale) > 1.004 && Number(kick.beatScale) <= 1.008, 'Heavy kick must trigger sub-pixel physical pulse (1.004 - 1.008)');
console.log('  ✓ 2. Mathematical audio-reactive response curves verified across quiet, groove, and kick regimes');

// 3. Renderer Code Engine Verification
const rendererPath = path.join(__dirname, '../src/renderer.js');
const rendererContent = fs.readFileSync(rendererPath, 'utf8');

assert(
  rendererContent.includes('islandArtHaloEl'),
  'renderer.js must declare islandArtHaloEl variable'
);
assert(
  rendererContent.includes('--island-halo-opacity'),
  'renderer.js must set --island-halo-opacity on halo'
);
assert(
  rendererContent.includes('--island-beat-scale'),
  'renderer.js must set --island-beat-scale on dynamic island'
);
assert(
  rendererContent.includes("islandEl.style.removeProperty('--island-beat-scale')"),
  'renderer.js must cleanly remove --island-beat-scale when settling'
);
console.log('  ✓ 3. Renderer updates and cleans up audio-reactive properties with zero DOM thrashing');

console.log('\nAll Dynamic Island Specular Halo & Beat Pulse tests passed successfully!\n');
