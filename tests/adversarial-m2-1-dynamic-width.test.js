/**
 * tests/adversarial-m2-1-dynamic-width.test.js
 *
 * EMPIRICAL ADVERSARIAL CHALLENGE SUITE: MILESTONE M2 (Feature 5 & Feature 6)
 * Role: EMPIRICAL CHALLENGER (critic, specialist)
 * Target: Split View Dynamic Width Sizing & Song Details Isolation
 *
 * Adversarially stress-tests:
 * 1. Feature 5 (Dynamic Width Sizing):
 *    - Expanded Album Art Auto-Hide Idle:
 *      * body.layout-split.auto-hide-controls -> min(280px, 80%), max-width: 280px, margin: 0 auto
 *      * body.layout-split.auto-hide-collapsed -> min(280px, 80%), max-width: 280px, margin: 0 auto
 *      * body.layout-split.auto-hide-faded -> min(280px, 80%), max-width: 280px, margin: 0 auto
 *    - Unexpanded Rest State & Hover Recovery:
 *      * body.layout-split (unexpanded rest) -> width: 100%, max-width: none, flex: 1 1 100%
 *      * Hover over .studio-sidebar -> width: 100%, max-width: none, flex: 1 1 100%, margin: 0
 *      * Hover over .studio-art-container -> width: 100%, max-width: none, flex: 1 1 100%, margin: 0
 *      * Hover over #playback-widget -> width: 100%, max-width: none, flex: 1 1 100%, margin: 0
 *      * Hover over .widget-track-panel directly -> width: 100%, max-width: none, flex: 1 1 100%
 *      * Active scrubbing (.is-scrubbing) -> width: 100%, max-width: none, flex: 1 1 100%
 *    - Mode Invariants (Non-Split Exclusions):
 *      * wallpaper-mode, mode-dynamic-island, taskbar-mode, cinematic-view-active excluded
 *    - .app-container Parity:
 *      * Verify whether auto-hide classes on .app-container instead of body achieve full parity
 *    - Legacy Rule Non-Interference:
 *      * Verify _layout.css:201 legacy .playback-widget does NOT match when body.layout-split is active
 * 2. Feature 6 (Song Details Isolation):
 *    - Verify #playback-widget .track-details and .widget-art-container have display: none !important
 *    - Verify wildcard descendants (*): #widget-track-name, #widget-artist-name, #btn-hide-lyrics, etc.
 *    - Verify across all combinations: auto-hide states, hover, light mode, app-container.layout-split
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  STARTING ADVERSARIAL CHALLENGE SUITE: MILESTONE M2 (FEATURES 5 & 6)');
console.log('================================================================\n');

const studioCssPath = path.resolve(__dirname, '../src/styles/_studio.css');
const layoutCssPath = path.resolve(__dirname, '../src/styles/_layout.css');
const playbackCssPath = path.resolve(__dirname, '../src/styles/_playback.css');

assert.ok(fs.existsSync(studioCssPath), '_studio.css must exist');
assert.ok(fs.existsSync(layoutCssPath), '_layout.css must exist');
assert.ok(fs.existsSync(playbackCssPath), '_playback.css must exist');

const studioCss = fs.readFileSync(studioCssPath, 'utf8');
const layoutCss = fs.readFileSync(layoutCssPath, 'utf8');
const playbackCss = fs.readFileSync(playbackCssPath, 'utf8');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function challenge(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [CHALLENGE PASSED] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ [CHALLENGE FAILED] ${name}`);
    console.error(`         Reason: ${err.message}`);
    failureDetails.push({ name, error: err.message });
  }
}

// ============================================================================
// SIMULATED DOM & CSS CASCADE ENGINE
// ============================================================================

/**
 * Builds a DOM element node representation.
 */
function createElement(tag, id, classes = [], attributes = {}) {
  return {
    tag: tag.toLowerCase(),
    id: id || null,
    classes: new Set(classes),
    attributes: { ...attributes },
    parent: null,
    children: [],
    isHovered: false,
    isScrubbing: false,
    addClass(c) { this.classes.add(c); return this; },
    removeClass(c) { this.classes.delete(c); return this; },
    hasClass(c) { return this.classes.has(c); },
    setHover(h) { this.isHovered = Boolean(h); return this; },
    setScrubbing(s) {
      this.isScrubbing = Boolean(s);
      if (s) this.classes.add('is-scrubbing');
      else this.classes.delete('is-scrubbing');
      return this;
    }
  };
}

function appendChild(parent, child) {
  child.parent = parent;
  parent.children.push(child);
  return child;
}

/**
 * Constructs a mock standard LyricFlow document tree.
 */
function createLyricFlowDOM(options = {}) {
  const html = createElement('html', null, options.htmlClasses || [], {
    'data-theme': options.theme || 'dark'
  });
  const body = createElement('body', null, options.bodyClasses || ['layout-split']);
  appendChild(html, body);

  const appContainer = createElement('div', null, ['app-container', ...(options.appContainerClasses || [])]);
  appendChild(body, appContainer);

  const screenLyrics = createElement('div', 'screen-lyrics', ['screen-lyrics']);
  appendChild(appContainer, screenLyrics);

  const studioSidebar = createElement('aside', 'studio-sidebar', ['studio-sidebar']);
  appendChild(screenLyrics, studioSidebar);

  const studioArtContainer = createElement('div', null, ['studio-art-container']);
  appendChild(studioSidebar, studioArtContainer);

  const studioArtWrapper = createElement('div', 'studio-art-wrapper', ['studio-art-wrapper']);
  appendChild(studioArtContainer, studioArtWrapper);

  const studioArtImg = createElement('img', 'studio-art-img', ['studio-art-img']);
  appendChild(studioArtWrapper, studioArtImg);

  const studioTrackMeta = createElement('div', null, ['studio-track-meta']);
  appendChild(studioSidebar, studioTrackMeta);

  const studioTrackTitle = createElement('h1', 'studio-track-title', ['studio-track-title']);
  appendChild(studioTrackMeta, studioTrackTitle);

  const studioTrackArtist = createElement('span', 'studio-track-artist', ['studio-track-artist']);
  appendChild(studioTrackMeta, studioTrackArtist);

  const playbackWidget = createElement('footer', 'playback-widget', ['playback-widget']);
  appendChild(screenLyrics, playbackWidget);

  const widgetTrackPanel = createElement('div', null, ['widget-track-panel']);
  appendChild(playbackWidget, widgetTrackPanel);

  const widgetArtContainer = createElement('div', null, ['widget-art-container']);
  appendChild(widgetTrackPanel, widgetArtContainer);

  const widgetAlbumArt = createElement('img', 'widget-album-art', ['widget-album-art']);
  appendChild(widgetArtContainer, widgetAlbumArt);

  const widgetArtFallback = createElement('div', 'widget-art-fallback', ['art-fallback']);
  appendChild(widgetArtContainer, widgetArtFallback);

  const widgetInfo = createElement('div', null, ['widget-info']);
  appendChild(widgetTrackPanel, widgetInfo);

  const trackDetails = createElement('div', null, ['track-details']);
  appendChild(widgetInfo, trackDetails);

  const trackNameWrapper = createElement('div', 'widget-track-name-wrapper', ['track-name-wrapper']);
  appendChild(trackDetails, trackNameWrapper);

  const trackName = createElement('span', 'widget-track-name', ['track-name']);
  appendChild(trackNameWrapper, trackName);

  const artistName = createElement('span', 'widget-artist-name', ['artist-name']);
  appendChild(trackDetails, artistName);

  const btnHideLyrics = createElement('button', 'btn-hide-lyrics', ['btn-hide-lyrics']);
  appendChild(trackDetails, btnHideLyrics);

  const progressBarContainer = createElement('div', null, ['progress-bar-container']);
  appendChild(widgetInfo, progressBarContainer);

  const mainProgressTrack = createElement('div', 'main-progress-track', ['progress-bar-bg']);
  appendChild(progressBarContainer, mainProgressTrack);

  const widgetProgressFill = createElement('div', 'widget-progress-fill', ['progress-bar-fill']);
  appendChild(mainProgressTrack, widgetProgressFill);

  const widgetControls = createElement('div', null, ['widget-controls']);
  appendChild(playbackWidget, widgetControls);

  return {
    html,
    body,
    appContainer,
    screenLyrics,
    studioSidebar,
    studioArtContainer,
    playbackWidget,
    widgetTrackPanel,
    widgetArtContainer,
    widgetAlbumArt,
    widgetInfo,
    trackDetails,
    trackName,
    artistName,
    btnHideLyrics,
    progressBarContainer,
    mainProgressTrack
  };
}

/**
 * Extracts CSS rule blocks from stylesheet text.
 */
function parseCssRules(cssText) {
  const rules = [];
  // Strip CSS comments
  const stripped = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;
  let ruleIndex = 0;

  while ((match = ruleRegex.exec(stripped)) !== null) {
    const rawSelectors = match[1].trim();
    const rawDeclarations = match[2].trim();
    if (rawSelectors.startsWith('@')) continue; // Skip @keyframes, @media for this evaluation

    const declarations = {};
    const declList = rawDeclarations.split(';');
    for (const decl of declList) {
      const colIdx = decl.indexOf(':');
      if (colIdx === -1) continue;
      const prop = decl.substring(0, colIdx).trim().toLowerCase();
      const val = decl.substring(colIdx + 1).trim();
      if (!prop || !val) continue;
      const isImportant = val.includes('!important');
      const cleanVal = val.replace(/!important/g, '').trim();
      declarations[prop] = { value: cleanVal, important: isImportant };
    }

    // Split compound selector lists (comma-separated, respecting parentheses like :is(...))
    const selectorList = splitSelectorList(rawSelectors);
    for (const sel of selectorList) {
      rules.push({
        selector: sel.trim(),
        declarations,
        order: ruleIndex++
      });
    }
  }
  return rules;
}

function splitSelectorList(raw) {
  const list = [];
  let current = '';
  let parenDepth = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth--;
    else if (ch === ',' && parenDepth === 0) {
      if (current.trim()) list.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) list.push(current.trim());
  return list;
}

/**
 * Computes selector specificity [ids, classes, tags]
 */
function computeSpecificity(selector) {
  let ids = 0;
  let classes = 0;
  let tags = 0;

  // Handle :is(...) and :not(...)
  // Remove :is(...) content and add max specificity
  const isMatch = selector.match(/:is\(([^)]+)\)/g);
  if (isMatch) {
    for (const m of isMatch) {
      const inner = m.slice(4, -1);
      const subSels = splitSelectorList(inner);
      let maxSub = [0, 0, 0];
      for (const s of subSels) {
        const spec = computeSpecificity(s);
        if (compareSpecificity(spec, maxSub) > 0) maxSub = spec;
      }
      ids += maxSub[0];
      classes += maxSub[1];
      tags += maxSub[2];
    }
  }

  const notMatch = selector.match(/:not\(([^)]+)\)/g);
  if (notMatch) {
    for (const m of notMatch) {
      const inner = m.slice(5, -1);
      const subSels = splitSelectorList(inner);
      let maxSub = [0, 0, 0];
      for (const s of subSels) {
        const spec = computeSpecificity(s);
        if (compareSpecificity(spec, maxSub) > 0) maxSub = spec;
      }
      ids += maxSub[0];
      classes += maxSub[1];
      tags += maxSub[2];
    }
  }

  const hasMatch = selector.match(/:has\(([^)]+)\)/g);
  if (hasMatch) {
    for (const m of hasMatch) {
      const inner = m.slice(5, -1);
      const spec = computeSpecificity(inner);
      ids += spec[0];
      classes += spec[1];
      tags += spec[2];
    }
  }

  // Clean pseudo-functions from selector to count remaining simple tokens
  const clean = selector
    .replace(/:is\([^)]+\)/g, '')
    .replace(/:not\([^)]+\)/g, '')
    .replace(/:has\([^)]+\)/g, '');

  const idMatches = clean.match(/#[a-zA-Z0-9_-]+/g);
  if (idMatches) ids += idMatches.length;

  const classMatches = clean.match(/\.[a-zA-Z0-9_-]+/g);
  if (classMatches) classes += classMatches.length;

  const pseudoMatches = clean.match(/:hover|:focus-within/g);
  if (pseudoMatches) classes += pseudoMatches.length;

  const attrMatches = clean.match(/\[[^\]]+\]/g);
  if (attrMatches) classes += attrMatches.length;

  // Tags (words preceded by start, space, >, ~, +)
  const tagMatches = clean.match(/(?:^|[\s>~+])([a-zA-Z][a-zA-Z0-9]*)(?=[.#:\[\s>~+]|$)/g);
  if (tagMatches) {
    for (const tm of tagMatches) {
      const t = tm.trim().replace(/^[>~+]\s*/, '');
      if (t) tags++;
    }
  }

  return [ids, classes, tags];
}

function compareSpecificity(a, b) {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

/**
 * Matches a single element against simple compound selector tokens (e.g. "body.layout-split:hover")
 */
function matchesSimple(el, token) {
  if (token === '*') return true;
  if (!el) return false;

  // Split pseudo-functions
  let cur = token;

  // Check :hover
  if (cur.includes(':hover')) {
    if (!el.isHovered) return false;
    cur = cur.replace(/:hover/g, '');
  }

  // Check :is(...)
  const isMatch = cur.match(/:is\(([^)]+)\)/);
  if (isMatch) {
    const inner = isMatch[1];
    const subList = splitSelectorList(inner);
    const anyMatch = subList.some(s => matchesSimple(el, s));
    if (!anyMatch) return false;
    cur = cur.replace(isMatch[0], '');
  }

  // Check :not(...)
  const notMatches = cur.match(/:not\(([^)]+)\)/g);
  if (notMatches) {
    for (const nm of notMatches) {
      const inner = nm.slice(5, -1);
      const subList = splitSelectorList(inner);
      const anyMatch = subList.some(s => matchesSimple(el, s));
      if (anyMatch) return false;
      cur = cur.replace(nm, '');
    }
  }

  // Check [attr="val"]
  const attrMatches = cur.match(/\[([a-zA-Z0-9_-]+)(?:="([^"]+)")?\]/g);
  if (attrMatches) {
    for (const am of attrMatches) {
      const m = am.match(/\[([a-zA-Z0-9_-]+)(?:="([^"]+)")?\]/);
      const attrName = m[1];
      const attrVal = m[2];
      if (attrVal !== undefined) {
        if (el.attributes[attrName] !== attrVal) return false;
      } else {
        if (!(attrName in el.attributes)) return false;
      }
      cur = cur.replace(am, '');
    }
  }

  // Check ID
  const idMatch = cur.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    if (el.id !== idMatch[1]) return false;
    cur = cur.replace(idMatch[0], '');
  }

  // Check classes
  const classMatches = cur.match(/\.([a-zA-Z0-9_-]+)/g);
  if (classMatches) {
    for (const cm of classMatches) {
      const cls = cm.substring(1);
      if (!el.hasClass(cls)) return false;
      cur = cur.replace(cm, '');
    }
  }

  // Remaining should be tag name
  const tag = cur.trim();
  if (tag && tag !== '*') {
    if (el.tag !== tag.toLowerCase()) return false;
  }

  return true;
}

/**
 * Checks if el or any descendant matches a selector
 */
function hasDescendantMatching(el, selector) {
  for (const child of el.children) {
    if (matchesSelector(selector, child)) return true;
    if (hasDescendantMatching(child, selector)) return true;
  }
  return false;
}

/**
 * Matches a full selector against a target element in the DOM tree.
 */
function matchesSelector(fullSelector, targetEl) {
  // Normalize whitespace around combinators
  const normalized = fullSelector
    .replace(/\s*>\s*/g, ' > ')
    .replace(/\s*~\s*/g, ' ~ ')
    .replace(/\s*\+\s*/g, ' + ')
    .trim();

  // Handle :has(...) pseudo-class on elements
  // e.g. #screen-lyrics:has(.studio-sidebar:hover)
  if (normalized.includes(':has(')) {
    // Parse out :has(...)
    const hasIdx = normalized.indexOf(':has(');
    let closeIdx = -1;
    let depth = 1;
    for (let i = hasIdx + 5; i < normalized.length; i++) {
      if (normalized[i] === '(') depth++;
      else if (normalized[i] === ')') {
        depth--;
        if (depth === 0) {
          closeIdx = i;
          break;
        }
      }
    }
    if (closeIdx !== -1) {
      const beforeHas = normalized.substring(0, hasIdx);
      const innerHas = normalized.substring(hasIdx + 5, closeIdx);
      const afterHas = normalized.substring(closeIdx + 1);

      let ancestor = targetEl.parent;
      let matchedAncestor = false;
      while (ancestor) {
        const mBefore = matchesSelector(beforeHas, ancestor);
        const mInner = hasDescendantMatching(ancestor, innerHas);
        if (mBefore && mInner) {
          matchedAncestor = true;
          break;
        }
        ancestor = ancestor.parent;
      }
      if (!matchedAncestor) return false;

      // Now verify targetEl matches the tail part (afterHas)
      if (afterHas.trim()) {
        const cleanTail = afterHas.trim().replace(/^[>~+]\s*/, '');
        return matchesSelector(cleanTail, targetEl);
      }
      return true;
    }
  }

  // Tokenize combinators: ' ', '>', '~', '+'
  const tokens = [];
  const combinators = [];
  let cur = '';
  let parenDepth = 0;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth--;

    if (parenDepth === 0) {
      if (ch === ' ' && normalized[i + 1] === '>' && normalized[i + 2] === ' ') {
        tokens.push(cur.trim());
        combinators.push('>');
        cur = '';
        i += 2;
        continue;
      } else if (ch === ' ' && normalized[i + 1] === '~' && normalized[i + 2] === ' ') {
        tokens.push(cur.trim());
        combinators.push('~');
        cur = '';
        i += 2;
        continue;
      } else if (ch === ' ' && normalized[i + 1] === '+' && normalized[i + 2] === ' ') {
        tokens.push(cur.trim());
        combinators.push('+');
        cur = '';
        i += 2;
        continue;
      } else if (ch === ' ') {
        tokens.push(cur.trim());
        combinators.push(' ');
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) tokens.push(cur.trim());

  if (tokens.length === 0) return false;

  // The last token must match targetEl
  const lastToken = tokens[tokens.length - 1];
  if (!matchesSimple(targetEl, lastToken)) return false;

  // Walk backwards through combinators
  let currentEl = targetEl;
  for (let cIdx = combinators.length - 1; cIdx >= 0; cIdx--) {
    const comb = combinators[cIdx];
    const prevToken = tokens[cIdx];

    if (comb === '>') {
      currentEl = currentEl.parent;
      if (!currentEl || !matchesSimple(currentEl, prevToken)) return false;
    } else if (comb === ' ') {
      let found = false;
      let ancestor = currentEl.parent;
      while (ancestor) {
        if (matchesSimple(ancestor, prevToken)) {
          currentEl = ancestor;
          found = true;
          break;
        }
        ancestor = ancestor.parent;
      }
      if (!found) return false;
    } else if (comb === '~') {
      if (!currentEl.parent) return false;
      const siblings = currentEl.parent.children;
      const myIdx = siblings.indexOf(currentEl);
      let found = false;
      for (let s = 0; s < myIdx; s++) {
        if (matchesSimple(siblings[s], prevToken)) {
          currentEl = siblings[s];
          found = true;
          break;
        }
      }
      if (!found) return false;
    } else if (comb === '+') {
      if (!currentEl.parent) return false;
      const siblings = currentEl.parent.children;
      const myIdx = siblings.indexOf(currentEl);
      if (myIdx <= 0) return false;
      const prevSib = siblings[myIdx - 1];
      if (!matchesSimple(prevSib, prevToken)) return false;
      currentEl = prevSib;
    }
  }

  return true;
}

/**
 * Computes cascaded property value for a given DOM element across all parsed rules.
 */
function computeProperty(element, propertyName, allRules) {
  const matchingRules = [];

  for (const rule of allRules) {
    if (rule.declarations[propertyName]) {
      if (matchesSelector(rule.selector, element)) {
        const spec = computeSpecificity(rule.selector);
        matchingRules.push({
          rule,
          spec,
          decl: rule.declarations[propertyName]
        });
      }
    }
  }

  if (matchingRules.length === 0) return null;

  // Sort matching rules:
  // 1. !important (true > false)
  // 2. Specificity
  // 3. Source order (rule.order)
  matchingRules.sort((a, b) => {
    if (a.decl.important !== b.decl.important) {
      return a.decl.important ? 1 : -1;
    }
    const specDiff = compareSpecificity(a.spec, b.spec);
    if (specDiff !== 0) return specDiff;
    return a.rule.order - b.rule.order;
  });

  const winner = matchingRules[matchingRules.length - 1];
  return {
    value: winner.decl.value,
    important: winner.decl.important,
    winningSelector: winner.rule.selector,
    specificity: winner.spec
  };
}

// Parse all relevant CSS rules
const allStudioRules = parseCssRules(studioCss);
const allLayoutRules = parseCssRules(layoutCss);
const combinedRules = [...allLayoutRules, ...allStudioRules];

// ============================================================================
// SECTION 1: FEATURE 5 — EXPANDED ARTWORK IDLE SHRINK (BODY AUTO-HIDE)
// ============================================================================
console.log('--- SECTION 1: Dynamic Width Sizing — Expanded Album Art Shrink (Body) ---');

challenge('1.1: body.auto-hide-controls shrinks .widget-track-panel to min(280px, 80%)', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'auto-hide-controls'] });
  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.ok(widthProp, 'width property must be defined');
  assert.strictEqual(widthProp.value, 'min(280px, 80%)', 'width must evaluate to min(280px, 80%)');
  assert.strictEqual(widthProp.important, true, 'width must have !important');

  const maxWProp = computeProperty(dom.widgetTrackPanel, 'max-width', combinedRules);
  assert.strictEqual(maxWProp.value, '280px', 'max-width must evaluate to 280px');
  assert.strictEqual(maxWProp.important, true, 'max-width must have !important');

  const marginProp = computeProperty(dom.widgetTrackPanel, 'margin', combinedRules);
  assert.strictEqual(marginProp.value, '0 auto', 'margin must be centered (0 auto)');
  assert.strictEqual(marginProp.important, true, 'margin must have !important');

  const flexProp = computeProperty(dom.widgetTrackPanel, 'flex', combinedRules);
  assert.strictEqual(flexProp.value, '0 1 280px', 'flex must evaluate to 0 1 280px');
});

challenge('1.2: body.auto-hide-collapsed shrinks .widget-track-panel to min(280px, 80%)', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'auto-hide-collapsed'] });
  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.strictEqual(widthProp.value, 'min(280px, 80%)');
  assert.strictEqual(widthProp.important, true);

  const maxWProp = computeProperty(dom.widgetTrackPanel, 'max-width', combinedRules);
  assert.strictEqual(maxWProp.value, '280px');

  const marginProp = computeProperty(dom.widgetTrackPanel, 'margin', combinedRules);
  assert.strictEqual(marginProp.value, '0 auto');
});

challenge('1.3: body.auto-hide-faded shrinks .widget-track-panel to min(280px, 80%)', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'auto-hide-faded'] });
  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.strictEqual(widthProp.value, 'min(280px, 80%)');
  assert.strictEqual(widthProp.important, true);

  const maxWProp = computeProperty(dom.widgetTrackPanel, 'max-width', combinedRules);
  assert.strictEqual(maxWProp.value, '280px');
});

// ============================================================================
// SECTION 2: FEATURE 5 — UNEXPANDED REST STATE & HOVER OVERRIDES
// ============================================================================
console.log('\n--- SECTION 2: Dynamic Width Sizing — Unexpanded Rest & Hover Restoration ---');

challenge('2.1: body.layout-split unexpanded rest state retains width: 100%, max-width: none, flex: 1 1 100%', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split'] });
  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.strictEqual(widthProp.value, '100%', 'Unexpanded rest state must allocate 100% width');
  assert.strictEqual(widthProp.important, true);

  const maxWProp = computeProperty(dom.widgetTrackPanel, 'max-width', combinedRules);
  assert.strictEqual(maxWProp.value, 'none', 'Unexpanded rest state must have max-width: none');
  assert.strictEqual(maxWProp.important, true);

  const flexProp = computeProperty(dom.widgetTrackPanel, 'flex', combinedRules);
  assert.strictEqual(flexProp.value, '1 1 100%', 'Unexpanded rest state must have flex: 1 1 100%');
});

challenge('2.2: Hovering over .studio-sidebar restores width: 100% and max-width: none', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'auto-hide-controls'] });
  dom.studioSidebar.setHover(true);

  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.strictEqual(widthProp.value, '100%', 'Hover over sidebar must restore full 100% width');
  assert.strictEqual(widthProp.important, true);

  const maxWProp = computeProperty(dom.widgetTrackPanel, 'max-width', combinedRules);
  assert.strictEqual(maxWProp.value, 'none', 'Hover over sidebar must restore max-width: none');

  const marginProp = computeProperty(dom.widgetTrackPanel, 'margin', combinedRules);
  assert.strictEqual(marginProp.value, '0', 'Hover over sidebar must restore margin: 0');
});

challenge('2.3: Hovering over .studio-art-container restores width: 100% and max-width: none', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'auto-hide-controls'] });
  dom.studioArtContainer.setHover(true);

  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.strictEqual(widthProp.value, '100%', 'Hover over art container must restore full 100% width');

  const maxWProp = computeProperty(dom.widgetTrackPanel, 'max-width', combinedRules);
  assert.strictEqual(maxWProp.value, 'none');
});

challenge('2.4: Hovering over #playback-widget restores width: 100% and max-width: none', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'auto-hide-controls'] });
  dom.playbackWidget.setHover(true);

  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.strictEqual(widthProp.value, '100%', 'Hover over playback widget dock must restore full 100% width');

  const maxWProp = computeProperty(dom.widgetTrackPanel, 'max-width', combinedRules);
  assert.strictEqual(maxWProp.value, 'none');
});

challenge('2.5: Hovering over .widget-track-panel restores width: 100% and max-width: none', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'auto-hide-controls'] });
  dom.widgetTrackPanel.setHover(true);

  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.strictEqual(widthProp.value, '100%');

  const maxWProp = computeProperty(dom.widgetTrackPanel, 'max-width', combinedRules);
  assert.strictEqual(maxWProp.value, 'none');
});

challenge('2.6: Active scrubbing (.is-scrubbing) restores width: 100% and max-width: none', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'auto-hide-controls'] });
  dom.widgetTrackPanel.setScrubbing(true);

  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.strictEqual(widthProp.value, '100%', 'Active scrubbing must maintain 100% width');

  const maxWProp = computeProperty(dom.widgetTrackPanel, 'max-width', combinedRules);
  assert.strictEqual(maxWProp.value, 'none');
});

// ============================================================================
// SECTION 3: FEATURE 5 — APP-CONTAINER PARITY STRESS TESTING
// ============================================================================
console.log('\n--- SECTION 3: Dynamic Width Sizing — .app-container Parity Stress Testing ---');

challenge('3.1: .app-container.auto-hide-collapsed shrinks .widget-track-panel to min(280px, 80%)', () => {
  const dom = createLyricFlowDOM({
    bodyClasses: ['layout-split'],
    appContainerClasses: ['auto-hide-collapsed']
  });
  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.strictEqual(widthProp.value, 'min(280px, 80%)', 'Must shrink when auto-hide-collapsed is on .app-container');
  assert.strictEqual(widthProp.important, true);

  const maxWProp = computeProperty(dom.widgetTrackPanel, 'max-width', combinedRules);
  assert.strictEqual(maxWProp.value, '280px');
});

challenge('3.2: .app-container.auto-hide-faded shrinks .widget-track-panel to min(280px, 80%)', () => {
  const dom = createLyricFlowDOM({
    bodyClasses: ['layout-split'],
    appContainerClasses: ['auto-hide-faded']
  });
  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.strictEqual(widthProp.value, 'min(280px, 80%)', 'Must shrink when auto-hide-faded is on .app-container');
  assert.strictEqual(widthProp.important, true);
});

challenge('3.3: .app-container.auto-hide-controls shrinks .widget-track-panel to min(280px, 80%) [Parity Audit]', () => {
  const dom = createLyricFlowDOM({
    bodyClasses: ['layout-split'],
    appContainerClasses: ['auto-hide-controls']
  });
  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.ok(widthProp, 'width property must be defined');
  assert.strictEqual(
    widthProp.value,
    'min(280px, 80%)',
    'PARITY DEFECT: .widget-track-panel failed to shrink to min(280px, 80%) when auto-hide-controls was placed on .app-container. _studio.css line 1927 omits .auto-hide-controls from .app-container:is(...)'
  );
  assert.strictEqual(widthProp.important, true);
});

challenge('3.4: .app-container.auto-hide-controls hover recovery restores width: 100% [Parity Audit]', () => {
  const dom = createLyricFlowDOM({
    bodyClasses: ['layout-split'],
    appContainerClasses: ['auto-hide-controls']
  });
  dom.playbackWidget.setHover(true);

  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.ok(widthProp, 'width property must be defined');
  // Check if hover override matched
  assert.strictEqual(
    widthProp.value,
    '100%',
    'PARITY DEFECT: Hover recovery failed when auto-hide-controls was on .app-container'
  );
  assert.ok(
    widthProp.winningSelector.includes(':hover'),
    'Winning selector must be a hover override rule'
  );
});

// ============================================================================
// SECTION 4: LEGACY CSS RULE INTERFERENCE (_layout.css:201)
// ============================================================================
console.log('\n--- SECTION 4: Legacy CSS Rule Isolation (_layout.css:201) ---');

challenge('4.1: _layout.css line 201 does NOT match when body.layout-split is active', () => {
  const dom = createLyricFlowDOM({
    bodyClasses: ['layout-split', 'auto-hide-collapsed'],
    appContainerClasses: ['auto-hide-collapsed']
  });

  // Test selector from _layout.css:201 directly
  const legacySelector = 'body:not(.layout-split) .app-container.auto-hide-collapsed:not(.wallpaper-mode) .playback-widget';
  const matches = matchesSelector(legacySelector, dom.playbackWidget);
  assert.strictEqual(matches, false, 'Legacy rule MUST NOT match when body has .layout-split');
});

challenge('4.2: _layout.css line 201 DOES match when body does NOT have .layout-split', () => {
  const dom = createLyricFlowDOM({
    bodyClasses: ['auto-hide-collapsed'],
    appContainerClasses: ['auto-hide-collapsed']
  });

  const legacySelector = 'body:not(.layout-split) .app-container.auto-hide-collapsed:not(.wallpaper-mode) .playback-widget';
  const matches = matchesSelector(legacySelector, dom.playbackWidget);
  assert.strictEqual(matches, true, 'Legacy rule SHOULD match in normal mode when auto-hide-collapsed');
});

challenge('4.3: _layout.css line 218 does NOT match .track-details when body.layout-split is active', () => {
  const dom = createLyricFlowDOM({
    bodyClasses: ['layout-split', 'auto-hide-collapsed'],
    appContainerClasses: ['auto-hide-collapsed']
  });

  const legacyDetailsSelector = 'body:not(.layout-split) .app-container.auto-hide-collapsed:not(.wallpaper-mode) .playback-widget .track-details';
  const matches = matchesSelector(legacyDetailsSelector, dom.trackDetails);
  assert.strictEqual(matches, false, 'Legacy track-details display: flex rule MUST NOT match in split view');
});

// ============================================================================
// SECTION 5: FEATURE 6 — SONG DETAILS & MINI ART ISOLATION
// ============================================================================
console.log('\n--- SECTION 5: Feature 6 — Song Details & Mini Thumbnail Isolation ---');

const isolationStates = [
  { name: 'Split View Rest', body: ['layout-split'], app: [], theme: 'dark', hover: null },
  { name: 'Split View Auto-Hide Controls', body: ['layout-split', 'auto-hide-controls'], app: [], theme: 'dark', hover: null },
  { name: 'Split View Auto-Hide Collapsed', body: ['layout-split', 'auto-hide-collapsed'], app: ['auto-hide-collapsed'], theme: 'dark', hover: null },
  { name: 'Split View Auto-Hide Faded', body: ['layout-split', 'auto-hide-faded'], app: ['auto-hide-faded'], theme: 'dark', hover: null },
  { name: 'Split View Hovering Widget', body: ['layout-split'], app: [], theme: 'dark', hover: 'playbackWidget' },
  { name: 'Split View Light Mode', body: ['layout-split'], app: [], theme: 'light', hover: null },
  { name: 'Split View Light Mode + Auto-Hide Collapsed', body: ['layout-split', 'auto-hide-collapsed'], app: ['auto-hide-collapsed'], theme: 'light', hover: null },
  { name: 'Split View Light Mode + Hover', body: ['layout-split'], app: [], theme: 'light', hover: 'playbackWidget' }
];

isolationStates.forEach((st, idx) => {
  challenge(`5.${idx + 1}: [${st.name}] #playback-widget .track-details is strictly hidden`, () => {
    const dom = createLyricFlowDOM({
      bodyClasses: st.body,
      appContainerClasses: st.app,
      theme: st.theme
    });
    if (st.hover && dom[st.hover]) dom[st.hover].setHover(true);

    const displayProp = computeProperty(dom.trackDetails, 'display', combinedRules);
    assert.strictEqual(displayProp.value, 'none', '.track-details display must be none');
    assert.strictEqual(displayProp.important, true, '.track-details display must be !important');
  });
});

challenge('5.9: Wildcard descendants of .track-details (*: track name, artist, button) are display: none !important', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split'] });

  const nameDisplay = computeProperty(dom.trackName, 'display', combinedRules);
  assert.strictEqual(nameDisplay.value, 'none', '#widget-track-name must have display: none');
  assert.strictEqual(nameDisplay.important, true, '#widget-track-name must be !important');

  const artistDisplay = computeProperty(dom.artistName, 'display', combinedRules);
  assert.strictEqual(artistDisplay.value, 'none', '#widget-artist-name must have display: none');
  assert.strictEqual(artistDisplay.important, true, '#widget-artist-name must be !important');

  const btnDisplay = computeProperty(dom.btnHideLyrics, 'display', combinedRules);
  assert.strictEqual(btnDisplay.value, 'none', '#btn-hide-lyrics must have display: none');
  assert.strictEqual(btnDisplay.important, true, '#btn-hide-lyrics must be !important');
});

challenge('5.10: .widget-art-container and all its sub-elements are display: none !important', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split'] });

  const artContainerDisplay = computeProperty(dom.widgetArtContainer, 'display', combinedRules);
  assert.strictEqual(artContainerDisplay.value, 'none', '.widget-art-container must be display: none');
  assert.strictEqual(artContainerDisplay.important, true);

  const imgDisplay = computeProperty(dom.widgetAlbumArt, 'display', combinedRules);
  assert.strictEqual(imgDisplay.value, 'none', '#widget-album-art wildcard sub-element must be display: none');
  assert.strictEqual(imgDisplay.important, true);
});

// ============================================================================
// SECTION 6: MODE ISOLATION & NON-SPLIT EXCLUSIONS
// ============================================================================
console.log('\n--- SECTION 6: Viewport Mode Isolation & Exclusions ---');

challenge('6.1: wallpaper-mode is excluded from .widget-track-panel dynamic width shrink', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'wallpaper-mode', 'auto-hide-controls'] });
  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.notStrictEqual(widthProp?.value, 'min(280px, 80%)', 'wallpaper-mode must not shrink');
});

challenge('6.2: mode-dynamic-island is excluded from .widget-track-panel dynamic width shrink', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'mode-dynamic-island', 'auto-hide-controls'] });
  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.notStrictEqual(widthProp?.value, 'min(280px, 80%)', 'mode-dynamic-island must not shrink');
});

challenge('6.3: taskbar-mode is excluded from .widget-track-panel dynamic width shrink', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'taskbar-mode', 'auto-hide-controls'] });
  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.notStrictEqual(widthProp?.value, 'min(280px, 80%)', 'taskbar-mode must not shrink');
});

challenge('6.4: cinematic-view-active is excluded from .widget-track-panel dynamic width shrink', () => {
  const dom = createLyricFlowDOM({ bodyClasses: ['layout-split', 'cinematic-view-active', 'auto-hide-controls'] });
  const widthProp = computeProperty(dom.widgetTrackPanel, 'width', combinedRules);
  assert.notStrictEqual(widthProp?.value, 'min(280px, 80%)', 'cinematic-view-active must not shrink');
});

// ============================================================================
// SECTION 7: STATIC SOURCE & AST INVARIANTS
// ============================================================================
console.log('\n--- SECTION 7: Static Source & AST Invariants ---');

challenge('7.1: _studio.css declares dynamic width shrink properties with !important', () => {
  assert.ok(
    studioCss.includes('width: min(280px, 80%) !important;') &&
    studioCss.includes('max-width: 280px !important;') &&
    studioCss.includes('flex: 0 1 280px !important;') &&
    studioCss.includes('margin: 0 auto !important;'),
    '_studio.css must explicitly declare shrink width, max-width, flex, and margin with !important'
  );
});

challenge('7.2: _studio.css declares unexpanded 100% full-width properties with !important', () => {
  assert.ok(
    studioCss.includes('width: 100% !important;') &&
    studioCss.includes('max-width: none !important;') &&
    studioCss.includes('flex: 1 1 100% !important;'),
    '_studio.css must explicitly declare 100% width, max-width none, and flex 1 1 100% with !important'
  );
});

challenge('7.3: _layout.css:201 strictly contains body:not(.layout-split) guard', () => {
  assert.ok(
    layoutCss.includes('body:not(.layout-split) .app-container.auto-hide-collapsed:not(.wallpaper-mode) .playback-widget'),
    '_layout.css must scope line 201 with body:not(.layout-split)'
  );
});

challenge('7.4: _studio.css strictly contains wildcard descendant isolation rules', () => {
  assert.ok(
    studioCss.includes('body.layout-split #playback-widget .track-details *') &&
    studioCss.includes('body.layout-split #playback-widget .widget-art-container *'),
    '_studio.css must contain wildcard descendant suppression (*)'
  );
});

challenge('7.5: _studio.css line 1927 parity check for .auto-hide-controls in .app-container [Parity Audit]', () => {
  const shrinkBlockMatch = studioCss.match(/body\.layout-split\s+\.app-container:is\(([^)]+)\)[^{]*#playback-widget\s*>\s*\.widget-track-panel/);
  assert.ok(shrinkBlockMatch, '_studio.css must define .app-container parity shrink rule');
  const innerIs = shrinkBlockMatch[1];
  assert.ok(
    innerIs.includes('.auto-hide-controls'),
    `PARITY DEFECT: _studio.css line 1927 has ':is(${innerIs})', which omits .auto-hide-controls. This prevents .widget-track-panel from shrinking when auto-hide-controls is placed on .app-container.`
  );
});

console.log('\n================================================================');
console.log(`  ADVERSARIAL SUITE EXECUTION COMPLETE: ${passedTests}/${totalTests} PASSED`);
if (failedTests > 0) {
  console.log(`  FAILURES DETECTED: ${failedTests}`);
  failureDetails.forEach((f, i) => {
    console.log(`    ${i + 1}. ${f.name}`);
    console.log(`       -> ${f.error}`);
  });
  console.log('\n  RECOMMENDED VERDICT: REQUEST_CHANGES');
} else {
  console.log('  ALL ADVERSARIAL STRESS CHALLENGES SATISFIED');
  console.log('  RECOMMENDED VERDICT: APPROVE');
}
console.log('================================================================\n');

process.exit(failedTests > 0 ? 1 : 0);
