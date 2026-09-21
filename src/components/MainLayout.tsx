import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ConfigProvider, Drawer, Dropdown } from 'antd';
import { ArrowUpRight, ChevronRight, ClipboardList, Facebook, Headphones, Home, Instagram, LogOut, Menu, Package, Search, ShoppingBag, Sparkles, UserRound, UserRoundCheck, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/shared/utils/formatPrice';
import { site } from '@/shared/config/site';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import './storefront/new-look.css';

const CartDrawer = lazy(() => import('./CartDrawer'));

export default function MainLayout() {
  const { t } = useTranslation();
  const { user, isStylist, isAdmin, isDistributor, logout } = useAuth();
  const { itemCount, subtotal } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.search]);
  useEffect(() => { setSearch(new URLSearchParams(location.search).get('search') || ''); }, [location.search]);

  const home = isStylist ? '/stylist/workspace' : '/';
  const navigation = isStylist ? [
    { to: home, label: t('newLook.home'), icon: Home },
    { to: '/shop', label: t('newLook.products'), icon: Package },
    { to: '/stylist/quick-order', label: t('nav.quickOrder'), icon: Zap },
    { to: '/account/orders', label: t('newLook.orders'), icon: ClipboardList },
    { to: '/cart', label: t('newLook.cart'), icon: ShoppingBag },
  ] : [
    { to: '/', label: t('newLook.home'), icon: Home },
    { to: '/shop', label: t('newLook.products'), icon: Package },
    { to: '/quiz', label: t('newLook.myHair'), icon: Sparkles },
    { to: '/cart', label: t('newLook.cart'), icon: ShoppingBag },
    { to: user ? '/account' : '/login', label: t('newLook.profile'), icon: UserRound },
  ];
  const navLinks = () => navigation.map(({ to, label, icon: Icon }) => (
    <NavLink key={to} to={to} end={to === '/' || to === home} className={({ isActive }) => `${isActive ? 'is-active ' : ''}${to.includes('quick-order') ? 'nl-quick-link' : ''}`}>
      <Icon size={20} /><span>{label}</span>
      {to === '/cart' && itemCount > 0 && <em>{itemCount}</em>}
    </NavLink>
  ));
  const sidebar = <>
    <Link className="nl-sidebar-logo" to={home} aria-label="Tessa"><Logo height={32} /></Link>
    <div className="nl-professional-pill"><i />{t('newLook.professionalAccount')}</div>
    <nav className="nl-side-nav" aria-label={t('newLook.navigation')}>{navLinks()}</nav>
    <div className="nl-side-bottom">
      <Link to="/account"><UserRound size={20} /><span>{user?.name || t('newLook.profile')}</span><ChevronRight size={16} /></Link>
      <Link to="/contact"><Headphones size={20} /><span>{t('newLook.support')}</span></Link>
      <button onClick={() => void logout().then(() => navigate('/'))}><LogOut size={18} />{t('auth.logout')}</button>
    </div>
  </>;
  const accountItems = [
    { key: 'account', label: t('auth.myAccount'), onClick: () => navigate(user ? '/account' : '/login') },
    ...(user ? [
      { key: 'orders', label: t('auth.myOrders'), onClick: () => navigate('/account/orders') },
      { key: 'logout', label: t('auth.logout'), onClick: () => void logout().then(() => navigate('/')) },
    ] : [{ key: 'register', label: t('auth.createAccount'), onClick: () => navigate('/register') }]),
    ...(isAdmin ? [{ key: 'admin', label: t('nav.adminDashboard'), onClick: () => navigate('/admin') }] : []),
    ...(isDistributor ? [{ key: 'distributor', label: t('nav.distributorPortal'), onClick: () => navigate('/distributor') }] : []),
  ];

  return <ConfigProvider theme={{ token: { colorPrimary: '#9b5364', colorText: '#242124', colorBgContainer: '#ffffff', colorBorder: '#e8e2dc', borderRadius: 12, fontFamily: "'Manrope', 'DM Sans', sans-serif" }, components: { Button: { primaryColor: '#ffffff', controlHeight: 44 }, Card: { borderRadiusLG: 18 }, Input: { controlHeight: 44 }, Select: { controlHeight: 44 } } }}>
    <div className={`tessa-design ${isStylist ? 'nl-professional' : 'nl-consumer'}`}>
      <a className="nl-skip-link" href="#page-content">{t('newLook.skipContent')}</a>
      {isStylist && <aside className="nl-sidebar">{sidebar}</aside>}
      <div className="nl-main-area">
        <header className="nl-topbar">
          {isStylist ? <>
            <button className="nl-menu-toggle nl-icon-button" onClick={() => setMenuOpen(true)} aria-label={t('nav.openMenu')} aria-expanded={menuOpen}><Menu size={22} /></button>
            <Link className="nl-mobile-logo" to={home} aria-label="Tessa"><Logo height={26} /></Link>
            <form className="nl-top-search nl-search" role="search" onSubmit={e => { e.preventDefault(); navigate(`/shop${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`); }}>
              <Search size={19} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('newLook.searchPlaceholder')} aria-label={t('home.searchProducts')} />
              <button aria-label={t('newLook.search')}><ArrowUpRight size={18} /></button>
            </form>
          </> : <>
            <Link className="nl-header-logo" to="/" aria-label="Tessa"><Logo height={32} /></Link>
            <nav className="nl-desktop-nav" aria-label={t('newLook.navigation')}>{navigation.slice(0, 3).map(({ to, label }) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
          </>}
          <div className="nl-top-actions">
            {!isStylist && <Link className="nl-audience-link" to="/for-professionals"><UserRoundCheck size={17} />{t('nav.forProfessionals')}</Link>}
            <LanguageSwitcher />
            {!isStylist && <Link className="nl-icon-button" to="/shop?focus=search" aria-label={t('newLook.search')}><Search size={21} /></Link>}
            <Link to="/cart" className={isStylist ? 'nl-cart-button' : 'nl-icon-button nl-cart-icon'} aria-label={`${t('cart.shoppingCart')} (${itemCount})`}><ShoppingBag size={20} />{(isStylist || itemCount > 0) && <em>{itemCount}</em>}{isStylist && <b>{formatPrice(subtotal)}</b>}</Link>
            {!isStylist && <Dropdown menu={{ items: accountItems }} trigger={['click']}><button className="nl-icon-button nl-account-button" aria-label={t('auth.account')}><UserRound size={20} /></button></Dropdown>}
          </div>
        </header>
        <main id="page-content" className="nl-content" tabIndex={-1}><Outlet /></main>
        <footer className="nl-footer">
          <div><Logo height={28} /><p>{t('footer.tagline')}</p></div>
          <div className="nl-footer-contact"><Link to="/contact">{t('footer.contactUs')}</Link>{site.contactPhones.map(phone => <a key={phone.href} href={phone.href}>{phone.label}</a>)}<a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></div>
          <div className="nl-footer-links">{['privacy', 'terms', 'returns', 'delivery'].map((path, i) => <Link to={`/${path}`} key={path}>{t(`footer.${['privacyPolicy', 'termsOfService', 'returns', 'delivery'][i]}`)}</Link>)}</div>
          <small>© {new Date().getFullYear()} Tessa Hair Care<span className="nl-social-links">{site.social.facebook && <a href={site.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={18} /></a>}{site.social.instagram && <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={18} /></a>}</span></small>
        </footer>
      </div>
      <nav className="nl-mobile-nav" aria-label={t('newLook.mobileNavigation')}>{navLinks()}</nav>
      {isStylist && <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} placement="left" width={280} title={t('newLook.navigation')}><div className="tessa-design nl-drawer-sidebar">{sidebar}</div></Drawer>}
      <Suspense fallback={null}><CartDrawer /></Suspense>
    </div>
  </ConfigProvider>;
}
