import { describe, expect, it } from 'vitest';
import { resolveActivationField } from '@/shared/utils/activationFields';

describe('resolveActivationField', () => {
  it('keeps a stylist-entered value when the imported invitation has an empty string', () => {
    expect(resolveActivationField('12 Salon Street', '')).toBe('12 Salon Street');
  });

  it('falls back to a populated imported value when the form has no value', () => {
    expect(resolveActivationField(undefined, 'Skopje')).toBe('Skopje');
  });
});
