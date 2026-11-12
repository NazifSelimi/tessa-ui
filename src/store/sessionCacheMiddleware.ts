import type { Middleware, UnknownAction } from '@reduxjs/toolkit';

/** Queries such as /orders have identical cache keys for different accounts. */
export function createSessionCacheMiddleware(
  resetApiState: () => UnknownAction,
): Middleware<object, { auth: { token: string | null } }> {
  return (store) => (next) => (action) => {
    const previousToken = store.getState().auth.token;
    const result = next(action);
    if (store.getState().auth.token !== previousToken) {
      store.dispatch(resetApiState());
    }
    return result;
  };
}
