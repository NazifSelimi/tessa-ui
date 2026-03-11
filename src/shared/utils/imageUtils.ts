/**
 * Image utilities for client-side WebP conversion and optimization.
 */

/**
 * Convert an image File to WebP format using the Canvas API.
 * Falls back to the original file if conversion fails or is not supported.
 *
 * @param file     The original image file
 * @param quality  WebP quality (0–1, default 0.82)
 * @param maxWidth Maximum width in pixels (default 1920)
 * @returns A File in WebP format (or the original if conversion fails)
 */
export async function convertToWebP(
  file: File,
  quality = 0.82,
  maxWidth = 1920,
): Promise<File> {
  // Skip if already WebP
  if (file.type === 'image/webp') {
    return file;
  }

  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if too wide
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const baseName = file.name.replace(/\.[^.]+$/, '');
          const webpFile = new File([blob], `${baseName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          resolve(webpFile);
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
