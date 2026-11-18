/**
 * Bundle → Offer post: the texts, sticker and products a bundle's post shows.
 * Used by "Bundle deals" in Create and by the Bundles tab, which makes and
 * saves one picture per bundle.
 */
import type { StoreBundle } from '@/types';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { StudioDesign, StudioLang } from './render';

/** Offer posts show up to this many products. */
export const OFFER_MAX_PRODUCTS = 3;

type BundleItem = StoreBundle['products'][number];

export interface BundlePost {
  /** Fields to set on the design (template, texts, price mode). */
  design: Pick<StudioDesign, 'template' | 'eyebrow' | 'headline' | 'subline' | 'badge' | 'info' | 'priceMode'>;
  /** Products on the picture: paid ones with a photo first, at most OFFER_MAX_PRODUCTS. */
  productIds: string[];
  /** Normal price of the whole bundle and what it costs as a bundle. */
  full: number;
  deal: number;
}

const TOGETHER: Record<StudioLang, string> = { mk: 'Заедно', sq: 'Së bashku', en: 'Together' };
const INSTEAD: Record<StudioLang, string> = { mk: 'наместо', sq: 'në vend të', en: 'instead of' };
const GIFT: Record<StudioLang, string> = { mk: 'ПОДАРОК', sq: 'DHURATË', en: 'FREE GIFT' };
const FOR_SALONS: Record<StudioLang, string> = { mk: 'За салони', sq: 'Për sallone', en: 'For salons' };
const BUNDLE_DEAL: Record<StudioLang, string> = { mk: 'Сет понуда', sq: 'Ofertë set', en: 'Bundle deal' };

/** "Заедно 1.200 ден наместо 1.500 ден" in the post's language. */
export const priceLine = (lang: StudioLang, deal: number, full: number) =>
  `${TOGETHER[lang]} ${formatPrice(deal)} ${INSTEAD[lang]} ${formatPrice(full)}`;

/** True for a second line written by priceLine (so it may be rewritten, unlike the admin's own text). */
export const isPriceLine = (text: string) => /^(Заедно|Së bashku|Together) /.test(text);

export function bundlePost(bundle: StoreBundle, lang: StudioLang): BundlePost {
  const salon = bundle.audience === 'stylist';
  const unit = (item: BundleItem) => Number((salon && item.stylistPrice) || item.price || 0);
  const total = (items: BundleItem[]) => items.reduce((sum, item) => sum + unit(item) * (item.quantity || 1), 0);
  const full = total(bundle.products);
  const paidTotal = total(bundle.products.filter((item) => !item.isBonus));
  const pct = Number(bundle.discountPercentage ?? 0);
  const deal = bundle.promotionType === 'fixed_price' && bundle.bundlePrice ? Number(bundle.bundlePrice)
    : bundle.promotionType === 'bonus_items' ? paidTotal
    : pct > 0 ? full * (1 - pct / 100) : full;
  const off = full > 0 ? Math.round((1 - deal / full) * 100) : 0;

  const badge = bundle.promotionType === 'bonus_items' ? GIFT[lang] : off > 0 ? `-${off}%` : '';
  const subline = deal > 0 && deal < full ? priceLine(lang, deal, full) : (bundle.description ?? '');

  // Paid products with a photo first, so the picture never starts with an empty space or the free gift.
  const order = (item: BundleItem) => (item.image ? 0 : 2) + (item.isBonus ? 1 : 0);
  const productIds = [...bundle.products]
    .sort((a, b) => order(a) - order(b))
    .slice(0, OFFER_MAX_PRODUCTS)
    .map((item) => String(item.id));

  return {
    design: {
      template: 'offer',
      eyebrow: salon ? FOR_SALONS[lang] : BUNDLE_DEAL[lang],
      headline: bundle.name,
      subline,
      badge,
      info: 'price',
      priceMode: salon ? 'salon' : 'retail',
    },
    productIds,
    full,
    deal,
  };
}
