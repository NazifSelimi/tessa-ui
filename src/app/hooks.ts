/**
 * App-level Redux Typed Hooks
 *
 * Pre-typed versions of useDispatch and useSelector for TypeScript.
 * Always use these hooks instead of the plain React Redux hooks.
 *
 * Canonical import path: import { useAppDispatch, useAppSelector } from '@/app/hooks';
 */

import { useDispatch, useSelector, useStore } from 'react-redux';
import type { RootState, AppDispatch } from '@/store/index';

// Use throughout the app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<typeof import('@/store/index').store>();

/**
 * Selector hooks for common state selections
 */

// Auth selectors
export const useAuth = () => useAppSelector((state) => state.auth);
export const useUser = () => useAppSelector((state) => state.auth.user);
export const useCurrentRole = () => useAppSelector((state) => 
  state.auth.user?.role || 'guest'
);
export const useIsAuthenticated = () => useAppSelector((state) => state.auth.isAuthenticated);
export const useAuthLoading = () => useAppSelector((state) => state.auth.isLoading);

// Cart selectors
export const useCartItems = () => useAppSelector((state) => state.cart.items);
export const useCartItemCount = () => useAppSelector((state) => 
  state.cart.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)
);
export const useCartDrawerOpen = () => useAppSelector((state) => state.cart.isDrawerOpen);

// UI selectors
export const useMobileMenuOpen = () => useAppSelector((state) => state.ui.mobileMenuOpen);
export const useGlobalLoading = () => useAppSelector((state) => state.ui.globalLoading);
