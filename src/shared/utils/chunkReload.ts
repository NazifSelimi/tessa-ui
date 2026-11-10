/**
 * After a new version of the site is deployed, the old page files (hashed
 * chunks) are gone. A tab that was opened before the deploy then fails the
 * first time it opens a page it has not loaded yet ("Failed to fetch
 * dynamically imported module") and the whole app showed "Something went
 * wrong". This reloads the page once, so the tab picks up the new version and
 * lands on the page that was being opened.
 */
import { lazy, type ComponentType } from 'react';

const RELOAD_MARK = 'tessa:new-version-reload-at';
/** A second failure this soon after a reload is a real error, not a deploy. */
const RELOAD_GUARD_MS = 15_000;
/** If the reload is cancelled (e.g. "Leave site?"), show the error after this. */
const RELOAD_GIVE_UP_MS = 8_000;

const CHUNK_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading (CSS )?chunk [\w-]+ failed|is not a valid JavaScript MIME type/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  return name === 'ChunkLoadError' || (typeof message === 'string' && CHUNK_ERROR.test(message));
}

function readMark(storage: Storage): number {
  const value = Number(storage.getItem(RELOAD_MARK));
  return Number.isFinite(value) ? value : 0;
}

/**
 * Reloads the page unless it already did so in the last few seconds.
 * Returns true when a reload was started. Without sessionStorage (blocked
 * site data) it never reloads, so it can never loop.
 */
export function reloadForNewVersion(
  now: number = Date.now(),
  reload: () => void = () => window.location.reload(),
): boolean {
  let storage: Storage;
  try {
    storage = window.sessionStorage;
    if (now - readMark(storage) < RELOAD_GUARD_MS) return false;
    storage.setItem(RELOAD_MARK, String(now));
  } catch {
    return false;
  }
  reload();
  return true;
}

/** React.lazy that reloads once when the page file is missing after a deploy. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same constraint as React.lazy
export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error) && reloadForNewVersion()) {
        // Keep the loading screen while the browser reloads; if the reload is
        // cancelled, fall through to the error screen with its reload button.
        await new Promise((resolve) => setTimeout(resolve, RELOAD_GIVE_UP_MS));
      }
      throw error;
    }
  });
}
