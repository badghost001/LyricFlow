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

function analyzeArtworkPixels(data) {
  const NUM_BUCKETS = 16;
  const BUCKET_DEG = 360 / NUM_BUCKETS;

  let totalR = 0, totalG = 0, totalB = 0, validPixelCount = 0;
  let saturatedCount = 0;

  const buckets = Array.from({ length: NUM_BUCKETS }, (_, i) => ({
    idx: i,
    hueCenter: i * BUCKET_DEG + BUCKET_DEG / 2,
    count: 0,
    sumR: 0, sumG: 0, sumB: 0,
    sumSat: 0, sumLum: 0,
    sumWeight: 0
  }));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;

    totalR += r; totalG += g; totalB += b;
    validPixelCount++;

    const { h, s, l } = rgbToHsl(r, g, b);

    // Skip near-black or near-white extremes
    if (l < 0.08 || l > 0.94) continue;

    if (s >= 0.12) {
      saturatedCount++;
      const bucketIdx = Math.min(NUM_BUCKETS - 1, Math.floor(h / BUCKET_DEG));
      const bkt = buckets[bucketIdx];
      bkt.count++;
      bkt.sumR += r;
      bkt.sumG += g;
      bkt.sumB += b;
      bkt.sumSat += s;
      bkt.sumLum += l;

      // Weight: favor vibrant, medium-brightness pixels
      const weight = (0.5 + s * 1.5) * (1.0 - Math.abs(l - 0.5) * 0.6);
      bkt.sumWeight += weight;
    }
  }

  const isMonochrome = validPixelCount > 0 && (saturatedCount / validPixelCount) < 0.08;

  if (isMonochrome || saturatedCount === 0) {
    let avgR = validPixelCount ? Math.round(totalR / validPixelCount) : 180;
    let avgG = validPixelCount ? Math.round(totalG / validPixelCount) : 190;
    let avgB = validPixelCount ? Math.round(totalB / validPixelCount) : 205;

    const maxVal = Math.max(avgR, avgG, avgB);
    if (maxVal > 0 && maxVal < 140) {
      const factor = 150 / maxVal;
      avgR = Math.min(255, Math.round(avgR * factor));
      avgG = Math.min(255, Math.round(avgG * factor));
      avgB = Math.min(255, Math.round(avgB * factor));
    }

    return {
      dominant: { r: avgR, g: avgG, b: avgB },
      palette: [
        { r: 8, g: 10, b: 15 },      // c0: Deep charcoal
        { r: 180, g: 190, b: 205 },  // c1: Luminous soft silver
        { r: 95, g: 110, b: 130 },   // c2: Muted slate
        { r: 220, g: 228, b: 240 },  // c3: High platinum crest
        { r: 45, g: 52, b: 65 }      // c4: Deep graphite tone
      ]
    };
  }

  // Reject tiny single-pixel outliers (must represent at least 2.5% of colorful pixels)
  const minPixelThreshold = Math.max(1, Math.floor(saturatedCount * 0.025));
  let clusters = [];

  for (const bkt of buckets) {
    if (bkt.count >= minPixelThreshold) {
      const avgR = bkt.sumR / bkt.count;
      const avgG = bkt.sumG / bkt.count;
      const avgB = bkt.sumB / bkt.count;
      const avgSat = bkt.sumSat / bkt.count;
      const avgLum = bkt.sumLum / bkt.count;
      const avgWeight = bkt.sumWeight / bkt.count;
      const score = Math.pow(bkt.count, 0.85) * avgWeight;

      clusters.push({
        idx: bkt.idx,
        hueCenter: bkt.hueCenter,
        count: bkt.count,
        avgR, avgG, avgB,
        avgSat, avgLum,
        score
      });
    }
  }

  if (clusters.length === 0) {
    for (const bkt of buckets) {
      if (bkt.count > 0) {
        clusters.push({
          idx: bkt.idx,
          hueCenter: bkt.hueCenter,
          count: bkt.count,
          avgR: bkt.sumR / bkt.count,
          avgG: bkt.sumG / bkt.count,
          avgB: bkt.sumB / bkt.count,
          avgSat: bkt.sumSat / bkt.count,
          avgLum: bkt.sumLum / bkt.count,
          score: bkt.count
        });
      }
    }
  }

  // Sort by score descending - top cluster is dominant
  clusters.sort((a, b) => b.score - a.score);

  const primary = clusters[0];
  let domR = Math.round(primary.avgR);
  let domG = Math.round(primary.avgG);
  let domB = Math.round(primary.avgB);

  // Ensure readability for lyrics text if it's too dark
  const maxVal = Math.max(domR, domG, domB);
  if (maxVal > 0 && maxVal < 140) {
    const factor = 150 / maxVal;
    domR = Math.min(255, Math.round(domR * factor));
    domG = Math.min(255, Math.round(domG * factor));
    domB = Math.min(255, Math.round(domB * factor));
  }
  const dominant = { r: domR, g: domG, b: domB };

  // Filter distinct clusters separated by >= 32 deg circular hue distance
  const distinctClusters = [];
  for (const c of clusters) {
    const isDistinct = distinctClusters.every(d => {
      const diff = Math.abs(d.hueCenter - c.hueCenter);
      const circularDiff = Math.min(diff, 360 - diff);
      return circularDiff >= 32;
    });
    if (isDistinct) distinctClusters.push(c);
  }

  const pHsl = rgbToHsl(primary.avgR, primary.avgG, primary.avgB);
  const heroSat = Math.max(0.55, Math.min(0.85, pHsl.s * 1.25));
  const heroLum = Math.max(0.42, Math.min(0.60, pHsl.l));

  // c0: Deep ambient velvet background tint in the album's primary hue
  const c0 = hslToRgb(pHsl.h, Math.min(0.35, heroSat * 0.6), 0.05);

  let c1, c2, c3, c4;

  if (distinctClusters.length >= 3) {
    // Multi-hue artwork (3 distinct colors)
    const c2Hsl = rgbToHsl(distinctClusters[1].avgR, distinctClusters[1].avgG, distinctClusters[1].avgB);
    const c3Hsl = rgbToHsl(distinctClusters[2].avgR, distinctClusters[2].avgG, distinctClusters[2].avgB);
    c1 = hslToRgb(pHsl.h, heroSat, heroLum);
    c2 = hslToRgb(c2Hsl.h, Math.max(0.50, Math.min(0.85, c2Hsl.s * 1.2)), Math.max(0.40, Math.min(0.62, c2Hsl.l)));
    c3 = hslToRgb(c3Hsl.h, Math.max(0.50, Math.min(0.85, c3Hsl.s * 1.2)), Math.max(0.45, Math.min(0.68, c3Hsl.l)));
    c4 = hslToRgb(pHsl.h + 15, Math.min(0.85, heroSat * 1.05), Math.max(0.28, heroLum * 0.75));
  } else if (distinctClusters.length === 2) {
    // Dual-hue artwork (e.g. orange & teal, purple & amber)
    const c2Hsl = rgbToHsl(distinctClusters[1].avgR, distinctClusters[1].avgG, distinctClusters[1].avgB);
    const sat2 = Math.max(0.50, Math.min(0.85, c2Hsl.s * 1.2));
    const lum2 = Math.max(0.40, Math.min(0.62, c2Hsl.l));
    c1 = hslToRgb(pHsl.h, heroSat, heroLum);
    c2 = hslToRgb(c2Hsl.h, sat2, lum2);
    c3 = hslToRgb(pHsl.h - 10, Math.min(0.80, heroSat * 0.95), Math.min(0.72, heroLum + 0.16));
    c4 = hslToRgb(c2Hsl.h + 12, Math.min(0.88, sat2 * 1.1), Math.max(0.28, lum2 - 0.14));
  } else {
    // Single-dominant hue artwork: harmonic analogous suite (zero foreign random colors!)
    const h = pHsl.h;
    c1 = hslToRgb(h, heroSat, heroLum);
    c2 = hslToRgb(h + 18, Math.min(0.85, heroSat * 1.05), Math.min(0.65, heroLum + 0.08));
    c3 = hslToRgb(h - 14, Math.min(0.80, heroSat * 0.95), Math.min(0.75, heroLum + 0.20));
    c4 = hslToRgb(h + 8, Math.min(0.90, heroSat * 1.15), Math.max(0.28, heroLum - 0.16));
  }

  return {
    dominant,
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
          const size = 36;
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
  const dragHandles = document.querySelectorAll('.drag-handle');
  dragHandles.forEach(el => {
    el.style.webkitAppRegion = 'none';
  });
  document.body.offsetHeight; // Force reflow
  setTimeout(() => {
    dragHandles.forEach(el => {
      el.style.webkitAppRegion = 'drag';
    });
  }, 100);
}

const ACCENT_COLOR_MAP = {
  green: '#1DB954',
  purple: '#8b5cf6',
  blue: '#3b82f6',
  rose: '#f43f5e',
  orange: '#f97316',
  teal: '#14b8a6'
};

// Expose on global window object
window.escapeHTML = escapeHTML;
window.showToast = showToast;
window.formatTime = formatTime;
window.extractDominantColor = extractDominantColor;
window.extractColorPalette = extractColorPalette;
window.extractColorData = extractColorData;
window.forceRecalculateDragRegions = forceRecalculateDragRegions;
window.ACCENT_COLOR_MAP = ACCENT_COLOR_MAP;
