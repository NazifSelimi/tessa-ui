/**
 * Design Lab — shared primitives used across the 5 concepts.
 * Kept deliberately small so each version still owns its own layout/look.
 * Visual styling lives in design-lab.css (.dl- classes).
 */

import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import type { BundleType, LabProduct, LabRole } from './mockData';
import { FREE_DELIVERY_AT, priceFor } from './mockData';
import { formatPrice } from '@/shared/utils/formatPrice';

export const money = formatPrice;

/** Product tile: real catalog photo when available, gradient fallback otherwise. */
export function Thumb({ p, size = 56, radius = 12 }: { p: LabProduct; size?: number; radius?: number }) {
  if (p.image) {
    return (
      <img
        src={p.image}
        alt=""
        loading="lazy"
        style={{
          width: size,
          height: size,
          minWidth: size,
          borderRadius: radius,
          objectFit: 'contain',
          background: '#fff',
          border: '1px solid var(--dl-border)',
          padding: Math.max(2, size * 0.06),
          boxSizing: 'border-box',
        }}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: radius,
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(135deg, ${p.tone[0]}, ${p.tone[1]})`,
      }}
    >
      <span
        style={{
          width: size * 0.66,
          height: size * 0.66,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          fontSize: size * 0.32,
          background: 'rgba(255,255,255,0.6)',
        }}
      >
        {p.emoji}
      </span>
    </div>
  );
}

/** Role-aware price row: pro price highlighted, retail struck through. */
export function PriceBlock({
  p,
  role,
  size = 'md',
  showUnit,
}: {
  p: LabProduct;
  role: LabRole;
  size?: 'sm' | 'md' | 'lg';
  showUnit?: boolean;
}) {
  const pr = priceFor(p, role);
  const fontSize = size === 'lg' ? 19 : size === 'sm' ? 14 : 16;
  return (
    <div className="dl-price">
      <span className={`dl-price__now ${role === 'stylist' ? 'dl-price__now--pro' : ''}`} style={{ fontSize }}>
        {money(pr.current)}
      </span>
      {pr.original !== undefined && <s className="dl-price__was">{money(pr.original)}</s>}
      {showUnit && p.pack && <span className="dl-price__unit">/ {p.pack}</span>}
    </div>
  );
}

export function DealBadge({ type }: { type: BundleType }) {
  const map: Record<BundleType, { bg: string; fg: string }> = {
    'Professional Deal': { bg: 'var(--dl-pro-bg)', fg: 'var(--dl-pro-dark)' },
    'Hair Routine': { bg: 'var(--dl-green-bg)', fg: 'var(--dl-green-dark)' },
    'Stylist Pick': { bg: '#fef3c7', fg: '#b45309' },
  };
  const s = map[type];
  return (
    <span className="dl-pill" style={{ background: s.bg, color: s.fg }}>
      {type}
    </span>
  );
}

export function SavingsPill({ pct, dark = false }: { pct: number; dark?: boolean }) {
  if (pct <= 0) return null;
  return <span className={`dl-pill ${dark ? 'dl-pill--saveDark' : 'dl-pill--save'}`}>−{pct}%</span>;
}

/** Accessible, large-tap quantity stepper (joined pill). */
export function QtyStepper({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange: (n: number) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`dl-step ${size === 'sm' ? 'dl-step--sm' : ''}`}>
      <button aria-label="Decrease quantity" disabled={value === 0} onClick={() => onChange(Math.max(0, value - 1))}>
        <MinusOutlined />
      </button>
      <span>{value}</span>
      <button aria-label="Increase quantity" onClick={() => onChange(value + 1)}>
        <PlusOutlined />
      </button>
    </div>
  );
}

export function StockNote({ stock }: { stock: number }) {
  const dot = (color: string) => (
    <span style={{ width: 7, height: 7, borderRadius: 999, background: color, display: 'inline-block' }} />
  );
  if (stock === 0)
    return (
      <span style={{ color: 'var(--color-error)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {dot('var(--color-error)')} Out of stock
      </span>
    );
  if (stock < 25)
    return (
      <span style={{ color: '#b45309', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {dot('var(--color-warning)')} Low stock · {stock} left
      </span>
    );
  return (
    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {dot('var(--dl-green)')} In stock
    </span>
  );
}

/** Section heading with optional trailing action link. */
export function SectionHead({ title, action }: { title: string; action?: string }) {
  return (
    <div className="dl-sechead">
      <h2 className="dl-section-title">{title}</h2>
      {action && <a>{action} →</a>}
    </div>
  );
}

/** Progress toward the free-delivery threshold — drives bigger baskets. */
export function FreeDeliveryMeter({ total }: { total: number }) {
  const pct = Math.min(100, Math.round((total / FREE_DELIVERY_AT) * 100));
  const done = total >= FREE_DELIVERY_AT;
  return (
    <div className="dl-meter">
      <div className="dl-meter__track">
        <div className={`dl-meter__fill ${done ? 'dl-meter__fill--done' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="dl-meter__label">
        {done ? (
          <><strong>Free delivery unlocked</strong> 🎉</>
        ) : (
          <>Add <strong>{money(FREE_DELIVERY_AT - total)}</strong> more for free delivery</>
        )}
      </div>
    </div>
  );
}
