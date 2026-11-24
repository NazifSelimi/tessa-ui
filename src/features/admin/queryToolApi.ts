/**
 * Admin query tool API (RTK Query — injected into baseApi).
 *
 * The server owns the allowlist: /query/schema says which fields, operators,
 * choices and presets exist; /query/run filters with a structured JSON query.
 */
import { baseApi, API_TAGS } from '@/api/baseApi';

export type FieldType = 'number' | 'date' | 'text' | 'bool' | 'ref' | 'enum' | 'count';
export type Operator =
  | 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'between' | 'empty' | 'not_empty'
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_true' | 'is_false' | 'in' | 'not_in';

export interface QueryField {
  name: string;
  label: string;
  type: FieldType;
  operators: Operator[];
  comparable?: boolean;
  options?: { value: number | string; label: string }[];
}
export interface QueryColumn { key: string; label: string; type: 'number' | 'text' | 'money' | 'bool' | 'date'; sort?: string }
export interface QueryCondition { field: string; op: Operator; value?: unknown }
export interface QueryGroup { logic: 'and' | 'or'; conditions: (QueryCondition | QueryGroup)[] }
export interface QueryPreset { key: string; label: string; filter: QueryGroup }
export interface QueryEntity {
  key: string;
  label: string;
  fields: QueryField[];
  columns: QueryColumn[];
  presets: QueryPreset[];
  default_sort: { field: string; dir: 'asc' | 'desc' };
}
export interface QuerySchema { entities: QueryEntity[] }
export interface QuerySort { field: string; dir: 'asc' | 'desc' }
export interface QueryRunArgs { entity: string; filter: QueryGroup; sort?: QuerySort; page?: number; per_page?: number }
export interface QueryRunResult {
  rows: Record<string, unknown>[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}
export interface SavedQuery {
  id: string;
  name: string;
  entity: string;
  filter: QueryGroup;
  sort?: QuerySort | null;
  updated_at?: string;
  updated_by?: string;
}

interface Envelope<T, M = undefined> { data: T; meta: M }

const SAVED_TAG = { type: API_TAGS.AdminQueries, id: 'SAVED' } as const;

export const queryToolApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getQuerySchema: builder.query<QuerySchema, void>({
      query: () => ({ url: '/v1/admin/query/schema' }),
      transformResponse: (response: Envelope<QuerySchema>) => response.data,
      providesTags: [API_TAGS.Brands, API_TAGS.Categories],
    }),
    runQuery: builder.query<QueryRunResult, QueryRunArgs>({
      query: (body) => ({ url: '/v1/admin/query/run', method: 'POST', body }),
      transformResponse: (response: Envelope<Record<string, unknown>[], QueryRunResult['meta']>) => ({ rows: response.data ?? [], meta: response.meta }),
      providesTags: [API_TAGS.Products, API_TAGS.Orders, API_TAGS.Users],
      keepUnusedDataFor: 30,
    }),
    getSavedQueries: builder.query<SavedQuery[], void>({
      query: () => ({ url: '/v1/admin/query/saved' }),
      transformResponse: (response: Envelope<SavedQuery[]>) => response.data ?? [],
      providesTags: [SAVED_TAG],
    }),
    saveQuery: builder.mutation<SavedQuery, Omit<SavedQuery, 'id' | 'updated_at' | 'updated_by'> & { id?: string }>({
      query: (body) => ({ url: '/v1/admin/query/saved', method: 'POST', body }),
      transformResponse: (response: Envelope<SavedQuery>) => response.data,
      invalidatesTags: [SAVED_TAG],
    }),
    deleteSavedQuery: builder.mutation<void, string>({
      query: (id) => ({ url: `/v1/admin/query/saved/${encodeURIComponent(id)}`, method: 'DELETE' }),
      invalidatesTags: [SAVED_TAG],
    }),
  }),
});

export const {
  useGetQuerySchemaQuery,
  useLazyRunQueryQuery,
  useGetSavedQueriesQuery,
  useSaveQueryMutation,
  useDeleteSavedQueryMutation,
} = queryToolApi;
