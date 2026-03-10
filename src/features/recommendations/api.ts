/**
 * Recommendations API Service (RTK Query — injected into baseApi)
 *
 * Handles:
 * - POST /v1/recommendations — get personalized product & bundle recommendations
 *
 * Laravel response envelope: { success, data, message }
 */

import { baseApi } from '@/api/baseApi';
import type { RecommendationPayload, RecommendationResult } from '@/types';

export const recommendationsApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getRecommendations: builder.mutation<RecommendationResult, RecommendationPayload>({
      query: (body) => ({
        url: '/v1/recommendations',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { success: true; data: RecommendationResult }) =>
        response.data,
    }),
  }),
});

export const { useGetRecommendationsMutation } = recommendationsApi;
