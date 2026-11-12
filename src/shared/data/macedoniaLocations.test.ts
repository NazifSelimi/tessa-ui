import { describe, expect, it } from 'vitest';
import { filterLocationOption, normalizeLocationText } from './macedoniaLocations';

describe('location search', () => {
  it('turns Cyrillic into Latin', () => {
    expect(normalizeLocationText('Скопје')).toBe('skopje');
    expect(normalizeLocationText('Штип')).toBe('stip');
  });
  it('finds a town typed in Cyrillic or Latin', () => {
    expect(filterLocationOption('Скопје', { label: 'Aerodrom (Skopje)' })).toBe(true);
    expect(filterLocationOption('bitola', { label: 'Bitola (Bitola)' })).toBe(true);
    expect(filterLocationOption('Охрид', { label: 'Bitola (Bitola)' })).toBe(false);
  });
});
