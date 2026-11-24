import type { Dayjs } from 'dayjs';
import type { BundleAudience } from '@/types';

/** Who sees an offer. */
export const AUDIENCES: { value: BundleAudience; label: string; color: string; hint: string }[] = [
  { value: 'all', label: 'Everyone', color: 'green', hint: 'Shoppers, guests and salons' },
  { value: 'stylist', label: 'Salons only', color: 'purple', hint: 'Only signed-in stylists, at salon prices' },
  { value: 'customer', label: 'Shoppers only', color: 'blue', hint: 'Guests and customers, not salons' },
];

/** Date as the API stores it. */
export const toApiDate = (value: Dayjs | null | undefined) => (value ? value.format('YYYY-MM-DD HH:mm:ss') : null);
