import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Seo from '@/shared/components/Seo';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <Seo title={t('notFoundPage.title')} description={t('notFoundPage.text')} noIndex />
      <Result
        status="404"
        title={<h1 style={{ fontSize: 'inherit', margin: 0 }}>404 · {t('notFoundPage.title')}</h1>}
        subTitle={t('notFoundPage.text')}
        extra={<Link to="/shop"><Button type="primary">{t('notFoundPage.back')}</Button></Link>}
      />
    </>
  );
}
