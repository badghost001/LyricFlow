/**
 * LyricFlow - Cinematic Motif Engine
 * Art-directed vector illustration motifs communicating semantic concepts.
 * 
 * Replaces generic icons with nuanced visual metaphors:
 * - LOVE: Subtle hand-drawn heart, intertwined contours, pulse/heartbeat line, expanding ripples
 * - NIGHT: Crescent moon, distant stars, twilight horizon, orbital arc
 * - LONELY: Isolated silhouette, vast negative space with distant beacon, vertical thread
 * - MEMORY: Minimalist photograph frame, offset silhouette echo, film register ticks
 * - TIME: Clock geometry with fine hands, circular progression, radial sundial ticks
 * - FIRE: Organic flame contour, ascending ember sparks, heat distortion ripple
 * - RAIN: Slanted linear rain streaks, concentric water ripple rings, falling droplets
 * - ROAD: Converging perspective lines to horizon, winding ribbon path, highway lane dash
 * - HOME: Illuminated window frame, architectural gable silhouette, doorway light wedge
 * - DREAM: Floating surreal spheres, drifting ethereal cloud curves, folded ribbon
 * 
 * Features:
 * - Deterministic variation selection using lyric/song context
 * - Clean lightweight Canvas 2D vector path rendering
 * - Micro-animation and drift support with reduced-motion awareness
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CinematicMotif = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VARIATION_COUNTS = {
    love: 4,
    night: 4,
    lonely: 3,
    memory: 3,
    time: 3,
    fire: 3,
    rain: 3,
    road: 3,
    home: 3,
    dream: 3,
    editorial: 7
  };

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
   * Selects a deterministic variation index for a concept based on song and scene context.
   */
  function getVariationIndex(concept, trackKey = '', sceneIndex = 0) {
    const total = VARIATION_COUNTS[concept] || 3;
    const key = `${trackKey || ''}_${concept}_scene${sceneIndex}`;
    return hashString(key) % total;
  }

  // =========================================================================
  // CONCEPT MOTIF DRAWING ROUTINES
  // =========================================================================

  /**
   * 1. LOVE MOTIFS
   */
  function drawLove(ctx, options) {
    const { cx, cy, rx, ry, variation = 0, strokeColor, alpha = 0.22, strokeWidth = 1.5, drift = 0 } = options;
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = alpha;

    switch (variation) {
      case 1: {
        // Variation 1: Two intersecting intertwined cardioid rings
        const dX = rx * 0.35;
        const ringR = rx * 0.65;
        ctx.beginPath();
        ctx.arc(cx - dX, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + dX, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
        // Inner delicate intersection glow
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, dX * 0.8, ringR * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 2: {
        // Variation 2: Pulse / heartbeat cardiogram line with soft rhythmic peak
        const halfW = rx * 1.5;
        const yBase = cy;
        const pMod = drift ? Math.sin(drift * 1.4) * 4 : 0;
        ctx.beginPath();
        ctx.moveTo(cx - halfW, yBase);
        ctx.lineTo(cx - halfW * 0.45, yBase);
        ctx.lineTo(cx - halfW * 0.30, yBase - ry * 0.25);
        ctx.lineTo(cx - halfW * 0.15, yBase + ry * 0.20);
        ctx.lineTo(cx, yBase - ry * 0.95 + pMod); // Tall primary spike
        ctx.lineTo(cx + halfW * 0.15, yBase + ry * 0.55);
        ctx.lineTo(cx + halfW * 0.28, yBase - ry * 0.20);
        ctx.lineTo(cx + halfW * 0.42, yBase);
        ctx.lineTo(cx + halfW, yBase);
        ctx.stroke();
        // Tiny luminous pulse point
        ctx.globalAlpha = Math.min(1.0, alpha * 2.2);
        ctx.beginPath();
        ctx.arc(cx, yBase - ry * 0.95 + pMod, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 3: {
        // Variation 3: Expanding concentric delicate contour ripples
        const count = 3;
        for (let i = 0; i < count; i++) {
          const step = (i + 1) / count;
          const sRx = rx * step;
          const sRy = ry * step;
          ctx.globalAlpha = alpha * (1.1 - step * 0.4);
          drawHeartContour(ctx, cx, cy, sRx, sRy);
        }
        break;
      }
      case 0:
      default: {
        // Variation 0: Subtle hand-drawn / organic heart contour with gentle taper
        drawHeartContour(ctx, cx, cy, rx, ry);
        // Inner micro-core
        ctx.globalAlpha = alpha * 0.4;
        drawHeartContour(ctx, cx, cy, rx * 0.45, ry * 0.45);
        break;
      }
    }
    ctx.restore();
  }

  function drawHeartContour(ctx, cx, cy, rx, ry) {
    ctx.beginPath();
    const topY = cy - ry * 0.4;
    const botY = cy + ry * 0.8;
    ctx.moveTo(cx, topY + ry * 0.25);
    // Left lobe
    ctx.bezierCurveTo(cx - rx * 0.65, topY - ry * 0.7, cx - rx * 1.15, topY + ry * 0.35, cx, botY);
    // Right lobe
    ctx.bezierCurveTo(cx + rx * 1.15, topY + ry * 0.35, cx + rx * 0.65, topY - ry * 0.7, cx, topY + ry * 0.25);
    ctx.stroke();
  }

  /**
   * 2. NIGHT MOTIFS
   */
  function drawNight(ctx, options) {
    const { cx, cy, rx, ry, variation = 0, strokeColor, alpha = 0.25, strokeWidth = 1.4, drift = 0 } = options;
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = alpha;

    switch (variation) {
      case 1: {
        // Variation 1: Distant constellation field of stars with fine connective filaments
        const stars = [
          { x: cx - rx * 0.8, y: cy - ry * 0.5, r: 2.2 },
          { x: cx - rx * 0.3, y: cy - ry * 0.75, r: 1.8 },
          { x: cx + rx * 0.2, y: cy - ry * 0.3, r: 2.5 },
          { x: cx + rx * 0.75, y: cy - ry * 0.55, r: 1.6 },
          { x: cx + rx * 0.4, y: cy + ry * 0.4, r: 2.0 },
          { x: cx - rx * 0.4, y: cy + ry * 0.35, r: 1.5 }
        ];
        // Connective faint filaments
        ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath();
        for (let i = 0; i < stars.length; i++) {
          const next = stars[(i + 1) % stars.length];
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(next.x, next.y);
        }
        ctx.stroke();
        // Astral star nodes
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          ctx.globalAlpha = alpha * 1.6;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 2: {
        // Variation 2: Minimalist twilight horizon with faint astral dots
        const lineY = cy + ry * 0.2;
        const w = rx * 1.8;
        ctx.beginPath();
        ctx.moveTo(cx - w, lineY);
        ctx.lineTo(cx + w, lineY);
        ctx.stroke();
        // Tiny stars above horizon
        for (let i = -3; i <= 3; i++) {
          if (i === 0) continue;
          const sx = cx + (i * w * 0.25);
          const sy = lineY - ry * (0.35 + Math.abs(i) * 0.15);
          ctx.globalAlpha = alpha * 1.4;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 3: {
        // Variation 3: Celestial orbital arc with planetary marker
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 1.2, ry * 0.6, -Math.PI / 8, 0, Math.PI * 2);
        ctx.stroke();
        // Satellite marker along orbit
        const orbAngle = drift * 0.8 - Math.PI / 4;
        const px = cx + Math.cos(orbAngle) * (rx * 1.2);
        const py = cy + Math.sin(orbAngle) * (ry * 0.6);
        ctx.globalAlpha = alpha * 1.8;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 0:
      default: {
        // Variation 0: Crescent moon with micro-stellar glow
        const r = rx * 0.85;
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI * 0.42, Math.PI * 0.65, false);
        ctx.bezierCurveTo(cx - r * 0.2, cy + r * 0.3, cx - r * 0.15, cy - r * 0.4, cx + r * Math.cos(-Math.PI * 0.42), cy + r * Math.sin(-Math.PI * 0.42));
        ctx.stroke();
        // Accompanying tiny accent star in cusp
        const starX = cx + r * 0.55;
        const starY = cy - r * 0.15;
        ctx.globalAlpha = alpha * 1.8;
        ctx.beginPath();
        ctx.arc(starX, starY, 2.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }

  /**
   * 3. LONELY MOTIFS
   */
  function drawLonely(ctx, options) {
    const { cx, cy, rx, ry, variation = 0, strokeColor, alpha = 0.20, strokeWidth = 1.3 } = options;
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = alpha;

    switch (variation) {
      case 1: {
        // Variation 1: Huge negative space with a distant faint beacon / pin of light
        const beaconX = cx + rx * 0.55;
        const beaconY = cy - ry * 0.45;
        // Radial cross flare
        ctx.beginPath();
        ctx.moveTo(beaconX - 16, beaconY);
        ctx.lineTo(beaconX + 16, beaconY);
        ctx.moveTo(beaconX, beaconY - 16);
        ctx.lineTo(beaconX, beaconY + 16);
        ctx.stroke();
        // Faint concentric horizon aura
        ctx.globalAlpha = alpha * 0.35;
        ctx.beginPath();
        ctx.arc(beaconX, beaconY, rx * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        // Core pin
        ctx.globalAlpha = Math.min(1.0, alpha * 2.5);
        ctx.beginPath();
        ctx.arc(beaconX, beaconY, 2.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 2: {
        // Variation 2: Single vertical thread with fading tail
        const xPos = cx - rx * 0.6;
        ctx.beginPath();
        ctx.moveTo(xPos, cy - ry);
        ctx.lineTo(xPos, cy + ry);
        ctx.stroke();
        // Small point anchored on thread
        ctx.globalAlpha = alpha * 1.8;
        ctx.beginPath();
        ctx.arc(xPos, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 0:
      default: {
        // Variation 0: Isolated minimalist silhouette / slender vertical form
        const baseY = cy + ry * 0.6;
        const headY = cy - ry * 0.4;
        // Solitary figure spine
        ctx.beginPath();
        ctx.moveTo(cx, headY + 14);
        ctx.lineTo(cx, baseY);
        ctx.stroke();
        // Solitary head
        ctx.beginPath();
        ctx.arc(cx, headY, 6, 0, Math.PI * 2);
        ctx.stroke();
        // Vast baseline
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 1.4, baseY);
        ctx.lineTo(cx + rx * 1.4, baseY);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  /**
   * 4. MEMORY MOTIFS
   */
  function drawMemory(ctx, options) {
    const { cx, cy, rx, ry, variation = 0, strokeColor, alpha = 0.22, strokeWidth = 1.3 } = options;
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = alpha;

    switch (variation) {
      case 1: {
        // Variation 1: Fading double-exposure / offset silhouette echo
        const offset = rx * 0.16;
        for (let i = 0; i < 2; i++) {
          const shift = (i === 0) ? -offset : offset;
          ctx.globalAlpha = (i === 0) ? alpha : alpha * 0.45;
          ctx.beginPath();
          ctx.rect(cx + shift - rx * 0.7, cy + shift - ry * 0.6, rx * 1.4, ry * 1.2);
          ctx.stroke();
        }
        break;
      }
      case 2: {
        // Variation 2: Vintage film register ticks and chronological measurement marks
        const w = rx * 1.5;
        const h = ry * 1.1;
        ctx.beginPath();
        ctx.rect(cx - w / 2, cy - h / 2, w, h);
        ctx.stroke();
        // Register ticks along top and bottom
        const ticks = 6;
        for (let i = 0; i <= ticks; i++) {
          const tx = cx - w / 2 + (i / ticks) * w;
          ctx.beginPath();
          ctx.moveTo(tx, cy - h / 2);
          ctx.lineTo(tx, cy - h / 2 + 8);
          ctx.moveTo(tx, cy + h / 2);
          ctx.lineTo(tx, cy + h / 2 - 8);
          ctx.stroke();
        }
        break;
      }
      case 0:
      default: {
        // Variation 0: Minimalist photograph frame with corner crop marks
        const fw = rx * 1.4;
        const fh = ry * 1.3;
        ctx.beginPath();
        ctx.rect(cx - fw / 2, cy - fh / 2, fw, fh);
        ctx.stroke();
        // Inner photo aperture (Polaroid style wider bottom border)
        const inW = fw * 0.84;
        const inH = fh * 0.68;
        const inY = cy - fh / 2 + fh * 0.12;
        ctx.globalAlpha = alpha * 0.55;
        ctx.beginPath();
        ctx.rect(cx - inW / 2, inY, inW, inH);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  /**
   * 5. TIME MOTIFS
   */
  function drawTime(ctx, options) {
    const { cx, cy, rx, ry, variation = 0, strokeColor, alpha = 0.24, strokeWidth = 1.4, drift = 0 } = options;
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = alpha;

    switch (variation) {
      case 1: {
        // Variation 1: Circular progression / segmented orbital arc
        const r = rx * 0.85;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 1.6);
        ctx.stroke();
        // Progression node moving slowly
        const angle = (drift * 0.6) % (Math.PI * 2);
        const nx = cx + Math.cos(angle) * r;
        const ny = cy + Math.sin(angle) * r;
        ctx.globalAlpha = alpha * 1.9;
        ctx.beginPath();
        ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 2: {
        // Variation 2: Rotating sundial axes with concentric rings
        const r = rx * 0.88;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        // Cardinal axes with fine rotation
        const rot = drift * 0.05;
        for (let a = 0; a < 4; a++) {
          const ang = rot + a * (Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
          ctx.stroke();
        }
        break;
      }
      case 0:
      default: {
        // Variation 0: Minimalist clock geometry with 12 radial ticks and fine hands (10:10)
        const r = rx * 0.85;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        // 12 ticks
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const tickLen = (i % 3 === 0) ? 9 : 4;
          const x1 = cx + Math.cos(ang) * (r - tickLen);
          const y1 = cy + Math.sin(ang) * (r - tickLen);
          const x2 = cx + Math.cos(ang) * r;
          const y2 = cy + Math.sin(ang) * r;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        // Aesthetic hands (10:10)
        const hAng = -Math.PI / 3; // 10 o'clock
        const mAng = -Math.PI / 6; // 2 o'clock (10 mins)
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(hAng) * (r * 0.52), cy + Math.sin(hAng) * (r * 0.52));
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(mAng) * (r * 0.74), cy + Math.sin(mAng) * (r * 0.74));
        ctx.stroke();
        // Center hub
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }

  /**
   * 6. FIRE MOTIFS
   */
  function drawFire(ctx, options) {
    const { cx, cy, rx, ry, variation = 0, strokeColor, alpha = 0.22, strokeWidth = 1.4, drift = 0 } = options;
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = alpha;

    switch (variation) {
      case 1: {
        // Variation 1: Ascending ember particles / delicate rising micro-sparks
        const emberCount = 10;
        for (let i = 0; i < emberCount; i++) {
          const seed = i * 137.5;
          const t = (drift * 0.8 + i * 0.3) % 1.0;
          const ex = cx + (Math.sin(seed + drift) * rx * 0.8);
          const ey = (cy + ry * 0.8) - t * (ry * 1.6);
          const pAlpha = alpha * (1.0 - t) * 1.8;
          ctx.globalAlpha = pAlpha;
          ctx.beginPath();
          ctx.arc(ex, ey, 1.8 + (1.0 - t), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 2: {
        // Variation 2: Heat distortion / radiating thermal wave ripples
        const count = 3;
        for (let i = 0; i < count; i++) {
          const step = (i + 1) / count;
          const wy = cy + ry * 0.6 - step * ry * 1.2;
          ctx.globalAlpha = alpha * (1.1 - step * 0.5);
          ctx.beginPath();
          ctx.moveTo(cx - rx * 1.2, wy);
          ctx.bezierCurveTo(cx - rx * 0.5, wy - 12, cx, wy + 12, cx + rx * 1.2, wy);
          ctx.stroke();
        }
        break;
      }
      case 0:
      default: {
        // Variation 0: Organic rising flame contour with fluid S-curve tongues
        const baseY = cy + ry * 0.7;
        const apexY = cy - ry * 0.9;
        ctx.beginPath();
        ctx.moveTo(cx, apexY);
        // Right flank curve
        ctx.bezierCurveTo(cx + rx * 0.9, cy - ry * 0.2, cx + rx * 0.8, baseY, cx, baseY);
        // Left flank curve
        ctx.bezierCurveTo(cx - rx * 0.8, baseY, cx - rx * 0.9, cy - ry * 0.2, cx, apexY);
        ctx.stroke();
        // Inner core flame tongue
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - ry * 0.3);
        ctx.bezierCurveTo(cx + rx * 0.35, cy + ry * 0.2, cx + rx * 0.3, baseY - 6, cx, baseY - 6);
        ctx.bezierCurveTo(cx - rx * 0.3, baseY - 6, cx - rx * 0.35, cy + ry * 0.2, cx, cy - ry * 0.3);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  /**
   * 7. RAIN MOTIFS
   */
  function drawRain(ctx, options) {
    const { cx, cy, rx, ry, variation = 0, strokeColor, alpha = 0.22, strokeWidth = 1.2, drift = 0 } = options;
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = alpha;

    switch (variation) {
      case 1: {
        // Variation 1: Concentric water ripple rings expanding across the bottom plane
        const count = 3;
        const baseY = cy + ry * 0.4;
        for (let i = 0; i < count; i++) {
          const step = (i + 1) / count;
          const ripRx = rx * 1.2 * step;
          const ripRy = ry * 0.35 * step;
          ctx.globalAlpha = alpha * (1.1 - step * 0.45);
          ctx.beginPath();
          ctx.ellipse(cx, baseY, ripRx, ripRy, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case 2: {
        // Variation 2: Falling droplet contours with reflective specular point
        const dropY = cy - ry * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx, dropY - ry * 0.5);
        ctx.bezierCurveTo(cx + rx * 0.5, dropY, cx + rx * 0.4, dropY + ry * 0.5, cx, dropY + ry * 0.5);
        ctx.bezierCurveTo(cx - rx * 0.4, dropY + ry * 0.5, cx - rx * 0.5, dropY, cx, dropY - ry * 0.5);
        ctx.stroke();
        break;
      }
      case 0:
      default: {
        // Variation 0: Slanted delicate linear rain streaks (parallel fine lines at ~70° angle)
        const streaks = 10;
        const angle = Math.PI * 0.38; // ~70 deg
        const dx = Math.cos(angle) * 36;
        const dy = Math.sin(angle) * 36;
        for (let i = 0; i < streaks; i++) {
          const sx = cx - rx * 1.1 + (i / streaks) * (rx * 2.2);
          const sy = cy - ry * 0.8 + ((i % 3) * ry * 0.4);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + dx, sy + dy);
          ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }

  /**
   * 8. ROAD MOTIFS
   */
  function drawRoad(ctx, options) {
    const { cx, cy, rx, ry, variation = 0, strokeColor, alpha = 0.22, strokeWidth = 1.3 } = options;
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = alpha;

    switch (variation) {
      case 1: {
        // Variation 1: Continuous winding ribbon path receding into distance
        const baseY = cy + ry * 0.8;
        const topY = cy - ry * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.8, baseY);
        ctx.bezierCurveTo(cx + rx * 0.6, cy + ry * 0.2, cx - rx * 0.4, cy - ry * 0.1, cx, topY);
        ctx.stroke();
        break;
      }
      case 2: {
        // Variation 2: Highway lane perspective with horizon bar
        const horizonY = cy - ry * 0.3;
        const baseY = cy + ry * 0.8;
        // Horizon line
        ctx.beginPath();
        ctx.moveTo(cx - rx * 1.3, horizonY);
        ctx.lineTo(cx + rx * 1.3, horizonY);
        ctx.stroke();
        // Road edges
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.1, horizonY);
        ctx.lineTo(cx - rx * 1.1, baseY);
        ctx.moveTo(cx + rx * 0.1, horizonY);
        ctx.lineTo(cx + rx * 1.1, baseY);
        ctx.stroke();
        break;
      }
      case 0:
      default: {
        // Variation 0: Converging perspective lines meeting at a distant vanishing horizon
        const horizonY = cy - ry * 0.35;
        const baseY = cy + ry * 0.8;
        ctx.beginPath();
        // Left road curb
        ctx.moveTo(cx - rx * 0.05, horizonY);
        ctx.lineTo(cx - rx * 1.0, baseY);
        // Right road curb
        ctx.moveTo(cx + rx * 0.05, horizonY);
        ctx.lineTo(cx + rx * 1.0, baseY);
        // Center dashed dividing line
        ctx.moveTo(cx, horizonY);
        ctx.lineTo(cx, baseY);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  /**
   * 9. HOME MOTIFS
   */
  function drawHome(ctx, options) {
    const { cx, cy, rx, ry, variation = 0, strokeColor, alpha = 0.22, strokeWidth = 1.3 } = options;
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = alpha;

    switch (variation) {
      case 1: {
        // Variation 1: Minimalist architectural gable roofline
        const apexY = cy - ry * 0.7;
        const eaveY = cy + ry * 0.1;
        const groundY = cy + ry * 0.7;
        const w = rx * 1.1;
        ctx.beginPath();
        // Roof pitch
        ctx.moveTo(cx - w, eaveY);
        ctx.lineTo(cx, apexY);
        ctx.lineTo(cx + w, eaveY);
        // Walls
        ctx.lineTo(cx + w * 0.8, groundY);
        ctx.lineTo(cx - w * 0.8, groundY);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 2: {
        // Variation 2: Doorway perspective with cast wedge of light
        const topY = cy - ry * 0.6;
        const botY = cy + ry * 0.6;
        const dw = rx * 0.6;
        ctx.beginPath();
        ctx.rect(cx - dw / 2, topY, dw, botY - topY);
        ctx.stroke();
        // Light wedge casting onto ground
        ctx.globalAlpha = alpha * 0.35;
        ctx.beginPath();
        ctx.moveTo(cx - dw / 2, botY);
        ctx.lineTo(cx - rx * 1.1, botY + ry * 0.3);
        ctx.lineTo(cx + rx * 1.1, botY + ry * 0.3);
        ctx.lineTo(cx + dw / 2, botY);
        ctx.stroke();
        break;
      }
      case 0:
      default: {
        // Variation 0: Illuminated architectural window frame with soft cross mullions
        const ww = rx * 1.2;
        const wh = ry * 1.3;
        ctx.beginPath();
        ctx.rect(cx - ww / 2, cy - wh / 2, ww, wh);
        ctx.stroke();
        // Cross mullions
        ctx.beginPath();
        ctx.moveTo(cx, cy - wh / 2);
        ctx.lineTo(cx, cy + wh / 2);
        ctx.moveTo(cx - ww / 2, cy);
        ctx.lineTo(cx + ww / 2, cy);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  /**
   * 10. DREAM MOTIFS
   */
  function drawDream(ctx, options) {
    const { cx, cy, rx, ry, variation = 0, strokeColor, alpha = 0.22, strokeWidth = 1.3, drift = 0 } = options;
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = alpha;

    switch (variation) {
      case 1: {
        // Variation 1: Ethereal drifting cloud curves with flowing vector bezier silhouettes
        const baseY = cy + ry * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 1.2, baseY);
        ctx.bezierCurveTo(cx - rx * 1.1, cy - ry * 0.4, cx - rx * 0.6, cy - ry * 0.7, cx - rx * 0.2, cy - ry * 0.3);
        ctx.bezierCurveTo(cx, cy - ry * 0.8, cx + rx * 0.7, cy - ry * 0.7, cx + rx * 0.9, cy - ry * 0.2);
        ctx.bezierCurveTo(cx + rx * 1.2, cy - ry * 0.1, cx + rx * 1.2, baseY, cx - rx * 1.2, baseY);
        ctx.stroke();
        break;
      }
      case 2: {
        // Variation 2: Impossible / surreal folded ribbon geometry
        const w = rx * 0.9;
        const h = ry * 0.9;
        ctx.beginPath();
        ctx.moveTo(cx - w, cy - h);
        ctx.lineTo(cx + w, cy - h);
        ctx.lineTo(cx - w, cy + h);
        ctx.lineTo(cx + w, cy + h);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 0:
      default: {
        // Variation 0: Floating surreal geometric spheres / bubbles with orbital rings
        ctx.beginPath();
        ctx.arc(cx, cy, rx * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        // Saturn-like orbital ellipse
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 1.15, ry * 0.35, -Math.PI / 6, 0, Math.PI * 2);
        ctx.stroke();
        // Smaller satellite sphere
        ctx.beginPath();
        ctx.arc(cx + rx * 0.8, cy - ry * 0.5, rx * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  /**
   * Dispatches drawing of a motif by concept and variation.
   */
  function drawMotif(ctx, options) {
    const concept = options.concept;
    if (!concept || options.alpha <= 0.005) return;

    switch (concept) {
      case 'love': drawLove(ctx, options); break;
      case 'night': drawNight(ctx, options); break;
      case 'lonely': drawLonely(ctx, options); break;
      case 'memory': drawMemory(ctx, options); break;
      case 'time': drawTime(ctx, options); break;
      case 'fire': drawFire(ctx, options); break;
      case 'rain': drawRain(ctx, options); break;
      case 'road': drawRoad(ctx, options); break;
      case 'home': drawHome(ctx, options); break;
      case 'dream': drawDream(ctx, options); break;
      default: break;
    }
  }

  return {
    VARIATION_COUNTS,
    hashString,
    getVariationIndex,
    drawMotif,
    drawLove,
    drawNight,
    drawLonely,
    drawMemory,
    drawTime,
    drawFire,
    drawRain,
    drawRoad,
    drawHome,
    drawDream
  };
});
