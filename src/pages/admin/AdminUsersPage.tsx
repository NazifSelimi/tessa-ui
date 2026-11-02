'use client';

import { useState } from 'react';
import { Typography, Table, Tag, Select, Input, Space, Card, Button, Popconfirm, Modal, Form, Descriptions, App, Alert } from 'antd';
import { SearchOutlined, DeleteOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { 
  useGetAllUsersQuery, 
  useUpdateUserMutation,
  useDeleteUserMutation
} from '@/features/admin/api';
import type { User, UserRole } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';

const { Title, Text } = Typography;

const roleColors: Record<UserRole, string> = {
  guest: 'default',
  user: 'blue',
  stylist: 'purple',
  distributor: 'gold',
  admin: 'red',
};

const roleOptions = [
  { value: 'all', label: 'All Roles' },
  { value: 'user', label: 'User' },
  { value: 'stylist', label: 'Stylist' },
  { value: 'admin', label: 'Admin' },
];

export default function AdminUsersPage() {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [page, setPage] = useState(1);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [perPage, setPerPage] = useState(20);
  const [sort, setSort] = useState('newest');

  const debouncedSearch = useDebounce(search, 300);

  // Only search if 2+ characters
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;

  const { data, isFetching, error, refetch } = useGetAllUsersQuery({
    page,
    per_page: perPage,
    sort,
    search: searchQuery,
    role: (roleFilter === 'all' || roleFilter === 'guest' || roleFilter === 'distributor') ? undefined : roleFilter,
  });

  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const handleView = (user: User) => {
    setSelectedUser(user);
    setViewModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    form.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedUser) return;
    
    try {
      const values = await form.validateFields();
      await updateUser({ id: selectedUser.id, data: values }).unwrap();
      message.success('User updated successfully');
      setEditModalOpen(false);
      setSelectedUser(null);
      form.resetFields();
    } catch (_error: any) {
      message.error(_error?.data?.message || 'Failed to update user');
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId).unwrap();
      message.success('User deleted');
    } catch (_error) {
      message.error('Failed to delete user');
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: unknown, record: User) => (
        <div>
          <Button type="link" style={{ padding: 0 }} onClick={(e) => { e.stopPropagation(); handleView(record); }}>{[record.firstName, record.lastName].filter(Boolean).join(' ') || '—'}</Button>
          <br />
          <Text type="secondary">{record.email}</Text>
        </div>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || '-',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        <Tag color={roleColors[role]}>{role === 'user' ? 'Customer' : role}</Tag>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button 
            type="text" 
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            View
          </Button>
          <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete user?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
              disabled={record.role === 'admin'}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Users</Title>
          <Text type="secondary">{data?.meta?.total || 0} registered users</Text>
        </div>
        <Space wrap>
          <Input
            placeholder="Name, email or phone…"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            value={roleFilter}
            onChange={(value) => { setRoleFilter(value); setPage(1); }}
            options={roleOptions}
            style={{ width: 130 }}
          />
          <Select aria-label="Sort users" value={sort} style={{ width: 180 }} onChange={value => { setSort(value); setPage(1); }} options={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'name_asc', label: 'Name A–Z' }, { value: 'name_desc', label: 'Name Z–A' }, { value: 'email_asc', label: 'Email A–Z' }]} />
          <Button onClick={() => refetch()}>Refresh</Button>
        </Space>
      </div>

      {error && <Alert type="error" message="Users could not be loaded. Check your connection and retry." action={<Button onClick={() => refetch()}>Retry</Button>} />}
      <Card>
        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="id"
          loading={isFetching}
          scroll={{ x: 800 }}
          onRow={(record) => ({
            onClick: () => handleView(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: perPage,
            total: data?.meta?.total || 0,
            onChange: (nextPage, size) => { setPage(size !== perPage ? 1 : nextPage); setPerPage(size); },
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
            showTotal: (total) => `Total ${total} users`,
          }}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title="User Details"
        open={viewModalOpen}
        onCancel={() => {
          setViewModalOpen(false);
          setSelectedUser(null);
        }}
        footer={[
          <Button key="edit" type="primary" onClick={() => { if (selectedUser) { setViewModalOpen(false); handleEdit(selectedUser); } }}>Edit user</Button>,
          <Button key="close" onClick={() => setViewModalOpen(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedUser && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Name">{[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Phone">{selectedUser.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Role">
              <Tag color={roleColors[selectedUser.role]}>{selectedUser.role.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Registered">
              {new Date(selectedUser.createdAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit User"
        open={editModalOpen}
        onOk={handleEditSave}
        onCancel={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
          form.resetFields();
        }}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
            <Input placeholder="First name" />
          </Form.Item>

          <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
            <Input placeholder="Last name" />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item name="phone" label="Phone">
            <Input placeholder="+1 234 567 8900" />
          </Form.Item>

          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select placeholder="Select role">
              <Select.Option value="user">User</Select.Option>
              <Select.Option value="stylist">Stylist</Select.Option>
              <Select.Option value="admin">Admin</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
