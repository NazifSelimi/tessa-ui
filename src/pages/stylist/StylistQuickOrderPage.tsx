import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pagination } from 'antd';
import { ArrowUpRight, Check, Minus, Plus, Search, ShoppingBag, X, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGetQuickOrderProductsQuery } from '@/features/quickorder/api';
import { useCart } from '@/hooks/useCart';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPrice } from '@/shared/utils/formatPrice';
import { CatalogState, PageHeading } from '@/components/storefront/DesignPrimitives';
import Seo from '@/shared/components/Seo';
import type { QuickOrderItem } from '@/types';

export default function StylistQuickOrderPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const isColorRestock = params.get('restock') === 'colors';
  const { addItem, items, itemCount, subtotal } = useCart();
  const [search, setSearch] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search.trim(), 300);
  const filterKey = JSON.stringify([debouncedSearch, isColorRestock]);
  const [pagination, setPagination] = useState({ page: 1, filterKey });
  const page = pagination.filterKey === filterKey ? pagination.page : 1;
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [added, setAdded] = useState<{ id: string; name: string; quantity: number } | null>(null);
  // A declarative subscription survives StrictMode without aborting its own first request.
  // currentData prevents stale products from being added after the search/filter changes.
  const { currentData: data, isFetching, error, refetch } = useGetQuickOrderProductsQuery({ page, perPage: 25, search: debouncedSearch || undefined, colorRestock: isColorRestock });

  useEffect(() => { if (isColorRestock) searchInput.current?.focus(); }, [isColorRestock]);
  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(null), 1800);
    return () => window.clearTimeout(timer);
  }, [added]);

  const remaining = (product: QuickOrderItem) => Math.max(0, product.stock - (items.find(item => String(item.productId) === String(product.id))?.quantity || 0));
  const quantityFor = (product: QuickOrderItem) => Math.max(1, Math.min(quantities[product.id] || 1, remaining(product) || 1));
  const setQuantity = (product: QuickOrderItem, value: number) => setQuantities(previous => ({ ...previous, [product.id]: Math.max(1, Math.min(Math.floor(Number.isFinite(value) ? value : 1), remaining(product) || 1)) }));
  const addProduct = (product: QuickOrderItem) => {
    if (remaining(product) <= 0 || isFetching) return;
    const quantity = quantityFor(product);
    addItem({ id: product.id, name: product.name, brand: null, category: null, description: '', price: product.price, stylistPrice: product.stylistPrice, image: product.thumbnail, inStock: product.stock > 0, quantity: product.stock }, quantity);
    setAdded({ id: product.id, name: product.name, quantity });
    setQuantities(previous => ({ ...previous, [product.id]: 1 }));
  };

  return <div className="nl-quick-page">
    <Seo title={t('nav.quickOrder')} description={t('newLook.quickInstructions')} noIndex />
    <PageHeading eyebrow={t('nav.quickOrder')} title={isColorRestock ? t('stylistWorkspace.quickColorRestockTitle') : t('nav.quickOrder')} description={t('newLook.quickInstructions')} />
    <div className="nl-quick-toolbar"><div className="nl-search"><Search size={20} /><input ref={searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('newLook.searchPlaceholder')} aria-label={t('newLook.search')} />{search && <button aria-label={t('home.clearFilters')} onClick={() => setSearch('')}><X size={17} /></button>}</div><div className="nl-filter-pills"><button aria-pressed={!isColorRestock} onClick={() => setParams({})}>{t('newLook.all')}</button><button aria-pressed={isColorRestock} onClick={() => setParams({ restock: 'colors' })}>{t('newLook.colors')}</button></div></div>
    <div className="nl-quick-layout"><div className="nl-quick-list nl-card">
      <div className="nl-quick-list-head"><span>{t('newLook.products')}</span><span>{t('product.price')}</span><span>{t('newLook.stock')}</span><span>{t('newLook.quantityLabel')}</span></div>
      {error ? <CatalogState error={error} retry={() => void refetch()} /> : !data ? <CatalogState loading={isFetching} /> : !data.data.length ? <CatalogState /> : data.data.map(product => {
        const available = remaining(product);
        const quantity = quantityFor(product);
        return <article className={`nl-quick-row ${added?.id === product.id ? 'nl-quick-row-added' : ''}`} key={product.id}>
          <Link className="nl-quick-product" to={`/product/${product.id}`}><img src={product.thumbnail || '/placeholder.svg'} alt="" onError={e => { if (!e.currentTarget.src.endsWith('/placeholder.svg')) e.currentTarget.src = '/placeholder.svg'; }} /><div><strong>{product.name}</strong><small>{t('newLook.professionalPrice')}</small><b className="nl-quick-mobile-price">{formatPrice(product.stylistPrice)}</b></div></Link>
          <b className="nl-quick-price">{formatPrice(product.stylistPrice)}</b>
          <span className={`nl-quick-stock ${product.stock <= 0 ? 'is-out' : ''}`}><i />{product.stock > 0 ? t('newLook.inStock') : t('product.outOfStock')}</span>
          <div className="nl-quick-row-controls"><div className="nl-quantity">
            <button disabled={quantity <= 1 || available <= 0} aria-label={t('newLook.decrease', { name: product.name })} onClick={() => setQuantity(product, quantity - 1)}><Minus size={15} /></button>
            <input type="number" inputMode="numeric" min={1} max={available || 1} value={quantity} disabled={available <= 0} aria-label={t('newLook.quantity', { name: product.name })} onChange={e => setQuantity(product, Number(e.target.value))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addProduct(product); } }} />
            <button disabled={quantity >= available} aria-label={t('newLook.increase', { name: product.name })} onClick={() => setQuantity(product, quantity + 1)}><Plus size={15} /></button>
          </div><button className="nl-quick-add" disabled={available <= 0 || isFetching} aria-label={`${t('product.addToCart')}: ${product.name}`} onClick={() => addProduct(product)}>{added?.id === product.id ? <Check size={16} /> : <Plus size={16} />}{added?.id === product.id ? t('newLook.added') : t('newLook.add')}</button></div>
        </article>;
      })}
      {data && data.meta.last_page > 1 && <div className="nl-pagination"><Pagination current={page} total={data.meta.total} pageSize={data.meta.per_page} showSizeChanger={false} onChange={page => setPagination({ page, filterKey })} /></div>}
    </div><aside className="nl-quick-summary-card nl-card"><span className="nl-eyebrow">{t('newLook.currentOrder')}</span><h2>{t('newLook.thisOrder')}</h2><strong className="nl-quick-subtotal">{formatPrice(subtotal)}</strong><p>{t('newLook.unitsAndProducts', { units: itemCount, products: items.length })}</p><div className="nl-summary-line"><span>{t('cart.subtotal')}</span><b>{formatPrice(subtotal)}</b></div><small>{t('newLook.checkoutCalculation')}</small><Link to="/cart" className="nl-button"><ShoppingBag size={17} />{t('newLook.reviewCart')}<ArrowUpRight size={17} /></Link><Link to="/stylist/quick-order?restock=colors" className="nl-summary-colors"><Zap size={16} />{t('stylistWorkspace.quickColorRestockAction')}</Link></aside></div>
    <p className="nl-add-feedback" role="status" aria-live="polite">{added ? t('newLook.addedQuantity', { count: added.quantity, name: added.name }) : ''}</p>
    <div className="nl-quick-mobile-summary"><div><strong>{formatPrice(subtotal)}</strong><small>{t('newLook.unitsAndProducts', { units: itemCount, products: items.length })}</small></div><Link to="/cart" className="nl-button">{t('newLook.reviewCart')}<ArrowUpRight size={16} /></Link></div>
  </div>;
}
