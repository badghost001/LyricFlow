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
    serifDisplay: '"Bodoni Moda", "Didot", "Castoro Titling", "Times New Roman", serif',
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

  /**
   * Wraps timed words into lines respecting max width.
   */
  function wrapTimedWords(ctx, words, maxWidth) {
    if (!words || !words.length) return [];
    const lines = [];
    let currentWords = [];
    let currentW = 0;
    const spaceW = ctx.measureText(' ').width;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const wW = ctx.measureText(w.text).width;
      const prevWord = currentWords[currentWords.length - 1];
      const needsSpace = prevWord ? (prevWord.hasSpace !== false) : false;
      const addW = currentWords.length === 0 ? wW : ((needsSpace ? spaceW : 0) + wW);

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
   * Renders Style A (Editorial Lowercase Narrative Serif) with Enhanced LRC word timing.
   */
  function renderStyleA(ctx, options) {
    const {
      text = '',
      words = [],
      currentTimeMs = null,
      bounds,
      palette,
      fontSizeOverride = null
    } = options;

    if ((!text && (!words || !words.length)) || !bounds) return;

    ctx.save();
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;

    const maxTextW = bounds.width * 0.86;
    const maxTextH = bounds.height * 0.55;

    // Adaptive base font size: scales gracefully in horizontal widescreen and elevates for 1 to 3 words
    const wordCount = (words && words.length) ? words.length : (text ? text.trim().split(/\s+/).length : 1);
    let defaultBase = Math.round(bounds.height * 0.16);
    if (wordCount <= 3) {
      defaultBase = Math.round(bounds.height * (wordCount === 1 ? 0.28 : (wordCount === 2 ? 0.22 : 0.18)));
    }
    const baseFontSize = fontSizeOverride || Math.max(34, Math.min(96, defaultBase));
    ctx.font = `400 ${baseFontSize}px ${FONT_FAMILIES.serifNarrative}`;

    const mutedColor = (palette && palette.textRgb)
      ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.32)`
      : 'rgba(255, 255, 255, 0.32)';

    const hasTimedWords = Array.isArray(words) && words.length > 0 && typeof currentTimeMs === 'number' && typeof words[0].timeMs === 'number';

    if (hasTimedWords) {
      // Word-by-word timed rendering
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
          const wW = ctx.measureText(w.text).width;
          const hasSpace = (w.hasSpace !== false) && (j < line.words.length - 1);

          const wordEnd = (typeof w.endMs === 'number') ? w.endMs : (w.timeMs + 400);
          const isSung = currentTimeMs >= wordEnd;
          const isCurrent = (currentTimeMs >= w.timeMs) && (!isSung);

          ctx.textAlign = 'left';
          if (isCurrent) {
            // Active word: progressive sweep + luminous highlight
            const dur = Math.max(1, wordEnd - w.timeMs);
            const p = Math.min(1.0, Math.max(0.0, (currentTimeMs - w.timeMs) / dur));

            // Unlit base
            ctx.fillStyle = mutedColor;
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
            ctx.fillStyle = palette.textColor;
            ctx.fillText(w.text, wordX, lineY);
          } else {
            // Upcoming word
            ctx.fillStyle = mutedColor;
            ctx.fillText(w.text, wordX, lineY);
          }

          wordX += wW + (hasSpace ? spaceW : 0);
        }
      });
    } else {
      // Static text fallback
      let { lines } = measureWrappedLines(ctx, text.toLowerCase(), maxTextW);
      let lineHeight = baseFontSize * 1.30;
      let totalH = lines.length * lineHeight;
      let actualFontSize = baseFontSize;

      if (totalH > maxTextH) {
        actualFontSize = Math.max(26, Math.round(baseFontSize * (maxTextH / totalH)));
        lineHeight = actualFontSize * 1.30;
        ctx.font = `400 ${actualFontSize}px ${FONT_FAMILIES.serifNarrative}`;
        lines = measureWrappedLines(ctx, text.toLowerCase(), maxTextW).lines;
        totalH = lines.length * lineHeight;
      }

      ctx.fillStyle = palette.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const startY = cy - totalH / 2 + lineHeight / 2;
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
      palette
    } = options;

    if (!primaryText || !bounds) return;

    ctx.save();
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;

    const upperText = primaryText.trim().toUpperCase();
    const targetW = bounds.width * 0.88;

    const fontTemplate = `700 {size} ${FONT_FAMILIES.serifDisplay}`;
    const rawFontSize = computeFitFontSize(ctx, upperText, fontTemplate, targetW, bounds.height * 0.50, 48, 220);

    const verticalStretch = 1.35;
    const displaySize = Math.round(rawFontSize);

    const mutedColor = (palette && palette.textRgb)
      ? `rgba(${palette.textRgb.r}, ${palette.textRgb.g}, ${palette.textRgb.b}, 0.32)`
      : 'rgba(255, 255, 255, 0.32)';

    let isLit = true;
    if (Array.isArray(words) && words.length > 0 && typeof currentTimeMs === 'number') {
      const firstStart = words[0].timeMs;
      if (typeof firstStart === 'number' && currentTimeMs < firstStart) {
        isLit = false;
      }
    }

    ctx.fillStyle = isLit ? palette.textColor : mutedColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (secondaryText) {
      const secSize = Math.round(displaySize * 0.24);
      const secYOffset = (displaySize * verticalStretch) / 2 + secSize * 1.2;

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
    if (Array.isArray(words) && words.length > 0 && typeof currentTimeMs === 'number') {
      const firstStart = words[0].timeMs;
      if (typeof firstStart === 'number' && currentTimeMs < firstStart) {
        isLit = false;
      }
    }

    ctx.save();
    const textCenterY = y + (creatorTag ? 36 : 0) + (topH - (creatorTag ? 36 : 0)) / 2;
    ctx.translate(cx, textCenterY);
    ctx.scale(1.0, 1.30);
    ctx.font = `700 ${climaxFontSize}px ${FONT_FAMILIES.serifDisplay}`;
    ctx.fillStyle = isLit ? palette.textColor : mutedColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(topText, 0, 0);
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
    ctx.beginPath();
    ctx.strokeStyle = palette.textColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.moveTo(x, splitY);
    ctx.lineTo(x + width, splitY);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

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
    renderStyleA,
    renderStyleB,
    renderStyleC
  };
});
