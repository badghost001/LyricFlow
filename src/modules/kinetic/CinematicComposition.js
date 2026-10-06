/**
 * LyricFlow - Cinematic Composition Engine
 * Resolves layout, positioning, scaling hierarchy, and depth coordinates for visual motifs and typography.
 * 
 * Features:
 * - Intentional framing: behind, above, below, offset_left, offset_right, cropped_large, distant_small
 * - Scale hierarchy based on semantic importance (strong concept vs weak supporting vs typography-only)
 * - Dynamic typographic counter-balance (shifts text to maintain visual harmony with the motif)
 * - Deterministic resolution per song and scene
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./CinematicConcept'));
  } else {
    root.CinematicComposition = factory(root.CinematicConcept);
  }
})(typeof self !== 'undefined' ? self : this, function (CinematicConcept) {
  'use strict';

  const COMPOSITION_TYPES = [
    'behind',
    'above',
    'below',
    'offset_left',
    'offset_right',
    'cropped_large',
    'distant_small'
  ];

  const TYPOGRAPHY_LAYOUTS = [
    'horizontal_fluid',
    'vertical_left',
    'vertical_right',
    'vertical_split'
  ];

  /**
   * Deterministic 32-bit FNV-1a string hash.
   */
  function hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash);
  }

  /**
   * Resolves typography layout deterministically based on track seed, scene index, framing, and word emphasis.
   */
  function resolveTypographyLayout(compType, trackKey = '', sceneIndex = 0, emphasizedWord = null) {
    const typoSeed = `${trackKey || ''}_typo_${sceneIndex}_${compType || 'center'}`;
    const typoHash = hashString(typoSeed);

    if (emphasizedWord && (typoHash % 2 === 0)) {
      return 'vertical_split';
    }
    if (compType === 'offset_left' && (typoHash % 2 === 0)) {
      return 'vertical_right';
    }
    if (compType === 'offset_right' && (typoHash % 2 === 0)) {
      return 'vertical_left';
    }

    const standardLayouts = ['horizontal_fluid', 'horizontal_fluid', 'vertical_left', 'vertical_right'];
    return standardLayouts[typoHash % standardLayouts.length];
  }

  /**
   * Resolves composition parameters for a given concept, strength, and canvas bounds.
   */
  function resolveComposition(concept, strength, bounds, trackKey = '', sceneIndex = 0, options = {}) {
    if (!bounds || !bounds.width || !bounds.height) {
      bounds = { x: 0, y: 0, width: 800, height: 600 };
    }

    const empWord = (typeof options === 'string') ? options : (options && options.emphasizedWord ? options.emphasizedWord : null);

    // 1. None: Pure typography hero (No motif rendered)
    if (!concept || strength === 'none') {
      const typographyLayout = resolveTypographyLayout('none', trackKey, sceneIndex, empWord);
      return {
        type: 'none',
        cx: bounds.x + bounds.width / 2,
        cy: bounds.y + bounds.height / 2,
        rx: 0,
        ry: 0,
        scale: 0,
        alpha: 0,
        textXOffset: 0,
        textYOffset: 0,
        hasMotif: false,
        typographyLayout,
        railMargin: 0.08
      };
    }

    const conceptDef = CinematicConcept && CinematicConcept.CONCEPTS ? CinematicConcept.CONCEPTS[concept] : null;
    const preferredList = (conceptDef && conceptDef.preferredCompositions) ? conceptDef.preferredCompositions : COMPOSITION_TYPES;

    // Pick composition deterministically
    const seed = `${trackKey || ''}_${concept}_comp_${sceneIndex}`;
    const hash = hashString(seed);

    let compType;
    if (strength === 'weak') {
      // Weak concept: emphasize subtle distant or offset framing
      const weakOptions = ['distant_small', 'offset_right', 'offset_left'];
      compType = weakOptions[hash % weakOptions.length];
    } else {
      // Strong concept: use preferred composition list
      compType = preferredList[hash % preferredList.length];
    }

    const { x, y, width, height } = bounds;
    const minDim = Math.min(width, height);
    const baseRadius = minDim * 0.32;

    let cx = x + width / 2;
    let cy = y + height / 2;
    let rx = baseRadius;
    let ry = baseRadius;
    let scale = 1.0;
    let alpha = 0.22;
    let textXOffset = 0;
    let textYOffset = 0;

    switch (compType) {
      case 'above': {
        // Positioned high on stage; text comfortable below
        cx = x + width * 0.5;
        cy = y + height * 0.26;
        scale = 0.55;
        rx = baseRadius * scale;
        ry = baseRadius * scale;
        alpha = 0.26;
        textYOffset = Math.round(height * 0.12);
        break;
      }
      case 'below': {
        // Positioned low on stage (ripples, road, flames); text comfortable above
        cx = x + width * 0.5;
        cy = y + height * 0.74;
        scale = 0.65;
        rx = baseRadius * scale;
        ry = baseRadius * scale;
        alpha = 0.24;
        textYOffset = -Math.round(height * 0.10);
        break;
      }
      case 'offset_left': {
        // Positioned on the left side; text shifted slightly right
        cx = x + width * 0.22;
        cy = y + height * 0.50;
        scale = 0.58;
        rx = baseRadius * scale;
        ry = baseRadius * scale;
        alpha = 0.22;
        textXOffset = Math.round(width * 0.08);
        break;
      }
      case 'offset_right': {
        // Positioned on the right side; text shifted slightly left
        cx = x + width * 0.78;
        cy = y + height * 0.50;
        scale = 0.58;
        rx = baseRadius * scale;
        ry = baseRadius * scale;
        alpha = 0.22;
        textXOffset = -Math.round(width * 0.08);
        break;
      }
      case 'cropped_large': {
        // Massive dramatic motif partially cropped off the edge; ultra-faint alpha for 100% text legibility
        const cornerIdx = hash % 2;
        cx = cornerIdx === 0 ? (x + width * 0.88) : (x + width * 0.12);
        cy = y + height * 0.55;
        scale = 1.65;
        rx = baseRadius * scale;
        ry = baseRadius * scale;
        alpha = 0.08; // Ultra faint background presence
        textXOffset = 0;
        textYOffset = 0;
        break;
      }
      case 'distant_small': {
        // Delicate, intimate corner motif (editorial stamp)
        cx = x + width * 0.82;
        cy = y + height * 0.20;
        scale = 0.28;
        rx = baseRadius * scale;
        ry = baseRadius * scale;
        alpha = 0.32;
        textXOffset = 0;
        textYOffset = 0;
        break;
      }
      case 'behind':
      default: {
        // Centered behind text
        cx = x + width * 0.50;
        cy = y + height * 0.50;
        scale = 0.85;
        rx = baseRadius * scale;
        ry = baseRadius * scale;
        alpha = 0.14;
        textXOffset = 0;
        textYOffset = 0;
        break;
      }
    }

    const typographyLayout = resolveTypographyLayout(compType, trackKey, sceneIndex, empWord);

    return {
      type: compType,
      cx,
      cy,
      rx,
      ry,
      scale,
      alpha,
      textXOffset,
      textYOffset,
      hasMotif: true,
      typographyLayout,
      railMargin: 0.08
    };
  }

  return {
    COMPOSITION_TYPES,
    TYPOGRAPHY_LAYOUTS,
    hashString,
    resolveTypographyLayout,
    resolveComposition
  };
});
