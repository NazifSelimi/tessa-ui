/**
 * Free Viber / WhatsApp links: open a chat (optionally with a ready-made
 * message) in the app on this device. Nothing is sent automatically; the
 * person presses send in Viber or WhatsApp.
 */

/** Macedonian numbers to international digits: 078 286 332 / +389 78... / 00389 78... -> 38978286332. */
export function toInternationalPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `389${digits.slice(1)}`;
  else if (/^[2-7]\d{7}$/.test(digits)) digits = `389${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function whatsappUrl(phone: string, text?: string): string {
  return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** Viber fills in `draft` on phones; desktop Viber may open the chat without it. */
export function viberUrl(phone: string, text?: string): string {
  return `viber://chat?number=%2B${phone}${text ? `&draft=${encodeURIComponent(text)}` : ''}`;
}
