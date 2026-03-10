/**
 * Authentication Service
 * 
 * Handles all authentication-related API calls.
 * Backend implementation pending.
 */

import { store } from '@/store/index';
import { logout as logoutAction } from '@/features/auth/slice';
import type { User } from '@/types';

// Response types
interface _LoginResponse {
  user: User;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation?: string;
}

interface LoginData {
  email: string;
  password: string;
  remember?: boolean;
}

interface ForgotPasswordData {
  email: string;
}

interface ResetPasswordData {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

interface UpdateProfileData {
  name?: string;
  phone?: string;
  email?: string;
}

interface ChangePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

/**
 * Login user and store authentication tokens
 */
export async function login(_data: LoginData): Promise<User> {
  // TODO: const response = await apiClient.post('/auth/login', data);
  // setAuthTokens(response.data.access_token, response.data.refresh_token);
  // return response.data.user;
  throw new Error('Auth endpoints not yet implemented');
}

/**
 * Register a new user account
 */
export async function register(_data: RegisterData): Promise<User> {
  // TODO: const response = await apiClient.post('/auth/register', data);
  // setAuthTokens(response.data.access_token, response.data.refresh_token);
  // return response.data.user;
  throw new Error('Auth endpoints not yet implemented');
}

/**
 * Logout user and clear tokens
 */
export async function logout(): Promise<void> {
  // TODO: await apiClient.post('/auth/logout');
  store.dispatch(logoutAction());
}

/**
 * Request password reset email
 */
export async function forgotPassword(_data: ForgotPasswordData): Promise<{ message: string }> {
  // TODO: const response = await apiClient.post('/auth/forgot-password', data);
  // return response.data;
  return { message: 'If the email exists, a reset link has been sent.' };
}

/**
 * Reset password with token
 */
export async function resetPassword(_data: ResetPasswordData): Promise<{ message: string }> {
  // TODO: const response = await apiClient.post('/auth/reset-password', data);
  // return response.data;
  return { message: 'Password has been reset successfully.' };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  // TODO: const response = await apiClient.get('/auth/me');
  // return response.data.data;
  return null;
}

/**
 * Update user profile
 */
export async function updateProfile(_data: UpdateProfileData): Promise<User> {
  // TODO: const response = await apiClient.put('/auth/profile', data);
  // return response.data.data;
  throw new Error('Auth endpoints not yet implemented');
}

/**
 * Change user password
 */
export async function changePassword(_data: ChangePasswordData): Promise<{ message: string }> {
  // TODO: const response = await apiClient.put('/auth/change-password', data);
  // return response.data;
  return { message: 'Password changed successfully.' };
}

/**
 * Verify email with token
 */
export async function verifyEmail(_token: string): Promise<{ message: string }> {
  // TODO: const response = await apiClient.post(`/auth/verify-email/${token}`);
  // return response.data;
  return { message: 'Email verified successfully.' };
}

/**
 * Resend email verification
 */
export async function resendVerification(): Promise<{ message: string }> {
  // TODO: const response = await apiClient.post('/auth/resend-verification');
  // return response.data;
  return { message: 'Verification email sent.' };
}
