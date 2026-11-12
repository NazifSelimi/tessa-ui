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

type Tool = 'brush' | 'comb' | 'cape' | 'clip' | 'dryer' | 'iron' | 'lashes' | 'extensions' | 'net' | 'accessory';
type Kind = 'shampoo' | 'mask' | 'conditioner' | 'color' | 'peroxide' | 'bleach' | 'spray' | 'styling' | 'treatment' | 'set' | 'tester' | 'other' | Tool;

/** Tools and accessories, matched in English and Macedonian (and some Albanian) words. Checked before care products. */
const TOOLS: [Tool, RegExp][] = [
  ['brush', /brush|четк|furç/],
  ['comb', /\bcomb|чешл|чешел|kreh/],
  ['cape', /\bcape|apron|наметк|пелерин|kepe|përparëse/],
  ['clip', /\bclips?\b|clamp|pins?\b|штипк|шнал|фиба|kapës/],
  ['dryer', /dryer|\bфен\b|tharëse/],
  ['iron', /\biron|straighten|curling|curler|wand|пегла|преса|figaro|hekur/],
  ['lashes', /lash|трепк|qerpik/],
  ['extensions', /extension|екстенз|zgjatim/],
  ['net', /\bnets?\b|мрежа|rrjet/],
  ['accessory', /bowl|applicator|gloves?|foil|towel|sponge|scissor|razor|spray bottle|сад|ракавиц|фолија|пешкир|ножиц|tas|doreza|gërshër/],
];
const TOOL_KINDS = new Set<Kind>(['brush', 'comb', 'cape', 'clip', 'dryer', 'iron', 'lashes', 'extensions', 'net', 'accessory', 'tester']);

function kindOf(category: string, name: string): Kind {
  const text = `${category} ${name}`.toLowerCase();
  if (/tester|тестер|sample|проба/.test(text)) return 'tester';
  const tool = TOOLS.find(([, words]) => words.test(text));
  if (tool) return tool[0];
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
    en: ['{name} is a shop tester / sample{brand}, so clients can try the product in the salon before buying the full size.', 'Use it like the full-size product. Not for resale.'],
    mk: ['{name} е тестер / мостра{brand}, за клиентите да го пробаат производот во салонот пред да го купат во цела големина.', 'Се користи исто како производот во цела големина. Не е за препродажба.'],
    sq: ['{name} është tester / mostër{brand}, që klientët ta provojnë produktin në sallon para se ta blejnë në madhësi të plotë.', 'Përdoret njësoj si produkti në madhësi të plotë. Nuk është për rishitje.'],
  },
  brush: {
    en: ['{name} is a hair brush{brand} for brushing, detangling and styling.', 'How to use: brush from the ends upwards to the roots. Clean the brush regularly.'],
    mk: ['{name} е четка за коса{brand} за четкање, расчешлување и обликување.', 'Употреба: четкајте од врвовите кон корените. Редовно чистете ја четката.'],
    sq: ['{name} është furçë flokësh{brand} për krehje, zbërthim dhe stilim.', 'Përdorimi: krehni nga majat drejt rrënjëve. Pastroni furçën rregullisht.'],
  },
  comb: {
    en: ['{name} is a comb{brand} for parting, detangling and precise styling.', 'How to use: comb section by section, starting at the ends. Wash with warm soapy water.'],
    mk: ['{name} е чешел{brand} за делење, расчешлување и прецизно обликување.', 'Употреба: чешлајте дел по дел, почнувајќи од врвовите. Мијте со топла вода и сапун.'],
    sq: ['{name} është krehër{brand} për ndarje, zbërthim dhe stilim të saktë.', 'Përdorimi: krehni pjesë-pjesë, duke filluar nga majat. Lajeni me ujë të ngrohtë me sapun.'],
  },
  cape: {
    en: ['{name} is a salon cape{brand} that protects the client’s clothes while cutting, colouring or washing.', 'How to use: place around the client’s shoulders and fasten at the neck. Wipe or wash after use.'],
    mk: ['{name} е наметка за салон{brand} која ја штити облеката на клиентот при шишање, боење или миење.', 'Употреба: ставете ја околу рамениците на клиентот и закопчајте на вратот. Избришете или исперете по употреба.'],
    sq: ['{name} është kepe salloni{brand} që mbron rrobat e klientit gjatë prerjes, ngjyrosjes ose larjes.', 'Përdorimi: vendoseni rreth shpatullave të klientit dhe mbërthejeni te qafa. Fshijeni ose lajeni pas përdorimit.'],
  },
  clip: {
    en: ['{name} are hair clips{brand} for holding sections while cutting, colouring or styling.', 'How to use: twist the section and clip it close to the head.'],
    mk: ['{name} се штипки за коса{brand} за држење на делови при шишање, боење или обликување.', 'Употреба: завиткајте го делот и прицврстете го блиску до главата.'],
    sq: ['{name} janë kapëse flokësh{brand} për të mbajtur pjesët gjatë prerjes, ngjyrosjes ose stilimit.', 'Përdorimi: përdredheni pjesën dhe kapeni afër kokës.'],
  },
  dryer: {
    en: ['{name} is a hair dryer{brand} for fast, even drying and styling.', 'How to use: dry with a nozzle pointing down the hair shaft. Use with a heat protection product.'],
    mk: ['{name} е фен за коса{brand} за брзо и рамномерно сушење и обликување.', 'Употреба: сушете со наставката насочена надолу по влакното. Користете со термо заштита.'],
    sq: ['{name} është tharëse flokësh{brand} për tharje dhe stilim të shpejtë e të njëtrajtshëm.', 'Përdorimi: thani me grykën drejt poshtë fijes së flokut. Përdoreni me mbrojtës nga nxehtësia.'],
  },
  iron: {
    en: ['{name} is a styling iron{brand} for straightening or curling.', 'How to use: on dry hair, work in small sections. Always apply heat protection first.'],
    mk: ['{name} е пегла / преса за коса{brand} за исправување или виткање.', 'Употреба: на сува коса, работете во мали делови. Секогаш прво нанесете термо заштита.'],
    sq: ['{name} është hekur flokësh{brand} për drejtim ose kaçurrela.', 'Përdorimi: në flokë të thatë, punoni me pjesë të vogla. Gjithmonë aplikoni më parë mbrojtës nga nxehtësia.'],
  },
  lashes: {
    en: ['{name} are false lashes{brand} for a fuller, longer look.', 'How to use: trim to fit, apply lash glue along the band, wait a few seconds and place on the lash line.'],
    mk: ['{name} се вештачки трепки{brand} за погуст и подолг изглед.', 'Употреба: скратете по мерка, нанесете лепак по лентата, почекајте неколку секунди и поставете ги на линијата на трепките.'],
    sq: ['{name} janë qerpikë artificialë{brand} për pamje më të dendur dhe më të gjatë.', 'Përdorimi: shkurtojini sipas masës, vendosni ngjitës në shirit, prisni pak sekonda dhe vendosini në vijën e qerpikëve.'],
  },
  extensions: {
    en: ['{name} are hair extensions{brand} for extra length and volume.', 'How to use: attach as described for this type of extension; best fitted by a stylist.'],
    mk: ['{name} се екстензии за коса{brand} за дополнителна должина и волумен.', 'Употреба: се поставуваат според упатството за овој тип екстензии; најдобро кај фризер.'],
    sq: ['{name} janë zgjatime flokësh{brand} për gjatësi dhe vëllim shtesë.', 'Përdorimi: vendosen sipas udhëzimit për këtë lloj zgjatimi; më mirë te parukeri.'],
  },
  net: {
    en: ['{name} is a hair net{brand} for keeping hair or a style in place.', 'How to use: pull over the hair and tuck in the edges.'],
    mk: ['{name} е мрежа за коса{brand} која ја држи косата или фризурата на место.', 'Употреба: навлечете ја преку косата и подвиткајте ги рабовите.'],
    sq: ['{name} është rrjetë flokësh{brand} për t’i mbajtur flokët ose modelin në vend.', 'Përdorimi: vendoseni mbi flokë dhe futni anët brenda.'],
  },
  accessory: {
    en: ['{name} is a salon accessory{brand} for everyday professional work.', 'Clean after each use.'],
    mk: ['{name} е додаток за салон{brand} за секојдневна професионална работа.', 'Чистете по секоја употреба.'],
    sq: ['{name} është aksesor salloni{brand} për punë të përditshme profesionale.', 'Pastrojeni pas çdo përdorimi.'],
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
  const kind = kindOf(input.category || '', input.name);
  const [intro, usage] = TEXT[kind][lang];
  const size = input.size || productSize(input.name);
  // Tools and testers say what the item is and how it is used, not care benefits.
  const benefits = TOOL_KINDS.has(kind) ? [] : suggestBenefits(`${input.name} ${input.category || ''}`, lang, 3);
  return [
    intro.replace('{name}', input.name).replace('{brand}', brand ? BRAND[lang].replace('{brand}', brand) : ''),
    benefits.length ? BENEFITS[lang].replace('{list}', benefits.join(', ')) : '',
    size ? SIZE[lang].replace('{size}', size) : '',
    usage,
  ].filter(Boolean).join('\n');
}
