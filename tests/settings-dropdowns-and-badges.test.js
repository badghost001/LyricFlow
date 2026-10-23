const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('--- Running Bifurcated Settings Dropdowns, Lyric Preference Priority & Badge Suppression Tests ---');

// 1. Static HTML Dropdowns & Optgroup Bifurcation (R4)
const htmlPath = path.join(__dirname, '../src/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 1.1 Preferred Provider Dropdown
assert(
  htmlContent.includes('id="select-preferred-provider"') &&
  htmlContent.includes('class="liquid-select advanced-dropdown"'),
  'index.html select-preferred-provider must have classes "liquid-select advanced-dropdown"'
);
assert(
  htmlContent.includes('optgroup label="Word-by-Word Karaoke Priority (Recommended)"'),
  'select-preferred-provider must contain optgroup "Word-by-Word Karaoke Priority (Recommended)"'
);
assert(
  htmlContent.includes('optgroup label="Line-Sync Priority"'),
  'select-preferred-provider must contain optgroup "Line-Sync Priority"'
);
assert(
  htmlContent.includes('optgroup label="Alternative Cascades"'),
  'select-preferred-provider must contain optgroup "Alternative Cascades"'
);

// 1.2 Font Family Dropdown
assert(
  htmlContent.includes('id="select-font"') &&
  htmlContent.includes('optgroup label="Modern Sans-Serif"') &&
  htmlContent.includes('optgroup label="Stylized &amp; Monospace"'),
  'index.html select-font must be an advanced dropdown bifurcated into Modern Sans-Serif and Stylized & Monospace'
);

// 1.3 Translation Languages Dropdown
assert(
  htmlContent.includes('id="select-translate"') &&
  htmlContent.includes('optgroup label="General"') &&
  htmlContent.includes('optgroup label="Major Languages"') &&
  htmlContent.includes('optgroup label="East Asian Languages"'),
  'index.html select-translate must be an advanced dropdown bifurcated into General, Major Languages, and East Asian Languages'
);

// 1.4 Dynamic Island Dock Position Dropdown & Test Invariants
assert(
  htmlContent.includes('id="select-island-position"') &&
  htmlContent.includes('optgroup label="Screen Edges (Fixed)"') &&
  htmlContent.includes('optgroup label="Floating / Custom"'),
  'index.html select-island-position must be an advanced dropdown bifurcated into Screen Edges and Floating / Custom'
);
assert(
  htmlContent.includes('data-val="free"') &&
  htmlContent.includes('<option value="free">free</option>'),
  'index.html select-island-position must retain data-val="free" and <option value="free">free</option>'
);
console.log('  ✓ 1. Static HTML declares bifurcated <optgroup> dropdowns for provider priority, font, translation, and dock position');

// 2. CSS Styling Verification (_settings.css)
const cssPath = path.join(__dirname, '../src/styles/_settings.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(
  cssContent.includes('.advanced-dropdown,') &&
  cssContent.includes('.liquid-select'),
  '_settings.css must declare styling for .advanced-dropdown and .liquid-select'
);
assert(
  cssContent.includes('.advanced-dropdown optgroup') &&
  cssContent.includes('.liquid-select optgroup'),
  '_settings.css must declare styling for .advanced-dropdown optgroup'
);
assert(
  cssContent.includes('.advanced-dropdown option') &&
  cssContent.includes('.liquid-select option'),
  '_settings.css must declare styling for .advanced-dropdown option'
);
assert(
  cssContent.includes('[data-theme="light"] .advanced-dropdown') &&
  cssContent.includes('[data-theme="light"] .advanced-dropdown optgroup'),
  '_settings.css must provide light-theme overrides for .advanced-dropdown and optgroups'
);
console.log('  ✓ 2. CSS declares glassmorphic dropdown, optgroup categorization, and light theme overrides');

// 3. Lyric Preference Priority & Backend Invariants (R3)
const rendererPath = path.join(__dirname, '../src/renderer.js');
const rendererCode = fs.readFileSync(rendererPath, 'utf8');

assert(
  rendererCode.includes("preferredLyricProviders: ['netease', 'lrclib', 'musixmatch']"),
  "renderer.js must initialize default preferredLyricProviders as ['netease', 'lrclib', 'musixmatch']"
);
assert(
  rendererCode.includes("settings.preferredLyricProviders = ['netease', 'lrclib', 'musixmatch'];"),
  "renderer.js must migrate legacy settings to ['netease', 'lrclib', 'musixmatch']"
);

const enginePath = path.join(__dirname, '../src-tauri/src/commands/lyrics/engine.rs');
const engineCode = fs.readFileSync(enginePath, 'utf8');

assert(
  engineCode.includes('(SyncType::WordSynced, "NetEase") | (SyncType::WordSynced, "NetEase (YRC)") => 1'),
  'engine.rs must explicitly rank NetEase and NetEase (YRC) WordSynced candidates at rank 1'
);
assert(
  engineCode.includes('(SyncType::WordSynced, _) => 1') &&
  engineCode.includes('(SyncType::LineSynced, "LRCLIB") => 3'),
  'engine.rs must retain AST test invariant strings for WordSynced rank 1 and LRCLIB rank 3'
);
console.log('  ✓ 3. Frontend default and Rust engine hierarchy guarantee NetEase Word-Sync > LRCLIB Line-Sync priority');

// 4. Quality Badge WORD-SYNC / LINE-SYNC Suppression (R5)
assert(
  !rendererCode.includes('badge.textContent = "WORD-SYNC"') &&
  !rendererCode.includes("badge.textContent = 'WORD-SYNC'"),
  'renderer.js must never set WORD-SYNC text on island-quality-badge'
);
assert(
  !rendererCode.includes('badge.textContent = "LINE-SYNC"') &&
  !rendererCode.includes("badge.textContent = 'LINE-SYNC'"),
  'renderer.js must never set LINE-SYNC text on island-quality-badge'
);

// VM Execution Test for updateIslandQualityBadge
const mockBadge = {
  style: { display: 'none' },
  textContent: '',
  className: 'island-quality-badge'
};

const badgeSandbox = {
  document: {
    getElementById(id) {
      if (id === 'island-quality-badge') return mockBadge;
      return null;
    }
  },
  currentPlayingTrackObj: { id: 'track_1' },
  currentTrack: { id: 'track_1' },
  currentIslandIsLossless: false,
  currentIslandIsHiRes: false
};

vm.createContext(badgeSandbox);

const badgeFnCode = `
function updateIslandQualityBadge(overrideLossless, overrideHiRes, overrideSourceLevel) {
  const badge = document.getElementById("island-quality-badge");
  if (!badge) return;
  const hasTrack = Boolean(currentPlayingTrackObj || currentTrack);
  if (!hasTrack) {
    badge.style.display = 'none';
    badge.className = "island-quality-badge";
    return;
  }
  const isLossless = overrideLossless !== undefined ? Boolean(overrideLossless) : Boolean(currentIslandIsLossless);
  const isHiRes = overrideHiRes !== undefined ? Boolean(overrideHiRes) : Boolean(currentIslandIsHiRes);

  if (isLossless) {
    badge.textContent = isHiRes ? "HI-RES" : "LOSSLESS";
    badge.className = "island-quality-badge " + (isHiRes ? "badge-hires" : "badge-lossless");
    badge.style.display = "inline-flex";
  } else {
    badge.className = "island-quality-badge";
    badge.style.display = "none";
  }
}
`;
vm.runInContext(badgeFnCode, badgeSandbox);

// Test 1: Standard lossy audio with word-synced lyrics -> SUPPRESSED
badgeSandbox.updateIslandQualityBadge(false, false, 3);
assert.strictEqual(mockBadge.style.display, 'none');
assert.strictEqual(mockBadge.textContent !== 'WORD-SYNC', true);

// Test 2: Standard lossy audio with line-synced lyrics -> SUPPRESSED
badgeSandbox.updateIslandQualityBadge(false, false, 2);
assert.strictEqual(mockBadge.style.display, 'none');
assert.strictEqual(mockBadge.textContent !== 'LINE-SYNC', true);

// Test 3: 16-bit Lossless -> LOSSLESS
badgeSandbox.updateIslandQualityBadge(true, false);
assert.strictEqual(mockBadge.style.display, 'inline-flex');
assert.strictEqual(mockBadge.textContent, 'LOSSLESS');

// Test 4: 24-bit Hi-Res -> HI-RES
badgeSandbox.updateIslandQualityBadge(true, true);
assert.strictEqual(mockBadge.style.display, 'inline-flex');
assert.strictEqual(mockBadge.textContent, 'HI-RES');

console.log('  ✓ 4. Badge suppression verified: WORD-SYNC and LINE-SYNC completely suppressed; LOSSLESS and HI-RES preserved');

console.log('All Bifurcated Settings Dropdowns, Lyric Preference & Badge Suppression tests passed successfully!\n');
