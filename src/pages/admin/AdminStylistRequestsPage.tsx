'use client';

import { useState } from 'react';
import {
  Typography, Table, Tag, Select, Input, Space, Card, Button, Modal,
  Descriptions, App,
} from 'antd';
import {
  SearchOutlined, CheckOutlined, CloseOutlined, EyeOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { StylistRequest } from '@/types';
import {
  useGetStylistRequestsQuery,
  useApproveStylistRequestMutation,
  useRejectStylistRequestMutation,
} from '@/features/admin/api';
import { useDebounce } from '@/hooks/useDebounce';

const { Title, Text } = Typography;

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
];

export default function AdminStylistRequestsPage() {
  const { message, modal } = App.useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<StylistRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Only search if 2+ characters
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;

  // RTK Query
  const { data, isLoading } = useGetStylistRequestsQuery({
    page: currentPage,
    per_page: 10,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery,
  });

  const [approveStylist, { isLoading: isApproving }] = useApproveStylistRequestMutation();
  const [rejectStylist, { isLoading: isRejecting }] = useRejectStylistRequestMutation();

  const requests = data?.data ?? [];
  const pagination = data?.meta;

  /** Derive display status from backend response. */
  const getStatus = (record: StylistRequest): 'pending' | 'approved' => {
    if (record.isApproved === true || record.status === 'approved') return 'approved';
    return 'pending';
  };

  const handleApprove = (requestId: string) => {
    modal.confirm({
      title: 'Approve Stylist Request',
      icon: <ExclamationCircleOutlined style={{ color: '#52c41a' }} />,
      content: 'This will upgrade the user to a stylist role with access to stylist pricing.',
      okText: 'Approve',
      okType: 'primary',
      onOk: async () => {
        try {
          await approveStylist(requestId).unwrap();
          message.success('Stylist request approved — user role upgraded.');
        } catch {
          message.error('Failed to approve request.');
        }
      },
    });
  };

  const handleRejectClick = (requestId: string) => {
    setRejectingId(requestId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    try {
      await rejectStylist({ id: rejectingId, reason: rejectReason || undefined }).unwrap();
      message.success('Stylist request rejected and removed.');
      setShowRejectModal(false);
      setRejectReason('');
      setRejectingId(null);
    } catch {
      message.error('Failed to reject request.');
    }
  };

  const pendingCount = requests.filter((r) => getStatus(r) === 'pending').length;

  const columns = [
    {
      title: 'Applicant',
      key: 'applicant',
      render: (_: unknown, record: StylistRequest) => (
        <div>
          <Text strong>{record.userName || 'Unknown'}</Text>
          <br />
          <Text type="secondary">{record.userEmail || '-'}</Text>
        </div>
      ),
    },
    {
      title: 'Salon',
      key: 'salon',
      render: (_: unknown, record: StylistRequest) => (
        <div>
          <Text>{record.saloonName || '-'}</Text>
          {record.saloonCity && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{record.saloonCity}</Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Phone',
      key: 'phone',
      render: (_: unknown, record: StylistRequest) => record.saloonPhone || '-',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, record: StylistRequest) => {
        const status = getStatus(record);
        return status === 'approved'
          ? <Tag color="green">APPROVED</Tag>
          : <Tag color="orange">PENDING</Tag>;
      },
    },
    {
      title: 'Submitted',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: StylistRequest) => {
        const status = getStatus(record);
        return (
          <Space onClick={(e) => e.stopPropagation()}>
            <Button type="text" icon={<EyeOutlined />} onClick={() => setSelectedRequest(record)}>
              View
            </Button>
            {status === 'pending' && (
              <>
                <Button
                  type="text"
                  icon={<CheckOutlined />}
                  style={{ color: '#52c41a' }}
                  loading={isApproving}
                  onClick={() => handleApprove(record.id)}
                >
                  Approve
                </Button>
                <Button
                  type="text"
                  danger
                  icon={<CloseOutlined />}
                  loading={isRejecting}
                  onClick={() => handleRejectClick(record.id)}
                >
                  Reject
                </Button>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Stylist Requests</Title>
          <Text type="secondary">
            {pagination?.total ?? 0} total requests
            {pendingCount > 0 && <Tag color="orange" style={{ marginLeft: 8 }}>{pendingCount} pending</Tag>}
          </Text>
        </div>
        <Space>
          <Input
            placeholder="Search (min 2 chars)..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
            options={statusOptions}
            style={{ width: 130 }}
          />
        </Space>
      </div>

      <Card>
        <Table
          dataSource={requests}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          onRow={(record) => ({
            onClick: () => setSelectedRequest(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: currentPage,
            pageSize: pagination?.per_page ?? 10,
            total: pagination?.total ?? 0,
            onChange: setCurrentPage,
            showSizeChanger: false,
          }}
        />
      </Card>

      {/* Reject Reason Modal */}
      <Modal
        title="Reject Stylist Request"
        open={showRejectModal}
        onCancel={() => {
          setShowRejectModal(false);
          setRejectReason('');
          setRejectingId(null);
        }}
        onOk={handleRejectConfirm}
        okText="Reject"
        okButtonProps={{ danger: true, loading: isRejecting }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Provide a reason for rejection (optional):</Text>
        </div>
        <Input.TextArea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g., Insufficient experience, incomplete application"
          rows={4}
        />
      </Modal>

      {/* Application Detail Modal */}
      <Modal
        title="Application Details"
        open={!!selectedRequest}
        onCancel={() => setSelectedRequest(null)}
        footer={selectedRequest && getStatus(selectedRequest) === 'pending' ? [
          <Button
            key="reject"
            danger
            loading={isRejecting}
            onClick={() => {
              setSelectedRequest(null);
              if (selectedRequest) handleRejectClick(selectedRequest.id);
            }}
          >
            Reject
          </Button>,
          <Button
            key="approve"
            type="primary"
            loading={isApproving}
            onClick={() => {
              if (selectedRequest) {
                handleApprove(selectedRequest.id);
                setSelectedRequest(null);
              }
            }}
          >
            Approve
          </Button>,
        ] : [
          <Button key="close" onClick={() => setSelectedRequest(null)}>Close</Button>,
        ]}
        width={500}
      >
        {selectedRequest && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Name">{selectedRequest.userName || 'Unknown'}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedRequest.userEmail || '-'}</Descriptions.Item>
            <Descriptions.Item label="Salon Name">{selectedRequest.saloonName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Salon Address">{selectedRequest.saloonAddress || '-'}</Descriptions.Item>
            <Descriptions.Item label="Salon City">{selectedRequest.saloonCity || '-'}</Descriptions.Item>
            <Descriptions.Item label="Salon Phone">{selectedRequest.saloonPhone || '-'}</Descriptions.Item>
            {selectedRequest.message && (
              <Descriptions.Item label="Message">{selectedRequest.message}</Descriptions.Item>
            )}
            <Descriptions.Item label="Status">
              {getStatus(selectedRequest) === 'approved'
                ? <Tag color="green">APPROVED</Tag>
                : <Tag color="orange">PENDING</Tag>
              }
            </Descriptions.Item>
            <Descriptions.Item label="Submitted">
              {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleString() : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
