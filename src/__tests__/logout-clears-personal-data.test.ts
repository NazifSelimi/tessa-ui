import { describe, expect, it } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { logoutCleanupMiddleware } from '@/store/logoutCleanupMiddleware';
import { loadCheckoutDraft, saveCheckoutDraft } from '@/features/checkout/checkoutDraft';
import { rememberReferralCode, storedReferralCode } from '@/shared/utils/referral';

describe('signing out (#23)', () => {
  it('forgets the half-filled checkout and the referral code', () => {
    const store = configureStore({
      reducer: (state = {}) => state,
      middleware: (getDefault) => getDefault().concat(logoutCleanupMiddleware),
    });
    saveCheckoutDraft({ values: { firstName: 'Ana', phone: '070111222' }, step: 1 });
    rememberReferralCode('ANA10');
    expect(loadCheckoutDraft()).not.toBeNull();
    expect(storedReferralCode()).toBe('ANA10');

    store.dispatch({ type: 'auth/logout' });

    expect(loadCheckoutDraft()).toBeNull();
    expect(storedReferralCode()).toBeNull();
  });
});
