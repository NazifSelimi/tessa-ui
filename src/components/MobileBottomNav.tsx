/**
 * Mobile Bottom Navigation Bar
 *
 * App-wide bottom nav visible only on mobile (≤767px).
 * - Home, Search (toggle), Cart (badge), Account
 * - Always visible (no scroll-hide)
 * - Search tap dispatches a custom 'toggle-mobile-search' event
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from 'antd';
import {
  HomeOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount, openDrawer } = useCart();
  const { isStylist } = useAuth();

  /* ---- Determine active tab ---- */
  const isHome = location.pathname === '/';
  const isAccount =
    location.pathname.startsWith('/account') ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  const isQuickOrder = location.pathname === '/stylist/quick-order';

  /* ---- Handlers ---- */
  const handleSearch = () => {
    // Stylists go straight to Quick Order page
    if (isStylist) {
      navigate('/stylist/quick-order');
      return;
    }
    // Regular users: toggle search bar on home page
    if (location.pathname !== '/') {
      navigate('/');
    }
    // Dispatch custom event that HomePage listens for
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('toggle-mobile-search'));
    }, location.pathname !== '/' ? 300 : 0);
  };

  const handleCart = () => {
    openDrawer();
  };

  const handleAccount = () => {
    navigate('/account');
  };

  const handleHome = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile navigation"
    >
      <button
        className={`mobile-bottom-nav__item ${isHome ? 'mobile-bottom-nav__item--active' : ''}`}
        onClick={handleHome}
        aria-label="Home"
      >
        <HomeOutlined className="mobile-bottom-nav__icon" />
        <span className="mobile-bottom-nav__label">Home</span>
      </button>

      <button
        className={`mobile-bottom-nav__item ${isQuickOrder ? 'mobile-bottom-nav__item--active' : ''}`}
        onClick={handleSearch}
        aria-label={isStylist ? 'Quick Order' : 'Search'}
      >
        <SearchOutlined className="mobile-bottom-nav__icon" />
        <span className="mobile-bottom-nav__label">{isStylist ? 'Order' : 'Search'}</span>
      </button>

      <button
        className="mobile-bottom-nav__item"
        onClick={handleCart}
        aria-label="Cart"
      >
        <Badge count={itemCount} size="small" offset={[-2, -2]}>
          <ShoppingCartOutlined className="mobile-bottom-nav__icon" />
        </Badge>
        <span className="mobile-bottom-nav__label">Cart</span>
      </button>

      <button
        className={`mobile-bottom-nav__item ${isAccount ? 'mobile-bottom-nav__item--active' : ''}`}
        onClick={handleAccount}
        aria-label="Account"
      >
        <UserOutlined className="mobile-bottom-nav__icon" />
        <span className="mobile-bottom-nav__label">Account</span>
      </button>
    </nav>
  );
}
