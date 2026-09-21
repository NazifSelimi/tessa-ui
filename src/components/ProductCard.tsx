import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/hooks/useCart';
import PriceDisplay from './PriceDisplay';
import { ProductImage } from './storefront/DesignPrimitives';
import type { Product } from '@/types';

interface ProductCardProps { product: Product; showQuickAdd?: boolean; priority?: boolean }

const ProductCard = memo(function ProductCard({ product, showQuickAdd = true, priority = false }: ProductCardProps) {
  const { t } = useTranslation();
  const { addItem, getCartItem, updateQuantity } = useCart();
  const quantity = getCartItem(product.id)?.quantity || 0;
  const inStock = typeof product.inStock === 'boolean' ? product.inStock : (product.quantity ?? 0) > 0;
  const atLimit = typeof product.quantity === 'number' && quantity >= product.quantity;
  const brand = typeof product.brand === 'object' ? product.brand?.name : product.brand;
  const category = typeof product.category === 'object' ? product.category?.name : product.category;

  return <article className="nl-product-card">
    <Link to={`/product/${product.id}`} className="nl-product-art" aria-label={product.name}>
      <ProductImage product={product} priority={priority} />
      {product.featured && <span className="nl-product-badge">{t('product.featured')}</span>}
      {!inStock && <span className="nl-stock-badge">{t('product.outOfStock')}</span>}
    </Link>
    <div className="nl-product-info"><small>{brand || 'Tessa'}</small><Link to={`/product/${product.id}`}><h3>{product.name}</h3></Link><span>{category}</span><PriceDisplay product={product} /></div>
    {showQuickAdd && <div className="nl-product-action">{quantity > 0 ? <div className="nl-quantity">
      <button onClick={() => updateQuantity(product.id, quantity - 1)} aria-label={t('newLook.decrease', { name: product.name })}><Minus size={16} /></button>
      <output aria-live="polite" aria-label={t('newLook.quantity', { name: product.name })}>{quantity}</output>
      <button disabled={!inStock || atLimit} onClick={() => addItem(product, 1)} aria-label={t('newLook.increase', { name: product.name })}><Plus size={16} /></button>
    </div> : <button className="nl-add-button" disabled={!inStock} onClick={() => addItem(product, 1)} aria-label={`${t('product.addToCart')}: ${product.name}`}><Plus size={17} />{t('product.addToCart')}</button>}</div>}
  </article>;
});

export default ProductCard;
