import { describe, expect, it } from 'vitest';
import { stockShortLines } from '@/features/admin/stockShort';
import en from '@/i18n/locales/en.json';
import mk from '@/i18n/locales/mk.json';
import shq from '@/i18n/locales/shq.json';

describe('not enough stock when undoing a cancel or restoring an order (#7, NEW-3)', () => {
  it('reads the per-product lines the API sends', () => {
    const error = { status: 422, data: { message: 'x', errors: { stock: ['Only 2 left of Mask, need 3.'] } } };
    expect(stockShortLines(error)).toEqual(['Only 2 left of Mask, need 3.']);
  });

  it('ignores other errors', () => {
    expect(stockShortLines({ status: 422, data: { errors: { status: ['bad'] } } })).toBeNull();
    expect(stockShortLines({ status: 500 })).toBeNull();
    expect(stockShortLines(undefined)).toBeNull();
  });

  it('has the "Proceed anyway" texts in every shop language', () => {
    for (const locale of [en, mk, shq] as Array<{ adminStock?: Record<string, string> }>) {
      for (const key of ['title', 'note', 'proceed', 'cancel']) {
        expect(typeof locale.adminStock?.[key]).toBe('string');
        expect(locale.adminStock?.[key]?.length).toBeGreaterThan(1);
      }
    }
  });
});
