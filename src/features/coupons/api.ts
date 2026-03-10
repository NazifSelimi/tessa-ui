/**
 * Coupons API Service (RTK Query — injected into baseApi)
 *
 * Handles coupon validation and application.
 */

import { baseApi, API_TAGS } from '@/api/baseApi';
import type { Coupon } from '@/types';

// Response types
interface ValidateCouponResponse {
  valid: boolean;
  coupon?: Coupon;
  message?: string;
}

export const couponsApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    validateCoupon: builder.mutation<ValidateCouponResponse, { code: string; subtotal?: number }>({
      query: (body) => ({
        url: '/v1/coupons/validate',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => response.data,
    }),

    getAvailableCoupons: builder.query<Coupon[], void>({
      queryFn: async () => {
        // TODO: Implement when backend is ready
        return { data: [] };
      },
      providesTags: [API_TAGS.Coupons],
    }),
  }),
});

// Export hooks
export const {
  useValidateCouponMutation,
  useGetAvailableCouponsQuery,
} = couponsApi;
