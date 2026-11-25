import { useTranslation } from 'react-i18next';
import type { Product } from '@/types';
import { PRODUCT_AUDIENCES } from '@/shared/utils/productVisibility';

const AUDIENCE_KEYS = {
  guests: 'product.audienceGuests',
  customers: 'product.audienceCustomers',
  stylists: 'product.audienceStylists',
} as const;

/**
 * Admin-only note saying who can see the product: everyone, some groups, or nobody.
 * Only admins receive visibleTo from the API, so nothing renders for shoppers.
 */
export default function VisibilityBadge({ product, className }: { product: Product; className: string }) {
  const { t } = useTranslation();
  if (!Array.isArray(product.visibleTo)) return null;

  const everyone = product.visibleTo.length === PRODUCT_AUDIENCES.length;
  const label = everyone
    ? t('product.visibleEveryone')
    : product.visibleTo.length === 0
    ? t('product.visibilityHidden')
    : t('product.visibleOnlyTo', {
      audiences: PRODUCT_AUDIENCES
        .filter((audience) => product.visibleTo!.includes(audience.value))
        .map((audience) => t(AUDIENCE_KEYS[audience.value]))
        .join(' + '),
    });

  const state = everyone ? ' is-everyone' : product.visibleTo.length === 0 ? ' is-hidden' : '';
  return <span className={`${className}${state}`}>{label}</span>;
}
