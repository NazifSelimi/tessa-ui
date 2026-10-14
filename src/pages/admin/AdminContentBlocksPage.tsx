import { useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  type ContentBlock,
  type ContentBlockItem,
  type ContentBlockKind,
  type ContentBlockPayload,
  useCreateContentBlockMutation,
  useDeleteContentBlockMutation,
  useGetContentBlocksQuery,
  useUpdateContentBlockMutation,
} from '@/features/admin/api';
import { extractErrorMessage } from '@/shared/utils/error';

const { Title, Text } = Typography;

type ContentBlockForm = {
  key: string;
  page: string;
  section: string;
  kind: ContentBlockKind;
  eyebrow?: string;
  title?: string;
  body?: string;
  image_url?: string;
  action_label?: string;
  action_url?: string;
  items_json?: string;
  is_published: boolean;
  sort_order: number;
};

const kindOptions: Array<{ value: ContentBlockKind; label: string }> = [
  { value: 'hero', label: 'Hero banner' },
  { value: 'grid', label: 'Card grid (products, bundles, guides)' },
  { value: 'rich_text', label: 'Rich text section' },
  { value: 'cta', label: 'Call to action' },
];

function nullIfEmpty(value?: string): string | null {
  return value?.trim() || null;
}

export default function AdminContentBlocksPage() {
  const { data: blocks = [], isLoading } = useGetContentBlocksQuery();
  const [createBlock] = useCreateContentBlockMutation();
  const [updateBlock] = useUpdateContentBlockMutation();
  const [deleteBlock] = useDeleteContentBlockMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContentBlock | null>(null);
  const [form] = Form.useForm<ContentBlockForm>();

  const openEditor = (block?: ContentBlock) => {
    setEditing(block ?? null);
    form.setFieldsValue(block ? {
      key: block.key,
      page: block.page,
      section: block.section,
      kind: block.kind,
      eyebrow: block.eyebrow ?? undefined,
      title: block.title ?? undefined,
      body: block.body ?? undefined,
      image_url: block.imageUrl ?? undefined,
      action_label: block.actionLabel ?? undefined,
      action_url: block.actionUrl ?? undefined,
      items_json: JSON.stringify(block.items ?? [], null, 2),
      is_published: block.isPublished,
      sort_order: block.sortOrder,
    } : {
      page: 'home',
      section: 'main',
      kind: 'grid',
      items_json: '[]',
      is_published: false,
      sort_order: 0,
    });
    setOpen(true);
  };

  const submit = async (values: ContentBlockForm) => {
    let items: ContentBlockItem[] = [];
    try {
      const parsed = JSON.parse(values.items_json || '[]');
      if (!Array.isArray(parsed)) throw new Error('Cards must be a JSON array.');
      items = parsed;
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Cards must be valid JSON.');
      return;
    }

    const payload: ContentBlockPayload = {
      key: values.key.trim(),
      page: values.page.trim(),
      section: values.section.trim(),
      kind: values.kind,
      eyebrow: nullIfEmpty(values.eyebrow),
      title: nullIfEmpty(values.title),
      body: nullIfEmpty(values.body),
      image_url: nullIfEmpty(values.image_url),
      action_label: nullIfEmpty(values.action_label),
      action_url: nullIfEmpty(values.action_url),
      items,
      is_published: Boolean(values.is_published),
      sort_order: Number(values.sort_order ?? 0),
    };

    try {
      if (editing) {
        await updateBlock({ id: editing.id, data: payload }).unwrap();
      } else {
        await createBlock(payload).unwrap();
      }
      message.success(editing ? 'Content block updated' : 'Content block created');
      setOpen(false);
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  return <div>
    <Space direction="vertical" size={4} style={{ marginBottom: 24 }}>
      <Title level={2} style={{ margin: 0 }}>Editable sections</Title>
      <Text type="secondary">Build reusable homepage, campaign, guide, and bundle sections without changing code. Draft first, then publish when ready.</Text>
    </Space>
    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()} style={{ marginLeft: 16, marginBottom: 24 }}>
      Add section
    </Button>

    <Table
      loading={isLoading}
      rowKey="id"
      dataSource={blocks}
      pagination={{ pageSize: 12 }}
      columns={[
        { title: 'Section', render: (_: unknown, row: ContentBlock) => <Space direction="vertical" size={0}><Text strong>{row.title || row.key}</Text><Text type="secondary">{row.page} / {row.section}</Text></Space> },
        { title: 'Type', dataIndex: 'kind', render: (kind: ContentBlockKind) => <Tag color={kind === 'grid' ? 'blue' : 'purple'}>{kind.replace('_', ' ')}</Tag> },
        { title: 'Cards', render: (_: unknown, row: ContentBlock) => row.items.length },
        { title: 'Status', render: (_: unknown, row: ContentBlock) => row.isPublished ? <Tag color="success">Published</Tag> : <Tag>Draft</Tag> },
        { title: '', render: (_: unknown, row: ContentBlock) => <Space><Button icon={<EditOutlined />} onClick={() => openEditor(row)}>Edit</Button><Popconfirm title="Delete this content section?" onConfirm={() => deleteBlock(row.id).unwrap().catch((error) => message.error(extractErrorMessage(error)))}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space> },
      ]}
    />

    <Drawer title={editing ? 'Edit section' : 'Add editable section'} width={620} open={open} onClose={() => setOpen(false)}>
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="key" label="Internal key" extra="Lowercase letters, numbers, dots, underscores and hyphens only. This never appears to shoppers." rules={[{ required: true }, { pattern: /^[a-z0-9._-]+$/, message: 'Use lowercase letters, numbers, dots, underscores or hyphens.' }]}><Input placeholder="home.autumn-routine" /></Form.Item>
        <Space style={{ display: 'flex' }} size={12}>
          <Form.Item name="page" label="Page" rules={[{ required: true }]} style={{ flex: 1 }}><Input placeholder="home" /></Form.Item>
          <Form.Item name="section" label="Section area" rules={[{ required: true }]} style={{ flex: 1 }}><Input placeholder="after-hero" /></Form.Item>
          <Form.Item name="sort_order" label="Order" rules={[{ required: true }]}><InputNumber min={0} max={10000} /></Form.Item>
        </Space>
        <Form.Item name="kind" label="Section type" rules={[{ required: true }]}><Select options={kindOptions} /></Form.Item>
        <Form.Item name="eyebrow" label="Eyebrow / small label"><Input placeholder="SALON FAVOURITES" /></Form.Item>
        <Form.Item name="title" label="Title"><Input placeholder="Build your autumn hair routine" /></Form.Item>
        <Form.Item name="body" label="Description"><Input.TextArea rows={4} placeholder="A short explanation that helps shoppers choose." /></Form.Item>
        <Form.Item name="image_url" label="Image URL"><Input placeholder="https://…" /></Form.Item>
        <Space style={{ display: 'flex' }} size={12}>
          <Form.Item name="action_label" label="Button label" style={{ flex: 1 }}><Input placeholder="Shop the routine" /></Form.Item>
          <Form.Item name="action_url" label="Button link" style={{ flex: 1 }}><Input placeholder="/shop" /></Form.Item>
        </Space>
        <Form.Item name="items_json" label="Grid cards (optional)" extra={'For card grids, paste a JSON list. Example: [{"title":"Salon restock","body":"Save with a bundle","actionLabel":"See offer","actionUrl":"/shop"}]'}>
          <Input.TextArea rows={9} spellCheck={false} />
        </Form.Item>
        <Form.Item name="is_published" valuePropName="checked" label="Published"><Switch /></Form.Item>
        <Button type="primary" htmlType="submit" block size="large">{editing ? 'Save section' : 'Create section'}</Button>
      </Form>
    </Drawer>
  </div>;
}
