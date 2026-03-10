/**
 * Hooks Index
 * 
 * Re-exports all custom hooks for easy importing.
 */

export { useAuth, default as useAuthHook } from './useAuth';
export { useCart, default as useCartHook } from './useCart';

// Re-export Redux hooks
export { 
  useAppDispatch, 
  useAppSelector, 
  useAppStore,
} from '@/app/hooks';

// Re-export RTK Query hooks for direct usage
export {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} from '@/features/auth/api';

export {
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useGetProductByIdQuery,
  useLazyGetProductByIdQuery,
  useGetFeaturedProductsQuery,
  useGetCategoriesQuery,
  useGetBrandsQuery,
  useSearchProductsQuery,
  useLazySearchProductsQuery,
} from '@/features/products/api';

export {
  useGetOrdersQuery,
  useLazyGetOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useCancelOrderMutation,
} from '@/features/orders/api';

export {
  useValidateCouponMutation,
  useGetAvailableCouponsQuery,
} from '@/features/coupons/api';

export {
  useGetDashboardStatsQuery,
  useGetAllUsersQuery,
  useGetAllOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetStylistRequestsQuery,
  useApproveStylistRequestMutation,
  useRejectStylistRequestMutation,
} from '@/features/admin/api';
