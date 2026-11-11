'use client';

import { useState } from 'react';
import { useUrlState } from '@/shared/hooks/useUrlState';
import { useNavigate } from 'react-router-dom';
import { useFeature, useForceDeleteOrderMutation, useRestoreOrderMutation, useTrashOrderMutation } from '@/features/admin/platformApi';
import { Typography, Table, Tag, Select, Input, Space, Card, Modal, App, Button, Segmented, Tooltip } from 'antd';
import { SearchOutlined, DeleteOutlined, UndoOutlined, MailOutlined } from '@ant-design/icons';
import type { Order, OrderStatus } from '@/types';
import { useGetAllOrdersQuery, useUpdateOrderStatusMutation } from '@/features/admin/api';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPrice } from '@/shared/utils/formatPrice';
import MessageButtons from '@/features/messaging/MessageButtons';
import { firstName, ORDER_STATUS_TEMPLATE } from '@/features/messaging/templates';

const { Title, Text } = Typography;

/** Backend-supported statuses only: pending (0), confirmed/paid (1), shipped (2), cancelled (3) */
const statusColors: Record<string, string> = {
  pending: 'orange',
  confirmed: 'blue',
  shipped: 'purple',
  cancelled: 'red',
};

const statusOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrdersPage() {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const canDelete = useFeature('order_delete');
  const emailsOn = useFeature('admin_emails');
  const [view, setView] = useUrlState<'orders' | 'trash'>('view', 'orders', ['orders', 'trash']);
  const [trashOrder] = useTrashOrderMutation();
  const [restoreOrder] = useRestoreOrderMutation();
  const [forceDeleteOrder] = useForceDeleteOrderMutation();
  const [search, setSearch] = useUrlState('search', '');
  const [statusFilter, setStatusFilter] = useUrlState('status', 'all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useUrlState('page', 1);

  const debouncedSearch = useDebounce(search, 300);
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;

  const { data, isLoading } = useGetAllOrdersQuery({
    page: currentPage,
    per_page: 10,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery,
    trashed: view === 'trash' ? 'only' : undefined,
  });

  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const orders = data?.data ?? [];
  const pagination = data?.meta;

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, e: React.MouseEvent) => {
    // Stop propagation so the row click doesn't fire
    e.stopPropagation();
    try {
      await updateOrderStatus({ id: orderId, status: newStatus }).unwrap();
      message.success('Order status updated');
    } catch (error: any) {
      message.error(error?.data?.message || 'Failed to update status');
    }
  };

  const inTrash = view === 'trash';

  const askTrash = (order: Order) => modal.confirm({
    title: `Move order #${order.id} to the Trash?`,
    content: 'It disappears from orders, revenue and referral credit. You can restore it from the Trash any time.',
    okText: 'Move to Trash',
    okButtonProps: { danger: true },
    onOk: async () => {
      await trashOrder(String(order.id)).unwrap();
      setSelectedOrder(null);
      message.success(`Order #${order.id} moved to the Trash`);
    },
  });

  const askForceDelete = (order: Order) => modal.confirm({
    title: `Delete order #${order.id} forever?`,
    content: 'Its products, delivery details and note are erased. This cannot be undone.',
    okText: 'Delete forever',
    okButtonProps: { danger: true },
    onOk: async () => {
      await forceDeleteOrder(String(order.id)).unwrap();
      message.success(`Order #${order.id} deleted forever`);
    },
  });

  const restore = async (order: Order) => {
    await restoreOrder(String(order.id)).unwrap();
    message.success(`Order #${order.id} restored`);
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <Text strong>#{id}</Text>,
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
      render: (items: Order['items']) => !items?.length ? '—' : <Space direction="vertical" size={0}>{items.slice(0, 3).map((item) => <Text key={item.productId} style={{ fontSize: 12 }}>{item.quantity}× {item.productName}<Text type="secondary">{(item.brandName || item.categoryName) ? ` · ${[item.brandName, item.categoryName].filter(Boolean).join(' · ')}` : ''}</Text></Text>)}{items.length > 3 && <Text type="secondary" style={{ fontSize: 12 }}>+{items.length - 3} more</Text>}</Space>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total: number, order: Order) => <Space direction="vertical" size={0}>
        <Text strong>{formatPrice(total)}</Text>
        {order.couponCode && <Tag color={order.referral ? 'magenta' : 'green'} style={{ marginInlineEnd: 0 }}>{order.couponCode}</Tag>}
      </Space>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus, record: Order) => (
        <Select
          value={status}
          onChange={(val) => {
            // Create a synthetic event to stop propagation in the onSelect handler
            handleStatusChange(record.id, val, { stopPropagation: () => {} } as React.MouseEvent);
          }}
          onClick={(e) => e.stopPropagation()}
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
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '—',
    },
    ...(canDelete ? [{
      title: '',
      key: 'trash',
      width: inTrash ? 230 : 56,
      render: (_: unknown, record: Order) => (
        <Space size={4} onClick={(event) => event.stopPropagation()}>
          {inTrash ? (
            <>
              <Button size="small" icon={<UndoOutlined />} onClick={() => restore(record)}>Restore</Button>
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => askForceDelete(record)}>Delete forever</Button>
            </>
          ) : (
            <Tooltip title="Move to Trash">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`Move order ${record.id} to Trash`} onClick={() => askTrash(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    }] : []),
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Orders</Title>
          <Text type="secondary">{pagination?.total ?? 0} {inTrash ? 'in the Trash' : 'total orders'}</Text>
        </div>
        <Space wrap>
          {canDelete && (
            <Segmented
              value={view}
              onChange={(value) => { setView(value as 'orders' | 'trash'); setCurrentPage(1); }}
              options={[{ value: 'orders', label: 'Orders' }, { value: 'trash', label: <span><DeleteOutlined /> Trash</span> }]}
            />
          )}
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
          onRow={(record) => ({
            onClick: () => setSelectedOrder(record),
            style: { cursor: 'pointer' },
          })}
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
        title={`Order #${selectedOrder?.id}`}
        open={!!selectedOrder}
        onCancel={() => setSelectedOrder(null)}
        footer={null}
        width={600}
      >
        {selectedOrder && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Status: </Text>
              <Tag color={statusColors[selectedOrder.status] || 'default'}>
                {(selectedOrder.status || '').toUpperCase()}
              </Tag>
              {selectedOrder.customerRole && (
                <Tag color={selectedOrder.customerRole === 'stylist' ? 'magenta' : 'default'}>
                  {selectedOrder.customerRole === 'stylist'
                    ? 'STYLIST · Pro pricing'
                    : selectedOrder.customerRole === 'guest'
                      ? 'GUEST · Retail pricing'
                      : 'CUSTOMER · Retail pricing'}
                </Tag>
              )}
              <br style={{ marginBottom: 8 }} />
              <Text strong>Customer:</Text> {selectedOrder.shippingAddress?.fullName ?? '—'}
              <br />
              <Text strong>Phone:</Text> {selectedOrder.shippingAddress?.phone ?? '—'}
              {selectedOrder.shippingAddress?.email && (
                <>
                  <br />
                  <Text strong>Email:</Text> {selectedOrder.shippingAddress.email}
                </>
              )}
              <br />
              <Text strong>Address:</Text> {selectedOrder.shippingAddress?.address ?? ''}, {selectedOrder.shippingAddress?.city ?? ''} {selectedOrder.shippingAddress?.zipCode ?? ''}
              {selectedOrder.couponCode && (
                <>
                  <br />
                  <Text strong>Code used:</Text> <Tag color={selectedOrder.referral ? 'magenta' : 'green'}>{selectedOrder.couponCode}</Tag>
                  {selectedOrder.referral && (
                    <Text type="secondary">
                      stylist referral · {selectedOrder.referral.stylistName || 'stylist'} earns {formatPrice(selectedOrder.referral.commission)} credit
                      {selectedOrder.status === 'cancelled' ? ' (cancelled, not earned)' : selectedOrder.status === 'pending' ? ' once you confirm the order' : ''}
                    </Text>
                  )}
                </>
              )}
            </div>

            <Space wrap style={{ marginBottom: 16 }}>
              {emailsOn && selectedOrder.shippingAddress?.email && (
                <Button icon={<MailOutlined />} onClick={() => navigate(`/admin/emails?tab=compose&to=${encodeURIComponent(selectedOrder.shippingAddress.email ?? '')}`)}>
                  Write an email
                </Button>
              )}
              {canDelete && !selectedOrder.deletedAt && (
                <Button danger icon={<DeleteOutlined />} onClick={() => askTrash(selectedOrder)}>Move to Trash</Button>
              )}
            </Space>

            {ORDER_STATUS_TEMPLATE[selectedOrder.status] && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>Message the customer about this status:</Text>
                <MessageButtons
                  phone={selectedOrder.shippingAddress?.phone}
                  templateKey={ORDER_STATUS_TEMPLATE[selectedOrder.status]}
                  vars={{ name: firstName(selectedOrder.shippingAddress?.fullName), order: selectedOrder.id, total: formatPrice(selectedOrder.total) }}
                />
              </div>
            )}

            <Table
              dataSource={selectedOrder.items}
              columns={[
                {
                  title: 'Product',
                  key: 'product',
                  render: (_: unknown, item: Order['items'][number]) => (
                    <div>
                      <div>{item.productName}</div>
                      {(item.brandName || item.categoryName) && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {[item.brandName, item.categoryName].filter(Boolean).join(' · ')}
                        </Text>
                      )}
                    </div>
                  ),
                },
                { title: 'Qty', dataIndex: 'quantity', key: 'qty' },
                { title: 'Price', dataIndex: 'unitPrice', key: 'price', render: (v: number) => formatPrice(v) },
                { title: 'Total', dataIndex: 'total', key: 'total', render: (v: number) => formatPrice(v) },
              ]}
              rowKey={(r) => `${r.productId}`}
              pagination={false}
              size="small"
            />

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Text>Subtotal: {formatPrice(selectedOrder.subtotal ?? 0)}</Text>
              <br />
              {(selectedOrder.discount ?? 0) > 0 && (
                <>
                  <Text type="success">
                    Discount{selectedOrder.couponCode ? ` (${selectedOrder.couponCode})` : ''}: -{formatPrice(selectedOrder.discount ?? 0)}
                  </Text>
                  <br />
                </>
              )}
              <Text>Shipping: {(selectedOrder.shipping ?? 0) > 0 ? formatPrice(selectedOrder.shipping) : 'Free'}</Text>
              <br />
              {(selectedOrder.storeCreditUsed ?? 0) > 0 && (
                <>
                  <Text type="success">Paid with store credit: -{formatPrice(selectedOrder.storeCreditUsed)}</Text>
                  <br />
                </>
              )}
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
