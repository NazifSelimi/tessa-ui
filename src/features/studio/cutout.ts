/**
 * Background remover for product photos, entirely in the browser (free, no
 * services). It flood-fills from the photo's edges: plain white, pink or grey
 * studio backgrounds that touch the border disappear, while white or pink
 * areas *inside* the product (labels, caps) stay because they are not
 * connected to the border. Edges get soft, de-haloed alpha.
 *
 * The magic eraser adds extra start points: the region around a clicked spot
 * with a similar colour is removed too.
 */

export interface CutoutSettings {
  /** 0–100: how different a colour may be from the background and still go. */
  tolerance: number;
  /** Extra spots to erase, as 0–1 of the photo's width / height. */
  erase: { x: number; y: number }[];
}

export const DEFAULT_TOLERANCE = 20;

/** Photos often have a darker 1–2 px line at the very edge; filling starts this far inside. */
const INSET = 3;

/** Larger photos are worked on at this size (still full quality for posts). */
const MAX_SIDE = 2400;

type RGB = [number, number, number];

const cache = new Map<string, HTMLCanvasElement>();
const MAX_CACHE = 24;

const keyOf = (image: HTMLImageElement, settings: CutoutSettings) =>
  `${image.currentSrc || image.src}|${Math.round(settings.tolerance)}|${settings.erase.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(';')}`;

/**
 * Plain RGB distance. It keeps light pink backdrops apart from white / light-grey
 * bottles better than "perceptual" formulas, which rate those as close.
 */
function distance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

/** The colours that make up most of the border (the studio background). */
function borderColours(data: Uint8ClampedArray, w: number, h: number, inset: number): RGB[] {
  const buckets = new Map<number, { count: number; sum: RGB }>();
  const add = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (data[i + 3] < 16) return;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const bucket = buckets.get(key) ?? { count: 0, sum: [0, 0, 0] };
    bucket.count += 1;
    bucket.sum[0] += data[i];
    bucket.sum[1] += data[i + 1];
    bucket.sum[2] += data[i + 2];
    buckets.set(key, bucket);
  };
  for (let x = inset; x < w - inset; x += 1) { add(x, inset); add(x, h - 1 - inset); }
  for (let y = inset; y < h - inset; y += 1) { add(inset, y); add(w - 1 - inset, y); }
  const total = Math.max(1, 2 * (w + h - 4 * inset));
  return [...buckets.values()]
    .filter((bucket) => bucket.count >= total * 0.04)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((bucket) => bucket.sum.map((value) => value / bucket.count) as RGB);
}

/**
 * Marks background pixels (mask = 1). Each fill keeps the exact colour it
 * started from (no drifting), so a soft product edge can never walk the fill
 * from the backdrop colour into the product. Gradients are covered because
 * every border pixel starts its own fill.
 */
function floodFill(
  data: Uint8ClampedArray, w: number, h: number, mask: Uint8Array, reference: Float32Array,
  seeds: { index: number; colour: RGB }[], tolerance: number,
) {
  const step = Math.max(5, tolerance * 0.45);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  for (const seed of seeds) {
    if (mask[seed.index]) continue;
    mask[seed.index] = 1;
    reference.set(seed.colour, seed.index * 3);
    queue[tail++] = seed.index;
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % w;
    const y = (index - x) / w;
    const p = index * 4;
    const rr = reference[index * 3];
    const rg = reference[index * 3 + 1];
    const rb = reference[index * 3 + 2];
    const neighbours = [x > 0 ? index - 1 : -1, x < w - 1 ? index + 1 : -1, y > 0 ? index - w : -1, y < h - 1 ? index + w : -1];
    for (const next of neighbours) {
      if (next < 0 || mask[next]) continue;
      const q = next * 4;
      if (data[q + 3] < 16) {
        mask[next] = 1;
        reference.set([rr, rg, rb], next * 3);
        queue[tail++] = next;
        continue;
      }
      const toReference = distance(data[q], data[q + 1], data[q + 2], rr, rg, rb);
      const toNeighbour = distance(data[q], data[q + 1], data[q + 2], data[p], data[p + 1], data[p + 2]);
      if (toReference <= tolerance && toNeighbour <= step) {
        mask[next] = 1;
        reference[next * 3] = rr;
        reference[next * 3 + 1] = rg;
        reference[next * 3 + 2] = rb;
        queue[tail++] = next;
      }
    }
  }
}

function sourceSize(image: HTMLImageElement) {
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  return { w: Math.max(1, Math.round(image.naturalWidth * scale)), h: Math.max(1, Math.round(image.naturalHeight * scale)) };
}

/** The photo with its background removed (transparent PNG-ready canvas). Cached per photo + settings. */
export function getCutout(image: HTMLImageElement, settings: CutoutSettings): HTMLCanvasElement | null {
  const key = keyOf(image, settings);
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  const { w, h } = sourceSize(image);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, w, h);

  let pixels: ImageData;
  try {
    pixels = ctx.getImageData(0, 0, w, h);
  } catch {
    return null; // photo from another website: the browser does not allow reading it
  }
  const data = pixels.data;
  // Slider 0–100 → 3–63 RGB units (20 ≈ 15: JPEG noise goes, a white bottle on pink stays).
  const tolerance = 3 + Math.max(0, Math.min(100, settings.tolerance)) * 0.6;
  const mask = new Uint8Array(w * h);
  const reference = new Float32Array(w * h * 3);

  // 1. From the border: only border pixels that look like the main background colours.
  const inset = Math.min(INSET, Math.floor(Math.min(w, h) / 4));
  const backgrounds = borderColours(data, w, h, inset);
  const seeds: { index: number; colour: RGB }[] = [];
  const trySeed = (x: number, y: number) => {
    const index = y * w + x;
    const p = index * 4;
    if (data[p + 3] < 16) {
      seeds.push({ index, colour: [255, 255, 255] });
      return;
    }
    const match = backgrounds.find((colour) => distance(data[p], data[p + 1], data[p + 2], ...colour) <= tolerance);
    if (match) seeds.push({ index, colour: [data[p], data[p + 1], data[p + 2]] });
  };
  for (let x = inset; x < w - inset; x += 1) { trySeed(x, inset); trySeed(x, h - 1 - inset); }
  for (let y = inset + 1; y < h - 1 - inset; y += 1) { trySeed(inset, y); trySeed(w - 1 - inset, y); }
  floodFill(data, w, h, mask, reference, seeds, tolerance);

  // The thin edge line outside the start ring goes wherever the background next to it went.
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const depth = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (depth >= inset) continue;
      const inner = Math.min(Math.max(y, inset), h - 1 - inset) * w + Math.min(Math.max(x, inset), w - 1 - inset);
      if (mask[inner]) {
        const index = y * w + x;
        mask[index] = 1;
        reference[index * 3] = reference[inner * 3];
        reference[index * 3 + 1] = reference[inner * 3 + 1];
        reference[index * 3 + 2] = reference[inner * 3 + 2];
      }
    }
  }

  // 2. Magic-eraser spots.
  const eraseSeeds = settings.erase.map(({ x, y }) => {
    const px = Math.min(w - 1, Math.max(0, Math.round(x * (w - 1))));
    const py = Math.min(h - 1, Math.max(0, Math.round(y * (h - 1))));
    const index = py * w + px;
    const p = index * 4;
    return { index, colour: [data[p], data[p + 1], data[p + 2]] as RGB };
  });
  if (eraseSeeds.length) floodFill(data, w, h, mask, reference, eraseSeeds, tolerance);

  // 3. Alpha with soft, de-haloed edges.
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i += 1) alpha[i] = mask[i] ? 0 : data[i * 4 + 3] / 255;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const index = y * w + x;
      if (mask[index]) continue;
      // Find a background neighbour (2 px around) and its colour.
      let bgIndex = -1;
      for (let dy = -2; dy <= 2 && bgIndex < 0; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (mask[n]) { bgIndex = n; break; }
        }
      }
      if (bgIndex < 0) continue;
      const p = index * 4;
      const br = reference[bgIndex * 3];
      const bg = reference[bgIndex * 3 + 1];
      const bb = reference[bgIndex * 3 + 2];
      const d = distance(data[p], data[p + 1], data[p + 2], br, bg, bb);
      // Pixels that are almost background colour become see-through (anti-aliased edge).
      const a = Math.max(0, Math.min(1, (d - tolerance * 0.35) / (tolerance * 1.15)));
      alpha[index] = Math.min(alpha[index], a);
      // Take the background colour back out of the edge pixel, so no pink/white halo.
      if (a > 0.02 && a < 1) {
        data[p] = Math.max(0, Math.min(255, (data[p] - br * (1 - a)) / a));
        data[p + 1] = Math.max(0, Math.min(255, (data[p + 1] - bg * (1 - a)) / a));
        data[p + 2] = Math.max(0, Math.min(255, (data[p + 2] - bb * (1 - a)) / a));
      }
    }
  }

  // 4. A light 3×3 feather on the edge only.
  const out = new Float32Array(alpha);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const index = y * w + x;
      const centre = alpha[index];
      let sum = 0;
      let min = 1;
      let max = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const value = alpha[index + dy * w + dx];
          sum += value;
          if (value < min) min = value;
          if (value > max) max = value;
        }
      }
      if (max - min > 0.05) out[index] = centre * 0.5 + (sum / 9) * 0.5;
    }
  }
  for (let i = 0; i < w * h; i += 1) data[i * 4 + 3] = Math.round(out[i] * 255);

  ctx.putImageData(pixels, 0, 0);
  cache.set(key, canvas);
  while (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return canvas;
}

/** The cutout cropped to the product (transparent margins removed), as a PNG blob. */
export async function cutoutPng(cutout: HTMLCanvasElement): Promise<Blob | null> {
  const ctx = cutout.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const { width: w, height: h } = cutout;
  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return null;
  const pad = 4;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(w, maxX + pad + 1) - sx;
  const sh = Math.min(h, maxY + pad + 1) - sy;
  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  out.getContext('2d')?.drawImage(cutout, sx, sy, sw, sh, 0, 0, sw, sh);
  return new Promise((resolve) => out.toBlob((blob) => resolve(blob), 'image/png'));
}
