'use client';

import { useState } from 'react';
import { Typography, Table, Tag, Select, Input, Space, Card, Button, Modal, Descriptions, App } from 'antd';
import { SearchOutlined, CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import type { StylistRequest, StylistRequestStatus } from '@/types';
import { useGetStylistRequestsQuery, useApproveStylistRequestMutation, useRejectStylistRequestMutation } from '@/features/admin/api';
import { useDebounce } from '@/hooks/useDebounce';
import React from 'react';

const { Title, Text } = Typography;

const statusColors: Record<StylistRequestStatus, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
};

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminStylistRequestsPage() {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('all');
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
  
  const [approveStylist] = useApproveStylistRequestMutation();
  const [rejectStylist] = useRejectStylistRequestMutation();

  const requests = data?.data ?? [];
  const pagination = data?.meta;

  const handleApprove = async (requestId: string) => {
    try {
      await approveStylist(requestId).unwrap();
      message.success('Stylist request approved');
    } catch (_error) {
      message.error('Failed to approve request');
    }
  };

  const handleRejectClick = (requestId: string) => {
    setRejectingId(requestId);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    try {
      await rejectStylist({ id: rejectingId, reason: rejectReason }).unwrap();
      message.success('Stylist request rejected');
      setShowRejectModal(false);
      setRejectReason('');
      setRejectingId(null);
    } catch (_error) {
      message.error('Failed to reject request');
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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
      dataIndex: 'salonName',
      key: 'salon',
      render: (name: string | null) => name || '-',
    },
    {
      title: 'Experience',
      dataIndex: 'experience',
      key: 'experience',
      render: (exp: string | null) => exp || '-',
    },
    {
      title: 'Referral Code',
      dataIndex: 'referralCode',
      key: 'referralCode',
      render: (code: string | null) => code ? <Tag>{code}</Tag> : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: StylistRequestStatus | null) => {
        if (!status) return <Tag>-</Tag>;
        const s = typeof status === 'string' ? status : String(status ?? '');
        return <Tag color={(statusColors as Record<string, string>)[s]}>{s.toUpperCase()}</Tag>;
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
      render: (_: unknown, record: StylistRequest) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={() => setSelectedRequest(record)}>
            View
          </Button>
          {record.status === 'pending' && (
            <>
              <Button 
                type="text" 
                icon={<CheckOutlined />} 
                style={{ color: '#52c41a' }}
                onClick={() => handleApprove(record.id)}
              >
                Approve
              </Button>
              <Button 
                type="text" 
                danger
                icon={<CloseOutlined />}
                onClick={() => handleRejectClick(record.id)}
              >
                Reject
              </Button>
            </>
          )}
        </Space>
      ),
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
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
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
          pagination={{
            current: currentPage,
            pageSize: pagination?.per_page ?? 10,
            total: pagination?.total ?? 0,
            onChange: setCurrentPage,
            showSizeChanger: false,
          }}
        />
      </Card>

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
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Please provide a reason for rejection:</Text>
        </div>
        <Input.TextArea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g., Insufficient experience, incomplete application"
          rows={4}
        />
      </Modal>

      <Modal
        title="Application Details"
        open={!!selectedRequest}
        onCancel={() => setSelectedRequest(null)}
        footer={selectedRequest?.status === 'pending' ? [
          <Button key="reject" danger onClick={() => {
            setSelectedRequest(null);
            if (selectedRequest) handleRejectClick(selectedRequest.id);
          }}>
            Reject
          </Button>,
          <Button key="approve" type="primary" onClick={() => {
            if (selectedRequest) {
              handleApprove(selectedRequest.id);
              setSelectedRequest(null);
            }
          }}>
            Approve
          </Button>,
        ] : null}
        width={500}
      >
        {selectedRequest && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Name">{selectedRequest.userName}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedRequest.userEmail}</Descriptions.Item>
            <Descriptions.Item label="Salon Name">{selectedRequest.salonName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Salon Address">{selectedRequest.salonAddress || '-'}</Descriptions.Item>
            <Descriptions.Item label="Experience">{selectedRequest.experience || '-'}</Descriptions.Item>
            <Descriptions.Item label="Referral Code">{selectedRequest.referralCode || '-'}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={(statusColors as Record<string, string>)[typeof selectedRequest.status === 'string' ? selectedRequest.status : String(selectedRequest.status ?? '')]}>{(typeof selectedRequest.status === 'string' ? selectedRequest.status : String(selectedRequest.status ?? '')).toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Submitted">
              {new Date(selectedRequest.createdAt).toLocaleString()}
            </Descriptions.Item>
            {selectedRequest.reviewedAt && (
              <Descriptions.Item label="Reviewed">
                {new Date(selectedRequest.reviewedAt).toLocaleString()}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
