'use client';

import { useState } from 'react';
import {
  Typography, Table, Tag, Card, Statistic, Row, Col, Input, Select,
  Space, Modal, Descriptions, Spin, Alert,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  useGetDistributorCodesQuery,
  useGetDistributorCodeStatsQuery,
} from '@/features/admin/api';
import { useDebounce } from '@/hooks/useDebounce';

const { Title, Text } = Typography;

interface DistributorCode {
  id: string;
  code: string;
  used: boolean;
  expiresAt: string | null;
  createdBy: string;
  usedBy: string | null;
  creator?: { id: string; name: string | null; email: string };
  usedByUser?: { id: string; name: string | null; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDistributorsPage() {
  const [search, setSearch] = useState('');
  const [usedFilter, setUsedFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [page, setPage] = useState(1);
  const [selectedCode, setSelectedCode] = useState<DistributorCode | null>(null);
  const perPage = 20;

  const debouncedSearch = useDebounce(search, 300);
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;

  const queryParams: any = { page, per_page: perPage };
  if (searchQuery) queryParams.search = searchQuery;
  if (usedFilter === 'used') queryParams.used = true;
  if (usedFilter === 'unused') queryParams.used = false;

  const { data, isLoading, error } = useGetDistributorCodesQuery(queryParams);
  const { data: stats } = useGetDistributorCodeStatsQuery();

  const codes: DistributorCode[] = data?.data || [];

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Text strong copyable>{code}</Text>,
    },
    {
      title: 'Created By',
      key: 'creator',
      render: (_: unknown, record: DistributorCode) => {
        const creator = record.creator;
        if (!creator) return <Text type="secondary">ID: {record.createdBy}</Text>;
        return (
          <div>
            <Text strong>{creator.name || 'Unknown'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{creator.email}</Text>
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, record: DistributorCode) => {
        if (record.used) return <Tag color="blue">USED</Tag>;
        const isExpired = record.expiresAt && new Date(record.expiresAt) < new Date();
        if (isExpired) return <Tag color="red">EXPIRED</Tag>;
        return <Tag color="green">ACTIVE</Tag>;
      },
    },
    {
      title: 'Used By',
      key: 'usedBy',
      render: (_: unknown, record: DistributorCode) => {
        if (!record.used || !record.usedByUser) return <Text type="secondary">—</Text>;
        return (
          <div>
            <Text>{record.usedByUser.name || 'Unknown'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.usedByUser.email}</Text>
          </div>
        );
      },
    },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : 'Never',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  if (error) {
    return (
      <div>
        <Title level={2}>Distributors</Title>
        <Alert type="error" message="Failed to load distributor codes" showIcon />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Distributor Codes</Title>
          <Text type="secondary">Manage stylist invitation codes and track usage</Text>
        </div>
        <Space>
          <Input
            placeholder="Search codes or creators..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            value={usedFilter}
            onChange={(v) => { setUsedFilter(v); setPage(1); }}
            style={{ width: 120 }}
          >
            <Select.Option value="all">All</Select.Option>
            <Select.Option value="used">Used</Select.Option>
            <Select.Option value="unused">Unused</Select.Option>
          </Select>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card>
            <Statistic title="Total Codes" value={stats?.totalCodes ?? 0} loading={!stats} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic title="Active Codes" value={stats?.activeCodes ?? 0} loading={!stats} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic title="Used Codes" value={stats?.usedCodes ?? 0} loading={!stats} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
        ) : (
          <Table
            dataSource={codes}
            columns={columns}
            rowKey="id"
            onRow={(record) => ({
              onClick: () => setSelectedCode(record),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              current: page,
              pageSize: perPage,
              total: data?.meta?.total || 0,
              onChange: setPage,
              showSizeChanger: false,
              showTotal: (total) => `Total ${total} codes`,
            }}
          />
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Code Details"
        open={!!selectedCode}
        onCancel={() => setSelectedCode(null)}
        footer={null}
        width={500}
      >
        {selectedCode && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Code">
              <Text copyable>{selectedCode.code}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {selectedCode.used
                ? <Tag color="blue">USED</Tag>
                : (selectedCode.expiresAt && new Date(selectedCode.expiresAt) < new Date())
                  ? <Tag color="red">EXPIRED</Tag>
                  : <Tag color="green">ACTIVE</Tag>
              }
            </Descriptions.Item>
            <Descriptions.Item label="Created By">
              {selectedCode.creator
                ? `${selectedCode.creator.name || 'Unknown'} (${selectedCode.creator.email})`
                : `ID: ${selectedCode.createdBy}`
              }
            </Descriptions.Item>
            <Descriptions.Item label="Used By">
              {selectedCode.usedByUser
                ? `${selectedCode.usedByUser.name || 'Unknown'} (${selectedCode.usedByUser.email})`
                : '—'
              }
            </Descriptions.Item>
            <Descriptions.Item label="Expires">
              {selectedCode.expiresAt ? new Date(selectedCode.expiresAt).toLocaleString() : 'Never'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(selectedCode.createdAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
