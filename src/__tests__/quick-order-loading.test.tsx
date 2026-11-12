import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { baseApi } from '@/api/baseApi';
import StylistQuickOrderPage from '@/pages/stylist/StylistQuickOrderPage';
import en from '@/i18n/locales/en.json';

const addItem = vi.fn();
const product = { id: '1', name: 'QA color', price: 500, stylistPrice: 350, stock: 3, thumbnail: null };
let failRequest = false;
const { transport } = vi.hoisted(() => ({ transport: vi.fn() }));
// Use the real RTK Query lifecycle with a deterministic transport. This avoids
// jsdom's AbortSignal being mixed with Node's native Request implementation.
vi.mock('@/api/baseApi', async () => {
  const { createApi } = await import('@reduxjs/toolkit/query/react');
  return { API_TAGS: { Products: 'Products' }, baseApi: createApi({ reducerPath: 'api', baseQuery: transport, tagTypes: ['Products'], endpoints: () => ({}) }) };
});
vi.mock('@/hooks/useCart', () => ({ useCart: () => ({ addItem, items: [{ productId: '1', quantity: 2 }], itemCount: 2, subtotal: 700 }) }));
vi.mock('@/shared/components/Seo', () => ({ default: () => null }));
vi.mock('react-i18next', async original => ({ ...(await original<typeof import('react-i18next')>()), useTranslation: () => ({ t: (key: string, params: Record<string, unknown> = {}) => {
  const text = key.split('.').reduce<unknown>((value, part) => value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, en) || key;
  return String(text).replace(/{{(\w+)}}/g, (_, name) => String(params[name] ?? ''));
} }) }));

function makeStore() {
  return configureStore({ reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: () => ({ token: null }) }, middleware: getDefault => getDefault().concat(baseApi.middleware) });
}
let store: ReturnType<typeof makeStore>;
function renderPage() {
  return render(<StrictMode><Provider store={store}><MemoryRouter><StylistQuickOrderPage /></MemoryRouter></Provider></StrictMode>);
}
describe('Quick-order query lifecycle', () => {
  beforeEach(() => {
    store = makeStore(); failRequest = false; addItem.mockReset(); transport.mockReset();
    transport.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 15));
      return failRequest ? { error: { status: 503, data: { message: 'Unavailable' } } } : { data: { success: true, data: [product], meta: { current_page: 1, per_page: 25, total: 1, last_page: 1 } } };
    });
  });
  afterEach(() => { store.dispatch(baseApi.util.resetApiState());  });
  it('loads in StrictMode and limits additions to the remaining stock', async () => {
    renderPage();
    expect(await screen.findByText('QA color')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase quantity of QA color' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart: QA color' }));
    expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ id: '1', stylistPrice: 350, quantity: 3 }), 1);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('recovers from a failed request through Retry', async () => {
    failRequest = true;
    renderPage();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    failRequest = false;
    await userEvent.click(retry);
    await waitFor(() => expect(screen.getByText('QA color')).toBeInTheDocument());
  });
});
