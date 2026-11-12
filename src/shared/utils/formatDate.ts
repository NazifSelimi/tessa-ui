const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Short date used across the shop, e.g. "3 Nov 2026". Returns '' for empty or invalid input. */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Date with time, e.g. "3 Nov 2026, 14:05". */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const day = formatDate(value);
  if (!day) return '';
  const date = value instanceof Date ? value : new Date(value as string | number);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
