import { describe, expect, it } from 'vitest';
import cartReducer, { addItem } from '@/features/cart/slice';
import type { Product } from '@/types';

describe('signing out with a kept cart', () => {
  it('keeps the items but drops salon prices from the device', () => {
    const product = { id: '299', name: 'Spray', price: 990, stylistPrice: 690 } as unknown as Product;
    let state = cartReducer(undefined, addItem({ product, quantity: 2, unitPrice: 690, retailPrice: 990, rolePrice: 690 }));

    state = cartReducer(state, { type: 'auth/logout' });

    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
    expect(state.items[0].unitPrice).toBe(990);
    expect(state.items[0].rolePrice).toBeUndefined();
    expect(JSON.stringify(state)).not.toContain('690');
  });
});
