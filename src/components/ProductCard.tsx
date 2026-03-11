/**
 * Product Card Component
 * 
 * Displays a product in a grid/list format with:
 * - Product image with hover effect
 * - Brand and name
 * - Price (role-aware)
 * - Featured/Out of Stock badges
 * - Quick add to cart
 */

import { Link } from 'react-router-dom';
import { Card, Typography, Tag, Button, message } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import PriceDisplay from './PriceDisplay';
import { useCart } from '@/hooks/useCart';
import type { Product } from '@/types';

const { Text, Title } = Typography;

interface ProductCardProps {
  product: Product;
  showQuickAdd?: boolean;
  /** Set true for above-the-fold cards to disable lazy loading and boost LCP */
  priority?: boolean;
}

const ProductCard = memo(function ProductCard({ product, showQuickAdd = true, priority = false }: ProductCardProps) {
  const { addItem } = useCart();
  const { t } = useTranslation();
  const PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%23f3f3f3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="Arial, Helvetica, sans-serif" font-size="20">No image</text></svg>';
  
  // Check stock status
  const inStock = typeof product.inStock === 'boolean'
    ? product.inStock
    : (product.quantity ?? 0) > 0;

  // Handle quick add to cart
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!inStock) {
      message.warning(t('product.outOfStock'));
      return;
    }
    
    addItem(product, 1);
    message.success(`${product.name} ${t('product.addedToCart')}`);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    img.onerror = null;
    img.src = PLACEHOLDER;
  };

  return (
    <Link to={`/product/${product.id}`} className="product-card" aria-label={`View ${product.name}`}>
      <Card
        hoverable
        className="product-card-ant"
        styles={{
          body: { padding: 'var(--spacing-lg)' },
          cover: { overflow: 'hidden' },
        }}
        cover={
          <div className="product-card__image-wrapper">
            {/* Product Image */}
            <img
              src={product.image || product.images?.[0] || PLACEHOLDER}
              alt={product.name ?? 'Product image'}
              className="product-card__image"
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : undefined}
              width={300}
              height={400}
              sizes="(max-width: 576px) 46vw, (max-width: 768px) 46vw, (max-width: 992px) 30vw, 23vw"
              onError={handleImageError}
            />
            
            {/* Badges */}
            <div className="product-card__badges">
              {product.featured && (
                <Tag color="gold" style={{ margin: 0, fontWeight: 500 }}>
                  {t('product.featured')}
                </Tag>
              )}
            </div>
            
            {/* Out of Stock Overlay */}
            {!inStock && (
              <div className="product-card__overlay">
                <Tag color="default" style={{ fontSize: 14, padding: '6px 16px' }}>
                  {t('product.outOfStock')}
                </Tag>
              </div>
            )}


          </div>
        }
      >
        {/* Brand */}
        <Text className="product-card__brand">
          {typeof product.brand === 'object' ? product.brand?.name : product.brand}
        </Text>

        {/* Category */}
        {product.category && (
          <Text className="product-card__category">
            {typeof product.category === 'object' ? product.category?.name : product.category}
          </Text>
        )}
        
        {/* Product Name */}
        <Title 
          level={5} 
          className="product-card__name"
          ellipsis={{ rows: 2 }}
        >
          {product.name}
        </Title>
        
        {/* Price & Add Button */}
        <div className="product-card__footer">
          <div>
            <PriceDisplay product={product} />
          </div>
          
          {showQuickAdd && (
            <Button 
              type="primary" 
              size="middle" 
              icon={<ShoppingCartOutlined />}
              disabled={!inStock}
              onClick={handleQuickAdd}
              aria-label={`${t('product.add')} ${product.name}`}
              style={{ minHeight: 36 }}
            >
              {t('product.add')}
            </Button>
          )}
        </div>
      </Card>
    </Link>
  );
});

export default ProductCard;
