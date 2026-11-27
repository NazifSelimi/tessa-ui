/**
 * ShippingProgress — free-shipping nudge bar.
 *
 * Shows how close the cart is to the free-delivery threshold, or confirms it's
 * unlocked. Uses the shared shipping constants so it always matches checkout.
 * Rendered in the cart drawer and the cart page.
 */

import { Progress, Typography } from 'antd';
import { TruckOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/shared/utils/formatPrice';
import { amountToFreeShipping } from '@/shared/constants/shipping';
import { useShippingSettings } from '@/features/shop/shopSettingsApi';

const { Text } = Typography;

interface ShippingProgressProps {
  subtotal: number;
  /** From the server's price check when there is one (it knows the discounts). */
  remaining?: number;
}

export default function ShippingProgress({ subtotal, remaining: priced }: ShippingProgressProps) {
  const { t } = useTranslation();
  const { freeShippingFrom } = useShippingSettings();
  const remaining = priced ?? amountToFreeShipping(subtotal, freeShippingFrom);
  const unlocked = remaining <= 0;
  const percent = freeShippingFrom > 0
    ? Math.min(100, Math.round(((freeShippingFrom - remaining) / freeShippingFrom) * 100))
    : 100;

  return (
    <div className="shipping-progress">
      <div className="shipping-progress__label">
        <TruckOutlined className="shipping-progress__icon" />
        {unlocked ? (
          <Text strong className="shipping-progress__text shipping-progress__text--done">
            {t('cart.freeShippingUnlocked')}
          </Text>
        ) : (
          <Text className="shipping-progress__text">
            {t('cart.freeShippingRemaining', { amount: formatPrice(remaining) })}
          </Text>
        )}
      </div>
      <Progress
        percent={percent}
        showInfo={false}
        strokeColor={unlocked ? 'var(--color-accent)' : 'var(--color-primary)'}
        size="small"
      />
    </div>
  );
}
