import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import { CheckOutlined, CloseOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { useGetBrandsQuery, useGetCategoriesQuery } from '@/features/products/api';
import { formatPrice } from '@/shared/utils/formatPrice';

const API_BASE_URL = import.meta.env.VITE_API_URL as string;
type ReviewStatus = 'confirmed' | 'conflict' | 'ambiguous' | 'missing' | 'resolved';
type AuditRow = {
  key: string; code: string; description: string; page: number; retail: string; wholesale: string;
  status: string; review_status: Exclude<ReviewStatus, 'resolved'>; score: number;
  candidate_id: number; candidate_name: string; candidate_brand: string; candidate_category: string;
  second_score: number; second_candidate: string; source_size_ml?: number | null; candidate_size_ml?: number | null;
  decision?: { type: 'matched' | 'created' | 'not_sold'; product_id?: number } | null;
};
type Response = { data: AuditRow[]; meta: { summary: Record<string, number>; current_page: number; total: number; last_page: number; per_page: number } };

const statusMeta: Record<Exclude<ReviewStatus, 'resolved'>, { label: string; color: string; hint: string }> = {
  confirmed: { label: 'Ready to pair', color: 'green', hint: 'High-confidence existing product. Confirming saves the supplier code.' },
  conflict: { label: 'Size / legacy check', color: 'gold', hint: 'Likely related but size or an old listing differs. Do not overwrite.' },
  ambiguous: { label: 'Needs your decision', color: 'orange', hint: 'A similar product exists, but this may be a different product.' },
  missing: { label: 'Candidate to add', color: 'blue', hint: 'No credible existing product was found. Add only if Tessa will sell it.' },
};

export default function AdminCatalogueReviewPage() {
  const { token } = useAuth();
  const { message, modal } = App.useApp();
  const { data: brands = [] } = useGetBrandsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const [status, setStatus] = useState<ReviewStatus>('missing');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<AuditRow | null>(null);
  const [form] = Form.useForm();

  const headers = useMemo(() => ({ Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }), [token]);
  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '25' });
      if (status) params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`${API_BASE_URL}/v1/admin/catalogue-review?${params}`, { headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Could not load catalogue review.');
      setData(payload);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not load catalogue review.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [token, page, status]);

  const action = async (row: AuditRow, actionName: 'confirm-match' | 'dismiss') => {
    const response = await fetch(`${API_BASE_URL}/v1/admin/catalogue-review/${row.key}/${actionName}`, { method: 'POST', headers });
    const payload = await response.json();
    if (!response.ok) return message.error(payload.message || 'Could not save the decision.');
    message.success(payload.message || 'Saved.');
    void load();
  };
  const openCreate = (row: AuditRow) => {
    setCreating(row);
    form.setFieldsValue({ name: row.description, price: Number(row.retail), stylist_price: Number(row.wholesale), quantity: 0, stylist_only: false });
  };
  const create = async () => {
    if (!creating) return;
    const values = await form.validateFields();
    const response = await fetch(`${API_BASE_URL}/v1/admin/catalogue-review/${creating.key}/create-product`, { method: 'POST', headers, body: JSON.stringify(values) });
    const payload = await response.json();
    if (!response.ok) return message.error(payload.message || 'Could not add the product.');
    message.success('Product added. It starts with zero stock and no image, so it will not accidentally sell before you finish it.');
    setCreating(null);
    void load();
  };
  const summary = data?.meta.summary ?? {};
  const columns = [
    { title: 'Supplier product', key: 'supplier', render: (_: unknown, row: AuditRow) => <Space direction="vertical" size={0}><Typography.Text strong>{row.description}</Typography.Text><Typography.Text type="secondary">Code {row.code || '—'} · PDF page {row.page}</Typography.Text></Space> },
    { title: 'Prices', key: 'prices', render: (_: unknown, row: AuditRow) => <Space direction="vertical" size={0}><Typography.Text>{formatPrice(Number(row.retail))}</Typography.Text><Typography.Text type="secondary">Stylist {formatPrice(Number(row.wholesale))}</Typography.Text></Space> },
    { title: 'Tessa catalogue', key: 'candidate', render: (_: unknown, row: AuditRow) => row.candidate_name ? <Space direction="vertical" size={0}><Typography.Text strong>{row.candidate_name}</Typography.Text><Typography.Text type="secondary">{row.candidate_brand || 'No brand'} · {row.candidate_category || 'No category'} · match {Math.round(row.score * 100)}%</Typography.Text>{row.source_size_ml && row.candidate_size_ml && row.source_size_ml !== row.candidate_size_ml ? <Tag color="gold">{row.source_size_ml}ml vs {row.candidate_size_ml}ml</Tag> : null}</Space> : <Typography.Text type="secondary">No close existing product</Typography.Text> },
    { title: 'Status', key: 'status', render: (_: unknown, row: AuditRow) => row.decision ? <Tag color="purple">{row.decision.type === 'matched' ? 'Paired' : row.decision.type === 'created' ? 'Added' : 'Not sold'}</Tag> : <Tooltip title={statusMeta[row.review_status].hint}><Tag color={statusMeta[row.review_status].color}>{statusMeta[row.review_status].label}</Tag></Tooltip> },
    { title: 'Action', key: 'action', render: (_: unknown, row: AuditRow) => row.decision ? <Typography.Text type="secondary">Done</Typography.Text> : row.review_status === 'confirmed' ? <Button type="primary" icon={<CheckOutlined />} onClick={() => modal.confirm({ title: 'Pair this supplier item?', content: `This will save supplier code ${row.code} on “${row.candidate_name}”.`, onOk: () => action(row, 'confirm-match') })}>Pair product</Button> : row.review_status === 'missing' ? <Space><Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(row)}>Add reviewed product</Button><Button icon={<CloseOutlined />} onClick={() => modal.confirm({ title: 'Mark as not sold?', content: 'It will remain in the audit history but leave your active queue.', onOk: () => action(row, 'dismiss') })}>Not sold</Button></Space> : <Typography.Text type="secondary">Review the product and choose it manually in Products.</Typography.Text> },
  ];

  return <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <div><Typography.Title level={2} style={{ marginBottom: 4 }}>Catalogue Review</Typography.Title><Typography.Text type="secondary">Your supplier price list compared with the live Tessa catalogue. Nothing is bulk-imported.</Typography.Text></div>
    <Row gutter={[16, 16]}>{([
      ['confirmed', 'Ready to pair', summary.confirmed ?? 0, 'green'], ['conflict', 'Size / legacy checks', summary.conflicts ?? 0, 'gold'], ['ambiguous', 'Need a decision', summary.ambiguous ?? 0, 'orange'], ['missing', 'Candidate to add', summary.missing ?? 0, 'blue'],
    ] as const).map(([key, label, value, color]) => <Col xs={12} lg={6} key={key}><Card hoverable onClick={() => { setStatus(key); setPage(1); }} style={{ borderColor: status === key ? `var(--ant-color-${color})` : undefined }}><Statistic title={label} value={value} valueStyle={{ color: status === key ? undefined : '#2A2224' }} /><Tag color={color}>{status === key ? 'Showing this queue' : 'Open queue'}</Tag></Card></Col>)}</Row>
    <Card title={status === 'resolved' ? 'Completed decisions' : statusMeta[status].label} extra={<Space><Button icon={<ReloadOutlined />} onClick={() => void load()}>Refresh</Button><Button onClick={() => { setStatus('resolved'); setPage(1); }}>Completed ({summary.resolved ?? 0})</Button></Space>}>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}><Col xs={24} md={14}><Input value={search} onChange={(event) => setSearch(event.target.value)} onPressEnter={() => { setPage(1); void load(); }} prefix={<SearchOutlined />} allowClear placeholder="Search supplier code, product name, brand, or Tessa match" /></Col><Col><Button type="primary" onClick={() => { setPage(1); void load(); }}>Search</Button></Col></Row>
      {data?.data.length === 0 && !loading ? <Empty description="Nothing in this queue." /> : <Table loading={loading} dataSource={data?.data ?? []} columns={columns} rowKey="key" scroll={{ x: 1050 }} pagination={{ current: page, pageSize: 25, total: data?.meta.total ?? 0, onChange: setPage, showSizeChanger: false, showTotal: (total) => `${total} supplier items` }} />}
    </Card>
    <Modal title="Add reviewed supplier product" open={Boolean(creating)} onCancel={() => setCreating(null)} onOk={() => void create()} okText="Add product safely" destroyOnClose>
      <Typography.Paragraph type="secondary">This creates one product only, sets the supplier code, starts at zero stock, and leaves images for the Image Review area.</Typography.Paragraph>
      <Form form={form} layout="vertical"><Form.Item name="name" label="Product name" rules={[{ required: true }]}><Input /></Form.Item><Row gutter={12}><Col span={12}><Form.Item name="price" label="Retail price" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="stylist_price" label="Stylist price"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col></Row><Row gutter={12}><Col span={12}><Form.Item name="brand_id" label="Brand" rules={[{ required: true, message: 'Choose a brand' }]}><Select showSearch optionFilterProp="label" options={brands.map((brand) => ({ value: Number(brand.id), label: brand.name }))} /></Form.Item></Col><Col span={12}><Form.Item name="category_id" label="Category" rules={[{ required: true, message: 'Choose a category' }]}><Select showSearch optionFilterProp="label" options={categories.map((category) => ({ value: Number(category.id), label: category.name }))} /></Form.Item></Col></Row><Form.Item name="quantity" label="Starting stock" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Form>
    </Modal>
  </Space>;
}
