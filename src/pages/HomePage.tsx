import { Link, Navigate } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, Sparkles, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useGetProductsQuery } from '@/features/products/api';
import ProductCard from '@/components/ProductCard';
import { CatalogState, PageHeading, ProductImage, SectionHeading } from '@/components/storefront/DesignPrimitives';
import Seo from '@/shared/components/Seo';

export default function HomePage() {
  const { t } = useTranslation();
  const { user, isStylist } = useAuth();
  const { data, isLoading, error, refetch } = useGetProductsQuery({ perPage: 8 }, { skip: isStylist });
  const products = (data?.data || []).filter(product => !product.stylistOnly && !product.catalogGuidance?.professionalOnly);
  const hero = products.find(product => product.image || product.images?.length);
  const concerns = ['repair', 'blonde-and-tone', 'curls', 'smooth-and-anti-frizz'];

  if (isStylist) return <Navigate to="/stylist/workspace" replace />;

  return <>
    <Seo title={t('seo.homeTitle')} description={t('seo.homeDescription')} path="/" />
    <PageHeading eyebrow={t('newLook.home')} title={user ? t('newLook.hello', { name: user.firstName || user.name.split(' ')[0] }) : t('newLook.welcome')} action={<Link className="nl-profile-link" to={user ? '/account' : '/login'}><UserRound size={17} />{t('auth.myAccount')}</Link>} />
    <section className="nl-consumer-hero">
      <div className="nl-hero-copy"><span className="nl-eyebrow">{t('newLook.heroEyebrow')}</span><h2>{t('newLook.heroTitle')}<br /><i>{t('newLook.heroAccent')}</i></h2><p>{t('newLook.heroCopy')}</p><Link className="nl-button nl-button-dark" to="/quiz">{t('newLook.discoverRoutine')}<ArrowUpRight size={18} /></Link></div>
      <div className="nl-hero-art"><div className="nl-art-orbit" />{hero ? <ProductImage product={hero} priority /> : <div className="nl-hero-monogram" aria-hidden="true">t<span>care, beautifully.</span></div>}<span className="nl-art-caption">TESSA / HAIR RITUALS</span><Sparkles className="nl-art-sparkle" size={28} aria-hidden="true" /></div>
    </section>
    <section className="nl-section">
      <SectionHeading eyebrow={t('newLook.yourHair')} title={t('newLook.whereToStart')} to="/quiz" action={t('newLook.takeQuiz')} />
      <div className="nl-concern-grid">{concerns.map((slug, i) => <Link key={slug} to={`/collections/${slug}`} className={`nl-concern nl-concern-${i + 1}`}><span className="nl-concern-art" aria-hidden="true" /><strong>{t(`newLook.concerns.${slug}`)}</strong><small>{t('newLook.exploreCare')}<ArrowUpRight size={15} /></small></Link>)}</div>
      <div className="nl-collection-links">{['colour', 'extensions-and-tools'].map(slug => <Link key={slug} to={`/collections/${slug}`}>{t(`newLook.concerns.${slug}`)}<ChevronRight size={15} /></Link>)}</div>
    </section>
    <section className="nl-section"><SectionHeading eyebrow={t('newLook.professionalCare')} title={t('newLook.everydayRituals')} to="/shop" action={t('newLook.viewAll')} />
      {products.length ? <div className="nl-product-grid">{products.slice(0, 4).map(product => <ProductCard key={product.id} product={product} />)}</div> : <CatalogState loading={isLoading} error={error} retry={() => void refetch()} />}
    </section>
    <section className="nl-professional-invite"><Sparkles size={24} /><div><span className="nl-eyebrow">TESSA PROFESSIONAL</span><h2>{t('newLook.salonTitle')}</h2><p>{t('newLook.salonCopy')}</p></div><Link className="nl-button nl-button-secondary" to="/for-professionals">{t('nav.forProfessionals')}<ArrowUpRight size={17} /></Link></section>
  </>;
}
