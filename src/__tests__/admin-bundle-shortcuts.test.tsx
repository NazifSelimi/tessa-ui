import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import type { StoreBundle } from '@/types';

const auth = vi.hoisted(() => ({ isAdmin: false }));
const update = vi.hoisted(() => vi.fn(() => ({ unwrap: () => Promise.resolve({}) })));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/features/admin/api', () => ({ useUpdateBundleMutation: () => [update, { isLoading: false }] }));
vi.mock('@/features/admin/BundleEditorDrawer', () => ({ default: ({ bundle }: { bundle: StoreBundle }) => <div>Editor for {bundle.name}</div> }));

const bundle = { id: '150', name: 'Silver Star 6+1', isFeatured: false, products: [] } as unknown as StoreBundle;

async function renderControls() {
  const { AdminBundleShortcuts } = await import('@/components/storefront/AdminShortcuts');
  return render(<App><MemoryRouter><AdminBundleShortcuts bundle={bundle} /></MemoryRouter></App>);
}

describe('admin offer shortcuts in the shop', () => {
  it('shows nothing to customers', async () => {
    auth.isAdmin = false;
    const { container } = await renderControls();
    expect(container.textContent).toBe('');
  });

  it('gives admins edit in place, picture, feature and hide', async () => {
    auth.isAdmin = true;
    await renderControls();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Silver Star 6+1' }));
    expect(await screen.findByText('Editor for Silver Star 6+1')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Picture or post for Silver Star 6+1' }).getAttribute('href')).toBe('/admin/studio?bundle=150');
    fireEvent.click(screen.getByRole('button', { name: 'Feature Silver Star 6+1' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ id: '150', data: { is_featured: true } }));
    expect(screen.getByRole('button', { name: 'Hide Silver Star 6+1' })).toBeTruthy();
  });
});
