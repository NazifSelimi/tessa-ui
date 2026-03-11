/**
 * Order Detail Page
 * 
 * Shows detailed view of a specific order including items,
 * shipping address, payment info, and order status tracking.
 *
 * Connected to API for real order data.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { 
  Typography, Card, Row, Col, Tag, Button, Steps, Spin, Descriptions, Table, Divider 
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useGetOrderQuery } from '@/features/orders/api';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { Order } from '@/types';

const { Title, Text } = Typography;

const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const statusColors: Record<string, string> = {
  pending: 'orange',
  confirmed: 'blue',
  processing: 'cyan',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading: loading } = useGetOrderQuery(id ?? '', {
    skip: !id,
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Title level={4}>{t('orders.orderNotFound')}</Title>
        <Button onClick={() => navigate('/account/orders')}>{t('orders.backToOrders')}</Button>
      </div>
    );
  }

  const currentStep = order.status === 'cancelled' 
    ? -1 
    : statusSteps.indexOf(order.status);

  const columns = [
    {
      title: t('orders.product'),
      key: 'product',
      render: (_: unknown, record: Order['items'][0]) => (
        <div>
          <Text strong>{record.productName}</Text>
        </div>
      ),
    },
    {
      title: t('orders.price'),
      dataIndex: 'unitPrice',
      key: 'price',
      render: (price: number) => formatPrice(price),
    },
    {
      title: t('orders.quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: t('orders.total'),
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => <Text strong>{formatPrice(total)}</Text>,
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Button 
        type="text" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/account/orders')}
        style={{ marginBottom: 16 }}
      >
        {t('orders.backToOrders')}
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{t('orders.order')} {order.id}</Title>
          <Text type="secondary">
            {t('orders.placedOn')} {new Date(order.createdAt).toLocaleDateString()}
          </Text>
        </div>
        <Tag color={statusColors[typeof order.status === 'string' ? order.status : String(order.status ?? '')]} style={{ fontSize: 14, padding: '4px 12px' }}>
          {(typeof order.status === 'string' ? order.status : String(order.status ?? '')).toUpperCase()}
        </Tag>
      </div>

      {order.status !== 'cancelled' && (
        <Card style={{ marginBottom: 24 }}>
          <Steps
            current={currentStep}
            items={[
              { title: t('orders.pending') },
              { title: t('orders.confirmed') },
              { title: t('orders.processing') },
              { title: t('orders.shipped') },
              { title: t('orders.delivered') },
            ]}
          />
        </Card>
      )}

      <Row gutter={24}>
        <Col xs={24} md={14}>
          <Card title={t('orders.orderItems')} style={{ marginBottom: 24 }}>
            <Table
              dataSource={order.items}
              columns={columns}
              rowKey={(record) => `${record.productId}`}
              pagination={false}
            />
          </Card>

          {order.customMessage && (
            <Card title={t('orders.orderNotes')} style={{ marginBottom: 24 }}>
              <Text>{order.customMessage}</Text>
            </Card>
          )}
        </Col>

        <Col xs={24} md={10}>
          <Card title={t('orders.shippingAddress')} style={{ marginBottom: 24 }}>
            <Text strong>{order.shippingAddress?.fullName ?? '—'}</Text>
            <br />
            <Text>{order.shippingAddress?.phone ?? '—'}</Text>
            <br />
            <Text>
              {order.shippingAddress?.address ?? ''}
              <br />
              {order.shippingAddress?.city ?? ''}, {order.shippingAddress?.state ?? ''} {order.shippingAddress?.zipCode ?? ''}
            </Text>
          </Card>

          <Card title={t('orders.payment')}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t('orders.method')}>
                {order.paymentMethod === 'cod' ? t('orders.cashOnDelivery') : t('orders.onlinePayment')}
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.status')}>
                <Tag color={(typeof order.paymentStatus === 'string' ? order.paymentStatus : String(order.paymentStatus ?? '')) === 'paid' ? 'green' : 'orange'}>
                  {(typeof order.paymentStatus === 'string' ? order.paymentStatus : String(order.paymentStatus ?? '')).toUpperCase()}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>{t('orders.subtotal')}</Text>
              <Text>{formatPrice(order.subtotal ?? 0)}</Text>
            </div>
            {(order.discount ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="success">{t('orders.discount')} {order.couponCode && `(${order.couponCode})`}</Text>
                <Text type="success">-{formatPrice(order.discount ?? 0)}</Text>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>{t('orders.shipping')}</Text>
              <Text>{(order.shipping ?? 0) === 0 ? t('orders.free') : formatPrice(order.shipping ?? 0)}</Text>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 16 }}>{t('orders.total')}</Text>
              <Text strong style={{ fontSize: 18 }}>{formatPrice(order.total ?? 0)}</Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
