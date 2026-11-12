/**
 * PDF documents (/admin/documents): the price list for shoppers or for
 * business accounts, and delivery notes for several orders at once.
 * PDFs for one order are on the order itself (Orders -> open an order).
 */

import { useState } from 'react';
import { Alert, App, Button, Card, Checkbox, Col, Form, Input, Radio, Row, Select, Typography } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectToken } from '@/features/auth/slice';
import { DOCUMENT_LANGUAGES, downloadPdf, parseOrderNumbers, useGetPriceListOptionsQuery, type DocumentLocale, type PriceListAudience } from '@/features/admin/documents';

const { Paragraph, Text } = Typography;

export default function AdminDocumentsPage() {
  const { message } = App.useApp();
  const token = useAppSelector(selectToken);
  const { data: options, isLoading } = useGetPriceListOptionsQuery();

  const [audience, setAudience] = useState<PriceListAudience>('retail');
  const [locale, setLocale] = useState<DocumentLocale>('mk');
  const [brandIds, setBrandIds] = useState<number[]>([]);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [orderText, setOrderText] = useState('');
  const [busy, setBusy] = useState<'list' | 'notes' | null>(null);

  const orderNumbers = parseOrderNumbers(orderText);

  const run = async (kind: 'list' | 'notes', path: string, body: Record<string, unknown>) => {
    setBusy(kind);
    try {
      await downloadPdf(token, path, body);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'The PDF could not be made.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}>
        <Card title="Price list">
          <Paragraph type="secondary">
            A printable list of what you sell, grouped by brand and category. Only products that group can really buy are listed; shades of one colour line take a single row.
          </Paragraph>
          <Form layout="vertical">
            <Form.Item label="Prices for">
              <Radio.Group value={audience} onChange={(event) => setAudience(event.target.value)}>
                <Radio.Button value="retail">Shoppers (retail prices)</Radio.Button>
                <Radio.Button value="business">Business accounts</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item label="Brands" extra="Leave empty for all brands.">
              <Select mode="multiple" allowClear loading={isLoading} value={brandIds} onChange={setBrandIds} optionFilterProp="label" placeholder="All brands" options={(options?.brands ?? []).map((brand) => ({ value: brand.id, label: brand.name }))} />
            </Form.Item>
            <Form.Item label="Categories" extra="Leave empty for all categories.">
              <Select mode="multiple" allowClear loading={isLoading} value={categoryIds} onChange={setCategoryIds} optionFilterProp="label" placeholder="All categories" options={(options?.categories ?? []).map((category) => ({ value: category.id, label: category.name }))} />
            </Form.Item>
            <Form.Item label="Language">
              <Select value={locale} onChange={setLocale} style={{ maxWidth: 220 }} options={DOCUMENT_LANGUAGES} />
            </Form.Item>
            <Form.Item>
              <Checkbox checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)}>Only products in stock</Checkbox>
            </Form.Item>
            <Button
              type="primary" icon={<FilePdfOutlined />} loading={busy === 'list'}
              onClick={() => run('list', '/v1/admin/price-list/pdf', { audience, locale, brand_ids: brandIds, category_ids: categoryIds, in_stock_only: inStockOnly })}
            >
              Download price list
            </Button>
          </Form>
        </Card>
      </Col>

      <Col xs={24} lg={10}>
        <Card title="Delivery notes for several orders" style={{ marginBottom: 16 }}>
          <Paragraph type="secondary">Type the order numbers you are packing. You get one PDF with one order per page, each in the customer's language.</Paragraph>
          <Input.TextArea rows={3} value={orderText} onChange={(event) => setOrderText(event.target.value)} placeholder="e.g. 41, 42, 45" />
          <div style={{ margin: '8px 0 12px' }}>
            <Text type="secondary">{orderNumbers.length ? `${orderNumbers.length} order${orderNumbers.length === 1 ? '' : 's'}: ${orderNumbers.join(', ')}` : 'No order numbers yet.'}</Text>
          </div>
          <Button icon={<FilePdfOutlined />} disabled={!orderNumbers.length || orderNumbers.length > 100} loading={busy === 'notes'} onClick={() => run('notes', '/v1/admin/orders/delivery-notes', { ids: orderNumbers })}>
            Download delivery notes
          </Button>
        </Card>

        <Alert
          type="info" showIcon
          message="PDFs for one order"
          description={<span>Open an order in <Link to="/admin/orders">Orders</Link> and use <b>Order summary</b> or <b>Delivery note</b>. The order summary is not a fiscal invoice. Your name, address, phone and logo come from the <Link to="/admin/business">Business profile</Link>.</span>}
        />
      </Col>
    </Row>
  );
}
