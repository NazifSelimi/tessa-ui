/** Picture helpers for the canvas editor: background removal and logo. */
import { getCutout } from '../cutout';
import { logoSvg } from '../logo';
import type { ImageLayer } from './model';

export type WithOriginal = ImageLayer & { originalSrc?: string };

/** Removes a plain (white / light) background. Returns the new picture, or null if it failed. */
export async function removeBackground(layer: WithOriginal, tolerance = 20): Promise<{ src: string; originalSrc: string } | null> {
  const source = layer.originalSrc ?? layer.src;
  const img = new Image();
  if (!source.startsWith('data:') && !source.startsWith('blob:')) img.crossOrigin = 'anonymous';
  img.src = source;
  try {
    await img.decode();
    const cut = getCutout(img, { tolerance, erase: [] });
    if (!cut) return null;
    return { src: cut.toDataURL('image/png'), originalSrc: source };
  } catch {
    return null;
  }
}

/** True when the picture's corners look like a plain background worth removing. */
export async function hasPlainBackground(src: string): Promise<boolean> {
  const img = new Image();
  if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
  img.src = src;
  try {
    await img.decode();
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const at = (x: number, y: number) => { const i = (y * size + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
    const corners = [at(0, 0), at(size - 1, 0), at(0, size - 1), at(size - 1, size - 1)];
    if (corners.some((c) => c[3] < 200)) return false; // already transparent
    const [r, g, b] = corners[0];
    return corners.every((c) => Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b) < 40);
  } catch {
    return false;
  }
}

/** The shop logo as a picture, in the given colour. */
export function logoDataUrl(fill: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg(fill))}`;
}
