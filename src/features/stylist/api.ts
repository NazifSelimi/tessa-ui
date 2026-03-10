/**
 * Stylist API Service (RTK Query — injected into baseApi)
 *
 * Handles all stylist-related API calls:
 * - Distributor codes management
 * - Stylist dashboard
 * - Commission tracking
 */

import { baseApi, API_TAGS } from '@/api/baseApi';
import type { PaginatedResponse } from '@/types';

// Types
interface DistributorCode {
  id: string;
  code: string;
  discountPercentage: number;
  usageCount: number;
  totalRevenue: number;
  isActive: boolean;
  createdAt: string;
}

interface CodeStats {
  code: string;
  usageCount: number;
  totalRevenue: number;
  totalDiscount: number;
  orders: Array<{
    orderId: string;
    total: number;
    discount: number;
    createdAt: string;
  }>;
}

interface StylistDashboardStats {
  totalReferrals: number;
  totalRevenue: number;
  totalCommission: number;
  activeCodes: number;
  monthlyReferrals: number;
  monthlyRevenue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    salesCount: number;
    revenue: number;
  }>;
  recentOrders: any[];
}

interface StylistOrder {
  id: string;
  total: number;
  discount: number;
  codeUsed: string;
  status: string;
  createdAt: string;
}

interface StylistOrdersQueryParams {
  page?: number;
  per_page?: number;
  code?: string;
}

export const stylistApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getStylistDashboard: builder.query<StylistDashboardStats, void>({
      query: () => '/v1/stylist/dashboard',
      transformResponse: (response: any) => response.data,
      providesTags: [API_TAGS.StylistDashboard],
    }),

    getDistributorCodes: builder.query<DistributorCode[], void>({
      query: () => '/v1/stylist/codes',
      transformResponse: (response: any) => response.data || [],
      providesTags: [API_TAGS.DistributorCodes],
    }),

    generateDistributorCode: builder.mutation<DistributorCode, { discountPercentage?: number }>({
      query: (body) => ({
        url: '/v1/stylist/codes/generate',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.DistributorCodes, API_TAGS.StylistDashboard],
    }),

    getCodeStats: builder.query<CodeStats, string>({
      query: (code) => `/v1/stylist/codes/${code}/stats`,
      transformResponse: (response: any) => response.data,
    }),

    updateDistributorCode: builder.mutation<DistributorCode, { code: string; isActive: boolean }>({
      query: ({ code, isActive }) => ({
        url: `/v1/stylist/codes/${code}`,
        method: 'PUT',
        body: { isActive },
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.DistributorCodes, API_TAGS.StylistDashboard],
    }),

    getStylistOrders: builder.query<PaginatedResponse<StylistOrder>, StylistOrdersQueryParams | void>({
      query: (params) => ({
        url: '/v1/stylist/orders',
        params: params || {},
      }),
      transformResponse: (response: any) => ({
        data: response.data || [],
        meta: response.meta || { current_page: 1, per_page: 10, total: 0, last_page: 1, from: 0, to: 0 },
      }),
      providesTags: [API_TAGS.StylistOrders],
    }),
  }),
});

// Export hooks
export const {
  useGetStylistDashboardQuery,
  useGetDistributorCodesQuery,
  useGenerateDistributorCodeMutation,
  useGetCodeStatsQuery,
  useLazyGetCodeStatsQuery,
  useUpdateDistributorCodeMutation,
  useGetStylistOrdersQuery,
} = stylistApi;
