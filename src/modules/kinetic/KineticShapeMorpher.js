/**
 * LyricFlow - Kinetic Typography Shape Morpher Engine
 * Parametric vector geometry library and smooth morphing engine.
 * Supports:
 * - 7 Parametric editorial shapes: Astroid Star, Diamond, Quatrefoil/Clover,
 *   Scalloped Rosette, Heart, Hexagon, Circle/Bubble.
 * - Uniform perimeter parameterization for seamless ease-in-out morphing
 *   into a rounded card container.
 * - Selection modes: Track-Seeded (deterministic signature per song),
 *   Random (fresh per render/export), and User's Choice (manual selection).
 * - Pinned accent seal/star rendering on card edge.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KineticShapeMorpher = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SHAPES = {
    astroid: {
      id: 'astroid',
      name: 'Astroid Star',
      icon: '★',
      description: '4-pointed concave hypocycloid star (reference design)'
    },
    diamond: {
      id: 'diamond',
      name: 'Diamond',
      icon: '◆',
      description: 'Geometric rhombus with softened apexes'
    },
    clover: {
      id: 'clover',
      name: 'Quatrefoil Clover',
      icon: '✤',
      description: '4-lobed romantic floral silhouette'
    },
    rosette: {
      id: 'rosette',
      name: 'Scalloped Rosette',
      icon: '✿',
      description: '8-cusp vintage editorial seal'
    },
    heart: {
      id: 'heart',
      name: 'Heart',
      icon: '♥',
      description: 'Curved romantic cardioid'
    },
    hexagon: {
      id: 'hexagon',
      name: 'Hexagon',
      icon: '⬡',
      description: 'Modern geometric polygon with rounded corners'
    },
    circle: {
      id: 'circle',
      name: 'Circle Bubble',
      icon: '●',
      description: 'Smooth organic circular squircle'
    }
  };

  const SHAPE_KEYS = Object.keys(SHAPES);

  /**
   * Deterministic 32-bit FNV-1a string hash for track-seeded auto selection.
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
   * Selects shape based on track metadata (artist + title).
   */
  function getShapeForTrack(artist, title) {
    const key = `${(artist || '').trim().toLowerCase()}-${(title || '').trim().toLowerCase()}`;
    if (!key || key === '-') return 'astroid';
    const index = hashString(key) % SHAPE_KEYS.length;
    return SHAPE_KEYS[index];
  }

  /**
   * Cubic ease-in-out curve for natural physical acceleration & deceleration.
   */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Evaluates normalized shape boundary point at parameter s in [0, 1] (clockwise from top).
   * Returns {x, y} in pixel space centered at (cx, cy) with radius (rx, ry).
   */
  function getShapePoint(shapeType, s, cx, cy, rx, ry) {
    const angle = s * 2 * Math.PI - Math.PI / 2; // Start from top (-90 deg)
    let nx = 0;
    let ny = 0;

    switch (shapeType) {
      case 'diamond': {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const p = 1.7; // superellipse exponent
        nx = Math.sign(cos) * Math.pow(Math.abs(cos), p);
        ny = Math.sign(sin) * Math.pow(Math.abs(sin), p);
        break;
      }
      case 'clover': {
        // 4-lobed curve
        const r = 0.72 + 0.28 * Math.cos(4 * angle);
        nx = r * Math.cos(angle);
        ny = r * Math.sin(angle);
        break;
      }
      case 'rosette': {
        // 8-cusp scalloped rosette
        const r = 0.80 + 0.20 * Math.cos(8 * angle);
        nx = r * Math.cos(angle);
        ny = r * Math.sin(angle);
        break;
      }
      case 'heart': {
        // Parametric cardioid heart; reparameterize parameter t in [0, 2pi]
        const t = s * 2 * Math.PI;
        // x = 16 sin^3(t)
        // y = - (13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t))
        const sinT = Math.sin(t);
        const rawX = 16 * Math.pow(sinT, 3);
        const rawY = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        nx = rawX / 16.5;
        ny = (rawY + 2.5) / 16.5; // Offset center so heart visual weight is balanced
        break;
      }
      case 'hexagon': {
        // 6-sided polygon with soft corners
        const pMod = ((angle + Math.PI / 6) % (Math.PI / 3) + (Math.PI / 3)) % (Math.PI / 3);
        const r = (Math.cos(Math.PI / 6) / Math.cos(pMod - Math.PI / 6)) * 0.92;
        nx = r * Math.cos(angle);
        ny = r * Math.sin(angle);
        break;
      }
      case 'circle': {
        nx = Math.cos(angle);
        ny = Math.sin(angle);
        break;
      }
      case 'astroid':
      default: {
        // 4-pointed concave astroid star: x = a cos^3(theta), y = a sin^3(theta)
        // Rotate 45 deg so 4 cusps point up, down, left, right
        const thetaRot = angle + Math.PI / 4;
        const cos = Math.cos(thetaRot);
        const sin = Math.sin(thetaRot);
        const rawX = Math.pow(cos, 3);
        const rawY = Math.pow(sin, 3);
        // Rotate back by -45 deg
        const cos45 = Math.SQRT1_2;
        nx = (rawX - rawY) * cos45 * 1.35;
        ny = (rawX + rawY) * cos45 * 1.35;
        break;
      }
    }

    return {
      x: cx + nx * rx,
      y: cy + ny * ry
    };
  }

  /**
   * Evaluates perimeter point of a rounded rectangle at parameter s in [0, 1] (clockwise from top center).
   */
  function getCardPerimeterPoint(s, cx, cy, width, height, radius) {
    const w = width;
    const h = height;
    const r = Math.min(radius, w / 2, h / 2);

    // Perimeter lengths
    const topStraight = w - 2 * r;
    const cornerArc = 0.5 * Math.PI * r;
    const sideStraight = h - 2 * r;
    const totalP = 2 * topStraight + 2 * sideStraight + 4 * cornerArc;

    let dist = ((s % 1 + 1) % 1) * totalP;

    // Segment 1: Top right half
    const seg1 = topStraight / 2;
    if (dist <= seg1) {
      return { x: cx + dist, y: cy - h / 2 };
    }
    dist -= seg1;

    // Segment 2: Top-right corner arc
    if (dist <= cornerArc) {
      const a = (dist / cornerArc) * (Math.PI / 2);
      return {
        x: cx + w / 2 - r + r * Math.sin(a),
        y: cy - h / 2 + r - r * Math.cos(a)
      };
    }
    dist -= cornerArc;

    // Segment 3: Right side straight
    if (dist <= sideStraight) {
      return { x: cx + w / 2, y: cy - h / 2 + r + dist };
    }
    dist -= sideStraight;

    // Segment 4: Bottom-right corner arc
    if (dist <= cornerArc) {
      const a = (dist / cornerArc) * (Math.PI / 2);
      return {
        x: cx + w / 2 - r + r * Math.cos(a),
        y: cy + h / 2 - r + r * Math.sin(a)
      };
    }
    dist -= cornerArc;

    // Segment 5: Bottom straight
    if (dist <= topStraight) {
      return { x: cx + w / 2 - r - dist, y: cy + h / 2 };
    }
    dist -= topStraight;

    // Segment 6: Bottom-left corner arc
    if (dist <= cornerArc) {
      const a = (dist / cornerArc) * (Math.PI / 2);
      return {
        x: cx - w / 2 + r - r * Math.sin(a),
        y: cy + h / 2 - r + r * Math.cos(a)
      };
    }
    dist -= cornerArc;

    // Segment 7: Left side straight
    if (dist <= sideStraight) {
      return { x: cx - w / 2, y: cy + h / 2 - r - dist };
    }
    dist -= sideStraight;

    // Segment 8: Top-left corner arc
    if (dist <= cornerArc) {
      const a = (dist / cornerArc) * (Math.PI / 2);
      return {
        x: cx - w / 2 + r - r * Math.cos(a),
        y: cy - h / 2 + r - r * Math.sin(a)
      };
    }
    dist -= cornerArc;

    // Segment 9: Top left half
    return { x: cx - w / 2 + r + dist, y: cy - h / 2 };
  }

  /**
   * Generates N interpolated perimeter points for morph progress t in [0, 1].
   */
  function getMorphedPoints(shapeType, t, bounds, options = {}) {
    const numPoints = options.numPoints || 96;
    const progress = Math.max(0, Math.min(1, t));
    const ease = easeInOutCubic(progress);

    const { x, y, width, height, cornerRadius = 32 } = bounds;
    const cx = x + width / 2;
    const cy = y + height / 2;

    // Shape radius at t = 0 (proportional to card size, visually balanced in horizontal stage)
    const initialScale = options.initialScale || 0.68;
    const baseDim = Math.min(width, height);
    const sRx = (baseDim / 2) * initialScale;
    const sRy = (baseDim / 2) * initialScale; // Keep shape visually square/proportional

    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const s = i / numPoints;
      const ptShape = getShapePoint(shapeType, s, cx, cy, sRx, sRy);
      const ptCard = getCardPerimeterPoint(s, cx, cy, width, height, cornerRadius);

      points.push({
        x: (1 - ease) * ptShape.x + ease * ptCard.x,
        y: (1 - ease) * ptShape.y + ease * ptCard.y
      });
    }

    return points;
  }

  /**
   * Draws the morphed card path directly onto a Canvas 2D context.
   */
  function drawMorphedCard(ctx, options) {
    const {
      shapeType = 'astroid',
      progress = 1.0,
      bounds,
      fillColor = '#341820',
      strokeColor = null,
      strokeWidth = 1,
      shadowColor = 'rgba(0,0,0,0.55)',
      shadowBlur = 32,
      shadowOffsetY = 16,
      showAccentStar = true,
      starColor = '#d2b7c0'
    } = options;

    if (!bounds || !bounds.width || !bounds.height) return;

    ctx.save();

    // Apply drop shadow
    if (shadowColor && shadowBlur > 0) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetY = shadowOffsetY;
      ctx.shadowOffsetX = 0;
    }

    ctx.fillStyle = fillColor;

    if (progress >= 0.999 && typeof ctx.roundRect === 'function') {
      // Hardware-accelerated fast path for full card
      ctx.beginPath();
      ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, bounds.cornerRadius || 32);
      ctx.fill();
      if (strokeColor && strokeWidth > 0) {
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      }

      // Draw subtle editorial watermark contour of the parametric shape inside the card
      try {
        const watermarkPoints = getMorphedPoints(shapeType, 0.0, {
          x: bounds.x + bounds.width * 0.16,
          y: bounds.y + bounds.height * 0.16,
          width: bounds.width * 0.68,
          height: bounds.height * 0.68
        });
        if (watermarkPoints && watermarkPoints.length > 2) {
          ctx.save();
          ctx.shadowColor = 'transparent';
          ctx.beginPath();
          ctx.moveTo(watermarkPoints[0].x, watermarkPoints[0].y);
          for (let i = 1; i < watermarkPoints.length; i++) {
            ctx.lineTo(watermarkPoints[i].x, watermarkPoints[i].y);
          }
          ctx.closePath();
          ctx.fillStyle = starColor;
          ctx.globalAlpha = 0.045;
          ctx.fill();
          ctx.strokeStyle = starColor;
          ctx.globalAlpha = 0.12;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      } catch (_) {}
    } else {
      // Parametric morph path
      const points = getMorphedPoints(shapeType, progress, bounds);
      if (points.length > 2) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.fill();

        if (strokeColor && strokeWidth > 0) {
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.stroke();
        }
      }
    }

    ctx.restore();

    // Draw pinned bottom accent seal using active shape icon
    if (showAccentStar) {
      ctx.save();
      const cx = bounds.x + bounds.width / 2;
      const bottomY = bounds.y + bounds.height - 24;
      const shapeMeta = SHAPES[shapeType] || SHAPES.astroid;
      const sealIcon = (shapeMeta && shapeMeta.icon) ? shapeMeta.icon : '★';
      ctx.fillStyle = starColor;
      ctx.font = '700 16px "Bodoni Moda", serif, "Segoe UI Emoji"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sealIcon, cx, bottomY);
      ctx.restore();
    }
  }

  return {
    SHAPES,
    SHAPE_KEYS,
    hashString,
    getShapeForTrack,
    easeInOutCubic,
    getShapePoint,
    getCardPerimeterPoint,
    getMorphedPoints,
    drawMorphedCard
  };
});
