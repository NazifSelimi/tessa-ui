import { fireEvent, render, screen } from '@testing-library/react';
import { App } from 'antd';
import { describe, expect, it } from 'vitest';
import { toInternationalPhone, viberUrl, whatsappUrl } from '@/shared/utils/messaging';
import { messageText } from '@/features/admin/messageTemplates';
import SendMessageButtons from '@/features/admin/SendMessageButtons';

describe('Viber / WhatsApp links', () => {
  it('turns Macedonian numbers into international digits', () => {
    expect(toInternationalPhone('078 286 332')).toBe('38978286332');
    expect(toInternationalPhone('+389 78 286 332')).toBe('38978286332');
    expect(toInternationalPhone('0038978286332')).toBe('38978286332');
    expect(toInternationalPhone('78286332')).toBe('38978286332');
    expect(toInternationalPhone('12')).toBeNull();
    expect(toInternationalPhone(undefined)).toBeNull();
  });

  it('builds chat links with the message filled in', () => {
    expect(whatsappUrl('38978286332', 'Здраво Ана')).toBe('https://wa.me/38978286332?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D0%BE%20%D0%90%D0%BD%D0%B0');
    expect(viberUrl('38978286332')).toBe('viber://chat?number=%2B38978286332');
    expect(viberUrl('38978286332', 'Hi')).toBe('viber://chat?number=%2B38978286332&draft=Hi');
  });

  it('writes ready-made messages in Macedonian and Albanian with the first name and order', () => {
    expect(messageText({ kind: 'stylistApproved', name: 'Ana Petrova' }, 'mk')).toMatch(/^Здраво Ana! Вашето барање за стилист на Tessa е одобрено/);
    expect(messageText({ kind: 'orderShipped', name: 'Arta', orderId: '42' }, 'sq')).toMatch(/^Përshëndetje Arta! Porosia juaj #42 u dërgua/);
    expect(messageText({ kind: 'stylistRejected', reason: 'missing salon details' }, 'mk')).toContain('не можеме да го одобриме: missing salon details');
  });

  it('gives the admin Viber and WhatsApp buttons for the customer and switches language', () => {
    render(<App><SendMessageButtons phone="070 123 456" template={{ kind: 'orderConfirmed', name: 'Ana', orderId: '7' }} /></App>);

    const whatsapp = screen.getByRole('link', { name: /WhatsApp/ });
    expect(whatsapp.getAttribute('href')).toContain('https://wa.me/38970123456?text=');
    expect(decodeURIComponent(whatsapp.getAttribute('href')!)).toContain('нарачка #7 е потврдена');

    fireEvent.click(screen.getByText('SQ'));
    expect(decodeURIComponent(screen.getByRole('link', { name: /WhatsApp/ }).getAttribute('href')!)).toContain('Porosia juaj #7 u konfirmua');
    expect(screen.getByRole('link', { name: /Viber/ }).getAttribute('href')).toMatch(/^viber:\/\/chat\?number=%2B38970123456&draft=/);
  });

  it('disables messaging without a usable phone number', () => {
    render(<App><SendMessageButtons phone="" template={{ kind: 'stylistApproved' }} /></App>);
    expect(screen.getByRole('button', { name: /Message/ }).hasAttribute('disabled')).toBe(true);
  });
});
