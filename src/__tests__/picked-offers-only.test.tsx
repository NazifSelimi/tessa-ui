/**
 * Only offers the customer picked count. The cart shows the offer used with a
 * remove (x), what to add for a picked offer, drops a replaced offer with a
 * notice, and asks "Use offer X and save Y?" for an offer the cart matches.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import en from '@/i18n/locales/en.json';
import cartReducer, { applyBundle, clearCart, declineBundle, removeBundle } from '@/features/cart/slice';

const applyBundleMock = vi.fn();
const removeBundleMock = vi.fn();
const declineBundleMock = vi.fn();
const infoMock = vi.fn();
let bundleIds: string[] = [];
let declinedBundleIds: string[] = [];

vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    bundleIds, declinedBundleIds,
    applyBundle: applyBundleMock, removeBundle: removeBundleMock, declineBundle: declineBundleMock,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options: Record<string, unknown> = {}) => {
      const text = key.split('.').reduce<any>((node, part) => node?.[part], en) ?? key;
      return String(text).replace(/{{(\w+)}}/g, (_, name) => String(options[name] ?? ''));
    },
  }),
}));

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal<typeof import('antd')>();
  return { ...antd, App: { ...antd.App, useApp: () => ({ message: { info: infoMock } }) } };
});

import CartOffers from '@/components/CartOffers';

const empty = { offersUsed: [], skippedBundles: [], replacedBundles: [], suggestedOffers: [] };

describe('cart offers: only picked offers count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bundleIds = [];
    declinedBundleIds = [];
  });

  it('shows the offer used and removes it with x', async () => {
    bundleIds = ['1'];
    render(<CartOffers quote={{ ...empty, offersUsed: [{ bundleId: '1', name: 'Duo', saving: 300 }] }} />);

    expect(screen.getByText(/Offer used: Duo/)).toBeInTheDocument();
    expect(screen.getByText(/300/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove offer Duo' }));
    expect(removeBundleMock).toHaveBeenCalledWith('1');
    expect(declineBundleMock).toHaveBeenCalledWith('1');
  });

  it('says what to add for a picked offer', () => {
    bundleIds = ['1'];
    render(<CartOffers quote={{ ...empty, skippedBundles: [{ bundleId: '1', name: 'Duo', reason: 'Add Mask to use Duo.', missing: [{ productId: '9', name: 'Mask', qty: 1 }] }] }} />);

    expect(screen.getByText('Add Mask to use Duo')).toBeInTheDocument();
  });

  it('drops an offer a later pick replaced and says so', async () => {
    bundleIds = ['1', '2'];
    render(<CartOffers quote={{ ...empty, replacedBundles: [{ bundleId: '1', name: 'Duo', byBundleId: '2', byName: 'Pair' }] }} />);

    await waitFor(() => expect(removeBundleMock).toHaveBeenCalledWith('1'));
    expect(infoMock).toHaveBeenCalledWith('Offer Duo was replaced by offer Pair (they share products).', 6);
  });

  it('asks to use a matching offer: Use offer picks it, No thanks declines it', async () => {
    const quote = { ...empty, suggestedOffers: [{ bundleId: '3', name: 'Duo', saving: 300, replaces: [] }] };
    const { unmount } = render(<CartOffers quote={quote} />);

    expect(await screen.findByText(/Use offer Duo and save/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Use offer' }));
    expect(applyBundleMock).toHaveBeenCalledWith('3');
    unmount();

    render(<CartOffers quote={quote} />);
    await userEvent.click(await screen.findByRole('button', { name: 'No thanks' }));
    expect(declineBundleMock).toHaveBeenCalledWith('3');
    expect(applyBundleMock).toHaveBeenCalledTimes(1);
  });

  it('does not ask again about a declined offer', () => {
    declinedBundleIds = ['3'];
    render(<CartOffers quote={{ ...empty, suggestedOffers: [{ bundleId: '3', name: 'Duo', saving: 300, replaces: [] }] }} />);

    expect(screen.queryByText(/Use offer Duo and save/)).not.toBeInTheDocument();
  });
});

describe('cart state: picked offers', () => {
  it('a new pick goes last, so it wins; remove and decline work; clearing the cart forgets both', () => {
    let state = cartReducer(undefined, applyBundle({ bundleId: '1' }));
    state = cartReducer(state, applyBundle({ bundleId: '2' }));
    state = cartReducer(state, applyBundle({ bundleId: '1' }));
    expect(state.bundleIds).toEqual(['2', '1']);

    state = cartReducer(state, removeBundle({ bundleId: '2' }));
    state = cartReducer(state, declineBundle({ bundleId: '5' }));
    expect(state.bundleIds).toEqual(['1']);
    expect(state.declinedBundleIds).toEqual(['5']);

    // Picking a declined offer later is a yes.
    state = cartReducer(state, applyBundle({ bundleId: '5' }));
    expect(state.declinedBundleIds).toEqual([]);

    state = cartReducer(state, declineBundle({ bundleId: '7' }));
    state = cartReducer(state, clearCart());
    expect(state.bundleIds).toEqual([]);
    expect(state.declinedBundleIds).toEqual([]);
  });
});
