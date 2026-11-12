/** /admin/messages API: templates, send-to-a-list list, optional automatic WhatsApp (Premium). */

import { baseApi } from '@/api/baseApi';
import type { MessageTemplateDef } from './templates';
import type { Recipient } from './campaign';

export interface TemplateSettings {
  templates: MessageTemplateDef[];
  shop: string;
  link: string;
}

export type AudienceSegment = 'all' | 'customers' | 'business' | 'recent_buyers' | 'inactive_buyers' | 'numbers';

export interface StatusTemplate {
  name: string;
  language: string;
  params: number;
}

export interface WhatsAppSettings {
  enabled: boolean;
  connected: boolean;
  phoneNumberId: string;
  businessAccountId: string;
  apiVersion: string;
  hasToken: boolean;
  testNumber: string;
  statusTemplates: Record<string, StatusTemplate>;
  statuses: { key: string; label: string }[];
  isProduction: boolean;
  recent: { order: number; status: string; ok: boolean; to: string | null; error: string | null; at: string }[];
}

export interface WhatsAppSettingsInput extends Partial<Omit<WhatsAppSettings, 'connected' | 'hasToken' | 'statuses' | 'isProduction' | 'recent'>> {
  accessToken?: string;
  clearToken?: boolean;
}

const api = baseApi.enhanceEndpoints({ addTagTypes: ['MessagingTemplates', 'WhatsAppSettings'] }).injectEndpoints({
  endpoints: (builder) => ({
    getMessageTemplates: builder.query<TemplateSettings, void>({
      query: () => '/v1/admin/messaging/templates',
      transformResponse: (response: { data: TemplateSettings }) => response.data,
      providesTags: ['MessagingTemplates'],
    }),
    saveMessageTemplates: builder.mutation<TemplateSettings, Partial<TemplateSettings>>({
      query: (body) => ({ url: '/v1/admin/messaging/templates', method: 'PUT', body }),
      transformResponse: (response: { data: TemplateSettings }) => response.data,
      invalidatesTags: ['MessagingTemplates'],
    }),
    getAudience: builder.mutation<Recipient[], { segment: AudienceSegment; days?: number; numbers?: string }>({
      query: (body) => ({ url: '/v1/admin/messaging/audience', method: 'POST', body }),
      transformResponse: (response: { data: Recipient[] }) => response.data,
    }),
    getWhatsAppSettings: builder.query<WhatsAppSettings, void>({
      query: () => '/v1/admin/messaging/whatsapp',
      transformResponse: (response: { data: WhatsAppSettings }) => response.data,
      providesTags: ['WhatsAppSettings'],
    }),
    saveWhatsAppSettings: builder.mutation<WhatsAppSettings, WhatsAppSettingsInput>({
      query: (body) => ({ url: '/v1/admin/messaging/whatsapp', method: 'PUT', body }),
      transformResponse: (response: { data: WhatsAppSettings }) => response.data,
      invalidatesTags: ['WhatsAppSettings'],
    }),
    sendWhatsAppTest: builder.mutation<{ ok: boolean; id: string | null }, { to: string; template?: string; language?: string }>({
      query: (body) => ({ url: '/v1/admin/messaging/whatsapp/test', method: 'POST', body }),
      transformResponse: (response: { data: { ok: boolean; id: string | null } }) => response.data,
    }),
  }),
});

export const {
  useGetMessageTemplatesQuery,
  useSaveMessageTemplatesMutation,
  useGetAudienceMutation,
  useGetWhatsAppSettingsQuery,
  useSaveWhatsAppSettingsMutation,
  useSendWhatsAppTestMutation,
} = api;

/** Error text from the API, or a fallback. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const data = (error as { data?: { message?: string } } | undefined)?.data;
  return data?.message || fallback;
}

/** The automatic WhatsApp settings answer "feature off" when the plan has no Premium. */
export function isFeatureOff(error: unknown): boolean {
  const e = error as { status?: number; data?: { errors?: { code?: string } } } | undefined;
  return e?.status === 404 && e.data?.errors?.code === 'feature_off';
}
