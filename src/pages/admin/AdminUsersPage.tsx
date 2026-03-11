'use client';

import { useState } from 'react';
import { Typography, Table, Tag, Select, Input, Space, Card, Button, Popconfirm, Modal, Form, Descriptions, App } from 'antd';
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
  { value: 'distributor', label: 'Distributor' },
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
  const perPage = 20;

  const debouncedSearch = useDebounce(search, 300);

  // Only search if 2+ characters
  const searchQuery = debouncedSearch && debouncedSearch.length >= 2 ? debouncedSearch : undefined;

  const { data, isLoading } = useGetAllUsersQuery({
    page,
    per_page: perPage,
    search: searchQuery,
    role: (roleFilter === 'all' || roleFilter === 'guest' || roleFilter === 'distributor') ? undefined : roleFilter,
  });

  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    // Only allow changing to admin, stylist, or user (not guest or distributor)
    if (newRole === 'guest' || newRole === 'distributor') {
      message.error('Invalid role selection');
      return;
    }
    
    try {
      await updateUser({ id: userId, data: { role: newRole } }).unwrap();
      message.success('User role updated');
    } catch (_error) {
      message.error('Failed to update role');
    }
  };

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
          <Text strong>{[record.firstName, record.lastName].filter(Boolean).join(' ') || '—'}</Text>
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
      render: (role: UserRole, record: User) => (
        <Select
          value={role}
          onChange={(val) => handleRoleChange(record.id, val)}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 120 }}
          size="small"
        >
          {roleOptions.filter(o => o.value !== 'all').map(opt => (
            <Select.Option key={opt.value} value={opt.value}>
              <Tag color={roleColors[opt.value as UserRole]}>{opt.label}</Tag>
            </Select.Option>
          ))}
        </Select>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Users</Title>
          <Text type="secondary">{data?.meta?.total || 0} registered users</Text>
        </div>
        <Space>
          <Input
            placeholder="Search users (min 2 chars)..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            options={roleOptions}
            style={{ width: 130 }}
          />
        </Space>
      </div>

      <Card>
        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          onRow={(record) => ({
            onClick: () => handleView(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: perPage,
            total: data?.meta?.total || 0,
            onChange: setPage,
            showSizeChanger: false,
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
