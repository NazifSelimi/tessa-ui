/**
 * Auth API Service (RTK Query — injected into baseApi)
 *
 * Handles all authentication-related API calls:
 * - Login/Register
 * - Logout
 * - Profile management
 * - Password reset
 */

import { baseApi, API_TAGS } from '@/api/baseApi';
import type { User } from '@/types';

// Response types
interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

interface RegisterResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

// Request types
interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
}

interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export const authApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/v1/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Auth],
    }),

    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (payload) => ({
        url: '/v1/auth/register',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Auth],
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/v1/auth/logout',
        method: 'POST',
      }),
      transformResponse: () => undefined,
      invalidatesTags: [API_TAGS.Auth],
    }),

    getCurrentUser: builder.query<User, void>({
      query: () => ({
        url: '/v1/auth/me',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data,
      providesTags: [API_TAGS.User],
    }),

    updateProfile: builder.mutation<User, UpdateProfileRequest>({
      query: (payload) => ({
        url: '/v1/auth/profile',
        method: 'PUT',
        body: payload,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.User],
    }),

    forgotPassword: builder.mutation<{ message: string }, ForgotPasswordRequest>({
      query: (payload) => ({
        url: '/v1/auth/forgot-password',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response: any) => ({
        message: response.message || 'If an account exists with that email, a reset link has been sent.',
      }),
    }),

    resetPassword: builder.mutation<{ message: string }, ResetPasswordRequest>({
      query: (payload) => ({
        url: '/v1/auth/reset-password',
        method: 'POST',
        body: {
          token: payload.token,
          email: payload.email,
          password: payload.password,
          password_confirmation: payload.passwordConfirmation,
        },
      }),
      transformResponse: (response: any) => ({
        message: response.message || 'Password has been reset successfully.',
      }),
    }),
  }),
});

// Export hooks for use in components
export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useUpdateProfileMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
