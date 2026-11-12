/**
 * Post Studio drawing engine: renders social-media images (Instagram post,
 * portrait, story, Facebook) for TESSA products on a <canvas>. Everything is
 * drawn at full export size; the page shows the same canvas scaled down.
 */
import { formatPrice } from '@/shared/utils/formatPrice';
import { FREE_SHIPPING_THRESHOLD } from '@/shared/constants/shipping';
import { getBrandKit } from './brand';
import { drawElements, type StudioElement } from './elements';
import { productSize, promoText, suggestBenefits, type InfoMode } from './info';
import { logoSvg } from './logo';

const FREE_FROM = FREE_SHIPPING_THRESHOLD.toLocaleString('de-DE');
/** Shop name and web address from the site config, so the studio works for any business. */
const SHOP = getBrandKit().name;
const HOST = getBrandKit().host;

export type FormatId = 'square' | 'portrait' | 'story' | 'landscape';
export type TemplateId = 'spotlight' | 'offer' | 'grid' | 'announcement' | 'beforeAfter' | 'review' | 'steps' | 'thisOrThat' | 'lineup';
export type ThemeId = 'blush' | 'cream' | 'rose' | 'noir' | 'white';
export type PriceMode = 'retail' | 'salon' | 'custom' | 'none';
export type StudioLang = 'mk' | 'sq' | 'en';

export interface StudioFormat { id: FormatId; label: string; hint: string; width: number; height: number }

export const FORMATS: StudioFormat[] = [
  { id: 'square', label: 'Instagram post 1:1', hint: 'Square, works on Instagram and Facebook', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Instagram portrait 4:5', hint: 'Best reach: fills the most screen', width: 1080, height: 1350 },
  { id: 'story', label: 'Story / Reel cover 9:16', hint: 'Instagram & Facebook stories, Reels', width: 1080, height: 1920 },
  { id: 'landscape', label: 'Facebook / link 1.91:1', hint: 'Facebook feed, link previews, covers', width: 1200, height: 630 },
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
  { id: 'rose', label: 'Rose', background: ['#a35a6c', '#733a49'], ink: '#ffffff', muted: '#f6dbe1', accent: '#ffffff', accentInk: '#733a49', photo: 'card' },
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
  /** Name, category and description text (all languages), used to suggest benefits. */
  description: string;
  /** Remove the photo's background (in the browser) so the product sits on the design. */
  cutout: boolean;
  /** 0–100 colour tolerance of the background remover. */
  tolerance: number;
  /** Magic-eraser spots (0–1 of the photo). */
  erase: { x: number; y: number }[];
  /** Soft shadow under a cut-out product. */
  shadow: boolean;
  /** Image adjustments: degrees, mirror, and 100 = unchanged for the filters. */
  rotate: number;
  flip: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface PhotoCrop { x: number; y: number; w: number; h: number }

export const DEFAULT_ADJUST = { scale: 1, offsetX: 0, offsetY: 0, crop: null, rotate: 0, flip: false, brightness: 100, contrast: 100, saturation: 100 } as const;
export const DEFAULT_CUTOUT = { cutout: false, tolerance: 20, erase: [] as { x: number; y: number }[], shadow: true };

/** A loaded photo, or its cut-out (a canvas with a transparent background). */
export type PhotoSource = HTMLImageElement | HTMLCanvasElement;

type DrawnProduct = StudioProduct & { image: PhotoSource | null };

const sizeOf = (source: PhotoSource) => source instanceof HTMLImageElement
  ? { width: source.naturalWidth, height: source.naturalHeight }
  : { width: source.width, height: source.height };

const isCutout = (product: DrawnProduct | undefined) => Boolean(product?.cutout && product.image instanceof HTMLCanvasElement);

/** Where each product photo was drawn, so the page can drag / resize it on the preview. */
export interface PhotoHitBox {
  id: string;
  x: number; y: number; w: number; h: number;
  /** Size of the space the photo is placed in; offsets are a share of it. */
  spaceW: number;
  spaceH: number;
  /** Part of the photo that was drawn, as 0–1 of the photo (for the magic eraser). */
  source: { x: number; y: number; w: number; h: number };
}
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
  /** What the image shows under the product: benefits, size, code, call to action, badge, price or nothing. */
  info: InfoMode;
  /** Benefits chosen by the admin; empty = suggested from the product. */
  benefits: string[];
  promoCode: string;
  ctaText: string;
  badgeText: string;
  priceMode: PriceMode;
  customPrice: string;
  oldPrice: string;
  showLogo: boolean;
  /** 0–80: how much the uploaded background photo is darkened so text stays readable. */
  backgroundDim: number;
  /** Text boxes, stickers and shapes on top of the layout (later = in front). */
  elements: StudioElement[];
  /** QR code in the corner, linking to qrUrl (empty = the product or shop page). */
  qr: boolean;
  qrUrl: string;
}

export interface RenderAssets {
  products: DrawnProduct[];
  background: HTMLImageElement | null;
  /** Own photos for the Before / After layout (otherwise the first two products are used). */
  before?: HTMLImageElement | null;
  after?: HTMLImageElement | null;
  /** Rendered QR code (from the free qrcode.react library). */
  qr?: HTMLCanvasElement | null;
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

export type InfoLine = { kind: 'pill'; text: string; old: string } | { kind: 'chips'; items: string[] };

/** What to draw under a product for the chosen info mode (null = nothing). */
export function infoLine(product: StudioProduct | undefined, design: StudioDesign, many = false): InfoLine | null {
  const pill = (text: string, old = ''): InfoLine | null => (text.trim() ? { kind: 'pill', text: text.trim(), old } : null);
  switch (design.info) {
    case 'price': return product ? pill(productPrice(product, design) ?? '', many ? '' : design.oldPrice) : null;
    case 'size': return product ? pill(productSize(product.name)) : null;
    case 'promo': return pill(promoText(design.promoCode, design.lang));
    case 'cta': return pill(design.ctaText);
    case 'badge': return pill(design.badgeText);
    case 'benefits': {
      if (!product) return null;
      const items = !many && design.benefits.length ? design.benefits : suggestBenefits(product.description || product.name, design.lang, many ? 1 : 3);
      return items.length ? { kind: 'chips', items } : null;
    }
    default: return null;
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

/** A text block the layout would have drawn, for turning the post into editable layers. */
export interface CapturedText {
  text: string;
  /** Left edge of the text box, top of the first line. */
  x: number;
  y: number;
  width: number;
  fontSize: number;
  font: string;
  color: string;
  align: CanvasTextAlign;
  lineHeight: number;
  letterSpacing: number;
}
let textCapture: CapturedText[] | null = null;

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
  if (textCapture) {
    const align = box.align ?? 'left';
    const left = align === 'center' ? box.x - box.maxWidth / 2 : align === 'right' || align === 'end' ? box.x - box.maxWidth : box.x;
    textCapture.push({
      text: lines.join('\n'), x: left, y: box.y, width: box.maxWidth, fontSize: size, font: box.font(size),
      color: box.color, align, lineHeight: box.lineHeight ?? 1.12, letterSpacing: box.letterSpacing ?? 0,
    });
    return box.y + lines.length * lineHeight;
  }
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
const trimCache = new WeakMap<PhotoSource, SourceRect>();

/**
 * The part of a product photo that isn't white or transparent margin, so the
 * bottle fills its space instead of floating small in a big white square.
 */
function trimmedRect(image: PhotoSource): SourceRect {
  const { width: naturalWidth, height: naturalHeight } = sizeOf(image);
  const cached = trimCache.get(image);
  if (cached) return cached;
  const full = { sx: 0, sy: 0, sw: naturalWidth, sh: naturalHeight };
  try {
    const scale = Math.min(1, 240 / Math.max(naturalWidth, naturalHeight));
    const w = Math.max(1, Math.round(naturalWidth * scale));
    const h = Math.max(1, Math.round(naturalHeight * scale));
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
      sw: Math.min(naturalWidth, (maxX - minX + 1 + pad * 2) / scale),
      sh: Math.min(naturalHeight, (maxY - minY + 1 + pad * 2) / scale),
    };
    rect.sw = Math.min(rect.sw, naturalWidth - rect.sx);
    rect.sh = Math.min(rect.sh, naturalHeight - rect.sy);
    trimCache.set(image, rect);
    return rect;
  } catch {
    return full; // a photo from another site can't be read; draw it whole
  }
}

/** Fits an image inside a box (no cropping). */
function drawContain(
  ctx: CanvasRenderingContext2D,
  image: PhotoSource,
  x: number, y: number, w: number, h: number,
  mode: 'multiply' | 'normal' = 'normal',
  adjust?: Pick<StudioProduct, 'scale' | 'offsetX' | 'offsetY' | 'crop'> & Partial<Pick<StudioProduct, 'rotate' | 'flip' | 'brightness' | 'contrast' | 'saturation'>> & { id?: string },
  clip?: { x: number; y: number; w: number; h: number; r: number },
  shadow = false,
) {
  const crop = adjust?.crop;
  const natural = sizeOf(image);
  const { sx, sy, sw, sh } = crop
    ? {
      sx: crop.x * natural.width,
      sy: crop.y * natural.height,
      sw: Math.max(1, crop.w * natural.width),
      sh: Math.max(1, crop.h * natural.height),
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
  if (shadow) {
    // A cut-out casts a soft shadow that follows its shape.
    ctx.shadowColor = 'rgba(30, 18, 22, 0.28)';
    ctx.shadowBlur = Math.max(6, dh * 0.05);
    ctx.shadowOffsetY = Math.max(3, dh * 0.025);
  }
  const rotate = adjust?.rotate ?? 0;
  const flip = adjust?.flip ?? false;
  const b = adjust?.brightness ?? 100;
  const c = adjust?.contrast ?? 100;
  const sat = adjust?.saturation ?? 100;
  if (b !== 100 || c !== 100 || sat !== 100) ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${sat}%)`;
  if (rotate || flip) {
    // Rotate / mirror around the photo's centre.
    ctx.translate(dx + dw / 2, dy + dh / 2);
    if (rotate) ctx.rotate((rotate * Math.PI) / 180);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
  } else {
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  ctx.restore();
  if (adjust?.id) {
    hitBoxes.push({
      id: adjust.id, x: dx, y: dy, w: dw, h: dh, spaceW: w, spaceH: h,
      source: { x: sx / natural.width, y: sy / natural.height, w: sw / natural.width, h: sh / natural.height },
    });
  }
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
  const cutout = isCutout(product);
  // A cut-out sits straight on the design; other photos get a white tile on dark themes.
  const card = !cutout && (forceCard || theme.photo === 'card');
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
    ctx, image, x + pad, y + pad, w - pad * 2, h - pad * 2, card || cutout ? 'normal' : 'multiply', product,
    // On a white tile the photo stays inside the tile; on plain backgrounds it may spill out.
    card ? { x, y, w, h, r: Math.min(w, h) * 0.07 } : undefined,
    cutout && Boolean(product?.shadow),
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

/** Benefit chips in one row (shrinks to fit), or the pill for everything else. Returns the bottom y. */
function drawInfo(
  ctx: CanvasRenderingContext2D,
  theme: StudioTheme,
  line: InfoLine | null,
  x: number, y: number, size: number, maxWidth: number,
  align: 'left' | 'center' = 'left',
): number {
  if (!line) return y;
  if (line.kind === 'pill') return drawPrice(ctx, theme, line.text, line.old, x, y, size, align);
  let chipSize = size * 0.78;
  const padX = () => chipSize * 0.75;
  const gap = () => chipSize * 0.45;
  const widths = () => {
    ctx.font = `700 ${chipSize}px ${SANS}`;
    return line.items.map((item) => ctx.measureText(item).width + padX() * 2);
  };
  let list = widths();
  while (list.reduce((sum, width) => sum + width, 0) + gap() * (list.length - 1) > maxWidth && chipSize > size * 0.4) {
    chipSize -= 1;
    list = widths();
  }
  const total = list.reduce((sum, width) => sum + width, 0) + gap() * (list.length - 1);
  let left = align === 'center' ? x - total / 2 : x;
  const h = chipSize * 2;
  line.items.forEach((item, index) => {
    roundRect(ctx, left, y, list[index], h, h / 2);
    ctx.fillStyle = theme.accent;
    ctx.fill();
    ctx.fillStyle = theme.accentInk;
    ctx.font = `700 ${chipSize}px ${SANS}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item, left + padX(), y + h / 2 + chipSize * 0.04);
    left += list[index] + gap();
  });
  return y + h;
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
    drawInfo(ctx, theme, infoLine(product, design), m, y, unit * 0.05, textW);
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
  drawInfo(ctx, theme, infoLine(product, design), W / 2, photoTop + photoH + unit * 0.035, unit * 0.04, W - m * 2, 'center');
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
  const priceSpace = design.info === 'none' ? 0 : unit * 0.1;
  const photoH = Math.max(unit * 0.2, bottom - top - priceSpace);
  products.forEach((product, index) => {
    const x = m + index * (each + gap);
    drawPhoto(ctx, theme, product, x, top, each, photoH);
    drawInfo(ctx, theme, infoLine(product, design, n > 1), x + each / 2, top + photoH + unit * 0.025, unit * (n === 1 ? 0.04 : 0.032), each, 'center');
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
      const cut = isCutout(product);
      drawContain(ctx, product.image, x + cellW * 0.08, cy + cellH * 0.05, cellW * 0.84, cellH - labelH - cellH * 0.06, cut ? 'normal' : 'multiply', product,
        { x, y: cy, w: cellW, h: cellH - labelH, r: unit * 0.03 }, cut && product.shadow);
    }
    const textInk = '#242124';
    const ty = drawText(ctx, { text: product.name, x: x + cellW / 2, y: cy + cellH - labelH + unit * 0.008, maxWidth: cellW * 0.88, font: (s) => `700 ${s}px ${SANS}`, size: unit * 0.026, maxLines: 2, color: textInk, align: 'center', lineHeight: 1.15 });
    const line = infoLine(product, design, true);
    const price = line?.kind === 'pill' ? line.text : line?.kind === 'chips' ? line.items[0] : null;
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


const WORDS: Record<StudioLang, { before: string; after: string; or: string }> = {
  mk: { before: 'ПРЕД', after: 'ПОТОА', or: 'ИЛИ' },
  sq: { before: 'PARA', after: 'PAS', or: 'APO' },
  en: { before: 'BEFORE', after: 'AFTER', or: 'OR' },
};

const eyebrowColour = (theme: StudioTheme) => (theme.accent === '#ffffff' ? theme.muted : theme.accent);

/** Title block shared by the new layouts; returns the y below it. */
function heading(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, W: number, y: number, m: number, unit: number, size = 0.085): number {
  y = drawText(ctx, { text: design.eyebrow.toUpperCase(), x: W / 2, y, maxWidth: W - m * 2, font: (s) => `800 ${s}px ${SANS}`, size: unit * 0.03, maxLines: 1, color: eyebrowColour(theme), align: 'center', letterSpacing: 4 }) + unit * 0.02;
  return drawText(ctx, { text: design.headline, x: W / 2, y, maxWidth: W - m * 2, font: (s) => `600 ${s}px ${SERIF}`, size: unit * size, maxLines: 2, color: theme.ink, align: 'center', lineHeight: 1.05 }) + unit * 0.03;
}

/** A photo filling a rounded box (cropped), with a label tag. */
function photoPanel(ctx: CanvasRenderingContext2D, theme: StudioTheme, source: PhotoSource | null, x: number, y: number, w: number, h: number, label: string, unit: number) {
  ctx.save();
  roundRect(ctx, x, y, w, h, unit * 0.03);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();
  if (source) {
    const { width, height } = sizeOf(source);
    const scale = Math.max(w / width, h / height);
    ctx.drawImage(source, x + (w - width * scale) / 2, y + (h - height * scale) / 2, width * scale, height * scale);
  }
  ctx.restore();
  const size = unit * 0.03;
  ctx.font = `800 ${size}px ${SANS}`;
  const tw = ctx.measureText(label).width + size * 1.6;
  roundRect(ctx, x + unit * 0.02, y + unit * 0.02, tw, size * 2, size);
  ctx.fillStyle = theme.accent;
  ctx.fill();
  ctx.fillStyle = theme.accentInk;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + unit * 0.02 + size * 0.8, y + unit * 0.02 + size + size * 0.04);
}

function beforeAfter(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, assets: RenderAssets, W: number, H: number) {
  const unit = Math.min(W, H);
  const m = unit * 0.06;
  const tall = H / W > 1.5;
  const y = heading(ctx, theme, design, W, tall ? H * 0.08 : m, m, unit, 0.075);
  const words = WORDS[design.lang];
  const before = assets.before ?? assets.products[0]?.image ?? null;
  const after = assets.after ?? assets.products[1]?.image ?? null;
  const footer = unit * 0.11;
  const gap = unit * 0.025;
  const areaH = H - y - m - footer;
  if (tall) {
    const h = (areaH - gap) / 2;
    photoPanel(ctx, theme, before, m, y, W - m * 2, h, words.before, unit);
    photoPanel(ctx, theme, after, m, y + h + gap, W - m * 2, h, words.after, unit);
  } else {
    const w = (W - m * 2 - gap) / 2;
    photoPanel(ctx, theme, before, m, y, w, areaH, words.before, unit);
    photoPanel(ctx, theme, after, m + w + gap, y, w, areaH, words.after, unit);
  }
  drawFooter(ctx, theme, design, assets, W, H, m);
}

function review(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, assets: RenderAssets, W: number, H: number) {
  const unit = Math.min(W, H);
  const m = unit * 0.09;
  const product = assets.products[0];
  const tall = H / W > 1.5;
  let y = tall ? H * 0.2 : H * 0.12;
  y = drawText(ctx, { text: design.eyebrow.toUpperCase(), x: W / 2, y, maxWidth: W - m * 2, font: (s) => `800 ${s}px ${SANS}`, size: unit * 0.03, maxLines: 1, color: eyebrowColour(theme), align: 'center', letterSpacing: 4 }) + unit * 0.03;
  const stars = design.badge.trim() || '★★★★★';
  y = drawText(ctx, { text: stars, x: W / 2, y, maxWidth: W - m * 2, font: (s) => `700 ${s}px ${SANS}`, size: unit * 0.06, maxLines: 1, color: '#e0a526', align: 'center' }) + unit * 0.035;
  y = drawText(ctx, { text: design.headline, x: W / 2, y, maxWidth: W - m * 2, font: (s) => `italic 500 ${s}px ${SERIF}`, size: unit * 0.075, maxLines: 5, color: theme.ink, align: 'center', lineHeight: 1.18 }) + unit * 0.035;
  y = drawText(ctx, { text: design.subline, x: W / 2, y, maxWidth: W - m * 2, font: (s) => `700 ${s}px ${SANS}`, size: unit * 0.036, maxLines: 1, color: theme.muted, align: 'center' }) + unit * 0.04;
  const space = H - m - unit * 0.11 - y;
  if (product?.image && space > unit * 0.16) {
    const h = Math.min(space, unit * 0.36);
    drawPhoto(ctx, theme, product, (W - h * 0.9) / 2, y, h * 0.9, h);
  }
  drawFooter(ctx, theme, design, assets, W, H, m);
}

function steps(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, assets: RenderAssets, W: number, H: number) {
  const unit = Math.min(W, H);
  const m = unit * 0.07;
  const tall = H / W > 1.5;
  const product = assets.products[0];
  let y = heading(ctx, theme, design, W, tall ? H * 0.08 : m, m, unit, 0.075) + unit * 0.01;
  const list = design.subline.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 5);
  const photoW = product?.image ? W * 0.32 : 0;
  const textW = W - m * 2 - photoW - (photoW ? unit * 0.03 : 0);
  const top = y;
  list.forEach((step, index) => {
    const r = unit * 0.035;
    ctx.beginPath();
    ctx.arc(m + r, y + r, r, 0, Math.PI * 2);
    ctx.fillStyle = theme.accent;
    ctx.fill();
    ctx.fillStyle = theme.accentInk;
    ctx.font = `800 ${unit * 0.036}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), m + r, y + r + unit * 0.002);
    const bottom = drawText(ctx, { text: step, x: m + r * 2 + unit * 0.025, y: y + unit * 0.006, maxWidth: textW - r * 2 - unit * 0.025, font: (s) => `600 ${s}px ${SANS}`, size: unit * 0.038, maxLines: 3, color: theme.ink, lineHeight: 1.25 });
    y = Math.max(bottom, y + r * 2) + unit * 0.03;
  });
  if (product?.image) {
    const h = Math.max(unit * 0.25, Math.min(H - m - unit * 0.11 - top, unit * 0.6));
    drawPhoto(ctx, theme, product, W - m - photoW, top, photoW, h);
  }
  drawFooter(ctx, theme, design, assets, W, H, m);
}

function thisOrThat(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, assets: RenderAssets, W: number, H: number) {
  const unit = Math.min(W, H);
  const m = unit * 0.06;
  const tall = H / W > 1.5;
  const y = heading(ctx, theme, design, W, tall ? H * 0.1 : m, m, unit, 0.08);
  const footer = unit * 0.11;
  const gap = unit * 0.05;
  const w = (W - m * 2 - gap) / 2;
  const labelH = unit * 0.13;
  const h = Math.max(unit * 0.25, H - y - m - footer - labelH);
  [0, 1].forEach((index) => {
    const product = assets.products[index];
    const x = m + index * (w + gap);
    drawPhoto(ctx, theme, product, x, y, w, h);
    if (product) {
      const bottom = drawText(ctx, { text: product.name, x: x + w / 2, y: y + h + unit * 0.02, maxWidth: w, font: (s) => `700 ${s}px ${SANS}`, size: unit * 0.03, maxLines: 2, color: theme.ink, align: 'center', lineHeight: 1.15 });
      drawInfo(ctx, theme, infoLine(product, design, true), x + w / 2, bottom + unit * 0.012, unit * 0.026, w, 'center');
    }
  });
  const r = unit * 0.065;
  const cx = W / 2;
  const cy = y + h / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = theme.accent;
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = r * 0.4;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = theme.accentInk;
  ctx.font = `800 ${r * 0.7}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(WORDS[design.lang].or, cx, cy + r * 0.04);
  drawFooter(ctx, theme, design, assets, W, H, m);
}

function lineup(ctx: CanvasRenderingContext2D, theme: StudioTheme, design: StudioDesign, assets: RenderAssets, W: number, H: number) {
  const unit = Math.min(W, H);
  const m = unit * 0.05;
  const tall = H / W > 1.5;
  const y = heading(ctx, theme, design, W, tall ? H * 0.1 : m * 1.2, m, unit, 0.08);
  const products = assets.products.slice(0, 6);
  const n = Math.max(1, products.length);
  const footer = unit * 0.11;
  const gap = unit * 0.015;
  const w = (W - m * 2 - gap * (n - 1)) / n;
  const labelH = unit * 0.12;
  const h = Math.max(unit * 0.25, Math.min(H - y - m - footer - labelH, unit * 0.75));
  const top = y + (H - y - m - footer - labelH - h) / 2;
  products.forEach((product, index) => {
    const x = m + index * (w + gap);
    drawPhoto(ctx, theme, product, x, top, w, h);
    const size = productSize(product.name);
    drawText(ctx, { text: size || product.name, x: x + w / 2, y: top + h + unit * 0.02, maxWidth: w, font: (s) => `800 ${s}px ${SANS}`, size: unit * (size ? 0.032 : 0.022), maxLines: 2, color: theme.ink, align: 'center', lineHeight: 1.1 });
  });
  drawFooter(ctx, theme, design, assets, W, H, m);
}

const TEMPLATE_RENDERERS: Record<TemplateId, typeof spotlight> = { spotlight, offer, grid, announcement, beforeAfter, review, steps, thisOrThat, lineup };

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
  if (design.qr && assets.qr) {
    // Bottom-right, above the footer, on a white tile so phones can scan it.
    const unit = Math.min(format.width, format.height);
    const size = unit * 0.15;
    const pad = size * 0.08;
    const x = format.width - unit * 0.07 - size;
    const y = format.height - unit * 0.07 - unit * 0.1 - size;
    ctx.save();
    roundRect(ctx, x - pad, y - pad, size + pad * 2, size + pad * 2, pad * 1.5);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = pad * 2;
    ctx.fill();
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(assets.qr, x, y, size, size);
    ctx.imageSmoothingEnabled = true;
  }
  // Free items go on top; their boxes are listed last so they are grabbed first.
  for (const box of drawElements(ctx, design.elements ?? [], format.width, format.height)) {
    hitBoxes.push({ ...box, id: `el:${box.id}`, spaceW: format.width, spaceH: format.height, source: { x: 0, y: 0, w: 1, h: 1 } });
  }
  return hitBoxes;
}

/* ----------------------------------------------------------------- copy */

const COPY: Record<StudioLang, {
  defaults: Record<TemplateId, { eyebrow: string; headline: string; subline: string; badge: string }>;
  quick: { label: string; badge: string }[];
}> = {
  mk: {
    defaults: {
      spotlight: { eyebrow: `Избор на ${SHOP}`, headline: '', subline: '', badge: '' },
      offer: { eyebrow: 'Понуда', headline: 'Специјална понуда', subline: 'Само оваа недела или до истекување на залихите.', badge: '-20%' },
      grid: { eyebrow: SHOP, headline: 'Омилени производи', subline: '', badge: '' },
      beforeAfter: { eyebrow: 'Резултати', headline: 'Пред и потоа', subline: '', badge: '' },
      review: { eyebrow: 'Што велат нашите купувачи', headline: '„Залепете ги зборовите на купувачот тука.“', subline: '— Име на купувачот', badge: '★★★★★' },
      steps: { eyebrow: 'Совет', headline: 'Како да го користите', subline: 'Нанесете на влажна коса\nМасирајте 2 минути\nИсплакнете со млака вода', badge: '' },
      thisOrThat: { eyebrow: 'Анкета', headline: 'Кој е ваш избор?', subline: '', badge: '' },
      lineup: { eyebrow: SHOP, headline: 'Сите големини', subline: '', badge: '' },
      announcement: { eyebrow: SHOP, headline: 'Бесплатна достава', subline: `За сите нарачки од ${FREE_FROM} ден. низ цела Македонија.`, badge: HOST },
    },
    quick: [{ label: 'Ново', badge: 'НОВО' }, { label: '-10%', badge: '-10%' }, { label: '-20%', badge: '-20%' }, { label: '1+1', badge: '1+1' }, { label: 'Хит', badge: 'ХИТ' }],
  },
  sq: {
    defaults: {
      spotlight: { eyebrow: `Zgjedhja e ${SHOP}`, headline: '', subline: '', badge: '' },
      offer: { eyebrow: 'Ofertë', headline: 'Ofertë speciale', subline: 'Vetëm këtë javë ose deri në mbarim të stokut.', badge: '-20%' },
      grid: { eyebrow: SHOP, headline: 'Produktet e preferuara', subline: '', badge: '' },
      beforeAfter: { eyebrow: 'Rezultate', headline: 'Para dhe pas', subline: '', badge: '' },
      review: { eyebrow: 'Çfarë thonë klientët tanë', headline: '“Ngjitni fjalët e klientit këtu.”', subline: '— Emri i klientit', badge: '★★★★★' },
      steps: { eyebrow: 'Këshillë', headline: 'Si ta përdorni', subline: 'Aplikoni në flokë të lagur\nMasazhoni 2 minuta\nShpëlajeni me ujë të vakët', badge: '' },
      thisOrThat: { eyebrow: 'Sondazh', headline: 'Cila është zgjedhja juaj?', subline: '', badge: '' },
      lineup: { eyebrow: SHOP, headline: 'Të gjitha madhësitë', subline: '', badge: '' },
      announcement: { eyebrow: SHOP, headline: 'Dërgesë falas', subline: `Për të gjitha porositë nga ${FREE_FROM} den. në gjithë Maqedoninë.`, badge: HOST },
    },
    quick: [{ label: 'E re', badge: 'E RE' }, { label: '-10%', badge: '-10%' }, { label: '-20%', badge: '-20%' }, { label: '1+1', badge: '1+1' }, { label: 'Hit', badge: 'HIT' }],
  },
  en: {
    defaults: {
      spotlight: { eyebrow: `${SHOP} picks`, headline: '', subline: '', badge: '' },
      offer: { eyebrow: 'Offer', headline: 'Special offer', subline: 'This week only, or while stocks last.', badge: '-20%' },
      grid: { eyebrow: SHOP, headline: 'Our favourites', subline: '', badge: '' },
      beforeAfter: { eyebrow: 'Results', headline: 'Before & after', subline: '', badge: '' },
      review: { eyebrow: 'What our customers say', headline: '“Paste the customer’s words here.”', subline: '— Customer name', badge: '★★★★★' },
      steps: { eyebrow: 'Tip', headline: 'How to use it', subline: 'Apply to damp hair\nMassage for 2 minutes\nRinse with lukewarm water', badge: '' },
      thisOrThat: { eyebrow: 'Poll', headline: 'Which one is yours?', subline: '', badge: '' },
      lineup: { eyebrow: SHOP, headline: 'Every size', subline: '', badge: '' },
      announcement: { eyebrow: SHOP, headline: 'Free delivery', subline: `On every order from ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-US')} MKD across North Macedonia.`, badge: HOST },
    },
    quick: [{ label: 'New', badge: 'NEW' }, { label: '-10%', badge: '-10%' }, { label: '-20%', badge: '-20%' }, { label: '1+1', badge: '1+1' }, { label: 'Best seller', badge: 'HIT' }],
  },
};

export const templateDefaults = (template: TemplateId, lang: StudioLang) => COPY[lang].defaults[template];
export const quickBadges = (lang: StudioLang) => COPY[lang].quick;

/**
 * Draws the post without its text blocks and free items, and returns the text
 * blocks that were left out, so the canvas editor can show them as editable
 * text layers on top of this picture.
 */
export function renderDesignWithoutText(canvas: HTMLCanvasElement, design: StudioDesign, assets: RenderAssets): CapturedText[] {
  textCapture = [];
  try {
    renderDesign(canvas, { ...design, elements: [] }, assets);
    return textCapture;
  } finally {
    textCapture = null;
  }
}
