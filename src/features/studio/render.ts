/**
 * Post Studio drawing engine: renders social-media images (Instagram post,
 * portrait, story, Facebook) for TESSA products on a <canvas>. Everything is
 * drawn at full export size; the page shows the same canvas scaled down.
 */
import { formatPrice } from '@/shared/utils/formatPrice';
import { FREE_SHIPPING_THRESHOLD } from '@/shared/constants/shipping';
import { logoSvg } from './logo';

const FREE_FROM = FREE_SHIPPING_THRESHOLD.toLocaleString('de-DE');

export type FormatId = 'square' | 'portrait' | 'story' | 'landscape';
export type TemplateId = 'spotlight' | 'offer' | 'grid' | 'announcement';
export type ThemeId = 'blush' | 'cream' | 'rose' | 'noir' | 'white';
export type PriceMode = 'retail' | 'salon' | 'custom' | 'none';
export type StudioLang = 'mk' | 'sq' | 'en';

export interface StudioFormat { id: FormatId; label: string; hint: string; width: number; height: number }

export const FORMATS: StudioFormat[] = [
  { id: 'square', label: 'Post 1:1', hint: 'Instagram / Facebook feed', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Post 4:5', hint: 'Instagram feed, tallest', width: 1080, height: 1350 },
  { id: 'story', label: 'Story 9:16', hint: 'Instagram / Facebook / TikTok story', width: 1080, height: 1920 },
  { id: 'landscape', label: 'Wide 1.91:1', hint: 'Facebook link / cover', width: 1200, height: 630 },
];

export interface StudioTheme {
  id: ThemeId;
  label: string;
  background: [string, string];
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  /** 'multiply' makes white photo backgrounds vanish on light themes; 'card' puts photos on a white tile. */
  photo: 'multiply' | 'card';
}

export const THEMES: StudioTheme[] = [
  { id: 'blush', label: 'Blush', background: ['#fbeef0', '#f3d9df'], ink: '#242124', muted: '#6f5a60', accent: '#9b5364', accentInk: '#ffffff', photo: 'multiply' },
  { id: 'cream', label: 'Cream', background: ['#f8f4ee', '#efe6da'], ink: '#242124', muted: '#6d625a', accent: '#242124', accentInk: '#ffffff', photo: 'multiply' },
  { id: 'white', label: 'Clean white', background: ['#ffffff', '#f6f2ef'], ink: '#242124', muted: '#6f6a6a', accent: '#9b5364', accentInk: '#ffffff', photo: 'multiply' },
  { id: 'rose', label: 'Tessa rose', background: ['#a35a6c', '#733a49'], ink: '#ffffff', muted: '#f6dbe1', accent: '#ffffff', accentInk: '#733a49', photo: 'card' },
  { id: 'noir', label: 'Noir & gold', background: ['#221d1f', '#0f0c0d'], ink: '#ffffff', muted: '#cbbfb8', accent: '#d8b475', accentInk: '#1a1416', photo: 'card' },
];

export interface StudioProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  stylistPrice: number;
  /** Photo URLs, best first; the page lets admins choose one. */
  photos: string[];
  photoIndex: number;
  /** Size on the image: 1 = fit its space. Shift+drag or the slider changes it. */
  scale: number;
  /** Move from the centre of its space, as a share of that space's width / height. */
  offsetX: number;
  offsetY: number;
  /** Manual crop of the photo (0–1 of its width/height); null = auto-trim white margins. */
  crop: PhotoCrop | null;
}

export interface PhotoCrop { x: number; y: number; w: number; h: number }

export const DEFAULT_ADJUST = { scale: 1, offsetX: 0, offsetY: 0, crop: null } as const;

type DrawnProduct = StudioProduct & { image: HTMLImageElement | null };

/** Where each product photo was drawn, so the page can drag / resize it on the preview. */
export interface PhotoHitBox { id: string; x: number; y: number; w: number; h: number }
let hitBoxes: PhotoHitBox[] = [];

export interface StudioDesign {
  format: FormatId;
  template: TemplateId;
  theme: ThemeId;
  lang: StudioLang;
  eyebrow: string;
  headline: string;
  subline: string;
  badge: string;
  cta: string;
  priceMode: PriceMode;
  customPrice: string;
  oldPrice: string;
  showLogo: boolean;
  /** 0–80: how much the uploaded background photo is darkened so text stays readable. */
  backgroundDim: number;
}

export interface RenderAssets {
  products: DrawnProduct[];
  background: HTMLImageElement | null;
  logo: HTMLImageElement | null;
}

const SERIF = "'Fraunces', 'DM Serif Display', Georgia, 'Times New Roman', serif";
const SANS = "'Manrope', 'DM Sans', 'Helvetica Neue', Arial, sans-serif";

export const formatById = (id: FormatId) => FORMATS.find((format) => format.id === id) ?? FORMATS[0];
export const themeById = (id: ThemeId) => THEMES.find((theme) => theme.id === id) ?? THEMES[0];

/* ------------------------------------------------------------------ assets */

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

export function loadImage(url: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  const cached = imageCache.get(url);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
  imageCache.set(url, promise);
  return promise;
}

export function loadLogo(fill: string): Promise<HTMLImageElement | null> {
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg(fill))}`);
}

/** Wait for the web fonts the canvas uses, so the first render isn't in a fallback font. */
export async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.allSettled([
    document.fonts.load(`600 80px ${SERIF}`, 'TessaАБВ'),
    document.fonts.load(`700 40px ${SANS}`, 'TessaАБВ'),
    document.fonts.load(`500 40px ${SANS}`, 'TessaАБВ'),
    document.fonts.load(`800 40px ${SANS}`, 'TessaАБВ'),
  ]);
}

/* ----------------------------------------------------------------- helpers */

export function productPrice(product: StudioProduct, design: StudioDesign): string | null {
  switch (design.priceMode) {
    case 'none': return null;
    case 'custom': return design.customPrice.trim() || null;
    case 'salon': return product.stylistPrice > 0 ? formatPrice(product.stylistPrice) : null;
    default: return product.price > 0 ? formatPrice(product.price) : null;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

interface TextBox {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: (size: number) => string;
  size: number;
  minSize?: number;
  maxLines: number;
  lineHeight?: number;
  color: string;
  align?: CanvasTextAlign;
  letterSpacing?: number;
}

/** Draws wrapped text, shrinking the font until it fits in maxLines. Returns the bottom y. */
function drawText(ctx: CanvasRenderingContext2D, box: TextBox): number {
  if (!box.text.trim()) return box.y;
  let size = box.size;
  let lines: string[];
  const minSize = box.minSize ?? Math.round(box.size * 0.55);
  for (;;) {
    ctx.font = box.font(size);
    lines = wrapLines(ctx, box.text, box.maxWidth);
    if (lines.length <= box.maxLines || size <= minSize) break;
    size -= 2;
  }
  if (lines.length > box.maxLines) {
    lines = lines.slice(0, box.maxLines);
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/\s*\S*$/, '')}…`;
  }
  const lineHeight = size * (box.lineHeight ?? 1.12);
  ctx.fillStyle = box.color;
  ctx.textAlign = box.align ?? 'left';
  ctx.textBaseline = 'top';
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${box.letterSpacing ?? 0}px`;
  }
  lines.forEach((line, index) => ctx.fillText(line, box.x, box.y + index * lineHeight));
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  }
  return box.y + lines.length * lineHeight;
}

interface SourceRect { sx: number; sy: number; sw: number; sh: number }
const trimCache = new WeakMap<HTMLImageElement, SourceRect>();

/**
 * The part of a product photo that isn't white or transparent margin, so the
 * bottle fills its space instead of floating small in a big white square.
 */
function trimmedRect(image: HTMLImageElement): SourceRect {
  const cached = trimCache.get(image);
  if (cached) return cached;
  const full = { sx: 0, sy: 0, sw: image.naturalWidth, sh: image.naturalHeight };
  try {
    const scale = Math.min(1, 240 / Math.max(image.naturalWidth, image.naturalHeight));
    const w = Math.max(1, Math.round(image.naturalWidth * scale));
    const h = Math.max(1, Math.round(image.naturalHeight * scale));
    const probe = document.createElement('canvas');
    probe.width = w;
    probe.height = h;
    const ctx = probe.getContext('2d', { willReadFrequently: true });
    if (!ctx) return full;
    ctx.drawImage(image, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const background = data[i + 3] < 16 || (data[i] > 242 && data[i + 1] > 242 && data[i + 2] > 242);
        if (!background) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return full;
    const pad = 2;
    const rect = {
      sx: Math.max(0, (minX - pad) / scale),
      sy: Math.max(0, (minY - pad) / scale),
      sw: Math.min(image.naturalWidth, (maxX - minX + 1 + pad * 2) / scale),
      sh: Math.min(image.naturalHeight, (maxY - minY + 1 + pad * 2) / scale),
    };
    rect.sw = Math.min(rect.sw, image.naturalWidth - rect.sx);
    rect.sh = Math.min(rect.sh, image.naturalHeight - rect.sy);
    trimCache.set(image, rect);
    return rect;
  } catch {
    return full; // a photo from another site can't be read; draw it whole
  }
}

/** Fits an image inside a box (no cropping). */
function drawContain(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  mode: 'multiply' | 'normal' = 'normal',
  adjust?: Pick<StudioProduct, 'scale' | 'offsetX' | 'offsetY' | 'crop'> & { id?: string },
  clip?: { x: number; y: number; w: number; h: number; r: number },
) {
  const crop = adjust?.crop;
  const { sx, sy, sw, sh } = crop
    ? {
      sx: crop.x * image.naturalWidth,
      sy: crop.y * image.naturalHeight,
      sw: Math.max(1, crop.w * image.naturalWidth),
      sh: Math.max(1, crop.h * image.naturalHeight),
    }
    : trimmedRect(image);
  const fit = Math.min(w / sw, h / sh) * (adjust?.scale ?? 1);
  const dw = sw * fit;
  const dh = sh * fit;
  const dx = x + (w - dw) / 2 + (adjust?.offsetX ?? 0) * w;
  const dy = y + (h - dh) / 2 + (adjust?.offsetY ?? 0) * h;
  ctx.save();
  if (clip) {
    roundRect(ctx, clip.x, clip.y, clip.w, clip.h, clip.r);
    ctx.clip();
  }
  if (mode === 'multiply') ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
  if (adjust?.id) hitBoxes.push({ id: adjust.id, x: dx, y: dy, w: dw, h: dh });
}

/** Fills a box with an image, cropping the overflow. */
function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  theme: StudioTheme,
  product: DrawnProduct | undefined,
  x: number, y: number, w: number, h: number,
  forceCard = false,
) {
  const image = product?.image ?? null;
  const card = forceCard || theme.photo === 'card';
  if (card) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = w * 0.06;
    ctx.shadowOffsetY = w * 0.02;
    roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.07);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }
  if (!image) {
    ctx.save();
    ctx.fillStyle = card ? '#c9bcbf' : theme.muted;
    ctx.globalAlpha = 0.5;
    ctx.font = `600 ${Math.round(w * 0.06)}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No photo', x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }
  const pad = card ? Math.min(w, h) * 0.08 : 0;
  drawContain(
    ctx, image, x + pad, y + pad, w - pad * 2, h - pad * 2, card ? 'normal' : 'multiply', product,
    // On a white tile the photo stays inside the tile; on plain backgrounds it may spill out.
    card ? { x, y, w, h, r: Math.min(w, h) * 0.07 } : undefined,
  );
}

/** Circle sticker with short text such as "-20%" or "NEW". */
function drawBadge(ctx: CanvasRenderingContext2D, theme: StudioTheme, text: string, cx: number, cy: number, r: number) {
  if (!text.trim()) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = theme.accent;
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = r * 0.25;
  ctx.fill();
  ctx.restore();
  let size = r * 0.62;
  ctx.font = `800 ${size}px ${SANS}`;
  while (ctx.measureText(text).width > r * 1.6 && size > r * 0.25) {
    size -= 2;
    ctx.font = `800 ${size}px ${SANS}`;
  }
  ctx.fillStyle = theme.accentInk;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + size * 0.04);
}

/** Price pill with an optional struck-through old price before it. */
function drawPrice(
  ctx: CanvasRenderingContext2D,
  theme: StudioTheme,
  price: string | null,
  oldPrice: string,
  x: number, y: number, size: number,
  align: 'left' | 'center' = 'left',
): number {
  if (!price) return y;
  ctx.font = `800 ${size}px ${SANS}`;
  const priceWidth = ctx.measureText(price).width;
  const padX = size * 0.6;
  const pillW = priceWidth + padX * 2;
  const pillH = size * 1.75;
  ctx.font = `600 ${size * 0.72}px ${SANS}`;
  const old = oldPrice.trim();
  const oldWidth = old ? ctx.measureText(old).width + size * 0.6 : 0;
  const total = oldWidth + pillW;
  let left = align === 'center' ? x - total / 2 : x;

  if (old) {
    ctx.fillStyle = theme.muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(old, left, y + pillH / 2);
    const w = ctx.measureText(old).width;
    ctx.fillRect(left, y + pillH / 2 - size * 0.03, w, Math.max(2, size * 0.06));
    left += oldWidth;
  }
  roundRect(ctx, left, y, pillW, pillH, pillH / 2);
  ctx.fillStyle = theme.accent;
  ctx.fill();
  ctx.font = `800 ${size}px ${SANS}`;
  ctx.fillStyle = theme.accentInk;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(price, left + padX, y + pillH / 2 + size * 0.04);
  return y + pillH;
}

function drawFooter(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, assets: RenderAssets, W: number, H: number, m: number) {
  const unit = Math.min(W, H);
  const baseline = H - m;
  if (design.showLogo && assets.logo) {
    const logoH = unit * 0.055;
    const logoW = logoH * (268 / 102);
    ctx.drawImage(assets.logo, m, baseline - logoH, logoW, logoH);
  }
  if (design.cta.trim()) {
    const size = unit * 0.03;
    ctx.font = `700 ${size}px ${SANS}`;
    ctx.fillStyle = theme.ink;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(design.cta.trim(), W - m, baseline - unit * 0.012);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, assets: RenderAssets, W: number, H: number) {
  const gradient = ctx.createLinearGradient(0, 0, W * 0.35, H);
  gradient.addColorStop(0, theme.background[0]);
  gradient.addColorStop(1, theme.background[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  if (assets.background) {
    drawCover(ctx, assets.background, 0, 0, W, H);
    const dim = Math.max(0, Math.min(80, design.backgroundDim)) / 100;
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, `rgba(20,14,16,${dim * 0.75})`);
    shade.addColorStop(1, `rgba(20,14,16,${Math.min(0.92, dim * 1.25)})`);
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    return;
  }

  // Soft decorative circles keep plain backgrounds from looking flat.
  ctx.save();
  ctx.globalAlpha = theme.photo === 'card' ? 0.08 : 0.35;
  ctx.fillStyle = theme.photo === 'card' ? '#ffffff' : '#ffffff';
  ctx.beginPath();
  ctx.arc(W * 0.86, H * 0.18, Math.min(W, H) * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W * 0.08, H * 0.92, Math.min(W, H) * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Text colours over an uploaded photo are always light. */
function effectiveTheme(theme: StudioTheme, assets: RenderAssets): StudioTheme {
  if (!assets.background) return theme;
  return { ...theme, ink: '#ffffff', muted: '#f1e6e8', photo: 'card' };
}

/* --------------------------------------------------------------- templates */

function spotlight(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, assets: RenderAssets, W: number, H: number) {
  const unit = Math.min(W, H);
  const m = unit * 0.07;
  const product = assets.products[0];
  const wide = W / H > 1.4;
  const tall = H / W > 1.5;

  if (wide) {
    const photoW = W * 0.42;
    drawPhoto(ctx, theme, product, W - m - photoW, m, photoW, H - m * 2);
    let y = m * 1.2;
    const textW = W - photoW - m * 3;
    y = drawText(ctx, { text: design.eyebrow.toUpperCase(), x: m, y, maxWidth: textW, font: (s) => `800 ${s}px ${SANS}`, size: unit * 0.04, maxLines: 1, color: theme.accent === '#ffffff' ? theme.muted : theme.accent, letterSpacing: 3 }) + unit * 0.03;
    y = drawText(ctx, { text: design.headline, x: m, y, maxWidth: textW, font: (s) => `600 ${s}px ${SERIF}`, size: unit * 0.12, maxLines: 3, color: theme.ink, lineHeight: 1.05 }) + unit * 0.03;
    y = drawText(ctx, { text: design.subline, x: m, y, maxWidth: textW, font: (s) => `500 ${s}px ${SANS}`, size: unit * 0.045, maxLines: 2, color: theme.muted }) + unit * 0.05;
    if (product) drawPrice(ctx, theme, productPrice(product, design), design.oldPrice, m, y, unit * 0.05);
    drawBadge(ctx, theme, design.badge, W - m - unit * 0.02, m + unit * 0.06, unit * 0.11);
    drawFooter(ctx, theme, design, assets, W - photoW - m, H, m);
    return;
  }

  let y = tall ? H * 0.09 : m;
  y = drawText(ctx, { text: design.eyebrow.toUpperCase(), x: W / 2, y, maxWidth: W - m * 2, font: (s) => `800 ${s}px ${SANS}`, size: unit * 0.032, maxLines: 1, color: theme.accent === '#ffffff' ? theme.muted : theme.accent, align: 'center', letterSpacing: 4 }) + unit * 0.022;
  y = drawText(ctx, { text: design.headline, x: W / 2, y, maxWidth: W - m * 2, font: (s) => `600 ${s}px ${SERIF}`, size: unit * (tall ? 0.105 : 0.085), maxLines: 2, color: theme.ink, align: 'center', lineHeight: 1.04 }) + unit * 0.018;
  y = drawText(ctx, { text: design.subline, x: W / 2, y, maxWidth: W - m * 3, font: (s) => `500 ${s}px ${SANS}`, size: unit * 0.036, maxLines: 2, color: theme.muted, align: 'center' });

  const priceH = unit * 0.075;
  const footerH = unit * 0.11;
  const photoTop = y + unit * 0.04;
  const photoBottom = H - m - footerH - priceH - unit * 0.05;
  const photoH = Math.max(unit * 0.25, photoBottom - photoTop);
  const photoW = Math.min(W - m * 2, photoH * (theme.photo === 'card' || assets.background ? 0.92 : 1.2));
  drawPhoto(ctx, theme, product, (W - photoW) / 2, photoTop, photoW, photoH);
  drawBadge(ctx, theme, design.badge, (W + photoW) / 2 - unit * 0.04, photoTop + unit * 0.07, unit * 0.1);
  if (product) drawPrice(ctx, theme, productPrice(product, design), design.oldPrice, W / 2, photoTop + photoH + unit * 0.035, unit * 0.04, 'center');
  drawFooter(ctx, theme, design, assets, W, H, m);
}

function offer(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, assets: RenderAssets, W: number, H: number) {
  const unit = Math.min(W, H);
  const m = unit * 0.07;
  const tall = H / W > 1.5;
  const wide = W / H > 1.4;
  const products = assets.products.slice(0, 3);

  let y = tall ? H * 0.08 : m;
  const headW = wide ? W * 0.5 : W - m * 2;
  // The badge is the hero here: a huge "-20%" or "1+1".
  if (design.badge.trim()) {
    y = drawText(ctx, { text: design.badge, x: m, y, maxWidth: headW, font: (s) => `800 ${s}px ${SANS}`, size: unit * (wide ? 0.24 : 0.22), maxLines: 1, color: theme.accent === '#ffffff' ? theme.ink : theme.accent, lineHeight: 1 }) + unit * 0.01;
  }
  y = drawText(ctx, { text: design.headline, x: m, y, maxWidth: headW, font: (s) => `600 ${s}px ${SERIF}`, size: unit * 0.085, maxLines: 2, color: theme.ink, lineHeight: 1.05 }) + unit * 0.015;
  y = drawText(ctx, { text: design.subline, x: m, y, maxWidth: headW, font: (s) => `500 ${s}px ${SANS}`, size: unit * 0.036, maxLines: 3, color: theme.muted });

  const footerH = unit * 0.11;
  if (wide) {
    const areaX = W * 0.56;
    const areaW = W - areaX - m;
    const each = areaW / Math.max(1, products.length);
    products.forEach((product, index) => drawPhoto(ctx, theme, product, areaX + index * each + each * 0.04, m, each * 0.92, H - m * 2));
    drawFooter(ctx, theme, design, assets, areaX, H, m);
    return;
  }

  const top = y + unit * 0.05;
  const bottom = H - m - footerH;
  const n = Math.max(1, products.length);
  const gap = unit * 0.03;
  const each = (W - m * 2 - gap * (n - 1)) / n;
  const priceSpace = design.priceMode === 'none' ? 0 : unit * 0.1;
  const photoH = Math.max(unit * 0.2, bottom - top - priceSpace);
  products.forEach((product, index) => {
    const x = m + index * (each + gap);
    drawPhoto(ctx, theme, product, x, top, each, photoH);
    const price = productPrice(product, design);
    if (price) {
      drawPrice(ctx, theme, price, n === 1 ? design.oldPrice : '', x + each / 2, top + photoH + unit * 0.025, unit * (n === 1 ? 0.04 : 0.032), 'center');
    }
  });
  drawFooter(ctx, theme, design, assets, W, H, m);
}

function grid(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, assets: RenderAssets, W: number, H: number) {
  const unit = Math.min(W, H);
  const m = unit * 0.06;
  const tall = H / W > 1.5;
  const wide = W / H > 1.4;
  const products = assets.products.slice(0, 4);

  let y = tall ? H * 0.08 : m;
  y = drawText(ctx, { text: design.eyebrow.toUpperCase(), x: m, y, maxWidth: W - m * 2, font: (s) => `800 ${s}px ${SANS}`, size: unit * 0.03, maxLines: 1, color: theme.accent === '#ffffff' ? theme.muted : theme.accent, letterSpacing: 4 }) + unit * 0.015;
  y = drawText(ctx, { text: design.headline, x: m, y, maxWidth: W - m * 2, font: (s) => `600 ${s}px ${SERIF}`, size: unit * (wide ? 0.09 : 0.08), maxLines: wide ? 1 : 2, color: theme.ink, lineHeight: 1.05 }) + unit * 0.035;

  const n = Math.max(1, products.length);
  const cols = wide ? n : n === 1 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  const footerH = unit * 0.1;
  const gap = unit * 0.03;
  const areaH = H - y - m - footerH;
  const cellW = (W - m * 2 - gap * (cols - 1)) / cols;
  const cellH = (areaH - gap * (rows - 1)) / rows;
  // Room for a two-line name and the price under the photo.
  const labelH = Math.min(cellH * 0.38, unit * 0.13);

  products.forEach((product, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = m + col * (cellW + gap);
    const cy = y + row * (cellH + gap);
    ctx.save();
    roundRect(ctx, x, cy, cellW, cellH, unit * 0.03);
    ctx.fillStyle = theme.photo === 'card' || assets.background ? '#ffffff' : 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.restore();
    if (product.image) {
      drawContain(ctx, product.image, x + cellW * 0.08, cy + cellH * 0.05, cellW * 0.84, cellH - labelH - cellH * 0.06, 'multiply', product,
        { x, y: cy, w: cellW, h: cellH - labelH, r: unit * 0.03 });
    }
    const textInk = '#242124';
    const ty = drawText(ctx, { text: product.name, x: x + cellW / 2, y: cy + cellH - labelH + unit * 0.008, maxWidth: cellW * 0.88, font: (s) => `700 ${s}px ${SANS}`, size: unit * 0.026, maxLines: 2, color: textInk, align: 'center', lineHeight: 1.15 });
    const price = productPrice(product, design);
    if (price) {
      ctx.font = `800 ${unit * 0.028}px ${SANS}`;
      ctx.fillStyle = theme.photo === 'card' ? '#9b5364' : theme.accent === '#ffffff' ? '#9b5364' : theme.accent;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(price, x + cellW / 2, ty + unit * 0.008);
    }
  });
  drawBadge(ctx, theme, design.badge, W - m - unit * 0.07, (tall ? H * 0.08 : m) + unit * 0.07, unit * 0.075);
  drawFooter(ctx, theme, design, assets, W, H, m);
}

function announcement(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, assets: RenderAssets, W: number, H: number) {
  const unit = Math.min(W, H);
  const m = unit * 0.08;
  const product = assets.products[0];
  const tall = H / W > 1.5;
  const centerY = H * (tall ? 0.36 : 0.3);

  let y = centerY - unit * 0.15;
  y = drawText(ctx, { text: design.eyebrow.toUpperCase(), x: W / 2, y, maxWidth: W - m * 2, font: (s) => `800 ${s}px ${SANS}`, size: unit * 0.034, maxLines: 1, color: theme.accent === '#ffffff' || assets.background ? theme.muted : theme.accent, align: 'center', letterSpacing: 5 }) + unit * 0.03;
  y = drawText(ctx, { text: design.headline, x: W / 2, y, maxWidth: W - m * 2, font: (s) => `600 ${s}px ${SERIF}`, size: unit * 0.13, maxLines: 3, color: theme.ink, align: 'center', lineHeight: 1.02 }) + unit * 0.04;
  y = drawText(ctx, { text: design.subline, x: W / 2, y, maxWidth: W - m * 2.4, font: (s) => `500 ${s}px ${SANS}`, size: unit * 0.042, maxLines: 4, color: theme.muted, align: 'center', lineHeight: 1.3 }) + unit * 0.05;

  if (design.badge.trim()) {
    const size = unit * 0.038;
    ctx.font = `800 ${size}px ${SANS}`;
    const w = ctx.measureText(design.badge).width + size * 2;
    const h = size * 2.2;
    roundRect(ctx, (W - w) / 2, y, w, h, h / 2);
    ctx.fillStyle = theme.accent;
    ctx.fill();
    ctx.fillStyle = theme.accentInk;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(design.badge, W / 2, y + h / 2 + size * 0.04);
    y += h + unit * 0.05;
  }

  // An optional product photo fills the space under the text.
  const footerH = unit * 0.11;
  const space = H - m - footerH - y;
  if (product?.image && space > unit * 0.18) {
    const h = Math.min(space, unit * (tall ? 0.8 : 0.6));
    drawPhoto(ctx, theme, product, (W - h * 0.9) / 2, y, h * 0.9, h);
  }
  drawFooter(ctx, theme, design, assets, W, H, m);
}

const TEMPLATE_RENDERERS: Record<TemplateId, typeof spotlight> = { spotlight, offer, grid, announcement };

export function renderDesign(canvas: HTMLCanvasElement, design: StudioDesign, assets: RenderAssets): PhotoHitBox[] {
  hitBoxes = [];
  const format = formatById(design.format);
  if (canvas.width !== format.width) canvas.width = format.width;
  if (canvas.height !== format.height) canvas.height = format.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  const theme = effectiveTheme(themeById(design.theme), assets);
  ctx.save();
  ctx.clearRect(0, 0, format.width, format.height);
  drawBackground(ctx, theme, design, assets, format.width, format.height);
  TEMPLATE_RENDERERS[design.template](ctx, theme, design, assets, format.width, format.height);
  ctx.restore();
  return hitBoxes;
}

/* ----------------------------------------------------------------- copy */

const COPY: Record<StudioLang, {
  order: string; tags: string[];
  defaults: Record<TemplateId, { eyebrow: string; headline: string; subline: string; badge: string }>;
  quick: { label: string; badge: string }[];
}> = {
  mk: {
    order: 'Нарачајте на tessa.mk 🛒 Достава низ цела Македонија.',
    tags: ['#tessa', '#негазакоса', '#фризер', '#салон', '#македонија'],
    defaults: {
      spotlight: { eyebrow: 'Избор на Tessa', headline: '', subline: '', badge: '' },
      offer: { eyebrow: 'Понуда', headline: 'Специјална понуда', subline: 'Само оваа недела или до истекување на залихите.', badge: '-20%' },
      grid: { eyebrow: 'Tessa', headline: 'Омилени производи', subline: '', badge: '' },
      announcement: { eyebrow: 'Tessa Hair Care', headline: 'Бесплатна достава', subline: `За сите нарачки од ${FREE_FROM} ден. низ цела Македонија.`, badge: 'tessa.mk' },
    },
    quick: [{ label: 'Ново', badge: 'НОВО' }, { label: '-10%', badge: '-10%' }, { label: '-20%', badge: '-20%' }, { label: '1+1', badge: '1+1' }, { label: 'Хит', badge: 'ХИТ' }],
  },
  sq: {
    order: 'Porositni në tessa.mk 🛒 Dërgesë në gjithë Maqedoninë.',
    tags: ['#tessa', '#kujdesperflokët', '#floktar', '#sallon', '#maqedonia'],
    defaults: {
      spotlight: { eyebrow: 'Zgjedhja e Tessa', headline: '', subline: '', badge: '' },
      offer: { eyebrow: 'Ofertë', headline: 'Ofertë speciale', subline: 'Vetëm këtë javë ose deri në mbarim të stokut.', badge: '-20%' },
      grid: { eyebrow: 'Tessa', headline: 'Produktet e preferuara', subline: '', badge: '' },
      announcement: { eyebrow: 'Tessa Hair Care', headline: 'Dërgesë falas', subline: `Për të gjitha porositë nga ${FREE_FROM} den. në gjithë Maqedoninë.`, badge: 'tessa.mk' },
    },
    quick: [{ label: 'E re', badge: 'E RE' }, { label: '-10%', badge: '-10%' }, { label: '-20%', badge: '-20%' }, { label: '1+1', badge: '1+1' }, { label: 'Hit', badge: 'HIT' }],
  },
  en: {
    order: 'Order at tessa.mk 🛒 Delivery across North Macedonia.',
    tags: ['#tessa', '#haircare', '#hairstylist', '#salon', '#macedonia'],
    defaults: {
      spotlight: { eyebrow: "Tessa's pick", headline: '', subline: '', badge: '' },
      offer: { eyebrow: 'Offer', headline: 'Special offer', subline: 'This week only, or while stocks last.', badge: '-20%' },
      grid: { eyebrow: 'Tessa', headline: 'Our favourites', subline: '', badge: '' },
      announcement: { eyebrow: 'Tessa Hair Care', headline: 'Free delivery', subline: `On every order from ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-US')} MKD across North Macedonia.`, badge: 'tessa.mk' },
    },
    quick: [{ label: 'New', badge: 'NEW' }, { label: '-10%', badge: '-10%' }, { label: '-20%', badge: '-20%' }, { label: '1+1', badge: '1+1' }, { label: 'Best seller', badge: 'HIT' }],
  },
};

export const templateDefaults = (template: TemplateId, lang: StudioLang) => COPY[lang].defaults[template];
export const quickBadges = (lang: StudioLang) => COPY[lang].quick;

const brandTag = (brand: string) => `#${brand.toLowerCase().replace(/[^a-z0-9а-шѓѕјљњќџ]+/gi, '')}`;

/** Ready-to-paste caption for Instagram / Facebook. */
export function buildCaption(design: StudioDesign, products: StudioProduct[]): string {
  const copy = COPY[design.lang];
  const parts: string[] = [];
  const title = [design.badge.trim(), design.headline.trim()].filter(Boolean).join(' · ');
  if (title) parts.push(`✨ ${title}`);
  if (design.subline.trim()) parts.push(design.subline.trim());
  const lines = products.map((product) => {
    const price = productPrice(product, design);
    return `• ${product.name}${product.brand ? ` (${product.brand})` : ''}${price ? ` — ${price}` : ''}`;
  });
  if (lines.length) parts.push(lines.join('\n'));
  parts.push(copy.order);
  const brandTags = Array.from(new Set(products.map((product) => product.brand).filter(Boolean).map(brandTag)));
  parts.push([...brandTags, ...copy.tags].join(' '));
  return parts.join('\n\n');
}
