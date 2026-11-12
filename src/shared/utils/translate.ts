import i18n from 'i18next';

/**
 * Translate outside React components (utils, class components). Falls back to the
 * given English text when the key is missing or i18n has not started yet (tests, early crashes).
 */
export function translate(key: string, fallback: string): string {
  return i18n.isInitialized ? i18n.t(key, { defaultValue: fallback }) : fallback;
}
