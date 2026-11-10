/**
 * Post Studio canvas editor, Figma style: click to select, drag to move,
 * handles to resize / rotate, double-click text to type, smart guides,
 * zoom and pan, layers and properties panels, undo / redo, PNG export.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { App, Button, Dropdown, Modal, Tooltip } from 'antd';
import {
  AimOutlined, BorderOutlined, CompressOutlined, DownloadOutlined, DragOutlined, ExpandOutlined, FontSizeOutlined,
  ImportOutlined, PictureOutlined, QuestionOutlined, RedoOutlined, UndoOutlined, ZoomInOutlined, ZoomOutOutlined,
} from '@ant-design/icons';
import { Circle, FilePlus2, History, MousePointer2, PanelLeft, PanelRight } from 'lucide-react';
import { blankDoc, makeImage, makeShape, makeText, parseDoc, type Box, type CanvasDoc, type ImageLayer, type Layer } from './model';
import { HANDLES, boxFromPoints, resizeBox, boxesIntersect, layerBounds, rotationFromPointer, snapBox, snapToGrid, type Guide, type Handle } from './geometry';
import {
  alignLayers, distributeLayers, duplicateLayers, expandGroups, groupLayers, moveLayers, pasteLayers, removeLayers,
  reorder, resizeLayer, resizeMany, selectionBounds, ungroupLayers, updateLayers, type AlignEdge, type OrderMove,
} from './ops';
import { historyReducer, initHistory } from './history';
import { exportDocPng, imagePlacement } from './draw';
import LayersPanel from './LayersPanel';
import PropertiesPanel from './PropertiesPanel';
import ContextBubble, { type BubbleActions } from './ContextBubble';
import StartScreen from './StartScreen';
import AddPanel from './AddPanel';
import { overlayLayer, widgets, type Widget } from './widgets';
import { hasPlainBackground, removeBackground as cutBackground, type WithOriginal } from './imageTools';
import './canvas.css';

export type Tool = 'select' | 'text' | 'rect' | 'ellipse' | 'hand';

export interface FramePreset { id: string; label: string; width: number; height: number }

export interface CanvasEditorProps {
  /** Post sizes the frame can be switched to. */
  frames: FramePreset[];
  /** Builds a document from the post made in the Create tab (template text becomes editable layers). */
  onImportPost?: () => Promise<CanvasDoc | null>;
  /** Product photos that can be dropped in as image layers. */
  productPhotos?: { name: string; src: string }[];
  /** Where the work is kept in this browser. */
  storageKey?: string;
  /** False while the tab is hidden, so its keyboard shortcuts don't fire. */
  active?: boolean;
  /** Opens the ready post ideas (in the Create tab). */
  onOpenIdeas?: () => void;
}

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

type Drag =
  | { kind: 'move'; start: { x: number; y: number }; startDoc: CanvasDoc; ids: string[]; bounds: Box; moved: boolean; alt: boolean; clickedId: string | null }
  | { kind: 'resize'; start: { x: number; y: number }; startDoc: CanvasDoc; ids: string[]; handle: Handle; bounds: Box }
  | { kind: 'rotate'; startDoc: CanvasDoc; id: string; center: { x: number; y: number } }
  | { kind: 'marquee'; start: { x: number; y: number }; base: string[] }
  | { kind: 'pan'; startClient: { x: number; y: number }; startPan: { x: number; y: number } }
  | { kind: 'create'; tool: 'rect' | 'ellipse' | 'text'; start: { x: number; y: number }; id: string | null }
  | { kind: 'crop'; start: { x: number; y: number }; startDoc: CanvasDoc; id: string };

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
};

/** Reads a picture file, shrinking it to at most `max` px so the work still fits in browser storage. */
export function readImageFile(file: File, max = 2000): Promise<{ src: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve(null);
      image.onload = () => {
        const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const png = file.type === 'image/png' || file.type === 'image/webp';
        resolve({ src: canvas.toDataURL(png ? 'image/png' : 'image/jpeg', 0.9), width: canvas.width, height: canvas.height });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function loadSavedDoc(key: string): CanvasDoc | null {
  try {
    return parseDoc(JSON.parse(window.localStorage.getItem(key) ?? 'null'));
  } catch {
    return null;
  }
}

export const SHORTCUTS: [string, string][] = [
  ['V', 'Move / select tool'], ['T', 'Text tool (click to add, drag for a width)'], ['R', 'Rectangle'], ['O', 'Ellipse'], ['H or hold Space', 'Hand: drag to pan'],
  ['Double-click text', 'Edit the text in place (Esc to finish)'], ['Double-click a group', 'Select one item inside it'], ['Double-click a photo', 'Crop: drag to move the photo, scroll to zoom'],
  ['Shift + click', 'Add to / remove from selection'], ['Drag on empty canvas', 'Select everything inside the box'],
  ['Shift while dragging', 'Move straight / keep proportions / rotate in 15° steps'], ['Alt while resizing', 'Resize from the centre'], ['Alt + drag', 'Drag out a copy'],
  ['Arrow keys', 'Nudge 1 px (Shift: 10 px)'], ['⌘/Ctrl + Z', 'Undo'], ['⇧ + ⌘/Ctrl + Z, ⌘/Ctrl + Y', 'Redo'],
  ['⌘/Ctrl + C / X / V', 'Copy / cut / paste'], ['⌘/Ctrl + D', 'Duplicate'], ['Delete / Backspace', 'Delete'], ['⌘/Ctrl + A', 'Select all'],
  ['⌘/Ctrl + G', 'Group'], ['⇧ + ⌘/Ctrl + G', 'Ungroup'], ['] / [', 'Bring forward / send backward'], ['⌘/Ctrl + ] / [', 'Bring to front / send to back'],
  ['⇧ + ⌘/Ctrl + L', 'Lock / unlock'], ['⇧ + ⌘/Ctrl + H', 'Hide / show'], ['Alt + A / D / W / S', 'Align left / right / top / bottom'], ['Alt + H / V', 'Align centres'],
  ['⌘/Ctrl + scroll, pinch', 'Zoom'], ['Scroll, two-finger drag', 'Pan'], ['⇧ + 1', 'Fit to screen'], ['⇧ + 0', 'Zoom to 100%'], ['⌘/Ctrl + = / −', 'Zoom in / out'],
  ["'", 'Show / hide grid'], ['⌘/Ctrl + E', 'Export PNG'], ['?', 'This list'],
];

export default function CanvasEditor({ frames, onImportPost, productPhotos = [], storageKey = 'postStudio.canvas.v1', active = true, onOpenIdeas }: CanvasEditorProps) {
  const { message } = App.useApp();
  const [history, dispatch] = useReducer(historyReducer, storageKey, (key) => initHistory(loadSavedDoc(key) ?? blankDoc()));
  const doc = history.present;
  const docRef = useRef(doc);

  const [selected, setSelected] = useState<string[]>([]);
  const selectedRef = useRef(selected);
  const [enteredGroup, setEnteredGroup] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [croppingId, setCroppingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [spaceDown, setSpaceDown] = useState(false);
  const [zoom, setZoom] = useState(0.4);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const view = useRef({ zoom, pan });
  // Handlers read the latest values through refs (kept in step after each render).
  useLayoutEffect(() => {
    docRef.current = doc;
    selectedRef.current = selected;
    view.current = { zoom, pan };
  });
  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [hud, setHud] = useState<{ text: string; x: number; y: number } | null>(null);
  const [gridSize, setGridSize] = useState(0);
  const [snapping, setSnapping] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [natural, setNatural] = useState<Record<string, { w: number; h: number }>>({});
  const clipboard = useRef<{ layers: Layer[]; groups: CanvasDoc['groups'] } | null>(null);
  /** Bubble menu at the mouse: screen position (in the stage) and the post point it was opened at. */
  const [bubble, setBubble] = useState<{ x: number; y: number; at: { x: number; y: number } } | null>(null);
  const [plainBg, setPlainBg] = useState<boolean | null>(null);
  const [leftTab, setLeftTab] = useState<'add' | 'layers'>('add');
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const panelsRef = useRef({ left: true, right: true });
  useLayoutEffect(() => { panelsRef.current = { left: showLeft, right: showRight }; });
  const [hasClip, setHasClip] = useState(false);
  const [startOpen, setStartOpen] = useState(() => !loadSavedDoc(storageKey)?.layers.length);
  const previousKey = `${storageKey}.previous`;
  const [previous, setPrevious] = useState<CanvasDoc | null>(() => loadSavedDoc(`${storageKey}.previous`));
  const stageRef = useRef<HTMLDivElement>(null);
  const replaceRef = useRef<string | null>(null);
  const longPress = useRef<{ timer: number; x: number; y: number } | null>(null);
  const pasteCount = useRef(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRefs = useRef(new Map<string, HTMLDivElement>());
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; mid: { x: number; y: number }; zoom: number; pan: { x: number; y: number } } | null>(null);

  /* ------------------------------------------------------------- helpers */

  const commit = useCallback((next: CanvasDoc, mergeKey?: string) => dispatch({ type: 'set', doc: next, mergeKey }), []);
  const live = useCallback((next: CanvasDoc) => dispatch({ type: 'set', doc: next, record: false }), []);

  const toDoc = useCallback((clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const { zoom: z, pan: p } = view.current;
    return { x: (clientX - (rect?.left ?? 0) - p.x) / z, y: (clientY - (rect?.top ?? 0) - p.y) / z };
  }, []);

  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    const d = docRef.current;
    // Leave room for the floating panels and the tool dock, so the post sits centred in the free space.
    const roomy = width > 900;
    const left = roomy && panelsRef.current.left ? 256 : 0;
    const right = roomy && panelsRef.current.right ? 288 : 0;
    const bottom = 64;
    const freeW = width - left - right;
    const freeH = height - bottom;
    const z = clampZoom(Math.min((freeW - 64) / d.width, (freeH - 56) / d.height));
    const p = { x: left + (freeW - d.width * z) / 2, y: (freeH - d.height * z) / 2 + 8 };
    view.current = { zoom: z, pan: p };
    setZoom(z);
    setPan(p);
  }, []);

  const zoomAt = useCallback((next: number, clientX?: number, clientY?: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sx = clientX === undefined ? rect.width / 2 : clientX - rect.left;
    const sy = clientY === undefined ? rect.height / 2 : clientY - rect.top;
    const { zoom: z, pan: p } = view.current;
    const nz = clampZoom(next);
    const np = { x: sx - ((sx - p.x) / z) * nz, y: sy - ((sy - p.y) / z) * nz };
    view.current = { zoom: nz, pan: np };
    setPan(np);
    setZoom(nz);
  }, []);

  // Fit the frame when the editor first gets a size, and when the frame size changes.
  const fitted = useRef(false);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (!fitted.current && el.clientWidth > 0) {
        fitted.current = true;
        fit();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);
  const frameKey = `${doc.width}x${doc.height}`;
  const lastFrame = useRef(frameKey);
  useEffect(() => {
    if (lastFrame.current !== frameKey) {
      lastFrame.current = frameKey;
      fit();
    }
  }, [frameKey, fit]);

  const layerById = useMemo(() => new Map(doc.layers.map((l) => [l.id, l])), [doc.layers]);
  const selectedLayers = useMemo(() => selected.map((id) => layerById.get(id)).filter((l): l is Layer => !!l), [selected, layerById]);

  // Drop selected ids that no longer exist (after undo, delete...).
  useEffect(() => {
    if (selected.some((id) => !layerById.has(id))) setSelected((ids) => ids.filter((id) => layerById.has(id)));
    if (editingId && !layerById.has(editingId)) setEditingId(null);
    if (croppingId && !layerById.has(croppingId)) setCroppingId(null);
  }, [layerById, selected, editingId, croppingId]);

  /** What a click on a layer selects: its whole group, unless that group was entered by double-click. */
  const clickTarget = useCallback((layer: Layer) => (layer.groupId && layer.groupId !== enteredGroup
    ? docRef.current.layers.filter((l) => l.groupId === layer.groupId).map((l) => l.id)
    : [layer.id]), [enteredGroup]);

  /* ------------------------------------------------------------- autosave */

  const warnedFull = useRef(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(doc));
      } catch {
        if (!warnedFull.current) {
          warnedFull.current = true;
          message.warning('This design is too big to keep in the browser. Export it as a PNG, or use smaller photos.');
        }
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [doc, storageKey, message]);

  /* ------------------------------------------------------------- text box heights */

  // Text boxes grow with their text, like Figma's "auto height".
  useLayoutEffect(() => {
    const patches: [string, number][] = [];
    textRefs.current.forEach((el, id) => {
      const layer = layerById.get(id);
      if (!layer || layer.type !== 'text') return;
      const h = el.offsetHeight;
      if (h > 0 && Math.abs(h - layer.h) > 0.5) patches.push([id, h]);
    });
    if (!patches.length) return;
    const map = new Map(patches);
    live({ ...docRef.current, layers: docRef.current.layers.map((l) => (map.has(l.id) ? ({ ...l, h: map.get(l.id)! } as Layer) : l)) });
  });

  /* ------------------------------------------------------------- actions */

  const selectAll = useCallback(() => {
    setEnteredGroup(null);
    setSelected(docRef.current.layers.filter((l) => l.visible && !l.locked).map((l) => l.id));
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedRef.current.length) return;
    commit(removeLayers(docRef.current, selectedRef.current));
    setSelected([]);
  }, [commit]);

  const duplicateSelected = useCallback(() => {
    if (!selectedRef.current.length) return;
    const { doc: next, ids } = duplicateLayers(docRef.current, selectedRef.current);
    commit(next);
    setSelected(ids);
  }, [commit]);

  const copySelected = useCallback((cut = false) => {
    const ids = new Set(selectedRef.current);
    const layers = docRef.current.layers.filter((l) => ids.has(l.id));
    if (!layers.length) return;
    clipboard.current = { layers, groups: docRef.current.groups };
    setHasClip(true);
    pasteCount.current = 0;
    if (cut) deleteSelected();
  }, [deleteSelected]);

  const paste = useCallback(() => {
    if (!clipboard.current) return false;
    pasteCount.current += 1;
    const { doc: next, ids } = pasteLayers(docRef.current, clipboard.current, 24 * pasteCount.current);
    commit(next);
    setSelected(ids);
    return true;
  }, [commit]);

  const nudge = useCallback((dx: number, dy: number) => {
    if (!selectedRef.current.length) return;
    commit(moveLayers(docRef.current, selectedRef.current, dx, dy), `nudge:${selectedRef.current.join()}`);
  }, [commit]);

  const align = useCallback((edge: AlignEdge) => commit(alignLayers(docRef.current, selectedRef.current, edge)), [commit]);
  const distribute = useCallback((axis: 'x' | 'y') => commit(distributeLayers(docRef.current, selectedRef.current, axis)), [commit]);
  const arrange = useCallback((move: OrderMove) => commit(reorder(docRef.current, selectedRef.current, move)), [commit]);
  const group = useCallback(() => {
    const { doc: next, groupId } = groupLayers(docRef.current, selectedRef.current);
    if (groupId) commit(next);
  }, [commit]);
  const ungroup = useCallback(() => {
    commit(ungroupLayers(docRef.current, selectedRef.current));
    setEnteredGroup(null);
  }, [commit]);
  const toggleOnSelected = useCallback((key: 'locked' | 'visible') => {
    const layers = docRef.current.layers.filter((l) => selectedRef.current.includes(l.id));
    if (!layers.length) return;
    const value = key === 'locked' ? !layers.every((l) => l.locked) : !layers.every((l) => l.visible);
    commit(updateLayers(docRef.current, selectedRef.current, { [key]: value }));
    if ((key === 'locked' && value) || (key === 'visible' && !value)) setSelected([]);
  }, [commit]);

  const addLayer = useCallback((layer: Layer, edit = false) => {
    commit({ ...docRef.current, layers: [...docRef.current.layers, layer] });
    setSelected([layer.id]);
    setEnteredGroup(null);
    setTool('select');
    if (edit) setEditingId(layer.id);
  }, [commit]);

  /** Adds layers (several made together become one group) and selects them. */
  const addLayers = useCallback((layers: Layer[], groupName?: string) => {
    if (!layers.length) return [];
    let next: CanvasDoc = { ...docRef.current, layers: [...docRef.current.layers, ...layers] };
    let ids = layers.map((l) => l.id);
    if (groupName && layers.length > 1) {
      const grouped = groupLayers(next, ids);
      next = grouped.groupId ? { ...grouped.doc, groups: { ...grouped.doc.groups, [grouped.groupId]: { name: groupName } } } : next;
      ids = layers.map((l) => l.id);
    }
    commit(next);
    setSelected(ids);
    setEnteredGroup(null);
    setTool('select');
    return ids;
  }, [commit]);

  /** Several pictures land side by side (all selected, ready to group); one lands in the middle. */
  const addImagesRow = useCallback((items: { src: string; width: number; height: number; name: string }[], at?: { x: number; y: number }, groupName?: string) => {
    if (!items.length) return;
    const d = docRef.current;
    const gap = Math.min(d.width, d.height) * 0.03;
    const targetH = items.length === 1 ? Math.min(d.height * 0.6, (d.width * 0.6 * items[0].height) / items[0].width) : d.height * 0.35;
    let sizes = items.map((it) => ({ w: (it.width / it.height) * targetH, h: targetH }));
    const total = sizes.reduce((sum, sz) => sum + sz.w, 0) + gap * (items.length - 1);
    const maxW = d.width * 0.9;
    if (total > maxW) sizes = sizes.map((sz) => ({ w: (sz.w * (maxW - gap * (items.length - 1))) / (total - gap * (items.length - 1)), h: (sz.h * (maxW - gap * (items.length - 1))) / (total - gap * (items.length - 1)) }));
    const rowW = sizes.reduce((sum, sz) => sum + sz.w, 0) + gap * (items.length - 1);
    const cx = at?.x ?? d.width / 2;
    const cy = at?.y ?? d.height / 2;
    let x = cx - rowW / 2;
    const layers = items.map((it, i) => {
      const layer = makeImage(it.src, { x, y: cy - sizes[i].h / 2, w: sizes[i].w, h: sizes[i].h }, { name: it.name, fit: 'contain' });
      x += sizes[i].w + gap;
      return layer;
    });
    addLayers(layers, groupName);
    if (items.length > 1 && !groupName) message.info(`${items.length} pictures added and selected. Press ⌘/Ctrl + G to group them.`);
  }, [addLayers, message]);

  const addImageFiles = useCallback(async (files: FileList | File[], at?: { x: number; y: number }) => {
    const picked = [...files].filter((f) => f.type.startsWith('image/'));
    const results = await Promise.all(picked.map(async (file) => {
      const result = await readImageFile(file);
      return result ? { ...result, name: file.name.replace(/\.[^.]+$/, '') || 'Image' } : null;
    }));
    const ok = results.filter((r): r is NonNullable<typeof r> => !!r);
    if (ok.length < picked.length) message.error('Some pictures could not be read.');
    // Replacing one picture keeps its box; otherwise add them.
    const replaceId = replaceRef.current;
    replaceRef.current = null;
    if (replaceId && ok[0]) {
      commit(updateLayers(docRef.current, [replaceId], { src: ok[0].src, originalSrc: undefined } as Partial<Layer>));
      return;
    }
    addImagesRow(ok, at);
  }, [addImagesRow, commit, message]);

  const loadPhoto = (photo: { name: string; src: string }) => new Promise<{ src: string; width: number; height: number; name: string } | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve({ src: photo.src, width: image.naturalWidth, height: image.naturalHeight, name: photo.name });
    image.onerror = () => resolve(null);
    image.src = photo.src;
  });

  const addProductPhoto = useCallback(async (photo: { name: string; src: string }) => {
    const item = await loadPhoto(photo);
    if (item) addImagesRow([item]); else message.error('Could not load that photo.');
  }, [addImagesRow, message]);

  const addAllProducts = useCallback(async () => {
    const items = (await Promise.all(productPhotos.map(loadPhoto))).filter((it): it is NonNullable<typeof it> => !!it);
    addImagesRow(items, undefined, 'Products');
  }, [addImagesRow, productPhotos]);

  const addWidget = useCallback((widget: Widget, at?: { x: number; y: number }) => {
    const d = docRef.current;
    if (widget.id === 'shade') {
      // Above a full-frame background, below everything else.
      const layer = overlayLayer(d.width, d.height);
      const first = d.layers[0];
      const index = first && first.w >= d.width - 1 && first.h >= d.height - 1 ? 1 : 0;
      const layers = [...d.layers];
      layers.splice(index, 0, layer);
      commit({ ...d, layers });
      setSelected([layer.id]);
      return;
    }
    const made = widget.make(at?.x ?? d.width / 2, at?.y ?? d.height / 2, Math.min(d.width, d.height));
    addLayers(made.layers, made.groupName);
  }, [addLayers, commit]);

  const removeBg = useCallback(async (id: string) => {
    const layer = docRef.current.layers.find((l) => l.id === id) as WithOriginal | undefined;
    if (!layer || layer.type !== 'image') return;
    const hide = message.loading('Removing the background…', 0);
    const result = await cutBackground(layer);
    hide();
    if (!result) {
      message.error('Could not remove the background from this picture.');
      return;
    }
    commit(updateLayers(docRef.current, [id], result as Partial<Layer>));
    message.success('Background removed. Use “Restore original background” to undo it.');
  }, [commit, message]);

  const restoreBg = useCallback((id: string) => {
    const layer = docRef.current.layers.find((l) => l.id === id) as WithOriginal | undefined;
    if (!layer?.originalSrc) return;
    commit(updateLayers(docRef.current, [id], { src: layer.originalSrc, originalSrc: undefined } as Partial<Layer>));
  }, [commit]);

  /** Starts a new design; the one on screen is kept as "previous" to go back to. */
  const keepAsPrevious = useCallback(() => {
    const current = docRef.current;
    if (!current.layers.length) return;
    setPrevious(current);
    try { window.localStorage.setItem(previousKey, JSON.stringify(current)); } catch { /* too big: kept for this visit only */ }
  }, [previousKey]);

  const newBlank = useCallback((width: number, height: number) => {
    keepAsPrevious();
    commit({ ...blankDoc(width, height), background: '#ffffff', textStyles: docRef.current.textStyles });
    setSelected([]);
    setStartOpen(false);
    setTimeout(() => fit(), 30);
  }, [commit, fit, keepAsPrevious]);

  const backToPrevious = useCallback(() => {
    if (!previous) return;
    const current = docRef.current;
    commit(previous);
    if (current.layers.length) {
      setPrevious(current);
      try { window.localStorage.setItem(previousKey, JSON.stringify(current)); } catch { /* ignore */ }
    } else {
      setPrevious(null);
      try { window.localStorage.removeItem(previousKey); } catch { /* ignore */ }
    }
    setSelected([]);
    setStartOpen(false);
    setTimeout(() => fit(), 30);
  }, [commit, fit, previous, previousKey]);

  const exportPng = useCallback(async () => {
    setEditingId(null);
    const hide = message.loading('Exporting…', 0);
    try {
      const blob = await exportDocPng(docRef.current);
      if (!blob) throw new Error('empty');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `post-${docRef.current.width}x${docRef.current.height}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      message.success('PNG downloaded at full post size');
    } catch {
      message.error('Export failed. A photo from another website may be blocking it; try uploading it instead.');
    } finally {
      hide();
    }
  }, [message]);

  const importPost = useCallback(async () => {
    if (!onImportPost) return;
    const hide = message.loading('Turning the post into layers…', 0);
    try {
      const next = await onImportPost();
      if (next) {
        keepAsPrevious();
        commit(next);
        setSelected([]);
        setEnteredGroup(null);
        setStartOpen(false);
        setTimeout(() => fit(), 30);
        message.success('Done: click any text to select it, double-click to type.');
      }
    } finally {
      hide();
    }
  }, [commit, fit, keepAsPrevious, message, onImportPost]);

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void el.requestFullscreen?.().then(() => setTimeout(fit, 50));
  }, [fit]);

  /* ------------------------------------------------------------- keyboard */

  useEffect(() => {
    if (!active) return;
    const down = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (editingId) {
        if (event.key === 'Escape' || (mod && event.key === 'Enter')) {
          event.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur();
          setEditingId(null);
        }
        return;
      }
      if (isTyping(event.target)) return;
      if (croppingId && (event.key === 'Escape' || event.key === 'Enter')) {
        setCroppingId(null);
        return;
      }
      if (event.code === 'Space' && !event.repeat) {
        setSpaceDown(true);
        event.preventDefault();
        return;
      }
      const handled = () => event.preventDefault();
      if (mod && key === 'z') { handled(); dispatch({ type: event.shiftKey ? 'redo' : 'undo' }); return; }
      if (mod && key === 'y') { handled(); dispatch({ type: 'redo' }); return; }
      if (mod && key === 'a') { handled(); selectAll(); return; }
      if (mod && key === 'd') { handled(); duplicateSelected(); return; }
      if (mod && key === 'c') { copySelected(); return; }
      if (mod && key === 'x') { copySelected(true); return; }
      if (mod && key === 'g') { handled(); if (event.shiftKey) ungroup(); else group(); return; }
      if (mod && event.shiftKey && key === 'l') { handled(); toggleOnSelected('locked'); return; }
      if (mod && event.shiftKey && key === 'h') { handled(); toggleOnSelected('visible'); return; }
      if (mod && key === 'e') { handled(); void exportPng(); return; }
      if (mod && (key === '=' || key === '+')) { handled(); zoomAt(view.current.zoom * 1.25); return; }
      if (mod && key === '-') { handled(); zoomAt(view.current.zoom / 1.25); return; }
      if (mod && key === '0') { handled(); zoomAt(1); return; }
      if (mod && event.key === ']') { handled(); arrange('front'); return; }
      if (mod && event.key === '[') { handled(); arrange('back'); return; }
      if (mod) return;
      if (event.altKey && selectedRef.current.length) {
        const map: Record<string, AlignEdge> = { a: 'left', d: 'right', w: 'top', s: 'bottom', h: 'hcenter', v: 'vcenter' };
        const edge = map[event.code.replace('Key', '').toLowerCase()];
        if (edge) { handled(); align(edge); return; }
      }
      if (event.shiftKey && (event.code === 'Digit1')) { handled(); fit(); return; }
      if (event.shiftKey && (event.code === 'Digit0')) { handled(); zoomAt(1); return; }
      if (event.key === 'Delete' || event.key === 'Backspace') { handled(); deleteSelected(); return; }
      if (event.key === 'Escape') { setSelected([]); setEnteredGroup(null); setTool('select'); return; }
      if (event.key === 'Enter' && selectedRef.current.length === 1) {
        const layer = docRef.current.layers.find((l) => l.id === selectedRef.current[0]);
        if (layer?.type === 'text') { handled(); setEditingId(layer.id); }
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      if (event.key === 'ArrowLeft') { handled(); nudge(-step, 0); return; }
      if (event.key === 'ArrowRight') { handled(); nudge(step, 0); return; }
      if (event.key === 'ArrowUp') { handled(); nudge(0, -step); return; }
      if (event.key === 'ArrowDown') { handled(); nudge(0, step); return; }
      if (event.key === ']') { arrange('forward'); return; }
      if (event.key === '[') { arrange('backward'); return; }
      if (event.key === '?') { setHelpOpen(true); return; }
      if (event.key === "'") { setGridSize((g) => (g ? 0 : 20)); return; }
      const tools: Record<string, Tool> = { v: 'select', t: 'text', r: 'rect', o: 'ellipse', h: 'hand' };
      if (tools[key] && !event.altKey) setTool(tools[key]);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpaceDown(false);
    };
    const onPaste = (event: ClipboardEvent) => {
      if (isTyping(event.target) || editingId) return;
      const files = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) {
        event.preventDefault();
        void addImageFiles(files);
        return;
      }
      if (paste()) event.preventDefault();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('paste', onPaste);
    };
  }, [active, editingId, croppingId, selectAll, duplicateSelected, copySelected, paste, group, ungroup, toggleOnSelected, exportPng, zoomAt, arrange, align, fit, deleteSelected, nudge, addImageFiles]);

  /* ------------------------------------------------------------- wheel: zoom & pan */

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        zoomAt(view.current.zoom * Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY);
      } else if (croppingId) {
        const layer = docRef.current.layers.find((l) => l.id === croppingId) as ImageLayer | undefined;
        if (layer) commit(updateLayers(docRef.current, [layer.id], { zoom: Math.min(8, Math.max(1, layer.zoom * Math.exp(-event.deltaY * 0.005))) }), `crop:${layer.id}`);
      } else {
        const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
        const dy = event.shiftKey && !event.deltaX ? 0 : event.deltaY;
        setPan((p) => ({ x: p.x - dx, y: p.y - dy }));
      }
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [zoomAt, croppingId, commit]);

  /* ------------------------------------------------------------- pointer */

  const panning = tool === 'hand' || spaceDown;

  /** Opens the bubble menu at a screen point (inside the stage). */
  const openBubble = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    setBubble({ x: clientX - stage.left + 6, y: clientY - stage.top + 6, at: toDoc(clientX, clientY) });
  }, [toDoc]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    setHoverId(null);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      // Two fingers: pinch to zoom, move to pan. Cancel whatever one finger started.
      const [a, b] = [...pointers.current.values()];
      if (drag.current && 'startDoc' in drag.current) live(drag.current.startDoc);
      drag.current = null;
      setMarquee(null);
      setGuides([]);
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, zoom: view.current.zoom, pan: view.current.pan };
      return;
    }
    if (event.button === 1 || panning) {
      drag.current = { kind: 'pan', startClient: { x: event.clientX, y: event.clientY }, startPan: view.current.pan };
      el.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const p = toDoc(event.clientX, event.clientY);

    // Handles on the selection.
    const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle as Handle | 'rotate' | undefined;
    if (handle) {
      event.stopPropagation();
      const ids = selectedRef.current.filter((id) => !layerById.get(id)?.locked);
      if (!ids.length) return;
      dispatch({ type: 'checkpoint' });
      if (handle === 'rotate') {
        const layer = layerById.get(ids[0])!;
        drag.current = { kind: 'rotate', startDoc: docRef.current, id: layer.id, center: { x: layer.x + layer.w / 2, y: layer.y + layer.h / 2 } };
      } else {
        const bounds = ids.length === 1 ? layerById.get(ids[0])! : selectionBounds(docRef.current, ids)!;
        drag.current = { kind: 'resize', start: p, startDoc: docRef.current, ids, handle, bounds: { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h } };
      }
      el.setPointerCapture(event.pointerId);
      return;
    }

    if (editingId && !target.closest(`[data-layer-id="${editingId}"]`)) setEditingId(null);
    if (editingId && target.closest(`[data-layer-id="${editingId}"]`)) return;

    // Crop mode: drag moves the photo inside its box.
    if (croppingId) {
      if (target.closest(`[data-layer-id="${croppingId}"]`) || target.closest('.ce-crop-ghost')) {
        dispatch({ type: 'checkpoint' });
        drag.current = { kind: 'crop', start: p, startDoc: docRef.current, id: croppingId };
        el.setPointerCapture(event.pointerId);
        return;
      }
      setCroppingId(null);
    }

    if (tool === 'text' || tool === 'rect' || tool === 'ellipse') {
      drag.current = { kind: 'create', tool, start: p, id: null };
      el.setPointerCapture(event.pointerId);
      return;
    }

    const layerEl = target.closest<HTMLElement>('[data-layer-id]');
    const layer = layerEl ? layerById.get(layerEl.dataset.layerId!) : undefined;
    if (layer && !layer.locked) {
      const targetIds = clickTarget(layer);
      if (!layer.groupId || layer.groupId !== enteredGroup) {
        if (!layer.groupId) setEnteredGroup(null);
      }
      let ids = selectedRef.current;
      const already = targetIds.every((id) => ids.includes(id));
      if (event.shiftKey) {
        ids = already ? ids.filter((id) => !targetIds.includes(id)) : [...ids, ...targetIds];
        setSelected(ids);
        if (already) return;
      } else if (!already) {
        ids = targetIds;
        setSelected(ids);
      }
      const movable = ids.filter((id) => !layerById.get(id)?.locked);
      if (!movable.length) return;
      drag.current = {
        kind: 'move', start: p, startDoc: docRef.current, ids: movable, bounds: selectionBounds(docRef.current, movable)!,
        moved: false, alt: event.altKey, clickedId: already && !event.shiftKey ? layer.id : null,
      };
      el.setPointerCapture(event.pointerId);
      return;
    }

    // Empty canvas: touch pans (hold still for the add bubble), mouse draws a selection box.
    if (event.pointerType === 'touch') {
      const { clientX, clientY } = event;
      longPress.current = { x: clientX, y: clientY, timer: window.setTimeout(() => { drag.current = null; setSelected([]); openBubble(clientX, clientY); }, 550) };
      drag.current = { kind: 'pan', startClient: { x: event.clientX, y: event.clientY }, startPan: view.current.pan };
    } else {
      if (!event.shiftKey) setSelected([]);
      setEnteredGroup(null);
      drag.current = { kind: 'marquee', start: p, base: event.shiftKey ? selectedRef.current : [] };
    }
    el.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const start = pinch.current;
      const rect = viewportRef.current!.getBoundingClientRect();
      const nz = clampZoom(start.zoom * (dist / Math.max(1, start.dist)));
      const sx = start.mid.x - rect.left;
      const sy = start.mid.y - rect.top;
      setZoom(nz);
      setPan({ x: sx - ((sx - start.pan.x) / start.zoom) * nz + (mid.x - start.mid.x), y: sy - ((sy - start.pan.y) / start.zoom) * nz + (mid.y - start.mid.y) });
      return;
    }
    const d = drag.current;
    if (!d) {
      if (event.pointerType === 'mouse') {
        const id = (event.target as HTMLElement).closest<HTMLElement>('[data-layer-id]')?.dataset.layerId ?? null;
        if (id !== hoverId) setHoverId(id);
      }
      return;
    }
    if (longPress.current && Math.hypot(event.clientX - longPress.current.x, event.clientY - longPress.current.y) > 8) {
      window.clearTimeout(longPress.current.timer);
      longPress.current = null;
    }
    if (d.kind === 'pan') {
      setPan({ x: d.startPan.x + event.clientX - d.startClient.x, y: d.startPan.y + event.clientY - d.startClient.y });
      return;
    }
    const p = toDoc(event.clientX, event.clientY);
    const z = view.current.zoom;
    const frame = { x: 0, y: 0, w: docRef.current.width, h: docRef.current.height };

    if (d.kind === 'move') {
      let dx = p.x - d.start.x;
      let dy = p.y - d.start.y;
      if (!d.moved) {
        if (Math.hypot(dx, dy) * z < 3) return;
        d.moved = true;
        dispatch({ type: 'checkpoint' });
        if (d.alt) {
          // Alt-drag: leave the originals, drag copies.
          const { doc: withCopies, ids } = duplicateLayers(d.startDoc, d.ids, 0);
          d.startDoc = withCopies;
          d.ids = ids;
          setSelected(ids);
        }
      }
      if (event.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0;
      }
      let box = { ...d.bounds, x: d.bounds.x + dx, y: d.bounds.y + dy };
      let shownGuides: Guide[] = [];
      if (gridSize) {
        const gx = snapToGrid(box.x, gridSize) - box.x;
        const gy = snapToGrid(box.y, gridSize) - box.y;
        dx += gx;
        dy += gy;
        box = { ...box, x: box.x + gx, y: box.y + gy };
      } else if (snapping && !event.metaKey && !event.ctrlKey) {
        const moving = new Set(d.ids);
        const targets = d.startDoc.layers.filter((l) => l.visible && !moving.has(l.id)).map(layerBounds);
        const snap = snapBox(box, targets, frame, 6 / z);
        dx += event.shiftKey && dx === 0 ? 0 : snap.dx;
        dy += event.shiftKey && dy === 0 ? 0 : snap.dy;
        shownGuides = snap.guides;
        box = { ...box, x: d.bounds.x + dx, y: d.bounds.y + dy };
      }
      setGuides(shownGuides);
      live(moveLayers(d.startDoc, d.ids, dx, dy));
      setHud({ text: `X ${Math.round(box.x)}  Y ${Math.round(box.y)}`, x: box.x, y: box.y + box.h });
      return;
    }

    if (d.kind === 'resize') {
      const dx = p.x - d.start.x;
      const dy = p.y - d.start.y;
      const opts = { keepRatio: event.shiftKey, fromCenter: event.altKey };
      if (d.ids.length === 1) {
        const start = d.startDoc.layers.find((l) => l.id === d.ids[0])!;
        const patch = resizeLayer(start, d.handle, dx, dy, opts);
        live(updateLayers(d.startDoc, d.ids, patch));
        setHud({ text: `${Math.round(patch.w ?? start.w)} × ${Math.round(patch.h ?? start.h)}`, x: (patch.x ?? start.x), y: (patch.y ?? start.y) + (patch.h ?? start.h) });
      } else {
        const next = resizeBox(d.bounds, 0, d.handle, dx, dy, opts);
        const startLayers = d.startDoc.layers.filter((l) => d.ids.includes(l.id));
        const patches = resizeMany(startLayers, d.bounds, next);
        live({ ...d.startDoc, layers: d.startDoc.layers.map((l) => (patches.has(l.id) ? ({ ...l, ...patches.get(l.id) } as Layer) : l)) });
        setHud({ text: `${Math.round(next.w)} × ${Math.round(next.h)}`, x: next.x, y: next.y + next.h });
      }
      return;
    }

    if (d.kind === 'rotate') {
      const rotation = rotationFromPointer(d.center, p.x, p.y, event.shiftKey);
      live(updateLayers(d.startDoc, [d.id], { rotation }));
      setHud({ text: `${Math.round(rotation)}°`, x: d.center.x, y: d.center.y });
      return;
    }

    if (d.kind === 'crop') {
      const layer = d.startDoc.layers.find((l) => l.id === d.id) as ImageLayer;
      const size = natural[layer.src];
      if (!size) return;
      const placed = imagePlacement(layer, size.w, size.h);
      const spareX = layer.w - placed.w;
      const spareY = layer.h - placed.h;
      const fx = spareX ? Math.min(1, Math.max(0, layer.focusX + (p.x - d.start.x) / spareX)) : layer.focusX;
      const fy = spareY ? Math.min(1, Math.max(0, layer.focusY + (p.y - d.start.y) / spareY)) : layer.focusY;
      live(updateLayers(d.startDoc, [d.id], { focusX: fx, focusY: fy }));
      return;
    }

    if (d.kind === 'marquee') {
      const box = boxFromPoints(d.start.x, d.start.y, p.x, p.y);
      setMarquee(box);
      const hits = docRef.current.layers.filter((l) => l.visible && !l.locked && boxesIntersect(layerBounds(l), box)).map((l) => l.id);
      setSelected([...new Set([...d.base, ...expandGroups(docRef.current, hits)])]);
      return;
    }

    if (d.kind === 'create') {
      let box = boxFromPoints(d.start.x, d.start.y, p.x, p.y);
      if (event.shiftKey) {
        const s = Math.max(box.w, box.h);
        box = { x: p.x < d.start.x ? d.start.x - s : d.start.x, y: p.y < d.start.y ? d.start.y - s : d.start.y, w: s, h: s };
      }
      if (box.w * z < 3 && box.h * z < 3) return;
      if (!d.id) {
        dispatch({ type: 'checkpoint' });
        const layer = d.tool === 'text'
          ? makeText({ x: box.x, y: box.y, w: Math.max(40, box.w) })
          : makeShape(d.tool, box);
        d.id = layer.id;
        live({ ...docRef.current, layers: [...docRef.current.layers, layer] });
        setSelected([layer.id]);
      } else {
        live(updateLayers(docRef.current, [d.id], d.tool === 'text' ? { x: box.x, y: box.y, w: Math.max(40, box.w) } : box));
      }
      setHud({ text: `${Math.round(box.w)} × ${Math.round(box.h)}`, x: box.x, y: box.y + box.h });
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (longPress.current) {
      window.clearTimeout(longPress.current.timer);
      longPress.current = null;
    }
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      return;
    }
    const d = drag.current;
    drag.current = null;
    setGuides([]);
    setMarquee(null);
    setHud(null);
    if (!d) return;
    if (d.kind === 'move') {
      // Click (no drag) on an item of a multi-selection selects just that item.
      if (!d.moved && d.clickedId && selectedRef.current.length > 1) {
        const layer = layerById.get(d.clickedId);
        if (layer) setSelected(clickTarget(layer));
      }
      if (d.moved) dispatch({ type: 'settle' });
      return;
    }
    if (d.kind === 'resize' || d.kind === 'rotate' || d.kind === 'crop') {
      dispatch({ type: 'settle' });
      return;
    }
    if (d.kind === 'create') {
      if (d.id) {
        dispatch({ type: 'settle' });
        setTool('select');
        if (d.tool === 'text') setEditingId(d.id);
        return;
      }
      // A click without dragging: drop in a default-sized item.
      const p = d.start;
      if (d.tool === 'text') addLayer(makeText({ x: p.x, y: p.y }), true);
      else addLayer(makeShape(d.tool, { x: p.x - 100, y: p.y - 100, w: 200, h: 200 }));
    }
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-layer-id]')?.dataset.layerId;
    const layer = id ? layerById.get(id) : undefined;
    if (!layer || layer.locked) {
      // Double-click on empty canvas: the "add" bubble.
      if (!(event.target as HTMLElement).closest('[data-handle]')) {
        setSelected([]);
        openBubble(event.clientX, event.clientY);
      }
      return;
    }
    if (layer.groupId && layer.groupId !== enteredGroup) {
      // First double-click on a group goes inside it.
      setEnteredGroup(layer.groupId);
      setSelected([layer.id]);
      if (layer.type !== 'text') return;
    }
    setSelected([layer.id]);
    if (layer.type === 'text') {
      setEditingId(layer.id);
      // Formatting bubble next to the text being edited.
      const el = textRefs.current.get(layer.id)?.getBoundingClientRect();
      if (el) openBubble(Math.min(el.right + 8, window.innerWidth - 300), el.top);
    }
    if (layer.type === 'image') setCroppingId(layer.id);
  };

  const onContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-layer-id]')?.dataset.layerId;
    const layer = id ? layerById.get(id) : undefined;
    if (layer && !layer.locked) {
      if (!selectedRef.current.includes(layer.id)) setSelected(clickTarget(layer));
    } else {
      setSelected([]);
    }
    setEditingId(null);
    openBubble(event.clientX, event.clientY);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const widgetId = event.dataTransfer.getData('application/x-tessa-widget');
    if (widgetId) {
      event.preventDefault();
      const widget = widgets().find((w) => w.id === widgetId);
      if (widget) addWidget(widget, toDoc(event.clientX, event.clientY));
      return;
    }
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    event.stopPropagation();
    void addImageFiles(event.dataTransfer.files, toDoc(event.clientX, event.clientY));
  };

  // A picture under the bubble: check for a plain background to offer removing it.
  const bubbleImage = bubble && selectedLayers.length === 1 && selectedLayers[0].type === 'image' ? selectedLayers[0] : null;
  useEffect(() => {
    if (!bubbleImage) return;
    let live = true;
    void hasPlainBackground(bubbleImage.src).then((plain) => { if (live) setPlainBg(plain); });
    return () => { live = false; setPlainBg(null); };
  }, [bubbleImage?.src]); // eslint-disable-line react-hooks/exhaustive-deps

  const bubbleActions: BubbleActions = {
    addText: () => addLayers([makeText({ x: (bubble?.at.x ?? doc.width / 2) - 300, y: bubble?.at.y ?? doc.height / 2 }, { align: 'center' })]).forEach((lid) => setEditingId(lid)),
    addImages: () => fileRef.current?.click(),
    addShape: (type) => {
      const at = bubble?.at ?? { x: doc.width / 2, y: doc.height / 2 };
      addLayers([makeShape(type, { x: at.x - 100, y: at.y - 100, w: 200, h: 200 })]);
    },
    openWidgets: () => { setShowLeft(true); setLeftTab('add'); },
    paste: () => { paste(); },
    canPaste: hasClip,
    selectAll,
    duplicate: duplicateSelected,
    copy: () => copySelected(),
    remove: deleteSelected,
    arrange,
    group,
    ungroup,
    editText: (lid) => { setSelected([lid]); setEditingId(lid); },
    crop: (lid) => setCroppingId(lid),
    removeBackground: (lid) => void removeBg(lid),
    restoreBackground: restoreBg,
    replaceImage: (lid) => { replaceRef.current = lid; fileRef.current?.click(); },
  };

  /* ------------------------------------------------------------- render */

  const z = zoom;
  const selectionBox = selectedLayers.length > 1 ? selectionBounds(doc, selected) : null;
  const single = selectedLayers.length === 1 ? selectedLayers[0] : null;
  const isGroupSelection = selectedLayers.length > 1 && !!selectedLayers[0].groupId && selectedLayers.every((l) => l.groupId === selectedLayers[0].groupId);
  const hs = 8 / z;
  const line = 1.5 / z;

  const handles = (box: Box, rotation: number, allowRotate: boolean) => (
    <div className="ce-sel" style={{ left: box.x, top: box.y, width: box.w, height: box.h, borderWidth: line, transform: rotation ? `rotate(${rotation}deg)` : undefined }}>
      {HANDLES.map((h) => {
        const left = h.includes('w') ? 0 : h.includes('e') ? box.w : box.w / 2;
        const top = h.includes('n') ? 0 : h.includes('s') ? box.h : box.h / 2;
        const side = h.length === 1;
        // Side handles are long thin bars (easy to grab), corners are squares.
        const w = side && (h === 'n' || h === 's') ? Math.max(hs, Math.min(box.w - hs * 2, 24 / z)) : hs;
        const ht = side && (h === 'e' || h === 'w') ? Math.max(hs, Math.min(box.h - hs * 2, 24 / z)) : hs;
        return <div key={h} className="ce-handle" data-handle={h} style={{ left: left - w / 2, top: top - ht / 2, width: w, height: ht, borderWidth: line, borderRadius: 2 / z }} />;
      })}
      {allowRotate && <div className="ce-rotate" data-handle="rotate" style={{ left: box.w / 2 - hs / 2, top: -hs - 22 / z, width: hs + 2 / z, height: hs + 2 / z, borderWidth: line }} />}
    </div>
  );

  const layerStyle = (layer: Layer): CSSProperties => ({
    left: layer.x, top: layer.y, width: layer.w, height: layer.h,
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
    opacity: layer.opacity,
  });

  const renderLayer = (layer: Layer) => {
    if (!layer.visible) return null;
    const common = { 'data-layer-id': layer.id, 'data-locked': layer.locked ? 'true' : 'false' };
    if (layer.type === 'text') {
      const editing = editingId === layer.id;
      return (
        <div
          key={editing ? `${layer.id}:edit` : layer.id}
          {...common}
          ref={(el) => { if (el) textRefs.current.set(layer.id, el); else textRefs.current.delete(layer.id); }}
          className="ce-layer ce-text"
          contentEditable={editing ? 'plaintext-only' : undefined}
          suppressContentEditableWarning
          spellCheck={editing}
          onInput={editing ? (e) => commit(updateLayers(docRef.current, [layer.id], { text: (e.target as HTMLElement).innerText.replace(/\n$/, '') }), `text:${layer.id}`) : undefined}
          onBlur={editing ? () => setEditingId(null) : undefined}
          style={{
            ...layerStyle(layer),
            fontFamily: layer.fontFamily, fontSize: layer.fontSize, fontWeight: layer.fontWeight, fontStyle: layer.italic ? 'italic' : 'normal',
            color: layer.color, textAlign: layer.align, lineHeight: layer.lineHeight, letterSpacing: layer.letterSpacing,
            textTransform: layer.uppercase ? 'uppercase' : 'none',
          }}
        >
          {editing ? undefined : layer.text}
        </div>
      );
    }
    if (layer.type === 'image') {
      const size = natural[layer.src];
      const placed = size ? imagePlacement(layer, size.w, size.h) : { x: 0, y: 0, w: layer.w, h: layer.h };
      const cropping = croppingId === layer.id;
      return (
        <div key={layer.id} {...common} className={`ce-layer ce-image${cropping ? ' ce-image--cropping' : ''}`} style={{ ...layerStyle(layer), borderRadius: layer.radius }}>
          {cropping && <img className="ce-crop-ghost" src={layer.src} alt="" style={{ left: placed.x, top: placed.y, width: placed.w, height: placed.h }} />}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: layer.radius }}>
            <img
              src={layer.src}
              alt=""
              draggable={false}
              crossOrigin={layer.src.startsWith('data:') || layer.src.startsWith('blob:') ? undefined : 'anonymous'}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (!natural[layer.src]) setNatural((n) => ({ ...n, [layer.src]: { w: img.naturalWidth, h: img.naturalHeight } }));
              }}
              style={{ left: placed.x, top: placed.y, width: placed.w, height: placed.h }}
            />
          </div>
        </div>
      );
    }
    return (
      <div
        key={layer.id}
        {...common}
        className="ce-layer"
        style={{
          ...layerStyle(layer),
          background: layer.fill,
          border: layer.strokeWidth > 0 ? `${layer.strokeWidth}px solid ${layer.stroke}` : undefined,
          borderRadius: layer.type === 'ellipse' ? '50%' : layer.radius,
          boxSizing: 'border-box',
        }}
      />
    );
  };

  // Edit-in-place: put the text in and select it all when editing starts.
  useEffect(() => {
    if (!editingId) return;
    const el = textRefs.current.get(editingId);
    const layer = docRef.current.layers.find((l) => l.id === editingId);
    if (!el || !layer || layer.type !== 'text') return;
    el.innerText = layer.text;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editingId]);

  const hover = hoverId && !selected.includes(hoverId) ? layerById.get(hoverId) : null;
  const toolButton = (value: Tool, icon: React.ReactNode, label: string) => (
    <Tooltip title={label}><Button size="small" type={tool === value ? 'primary' : 'text'} icon={icon} onClick={() => setTool(value)} aria-label={label} aria-pressed={tool === value} /></Tooltip>
  );

  return (
    <div className="ce" ref={rootRef}>
      <div className="ce-toolbar">
        <Tooltip title="New design: blank frame, the post from Create, or back to the previous design"><Button size="small" icon={<FilePlus2 size={14} />} onClick={() => setStartOpen(true)}>New</Button></Tooltip>
        {previous && <Tooltip title="Switch back to the design you had before"><Button size="small" type="text" icon={<History size={14} />} onClick={backToPrevious}>Previous design</Button></Tooltip>}
        {onImportPost && <Tooltip title="Bring in the post from the Create tab, with its text as editable layers"><Button size="small" type="text" icon={<ImportOutlined />} onClick={() => void importPost()}>From Create</Button></Tooltip>}
        <span className="ce-sep" />
        <Tooltip title="Undo (⌘/Ctrl+Z)"><Button size="small" type="text" icon={<UndoOutlined />} disabled={!history.past.length} onClick={() => dispatch({ type: 'undo' })} aria-label="Undo" /></Tooltip>
        <Tooltip title="Redo (⇧⌘/Ctrl+Z)"><Button size="small" type="text" icon={<RedoOutlined />} disabled={!history.future.length} onClick={() => dispatch({ type: 'redo' })} aria-label="Redo" /></Tooltip>
        <span className="ce-grow" />
        <Tooltip title="Zoom out (⌘/Ctrl −)"><Button size="small" type="text" icon={<ZoomOutOutlined />} onClick={() => zoomAt(zoom / 1.25)} aria-label="Zoom out" /></Tooltip>
        <Dropdown menu={{ items: [
          { key: 'fit', label: 'Fit to screen (⇧1)', onClick: fit },
          { key: '50', label: '50%', onClick: () => zoomAt(0.5) },
          { key: '100', label: '100% (⇧0)', onClick: () => zoomAt(1) },
          { key: '200', label: '200%', onClick: () => zoomAt(2) },
          ...(single || selectionBox ? [{ key: 'sel', label: 'Zoom to selection', onClick: () => {
            const box = selectionBounds(doc, selected);
            const el = viewportRef.current;
            if (!box || !el) return;
            const nz = clampZoom(Math.min((el.clientWidth - 120) / box.w, (el.clientHeight - 120) / box.h, 4));
            setZoom(nz);
            setPan({ x: el.clientWidth / 2 - (box.x + box.w / 2) * nz, y: el.clientHeight / 2 - (box.y + box.h / 2) * nz });
          } }] : []),
        ] }}>
          <Button size="small" type="text" className="ce-zoom">{Math.round(zoom * 100)}%</Button>
        </Dropdown>
        <Tooltip title="Zoom in (⌘/Ctrl +)"><Button size="small" type="text" icon={<ZoomInOutlined />} onClick={() => zoomAt(zoom * 1.25)} aria-label="Zoom in" /></Tooltip>
        <Tooltip title="Fit to screen (⇧1)"><Button size="small" type="text" icon={<AimOutlined />} onClick={fit} aria-label="Fit to screen" /></Tooltip>
        <span className="ce-sep" />
        <Tooltip title={showLeft ? 'Hide the left panel' : 'Show widgets and layers'}><Button size="small" type={showLeft ? 'default' : 'text'} icon={<PanelLeft size={14} />} onClick={() => setShowLeft((v) => !v)} aria-label="Toggle left panel" /></Tooltip>
        <Tooltip title={showRight ? 'Hide the right panel' : 'Show properties'}><Button size="small" type={showRight ? 'default' : 'text'} icon={<PanelRight size={14} />} onClick={() => setShowRight((v) => !v)} aria-label="Toggle right panel" /></Tooltip>
        <Tooltip title="Full screen"><Button size="small" type="text" icon={document.fullscreenElement ? <CompressOutlined /> : <ExpandOutlined />} onClick={toggleFullscreen} aria-label="Full screen" /></Tooltip>
        <Tooltip title="Keyboard shortcuts (?)"><Button size="small" type="text" icon={<QuestionOutlined />} onClick={() => setHelpOpen(true)} aria-label="Keyboard shortcuts" /></Tooltip>
        <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => void exportPng()}>Export PNG</Button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addImageFiles(e.target.files, bubble?.at); e.target.value = ''; }} />
      </div>

      <div className="ce-stage" ref={stageRef}>
        <div
          className="ce-viewport"
          ref={viewportRef}
          tabIndex={0}
          data-tool={tool}
          data-panning={panning ? 'true' : 'false'}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setHoverId(null)}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          onDragOver={(e) => { if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-tessa-widget')) e.preventDefault(); }}
          onDrop={onDrop}
          aria-label="Design canvas"
          role="application"
        >
          <div className="ce-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${z})` }}>
            <div className="ce-frame-label" style={{ top: -20 / z, fontSize: 11 / z }}>Frame · {doc.width} × {doc.height}</div>
            <div className="ce-artboard" style={{ width: doc.width, height: doc.height, background: doc.background }}>
              {doc.layers.map(renderLayer)}
              {gridSize > 0 && (
                <div
                  className="ce-grid"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(13,153,255,0.18) ${1 / z}px, transparent ${1 / z}px), linear-gradient(to bottom, rgba(13,153,255,0.18) ${1 / z}px, transparent ${1 / z}px)`,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                  }}
                />
              )}
            </div>
            <div className="ce-overlay">
              {hover && (
                <div className="ce-sel ce-sel--hover" style={{ left: hover.x, top: hover.y, width: hover.w, height: hover.h, borderWidth: line, transform: hover.rotation ? `rotate(${hover.rotation}deg)` : undefined }} />
              )}
              {selectedLayers.length > 1 && selectedLayers.map((l) => (
                <div key={l.id} className="ce-sel" style={{ left: l.x, top: l.y, width: l.w, height: l.h, borderWidth: 1 / z, opacity: 0.5, transform: l.rotation ? `rotate(${l.rotation}deg)` : undefined }} />
              ))}
              {single && !editingId && !croppingId && !single.locked && handles(single, single.rotation, true)}
              {single && (editingId || single.locked) && (
                <div className="ce-sel" style={{ left: single.x, top: single.y, width: single.w, height: single.h, borderWidth: line, transform: single.rotation ? `rotate(${single.rotation}deg)` : undefined }} />
              )}
              {selectionBox && <div className={isGroupSelection ? 'ce-sel--group' : undefined}>{handles(selectionBox, 0, false)}</div>}
              {guides.map((g, i) => (
                <div
                  key={i}
                  className="ce-guide"
                  style={g.axis === 'x'
                    ? { left: g.pos - 0.75 / z, top: g.from, height: g.to - g.from, borderLeft: `${1.5 / z}px dashed #ff4d1f` }
                    : { top: g.pos - 0.75 / z, left: g.from, width: g.to - g.from, borderTop: `${1.5 / z}px dashed #ff4d1f` }}
                />
              ))}
              {marquee && <div className="ce-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, borderWidth: 1 / z }} />}
              {hud && <div className="ce-hud" style={{ left: hud.x, top: hud.y + 8 / z, transform: `scale(${1 / z})`, transformOrigin: '0 0' }}>{hud.text}</div>}
            </div>
          </div>
          {doc.layers.length === 0 && (
            <div className="ce-empty-hint">
              Double-click or right-click the canvas to add things · pick widgets on the left · drop photos here
            </div>
          )}
          {croppingId && <div className="ce-empty-hint">Crop: drag the photo to move it, scroll to zoom · Enter or Esc when done</div>}
          {editingId && <div className="ce-empty-hint">Typing · Esc or click outside when done</div>}
        </div>


        {showLeft && (
          <div className="ce-float ce-float--left">
            <div className="ce-float-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={leftTab === 'add'} className={leftTab === 'add' ? 'is-on' : ''} onClick={() => setLeftTab('add')}>Add</button>
              <button type="button" role="tab" aria-selected={leftTab === 'layers'} className={leftTab === 'layers' ? 'is-on' : ''} onClick={() => setLeftTab('layers')}>Layers · {doc.layers.length}</button>
            </div>
            <div className="ce-float-body">
              {leftTab === 'add' ? (
                <AddPanel
                  productPhotos={productPhotos}
                  onWidget={(w) => addWidget(w)}
                  onUpload={() => fileRef.current?.click()}
                  onProduct={(photo) => void addProductPhoto(photo)}
                  onAllProducts={() => void addAllProducts()}
                />
              ) : (
                <LayersPanel
                  doc={doc}
                  selected={selected}
                  onSelect={(ids, additive) => {
                    setEnteredGroup(null);
                    setSelected(additive ? [...new Set([...selected.filter((id) => !ids.includes(id) || !ids.every((x) => selected.includes(x))), ...(ids.every((x) => selected.includes(x)) ? [] : ids)])] : ids);
                  }}
                  onChange={commit}
                  onEditText={(id) => { setSelected([id]); setEditingId(id); }}
                />
              )}
            </div>
          </div>
        )}

        {showRight && (
          <div className="ce-float ce-float--right">
            <div className="ce-float-body">
          <PropertiesPanel
            doc={doc}
            layers={selectedLayers}
            frames={frames}
            onChange={commit}
            onAlign={align}
            onDistribute={distribute}
            onArrange={arrange}
            onGroup={group}
            onUngroup={ungroup}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onCrop={(id) => setCroppingId(croppingId === id ? null : id)}
            cropping={croppingId}
            gridSize={gridSize}
            onGridSize={setGridSize}
            snapping={snapping}
            onSnapping={setSnapping}
          />
            </div>
          </div>
        )}

        <div className="ce-dock" role="toolbar" aria-label="Tools">
          {toolButton('select', <MousePointer2 size={15} />, 'Move (V)')}
          {toolButton('text', <FontSizeOutlined />, 'Text (T)')}
          {toolButton('rect', <BorderOutlined />, 'Rectangle (R)')}
          {toolButton('ellipse', <Circle size={15} />, 'Ellipse (O)')}
          {toolButton('hand', <DragOutlined />, 'Hand (H, or hold Space)')}
          <Tooltip title="Add photos (pick several)"><Button size="small" type="text" icon={<PictureOutlined />} onClick={() => fileRef.current?.click()} aria-label="Add photos" /></Tooltip>
        </div>

        {bubble && (
          <ContextBubble
            x={bubble.x}
            y={bubble.y}
            doc={doc}
            layers={selectedLayers}
            onChange={commit}
            onClose={() => setBubble(null)}
            actions={bubbleActions}
            plainBackground={plainBg}
          />
        )}

        {startOpen && (
          <StartScreen
            frames={frames}
            hasCurrent={doc.layers.length > 0}
            previousLabel={previous ? `${previous.width} × ${previous.height} · ${previous.layers.length} layers` : null}
            onBlank={newBlank}
            onImportPost={onImportPost ? () => void importPost() : undefined}
            onOpenIdeas={onOpenIdeas}
            onContinue={() => setStartOpen(false)}
            onPrevious={backToPrevious}
          />
        )}
      </div>

      <Modal open={helpOpen} onCancel={() => setHelpOpen(false)} footer={null} title="Keyboard shortcuts" width={620}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {SHORTCUTS.map(([keys, what]) => (
              <tr key={keys} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '5px 8px', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace' }}>{keys}</td>
                <td style={{ padding: '5px 8px' }}>{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </div>
  );
}

