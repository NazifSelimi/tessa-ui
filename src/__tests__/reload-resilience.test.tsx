import { Suspense, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '@/components/ErrorBoundary';
import { isChunkLoadError, lazyWithReload, reloadForNewVersion } from '@/shared/utils/chunkReload';
import { parseUrlValue, useUrlState } from '@/shared/hooks/useUrlState';

describe('page files missing after a deploy', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('recognises the browsers\' "missing page file" errors and nothing else', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/A-1.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Unable to preload CSS for /assets/a.css'))).toBe(true);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it('reloads once, then not again straight away (no reload loop)', () => {
    const reload = vi.fn();
    expect(reloadForNewVersion(1_000_000, reload)).toBe(true);
    expect(reloadForNewVersion(1_005_000, reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    // A later deploy, minutes on, may reload again.
    expect(reloadForNewVersion(1_300_000, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('shows a "new version" message instead of a generic crash when a reload already happened', async () => {
    window.sessionStorage.setItem('tessa:new-version-reload-at', String(Date.now()));
    const Page = lazyWithReload(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module: /assets/P.js')));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<ErrorBoundary><Suspense fallback="loading"><Page /></Suspense></ErrorBoundary>);
    expect(await screen.findByText('A new version is available')).toBeInTheDocument();
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('error screen inside a layout', () => {
  function Boom(): never { throw new Error('page crashed'); }

  it('clears when the page address changes', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Harness() {
      const [path, setPath] = useState('/admin/a');
      return (
        <>
          <button onClick={() => setPath('/admin/b')}>go</button>
          <ErrorBoundary resetKey={path}>{path === '/admin/a' ? <Boom /> : <p>page b</p>}</ErrorBoundary>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByText('page b')).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('filters kept in the page address', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('reads typed values and falls back on bad ones', () => {
    expect(parseUrlValue('3', 1)).toBe(3);
    expect(parseUrlValue('abc', 1)).toBe(1);
    expect(parseUrlValue('1', false)).toBe(true);
    expect(parseUrlValue('trash', 'orders', ['orders', 'trash'])).toBe('trash');
    expect(parseUrlValue('evil', 'orders', ['orders', 'trash'])).toBe('orders');
    expect(parseUrlValue(null, 'all')).toBe('all');
  });

  function Filters() {
    const [status, setStatus] = useUrlState('status', 'all');
    const [page, setPage] = useUrlState('page', 1);
    return (
      <button onClick={() => { setStatus('pending'); setPage(1); setPage(4); }}>
        {status}:{page}
      </button>
    );
  }

  it('restores values after a refresh and writes several at once', () => {
    window.history.replaceState({ idx: 0 }, '', '/admin/orders?status=shipped&page=2&other=keep');
    const first = render(<Filters />);
    expect(screen.getByText('shipped:2')).toBeInTheDocument();

    act(() => { fireEvent.click(screen.getByRole('button')); });
    const params = new URLSearchParams(window.location.search);
    expect(params.get('status')).toBe('pending');
    expect(params.get('page')).toBe('4');
    expect(params.get('other')).toBe('keep');
    expect(window.history.state).toEqual({ idx: 0 });

    // "Refresh": mount again from the address.
    first.unmount();
    render(<Filters />);
    expect(screen.getByText('pending:4')).toBeInTheDocument();
  });

  it('leaves default values out of the address', () => {
    window.history.replaceState(null, '', '/admin/orders?page=3');
    function Reset() {
      const [page, setPage] = useUrlState('page', 1);
      return <button onClick={() => setPage(1)}>{page}</button>;
    }
    render(<Reset />);
    act(() => { fireEvent.click(screen.getByRole('button')); });
    expect(window.location.search).toBe('');
  });
});
