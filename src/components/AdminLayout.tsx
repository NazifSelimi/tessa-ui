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
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PageOutlet from './PageOutlet';
import { Layout, Menu, Typography, Button, Space, Avatar, Dropdown, Badge, Drawer } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  UserOutlined,
  ScissorOutlined,
  TagOutlined,
  ShareAltOutlined,
  GiftOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  BellOutlined,
  CloseOutlined,
  QrcodeOutlined,
  PictureOutlined,
  AuditOutlined,
  ExperimentOutlined,
  LayoutOutlined,
  InstagramOutlined,
  MailOutlined,
  AppstoreOutlined,
  IdcardOutlined,
  ContactsOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  BarChartOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { useGetDashboardStatsQuery } from '@/features/admin/api';
import { ADMIN_PATH_FEATURE, useFeatureStates } from '@/features/admin/platformApi';
import Logo from './Logo';

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

// Page titles mapping (immutable — safe at module scope)
const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/import': 'Excel import',
  '/admin/orders': 'Orders',
  '/admin/users': 'Users',
  '/admin/stylist-requests': 'Business applications',
  '/admin/stylist-invitations': 'Business invitations',
  '/admin/customers': 'Customers',
  '/admin/documents': 'PDF documents',
  '/admin/reports': 'Sales reports',
  '/admin/coupons': 'Coupons',
  '/admin/referrals': 'Referral codes',
  '/admin/distributors': 'Distributors',
  '/admin/bundles': 'Offers & Bundles',
  '/admin/content-blocks': 'Editable Sections',
  '/admin/catalog-images': 'Image Review',
  '/admin/catalogue-review': 'Supplier list (old)',
  '/admin/hair-quiz': 'Hair Quiz',
  '/admin/studio': 'Post Studio',
  '/admin/emails': 'Emails',
  '/admin/features': 'Features',
  '/admin/business': 'Business profile',
  '/admin/messages': 'Viber & WhatsApp',
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Same numbers as the dashboard to-do list; refreshed when orders or requests change.
  const { data: stats } = useGetDashboardStatsQuery(undefined, { pollingInterval: 120_000 });
  const pendingCount = stats?.pendingStylistRequests ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;
  const failedEmails = stats?.todo?.failedEmails ?? 0;
  const features = useFeatureStates();

  // Sidebar menu items, with live badges for work waiting.
  const menuItems = useMemo(() => [
    { key: '/admin', icon: <DashboardOutlined />, label: <Link to="/admin">Dashboard</Link> },
    { key: '/admin/products', icon: <ShoppingOutlined />, label: <Link to="/admin/products">Products</Link> },
    { key: '/admin/import', icon: <FileExcelOutlined />, label: <Link to="/admin/import">Excel import</Link> },
    {
      key: '/admin/orders',
      icon: <FileTextOutlined />,
      label: (
        <Link to="/admin/orders">
          <Space>
            Orders
            {pendingOrders > 0 && <Badge count={pendingOrders} size="small" />}
          </Space>
        </Link>
      ),
    },
    { key: '/admin/customers', icon: <ContactsOutlined />, label: <Link to="/admin/customers">Customers</Link> },
    { key: '/admin/documents', icon: <FilePdfOutlined />, label: <Link to="/admin/documents">PDF documents</Link> },
    { key: '/admin/reports', icon: <BarChartOutlined />, label: <Link to="/admin/reports">Sales reports</Link> },
    { key: '/admin/users', icon: <UserOutlined />, label: <Link to="/admin/users">Users</Link> },
    {
      key: '/admin/stylist-requests',
      icon: <ScissorOutlined />,
      label: (
        <Link to="/admin/stylist-requests">
          <Space>
            Business applications
            {pendingCount > 0 && <Badge count={pendingCount} size="small" />}
          </Space>
        </Link>
      ),
    },
    { key: '/admin/stylist-invitations', icon: <QrcodeOutlined />, label: <Link to="/admin/stylist-invitations">Business invitations</Link> },
    { key: '/admin/coupons', icon: <TagOutlined />, label: <Link to="/admin/coupons">Coupons</Link> },
    { key: '/admin/referrals', icon: <ShareAltOutlined />, label: <Link to="/admin/referrals">Referral codes</Link> },
    { key: '/admin/bundles', icon: <GiftOutlined />, label: <Link to="/admin/bundles">Offers & Bundles</Link> },
    {
      key: '/admin/emails',
      icon: <MailOutlined />,
      label: (
        <Link to="/admin/emails">
          <Space>
            Emails
            {failedEmails > 0 && <Badge count={failedEmails} size="small" title={`${failedEmails} not sent`} />}
          </Space>
        </Link>
      ),
    },
    { key: '/admin/studio', icon: <InstagramOutlined />, label: <Link to="/admin/studio">Post Studio</Link> },
    { key: '/admin/messages', icon: <WhatsAppOutlined />, label: <Link to="/admin/messages">Viber & WhatsApp</Link> },
    { key: '/admin/content-blocks', icon: <LayoutOutlined />, label: <Link to="/admin/content-blocks">Editable Sections</Link> },
    { key: '/admin/catalog-images', icon: <PictureOutlined />, label: <Link to="/admin/catalog-images">Image Review</Link> },
    { key: '/admin/catalogue-review', icon: <AuditOutlined />, label: <Link to="/admin/catalogue-review">Supplier list (old)</Link> },
    { key: '/admin/hair-quiz', icon: <ExperimentOutlined />, label: <Link to="/admin/hair-quiz">Hair Quiz</Link> },
    { key: '/admin/distributors', icon: <TeamOutlined />, label: <Link to="/admin/distributors">Distributors</Link> },
    { key: '/admin/business', icon: <IdcardOutlined />, label: <Link to="/admin/business">Business profile</Link> },
    { key: '/admin/features', icon: <AppstoreOutlined />, label: <Link to="/admin/features">Features</Link> },
  ].filter((item) => !ADMIN_PATH_FEATURE[item.key] || features?.[ADMIN_PATH_FEATURE[item.key]]?.enabled !== false && features?.[ADMIN_PATH_FEATURE[item.key]]?.included !== false),
  [pendingCount, pendingOrders, failedEmails, features]);
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
            <Badge count={pendingCount + pendingOrders} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                onClick={() => navigate('/admin')}
                aria-label="Work waiting (dashboard to-do list)"
                title="Work waiting: see the dashboard to-do list"
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
          <PageOutlet />
        </Content>
      </Layout>
    </Layout>
  );
}
