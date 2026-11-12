/**
 * Version 3 — "Deals & Bundles"
 * Treats bundles as the primary business tool: big merchandised deal cards
 * built around the real assortment (Fanola color, No Yellow bleach, care
 * routines) lead with contents, savings and per-item math; single products
 * sit behind a secondary tab. Reference feel: wholesale deal pages + Faire
 * curated collections.
 */

import { useState } from 'react';
import { BUNDLES, savingsPct, type BundleType } from './mockData';
import type { VersionProps } from './DesignLabPage';
import { DealBadge, PriceBlock, SavingsPill, Thumb, money } from './shared';

const TYPE_ORDER: { type: BundleType; sub: string }[] = [
  { type: 'Professional Deal', sub: 'Stock up & save — built for salons' },
  { type: 'Stylist Pick', sub: 'Curated by Tessa Academy' },
  { type: 'Hair Routine', sub: 'Resell to your clients at home' },
];

export default function VersionThree({ role, products }: VersionProps) {
  const [tab, setTab] = useState<'deals' | 'products'>('deals');

  const maxSave = Math.max(...BUNDLES.map((b) => savingsPct(b.was, b.price)));

  return (
    <div>
      {/* Compact stats banner */}
      <section className="dl-hero" style={{ padding: '26px 22px', marginBottom: 20 }}>
        <span className="dl-hero__badge">Tessa Professional · Deals</span>
        <h1 style={{ fontSize: 28, margin: '12px 0 6px' }}>Bundle up. Save up to {maxSave}%.</h1>
        <p>Bigger orders, bigger margins. Every bundle is priced below buying the items separately.</p>
        <div className="dl-hero__stats">
          <div className="dl-hero__stat"><strong>{BUNDLES.length}</strong><span>active deals</span></div>
          <div className="dl-hero__stat"><strong>−{maxSave}%</strong><span>top saving</span></div>
          <div className="dl-hero__stat"><strong>1–2 days</strong><span>delivery</span></div>
        </div>
      </section>

      {/* Tabs */}
      <div
        style={{
          display: 'inline-flex', background: '#fff', border: '1px solid var(--dl-border)',
          borderRadius: 12, padding: 4, marginBottom: 20,
        }}
      >
        {(['deals', 'products'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              border: 'none', cursor: 'pointer', borderRadius: 9, padding: '8px 18px', fontWeight: 700, fontSize: 13.5,
              background: tab === t ? 'var(--dl-ink)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--dl-ink)',
              transition: 'all 140ms ease',
            }}
          >
            {t === 'deals' ? 'Deals & bundles' : 'All products'}
          </button>
        ))}
      </div>

      {tab === 'deals' ? (
        <>
          {TYPE_ORDER.map(({ type, sub }) => {
            const items = BUNDLES.filter((b) => b.type === type);
            if (!items.length) return null;
            return (
              <section key={type} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <DealBadge type={type} />
                  <span className="dl-muted" style={{ fontSize: 13 }}>{sub}</span>
                </div>
                <div className="dl-tiles-3">
                  {items.map((b) => {
                    const pct = savingsPct(b.was, b.price);
                    const perItem = Math.round(b.price / b.itemCount);
                    return (
                      <div key={b.id} className="dl-card dl-card--hover" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px 20px 18px', background: `linear-gradient(135deg, ${b.tone[0]}, ${b.tone[1]})`, color: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <span style={{ fontSize: 34 }}>{b.emoji}</span>
                            <SavingsPill pct={pct} dark />
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 19, marginTop: 12, letterSpacing: '-0.01em' }}>{b.name}</div>
                          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>{b.audience}</div>
                        </div>
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                          <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)' }}>{b.contents}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span className="dl-pill dl-pill--soft">{b.itemCount} items</span>
                            <span className="dl-pill dl-pill--soft">≈ {money(perItem)} / item</span>
                            <span className="dl-pill dl-pill--save">You save {money(b.was - b.price)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                            <strong style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{money(b.price)}</strong>
                            <s className="dl-price__was">{money(b.was)}</s>
                          </div>
                          <button className="dl-btn dl-btn--pro dl-btn--block">
                            {b.type === 'Hair Routine' ? 'View routine' : 'Add deal to order'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          <button className="dl-btn dl-btn--ghost dl-btn--block" onClick={() => setTab('products')}>
            Browse all products instead →
          </button>
        </>
      ) : (
        <div className="dl-grid">
          {products.map((p) => (
            <div key={p.id} className="dl-card dl-card--hover" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Thumb p={p} size={64} radius={14} />
              <div className="dl-pcard__brand" style={{ marginTop: 4 }}>{p.brand}</div>
              <div style={{ fontWeight: 650, fontSize: 13.5, lineHeight: 1.35, minHeight: 36 }}>{p.name}</div>
              <PriceBlock p={p} role={role} size="sm" />
              <button className="dl-btn dl-btn--green dl-btn--sm dl-btn--block" disabled={p.stock === 0} style={{ marginTop: 'auto' }}>
                {p.stock === 0 ? 'Out of stock' : 'Add to order'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
