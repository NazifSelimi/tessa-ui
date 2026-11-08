/**
 * Ready post ideas: one click fills Post Studio with a layout, colours,
 * sticker, text in MK / SQ / EN, a caption tone and hashtags. The texts use
 * placeholders so any business can use them:
 *   {shop} shop name · {site} web address · {product} first chosen product
 *   {free} free-delivery amount · {year} the coming year
 */
import { FREE_SHIPPING_THRESHOLD } from '@/shared/constants/shipping';
import type { Tone } from './caption';
import { shopName, siteHost } from './caption';
import type { FormatId, PriceMode, StudioLang, TemplateId, ThemeId } from './render';

export type IdeaGroup = 'sell' | 'seasonal' | 'engage' | 'info';

export const IDEA_GROUPS: { value: IdeaGroup | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sell', label: 'Sell' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'engage', label: 'Engage' },
  { value: 'info', label: 'Info' },
];

interface IdeaText { eyebrow: string; headline: string; subline: string; badge: string; tags: string[] }

export interface PostIdea {
  id: string;
  group: IdeaGroup;
  emoji: string;
  label: string;
  hint: string;
  template: TemplateId;
  theme: ThemeId;
  tone: Tone;
  /** Story ideas want 9:16; others follow the chosen network. */
  format?: FormatId;
  priceMode?: PriceMode;
  /** Shows a reminder to pick products when none are chosen. */
  wantsProducts?: boolean;
  /** Headline when no product is chosen yet (for ideas whose headline is {product}). */
  noProductHeadline?: Record<StudioLang, string>;
  /** Next dates this idea is for (seasonal ideas). */
  dates?: (year: number) => Date[];
  text: Record<StudioLang, IdeaText>;
}

/** Last Friday of November. */
const blackFriday = (year: number) => {
  const date = new Date(year, 10, 30);
  while (date.getDay() !== 5) date.setDate(date.getDate() - 1);
  return date;
};

export const IDEAS: PostIdea[] = [
  {
    id: 'new-arrival', group: 'sell', emoji: '🆕', label: 'New arrival', hint: 'Show a new product',
    template: 'spotlight', theme: 'blush', tone: 'friendly', wantsProducts: true,
    noProductHeadline: { mk: 'Ново пристигнато', sq: 'Sapo arriti', en: 'Just arrived' },
    text: {
      mk: { eyebrow: 'Ново во {shop}', headline: '{product}', subline: 'Сега достапно, нарачајте први.', badge: 'НОВО', tags: ['ново', 'новопристигнато'] },
      sq: { eyebrow: 'E re në {shop}', headline: '{product}', subline: 'Tani në dispozicion, porositni të parët.', badge: 'E RE', tags: ['eRe', 'sapoArriti'] },
      en: { eyebrow: 'New at {shop}', headline: '{product}', subline: 'Available now. Be the first to order.', badge: 'NEW', tags: ['newarrival', 'justin'] },
    },
  },
  {
    id: 'weekend-sale', group: 'sell', emoji: '🔥', label: 'Weekend sale', hint: 'Discount until Sunday',
    template: 'offer', theme: 'rose', tone: 'sale', wantsProducts: true,
    text: {
      mk: { eyebrow: 'Викенд акција', headline: 'Само овој викенд', subline: 'Попуст на избрани производи до недела навечер.', badge: '-20%', tags: ['акција', 'попуст', 'викенд'] },
      sq: { eyebrow: 'Aksion fundjave', headline: 'Vetëm këtë fundjavë', subline: 'Zbritje në produkte të zgjedhura deri të dielën në mbrëmje.', badge: '-20%', tags: ['aksion', 'zbritje', 'fundjave'] },
      en: { eyebrow: 'Weekend sale', headline: 'This weekend only', subline: 'Discount on selected products until Sunday night.', badge: '-20%', tags: ['sale', 'weekendsale', 'discount'] },
    },
  },
  {
    id: 'product-week', group: 'sell', emoji: '⭐', label: 'Product of the week', hint: 'Your pick, big photo',
    template: 'spotlight', theme: 'cream', tone: 'premium', wantsProducts: true,
    noProductHeadline: { mk: 'Нашиот избор оваа недела', sq: 'Zgjedhja jonë e kësaj jave', en: 'Our pick this week' },
    text: {
      mk: { eyebrow: 'Производ на неделата', headline: '{product}', subline: '', badge: 'ХИТ', tags: ['производнанеделата'] },
      sq: { eyebrow: 'Produkti i javës', headline: '{product}', subline: '', badge: 'HIT', tags: ['produktiIJavës'] },
      en: { eyebrow: 'Product of the week', headline: '{product}', subline: '', badge: 'HIT', tags: ['productoftheweek'] },
    },
  },
  {
    id: 'back-in-stock', group: 'sell', emoji: '📦', label: 'Back in stock', hint: 'A favourite is back',
    template: 'spotlight', theme: 'white', tone: 'sale', wantsProducts: true,
    noProductHeadline: { mk: 'Вашите омилени се вратија', sq: 'Të preferuarit tuaj u kthyen', en: 'Your favourites are back' },
    text: {
      mk: { eyebrow: 'Повторно на залиха', headline: '{product}', subline: 'Ограничени количини, нарачајте навреме.', badge: 'ПАК ТУКА', tags: ['повторноназалиха'] },
      sq: { eyebrow: 'Përsëri në stok', headline: '{product}', subline: 'Sasi të kufizuara, porositni me kohë.', badge: 'KTHYER', tags: ['përsëriNëStok'] },
      en: { eyebrow: 'Back in stock', headline: '{product}', subline: 'Limited quantities, order in time.', badge: 'BACK', tags: ['backinstock', 'restock'] },
    },
  },
  {
    id: 'bundle', group: 'sell', emoji: '🎁', label: 'Bundle / 1+1', hint: 'Products that go together',
    template: 'offer', theme: 'noir', tone: 'sale', wantsProducts: true,
    text: {
      mk: { eyebrow: 'Комплет', headline: 'Подобро заедно', subline: 'Земете ги заедно и заштедете.', badge: '1+1', tags: ['комплет', 'подарок'] },
      sq: { eyebrow: 'Set', headline: 'Më mirë bashkë', subline: 'Merrini bashkë dhe kurseni.', badge: '1+1', tags: ['set', 'dhuratë'] },
      en: { eyebrow: 'Bundle', headline: 'Better together', subline: 'Get them together and save.', badge: '1+1', tags: ['bundle', 'gift'] },
    },
  },
  {
    id: 'free-delivery', group: 'info', emoji: '🚚', label: 'Free delivery', hint: 'Remind people of the free-delivery amount',
    template: 'announcement', theme: 'blush', tone: 'friendly', priceMode: 'none',
    text: {
      mk: { eyebrow: '{shop}', headline: 'Бесплатна достава', subline: 'За сите нарачки од {free} ден. низ цела Македонија.', badge: '{site}', tags: ['бесплатнадостава', 'достава'] },
      sq: { eyebrow: '{shop}', headline: 'Dërgesë falas', subline: 'Për të gjitha porositë nga {free} den. në gjithë Maqedoninë.', badge: '{site}', tags: ['dërgesëFalas'] },
      en: { eyebrow: '{shop}', headline: 'Free delivery', subline: 'On every order from {free} MKD across North Macedonia.', badge: '{site}', tags: ['freedelivery', 'freeshipping'] },
    },
  },
  {
    id: 'tip', group: 'info', emoji: '💡', label: 'Tip of the day', hint: 'Teach something useful (edit the text)',
    template: 'announcement', theme: 'cream', tone: 'tip', priceMode: 'none',
    text: {
      mk: { eyebrow: 'Совет на денот', headline: 'Еден мал совет што прави голема разлика', subline: 'Напишете го вашиот совет тука: како, кога и колку да се користи.', badge: '', tags: ['совет', 'совети'] },
      sq: { eyebrow: 'Këshilla e ditës', headline: 'Një këshillë e vogël që bën diferencë të madhe', subline: 'Shkruani këshillën tuaj këtu: si, kur dhe sa të përdoret.', badge: '', tags: ['këshilla', 'këshillaTëDitës'] },
      en: { eyebrow: 'Tip of the day', headline: 'One small tip that makes a big difference', subline: 'Write your tip here: how, when and how much to use.', badge: '', tags: ['tips', 'howto'] },
    },
  },
  {
    id: 'thank-you', group: 'engage', emoji: '💐', label: 'Thank you', hint: 'Thank customers and followers',
    template: 'announcement', theme: 'rose', tone: 'friendly', priceMode: 'none',
    text: {
      mk: { eyebrow: '{shop}', headline: 'Ви благодариме!', subline: 'Што сте дел од нашата приказна. Без вас ова не би постоело.', badge: '', tags: ['благодарност', 'хвала'] },
      sq: { eyebrow: '{shop}', headline: 'Ju faleminderit!', subline: 'Që jeni pjesë e historisë sonë. Pa ju kjo nuk do të ekzistonte.', badge: '', tags: ['faleminderit'] },
      en: { eyebrow: '{shop}', headline: 'Thank you!', subline: 'For being part of our story. None of this exists without you.', badge: '', tags: ['thankyou', 'grateful'] },
    },
  },
  {
    id: 'review', group: 'engage', emoji: '💬', label: 'Customer review', hint: 'Paste a real customer’s words',
    template: 'announcement', theme: 'white', tone: 'friendly', priceMode: 'none',
    text: {
      mk: { eyebrow: 'Што велат нашите купувачи', headline: '„Залепете ги зборовите на купувачот тука.“', subline: '— Име на купувачот', badge: '★★★★★', tags: ['рецензија', 'задоволникупувачи'] },
      sq: { eyebrow: 'Çfarë thonë klientët tanë', headline: '“Ngjitni fjalët e klientit këtu.”', subline: '— Emri i klientit', badge: '★★★★★', tags: ['vlerësim', 'klientëTëKënaqur'] },
      en: { eyebrow: 'What our customers say', headline: '“Paste the customer’s words here.”', subline: '— Customer name', badge: '★★★★★', tags: ['review', 'happycustomers'] },
    },
  },
  {
    id: 'womens-day', group: 'seasonal', emoji: '🌷', label: "Women's Day · 8 March", hint: 'Gift ideas for 8 March',
    template: 'offer', theme: 'blush', tone: 'friendly', dates: (year) => [new Date(year, 2, 8)],
    text: {
      mk: { eyebrow: 'Среќен 8 Март', headline: 'За сите жени што нè инспирираат', subline: 'Изберете подарок што секогаш одговара.', badge: '8 МАРТ', tags: ['8март', 'денованажената'] },
      sq: { eyebrow: 'Gëzuar 8 Marsin', headline: 'Për të gjitha gratë që na frymëzojnë', subline: 'Zgjidhni një dhuratë që gjithmonë përshtatet.', badge: '8 MARS', tags: ['8marsi', 'ditaEGruas'] },
      en: { eyebrow: "Happy Women's Day", headline: 'For every woman who inspires us', subline: 'Pick a gift that always fits.', badge: '8 MARCH', tags: ['womensday', '8march'] },
    },
  },
  {
    id: 'valentines', group: 'seasonal', emoji: '❤️', label: "Valentine's · 14 Feb", hint: 'Gifts for someone special',
    template: 'offer', theme: 'rose', tone: 'friendly', dates: (year) => [new Date(year, 1, 14)],
    text: {
      mk: { eyebrow: 'Свети Валентин', headline: 'Подарок со љубов', subline: 'Изберете нешто посебно за посебната личност.', badge: '14.02', tags: ['свети валентин', 'подарок'] },
      sq: { eyebrow: 'Shën Valentini', headline: 'Dhuratë me dashuri', subline: 'Zgjidhni diçka të veçantë për personin e veçantë.', badge: '14.02', tags: ['shënValentini', 'dhuratë'] },
      en: { eyebrow: "Valentine's Day", headline: 'A gift with love', subline: 'Pick something special for someone special.', badge: '14.02', tags: ['valentinesday', 'giftideas'] },
    },
  },
  {
    id: 'black-friday', group: 'seasonal', emoji: '🖤', label: 'Black Friday', hint: 'The biggest sale of the year',
    template: 'offer', theme: 'noir', tone: 'sale', wantsProducts: true, dates: (year) => [blackFriday(year)],
    text: {
      mk: { eyebrow: 'Black Friday', headline: 'Најголемите попусти во годината', subline: 'Само до полноќ. Количините се ограничени.', badge: '-30%', tags: ['blackfriday', 'попуст'] },
      sq: { eyebrow: 'Black Friday', headline: 'Zbritjet më të mëdha të vitit', subline: 'Vetëm deri në mesnatë. Sasitë janë të kufizuara.', badge: '-30%', tags: ['blackfriday', 'zbritje'] },
      en: { eyebrow: 'Black Friday', headline: 'The biggest discounts of the year', subline: 'Until midnight only. Limited quantities.', badge: '-30%', tags: ['blackfriday', 'deals'] },
    },
  },
  {
    id: 'christmas', group: 'seasonal', emoji: '🎄', label: 'Christmas', hint: '25 December and 7 January',
    template: 'announcement', theme: 'noir', tone: 'premium', priceMode: 'none',
    dates: (year) => [new Date(year, 11, 25), new Date(year, 0, 7)],
    text: {
      mk: { eyebrow: 'Среќни празници', headline: 'Мир, здравје и радост', subline: 'Ви посакуваме топли празници со најмилите. — {shop}', badge: '', tags: ['божиќ', 'празници'] },
      sq: { eyebrow: 'Gëzuar festat', headline: 'Paqe, shëndet dhe gëzim', subline: 'Ju urojmë festa të ngrohta me më të dashurit. — {shop}', badge: '', tags: ['krishtlindje', 'festat'] },
      en: { eyebrow: 'Happy holidays', headline: 'Peace, health and joy', subline: 'Wishing you warm holidays with your loved ones. — {shop}', badge: '', tags: ['christmas', 'holidays'] },
    },
  },
  {
    id: 'new-year', group: 'seasonal', emoji: '🎆', label: 'New Year', hint: 'Greeting for 1 January',
    template: 'announcement', theme: 'noir', tone: 'premium', priceMode: 'none',
    dates: (year) => [new Date(year, 0, 1)],
    text: {
      mk: { eyebrow: 'Среќна Нова година', headline: 'Нека {year} биде ваша година', subline: 'Ви благодариме што бевте со нас. — {shop}', badge: '{year}', tags: ['новагодина', 'среќнановагодина'] },
      sq: { eyebrow: 'Gëzuar Vitin e Ri', headline: 'Le të jetë {year} viti juaj', subline: 'Faleminderit që ishit me ne. — {shop}', badge: '{year}', tags: ['vitiIRi', 'gëzuarVitinERi'] },
      en: { eyebrow: 'Happy New Year', headline: 'Make {year} your year', subline: 'Thank you for being with us. — {shop}', badge: '{year}', tags: ['newyear', 'happynewyear'] },
    },
  },
  {
    id: 'summer', group: 'seasonal', emoji: '🌞', label: 'Summer care', hint: 'Favourites for hot days',
    template: 'offer', theme: 'cream', tone: 'friendly', wantsProducts: true, dates: (year) => [new Date(year, 5, 1)],
    text: {
      mk: { eyebrow: 'Летна нега', headline: 'Подготвени за летото', subline: 'Вашите омилени производи за топлите денови.', badge: 'ЛЕТО', tags: ['лето', 'летнанега'] },
      sq: { eyebrow: 'Kujdes veror', headline: 'Gati për verën', subline: 'Produktet tuaja të preferuara për ditët e nxehta.', badge: 'VERË', tags: ['verë', 'kujdesVeror'] },
      en: { eyebrow: 'Summer care', headline: 'Ready for summer', subline: 'Your favourites for the hot days.', badge: 'SUMMER', tags: ['summer', 'summercare'] },
    },
  },
  {
    id: 'holiday-greeting', group: 'seasonal', emoji: '🕊️', label: 'Holiday greeting', hint: 'Easter, Bajram or any holiday (edit the name)',
    template: 'announcement', theme: 'blush', tone: 'friendly', priceMode: 'none',
    text: {
      mk: { eyebrow: 'Честитка', headline: 'Среќен празник!', subline: 'Ви посакуваме мир, здравје и радост со најмилите. — {shop}', badge: '', tags: ['празник', 'честитки'] },
      sq: { eyebrow: 'Urim', headline: 'Gëzuar festën!', subline: 'Ju urojmë paqe, shëndet dhe gëzim me më të dashurit. — {shop}', badge: '', tags: ['urime', 'festa'] },
      en: { eyebrow: 'Greetings', headline: 'Happy holidays!', subline: 'Wishing you peace, health and joy with your loved ones. — {shop}', badge: '', tags: ['greetings', 'holidays'] },
    },
  },
];

export const ideaById = (id: string | null | undefined) => IDEAS.find((idea) => idea.id === id) ?? null;

/** Next date of a seasonal idea on or after today (start of day). */
export function nextDate(idea: PostIdea, today = new Date()): Date | null {
  if (!idea.dates) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const candidates = [...idea.dates(start.getFullYear()), ...idea.dates(start.getFullYear() + 1)]
    .filter((date) => date >= start)
    .sort((a, b) => a.getTime() - b.getTime());
  return candidates[0] ?? null;
}

/** Seasonal ideas whose date is within the next `days` days, soonest first. */
export function upcomingIdeas(days = 30, today = new Date()): { idea: PostIdea; date: Date; inDays: number }[] {
  const dayMs = 86_400_000;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return IDEAS
    .map((idea) => ({ idea, date: nextDate(idea, today) }))
    .filter((item): item is { idea: PostIdea; date: Date } => item.date !== null)
    .map((item) => ({ ...item, inDays: Math.round((item.date.getTime() - start.getTime()) / dayMs) }))
    .filter((item) => item.inDays <= days)
    .sort((a, b) => a.inDays - b.inDays);
}

/** The idea's text in one language with placeholders filled in. */
export function ideaText(idea: PostIdea, lang: StudioLang, productName?: string, today = new Date()) {
  const text = idea.text[lang];
  const values: Record<string, string> = {
    shop: shopName(),
    site: siteHost(),
    free: FREE_SHIPPING_THRESHOLD.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE'),
    year: String(today.getMonth() >= 9 ? today.getFullYear() + 1 : today.getFullYear()),
    product: productName ?? '',
  };
  const fill = (value: string) => value.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match).trim();
  const headline = text.headline === '{product}' && !productName
    ? idea.noProductHeadline?.[lang] ?? ''
    : fill(text.headline);

  return {
    eyebrow: fill(text.eyebrow),
    headline,
    subline: fill(text.subline),
    badge: fill(text.badge),
    tags: text.tags.map((tag) => fill(tag)),
  };
}
