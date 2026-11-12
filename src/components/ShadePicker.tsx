/**
 * Shade picker for a colour line (product family): a large preview of the
 * selected shade next to round swatches grouped by tone, plus an "All
 * shades" view with search. Each shade is its own product, so picking one
 * opens that product's page.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input, Modal, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ProductShade } from '@/types';
import { groupShades } from '@/shared/utils/shadeGroups';

const { Text } = Typography;

interface ShadePickerProps {
  currentId: string | number;
  shades: ProductShade[];
}

const shadeLabel = (shade: ProductShade) => shade.shadeCode || shade.shadeName || shade.name;

/** Generated swatches have a full-bleed texture for round dots next to the ribbon image ({id}.jpg -> {id}-dot.jpg). */
const dotUrl = (swatch: string) => swatch.replace(/(\/swatches\/silk[\w-]*\/\d+)\.jpg$/, '$1-dot.jpg');
const shadeTitle = (shade: ProductShade) => [shade.shadeCode, shade.shadeName].filter(Boolean).join(' – ') || shade.name;

function ShadeDot({ shade, active, onPick }: { shade: ProductShade; active: boolean; onPick?: () => void }) {
  const { t } = useTranslation();
  const title = shadeTitle(shade);

  return (
    <Link
      to={`/product/${shade.id}`}
      replace
      onClick={onPick}
      className={`shade-dot${active ? ' shade-dot--active' : ''}${shade.inStock ? '' : ' shade-dot--out'}`}
      aria-current={active ? 'true' : undefined}
      aria-label={shade.inStock ? title : `${title} · ${t('product.outOfStock')}`}
      title={shade.inStock ? title : `${title} · ${t('product.outOfStock')}`}
      data-shade-id={shade.id}
    >
      <span className="shade-dot__swatch">
        {shade.swatch ? (
          <img
            src={dotUrl(shade.swatch)}
            className={dotUrl(shade.swatch) === shade.swatch ? 'is-ribbon' : undefined}
            alt=""
            loading="lazy"
            onError={(event) => {
              // No dot texture: zoom into the ribbon image instead.
              const img = event.currentTarget;
              if (shade.swatch && img.src !== shade.swatch) { img.src = shade.swatch; img.classList.add('is-ribbon'); }
            }}
          />
        ) : null}
      </span>
      <span className="shade-dot__code">{shadeLabel(shade)}</span>
      {!shade.inStock && <span className="shade-dot__out">{t('product.outOfStock')}</span>}
    </Link>
  );
}

function ShadeGroups({ shades, currentId, onPick }: { shades: ProductShade[]; currentId: string | number; onPick?: () => void }) {
  const { t } = useTranslation();
  const groups = groupShades(shades);
  // A line without numbered tones (e.g. colour masks) needs no headings.
  const showHeadings = !(groups.length === 1 && groups[0].key === 'other');

  return (
    <>
      {groups.map((group) => (
        <section key={group.key} className="shade-group">
          {showHeadings && (
            <h4 className="shade-group__title">
              {t(`product.shadeGroups.${group.key}`)}
              <span className="shade-group__count">{group.shades.length}</span>
            </h4>
          )}
          <div className="shade-group__dots">
            {group.shades.map((shade) => (
              <ShadeDot key={shade.id} shade={shade} active={String(shade.id) === String(currentId)} onPick={onPick} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export default function ShadePicker({ currentId, shades }: ShadePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [find, setFind] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const current = shades.find((shade) => String(shade.id) === String(currentId));

  // Keep the selected shade in view when arriving from another shade.
  useEffect(() => {
    const panel = panelRef.current;
    const dot = panel?.querySelector<HTMLElement>(`[data-shade-id="${currentId}"]`);
    if (panel && dot) {
      panel.scrollTop = dot.offsetTop - panel.clientHeight / 2 + dot.clientHeight / 2;
      // Phones show each tone group as a swipeable row: bring the selected shade into the middle of its row.
      const row = dot.closest<HTMLElement>('.shade-group__dots');
      if (row && row.scrollWidth > row.clientWidth) {
        row.scrollLeft = dot.offsetLeft - row.clientWidth / 2 + dot.clientWidth / 2;
      }
    }
  }, [currentId]);

  const matchShades = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return shades;
    return shades.filter((shade) => [shade.shadeCode, shade.shadeName, shade.name].some((value) => value?.toLowerCase().includes(q)));
  };
  const filtered = useMemo(() => matchShades(search), [search, shades]); // eslint-disable-line react-hooks/exhaustive-deps
  const found = useMemo(() => matchShades(find), [find, shades]); // eslint-disable-line react-hooks/exhaustive-deps

  if (shades.length < 2) return null;

  return (
    <div className="shade-picker">
      <div className="shade-picker__header">
        <Text>
          {t('product.shade')}: <strong>{current ? shadeTitle(current) : '—'}</strong>
        </Text>
        <button type="button" className="shade-picker__all" onClick={() => setOpen(true)}>
          {t('product.allShades', { count: shades.length })}
        </button>
      </div>

      <div className="shade-picker__body">
        {current && (
          <figure className="shade-picker__preview">
            <figcaption className="shade-picker__preview-code">{shadeLabel(current)}</figcaption>
            <span className="shade-picker__preview-swatch">
              {current.swatch ? <img src={current.swatch} alt={shadeTitle(current)} /> : null}
            </span>
            {current.shadeName && current.shadeCode && <span className="shade-picker__preview-name">{current.shadeName}</span>}
          </figure>
        )}
        <div className="shade-picker__groups" ref={panelRef}>
          {shades.length > 12 && (
            <Input
              allowClear
              size="large"
              className="shade-picker__find"
              prefix={<SearchOutlined />}
              placeholder={t('product.searchShades')}
              value={find}
              onChange={(event) => setFind(event.target.value)}
              inputMode="search"
            />
          )}
          {find.trim() && found.length === 0 ? (
            <p className="shade-picker__none">{t('common.noResults', 'No results')}</p>
          ) : (
            <ShadeGroups shades={found} currentId={currentId} />
          )}
        </div>
      </div>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={720}
        className="shade-picker__modal"
        title={t('product.allShades', { count: shades.length })}
      >
        {shades.length > 12 && (
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t('product.searchShades')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ marginBottom: 16 }}
          />
        )}
        <div className="shade-picker__modal-groups">
          <ShadeGroups shades={filtered} currentId={currentId} onPick={() => setOpen(false)} />
        </div>
      </Modal>
    </div>
  );
}
