import { describe, expect, it } from 'vitest';
import i18n from '@/i18n';

describe('unit / product counts', () => {
  it('uses singular and plural forms', async () => {
    await i18n.changeLanguage('mk');
    expect(i18n.t('newLook.productCount', { count: 1 })).toBe('1 производ');
    expect(i18n.t('newLook.productCount', { count: 3 })).toBe('3 производи');
    await i18n.changeLanguage('en');
    expect(i18n.t('newLook.unitCount', { count: 1 })).toBe('1 unit');
    expect(i18n.t('newLook.unitCount', { count: 2 })).toBe('2 units');
  });
});
