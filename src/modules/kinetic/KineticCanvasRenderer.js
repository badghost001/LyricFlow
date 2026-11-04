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

  const safeRaf = (cb) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(() => cb(Date.now()), 16));
  const safeCaf = (id) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));

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
      this._activeSceneIndex = 0;
      this._lastSceneLookupTime = null;
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
      this._playUpdateCallback = null;
      this._lastStaticFrameKey = null;
      this._albumArtBackgroundCache = null;
      this._motifSpriteCache = new Map();
      this._cinematicAudio = { bass: 0, targetBass: 0, lastTimestamp: 0 };

      this.albumArtImage = this.config.artworkImage || null;
      this.albumArtUrl = this.config.artworkUrl || null;
      if (this.config.artworkUrl && !this.albumArtImage) {
        this.setAlbumArt(this.config.artworkUrl);
      }

      this.updateCardBounds();
    }

    setAlbumArt(source) {
      if (!source) {
        this.albumArtImage = null;
        this.albumArtUrl = null;
        if (this.config) {
          this.config.artworkImage = null;
          this.config.artworkUrl = null;
        }
        if (this.isPlaying) this._syncPlaybackFrameLoop();
        return;
      }
      if (source !== this.albumArtImage && source !== this.albumArtUrl) this._albumArtBackgroundCache = null;
      if (typeof source === 'string') {
        if (this.albumArtUrl === source && this.albumArtImage) return;
        this.albumArtUrl = source;
        if (this.config) this.config.artworkUrl = source;

        // 1. Check if an existing DOM image element already has this artwork loaded
        if (typeof document !== 'undefined') {
          const domElements = [
            document.getElementById('widget-album-art'),
            document.getElementById('studio-album-art'),
            document.getElementById('wallpaper-album-art')
          ];
          for (const el of domElements) {
            if (el && el.complete && (el.naturalWidth > 0 || el.width > 0)) {
              if (el.src === source || (el.src && source && el.src.includes(source.slice(-25)))) {
                this.albumArtImage = el;
                this._albumArtBackgroundCache = null;
                if (this.config) this.config.artworkImage = el;
                if (this.ctx && (this.isPaused || !this.isPlaying)) {
                  this.renderFrame(this.currentTimeMs);
                } else if (this.isPlaying) {
                  this._syncPlaybackFrameLoop();
                }
                return;
              }
            }
          }
        }

        // 2. Load Image object without crossOrigin restriction so external Spotify/Last.fm CDNs never fail on CORS
        const img = new Image();
        img.onload = () => {
          this.albumArtImage = img;
          this._albumArtBackgroundCache = null;
          if (this.config) this.config.artworkImage = img;
          if (this.ctx && (this.isPaused || !this.isPlaying)) {
            this.renderFrame(this.currentTimeMs);
          } else if (this.isPlaying) {
            this._syncPlaybackFrameLoop();
          }
        };
        img.onerror = () => {
          if (typeof document !== 'undefined') {
            const fallbackDom = document.getElementById('widget-album-art') || document.getElementById('studio-album-art');
            if (fallbackDom && fallbackDom.complete && (fallbackDom.naturalWidth || fallbackDom.width) > 0) {
              this.albumArtImage = fallbackDom;
              if (this.config) this.config.artworkImage = fallbackDom;
            }
          }
        };
        img.src = source;
      } else if (source && (source.tagName === 'IMG' || source.tagName === 'VIDEO' || source instanceof Image)) {
        this.albumArtImage = source;
        if (source.src) this.albumArtUrl = source.src;
        if (this.config) {
          this.config.artworkImage = source;
          if (source.src) this.config.artworkUrl = source.src;
        }
        if (this.ctx && (this.isPaused || !this.isPlaying)) {
          this.renderFrame(this.currentTimeMs);
        } else if (this.isPlaying) {
          this._syncPlaybackFrameLoop();
        }
      }
    }

    setPausedState(isPaused, trackInfo = null) {
      this.isPaused = Boolean(isPaused);
      if (trackInfo) {
        this.pausedTrackInfo = {
          title: trackInfo.title || this.config.title || '',
          artist: trackInfo.artist || this.config.artist || ''
        };
      }
      if (this.isPaused) {
        this.pause();
        if (this.ctx) {
          this.renderFrame(this.currentTimeMs);
        }
      } else {
        const isCinematicActive = Boolean(this.config && this.config.isCinematic);
        if ((isCinematicActive || this.canvas) && !this.isPlaying) {
          this.play();
        }
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
      this._albumArtBackgroundCache = null;
      if (this.canvas) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      this.updateCardBounds();
      this.renderFrame(this.currentTimeMs);
    }

    configure(newConfig = {}) {
      Object.assign(this.config, newConfig);
      if (newConfig.artworkUrl) {
        this.setAlbumArt(newConfig.artworkUrl);
      } else if (newConfig.artworkImage) {
        this.setAlbumArt(newConfig.artworkImage);
      }
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
      const generatedTimeline = this.director.buildTimeline(this.config.lyrics, {
        startTimeMs: this.config.startTimeMs,
        endTimeMs: this.config.endTimeMs,
        artist: this.config.artist,
        title: this.config.title,
        creatorTag: this.config.creatorTag,
        skipIntroMorph: Boolean(this.config.skipIntroMorph || this.config.isCinematic),
        isCinematic: Boolean(this.config.isCinematic),
        initialShape: this.resolvedShape
      });

      if (this.config.isCinematic) {
        // Cinematic lyric pauses should hold the editorial lyric over the
        // album-art atmosphere. Drop the solid shape morph and stretch the
        // preceding lyric scene to the next vocal so the normal lyric
        // cross-fade handles the transition.
        this.timeline = [];
        for (const scene of generatedTimeline) {
          if (scene && scene.style === 'break_morph') {
            const previousScene = this.timeline[this.timeline.length - 1];
            if (previousScene && previousScene.style !== 'morph') {
              previousScene.endTimeMs = scene.endTimeMs;
              previousScene.duration = Math.max(1, previousScene.endTimeMs - previousScene.startTimeMs);
            }
            continue;
          }
          this.timeline.push(scene);
        }

        for (let i = 0; i < this.timeline.length; i++) {
          const scene = this.timeline[i];
          const previousScene = this.timeline[i - 1] || null;
          const nextScene = this.timeline[i + 1] || null;
          scene.sharesConceptWithPrev = Boolean(previousScene && previousScene.concept && scene.concept && previousScene.concept === scene.concept);
          scene.sharesConceptWithNext = Boolean(nextScene && nextScene.concept && scene.concept && nextScene.concept === scene.concept);
        }
      } else {
        this.timeline = generatedTimeline;
      }
      this._activeSceneIndex = 0;
      this._lastSceneLookupTime = null;

      // Resolve initial concept from timeline or shape
      const firstConceptScene = Array.isArray(this.timeline) ? this.timeline.find(s => s && s.concept) : null;
      if (firstConceptScene && firstConceptScene.concept) {
        this.resolvedConcept = firstConceptScene.concept;
      } else if (this.morpher && this.morpher.SHAPE_TO_CONCEPT) {
        this.resolvedConcept = this.morpher.SHAPE_TO_CONCEPT[this.resolvedShape] || 'night';
      }

      if (this.isPlaying) this._syncPlaybackFrameLoop();
      this.renderFrame(this.currentTimeMs);
    }

    _needsContinuousFrames() {
      if (this.timeline.length > 0 || this._previewProgress != null || this._playUpdateCallback) return true;
      // Cinematic album-art backgrounds have a subtle pan; keep that motion
      // while art is available. A static no-lyrics card needs no RAF.
      return Boolean(this.config?.isCinematic && !this.config?.reducedMotion && this.albumArtImage);
    }

    _stopPlaybackFrameLoop() {
      if (this._rafId) {
        safeCaf(this._rafId);
        this._rafId = null;
      }
    }

    _syncPlaybackFrameLoop() {
      if (!this.isPlaying || this.isPaused) return;
      if (this._needsContinuousFrames()) {
        this.play(this._playUpdateCallback);
      } else {
        this._stopPlaybackFrameLoop();
      }
    }

    getActiveSceneIndex(timeMs) {
      const timeline = this.timeline;
      if (!Array.isArray(timeline) || timeline.length === 0) return -1;

      let index = Math.max(0, Math.min(this._activeSceneIndex || 0, timeline.length - 1));
      const current = timeline[index];
      if (current && timeMs >= current.startTimeMs && timeMs < current.endTimeMs) {
        // Preserve the director's first-matching-scene behavior if authored
        // transitions overlap adjacent timeline entries.
        while (index > 0 && timeline[index - 1].startTimeMs <= timeMs && timeMs < timeline[index - 1].endTimeMs) index--;
        this._activeSceneIndex = index;
        this._lastSceneLookupTime = timeMs;
        return index;
      }

      // Playback frames normally cross one adjacent boundary at a time. Keep
      // that common path constant-time, while seeks and large clock jumps use
      // binary search instead of walking the whole timeline.
      const previousTime = this._lastSceneLookupTime;
      const sequential = Number.isFinite(previousTime) && timeMs >= previousTime && (timeMs - previousTime) <= 500;
      if (sequential && current && timeMs >= current.endTimeMs) {
        const next = timeline[index + 1];
        if (next && timeMs >= next.startTimeMs) index++;
        else if (timeMs < current.endTimeMs) index = Math.max(0, index - 1);
      } else {
        let low = 0;
        let high = timeline.length;
        while (low < high) {
          const mid = (low + high) >> 1;
          if (timeline[mid].startTimeMs <= timeMs) low = mid + 1;
          else high = mid;
        }
        index = Math.max(0, Math.min(timeline.length - 1, low - 1));
      }

      // If a sequential frame crossed a gap containing multiple short scenes,
      // correct with binary search. Gaps retain the director's latest-started
      // scene behavior.
      while (index > 0 && timeline[index - 1].startTimeMs <= timeMs && timeMs < timeline[index - 1].endTimeMs) index--;
      let active = timeline[index];
      if (active && !(timeMs >= active.startTimeMs && timeMs < active.endTimeMs)) {
        let low = 0;
        let high = timeline.length;
        while (low < high) {
          const mid = (low + high) >> 1;
          if (timeline[mid].startTimeMs <= timeMs) low = mid + 1;
          else high = mid;
        }
        index = Math.max(0, Math.min(timeline.length - 1, low - 1));
      }
      this._activeSceneIndex = index;
      this._lastSceneLookupTime = timeMs;
      return index;
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

      // Reuse the existing audio spectrum feed. Smooth modestly in this render loop
      // so audio never schedules its own animation or causes per-event redraws.
      const now = (typeof options.timeMs === 'number' ? options.timeMs : this.currentTimeMs);
      const audio = (typeof window !== 'undefined' && window.__lfCinematicAudioLevels) || null;
      const freshBass = audio && (Date.now() - audio.timestamp) < 450 ? audio.bass : 0;
      const dt = this._cinematicAudio.lastTimestamp ? Math.min(64, Math.max(0, now - this._cinematicAudio.lastTimestamp)) : 16;
      this._cinematicAudio.lastTimestamp = now;
      this._cinematicAudio.targetBass = freshBass;
      this._cinematicAudio.bass += (freshBass - this._cinematicAudio.bass) * (1 - Math.exp(-dt / 180));
      const audioScale = 1 + Math.min(0.035, this._cinematicAudio.bass * 0.035);

      ctx.save();
      ctx.shadowColor = 'transparent';

      for (let i = 0; i < CINEMATIC_FIELD_ANCHORS.length; i++) {
        const anchor = CINEMATIC_FIELD_ANCHORS[i];
        const driftX = reducedMotion ? 0 : Math.sin(elapsedSec * 0.35 + anchor.driftPhase) * 12;
        const driftY = reducedMotion ? 0 : Math.cos(elapsedSec * 0.28 + anchor.driftPhase * 1.2) * 9;

        const cx = anchor.nx * w + driftX;
        const cy = anchor.ny * h + driftY;
        const rx = baseR * anchor.baseScale * audioScale;
        const ry = baseR * anchor.baseScale * audioScale;
        const variation = (baseVariation + anchor.varOffset) % totalVariations;
        const alpha = anchor.baseAlpha * alphaMultiplier;

        if (alpha > 0.005) {
          this.drawCachedMotif(ctx, {
            concept,
            variation,
            cx,
            cy,
            rx,
            ry,
            strokeColor,
            alpha,
            strokeWidth: 1.2,
            drift: 0,
            reducedMotion
          });
        }
      }

      ctx.restore();
    }

    drawCachedMotif(ctx, options) {
      if (!this.motifEngine || !ctx || options.alpha <= 0.005) return;
      const key = `${options.concept}|${options.variation}|${options.strokeColor}|${options.strokeWidth}|${Boolean(options.reducedMotion)}`;
      let sprite = this._motifSpriteCache.get(key);
      if (!sprite) {
        const size = 256;
        const canvas = (typeof OffscreenCanvas !== 'undefined')
          ? new OffscreenCanvas(size, size)
          : (typeof document !== 'undefined' ? document.createElement('canvas') : null);
        if (!canvas) {
          this.motifEngine.drawMotif(ctx, options);
          return;
        }
        canvas.width = size;
        canvas.height = size;
        const spriteCtx = canvas.getContext('2d');
        if (!spriteCtx) return;
        this.motifEngine.drawMotif(spriteCtx, {
          ...options, cx: size / 2, cy: size / 2, rx: size / 4, ry: size / 4,
          alpha: 1, drift: 0, reducedMotion: true
        });
        sprite = canvas;
        if (this._motifSpriteCache.size >= 24) {
          const oldestKey = this._motifSpriteCache.keys().next().value;
          if (oldestKey !== undefined) this._motifSpriteCache.delete(oldestKey);
        }
        this._motifSpriteCache.set(key, sprite);
      }
      const drawW = options.rx * 4;
      const drawH = options.ry * 4;
      ctx.save();
      ctx.globalAlpha *= options.alpha;
      ctx.drawImage(sprite, options.cx - drawW / 2, options.cy - drawH / 2, drawW, drawH);
      ctx.restore();
    }

    /**
     * Renders an ambient blurred album artwork background with soft drift
     * and a deep cinematic vignette for immersive mode.
     */
    renderAlbumArtBackground(ctx, timeMs, palette) {
      if (!ctx) return;

      const w = this.width;
      const h = this.height;

      // Resolve artwork first so the expensive filtered treatment can be cached.
      let artSource = null;
      // Blur only the still cover. Reprocessing a live motion-art frame would
      // rebuild a full-size filtered surface several times per second and
      // recreate the CPU/GPU pressure this cache is intended to avoid.
      if (this.albumArtImage && this.albumArtImage.tagName !== 'VIDEO' && (this.albumArtImage.naturalWidth || this.albumArtImage.width) > 0) {
        artSource = this.albumArtImage;
      } else if (this.config && this.config.artworkImage && this.config.artworkImage.tagName !== 'VIDEO' && (this.config.artworkImage.naturalWidth || this.config.artworkImage.width) > 0) {
        artSource = this.config.artworkImage;
      } else if (typeof document !== 'undefined') {
        const domArt = document.getElementById('widget-album-art') || document.getElementById('studio-album-art') || document.getElementById('wallpaper-album-art');
        if (domArt && domArt.complete && (domArt.naturalWidth || domArt.width) > 0) artSource = this.albumArtImage = domArt;
      }
      const baseRgb = (palette && palette.cardRgb) || { r: 32, g: 18, b: 26 };
      const cacheKey = `${w}x${h}|${baseRgb.r},${baseRgb.g},${baseRgb.b}|${palette.canvasColor || ''}|${this.albumArtUrl || ''}`;
      const cache = this._albumArtBackgroundCache;
      if (!cache || cache.key !== cacheKey || cache.source !== artSource) {
        const margin = 48;
        const surface = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w + margin * 2, h + margin * 2) : (typeof document !== 'undefined' ? document.createElement('canvas') : null);
        if (!surface) return;
        surface.width = w + margin * 2;
        surface.height = h + margin * 2;
        const bg = surface.getContext('2d');
        if (!bg) return;
        if (typeof bg.createRadialGradient === 'function') {
          const g = bg.createRadialGradient((w + margin * 2) * 0.5, (h + margin * 2) * 0.45, Math.min(w, h) * 0.15, (w + margin * 2) * 0.5, (h + margin * 2) * 0.5, Math.max(w, h) * 0.75);
          g.addColorStop(0, `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, 0.72)`);
          g.addColorStop(0.55, `rgba(${Math.round(baseRgb.r * 0.55)}, ${Math.round(baseRgb.g * 0.55)}, ${Math.round(baseRgb.b * 0.55)}, 0.90)`);
          g.addColorStop(1, palette.canvasColor || '#070709');
          bg.fillStyle = g;
        } else bg.fillStyle = palette.canvasColor || '#070709';
        bg.fillRect(0, 0, surface.width, surface.height);
        if (artSource) {
          const aw = artSource.videoWidth || artSource.naturalWidth || artSource.width || 500;
          const ah = artSource.videoHeight || artSource.naturalHeight || artSource.height || 500;
          if (aw > 0 && ah > 0) {
            const scale = Math.max(surface.width / aw, surface.height / ah) * 1.04;
            bg.save();
            bg.globalAlpha = 0.92;
            bg.filter = 'blur(28px) brightness(0.68) saturate(1.5)';
            bg.drawImage(artSource, (surface.width - aw * scale) / 2, (surface.height - ah * scale) / 2, aw * scale, ah * scale);
            bg.filter = 'none';
            bg.restore();
          }
        }
        if (typeof bg.createRadialGradient === 'function') {
          const vignette = bg.createRadialGradient(surface.width / 2, surface.height / 2, Math.min(w, h) * 0.20, surface.width / 2, surface.height / 2, Math.max(w, h) * 0.78);
          vignette.addColorStop(0, 'rgba(4, 5, 8, 0.25)');
          vignette.addColorStop(0.60, 'rgba(4, 5, 8, 0.58)');
          vignette.addColorStop(1, 'rgba(2, 2, 4, 0.88)');
          bg.fillStyle = vignette;
          bg.fillRect(0, 0, surface.width, surface.height);
        }
        this._albumArtBackgroundCache = { key: cacheKey, source: artSource, surface, margin };
      }
      const cached = this._albumArtBackgroundCache;
      const drift = !this.config.reducedMotion ? (1 + Math.sin(timeMs * 0.00045) * 0.006) : 1;
      const panX = !this.config.reducedMotion ? Math.sin(timeMs * 0.0003) * 5 : 0;
      const panY = !this.config.reducedMotion ? Math.cos(timeMs * 0.00025) * 4 : 0;
      const sw = w / drift;
      const sh = h / drift;
      ctx.drawImage(cached.surface, cached.margin + (w - sw) / 2 - panX, cached.margin + (h - sh) / 2 - panY, sw, sh, 0, 0, w, h);
    }

    renderFrame(timeMs, sceneIndexHint = null) {
      this.currentTimeMs = timeMs;
      if (!this.ctx) return;
      if (this.canvas && (this.canvas.isConnected === false || this.canvas.style?.display === 'none')) return;

      const ctx = this.ctx;
      const palette = this.activePalette || this.colorEngine.PRESETS.velvet_plum;

      // Find active scene and its index in timeline
      const sceneIndex = Number.isInteger(sceneIndexHint) ? sceneIndexHint : this.getActiveSceneIndex(timeMs);

      const scene = (sceneIndex >= 0 && this.timeline[sceneIndex])
        ? this.timeline[sceneIndex]
        : this.director.getSceneAt(this.timeline, timeMs);

      // A no-scene fallback is a still card when its background is not panning
      // (or reduced motion is enabled). Reuse that bitmap until visible state
      // changes. Active lyric and morph scenes are never gated because their
      // word fills, fades, and motifs animate with playback time.
      const staticFallback = !scene && !this._previewProgress &&
        (!this.config?.isCinematic || this.config?.reducedMotion);
      if (staticFallback) {
        const frameKey = [
          this.width, this.height, this.config.title || '', this.config.artist || '',
          this.pausedTrackInfo?.title || '', this.pausedTrackInfo?.artist || '',
          this.albumArtUrl || '', this.resolvedShape || '', this.resolvedConcept || '',
          palette.canvasColor || palette.cardColor || '', palette.textColor || '',
          JSON.stringify(palette.cardRgb || null), this.isPaused ? 1 : 0
        ].join('|');
        if (frameKey === this._lastStaticFrameKey) return;
        this._lastStaticFrameKey = frameKey;
      } else {
        this._lastStaticFrameKey = null;
      }

      // 1. Canvas Background: Deep dark cinematic stage with ambient album art projection
      if (this.config && this.config.isCinematic) {
        this.renderAlbumArtBackground(ctx, timeMs, palette);
      } else {
        ctx.fillStyle = palette.canvasColor || '#070709';
        ctx.fillRect(0, 0, this.width, this.height);
      }

      // Check for Paused State in Cinematic Mode:
      // When playback is paused in Cinematic Mode, present the editorial track card
      // only if no lyrics timeline exists. If lyrics ARE loaded on the timeline,
      // ALWAYS render the active lyric line so lyrics are prominent and visible!
      if (this.isPaused && this.config && this.config.isCinematic && (!scene || !Array.isArray(this.timeline) || this.timeline.length === 0)) {
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
          fillColor: this.config.isCinematic
            ? (palette.cardRgb ? `rgba(${palette.cardRgb.r}, ${palette.cardRgb.g}, ${palette.cardRgb.b}, 0.65)` : 'rgba(30, 20, 28, 0.65)')
            : palette.cardColor,
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
        fillColor: this.config.isCinematic
          ? (palette.cardRgb ? `rgba(${palette.cardRgb.r}, ${palette.cardRgb.g}, ${palette.cardRgb.b}, 0.22)` : 'rgba(10, 10, 15, 0.22)')
          : palette.cardColor,
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

      const shouldFade = this.config.fadeLyrics !== false && !this.isPaused;
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

        if (elapsed < 0) {
          // Track is paused or timeline head is before the first scene starts
          // Render typography with full visibility so screen is NEVER pitch black
          currAlpha = 1.0;
        } else if (elapsed < fadeDur) {
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
            currAlpha = this.config.isCinematic ? Math.max(0.75, easeOut) : easeOut;
          } else {
            currAlpha = 1.0;
          }
        } else {
          currAlpha = 1.0;
        }
      }

      if (this.isPaused) {
        // When paused, strictly freeze the active scene without any cross-fade ghosting
        crossFadeScene = null;
        crossFadeAlpha = 0.0;
        currAlpha = 1.0;
      } else if (this.config.isCinematic && !crossFadeScene) {
        // Guarantee lyrics are NEVER completely invisible in cinematic mode during standalone playback
        currAlpha = Math.max(0.75, currAlpha);
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
          this.drawCachedMotif(ctx, {
            concept: sec.concept,
            variation: sec.variation,
            cx: sec.cx,
            cy: sec.cy,
            rx: sec.rx,
            ry: sec.ry,
            strokeColor: palette.textColor,
            alpha: sec.alpha * (crossFadeAlpha || (1.0 - currAlpha)),
            drift: 0,
            reducedMotion: true
          });
        }

        // Primary active motif
        if (transState && transState.primary && transState.primary.alpha > 0.005) {
          const prim = transState.primary;
          const motifAlpha = prim.alpha * currAlpha;

          // FAR LAYER: If composition is cropped_large or behind, draw ultra-faint large contour
          if (scene.composition && (scene.composition.type === 'cropped_large' || scene.composition.type === 'behind')) {
            this.drawCachedMotif(ctx, {
              concept: prim.concept,
              variation: prim.variation,
              cx: prim.cx + driftX * 0.5,
              cy: prim.cy + driftY * 0.5,
              rx: prim.rx * 1.45 * breathing,
              ry: prim.ry * 1.45 * breathing,
              strokeColor: palette.textColor,
              alpha: motifAlpha * 0.45,
              strokeWidth: 1.0,
              drift: 0,
              reducedMotion: true
            });
          }

          // MID LAYER: Active motif
          this.drawCachedMotif(ctx, {
            concept: prim.concept,
            variation: prim.variation,
            cx: prim.cx + driftX,
            cy: prim.cy + driftY,
            rx: prim.rx * breathing,
            ry: prim.ry * breathing,
            strokeColor: palette.textColor,
            alpha: motifAlpha,
            strokeWidth: 1.5,
            drift: 0,
            reducedMotion: true
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
      if (this.config && this.config.isCinematic) {
        this.renderAlbumArtBackground(ctx, timeMs, palette);
      }
      // 1. Draw card container backdrop
      const currentShape = this.resolvedShape || 'diamond';
      this.morpher.drawMorphedCard(ctx, {
        shapeType: currentShape,
        progress: 1.0,
        bounds: this.cardBounds,
        fillColor: this.config.isCinematic
          ? (palette.cardRgb ? `rgba(${palette.cardRgb.r}, ${palette.cardRgb.g}, ${palette.cardRgb.b}, 0.22)` : 'rgba(10, 10, 15, 0.22)')
          : palette.cardColor,
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
        this.drawCachedMotif(ctx, {
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
      const rawTitle = (this.pausedTrackInfo && this.pausedTrackInfo.title) || this.config.title || '';
      const rawArtist = (this.pausedTrackInfo && this.pausedTrackInfo.artist) || this.config.artist || '';
      const hasTrack = Boolean(rawTitle && rawTitle.toLowerCase() !== 'lyricflow');

      const title = hasTrack ? rawTitle : 'Start Playing Music';
      const artist = hasTrack ? rawArtist : 'Spotify • Windows Media • Local';
      const statusText = hasTrack ? '— PAUSED —' : '— CINEMATIC LYRICS —';

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Subtle status badge
      ctx.fillStyle = (palette && palette.textRgb)
        ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.55)`
        : 'rgba(255, 255, 255, 0.55)';
      ctx.font = '600 13px "Inter", "Outfit", -apple-system, sans-serif';
      ctx.fillText(statusText, cx, cy - 64);

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

      if (isCinematic && !this.config.reducedMotion && !this.isPaused) {
        // Subtle acoustic rhythm pulsing for cinematic mode lyrics (gentle breathing scale: ~1.000 to 1.015)
        const pulse = Math.sin(timeMs * 0.0032);
        const pulseScale = 1.0 + (pulse * 0.012);
        const bounds = this.cardBounds || { x: 0, y: 0, width: this.width || 960, height: this.height || 600 };
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        if (!isNaN(cx) && !isNaN(cy)) {
          ctx.translate(cx, cy);
          ctx.scale(pulseScale, pulseScale);
          ctx.translate(-cx, -cy);
        }
      }

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
            artworkImage: isCinematic ? null : this.config.artworkImage,
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
      if (typeof isKineticMode !== 'undefined' && !isKineticMode && typeof isCinematicView !== 'undefined' && !isCinematicView) {
        this.isPlaying = false;
        return;
      }
      this.isPaused = false;
      if (typeof onUpdate === 'function') this._playUpdateCallback = onUpdate;
      else if (!this.isPlaying) this._playUpdateCallback = null;
      if (this.isPlaying && this._rafId) return;
      this._stopPlaybackFrameLoop();
      this.isPlaying = true;
      this._lastTimestamp = performance.now();

      const loop = (now) => {
        if (!this.isPlaying) return;
        if (typeof isKineticMode !== 'undefined' && !isKineticMode && typeof isCinematicView !== 'undefined' && !isCinematicView) {
          this.pause();
          return;
        }
        const delta = now - this._lastTimestamp;
        this._lastTimestamp = now;

        this.currentTimeMs += delta;

        // R7: Occlusion gating & 15 FPS instrumental interlude downclocking
        const isHidden = typeof document !== 'undefined' && document.hidden;
        const isWindowBlurred = typeof document !== 'undefined' && Boolean(document.body && document.body.classList.contains('window-blurred'));
        const isCanvasDetached = this.canvas && (this.canvas.isConnected === false || this.canvas.style.display === 'none' || this.canvas.offsetWidth === 0);

        if (!isHidden && !isWindowBlurred && !isCanvasDetached) {
          const activeSceneIndex = this.getActiveSceneIndex(this.currentTimeMs);
          const activeScene = activeSceneIndex >= 0 ? this.timeline[activeSceneIndex] : null;
          const isInterlude = Boolean(activeScene && (activeScene.style === 'break_morph' || activeScene.isBreak));
          const isCinematicThrottle = Boolean(this.config && this.config.isCinematic) && ((now - (this._lastRenderTime || 0)) < 30);

          if (!isCinematicThrottle && (!isInterlude || (now - (this._lastRenderTime || 0)) >= 66)) {
            this.renderFrame(this.currentTimeMs, activeSceneIndex);
            this._lastRenderTime = now;
          }
        }

        if (typeof this._playUpdateCallback === 'function') {
          this._playUpdateCallback(this.currentTimeMs);
        }

        this._rafId = safeRaf(loop);
      };

      this._rafId = safeRaf(loop);
    }

    pause() {
      this.isPlaying = false;
      this.isPaused = true;
      this._playUpdateCallback = null;
      if (this._rafId) {
        safeCaf(this._rafId);
        this._rafId = null;
      }
    }

    syncPlaybackTime(timeMs) {
      const nextTimeMs = Number.isFinite(timeMs) ? timeMs : this.currentTimeMs;
      const changed = nextTimeMs !== this.currentTimeMs;
      this.currentTimeMs = nextTimeMs;
      if (this.isPlaying && !this.isPaused) {
        // Keep RAF as the sole frame renderer during playback and restart its
        // delta baseline so clock correction never creates a catch-up jump.
        this._lastTimestamp = performance.now();
        if (!this._rafId && this._needsContinuousFrames()) this.play(this._playUpdateCallback);
        return;
      }
      // While paused there is no RAF owner, so show clock/seek changes now.
      if (changed) this.renderFrame(this.currentTimeMs);
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
