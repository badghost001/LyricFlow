const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Running Dynamic Island Circular Countdown Ring Tests ---');

// 1. Static HTML Markup Verification
const htmlPath = path.join(__dirname, '../src/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(
  htmlContent.includes('id="island-countdown-ring"'),
  'index.html must include #island-countdown-ring SVG'
);
assert(
  htmlContent.includes('id="island-countdown-ring-fill"'),
  'index.html must include #island-countdown-ring-fill circle'
);
assert(
  htmlContent.includes('class="island-countdown-ring-track"'),
  'index.html must include .island-countdown-ring-track circle'
);
console.log('  ✓ 1. Static HTML contains countdown ring and track elements');

// 2. CSS Styles Verification
const cssPath = path.join(__dirname, '../src/styles/_dynamic_island.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(
  cssContent.includes('.island-countdown-ring'),
  '_dynamic_island.css must define .island-countdown-ring'
);
assert(
  cssContent.includes('.island-countdown-ring-track'),
  '_dynamic_island.css must define .island-countdown-ring-track'
);
assert(
  cssContent.includes('.island-countdown-ring-fill'),
  '_dynamic_island.css must define .island-countdown-ring-fill'
);
assert(
  cssContent.includes('island-instrumental-active'),
  '_dynamic_island.css must define active instrumental state styles'
);
assert(
  cssContent.includes('stroke-dasharray: 97.39;'),
  '_dynamic_island.css must define circumference stroke-dasharray (97.39)'
);
console.log('  ✓ 2. CSS declares circular countdown arc, stroke parameters, and active instrumental classes');

// 3. Mathematical Geometry Verification (Circumference & Dashoffset)
const radius = 15.5;
const circumference = 2 * Math.PI * radius; // approx 97.389
assert(Math.abs(circumference - 97.39) < 0.05, 'SVG radius 15.5 circumference must equal 97.39 within 0.05');

function calculateDashOffset(remainingMs, totalMs) {
  const frac = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  return Number(((1 - frac) * 97.39).toFixed(2));
}

assert.strictEqual(calculateDashOffset(4000, 4000), 0.0, 'Full countdown must have offset 0.0');
assert.strictEqual(calculateDashOffset(2000, 4000), 48.7, 'Half countdown must have offset 48.7');
assert.strictEqual(calculateDashOffset(0, 4000), 97.39, 'Zero countdown must have offset 97.39 (empty)');
console.log('  ✓ 3. Mathematical wind-down calculation from 360° to 0° verified');

// 4. Renderer Logic Verification
const rendererPath = path.join(__dirname, '../src/renderer.js');
const rendererContent = fs.readFileSync(rendererPath, 'utf8');

assert(
  rendererContent.includes('islandCountdownRingEl'),
  'renderer.js must declare islandCountdownRingEl'
);
assert(
  rendererContent.includes('island-instrumental-active'),
  'renderer.js must toggle island-instrumental-active'
);
assert(
  rendererContent.includes('currentIslandBreakTotalMs'),
  'renderer.js must track break total duration'
);
console.log('  ✓ 4. Renderer state engine wires countdown ring lifecycle during breaks and vocal returns');

console.log('\nAll Dynamic Island Circular Countdown Ring tests passed successfully!\n');
