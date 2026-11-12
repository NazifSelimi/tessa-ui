import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ShadeCatalogue } from '@/types';

const addItem = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o?.page ? `${key} ${o.page}/${o.count}` : key) }),
}));
vi.mock('@/hooks/useCart', () => ({ useCart: () => ({ addItem }) }));
vi.mock('@/components/PriceDisplay', () => ({ default: () => <span>540 MKD</span> }));
vi.mock('@/features/products/api', () => ({
  useGetProductByIdQuery: (id: string) => ({ data: { id, name: `Shade ${id}`, inStock: true, quantity: 5 }, isFetching: false }),
}));

const { default: CatalogueBook } = await import('@/components/CatalogueBook');

const spot = (code: string, productId: string | null, y: number) => ({ code, x: 0.1, y, w: 0.2, h: 0.05, productId, name: `Name ${code}`, inStock: true });
const catalogue: ShadeCatalogue = {
  title: 'Fanola Color',
  pages: [
    { image: 'https://img.test/p1.webp', width: 1600, height: 1600, spots: [] },
    { image: 'https://img.test/p2.webp', width: 1600, height: 3200, spots: [spot('7.0', '70', 0.2), spot('9.9', null, 0.4)] },
    { image: 'https://img.test/p3.webp', width: 1600, height: 3200, spots: [spot('8.0', '80', 0.2)] },
  ],
};

const renderBook = (currentId: string) => render(<MemoryRouter><App><CatalogueBook catalogue={catalogue} currentId={currentId} /></App></MemoryRouter>);

describe('catalogue book', () => {
  it('opens on the page with the shade being viewed and highlights it', () => {
    renderBook('80');
    expect(screen.getByText('3 / 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: '8.0 – Name 8.0' }).className).toContain('catalogue-spot--current');
  });

  it('turns pages and only makes shades Tessa sells clickable', () => {
    renderBook('999');
    expect(screen.getByText('1 / 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'product.catalogue.next' }));
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: '7.0 – Name 7.0' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /9\.9/ })).toBeNull();
    fireEvent.keyDown(document.querySelector('.catalogue-book__stage')!, { key: 'ArrowLeft' });
    expect(screen.getByText('1 / 3')).toBeTruthy();
  });

  it('adds a shade to the cart from the catalogue', async () => {
    renderBook('70');
    fireEvent.click(screen.getByRole('button', { name: '7.0 – Name 7.0' }));
    const add = await screen.findByRole('button', { name: /product.addToCart/ });
    expect(screen.getByRole('link', { name: 'product.catalogue.viewProduct' }).getAttribute('href')).toBe('/product/70');
    fireEvent.click(add);
    await waitFor(() => expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ id: '70' }), 1));
  });
});
