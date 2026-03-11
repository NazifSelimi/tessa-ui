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
  Menu, Badge, Button, Dropdown, Space, Typography, Drawer,
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
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';

// Lazy-load heavy components not needed for initial paint
const CartDrawer = lazy(() => import('./CartDrawer'));
const MobileBottomNav = lazy(() => import('./MobileBottomNav'));

const { Text } = Typography;

export default function MainLayout() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      label: t('auth.myAccount'), 
      onClick: () => { navigate('/account'); setMobileMenuOpen(false); }
    },
    { 
      key: 'orders', 
      icon: <FileTextOutlined />,
      label: t('auth.myOrders'), 
      onClick: () => { navigate('/account/orders'); setMobileMenuOpen(false); }
    },
    { type: 'divider' as const },
    { 
      key: 'logout', 
      icon: <LogoutOutlined />,
      label: t('auth.logout'), 
      danger: true,
      onClick: handleLogout,
    },
  ] : [
    { key: 'login', label: t('auth.signIn'), onClick: () => { navigate('/login'); setMobileMenuOpen(false); } },
    { key: 'register', label: t('auth.createAccount'), onClick: () => { navigate('/register'); setMobileMenuOpen(false); } },
  ], [user, navigate, handleLogout]);

  // Main navigation items — memoized to avoid new objects/JSX on every render
  const navItems = useMemo(() => {
    const closeMobile = () => setMobileMenuOpen(false);
    const items: any[] = [
      { key: 'shop', label: <Link to="/" onClick={closeMobile}>{t('nav.shop')}</Link> },
      { key: 'hair-survey', label: <Link to="/hair-survey" onClick={closeMobile}>{t('nav.hairQuiz')}</Link> },
    ];

    // Role-specific items
    if (isStylist) {
      items.push({ key: 'quick-order', label: <Link to="/stylist/quick-order" onClick={closeMobile}>{t('nav.quickOrder')}</Link> });
    }
    
    if (isDistributor) {
      items.push({ key: 'distributor', label: <Link to="/distributor" onClick={closeMobile}>{t('nav.distributorPortal')}</Link> });
    }
    
    if (isAdmin) {
      items.push({ key: 'admin', label: <Link to="/admin" onClick={closeMobile}>{t('nav.adminDashboard')}</Link> });
    }
    
    if (currentRole === 'guest' || currentRole === 'user') {
      items.push({ key: 'become-stylist', label: <Link to="/stylist/request" onClick={closeMobile}>{t('nav.becomeStylist')}</Link> });
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)' }}>
      {/* Header — plain <header> so position:fixed works without Ant Layout interference */}
      <header className="site-header">
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
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Role Badge - Desktop Only */}
            {currentRole !== 'guest' && (
              <span className={`${getRoleBadgeClass()} hidden-mobile`}>
                {currentRole}
              </span>
            )}
            
            {/* Cart Button - Desktop Only (bottom nav has cart on mobile) */}
            <div className="hidden-mobile">
              <Badge count={itemCount} size="small" offset={[-2, 2]}>
                <Button 
                  type="text" 
                  icon={<ShoppingCartOutlined style={{ fontSize: 20 }} />}
                  onClick={openDrawer}
                  aria-label="Shopping cart"
                  style={{ width: 40, height: 40 }}
                />
              </Badge>
            </div>

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
                    {user?.name || t('auth.account')}
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
      </header>

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
                {t('auth.myAccount')}
              </Button>
              <Button 
                block 
                icon={<FileTextOutlined />}
                onClick={() => { navigate('/account/orders'); setMobileMenuOpen(false); }}
              >
                {t('auth.myOrders')}
              </Button>
              <Button 
                block 
                danger 
                icon={<LogoutOutlined />}
                onClick={handleLogout}
              >
                {t('auth.logout')}
              </Button>
            </Space>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                block 
                onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
              >
                {t('auth.signIn')}
              </Button>
              <Button 
                block 
                onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
              >
                {t('auth.createAccount')}
              </Button>
            </Space>
          )}
        </div>
      </Drawer>

      {/* Main Content — min-height pushes footer below fold to prevent CLS */}
      <main className="main-content" style={{ flex: 1, minHeight: 'calc(100vh - 64px)' }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="site-footer" style={{ background: '#1a1a1a', padding: '48px 24px 24px', minHeight: 240 }}>
        <div className="site-footer__inner" style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Logo & About — centered with flex */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ marginBottom: '12px' }}>
              <Logo variant="light" height={36} />
            </div>
            <Text style={{ display: 'block', color: '#aaa', fontSize: 14, lineHeight: '1.6', maxWidth: 380 }}>
              {t('footer.tagline')}
            </Text>
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px'
          }}>
            {/* Contact */}
            <div style={{ textAlign: 'center' }}>
              <Text strong style={{ display: 'block', color: '#fff', marginBottom: '16px', fontSize: 15 }}>
                {t('footer.contactUs')}
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
                <Space size={4}>
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: '#aaa', fontSize: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 8, transition: 'background 0.2s' }} aria-label="Facebook">
                    <FacebookOutlined />
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ color: '#aaa', fontSize: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 8, transition: 'background 0.2s' }} aria-label="Instagram">
                    <InstagramOutlined />
                  </a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ color: '#aaa', fontSize: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 8, transition: 'background 0.2s' }} aria-label="Twitter">
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
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <Text style={{ color: '#999', fontSize: 13 }}>
              © {new Date().getFullYear()} Tessa Hair Care. {t('footer.allRightsReserved')}
            </Text>
            <Space size={24}>
              <Link to="/privacy" style={{ color: '#999', fontSize: 13 }}>{t('footer.privacyPolicy')}</Link>
              <Link to="/terms" style={{ color: '#999', fontSize: 13 }}>{t('footer.termsOfService')}</Link>
            </Space>
          </div>
        </div>
      </footer>

      {/* Cart Drawer (lazy — not visible on initial paint) */}
      <Suspense fallback={null}>
        <CartDrawer />
      </Suspense>

      {/* Mobile Bottom Navigation (lazy — renders on mobile only) */}
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>

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
          .main-content {
            padding-bottom: calc(var(--spacing-lg) + 64px) !important;
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
    </div>
  );
}
