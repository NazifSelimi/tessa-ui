/**
 * Canonical Base API Configuration for RTK Query — SINGLE INSTANCE
 *
 * This is the ONE createApi instance for the entire app.
 * All feature files (features/auth/api, features/products/api, etc.)
 * call baseApi.injectEndpoints() to register their endpoints.
 *
 * Provides a configured base query with:
 * - Authentication token injection (Bearer token — NO cookies)
 * - 401 handling with logout + redirect
 * - 500-level error logging
 */

import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store/index';
import { logout } from '@/features/auth/slice';
import { logWarn, logError } from '@/shared/utils/logger';

/**
 * Module-level flag to prevent multiple concurrent 401 responses from each
 * dispatching logout() and triggering window.location.replace('/login').
 * Resets after 3 s so a genuinely new session-expiry is still handled.
 */
let _isHandling401 = false;

// Base URL from environment - Laravel backend
const API_BASE_URL = import.meta.env.VITE_API_URL as string;

/**
 * Base query with authentication (Bearer token mode - NO cookies)
 */
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: undefined, // MUST NOT use cookies - Bearer token only
  prepareHeaders: (headers, { getState }) => {
    // Get token from Redux state
    const state = getState() as RootState;
    const token = state.auth.token;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    headers.set('Accept', 'application/json');

    // Don't set Content-Type here - let fetch handle it for FormData
    // headers.set('Content-Type', 'application/json');

    return headers;
  },
});

/**
 * Base query with token refresh
 *
 * Handles 401 errors by attempting to refresh the token.
 * If refresh fails, logs out the user.
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  // Handle 401 Unauthorized — only treat as session-expiry if user was
  // authenticated (has a token). Unauthenticated 401s (e.g. wrong password
  // on the login page) are passed through so the caller sees the real error.
  if (result.error && result.error.status === 401) {
    const state = api.getState() as RootState;

    if (state.auth.token) {
      // Deduplicate: only the first 401 dispatches logout + redirect
      if (!_isHandling401) {
        _isHandling401 = true;
        logWarn('401 Unauthorized — session expired, logging out', {
          url: typeof args === 'string' ? args : args.url,
        });
        api.dispatch(logout());

        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.replace('/login');
        }

        // Allow the flag to reset so a future (genuinely new) 401 is handled
        setTimeout(() => { _isHandling401 = false; }, 3000);
      }

      // Return a consistent error shape for session-expiry 401s
      return {
        error: {
          status: 401,
          data: { success: false, message: 'Session expired. Please log in again.' },
        } as FetchBaseQueryError,
      };
    }

    // No token → pass through the original error (e.g. login failure)
  }

  // Log 500-level server errors for observability
  if (result.error && typeof result.error.status === 'number' && result.error.status >= 500) {
    logError(`Server error ${result.error.status}`, {
      url: typeof args === 'string' ? args : args.url,
      status: result.error.status,
      body: result.error.data,
    });
  }

  return result;
};

/**
 * Tags for cache invalidation
 */
export const API_TAGS = {
  Auth: 'Auth',
  User: 'User',
  Products: 'Products',
  Product: 'Product',
  Categories: 'Categories',
  Brands: 'Brands',
  Orders: 'Orders',
  Order: 'Order',
  Coupons: 'Coupons',
  StylistRequests: 'StylistRequests',
  StylistCodes: 'StylistCodes',
  Users: 'Users',
  Dashboard: 'Dashboard',
  StylistDashboard: 'StylistDashboard',
  DistributorCodes: 'DistributorCodes',
  StylistOrders: 'StylistOrders',
} as const;

export type ApiTag = typeof API_TAGS[keyof typeof API_TAGS];

/**
 * Unified base API instance.
 *
 * reducerPath: 'api' — one reducer, one middleware, one cache.
 * ALL tag types declared here so cross-domain invalidation works.
 * Endpoints are empty — each feature file calls baseApi.injectEndpoints().
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: Object.values(API_TAGS),
  endpoints: () => ({}),
});
