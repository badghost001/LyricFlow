/**
 * FluidMeshGradient - Apple Music-style dynamic fluid WebGL mesh gradient
 * Renders an organic, liquid color canvas reacting to album art palette & track BPM.
 */
class FluidMeshGradient {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.ctx2d = null;
    this.useWebGL = false;
    this.animId = null;
    this.running = false;
    this.width = 0;
    this.height = 0;
    this.time = 0;
    this.lastTime = performance.now();

    // Default Aurora / Spotify palette (c0: base, c1: primary, c2: secondary, c3: tertiary, c4: accent)
    this.defaultPalette = [
      [8 / 255, 10 / 255, 18 / 255],     // c0: Deep ambient base
      [29 / 255, 185 / 255, 84 / 255],   // c1: Vibrant Emerald
      [14 / 255, 165 / 255, 233 / 255],  // c2: Electric Cyan
      [139 / 255, 92 / 255, 246 / 255],  // c3: Neon Violet
      [244 / 255, 63 / 94 / 255]         // c4: Rose Accent
    ];

    // Current interpolated colors (for smooth cross-fade between tracks)
    this.currentColors = JSON.parse(JSON.stringify(this.defaultPalette));
    this.targetColors = JSON.parse(JSON.stringify(this.defaultPalette));

    // Dynamic animation parameters reacting to playback and BPM
    this.baseSpeed = 1.0;
    this.targetSpeed = 1.0;
    this.currentSpeed = 1.0;
    this.intensity = 1.0;
    this.isPlaying = false;
    this.bpmFactor = 1.0;

    // Interactive mouse displacement
    this.targetMouse = [0.5, 0.5];
    this.currentMouse = [0.5, 0.5];

    this.init();
  }

  init() {
    if (!this.canvas) return;

    // Attempt WebGL context initialization
    try {
      this.gl = this.canvas.getContext('webgl', {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false,
        powerPreference: 'low-power'
      }) || this.canvas.getContext('experimental-webgl');

      if (this.gl && this.initShaders()) {
        this.useWebGL = true;
      }
    } catch (e) {
      console.warn('[FluidMesh] WebGL initialization fallback to 2D canvas:', e);
      this.useWebGL = false;
    }

    if (!this.useWebGL) {
      this.ctx2d = this.canvas.getContext('2d');
    }

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize(), { passive: true });

    // Subtle interactive mouse influence
    window.addEventListener('pointermove', (e) => {
      this.targetMouse[0] = Math.max(0, Math.min(1, e.clientX / (window.innerWidth || 1)));
      this.targetMouse[1] = Math.max(0, Math.min(1, 1.0 - (e.clientY / (window.innerHeight || 1))));
    }, { passive: true });
  }

  initShaders() {
    const gl = this.gl;

    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // High performance double domain-warping procedural fluid shader
    const fsSource = `
      precision mediump float;
      varying vec2 v_uv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec3 u_c0;
      uniform vec3 u_c1;
      uniform vec3 u_c2;
      uniform vec3 u_c3;
      uniform vec3 u_c4;
      uniform vec2 u_mouse;
      uniform float u_intensity;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        v += 0.5200 * snoise(p); p = p * 2.02;
        v += 0.2800 * snoise(p); p = p * 2.03;
        v += 0.1200 * snoise(p);
        return v;
      }

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        float aspect = u_resolution.x / max(1.0, u_resolution.y);
        vec2 uv = vec2((st.x - 0.5) * aspect, st.y - 0.5);

        // Fluid interactive mouse displacement with spring damping
        vec2 mPos = vec2((u_mouse.x - 0.5) * aspect, u_mouse.y - 0.5);
        float mDist = length(uv - mPos);
        vec2 mForce = normalize(uv - mPos + 0.0001) * exp(-mDist * 3.2) * 0.14;
        uv += mForce;

        float t = u_time * 0.18;

        // Dynamic wandering color nodes (Lissajous orbits across the viewport)
        vec2 p1 = vec2(sin(t * 0.85 + 0.3) * 0.45 * aspect, cos(t * 0.72) * 0.38);
        vec2 p2 = vec2(cos(t * 0.65 + 2.1) * 0.48 * aspect, sin(t * 0.88 + 1.2) * 0.36);
        vec2 p3 = vec2(sin(t * 0.95 + 4.2) * 0.38 * aspect, cos(t * 0.58 + 3.0) * 0.42);
        vec2 p4 = vec2(cos(t * 0.78 + 5.1) * 0.42 * aspect, sin(t * 0.68 + 4.5) * 0.40);

        // Multi-scale double domain warping for silky fluid turbulence
        vec2 q = vec2(fbm(uv + vec2(0.0, t * 0.45)), fbm(uv + vec2(5.2, t * 0.4)));
        vec2 r = vec2(fbm(uv + 2.4 * q + vec2(1.7, 9.2) + t * 0.3), fbm(uv + 2.4 * q + vec2(8.3, 2.8) + t * 0.25));
        vec2 warpedUV = uv + 0.38 * r;

        // Inverted distance calculation with organic noise modulation
        float d1 = length(warpedUV - p1) + 0.22 * fbm(warpedUV * 1.8 + t * 0.2);
        float d2 = length(warpedUV - p2) + 0.22 * fbm(warpedUV * 1.8 + vec2(3.1, 1.4) - t * 0.2);
        float d3 = length(warpedUV - p3) + 0.22 * fbm(warpedUV * 1.8 + vec2(6.7, 4.2) + t * 0.25);
        float d4 = length(warpedUV - p4) + 0.22 * fbm(warpedUV * 1.8 + vec2(9.2, 7.8) - t * 0.22);

        // Smooth cubic Hermite falloff
        float w1 = smoothstep(1.25, 0.02, d1);
        float w2 = smoothstep(1.30, 0.02, d2);
        float w3 = smoothstep(1.15, 0.02, d3);
        float w4 = smoothstep(1.20, 0.02, d4);

        float totalW = w1 + w2 + w3 + w4 + 0.001;

        // Non-muddy perceptual color blending
        vec3 fluidCol = (u_c1 * w1 + u_c2 * w2 + u_c3 * w3 + u_c4 * w4) / totalW;

        // Blend liquid lights over the deep velvety base color
        float coverage = clamp(totalW * 0.58, 0.0, 1.0);
        vec3 col = mix(u_c0, fluidCol, smoothstep(0.05, 0.95, coverage));

        // Luminous crest highlight (ethereal glow at high-energy intersections)
        float crest = smoothstep(0.65, 1.0, w3 * w1) * 0.25;
        col += u_c3 * crest;

        // Soft peripheral vignette for center lyric clarity & depth
        float dist = length(st - 0.5);
        float vig = smoothstep(1.15, 0.3, dist);
        col = mix(u_c0 * 0.72, col, vig);

        // High-frequency film grain / anti-banding dither (Apple tactile texture)
        float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        col += (dither - 0.5) * (2.8 / 255.0);

        col *= u_intensity;
        gl_FragColor = vec4(col, 0.96);
      }
    `;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[FluidMesh] Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return false;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[FluidMesh] Program link error:', gl.getProgramInfoLog(program));
      return false;
    }

    this.program = program;
    gl.useProgram(program);

    // Fullscreen quad buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    this.uniforms = {
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_c0: gl.getUniformLocation(program, 'u_c0'),
      u_c1: gl.getUniformLocation(program, 'u_c1'),
      u_c2: gl.getUniformLocation(program, 'u_c2'),
      u_c3: gl.getUniformLocation(program, 'u_c3'),
      u_c4: gl.getUniformLocation(program, 'u_c4'),
      u_mouse: gl.getUniformLocation(program, 'u_mouse'),
      u_intensity: gl.getUniformLocation(program, 'u_intensity'),
    };

    return true;
  }

  handleResize() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    // Render at half-res for maximum GPU efficiency (bilinear upscaling gives natural blur)
    const scale = 0.5 * dpr;
    this.width = Math.max(320, Math.floor(window.innerWidth * scale));
    this.height = Math.max(240, Math.floor(window.innerHeight * scale));

    if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    if (this.useWebGL && this.gl) {
      this.gl.viewport(0, 0, this.width, this.height);
    }
  }

  setPalette(palette) {
    if (!Array.isArray(palette) || palette.length < 5) return;
    // Map normalized [0, 1] RGB
    this.targetColors = palette.map(c => [
      Math.max(0, Math.min(255, c.r)) / 255,
      Math.max(0, Math.min(255, c.g)) / 255,
      Math.max(0, Math.min(255, c.b)) / 255,
    ]);
  }

  resetToDefault() {
    this.targetColors = JSON.parse(JSON.stringify(this.defaultPalette));
  }

  setPlaybackState(isPlaying, bpmProfile = 'normal', speedSlider = 1.0) {
    this.isPlaying = Boolean(isPlaying);

    // BPM speed factor
    if (bpmProfile === 'high') {
      this.bpmFactor = 1.35;
    } else if (bpmProfile === 'low') {
      this.bpmFactor = 0.75;
    } else {
      this.bpmFactor = 1.0;
    }

    // When paused, slow down to gentle meditative breathing (0.22x)
    this.targetSpeed = this.isPlaying ? (1.0 * this.bpmFactor * speedSlider) : 0.22;
  }

  setIntensity(val) {
    this.intensity = Math.max(0.1, Math.min(2.0, val));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  loop() {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Smooth speed interpolation (lerp)
    this.currentSpeed += (this.targetSpeed - this.currentSpeed) * 0.06;
    this.time += dt * this.currentSpeed;

    // Smooth color interpolation (lerp ~1.5s cross-dissolve)
    for (let i = 0; i < 5; i++) {
      for (let ch = 0; ch < 3; ch++) {
        this.currentColors[i][ch] += (this.targetColors[i][ch] - this.currentColors[i][ch]) * 0.055;
      }
    }

    // Smooth mouse position interpolation
    this.currentMouse[0] += (this.targetMouse[0] - this.currentMouse[0]) * 0.04;
    this.currentMouse[1] += (this.targetMouse[1] - this.currentMouse[1]) * 0.04;

    if (this.useWebGL) {
      this.renderWebGL();
    } else {
      this.render2DFallback();
    }

    this.animId = requestAnimationFrame(() => this.loop());
  }

  renderWebGL() {
    const gl = this.gl;
    if (!gl) return;

    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.u_resolution, this.width, this.height);
    gl.uniform1f(this.uniforms.u_time, this.time);
    gl.uniform1f(this.uniforms.u_intensity, this.intensity);
    gl.uniform2f(this.uniforms.u_mouse, this.currentMouse[0], this.currentMouse[1]);

    gl.uniform3fv(this.uniforms.u_c0, this.currentColors[0]);
    gl.uniform3fv(this.uniforms.u_c1, this.currentColors[1]);
    gl.uniform3fv(this.uniforms.u_c2, this.currentColors[2]);
    gl.uniform3fv(this.uniforms.u_c3, this.currentColors[3]);
    gl.uniform3fv(this.uniforms.u_c4, this.currentColors[4]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  render2DFallback() {
    const ctx = this.ctx2d;
    if (!ctx) return;

    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const c0 = this.currentColors[0].map(v => Math.round(v * 255));
    ctx.fillStyle = `rgb(${c0[0]}, ${c0[1]}, ${c0[2]})`;
    ctx.fillRect(0, 0, w, h);

    // Multi-orb procedural blend
    const orbs = [
      { c: this.currentColors[1], ox: 0.3, oy: 0.35, r: 0.55, speed: 0.8 },
      { c: this.currentColors[2], ox: 0.7, oy: 0.65, r: 0.60, speed: 0.6 },
      { c: this.currentColors[3], ox: 0.25, oy: 0.75, r: 0.45, speed: 0.7 },
      { c: this.currentColors[4], ox: 0.8, oy: 0.25, r: 0.40, speed: 0.9 },
    ];

    ctx.save();
    ctx.globalAlpha = Math.min(1.0, Math.max(0.1, this.intensity));
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      const cx = (o.ox + Math.sin(this.time * o.speed + i) * 0.18) * w;
      const cy = (o.oy + Math.cos(this.time * (o.speed * 0.8) + i * 1.5) * 0.18) * h;
      const radius = Math.min(w, h) * o.r;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      const rgb = o.c.map(v => Math.round(v * 255));
      grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`);
      grad.addColorStop(0.5, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`);
      grad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Export to global window namespace
if (typeof window !== 'undefined') {
  window.FluidMeshGradient = FluidMeshGradient;
}
