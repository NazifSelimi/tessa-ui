import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import en from '@/i18n/locales/en.json';

const productsQuery = vi.fn();
const auth = { user: null, isStylist: false };
vi.mock('@/features/products/api', () => ({ useGetProductsQuery: (...args: unknown[]) => productsQuery(...args) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/components/ProductCard', () => ({ default: ({ product }: { product: { name: string } }) => <article>{product.name}</article> }));
vi.mock('@/shared/components/Seo', () => ({ default: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key.split('.').reduce<unknown>((value, part) => value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, en) || key }) }));

function renderHome() {
  return render(<MemoryRouter><Routes><Route path="/" element={<HomePage />} /><Route path="/stylist/workspace" element={<div>Professional workspace</div>} /></Routes></MemoryRouter>);
}

describe('New storefront home', () => {
  beforeEach(() => { auth.isStylist = false; productsQuery.mockReturnValue({ data: { data: [{ id: 1, name: 'Daily shampoo' }, { id: 2, name: 'Salon color', stylistOnly: true }] } }); });
  it('keeps all six collection routes and the real quiz entry point', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: /Hair that feels/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Discover your ritual' })).toHaveAttribute('href', '/quiz');
    for (const slug of ['repair', 'blonde-and-tone', 'curls', 'smooth-and-anti-frizz', 'colour', 'extensions-and-tools']) {
      expect(document.querySelector(`a[href="/collections/${slug}"]`)).not.toBeNull();
    }
    expect(screen.getByText('Daily shampoo')).toBeInTheDocument();
    expect(screen.queryByText('Salon color')).not.toBeInTheDocument();
  });
  it('sends signed-in stylists to their workspace and skips the consumer query', () => {
    auth.isStylist = true;
    renderHome();
    expect(screen.getByText('Professional workspace')).toBeInTheDocument();
    expect(productsQuery).toHaveBeenLastCalledWith({ perPage: 8 }, { skip: true });
  });
  it('shows an actionable failure instead of pretending the catalog is empty', () => {
    productsQuery.mockReturnValue({ error: { status: 500 }, refetch: vi.fn() });
    renderHome();
    expect(screen.getByRole('alert')).toHaveTextContent('Check your connection and try again.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
