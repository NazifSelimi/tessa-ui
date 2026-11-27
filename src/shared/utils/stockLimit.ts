/**
 * Customers and salons see stock capped at 50 (the API's PublicStock::CAP), so
 * "50" means "50 or more". Below 50 the number is the real stock.
 */
export const PUBLIC_STOCK_CAP = 50;

/** A sane upper bound for one cart line when the real stock is not known. */
export const CART_MAX_QUANTITY = 999;

/**
 * Highest quantity the cart and quantity pickers allow (owner rule Q4, #11):
 * the real stock when it is below 50; otherwise no 50-piece limit, and the
 * server checks the real stock at checkout ("Only X left").
 */
export function cartLimit(stock: number | null | undefined): number {
  if (typeof stock !== 'number' || !Number.isFinite(stock)) return CART_MAX_QUANTITY;
  return stock >= PUBLIC_STOCK_CAP ? CART_MAX_QUANTITY : Math.max(0, stock);
}
