import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Drawer, Pagination } from 'antd';
import { ArrowUpRight, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useGetBrandsQuery, useGetCategoriesQuery, useGetProductCollectionsQuery, useGetProductsQuery } from '@/features/products/api';
import ProductCard from '@/components/ProductCard';
import BundleDealRail from '@/components/BundleDealRail';
import { CatalogState, PageHeading } from '@/components/storefront/DesignPrimitives';
import Seo from '@/shared/components/Seo';

export default function ShopPage() {
  const { t } = useTranslation();
  const { isStylist } = useAuth();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(params.get('search') || '');
  const input = useRef<HTMLInputElement>(null);
  const searchEdited = useRef(false);
  const debouncedSearch = useDebounce(search.trim(), 300);
  const urlSearch = params.get('search') || '';
  const category = params.get('category') || '';
  const brand = params.get('brand') || '';
  const collection = params.get('collection') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const sort = params.get('sort') || 'name_asc';
  const minPrice = params.get('min_price');
  const maxPrice = params.get('max_price');
  const inStock = params.get('in_stock') === 'true';
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: collections = [] } = useGetProductCollectionsQuery();
  const { data, isLoading, isFetching, error, refetch } = useGetProductsQuery({
    page, perPage: 12, category: category || undefined, brand: brand || undefined,
    collection: collection || undefined, search: urlSearch || undefined, sort,
    min_price: minPrice ? Number(minPrice) : undefined,
    max_price: maxPrice ? Number(maxPrice) : undefined, in_stock: inStock ? 1 : undefined,
  });
  useEffect(() => { searchEdited.current = false; setSearch(urlSearch); }, [urlSearch]);
  useEffect(() => {
    // Only user edits update the URL; browser Back/Forward remains the source of truth.
    if (searchEdited.current && debouncedSearch === search.trim() && debouncedSearch !== urlSearch) {
      setParams(previous => { const next = new URLSearchParams(previous); if (debouncedSearch) next.set('search', debouncedSearch); else next.delete('search'); next.delete('page'); return next; }, { replace: true });
    }
  }, [debouncedSearch, search, urlSearch, setParams]);
  useEffect(() => { if (params.get('focus') === 'search') input.current?.focus(); }, [params]);

  const update = (key: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.delete('page'); return next; });
  const clear = () => { setSearch(''); setParams({}); };
  const active = [category, brand, collection, minPrice, maxPrice, inStock].filter(Boolean).length;
  const products = data?.data || [];
  const total = data?.meta.total || 0;
  const filters = <div className="nl-filter-fields">
    <label>{t('product.category')}<select value={category} onChange={e => update('category', e.target.value)}><option value="">{t('home.allCategories')}</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>{t('product.brand')}<select value={brand} onChange={e => update('brand', e.target.value)}><option value="">{t('home.allBrands')}</option>{brands.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {collections.length > 0 && <label>{t('newLook.collections')}<select value={collection} onChange={e => update('collection', e.target.value)}><option value="">{t('newLook.all')}</option>{collections.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>}
    <fieldset><legend>{t('home.priceRange')}</legend><div className="nl-price-inputs"><input aria-label={t('newLook.minPrice')} type="number" min="0" placeholder={t('newLook.minPrice')} value={minPrice || ''} onChange={e => update('min_price', e.target.value)} /><span>–</span><input aria-label={t('newLook.maxPrice')} type="number" min="0" placeholder={t('newLook.maxPrice')} value={maxPrice || ''} onChange={e => update('max_price', e.target.value)} /></div></fieldset>
    <label className="nl-checkbox"><input type="checkbox" checked={inStock} onChange={e => update('in_stock', e.target.checked ? 'true' : '')} />{t('home.inStockOnly')}</label>
    {(active > 0 || urlSearch) && <button className="nl-button nl-button-secondary" onClick={clear}>{t('home.clearFilters')}<X size={16} /></button>}
  </div>;

  return <>
    <Seo title={t('seo.shopTitle')} description={t('seo.shopDescription')} path="/shop" noIndex={Boolean(urlSearch)} />
    <PageHeading eyebrow={t('newLook.products')} title={isStylist ? t('newLook.products') : t('newLook.hairRituals')} />
    <div className="nl-shop-toolbar"><form className="nl-search" role="search" onSubmit={e => { e.preventDefault(); update('search', search.trim()); }}><Search size={20} /><input ref={input} value={search} onChange={e => { searchEdited.current = true; setSearch(e.target.value); }} placeholder={t('home.searchProducts')} aria-label={t('home.searchProducts')} />{search && <button type="button" aria-label={t('home.clearFilters')} onClick={() => { setSearch(''); update('search', ''); }}><X size={18} /></button>}</form><button className="nl-filter-toggle nl-button nl-button-secondary" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={18} />{t('home.filters')}{active > 0 && ` (${active})`}</button></div>
    <div className="nl-filter-pills" aria-label={t('newLook.categories')}><button aria-pressed={!category} onClick={() => update('category', '')}>{t('newLook.all')}</button>{categories.map(item => <button key={item.id} aria-pressed={category === String(item.id)} onClick={() => update('category', String(item.id))}>{item.name}</button>)}</div>
    <div className="nl-catalog-layout"><aside className="nl-catalog-aside"><span className="nl-eyebrow">{t('home.filters')}</span>{filters}<div className="nl-help-card"><Sparkles size={22} /><h3>{t('newLook.needHelp')}</h3><p>{t('newLook.helpCopy')}</p><Link to={isStylist ? '/contact' : '/quiz'}>{isStylist ? t('newLook.support') : t('newLook.takeQuiz')}<ArrowUpRight size={15} /></Link></div></aside><div className="nl-catalog-main">
      {!isStylist && !urlSearch && !active && <section className="nl-shop-feature"><div><span className="nl-eyebrow">{t('newLook.professionalCare')}</span><h2>{t('newLook.shopFeatureTitle')}<br /><i>{t('newLook.shopFeatureAccent')}</i></h2><Link to="/quiz">{t('newLook.discoverRoutine')}<ArrowUpRight size={17} /></Link></div><div className="nl-feature-orbit" aria-hidden="true"><Sparkles size={48} /></div></section>}
      <div className="nl-catalog-meta"><span role="status">{t('newLook.productCount', { count: total })}{isFetching && !isLoading ? ` · ${t('common.loading')}` : ''}</span><label><span className="nl-sr-only">{t('newLook.sort')}</span><select value={sort} onChange={e => update('sort', e.target.value)}>{[['name_asc', 'nameAZ'], ['name_desc', 'nameZA'], ['price_asc', 'priceLowHigh'], ['price_desc', 'priceHighLow'], ['newest', 'newest']].map(([value, key]) => <option key={value} value={value}>{t(`home.${key}`)}</option>)}</select></label></div>
      {error ? <CatalogState error={error} retry={() => void refetch()} /> : isLoading ? <CatalogState loading /> : products.length ? <div className="nl-product-grid" aria-busy={isFetching}>{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}</div> : <CatalogState />}
      {total > 12 && <div className="nl-pagination"><Pagination current={page} total={total} pageSize={12} showSizeChanger={false} onChange={value => { update('page', String(value)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} /></div>}
    </div></div>
    {!urlSearch && !active && <section className="nl-section"><BundleDealRail /></section>}
    <Drawer title={t('home.filters')} open={filtersOpen} onClose={() => setFiltersOpen(false)} placement="right" width="min(360px, 100vw)"><div className="tessa-design nl-filter-drawer">{filters}<button className="nl-button nl-button-dark" onClick={() => setFiltersOpen(false)}>{t('newLook.showResults')}<ArrowUpRight size={16} /></button></div></Drawer>
  </>;
}
