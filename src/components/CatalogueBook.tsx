/**
 * A colour line's brand catalogue as a book: turn pages with the arrows,
 * a swipe or the arrow keys; every shade Tessa sells is clickable and can be
 * added to the cart from a small card. Opens on the page with the shade
 * being viewed, which is highlighted.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { App, Button, Popover, Spin } from 'antd';
import { LeftOutlined, RightOutlined, ShoppingCartOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PriceDisplay from '@/components/PriceDisplay';
import { useCart } from '@/hooks/useCart';
import { useGetProductByIdQuery } from '@/features/products/api';
import type { ShadeCatalogue } from '@/types';

type Spot = ShadeCatalogue['pages'][number]['spots'][number];

interface CatalogueBookProps {
  catalogue: ShadeCatalogue;
  currentId: string | number;
}

function SpotCard({ spot, onDone }: { spot: Spot; onDone: () => void }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { addItem } = useCart();
  const { data: product, isFetching } = useGetProductByIdQuery(spot.productId!, { skip: !spot.productId });
  const inStock = product ? (product.inStock ?? (product.quantity ?? 0) > 0) : Boolean(spot.inStock);

  return (
    <div className="catalogue-spot-card">
      <strong className="catalogue-spot-card__code">{spot.code}</strong>
      {spot.name && <span className="catalogue-spot-card__name">{spot.name}</span>}
      {isFetching && !product ? <Spin size="small" /> : product && <PriceDisplay product={product} />}
      <div className="catalogue-spot-card__actions">
        <Button
          type="primary"
          size="small"
          icon={<ShoppingCartOutlined />}
          disabled={!product || !inStock}
          onClick={() => {
            if (!product) return;
            addItem(product, 1);
            message.success(`${product.name} ${t('product.addedToCart')}`);
            onDone();
          }}
        >
          {inStock ? t('product.addToCart') : t('product.outOfStock')}
        </Button>
        <Link to={`/product/${spot.productId}`} onClick={onDone}>{t('product.catalogue.viewProduct')}</Link>
      </div>
    </div>
  );
}

export default function CatalogueBook({ catalogue, currentId }: CatalogueBookProps) {
  const { t } = useTranslation();
  const pages = catalogue.pages;
  const currentPage = useMemo(
    () => Math.max(0, pages.findIndex((page) => page.spots.some((spot) => spot.productId === String(currentId)))),
    [pages, currentId],
  );
  const [index, setIndex] = useState(currentPage);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  // Phones open zoomed in: a whole catalogue page is too small to judge a colour on a phone screen.
  const [zoomed, setZoomed] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 640px)').matches === true);
  const stageRef = useRef<HTMLDivElement>(null);
  const [openSpot, setOpenSpot] = useState<string | null>(null);
  const touchStart = useRef<number | null>(null);

  // Arriving on another shade: open the book at that shade's page.
  useEffect(() => { setIndex(currentPage); setOpenSpot(null); }, [currentPage]);

  // Zoomed in: centre the shade being viewed (or the page's top-left) in the visible area.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !zoomed) return;
    const pageEl = stage.querySelector<HTMLElement>('.catalogue-book__page');
    const spot = stage.querySelector<HTMLElement>('.catalogue-spot--current');
    if (!pageEl || !spot) {
      stage.scrollTo({ left: 0, top: 0 });
      return;
    }
    stage.scrollTo({
      left: pageEl.offsetLeft + spot.offsetLeft + spot.offsetWidth / 2 - stage.clientWidth / 2,
      top: pageEl.offsetTop + spot.offsetTop + spot.offsetHeight / 2 - stage.clientHeight / 2,
    });
  }, [index, zoomed]);

  const turn = (to: number) => {
    if (to < 0 || to >= pages.length || to === index) return;
    setDirection(to > index ? 'next' : 'prev');
    setIndex(to);
    setOpenSpot(null);
  };

  const page = pages[index];
  if (!page) return null;

  return (
    <section className="catalogue-book" aria-label={catalogue.title}>
      <div className="catalogue-book__header">
        <h3 className="catalogue-book__title">{catalogue.title}</h3>
        {pages.some((p) => p.spots.some((spot) => spot.productId)) && (
          <span className="catalogue-book__hint">{t(zoomed ? 'product.catalogue.dragHint' : 'product.catalogue.hint')}</span>
        )}
      </div>

      <div
        ref={stageRef}
        className={`catalogue-book__stage${zoomed ? ' catalogue-book__stage--zoomed' : ''}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') turn(index + 1);
          if (event.key === 'ArrowLeft') turn(index - 1);
        }}
        onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
        onTouchEnd={(event) => {
          if (zoomed || touchStart.current === null) return;
          const dx = event.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(dx) > 50) turn(dx < 0 ? index + 1 : index - 1);
          touchStart.current = null;
        }}
      >
        <div
          key={index}
          className={`catalogue-book__page catalogue-book__page--${direction}`}
          // As wide as fits both the stage width and its height, keeping the page's shape so spots stay on their swatches.
          style={{ aspectRatio: `${page.width} / ${page.height}`, width: `min(100%, calc(var(--catalogue-page-h) * ${page.width / page.height}))` }}
        >
          <img src={page.image} alt={`${catalogue.title} – ${index + 1}`} draggable={false} />
          {page.spots.filter((spot) => spot.productId).map((spot) => {
            const key = `${spot.code}-${spot.x}-${spot.y}`;
            const current = spot.productId === String(currentId);
            return (
              <Popover
                key={key}
                trigger="click"
                open={openSpot === key}
                onOpenChange={(open) => setOpenSpot(open ? key : null)}
                content={<SpotCard spot={spot} onDone={() => setOpenSpot(null)} />}
                destroyOnHidden
              >
                <button
                  type="button"
                  className={`catalogue-spot${current ? ' catalogue-spot--current' : ''}${spot.inStock === false ? ' catalogue-spot--out' : ''}`}
                  style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, width: `${spot.w * 100}%`, height: `${spot.h * 100}%` }}
                  aria-label={[spot.code, spot.name].filter(Boolean).join(' – ')}
                  title={[spot.code, spot.name].filter(Boolean).join(' – ')}
                />
              </Popover>
            );
          })}
        </div>
      </div>

      <div className="catalogue-book__controls">
        <Button shape="circle" icon={<LeftOutlined />} disabled={index === 0} onClick={() => turn(index - 1)} aria-label={t('product.catalogue.previous')} />
        <div className="catalogue-book__pages" role="tablist">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`catalogue-book__dot${i === index ? ' catalogue-book__dot--active' : ''}`}
              onClick={() => turn(i)}
              aria-label={t('product.catalogue.page', { page: i + 1, count: pages.length })}
            />
          ))}
        </div>
        <span className="catalogue-book__count">{index + 1} / {pages.length}</span>
        <Button shape="circle" icon={<RightOutlined />} disabled={index === pages.length - 1} onClick={() => turn(index + 1)} aria-label={t('product.catalogue.next')} />
        <Button
          className="catalogue-book__zoom"
          icon={zoomed ? <ZoomOutOutlined /> : <ZoomInOutlined />}
          onClick={() => setZoomed((value) => !value)}
        >
          {zoomed ? t('product.catalogue.zoomOut') : t('product.catalogue.zoomIn')}
        </Button>
      </div>
    </section>
  );
}
