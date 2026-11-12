/**
 * Admin Customers API (RTK Query — injected into baseApi).
 *
 * Backs /admin/customers: one row per customer (accounts and guest buyers),
 * what they spent, when they last ordered, notes and tags, and CSV export.
 */

import { baseApi, API_TAGS } from '@/api/baseApi';

export type CustomerType = 'customer' | 'business' | 'guest';

export interface Customer {
  key: string;
  aliases: string[];
  userId: number | null;
  type: CustomerType;
  registered: boolean;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  ordersCount: number;
  cancelledCount: number;
  totalSpent: number;
  averageOrder: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
  joinedAt: string | null;
  storeCredit: number;
  tags: string[];
  notes: string | null;
}

export interface CustomerOrder {
  id: string;
  createdAt: string | null;
  status: 'pending' | 'confirmed' | 'shipped' | 'cancelled';
  total: number;
  paymentMethod: string | null;
  city: string | null;
  address: string | null;
  itemsCount: number;
  items: { productId: number; name: string; quantity: number; price: number }[];
}

export interface CustomerProfile extends Customer {
  orders: CustomerOrder[];
  favouriteProducts: { productId: number; name: string; quantity: number }[];
}

export type CustomerSort =
  | 'name' | 'city' | 'orders_count' | 'total_spent' | 'average_order'
  | 'first_order_at' | 'last_order_at' | 'days_since_last_order' | 'store_credit' | 'joined_at';

export interface CustomersParams {
  q?: string;
  type?: CustomerType | 'registered';
  city?: string;
  tag?: string;
  min_spent?: number;
  max_spent?: number;
  min_orders?: number;
  has_orders?: 0 | 1;
  last_order_after?: string;
  last_order_before?: string;
  inactive_days?: number;
  new_since?: string;
  sort?: CustomerSort;
  direction?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface CustomersResponse {
  data: Customer[];
  meta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
    summary: { customers: number; withOrders: number; totalSpent: number; averageOrder: number };
    tags: string[];
    cities: { city: string; count: number }[];
  };
}

interface Envelope<T, M = undefined> { data: T; meta: M }

// Order changes (status, trash) refresh the list too.
const LIST_TAG = { type: API_TAGS.Users, id: 'CUSTOMERS' } as const;
const ORDERS_TAG = { type: API_TAGS.Orders, id: 'CUSTOMERS' } as const;

/** Drop empty filters so the URL and the CSV export stay clean. */
export function cleanCustomerParams(params: CustomersParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') out[key] = value as string | number;
  }
  return out;
}

export const customersApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getCustomers: builder.query<CustomersResponse, CustomersParams>({
      query: (params) => ({ url: '/v1/admin/customers', params: cleanCustomerParams(params) }),
      transformResponse: (response: Envelope<Customer[], CustomersResponse['meta']>) => ({ data: response.data ?? [], meta: response.meta }),
      providesTags: [LIST_TAG, ORDERS_TAG],
    }),

    getCustomer: builder.query<CustomerProfile, string>({
      query: (key) => ({ url: `/v1/admin/customers/${encodeURIComponent(key)}` }),
      transformResponse: (response: Envelope<CustomerProfile>) => response.data,
      providesTags: (_result, _error, key) => [{ type: API_TAGS.Users, id: `CUSTOMER-${key}` }, ORDERS_TAG],
    }),

    updateCustomerNotes: builder.mutation<Customer, { key: string; notes: string | null; tags: string[] }>({
      query: ({ key, ...body }) => ({ url: `/v1/admin/customers/${encodeURIComponent(key)}`, method: 'PUT', body }),
      transformResponse: (response: Envelope<Customer>) => response.data,
      invalidatesTags: (_result, _error, { key }) => [LIST_TAG, { type: API_TAGS.Users, id: `CUSTOMER-${key}` }],
    }),
  }),
});

export const { useGetCustomersQuery, useGetCustomerQuery, useUpdateCustomerNotesMutation } = customersApi;
