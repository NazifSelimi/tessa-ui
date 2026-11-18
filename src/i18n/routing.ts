import type { Locale } from './index';

export const URL_LOCALES = ['mk', 'sq', 'en'] as const;

export type UrlLocale = (typeof URL_LOCALES)[number];

const APP_LOCALE_BY_URL: Record<UrlLocale, Locale> = {
  mk: 'mk',
  sq: 'shq',
  en: 'en',
};

const URL_LOCALE_BY_APP: Record<Locale, UrlLocale> = {
  mk: 'mk',
  shq: 'sq',
  en: 'en',
};

export function urlLocaleFromPathname(pathname: string): UrlLocale | null {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return URL_LOCALES.includes(firstSegment as UrlLocale)
    ? firstSegment as UrlLocale
    : null;
}

export function appLocaleFromUrl(locale: UrlLocale): Locale {
  return APP_LOCALE_BY_URL[locale];
}

export function urlLocaleFromApp(locale: string): UrlLocale {
  return URL_LOCALE_BY_APP[locale as Locale] ?? 'mk';
}

export function stripLocalePrefix(pathname: string): string {
  const locale = urlLocaleFromPathname(pathname);
  if (!locale) return pathname || '/';

  const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '');
  return stripped || '/';
}

export function localizedPath(pathname: string, locale: UrlLocale): string {
  const logicalPath = stripLocalePrefix(pathname);
  return `/${locale}${logicalPath === '/' ? '' : logicalPath}`;
}

/**
 * A path to continue to after login. Inside the router (basename = language prefix)
 * the prefix is added automatically, so a stray prefix is dropped to avoid /en/en/...
 * In-app paths only: '//host' would be read by the browser as another site.
 */
export function safeContinuePath(requested: string | null | undefined): string {
  if (!requested || !requested.startsWith('/') || requested.startsWith('//')) return '/';
  return stripLocalePrefix(requested);
}

/** Absolute path for leaving the SPA (social sign-in) and coming back to the same language. */
export function withCurrentLocalePrefix(logicalPath: string, pathname: string): string {
  const locale = urlLocaleFromPathname(pathname);
  return locale ? localizedPath(logicalPath, locale) : logicalPath;
}
