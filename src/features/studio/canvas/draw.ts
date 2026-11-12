/** Draws a canvas document onto a <canvas>: used for the PNG export and thumbnails. */
import { cssFont, displayText, imageFilter, type CanvasDoc, type ImageLayer, type Layer, type ShapeLayer, type TextLayer } from './model';

/** Splits text into lines that fit `width`, like the editor's text boxes (wrap on spaces). */
export function wrapText(measure: (text: string) => number, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/(\s+)/).filter((w) => w.length);
    let line = '';
    for (const word of words) {
      const candidate = line + word;
      if (!line.trim() || measure(candidate.trimEnd()) <= width + 0.5) {
        line = candidate;
      } else {
        lines.push(line.trimEnd());
        line = word.trimStart();
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** Where a picture lands inside its box for cover / contain with crop zoom + focus. */
export function imagePlacement(layer: Pick<ImageLayer, 'w' | 'h' | 'fit' | 'zoom' | 'focusX' | 'focusY'>, iw: number, ih: number) {
  const scale = (layer.fit === 'cover' ? Math.max(layer.w / iw, layer.h / ih) : Math.min(layer.w / iw, layer.h / ih)) * (layer.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  return { x: (layer.w - dw) * layer.focusX, y: (layer.h - dh) * layer.focusY, w: dw, h: dh };
}

function roundRectPath(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.arcTo(w, 0, w, h, radius);
  ctx.arcTo(w, h, 0, h, radius);
  ctx.arcTo(0, h, 0, 0, radius);
  ctx.arcTo(0, 0, w, 0, radius);
  ctx.closePath();
}

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

function drawText(ctx: Ctx, layer: TextLayer) {
  ctx.font = cssFont(layer);
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${layer.letterSpacing}px`;
  const lines = wrapText((t) => ctx.measureText(t).width, displayText(layer), layer.w);
  const lineH = layer.fontSize * layer.lineHeight;
  ctx.fillStyle = layer.color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = layer.align;
  const x = layer.align === 'center' ? layer.w / 2 : layer.align === 'right' ? layer.w : 0;
  lines.forEach((line, i) => ctx.fillText(line, x, lineH * (i + 0.5)));
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function drawShape(ctx: Ctx, layer: ShapeLayer) {
  if (layer.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(layer.w / 2, layer.h / 2, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2);
  } else {
    roundRectPath(ctx, layer.w, layer.h, layer.radius);
  }
  if (layer.fill && layer.fill !== 'transparent') {
    ctx.fillStyle = layer.fill;
    ctx.fill();
  }
  if (layer.strokeWidth > 0) {
    ctx.lineWidth = layer.strokeWidth;
    ctx.strokeStyle = layer.stroke;
    ctx.stroke();
  }
}

function drawImage(ctx: Ctx, layer: ImageLayer, image: HTMLImageElement | undefined) {
  if (!image || !image.naturalWidth) return;
  ctx.save();
  roundRectPath(ctx, layer.w, layer.h, layer.radius);
  ctx.clip();
  const p = imagePlacement(layer, image.naturalWidth, image.naturalHeight);
  const filter = imageFilter(layer);
  if (filter !== 'none') ctx.filter = filter;
  ctx.drawImage(image, p.x, p.y, p.w, p.h);
  ctx.restore();
}

export function drawLayer(ctx: Ctx, layer: Layer, images: Map<string, HTMLImageElement>) {
  if (!layer.visible) return;
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.translate(layer.x + layer.w / 2, layer.y + layer.h / 2);
  if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.translate(-layer.w / 2, -layer.h / 2);
  if (layer.type === 'text') drawText(ctx, layer);
  else if (layer.type === 'image') drawImage(ctx, layer, images.get(layer.src));
  else drawShape(ctx, layer);
  ctx.restore();
}

export function loadDocImages(doc: CanvasDoc): Promise<Map<string, HTMLImageElement>> {
  const sources = [...new Set(doc.layers.filter((l): l is ImageLayer => l.type === 'image').map((l) => l.src))];
  return Promise.all(sources.map((src) => new Promise<[string, HTMLImageElement]>((resolve) => {
    const image = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) image.crossOrigin = 'anonymous';
    image.onload = () => resolve([src, image]);
    image.onerror = () => resolve([src, image]);
    image.src = src;
  }))).then((pairs) => new Map(pairs));
}

/** Renders the whole frame at full post size. */
export async function renderDoc(doc: CanvasDoc, scale = 1): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(doc.width * scale);
  canvas.height = Math.round(doc.height * scale);
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) return canvas;
  if (document.fonts?.ready) await document.fonts.ready;
  const images = await loadDocImages(doc);
  ctx.scale(scale, scale);
  ctx.fillStyle = doc.background;
  ctx.fillRect(0, 0, doc.width, doc.height);
  for (const layer of doc.layers) drawLayer(ctx, layer, images);
  return canvas;
}

export async function exportDocPng(doc: CanvasDoc): Promise<Blob | null> {
  const canvas = await renderDoc(doc);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
