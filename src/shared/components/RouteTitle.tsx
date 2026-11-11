import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { site } from '@/shared/config/site';

const NAMED_PATHS: Record<string, string> = {
  '/cart': 'Cart',
  '/checkout': 'Checkout',
  '/account': 'My account',
  '/account/orders': 'My orders',
  '/login': 'Sign in',
  '/register': 'Create account',
};

function words(segment: string): string {
  const text = segment.replace(/[-_]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/** Title for pages that do not set their own <Seo>, so the tab never keeps the previous page's title. */
export function defaultTitleFor(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (NAMED_PATHS[path]) return `${NAMED_PATHS[path]} | ${site.name}`;
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
  useLayoutEffect(() => {
    document.title = defaultTitleFor(pathname);
  }, [pathname]);
  return null;
}
