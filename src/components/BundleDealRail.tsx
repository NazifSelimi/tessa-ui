import { useTranslation } from 'react-i18next';
import { CatalogState } from './storefront/DesignPrimitives';
import { Button, Typography, message } from 'antd';
import { GiftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useGetBundlesQuery } from '@/features/products/api';
import { AdminBundleShortcuts } from './storefront/AdminShortcuts';
import ColourDealPicker, { dealContext, useDealCount, useTierReward } from './ColourDealPicker';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import type { StoreBundle } from '@/types';
import { useFeature } from '@/shared/hooks/useFeature';
import { formatPrice } from '@/shared/utils/formatPrice';

const { Text, Title } = Typography;

export function effectiveProductPrice(bundleProduct: StoreBundle['products'][number], isProfessional: boolean) {
  return isProfessional ? bundleProduct.stylistPrice ?? bundleProduct.price : bundleProduct.price;
}

export function bundlePrice(bundle: StoreBundle, isProfessional: boolean) {
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

/** Puts every product of a fixed offer in the cart and marks the offer as applied. */
export function useAddBundle() {
  const { t } = useTranslation();
  const { addItem, applyBundle } = useCart();
  return (bundle: StoreBundle) => {
    bundle.products.forEach((product) => addItem({
      id: product.id, name: product.name, price: product.price, stylistPrice: product.stylistPrice ?? product.price,
      brand: null, category: null, description: '', image: product.image, quantity: product.quantity, inStock: true,
    }, product.quantity));
    applyBundle(bundle.id);
    message.success(t('bundles.added', { name: bundle.name }));
  };
}

export default function BundleDealRail({ showEmpty = false, bundleIds }: { showEmpty?: boolean; bundleIds?: string[] }) {
  const { t } = useTranslation();
  const { data: bundles = [], isLoading, error, refetch } = useGetBundlesQuery();
  const addBundle = useAddBundle();
  const { isProfessional } = useAuth();
  // Offers and salon colour deals are separate switches; the API only sends what is switched on.
  const offersOn = useFeature('bundles');
  const colourDealsOn = useFeature('colour_deals');
  const bundlesOn = offersOn || colourDealsOn;
  const reward = useTierReward();
  const countLabel = useDealCount();
  /** "Pick any colours" offer whose shade picker is open. */
  const [picking, setPicking] = useState<StoreBundle | null>(null);

  const visibleBundles = bundleIds?.length ? bundles.filter((bundle) => bundleIds.includes(String(bundle.id))) : bundles;

  if (!bundlesOn) return null;
  if (showEmpty && (isLoading || error)) return <CatalogState loading={isLoading} error={error} retry={() => void refetch()} />;
  if (!visibleBundles.length) return showEmpty ? <p className="nl-no-offers">{t('newLook.noOffers')}</p> : null;

  return (
    <section className="bundle-deal-rail" aria-label="Current offers">
      <div className="bundle-deal-rail__heading">
        <div><Text className="bundle-deal-rail__eyebrow">{t('bundles.eyebrow')}</Text><Title level={3}>{t('bundles.title')}</Title></div>
        <Text type="secondary">{t('bundles.subtitle')}</Text>
      </div>
      <div className="bundle-deal-rail__scroller">
        {visibleBundles.map((bundle) => {
          const regular = bundle.products.reduce((sum, product) => sum + effectiveProductPrice(product, isProfessional) * product.quantity, 0);
          const price = bundlePrice(bundle, isProfessional);
          if (bundle.promotionType === 'mix_match') {
            const dealPicture = bundle.image ? `${bundle.image}?v=${encodeURIComponent(bundle.updatedAt ?? '')}` : null;
            const top = bundle.tiers?.[bundle.tiers.length - 1];
            const deal = dealContext(bundle);
            return <article className="bundle-card bundle-card--colours" key={bundle.id}>
              <div className={`bundle-card__media${dealPicture ? ' bundle-card__media--picture' : ''}`}>
                {dealPicture
                  ? <img src={dealPicture} alt={bundle.name} width={1080} height={1350} loading="lazy" decoding="async" />
                  : <div className="bundle-card__palette" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>}
                <div className="bundle-card__badges">
                  {top && top.free > 0 && <span className="bundle-card__off">{top.min}+{top.free}</span>}
                  {bundle.audience === 'stylist' && <span className="bundle-card__salon">{t('bundles.salonOffer')}</span>}
                </div>
              </div>
              <div className="bundle-card__body">
                <h4 className="bundle-card__title">{bundle.name}</h4>
                <p className="bundle-card__lead">{deal.isColour ? t('bundles.pickAny') : bundle.description}{deal.isColour && bundle.familyName && !(bundle.familyLines?.length && bundle.familyLines.length > 1) ? ` · ${bundle.familyName}` : ''}</p>
                <ol className="bundle-card__steps">
                  {(bundle.tiers ?? []).map((tier) => <li key={tier.min}><strong>{countLabel(tier.min, deal.isColour)}</strong><span>{reward(tier, deal)}</span></li>)}
                </ol>
                <Button type="primary" block size="large" shape="round" className="bundle-card__add" icon={<GiftOutlined />} onClick={() => setPicking(bundle)}>{deal.isColour ? t('bundles.pickColours') : t('bundles.pickProducts')}</Button>
              </div>
                <AdminBundleShortcuts bundle={bundle} />
            </article>;
          }
          const saved = Math.max(0, regular - price);
          const off = regular > 0 ? Math.round((saved / regular) * 100) : 0;
          const isGift = bundle.promotionType === 'bonus_items';
          // Picture made in Post Studio → Bundles (or uploaded by an admin); ?v= shows a new one at once.
          const picture = bundle.image ? `${bundle.image}?v=${encodeURIComponent(bundle.updatedAt ?? '')}` : null;
          const photos = bundle.products.filter((product) => product.image).slice(0, 3);
          return <article className="bundle-card" key={bundle.id}>
            <div className={`bundle-card__media${picture ? ' bundle-card__media--picture' : ''}`}>
              {picture
                ? <img src={picture} alt={bundle.name} width={1080} height={1350} loading="lazy" decoding="async" />
                : <div className={`bundle-card__collage bundle-card__collage--${photos.length || 0}`} aria-hidden="true">
                    {photos.length ? photos.map((product) => <img key={product.id} src={product.image ?? ''} alt="" loading="lazy" decoding="async" />) : <GiftOutlined />}
                  </div>}
              <div className="bundle-card__badges">
                {(isGift || off > 0) && <span className="bundle-card__off">{isGift ? <><GiftOutlined /> {t('bundles.gift')}</> : `-${off}%`}</span>}
                {bundle.audience === 'stylist' && <span className="bundle-card__salon">{t('bundles.salonOffer')}</span>}
              </div>
            </div>
            <div className="bundle-card__body">
              <h4 className="bundle-card__title">{bundle.name}</h4>
              <ul className="bundle-card__items">
                {bundle.products.map((product) => <li key={product.id}>
                  <span className="bundle-card__qty">{product.quantity}×</span>{product.name}
                  {(product.bonusQuantity ?? 0) > 0 && <em> · {product.bonusQuantity} {t('bundles.gift').toLowerCase()}</em>}
                </li>)}
              </ul>
              <div className="bundle-card__price">
                <strong>{formatPrice(price)}</strong>
                {saved > 0 && <s>{formatPrice(regular)}</s>}
              </div>
              {saved > 0 && <span className="bundle-card__save">{t('bundles.youSave', { amount: formatPrice(saved) })}</span>}
              <Button type="primary" block size="large" shape="round" className="bundle-card__add" icon={<ShoppingCartOutlined />} onClick={() => addBundle(bundle)}>{t('bundles.add')}</Button>
            </div>
            <AdminBundleShortcuts bundle={bundle} />
            </article>;
        })}
      </div>
      {picking && <ColourDealPicker bundle={picking} open onClose={() => setPicking(null)} />}
    </section>
  );
}
