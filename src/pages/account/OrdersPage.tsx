'use client';

import { Link, useNavigate } from 'react-router-dom';
import { Typography, Table, Tag, Button, Space, Spin, Empty, Card, Alert, Grid } from 'antd';
import { EyeOutlined, RightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useGetOrdersQuery } from '@/features/orders/api';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { Order } from '@/types';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const statusColors: Record<string, string> = {
  pending: 'orange',
  confirmed: 'blue',
  processing: 'cyan',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { data: ordersData, isLoading, error } = useGetOrdersQuery();
  const orders = ordersData?.data || [];
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <Text strong>{id}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items: Order['items']) => `${items?.length ?? 0} item(s)`,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => <Text strong>{formatPrice(total)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: any) => {
        const s = typeof status === 'string' ? status : String(status ?? '');
        return (
          <Tag color={statusColors[s] || 'default'}>
            {s.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status: any) => {
        const s = typeof status === 'string' ? status : String(status ?? '');
        return (
          <Tag color={s === 'paid' ? 'green' : 'orange'}>
            {s.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Order) => (
        <Link to={`/account/orders/${record.id}`}>
          <Button type="text" icon={<EyeOutlined />}>
            View
          </Button>
        </Link>
      ),
    },
  ];

  /* Mobile card for a single order */
  const OrderCard = ({ order }: { order: Order }) => {
    const s = typeof order.status === 'string' ? order.status : String(order.status ?? '');
    const ps = typeof order.paymentStatus === 'string' ? order.paymentStatus : String(order.paymentStatus ?? '');
    return (
      <Link to={`/account/orders/${order.id}`}>
        <Card
          size="small"
          hoverable
          style={{ marginBottom: 12, borderRadius: 12 }}
          styles={{ body: { padding: '14px 16px' } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 15 }}>Order #{order.id}</Text>
            <RightOutlined style={{ color: '#999', fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {new Date(order.createdAt).toLocaleDateString()} · {order.items?.length ?? 0} item(s)
            </Text>
            <Text strong style={{ fontSize: 15 }}>{formatPrice(order.total)}</Text>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Tag color={statusColors[s] || 'default'} style={{ margin: 0 }}>
              {s.toUpperCase()}
            </Tag>
            <Tag color={ps === 'paid' ? 'green' : 'orange'} style={{ margin: 0 }}>
              {ps.toUpperCase()}
            </Tag>
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ marginBottom: 8, padding: '4px 0' }}
          >
            Back
          </Button>
          <Title level={2}>My Orders</Title>
          <Text type="secondary">View and track your order history</Text>
        </div>

        {error && (
          <Alert
            message="Error loading orders"
            description="Failed to load your orders. Please try again later."
            type="error"
            showIcon
            closable
          />
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <Empty description="No orders yet">
              <Link to="/">
                <Button type="primary">Start Shopping</Button>
              </Link>
            </Empty>
          </Card>
        ) : isMobile ? (
          /* Mobile: Card-based layout */
          <div>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          /* Desktop: Table layout */
          <Table
            dataSource={orders}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Space>
    </div>
  );
}
