import { describe, expect, it } from 'vitest';
import cartReducer, { addItem, setRolePrice } from '@/features/cart/slice';
import { cartPriceForRole } from '@/shared/utils/checkoutPricing';
import type { Product } from '@/types';

describe('cart salon prices', () => {
  it('a line added as a guest gets its salon price after a business account signs in', () => {
    const product = { id: '299', name: 'Spray', price: 990 } as unknown as Product;
    let state = cartReducer(undefined, addItem({ product, quantity: 2, unitPrice: 990, retailPrice: 990, rolePrice: 0 }));
    expect(cartPriceForRole(state.items[0], true)).toBe(0);

    state = cartReducer(state, setRolePrice({ productId: '299', rolePrice: 690, stylistPrice: 690 }));
    expect(cartPriceForRole(state.items[0], true)).toBe(690);
    expect(cartPriceForRole(state.items[0], false)).toBe(990);
  });
});
