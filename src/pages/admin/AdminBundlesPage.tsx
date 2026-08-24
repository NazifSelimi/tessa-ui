import { useState } from 'react';
import { Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { useCreateBundleMutation, useDeleteBundleMutation, useGetAdminBundlesQuery, useUpdateBundleMutation, useGetAllProductsQuery } from '@/features/admin/api';
import type { BundlePromotionType, StoreBundle } from '@/types';

const { Title, Text } = Typography;

type BundleForm = {
  name: string;
  description?: string;
  audience: 'all' | 'stylist';
  promotion_type: BundlePromotionType;
  discount_percentage?: number;
  bundle_price?: number;
  is_active: boolean;
  is_featured: boolean;
  products: Array<{ product_id: string; quantity: number; is_bonus?: boolean }>;
};

export default function AdminBundlesPage() {
  const { data: bundles = [], isLoading } = useGetAdminBundlesQuery();
  const { data: productPage } = useGetAllProductsQuery({ perPage: 100 });
  const [createBundle] = useCreateBundleMutation();
  const [updateBundle] = useUpdateBundleMutation();
  const [deleteBundle] = useDeleteBundleMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StoreBundle | null>(null);
  const [form] = Form.useForm<BundleForm>();
  const promotionType = Form.useWatch('promotion_type', form);

  const products = productPage?.data ?? [];
  const productOptions = products.map((product) => ({
    value: String(product.id),
    label: `${product.name} (${Number(product.price).toFixed(0)} MKD)`,
  }));

  const openEditor = (bundle?: StoreBundle) => {
    setEditing(bundle ?? null);
    form.setFieldsValue(bundle ? {
      name: bundle.name,
      description: bundle.description ?? undefined,
      audience: bundle.audience,
      promotion_type: bundle.promotionType,
      discount_percentage: bundle.discountPercentage ?? undefined,
      bundle_price: bundle.bundlePrice ?? undefined,
      is_active: bundle.isActive,
      is_featured: bundle.isFeatured,
      products: bundle.products.map((product) => ({ product_id: product.id, quantity: product.quantity, is_bonus: product.isBonus })),
    } : {
      audience: 'all', promotion_type: 'bonus_items', is_active: true, is_featured: false,
      products: [{ quantity: 1, is_bonus: false }, { quantity: 1, is_bonus: false }, { quantity: 1, is_bonus: true }],
    });
    setOpen(true);
  };

  const submit = async (values: BundleForm) => {
    try {
      if (editing) {
        await updateBundle({ id: editing.id, data: values }).unwrap();
      } else {
        await createBundle(values).unwrap();
      }
      message.success(editing ? 'Offer updated' : 'Offer created');
      setOpen(false);
    } catch {
      message.error('Could not save the offer. Check its products and pricing.');
    }
  };

  return (
    <div>
      <Space direction="vertical" size={4} style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Offers & Bundles</Title>
        <Text type="secondary">Create fixed-price sets, percentage savings, or flexible multi-product free-item deals.</Text>
      </Space>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()} style={{ marginLeft: 16, marginBottom: 24 }}>
        Create offer
      </Button>

      <Table
        loading={isLoading}
        rowKey="id"
        dataSource={bundles}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Offer', dataIndex: 'name', render: (name: string, row: StoreBundle) => <Space direction="vertical" size={0}><Text strong>{name}</Text><Text type="secondary">{row.products.length} product lines</Text></Space> },
          { title: 'Type', render: (_: unknown, row: StoreBundle) => <Tag color={row.promotionType === 'bonus_items' ? 'gold' : 'blue'}>{row.promotionType.replace('_', ' ')}</Tag> },
          { title: 'Audience', dataIndex: 'audience', render: (audience: string) => <Tag color={audience === 'stylist' ? 'purple' : 'green'}>{audience === 'stylist' ? 'Stylist only' : 'Everyone'}</Tag> },
          { title: 'Status', render: (_: unknown, row: StoreBundle) => row.isActive ? <Tag color="success">Live</Tag> : <Tag>Draft</Tag> },
          { title: '', render: (_: unknown, row: StoreBundle) => <Space><Button onClick={() => openEditor(row)}>Edit</Button><Popconfirm title="Delete this offer?" onConfirm={() => deleteBundle(row.id)}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
        ]}
      />

      <Drawer title={editing ? 'Edit offer' : 'Create offer'} width={560} open={open} onClose={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item name="name" label="Offer name" rules={[{ required: true }]}><Input placeholder="No Yellow salon restock 5+1" /></Form.Item>
          <Form.Item name="description" label="What makes this worthwhile?"><Input.TextArea rows={3} placeholder="Six salon-size shampoos, with one free." /></Form.Item>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="audience" label="Audience" rules={[{ required: true }]} style={{ flex: 1 }}><Select options={[{ value: 'all', label: 'Everyone' }, { value: 'stylist', label: 'Stylists only' }]} /></Form.Item>
            <Form.Item name="promotion_type" label="Offer rule" rules={[{ required: true }]} style={{ flex: 1 }}><Select options={[{ value: 'bonus_items', label: 'Free included items (2+1 / 5+1)' }, { value: 'percentage', label: 'Percentage off' }, { value: 'fixed_price', label: 'Fixed bundle price' }]} /></Form.Item>
          </Space>
          {promotionType === 'percentage' && <Form.Item name="discount_percentage" label="Discount percentage" rules={[{ required: true }]}><InputNumber min={1} max={100} style={{ width: '100%' }} addonAfter="%" /></Form.Item>}
          {promotionType === 'fixed_price' && <Form.Item name="bundle_price" label="Bundle price (MKD)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>}
          <Card size="small" title="Included products" style={{ marginBottom: 16 }}>
            <Form.List name="products">
              {(fields, { add, remove }) => <Space direction="vertical" style={{ width: '100%' }} size={10}>
                {fields.map((field) => <Space key={field.key} align="start" style={{ display: 'flex' }}>
                  <Form.Item {...field} name={[field.name, 'product_id']} rules={[{ required: true }]} style={{ width: 300 }}><Select showSearch optionFilterProp="label" options={productOptions} placeholder="Choose product" /></Form.Item>
                  <Form.Item {...field} name={[field.name, 'quantity']} rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
                  <Form.Item {...field} name={[field.name, 'is_bonus']} valuePropName="checked" label="Free"><Switch disabled={promotionType !== 'bonus_items'} /></Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                </Space>)}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ quantity: 1, is_bonus: false })}>Add product</Button>
              </Space>}
            </Form.List>
          </Card>
          <Space size={24}>
            <Form.Item name="is_active" valuePropName="checked" label="Live now"><Switch /></Form.Item>
            <Form.Item name="is_featured" valuePropName="checked" label="Feature on shop"><Switch /></Form.Item>
          </Space>
          <Button type="primary" htmlType="submit" block size="large" icon={<GiftOutlined />}>Save offer</Button>
        </Form>
      </Drawer>
    </div>
  );
}
