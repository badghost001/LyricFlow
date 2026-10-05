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
      require('./KineticDirector')
    );
  } else {
    root.KineticCanvasRenderer = factory(
      root.KineticShapeMorpher,
      root.KineticColorEngine,
      root.KineticTypographyEngine,
      root.KineticDirector
    );
  }
})(typeof self !== 'undefined' ? self : this, function (ShapeMorpher, ColorEngine, TypographyEngine, Director) {
  'use strict';

  const safeRaf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(() => cb(Date.now()), 16);
  const safeCaf = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : (id) => clearTimeout(id);

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

      // Configuration state
      this.config = Object.assign({
        isCinematic: false,
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
        endTimeMs: null
      }, options);

      this.timeline = [];
      this.activePalette = null;
      this.resolvedShape = 'astroid';
      this.currentTimeMs = 0;
      this.isPlaying = false;
      this._rafId = null;
      this._lastTimestamp = 0;

      this.updateCardBounds();
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

      this.renderFrame(this.currentTimeMs);
    }

    renderFrame(timeMs) {
      this.currentTimeMs = timeMs;
      if (!this.ctx) return;

      const ctx = this.ctx;
      const palette = this.activePalette || this.colorEngine.PRESETS.velvet_plum;

      // 1. Canvas Background: Deep dark cinematic stage
      ctx.fillStyle = palette.canvasColor || '#070709';
      ctx.fillRect(0, 0, this.width, this.height);

      const scene = this.director.getSceneAt(this.timeline, timeMs);
      if (!scene) {
        // Fallback: draw idle morphed card with track title if available
        this.morpher.drawMorphedCard(ctx, {
          shapeType: this.resolvedShape,
          progress: (typeof this._previewProgress === 'number') ? this._previewProgress : 1.0,
          bounds: this.cardBounds,
          fillColor: palette.cardColor,
          showAccentStar: true,
          starColor: palette.textColor
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
          starColor: palette.textColor
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
      const showBottomStar = scene.style !== 'styleC';
      const morphProgress = (typeof this._previewProgress === 'number') ? this._previewProgress : 1.0;
      this.morpher.drawMorphedCard(ctx, {
        shapeType: currentShape,
        progress: morphProgress,
        bounds: this.cardBounds,
        fillColor: palette.cardColor,
        showAccentStar: showBottomStar,
        starColor: palette.textColor
      });

      // Render typography and visual elements according to active style
      switch (scene.style) {
        case 'styleA': {
          this.typography.renderStyleA(ctx, {
            text: scene.primaryText,
            words: scene.words || [],
            currentTimeMs: timeMs,
            bounds: this.cardBounds,
            palette
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
            palette
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
            colorEngine: this.colorEngine
          });
          break;
        }
        default: {
          this.typography.renderStyleA(ctx, {
            text: scene.primaryText || scene.rawText || '',
            words: scene.words || [],
            currentTimeMs: timeMs,
            bounds: this.cardBounds,
            palette
          });
          break;
        }
      }
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

  return KineticCanvasRenderer;
});
