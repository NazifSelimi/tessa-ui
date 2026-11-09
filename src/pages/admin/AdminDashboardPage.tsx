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
  ShareAltOutlined,
  FileTextOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  PictureOutlined,
  CheckCircleFilled,
  RightOutlined,
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
  const revenueThisMonth = dashboardStats?.revenueThisMonth ?? 0;
  const todo = dashboardStats?.todo;

  // Each item opens the admin list already filtered to the work it describes.
  const todoItems = todo ? [
    { key: 'orders', count: todo.pendingOrders, label: 'Orders waiting for confirmation', to: '/admin/orders?status=pending', tone: 'urgent' },
    { key: 'stylists', count: todo.pendingStylistRequests, label: 'Business account applications to approve', to: '/admin/stylist-requests', tone: 'urgent' },
    { key: 'emails', count: todo.failedEmails, label: 'Emails that were not sent', to: '/admin/emails?tab=outbox', tone: 'urgent' },
    { key: 'review-stock', count: todo.inReviewInStock, label: 'In-stock products hidden (no photo, brand or category)', to: '/admin/products?review=in_review', tone: 'urgent' },
    { key: 'price', count: todo.missingPrice, label: 'Products missing a retail or salon price', to: '/admin/products?queue=missing_price', tone: 'warn' },
    { key: 'low', count: todo.lowStock, label: 'Products running low (1–3 left)', to: '/admin/products?queue=low_stock', tone: 'warn' },
    { key: 'review', count: todo.inReview, label: 'Products in review (admin only)', to: '/admin/products?review=in_review', tone: 'info' },
    { key: 'out', count: todo.outOfStock, label: 'Sellable products out of stock', to: '/admin/products?queue=out_of_stock', tone: 'info' },
  ] : [];
  const openTodo = todoItems.filter((item) => item.count > 0);

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
        const s = String(status || 'pending');
        const colors: Record<string, string> = {
          pending: 'orange',
          confirmed: 'blue',
          shipped: 'purple',
          cancelled: 'red',
        };
        return (
          <Tag color={colors[s] || 'default'}>
            {s.toUpperCase()}
          </Tag>
        );
      },
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
                Excl. cancelled · {formatPrice(revenueThisMonth)} this month
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

      {/* To-do */}
      <Card
        className="admin-todo"
        title={<Space><CheckCircleFilled style={{ color: 'var(--color-primary)' }} /><span>To do</span></Space>}
        style={{ marginBottom: 'var(--spacing-xl)' }}
        bodyStyle={{ padding: openTodo.length ? 0 : 'var(--spacing-lg)' }}
      >
        {openTodo.length === 0 ? (
          <Text type="secondary">Nothing waiting. Nice work.</Text>
        ) : (
          <ul className="admin-todo__list">
            {openTodo.map((item) => (
              <li key={item.key}>
                <Link to={item.to} className={`admin-todo__item admin-todo__item--${item.tone}`}>
                  <span className="admin-todo__count">{item.count}</span>
                  <span className="admin-todo__label">{item.label}</span>
                  <RightOutlined className="admin-todo__go" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

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
              <Link to="/admin/studio" style={{ display: 'block' }}>
                <Button icon={<PictureOutlined />} block type="primary">
                  Post Studio – make social images
                </Button>
              </Link>
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
                  Business applications {pendingRequests > 0 && `(${pendingRequests})`}
                </Button>
              </Link>
              <Link to="/admin/coupons" style={{ display: 'block' }}>
                <Button icon={<RiseOutlined />} block>
                  Manage Coupons
                </Button>
              </Link>
              <Link to="/admin/referrals" style={{ display: 'block' }}>
                <Button icon={<ShareAltOutlined />} block>
                  Referral codes &amp; credit
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
                  percent={totalProducts > 0 ? Math.round((lowStockProducts / totalProducts) * 100) : 0}
                  showInfo={false}
                  strokeColor={lowStockProducts > 0 ? 'var(--color-warning)' : 'var(--color-success)'}
                />
              </div>

              {lowStockProducts > 0 && (
                <Link to="/admin/products?queue=low_stock">
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
