/**
 * Admin Customers (simple CRM): everyone who bought or has an account, what
 * they spent and when they last ordered, with quick segments to find who to
 * contact, notes and tags, and a CSV export for Excel.
 */

import { useMemo, useState } from 'react';
import { Alert, App, Button, Card, Col, DatePicker, Input, InputNumber, Row, Segmented, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppSelector } from '@/app/hooks';
import { selectToken } from '@/features/auth/slice';
import { useDebounce } from '@/hooks/useDebounce';
import { cleanCustomerParams, useGetCustomersQuery, type Customer, type CustomerSort, type CustomersParams, type CustomerType } from '@/features/admin/customersApi';
import CustomerDrawer from '@/features/admin/CustomerDrawer';
import { customerSegments, customerTypeColor, customerTypeLabel, formatDate, formatMkd, segmentParams, type CustomerSegment } from '@/features/admin/customerFormat';

const { Title, Text } = Typography;

interface Filters {
  type?: CustomerType | 'registered';
  city?: string;
  tag?: string;
  min_spent?: number;
  max_spent?: number;
  last_order_after?: string;
  last_order_before?: string;
  inactive_days?: number;
}

export default function AdminCustomersPage() {
  const { message } = App.useApp();
  const token = useAppSelector(selectToken);
  const [segment, setSegment] = useState<CustomerSegment>('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<{ sort?: CustomerSort; direction?: 'asc' | 'desc' }>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  // Segment first, then the admin's own filters and column sort on top.
  const params: CustomersParams = useMemo(() => ({
    ...segmentParams(segment),
    ...filters,
    ...(sort.sort ? sort : {}),
    q: debouncedSearch.trim() || undefined,
  }), [segment, filters, sort, debouncedSearch]);

  const { data, isFetching, error, refetch } = useGetCustomersQuery({ ...params, page, per_page: perPage });
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const activeSort = params.sort ?? 'last_order_at';
  const activeDirection = params.direction ?? 'desc';

  const changeFilter = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const changeSegment = (value: CustomerSegment) => {
    setSegment(value);
    setSort({});
    setPage(1);
  };

  const clearAll = () => {
    setSegment('all');
    setFilters({});
    setSort({});
    setSearch('');
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(cleanCustomerParams(params)).map(([k, v]) => [k, String(v)])), format: 'csv' });
      const response = await fetch(`${import.meta.env.VITE_API_URL}/v1/admin/customers?${query}`, {
        headers: { Authorization: `Bearer ${token ?? ''}`, Accept: 'text/csv' },
      });
      if (!response.ok) throw new Error(String(response.status));
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `customers-${dayjs().format('YYYY-MM-DD')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const sortOrder = (key: CustomerSort) => (activeSort === key ? (activeDirection === 'asc' ? 'ascend' : 'descend') : null);

  const columns: TableProps<Customer>['columns'] = [
    {
      title: 'Customer',
      key: 'name',
      sorter: true,
      sortOrder: sortOrder('name'),
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.name || row.email || row.phone || '—'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{[row.email, row.phone].filter(Boolean).join(' · ') || 'No contact details'}</Text>
          {row.tags.length > 0 && <div>{row.tags.map((tag) => <Tag key={tag} style={{ marginTop: 2 }}>{tag}</Tag>)}</div>}
        </Space>
      ),
    },
    { title: 'City', dataIndex: 'city', key: 'city', sorter: true, sortOrder: sortOrder('city'), responsive: ['md'], render: (city: string | null) => city ?? '—' },
    { title: 'Type', dataIndex: 'type', key: 'type', responsive: ['lg'], render: (type: CustomerType) => <Tag color={customerTypeColor[type]}>{customerTypeLabel[type]}</Tag> },
    { title: 'Orders', dataIndex: 'ordersCount', key: 'orders_count', align: 'right', sorter: true, sortOrder: sortOrder('orders_count') },
    { title: 'Total spent', dataIndex: 'totalSpent', key: 'total_spent', align: 'right', sorter: true, sortOrder: sortOrder('total_spent'), render: formatMkd },
    { title: 'Average', dataIndex: 'averageOrder', key: 'average_order', align: 'right', sorter: true, sortOrder: sortOrder('average_order'), responsive: ['xl'], render: formatMkd },
    {
      title: 'Last order',
      dataIndex: 'lastOrderAt',
      key: 'last_order_at',
      sorter: true,
      sortOrder: sortOrder('last_order_at'),
      render: (value: string | null, row) => value ? (
        <Space direction="vertical" size={0}>
          <span>{formatDate(value)}</span>
          <Text type={(row.daysSinceLastOrder ?? 0) >= 60 ? 'warning' : 'secondary'} style={{ fontSize: 12 }}>
            {row.daysSinceLastOrder === 0 ? 'today' : `${row.daysSinceLastOrder} days ago`}
          </Text>
        </Space>
      ) : <Text type="secondary">No orders</Text>,
    },
    { title: 'First order', dataIndex: 'firstOrderAt', key: 'first_order_at', sorter: true, sortOrder: sortOrder('first_order_at'), responsive: ['xxl'], render: formatDate },
    { title: 'Store credit', dataIndex: 'storeCredit', key: 'store_credit', align: 'right', sorter: true, sortOrder: sortOrder('store_credit'), responsive: ['xl'], render: (value: number) => value ? formatMkd(value) : '—' },
  ];

  const onTableChange: TableProps<Customer>['onChange'] = (pagination, _filters, sorter) => {
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    const key = single?.columnKey as CustomerSort | undefined;
    if (single?.order && key) {
      setSort({ sort: key, direction: single.order === 'ascend' ? 'asc' : 'desc' });
    } else if (single && !single.order) {
      setSort({});
    }
    if (pagination.current) setPage(pagination.current);
    if (pagination.pageSize && pagination.pageSize !== perPage) {
      setPerPage(pagination.pageSize);
      setPage(1);
    }
  };

  const hasFilters = segment !== 'all' || search !== '' || Object.values(filters).some((value) => value !== undefined && value !== '');

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <div>
          <Title level={3} style={{ margin: 0 }}>Customers</Title>
          <Text type="secondary">Everyone who bought or has an account. Click a customer to see orders, notes and contact buttons.</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
          <Button icon={<DownloadOutlined />} onClick={exportCsv} loading={exporting}>Export to Excel (CSV)</Button>
        </Space>
      </Space>

      <Segmented<CustomerSegment>
        options={customerSegments}
        value={segment}
        onChange={changeSegment}
        style={{ marginBottom: 16, maxWidth: '100%', overflowX: 'auto' }}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12} lg={8}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search name, email, phone, city or tag"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              aria-label="Search customers"
            />
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Select
              allowClear
              placeholder="Type"
              style={{ width: '100%' }}
              value={filters.type}
              onChange={(value) => changeFilter({ type: value })}
              options={[
                { value: 'customer', label: 'Customers' },
                { value: 'business', label: 'Business accounts' },
                { value: 'guest', label: 'Guests (no account)' },
                { value: 'registered', label: 'Any account' },
              ]}
              aria-label="Type"
            />
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Select
              allowClear
              showSearch
              placeholder="City"
              style={{ width: '100%' }}
              value={filters.city}
              onChange={(value) => changeFilter({ city: value })}
              options={(meta?.cities ?? []).map(({ city, count }) => ({ value: city, label: `${city} (${count})` }))}
              aria-label="City"
            />
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Select
              allowClear
              showSearch
              placeholder="Tag"
              style={{ width: '100%' }}
              value={filters.tag}
              onChange={(value) => changeFilter({ tag: value })}
              options={(meta?.tags ?? []).map((tag) => ({ value: tag, label: tag }))}
              notFoundContent="No tags yet: add them in a customer's profile"
              aria-label="Tag"
            />
          </Col>
          <Col xs={12} md={6} lg={4}>
            <InputNumber
              min={1}
              max={3650}
              placeholder="Not ordered in … days"
              style={{ width: '100%' }}
              value={filters.inactive_days}
              onChange={(value) => changeFilter({ inactive_days: value ?? undefined })}
              aria-label="Not ordered in days"
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber min={0} placeholder="Spent from (MKD)" style={{ width: '50%' }} value={filters.min_spent} onChange={(value) => changeFilter({ min_spent: value ?? undefined })} aria-label="Spent from" />
              <InputNumber min={0} placeholder="to (MKD)" style={{ width: '50%' }} value={filters.max_spent} onChange={(value) => changeFilter({ max_spent: value ?? undefined })} aria-label="Spent to" />
            </Space.Compact>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <DatePicker.RangePicker
              allowEmpty={[true, true]}
              style={{ width: '100%' }}
              placeholder={['Last order from', 'to']}
              format="DD.MM.YYYY"
              value={[
                filters.last_order_after ? dayjs(filters.last_order_after) : null,
                filters.last_order_before ? dayjs(filters.last_order_before) : null,
              ]}
              onChange={(range) => changeFilter({
                last_order_after: range?.[0]?.format('YYYY-MM-DD'),
                last_order_before: range?.[1]?.format('YYYY-MM-DD'),
              })}
              aria-label="Last order between"
            />
          </Col>
          <Col xs={24} lg={8}>
            {hasFilters && <Button onClick={clearAll}>Clear filters</Button>}
          </Col>
        </Row>
      </Card>

      {meta && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}><Card size="small"><Statistic title="Customers shown" value={meta.summary.customers} /></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="Have ordered" value={meta.summary.withOrders} /></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="Total spent" value={formatMkd(meta.summary.totalSpent)} /></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="Average order" value={formatMkd(meta.summary.averageOrder)} /></Card></Col>
        </Row>
      )}

      {error && <Alert type="error" showIcon message="Could not load customers." style={{ marginBottom: 16 }} action={<Button size="small" onClick={() => refetch()}>Try again</Button>} />}

      <Table<Customer>
        rowKey="key"
        columns={columns}
        dataSource={rows}
        loading={isFetching}
        onChange={onTableChange}
        onRow={(row) => ({ onClick: () => setOpenKey(row.key), style: { cursor: 'pointer' } })}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: meta?.currentPage ?? page,
          pageSize: perPage,
          total: meta?.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [25, 50, 100, 200],
          showTotal: (total) => `${total} customers`,
        }}
      />

      <CustomerDrawer customerKey={openKey} knownTags={meta?.tags ?? []} onClose={() => setOpenKey(null)} />
    </div>
  );
}
