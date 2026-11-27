import type { Middleware } from '@reduxjs/toolkit';
import { clearCheckoutDraft } from '@/features/checkout/checkoutDraft';
import { clearHairProfile } from '@/shared/utils/hairProfile';
import { forgetReferralCode } from '@/shared/utils/referral';

/**
 * Personal data kept outside the store goes when the person signs out: the quiz
 * answers, the half-filled checkout (name, phone, address) and a stylist's
 * referral code, so the next person on this browser does not get them (#23).
 */
export const logoutCleanupMiddleware: Middleware = () => (next) => (action) => {
  if ((action as { type?: string }).type === 'auth/logout') {
    clearHairProfile();
    clearCheckoutDraft();
    forgetReferralCode();
  }
  return next(action);
};
