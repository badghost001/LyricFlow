/**
 * LyricFlow - Cinematic Scene Model
 * Data abstraction encapsulating timing, typography, semantic concept, motif, and composition.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CinematicScene = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class CinematicScene {
    constructor(data = {}) {
      this.id = data.id || `scene_${Date.now()}`;
      this.index = typeof data.index === 'number' ? data.index : 0;
      this.chunkIndex = typeof data.chunkIndex === 'number' ? data.chunkIndex : 0;
      this.startTimeMs = typeof data.startTimeMs === 'number' ? data.startTimeMs : 0;
      this.endTimeMs = typeof data.endTimeMs === 'number' ? data.endTimeMs : this.startTimeMs + 2000;
      this.duration = Math.max(1, this.endTimeMs - this.startTimeMs);

      // Typography
      this.style = data.style || 'styleA'; // 'styleA' | 'styleB' | 'styleC' | 'break_morph' | 'morph'
      this.primaryText = data.primaryText || '';
      this.secondaryText = data.secondaryText || '';
      this.secondaryPosition = data.secondaryPosition || 'below';
      this.rawText = data.rawText || this.primaryText;
      this.words = Array.isArray(data.words) ? data.words : [];
      this.creatorTag = data.creatorTag || '';

      // Semantic & Art Direction
      this.concept = data.concept || null;
      this.conceptStrength = data.conceptStrength || 'none'; // 'strong' | 'weak' | 'none'
      this.matchedPhrase = data.matchedPhrase || null;
      this.matchedKeyword = data.matchedKeyword || null;
      this.emphasizedWord = data.emphasizedWord || null;
      this.emphasizedWordIndex = typeof data.emphasizedWordIndex === 'number' ? data.emphasizedWordIndex : -1;
      this.tonalTint = data.tonalTint || null;

      // Visual Motif & Composition
      this.motifVariation = typeof data.motifVariation === 'number' ? data.motifVariation : 0;
      this.composition = data.composition || null;
      this.shapeType = data.shapeType || 'astroid';

      // Scene Continuity
      this.sharesConceptWithPrev = Boolean(data.sharesConceptWithPrev);
      this.sharesConceptWithNext = Boolean(data.sharesConceptWithNext);
    }
  }

  return CinematicScene;
});
