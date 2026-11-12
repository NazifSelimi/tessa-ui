/**
 * Centralized price formatter for Macedonian Denar (MKD).
 *
 * All monetary values across the app MUST use this function
 * to guarantee a consistent display format.
 *
 * Example output: "1.250 MKD". Denars are shown whole (no deni).
 */

/**
 * Whole number with dot thousands separators ("1.250"). Written by hand because
 * browsers without Macedonian locale data (e.g. Chrome) fell back to "1,250".
 */
export function formatAmount(amount: number | string | undefined | null): string {
  const value = Math.round(Number(amount ?? 0));
  if (!Number.isFinite(value)) return '0';
  const digits = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return value < 0 ? `-${digits}` : digits;
}

export function formatPrice(amount: number | string | undefined | null): string {
  return `${formatAmount(amount)} MKD`;
}
