import { describe, expect, it } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import cartReducer, { applyBundle, openDrawer } from '@/features/cart/slice';
import authReducer, { logout, setCredentials } from '@/features/auth/slice';
import { followAuthAcrossTabs, AUTH_STORAGE_KEY } from '@/store/crossTabAuth';
import type { User } from '@/types';

const user = { id: 1, email: 'a@b.c' } as unknown as User;
const makeStore = () => configureStore({ reducer: { auth: authReducer, cart: cartReducer } });

describe('logout clears the cart', () => {
  it('empties items, bundles and the drawer', () => {
    const store = makeStore();
    store.dispatch(applyBundle({ bundleId: 'x' }));
    store.dispatch(openDrawer());
    store.dispatch(logout());
    expect(store.getState().cart).toMatchObject({ items: [], bundleIds: [], isDrawerOpen: false });
  });
});

describe('cross-tab auth', () => {
  function setup() {
    const store = makeStore();
    const target = new EventTarget();
    const stop = followAuthAcrossTabs(store.dispatch, () => store.getState().auth.token, target as unknown as Window);
    const fire = (newValue: string | null, key: string | null = AUTH_STORAGE_KEY) =>
      target.dispatchEvent(Object.assign(new Event('storage'), { key, newValue }));
    return { store, fire, stop };
  }
  const persisted = (token: string) => JSON.stringify({ token: JSON.stringify(token), user: JSON.stringify(user), _persist: '{}' });

  it('signs this tab out when another tab signs out', () => {
    const { store, fire } = setup();
    store.dispatch(setCredentials({ user, token: 't1' }));
    fire(JSON.stringify({ token: 'null', user: 'null', _persist: '{}' }));
    expect(store.getState().auth.token).toBeNull();
  });

  it('signs out when the key is removed', () => {
    const { store, fire } = setup();
    store.dispatch(setCredentials({ user, token: 't1' }));
    fire(null);
    expect(store.getState().auth.token).toBeNull();
  });

  it('follows a token change and ignores unrelated keys', () => {
    const { store, fire } = setup();
    store.dispatch(setCredentials({ user, token: 't1' }));
    fire(persisted('t2'), 'something-else');
    expect(store.getState().auth.token).toBe('t1');
    fire(persisted('t2'));
    expect(store.getState().auth.token).toBe('t2');
  });
});
