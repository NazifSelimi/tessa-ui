/**
 * Shared product-photo editor. The same studio tools the Post Studio uses —
 * remove background, zoom, move and recenter — but for a single catalog photo
 * that gets saved back as a new image. Used by the product image manager and
 * the add / edit product form. Nothing here is social-media specific.
 *
 * It never changes the original: the caller uploads the exported copy and keeps
 * the source, so edits are always non-destructive.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Segmented, Slider, Space, Switch, Tooltip, Typography } from 'antd';
import {
  AimOutlined, ClearOutlined, ScissorOutlined, RedoOutlined, UndoOutlined, ZoomInOutlined, ZoomOutOutlined,
} from '@ant-design/icons';
import { getCutout, DEFAULT_TOLERANCE } from './cutout';
import CropModal from './CropModal';
import type { PhotoCrop } from './render';

type Region = { x: number; y: number; w: number; h: number };

/**
 * Bounding box of the product inside `area` (0–1 of the source): see-through
 * pixels (after background removal) or pixels close to the corner colour count
 * as background. Returns the box as 0–1 of the source, or null if nothing stands out.
 */
export function productBounds(src: CanvasImageSource, width: number, height: number, area: Region, transparent: boolean): Region | null {
  const scale = Math.min(1, 400 / Math.max(area.w * width, area.h * height));
  const w = Math.max(1, Math.round(area.w * width * scale));
  const h = Math.max(1, Math.round(area.h * height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, area.x * width, area.y * height, area.w * width, area.h * height, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try { data = ctx.getImageData(0, 0, w, h).data; } catch { return null; }
  const corner = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
  const bg = [0, 1, 2].map((c) => corner.reduce((sum, i) => sum + data[i + c], 0) / 4);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const solid = transparent
        ? data[i + 3] > 24
        : data[i + 3] > 24 && Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 36;
      if (!solid) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return {
    x: area.x + (minX / w) * area.w,
    y: area.y + (minY / h) * area.h,
    w: ((maxX - minX + 1) / w) * area.w,
    h: ((maxY - minY + 1) / h) * area.h,
  };
}

/** Square working/output resolution. Catalog packshots are square. */
const SIZE = 1200;

type Background = 'transparent' | 'white' | 'warm';
const BG_FILL: Record<Exclude<Background, 'transparent'>, string> = { white: '#ffffff', warm: '#f6f1ea' };

interface Props {
  open: boolean;
  /** Image URL (edit an existing photo) — must be same-origin for remove-background. */
  source?: string;
  /** Or a freshly picked file (add-product flow). */
  file?: File | null;
  title?: string;
  busy?: boolean;
  onCancel: () => void;
  /** Called with the edited copy. PNG when the background is transparent, else WebP. */
  onSave: (blob: Blob, ext: 'png' | 'webp') => void | Promise<void>;
}

export default function ProductPhotoEditor({ open, source, file, title, busy, onCancel, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [removeBg, setRemoveBg] = useState(false);
  const [canCutout, setCanCutout] = useState(true);
  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE);
  const [erase, setErase] = useState<{ x: number; y: number }[]>([]);
  const [eraser, setEraser] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [bg, setBg] = useState<Background>('transparent');
  /** Manual crop (0–1 of the photo) and "fit to product": trim the empty edges and centre it. */
  const [crop, setCrop] = useState<PhotoCrop | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fitProduct, setFitProduct] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const recenter = useCallback(() => { setScale(1); setOffset({ x: 0, y: 0 }); setRotation(0); }, []);
  const editsArea = crop !== null || fitProduct;

  /* Load the image whenever the modal opens with a new source / file. */
  useEffect(() => {
    if (!open) return;
    setReady(false); setError(''); setRemoveBg(false); setCanCutout(true);
    setTolerance(DEFAULT_TOLERANCE); setErase([]); setEraser(false);
    setScale(1); setOffset({ x: 0, y: 0 }); setRotation(0); setBg('transparent');
    setCrop(null); setFitProduct(false);
    let active = true;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    const url = file ? URL.createObjectURL(file) : source;
    img.onload = () => {
      if (!active) return;
      imgRef.current = img;
      // Can we read the pixels back? External photos block it (no remove-background).
      try {
        const probe = document.createElement('canvas');
        probe.width = probe.height = 1;
        const pctx = probe.getContext('2d');
        pctx?.drawImage(img, 0, 0, 1, 1);
        probe.toDataURL();
        setCanCutout(true);
      } catch { setCanCutout(false); }
      setReady(true);
    };
    img.onerror = () => { if (active) setError('This image could not be loaded for editing. Download it and upload a local copy.'); };
    if (url) { img.src = url; setSourceUrl(url); }
    return () => { active = false; if (file && url) URL.revokeObjectURL(url); };
  }, [open, source, file]);

  /* One draw path for both the on-screen canvas and the exported copy. */
  const paint = useCallback((ctx: CanvasRenderingContext2D, forExport: boolean) => {
    const img = imgRef.current;
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (bg === 'transparent') {
      if (!forExport) {
        // Checkerboard so the user can see what is see-through.
        const s = 24;
        for (let y = 0; y < SIZE; y += s) for (let x = 0; x < SIZE; x += s) {
          ctx.fillStyle = ((x / s + y / s) % 2 === 0) ? '#e9e9e9' : '#ffffff';
          ctx.fillRect(x, y, s, s);
        }
      }
    } else {
      ctx.fillStyle = BG_FILL[bg];
      ctx.fillRect(0, 0, SIZE, SIZE);
    }
    if (!img) return;
    const useCut = removeBg && canCutout;
    const src: CanvasImageSource = useCut
      ? (getCutout(img, { tolerance, erase }) ?? img)
      : img;
    const fullW = useCut ? (src as HTMLCanvasElement).width : img.naturalWidth;
    const fullH = useCut ? (src as HTMLCanvasElement).height : img.naturalHeight;
    let area: Region = crop ?? { x: 0, y: 0, w: 1, h: 1 };
    if (fitProduct) area = productBounds(src, fullW, fullH, area, useCut) ?? area;
    const sw = area.w * fullW;
    const sh = area.h * fullH;
    const turned = Math.abs(rotation % 180) === 90;
    const rw = turned ? sh : sw;
    const rh = turned ? sw : sh;
    const base = Math.min(SIZE / rw, SIZE / rh) * 0.92;
    const total = base * scale;
    ctx.save();
    ctx.translate(SIZE / 2 + offset.x * SIZE, SIZE / 2 + offset.y * SIZE);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(total, total);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, area.x * fullW, area.y * fullH, sw, sh, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  }, [bg, removeBg, canCutout, tolerance, erase, rotation, scale, offset, crop, fitProduct]);

  /* Redraw the visible canvas on any change. */
  useEffect(() => {
    if (!open || !ready) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paint(ctx, false);
  }, [open, ready, paint]);

  /* Map a pointer event to canvas pixel coordinates. */
  const toCanvas = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * SIZE, y: ((e.clientY - rect.top) / rect.height) * SIZE };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ready) return;
    if (eraser && removeBg && canCutout && rotation === 0 && !editsArea) {
      // Magic eraser: remove the region under the click too.
      const img = imgRef.current!;
      const { x, y } = toCanvas(e);
      const base = Math.min(SIZE / img.naturalWidth, SIZE / img.naturalHeight) * 0.92 * scale;
      const ix = (x - (SIZE / 2 + offset.x * SIZE)) / base + img.naturalWidth / 2;
      const iy = (y - (SIZE / 2 + offset.y * SIZE)) / base + img.naturalHeight / 2;
      const nx = ix / img.naturalWidth;
      const ny = iy / img.naturalHeight;
      if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) setErase((prev) => [...prev, { x: nx, y: ny }]);
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* window-less is fine */ }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const dx = ((e.clientX - drag.current.x) / rect.width);
    const dy = ((e.clientY - drag.current.y) / rect.height);
    setOffset({ x: Math.max(-1, Math.min(1, drag.current.ox + dx)), y: Math.max(-1, Math.min(1, drag.current.oy + dy)) });
  };
  const onPointerUp = () => { drag.current = null; };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.2, Math.min(5, s * (1 - e.deltaY * 0.0012))));
  };

  const save = async () => {
    const out = document.createElement('canvas');
    out.width = out.height = SIZE;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    paint(ctx, true);
    const transparent = bg === 'transparent';
    out.toBlob((blob) => { if (blob) void onSave(blob, transparent ? 'png' : 'webp'); },
      transparent ? 'image/png' : 'image/webp', 0.92);
  };

  const cutoutUnavailable = removeBg && !canCutout;

  return (
    <Modal
      title={title || 'Edit photo — saves a new copy'}
      open={open}
      width={720}
      confirmLoading={busy}
      okText="Save edited copy"
      okButtonProps={{ disabled: !ready || !!error }}
      onCancel={onCancel}
      onOk={save}
    >
      {error && <Alert type="warning" showIcon message={error} style={{ marginBottom: 12 }} />}
      {cutoutUnavailable && <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="Remove background needs a local copy of this image. Upload the photo again from your computer to use it." />}
      <div style={{ display: 'flex', justifyContent: 'center', background: '#fafafa', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          style={{
            width: '100%', maxWidth: 420, aspectRatio: '1 / 1', touchAction: 'none', borderRadius: 6,
            cursor: eraser && removeBg ? 'crosshair' : 'grab', boxShadow: '0 1px 4px rgba(0,0,0,.12)',
          }}
        />
      </div>

      <Space wrap style={{ marginBottom: 10 }}>
        <Tooltip title="Zoom out"><Button icon={<ZoomOutOutlined />} onClick={() => setScale((s) => Math.max(0.2, s - 0.15))} /></Tooltip>
        <Tooltip title="Zoom in"><Button icon={<ZoomInOutlined />} onClick={() => setScale((s) => Math.min(5, s + 0.15))} /></Tooltip>
        <Tooltip title="Rotate left"><Button icon={<UndoOutlined />} onClick={() => setRotation((r) => (r + 270) % 360)} /></Tooltip>
        <Tooltip title="Rotate right"><Button icon={<RedoOutlined />} onClick={() => setRotation((r) => (r + 90) % 360)} /></Tooltip>
        <Tooltip title="Recenter & reset"><Button icon={<AimOutlined />} onClick={recenter}>Recenter</Button></Tooltip>
        <Tooltip title="Cut away part of the photo (other products, text, borders)">
          <Button icon={<ScissorOutlined />} type={crop ? 'primary' : 'default'} onClick={() => setCropOpen(true)}>{crop ? 'Crop ✓' : 'Crop'}</Button>
        </Tooltip>
        <Tooltip title="Trim the empty edges and put the product in the middle of the square">
          <Button type={fitProduct ? 'primary' : 'default'} onClick={() => { setFitProduct((v) => !v); setScale(1); setOffset({ x: 0, y: 0 }); }}>Fit to product</Button>
        </Tooltip>
      </Space>
      <br />
      <Space wrap align="center" style={{ marginBottom: 10 }}>
        <Switch checked={removeBg} onChange={(v) => { setRemoveBg(v); if (!v) setEraser(false); }}
          checkedChildren="Background removed" unCheckedChildren="Remove background" disabled={!canCutout} />
        <Typography.Text type="secondary">Background:</Typography.Text>
        <Segmented value={bg} onChange={(v) => setBg(v as Background)} options={[
          { label: 'Transparent', value: 'transparent' }, { label: 'White', value: 'white' }, { label: 'Warm', value: 'warm' },
        ]} />
      </Space>

      {removeBg && canCutout && (
        <div style={{ marginBottom: 8 }}>
          <Space wrap align="center">
            <Typography.Text type="secondary" style={{ minWidth: 72, display: 'inline-block' }}>Strength</Typography.Text>
            <Slider style={{ width: 220 }} min={0} max={100} value={tolerance} onChange={setTolerance} />
            <Tooltip title={rotation !== 0 || editsArea ? 'Turn off rotation, crop and Fit to product to use the eraser' : 'Click stubborn background spots to remove them'}>
              <Button type={eraser ? 'primary' : 'default'} disabled={rotation !== 0 || editsArea} onClick={() => setEraser((v) => !v)}>
                Magic eraser
              </Button>
            </Tooltip>
            {erase.length > 0 && <Button icon={<ClearOutlined />} onClick={() => setErase([])}>Clear spots</Button>}
          </Space>
        </div>
      )}
      <Typography.Text type="secondary">
        Drag to move · scroll to zoom. The original photo is kept — this saves a new copy you can then make primary.
      </Typography.Text>
      <CropModal
        open={cropOpen}
        imageUrl={sourceUrl}
        initial={crop}
        onCancel={() => setCropOpen(false)}
        onApply={(next) => { setCrop(next); setCropOpen(false); setScale(1); setOffset({ x: 0, y: 0 }); }}
      />
    </Modal>
  );
}
