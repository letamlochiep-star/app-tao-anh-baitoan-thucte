import saveAs from 'file-saver';

/**
 * Ensures data URL or string is properly formatted for <img> src attribute.
 */
export function getSafeImageSrc(dataUrl?: string): string {
  if (!dataUrl) return '';
  const trimmed = dataUrl.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  if (trimmed.startsWith('<svg') || trimmed.includes('</svg>')) {
    try {
      const base64Svg = btoa(unescape(encodeURIComponent(trimmed)));
      return `data:image/svg+xml;base64,${base64Svg}`;
    } catch (e) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
    }
  }
  // Assume raw base64 PNG if no prefix
  return `data:image/png;base64,${trimmed}`;
}

/**
 * Converts SVG data URL (or raw SVG XML) to a high-quality PNG Data URL using HTML5 Canvas.
 * This guarantees 100% compatibility with Windows Photo Viewer, Microsoft Word, and phones.
 */
export function convertSvgToPngDataUrl(dataUrl: string, width = 1200, height = 675): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve('');
    if (!dataUrl.startsWith('data:image/svg+xml') && !dataUrl.includes('<svg')) {
      return resolve(dataUrl);
    }

    // Timeout guard: resolve with empty string if canvas draw takes > 2.5s
    const timer = setTimeout(() => {
      resolve('');
    }, 2500);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    let src = dataUrl;
    if (!dataUrl.startsWith('data:')) {
      try {
        const base64Svg = btoa(unescape(encodeURIComponent(dataUrl)));
        src = `data:image/svg+xml;base64,${base64Svg}`;
      } catch (e) {
        src = `data:image/svg+xml;utf8,${encodeURIComponent(dataUrl)}`;
      }
    }

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');

        // Fill solid white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngUrl = canvas.toDataURL('image/png');
        resolve(pngUrl);
      } catch (err) {
        console.error('Error rasterizing SVG to PNG canvas:', err);
        resolve('');
      }
    };

    img.onerror = (err) => {
      clearTimeout(timer);
      console.error('Error loading SVG image for canvas draw:', err);
      resolve('');
    };

    img.src = src;
  });
}

/**
 * Downloads image safely as a real PNG file (converting SVG if needed)
 * so Windows Photo Viewer will never throw "It looks like we don't support this file format".
 */
export async function downloadImageAsPng(dataUrl: string, fileNameWithoutExt: string) {
  if (!dataUrl) return;

  if (dataUrl.startsWith('data:image/svg+xml') || dataUrl.includes('<svg')) {
    try {
      const pngUrl = await convertSvgToPngDataUrl(dataUrl);
      saveAs(pngUrl, `${fileNameWithoutExt}.png`);
    } catch (e) {
      saveAs(dataUrl, `${fileNameWithoutExt}.svg`);
    }
  } else {
    saveAs(dataUrl, `${fileNameWithoutExt}.png`);
  }
}

/**
 * Downloads raw SVG vector file if available.
 */
export function downloadImageAsSvg(dataUrl: string, fileNameWithoutExt: string) {
  if (!dataUrl) return;
  if (dataUrl.startsWith('data:image/svg+xml;base64,')) {
    const base64Str = dataUrl.replace('data:image/svg+xml;base64,', '');
    try {
      const svgText = decodeURIComponent(escape(atob(base64Str)));
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      saveAs(blob, `${fileNameWithoutExt}.svg`);
      return;
    } catch (e) {
      // fallback
    }
  }
  const blob = new Blob([dataUrl], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, `${fileNameWithoutExt}.svg`);
}
