/**
 * Storefront-only catalogue display rules.
 *
 * The supplier importer gives unmatched products a fallback brand, an internal
 * review category and a shared "pending review" placeholder image. Admins need
 * to see those values, so the API still returns them; customer-facing views use
 * these helpers to hide them instead.
 */

import type { Brand, Category, Product } from '@/types';

const INTERNAL_BRAND_NAMES = ['supplier catalogue'];
const INTERNAL_CATEGORY_NAMES = ['catalogue review'];
const PENDING_PLACEHOLDER_PATH = '/catalog-placeholders/';

const normalize = (name?: string | null) => (name ?? '').trim().toLowerCase();

export const isInternalBrandName = (name?: string | null) => INTERNAL_BRAND_NAMES.includes(normalize(name));
export const isInternalCategoryName = (name?: string | null) => INTERNAL_CATEGORY_NAMES.includes(normalize(name));
export const isPendingPlaceholderUrl = (url?: string | null) => Boolean(url && url.includes(PENDING_PLACEHOLDER_PATH));

/** Brand name to show customers, or '' when the product has no real brand. */
export function storefrontBrandName(product: Pick<Product, 'brand'>): string {
  const name = typeof product.brand === 'object' ? product.brand?.name : product.brand;
  return name && !isInternalBrandName(name) ? name : '';
}

/** Category name to show customers, or '' when it is missing or internal. */
export function storefrontCategoryName(product: Pick<Product, 'category'>): string {
  const name = typeof product.category === 'object' ? product.category?.name : product.category;
  return name && !isInternalCategoryName(name) ? name : '';
}

/** First real image URL, skipping the supplier "pending review" placeholder. */
export function storefrontImageUrl(product: Pick<Product, 'image' | 'images'>): string | undefined {
  return [product.image, ...(product.images ?? [])].find((url): url is string => Boolean(url) && !isPendingPlaceholderUrl(url));
}

export const visibleBrands = (brands: Brand[]) => brands.filter((brand) => !isInternalBrandName(brand.name));
export const visibleCategories = (categories: Category[]) => categories.filter((category) => !isInternalCategoryName(category.name));
