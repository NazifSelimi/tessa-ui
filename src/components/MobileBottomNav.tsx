/**
 * Mobile Bottom Navigation Bar
 *
 * App-wide bottom nav visible only on mobile (≤767px). Five fixed tabs:
 *   Home · Shop · Quiz · Cart · Account
 *
 * For stylists the "Quiz" tab becomes "Order" → Quick Order, giving pros a
 * one-tap path to fast reordering (their primary job).
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from 'antd';
import {
  HomeOutlined,
  AppstoreOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount, openDrawer } = useCart();
  const { isStylist } = useAuth();
  const { t } = useTranslation();

  const path = location.pathname;
  const isHome = path === '/';
  const isShop = path === '/shop';
  const isQuiz = path === '/hair-survey' || path === '/quiz';
  const isQuickOrder = path === '/stylist/quick-order';
  const isAccount =
    path.startsWith('/account') || path === '/login' || path === '/register';

  const go = (to: string) => {
    navigate(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <button
        className={`mobile-bottom-nav__item ${isHome ? 'mobile-bottom-nav__item--active' : ''}`}
        onClick={() => go('/')}
        aria-label={t('mobile.home')}
      >
        <HomeOutlined className="mobile-bottom-nav__icon" />
        <span className="mobile-bottom-nav__label">{t('mobile.home')}</span>
      </button>

      <button
        className={`mobile-bottom-nav__item ${isShop ? 'mobile-bottom-nav__item--active' : ''}`}
        onClick={() => go('/shop')}
        aria-label={t('mobile.shop')}
      >
        <AppstoreOutlined className="mobile-bottom-nav__icon" />
        <span className="mobile-bottom-nav__label">{t('mobile.shop')}</span>
      </button>

      {/* Stylists get a fast path to Quick Order; everyone else gets the Quiz */}
      {isStylist ? (
        <button
          className={`mobile-bottom-nav__item ${isQuickOrder ? 'mobile-bottom-nav__item--active' : ''}`}
          onClick={() => go('/stylist/quick-order')}
          aria-label={t('mobile.order')}
        >
          <ThunderboltOutlined className="mobile-bottom-nav__icon" />
          <span className="mobile-bottom-nav__label">{t('mobile.order')}</span>
        </button>
      ) : (
        <button
          className={`mobile-bottom-nav__item ${isQuiz ? 'mobile-bottom-nav__item--active' : ''}`}
          onClick={() => go('/hair-survey')}
          aria-label={t('mobile.quiz')}
        >
          <ExperimentOutlined className="mobile-bottom-nav__icon" />
          <span className="mobile-bottom-nav__label">{t('mobile.quiz')}</span>
        </button>
      )}

      <button
        className="mobile-bottom-nav__item"
        onClick={openDrawer}
        aria-label={t('mobile.cart')}
      >
        <Badge count={itemCount} size="small" offset={[-2, -2]}>
          <ShoppingCartOutlined className="mobile-bottom-nav__icon" />
        </Badge>
        <span className="mobile-bottom-nav__label">{t('mobile.cart')}</span>
      </button>

      <button
        className={`mobile-bottom-nav__item ${isAccount ? 'mobile-bottom-nav__item--active' : ''}`}
        onClick={() => go('/account')}
        aria-label={t('mobile.account')}
      >
        <UserOutlined className="mobile-bottom-nav__icon" />
        <span className="mobile-bottom-nav__label">{t('mobile.account')}</span>
      </button>
    </nav>
  );
}
