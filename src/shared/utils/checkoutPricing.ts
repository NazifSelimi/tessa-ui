import type { CartItem } from '@/types';
export function cartPriceForRole(item: CartItem, stylist: boolean, now = Date.now()): number {
  const value = Number(stylist ? (item.rolePrice ?? item.product.stylistPrice) : (item.retailPrice ?? item.product.price));
  const price = Number.isFinite(value) && value >= 0 ? value : 0;
  // A sale only lowers the price (matches Product::resolvePrice in the API).
  const sale = item.product.sale;
  const salePrice = Number(sale?.price);
  if (sale && price > 0 && salePrice > 0 && now >= Date.parse(sale.startDate) && now <= Date.parse(sale.endDate)) return Math.min(price, salePrice);
  return price;
}
export function couponDiscount(subtotal: number, value: number, percentage: boolean): number {
  const base = Math.max(0, subtotal);
  return percentage ? Math.round(base * value) / 100 : Math.min(Math.max(0, value), base);
}
