import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import cartReducer, { addItem } from '@/features/cart/slice';
import { CART_STORAGE_KEY, followCartAcrossTabs } from '@/store/crossTabCart';
import type { Product } from '@/types';

describe('cart across tabs', () => {
  it('empties this tab when another tab empties the cart', () => {
    const store = configureStore({ reducer: { cart: cartReducer } });
    store.dispatch(addItem({ product: { id: '299', price: 990 } as unknown as Product, quantity: 1, unitPrice: 990, retailPrice: 990, rolePrice: 0 }));
    const target = new EventTarget();
    followCartAcrossTabs(store.dispatch, target as unknown as Window);

    const emptied = JSON.stringify({ items: '[]', bundleIds: '[]', _persist: '{"version":-1,"rehydrated":true}' });
    target.dispatchEvent(Object.assign(new Event('storage'), { key: CART_STORAGE_KEY, newValue: emptied }));

    expect(store.getState().cart.items).toEqual([]);
  });

  it('ignores other keys', () => {
    const store = configureStore({ reducer: { cart: cartReducer } });
    store.dispatch(addItem({ product: { id: '1', price: 5 } as unknown as Product, quantity: 1, unitPrice: 5, retailPrice: 5, rolePrice: 0 }));
    const target = new EventTarget();
    followCartAcrossTabs(store.dispatch, target as unknown as Window);
    target.dispatchEvent(Object.assign(new Event('storage'), { key: 'persist:tessa_auth', newValue: null }));
    expect(store.getState().cart.items).toHaveLength(1);
  });
});
