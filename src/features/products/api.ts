/**
 * Products API Service (RTK Query — injected into baseApi)
 *
 * Handles all product-related API calls:
 * - List products with filtering/pagination
 * - Get single product
 * - Categories and brands
 *
 * All Laravel responses are wrapped: { success, data, meta, message }
 * We must unwrap with transformResponse to get the actual data
 */

import { baseApi, API_TAGS } from '@/api/baseApi';
import type { Product, Category, Brand, PaginatedResponse } from '@/types';

// Query params for products list
interface ProductsQueryParams {
  page?: number;
  perPage?: number;
  category?: string;
  brand?: string;
  search?: string;
  featured?: boolean;
  sort?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: number;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export const productsApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getProducts: builder.query<PaginatedResponse<Product>, ProductsQueryParams | undefined>({
      query: (params) => {
        const { category, brand, perPage, ...rest } = params ?? {};
        return {
          url: '/v1/products',
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

    getFeaturedProducts: builder.query<Product[], number | void>({
      query: (limit = 8) => ({
        url: '/v1/products/featured',
        params: { limit },
      }),
      transformResponse: (response: any) => response.data || [],
      providesTags: [{ type: API_TAGS.Products, id: 'FEATURED' }],
    }),

    getCategories: builder.query<Category[], void>({
      query: () => '/v1/categories',
      transformResponse: (response: any) => response.data || [],
      providesTags: [API_TAGS.Categories],
    }),

    getBrands: builder.query<Brand[], void>({
      query: () => '/v1/brands',
      transformResponse: (response: any) => response.data || [],
      providesTags: [API_TAGS.Brands],
    }),

    getProductById: builder.query<Product, string>({
      query: (id) => `/v1/products/${id}`,
      transformResponse: (response: any) => response.data,
      providesTags: (_result, _error, id) => [{ type: API_TAGS.Product, id }],
    }),

    searchProducts: builder.query<Product[], string>({
      query: (query) => ({
        url: '/v1/products/search',
        params: { q: query },
      }),
      transformResponse: (response: any) => response.data || [],
    }),
  }),
});

// Export hooks
export const {
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useGetProductByIdQuery,
  useLazyGetProductByIdQuery,
  useGetFeaturedProductsQuery,
  useGetCategoriesQuery,
  useGetBrandsQuery,
  useSearchProductsQuery,
  useLazySearchProductsQuery,
} = productsApi;
