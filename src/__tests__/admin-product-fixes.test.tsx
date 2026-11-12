import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import AdminProductFixesPage from '@/pages/admin/AdminProductFixesPage';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ token: 'test-token' }) }));

const row = (id: number, name: string, groups: string[]) => ({
  id, name, brand: 'Fanola', category: 'Shampoo', quantity: 5, visible: true, live: true, orders: 0, image_count: 0, thumbnail: null, groups,
  problems: groups.map(group => ({ group, code: group, label: `${group} problem`, detail: null })),
});
const report = {
  total_products: 10, products_with_problems: 2,
  summary: [{ group: 'photo', label: 'Photo', products: 1 }, { group: 'price', label: 'Price', products: 1 }],
  products: [row(1, 'First shampoo', ['photo']), row(2, 'Second mask', ['price'])],
};

describe('Fix products page', () => {
  beforeEach(() => {
    try { localStorage.removeItem('tessa.productFixes.done'); } catch { /* no storage in this test env */ }
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/products/problems')) return { ok: true, status: 200, json: async () => report };
      const images = init?.method === 'POST' ? [{ id: 9, url: '/new.png', alt: '', variant: 'gallery', review_status: 'needs_review', is_primary: true }] : [];
      return { ok: true, status: 200, json: async () => ({ product: { id: 1, name: 'First shampoo' }, images }) };
    }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('opens the most important product first and moves with J and D', async () => {
    render(<MemoryRouter><AdminProductFixesPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'First shampoo' })).toBeVisible();
    fireEvent.keyDown(window, { key: 'j' });
    expect(await screen.findByRole('heading', { name: 'Second mask' })).toBeVisible();
    fireEvent.keyDown(window, { key: 'k' });
    expect(await screen.findByRole('heading', { name: 'First shampoo' })).toBeVisible();
    fireEvent.keyDown(window, { key: 'd' });
    expect(await screen.findByRole('heading', { name: 'Second mask' })).toBeVisible();
  });

  it('filters by problem type', async () => {
    render(<MemoryRouter><AdminProductFixesPage /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'First shampoo' });
    fireEvent.click(screen.getByRole('button', { name: /Price/ }));
    await waitFor(() => expect(screen.queryByRole('option', { name: /First shampoo/ })).toBeNull());
    expect(screen.getByRole('option', { name: /Second mask/ })).toBeVisible();
  });

  it('adds a photo from an image address through the admin upload path', async () => {
    render(<MemoryRouter><AdminProductFixesPage /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'First shampoo' });
    fireEvent.change(screen.getByLabelText('Image web address'), { target: { value: 'https://example.com/a.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add from address' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/products/1/images/from-url'), expect.objectContaining({ method: 'POST', body: JSON.stringify({ url: 'https://example.com/a.jpg' }) })));
    expect(await screen.findByText('Main photo')).toBeVisible();
  });
});
