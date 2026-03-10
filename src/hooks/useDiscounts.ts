/**
 * useDiscounts Hook
 * 
 * Manages discount code application via backend validation (RTK Query).
 * No client-side discount logic — the backend is the source of truth.
 */

import { useState, useCallback } from 'react';
import { useValidateCouponMutation } from '@/features/coupons/api';

interface DiscountState {
  appliedCode: string | null;
  discountAmount: number;
  discountPercent: number;
  error: string | null;
  isValidating: boolean;
}

export function useDiscounts() {
  const [discountState, setDiscountState] = useState<DiscountState>({
    appliedCode: null,
    discountAmount: 0,
    discountPercent: 0,
    error: null,
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

    setDiscountState(prev => ({ ...prev, isValidating: true, error: null }));

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
        error: null,
        isValidating: false,
      });

      return true;
    } catch {
      setDiscountState(prev => ({
        ...prev,
        error: 'Failed to validate discount code. Please try again.',
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
      error: null,
      isValidating: false,
    });
  }, []);

  const clearError = useCallback(() => {
    setDiscountState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    appliedCode: discountState.appliedCode,
    applyCode,
    removeCode,
    discountAmount: discountState.discountAmount,
    discountPercent: discountState.discountPercent,
    error: discountState.error,
    isValidating: discountState.isValidating,
    clearError,
  };
}
