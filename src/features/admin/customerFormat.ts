/** Labels, formatting and quick segments for the admin Customers page. */

import dayjs, { type Dayjs } from 'dayjs';
import type { CustomerOrder, CustomersParams, CustomerType } from './customersApi';

export const customerTypeLabel: Record<CustomerType, string> = {
  customer: 'Customer',
  business: 'Business',
  guest: 'Guest (no account)',
};

export const customerTypeColor: Record<CustomerType, string> = {
  customer: 'blue',
  business: 'purple',
  guest: 'default',
};

export const orderStatusColor: Record<CustomerOrder['status'], string> = {
  pending: 'gold',
  confirmed: 'blue',
  shipped: 'green',
  cancelled: 'red',
};

/** Whole MKD with dot thousands: 12.500 MKD (same as the shop's formatPrice). */
export { formatPrice as formatMkd } from '@/shared/utils/formatPrice';

export function formatDate(value: string | null | undefined): string {
  return value ? dayjs(value).format('DD.MM.YYYY') : '—';
}

export type CustomerSegment = 'all' | 'best' | 'inactive' | 'business' | 'new';

export const customerSegments: { value: CustomerSegment; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'best', label: 'Best customers' },
  { value: 'inactive', label: 'Not ordered in 60 days' },
  { value: 'business', label: 'Business accounts' },
  { value: 'new', label: 'New this month' },
];

/** Quick segments: each is a ready-made filter and sort. */
export function segmentParams(segment: CustomerSegment, today: Dayjs = dayjs()): CustomersParams {
  switch (segment) {
    case 'best':
      return { has_orders: 1, sort: 'total_spent', direction: 'desc' };
    case 'inactive':
      return { inactive_days: 60, sort: 'total_spent', direction: 'desc' };
    case 'business':
      return { type: 'business' };
    case 'new':
      return { new_since: today.startOf('month').format('YYYY-MM-DD'), sort: 'joined_at', direction: 'desc' };
    default:
      return {};
  }
}
