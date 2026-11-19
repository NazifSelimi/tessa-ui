/**
 * Admin → Offers & Bundles: every offer in one list with search and filters,
 * quick switches (live, featured), who sees it (everyone / salons / shoppers),
 * start and end dates, its shop picture, duplicate and delete, and bulk
 * changes for many offers at once.
 */
import { useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  App, Button, Card, DatePicker, Drawer, Dropdown, Form, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Space, Switch, Table, Tag, Tooltip, Typography,
} from 'antd';
import { CopyOutlined, DeleteOutlined, DownOutlined, EditOutlined, GiftOutlined, PlusOutlined, SearchOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import {
  useBulkBundlesMutation, useCreateBundleMutation, useDeleteBundleMutation, useGetAdminBundlesQuery, useGetAllProductsQuery, useUpdateBundleMutation,
  type BundleBulkAction,
} from '@/features/admin/api';
import type { BundleAudience, BundlePromotionType, StoreBundle } from '@/types';
import { extractErrorMessage } from '@/shared/utils/error';
import { formatDate } from '@/shared/utils/formatDate';
import OfferProfitPanel from '@/components/OfferProfitPanel';
import PricingSettingsCard from '@/components/PricingSettingsCard';
import BundlePicture, { BundlePictureThumb } from '@/features/admin/BundlePicture';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const AUDIENCES: { value: BundleAudience; label: string; color: string; hint: string }[] = [
  { value: 'all', label: 'Everyone', color: 'green', hint: 'Shoppers, guests and salons' },
  { value: 'stylist', label: 'Salons only', color: 'purple', hint: 'Only signed-in stylists, at salon prices' },
  { value: 'customer', label: 'Shoppers only', color: 'blue', hint: 'Guests and customers, not salons' },
];

const RULES: { value: BundlePromotionType; label: string }[] = [
  { value: 'bonus_items', label: 'Free included items (2+1 / 5+1)' },
  { value: 'percentage', label: 'Percentage off' },
  { value: 'fixed_price', label: 'Fixed bundle price' },
];

type Status = 'live' | 'scheduled' | 'ended' | 'draft';
const STATUS_TAG: Record<Status, { label: string; color?: string }> = {
  live: { label: 'Live', color: 'success' }, scheduled: { label: 'Starts later', color: 'processing' }, ended: { label: 'Ended', color: 'warning' }, draft: { label: 'Draft' },
};
function statusOf(bundle: StoreBundle): Status {
  if (!bundle.isActive) return 'draft';
  if (bundle.endsAt && dayjs(bundle.endsAt).isBefore(dayjs())) return 'ended';
  if (bundle.startsAt && dayjs(bundle.startsAt).isAfter(dayjs())) return 'scheduled';
  return 'live';
}

const ruleSummary = (bundle: StoreBundle) => (bundle.promotionType === 'percentage' && bundle.discountPercentage ? `-${Number(bundle.discountPercentage)}%`
  : bundle.promotionType === 'fixed_price' && bundle.bundlePrice ? `${Math.round(bundle.bundlePrice)} MKD` : bundle.promotionType === 'bonus_items' ? 'free items' : '—');

type BundleForm = {
  name: string;
  description?: string;
  audience: BundleAudience;
  promotion_type: BundlePromotionType;
  discount_percentage?: number;
  bundle_price?: number;
  is_active: boolean;
  is_featured: boolean;
  dates?: [Dayjs | null, Dayjs | null] | null;
  products: Array<{ product_id: string; quantity: number; bonus_quantity?: number }>;
};

const toApiDate = (value: Dayjs | null | undefined) => (value ? value.format('YYYY-MM-DD HH:mm:ss') : null);

export default function AdminBundlesPage() {
  const { message } = App.useApp();
  const { data: bundles = [], isLoading } = useGetAdminBundlesQuery();
  const { data: productPage } = useGetAllProductsQuery({ perPage: 1000 });
  const [createBundle, { isLoading: creating }] = useCreateBundleMutation();
  const [updateBundle, { isLoading: updating }] = useUpdateBundleMutation();
  const [deleteBundle] = useDeleteBundleMutation();
  const [bulkBundles, { isLoading: bulkBusy }] = useBulkBundlesMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StoreBundle | null>(null);
  const [form] = Form.useForm<BundleForm>();
  const promotionType = Form.useWatch('promotion_type', form);
  const draft = Form.useWatch([], form);

  // List filters.
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [audience, setAudience] = useState<BundleAudience | 'any'>('any');
  const [picture, setPicture] = useState<'any' | 'with' | 'without'>('any');
  const [selected, setSelected] = useState<string[]>([]);
  // Bulk change that needs a value (audience / discount / end date).
  const [bulkAsk, setBulkAsk] = useState<null | 'audience' | 'discount' | 'ends_at'>(null);
  const [bulkValue, setBulkValue] = useState<string | number | Dayjs | null>(null);

  const products = productPage?.data ?? [];
  /** The bundle being edited as the list has it now, so a new picture shows at once. */
  const liveEditing = editing ? bundles.find((item) => item.id === editing.id) ?? editing : null;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bundles.filter((bundle) => (!term || bundle.name.toLowerCase().includes(term) || (bundle.description ?? '').toLowerCase().includes(term)
        || bundle.products.some((product) => product.name.toLowerCase().includes(term)))
      && (status === 'all' || statusOf(bundle) === status)
      && (audience === 'any' || bundle.audience === audience)
      && (picture === 'any' || (picture === 'with' ? !!bundle.image : !bundle.image)));
  }, [bundles, search, status, audience, picture]);

  const counts = useMemo(() => bundles.reduce<Record<string, number>>((acc, bundle) => {
    const key = statusOf(bundle);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}), [bundles]);

  /** Normal price of the chosen products (salon prices for a salon offer). */
  const normalTotal = (values: Partial<BundleForm>) => (values.products ?? []).reduce((sum, line) => {
    const id = line?.product_id ? String(line.product_id) : '';
    // The product list, or (while it is still loading) the prices that came with the bundle.
    const product = products.find((item) => String(item.id) === id) ?? editing?.products.find((item) => String(item.id) === id);
    if (!product) return sum;
    const unit = values.audience === 'stylist' && Number(product.stylistPrice) > 0 ? Number(product.stylistPrice) : Number(product.price ?? 0);
    return sum + unit * Math.max(1, Number(line.quantity ?? 1));
  }, 0);

  /** Change the % and the bundle price fixes itself, and the other way round. */
  const syncPrices = (changed: Partial<BundleForm>, all: BundleForm) => {
    const total = normalTotal(all);
    if (total <= 0) return;
    if ('bundle_price' in changed) {
      const price = Number(changed.bundle_price ?? 0);
      if (price > 0) form.setFieldsValue({ discount_percentage: Math.max(0, Math.round((1 - price / total) * 1000) / 10) });
      return;
    }
    if ('discount_percentage' in changed || all.promotion_type === 'percentage') {
      const pct = Number(all.discount_percentage ?? 0);
      if (pct > 0) form.setFieldsValue({ bundle_price: Math.round(total * (1 - pct / 100)) });
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

  const formValues = (bundle: StoreBundle, copy = false): BundleForm => ({
    name: copy ? `${bundle.name} (copy)` : bundle.name,
    description: bundle.description ?? undefined,
    audience: bundle.audience,
    promotion_type: bundle.promotionType,
    discount_percentage: bundle.discountPercentage ?? undefined,
    bundle_price: bundle.bundlePrice ?? undefined,
    is_active: copy ? false : bundle.isActive,
    is_featured: copy ? false : bundle.isFeatured,
    dates: [bundle.startsAt ? dayjs(bundle.startsAt) : null, bundle.endsAt ? dayjs(bundle.endsAt) : null],
    products: bundle.products.map((product) => ({ product_id: product.id, quantity: product.quantity, bonus_quantity: product.bonusQuantity ?? (product.isBonus ? product.quantity : 0) })),
  });

  /** Opens the editor: an offer, a copy of one (saved as a new draft), or a new one. */
  const openEditor = (bundle?: StoreBundle, copy = false) => {
    setEditing(bundle && !copy ? bundle : null);
    form.resetFields();
    form.setFieldsValue(bundle ? formValues(bundle, copy) : {
      audience: 'all', promotion_type: 'bonus_items', is_active: true, is_featured: false, dates: null,
      products: [{ quantity: 1, bonus_quantity: 0 }, { quantity: 1, bonus_quantity: 0 }, { quantity: 1, bonus_quantity: 1 }] as BundleForm['products'],
    });
    setOpen(true);
    setTimeout(() => syncPrices({}, form.getFieldsValue(true) as BundleForm), 0);
  };

  /** Only the field that defines the offer is saved; dates go as start / end. */
  const payload = (values: BundleForm) => {
    const { dates, ...rest } = values;
    const prices = rest.promotion_type === 'percentage' ? { bundle_price: undefined }
      : rest.promotion_type === 'fixed_price' ? { discount_percentage: undefined } : {};
    return { ...rest, ...prices, starts_at: toApiDate(dates?.[0]), ends_at: toApiDate(dates?.[1]?.endOf('day')) };
  };

  const submit = async (values: BundleForm) => {
    try {
      if (editing) await updateBundle({ id: editing.id, data: payload(values) }).unwrap();
      else await createBundle(payload(values)).unwrap();
      message.success(editing ? 'Offer updated' : 'Offer created');
      setOpen(false);
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  const quick = async (bundle: StoreBundle, data: { is_active?: boolean; is_featured?: boolean; audience?: BundleAudience }) => {
    try {
      await updateBundle({ id: bundle.id, data }).unwrap();
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  const runBulk = async (action: BundleBulkAction, value?: string | number | null) => {
    try {
      const result = await bulkBundles({ ids: selected, action, value }).unwrap();
      message.success(`${result.updated} offers ${action === 'delete' ? 'deleted' : 'updated'}`);
      if (action === 'delete') setSelected([]);
      setBulkAsk(null);
      setBulkValue(null);
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  const confirmBulkValue = () => {
    if (bulkAsk === 'ends_at') return runBulk('ends_at', bulkValue ? toApiDate((bulkValue as Dayjs).endOf('day')) : null);
    if (bulkAsk && bulkValue !== null && bulkValue !== '') return runBulk(bulkAsk, bulkValue as string | number);
    message.warning('Choose a value first.');
    return undefined;
  };

  const bulkMenu = {
    items: [
      { key: 'activate', label: 'Make live' },
      { key: 'deactivate', label: 'Make draft (hide)' },
      { key: 'feature', label: 'Feature on shop' },
      { key: 'unfeature', label: 'Stop featuring' },
      { type: 'divider' as const },
      { key: 'audience', label: 'Change who sees them…' },
      { key: 'discount', label: 'Change % discount…' },
      { key: 'ends_at', label: 'Change end date…' },
      { type: 'divider' as const },
      { key: 'delete', label: 'Delete…', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'audience' || key === 'discount' || key === 'ends_at') { setBulkValue(null); setBulkAsk(key); return; }
      if (key === 'delete') {
        Modal.confirm({ title: `Delete ${selected.length} offers?`, content: 'Their pictures are removed too. This cannot be undone.', okText: 'Delete', okButtonProps: { danger: true }, onOk: () => runBulk('delete') });
        return;
      }
      void runBulk(key as BundleBulkAction);
    },
  };

  return (
    <div>
      <Space direction="vertical" size={4} style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Offers & Bundles</Title>
        <Text type="secondary">Sets with a % off, a fixed price or free items. Choose who sees each offer, when it runs and its picture in the shop.</Text>
      </Space>
      <PricingSettingsCard />

      <Card size="small" style={{ margin: '16px 0' }}>
        <Space wrap size={[12, 12]} style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap size={[12, 12]}>
            <Input allowClear prefix={<SearchOutlined />} placeholder="Search name or product" value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: 230 }} />
            <Segmented<Status | 'all'>
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: `All ${bundles.length}` },
                { value: 'live', label: `Live ${counts.live ?? 0}` },
                { value: 'draft', label: `Draft ${counts.draft ?? 0}` },
                { value: 'scheduled', label: `Later ${counts.scheduled ?? 0}` },
                { value: 'ended', label: `Ended ${counts.ended ?? 0}` },
              ]}
            />
            <Select value={audience} onChange={setAudience} style={{ width: 150 }} options={[{ value: 'any', label: 'Anyone' }, ...AUDIENCES.map((item) => ({ value: item.value, label: item.label }))]} aria-label="Who sees the offer" />
            <Select value={picture} onChange={setPicture} style={{ width: 150 }} options={[{ value: 'any', label: 'Any picture' }, { value: 'with', label: 'With picture' }, { value: 'without', label: 'No picture' }]} aria-label="Picture" />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>Create offer</Button>
        </Space>
        {selected.length > 0 && (
          <Space wrap style={{ marginTop: 12 }}>
            <Text strong>{selected.length} selected</Text>
            <Dropdown menu={bulkMenu} trigger={['click']}>
              <Button loading={bulkBusy}>Change selected <DownOutlined /></Button>
            </Dropdown>
            <Button type="link" onClick={() => setSelected([])}>Clear</Button>
          </Space>
        )}
      </Card>

      <Table<StoreBundle>
        loading={isLoading}
        rowKey="id"
        dataSource={visible}
        rowSelection={{ selectedRowKeys: selected, onChange: (keys) => setSelected(keys.map(String)), preserveSelectedRowKeys: true }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100, 200] }}
        scroll={{ x: 980 }}
        columns={[
          { title: '', width: 64, render: (_, row) => <BundlePictureThumb bundle={row} /> },
          {
            title: 'Offer', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
            render: (name: string, row) => <Space direction="vertical" size={0}>
              <Button type="link" style={{ padding: 0, height: 'auto', fontWeight: 600, textAlign: 'left', whiteSpace: 'normal' }} onClick={() => openEditor(row)}>{name}</Button>
              <Text type="secondary" style={{ fontSize: 12 }}>{row.products.length} products · {row.products.reduce((sum, item) => sum + item.quantity, 0)} pcs</Text>
            </Space>,
          },
          {
            title: 'Who sees it', width: 150, filters: AUDIENCES.map((item) => ({ text: item.label, value: item.value })), onFilter: (value, row) => row.audience === value,
            render: (_, row) => <Select size="small" value={row.audience} variant="borderless" style={{ width: 140 }} onChange={(value) => quick(row, { audience: value })}
              options={AUDIENCES.map((item) => ({ value: item.value, label: <Tag color={item.color} style={{ margin: 0 }}>{item.label}</Tag> }))} />,
          },
          { title: 'Deal', width: 110, render: (_, row) => <Tag color={row.promotionType === 'bonus_items' ? 'gold' : 'blue'}>{ruleSummary(row)}</Tag> },
          {
            title: 'Runs', width: 170, sorter: (a, b) => dayjs(a.endsAt ?? '2100-01-01').valueOf() - dayjs(b.endsAt ?? '2100-01-01').valueOf(),
            render: (_, row) => <Space direction="vertical" size={0}>
              <Tag color={STATUS_TAG[statusOf(row)].color}>{STATUS_TAG[statusOf(row)].label}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>{row.startsAt ? formatDate(row.startsAt) : 'now'} → {row.endsAt ? formatDate(row.endsAt) : 'no end'}</Text>
            </Space>,
          },
          {
            title: 'Live', width: 70, render: (_, row) => <Tooltip title={row.isActive ? 'Hide this offer (draft)' : 'Show this offer'}>
              <Switch size="small" checked={row.isActive} loading={updating} onChange={(checked) => quick(row, { is_active: checked })} />
            </Tooltip>,
          },
          {
            title: 'Top', width: 60, render: (_, row) => <Tooltip title={row.isFeatured ? 'Featured first in the shop' : 'Feature first in the shop'}>
              <Button type="text" icon={row.isFeatured ? <StarFilled style={{ color: '#e9b43a' }} /> : <StarOutlined />} onClick={() => quick(row, { is_featured: !row.isFeatured })} aria-label="Feature" />
            </Tooltip>,
          },
          {
            title: '', width: 130, fixed: 'right', render: (_, row) => <Space size={4}>
              <Tooltip title="Edit"><Button icon={<EditOutlined />} onClick={() => openEditor(row)} aria-label="Edit" /></Tooltip>
              <Tooltip title="Duplicate as a new draft"><Button icon={<CopyOutlined />} onClick={() => openEditor(row, true)} aria-label="Duplicate" /></Tooltip>
              <Popconfirm title="Delete this offer?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => deleteBundle(row.id)}><Button danger icon={<DeleteOutlined />} aria-label="Delete" /></Popconfirm>
            </Space>,
          },
        ]}
      />

      <Modal
        open={bulkAsk !== null}
        title={bulkAsk === 'audience' ? `Who sees the ${selected.length} offers?` : bulkAsk === 'discount' ? `New % for ${selected.length} offers` : `New end date for ${selected.length} offers`}
        okText="Apply"
        confirmLoading={bulkBusy}
        onOk={confirmBulkValue}
        onCancel={() => setBulkAsk(null)}
      >
        {bulkAsk === 'audience' && <Select style={{ width: '100%' }} value={bulkValue as string | null} onChange={setBulkValue} placeholder="Choose" options={AUDIENCES.map((item) => ({ value: item.value, label: `${item.label} — ${item.hint}` }))} />}
        {bulkAsk === 'discount' && <><InputNumber min={0} max={90} addonAfter="%" style={{ width: '100%' }} value={bulkValue as number | null} onChange={setBulkValue} /><Text type="secondary" style={{ fontSize: 12 }}>Only percentage offers change; fixed-price and free-item offers keep their deal.</Text></>}
        {bulkAsk === 'ends_at' && <><DatePicker style={{ width: '100%' }} value={bulkValue as Dayjs | null} onChange={setBulkValue} /><Text type="secondary" style={{ fontSize: 12 }}>Empty = no end date. Offers end at 23:59 that day.</Text></>}
      </Modal>

      <Drawer title={editing ? 'Edit offer' : 'New offer'} width={760} open={open} onClose={() => setOpen(false)} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={submit} onValuesChange={syncPrices}>
          <Form.Item name="name" label="Offer name" rules={[{ required: true }]}><Input placeholder="No Yellow salon restock 5+1" /></Form.Item>
          <Form.Item name="description" label="What makes this worthwhile?"><Input.TextArea rows={2} placeholder="Six salon-size shampoos, with one free." /></Form.Item>
          <Space style={{ display: 'flex' }} size={12} align="start">
            <Form.Item name="audience" label="Who sees it" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={AUDIENCES.map((item) => ({ value: item.value, label: item.label, title: item.hint }))} />
            </Form.Item>
            <Form.Item name="promotion_type" label="Offer rule" rules={[{ required: true }]} style={{ flex: 1 }}><Select options={RULES} /></Form.Item>
          </Space>
          {(promotionType === 'percentage' || promotionType === 'fixed_price') && (
            <Space style={{ display: 'flex' }} size={12} align="start">
              <Form.Item name="discount_percentage" label="Discount" rules={[{ required: promotionType === 'percentage' }]} style={{ flex: 1 }}><InputNumber min={0} max={100} step={1} style={{ width: '100%' }} addonAfter="%" /></Form.Item>
              <Form.Item name="bundle_price" label="Bundle price" rules={[{ required: promotionType === 'fixed_price' }]} style={{ flex: 1 }}><InputNumber min={0} step={10} style={{ width: '100%' }} addonAfter="MKD" /></Form.Item>
              <Form.Item label="Normal price" style={{ flex: 1 }}><Text strong style={{ lineHeight: '32px' }}>{total > 0 ? `${Math.round(total)} MKD` : '—'}</Text></Form.Item>
            </Space>
          )}
          <Form.Item name="dates" label="Runs from – to" extra="Empty start = from now; empty end = until you switch it off.">
            <RangePicker allowEmpty={[true, true]} style={{ width: '100%' }} />
          </Form.Item>
          <Card size="small" title="Included products" style={{ marginBottom: 16 }}>
            <Form.List name="products">
              {(fields, { add, remove }) => <Space direction="vertical" style={{ width: '100%' }} size={10}>
                {fields.map((field) => <Space key={field.key} align="start" style={{ display: 'flex' }} wrap>
                  <Form.Item {...field} name={[field.name, 'product_id']} rules={[{ required: true }]} style={{ width: 340, marginBottom: 0 }}><Select showSearch optionFilterProp="label" options={productOptions} placeholder="Choose product" /></Form.Item>
                  <Form.Item {...field} name={[field.name, 'quantity']} rules={[{ required: true }]} style={{ marginBottom: 0 }}><InputNumber min={1} addonBefore="Qty" /></Form.Item>
                  <Form.Item {...field} name={[field.name, 'bonus_quantity']} style={{ marginBottom: 0 }}><InputNumber min={0} addonBefore="Free" disabled={promotionType !== 'bonus_items'} /></Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label="Remove product" />
                </Space>)}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ quantity: 1, bonus_quantity: 0 })}>Add product</Button>
              </Space>}
            </Form.List>
          </Card>
          <Card size="small" title="Picture in the shop" style={{ marginBottom: 16 }}>
            {liveEditing
              ? <BundlePicture bundle={liveEditing} />
              : <Text type="secondary">Save the offer first, then add its picture here or in Post Studio → Bundles.</Text>}
          </Card>
          <Card size="small" title="What this offer earns" style={{ marginBottom: 16 }}>
            {open && <OfferProfitPanel draft={draft ?? {}} />}
          </Card>
          <Space size={24}>
            <Form.Item name="is_active" valuePropName="checked" label="Live"><Switch /></Form.Item>
            <Form.Item name="is_featured" valuePropName="checked" label="Feature first in the shop"><Switch /></Form.Item>
          </Space>
          <Button type="primary" htmlType="submit" block size="large" icon={<GiftOutlined />} loading={creating || updating}>Save offer</Button>
        </Form>
      </Drawer>
    </div>
  );
}
