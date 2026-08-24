/**
 * Version 5 — "Speed Order"
 * App-like, search-first ordering over the live catalog. A prominent dark
 * command bar, category chips, one-tap "order again" tiles with live qty
 * badges, and an always-visible running cart. Optimised for thumb speed on
 * mobile. Reference feel: Gopuff/DoorDash + a Linear-style command bar.
 */

import { useMemo, useState } from 'react';
import { SearchOutlined, ThunderboltFilled } from '@ant-design/icons';
import { cartTotals, lastOrderFor } from './mockData';
import type { VersionProps } from './DesignLabPage';
import { categoriesOf } from './useLabProducts';
import { PriceBlock, QtyStepper, StockNote, Thumb, money } from './shared';

export default function VersionFive({ role, products }: VersionProps) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [qty, setQty] = useState<Record<string, number>>({});

  const categories = useMemo(() => categoriesOf(products), [products]);

  const results = useMemo(
    () =>
      products.filter((p) => {
        if (search && !`${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(search.toLowerCase())) return false;
        return cat === 'All' || p.category === cat;
      }),
    [products, search, cat],
  );

  const { count, total, saved } = useMemo(() => cartTotals(products, qty, role), [products, qty, role]);

  const recent = useMemo(() => {
    const ids = new Set(Object.keys(lastOrderFor(products).items));
    const fromLastOrder = products.filter((p) => ids.has(p.id));
    return [...fromLastOrder, ...products.filter((p) => !ids.has(p.id))].slice(0, 6);
  }, [products]);

  const bump = (id: string) => setQty((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }));

  return (
    <div style={{ paddingBottom: 84 }}>
      {/* Command bar */}
      <div
        style={{
          borderRadius: 20, padding: '20px 18px', marginBottom: 20, color: '#fff',
          background:
            'radial-gradient(500px 240px at 90% -20%, rgba(124,58,237,0.5), transparent 60%), linear-gradient(135deg, #16162a, #23233c)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.01em' }}>
          <ThunderboltFilled style={{ color: '#a78bfa' }} /> Speed order
          <span style={{ fontWeight: 500, fontSize: 12, opacity: 0.7, marginLeft: 'auto' }}>
            {role === 'stylist' ? 'Pro pricing active' : 'Retail pricing'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 13, padding: '13px 16px' }}>
          <SearchOutlined style={{ color: 'var(--color-text-muted)', fontSize: 18 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a product, brand or category…"
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 16, color: 'var(--dl-ink)', background: 'transparent', minWidth: 0 }}
          />
          {search && <span style={{ color: 'var(--color-text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>{results.length} found</span>}
        </div>
        <div className="dl-chips" style={{ marginTop: 12, paddingBottom: 0 }}>
          {categories.map((c) => (
            <button
              key={c}
              className={`dl-chip ${cat === c ? 'dl-chip--onDarkActive' : 'dl-chip--onDark'}`}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Order again — one tap adds one unit */}
      {!search && (
        <section style={{ marginBottom: 20 }}>
          <div className="dl-sechead">
            <h2 className="dl-section-title">Order again</h2>
            <span className="dl-muted" style={{ fontSize: 12.5 }}>Tap to add 1</span>
          </div>
          <div className="dl-rail">
            {recent.map((p) => {
              const q = qty[p.id] ?? 0;
              return (
                <button
                  key={p.id}
                  className="dl-card dl-card--hover"
                  style={{ width: 138, padding: 12, cursor: 'pointer', textAlign: 'left', position: 'relative', border: q > 0 ? '1px solid var(--dl-pro)' : undefined }}
                  onClick={() => bump(p.id)}
                >
                  {q > 0 && (
                    <span
                      style={{
                        position: 'absolute', top: 8, right: 8, minWidth: 22, height: 22, borderRadius: 999,
                        background: 'var(--dl-pro)', color: '#fff', fontSize: 12, fontWeight: 800,
                        display: 'grid', placeItems: 'center', padding: '0 6px', zIndex: 1,
                      }}
                    >
                      {q}
                    </span>
                  )}
                  <Thumb p={p} size={46} radius={12} />
                  <div style={{ fontSize: 12.5, fontWeight: 650, marginTop: 8, height: 34, overflow: 'hidden', lineHeight: 1.3 }}>
                    {p.name}
                  </div>
                  <PriceBlock p={p} role={role} size="sm" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Results list */}
      <section className="dl-card" style={{ overflow: 'hidden' }}>
        {results.map((p) => {
          const q = qty[p.id] ?? 0;
          return (
            <div key={p.id} className={`dl-row ${q > 0 ? 'dl-row--active' : ''}`}>
              <Thumb p={p} size={50} radius={12} />
              <div className="dl-row__main">
                <div className="dl-row__name">{p.name}</div>
                <div className="dl-row__sub" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {p.brand} · {p.category} <StockNote stock={p.stock} />
                </div>
                <div style={{ marginTop: 3 }}>
                  <PriceBlock p={p} role={role} size="sm" />
                </div>
              </div>
              {q === 0 ? (
                <button className="dl-btn dl-btn--green dl-btn--sm" disabled={p.stock === 0} onClick={() => bump(p.id)}>
                  + Add
                </button>
              ) : (
                <QtyStepper size="sm" value={q} onChange={(n) => setQty({ ...qty, [p.id]: n })} />
              )}
            </div>
          );
        })}
        {results.length === 0 && (
          <div style={{ padding: 28, textAlign: 'center' }} className="dl-muted">No matches for “{search}”.</div>
        )}
      </section>

      {/* Always-visible running cart */}
      <div className="dl-orderbar">
        <div>
          <div className="dl-orderbar__total">{money(total)}</div>
          <div className="dl-orderbar__sub">
            {count === 0
              ? 'Your order is empty'
              : `${count} item${count === 1 ? '' : 's'}${role === 'stylist' && saved > 0 ? ` · saving ${money(saved)}` : ''}`}
          </div>
        </div>
        <button className="dl-btn dl-btn--green" disabled={count === 0}>Checkout →</button>
      </div>
    </div>
  );
}
