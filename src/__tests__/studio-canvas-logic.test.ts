import { describe, expect, it } from 'vitest';
import { blankDoc, makeShape, makeText, parseDoc, type CanvasDoc } from '@/features/studio/canvas/model';
import { layerBounds, resizeBox, rotationFromPointer, snapBox } from '@/features/studio/canvas/geometry';
import {
  alignLayers, distributeLayers, duplicateLayers, expandGroups, groupLayers, moveLayers, removeLayers,
  reorder, resizeFrame, resizeLayer, resizeMany, ungroupLayers, applyTextStyle, saveTextStyle,
} from '@/features/studio/canvas/ops';
import { historyReducer, initHistory } from '@/features/studio/canvas/history';
import { imagePlacement, wrapText } from '@/features/studio/canvas/draw';

const rect = (x: number, y: number, w = 100, h = 100) => makeShape('rect', { x, y, w, h });
const docWith = (...layers: CanvasDoc['layers']) => ({ ...blankDoc(1000, 1000), layers });

describe('move and resize', () => {
  it('moves layers but never locked ones', () => {
    const a = rect(0, 0);
    const b = { ...rect(200, 0), locked: true };
    const next = moveLayers(docWith(a, b), [a.id, b.id], 10, 20);
    expect(next.layers[0]).toMatchObject({ x: 10, y: 20 });
    expect(next.layers[1]).toMatchObject({ x: 200, y: 0 });
  });

  it('keeps the opposite corner fixed when resizing', () => {
    const box = resizeBox({ x: 100, y: 100, w: 200, h: 100 }, 0, 'se', 50, 30);
    expect(box).toEqual({ x: 100, y: 100, w: 250, h: 130 });
    const fromLeft = resizeBox({ x: 100, y: 100, w: 200, h: 100 }, 0, 'w', 50, 0);
    expect(fromLeft).toEqual({ x: 150, y: 100, w: 150, h: 100 });
  });

  it('keeps proportions with Shift and grows from the centre with Alt', () => {
    expect(resizeBox({ x: 0, y: 0, w: 200, h: 100 }, 0, 'e', 100, 0, { keepRatio: true })).toMatchObject({ w: 300, h: 150 });
    expect(resizeBox({ x: 100, y: 100, w: 100, h: 100 }, 0, 'e', 20, 0, { fromCenter: true })).toEqual({ x: 80, y: 100, w: 140, h: 100 });
  });

  it('resizes a rotated box along its own sides', () => {
    // Rotated 90°: dragging the "east" handle means dragging down on the page.
    const box = resizeBox({ x: 0, y: 0, w: 100, h: 50 }, 90, 'e', 0, 40);
    expect(box.w).toBeCloseTo(140);
    expect(box.h).toBeCloseTo(50);
  });

  it('scales text font when a corner is dragged', () => {
    const text = makeText({ x: 0, y: 0, w: 200, h: 60 }, { fontSize: 50 });
    const patch = resizeLayer(text, 'se', 200, 0);
    expect(patch).toMatchObject({ w: 400, fontSize: 100 });
  });

  it('scales several layers together', () => {
    const a = rect(0, 0, 100, 100);
    const b = rect(100, 100, 100, 100);
    const out = resizeMany([a, b], { x: 0, y: 0, w: 200, h: 200 }, { x: 0, y: 0, w: 400, h: 400 });
    expect(out.get(b.id)).toMatchObject({ x: 200, y: 200, w: 200, h: 200 });
  });

  it('rotates from the pointer and snaps to 15° with Shift', () => {
    expect(rotationFromPointer({ x: 0, y: 0 }, 10, 0)).toBeCloseTo(90);
    expect(rotationFromPointer({ x: 0, y: 0 }, 10, -1, true)).toBe(90);
    expect(layerBounds({ x: 0, y: 0, w: 100, h: 20, rotation: 90 })).toMatchObject({ w: expect.closeTo(20), h: expect.closeTo(100) });
  });
});

describe('smart guides', () => {
  it('snaps to another layer edge and draws a guide', () => {
    const result = snapBox({ x: 203, y: 500, w: 50, h: 50 }, [{ x: 100, y: 0, w: 100, h: 100 }], { x: 0, y: 0, w: 1000, h: 1000 }, 6);
    expect(result.dx).toBe(-3);
    expect(result.guides[0]).toMatchObject({ axis: 'x', pos: 200 });
  });

  it('snaps to the frame centre', () => {
    const result = snapBox({ x: 448, y: 700, w: 100, h: 50 }, [], { x: 0, y: 0, w: 1000, h: 1000 }, 6);
    expect(result.dx).toBe(2);
  });

  it('snaps to equal spacing in a row', () => {
    const targets = [{ x: 0, y: 0, w: 100, h: 100 }, { x: 150, y: 0, w: 100, h: 100 }];
    const result = snapBox({ x: 303, y: 0, w: 100, h: 100 }, targets, { x: 0, y: 0, w: 10000, h: 10000 }, 6);
    expect(result.dx).toBe(-3);
  });
});

describe('groups, order and copies', () => {
  it('groups, selects the whole group, and ungroups', () => {
    const a = rect(0, 0);
    const b = rect(200, 0);
    const c = rect(400, 0);
    const { doc, groupId } = groupLayers(docWith(a, b, c), [a.id, b.id]);
    expect(groupId).toBeTruthy();
    expect(expandGroups(doc, [a.id])).toEqual([a.id, b.id]);
    const ungrouped = ungroupLayers(doc, [b.id]);
    expect(ungrouped.layers.every((l) => !l.groupId)).toBe(true);
    expect(ungrouped.groups).toEqual({});
  });

  it('drops a group when only one member is left', () => {
    const a = rect(0, 0);
    const b = rect(200, 0);
    const { doc } = groupLayers(docWith(a, b), [a.id, b.id]);
    expect(removeLayers(doc, [a.id]).layers[0].groupId).toBeUndefined();
  });

  it('brings forward and sends to the back', () => {
    const a = rect(0, 0);
    const b = rect(0, 0);
    const c = rect(0, 0);
    const doc = docWith(a, b, c);
    expect(reorder(doc, [a.id], 'forward').layers.map((l) => l.id)).toEqual([b.id, a.id, c.id]);
    expect(reorder(doc, [c.id], 'back').layers.map((l) => l.id)).toEqual([c.id, a.id, b.id]);
  });

  it('duplicates with new ids right above the original', () => {
    const a = rect(0, 0);
    const b = rect(500, 0);
    const { doc, ids } = duplicateLayers(docWith(a, b), [a.id]);
    expect(doc.layers).toHaveLength(3);
    expect(doc.layers[1].id).toBe(ids[0]);
    expect(doc.layers[1]).toMatchObject({ x: 24, y: 24 });
  });
});

describe('align and distribute', () => {
  it('aligns a single layer to the frame', () => {
    const a = rect(10, 10, 100, 100);
    expect(alignLayers(docWith(a), [a.id], 'hcenter').layers[0].x).toBe(450);
    expect(alignLayers(docWith(a), [a.id], 'bottom').layers[0].y).toBe(900);
  });

  it('distributes three layers with equal gaps', () => {
    const a = rect(0, 0, 100, 100);
    const b = rect(130, 0, 100, 100);
    const c = rect(400, 0, 100, 100);
    const doc = distributeLayers(docWith(a, b, c), [a.id, b.id, c.id], 'x');
    expect(doc.layers[1].x).toBe(200);
  });
});

describe('undo / redo', () => {
  it('undoes a whole drag as one step and merges typing', () => {
    const a = rect(0, 0);
    let state = initHistory(docWith(a));
    state = historyReducer(state, { type: 'checkpoint' });
    state = historyReducer(state, { type: 'set', doc: moveLayers(state.present, [a.id], 5, 0), record: false });
    state = historyReducer(state, { type: 'set', doc: moveLayers(state.present, [a.id], 5, 0), record: false });
    expect(state.present.layers[0].x).toBe(10);
    state = historyReducer(state, { type: 'undo' });
    expect(state.present.layers[0].x).toBe(0);
    state = historyReducer(state, { type: 'redo' });
    expect(state.present.layers[0].x).toBe(10);

    state = historyReducer(state, { type: 'set', doc: moveLayers(state.present, [a.id], 1, 0), mergeKey: 'x', now: 1000 });
    state = historyReducer(state, { type: 'set', doc: moveLayers(state.present, [a.id], 1, 0), mergeKey: 'x', now: 1500 });
    state = historyReducer(state, { type: 'undo' });
    expect(state.present.layers[0].x).toBe(10);
  });

  it('forgets a click that changed nothing', () => {
    let state = initHistory(blankDoc());
    state = historyReducer(state, { type: 'checkpoint' });
    state = historyReducer(state, { type: 'settle' });
    expect(state.past).toHaveLength(0);
  });
});

describe('text, images, frames and saving', () => {
  it('wraps text to the box width', () => {
    const measure = (t: string) => t.length * 10;
    expect(wrapText(measure, 'one two three', 75)).toEqual(['one two', 'three']);
    expect(wrapText(measure, 'a\nb', 100)).toEqual(['a', 'b']);
  });

  it('places a cover photo by its focus point', () => {
    const p = imagePlacement({ w: 100, h: 100, fit: 'cover', zoom: 1, focusX: 0, focusY: 0.5 }, 200, 100);
    expect(p).toMatchObject({ w: 200, h: 100 });
    expect(p.x + 0).toBe(0);
    expect(p.y + 0).toBe(0);
  });

  it('saves and applies a text style', () => {
    const a = makeText({ x: 0, y: 0 }, { fontSize: 90, color: '#ff0000' });
    const b = makeText({ x: 0, y: 200 }, { fontSize: 20 });
    let doc = saveTextStyle(docWith(a, b), a.id, 'Title');
    doc = applyTextStyle(doc, [b.id], doc.textStyles[0].id);
    expect(doc.layers[1]).toMatchObject({ fontSize: 90, color: '#ff0000', text: 'Your text' });
  });

  it('changes the frame size and keeps a full background covering it', () => {
    const bg = rect(0, 0, 1000, 1000);
    const doc = resizeFrame(docWith(bg, rect(0, 0, 100, 100)), 1000, 2000);
    expect(doc.layers[0]).toMatchObject({ w: 1000, h: 2000 });
    expect(doc.layers[1]).toMatchObject({ y: 500 });
  });

  it('ignores broken autosaves', () => {
    expect(parseDoc(null)).toBeNull();
    expect(parseDoc({ version: 2 })).toBeNull();
    expect(parseDoc(docWith(rect(0, 0)))?.layers).toHaveLength(1);
  });
});

describe('widgets', () => {
  it('every widget builds layers inside the frame; badges come as a group', async () => {
    const { widgets } = await import('@/features/studio/canvas/widgets');
    for (const widget of widgets()) {
      const made = widget.make(540, 675, 1080);
      if (widget.id === 'shade') continue;
      expect(made.layers.length, widget.id).toBeGreaterThan(0);
      for (const layer of made.layers) {
        expect(layer.w, widget.id).toBeGreaterThan(0);
        expect(layer.x + layer.w / 2, widget.id).toBeGreaterThan(0);
      }
      if (made.layers.length > 1) expect(made.groupName, widget.id).toBeTruthy();
    }
  });

  it('keeps proportions when Shift-dragging a side dot of a picture', () => {
    const box = resizeBox({ x: 0, y: 0, w: 648, h: 810 }, 0, 'e', 102, 0, { keepRatio: true });
    expect(box.w / box.h).toBeCloseTo(648 / 810);
  });
});
