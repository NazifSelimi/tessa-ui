/**
 * Redux Store Configuration
 * 
 * Centralized store setup with Redux Toolkit and RTK Query.
 * Features:
 * - Single unified baseApi instance (all endpoints share one cache)
 * - Configurable middleware for API calls
 * - Dev tools integration for debugging
 * - Typed hooks for TypeScript support
 * - Persistence ready (localStorage integration)
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import slices from feature modules
import authReducer from '@/features/auth/slice';
import cartReducer from '@/features/cart/slice';
import uiReducer from '@/features/ui/slice';

// Canonical API instance
import { baseApi } from '@/api/baseApi';

// Import feature API files so their injectEndpoints() calls execute at startup.
// The imported modules don't add new reducers; they register endpoints on baseApi.
import '@/features/auth/api';
import '@/features/products/api';
import '@/features/orders/api';
import '@/features/admin/api';
import '@/features/coupons/api';
import '@/features/stylist/api';
import '@/features/recommendations/api';
import '@/features/quickorder/api';

// Persist configuration for cart
const cartPersistConfig = {
  key: 'tessa_cart',
  storage,
  whitelist: ['items'], // Only persist items, not drawer state
};

// Persist configuration for auth
const authPersistConfig = {
  key: 'tessa_auth',
  storage,
  whitelist: ['token', 'refreshToken', 'user'],
};

// Combine all reducers
const rootReducer = combineReducers({
  // Persisted reducers
  auth: persistReducer(authPersistConfig, authReducer),
  cart: persistReducer(cartPersistConfig, cartReducer),
  
  // Non-persisted reducers
  ui: uiReducer,
  
  // Single unified RTK Query API reducer (reducerPath: 'api')
  [baseApi.reducerPath]: baseApi.reducer,
});

// Configure store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware),
  devTools: import.meta.env.DEV,
});

// Setup listeners for RTK Query refetch on focus/reconnect
setupListeners(store.dispatch);

// Create persistor
export const persistor = persistStore(store);

// Infer types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store instance for use outside React components
export default store;
