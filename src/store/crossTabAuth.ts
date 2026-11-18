import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { logout, setCredentials } from '@/features/auth/slice';
import type { User } from '@/types';

export const AUTH_STORAGE_KEY = 'persist:tessa_auth';

function parseField<T>(raw: unknown): T | null {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * redux-persist keeps each whitelisted field as a JSON string inside one JSON object.
 * Returns the token and user another tab wrote, or nulls when it signed out.
 */
export function readPersistedAuth(value: string | null): { token: string | null; user: User | null } {
  if (!value) return { token: null, user: null };
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return { token: parseField<string>(parsed.token), user: parseField<User>(parsed.user) };
  } catch {
    return { token: null, user: null };
  }
}

/**
 * Makes every open tab follow a sign-in, sign-out or token change made in another tab,
 * so a tab never keeps acting as a user who has signed out elsewhere.
 */
export function followAuthAcrossTabs(
  dispatch: Dispatch<UnknownAction>,
  getToken: () => string | null,
  target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const onStorage = (event: Event) => {
    const { key, newValue } = event as StorageEvent;
    // key === null means the whole storage was cleared.
    if (key !== null && key !== AUTH_STORAGE_KEY) return;

    const { token, user } = readPersistedAuth(key === null ? null : newValue);
    if (token === getToken()) return;

    if (token && user) dispatch(setCredentials({ token, user }));
    else dispatch(logout());
  };

  target.addEventListener('storage', onStorage);
  return () => target.removeEventListener('storage', onStorage);
}
