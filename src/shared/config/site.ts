import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/shared/constants/shipping';

export const site = {
  contactEmail: 'info@tessa.mk',
  contactPhone: '+389 42 333 003',
  contactPhoneHref: 'tel:+38942333003',
  deliverySummary: `Cash on delivery. ${SHIPPING_FEE} MKD delivery below ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-US')} MKD; free delivery from ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-US')} MKD.`,
  // Add only verified official URLs here. Empty values intentionally hide links.
  social: {
    facebook: '',
    instagram: '',
  },
} as const;
