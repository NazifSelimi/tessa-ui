/**
 * Price Display Component
 * 
 * Role-aware price display that shows:
 * - Retail price for guests/users
 * - Stylist price for stylists (with crossed retail)
 * - Both prices for distributors and admins
 */

import { Typography, Space } from 'antd';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { Product } from '@/types';

const { Text } = Typography;

interface PriceDisplayProps {
  product: Product;
  showBothPrices?: boolean;
  large?: boolean;
  showSavings?: boolean;
}

export default function PriceDisplay({ 
  product, 
  showBothPrices = false, 
  large = false,
  showSavings = false,
}: PriceDisplayProps) {
  const { isProfessional, isAdmin, isDistributor } = useAuth();
  
  const primaryFontSize = large ? 'var(--font-size-2xl)' : 'var(--font-size-lg)';
  const secondaryFontSize = large ? 'var(--font-size-lg)' : 'var(--font-size-xs)';

  // Calculate savings percentage
  const retailPrice = Number(product.price ?? 0);
  const stylistPrice = Number(product.stylistPrice ?? 0);
  const savingsPercent = retailPrice > 0
    ? Math.round(((retailPrice - stylistPrice) / retailPrice) * 100)
    : 0;

  // Distributor and admin always see both prices
  if (showBothPrices || isDistributor || isAdmin) {
    return (
      <div className="price-display">
        <Text style={{ fontSize: secondaryFontSize }} type="secondary">
          Retail: {formatPrice(retailPrice)}
        </Text>
        <Space size={8} align="baseline">
          <Text 
            className="price-display__current price-display__current--stylist"
            style={{ fontSize: primaryFontSize }}
          >
            {formatPrice(stylistPrice)}
          </Text>
          {showSavings && savingsPercent > 0 && (
            <span className="price-display__savings">
              Save {savingsPercent}%
            </span>
          )}
        </Space>
        <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
          Stylist Price
        </Text>
      </div>
    );
  }

  // Stylist sees stylist price with crossed out retail
  if (isProfessional) {
    return (
      <div className="price-display price-display--inline">
        <Text className="price-display__original" style={{ fontSize: secondaryFontSize }}>
          {formatPrice(retailPrice)}
        </Text>
        <Text 
          className="price-display__current price-display__current--stylist"
          style={{ fontSize: primaryFontSize }}
        >
          {formatPrice(stylistPrice)}
        </Text>
        {showSavings && savingsPercent > 0 && (
          <span className="price-display__savings">
            -{savingsPercent}%
          </span>
        )}
      </div>
    );
  }

  // Guest/User sees retail price only
  return (
    <Text 
      className="price-display__current"
      style={{ fontSize: primaryFontSize }}
    >
      {formatPrice(retailPrice)}
    </Text>
  );
}

export { formatPrice } from '@/shared/utils/formatPrice';
