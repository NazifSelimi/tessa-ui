import { useTranslation } from 'react-i18next';
import type { Product } from '@/types';
import { PRODUCT_AUDIENCES } from '@/shared/utils/productVisibility';

const AUDIENCE_KEYS = {
  guests: 'product.audienceGuests',
  customers: 'product.audienceCustomers',
  stylists: 'product.audienceStylists',
} as const;

/**
 * Admin-only note on products the admin has hidden or limited to some groups.
 * Only admins receive visibleTo from the API, so nothing renders for shoppers.
 */
export default function VisibilityBadge({ product, className }: { product: Product; className: string }) {
  const { t } = useTranslation();
  if (!Array.isArray(product.visibleTo) || product.visibleTo.length === PRODUCT_AUDIENCES.length) return null;

  const label = product.visibleTo.length === 0
    ? t('product.visibilityHidden')
    : t('product.visibleOnlyTo', {
      audiences: PRODUCT_AUDIENCES
        .filter((audience) => product.visibleTo!.includes(audience.value))
        .map((audience) => t(AUDIENCE_KEYS[audience.value]))
        .join(' + '),
    });

  return <span className={`${className}${product.visibleTo.length === 0 ? ' is-hidden' : ''}`}>{label}</span>;
}
