import { Link } from 'react-router-dom';
import { ArrowRightOutlined } from '@ant-design/icons';
import type { StorefrontCollectionDirectoryItem } from '@/shared/config/storefrontCollections';

interface CollectionDirectoryProps {
  items: StorefrontCollectionDirectoryItem[];
  compact?: boolean;
}

function formatCount(productCount?: number): string {
  if (typeof productCount !== 'number') {
    return 'Waiting for live count';
  }

  if (productCount === 0) {
    return 'Product mapping in progress';
  }

  return `${productCount} product${productCount === 1 ? '' : 's'} ready`;
}

export default function CollectionDirectory({ items, compact = false }: CollectionDirectoryProps) {
  return (
    <div className={`collection-directory${compact ? ' collection-directory--compact' : ''}`}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.slug}
            to={`/collections/${item.slug}`}
            className="collection-card"
            style={{
              background: `${item.palette.glow}, ${item.palette.surface}`,
              borderColor: item.palette.border,
              color: item.palette.ink,
            }}
          >
            <div className="collection-card__topline">
              <span
                className={`collection-card__status collection-card__status--${item.launchState}`}
                style={item.launchState === 'live'
                  ? { background: 'rgba(184, 124, 19, 0.14)', color: item.palette.accent }
                  : undefined}
              >
                {item.launchState === 'live' ? 'Live now' : 'Preparing'}
              </span>
              <span className="collection-card__arrow">
                Explore <ArrowRightOutlined />
              </span>
            </div>

            <div
              className="collection-card__icon"
              style={{ color: item.palette.accent, borderColor: item.palette.border }}
            >
              <Icon size={20} strokeWidth={2.1} />
            </div>

            <h3 className="collection-card__title">{item.name}</h3>
            <p className="collection-card__description">{item.outcomeDescription}</p>

            <div className="collection-card__footer">
              <span className="collection-card__meta">{formatCount(item.productCount)}</span>
              <span className="collection-card__meta">
                {item.routineRoles.length} role{item.routineRoles.length === 1 ? '' : 's'}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
