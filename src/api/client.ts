/**
 * Axios API Client for Tessa Shop
 * 
 * This module provides a configured Axios instance for all API calls.
 * Features:
 * - Base URL configuration from environment variables
 * - Bearer token authentication interceptor
 * - Automatic 401 handling with token refresh/logout
 * - Request/response error handling
 * - CSRF token support (ready for Laravel)
 * 
 * TODO: Configure VITE_API_URL in your .env file
 * Example: VITE_API_URL=https://api.yourdomain.com/api
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { store } from '@/store/index';
import { logout as logoutAction } from '@/features/auth/slice';

/**
 * Module-level flag to prevent concurrent 401 responses from each
 * dispatching logout and triggering a hard redirect.
 */
let _isHandling401 = false;

// Create axios instance with default configuration (Laravel backend)
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // MUST be false - we use Bearer tokens, NOT cookies
  withCredentials: false,
});

// Request interceptor - adds auth token from Redux store
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = store.getState().auth.token;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles auth errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle 401 Unauthorized — only if user was authenticated
    if (error.response?.status === 401) {
      const token = store.getState().auth.token;

      if (token && !_isHandling401) {
        _isHandling401 = true;

        store.dispatch(logoutAction());

        const authPaths = ['/login', '/register', '/forgot-password'];
        if (!authPaths.some(path => window.location.pathname.startsWith(path))) {
          window.location.href = '/login';
        }

        setTimeout(() => { _isHandling401 = false; }, 3000);
      }
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      if (import.meta.env.DEV) console.error('Access forbidden - insufficient permissions');
    }
    
    // Handle 422 Validation Error (Laravel)
    if (error.response?.status === 422) {
      // Return validation errors in a structured format
      return Promise.reject({
        ...error,
        validationErrors: error.response.data,
      });
    }
    
    // Handle 429 Too Many Requests (rate limiting)
    if (error.response?.status === 429) {
      if (import.meta.env.DEV) console.error('Rate limit exceeded. Please try again later.');
    }
    
    // Handle 500+ Server Errors
    if (error.response && error.response.status >= 500) {
      if (import.meta.env.DEV) console.error('Server error occurred. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

/**
 * Get current access token from Redux store
 */
export function getAuthToken(): string | null {
  return store.getState().auth.token;
}

/**
 * Check if user is authenticated (has token in Redux)
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Clear all authentication tokens via Redux
 */
export function clearAuthTokens(): void {
  store.dispatch(logoutAction());
}

export default apiClient;
