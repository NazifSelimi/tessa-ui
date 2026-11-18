import { describe, expect, it } from 'vitest';
import { initialLocaleFor } from '@/i18n';

describe('URL decides the language', () => {
  it('treats unprefixed paths as Macedonian even with a stored locale', () => {
    expect(initialLocaleFor('/login')).toBe('mk');
    expect(initialLocaleFor('/product/6')).toBe('mk');
    expect(initialLocaleFor('/')).toBe('mk');
  });

  it('maps /en and /sq prefixes', () => {
    expect(initialLocaleFor('/en/cart')).toBe('en');
    expect(initialLocaleFor('/sq')).toBe('shq');
    expect(initialLocaleFor('/mk/quiz')).toBe('mk');
  });
});
