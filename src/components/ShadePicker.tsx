/**
 * Shade picker for a colour line (product family): a row of hair-swatch tiles
 * plus an "All shades" grid. Each shade is its own product, so picking one
 * opens that product's page.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input, Modal, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ProductShade } from '@/types';

const { Text } = Typography;

interface ShadePickerProps {
  currentId: string | number;
  shades: ProductShade[];
}

const shadeLabel = (shade: ProductShade) => shade.shadeCode || shade.shadeName || shade.name;

function ShadeTile({ shade, active, onPick }: { shade: ProductShade; active: boolean; onPick?: () => void }) {
  const { t } = useTranslation();
  const title = [shade.shadeCode, shade.shadeName].filter(Boolean).join(' – ') || shade.name;

  return (
    <Link
      to={`/product/${shade.id}`}
      replace
      onClick={onPick}
      className={`shade-tile${active ? ' shade-tile--active' : ''}${shade.inStock ? '' : ' shade-tile--out'}`}
      aria-current={active ? 'true' : undefined}
      title={shade.inStock ? title : `${title} · ${t('product.outOfStock')}`}
      data-shade-id={shade.id}
    >
      <span className="shade-tile__swatch">
        {shade.swatch ? <img src={shade.swatch} alt="" loading="lazy" /> : null}
      </span>
      <span className="shade-tile__code">{shadeLabel(shade)}</span>
    </Link>
  );
}

export default function ShadePicker({ currentId, shades }: ShadePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rowRef = useRef<HTMLDivElement>(null);
  const current = shades.find((shade) => String(shade.id) === String(currentId));

  // Keep the selected shade in view when arriving from another shade.
  useEffect(() => {
    const tile = rowRef.current?.querySelector<HTMLElement>(`[data-shade-id="${currentId}"]`);
    if (tile && rowRef.current) {
      rowRef.current.scrollLeft = tile.offsetLeft - rowRef.current.clientWidth / 2 + tile.clientWidth / 2;
    }
  }, [currentId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return shades;
    return shades.filter((shade) => [shade.shadeCode, shade.shadeName, shade.name].some((value) => value?.toLowerCase().includes(query)));
  }, [search, shades]);

  if (shades.length < 2) return null;

  return (
    <div className="shade-picker">
      <div className="shade-picker__header">
        <Text>
          {t('product.shade')}:{' '}
          <strong>{current ? [current.shadeCode, current.shadeName].filter(Boolean).join(' – ') : '—'}</strong>
        </Text>
        <button type="button" className="shade-picker__all" onClick={() => setOpen(true)}>
          {t('product.allShades', { count: shades.length })}
        </button>
      </div>
      <div className="shade-picker__row" ref={rowRef}>
        {shades.map((shade) => (
          <ShadeTile key={shade.id} shade={shade} active={String(shade.id) === String(currentId)} />
        ))}
      </div>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={720}
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
        <div className="shade-picker__grid">
          {filtered.map((shade) => (
            <div key={shade.id} className="shade-picker__grid-item">
              <ShadeTile shade={shade} active={String(shade.id) === String(currentId)} onPick={() => setOpen(false)} />
              {shade.shadeName && shade.shadeCode && <span className="shade-picker__name">{shade.shadeName}</span>}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
