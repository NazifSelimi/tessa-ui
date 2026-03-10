/**
 * Admin Dashboard Page
 * Main dashboard with KPIs, charts, and quick actions
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Progress,
  Avatar,
  Spin,
  Alert,
} from 'antd';
import {
  ShoppingOutlined,
  UserOutlined,
  ScissorOutlined,
  RiseOutlined,
  FileTextOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { Breakpoint } from 'antd/es/_util/responsiveObserver';
import type { Order } from '@/types';
import { useGetDashboardStatsQuery } from '@/features/admin/api';
import { formatPrice } from '@/shared/utils/formatPrice';

const { Text } = Typography;

const AdminDashboardPage: React.FC = () => {
  const { data: dashboardStats, isLoading, error } = useGetDashboardStatsQuery();

  // Extract metrics from API response
  const totalRevenue = dashboardStats?.totalRevenue ?? 0;
  const totalUsers = dashboardStats?.totalUsers ?? 0;
  const totalOrders = dashboardStats?.totalOrders ?? 0;
  const totalProducts = dashboardStats?.totalProducts ?? 0;
  const lowStockProducts = dashboardStats?.lowStockProducts ?? 0;
  const pendingRequests = dashboardStats?.pendingStylistRequests ?? 0;
  const recentOrders = dashboardStats?.recentOrders ?? [];

  // Responsive columns for mobile
  const orderColumns = [
    {
      title: 'Order',
      key: 'order',
      render: (_: unknown, record: Order) => (
        <div>
          <Text strong style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
            {record.id}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
              {record.shippingAddress?.fullName ?? '—'}
            </Text>
          </div>
        </div>
      ),
      responsive: ['xs', 'sm', 'md', 'lg', 'xl'] as Breakpoint[],
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_: unknown, record: Order) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{record.shippingAddress?.fullName ?? '—'}</Text>
        </Space>
      ),
      responsive: ['md', 'lg', 'xl'] as Breakpoint[],
    },
    {
      title: 'Date',
      key: 'date',
      render: (_: unknown, record: Order) => (
        <Text type="secondary">{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '—'}</Text>
      ),
      responsive: ['lg', 'xl'] as Breakpoint[],
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => (
        <Text strong>{formatPrice(total)}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: any) => {
        const normalizeStatus = (s: any): string => {
          if (typeof s === 'string') return s;
          const map: Record<number, string> = { 0: 'pending', 1: 'processing', 2: 'completed', 3: 'cancelled' };
          return map[s] ?? 'unknown';
        };
        const normalized = normalizeStatus(status);
        const colors: Record<string, string> = {
          delivered: 'green',
          shipped: 'blue',
          processing: 'cyan',
          confirmed: 'geekblue',
          pending: 'orange',
          cancelled: 'red',
        };
        return (
          <Tag color={colors[normalized] || 'default'}>
            {normalized.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Order) => (
        <Link to={`/admin/orders/${record.id}`}>
          <Button type="text" size="small" icon={<EyeOutlined />} aria-label="View order" />
        </Link>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="loading-state">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Dashboard"
        description="Failed to load dashboard statistics. Please try again later."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        <Col xs={12} md={6}>
          <Card className="stat-card" bodyStyle={{ padding: 'var(--spacing-lg)' }}>
            <Statistic
              title="Total Revenue"
              value={totalRevenue}
              formatter={(val) => formatPrice(Number(val))}
              valueStyle={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-xl)' }}
            />
            <div className="stat-card__change">
              <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                All time revenue
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card" bodyStyle={{ padding: 'var(--spacing-lg)' }}>
            <Statistic
              title="Total Orders"
              value={totalOrders}
              prefix={<FileTextOutlined style={{ color: 'var(--color-primary)' }} />}
              valueStyle={{ fontSize: 'var(--font-size-xl)' }}
            />
            <div className="stat-card__change">
              <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                All orders
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card" bodyStyle={{ padding: 'var(--spacing-lg)' }}>
            <Statistic
              title="Total Customers"
              value={totalUsers}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ fontSize: 'var(--font-size-xl)' }}
            />
            <div className="stat-card__change">
              <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                Registered users
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="stat-card" bodyStyle={{ padding: 'var(--spacing-lg)' }}>
            <Statistic
              title="Pending Requests"
              value={pendingRequests}
              prefix={<ScissorOutlined style={{ color: pendingRequests > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }} />}
              valueStyle={pendingRequests > 0 ? { color: 'var(--color-warning)', fontSize: 'var(--font-size-xl)' } : { fontSize: 'var(--font-size-xl)' }}
            />
            <div className="stat-card__change">
              <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                Stylist verifications
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={[24, 24]}>
        {/* Recent Orders */}
        <Col xs={24} xl={16}>
          <Card
            title={
              <Space>
                <ShoppingCartOutlined />
                <span>Recent Orders</span>
              </Space>
            }
            extra={
              <Link to="/admin/orders">
                <Button type="link">View All</Button>
              </Link>
            }
            bodyStyle={{ padding: 0 }}
          >
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 400 }}
            />
          </Card>
        </Col>

        {/* Sidebar */}
        <Col xs={24} xl={8}>
          {/* Quick Actions */}
          <Card title="Quick Actions" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Link to="/admin/products" style={{ display: 'block' }}>
                <Button icon={<ShoppingOutlined />} block>
                  Manage Products
                </Button>
              </Link>
              <Link to="/admin/orders" style={{ display: 'block' }}>
                <Button icon={<FileTextOutlined />} block>
                  View Orders
                </Button>
              </Link>
              <Link to="/admin/stylist-requests" style={{ display: 'block' }}>
                <Button
                  icon={<ScissorOutlined />}
                  block
                  type={pendingRequests > 0 ? 'primary' : 'default'}
                >
                  Stylist Requests {pendingRequests > 0 && `(${pendingRequests})`}
                </Button>
              </Link>
              <Link to="/admin/coupons" style={{ display: 'block' }}>
                <Button icon={<RiseOutlined />} block>
                  Manage Coupons
                </Button>
              </Link>
              <Link to="/admin/users" style={{ display: 'block' }}>
                <Button icon={<UserOutlined />} block>
                  User Management
                </Button>
              </Link>
            </Space>
          </Card>

          {/* Inventory Status */}
          <Card title="Inventory Status">
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div>
                <div className="inventory-row">
                  <Text>Total Products</Text>
                  <Text strong>{totalProducts}</Text>
                </div>
                <Progress percent={100} showInfo={false} strokeColor="var(--color-primary)" />
              </div>
              
              <div>
                <div className="inventory-row">
                  <Text>Low Stock Items</Text>
                  <Text strong style={{ color: lowStockProducts > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    {lowStockProducts}
                  </Text>
                </div>
                <Progress
                  percent={Math.round((lowStockProducts / totalProducts) * 100)}
                  showInfo={false}
                  strokeColor={lowStockProducts > 0 ? 'var(--color-warning)' : 'var(--color-success)'}
                />
              </div>

              {lowStockProducts > 0 && (
                <Link to="/admin/products?filter=low-stock">
                  <Button type="link" style={{ padding: 0 }}>
                    View low stock items &rarr;
                  </Button>
                </Link>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboardPage;
