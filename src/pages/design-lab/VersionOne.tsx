/**
 * Version 1 — "Pro Storefront"
 * The safe evolution of the existing Shop page, dressed as a serious wholesale
 * storefront: a trust strip up top (pro pricing, free delivery, rep contact),
 * search + category chips, a Professional Deals rail, and a refined product
 * grid fed by the live catalog. Reference feel: SalonCentric / Sally Beauty Pro.
 */

import { useMemo, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { BUNDLES, priceFor, savingsPct } from './mockData';
import type { VersionProps } from './DesignLabPage';
import { categoriesOf } from './useLabProducts';
import { money, PriceBlock, QtyStepper, SavingsPill, SectionHead, StockNote } from './shared';

const TRUST = [
  { icon: '✓', label: 'Pro pricing active', sub: 'Applied to every product' },
  { icon: '🚚', label: 'Free delivery over 6.000 MKD', sub: '1–2 working days, all of MK' },
  { icon: '🏷️', label: 'Official distributor', sub: 'Fanola · Rr Line · Oro Therapy' },
  { icon: '💬', label: 'Your Tessa rep', sub: 'Viber / WhatsApp support' },
];

export default function VersionOne({ role, products }: VersionProps) {
  const [cat, setCat] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});

  const categories = useMemo(() => categoriesOf(products), [products]);
  const proDeals = BUNDLES.filter((b) => b.type === 'Professional Deal');

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (search && !`${p.name} ${p.brand}`.toLowerCase().includes(search.toLowerCase())) return false;
        return cat === 'All' || p.category === cat;
      }),
    [products, cat, search],
  );

  return (
    <div>
      <header style={{ marginBottom: 16 }}>
        <span className="dl-kicker">Tessa Professional</span>
        <h1 className="dl-h1" style={{ marginTop: 6 }}>Shop wholesale</h1>
        <p className="dl-muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
          Restock your salon in minutes — professional pricing applied automatically.
        </p>
      </header>

      {role === 'stylist' && (
        <div className="dl-trust">
          {TRUST.map((t) => (
            <div key={t.label} className="dl-trust__item">
              <span className="dl-trust__icon">{t.icon}</span>
              <div>
                <div className="dl-trust__label">{t.label}</div>
                <div className="dl-trust__sub">{t.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Input
        size="large"
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search products or brands…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ borderRadius: 12, marginBottom: 12 }}
      />

      <div className="dl-chips" style={{ marginBottom: 22 }}>
        {categories.map((c) => (
          <button key={c} className={`dl-chip ${cat === c ? 'dl-chip--active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      {/* Professional Deals rail */}
      <section style={{ marginBottom: 26 }}>
        <SectionHead title="Professional deals" action="View all" />
        <div className="dl-rail">
          {proDeals.map((b) => (
            <div
              key={b.id}
              className="dl-card dl-card--hover"
              style={{
                width: 270,
                padding: 18,
                background: `linear-gradient(135deg, ${b.tone[0]}, ${b.tone[1]})`,
                color: '#fff',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <span style={{ fontSize: 28 }}>{b.emoji}</span>
                <SavingsPill pct={savingsPct(b.was, b.price)} dark />
              </div>
              <div style={{ fontWeight: 800, fontSize: 17, marginTop: 10, letterSpacing: '-0.01em' }}>{b.name}</div>
              <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 3 }}>{b.contents}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
                <strong style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>{money(b.price)}</strong>
                <s style={{ opacity: 0.65, fontSize: 12.5 }}>{money(b.was)}</s>
              </div>
              <button className="dl-btn dl-btn--onDark dl-btn--block" style={{ marginTop: 12 }}>
                Add deal
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Product grid */}
      <section>
        <SectionHead title={`Products${cat !== 'All' ? ` · ${cat}` : ''}`} />
        <div className="dl-grid">
          {filtered.map((p) => {
            const pr = priceFor(p, role);
            const out = p.stock === 0;
            const q = qty[p.id] ?? 0;
            return (
              <div key={p.id} className="dl-card dl-card--hover dl-pcard">
                <div
                  className="dl-pcard__media"
                  style={p.image ? { background: '#fff', borderBottom: '1px solid var(--color-border-light)' } : { background: `linear-gradient(135deg, ${p.tone[0]}, ${p.tone[1]})` }}
                >
                  {p.image ? (
                    <img src={p.image} alt="" loading="lazy" style={{ maxHeight: '86%', maxWidth: '80%', objectFit: 'contain' }} />
                  ) : (
                    <span className="dl-pcard__emoji">{p.emoji}</span>
                  )}
                  {p.tag && (
                    <span className="dl-pill dl-pill--tag" style={{ position: 'absolute', top: 10, left: 10 }}>{p.tag}</span>
                  )}
                  {role === 'stylist' && pr.savingsPct > 0 && (
                    <span style={{ position: 'absolute', top: 10, right: 10 }}>
                      <SavingsPill pct={pr.savingsPct} />
                    </span>
                  )}
                </div>
                <div className="dl-pcard__body">
                  <div className="dl-pcard__brand">{p.brand}</div>
                  <div className="dl-pcard__name">{p.name}</div>
                  <PriceBlock p={p} role={role} />
                  <StockNote stock={p.stock} />
                  <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                    {q === 0 ? (
                      <button
                        className="dl-btn dl-btn--green dl-btn--sm dl-btn--block"
                        disabled={out}
                        onClick={() => setQty({ ...qty, [p.id]: 1 })}
                      >
                        {out ? 'Out of stock' : 'Add to order'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <QtyStepper value={q} onChange={(n) => setQty({ ...qty, [p.id]: n })} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="dl-card" style={{ padding: 28, textAlign: 'center' }}>
            <span className="dl-muted">No products match “{search}”.</span>
          </div>
        )}
      </section>
    </div>
  );
}
