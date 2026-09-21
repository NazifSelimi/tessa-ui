import type { Locale } from '@/i18n';

export type LegalPageKey = 'privacy' | 'terms' | 'returns' | 'delivery' | 'contact';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  description: string;
  intro: string;
  sections: LegalSection[];
}

const en: Record<LegalPageKey, LegalDocument> = {
  privacy: {
    title: 'Privacy Policy',
    description: 'How Tessa Hair Care collects, uses, stores, and shares personal information when you shop or create an account.',
    intro: 'This policy explains how Tessa Hair Care handles personal information submitted through tessa.mk.',
    sections: [
      { heading: 'Information we collect', paragraphs: ['We collect the account, contact, delivery, and order information you provide. We may also process basic device, browser, session, and security information needed to operate and protect the website.'] },
      { heading: 'How we use information', paragraphs: ['We use personal information to create and secure accounts, process and deliver orders, provide customer support, manage professional-account applications, prevent misuse, and meet legal and accounting obligations.'] },
      { heading: 'Service providers', paragraphs: ['We share only the information needed with providers that support delivery, payments, email, hosting, analytics, and security. We do not sell personal information.'] },
      { heading: 'Retention and security', paragraphs: ['Information is kept only for as long as needed for the purposes above or required by law. We use reasonable technical and organisational safeguards, but no online service can guarantee absolute security.'] },
      { heading: 'Your choices and rights', paragraphs: ['You may ask to access, correct, or delete eligible personal information, or object to certain processing. Contact us using the details below; we may need to verify your identity before acting on a request.'] },
    ],
  },
  terms: {
    title: 'Terms of Service',
    description: 'Terms that apply when browsing tessa.mk, creating an account, or ordering from Tessa Hair Care.',
    intro: 'These terms apply to use of tessa.mk and orders placed with Tessa Hair Care. By placing an order, you confirm that the information you provide is accurate and that you can enter into the purchase.',
    sections: [
      { heading: 'Products and availability', paragraphs: ['We aim to present products, prices, images, and availability accurately. Minor packaging differences may occur, and an item can become unavailable before an order is confirmed. Products marked for professional use should be used only by appropriately trained professionals and according to manufacturer instructions.'] },
      { heading: 'Prices and payment', paragraphs: ['Prices are shown in Macedonian denars (MKD). The available payment method and any delivery charge are shown during checkout before you submit the order.'] },
      { heading: 'Order acceptance', paragraphs: ['Submitting checkout is an offer to buy. We may contact you to confirm details and may decline or cancel an order when stock, pricing, payment, delivery, or suspected misuse prevents fulfilment. If money has already been collected for a cancelled order, the applicable amount will be refunded.'] },
      { heading: 'Accounts', paragraphs: ['You are responsible for keeping account credentials secure and for activity performed through your account. Tell us promptly if you suspect unauthorised access.'] },
      { heading: 'Website use', paragraphs: ['Do not disrupt the service, attempt unauthorised access, scrape it in a way that harms availability, or misuse its content. Product and educational information does not replace professional or medical advice.'] },
      { heading: 'Changes and contact', paragraphs: ['We may update these terms when the service or applicable requirements change. The current version and update date will remain published on this page. Contact us if you have questions before ordering.'] },
    ],
  },
  returns: {
    title: 'Returns and Refunds',
    description: 'How to request a return, report a damaged or incorrect Tessa Hair Care order, and receive an eligible refund.',
    intro: 'Contact us before sending anything back so we can identify the order and provide the correct return instructions.',
    sections: [
      { heading: 'Change-of-mind returns', paragraphs: ['Contact us within 30 days of delivery. Eligible items must be unused, unopened, in their original packaging, and suitable for resale. For hygiene and safety reasons, opened cosmetics and hair-care products cannot normally be returned unless they are faulty or were supplied incorrectly.'] },
      { heading: 'Damaged, faulty, or incorrect items', paragraphs: ['Tell us as soon as possible and include the order number, a description of the problem, and clear photographs when relevant. We will explain the available replacement, return, or refund option after reviewing the report.'] },
      { heading: 'Return delivery', paragraphs: ['When a return is caused by our error or a confirmed fault, we will provide instructions for the return cost. For an accepted change-of-mind return, the customer may be responsible for return delivery.'] },
      { heading: 'Refunds', paragraphs: ['Approved refunds are processed after the returned item is received and inspected. Bank or payment-provider processing times may apply. Nothing on this page limits rights that cannot be excluded under applicable consumer law.'] },
    ],
  },
  delivery: {
    title: 'Delivery Information',
    description: 'Tessa Hair Care delivery coverage, charges, order confirmation, and what to do if a parcel is delayed or damaged.',
    intro: 'We deliver orders within North Macedonia. Delivery details and the final charge are shown during checkout.',
    sections: [
      { heading: 'Delivery charge', paragraphs: ['Delivery costs 150 MKD for orders below 3,000 MKD. Delivery is free when the order subtotal is 3,000 MKD or more.'] },
      { heading: 'Processing and timing', paragraphs: ['We begin processing after the order is accepted. Delivery timing depends on order volume, destination, stock confirmation, weekends, public holidays, and courier conditions. Contact us if you need an update on an existing order.'] },
      { heading: 'Address and contact details', paragraphs: ['Provide a complete delivery address and a reachable telephone number. If a parcel cannot be delivered because the supplied information is incomplete or incorrect, additional delivery arrangements or charges may apply.'] },
      { heading: 'On arrival', paragraphs: ['Inspect the parcel when possible. If it appears damaged, incorrect, or incomplete, keep the packaging and contact us promptly with the order number and photographs.'] },
    ],
  },
  contact: {
    title: 'Contact Tessa Hair Care',
    description: 'Contact Tessa Hair Care about products, orders, delivery, returns, or professional stylist accounts.',
    intro: 'Our team can help with product availability, an existing order, delivery, a return, or a professional account.',
    sections: [
      { heading: 'Before contacting us', paragraphs: ['For order questions, include your order number and the telephone number or email used at checkout. For damaged or incorrect goods, include clear photographs where relevant.'] },
      { heading: 'Product guidance', paragraphs: ['Tell us your hair type, main concern, and the product name. Technical colour, bleach, and developer guidance is intended for trained professionals.'] },
      { heading: 'Response and privacy', paragraphs: ['We use the information in your message only to respond, provide support, and keep an appropriate service record. Please do not send payment-card details by email.'] },
    ],
  },
};

const mk: Record<LegalPageKey, LegalDocument> = {
  privacy: {
    title: 'Политика за приватност',
    description: 'Како Tessa Hair Care ги собира, користи, чува и споделува личните податоци кога купувате или креирате сметка.',
    intro: 'Оваа политика објаснува како Tessa Hair Care постапува со личните податоци доставени преку tessa.mk.',
    sections: [
      { heading: 'Податоци што ги собираме', paragraphs: ['Ги собираме податоците за сметка, контакт, достава и нарачка што ги внесувате. Може да обработуваме и основни податоци за уредот, прелистувачот, сесијата и безбедноста потребни за работа и заштита на веб-страницата.'] },
      { heading: 'Како ги користиме податоците', paragraphs: ['Личните податоци ги користиме за креирање и заштита на сметки, обработка и достава на нарачки, корисничка поддршка, професионални сметки, спречување злоупотреба и исполнување законски и сметководствени обврски.'] },
      { heading: 'Даватели на услуги', paragraphs: ['Споделуваме само неопходни податоци со даватели што поддржуваат достава, плаќање, е-пошта, хостирање, аналитика и безбедност. Не продаваме лични податоци.'] },
      { heading: 'Чување и безбедност', paragraphs: ['Податоците ги чуваме само колку што е потребно за наведените цели или според закон. Применуваме разумни технички и организациски мерки, но ниту една онлајн услуга не може да гарантира апсолутна безбедност.'] },
      { heading: 'Ваши права и избори', paragraphs: ['Може да побарате пристап, исправка или бришење на подобни лични податоци, или да приговорите на одредена обработка. Контактирајте нè подолу; може да побараме потврда на идентитетот.'] },
    ],
  },
  terms: {
    title: 'Услови за користење',
    description: 'Услови за користење на tessa.mk, креирање сметка и нарачување од Tessa Hair Care.',
    intro: 'Овие услови важат за користењето на tessa.mk и за нарачките кај Tessa Hair Care. Со нарачување потврдувате дека внесените податоци се точни и дека можете да го склучите купувањето.',
    sections: [
      { heading: 'Производи и достапност', paragraphs: ['Се стремиме точно да ги прикажеме производите, цените, сликите и залихата. Можни се мали разлики во пакувањето, а производ може да стане недостапен пред потврда на нарачката. Производите означени за професионална употреба треба да ги користат соодветно обучени лица според упатството на производителот.'] },
      { heading: 'Цени и плаќање', paragraphs: ['Цените се во македонски денари (МКД). Достапниот начин на плаќање и трошокот за достава се прикажуваат пред да ја испратите нарачката.'] },
      { heading: 'Прифаќање на нарачката', paragraphs: ['Испраќањето на нарачката е понуда за купување. Може да ве контактираме за потврда и да одбиеме или откажеме нарачка поради залиха, цена, плаќање, достава или сомнеж за злоупотреба. Веќе наплатениот применлив износ ќе биде вратен.'] },
      { heading: 'Сметки', paragraphs: ['Одговорни сте за безбедноста на податоците за најава и за активностите преку вашата сметка. Известете нè веднаш ако се сомневате во неовластен пристап.'] },
      { heading: 'Користење на страницата', paragraphs: ['Не смеете да ја попречувате услугата, да се обидувате со неовластен пристап, штетно автоматско преземање или злоупотреба на содржината. Информациите за производи и едукација не се замена за професионален или медицински совет.'] },
      { heading: 'Измени и контакт', paragraphs: ['Може да ги ажурираме условите кога ќе се променат услугата или применливите барања. Тековната верзија и датумот на ажурирање ќе останат објавени тука. Контактирајте нè за прашања пред нарачување.'] },
    ],
  },
  returns: {
    title: 'Враќање и рефундација',
    description: 'Како да побарате враќање, да пријавите оштетена или погрешна нарачка и да добиете одобрена рефундација.',
    intro: 'Контактирајте нè пред да испратите производ назад за да ја идентификуваме нарачката и да дадеме точни инструкции.',
    sections: [
      { heading: 'Враќање поради промена на одлука', paragraphs: ['Контактирајте нè во рок од 30 дена од доставата. Подобните производи мора да бидат некористени, неотворени, во оригинално пакување и погодни за повторна продажба. Поради хигиена и безбедност, отворена козметика и производи за коса вообичаено не се враќаат, освен ако се неисправни или погрешно испорачани.'] },
      { heading: 'Оштетени, неисправни или погрешни производи', paragraphs: ['Известете нè што е можно побрзо со број на нарачка, опис и јасни фотографии кога е применливо. По проверката ќе ја објасниме достапната замена, враќање или рефундација.'] },
      { heading: 'Трошок за враќање', paragraphs: ['Кога враќањето е поради наша грешка или потврден дефект, ќе дадеме инструкции за трошокот. За прифатено враќање поради промена на одлука, трошокот може да биде на купувачот.'] },
      { heading: 'Рефундации', paragraphs: ['Одобрените рефундации се обработуваат откако производот ќе биде примен и проверен. Може да важат рокови на банката или давателот на плаќање. Оваа страница не ги ограничува правата што не можат да се исклучат според важечкиот закон.'] },
    ],
  },
  delivery: {
    title: 'Информации за достава',
    description: 'Подрачје и цена на достава, потврда на нарачка и постапка за задоцнета или оштетена пратка.',
    intro: 'Доставуваме нарачки во Северна Македонија. Деталите и конечниот трошок се прикажуваат при наплата.',
    sections: [
      { heading: 'Цена на достава', paragraphs: ['Доставата чини 150 МКД за нарачки под 3.000 МКД. Доставата е бесплатна кога меѓузбирот е 3.000 МКД или повеќе.'] },
      { heading: 'Обработка и рок', paragraphs: ['Обработката почнува по прифаќање на нарачката. Рокот зависи од обемот, дестинацијата, потврдата на залиха, викендите, празниците и условите на курирот. Контактирајте нè за статус на постоечка нарачка.'] },
      { heading: 'Адреса и контакт', paragraphs: ['Внесете целосна адреса и достапен телефонски број. Ако пратката не може да се достави поради нецелосни или неточни податоци, може да бидат потребни дополнителен договор или трошок.'] },
      { heading: 'При прием', paragraphs: ['Проверете ја пратката кога е можно. Ако е оштетена, погрешна или нецелосна, зачувајте го пакувањето и контактирајте нè веднаш со бројот на нарачка и фотографии.'] },
    ],
  },
  contact: {
    title: 'Контакт со Tessa Hair Care',
    description: 'Контактирајте ја Tessa Hair Care за производи, нарачки, достава, враќање или професионални сметки.',
    intro: 'Нашиот тим може да помогне за достапност на производ, постоечка нарачка, достава, враќање или професионална сметка.',
    sections: [
      { heading: 'Пред да нè контактирате', paragraphs: ['За прашање за нарачка, наведете го бројот и телефонот или е-поштата употребени при наплата. За оштетен или погрешен производ приложете јасни фотографии кога е применливо.'] },
      { heading: 'Совети за производи', paragraphs: ['Наведете го типот на коса, главната потреба и името на производот. Технички совети за боја, бланш и развивач се наменети за обучени професионалци.'] },
      { heading: 'Одговор и приватност', paragraphs: ['Податоците од пораката ги користиме само за одговор, поддршка и соодветна евиденција. Не испраќајте податоци од платежна картичка по е-пошта.'] },
    ],
  },
};

const shq: Record<LegalPageKey, LegalDocument> = {
  privacy: {
    title: 'Politika e privatësisë',
    description: 'Si Tessa Hair Care mbledh, përdor, ruan dhe ndan të dhënat personale kur blini ose krijoni një llogari.',
    intro: 'Kjo politikë shpjegon si Tessa Hair Care i trajton të dhënat personale të dërguara përmes tessa.mk.',
    sections: [
      { heading: 'Të dhënat që mbledhim', paragraphs: ['Mbledhim të dhënat e llogarisë, kontaktit, dërgesës dhe porosisë që jepni. Mund të përpunojmë edhe të dhëna bazë të pajisjes, shfletuesit, sesionit dhe sigurisë të nevojshme për funksionimin dhe mbrojtjen e faqes.'] },
      { heading: 'Si i përdorim të dhënat', paragraphs: ['Të dhënat personale i përdorim për krijimin dhe sigurimin e llogarive, përpunimin dhe dërgimin e porosive, mbështetjen e klientit, llogaritë profesionale, parandalimin e keqpërdorimit dhe detyrimet ligjore e kontabël.'] },
      { heading: 'Ofruesit e shërbimeve', paragraphs: ['Ndajmë vetëm të dhënat e nevojshme me ofruesit që mbështesin dërgesën, pagesat, emailin, hostimin, analitikën dhe sigurinë. Nuk i shesim të dhënat personale.'] },
      { heading: 'Ruajtja dhe siguria', paragraphs: ['Të dhënat ruhen vetëm për aq kohë sa nevojiten për qëllimet e mësipërme ose kërkohen me ligj. Përdorim masa të arsyeshme teknike dhe organizative, por asnjë shërbim online nuk garanton siguri absolute.'] },
      { heading: 'Zgjedhjet dhe të drejtat tuaja', paragraphs: ['Mund të kërkoni qasje, korrigjim ose fshirje të të dhënave të pranueshme, ose të kundërshtoni përpunime të caktuara. Na kontaktoni më poshtë; mund të na duhet të verifikojmë identitetin tuaj.'] },
    ],
  },
  terms: {
    title: 'Kushtet e shërbimit',
    description: 'Kushtet për shfletimin e tessa.mk, krijimin e llogarisë dhe porositjen nga Tessa Hair Care.',
    intro: 'Këto kushte vlejnë për përdorimin e tessa.mk dhe porositë te Tessa Hair Care. Duke porositur, konfirmoni se të dhënat janë të sakta dhe se mund ta lidhni blerjen.',
    sections: [
      { heading: 'Produktet dhe disponueshmëria', paragraphs: ['Synojmë t’i paraqesim saktë produktet, çmimet, imazhet dhe stokun. Mund të ketë ndryshime të vogla në paketim dhe një artikull mund të bëhet i padisponueshëm para konfirmimit. Produktet për përdorim profesional duhet të përdoren vetëm nga persona të trajnuar dhe sipas udhëzimeve të prodhuesit.'] },
      { heading: 'Çmimet dhe pagesa', paragraphs: ['Çmimet paraqiten në denarë maqedonas (MKD). Mënyra e disponueshme e pagesës dhe tarifa e dërgesës shfaqen para dërgimit të porosisë.'] },
      { heading: 'Pranimi i porosisë', paragraphs: ['Dërgimi i porosisë është ofertë për blerje. Mund t’ju kontaktojmë për konfirmim dhe mund ta refuzojmë ose anulojmë për shkak të stokut, çmimit, pagesës, dërgesës ose dyshimit për keqpërdorim. Shuma e arkëtuar për një porosi të anuluar do të rimbursohet.'] },
      { heading: 'Llogaritë', paragraphs: ['Jeni përgjegjës për ruajtjen e kredencialeve dhe aktivitetin në llogarinë tuaj. Na njoftoni menjëherë nëse dyshoni për qasje të paautorizuar.'] },
      { heading: 'Përdorimi i faqes', paragraphs: ['Mos e pengoni shërbimin, mos provoni qasje të paautorizuar, mbledhje automatike që dëmton disponueshmërinë ose keqpërdorim të përmbajtjes. Informacioni për produktet nuk zëvendëson këshillën profesionale ose mjekësore.'] },
      { heading: 'Ndryshimet dhe kontakti', paragraphs: ['Mund t’i përditësojmë kushtet kur ndryshon shërbimi ose kërkesat përkatëse. Versioni aktual dhe data do të publikohen këtu. Na kontaktoni për pyetje para porositjes.'] },
    ],
  },
  returns: {
    title: 'Kthimet dhe rimbursimet',
    description: 'Si të kërkoni kthim, të raportoni porosi të dëmtuar ose të gabuar dhe të merrni rimbursim të pranueshëm.',
    intro: 'Na kontaktoni para se të ktheni një produkt, që ta identifikojmë porosinë dhe t’ju japim udhëzimet e sakta.',
    sections: [
      { heading: 'Kthimi pas ndryshimit të mendimit', paragraphs: ['Na kontaktoni brenda 30 ditëve nga dërgesa. Produktet e pranueshme duhet të jenë të papërdorura, të pahapura, në paketimin origjinal dhe të përshtatshme për rishitje. Për arsye higjiene dhe sigurie, kozmetika e hapur zakonisht nuk kthehet, përveçse kur është me defekt ose është dërguar gabimisht.'] },
      { heading: 'Produkte të dëmtuara, me defekt ose të gabuara', paragraphs: ['Na njoftoni sa më shpejt me numrin e porosisë, përshkrimin dhe fotografi të qarta kur është e nevojshme. Pas shqyrtimit do t’ju shpjegojmë opsionin e zëvendësimit, kthimit ose rimbursimit.'] },
      { heading: 'Kostoja e kthimit', paragraphs: ['Kur kthimi bëhet për shkak të gabimit tonë ose një defekti të konfirmuar, do të japim udhëzime për koston. Për kthim të pranuar pas ndryshimit të mendimit, kostoja mund t’i takojë klientit.'] },
      { heading: 'Rimbursimet', paragraphs: ['Rimbursimet e miratuara përpunohen pasi produkti të pranohet dhe kontrollohet. Mund të vlejnë afatet e bankës ose ofruesit të pagesës. Kjo faqe nuk kufizon të drejtat që nuk mund të përjashtohen sipas ligjit në fuqi.'] },
    ],
  },
  delivery: {
    title: 'Informacioni i dërgesës',
    description: 'Mbulimi dhe tarifa e dërgesës, konfirmimi i porosisë dhe veprimi për pako të vonuar ose të dëmtuar.',
    intro: 'Dërgojmë porosi brenda Maqedonisë së Veriut. Detajet dhe tarifa përfundimtare shfaqen gjatë pagesës.',
    sections: [
      { heading: 'Tarifa e dërgesës', paragraphs: ['Dërgesa kushton 150 MKD për porosi nën 3.000 MKD. Është falas kur nëntotali i porosisë është 3.000 MKD ose më shumë.'] },
      { heading: 'Përpunimi dhe afati', paragraphs: ['Përpunimi fillon pasi porosia pranohet. Afati varet nga vëllimi, destinacioni, konfirmimi i stokut, fundjavat, festat dhe kushtet e korrierit. Na kontaktoni për një përditësim të porosisë ekzistuese.'] },
      { heading: 'Adresa dhe kontakti', paragraphs: ['Jepni adresë të plotë dhe numër telefoni të arritshëm. Nëse pakoja nuk dorëzohet për shkak të të dhënave të paplota ose të pasakta, mund të nevojitet marrëveshje ose tarifë shtesë.'] },
      { heading: 'Gjatë pranimit', paragraphs: ['Kontrollojeni pakon kur është e mundur. Nëse duket e dëmtuar, e gabuar ose e paplotë, ruajeni paketimin dhe na kontaktoni shpejt me numrin e porosisë dhe fotografi.'] },
    ],
  },
  contact: {
    title: 'Kontaktoni Tessa Hair Care',
    description: 'Kontaktoni Tessa Hair Care për produkte, porosi, dërgesa, kthime ose llogari profesionale.',
    intro: 'Ekipi ynë mund t’ju ndihmojë me disponueshmërinë, porosinë, dërgesën, kthimin ose një llogari profesionale.',
    sections: [
      { heading: 'Para se të na kontaktoni', paragraphs: ['Për pyetje rreth porosisë, përfshini numrin dhe telefonin ose emailin e përdorur gjatë pagesës. Për mallra të dëmtuara ose të gabuara, përfshini fotografi të qarta kur është e nevojshme.'] },
      { heading: 'Udhëzime për produktet', paragraphs: ['Na tregoni llojin e flokëve, shqetësimin kryesor dhe emrin e produktit. Udhëzimet teknike për ngjyrë, zbardhues dhe aktivizues janë për profesionistë të trajnuar.'] },
      { heading: 'Përgjigjja dhe privatësia', paragraphs: ['Të dhënat e mesazhit i përdorim vetëm për përgjigje, mbështetje dhe evidencë të përshtatshme. Mos dërgoni të dhëna të kartës së pagesës me email.'] },
    ],
  },
};

export const legalContent: Record<Locale, Record<LegalPageKey, LegalDocument>> = { en, mk, shq };

export function getLegalDocument(locale: string, page: LegalPageKey): LegalDocument {
  const supportedLocale: Locale = locale === 'en' || locale === 'shq' ? locale : 'mk';
  return legalContent[supportedLocale][page];
}
