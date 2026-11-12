import type { WebStorage } from 'redux-persist';

/**
 * localStorage adapter for redux-persist.
 *
 * Replaces `redux-persist/lib/storage`, a CommonJS module whose default export
 * Vite 8 (Rolldown) hands back as the module wrapper instead of the storage
 * object, which crashed the app at start ("getItem is not a function").
 * Same behaviour as the original: promise-based, and a silent no-op when the
 * browser blocks storage (private mode, disabled site data).
 */
const resolveLocalStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__tessa_storage_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
};

const store = resolveLocalStorage();

export const browserStorage: WebStorage = {
  getItem: (key) => Promise.resolve(store ? store.getItem(key) : null),
  setItem: (key, value) => {
    try {
      store?.setItem(key, value);
    } catch {
      // Quota exceeded or storage revoked: keep the in-memory state only.
    }
    return Promise.resolve();
  },
  removeItem: (key) => {
    try {
      store?.removeItem(key);
    } catch {
      // Ignore, as above.
    }
    return Promise.resolve();
  },
};
