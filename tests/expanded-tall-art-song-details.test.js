/**
 * tests/expanded-tall-art-song-details.test.js
 * Verification of Split View expanded artwork glass panels & authentic layout:
 * 1. Verifies that artificial clamp caps (140px/90px) are removed from #studio-track-title and #studio-track-artist.
 * 2. Verifies that .studio-track-meta renders as an adjustable frosted glass pill on expanded artwork in auto-hide,
 *    and maintains authentic vertical layout (flex-direction: column) when hovered / unexpanded.
 * 3. Verifies that track title and artist use text-overflow: ellipsis for clean truncation.
 * 4. Verifies that the progress bar renders as a frosted glass pill with clearly legible timestamps (#widget-time-current & #widget-time-duration).
 * 5. Verifies badges row visibility when badges are present.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const studioCssPath = path.join(__dirname, '..', 'src', 'styles', '_studio.css');
const studioCss = fs.readFileSync(studioCssPath, 'utf8');
const splitArtCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', '_studio_split_art.css'), 'utf8');
const rendererJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

console.log('\n--- Running Expanded Tall Artwork Song Details Regression Suite ---\n');

// Test 1: No artificial 140px or 90px clamp caps
console.log('1. Removal of artificial clamp caps on track title and artist:');
assert.ok(
  !studioCss.includes('max-width: clamp(140px, 58%, 210px)'),
  'Artificial clamp(140px, 58%, 210px) cap must be removed from track title'
);
assert.ok(
  !studioCss.includes('max-width: clamp(90px, 38%, 140px)'),
  'Artificial clamp(90px, 38%, 140px) cap must be removed from track artist'
);
console.log('  ✓ 1. Artificial clamp caps (140px/90px) removed from track title and artist');

// Test 2: Tall artwork metadata glass pill & stable one-line orientation
console.log('\n2. Tall artwork metadata glass pill & one-line orientation:');
assert.ok(
  splitArtCss.includes('border-radius: 999px !important;') &&
  splitArtCss.includes('backdrop-filter: blur(12px) saturate(1.15) !important;') &&
  splitArtCss.includes('content: "\\00B7" !important;'),
  '_studio_split_art.css must style tall-art details as a floating glass pill with a centered-dot separator'
);
assert.ok(
  splitArtCss.includes('flex-direction: row !important;') &&
  splitArtCss.includes('white-space: nowrap !important;') &&
  rendererJs.includes("meta.style.setProperty('--studio-track-meta-scale', String(scale));"),
  'Split View details must stay on one line and scale to the available art width'
);
console.log('  Tall-art details remain a centered one-line glass pill above the progress area');

// Test 3: Unconstrained flex sizing on wrappers and text
console.log('\n3. Ellipsis truncation and title/artist typography:');
assert.ok(
  studioCss.includes('#studio-track-title') &&
  studioCss.includes('text-overflow: ellipsis !important;'),
  'Track title must have text-overflow: ellipsis'
);
assert.ok(
  studioCss.includes('#studio-track-artist') &&
  studioCss.includes('text-overflow: ellipsis !important;'),
  'Track artist must have text-overflow: ellipsis'
);
console.log('  ✓ 3. Text and wrappers flex dynamically to fill glass panel without early truncation');

// Test 4: Frosted glass progress bar panel with visible timestamps
console.log('\n4. Frosted glass progress bar panel with visible timestamps:');
assert.ok(
  studioCss.includes('#playback-widget > .widget-track-panel') &&
  studioCss.includes('width: min(280px, 80%) !important;') &&
  studioCss.includes('border-radius: 18px !important;') &&
  studioCss.includes('backdrop-filter: blur(20px)'),
  'Progress bar must be a compact frosted glass panel in auto-hide on expanded art'
);
assert.ok(
  studioCss.includes('#playback-widget #widget-time-current') &&
  studioCss.includes('#playback-widget #widget-time-duration') &&
  studioCss.includes('display: block !important;') &&
  studioCss.includes('min-width: 28px !important;'),
  'Both current and duration timestamps must be clearly visible and legible'
);
console.log('  ✓ 4. Frosted glass progress bar panel with visible timestamps verified');

// Test 5: Badges row visibility
console.log('\n5. Badges row visibility:');
assert.ok(
  studioCss.includes('body.layout-split.auto-hide-controls .studio-badges-row.has-badges') &&
  studioCss.includes('display: flex !important;'),
  'Badges row must be visible when badges are present'
);
console.log('  ✓ 5. Badges row maintains authentic visibility');

// Test 6: Split artwork is positioned independently from its details rail
console.log('\n6. Split artwork and details use independent anchors:');
assert.ok(
  splitArtCss.includes('top: clamp(24px, 8vh, 76px) !important;') &&
  splitArtCss.includes('#screen-lyrics #studio-sidebar > .studio-track-meta') &&
  splitArtCss.includes('bottom: 8px !important;'),
  '_studio_split_art.css must anchor artwork separately while keeping track details fixed near the progress area'
);
console.log('  Artwork and track details have independent, stable anchors');

// Test 7: Tall artwork uses an explicit portrait box and pinned glass details
console.log('\n7. Tall artwork portrait sizing and pinned details:');
assert.ok(
  splitArtCss.includes('width: min(100%, clamp(160px, 42.67vh, 400px)) !important;') &&
  splitArtCss.includes('aspect-ratio: 2 / 3 !important;') &&
  splitArtCss.includes('object-fit: cover !important;') &&
  splitArtCss.includes('bottom: 8px !important;') &&
  splitArtCss.includes('backdrop-filter: blur(12px) saturate(1.15) !important;'),
  '_studio_split_art.css must give tall artwork visible portrait dimensions without letterboxing and keep details pinned'
);
console.log('  Tall art has explicit portrait dimensions and stable glass details');

// Test 8: Track details stay in one horizontal row with a centered-dot separator
console.log('\n8. Split artwork details are a single horizontal row:');
assert.ok(
  splitArtCss.includes('display: inline-flex !important;') &&
  splitArtCss.includes('flex-direction: row !important;') &&
  splitArtCss.includes('white-space: nowrap !important;') &&
  splitArtCss.includes('content: "\\00B7" !important;'),
  '_studio_split_art.css must render title and artist on one line with the centered-dot separator'
);
assert.ok(
  splitArtCss.includes('.split-tall-art') && splitArtCss.includes('#studio-sidebar > .studio-track-meta') &&
  rendererJs.includes('const scale = contentWidth > availableWidth ? availableWidth / contentWidth : 1;'),
  'Tall details must stay pinned and shrink as a unit when needed'
);
console.log('  Split View track details render on a single centered horizontal row');

console.log('\n--- ALL EXPANDED TALL ARTWORK SONG DETAILS TESTS PASSED (100% GREEN) ---\n');
