const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export type SocialProvider = 'google' | 'facebook';

interface SocialAuthUrlOptions {
  intent: 'login' | 'register';
  redirect?: string;
  accountType?: 'customer' | 'stylist';
}

export function buildSocialAuthUrl(
  provider: SocialProvider,
  options: SocialAuthUrlOptions,
): string {
  const url = new URL(`${API_BASE_URL}/v1/auth/oauth/${provider}/redirect`);

  url.searchParams.set('intent', options.intent);

  if (options.redirect) {
    url.searchParams.set('redirect', options.redirect);
  }

  if (options.accountType) {
    url.searchParams.set('account_type', options.accountType);
  }

  return url.toString();
}

export function startSocialAuth(
  provider: SocialProvider,
  options: SocialAuthUrlOptions,
): void {
  window.location.assign(buildSocialAuthUrl(provider, options));
}
