/**
 * Admin Sales Reports API (RTK Query — injected into baseApi).
 *
 * Backs /admin/reports: one period (with the period before it to compare),
 * best sellers, customers, codes and stock that is not selling.
 */

import { baseApi, API_TAGS } from '@/api/baseApi';
import { toCsvText } from '@/shared/utils/csv';

export type ReportPreset = 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';
export type CostSource = 'real' | 'estimated' | 'unknown';

export interface ReportParams {
  period: ReportPreset;
  from?: string;
  to?: string;
}

export interface ReportPeriodInfo {
  preset: ReportPreset;
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  days: number;
  bucket: 'day' | 'week' | 'month';
}

export interface ReportSummary {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  itemsSold: number;
  productSales: number;
  shipping: number;
  discounts: number;
  referralCredit: number;
  storeCreditUsed: number;
  cost: number;
  profit: number;
  marginPercentage: number | null;
  costCoveragePercentage: number | null;
  profitEstimated: boolean;
  customers: number;
  newCustomers: number;
  returningCustomers: number;
  unidentifiedOrders: number;
  businessOrders: number;
  businessOrderShare: number | null;
  businessRevenue: number;
  businessRevenueShare: number | null;
  cancelledOrders: number;
  cancelledValue: number;
}

export interface ReportProductRow {
  productId: number | null;
  name: string;
  brand: string | null;
  category: string | null;
  qty: number;
  revenue: number;
  cost: number | null;
  profit: number | null;
  marginPercentage: number | null;
  costSource: CostSource;
  stock: number | null;
}

export interface ReportGroupRow { name: string; qty: number; revenue: number; profit: number }

export interface ReportCustomerRow {
  key: string;
  name: string | null;
  email: string | null;
  isBusiness: boolean;
  orders: number;
  revenue: number;
  averageOrderValue: number;
  lastOrderAt: string | null;
  isNew: boolean;
}

export interface ReportCodeRow {
  code: string;
  isReferral: boolean;
  stylistName: string | null;
  orders: number;
  revenue: number;
  discount: number;
  referralCredit: number;
  costPercentage: number | null;
}

export interface ReportOverview {
  period: ReportPeriodInfo;
  summary: ReportSummary;
  previous: ReportSummary;
  changes: Partial<Record<keyof ReportSummary, number | null>>;
  timeline: { date: string; revenue: number; orders: number }[];
  byStatus: { status: string; orders: number; value: number }[];
  byBrand: ReportGroupRow[];
  byCategory: ReportGroupRow[];
  topProducts: ReportProductRow[];
  topCustomers: ReportCustomerRow[];
  codes: ReportCodeRow[];
}

export interface SlowMover {
  productId: number;
  name: string;
  brand: string | null;
  category: string | null;
  stock: number;
  price: number;
  lastSoldAt: string | null;
  daysSinceSale: number | null;
  soldEver: number;
  stockValueRetail: number;
  stockValueCost: number | null;
  costSource: CostSource;
}

export interface SlowMoversReport {
  days: number;
  products: SlowMover[];
  totalStockValueCost: number;
  totalStockValueRetail: number;
}

interface Envelope<T> { data: T }

function cleanParams(params: ReportParams) {
  return params.period === 'custom'
    ? { period: 'custom', from: params.from, to: params.to }
    : { period: params.period };
}

export const reportsApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getReportOverview: builder.query<ReportOverview, ReportParams>({
      query: (params) => ({ url: '/v1/admin/reports/overview', params: cleanParams(params) }),
      transformResponse: (response: Envelope<ReportOverview>) => response.data,
      providesTags: [{ type: API_TAGS.Orders, id: 'REPORTS' }],
      keepUnusedDataFor: 60,
    }),
    getSlowMovers: builder.query<SlowMoversReport, number>({
      query: (days) => ({ url: '/v1/admin/reports/slow-movers', params: { days } }),
      transformResponse: (response: Envelope<SlowMoversReport>) => response.data,
      providesTags: [{ type: API_TAGS.Orders, id: 'REPORTS' }],
      keepUnusedDataFor: 60,
    }),
  }),
});

export const { useGetReportOverviewQuery, useGetSlowMoversQuery } = reportsApi;

/** Turns rows into a CSV download (Excel opens it; the BOM keeps Cyrillic readable). */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const csv = toCsvText([header, ...rows]);
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
