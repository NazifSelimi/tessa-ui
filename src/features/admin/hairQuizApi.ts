/**
 * Admin Hair quiz API (RTK Query — injected into baseApi).
 *
 * Backs /admin/hair-quiz: which products the quiz may recommend (quiz mode),
 * their hair-type/concern tags, and a preview of the real quiz ranking.
 */

import { baseApi, API_TAGS } from '@/api/baseApi';

export type QuizMode = 'auto' | 'featured' | 'hidden';

export interface HairQuizProduct {
  id: number;
  name: string;
  brand: string | null;
  category: string | null;
  quantity: number;
  quizMode: QuizMode;
  hairTypeIds: number[];
  hairConcernIds: number[];
  image: string | null;
  score?: number;
}

export interface HairQuizProductsParams {
  search?: string;
  mode?: QuizMode;
  tagged?: 'yes' | 'no';
  stock?: 'in' | 'out';
  page?: number;
  per_page?: number;
}

interface HairQuizProductsResponse {
  data: HairQuizProduct[];
  meta: { currentPage: number; lastPage: number; perPage: number; total: number };
}

const QUIZ_TAG = { type: API_TAGS.Products, id: 'HAIR_QUIZ' } as const;

export const hairQuizApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getHairQuizProducts: builder.query<HairQuizProductsResponse, HairQuizProductsParams>({
      query: (params) => ({ url: '/v1/admin/hair-quiz/products', params }),
      transformResponse: (response: any) => ({ data: response.data ?? [], meta: response.meta }),
      providesTags: [QUIZ_TAG],
    }),

    updateHairQuizProduct: builder.mutation<HairQuizProduct, { id: number; quiz_mode?: QuizMode; hair_type_ids?: number[]; hair_concern_ids?: number[] }>({
      query: ({ id, ...body }) => ({ url: `/v1/admin/hair-quiz/products/${id}`, method: 'PUT', body }),
      transformResponse: (response: any) => response.data,
      // Quiz results and storefront product data (hair tags) both change.
      invalidatesTags: [QUIZ_TAG, { type: API_TAGS.Products, id: 'LIST' }, API_TAGS.Product],
    }),

    previewHairQuiz: builder.mutation<HairQuizProduct[], { hair_type_id: number; concerns: number[] }>({
      query: (body) => ({ url: '/v1/admin/hair-quiz/preview', method: 'POST', body }),
      transformResponse: (response: any) => response.data ?? [],
    }),
  }),
});

export const { useGetHairQuizProductsQuery, useUpdateHairQuizProductMutation, usePreviewHairQuizMutation } = hairQuizApi;
