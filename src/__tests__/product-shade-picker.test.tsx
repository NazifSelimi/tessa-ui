import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ShadePicker from '@/components/ShadePicker';
import type { ProductShade } from '@/types';
import { groupShades, shadeGroup } from '@/shared/utils/shadeGroups';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { count?: number }) => (options?.count !== undefined ? `${key} ${options.count}` : key) }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAdmin: false }) }));

const shade = (id: string, code: string | null, name: string, inStock = true): ProductShade => ({
  id, name: `${code ?? ''} ${name}`.trim(), shadeCode: code, shadeName: name, swatch: `https://img.test/${id}.jpg`, inStock,
});

const shades = Array.from({ length: 14 }, (_, i) => shade(String(i + 1), `${(i % 9) + 1}.${i < 9 ? '0' : '3'}`, `Shade ${i + 1}`, i !== 2));

describe('shade picker', () => {
  it('shows the current shade, links every shade to its product and marks sold-out shades', () => {
    render(<MemoryRouter><ShadePicker currentId="2" shades={shades} /></MemoryRouter>);

    expect(screen.getByText('2.0 – Shade 2')).toBeTruthy();
    expect(document.querySelector('.shade-picker__preview-code')!.textContent).toBe('2.0');
    const current = document.querySelector('[aria-current="true"]')!;
    expect(current.getAttribute('href')).toBe('/product/2');
    expect(document.querySelectorAll('.shade-picker__groups .shade-dot')).toHaveLength(14);
    expect(document.querySelector('[data-shade-id="3"]')!.className).toContain('shade-dot--out');
    // 1.0-9.0 are natural, 1.3-5.3 golden: two tone groups with headings
    expect([...document.querySelectorAll('.shade-picker__groups .shade-group__title')].map((h) => h.textContent))
      .toEqual(['product.shadeGroups.natural', 'product.shadeGroups.gold']);
  });

  it('opens the full grid and filters shades by number or name', () => {
    render(<MemoryRouter><ShadePicker currentId="1" shades={shades} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'product.allShades 14' }));
    fireEvent.change(screen.getByPlaceholderText('product.searchShades'), { target: { value: 'shade 12' } });

    expect(document.querySelectorAll('.shade-picker__modal-groups .shade-dot')).toHaveLength(1);
    expect(document.querySelector('.shade-picker__modal-groups .shade-dot')!.getAttribute('href')).toBe('/product/12');
  });

  it('shows nothing for a product without other shades', () => {
    const { container } = render(<MemoryRouter><ShadePicker currentId="1" shades={[shades[0]]} /></MemoryRouter>);
    expect(container.innerHTML).toBe('');
  });
});

describe('shade tone groups', () => {
  it('reads the tone from the shade code', () => {
    const group = (shadeCode: string | null, shadeName: string | null = null) => shadeGroup({ shadeCode, shadeName });
    expect(group('7.0')).toBe('natural');
    expect(group('8.00')).toBe('natural');
    expect(group('7.03')).toBe('warmNatural');
    expect(group('9.1')).toBe('ash');
    expect(group('6.66')).toBe('red');
    expect(group('5/4')).toBe('copper');
    expect(group('12.13')).toBe('superBlonde');
    expect(group('8.2F')).toBe('fantasy');
    expect(group('10 ICE')).toBe('ice');
    expect(group('T.21')).toBe('toners');
    expect(group(null, 'Silver Toner')).toBe('toners');
    expect(group('S.1202')).toBe('lighteners');
    expect(group(null, 'Copper Flow')).toBe('other');
  });

  it('keeps shade order inside each group and lists groups in tone order', () => {
    const grouped = groupShades([shade('a', '7.3', 'Gold'), shade('b', '7.0', 'Nat'), shade('c', '8.3', 'Gold 2')]);
    expect(grouped.map((g) => [g.key, g.shades.map((s) => s.id)])).toEqual([['natural', ['b']], ['gold', ['a', 'c']]]);
  });

  it('shows no group headings for a line without numbered tones', () => {
    render(<MemoryRouter><ShadePicker currentId="m1" shades={[shade('m1', null, 'Copper Flow'), shade('m2', null, 'Ocean Blue')]} /></MemoryRouter>);
    expect(document.querySelectorAll('.shade-group__title')).toHaveLength(0);
    expect(document.querySelectorAll('.shade-picker__groups .shade-dot')).toHaveLength(2);
  });
});

describe('colour line shop card', () => {
  it('shows the line name and shade count and links to the shade picker instead of adding to cart', async () => {
    vi.doMock('@/hooks/useCart', () => ({ useCart: () => ({ addItem: vi.fn(), getCartItem: () => undefined, updateQuantity: vi.fn() }) }));
    vi.doMock('@/components/PriceDisplay', () => ({ default: () => null }));
    vi.doMock('@/components/storefront/DesignPrimitives', () => ({ ProductImage: () => null }));
    const { default: ProductCard } = await import('@/components/ProductCard');

    render(<MemoryRouter><ProductCard product={{
      id: '1', name: '1.0 - Black 100ml', brand: { id: '1', name: 'Fanola' }, category: { id: '2', name: 'Hair Color' }, description: '',
      inStock: true, shadeCount: 107, shadePreview: ['https://img.test/a.jpg'], shadeFamily: { id: '1', name: 'Fanola Colouring Cream' },
    }} /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Fanola Colouring Cream' })).toBeTruthy();
    expect(screen.getByText('product.shadeCount 107')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'product.chooseShade' }).getAttribute('href')).toBe('/product/1');
    expect(screen.queryByRole('button', { name: /product.addToCart/ })).toBeNull();
  });
});
