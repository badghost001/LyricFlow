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
window.forceRecalculateDragRegions = forceRecalculateDragRegions;
window.ACCENT_COLOR_MAP = ACCENT_COLOR_MAP;
