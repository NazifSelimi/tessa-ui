import { describe, expect, it } from 'vitest';
import { defaultTitleFor } from './RouteTitle';

describe('defaultTitleFor', () => {
  it('names admin pages', () => {
    expect(defaultTitleFor('/admin/stylist-requests')).toBe('Stylist requests · Admin | Tessa Hair Care');
    expect(defaultTitleFor('/admin')).toBe('Dashboard · Admin | Tessa Hair Care');
  });
  it('names cart and checkout', () => {
    expect(defaultTitleFor('/checkout/')).toBe('Checkout | Tessa Hair Care');
  });
});
