import { describe, expect, it } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('shows day, short month and year', () => {
    expect(formatDate(new Date(2026, 10, 3))).toBe('3 Nov 2026');
    expect(formatDate(new Date(2026, 11, 25))).toBe('25 Dec 2026');
  });
  it('returns empty text for missing or bad dates', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('not a date')).toBe('');
  });
});
