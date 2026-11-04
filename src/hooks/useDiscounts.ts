/**
 * useDiscounts Hook
 * 
 * Manages discount code application via backend validation (RTK Query).
 * No client-side discount logic — the backend is the source of truth.
 */

import { useState, useCallback } from 'react';
import { useValidateCouponMutation } from '@/features/coupons/api';
import { couponDiscount } from '@/shared/utils/checkoutPricing';
import { extractErrorMessage } from '@/shared/utils/error';

interface DiscountState {
  appliedCode: string | null;
  discountAmount: number;
  discountPercent: number;
  couponValue: number;
  error: string | null;
  /** A stylist's code a guest tried: it works once they sign in or register. */
  loginRequiredCode: string | null;
  isValidating: boolean;
}

function requiresLogin(error: unknown): boolean {
  const data = (error as { data?: { errors?: { requires_login?: boolean } | null } })?.data;
  return data?.errors?.requires_login === true;
}

export function useDiscounts() {
  const [discountState, setDiscountState] = useState<DiscountState>({
    appliedCode: null,
    discountAmount: 0,
    discountPercent: 0,
    couponValue: 0,
    error: null,
    loginRequiredCode: null,
    isValidating: false,
  });

  const [validateCoupon] = useValidateCouponMutation();

  const applyCode = useCallback(async (code: string, subtotal: number): Promise<boolean> => {
    const trimmedCode = code.toUpperCase().trim();

    if (!trimmedCode) {
      setDiscountState(prev => ({
        ...prev,
        error: 'Please enter a discount code',
      }));
      return false;
    }

    setDiscountState(prev => ({ ...prev, isValidating: true, error: null, loginRequiredCode: null }));

    try {
      const result = await validateCoupon({ code: trimmedCode, subtotal }).unwrap();

      if (!result.valid) {
        setDiscountState(prev => ({
          ...prev,
          error: result.message || `Invalid discount code: "${trimmedCode}"`,
          appliedCode: null,
          discountAmount: 0,
          discountPercent: 0,
          isValidating: false,
        }));
        return false;
      }

      // Backend confirmed — apply the discount from the response
      const coupon = result.coupon;
      let discountAmount = 0;
      let discountPercent = 0;

      if (coupon) {
        if (coupon.type === 'percentage' && coupon.value != null) {
          discountPercent = coupon.value;
          discountAmount = (subtotal * coupon.value) / 100;
        } else if (coupon.type === 'fixed' && coupon.value != null) {
          discountAmount = Math.min(coupon.value, subtotal);
        }
      }

      setDiscountState({
        appliedCode: trimmedCode,
        discountAmount,
        discountPercent,
        couponValue: Number(coupon?.value ?? 0),
        error: null,
        loginRequiredCode: null,
        isValidating: false,
      });

      return true;
    } catch (error) {
      // The server explains a refused code (e.g. a referral code on a salon account).
      const status = (error as { status?: number })?.status;
      setDiscountState(prev => ({
        ...prev,
        error: status === 404 || status === 422 ? extractErrorMessage(error) : 'Failed to validate discount code. Please try again.',
        loginRequiredCode: requiresLogin(error) ? trimmedCode : null,
        isValidating: false,
      }));
      return false;
    }
  }, [validateCoupon]);

  const removeCode = useCallback(() => {
    setDiscountState({
      appliedCode: null,
      discountAmount: 0,
      discountPercent: 0,
      couponValue: 0,
      error: null,
      loginRequiredCode: null,
      isValidating: false,
    });
  }, []);

  const clearError = useCallback(() => {
    setDiscountState(prev => ({
      ...prev,
      error: null,
      loginRequiredCode: null,
    }));
  }, []);

  return {
    appliedCode: discountState.appliedCode,
    getDiscountForSubtotal: (subtotal: number) => discountState.appliedCode ? couponDiscount(subtotal, discountState.couponValue, discountState.discountPercent > 0) : 0,
    applyCode,
    removeCode,
    discountAmount: discountState.discountAmount,
    discountPercent: discountState.discountPercent,
    error: discountState.error,
    loginRequiredCode: discountState.loginRequiredCode,
    isValidating: discountState.isValidating,
    clearError,
  };
}
