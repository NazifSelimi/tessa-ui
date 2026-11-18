import type { Middleware } from '@reduxjs/toolkit';
import { clearHairProfile } from '@/shared/utils/hairProfile';

/** Personal data kept outside the store (the quiz answers) goes when the person signs out. */
export const logoutCleanupMiddleware: Middleware = () => (next) => (action) => {
  if ((action as { type?: string }).type === 'auth/logout') clearHairProfile();
  return next(action);
};
