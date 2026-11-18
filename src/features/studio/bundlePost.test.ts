import { describe, expect, it } from 'vitest';
import type { StoreBundle } from '@/types';
import { bundlePost, isPriceLine, priceLine } from './bundlePost';

const bundle = (patch: Partial<StoreBundle> = {}): StoreBundle => ({
  id: '7', name: 'Hydra set', description: 'Shampoo + mask', isDynamic: false, discountPercentage: 10, promotionType: 'percentage',
  bundlePrice: null, audience: 'all', isActive: true, isFeatured: false, startsAt: null, endsAt: null,
  products: [
    { id: '1', name: 'No photo', price: 500, quantity: 1, image: null },
    { id: '2', name: 'Shampoo', price: 600, stylistPrice: 400, quantity: 1, image: '/a.jpg' },
    { id: '3', name: 'Gift', price: 400, quantity: 1, image: '/b.jpg', isBonus: true },
    { id: '4', name: 'Mask', price: 900, stylistPrice: 600, quantity: 1, image: '/c.jpg' },
  ],
  ...patch,
});

describe('bundlePost', () => {
  it('makes an offer post with the discount sticker and the bundle price line', () => {
    const post = bundlePost(bundle(), 'en');
    expect(post.design.template).toBe('offer');
    expect(post.design.headline).toBe('Hydra set');
    expect(post.design.badge).toBe('-10%');
    expect(post.full).toBe(2400);
    expect(post.deal).toBe(2160);
    expect(isPriceLine(post.design.subline)).toBe(true);
    expect(post.design.subline).toBe(priceLine('en', 2160, 2400));
  });

  it('puts paid products with photos first and shows at most three', () => {
    expect(bundlePost(bundle(), 'mk').productIds).toEqual(['2', '4', '3']);
  });

  it('uses salon prices and a salon title for stylist bundles', () => {
    const post = bundlePost(bundle({ audience: 'stylist', promotionType: 'fixed_price', bundlePrice: 1200, discountPercentage: null }), 'mk');
    expect(post.design.priceMode).toBe('salon');
    expect(post.design.eyebrow).toBe('За салони');
  });

  it('shows a gift sticker for bonus-item bundles', () => {
    const post = bundlePost(bundle({ promotionType: 'bonus_items', discountPercentage: null }), 'sq');
    expect(post.design.badge).toBe('DHURATË');
    expect(post.deal).toBe(2000);
  });
});
