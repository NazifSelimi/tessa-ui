import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import authReducer, { selectIsAuthenticated } from '@/features/auth/slice';
import { baseApi, baseQueryWithReauth } from '@/api/baseApi';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import type { User } from '@/types';

const user = {
  id: '7', name: 'Ana Test', firstName: 'Ana', lastName: 'Test', email: 'ana@example.invalid', phone: '070000000',
  address: 'Street 1', city: 'Skopje', postcode: '1000', role: 'user',
} as unknown as User;

const makeStore = (auth: { token: string | null; user: User | null }) => configureStore({
  reducer: { auth: authReducer, [baseApi.reducerPath]: baseApi.reducer },
  middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(baseApi.middleware),
  // isAuthenticated is deliberately false: it is not persisted, so it is false after every refresh.
  preloadedState: { auth: { ...auth, isAuthenticated: false, isLoading: false, error: null } },
});

function Where() {
  const location = useLocation();
  return <p>login at {location.pathname}{location.search}</p>;
}

const renderAccount = (store: ReturnType<typeof makeStore>) => render(
  <Provider store={store}>
    <MemoryRouter basename="/mk" initialEntries={['/mk/account']}>
      <Routes>
        <Route path="/account" element={<ProtectedRoute><p>account page</p></ProtectedRoute>} />
        <Route path="/login" element={<Where />} />
      </Routes>
    </MemoryRouter>
  </Provider>,
);

afterEach(() => vi.unstubAllGlobals());

describe('login state display', () => {
  it('treats a restored token as signed in even though isAuthenticated was not persisted', () => {
    expect(selectIsAuthenticated(makeStore({ token: 'abc', user }).getState())).toBe(true);
    expect(selectIsAuthenticated(makeStore({ token: null, user: null }).getState())).toBe(false);
  });

  it('shows a protected page straight away for a restored session', () => {
    renderAccount(makeStore({ token: 'abc', user }));
    expect(screen.getByText('account page')).toBeTruthy();
  });

  it('sends signed-out visitors to login without losing the language prefix', () => {
    renderAccount(makeStore({ token: null, user: null }));
    expect(screen.getByText('login at /login?continue=%2Faccount')).toBeTruthy();
  });

  it('signs out on an expired token without a hard page redirect', async () => {
    const store = makeStore({ token: 'expired', user });
    const replace = vi.fn();
    vi.stubGlobal('location', { ...window.location, pathname: '/mk/shop', replace, assign: replace });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Unauthenticated.' }), { status: 401, headers: { 'Content-Type': 'application/json' } })));

    const result = await baseQueryWithReauth('https://api.example.invalid/v1/auth/me', { getState: store.getState, dispatch: store.dispatch, signal: undefined as unknown as AbortSignal, abort: vi.fn(), extra: undefined, endpoint: 'getCurrentUser', type: 'query' }, {});

    expect(result.error?.status).toBe(401);
    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.user).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
