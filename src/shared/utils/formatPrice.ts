/**
 * Centralized price formatter for Macedonian Denar (MKD).
 *
 * All monetary values across the app MUST use this function
 * to guarantee a consistent display format.
 *
 * Example output: "1.250 MKD". Denars are shown whole (no deni).
 */

const formatter = new Intl.NumberFormat('mk-MK', { maximumFractionDigits: 0 });

export function formatPrice(amount: number | string | undefined | null): string {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return '0 MKD';
  return formatter.format(value) + ' MKD';
}
