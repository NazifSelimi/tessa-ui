import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/slice';
import { safeContinuePath, withCurrentLocalePrefix } from '@/i18n/routing';

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname}{l.search}</div>;
}

describe('login keeps the language prefix', () => {
  it('redirects a signed-out visitor to /login under the same router basename', () => {
    const store = configureStore({ reducer: { auth: authReducer } });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/admin/orders']}>
          <Routes>
            <Route path="/admin/orders" element={<ProtectedRoute><div>secret</div></ProtectedRoute>} />
            <Route path="/login" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );
    expect(screen.getByTestId('where').textContent).toBe('/login?continue=%2Fadmin%2Forders');
  });

  it('strips a stray prefix from continue and re-adds the current one for social login', () => {
    expect(safeContinuePath('/en/admin/orders')).toBe('/admin/orders');
    expect(safeContinuePath('//evil.com')).toBe('/');
    expect(withCurrentLocalePrefix('/cart', '/sq/login')).toBe('/sq/cart');
    expect(withCurrentLocalePrefix('/cart', '/login')).toBe('/cart');
  });
});
