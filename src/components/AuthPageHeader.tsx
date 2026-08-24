import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

/** Lightweight navigation for standalone authentication screens. */
export default function AuthPageHeader() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="auth-page-header">
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
        {t('common.back')}
      </Button>
      <LanguageSwitcher />
    </header>
  );
}
