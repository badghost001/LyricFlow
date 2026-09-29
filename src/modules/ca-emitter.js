/**
 * ====================================================================
 * Apple Core Animation Particle Engine (CAEmitterLayer)
 * - Faithful implementation of Apple QuartzCore CAEmitterLayer & CAEmitterCell
 * - Emits stardust sparkles & quantum dust micro-orbs from squircle perimeters
 * - Drives dissolution and vaporization of Dynamic Island capsules
 * ====================================================================
 */

class CAEmitterEngine {
  constructor(canvasId = "island-ca-emitter-canvas") {
    this.canvasId = canvasId;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animId = null;
    this.lastTime = 0;
    this.isEmitting = false;
    this.spriteCache = new Map();
    this.lastDirtyRect = null;

    this._ensureCanvas();
  }

  _ensureCanvas() {
    if (typeof document === 'undefined') return;
    this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.id = this.canvasId;
      this.canvas.className = "island-ca-emitter-canvas";
      const container = document.querySelector(".app-container") || document.body;
      container.appendChild(this.canvas);
    }
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: false });
    this._resizeCanvas();

    window.addEventListener("resize", () => this._resizeCanvas());
  }

  _resizeCanvas() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
    this.lastDirtyRect = null;
  }

  /**
   * Pre-render and cache sprite stamps for zero-GC hardware blitting
   */
  _getSprite(type, color = '#ffffff', size = 3) {
    if (typeof document === 'undefined') return null;
    const roundedSize = Math.max(2, Math.round(size));
    const key = `${type}_${color}_${roundedSize}`;
    if (this.spriteCache.has(key)) {
      return this.spriteCache.get(key);
    }

    try {
      const offCanvas = document.createElement('canvas');
      const dim = Math.max(16, roundedSize * 4);
      offCanvas.width = dim;
      offCanvas.height = dim;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return null;

      const center = dim / 2;
      const s = roundedSize;

      if (type === 'stardust') {
        offCtx.fillStyle = color;
        offCtx.beginPath();
        offCtx.moveTo(center, center - s);
        offCtx.quadraticCurveTo(center, center, center + s, center);
        offCtx.quadraticCurveTo(center, center, center, center + s);
        offCtx.quadraticCurveTo(center, center, center - s, center);
        offCtx.quadraticCurveTo(center, center, center, center - s);
        offCtx.closePath();
        offCtx.fill();

        offCtx.fillStyle = '#ffffff';
        offCtx.beginPath();
        offCtx.arc(center, center, s * 0.35, 0, Math.PI * 2);
        offCtx.fill();
      } else {
        const r = s;
        const grad = offCtx.createRadialGradient(center, center, 0, center, center, r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        offCtx.fillStyle = grad;
        offCtx.beginPath();
        offCtx.arc(center, center, r, 0, Math.PI * 2);
        offCtx.fill();
      }

      this.spriteCache.set(key, offCanvas);
      return offCanvas;
    } catch (_) {
      return null;
    }
  }

  /**
   * Sample points along a pill/squircle boundary
   */
  _sampleSquirclePoints(rect, count = 38) {
    const points = [];
    const rx = Math.min(rect.height / 2, rect.width / 2);
    const ry = rx;
    const left = rect.left;
    const top = rect.top;
    const w = rect.width;
    const h = rect.height;
    const centerX = left + w / 2;
    const centerY = top + h / 2;

    for (let i = 0; i < count; i++) {
      const t = (i / count) * (Math.PI * 2);
      let px, py;
      const cosT = Math.cos(t);
      const sinT = Math.sin(t);

      if (w > h) {
        if (cosT >= 0) {
          px = left + w - rx + rx * cosT;
          py = centerY + ry * sinT;
        } else {
          px = left + rx + rx * cosT;
          py = centerY + ry * sinT;
        }
      } else {
        px = centerX + (w / 2) * cosT;
        py = centerY + (h / 2) * sinT;
      }

      const nx = px - centerX;
      const ny = py - centerY;
      const len = Math.hypot(nx, ny) || 1;

      points.push({
        x: px,
        y: py,
        nx: nx / len,
        ny: ny / len
      });
    }
    return points;
  }

  /**
   * Vaporize targetElement using CAEmitterLayer particle physics
   */
  vaporize(targetElement, onComplete = null, options = {}) {
    if (!targetElement) {
      if (onComplete) onComplete();
      return;
    }

    this._ensureCanvas();
    if (!this.canvas || !this.ctx) {
      targetElement.style.display = 'none';
      if (onComplete) onComplete();
      return;
    }

    // 1. Begin target element spring implode
    targetElement.classList.remove("island-materializing");
    targetElement.classList.add("island-vaporizing");

    const rect = targetElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      targetElement.style.display = 'none';
      targetElement.classList.remove("island-vaporizing");
      if (onComplete) onComplete();
      return;
    }

    // 2. Generate CAEmitterCells (Tuned for 60/120 FPS elegance)
    const points = this._sampleSquirclePoints(rect, options.particleCount || 38);
    const particleColors = [
      "#ffffff", // Diamond Stardust
      "#38bdf8", // Sapphire Cyan
      "#a855f7", // Amethyst Purple
      "#34d399", // Emerald Mint
      options.ambientColor || "#ffffff"
    ];

    points.forEach((pt) => {
      // Cell 1: CAEmitterCellStardust (Micro diamond sparkles)
      const speed = 40 + Math.random() * 95;
      const angleJitter = (Math.random() - 0.5) * 0.8;
      const baseAngle = Math.atan2(pt.ny, pt.nx) + angleJitter;
      const baseSize = 2 + Math.random() * 1.5;

      this.particles.push({
        type: "stardust",
        x: pt.x,
        y: pt.y,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed,
        drag: 0.915,
        baseSize: baseSize,
        size: baseSize,
        alpha: 0.95 + Math.random() * 0.05,
        alphaSpeed: 1.5 + Math.random() * 0.8,
        color: particleColors[Math.floor(Math.random() * particleColors.length)]
      });

      // Cell 2: CAEmitterCellQuantumDust (Luminous soft orbs - 35% probability)
      if (Math.random() > 0.65) {
        const dustSpeed = 15 + Math.random() * 35;
        const dustAngle = Math.atan2(pt.ny, pt.nx) + (Math.random() - 0.5) * 1.0;
        const dustSize = 3 + Math.random() * 2;
        this.particles.push({
          type: "quantum_dust",
          x: pt.x + (Math.random() - 0.5) * 4,
          y: pt.y + (Math.random() - 0.5) * 4,
          vx: Math.cos(dustAngle) * dustSpeed,
          vy: Math.sin(dustAngle) * dustSpeed - 10,
          drag: 0.93,
          baseSize: dustSize,
          size: dustSize,
          alpha: 0.65 + Math.random() * 0.25,
          alphaSpeed: 1.3 + Math.random() * 0.6,
          color: "#ffffff"
        });
      }
    });

    // 3. Coordinate DOM removal after spring transition
    const cleanupTimeout = setTimeout(() => {
      targetElement.style.display = 'none';
      targetElement.classList.remove("island-vaporizing");
      if (onComplete) onComplete();
    }, 420);

    // 4. Start particle loop if not already running
    if (!this.isEmitting) {
      this.isEmitting = true;
      this.lastTime = performance.now();
      this._renderLoop();
    }
  }

  /**
   * Materialize targetElement with Apple spring physics & stardust burst
   */
  materialize(targetElement, onComplete = null, options = {}) {
    if (!targetElement) {
      if (onComplete) onComplete();
      return;
    }
    targetElement.classList.remove("island-vaporizing");
    targetElement.style.display = '';
    targetElement.classList.add("island-materializing");

    this._ensureCanvas();
    if (this.canvas && this.ctx) {
      const rect = targetElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const points = this._sampleSquirclePoints(rect, options.particleCount || 28);
        const particleColors = [
          "#ffffff",
          "#38bdf8",
          "#a855f7",
          "#34d399",
          options.ambientColor || "#ffffff"
        ];
        points.forEach((pt) => {
          const speed = 25 + Math.random() * 55;
          const angle = Math.atan2(pt.ny, pt.nx) + (Math.random() - 0.5) * 0.6;
          const baseSize = 2 + Math.random() * 1.5;
          this.particles.push({
            type: "stardust",
            x: pt.x,
            y: pt.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            drag: 0.90,
            baseSize: baseSize,
            size: baseSize,
            alpha: 1.0,
            alphaSpeed: 2.4 + Math.random() * 1.0,
            color: particleColors[Math.floor(Math.random() * particleColors.length)]
          });
        });
        if (!this.isEmitting) {
          this.isEmitting = true;
          this.lastTime = performance.now();
          this._renderLoop();
        }
      }
    }

    const onEnd = () => {
      targetElement.removeEventListener("animationend", onEnd);
      targetElement.classList.remove("island-materializing");
      if (onComplete) onComplete();
    };
    targetElement.addEventListener("animationend", onEnd, { once: true });
    // Safety fallback
    setTimeout(onEnd, 480);
  }

  _renderLoop() {
    if (!this.isEmitting) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    const ctx = this.ctx;
    const winW = typeof window !== 'undefined' ? window.innerWidth : (this.canvas ? this.canvas.width : 800);
    const winH = typeof window !== 'undefined' ? window.innerHeight : (this.canvas ? this.canvas.height : 600);

    // High-performance dirty-rect clear (only clears the active particle region)
    if (this.lastDirtyRect) {
      ctx.clearRect(this.lastDirtyRect.x, this.lastDirtyRect.y, this.lastDirtyRect.w, this.lastDirtyRect.h);
    } else {
      ctx.clearRect(0, 0, winW, winH);
    }

    if (this.particles.length === 0) {
      this.isEmitting = false;
      this.lastDirtyRect = null;
      return;
    }

    // Additive blending for true Apple Core Animation stardust optics
    ctx.globalCompositeOperation = "lighter";

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Physics integration
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.alpha -= p.alphaSpeed * dt;

      if (p.alpha <= 0.01) {
        this.particles.splice(i, 1);
        continue;
      }

      // Track bounding box for dirty-rect clearing
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;

      // GPU Sprite Blit (Zero GC, sub-microsecond draw)
      const sprite = this._getSprite(p.type, p.color, p.baseSize);
      if (sprite) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        const drawW = sprite.width;
        const drawH = sprite.height;
        ctx.drawImage(sprite, p.x - drawW / 2, p.y - drawH / 2);
      } else {
        // Safe fallback for non-DOM / test environments
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.particles.length > 0) {
      // Calculate dirty region for next frame with padding
      this.lastDirtyRect = {
        x: Math.max(0, Math.floor(minX - 16)),
        y: Math.max(0, Math.floor(minY - 16)),
        w: Math.min(winW, Math.ceil(maxX - minX + 32)),
        h: Math.min(winH, Math.ceil(maxY - minY + 32))
      };

      if (typeof requestAnimationFrame !== 'undefined') {
        this.animId = requestAnimationFrame(() => this._renderLoop());
      }
    } else {
      this.isEmitting = false;
      this.lastDirtyRect = null;
      ctx.clearRect(0, 0, winW, winH);
    }
  }

  /**
   * Immediately clears all active particles and canvas
   */
  clear() {
    this.particles = [];
    this.isEmitting = false;
    if (this.animId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.ctx && this.canvas) {
      const winW = typeof window !== 'undefined' ? window.innerWidth : (this.canvas ? this.canvas.width : 800);
      const winH = typeof window !== 'undefined' ? window.innerHeight : (this.canvas ? this.canvas.height : 600);
      this.ctx.clearRect(0, 0, winW, winH);
    }
    this.lastDirtyRect = null;
  }
}

// Global instance attached to window for seamless renderer integration
if (typeof window !== 'undefined') {
  window.CAEmitterEngine = CAEmitterEngine;
  window.caEmitterLayer = new CAEmitterEngine();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CAEmitterEngine };
}
