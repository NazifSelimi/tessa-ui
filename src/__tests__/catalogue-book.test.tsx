import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

// jsdom has no element scrolling; the book scrolls the stage to centre the shade when zoomed.
Element.prototype.scrollTo = vi.fn() as unknown as Element['scrollTo'];

const setPhone = (phone: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: phone && query === '(max-width: 640px)', media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false }),
  });
};
const pageWidth = () => (document.querySelector('.catalogue-book__page') as HTMLElement).style.width;
const zoomIn = () => screen.queryByRole('button', { name: 'product.catalogue.zoomIn' });
const zoomOut = () => screen.queryByRole('button', { name: 'product.catalogue.zoomOut' });
const swipe = (dx: number) => {
  const stage = document.querySelector('.catalogue-book__stage')!;
  fireEvent.touchStart(stage, { touches: [{ clientX: 200 }] });
  fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 200 + dx }] });
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

  describe('zoom steps', () => {
    afterEach(() => setPhone(false));

    it('desktop opens at 1x: whole page, no minus button', () => {
      setPhone(false);
      renderBook('70');
      expect(screen.getByText('100%')).toBeTruthy();
      expect(zoomOut()).toBeNull();
      expect(zoomIn()).toBeTruthy();
      expect(pageWidth()).toMatch(/^calc\(1 \* min\(100%/);
      expect(document.querySelector('.catalogue-book__stage--zoomed')).toBeNull();
    });

    it('phones open at 1.5x, sized from the stage width instead of a fixed pixel width', () => {
      setPhone(true);
      renderBook('70');
      expect(screen.getByText('150%')).toBeTruthy();
      expect(pageWidth()).toMatch(/^calc\(1\.5 \* min\(100%/);
      expect(pageWidth()).not.toContain('px');
      expect(document.querySelector('.catalogue-book__stage--zoomed')).toBeTruthy();
      expect(screen.getByText('product.catalogue.dragHint')).toBeTruthy();
    });

    it('steps 1x → 1.5x → 2x → 3x and back, hiding + at 3x and − at 1x', () => {
      renderBook('70');
      for (const level of ['150%', '200%', '300%']) {
        fireEvent.click(zoomIn()!);
        expect(screen.getByText(level)).toBeTruthy();
      }
      expect(zoomIn()).toBeNull();
      expect(pageWidth()).toMatch(/^calc\(3 \* /);
      for (const level of ['200%', '150%', '100%']) {
        fireEvent.click(zoomOut()!);
        expect(screen.getByText(level)).toBeTruthy();
      }
      expect(zoomOut()).toBeNull();
    });

    it('keeps shade spots in page percentages at every level', () => {
      renderBook('70');
      for (let i = 0; i < 3; i += 1) {
        const spotEl = screen.getByRole('button', { name: '7.0 – Name 7.0' }) as HTMLElement;
        expect(spotEl.style.left).toBe('10%');
        expect(spotEl.style.top).toBe('20%');
        expect(spotEl.style.width).toBe('20%');
        fireEvent.click(zoomIn()!);
      }
    });

    it('swiping turns pages only at 1x', () => {
      renderBook('70');
      swipe(-120);
      expect(screen.getByText('3 / 3')).toBeTruthy();
      fireEvent.click(zoomIn()!);
      swipe(120);
      expect(screen.getByText('3 / 3')).toBeTruthy();
      fireEvent.click(zoomOut()!);
      swipe(120);
      expect(screen.getByText('2 / 3')).toBeTruthy();
    });
  });
});
