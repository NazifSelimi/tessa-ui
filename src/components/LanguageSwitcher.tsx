import { useMemo } from 'react';
import { Button, Dropdown } from 'antd';
import { GlobalOutlined, DownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { notifyError } from '@/shared/utils/notify';
import { extractErrorMessage } from '@/shared/utils/error';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { isAuthenticated, updateProfile } = useAuth();

  const currentLanguage = useMemo(
    () => SUPPORTED_LANGUAGES.find(({ code }) => code === i18n.language) ?? SUPPORTED_LANGUAGES[0],
    [i18n.language],
  );

  const handleLanguageChange = async (code: string) => {
    if (i18n.language !== code) {
      await i18n.changeLanguage(code);
    }

    if (!isAuthenticated) return;

    try {
      await updateProfile({ preferred_locale: code as 'en' | 'mk' | 'shq' });
    } catch (error: unknown) {
      notifyError(extractErrorMessage(error));
    }
  };

  const items = SUPPORTED_LANGUAGES.map(({ code, label, name }) => ({
    key: code,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: 112 }}>
        <span>{name}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
    ),
    onClick: () => {
      void handleLanguageChange(code);
    },
  }));

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <Button
        type="text"
        size="small"
        aria-label="Change language"
        style={{
          height: 36,
          paddingInline: 10,
          borderRadius: 999,
          border: '1px solid var(--color-border-light, #d9d9d9)',
          background: 'var(--color-surface, #fff)',
          color: 'var(--color-text, #1f1f1f)',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
          <GlobalOutlined />
          {currentLanguage.label}
          <DownOutlined style={{ fontSize: 10, color: 'var(--color-text-muted)' }} />
        </span>
      </Button>
    </Dropdown>
  );
}
