/**
 * useReorder — one-tap "order again" from a past order.
 *
 * Salons/customers rebuy the same items repeatedly; this is the single
 * highest-leverage feature for moving the offline restock habit online.
 *
 * For each line in the order we fetch the product *fresh* (so price and stock
 * reflect today, not the historical order), add in-stock items to the cart,
 * and report anything that's unavailable. Opens the cart drawer when done.
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLazyGetProductByIdQuery } from '@/features/products/api';
import { useCart } from '@/hooks/useCart';
import type { Order } from '@/types';

export function useReorder() {
  const { t } = useTranslation();
  const [fetchProduct] = useLazyGetProductByIdQuery();
  const { addItem, openDrawer } = useCart();
  const [isReordering, setIsReordering] = useState(false);

  const reorder = useCallback(async (order: Order | undefined | null) => {
    if (!order?.items?.length || isReordering) return;

    setIsReordering(true);
    let added = 0;
    let skipped = 0;

    for (const item of order.items) {
      try {
        const product = await fetchProduct(String(item.productId)).unwrap();
        const inStock = typeof product.inStock === 'boolean'
          ? product.inStock
          : (product.quantity ?? 0) > 0;

        if (!inStock) {
          skipped += 1;
          continue;
        }
        addItem(product, item.quantity || 1);
        added += 1;
      } catch {
        skipped += 1;
      }
    }

    setIsReordering(false);

    if (added > 0) {
      openDrawer();
      message.success(t('reorder.added', { count: added }));
      if (skipped > 0) {
        message.warning(t('reorder.someUnavailable', { count: skipped }));
      }
    } else {
      message.error(t('reorder.noneAvailable'));
    }
  }, [fetchProduct, addItem, openDrawer, isReordering, t]);

  return { reorder, isReordering };
}

export default useReorder;
