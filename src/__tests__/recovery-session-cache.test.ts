import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query';
import { describe, expect, it } from 'vitest';
import { createSessionCacheMiddleware } from '@/store/sessionCacheMiddleware';

describe('private API cache isolation', () => {
  const auth = createSlice({
    name: 'auth',
    initialState: { token: null as string | null },
    reducers: { setToken: (state, action: PayloadAction<string | null>) => { state.token = action.payload; } },
  });
  const api = createApi({
    baseQuery: fakeBaseQuery(),
    endpoints: (builder) => ({
      orders: builder.query<string[], void>({
        queryFn: (_arg, { getState }) => ({ data: [(getState() as { auth: { token: string } }).auth.token] }),
      }),
    }),
  });
  const makeStore = () => configureStore({
    reducer: { auth: auth.reducer, [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(createSessionCacheMiddleware(api.util.resetApiState), api.middleware),
  });

  it.each([null, 'account-b'])('removes account A results when the token becomes %s', async (nextToken) => {
    const store = makeStore();
    store.dispatch(auth.actions.setToken('account-a'));
    const request = store.dispatch(api.endpoints.orders.initiate());
    expect(await request.unwrap()).toEqual(['account-a']);
    store.dispatch(auth.actions.setToken(nextToken));
    expect(api.endpoints.orders.select()(store.getState()).data).toBeUndefined();
    if (nextToken) {
      const next = store.dispatch(api.endpoints.orders.initiate());
      expect(await next.unwrap()).toEqual(['account-b']);
      next.unsubscribe();
    }
    request.unsubscribe();
    store.dispatch(api.util.resetApiState());
  });

  it('keeps cached results for actions that do not change identity', async () => {
    const store = makeStore();
    store.dispatch(auth.actions.setToken('account-a'));
    const request = store.dispatch(api.endpoints.orders.initiate());
    await request.unwrap();
    store.dispatch(auth.actions.setToken('account-a'));
    expect(api.endpoints.orders.select()(store.getState()).data).toEqual(['account-a']);
    request.unsubscribe();
    store.dispatch(api.util.resetApiState());
  });
});
