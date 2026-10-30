import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import { describe, expect, it } from 'vitest';
import cartReducer, { applyBundle, openDrawer } from '@/features/cart/slice';
import { createCartPersistConfig } from '@/store/cartPersistence';

describe('cart refresh', () => {
  it('retains selected bundle offers while resetting the drawer', async () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: async (key: string) => saved.get(key) ?? null,
      setItem: async (key: string, value: string) => { saved.set(key, value); },
      removeItem: async (key: string) => { saved.delete(key); },
    };
    const config = createCartPersistConfig(storage);
    const createStore = () => configureStore({
      reducer: persistReducer(config, cartReducer),
      middleware: (getDefault) => getDefault({ serializableCheck: false }),
    });
    const first = createStore();
    const firstPersistor = persistStore(first);
    await new Promise<void>((resolve) => {
      if (firstPersistor.getState().bootstrapped) resolve();
      else { const unsubscribe = firstPersistor.subscribe(() => {
        if (firstPersistor.getState().bootstrapped) { unsubscribe(); resolve(); }
      }); }
    });
    first.dispatch(applyBundle({ bundleId: 'offer-12' }));
    first.dispatch(openDrawer());
    await firstPersistor.flush();
    firstPersistor.pause();

    const reloaded = createStore();
    await new Promise<void>((resolve) => { persistStore(reloaded, undefined, resolve); });
    expect(reloaded.getState().bundleIds).toEqual(['offer-12']);
    expect(reloaded.getState().isDrawerOpen).toBe(false);
  });
});
