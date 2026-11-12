/**
 * Free items on a post: text boxes, emoji stickers and simple shapes (ribbon,
 * arrow, circle, burst, line). They are drawn on top of the layout in list
 * order (later = in front) and can be dragged / resized on the preview.
 */
import { getBrandKit } from './brand';

export type ElementKind = 'text' | 'emoji' | 'shape';
export type ShapeKind = 'ribbon' | 'arrow' | 'circle' | 'burst' | 'line';

export interface StudioElement {
  id: string;
  kind: ElementKind;
  /** Centre, as 0–1 of the image width / height. */
  x: number;
  y: number;
  /** Text / emoji size or shape width, as a share of the image's shorter side. */
  size: number;
  text: string;
  font: 'serif' | 'sans';
  color: string;
  /** Text colour on ribbons and bursts. */
  ink: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  shape?: ShapeKind;
}

export const EMOJIS = ['✨', '🔥', '💖', '⭐', '🎁', '💯', '👉', '✅', '🌸', '💧', '🛍️', '⏰'];

export const SHAPES: { value: ShapeKind; label: string }[] = [
  { value: 'ribbon', label: 'Ribbon' },
  { value: 'burst', label: 'Burst' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'circle', label: 'Circle' },
  { value: 'line', label: 'Line' },
];

let counter = 0;
const newId = () => `el${Date.now().toString(36)}${(counter += 1)}`;

export function makeElement(kind: ElementKind, extra: Partial<StudioElement> = {}): StudioElement {
  const brand = getBrandKit();
  const base: StudioElement = {
    id: newId(), kind, x: 0.5, y: 0.5, size: 0.07, text: '', font: 'sans', color: brand.ink, ink: '#ffffff', align: 'center', bold: true,
  };
  if (kind === 'text') return { ...base, text: 'Your text', size: 0.06, ...extra };
  if (kind === 'emoji') return { ...base, text: '✨', size: 0.1, ...extra };
  const shape = extra.shape ?? 'ribbon';
  const shapeDefaults: Record<ShapeKind, Partial<StudioElement>> = {
    ribbon: { text: 'NEW', size: 0.34, color: brand.primary },
    burst: { text: '-20%', size: 0.2, color: brand.primary },
    arrow: { size: 0.22, color: brand.primary },
    circle: { size: 0.16, color: brand.primary },
    line: { size: 0.3, color: brand.primary },
  };
  return { ...base, ...shapeDefaults[shape], ...extra, shape };
}

export const elementLabel = (element: StudioElement) =>
  element.kind === 'shape'
    ? `${SHAPES.find((shape) => shape.value === element.shape)?.label ?? 'Shape'}${element.text ? `: ${element.text}` : ''}`
    : element.kind === 'emoji' ? `Sticker ${element.text}` : `Text: ${element.text.split('\n')[0].slice(0, 24)}`;

export interface ElementBox { id: string; x: number; y: number; w: number; h: number }

const fontOf = (element: StudioElement, px: number) => {
  const { fonts } = getBrandKit();
  return `${element.bold ? 700 : 500} ${px}px ${element.font === 'serif' ? fonts.serif : fonts.sans}`;
};

function centredText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, font: string, colour: string, maxWidth: number) {
  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy, maxWidth);
}

function drawShape(ctx: CanvasRenderingContext2D, element: StudioElement, cx: number, cy: number, width: number): ElementBox {
  ctx.fillStyle = element.color;
  ctx.strokeStyle = element.color;
  switch (element.shape) {
    case 'circle': {
      ctx.beginPath();
      ctx.arc(cx, cy, width / 2, 0, Math.PI * 2);
      ctx.fill();
      if (element.text) centredText(ctx, element.text, cx, cy, fontOf(element, width * 0.28), element.ink, width * 0.85);
      return { id: element.id, x: cx - width / 2, y: cy - width / 2, w: width, h: width };
    }
    case 'burst': {
      const spikes = 14;
      const outer = width / 2;
      const inner = outer * 0.82;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i += 1) {
        const r = i % 2 === 0 ? outer : inner;
        const angle = (Math.PI * i) / spikes - Math.PI / 2;
        ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
      if (element.text) centredText(ctx, element.text, cx, cy, fontOf(element, width * 0.24), element.ink, width * 0.7);
      return { id: element.id, x: cx - outer, y: cy - outer, w: width, h: width };
    }
    case 'arrow': {
      const h = width * 0.42;
      const shaft = h * 0.36;
      const head = width * 0.38;
      ctx.beginPath();
      ctx.moveTo(cx - width / 2, cy - shaft / 2);
      ctx.lineTo(cx + width / 2 - head, cy - shaft / 2);
      ctx.lineTo(cx + width / 2 - head, cy - h / 2);
      ctx.lineTo(cx + width / 2, cy);
      ctx.lineTo(cx + width / 2 - head, cy + h / 2);
      ctx.lineTo(cx + width / 2 - head, cy + shaft / 2);
      ctx.lineTo(cx - width / 2, cy + shaft / 2);
      ctx.closePath();
      ctx.fill();
      return { id: element.id, x: cx - width / 2, y: cy - h / 2, w: width, h };
    }
    case 'line': {
      const h = Math.max(4, width * 0.035);
      ctx.beginPath();
      ctx.roundRect(cx - width / 2, cy - h / 2, width, h, h / 2);
      ctx.fill();
      return { id: element.id, x: cx - width / 2, y: cy - h * 2, w: width, h: h * 4 };
    }
    default: {
      // Ribbon: a banner with notched ends.
      const h = width * 0.26;
      const notch = h * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx - width / 2, cy - h / 2);
      ctx.lineTo(cx + width / 2, cy - h / 2);
      ctx.lineTo(cx + width / 2 - notch, cy);
      ctx.lineTo(cx + width / 2, cy + h / 2);
      ctx.lineTo(cx - width / 2, cy + h / 2);
      ctx.lineTo(cx - width / 2 + notch, cy);
      ctx.closePath();
      ctx.fill();
      if (element.text) centredText(ctx, element.text, cx, cy + h * 0.02, fontOf(element, h * 0.5), element.ink, width - notch * 2.4);
      return { id: element.id, x: cx - width / 2, y: cy - h / 2, w: width, h };
    }
  }
}

/** Draws every item; returns where each one landed (for dragging on the preview). */
export function drawElements(ctx: CanvasRenderingContext2D, elements: StudioElement[], W: number, H: number): ElementBox[] {
  const unit = Math.min(W, H);
  const boxes: ElementBox[] = [];
  for (const element of elements) {
    const cx = element.x * W;
    const cy = element.y * H;
    ctx.save();
    if (element.kind === 'shape') {
      boxes.push(drawShape(ctx, element, cx, cy, element.size * unit));
    } else {
      const px = element.size * unit;
      const lines = (element.text || ' ').split('\n');
      ctx.font = element.kind === 'emoji' ? `${px}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif` : fontOf(element, px);
      const widths = lines.map((line) => ctx.measureText(line).width);
      const w = Math.max(...widths, px * 0.6);
      const lineH = px * 1.15;
      const h = lineH * lines.length;
      const left = element.align === 'left' ? cx : element.align === 'right' ? cx - w : cx - w / 2;
      ctx.fillStyle = element.color;
      ctx.textBaseline = 'middle';
      ctx.textAlign = element.align;
      lines.forEach((line, index) => ctx.fillText(line, cx, cy - h / 2 + lineH * (index + 0.5)));
      boxes.push({ id: element.id, x: left, y: cy - h / 2, w, h });
    }
    ctx.restore();
  }
  return boxes;
}
