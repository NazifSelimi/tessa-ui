/**
 * Crop a product photo for Post Studio: drag the box to move it, drag a corner
 * to resize it, or drag on the photo outside the box to draw a new one.
 * Works with mouse and touch. The crop is stored as 0–1 of the photo size.
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Space, Typography } from 'antd';
import type { PhotoCrop } from './render';

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'new';

interface CropModalProps {
  open: boolean;
  imageUrl: string | null;
  initial: PhotoCrop | null;
  onCancel: () => void;
  /** null = no manual crop (white margins are trimmed automatically). */
  onApply: (crop: PhotoCrop | null) => void;
}

const MIN = 0.04;
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const FULL: PhotoCrop = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };

export default function CropModal({ open, imageUrl, initial, onCancel, onApply }: CropModalProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<PhotoCrop>(initial ?? FULL);
  const drag = useRef<{ handle: Handle; startX: number; startY: number; start: PhotoCrop } | null>(null);

  useEffect(() => {
    if (open) setCrop(initial ?? FULL);
  }, [open, initial]);

  const pointAt = (event: { clientX: number; clientY: number }) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
  };

  const begin = (handle: Handle, event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const point = pointAt(event);
    const start = handle === 'new' ? { x: point.x, y: point.y, w: 0, h: 0 } : crop;
    drag.current = { handle, startX: point.x, startY: point.y, start };
    if (handle === 'new') setCrop(start);
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  };

  const move = (event: React.PointerEvent) => {
    const current = drag.current;
    if (!current) return;
    const point = pointAt(event);
    const dx = point.x - current.startX;
    const dy = point.y - current.startY;
    const s = current.start;
    let next: PhotoCrop;
    switch (current.handle) {
      case 'move':
        next = { ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) };
        break;
      case 'new': {
        const x1 = Math.min(current.startX, point.x);
        const y1 = Math.min(current.startY, point.y);
        next = { x: x1, y: y1, w: Math.abs(point.x - current.startX), h: Math.abs(point.y - current.startY) };
        break;
      }
      default: {
        let left = s.x;
        let top = s.y;
        let right = s.x + s.w;
        let bottom = s.y + s.h;
        if (current.handle.includes('w')) left = clamp(s.x + dx, 0, right - MIN);
        if (current.handle.includes('e')) right = clamp(s.x + s.w + dx, left + MIN, 1);
        if (current.handle.includes('n')) top = clamp(s.y + dy, 0, bottom - MIN);
        if (current.handle.includes('s')) bottom = clamp(s.y + s.h + dy, top + MIN, 1);
        next = { x: left, y: top, w: right - left, h: bottom - top };
      }
    }
    setCrop(next);
  };

  const end = () => {
    if (drag.current?.handle === 'new' && (crop.w < MIN || crop.h < MIN)) setCrop(drag.current.start.w ? drag.current.start : FULL);
    drag.current = null;
  };

  const valid = crop.w >= MIN && crop.h >= MIN;

  return (
    <Modal
      open={open}
      title="Crop photo"
      onCancel={onCancel}
      width={720}
      destroyOnHidden
      footer={(
        <Space wrap>
          <Button onClick={() => onApply(null)}>No crop (auto-trim)</Button>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" disabled={!valid} onClick={() => onApply(crop)}>Apply crop</Button>
        </Space>
      )}
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Drag the box to move it, drag a corner to resize, or drag across the photo to draw a new box.
      </Typography.Paragraph>
      {imageUrl && (
        <div className="studio-crop">
          <div
            ref={frameRef}
            className="studio-crop__frame"
            onPointerDown={(event) => begin('new', event)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          >
            <img src={imageUrl} alt="" draggable={false} />
            <div
              className="studio-crop__box"
              style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
              onPointerDown={(event) => begin('move', event)}
            >
              {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
                <span key={handle} className={`studio-crop__handle studio-crop__handle--${handle}`} onPointerDown={(event) => begin(handle, event)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
