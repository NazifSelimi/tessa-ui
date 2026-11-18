import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// MainLayout pulls in most of the app, so the header markup is checked at the source:
// the stylist cart button must carry a visible label next to the count and total.
describe('stylist header cart button', () => {
  const source = readFileSync('src/components/MainLayout.tsx', 'utf8');

  it('labels the count and the total instead of showing bare numbers', () => {
    expect(source).toContain('<span className="nl-cart-label">{t(\'cart.shoppingCart\')}</span>');
    expect(source).toContain("title={t('orders.itemCount', { count: itemCount })}");
    expect(source).toContain("title={t('cart.subtotal')}");
  });

  it('has the translated labels in every language', async () => {
    const locales = await Promise.all(['en', 'mk', 'shq'].map((l) => import(`../i18n/locales/${l}.json`)));
    for (const locale of locales) {
      expect(locale.default.cart.shoppingCart).toBeTruthy();
      expect(locale.default.cart.subtotal).toBeTruthy();
    }
  });
});
