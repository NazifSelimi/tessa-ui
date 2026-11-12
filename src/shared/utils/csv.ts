/**
 * One CSV cell for Excel / Google Sheets. Quotes when needed and stops text such as
 * "=HYPERLINK(...)" typed into a customer name from running as a formula
 * (same rule as the API's CustomerCsv::cell). Plain phone numbers like "+389 70 123 456" stay as they are.
 */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  const first = text.charAt(0);
  if (['=', '@', '\t', '\r'].includes(first) || (['+', '-'].includes(first) && !/^[+-][\d\s().]*$/.test(text))) {
    text = `'${text}`;
  }
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows → CSV text with Windows line endings (what Excel expects). */
export function toCsvText(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
