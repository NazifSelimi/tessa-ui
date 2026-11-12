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
    const markChecked = vi.fn(async () => {});
    const request = vi.fn(async () => ({ drafts: { en: null, mk: null, shq: null } }));
    render(<App><ProductFixEditor product={product} request={request} onSaved={onSaved} onDeleted={vi.fn()} markChecked={markChecked} /></App>);
    fireEvent.click(screen.getByRole('button', { name: 'Suggest descriptions (MK, SQ, EN)' }));
    await waitFor(() => expect((screen.getByLabelText('Description (Macedonian)') as HTMLTextAreaElement).value).toContain('шампон'));
    expect((screen.getByLabelText('Description (Albanian)') as HTMLTextAreaElement).value).toContain('shampo');
    expect((screen.getByLabelText('Description (English)') as HTMLTextAreaElement).value).toContain('shampoo');
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Save & remove from list/ }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(true));
    expect(markChecked).toHaveBeenCalled();
    const data = update.mock.calls[0][0].data as FormData;
    expect(data.get('translations[mk]')).toContain('Botugen Shampoo 300ml');
    expect(data.get('price')).toBeNull();
  });

  it('Ctrl/Cmd+S saves and removes the product from the list, and shows unsaved changes first', async () => {
    const onSaved = vi.fn(); const markChecked = vi.fn(async () => {});
    render(<App><ProductFixEditor product={product} request={vi.fn()} onSaved={onSaved} onDeleted={vi.fn()} markChecked={markChecked} /></App>);
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Botugen Shampoo 300ml new' } });
    expect(await screen.findByText('Unsaved changes')).toBeTruthy();
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    await waitFor(() => expect(markChecked).toHaveBeenCalled());
    expect(onSaved).toHaveBeenCalledWith(true);
    expect((update.mock.calls[0][0].data as FormData).get('name')).toBe('Botugen Shampoo 300ml new');
  });

  it('asks before deleting the product and names it', async () => {
    const onDeleted = vi.fn();
    render(<App><ProductFixEditor product={product} request={vi.fn()} onSaved={vi.fn()} onDeleted={onDeleted} markChecked={vi.fn()} /></App>);
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

  it('describes tools and testers by what they are, not care benefits', () => {
    const brush = templateDescription('mk', { name: 'Magic Curved Detangling Brush, Natural Bristles', brand: 'Other', category: 'Other' });
    expect(brush).toContain('четка за коса');
    expect(brush).not.toContain('Главни придобивки');
    expect(brush).not.toContain(' од Other');
    expect(templateDescription('en', { name: 'Hairstyle Net Set', category: 'Other' })).toContain('hair net');
    expect(templateDescription('en', { name: 'Keratin Star Mask Tester', category: 'Tester' })).toContain('shop tester');
    expect(templateDescription('shq', { name: 'Colour Application Brush', category: 'Other' })).toContain('furçë');
    expect(templateDescription('en', { name: 'Чешел за сечење', category: 'Other' })).toContain('comb');
  });
});
