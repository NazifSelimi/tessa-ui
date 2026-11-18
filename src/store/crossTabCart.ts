import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { syncFromOtherTab } from '@/features/cart/slice';
import type { CartItem } from '@/types';

export const CART_STORAGE_KEY = 'persist:tessa_cart';

/** redux-persist stores each whitelisted field as a JSON string inside one JSON object. */
export function readPersistedCart(value: string | null): { items: CartItem[]; bundleIds: string[] } {
  try {
    const parsed = value ? (JSON.parse(value) as Record<string, string>) : {};
    const items = parsed.items ? (JSON.parse(parsed.items) as CartItem[]) : [];
    const bundleIds = parsed.bundleIds ? (JSON.parse(parsed.bundleIds) as string[]) : [];
    return { items: Array.isArray(items) ? items : [], bundleIds: Array.isArray(bundleIds) ? bundleIds : [] };
  } catch {
    return { items: [], bundleIds: [] };
  }
}

/**
 * Keeps every open tab on the same cart. Without it a second tab still holds the old
 * cart and writes it back to the device, so "Empty cart" or "Clear cart" seems to undo itself.
 * The browser only fires `storage` when the stored value really changes, so this cannot loop.
 */
export function followCartAcrossTabs(
  dispatch: Dispatch<UnknownAction>,
  target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const onStorage = (event: Event) => {
    const { key, newValue } = event as StorageEvent;
    if (key !== null && key !== CART_STORAGE_KEY) return;
    dispatch(syncFromOtherTab(readPersistedCart(key === null ? null : newValue)));
  };

  target.addEventListener('storage', onStorage);
  return () => target.removeEventListener('storage', onStorage);
}
