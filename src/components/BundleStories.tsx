import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Gift, Pause, Play, ShoppingBag, X } from 'lucide-react';
import { useGetBundlesQuery } from '@/features/products/api';
import { useAuth } from '@/hooks/useAuth';
import { useFeature } from '@/shared/hooks/useFeature';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { StoreBundle } from '@/types';
import ColourDealPicker, { dealContext, useDealCount, useTierReward } from './ColourDealPicker';
import { bundlePrice, effectiveProductPrice, useAddBundle } from './BundleDealRail';
import './BundleStories.css';

/** How long one offer stays on screen before the next one opens. */
const STORY_MS = 6000;
const SEEN_KEY = 'tessa.seenOfferStories';

const storyKey = (bundle: StoreBundle) => `${bundle.id}:${bundle.updatedAt ?? ''}`;
const versioned = (url: string, bundle: StoreBundle) => `${url}?v=${encodeURIComponent(bundle.updatedAt ?? '')}`;

/** Picture made in Post Studio, else the first product photo. */
function coverOf(bundle: StoreBundle) {
  if (bundle.image) return versioned(bundle.image, bundle);
  return bundle.products.find((product) => product.image)?.image ?? null;
}

function readSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); }
}

/**
 * Salon offers as Instagram-style stories: a row of circles on /shop (stylists only)
 * that open a full-screen viewer, one offer per story, with its cart button.
 */
export default function BundleStories() {
  const { t } = useTranslation();
  const { isStylist } = useAuth();
  const offersOn = useFeature('bundles');
  const colourDealsOn = useFeature('colour_deals');
  const { data: bundles = [] } = useGetBundlesQuery(undefined, { skip: !isStylist });
  const [seen, setSeen] = useState(readSeen);
  const [openAt, setOpenAt] = useState<number | null>(null);

  // Unseen offers first, like Instagram; the order is fixed per page visit so circles don't jump.
  const [seenAtLoad] = useState(seen);
  const ordered = useMemo(() => [
    ...bundles.filter((bundle) => !seenAtLoad.has(storyKey(bundle))),
    ...bundles.filter((bundle) => seenAtLoad.has(storyKey(bundle))),
  ], [bundles, seenAtLoad]);

  const markSeen = useCallback((bundle: StoreBundle) => {
    setSeen((previous) => {
      if (previous.has(storyKey(bundle))) return previous;
      const next = new Set(previous).add(storyKey(bundle));
      try { localStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-300))); } catch { /* private mode */ }
      return next;
    });
  }, []);

  if (!isStylist || !(offersOn || colourDealsOn) || !ordered.length) return null;

  return <>
    <nav className="offer-stories" aria-label={t('bundles.stories')}>
      <ul className="offer-stories__row">
        {ordered.map((bundle, index) => {
          const cover = coverOf(bundle);
          return <li key={bundle.id}>
            <button type="button" className={`offer-stories__circle${seen.has(storyKey(bundle)) ? ' is-seen' : ''}`} onClick={() => setOpenAt(index)} aria-label={t('bundles.storyOpen', { name: bundle.name })}>
              <span className="offer-stories__ring">
                <span className="offer-stories__avatar">{cover ? <img src={cover} alt="" loading="lazy" decoding="async" /> : <Gift size={26} />}</span>
              </span>
              <span className="offer-stories__name">{bundle.name}</span>
            </button>
          </li>;
        })}
      </ul>
    </nav>
    {openAt !== null && <StoryViewer bundles={ordered} start={openAt} onSeen={markSeen} onClose={() => setOpenAt(null)} />}
  </>;
}

function StoryViewer({ bundles, start, onSeen, onClose }: { bundles: StoreBundle[]; start: number; onSeen: (bundle: StoreBundle) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const { isProfessional } = useAuth();
  const addBundle = useAddBundle();
  const reward = useTierReward();
  const countLabel = useDealCount();
  const [index, setIndex] = useState(start);
  const [held, setHeld] = useState(false);
  const [paused, setPaused] = useState(false);
  const [picking, setPicking] = useState<StoreBundle | null>(null);
  const touchY = useRef<number | null>(null);
  const bundle = bundles[index];
  const running = !held && !paused && !picking;

  const next = useCallback(() => setIndex((i) => { if (i + 1 >= bundles.length) { onClose(); return i; } return i + 1; }), [bundles.length, onClose]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => { if (bundle) onSeen(bundle); }, [bundle, onSeen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (picking) return;
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') next();
      else if (event.key === 'ArrowLeft') prev();
      else if (event.key === ' ') { event.preventDefault(); setPaused((p) => !p); }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [next, prev, onClose, picking]);

  if (!bundle) return null;

  const cover = coverOf(bundle);
  const isDeal = bundle.promotionType === 'mix_match';
  const deal = isDeal ? dealContext(bundle) : null;
  const regular = bundle.products.reduce((sum, product) => sum + effectiveProductPrice(product, isProfessional) * product.quantity, 0);
  const price = bundlePrice(bundle, isProfessional);
  const saved = Math.max(0, regular - price);
  const off = regular > 0 ? Math.round((saved / regular) * 100) : 0;
  const isGift = bundle.promotionType === 'bonus_items';
  const top = bundle.tiers?.[bundle.tiers.length - 1];
  const badge = isDeal ? (top && top.free > 0 ? `${top.min}+${top.free}` : null) : isGift ? t('bundles.gift') : off > 0 ? `-${off}%` : null;
  const photos = bundle.products.filter((product) => product.image).slice(0, 4);

  const act = () => { if (isDeal) setPicking(bundle); else { addBundle(bundle); next(); } };

  return <>{createPortal(<div className={`story-viewer${picking ? ' is-hidden' : ''}`} role="dialog" aria-modal="true" aria-label={bundle.name}
    onTouchStart={(event) => { touchY.current = event.touches[0].clientY; }}
    onTouchEnd={(event) => { if (touchY.current !== null && event.changedTouches[0].clientY - touchY.current > 90) onClose(); touchY.current = null; }}>
    <button type="button" className="story-viewer__backdrop" aria-label={t('bundles.storyClose')} onClick={onClose} />
    <button type="button" className="story-viewer__arrow story-viewer__arrow--prev" onClick={prev} disabled={index === 0} aria-label={t('bundles.storyPrev')}><ChevronLeft size={26} /></button>
    <article className="story-viewer__frame" key={bundle.id}>
      {cover && <img className="story-viewer__blur" src={cover} alt="" aria-hidden="true" />}
      <div className="story-viewer__media">
        {cover
          ? <img src={cover} alt={bundle.name} decoding="async" />
          : <div className={`story-viewer__collage story-viewer__collage--${photos.length}`}>{photos.map((product) => <img key={product.id} src={product.image ?? ''} alt="" />)}{!photos.length && <Gift size={64} />}</div>}
      </div>

      <div className="story-viewer__top">
        <div className="story-viewer__bars">
          {bundles.map((item, i) => <span key={item.id} className="story-viewer__bar">
            <span className={i < index ? 'is-done' : i === index ? 'is-active' : ''}
              style={i === index ? { animationDuration: `${STORY_MS}ms`, animationPlayState: running ? 'running' : 'paused' } : undefined}
              onAnimationEnd={i === index ? next : undefined} />
          </span>)}
        </div>
        <div className="story-viewer__head">
          <span className="story-viewer__brand">TESSA · {t('bundles.salonOffer')}</span>
          <span className="story-viewer__count">{index + 1}/{bundles.length}</span>
          <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? t('bundles.storyPlay') : t('bundles.storyPause')}>{paused ? <Play size={20} /> : <Pause size={20} />}</button>
          <button type="button" onClick={onClose} aria-label={t('bundles.storyClose')}><X size={24} /></button>
        </div>
      </div>

      {/* Tap left = back, right = next, hold = pause. */}
      <div className="story-viewer__taps"
        onPointerDown={() => setHeld(true)} onPointerUp={() => setHeld(false)} onPointerLeave={() => setHeld(false)} onPointerCancel={() => setHeld(false)}>
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={prev} />
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={next} />
      </div>

      <div className="story-viewer__info">
        {badge && <span className="story-viewer__badge">{isGift && <Gift size={14} />}{badge}</span>}
        <h2>{bundle.name}</h2>
        {isDeal && deal
          ? <ol className="story-viewer__steps">{(bundle.tiers ?? []).map((tier) => <li key={tier.min}><strong>{countLabel(tier.min, deal.isColour)}</strong><span>{reward(tier, deal)}</span></li>)}</ol>
          : <div className="story-viewer__price"><strong>{formatPrice(price)}</strong>{saved > 0 && <s>{formatPrice(regular)}</s>}</div>}
        <button type="button" className="story-viewer__cta" onClick={act}>
          {isDeal ? <Gift size={18} /> : <ShoppingBag size={18} />}
          {isDeal ? (deal?.isColour ? t('bundles.pickColours') : t('bundles.pickProducts')) : t('bundles.add')}
        </button>
      </div>
    </article>
    <button type="button" className="story-viewer__arrow story-viewer__arrow--next" onClick={next} aria-label={t('bundles.storyNext')}><ChevronRight size={26} /></button>
  </div>, document.body)}
  {/* The shade picker is an antd modal: the story hides while it is open and comes back after. */}
  {picking && <ColourDealPicker bundle={picking} open onClose={() => setPicking(null)} />}
  </>;
}
