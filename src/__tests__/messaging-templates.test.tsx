import { fireEvent, render, screen } from '@testing-library/react';
import { App } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import {
  changedTemplates, DEFAULT_TEMPLATES, fillTemplate, mergeTemplates, toLang,
} from '@/features/messaging/templates';
import { createCampaign, mark, nextOpen, progress, toCsv, type Recipient } from '@/features/messaging/campaign';

vi.mock('@/features/messaging/useMessageTemplates', async () => {
  const { DEFAULT_TEMPLATES: defs } = await import('@/features/messaging/templates');
  return {
    useMessageTemplates: () => ({
      templates: defs, shop: 'Tessa', link: 'https://tessa.mk',
      find: (key: string) => defs.find((t) => t.key === key),
    }),
  };
});

const row = (phone: string, name = ''): Recipient => ({ phone, name, type: 'customer', lastOrderAt: null, orders: 0, locale: null, userId: null });

describe('message templates', () => {
  it('has every built-in message in Macedonian, Albanian and English', () => {
    const keys = DEFAULT_TEMPLATES.map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining([
      'order_received', 'order_confirmed', 'order_shipped', 'offer', 'win_back', 'review_request', 'restock', 'business_approved', 'referral_share',
    ]));
    for (const t of DEFAULT_TEMPLATES) {
      expect(t.mk && t.sq && t.en).toBeTruthy();
    }
  });

  it('fills placeholders and tidies up missing ones', () => {
    expect(fillTemplate('Здраво {name}! Нарачка #{order} ({total}). {shop}', { name: 'Ана', order: 7, total: '1.200 ден', shop: 'Tessa' }))
      .toBe('Здраво Ана! Нарачка #7 (1.200 ден). Tessa');
    expect(fillTemplate('Hi {name}! Code {code}. {shop}', { shop: 'Tessa' })).toBe('Hi! Code. Tessa');
    expect(fillTemplate('Keep {unknown}', {})).toBe('Keep {unknown}');
  });

  it('keeps only edited and own templates when saving, and merges them back', () => {
    const edited = DEFAULT_TEMPLATES.map((t) => (t.key === 'offer' ? { ...t, mk: 'Попуст!' } : t));
    const own = { key: 'custom_x', label: 'Mine', mk: 'a', sq: 'b', en: 'c', custom: true };
    const saved = changedTemplates([...edited, own]);
    expect(saved.map((t) => t.key)).toEqual(['offer', 'custom_x']);
    const merged = mergeTemplates(saved);
    expect(merged.find((t) => t.key === 'offer')?.mk).toBe('Попуст!');
    expect(merged.find((t) => t.key === 'offer')?.sq).toBe(DEFAULT_TEMPLATES.find((t) => t.key === 'offer')?.sq);
    expect(merged.at(-1)?.key).toBe('custom_x');
  });

  it('picks a supported language', () => {
    expect(toLang('sq_AL')).toBe('sq');
    expect(toLang('de')).toBe('mk');
    expect(toLang(null, 'en')).toBe('en');
  });
});

describe('send to a list', () => {
  it('moves to the next open person and counts progress', () => {
    let c = createCampaign({ groupLabel: 'x', templateKey: 'offer', language: 'mk', code: '', rows: [row('1'), row('2'), row('3')] });
    c = mark(c, '1', 'sent');
    expect(c.index).toBe(1);
    c = mark(c, '2', 'skipped');
    expect(c.index).toBe(2);
    c = mark(c, '1', null); // undo goes back to that person
    expect(c.index).toBe(0);
    expect(progress(c)).toEqual({ sent: 0, skipped: 1, done: 1, total: 3 });
    c = mark(mark(c, '1', 'sent'), '3', 'sent');
    expect(nextOpen(c)).toBe(3);
  });

  it('exports a CSV that Excel opens with Cyrillic', () => {
    const c = mark(createCampaign({ groupLabel: 'x', templateKey: 'offer', language: 'mk', code: '', rows: [row('38970123456', 'Ана, П.')] }), '38970123456', 'sent');
    const csv = toCsv(c, () => 'Здраво "Ана"');
    expect(csv.startsWith('\uFEFFName,Phone')).toBe(true);
    expect(csv).toContain('"Ана, П.",+38970123456,customer,0,,sent,"Здраво ""Ана"""');
  });
});

describe('order message buttons', () => {
  it('opens WhatsApp and Viber with the order template, in three languages', async () => {
    const { default: MessageButtons } = await import('@/features/messaging/MessageButtons');
    render(<App><MessageButtons phone="070 123 456" templateKey="order_shipped" vars={{ name: 'Ana', order: 9, total: '1.000 ден' }} /></App>);

    const whatsapp = screen.getByRole('link', { name: /WhatsApp/ });
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/38970123456\?text=/);
    expect(decodeURIComponent(whatsapp.getAttribute('href')!)).toContain('нарачка #9 е испратена');
    expect(screen.getByRole('link', { name: /Viber/ }).getAttribute('href')).toMatch(/^viber:\/\/chat\?number=%2B38970123456&draft=/);

    fireEvent.click(screen.getByText('EN'));
    expect(decodeURIComponent(screen.getByRole('link', { name: /WhatsApp/ }).getAttribute('href')!)).toContain('Your order #9 has been shipped');
    expect(screen.getByRole('button', { name: /Copy/ })).toBeTruthy();
  });

  it('still offers Copy without a phone number', async () => {
    const { default: MessageButtons } = await import('@/features/messaging/MessageButtons');
    render(<App><MessageButtons phone="" templateKey="offer" vars={{}} /></App>);
    expect(screen.getByRole('button', { name: /No phone/ }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /Copy/ }).hasAttribute('disabled')).toBe(false);
  });
});
