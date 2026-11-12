import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, describe, it, expect, vi } from 'vitest';
import ProductFixEditor from '@/features/admin/ProductFixEditor';
import { templateDescription } from '@/features/admin/descriptionDraft';

const update = vi.fn();
vi.mock('@/features/products/api', () => ({
  useGetBrandsQuery: () => ({ data: [{ id: '1', name: 'Fanola' }] }),
  useGetCategoriesQuery: () => ({ data: [{ id: '2', name: 'Shampoo' }] }),
}));
vi.mock('@/features/admin/api', () => ({
  useDeleteProductMutation: () => [() => ({ unwrap: async () => undefined }), { isLoading: false }],
  useUpdateProductMutation: () => [(arg: unknown) => { update(arg); return { unwrap: async () => ({}) }; }, { isLoading: false }],
}));

const product = { id: 7, name: 'Botugen Shampoo 300ml', brand: 'Fanola', category: 'Shampoo', brand_id: 1, category_id: 2, quantity: 4, price: '900', stylist_price: '700', visible_to_guests: true, visible_to_customers: true, visible_to_stylists: true, descriptions: { en: '', mk: '', shq: '' } };

describe('Fix products inline editor', () => {
  afterEach(() => { cleanup(); update.mockReset(); });

  it('fills a template draft without saving, then saves only what changed and moves on', async () => {
    const onSaved = vi.fn();
    const request = vi.fn(async () => ({ drafts: { en: null, mk: null, shq: null } }));
    render(<App><ProductFixEditor product={product} request={request} onSaved={onSaved} onDeleted={vi.fn()} /></App>);
    fireEvent.click(screen.getAllByRole('button', { name: 'Suggest description' })[0]);
    await waitFor(() => expect((screen.getByLabelText('Description (Macedonian)') as HTMLTextAreaElement).value).toContain('шампон'));
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Save & next/ }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(true));
    const data = update.mock.calls[0][0].data as FormData;
    expect(data.get('translations[mk]')).toContain('Botugen Shampoo 300ml');
    expect(data.get('price')).toBeNull();
  });

  it('asks before deleting the product and names it', async () => {
    const onDeleted = vi.fn();
    render(<App><ProductFixEditor product={product} request={vi.fn()} onSaved={vi.fn()} onDeleted={onDeleted} /></App>);
    fireEvent.click(screen.getByRole('button', { name: 'Delete product' }));
    expect(await screen.findByText('Delete “Botugen Shampoo 300ml”?')).toBeTruthy();
    expect(onDeleted).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete product' }).at(-1)!);
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });

  it('builds drafts in all three languages', () => {
    const input = { name: 'Real Argan Mask 1000ml', brand: 'Rr Line', category: 'Mask' };
    expect(templateDescription('en', input)).toContain('hair mask by Rr Line');
    expect(templateDescription('mk', input)).toContain('маска');
    expect(templateDescription('shq', input)).toContain('maskë');
    expect(templateDescription('en', input)).toContain('1000 ml');
  });
});
