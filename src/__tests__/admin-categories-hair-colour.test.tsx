import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage';

const update = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

vi.mock('@/features/products/api', () => ({
  useGetCategoriesQuery: () => ({
    data: [
      { id: '1', name: 'Hair Color', isHairColour: false },
      { id: '2', name: 'Shampoo', isHairColour: false },
    ],
    isLoading: false,
  }),
}));
vi.mock('@/features/admin/api', () => ({ useUpdateCategoryMutation: () => [update, { isLoading: false }] }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Admin → Categories: "Is hair colour" (#25, owner rule Q11)', () => {
  it('ticks a category as hair colour', async () => {
    render(<App><AdminCategoriesPage /></App>);

    fireEvent.click(screen.getByRole('switch', { name: 'adminCategories.isHairColour: Hair Color' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const { id, data } = (update.mock.calls[0] as unknown as [{ id: string; data: FormData }])[0];
    expect(id).toBe('1');
    expect(data.get('is_hair_colour')).toBe('1');
    expect(data.get('name')).toBe('Hair Color');
  });
});
