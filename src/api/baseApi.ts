/**
 * Canonical Base API Configuration for RTK Query — SINGLE INSTANCE
 *
 * This is the ONE createApi instance for the entire app.
 * All feature files (features/auth/api, features/products/api, etc.)
 * call baseApi.injectEndpoints() to register their endpoints.
 *
 * Provides a configured base query with:
 * - Authentication token injection (Bearer token — NO cookies)
 * - 401 handling: clear the session and tell the user (route guards redirect)
 * - 500-level error logging
 */

import { createAction } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store/index';
import { logWarn, logError } from '@/shared/utils/logger';
import i18n from '@/i18n';
import { notification } from 'antd';

// The auth slice's logout action, by type: importing the slice here would form an
// import cycle (slice -> auth api -> baseApi) that breaks whichever module loads first.
const logout = createAction('auth/logout');

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

    // Send current locale to backend
    headers.set('Accept-Language', i18n.language || 'mk');

    // Don't set Content-Type here - let fetch handle it for FormData
    // headers.set('Content-Type', 'application/json');

    return headers;
  },
});

/**
 * Base query with session-expiry handling.
 *
 * A 401 on a call that carried a token means the sign-in ended (expired,
 * revoked, password changed elsewhere): sign out once with a notice, then
 * repeat the call as a guest so public pages keep working. A 401 without a
 * token (e.g. wrong password on the login page) is passed through unchanged.
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const sentWithToken = Boolean((api.getState() as RootState).auth.token);
  const result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && sentWithToken) {
    // Several calls usually fail together on page load: the first one signs out
    // (the notice has a fixed key, so it shows once).
    if ((api.getState() as RootState).auth.token) {
      logWarn('401 Unauthorized — session expired, logging out', {
        url: typeof args === 'string' ? args : args.url,
      });
      api.dispatch(logout());

      // No hard redirect: public pages stay put as a guest, and ProtectedRoute
      // sends protected pages to the locale-aware /login?continue=... route.
      notification.info({ key: 'session-expired', message: i18n.t('auth.sessionExpired'), placement: 'topRight' });
    }

    if (!(api.getState() as RootState).auth.token) {
      const asGuest = await baseQuery(args, api, extraOptions);
      if (!asGuest.error) return asGuest;
    }

    return {
      error: {
        status: 401,
        data: { success: false, message: 'Session expired. Please log in again.' },
      } as FetchBaseQueryError,
    };
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
  Bundles: 'Bundles',
  PricingSettings: 'PricingSettings',
  ContentBlocks: 'ContentBlocks',
  Referrals: 'Referrals',
  Features: 'Features',
  Business: 'Business',
  Emails: 'Emails',
  EmailSettings: 'EmailSettings',
  AiTokens: 'AiTokens',
  AdminQueries: 'AdminQueries',
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
