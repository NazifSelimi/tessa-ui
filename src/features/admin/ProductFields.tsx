/**
 * Product form fields shared by the add/edit product modal and the
 * Fix products page, so both edit a product the same way. Use inside an antd
 * <Form>; field names match the admin product API.
 */
import type { ReactNode } from 'react';
import { Checkbox, Col, Form, Input, InputNumber, Row, Select, Typography } from 'antd';
import type { ProductAudience } from '@/types';
import { PRODUCT_AUDIENCES } from '@/shared/utils/productVisibility';

type Option = { id: string | number; name: string };
export type DescriptionLocale = 'en' | 'mk' | 'shq';

/** Sorted, comma-joined audiences for the form post; 'none' = hidden (forms cannot send []). */
export function visibleToParam(audiences: ProductAudience[]): string {
  const ordered = PRODUCT_AUDIENCES.map((a) => a.value).filter((a) => audiences.includes(a));
  return ordered.length ? ordered.join(',') : 'none';
}

export function BrandCategoryFields({ brands, categories, required = false }: { brands: Option[]; categories: Option[]; required?: boolean }) {
  return (
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item name="brand_id" label="Brand" rules={[{ required, message: 'Please select a brand' }]}>
          <Select placeholder="Select brand" showSearch optionFilterProp="label" options={brands.map((b) => ({ value: Number(b.id), label: b.name }))} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="category_id" label="Category" rules={[{ required, message: 'Please select a category' }]}>
          <Select placeholder="Select category" showSearch optionFilterProp="label" options={categories.map((c) => ({ value: Number(c.id), label: c.name }))} />
        </Form.Item>
      </Col>
    </Row>
  );
}

export function PriceStockFields({ required = false, isEditing = true }: { required?: boolean; isEditing?: boolean }) {
  return (
    <Row gutter={16}>
      <Col xs={12} sm={6}>
        <Form.Item name="price" label="Price (MKD)" rules={[{ required, message: 'Please enter price' }]}>
          <InputNumber min={0} prefix="MKD" placeholder="0" style={{ width: '100%' }} precision={0} />
        </Form.Item>
      </Col>
      <Col xs={12} sm={6}>
        <Form.Item name="stylist_price" label="Stylist Price (MKD)" extra={!isEditing ? 'Auto-calculated as 90% of price if empty' : undefined}>
          <InputNumber min={0} prefix="MKD" placeholder="0" style={{ width: '100%' }} precision={0} />
        </Form.Item>
      </Col>
      <Col xs={12} sm={6}>
        <Form.Item name="cost_price" label="Cost Price (MKD)" extra="Admin only. Leave empty to use the estimated cost % from Offers.">
          <InputNumber min={0} prefix="MKD" placeholder="Estimated" style={{ width: '100%' }} precision={0} />
        </Form.Item>
      </Col>
      <Col xs={12} sm={6}>
        <Form.Item name="quantity" label="Stock Qty" rules={[{ required, message: 'Please enter quantity' }]}>
          <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>
  );
}

export function VisibilityField({ hiddenFromAll }: { hiddenFromAll: boolean }) {
  return (
    <Form.Item
      name="visible_to"
      label="Who can see this product"
      extra={hiddenFromAll
        ? <Typography.Text type="danger">Hidden from everyone. Only admins can see it.</Typography.Text>
        : 'Untick a group to hide the product from them (shop, search, quiz and checkout). Untick all to hide it.'}
    >
      <Checkbox.Group options={PRODUCT_AUDIENCES.map(({ value, label }) => ({ value, label }))} />
    </Form.Item>
  );
}

const DESCRIPTION_FIELDS: { locale: DescriptionLocale; label: string; placeholder: string }[] = [
  { locale: 'mk', label: 'Description (Macedonian)', placeholder: 'Македонски опис' },
  { locale: 'shq', label: 'Description (Albanian)', placeholder: 'Pershkrimi ne shqip' },
  { locale: 'en', label: 'Description (English)', placeholder: 'English product description' },
];

/** Three description boxes; `extra` adds e.g. a "Suggest" button under a language. */
export function DescriptionFields({ rows = 3, extra, order = ['en', 'mk', 'shq'] }: { rows?: number; extra?: (locale: DescriptionLocale) => ReactNode; order?: DescriptionLocale[] }) {
  return (
    <Row gutter={16}>
      {order.map((locale) => {
        const field = DESCRIPTION_FIELDS.find((f) => f.locale === locale)!;
        return (
          <Col key={locale} xs={24} sm={locale === 'en' && order[0] === 'en' ? 24 : 12} lg={order[0] === 'en' ? undefined : 8}>
            <Form.Item name={`description_${locale}`} label={field.label} extra={extra?.(locale)}>
              <Input.TextArea rows={rows} placeholder={field.placeholder} />
            </Form.Item>
          </Col>
        );
      })}
    </Row>
  );
}
