import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import mk from './locales/mk.json';
import shq from './locales/shq.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'mk', label: 'MK', name: 'Македонски' },
  { code: 'shq', label: 'SQ', name: 'Shqip' },
  { code: 'en', label: 'EN', name: 'English' },
] as const;

export type Locale = 'en' | 'mk' | 'shq';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
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
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'tessa-locale',
      caches: ['localStorage'],
    },
  });

export default i18n;
