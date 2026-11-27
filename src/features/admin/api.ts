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
  Product,
  User,
  Order,
  OrderStatus,
  StylistRequest,
  DashboardStats,
  PaginatedResponse
} from '@/types';
import type { BundleAudience, StoreBundle } from '@/types';
import type { ProductsQueryParams } from '@/features/products/api';

// Query params for admin endpoints
interface AdminOrdersQueryParams {
  page?: number;
  per_page?: number;
  status?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  /** 'only' lists the Trash. */
  trashed?: 'only';
}

interface AdminStylistRequestsQueryParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
}

interface AdminUsersQueryParams {
  sort?: string;
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

export type PricingSettings = {
  costPercentage: number;
  minMarginPercentage: number;
  /** Owner rule Q1: all discounts together never above this % of the goods. */
  maxDiscountPercentage: number;
  /** Owner rule Q6: free delivery from this amount, counted before or after discounts. */
  freeShippingFrom: number;
  freeShippingAfterDiscounts: boolean;
  shippingCost?: number;
};

export type OfferAudienceResult = {
  available: boolean;
  unpricedProducts: string[];
  regularPrice: number;
  offerPrice: number;
  saving: number;
  savingPercentage: number;
  cost: number;
  lowestAllowedPrice: number;
  appliedSaving: number;
  limitedByProfitFloor: boolean;
  profitBefore: number;
  profitAfter: number;
  marginAfterPercentage: number | null;
  salesNeededToMatch: number | null;
};

export type OfferSimulation = {
  settings: PricingSettings;
  retail: OfferAudienceResult;
  salon: OfferAudienceResult;
};

type BundlePayload = {
  name?: string;
  description?: string;
  audience?: BundleAudience;
  promotion_type?: 'percentage' | 'fixed_price' | 'bonus_items' | 'mix_match';
  /** mix_match only: the colour line and its reward steps (products = gift choices). */
  product_family_id?: string | number | null;
  tiers?: Array<{ min: number; free?: number; gift?: boolean }> | null;
  discount_percentage?: number;
  bundle_price?: number;
  is_active?: boolean;
  is_featured?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  /** Leave out to keep the offer's products (quick on/off changes). */
  products?: Array<{ product_id: string | number; quantity: number; bonus_quantity?: number }>;
};

export type BundleBulkAction = 'activate' | 'deactivate' | 'feature' | 'unfeature' | 'audience' | 'discount' | 'ends_at' | 'delete';

export type ContentBlockKind = 'hero' | 'grid' | 'rich_text' | 'cta' | 'bundle_rail';

export type ContentBlockItem = {
  title?: string;
  body?: string;
  imageUrl?: string;
  actionLabel?: string;
  actionUrl?: string;
  bundleId?: string;
};

export type ContentBlock = {
  id: string;
  key: string;
  page: string;
  section: string;
  kind: ContentBlockKind;
  eyebrow?: string | null;
  title?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  actionLabel?: string | null;
  actionUrl?: string | null;
  items: ContentBlockItem[];
  isPublished: boolean;
  sortOrder: number;
  updatedAt?: string | null;
};

export type ContentBlockPayload = {
  key: string;
  page: string;
  section: string;
  kind: ContentBlockKind;
  eyebrow?: string | null;
  title?: string | null;
  body?: string | null;
  image_url?: string | null;
  action_label?: string | null;
  action_url?: string | null;
  items?: ContentBlockItem[];
  is_published?: boolean;
  sort_order?: number;
};

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
          pendingStylistRequests: data.pendingStylistRequests ?? 0,
          lowStockProducts: data.todo?.lowStock ?? 0,
          revenueThisMonth: Number(data.revenueThisMonth ?? 0),
          pendingOrders: data.pendingOrders ?? 0,
          todo: {
            inReview: data.todo?.inReview ?? 0,
            inReviewInStock: data.todo?.inReviewInStock ?? 0,
            missingPrice: data.todo?.missingPrice ?? 0,
            lowStock: data.todo?.lowStock ?? 0,
            outOfStock: data.todo?.outOfStock ?? 0,
            pendingOrders: data.todo?.pendingOrders ?? 0,
            pendingStylistRequests: data.todo?.pendingStylistRequests ?? 0,
            failedEmails: data.todo?.failedEmails ?? 0,
          },
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

    updateOrderStatus: builder.mutation<Order, { id: string; status: OrderStatus; force?: boolean }>({
      query: ({ id, status, force }) => ({
        url: `/v1/admin/orders/${id}/status`,
        method: 'PUT',
        // force: "Proceed anyway" after a not-enough-stock refusal.
        body: force ? { status, force: true } : { status },
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

    getAllProducts: builder.query<PaginatedResponse<Product>, ProductsQueryParams | void>({
      query: (params) => {
        const { category, brand, perPage, ...rest } = params ?? {};

        return {
          url: '/v1/admin/products',
          params: {
            ...rest,
            perPage,
            category_id: category,
            brand_id: brand,
          },
        };
      },
      transformResponse: (response: PaginatedResponse<Product>) => response,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({
                type: API_TAGS.Product,
                id,
              })),
              { type: API_TAGS.Products, id: 'LIST' },
            ]
          : [{ type: API_TAGS.Products, id: 'LIST' }],
    }),

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
      // The storefront product page caches by Product id, so refresh it too.
      invalidatesTags: (_result, _error, { id }) => [API_TAGS.Products, { type: API_TAGS.Product, id }, { type: API_TAGS.Product, id: Number(id) }],
    }),

    getProductFamilies: builder.query<{ id: string; name: string; shadeCount: number }[], void>({
      query: () => '/v1/admin/product-families',
      transformResponse: (response: { data: { id: string; name: string; shadeCount: number }[] }) => response.data,
      providesTags: [API_TAGS.Products],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/admin/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [API_TAGS.Products, { type: API_TAGS.Product, id }, { type: API_TAGS.Product, id: Number(id) }],
    }),

    /** Removes one photo from a product (the API refuses to remove its only photo). */
    deleteProductImage: builder.mutation<unknown, { productId: string; imageId: number }>({
      query: ({ productId, imageId }) => ({
        url: `/v1/admin/products/${productId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { productId }) => [API_TAGS.Products, { type: API_TAGS.Product, id: productId }, { type: API_TAGS.Product, id: Number(productId) }],
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

    getAdminBundles: builder.query<StoreBundle[], void>({
      query: () => '/v1/admin/bundles',
      transformResponse: (response: any) => response.data || [],
      providesTags: [API_TAGS.Bundles],
    }),

    createBundle: builder.mutation<StoreBundle & { clashWarnings?: string[] }, BundlePayload>({
      query: (body) => ({ url: '/v1/admin/bundles', method: 'POST', body }),
      // Offers may share products: the server only warns (shown after saving).
      transformResponse: (response: any) => ({ ...response.data, clashWarnings: response.meta?.warnings ?? [] }),
      invalidatesTags: [API_TAGS.Bundles],
    }),

    updateBundle: builder.mutation<StoreBundle & { clashWarnings?: string[] }, { id: string; data: BundlePayload }>({
      query: ({ id, data }) => ({ url: `/v1/admin/bundles/${id}`, method: 'PUT', body: data }),
      // Offers may share products: the server only warns (shown after saving).
      transformResponse: (response: any) => ({ ...response.data, clashWarnings: response.meta?.warnings ?? [] }),
      invalidatesTags: [API_TAGS.Bundles],
    }),

    deleteBundle: builder.mutation<void, string>({
      query: (id) => ({ url: `/v1/admin/bundles/${id}`, method: 'DELETE' }),
      invalidatesTags: [API_TAGS.Bundles],
    }),

    /** One change for many offers at once. */
    bulkBundles: builder.mutation<{ updated: number; clashWarnings?: string[] }, { ids: string[]; action: BundleBulkAction; value?: string | number | null }>({
      query: (body) => ({ url: '/v1/admin/bundles/bulk', method: 'POST', body }),
      transformResponse: (response: any) => ({ ...response.data, clashWarnings: response.meta?.warnings ?? [] }),
      invalidatesTags: [API_TAGS.Bundles],
    }),

    /** Picture made in Post Studio → Bundles; replaces the bundle's previous picture. */
    uploadBundleImage: builder.mutation<StoreBundle, { id: string; image: Blob }>({
      query: ({ id, image }) => {
        const body = new FormData();
        body.append('image', image, `bundle-${id}.${({ 'image/png': 'png', 'image/jpeg': 'jpg' } as Record<string, string>)[image.type] ?? 'webp'}`);
        return { url: `/v1/admin/bundles/${id}/image`, method: 'POST', body, formData: true };
      },
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Bundles],
    }),

    deleteBundleImage: builder.mutation<StoreBundle, string>({
      query: (id) => ({ url: `/v1/admin/bundles/${id}/image`, method: 'DELETE' }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Bundles],
    }),

    // Profit of an offer while it is being edited; nothing is saved.
    simulateBundle: builder.mutation<OfferSimulation, BundlePayload>({
      query: (body) => ({ url: '/v1/admin/bundles/simulate', method: 'POST', body }),
      transformResponse: (response: any) => response.data,
    }),

    getPricingSettings: builder.query<PricingSettings, void>({
      query: () => '/v1/admin/pricing-settings',
      transformResponse: (response: any) => response.data,
      providesTags: [API_TAGS.PricingSettings],
    }),

    updatePricingSettings: builder.mutation<PricingSettings, Partial<PricingSettings>>({
      query: (body) => ({ url: '/v1/admin/pricing-settings', method: 'PUT', body }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.PricingSettings],
    }),

    // ==================== EDITABLE STOREFRONT CONTENT ====================

    getContentBlocks: builder.query<ContentBlock[], void>({
      query: () => '/v1/admin/content-blocks',
      transformResponse: (response: any) => response.data || [],
      providesTags: [API_TAGS.ContentBlocks],
    }),

    getPublishedContentBlocks: builder.query<ContentBlock[], string | void>({
      query: (page) => ({ url: '/v1/content-blocks', params: page ? { page } : {} }),
      transformResponse: (response: any) => response.data || [],
      providesTags: [API_TAGS.ContentBlocks],
    }),

    createContentBlock: builder.mutation<ContentBlock, ContentBlockPayload>({
      query: (body) => ({ url: '/v1/admin/content-blocks', method: 'POST', body }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.ContentBlocks],
    }),

    updateContentBlock: builder.mutation<ContentBlock, { id: string; data: ContentBlockPayload }>({
      query: ({ id, data }) => ({ url: `/v1/admin/content-blocks/${id}`, method: 'PUT', body: data }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.ContentBlocks],
    }),

    deleteContentBlock: builder.mutation<void, string>({
      query: (id) => ({ url: `/v1/admin/content-blocks/${id}`, method: 'DELETE' }),
      invalidatesTags: [API_TAGS.ContentBlocks],
    }),
  }),
});

// Export hooks
export const {
  useDeleteProductImageMutation,
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
  useGetAllProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetProductFamiliesQuery,
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
  useGetAdminBundlesQuery,
  useCreateBundleMutation,
  useUpdateBundleMutation,
  useDeleteBundleMutation,
  useUploadBundleImageMutation,
  useBulkBundlesMutation,
  useDeleteBundleImageMutation,
  useSimulateBundleMutation,
  useGetPricingSettingsQuery,
  useUpdatePricingSettingsMutation,
  useGetContentBlocksQuery,
  useGetPublishedContentBlocksQuery,
  useCreateContentBlockMutation,
  useUpdateContentBlockMutation,
  useDeleteContentBlockMutation,
} = adminApi;
