import { describe, it, expect } from 'vitest';
import { cartPriceForRole, couponDiscount } from '@/shared/utils/checkoutPricing';
import type { CartItem } from '@/types';
describe('checkout pricing recovery', () => {
  const item = { unitPrice: 1000, retailPrice: 1000, rolePrice: 700, product: { price: 1000, stylistPrice: 700 } } as CartItem;
  it('reprices an existing cart on stylist login and logout', () => { expect(cartPriceForRole(item, false)).toBe(1000); expect(cartPriceForRole(item, true)).toBe(700); expect(cartPriceForRole(item, false)).toBe(1000); });
  it('honours active sale dates', () => { const sale = { price: 500, startDate: '2026-10-01', endDate: '2026-11-01' }; expect(cartPriceForRole({ ...item, product: { ...item.product, sale } }, true, Date.parse('2026-10-20'))).toBe(500); });
  it('never lets a sale raise the salon price', () => { const sale = { price: 800, startDate: '2026-10-01', endDate: '2026-11-01' }; const at = Date.parse('2026-10-20'); const onSale = { ...item, product: { ...item.product, sale } }; expect(cartPriceForRole(onSale, true, at)).toBe(700); expect(cartPriceForRole(onSale, false, at)).toBe(800); });
  it('applies percentage coupon after the bundle saving', () => { expect(1000 - 200 - couponDiscount(1000 - 200, 10, true)).toBe(720); });
  it('caps fixed coupons to remaining subtotal', () => { expect(couponDiscount(800, 1200, false)).toBe(800); });
  it('recalculates when cart quantity changes', () => { expect(couponDiscount(1500, 10, true)).toBe(150); expect(couponDiscount(1000, 10, true)).toBe(100); });
});
