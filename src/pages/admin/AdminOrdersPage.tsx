'use client';

import { useState } from 'react';
import { Typography, Table, Tag, Select, Input, Space, Card, Button, Modal, App } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import type { Order, OrderStatus } from '@/types';
import { useGetAllOrdersQuery, useUpdateOrderStatusMutation } from '@/features/admin/api';
import { useDebounce } from '@/hooks/useDebounce';
import { extractErrorMessage } from '@/shared/utils/error';
import { notifyError } from '@/shared/utils/notify';
import { formatPrice } from '@/shared/utils/formatPrice';
import React from 'react';

const { Title, Text } = Typography;

const _normalizeStatus = (status: any): string => {
  if (typeof status === 'string') return status;
  const map: Record<number, string> = {
    0: 'pending',
    1: 'processing',
    2: 'completed',
    3: 'cancelled',
  };
  return map[status] ?? 'unknown';
};

const statusColors: Record<string, string> = {
  pending: 'orange',
  confirmed: 'blue',
  processing: 'cyan',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrdersPage() {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const debouncedSearch = useDebounce(search, 300);
  
  // Only search if 2+ characters
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;
  
  // RTK Query
  const { data, isLoading } = useGetAllOrdersQuery({
    page: currentPage,
    per_page: 10,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery,
  });
  
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const orders = data?.data ?? [];
  const pagination = data?.meta;

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus({ id: orderId, status: newStatus }).unwrap();
      message.success('Order status updated');
    } catch (error: unknown) {
      notifyError(extractErrorMessage(error));
    }
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <Text strong>{id}</Text>,
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_: unknown, record: Order) => (
        <div>
          <Text>{record.shippingAddress?.fullName ?? '—'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.shippingAddress?.phone ?? '—'}</Text>
        </div>
      ),
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
      title: 'Payment',
      key: 'payment',
      render: () => (
        <Tag color="blue">COD</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus, record: Order) => (
        <Select
          value={status}
          onChange={(val) => handleStatusChange(record.id, val)}
          style={{ width: 130 }}
          size="small"
        >
          {statusOptions.filter(o => o.value !== 'all').map(opt => (
            <Select.Option key={opt.value} value={opt.value}>
              <Tag color={statusColors[opt.value]}>{opt.label}</Tag>
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Order) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => setSelectedOrder(record)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Orders</Title>
          <Text type="secondary">{pagination?.total ?? 0} total orders</Text>
        </div>
        <Space>
          <Input
            placeholder="Search orders (min 2 chars)..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            style={{ width: 140 }}
          />
        </Space>
      </div>

      <Card>
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize: pagination?.per_page ?? 10,
            total: pagination?.total ?? 0,
            onChange: setCurrentPage,
            showSizeChanger: false,
          }}
        />
      </Card>

      <Modal
        title={`Order ${selectedOrder?.id}`}
        open={!!selectedOrder}
        onCancel={() => setSelectedOrder(null)}
        footer={null}
        width={600}
      >
        {selectedOrder && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Customer:</Text> {selectedOrder.shippingAddress?.fullName ?? '—'}
              <br />
              <Text strong>Phone:</Text> {selectedOrder.shippingAddress?.phone ?? '—'}
              <br />
              <Text strong>Address:</Text> {selectedOrder.shippingAddress?.address ?? ''}, {selectedOrder.shippingAddress?.city ?? ''} {selectedOrder.shippingAddress?.zipCode ?? ''}
            </div>
            
            <Table
              dataSource={selectedOrder.items}
              columns={[
                { title: 'Product', dataIndex: 'productName', key: 'product' },
                { title: 'Qty', dataIndex: 'quantity', key: 'qty' },
                { title: 'Total', dataIndex: 'total', key: 'total', render: (v: number) => formatPrice(v) },
              ]}
              rowKey={(r) => `${r.productId}`}
              pagination={false}
              size="small"
            />
            
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Text>Subtotal: {formatPrice(selectedOrder.subtotal ?? 0)}</Text>
              <br />
              {(selectedOrder.discount ?? 0) > 0 && <Text type="success">Discount: -{formatPrice(selectedOrder.discount ?? 0)}</Text>}
              {(selectedOrder.discount ?? 0) > 0 && <br />}
              <Text>Shipping: {(selectedOrder.shipping ?? 0) === 0 ? 'Free' : formatPrice(selectedOrder.shipping ?? 0)}</Text><br />
              <br />
              <Text strong style={{ fontSize: 16 }}>Total: {formatPrice(selectedOrder.total ?? 0)}</Text>
            </div>

            {selectedOrder.customMessage && (
              <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
                <Text strong>Order Notes:</Text>
                <br />
                <Text>{selectedOrder.customMessage}</Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
