import { describe, expect, it } from 'vitest';
import cartReducer, { addItem, updateQuantity } from '@/features/cart/slice';
import { cartLimit } from '@/shared/utils/stockLimit';
import type { Product } from '@/types';

describe('cart quantity limit (#11, owner rule Q4)', () => {
  it('has no 50-piece limit: "50" in stock means "50 or more"', () => {
    const product = { id: '7', name: 'Developer', price: 300, quantity: 50 } as unknown as Product;
    let state = cartReducer(undefined, addItem({ product, quantity: 1, unitPrice: 300, retailPrice: 300, rolePrice: 0 }));
    state = cartReducer(state, updateQuantity({ productId: '7', quantity: 60 }));
    expect(state.items[0].quantity).toBe(60);
  });

  it('still stops at the real stock when fewer than 50 are left', () => {
    const product = { id: '8', name: 'Mask', price: 300, quantity: 7 } as unknown as Product;
    let state = cartReducer(undefined, addItem({ product, quantity: 1, unitPrice: 300, retailPrice: 300, rolePrice: 0 }));
    state = cartReducer(state, updateQuantity({ productId: '8', quantity: 9 }));
    expect(state.items[0].quantity).toBe(7);
  });

  it('gives the quantity pickers a real maximum', () => {
    expect(cartLimit(7)).toBe(7);
    expect(cartLimit(50)).toBe(999);
    expect(cartLimit(undefined)).toBe(999);
  });
});
