import { useEffect, useState } from 'react';
import { Alert, Card, Col, Descriptions, Row, Skeleton, Tag, Typography } from 'antd';
import { useSimulateBundleMutation, type OfferAudienceResult, type OfferSimulation } from '@/features/admin/api';
import { formatPrice } from '@/shared/utils/formatPrice';

const { Text } = Typography;

type OfferDraft = {
  audience?: 'all' | 'stylist';
  promotion_type?: 'percentage' | 'fixed_price' | 'bonus_items';
  discount_percentage?: number;
  bundle_price?: number;
  products?: Array<{ product_id?: string; quantity?: number; bonus_quantity?: number } | undefined>;
};

function AudienceResult({ title, result }: { title: string; result: OfferAudienceResult }) {
  if (!result.available) {
    return <Card size="small" title={title}><Text type="secondary">Not offered to this group.</Text></Card>;
  }

  const losesMoney = result.profitAfter < 0;
  const noSaving = result.saving <= 0;

  return (
    <Card size="small" title={title}>
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Normal price">{formatPrice(result.regularPrice)}</Descriptions.Item>
        <Descriptions.Item label="Offer price">
          {formatPrice(result.offerPrice)} <Tag>{result.savingPercentage}% off</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Your cost (est.)">{formatPrice(result.cost)}</Descriptions.Item>
        <Descriptions.Item label="Profit">
          {formatPrice(result.profitBefore)} → <Text strong type={result.profitAfter > 0 ? 'success' : 'danger'}>{formatPrice(result.profitAfter)}</Text>
          {result.marginAfterPercentage !== null && <Text type="secondary"> ({result.marginAfterPercentage}%)</Text>}
        </Descriptions.Item>
      </Descriptions>
      {result.unpricedProducts.length > 0 && (
        <Alert type="error" showIcon message={`No price for: ${result.unpricedProducts.join(', ')}`} style={{ marginTop: 8 }} />
      )}
      {noSaving && (
        <Alert type="warning" showIcon message="This offer saves the customer nothing." style={{ marginTop: 8 }} />
      )}
      {!noSaving && result.limitedByProfitFloor && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 8 }}
          message={`Too deep: checkout will only give ${formatPrice(result.appliedSaving)} off`}
          description={`Lowest allowed price is ${formatPrice(result.lowestAllowedPrice)} (cost + minimum profit).`}
        />
      )}
      {losesMoney && <Alert type="error" showIcon message="This offer loses money." style={{ marginTop: 8 }} />}
      {!noSaving && result.salesNeededToMatch !== null && result.salesNeededToMatch > 1 && (
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          You need to sell {result.salesNeededToMatch}× as many to earn the same profit as at the normal price.
        </Text>
      )}
    </Card>
  );
}

/** Live profit of the offer being edited, for retail customers and salons. */
export default function OfferProfitPanel({ draft }: { draft: OfferDraft }) {
  const [simulate, { isLoading }] = useSimulateBundleMutation();
  const [result, setResult] = useState<OfferSimulation | null>(null);

  const products = (draft.products ?? []).filter(
    (row): row is { product_id: string; quantity: number; bonus_quantity?: number } => Boolean(row?.product_id && row.quantity),
  );
  const key = JSON.stringify([draft.audience, draft.promotion_type, draft.discount_percentage, draft.bundle_price, products]);

  useEffect(() => {
    if (!draft.promotion_type || products.length === 0) {
      setResult(null);
      return;
    }
    const timer = window.setTimeout(() => {
      simulate({
        audience: draft.audience,
        promotion_type: draft.promotion_type,
        discount_percentage: draft.discount_percentage,
        bundle_price: draft.bundle_price,
        products,
      }).unwrap().then(setResult).catch(() => setResult(null));
    }, 400);
    return () => window.clearTimeout(timer);
    // `key` covers every input the calculation depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, simulate]);

  if (products.length === 0) {
    return <Text type="secondary">Add products to see what this offer earns.</Text>;
  }
  if (!result) {
    return isLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : null;
  }

  return (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        Cost is the product's real cost when set, otherwise {result.settings.costPercentage}% of retail. Minimum profit {result.settings.minMarginPercentage}%.
      </Text>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}><AudienceResult title="Retail customers" result={result.retail} /></Col>
        <Col xs={24} md={12}><AudienceResult title="Salons" result={result.salon} /></Col>
      </Row>
    </div>
  );
}
