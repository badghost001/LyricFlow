/**
 * LyricFlow - Kinetic Typography Engine
 * Manages dual-font typographic hierarchy, optical scaling, and multi-style card layouts.
 * Directly replicates the typographic art direction from reference implementation:
 * - Style A: Elegant stacked lowercase editorial narrative serif (Fraunces).
 * - Style B: Giant ultra-condensed display serif punch word (Bodoni Moda) with optical vertical stretch.
 * - Style C: 50/50 horizontal split-card with climax typography on top and duotone album art on bottom.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KineticTypographyEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FONT_FAMILIES = {
    serifNarrative: '"Fraunces", "Playfair Display", Georgia, "Times New Roman", serif',
    serifDisplay: '"Playfair Display", "Fraunces", "Bodoni Moda", "Cinzel", Georgia, serif',
    metaSans: '"Inter", "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  };

  /**
   * Measures wrapped text lines and total bounding height.
   */
  function measureWrappedLines(ctx, text, maxWidth) {
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return { lines: [''], width: 0, height: 0 };

    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const candidate = `${currentLine} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);

    let maxLineWidth = 0;
    lines.forEach((l) => {
      const w = ctx.measureText(l).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });

    return { lines, width: maxLineWidth };
  }

  /**
   * Computes optimal font size to fit text within target bounding box.
   */
  function computeFitFontSize(ctx, text, fontTemplate, maxW, maxH, minSize = 24, maxSize = 180) {
    let low = minSize;
    let high = maxSize;
    let best = minSize;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      ctx.font = fontTemplate.replace('{size}', `${mid}px`);
      const metrics = ctx.measureText(text);

      if (metrics.width <= maxW && mid <= maxH) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return best;
  }

  const _measureCache = new Map();
  function measureWordWidth(ctx, text, fontKey) {
    if (!text) return 0;
    const targetFont = fontKey || ctx.font;
    const key = `${targetFont}_${text}`;
    let val = _measureCache.get(key);
    if (val !== undefined) return val;
    const prevFont = ctx.font;
    if (targetFont && ctx.font !== targetFont) {
      ctx.font = targetFont;
    }
    val = ctx.measureText(text).width;
    if (ctx.font !== prevFont) {
      ctx.font = prevFont;
    }
    if (_measureCache.size > 2000) _measureCache.clear();
    _measureCache.set(key, val);
    return val;
  }

  /**
   * Wraps timed words into lines respecting max width.
   */
  function wrapTimedWords(ctx, words, maxWidth, options = {}) {
    if (!words || !words.length) return [];
    const lines = [];
    let currentWords = [];
    let currentW = 0;
    const baseFont = (options && options.baseFont) || ctx.font;
    const spaceW = measureWordWidth(ctx, ' ', baseFont);
    const getWordFont = (options && typeof options.getWordFont === 'function')
      ? options.getWordFont
      : ((w) => (w && w.font) || baseFont);

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const fontForW = getWordFont(w);
      const wW = measureWordWidth(ctx, w.text, fontForW);
      const prevWord = currentWords[currentWords.length - 1];
      const needsSpace = prevWord ? (prevWord.hasSpace !== false) : false;
      const isPunchOrEmp = Boolean((w && (w.isPunchWord || (w.scaleMultiplier && w.scaleMultiplier > 1.05))) || (fontForW && fontForW.includes('700')));
      const wordSpaceW = isPunchOrEmp ? Math.round(spaceW * 1.35) : spaceW;
      const addW = currentWords.length === 0 ? wW : ((needsSpace ? wordSpaceW : 0) + wW);

      if (currentW + addW <= maxWidth || currentWords.length === 0) {
        currentWords.push(w);
        currentW += addW;
      } else {
        lines.push({ words: currentWords, width: currentW });
        currentWords = [w];
        currentW = wW;
      }
    }
    if (currentWords.length > 0) {
      lines.push({ words: currentWords, width: currentW });
    }
    return lines;
  }

  /**
   * Computes the dynamic emergence factor, layout width factor, and visual state for a word at time t.
   *
   * @param {Object} word - The timed word object { text, timeMs, endMs, hasSpace }
   * @param {number} currentTimeMs - Current playback timestamp
   * @param {Object} options - Emergence tuning options
   * @returns {Object} { factor: number, widthFactor: number, opacity: number, scale: number, yOffset: number, isCurrent: boolean, isSung: boolean, isVisible: boolean }
   */
  function computeWordEmergence(word, currentTimeMs, options = {}) {
    const isReducedMotion = Boolean(options.reducedMotion);
    const wordStart = (typeof word.timeMs === 'number') ? word.timeMs : 0;
    const wordEnd = (typeof word.endMs === 'number') ? word.endMs : (wordStart + 400);

    // If reduced motion is requested, words are immediately at full width once emerged or sung
    if (isReducedMotion) {
      const isVisible = currentTimeMs >= (wordStart - 60);
      const isSung = currentTimeMs >= wordEnd;
      const isCurrent = (currentTimeMs >= wordStart) && (!isSung);
      return {
        factor: isVisible ? 1.0 : 0.0,
        widthFactor: isVisible ? 1.0 : 0.0,
        opacity: isVisible ? 1.0 : 0.0,
        scale: 1.0,
        yOffset: 0,
        isCurrent,
        isSung,
        isVisible
      };
    }

    // Lead time before vocal onset when the word begins emerging and claiming layout width (160ms)
    const leadTimeMs = (typeof options.leadTimeMs === 'number') ? options.leadTimeMs : 160;
    const emergeDurMs = (typeof options.emergeDurMs === 'number') ? options.emergeDurMs : 200;

    const emergeStart = wordStart - leadTimeMs;
    const emergeEnd = emergeStart + emergeDurMs;

    // Upcoming word before emergence window: 0 width, invisible, takes zero space
    if (currentTimeMs < emergeStart) {
      return {
        factor: 0,
        widthFactor: 0,
        opacity: 0,
        scale: 0.88,
        yOffset: 6,
        isCurrent: false,
        isSung: false,
        isVisible: false
      };
    }

    const isSung = currentTimeMs >= wordEnd;
    const isCurrent = (currentTimeMs >= wordStart) && (!isSung);

    if (currentTimeMs >= emergeEnd) {
      return {
        factor: 1.0,
        widthFactor: 1.0,
        opacity: 1.0,
        scale: 1.0,
        yOffset: 0,
        isCurrent,
        isSung,
        isVisible: true
      };
    }

    // Actively emerging window [emergeStart, emergeEnd]
    const p = Math.max(0, Math.min(1, (currentTimeMs - emergeStart) / emergeDurMs));
    // Cubic ease-out: expands with organic elastic deceleration
    const easeOut = 1 - Math.pow(1 - p, 3);

    return {
      factor: easeOut,
      widthFactor: easeOut,
      opacity: Math.max(0, Math.min(1, easeOut)),
      scale: 0.88 + 0.12 * easeOut,
      yOffset: 6 * (1 - easeOut),
      isCurrent,
      isSung,
      isVisible: easeOut > 0.005
    };
  }

  /**
   * Renders horizontal fluid typography with dynamic word emergence and spatially stable coordinates.
   * Words appear one-by-one with luminous emergence without forcing neighboring words to reflow every frame.
   */
  function renderCinematicHorizontalFluid(ctx, options) {
    const {
      words = [],
      currentTimeMs,
      bounds,
      palette,
      actualFontSize: initFontSize = 48,
      lineHeight: initLineHeight = null,
      maxTextW: optMaxW = null,
      cx: optCX = null,
      cy: optCY = null,
      emphasizedWord,
      fadeAlpha = 1.0,
      reducedMotion = false
    } = options;

    if (!words || !words.length || !bounds) return;

    // Safe boundaries: ensure top-right exit button (top 20px, height 38px) and bottom seal/footer (bottom 24px) are 100% cleared
    const safeTop = bounds.y + Math.max(72, Math.round(bounds.height * 0.12));
    const safeBottom = bounds.y + bounds.height - Math.max(64, Math.round(bounds.height * 0.10));
    const safeH = Math.max(100, safeBottom - safeTop);

    const targetMaxW = (typeof optMaxW === 'number') ? optMaxW : bounds.width * 0.86;
    let actualFontSize = options.actualFontSize || initFontSize;
    const hasPunchWord = words.some(w => w && (w.isPunchWord || (w.scaleMultiplier && w.scaleMultiplier > 1.05)));
    let lineHeightMultiplier = hasPunchWord ? 1.60 : 1.45;
    let lineHeight = options.lineHeight || initLineHeight || Math.round(actualFontSize * lineHeightMultiplier);

    let normFont = `400 ${actualFontSize}px ${FONT_FAMILIES.serifNarrative}`;
    let empFont = `700 ${actualFontSize}px ${FONT_FAMILIES.serifDisplay}`;

    const resolveWordFont = (w, baseSize) => {
      const wClean = (w && w.text ? w.text : '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '').trim().toUpperCase();
      const isEmp = Boolean(emphasizedWord && wClean === emphasizedWord);
      if (w && (w.isPunchWord || (w.scaleMultiplier && w.scaleMultiplier > 1.05))) {
        const mult = w.scaleMultiplier || 1.65;
        const punchSize = Math.round(baseSize * mult);
        return {
          font: `700 ${punchSize}px ${FONT_FAMILIES.serifDisplay}`,
          fontSize: punchSize,
          isPunch: true,
          isEmp
        };
      }
      if (isEmp) {
        return {
          font: `700 ${baseSize}px ${FONT_FAMILIES.serifDisplay}`,
          fontSize: baseSize,
          isPunch: false,
          isEmp: true
        };
      }
      return {
        font: `400 ${baseSize}px ${FONT_FAMILIES.serifNarrative}`,
        fontSize: baseSize,
        isPunch: false,
        isEmp: false
      };
    };

    ctx.font = normFont;
    let spaceW = measureWordWidth(ctx, ' ', normFont);

    // Pre-calculate line layout with stable coordinates and word-specific font metrics
    let timedLines = wrapTimedWords(ctx, words, targetMaxW, {
      baseFont: normFont,
      getWordFont: (w) => resolveWordFont(w, actualFontSize).font
    });
    let totalH = timedLines.length * lineHeight;

    // Safety clamp: if total text height exceeds safe area, scale font size down so it fits completely
    if (totalH > safeH) {
      const scale = safeH / totalH;
      actualFontSize = Math.max(18, Math.floor(actualFontSize * scale));
      lineHeight = Math.round(actualFontSize * lineHeightMultiplier);
      normFont = `400 ${actualFontSize}px ${FONT_FAMILIES.serifNarrative}`;
      empFont = `700 ${actualFontSize}px ${FONT_FAMILIES.serifDisplay}`;
      ctx.font = normFont;
      spaceW = measureWordWidth(ctx, ' ', normFont);
      timedLines = wrapTimedWords(ctx, words, targetMaxW, {
        baseFont: normFont,
        getWordFont: (w) => resolveWordFont(w, actualFontSize).font
      });
      totalH = timedLines.length * lineHeight;
    }

    const cx = (typeof optCX === 'number') ? optCX : Math.round(bounds.x + bounds.width / 2);
    const rawCY = (typeof optCY === 'number') ? optCY : Math.round(bounds.y + bounds.height / 2);

    // Clamp cy so the text block stays strictly within [safeTop, safeBottom]
    const halfH = totalH / 2;
    const clampedCY = Math.round(Math.max(safeTop + halfH, Math.min(safeBottom - halfH, rawCY)));
    const startY = Math.round(clampedCY - halfH + lineHeight / 2);

    timedLines.forEach((line, lineIdx) => {
      const lineY = Math.round(startY + lineIdx * lineHeight);
      const totalLineWidth = line.width;

      // Stable anchored start X: centered line, completely invariant across emergence
      let currentX = Math.round(cx - totalLineWidth / 2);

      for (let j = 0; j < line.words.length; j++) {
        const w = line.words[j];
        const fontMeta = resolveWordFont(w, actualFontSize);
        const fontToUse = fontMeta.font;
        const fullW = measureWordWidth(ctx, w.text, fontToUse);
        const hasSpace = (w.hasSpace !== false) && (j < line.words.length - 1);
        const wordSpaceW = (fontMeta.isPunch || fontMeta.isEmp) ? Math.round(spaceW * 1.35) : spaceW;
        const wordBaseX = currentX;

        // Advance currentX stably for next word slot
        currentX += Math.round(fullW + (hasSpace ? wordSpaceW : 0));

        const em = computeWordEmergence(w, currentTimeMs, { reducedMotion });
        if (!em.isVisible) continue;

        ctx.font = fontToUse;
        ctx.save();

        const wordCenterX = Math.round(wordBaseX + fullW / 2);
        const yOffset = reducedMotion ? 0 : Math.round(em.yOffset);
        // Shared typographic baseline: baseline offset lifts larger punch words so baseline aligns seamlessly
        const baselineOffset = Math.round((fontMeta.fontSize - actualFontSize) * 0.22);
        const wordCenterY = Math.round(lineY - baselineOffset - yOffset);
        ctx.translate(wordCenterX, wordCenterY);

        const wordAlpha = Math.min(1.0, Math.max(0.0, fadeAlpha * em.opacity));
        ctx.globalAlpha = wordAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (em.isCurrent) {
          // Active singing word: pure brilliant text color
          ctx.fillStyle = palette.textColor;
          ctx.fillText(w.text, 0, 0);
        } else if (em.isSung) {
          // Already sung word: stable secondary illumination
          const sungAlpha = (fontMeta.isEmp || fontMeta.isPunch) ? 0.95 : 0.85;
          ctx.fillStyle = (palette && palette.textRgb)
            ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, ${sungAlpha})`
            : palette.textColor;
          ctx.fillText(w.text, 0, 0);
        } else {
          // Emerging word: gentle luminous arrival with opacity ramp
          const a = 0.50 + 0.50 * em.factor;
          ctx.fillStyle = (palette && palette.textRgb)
            ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, ${(a * 0.9).toFixed(3)})`
            : palette.textColor;
          ctx.fillText(w.text, 0, 0);
        }

        ctx.restore();
      }
    });
  }

  /**
   * Renders vertical margin rail typography (pinned to left or right screen border).
   * Words appear downwards along the vertical rail, with earlier words shifting to adjust.
   */
  function renderCinematicVerticalRail(ctx, options, alignment = 'vertical_left') {
    const {
      words = [],
      currentTimeMs,
      bounds,
      palette,
      actualFontSize: initFontSize = 48,
      emphasizedWord,
      fadeAlpha = 1.0,
      reducedMotion = false
    } = options;

    if (!words || !words.length || !bounds) return;

    // For longer phrases (4+ words), a single-column vertical rail is unreadable and inevitably overflows vertically.
    // Gracefully route normal phrases to horizontal fluid layout for optimal legibility and containment.
    if (words.length > 3) {
      renderCinematicHorizontalFluid(ctx, options);
      return;
    }

    const isLeft = alignment === 'vertical_left';
    const marginRatio = (options.composition && options.composition.railMargin) ? options.composition.railMargin : 0.08;
    const railX = isLeft
      ? (bounds.x + Math.round(bounds.width * marginRatio))
      : (bounds.x + bounds.width - Math.round(bounds.width * marginRatio));

    // Safe vertical bounds: clear top exit button (top 20px, height 38px) and bottom seal (bottom - 24px)
    const safeTop = bounds.y + Math.max(72, Math.round(bounds.height * 0.12));
    const safeBottom = bounds.y + bounds.height - Math.max(64, Math.round(bounds.height * 0.10));
    const safeH = Math.max(80, safeBottom - safeTop);

    let currentFontSize = options.actualFontSize || initFontSize;
    let itemH = Math.round(currentFontSize * 1.35);
    let totalRailH = words.length * itemH;

    if (totalRailH > safeH) {
      itemH = Math.floor(safeH / words.length);
      currentFontSize = Math.max(20, Math.floor(itemH / 1.35));
      totalRailH = words.length * itemH;
    }

    const normFont = `400 ${currentFontSize}px ${FONT_FAMILIES.serifNarrative}`;
    const empFont = `700 ${currentFontSize}px ${FONT_FAMILIES.serifDisplay}`;

    // Stable total rail height and anchored vertical center within safe boundaries
    const rawCY = (typeof options.cy === 'number') ? options.cy : Math.round(bounds.y + bounds.height / 2);
    const halfRail = totalRailH / 2;
    const clampedCY = Math.round(Math.max(safeTop + halfRail, Math.min(safeBottom - halfRail, rawCY)));
    const startY = Math.round(clampedCY - halfRail + itemH / 2);

    // Draw subtle vertical rail guideline
    ctx.save();
    ctx.strokeStyle = (palette && palette.textRgb)
      ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.12)`
      : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.0;
    const lineX = isLeft ? (railX - 16) : (railX + 16);
    ctx.beginPath();
    ctx.moveTo(lineX, clampedCY - halfRail - 20);
    ctx.lineTo(lineX, clampedCY + halfRail + 20);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const em = computeWordEmergence(word, currentTimeMs, { reducedMotion });
      if (!em.isVisible) continue;

      const wClean = (word.text || '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '').trim().toUpperCase();
      const isEmp = Boolean(emphasizedWord && wClean === emphasizedWord);
      ctx.font = isEmp ? empFont : normFont;

      ctx.save();
      const wordCenterY = Math.round(startY + i * itemH);
      const lateralShift = reducedMotion ? 0 : Math.round(isLeft ? (-12 * (1 - em.factor)) : (12 * (1 - em.factor)));
      ctx.translate(railX + lateralShift, wordCenterY);

      const wordAlpha = Math.min(1.0, Math.max(0.0, fadeAlpha * em.opacity));
      ctx.globalAlpha = wordAlpha;
      ctx.textAlign = isLeft ? 'left' : 'right';
      ctx.textBaseline = 'middle';

      if (em.isCurrent) {
        ctx.fillStyle = palette.textColor;
        ctx.fillText(word.text, 0, 0);
      } else if (em.isSung) {
        const sungAlpha = isEmp ? 0.95 : 0.85;
        ctx.fillStyle = (palette && palette.textRgb)
          ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, ${sungAlpha})`
          : palette.textColor;
        ctx.fillText(word.text, 0, 0);
      } else {
        const a = 0.50 + 0.50 * em.factor;
        ctx.fillStyle = (palette && palette.textRgb)
          ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, ${(a * 0.9).toFixed(3)})`
          : palette.textColor;
        ctx.fillText(word.text, 0, 0);
      }

      ctx.restore();
    }
  }

  /**
   * Renders vertical split hero composition.
   * A hero word anchors vertically along the left border rotated -90 degrees,
   * while remaining words unfold horizontally beside it with elastic reflow.
   */
  function renderCinematicVerticalSplit(ctx, options) {
    const {
      words = [],
      currentTimeMs,
      bounds,
      palette,
      emphasizedWord,
      fadeAlpha = 1.0,
      reducedMotion = false
    } = options;

    if (!words || !words.length || !bounds) return;

    let heroIndex = -1;
    if (emphasizedWord) {
      heroIndex = words.findIndex((w) => {
        const clean = (w.text || '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '').trim().toUpperCase();
        return clean === emphasizedWord;
      });
    }
    if (heroIndex === -1) {
      heroIndex = words.findIndex((w) => (w.text || '').trim().length >= 3);
      if (heroIndex === -1) heroIndex = 0;
    }

    const heroWord = words[heroIndex];
    const phraseWords = words.filter((_, idx) => idx !== heroIndex);

    const safeTop = bounds.y + Math.max(72, Math.round(bounds.height * 0.12));
    const safeBottom = bounds.y + bounds.height - Math.max(64, Math.round(bounds.height * 0.10));
    const safeH = Math.max(100, safeBottom - safeTop);

    // 1. Render Vertical Hero Word on Left Margin with length constraint
    const heroEm = computeWordEmergence(heroWord, currentTimeMs, { reducedMotion });
    if (heroEm.isVisible) {
      ctx.save();
      const maxHeroSpan = safeH * 0.90;
      let heroFontSize = Math.min(96, Math.max(28, Math.round(bounds.height * 0.18)));
      ctx.font = `700 ${heroFontSize}px ${FONT_FAMILIES.serifDisplay}`;
      let heroW = measureWordWidth(ctx, heroWord.text, `700 ${heroFontSize}px ${FONT_FAMILIES.serifDisplay}`);

      if (heroW > maxHeroSpan) {
        heroFontSize = Math.max(20, Math.floor(heroFontSize * (maxHeroSpan / heroW)));
        ctx.font = `700 ${heroFontSize}px ${FONT_FAMILIES.serifDisplay}`;
      }

      const heroX = bounds.x + Math.round(bounds.width * 0.08);
      const heroY = bounds.y + Math.round(bounds.height / 2);

      ctx.translate(heroX, heroY);
      ctx.rotate(-Math.PI / 2);

      ctx.globalAlpha = Math.min(1.0, Math.max(0.0, fadeAlpha * heroEm.opacity));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (heroEm.isCurrent) {
        ctx.fillStyle = palette.textColor;
        ctx.fillText(heroWord.text, 0, 0);
      } else if (heroEm.isSung) {
        ctx.fillStyle = (palette && palette.textRgb)
          ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.90)`
          : palette.textColor;
        ctx.fillText(heroWord.text, 0, 0);
      } else {
        const a = 0.50 + 0.50 * heroEm.factor;
        ctx.fillStyle = (palette && palette.textRgb)
          ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, ${(a * 0.9).toFixed(3)})`
          : palette.textColor;
        ctx.fillText(heroWord.text, 0, 0);
      }

      ctx.restore();
    }

    // 2. Render Remaining Phrase Words Horizontally (Shifted Right)
    if (phraseWords.length > 0) {
      const phraseCX = bounds.x + bounds.width * 0.58;
      const phraseMaxW = bounds.width * 0.68;
      const phraseBaseSize = options.fontSizeOverride || Math.max(26, Math.min(72, Math.round(bounds.height * 0.13)));
      const phraseLineHeight = Math.round(phraseBaseSize * 1.30);

      renderCinematicHorizontalFluid(ctx, {
        ...options,
        words: phraseWords,
        cx: phraseCX,
        cy: bounds.y + bounds.height / 2,
        maxTextW: phraseMaxW,
        actualFontSize: phraseBaseSize,
        lineHeight: phraseLineHeight
      });
    }
  }

  /**
   * Renders Style A (Editorial Lowercase Narrative Serif) with Enhanced LRC word timing.
   */
  function renderStyleA(ctx, options) {
    const {
      text = '',
      words = [],
      currentTimeMs = null,
      bounds,
      palette,
      fontSizeOverride = null,
      emphasizedWord: empWordOpt = null,
      scene = null,
      composition = null
    } = options;

    if ((!text && (!words || !words.length)) || !bounds) return;

    ctx.save();
    const compXOffset = composition ? (composition.textXOffset || 0) : (options.textXOffset || 0);
    const compYOffset = composition ? (composition.textYOffset || 0) : (options.textYOffset || 0);
    const cx = bounds.x + bounds.width / 2 + compXOffset;
    const cy = bounds.y + bounds.height / 2 + compYOffset;

    const safeTop = bounds.y + Math.max(72, Math.round(bounds.height * 0.12));
    const safeBottom = bounds.y + bounds.height - Math.max(64, Math.round(bounds.height * 0.10));
    const safeH = Math.max(100, safeBottom - safeTop);

    const maxTextW = bounds.width * 0.86;
    const maxTextH = safeH;

    const emphasizedWord = empWordOpt || (scene && scene.emphasizedWord) || null;

    // Adaptive base font size: scales gracefully in horizontal widescreen and elevates for 1 to 3 words
    const wordCount = (words && words.length) ? words.length : (text ? text.trim().split(/\s+/).length : 1);
    let defaultBase = Math.round(bounds.height * 0.14);
    if (wordCount <= 3) {
      defaultBase = Math.round(bounds.height * (wordCount === 1 ? 0.22 : (wordCount === 2 ? 0.18 : 0.15)));
    }
    const baseFontSize = fontSizeOverride || Math.max(30, Math.min(84, defaultBase));
    ctx.font = `400 ${baseFontSize}px ${FONT_FAMILIES.serifNarrative}`;

    const mutedColor = (palette && palette.textRgb)
      ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.32)`
      : 'rgba(255, 255, 255, 0.32)';

    const hasTimedWords = Array.isArray(words) && words.length > 0 && typeof currentTimeMs === 'number' && typeof words[0].timeMs === 'number';

    if (hasTimedWords) {
      const isCinematicMode = Boolean(
        options.isCinematic ||
        (options.scene && options.scene.isCinematic) ||
        options.wordAppearance === 'appear'
      );

      const typographyLayout = (composition && composition.typographyLayout)
        || (scene && scene.typographyLayout)
        || (options.typographyLayout)
        || 'horizontal_fluid';

      if (isCinematicMode) {
        const resolveFontForWrap = (w) => {
          if (w && (w.isPunchWord || (w.scaleMultiplier && w.scaleMultiplier > 1.05))) {
            const mult = w.scaleMultiplier || 1.65;
            const punchSize = Math.round(baseFontSize * mult);
            return `700 ${punchSize}px ${FONT_FAMILIES.serifDisplay}`;
          }
          if (emphasizedWord) {
            const clean = (w && w.text ? w.text : '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '').trim().toUpperCase();
            if (clean === emphasizedWord) {
              return `700 ${baseFontSize}px ${FONT_FAMILIES.serifDisplay}`;
            }
          }
          return `400 ${baseFontSize}px ${FONT_FAMILIES.serifNarrative}`;
        };
        let timedLines = wrapTimedWords(ctx, words, maxTextW, {
          baseFont: `400 ${baseFontSize}px ${FONT_FAMILIES.serifNarrative}`,
          getWordFont: resolveFontForWrap
        });
        const hasPunchWord = words.some(w => w && (w.isPunchWord || (w.scaleMultiplier && w.scaleMultiplier > 1.05)));
        let lineHeight = Math.round(baseFontSize * (hasPunchWord ? 1.60 : 1.30));
        let totalH = timedLines.length * lineHeight;
        let actualFontSize = baseFontSize;

        if (totalH > safeH) {
          actualFontSize = Math.max(20, Math.round(baseFontSize * (safeH / totalH)));
          lineHeight = Math.round(actualFontSize * (hasPunchWord ? 1.60 : 1.30));
          ctx.font = `400 ${actualFontSize}px ${FONT_FAMILIES.serifNarrative}`;
          const resolveFontForClamped = (w) => {
            if (w && (w.isPunchWord || (w.scaleMultiplier && w.scaleMultiplier > 1.05))) {
              const mult = w.scaleMultiplier || 1.65;
              const punchSize = Math.round(actualFontSize * mult);
              return `700 ${punchSize}px ${FONT_FAMILIES.serifDisplay}`;
            }
            if (emphasizedWord) {
              const clean = (w && w.text ? w.text : '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '').trim().toUpperCase();
              if (clean === emphasizedWord) {
                return `700 ${actualFontSize}px ${FONT_FAMILIES.serifDisplay}`;
              }
            }
            return `400 ${actualFontSize}px ${FONT_FAMILIES.serifNarrative}`;
          };
          timedLines = wrapTimedWords(ctx, words, maxTextW, {
            baseFont: `400 ${actualFontSize}px ${FONT_FAMILIES.serifNarrative}`,
            getWordFont: resolveFontForClamped
          });
          totalH = timedLines.length * lineHeight;
        }

        const renderParams = {
          ...options,
          actualFontSize,
          lineHeight,
          cx,
          cy,
          maxTextW,
          maxTextH: safeH,
          emphasizedWord
        };

        if (typographyLayout === 'vertical_split') {
          renderCinematicVerticalSplit(ctx, renderParams);
        } else if (typographyLayout === 'vertical_left' || typographyLayout === 'vertical_right') {
          renderCinematicVerticalRail(ctx, renderParams, typographyLayout);
        } else {
          renderCinematicHorizontalFluid(ctx, renderParams);
        }

        ctx.restore();
        return;
      }

      // Classic non-cinematic progressive karaoke sweeping rendering
      let timedLines = wrapTimedWords(ctx, words, maxTextW);
      let lineHeight = baseFontSize * 1.32;
      let totalH = timedLines.length * lineHeight;
      let actualFontSize = baseFontSize;

      if (totalH > maxTextH) {
        actualFontSize = Math.max(26, Math.round(baseFontSize * (maxTextH / totalH)));
        lineHeight = actualFontSize * 1.32;
        ctx.font = `400 ${actualFontSize}px ${FONT_FAMILIES.serifNarrative}`;
        timedLines = wrapTimedWords(ctx, words, maxTextW);
        totalH = timedLines.length * lineHeight;
      }

      ctx.textBaseline = 'middle';
      const startY = cy - totalH / 2 + lineHeight / 2;
      const spaceW = ctx.measureText(' ').width;

      timedLines.forEach((line, idx) => {
        const lineY = startY + idx * lineHeight;
        let wordX = cx - line.width / 2;

        for (let j = 0; j < line.words.length; j++) {
          const w = line.words[j];
          const wClean = (w.text || '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '').trim().toUpperCase();
          const isEmp = Boolean(emphasizedWord && wClean === emphasizedWord);

          if (isEmp) {
            ctx.font = `700 ${actualFontSize}px ${FONT_FAMILIES.serifDisplay}`;
          } else {
            ctx.font = `400 ${actualFontSize}px ${FONT_FAMILIES.serifNarrative}`;
          }

          const wW = ctx.measureText(w.text).width;
          const hasSpace = (w.hasSpace !== false) && (j < line.words.length - 1);

          const wordEnd = (typeof w.endMs === 'number') ? w.endMs : (w.timeMs + 400);
          const isSung = currentTimeMs >= wordEnd;
          const isCurrent = (currentTimeMs >= w.timeMs) && (!isSung);

          const wordMutedColor = isEmp
            ? ((palette && palette.textRgb) ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.58)` : 'rgba(255, 255, 255, 0.58)')
            : mutedColor;

          const wordSungColor = (isEmp || !emphasizedWord)
            ? palette.textColor
            : ((palette && palette.textRgb) ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.88)` : palette.textColor);

          ctx.textAlign = 'left';
          const isCinematicMode = Boolean(
            options.isCinematic ||
            (options.scene && options.scene.isCinematic) ||
            options.wordAppearance === 'appear'
          );

          if (isCinematicMode) {
            if (isCurrent) {
              // Cinematic word appear: discrete luminous illumination with subtle emergence (not progressive completing/filling)
              const dur = Math.max(1, wordEnd - w.timeMs);
              const elapsed = currentTimeMs - w.timeMs;
              const appearDur = Math.min(90, Math.max(30, dur * 0.2));
              const appearProgress = Math.min(1.0, Math.max(0.0, elapsed / appearDur));
              const easeAppear = appearProgress < 0.5 ? 2 * appearProgress * appearProgress : 1 - Math.pow(-2 * appearProgress + 2, 2) / 2;

              ctx.save();
              ctx.fillStyle = palette.textColor;
              if (easeAppear < 0.99 && palette && palette.textRgb) {
                const a = 0.45 + 0.55 * easeAppear;
                ctx.fillStyle = `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, ${a.toFixed(3)})`;
              }
              // Subtle optical lift for active singing word
              ctx.translate(0, -1.8 * easeAppear);
              ctx.fillText(w.text, wordX, lineY);
              ctx.restore();
            } else if (isSung) {
              // Already sung word: stable secondary hierarchy
              ctx.fillStyle = wordSungColor;
              ctx.fillText(w.text, wordX, lineY);
            } else {
              // Upcoming word: muted resting hierarchy
              ctx.fillStyle = wordMutedColor;
              ctx.fillText(w.text, wordX, lineY);
            }
          } else {
            if (isCurrent) {
              // Active word: progressive sweep + luminous highlight
              const dur = Math.max(1, wordEnd - w.timeMs);
              const p = Math.min(1.0, Math.max(0.0, (currentTimeMs - w.timeMs) / dur));

              // Unlit base
              ctx.fillStyle = wordMutedColor;
              ctx.fillText(w.text, wordX, lineY);

              // Progressive lit sweep
              ctx.save();
              ctx.beginPath();
              ctx.rect(wordX - 1, lineY - actualFontSize, (wW + 2) * p, actualFontSize * 2);
              ctx.clip();
              ctx.fillStyle = palette.textColor;
              ctx.fillText(w.text, wordX, lineY);
              ctx.restore();
            } else if (isSung) {
              // Already sung word
              ctx.fillStyle = wordSungColor;
              ctx.fillText(w.text, wordX, lineY);
            } else {
              // Upcoming word
              ctx.fillStyle = wordMutedColor;
              ctx.fillText(w.text, wordX, lineY);
            }
          }

          wordX += wW + (hasSpace ? spaceW : 0);
        }
      });
    } else {
      // Static text fallback
      const safeTop = bounds.y + Math.max(72, Math.round(bounds.height * 0.12));
      const safeBottom = bounds.y + bounds.height - Math.max(64, Math.round(bounds.height * 0.10));
      const safeH = Math.max(100, safeBottom - safeTop);

      let { lines } = measureWrappedLines(ctx, text.toLowerCase(), maxTextW);
      let lineHeight = Math.round(baseFontSize * 1.30);
      let totalH = lines.length * lineHeight;
      let actualFontSize = baseFontSize;

      if (totalH > safeH) {
        actualFontSize = Math.max(22, Math.round(baseFontSize * (safeH / totalH)));
        lineHeight = Math.round(actualFontSize * 1.30);
        ctx.font = `400 ${actualFontSize}px ${FONT_FAMILIES.serifNarrative}`;
        lines = measureWrappedLines(ctx, text.toLowerCase(), maxTextW).lines;
        totalH = lines.length * lineHeight;
      }

      ctx.fillStyle = palette.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const halfH = totalH / 2;
      const clampedCY = Math.round(Math.max(safeTop + halfH, Math.min(safeBottom - halfH, cy)));
      const startY = Math.round(clampedCY - halfH + lineHeight / 2);
      lines.forEach((line, idx) => {
        ctx.fillText(line, cx, startY + idx * lineHeight);
      });
    }

    ctx.restore();
  }

  /**
   * Renders Style B (Giant Ultra-Condensed Display Serif Punch Word).
   */
  function renderStyleB(ctx, options) {
    const {
      primaryText = '',
      secondaryText = '',
      secondaryPosition = 'below',
      words = [],
      currentTimeMs = null,
      bounds,
      palette,
      composition = null
    } = options;

    if (!primaryText || !bounds) return;

    ctx.save();
    const compXOffset = composition ? (composition.textXOffset || 0) : (options.textXOffset || 0);
    const compYOffset = composition ? (composition.textYOffset || 0) : (options.textYOffset || 0);
    const cx = bounds.x + bounds.width / 2 + compXOffset;
    const rawCY = bounds.y + bounds.height / 2 + compYOffset;

    const safeTop = bounds.y + Math.max(72, Math.round(bounds.height * 0.12));
    const safeBottom = bounds.y + bounds.height - Math.max(64, Math.round(bounds.height * 0.10));
    const safeH = Math.max(100, safeBottom - safeTop);

    const upperText = primaryText.trim().toUpperCase();
    const targetW = bounds.width * 0.88;

    const fontTemplate = `700 {size} ${FONT_FAMILIES.serifDisplay}`;
    const maxPrimaryH = secondaryText ? safeH * 0.52 : safeH * 0.72;
    const rawFontSize = computeFitFontSize(ctx, upperText, fontTemplate, targetW, maxPrimaryH, 36, 160);

    const verticalStretch = 1.15;
    let displaySize = Math.round(rawFontSize);

    let secSize = secondaryText ? Math.round(displaySize * 0.24) : 0;
    let secYOffset = secondaryText ? ((displaySize * verticalStretch) / 2 + secSize * 1.2) : 0;
    let totalBlockH = (displaySize * verticalStretch) + (secondaryText ? (secSize * 1.2 + secSize) : 0);

    if (totalBlockH > safeH) {
      const scale = safeH / totalBlockH;
      displaySize = Math.max(26, Math.floor(displaySize * scale));
      secSize = secondaryText ? Math.round(displaySize * 0.24) : 0;
      secYOffset = secondaryText ? ((displaySize * verticalStretch) / 2 + secSize * 1.2) : 0;
      totalBlockH = (displaySize * verticalStretch) + (secondaryText ? (secSize * 1.2 + secSize) : 0);
    }

    const halfBlock = totalBlockH / 2;
    const cy = Math.round(Math.max(safeTop + halfBlock, Math.min(safeBottom - halfBlock, rawCY)));

    const mutedColor = (palette && palette.textRgb)
      ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.32)`
      : 'rgba(255, 255, 255, 0.32)';

    let isLit = true;
    let litRatio = 1.0;
    if (Array.isArray(words) && words.length > 0 && typeof currentTimeMs === 'number') {
      const firstStart = words[0].timeMs;
      if (typeof firstStart === 'number') {
        if (currentTimeMs < firstStart) {
          isLit = false;
          litRatio = 0.0;
        } else {
          const litDur = 180;
          const litElapsed = currentTimeMs - firstStart;
          litRatio = Math.min(1.0, Math.max(0.0, litElapsed / litDur));
          isLit = litRatio >= 0.99;
        }
      }
    }

    let punchColor = isLit ? palette.textColor : mutedColor;
    if (!isLit && litRatio > 0.01 && palette && palette.textRgb) {
      const alpha = 0.32 + 0.68 * litRatio;
      punchColor = `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, ${alpha.toFixed(3)})`;
    }

    ctx.fillStyle = punchColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (secondaryText) {
      ctx.font = `italic 400 ${secSize}px ${FONT_FAMILIES.serifNarrative}`;
      ctx.fillStyle = isLit ? (palette.subtitleColor || palette.textColor) : mutedColor;
      const secY = secondaryPosition === 'above' ? cy - secYOffset : cy + secYOffset;
      ctx.fillText(secondaryText.toLowerCase(), cx, secY);
    }

    // Draw primary giant display word with optical vertical stretch
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.0, verticalStretch);
    ctx.font = `700 ${displaySize}px ${FONT_FAMILIES.serifDisplay}`;
    ctx.fillText(upperText, 0, 0);
    if (typeof ctx.strokeText === 'function') {
      ctx.lineWidth = Math.max(1.0, displaySize * 0.015);
      ctx.strokeStyle = punchColor;
      ctx.strokeText(upperText, 0, 0);
    }
    ctx.restore();

    ctx.restore();
  }

  /**
   * Renders Style C (50/50 Split-Card Climax Layout with Duotone Artwork).
   */
  function renderStyleC(ctx, options) {
    const {
      text = '',
      words = [],
      currentTimeMs = null,
      creatorTag = '',
      artworkImage = null,
      bounds,
      palette,
      colorEngine
    } = options;

    if (!bounds) return;

    ctx.save();

    const { x, y, width, height, cornerRadius = 32 } = bounds;
    const splitY = y + height * 0.48; // 48% top typography, 52% bottom image
    const topH = splitY - y;
    const botH = height - topH;

    // Clip to rounded card bounds
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, cornerRadius);
    } else {
      ctx.rect(x, y, width, height);
    }
    ctx.clip();

    // 1. Top Half: Typography & Header
    const cx = x + width / 2;
    if (creatorTag) {
      ctx.font = `500 14px ${FONT_FAMILIES.metaSans}`;
      ctx.fillStyle = palette.subtitleColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(creatorTag, cx, y + 28);
    }

    // Primary climax text in top half
    const topText = text.trim().toUpperCase();
    const topTargetW = width * 0.82;
    const fontTemplate = `700 {size} ${FONT_FAMILIES.serifDisplay}`;
    const climaxFontSize = computeFitFontSize(ctx, topText, fontTemplate, topTargetW, topH * 0.55, 36, 140);

    const mutedColor = (palette && palette.textRgb)
      ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.32)`
      : 'rgba(255, 255, 255, 0.32)';

    let isLit = true;
    let litRatio = 1.0;
    if (Array.isArray(words) && words.length > 0 && typeof currentTimeMs === 'number') {
      const firstStart = words[0].timeMs;
      if (typeof firstStart === 'number') {
        if (currentTimeMs < firstStart) {
          isLit = false;
          litRatio = 0.0;
        } else {
          const litDur = 180;
          const litElapsed = currentTimeMs - firstStart;
          litRatio = Math.min(1.0, Math.max(0.0, litElapsed / litDur));
          isLit = litRatio >= 0.99;
        }
      }
    }

    let climaxColor = isLit ? palette.textColor : mutedColor;
    if (!isLit && litRatio > 0.01 && palette && palette.textRgb) {
      const alpha = 0.32 + 0.68 * litRatio;
      climaxColor = `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, ${alpha.toFixed(3)})`;
    }

    ctx.save();
    const textCenterY = y + (creatorTag ? 36 : 0) + (topH - (creatorTag ? 36 : 0)) / 2;
    ctx.translate(cx, textCenterY);
    ctx.scale(1.0, 1.12);
    ctx.font = `700 ${climaxFontSize}px ${FONT_FAMILIES.serifDisplay}`;
    ctx.fillStyle = climaxColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(topText, 0, 0);
    if (typeof ctx.strokeText === 'function') {
      ctx.lineWidth = Math.max(1.0, climaxFontSize * 0.015);
      ctx.strokeStyle = climaxColor;
      ctx.strokeText(topText, 0, 0);
    }
    ctx.restore();

    // 2. Bottom Half: Duotone Cropped Artwork
    if (artworkImage && colorEngine && typeof colorEngine.renderDuotoneImage === 'function') {
      const artW = artworkImage.naturalWidth || artworkImage.width || 500;
      const artH = artworkImage.naturalHeight || artworkImage.height || 500;
      const cropSize = Math.min(artW, artH);
      const cropX = (artW - cropSize) / 2;
      const cropY = (artH - cropSize) / 2;

      colorEngine.renderDuotoneImage(
        ctx,
        artworkImage,
        cropX, cropY, cropSize, cropSize,
        x, splitY, width, botH,
        palette.cardRgb,
        palette.textRgb
      );
    } else if (artworkImage) {
      ctx.drawImage(artworkImage, x, splitY, width, botH);
    }

    // 3. Center Divider & Badge
    const baseAlpha = (typeof options.fadeAlpha === 'number') ? options.fadeAlpha : 1.0;
    ctx.beginPath();
    ctx.strokeStyle = palette.textColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35 * baseAlpha;
    ctx.moveTo(x, splitY);
    ctx.lineTo(x + width, splitY);
    ctx.stroke();
    ctx.globalAlpha = baseAlpha;

    // Center star emblem badge at divider
    const badgeR = 16;
    ctx.fillStyle = palette.cardColor;
    ctx.beginPath();
    ctx.arc(cx, splitY, badgeR, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = palette.textColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = palette.textColor;
    ctx.font = '700 13px "Bodoni Moda", serif, "Segoe UI Emoji"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', cx, splitY + 1);

    ctx.restore();
  }

  return {
    FONT_FAMILIES,
    measureWrappedLines,
    computeFitFontSize,
    wrapTimedWords,
    computeWordEmergence,
    renderCinematicHorizontalFluid,
    renderCinematicVerticalRail,
    renderCinematicVerticalSplit,
    renderStyleA,
    renderStyleB,
    renderStyleC
  };
});
