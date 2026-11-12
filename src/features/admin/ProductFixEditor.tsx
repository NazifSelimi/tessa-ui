/**
 * Inline product editor for the Fix products page: the same fields as the
 * product modal (shared ProductFields) plus size and manufacturer code, and a
 * free "Suggest" draft per description language. Saving only sends what
 * changed, through the normal admin product update.
 */
import { useEffect, useMemo, useState } from 'react';
import { App, Button, Col, Form, Input, Popconfirm, Row, Select, Space, Tooltip } from 'antd';
import { useGetBrandsQuery, useGetCategoriesQuery } from '@/features/products/api';
import { useDeleteProductMutation, useUpdateProductMutation } from '@/features/admin/api';
import type { ProductAudience } from '@/types';
import { BrandCategoryFields, DescriptionFields, PriceStockFields, VisibilityField, visibleToParam, type DescriptionLocale } from './ProductFields';
import { templateDescription } from './descriptionDraft';

export interface FixProduct {
  id: number; name: string; brand?: string | null; category?: string | null;
  brand_id?: number | null; category_id?: number | null; manufacturer_code?: string | null;
  size_value?: string | null; size_unit?: string | null;
  price?: string | number | null; stylist_price?: string | number | null; cost_price?: string | number | null; quantity: number;
  visible_to_guests?: boolean; visible_to_customers?: boolean; visible_to_stylists?: boolean;
  descriptions?: Partial<Record<DescriptionLocale, string>>;
}

interface Values {
  name: string; brand_id?: number; category_id?: number; manufacturer_code?: string; size_value?: string; size_unit?: string;
  price?: number | null; stylist_price?: number | null; cost_price?: number | null; quantity?: number | null; visible_to: ProductAudience[];
  description_en?: string; description_mk?: string; description_shq?: string;
}

type Draft = { text: string; kind: string; from: { id: number; name: string } } | null;

function valuesOf(p: FixProduct): Values {
  const num = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    name: p.name,
    brand_id: p.brand_id ?? undefined,
    category_id: p.category_id ?? undefined,
    manufacturer_code: p.manufacturer_code ?? '',
    size_value: p.size_value ?? '',
    size_unit: p.size_unit ?? '',
    price: num(p.price), stylist_price: num(p.stylist_price), cost_price: num(p.cost_price), quantity: p.quantity,
    visible_to: [p.visible_to_guests && 'guests', p.visible_to_customers && 'customers', p.visible_to_stylists && 'stylists'].filter(Boolean) as ProductAudience[],
    description_en: p.descriptions?.en ?? '', description_mk: p.descriptions?.mk ?? '', description_shq: p.descriptions?.shq ?? '',
  };
}

const FIELDS: (keyof Values)[] = ['name', 'brand_id', 'category_id', 'manufacturer_code', 'size_value', 'size_unit', 'price', 'stylist_price', 'cost_price', 'quantity'];

interface Props {
  product: FixProduct;
  /** GET helper for the admin API (adds the token). */
  request: (path: string) => Promise<{ drafts: Record<DescriptionLocale, Draft> }>;
  onSaved: (next: boolean) => void;
  /** Called after the product was deleted. */
  onDeleted: () => void;
}

export default function ProductFixEditor({ product, request, onSaved, onDeleted }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const visible = Form.useWatch('visible_to', form);
  const { data: brands = [] } = useGetBrandsQuery(undefined);
  const { data: categories = [] } = useGetCategoriesQuery(undefined);
  const [updateProduct, { isLoading }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const [drafts, setDrafts] = useState<Record<DescriptionLocale, Draft>>();
  const initial = useMemo(() => valuesOf(product), [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new product resets the form; refreshes of the same product keep the admin's typing.
  useEffect(() => { form.setFieldsValue(initial); setDrafts(undefined); }, [initial, form]);

  /** Drafts for all three languages: empty boxes are filled; if none is empty, all are redrafted. */
  const suggest = async () => {
    let found = drafts;
    if (!found) {
      try { found = (await request(`products/${product.id}/description-suggestions`)).drafts; setDrafts(found); }
      catch { found = undefined; }
    }
    const current = form.getFieldsValue();
    const locales: DescriptionLocale[] = ['mk', 'shq', 'en'];
    const empty = locales.filter((l) => !String(current[`description_${l}`] ?? '').trim());
    const targets = empty.length ? empty : locales;
    const brand = brands.find((b) => Number(b.id) === current.brand_id)?.name ?? product.brand;
    const category = categories.find((c) => Number(c.id) === current.category_id)?.name ?? product.category;
    const size = current.size_value ? `${current.size_value} ${current.size_unit || ''}`.trim() : null;
    const copied = new Set<string>();
    for (const locale of targets) {
      const draft = found?.[locale];
      if (draft) copied.add(`#${draft.from.id} ${draft.from.name}`);
      form.setFieldValue(`description_${locale}`, draft ? draft.text : templateDescription(locale, { name: current.name || product.name, brand, category, size }));
    }
    message.info(`${copied.size ? `Copied from ${[...copied].join(', ')}` : 'Drafted from the template'} (${targets.map((l) => (l === 'shq' ? 'SQ' : l.toUpperCase())).join(', ')}) — check, then Save.`);
  };

  const save = async (next: boolean) => {
    let values: Values;
    try { values = await form.validateFields(); } catch { return; }
    const data = new FormData();
    let changed = false;
    for (const key of FIELDS) {
      const now = values[key] ?? '';
      if (String(now) !== String(initial[key] ?? '')) { data.append(key, String(now)); changed = true; }
    }
    if (visibleToParam(values.visible_to ?? []) !== visibleToParam(initial.visible_to)) {
      data.append('visible_to', visibleToParam(values.visible_to ?? [])); changed = true;
    }
    const locales: DescriptionLocale[] = ['en', 'mk', 'shq'];
    if (locales.some((l) => (values[`description_${l}`] ?? '') !== (initial[`description_${l}`] ?? ''))) {
      locales.forEach((l) => data.append(`translations[${l}]`, values[`description_${l}`] ?? ''));
      changed = true;
    }
    if (!changed) { if (next) onSaved(true); else message.info('No changes to save.'); return; }
    try {
      await updateProduct({ id: String(product.id), data }).unwrap();
      message.success('Saved.');
      onSaved(next);
    } catch (error) {
      message.error((error as { data?: { message?: string } })?.data?.message || 'Could not save. Please try again.');
    }
  };


  return (
    <Form form={form} layout="vertical" initialValues={initial} onFinish={() => void save(false)}>
      <Form.Item name="name" label="Product name" rules={[{ required: true, message: 'Please enter a name' }]}>
        <Input />
      </Form.Item>
      <BrandCategoryFields brands={brands} categories={categories} />
      <Row gutter={16}>
        <Col xs={12} sm={6}><Form.Item name="size_value" label="Size"><Input placeholder="e.g. 250" /></Form.Item></Col>
        <Col xs={12} sm={6}>
          <Form.Item name="size_unit" label="Unit">
            <Select allowClear placeholder="ml" options={['ml', 'l', 'g', 'kg', 'pcs'].map((u) => ({ value: u, label: u }))} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}><Form.Item name="manufacturer_code" label="Manufacturer code"><Input /></Form.Item></Col>
      </Row>
      <PriceStockFields />
      <VisibilityField hiddenFromAll={!!visible && visible.length === 0} />
      <Tooltip title="Fills the empty description boxes in Macedonian, Albanian and English (all three if none is empty). Nothing is saved until you press Save.">
        <Button style={{ marginBottom: 8 }} onClick={() => void suggest()}>Suggest descriptions (MK, SQ, EN)</Button>
      </Tooltip>
      <DescriptionFields rows={5} order={['mk', 'shq', 'en']} />
      <Space wrap style={{ position: 'sticky', bottom: 0, background: 'var(--ant-color-bg-container, #fff)', padding: '8px 0', width: '100%' }}>
        <Button type="primary" loading={isLoading} onClick={() => void save(true)}>Save &amp; next ›</Button>
        <Button loading={isLoading} htmlType="submit">Save</Button>
        <Button onClick={() => form.setFieldsValue(initial)}>Undo changes</Button>
        <Popconfirm
          title={`Delete “${product.name}”?`}
          description="The product and its texts are removed from the shop. Products that were ever ordered cannot be deleted (order history is kept); hide them instead."
          okText="Delete product" okButtonProps={{ danger: true }} cancelText="Keep"
          onConfirm={async () => {
            try { await deleteProduct(String(product.id)).unwrap(); message.success('Product deleted.'); onDeleted(); }
            catch (error) { message.error((error as { data?: { message?: string } })?.data?.message || 'Could not delete. Please try again.'); }
          }}
        >
          <Button danger loading={deleting}>Delete product</Button>
        </Popconfirm>
      </Space>
    </Form>
  );
}
