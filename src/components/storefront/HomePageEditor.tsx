import { useMemo, useState } from 'react';
import { Button, Drawer, Empty, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import {
  type ContentBlock,
  type ContentBlockKind,
  type ContentBlockPayload,
  useCreateContentBlockMutation,
  useDeleteContentBlockMutation,
  useGetContentBlocksQuery,
  useUpdateContentBlockMutation,
} from '@/features/admin/api';
import { extractErrorMessage } from '@/shared/utils/error';

const { Text, Title } = Typography;

type FormValues = {
  kind: ContentBlockKind;
  eyebrow?: string;
  title?: string;
  body?: string;
  image_url?: string;
  action_label?: string;
  action_url?: string;
  items?: Array<{ title?: string; body?: string; imageUrl?: string; actionLabel?: string; actionUrl?: string }>;
  is_published: boolean;
  sort_order: number;
};

const choices: Array<{ value: ContentBlockKind; label: string; help: string }> = [
  { value: 'hero', label: 'Hero banner', help: 'A prominent campaign or seasonal message.' },
  { value: 'bundle_rail', label: 'Bundle offers', help: 'Automatically shows your live offers and bundles.' },
  { value: 'grid', label: 'Card grid', help: 'A row of product, routine, guide, or promotion cards.' },
  { value: 'rich_text', label: 'Text section', help: 'A simple story, guidance, or announcement.' },
  { value: 'cta', label: 'Call to action', help: 'A focused message with one clear button.' },
];

const empty = (sortOrder: number): FormValues => ({ kind: 'bundle_rail', is_published: false, sort_order: sortOrder, items: [] });
const nullable = (value?: string) => value?.trim() || null;

export default function HomePageEditor() {
  const { data: allBlocks = [], isLoading } = useGetContentBlocksQuery();
  const [createBlock] = useCreateContentBlockMutation();
  const [updateBlock] = useUpdateContentBlockMutation();
  const [deleteBlock] = useDeleteContentBlockMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContentBlock | null>(null);
  const [form] = Form.useForm<FormValues>();
  const kind = Form.useWatch('kind', form);
  const blocks = useMemo(() => allBlocks.filter((block) => block.page === 'home').sort((a, b) => a.sortOrder - b.sortOrder), [allBlocks]);

  const openEditor = (block?: ContentBlock) => {
    setEditing(block ?? null);
    form.setFieldsValue(block ? {
      kind: block.kind,
      eyebrow: block.eyebrow ?? undefined,
      title: block.title ?? undefined,
      body: block.body ?? undefined,
      image_url: block.imageUrl ?? undefined,
      action_label: block.actionLabel ?? undefined,
      action_url: block.actionUrl ?? undefined,
      items: block.items,
      is_published: block.isPublished,
      sort_order: block.sortOrder,
    } : empty((blocks.at(-1)?.sortOrder ?? 0) + 10));
    setOpen(true);
  };

  const save = async (values: FormValues) => {
    const payload: ContentBlockPayload = {
      key: editing?.key ?? `home.${Date.now()}`,
      page: 'home',
      section: 'after-hero',
      kind: values.kind,
      eyebrow: nullable(values.eyebrow),
      title: nullable(values.title),
      body: nullable(values.body),
      image_url: nullable(values.image_url),
      action_label: nullable(values.action_label),
      action_url: nullable(values.action_url),
      items: values.items ?? [],
      is_published: values.is_published,
      sort_order: values.sort_order,
    };
    try {
      if (editing) await updateBlock({ id: editing.id, data: payload }).unwrap();
      else await createBlock(payload).unwrap();
      message.success(editing ? 'Homepage section updated' : 'Homepage section added');
      setOpen(false);
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  return <>
    <Button type="primary" icon={<EditOutlined />} onClick={() => setOpen(true)} style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 1000, boxShadow: '0 6px 20px rgba(0,0,0,.2)' }}>
      Edit this page
    </Button>
    <Drawer title="Homepage editor" width={620} open={open} onClose={() => setOpen(false)}>
      {!editing && <>
        <Space direction="vertical" size={3} style={{ marginBottom: 18 }}><Title level={4} style={{ margin: 0 }}>Sections on this page</Title><Text type="secondary">Add offers, bundles, campaign sections, and guidance exactly where customers see them.</Text></Space>
        <Button type="primary" block icon={<PlusOutlined />} onClick={() => openEditor()}>Add a homepage section</Button>
        <Space direction="vertical" style={{ width: '100%', marginTop: 18 }}>
          {isLoading ? <Text>Loading sections…</Text> : blocks.length === 0 ? <Empty description="No custom homepage sections yet." /> : blocks.map((block) => <Space key={block.id} style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}><span><Text strong>{block.title || choices.find((choice) => choice.value === block.kind)?.label}</Text><br /><Text type="secondary">{block.isPublished ? 'Live' : 'Draft'} · {block.kind.replace('_', ' ')}</Text></span><Space><Button icon={<EditOutlined />} onClick={() => openEditor(block)}>Edit</Button><Popconfirm title="Remove this homepage section?" onConfirm={() => deleteBlock(block.id).unwrap().then(() => message.success('Section removed')).catch((error) => message.error(extractErrorMessage(error)))}><Button danger icon={<DeleteOutlined />} /></Popconfirm></Space></Space>)}
        </Space>
      </>}
      {editing !== null || form.getFieldValue('kind') ? <Form form={form} layout="vertical" onFinish={save} style={{ marginTop: editing ? 0 : 20 }}>
        <Button type="link" onClick={() => { setEditing(null); form.resetFields(); }}>← Back to page sections</Button>
        <Form.Item name="kind" label="What do you want to add?" rules={[{ required: true }]}><Select options={choices.map(({ value, label }) => ({ value, label }))} /></Form.Item>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{choices.find((choice) => choice.value === kind)?.help}</Text>
        {kind !== 'bundle_rail' && <>
          <Form.Item name="eyebrow" label="Small label"><Input placeholder="NEW THIS WEEK" /></Form.Item>
          <Form.Item name="title" label="Heading"><Input placeholder="A clear, customer-friendly heading" /></Form.Item>
          <Form.Item name="body" label="Description"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="image_url" label="Image link (optional)"><Input placeholder="https://…" /></Form.Item>
          <Space style={{ display: 'flex' }}><Form.Item name="action_label" label="Button text" style={{ flex: 1 }}><Input placeholder="Shop now" /></Form.Item><Form.Item name="action_url" label="Button link" style={{ flex: 1 }}><Input placeholder="/shop" /></Form.Item></Space>
        </>}
        {kind === 'grid' && <Form.List name="items">{(fields, { add, remove }) => <Space direction="vertical" style={{ width: '100%' }}><Text strong>Cards</Text>{fields.map((field) => <Space key={field.key} direction="vertical" style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, width: '100%' }}><Form.Item {...field} name={[field.name, 'title']} label="Card title"><Input /></Form.Item><Form.Item {...field} name={[field.name, 'body']} label="Card text"><Input.TextArea rows={2} /></Form.Item><Space style={{ display: 'flex' }}><Form.Item {...field} name={[field.name, 'actionLabel']} label="Button" style={{ flex: 1 }}><Input /></Form.Item><Form.Item {...field} name={[field.name, 'actionUrl']} label="Link" style={{ flex: 1 }}><Input placeholder="/shop" /></Form.Item></Space><Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)}>Remove card</Button></Space>)}<Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})}>Add card</Button></Space>}</Form.List>}
        <Space style={{ display: 'flex', marginTop: 18 }}><Form.Item name="sort_order" label="Display order"><InputNumber min={0} /></Form.Item><Form.Item name="is_published" label="Show this on the homepage" valuePropName="checked"><Switch checkedChildren={<EyeOutlined />} /></Form.Item></Space>
        <Button type="primary" htmlType="submit" block size="large">{editing ? 'Save changes' : 'Add section'}</Button>
      </Form> : null}
    </Drawer>
  </>;
}
