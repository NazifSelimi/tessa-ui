/**
 * Design Lab — entry point at /design-lab
 *
 * Renders 5 Shop/ordering design concepts behind a version switcher so they
 * can be inspected and mixed. Products come from the LIVE catalog via
 * useLabProducts (real Fanola / Rr Line / Oro Therapy / No Yellow items,
 * images and prices); a static fallback keeps the lab working offline.
 * A Stylist/Customer toggle drives the role-aware pricing in every concept.
 *
 * This route is additive and isolated — it does not touch existing pages.
 */

import { lazy, Suspense, useState } from 'react';
import type { LabProduct, LabRole } from './mockData';
import { useLabProducts } from './useLabProducts';
import './design-lab.css';

const VersionOne = lazy(() => import('./VersionOne'));
const VersionTwo = lazy(() => import('./VersionTwo'));
const VersionThree = lazy(() => import('./VersionThree'));
const VersionFour = lazy(() => import('./VersionFour'));
const VersionFive = lazy(() => import('./VersionFive'));

export interface VersionProps {
  role: LabRole;
  products: LabProduct[];
}

const VERSIONS = [
  { n: 1, key: 'Pro Storefront', desc: 'The safe evolution of today\'s Shop: trust strip (pro pricing, free delivery, your rep), Professional Deals rail, refined wholesale product grid.', Comp: VersionOne },
  { n: 2, key: 'Rapid Restock', desc: 'The workhorse for weekly reorders: one-tap "repeat last order", dense list with steppers, live summary with savings-vs-retail and a free-delivery meter.', Comp: VersionTwo },
  { n: 3, key: 'Deals & Bundles', desc: 'Merchandising-first: deal cards lead with contents, per-item math and "you save" amounts; single products sit behind a secondary tab.', Comp: VersionThree },
  { n: 4, key: 'Stylist Landing', desc: 'The acquisition pitch for stylists you\'re registering: hero + benefits (incl. Tessa Academy) + how-it-works + deal previews, closing with a registration CTA.', Comp: VersionFour },
  { n: 5, key: 'Speed Order', desc: 'App-like, search-first ordering: dark command bar, one-tap "order again" tiles with qty badges, and an always-visible running cart. Built for mobile.', Comp: VersionFive },
] as const;

export default function DesignLabPage() {
  const [version, setVersion] = useState(1);
  const [role, setRole] = useState<LabRole>('stylist');
  const { products, live, loading } = useLabProducts();

  const active = VERSIONS.find((v) => v.n === version)!;
  const Comp = active.Comp;

  return (
    <div className="dl-root">
      {/* Switcher */}
      <div className="dl-switcher">
        <div className="dl-switcher__inner">
          <div className="dl-vbtns">
            {VERSIONS.map((v) => (
              <button
                key={v.n}
                className={`dl-vbtn ${version === v.n ? 'dl-vbtn--active' : ''}`}
                onClick={() => setVersion(v.n)}
                title={v.key}
              >
                <span>{v.n}</span>
                <small>{v.key}</small>
              </button>
            ))}
          </div>

          {/* Role toggle */}
          <div className="dl-vbtns" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>View pricing as:</span>
            {(['stylist', 'customer'] as const).map((r) => (
              <button
                key={r}
                className={`dl-vbtn ${role === r ? 'dl-vbtn--active' : ''}`}
                style={{ flexDirection: 'row' }}
                onClick={() => setRole(r)}
              >
                {r === 'stylist' ? '💈 Stylist' : '🧑 Customer'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dl-page">
        {/* Version caption */}
        <div
          className="dl-card dl-card--flat"
          style={{ padding: '12px 16px', marginBottom: 20, borderLeft: '4px solid var(--dl-pro)', background: 'var(--dl-pro-bg)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--dl-ink)' }}>Version {active.n} — {active.key}</strong>
            <span className={`dl-pill ${live ? 'dl-pill--save' : 'dl-pill--soft'}`}>
              {loading ? 'Loading catalog…' : live ? `● Live catalog · ${products.length} products` : 'Demo data (API offline)'}
            </span>
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>{active.desc}</div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }} className="dl-muted">Loading live catalog…</div>
        ) : (
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading concept…</div>}>
            <Comp role={role} products={products} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
