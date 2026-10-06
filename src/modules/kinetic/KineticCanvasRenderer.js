/**
 * LyricFlow - Kinetic Canvas Renderer
 * 60 FPS HTML5 Canvas engine uniting the Shape Morpher, Color Engine, Typography Engine,
 * and Director. Renders live playback frames and exports high-definition video frames.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./KineticShapeMorpher'),
      require('./KineticColorEngine'),
      require('./KineticTypographyEngine'),
      require('./KineticDirector'),
      require('./CinematicMotif'),
      require('./CinematicTransition'),
      require('./CinematicComposition'),
      require('./CinematicConcept')
    );
  } else {
    root.KineticCanvasRenderer = factory(
      root.KineticShapeMorpher,
      root.KineticColorEngine,
      root.KineticTypographyEngine,
      root.KineticDirector,
      root.CinematicMotif,
      root.CinematicTransition,
      root.CinematicComposition,
      root.CinematicConcept
    );
  }
})(typeof self !== 'undefined' ? self : this, function (ShapeMorpher, ColorEngine, TypographyEngine, Director, CinematicMotif, CinematicTransition, CinematicComposition, CinematicConcept) {
  'use strict';

  const safeRaf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(() => cb(Date.now()), 16);
  const safeCaf = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : (id) => clearTimeout(id);

  const MotifEngine = CinematicMotif || (typeof window !== 'undefined' && window.CinematicMotif) || (typeof require === 'function' ? (() => { try { return require('./CinematicMotif'); } catch (_) { return null; } })() : null);
  const TransitionEngine = CinematicTransition || (typeof window !== 'undefined' && window.CinematicTransition) || (typeof require === 'function' ? (() => { try { return require('./CinematicTransition'); } catch (_) { return null; } })() : null);
  const CompositionEngine = CinematicComposition || (typeof window !== 'undefined' && window.CinematicComposition) || (typeof require === 'function' ? (() => { try { return require('./CinematicComposition'); } catch (_) { return null; } })() : null);
  const ConceptEngine = CinematicConcept || (typeof window !== 'undefined' && window.CinematicConcept) || (typeof require === 'function' ? (() => { try { return require('./CinematicConcept'); } catch (_) { return null; } })() : null);

  const CINEMATIC_FIELD_ANCHORS = [
    // Top perimeter band (well above text)
    { nx: 0.12, ny: 0.14, baseScale: 0.70, baseAlpha: 0.10, varOffset: 0, driftPhase: 0.0 },
    { nx: 0.38, ny: 0.12, baseScale: 0.50, baseAlpha: 0.07, varOffset: 1, driftPhase: 1.2 },
    { nx: 0.62, ny: 0.15, baseScale: 0.55, baseAlpha: 0.08, varOffset: 2, driftPhase: 2.4 },
    { nx: 0.88, ny: 0.13, baseScale: 0.75, baseAlpha: 0.11, varOffset: 3, driftPhase: 3.6 },

    // Left flank margin
    { nx: 0.08, ny: 0.38, baseScale: 0.65, baseAlpha: 0.09, varOffset: 1, driftPhase: 4.8 },
    { nx: 0.12, ny: 0.62, baseScale: 0.60, baseAlpha: 0.08, varOffset: 3, driftPhase: 2.0 },

    // Right flank margin
    { nx: 0.92, ny: 0.40, baseScale: 0.70, baseAlpha: 0.10, varOffset: 2, driftPhase: 0.8 },
    { nx: 0.88, ny: 0.64, baseScale: 0.60, baseAlpha: 0.08, varOffset: 0, driftPhase: 3.2 },

    // Bottom perimeter band (well below text)
    { nx: 0.16, ny: 0.86, baseScale: 0.80, baseAlpha: 0.11, varOffset: 2, driftPhase: 4.4 },
    { nx: 0.40, ny: 0.88, baseScale: 0.50, baseAlpha: 0.07, varOffset: 0, driftPhase: 5.6 },
    { nx: 0.64, ny: 0.86, baseScale: 0.55, baseAlpha: 0.08, varOffset: 1, driftPhase: 1.6 },
    { nx: 0.86, ny: 0.88, baseScale: 0.75, baseAlpha: 0.10, varOffset: 3, driftPhase: 2.8 },

    // Ambient upper depth (subtle, corners)
    { nx: 0.25, ny: 0.26, baseScale: 0.40, baseAlpha: 0.05, varOffset: 0, driftPhase: 3.8 },
    { nx: 0.75, ny: 0.26, baseScale: 0.42, baseAlpha: 0.05, varOffset: 2, driftPhase: 5.0 }
  ];

  class KineticCanvasRenderer {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;

      this.width = options.width || 720;
      this.height = options.height || 1280;

      if (this.canvas) {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
      }

      this.morpher = ShapeMorpher;
      this.colorEngine = ColorEngine;
      this.typography = TypographyEngine;
      this.director = Director;
      this.motifEngine = MotifEngine;
      this.cinematicTransition = TransitionEngine;
      this.compositionEngine = CompositionEngine;
      this.conceptEngine = ConceptEngine;

      // Configuration state
      this.config = Object.assign({
        isCinematic: false,
        reducedMotion: Boolean(options.reducedMotion),
        shapeMode: 'auto',       // 'auto' (track-seeded) | 'random' | 'manual'
        shapeType: 'astroid',    // default manual shape
        colorMode: 'album_art',  // 'album_art' | 'preset' | 'custom'
        presetKey: 'velvet_plum',
        customColors: null,
        artist: '',
        title: '',
        creatorTag: '',
        artworkImage: null,
        dominantRgb: null,
        lyrics: [],
        startTimeMs: 0,
        endTimeMs: null,
        fadeLyrics: options.fadeLyrics !== false
      }, options);

      this.timeline = [];
      this.activePalette = null;
      this.resolvedShape = 'astroid';
      this.resolvedConcept = null;
      this.currentTimeMs = 0;
      this.isPlaying = false;
      this.isPaused = false;
      this.pausedTrackInfo = {
        title: this.config.title || '',
        artist: this.config.artist || ''
      };
      this._rafId = null;
      this._lastTimestamp = 0;

      this.updateCardBounds();
    }

    setPausedState(isPaused, trackInfo = null) {
      this.isPaused = Boolean(isPaused);
      if (trackInfo) {
        this.pausedTrackInfo = {
          title: trackInfo.title || this.config.title || '',
          artist: trackInfo.artist || this.config.artist || ''
        };
      }
      if (this.ctx && this.isPaused && this.config && this.config.isCinematic) {
        this.renderFrame(this.currentTimeMs);
      }
    }

    updateCardBounds() {
      if (this.config && this.config.isCinematic) {
        // Fullscreen Cinematic Stage: Card fills the entire canvas with zero gaps/margins or white borders
        this.cardBounds = {
          x: 0,
          y: 0,
          width: this.width,
          height: this.height,
          cornerRadius: 0
        };
      } else if (this.width >= this.height) {
        // Horizontal widescreen 16:9 card
        const cardW = Math.round(this.width * 0.95);
        const cardH = Math.round(this.height * 0.88);
        this.cardBounds = {
          x: Math.round((this.width - cardW) / 2),
          y: Math.round((this.height - cardH) / 2),
          width: cardW,
          height: cardH,
          cornerRadius: Math.round(cardH * 0.04)
        };
      } else {
        // Vertical 9:16 portrait (Mobile stories)
        const cardW = Math.round(this.width * 0.78);
        const cardH = Math.round(this.height * 0.56);
        this.cardBounds = {
          x: Math.round((this.width - cardW) / 2),
          y: Math.round((this.height - cardH) / 2),
          width: cardW,
          height: cardH,
          cornerRadius: Math.round(cardW * 0.065)
        };
      }
    }

    setDimensions(width, height) {
      this.width = width;
      this.height = height;
      if (this.canvas) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      this.updateCardBounds();
      this.renderFrame(this.currentTimeMs);
    }

    configure(newConfig = {}) {
      Object.assign(this.config, newConfig);
      this.updateCardBounds();

      // 1. Resolve active shape
      if (this.config.shapeMode === 'auto') {
        this.resolvedShape = this.morpher.getShapeForTrack(this.config.artist, this.config.title);
      } else if (this.config.shapeMode === 'random') {
        const keys = this.morpher.SHAPE_KEYS;
        this.resolvedShape = keys[Math.floor(Math.random() * keys.length)];
      } else {
        this.resolvedShape = this.config.shapeType || 'astroid';
      }

      // 2. Resolve active color palette
      this.activePalette = this.colorEngine.resolvePalette(this.config.colorMode, {
        presetKey: this.config.presetKey,
        dominantRgb: this.config.dominantRgb,
        custom: this.config.customColors
      });

      // 3. Build scene timeline
      this.timeline = this.director.buildTimeline(this.config.lyrics, {
        startTimeMs: this.config.startTimeMs,
        endTimeMs: this.config.endTimeMs,
        artist: this.config.artist,
        title: this.config.title,
        creatorTag: this.config.creatorTag,
        skipIntroMorph: Boolean(this.config.skipIntroMorph || this.config.isCinematic),
        isCinematic: Boolean(this.config.isCinematic),
        initialShape: this.resolvedShape
      });

      // Resolve initial concept from timeline or shape
      const firstConceptScene = Array.isArray(this.timeline) ? this.timeline.find(s => s && s.concept) : null;
      if (firstConceptScene && firstConceptScene.concept) {
        this.resolvedConcept = firstConceptScene.concept;
      } else if (this.morpher && this.morpher.SHAPE_TO_CONCEPT) {
        this.resolvedConcept = this.morpher.SHAPE_TO_CONCEPT[this.resolvedShape] || 'night';
      }

      this.renderFrame(this.currentTimeMs);
    }

    /**
     * Renders a distributed constellation field of multiple keyword illustrations of the same kind
     * filling the cinematic background while that lyric sentence is active/displayed.
     */
    renderCinematicBackgroundField(ctx, scene, options = {}) {
      if (!this.motifEngine || !scene || !scene.concept) return;
      const concept = scene.concept;
      const alphaMultiplier = typeof options.alpha === 'number' ? options.alpha : 1.0;
      if (alphaMultiplier <= 0.005) return;

      const elapsedSec = ((typeof options.timeMs === 'number' ? options.timeMs : this.currentTimeMs) - scene.startTimeMs) * 0.001;
      const reducedMotion = Boolean(this.config.reducedMotion);
      const totalVariations = (this.motifEngine.VARIATION_COUNTS && this.motifEngine.VARIATION_COUNTS[concept]) || 3;
      const baseVariation = scene.motifVariation || 0;

      // Color: prefer emotional tonal tint if available, otherwise textColor
      const strokeColor = (scene.tonalTint && scene.tonalTint.r)
        ? `rgb(${scene.tonalTint.r}, ${scene.tonalTint.g}, ${scene.tonalTint.b})`
        : (options.palette && options.palette.textColor ? options.palette.textColor : '#ffffff');

      const w = this.width;
      const h = this.height;
      const minDim = Math.min(w, h);
      const baseR = minDim * 0.16;

      ctx.save();
      ctx.shadowColor = 'transparent';

      for (let i = 0; i < CINEMATIC_FIELD_ANCHORS.length; i++) {
        const anchor = CINEMATIC_FIELD_ANCHORS[i];
        const driftX = reducedMotion ? 0 : Math.sin(elapsedSec * 0.35 + anchor.driftPhase) * 12;
        const driftY = reducedMotion ? 0 : Math.cos(elapsedSec * 0.28 + anchor.driftPhase * 1.2) * 9;

        const cx = anchor.nx * w + driftX;
        const cy = anchor.ny * h + driftY;
        const rx = baseR * anchor.baseScale;
        const ry = baseR * anchor.baseScale;
        const variation = (baseVariation + anchor.varOffset) % totalVariations;
        const alpha = anchor.baseAlpha * alphaMultiplier;

        if (alpha > 0.005) {
          this.motifEngine.drawMotif(ctx, {
            concept,
            variation,
            cx,
            cy,
            rx,
            ry,
            strokeColor,
            alpha,
            strokeWidth: 1.2,
            drift: elapsedSec,
            reducedMotion
          });
        }
      }

      ctx.restore();
    }

    renderFrame(timeMs) {
      this.currentTimeMs = timeMs;
      if (!this.ctx) return;

      const ctx = this.ctx;
      const palette = this.activePalette || this.colorEngine.PRESETS.velvet_plum;

      // Find active scene and its index in timeline
      let sceneIndex = -1;
      if (Array.isArray(this.timeline) && this.timeline.length > 0) {
        for (let i = 0; i < this.timeline.length; i++) {
          const s = this.timeline[i];
          if (timeMs >= s.startTimeMs && timeMs < s.endTimeMs) {
            sceneIndex = i;
            break;
          }
        }
        if (sceneIndex === -1) {
          if (timeMs <= this.timeline[0].startTimeMs) {
            sceneIndex = 0;
          } else {
            for (let i = this.timeline.length - 1; i >= 0; i--) {
              if (timeMs >= this.timeline[i].startTimeMs) {
                sceneIndex = i;
                break;
              }
            }
            if (sceneIndex === -1) sceneIndex = this.timeline.length - 1;
          }
        }
      }

      const scene = (sceneIndex >= 0 && this.timeline[sceneIndex])
        ? this.timeline[sceneIndex]
        : this.director.getSceneAt(this.timeline, timeMs);

      // 1. Canvas Background: Deep dark cinematic stage
      ctx.fillStyle = palette.canvasColor || '#070709';
      ctx.fillRect(0, 0, this.width, this.height);

      // Check for Paused State in Cinematic Mode:
      // When playback is paused in Cinematic Mode, present the editorial track card
      // (Track Title & Artist Name with ambient breathing concept motif) instead of frozen lyric lines
      if (this.isPaused && this.config && this.config.isCinematic) {
        this.renderPausedTrackCard(ctx, palette, timeMs);
        return;
      }

      // Layer 1b. Subtle semantic tonal tint wash
      if (scene && scene.tonalTint && typeof ctx.createRadialGradient === 'function') {
        try {
          ctx.save();
          const grad = ctx.createRadialGradient(
            this.width / 2, this.height / 2, 20,
            this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.70
          );
          const { r, g, b } = scene.tonalTint;
          grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.045)`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, this.width, this.height);
          ctx.restore();
        } catch (_) {}
      }

      if (!scene) {
        // Fallback: draw idle morphed card with track title if available
        this.morpher.drawMorphedCard(ctx, {
          shapeType: this.resolvedShape,
          progress: (typeof this._previewProgress === 'number') ? this._previewProgress : 1.0,
          bounds: this.cardBounds,
          fillColor: palette.cardColor,
          showAccentStar: true,
          starColor: palette.textColor,
          concept: this.resolvedConcept || (this.morpher && this.morpher.SHAPE_TO_CONCEPT ? this.morpher.SHAPE_TO_CONCEPT[this.resolvedShape] : 'night'),
          motifEngine: this.motifEngine
        });
        if (this.config.title) {
          this.typography.renderStyleA(ctx, {
            text: this.config.title,
            bounds: this.cardBounds,
            palette
          });
        }
        return;
      }

      // 2. Intro Morph Scene & Dynamic Break Morph Shape Transitions
      if (scene.style === 'morph' || scene.style === 'break_morph') {
        const shapeType = scene.shapeType || this.resolvedShape;
        this.resolvedShape = shapeType;
        const duration = Math.max(1, scene.endTimeMs - scene.startTimeMs);
        const elapsed = timeMs - scene.startTimeMs;

        let progress = 1.0;
        if (scene.style === 'morph') {
          // Standard intro morph: 0.0 (shape) -> 1.0 (card)
          progress = Math.max(0, Math.min(1, elapsed / duration));
        } else {
          // Break morph: continuous smooth transition right before upcoming lyrics: 1.0 (card) -> 0.0 (shape) -> 1.0 (card)
          const halfDur = Math.max(1, duration * 0.5);
          if (elapsed < halfDur) {
            const p = Math.max(0, Math.min(1, elapsed / halfDur));
            const eased = ShapeMorpher.easeInOutCubic ? ShapeMorpher.easeInOutCubic(p) : (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
            progress = 1.0 - eased;
          } else {
            const p = Math.max(0, Math.min(1, (elapsed - halfDur) / halfDur));
            const eased = ShapeMorpher.easeInOutCubic ? ShapeMorpher.easeInOutCubic(p) : (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
            progress = eased;
          }
        }

        this.morpher.drawMorphedCard(ctx, {
          shapeType,
          progress,
          bounds: this.cardBounds,
          fillColor: palette.cardColor,
          strokeColor: palette.textColor || '#ffffff',
          strokeWidth: 2,
          shadowColor: 'rgba(0,0,0,0.85)',
          shadowBlur: 35,
          showAccentStar: true,
          starColor: palette.textColor,
          concept: scene.concept || this.resolvedConcept || (this.morpher && this.morpher.SHAPE_TO_CONCEPT ? this.morpher.SHAPE_TO_CONCEPT[shapeType] : 'night'),
          motifEngine: this.motifEngine,
          motifVariation: scene.motifVariation || 0,
          drift: elapsed * 0.001,
          reducedMotion: this.config.reducedMotion
        });

        // Center hallmark seal during break transition morph
        if (progress < 0.85) {
          const cx = this.cardBounds.x + this.cardBounds.width / 2;
          const cy = this.cardBounds.y + this.cardBounds.height / 2;
          const shapeMeta = this.morpher && this.morpher.SHAPES ? this.morpher.SHAPES[shapeType] : null;
          const icon = (shapeMeta && shapeMeta.icon) ? shapeMeta.icon : '★';
          ctx.save();
          ctx.fillStyle = palette.textColor || '#ffffff';
          ctx.globalAlpha = Math.min(1, Math.max(0, (0.85 - progress) / 0.5));
          ctx.font = '700 38px "Bodoni Moda", serif, "Segoe UI Emoji"';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(icon, cx, cy);
          ctx.restore();
        }

        return;
      }

      // 3. Lyric Cut Scenes (Style A, Style B, Style C)
      // Draw card container backdrop
      const currentShape = scene.shapeType || this.resolvedShape;
      this.resolvedShape = currentShape;
      if (scene.concept) {
        this.resolvedConcept = scene.concept;
      }
      const showBottomStar = scene.style !== 'styleC';
      const morphProgress = (typeof this._previewProgress === 'number') ? this._previewProgress : 1.0;
      const hasActiveConcept = Boolean(scene && scene.concept && scene.conceptStrength && scene.conceptStrength !== 'none' && this.motifEngine && this.cinematicTransition);
      this.morpher.drawMorphedCard(ctx, {
        shapeType: currentShape,
        progress: morphProgress,
        bounds: this.cardBounds,
        fillColor: palette.cardColor,
        showAccentStar: showBottomStar,
        starColor: palette.textColor,
        concept: scene.concept || this.resolvedConcept || (this.morpher && this.morpher.SHAPE_TO_CONCEPT ? this.morpher.SHAPE_TO_CONCEPT[currentShape] : 'night'),
        motifEngine: this.motifEngine,
        motifVariation: scene.motifVariation || 0,
        drift: (timeMs - scene.startTimeMs) * 0.001,
        reducedMotion: this.config.reducedMotion,
        hasActiveMotifLayer: hasActiveConcept
      });

      // Calculate smooth cinematic fade / cross-fade for lyrics
      let currAlpha = 1.0;
      let crossFadeScene = null;
      let crossFadeAlpha = 0.0;

      const shouldFade = this.config.fadeLyrics !== false;
      const isLyricScene = (s) => s && s.style !== 'morph' && s.style !== 'break_morph';
      const prevScene = (sceneIndex > 0) ? this.timeline[sceneIndex - 1] : null;
      const nextScene = (sceneIndex >= 0 && sceneIndex < this.timeline.length - 1) ? this.timeline[sceneIndex + 1] : null;

      if (shouldFade) {
        const dur = Math.max(1, scene.endTimeMs - scene.startTimeMs);
        const elapsed = timeMs - scene.startTimeMs;
        const remaining = scene.endTimeMs - timeMs;

        // Soft transition window: typically 180ms to 240ms, adapted to scene duration
        const fadeDur = Math.min(240, Math.max(60, Math.round(dur * 0.22)));

        const isContiguousWithPrev = prevScene && isLyricScene(prevScene) && Math.abs(scene.startTimeMs - prevScene.endTimeMs) <= 150;
        const isContiguousWithNext = nextScene && isLyricScene(nextScene) && Math.abs(nextScene.startTimeMs - scene.endTimeMs) <= 150;

        if (elapsed < fadeDur) {
          // Entrance transition: smoothly ramp in
          const pIn = Math.max(0, Math.min(1, elapsed / fadeDur));
          const easeIn = pIn < 0.5 ? 2 * pIn * pIn : 1 - Math.pow(-2 * pIn + 2, 2) / 2;
          currAlpha = easeIn;

          if (isContiguousWithPrev) {
            // Cross-dissolve: outgoing previous lyric scene smoothly dissolves away as new line enters
            crossFadeScene = prevScene;
            crossFadeAlpha = 1.0 - easeIn;
          }
        } else if (remaining < fadeDur) {
          // Exit transition: if not contiguous with next lyric scene, smoothly fade out before break/gap
          if (!isContiguousWithNext) {
            const pOut = Math.max(0, Math.min(1, remaining / fadeDur));
            const easeOut = pOut < 0.5 ? 2 * pOut * pOut : 1 - Math.pow(-2 * pOut + 2, 2) / 2;
            currAlpha = easeOut;
          } else {
            currAlpha = 1.0;
          }
        }
      }

      // Layer 1c (Cinematic Mode): Background field of multiple keyword illustrations of the same kind
      // Fills the background with multiple illustrations while that sentence/lyric is displayed
      const hasConcept = Boolean(scene && scene.concept && scene.conceptStrength && scene.conceptStrength !== 'none');
      if (this.config.isCinematic && this.motifEngine) {
        if (hasConcept && currAlpha > 0.005) {
          this.renderCinematicBackgroundField(ctx, scene, {
            timeMs,
            alpha: currAlpha,
            palette
          });
        }
        if (crossFadeScene && crossFadeScene.concept && crossFadeAlpha > 0.005) {
          this.renderCinematicBackgroundField(ctx, crossFadeScene, {
            timeMs,
            alpha: crossFadeAlpha,
            palette
          });
        }
      }

      // Layers 2 & 3: FAR & MID VISUAL MOTIFS
      // Rendered ONLY when scene has a recognized concept (hierarchy requirement)
      if (hasConcept && this.motifEngine && this.cinematicTransition) {
        const outgoingLyricScene = (prevScene && isLyricScene(prevScene)) ? prevScene : null;
        const transState = this.cinematicTransition.computeTransitionState(scene, outgoingLyricScene, timeMs, { fadeDur: 240 });

        let driftX = 0;
        let driftY = 0;
        let breathing = 1.0;
        if (!this.config.reducedMotion) {
          const elapsedSec = (timeMs - scene.startTimeMs) * 0.001;
          driftX = Math.sin(elapsedSec * 0.35) * 4.5;
          driftY = Math.cos(elapsedSec * 0.28) * 3.8;
          breathing = 1.0 + Math.sin(elapsedSec * 0.65) * 0.02;
        }

        // Outgoing secondary motif during cross-dissolve with differing concept
        if (transState && transState.secondary && transState.secondary.alpha > 0.005) {
          const sec = transState.secondary;
          this.motifEngine.drawMotif(ctx, {
            concept: sec.concept,
            variation: sec.variation,
            cx: sec.cx,
            cy: sec.cy,
            rx: sec.rx,
            ry: sec.ry,
            strokeColor: palette.textColor,
            alpha: sec.alpha * (crossFadeAlpha || (1.0 - currAlpha)),
            drift: 0,
            reducedMotion: this.config.reducedMotion
          });
        }

        // Primary active motif
        if (transState && transState.primary && transState.primary.alpha > 0.005) {
          const prim = transState.primary;
          const motifAlpha = prim.alpha * currAlpha;

          // FAR LAYER: If composition is cropped_large or behind, draw ultra-faint large contour
          if (scene.composition && (scene.composition.type === 'cropped_large' || scene.composition.type === 'behind')) {
            this.motifEngine.drawMotif(ctx, {
              concept: prim.concept,
              variation: prim.variation,
              cx: prim.cx + driftX * 0.5,
              cy: prim.cy + driftY * 0.5,
              rx: prim.rx * 1.45 * breathing,
              ry: prim.ry * 1.45 * breathing,
              strokeColor: palette.textColor,
              alpha: motifAlpha * 0.45,
              strokeWidth: 1.0,
              drift: (timeMs - scene.startTimeMs) * 0.001,
              reducedMotion: this.config.reducedMotion
            });
          }

          // MID LAYER: Active motif
          this.motifEngine.drawMotif(ctx, {
            concept: prim.concept,
            variation: prim.variation,
            cx: prim.cx + driftX,
            cy: prim.cy + driftY,
            rx: prim.rx * breathing,
            ry: prim.ry * breathing,
            strokeColor: palette.textColor,
            alpha: motifAlpha,
            strokeWidth: 1.5,
            drift: (timeMs - scene.startTimeMs) * 0.001,
            reducedMotion: this.config.reducedMotion
          });
        }
      }

      // Layer 4: PRIMARY HERO TYPOGRAPHY
      // Render outgoing cross-fade scene if active
      if (crossFadeScene && crossFadeAlpha > 0.005) {
        this.renderSceneTypography(ctx, crossFadeScene, timeMs, crossFadeAlpha);
      }

      // Render active scene typography with smooth alpha
      if (currAlpha > 0.005) {
        this.renderSceneTypography(ctx, scene, timeMs, currAlpha);
      }

      // Layer 5: NEAR LAYER (Ambient micro particles / drift)
      if (!this.config.reducedMotion && hasConcept && scene.conceptStrength === 'strong') {
        this.renderAmbientNearLayer(ctx, scene, timeMs, currAlpha, palette);
      }
    }

    /**
     * Renders a record-sleeve inspired editorial typography card
     * when playback is paused in Cinematic Mode.
     */
    renderPausedTrackCard(ctx, palette, timeMs) {
      // 1. Draw card container backdrop
      const currentShape = this.resolvedShape || 'diamond';
      this.morpher.drawMorphedCard(ctx, {
        shapeType: currentShape,
        progress: 1.0,
        bounds: this.cardBounds,
        fillColor: palette.cardColor,
        showAccentStar: true,
        starColor: palette.textColor,
        concept: this.resolvedConcept || 'night',
        motifEngine: this.motifEngine
      });

      const { x, y, width, height } = this.cardBounds;
      const cx = Math.round(x + width / 2);
      const cy = Math.round(y + height / 2);

      // 2. Faint ambient concept motif breathing gently in background at ~0.20 alpha
      if (this.motifEngine) {
        const breath = 1.0 + Math.sin(timeMs * 0.00075) * 0.025;
        const motifR = Math.min(180, Math.round(Math.min(width, height) * 0.28)) * breath;
        this.motifEngine.drawMotif(ctx, {
          concept: this.resolvedConcept || 'night',
          variation: 0,
          cx,
          cy: cy - 10,
          rx: motifR,
          ry: motifR,
          strokeColor: palette.textColor || '#ffffff',
          alpha: 0.20,
          strokeWidth: 1.2,
          drift: 0,
          reducedMotion: this.config.reducedMotion
        });
      }

      // 3. Editorial Typography: Paused Status, Track Title, Artist Name
      const title = (this.pausedTrackInfo && this.pausedTrackInfo.title) || this.config.title || 'LyricFlow';
      const artist = (this.pausedTrackInfo && this.pausedTrackInfo.artist) || this.config.artist || '';

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Subtle status badge
      ctx.fillStyle = (palette && palette.textRgb)
        ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.45)`
        : 'rgba(255, 255, 255, 0.45)';
      ctx.font = '600 13px "Inter", "Outfit", -apple-system, sans-serif';
      ctx.fillText('— PAUSED —', cx, cy - 64);

      // Song Title in display serif
      const maxTextW = width * 0.82;
      let titleSize = Math.max(28, Math.min(64, Math.round(height * 0.11)));
      ctx.font = `700 ${titleSize}px "Playfair Display", "Fraunces", "Bodoni Moda", serif`;
      let textMetrics = ctx.measureText(title);
      if (textMetrics.width > maxTextW) {
        titleSize = Math.max(22, Math.floor(titleSize * (maxTextW / textMetrics.width)));
        ctx.font = `700 ${titleSize}px "Playfair Display", "Fraunces", "Bodoni Moda", serif`;
      }

      ctx.fillStyle = palette.textColor || '#ffffff';
      ctx.fillText(title, cx, cy - 12);

      // Artist Name in elegant secondary font
      if (artist) {
        const artistSize = Math.max(16, Math.min(24, Math.round(titleSize * 0.42)));
        ctx.font = `400 ${artistSize}px "Fraunces", Georgia, serif`;
        ctx.fillStyle = (palette && palette.textRgb)
          ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.72)`
          : 'rgba(255, 255, 255, 0.72)';
        ctx.fillText(artist, cx, cy + 38);
      }

      ctx.restore();
    }

    /**
     * Renders ambient near layer particles for strong concepts (e.g. fire embers, celestial stars)
     */
    renderAmbientNearLayer(ctx, scene, timeMs, alpha, palette) {
      if (!scene || !scene.concept || alpha <= 0.01) return;
      ctx.save();
      const strokeCol = palette.textColor || '#ffffff';
      ctx.fillStyle = strokeCol;
      ctx.strokeStyle = strokeCol;

      const elapsedSec = (timeMs - scene.startTimeMs) * 0.001;
      const { x, y, width, height } = this.cardBounds;

      switch (scene.concept) {
        case 'fire': {
          // 6 rising micro embers
          const count = 6;
          for (let i = 0; i < count; i++) {
            const seed = (i * 197.3) % 1.0;
            const px = x + width * (0.2 + seed * 0.6);
            const py = (y + height * 0.85) - ((elapsedSec * 45 + i * 28) % (height * 0.55));
            const pAlpha = alpha * 0.16 * Math.sin(((elapsedSec + i) * 2.5));
            if (pAlpha > 0.01) {
              ctx.globalAlpha = Math.min(1.0, Math.max(0, pAlpha));
              ctx.beginPath();
              ctx.arc(px, py, 1.4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }
        case 'night': {
          // 6 subtle distant twinkling stars
          const count = 6;
          for (let i = 0; i < count; i++) {
            const seedX = ((i * 73.1 + 13.5) % 1.0);
            const seedY = ((i * 47.9 + 5.2) % 1.0);
            const px = x + width * (0.15 + seedX * 0.7);
            const py = y + height * (0.12 + seedY * 0.35);
            const twinkle = 0.5 + 0.5 * Math.sin(elapsedSec * 2.0 + i * 1.5);
            ctx.globalAlpha = alpha * 0.18 * twinkle;
            ctx.beginPath();
            ctx.arc(px, py, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'rain': {
          // 8 subtle angled rain streaks
          const count = 8;
          ctx.lineWidth = 1.0;
          for (let i = 0; i < count; i++) {
            const seedX = (i * 123.7) % 1.0;
            const px = x + width * seedX;
            const py = y + ((elapsedSec * 160 + i * 45) % height);
            ctx.globalAlpha = alpha * 0.12;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + 10, py + 22);
            ctx.stroke();
          }
          break;
        }
        default:
          break;
      }
      ctx.restore();
    }

    /**
     * Renders typography for a given kinetic scene with optional fade alpha
     */
    renderSceneTypography(ctx, scene, timeMs, alpha = 1.0) {
      if (!scene || alpha <= 0.005) return;
      const palette = this.activePalette || this.colorEngine.PRESETS.velvet_plum;

      ctx.save();
      if (alpha < 0.999) {
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      }

      const isCinematic = Boolean(this.config && this.config.isCinematic);

      switch (scene.style) {
        case 'styleA': {
          this.typography.renderStyleA(ctx, {
            text: scene.primaryText,
            words: scene.words || [],
            currentTimeMs: timeMs,
            bounds: this.cardBounds,
            palette,
            fadeAlpha: alpha,
            scene,
            emphasizedWord: scene.emphasizedWord,
            composition: scene.composition,
            isCinematic
          });
          break;
        }
        case 'styleB': {
          this.typography.renderStyleB(ctx, {
            primaryText: scene.primaryText,
            secondaryText: scene.secondaryText,
            secondaryPosition: scene.secondaryPosition,
            words: scene.words || [],
            currentTimeMs: timeMs,
            bounds: this.cardBounds,
            palette,
            fadeAlpha: alpha,
            scene,
            composition: scene.composition,
            isCinematic
          });
          break;
        }
        case 'styleC': {
          this.typography.renderStyleC(ctx, {
            text: scene.primaryText,
            words: scene.words || [],
            currentTimeMs: timeMs,
            creatorTag: scene.creatorTag,
            artworkImage: this.config.artworkImage,
            bounds: this.cardBounds,
            palette,
            colorEngine: this.colorEngine,
            fadeAlpha: alpha,
            scene,
            composition: scene.composition,
            isCinematic
          });
          break;
        }
        default: {
          this.typography.renderStyleA(ctx, {
            text: scene.primaryText || scene.rawText || '',
            words: scene.words || [],
            currentTimeMs: timeMs,
            bounds: this.cardBounds,
            palette,
            fadeAlpha: alpha,
            scene,
            emphasizedWord: scene.emphasizedWord,
            composition: scene.composition,
            isCinematic
          });
          break;
        }
      }

      ctx.restore();
    }

    play(onUpdate = null) {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this._lastTimestamp = performance.now();

      const loop = (now) => {
        if (!this.isPlaying) return;
        const delta = now - this._lastTimestamp;
        this._lastTimestamp = now;

        this.currentTimeMs += delta;
        this.renderFrame(this.currentTimeMs);

        if (typeof onUpdate === 'function') {
          onUpdate(this.currentTimeMs);
        }

        this._rafId = safeRaf(loop);
      };

      this._rafId = safeRaf(loop);
    }

    pause() {
      this.isPlaying = false;
      if (this._rafId) {
        safeCaf(this._rafId);
        this._rafId = null;
      }
    }

    triggerShapePreview(shapeKey = null) {
      if (shapeKey && shapeKey !== 'auto' && shapeKey !== 'random') {
        this.resolvedShape = shapeKey;
      }
      if (this._previewAnimId) {
        safeCaf(this._previewAnimId);
        this._previewAnimId = null;
      }
      const start = performance.now();
      const duration = 1200;
      const animate = (now) => {
        const elapsed = now - start;
        const linearP = Math.min(1.0, elapsed / duration);
        const p = linearP < 0.5 ? 4 * linearP * linearP * linearP : 1 - Math.pow(-2 * linearP + 2, 3) / 2;
        this._previewProgress = p;
        this.renderFrame(this.currentTimeMs);
        if (linearP < 1.0) {
          this._previewAnimId = safeRaf(animate);
        } else {
          this._previewProgress = null;
          this._previewAnimId = null;
          this.renderFrame(this.currentTimeMs);
        }
      };
      this._previewAnimId = safeRaf(animate);
    }

    seek(timeMs) {
      this.currentTimeMs = timeMs;
      this.renderFrame(timeMs);
    }

    destroy() {
      this.pause();
      if (this._previewAnimId) {
        safeCaf(this._previewAnimId);
        this._previewAnimId = null;
      }
      this.canvas = null;
      this.ctx = null;
    }
  }

  KineticCanvasRenderer.CINEMATIC_FIELD_ANCHORS = CINEMATIC_FIELD_ANCHORS;

  return KineticCanvasRenderer;
});
