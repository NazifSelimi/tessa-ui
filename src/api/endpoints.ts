/**
 * API Endpoints Configuration
 * 
 * Centralized endpoint definitions for the Tessa API.
 * This makes it easy to update endpoints when backend changes.
 * 
 * TODO: Update these endpoints to match your Laravel API routes
 */

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    UPDATE_PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  
  // Products
  PRODUCTS: {
    LIST: '/products',
    DETAIL: (id: string) => `/products/${id}`,
    SEARCH: '/products/search',
    FEATURED: '/products/featured',
    BY_CATEGORY: (category: string) => `/products/category/${category}`,
    BY_BRAND: (brand: string) => `/products/brand/${brand}`,
  },
  
  // Categories
  CATEGORIES: {
    LIST: '/categories',
    DETAIL: (id: string) => `/categories/${id}`,
  },
  
  // Brands
  BRANDS: {
    LIST: '/brands',
    DETAIL: (id: string) => `/brands/${id}`,
  },
  
  // Cart (if using server-side cart)
  CART: {
    GET: '/cart',
    ADD: '/cart/add',
    UPDATE: '/cart/update',
    REMOVE: '/cart/remove',
    CLEAR: '/cart/clear',
  },
  
  // Orders
  ORDERS: {
    LIST: '/orders',
    DETAIL: (id: string) => `/orders/${id}`,
    CREATE: '/orders',
    CANCEL: (id: string) => `/orders/${id}/cancel`,
  },
  
  // Coupons
  COUPONS: {
    VALIDATE: '/coupons/validate',
  },
  
  // Stylist
  STYLIST: {
    REQUEST: '/stylist/request',
    STATUS: '/stylist/status',
  },
  
  // Distributor
  DISTRIBUTOR: {
    CODES: '/distributor/codes',
    GENERATE_CODE: '/distributor/codes/generate',
    PRODUCTS: '/distributor/products',
    STATS: '/distributor/stats',
  },
  
  // Admin
  ADMIN: {
    // Dashboard
    DASHBOARD: '/admin/dashboard',
    STATS: '/admin/stats',
    
    // Products CRUD
    PRODUCTS: {
      LIST: '/admin/products',
      CREATE: '/admin/products',
      UPDATE: (id: string) => `/admin/products/${id}`,
      DELETE: (id: string) => `/admin/products/${id}`,
      BULK_DELETE: '/admin/products/bulk-delete',
      UPDATE_STOCK: (id: string) => `/admin/products/${id}/stock`,
    },
    
    // Orders
    ORDERS: {
      LIST: '/admin/orders',
      DETAIL: (id: string) => `/admin/orders/${id}`,
      UPDATE_STATUS: (id: string) => `/admin/orders/${id}/status`,
      UPDATE_PAYMENT: (id: string) => `/admin/orders/${id}/payment`,
    },
    
    // Users
    USERS: {
      LIST: '/admin/users',
      DETAIL: (id: string) => `/admin/users/${id}`,
      UPDATE_ROLE: (id: string) => `/admin/users/${id}/role`,
      BAN: (id: string) => `/admin/users/${id}/ban`,
      UNBAN: (id: string) => `/admin/users/${id}/unban`,
    },
    
    // Stylist Requests
    STYLIST_REQUESTS: {
      LIST: '/admin/stylist-requests',
      APPROVE: (id: string) => `/admin/stylist-requests/${id}/approve`,
      REJECT: (id: string) => `/admin/stylist-requests/${id}/reject`,
    },
    
    // Coupons CRUD
    COUPONS: {
      LIST: '/admin/coupons',
      CREATE: '/admin/coupons',
      UPDATE: (id: string) => `/admin/coupons/${id}`,
      DELETE: (id: string) => `/admin/coupons/${id}`,
      TOGGLE: (id: string) => `/admin/coupons/${id}/toggle`,
    },
    
    // Distributors
    DISTRIBUTORS: {
      LIST: '/admin/distributors',
      DETAIL: (id: string) => `/admin/distributors/${id}`,
      CREATE: '/admin/distributors',
      UPDATE: (id: string) => `/admin/distributors/${id}`,
    },
    
    // Categories CRUD
    CATEGORIES: {
      LIST: '/admin/categories',
      CREATE: '/admin/categories',
      UPDATE: (id: string) => `/admin/categories/${id}`,
      DELETE: (id: string) => `/admin/categories/${id}`,
    },
    
    // Brands CRUD
    BRANDS: {
      LIST: '/admin/brands',
      CREATE: '/admin/brands',
      UPDATE: (id: string) => `/admin/brands/${id}`,
      DELETE: (id: string) => `/admin/brands/${id}`,
    },
  },
} as const;
