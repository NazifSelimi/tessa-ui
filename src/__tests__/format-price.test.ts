import { describe, expect, it } from 'vitest';
import { formatAmount, formatPrice } from '@/shared/utils/formatPrice';

describe('formatPrice', () => {
  it('uses dot thousands in every browser', () => {
    expect(formatPrice(1980)).toBe('1.980 MKD');
    expect(formatPrice(98999010)).toBe('98.999.010 MKD');
    expect(formatPrice(990)).toBe('990 MKD');
  });

  it('rounds to whole denars and survives bad input', () => {
    expect(formatPrice('1250.6')).toBe('1.251 MKD');
    expect(formatPrice(null)).toBe('0 MKD');
    expect(formatPrice('abc')).toBe('0 MKD');
    expect(formatAmount(-1500)).toBe('-1.500');
  });
});
