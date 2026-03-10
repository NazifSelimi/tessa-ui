/**
 * Products Service
 *
 * Handles all product-related API calls including:
 * - Product listing with filters
 * - Product details
 * - Categories and brands
 * - Search functionality
 *
 * Backend paginated response:
 * {
 *   success: boolean,
 *   data: Product[],
 *   pagination?: {
 *     current_page: number,
 *     last_page: number,
 *     per_page: number,
 *     total: number
 *   }
 * }
 */

import apiClient from '../client';
import type { Product, Category, Brand } from '@/types';
import type { PaginatedResponse as BasePaginatedResponse } from '@/types';

/* ===================================================== */
/* TYPES                                                 */
/* ===================================================== */

export interface ProductFilters {
  categoryId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number ;
  search?: string;
  inStock?: boolean;
  onSale?: boolean;
  sort?: 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  perPage?: number;
}

// Extend shared pagination type with backend wrapper
export interface PaginatedResponse<T>
  extends BasePaginatedResponse<T> {
  success: boolean;
}

/* ===================================================== */
/* PRODUCTS (PAGINATED)                                 */
/* ===================================================== */

export async function getProducts(
  filters?: ProductFilters
): Promise<PaginatedResponse<Product>> {
  const response = await apiClient.get('/v1/products', {
    params: {
      page: filters?.page ?? 1,
      perPage: filters?.perPage ?? 20,
      category_id: filters?.categoryId,
      brand_id: filters?.brandId,
      min_price: filters?.minPrice,
      max_price: filters?.maxPrice,
      search: filters?.search,
      in_stock: filters?.inStock ? 1 : undefined,
      on_sale: filters?.onSale ? 1 : undefined,
      sort: filters?.sort,
    },
  });

  return response.data;
}

/* ===================================================== */
/* SINGLE PRODUCT                                        */
/* ===================================================== */

export async function getProductById(
  id: number | string
): Promise<Product | null> {
  const response = await apiClient.get(`/v1/products/${id}`);
  return response.data.data ?? null;
}

/* ===================================================== */
/* FEATURED                                              */
/* ===================================================== */

export async function getFeaturedProducts(
  limit = 8
): Promise<Product[]> {
  const response = await apiClient.get('/v1/products/featured', {
    params: { limit },
  });

  return response.data.data ?? [];
}

/* ===================================================== */
/* RELATED                                               */
/* ===================================================== */

export async function getRelatedProducts(
  productId: number | string,
  limit = 4
): Promise<Product[]> {
  const response = await apiClient.get(
    `/v1/products/${productId}/related`,
    {
      params: { limit },
    }
  );

  return response.data.data ?? [];
}

/* ===================================================== */
/* SEARCH                                                */
/* ===================================================== */

export async function searchProducts(
  query: string,
  limit = 10
): Promise<Product[]> {
  const response = await apiClient.get('/v1/products/search', {
    params: { q: query, limit },
  });

  return response.data.data ?? [];
}

/* ===================================================== */
/* CATEGORIES                                            */
/* ===================================================== */

export async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get('/v1/categories');
  return response.data.data ?? [];
}

/* ===================================================== */
/* BRANDS                                                */
/* ===================================================== */

export async function getBrands(): Promise<Brand[]> {
  const response = await apiClient.get('/v1/brands');
  return response.data.data ?? [];
}
