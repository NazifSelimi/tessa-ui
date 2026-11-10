/**
 * The bubble that opens at the mouse (right-click, double-click on empty
 * canvas, or long-press on touch). Its options depend on what is under it:
 * empty canvas → add things; text → font size, font, colour, alignment;
 * picture → remove background, crop, fit; shapes → fill colour.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button, ColorPicker, InputNumber, Select, Tooltip } from 'antd';
import {
  AlignCenterOutlined, AlignLeftOutlined, AlignRightOutlined, BoldOutlined, CopyOutlined, DeleteOutlined, EditOutlined,
  ItalicOutlined, LockOutlined, PictureOutlined, ScissorOutlined, SnippetsOutlined, UnlockOutlined,
} from '@ant-design/icons';
import { AppWindow, ArrowDownToLine, ArrowUpToLine, Circle, Crop, Group, Square, Type, Ungroup } from 'lucide-react';
import { fontChoices, type CanvasDoc, type ImageLayer, type Layer, type ShapeLayer, type TextLayer } from './model';
import { updateLayers, type OrderMove } from './ops';

const SWATCHES = ['#242124', '#ffffff', '#9b5364', '#e8c7cf', '#f6eee9', '#c9a227', '#1f6f5c', '#2b4c9b', '#d0342c'];

export interface BubbleActions {
  addText: () => void;
  addImages: () => void;
  addShape: (type: 'rect' | 'ellipse') => void;
  openWidgets: () => void;
  paste: () => void;
  canPaste: boolean;
  selectAll: () => void;
  duplicate: () => void;
  copy: () => void;
  remove: () => void;
  arrange: (move: OrderMove) => void;
  group: () => void;
  ungroup: () => void;
  editText: (id: string) => void;
  crop: (id: string) => void;
  removeBackground: (id: string) => void;
  restoreBackground: (id: string) => void;
  replaceImage: (id: string) => void;
}

interface Props {
  x: number;
  y: number;
  doc: CanvasDoc;
  layers: Layer[];
  onChange: (doc: CanvasDoc, mergeKey?: string) => void;
  onClose: () => void;
  actions: BubbleActions;
  /** For pictures: whether a plain background was spotted (shows the remove option first). */
  plainBackground?: boolean | null;
}

function Item({ icon, label, onClick, danger, disabled }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={`ce-bubble-item${danger ? ' is-danger' : ''}`} onClick={onClick} disabled={disabled}>
      <span className="ce-bubble-icon">{icon}</span>{label}
    </button>
  );
}

export default function ContextBubble({ x, y, doc, layers, onChange, onClose, actions, plainBackground }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const ids = layers.map((l) => l.id);
  const set = (patch: Partial<Layer>, key: string) => onChange(updateLayers(doc, ids, patch), `bubble:${key}:${ids.join()}`);
  const run = (fn: () => void) => () => { fn(); onClose(); };

  // Keep the bubble inside the editor.
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;
    const left = Math.max(8, Math.min(x, parent.clientWidth - el.offsetWidth - 8));
    const top = Math.max(8, Math.min(y, parent.clientHeight - el.offsetHeight - 8));
    if (left !== pos.left || top !== pos.top) setPos({ left, top });
  }, [x, y, layers.length, pos.left, pos.top]);

  useEffect(() => {
    const away = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      // Clicks inside antd pop-ups (colour picker, select list) belong to the bubble.
      if (ref.current?.contains(target) || target.closest('.ant-select-dropdown, .ant-color-picker, .ant-popover')) return;
      onClose();
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('pointerdown', away, true);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', away, true);
      window.removeEventListener('keydown', key);
    };
  }, [onClose]);

  const single = layers.length === 1 ? layers[0] : null;
  const allText = layers.length > 0 && layers.every((l) => l.type === 'text');
  const allShapes = layers.length > 0 && layers.every((l) => l.type === 'rect' || l.type === 'ellipse');
  const image = single?.type === 'image' ? (single as ImageLayer & { originalSrc?: string }) : null;
  const text = layers[0] as TextLayer;
  const locked = layers.length > 0 && layers.every((l) => l.locked);
  const grouped = layers.some((l) => l.groupId);

  return (
    <div
      ref={ref}
      className="ce-bubble"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {layers.length === 0 && (
        <>
          <div className="ce-bubble-title">Add to the post</div>
          <Item icon={<Type size={14} />} label="Text" onClick={run(actions.addText)} />
          <Item icon={<PictureOutlined />} label="Photos (one or more)" onClick={run(actions.addImages)} />
          <Item icon={<Square size={14} />} label="Rectangle" onClick={run(() => actions.addShape('rect'))} />
          <Item icon={<Circle size={14} />} label="Circle" onClick={run(() => actions.addShape('ellipse'))} />
          <Item icon={<AppWindow size={14} />} label="Widgets (badges, prices, buttons…)" onClick={run(actions.openWidgets)} />
          <div className="ce-bubble-sep" />
          <Item icon={<SnippetsOutlined />} label="Paste" onClick={run(actions.paste)} disabled={!actions.canPaste} />
          <Item icon={<CopyOutlined />} label="Select all" onClick={run(actions.selectAll)} disabled={!doc.layers.length} />
          <div className="ce-bubble-row">
            <span className="ce-bubble-label">Background</span>
            {SWATCHES.slice(0, 6).map((c) => (
              <button key={c} type="button" className="ce-swatch" style={{ background: c }} aria-label={`Background ${c}`} onClick={() => onChange({ ...doc, background: c }, 'bubble:bg')} />
            ))}
          </div>
        </>
      )}

      {allText && (
        <>
          <div className="ce-bubble-title">Text</div>
          <div className="ce-bubble-row">
            <Button size="small" onClick={() => set({ fontSize: Math.max(4, Math.round(text.fontSize / 1.1)) }, 'size')} aria-label="Smaller">A−</Button>
            <InputNumber size="small" min={4} max={1000} value={Math.round(text.fontSize)} onChange={(v) => { if (typeof v === 'number') set({ fontSize: v }, 'size'); }} style={{ width: 72 }} aria-label="Font size" />
            <Button size="small" onClick={() => set({ fontSize: Math.round(text.fontSize * 1.1) }, 'size')} aria-label="Bigger">A+</Button>
          </div>
          <div className="ce-bubble-row">
            <Select size="small" value={text.fontFamily} options={fontChoices()} onChange={(v) => set({ fontFamily: v }, 'font')} style={{ width: '100%' }} popupMatchSelectWidth={false} />
          </div>
          <div className="ce-bubble-row">
            <Tooltip title="Bold"><Button size="small" type={text.fontWeight >= 700 ? 'primary' : 'default'} icon={<BoldOutlined />} onClick={() => set({ fontWeight: text.fontWeight >= 700 ? 400 : 700 }, 'bold')} /></Tooltip>
            <Tooltip title="Italic"><Button size="small" type={text.italic ? 'primary' : 'default'} icon={<ItalicOutlined />} onClick={() => set({ italic: !text.italic }, 'italic')} /></Tooltip>
            <Tooltip title="Capitals"><Button size="small" type={text.uppercase ? 'primary' : 'default'} onClick={() => set({ uppercase: !text.uppercase }, 'caps')}>AA</Button></Tooltip>
            <Tooltip title="Left"><Button size="small" type={text.align === 'left' ? 'primary' : 'default'} icon={<AlignLeftOutlined />} onClick={() => set({ align: 'left' }, 'align')} /></Tooltip>
            <Tooltip title="Centre"><Button size="small" type={text.align === 'center' ? 'primary' : 'default'} icon={<AlignCenterOutlined />} onClick={() => set({ align: 'center' }, 'align')} /></Tooltip>
            <Tooltip title="Right"><Button size="small" type={text.align === 'right' ? 'primary' : 'default'} icon={<AlignRightOutlined />} onClick={() => set({ align: 'right' }, 'align')} /></Tooltip>
          </div>
          <div className="ce-bubble-row">
            {SWATCHES.map((c) => (
              <button key={c} type="button" className={`ce-swatch${text.color === c ? ' is-on' : ''}`} style={{ background: c }} aria-label={`Colour ${c}`} onClick={() => set({ color: c }, 'color')} />
            ))}
            <ColorPicker size="small" value={text.color} onChange={(c) => set({ color: c.toHexString() }, 'color')} />
          </div>
          {single && <Item icon={<EditOutlined />} label="Edit the words" onClick={run(() => actions.editText(single.id))} />}
        </>
      )}

      {image && (
        <>
          <div className="ce-bubble-title">Photo</div>
          {plainBackground !== false && !image.originalSrc && (
            <Item icon={<ScissorOutlined />} label={plainBackground ? 'Remove background (plain background found)' : 'Remove background'} onClick={run(() => actions.removeBackground(image.id))} />
          )}
          {image.originalSrc && <Item icon={<ScissorOutlined />} label="Restore original background" onClick={run(() => actions.restoreBackground(image.id))} />}
          <Item icon={<Crop size={14} />} label="Crop (drag photo, scroll to zoom)" onClick={run(() => actions.crop(image.id))} />
          <Item icon={<PictureOutlined />} label={image.fit === 'cover' ? 'Show whole photo (fit)' : 'Fill the box (crop)'} onClick={run(() => set({ fit: image.fit === 'cover' ? 'contain' : 'cover' }, 'fit'))} />
          <Item icon={<PictureOutlined />} label="Replace photo…" onClick={run(() => actions.replaceImage(image.id))} />
        </>
      )}

      {allShapes && (
        <>
          <div className="ce-bubble-title">Colour</div>
          <div className="ce-bubble-row">
            {SWATCHES.map((c) => (
              <button key={c} type="button" className={`ce-swatch${(layers[0] as ShapeLayer).fill === c ? ' is-on' : ''}`} style={{ background: c }} aria-label={`Fill ${c}`} onClick={() => set({ fill: c }, 'fill')} />
            ))}
            <ColorPicker size="small" value={(layers[0] as ShapeLayer).fill === 'transparent' ? null : (layers[0] as ShapeLayer).fill} onChange={(c) => set({ fill: c.toHexString() }, 'fill')} />
          </div>
        </>
      )}

      {layers.length > 0 && (
        <>
          <div className="ce-bubble-sep" />
          <Item icon={<CopyOutlined />} label="Duplicate  ⌘D" onClick={run(actions.duplicate)} />
          <Item icon={<CopyOutlined />} label="Copy  ⌘C" onClick={run(actions.copy)} />
          <Item icon={<ArrowUpToLine size={14} />} label="Bring to front" onClick={run(() => actions.arrange('front'))} />
          <Item icon={<ArrowDownToLine size={14} />} label="Send to back" onClick={run(() => actions.arrange('back'))} />
          {layers.length > 1 && <Item icon={<Group size={14} />} label="Group  ⌘G" onClick={run(actions.group)} />}
          {grouped && <Item icon={<Ungroup size={14} />} label="Ungroup  ⇧⌘G" onClick={run(actions.ungroup)} />}
          <Item icon={locked ? <UnlockOutlined /> : <LockOutlined />} label={locked ? 'Unlock' : 'Lock'} onClick={run(() => onChange(updateLayers(doc, ids, { locked: !locked })))} />
          <Item icon={<DeleteOutlined />} label="Delete" danger onClick={run(actions.remove)} />
        </>
      )}
    </div>
  );
}
