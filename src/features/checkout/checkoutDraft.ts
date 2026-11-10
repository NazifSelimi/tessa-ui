/**
 * The checkout form while it is being filled in, so a refresh (or the phone
 * reloading the tab) does not wipe the address the customer typed or send
 * them back from the review step. Kept in sessionStorage: it stays with this
 * tab only and is gone when the tab is closed or the order is placed.
 */
const KEY = 'tessa:checkout-draft';

export interface CheckoutDraft<T = Record<string, unknown>> {
  values: Partial<T>;
  /** 0 = shipping form, 1 = review. */
  step: 0 | 1;
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadCheckoutDraft<T>(): CheckoutDraft<T> | null {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutDraft<T>;
    if (!parsed || typeof parsed.values !== 'object' || parsed.values === null) return null;
    return { values: parsed.values, step: parsed.step === 1 ? 1 : 0 };
  } catch {
    return null;
  }
}

export function saveCheckoutDraft<T>(draft: CheckoutDraft<T>): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the form still works, it just isn't kept.
  }
}

export function clearCheckoutDraft(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Ignore, as above.
  }
}
