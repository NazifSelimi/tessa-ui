/** Never ship a browser bundle pointing at a developer's machine. */
export function validateBuildApiUrl(value: string | undefined, mode: string): void {
  if (!value?.trim()) {
    throw new Error('VITE_API_URL is required for a deployment build.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('VITE_API_URL must be an absolute HTTPS API URL for deployment.');
  }

  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || host === 'localhost' || host.endsWith('.localhost')
    || host.startsWith('127.') || host === '[::1]' || host === '0.0.0.0') {
    throw new Error('VITE_API_URL must use HTTPS and cannot point to localhost or a loopback address.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_API_URL must not contain credentials, a query string, or a fragment.');
  }
  if (mode === 'staging' && url.origin !== 'https://staging.tessa.mk') {
    throw new Error('Staging builds must use https://staging.tessa.mk/api.');
  }
}
