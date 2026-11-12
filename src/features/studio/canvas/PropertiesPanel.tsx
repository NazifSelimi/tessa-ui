/** Right-hand panel: frame settings when nothing is selected, otherwise the selection's properties. */
import { useState } from 'react';
import { App, Button, ColorPicker, Input, InputNumber, Segmented, Select, Slider, Switch, Tooltip } from 'antd';
import {
  AlignCenterOutlined, AlignLeftOutlined, AlignRightOutlined, BoldOutlined, CopyOutlined, DeleteOutlined, ItalicOutlined,
  LockOutlined, UnlockOutlined, VerticalAlignBottomOutlined, VerticalAlignMiddleOutlined, VerticalAlignTopOutlined,
} from '@ant-design/icons';
import {
  AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignHorizontalJustifyStart, AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround, ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Crop, Group, Ungroup,
} from 'lucide-react';
import { fontChoices, type CanvasDoc, type ImageLayer, type Layer, type ShapeLayer, type TextLayer } from './model';
import { applyTextStyle, resizeFrame, saveTextStyle, selectionBounds, moveLayers, updateLayers, type AlignEdge, type OrderMove } from './ops';
import { getCutout } from '../cutout';
import type { FramePreset } from './CanvasEditor';

interface Props {
  doc: CanvasDoc;
  layers: Layer[];
  frames: FramePreset[];
  onChange: (doc: CanvasDoc, mergeKey?: string) => void;
  onAlign: (edge: AlignEdge) => void;
  onDistribute: (axis: 'x' | 'y') => void;
  onArrange: (move: OrderMove) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCrop: (id: string) => void;
  cropping: string | null;
  gridSize: number;
  onGridSize: (size: number) => void;
  snapping: boolean;
  onSnapping: (on: boolean) => void;
}

const WEIGHTS = [300, 400, 500, 600, 700, 800, 900].map((w) => ({ value: w, label: { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' }[w] }));
const SWATCHES = ['#242124', '#ffffff', '#9b5364', '#f6eee9', '#e8c7cf', '#c9a227', '#1f6f5c', '#2b4c9b', '#d0342c', '#000000'];

const num = (value: number) => Math.round(value * 10) / 10;

function Num({ label, value, onChange, min, max, step = 1, suffix }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  return (
    <label className="ce-field">
      <span>{label}</span>
      <InputNumber size="small" value={num(value)} min={min} max={max} step={step} suffix={suffix} onChange={(v) => { if (typeof v === 'number' && Number.isFinite(v)) onChange(v); }} />
    </label>
  );
}

function Colour({ label, value, onChange, allowClear }: { label: string; value: string; onChange: (v: string) => void; allowClear?: boolean }) {
  return (
    <label className="ce-field">
      <span>{label}</span>
      <ColorPicker
        size="small"
        showText
        allowClear={allowClear}
        value={value === 'transparent' ? null : value}
        presets={[{ label: 'Brand & basics', colors: SWATCHES }]}
        onChange={(c) => onChange(c.toHexString())}
        onClear={() => onChange('transparent')}
      />
    </label>
  );
}

export default function PropertiesPanel(props: Props) {
  const { doc, layers, frames, onChange } = props;
  const { message } = App.useApp();
  const [styleName, setStyleName] = useState('');
  const ids = layers.map((l) => l.id);
  const set = (patch: Partial<Layer>, key: string) => onChange(updateLayers(doc, ids, patch), `${key}:${ids.join()}`);

  /* ------------------------------------------------------------- nothing selected: the frame */
  if (!layers.length) {
    const preset = frames.find((f) => f.width === doc.width && f.height === doc.height);
    return (
      <>
        <h4>Frame</h4>
        <div className="ce-section">
          <div className="ce-row ce-row--1">
            <label className="ce-field">
              <span>Post size</span>
              <Select
                size="small"
                value={preset?.id ?? 'custom'}
                options={[...frames.map((f) => ({ value: f.id, label: `${f.label} · ${f.width}×${f.height}` })), { value: 'custom', label: 'Custom', disabled: true }]}
                onChange={(id) => {
                  const f = frames.find((x) => x.id === id);
                  if (f) onChange(resizeFrame(doc, f.width, f.height));
                }}
              />
            </label>
          </div>
          <div className="ce-row">
            <Num label="W" value={doc.width} min={100} max={4000} onChange={(v) => onChange(resizeFrame(doc, v, doc.height, false), 'frame-w')} />
            <Num label="H" value={doc.height} min={100} max={4000} onChange={(v) => onChange(resizeFrame(doc, doc.width, v, false), 'frame-h')} />
          </div>
          <div className="ce-row ce-row--1">
            <Colour label="Background" value={doc.background} onChange={(v) => onChange({ ...doc, background: v === 'transparent' ? '#ffffff' : v }, 'frame-bg')} />
          </div>
        </div>
        <h4>Guides</h4>
        <div className="ce-section">
          <div className="ce-row">
            <label className="ce-field"><span>Smart guides</span><Switch size="small" checked={props.snapping} onChange={props.onSnapping} /></label>
            <label className="ce-field">
              <span>Grid (')</span>
              <Select size="small" value={props.gridSize} onChange={props.onGridSize} options={[{ value: 0, label: 'Off' }, { value: 10, label: '10 px' }, { value: 20, label: '20 px' }, { value: 40, label: '40 px' }, { value: 90, label: '90 px' }]} />
            </label>
          </div>
        </div>
        {doc.textStyles.length > 0 && (
          <>
            <h4>Text styles</h4>
            <div className="ce-section">
              {doc.textStyles.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ flex: 1, fontFamily: s.fontFamily, fontWeight: s.fontWeight, color: s.color, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <Button size="small" type="text" icon={<DeleteOutlined />} onClick={() => onChange({ ...doc, textStyles: doc.textStyles.filter((x) => x.id !== s.id) })} aria-label={`Delete style ${s.name}`} />
                </div>
              ))}
            </div>
          </>
        )}
        <p style={{ padding: '8px 12px', color: '#8a8380' }}>Select something on the canvas to change it. Press ? for all shortcuts.</p>
      </>
    );
  }

  const single = layers.length === 1 ? layers[0] : null;
  const bounds = selectionBounds(doc, ids)!;
  const allText = layers.every((l) => l.type === 'text');
  const allShapes = layers.every((l) => l.type === 'rect' || l.type === 'ellipse');
  const text = layers[0] as TextLayer;
  const shape = layers[0] as ShapeLayer;
  const image = single?.type === 'image' ? single : null;
  const grouped = layers.some((l) => l.groupId);
  const locked = layers.every((l) => l.locked);

  const iconButton = (title: string, icon: React.ReactNode, onClick: () => void, disabled = false) => (
    <Tooltip title={title}><Button size="small" type="text" icon={icon} onClick={onClick} disabled={disabled} aria-label={title} /></Tooltip>
  );

  const removeBackground = async (layer: ImageLayer) => {
    const src = (layer as ImageLayer & { originalSrc?: string }).originalSrc ?? layer.src;
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.src = src;
    try {
      await img.decode();
      const cut = getCutout(img, { tolerance: 20, erase: [] });
      if (!cut) throw new Error('none');
      onChange(updateLayers(doc, [layer.id], { src: cut.toDataURL('image/png'), originalSrc: src } as Partial<Layer>));
      message.success('Background removed (works best on plain white or light backgrounds)');
    } catch {
      message.error('Could not remove the background from this picture.');
    }
  };

  return (
    <>
      <h4>{single ? single.name : `${layers.length} selected`}</h4>
      <div className="ce-section">
        <div className="ce-icons" aria-label="Align">
          {iconButton('Align left (Alt+A)', <AlignHorizontalJustifyStart size={14} />, () => props.onAlign('left'))}
          {iconButton('Align centre (Alt+H)', <AlignHorizontalJustifyCenter size={14} />, () => props.onAlign('hcenter'))}
          {iconButton('Align right (Alt+D)', <AlignHorizontalJustifyEnd size={14} />, () => props.onAlign('right'))}
          {iconButton('Align top (Alt+W)', <VerticalAlignTopOutlined />, () => props.onAlign('top'))}
          {iconButton('Align middle (Alt+V)', <VerticalAlignMiddleOutlined />, () => props.onAlign('vcenter'))}
          {iconButton('Align bottom (Alt+S)', <VerticalAlignBottomOutlined />, () => props.onAlign('bottom'))}
          {iconButton('Spread out horizontally', <AlignHorizontalSpaceAround size={14} />, () => props.onDistribute('x'), layers.length < 3)}
          {iconButton('Spread out vertically', <AlignVerticalSpaceAround size={14} />, () => props.onDistribute('y'), layers.length < 3)}
        </div>
        <div className="ce-row">
          <Num label="X" value={bounds.x} onChange={(v) => onChange(moveLayers(doc, ids, v - bounds.x, 0), 'x')} />
          <Num label="Y" value={bounds.y} onChange={(v) => onChange(moveLayers(doc, ids, 0, v - bounds.y), 'y')} />
        </div>
        {single && (
          <div className="ce-row ce-row--3">
            <Num label="W" value={single.w} min={1} onChange={(v) => set({ w: v }, 'w')} />
            <Num label="H" value={single.h} min={1} onChange={(v) => set({ h: v }, 'h')} />
            <Num label="Rotate" value={single.rotation} min={-180} max={180} suffix="°" onChange={(v) => set({ rotation: v }, 'rot')} />
          </div>
        )}
        <div className="ce-row ce-row--1">
          <label className="ce-field">
            <span>Opacity {Math.round(layers[0].opacity * 100)}%</span>
            <Slider min={0} max={100} value={Math.round(layers[0].opacity * 100)} onChange={(v) => set({ opacity: v / 100 }, 'opacity')} />
          </label>
        </div>
      </div>

      {allText && (
        <>
          <h4>Text</h4>
          <div className="ce-section">
            <div className="ce-row ce-row--1">
              <label className="ce-field">
                <span>Font</span>
                <Select size="small" value={text.fontFamily} onChange={(v) => set({ fontFamily: v }, 'font')} options={fontChoices()} />
              </label>
            </div>
            <div className="ce-row">
              <label className="ce-field">
                <span>Weight</span>
                <Select size="small" value={text.fontWeight} onChange={(v) => set({ fontWeight: v }, 'weight')} options={WEIGHTS} />
              </label>
              <Num label="Size" value={text.fontSize} min={4} max={1000} onChange={(v) => set({ fontSize: v }, 'size')} />
            </div>
            <div className="ce-row">
              <Num label="Line height" value={text.lineHeight} min={0.5} max={4} step={0.05} onChange={(v) => set({ lineHeight: v }, 'lh')} />
              <Num label="Letter spacing" value={text.letterSpacing} min={-20} max={100} step={0.5} onChange={(v) => set({ letterSpacing: v }, 'ls')} />
            </div>
            <div className="ce-row ce-row--1">
              <Colour label="Colour" value={text.color} onChange={(v) => set({ color: v === 'transparent' ? '#000000' : v }, 'color')} />
            </div>
            <div className="ce-icons">
              <Segmented
                size="small"
                value={text.align}
                onChange={(v) => set({ align: v as TextLayer['align'] }, 'align')}
                options={[{ value: 'left', icon: <AlignLeftOutlined />, title: 'Left' }, { value: 'center', icon: <AlignCenterOutlined />, title: 'Centre' }, { value: 'right', icon: <AlignRightOutlined />, title: 'Right' }]}
              />
              {iconButton('Bold', <BoldOutlined />, () => set({ fontWeight: text.fontWeight >= 700 ? 400 : 700 }, 'bold'))}
              {iconButton('Italic', <ItalicOutlined />, () => set({ italic: !text.italic }, 'italic'))}
              <Tooltip title="Capital letters"><Button size="small" type={text.uppercase ? 'primary' : 'text'} onClick={() => set({ uppercase: !text.uppercase }, 'caps')}>AA</Button></Tooltip>
            </div>
            <div className="ce-row ce-row--1">
              <label className="ce-field">
                <span>Text style</span>
                <Select
                  size="small"
                  placeholder={doc.textStyles.length ? 'Apply a saved style' : 'No saved styles yet'}
                  disabled={!doc.textStyles.length}
                  value={null}
                  onChange={(id: string) => onChange(applyTextStyle(doc, ids, id))}
                  options={doc.textStyles.map((s) => ({ value: s.id, label: s.name }))}
                />
              </label>
            </div>
            {single && (
              <div style={{ display: 'flex', gap: 4 }}>
                <Input size="small" placeholder="Style name, e.g. Title" value={styleName} onChange={(e) => setStyleName(e.target.value)} />
                <Button size="small" disabled={!styleName.trim()} onClick={() => { onChange(saveTextStyle(doc, single.id, styleName.trim())); setStyleName(''); message.success('Text style saved'); }}>Save</Button>
              </div>
            )}
          </div>
        </>
      )}

      {allShapes && (
        <>
          <h4>Fill & stroke</h4>
          <div className="ce-section">
            <div className="ce-row ce-row--1"><Colour label="Fill" allowClear value={shape.fill} onChange={(v) => set({ fill: v }, 'fill')} /></div>
            <div className="ce-row">
              <Colour label="Stroke" value={shape.stroke} onChange={(v) => set({ stroke: v === 'transparent' ? '#000000' : v }, 'stroke')} />
              <Num label="Stroke width" value={shape.strokeWidth} min={0} max={200} onChange={(v) => set({ strokeWidth: v }, 'sw')} />
            </div>
            {layers.every((l) => l.type === 'rect') && <div className="ce-row"><Num label="Corner radius" value={shape.radius} min={0} max={2000} onChange={(v) => set({ radius: v }, 'radius')} /></div>}
          </div>
        </>
      )}

      {image && (
        <>
          <h4>Picture</h4>
          <div className="ce-section">
            <div className="ce-row">
              <label className="ce-field">
                <span>Fit</span>
                <Select size="small" value={image.fit} onChange={(v) => set({ fit: v }, 'fit')} options={[{ value: 'cover', label: 'Fill (crop)' }, { value: 'contain', label: 'Fit (whole)' }]} />
              </label>
              <Num label="Corner radius" value={image.radius} min={0} max={2000} onChange={(v) => set({ radius: v }, 'iradius')} />
            </div>
            <div className="ce-row ce-row--1">
              <label className="ce-field">
                <span>Zoom {image.zoom.toFixed(2)}×</span>
                <Slider min={1} max={4} step={0.01} value={image.zoom} onChange={(v) => set({ zoom: v }, 'zoom')} />
              </label>
            </div>
            <div className="ce-icons">
              <Button size="small" icon={<Crop size={13} />} type={props.cropping === image.id ? 'primary' : 'default'} onClick={() => props.onCrop(image.id)}>
                {props.cropping === image.id ? 'Done cropping' : 'Crop (double-click)'}
              </Button>
              <Button size="small" onClick={() => void removeBackground(image)}>Remove background</Button>
              {(image as ImageLayer & { originalSrc?: string }).originalSrc && (
                <Button size="small" type="text" onClick={() => onChange(updateLayers(doc, [image.id], { src: (image as ImageLayer & { originalSrc?: string }).originalSrc, originalSrc: undefined } as Partial<Layer>))}>Restore original</Button>
              )}
            </div>
          </div>
        </>
      )}

      <h4>Arrange</h4>
      <div className="ce-section">
        <div className="ce-icons">
          {iconButton('Bring to front (⌘])', <ArrowUpToLine size={14} />, () => props.onArrange('front'))}
          {iconButton('Bring forward (])', <ArrowUp size={14} />, () => props.onArrange('forward'))}
          {iconButton('Send backward ([)', <ArrowDown size={14} />, () => props.onArrange('backward'))}
          {iconButton('Send to back (⌘[)', <ArrowDownToLine size={14} />, () => props.onArrange('back'))}
          {iconButton('Group (⌘G)', <Group size={14} />, props.onGroup, layers.length < 2)}
          {iconButton('Ungroup (⇧⌘G)', <Ungroup size={14} />, props.onUngroup, !grouped)}
        </div>
        <div className="ce-icons">
          <Button size="small" icon={<CopyOutlined />} onClick={props.onDuplicate}>Duplicate</Button>
          <Button size="small" icon={locked ? <UnlockOutlined /> : <LockOutlined />} onClick={() => onChange(updateLayers(doc, ids, { locked: !locked }))}>{locked ? 'Unlock' : 'Lock'}</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={props.onDelete}>Delete</Button>
        </div>
      </div>
    </>
  );
}
