import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/hooks/useCart';
import PriceDisplay from './PriceDisplay';
import { storefrontBrandName, storefrontCategoryName } from '@/shared/utils/storefrontCatalog';
import { ProductImage } from './storefront/DesignPrimitives';
import { AdminProductShortcuts } from './storefront/AdminShortcuts';
import type { Product } from '@/types';

interface ProductCardProps { product: Product; showQuickAdd?: boolean; priority?: boolean }

const ProductCard = memo(function ProductCard({ product, showQuickAdd = true, priority = false }: ProductCardProps) {
  const { t } = useTranslation();
  const { addItem, getCartItem, updateQuantity } = useCart();
  const quantity = getCartItem(product.id)?.quantity || 0;
  const inStock = typeof product.inStock === 'boolean' ? product.inStock : (product.quantity ?? 0) > 0;
  const atLimit = typeof product.quantity === 'number' && quantity >= product.quantity;
  const brand = storefrontBrandName(product);
  const category = storefrontCategoryName(product);
  // A colour line is shown once; its shades are picked on the product page.
  const shadeCount = product.shadeCount && product.shadeCount > 1 ? product.shadeCount : 0;
  const title = shadeCount && product.shadeFamily ? product.shadeFamily.name : product.name;

  return <article className="nl-product-card">
    <Link to={`/product/${product.id}`} className="nl-product-art" aria-label={title}>
      <ProductImage product={product} priority={priority} hoverAngle />
      {product.featured && <span className="nl-product-badge">{t('product.featured')}</span>}
      {!inStock && <span className="nl-stock-badge">{t('product.outOfStock')}</span>}
      {product.inReview && <span className="nl-review-badge">{t('product.inReview')}</span>}
    </Link>
    <div className="nl-product-info">{brand && <small>{brand}</small>}<Link to={`/product/${product.id}`}><h3>{title}</h3></Link>{category && <span className="nl-product-category">{category}</span>}{shadeCount > 0 && <div className="nl-shade-summary">
      {(product.shadePreview ?? []).map((url) => <img key={url} src={url} alt="" loading="lazy" />)}
      <span>{t('product.shadeCount', { count: shadeCount })}</span>
    </div>}<PriceDisplay product={product} /></div>
    {showQuickAdd && shadeCount > 0 && <div className="nl-product-action"><Link to={`/product/${product.id}`} className="nl-add-button nl-choose-shade">{t('product.chooseShade')}</Link></div>}
    {showQuickAdd && !shadeCount && <div className="nl-product-action">{quantity > 0 ? <div className="nl-quantity">
      <button onClick={() => updateQuantity(product.id, quantity - 1)} aria-label={t('newLook.decrease', { name: product.name })}><Minus size={16} /></button>
      <output aria-live="polite" aria-label={t('newLook.quantity', { name: product.name })}>{quantity}</output>
      <button disabled={!inStock || atLimit} onClick={() => addItem(product, 1)} aria-label={t('newLook.increase', { name: product.name })}><Plus size={16} /></button>
    </div> : <button className="nl-add-button" disabled={!inStock} onClick={() => addItem(product, 1)} aria-label={`${t('product.addToCart')}: ${product.name}`}><Plus size={17} />{t('product.addToCart')}</button>}</div>}
    <AdminProductShortcuts product={product} />
  </article>;
});

export default ProductCard;
