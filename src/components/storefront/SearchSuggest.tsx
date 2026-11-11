/**
 * Header search with instant results: type a name or a shade number ("7.1",
 * "6.43 fanola") and add a product to the cart straight from the list.
 * Enter (or the arrow button) opens the full shop search.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { App } from 'antd';
import { ArrowUpRight, Plus, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGetProductsQuery } from '@/features/products/api';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { Product } from '@/types';

const MIN_CHARS = 2;

function rolePrice(product: Product, professional: boolean): number {
  const stylist = Number(product.stylistPrice ?? 0);
  return professional && stylist > 0 ? stylist : Number(product.price ?? 0);
}

export default function SearchSuggest({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();
  const { isProfessional } = useAuth();
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLFormElement>(null);

  // Wait for a short pause in typing before asking the server.
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(value.trim()), 250);
    return () => window.clearTimeout(id);
  }, [value]);

  // Close the list when moving to another page or tapping outside it.
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const { data, isFetching } = useGetProductsQuery(
    { search: query, perPage: 8 },
    { skip: query.length < MIN_CHARS },
  );
  const results = query.length >= MIN_CHARS ? data?.data ?? [] : [];
  const showList = open && query.length >= MIN_CHARS;

  return (
    <form
      ref={boxRef}
      className={`nl-search nl-suggest ${className}`}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        setOpen(false);
        navigate(`/shop${value.trim() ? `?search=${encodeURIComponent(value.trim())}` : ''}`);
      }}
    >
      <Search size={19} />
      <input
        value={value}
        onChange={(event) => { setValue(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
        placeholder={t('newLook.searchPlaceholder')}
        aria-label={t('home.searchProducts')}
        enterKeyHint="search"
        autoComplete="off"
      />
      {value && (
        <button type="button" className="nl-suggest__clear" onClick={() => { setValue(''); setQuery(''); }} aria-label={t('common.clear', 'Clear')}>
          <X size={16} />
        </button>
      )}
      <button type="submit" aria-label={t('newLook.search')}><ArrowUpRight size={18} /></button>

      {showList && (
        <div className="nl-suggest__list" role="listbox">
          {results.map((product) => {
            const inStock = product.inStock ?? (product.quantity ?? 0) > 0;
            return (
              <div key={product.id} className="nl-suggest__item" role="option" aria-selected={false}>
                <Link to={`/product/${product.id}`} className="nl-suggest__link" onClick={() => setOpen(false)}>
                  <span className="nl-suggest__thumb">{product.image ? <img src={product.image} alt="" loading="lazy" /> : null}</span>
                  <span className="nl-suggest__text">
                    <strong>{product.name}</strong>
                    <small>
                      {typeof product.brand === 'object' ? product.brand?.name : product.brand}
                      {' · '}
                      {formatPrice(rolePrice(product, isProfessional))}
                      {!inStock && <em> · {t('product.outOfStock')}</em>}
                    </small>
                  </span>
                </Link>
                <button
                  type="button"
                  className="nl-suggest__add"
                  disabled={!inStock}
                  aria-label={`${t('product.addToCart')}: ${product.name}`}
                  onClick={() => {
                    addItem(product, 1);
                    message.success(`${product.name} ${t('product.addedToCart')}`);
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>
            );
          })}
          {!isFetching && results.length === 0 && <p className="nl-suggest__empty">{t('common.noResults', 'No results')}</p>}
          {results.length > 0 && (
            <button type="submit" className="nl-suggest__all">{t('newLook.search')}: “{value.trim()}” <ArrowUpRight size={16} /></button>
          )}
        </div>
      )}
    </form>
  );
}
