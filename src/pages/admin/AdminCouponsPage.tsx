'use client';

import { useState } from 'react';
import { 
  Typography, Table, Tag, Input, Space, Card, Button, Modal, Form, 
  InputNumber, Select, DatePicker, Popconfirm, App
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { 
  useGetAllCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
} from '@/features/admin/api';
import { useDebounce } from '@/hooks/useDebounce';
import { extractErrorMessage } from '@/shared/utils/error';
import { notifyError } from '@/shared/utils/notify';
import { formatPrice } from '@/shared/utils/formatPrice';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  quantity: number;
  expirationDate?: string;
  isValid?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const statusColors: Record<string, string> = {
  valid: 'green',
  expired: 'red',
};

export default function AdminCouponsPage() {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form] = Form.useForm();
  const perPage = 20;

  const debouncedSearch = useDebounce(search, 300);

  // Only search if 2+ characters
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;

  const { data, isLoading } = useGetAllCouponsQuery({
    page,
    per_page: perPage,
    search: searchQuery,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: isUpdating }] = useUpdateCouponMutation();
  const [deleteCoupon] = useDeleteCouponMutation();

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        code: values.code.toUpperCase(),
        type: values.type,
        value: values.value,
        quantity: values.quantity,
        expiration_date: values.expirationDate ? values.expirationDate.format('YYYY-MM-DD') : undefined,
      };

      if (editingCoupon) {
        await updateCoupon({ id: editingCoupon.id, data: payload }).unwrap();
        message.success('Coupon updated successfully');
      } else {
        await createCoupon(payload).unwrap();
        message.success('Coupon created successfully');
      }
      
      setModalOpen(false);
      setEditingCoupon(null);
      form.resetFields();
    } catch (error: unknown) {
      notifyError(extractErrorMessage(error));
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    form.setFieldsValue({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      quantity: coupon.quantity,
      expirationDate: coupon.expirationDate ? dayjs(coupon.expirationDate) : null,
    });
    setModalOpen(true);
  };

  const handleDelete = async (couponId: string) => {
    try {
      await deleteCoupon(couponId).unwrap();
      message.success('Coupon deleted');
    } catch (error: unknown) {
      notifyError(extractErrorMessage(error));
    }
  };

  const getStatus = (coupon: Coupon): 'valid' | 'expired' => {
    return coupon.isValid ? 'valid' : 'expired';
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Text strong copyable>{code}</Text>,
    },
    {
      title: 'Discount',
      key: 'discount',
      render: (_: unknown, record: Coupon) => (
        <Text>
          {record.type === 'percentage' ? `${record.value}%` : formatPrice(record.value)} off
        </Text>
      ),
    },
    {
      title: 'Remaining',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number) => <Text>{qty}</Text>,
    },
    {
      title: 'Expires',
      dataIndex: 'expirationDate',
      key: 'expirationDate',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'No expiry',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, record: Coupon) => {
        const status = getStatus(record);
        return <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Coupon) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete coupon?"
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Coupons</Title>
          <Text type="secondary">{data?.meta?.total || 0} coupons</Text>
        </div>
        <Space>
          <Input
            placeholder="Search codes..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 180 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
          >
            <Select.Option value="all">All Status</Select.Option>
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="expired">Expired</Select.Option>
          </Select>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCoupon(null);
              form.resetFields();
              setModalOpen(true);
            }}
          >
            Create Coupon
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: perPage,
            total: data?.meta?.total || 0,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} coupons`,
          }}
        />
      </Card>

      <Modal
        title={editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setModalOpen(false);
          setEditingCoupon(null);
          form.resetFields();
        }}
        confirmLoading={isCreating || isUpdating}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="Coupon Code"
            rules={[
              { required: true, message: 'Code is required' },
              { pattern: /^[A-Z0-9-]+$/i, message: 'Only letters, numbers and hyphens allowed' },
            ]}
          >
            <Input placeholder="e.g., SUMMER20" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          
          <Space size="middle" style={{ display: 'flex' }}>
            <Form.Item name="type" label="Type" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Select type">
                <Select.Option value="percentage">Percentage (%)</Select.Option>
                <Select.Option value="fixed">Fixed Amount (MKD)</Select.Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="value" label="Value" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="10" />
            </Form.Item>
          </Space>
          
          <Form.Item
            name="quantity"
            label="Total Quantity"
            rules={[{ required: true, message: 'Quantity is required' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="100" />
          </Form.Item>
          
          <Form.Item
            name="expirationDate"
            label="Expiration Date"
            rules={[{ required: true, message: 'Expiration date is required' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
