import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import ProductImagesWorkspace from '@/pages/admin/ProductImagesWorkspace';
const dispatchSpy = vi.fn();
vi.mock('@/app/hooks', () => ({ useAppDispatch: () => dispatchSpy }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ token: 'test-token' }) }));
describe('image review workflow', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const gallery = { product: { id: 42, name: 'Test shampoo' }, images: [{ id: 8, url: '/test.png', alt: 'Front', variant: 'card', sort_order: 0, review_status: 'needs_review', is_primary: true }] };
      const body = url.includes('/products/42/images') ? gallery : url.includes('catalog-image-candidates') ? { audit: 'test-audit', candidates: [] } : { summary: { total: 26, needs_review: 26 }, products: [{ id: '42', name: 'Test shampoo', brand: 'Fanola', status: 'needs_review', imageCount: 1, imageUrl: '/test.png' }], meta: { total: 26 } };
      return { ok: true, json: async () => body };
    }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it('opens the product gallery from the queue with upload, edit and preview controls', async () => {
    render(<MemoryRouter><ProductImagesWorkspace /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Manage images' }));
    expect(await screen.findByText('Add another image')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit details / order' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit photo' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open original' })).toHaveAttribute('href', '/test.png');
  });
  it('supports a direct product link and persists a manual review action', async () => {
    render(<MemoryRouter initialEntries={['/?product=42']}><ProductImagesWorkspace /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark reviewed' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/products/42/images/8'), expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ review_status: 'approved' }) })));
  });
});
