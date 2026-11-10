/** Pure geometry for the canvas editor: boxes, rotation, resize handles and snapping. */
import type { Box, Layer } from './model';

export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const rad = (deg: number) => (deg * Math.PI) / 180;

export function rotatePoint(x: number, y: number, deg: number): { x: number; y: number } {
  const a = rad(deg);
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
}

/** Axis-aligned box around a (possibly rotated) layer. */
export function layerBounds(layer: Pick<Layer, 'x' | 'y' | 'w' | 'h' | 'rotation'>): Box {
  if (!layer.rotation) return { x: layer.x, y: layer.y, w: layer.w, h: layer.h };
  const cx = layer.x + layer.w / 2;
  const cy = layer.y + layer.h / 2;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => rotatePoint((sx * layer.w) / 2, (sy * layer.h) / 2, layer.rotation));
  const xs = corners.map((p) => p.x + cx);
  const ys = corners.map((p) => p.y + cy);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function unionBox(boxes: Box[]): Box | null {
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const b2 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: b2 - y };
}

export const boxesIntersect = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Box from two corner points (a drag), in any direction. */
export const boxFromPoints = (x1: number, y1: number, x2: number, y2: number): Box => ({
  x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
});

const MIN = 4;

/**
 * Resizes a box (rotated by `rotation`) by dragging `handle` by (dx, dy) in
 * post pixels. The opposite side/corner stays where it is, like in Figma.
 * keepRatio (Shift) keeps the proportions; fromCenter (Alt) grows both sides.
 */
export function resizeBox(
  start: Box,
  rotation: number,
  handle: Handle,
  dx: number,
  dy: number,
  opts: { keepRatio?: boolean; fromCenter?: boolean } = {},
): Box {
  const local = rotatePoint(dx, dy, -rotation);
  const sx = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0;
  const sy = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0;
  const k = opts.fromCenter ? 2 : 1;
  let w = start.w + sx * local.x * k;
  let h = start.h + sy * local.y * k;
  if (opts.keepRatio && start.w > 0 && start.h > 0) {
    const ratio = start.w / start.h;
    if (sx && sy) {
      // Follow whichever side moved more.
      if (Math.abs(w / start.w) > Math.abs(h / start.h)) h = w / ratio; else w = h * ratio;
    } else if (sx) {
      h = w / ratio;
    } else {
      w = h * ratio;
    }
  }
  w = Math.max(MIN, w);
  h = Math.max(MIN, h);
  // Centre shift in the layer's own frame, then back to the page.
  const shiftX = opts.fromCenter ? 0 : (sx * (w - start.w)) / 2;
  const shiftY = opts.fromCenter ? 0 : (sy * (h - start.h)) / 2;
  const shift = rotatePoint(shiftX, shiftY, rotation);
  const cx = start.x + start.w / 2 + shift.x;
  const cy = start.y + start.h / 2 + shift.y;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Angle (degrees) for the rotate handle; Shift snaps to 15°. */
export function rotationFromPointer(center: { x: number; y: number }, px: number, py: number, snap = false): number {
  // The handle sits above the box, so "up" is 0°.
  let deg = (Math.atan2(py - center.y, px - center.x) * 180) / Math.PI + 90;
  if (snap) deg = Math.round(deg / 15) * 15;
  deg = ((deg % 360) + 360) % 360;
  return deg > 180 ? deg - 360 : deg;
}

export interface Guide { axis: 'x' | 'y'; pos: number; from: number; to: number }
export interface SnapResult { dx: number; dy: number; guides: Guide[] }

const linesX = (b: Box) => [b.x, b.x + b.w / 2, b.x + b.w];
const linesY = (b: Box) => [b.y, b.y + b.h / 2, b.y + b.h];

/**
 * Smart guides: nudges a moving box so its edges or centre line up with other
 * layers or the frame (edges and centre), within `threshold` pixels. Also
 * snaps to equal spacing between neighbours on the same row / column.
 */
export function snapBox(moving: Box, targets: Box[], frame: Box, threshold: number): SnapResult {
  const all = [frame, ...targets];
  let bestX: { diff: number; pos: number } | null = null;
  let bestY: { diff: number; pos: number } | null = null;
  for (const target of all) {
    for (const t of linesX(target)) {
      for (const m of linesX(moving)) {
        const diff = t - m;
        if (Math.abs(diff) <= threshold && (!bestX || Math.abs(diff) < Math.abs(bestX.diff))) bestX = { diff, pos: t };
      }
    }
    for (const t of linesY(target)) {
      for (const m of linesY(moving)) {
        const diff = t - m;
        if (Math.abs(diff) <= threshold && (!bestY || Math.abs(diff) < Math.abs(bestY.diff))) bestY = { diff, pos: t };
      }
    }
  }

  // Equal spacing: same gap to the left neighbour as that neighbour has to its own left neighbour.
  const spacing = (axis: 'x' | 'y') => {
    const pos = axis === 'x' ? 'x' : 'y';
    const size = axis === 'x' ? 'w' : 'h';
    const cross = axis === 'x' ? 'y' : 'x';
    const crossSize = axis === 'x' ? 'h' : 'w';
    const row = targets.filter((t) => t[cross] < moving[cross] + moving[crossSize] && t[cross] + t[crossSize] > moving[cross]);
    const before = row.filter((t) => t[pos] + t[size] <= moving[pos]).sort((a, b) => (b[pos] + b[size]) - (a[pos] + a[size]));
    if (before.length < 2) return null;
    const gap = before[0][pos] - (before[1][pos] + before[1][size]);
    if (gap <= 0) return null;
    const want = before[0][pos] + before[0][size] + gap;
    const diff = want - moving[pos];
    return Math.abs(diff) <= threshold ? diff : null;
  };
  const gapX = bestX ? null : spacing('x');
  const gapY = bestY ? null : spacing('y');

  const dx = bestX?.diff ?? gapX ?? 0;
  const dy = bestY?.diff ?? gapY ?? 0;
  const moved = { ...moving, x: moving.x + dx, y: moving.y + dy };
  const guides: Guide[] = [];
  if (bestX) {
    const hits = all.filter((t) => linesX(t).some((l) => Math.abs(l - bestX!.pos) < 0.5));
    const ys = [moved.y, moved.y + moved.h, ...hits.flatMap((t) => [t.y, t.y + t.h])];
    guides.push({ axis: 'x', pos: bestX.pos, from: Math.min(...ys), to: Math.max(...ys) });
  }
  if (bestY) {
    const hits = all.filter((t) => linesY(t).some((l) => Math.abs(l - bestY!.pos) < 0.5));
    const xs = [moved.x, moved.x + moved.w, ...hits.flatMap((t) => [t.x, t.x + t.w])];
    guides.push({ axis: 'y', pos: bestY.pos, from: Math.min(...xs), to: Math.max(...xs) });
  }
  return { dx, dy, guides };
}

export const snapToGrid = (value: number, grid: number) => (grid > 0 ? Math.round(value / grid) * grid : value);
