/**
 * Language Switcher Component
 * 
 * Compact toggle buttons for MK / SQ / EN language switching.
 * Persists choice to localStorage and sends Accept-Language header.
 */

import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {SUPPORTED_LANGUAGES.map(({ code, label, name }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          title={name}
          aria-label={`Switch language to ${name}`}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            fontWeight: i18n.language === code ? 700 : 400,
            background: i18n.language === code ? 'var(--color-primary, #1677ff)' : 'transparent',
            color: i18n.language === code ? '#fff' : 'var(--color-text-secondary, #666)',
            border: `1px solid ${i18n.language === code ? 'var(--color-primary, #1677ff)' : 'var(--color-border-light, #d9d9d9)'}`,
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.2s',
            lineHeight: 1.4,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
