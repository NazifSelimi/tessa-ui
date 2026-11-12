/**
 * Shipping constants — single source of truth.
 *
 * Previously these values were hard-coded inside CheckoutPage. Centralizing
 * them lets the cart show a "free shipping progress" bar that always matches
 * what checkout actually charges.
 */

/** Order subtotal (MKD) at or above which delivery is free. */
export const FREE_SHIPPING_THRESHOLD = 3000;

/** Flat delivery fee (MKD) applied below the free-shipping threshold. */
export const SHIPPING_FEE = 150;

/** Compute the delivery fee for a given subtotal. */
export function shippingForSubtotal(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

/** Amount still needed to unlock free shipping (0 once reached). */
export function amountToFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}
