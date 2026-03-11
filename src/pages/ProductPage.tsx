/**
 * Product Detail Page
 * 
 * Displays full product information including:
 * - Image gallery
 * - Variant/size selector
 * - Price display (role-aware)
 * - Add to cart functionality
 * - Product description
 * - Related products
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Row, Col, Typography, Button, InputNumber, Space, 
  Tag, Spin, message, Breadcrumb, Divider, Collapse,
  Alert,
} from 'antd';
import { 
  ShoppingCartOutlined, HeartOutlined, ArrowLeftOutlined,
  CheckCircleOutlined, TruckOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import PriceDisplay from '@/components/PriceDisplay';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/hooks/useCart';
import { useLocalizedDescription } from '@/hooks/useLocalizedDescription';
import { useTranslation } from 'react-i18next';
import { getProductById, getRelatedProducts } from '@/api/services';
import type { Product } from '@/types';

const { Title, Text, Paragraph } = Typography;

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { t } = useTranslation();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const localizedDescription = useLocalizedDescription(product);

  // Load product data
  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      if (!id) return;
      setLoading(true);
      
      const productData = await getProductById(id);
      if (cancelled) return;
      if (productData) {
        setProduct(productData);
        const related = await getRelatedProducts(productData.id as number | string);
        if (cancelled) return;
        setRelatedProducts(related);
      }
      
      setLoading(false);
    }
    loadProduct();

    return () => { cancelled = true; };
  }, [id]);

  // Handle add to cart
  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    message.success({
      content: (
        <span>
          Added <strong>{product.name}</strong> to cart
        </span>
      ),
      icon: <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />,
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-state" style={{ padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Not found state
  if (!product) {
    return (
      <div className="empty-state">
        <Title level={4}>{t('product.notFound')}</Title>
        <Text type="secondary" className="empty-state__description">
          {t('product.notFoundDescription')}
        </Text>
        <Button type="primary" onClick={() => navigate('/')}>
          {t('product.backToShop')}
        </Button>
      </div>
    );
  }

  const inStock = product.inStock ?? (product.quantity ?? 0) > 0;
  const lowStock = (product.quantity ?? 0) > 0 && (product.quantity ?? 0) <= 5;

  // Resolve the product image URL
  const NO_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="100%" height="100%" fill="%23f5f5f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="sans-serif" font-size="18">No image</text></svg>';
  const productImages = product.images?.length ? product.images : (product.image ? [product.image] : []);
  const mainImage = productImages[selectedImage] ?? productImages[0] ?? NO_IMAGE;

  return (
    <div>
      {/* Back Button */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 8, padding: '4px 0' }}
      >
        {t('product.back')}
      </Button>

      {/* Breadcrumb */}
      <Breadcrumb 
        style={{ marginBottom: 'var(--spacing-xl)' }}
        items={[
          { title: <Link to="/">{t('nav.shop')}</Link> },
          { title: typeof product.brand === 'object' ? product.brand?.name : product.brand },
          { title: product.name },
        ]}
      />

      <div className="product-detail">
        {/* Product Images */}
        <div className="product-detail__gallery">
          {/* Main Image */}
          <div className="product-detail__main-image">
            <img
              src={mainImage}
              alt={product.name}
            />
          </div>
          
          {/* Thumbnail Gallery */}
          {productImages.length > 1 && (
            <div className="product-detail__thumbnails">
              {productImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`product-detail__thumbnail ${idx === selectedImage ? 'product-detail__thumbnail--active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedImage(idx)}
                  aria-label={`View image ${idx + 1}`}
                >
                  <img
                    src={img || NO_IMAGE}
                    alt={`${product.name} ${idx + 1}`}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-detail__info">
          {/* Brand */}
          <Text className="product-detail__brand">
            {typeof product.brand === 'object' ? product.brand?.name : product.brand}
          </Text>
          
          {/* Title */}
          <Title level={2} className="product-detail__title">
            {product.name}
          </Title>
          
          {/* Tags */}
          <Space style={{ marginBottom: 'var(--spacing-lg)' }}>
            {product.featured && <Tag color="gold">Featured</Tag>}
            <Tag>{(typeof product.category === 'object' ? (product.category?.name ?? '') : (product.category ?? '')).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Tag>
          </Space>

          <Divider style={{ margin: 'var(--spacing-lg) 0' }} />

          {/* Price Display */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>
              {t('product.price')}
            </Text>
            <PriceDisplay product={product} large showSavings />
          </div>

          {/* Quantity & Add to Cart */}
          <div style={{ 
            display: 'flex', 
            gap: 'var(--spacing-md)', 
            alignItems: 'flex-end',
            marginBottom: 'var(--spacing-xl)',
            flexWrap: 'wrap',
          }}>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>
                {t('product.quantity')}
              </Text>
              <InputNumber
                min={1}
                max={product.quantity || 1}
                value={quantity}
                onChange={(val) => setQuantity(val || 1)}
                style={{ width: 100 }}
                size="large"
                aria-label="Product quantity"
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flex: 1, minWidth: 0 }}>
              <Button
                type="primary"
                size="large"
                icon={<ShoppingCartOutlined />}
                disabled={!inStock}
                onClick={handleAddToCart}
                style={{ flex: 1, minWidth: 0, height: 48 }}
              >
                {inStock ? t('product.addToCart') : t('product.outOfStock')}
              </Button>
              <Button 
                size="large" 
                icon={<HeartOutlined />}
                style={{ height: 48, flexShrink: 0 }}
                aria-label="Add to wishlist"
              />
            </div>
          </div>

          {/* Stock Warning */}
          {lowStock && (
            <Alert
              message={`Only ${product.quantity} left in stock`}
              type="warning"
              showIcon
              style={{ marginBottom: 'var(--spacing-lg)' }}
            />
          )}

          {/* Trust Badges */}
          <div className="trust-badges" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <div className="trust-badge">
              <TruckOutlined />
              <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>{t('product.freeShipping')}</Text>
            </div>
            <div className="trust-badge">
              <SafetyCertificateOutlined />
              <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>{t('product.authenticProducts')}</Text>
            </div>
          </div>

          <Divider />

          {/* Description & Details */}
          <Collapse 
            defaultActiveKey={['description']}
            expandIconPosition="end"
            items={[
              {
                key: 'description',
                label: <Text strong style={{ fontSize: 16 }}>{t('product.description')}</Text>,
                children: (
                  <Paragraph style={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                    {localizedDescription}
                  </Paragraph>
                ),
              },
              {
                key: 'details',
                label: <Text strong style={{ fontSize: 16 }}>{t('product.productDetails')}</Text>,
                children: (
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 24px' }}>
                    <Text type="secondary">{t('product.brand')}</Text>
                    <Text strong>{typeof product.brand === 'object' ? product.brand?.name : product.brand}</Text>
                    <Text type="secondary">{t('product.category')}</Text>
                    <Text strong>{typeof product.category === 'object' ? product.category?.name : product.category}</Text>
                    <Text type="secondary">{t('product.availability')}</Text>
                    <Text strong style={{ color: inStock ? '#52c41a' : '#ff4d4f' }}>
                      {inStock ? t('product.inStock') : t('product.outOfStock')}
                    </Text>
                  </div>
                ),
              },
              {
                key: 'shipping',
                label: <Text strong style={{ fontSize: 16 }}>{t('product.shippingReturns')}</Text>,
                children: (
                  <Space direction="vertical" size={8}>
                    <Text><TruckOutlined style={{ marginRight: 8, color: '#1677ff' }} />{t('product.freeStandardShipping')}</Text>
                    <Text><SafetyCertificateOutlined style={{ marginRight: 8, color: '#1677ff' }} />{t('product.expressShipping')}</Text>
                    <Text><CheckCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />{t('product.returnPolicy')}</Text>
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div style={{ marginTop: 'var(--spacing-3xl)' }}>
          <Divider />
          <Title level={4} style={{ marginBottom: 'var(--spacing-xl)' }}>{t('product.youMayAlsoLike')}</Title>
          <Row gutter={[16, 16]}>
            {relatedProducts.map(p => (
              <Col key={p.id} xs={12} sm={8} md={6}>
                <ProductCard product={p} />
              </Col>
            ))}
          </Row>
        </div>
      )}
    </div>
  );
}
