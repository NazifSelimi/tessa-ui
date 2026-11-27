/**
 * "Pick any" offer: the stylist chooses any shades of the offer's colour lines
 * (or any of its listed products, e.g. Silver Star shampoo or mask) and how
 * many of each, sees how far they are from the next reward step (10 colours →
 * free oxidant, 7 pieces → 1 free, 30 tubes → free brush), picks the gift, and
 * adds everything to the cart and picks the deal; the cart and checkout give
 * the reward of the step reached (server pricing). Only picked deals count.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Empty, Input, InputNumber, Modal, Progress, Radio, Segmented, Spin, Typography, message } from 'antd';
import { GiftOutlined, MinusOutlined, PlusOutlined, SearchOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useGetProductByIdQuery } from '@/features/products/api';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { groupShades } from '@/shared/utils/shadeGroups';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { BundleProduct, BundleTier, Product, ProductShade, StoreBundle } from '@/types';

const { Text } = Typography;

/** Generated swatches have a round-dot texture next to the ribbon image ({id}.jpg -> {id}-dot.jpg). */
const dotUrl = (swatch: string) => swatch.replace(/(\/swatches\/silk[\w-]*\/\d+)\.jpg$/, '$1-dot.jpg');
const shadeLabel = (shade: ProductShade) => shade.shadeCode || shade.shadeName || shade.name;

export interface DealContext { isColour: boolean; giftNames: Record<string, string> }

/** What the deal counts and its gift names, from a shop offer. */
export function dealContext(bundle: StoreBundle): DealContext {
  const isColour = Boolean(bundle.familyLines?.length || bundle.familyProductId);
  const giftNames = Object.fromEntries(bundle.products.filter((item) => item.isBonus !== false).map((item) => [item.id, item.name]));
  return { isColour, giftNames };
}

/** "3 free colours + free oxidant", "1 free", "Magic Brush free" for a step. */
export function useTierReward() {
  const { t } = useTranslation();
  return (tier: BundleTier, deal?: DealContext) => {
    const isColour = deal?.isColour ?? true;
    const names = deal?.giftNames ?? {};
    const optionNames = Object.values(names);
    const qty = tier.gift_qty ?? 1;
    return [
      tier.free > 0 ? (isColour ? t('bundles.freeColours', { count: tier.free }) : t('bundles.freeItems', { count: tier.free })) : null,
      tier.gift
        ? (isColour && qty === 1 ? t('bundles.freeGiftOxidant')
          : t('bundles.freeNamed', { name: `${qty > 1 ? `${qty}× ` : ''}${optionNames.length === 1 ? optionNames[0] : t('bundles.freeGift')}` }))
        : null,
      ...(tier.gift_ids ?? []).map((id) => (names[id] ? t('bundles.freeNamed', { name: names[id] }) : t('bundles.freeGift'))),
    ].filter(Boolean).join(' + ');
  };
}

/** "12 colours" or "7 pieces". */
export function useDealCount() {
  const { t } = useTranslation();
  return (count: number, isColour = true) => (isColour ? t('bundles.colourCount', { count }) : t('bundles.itemCount', { count }));
}

const asCartProduct = (item: BundleProduct) => ({
  id: item.id, name: item.name, price: item.price, stylistPrice: item.stylistPrice ?? item.price,
  brand: null, category: null, description: '', image: item.image, quantity: 1, inStock: true,
} as unknown as Product);

export default function ColourDealPicker({ bundle, open, onClose }: { bundle: StoreBundle; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const reward = useTierReward();
  const countLabel = useDealCount();
  const { addItem, applyBundle } = useCart();
  const { isProfessional } = useAuth();
  const deal = dealContext(bundle);
  const lines = bundle.familyLines?.length ? bundle.familyLines
    : bundle.familyProductId ? [{ id: bundle.familyId ?? '', name: bundle.familyName ?? '', productId: bundle.familyProductId }] : [];
  const [lineId, setLineId] = useState(lines[0]?.productId ?? '');
  const { data: line, isFetching } = useGetProductByIdQuery(lineId, { skip: !open || !lineId });
  // Picked items across every colour line / listed product: id -> cart product + amount.
  const [picked, setPicked] = useState<Record<string, { product: Product; qty: number }>>({});
  const [search, setSearch] = useState('');
  const listed = bundle.products.filter((item) => item.isBonus === false);
  const gifts = bundle.products.filter((item) => item.isBonus !== false);
  const tiers = bundle.tiers ?? [];
  const stepGiftIds = new Set(tiers.flatMap((tier) => tier.gift_ids ?? []));
  const choiceGifts = gifts.filter((item) => !stepGiftIds.has(item.id));
  const [giftId, setGiftId] = useState<string | null>(choiceGifts[0]?.id ?? null);

  const count = Object.values(picked).reduce((sum, entry) => sum + entry.qty, 0);
  const total = Object.values(picked).reduce((sum, entry) => sum + entry.qty * Number((isProfessional ? entry.product.stylistPrice : entry.product.price) ?? 0), 0);
  const reached = [...tiers].reverse().find((tier) => count >= tier.min) ?? null;
  const next = tiers.find((tier) => count < tier.min) ?? null;
  const top = tiers[tiers.length - 1];

  const shades = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (line?.shades ?? []).filter((shade) => shade.inStock && (!term || `${shade.shadeCode ?? ''} ${shade.shadeName ?? ''} ${shade.name}`.toLowerCase().includes(term)));
  }, [line, search]);
  const groups = groupShades(shades);

  const change = (id: string, value: number, product?: Product) => setPicked((current) => {
    const { [id]: existing, ...rest } = current;
    const item = product ?? existing?.product;
    return value > 0 && item ? { ...rest, [id]: { product: item, qty: Math.min(value, 99) } } : rest;
  });
  // Every shade of a line has the line's price; the cart shows the swatch.
  const shadeProduct = (shade: ProductShade) => ({ ...line, id: shade.id, name: shade.name, image: shade.swatch ?? line?.image, shades: undefined, shadeCode: shade.shadeCode, shadeName: shade.shadeName } as Product);

  const addAll = () => {
    if (count === 0) return;
    Object.values(picked).forEach(({ product, qty }) => addItem(product, qty));
    if (reached?.gift) {
      const gift = choiceGifts.find((item) => item.id === giftId);
      if (gift) addItem(asCartProduct(gift), reached.gift_qty ?? 1);
    }
    (reached?.gift_ids ?? []).forEach((id) => {
      const gift = gifts.find((item) => item.id === id);
      if (gift) addItem(asCartProduct(gift), 1);
    });
    // Only picked offers count in the cart: adding from the picker picks this deal.
    applyBundle(bundle.id);
    message.success(t('bundles.coloursAdded', { count }));
    setPicked({});
    onClose();
  };

  const stepper = (id: string, amount: number, product?: Product) => (
    <span className="colour-deal__qty">
      <Button size="small" type="text" icon={<MinusOutlined />} onClick={() => change(id, amount - 1)} aria-label={t('bundles.removeShade')} disabled={amount === 0} />
      <InputNumber size="small" min={0} max={99} value={amount} onChange={(value) => change(id, Number(value ?? 0), product)} controls={false} style={{ width: 38 }} />
      <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => change(id, amount + 1, product)} aria-label={t('bundles.addShade')} />
    </span>
  );

  const percent = top ? Math.min(100, Math.round((count / top.min) * 100)) : 0;

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={760} title={<span><GiftOutlined /> {bundle.name}</span>} className="colour-deal" destroyOnHidden>
      <div className="colour-deal__steps">
        {tiers.map((tier) => (
          <div key={tier.min} className={`colour-deal__step${count >= tier.min ? ' is-reached' : ''}`}>
            <strong>{countLabel(tier.min, deal.isColour)}</strong>
            <span>{reward(tier, deal)}</span>
          </div>
        ))}
      </div>
      <Progress percent={percent} showInfo={false} strokeColor="#733a49" style={{ margin: '10px 0 2px' }} />
      <Text className="colour-deal__status">
        {next
          ? t('bundles.moreFor', { count: next.min - count, reward: reward(next, deal) })
          : reached ? t('bundles.topReached', { reward: reward(reached, deal) }) : ''}
      </Text>

      {lines.length > 1 && (
        <Segmented block value={lineId} onChange={(value) => setLineId(String(value))} options={lines.map((item) => ({ value: item.productId, label: item.name }))} style={{ marginTop: 14 }} />
      )}
      {lines.length > 0 && (<>
      <Input allowClear prefix={<SearchOutlined />} placeholder={t('bundles.searchShade')} value={search} onChange={(event) => setSearch(event.target.value)} style={{ margin: '14px 0 8px' }} />
      <div className="colour-deal__shades">
        {isFetching && !line ? <Spin /> : !shades.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : groups.map((group) => (
          <section key={group.key}>
            <h5>{t(`product.shadeGroups.${group.key}`)}</h5>
            <div className="colour-deal__grid">
              {group.shades.map((shade) => {
                const amount = picked[shade.id]?.qty ?? 0;
                return (
                  <div key={shade.id} className={`colour-deal__shade${amount ? ' is-picked' : ''}`}>
                    <button type="button" className="colour-deal__swatch" onClick={() => change(shade.id, amount + 1, shadeProduct(shade))} aria-label={`${t('bundles.addShade')} ${shadeLabel(shade)}`} title={[shade.shadeCode, shade.shadeName].filter(Boolean).join(' – ')}>
                      {shade.swatch ? <img src={dotUrl(shade.swatch)} alt="" loading="lazy" onError={(event) => { if (shade.swatch && event.currentTarget.src !== shade.swatch) event.currentTarget.src = shade.swatch; }} /> : null}
                      {amount > 0 && <span className="colour-deal__badge">{amount}</span>}
                    </button>
                    <span className="colour-deal__code">{shadeLabel(shade)}</span>
                    {amount > 0 && stepper(shade.id, amount, shadeProduct(shade))}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      </>)}

      {listed.length > 0 && (
        <div className="colour-deal__list" style={{ display: 'grid', gap: 8, marginTop: 14 }}>
          {listed.map((item) => {
            const amount = picked[item.id]?.qty ?? 0;
            const price = isProfessional ? (item.stylistPrice ?? item.price) : item.price;
            return (
              <div key={item.id} className={`colour-deal__row${amount ? ' is-picked' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {item.image ? <img src={item.image} alt="" width={48} height={48} style={{ objectFit: 'contain' }} loading="lazy" /> : <span style={{ width: 48 }} />}
                <span style={{ flex: 1 }}>{item.name}<br /><Text type="secondary">{formatPrice(price)}</Text></span>
                {stepper(item.id, amount, asCartProduct(item))}
              </div>
            );
          })}
        </div>
      )}

      {choiceGifts.length > 0 && tiers.some((tier) => tier.gift) && (
        <div className="colour-deal__gift">
          <Text strong><GiftOutlined /> {t('bundles.chooseGift')}</Text>
          <Radio.Group value={giftId} onChange={(event) => setGiftId(event.target.value)} className="colour-deal__gift-options">
            {choiceGifts.map((gift) => <Radio.Button key={gift.id} value={gift.id}>{gift.name}</Radio.Button>)}
          </Radio.Group>
          {!reached?.gift && <Text type="secondary" style={{ fontSize: 12 }}>{t('bundles.giftWhenReached')}</Text>}
        </div>
      )}

      <div className="colour-deal__footer">
        <div>
          <Text strong>{countLabel(count, deal.isColour)}</Text>
          {total > 0 && <Text type="secondary"> · {formatPrice(total)}</Text>}
        </div>
        <Button type="primary" size="large" shape="round" icon={<ShoppingCartOutlined />} disabled={count === 0} onClick={addAll}>
          {deal.isColour ? t('bundles.addColours', { count }) : t('product.addToCart')}
        </Button>
      </div>
    </Modal>
  );
}
