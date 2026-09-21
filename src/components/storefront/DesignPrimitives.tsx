import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Product } from '@/types';

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="nl-page-heading"><div><span className="nl-eyebrow">TESSA / {eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

export function SectionHeading({ eyebrow, title, to, action }: { eyebrow?: string; title: string; to?: string; action?: string }) {
  return <div className="nl-section-heading"><div>{eyebrow && <span className="nl-eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{to && <Link to={to}>{action}<ChevronRight size={16} /></Link>}</div>;
}

export function ProductImage({ product, priority = false }: { product: Product; priority?: boolean }) {
  return <img src={product.image || product.images?.[0] || '/placeholder.svg'} alt={product.name} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} onError={e => { if (!e.currentTarget.src.endsWith('/placeholder.svg')) e.currentTarget.src = '/placeholder.svg'; }} />;
}

export function CatalogState({ loading, error, retry }: { loading?: boolean; error?: unknown; retry?: () => void }) {
  const { t } = useTranslation();
  return <div className="nl-catalog-state" role={error ? 'alert' : 'status'}>
    <Package size={28} /><p>{loading ? t('common.loading') : error ? t('shop.loadErrorDescription') : t('newLook.noProducts')}</p>
    {Boolean(error) && retry && <button className="nl-button nl-button-secondary" onClick={retry}>{t('newLook.retry')}<ArrowUpRight size={16} /></button>}
  </div>;
}
