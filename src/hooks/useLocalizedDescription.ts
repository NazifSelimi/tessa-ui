import { useTranslation } from 'react-i18next';
import type { Product } from '@/types';

/**
 * Returns the product description in the current locale,
 * falling back to whatever the API returned in `description`.
 */
export function useLocalizedDescription(product: Product | null | undefined): string {
  const { i18n } = useTranslation();
  if (!product) return '';

  const locale = i18n.language;
  return product.translations?.[locale] ?? product.description ?? '';
}
