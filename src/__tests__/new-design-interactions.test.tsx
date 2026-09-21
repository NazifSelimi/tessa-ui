import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import ShopPage from '@/pages/ShopPage';
import en from '@/i18n/locales/en.json';

const add = vi.fn();
const updateQuantity = vi.fn();
const query = vi.fn();
let quantity = 0;
const product = { id: 1, name: 'Shampoo', brand: 'Tessa', category: 'Shampoo', description: '', price: 600, stylistPrice: 400, inStock: true, quantity: 2 };
vi.mock('@/hooks/useCart', () => ({ useCart: () => ({ addItem: add, updateQuantity, getCartItem: () => quantity ? { quantity } : undefined }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isStylist: false, isProfessional: false }) }));
vi.mock('@/shared/components/Seo', () => ({ default: () => null }));
vi.mock('@/features/products/api', () => ({
  useGetProductsQuery: (params: unknown) => { query(params); return { data: { data: [], meta: { total: 0 } } }; },
  useGetCategoriesQuery: () => ({ data: [{ id: '7', name: 'Masks' }] }),
  useGetBrandsQuery: () => ({ data: [] }),
  useGetBundlesQuery: () => ({ data: [] }),
  useGetProductCollectionsQuery: () => ({ data: [] }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, params: Record<string, unknown> = {}) => {
  const value = key.split('.').reduce<unknown>((value, part) => value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, en) || key;
  return String(value).replace(/{{(\w+)}}/g, (_, name) => String(params[name] ?? ''));
} }) }));

function HistoryControls() { const navigate = useNavigate(); return <><button onClick={() => navigate(-1)}>Go back</button><button onClick={() => navigate(1)}>Go forward</button></>; }

describe('Storefront interactions', () => {
  beforeEach(() => { quantity = 0; vi.clearAllMocks(); });
  it('adds the actual product without navigating to its detail page', async () => {
    render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart: Shampoo' }));
    expect(add).toHaveBeenCalledWith(product, 1);
    expect(screen.getByRole('button', { name: 'Add to Cart: Shampoo' }).closest('a')).toBeNull();
  });
  it('prevents adding unavailable stock and lets the last unit be removed', async () => {
    quantity = 2;
    const { rerender } = render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Increase quantity of Shampoo' })).toBeDisabled();
    quantity = 1;
    rerender(<MemoryRouter><ProductCard product={{ ...product }} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Decrease quantity of Shampoo' }));
    expect(updateQuantity).toHaveBeenCalledWith(1, 0);
    quantity = 0;
    rerender(<MemoryRouter><ProductCard product={{ ...product, inStock: false }} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Add to Cart: Shampoo' })).toBeDisabled();
  });
  it('restores search and filters on browser back and forward', async () => {
    render(<MemoryRouter initialEntries={['/shop?search=first', '/shop?search=second&category=7']} initialIndex={1}><HistoryControls /><ShopPage /></MemoryRouter>);
    expect(screen.getByRole('textbox', { name: 'Search products (min 2 chars)...' })).toHaveValue('second');
    await userEvent.click(screen.getByRole('button', { name: 'Go back' }));
    await waitFor(() => expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'first', category: undefined })));
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(screen.getByRole('textbox', { name: 'Search products (min 2 chars)...' })).toHaveValue('first');
    await userEvent.click(screen.getByRole('button', { name: 'Go forward' }));
    await waitFor(() => expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'second', category: '7' })));
  });
  it('resets pagination when a category changes', async () => {
    render(<MemoryRouter initialEntries={['/shop?page=3']}><ShopPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Masks', exact: true }));
    await waitFor(() => expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, category: '7' })));
  });
});
