import { Button, Tag, Typography, message } from 'antd';
import { GiftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useGetBundlesQuery } from '@/features/products/api';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import type { StoreBundle } from '@/types';
import { formatPrice } from '@/shared/utils/formatPrice';

const { Text, Title } = Typography;

function effectiveProductPrice(bundleProduct: StoreBundle['products'][number], isProfessional: boolean) {
  return isProfessional ? bundleProduct.stylistPrice ?? bundleProduct.price : bundleProduct.price;
}

function bundlePrice(bundle: StoreBundle, isProfessional: boolean) {
  const total = bundle.products.reduce((sum, product) => sum + effectiveProductPrice(product, isProfessional) * product.quantity, 0);
  if (bundle.promotionType === 'fixed_price' && bundle.bundlePrice != null) return bundle.bundlePrice;
  if (bundle.promotionType === 'percentage' && bundle.discountPercentage != null) return total * (1 - bundle.discountPercentage / 100);
  if (bundle.promotionType === 'bonus_items') {
    return total - bundle.products.reduce((sum, product) => (
      sum + effectiveProductPrice(product, isProfessional) * (product.bonusQuantity ?? (product.isBonus ? product.quantity : 0))
    ), 0);
  }
  return total;
}

export default function BundleDealRail() {
  const { data: bundles = [] } = useGetBundlesQuery();
  const { addItem, applyBundle } = useCart();
  const { isProfessional } = useAuth();

  if (!bundles.length) return null;

  const addBundle = (bundle: StoreBundle) => {
    bundle.products.forEach((product) => addItem({
      id: product.id, name: product.name, price: product.price, stylistPrice: product.stylistPrice ?? product.price,
      brand: null, category: null, description: '', image: product.image, quantity: product.quantity, inStock: true,
    }, product.quantity));
    applyBundle(bundle.id);
    message.success(`${bundle.name} added to your cart`);
  };

  return (
    <section className="bundle-deal-rail" aria-label="Current offers">
      <div className="bundle-deal-rail__heading">
        <div><Text className="bundle-deal-rail__eyebrow">CURATED VALUE</Text><Title level={3}>Better together</Title></div>
        <Text type="secondary">Salon restocks, routines, and limited bundles.</Text>
      </div>
      <div className="bundle-deal-rail__scroller">
        {bundles.map((bundle) => {
          const regular = bundle.products.reduce((sum, product) => sum + effectiveProductPrice(product, isProfessional) * product.quantity, 0);
          const price = bundlePrice(bundle, isProfessional);
          return <article className="bundle-deal-card" key={bundle.id}>
            <div className="bundle-deal-card__top"><Tag>{bundle.audience === 'stylist' ? 'STYLIST OFFER' : 'LIMITED OFFER'}</Tag><GiftOutlined /></div>
            <Title level={4}>{bundle.name}</Title>
            <Text type="secondary" className="bundle-deal-card__copy">{bundle.description}</Text>
            <div className="bundle-deal-card__items">{bundle.products.map((product) => <span key={product.id}>{product.quantity}x {product.name}{(product.bonusQuantity ?? 0) > 0 ? ` - ${product.bonusQuantity} free` : ''}</span>)}</div>
            <div className="bundle-deal-card__price"><Text delete>{formatPrice(regular)}</Text><strong>{formatPrice(price)}</strong></div>
            <Button type="primary" block icon={<ShoppingCartOutlined />} onClick={() => addBundle(bundle)}>Add offer</Button>
          </article>;
        })}
      </div>
    </section>
  );
}
