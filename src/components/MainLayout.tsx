/**
 * Main Layout Component
 * 
 * Provides the primary layout structure for the shop pages including:
 * - Responsive header with mobile menu
 * - Main content area
 * - Footer
 */

import { useState, useMemo } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { 
  Layout, Menu, Badge, Button, Dropdown, Space, Typography, Drawer,
} from 'antd';
import { 
  ShoppingCartOutlined, 
  UserOutlined, 
  DownOutlined,
  LogoutOutlined,
  FileTextOutlined,
  MenuOutlined,
  CloseOutlined,
  FacebookOutlined,
  InstagramOutlined,
  TwitterOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import CartDrawer from './CartDrawer';
import Logo from './Logo';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

export default function MainLayout() {
  const navigate = useNavigate();
  const { user, currentRole, logout, isAdmin, isDistributor, isStylist } = useAuth();
  const { itemCount, openDrawer } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  // User dropdown menu items
  const userMenuItems = useMemo(() => user ? [
    { 
      key: 'account', 
      icon: <UserOutlined />,
      label: 'My Account', 
      onClick: () => { navigate('/account'); setMobileMenuOpen(false); }
    },
    { 
      key: 'orders', 
      icon: <FileTextOutlined />,
      label: 'My Orders', 
      onClick: () => { navigate('/account/orders'); setMobileMenuOpen(false); }
    },
    { type: 'divider' as const },
    { 
      key: 'logout', 
      icon: <LogoutOutlined />,
      label: 'Logout', 
      danger: true,
      onClick: handleLogout,
    },
  ] : [
    { key: 'login', label: 'Sign In', onClick: () => { navigate('/login'); setMobileMenuOpen(false); } },
    { key: 'register', label: 'Create Account', onClick: () => { navigate('/register'); setMobileMenuOpen(false); } },
  ], [user, navigate, handleLogout]);

  // Main navigation items — memoized to avoid new objects/JSX on every render
  const navItems = useMemo(() => {
    const closeMobile = () => setMobileMenuOpen(false);
    const items: any[] = [
      { key: 'shop', label: <Link to="/" onClick={closeMobile}>Shop</Link> },
      { key: 'hair-survey', label: <Link to="/hair-survey" onClick={closeMobile}>Hair Quiz</Link> },
      { 
        key: 'categories', 
        label: 'Categories', 
        children: [
          { key: 'shampoo', label: <Link to="/?category=shampoo" onClick={closeMobile}>Shampoo</Link> },
          { key: 'conditioner', label: <Link to="/?category=conditioner" onClick={closeMobile}>Conditioner</Link> },
          { key: 'mask', label: <Link to="/?category=mask" onClick={closeMobile}>Masks</Link> },
          { key: 'hair-color', label: <Link to="/?category=hair-color" onClick={closeMobile}>Hair Color</Link> },
          { key: 'styling', label: <Link to="/?category=styling" onClick={closeMobile}>Styling</Link> },
          { key: 'bleach-decolor', label: <Link to="/?category=bleach-decolor" onClick={closeMobile}>Bleach & De Color</Link> },
        ]
      },
      { 
        key: 'brands', 
        label: 'Brands', 
        children: [
          { key: 'fanola', label: <Link to="/?brand=fanola" onClick={closeMobile}>Fanola</Link> },
          { key: 'oro-therapy', label: <Link to="/?brand=oro-therapy" onClick={closeMobile}>Oro Therapy</Link> },
          { key: 'rr-line', label: <Link to="/?brand=rr-line" onClick={closeMobile}>Rr Line</Link> },
          { key: 'no-yellow-color', label: <Link to="/?brand=no-yellow-color" onClick={closeMobile}>No Yellow Color</Link> },
        ]
      },
    ];

    // Role-specific items
    if (isStylist) {
      items.push({ key: 'quick-order', label: <Link to="/stylist/quick-order" onClick={closeMobile}>Quick Order</Link> });
    }
    
    if (isDistributor) {
      items.push({ key: 'distributor', label: <Link to="/distributor" onClick={closeMobile}>Distributor Portal</Link> });
    }
    
    if (isAdmin) {
      items.push({ key: 'admin', label: <Link to="/admin" onClick={closeMobile}>Admin Dashboard</Link> });
    }
    
    if (currentRole === 'guest' || currentRole === 'user') {
      items.push({ key: 'become-stylist', label: <Link to="/stylist/request" onClick={closeMobile}>Become a Stylist</Link> });
    }

    return items;
  }, [isStylist, isDistributor, isAdmin, currentRole]);

  const getRoleBadgeClass = () => {
    switch (currentRole) {
      case 'admin': return 'role-badge role-badge--admin';
      case 'distributor': return 'role-badge role-badge--distributor';
      case 'stylist': return 'role-badge role-badge--stylist';
      case 'user': return 'role-badge role-badge--user';
      default: return 'role-badge role-badge--guest';
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--color-surface)' }}>
      {/* Header */}
      <Header className="site-header" style={{ 
        background: 'var(--color-surface)', 
        padding: 0, 
        height: 'var(--header-height)',
        lineHeight: 'var(--header-height)',
      }}>
        <div className="site-header__inner">
          {/* Logo */}
          <Link to="/" className="site-header__logo" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Logo variant="dark" height={32} />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="site-header__nav">
            <Menu
              mode="horizontal"
              items={navItems}
              style={{ 
                border: 'none', 
                background: 'transparent',
                minWidth: 400,
              }}
              selectedKeys={[]}
            />
          </nav>

          {/* Right Side Actions */}
          <div className="site-header__actions">
            {/* Role Badge - Desktop Only */}
            {currentRole !== 'guest' && (
              <span className={`${getRoleBadgeClass()} hidden-mobile`}>
                {currentRole}
              </span>
            )}
            
            {/* Cart Button */}
            <Badge count={itemCount} size="small" offset={[-2, 2]}>
              <Button 
                type="text" 
                icon={<ShoppingCartOutlined style={{ fontSize: 20 }} />}
                onClick={openDrawer}
                aria-label="Shopping cart"
                style={{ width: 40, height: 40 }}
              />
            </Badge>

            {/* User Menu - Desktop */}
            <Dropdown 
              menu={{ items: userMenuItems }} 
              trigger={['click']} 
              placement="bottomRight"
              className="hidden-mobile"
            >
              <Button type="text" style={{ height: 40 }}>
                <Space>
                  <UserOutlined />
                  <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.name || 'Account'}
                  </span>
                  <DownOutlined style={{ fontSize: 10 }} />
                </Space>
              </Button>
            </Dropdown>

            {/* Mobile Menu Button */}
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: 20 }} />}
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-menu-btn"
              aria-label="Open menu"
              style={{ 
                display: 'none',
                width: 40, 
                height: 40,
              }}
            />
          </div>
        </div>
      </Header>

      {/* Mobile Menu Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Logo variant="dark" height={28} />
            {currentRole !== 'guest' && (
              <span className={getRoleBadgeClass()}>{currentRole}</span>
            )}
          </div>
        }
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={280}
        closeIcon={<CloseOutlined />}
        styles={{ body: { padding: 0 } }}
      >
        {/* User Info */}
        {user && (
          <div style={{ 
            padding: 'var(--spacing-lg)', 
            borderBottom: '1px solid var(--color-border-light)',
            background: 'var(--color-background-alt)',
          }}>
            <Text strong style={{ display: 'block' }}>{user.name}</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>{user.email}</Text>
          </div>
        )}

        {/* Mobile Navigation */}
        <Menu
          mode="inline"
          items={navItems}
          style={{ border: 'none' }}
          selectedKeys={[]}
        />

        {/* Account Links */}
        <div style={{ padding: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border-light)' }}>
          {user ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                block 
                icon={<UserOutlined />}
                onClick={() => { navigate('/account'); setMobileMenuOpen(false); }}
              >
                My Account
              </Button>
              <Button 
                block 
                icon={<FileTextOutlined />}
                onClick={() => { navigate('/account/orders'); setMobileMenuOpen(false); }}
              >
                My Orders
              </Button>
              <Button 
                block 
                danger 
                icon={<LogoutOutlined />}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Space>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                block 
                onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
              >
                Sign In
              </Button>
              <Button 
                block 
                onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
              >
                Create Account
              </Button>
            </Space>
          )}
        </div>
      </Drawer>

      {/* Main Content */}
      <Content className="main-content">
        <Outlet />
      </Content>

      {/* Footer */}
      <Footer className="site-footer" style={{ background: '#1a1a1a', padding: '48px 24px 24px' }}>
        <div className="site-footer__inner" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '32px',
            marginBottom: '32px'
          }}>
            {/* Logo & About */}
            <div>
              <div style={{ marginBottom: '16px' }}>
                <Logo variant="light" height={36} />
              </div>
              <Text style={{ display: 'block', color: '#aaa', fontSize: 14, lineHeight: '1.6' }}>
                Premium professional hair care products for stylists and beauty professionals.
              </Text>
            </div>

            {/* Contact */}
            <div>
              <Text strong style={{ display: 'block', color: '#fff', marginBottom: '16px', fontSize: 15 }}>
                Contact Us
              </Text>
              <Space direction="vertical" size={8}>
                <Text style={{ color: '#aaa', fontSize: 14 }}>
                  <PhoneOutlined style={{ marginRight: 8 }} />
                  +1 (555) 123-4567
                </Text>
                <Text style={{ color: '#aaa', fontSize: 14 }}>
                  <MailOutlined style={{ marginRight: 8 }} />
                  info@tessahaircare.com
                </Text>
              </Space>

              {/* Social Media */}
              <div style={{ marginTop: '16px' }}>
                <Space size={12}>
                  <a href="#" style={{ color: '#aaa', fontSize: 18 }} aria-label="Facebook">
                    <FacebookOutlined />
                  </a>
                  <a href="#" style={{ color: '#aaa', fontSize: 18 }} aria-label="Instagram">
                    <InstagramOutlined />
                  </a>
                  <a href="#" style={{ color: '#aaa', fontSize: 18 }} aria-label="Twitter">
                    <TwitterOutlined />
                  </a>
                </Space>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{ 
            borderTop: '1px solid #333', 
            paddingTop: '24px', 
            display: 'flex', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <Text style={{ color: '#666', fontSize: 13 }}>
              © {new Date().getFullYear()} Tessa Hair Care. All rights reserved.
            </Text>
            <Space size={24}>
              <a href="#" style={{ color: '#666', fontSize: 13 }}>Privacy Policy</a>
              <a href="#" style={{ color: '#666', fontSize: 13 }}>Terms of Service</a>
            </Space>
          </div>
        </div>
      </Footer>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Mobile-specific styles */}
      <style>{`
        @media (max-width: 767px) {
          .site-header__nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
          .hidden-mobile {
            display: none !important;
          }
        }
        @media (min-width: 768px) {
          .site-header__nav {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </Layout>
  );
}
