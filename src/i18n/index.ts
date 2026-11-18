import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import mk from './locales/mk.json';
import shq from './locales/shq.json';
import { appLocaleFromUrl, urlLocaleFromPathname } from './routing';

export const SUPPORTED_LANGUAGES = [
  { code: 'mk', label: 'MK', name: 'Македонски' },
  { code: 'shq', label: 'SQ', name: 'Shqip' },
  { code: 'en', label: 'EN', name: 'English' },
] as const;

export type Locale = 'en' | 'mk' | 'shq';

export function isSupportedLocale(value: string): value is Locale {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}

/**
 * The URL decides the language: /en and /sq are English and Albanian, every
 * unprefixed path is the Macedonian site. Stored or account preferences never
 * override it (the language switcher navigates to the prefixed URL instead).
 */
export function initialLocaleFor(pathname: string): Locale {
  const fromPath = urlLocaleFromPathname(pathname);
  return fromPath ? appLocaleFromUrl(fromPath) : 'mk';
}

i18n
  .use(initReactI18next)
  .init({
    lng: initialLocaleFor(typeof window !== 'undefined' ? window.location.pathname : '/'),
    resources: {
      en: { translation: en },
      mk: { translation: mk },
      shq: { translation: shq },
    },
    fallbackLng: 'mk',
    supportedLngs: ['en', 'mk', 'shq'],
    interpolation: {
      escapeValue: false,
    },
  });

// <html lang> follows the language on every page, admin included (screen readers, translation tools).
const setHtmlLang = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng === 'shq' ? 'sq' : lng;
};
setHtmlLang(i18n.language);
i18n.on('languageChanged', setHtmlLang);

export default i18n;
