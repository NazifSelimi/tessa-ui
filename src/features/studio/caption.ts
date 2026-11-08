/**
 * Post Studio captions, written the way each network works best:
 * - Instagram: strong first line (only ~125 characters show before "more"),
 *   short emoji lines, "DM / link in bio" (links in captions are not clickable),
 *   hashtags at the end (max 30).
 * - Facebook: hook, product lines with direct links, website CTA, 2–3 hashtags.
 * Shop name and website come from the site config, so any business can use it.
 */
import { FREE_SHIPPING_THRESHOLD } from '@/shared/constants/shipping';
import { site } from '@/shared/config/site';
import { productPrice, type StudioDesign, type StudioLang, type StudioProduct } from './render';

export type Platform = 'instagram' | 'facebook';
export type Tone = 'friendly' | 'premium' | 'sale' | 'tip';

export const INSTAGRAM_LIMITS = { characters: 2200, hashtags: 30, preview: 125 };
/** Facebook cuts long posts at roughly this many characters with "See more". */
export const FACEBOOK_PREVIEW = 480;

export const TONES: { value: Tone; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'premium', label: 'Premium' },
  { value: 'sale', label: 'Sale / urgent' },
  { value: 'tip', label: 'Tip / how-to' },
];

export interface CaptionOptions {
  platform: Platform;
  tone: Tone;
  /** Which hook wording to use; "New wording" increases it. */
  variant: number;
  emojis: boolean;
  hashtags: string[];
}

/** Web address without https:// — e.g. "tessa.mk". */
export const siteHost = (): string => site.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
export const shopName = (): string => site.name;

const FREE_FROM = FREE_SHIPPING_THRESHOLD.toLocaleString('de-DE');

/** {h} = headline, {b} = sticker text. Several per tone so "New wording" has something to cycle. */
const HOOKS: Record<StudioLang, Record<Tone, string[]>> = {
  mk: {
    friendly: ['✨ {h}', '{h} 💕', 'Ова ќе ви се допадне: {h} 🙌', '{h} 😍 Кој веќе го проба?'],
    premium: ['{h}.', '{h}. Квалитет што се чувствува.', 'Создадено за оние што бараат повеќе: {h}.'],
    sale: ['🔥 {b} {h}', '⏰ Само кратко: {h}', '{h} 🔥 Не пропуштајте!', '💥 {h}, додека трае залихата'],
    tip: ['💡 {h}', 'Дали знаевте? {h} 👇', 'Брз совет: {h}'],
  },
  sq: {
    friendly: ['✨ {h}', '{h} 💕', 'Do t\'ju pëlqejë: {h} 🙌', '{h} 😍 Kush e ka provuar?'],
    premium: ['{h}.', '{h}. Cilësi që ndihet.', 'Për ata që kërkojnë më shumë: {h}.'],
    sale: ['🔥 {b} {h}', '⏰ Vetëm për pak kohë: {h}', '{h} 🔥 Mos e humbisni!', '💥 {h}, deri sa të ketë stok'],
    tip: ['💡 {h}', 'A e dinit? {h} 👇', 'Këshillë e shpejtë: {h}'],
  },
  en: {
    friendly: ['✨ {h}', '{h} 💕', 'You are going to love this: {h} 🙌', '{h} 😍 Who has tried it already?'],
    premium: ['{h}.', '{h}. Quality you can feel.', 'Made for those who expect more: {h}.'],
    sale: ['🔥 {b} {h}', '⏰ For a short time only: {h}', '{h} 🔥 Don\'t miss it!', '💥 {h}, while stocks last'],
    tip: ['💡 {h}', 'Did you know? {h} 👇', 'Quick tip: {h}'],
  },
};

const CTA: Record<StudioLang, { instagram: string; facebook: string; delivery: string; save: string }> = {
  mk: {
    instagram: '📩 Нарачајте преку DM или преку линкот во био.',
    facebook: '🛒 Нарачајте на {site}',
    delivery: `🚚 Бесплатна достава од ${FREE_FROM} ден.`,
    save: '📌 Зачувајте ја објавата за подоцна.',
  },
  sq: {
    instagram: '📩 Porositni me DM ose përmes linkut në bio.',
    facebook: '🛒 Porositni në {site}',
    delivery: `🚚 Dërgesë falas nga ${FREE_FROM} den.`,
    save: '📌 Ruajeni postimin për më vonë.',
  },
  en: {
    instagram: '📩 Order by DM or through the link in bio.',
    facebook: '🛒 Order at {site}',
    delivery: `🚚 Free delivery from ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-US')} MKD.`,
    save: '📌 Save this post for later.',
  },
};

/** General tags per language; the business's own tags come first. */
const PLACE_TAGS: Record<StudioLang, string[]> = {
  mk: ['#македонија', '#скопје', '#онлајнпродавница'],
  sq: ['#maqedonia', '#shkup', '#dyqanonline'],
  en: ['#northmacedonia', '#skopje', '#shoponline'],
};

/** Common product categories in each language (anything else is used as written). */
const CATEGORY_TAGS: Record<string, Record<StudioLang, string>> = {
  shampoo: { mk: '#шампон', sq: '#shampo', en: '#shampoo' },
  mask: { mk: '#маска', sq: '#maskë', en: '#hairmask' },
  conditioner: { mk: '#балсам', sq: '#balsam', en: '#conditioner' },
  styling: { mk: '#стајлинг', sq: '#styling', en: '#styling' },
  spray: { mk: '#спреј', sq: '#sprej', en: '#spray' },
  'hair color': { mk: '#бојазакоса', sq: '#ngjyrëflokësh', en: '#haircolor' },
  oil: { mk: '#масло', sq: '#vaj', en: '#oil' },
  serum: { mk: '#серум', sq: '#serum', en: '#serum' },
};

const EMOJI = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\u{FE0F}|\u{200D}/gu;

export function stripEmoji(text: string): string {
  return text.replace(EMOJI, '').replace(/[ \t]{2,}/g, ' ').split('\n').map((line) => line.trim()).join('\n');
}

/** "#Fanola Color!" → "#fanolacolor" (letters and digits only, any alphabet). */
export function toHashtag(text: string): string {
  const body = text.toLowerCase().replace(/^#/, '').replace(/[^\p{L}\p{N}]+/gu, '');
  return body ? `#${body}` : '';
}

const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match).replace(/\s{2,}/g, ' ').trim();

/** Hashtag ideas, most specific first: the shop, brands, categories, the post idea, place. */
export function suggestHashtags(design: StudioDesign, products: StudioProduct[], ideaTags: string[] = []): string[] {
  const tags = [
    toHashtag(shopName().split(/\s+/)[0] ?? ''),
    toHashtag(shopName()),
    ...products.map((product) => toHashtag(product.brand)),
    ...products.map((product) => {
      const key = product.category.toLowerCase();
      return CATEGORY_TAGS[key]?.[design.lang] ?? toHashtag(product.category);
    }),
    ...ideaTags.map(toHashtag),
    ...PLACE_TAGS[design.lang],
  ];

  return Array.from(new Set(tags.filter((tag) => tag.length > 2)));
}

export function countHashtags(text: string): number {
  return (text.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? []).length;
}

export function buildCaption(design: StudioDesign, products: StudioProduct[], options: CaptionOptions): string {
  const values = {
    h: design.headline.trim() || products[0]?.name || '',
    b: design.badge.trim(),
    site: siteHost(),
  };
  const hooks = HOOKS[design.lang][options.tone];
  const hook = fill(hooks[options.variant % hooks.length], values);
  const cta = CTA[design.lang];
  const parts: string[] = [];

  parts.push(hook);
  if (design.subline.trim()) parts.push(design.subline.trim());

  const lines = products.map((product) => {
    const price = productPrice(product, design);
    const line = `${options.platform === 'instagram' ? '▪️' : '👉'} ${product.name}${price ? ` — ${price}` : ''}`;
    return options.platform === 'facebook' ? `${line}\n${site.url.replace(/\/$/, '')}/product/${product.id}` : line;
  });
  if (lines.length) parts.push(lines.join(options.platform === 'facebook' ? '\n\n' : '\n'));

  if (options.platform === 'instagram') {
    parts.push([cta.instagram, design.priceMode !== 'none' ? cta.delivery : '', options.tone === 'tip' ? cta.save : ''].filter(Boolean).join('\n'));
  } else {
    parts.push([fill(cta.facebook, values), design.priceMode !== 'none' ? cta.delivery : ''].filter(Boolean).join('\n'));
  }

  const limit = options.platform === 'instagram' ? INSTAGRAM_LIMITS.hashtags : 3;
  const hashtags = options.hashtags.slice(0, limit);
  if (hashtags.length) parts.push(hashtags.join(' '));

  const caption = parts.filter(Boolean).join('\n\n');
  return options.emojis ? caption : stripEmoji(caption);
}
