/**
 * Admin Layout Component
 * 
 * Provides the layout structure for admin pages including:
 * - Responsive collapsible sidebar navigation
 * - Mobile drawer navigation
 * - Header with breadcrumbs
 * - Main content area
 */

import { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Typography, Button, Space, Avatar, Dropdown, Badge, Drawer } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  UserOutlined,
  ScissorOutlined,
  TagOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  BellOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import Logo from './Logo';

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

// Page titles mapping (immutable — safe at module scope)
const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/orders': 'Orders',
  '/admin/users': 'Users',
  '/admin/stylist-requests': 'Stylist Requests',
  '/admin/coupons': 'Coupons',
  '/admin/distributors': 'Distributors',
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

const pendingCount = 0;

  // Sidebar menu items — memoized inside the component so it can react to
  // dynamic values like pendingCount once wired to the API.
  const menuItems = useMemo(() => [
    { key: '/admin', icon: <DashboardOutlined />, label: <Link to="/admin">Dashboard</Link> },
    { key: '/admin/products', icon: <ShoppingOutlined />, label: <Link to="/admin/products">Products</Link> },
    { key: '/admin/orders', icon: <FileTextOutlined />, label: <Link to="/admin/orders">Orders</Link> },
    { key: '/admin/users', icon: <UserOutlined />, label: <Link to="/admin/users">Users</Link> },
    {
      key: '/admin/stylist-requests',
      icon: <ScissorOutlined />,
      label: (
        <Link to="/admin/stylist-requests">
          <Space>
            Stylist Requests
            {pendingCount > 0 && <Badge count={pendingCount} size="small" />}
          </Space>
        </Link>
      ),
    },
    { key: '/admin/coupons', icon: <TagOutlined />, label: <Link to="/admin/coupons">Coupons</Link> },
    { key: '/admin/distributors', icon: <TeamOutlined />, label: <Link to="/admin/distributors">Distributors</Link> },
  ], [pendingCount]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 992);
      if (window.innerWidth < 992) {
        setCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const currentTitle = pageTitles[location.pathname] || 'Admin';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => navigate('/account'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout,
    },
  ];

  // Sidebar content (shared between desktop and mobile)
  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="admin-sidebar__logo" style={{ 
        padding: collapsed && !isMobile ? '20px 12px' : '20px 24px', 
        borderBottom: '1px solid var(--color-border-light)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <Logo variant="dark" height={collapsed && !isMobile ? 24 : 28} />
        {(!collapsed || isMobile) && (
          <Text type="secondary" style={{ fontSize: 11 }}>Admin Panel</Text>
        )}
      </div>

      {/* Navigation Menu */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={() => isMobile && setMobileMenuOpen(false)}
        style={{ 
          borderRight: 'none', 
          padding: '12px 8px',
          flex: 1,
        }}
      />

      {/* Back to Shop Link */}
      <div style={{ 
        padding: collapsed && !isMobile ? '16px 8px' : '16px',
        borderTop: '1px solid var(--color-border-light)',
      }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
          block
          style={{ 
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            color: 'var(--color-text-secondary)',
          }}
        >
          {(!collapsed || isMobile) && 'Back to Shop'}
        </Button>
      </div>
    </>
  );

  return (
    <Layout className="admin-layout">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider 
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          width={260}
          collapsedWidth={80}
          className={`admin-sidebar ${collapsed ? 'admin-sidebar--collapsed' : 'admin-sidebar--expanded'}`}
          style={{ 
            background: 'var(--color-surface)',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <SidebarContent />
        </Sider>
      )}

      {/* Mobile Menu Drawer */}
      {isMobile && (
        <Drawer
          title={null}
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          width={280}
          closeIcon={<CloseOutlined />}
          styles={{ 
            body: { padding: 0, display: 'flex', flexDirection: 'column' },
            header: { display: 'none' }
          }}
        >
          <SidebarContent />
        </Drawer>
      )}

      {/* Main Area */}
      <Layout 
        className={`admin-main ${collapsed && !isMobile ? 'admin-main--sidebar-collapsed' : 'admin-main--sidebar-expanded'}`}
        style={{ 
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 260), 
          transition: 'margin-left 0.2s',
        }}
      >
        {/* Header */}
        <Header className="admin-header">
          {/* Left: Collapse button & Title */}
          <Space size="middle">
            <Button
              type="text"
              icon={isMobile ? <MenuFoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
              onClick={() => isMobile ? setMobileMenuOpen(true) : setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
              aria-label={isMobile ? 'Open menu' : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
            />
            <Title level={4} style={{ margin: 0, fontSize: isMobile ? 16 : 20 }}>{currentTitle}</Title>
          </Space>

          {/* Right: Notifications & User */}
          <Space size={isMobile ? 'small' : 'middle'}>
            <Badge count={pendingCount} size="small">
              <Button 
                type="text" 
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                onClick={() => navigate('/admin/stylist-requests')}
                aria-label="Notifications"
              />
            </Badge>

            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar 
                  size={36} 
                  style={{ background: 'var(--color-primary)' }}
                >
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </Avatar>
                {!isMobile && (
                  <div style={{ lineHeight: 1.2 }}>
                    <Text strong style={{ display: 'block', fontSize: 13 }}>
                      {user?.name || 'Admin'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>Administrator</Text>
                  </div>
                )}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Content */}
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
