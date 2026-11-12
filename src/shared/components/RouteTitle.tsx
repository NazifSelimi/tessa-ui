import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { site } from '@/shared/config/site';
import { stripLocalePrefix } from '@/i18n/routing';
import { translate } from '@/shared/utils/translate';

/** Page names for routes without their own <Seo>: i18n key + English fallback. */
const NAMED_PATHS: Record<string, [string, string]> = {
  '/cart': ['pageTitles.cart', 'Cart'],
  '/checkout': ['pageTitles.checkout', 'Checkout'],
  '/account': ['pageTitles.account', 'My account'],
  '/account/orders': ['pageTitles.orders', 'My orders'],
  '/login': ['pageTitles.login', 'Sign in'],
  '/register': ['pageTitles.register', 'Create account'],
  '/forgot-password': ['pageTitles.forgotPassword', 'Forgot password'],
  '/reset-password': ['pageTitles.resetPassword', 'Reset password'],
  '/complete-profile': ['pageTitles.completeProfile', 'Complete your profile'],
  '/stylist/workspace': ['pageTitles.workspace', 'Business workspace'],
  '/stylist/referral': ['pageTitles.referral', 'My referral code'],
  '/stylist/quick-order': ['pageTitles.quickOrder', 'Quick order'],
  '/stylist/request': ['pageTitles.businessRequest', 'Business account request'],
};

function words(segment: string): string {
  const text = segment.replace(/[-_]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/** Title for pages that do not set their own <Seo>, so the tab never keeps the previous page's title. */
export function defaultTitleFor(pathname: string): string {
  const path = stripLocalePrefix(pathname).replace(/\/+$/, '') || '/';
  const named = NAMED_PATHS[path];
  if (named) return `${translate(named[0], named[1])} | ${site.name}`;
  if (path === '/admin') return `Dashboard · Admin | ${site.name}`;
  if (path.startsWith('/admin/')) return `${words(path.split('/')[2] ?? '')} · Admin | ${site.name}`;
  return site.name;
}

/**
 * Sets a plain title on every route change. It runs as a layout effect, before the
 * pages' own <Seo> effects, so a page that sets its own title still wins.
 */
export default function RouteTitle() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  useLayoutEffect(() => {
    document.title = defaultTitleFor(pathname);
  }, [pathname, i18n.language]);
  return null;
}
