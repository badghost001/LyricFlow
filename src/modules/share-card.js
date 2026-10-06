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
  const ShapeMorpher = (typeof window !== 'undefined' && window.KineticShapeMorpher)
    ? window.KineticShapeMorpher
    : (typeof require === 'function' ? require('./kinetic/KineticShapeMorpher') : null);
  const ColorEngine = (typeof window !== 'undefined' && window.KineticColorEngine)
    ? window.KineticColorEngine
    : (typeof require === 'function' ? require('./kinetic/KineticColorEngine') : null);
  const TypographyEngine = (typeof window !== 'undefined' && window.KineticTypographyEngine)
    ? window.KineticTypographyEngine
    : (typeof require === 'function' ? require('./kinetic/KineticTypographyEngine') : null);
  const Director = (typeof window !== 'undefined' && window.KineticDirector)
    ? window.KineticDirector
    : (typeof require === 'function' ? require('./kinetic/KineticDirector') : null);

  /**
   * Top-Level Editorial Design Presets
   * Classic (Design 1), Cinematic (Design 2) & Kinetic (Design 3)
   */
  const SHARE_CARD_PRESETS = {
    glass: {
      id: 'glass',
      name: 'Featured',
      subtitle: 'Glass Box',
      description: 'Frosted glass floating card',
      format: 'story',
      theme: 'glass',
      cardContent: 'lyrics_art',
      fontFamily: 'sans',
      textAlign: 'left',
      fontScale: 'large',
      showAlbumArt: true,
      showScrubber: true,
      showGrain: false,
      showWatermark: true,
      showTimestamp: false
    },
    classic: {
      id: 'classic',
      name: 'Design 1',
      subtitle: 'Classic',
      description: 'Editorial lyric poster',
      format: 'story',
      theme: 'classic',
      fontFamily: 'sans',
      textAlign: 'center',
      fontScale: 'normal',
      showAlbumArt: true,
      showScrubber: true,
      showGrain: true,
      showWatermark: true,
      showTimestamp: false
    },
    cinematic: {
      id: 'cinematic',
      name: 'Design 2',
      subtitle: 'Cinematic',
      description: 'Frosted artwork canvas',
      format: 'story',
      theme: 'cinematic',
      fontFamily: 'sans',
      textAlign: 'center',
      fontScale: 'large',
      showAlbumArt: true,
      showScrubber: true,
      showGrain: true,
      showWatermark: true,
      showTimestamp: false
    },
    kinetic: {
      id: 'kinetic',
      name: 'Design 3',
      subtitle: 'Kinetic',
      description: 'Animated story video',
      format: 'story',
      theme: 'kinetic',
      fontFamily: 'serif',
      textAlign: 'center',
      fontScale: 'normal',
      showAlbumArt: true,
      showScrubber: false,
      showGrain: false,
      showWatermark: false,
      showTimestamp: false,
      kineticShape: 'auto',
      kineticColor: 'album_art'
    },
    custom: {
      id: 'custom',
      name: 'Custom',
      subtitle: 'Custom Studio',
      description: 'Customize everything'
    }
  };

  let shareState = {
    designMode: 'glass',     // 'glass' (Featured Glass Box), 'classic' (Design 1), 'cinematic' (Design 2), 'kinetic' (Design 3), 'custom' (Custom Studio)
    cardContent: 'lyrics_art', // 'lyrics_art' (Lyrics + Album Art) | 'art_track' (Album Art + Song Name + Artist)
    format: 'story',         // 'story' (9:16), 'square' (1:1), 'portrait' (4:5), 'landscape' (16:9)
    theme: 'glass',          // 'glass', 'classic', 'cinematic', 'kinetic', 'mesh', 'obsidian', 'vinyl', 'cassette', 'bloom', 'sunset', 'aurora', 'editorial', 'cyberpunk'
    transMode: 'original',   // 'original', 'bilingual', 'translation'
    fontFamily: 'sans',      // 'sans', 'serif', 'mono', 'soft'
    textAlign: 'center',     // 'left', 'center', 'right'
    fontScale: 'normal',     // 'compact', 'normal', 'large', 'heroic'
    heroIndex: null,         // index of line designated as hero punchline
    showWatermark: true,
    showTimestamp: false,
    showAlbumArt: true,
    showScrubber: true,      // Playback progress scrubber bar
    showGrain: true,         // Analog film grain texture
    export2x: true,          // 4K Ultra-HD 2x Retina export
    kineticShape: 'auto',    // 'auto' | 'random' | 'astroid' | 'diamond' | 'clover' | 'rosette' | 'heart' | 'hexagon' | 'circle'
    kineticColor: 'album_art', // 'album_art' | 'velvet_plum' | 'midnight_emerald' | ... | 'custom'
    kineticCustomColors: null,
    isExportingVideo: false,
    selectedIndices: [],
    albumImg: null,
    trackTitle: '',
    artistName: '',
    currentProgressMs: 0,
    trackDurationMs: 0,
    palette: ['#1DB954', '#8b5cf6', '#3b82f6', '#f43f5e'],
    cachedLyrics: [],
    searchFilter: '',
    userPickedTheme: false
  };

  /**
   * Dedicated cache for user custom configuration.
   * Preserves granular options across preset switches and drawer accordion toggles.
   */
  let savedCustomConfig = {
    format: 'story',
    theme: 'mesh',
    transMode: 'original',
    fontFamily: 'sans',
    textAlign: 'center',
    fontScale: 'normal',
    showAlbumArt: true,
    showScrubber: true,
    showGrain: true,
    showWatermark: true,
    showTimestamp: false,
    export2x: true
  };

  function syncSavedCustomConfigFromState() {
    savedCustomConfig.format = shareState.format;
    savedCustomConfig.theme = shareState.theme;
    savedCustomConfig.transMode = shareState.transMode;
    savedCustomConfig.fontFamily = shareState.fontFamily;
    savedCustomConfig.textAlign = shareState.textAlign;
    savedCustomConfig.fontScale = shareState.fontScale;
    savedCustomConfig.showAlbumArt = shareState.showAlbumArt;
    savedCustomConfig.showScrubber = shareState.showScrubber;
    savedCustomConfig.showGrain = shareState.showGrain;
    savedCustomConfig.showWatermark = shareState.showWatermark;
    savedCustomConfig.showTimestamp = shareState.showTimestamp;
    savedCustomConfig.export2x = shareState.export2x;
  }

  function restoreCustomConfigToState() {
    shareState.format = savedCustomConfig.format;
    shareState.theme = savedCustomConfig.theme;
    shareState.transMode = savedCustomConfig.transMode;
    shareState.fontFamily = savedCustomConfig.fontFamily;
    shareState.textAlign = savedCustomConfig.textAlign;
    shareState.fontScale = savedCustomConfig.fontScale;
    shareState.showAlbumArt = savedCustomConfig.showAlbumArt;
    shareState.showScrubber = savedCustomConfig.showScrubber;
    shareState.showGrain = savedCustomConfig.showGrain;
    shareState.showWatermark = savedCustomConfig.showWatermark;
    shareState.showTimestamp = savedCustomConfig.showTimestamp;
    shareState.export2x = savedCustomConfig.export2x;
  }

  function setDrawerAriaExpanded(isOpen) {
    if (typeof document === 'undefined') return;
    const strVal = isOpen ? "true" : "false";
    const customCard = document.getElementById("preset-card-custom");
    if (customCard) customCard.setAttribute("aria-expanded", strVal);
    const chevronBtn = document.getElementById("share-custom-chevron-btn");
    if (chevronBtn) chevronBtn.setAttribute("aria-expanded", strVal);
  }

  /**
   * Opens the Interactive Share Preview Modal
   */
  function openShareModal(preferredIndex = null) {
    if (typeof showToast === 'function') {
      showToast("Lyric Share Card is coming soon!", 2200, 'info');
    }

    const currentLyrics = (typeof lyrics !== 'undefined' && Array.isArray(lyrics)) ? lyrics : [];
    if (!currentLyrics || currentLyrics.length === 0) {
      return;
    }

    const modal = document.getElementById("share-card-modal");
    if (!modal) {
      console.warn("[ShareCard] #share-card-modal element not found in DOM");
      return;
    }

    // Wake from auto-hide, restore opacity and ensure click reception
    if (typeof cancelAutoHide === 'function') {
      cancelAutoHide();
    }
    if (typeof setClickThroughCached === 'function') {
      setClickThroughCached(false);
    }
    if (typeof isDynamicIslandMode !== 'undefined' && isDynamicIslandMode) {
      window._returnToIslandAfterShare = true;
      if (typeof toggleDynamicIslandMode === 'function') {
        toggleDynamicIslandMode(false);
      }
    }

    // Determine current track details & playback timestamps
    const trackObj = (typeof currentPlayingTrackObj !== 'undefined' && currentPlayingTrackObj) ? currentPlayingTrackObj : null;
    const widgetTrack = document.getElementById("widget-track-name");
    const widgetArtist = document.getElementById("widget-artist-name");
    const widgetArt = document.getElementById("widget-album-art");

    shareState.trackTitle = (trackObj && trackObj.name) || (widgetTrack ? widgetTrack.textContent.trim() : "LyricFlow");
    shareState.artistName = (trackObj && trackObj.artists && trackObj.artists[0]?.name) || (widgetArtist ? widgetArtist.textContent.trim() : "");
    shareState.cachedLyrics = currentLyrics;
    shareState.searchFilter = '';
    shareState.currentProgressMs = (typeof currentProgress === 'number' && currentProgress >= 0) ? currentProgress : 0;
    shareState.trackDurationMs = (typeof trackDuration === 'number' && trackDuration > 0) ? trackDuration : 0;

    // Clear search input if present
    const searchInput = document.getElementById("share-line-search");
    if (searchInput) searchInput.value = '';

    // Determine active line index
    let curActive = (preferredIndex !== null && preferredIndex >= 0 && preferredIndex < currentLyrics.length)
      ? preferredIndex
      : ((typeof activeLineIndex !== 'undefined' && activeLineIndex >= 0 && activeLineIndex < currentLyrics.length)
          ? activeLineIndex
          : 0);

    // Default select active line and set as hero punchline
    shareState.selectedIndices = [curActive];
    if (shareState.heroIndex === null && curActive >= 0) {
      shareState.heroIndex = curActive;
    }

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

    // Initialize active design preset or custom mode
    if (shareState.designMode === 'glass') {
      applyPreset('glass', false);
    } else if (shareState.designMode === 'classic') {
      applyPreset('classic', false);
    } else if (shareState.designMode === 'cinematic') {
      applyPreset('cinematic', false);
    } else if (shareState.designMode === 'kinetic') {
      applyPreset('kinetic', false);
    } else {
      restoreCustomConfigToState();
      const controlsPane = document.querySelector(".share-controls-pane");
      if (controlsPane) {
        controlsPane.classList.add("drawer-open");
      }
      setDrawerAriaExpanded(true);
      updateDesignSelectorUI();
      syncCustomDrawerControlsFromState();
    }

    // Render initial card safely
    try {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          try { renderModalCanvas(); } catch (err) { console.error("[ShareCard] Canvas render error:", err); }
        });
      } else {
        renderModalCanvas();
      }
    } catch (err) {
      console.error("[ShareCard] Initial render error:", err);
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

    if (typeof updateAutoHideState === 'function') {
      updateAutoHideState();
    }

    // If user opened share modal while in Dynamic Island mode, restore island docking
    if (window._returnToIslandAfterShare) {
      window._returnToIslandAfterShare = false;
      if (typeof toggleDynamicIslandMode === 'function') {
        toggleDynamicIslandMode(true);
      } else {
        const dockPos = (typeof settings !== 'undefined' && settings.dynamicIslandPosition) ? settings.dynamicIslandPosition : 'top-center';
        if (window.electronAPI && typeof window.electronAPI.setDynamicIslandMode === 'function') {
          window.electronAPI.setDynamicIslandMode(true, dockPos);
        }
      }
    } else if (window._returnToKineticAfterShare) {
      window._returnToKineticAfterShare = false;
      if (typeof toggleKineticMode === 'function') {
        toggleKineticMode(true);
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
      const isHero = shareState.heroIndex === i;
      const chip = document.createElement("div");
      chip.className = `share-line-chip ${isSelected ? 'selected' : ''} ${isHero ? 'is-hero' : ''}`;
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
        <button type="button" class="share-line-hero-btn ${isHero ? 'active' : ''}" title="${isHero ? 'Punchline Active' : 'Make Punchline / Hero Line'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="${isHero ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      `;

      const heroBtn = chip.querySelector(".share-line-hero-btn");
      if (heroBtn) {
        heroBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (shareState.heroIndex === i) {
            shareState.heroIndex = null;
          } else {
            shareState.heroIndex = i;
            if (!shareState.selectedIndices.includes(i)) {
              if (shareState.selectedIndices.length >= 6) {
                shareState.selectedIndices.shift();
              }
              shareState.selectedIndices.push(i);
              shareState.selectedIndices.sort((a, b) => a - b);
            }
          }
          populateLinePicker(i);
          renderModalCanvas();
        });
      }

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
        if (shareState.heroIndex === index) {
          shareState.heroIndex = sel[0] ?? null;
        }
      }
    } else {
      if (sel.length >= 6) {
        sel.shift();
      }
      sel.push(index);
      if (shareState.heroIndex === null) {
        shareState.heroIndex = index;
      }
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

  /**
   * Applies an editorial preset (Design 1 Classic or Design 2 Cinematic)
   */
  function applyPreset(presetId, shouldRender = true) {
    if (presetId === 'custom') {
      activateCustomMode(false);
      if (shouldRender) {
        renderModalCanvas();
      }
      return;
    }

    const preset = SHARE_CARD_PRESETS[presetId];
    if (!preset) return;

    // Snapshot custom configuration before switching away from custom mode
    if (shareState.designMode === 'custom') {
      syncSavedCustomConfigFromState();
    }

    shareState.designMode = presetId;
    if (preset.theme) shareState.theme = preset.theme;
    if (preset.format) shareState.format = preset.format;
    if (preset.fontFamily) shareState.fontFamily = preset.fontFamily;
    if (preset.textAlign) shareState.textAlign = preset.textAlign;
    if (preset.fontScale) shareState.fontScale = preset.fontScale;
    if (typeof preset.showAlbumArt === 'boolean') shareState.showAlbumArt = preset.showAlbumArt;
    if (typeof preset.showScrubber === 'boolean') shareState.showScrubber = preset.showScrubber;
    if (typeof preset.showGrain === 'boolean') shareState.showGrain = preset.showGrain;
    if (typeof preset.showWatermark === 'boolean') shareState.showWatermark = preset.showWatermark;
    if (typeof preset.showTimestamp === 'boolean') shareState.showTimestamp = preset.showTimestamp;
    if (preset.cardContent) shareState.cardContent = preset.cardContent;

    // Synchronize UI
    syncCustomDrawerControlsFromState();

    // Collapse drawer when selecting a preset and return scroll to top
    if (typeof document !== 'undefined') {
      const controlsPane = document.querySelector(".share-controls-pane");
      if (controlsPane) controlsPane.classList.remove("drawer-open");
      setDrawerAriaExpanded(false);
      const scrollArea = document.getElementById("share-controls-scroll-area");
      if (scrollArea) {
        scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
      }

      updateDesignSelectorUI();
      if (shouldRender) {
        renderModalCanvas();
      }
    }
  }

  /**
   * Activates Custom Mode and ensures the customization drawer is opened.
   * Restores user's custom settings from savedCustomConfig if transitioning from another preset.
   */
  function activateCustomMode(shouldScroll = true) {
    const wasAlreadyCustom = shareState.designMode === 'custom';
    shareState.designMode = 'custom';

    if (!wasAlreadyCustom) {
      restoreCustomConfigToState();
    }

    if (typeof document === 'undefined') return;

    const controlsPane = document.querySelector(".share-controls-pane");
    const scrollArea = document.getElementById("share-controls-scroll-area") || controlsPane;
    const drawer = document.getElementById("share-custom-controls-drawer");

    if (controlsPane) {
      controlsPane.classList.add("drawer-open");
    }
    setDrawerAriaExpanded(true);

    syncCustomDrawerControlsFromState();
    updateDesignSelectorUI();
    renderModalCanvas();

    if (shouldScroll && scrollArea && drawer) {
      setTimeout(() => {
        try {
          const scrollAreaRect = scrollArea.getBoundingClientRect();
          const drawerRect = drawer.getBoundingClientRect();
          const relativeTop = (drawerRect.top - scrollAreaRect.top) + (scrollArea.scrollTop || 0);
          scrollArea.scrollTo({
            top: Math.max(0, relativeTop - 12),
            behavior: 'smooth'
          });
        } catch (_) {
          const drawerTop = drawer.offsetTop || 0;
          scrollArea.scrollTo({
            top: Math.max(0, drawerTop - 12),
            behavior: 'smooth'
          });
        }
      }, 35);
    }
  }

  /**
   * Toggles only the Custom controls drawer without switching active preset.
   */
  function toggleCustomDrawerOnly(shouldScroll = true) {
    if (typeof document === 'undefined') return;

    const controlsPane = document.querySelector(".share-controls-pane");
    const scrollArea = document.getElementById("share-controls-scroll-area") || controlsPane;
    const drawer = document.getElementById("share-custom-controls-drawer");
    if (!controlsPane) return;

    const isCurrentlyOpen = controlsPane.classList.contains("drawer-open");
    const willOpen = !isCurrentlyOpen;
    controlsPane.classList.toggle("drawer-open", willOpen);
    setDrawerAriaExpanded(willOpen);

    // If opening drawer while in custom mode, ensure state & controls sync
    if (willOpen && shareState.designMode === 'custom') {
      restoreCustomConfigToState();
      syncCustomDrawerControlsFromState();
    }

    if (willOpen && shouldScroll && scrollArea && drawer) {
      setTimeout(() => {
        try {
          const scrollAreaRect = scrollArea.getBoundingClientRect();
          const drawerRect = drawer.getBoundingClientRect();
          const relativeTop = (drawerRect.top - scrollAreaRect.top) + (scrollArea.scrollTop || 0);
          scrollArea.scrollTo({
            top: Math.max(0, relativeTop - 12),
            behavior: 'smooth'
          });
        } catch (_) {
          const drawerTop = drawer.offsetTop || 0;
          scrollArea.scrollTo({
            top: Math.max(0, drawerTop - 12),
            behavior: 'smooth'
          });
        }
      }, 35);
    }
  }

  /**
   * Toggles custom customization drawer, marks custom mode active,
   * restores custom state if needed, and smoothly scrolls drawer into view.
   */
  function toggleCustomMode(forceOpen = null, shouldScroll = true) {
    const wasAlreadyCustom = shareState.designMode === 'custom';
    shareState.designMode = 'custom';
    if (!wasAlreadyCustom) {
      restoreCustomConfigToState();
    }

    if (typeof document === 'undefined') return;

    const controlsPane = document.querySelector(".share-controls-pane");
    const scrollArea = document.getElementById("share-controls-scroll-area") || controlsPane;
    const drawer = document.getElementById("share-custom-controls-drawer");
    if (!controlsPane) return;

    const isCurrentlyOpen = controlsPane.classList.contains("drawer-open");
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !isCurrentlyOpen;
    controlsPane.classList.toggle("drawer-open", shouldOpen);
    setDrawerAriaExpanded(shouldOpen);

    syncCustomDrawerControlsFromState();
    updateDesignSelectorUI();
    renderModalCanvas();

    if (shouldOpen && shouldScroll && scrollArea && drawer) {
      setTimeout(() => {
        try {
          const scrollAreaRect = scrollArea.getBoundingClientRect();
          const drawerRect = drawer.getBoundingClientRect();
          const relativeTop = (drawerRect.top - scrollAreaRect.top) + (scrollArea.scrollTop || 0);
          scrollArea.scrollTo({
            top: Math.max(0, relativeTop - 12),
            behavior: 'smooth'
          });
        } catch (_) {
          const drawerTop = drawer.offsetTop || 0;
          scrollArea.scrollTo({
            top: Math.max(0, drawerTop - 12),
            behavior: 'smooth'
          });
        }
      }, 35);
    }
  }

  /**
   * Switches selection to Custom whenever user edits any granular parameter
   */
  function markCustomModeActive() {
    if (shareState.designMode !== 'custom') {
      shareState.designMode = 'custom';
      updateDesignSelectorUI();
    }
  }

  /**
   * Updates visual selected state of Design 1, Design 2, and Custom cards in the UI
   */
  function updateDesignSelectorUI() {
    if (typeof document === 'undefined') return;
    const presetCards = document.querySelectorAll(".share-preset-card");
    presetCards.forEach(c => {
      c.classList.toggle("active", c.dataset.design === shareState.designMode);
    });

    const customCard = document.getElementById("preset-card-custom");
    if (customCard) {
      customCard.classList.toggle("active", shareState.designMode === 'custom');
    }

    const statusBadge = document.getElementById("share-preset-status");
    if (statusBadge) {
      if (shareState.designMode === 'glass') {
        statusBadge.textContent = "Glass Box Active";
      } else if (shareState.designMode === 'classic') {
        statusBadge.textContent = "Design 1 Active";
      } else if (shareState.designMode === 'cinematic') {
        statusBadge.textContent = "Design 2 Active";
      } else if (shareState.designMode === 'kinetic') {
        statusBadge.textContent = "Design 3 Active";
      } else {
        statusBadge.textContent = "Custom Active";
      }
    }

    updateGlassOptionsUI();

    const btnExportVideo = document.getElementById("btn-share-export-video");
    if (btnExportVideo) {
      if (shareState.designMode === 'kinetic') {
        btnExportVideo.classList.add("btn-primary-gradient");
        btnExportVideo.classList.remove("btn-secondary-glass");
      } else {
        btnExportVideo.classList.remove("btn-primary-gradient");
        btnExportVideo.classList.add("btn-secondary-glass");
      }
    }
  }

  function updateGlassOptionsUI() {
    if (typeof document === 'undefined') return;
    const isLyrics = (shareState.cardContent !== 'art_track');
    const isVert = (shareState.format !== 'landscape');

    const btnL = document.getElementById("btn-content-lyrics-art");
    const btnA = document.getElementById("btn-content-art-track");
    if (btnL) btnL.classList.toggle("active", isLyrics);
    if (btnA) btnA.classList.toggle("active", !isLyrics);

    const btnV = document.getElementById("btn-orient-vertical");
    const btnH = document.getElementById("btn-orient-horizontal");
    if (btnV) btnV.classList.toggle("active", isVert);
    if (btnH) btnH.classList.toggle("active", !isVert);
  }

  /**
   * Synchronizes granular drawer controls (buttons, checkboxes) to match shareState
   */
  function syncCustomDrawerControlsFromState() {
    if (typeof document === 'undefined') return;
    // Ratio
    document.querySelectorAll(".share-ratio-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.ratio === shareState.format);
    });

    // Theme
    document.querySelectorAll(".share-theme-card").forEach(card => {
      card.classList.toggle("active", card.dataset.theme === shareState.theme);
    });

    // Translation
    document.querySelectorAll(".share-trans-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.trans === shareState.transMode);
    });

    // Font
    document.querySelectorAll(".share-font-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.font === shareState.fontFamily);
    });

    // Alignment
    document.querySelectorAll(".share-align-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.align === shareState.textAlign);
    });

    // Scale
    document.querySelectorAll(".share-scale-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.scale === shareState.fontScale);
    });

    // Toggles
    const toggleScrubber = document.getElementById("share-toggle-scrubber");
    if (toggleScrubber) toggleScrubber.checked = shareState.showScrubber;

    const toggleArt = document.getElementById("share-toggle-art");
    if (toggleArt) toggleArt.checked = shareState.showAlbumArt;

    const toggleTimestamp = document.getElementById("share-toggle-timestamp");
    if (toggleTimestamp) toggleTimestamp.checked = shareState.showTimestamp;

    const toggleWatermark = document.getElementById("share-toggle-watermark");
    if (toggleWatermark) toggleWatermark.checked = shareState.showWatermark;

    const toggleGrain = document.getElementById("share-toggle-grain");
    if (toggleGrain) toggleGrain.checked = shareState.showGrain;

    const toggle2x = document.getElementById("share-toggle-2x");
    if (toggle2x) toggle2x.checked = shareState.export2x;
  }

  /**
   * Renders live miniature previews on the preset cards using current song, artwork, and lyric
   */
  function renderPresetPreviews() {
    try {
      const previewGlass = document.getElementById("preset-preview-glass");
      if (previewGlass && typeof previewGlass.getContext === 'function') {
        const ctx0 = previewGlass.getContext('2d');
        if (ctx0) {
          ctx0.save();
          ctx0.scale(0.1, 0.1);
          const glassState = {
            ...shareState,
            ...SHARE_CARD_PRESETS.glass,
            format: 'story',
            export2x: false
          };
          renderCardContent(ctx0, 1080, 1920, glassState);
          ctx0.restore();
        }
      }
    } catch (e0) {
      console.warn("[ShareCard] Preview glass failed:", e0);
    }

    try {
      const previewClassic = document.getElementById("preset-preview-classic");
      if (previewClassic && typeof previewClassic.getContext === 'function') {
        const ctx1 = previewClassic.getContext('2d');
        if (ctx1) {
          ctx1.save();
          ctx1.scale(0.1, 0.1);
          const classicState = {
            ...shareState,
            ...SHARE_CARD_PRESETS.classic,
            format: 'story',
            export2x: false
          };
          renderCardContent(ctx1, 1080, 1920, classicState);
          ctx1.restore();
        }
      }
    } catch (e1) {
      console.warn("[ShareCard] Preview classic failed:", e1);
    }

    try {
      const previewCinematic = document.getElementById("preset-preview-cinematic");
      if (previewCinematic && typeof previewCinematic.getContext === 'function') {
        const ctx2 = previewCinematic.getContext('2d');
        if (ctx2) {
          ctx2.save();
          ctx2.scale(0.1, 0.1);
          const cinematicState = {
            ...shareState,
            ...SHARE_CARD_PRESETS.cinematic,
            format: 'story',
            export2x: false
          };
          renderCardContent(ctx2, 1080, 1920, cinematicState);
          ctx2.restore();
        }
      }
    } catch (e2) {
      console.warn("[ShareCard] Preview cinematic failed:", e2);
    }

    try {
      const previewKinetic = document.getElementById("preset-preview-kinetic");
      if (previewKinetic && typeof previewKinetic.getContext === 'function') {
        const ctx3 = previewKinetic.getContext('2d');
        if (ctx3) {
          ctx3.save();
          ctx3.scale(0.1, 0.1);
          const kineticState = {
            ...shareState,
            ...SHARE_CARD_PRESETS.kinetic,
            format: 'story',
            export2x: false
          };
          renderCardContent(ctx3, 1080, 1920, kineticState);
          ctx3.restore();
        }
      }
    } catch (e3) {
      console.warn("[ShareCard] Preview kinetic failed:", e3);
    }
  }

  let eventsBound = false;
  function bindModalEventsOnce() {
    if (eventsBound) return;
    eventsBound = true;

    // Preset cards
    const presetCards = document.querySelectorAll(".share-preset-card");
    presetCards.forEach(card => {
      card.addEventListener("click", () => {
        applyPreset(card.dataset.design || 'glass');
      });
    });

    // Readymade Static Glass Card Options (Card Content: Lyrics+Art vs Art+Track)
    const btnContentLyrics = document.getElementById("btn-content-lyrics-art");
    if (btnContentLyrics) {
      btnContentLyrics.addEventListener("click", () => {
        shareState.cardContent = 'lyrics_art';
        updateGlassOptionsUI();
        renderModalCanvas();
      });
    }
    const btnContentArtTrack = document.getElementById("btn-content-art-track");
    if (btnContentArtTrack) {
      btnContentArtTrack.addEventListener("click", () => {
        shareState.cardContent = 'art_track';
        updateGlassOptionsUI();
        renderModalCanvas();
      });
    }

    // Readymade Static Glass Card Options (Orientation: Vertical vs Horizontal)
    const btnOrientVertical = document.getElementById("btn-orient-vertical");
    if (btnOrientVertical) {
      btnOrientVertical.addEventListener("click", () => {
        shareState.format = 'story';
        updateGlassOptionsUI();
        updateRatioButtonsUI();
        renderModalCanvas();
      });
    }
    const btnOrientHorizontal = document.getElementById("btn-orient-horizontal");
    if (btnOrientHorizontal) {
      btnOrientHorizontal.addEventListener("click", () => {
        shareState.format = 'landscape';
        updateGlassOptionsUI();
        updateRatioButtonsUI();
        renderModalCanvas();
      });
    }

    // Custom mode card and independent chevron toggle
    const customCard = document.getElementById("preset-card-custom");
    if (customCard) {
      customCard.addEventListener("click", (e) => {
        if (e.target.closest(".share-custom-chevron-btn")) return;
        activateCustomMode();
      });
      customCard.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.target.closest(".share-custom-chevron-btn")) return;
          e.preventDefault();
          activateCustomMode();
        }
      });
    }

    const chevronBtn = document.getElementById("share-custom-chevron-btn") || document.querySelector(".share-custom-chevron-btn");
    if (chevronBtn) {
      chevronBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleCustomDrawerOnly();
      });
      chevronBtn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          toggleCustomDrawerOnly();
        }
      });
    }

    // Prevent nested scroll wheel trapping in #share-line-picker
    const linePicker = document.getElementById("share-line-picker");
    const scrollArea = document.getElementById("share-controls-scroll-area");
    if (linePicker && scrollArea) {
      linePicker.addEventListener("wheel", (e) => {
        const atTop = linePicker.scrollTop <= 0 && e.deltaY < 0;
        const atBottom = (linePicker.scrollTop + linePicker.clientHeight >= linePicker.scrollHeight - 1) && e.deltaY > 0;
        if (atTop || atBottom) {
          scrollArea.scrollTop += e.deltaY;
        }
      }, { passive: true });
    }

    // Close button
    const closeBtn = document.getElementById("share-modal-close");
    if (closeBtn) closeBtn.addEventListener("click", closeShareModal);

    // Coming soon overlay buttons
    const csCloseBtn = document.getElementById("btn-share-cs-close");
    if (csCloseBtn) csCloseBtn.addEventListener("click", closeShareModal);
    const csDismissBtn = document.getElementById("btn-share-cs-dismiss");
    if (csDismissBtn) csDismissBtn.addEventListener("click", closeShareModal);

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
        markCustomModeActive();
        ratioBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        shareState.format = btn.dataset.ratio || 'story';
        savedCustomConfig.format = shareState.format;
        renderModalCanvas();
      });
    });

    // Theme cards
    const themeCards = document.querySelectorAll(".share-theme-card");
    themeCards.forEach(card => {
      card.addEventListener("click", () => {
        markCustomModeActive();
        themeCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        shareState.userPickedTheme = true;
        shareState.theme = card.dataset.theme || 'mesh';
        savedCustomConfig.theme = shareState.theme;
        renderModalCanvas();
      });
    });

    // Translation mode buttons
    const transBtns = document.querySelectorAll(".share-trans-btn");
    transBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        markCustomModeActive();
        transBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        shareState.transMode = btn.dataset.trans || 'original';
        savedCustomConfig.transMode = shareState.transMode;
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
        markCustomModeActive();
        fontBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        shareState.fontFamily = btn.dataset.font || 'sans';
        savedCustomConfig.fontFamily = shareState.fontFamily;
        renderModalCanvas();
      });
    });

    // Checkbox toggles
    const toggleWatermark = document.getElementById("share-toggle-watermark");
    if (toggleWatermark) {
      toggleWatermark.addEventListener("change", (e) => {
        markCustomModeActive();
        shareState.showWatermark = e.target.checked;
        savedCustomConfig.showWatermark = shareState.showWatermark;
        renderModalCanvas();
      });
    }

    const toggleTimestamp = document.getElementById("share-toggle-timestamp");
    if (toggleTimestamp) {
      toggleTimestamp.addEventListener("change", (e) => {
        markCustomModeActive();
        shareState.showTimestamp = e.target.checked;
        savedCustomConfig.showTimestamp = shareState.showTimestamp;
        renderModalCanvas();
      });
    }

    const toggleArt = document.getElementById("share-toggle-art");
    if (toggleArt) {
      toggleArt.addEventListener("change", (e) => {
        markCustomModeActive();
        shareState.showAlbumArt = e.target.checked;
        savedCustomConfig.showAlbumArt = shareState.showAlbumArt;
        renderModalCanvas();
      });
    }

    const toggleScrubber = document.getElementById("share-toggle-scrubber");
    if (toggleScrubber) {
      toggleScrubber.addEventListener("change", (e) => {
        markCustomModeActive();
        shareState.showScrubber = e.target.checked;
        savedCustomConfig.showScrubber = shareState.showScrubber;
        renderModalCanvas();
      });
    }

    const toggleGrain = document.getElementById("share-toggle-grain");
    if (toggleGrain) {
      toggleGrain.addEventListener("change", (e) => {
        markCustomModeActive();
        shareState.showGrain = e.target.checked;
        savedCustomConfig.showGrain = shareState.showGrain;
        renderModalCanvas();
      });
    }

    const toggle2x = document.getElementById("share-toggle-2x");
    if (toggle2x) {
      toggle2x.addEventListener("change", (e) => {
        markCustomModeActive();
        shareState.export2x = e.target.checked;
        savedCustomConfig.export2x = shareState.export2x;
      });
    }

    // Alignment buttons
    const alignBtns = document.querySelectorAll(".share-align-btn");
    alignBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        markCustomModeActive();
        alignBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        shareState.textAlign = btn.dataset.align || 'center';
        savedCustomConfig.textAlign = shareState.textAlign;
        renderModalCanvas();
      });
    });

    // Font Scale buttons
    const scaleBtns = document.querySelectorAll(".share-scale-btn");
    scaleBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        markCustomModeActive();
        scaleBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        shareState.fontScale = btn.dataset.scale || 'normal';
        savedCustomConfig.fontScale = shareState.fontScale;
        renderModalCanvas();
      });
    });

    // Keyboard shortcuts inside modal: Ctrl+C (Copy), Ctrl+S (Download)
    window.addEventListener("keydown", (e) => {
      const modal = document.getElementById("share-card-modal");
      if (modal && modal.classList.contains("is-open")) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && !e.target.closest("input, textarea")) {
          e.preventDefault();
          copyCanvasToClipboard();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !e.target.closest("input, textarea")) {
          e.preventDefault();
          downloadCanvasAsPng();
        }
      }
    });

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

    // Export Video action
    const btnExportVideo = document.getElementById("btn-share-export-video");
    if (btnExportVideo) {
      btnExportVideo.addEventListener("click", () => {
        exportKineticStoryVideo();
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
   * Helper: Resolves CSS font stack with first-class Japanese typographic fallbacks
   */
  function getFontStack(family) {
    const JP_SANS = '"Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo"';
    const JP_SERIF = '"Shippori Mincho", "Yu Mincho", "Hiragino Mincho ProN"';
    switch (family) {
      case 'serif':
        return `"Playfair Display", ${JP_SERIF}, "Georgia", "Times New Roman", serif`;
      case 'mono':
        return `"JetBrains Mono", ${JP_SANS}, "Consolas", monospace`;
      case 'soft':
        return `"Poppins", "Nunito", "M PLUS Rounded 1c", "Outfit", ${JP_SANS}, sans-serif`;
      case 'sans':
      default:
        return `"Outfit", "Inter", -apple-system, BlinkMacSystemFont, ${JP_SANS}, "Segoe UI", sans-serif`;
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
        return { primary: sub, secondary: null, timeMs, originalIndex: i };
      } else if (transMode === 'bilingual' && sub && sub.toLowerCase() !== orig.toLowerCase()) {
        return { primary: orig, secondary: sub, timeMs, originalIndex: i };
      } else {
        return { primary: orig, secondary: null, timeMs, originalIndex: i };
      }
    }).filter(Boolean);
  }

  /**
   * Internal render orchestrator: draws background, format layout, and film grain overlay
   */
  function renderCardContent(ctx, width, height, state) {
    ctx.clearRect(0, 0, width, height);

    // Extract selected lyric lines with translation handling
    const formattedLines = getFormattedLyricsForShare(
      state.selectedIndices,
      state.cachedLyrics,
      state.transMode
    );

    if (formattedLines.length === 0) {
      formattedLines.push({ primary: "Music is what feelings sound like.", secondary: null, timeMs: 0, originalIndex: -1 });
    }

    if (state.designMode === 'kinetic' || state.theme === 'kinetic') {
      drawKineticStoryCard(ctx, width, height, formattedLines, state);
      return;
    }

    // Draw background based on theme
    drawThemeBackground(ctx, width, height, state.theme, state.albumImg, state.palette, state);

    if (state.theme === 'glass' || state.designMode === 'glass') {
      drawGlassBoxLayout(ctx, width, height, formattedLines, state);
      if (state.showGrain) {
        drawFilmGrain(ctx, width, height, 0.035);
      }
      return;
    }

    // Draw format layout
    switch (state.format) {
      case 'square':
        drawSquareLayout(ctx, width, height, formattedLines, state);
        break;
      case 'portrait':
        drawPortraitLayout(ctx, width, height, formattedLines, state);
        break;
      case 'landscape':
        drawLandscapeLayout(ctx, width, height, formattedLines, state);
        break;
      case 'story':
      default:
        drawStoryLayout(ctx, width, height, formattedLines, state);
        break;
    }

    // Optional analog film grain overlay for authentic tactile print texture
    if (state.showGrain) {
      drawFilmGrain(ctx, width, height, 0.045);
    }
  }

  /**
   * Renders the interactive preview canvas according to shareState
   */
  function renderModalCanvas() {
    const canvas = document.getElementById("share-card-canvas");
    if (!canvas || typeof canvas.getContext !== 'function') return;

    const { width, height } = getCardDimensions(shareState.format);
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderCardContent(ctx, width, height, shareState);
    renderPresetPreviews();
  }

  /**
   * Resolves the export canvas: renders at 2x Retina 4K resolution when export2x is enabled
   */
  function getExportCanvas() {
    const previewCanvas = document.getElementById("share-card-canvas");
    if (!previewCanvas) return null;
    if (!shareState.export2x) return previewCanvas;

    try {
      const exportCanvas = document.createElement('canvas');
      const { width, height } = getCardDimensions(shareState.format);
      exportCanvas.width = width * 2;
      exportCanvas.height = height * 2;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return previewCanvas;

      ctx.scale(2, 2);
      renderCardContent(ctx, width, height, shareState);
      return exportCanvas;
    } catch (e) {
      console.warn("[ShareCard] 2x canvas export failed, falling back to 1x:", e);
      return previewCanvas;
    }
  }

  let _grainPatternCanvas = null;
  function getGrainPattern() {
    if (_grainPatternCanvas) return _grainPatternCanvas;
    if (typeof document === 'undefined') return null;
    try {
      const size = 128;
      const pCanvas = document.createElement('canvas');
      if (!pCanvas || typeof pCanvas.getContext !== 'function') return null;
      pCanvas.width = size;
      pCanvas.height = size;
      const pCtx = pCanvas.getContext('2d');
      if (!pCtx || typeof pCtx.createImageData !== 'function') return null;
      const imgData = pCtx.createImageData(size, size);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const val = Math.floor(Math.random() * 255);
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 255;
      }
      pCtx.putImageData(imgData, 0, 0);
      _grainPatternCanvas = pCanvas;
      return _grainPatternCanvas;
    } catch (e) {
      return null;
    }
  }

  /**
   * Overlays tactile analog film grain texture across the canvas
   */
  function drawFilmGrain(ctx, w, h, opacity = 0.045) {
    if (!ctx || typeof ctx.fillRect !== 'function') return;
    try {
      const pCanvas = getGrainPattern();
      if (!pCanvas) return;
      ctx.save();
      if (typeof ctx.createPattern === 'function') {
        const pattern = ctx.createPattern(pCanvas, 'repeat');
        if (pattern) {
          ctx.globalAlpha = opacity;
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, w, h);
        }
      }
      ctx.restore();
    } catch (e) {
      // Ignore pattern rendering error in test or restricted canvas contexts
    }
  }

  /**
   * Robust color string parser: accepts #RGB, #RGBA, #RRGGBB, #RRGGBBAA,
   * rgb(r, g, b), rgba(r, g, b, a), and { r, g, b } objects.
   * Ensures authentic album palette colors originating from --accent-primary
   * are ingested accurately without falling back to Spotify green.
   */
  function hexToRgbObj(colorStr) {
    if (!colorStr) return { r: 29, g: 185, b: 84 };
    if (typeof colorStr === 'object' && colorStr !== null && 'r' in colorStr && 'g' in colorStr && 'b' in colorStr) {
      return {
        r: Math.min(255, Math.max(0, Math.round(Number(colorStr.r) || 0))),
        g: Math.min(255, Math.max(0, Math.round(Number(colorStr.g) || 0))),
        b: Math.min(255, Math.max(0, Math.round(Number(colorStr.b) || 0)))
      };
    }
    if (typeof colorStr !== 'string') return { r: 29, g: 185, b: 84 };

    const str = colorStr.trim().toLowerCase();

    // Match rgb(...) or rgba(...) with optional alpha and whitespace/comma separation
    const rgbMatch = str.match(/^rgba?\(\s*([0-9.]+%?)\s*(?:,|\s+)\s*([0-9.]+%?)\s*(?:,|\s+)\s*([0-9.]+%?)(?:(?:\s*[,/]\s*([0-9.]+%?))?\s*\))?$/);
    if (rgbMatch) {
      const parseVal = (v) => {
        if (!v) return 0;
        if (v.endsWith('%')) {
          return Math.round((parseFloat(v) / 100) * 255);
        }
        return Math.round(parseFloat(v));
      };
      const r = Math.min(255, Math.max(0, parseVal(rgbMatch[1]) || 0));
      const g = Math.min(255, Math.max(0, parseVal(rgbMatch[2]) || 0));
      const b = Math.min(255, Math.max(0, parseVal(rgbMatch[3]) || 0));
      return { r, g, b };
    }

    // Match hex format (#RGB, #RGBA, #RRGGBB, #RRGGBBAA or without #)
    let h = str.replace(/^#/, '').trim();
    if (/^[0-9a-f]{3,8}$/.test(h)) {
      if (h.length === 3 || h.length === 4) {
        const r = parseInt(h[0] + h[0], 16);
        const g = parseInt(h[1] + h[1], 16);
        const b = parseInt(h[2] + h[2], 16);
        return { r, g, b };
      }
      if (h.length >= 6) {
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return { r, g, b };
      }
    }

    return { r: 29, g: 185, b: 84 };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  /**
   * Harmonic Palette Normalizer: clamps saturation to editorial levels (18%-35%),
   * creates deep tinted neutral charcoal, and generates an ambient lighting atmosphere.
   */
  function normalizeHarmonicPalette(palette) {
    const rawList = Array.isArray(palette) && palette.length > 0
      ? palette
      : ['#1DB954', '#8b5cf6', '#3b82f6', '#f43f5e'];

    const parsed = rawList.map(item => {
      if (typeof item === 'string') return hexToRgbObj(item);
      if (item && typeof item === 'object' && 'r' in item) return item;
      return { r: 29, g: 185, b: 84 };
    });

    const hslList = parsed.map(c => rgbToHsl(c.r, c.g, c.b));
    const dom = hslList[0] || { h: 141, s: 73, l: 42 };

    const darkNeutral = `hsla(${dom.h}, ${Math.min(10, dom.s)}%, 4%, 1)`;
    const ambientH = dom.h;
    const ambientS = Math.min(35, Math.max(18, Math.round(dom.s * 0.45)));
    const ambientL = 22;

    const sec = hslList[1] || dom;
    const secH = sec.h;
    const secS = Math.min(28, Math.max(14, Math.round(sec.s * 0.4)));
    const secL = 18;

    const accent = `hsla(${dom.h}, ${Math.min(65, dom.s)}%, ${Math.min(56, Math.max(42, dom.l))}%, 1)`;

    return {
      darkNeutral,
      ambientHue: ambientH,
      ambientSat: ambientS,
      ambientLight: ambientL,
      secHue: secH,
      secSat: secS,
      secLight: secL,
      accent,
      captionMuted: 'rgba(240, 240, 245, 0.60)',
      primaryWhite: '#f4f4f6'
    };
  }

  /**
   * Analyzes album artwork composition to detect subject placement, visual density,
   * luminance distribution, and optimal negative space / quiet reading zone.
   * Runs in sub-millisecond time on a 16x16 offscreen canvas.
   */
  function analyzeArtworkComposition(img) {
    if (!img || !img.complete || !img.naturalWidth || img.naturalWidth <= 0) {
      return {
        focalZone: 'balanced',
        quietZone: 'center',
        leftVar: 0,
        rightVar: 0,
        leftLum: 0.1,
        rightLum: 0.1,
        avgBrightness: 0.1,
        hasSubject: false
      };
    }

    try {
      const offCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (!offCanvas) {
        return { focalZone: 'balanced', quietZone: 'center', avgBrightness: 0.1, hasSubject: false };
      }
      offCanvas.width = 16;
      offCanvas.height = 16;
      const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
      if (!offCtx) {
        return { focalZone: 'balanced', quietZone: 'center', avgBrightness: 0.1, hasSubject: false };
      }

      offCtx.drawImage(img, 0, 0, 16, 16);
      const imgData = offCtx.getImageData(0, 0, 16, 16);
      const d = imgData.data;

      let leftLums = [];
      let rightLums = [];
      let topLums = [];
      let bottomLums = [];
      let centerLums = [];
      let totalLum = 0;

      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const idx = (y * 16 + x) * 4;
          const r = d[idx];
          const g = d[idx + 1];
          const b = d[idx + 2];
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          totalLum += lum;

          if (x < 8) leftLums.push(lum);
          else rightLums.push(lum);

          if (y < 8) topLums.push(lum);
          else bottomLums.push(lum);

          if (x >= 4 && x < 12 && y >= 4 && y < 12) {
            centerLums.push(lum);
          }
        }
      }

      const calcStats = (arr) => {
        if (!arr.length) return { mean: 0, variance: 0 };
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
        return { mean, variance };
      };

      const left = calcStats(leftLums);
      const right = calcStats(rightLums);
      const top = calcStats(topLums);
      const bottom = calcStats(bottomLums);
      const center = calcStats(centerLums);
      const avgBrightness = totalLum / 256;

      let focalZone = 'balanced';
      let quietZone = 'center';
      let hasSubject = false;

      // Subject detection based on contrast variance threshold
      const varianceThreshold = 0.012;
      if (left.variance > right.variance * 1.25 && left.variance > varianceThreshold) {
        focalZone = 'left';
        quietZone = 'right';
        hasSubject = true;
      } else if (right.variance > left.variance * 1.25 && right.variance > varianceThreshold) {
        focalZone = 'right';
        quietZone = 'left';
        hasSubject = true;
      } else if (center.variance > Math.max(left.variance, right.variance) * 1.20 && center.variance > varianceThreshold) {
        focalZone = 'center';
        quietZone = top.variance < bottom.variance ? 'top' : 'bottom';
        hasSubject = true;
      } else {
        if (left.variance < right.variance * 0.85) {
          quietZone = 'left';
        } else if (right.variance < left.variance * 0.85) {
          quietZone = 'right';
        } else if (top.variance < bottom.variance) {
          quietZone = 'top';
        } else {
          quietZone = 'center';
        }
      }

      return {
        focalZone,
        quietZone,
        leftVar: left.variance,
        rightVar: right.variance,
        leftLum: left.mean,
        rightLum: right.mean,
        avgBrightness,
        hasSubject
      };
    } catch (e) {
      return { focalZone: 'balanced', quietZone: 'center', avgBrightness: 0.1, hasSubject: false };
    }
  }

  /**
   * Draw themes: classic (Design 1), cinematic (Design 2), mesh, obsidian, vinyl, glass, aurora, editorial, cyberpunk, cassette, bloom, sunset
   */
  function drawThemeBackground(ctx, w, h, theme, img, palette, state = null) {
    if (theme && typeof theme === 'object' && 'theme' in theme) {
      state = theme;
      theme = state.theme;
      img = state.albumImg;
      palette = state.palette;
    }
    const harmonic = normalizeHarmonicPalette(palette);
    const p1 = palette[0] || '#1DB954';
    const p2 = palette[1] || '#8b5cf6';
    const p3 = palette[2] || '#3b82f6';
    const p4 = palette[3] || '#f43f5e';

    if (theme === 'classic') {
      // Design 1: Minimal Editorial Poster (Velvet Charcoal + Atmospheric Tonal Wash + Refined Publication Header)
      ctx.fillStyle = harmonic.darkNeutral;
      ctx.fillRect(0, 0, w, h);

      // Directional diffuse atmospheric lighting wash derived from authentic album artwork tones
      const aura = ctx.createRadialGradient(w * 0.38, h * 0.18, 60, w * 0.46, h * 0.26, w * 0.90);
      aura.addColorStop(0, `hsla(${harmonic.ambientHue}, ${harmonic.ambientSat}%, ${harmonic.ambientLight}%, 0.26)`);
      aura.addColorStop(0.55, `hsla(${harmonic.secHue}, ${harmonic.secSat}%, ${harmonic.secLight}%, 0.08)`);
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, w, h);

      // Subtle natural top-to-bottom light falloff
      const linearWash = ctx.createLinearGradient(0, 0, 0, h);
      linearWash.addColorStop(0, 'rgba(255, 255, 255, 0.015)');
      linearWash.addColorStop(0.6, 'transparent');
      linearWash.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.fillStyle = linearWash;
      ctx.fillRect(0, 0, w, h);

      // Editorial Header: Authentic publication metadata & refined catalog notation
      const margin = Math.min(80, w * 0.075);
      const topY = 74;
      ctx.save();
      ctx.font = '600 10px "Outfit", "Inter", -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(244, 244, 246, 0.44)';
      ctx.textAlign = 'left';

      const artist = (state && state.artistName) ? String(state.artistName).trim() : '';
      const track = (state && state.trackTitle) ? String(state.trackTitle).trim() : '';
      const durationMs = state ? (state.trackDurationMs || 0) : 0;

      const leftLabel = artist
        ? `RELEASE // ${truncateText(ctx, artist.toUpperCase(), (w - margin * 2) * 0.52)}`
        : 'EDITORIAL // ARCHIVE EDITION';
      ctx.fillText(leftLabel, margin, topY);

      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(244, 244, 246, 0.36)';
      const rightLabel = track
        ? truncateText(ctx, `${track.toUpperCase()}${durationMs > 0 ? ` • ${formatLyricTimestamp(durationMs)}` : ''}`, (w - margin * 2) * 0.42)
        : 'SELECTED LYRIC EDITION';
      ctx.fillText(rightLabel, w - margin, topY);

      // Hairline rule under header
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, topY + 12);
      ctx.lineTo(w - margin, topY + 12);
      ctx.stroke();
      ctx.restore();

      // Fine premium 1px hairline border around canvas
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, w - 2, h - 2);

    } else if (theme === 'cinematic') {
      // Design 2: Frosted Photographic Grading with Focal-Aware Intelligent Cropping & Directional Scrim
      const comp = analyzeArtworkComposition(img);

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        // Photographic color grade: moderate softening (frosted photograph), rich contrast, restrained saturation — NO heavy blur!
        ctx.filter = 'blur(3px) contrast(1.14) brightness(0.60) saturate(1.10)';
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const targetRatio = w / h;
        let dw, dh, dx, dy;
        if (imgRatio > targetRatio) {
          dh = h + 24;
          dw = dh * imgRatio;
          // Focal-aware horizontal cropping: shift frame towards subject
          if (comp.focalZone === 'left') {
            dx = (w - dw) * 0.22;
          } else if (comp.focalZone === 'right') {
            dx = (w - dw) * 0.78;
          } else {
            dx = (w - dw) * 0.50;
          }
          dy = -12;
        } else {
          dw = w + 24;
          dh = dw / imgRatio;
          dx = -12;
          // Focal-aware vertical cropping: shift frame towards subject
          if (comp.quietZone === 'bottom') {
            dy = (h - dh) * 0.20;
          } else if (comp.quietZone === 'top') {
            dy = (h - dh) * 0.80;
          } else {
            dy = (h - dh) * 0.50;
          }
        }
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      } else {
        ctx.fillStyle = harmonic.darkNeutral;
        ctx.fillRect(0, 0, w, h);

        const rad = ctx.createRadialGradient(w * 0.5, h * 0.35, 60, w * 0.5, h * 0.45, w * 0.85);
        rad.addColorStop(0, `hsla(${harmonic.ambientHue}, ${harmonic.ambientSat}%, ${harmonic.ambientLight}%, 0.38)`);
        rad.addColorStop(0.6, `hsla(${harmonic.secHue}, ${harmonic.secSat}%, ${harmonic.secLight}%, 0.16)`);
        rad.addColorStop(1, '#05070e');
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);
      }

      // Localized Directional Reading-Zone Scrim:
      // Darkens ONLY the quiet zone where the lyric sits, leaving the subject crisp & vibrant!
      ctx.save();
      if (comp.quietZone === 'right') {
        const rightScrim = ctx.createLinearGradient(w * 0.32, 0, w, 0);
        rightScrim.addColorStop(0, 'transparent');
        rightScrim.addColorStop(0.45, 'rgba(8, 9, 12, 0.48)');
        rightScrim.addColorStop(1, 'rgba(8, 9, 12, 0.88)');
        ctx.fillStyle = rightScrim;
        ctx.fillRect(w * 0.32, 0, w * 0.68, h);
      } else if (comp.quietZone === 'left') {
        const leftScrim = ctx.createLinearGradient(0, 0, w * 0.68, 0);
        leftScrim.addColorStop(0, 'rgba(8, 9, 12, 0.88)');
        leftScrim.addColorStop(0.55, 'rgba(8, 9, 12, 0.48)');
        leftScrim.addColorStop(1, 'transparent');
        ctx.fillStyle = leftScrim;
        ctx.fillRect(0, 0, w * 0.68, h);
      } else if (comp.quietZone === 'top') {
        const topScrim = ctx.createLinearGradient(0, 0, 0, h * 0.55);
        topScrim.addColorStop(0, 'rgba(8, 9, 12, 0.82)');
        topScrim.addColorStop(0.65, 'rgba(8, 9, 12, 0.38)');
        topScrim.addColorStop(1, 'transparent');
        ctx.fillStyle = topScrim;
        ctx.fillRect(0, 0, w, h * 0.55);
      } else {
        // Balanced / Center scrim
        const centerScrim = ctx.createRadialGradient(w / 2, h * 0.40, 50, w / 2, h * 0.40, w * 0.68);
        centerScrim.addColorStop(0, 'rgba(8, 9, 12, 0.68)');
        centerScrim.addColorStop(0.70, 'rgba(8, 9, 12, 0.28)');
        centerScrim.addColorStop(1, 'transparent');
        ctx.fillStyle = centerScrim;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();

      // Seamless natural floor scrim only in the bottom 20% for the metadata colophon
      const floorScrim = ctx.createLinearGradient(0, h * 0.80, 0, h);
      floorScrim.addColorStop(0, 'transparent');
      floorScrim.addColorStop(0.45, 'rgba(0, 0, 0, 0.45)');
      floorScrim.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
      ctx.fillStyle = floorScrim;
      ctx.fillRect(0, h * 0.80, w, h * 0.20);

      // Subtle perimeter vignette (darkening corners organically)
      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.max(w, h) * 0.80);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(0.70, 'rgba(0, 0, 0, 0.20)');
      vig.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      // Fine premium 1px hairline border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, w - 2, h - 2);

    } else if (theme === 'mesh') {
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
      // Aesthetic deep blurred album art background with cinematic contrast
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.filter = 'blur(48px) brightness(0.38) saturate(1.45) contrast(1.08)';
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const targetRatio = w / h;
        let dw, dh, dx, dy;
        if (imgRatio > targetRatio) {
          dh = h + 180;
          dw = dh * imgRatio;
          dx = (w - dw) / 2;
          dy = -90;
        } else {
          dw = w + 180;
          dh = dw / imgRatio;
          dx = -90;
          dy = (h - dh) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();

        // Subtle gradient vignette from bottom to anchor the canvas
        const vig = ctx.createLinearGradient(0, h * 0.55, 0, h);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0, 0, 0, 0.48)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = harmonic.darkNeutral || '#090a10';
        ctx.fillRect(0, 0, w, h);
        const rad = ctx.createRadialGradient(w * 0.5, h * 0.35, 60, w * 0.5, h * 0.45, w * 0.85);
        rad.addColorStop(0, `hsla(${harmonic.ambientHue}, ${harmonic.ambientSat}%, ${harmonic.ambientLight}%, 0.45)`);
        rad.addColorStop(1, '#05070e');
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);
      }

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

    } else if (theme === 'cassette') {
      // Vintage Cassette J-Card Lyric Booklet Sleeve
      ctx.fillStyle = '#141316';
      ctx.fillRect(0, 0, w, h);

      // Cream J-Card paper insert
      const cardMargin = Math.min(54, w * 0.05);
      const cardW = w - cardMargin * 2;
      const cardH = h - cardMargin * 2;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 16;
      ctx.fillStyle = '#fbf8f1';
      drawRoundedRect(ctx, cardMargin, cardMargin, cardW, cardH, 26);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Fine card border
      ctx.strokeStyle = '#e7e0d3';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, cardMargin, cardMargin, cardW, cardH, 26);
      ctx.stroke();

      // Top Vintage Header Strip
      const stripH = 46;
      ctx.fillStyle = p1;
      drawRoundedRect(ctx, cardMargin + 16, cardMargin + 16, cardW - 32, stripH, 12);
      ctx.fill();

      // Header Text inside strip
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 20px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SIDE A • HI-FI STEREO', cardMargin + 34, cardMargin + 46);

      ctx.font = '700 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('DOLBY B-NR / TYPE I', cardMargin + cardW - 34, cardMargin + 46);

      // Subtle cassette ribbon accent bar above bottom pill
      const ribbonY = h - cardMargin - 210;
      ctx.fillStyle = 'rgba(180, 150, 120, 0.2)';
      drawRoundedRect(ctx, cardMargin + 40, ribbonY, cardW - 80, 6, 3);
      ctx.fill();

      ctx.restore();

    } else if (theme === 'bloom') {
      // Apple Fluid Bloom - ethereal glowing fluid atmosphere
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.filter = 'blur(75px) brightness(0.48) saturate(2.2)';
        ctx.drawImage(img, -150, -150, w + 300, h + 300);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0a0d18';
        ctx.fillRect(0, 0, w, h);

        const b1 = ctx.createRadialGradient(w * 0.2, h * 0.2, 80, w * 0.3, h * 0.3, w * 0.8);
        b1.addColorStop(0, hexToRgba(p1, 0.75));
        b1.addColorStop(1, 'transparent');
        ctx.fillStyle = b1;
        ctx.fillRect(0, 0, w, h);

        const b2 = ctx.createRadialGradient(w * 0.8, h * 0.7, 80, w * 0.7, h * 0.6, w * 0.8);
        b2.addColorStop(0, hexToRgba(p2, 0.7));
        b2.addColorStop(1, 'transparent');
        ctx.fillStyle = b2;
        ctx.fillRect(0, 0, w, h);
      }

      // Specular sheen card container
      const margin = Math.min(60, w * 0.06);
      const cardW = w - margin * 2;
      const cardH = h - margin * 2;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, margin, margin, cardW, cardH, 40);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

    } else if (theme === 'sunset') {
      // Luxury Sunset Glow: Twilight Navy -> Plum -> Vivid Magenta -> Coral Fire -> Golden Horizon
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#090716');
      grad.addColorStop(0.28, '#1d0e38');
      grad.addColorStop(0.56, '#561352');
      grad.addColorStop(0.82, '#c22d26');
      grad.addColorStop(0.94, '#e96d1f');
      grad.addColorStop(1, '#fba43a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Soft bokeh glowing embers
      ctx.save();
      const bokeh = [
        { x: w * 0.2, y: h * 0.88, r: 140, o: 0.2 },
        { x: w * 0.65, y: h * 0.92, r: 200, o: 0.16 },
        { x: w * 0.88, y: h * 0.84, r: 120, o: 0.22 }
      ];
      bokeh.forEach(b => {
        const bg = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.r);
        bg.addColorStop(0, `rgba(255, 240, 200, ${b.o})`);
        bg.addColorStop(1, 'transparent');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
      });

      // Central contrast scrim for 100% crystal clear lyrics
      const centerScrim = ctx.createRadialGradient(w / 2, h * 0.44, 80, w / 2, h * 0.44, w * 0.75);
      centerScrim.addColorStop(0, 'rgba(9, 7, 22, 0.25)');
      centerScrim.addColorStop(1, 'rgba(9, 7, 22, 0.65)');
      ctx.fillStyle = centerScrim;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
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
   * Helper: Renders the frosted glass container box with specular highlight and ambient depth
   * Directly replicates the frosted glass aesthetic from breaking-the-habit reference.
   */
  function drawGlassContainer(ctx, x, y, width, height, radius) {
    ctx.save();

    // 1. Ambient drop shadow (deep and soft)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 18;

    // 2. Glass backdrop fill (frosted translucent)
    const grad = ctx.createLinearGradient(x, y, x, y + height);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.09)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

    ctx.fillStyle = grad;
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fill();

    // Subtle dark tinted layer to guarantee high contrast against bright highlights
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(18, 20, 26, 0.32)';
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fill();

    // 3. Specular hairline border (crisp frosted edge)
    const strokeGrad = ctx.createLinearGradient(x, y, x, y + height);
    strokeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    strokeGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
    strokeGrad.addColorStop(1, 'rgba(255, 255, 255, 0.06)');

    ctx.strokeStyle = strokeGrad;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Glass Box Layout Generator
   * Replicates breaking-the-habit reference with two content modes (Lyrics+Art vs Art+Track)
   * and responsive adaptations for both Horizontal (16:9) and Vertical (9:16).
   */
  function drawGlassBoxLayout(ctx, w, h, lines, state) {
    const isHorizontal = state.format === 'landscape' || (w > h);
    const contentMode = state.cardContent || 'lyrics_art'; // 'lyrics_art' | 'art_track'
    const img = state.albumImg;
    const fontStack = getFontStack(state.fontFamily || 'sans');
    const trackTitle = (state.trackTitle || 'LyricFlow').trim();
    const artistName = (state.artistName || 'Unknown Artist').trim();
    const progressMs = state.currentProgressMs || 0;
    const durationMs = state.trackDurationMs || 0;

    if (contentMode === 'art_track') {
      // Option 1: Prominent Album Artwork + Song Name + Artist (Track Spotlight)
      if (isHorizontal) {
        // Horizontal 16:9 Glass Box (Two-column layout)
        const boxW = Math.round(w * 0.74);
        const boxH = Math.round(Math.min(h * 0.74, 620));
        const boxX = Math.round((w - boxW) / 2);
        const boxY = Math.round((h - boxH) / 2);
        const radius = 40;
        const pad = Math.round(boxH * 0.10);

        drawGlassContainer(ctx, boxX, boxY, boxW, boxH, radius);

        const artSize = boxH - pad * 2;
        const artX = boxX + pad;
        const artY = boxY + pad;
        const artRadius = 24;

        // Draw Hero Album Artwork
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          drawRoundedRect(ctx, artX, artY, artSize, artSize, artRadius);
          ctx.clip();
          ctx.drawImage(img, artX, artY, artSize, artSize);
          ctx.restore();

          // Artwork border
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1.5;
          drawRoundedRect(ctx, artX, artY, artSize, artSize, artRadius);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          drawRoundedRect(ctx, artX, artY, artSize, artSize, artRadius);
          ctx.fill();
          ctx.restore();
        }

        // Right Column: Track Details
        const rightX = artX + artSize + Math.round(pad * 0.85);
        const rightW = boxX + boxW - pad - rightX;
        const centerY = boxY + boxH / 2;

        ctx.save();
        ctx.textAlign = 'left';

        // Badge: NOW PLAYING
        ctx.font = '650 13px ' + fontStack;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.50)';
        ctx.fillText('NOW PLAYING', rightX, centerY - 64);

        // Song Title
        ctx.font = '700 40px ' + fontStack;
        ctx.fillStyle = '#ffffff';
        const displayTitle = truncateText(ctx, trackTitle, rightW);
        ctx.fillText(displayTitle, rightX, centerY - 14);

        // Artist Name
        ctx.font = '600 24px ' + fontStack;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        const displayArtist = truncateText(ctx, artistName, rightW);
        ctx.fillText(displayArtist, rightX, centerY + 28);

        // Scrubber bar if enabled
        if (state.showScrubber !== false && durationMs > 0) {
          drawScrubberBar(ctx, rightX, centerY + 68, rightW, progressMs, durationMs, false);
        }

        // Colophon
        if (state.showWatermark !== false) {
          ctx.font = '500 13px ' + fontStack;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText('LYRICFLOW', rightX, boxY + boxH - pad + 8);
        }

        ctx.restore();

      } else {
        // Vertical 9:16 Glass Box (Centered Column)
        const boxW = Math.round(w * 0.84);
        const pad = Math.round(boxW * 0.08);
        const innerW = boxW - pad * 2;
        const artSize = innerW;
        const artRadius = 28;

        const titleFontSize = 36;
        const artistFontSize = 22;
        const titleH = titleFontSize * 1.25;
        const artistH = artistFontSize * 1.25;
        const scrubberH = (state.showScrubber !== false && durationMs > 0) ? 36 : 0;
        const gap = 24;

        const contentH = artSize + gap + titleH + 8 + artistH + (scrubberH ? (gap + scrubberH) : 0);
        const boxH = contentH + pad * 2;
        const boxX = Math.round((w - boxW) / 2);
        const boxY = Math.round((h - boxH) / 2);
        const radius = 48;

        drawGlassContainer(ctx, boxX, boxY, boxW, boxH, radius);

        // Hero Album Artwork
        const artX = boxX + pad;
        const artY = boxY + pad;

        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          drawRoundedRect(ctx, artX, artY, artSize, artSize, artRadius);
          ctx.clip();
          ctx.drawImage(img, artX, artY, artSize, artSize);
          ctx.restore();

          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
          ctx.lineWidth = 1.5;
          drawRoundedRect(ctx, artX, artY, artSize, artSize, artRadius);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          drawRoundedRect(ctx, artX, artY, artSize, artSize, artRadius);
          ctx.fill();
          ctx.restore();
        }

        // Details below Artwork
        const textY = artY + artSize + gap;
        ctx.save();
        ctx.textAlign = 'left';

        // Song Title
        ctx.font = '700 ' + titleFontSize + 'px ' + fontStack;
        ctx.fillStyle = '#ffffff';
        const displayTitle = truncateText(ctx, trackTitle, innerW);
        ctx.fillText(displayTitle, artX, textY + titleFontSize * 0.85);

        // Artist Name
        ctx.font = '600 ' + artistFontSize + 'px ' + fontStack;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        const displayArtist = truncateText(ctx, artistName, innerW);
        ctx.fillText(displayArtist, artX, textY + titleH + 8 + artistFontSize * 0.85);

        // Scrubber bar
        if (state.showScrubber !== false && durationMs > 0) {
          drawScrubberBar(ctx, artX, textY + titleH + 8 + artistH + gap, innerW, progressMs, durationMs, false);
        }

        ctx.restore();
      }

    } else {
      // Option 2: Lyrics + Album Art Thumbnail (Exact replicate of breaking-the-habit.png)
      if (isHorizontal) {
        // Horizontal 16:9 Glass Box (Wide lyric card)
        const boxW = Math.round(w * 0.74);
        const boxX = Math.round((w - boxW) / 2);
        const pad = Math.round(boxW * 0.05);
        const innerW = boxW - pad * 2;

        const fontSize = 42;
        const lineHeight = Math.round(fontSize * 1.34);
        ctx.font = '700 ' + fontSize + 'px ' + fontStack;

        const wrappedLines = [];
        lines.forEach(item => {
          const wraps = wrapText(ctx, item.primary, innerW);
          wraps.forEach(wLine => wrappedLines.push(wLine));
        });

        const lyricsH = wrappedLines.length * lineHeight;
        const thumbSize = 64;
        const gap = 44;
        const contentH = lyricsH + gap + thumbSize;
        const boxH = Math.min(h * 0.84, contentH + pad * 2);
        const boxY = Math.round((h - boxH) / 2);
        const radius = 44;

        drawGlassContainer(ctx, boxX, boxY, boxW, boxH, radius);

        // Draw Lyrics (Left aligned, bold white)
        ctx.save();
        ctx.font = '700 ' + fontSize + 'px ' + fontStack;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        let lineY = boxY + pad + Math.round(fontSize * 0.85);
        wrappedLines.forEach(l => {
          ctx.fillText(l, boxX + pad, lineY);
          lineY += lineHeight;
        });

        // Bottom Metadata Row: Thumbnail + Title + Artist
        const metaY = boxY + pad + lyricsH + gap;
        const thumbX = boxX + pad;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          drawRoundedRect(ctx, thumbX, metaY, thumbSize, thumbSize, 16);
          ctx.clip();
          ctx.drawImage(img, thumbX, metaY, thumbSize, thumbSize);
          ctx.restore();

          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
          ctx.lineWidth = 1;
          drawRoundedRect(ctx, thumbX, metaY, thumbSize, thumbSize, 16);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          drawRoundedRect(ctx, thumbX, metaY, thumbSize, thumbSize, 16);
          ctx.fill();
          ctx.restore();
        }

        const textX = thumbX + thumbSize + 18;
        const titleW = innerW - thumbSize - 18;
        ctx.font = '700 22px ' + fontStack;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(truncateText(ctx, trackTitle, titleW), textX, metaY + 26);

        ctx.font = '600 15px ' + fontStack;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
        ctx.fillText(truncateText(ctx, artistName.toUpperCase(), titleW), textX, metaY + 50);

        ctx.restore();

      } else {
        // Vertical 9:16 Glass Box (EXACT match to breaking-the-habit.png)
        const boxW = Math.round(w * 0.86);
        const boxX = Math.round((w - boxW) / 2);
        const pad = Math.round(boxW * 0.07);
        const innerW = boxW - pad * 2;

        let fontSize = 48;
        if (lines.length > 5) fontSize = 38;
        else if (lines.length > 3) fontSize = 44;
        const lineHeight = Math.round(fontSize * 1.34);

        ctx.font = '700 ' + fontSize + 'px ' + fontStack;
        const wrappedLines = [];
        lines.forEach(item => {
          const wraps = wrapText(ctx, item.primary, innerW);
          wraps.forEach(wLine => wrappedLines.push(wLine));
        });

        const lyricsH = wrappedLines.length * lineHeight;
        const thumbSize = 64;
        const gap = 52;
        const contentH = lyricsH + gap + thumbSize;
        const boxH = contentH + pad * 2;
        const boxY = Math.round((h - boxH) / 2);
        const radius = 48;

        drawGlassContainer(ctx, boxX, boxY, boxW, boxH, radius);

        // Draw Lyrics (Left aligned, bold white)
        ctx.save();
        ctx.font = '700 ' + fontSize + 'px ' + fontStack;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        let lineY = boxY + pad + Math.round(fontSize * 0.85);
        wrappedLines.forEach(l => {
          ctx.fillText(l, boxX + pad, lineY);
          lineY += lineHeight;
        });

        // Bottom Metadata Row: Thumbnail + Title + Artist
        const metaY = boxY + pad + lyricsH + gap;
        const thumbX = boxX + pad;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          drawRoundedRect(ctx, thumbX, metaY, thumbSize, thumbSize, 16);
          ctx.clip();
          ctx.drawImage(img, thumbX, metaY, thumbSize, thumbSize);
          ctx.restore();

          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
          ctx.lineWidth = 1;
          drawRoundedRect(ctx, thumbX, metaY, thumbSize, thumbSize, 16);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          drawRoundedRect(ctx, thumbX, metaY, thumbSize, thumbSize, 16);
          ctx.fill();
          ctx.restore();
        }

        const textX = thumbX + thumbSize + 18;
        const titleW = innerW - thumbSize - 18;
        ctx.font = '700 22px ' + fontStack;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(truncateText(ctx, trackTitle, titleW), textX, metaY + 26);

        ctx.font = '600 15px ' + fontStack;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
        ctx.fillText(truncateText(ctx, artistName.toUpperCase(), titleW), textX, metaY + 50);

        ctx.restore();
      }
    }
  }

  /**
   * Story Format (9:16 - 1080 x 1920) - Modern Apple Music & Spotify Stories Masterclass
   */
  function drawStoryLayout(ctx, w, h, lines, state) {
    const isLight = state.theme === 'editorial' || state.theme === 'cassette';
    const accent = isLight ? '#18181b' : (state.palette[0] || '#1DB954');
    const primaryFont = getFontStack(state.fontFamily);

    // Calculate metadata sleeve credit dimensions (compact 52-70px footprint)
    const pillMargin = Math.min(80, w * 0.075);
    const pillW = w - pillMargin * 2;
    const pillH = state.showScrubber ? 70 : 52;
    const pillY = h - pillH - Math.min(90, h * 0.05);

    // Dynamic Artwork Composition analysis for subject-aware lyric placement
    const comp = analyzeArtworkComposition(state.albumImg);

    let lyricsCenterX = w / 2;
    let lyricsMaxWidth = pillW;
    let lyricsTopY = 120;
    let effectiveAlign = state.textAlign;

    // In Cinematic mode, apply artwork-subject-aware placement.
    // Classic mode is a pure typography poster with an atmospheric wash and NO background photo,
    // so it must maintain balanced typography and never dodge invisible subjects.
    if (state.theme === 'cinematic') {
      if (comp.focalZone === 'left') {
        // Subject on Left -> Anchor lyric on the Right
        lyricsCenterX = w * 0.70;
        lyricsMaxWidth = w * 0.48;
        if (state.textAlign === 'center') effectiveAlign = 'left';
      } else if (comp.focalZone === 'right') {
        // Subject on Right -> Anchor lyric on the Left
        lyricsCenterX = w * 0.30;
        lyricsMaxWidth = w * 0.48;
        if (state.textAlign === 'center') effectiveAlign = 'left';
      } else if (comp.focalZone === 'center') {
        // Subject in Center -> Elevate lyric to upper third to avoid covering face/eyes
        lyricsCenterX = w / 2;
        lyricsMaxWidth = pillW * 0.88;
        lyricsTopY = 85;
      }
    } else if (state.theme === 'classic') {
      // Classic typography-first optical balance adapting to lyric visual weight
      const totalChars = lines.map(l => l.primary || '').join('').length;
      lyricsTopY = 130;
      lyricsMaxWidth = lines.length <= 2 && totalChars < 50 ? pillW * 0.88 : pillW * 0.96;
    }

    const availableLyricsH = pillY - 35 - lyricsTopY;
    drawLyricBlock(ctx, lyricsCenterX, lyricsTopY, lyricsMaxWidth, lines, { ...state, textAlign: effectiveAlign }, isLight, primaryFont, availableLyricsH);

    drawFloatingMetadataPill(ctx, pillMargin, pillY, pillW, pillH, state, accent, isLight, primaryFont);
  }

  /**
   * Square Format (1:1 - 1080 x 1080) - Instagram Feed & Album Art Square
   */
  function drawSquareLayout(ctx, w, h, lines, state) {
    const isLight = state.theme === 'editorial' || state.theme === 'cassette';
    const accent = isLight ? '#18181b' : (state.palette[0] || '#1DB954');
    const primaryFont = getFontStack(state.fontFamily);

    const pillMargin = Math.min(60, w * 0.065);
    const pillW = w - pillMargin * 2;
    const pillH = state.showScrubber ? 66 : 50;
    const pillY = h - pillH - Math.min(50, h * 0.05);

    const comp = analyzeArtworkComposition(state.albumImg);
    let lyricsCenterX = w / 2;
    let lyricsMaxWidth = pillW;
    let lyricsTopY = 70;
    let effectiveAlign = state.textAlign;

    if (state.theme === 'cinematic') {
      if (comp.focalZone === 'left') {
        lyricsCenterX = w * 0.68;
        lyricsMaxWidth = w * 0.50;
        if (state.textAlign === 'center') effectiveAlign = 'left';
      } else if (comp.focalZone === 'right') {
        lyricsCenterX = w * 0.32;
        lyricsMaxWidth = w * 0.50;
        if (state.textAlign === 'center') effectiveAlign = 'left';
      } else if (comp.focalZone === 'center') {
        lyricsTopY = 50;
        lyricsMaxWidth = pillW * 0.88;
      }
    } else if (state.theme === 'classic') {
      // Classic typography-first optical balance: maintain clear clearance below top publication header
      const totalChars = lines.map(l => l.primary || '').join('').length;
      lyricsTopY = 112;
      lyricsMaxWidth = lines.length <= 2 && totalChars < 50 ? pillW * 0.85 : pillW * 0.94;
    }

    const availableLyricsH = pillY - 25 - lyricsTopY;
    drawLyricBlock(ctx, lyricsCenterX, lyricsTopY, lyricsMaxWidth, lines, { ...state, textAlign: effectiveAlign }, isLight, primaryFont, availableLyricsH);

    drawFloatingMetadataPill(ctx, pillMargin, pillY, pillW, pillH, state, accent, isLight, primaryFont);
  }

  /**
   * Portrait Format (4:5 - 1080 x 1350) - Optimal Instagram Feed
   */
  function drawPortraitLayout(ctx, w, h, lines, state) {
    const isLight = state.theme === 'editorial' || state.theme === 'cassette';
    const accent = isLight ? '#18181b' : (state.palette[0] || '#1DB954');
    const primaryFont = getFontStack(state.fontFamily);

    const pillMargin = Math.min(70, w * 0.07);
    const pillW = w - pillMargin * 2;
    const pillH = state.showScrubber ? 68 : 52;
    const pillY = h - pillH - Math.min(70, h * 0.05);

    const comp = analyzeArtworkComposition(state.albumImg);
    let lyricsCenterX = w / 2;
    let lyricsMaxWidth = pillW;
    let lyricsTopY = 90;
    let effectiveAlign = state.textAlign;

    if (state.theme === 'cinematic') {
      if (comp.focalZone === 'left') {
        lyricsCenterX = w * 0.69;
        lyricsMaxWidth = w * 0.49;
        if (state.textAlign === 'center') effectiveAlign = 'left';
      } else if (comp.focalZone === 'right') {
        lyricsCenterX = w * 0.31;
        lyricsMaxWidth = w * 0.49;
        if (state.textAlign === 'center') effectiveAlign = 'left';
      } else if (comp.focalZone === 'center') {
        lyricsTopY = 65;
        lyricsMaxWidth = pillW * 0.88;
      }
    } else if (state.theme === 'classic') {
      // Classic typography-first optical balance: intentional margins adapting to lyric weight
      const totalChars = lines.map(l => l.primary || '').join('').length;
      lyricsTopY = 118;
      lyricsMaxWidth = lines.length <= 2 && totalChars < 50 ? pillW * 0.86 : pillW * 0.95;
    }

    const availableLyricsH = pillY - 30 - lyricsTopY;
    drawLyricBlock(ctx, lyricsCenterX, lyricsTopY, lyricsMaxWidth, lines, { ...state, textAlign: effectiveAlign }, isLight, primaryFont, availableLyricsH);

    drawFloatingMetadataPill(ctx, pillMargin, pillY, pillW, pillH, state, accent, isLight, primaryFont);
  }

  /**
   * Landscape Format (16:9 - 1920 x 1080) - Desktop & Twitter/X Header
   */
  function drawLandscapeLayout(ctx, w, h, lines, state) {
    const isLight = state.theme === 'editorial' || state.theme === 'cassette';
    const accent = isLight ? '#18181b' : (state.palette[0] || '#1DB954');
    const primaryFont = getFontStack(state.fontFamily);

    const comp = analyzeArtworkComposition(state.albumImg);
    // In Cinematic mode, if focal zone is on the left, position metadata card on the right
    // so it never covers the visual subject
    const subjectOnLeft = state.theme === 'cinematic' && comp.focalZone === 'left';

    const cardW = 520;
    const cardH = 440;
    const cardY = (h - cardH) / 2;
    const cardX = subjectOnLeft ? (w - 120 - cardW) : 120;

    drawLandscapeMetadataCard(ctx, cardX, cardY, cardW, cardH, state, accent, isLight, primaryFont);

    // Lyrics block positioned in the remaining column
    let lyricsCenterX, lyricsMaxWidth;
    if (subjectOnLeft) {
      lyricsCenterX = (cardX - 80) / 2 + 60;
      lyricsMaxWidth = cardX - 160;
    } else {
      lyricsCenterX = cardX + cardW + (w - (cardX + cardW)) / 2;
      lyricsMaxWidth = w - (cardX + cardW) - 160;
    }
    const lyricsTopY = 120;
    const availableLyricsH = h - 240;

    drawLyricBlock(ctx, lyricsCenterX, lyricsTopY, lyricsMaxWidth, lines, state, isLight, primaryFont, availableLyricsH);
  }

  /**
   * Draws refined editorial track metadata (album art, title, artist, scrubber, publisher colophon)
   */
  function drawFloatingMetadataPill(ctx, px, py, pw, ph, state, accent, isLight, primaryFont) {
    ctx.save();

    const isEditorialTheme = state.theme === 'classic' || state.theme === 'cinematic';

    if (!isEditorialTheme) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;

      if (isLight) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        drawRoundedRect(ctx, px, py, pw, ph, 24);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, px, py, pw, ph, 24);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(12, 14, 20, 0.58)';
        drawRoundedRect(ctx, px, py, pw, ph, 24);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, px, py, pw, ph, 24);
        ctx.stroke();
      }
    } else if (state.theme === 'classic') {
      // Design 1: Fine hairline divider above metadata section
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py - 18);
      ctx.lineTo(px + pw, py - 18);
      ctx.stroke();
    }

    // 1. Album Artwork Thumbnail (compact 48px squircle with clean hairline border)
    let contentStartX = px + (isEditorialTheme ? 0 : 20);
    const artSize = isEditorialTheme ? 48 : (ph - 28);
    const artY = py + (ph - artSize) / 2;

    if (state.showAlbumArt) {
      drawAlbumArt(ctx, state.albumImg, contentStartX, artY, artSize, 10);
      contentStartX += artSize + 18;
    }

    // 2. Right-side branding width reservation
    const brandReserve = state.showWatermark ? 110 : 12;
    const availableTextW = pw - (contentStartX - px) - brandReserve;

    // 3. Editorial Metadata Hierarchy: TRACK overline, Title, Artist
    const hasScrubber = state.showScrubber;

    // Overline "TRACK"
    const overlineY = hasScrubber ? (py + 14) : (py + ph / 2 - 14);
    ctx.textAlign = 'left';
    ctx.font = '700 9.5px "Outfit", "Inter", sans-serif';
    ctx.fillStyle = isLight ? 'rgba(24, 24, 27, 0.45)' : 'rgba(244, 244, 246, 0.40)';
    ctx.fillText('TRACK', contentStartX, overlineY);

    // Title
    const titleY = hasScrubber ? (py + 34) : (py + ph / 2 + 8);
    ctx.font = `700 20px ${primaryFont}`;
    ctx.fillStyle = isLight ? '#18181b' : '#f4f4f6';
    ctx.fillText(truncateText(ctx, state.trackTitle, availableTextW), contentStartX, titleY);

    // Artist
    const artistY = hasScrubber ? (py + 52) : (py + ph / 2 + 27);
    ctx.font = `500 13.5px ${primaryFont}`;
    ctx.fillStyle = isLight ? 'rgba(24, 24, 27, 0.55)' : 'rgba(244, 244, 246, 0.52)';
    ctx.fillText(truncateText(ctx, state.artistName, availableTextW), contentStartX, artistY);

    // 4. Subordinate Scrubber Timeline underneath
    if (hasScrubber) {
      const scrubberY = py + 66;
      const curMs = state.currentProgressMs || 0;
      const totMs = state.trackDurationMs || 180000;
      drawScrubberBar(ctx, contentStartX + availableTextW / 2, scrubberY, availableTextW, curMs, totMs, accent, isLight);
    }

    // 5. LyricFlow Brand Colophon (understated editorial signature)
    if (state.showWatermark) {
      const brandX = px + pw - (isEditorialTheme ? 0 : 20);
      const brandY = py + ph / 2 + 4;
      ctx.textAlign = 'right';
      ctx.font = '700 10.5px "Outfit", "Inter", -apple-system, sans-serif';
      ctx.fillStyle = isLight ? 'rgba(24, 24, 27, 0.38)' : 'rgba(244, 244, 246, 0.32)';
      ctx.fillText('• LYRICFLOW', brandX, brandY);
    }

    ctx.restore();
  }

  /**
   * Draws a floating metadata card for Landscape format
   */
  function drawLandscapeMetadataCard(ctx, cx, cy, cw, ch, state, accent, isLight, primaryFont) {
    ctx.save();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;

    if (isLight) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
      drawRoundedRect(ctx, cx, cy, cw, ch, 28);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, cx, cy, cw, ch, 28);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(14, 15, 20, 0.72)';
      drawRoundedRect(ctx, cx, cy, cw, ch, 28);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, cx, cy, cw, ch, 28);
      ctx.stroke();
    }

    let topY = cy + 40;
    if (state.showAlbumArt) {
      const artSize = 190;
      drawAlbumArt(ctx, state.albumImg, cx + (cw - artSize) / 2, topY, artSize, 18);
      topY += artSize + 32;
    } else {
      topY += 36;
    }

    // Title & Artist
    ctx.textAlign = 'center';
    ctx.font = `700 28px ${primaryFont}`;
    ctx.fillStyle = isLight ? '#18181b' : '#f4f4f6';
    ctx.fillText(truncateText(ctx, state.trackTitle, cw - 60), cx + cw / 2, topY + 8);

    ctx.font = `500 18px ${primaryFont}`;
    ctx.fillStyle = isLight ? 'rgba(24, 24, 27, 0.62)' : 'rgba(244, 244, 246, 0.60)';
    ctx.fillText(truncateText(ctx, state.artistName, cw - 60), cx + cw / 2, topY + 40);

    if (state.showScrubber) {
      const curMs = state.currentProgressMs || 0;
      const totMs = state.trackDurationMs || 180000;
      drawScrubberBar(ctx, cx + cw / 2, topY + 80, cw - 80, curMs, totMs, accent, isLight);
    }

    if (state.showWatermark) {
      const brandY = cy + ch - 26;
      ctx.textAlign = 'center';
      ctx.font = '700 14px "Outfit", "Inter", sans-serif';
      ctx.fillStyle = isLight ? 'rgba(24, 24, 27, 0.50)' : 'rgba(244, 244, 246, 0.48)';
      ctx.fillText('• LyricFlow', cx + cw / 2, brandY);
    }

    ctx.restore();
  }

  /**
   * Helper: Resolves font scale multiplier
   */
  function getScaleMultiplier(scale) {
    switch (scale) {
      case 'compact': return 0.85;
      case 'large': return 1.18;
      case 'heroic': return 1.36;
      case 'normal':
      default: return 1.0;
    }
  }

  /**
   * Helper: Renders Lyric lines with high-impact hero typography, scaling, and punchline highlight
   */
  function drawLyricBlock(ctx, cx, startY, maxWidth, lines, state, isLight, primaryFont, availableHeight = 800) {
    const totalLines = lines.length;
    const scaleMult = getScaleMultiplier(state.fontScale);
    const textAlign = state.textAlign || 'center';
    const accent = isLight ? '#18181b' : (state.palette[0] || '#1DB954');
    const hasHero = state.heroIndex != null && lines.some(l => l.originalIndex === state.heroIndex);

    // Character and word count across all primary lines for content-aware typography
    const allText = lines.map(l => l.primary || '').join(' ').trim();
    const charCount = allText.length;

    let baseFontSize = 48;
    let lineHeight = 72;
    let subFontSize = 26;
    let subLineHeight = 38;
    let paraGap = 28;

    if (totalLines === 1) {
      if (charCount <= 18) {
        // Short punchy lyric (e.g. "Tokyo Drift", "萌える容姿でぼちぼちね", "Stay with me"): commanding hero scale
        baseFontSize = 76;
        lineHeight = 106;
      } else if (charCount <= 35) {
        baseFontSize = 66;
        lineHeight = 94;
      } else {
        baseFontSize = 56;
        lineHeight = 82;
      }
      subFontSize = 30;
      subLineHeight = 44;
    } else if (totalLines === 2) {
      if (charCount <= 40) {
        baseFontSize = 54;
        lineHeight = 78;
      } else {
        baseFontSize = 46;
        lineHeight = 68;
      }
      subFontSize = 26;
      subLineHeight = 38;
    } else if (totalLines <= 4) {
      baseFontSize = 40;
      lineHeight = 60;
      subFontSize = 22;
      subLineHeight = 32;
      paraGap = 20;
    } else {
      baseFontSize = 32;
      lineHeight = 48;
      subFontSize = 18;
      subLineHeight = 26;
      paraGap = 16;
    }

    baseFontSize = Math.round(baseFontSize * scaleMult);
    lineHeight = Math.round(lineHeight * scaleMult);
    subFontSize = Math.round(subFontSize * scaleMult);
    subLineHeight = Math.round(subLineHeight * scaleMult);
    paraGap = Math.round(paraGap * scaleMult);

    // Pre-calculate line wraps per item, boosting hero punchline
    const wrappedParagraphs = lines.map(item => {
      const isHero = state.heroIndex != null && item.originalIndex === state.heroIndex;
      const itemBaseFontSize = isHero ? Math.round(baseFontSize * 1.12) : baseFontSize;
      const itemLineHeight = isHero ? Math.round(lineHeight * 1.12) : lineHeight;
      const itemFontWeight = isHero ? 800 : 700;

      ctx.font = `${itemFontWeight} ${itemBaseFontSize}px ${primaryFont}`;
      const priWraps = wrapText(ctx, item.primary, maxWidth);
      let secWraps = [];
      if (item.secondary) {
        ctx.font = `italic 400 ${subFontSize}px ${primaryFont}`;
        secWraps = wrapText(ctx, item.secondary, maxWidth);
      }
      return { item, priWraps, secWraps, itemBaseFontSize, itemLineHeight, itemFontWeight, isHero };
    });

    // Compute total block height
    let totalHeight = 0;
    wrappedParagraphs.forEach((p, idx) => {
      totalHeight += p.priWraps.length * p.itemLineHeight;
      if (p.secWraps.length > 0) {
        totalHeight += (p.secWraps.length * subLineHeight) + 8;
      }
      if (idx < wrappedParagraphs.length - 1) totalHeight += paraGap;
    });

    // Content-aware optical vertical center: single-line punchy lyrics sit at golden ratio 36%
    const opticalCenterRatio = totalLines === 1 ? 0.36 : (totalLines === 2 ? 0.40 : 0.44);
    let curY = startY + Math.max(0, (availableHeight - totalHeight) * opticalCenterRatio);

    // X coordinate based on alignment
    let textX = cx;
    if (textAlign === 'left') {
      textX = cx - (maxWidth / 2);
    } else if (textAlign === 'right') {
      textX = cx + (maxWidth / 2);
    }

    wrappedParagraphs.forEach(p => {
      const isHero = p.isHero;
      ctx.textAlign = textAlign;

      // Primary text styling: sharp, solid, high-contrast, no artificial neon glow
      ctx.font = `${p.itemFontWeight} ${p.itemBaseFontSize}px ${primaryFont}`;
      if (state.theme === 'classic') {
        // Classic: pure razor-sharp print typography without artificial glow or drop shadow
        ctx.fillStyle = isHero ? (isLight ? '#18181b' : '#ffffff') : (isLight ? 'rgba(24, 24, 27, 0.96)' : (hasHero ? 'rgba(244, 244, 246, 0.45)' : 'rgba(244, 244, 246, 0.96)'));
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      } else if (isHero) {
        ctx.fillStyle = isLight ? '#18181b' : '#ffffff';
        if (!isLight) {
          ctx.shadowColor = state.theme === 'cinematic' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = state.theme === 'cinematic' ? 6 : 2;
          ctx.shadowOffsetY = 1;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
      } else {
        const lineAlpha = hasHero ? 0.45 : 0.96;
        ctx.fillStyle = isLight ? `rgba(24, 24, 27, ${lineAlpha})` : `rgba(244, 244, 246, ${lineAlpha})`;
        if (!isLight) {
          ctx.shadowColor = state.theme === 'cinematic' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.25)';
          ctx.shadowBlur = state.theme === 'cinematic' ? 4 : 1;
          ctx.shadowOffsetY = 1;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
      }

      p.priWraps.forEach(lineText => {
        ctx.fillText(lineText, textX, curY);
        curY += p.itemLineHeight;
      });

      // Secondary / Translated subtitle text
      if (p.secWraps.length > 0) {
        curY -= (p.itemLineHeight - subLineHeight) / 2;
        ctx.font = `italic 400 ${subFontSize}px ${primaryFont}`;
        const subAlpha = (isHero ? 0.88 : (hasHero ? 0.45 : 0.68));
        ctx.fillStyle = isLight ? `rgba(24, 24, 27, ${subAlpha})` : `rgba(244, 244, 246, ${subAlpha})`;
        ctx.shadowBlur = 0;

        p.secWraps.forEach(subText => {
          ctx.fillText(subText, textX, curY);
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
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;

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
      ctx.fillStyle = '#18191e';
      ctx.fill();

      // Placeholder music note icon
      ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
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
   * Draws authentic Spotify-style Now Playing scrubber bar with progress track & timestamps
   */
  function drawScrubberBar(ctx, cx, cy, width, currentMs = 0, totalMs = 0, accent = '#1DB954', isEditorial = false) {
    const safeTotal = Math.max(1, totalMs || 180000);
    const safeCurrent = Math.min(safeTotal, Math.max(0, currentMs || 0));
    const progressRatio = Math.min(1, Math.max(0, safeCurrent / safeTotal));

    const barH = 2;
    const barY = cy;
    const leftX = cx - width / 2;
    const trackW = width;

    ctx.save();

    // Track background hairline
    ctx.fillStyle = isEditorial ? 'rgba(24, 24, 27, 0.12)' : 'rgba(255, 255, 255, 0.14)';
    drawRoundedRect(ctx, leftX, barY - barH / 2, trackW, barH, 1);
    ctx.fill();

    // Filled progress track (clean informational hairline without player knob)
    const filledW = Math.max(2, trackW * progressRatio);
    ctx.fillStyle = isEditorial ? '#18181b' : (accent || '#ffffff');
    drawRoundedRect(ctx, leftX, barY - barH / 2, filledW, barH, 1);
    ctx.fill();

    // Timestamps: Clean, understated monospace
    const curStr = formatLyricTimestamp(safeCurrent);
    const totStr = formatLyricTimestamp(safeTotal);

    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = isEditorial ? 'rgba(24, 24, 27, 0.45)' : 'rgba(244, 244, 246, 0.45)';
    ctx.textAlign = 'left';
    ctx.fillText(curStr, leftX, barY + 14);

    ctx.textAlign = 'right';
    ctx.fillText(totStr, leftX + trackW, barY + 14);

    ctx.restore();
  }

  /**
   * Draws timestamp badge (e.g. 02:14 without player play glyph)
   */
  function drawTimestampBadge(ctx, cx, cy, timeMs, accent, isEditorial = false) {
    const timeStr = formatLyricTimestamp(timeMs);
    ctx.save();
    ctx.font = '600 15px "JetBrains Mono", monospace';
    const textW = ctx.measureText(timeStr).width;
    const badgeW = textW + 24;
    const badgeH = 28;
    const px = cx - badgeW / 2;
    const py = cy - badgeH / 2;

    ctx.fillStyle = isEditorial ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)';
    ctx.strokeStyle = isEditorial ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, px, py, badgeW, badgeH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = isEditorial ? '#18181b' : 'rgba(255,255,255,0.85)';
    ctx.fillText(timeStr, cx, cy + 5);
    ctx.restore();
  }

  /**
   * Draws understated editorial brand colophon: • LYRICFLOW
   */
  function drawWatermarkPill(ctx, cx, cy, accent, isEditorial = false) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 11px "Outfit", "Inter", -apple-system, sans-serif';
    ctx.fillStyle = isEditorial ? 'rgba(24, 24, 27, 0.42)' : 'rgba(244, 244, 246, 0.38)';
    ctx.fillText('• LYRICFLOW', cx, cy + 4);
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
   * Helper: Joins a slice of tokens preserving authentic spacing between Latin words
   * and within mixed CJK/Latin scripts.
   */
  function joinTokenRange(tokens, fromIdx, toIdx, hasSpaceBefore = null, isCJK = false) {
    if (fromIdx >= toIdx) return '';
    let str = tokens[fromIdx];
    for (let k = fromIdx + 1; k < toIdx; k++) {
      let needsSpace = false;
      if (hasSpaceBefore && hasSpaceBefore[k] !== undefined) {
        needsSpace = hasSpaceBefore[k];
      } else if (!isCJK) {
        needsSpace = true;
      } else {
        const prev = tokens[k - 1];
        const curr = tokens[k];
        if (/[a-zA-Z0-9]$/.test(prev) && /^[a-zA-Z0-9]/.test(curr)) {
          needsSpace = true;
        }
      }
      str += (needsSpace ? ' ' : '') + tokens[k];
    }
    return str;
  }

  /**
   * Tokenizes text with CJK / Japanese awareness and Kinsoku Shori punctuation gluing.
   */
  function tokenizeText(text) {
    const isCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(text);
    let rawTokens = [];
    let spaceFlags = [];
    if (isCJK && typeof Intl !== 'undefined' && Intl.Segmenter) {
      const seg = new Intl.Segmenter(['ja', 'zh', 'ko'], { granularity: 'word' });
      const segments = Array.from(seg.segment(text));
      let hadSpace = false;
      for (const s of segments) {
        if (!s.segment) continue;
        if (/^\s+$/.test(s.segment)) {
          hadSpace = true;
          continue;
        }
        const trimmed = s.segment.trim();
        if (trimmed) {
          rawTokens.push(trimmed);
          spaceFlags.push(hadSpace);
          hadSpace = false;
        }
      }
    } else {
      const parts = text.split(/\s+/).filter(Boolean);
      rawTokens = parts;
      spaceFlags = parts.map((_, idx) => idx > 0);
    }

    // Kinsoku Shori (Japanese & General punctuation gluing)
    const NO_START = /^[、。，．！？!?』」）\)\}\]”’…:;]/;
    const NO_END = /[「『（\(\{\[“‘]$/;

    const glued = [];
    const gluedSpaces = [];
    for (let i = 0; i < rawTokens.length; i++) {
      let t = rawTokens[i];
      let sp = spaceFlags[i] || false;
      if (glued.length > 0 && NO_START.test(t)) {
        glued[glued.length - 1] += t;
      } else if (glued.length > 0 && NO_END.test(glued[glued.length - 1])) {
        glued[glued.length - 1] += (sp ? ' ' : '') + t;
      } else {
        glued.push(t);
        gluedSpaces.push(sp);
      }
    }
    return { tokens: glued, isCJK, hasSpaceBefore: gluedSpaces };
  }

  /**
   * Balanced, CJK-aware, aesthetic line wrapping with rag-variance minimization (Knuth-Plass inspired)
   */
  function wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const trimmed = String(text).trim();
    if (!trimmed) return [];

    // If entire text fits on one line, return immediately
    if (ctx.measureText(trimmed).width <= maxWidth) {
      return [trimmed];
    }

    const { tokens, isCJK, hasSpaceBefore } = tokenizeText(trimmed);
    if (tokens.length <= 1) {
      const chars = Array.from(trimmed);
      const lines = [];
      let cur = '';
      for (const ch of chars) {
        if (ctx.measureText(cur + ch).width <= maxWidth) {
          cur += ch;
        } else {
          if (cur) lines.push(cur);
          cur = ch;
        }
      }
      if (cur) lines.push(cur);
      return lines;
    }

    const n = tokens.length;

    // Minimum lines needed
    let minLines = 1;
    let curTestWidth = ctx.measureText(tokens[0]).width;
    for (let i = 1; i < n; i++) {
      const sep = ((hasSpaceBefore && hasSpaceBefore[i]) || !isCJK) ? ' ' : '';
      const w = ctx.measureText(sep + tokens[i]).width;
      if (curTestWidth + w <= maxWidth) {
        curTestWidth += w;
      } else {
        minLines++;
        curTestWidth = ctx.measureText(tokens[i]).width;
      }
    }

    // 2-line balance optimization
    if (minLines === 2) {
      let bestSplit = 1;
      let minDiff = Infinity;
      for (let i = 1; i < n; i++) {
        const line1 = joinTokenRange(tokens, 0, i, hasSpaceBefore, isCJK);
        const line2 = joinTokenRange(tokens, i, n, hasSpaceBefore, isCJK);
        const w1 = ctx.measureText(line1).width;
        const w2 = ctx.measureText(line2).width;
        if (w1 <= maxWidth && w2 <= maxWidth) {
          const diff = Math.abs(w1 - w2);
          const orphanPenalty = (tokens.slice(i).length === 1 && line2.length < 5) ? 200 : 0;
          if (diff + orphanPenalty < minDiff) {
            minDiff = diff + orphanPenalty;
            bestSplit = i;
          }
        }
      }
      return [
        joinTokenRange(tokens, 0, bestSplit, hasSpaceBefore, isCJK),
        joinTokenRange(tokens, bestSplit, n, hasSpaceBefore, isCJK)
      ];
    }

    // General dynamic programming for 3+ lines: rag variance minimization
    let totalWidth = 0;
    for (let i = 0; i < n; i++) {
      const sep = (i < n - 1 && (((hasSpaceBefore && hasSpaceBefore[i + 1]) || !isCJK))) ? ' ' : '';
      totalWidth += ctx.measureText(tokens[i] + sep).width;
    }
    const idealLineWidth = Math.min(maxWidth, totalWidth / minLines);

    const dp = new Array(n + 1).fill(null).map(() => ({ cost: Infinity, prev: -1 }));
    dp[0] = { cost: 0, prev: -1 };

    for (let i = 1; i <= n; i++) {
      for (let j = 0; j < i; j++) {
        if (dp[j].cost === Infinity) continue;
        const sliceStr = joinTokenRange(tokens, j, i, hasSpaceBefore, isCJK);
        const lineW = ctx.measureText(sliceStr).width;
        if (lineW <= maxWidth) {
          const diff = idealLineWidth - lineW;
          const isLastLine = (i === n);
          let lineCost = diff * diff;
          if (isLastLine && (i - j) === 1 && sliceStr.length < 5) {
            lineCost += 100000;
          }
          const totalCost = dp[j].cost + lineCost;
          if (totalCost < dp[i].cost) {
            dp[i] = { cost: totalCost, prev: j };
          }
        }
      }
    }

    if (dp[n].cost !== Infinity) {
      const resultLines = [];
      let curr = n;
      while (curr > 0) {
        const p = dp[curr].prev;
        resultLines.unshift(joinTokenRange(tokens, p, curr, hasSpaceBefore, isCJK));
        curr = p;
      }
      return resultLines;
    }

    // Fallback to greedy
    const fallbackLines = [];
    let curLine = tokens[0];
    for (let i = 1; i < n; i++) {
      const sep = ((hasSpaceBefore && hasSpaceBefore[i]) || !isCJK) ? ' ' : '';
      const candidate = curLine + sep + tokens[i];
      if (ctx.measureText(candidate).width <= maxWidth) {
        curLine = candidate;
      } else {
        fallbackLines.push(curLine);
        curLine = tokens[i];
      }
    }
    if (curLine) fallbackLines.push(curLine);
    return fallbackLines;
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
    if (!hex) return `rgba(29, 185, 84, ${alpha})`;
    const rgb = hexToRgbObj(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g,
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  /**
   * Copies the rendered card directly to clipboard as PNG (renders at 2x Retina if export2x enabled)
   */
  function copyCanvasToClipboard() {
    const canvas = getExportCanvas();
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
   * Downloads the rendered card directly as PNG (renders at 2x Retina 4K if export2x enabled)
   */
  async function downloadCanvasAsPng() {
    const canvas = getExportCanvas();
    if (!canvas) return;

    const cleanTitle = (shareState.trackTitle || "lyrics").replace(/[^a-zA-Z0-9_\-]/g, "_");
    const filename = `${cleanTitle}-LyricFlow${shareState.export2x ? '-4K' : ''}.png`;
    const dataUrl = canvas.toDataURL('image/png');

    try {
      if (window.electronAPI && typeof window.electronAPI.saveCardImage === 'function') {
        const savedPath = await window.electronAPI.saveCardImage({
          image_base64: dataUrl,
          filename: filename
        });
        if (savedPath) {
          if (typeof showToast === 'function') {
            showToast("Saved card image to Pictures/LyricFlow!", 3500, 'success');
          }
          return;
        }
      }

      // Browser fallback
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (typeof showToast === 'function') {
        showToast("Saved image to downloads!", 2500, 'success');
      }
    } catch (e) {
      console.error("[ShareCard] Download error:", e);
      if (typeof showToast === 'function') {
        showToast(`Save failed: ${e.message || e}`, 3500, 'error');
      }
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

  /**
   * Renders Kinetic Story Card preview on canvas
   */
  function drawKineticStoryCard(ctx, width, height, formattedLines, state) {
    try {
      const KColor = (typeof window !== 'undefined' && window.KineticColorEngine) || ColorEngine;
      const KMorph = (typeof window !== 'undefined' && window.KineticShapeMorpher) || ShapeMorpher;
      const KTypo = (typeof window !== 'undefined' && window.KineticTypographyEngine) || TypographyEngine;
      const KDir = (typeof window !== 'undefined' && window.KineticDirector) || Director;
      const KConcept = (typeof window !== 'undefined' && window.CinematicConcept) || (typeof CinematicConcept !== 'undefined' ? CinematicConcept : null);
      const KMotif = (typeof window !== 'undefined' && window.CinematicMotif) || (typeof CinematicMotif !== 'undefined' ? CinematicMotif : null);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      if (!KColor || !KMorph || !KTypo) {
        drawStoryLayout(ctx, width, height, formattedLines, state);
        return;
      }

      let dominantRgb = { r: 52, g: 24, b: 32 };
      if (state.palette && state.palette.length > 0) {
        dominantRgb = hexToRgbObj(state.palette[0]);
      }

      const palette = KColor.resolvePalette(state.kineticColor || 'album_art', {
        presetKey: state.kineticColor,
        dominantRgb,
        custom: state.kineticCustomColors
      });

      const cardW = Math.round(width * 0.78);
      const cardH = Math.round(height * 0.56);
      const cardBounds = {
        x: Math.round((width - cardW) / 2),
        y: Math.round((height - cardH) / 2),
        width: cardW,
        height: cardH,
        cornerRadius: Math.round(cardW * 0.065)
      };

      const heroLine = formattedLines[state.heroIndex !== null ? state.heroIndex : 0] || formattedLines[0] || { primary: '' };
      const isClimax = (heroLine.primary || '').includes('?');

      let lineConcept = null;
      if (KConcept && typeof KConcept.detectConcept === 'function') {
        const detected = KConcept.detectConcept(heroLine.primary || '');
        lineConcept = detected ? detected.concept : null;
      }
      if (!lineConcept && KConcept && typeof KConcept.analyzeLyric === 'function') {
        const analysis = KConcept.analyzeLyric(heroLine.primary || '');
        lineConcept = (analysis && analysis.concept) ? analysis.concept : null;
      }

      KMorph.drawMorphedCard(ctx, {
        shapeType: state.kineticShape === 'auto' ? KMorph.getShapeForTrack(state.artistName, state.trackTitle) : (state.kineticShape || 'astroid'),
        progress: 1.0,
        bounds: cardBounds,
        fillColor: palette.cardColor,
        showAccentStar: !isClimax,
        starColor: palette.textColor,
        concept: lineConcept,
        motifEngine: KMotif
      });

      if (KDir && typeof KDir.classifyPhrase === 'function') {
        const classification = KDir.classifyPhrase(heroLine.primary || '', [], isClimax);
        switch (classification.style) {
          case 'styleC':
            KTypo.renderStyleC(ctx, {
              text: classification.primaryText,
              creatorTag: state.artistName ? `@${state.artistName.replace(/\s+/g, '').toLowerCase()}` : '',
              artworkImage: state.albumImg,
              bounds: cardBounds,
              palette,
              colorEngine: KColor
            });
            break;
          case 'styleB':
            KTypo.renderStyleB(ctx, {
              primaryText: classification.primaryText,
              secondaryText: classification.secondaryText,
              secondaryPosition: classification.secondaryPosition,
              bounds: cardBounds,
              palette
            });
            break;
          case 'styleA':
          default:
            KTypo.renderStyleA(ctx, {
              text: classification.primaryText,
              bounds: cardBounds,
              palette
            });
            break;
        }
      } else {
        KTypo.renderStyleA(ctx, {
          text: heroLine.primary || '',
          bounds: cardBounds,
          palette
        });
      }
    } catch (err) {
      console.warn("[ShareCard] drawKineticStoryCard fallback:", err);
      drawStoryLayout(ctx, width, height, formattedLines, state);
    }
  }

  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i += 8192) {
      const slice = bytes.subarray(i, Math.min(i + 8192, len));
      binary += String.fromCharCode.apply(null, slice);
    }
    return btoa(binary);
  }

  /**
   * High-speed frame-driven video recorder exporting MP4 video with synchronized audio
   */
  async function exportKineticStoryVideo() {
    if (shareState.isExportingVideo) return;
    const btnExport = document.getElementById("btn-share-export-video");
    const exportLabel = document.getElementById("share-export-video-text");
    const originalText = exportLabel ? exportLabel.textContent : "Export Video (MP4)";

    shareState.isExportingVideo = true;
    if (btnExport) btnExport.disabled = true;

    try {
      if (exportLabel) exportLabel.textContent = "Preparing recording...";

      if (!shareState.selectedIndices || !shareState.selectedIndices.length) {
        if (shareState.cachedLyrics && shareState.cachedLyrics.length > 0) {
          shareState.selectedIndices = [shareState.heroIndex !== null ? shareState.heroIndex : 0];
        }
      }

      const selectedLyrics = (shareState.selectedIndices || [])
        .map(i => shareState.cachedLyrics[i])
        .filter(Boolean);

      if (!selectedLyrics.length) {
        if (typeof showToast === 'function') {
          showToast("Please select at least 1 lyric line to export video", 3000, 'warning');
        }
        return;
      }

      const firstTime = selectedLyrics[0].timeMs || 0;
      const lastLine = selectedLyrics[selectedLyrics.length - 1];
      const lastTime = lastLine.endMs || (lastLine.timeMs ? lastLine.timeMs + 3000 : firstTime + 6000);
      const lyricDuration = Math.max(3000, lastTime - firstTime);
      const introDurationMs = 3500;
      const totalDurationMs = Math.min(30000, introDurationMs + lyricDuration);

      const recordCanvas = document.createElement('canvas');
      recordCanvas.width = 720;
      recordCanvas.height = 1280;

      const RendererClass = (typeof window !== 'undefined' && window.KineticCanvasRenderer) || require('./kinetic/KineticCanvasRenderer');
      const renderer = new RendererClass(recordCanvas, { width: 720, height: 1280 });

      let dominantRgb = null;
      if (shareState.palette && shareState.palette[0]) {
        dominantRgb = hexToRgbObj(shareState.palette[0]);
      }

      renderer.configure({
        shapeMode: shareState.kineticShape === 'auto' ? 'auto' : (shareState.kineticShape === 'random' ? 'random' : 'manual'),
        shapeType: shareState.kineticShape,
        colorMode: shareState.kineticColor === 'album_art' ? 'album_art' : 'preset',
        presetKey: shareState.kineticColor,
        customColors: shareState.kineticCustomColors,
        artist: shareState.artistName,
        title: shareState.trackTitle,
        creatorTag: shareState.artistName ? `@${shareState.artistName.replace(/\s+/g, '').toLowerCase()}` : '',
        artworkImage: shareState.albumImg,
        dominantRgb,
        lyrics: selectedLyrics,
        startTimeMs: 0,
        endTimeMs: totalDurationMs
      });

      const fps = 30;
      const frameIntervalMs = 1000 / fps;
      const totalFrames = Math.ceil(totalDurationMs / frameIntervalMs);

      if (typeof recordCanvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined') {
        const stream = recordCanvas.captureStream(fps);
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

        const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const recordPromise = new Promise((resolve, reject) => {
          mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
          mediaRecorder.onerror = (e) => reject(e);
        });

        mediaRecorder.start();

        for (let f = 0; f <= totalFrames; f++) {
          const timeMs = f * frameIntervalMs;
          renderer.renderFrame(timeMs);
          if (f % 5 === 0 && exportLabel) {
            const pct = Math.round((f / totalFrames) * 85);
            exportLabel.textContent = `Recording... ${pct}%`;
          }
          await new Promise(r => setTimeout(r, Math.max(16, Math.floor(frameIntervalMs))));
        }

        mediaRecorder.stop();
        if (exportLabel) exportLabel.textContent = "Encoding MP4 video...";

        const videoBlob = await recordPromise;
        const arrayBuffer = await videoBlob.arrayBuffer();
        const base64Video = arrayBufferToBase64(arrayBuffer);

        const cleanTitle = (shareState.trackTitle || "kinetic_story").replace(/[^a-zA-Z0-9_\-]/g, "_");
        const defaultFileName = `${cleanTitle}-KineticStory-${Date.now()}.mp4`;

        if (window.electronAPI && typeof window.electronAPI.exportKineticVideo === 'function') {
          const result = await window.electronAPI.exportKineticVideo({
            video_base64: base64Video,
            audio_path: null,
            audio_base64: null,
            start_time_sec: firstTime / 1000,
            duration_sec: totalDurationMs / 1000,
            output_path: defaultFileName
          });

          if (result) {
            if (typeof showToast === 'function') {
              showToast("Exported video to Videos/LyricFlow!", 4500, 'success');
            }
          } else {
            throw new Error("Video encoding failed");
          }
        } else {
          const url = URL.createObjectURL(videoBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${cleanTitle}-KineticStory.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          if (typeof showToast === 'function') {
            showToast("Saved video animation!", 3000, 'success');
          }
        }
      } else {
        if (typeof showToast === 'function') {
          showToast("MediaRecorder is not supported in this environment", 3000, 'warning');
        }
      }
    } catch (err) {
      console.error("[ShareCard] Video export failed:", err);
      if (typeof showToast === 'function') {
        showToast(`Video export failed: ${err.message || err}`, 4000, 'error');
      }
    } finally {
      shareState.isExportingVideo = false;
      if (btnExport) btnExport.disabled = false;
      if (exportLabel) exportLabel.textContent = originalText;
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
      hexToRgbObj,
      hexToRgba,
      getCardDimensions,
      getFontStack,
      getScaleMultiplier,
      formatLyricTimestamp,
      getFormattedLyricsForShare,
      buildShareTextQuote,
      drawScrubberBar,
      drawFilmGrain,
      drawFloatingMetadataPill,
      drawLandscapeMetadataCard,
      drawThemeBackground,
      renderCardContent,
      normalizeHarmonicPalette,
      tokenizeText,
      SHARE_CARD_PRESETS,
      applyPreset,
      shareState,
      savedCustomConfig,
      restoreCustomConfigToState,
      syncSavedCustomConfigFromState,
      updateDesignSelectorUI,
      toggleCustomMode,
      activateCustomMode,
      toggleCustomDrawerOnly,
      markCustomModeActive,
      renderPresetPreviews,
      analyzeArtworkComposition,
      drawTimestampBadge,
      drawWatermarkPill,
      drawGlassContainer,
      drawGlassBoxLayout
    };
  }

})();
