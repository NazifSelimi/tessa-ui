import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ShadePicker from '@/components/ShadePicker';
import type { ProductShade } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { count?: number }) => (options?.count !== undefined ? `${key} ${options.count}` : key) }),
}));

const shade = (id: string, code: string | null, name: string, inStock = true): ProductShade => ({
  id, name: `${code ?? ''} ${name}`.trim(), shadeCode: code, shadeName: name, swatch: `https://img.test/${id}.jpg`, inStock,
});

const shades = Array.from({ length: 14 }, (_, i) => shade(String(i + 1), `${i + 1}.0`, `Shade ${i + 1}`, i !== 2));

describe('shade picker', () => {
  it('shows the current shade, links every shade to its product and marks sold-out shades', () => {
    render(<MemoryRouter><ShadePicker currentId="2" shades={shades} /></MemoryRouter>);

    expect(screen.getByText('2.0 – Shade 2')).toBeTruthy();
    const current = document.querySelector('[aria-current="true"]')!;
    expect(current.getAttribute('href')).toBe('/product/2');
    expect(document.querySelectorAll('.shade-picker__row .shade-tile')).toHaveLength(14);
    expect(document.querySelector('[data-shade-id="3"]')!.className).toContain('shade-tile--out');
  });

  it('opens the full grid and filters shades by number or name', () => {
    render(<MemoryRouter><ShadePicker currentId="1" shades={shades} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'product.allShades 14' }));
    fireEvent.change(screen.getByPlaceholderText('product.searchShades'), { target: { value: 'shade 12' } });

    expect(document.querySelectorAll('.shade-picker__grid .shade-tile')).toHaveLength(1);
    expect(document.querySelector('.shade-picker__grid .shade-tile')!.getAttribute('href')).toBe('/product/12');
  });

  it('shows nothing for a product without other shades', () => {
    const { container } = render(<MemoryRouter><ShadePicker currentId="1" shades={[shades[0]]} /></MemoryRouter>);
    expect(container.innerHTML).toBe('');
  });
});
