/**
 * The offers in this cart, as the server priced them: only offers the
 * customer picked give a discount.
 * - "Offer used: <name> −<saving>" with a remove (x) button.
 * - "Add <missing> to use <offer>" while a picked offer's products are not all in the cart.
 * - A picked offer replaced by a later pick (they share products) is removed, with a notice.
 * - The cart matches an offer that was not picked: "Use offer X and save Y?" [Use offer] [No thanks].
 * Used by the cart page and checkout.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { App, Button, Modal, Typography, message as staticMessage } from 'antd';
import { CloseOutlined, GiftOutlined } from '@ant-design/icons';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { CartQuote } from '@/features/orders/api';

const { Text } = Typography;

type Quote = Pick<CartQuote, 'offersUsed' | 'skippedBundles' | 'replacedBundles' | 'suggestedOffers'>;

export default function CartOffers({ quote, askToUse = true }: { quote?: Quote | null; askToUse?: boolean }) {
  const { t } = useTranslation();
  const message = App.useApp().message ?? staticMessage;
  const { bundleIds = [], declinedBundleIds = [], applyBundle, removeBundle, declineBundle } = useCart();
  const told = useRef(new Set<string>());

  // A later pick took this offer's products: drop it from the cart and say so.
  useEffect(() => {
    (quote?.replacedBundles ?? []).forEach((replaced) => {
      if (!bundleIds.includes(replaced.bundleId)) return;
      removeBundle(replaced.bundleId);
      const key = `${replaced.bundleId}>${replaced.byBundleId}`;
      if (told.current.has(key)) return;
      told.current.add(key);
      message.info(t('bundles.offerReplaced', { old: replaced.name, new: replaced.byName ?? '' }), 6);
    });
  }, [bundleIds, message, quote?.replacedBundles, removeBundle, t]);

  const used = quote?.offersUsed ?? [];
  const waiting = (quote?.skippedBundles ?? []).filter((skipped) => bundleIds.includes(skipped.bundleId) && skipped.missing?.length);
  const suggestion = askToUse
    ? (quote?.suggestedOffers ?? []).find((offer) => !declinedBundleIds.includes(offer.bundleId) && !bundleIds.includes(offer.bundleId))
    : undefined;

  const missingText = (missing: NonNullable<Quote['skippedBundles'][number]['missing']>) =>
    missing.map((item) => (item.qty > 1 ? `${item.qty}× ${item.name}` : item.name)).join(', ');

  if (!used.length && !waiting.length && !suggestion) return null;

  return (
    <div className="cart-offers" style={{ display: 'grid', gap: 8, marginBottom: 'var(--spacing-md)' }}>
      {used.map((offer) => (
        <div key={offer.bundleId} className="cart-offers__used" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GiftOutlined style={{ color: 'var(--color-success)' }} />
          <Text style={{ flex: 1 }}>
            {t('bundles.offerUsed', { name: offer.name })}{' '}
            <Text strong style={{ color: 'var(--color-success)' }}>−{formatPrice(offer.saving)}</Text>
          </Text>
          <Button
            type="text" size="small" icon={<CloseOutlined />}
            aria-label={t('bundles.removeOffer', { name: offer.name })}
            onClick={() => { removeBundle(offer.bundleId); declineBundle(offer.bundleId); }}
          />
        </div>
      ))}

      {waiting.map((skipped) => (
        <div key={skipped.bundleId} className="cart-offers__waiting" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="warning" style={{ flex: 1 }}>
            {t('bundles.addToUse', { missing: missingText(skipped.missing ?? []), name: skipped.name ?? '' })}
          </Text>
          <Button
            type="text" size="small" icon={<CloseOutlined />}
            aria-label={t('bundles.removeOffer', { name: skipped.name ?? '' })}
            onClick={() => { removeBundle(skipped.bundleId); declineBundle(skipped.bundleId); }}
          />
        </div>
      ))}

      <Modal
        open={Boolean(suggestion)}
        title={suggestion ? t('bundles.useOfferTitle', { name: suggestion.name, saving: formatPrice(suggestion.saving) }) : ''}
        closable={false}
        maskClosable={false}
        keyboard={false}
        footer={suggestion ? [
          <Button key="no" onClick={() => declineBundle(suggestion.bundleId)}>{t('bundles.noThanks')}</Button>,
          <Button key="yes" type="primary" onClick={() => applyBundle(suggestion.bundleId)}>{t('bundles.useOffer')}</Button>,
        ] : null}
      >
        {suggestion?.replaces?.length
          ? <Text type="secondary">{t('bundles.useOfferReplaces', { names: suggestion.replaces.join(', ') })}</Text>
          : null}
      </Modal>
    </div>
  );
}
