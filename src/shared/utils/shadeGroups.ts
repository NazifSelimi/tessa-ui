/**
 * Groups a colour line's shades by tone, read from the professional shade
 * code: depth before the dot, reflects after it (7.03, 6.66, 10.1, 8.2F).
 */

import type { ProductShade } from '@/types';

export type ShadeGroupKey =
  | 'natural' | 'warmNatural' | 'ash' | 'violet' | 'gold' | 'copper' | 'mahogany' | 'red'
  | 'brown' | 'pearl' | 'superBlonde' | 'fantasy' | 'ice' | 'toners' | 'lighteners' | 'other';

const GROUP_ORDER: ShadeGroupKey[] = [
  'natural', 'warmNatural', 'ash', 'pearl', 'gold', 'copper', 'red', 'mahogany', 'violet', 'brown',
  'superBlonde', 'fantasy', 'ice', 'toners', 'lighteners', 'other',
];

const REFLECT_GROUPS: Record<string, ShadeGroupKey> = {
  '1': 'ash', '2': 'violet', '3': 'gold', '4': 'copper', '5': 'mahogany', '6': 'red', '7': 'brown', '8': 'pearl', '9': 'ash',
};

export function shadeGroup(shade: Pick<ProductShade, 'shadeCode' | 'shadeName'>): ShadeGroupKey {
  const code = (shade.shadeCode ?? '').trim().toUpperCase();
  const name = (shade.shadeName ?? '').toLowerCase();

  if (code.endsWith('ICE')) return 'ice';
  if (/^T\./.test(code) || name.includes('toner')) return 'toners';
  if (/^(S|ML)\./.test(code) || name.includes('lightener')) return 'lighteners';

  const match = code.match(/^(\d{1,2})(?:[./](\d{1,4}))?([A-Z])?$/);
  if (!match) return 'other';

  const [, levelText, reflects = '', suffix] = match;
  if (suffix === 'F') return 'fantasy';
  if (Number(levelText) >= 11) return 'superBlonde';
  if (/^0*$/.test(reflects)) return 'natural';
  if (reflects.startsWith('0')) return 'warmNatural';

  return REFLECT_GROUPS[reflects[0]] ?? 'other';
}

/** Shades in their original (shade) order, split into tone groups in a fixed group order. */
export function groupShades(shades: ProductShade[]): { key: ShadeGroupKey; shades: ProductShade[] }[] {
  const groups = new Map<ShadeGroupKey, ProductShade[]>();
  shades.forEach((shade) => {
    const key = shadeGroup(shade);
    groups.set(key, [...(groups.get(key) ?? []), shade]);
  });

  return GROUP_ORDER.filter((key) => groups.has(key)).map((key) => ({ key, shades: groups.get(key)! }));
}
