/**
 * LyricFlow - Lyric Share Card Generator Module
 */

function generateShareCard() {
  const widgetAlbumArt = document.getElementById("widget-album-art");
  const widgetTrackName = document.getElementById("widget-track-name");
  const widgetArtistName = document.getElementById("widget-artist-name");

  if (!lyrics || lyrics.length === 0 || activeLineIndex < 0 || activeLineIndex >= lyrics.length) {
    showToast("No lyric active to share!", 2000, 'warning');
    return;
  }

  showToast("Generating share card...", 2000);

  const text = lyrics[activeLineIndex].text;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080; // Square format for Instagram/Twitter
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#121212';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const albumUrl = widgetAlbumArt ? widgetAlbumArt.src : '';
  if (!albumUrl || albumUrl.includes('data:image')) {
     drawTextOnlyCard(ctx, text, canvas, widgetTrackName, widgetArtistName);
     finishShareCard(canvas);
     return;
  }

  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = () => {
    // Draw blurred background
    ctx.filter = 'blur(40px) brightness(0.4)';
    ctx.drawImage(img, -100, -100, canvas.width + 200, canvas.height + 200);
    ctx.filter = 'none';

    // Draw Album Art thumbnail
    const thumbSize = 260;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.drawImage(img, canvas.width / 2 - thumbSize / 2, 180, thumbSize, thumbSize);
    ctx.restore();

    drawTextOnlyCard(ctx, text, canvas, widgetTrackName, widgetArtistName);
    finishShareCard(canvas);
  };
  img.onerror = () => {
     drawTextOnlyCard(ctx, text, canvas, widgetTrackName, widgetArtistName);
     finishShareCard(canvas);
  };
  img.src = albumUrl;
}

function drawTextOnlyCard(ctx, text, canvas, widgetTrackName, widgetArtistName) {
  // Lyric text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Wrap text
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0] || '';
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < 880) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  const lineHeight = 90;
  const startY = canvas.height / 2 + 100 - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
  });

  // Track info
  const trackStr = widgetTrackName ? widgetTrackName.textContent : "";
  const artistStr = widgetArtistName ? widgetArtistName.textContent : "";

  ctx.font = 'bold 36px "Segoe UI", sans-serif';
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#1DB954';
  ctx.fillText(trackStr, canvas.width / 2, canvas.height - 140);

  ctx.font = 'normal 26px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText(artistStr, canvas.width / 2, canvas.height - 90);

  // Watermark
  ctx.font = 'bold 20px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillText("LyricFlow", canvas.width / 2, canvas.height - 40);
}

function finishShareCard(canvas) {
  canvas.toBlob(blob => {
    if (!blob) {
      showToast("Failed to generate image.", 2500, 'warning');
      return;
    }
    const item = new window.ClipboardItem({ "image/png": blob });
    navigator.clipboard.write([item]).then(() => {
      showToast("Share Card copied to clipboard!", 2500, 'success');
    }).catch(err => {
      console.error("Failed to write to clipboard:", err);
      showToast("Failed to copy image.", 2500, 'warning');
    });
  });
}

// Expose on global window object
window.generateShareCard = generateShareCard;
