import { useState } from 'react';
import { Alert, App, Avatar, Button, Card, Empty, Input, List, Segmented, Select, Space, Table, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useDebounce } from '@/hooks/useDebounce';
import { useGetHairProfileOptionsQuery } from '@/features/products/api';
import {
  useGetHairQuizProductsQuery,
  usePreviewHairQuizMutation,
  useUpdateHairQuizProductMutation,
  type HairQuizProduct,
  type QuizMode,
} from '@/features/admin/hairQuizApi';
import { extractErrorMessage } from '@/shared/utils/error';

const { Title, Text, Paragraph } = Typography;

const MODE_OPTIONS: { value: QuizMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'featured', label: 'Featured' },
  { value: 'hidden', label: 'Hidden' },
];
const MODE_COLORS: Record<QuizMode, string> = { auto: 'default', featured: 'gold', hidden: 'red' };

export default function AdminHairQuizPage() {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<QuizMode | undefined>();
  const [tagged, setTagged] = useState<'yes' | 'no' | undefined>();
  const [stock, setStock] = useState<'in' | 'out' | undefined>();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [previewType, setPreviewType] = useState<number | undefined>();
  const [previewConcerns, setPreviewConcerns] = useState<number[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const { data: options } = useGetHairProfileOptionsQuery();
  const { data, isFetching, isError, refetch } = useGetHairQuizProductsQuery({
    search: debouncedSearch || undefined, mode, tagged, stock, page, per_page: perPage,
  });
  const [updateProduct] = useUpdateHairQuizProductMutation();
  const [runPreview, { data: preview, isLoading: previewLoading, reset: resetPreview }] = usePreviewHairQuizMutation();

  const typeOptions = (options?.hairTypes ?? []).map((item) => ({ value: Number(item.id), label: item.name }));
  const concernOptions = (options?.hairConcerns ?? []).map((item) => ({ value: Number(item.id), label: item.name }));

  const save = async (product: HairQuizProduct, change: { quiz_mode?: QuizMode; hair_type_ids?: number[]; hair_concern_ids?: number[] }) => {
    try {
      await updateProduct({ id: product.id, ...change }).unwrap();
      message.success(`Saved ${product.name}`);
      // A preview on screen would now be stale.
      resetPreview();
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  const filterChange = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(1); };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 4 }}>Hair quiz</Title>
      <Paragraph type="secondary" style={{ maxWidth: 760 }}>
        The quiz recommends in-stock products tagged with the customer's hair type or concerns.
        <strong> Featured</strong> products are ranked first when they match; <strong>Hidden</strong> products are never recommended.
        Products without any tags are never shown by the quiz.
      </Paragraph>

      <Card title="Preview what a customer sees" style={{ marginBottom: 24 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select style={{ width: 200 }} placeholder="Hair type" options={typeOptions} value={previewType} onChange={setPreviewType} />
          <Select style={{ minWidth: 260 }} mode="multiple" allowClear placeholder="Concerns (optional)" options={concernOptions} value={previewConcerns} onChange={setPreviewConcerns} />
          <Button type="primary" disabled={!previewType} loading={previewLoading} onClick={() => previewType && void runPreview({ hair_type_id: previewType, concerns: previewConcerns }).unwrap().catch((error) => message.error(extractErrorMessage(error)))}>
            Show recommendations
          </Button>
        </Space>
        {preview && (preview.length ? (
          <List
            size="small"
            dataSource={preview}
            renderItem={(item, index) => (
              <List.Item extra={<Space><Tag color={MODE_COLORS[item.quizMode]}>{item.quizMode}</Tag><Text type="secondary">score {item.score}</Text></Space>}>
                <List.Item.Meta avatar={<Avatar shape="square" src={item.image ?? undefined}>{index + 1}</Avatar>} title={`${index + 1}. ${item.name}`} description={[item.brand, item.category].filter(Boolean).join(' · ')} />
              </List.Item>
            )}
          />
        ) : <Empty description="No in-stock products match this profile. Tag more products below." />)}
      </Card>

      <Card title="Products">
        <Space wrap style={{ marginBottom: 16 }}>
          <Input allowClear prefix={<SearchOutlined />} placeholder="Search products" style={{ width: 240 }} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          <Select allowClear placeholder="Quiz mode" style={{ width: 150 }} options={MODE_OPTIONS} value={mode} onChange={filterChange(setMode)} />
          <Select allowClear placeholder="Tags" style={{ width: 150 }} value={tagged} onChange={filterChange(setTagged)} options={[{ value: 'yes', label: 'Tagged' }, { value: 'no', label: 'Not tagged' }]} />
          <Select allowClear placeholder="Stock" style={{ width: 150 }} value={stock} onChange={filterChange(setStock)} options={[{ value: 'in', label: 'In stock' }, { value: 'out', label: 'Out of stock' }]} />
        </Space>
        {isError && <Alert type="error" showIcon message="Could not load products." action={<Button size="small" onClick={() => void refetch()}>Retry</Button>} style={{ marginBottom: 16 }} />}
        <Table<HairQuizProduct>
          rowKey="id"
          loading={isFetching}
          dataSource={data?.data ?? []}
          scroll={{ x: 1000 }}
          pagination={{
            current: page, pageSize: perPage, total: data?.meta?.total ?? 0, showSizeChanger: true, pageSizeOptions: [25, 50, 100],
            showTotal: (total) => `${total} products`,
            onChange: (nextPage, nextSize) => { setPage(nextSize !== perPage ? 1 : nextPage); setPerPage(nextSize); },
          }}
          columns={[
            {
              title: 'Product', key: 'product', width: 300,
              render: (_, product) => (
                <Space>
                  <Avatar shape="square" size={44} src={product.image ?? undefined} />
                  <div>
                    <Text strong>{product.name}</Text>
                    <div><Text type="secondary">{[product.brand, product.category].filter(Boolean).join(' · ')}</Text></div>
                  </div>
                </Space>
              ),
            },
            {
              title: 'Stock', dataIndex: 'quantity', width: 90,
              render: (quantity: number) => quantity > 0 ? <Tag color="green">{quantity}</Tag> : <Tag color="red">Out</Tag>,
            },
            {
              title: 'Hair types', key: 'types', width: 220,
              render: (_, product) => <Select mode="multiple" allowClear style={{ width: '100%' }} placeholder="None" options={typeOptions} value={product.hairTypeIds} onChange={(ids: number[]) => void save(product, { hair_type_ids: ids })} />,
            },
            {
              title: 'Concerns', key: 'concerns', width: 220,
              render: (_, product) => <Select mode="multiple" allowClear style={{ width: '100%' }} placeholder="None" options={concernOptions} value={product.hairConcernIds} onChange={(ids: number[]) => void save(product, { hair_concern_ids: ids })} />,
            },
            {
              title: 'In quiz', key: 'mode', width: 250,
              render: (_, product) => <Segmented<QuizMode> options={MODE_OPTIONS} value={product.quizMode} onChange={(value) => void save(product, { quiz_mode: value })} />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
