import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectIsStylist } from '@/features/auth/slice';
import { productsApi } from '@/features/products/api';
import { selectCartItems, setRolePrice } from './slice';

/**
 * Guests never receive salon prices from the API, so lines they added have no salon price.
 * When a business account signs in with such a cart, fetch the missing prices once.
 */
export function useSalonPriceRefresh(): void {
  const dispatch = useAppDispatch();
  const isProfessional = useAppSelector(selectIsStylist);
  const items = useAppSelector(selectCartItems);
  const missing = isProfessional
    ? items.filter((item) => !(Number(item.rolePrice) > 0)).map((item) => String(item.productId))
    : [];
  const missingKey = missing.join(',');

  useEffect(() => {
    if (!missingKey) return;
    for (const id of missingKey.split(',')) {
      const request = dispatch(productsApi.endpoints.getProductById.initiate(id, { forceRefetch: true }));
      request.unwrap()
        .then((product) => {
          const price = Number(product.stylistPrice);
          if (Number.isFinite(price) && price > 0) {
            dispatch(setRolePrice({ productId: id, rolePrice: price, stylistPrice: price }));
          }
        })
        .catch(() => undefined)
        .finally(() => request.unsubscribe());
    }
  }, [dispatch, missingKey]);
}
