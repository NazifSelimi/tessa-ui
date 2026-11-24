/**
 * Admin → Offers & Bundles: every offer in one list with search and filters,
 * quick switches (live, featured), who sees it (everyone / salons / shoppers),
 * start and end dates, its shop picture, duplicate and delete, and bulk
 * changes for many offers at once.
 */
import { useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  App, Button, Card, DatePicker, Dropdown, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Space, Switch, Table, Tag, Tooltip, Typography,
} from 'antd';
import { CopyOutlined, DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, SearchOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import {
  useBulkBundlesMutation, useDeleteBundleMutation, useGetAdminBundlesQuery, useUpdateBundleMutation,
  type BundleBulkAction,
} from '@/features/admin/api';
import type { BundleAudience, StoreBundle } from '@/types';
import { extractErrorMessage } from '@/shared/utils/error';
import { formatDate } from '@/shared/utils/formatDate';
import PricingSettingsCard from '@/components/PricingSettingsCard';
import { BundlePictureThumb } from '@/features/admin/BundlePicture';
import BundleEditorDrawer from '@/features/admin/BundleEditorDrawer';
import { AUDIENCES } from '@/features/admin/bundleOptions';

const { Title, Text } = Typography;


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

const ruleSummary = (bundle: StoreBundle) => (bundle.promotionType === 'mix_match'
  ? (bundle.tiers ?? []).map((tier) => `${tier.min}${tier.free ? `+${tier.free}` : ''}${tier.gift ? '🎁' : ''}`).join(' · ') || 'steps'
  : bundle.promotionType === 'percentage' && bundle.discountPercentage ? `-${Number(bundle.discountPercentage)}%`
  : bundle.promotionType === 'fixed_price' && bundle.bundlePrice ? `${Math.round(bundle.bundlePrice)} MKD` : bundle.promotionType === 'bonus_items' ? 'free items' : '—');


export default function AdminBundlesPage() {
  const { message } = App.useApp();
  const { data: bundles = [], isLoading } = useGetAdminBundlesQuery();
  const [updateBundle, { isLoading: updating }] = useUpdateBundleMutation();
  const [deleteBundle] = useDeleteBundleMutation();
  const [bulkBundles, { isLoading: bulkBusy }] = useBulkBundlesMutation();
  const [editor, setEditor] = useState<{ bundle: StoreBundle | null; copy: boolean } | null>(null);

  // List filters.
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [audience, setAudience] = useState<BundleAudience | 'any'>('any');
  const [picture, setPicture] = useState<'any' | 'with' | 'without'>('any');
  const [selected, setSelected] = useState<string[]>([]);
  // Bulk change that needs a value (audience / discount / end date).
  const [bulkAsk, setBulkAsk] = useState<null | 'audience' | 'discount' | 'ends_at'>(null);
  const [bulkValue, setBulkValue] = useState<string | number | Dayjs | null>(null);


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


  /** Opens the editor: an offer, a copy of one (saved as a new draft), or a new one. */
  const openEditor = (bundle?: StoreBundle, copy = false) => setEditor({ bundle: bundle ?? null, copy });

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
              <Text type="secondary" style={{ fontSize: 12 }}>{row.promotionType === 'mix_match' ? `${row.familyName ?? 'colour line'} · any shades · ${row.products.length} gift choices` : `${row.products.length} products · ${row.products.reduce((sum, item) => sum + item.quantity, 0)} pcs`}</Text>
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

      <BundleEditorDrawer open={editor !== null} bundle={editor?.bundle ?? null} copy={editor?.copy} onClose={() => setEditor(null)} />
    </div>
  );
}
