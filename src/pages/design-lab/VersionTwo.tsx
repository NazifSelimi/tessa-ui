/**
 * Version 2 — "Rapid Restock"
 * The workhorse: dense list-based ordering for stylists restocking many SKUs
 * fast, fed by the live catalog. One-tap "repeat last order", a live order
 * summary with savings and a free-delivery meter (right rail on desktop,
 * bottom bar on mobile). Reference feel: Faire / Ankorstore + Instacart.
 */

import { useMemo, useState } from 'react';
import { HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { cartTotals, lastOrderFor, priceFor } from './mockData';
import type { VersionProps } from './DesignLabPage';
import { categoriesOf } from './useLabProducts';
import { FreeDeliveryMeter, PriceBlock, QtyStepper, StockNote, Thumb, money } from './shared';

export default function VersionTwo({ role, products }: VersionProps) {
  const [cat, setCat] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});

  const categories = useMemo(() => categoriesOf(products), [products]);
  const lastOrder = useMemo(() => lastOrderFor(products), [products]);

  const rows = useMemo(
    () =>
      products.filter((p) => {
        if (search && !`${p.name} ${p.brand}`.toLowerCase().includes(search.toLowerCase())) return false;
        return cat === 'All' || p.category === cat;
      }),
    [products, cat, search],
  );

  const { count, total, saved } = useMemo(() => cartTotals(products, qty, role), [products, qty, role]);

  const lastOrderCount = Object.keys(lastOrder.items).length;
  const lastOrderTotal = products.reduce(
    (sum, p) => sum + (lastOrder.items[p.id] ?? 0) * priceFor(p, role).current,
    0,
  );

  const repeatLastOrder = () =>
    setQty((s) => {
      const next = { ...s };
      for (const [id, q] of Object.entries(lastOrder.items)) next[id] = (next[id] ?? 0) + q;
      return next;
    });

  return (
    <div>
      <header style={{ marginBottom: 16 }}>
        <span className="dl-kicker">Tessa Professional</span>
        <h1 className="dl-h1" style={{ marginTop: 6 }}>Quick restock</h1>
        <p className="dl-muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
          Tap quantities down the list — your order builds as you go.
        </p>
      </header>

      {/* Repeat last order */}
      <div
        className="dl-card"
        style={{ padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
      >
        <span
          style={{
            width: 40, height: 40, minWidth: 40, borderRadius: 12, display: 'grid', placeItems: 'center',
            background: 'var(--dl-pro-bg)', color: 'var(--dl-pro)', fontSize: 18,
          }}
        >
          <HistoryOutlined />
        </span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 750, fontSize: 14 }}>Your last order · {lastOrder.date}</div>
          <div className="dl-muted" style={{ fontSize: 12.5 }}>
            {lastOrderCount} products · {money(lastOrderTotal)}
          </div>
        </div>
        <button className="dl-btn dl-btn--pro dl-btn--sm" onClick={repeatLastOrder}>
          Repeat order
        </button>
      </div>

      <Input
        size="large"
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Find an item to add…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ borderRadius: 12, marginBottom: 12 }}
      />

      <div className="dl-chips" style={{ marginBottom: 16 }}>
        {categories.map((c) => (
          <button key={c} className={`dl-chip ${cat === c ? 'dl-chip--active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="dl-two">
        {/* Dense list */}
        <div className="dl-card" style={{ overflow: 'hidden' }}>
          {rows.map((p) => {
            const q = qty[p.id] ?? 0;
            return (
              <div key={p.id} className={`dl-row ${q > 0 ? 'dl-row--active' : ''}`}>
                <Thumb p={p} size={52} radius={12} />
                <div className="dl-row__main">
                  <div className="dl-row__name">{p.name}</div>
                  <div className="dl-row__sub">{p.brand} · {p.category}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                    <PriceBlock p={p} role={role} size="sm" />
                    <StockNote stock={p.stock} />
                  </div>
                </div>
                <QtyStepper size="sm" value={q} onChange={(n) => setQty({ ...qty, [p.id]: n })} />
              </div>
            );
          })}
          {rows.length === 0 && (
            <div style={{ padding: 28, textAlign: 'center' }} className="dl-muted">No matches for “{search}”.</div>
          )}
        </div>

        {/* Desktop sticky summary */}
        <aside className="dl-card" style={{ padding: 18, position: 'sticky', top: 84 }}>
          <h3 style={{ margin: '0 0 12px', fontWeight: 800, fontSize: 15 }}>Order summary</h3>
          {count === 0 ? (
            <p className="dl-muted" style={{ fontSize: 13, margin: 0 }}>
              No items yet. Tap <strong>+</strong> on any product or repeat your last order.
            </p>
          ) : (
            <>
              <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 4 }}>
                {products.filter((p) => (qty[p.id] ?? 0) > 0).map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, marginBottom: 7 }}>
                    <span className="dl-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: 'var(--dl-ink)' }}>{qty[p.id]}×</strong> {p.name}
                    </span>
                    <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {money(priceFor(p, role).current * (qty[p.id] ?? 0))}
                    </strong>
                  </div>
                ))}
              </div>

              <FreeDeliveryMeter total={total} />

              {role === 'stylist' && saved > 0 && (
                <div
                  style={{
                    background: 'var(--dl-green-bg)', color: 'var(--dl-green-dark)', borderRadius: 10,
                    padding: '8px 12px', fontSize: 12.5, fontWeight: 700, margin: '10px 0 2px',
                  }}
                >
                  You save {money(saved)} vs retail
                </div>
              )}

              <div
                style={{
                  borderTop: '1px solid var(--dl-border)', margin: '12px 0 12px', paddingTop: 12,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14 }}>Total · {count} items</span>
                <strong style={{ fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>{money(total)}</strong>
              </div>
              <button className="dl-btn dl-btn--green dl-btn--block">Review order</button>
            </>
          )}
        </aside>
      </div>

      {/* Mobile sticky order bar */}
      {count > 0 && (
        <div className="dl-orderbar dl-orderbar--mobileOnly">
          <div>
            <div className="dl-orderbar__total">{money(total)}</div>
            <div className="dl-orderbar__sub">
              {count} items{role === 'stylist' && saved > 0 ? ` · saving ${money(saved)}` : ''}
            </div>
          </div>
          <button className="dl-btn dl-btn--green">Review order →</button>
        </div>
      )}
    </div>
  );
}
