/**
 * LyricFlow - Utilities Module
 */

// Asynchronously activate Google Fonts stylesheet without inline event handlers (strict CSP compliant)
(function activateAsyncFonts() {
  function enableFontStyles() {
    const fontLink = document.getElementById('async-google-fonts');
    if (fontLink && fontLink.media !== 'all') {
      fontLink.media = 'all';
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enableFontStyles, { once: true });
  } else {
    enableFontStyles();
  }
})();

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let toastTimeout = null;
function showToast(message, duration = 3000, type = 'default') {
  const toastNotification = document.getElementById("toast-notification");
  if (!toastNotification) return;

  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1db954" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === 'reload') {
    iconSvg = `<svg class="reload-icon rotating" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1DB954" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }

  toastNotification.innerHTML = `${iconSvg}<span>${escapeHTML(message)}</span>`;
  toastNotification.classList.add("show");

  toastTimeout = setTimeout(() => {
    toastNotification.classList.remove("show");
    toastTimeout = null;
  }, duration);
}

function formatTime(ms) {
  if (!ms || isNaN(ms) || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

// --- High-Performance Authentic Artwork Color & Palette Extraction Engine ---
// Solves saturation hijacking by single-pixel artifacts (e.g. logos, barcode specks)
// using quantized 16-hue population-weighted clustering and Apple Music harmonic palette generation.

const DEFAULT_DOMINANT_COLOR = { r: 29, g: 185, b: 84 };
const DEFAULT_FLUID_PALETTE = [
  { r: 8, g: 10, b: 18 },     // c0: Base dark
  { r: 29, g: 185, b: 84 },   // c1: Primary emerald
  { r: 14, g: 165, b: 233 },  // c2: Cyan highlight
  { r: 139, g: 92, b: 246 },  // c3: Violet wave
  { r: 244, g: 63, b: 94 }    // c4: Rose accent
];

const _colorDataCache = new Map();
const _colorDataPromises = new Map();

function hslToRgb(h, s, l) {
  let r, g, b;
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, (h / 360) + 1/3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, (h / 360) - 1/3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

function rgbToHsl(r, g, b) {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  const d = max - min;
  const lum = (max + min) / 2;
  const sat = (max === 0 || min === 1) ? 0 : d / (1 - Math.abs(2 * lum - 1));
  let hue = 0;
  if (d > 0) {
    if (max === rf) hue = ((gf - bf) / d + (gf < bf ? 6 : 0)) * 60;
    else if (max === gf) hue = ((bf - rf) / d + 2) * 60;
    else hue = ((rf - gf) / d + 4) * 60;
  }
  return { h: hue, s: sat, l: lum };
}

// --- High-Performance Authentic Artwork Color & Palette Extraction Engine ---
// Fast Modified Median Cut Quantization (MMCQ) in 3D RGB color space.
// Extracts genuine cluster centroids from artwork pixels with zero synthetic hue offsets,
// authentic monochrome preservation, and true ambient depth.

class VBox {
  constructor(r1, r2, g1, g2, b1, b2, histo) {
    this.r1 = r1; this.r2 = r2;
    this.g1 = g1; this.g2 = g2;
    this.b1 = b1; this.b2 = b2;
    this.histo = histo;
    this._count = null;
    this._avg = null;
  }

  volume() {
    return (this.r2 - this.r1 + 1) * (this.g2 - this.g1 + 1) * (this.b2 - this.b1 + 1);
  }

  count() {
    if (this._count !== null) return this._count;
    let n = 0;
    const { r1, r2, g1, g2, b1, b2, histo } = this;
    for (let r = r1; r <= r2; r++) {
      for (let g = g1; g <= g2; g++) {
        for (let b = b1; b <= b2; b++) {
          const idx = (r << 10) | (g << 5) | b;
          n += histo[idx];
        }
      }
    }
    this._count = n;
    return n;
  }

  avg() {
    if (this._avg !== null) return this._avg;
    let n = 0;
    let rSum = 0, gSum = 0, bSum = 0;
    const { r1, r2, g1, g2, b1, b2, histo } = this;
    for (let r = r1; r <= r2; r++) {
      const r_shifted = r << 10;
      const r_mult = r * 8 + 4;
      for (let g = g1; g <= g2; g++) {
        const r_g = r_shifted | (g << 5);
        const g_mult = g * 8 + 4;
        for (let b = b1; b <= b2; b++) {
          const cnt = histo[r_g | b];
          if (cnt > 0) {
            n += cnt;
            rSum += cnt * r_mult;
            gSum += cnt * g_mult;
            bSum += cnt * (b * 8 + 4);
          }
        }
      }
    }
    if (n > 0) {
      this._avg = {
        r: Math.round(rSum / n),
        g: Math.round(gSum / n),
        b: Math.round(bSum / n),
        count: n
      };
    } else {
      this._avg = {
        r: Math.round(((r1 + r2) / 2) * 8 + 4),
        g: Math.round(((g1 + g2) / 2) * 8 + 4),
        b: Math.round(((b1 + b2) / 2) * 8 + 4),
        count: 0
      };
    }
    return this._avg;
  }
}

function shrinkBox(vbox, histo) {
  let rMin = vbox.r1;
  outerR1: for (let r = vbox.r1; r <= vbox.r2; r++) {
    const r_shift = r << 10;
    for (let g = vbox.g1; g <= vbox.g2; g++) {
      const r_g = r_shift | (g << 5);
      for (let b = vbox.b1; b <= vbox.b2; b++) {
        if (histo[r_g | b] > 0) {
          rMin = r;
          break outerR1;
        }
      }
    }
  }

  let rMax = vbox.r2;
  outerR2: for (let r = vbox.r2; r >= rMin; r--) {
    const r_shift = r << 10;
    for (let g = vbox.g1; g <= vbox.g2; g++) {
      const r_g = r_shift | (g << 5);
      for (let b = vbox.b1; b <= vbox.b2; b++) {
        if (histo[r_g | b] > 0) {
          rMax = r;
          break outerR2;
        }
      }
    }
  }

  let gMin = vbox.g1;
  outerG1: for (let g = vbox.g1; g <= vbox.g2; g++) {
    const g_shift = g << 5;
    for (let r = rMin; r <= rMax; r++) {
      const r_g = (r << 10) | g_shift;
      for (let b = vbox.b1; b <= vbox.b2; b++) {
        if (histo[r_g | b] > 0) {
          gMin = g;
          break outerG1;
        }
      }
    }
  }

  let gMax = vbox.g2;
  outerG2: for (let g = vbox.g2; g >= gMin; g--) {
    const g_shift = g << 5;
    for (let r = rMin; r <= rMax; r++) {
      const r_g = (r << 10) | g_shift;
      for (let b = vbox.b1; b <= vbox.b2; b++) {
        if (histo[r_g | b] > 0) {
          gMax = g;
          break outerG2;
        }
      }
    }
  }

  let bMin = vbox.b1;
  outerB1: for (let b = vbox.b1; b <= vbox.b2; b++) {
    for (let r = rMin; r <= rMax; r++) {
      const r_shift = r << 10;
      for (let g = gMin; g <= gMax; g++) {
        if (histo[r_shift | (g << 5) | b] > 0) {
          bMin = b;
          break outerB1;
        }
      }
    }
  }

  let bMax = vbox.b2;
  outerB2: for (let b = vbox.b2; b >= bMin; b--) {
    for (let r = rMin; r <= rMax; r++) {
      const r_shift = r << 10;
      for (let g = gMin; g <= gMax; g++) {
        if (histo[r_shift | (g << 5) | b] > 0) {
          bMax = b;
          break outerB2;
        }
      }
    }
  }

  return new VBox(rMin, rMax, gMin, gMax, bMin, bMax, histo);
}

function medianCutSplit(vbox, histo) {
  const rW = vbox.r2 - vbox.r1;
  const gW = vbox.g2 - vbox.g1;
  const bW = vbox.b2 - vbox.b1;
  const maxW = Math.max(rW, gW, bW);

  if (maxW === 0) return [vbox];

  let splitDim = 'r';
  if (gW >= rW && gW >= bW) splitDim = 'g';
  else if (bW >= rW && bW >= gW) splitDim = 'b';

  const total = vbox.count();
  if (total <= 1) return [vbox];

  const partialSums = [];
  let sum = 0;

  if (splitDim === 'r') {
    for (let r = vbox.r1; r <= vbox.r2; r++) {
      let sliceCount = 0;
      const r_shift = r << 10;
      for (let g = vbox.g1; g <= vbox.g2; g++) {
        const r_g = r_shift | (g << 5);
        for (let b = vbox.b1; b <= vbox.b2; b++) {
          sliceCount += histo[r_g | b];
        }
      }
      sum += sliceCount;
      partialSums[r] = sum;
    }
    const half = total / 2;
    for (let r = vbox.r1; r <= vbox.r2; r++) {
      if (partialSums[r] >= half) {
        const left = r - vbox.r1;
        const right = vbox.r2 - r;
        let splitPoint = r;
        if (left <= right) splitPoint = Math.min(vbox.r2 - 1, Math.max(vbox.r1, r));
        else splitPoint = Math.max(vbox.r1, Math.min(vbox.r2 - 1, r - 1));
        const box1 = shrinkBox(new VBox(vbox.r1, splitPoint, vbox.g1, vbox.g2, vbox.b1, vbox.b2, histo), histo);
        const box2 = shrinkBox(new VBox(splitPoint + 1, vbox.r2, vbox.g1, vbox.g2, vbox.b1, vbox.b2, histo), histo);
        box1._count = partialSums[splitPoint];
        box2._count = total - box1._count;
        return [box1, box2];
      }
    }
  } else if (splitDim === 'g') {
    for (let g = vbox.g1; g <= vbox.g2; g++) {
      let sliceCount = 0;
      const g_shift = g << 5;
      for (let r = vbox.r1; r <= vbox.r2; r++) {
        const r_g = (r << 10) | g_shift;
        for (let b = vbox.b1; b <= vbox.b2; b++) {
          sliceCount += histo[r_g | b];
        }
      }
      sum += sliceCount;
      partialSums[g] = sum;
    }
    const half = total / 2;
    for (let g = vbox.g1; g <= vbox.g2; g++) {
      if (partialSums[g] >= half) {
        const left = g - vbox.g1;
        const right = vbox.g2 - g;
        let splitPoint = g;
        if (left <= right) splitPoint = Math.min(vbox.g2 - 1, Math.max(vbox.g1, g));
        else splitPoint = Math.max(vbox.g1, Math.min(vbox.g2 - 1, g - 1));
        const box1 = shrinkBox(new VBox(vbox.r1, vbox.r2, vbox.g1, splitPoint, vbox.b1, vbox.b2, histo), histo);
        const box2 = shrinkBox(new VBox(vbox.r1, vbox.r2, splitPoint + 1, vbox.g2, vbox.b1, vbox.b2, histo), histo);
        box1._count = partialSums[splitPoint];
        box2._count = total - box1._count;
        return [box1, box2];
      }
    }
  } else {
    for (let b = vbox.b1; b <= vbox.b2; b++) {
      let sliceCount = 0;
      for (let r = vbox.r1; r <= vbox.r2; r++) {
        const r_shift = r << 10;
        for (let g = vbox.g1; g <= vbox.g2; g++) {
          sliceCount += histo[r_shift | (g << 5) | b];
        }
      }
      sum += sliceCount;
      partialSums[b] = sum;
    }
    const half = total / 2;
    for (let b = vbox.b1; b <= vbox.b2; b++) {
      if (partialSums[b] >= half) {
        const left = b - vbox.b1;
        const right = vbox.b2 - b;
        let splitPoint = b;
        if (left <= right) splitPoint = Math.min(vbox.b2 - 1, Math.max(vbox.b1, b));
        else splitPoint = Math.max(vbox.b1, Math.min(vbox.b2 - 1, b - 1));
        const box1 = shrinkBox(new VBox(vbox.r1, vbox.r2, vbox.g1, vbox.g2, vbox.b1, splitPoint, histo), histo);
        const box2 = shrinkBox(new VBox(vbox.r1, vbox.r2, vbox.g1, vbox.g2, splitPoint + 1, vbox.b2, histo), histo);
        box1._count = partialSums[splitPoint];
        box2._count = total - box1._count;
        return [box1, box2];
      }
    }
  }

  return [vbox];
}

function quantizeMMCQ(histo, targetBoxes = 16) {
  const rootBox = shrinkBox(new VBox(0, 31, 0, 31, 0, 31, histo), histo);
  if (rootBox.count() === 0) return [];

  let boxes = [rootBox];

  while (boxes.length < targetBoxes) {
    boxes.sort((a, b) => (b.count() * b.volume()) - (a.count() * a.volume()));
    const boxToSplit = boxes.shift();

    if (boxToSplit.count() <= 1 || boxToSplit.volume() <= 1) {
      boxes.push(boxToSplit);
      break;
    }

    const splitResult = medianCutSplit(boxToSplit, histo);
    if (splitResult.length === 1) {
      boxes.push(splitResult[0]);
      break;
    } else {
      boxes.push(splitResult[0]);
      boxes.push(splitResult[1]);
    }
  }

  return boxes;
}

function colorDist(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 3;
}

function analyzeArtworkPixels(data) {
  const histo = new Uint32Array(32768);
  let totalValidPixels = 0;
  let totalR = 0, totalG = 0, totalB = 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    totalValidPixels++;
    totalR += r; totalG += g; totalB += b;
    const r5 = r >> 3, g5 = g >> 3, b5 = b >> 3;
    const idx = (r5 << 10) | (g5 << 5) | b5;
    histo[idx]++;
  }

  if (totalValidPixels === 0) {
    const defaultDom = { r: 29, g: 185, b: 84 };
    return {
      dominant: defaultDom,
      primary: defaultDom,
      secondary: { r: 14, g: 165, b: 233 },
      tertiary: { r: 139, g: 92, b: 246 },
      quaternary: { r: 244, g: 63, b: 94 },
      base: { r: 8, g: 10, b: 18 },
      palette: [
        { r: 8, g: 10, b: 18 },
        defaultDom,
        { r: 14, g: 165, b: 233 },
        { r: 139, g: 92, b: 246 },
        { r: 244, g: 63, b: 94 }
      ]
    };
  }

  const boxes = quantizeMMCQ(histo, 16);
  const clusters = [];

  for (const b of boxes) {
    const c = b.avg();
    if (c.count > 0) {
      const hsl = rgbToHsl(c.r, c.g, c.b);
      clusters.push({
        r: c.r,
        g: c.g,
        b: c.b,
        count: c.count,
        h: hsl.h,
        s: hsl.s,
        l: hsl.l
      });
    }
  }

  if (clusters.length === 0) {
    const avgR = Math.round(totalR / totalValidPixels);
    const avgG = Math.round(totalG / totalValidPixels);
    const avgB = Math.round(totalB / totalValidPixels);
    const fallbackDom = { r: avgR, g: avgG, b: avgB };
    return {
      dominant: fallbackDom,
      primary: fallbackDom,
      secondary: fallbackDom,
      tertiary: fallbackDom,
      quaternary: fallbackDom,
      base: { r: Math.max(8, Math.round(avgR * 0.2)), g: Math.max(8, Math.round(avgG * 0.2)), b: Math.max(8, Math.round(avgB * 0.2)) },
      palette: [
        { r: Math.max(8, Math.round(avgR * 0.2)), g: Math.max(8, Math.round(avgG * 0.2)), b: Math.max(8, Math.round(avgB * 0.2)) },
        fallbackDom,
        fallbackDom,
        fallbackDom,
        fallbackDom
      ]
    };
  }

  // Sort by population descending
  clusters.sort((a, b) => b.count - a.count);

  let weightedSatSum = 0;
  for (const c of clusters) {
    weightedSatSum += c.s * c.count;
  }
  const avgSat = weightedSatSum / totalValidPixels;
  const isMonochrome = avgSat < 0.08;

  if (isMonochrome) {
    const avgR = totalR / totalValidPixels;
    const avgG = totalG / totalValidPixels;
    const avgB = totalB / totalValidPixels;
    const dominant = { r: Math.round(avgR), g: Math.round(avgG), b: Math.round(avgB) };

    const lumAvg = (0.299 * avgR + 0.587 * avgG + 0.114 * avgB) || 1;
    const rRatio = avgR / lumAvg;
    const gRatio = avgG / lumAvg;
    const bRatio = avgB / lumAvg;

    let lumBase, lumHero, lumShadow, lumCrest, lumLow;
    if (lumAvg < 45) {
      // Dark moody / black album (e.g. Donda, dark metal/rap covers)
      lumBase = Math.max(6, Math.round(lumAvg * 0.5));
      lumHero = Math.min(65, Math.round(lumAvg * 1.8 + 8));
      lumShadow = Math.min(40, Math.round(lumAvg * 1.2 + 4));
      lumCrest = Math.min(95, Math.round(lumAvg * 2.5 + 14));
      lumLow = Math.max(10, Math.round(lumAvg * 0.8));
    } else if (lumAvg > 210) {
      // Light / white album (e.g. White Album)
      lumBase = Math.max(140, Math.round(lumAvg * 0.7));
      lumHero = Math.round(lumAvg * 0.92);
      lumShadow = Math.round(lumAvg * 0.82);
      lumCrest = Math.min(255, Math.round(lumAvg * 0.98));
      lumLow = Math.round(lumAvg * 0.75);
    } else {
      // Balanced mid-tone monochrome / sepia
      lumBase = Math.max(14, Math.round(lumAvg * 0.22));
      lumHero = Math.min(220, Math.max(80, Math.round(lumAvg * 1.15)));
      lumShadow = Math.max(25, Math.round(lumAvg * 0.55));
      lumCrest = Math.min(245, Math.round(lumAvg * 1.55 + 20));
      lumLow = Math.max(18, Math.round(lumAvg * 0.35));
    }

    const makeTonal = (lum) => ({
      r: Math.min(255, Math.max(0, Math.round(lum * rRatio))),
      g: Math.min(255, Math.max(0, Math.round(lum * gRatio))),
      b: Math.min(255, Math.max(0, Math.round(lum * bRatio)))
    });

    const c0 = makeTonal(lumBase);
    const c1 = makeTonal(lumHero);
    const c2 = makeTonal(lumShadow);
    const c3 = makeTonal(lumCrest);
    const c4 = makeTonal(lumLow);

    return {
      dominant,
      primary: c1,
      secondary: c2,
      tertiary: c3,
      quaternary: c4,
      base: c0,
      palette: [c0, c1, c2, c3, c4]
    };
  }

  // Colorful artwork:
  const dominant = { r: clusters[0].r, g: clusters[0].g, b: clusters[0].b };
  const domHsl = rgbToHsl(dominant.r, dominant.g, dominant.b);

  // Score vibrant hero candidates (c1)
  let bestHero = clusters[0];
  let bestScore = -1;

  for (const c of clusters) {
    // Avoid extreme black and extreme white for hero vibrant pick
    if (c.l < 0.08 || c.l > 0.94) continue;
    const popRatio = c.count / totalValidPixels;
    const lumSweetSpot = 1.0 - Math.abs(c.l - 0.5) * 0.45;
    const score = Math.pow(popRatio, 0.55) * (c.s * 1.5 + 0.3) * lumSweetSpot;
    if (score > bestScore) {
      bestScore = score;
      bestHero = c;
    }
  }

  const c1 = { r: bestHero.r, g: bestHero.g, b: bestHero.b };
  const c1Hsl = rgbToHsl(c1.r, c1.g, c1.b);

  // Secondary (c2): largest cluster with perceptual contrast from c1
  let c2Candidate = null;
  for (const c of clusters) {
    if (c === bestHero) continue;
    if (c.l < 0.08 || c.l > 0.94) continue;
    if (colorDist(c, c1) >= 32) {
      c2Candidate = c;
      break;
    }
  }
  let c2;
  if (c2Candidate) {
    c2 = { r: c2Candidate.r, g: c2Candidate.g, b: c2Candidate.b };
  } else {
    // Monochromatic colorful cover (e.g. all red, all blue): use authentic tonal variation of same hue
    const targetLum = c1Hsl.l < 0.5 ? Math.min(0.85, c1Hsl.l + 0.28) : Math.max(0.18, c1Hsl.l - 0.25);
    c2 = hslToRgb(c1Hsl.h, c1Hsl.s, targetLum);
  }

  // Tertiary (c3): next largest cluster distinct from c1 and c2
  let c3Candidate = null;
  for (const c of clusters) {
    if (c === bestHero || c === c2Candidate) continue;
    if (colorDist(c, c1) >= 26 && colorDist(c, c2) >= 26) {
      c3Candidate = c;
      break;
    }
  }
  let c3;
  if (c3Candidate) {
    c3 = { r: c3Candidate.r, g: c3Candidate.g, b: c3Candidate.b };
  } else {
    const targetLum = Math.max(0.14, c1Hsl.l * 0.65);
    c3 = hslToRgb(c1Hsl.h, Math.max(0.2, c1Hsl.s * 0.8), targetLum);
  }

  // Crest Highlight (c4): brightest highlight from image
  let c4Candidate = null;
  let maxLum = -1;
  for (const c of clusters) {
    if (c.count >= totalValidPixels * 0.015 && c.l > maxLum && c.l >= 0.65) {
      maxLum = c.l;
      c4Candidate = c;
    }
  }
  let c4;
  if (c4Candidate) {
    c4 = { r: c4Candidate.r, g: c4Candidate.g, b: c4Candidate.b };
  } else {
    c4 = hslToRgb(c1Hsl.h, Math.min(0.5, c1Hsl.s * 0.85), Math.min(0.92, Math.max(0.75, c1Hsl.l + 0.32)));
  }

  // Ambient Base (c0): deep foundational tone
  let c0Candidate = null;
  for (const c of clusters) {
    if (c.l <= 0.18 && c.l >= 0.04 && c.count >= totalValidPixels * 0.03) {
      if (!c0Candidate || c.count > c0Candidate.count) {
        c0Candidate = c;
      }
    }
  }
  let c0;
  if (c0Candidate) {
    c0 = { r: c0Candidate.r, g: c0Candidate.g, b: c0Candidate.b };
  } else {
    // Deep velvet tint matching artwork dominant hue
    c0 = hslToRgb(domHsl.h, Math.min(0.35, domHsl.s * 0.6), 0.08);
  }

  return {
    dominant,
    primary: c1,
    secondary: c2,
    tertiary: c3,
    quaternary: c4,
    base: c0,
    palette: [c0, c1, c2, c3, c4]
  };
}

async function extractColorData(imgUrl) {
  if (!imgUrl) {
    return { dominant: DEFAULT_DOMINANT_COLOR, palette: DEFAULT_FLUID_PALETTE };
  }
  if (_colorDataCache.has(imgUrl)) {
    return _colorDataCache.get(imgUrl);
  }
  if (_colorDataPromises.has(imgUrl)) {
    return _colorDataPromises.get(imgUrl);
  }

  const promise = (async () => {
    let targetUrl = imgUrl;

    if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
      if (window.electronAPI && typeof window.electronAPI.fetchImageDataUrl === 'function') {
        try {
          const dataUrl = await window.electronAPI.fetchImageDataUrl(imgUrl);
          if (dataUrl) targetUrl = dataUrl;
        } catch (err) {
          console.warn('[Utils] fetchImageDataUrl fallback to direct load:', err);
        }
      }
    }

    return new Promise((resolve) => {
      let resolved = false;
      const done = (data) => {
        if (!resolved) {
          resolved = true;
          _colorDataCache.set(imgUrl, data);
          _colorDataPromises.delete(imgUrl);
          resolve(data);
        }
      };

      const img = new Image();
      if (!targetUrl.startsWith('data:')) {
        img.crossOrigin = "Anonymous";
      }

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 48;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, size, size);
          const data = ctx.getImageData(0, 0, size, size).data;

          const result = analyzeArtworkPixels(data);
          done(result);
        } catch (e) {
          console.warn('[Utils] Failed analyzing artwork pixels:', e);
          done({ dominant: DEFAULT_DOMINANT_COLOR, palette: DEFAULT_FLUID_PALETTE });
        }
      };

      img.onerror = () => {
        done({ dominant: DEFAULT_DOMINANT_COLOR, palette: DEFAULT_FLUID_PALETTE });
      };

      img.src = targetUrl;
      if (img.complete && img.naturalWidth > 0) {
        img.onload();
      }
    });
  })();

  _colorDataPromises.set(imgUrl, promise);
  return promise;
}

async function extractDominantColor(imgUrl) {
  const data = await extractColorData(imgUrl);
  return data.dominant;
}

async function extractColorPalette(imgUrl) {
  const data = await extractColorData(imgUrl);
  return data.palette;
}

function forceRecalculateDragRegions() {
  // In Tauri v2, data-tauri-drag-region is handled natively; forced DOM reflow is unnecessary.
}

const ACCENT_COLOR_MAP = {
  green: '#1DB954',
  purple: '#8b5cf6',
  blue: '#3b82f6',
  rose: '#f43f5e',
  orange: '#f97316',
  teal: '#14b8a6'
};

// Expose on global window object (Browser) and module.exports (Node.js test environment)
if (typeof window !== 'undefined') {
  window.escapeHTML = escapeHTML;
  window.showToast = showToast;
  window.formatTime = formatTime;
  window.rgbToHsl = rgbToHsl;
  window.hslToRgb = hslToRgb;
  window.analyzeArtworkPixels = analyzeArtworkPixels;
  window.extractDominantColor = extractDominantColor;
  window.extractColorPalette = extractColorPalette;
  window.extractColorData = extractColorData;
  window.forceRecalculateDragRegions = forceRecalculateDragRegions;
  window.ACCENT_COLOR_MAP = ACCENT_COLOR_MAP;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHTML,
    showToast,
    formatTime,
    rgbToHsl,
    hslToRgb,
    analyzeArtworkPixels,
    extractDominantColor,
    extractColorPalette,
    extractColorData,
    forceRecalculateDragRegions,
    ACCENT_COLOR_MAP
  };
}
