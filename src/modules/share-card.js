/**
 * LyricFlow - Viral Lyric Share Card Generator & Interactive Studio
 * Inspired by Apple Music, Spotify Stories, and Genius quote cards.
 * Supports:
 * - 4 Aspect Ratios: 9:16 Story, 1:1 Square, 4:5 Feed, 16:9 Landscape
 * - 7 Aesthetic Themes: Fluid Mesh, Obsidian, Vinyl, Liquid Glass, Aurora Glow, Editorial, Cyberpunk
 * - Bilingual Lyrics & Translation modes
 * - Full-song lyric browsing with live search filter
 * - Custom typography (Modern Sans, Editorial Serif, JetBrains Mono, Rounded Soft)
 * - Toggles for Watermark, Timestamp badge, and Album Artwork
 * - Direct PNG clipboard copy, download, and formatted text quote copy
 */

(function () {
  let shareState = {
    format: 'story',         // 'story' (9:16), 'square' (1:1), 'portrait' (4:5), 'landscape' (16:9)
    theme: 'mesh',           // 'mesh', 'obsidian', 'vinyl', 'glass', 'aurora', 'editorial', 'cyberpunk'
    transMode: 'original',   // 'original', 'bilingual', 'translation'
    fontFamily: 'sans',      // 'sans', 'serif', 'mono', 'soft'
    showWatermark: true,
    showTimestamp: true,
    showAlbumArt: true,
    selectedIndices: [],
    albumImg: null,
    trackTitle: '',
    artistName: '',
    palette: ['#1DB954', '#8b5cf6', '#3b82f6', '#f43f5e'],
    cachedLyrics: [],
    searchFilter: ''
  };

  /**
   * Opens the Interactive Share Preview Modal
   */
  function openShareModal(preferredIndex = null) {
    const currentLyrics = (typeof lyrics !== 'undefined' && Array.isArray(lyrics)) ? lyrics : [];
    if (!currentLyrics || currentLyrics.length === 0) {
      if (typeof showToast === 'function') {
        showToast("No active lyrics to share!", 2000, 'warning');
      }
      return;
    }

    const modal = document.getElementById("share-card-modal");
    if (!modal) {
      console.warn("[ShareCard] #share-card-modal element not found in DOM");
      return;
    }

    // Determine current track details
    const trackObj = (typeof currentPlayingTrackObj !== 'undefined' && currentPlayingTrackObj) ? currentPlayingTrackObj : null;
    const widgetTrack = document.getElementById("widget-track-name");
    const widgetArtist = document.getElementById("widget-artist-name");
    const widgetArt = document.getElementById("widget-album-art");

    shareState.trackTitle = (trackObj && trackObj.name) || (widgetTrack ? widgetTrack.textContent.trim() : "LyricFlow");
    shareState.artistName = (trackObj && trackObj.artists && trackObj.artists[0]?.name) || (widgetArtist ? widgetArtist.textContent.trim() : "");
    shareState.cachedLyrics = currentLyrics;
    shareState.searchFilter = '';

    // Clear search input if present
    const searchInput = document.getElementById("share-line-search");
    if (searchInput) searchInput.value = '';

    // Determine active line index
    let curActive = (preferredIndex !== null && preferredIndex >= 0 && preferredIndex < currentLyrics.length)
      ? preferredIndex
      : ((typeof activeLineIndex !== 'undefined' && activeLineIndex >= 0 && activeLineIndex < currentLyrics.length)
          ? activeLineIndex
          : 0);

    // Default select active line
    shareState.selectedIndices = [curActive];

    // Extract current palette from DOM CSS variables or defaults
    try {
      const computed = getComputedStyle(document.documentElement);
      const p1 = computed.getPropertyValue('--accent-primary').trim() || '#1DB954';
      const p2 = computed.getPropertyValue('--accent-secondary').trim() || '#8b5cf6';
      const p3 = computed.getPropertyValue('--accent-tertiary').trim() || '#3b82f6';
      const p4 = computed.getPropertyValue('--accent-quaternary').trim() || '#f43f5e';
      shareState.palette = [p1, p2, p3, p4];
    } catch (_) {
      shareState.palette = ['#1DB954', '#8b5cf6', '#3b82f6', '#f43f5e'];
    }

    // Check if song has translations (subText)
    const hasTranslation = currentLyrics.some(l => l && l.subText && l.subText.trim());
    const transSection = document.getElementById("share-trans-section");
    if (transSection) {
      transSection.style.display = hasTranslation ? 'flex' : 'none';
      if (!hasTranslation) {
        shareState.transMode = 'original';
      }
    }

    // Load album image (supports both HTTP/HTTPS and local SMTC base64 data-URLs)
    const artUrl = (trackObj && trackObj.album && trackObj.album.images && trackObj.album.images[0]?.url)
      || (widgetArt ? widgetArt.src : '');

    if (artUrl) {
      const img = new Image();
      if (!artUrl.startsWith('data:')) {
        img.crossOrigin = "Anonymous";
      }
      img.onload = () => {
        shareState.albumImg = img;
        renderModalCanvas();
      };
      img.onerror = () => {
        shareState.albumImg = null;
        renderModalCanvas();
      };
      img.src = artUrl;
    } else {
      shareState.albumImg = null;
    }

    // Populate full-song line picker
    populateLinePicker(curActive);

    // Bind modal controls if not yet bound
    bindModalEventsOnce();

    // Render initial card
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => renderModalCanvas());
    } else {
      renderModalCanvas();
    }

    // Show modal
    modal.classList.add("is-open");

    // Smoothly scroll picker to center active line chip
    setTimeout(() => {
      const picker = document.getElementById("share-line-picker");
      const activeChip = picker?.querySelector(`.share-line-chip[data-index="${curActive}"]`);
      if (activeChip) {
        activeChip.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 100);
  }

  function closeShareModal() {
    const modal = document.getElementById("share-card-modal");
    if (modal) {
      modal.classList.remove("is-open");
    }

    // If user opened share modal while in Dynamic Island mode, restore island docking
    if (window._returnToIslandAfterShare) {
      window._returnToIslandAfterShare = false;
      const dockPos = (typeof settings !== 'undefined' && settings.dynamicIslandPosition) ? settings.dynamicIslandPosition : 'top-center';
      if (window.electronAPI && typeof window.electronAPI.setDynamicIslandMode === 'function') {
        window.electronAPI.setDynamicIslandMode(true, dockPos);
      }
    }
  }

  /**
   * Format milliseconds into mm:ss
   */
  function formatLyricTimestamp(ms) {
    if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  /**
   * Populates the line picker list with the full song lyrics & live search filter
   */
  function populateLinePicker(centerIdx) {
    const picker = document.getElementById("share-line-picker");
    const countBadge = document.getElementById("share-lines-count-badge");
    if (!picker) return;

    picker.innerHTML = "";
    const filter = (shareState.searchFilter || '').toLowerCase().trim();

    shareState.cachedLyrics.forEach((line, i) => {
      if (!line || !line.text || !line.text.trim()) return;

      const mainText = line.text.trim();
      const subText = (line.subText || '').trim();

      // Search filtering
      if (filter && !mainText.toLowerCase().includes(filter) && !subText.toLowerCase().includes(filter)) {
        return;
      }

      const isSelected = shareState.selectedIndices.includes(i);
      const chip = document.createElement("div");
      chip.className = `share-line-chip ${isSelected ? 'selected' : ''}`;
      chip.dataset.index = String(i);

      const timeStr = formatLyricTimestamp(line.timeMs);
      const subMarkup = subText ? `<span class="share-line-subtext">${escapeHTML(subText)}</span>` : '';

      chip.innerHTML = `
        <div class="share-line-check">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <span class="share-line-time">${timeStr}</span>
        <div class="share-line-content">
          <span class="share-line-text">${escapeHTML(mainText)}</span>
          ${subMarkup}
        </div>
      `;

      chip.addEventListener("click", () => {
        handleLineChipClick(i);
      });

      picker.appendChild(chip);
    });

    if (countBadge) {
      const cnt = shareState.selectedIndices.length;
      countBadge.textContent = `${cnt} line${cnt === 1 ? '' : 's'}`;
    }
  }

  /**
   * Handles selecting/deselecting lines (supports up to 6 lines)
   */
  function handleLineChipClick(index) {
    let sel = [...shareState.selectedIndices];

    if (sel.includes(index)) {
      if (sel.length > 1) {
        sel = sel.filter(idx => idx !== index);
      }
    } else {
      if (sel.length >= 6) {
        // Drop oldest or reset to new selection
        sel.shift();
      }
      sel.push(index);
    }

    // Keep ascending order
    sel.sort((a, b) => a - b);
    shareState.selectedIndices = sel;

    // Update UI chips
    const picker = document.getElementById("share-line-picker");
    if (picker) {
      picker.querySelectorAll(".share-line-chip").forEach(chip => {
        const chipIdx = parseInt(chip.dataset.index, 10);
        chip.classList.toggle("selected", sel.includes(chipIdx));
      });
    }

    const countBadge = document.getElementById("share-lines-count-badge");
    if (countBadge) {
      const cnt = sel.length;
      countBadge.textContent = `${cnt} line${cnt === 1 ? '' : 's'}`;
    }

    renderModalCanvas();
  }

  let eventsBound = false;
  function bindModalEventsOnce() {
    if (eventsBound) return;
    eventsBound = true;

    // Close button
    const closeBtn = document.getElementById("share-modal-close");
    if (closeBtn) closeBtn.addEventListener("click", closeShareModal);

    // Backdrop click
    const backdrop = document.getElementById("share-modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeShareModal);

    // Escape key
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const modal = document.getElementById("share-card-modal");
        if (modal && modal.classList.contains("is-open")) {
          closeShareModal();
        }
      }
    });

    // Ratio buttons
    const ratioBtns = document.querySelectorAll(".share-ratio-btn");
    ratioBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        ratioBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        shareState.format = btn.dataset.ratio || 'story';
        renderModalCanvas();
      });
    });

    // Theme cards
    const themeCards = document.querySelectorAll(".share-theme-card");
    themeCards.forEach(card => {
      card.addEventListener("click", () => {
        themeCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        shareState.theme = card.dataset.theme || 'mesh';
        renderModalCanvas();
      });
    });

    // Translation mode buttons
    const transBtns = document.querySelectorAll(".share-trans-btn");
    transBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        transBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        shareState.transMode = btn.dataset.trans || 'original';
        const badge = document.getElementById("share-trans-badge");
        if (badge) {
          badge.textContent = btn.textContent.trim();
        }
        renderModalCanvas();
      });
    });

    // Font buttons
    const fontBtns = document.querySelectorAll(".share-font-btn");
    fontBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        fontBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        shareState.fontFamily = btn.dataset.font || 'sans';
        renderModalCanvas();
      });
    });

    // Checkbox toggles
    const toggleWatermark = document.getElementById("share-toggle-watermark");
    if (toggleWatermark) {
      toggleWatermark.addEventListener("change", (e) => {
        shareState.showWatermark = e.target.checked;
        renderModalCanvas();
      });
    }

    const toggleTimestamp = document.getElementById("share-toggle-timestamp");
    if (toggleTimestamp) {
      toggleTimestamp.addEventListener("change", (e) => {
        shareState.showTimestamp = e.target.checked;
        renderModalCanvas();
      });
    }

    const toggleArt = document.getElementById("share-toggle-art");
    if (toggleArt) {
      toggleArt.addEventListener("change", (e) => {
        shareState.showAlbumArt = e.target.checked;
        renderModalCanvas();
      });
    }

    // Live search input
    const searchInput = document.getElementById("share-line-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        shareState.searchFilter = e.target.value;
        populateLinePicker(shareState.selectedIndices[0] || 0);
      });
    }

    // Copy Image action
    const btnCopy = document.getElementById("btn-share-copy-img");
    if (btnCopy) {
      btnCopy.addEventListener("click", () => {
        copyCanvasToClipboard();
      });
    }

    // Download action
    const btnDownload = document.getElementById("btn-share-download-img");
    if (btnDownload) {
      btnDownload.addEventListener("click", () => {
        downloadCanvasAsPng();
      });
    }

    // Copy Text action
    const btnCopyText = document.getElementById("btn-share-copy-text");
    if (btnCopyText) {
      btnCopyText.addEventListener("click", () => {
        copyLyricsAsText();
      });
    }
  }

  /**
   * Helper: Resolves aspect ratio dimensions
   */
  function getCardDimensions(format) {
    switch (format) {
      case 'square':
        return { width: 1080, height: 1080 };
      case 'portrait':
        return { width: 1080, height: 1350 }; // 4:5
      case 'landscape':
        return { width: 1920, height: 1080 }; // 16:9
      case 'story':
      default:
        return { width: 1080, height: 1920 }; // 9:16
    }
  }

  /**
   * Helper: Resolves CSS font stack
   */
  function getFontStack(family) {
    switch (family) {
      case 'serif':
        return '"Playfair Display", "Georgia", "Times New Roman", serif';
      case 'mono':
        return '"JetBrains Mono", "Consolas", monospace';
      case 'soft':
        return '"Poppins", "Nunito", "Outfit", sans-serif';
      case 'sans':
      default:
        return '"Outfit", "Inter", "Segoe UI", sans-serif';
    }
  }

  /**
   * Formats lyric line data according to active translation mode
   */
  function getFormattedLyricsForShare(selectedIndices, cachedLyrics, transMode) {
    return selectedIndices.map(i => {
      const line = cachedLyrics[i];
      if (!line) return null;
      const orig = (line.text || '').trim();
      const sub = (line.subText || '').trim();
      const timeMs = line.timeMs || 0;

      if (transMode === 'translation' && sub) {
        return { primary: sub, secondary: null, timeMs };
      } else if (transMode === 'bilingual' && sub && sub.toLowerCase() !== orig.toLowerCase()) {
        return { primary: orig, secondary: sub, timeMs };
      } else {
        return { primary: orig, secondary: null, timeMs };
      }
    }).filter(Boolean);
  }

  /**
   * Renders the high-resolution canvas according to shareState
   */
  function renderModalCanvas() {
    const canvas = document.getElementById("share-card-canvas");
    if (!canvas) return;

    const { width, height } = getCardDimensions(shareState.format);
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Extract selected lyric lines with translation handling
    const formattedLines = getFormattedLyricsForShare(
      shareState.selectedIndices,
      shareState.cachedLyrics,
      shareState.transMode
    );

    if (formattedLines.length === 0) {
      formattedLines.push({ primary: "Music is what feelings sound like.", secondary: null, timeMs: 0 });
    }

    // Draw background based on theme
    drawThemeBackground(ctx, width, height, shareState.theme, shareState.albumImg, shareState.palette);

    // Draw format layout
    switch (shareState.format) {
      case 'square':
        drawSquareLayout(ctx, width, height, formattedLines, shareState);
        break;
      case 'portrait':
        drawPortraitLayout(ctx, width, height, formattedLines, shareState);
        break;
      case 'landscape':
        drawLandscapeLayout(ctx, width, height, formattedLines, shareState);
        break;
      case 'story':
      default:
        drawStoryLayout(ctx, width, height, formattedLines, shareState);
        break;
    }
  }

  /**
   * Draw themes: mesh, obsidian, vinyl, glass, aurora, editorial, cyberpunk
   */
  function drawThemeBackground(ctx, w, h, theme, img, palette) {
    const p1 = palette[0] || '#1DB954';
    const p2 = palette[1] || '#8b5cf6';
    const p3 = palette[2] || '#3b82f6';
    const p4 = palette[3] || '#f43f5e';

    if (theme === 'mesh') {
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(0, 0, w, h);

      // Radial blob 1 (Top Left)
      const grad1 = ctx.createRadialGradient(w * 0.15, h * 0.2, 50, w * 0.2, h * 0.2, w * 0.75);
      grad1.addColorStop(0, hexToRgba(p1, 0.7));
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, w, h);

      // Radial blob 2 (Bottom Right)
      const grad2 = ctx.createRadialGradient(w * 0.85, h * 0.8, 50, w * 0.8, h * 0.8, w * 0.75);
      grad2.addColorStop(0, hexToRgba(p2, 0.65));
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w, h);

      // Radial blob 3 (Center Right)
      const grad3 = ctx.createRadialGradient(w * 0.8, h * 0.35, 50, w * 0.7, h * 0.4, w * 0.65);
      grad3.addColorStop(0, hexToRgba(p3, 0.5));
      grad3.addColorStop(1, 'transparent');
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, w, h);

      // Radial blob 4 (Bottom Left)
      const grad4 = ctx.createRadialGradient(w * 0.2, h * 0.85, 50, w * 0.25, h * 0.85, w * 0.65);
      grad4.addColorStop(0, hexToRgba(p4, 0.55));
      grad4.addColorStop(1, 'transparent');
      ctx.fillStyle = grad4;
      ctx.fillRect(0, 0, w, h);

      // Dark contrast scrim
      const scrim = ctx.createLinearGradient(0, 0, 0, h);
      scrim.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
      scrim.addColorStop(0.5, 'rgba(0, 0, 0, 0.32)');
      scrim.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, w, h);

    } else if (theme === 'obsidian') {
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, w, h);

      const haloGrad = ctx.createRadialGradient(w * 0.5, h * 0.35, 80, w * 0.5, h * 0.35, w * 0.65);
      haloGrad.addColorStop(0, hexToRgba(p1, 0.38));
      haloGrad.addColorStop(0.6, hexToRgba(p2, 0.14));
      haloGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, w, h);

    } else if (theme === 'vinyl') {
      ctx.fillStyle = '#121215';
      ctx.fillRect(0, 0, w, h);

      const rad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w * 0.85);
      rad.addColorStop(0, '#1c1c22');
      rad.addColorStop(1, '#0c0c0e');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, w, h);

    } else if (theme === 'glass') {
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.filter = 'blur(60px) brightness(0.38) saturate(1.6)';
        ctx.drawImage(img, -120, -120, w + 240, h + 240);
        ctx.restore();
      } else {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#1a102f');
        g.addColorStop(1, '#0c1a24');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      const cardMargin = Math.min(80, w * 0.08);
      const cardW = w - (cardMargin * 2);
      const cardH = h - (cardMargin * 2);
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, cardMargin, cardMargin, cardW, cardH, 44);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

    } else if (theme === 'aurora') {
      // Apple Music style vibrant multi-gradient aura
      ctx.fillStyle = '#05070e';
      ctx.fillRect(0, 0, w, h);

      const a1 = ctx.createRadialGradient(w * 0.3, h * 0.25, 40, w * 0.35, h * 0.3, w * 0.6);
      a1.addColorStop(0, '#38bdf8');
      a1.addColorStop(1, 'transparent');
      ctx.fillStyle = a1;
      ctx.fillRect(0, 0, w, h);

      const a2 = ctx.createRadialGradient(w * 0.75, h * 0.45, 60, w * 0.7, h * 0.5, w * 0.65);
      a2.addColorStop(0, '#818cf8');
      a2.addColorStop(1, 'transparent');
      ctx.fillStyle = a2;
      ctx.fillRect(0, 0, w, h);

      const a3 = ctx.createRadialGradient(w * 0.5, h * 0.75, 50, w * 0.5, h * 0.8, w * 0.7);
      a3.addColorStop(0, '#c084fc');
      a3.addColorStop(1, 'transparent');
      ctx.fillStyle = a3;
      ctx.fillRect(0, 0, w, h);

      const scrim = ctx.createLinearGradient(0, 0, 0, h);
      scrim.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
      scrim.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
      scrim.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, w, h);

    } else if (theme === 'editorial') {
      // Prestigious high-contrast magazine print aesthetic
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, w, h);

      // Fine architectural border frame
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 3;
      const m = Math.min(50, w * 0.05);
      ctx.strokeRect(m, m, w - m * 2, h - m * 2);

    } else if (theme === 'cyberpunk') {
      // Dark cyberpunk tech matrix with neon glow
      ctx.fillStyle = '#08090d';
      ctx.fillRect(0, 0, w, h);

      // Subtle tech background grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 48;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Neon cyan top glow & magenta bottom glow
      const c1 = ctx.createRadialGradient(w * 0.2, h * 0.15, 20, w * 0.2, h * 0.15, w * 0.55);
      c1.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
      c1.addColorStop(1, 'transparent');
      ctx.fillStyle = c1;
      ctx.fillRect(0, 0, w, h);

      const c2 = ctx.createRadialGradient(w * 0.8, h * 0.85, 20, w * 0.8, h * 0.85, w * 0.55);
      c2.addColorStop(0, 'rgba(236, 72, 153, 0.35)');
      c2.addColorStop(1, 'transparent');
      ctx.fillStyle = c2;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /**
   * Draw Vinyl record helper
   */
  function drawVinylDisk(ctx, centerX, centerY, radius, albumImg, accent) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#141416';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 32;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Grooves
    for (let r = radius * 0.45; r < radius - 10; r += 12) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Specular shine cones
    const sheenGrad = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    sheenGrad.addColorStop(0.5, 'transparent');
    sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    ctx.fillStyle = sheenGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Center mini label
    const labelR = radius * 0.32;
    if (albumImg && albumImg.complete && albumImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, labelR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(albumImg, centerX - labelR, centerY - labelR, labelR * 2, labelR * 2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(centerX, centerY, labelR, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }

    // Spindle hole
    ctx.beginPath();
    ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0c';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Story Format (9:16 - 1080 x 1920)
   */
  function drawStoryLayout(ctx, w, h, lines, state) {
    const isEditorial = state.theme === 'editorial';
    const isVinyl = state.theme === 'vinyl';
    const accent = isEditorial ? '#18181b' : (state.palette[0] || '#1DB954');
    const primaryFont = getFontStack(state.fontFamily);

    // 1. Album Artwork & Vinyl (Top Area)
    let artY = 220;
    if (state.showAlbumArt) {
      const artSize = isVinyl ? 360 : 380;
      const artX = isVinyl ? (w / 2 - artSize / 2 - 50) : (w / 2 - artSize / 2);

      if (isVinyl) {
        drawVinylDisk(ctx, artX + artSize + 30, artY + artSize / 2, artSize * 0.48, state.albumImg, accent);
      }
      drawAlbumArt(ctx, state.albumImg, artX, artY, artSize, isEditorial ? 0 : 32);

      // Track & Artist Info
      const trackY = artY + artSize + 56;
      ctx.textAlign = 'center';

      drawMiniSoundbars(ctx, w / 2, trackY - 14, accent);

      ctx.font = `700 40px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? '#18181b' : '#ffffff';
      ctx.fillText(truncateText(ctx, state.trackTitle, 800), w / 2, trackY + 36);

      ctx.font = `500 26px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.65)';
      ctx.fillText(truncateText(ctx, state.artistName, 760), w / 2, trackY + 76);

      artY = trackY + 110;
    } else {
      artY = 320;
      ctx.textAlign = 'center';
      ctx.font = `700 38px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? '#18181b' : '#ffffff';
      ctx.fillText(truncateText(ctx, state.trackTitle, 800), w / 2, artY);
      ctx.font = `500 26px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.65)';
      ctx.fillText(truncateText(ctx, state.artistName, 760), w / 2, artY + 44);
      artY += 90;
    }

    // 2. Quotation Mark
    ctx.textAlign = 'center';
    ctx.font = '800 100px "Georgia", serif';
    ctx.fillStyle = hexToRgba(accent, 0.7);
    ctx.fillText('“', w / 2, artY + 20);

    // 3. Render Lyric Lines (Handles bilingual subtitles)
    drawLyricBlock(ctx, w / 2, artY + 70, 860, lines, state, isEditorial, primaryFont);

    // 4. Timestamp & Watermark at bottom
    if (state.showTimestamp && lines[0] && lines[0].timeMs > 0) {
      drawTimestampBadge(ctx, w / 2, 1720, lines[0].timeMs, accent, isEditorial);
    }
    if (state.showWatermark) {
      drawWatermarkPill(ctx, w / 2, 1780, accent, isEditorial);
    }
  }

  /**
   * Square Format (1:1 - 1080 x 1080)
   */
  function drawSquareLayout(ctx, w, h, lines, state) {
    const isEditorial = state.theme === 'editorial';
    const accent = isEditorial ? '#18181b' : (state.palette[0] || '#1DB954');
    const primaryFont = getFontStack(state.fontFamily);

    // 1. Quotation Mark at Top
    ctx.textAlign = 'center';
    ctx.font = '800 84px "Georgia", serif';
    ctx.fillStyle = hexToRgba(accent, 0.7);
    ctx.fillText('“', w / 2, 120);

    // 2. Lyric Text in Center Block
    drawLyricBlock(ctx, w / 2, 170, 880, lines, state, isEditorial, primaryFont, 500);

    // 3. Bottom Footer
    const footerY = 840;
    const thumbSize = 120;
    const footerMargin = 100;

    if (state.showAlbumArt) {
      drawAlbumArt(ctx, state.albumImg, footerMargin, footerY, thumbSize, isEditorial ? 0 : 20);
      ctx.textAlign = 'left';
      ctx.font = `700 32px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? '#18181b' : '#ffffff';
      const textStartX = footerMargin + thumbSize + 24;
      ctx.fillText(truncateText(ctx, state.trackTitle, 460), textStartX, footerY + 44);

      ctx.font = `500 22px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.65)';
      ctx.fillText(truncateText(ctx, state.artistName, 460), textStartX, footerY + 80);

      drawMiniSoundbars(ctx, textStartX + 42, footerY + 104, accent);
    } else {
      ctx.textAlign = 'center';
      ctx.font = `700 32px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? '#18181b' : '#ffffff';
      ctx.fillText(truncateText(ctx, `${state.trackTitle} • ${state.artistName}`, 860), w / 2, footerY + 50);
    }

    if (state.showWatermark) {
      drawWatermarkPill(ctx, w - footerMargin - 95, footerY + 60, accent, isEditorial);
    }
  }

  /**
   * Portrait Format (4:5 - 1080 x 1350) - Optimal Instagram Feed
   */
  function drawPortraitLayout(ctx, w, h, lines, state) {
    const isEditorial = state.theme === 'editorial';
    const accent = isEditorial ? '#18181b' : (state.palette[0] || '#1DB954');
    const primaryFont = getFontStack(state.fontFamily);

    let startY = 160;
    if (state.showAlbumArt) {
      const thumbSize = 180;
      drawAlbumArt(ctx, state.albumImg, w / 2 - thumbSize / 2, startY, thumbSize, isEditorial ? 0 : 24);
      startY += thumbSize + 36;
      ctx.textAlign = 'center';
      ctx.font = `700 34px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? '#18181b' : '#ffffff';
      ctx.fillText(truncateText(ctx, state.trackTitle, 800), w / 2, startY);
      ctx.font = `500 24px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.65)';
      ctx.fillText(truncateText(ctx, state.artistName, 760), w / 2, startY + 36);
      startY += 70;
    } else {
      ctx.textAlign = 'center';
      ctx.font = `700 34px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? '#18181b' : '#ffffff';
      ctx.fillText(truncateText(ctx, `${state.trackTitle} — ${state.artistName}`, 800), w / 2, startY);
      startY += 50;
    }

    ctx.font = '800 80px "Georgia", serif';
    ctx.fillStyle = hexToRgba(accent, 0.7);
    ctx.fillText('“', w / 2, startY + 30);

    drawLyricBlock(ctx, w / 2, startY + 60, 880, lines, state, isEditorial, primaryFont, 480);

    if (state.showTimestamp && lines[0] && lines[0].timeMs > 0) {
      drawTimestampBadge(ctx, w / 2, 1220, lines[0].timeMs, accent, isEditorial);
    }
    if (state.showWatermark) {
      drawWatermarkPill(ctx, w / 2, 1270, accent, isEditorial);
    }
  }

  /**
   * Landscape Format (16:9 - 1920 x 1080) - Twitter/X Header & Desktop
   */
  function drawLandscapeLayout(ctx, w, h, lines, state) {
    const isEditorial = state.theme === 'editorial';
    const accent = isEditorial ? '#18181b' : (state.palette[0] || '#1DB954');
    const primaryFont = getFontStack(state.fontFamily);

    // Left Column: Artwork & Track Metadata
    const leftMargin = 140;
    const artSize = 360;
    const artY = (h - artSize) / 2 - 40;

    if (state.showAlbumArt) {
      drawAlbumArt(ctx, state.albumImg, leftMargin, artY, artSize, isEditorial ? 0 : 28);
      ctx.textAlign = 'left';
      ctx.font = `700 36px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? '#18181b' : '#ffffff';
      ctx.fillText(truncateText(ctx, state.trackTitle, 460), leftMargin, artY + artSize + 50);

      ctx.font = `500 24px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.65)';
      ctx.fillText(truncateText(ctx, state.artistName, 460), leftMargin, artY + artSize + 90);

      drawMiniSoundbars(ctx, leftMargin + 40, artY + artSize + 120, accent);
    }

    // Right Column: Lyrics
    const lyricsCenterX = state.showAlbumArt ? (w * 0.66) : (w / 2);
    ctx.textAlign = 'center';
    ctx.font = '800 90px "Georgia", serif';
    ctx.fillStyle = hexToRgba(accent, 0.7);
    ctx.fillText('“', lyricsCenterX, 180);

    drawLyricBlock(ctx, lyricsCenterX, 240, 960, lines, state, isEditorial, primaryFont, 560);

    if (state.showWatermark) {
      drawWatermarkPill(ctx, w - 200, h - 80, accent, isEditorial);
    }
  }

  /**
   * Helper: Renders Lyric lines with responsive typography & bilingual subtitles
   */
  function drawLyricBlock(ctx, cx, startY, maxWidth, lines, state, isEditorial, primaryFont, availableHeight = 520) {
    const totalLines = lines.length;
    let baseFontSize = 48;
    let lineHeight = 68;
    let subFontSize = 26;
    let subLineHeight = 38;
    let paraGap = 24;

    if (totalLines === 1) {
      baseFontSize = 54;
      lineHeight = 76;
      subFontSize = 28;
      subLineHeight = 42;
    } else if (totalLines === 2) {
      baseFontSize = 46;
      lineHeight = 66;
      subFontSize = 24;
      subLineHeight = 36;
    } else if (totalLines <= 4) {
      baseFontSize = 38;
      lineHeight = 54;
      subFontSize = 22;
      subLineHeight = 32;
      paraGap = 18;
    } else {
      baseFontSize = 32;
      lineHeight = 44;
      subFontSize = 18;
      subLineHeight = 26;
      paraGap = 14;
    }

    // Pre-calculate line wraps
    ctx.font = `600 ${baseFontSize}px ${primaryFont}`;
    const wrappedParagraphs = lines.map(item => {
      const priWraps = wrapText(ctx, item.primary, maxWidth);
      let secWraps = [];
      if (item.secondary) {
        ctx.font = `italic 400 ${subFontSize}px ${primaryFont}`;
        secWraps = wrapText(ctx, item.secondary, maxWidth);
        ctx.font = `600 ${baseFontSize}px ${primaryFont}`;
      }
      return { priWraps, secWraps };
    });

    // Compute total block height for center-alignment
    let totalHeight = 0;
    wrappedParagraphs.forEach((p, idx) => {
      totalHeight += p.priWraps.length * lineHeight;
      if (p.secWraps.length > 0) {
        totalHeight += (p.secWraps.length * subLineHeight) + 8;
      }
      if (idx < wrappedParagraphs.length - 1) totalHeight += paraGap;
    });

    let curY = startY + Math.max(0, (availableHeight - totalHeight) / 2);

    wrappedParagraphs.forEach(p => {
      // Primary text
      ctx.textAlign = 'center';
      ctx.font = `600 ${baseFontSize}px ${primaryFont}`;
      ctx.fillStyle = isEditorial ? '#18181b' : '#ffffff';
      if (!isEditorial) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 12;
      }

      p.priWraps.forEach(lineText => {
        ctx.fillText(lineText, cx, curY);
        curY += lineHeight;
      });

      // Secondary / Translated subtitle text
      if (p.secWraps.length > 0) {
        curY -= (lineHeight - subLineHeight) / 2;
        ctx.font = `italic 400 ${subFontSize}px ${primaryFont}`;
        ctx.fillStyle = isEditorial ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.72)';
        if (!isEditorial) {
          ctx.shadowBlur = 6;
        }

        p.secWraps.forEach(subText => {
          ctx.fillText(subText, cx, curY);
          curY += subLineHeight;
        });
        curY += 8;
      }

      curY += paraGap;
    });

    ctx.shadowBlur = 0;
  }

  /**
   * Draws Squircle Album Art with shadow & specular border
   */
  function drawAlbumArt(ctx, img, x, y, size, radius) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 16;

    if (img && img.complete && img.naturalWidth > 0) {
      drawRoundedRect(ctx, x, y, size, size, radius);
      ctx.fillStyle = '#1c1c20';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.drawImage(img, x, y, size, size);
      ctx.restore();
    } else {
      drawRoundedRect(ctx, x, y, size, size, radius);
      ctx.fillStyle = '#222228';
      ctx.fill();

      // Placeholder music note icon
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, x, y, size, size, radius);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws 5-bar soundwave equalizer glyph
   */
  function drawMiniSoundbars(ctx, cx, cy, color) {
    const bars = [14, 22, 16, 26, 12];
    const barW = 4;
    const gap = 4;
    const startX = cx - ((bars.length * (barW + gap) - gap) / 2);

    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < bars.length; i++) {
      const bh = bars[i];
      const bx = startX + i * (barW + gap);
      const by = cy - bh / 2;
      drawRoundedRect(ctx, bx, by, barW, bh, 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Draws timestamp badge (e.g. ▶ 02:14)
   */
  function drawTimestampBadge(ctx, cx, cy, timeMs, accent, isEditorial = false) {
    const timeStr = `▶ ${formatLyricTimestamp(timeMs)}`;
    ctx.save();
    ctx.font = '600 16px "JetBrains Mono", monospace';
    const textW = ctx.measureText(timeStr).width;
    const badgeW = textW + 28;
    const badgeH = 32;
    const px = cx - badgeW / 2;
    const py = cy - badgeH / 2;

    ctx.fillStyle = isEditorial ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
    ctx.strokeStyle = isEditorial ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, px, py, badgeW, badgeH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = isEditorial ? '#18181b' : 'rgba(255,255,255,0.85)';
    ctx.fillText(timeStr, cx, cy + 5);
    ctx.restore();
  }

  /**
   * Draws modern pill badge: LyricFlow
   */
  function drawWatermarkPill(ctx, cx, cy, accent, isEditorial = false) {
    const pillW = 180;
    const pillH = 42;
    const px = cx - pillW / 2;
    const py = cy - pillH / 2;

    ctx.save();
    ctx.fillStyle = isEditorial ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = isEditorial ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, px, py, pillW, pillH, 21);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(px + 26, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = '700 17px "Outfit", "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = isEditorial ? '#18181b' : 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('LyricFlow', px + 42, cy + 6);

    ctx.restore();
  }

  /**
   * Helper: Rounded Rectangle Path
   */
  function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (radius <= 0) {
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.closePath();
      return;
    }
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Word wrap helper
   */
  function wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const words = String(text).split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * Text truncation helper
   */
  function truncateText(ctx, text, maxWidth) {
    if (!text) return "";
    if (ctx.measureText(text).width <= maxWidth) return text;

    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + "…").width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "…";
  }

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(29, 185, 84, ${alpha})`;
    const h = hex.replace('#', '').trim();
    let r = 0, g = 0, b = 0;
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else if (h.length >= 6) {
      r = parseInt(h.substring(0, 2), 16);
      g = parseInt(h.substring(2, 4), 16);
      b = parseInt(h.substring(4, 6), 16);
    }
    return `rgba(${r || 0}, ${g || 0}, ${b || 0}, ${alpha})`;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g,
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  /**
   * Copies the rendered card directly to clipboard as PNG
   */
  function copyCanvasToClipboard() {
    const canvas = document.getElementById("share-card-canvas");
    const copyText = document.getElementById("share-copy-text");
    if (!canvas) return;

    canvas.toBlob(blob => {
      if (!blob) {
        if (typeof showToast === 'function') showToast("Failed to create image.", 2500, 'warning');
        return;
      }

      if (window.ClipboardItem && navigator.clipboard && typeof navigator.clipboard.write === 'function') {
        const item = new window.ClipboardItem({ "image/png": blob });
        navigator.clipboard.write([item]).then(() => {
          if (typeof showToast === 'function') showToast("Share Card copied to clipboard!", 2500, 'success');
          if (copyText) {
            const original = copyText.textContent;
            copyText.textContent = "Copied!";
            setTimeout(() => { copyText.textContent = original; }, 2000);
          }
        }).catch(err => {
          console.warn("[ShareCard] navigator.clipboard write failed:", err);
          downloadCanvasAsPng();
        });
      } else {
        downloadCanvasAsPng();
      }
    }, 'image/png');
  }

  /**
   * Downloads the rendered card directly as PNG
   */
  function downloadCanvasAsPng() {
    const canvas = document.getElementById("share-card-canvas");
    if (!canvas) return;

    const cleanTitle = (shareState.trackTitle || "lyrics").replace(/[^a-zA-Z0-9_\-]/g, "_");
    const filename = `${cleanTitle}-LyricFlow.png`;

    try {
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (typeof showToast === 'function') {
        showToast("Saved image to downloads!", 2500, 'success');
      }
    } catch (e) {
      console.error("[ShareCard] Download error:", e);
    }
  }

  /**
   * Builds formatted quote string from selected lyrics
   */
  function buildShareTextQuote(selectedIndices, cachedLyrics, trackTitle, artistName) {
    const lines = selectedIndices
      .map(i => cachedLyrics[i]?.text)
      .filter(Boolean);
    if (lines.length === 0) return '';
    const quote = lines.map(l => `"${l}"`).join('\n');
    return `${quote}\n\n— ${trackTitle} by ${artistName}\n(Shared via LyricFlow)`;
  }

  /**
   * Copies selected lyrics as formatted text
   */
  function copyLyricsAsText() {
    const textQuote = buildShareTextQuote(
      shareState.selectedIndices,
      shareState.cachedLyrics,
      shareState.trackTitle,
      shareState.artistName
    );

    if (!textQuote) {
      if (typeof showToast === 'function') showToast("No lyrics selected.", 2000, 'warning');
      return;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(textQuote).then(() => {
        if (typeof showToast === 'function') showToast("Lyrics text copied to clipboard!", 2500, 'success');
        const badge = document.getElementById("share-copy-quote-text");
        if (badge) {
          const orig = badge.textContent;
          badge.textContent = "Copied!";
          setTimeout(() => { badge.textContent = orig; }, 2000);
        }
      }).catch(() => {
        if (typeof showToast === 'function') showToast("Failed to copy text.", 2000, 'warning');
      });
    }
  }

  // Expose on global window object
  if (typeof window !== 'undefined') {
    window.generateShareCard = openShareModal;
    window.openShareModal = openShareModal;
    window.closeShareModal = closeShareModal;
  }

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      wrapText,
      truncateText,
      hexToRgba,
      getCardDimensions,
      getFontStack,
      formatLyricTimestamp,
      getFormattedLyricsForShare,
      buildShareTextQuote
    };
  }

})();
