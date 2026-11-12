import type { WebStorage } from 'redux-persist';

export const createCartPersistConfig = (storage: WebStorage) => ({
  key: 'tessa_cart',
  storage,
  // Bundle selections are part of the order; transient drawer state is not.
  whitelist: ['items', 'bundleIds'],
});
