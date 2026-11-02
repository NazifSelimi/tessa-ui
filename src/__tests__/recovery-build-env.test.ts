import { describe, expect, it } from 'vitest';
import { validateBuildApiUrl } from '../../scripts/validate-build-env';

describe('deployment API configuration', () => {
  it.each([undefined, '', ' ', 'http://127.0.0.1:8000/api', 'https://127.0.0.2/api',
    'https://localhost/api', 'https://dev.localhost/api', 'https://[::1]/api', '/api'])(
    'rejects an unsafe or missing deployment API: %s', (url) => {
    expect(() => validateBuildApiUrl(url, 'production')).toThrow();
  });

  it('requires the staging origin for staging mode', () => {
    expect(() => validateBuildApiUrl('https://tessa.mk/api', 'staging')).toThrow();
    expect(() => validateBuildApiUrl('https://staging.tessa.mk/api', 'staging')).not.toThrow();
  });

  it('accepts the explicit staging API for the existing optimized build', () => {
    expect(() => validateBuildApiUrl('https://staging.tessa.mk/api', 'production')).not.toThrow();
  });
});
