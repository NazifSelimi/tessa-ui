import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import AdminHairQuizPage from '@/pages/admin/AdminHairQuizPage';

const updateMock = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

vi.mock('@/features/products/api', () => ({
  useGetHairProfileOptionsQuery: () => ({ data: { hairTypes: [{ id: 1, name: 'Straight' }], hairConcerns: [{ id: 1, name: 'Dryness' }] } }),
}));

vi.mock('@/features/admin/hairQuizApi', () => ({
  useGetHairQuizProductsQuery: () => ({
    data: {
      data: [{ id: 16, name: 'Bi Phase Oro Puro', brand: 'ORO THERAPY', category: 'Spray', quantity: 4, quizMode: 'auto', hairTypeIds: [1], hairConcernIds: [], image: null }],
      meta: { currentPage: 1, lastPage: 1, perPage: 25, total: 1 },
    },
    isFetching: false, isError: false, refetch: vi.fn(),
  }),
  useUpdateHairQuizProductMutation: () => [updateMock],
  usePreviewHairQuizMutation: () => [vi.fn(), { data: undefined, isLoading: false, reset: vi.fn() }],
}));

describe('admin hair quiz page', () => {
  it('lists products with their brand and category and saves a quiz mode change', async () => {
    render(<App><AdminHairQuizPage /></App>);

    expect(screen.getByText('Bi Phase Oro Puro')).toBeTruthy();
    expect(screen.getByText('ORO THERAPY · Spray')).toBeTruthy();

    fireEvent.click(screen.getAllByText('Hidden').at(-1)!);
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ id: 16, quiz_mode: 'hidden' }));
  });
});
