/**
 * Sales Reports (/admin/reports)
 *
 * One period at a time, compared with the period before it: money in, profit,
 * what sold, who bought, which codes worked, and stock that is not selling.
 */

import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Empty, Row, Segmented, Select, Space, Statistic, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { TableProps } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';
import { formatPrice } from '@/shared/utils/formatPrice';
import {
  downloadCsv,
  useGetReportOverviewQuery,
  useGetSlowMoversQuery,
  type CostSource,
  type ReportCodeRow,
  type ReportCustomerRow,
  type ReportGroupRow,
  type ReportOverview,
  type ReportParams,
  type ReportPreset,
  type ReportProductRow,
  type ReportSummary,
  type SlowMover,
} from '@/features/admin/reportsApi';

const { Text } = Typography;

const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
  { value: 'custom', label: 'Custom dates' },
];

const COST_LABEL: Record<CostSource, { text: string; color: string; hint: string }> = {
  real: { text: 'real cost', color: 'green', hint: 'Uses the cost price saved on the product.' },
  estimated: { text: 'estimate', color: 'gold', hint: 'No cost price saved: uses the category or shop cost percentage.' },
  unknown: { text: 'no cost', color: 'default', hint: 'No cost price and no cost percentage to estimate from.' },
};

const percent = (value: number | null | undefined) => (value === null || value === undefined ? '–' : `${value}%`);
const shortDate = (value: string) => dayjs(value).format('D MMM YYYY');

function Change({ value, goodWhenUp = true }: { value: number | null | undefined; goodWhenUp?: boolean }) {
  if (value === null || value === undefined) return <Text type="secondary" style={{ fontSize: 12 }}>no earlier data</Text>;
  if (value === 0) return <Text type="secondary" style={{ fontSize: 12 }}>same as before</Text>;
  const up = value > 0;
  const good = up === goodWhenUp;
  return (
    <Text style={{ fontSize: 12, color: good ? '#389e0d' : '#cf1322' }}>
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(value)}% vs before
    </Text>
  );
}

function Figure({ title, value, change, goodWhenUp, hint }: { title: string; value: string | number; change?: number | null; goodWhenUp?: boolean; hint?: string }) {
  return (
    <Card size="small" style={{ height: '100%' }}>
      <Statistic title={hint ? <Tooltip title={hint}><span style={{ borderBottom: '1px dotted #bbb' }}>{title}</span></Tooltip> : title} value={value} />
      {change !== undefined && <Change value={change} goodWhenUp={goodWhenUp} />}
    </Card>
  );
}

/** Plain bar chart: no chart library needed for one series. */
function TimelineBars({ timeline, bucket }: { timeline: ReportOverview['timeline']; bucket: string }) {
  const max = Math.max(1, ...timeline.map((bar) => bar.revenue));
  if (!timeline.some((bar) => bar.orders > 0)) return <Empty description="No orders in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  const label = (date: string) => (bucket === 'month' ? dayjs(date).format('MMM') : bucket === 'week' ? date : dayjs(date).format('D'));
  const every = Math.ceil(timeline.length / 16);

  return (
    <div role="img" aria-label="Revenue over time" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 190, overflowX: 'auto', paddingTop: 8 }}>
      {timeline.map((bar, index) => (
        <Tooltip key={bar.date} title={`${bar.date}: ${formatPrice(bar.revenue)} · ${bar.orders} order${bar.orders === 1 ? '' : 's'}`}>
          <div style={{ flex: '1 0 10px', minWidth: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ width: '100%', height: `${Math.max(bar.revenue > 0 ? 2 : 0, (bar.revenue / max) * 150)}px`, background: 'var(--ant-color-primary, #c2185b)', borderRadius: '3px 3px 0 0', opacity: bar.revenue > 0 ? 1 : 0.15, minHeight: 1 }} />
            <span style={{ fontSize: 10, color: '#888', height: 16, whiteSpace: 'nowrap' }}>{index % every === 0 ? label(bar.date) : ''}</span>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}

function ShareBars({ rows }: { rows: ReportGroupRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.revenue));
  if (!rows.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  return (
    <div>
      {rows.slice(0, 8).map((row) => (
        <div key={row.name} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <Text ellipsis style={{ maxWidth: '60%' }}>{row.name}</Text>
            <Text strong>{formatPrice(row.revenue)}</Text>
          </div>
          <div style={{ background: '#f0f0f0', borderRadius: 3, height: 6 }}>
            <div style={{ width: `${(row.revenue / max) * 100}%`, background: 'var(--ant-color-primary, #c2185b)', height: 6, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const costTag = (source: CostSource) => (
  <Tooltip title={COST_LABEL[source].hint}><Tag color={COST_LABEL[source].color}>{COST_LABEL[source].text}</Tag></Tooltip>
);

const productColumns: TableProps<ReportProductRow>['columns'] = [
  {
    title: 'Product', key: 'name',
    render: (_, row) => (
      <div>
        {row.productId ? <Link to={`/product/${row.productId}`}>{row.name}</Link> : row.name}
        <div><Text type="secondary" style={{ fontSize: 12 }}>{[row.brand, row.category].filter(Boolean).join(' · ')}</Text></div>
      </div>
    ),
  },
  { title: 'Sold', dataIndex: 'qty', align: 'right', sorter: (a, b) => a.qty - b.qty },
  { title: 'Sales', dataIndex: 'revenue', align: 'right', sorter: (a, b) => a.revenue - b.revenue, defaultSortOrder: 'descend', render: (value: number) => formatPrice(value) },
  { title: 'Profit', dataIndex: 'profit', align: 'right', sorter: (a, b) => (a.profit ?? 0) - (b.profit ?? 0), render: (value: number | null) => (value === null ? '–' : formatPrice(value)) },
  { title: 'Margin', dataIndex: 'marginPercentage', align: 'right', render: (value: number | null) => percent(value) },
  { title: 'Cost', dataIndex: 'costSource', render: (value: CostSource) => costTag(value) },
  { title: 'In stock', dataIndex: 'stock', align: 'right', render: (value: number | null) => (value === null ? '–' : value <= 0 ? <Tag color="red">0</Tag> : value) },
];

const customerColumns: TableProps<ReportCustomerRow>['columns'] = [
  {
    title: 'Customer', key: 'name',
    render: (_, row) => (
      <div>
        {row.name || row.email || 'Guest'} {row.isBusiness && <Tag color="purple">business</Tag>} {row.isNew && <Tag color="green">new</Tag>}
        {row.email && row.name && <div><Text type="secondary" style={{ fontSize: 12 }}>{row.email}</Text></div>}
      </div>
    ),
  },
  { title: 'Orders', dataIndex: 'orders', align: 'right', sorter: (a, b) => a.orders - b.orders },
  { title: 'Spent', dataIndex: 'revenue', align: 'right', sorter: (a, b) => a.revenue - b.revenue, render: (value: number) => formatPrice(value) },
  { title: 'Average order', dataIndex: 'averageOrderValue', align: 'right', render: (value: number) => formatPrice(value) },
  { title: 'Last order', dataIndex: 'lastOrderAt', render: (value: string | null) => (value ? shortDate(value) : '–') },
];

const codeColumns: TableProps<ReportCodeRow>['columns'] = [
  {
    title: 'Code', key: 'code',
    render: (_, row) => (
      <span><Text code>{row.code}</Text> {row.isReferral ? <Tag color="magenta">referral{row.stylistName ? ` · ${row.stylistName}` : ''}</Tag> : <Tag>coupon</Tag>}</span>
    ),
  },
  { title: 'Orders', dataIndex: 'orders', align: 'right' },
  { title: 'Sales', dataIndex: 'revenue', align: 'right', render: (value: number) => formatPrice(value) },
  { title: 'Discount given', dataIndex: 'discount', align: 'right', render: (value: number) => formatPrice(value) },
  { title: 'Credit earned', dataIndex: 'referralCredit', align: 'right', render: (value: number) => formatPrice(value) },
  { title: <Tooltip title="Discount plus credit, as a share of the sales the code brought.">Cost of the code</Tooltip>, dataIndex: 'costPercentage', align: 'right', render: (value: number | null) => percent(value) },
];

const slowColumns: TableProps<SlowMover>['columns'] = [
  {
    title: 'Product', key: 'name',
    render: (_, row) => (
      <div>
        <Link to={`/product/${row.productId}`}>{row.name}</Link>
        <div><Text type="secondary" style={{ fontSize: 12 }}>{[row.brand, row.category].filter(Boolean).join(' · ')}</Text></div>
      </div>
    ),
  },
  { title: 'In stock', dataIndex: 'stock', align: 'right', sorter: (a, b) => a.stock - b.stock },
  { title: 'Last sold', key: 'last', render: (_, row) => (row.lastSoldAt ? `${shortDate(row.lastSoldAt)} (${row.daysSinceSale} days ago)` : <Tag color="orange">never sold</Tag>) },
  { title: 'Sold ever', dataIndex: 'soldEver', align: 'right' },
  { title: 'Stock value (retail)', dataIndex: 'stockValueRetail', align: 'right', sorter: (a, b) => a.stockValueRetail - b.stockValueRetail, render: (value: number) => formatPrice(value) },
  { title: 'Stock value (cost)', key: 'cost', align: 'right', render: (_, row) => (row.stockValueCost === null ? '–' : <span>{formatPrice(row.stockValueCost)} {row.costSource === 'estimated' && costTag('estimated')}</span>) },
];

function SlowMoversTab() {
  const [days, setDays] = useState(60);
  const { data, isFetching, error } = useGetSlowMoversQuery(days);

  return (
    <div>
      <Space wrap style={{ marginBottom: 12 }}>
        <Text>In stock, but not sold for</Text>
        <Select value={days} onChange={setDays} style={{ width: 130 }} options={[30, 60, 90, 180, 365].map((value) => ({ value, label: `${value} days` }))} />
        {data && (
          <Text type="secondary">
            {data.products.length} products · {formatPrice(data.totalStockValueRetail)} at retail price · about {formatPrice(data.totalStockValueCost)} at cost
          </Text>
        )}
        <Button
          icon={<DownloadOutlined />}
          disabled={!data?.products.length}
          onClick={() => data && downloadCsv(`slow-stock-${days}-days.csv`, ['Product', 'Brand', 'Category', 'In stock', 'Last sold', 'Days since sale', 'Sold ever', 'Stock value retail', 'Stock value cost'],
            data.products.map((row) => [row.name, row.brand, row.category, row.stock, row.lastSoldAt, row.daysSinceSale, row.soldEver, row.stockValueRetail, row.stockValueCost]))}
        >
          Download
        </Button>
      </Space>
      {error ? <Alert type="error" showIcon message="The slow stock list could not be loaded." /> : (
        <Table rowKey="productId" size="small" loading={isFetching} dataSource={data?.products ?? []} columns={slowColumns} pagination={{ pageSize: 25, showSizeChanger: false }} scroll={{ x: 760 }} />
      )}
    </div>
  );
}

function summaryRows(summary: ReportSummary): [string, string | number][] {
  return [
    ['Money in (orders not cancelled)', summary.revenue],
    ['Orders', summary.orders],
    ['Average order', summary.averageOrderValue],
    ['Items sold', summary.itemsSold],
    ['Product sales', summary.productSales],
    ['Delivery charged', summary.shipping],
    ['Discounts given', summary.discounts],
    ['Referral credit earned by business accounts', summary.referralCredit],
    ['Store credit spent', summary.storeCreditUsed],
    ['Cost of goods', summary.cost],
    ['Profit', summary.profit],
    ['Margin %', summary.marginPercentage ?? ''],
    ['Customers', summary.customers],
    ['New customers', summary.newCustomers],
    ['Returning customers', summary.returningCustomers],
    ['Business orders', summary.businessOrders],
    ['Business sales', summary.businessRevenue],
    ['Cancelled orders', summary.cancelledOrders],
    ['Cancelled value', summary.cancelledValue],
  ];
}

export default function AdminReportsPage() {
  const [preset, setPreset] = useState<ReportPreset>('this_month');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

  const params = useMemo<ReportParams | null>(() => {
    if (preset !== 'custom') return { period: preset };
    return range ? { period: 'custom', from: range[0].format('YYYY-MM-DD'), to: range[1].format('YYYY-MM-DD') } : null;
  }, [preset, range]);

  const { data, isFetching, error, refetch } = useGetReportOverviewQuery(params ?? { period: 'this_month' }, { skip: !params });
  const summary = data?.summary;
  const changes = data?.changes ?? {};

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Space wrap>
          <Segmented value={preset} onChange={(value) => setPreset(value as ReportPreset)} options={PRESETS} />
          {preset === 'custom' && (
            <DatePicker.RangePicker
              value={range}
              onChange={(value) => setRange(value && value[0] && value[1] ? [value[0], value[1]] : null)}
              disabledDate={(day) => day.isAfter(dayjs(), 'day')}
              allowClear
            />
          )}
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} disabled={!params}>Refresh</Button>
          <Button
            icon={<DownloadOutlined />}
            disabled={!data}
            onClick={() => data && downloadCsv(`sales-${data.period.start}-to-${data.period.end}.csv`, ['Figure', 'Value'], summaryRows(data.summary))}
          >
            Download summary
          </Button>
        </Space>
      </Space>

      {preset === 'custom' && !range && <Alert type="info" showIcon message="Pick a start and an end date." style={{ marginBottom: 16 }} />}
      {error && <Alert type="error" showIcon message="The report could not be loaded. Try Refresh." style={{ marginBottom: 16 }} />}

      {data && summary && (
        <div style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .2s' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            {shortDate(data.period.start)} – {shortDate(data.period.end)}, compared with {shortDate(data.period.previousStart)} – {shortDate(data.period.previousEnd)}. Cancelled orders are not counted.
          </Text>

          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={8} xl={4}><Figure title="Money in" value={formatPrice(summary.revenue)} change={changes.revenue} hint="Order totals, delivery included, cancelled orders left out." /></Col>
            <Col xs={12} md={8} xl={4}><Figure title="Orders" value={summary.orders} change={changes.orders} /></Col>
            <Col xs={12} md={8} xl={4}><Figure title="Average order" value={formatPrice(summary.averageOrderValue)} change={changes.averageOrderValue} /></Col>
            <Col xs={12} md={8} xl={4}>
              <Figure
                title={summary.profitEstimated ? 'Profit (estimate)' : 'Profit'}
                value={formatPrice(summary.profit)}
                change={changes.profit}
                hint={`Product sales minus cost of goods, discounts and referral credit. Real cost prices cover ${percent(summary.costCoveragePercentage)} of sales; the rest is estimated.`}
              />
            </Col>
            <Col xs={12} md={8} xl={4}><Figure title="Margin" value={percent(summary.marginPercentage)} /></Col>
            <Col xs={12} md={8} xl={4}><Figure title="Customers" value={summary.customers} change={changes.customers} hint={`${summary.newCustomers} new, ${summary.returningCustomers} returning.`} /></Col>
          </Row>

          {summary.profitEstimated && (
            <Alert
              type="warning" showIcon style={{ marginBottom: 16 }}
              message="Profit is partly an estimate"
              description={<span>Only {percent(summary.costCoveragePercentage)} of what sold has a real cost price. Add cost prices in the product editor to make profit exact.</span>}
            />
          )}

          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={16}>
              <Card size="small" title={`Money in per ${data.period.bucket}`}>
                <TimelineBars timeline={data.timeline} bucket={data.period.bucket} />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card size="small" title="Orders by status" style={{ height: '100%' }}>
                {data.byStatus.map((row) => (
                  <div key={row.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <Text style={{ textTransform: 'capitalize' }}>{row.status}</Text>
                    <Text>{row.orders} · <Text strong>{formatPrice(row.value)}</Text></Text>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 8 }}>
                  <Text type="secondary">Business accounts: {summary.businessOrders} orders, {formatPrice(summary.businessRevenue)} ({percent(summary.businessRevenueShare)} of sales)</Text><br />
                  <Text type="secondary">Discounts given: {formatPrice(summary.discounts)} · Delivery charged: {formatPrice(summary.shipping)}</Text>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={12}><Card size="small" title="Sales by brand"><ShareBars rows={data.byBrand} /></Card></Col>
            <Col xs={24} md={12}><Card size="small" title="Sales by category"><ShareBars rows={data.byCategory} /></Card></Col>
          </Row>
        </div>
      )}

      <Card size="small">
        <Tabs
          items={[
            {
              key: 'products', label: 'Best sellers',
              children: (
                <div>
                  <Button
                    icon={<DownloadOutlined />} style={{ marginBottom: 12 }} disabled={!data?.topProducts.length}
                    onClick={() => data && downloadCsv(`best-sellers-${data.period.start}-to-${data.period.end}.csv`, ['Product', 'Brand', 'Category', 'Sold', 'Sales', 'Cost', 'Profit', 'Margin %', 'Cost source', 'In stock'],
                      data.topProducts.map((row) => [row.name, row.brand, row.category, row.qty, row.revenue, row.cost, row.profit, row.marginPercentage, row.costSource, row.stock]))}
                  >
                    Download
                  </Button>
                  <Table rowKey={(row) => `${row.productId}-${row.name}`} size="small" loading={isFetching} dataSource={data?.topProducts ?? []} columns={productColumns} pagination={{ pageSize: 20, showSizeChanger: false }} scroll={{ x: 760 }} />
                </div>
              ),
            },
            {
              key: 'customers', label: 'Top customers',
              children: <Table rowKey="key" size="small" loading={isFetching} dataSource={data?.topCustomers ?? []} columns={customerColumns} pagination={{ pageSize: 20, showSizeChanger: false }} scroll={{ x: 640 }} />,
            },
            {
              key: 'codes', label: 'Coupons & referral codes',
              children: <Table rowKey="code" size="small" loading={isFetching} dataSource={data?.codes ?? []} columns={codeColumns} pagination={false} scroll={{ x: 700 }} locale={{ emptyText: 'No codes were used in this period' }} />,
            },
            { key: 'slow', label: 'Stock not selling', children: <SlowMoversTab /> },
          ]}
        />
      </Card>

    </div>
  );
}
