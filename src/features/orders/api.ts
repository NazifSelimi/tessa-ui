/**
 * Orders API Service (RTK Query — injected into baseApi)
 *
 * Handles all order-related API calls:
 * - Create order
 * - Get user orders
 * - Get order details
 */

import { baseApi, API_TAGS } from '@/api/baseApi';
import type { Order, PaymentMethod, PaginatedResponse } from '@/types';

// Request types
interface CreateOrderRequest {
  items: Array<{
    product_id: number | string;
    qty: number;
  }>;
  shipping_address: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state?: string;
    zip: string;
  };
  payment_method: PaymentMethod;
  custom_message?: string;
  coupon_code?: string;
}

// Query params
interface OrdersQueryParams {
  page?: number;
  perPage?: number;
  status?: string;
}

export const ordersApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getOrders: builder.query<PaginatedResponse<Order>, OrdersQueryParams | void>({
      query: (params) => ({
        url: '/v1/orders',
        params: params || undefined,
      }),
      transformResponse: (response: any) => ({
        data: response.data || [],
        meta: response.meta || { current_page: 1, per_page: 10, total: 0, last_page: 1, from: 0, to: 0 },
      }),
      providesTags: [{ type: API_TAGS.Orders, id: 'LIST' }],
    }),

    getOrder: builder.query<Order, string>({
      query: (id) => ({
        url: `/v1/orders/${id}`,
      }),
      transformResponse: (response: any) => response.data,
      providesTags: (result, error, id) => [{ type: API_TAGS.Order, id }],
    }),

    createOrder: builder.mutation<Order, CreateOrderRequest>({
      query: (body) => ({
        url: '/v1/orders',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [{ type: API_TAGS.Orders, id: 'LIST' }],
    }),

    cancelOrder: builder.mutation<Order, string>({
      query: (id) => ({
        url: `/v1/orders/${id}/cancel`,
        method: 'POST',
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: (result, error, id) => [
        { type: API_TAGS.Order, id },
        { type: API_TAGS.Orders, id: 'LIST' },
      ],
    }),
  }),
});

// Export hooks
export const {
  useGetOrdersQuery,
  useLazyGetOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useCancelOrderMutation,
} = ordersApi;
