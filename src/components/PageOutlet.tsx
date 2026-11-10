import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

/**
 * The page area inside a layout. While a page is still loading, or if it
 * crashes, only this area changes: the menu and header stay, and moving to
 * another page clears the error. Before, both cases replaced the whole screen,
 * which looked like the site had reloaded or broken.
 */
export default function PageOutlet() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<div aria-busy="true" style={{ minHeight: '40vh' }} />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}
