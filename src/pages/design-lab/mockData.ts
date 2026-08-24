/**
 * Design Lab — data model + demo fallback.
 *
 * Live products come from the real API via useLabProducts (see
 * useLabProducts.ts). The PRODUCTS list below mirrors real catalog items
 * (names/prices from the tessa.mk DB) and is only used as an offline
 * fallback so the lab still renders without the backend.
 *
 * BUNDLES are design concepts — there is no bundles endpoint yet.
 */

export type LabRole = 'stylist' | 'customer';

export type BundleType = 'Professional Deal' | 'Hair Routine' | 'Stylist Pick';

/** Cart value at which delivery becomes free (MKD) — concept value. */
export const FREE_DELIVERY_AT = 6000;

export interface LabProduct {
  id: string;
  name: string;
  /** pack size when known (live data keeps sizes inside the name) */
  pack: string;
  brand: string;
  category: string;
  /** retail price (MKD) */
  retail: number;
  /** professional / stylist price (MKD) */
  stylist: number;
  stock: number;
  featured?: boolean;
  /** marketing flag e.g. "Bestseller" */
  tag?: string;
  /** stylist-only item (hidden pricing for normal customers) */
  proOnly?: boolean;
  /** gradient tone for the placeholder tile */
  tone: [string, string];
  emoji: string;
  /** real product photo URL (from the live catalog) */
  image?: string;
}

export interface LabBundle {
  id: string;
  name: string;
  type: BundleType;
  audience: string;
  itemCount: number;
  /** bundle price (MKD) */
  price: number;
  /** price if bought separately (MKD) */
  was: number;
  highlight: string;
  /** short contents preview */
  contents: string;
  tone: [string, string];
  emoji: string;
}

/** Offline fallback — mirrors real tessa.mk catalog items. */
export const PRODUCTS: LabProduct[] = [
  { id: 'p291', name: 'Botugen 300ml', pack: '', brand: 'Fanola', category: 'Shampoo', retail: 1320, stylist: 650, stock: 100, featured: true, tag: 'Bestseller', tone: ['#ede9fe', '#ddd6fe'], emoji: '🫧' },
  { id: 'p293', name: 'Botugen 1000ml', pack: '', brand: 'Fanola', category: 'Mask', retail: 2640, stylist: 1390, stock: 100, tone: ['#fae8ff', '#f5d0fe'], emoji: '🪮' },
  { id: 'p294', name: 'Botugen Restructuring Filler Spray 150ml', pack: '', brand: 'Fanola', category: 'Spray', retail: 1269, stylist: 650, stock: 100, tone: ['#e0f2fe', '#bae6fd'], emoji: '💨' },
  { id: 'p313', name: 'Curly Shine 350ml', pack: '', brand: 'Fanola', category: 'Shampoo', retail: 699, stylist: 270, stock: 100, featured: true, tone: ['#cffafe', '#a5f3fc'], emoji: '🫧' },
  { id: 'p314', name: 'Curly Shine 500ml', pack: '', brand: 'Fanola', category: 'Mask', retail: 715, stylist: 370, stock: 100, tone: ['#dcfce7', '#bbf7d0'], emoji: '🪮' },
  { id: 'p319', name: 'Easy Curl Curl Defining Cream 250ml', pack: '', brand: 'Fanola', category: 'Styling', retail: 1100, stylist: 380, stock: 100, tone: ['#ecfccb', '#d9f99d'], emoji: '✨' },
  { id: 'p324', name: 'Energy — Energizing Shampoo 350ml', pack: '', brand: 'Fanola', category: 'Shampoo', retail: 1180, stylist: 590, stock: 100, tone: ['#fef3c7', '#fde68a'], emoji: '🫧' },
  { id: 'p299', name: 'Anti Frizz Glossing Spray 150ml', pack: '', brand: 'Rr Line', category: 'Spray', retail: 649, stylist: 390, stock: 97, tone: ['#fee2e2', '#fecaca'], emoji: '💨' },
  { id: 'p298', name: 'Curl Defining Cream 250ml', pack: '', brand: 'Rr Line', category: 'Styling', retail: 869, stylist: 420, stock: 100, tone: ['#e2e8f0', '#cbd5e1'], emoji: '✨' },
  { id: 'p273', name: 'Bi Phase Oro Puro Conditioner 200ml', pack: '', brand: 'Oro Therapy', category: 'Spray', retail: 1199, stylist: 550, stock: 99, tag: 'Pro favourite', tone: ['#ffedd5', '#fed7aa'], emoji: '💧' },
  { id: 'pny1', name: 'No Yellow 9 Tone Bleaching Powder 500gr', pack: '', brand: 'No Yellow Color', category: 'Bleach and De Color', retail: 1590, stylist: 890, stock: 40, featured: true, tone: ['#f3e8ff', '#e9d5ff'], emoji: '🥣' },
  { id: 'pact1', name: 'Activator 20vol — 6% 1000ml', pack: '', brand: 'Oro Therapy', category: 'Activator', retail: 590, stylist: 320, stock: 120, tone: ['#e0f2fe', '#bae6fd'], emoji: '⚗️' },
];

/**
 * Bundle concepts built around the real assortment
 * (Fanola color + activators, No Yellow bleaches, care routines).
 */
export const BUNDLES: LabBundle[] = [
  { id: 'b1', name: 'Color Shelf Starter', type: 'Professional Deal', audience: 'For stylists & salons', itemCount: 14, price: 4990, was: 6580, highlight: 'Your Fanola color wall, refilled', contents: '12 color tubes + 2 activators 1L', tone: ['#6d28d9', '#8b5cf6'], emoji: '🎨' },
  { id: 'b2', name: 'Decolor + Oxidant Kit', type: 'Professional Deal', audience: 'For salons', itemCount: 4, price: 2790, was: 3560, highlight: 'Everything for lightening day', contents: '2× No Yellow bleach 500gr + 2× Hydrogen 1L', tone: ['#4c1d95', '#6d28d9'], emoji: '🥣' },
  { id: 'b3', name: 'No Yellow Restock 5+1', type: 'Professional Deal', audience: 'For stylists', itemCount: 6, price: 5450, was: 6540, highlight: '1 unit completely free', contents: '6× No Yellow Shampoo 1000ml (pay for 5)', tone: ['#4338ca', '#6366f1'], emoji: '💜' },
  { id: 'b4', name: 'Curly Shine Routine', type: 'Hair Routine', audience: 'For your clients', itemCount: 3, price: 1990, was: 2514, highlight: 'Cleanse · mask · define', contents: 'Curly Shine shampoo + mask + Easy Curl cream', tone: ['#0369a1', '#0ea5e9'], emoji: '🌀' },
  { id: 'b5', name: 'Botugen Repair Ritual', type: 'Hair Routine', audience: 'For your clients', itemCount: 3, price: 3290, was: 3909, highlight: 'Rebuild damaged & treated hair', contents: 'Botugen shampoo + mask + filler spray', tone: ['#15803d', '#22c55e'], emoji: '🌿' },
  { id: 'b6', name: 'Oro Therapy Gold Ritual', type: 'Stylist Pick', audience: 'Curated by Tessa Academy', itemCount: 4, price: 3890, was: 4790, highlight: '24k gold line for dull, dry hair', contents: 'Oro Puro shampoo + mask + bi-phase + fluid', tone: ['#b45309', '#f59e0b'], emoji: '⭐' },
];

/** A demo "previous order", used by repeat-order flows. */
export function lastOrderFor(products: LabProduct[]) {
  const pattern = [4, 6, 12, 2];
  const items: Record<string, number> = {};
  products.slice(0, pattern.length).forEach((p, i) => {
    items[p.id] = pattern[i];
  });
  return { date: '24 Jun', items };
}

/** Role-aware unit price + savings for a product. */
export function priceFor(p: LabProduct, role: LabRole) {
  const current = role === 'stylist' ? p.stylist : p.retail;
  const original = role === 'stylist' && p.retail > p.stylist ? p.retail : undefined;
  const savingsPct = original && original > 0
    ? Math.round(((original - current) / original) * 100)
    : 0;
  return { current, original, savingsPct };
}

export function savingsPct(was: number, price: number) {
  return was > 0 ? Math.round(((was - price) / was) * 100) : 0;
}

/** Totals + retail-vs-pro savings for a qty map. */
export function cartTotals(products: LabProduct[], qty: Record<string, number>, role: LabRole) {
  let count = 0;
  let total = 0;
  let retailTotal = 0;
  for (const p of products) {
    const q = qty[p.id] ?? 0;
    if (q > 0) {
      count += q;
      total += priceFor(p, role).current * q;
      retailTotal += p.retail * q;
    }
  }
  return { count, total, saved: retailTotal - total };
}
