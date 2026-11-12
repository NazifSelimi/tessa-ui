/** "Add" panel: widgets to drop on the post (texts, shop badges, shapes, logo, stickers, photos). */
import { useMemo } from 'react';
import { Button } from 'antd';
import { ImagePlus } from 'lucide-react';
import { widgets, type Widget } from './widgets';

interface Props {
  productPhotos: { name: string; src: string }[];
  onWidget: (widget: Widget) => void;
  onUpload: () => void;
  onProduct: (photo: { name: string; src: string }) => void;
  onAllProducts: () => void;
}

const GROUPS: Widget['group'][] = ['Text', 'Shop', 'Shapes', 'Brand', 'Stickers'];

export default function AddPanel({ productPhotos, onWidget, onUpload, onProduct, onAllProducts }: Props) {
  const list = useMemo(() => widgets(), []);
  return (
    <div className="ce-add">
      <div className="ce-section">
        <Button block icon={<ImagePlus size={14} />} onClick={onUpload}>Upload photos (pick several)</Button>
        <p className="ce-hint">Or drop / paste pictures on the canvas. Several at once land side by side and selected, ready to group (⌘G).</p>
      </div>
      {productPhotos.length > 0 && (
        <>
          <h4>Product photos {productPhotos.length > 1 && <button type="button" className="ce-link" onClick={onAllProducts}>Add all</button>}</h4>
          <div className="ce-section ce-tiles">
            {productPhotos.map((photo) => (
              <button key={photo.src} type="button" className="ce-tile ce-tile--photo" onClick={() => onProduct(photo)} title={photo.name}>
                <img src={photo.src} alt="" />
              </button>
            ))}
          </div>
        </>
      )}
      {GROUPS.map((group) => (
        <div key={group}>
          <h4>{group}</h4>
          <div className="ce-section ce-tiles">
            {list.filter((w) => w.group === group).map((w) => (
              <button
                key={w.id}
                type="button"
                className={`ce-tile${group === 'Stickers' ? ' ce-tile--emoji' : ''}`}
                onClick={() => onWidget(w)}
                title={w.label}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('application/x-tessa-widget', w.id); e.dataTransfer.effectAllowed = 'copy'; }}
              >
                <span className="ce-tile-preview">{w.preview}</span>
                {group !== 'Stickers' && <span className="ce-tile-label">{w.label}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
