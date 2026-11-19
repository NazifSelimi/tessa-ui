/**
 * "Pick any colours" offer: the stylist chooses any shades of the colour line
 * and how many of each, sees how far they are from the next reward step
 * (e.g. 10 colours → free oxidant, 30 → 3 free colours + oxidant), picks the
 * gift, and adds everything to the cart. The cart and checkout apply the
 * reward by themselves (server pricing).
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Empty, Input, InputNumber, Modal, Progress, Radio, Spin, Typography, message } from 'antd';
import { GiftOutlined, MinusOutlined, PlusOutlined, SearchOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useGetProductByIdQuery } from '@/features/products/api';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { groupShades } from '@/shared/utils/shadeGroups';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { BundleTier, Product, ProductShade, StoreBundle } from '@/types';

const { Text } = Typography;

/** Generated swatches have a round-dot texture next to the ribbon image ({id}.jpg -> {id}-dot.jpg). */
const dotUrl = (swatch: string) => swatch.replace(/(\/swatches\/silk[\w-]*\/\d+)\.jpg$/, '$1-dot.jpg');
const shadeLabel = (shade: ProductShade) => shade.shadeCode || shade.shadeName || shade.name;

/** "3 free colours + free oxidant" for a step. */
export function useTierReward() {
  const { t } = useTranslation();
  return (tier: BundleTier) => [
    tier.free > 0 ? t('bundles.freeColours', { count: tier.free }) : null,
    tier.gift ? t('bundles.freeGiftOxidant') : null,
  ].filter(Boolean).join(' + ');
}

export default function ColourDealPicker({ bundle, open, onClose }: { bundle: StoreBundle; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const reward = useTierReward();
  const { addItem } = useCart();
  const { isProfessional } = useAuth();
  const { data: line, isFetching } = useGetProductByIdQuery(bundle.familyProductId ?? '', { skip: !open || !bundle.familyProductId });
  const [qty, setQty] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const gifts = bundle.products;
  const [giftId, setGiftId] = useState<string | null>(gifts[0]?.id ?? null);

  const tiers = bundle.tiers ?? [];
  const count = Object.values(qty).reduce((sum, value) => sum + value, 0);
  const reached = [...tiers].reverse().find((tier) => count >= tier.min) ?? null;
  const next = tiers.find((tier) => count < tier.min) ?? null;
  const top = tiers[tiers.length - 1];
  const unit = Number((isProfessional ? line?.stylistPrice : line?.price) ?? 0);

  const shades = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (line?.shades ?? []).filter((shade) => shade.inStock && (!term || `${shade.shadeCode ?? ''} ${shade.shadeName ?? ''} ${shade.name}`.toLowerCase().includes(term)));
  }, [line, search]);
  const groups = groupShades(shades);

  const change = (id: string, value: number) => setQty((current) => {
    const { [id]: _removed, ...rest } = current;
    return value > 0 ? { ...rest, [id]: Math.min(value, 99) } : rest;
  });

  const addAll = () => {
    if (!line || count === 0) return;
    const byId = new Map((line.shades ?? []).map((shade) => [shade.id, shade]));
    Object.entries(qty).forEach(([id, amount]) => {
      const shade = byId.get(id);
      if (!shade) return;
      // Every shade of a line has the line's price; the cart shows the swatch.
      addItem({ ...line, id, name: shade.name, image: shade.swatch ?? line.image, shades: undefined, shadeCode: shade.shadeCode, shadeName: shade.shadeName } as Product, amount);
    });
    const gift = gifts.find((item) => item.id === giftId);
    if (gift && reached?.gift) {
      addItem({
        id: gift.id, name: gift.name, price: gift.price, stylistPrice: gift.stylistPrice ?? gift.price,
        brand: null, category: null, description: '', image: gift.image, quantity: 1, inStock: true,
      } as unknown as Product, 1);
    }
    message.success(t('bundles.coloursAdded', { count }));
    setQty({});
    onClose();
  };

  const percent = top ? Math.min(100, Math.round((count / top.min) * 100)) : 0;

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={760} title={<span><GiftOutlined /> {bundle.name}</span>} className="colour-deal" destroyOnHidden>
      <div className="colour-deal__steps">
        {tiers.map((tier) => (
          <div key={tier.min} className={`colour-deal__step${count >= tier.min ? ' is-reached' : ''}`}>
            <strong>{t('bundles.colourCount', { count: tier.min })}</strong>
            <span>{reward(tier)}</span>
          </div>
        ))}
      </div>
      <Progress percent={percent} showInfo={false} strokeColor="#733a49" style={{ margin: '10px 0 2px' }} />
      <Text className="colour-deal__status">
        {next
          ? t('bundles.moreFor', { count: next.min - count, reward: reward(next) })
          : reached ? t('bundles.topReached', { reward: reward(reached) }) : ''}
      </Text>

      <Input allowClear prefix={<SearchOutlined />} placeholder={t('bundles.searchShade')} value={search} onChange={(event) => setSearch(event.target.value)} style={{ margin: '14px 0 8px' }} />
      <div className="colour-deal__shades">
        {isFetching && !line ? <Spin /> : !shades.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : groups.map((group) => (
          <section key={group.key}>
            <h5>{t(`product.shadeGroups.${group.key}`)}</h5>
            <div className="colour-deal__grid">
              {group.shades.map((shade) => {
                const amount = qty[shade.id] ?? 0;
                return (
                  <div key={shade.id} className={`colour-deal__shade${amount ? ' is-picked' : ''}`}>
                    <button type="button" className="colour-deal__swatch" onClick={() => change(shade.id, amount + 1)} aria-label={`${t('bundles.addShade')} ${shadeLabel(shade)}`} title={[shade.shadeCode, shade.shadeName].filter(Boolean).join(' – ')}>
                      {shade.swatch ? <img src={dotUrl(shade.swatch)} alt="" loading="lazy" onError={(event) => { if (shade.swatch && event.currentTarget.src !== shade.swatch) event.currentTarget.src = shade.swatch; }} /> : null}
                      {amount > 0 && <span className="colour-deal__badge">{amount}</span>}
                    </button>
                    <span className="colour-deal__code">{shadeLabel(shade)}</span>
                    {amount > 0 && (
                      <span className="colour-deal__qty">
                        <Button size="small" type="text" icon={<MinusOutlined />} onClick={() => change(shade.id, amount - 1)} aria-label={t('bundles.removeShade')} />
                        <InputNumber size="small" min={0} max={99} value={amount} onChange={(value) => change(shade.id, Number(value ?? 0))} controls={false} style={{ width: 38 }} />
                        <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => change(shade.id, amount + 1)} aria-label={t('bundles.addShade')} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {gifts.length > 0 && tiers.some((tier) => tier.gift) && (
        <div className="colour-deal__gift">
          <Text strong><GiftOutlined /> {t('bundles.chooseGift')}</Text>
          <Radio.Group value={giftId} onChange={(event) => setGiftId(event.target.value)} className="colour-deal__gift-options">
            {gifts.map((gift) => <Radio.Button key={gift.id} value={gift.id}>{gift.name}</Radio.Button>)}
          </Radio.Group>
          {!reached?.gift && <Text type="secondary" style={{ fontSize: 12 }}>{t('bundles.giftWhenReached')}</Text>}
        </div>
      )}

      <div className="colour-deal__footer">
        <div>
          <Text strong>{t('bundles.colourCount', { count })}</Text>
          {unit > 0 && <Text type="secondary"> · {formatPrice(unit * count)}</Text>}
        </div>
        <Button type="primary" size="large" shape="round" icon={<ShoppingCartOutlined />} disabled={count === 0} onClick={addAll}>
          {t('bundles.addColours', { count })}
        </Button>
      </div>
    </Modal>
  );
}
