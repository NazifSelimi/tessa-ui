import { Link, useSearchParams } from 'react-router-dom';
import { Pagination } from 'antd';
import { ArrowUpRight, Package, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGetOrdersQuery } from '@/features/orders/api';
import { useReorder } from '@/hooks/useReorder';
import { formatPrice } from '@/shared/utils/formatPrice';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/StatusBadge';
import { CatalogState, PageHeading } from '@/components/storefront/DesignPrimitives';
import Seo from '@/shared/components/Seo';

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isLoading, error, refetch } = useGetOrdersQuery({ page });
  const { reorder, isReordering } = useReorder();
  const orders = data?.data || [];
  return <div className="nl-orders-page">
    <Seo title={t('orders.myOrders')} description={t('orders.viewTrackHistory')} noIndex />
    <PageHeading eyebrow={t('newLook.orders')} title={t('orders.myOrders')} description={t('orders.viewTrackHistory')} />
    {error ? <CatalogState error={error} retry={() => void refetch()} /> : isLoading ? <CatalogState loading /> : !orders.length ? <div className="nl-empty-orders nl-card"><Package size={34} /><h2>{t('orders.noOrdersYet')}</h2><Link className="nl-button" to="/shop">{t('orders.startShopping')}<ArrowUpRight size={17} /></Link></div> : <>
      <div className="nl-order-list">{orders.map(order => <article key={order.id} className="nl-order-card nl-card">
        <div><span className="nl-eyebrow">{t('orders.order')}</span><Link to={`/account/orders/${order.id}`}><h2>#{order.id}</h2></Link><p>{new Date(order.createdAt).toLocaleDateString(i18n.language === 'shq' ? 'sq' : i18n.language)} · {t('orders.itemCount', { count: order.items?.length || 0 })}</p></div>
        <div className="nl-order-status"><OrderStatusBadge status={order.status} /><PaymentStatusBadge status={order.paymentStatus} /></div>
        <strong className="nl-order-total">{formatPrice(order.total)}</strong>
        <div className="nl-order-actions"><button className="nl-button" disabled={isReordering || !order.items?.length} onClick={() => void reorder(order)}><RotateCcw size={16} />{isReordering ? t('common.loading') : t('reorder.orderAgain')}</button><Link className="nl-order-details" to={`/account/orders/${order.id}`}>{t('orders.view')}<ArrowUpRight size={16} /></Link></div>
      </article>)}</div>
      {data && data.meta.last_page > 1 && <div className="nl-pagination"><Pagination current={page} total={data.meta.total} pageSize={data.meta.per_page} showSizeChanger={false} onChange={value => setParams({ page: String(value) })} /></div>}
    </>}
  </div>;
}
