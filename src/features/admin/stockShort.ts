/**
 * The API refuses to undo a cancel or restore an order from the Trash when there
 * is not enough stock (422, errors.stock: one line per product, e.g. "Only 2 left
 * of X, need 3."). The admin can then "Proceed anyway" by sending force: true.
 */
export function stockShortLines(error: unknown): string[] | null {
  const lines = (error as { data?: { errors?: { stock?: unknown } } } | null)?.data?.errors?.stock;
  return Array.isArray(lines) && lines.length > 0 ? lines.map(String) : null;
}
