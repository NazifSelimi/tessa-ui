import { useCallback, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Empty, Input, InputNumber, Popconfirm, Segmented, Select, Space, Table, Tag, Tooltip, Typography, message,
} from 'antd';
import type { TableProps } from 'antd';
import { DeleteOutlined, DownloadOutlined, PlayCircleOutlined, PlusOutlined, SaveOutlined, SwapOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import {
  useDeleteSavedQueryMutation, useGetQuerySchemaQuery, useGetSavedQueriesQuery, useLazyRunQueryQuery, useSaveQueryMutation,
  type Operator, type QueryColumn, type QueryCondition, type QueryEntity, type QueryField, type QueryGroup, type QuerySort, type SavedQuery,
} from '@/features/admin/queryToolApi';
import { toCsvText } from '@/shared/utils/csv';

/**
 * Query tool: filter products, orders or customers with field / operator / value
 * rows (or field vs field, e.g. price < stylist price), AND/OR groups, ready-made
 * presets and saved queries. The server checks every field and operator.
 */

const OP_LABELS: Record<Operator, string> = {
  eq: '=', neq: '≠', lt: '<', lte: '≤', gt: '>', gte: '≥', between: 'between',
  empty: 'is empty', not_empty: 'is not empty',
  contains: 'contains', not_contains: "doesn't contain", starts_with: 'starts with', ends_with: 'ends with',
  is_true: 'is yes', is_false: 'is no', in: 'is any of', not_in: 'is none of',
};
const NO_VALUE: Operator[] = ['empty', 'not_empty', 'is_true', 'is_false'];
const FIELD_OPS: Operator[] = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte'];
const ENUM_TEXT_OPS: Operator[] = ['eq', 'neq'];

// Editor state: like the API shape, plus ids for React keys and the "compare with a field" switch.
type Cond = { id: string; kind: 'cond'; field: string; op: Operator; value?: unknown; mode: 'value' | 'field' };
type Group = { id: string; kind: 'group'; logic: 'and' | 'or'; items: Node[] };
type Node = Cond | Group;

let seq = 0;
const nid = () => `n${++seq}`;

function newCond(entity: QueryEntity, fieldName?: string): Cond {
  const field = entity.fields.find((f) => f.name === fieldName) ?? entity.fields[0];
  return { id: nid(), kind: 'cond', field: field.name, op: field.operators[0], value: undefined, mode: 'value' };
}

function fromApi(group: QueryGroup): Group {
  return {
    id: nid(),
    kind: 'group',
    logic: group.logic === 'or' ? 'or' : 'and',
    items: (group.conditions ?? []).map((item): Node => {
      if ('conditions' in item) return fromApi(item);
      const c = item as QueryCondition;
      const isField = !!c.value && typeof c.value === 'object' && !Array.isArray(c.value) && 'field' in (c.value as object);
      return { id: nid(), kind: 'cond', field: c.field, op: c.op, value: isField ? (c.value as { field: string }).field : c.value, mode: isField ? 'field' : 'value' };
    }),
  };
}

function toApi(group: Group): QueryGroup {
  return {
    logic: group.logic,
    conditions: group.items.map((item) => {
      if (item.kind === 'group') return toApi(item);
      const out: QueryCondition = { field: item.field, op: item.op };
      if (!NO_VALUE.includes(item.op)) out.value = item.mode === 'field' ? { field: item.value } : item.value;
      return out;
    }),
  };
}

/** Plain-language version of the query, e.g. "Price < Stylist price AND Stock ≤ 0". */
function describe(group: Group, entity: QueryEntity, top = true): string {
  const label = (name: string) => entity.fields.find((f) => f.name === name)?.label ?? name;
  const parts = group.items.map((item) => {
    if (item.kind === 'group') return item.items.length ? `(${describe(item, entity, false)})` : '';
    const field = entity.fields.find((f) => f.name === item.field);
    let value = '';
    if (!NO_VALUE.includes(item.op)) {
      if (item.mode === 'field') value = ` ${label(String(item.value ?? '?'))}`;
      else if (Array.isArray(item.value)) {
        const names = item.value.map((v) => field?.options?.find((o) => String(o.value) === String(v))?.label ?? String(v));
        value = item.op === 'between' ? ` ${names[0] ?? '?'} and ${names[1] ?? '?'}` : ` ${names.join(', ')}`;
      } else value = ` ${item.value ?? '?'}`;
    }
    return `${label(item.field)} ${OP_LABELS[item.op]}${value}`;
  }).filter(Boolean);
  const text = parts.join(group.logic === 'or' ? ' OR ' : ' AND ');
  return top && !text ? 'Everything (no conditions)' : text;
}

function isComplete(group: Group): boolean {
  return group.items.every((item) => {
    if (item.kind === 'group') return isComplete(item);
    if (NO_VALUE.includes(item.op)) return true;
    if (item.op === 'between') return Array.isArray(item.value) && item.value.length === 2 && item.value.every((v) => v !== null && v !== undefined && v !== '');
    if (Array.isArray(item.value)) return item.value.length > 0;
    return item.value !== undefined && item.value !== null && item.value !== '';
  });
}

function update(group: Group, id: string, fn: (node: Node) => Node | null): Group {
  return {
    ...group,
    items: group.items.flatMap((item) => {
      if (item.id === id) {
        const next = fn(item);
        return next ? [next] : [];
      }
      return item.kind === 'group' ? [update(item, id, fn)] : [item];
    }),
  };
}

function ValueInput({ field, cond, entity, onChange }: { field: QueryField; cond: Cond; entity: QueryEntity; onChange: (value: unknown) => void }) {
  if (NO_VALUE.includes(cond.op)) return null;

  if (cond.mode === 'field') {
    const others = entity.fields.filter((f) => f.comparable && f.type === field.type && f.name !== field.name);
    return (
      <Select
        style={{ minWidth: 180 }}
        placeholder="Pick a field"
        value={cond.value as string | undefined}
        onChange={onChange}
        options={others.map((f) => ({ value: f.name, label: f.label }))}
      />
    );
  }

  if (field.type === 'ref' || field.type === 'enum') {
    return (
      <Select
        mode="multiple"
        allowClear
        showSearch
        optionFilterProp="label"
        style={{ minWidth: 220, maxWidth: 420 }}
        placeholder="Choose…"
        value={(cond.value as (string | number)[] | undefined) ?? []}
        onChange={onChange}
        options={field.options?.map((o) => ({ value: o.value, label: o.label }))}
      />
    );
  }

  const single = (value: unknown, set: (v: unknown) => void, placeholder?: string) => {
    if (field.type === 'number' || field.type === 'count') {
      return <InputNumber style={{ width: 120 }} placeholder={placeholder} value={value as number | undefined} onChange={(v) => set(v ?? undefined)} />;
    }
    if (field.type === 'date') {
      return <Input type="date" style={{ width: 160 }} value={(value as string | undefined) ?? ''} onChange={(e) => set(e.target.value || undefined)} />;
    }
    return <Input style={{ width: 200 }} placeholder={placeholder ?? 'Text'} value={(value as string | undefined) ?? ''} onChange={(e) => set(e.target.value)} />;
  };

  if (cond.op === 'between') {
    const range = Array.isArray(cond.value) ? cond.value : [undefined, undefined];
    return (
      <Space size={4}>
        {single(range[0], (v) => onChange([v, range[1]]), 'from')}
        <span>and</span>
        {single(range[1], (v) => onChange([range[0], v]), 'to')}
      </Space>
    );
  }

  return single(cond.value, onChange);
}

function GroupEditor({ group, entity, depth, onChange, onRemove }: {
  group: Group; entity: QueryEntity; depth: number; onChange: (id: string, fn: (node: Node) => Node | null) => void; onRemove?: () => void;
}) {
  return (
    <div className={depth > 0 ? 'query-group query-group--nested' : 'query-group'} style={depth > 0 ? { borderLeft: '3px solid #d9d9d9', paddingLeft: 12, margin: '8px 0' } : undefined}>
      <Space wrap style={{ marginBottom: 8 }}>
        <span>Match</span>
        <Segmented
          size="small"
          value={group.logic}
          onChange={(v) => onChange(group.id, (n) => ({ ...(n as Group), logic: v as 'and' | 'or' }))}
          options={[{ value: 'and', label: 'ALL (and)' }, { value: 'or', label: 'ANY (or)' }]}
        />
        <span>of these:</span>
        {onRemove && <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onRemove}>Remove group</Button>}
      </Space>

      {group.items.map((item) => {
        if (item.kind === 'group') {
          return <GroupEditor key={item.id} group={item} entity={entity} depth={depth + 1} onChange={onChange} onRemove={() => onChange(item.id, () => null)} />;
        }
        const field = entity.fields.find((f) => f.name === item.field) ?? entity.fields[0];
        const canCompare = field.comparable && FIELD_OPS.includes(item.op)
          && entity.fields.some((f) => f.comparable && f.type === field.type && f.name !== field.name);
        const ops = field.type === 'text' && item.mode === 'field' ? ENUM_TEXT_OPS : field.operators;
        return (
          <Space key={item.id} wrap align="center" style={{ display: 'flex', marginBottom: 8 }}>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: 200 }}
              value={item.field}
              onChange={(name) => {
                const next = entity.fields.find((f) => f.name === name)!;
                onChange(item.id, () => ({ ...item, field: name, op: next.operators.includes(item.op) ? item.op : next.operators[0], value: undefined, mode: 'value' }));
              }}
              options={entity.fields.map((f) => ({ value: f.name, label: f.label }))}
            />
            <Select
              style={{ width: 150 }}
              value={item.op}
              onChange={(op: Operator) => onChange(item.id, () => ({
                ...item,
                op,
                mode: FIELD_OPS.includes(op) ? item.mode : 'value',
                value: op === 'between' || item.op === 'between' ? undefined : item.value,
              }))}
              options={ops.map((op) => ({ value: op, label: OP_LABELS[op] }))}
            />
            <ValueInput field={field} cond={item} entity={entity} onChange={(value) => onChange(item.id, () => ({ ...item, value }))} />
            {canCompare && (
              <Tooltip title={item.mode === 'field' ? 'Compare with a number you type' : 'Compare with another field (e.g. price < stylist price)'}>
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  type={item.mode === 'field' ? 'primary' : 'default'}
                  onClick={() => onChange(item.id, () => ({ ...item, mode: item.mode === 'field' ? 'value' : 'field', value: undefined }))}
                >
                  {item.mode === 'field' ? 'field' : 'value'}
                </Button>
              </Tooltip>
            )}
            <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Remove condition" onClick={() => onChange(item.id, () => null)} />
          </Space>
        );
      })}

      <Space>
        <Button size="small" icon={<PlusOutlined />} onClick={() => onChange(group.id, (n) => ({ ...(n as Group), items: [...(n as Group).items, newCond(entity)] }))}>
          Condition
        </Button>
        {depth < 2 && (
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => onChange(group.id, (n) => ({
              ...(n as Group),
              items: [...(n as Group).items, { id: nid(), kind: 'group', logic: group.logic === 'and' ? 'or' : 'and', items: [newCond(entity), newCond(entity)] }],
            }))}
          >
            Group ({group.logic === 'and' ? 'OR' : 'AND'})
          </Button>
        )}
      </Space>
    </div>
  );
}

function cell(column: QueryColumn, value: unknown) {
  if (value === null || value === undefined || value === '') return <Typography.Text type="secondary">—</Typography.Text>;
  if (column.type === 'money') return Number(value).toLocaleString('mk-MK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (column.type === 'bool') return value ? <Tag color="green">yes</Tag> : <Tag>no</Tag>;
  if (column.type === 'date') return String(value).slice(0, 16);
  return String(value);
}

export default function AdminQueryPage() {
  const [params, setParams] = useSearchParams();
  const { data: schema, isLoading: schemaLoading, error: schemaError } = useGetQuerySchemaQuery();
  const { data: saved = [] } = useGetSavedQueriesQuery();
  const [run, { data: result, isFetching, error: runError }] = useLazyRunQueryQuery();
  const [saveQuery, { isLoading: saving }] = useSaveQueryMutation();
  const [deleteSaved] = useDeleteSavedQueryMutation();

  const entityKey = params.get('entity') || 'products';
  const entity = schema?.entities.find((e) => e.key === entityKey) ?? schema?.entities[0];
  const [root, setRoot] = useState<Group>({ id: nid(), kind: 'group', logic: 'and', items: [] });
  const [sort, setSort] = useState<QuerySort>();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [savedId, setSavedId] = useState<string>();
  const [name, setName] = useState('');
  const [ranOnce, setRanOnce] = useState(false);

  const execute = useCallback((group: Group, nextPage = 1, nextSort = sort, size = perPage) => {
    if (!entity) return;
    if (!isComplete(group)) {
      message.warning('Fill in every value first.');
      return;
    }
    setPage(nextPage);
    setRanOnce(true);
    run({ entity: entity.key, filter: toApi(group), sort: nextSort, page: nextPage, per_page: size });
  }, [entity, run, sort, perPage]);

  const reset = useCallback((group?: QueryGroup, nextSort?: QuerySort | null) => {
    setRoot(group ? fromApi(group) : { id: nid(), kind: 'group', logic: 'and', items: [] });
    setSort(nextSort ?? undefined);
    setRanOnce(false);
  }, []);

  const switchEntity = (key: string) => {
    setParams((p) => { p.set('entity', key); return p; }, { replace: true });
    setSavedId(undefined);
    setName('');
    reset();
  };

  const applyPreset = (filter: QueryGroup) => {
    const group = fromApi(filter);
    setRoot(group);
    setSavedId(undefined);
    setName('');
    execute(group, 1);
  };

  const openSaved = (query: SavedQuery) => {
    if (query.entity !== entity?.key) setParams((p) => { p.set('entity', query.entity); return p; }, { replace: true });
    const group = fromApi(query.filter);
    setRoot(group);
    setSort(query.sort ?? undefined);
    setSavedId(query.id);
    setName(query.name);
    // Run after the entity switch has settled.
    setTimeout(() => {
      run({ entity: query.entity, filter: toApi(group), sort: query.sort ?? undefined, page: 1, per_page: perPage });
      setPage(1);
      setRanOnce(true);
    }, 0);
  };

  const save = async (asNew: boolean) => {
    if (!entity) return;
    if (!name.trim()) {
      message.warning('Give the query a name.');
      return;
    }
    if (!isComplete(root)) {
      message.warning('Fill in every value first.');
      return;
    }
    try {
      const entry = await saveQuery({ id: asNew ? undefined : savedId, name: name.trim(), entity: entity.key, filter: toApi(root), sort: sort ?? null }).unwrap();
      setSavedId(entry.id);
      message.success('Query saved');
    } catch (e) {
      message.error((e as { data?: { message?: string } })?.data?.message || 'Could not save the query.');
    }
  };

  const columns = useMemo<TableProps<Record<string, unknown>>['columns']>(() => (entity?.columns ?? []).map((column) => ({
    key: column.key,
    dataIndex: column.key,
    title: column.label,
    align: column.type === 'money' || column.type === 'number' ? 'right' : undefined,
    sorter: !!column.sort,
    sortOrder: column.sort && sort?.field === column.sort ? (sort.dir === 'asc' ? 'ascend' : 'descend') : null,
    render: (value: unknown, row: Record<string, unknown>) => {
      if (entity?.key === 'products' && column.key === 'name') {
        return <a href={`/product/${row.id}`} target="_blank" rel="noreferrer">{String(value)}</a>;
      }
      return cell(column, value);
    },
  })), [entity, sort]);

  const onTableChange: TableProps<Record<string, unknown>>['onChange'] = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const column = entity?.columns.find((c) => c.key === s?.columnKey);
    const nextSort = s?.order && column?.sort ? { field: column.sort, dir: s.order === 'ascend' ? 'asc' as const : 'desc' as const } : undefined;
    const size = pagination.pageSize ?? perPage;
    const sortChanged = JSON.stringify(nextSort) !== JSON.stringify(sort);
    setSort(nextSort);
    setPerPage(size);
    execute(root, sortChanged ? 1 : (pagination.current ?? 1), nextSort, size);
  };

  const exportCsv = () => {
    if (!entity || !result) return;
    const header = entity.columns.map((c) => c.label);
    const rows = result.rows.map((row) => entity.columns.map((c) => row[c.key] ?? ''));
    const blob = new Blob(['﻿' + toCsvText([header, ...rows])], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${entity.key}-query.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (schemaLoading) return <Card loading />;
  if (schemaError || !schema || !entity) return <Alert type="error" showIcon message="Could not load the query tool." />;

  const errorText = (runError as { data?: { message?: string; errors?: Record<string, string[]> } } | undefined)?.data;
  const savedHere = saved.filter((q) => q.entity === entity.key);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
        <Segmented value={entity.key} onChange={(v) => switchEntity(String(v))} options={schema.entities.map((e) => ({ value: e.key, label: e.label }))} />
        <Select
          style={{ minWidth: 260 }}
          placeholder={saved.length ? `Open a saved query (${saved.length})` : 'No saved queries yet'}
          value={savedId}
          allowClear
          onClear={() => { setSavedId(undefined); setName(''); }}
          onChange={(id) => { const q = saved.find((s) => s.id === id); if (q) openSaved(q); }}
          options={schema.entities.map((e) => ({
            label: e.label,
            options: saved.filter((q) => q.entity === e.key).map((q) => ({ value: q.id, label: q.name })),
          })).filter((g) => g.options.length)}
        />
      </Space>

      <Card size="small" title="Quick picks">
        <Space wrap>
          {entity.presets.map((preset) => (
            <Button key={preset.key} size="small" onClick={() => applyPreset(preset.filter)}>{preset.label}</Button>
          ))}
          {savedHere.map((q) => (
            <Space.Compact key={q.id}>
              <Button size="small" type={q.id === savedId ? 'primary' : 'dashed'} onClick={() => openSaved(q)}>{q.name}</Button>
              <Popconfirm title={`Delete saved query "${q.name}"?`} onConfirm={() => { deleteSaved(q.id); if (q.id === savedId) setSavedId(undefined); }}>
                <Button size="small" type="dashed" danger icon={<DeleteOutlined />} aria-label={`Delete ${q.name}`} />
              </Popconfirm>
            </Space.Compact>
          ))}
        </Space>
      </Card>

      <Card size="small" title="Conditions">
        {root.items.length === 0 && (
          <Typography.Paragraph type="secondary">Pick a quick pick above, or add a condition (for example Price &lt; Stylist price).</Typography.Paragraph>
        )}
        <GroupEditor group={root} entity={entity} depth={0} onChange={(id, fn) => setRoot((r) => (r.id === id ? (fn(r) as Group) : update(r, id, fn)))} />
        <Typography.Paragraph type="secondary" style={{ margin: '12px 0' }}>
          <strong>{entity.label}</strong> where {describe(root, entity)}
        </Typography.Paragraph>
        <Space wrap>
          <Button type="primary" icon={<PlayCircleOutlined />} loading={isFetching} onClick={() => execute(root)}>Run</Button>
          <Button onClick={() => { reset(); setSavedId(undefined); setName(''); }}>Clear</Button>
          <Input style={{ width: 220 }} placeholder="Name to save as" value={name} onChange={(e) => setName(e.target.value)} onPressEnter={() => save(!savedId)} />
          <Button icon={<SaveOutlined />} loading={saving} onClick={() => save(!savedId)}>{savedId ? 'Update saved' : 'Save'}</Button>
          {savedId && <Button onClick={() => save(true)} loading={saving}>Save as new</Button>}
        </Space>
      </Card>

      {errorText && (
        <Alert type="error" showIcon message={errorText.message || 'The query could not run.'}
          description={errorText.errors ? Object.values(errorText.errors).flat().join(' ') : undefined} />
      )}

      {ranOnce && (
        <Card
          size="small"
          title={result ? `${result.meta.total.toLocaleString()} ${entity.label.toLowerCase()} found` : 'Results'}
          extra={<Button size="small" icon={<DownloadOutlined />} disabled={!result?.rows.length} onClick={exportCsv}>CSV (this page)</Button>}
        >
          <Table
            rowKey={(row) => String(row.id)}
            size="small"
            loading={isFetching}
            columns={columns}
            dataSource={result?.rows ?? []}
            onChange={onTableChange}
            scroll={{ x: true }}
            locale={{ emptyText: <Empty description="Nothing matches" /> }}
            pagination={{
              current: page,
              pageSize: perPage,
              total: result?.meta.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: [25, 50, 100, 200],
            }}
          />
        </Card>
      )}
    </Space>
  );
}
