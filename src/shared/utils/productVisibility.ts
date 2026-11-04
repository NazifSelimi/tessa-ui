import type { Product, ProductAudience } from '@/types';

/** Who an admin can show a product to (matches Product::AUDIENCES in the API). */
export const PRODUCT_AUDIENCES: { value: ProductAudience; label: string; short: string }[] = [
  { value: 'guests', label: 'Guests (not signed in)', short: 'Guests' },
  { value: 'customers', label: 'Customers (signed in)', short: 'Customers' },
  { value: 'stylists', label: 'Stylists & salons', short: 'Stylists' },
];

const ALL: ProductAudience[] = PRODUCT_AUDIENCES.map((a) => a.value);

/** Audiences ticked for a product; older API responses only carry stylistOnly. */
export function productVisibleTo(product: Pick<Product, 'visibleTo' | 'stylistOnly'>): ProductAudience[] {
  if (Array.isArray(product.visibleTo)) {
    return ALL.filter((a) => product.visibleTo!.includes(a));
  }
  return product.stylistOnly ? ['stylists'] : [...ALL];
}

/** Short label + tag colour for admin badges. */
export function visibilitySummary(audiences: ProductAudience[]): { label: string; color: string; hidden: boolean; everyone: boolean } {
  if (audiences.length === 0) return { label: 'Hidden', color: 'red', hidden: true, everyone: false };
  if (audiences.length === ALL.length) return { label: 'Everyone', color: 'default', hidden: false, everyone: true };
  const label = PRODUCT_AUDIENCES.filter((a) => audiences.includes(a.value)).map((a) => a.short).join(' + ');
  return { label: `${label} only`, color: 'purple', hidden: false, everyone: false };
}
