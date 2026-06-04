/**
 * For Professionals — B2B landing page
 *
 * Converts salons/stylists into professional accounts. This is the online
 * front door for the offline distributor relationship: pro pricing, fast
 * reordering, and professional deals.
 *
 * The primary CTA adapts to the viewer:
 *   - stylist        → go to Quick Order (they're already pro)
 *   - logged-in user → apply to become a stylist
 *   - guest          → create an account, then apply
 */

import { Link } from 'react-router-dom';
import { Typography, Button } from 'antd';
import {
  TagsOutlined,
  ThunderboltOutlined,
  GiftOutlined,
  TruckOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

const { Title, Text, Paragraph } = Typography;

export default function ForProfessionalsPage() {
  const { t } = useTranslation();
  const { isAuthenticated, isStylist } = useAuth();

  const benefits = [
    { icon: <TagsOutlined />, titleKey: 'forPros.benefitPricingTitle', descKey: 'forPros.benefitPricingDesc' },
    { icon: <ThunderboltOutlined />, titleKey: 'forPros.benefitReorderTitle', descKey: 'forPros.benefitReorderDesc' },
    { icon: <GiftOutlined />, titleKey: 'forPros.benefitDealsTitle', descKey: 'forPros.benefitDealsDesc' },
    { icon: <TruckOutlined />, titleKey: 'forPros.benefitDeliveryTitle', descKey: 'forPros.benefitDeliveryDesc' },
  ];

  const cta = isStylist
    ? { to: '/stylist/quick-order', label: t('forPros.ctaQuickOrder') }
    : isAuthenticated
      ? { to: '/stylist/request', label: t('forPros.ctaApply') }
      : { to: '/register', label: t('forPros.ctaCreateAccount') };

  return (
    <div className="for-pros">
      {/* Hero */}
      <section className="for-pros__hero">
        <span className="for-pros__eyebrow">{t('forPros.eyebrow')}</span>
        <Title level={1} className="for-pros__title">{t('forPros.title')}</Title>
        <Paragraph className="for-pros__subtitle">{t('forPros.subtitle')}</Paragraph>
        <Link to={cta.to}>
          <Button type="primary" size="large">{cta.label}</Button>
        </Link>
        {!isStylist && (
          <div className="for-pros__signin">
            <Text type="secondary">{t('forPros.alreadyPro')} </Text>
            <Link to={isAuthenticated ? '/stylist/request' : '/login'}>{t('forPros.signIn')}</Link>
          </div>
        )}
      </section>

      {/* Benefits */}
      <section className="for-pros__benefits">
        {benefits.map((b) => (
          <div key={b.titleKey} className="for-pros__benefit">
            <div className="for-pros__benefit-icon">{b.icon}</div>
            <div>
              <Text strong className="for-pros__benefit-title">{t(b.titleKey)}</Text>
              <Text className="for-pros__benefit-desc">{t(b.descKey)}</Text>
            </div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="for-pros__steps">
        <Title level={3} style={{ textAlign: 'center' }}>{t('forPros.howTitle')}</Title>
        <ol className="for-pros__steps-list">
          <li><CheckCircleFilled /> {t('forPros.step1')}</li>
          <li><CheckCircleFilled /> {t('forPros.step2')}</li>
          <li><CheckCircleFilled /> {t('forPros.step3')}</li>
        </ol>
        <div style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
          <Link to={cta.to}>
            <Button type="primary" size="large">{cta.label}</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
