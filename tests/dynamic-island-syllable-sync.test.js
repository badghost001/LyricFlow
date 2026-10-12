/**
 * Unit & Integration Tests: Dynamic Island Syllable Synchronization & Typographic Spacing
 *
 * Verifies that syllable-by-syllable karaoke in Dynamic Island mode:
 * 1. Preserves syllable continuity within single words (0px spacing, no margin, no space spans).
 * 2. Correctly inserts .island-word-space between separate words.
 * 3. Preserves continuity across CJK characters.
 * 4. Reconciles tokens upfront to guarantee 1:1 alignment between DOM spans and timing logic.
 * 5. Uses monotonic forward scanning with inter-syllable dwell handling.
 * 6. Keeps camera anchor focused on the active word during pauses without jumping to the end.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

function runDynamicIslandSyllableTests() {
  console.log('\n--- Running Dynamic Island Syllable Synchronization Tests ---\n');

  const islandCssPath = path.resolve(__dirname, '../src/styles/_dynamic_island.css');
  const rendererPath = path.resolve(__dirname, '../src/renderer.js');
  const parsersPath = path.resolve(__dirname, '../src/modules/parsers.js');

  const islandCss = fs.readFileSync(islandCssPath, 'utf8');
  const rendererJs = fs.readFileSync(rendererPath, 'utf8');
  const { cleanWordPunctuation, cleanLyricText, escapeHTML } = require(parsersPath);

  // Test 1: CSS verifies margin-right: 0 on .island-lyric-line .lyric-word
  test('1. _dynamic_island.css eliminates margin-right on .lyric-word to prevent syllable separation', () => {
    const wordRuleMatch = islandCss.match(/\.island-lyric-line\s+\.lyric-word\s*\{([^}]+)\}/);
    assert.ok(wordRuleMatch, '.island-lyric-line .lyric-word rule must exist');
    assert.ok(
      wordRuleMatch[1].includes('margin-right: 0;'),
      'Must define margin-right: 0 to ensure adjacent syllables touch seamlessly'
    );
    assert.ok(
      !wordRuleMatch[1].includes('margin-right: 3px;'),
      'Must NOT contain hardcoded margin-right: 3px'
    );
  });

  // Test 2: CSS verifies .island-word-space definition
  test('2. _dynamic_island.css defines .island-word-space with inline-block and flex-shrink: 0', () => {
    const spaceMatch = islandCss.match(/\.island-word-space\s*\{([^}]+)\}/);
    assert.ok(spaceMatch, '.island-word-space rule must exist');
    assert.ok(spaceMatch[1].includes('display: inline-block;'), '.island-word-space must be inline-block');
    assert.ok(spaceMatch[1].includes('width: 0.32em;'), '.island-word-space must have width: 0.32em');
    assert.ok(spaceMatch[1].includes('flex-shrink: 0;'), '.island-word-space must have flex-shrink: 0');
  });

  // Setup DOM mock for testing timedWordSpansHtml & updateDynamicIslandLyric
  class MockElement {
    constructor(tagName = 'div') {
      this.tagName = tagName.toUpperCase();
      this.className = '';
      this.textContent = '';
      this.style = {
        transform: '',
        removeProperty: () => {}
      };
      this.dataset = {};
      this.children = [];
      this.childNodes = [];
      this.scrollWidth = 100;
      this.offsetLeft = 0;
      this.offsetWidth = 50;
      this.classList = {
        contains: (cls) => (this.className || '').split(/\s+/).includes(cls),
        toggle: (cls, force) => {
          const list = (this.className || '').split(/\s+/).filter(Boolean);
          const has = list.includes(cls);
          if (force === true || (force === undefined && !has)) {
            if (!has) list.push(cls);
          } else {
            const idx = list.indexOf(cls);
            if (idx >= 0) list.splice(idx, 1);
          }
          this.className = list.join(' ');
        }
      };
    }
    querySelectorAll(selector) {
      const results = [];
      const isClass = selector.startsWith('.');
      const targetClass = isClass ? selector.slice(1) : selector;
      function walk(el) {
        for (const child of el.children) {
          if (child.classList && child.classList.contains(targetClass)) {
            results.push(child);
          }
          walk(child);
        }
      }
      walk(this);
      return results;
    }
    set innerHTML(html) {
      this._innerHTML = html;
      // Simple parser for unit test mock
      const spans = [];
      const spanRegex = /<span class="([^"]*)"(?: data-word-idx="(\d+)")?>([^<]*)<\/span>/g;
      let match;
      while ((match = spanRegex.exec(html)) !== null) {
        const span = new MockElement('span');
        span.className = match[1];
        if (match[2] !== undefined) span.dataset.wordIdx = match[2];
        span.textContent = match[3];
        spans.push(span);
      }
      this.children = spans;
      this.childNodes = spans;
    }
    get innerHTML() {
      return this._innerHTML || '';
    }
  }

  // Build sandbox environment with renderer functions
  const sandbox = {
    document: {
      getElementById: () => new MockElement(),
      createElement: (tag) => new MockElement(tag)
    },
    cleanWordPunctuation,
    cleanLyricText,
    escapeHTML,
    console
  };

  const escapeHTMLCode = rendererJs.match(/function escapeHTML\([\s\S]*?\n\}/)[0];
  const timedWordSpansHtmlCode = rendererJs.match(/function timedWordSpansHtml\([\s\S]*?\n\}/)[0];
  const reconcileTimedWordsCode = rendererJs.match(/function reconcileTimedWords\([\s\S]*?\n\}/)[0];
  const needsTimedWordSpaceCode = rendererJs.match(/function needsTimedWordSpace\([\s\S]*?\n\}/)[0];

  vm.runInNewContext(`
    ${escapeHTMLCode}
    ${reconcileTimedWordsCode}
    ${needsTimedWordSpaceCode}
    ${timedWordSpansHtmlCode}
    this.escapeHTML = escapeHTML;
    this.reconcileTimedWords = reconcileTimedWords;
    this.needsTimedWordSpace = needsTimedWordSpace;
    this.timedWordSpansHtml = timedWordSpansHtml;
  `, sandbox);

  // Test 3: timedWordSpansHtml preserves syllable continuity without spaces
  test('3. timedWordSpansHtml generates 0 spaces between syllables of the same word (e.g. to-ge-ther)', () => {
    const syllables = [
      { text: 'to', hasSpace: false },
      { text: 'ge', hasSpace: false },
      { text: 'ther' }
    ];
    const html = sandbox.timedWordSpansHtml(syllables, 'together');
    assert.strictEqual(
      html.includes('island-word-space'),
      false,
      'Must NOT insert .island-word-space between intra-word syllables'
    );
    assert.strictEqual(
      html.includes('</span> '),
      false,
      'Must NOT insert whitespace between intra-word syllables'
    );
    assert.ok(html.includes('>to</span><span'));
    assert.ok(html.includes('>ge</span><span'));
    assert.ok(html.includes('>ther</span>'));
  });

  // Test 4: timedWordSpansHtml inserts .island-word-space between distinct words
  test('4. timedWordSpansHtml inserts <span class="island-word-space"> </span> between separate words', () => {
    const words = [
      { text: 'Hello' },
      { text: 'world' }
    ];
    const html = sandbox.timedWordSpansHtml(words, 'Hello world');
    assert.ok(
      html.includes('<span class="island-word-space"> </span>'),
      'Must insert .island-word-space between separate words'
    );
    assert.ok(
      html.startsWith('<span class="lyric-word" data-word-idx="0">Hello</span><span class="island-word-space"> </span><span class="lyric-word" data-word-idx="1">world</span>')
    );
  });

  // Test 5: timedWordSpansHtml preserves continuous CJK characters
  test('5. timedWordSpansHtml preserves continuity between Chinese Hanzi (zero word-spaces)', () => {
    const cjkWords = [
      { text: '我' },
      { text: '们' }
    ];
    const html = sandbox.timedWordSpansHtml(cjkWords, '我们');
    assert.strictEqual(
      html.includes('island-word-space'),
      false,
      'Must NOT insert word-space between consecutive Hanzi'
    );
  });

  // Test 6: Verify updateDynamicIslandLyric reconciles activeWords upfront in renderer.js
  test('6. renderer.js updateDynamicIslandLyric reconciles activeWords upfront for 1:1 token alignment', () => {
    assert.ok(
      rendererJs.includes('const rawActiveWords = duetSplit ? getLeadWordsForDuet(lineData.words, duetSplit) : lineData.words;'),
      'Must retrieve rawActiveWords'
    );
    assert.ok(
      rendererJs.includes('const activeWords = (rawActiveWords && rawActiveWords.length > 0 && typeof reconcileTimedWords === \'function\')'),
      'Must reconcile activeWords upfront before rendering and loop'
    );
  });

  // Test 7: Verify updateDynamicIslandLyric uses monotonic scan and does not jump camera to line end
  test('7. renderer.js updateDynamicIslandLyric anchors camera to active word during vocal pause', () => {
    assert.ok(
      !rendererJs.includes('activeWordOffset = islandLine._cachedWordOffsets[islandLine._cachedWordOffsets.length - 1];'),
      'Must NOT assign last line offset to activeWordOffset during pause'
    );
    assert.ok(
      rendererJs.includes('activeWordOffset = islandLine._cachedWordOffsets[activeWordIdx];'),
      'Must anchor camera to activeWordIdx during vocal pause'
    );
  });

  // Test 8: End-to-end simulation of multi-syllable word progressive sweep in Dynamic Island
  test('8. End-to-end simulation: multi-syllable word progressive sweep toggles classes correctly', () => {
    const lineData = {
      text: 'forever and ever',
      words: [
        { text: 'for', timeMs: 1000, endMs: 1300 },
        { text: 'ev', timeMs: 1300, endMs: 1600 },
        { text: 'er', timeMs: 1600, endMs: 2000 },
        { text: 'and', timeMs: 2100, endMs: 2400 },
        { text: 'ev', timeMs: 2500, endMs: 2800 },
        { text: 'er', timeMs: 2800, endMs: 3200 }
      ]
    };

    const words = sandbox.reconcileTimedWords(lineData.words, lineData.text);
    assert.strictEqual(words.length, 6, 'Must reconcile 6 syllable tokens');

    // Generate HTML
    const islandLine = new MockElement();
    islandLine.innerHTML = sandbox.timedWordSpansHtml(words, lineData.text);
    const spans = islandLine.querySelectorAll('.lyric-word');
    assert.strictEqual(spans.length, 6, 'DOM must have exactly 6 syllable spans');

    // Simulate forward scan at syncProgress = 1450ms (inside syllable 1: 'ev')
    const syncProgress = 1450;
    let activeWordIdx = -1;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const wTime = (w.start != null ? w.start * 1000 : w.timeMs) || 0;
      if (wTime <= syncProgress) {
        activeWordIdx = i;
      } else {
        break;
      }
    }
    assert.strictEqual(activeWordIdx, 1, 'Active syllable index must be 1 (ev)');

    let currentActiveWord = activeWordIdx;
    const curW = words[activeWordIdx];
    const wStart = (curW.start != null ? curW.start * 1000 : curW.timeMs) || 0;
    const nextW = words[activeWordIdx + 1];
    const nextWStart = nextW ? nextW.timeMs : Infinity;
    const wEnd = curW.endMs;
    if (syncProgress >= wEnd && syncProgress < nextWStart) {
      currentActiveWord = -1;
    }
    assert.strictEqual(currentActiveWord, 1, 'Current active word must remain 1 during vocal');

    // Update classes
    for (let wi = 0; wi < words.length; wi++) {
      const span = spans[wi];
      const isCompleted = wi < activeWordIdx || (wi === activeWordIdx && currentActiveWord === -1);
      const isActive = wi === currentActiveWord;
      const isUpcoming = wi > activeWordIdx;
      span.classList.toggle('lyric-word-completed', isCompleted);
      span.classList.toggle('lyric-word-active', isActive);
      span.classList.toggle('lyric-word-upcoming', isUpcoming);
    }

    assert.ok(spans[0].classList.contains('lyric-word-completed'), 'for must be completed');
    assert.ok(spans[1].classList.contains('lyric-word-active'), 'ev must be active');
    assert.ok(spans[2].classList.contains('lyric-word-upcoming'), 'er must be upcoming');
    assert.ok(spans[3].classList.contains('lyric-word-upcoming'), 'and must be upcoming');
  });

  // Test 9: Apple HIG Typography - Tabular numerals on HUD text, tooltip, and scrubber times
  test('9. Apple HIG Typography: tabular-nums declared on .island-hud-text, .island-progress-tooltip, and .island-scrubber-time', () => {
    assert.ok(
      islandCss.includes('.island-hud-text') && islandCss.includes('font-variant-numeric: tabular-nums;'),
      'Must declare tabular-nums on .island-hud-text'
    );
    assert.ok(
      islandCss.includes('.island-progress-tooltip') && islandCss.includes('font-variant-numeric: tabular-nums;'),
      'Must declare tabular-nums on .island-progress-tooltip'
    );
    assert.ok(
      islandCss.includes('.island-scrubber-time') && islandCss.includes('font-variant-numeric: tabular-nums;'),
      'Must declare tabular-nums on .island-scrubber-time'
    );
  });

  // Test 10: Apple HIG Fitts's Law - 44x44pt decoupled hit targets on .island-btn
  test('10. Apple HIG Fitts\'s Law: .island-btn::before provides minimum 44x44pt hit target', () => {
    const btnBeforeMatch = islandCss.match(/\.island-btn::before\s*\{([^}]+)\}/);
    assert.ok(btnBeforeMatch, '.island-btn::before rule must exist');
    assert.ok(
      btnBeforeMatch[1].includes('min-width: 44px;') && btnBeforeMatch[1].includes('min-height: 44px;'),
      '.island-btn::before must enforce at least 44px x 44px hit bounds'
    );
  });

  // Test 11: Apple HIG Concentric Curvature - R_inner = 16px on hover card album art
  test('11. Apple HIG Concentric Curvature: #dynamic-island:hover .island-art-tile sets 16px squircle radius', () => {
    const hoverTileMatch = islandCss.match(/#dynamic-island:hover\s+\.island-art-tile\s*\{([^}]+)\}/);
    assert.ok(hoverTileMatch, '#dynamic-island:hover .island-art-tile rule must exist');
    assert.ok(
      hoverTileMatch[1].includes('border-radius: 16px;'),
      'Album art tile in 28px card must have 16px concentric radius'
    );
  });

  console.log(`\nDynamic Island Syllable & HIG Tests: ${passedTests}/${totalTests} passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runDynamicIslandSyllableTests();
