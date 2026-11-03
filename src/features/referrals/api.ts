import { baseApi, API_TAGS } from '@/api/baseApi';

export interface ReferralCode {
  id: string;
  code: string;
  discountPercentage: number;
  commissionPercentage: number;
  firstOrderOnly: boolean;
  isActive: boolean;
}

export interface StoreCreditTransaction {
  id: string;
  type: 'referral' | 'spent' | 'adjustment';
  amount: number;
  orderId: string | null;
  note: string | null;
  createdAt: string;
}

export interface ReferralSummary {
  code: ReferralCode;
  stats: { clients: number; orders: number; clientSales: number; earned: number; pending: number; balance: number };
  orders: Array<{ id: string; client: string; status: string; goodsTotal: number; commission: number; createdAt: string }>;
  transactions: StoreCreditTransaction[];
}

export interface ReferralSettings {
  discountPercentage: number;
  commissionPercentage: number;
  firstOrderOnly: boolean;
}

export interface AdminReferralCode extends ReferralCode {
  stylist: { id: string; name: string; email: string | null };
  orders: number;
  clientSales: number;
  earned: number;
  balance: number;
}

export const referralsApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getMyReferral: builder.query<ReferralSummary, void>({
      query: () => '/v1/stylist/referral',
      transformResponse: (response: any) => response.data,
      providesTags: [API_TAGS.Referrals],
    }),
    renameMyReferralCode: builder.mutation<ReferralSummary, string>({
      query: (code) => ({ url: '/v1/stylist/referral', method: 'PUT', body: { code } }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Referrals],
    }),
    getAdminReferrals: builder.query<{ settings: ReferralSettings; codes: AdminReferralCode[] }, void>({
      query: () => '/v1/admin/referrals',
      transformResponse: (response: any) => response.data,
      providesTags: [API_TAGS.Referrals],
    }),
    updateReferralSettings: builder.mutation<ReferralSettings, Partial<ReferralSettings>>({
      query: (body) => ({ url: '/v1/admin/referrals/settings', method: 'PUT', body }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Referrals],
    }),
    updateReferralCode: builder.mutation<ReferralCode, { id: string } & Partial<Omit<ReferralCode, 'id'>>>({
      query: ({ id, ...body }) => ({ url: `/v1/admin/referrals/${id}`, method: 'PUT', body }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Referrals],
    }),
    adjustStoreCredit: builder.mutation<{ balance: number }, { userId: string; amount: number; note: string }>({
      query: ({ userId, ...body }) => ({ url: `/v1/admin/users/${userId}/store-credit`, method: 'POST', body }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Referrals],
    }),
  }),
});

export const {
  useGetMyReferralQuery,
  useRenameMyReferralCodeMutation,
  useGetAdminReferralsQuery,
  useUpdateReferralSettingsMutation,
  useUpdateReferralCodeMutation,
  useAdjustStoreCreditMutation,
} = referralsApi;
