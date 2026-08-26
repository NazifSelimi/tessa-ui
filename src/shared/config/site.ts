import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/shared/constants/shipping';

function readEnv(name: string): string | null {
  const value = import.meta.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function ensureHref(value: string | null, fallback: string): string {
  return value ?? fallback;
}

const primaryPhoneLabel = readEnv('VITE_SITE_PHONE_PRIMARY') ?? '078 286 003';
const primaryPhoneHref = ensureHref(readEnv('VITE_SITE_PHONE_PRIMARY_HREF'), 'tel:+38978286003');
const secondaryPhoneLabel = readEnv('VITE_SITE_PHONE_SECONDARY') ?? '042 333 003';
const secondaryPhoneHref = ensureHref(readEnv('VITE_SITE_PHONE_SECONDARY_HREF'), 'tel:+38942333003');

export const site = {
  contactEmail: readEnv('VITE_SITE_CONTACT_EMAIL') ?? 'tessa@tessa.mk',
  contactPhones: [
    { label: primaryPhoneLabel, href: primaryPhoneHref },
    { label: secondaryPhoneLabel, href: secondaryPhoneHref },
  ],
  deliverySummary: readEnv('VITE_SITE_DELIVERY_SUMMARY')
    ?? `Cash on delivery. ${SHIPPING_FEE} MKD delivery below ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-US')} MKD; free delivery from ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-US')} MKD.`,
  // Add only verified official URLs here. Empty values intentionally hide links.
  social: {
    facebook: readEnv('VITE_SITE_SOCIAL_FACEBOOK') ?? '',
    instagram: readEnv('VITE_SITE_SOCIAL_INSTAGRAM') ?? '',
  },
} as const;
