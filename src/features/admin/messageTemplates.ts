/**
 * Ready-made Viber / WhatsApp messages the admin sends to stylists and
 * customers with one click (Macedonian and Albanian).
 */

export type MessageLanguage = 'mk' | 'sq';

export type MessageTemplate =
  | { kind: 'stylistApproved'; name?: string }
  | { kind: 'stylistRejected'; name?: string; reason?: string | null }
  | { kind: 'orderReceived' | 'orderConfirmed' | 'orderShipped' | 'orderCancelled'; name?: string; orderId: string }
  | { kind: 'customerCheckIn'; name?: string };

const firstName = (name?: string) => (name ?? '').trim().split(/\s+/)[0] || '';

export function messageText(template: MessageTemplate, language: MessageLanguage): string {
  const name = firstName(template.name);
  const hello = language === 'mk' ? `Здраво${name ? ` ${name}` : ''}` : `Përshëndetje${name ? ` ${name}` : ''}`;

  if (language === 'mk') {
    switch (template.kind) {
      case 'stylistApproved':
        return `${hello}! Вашето барање за стилист на Tessa е одобрено. Сега можете да се најавите на tessa.mk и да ги гледате професионалните цени. Ви благодариме, Tessa`;
      case 'stylistRejected':
        return `${hello}, ви благодариме за барањето за стилист на Tessa. За жал, моментално не можеме да го одобриме${template.reason ? `: ${template.reason}` : '.'} За прашања, слободно пишете ни тука. Tessa`;
      case 'orderReceived':
        return `${hello}! Ја примивме вашата нарачка #${template.orderId} на Tessa и наскоро ќе ја потврдиме. Tessa`;
      case 'orderConfirmed':
        return `${hello}! Вашата нарачка #${template.orderId} е потврдена и се подготвува за испорака. Tessa`;
      case 'orderShipped':
        return `${hello}! Вашата нарачка #${template.orderId} е испратена и наскоро ќе пристигне. Плаќањето е при достава. Tessa`;
      case 'orderCancelled':
        return `${hello}, вашата нарачка #${template.orderId} е откажана. Ако ова е грешка или имате прашања, пишете ни тука. Tessa`;
      case 'customerCheckIn':
        return `${hello}! Ви пишуваме од Tessa. Имаме нови производи и понуди, а ако ви треба нешто или совет за коса, слободно пишете ни тука. Tessa`;
    }
  }

  switch (template.kind) {
    case 'stylistApproved':
      return `${hello}! Kërkesa juaj për stilist në Tessa u miratua. Tani mund të hyni në tessa.mk dhe të shihni çmimet profesionale. Faleminderit, Tessa`;
    case 'stylistRejected':
      return `${hello}, faleminderit për kërkesën për stilist në Tessa. Për fat të keq, aktualisht nuk mund ta miratojmë${template.reason ? `: ${template.reason}` : '.'} Për pyetje, na shkruani këtu. Tessa`;
    case 'orderReceived':
      return `${hello}! E morëm porosinë tuaj #${template.orderId} në Tessa dhe së shpejti do ta konfirmojmë. Tessa`;
    case 'orderConfirmed':
      return `${hello}! Porosia juaj #${template.orderId} u konfirmua dhe po përgatitet për dërgim. Tessa`;
    case 'orderShipped':
      return `${hello}! Porosia juaj #${template.orderId} u dërgua dhe do të arrijë së shpejti. Pagesa bëhet në dorëzim. Tessa`;
    case 'orderCancelled':
      return `${hello}, porosia juaj #${template.orderId} u anulua. Nëse është gabim ose keni pyetje, na shkruani këtu. Tessa`;
    case 'customerCheckIn':
      return `${hello}! Ju shkruajmë nga Tessa. Kemi produkte dhe oferta të reja, dhe nëse ju duhet diçka ose këshillë për flokët, na shkruani këtu. Tessa`;
  }
}
