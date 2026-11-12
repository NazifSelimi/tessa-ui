/**
 * Free, rule-based description drafts (no AI service): a short text per
 * category in Macedonian, Albanian and English, filled with the brand, name,
 * size and the key benefits guessed from the name (the same keyword map Post
 * Studio uses). Always a draft — the admin reads, edits and saves it.
 */
import { productSize, suggestBenefits } from '@/features/studio/info';
import type { DescriptionLocale } from './ProductFields';

type Lang = 'en' | 'mk' | 'sq';
const LANG: Record<DescriptionLocale, Lang> = { en: 'en', mk: 'mk', shq: 'sq' };

interface DraftInput { name: string; brand?: string | null; category?: string | null; size?: string | null }

type Kind = 'shampoo' | 'mask' | 'conditioner' | 'color' | 'peroxide' | 'bleach' | 'spray' | 'styling' | 'treatment' | 'set' | 'tester' | 'other';

function kindOf(category: string, name: string): Kind {
  const text = `${category} ${name}`.toLowerCase();
  if (/tester/.test(text)) return 'tester';
  if (/\bsets?\b|kit/.test(text)) return 'set';
  if (/shampoo|šampon|шампон/.test(text)) return 'shampoo';
  if (/color mask|mask|maschera|маска/.test(text)) return 'mask';
  if (/conditioner|балсам/.test(text)) return 'conditioner';
  if (/peroxide|activator|developer|oxid|hydrogen/.test(text)) return 'peroxide';
  if (/bleach|de color|decolor|lighten/.test(text)) return 'bleach';
  if (/hair color|colou?r cream|\b\d{1,2}[.,/]\d{1,2}\b/.test(text)) return 'color';
  if (/spray/.test(text)) return 'spray';
  if (/styling|wax|gel|mousse|paste/.test(text)) return 'styling';
  if (/fluid|lotion|serum|oil|filler/.test(text)) return 'treatment';
  return 'other';
}

/** One opening sentence and one "how to use" line per kind and language. */
const TEXT: Record<Kind, Record<Lang, [string, string]>> = {
  shampoo: {
    en: ['{name} is a professional shampoo{brand} that gently cleanses hair and scalp.', 'How to use: apply to wet hair, massage, rinse. Repeat if needed.'],
    mk: ['{name} е професионален шампон{brand} кој нежно ги чисти косата и скалпот.', 'Употреба: нанесете на влажна коса, масирајте и исплакнете. По потреба повторете.'],
    sq: ['{name} është shampo profesionale{brand} që pastron butësisht flokët dhe lëkurën e kokës.', 'Përdorimi: aplikoni në flokë të lagur, masazhoni dhe shpëlani. Përsëritni nëse nevojitet.'],
  },
  mask: {
    en: ['{name} is a professional hair mask{brand} for deep care after washing.', 'How to use: apply to washed, towel-dried hair, leave for 3–5 minutes, rinse well.'],
    mk: ['{name} е професионална маска за коса{brand} за длабинска нега по миење.', 'Употреба: нанесете на измиена, исушена со пешкир коса, оставете 3–5 минути и исплакнете.'],
    sq: ['{name} është maskë profesionale për flokë{brand} për kujdes të thellë pas larjes.', 'Përdorimi: aplikoni në flokë të larë e të thara me peshqir, lini 3–5 minuta dhe shpëlani mirë.'],
  },
  conditioner: {
    en: ['{name} is a professional conditioner{brand} that detangles and softens hair.', 'How to use: apply after shampoo to the lengths and ends, then rinse or leave in as directed.'],
    mk: ['{name} е професионален регенератор{brand} кој ја расчешлува и омекнува косата.', 'Употреба: по шампонот нанесете по должините и врвовите, потоа исплакнете или оставете според упатството.'],
    sq: ['{name} është balsam profesional{brand} që i zbërthen dhe i zbut flokët.', 'Përdorimi: pas shampos aplikoni në gjatësi dhe maja, pastaj shpëlani ose lëreni sipas udhëzimit.'],
  },
  color: {
    en: ['{name} is a professional permanent hair colour{brand} with intense, long-lasting results.', 'How to use: mix with the matching developer as directed by the brand. For professional use.'],
    mk: ['{name} е професионална трајна боја за коса{brand} со интензивен и долготраен резултат.', 'Употреба: мешајте со соодветен активатор според упатството на производителот. За професионална употреба.'],
    sq: ['{name} është ngjyrë profesionale e përhershme për flokë{brand} me rezultat intensiv dhe afatgjatë.', 'Përdorimi: përzieni me aktivuesin përkatës sipas udhëzimit të prodhuesit. Për përdorim profesional.'],
  },
  peroxide: {
    en: ['{name} is a professional developer{brand} for mixing with hair colour and bleach.', 'How to use: mix in the ratio given by the colour or bleach you use. For professional use.'],
    mk: ['{name} е професионален активатор (хидроген){brand} за мешање со боја и средство за изрусување.', 'Употреба: мешајте во односот наведен за бојата или изрусувачот. За професионална употреба.'],
    sq: ['{name} është aktivues profesional (hidrogjen){brand} për përzierje me ngjyrë dhe zbardhues.', 'Përdorimi: përzieni sipas raportit të ngjyrës ose zbardhuesit që përdorni. Për përdorim profesional.'],
  },
  bleach: {
    en: ['{name} is a professional lightening product{brand} for fast, even lightening.', 'How to use: mix with developer as directed. Do not use on irritated scalp. For professional use.'],
    mk: ['{name} е професионално средство за изрусување{brand} за брзо и рамномерно посветлување.', 'Употреба: мешајте со активатор според упатството. Не користете на надразнет скалп. За професионална употреба.'],
    sq: ['{name} është produkt profesional për zbardhim{brand} për çelje të shpejtë dhe të njëtrajtshme.', 'Përdorimi: përzieni me aktivues sipas udhëzimit. Mos e përdorni në lëkurë të irrituar. Për përdorim profesional.'],
  },
  spray: {
    en: ['{name} is a professional hair spray{brand} for easy daily care.', 'How to use: spray evenly on hair from about 20 cm. Do not rinse.'],
    mk: ['{name} е професионален спреј за коса{brand} за лесна секојдневна нега.', 'Употреба: испрскајте рамномерно на косата од околу 20 cm. Не се исплакнува.'],
    sq: ['{name} është sprej profesional për flokë{brand} për kujdes të lehtë të përditshëm.', 'Përdorimi: spërkatni në mënyrë të barabartë nga rreth 20 cm. Nuk shpëlahet.'],
  },
  styling: {
    en: ['{name} is a professional styling product{brand} for hold and shape.', 'How to use: work a small amount through dry or damp hair and style as usual.'],
    mk: ['{name} е професионален производ за стилизирање{brand} за фиксирање и облик.', 'Употреба: нанесете мала количина на сува или влажна коса и стилизирајте.'],
    sq: ['{name} është produkt profesional për stilim{brand} për fiksim dhe formë.', 'Përdorimi: aplikoni një sasi të vogël në flokë të thatë ose të lagësht dhe stiloni.'],
  },
  treatment: {
    en: ['{name} is a professional hair treatment{brand} that cares for the lengths and ends.', 'How to use: apply a small amount to the lengths and ends. Use as directed by the brand.'],
    mk: ['{name} е професионален третман за коса{brand} кој ги негува должините и врвовите.', 'Употреба: нанесете мала количина по должините и врвовите, според упатството.'],
    sq: ['{name} është trajtim profesional për flokë{brand} që kujdeset për gjatësitë dhe majat.', 'Përdorimi: aplikoni një sasi të vogël në gjatësi dhe maja, sipas udhëzimit.'],
  },
  set: {
    en: ['{name} is a professional care set{brand} with products that work together.', 'How to use: use each product as described on its pack.'],
    mk: ['{name} е професионален сет за нега{brand} со производи кои делуваат заедно.', 'Употреба: секој производ користете според упатството на пакувањето.'],
    sq: ['{name} është set profesional kujdesi{brand} me produkte që veprojnë së bashku.', 'Përdorimi: përdorni çdo produkt sipas udhëzimit në paketim.'],
  },
  tester: {
    en: ['{name} is a trial size{brand} so you can try the product before buying the full size.', 'How to use: as for the full-size product.'],
    mk: ['{name} е пробно пакување{brand} за да го пробате производот пред да го купите во цела големина.', 'Употреба: исто како производот во цела големина.'],
    sq: ['{name} është paketim provë{brand} për ta provuar produktin para se ta blini në madhësi të plotë.', 'Përdorimi: njësoj si produkti në madhësi të plotë.'],
  },
  other: {
    en: ['{name} is a professional hair-care product{brand}.', 'Use as directed on the pack.'],
    mk: ['{name} е професионален производ за нега на коса{brand}.', 'Користете според упатството на пакувањето.'],
    sq: ['{name} është produkt profesional për kujdesin e flokëve{brand}.', 'Përdoreni sipas udhëzimit në paketim.'],
  },
};

const BRAND: Record<Lang, string> = { en: ' by {brand}', mk: ' од {brand}', sq: ' nga {brand}' };
const BENEFITS: Record<Lang, string> = { en: 'Key benefits: {list}.', mk: 'Главни придобивки: {list}.', sq: 'Përfitimet kryesore: {list}.' };
const SIZE: Record<Lang, string> = { en: 'Size: {size}.', mk: 'Пакување: {size}.', sq: 'Paketimi: {size}.' };

export function templateDescription(locale: DescriptionLocale, input: DraftInput): string {
  const lang = LANG[locale];
  const brand = input.brand && !/^(other|supplier catalogue)$/i.test(input.brand) ? input.brand : '';
  const [intro, usage] = TEXT[kindOf(input.category || '', input.name)][lang];
  const size = input.size || productSize(input.name);
  const benefits = suggestBenefits(`${input.name} ${input.category || ''}`, lang, 3);
  return [
    intro.replace('{name}', input.name).replace('{brand}', brand ? BRAND[lang].replace('{brand}', brand) : ''),
    BENEFITS[lang].replace('{list}', benefits.join(', ')),
    size ? SIZE[lang].replace('{size}', size) : '',
    usage,
  ].filter(Boolean).join('\n');
}
