/**
 * Pure document operations for the canvas editor. Each returns a new
 * document (the old one is kept for undo).
 */
import { layerBounds, resizeBox, unionBox, type Handle } from './geometry';
import { uid, type Box, type CanvasDoc, type Layer, type TextStyle } from './model';

type Patch = Partial<Layer> | ((layer: Layer) => Partial<Layer>);

export function updateLayers(doc: CanvasDoc, ids: Iterable<string>, patch: Patch): CanvasDoc {
  const set = new Set(ids);
  return {
    ...doc,
    layers: doc.layers.map((layer) => (set.has(layer.id)
      ? ({ ...layer, ...(typeof patch === 'function' ? patch(layer) : patch) } as Layer)
      : layer)),
  };
}

/** Layer ids plus every other member of their groups. */
export function expandGroups(doc: CanvasDoc, ids: Iterable<string>): string[] {
  const set = new Set(ids);
  const groups = new Set(doc.layers.filter((l) => set.has(l.id) && l.groupId).map((l) => l.groupId));
  return doc.layers.filter((l) => set.has(l.id) || (l.groupId && groups.has(l.groupId))).map((l) => l.id);
}

export const selectionBounds = (doc: CanvasDoc, ids: Iterable<string>): Box | null => {
  const set = new Set(ids);
  return unionBox(doc.layers.filter((l) => set.has(l.id)).map(layerBounds));
};

/** Moves layers by (dx, dy). Locked layers stay put. */
export function moveLayers(doc: CanvasDoc, ids: Iterable<string>, dx: number, dy: number): CanvasDoc {
  return updateLayers(doc, ids, (layer) => (layer.locked ? {} : { x: layer.x + dx, y: layer.y + dy }));
}

/** Resizes one layer from its handle; text grows its font when dragged by a corner. */
export function resizeLayer(
  start: Layer,
  handle: Handle,
  dx: number,
  dy: number,
  opts: { keepRatio?: boolean; fromCenter?: boolean } = {},
): Partial<Layer> {
  const corner = handle.length === 2;
  const isText = start.type === 'text';
  const box = resizeBox(start, start.rotation, handle, dx, dy, { ...opts, keepRatio: opts.keepRatio || (isText && corner) });
  if (isText && corner) {
    const scale = box.w / Math.max(1, start.w);
    return { ...box, fontSize: Math.max(4, Math.round(start.fontSize * scale * 10) / 10), letterSpacing: start.letterSpacing * scale };
  }
  return box;
}

/** Scales several layers together inside their shared box (multi-select resize). */
export function resizeMany(startLayers: Layer[], startBox: Box, nextBox: Box): Map<string, Partial<Layer>> {
  const sx = nextBox.w / Math.max(1, startBox.w);
  const sy = nextBox.h / Math.max(1, startBox.h);
  const out = new Map<string, Partial<Layer>>();
  for (const layer of startLayers) {
    if (layer.locked) continue;
    const patch: Partial<Layer> = {
      x: nextBox.x + (layer.x - startBox.x) * sx,
      y: nextBox.y + (layer.y - startBox.y) * sy,
      w: layer.w * sx,
      h: layer.h * sy,
    };
    if (layer.type === 'text') Object.assign(patch, { fontSize: Math.max(4, layer.fontSize * Math.min(sx, sy)) });
    out.set(layer.id, patch);
  }
  return out;
}

export function removeLayers(doc: CanvasDoc, ids: Iterable<string>): CanvasDoc {
  const set = new Set(ids);
  return cleanGroups({ ...doc, layers: doc.layers.filter((l) => !set.has(l.id) || l.locked) });
}

/** Copies layers (and their groups) with new ids, offset a little. Returns the new ids. */
export function duplicateLayers(doc: CanvasDoc, ids: Iterable<string>, offset = 24): { doc: CanvasDoc; ids: string[] } {
  const set = new Set(ids);
  const picked = doc.layers.filter((l) => set.has(l.id));
  const { layers, groups } = cloneLayers(picked, doc.groups, offset);
  const top = Math.max(...picked.map((l) => doc.layers.indexOf(l)));
  const next = [...doc.layers];
  next.splice(top + 1, 0, ...layers);
  return { doc: { ...doc, layers: next, groups: { ...doc.groups, ...groups } }, ids: layers.map((l) => l.id) };
}

/** New copies of layers with fresh ids; groups get fresh ids too. */
export function cloneLayers(layers: Layer[], groups: CanvasDoc['groups'], offset: number) {
  const groupMap = new Map<string, string>();
  const newGroups: CanvasDoc['groups'] = {};
  const cloned = layers.map((layer) => {
    let groupId = layer.groupId;
    if (groupId) {
      if (!groupMap.has(groupId)) {
        const id = uid('g');
        groupMap.set(groupId, id);
        newGroups[id] = { name: `${groups[groupId]?.name ?? 'Group'} copy` };
      }
      groupId = groupMap.get(groupId);
    }
    return { ...layer, id: uid(), x: layer.x + offset, y: layer.y + offset, groupId, locked: false } as Layer;
  });
  return { layers: cloned, groups: newGroups };
}

export function pasteLayers(doc: CanvasDoc, clip: { layers: Layer[]; groups: CanvasDoc['groups'] }, offset = 24) {
  const { layers, groups } = cloneLayers(clip.layers, clip.groups, offset);
  return { doc: { ...doc, layers: [...doc.layers, ...layers], groups: { ...doc.groups, ...groups } }, ids: layers.map((l) => l.id) };
}

/* ---------------------------------------------------------------- order */

/** Moves one layer to a new stack position (0 = back). */
export function moveLayerTo(doc: CanvasDoc, id: string, index: number): CanvasDoc {
  const from = doc.layers.findIndex((l) => l.id === id);
  if (from < 0) return doc;
  const layers = [...doc.layers];
  const [layer] = layers.splice(from, 1);
  layers.splice(Math.max(0, Math.min(layers.length, index)), 0, layer);
  return { ...doc, layers };
}

export type OrderMove = 'forward' | 'backward' | 'front' | 'back';

export function reorder(doc: CanvasDoc, ids: Iterable<string>, move: OrderMove): CanvasDoc {
  const set = new Set(ids);
  const picked = doc.layers.filter((l) => set.has(l.id));
  const rest = doc.layers.filter((l) => !set.has(l.id));
  if (!picked.length) return doc;
  if (move === 'front') return { ...doc, layers: [...rest, ...picked] };
  if (move === 'back') return { ...doc, layers: [...picked, ...rest] };
  const layers = [...doc.layers];
  const order = move === 'forward' ? [...layers.keys()].reverse() : [...layers.keys()];
  for (const i of order) {
    if (!set.has(layers[i].id)) continue;
    const j = move === 'forward' ? i + 1 : i - 1;
    if (j < 0 || j >= layers.length || set.has(layers[j].id)) continue;
    [layers[i], layers[j]] = [layers[j], layers[i]];
  }
  return { ...doc, layers };
}

/* ---------------------------------------------------------------- groups */

export function groupLayers(doc: CanvasDoc, ids: Iterable<string>): { doc: CanvasDoc; groupId: string | null } {
  const set = new Set(ids);
  const picked = doc.layers.filter((l) => set.has(l.id));
  if (picked.length < 2) return { doc, groupId: null };
  const groupId = uid('g');
  const count = Object.keys(doc.groups).length + 1;
  // Members sit together in the stack, at the topmost member's place.
  const top = Math.max(...picked.map((l) => doc.layers.indexOf(l)));
  const before = doc.layers.slice(0, top + 1).filter((l) => !set.has(l.id));
  const after = doc.layers.slice(top + 1);
  const grouped = picked.map((l) => ({ ...l, groupId }) as Layer);
  return {
    doc: cleanGroups({ ...doc, layers: [...before, ...grouped, ...after], groups: { ...doc.groups, [groupId]: { name: `Group ${count}` } } }),
    groupId,
  };
}

export function ungroupLayers(doc: CanvasDoc, ids: Iterable<string>): CanvasDoc {
  const set = new Set(ids);
  const groups = new Set(doc.layers.filter((l) => set.has(l.id) && l.groupId).map((l) => l.groupId));
  return cleanGroups({ ...doc, layers: doc.layers.map((l) => (l.groupId && groups.has(l.groupId) ? ({ ...l, groupId: undefined } as Layer) : l)) });
}

/** Drops groups with fewer than two members. */
export function cleanGroups(doc: CanvasDoc): CanvasDoc {
  const counts = new Map<string, number>();
  doc.layers.forEach((l) => l.groupId && counts.set(l.groupId, (counts.get(l.groupId) ?? 0) + 1));
  const alive = new Set([...counts].filter(([, n]) => n >= 2).map(([id]) => id));
  const groups = Object.fromEntries(Object.entries(doc.groups).filter(([id]) => alive.has(id)));
  const layers = doc.layers.map((l) => (l.groupId && !alive.has(l.groupId) ? ({ ...l, groupId: undefined } as Layer) : l));
  return { ...doc, layers, groups };
}

/* ---------------------------------------------------------- align / distribute */

export type AlignEdge = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

/** Selected layers as units: a group moves as one piece. */
function units(doc: CanvasDoc, ids: Iterable<string>): { ids: string[]; box: Box }[] {
  const set = new Set(ids);
  const map = new Map<string, string[]>();
  doc.layers.filter((l) => set.has(l.id) && !l.locked).forEach((l) => {
    const key = l.groupId ?? l.id;
    map.set(key, [...(map.get(key) ?? []), l.id]);
  });
  return [...map.values()].map((unitIds) => ({ ids: unitIds, box: selectionBounds(doc, unitIds)! }));
}

/** Aligns to each other, or to the frame when only one item is selected. */
export function alignLayers(doc: CanvasDoc, ids: Iterable<string>, edge: AlignEdge): CanvasDoc {
  const list = units(doc, ids);
  if (!list.length) return doc;
  const target = list.length === 1 ? { x: 0, y: 0, w: doc.width, h: doc.height } : unionBox(list.map((u) => u.box))!;
  let next = doc;
  for (const unit of list) {
    const b = unit.box;
    let dx = 0;
    let dy = 0;
    if (edge === 'left') dx = target.x - b.x;
    if (edge === 'hcenter') dx = target.x + target.w / 2 - (b.x + b.w / 2);
    if (edge === 'right') dx = target.x + target.w - (b.x + b.w);
    if (edge === 'top') dy = target.y - b.y;
    if (edge === 'vcenter') dy = target.y + target.h / 2 - (b.y + b.h / 2);
    if (edge === 'bottom') dy = target.y + target.h - (b.y + b.h);
    next = moveLayers(next, unit.ids, dx, dy);
  }
  return next;
}

/** Equal gaps between three or more items, keeping the outer two in place. */
export function distributeLayers(doc: CanvasDoc, ids: Iterable<string>, axis: 'x' | 'y'): CanvasDoc {
  const list = units(doc, ids);
  if (list.length < 3) return doc;
  const pos = axis === 'x' ? 'x' : 'y';
  const size = axis === 'x' ? 'w' : 'h';
  list.sort((a, b) => a.box[pos] - b.box[pos]);
  const first = list[0].box;
  const last = list[list.length - 1].box;
  const total = list.reduce((sum, u) => sum + u.box[size], 0);
  const gap = (last[pos] + last[size] - first[pos] - total) / (list.length - 1);
  let cursor = first[pos];
  let next = doc;
  for (const unit of list) {
    const delta = cursor - unit.box[pos];
    next = moveLayers(next, unit.ids, axis === 'x' ? delta : 0, axis === 'y' ? delta : 0);
    cursor += unit.box[size] + gap;
  }
  return next;
}

/* ---------------------------------------------------------- text styles */

const STYLE_KEYS = ['fontFamily', 'fontSize', 'fontWeight', 'italic', 'color', 'align', 'lineHeight', 'letterSpacing', 'uppercase'] as const;

export function saveTextStyle(doc: CanvasDoc, layerId: string, name: string): CanvasDoc {
  const layer = doc.layers.find((l) => l.id === layerId);
  if (!layer || layer.type !== 'text') return doc;
  const style = { id: uid('s'), name, ...Object.fromEntries(STYLE_KEYS.map((k) => [k, layer[k]])) } as TextStyle;
  return { ...doc, textStyles: [...doc.textStyles, style] };
}

export function applyTextStyle(doc: CanvasDoc, ids: Iterable<string>, styleId: string): CanvasDoc {
  const style = doc.textStyles.find((s) => s.id === styleId);
  if (!style) return doc;
  const patch = Object.fromEntries(STYLE_KEYS.map((k) => [k, style[k]]));
  return updateLayers(doc, ids, (l) => (l.type === 'text' ? patch : {}));
}

/** Changes the frame size (post format), scaling the layers to fit. */
export function resizeFrame(doc: CanvasDoc, width: number, height: number, scaleContent = true): CanvasDoc {
  if (!scaleContent) return { ...doc, width, height };
  const s = Math.min(width / doc.width, height / doc.height);
  const ox = (width - doc.width * s) / 2;
  const oy = (height - doc.height * s) / 2;
  return {
    ...doc,
    width,
    height,
    layers: doc.layers.map((l) => {
      // A full-frame background keeps covering the whole frame.
      if (Math.abs(l.x) < 1 && Math.abs(l.y) < 1 && Math.abs(l.w - doc.width) < 1 && Math.abs(l.h - doc.height) < 1) {
        return { ...l, w: width, h: height } as Layer;
      }
      const moved = { ...l, x: ox + l.x * s, y: oy + l.y * s, w: l.w * s, h: l.h * s } as Layer;
      if (moved.type === 'text') moved.fontSize = (l as typeof moved).fontSize * s;
      return moved;
    }),
  };
}
