/**
 * Version 4 — "Stylist Landing"
 * The acquisition pitch: the page a newly invited stylist lands on. Sells the
 * pro account (wholesale prices on Fanola / Rr Line / Oro Therapy / No Yellow,
 * delivery, Tessa Academy support), explains how it works in 3 steps, previews
 * real deals and bestsellers, closes with a CTA into the existing
 * stylist-request flow. Reference feel: Faire "Sell wholesale" pages.
 */

import { ArrowRightOutlined, CheckCircleFilled } from '@ant-design/icons';
import { BUNDLES, savingsPct } from './mockData';
import type { VersionProps } from './DesignLabPage';
import { PriceBlock, SavingsPill, SectionHead, money } from './shared';

const BRAND_STRIP = ['FANOLA', 'NO YELLOW', 'ORO THERAPY', 'RR LINE'];

const BENEFITS = [
  {
    icon: '💜',
    title: 'Wholesale pricing, always',
    desc: 'On average around half of retail — automatically applied to your verified pro account. No codes, no haggling.',
  },
  {
    icon: '🚚',
    title: 'Delivered to your salon',
    desc: 'Order today, restock tomorrow. Free delivery on orders over 6.000 MKD, anywhere in North Macedonia.',
  },
  {
    icon: '🎓',
    title: 'Backed by Tessa Academy',
    desc: 'Trainings, color technique support and a personal rep on Viber/WhatsApp — you\'re never ordering alone.',
  },
];

const STEPS = [
  { title: 'Create your pro account', desc: 'Register with your name and salon details. Takes two minutes.' },
  { title: 'Get verified', desc: 'We confirm you work in the industry — usually the same day.' },
  { title: 'Order at pro prices', desc: 'The full catalog unlocks with wholesale pricing and pro-only deals.' },
];

export default function VersionFour({ role, products }: VersionProps) {
  const proDeals = BUNDLES.filter((b) => b.type === 'Professional Deal');
  const withImages = products.filter((p) => p.image);
  const bestsellers = (withImages.length >= 4 ? withImages : products).slice(0, 4);

  // Honest stats from the live catalog
  const discounts = products
    .filter((p) => p.retail > 0 && p.stylist < p.retail)
    .map((p) => Math.round(((p.retail - p.stylist) / p.retail) * 100));
  const maxDiscount = discounts.length ? Math.max(...discounts) : 50;

  return (
    <div>
      {/* Hero */}
      <section className="dl-hero" style={{ marginBottom: 22 }}>
        <span className="dl-hero__badge">💈 Tessa Professional — for stylists & salons</span>
        <h1>Wholesale prices for stylists.<br />Delivered to your salon.</h1>
        <p>
          The Italian professional brands you already work with — Fanola, No Yellow, Oro Therapy,
          Rr Line — at pro prices, ordered in minutes from your phone.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          <button className="dl-btn dl-btn--onDark" style={{ padding: '12px 22px' }}>
            Create your pro account <ArrowRightOutlined />
          </button>
          <button
            className="dl-btn"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', padding: '12px 22px' }}
          >
            Browse the catalog
          </button>
        </div>
        <div className="dl-hero__stats">
          <div className="dl-hero__stat"><strong>−{maxDiscount}%</strong><span>top pro discount</span></div>
          <div className="dl-hero__stat"><strong>1–2 days</strong><span>salon delivery</span></div>
          <div className="dl-hero__stat"><strong>400+</strong><span>pro products</span></div>
        </div>
        <div style={{ display: 'flex', gap: 22, marginTop: 26, flexWrap: 'wrap', opacity: 0.6, fontWeight: 800, letterSpacing: '0.12em', fontSize: 13 }}>
          {BRAND_STRIP.map((b) => <span key={b}>{b}</span>)}
        </div>
      </section>

      {/* Benefits */}
      <section style={{ marginBottom: 26 }}>
        <div className="dl-tiles-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="dl-card" style={{ padding: 20 }}>
              <span
                style={{
                  width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center',
                  fontSize: 20, background: 'var(--dl-pro-bg)', marginBottom: 12,
                }}
              >
                {b.icon}
              </span>
              <div style={{ fontWeight: 800, fontSize: 15.5, marginBottom: 5, letterSpacing: '-0.01em' }}>{b.title}</div>
              <p className="dl-muted" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ marginBottom: 26 }}>
        <SectionHead title="How it works" />
        <div className="dl-steps">
          {STEPS.map((s, i) => (
            <div key={s.title} className="dl-card dl-card--flat dl-steps__item">
              <div className="dl-steps__num">{i + 1}</div>
              <div className="dl-steps__title">{s.title}</div>
              <p className="dl-steps__desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Deals preview */}
      <section style={{ marginBottom: 26 }}>
        <SectionHead title="Deals waiting in your account" action="See all deals" />
        <div className="dl-rail">
          {proDeals.map((b) => (
            <div
              key={b.id}
              className="dl-card dl-card--hover"
              style={{
                width: 260, padding: 18, color: '#fff', border: 'none', display: 'flex', flexDirection: 'column',
                background: `linear-gradient(135deg, ${b.tone[0]}, ${b.tone[1]})`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <span style={{ fontSize: 26 }}>{b.emoji}</span>
                <SavingsPill pct={savingsPct(b.was, b.price)} dark />
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, marginTop: 10 }}>{b.name}</div>
              <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>{b.contents}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
                <strong style={{ fontSize: 19, fontVariantNumeric: 'tabular-nums' }}>{money(b.price)}</strong>
                <s style={{ opacity: 0.65, fontSize: 12 }}>{money(b.was)}</s>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bestsellers preview with pro prices */}
      <section style={{ marginBottom: 26 }}>
        <SectionHead title="What stylists order most" action="Full catalog" />
        <div className="dl-grid">
          {bestsellers.map((p) => (
            <div key={p.id} className="dl-card dl-card--hover dl-pcard">
              <div
                className="dl-pcard__media"
                style={p.image ? { background: '#fff', borderBottom: '1px solid var(--color-border-light)', height: 110 } : { background: `linear-gradient(135deg, ${p.tone[0]}, ${p.tone[1]})`, height: 110 }}
              >
                {p.image ? (
                  <img src={p.image} alt="" loading="lazy" style={{ maxHeight: '86%', maxWidth: '80%', objectFit: 'contain' }} />
                ) : (
                  <span className="dl-pcard__emoji">{p.emoji}</span>
                )}
              </div>
              <div className="dl-pcard__body">
                <div className="dl-pcard__brand">{p.brand}</div>
                <div className="dl-pcard__name">{p.name}</div>
                <PriceBlock p={p} role={role} />
                {role === 'stylist' && <span className="dl-pill dl-pill--pro" style={{ alignSelf: 'flex-start' }}>PRO price</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section
        className="dl-card"
        style={{
          padding: '26px 22px', textAlign: 'center', border: 'none', color: '#fff',
          background: 'linear-gradient(135deg, var(--dl-pro-dark), var(--dl-pro))',
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          Ready to stock your salon for less?
        </h2>
        <p style={{ opacity: 0.9, margin: '0 0 18px', fontSize: 14 }}>
          Free to join · verified same day · Tessa Academy support included
        </p>
        <button className="dl-btn dl-btn--onDark" style={{ padding: '12px 26px' }}>
          Create your pro account <ArrowRightOutlined />
        </button>
        <div style={{ marginTop: 14, fontSize: 12.5, opacity: 0.85, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span><CheckCircleFilled /> No minimum order</span>
          <span><CheckCircleFilled /> Pay on delivery</span>
          <span><CheckCircleFilled /> Personal rep included</span>
        </div>
      </section>
    </div>
  );
}
