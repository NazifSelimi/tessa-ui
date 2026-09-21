import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, ClipboardList, Package, RotateCcw, Sparkles, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useReorder } from '@/hooks/useReorder';
import { useGetOrdersQuery } from '@/features/orders/api';
import { useGetBrandsQuery, useGetCategoriesQuery, useGetProductsQuery } from '@/features/products/api';
import { formatPrice } from '@/shared/utils/formatPrice';
import ProductCard from '@/components/ProductCard';
import BundleDealRail from '@/components/BundleDealRail';
import StatusBadge from '@/components/StatusBadge';
import { CatalogState, PageHeading, SectionHeading } from '@/components/storefront/DesignPrimitives';
import Seo from '@/shared/components/Seo';

export default function StylistWorkspacePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const ordersQuery = useGetOrdersQuery({ perPage: 1 });
  const lastOrder = ordersQuery.data?.data[0];
  const { data, isLoading, error, refetch } = useGetProductsQuery({ perPage: 4 });
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { reorder, isReordering } = useReorder();
  const shortcuts = [
    { to: '/stylist/quick-order', icon: Zap, title: t('nav.quickOrder'), copy: t('newLook.quickCopy') },
    { to: '/shop', icon: Package, title: t('newLook.products'), copy: t('newLook.catalogCopy') },
    { to: '/account/orders', icon: RotateCcw, title: t('newLook.buyAgain'), copy: t('newLook.reorderCopy') },
    { to: '#salon-offers', icon: Sparkles, title: t('newLook.offers'), copy: t('newLook.offersCopy') },
  ];
  return <>
    <Seo title={t('nav.stylistWorkspace')} description={t('newLook.professionalSubtitle')} noIndex />
    <PageHeading eyebrow={t('newLook.home')} title={t('newLook.hello', { name: user?.firstName || user?.name.split(' ')[0] || '' })} description={t('newLook.professionalSubtitle')} action={<Link className="nl-button" to="/stylist/quick-order"><Zap size={18} />{t('newLook.startQuickOrder')}</Link>} />
    <div className="nl-home-grid"><section className="nl-last-order nl-card">
      <div className="nl-card-kicker"><span className="nl-eyebrow">{t('newLook.lastOrder')}</span>{lastOrder && <StatusBadge status={lastOrder.status} />}</div>
      {ordersQuery.isLoading ? <p role="status">{t('common.loading')}</p> : ordersQuery.error ? <CatalogState error={ordersQuery.error} retry={() => void ordersQuery.refetch()} /> : lastOrder ? <>
        <div className="nl-last-order-main"><div><h2>{t('orders.itemCount', { count: lastOrder.items?.length || 0 })}</h2><p>#{lastOrder.id} · {new Date(lastOrder.createdAt).toLocaleDateString(i18n.language === 'shq' ? 'sq' : i18n.language)}</p></div><strong>{formatPrice(lastOrder.total)}</strong></div>
        <div className="nl-button-row"><button className="nl-button" disabled={isReordering || !lastOrder.items?.length} onClick={() => void reorder(lastOrder)}><RotateCcw size={17} />{isReordering ? t('common.loading') : t('reorder.orderAgain')}</button><Link className="nl-button nl-button-secondary" to={`/account/orders/${lastOrder.id}`}>{t('orders.view')}</Link></div>
      </> : <div className="nl-first-order"><ClipboardList size={30} /><h2>{t('newLook.firstOrderTitle')}</h2><p>{t('newLook.firstOrderCopy')}</p><Link className="nl-button" to="/stylist/quick-order">{t('newLook.startQuickOrder')}<ArrowUpRight size={17} /></Link></div>}
    </section><section className="nl-focus-card"><div className="nl-focus-icon"><Sparkles size={22} /></div><span className="nl-eyebrow">{t('newLook.yourProfessionalSpace')}</span><h2>{t('newLook.focusTitle')}<br /><i>{t('newLook.focusAccent')}</i></h2><Link to="/stylist/quick-order?restock=colors">{t('stylistWorkspace.quickColorRestockAction')}<ArrowUpRight size={17} /></Link></section></div>
    <SectionHeading eyebrow={t('newLook.in60Seconds')} title={t('newLook.quickActions')} />
    <div className="nl-quick-actions">{shortcuts.map(({ to, icon: Icon, title, copy }) => to.startsWith('#') ? <a key={to} href={to}><span className="nl-action-icon"><Icon size={20} /></span><strong>{title}</strong><small>{copy}</small><ChevronRight size={17} /></a> : <Link key={to} to={to}><span className="nl-action-icon"><Icon size={20} /></span><strong>{title}</strong><small>{copy}</small><ChevronRight size={17} /></Link>)}</div>
    <SectionHeading eyebrow={t('newLook.forYourSalon')} title={t('newLook.salonEssentials')} to="/shop" action={t('newLook.viewAll')} />
    {data?.data.length ? <div className="nl-product-grid">{data.data.map(product => <ProductCard key={product.id} product={product} />)}</div> : <CatalogState loading={isLoading} error={error} retry={() => void refetch()} />}
    <div className="nl-split-sections"><section><SectionHeading eyebrow={t('newLook.chooseBrand')} title={t('newLook.brands')} /><div className="nl-brand-row">{brands.slice(0, 3).map(brand => <Link key={brand.id} to={`/shop?brand=${brand.id}`}>{brand.name}<span>Professional care</span></Link>)}</div></section><section><SectionHeading eyebrow={t('newLook.quickAccess')} title={t('newLook.categories')} /><div className="nl-category-list">{categories.slice(0, 5).map(category => <Link key={category.id} to={`/shop?category=${category.id}`}>{category.name}<ChevronRight size={16} /></Link>)}</div></section></div>
    <section id="salon-offers" className="nl-section"><SectionHeading eyebrow="TESSA PROFESSIONAL" title={t('stylistWorkspace.offersTitle')} /><BundleDealRail showEmpty /></section>
  </>;
}
