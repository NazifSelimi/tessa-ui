/**
 * "Send to a list": the list and how far the admin got, kept in this
 * browser (phone) so they can stop and continue later. Nothing is sent by
 * the shop; the admin presses send in Viber / WhatsApp for each person.
 */

import type { Lang } from './templates';
import { csvCell } from '@/shared/utils/csv';

export interface Recipient {
  phone: string;
  name: string;
  type: 'customer' | 'business' | 'guest' | 'pasted' | string;
  lastOrderAt: string | null;
  orders: number;
  locale: string | null;
  userId: number | null;
}

export type RecipientStatus = 'sent' | 'skipped';

export interface Campaign {
  id: string;
  createdAt: string;
  groupLabel: string;
  templateKey: string;
  /** 'auto' = each person's own language when known, otherwise Macedonian. */
  language: Lang | 'auto';
  code: string;
  rows: Recipient[];
  status: Record<string, RecipientStatus>;
  index: number;
}

const STORAGE_KEY = 'tessa.admin.messageCampaign';

export function createCampaign(input: Omit<Campaign, 'id' | 'createdAt' | 'status' | 'index'>): Campaign {
  return { ...input, id: String(Date.now()), createdAt: new Date().toISOString(), status: {}, index: 0 };
}

/** First person at or after `from` who is not done yet; rows.length when everyone is done. */
export function nextOpen(campaign: Campaign, from = 0): number {
  for (let i = from; i < campaign.rows.length; i++) {
    if (!campaign.status[campaign.rows[i].phone]) return i;
  }
  for (let i = 0; i < Math.min(from, campaign.rows.length); i++) {
    if (!campaign.status[campaign.rows[i].phone]) return i;
  }
  return campaign.rows.length;
}

export function mark(campaign: Campaign, phone: string, status: RecipientStatus | null): Campaign {
  const next = Object.fromEntries(Object.entries(campaign.status).filter(([key]) => key !== phone));
  if (status) next[phone] = status;
  const updated = { ...campaign, status: next };
  const at = campaign.rows.findIndex((r) => r.phone === phone);
  return { ...updated, index: status ? nextOpen(updated, at + 1) : Math.max(0, at) };
}

export function progress(campaign: Campaign) {
  const values = Object.values(campaign.status);
  const sent = values.filter((s) => s === 'sent').length;
  const skipped = values.filter((s) => s === 'skipped').length;
  return { sent, skipped, done: sent + skipped, total: campaign.rows.length };
}

export function loadCampaign(): Campaign | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Campaign) : null;
    return parsed && Array.isArray(parsed.rows) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCampaign(campaign: Campaign | null): void {
  try {
    if (campaign) localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / full storage: progress just isn't remembered */
  }
}


/** CSV for Excel / Google Sheets; `message` gives each person's filled-in text. */
export function toCsv(campaign: Campaign, message: (row: Recipient) => string): string {
  const header = ['Name', 'Phone', 'Type', 'Orders', 'Last order', 'Status', 'Message'];
  const lines = campaign.rows.map((row) => [
    row.name,
    `+${row.phone}`,
    row.type,
    row.orders,
    row.lastOrderAt ? row.lastOrderAt.slice(0, 10) : '',
    campaign.status[row.phone] ?? 'not sent',
    message(row),
  ].map(csvCell).join(','));
  // BOM so Excel opens Cyrillic / Albanian letters correctly.
  return `\uFEFF${[header.join(','), ...lines].join('\r\n')}`;
}
