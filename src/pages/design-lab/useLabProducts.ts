/**
 * Design Lab — live catalog adapter.
 *
 * Pulls real products from the existing products API and maps them into the
 * lab's LabProduct shape so all 5 concepts render the actual tessa.mk
 * assortment (Fanola, Rr Line, Oro Therapy, No Yellow Color) with real
 * images and real retail/stylist prices.
 *
 * The catalog is name-sorted server-side and Hair Color (~274 SKUs) starts on
 * later pages, so we fetch two pages to get a representative mix of care,
 * styling, technical products AND color.
 */

import { useMemo } from 'react';
import { useGetProductsQuery } from '@/features/products/api';
import type { Product } from '@/types';
import { PRODUCTS as FALLBACK, type LabProduct } from './mockData';

const TONES: [string, string][] = [
  ['#ede9fe', '#ddd6fe'],
  ['#e0f2fe', '#bae6fd'],
  ['#fae8ff', '#f5d0fe'],
  ['#fee2e2', '#fecaca'],
  ['#ffedd5', '#fed7aa'],
  ['#fef3c7', '#fde68a'],
  ['#dcfce7', '#bbf7d0'],
  ['#cffafe', '#a5f3fc'],
];

const CATEGORY_EMOJI: Record<string, string> = {
  'hair color': '🎨',
  'color mask': '🎨',
  shampoo: '🫧',
  mask: '🪮',
  conditioner: '🧴',
  spray: '💨',
  styling: '✨',
  lotion: '💧',
  fluid: '💧',
  filler: '💉',
  activator: '⚗️',
  'hydrogen peroxide': '⚗️',
  'bleach and de color': '🥣',
  sets: '🎁',
  tester: '🧪',
};

function nameOf(v: Product['brand'] | Product['category']): string {
  if (v && typeof v === 'object') return v.name;
  return v ?? '';
}

export function toLabProduct(p: Product, i: number): LabProduct {
  const category = nameOf(p.category) || 'Other';
  const retail = Number(p.price ?? 0);
  const stylist = Number(p.stylistPrice ?? 0) || retail;
  return {
    id: String(p.id),
    name: p.name,
    pack: '',
    brand: nameOf(p.brand),
    category,
    retail,
    stylist,
    stock: p.quantity ?? (p.inStock ? 99 : 0),
    featured: p.featured,
    tag: p.featured ? 'Featured' : undefined,
    proOnly: p.stylistOnly,
    tone: TONES[i % TONES.length],
    emoji: CATEGORY_EMOJI[category.toLowerCase()] ?? '🧴',
    image: p.image || p.images?.[0] || undefined,
  };
}

/** Category chips ordered by how much of the assortment they cover. */
export function categoriesOf(products: LabProduct[]): string[] {
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return ['All', ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)];
}

export function useLabProducts(): {
  products: LabProduct[];
  live: boolean;
  loading: boolean;
} {
  // Page 1: care/styling/technical. Page 4: deep into Hair Color territory.
  const first = useGetProductsQuery({ perPage: 48, page: 1 });
  const color = useGetProductsQuery({ perPage: 48, page: 4 });

  return useMemo(() => {
    const raw = [...(first.data?.data ?? []), ...(color.data?.data ?? [])];
    const seen = new Set<string>();
    const real: LabProduct[] = [];
    raw.forEach((p, i) => {
      const id = String(p.id);
      if (seen.has(id)) return;
      seen.add(id);
      const lab = toLabProduct(p, i);
      if (lab.retail > 0) real.push(lab);
    });

    const loading = first.isLoading || color.isLoading;
    return {
      products: real.length ? real : loading ? [] : FALLBACK,
      live: real.length > 0,
      loading,
    };
  }, [first.data, color.data, first.isLoading, color.isLoading]);
}
