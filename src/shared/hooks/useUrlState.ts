/**
 * useState that is also kept in the page address (?key=value), so filters,
 * search, page number and the open tab survive a refresh and can be shared
 * as a link. Default values are left out of the address to keep it short.
 *
 * The address is updated in place (history.replaceState), so typing in a
 * search box does not add a Back-button step per letter or re-render the
 * router. Each write reads the current address first, so several values set
 * in one click all land.
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export type UrlStateValue = string | number | boolean;

export function parseUrlValue<T extends UrlStateValue>(
  raw: string | null,
  fallback: T,
  allowed?: readonly T[],
): T {
  if (raw === null) return fallback;
  let value: UrlStateValue;
  if (typeof fallback === 'number') {
    value = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(value)) return fallback;
  } else if (typeof fallback === 'boolean') {
    value = raw === '1' || raw === 'true';
  } else {
    value = raw;
  }
  if (allowed && !allowed.includes(value as T)) return fallback;
  return value as T;
}

export function writeUrlParam(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.get(key) === value) return;
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  // Keep the router's own history state so Back/Forward still work.
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

// Plain defaults ('' / 1 / false) mean any string / number / boolean; pass a
// type (and optionally the allowed values) for a fixed set of choices.
export function useUrlState(key: string, defaultValue: string): [string, Dispatch<SetStateAction<string>>];
export function useUrlState(key: string, defaultValue: number): [number, Dispatch<SetStateAction<number>>];
export function useUrlState(key: string, defaultValue: boolean): [boolean, Dispatch<SetStateAction<boolean>>];
export function useUrlState<T extends UrlStateValue>(key: string, defaultValue: T, allowed?: readonly T[]): [T, Dispatch<SetStateAction<T>>];
export function useUrlState<T extends UrlStateValue>(
  key: string,
  defaultValue: T,
  allowed?: readonly T[],
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => parseUrlValue(
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(key),
    defaultValue,
    allowed,
  ));

  useEffect(() => {
    writeUrlParam(key, value === defaultValue ? null : typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }, [key, value, defaultValue]);

  return [value, setValue];
}
