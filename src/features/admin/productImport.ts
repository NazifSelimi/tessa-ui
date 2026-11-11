/**
 * Excel / CSV import and export of products (feature "excel_import").
 * Upload -> preview (nothing saved) -> apply -> optional undo.
 */

export type ImportAction = 'update' | 'create' | 'new' | 'same' | 'skip';

export interface ImportLine {
  line: number;
  action: ImportAction;
  productId: number | null;
  name: string | null;
  code: string | null;
  matchedBy: 'id' | 'code' | 'name' | null;
  changes: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }>;
  problems: string[];
}

export interface ImportPreview {
  token: string;
  filename?: string;
  headerRow: number;
  headings: string[];
  mapping: Record<string, number>;
  fields: Record<string, string>;
  errors: string[];
  summary: { rows: number; update: number; create: number; new: number; same: number; problems: number; ignored: number };
  lines: ImportLine[];
  linesHidden: number;
}

export interface ImportOptions {
  mapping?: Record<string, number | null>;
  create_new?: boolean;
  update_details?: boolean;
}

export interface ImportResult { updated: number; created: number; skipped: number; notCreated: number }
export interface UndoResult { restored: number; removed: number; kept: number }

const base = () => `${import.meta.env.VITE_API_URL}/v1/admin/product-import`;

async function call<T>(token: string | null, path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${base()}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
  let json: { data?: T; message?: string; errors?: Record<string, string[]> } = {};
  try { json = await response.json(); } catch { /* not JSON */ }
  if (!response.ok) {
    const first = json.errors ? Object.values(json.errors)[0]?.[0] : undefined;
    throw new Error(first || json.message || (response.status === 403 ? 'Excel import is not part of your plan or is switched off.' : 'Something went wrong. Please try again.'));
  }
  return json.data as T;
}

const jsonInit = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export function uploadImport(token: string | null, file: File) {
  const form = new FormData();
  form.append('file', file);
  return call<ImportPreview>(token, '', { method: 'POST', body: form });
}

export const previewImport = (token: string | null, importToken: string, options: ImportOptions) => call<ImportPreview>(token, `/${importToken}/preview`, jsonInit(options));
export const applyImport = (token: string | null, importToken: string, options: ImportOptions) => call<ImportResult>(token, `/${importToken}/apply`, jsonInit(options));
export const undoImport = (token: string | null, importToken: string) => call<UndoResult>(token, `/${importToken}/undo`, jsonInit({}));

export async function downloadCatalogue(token: string | null) {
  const response = await fetch(`${base()}/export`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error('The Excel file could not be made.');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `products-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export const FIELD_LABELS: Record<string, string> = {
  name: 'Name', manufacturer_code: 'Article code', brand_id: 'Brand', category_id: 'Category', price: 'Retail price',
  stylist_price: 'Business price', cost_price: 'Cost price', quantity: 'Stock',
  visible_to_guests: 'Guests see it', visible_to_customers: 'Customers see it', visible_to_stylists: 'Business accounts see it',
};

export function showValue(value: string | number | boolean | null): string {
  if (value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}
