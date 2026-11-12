import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '@/types';

const auth = vi.hoisted(() => ({ isAdmin: false }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/features/admin/api', () => ({ useDeleteProductMutation: () => [vi.fn()], useUpdateProductMutation: () => [vi.fn(), { isLoading: false }] }));
vi.mock('@/features/products/api', () => ({ useGetProductByIdQuery: () => ({ data: undefined }) }));

const product = { id: 7, name: 'Botugen 1000ml', price: 900, quantity: 4 } as Product;

async function renderControls() {
  const { AdminProductShortcuts, AdminAddProductShortcut } = await import('@/components/storefront/AdminShortcuts');
  return render(<App><MemoryRouter><AdminAddProductShortcut /><AdminProductShortcuts product={product} variant="page" /></MemoryRouter></App>);
}

describe('admin product shortcuts in the shop', () => {
  it('shows nothing to customers', async () => {
    auth.isAdmin = false;
    const { container } = await renderControls();
    expect(container.textContent).toBe('');
  });

  it('gives admins add, edit, photos and delete', async () => {
    auth.isAdmin = true;
    await renderControls();
    expect(await screen.findByRole('button', { name: 'Edit Botugen 1000ml' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete Botugen 1000ml' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Photos of Botugen 1000ml' }).getAttribute('href')).toBe('/admin/catalog-images?product=7');
    expect(screen.getByRole('button', { name: /Add product/ })).toBeTruthy();
    // The product page bar also edits price and stock in place.
    expect(screen.getByText('Price')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Save/ }).hasAttribute('disabled')).toBe(true);
  });
});
