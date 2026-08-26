import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CollectionPage from '@/pages/CollectionPage';

const mockUseGetProductCollectionsQuery = vi.fn();
const mockUseGetProductsQuery = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/features/products/api', () => ({
  useGetProductCollectionsQuery: () => mockUseGetProductCollectionsQuery(),
  useGetProductsQuery: () => mockUseGetProductsQuery(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/ProductCard', () => ({
  default: ({ product }: { product: { name: string } }) => <div>{product.name}</div>,
}));

const collection = {
  slug: 'blonde-and-tone',
  name: 'Blonde and Tone',
  title: 'Blonde and Tone',
  description: 'Tone brassiness, maintain brightness, and support blonde routines with verified Fanola-family products.',
  sortPriority: 10,
  routineRoles: ['cleanse', 'tone', 'nourish', 'protect'],
  supportedCategoryNames: ['Shampoo', 'Mask', 'Hair Color'],
  productCount: 3,
};

const products = [
  {
    id: '1',
    name: 'Wonder No Yellow Shampoo',
    image: 'https://example.com/shampoo.png',
    price: 820,
    stylistPrice: 520,
    brand: { id: '1', name: 'Fanola' },
    category: { id: '1', name: 'Shampoo' },
    catalogGuidance: {
      professionalOnly: false,
      consumerRoutineRole: 'cleanse',
    },
  },
  {
    id: '2',
    name: 'Wonder No Yellow Mask',
    image: 'https://example.com/mask.png',
    price: 930,
    stylistPrice: 590,
    brand: { id: '1', name: 'Fanola' },
    category: { id: '2', name: 'Mask' },
    catalogGuidance: {
      professionalOnly: false,
      consumerRoutineRole: 'nourish',
    },
  },
  {
    id: '3',
    name: 'No Yellow 9 Tone Bleaching Powder',
    image: 'https://example.com/bleach.png',
    price: 1590,
    stylistPrice: 890,
    brand: { id: '1', name: 'Fanola' },
    category: { id: '3', name: 'Bleach and De Color' },
    catalogGuidance: {
      professionalOnly: true,
      consumerRoutineRole: null,
      compatibleWith: ['Fanola Oxy'],
      professionalGuidance: {
        compatibleSystems: ['Fanola Oxy'],
        verificationStatus: 'compatible_system_only',
        notes: [
          'Use only the verified compatible system for this technical product.',
          'Developer ratios, timing, and substitutions are intentionally omitted until manufacturer validation.',
        ],
      },
    },
  },
];

function renderCollection() {
  return render(
    <MemoryRouter initialEntries={['/collections/blonde-and-tone']}>
      <Routes>
        <Route path="/collections/:slug" element={<CollectionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CollectionPage', () => {
  beforeEach(() => {
    mockUseGetProductCollectionsQuery.mockReturnValue({ data: [collection] });
    mockUseGetProductsQuery.mockReturnValue({ data: { data: products }, isLoading: false, error: undefined });
  });

  it('shows the public pairing gate to non-stylists', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      isStylist: false,
    });

    renderCollection();

    expect(screen.getByText('Wonder No Yellow Shampoo')).toBeInTheDocument();
    expect(screen.getByText('Stylist-safe technical guidance unlocks after sign-in or approval.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in for stylist guidance' })).toBeInTheDocument();
  });

  it('shows verified compatible systems to stylists', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
      isStylist: true,
    });

    renderCollection();

    expect(screen.getByText('No Yellow 9 Tone Bleaching Powder')).toBeInTheDocument();
    expect(screen.getByText('Pair only with')).toBeInTheDocument();
    expect(screen.getByText('Fanola Oxy')).toBeInTheDocument();
    expect(screen.getByText('Developer ratios, timing, and substitutions are intentionally omitted until manufacturer validation.')).toBeInTheDocument();
  });
});
