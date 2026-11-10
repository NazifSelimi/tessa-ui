/**
 * Turns a Post Studio post into a canvas document: the layout (background,
 * photos, badges) becomes one locked picture at the back, and every text block
 * and free item becomes its own layer that can be selected, moved and edited.
 */
import { drawElements, type StudioElement } from '../elements';
import { getBrandKit } from '../brand';
import { formatById, renderDesignWithoutText, type CapturedText, type RenderAssets, type StudioDesign } from '../render';
import { blankDoc, makeImage, makeText, type CanvasDoc, type Layer, type TextLayer } from './model';

/** Reads "italic 800 52px 'Manrope', sans-serif" into its parts. */
export function parseCanvasFont(font: string): { italic: boolean; weight: number; size: number; family: string } {
  const match = /^\s*(italic\s+)?(?:(normal|bold|\d{3})\s+)?([\d.]+)px\s+(.+)$/i.exec(font);
  if (!match) return { italic: false, weight: 400, size: 32, family: getBrandKit().fonts.sans };
  const weight = match[2] === 'bold' ? 700 : match[2] && match[2] !== 'normal' ? Number(match[2]) : 400;
  return { italic: Boolean(match[1]), weight, size: Number(match[3]), family: match[4].trim() };
}

const squash = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

/** A friendly layer name: which field of the post the text came from, if any. */
export function nameForText(text: string, design: Pick<StudioDesign, 'eyebrow' | 'headline' | 'subline' | 'badge' | 'cta'>): string {
  const value = squash(text);
  const fields: [keyof typeof design, string][] = [['headline', 'Headline'], ['eyebrow', 'Small title'], ['subline', 'Subtitle'], ['badge', 'Badge'], ['cta', 'Button text']];
  for (const [key, label] of fields) {
    const field = squash(String(design[key] ?? ''));
    if (field && (value === field || (value.length > 6 && field.startsWith(value.replace(/…$/, ''))))) return label;
  }
  return text.split('\n')[0].slice(0, 28) || 'Text';
}

export function capturedToLayer(item: CapturedText, design: StudioDesign): TextLayer {
  const font = parseCanvasFont(item.font);
  const lines = item.text.split('\n').length;
  return makeText(
    { x: item.x, y: item.y, w: item.width, h: lines * item.fontSize * item.lineHeight },
    {
      name: nameForText(item.text, design),
      text: item.text,
      fontFamily: font.family,
      fontSize: item.fontSize,
      fontWeight: font.weight,
      italic: font.italic,
      color: item.color,
      align: item.align === 'center' ? 'center' : item.align === 'right' || item.align === 'end' ? 'right' : 'left',
      lineHeight: item.lineHeight,
      letterSpacing: item.letterSpacing,
    },
  );
}

/** A free item from the Create tab: text / emoji stay text, shapes become a picture of themselves. */
function elementToLayer(element: StudioElement, W: number, H: number): Layer | null {
  const unit = Math.min(W, H);
  if (element.kind !== 'shape') {
    const brand = getBrandKit();
    const size = element.size * unit;
    const lines = (element.text || ' ').split('\n');
    const probe = document.createElement('canvas').getContext('2d');
    let width = size * 4;
    if (probe) {
      probe.font = `${element.bold ? 700 : 500} ${size}px ${element.font === 'serif' ? brand.fonts.serif : brand.fonts.sans}`;
      width = Math.max(...lines.map((l) => probe.measureText(l).width), size) + size * 0.2;
    }
    const h = lines.length * size * 1.15;
    return makeText(
      { x: element.x * W - width / 2, y: element.y * H - h / 2, w: width, h },
      {
        name: element.kind === 'emoji' ? `Sticker ${element.text}` : element.text.split('\n')[0].slice(0, 28),
        text: element.text,
        fontFamily: element.kind === 'emoji' ? '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' : element.font === 'serif' ? brand.fonts.serif : brand.fonts.sans,
        fontSize: size,
        fontWeight: element.bold ? 700 : 500,
        color: element.color,
        align: 'center',
        lineHeight: 1.15,
      },
    );
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const [box] = drawElements(ctx, [element], W, H);
  if (!box) return null;
  const pad = 4;
  const crop = document.createElement('canvas');
  crop.width = Math.max(1, Math.ceil(box.w + pad * 2));
  crop.height = Math.max(1, Math.ceil(box.h + pad * 2));
  crop.getContext('2d')?.drawImage(canvas, box.x - pad, box.y - pad, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return makeImage(crop.toDataURL('image/png'), { x: box.x - pad, y: box.y - pad, w: crop.width, h: crop.height }, { name: element.text ? `${element.shape}: ${element.text}` : String(element.shape ?? 'Shape'), fit: 'contain' });
}

export function docFromPost(design: StudioDesign, assets: RenderAssets): CanvasDoc {
  const format = formatById(design.format);
  const canvas = document.createElement('canvas');
  const texts = renderDesignWithoutText(canvas, design, assets);
  let backgroundSrc: string;
  try {
    // JPEG keeps it small enough to autosave in the browser.
    backgroundSrc = canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    backgroundSrc = '';
  }
  const doc = blankDoc(format.width, format.height);
  const layers: Layer[] = [];
  if (backgroundSrc) {
    layers.push(makeImage(backgroundSrc, { x: 0, y: 0, w: format.width, h: format.height }, { name: 'Layout (photos & background)', locked: true, fit: 'cover' }));
  }
  layers.push(...texts.map((item) => capturedToLayer(item, design)));
  for (const element of design.elements ?? []) {
    const layer = elementToLayer(element, format.width, format.height);
    if (layer) layers.push(layer);
  }
  return { ...doc, layers };
}
