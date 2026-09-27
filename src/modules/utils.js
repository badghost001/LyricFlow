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

// Image Dominant Color Extractor - Extracts vibrant album art color for lyrics
const _dominantColorCache = new Map();
async function extractDominantColor(imgUrl) {
  if (!imgUrl) return { r: 29, g: 185, b: 84 };
  if (_dominantColorCache.has(imgUrl)) {
    return _dominantColorCache.get(imgUrl);
  }

  let targetUrl = imgUrl;

  // If this is a remote HTTP/HTTPS image (e.g. from Spotify i.scdn.co which lacks CORS),
  // fetch it as a base64 Data URL via Rust bridge to completely avoid canvas tainting & CORS errors!
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    if (window.electronAPI && typeof window.electronAPI.fetchImageDataUrl === 'function') {
      try {
        const dataUrl = await window.electronAPI.fetchImageDataUrl(imgUrl);
        if (dataUrl) targetUrl = dataUrl;
      } catch (err) {
        console.warn('fetchImageDataUrl fallback to direct load:', err);
      }
    }
  }

  return new Promise((resolve) => {
    let resolved = false;
    const done = (color) => {
      if (!resolved) {
        resolved = true;
        _dominantColorCache.set(imgUrl, color);
        resolve(color);
      }
    };

    const img = new Image();
    if (!targetUrl.startsWith('data:')) {
      img.crossOrigin = "Anonymous";
    }
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 24;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let bestScore = -1;
        let bestR = 29, bestG = 185, bestB = 84;
        let avgR = 0, avgG = 0, avgB = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;

          avgR += r;
          avgG += g;
          avgB += b;
          count++;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const sat = max === 0 ? 0 : delta / max;

          // Skip near-black or near-white colors for the vibrant pick
          if (lum < 28 || lum > 240) continue;

          // Score highly for saturated, medium-bright colors
          const score = sat * 3 + (lum > 70 && lum < 200 ? 2 : 0.5);
          if (score > bestScore) {
            bestScore = score;
            bestR = r;
            bestG = g;
            bestB = b;
          }
        }

        // If no saturated color was found, use adjusted average
        let finalR = bestScore > 0.8 ? bestR : (count ? Math.round(avgR / count) : 29);
        let finalG = bestScore > 0.8 ? bestG : (count ? Math.round(avgG / count) : 185);
        let finalB = bestScore > 0.8 ? bestB : (count ? Math.round(avgB / count) : 84);

        // Ensure text contrast: boost brightness if too dark for lyrics text
        const maxVal = Math.max(finalR, finalG, finalB);
        if (maxVal > 0 && maxVal < 140) {
          const factor = 150 / maxVal;
          finalR = Math.min(255, Math.round(finalR * factor));
          finalG = Math.min(255, Math.round(finalG * factor));
          finalB = Math.min(255, Math.round(finalB * factor));
        }

        done({ r: finalR, g: finalG, b: finalB });
      } catch (e) {
        done({ r: 29, g: 185, b: 84 }); // fallback Spotify Green
      }
    };
    img.onerror = () => {
      done({ r: 29, g: 185, b: 84 });
    };
    img.src = targetUrl;
    if (img.complete && img.naturalWidth > 0) {
      img.onload();
    }
  });
}

// Multi-color palette extractor for Apple Music-style fluid mesh gradients
const _colorPaletteCache = new Map();
async function extractColorPalette(imgUrl) {
  const fallback = [
    { r: 8, g: 10, b: 18 },     // c0: Base dark
    { r: 29, g: 185, b: 84 },   // c1: Primary emerald
    { r: 14, g: 165, b: 233 },  // c2: Cyan highlight
    { r: 139, g: 92, b: 246 },  // c3: Violet wave
    { r: 244, g: 63, b: 94 }    // c4: Rose accent
  ];

  if (!imgUrl) return fallback;
  if (_colorPaletteCache.has(imgUrl)) {
    return _colorPaletteCache.get(imgUrl);
  }

  let targetUrl = imgUrl;
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    if (window.electronAPI && typeof window.electronAPI.fetchImageDataUrl === 'function') {
      try {
        const dataUrl = await window.electronAPI.fetchImageDataUrl(imgUrl);
        if (dataUrl) targetUrl = dataUrl;
      } catch (err) {}
    }
  }

  return new Promise((resolve) => {
    let resolved = false;
    const done = (palette) => {
      if (!resolved) {
        resolved = true;
        _colorPaletteCache.set(imgUrl, palette);
        resolve(palette);
      }
    };

    const img = new Image();
    if (!targetUrl.startsWith('data:')) {
      img.crossOrigin = "Anonymous";
    }

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // Group pixels into 12 hue buckets (30 deg each) for fine-grained color detection
        const buckets = Array.from({ length: 12 }, () => []);
        let totalR = 0, totalG = 0, totalB = 0, validCount = 0;
        let saturatedCount = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          if (a < 128) continue;

          totalR += r; totalG += g; totalB += b;
          validCount++;

          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const delta = max - min;
          const lum = (max + min) / 510;
          const sat = max === 0 ? 0 : delta / max;

          // Exclude extreme pure black or blown-out white
          if (lum < 0.10 || lum > 0.94) continue;

          if (sat >= 0.12) saturatedCount++;

          let hue = 0;
          if (delta > 0) {
            if (max === r) hue = ((g - b) / delta) % 6;
            else if (max === g) hue = (b - r) / delta + 2;
            else hue = (r - g) / delta + 4;
            hue = Math.round(hue * 60);
            if (hue < 0) hue += 360;
          }

          const bucketIdx = Math.min(11, Math.floor(hue / 30));
          buckets[bucketIdx].push({ r, g, b, sat, lum, hue, weight: sat * 2.5 + (lum > 0.35 && lum < 0.65 ? 1.5 : 0.5) });
        }

        // Helper: Convert HSL to RGB
        const hslToRgb = (h, s, l) => {
          let r, g, b;
          h = ((h % 360) + 360) % 360;
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
        };

        // Helper: Boost saturation moderately while preserving authentic color tone
        const boostVibrancy = (rawR, rawG, rawB) => {
          const rf = rawR / 255, gf = rawG / 255, bf = rawB / 255;
          const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
          let h = 0, s = 0, l = (max + min) / 2;
          if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === rf) h = (gf - bf) / d + (gf < bf ? 6 : 0);
            else if (max === gf) h = (bf - rf) / d + 2;
            else h = (rf - gf) / d + 4;
            h = Math.round(h * 60);
          }
          // Tasteful boost: amplify low saturation without creating fluorescent neon
          const boostedSat = Math.min(0.88, Math.max(0.68, s * 1.35));
          const balancedLum = Math.max(0.40, Math.min(0.62, l));
          return hslToRgb(h, boostedSat, balancedLum);
        };

        // Check if artwork is predominantly monochromatic
        const isMonochrome = validCount > 0 && (saturatedCount / validCount) < 0.08;

        let pickedColors = [];

        if (isMonochrome) {
          // Elegant monochromatic silver & slate atmosphere
          pickedColors = [
            { r: 185, g: 195, b: 210 }, // c1: Soft luminous silver
            { r: 95, g: 112, b: 135 },  // c2: Muted slate
            { r: 220, g: 228, b: 240 }, // c3: High platinum crest
            { r: 52, g: 60, b: 74 }     // c4: Deep charcoal tone
          ];
        } else {
          // Sort buckets by total weight
          buckets.forEach(b => b.sort((x, y) => y.weight - x.weight));
          const activeBuckets = buckets.filter(b => b.length > 0).sort((a, b) => b[0].weight - a[0].weight);

          for (let b of activeBuckets) {
            if (pickedColors.length >= 4) break;
            const best = b[0];
            pickedColors.push(boostVibrancy(best.r, best.g, best.b));
          }

          // If few distinct hues exist, generate natural tonal variations of the real primary color
          if (pickedColors.length > 0) {
            const p = pickedColors[0];
            const max = Math.max(p.r, p.g, p.b), min = Math.min(p.r, p.g, p.b);
            let pSat = 0.7, pLum = 0.5, pHue = 142;
            if (max !== min) {
              const d = max - min;
              pLum = (max + min) / 510;
              pSat = pLum > 0.5 ? d / (510 - max - min) : d / (max + min);
              if (max === p.r) pHue = ((p.g - p.b) / d + (p.g < p.b ? 6 : 0)) * 60;
              else if (max === p.g) pHue = ((p.b - p.r) / d + 2) * 60;
              else pHue = ((p.r - p.g) / d + 4) * 60;
            }

            // Natural tonal variations instead of clashing rainbow colors
            if (pickedColors.length < 2) pickedColors.push(hslToRgb(pHue + 18, Math.min(0.85, pSat * 1.1), 0.44));
            if (pickedColors.length < 3) pickedColors.push(hslToRgb(pHue - 14, Math.min(0.90, pSat * 0.95), 0.62));
            if (pickedColors.length < 4) pickedColors.push(hslToRgb(pHue + 30, Math.min(0.82, pSat * 1.05), 0.38));
          }
        }

        // Fallback safety if no pixels qualified
        if (pickedColors.length < 4) {
          pickedColors = fallback.slice(1);
        }

        // Base ambient tone c0: deep velvety dark tint matching the album hue
        let baseHue = 142;
        if (pickedColors.length > 0) {
          const p = pickedColors[0];
          const max = Math.max(p.r, p.g, p.b), min = Math.min(p.r, p.g, p.b);
          if (max !== min) {
            const d = max - min;
            if (max === p.r) baseHue = ((p.g - p.b) / d + (p.g < p.b ? 6 : 0)) * 60;
            else if (max === p.g) baseHue = ((p.b - p.r) / d + 2) * 60;
            else baseHue = ((p.r - p.g) / d + 4) * 60;
          }
        }
        const c0 = isMonochrome ? { r: 10, g: 12, b: 16 } : hslToRgb(baseHue, 0.30, 0.05);

        const result = [c0, pickedColors[0], pickedColors[1], pickedColors[2], pickedColors[3]];
        done(result);
      } catch (e) {
        done(fallback);
      }
    };

    img.onerror = () => done(fallback);
    img.src = targetUrl;
    if (img.complete && img.naturalWidth > 0) {
      img.onload();
    }
  });
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
window.forceRecalculateDragRegions = forceRecalculateDragRegions;
window.ACCENT_COLOR_MAP = ACCENT_COLOR_MAP;
