/**
 * Ready-made pieces for the canvas ("widgets"): text styles, shop badges,
 * buttons, shapes and stickers. Several layers made together become a group.
 */
import { getBrandKit } from '../brand';
import { makeImage, makeShape, makeText, type Layer } from './model';
import { logoDataUrl } from './imageTools';

export interface Widget {
  id: string;
  group: 'Text' | 'Shop' | 'Shapes' | 'Stickers' | 'Brand';
  label: string;
  /** Short preview shown on the tile. */
  preview: string;
  /** Builds the layers centred on (cx, cy); `unit` = the frame's shorter side. */
  make: (cx: number, cy: number, unit: number) => { layers: Layer[]; groupName?: string };
}

const centred = <T extends Layer>(layer: T, cx: number, cy: number): T => ({ ...layer, x: cx - layer.w / 2, y: cy - layer.h / 2 });

function textWidget(text: string, size: number, weight: number, serif: boolean, extra: Partial<Parameters<typeof makeText>[1]> = {}) {
  return (cx: number, cy: number, unit: number) => {
    const { fonts, ink } = getBrandKit();
    const fontSize = Math.round(unit * size);
    const w = Math.round(unit * 0.8);
    const layer = makeText({ x: 0, y: 0, w, h: fontSize * 1.2 }, {
      text, fontSize, fontWeight: weight, fontFamily: serif ? fonts.serif : fonts.sans, color: ink, align: 'center', ...extra,
    });
    return { layers: [centred(layer, cx, cy)] };
  };
}

/** A pill / box with text on it, grouped. */
function pill(text: string, fill: string, ink: string, wShare: number, hShare: number, radius: 'pill' | number, fontShare: number, name: string) {
  return (cx: number, cy: number, unit: number) => {
    const { fonts } = getBrandKit();
    const w = Math.round(unit * wShare);
    const h = Math.round(unit * hShare);
    const bg = makeShape('rect', { x: cx - w / 2, y: cy - h / 2, w, h }, { fill, radius: radius === 'pill' ? h / 2 : radius, name: `${name} background` });
    const fontSize = Math.round(unit * fontShare);
    const label = makeText({ x: cx - w / 2, y: cy - (fontSize * 1.2) / 2, w, h: fontSize * 1.2 }, {
      text, fontSize, fontWeight: 800, fontFamily: fonts.sans, color: ink, align: 'center', lineHeight: 1.2, letterSpacing: fontSize * 0.04, name: `${name} text`,
    });
    return { layers: [bg, label], groupName: name };
  };
}

function burst(text: string) {
  return (cx: number, cy: number, unit: number) => {
    const { primary, fonts } = getBrandKit();
    const d = Math.round(unit * 0.22);
    const circle = makeShape('ellipse', { x: cx - d / 2, y: cy - d / 2, w: d, h: d }, { fill: primary, name: 'Sale circle' });
    const fontSize = Math.round(d * 0.32);
    const label = makeText({ x: cx - d / 2, y: cy - (fontSize * 1.1) / 2, w: d, h: fontSize * 1.1 }, {
      text, fontSize, fontWeight: 900, fontFamily: fonts.sans, color: '#ffffff', align: 'center', lineHeight: 1.1, name: 'Sale text',
    });
    return { layers: [{ ...circle, rotation: -12 }, { ...label, rotation: -12 }], groupName: `Sale ${text}` };
  };
}

function sticker(emoji: string) {
  return (cx: number, cy: number, unit: number) => {
    const fontSize = Math.round(unit * 0.12);
    const layer = makeText({ x: 0, y: 0, w: fontSize * 1.4, h: fontSize * 1.2 }, {
      text: emoji, fontSize, fontWeight: 400, align: 'center', name: `Sticker ${emoji}`,
      fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
    });
    return { layers: [centred(layer, cx, cy)] };
  };
}

export function widgets(): Widget[] {
  const { primary, ink } = getBrandKit();
  return [
    { id: 'heading', group: 'Text', label: 'Heading', preview: 'Aa', make: textWidget('Big headline', 0.09, 700, true, { name: 'Heading' }) },
    { id: 'subheading', group: 'Text', label: 'Subheading', preview: 'Aa', make: textWidget('A short subheading', 0.05, 600, false, { name: 'Subheading' }) },
    { id: 'body', group: 'Text', label: 'Body text', preview: '¶', make: textWidget('Write a few words about the product here.', 0.035, 500, false, { name: 'Body text' }) },
    { id: 'label', group: 'Text', label: 'Small label', preview: 'ABC', make: textWidget('NEW IN', 0.03, 800, false, { name: 'Label', uppercase: true, letterSpacing: 6, color: primary }) },
    { id: 'quote', group: 'Text', label: 'Quote', preview: '“ ”', make: textWidget('“The best shampoo I have tried.”', 0.05, 500, true, { name: 'Quote', italic: true }) },
    { id: 'stars', group: 'Text', label: 'Rating', preview: '★★★★★', make: textWidget('★★★★★', 0.06, 400, false, { name: 'Rating', color: '#e3a008', letterSpacing: 4 }) },

    { id: 'price', group: 'Shop', label: 'Price tag', preview: '790 ден', make: pill('790 ден', ink, '#ffffff', 0.34, 0.1, 'pill', 0.05, 'Price tag') },
    { id: 'sale', group: 'Shop', label: 'Sale burst', preview: '-20%', make: burst('-20%') },
    { id: 'new', group: 'Shop', label: 'Badge', preview: 'NEW', make: pill('NEW', primary, '#ffffff', 0.2, 0.07, 'pill', 0.035, 'Badge') },
    { id: 'button', group: 'Shop', label: 'Button', preview: 'Order now', make: pill('Order now', primary, '#ffffff', 0.42, 0.1, 18, 0.042, 'Button') },
    { id: 'delivery', group: 'Shop', label: 'Free delivery', preview: '🚚 Free', make: pill('Free delivery from 3,000 ден', '#ffffff', ink, 0.7, 0.09, 'pill', 0.034, 'Free delivery') },
    { id: 'code', group: 'Shop', label: 'Promo code', preview: 'CODE', make: pill('CODE: TESSA10', '#f6eee9', ink, 0.5, 0.09, 12, 0.04, 'Promo code') },

    { id: 'rect', group: 'Shapes', label: 'Rectangle', preview: '▭', make: (cx, cy, u) => ({ layers: [makeShape('rect', { x: cx - u * 0.2, y: cy - u * 0.14, w: u * 0.4, h: u * 0.28 })] }) },
    { id: 'rounded', group: 'Shapes', label: 'Rounded box', preview: '▢', make: (cx, cy, u) => ({ layers: [makeShape('rect', { x: cx - u * 0.2, y: cy - u * 0.14, w: u * 0.4, h: u * 0.28 }, { radius: u * 0.04, name: 'Rounded box' })] }) },
    { id: 'circle', group: 'Shapes', label: 'Circle', preview: '●', make: (cx, cy, u) => ({ layers: [makeShape('ellipse', { x: cx - u * 0.12, y: cy - u * 0.12, w: u * 0.24, h: u * 0.24 }, { name: 'Circle' })] }) },
    { id: 'line', group: 'Shapes', label: 'Line', preview: '—', make: (cx, cy, u) => ({ layers: [makeShape('rect', { x: cx - u * 0.25, y: cy - 2, w: u * 0.5, h: 4 }, { fill: ink, name: 'Line' })] }) },
    { id: 'outline', group: 'Shapes', label: 'Outline frame', preview: '⬚', make: (cx, cy, u) => ({ layers: [makeShape('rect', { x: cx - u * 0.3, y: cy - u * 0.3, w: u * 0.6, h: u * 0.6 }, { fill: 'transparent', stroke: ink, strokeWidth: 6, name: 'Outline frame' })] }) },
    { id: 'shade', group: 'Shapes', label: 'Dark overlay', preview: '◼', make: () => ({ layers: [] }) },

    { id: 'logo', group: 'Brand', label: 'Logo (dark)', preview: 'TESSA', make: (cx, cy, u) => ({ layers: [makeImage(logoDataUrl(ink), { x: cx - u * 0.18, y: cy - u * 0.07, w: u * 0.36, h: u * 0.137 }, { fit: 'contain', name: 'Logo' })] }) },
    { id: 'logo-light', group: 'Brand', label: 'Logo (white)', preview: 'TESSA', make: (cx, cy, u) => ({ layers: [makeImage(logoDataUrl('#ffffff'), { x: cx - u * 0.18, y: cy - u * 0.07, w: u * 0.36, h: u * 0.137 }, { fit: 'contain', name: 'Logo (white)' })] }) },

    ...['✨', '🔥', '💖', '⭐', '🎁', '💯', '👉', '✅', '🌸', '💧', '🛍️', '⏰'].map((emoji) => ({
      id: `sticker-${emoji}`, group: 'Stickers' as const, label: emoji, preview: emoji, make: sticker(emoji),
    })),
  ];
}

/** A see-through dark layer over the whole frame, so white text reads on a photo. */
export function overlayLayer(width: number, height: number): Layer {
  return { ...makeShape('rect', { x: 0, y: 0, w: width, h: height }, { fill: '#000000', name: 'Dark overlay' }), opacity: 0.35 };
}
