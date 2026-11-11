/**
 * Viber / WhatsApp message templates in Macedonian, Albanian and English.
 * Placeholders are filled in for each person: {name} first name, {order}
 * order number, {total} order total, {shop} shop name, {link} website,
 * {code} a referral / discount code. Admins can change any text on
 * /admin/messages → Templates; these are the built-in starting texts.
 */

export type Lang = 'mk' | 'sq' | 'en';
export const LANGS: Lang[] = ['mk', 'sq', 'en'];

export interface MessageTemplateDef {
  key: string;
  label: string;
  mk: string;
  sq: string;
  en: string;
  /** Added by the admin (not one of the built-in templates). */
  custom?: boolean;
}

export const PLACEHOLDERS = ['name', 'order', 'total', 'shop', 'link', 'code'] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];
export type TemplateVars = Partial<Record<Placeholder, string | number | null | undefined>>;

export const DEFAULT_TEMPLATES: MessageTemplateDef[] = [
  {
    key: 'order_received',
    label: 'Order received',
    mk: 'Здраво {name}! Ја примивме вашата нарачка #{order} ({total}). Наскоро ќе ја потврдиме. {shop}',
    sq: 'Përshëndetje {name}! E morëm porosinë tuaj #{order} ({total}). Së shpejti do ta konfirmojmë. {shop}',
    en: 'Hi {name}! We received your order #{order} ({total}) and will confirm it soon. {shop}',
  },
  {
    key: 'order_confirmed',
    label: 'Order confirmed',
    mk: 'Здраво {name}! Вашата нарачка #{order} ({total}) е потврдена и се подготвува за испорака. {shop}',
    sq: 'Përshëndetje {name}! Porosia juaj #{order} ({total}) u konfirmua dhe po përgatitet për dërgim. {shop}',
    en: 'Hi {name}! Your order #{order} ({total}) is confirmed and being prepared for delivery. {shop}',
  },
  {
    key: 'order_shipped',
    label: 'Order shipped',
    mk: 'Здраво {name}! Вашата нарачка #{order} е испратена и наскоро ќе пристигне. Плаќањето ({total}) е при достава. {shop}',
    sq: 'Përshëndetje {name}! Porosia juaj #{order} u dërgua dhe do të arrijë së shpejti. Pagesa ({total}) bëhet në dorëzim. {shop}',
    en: 'Hi {name}! Your order #{order} has been shipped and will arrive soon. Payment ({total}) is on delivery. {shop}',
  },
  {
    key: 'order_cancelled',
    label: 'Order cancelled',
    mk: 'Здраво {name}, вашата нарачка #{order} е откажана. Ако ова е грешка или имате прашања, пишете ни тука. {shop}',
    sq: 'Përshëndetje {name}, porosia juaj #{order} u anulua. Nëse është gabim ose keni pyetje, na shkruani këtu. {shop}',
    en: 'Hi {name}, your order #{order} was cancelled. If this is a mistake or you have questions, write to us here. {shop}',
  },
  {
    key: 'offer',
    label: 'Special offer',
    mk: 'Здраво {name}! Имаме специјална понуда за вас во {shop}. Погледнете: {link}',
    sq: 'Përshëndetje {name}! Kemi një ofertë speciale për ju në {shop}. Shikoni: {link}',
    en: 'Hi {name}! We have a special offer for you at {shop}. Take a look: {link}',
  },
  {
    key: 'win_back',
    label: 'We miss you (win-back)',
    mk: 'Здраво {name}! Долго не сте нарачале од {shop}. Со кодот {code} добивате попуст на следната нарачка: {link}',
    sq: 'Përshëndetje {name}! Ka kohë që nuk keni porositur nga {shop}. Me kodin {code} merrni zbritje në porosinë e radhës: {link}',
    en: 'Hi {name}! It has been a while since your last order at {shop}. Use code {code} for a discount on your next order: {link}',
  },
  {
    key: 'review_request',
    label: 'Ask for a review',
    mk: 'Здраво {name}! Се надеваме дека сте задоволни од нарачката #{order}. Ќе ни значи многу ако ни оставите мислење: {link} Ви благодариме, {shop}',
    sq: 'Përshëndetje {name}! Shpresojmë që jeni të kënaqur me porosinë #{order}. Do të na ndihmonte shumë një vlerësim nga ju: {link} Faleminderit, {shop}',
    en: 'Hi {name}! We hope you are happy with order #{order}. A short review would mean a lot to us: {link} Thank you, {shop}',
  },
  {
    key: 'restock',
    label: 'Back in stock',
    mk: 'Здраво {name}! Производот што го баравте повторно е на залиха во {shop}: {link}',
    sq: 'Përshëndetje {name}! Produkti që kërkuat është sërish në stok te {shop}: {link}',
    en: 'Hi {name}! The product you were looking for is back in stock at {shop}: {link}',
  },
  {
    key: 'business_approved',
    label: 'Business account approved',
    mk: 'Здраво {name}! Вашата бизнис сметка во {shop} е одобрена. Најавете се и погледнете ги професионалните цени: {link}',
    sq: 'Përshëndetje {name}! Llogaria juaj e biznesit në {shop} u miratua. Hyni dhe shihni çmimet profesionale: {link}',
    en: 'Hi {name}! Your business account at {shop} is approved. Sign in to see professional prices: {link}',
  },
  {
    key: 'referral_share',
    label: 'Share referral code',
    mk: 'Здраво {name}! Вашиот код за препорака е {code}. Споделете го со клиентите: тие добиваат попуст, а вие кредит во {shop}. {link}',
    sq: 'Përshëndetje {name}! Kodi juaj i rekomandimit është {code}. Ndajeni me klientët: ata marrin zbritje, ju merrni kredi në {shop}. {link}',
    en: 'Hi {name}! Your referral code is {code}. Share it with your clients: they get a discount and you earn credit at {shop}. {link}',
  },
];

/** Template for each order status (order page buttons). */
export const ORDER_STATUS_TEMPLATE: Record<string, string> = {
  pending: 'order_received',
  confirmed: 'order_confirmed',
  shipped: 'order_shipped',
  cancelled: 'order_cancelled',
};

export const firstName = (name?: string | null) => (name ?? '').trim().split(/\s+/)[0] || '';

/** Fills in the placeholders; an empty value also removes the space before it ("Здраво {name}!" → "Здраво!"). */
export function fillTemplate(text: string, vars: TemplateVars): string {
  return text
    .replace(/(\s?)\{(\w+)\}/g, (whole, space: string, key: string) => {
      if (!(PLACEHOLDERS as readonly string[]).includes(key)) return whole;
      const raw = vars[key as Placeholder];
      const value = raw === null || raw === undefined ? '' : String(raw).trim();
      return value ? `${space}${value}` : '';
    })
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,!?:])/g, '$1')
    .trim();
}

/** Built-in templates with the admin's saved changes on top, plus the admin's own ones. */
export function mergeTemplates(saved: MessageTemplateDef[] | undefined): MessageTemplateDef[] {
  const byKey = new Map((saved ?? []).map((t) => [t.key, t]));
  const merged = DEFAULT_TEMPLATES.map((def) => {
    const own = byKey.get(def.key);
    if (!own) return def;
    return {
      ...def,
      label: own.label || def.label,
      mk: own.mk || def.mk,
      sq: own.sq || def.sq,
      en: own.en || def.en,
    };
  });
  const customs = (saved ?? []).filter((t) => t.custom && !DEFAULT_TEMPLATES.some((d) => d.key === t.key));
  return [...merged, ...customs];
}

/** Only what differs from the built-in texts is saved. */
export function changedTemplates(all: MessageTemplateDef[]): MessageTemplateDef[] {
  return all.filter((t) => {
    if (t.custom) return true;
    const def = DEFAULT_TEMPLATES.find((d) => d.key === t.key);
    return !def || def.label !== t.label || def.mk !== t.mk || def.sq !== t.sq || def.en !== t.en;
  });
}

export function toLang(value: string | null | undefined, fallback: Lang = 'mk'): Lang {
  const short = (value ?? '').slice(0, 2).toLowerCase();
  return short === 'mk' || short === 'sq' || short === 'en' ? short : fallback;
}
