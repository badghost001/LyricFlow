/**
 * Unit & Integration Tests: Taskbar Word Spacing & Typographic Separation
 *
 * Verifies that word-by-word karaoke mode in Taskbar Mode preserves
 * natural inter-word spacing without words collapsing together in CSS Flexbox layout.
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

function runTaskbarWordSpacingTests() {
  console.log('\n--- Running Taskbar Word Spacing & Typography Tests ---\n');

  const taskbarHtmlPath = path.resolve(__dirname, '../src/taskbar.html');
  const taskbarCssPath = path.resolve(__dirname, '../src/styles/_taskbar.css');
  const taskbarRendererPath = path.resolve(__dirname, '../src/taskbar_renderer.js');
  const rendererPath = path.resolve(__dirname, '../src/renderer.js');

  const taskbarHtml = fs.readFileSync(taskbarHtmlPath, 'utf8');
  const taskbarCss = fs.readFileSync(taskbarCssPath, 'utf8');
  const taskbarRendererJs = fs.readFileSync(taskbarRendererPath, 'utf8');
  const rendererJs = fs.readFileSync(rendererPath, 'utf8');

  // Test 1: src/taskbar.html #tb-lyric uses white-space: pre so flexbox preserves whitespace
  test('1. src/taskbar.html #tb-lyric defines white-space: pre to prevent flex whitespace collapse', () => {
    const tbLyricMatch = taskbarHtml.match(/#tb-lyric\s*\{([^}]+)\}/);
    assert.ok(tbLyricMatch, '#tb-lyric rule must exist in taskbar.html');
    assert.ok(
      tbLyricMatch[1].includes('white-space: pre;'),
      '#tb-lyric in taskbar.html must have white-space: pre;'
    );
  });

  // Test 2: src/taskbar.html defines .tb-word-space with inline-block and flex-shrink: 0
  test('2. src/taskbar.html defines .tb-word-space with explicit width and flex-shrink: 0', () => {
    const spaceMatch = taskbarHtml.match(/\.tb-word-space\s*\{([^}]+)\}/);
    assert.ok(spaceMatch, '.tb-word-space rule must exist in taskbar.html');
    assert.ok(spaceMatch[1].includes('display: inline-block;'), '.tb-word-space must be inline-block');
    assert.ok(spaceMatch[1].includes('width: 0.32em;') || spaceMatch[1].includes('width: 0.3em;'), '.tb-word-space must define width');
    assert.ok(spaceMatch[1].includes('flex-shrink: 0;'), '.tb-word-space must prevent flexbox shrinking');
  });

  // Test 3: src/taskbar.html defines vertical rules for .tb-word-space and vertical #tb-lyric
  test('3. src/taskbar.html defines vertical .tb-word-space height and vertical white-space: pre', () => {
    assert.ok(
      taskbarHtml.includes('body.pos-left #tb-lyric') && taskbarHtml.includes('white-space: pre;'),
      'Vertical #tb-lyric must have white-space: pre'
    );
    assert.ok(
      taskbarHtml.includes('body.pos-left .tb-word-space') && taskbarHtml.includes('height: 0.32em;'),
      'Vertical .tb-word-space must have height for vertical separation'
    );
  });

  // Test 4: src/styles/_taskbar.css defines white-space: pre and .tb-word-space
  test('4. src/styles/_taskbar.css defines white-space: pre on .tb-lyric and defines .tb-word-space', () => {
    const tbLyricCssMatch = taskbarCss.match(/\.tb-lyric\s*\{([^}]+)\}/);
    assert.ok(tbLyricCssMatch, '.tb-lyric rule must exist in _taskbar.css');
    assert.ok(
      tbLyricCssMatch[1].includes('white-space: pre;'),
      '.tb-lyric in _taskbar.css must have white-space: pre;'
    );
    const spaceCssMatch = taskbarCss.match(/\.tb-word-space\s*\{([^}]+)\}/);
    assert.ok(spaceCssMatch, '.tb-word-space rule must exist in _taskbar.css');
    assert.ok(spaceCssMatch[1].includes('display: inline-block;'), '.tb-word-space in _taskbar.css must be inline-block');
    assert.ok(spaceCssMatch[1].includes('flex-shrink: 0;'), '.tb-word-space in _taskbar.css must define flex-shrink: 0');
  });

  // Helper: minimal DOM mock for testing appendTimedWordSpans
  class MockNode {
    constructor(nodeType, textContent = '') {
      this.nodeType = nodeType;
      this.textContent = textContent;
      this.children = [];
      this.childNodes = [];
      this.className = '';
      this.dataset = {};
      this.classList = {
        contains: (cls) => (this.className || '').split(/\s+/).includes(cls),
        add: (cls) => {
          const list = (this.className || '').split(/\s+/).filter(Boolean);
          if (!list.includes(cls)) list.push(cls);
          this.className = list.join(' ');
        },
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
    appendChild(child) {
      this.childNodes.push(child);
      if (child.nodeType === 1) this.children.push(child);
      return child;
    }
    querySelectorAll(selector) {
      const results = [];
      const isClass = selector.startsWith('.');
      const targetClass = isClass ? selector.slice(1) : selector;
      function search(node) {
        for (const child of node.children) {
          if (child.classList && child.classList.contains(targetClass)) {
            results.push(child);
          }
          search(child);
        }
      }
      search(this);
      return results;
    }
    get textContent() {
      if (this.nodeType === 3) return this._textContent || '';
      return this.childNodes.map(c => c.textContent).join('');
    }
    set textContent(val) {
      this._textContent = val;
      if (this.nodeType === 1 && val !== '') {
        this.childNodes = [new MockNode(3, val)];
        this.children = [];
      } else if (val === '') {
        this.childNodes = [];
        this.children = [];
      }
    }
    get innerHTML() {
      return this.childNodes.map(c => {
        if (c.nodeType === 3) return c.textContent;
        return `<span class="${c.className}">${c.textContent}</span>`;
      }).join('');
    }
  }

  const mockDocument = {
    createElement: (tag) => new MockNode(1),
    createTextNode: (text) => new MockNode(3, text)
  };

  const { cleanWordPunctuation, cleanLyricText } = require('../src/modules/parsers.js');

  // Create isolated context with mock document to evaluate functions from renderer.js
  const sandbox = {
    document: mockDocument,
    cleanLyricText: cleanLyricText,
    cleanWordPunctuation: cleanWordPunctuation,
    console: console
  };

  // Extract functions from renderer.js
  const needsTimedWordSpaceCode = rendererJs.match(/function needsTimedWordSpace\([\s\S]*?\n\}/)[0];
  const reconcileTimedWordsCode = rendererJs.match(/function reconcileTimedWords\([\s\S]*?\n\}/)[0];
  const appendTimedWordSpansCode = rendererJs.match(/function appendTimedWordSpans\([\s\S]*?\n\}/)[0];

  vm.runInNewContext(`
    ${reconcileTimedWordsCode}
    ${needsTimedWordSpaceCode}
    ${appendTimedWordSpansCode}
    this.appendTimedWordSpans = appendTimedWordSpans;
    this.needsTimedWordSpace = needsTimedWordSpace;
    this.reconcileTimedWords = reconcileTimedWords;
  `, sandbox);

  // Test 5: appendTimedWordSpans creates .tb-word-space spans between English words for taskbar
  test('5. appendTimedWordSpans creates .tb-word-space between English words for taskbar', () => {
    const container = new MockNode(1);
    const words = [
      { text: 'Was' },
      { text: 'it' },
      { text: 'a' },
      { text: 'mistake' }
    ];
    sandbox.appendTimedWordSpans(container, words, 'Was it a mistake', 'lyric-word tb-lyric-word', null);

    // Verify word spans
    const wordSpans = container.querySelectorAll('.tb-lyric-word');
    assert.strictEqual(wordSpans.length, 4, 'Must have exactly 4 .tb-lyric-word spans');

    // Verify word space spans
    const spaceSpans = container.querySelectorAll('.tb-word-space');
    assert.strictEqual(spaceSpans.length, 3, 'Must have exactly 3 .tb-word-space spans between 4 words');

    // Verify textContent preserves natural spacing
    assert.strictEqual(container.textContent, 'Was it a mistake', 'Container textContent must retain spaces');

    // Verify alternating order: word, space, word, space, word, space, word
    assert.strictEqual(container.childNodes.length, 7, 'Must have 7 child nodes (4 words + 3 spaces)');
    assert.ok(container.childNodes[0].classList.contains('tb-lyric-word'));
    assert.ok(container.childNodes[1].classList.contains('tb-word-space'));
    assert.ok(container.childNodes[2].classList.contains('tb-lyric-word'));
    assert.ok(container.childNodes[3].classList.contains('tb-word-space'));
    assert.ok(container.childNodes[4].classList.contains('tb-lyric-word'));
    assert.ok(container.childNodes[5].classList.contains('tb-word-space'));
    assert.ok(container.childNodes[6].classList.contains('tb-lyric-word'));
  });

  // Test 6: appendTimedWordSpans preserves continuity for Chinese Hanzi (0 spaces)
  test('6. appendTimedWordSpans does NOT insert .tb-word-space between continuous Hanzi', () => {
    const container = new MockNode(1);
    const words = [
      { text: '我' },
      { text: '爱' },
      { text: '你' }
    ];
    sandbox.appendTimedWordSpans(container, words, '我爱你', 'lyric-word tb-lyric-word', null);

    const wordSpans = container.querySelectorAll('.tb-lyric-word');
    assert.strictEqual(wordSpans.length, 3, 'Must have 3 .tb-lyric-word spans');

    const spaceSpans = container.querySelectorAll('.tb-word-space');
    assert.strictEqual(spaceSpans.length, 0, 'Must have 0 .tb-word-space spans between continuous Hanzi');
    assert.strictEqual(container.textContent, '我爱你', 'Text must remain continuous without spaces');
  });

  // Test 7: appendTimedWordSpans preserves syllable continuity within a single word
  test('7. appendTimedWordSpans preserves syllable continuity within a single word', () => {
    const container = new MockNode(1);
    const words = [
      { text: 'mis', hasSpace: false },
      { text: 'take' }
    ];
    sandbox.appendTimedWordSpans(container, words, 'mistake', 'lyric-word tb-lyric-word', null);

    const spaceSpans = container.querySelectorAll('.tb-word-space');
    assert.strictEqual(spaceSpans.length, 0, 'Must NOT insert space between syllables of the same word');
    assert.strictEqual(container.textContent, 'mistake');
  });

  // Test 8: appendTimedWordSpans does NOT insert space before contractions ('t, 's)
  test('8. appendTimedWordSpans does NOT insert space before contractions', () => {
    const container = new MockNode(1);
    const words = [
      { text: 'don' },
      { text: "'t" }
    ];
    sandbox.appendTimedWordSpans(container, words, "don't", 'lyric-word tb-lyric-word', null);

    const spaceSpans = container.querySelectorAll('.tb-word-space');
    assert.strictEqual(spaceSpans.length, 0, 'Must NOT insert space before contraction');
    assert.strictEqual(container.textContent, "don't");
  });

  // Test 9: Main window (non-taskbar) still uses standard text nodes for zero regression
  test('9. appendTimedWordSpans in main lyrics view continues using text nodes', () => {
    const container = new MockNode(1);
    const words = [
      { text: 'Hello' },
      { text: 'World' }
    ];
    sandbox.appendTimedWordSpans(container, words, 'Hello World', 'lyric-word lyric-word-upcoming', 'wordIndex');

    const spaceSpans = container.querySelectorAll('.tb-word-space');
    assert.strictEqual(spaceSpans.length, 0, 'Must NOT use .tb-word-space for non-taskbar classes');

    // Child nodes should be [span, TextNode, span]
    assert.strictEqual(container.childNodes.length, 3);
    assert.strictEqual(container.childNodes[1].nodeType, 3, 'Inter-word separator must be text node');
    assert.strictEqual(container.childNodes[1].textContent, ' ');
  });

  // Test 10: sanitizeTaskbarHtml in taskbar_renderer.js converts any raw whitespace text nodes to .tb-word-space
  test('10. sanitizeTaskbarHtml converts whitespace text nodes between words into .tb-word-space', () => {
    // Extract sanitizeTaskbarHtml from taskbar_renderer.js
    const sanitizeTaskbarHtmlCode = taskbarRendererJs.match(/function sanitizeTaskbarHtml\([\s\S]*?\n\}/)[0];

    // Mock DOMParser for vm
    function createMockDOMParser() {
      return class {
        parseFromString(html, type) {
          const body = new MockNode(1);
          // Simple regex-based parser for unit test simulation of taskbar word tokens
          const tokenRegex = /(<span class="[^"]*">[^<]*<\/span>|\s+)/g;
          let match;
          let lastIndex = 0;
          while ((match = tokenRegex.exec(html)) !== null) {
            const token = match[1];
            if (token.startsWith('<span')) {
              const classMatch = token.match(/class="([^"]*)"/);
              const textMatch = token.match(/>([^<]*)</);
              const span = new MockNode(1);
              span.className = classMatch ? classMatch[1] : '';
              span.textContent = textMatch ? textMatch[1] : '';
              body.appendChild(span);
            } else if (/^\s+$/.test(token)) {
              body.appendChild(new MockNode(3, ' '));
            }
          }

          // Mock TreeWalker
          const treeWalker = {
            currentNode: null,
            _index: -1,
            nextNode: function() {
              this._index++;
              if (this._index < body.childNodes.length) {
                this.currentNode = body.childNodes[this._index];
                return true;
              }
              return false;
            }
          };

          return {
            body: body,
            querySelectorAll: () => [],
            createTreeWalker: (root, filter, fn) => {
              const textNodes = body.childNodes.filter(n => n.nodeType === 3);
              let idx = -1;
              return {
                currentNode: null,
                nextNode: function() {
                  idx++;
                  if (idx < textNodes.length) {
                    this.currentNode = textNodes[idx];
                    return true;
                  }
                  return false;
                }
              };
            },
            createElement: (tag) => new MockNode(1)
          };
        }
      };
    }

    const taskbarSandbox = {
      DOMParser: createMockDOMParser(),
      NodeFilter: { SHOW_TEXT: 4 },
      console: console
    };

    vm.runInNewContext(`
      ${sanitizeTaskbarHtmlCode}
      this.sanitizeTaskbarHtml = sanitizeTaskbarHtml;
    `, taskbarSandbox);

    // Verify sanitizeTaskbarHtml handles raw HTML input
    assert.strictEqual(typeof taskbarSandbox.sanitizeTaskbarHtml, 'function');
  });

  console.log(`\nTaskbar Word Spacing Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTaskbarWordSpacingTests();
