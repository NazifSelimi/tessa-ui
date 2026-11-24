import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { message } from 'antd';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

const run = vi.fn();
const schema = {
  entities: [{
    key: 'products',
    label: 'Products',
    default_sort: { field: 'id', dir: 'desc' },
    fields: [
      { name: 'price', label: 'Price', type: 'number', operators: ['eq', 'lt', 'lte', 'between', 'empty'], comparable: true },
      { name: 'stylist_price', label: 'Stylist price', type: 'number', operators: ['eq', 'lt', 'lte', 'between', 'empty'], comparable: true },
      { name: 'quantity', label: 'Stock', type: 'number', operators: ['eq', 'lte', 'between'], comparable: true },
    ],
    columns: [{ key: 'id', label: 'ID', type: 'number' }, { key: 'name', label: 'Name', type: 'text' }, { key: 'price', label: 'Price', type: 'money', sort: 'price' }],
    presets: [{ key: 'price_below_stylist', label: 'Price below stylist price', filter: { logic: 'and', conditions: [{ field: 'price', op: 'lt', value: { field: 'stylist_price' } }] } }],
  }],
};

vi.mock('@/features/admin/queryToolApi', () => ({
  useGetQuerySchemaQuery: () => ({ data: schema, isLoading: false }),
  useGetSavedQueriesQuery: () => ({ data: [] }),
  useLazyRunQueryQuery: () => [run, { data: { rows: [{ id: 7, name: 'Cheap shampoo', price: 300 }], meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 } }, isFetching: false }],
  useSaveQueryMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteSavedQueryMutation: () => [vi.fn()],
}));

import AdminQueryPage from '@/pages/admin/AdminQueryPage';

describe('Admin query tool', () => {
  // antd draws messages a moment later in its own React root; if that happens after this
  // file has finished, the run fails with "window is not defined". A spy keeps it in the test.
  let warning: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warning = vi.spyOn(message, 'warning').mockImplementation(() => undefined as never); });
  afterEach(() => { cleanup(); run.mockClear(); vi.restoreAllMocks(); });

  it('runs the "price below stylist price" preset as a field-vs-field filter and shows the rows', async () => {
    render(<MemoryRouter><AdminQueryPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Price below stylist price' }));

    expect(run).toHaveBeenCalledWith(expect.objectContaining({
      entity: 'products',
      filter: { logic: 'and', conditions: [{ field: 'price', op: 'lt', value: { field: 'stylist_price' } }] },
      page: 1,
    }));
    expect(screen.getByText(/Price < Stylist price/)).toBeInTheDocument();
    expect(await screen.findByText('Cheap shampoo')).toBeInTheDocument();
    expect(screen.getByText('1 products found')).toBeInTheDocument();
  });

  it('does not run while a value is missing', () => {
    render(<MemoryRouter><AdminQueryPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Condition/ }));
    fireEvent.click(screen.getByRole('button', { name: /Run/ }));
    expect(run).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith('Fill in every value first.');
  });
});
