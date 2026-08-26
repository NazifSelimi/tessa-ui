/**
 * Home Page — Marketing Landing (mobile-first)
 *
 * The front door for retail customers. Leads with the hair quiz (our primary
 * hook + data-capture funnel), then surfaces real, navigable merchandising:
 *   - Hero with a single primary CTA (quiz)
 *   - Shop by category (filterable → /shop?category=id)
 *   - "Find your routine" hair-type choices (funnel → quiz)
 *   - Featured products rail (getFeaturedProducts)
 *   - Professional banner (→ /for-professionals)
 *   - Trust strip (delivery, COD, authentic brands)
 *
 * The full catalog/browse experience now lives at /shop (ShopPage).
 */

import { Link } from 'react-router-dom';
import { Typography, Button, Skeleton } from 'antd';
import {
  ExperimentOutlined,
  ArrowRightOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  TruckOutlined,
  DollarOutlined,
  ScissorOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import ProductCard from '@/components/ProductCard';
import HScrollRail from '@/components/home/HScrollRail';
import { useGetCategoriesQuery, useGetFeaturedProductsQuery } from '@/features/products/api';

const { Title, Text, Paragraph } = Typography;

/* Hair-type entry points into the quiz. Keep this calm and text-led on the storefront. */
const HAIR_TYPE_CHIPS = [
  { labelKey: 'survey.straight' },
  { labelKey: 'survey.wavy' },
  { labelKey: 'survey.curly' },
  { labelKey: 'survey.coily' },
];

function SectionHeading({ title, to, linkLabel }: { title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="home-section__head">
      <Title level={4} style={{ margin: 0 }}>{title}</Title>
      {to && (
        <Link to={to} className="home-section__more">
          {linkLabel} <RightOutlined style={{ fontSize: 11 }} />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const { data: categories = [], isLoading: loadingCats } = useGetCategoriesQuery();
  const { data: featured = [], isLoading: loadingFeatured } = useGetFeaturedProductsQuery(8);

  return (
    <div className="home">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="home-hero">
        <div className="home-hero__inner">
          <span className="home-hero__eyebrow">{t('homeLanding.eyebrow')}</span>
          <Title level={1} className="home-hero__title">{t('homeLanding.heroTitle')}</Title>
          <Paragraph className="home-hero__subtitle">{t('homeLanding.heroSubtitle')}</Paragraph>
          <div className="home-hero__actions">
            <Link to="/hair-survey">
              <Button type="primary" size="large" icon={<ExperimentOutlined />}>
                {t('homeLanding.takeQuiz')}
              </Button>
            </Link>
            <Link to="/shop">
              <Button size="large" ghost>
                {t('homeLanding.shopAll')} <ArrowRightOutlined />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Shop by category ──────────────────────────────────── */}
      <section className="home-section">
        <SectionHeading title={t('homeLanding.shopByCategory')} to="/shop" linkLabel={t('homeLanding.viewAll')} />
        {loadingCats ? (
          <Skeleton active paragraph={{ rows: 1 }} />
        ) : (
          <HScrollRail>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.id}`}
                className="category-chip"
                role="listitem"
              >
                {cat.name}
              </Link>
            ))}
          </HScrollRail>
        )}
      </section>

      {/* ── Find your routine (quiz funnel) ───────────────────── */}
      <section className="home-section home-routine">
        <SectionHeading title={t('homeLanding.findYourRoutine')} />
        <Text type="secondary" className="home-section__sub">{t('homeLanding.findYourRoutineSub')}</Text>
        <div className="home-routine__chips">
          {HAIR_TYPE_CHIPS.map((c) => (
            <Link key={c.labelKey} to="/hair-survey" className="routine-chip">
              <span>{t(c.labelKey)}</span>
              <RightOutlined aria-hidden="true" />
            </Link>
          ))}
        </div>
        <Link to="/hair-survey" className="home-routine__cta">
          {t('homeLanding.startQuiz')} <ArrowRightOutlined />
        </Link>
      </section>

      {/* ── Featured products ─────────────────────────────────── */}
      <section className="home-section">
        <SectionHeading title={t('homeLanding.featured')} to="/shop" linkLabel={t('homeLanding.viewAll')} />
        {loadingFeatured ? (
          <HScrollRail>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="home-featured__item">
                <Skeleton.Image active style={{ width: '100%', height: 160 }} />
                <Skeleton active paragraph={{ rows: 1 }} />
              </div>
            ))}
          </HScrollRail>
        ) : featured.length > 0 ? (
          <HScrollRail>
            {featured.map((product) => (
              <div key={product.id} className="home-featured__item" role="listitem">
                <ProductCard product={product} />
              </div>
            ))}
          </HScrollRail>
        ) : null}
      </section>

      {/* ── Professional banner ───────────────────────────────── */}
      <section className="home-section">
        <Link to="/for-professionals" className="pro-banner">
          <div className="pro-banner__icon"><ScissorOutlined /></div>
          <div className="pro-banner__text">
            <Text strong className="pro-banner__title">{t('homeLanding.proTitle')}</Text>
            <Text className="pro-banner__sub">{t('homeLanding.proSub')}</Text>
          </div>
          <RightOutlined className="pro-banner__arrow" />
        </Link>
      </section>

      {/* ── Trust strip ───────────────────────────────────────── */}
      <section className="home-section">
        <div className="trust-strip">
          <div className="trust-strip__item">
            <TruckOutlined className="trust-strip__icon" />
            <Text className="trust-strip__label">{t('trust.freeShipping')}</Text>
          </div>
          <div className="trust-strip__item">
            <DollarOutlined className="trust-strip__icon" />
            <Text className="trust-strip__label">{t('trust.cod')}</Text>
          </div>
          <div className="trust-strip__item">
            <SafetyCertificateOutlined className="trust-strip__icon" />
            <Text className="trust-strip__label">{t('trust.authentic')}</Text>
          </div>
        </div>
      </section>
    </div>
  );
}
