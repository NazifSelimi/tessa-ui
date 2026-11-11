/**
 * PDF documents (feature "pdf_documents"): order summary, delivery notes and
 * the price list. PDFs are downloaded with the admin's token, never opened by
 * a plain link.
 */

import { baseApi } from '@/api/baseApi';

export type DocumentLocale = 'mk' | 'sq' | 'en';
export type PriceListAudience = 'retail' | 'business';

export interface PriceListOptions {
  brands: { id: number; name: string }[];
  categories: { id: number; name: string }[];
}

export const documentsApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getPriceListOptions: builder.query<PriceListOptions, void>({
      query: () => ({ url: '/v1/admin/price-list/options' }),
      transformResponse: (response: { data: PriceListOptions }) => response.data,
    }),
  }),
});

export const { useGetPriceListOptionsQuery } = documentsApi;

export const DOCUMENT_LANGUAGES: { value: DocumentLocale; label: string }[] = [
  { value: 'mk', label: 'Македонски' },
  { value: 'sq', label: 'Shqip' },
  { value: 'en', label: 'English' },
];

/** Fetches a PDF and saves it. Throws with a readable message when it fails. */
export async function downloadPdf(token: string | null, path: string, body?: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Accept: 'application/pdf, application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = 'The PDF could not be made.';
    if (response.status === 404) message = 'Nothing was found for this PDF.';
    if (response.status === 403) message = 'PDF documents are not part of your plan or are switched off.';
    try {
      const json = await response.json();
      if (typeof json?.message === 'string' && json.message) message = json.message;
    } catch { /* not JSON: keep the default message */ }
    throw new Error(message);
  }

  const name = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'document.pdf';
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** "41, 42 45" -> [41, 42, 45] */
export function parseOrderNumbers(text: string): number[] {
  return [...new Set((text.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0))];
}
