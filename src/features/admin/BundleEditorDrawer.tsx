/**
 * The offer editor (drawer): name, who sees it, rule, prices, steps, dates,
 * products, picture, profit check, live / featured. Used by Admin → Offers and
 * by the edit button admins see on offer cards in the shop.
 */
import { useEffect } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { App, Button, Card, DatePicker, Drawer, Form, Input, InputNumber, Select, Space, Switch, Typography } from 'antd';
import { DeleteOutlined, GiftOutlined, PlusOutlined } from '@ant-design/icons';
import {
  useCreateBundleMutation, useGetAdminBundlesQuery, useGetAllProductsQuery, useGetProductFamiliesQuery, useUpdateBundleMutation,
} from '@/features/admin/api';
import type { BundleAudience, BundlePromotionType, StoreBundle } from '@/types';
import { extractErrorMessage } from '@/shared/utils/error';
import OfferProfitPanel from '@/components/OfferProfitPanel';
import BundlePicture from '@/features/admin/BundlePicture';
import { AUDIENCES, toApiDate } from '@/features/admin/bundleOptions';
import { useClashWarnings } from '@/features/admin/useClashWarnings';

const { Text } = Typography;
const { RangePicker } = DatePicker;


const RULES: { value: BundlePromotionType; label: string }[] = [
  { value: 'bonus_items', label: 'Free included items (2+1 / 5+1)' },
  { value: 'percentage', label: 'Percentage off' },
  { value: 'fixed_price', label: 'Fixed bundle price' },
  { value: 'mix_match', label: 'Pick any colours (reward steps)' },
];

/** Starting steps for a new "pick any colours" offer. */
const DEFAULT_TIERS = [{ min: 10, free: 0, gift: true }, { min: 20, free: 1, gift: true }, { min: 30, free: 3, gift: true }];

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
  product_family_id?: string;
  tiers?: Array<{ min: number; free?: number; gift?: boolean }>;
  products: Array<{ product_id: string; quantity: number; bonus_quantity?: number }>;
};


interface BundleEditorDrawerProps {
  open: boolean;
  /** The offer to edit; null = a new offer. */
  bundle: StoreBundle | null;
  /** Save as a new draft copy of `bundle`. */
  copy?: boolean;
  onClose: () => void;
}

export default function BundleEditorDrawer({ open, bundle, copy = false, onClose }: BundleEditorDrawerProps) {
  const { message } = App.useApp();
  const showClashWarnings = useClashWarnings();
  const { data: bundles = [] } = useGetAdminBundlesQuery(undefined, { skip: !open });
  const { data: productPage } = useGetAllProductsQuery({ perPage: 1000 }, { skip: !open });
  const { data: families = [] } = useGetProductFamiliesQuery(undefined, { skip: !open });
  const [createBundle, { isLoading: creating }] = useCreateBundleMutation();
  const [updateBundle, { isLoading: updating }] = useUpdateBundleMutation();
  const [form] = Form.useForm<BundleForm>();
  const promotionType = Form.useWatch('promotion_type', form);
  const draft = Form.useWatch([], form);
  const editing = bundle && !copy ? bundle : null;
  const products = productPage?.data ?? [];
  /** The bundle being edited as the list has it now, so a new picture shows at once. */
  const liveEditing = editing ? bundles.find((item) => item.id === editing.id) ?? editing : null;

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
    product_family_id: bundle.familyId ?? undefined,
    tiers: bundle.tiers ?? undefined,
    products: bundle.products.map((product) => ({ product_id: product.id, quantity: product.quantity, bonus_quantity: product.bonusQuantity ?? (product.isBonus ? product.quantity : 0) })),
  });

  /** Fills the form: an offer, a copy of one (saved as a new draft), or a new one. */
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(bundle ? formValues(bundle, copy) : {
      audience: 'all', promotion_type: 'bonus_items', is_active: true, is_featured: false, dates: null,
      products: [{ quantity: 1, bonus_quantity: 0 }, { quantity: 1, bonus_quantity: 0 }, { quantity: 1, bonus_quantity: 1 }] as BundleForm['products'],
    });
    setTimeout(() => syncPrices({}, form.getFieldsValue(true) as BundleForm), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bundle?.id, copy]);

  /** Only the field that defines the offer is saved; dates go as start / end. */
  const payload = (values: BundleForm) => {
    const { dates, ...rest } = values;
    const prices = rest.promotion_type === 'percentage' ? { bundle_price: undefined }
      : rest.promotion_type === 'fixed_price' ? { discount_percentage: undefined } : {};
    const colours = rest.promotion_type === 'mix_match'
      ? { tiers: rest.tiers ?? [], products: (rest.products ?? []).filter((line) => line?.product_id).map((line) => ({ product_id: line.product_id, quantity: 1, bonus_quantity: line.bonus_quantity ?? 1 })) }
      : { product_family_id: null, tiers: null };
    return { ...rest, ...prices, ...colours, starts_at: toApiDate(dates?.[0]), ends_at: toApiDate(dates?.[1]?.endOf('day')) };
  };

  const submit = async (values: BundleForm) => {
    try {
      const saved = editing
        ? await updateBundle({ id: editing.id, data: payload(values) }).unwrap()
        : await createBundle(payload(values)).unwrap();
      message.success(editing ? 'Offer updated' : 'Offer created');
      showClashWarnings(saved.clashWarnings);
      onClose();
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  return (
  <Drawer title={editing ? 'Edit offer' : 'New offer'} width={760} open={open} onClose={onClose} destroyOnHidden>
    <Form form={form} layout="vertical" onFinish={submit} onValuesChange={syncPrices}>
      <Form.Item name="name" label="Offer name" rules={[{ required: true }]}><Input placeholder="No Yellow salon restock 5+1" /></Form.Item>
      <Form.Item name="description" label="What makes this worthwhile?"><Input.TextArea rows={2} placeholder="Six salon-size shampoos, with one free." /></Form.Item>
      <Space style={{ display: 'flex' }} size={12} align="start">
        <Form.Item name="audience" label="Who sees it" rules={[{ required: true }]} style={{ flex: 1 }}>
          <Select options={AUDIENCES.map((item) => ({ value: item.value, label: item.label, title: item.hint }))} />
        </Form.Item>
        <Form.Item name="promotion_type" label="Offer rule" rules={[{ required: true }]} style={{ flex: 1 }}>
          <Select options={RULES} onChange={(value) => { if (value === 'mix_match' && !form.getFieldValue('tiers')?.length) form.setFieldsValue({ tiers: DEFAULT_TIERS, products: [] }); }} />
        </Form.Item>
      </Space>
      {(promotionType === 'percentage' || promotionType === 'fixed_price') && (
        <Space style={{ display: 'flex' }} size={12} align="start">
          <Form.Item name="discount_percentage" label="Discount" rules={[{ required: promotionType === 'percentage' }]} style={{ flex: 1 }}><InputNumber min={0} max={100} step={1} style={{ width: '100%' }} addonAfter="%" /></Form.Item>
          <Form.Item name="bundle_price" label="Bundle price" rules={[{ required: promotionType === 'fixed_price' }]} style={{ flex: 1 }}><InputNumber min={0} step={10} style={{ width: '100%' }} addonAfter="MKD" /></Form.Item>
          <Form.Item label="Normal price" style={{ flex: 1 }}><Text strong style={{ lineHeight: '32px' }}>{total > 0 ? `${Math.round(total)} MKD` : '—'}</Text></Form.Item>
        </Space>
      )}
      {promotionType === 'mix_match' && (
        <Card size="small" title="Pick any colours" style={{ marginBottom: 16 }}>
          <Form.Item name="product_family_id" label="Colour line (any shade counts)" extra="Leave empty when the deal counts listed products instead (set them to “Counts to the deal” below).">
            <Select allowClear showSearch optionFilterProp="label" placeholder="Choose a colour line" options={families.map((family) => ({ value: String(family.id), label: `${family.name} (${family.shadeCount} shades)` }))} />
          </Form.Item>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>Reward steps: from N colours in the cart, the cheapest X colours are free and/or one gift below is free. The highest step reached counts.</Text>
          <Form.List name="tiers">
            {(fields, { add, remove }) => <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {fields.map((field) => <Space key={field.key} align="center" wrap>
                <Form.Item {...field} name={[field.name, 'min']} rules={[{ required: true }]} style={{ marginBottom: 0 }}><InputNumber min={1} max={500} addonBefore="From" addonAfter="colours" /></Form.Item>
                <Form.Item {...field} name={[field.name, 'free']} style={{ marginBottom: 0 }}><InputNumber min={0} max={100} addonBefore="Free" addonAfter="colours" /></Form.Item>
                <Form.Item {...field} name={[field.name, 'gift']} valuePropName="checked" style={{ marginBottom: 0 }}><Switch checkedChildren="+ gift" unCheckedChildren="no gift" /></Form.Item>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label="Remove step" />
              </Space>)}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ min: 40, free: 4, gift: true })}>Add step</Button>
            </Space>}
          </Form.List>
        </Card>
      )}
      <Form.Item name="dates" label="Runs from – to" extra="Empty start = from now; empty end = until you switch it off.">
        <RangePicker allowEmpty={[true, true]} style={{ width: '100%' }} />
      </Form.Item>
      <Card size="small" title={promotionType === 'mix_match' ? 'Gifts (the stylist picks one: oxidant, activator…) and products the deal counts (e.g. Silver Star shampoo or mask)' : 'Included products'} style={{ marginBottom: 16 }}>
        <Form.List name="products">
          {(fields, { add, remove }) => <Space direction="vertical" style={{ width: '100%' }} size={10}>
            {fields.map((field) => <Space key={field.key} align="start" style={{ display: 'flex' }} wrap>
              <Form.Item {...field} name={[field.name, 'product_id']} rules={[{ required: true }]} style={{ width: 340, marginBottom: 0 }}><Select showSearch optionFilterProp="label" options={productOptions} placeholder="Choose product" /></Form.Item>
              {promotionType === 'mix_match' && <Form.Item {...field} name={[field.name, 'bonus_quantity']} initialValue={1} style={{ width: 170, marginBottom: 0 }}>
                <Select options={[{ value: 1, label: 'Gift choice' }, { value: 0, label: 'Counts to the deal' }]} />
              </Form.Item>}
              {promotionType !== 'mix_match' && <>
                <Form.Item {...field} name={[field.name, 'quantity']} rules={[{ required: true }]} style={{ marginBottom: 0 }}><InputNumber min={1} addonBefore="Qty" /></Form.Item>
                <Form.Item {...field} name={[field.name, 'bonus_quantity']} style={{ marginBottom: 0 }}><InputNumber min={0} addonBefore="Free" disabled={promotionType !== 'bonus_items'} /></Form.Item>
              </>}
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label="Remove product" />
            </Space>)}
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ quantity: 1, bonus_quantity: promotionType === 'mix_match' ? 1 : 0 })}>Add product</Button>
          </Space>}
        </Form.List>
      </Card>
      <Card size="small" title="Picture in the shop" style={{ marginBottom: 16 }}>
        {liveEditing
          ? <BundlePicture bundle={liveEditing} />
          : <Text type="secondary">Save the offer first, then add its picture here or in Post Studio → Bundles.</Text>}
      </Card>
      {promotionType !== 'mix_match' && <Card size="small" title="What this offer earns" style={{ marginBottom: 16 }}>
        {open && <OfferProfitPanel draft={draft ?? {}} />}
      </Card>}
      <Space size={24}>
        <Form.Item name="is_active" valuePropName="checked" label="Live"><Switch /></Form.Item>
        <Form.Item name="is_featured" valuePropName="checked" label="Feature first in the shop"><Switch /></Form.Item>
      </Space>
      <Button type="primary" htmlType="submit" block size="large" icon={<GiftOutlined />} loading={creating || updating}>Save offer</Button>
    </Form>
  </Drawer>
  );
}
