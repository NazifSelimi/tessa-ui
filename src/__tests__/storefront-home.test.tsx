import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '@/pages/HomePage';

const mockUseGetProductCollectionsQuery = vi.fn();
const mockUseGetProductsQuery = vi.fn();

vi.mock('@/features/products/api', () => ({
  useGetProductCollectionsQuery: () => mockUseGetProductCollectionsQuery(),
  useGetProductsQuery: () => mockUseGetProductsQuery(),
}));

describe('Release 2 storefront home', () => {
  it('renders the result-led hero and all six collection entry points', () => {
    mockUseGetProductCollectionsQuery.mockReturnValue({
      data: [
        {
          slug: 'blonde-and-tone',
          name: 'Blonde and Tone',
          title: 'Blonde and Tone',
          description: 'Tone brassiness, maintain brightness, and support blonde routines with verified Fanola-family products.',
          sortPriority: 10,
          routineRoles: ['cleanse', 'tone', 'nourish', 'protect'],
          supportedCategoryNames: ['Shampoo', 'Mask'],
          productCount: 4,
        },
      ],
      isLoading: false,
    });
    mockUseGetProductsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: '1',
            name: 'Wonder No Yellow Shampoo',
            image: 'https://example.com/shampoo.png',
            catalogGuidance: { professionalOnly: false, consumerRoutineRole: 'cleanse' },
          },
          {
            id: '2',
            name: 'Wonder No Yellow Mask',
            image: 'https://example.com/mask.png',
            catalogGuidance: { professionalOnly: false, consumerRoutineRole: 'nourish' },
          },
        ],
      },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Real hair results first. The routine that protects them second.')).toBeInTheDocument();
    expect(screen.getByText('Approved Tessa blonde result image goes here.')).toBeInTheDocument();
    expect(screen.getByText('Blonde and Tone')).toBeInTheDocument();
    expect(screen.getByText('Repair')).toBeInTheDocument();
    expect(screen.getByText('Curls')).toBeInTheDocument();
    expect(screen.getByText('Smooth and Anti-frizz')).toBeInTheDocument();
    expect(screen.getByText('Colour')).toBeInTheDocument();
    expect(screen.getByText('Extensions and Tools')).toBeInTheDocument();
  });
});
