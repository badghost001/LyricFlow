/**
 * Flow Beats - Interactive Rhythm Mini-Game & Spotify Prompt
 * Renders on idle ("Ready to Flow") state.
 *
 * Features:
 * - HTML5 Canvas 3-lane rhythmic energy visualizer
 * - Audio orb controlled by Left/Right arrows, A/D, mouse position, or touch
 * - Pentatonic chime synthesizer via Web Audio API
 * - Streak multipliers & high score tracking in localStorage
 * - Prominent 1-click Spotify prompt & launcher button
 * - Clean lifecycle (mount / destroy) for zero overhead during music playback
 */

(function (global) {
  const _raf = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame
      : (cb) => setTimeout(cb, 16));

  const _caf = typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame
    : (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'
      ? window.cancelAnimationFrame
      : (id) => clearTimeout(id));

  class FlowBeatsGameEngine {
    constructor() {
      this.container = null;
      this.canvas = null;
      this.ctx = null;
      this.animId = null;
      this.audioCtx = null;
      this.score = 0;
      this.streak = 0;
      this.streakCount = 0;
      this.highScore = 0;
      this.notes = [];
      this.particles = [];
      this.floatingTexts = [];
      this.lanes = [0.2, 0.5, 0.8]; // relative x positions (20%, 50%, 80%)
      this.currentLane = 1;
      this.targetLaneX = 0.5;
      this.playerX = 0.5;
      this.catcherY = 0.84;
      this.lastSpawnTime = 0;
      this.spawnInterval = 500;
      this.isRunning = false;
      this.noteSeq = 0;

      this.boundKeyHandler = this.onKeyDown.bind(this);
      this.boundMouseMove = this.onMouseMove.bind(this);
      this.boundTouchMove = this.onTouchMove.bind(this);
      this.boundCanvasClick = this.onCanvasClick.bind(this);

      // Pentatonic scale (C4, D4, E4, G4, A4, C5)
      this.frequencies = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
      this.laneColors = [
        { primary: '#00f2fe', glow: 'rgba(0, 242, 254, 0.45)' }, // Cyan
        { primary: '#1ed760', glow: 'rgba(30, 215, 96, 0.45)' },  // Spotify Green
        { primary: '#f72585', glow: 'rgba(247, 37, 133, 0.45)' }  // Magenta
      ];
    }

    mount(containerEl) {
      if (!containerEl) return;
      this.destroy(); // Ensure clean teardown if already running
      this.container = containerEl;
      this.score = 0;
      this.streak = 1;
      this.streakCount = 0;
      this.notes = [];
      this.particles = [];
      this.floatingTexts = [];
      this.currentLane = 1;

      try {
        this.highScore = parseInt(localStorage.getItem('lyricflow_flowbeats_highscore') || '0', 10) || 0;
      } catch (_) {
        this.highScore = 0;
      }

      this.container.innerHTML = `
        <div class="flow-game-card" id="flow-game-card">
          <div class="flow-game-header">
            <div class="flow-game-tag">Flow Beats</div>
            <div class="flow-game-prompt-title">Ready to Flow</div>
            <div class="flow-game-prompt-sub">Offline practice works without a music source. Catch beats with arrow keys or cursor, or launch Spotify for live lyrics.</div>
            <div class="flow-game-score-bar">
              <div class="flow-score-pill">
                <span class="flow-score-label">SCORE</span>
                <span class="flow-score-val" id="flow-beats-score">0</span>
              </div>
              <div class="flow-score-pill flow-streak-pill" id="flow-beats-streak-pill">
                <span class="flow-score-label">STREAK</span>
                <span class="flow-score-val" id="flow-beats-streak">1x</span>
              </div>
              <div class="flow-score-pill">
                <span class="flow-score-label">BEST</span>
                <span class="flow-score-val" id="flow-beats-highscore">${this.highScore}</span>
              </div>
            </div>
          </div>

          <div class="flow-game-canvas-wrap">
            <canvas id="flow-game-canvas" width="480" height="260"></canvas>
            <div class="flow-game-hud-overlay">
              <div class="flow-game-hint">‹ › / A D / Move Cursor to Catch Beats</div>
            </div>
          </div>

          <div class="flow-game-actions">
            <button type="button" class="btn-flow-spotify" id="btn-flow-spotify" title="Launch Spotify and start lyrics stream">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.308c-.216.354-.664.464-1.018.248-2.825-1.727-6.38-2.118-10.567-1.163-.404.093-.811-.161-.904-.565s.161-.811.565-.904c4.582-1.045 8.528-.593 11.676 1.332.354.216.464.664.248 1.018zm1.464-3.26c-.272.443-.84.584-1.283.312-3.235-1.988-8.167-2.566-12.015-1.401-.497.151-1.02-.128-1.171-.625s.128-1.02.625-1.171c4.394-1.333 9.83-.67 13.532 1.602.443.272.584.84.312 1.283zm.127-3.4c-3.88-2.304-10.283-2.516-13.993-1.417-.597.181-1.23-.153-1.41-1.229.181-.597.153-1.23 1.229-1.41 4.262-1.293 11.332-1.056 15.8 1.6.536.318.712 1.013.393 1.549s-1.013.712-1.549.393z"/>
              </svg>
              <span>Play Spotify ▶</span>
            </button>
          </div>
        </div>
      `;

      this.canvas = this.container.querySelector('#flow-game-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      const spotBtn = this.container.querySelector('#btn-flow-spotify');
      if (spotBtn) {
        spotBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.launchSpotify();
        });
      }

      window.addEventListener('keydown', this.boundKeyHandler);
      if (this.canvas) {
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: true });
        this.canvas.addEventListener('click', this.boundCanvasClick);
      }

      this.isRunning = true;
      this.lastSpawnTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      this.targetLaneX = this.lanes[this.currentLane];
      this.playerX = this.targetLaneX;

      const loop = (timestamp) => {
        if (!this.isRunning) return;
        this.update(timestamp);
        this.render();
        this.animId = _raf(loop);
      };
      this.animId = _raf(loop);
    }

    launchSpotify() {
      try {
        if (typeof window.controlPlayback === 'function') {
          window.controlPlayback('play-pause');
        }
      } catch (_) {}

      try {
        if (window.__TAURI__?.shell?.open) {
          window.__TAURI__.shell.open('spotify:');
        } else {
          window.location.href = 'spotify:';
        }
      } catch (_) {}

      if (typeof window.showDynamicToast === 'function') {
        window.showDynamicToast('Launching Spotify... Synced lyrics will flow automatically!');
      }
    }

    onKeyDown(e) {
      if (!this.isRunning) return;
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (e.key.startsWith('Arrow')) e.preventDefault?.();
        this.currentLane = Math.max(0, this.currentLane - 1);
        this.targetLaneX = this.lanes[this.currentLane];
        this.pulsePlayer();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (e.key.startsWith('Arrow')) e.preventDefault?.();
        this.currentLane = Math.min(this.lanes.length - 1, this.currentLane + 1);
        this.targetLaneX = this.lanes[this.currentLane];
        this.pulsePlayer();
      } else if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault?.();
        this.pulsePlayer();
      }
    }

    onMouseMove(e) {
      if (!this.canvas || !this.isRunning) return;
      const rect = this.canvas.getBoundingClientRect();
      const relX = Math.max(0.1, Math.min(0.9, (e.clientX - rect.left) / rect.width));
      // Snap to closest lane or continuous
      let closestLane = 0;
      let minDiff = 999;
      for (let i = 0; i < this.lanes.length; i++) {
        const diff = Math.abs(relX - this.lanes[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closestLane = i;
        }
      }
      this.currentLane = closestLane;
      this.targetLaneX = this.lanes[closestLane];
    }

    onTouchMove(e) {
      if (!this.canvas || !this.isRunning || !e.touches || e.touches.length === 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const relX = (touch.clientX - rect.left) / rect.width;
      let closestLane = 0;
      let minDiff = 999;
      for (let i = 0; i < this.lanes.length; i++) {
        const diff = Math.abs(relX - this.lanes[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closestLane = i;
        }
      }
      this.currentLane = closestLane;
      this.targetLaneX = this.lanes[closestLane];
    }

    onCanvasClick(e) {
      if (!this.isRunning) return;
      this.pulsePlayer();
    }

    pulsePlayer() {
      // Create ripple ring around player orb
      const w = this.canvas ? this.canvas.width : 480;
      const h = this.canvas ? this.canvas.height : 260;
      this.particles.push({
        x: this.playerX * w,
        y: this.catcherY * h,
        vx: 0,
        vy: 0,
        radius: 12,
        maxRadius: 36,
        alpha: 0.9,
        color: this.laneColors[this.currentLane].primary,
        isRing: true
      });
    }

    playHarmonicChime(noteIndex = 0) {
      try {
        if (!this.audioCtx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) {
            this.audioCtx = new AudioCtx();
          }
        }
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        const freq = this.frequencies[noteIndex % this.frequencies.length];
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.22);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.23);
      } catch (_) {}
    }

    update(now) {
      const nowMs = now || (typeof performance !== 'undefined' ? performance.now() : Date.now());

      // Smoothly interpolate player X towards target lane X
      this.playerX += (this.targetLaneX - this.playerX) * 0.22;

      // Spawn falling beat notes
      if (nowMs - this.lastSpawnTime > this.spawnInterval) {
        this.lastSpawnTime = nowMs;
        // Rhythm lane generator
        const lane = Math.floor(Math.random() * this.lanes.length);
        this.noteSeq++;
        this.notes.push({
          id: this.noteSeq,
          lane,
          x: this.lanes[lane],
          y: -0.05,
          vy: 0.0035, // speed down the canvas
          radius: 13,
          color: this.laneColors[lane].primary,
          glow: this.laneColors[lane].glow,
          hit: false,
          missed: false
        });
      }

      const w = this.canvas ? this.canvas.width : 480;
      const h = this.canvas ? this.canvas.height : 260;

      // Update notes
      for (let i = this.notes.length - 1; i >= 0; i--) {
        const note = this.notes[i];
        note.y += note.vy;

        // Check catch hit zone (y around catcherY)
        const hitDistance = Math.abs(note.y - this.catcherY);
        const laneDistance = Math.abs(this.playerX - note.x);

        if (!note.hit && !note.missed && hitDistance < 0.06 && laneDistance < 0.12) {
          // HIT!
          note.hit = true;
          this.handleHit(note, w, h);
          this.notes.splice(i, 1);
          continue;
        }

        // Miss check
        if (note.y > 0.96 && !note.missed) {
          note.missed = true;
          this.handleMiss(note, w, h);
          this.notes.splice(i, 1);
          continue;
        }

        // Clean up out-of-bounds
        if (note.y > 1.1) {
          this.notes.splice(i, 1);
        }
      }

      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.isRing) {
          p.radius += 1.4;
          p.alpha -= 0.035;
        } else {
          p.alpha -= 0.025;
        }
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // Update floating texts
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.03;
        if (ft.alpha <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }

    handleHit(note, w, h) {
      this.streakCount++;
      if (this.streakCount >= 15) {
        this.streak = 8;
      } else if (this.streakCount >= 8) {
        this.streak = 4;
      } else if (this.streakCount >= 3) {
        this.streak = 2;
      } else {
        this.streak = 1;
      }

      const points = 100 * this.streak;
      this.score += points;

      if (this.score > this.highScore) {
        this.highScore = this.score;
        try {
          localStorage.setItem('lyricflow_flowbeats_highscore', String(this.highScore));
        } catch (_) {}
      }

      // Update DOM score display
      const scoreEl = this.container?.querySelector('#flow-beats-score');
      const streakEl = this.container?.querySelector('#flow-beats-streak');
      const highEl = this.container?.querySelector('#flow-beats-highscore');
      const streakPill = this.container?.querySelector('#flow-beats-streak-pill');

      if (scoreEl) scoreEl.textContent = String(this.score);
      if (streakEl) streakEl.textContent = `${this.streak}x`;
      if (highEl) highEl.textContent = String(this.highScore);
      if (streakPill) {
        streakPill.classList.toggle('is-hot', this.streak >= 4);
      }

      // Spawn burst particles
      const px = note.x * w;
      const py = this.catcherY * h;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
        const speed = 1.8 + Math.random() * 2.2;
        this.particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 3 + Math.random() * 2,
          alpha: 1.0,
          color: note.color,
          isRing: false
        });
      }

      // Ring pulse
      this.particles.push({
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        radius: 10,
        maxRadius: 36,
        alpha: 1.0,
        color: note.color,
        isRing: true
      });

      // Floating text
      this.floatingTexts.push({
        text: `+${points}`,
        x: px,
        y: py - 14,
        vy: -0.9,
        alpha: 1.0,
        color: note.color
      });

      // Play soft chime
      this.playHarmonicChime(this.noteSeq);
    }

    handleMiss(note, w, h) {
      this.streak = 1;
      this.streakCount = 0;
      const streakEl = this.container?.querySelector('#flow-beats-streak');
      const streakPill = this.container?.querySelector('#flow-beats-streak-pill');
      if (streakEl) streakEl.textContent = '1x';
      if (streakPill) streakPill.classList.remove('is-hot');

      // Subtle miss puff
      this.particles.push({
        x: note.x * w,
        y: this.catcherY * h,
        vx: 0,
        vy: 0.5,
        radius: 8,
        alpha: 0.4,
        color: 'rgba(255, 255, 255, 0.3)',
        isRing: true
      });
    }

    render() {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Clear with dark translucent fill
      ctx.clearRect(0, 0, w, h);

      // Draw streaming lane guides
      for (let i = 0; i < this.lanes.length; i++) {
        const lx = this.lanes[i] * w;
        ctx.beginPath();
        ctx.moveTo(lx, 10);
        ctx.lineTo(lx, h - 10);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw catcher baseline
      const cy = this.catcherY * h;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, cy);
      ctx.lineTo(w * 0.9, cy);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw falling beat notes
      for (let i = 0; i < this.notes.length; i++) {
        const note = this.notes[i];
        const nx = note.x * w;
        const ny = note.y * h;

        // Outer glow
        ctx.save();
        ctx.shadowColor = note.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(nx, ny, note.radius, 0, Math.PI * 2);
        ctx.fillStyle = note.color;
        ctx.fill();

        // Inner bright core
        ctx.beginPath();
        ctx.arc(nx, ny, note.radius * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      }

      // Draw particles
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        if (p.isRing) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Player Orb at (playerX * w, cy)
      const px = this.playerX * w;
      const activeColor = this.laneColors[this.currentLane].primary;

      ctx.save();
      // Outer aura
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(px, cy, 18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();

      // Liquid glass ring
      ctx.beginPath();
      ctx.arc(px, cy, 15, 0, Math.PI * 2);
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner white bead
      ctx.beginPath();
      ctx.arc(px, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffffff';
      ctx.fill();
      ctx.restore();

      // Draw floating score texts
      for (let i = 0; i < this.floatingTexts.length; i++) {
        const ft = this.floatingTexts[i];
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }
    }

    destroy() {
      this.isRunning = false;
      if (this.animId) {
        _caf(this.animId);
        this.animId = null;
      }
      window.removeEventListener('keydown', this.boundKeyHandler);
      if (this.canvas) {
        this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        this.canvas.removeEventListener('touchmove', this.boundTouchMove);
        this.canvas.removeEventListener('click', this.boundCanvasClick);
      }
      if (this.audioCtx) {
        try {
          this.audioCtx.close();
        } catch (_) {}
        this.audioCtx = null;
      }
      this.notes = [];
      this.particles = [];
      this.floatingTexts = [];
      if (this.container) {
        this.container.innerHTML = '';
      }
      this.container = null;
      this.canvas = null;
      this.ctx = null;
    }
  }

  const FlowBeatsGame = new FlowBeatsGameEngine();

  // Export to window and CommonJS
  global.FlowBeatsGame = FlowBeatsGame;
  global.FlowBeatsGameEngine = FlowBeatsGameEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlowBeatsGame;
  }
})(typeof window !== 'undefined' ? window : globalThis);
