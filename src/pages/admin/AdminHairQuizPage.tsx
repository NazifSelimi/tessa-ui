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
  type QuizStep,
} from '@/features/admin/hairQuizApi';
import { extractErrorMessage } from '@/shared/utils/error';

const { Title, Text, Paragraph } = Typography;

const MODE_OPTIONS: { value: QuizMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'featured', label: 'Featured' },
  { value: 'hidden', label: 'Hidden' },
];
const MODE_COLORS: Record<QuizMode, string> = { auto: 'default', featured: 'gold', hidden: 'red' };

const STEP_OPTIONS: { value: QuizStep; label: string }[] = [
  { value: 'shampoo', label: 'Shampoo' },
  { value: 'conditioner', label: 'Conditioner' },
  { value: 'mask', label: 'Mask' },
  { value: 'leave_in', label: 'Leave-in / serum' },
  { value: 'scalp', label: 'Scalp treatment' },
  { value: 'style', label: 'Styling' },
];
const STEP_LABEL = Object.fromEntries(STEP_OPTIONS.map((o) => [o.value, o.label])) as Record<string, string>;
const ROUTINE_LABEL: Record<string, string> = { shampoo: 'Shampoo', condition: 'Conditioner / mask', leave_in: 'Leave-in', scalp: 'Scalp', style: 'Styling' };

export default function AdminHairQuizPage() {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<QuizMode | undefined>();
  const [tagged, setTagged] = useState<'yes' | 'no' | undefined>();
  const [stock, setStock] = useState<'in' | 'out' | undefined>();
  const [step, setStep] = useState<QuizStep | 'none' | undefined>();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [previewTypes, setPreviewTypes] = useState<number[]>([]);
  const [previewConcerns, setPreviewConcerns] = useState<number[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const { data: options } = useGetHairProfileOptionsQuery();
  const { data, isFetching, isError, refetch } = useGetHairQuizProductsQuery({
    search: debouncedSearch || undefined, mode, tagged, stock, step, page, per_page: perPage,
  });
  const [updateProduct] = useUpdateHairQuizProductMutation();
  const [runPreview, { data: preview, isLoading: previewLoading, reset: resetPreview }] = usePreviewHairQuizMutation();

  const typeOptions = (options?.hairTypes ?? []).map((item) => ({ value: Number(item.id), label: item.name }));
  const concernOptions = (options?.hairConcerns ?? []).map((item) => ({ value: Number(item.id), label: item.gated ? `${item.name} (only if chosen)` : item.name }));
  const concernName = Object.fromEntries((options?.hairConcerns ?? []).map((item) => [Number(item.id), item.name])) as Record<number, string>;

  const save = async (product: HairQuizProduct, change: { quiz_mode?: QuizMode; quiz_step?: QuizStep | null; hair_type_ids?: number[]; hair_concern_ids?: number[] }) => {
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
        The quiz builds a routine (shampoo → conditioner/mask → leave-in → scalp → styling) from in-stock care products.
        A product needs a <strong>step</strong> (empty = taken from its category; hydrogen, bleach and colour have none) and the
        <strong> needs</strong> it answers. <strong>Hair types</strong> limit who gets it: no type = suits everyone; tagged pattern or
        thickness = only those. Needs marked "only if chosen" (toners, colour masks) are never shown to others.
        <strong> Featured</strong> products are ranked first when they match; <strong>Hidden</strong> products are never recommended.
      </Paragraph>

      <Card title="Preview what a customer sees" style={{ marginBottom: 24 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select style={{ minWidth: 220 }} mode="multiple" placeholder="Hair types" options={typeOptions} value={previewTypes} onChange={setPreviewTypes} />
          <Select style={{ minWidth: 260 }} mode="multiple" allowClear placeholder="Concerns (optional)" options={concernOptions} value={previewConcerns} onChange={setPreviewConcerns} />
          <Button type="primary" disabled={!previewTypes.length} loading={previewLoading} onClick={() => void runPreview({ hair_type_ids: previewTypes, concerns: previewConcerns }).unwrap().catch((error) => message.error(extractErrorMessage(error)))}>
            Show recommendations
          </Button>
        </Space>
        {preview && (preview.length ? (
          <List
            size="small"
            dataSource={preview}
            renderItem={(item, index) => (
              <List.Item extra={<Space>{item.routineStep && <Tag color="magenta">Routine: {ROUTINE_LABEL[item.routineStep] ?? item.routineStep}</Tag>}<Tag color={MODE_COLORS[item.quizMode]}>{item.quizMode}</Tag><Text type="secondary">score {item.score}</Text></Space>}>
                <List.Item.Meta
                  avatar={<Avatar shape="square" src={item.image ?? undefined}>{index + 1}</Avatar>}
                  title={`${index + 1}. ${item.name}`}
                  description={<>{[item.brand, item.effectiveStep && STEP_LABEL[item.effectiveStep]].filter(Boolean).join(' · ')}{item.matchedNeedIds?.length ? <div>{item.matchedNeedIds.map((id) => <Tag key={id} bordered={false}>{concernName[id] ?? id}</Tag>)}</div> : null}</>}
                />
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
          <Select allowClear placeholder="Step" style={{ width: 180 }} value={step} onChange={filterChange(setStep)} options={[...STEP_OPTIONS, { value: 'none', label: 'No step set' }]} />
        </Space>
        {isError && <Alert type="error" showIcon message="Could not load products." action={<Button size="small" onClick={() => void refetch()}>Retry</Button>} style={{ marginBottom: 16 }} />}
        <Table<HairQuizProduct>
          rowKey="id"
          loading={isFetching}
          dataSource={data?.data ?? []}
          scroll={{ x: 1200 }}
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
              title: 'Step', key: 'step', width: 190,
              render: (_, product) => (
                <Select<QuizStep | null>
                  allowClear
                  style={{ width: '100%' }}
                  placeholder={product.effectiveStep ? `${STEP_LABEL[product.effectiveStep]} (category)` : 'Not in quiz'}
                  options={STEP_OPTIONS}
                  value={product.quizStep ?? undefined}
                  onChange={(value) => void save(product, { quiz_step: value ?? null })}
                />
              ),
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
