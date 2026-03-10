/**
 * useAuth Hook
 * 
 * Bridge hook that provides the same API as the old AuthContext
 * but uses Redux under the hood. This allows components to use
 * the same interface while benefiting from Redux.
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { 
  logout as logoutAction, 
  clearError,
  selectUser,
  selectToken,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectCurrentRole,
  selectIsAdmin,
  selectIsDistributor,
  selectIsStylist,
  selectIsProfessional,
} from '@/features/auth/slice';
import { 
  useLoginMutation, 
  useRegisterMutation, 
  useLogoutMutation,
  useForgotPasswordMutation,
  useUpdateProfileMutation,
} from '@/features/auth/api';
import type { User, UserRole } from '@/types';

export function useAuth() {
  const dispatch = useAppDispatch();
  
  // Selectors
  const user = useAppSelector(selectUser);
  const token = useAppSelector(selectToken);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const currentRole = useAppSelector(selectCurrentRole);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isDistributor = useAppSelector(selectIsDistributor);
  const isStylist = useAppSelector(selectIsStylist);
  const isProfessional = useAppSelector(selectIsProfessional);
  
  // RTK Query mutations
  const [loginMutation, { isLoading: isLoginLoading }] = useLoginMutation();
  const [registerMutation, { isLoading: isRegisterLoading }] = useRegisterMutation();
  const [logoutMutation] = useLogoutMutation();
  const [forgotPasswordMutation] = useForgotPasswordMutation();
  const [updateProfileMutation] = useUpdateProfileMutation();

  // Login handler
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const result = await loginMutation({ email, password }).unwrap();
    return result.user;
  }, [loginMutation]);

  // Register handler
  const register = useCallback(async (data: { 
    first_name: string;
    last_name: string;
    email: string; 
    phone: string; 
    password: string 
  }): Promise<User> => {
    const result = await registerMutation(data).unwrap();
    return result.user;
  }, [registerMutation]);

  // Logout handler — always clears local state even if the server call fails
  const logout = useCallback(async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      // Server-side logout may fail (expired token, network error).
      // Fall through to always clear local state below.
    }
    dispatch(logoutAction());
  }, [logoutMutation, dispatch]);

  // Update profile handler
  const updateProfile = useCallback(async (data: { 
    first_name?: string;
    last_name?: string;
    phone?: string; 
    email?: string 
  }): Promise<User> => {
    const result = await updateProfileMutation(data).unwrap();
    return result;
  }, [updateProfileMutation]);

  const forgotPassword = useCallback(async (email: string): Promise<{ message: string }> => {
    const result = await forgotPasswordMutation({ email }).unwrap();
    return result;
  }, [forgotPasswordMutation]);

  // Role checking helper
  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(currentRole);
  }, [currentRole]);

  // Clear error
  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading: isLoading || isLoginLoading || isRegisterLoading,
    error,
    
    // Methods
    login,
    register,
    logout,
    updateProfile,
    forgotPassword,
    
    // Role helpers
    currentRole,
    hasRole,
    isAdmin,
    isDistributor,
    isStylist,
    isProfessional,
    
    // Error handling
    clearError: handleClearError,
  };
}

export default useAuth;
