const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'src/renderer.js'), 'utf8');
const islandCss = fs.readFileSync(path.join(root, 'src/styles/_dynamic_island.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
const settingsCss = fs.readFileSync(path.join(root, 'src/styles/_settings.css'), 'utf8');

assert.match(renderer, /function suppressInitialIslandHoverUntilPointerExits\(\)[\s\S]*?island\.matches\(':hover'\)[\s\S]*?island-hover-suppressed[\s\S]*?getBoundingClientRect\(\)[\s\S]*?event\.clientX[\s\S]*?clearInitialIslandHoverSuppression\(\)/);
assert.match(renderer, /await window\.electronAPI\.setDynamicIslandMode\(true, dockPos\);\s*\}\s*suppressInitialIslandHoverUntilPointerExits\(\)/);
assert.match(renderer, /if \(isDynamicIslandMode && targetMode !== 'island'\) \{\s*clearInitialIslandHoverSuppression\(\)/);
assert.match(islandCss, /body\.mode-dynamic-island\.island-hover-suppressed #dynamic-island\s*\{\s*pointer-events: none !important;/);

for (const settingId of [
  'select-bg-style', 'slider-fluid-speed', 'input-bg-file', 'check-animated-album-art',
  'select-island-visualizer-style', 'check-island-beat-bloom', 'check-wallpaper-beat-bloom',
  'check-motion-visualizer'
]) {
  assert.ok(index.includes(`id="${settingId}"`), `expected setting ${settingId}`);
}
assert.ok((index.match(/class="setting-performance-note"/g) || []).length >= 7,
  'CPU/GPU-intensive settings must show explanatory notes beneath their controls');
assert.match(settingsCss, /\.setting-performance-note\s*\{[^}]*font-size: 11px;[^}]*line-height: 1\.4;/);

console.log('Island initial-hover recovery and performance-setting notes tests passed.');
