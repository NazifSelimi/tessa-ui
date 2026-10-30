import type { CartItem } from '@/types';
export function cartPriceForRole(item: CartItem, stylist: boolean, now = Date.now()): number {
  const sale = item.product.sale;
  if (sale && now >= Date.parse(sale.startDate) && now <= Date.parse(sale.endDate)) return Number(sale.price);
  const value = stylist ? (item.rolePrice ?? item.product.stylistPrice) : (item.retailPrice ?? item.product.price);
  const price = Number(value); return Number.isFinite(price) && price >= 0 ? price : 0;
}
export function couponDiscount(subtotal: number, value: number, percentage: boolean): number {
  const base = Math.max(0, subtotal);
  return percentage ? Math.round(base * value) / 100 : Math.min(Math.max(0, value), base);
}
