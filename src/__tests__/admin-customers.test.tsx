import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';
import AdminCustomersPage from '@/pages/admin/AdminCustomersPage';
import { formatMkd, segmentParams } from '@/features/admin/customerFormat';
import { messageText } from '@/features/admin/messageTemplates';

const listMock = vi.fn();
const saveMock = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

const ana = {
  key: 'email-ana@x.mk', aliases: ['email-ana@x.mk'], userId: null, type: 'guest', registered: false,
  name: 'Ана Петровска', email: 'ana@x.mk', phone: '070 123 456', city: 'Скопје',
  ordersCount: 3, cancelledCount: 1, totalSpent: 12500, averageOrder: 4166.67,
  firstOrderAt: '2026-01-02 10:00:00', lastOrderAt: '2026-08-01 10:00:00', daysSinceLastOrder: 100,
  joinedAt: null, storeCredit: 0, tags: ['VIP'], notes: 'Likes Olaplex',
};

vi.mock('@/app/hooks', () => ({ useAppSelector: () => 'token' }));

vi.mock('@/features/admin/customersApi', () => ({
  cleanCustomerParams: (params: object) => params,
  useGetCustomersQuery: (params: unknown) => {
    listMock(params);
    return {
      data: {
        data: [ana],
        meta: { currentPage: 1, lastPage: 1, perPage: 25, total: 1, summary: { customers: 1, withOrders: 1, totalSpent: 12500, averageOrder: 4166.67 }, tags: ['VIP'], cities: [{ city: 'Скопје', count: 1 }] },
      },
      isFetching: false, error: undefined, refetch: vi.fn(),
    };
  },
  useGetCustomerQuery: (key: string, { skip }: { skip: boolean }) => ({
    data: skip ? undefined : { ...ana, key, orders: [{ id: '42', createdAt: '2026-08-01 10:00:00', status: 'shipped', total: 4000, paymentMethod: 'cod', city: 'Скопје', address: null, itemsCount: 2, items: [] }], favouriteProducts: [] },
    isFetching: false, error: undefined,
  }),
  useUpdateCustomerNotesMutation: () => [saveMock, { isLoading: false }],
}));

describe('admin customers page', () => {
  it('lists customers, applies a quick segment and opens the profile with contact buttons', async () => {
    render(<App><AdminCustomersPage /></App>);

    expect(screen.getAllByText('Ана Петровска').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12.500 MKD').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Not ordered in 60 days'));
    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith(expect.objectContaining({ inactive_days: 60, sort: 'total_spent' })));

    fireEvent.click(screen.getAllByText('Ана Петровска')[0]);
    expect(await screen.findByText('Save notes & tags')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Email/ }).getAttribute('href')).toBe('mailto:ana@x.mk');
    expect(screen.getByRole('link', { name: /Call/ }).getAttribute('href')).toBe('tel:070123456');
    expect(screen.getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).toContain('wa.me/38970123456');

    fireEvent.change(screen.getByLabelText('Private notes'), { target: { value: 'Likes Olaplex and K18' } });
    fireEvent.click(screen.getByText('Save notes & tags'));
    await waitFor(() => expect(saveMock).toHaveBeenCalledWith({ key: 'email-ana@x.mk', notes: 'Likes Olaplex and K18', tags: ['VIP'] }));
  });

  it('builds segments and formats money', () => {
    expect(segmentParams('new', dayjs('2026-11-09'))).toEqual({ new_since: '2026-11-01', sort: 'joined_at', direction: 'desc' });
    expect(segmentParams('business')).toEqual({ type: 'business' });
    expect(formatMkd(1234.6)).toBe('1.235 MKD');
    expect(messageText({ kind: 'customerCheckIn', name: 'Ана Петровска' }, 'mk')).toContain('Здраво Ана!');
  });
});
