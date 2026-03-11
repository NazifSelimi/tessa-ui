/**
 * Recommendations Page
 *
 * Displays results from the hair survey:
 *   Section 1 — Recommended Products (responsive grid)
 *   Section 2 — Recommended Bundles (cards with product list, discount, add-to-cart)
 *
 * Data arrives via React Router `location.state` (set by HairSurveyPage after
 * the POST /v1/recommendations call).
 *
 * If the user lands here without state, they are redirected to /hair-survey.
 */

import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Typography,
  Button,
  Card,
  Row,
  Col,
  Tag,
  Space,
  Empty,
  Divider,
  List,
  message,
} from 'antd';
import {
  ShoppingCartOutlined,
  ArrowLeftOutlined,
  GiftOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useCart } from '@/hooks/useCart';
import type {
  RecommendationResult,
  RecommendedBundle,
  RecommendedProduct,
  RecommendationPayload,
  BundleProduct,
} from '@/types';
import { formatPrice } from '@/shared/utils/formatPrice';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ProductRecommendationCard({ product }: { product: RecommendedProduct }) {
  const { addItem } = useCart();
  const { t } = useTranslation();

  const PLACEHOLDER =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%23f3f3f3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="Arial,sans-serif" font-size="14">No image</text></svg>';

  const handleAdd = () => {
    // Map RecommendedProduct → cart-compatible Product shape
    addItem(
      {
        id: product.id,
        name: product.name,
        description: product.description ?? '',
        brand: product.brand,
        brandId: product.brandId,
        category: product.category,
        categoryId: product.categoryId,
        price: product.price,
        stylistPrice: product.stylistPrice,
        image: product.image,
        inStock: product.inStock,
        quantity: product.quantity,
      },
      1,
    );
    message.success(t('recommendations.addedToCart', { name: product.name }));
  };

  return (
    <Card
      hoverable
      styles={{ body: { padding: 16 } }}
      cover={
        <Link to={`/product/${product.id}`}>
          <img
            src={product.image || PLACEHOLDER}
            alt={product.name}
            style={{ width: '100%', height: 200, objectFit: 'cover' }}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
        </Link>
      }
    >
      <Text type="secondary" style={{ fontSize: 12 }}>
        {product.brand?.name}
      </Text>
      <Title level={5} ellipsis={{ rows: 2 }} style={{ marginTop: 4, marginBottom: 8 }}>
        <Link to={`/product/${product.id}`} style={{ color: 'inherit' }}>
          {product.name}
        </Link>
      </Title>

      {/* Price */}
      <div style={{ marginBottom: 8 }}>
        {product.sale ? (
          <Space size={8} align="baseline">
            <Text delete type="secondary">{formatPrice(product.price)}</Text>
            <Text strong style={{ fontSize: 16, color: 'var(--color-primary, #1677ff)' }}>
              {formatPrice(product.sale.price)}
            </Text>
          </Space>
        ) : (
          <Text strong style={{ fontSize: 16 }}>{formatPrice(product.price)}</Text>
        )}
      </div>

      <Button
        type="primary"
        block
        icon={<ShoppingCartOutlined />}
        disabled={!product.inStock}
        onClick={handleAdd}
        style={{ marginTop: 4 }}
        size="large"
      >
        {product.inStock ? t('recommendations.addToCart') : t('product.outOfStock')}
      </Button>
    </Card>
  );
}

function BundleCard({ bundle }: { bundle: RecommendedBundle }) {
  const { addItem } = useCart();
  const { t } = useTranslation();

  // Calculate total price from product prices
  const totalPrice = bundle.isDynamic
    ? bundle.totalPrice
    : bundle.products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  // Calculate discounted price for static bundles
  const discountedPrice =
    !bundle.isDynamic && bundle.discountPercentage != null
      ? totalPrice * (1 - bundle.discountPercentage / 100)
      : null;

  const handleAddBundle = () => {
    bundle.products.forEach((bp: BundleProduct & { stylistPrice?: number }) => {
      // Map BundleProduct → cart-compatible Product shape
      addItem(
        {
          id: bp.id,
          name: bp.name,
          brand: null,
          category: null,
          description: '',
          price: bp.price,
          stylistPrice: bp.stylistPrice ?? bp.price, // fallback to price if missing
          image: bp.image,
          inStock: true,
          quantity: bp.quantity,
        },
        bp.quantity,
      );
    });
    message.success(t('recommendations.bundleAdded', { name: bundle.name, count: bundle.products.length }));
  };

  return (
    <Card
      style={{ height: '100%' }}
      styles={{ body: { padding: 24, display: 'flex', flexDirection: 'column', height: '100%' } }}
    >
      <div style={{ flex: 1 }}>
        <Space align="center" style={{ marginBottom: 8 }}>
          <GiftOutlined style={{ fontSize: 20, color: 'var(--color-primary, #1677ff)' }} />
          <Title level={4} style={{ margin: 0 }}>
            {bundle.name}
          </Title>
        </Space>

        {bundle.isDynamic && (
          <Tag color="purple" style={{ marginBottom: 12 }}>
            <StarOutlined /> {t('recommendations.recommendedRoutine')}
          </Tag>
        )}

        {bundle.description && (
          <Paragraph type="secondary" style={{ marginBottom: 12 }}>
            {bundle.description}
          </Paragraph>
        )}

        {/* Included products */}
        <List
          size="small"
          dataSource={bundle.products}
          renderItem={(p: BundleProduct) => (
            <List.Item style={{ padding: '6px 0' }}>
              <Text>{p.name}</Text>
              <Text type="secondary" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                {formatPrice(p.price)}
              </Text>
            </List.Item>
          )}
          style={{ marginBottom: 16 }}
        />

        {/* Pricing */}
        <div style={{ marginBottom: 16 }}>
          {discountedPrice != null && discountedPrice < totalPrice ? (
            <Space size={12} align="baseline">
              <Text delete type="secondary" style={{ fontSize: 14 }}>
                {formatPrice(totalPrice)}
              </Text>
              <Text strong style={{ fontSize: 20, color: 'var(--color-primary, #1677ff)' }}>
                {formatPrice(discountedPrice)}
              </Text>
              {!bundle.isDynamic && bundle.discountPercentage != null && bundle.discountPercentage > 0 && (
                <Tag color="red">{t('recommendations.save', { percent: bundle.discountPercentage })}</Tag>
              )}
            </Space>
          ) : (
            <Text strong style={{ fontSize: 20 }}>
              {formatPrice(totalPrice)}
            </Text>
          )}
        </div>
      </div>

      <Button
        type="primary"
        block
        size="large"
        icon={<ShoppingCartOutlined />}
        onClick={handleAddBundle}
      >
        {t('recommendations.addBundleToCart')}
      </Button>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function RecommendationsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const state = location.state as
    | { recommendations: RecommendationResult; survey: RecommendationPayload }
    | undefined;

  /* If no data, redirect back to survey */
  if (!state?.recommendations) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 16px' }}>
        <Empty description={t('recommendations.noRecommendationsYet')} />
        <Button
          type="primary"
          size="large"
          onClick={() => navigate('/hair-survey')}
          style={{ marginTop: 24 }}
        >
          {t('recommendations.takeHairSurvey')}
        </Button>
      </div>
    );
  }

  const { recommendations } = state;
  const { products, bundles } = recommendations;
  const hasProducts = products.length > 0;
  const hasBundles = bundles.length > 0;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px 80px' }}>
      {/* Back + title */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/hair-survey')}
        style={{ marginBottom: 16 }}
      >
        {t('recommendations.retakeSurvey')}
      </Button>

      <Title level={2}>{t('recommendations.title')}</Title>
      <Paragraph type="secondary">
        {t('recommendations.subtitle')}
      </Paragraph>

      <Divider />

      {/* Section 1 — Products */}
      {hasProducts ? (
        <>
          <Title level={3} style={{ marginBottom: 24 }}>
            {t('recommendations.recommendedProducts')}
          </Title>
          <Row gutter={[24, 24]}>
            {products.map((product) => (
              <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
                <ProductRecommendationCard product={product} />
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <Empty description={t('recommendations.noProducts')} style={{ marginBottom: 40 }} />
      )}

      {/* Section 2 — Bundles */}
      {hasBundles && (
        <>
          <Divider />
          <Title level={3} style={{ marginBottom: 24 }}>
            {t('recommendations.recommendedBundles')}
          </Title>
          <Row gutter={[24, 24]}>
            {bundles.map((bundle, idx) => (
              <Col key={bundle.id ?? `dynamic-${idx}`} xs={24} sm={12} lg={8}>
                <BundleCard bundle={bundle} />
              </Col>
            ))}
          </Row>
        </>
      )}

      {!hasProducts && !hasBundles && (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Empty description={t('recommendations.noMatchingProducts')} />
          <Button
            type="primary"
            size="large"
            onClick={() => navigate('/hair-survey')}
            style={{ marginTop: 24 }}
          >
            {t('recommendations.retakeSurvey')}
          </Button>
        </div>
      )}
    </div>
  );
}
