/**
 * Admin platform API: feature switches, business profile, email centre
 * (settings, outbox, compose, automatic emails), order Trash and AI
 * assistant tokens. Injected into baseApi.
 */
import { baseApi, API_TAGS } from '@/api/baseApi';
import { refreshFeatures as refreshFeaturesNow } from '@/shared/hooks/useFeature';

/* ------------------------------------------------------------------ features */

export type FeatureKey =
  | 'messaging' | 'sales_reports' | 'hair_quiz' | 'referrals' | 'bundles' | 'quick_order' | 'admin_emails' | 'mcp' | 'whatsapp_auto' | 'order_delete'
  | 'post_studio' | 'content_blocks' | 'image_review' | 'stylist_invitations' | 'distributors' | 'supplier_list';

export type PlanKey = 'basic' | 'pro' | 'premium';

export interface AdminFeature {
  key: FeatureKey;
  label: string;
  description: string;
  area: 'shop' | 'admin';
  /** The switch. */
  enabled: boolean;
  default: boolean;
  /** Lowest plan that includes it. */
  plan: PlanKey;
  defaultPlan: PlanKey;
  /** In the shop's current plan. */
  included: boolean;
}

export interface AdminFeatures { plan: PlanKey; plans: PlanKey[]; features: AdminFeature[] }

/* ------------------------------------------------------------------ business */

export interface BusinessProfile {
  name: string;
  legal_name: string;
  tagline: string;
  email: string;
  phone: string;
  phone_2: string;
  address: string;
  city: string;
  country: string;
  website: string;
  instagram: string;
  facebook: string;
  logo_url: string;
  brand_color: string;
  default_locale: 'mk' | 'sq' | 'en';
}

/* ------------------------------------------------------------------ emails */

export interface MailPreset { key: string; label: string; host: string; port: number; encryption: 'tls' | 'ssl'; help: string }

export interface EmailSettings {
  mode: 'env' | 'resend' | 'smtp' | 'off';
  hasResendKey: boolean;
  resendKeyFromServer: boolean;
  dailyLimit: number;
  host: string;
  port: number;
  encryption: 'tls' | 'ssl' | 'none';
  username: string;
  hasPassword: boolean;
  fromAddress: string;
  fromName: string;
  replyTo: string;
  adminRecipients: string;
  testRecipient: string;
  isProduction: boolean;
  effective: string;
  autoEmails: { key: string; label: string; enabled: boolean }[];
  presets: MailPreset[];
}

export type EmailSettingsUpdate = Partial<Omit<EmailSettings, 'hasPassword' | 'isProduction' | 'effective' | 'autoEmails' | 'presets'>> & {
  password?: string;
  clearPassword?: boolean;
  resendKey?: string;
  dailyLimit?: number;
  autoEmails?: Record<string, boolean>;
};

export type EmailStatus = 'queued' | 'retrying' | 'sent' | 'failed';

export interface EmailLogRow {
  id: string;
  type: string;
  to: string;
  toName: string | null;
  subject: string | null;
  status: EmailStatus;
  delivery: 'smtp' | 'log' | 'redirected' | null;
  redirectedTo: string | null;
  error: string | null;
  attempts: number;
  orderId: string | null;
  userId: string | null;
  campaignId: string | null;
  campaign: string | null;
  canRetry: boolean;
  sentAt: string | null;
  createdAt: string | null;
  html?: string | null;
}

export interface EmailOverview {
  counts: Record<EmailStatus, number>;
  notSent: number;
  legacyFailed: number;
  delivery: 'smtp' | 'log' | 'redirected';
  deliveryNote: string;
  sentLast7Days: number;
  optedOut: number;
  sentToday: number;
  sentThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number | null;
}

export interface DeliverabilityResult {
  domain: string;
  from: string;
  checks: { key: string; label: string; status: 'ok' | 'warn' | 'bad'; found: string | null; fix: string | null }[];
}

export type EmailSegment = 'customers' | 'business' | 'all' | 'recent_buyers' | 'inactive_buyers' | 'users' | 'emails';

export interface ComposePayload {
  segment: EmailSegment;
  days?: number;
  user_ids?: number[];
  emails?: string;
  subject: string;
  heading?: string;
  body: string;
  button_text?: string;
  button_url?: string;
  product_ids?: number[];
}

export interface EmailCampaign {
  id: string;
  subject: string;
  audience: string;
  recipients: number;
  sent: number;
  failed: number;
  pending: number;
  createdBy: string | null;
  createdAt: string | null;
}

export interface AiToken { id: string; name: string; lastUsedAt: string | null; createdAt: string | null }

const LOGS_TAG = { type: API_TAGS.Emails, id: 'LOGS' } as const;

export const platformApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getAdminFeatures: builder.query<AdminFeatures, void>({
      query: () => '/v1/admin/features',
      transformResponse: (response: any) => response.data,
      providesTags: [API_TAGS.Features],
    }),
    updateFeatures: builder.mutation<AdminFeatures, { features?: Partial<Record<FeatureKey, boolean>>; plans?: Partial<Record<FeatureKey, PlanKey>>; shop_plan?: PlanKey }>({
      query: (body) => ({ url: '/v1/admin/features', method: 'PUT', body }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Features, API_TAGS.Bundles],
      // The shop and admin menu read the switches through useFeature; refresh it.
      async onQueryStarted(_arg, { queryFulfilled }) {
        try { await queryFulfilled; await refreshFeaturesNow(); } catch { /* shown by the page */ }
      },
    }),

    getBusiness: builder.query<BusinessProfile, void>({
      query: () => '/v1/admin/business',
      transformResponse: (response: any) => response.data,
      providesTags: [API_TAGS.Business],
    }),
    updateBusiness: builder.mutation<BusinessProfile, Partial<BusinessProfile>>({
      query: (body) => ({ url: '/v1/admin/business', method: 'PUT', body }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Business],
    }),
    uploadBusinessLogo: builder.mutation<BusinessProfile, FormData>({
      query: (body) => ({ url: '/v1/admin/business/logo', method: 'POST', body }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.Business],
    }),

    getEmailSettings: builder.query<EmailSettings, void>({
      query: () => '/v1/admin/email-settings',
      transformResponse: (response: any) => response.data,
      providesTags: [API_TAGS.EmailSettings],
    }),
    updateEmailSettings: builder.mutation<EmailSettings, EmailSettingsUpdate>({
      query: (body) => ({ url: '/v1/admin/email-settings', method: 'PUT', body }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.EmailSettings, API_TAGS.Emails],
    }),
    sendTestEmail: builder.mutation<{ sent: boolean; delivery: string; note: string; message?: string }, { to: string }>({
      query: (body) => ({ url: '/v1/admin/email-settings/test', method: 'POST', body }),
      transformResponse: (response: any) => ({ ...response.data, message: response.message }),
      invalidatesTags: [LOGS_TAG, API_TAGS.Emails],
    }),
    getEmailTemplates: builder.query<{ key: string; label: string; enabled: boolean; switchable: boolean }[], void>({
      query: () => '/v1/admin/email-templates',
      transformResponse: (response: any) => response.data ?? [],
      providesTags: [API_TAGS.EmailSettings],
    }),
    getEmailTemplatePreview: builder.query<{ subject: string; html: string }, { key: string; locale: string }>({
      query: ({ key, locale }) => ({ url: `/v1/admin/email-templates/${key}/preview`, params: { locale } }),
      transformResponse: (response: any) => response.data,
    }),

    getEmailOverview: builder.query<EmailOverview, void>({
      query: () => '/v1/admin/emails/overview',
      transformResponse: (response: any) => response.data,
      providesTags: [API_TAGS.Emails],
    }),
    getEmailLogs: builder.query<{ data: EmailLogRow[]; meta: { current_page: number; last_page: number; total: number; per_page: number } }, { status?: string; search?: string; campaign_id?: string; page?: number }>({
      query: (params) => ({ url: '/v1/admin/emails/logs', params }),
      transformResponse: (response: any) => ({ data: response.data ?? [], meta: response.meta }),
      providesTags: [LOGS_TAG],
    }),
    getEmailLog: builder.query<EmailLogRow, string>({
      query: (id) => `/v1/admin/emails/logs/${id}`,
      transformResponse: (response: any) => response.data,
    }),
    retryEmail: builder.mutation<EmailLogRow, string>({
      query: (id) => ({ url: `/v1/admin/emails/logs/${id}/retry`, method: 'POST' }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [LOGS_TAG, API_TAGS.Emails, API_TAGS.Dashboard],
    }),
    deleteEmailLog: builder.mutation<void, string>({
      query: (id) => ({ url: `/v1/admin/emails/logs/${id}`, method: 'DELETE' }),
      invalidatesTags: [LOGS_TAG, API_TAGS.Emails, API_TAGS.Dashboard],
    }),
    retryAllFailedEmails: builder.mutation<{ queued: number }, void>({
      query: () => ({ url: '/v1/admin/emails/retry-failed', method: 'POST' }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [LOGS_TAG, API_TAGS.Emails, API_TAGS.Dashboard],
    }),
    importLegacyEmails: builder.mutation<{ imported: number; skipped: { id: string; reason: string }[] }, void>({
      query: () => ({ url: '/v1/admin/emails/import-legacy', method: 'POST' }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [LOGS_TAG, API_TAGS.Emails, API_TAGS.Dashboard],
    }),
    getDeliverability: builder.query<DeliverabilityResult, string | void>({
      query: (from) => ({ url: '/v1/admin/email-settings/deliverability', params: from ? { from } : {} }),
      transformResponse: (response: any) => response.data,
    }),
    getEmailAudience: builder.mutation<{ count: number; label: string; sample: string[]; limit: number; dailyLimit: number; leftToday: number }, Pick<ComposePayload, 'segment' | 'days' | 'user_ids' | 'emails'>>({
      query: (body) => ({ url: '/v1/admin/emails/audience', method: 'POST', body }),
      transformResponse: (response: any) => response.data,
    }),
    previewEmail: builder.mutation<{ html: string; sampleRecipient: string | null }, Partial<ComposePayload> & { segment: EmailSegment }>({
      query: (body) => ({ url: '/v1/admin/emails/preview', method: 'POST', body }),
      transformResponse: (response: any) => response.data,
    }),
    sendEmail: builder.mutation<{ campaignId: string; recipients: number; spreadDays: number; delivery: string; note: string }, ComposePayload>({
      query: (body) => ({ url: '/v1/admin/emails/send', method: 'POST', body }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [LOGS_TAG, API_TAGS.Emails],
    }),
    getEmailCampaigns: builder.query<EmailCampaign[], void>({
      query: () => '/v1/admin/emails/campaigns',
      transformResponse: (response: any) => response.data ?? [],
      providesTags: [API_TAGS.Emails],
    }),

    trashOrder: builder.mutation<void, string>({
      query: (id) => ({ url: `/v1/admin/orders/${id}`, method: 'DELETE' }),
      invalidatesTags: [API_TAGS.Orders, API_TAGS.Dashboard, API_TAGS.Referrals],
    }),
    restoreOrder: builder.mutation<void, string>({
      query: (id) => ({ url: `/v1/admin/orders/${id}/restore`, method: 'POST' }),
      invalidatesTags: [API_TAGS.Orders, API_TAGS.Dashboard, API_TAGS.Referrals],
    }),
    forceDeleteOrder: builder.mutation<void, string>({
      query: (id) => ({ url: `/v1/admin/orders/${id}/force`, method: 'DELETE' }),
      invalidatesTags: [API_TAGS.Orders, API_TAGS.Dashboard],
    }),

    getAiTokens: builder.query<{ endpoint: string; tokens: AiToken[] }, void>({
      query: () => '/v1/admin/ai-tokens',
      transformResponse: (response: any) => response.data,
      providesTags: [API_TAGS.AiTokens],
    }),
    createAiToken: builder.mutation<{ id: string; token: string; endpoint: string; expiresAt: string | null }, { name: string }>({
      query: (body) => ({ url: '/v1/admin/ai-tokens', method: 'POST', body }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: [API_TAGS.AiTokens],
    }),
    revokeAiToken: builder.mutation<void, string>({
      query: (id) => ({ url: `/v1/admin/ai-tokens/${id}`, method: 'DELETE' }),
      invalidatesTags: [API_TAGS.AiTokens],
    }),
  }),
});

export const {
  useGetAdminFeaturesQuery, useUpdateFeaturesMutation,
  useGetBusinessQuery, useUpdateBusinessMutation, useUploadBusinessLogoMutation,
  useGetEmailSettingsQuery, useUpdateEmailSettingsMutation, useSendTestEmailMutation, useLazyGetDeliverabilityQuery,
  useGetEmailTemplatesQuery, useGetEmailTemplatePreviewQuery,
  useGetEmailOverviewQuery, useGetEmailLogsQuery, useGetEmailLogQuery, useRetryEmailMutation, useDeleteEmailLogMutation,
  useRetryAllFailedEmailsMutation, useImportLegacyEmailsMutation, useGetEmailAudienceMutation, usePreviewEmailMutation,
  useSendEmailMutation, useGetEmailCampaignsQuery,
  useTrashOrderMutation, useRestoreOrderMutation, useForceDeleteOrderMutation,
  useGetAiTokensQuery, useCreateAiTokenMutation, useRevokeAiTokenMutation,
} = platformApi;

/** Admin pages that belong to a switchable feature (hidden when it is off). */
export const ADMIN_PATH_FEATURE: Record<string, FeatureKey> = {
  '/admin/stylist-invitations': 'stylist_invitations',
  '/admin/referrals': 'referrals',
  '/admin/bundles': 'bundles',
  '/admin/studio': 'post_studio',
  '/admin/messages': 'messaging',
  '/admin/reports': 'sales_reports',
  '/admin/content-blocks': 'content_blocks',
  '/admin/catalog-images': 'image_review',
  '/admin/catalogue-review': 'supplier_list',
  '/admin/hair-quiz': 'hair_quiz',
  '/admin/distributors': 'distributors',
};

export { useFeature, useFeatureStates, refreshFeatures } from '@/shared/hooks/useFeature';
