/**
 * Customer profile for the admin Customers page: contact buttons, what they
 * bought, the admin's private notes and tags.
 */

import { useState } from 'react';
import { Alert, App, Button, Descriptions, Drawer, Empty, Input, Select, Skeleton, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import { MailOutlined, PhoneOutlined, SaveOutlined } from '@ant-design/icons';
import SendMessageButtons from './SendMessageButtons';
import { useGetCustomerQuery, useUpdateCustomerNotesMutation, type CustomerOrder, type CustomerProfile } from './customersApi';
import { customerTypeColor, customerTypeLabel, formatDate, formatMkd, orderStatusColor } from './customerFormat';

const { Text } = Typography;

interface CustomerDrawerProps {
  customerKey: string | null;
  knownTags: string[];
  onClose: () => void;
}

export default function CustomerDrawer({ customerKey, knownTags, onClose }: CustomerDrawerProps) {
  const { data: customer, isFetching, error } = useGetCustomerQuery(customerKey ?? '', { skip: !customerKey });

  const shown = customer && customer.key === customerKey ? customer : null;

  return (
    <Drawer
      open={!!customerKey}
      onClose={onClose}
      size="large"
      title={shown ? (shown.name || shown.email || shown.phone || 'Customer') : 'Customer'}
      extra={shown && <Tag color={customerTypeColor[shown.type]}>{customerTypeLabel[shown.type]}</Tag>}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon message="Could not load this customer." />}
      {!shown && !error && <Skeleton active />}
      {shown && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            {shown.email ? (
              <Button icon={<MailOutlined />} href={`mailto:${shown.email}`}>Email</Button>
            ) : (
              <Tooltip title="No email address"><Button icon={<MailOutlined />} disabled>Email</Button></Tooltip>
            )}
            {shown.phone ? (
              <Button icon={<PhoneOutlined />} href={`tel:${shown.phone.replace(/[^\d+]/g, '')}`}>Call</Button>
            ) : (
              <Tooltip title="No phone number"><Button icon={<PhoneOutlined />} disabled>Call</Button></Tooltip>
            )}
            <SendMessageButtons phone={shown.phone} template={{ kind: 'customerCheckIn', name: shown.name }} size="middle" />
          </Space>

          <Space size="large" wrap>
            <Statistic title="Total spent" value={formatMkd(shown.totalSpent)} />
            <Statistic title="Orders" value={shown.ordersCount} suffix={shown.cancelledCount ? <Text type="secondary" style={{ fontSize: 13 }}>+{shown.cancelledCount} cancelled</Text> : undefined} />
            <Statistic title="Average order" value={formatMkd(shown.averageOrder)} />
            <Statistic title="Last order" value={shown.daysSinceLastOrder === null ? '—' : shown.daysSinceLastOrder === 0 ? 'Today' : `${shown.daysSinceLastOrder} days ago`} />
          </Space>

          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Email">{shown.email ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Phone">{shown.phone ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="City">{shown.city ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="First order">{formatDate(shown.firstOrderAt)}</Descriptions.Item>
            {shown.registered && <Descriptions.Item label="Account since">{formatDate(shown.joinedAt)}</Descriptions.Item>}
            {shown.registered && <Descriptions.Item label="Store credit">{formatMkd(shown.storeCredit)}</Descriptions.Item>}
          </Descriptions>

          <NotesEditor key={shown.key} customer={shown} knownTags={knownTags} />

          {shown.favouriteProducts.length > 0 && (
            <div>
              <Text strong>Buys most</Text>
              <div style={{ marginTop: 6 }}>
                {shown.favouriteProducts.map((product) => (
                  <Tag key={product.productId} style={{ marginBottom: 4 }}>{product.name} × {product.quantity}</Tag>
                ))}
              </div>
            </div>
          )}

          <div>
            <Text strong>Orders</Text>
            <Table<CustomerOrder>
              style={{ marginTop: 6 }}
              size="small"
              rowKey="id"
              loading={isFetching}
              dataSource={shown.orders}
              pagination={shown.orders.length > 10 ? { pageSize: 10, size: 'small' } : false}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No orders yet" /> }}
              expandable={{
                expandedRowRender: (order) => (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {order.items.map((item, index) => (
                      <li key={`${item.productId}-${index}`}>{item.name} × {item.quantity} — {formatMkd(item.price)}</li>
                    ))}
                  </ul>
                ),
                rowExpandable: (order) => order.items.length > 0,
              }}
              columns={[
                { title: '#', dataIndex: 'id', width: 70 },
                { title: 'Date', dataIndex: 'createdAt', render: formatDate },
                { title: 'Status', dataIndex: 'status', render: (status: CustomerOrder['status']) => <Tag color={orderStatusColor[status]}>{status}</Tag> },
                { title: 'Items', dataIndex: 'itemsCount', align: 'right' },
                { title: 'Total', dataIndex: 'total', align: 'right', render: formatMkd },
              ]}
            />
          </div>
        </Space>
      )}
    </Drawer>
  );
}

/** Notes and tags form; keyed by customer so it starts from their saved values. */
function NotesEditor({ customer, knownTags }: { customer: CustomerProfile; knownTags: string[] }) {
  const { message } = App.useApp();
  const [saveNotes, { isLoading: saving }] = useUpdateCustomerNotesMutation();
  const [notes, setNotes] = useState(customer.notes ?? '');
  const [tags, setTags] = useState<string[]>(customer.tags);
  const dirty = notes !== (customer.notes ?? '') || tags.join('\n') !== customer.tags.join('\n');

  const save = async () => {
    try {
      await saveNotes({ key: customer.key, notes: notes.trim() || null, tags }).unwrap();
      message.success('Notes and tags saved');
    } catch {
      message.error('Could not save. Please try again.');
    }
  };

  return (
    <div>
      <Text strong>Tags</Text>
      <Select
        mode="tags"
        value={tags}
        onChange={(value: string[]) => setTags(value.map((tag) => tag.trim()).filter(Boolean).slice(0, 20))}
        options={knownTags.map((tag) => ({ value: tag, label: tag }))}
        placeholder="e.g. VIP, Salon, Wholesale"
        style={{ width: '100%', marginTop: 6 }}
        tokenSeparators={[',']}
        maxTagTextLength={40}
        aria-label="Tags"
      />
      <Text strong style={{ display: 'block', marginTop: 12 }}>Private notes</Text>
      <Input.TextArea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        autoSize={{ minRows: 3, maxRows: 8 }}
        maxLength={5000}
        placeholder="Only admins see this. E.g. hair type, favourite brand, salon name, best time to call."
        style={{ marginTop: 6 }}
        aria-label="Private notes"
      />
      <Button type="primary" icon={<SaveOutlined />} onClick={save} loading={saving} disabled={!dirty} style={{ marginTop: 8 }}>
        Save notes & tags
      </Button>
    </div>
  );
}
