/**
 * LyricFlow - Cinematic Transition Engine
 * Manages visual continuity and smooth morphing/cross-dissolves between consecutive lyric motifs.
 * 
 * Features:
 * - Shared Concept Preservation: When consecutive lyrics share a concept, preserves the visual motif
 *   rather than destroying and recreating it, creating a seamless, continuous music video feel.
 * - Morphing & Cross-Dissolves: Smoothly interpolates coordinates, scale, and alpha between differing concepts.
 * - Graceful exit into negative space when transitioning to typography-only lyrics.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CinematicTransition = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Evaluates transition state between outgoing scene and incoming scene at timestamp timeMs.
   */
  function computeTransitionState(incomingScene, outgoingScene, timeMs, options = {}) {
    const fadeDur = options.fadeDur || 240;
    if (!incomingScene) return null;

    const elapsed = Math.max(0, timeMs - incomingScene.startTimeMs);
    const inProgress = Math.min(1.0, elapsed / fadeDur);
    const ease = easeInOutCubic(inProgress);

    const isSameConcept = Boolean(
      outgoingScene &&
      outgoingScene.concept &&
      incomingScene.concept &&
      outgoingScene.concept === incomingScene.concept
    );

    const incComp = incomingScene.composition || { hasMotif: false, alpha: 0 };
    const outComp = (outgoingScene && outgoingScene.composition) ? outgoingScene.composition : { hasMotif: false, alpha: 0 };

    if (isSameConcept) {
      // CONTINUITY PATH: Preserve motif seamlessly
      // Smoothly ease position and scale if composition shifted slightly
      const cx = (1 - ease) * (outComp.cx || incComp.cx) + ease * incComp.cx;
      const cy = (1 - ease) * (outComp.cy || incComp.cy) + ease * incComp.cy;
      const rx = (1 - ease) * (outComp.rx || incComp.rx) + ease * incComp.rx;
      const ry = (1 - ease) * (outComp.ry || incComp.ry) + ease * incComp.ry;
      const alpha = incComp.alpha || 0.22;

      return {
        mode: 'continuous',
        isSameConcept: true,
        primary: {
          concept: incomingScene.concept,
          variation: incomingScene.motifVariation || 0,
          cx,
          cy,
          rx,
          ry,
          alpha,
          scale: incComp.scale || 1.0
        },
        secondary: null
      };
    }

    // CROSS-DISSOLVE / MORPH PATH: Concepts differ
    const primaryAlpha = incComp.hasMotif ? (incComp.alpha * ease) : 0;
    const secondaryAlpha = (outComp && outComp.hasMotif) ? (outComp.alpha * (1.0 - ease)) : 0;

    return {
      mode: 'morph',
      isSameConcept: false,
      progress: inProgress,
      primary: incComp.hasMotif ? {
        concept: incomingScene.concept,
        variation: incomingScene.motifVariation || 0,
        cx: incComp.cx,
        cy: incComp.cy,
        rx: incComp.rx,
        ry: incComp.ry,
        alpha: primaryAlpha,
        scale: incComp.scale || 1.0
      } : null,
      secondary: (outgoingScene && outgoingScene.concept && secondaryAlpha > 0.005) ? {
        concept: outgoingScene.concept,
        variation: outgoingScene.motifVariation || 0,
        cx: outComp.cx,
        cy: outComp.cy,
        rx: outComp.rx,
        ry: outComp.ry,
        alpha: secondaryAlpha,
        scale: outComp.scale || 1.0
      } : null
    };
  }

  return {
    easeInOutCubic,
    computeTransitionState
  };
});
