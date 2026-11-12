/**
 * The "info line" under a product on a post: key benefits (default), size,
 * promo code, call to action, a badge, the price, or nothing. Benefits are
 * suggested from the product's name, category and description in MK/SQ/EN.
 */
import { getBrandKit } from './brand';
import type { StudioLang } from './render';

export type InfoMode = 'benefits' | 'size' | 'promo' | 'cta' | 'badge' | 'price' | 'none';

export const INFO_OPTIONS: { value: InfoMode; label: string }[] = [
  { value: 'benefits', label: 'Key benefits' },
  { value: 'size', label: 'Size' },
  { value: 'promo', label: 'Promo code' },
  { value: 'cta', label: 'Call to action' },
  { value: 'badge', label: 'Badge' },
  { value: 'price', label: 'Price' },
  { value: 'none', label: 'Nothing' },
];

interface Benefit { label: Record<StudioLang, string>; words: string[] }

/** Keyword → benefit. Words are matched in lower case inside name, category and descriptions. */
const BENEFITS: Benefit[] = [
  { label: { en: 'Anti-frizz', mk: 'Против разлетување', sq: 'Kundër frizz' }, words: ['frizz', 'разлет', 'smooth', 'liss', 'straight'] },
  { label: { en: 'Shine', mk: 'Сјај', sq: 'Shkëlqim' }, words: ['shine', 'gloss', 'сјај', 'shkëlq', 'brilliant'] },
  { label: { en: 'Repair', mk: 'Обнова', sq: 'Riparim' }, words: ['repair', 'restruct', 'reconstr', 'botox', 'botugen', 'keratin', 'bond', 'fiber', 'обнов', 'поправ', 'riparim', 'rindërt', 'filler'] },
  { label: { en: 'Volume', mk: 'Волумен', sq: 'Vëllim' }, words: ['volum', 'волумен', 'vëllim', 'root'] },
  { label: { en: 'Curls', mk: 'Кадрици', sq: 'Kaçurrela' }, words: ['curl', 'кадр', 'kaçur', 'wave'] },
  { label: { en: 'No yellow', mk: 'Без жолти тонови', sq: 'Pa nuanca të verdha' }, words: ['no yellow', 'yellow', 'silver', 'blonde', 'жолт', 'verdh', 'toner'] },
  { label: { en: 'Colour protect', mk: 'Заштита на бојата', sq: 'Mbrojtje e ngjyrës' }, words: ['colour', 'color', 'coloured', 'бојосан', 'заштита на боја', 'ngjyr'] },
  { label: { en: 'Hydration', mk: 'Хидратација', sq: 'Hidratim' }, words: ['hydrat', 'moistur', 'hyaluron', 'argan', 'nutri', 'хидрат', 'влаж', 'hidrat', 'ushqy', 'oil'] },
  { label: { en: 'Anti-dandruff', mk: 'Против перут', sq: 'Kundër zbokthit' }, words: ['dandruff', 'перут', 'zbokth', 'purif'] },
  { label: { en: 'Strength', mk: 'Зајакнување', sq: 'Forcim' }, words: ['hair loss', 'energy', 'strength', 'опаѓ', 'зајакн', 'rënie', 'forc', 'vitamin'] },
  { label: { en: 'Heat protection', mk: 'Термо заштита', sq: 'Mbrojtje nga nxehtësia' }, words: ['heat', 'thermal', 'термо', 'nxehtës'] },
  { label: { en: 'Long-lasting colour', mk: 'Долготрајна боја', sq: 'Ngjyrë afatgjatë' }, words: ['hair color', 'permanent', 'ammonia', 'перманент'] },
];

const FALLBACK: Record<StudioLang, string> = { en: 'Professional care', mk: 'Професионална нега', sq: 'Kujdes profesional' };

/** 2–3 short benefits for a product, best guesses first. */
export function suggestBenefits(text: string, lang: StudioLang, max = 3): string[] {
  const haystack = text.toLowerCase();
  const found = BENEFITS
    .map((benefit) => ({ benefit, hits: benefit.words.filter((word) => haystack.includes(word)).length }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((item) => item.benefit.label[lang]);
  const list = Array.from(new Set(found)).slice(0, max);
  return list.length ? list : [FALLBACK[lang]];
}

/** All benefit labels in one language, for the picker. */
export const benefitChoices = (lang: StudioLang) => [...BENEFITS.map((benefit) => benefit.label[lang]), FALLBACK[lang]];

/** "Curly Shine 1000ml" → "1000 ml". */
export function productSize(name: string): string {
  const match = name.match(/(\d+(?:[.,]\d+)?)\s?(ml|l|g|kg|oz)\b/i);
  return match ? `${match[1]} ${match[2].toLowerCase()}` : '';
}

const CODE_LABEL: Record<StudioLang, string> = { en: 'CODE', mk: 'КОД', sq: 'KODI' };
export const promoText = (code: string, lang: StudioLang) => (code.trim() ? `${CODE_LABEL[lang]}: ${code.trim().toUpperCase()}` : '');

export function ctaChoices(lang: StudioLang): string[] {
  const host = getBrandKit().host;
  return {
    en: ['Order via DM', 'Link in bio', `Available at ${host}`],
    mk: ['Нарачајте преку DM', 'Линк во био', `Достапно на ${host}`],
    sq: ['Porositni me DM', 'Linku në bio', `Në dispozicion në ${host}`],
  }[lang];
}

export function badgeChoices(lang: StudioLang): string[] {
  return {
    en: ['Bestseller', 'New', 'Salon favourite'],
    mk: ['Најпродаван', 'Ново', 'Омилен во салоните'],
    sq: ['Më i shituri', 'E re', 'I preferuar në sallone'],
  }[lang];
}
