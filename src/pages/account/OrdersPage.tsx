'use client';

import { Link } from 'react-router-dom';
import { Typography, Table, Tag, Button, Space, Spin, Empty, Card, Alert } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useGetOrdersQuery } from '@/features/orders/api';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { Order } from '@/types';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  pending: 'orange',
  confirmed: 'blue',
  processing: 'cyan',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

export default function OrdersPage() {
  const { data: ordersData, isLoading, error } = useGetOrdersQuery();
  const orders = ordersData?.data || [];

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

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
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
        ) : (
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
