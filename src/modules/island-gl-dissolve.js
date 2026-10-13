/**
 * ====================================================================
 * IslandGLDissolve: Telegram-Style WebGL Disintegration Shader
 * 
 * Implements Telegram message deletion dissolution animation for
 * Dynamic Island inactivity timeout / vaporization.
 * Sweeps left-to-right directional noise erosion with floating ash
 * particle drift and smoothstep edge alpha fading.
 * ====================================================================
 */

const ISLAND_DISSOLVE_VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`;

const ISLAND_DISSOLVE_FRAGMENT_SHADER = `
#ifdef GL_ES
precision medium float;
#endif

varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_progress;

// Simple pseudo-random noise generator
float random(vec2 uv) {
    return fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = v_texCoord;
    
    // Generate a noise value based on the pixel's coordinate
    float noise = random(uv);
    
    // Create a directional disintegration gradient (e.g., left to right, or bottom to top)
    // Adding uv.x makes the dissolve sweep across the message instead of vanishing all at once
    float dissolveFactor = u_progress * 1.5; // Scale to ensure complete erasure
    float threshold = noise + (uv.x * 0.3);  
    
    // Discard the pixel if the progress exceeds the threshold (this creates the holes/dust)
    if (dissolveFactor > threshold) {
        discard;
    }
    
    // Optional: Simulate particles drifting upward/outward right before they vanish
    if (dissolveFactor > threshold - 0.15) {
        // Shift UV slightly upward to make edge pixels look like floating ash
        uv.y += (dissolveFactor - (threshold - 0.15)) * 0.05;
    }

    // Sample and output the original texture color
    vec4 texColor = texture2D(u_texture, uv);
    
    // Fade out the remaining "edge dust" slightly as it dissolves
    float alphaFade = smoothstep(threshold, threshold - 0.1, dissolveFactor);
    texColor.a *= (1.0 - alphaFade);

    gl_FragColor = texColor;
}
`;

class IslandGLDissolve {
  constructor(canvasId = "island-gl-dissolve-canvas") {
    this.canvasId = canvasId;
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.posBuffer = null;
    this.texBuffer = null;
    this.texture = null;
    this.uProgressLoc = null;
    this.uTextureLoc = null;
    this.animating = false;
    this.animFrameId = null;
    this.activeTarget = null;
    this.activeOnComplete = null;

    if (typeof document !== 'undefined') {
      this._ensureCanvas();
    }
  }

  _ensureCanvas() {
    if (typeof document === 'undefined') return;
    this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.id = this.canvasId;
      this.canvas.className = "island-gl-dissolve-canvas";
      this.canvas.style.cssText = "position:fixed;pointer-events:none;z-index:999999;display:none;";
      const container = document.querySelector(".app-container") || document.body;
      container.appendChild(this.canvas);
    }
    this._initGL();
  }

  _initGL() {
    if (!this.canvas) return false;
    if (this.gl && this.program) return true;

    try {
      this.gl = this.canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        preserveDrawingBuffer: false
      }) || this.canvas.getContext("experimental-webgl", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: true
      });
    } catch (e) {
      console.warn("[IslandGLDissolve] WebGL context unavailable:", e);
      this.gl = null;
      return false;
    }

    if (!this.gl) return false;

    const gl = this.gl;

    // Compile Shaders
    const vertShader = this._compileShader(gl.VERTEX_SHADER, ISLAND_DISSOLVE_VERTEX_SHADER);
    const fragShader = this._compileShader(gl.FRAGMENT_SHADER, ISLAND_DISSOLVE_FRAGMENT_SHADER);
    if (!vertShader || !fragShader) return false;

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[IslandGLDissolve] Program link failure:", gl.getProgramInfoLog(program));
      return false;
    }
    this.program = program;

    // Attributes and Uniforms
    this.aPositionLoc = gl.getAttribLocation(program, "a_position");
    this.aTexCoordLoc = gl.getAttribLocation(program, "a_texCoord");
    this.uProgressLoc = gl.getUniformLocation(program, "u_progress");
    this.uTextureLoc = gl.getUniformLocation(program, "u_texture");

    // Quad geometry: standard clip space [-1, 1]
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0,
    ]);
    this.posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Texture coords: (0, 1) top-left to (1, 0) bottom-right to flip Y correctly
    const texCoords = new Float32Array([
      0.0, 1.0,
      1.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,
    ]);
    this.texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    // Create persistent texture object
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return true;
  }

  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("[IslandGLDissolve] Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * Snapshot the targetElement visually onto an offscreen 2D canvas for texture upload
   */
  _captureElement(targetElement) {
    if (!targetElement) return null;
    const rect = targetElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));

    if (typeof document === 'undefined') {
      return { width: w, height: h };
    }

    const offCanvas = document.createElement("canvas");
    offCanvas.width = w;
    offCanvas.height = h;
    const ctx = offCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(dpr, dpr);

    // 1. Draw capsule background squircle matching current styles
    const pillRadius = rect.height / 2;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, rect.width, rect.height, pillRadius);
    } else {
      ctx.arc(pillRadius, pillRadius, pillRadius, Math.PI / 2, Math.PI * 1.5);
      ctx.arc(rect.width - pillRadius, pillRadius, pillRadius, Math.PI * 1.5, Math.PI / 2);
      ctx.closePath();
    }
    ctx.fill();

    // Specular border
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.stroke();

    // 2. Render Album Artwork if present & loaded
    const artImg = targetElement.querySelector("#island-art-img") || targetElement.querySelector("img");
    if (artImg && (artImg.complete || artImg.naturalWidth > 0)) {
      try {
        const artRect = artImg.getBoundingClientRect();
        const ox = artRect.left - rect.left;
        const oy = artRect.top - rect.top;
        const ow = artRect.width;
        const oh = artRect.height;
        if (ow > 0 && oh > 0) {
          ctx.save();
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(ox, oy, ow, oh, 6);
          } else {
            ctx.rect(ox, oy, ow, oh);
          }
          ctx.clip();
          ctx.drawImage(artImg, ox, oy, ow, oh);
          ctx.restore();
        }
      } catch (e) {
        // Cross-origin image or empty fallback
      }
    }

    // 3. Render Title & Artist Text
    const titleEl = targetElement.querySelector(".island-title") || targetElement.querySelector("#island-title");
    if (titleEl) {
      const titleRect = titleEl.getBoundingClientRect();
      const text = titleEl.textContent || "";
      if (text) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 12px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
        ctx.fillText(text, titleRect.left - rect.left, (titleRect.top - rect.top) + 11);
      }
    }

    const artistEl = targetElement.querySelector(".island-artist") || targetElement.querySelector("#island-artist");
    if (artistEl) {
      const artistRect = artistEl.getBoundingClientRect();
      const text = artistEl.textContent || "";
      if (text) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
        ctx.font = "400 11px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
        ctx.fillText(text, artistRect.left - rect.left, (artistRect.top - rect.top) + 10);
      }
    }

    return offCanvas;
  }

  /**
   * Run Telegram-style disintegration animation over targetElement
   * @param {HTMLElement} targetElement The Dynamic Island capsule to dissolve
   * @param {Function} onComplete Callback after animation terminates
   * @param {Object} options Configuration options (duration, ambientColor)
   */
  disintegrate(targetElement, onComplete = null, options = {}) {
    if (!targetElement) {
      if (onComplete) onComplete();
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || targetElement.style.display === 'none') {
      targetElement.style.display = 'none';
      if (onComplete) onComplete();
      return;
    }

    this._ensureCanvas();
    if (!this.gl || !this._initGL()) {
      // Fallback: If WebGL is not available, execute standard DOM hide
      targetElement.style.display = 'none';
      if (onComplete) onComplete();
      return;
    }

    // Stop any existing animation
    this.stop();

    const snapshotCanvas = this._captureElement(targetElement);
    if (!snapshotCanvas) {
      targetElement.style.display = 'none';
      if (onComplete) onComplete();
      return;
    }

    const gl = this.gl;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

    // Size WebGL canvas to exact DOM overlay coordinates
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.canvas.style.left = `${rect.left}px`;
    this.canvas.style.top = `${rect.top}px`;
    this.canvas.style.display = "block";

    // Upload snapshot to WebGL texture
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snapshotCanvas);
    } catch (e) {
      console.warn("[IslandGLDissolve] Failed uploading texture:", e);
      this.canvas.style.display = "none";
      targetElement.style.display = "none";
      if (onComplete) onComplete();
      return;
    }

    // Hide original DOM element immediately as WebGL quad takes over
    targetElement.style.opacity = "0";

    this.activeTarget = targetElement;
    this.activeOnComplete = onComplete;
    this.animating = true;

    const duration = options.duration || 680; // ms
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const raf = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame : (cb) => setTimeout(() => cb(Date.now()), 16);
    const caf = (typeof cancelAnimationFrame !== 'undefined') ? cancelAnimationFrame : (id) => clearTimeout(id);

    // Enable blending for smooth alpha dust fade
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.enableVertexAttribArray(this.aPositionLoc);
    gl.vertexAttribPointer(this.aPositionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
    gl.enableVertexAttribArray(this.aTexCoordLoc);
    gl.vertexAttribPointer(this.aTexCoordLoc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uTextureLoc, 0);

    const step = (now) => {
      if (!this.animating) return;

      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      gl.uniform1f(this.uProgressLoc, progress);

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (progress < 1.0) {
        this.animFrameId = raf(step);
      } else {
        this.animating = false;
        this.animFrameId = null;
        if (this.canvas) this.canvas.style.display = "none";
        if (this.activeTarget) {
          this.activeTarget.style.display = "none";
          this.activeTarget.style.opacity = "";
        }
        const done = this.activeOnComplete;
        this.activeTarget = null;
        this.activeOnComplete = null;
        if (done) done();
      }
    };

    this.animFrameId = raf(step);
  }

  /**
   * Stop active disintegration immediately (e.g. on user wake / song play)
   */
  stop() {
    this.animating = false;
    const caf = (typeof cancelAnimationFrame !== 'undefined') ? cancelAnimationFrame : (id) => clearTimeout(id);
    if (this.animFrameId) {
      caf(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.canvas) {
      this.canvas.style.display = "none";
    }
    if (this.activeTarget) {
      this.activeTarget.style.opacity = "";
      this.activeTarget = null;
    }
    this.activeOnComplete = null;
  }
}

// Global Registration & Export
if (typeof window !== 'undefined') {
  window.IslandGLDissolve = IslandGLDissolve;
  window.islandGlDissolve = new IslandGLDissolve();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IslandGLDissolve,
    ISLAND_DISSOLVE_VERTEX_SHADER,
    ISLAND_DISSOLVE_FRAGMENT_SHADER
  };
}
