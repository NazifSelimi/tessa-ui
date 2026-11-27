/**
 * Shipping constants — single source of truth.
 *
 * Previously these values were hard-coded inside CheckoutPage. Centralizing
 * them lets the cart show a "free shipping progress" bar that always matches
 * what checkout actually charges.
 */

/**
 * Defaults only. The real free-shipping amount is set in Admin (owner rule Q6)
 * and read with useShippingSettings(); the cart and checkout show the server's
 * price check. Marketing texts (studio captions, legal pages) still use these.
 */
export const FREE_SHIPPING_THRESHOLD = 3000;

/** Flat delivery fee (MKD) applied below the free-shipping threshold. */
export const SHIPPING_FEE = 150;

/** Compute the delivery fee for a given amount (goods, before or after discounts as set in Admin). */
export function shippingForSubtotal(subtotal: number, freeFrom = FREE_SHIPPING_THRESHOLD, fee = SHIPPING_FEE): number {
  return subtotal >= freeFrom ? 0 : fee;
}

/** Amount still needed to unlock free shipping (0 once reached). */
export function amountToFreeShipping(subtotal: number, freeFrom = FREE_SHIPPING_THRESHOLD): number {
  return Math.max(0, freeFrom - subtotal);
}
