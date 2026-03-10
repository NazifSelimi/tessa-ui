/**
 * Quick Order API Service (RTK Query — injected into baseApi)
 *
 * Handles:
 * - GET /v1/products/quick-order — paginated product list optimised for stylist quick-order
 *
 * Laravel response envelope: { success, data, meta }
 */

import { baseApi, API_TAGS } from '@/api/baseApi';
import type { QuickOrderItem, QuickOrderQueryParams, PaginationMeta } from '@/types';

interface QuickOrderApiResponse {
  success: true;
  data: QuickOrderItem[];
  meta: PaginationMeta;
}

export const quickOrderApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getQuickOrderProducts: builder.query<
      { data: QuickOrderItem[]; meta: PaginationMeta },
      QuickOrderQueryParams | undefined
    >({
      query: (params) => ({
        url: '/v1/products/quick-order',
        params: {
          page: params?.page ?? 1,
          perPage: params?.perPage ?? 25,
          search: params?.search || undefined,
        },
      }),
      transformResponse: (response: QuickOrderApiResponse) => ({
        data: response.data,
        meta: response.meta,
      }),
      providesTags: [{ type: API_TAGS.Products, id: 'QUICK_ORDER' }],
    }),
  }),
});

export const {
  useGetQuickOrderProductsQuery,
  useLazyGetQuickOrderProductsQuery,
} = quickOrderApi;
