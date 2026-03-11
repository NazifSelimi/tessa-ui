/**
 * Admin API Service (RTK Query — injected into baseApi)
 *
 * Handles all admin-related API calls:
 * - Dashboard stats
 * - User management
 * - Order management
 * - Stylist requests
 * - Coupons management
 * - Product/Category/Brand management
 */

import { baseApi, API_TAGS } from '@/api/baseApi';
import type {
  User,
  Order,
  OrderStatus,
  StylistRequest,
  DashboardStats,
  PaginatedResponse
} from '@/types';

// Query params for admin endpoints
interface AdminOrdersQueryParams {
  page?: number;
  per_page?: number;
  status?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

interface AdminStylistRequestsQueryParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
}

interface AdminUsersQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: 'admin' | 'stylist' | 'user';
  status?: 'active' | 'inactive';
}

interface AdminCouponsQueryParams {
  page?: number;
  per_page?: number;
  status?: 'active' | 'inactive' | 'expired';
  search?: string;
}

interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  quantity: number;
  category_id: number;
  brand_id: number;
  featured?: boolean;
  tags?: string[];
  images?: File[];
}

interface _UpdateProductRequest extends Partial<CreateProductRequest> {}

interface CreateCouponRequest {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  quantity: number;
  expiration_date?: string;
}

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: 'admin' | 'stylist' | 'user';
  password?: string;
}

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  quantity: number;
  expirationDate?: string;
  isValid?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const adminApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => '/v1/admin/dashboard',
      transformResponse: (response: any) => {
        const data = response.data;
        // Map integer status from dashboard endpoint to string
        const statusMap: Record<number, string> = { 0: 'pending', 1: 'confirmed', 2: 'shipped', 3: 'cancelled' };
        return {
          totalRevenue: parseFloat(String(data.totalRevenue ?? 0).replace(/,/g, '')) || 0,
          totalOrders: data.totalOrders ?? 0,
          totalUsers: data.totalUsers ?? 0,
          totalProducts: data.totalProducts ?? 0,
          pendingStylistRequests: 0,
          lowStockProducts: 0,
          recentOrders: (data.recentOrders || []).map((o: any) => ({
            id: o.id,
            total: o.total,
            status: typeof o.status === 'number' ? (statusMap[o.status] ?? 'pending') : o.status,
            shippingAddress: { fullName: o.userName || 'Unknown' },
            createdAt: o.createdAt,
          })),
          ordersByStatus: {
            pending: 0,
            confirmed: 0,
            shipped: 0,
            cancelled: 0,
          },
          revenueByMonth: [],
          topProducts: [],
        };
      },
      providesTags: [API_TAGS.Dashboard],
    }),

    getAllUsers: builder.query<PaginatedResponse<User>, AdminUsersQueryParams | void>({
      query: (params) => ({
        url: '/v1/admin/users',
        params: params || {},
      }),
      transformResponse: (response: any) => ({
        data: response.data || [],
        meta: response.meta || { current_page: 1, per_page: 10, total: 0, last_page: 1, from: 0, to: 0 },
      }),
      providesTags: [API_TAGS.Users],
    }),

    getUser: builder.query<User, string>({
      query: (id) => `/v1/admin/users/${id}`,
      transformResponse: (response: any) => response.data,
      providesTags: (result, error, id) => [{ type: API_TAGS.Users, id }],
    }),

    updateUser: builder.mutation<User, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/v1/admin/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: API_TAGS.Users, id },
        API_TAGS.Users,
      ],
    }),

    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/admin/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [API_TAGS.Users],
    }),

    getAllOrders: builder.query<PaginatedResponse<Order>, AdminOrdersQueryParams | void>({
      query: (params) => ({
        url: '/v1/admin/orders',
        params: params || {},
      }),
      transformResponse: (response: any) => ({
        data: response.data || [],
        meta: response.meta || { current_page: 1, per_page: 10, total: 0, last_page: 1, from: 0, to: 0 },
      }),
      providesTags: [API_TAGS.Orders],
    }),

    getStylistRequests: builder.query<PaginatedResponse<StylistRequest>, AdminStylistRequestsQueryParams | void>({
      query: (params) => ({
        url: '/v1/admin/stylist-requests',
        params: params || {},
      }),
      transformResponse: (response: any) => ({
        data: response.data || [],
        meta: response.meta || { current_page: 1, per_page: 10, total: 0, last_page: 1, from: 0, to: 0 },
      }),
      providesTags: [API_TAGS.StylistRequests],
    }),

    updateOrderStatus: builder.mutation<Order, { id: string; status: OrderStatus }>({
      query: ({ id, status }) => ({
        url: `/v1/admin/orders/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Orders, API_TAGS.Dashboard],
    }),

    updatePaymentStatus: builder.mutation<Order, { id: string; paymentStatus: string }>({
      query: ({ id, paymentStatus }) => ({
        url: `/v1/admin/orders/${id}/payment-status`,
        method: 'PUT',
        body: { payment_status: paymentStatus },
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Orders, API_TAGS.Dashboard],
    }),

    approveStylistRequest: builder.mutation<StylistRequest, string>({
      query: (id) => ({
        url: `/v1/admin/stylist-requests/${id}/approve`,
        method: 'POST',
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.StylistRequests, API_TAGS.Dashboard],
    }),

    rejectStylistRequest: builder.mutation<void, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/v1/admin/stylist-requests/${id}/reject`,
        method: 'POST',
        body: reason ? { reason } : {},
      }),
      invalidatesTags: [API_TAGS.StylistRequests, API_TAGS.Dashboard],
    }),

    // ==================== PRODUCT MANAGEMENT ====================

    createProduct: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: '/v1/admin/products',
        method: 'POST',
        body: formData,
        formData: true,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Products],
    }),

    updateProduct: builder.mutation<any, { id: string; data: FormData }>({
      query: ({ id, data }) => {
        // Laravel does not parse multipart/form-data on PUT — use POST with _method override
        data.append('_method', 'PUT');
        return {
          url: `/v1/admin/products/${id}`,
          method: 'POST',
          body: data,
          formData: true,
        };
      },
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Products],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/admin/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [API_TAGS.Products],
    }),

    updateProductStock: builder.mutation<any, { id: string; quantity: number; operation: 'set' | 'add' | 'subtract' }>({
      query: ({ id, quantity, operation }) => ({
        url: `/v1/admin/products/${id}/stock`,
        method: 'PUT',
        body: { quantity, operation },
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: API_TAGS.Product, id },
        API_TAGS.Products,
      ],
    }),

    bulkUpdateProducts: builder.mutation<any, { product_ids: string[]; updates: any }>({
      query: (body) => ({
        url: '/v1/admin/products/bulk-update',
        method: 'POST',
        body,
      }),
      invalidatesTags: [API_TAGS.Products],
    }),

    // ==================== COUPON MANAGEMENT ====================

    getAllCoupons: builder.query<PaginatedResponse<Coupon>, AdminCouponsQueryParams | void>({
      query: (params) => ({
        url: '/v1/admin/coupons',
        params: params || {},
      }),
      transformResponse: (response: any) => ({
        data: response.data || [],
        meta: response.meta || { current_page: 1, per_page: 10, total: 0, last_page: 1, from: 0, to: 0 },
      }),
      providesTags: [API_TAGS.Coupons],
    }),

    getCoupon: builder.query<Coupon, string>({
      query: (id) => `/v1/admin/coupons/${id}`,
      transformResponse: (response: any) => response.data,
      providesTags: (result, error, id) => [{ type: API_TAGS.Coupons, id }],
    }),

    createCoupon: builder.mutation<Coupon, CreateCouponRequest>({
      query: (body) => ({
        url: '/v1/admin/coupons',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Coupons],
    }),

    updateCoupon: builder.mutation<Coupon, { id: string; data: Partial<CreateCouponRequest> }>({
      query: ({ id, data }) => ({
        url: `/v1/admin/coupons/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: API_TAGS.Coupons, id },
        API_TAGS.Coupons,
      ],
    }),

    deleteCoupon: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/admin/coupons/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [API_TAGS.Coupons],
    }),

    toggleCoupon: builder.mutation<Coupon, string>({
      query: (id) => ({
        url: `/v1/admin/coupons/${id}/toggle`,
        method: 'PUT',
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: (result, error, id) => [
        { type: API_TAGS.Coupons, id },
        API_TAGS.Coupons,
      ],
    }),

    // ==================== CATEGORY & BRAND MANAGEMENT ====================

    createCategory: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: '/v1/admin/categories',
        method: 'POST',
        body: formData,
        formData: true,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Categories],
    }),

    updateCategory: builder.mutation<any, { id: string; data: FormData }>({
      query: ({ id, data }) => {
        data.append('_method', 'PUT');
        return {
          url: `/v1/admin/categories/${id}`,
          method: 'POST',
          body: data,
          formData: true,
        };
      },
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Categories],
    }),

    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/admin/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [API_TAGS.Categories],
    }),

    createBrand: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: '/v1/admin/brands',
        method: 'POST',
        body: formData,
        formData: true,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Brands],
    }),

    updateBrand: builder.mutation<any, { id: string; data: FormData }>({
      query: ({ id, data }) => {
        data.append('_method', 'PUT');
        return {
          url: `/v1/admin/brands/${id}`,
          method: 'POST',
          body: data,
          formData: true,
        };
      },
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Brands],
    }),

    deleteBrand: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/admin/brands/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [API_TAGS.Brands],
    }),

    // ==================== DISTRIBUTOR CODE MANAGEMENT ====================

    getDistributorCodes: builder.query<PaginatedResponse<any>, { page?: number; per_page?: number; search?: string; used?: boolean } | void>({
      query: (params) => ({
        url: '/v1/admin/distributor-codes',
        params: params || {},
      }),
      transformResponse: (response: any) => ({
        data: response.data?.data || response.data || [],
        meta: response.data?.meta || response.meta || { current_page: 1, per_page: 20, total: 0, last_page: 1, from: 0, to: 0 },
      }),
      providesTags: [API_TAGS.DistributorCodes],
    }),

    getDistributorCodeStats: builder.query<{ totalCodes: number; usedCodes: number; activeCodes: number }, void>({
      query: () => '/v1/admin/distributor-codes/stats',
      transformResponse: (response: any) => response.data,
      providesTags: [API_TAGS.DistributorCodes],
    }),
  }),
});

// Export hooks
export const {
  useGetDashboardStatsQuery,
  useGetAllUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetAllOrdersQuery,
  useGetStylistRequestsQuery,
  useUpdateOrderStatusMutation,
  useUpdatePaymentStatusMutation,
  useApproveStylistRequestMutation,
  useRejectStylistRequestMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUpdateProductStockMutation,
  useBulkUpdateProductsMutation,
  useGetAllCouponsQuery,
  useGetCouponQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  useToggleCouponMutation,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
  useGetDistributorCodesQuery,
  useGetDistributorCodeStatsQuery,
} = adminApi;
