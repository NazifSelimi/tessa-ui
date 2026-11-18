import { useState } from 'react';
import { Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, GiftOutlined, PlusOutlined } from '@ant-design/icons';
import { useCreateBundleMutation, useDeleteBundleMutation, useGetAdminBundlesQuery, useUpdateBundleMutation, useGetAllProductsQuery } from '@/features/admin/api';
import type { BundlePromotionType, StoreBundle } from '@/types';
import { extractErrorMessage } from '@/shared/utils/error';
import OfferProfitPanel from '@/components/OfferProfitPanel';
import PricingSettingsCard from '@/components/PricingSettingsCard';

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
  products: Array<{ product_id: string; quantity: number; bonus_quantity?: number }>;
};

export default function AdminBundlesPage() {
  const { data: bundles = [], isLoading } = useGetAdminBundlesQuery();
  const { data: productPage } = useGetAllProductsQuery({ perPage: 1000 });
  const [createBundle] = useCreateBundleMutation();
  const [updateBundle] = useUpdateBundleMutation();
  const [deleteBundle] = useDeleteBundleMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StoreBundle | null>(null);
  const [form] = Form.useForm<BundleForm>();
  const promotionType = Form.useWatch('promotion_type', form);
  const draft = Form.useWatch([], form);

  const products = productPage?.data ?? [];

  /** Normal price of the chosen products (salon prices for a stylist offer), free items not counted. */
  const normalTotal = (values: Partial<BundleForm>) => (values.products ?? []).reduce((sum, line) => {
    const id = line?.product_id ? String(line.product_id) : '';
    // The product list, or (while it is still loading) the prices that came with the bundle.
    const product = products.find((item) => String(item.id) === id) ?? editing?.products.find((item) => String(item.id) === id);
    if (!product) return sum;
    const unit = values.audience === 'stylist' && Number(product.stylistPrice) > 0 ? Number(product.stylistPrice) : Number(product.price ?? 0);
    return sum + unit * Math.max(1, Number(line.quantity ?? 1));
  }, 0);

  /** Change the % and the bundle price fixes itself, and the other way round; new products keep the % (or the fixed price). */
  const syncPrices = (changed: Partial<BundleForm>, all: BundleForm) => {
    const total = normalTotal(all);
    if (total <= 0) return;
    const round = (value: number) => Math.round(value);
    if ('bundle_price' in changed) {
      const price = Number(changed.bundle_price ?? 0);
      if (price > 0) form.setFieldsValue({ discount_percentage: Math.max(0, Math.round((1 - price / total) * 1000) / 10) });
      return;
    }
    if ('discount_percentage' in changed || all.promotion_type === 'percentage') {
      const pct = Number(all.discount_percentage ?? 0);
      if (pct > 0) form.setFieldsValue({ bundle_price: round(total * (1 - pct / 100)) });
      return;
    }
    if (all.promotion_type === 'fixed_price' && Number(all.bundle_price) > 0) {
      form.setFieldsValue({ discount_percentage: Math.max(0, Math.round((1 - Number(all.bundle_price) / total) * 1000) / 10) });
    }
  };
  const total = normalTotal(draft ?? {});
  const productOptions = products.map((product) => ({
    value: String(product.id),
    label: `${product.name} (${Number(product.price).toFixed(0)} / salon ${Number(product.stylistPrice ?? 0).toFixed(0)} MKD)`,
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
      products: bundle.products.map((product) => ({ product_id: product.id, quantity: product.quantity, bonus_quantity: product.bonusQuantity ?? (product.isBonus ? product.quantity : 0) })),
    } : {
      audience: 'all', promotion_type: 'bonus_items', is_active: true, is_featured: false,
      products: [{ quantity: 1, bonus_quantity: 0 }, { quantity: 1, bonus_quantity: 0 }, { quantity: 1, bonus_quantity: 1 }],
    });
    setOpen(true);
    setTimeout(() => syncPrices({}, form.getFieldsValue(true) as BundleForm), 0);
  };

  /** Only the field that defines the offer is saved; the other one is just shown. */
  const cleanPrices = (values: BundleForm): BundleForm => (values.promotion_type === 'percentage'
    ? { ...values, bundle_price: undefined }
    : values.promotion_type === 'fixed_price' ? { ...values, discount_percentage: undefined } : values);

  const submit = async (values: BundleForm) => {
    try {
      if (editing) {
        await updateBundle({ id: editing.id, data: cleanPrices(values) }).unwrap();
      } else {
        await createBundle(cleanPrices(values)).unwrap();
      }
      message.success(editing ? 'Offer updated' : 'Offer created');
      setOpen(false);
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  return (
    <div>
      <Space direction="vertical" size={4} style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Offers & Bundles</Title>
        <Text type="secondary">Create fixed-price sets, percentage savings, or flexible multi-product free-item deals.</Text>
      </Space>
      <PricingSettingsCard />
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

      <Drawer title={editing ? 'Edit offer' : 'Create offer'} width={720} open={open} onClose={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={submit} onValuesChange={syncPrices}>
          <Form.Item name="name" label="Offer name" rules={[{ required: true }]}><Input placeholder="No Yellow salon restock 5+1" /></Form.Item>
          <Form.Item name="description" label="What makes this worthwhile?"><Input.TextArea rows={3} placeholder="Six salon-size shampoos, with one free." /></Form.Item>
          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item name="audience" label="Audience" rules={[{ required: true }]} style={{ flex: 1 }}><Select options={[{ value: 'all', label: 'Everyone' }, { value: 'stylist', label: 'Stylists only' }]} /></Form.Item>
            <Form.Item name="promotion_type" label="Offer rule" rules={[{ required: true }]} style={{ flex: 1 }}><Select options={[{ value: 'bonus_items', label: 'Free included items (2+1 / 5+1)' }, { value: 'percentage', label: 'Percentage off' }, { value: 'fixed_price', label: 'Fixed bundle price' }]} /></Form.Item>
          </Space>
          {(promotionType === 'percentage' || promotionType === 'fixed_price') && (
            <Space style={{ display: 'flex' }} size={12} align="start">
              <Form.Item name="discount_percentage" label="Discount" rules={[{ required: promotionType === 'percentage' }]} style={{ flex: 1 }}><InputNumber min={0} max={100} step={1} style={{ width: '100%' }} addonAfter="%" /></Form.Item>
              <Form.Item name="bundle_price" label="Bundle price" rules={[{ required: promotionType === 'fixed_price' }]} style={{ flex: 1 }}><InputNumber min={0} step={10} style={{ width: '100%' }} addonAfter="MKD" /></Form.Item>
              <Form.Item label="Normal price" style={{ flex: 1 }}><Text strong style={{ lineHeight: '32px' }}>{total > 0 ? `${Math.round(total)} MKD` : '—'}</Text></Form.Item>
            </Space>
          )}
          {(promotionType === 'percentage' || promotionType === 'fixed_price') && <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 16, fontSize: 12 }}>Change either one and the other updates. {promotionType === 'percentage' ? 'The % is saved; the price follows product prices.' : 'The price is saved; the % is shown for posts.'}</Text>}
          <Card size="small" title="Included products" style={{ marginBottom: 16 }}>
            <Form.List name="products">
              {(fields, { add, remove }) => <Space direction="vertical" style={{ width: '100%' }} size={10}>
                {fields.map((field) => <Space key={field.key} align="start" style={{ display: 'flex' }}>
                  <Form.Item {...field} name={[field.name, 'product_id']} rules={[{ required: true }]} style={{ width: 300 }}><Select showSearch optionFilterProp="label" options={productOptions} placeholder="Choose product" /></Form.Item>
                  <Form.Item {...field} name={[field.name, 'quantity']} rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
                  <Form.Item {...field} name={[field.name, 'bonus_quantity']} label="Free qty"><InputNumber min={0} disabled={promotionType !== 'bonus_items'} /></Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                </Space>)}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ quantity: 1, bonus_quantity: 0 })}>Add product</Button>
              </Space>}
            </Form.List>
          </Card>
          <Card size="small" title="What this offer earns" style={{ marginBottom: 16 }}>
            {open && <OfferProfitPanel draft={draft ?? {}} />}
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
