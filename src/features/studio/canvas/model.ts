/**
 * Canvas editor document: a post as a stack of layers (text, image, shapes),
 * like a single Figma frame. Everything is in post pixels (e.g. 1080 × 1350).
 * layers[0] is at the back, the last layer is in front.
 */
import { getBrandKit } from '../brand';

export type LayerType = 'text' | 'image' | 'rect' | 'ellipse';
export type TextAlign = 'left' | 'center' | 'right';

export interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise, around the layer's centre. */
  rotation: number;
  /** 0–1. */
  opacity: number;
  visible: boolean;
  locked: boolean;
  /** Layers sharing a groupId move and select together. */
  groupId?: string;
}

export interface TextProps {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  color: string;
  align: TextAlign;
  /** Multiple of the font size. */
  lineHeight: number;
  /** Pixels. */
  letterSpacing: number;
  uppercase: boolean;
}

export interface TextLayer extends BaseLayer, TextProps {
  type: 'text';
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  /** cover = fill the box and crop; contain = show it whole. */
  fit: 'cover' | 'contain';
  /** Crop zoom (1 = no zoom) and focus point (0–1) for cover. */
  zoom: number;
  focusX: number;
  focusY: number;
  radius: number;
  /** Colour adjustments in percent (100 = unchanged); missing on older saves. */
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

/** CSS / canvas filter for an image layer's colour adjustments ('none' when unchanged). */
export const imageFilter = (layer: Pick<ImageLayer, 'brightness' | 'contrast' | 'saturation'>) => {
  const b = layer.brightness ?? 100;
  const c = layer.contrast ?? 100;
  const s = layer.saturation ?? 100;
  return b === 100 && c === 100 && s === 100 ? 'none' : `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
};

export interface ShapeLayer extends BaseLayer {
  type: 'rect' | 'ellipse';
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
}

export type Layer = TextLayer | ImageLayer | ShapeLayer;

export interface TextStyle extends Omit<TextProps, 'text'> {
  id: string;
  name: string;
}

export interface CanvasDoc {
  version: 1;
  width: number;
  height: number;
  background: string;
  layers: Layer[];
  groups: Record<string, { name: string }>;
  textStyles: TextStyle[];
}

export interface Box { x: number; y: number; w: number; h: number }

let counter = 0;
export const uid = (prefix = 'l') => `${prefix}${Date.now().toString(36)}${(counter += 1).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Fonts offered in the editor. Brand fonts first; the rest are on every computer. */
export function fontChoices(): { value: string; label: string }[] {
  const { fonts } = getBrandKit();
  return [
    { value: fonts.serif, label: 'Brand serif (Fraunces)' },
    { value: fonts.sans, label: 'Brand sans (Manrope)' },
    { value: "Georgia, 'Times New Roman', serif", label: 'Georgia' },
    { value: "'Helvetica Neue', Arial, sans-serif", label: 'Helvetica / Arial' },
    { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet' },
    { value: "'Courier New', monospace", label: 'Courier' },
    { value: "'Brush Script MT', cursive", label: 'Brush script' },
  ];
}

const base = (type: LayerType, name: string, box: Box): BaseLayer => ({
  id: uid(), type, name, ...box, rotation: 0, opacity: 1, visible: true, locked: false,
});

export function makeText(box: Partial<Box> & { x: number; y: number }, extra: Partial<TextLayer> = {}): TextLayer {
  const brand = getBrandKit();
  const fontSize = extra.fontSize ?? 64;
  const text = extra.text ?? 'Your text';
  return {
    ...base('text', extra.name ?? text.split('\n')[0].slice(0, 30), { w: 600, h: Math.round(fontSize * 1.2), ...box }),
    text,
    fontFamily: brand.fonts.sans,
    fontSize,
    fontWeight: 700,
    italic: false,
    color: brand.ink,
    align: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
    uppercase: false,
    ...extra,
    type: 'text',
  };
}

export function makeShape(type: 'rect' | 'ellipse', box: Box, extra: Partial<ShapeLayer> = {}): ShapeLayer {
  return {
    ...base(type, type === 'rect' ? 'Rectangle' : 'Ellipse', box),
    fill: getBrandKit().primary,
    stroke: '#000000',
    strokeWidth: 0,
    radius: 0,
    ...extra,
    type,
  };
}

export function makeImage(src: string, box: Box, extra: Partial<ImageLayer> = {}): ImageLayer {
  return {
    ...base('image', 'Image', box),
    src, fit: 'cover', zoom: 1, focusX: 0.5, focusY: 0.5, radius: 0,
    ...extra,
    type: 'image',
  };
}

export function blankDoc(width = 1080, height = 1350): CanvasDoc {
  return { version: 1, width, height, background: '#f6eee9', layers: [], groups: {}, textStyles: [] };
}

/** CSS font shorthand for a text layer (also used to draw it on the export canvas). */
export const cssFont = (layer: Pick<TextProps, 'italic' | 'fontWeight' | 'fontSize' | 'fontFamily'>) =>
  `${layer.italic ? 'italic ' : ''}${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;

export const displayText = (layer: Pick<TextProps, 'text' | 'uppercase'>) => (layer.uppercase ? layer.text.toUpperCase() : layer.text);

/** Accepts a saved document only if it looks like one (old or broken saves are ignored). */
export function parseDoc(value: unknown): CanvasDoc | null {
  if (!value || typeof value !== 'object') return null;
  const doc = value as Partial<CanvasDoc>;
  if (doc.version !== 1 || !Array.isArray(doc.layers) || !(Number(doc.width) > 0) || !(Number(doc.height) > 0)) return null;
  return {
    version: 1,
    width: Number(doc.width),
    height: Number(doc.height),
    background: typeof doc.background === 'string' ? doc.background : '#ffffff',
    layers: doc.layers.filter((layer) => layer && typeof layer.id === 'string' && ['text', 'image', 'rect', 'ellipse'].includes(layer.type)),
    groups: doc.groups && typeof doc.groups === 'object' ? doc.groups : {},
    textStyles: Array.isArray(doc.textStyles) ? doc.textStyles : [],
  };
}
