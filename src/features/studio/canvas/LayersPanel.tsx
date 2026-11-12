/** Layers list, top of the stack first: select, rename, hide, lock, drag to reorder. */
import { useState } from 'react';
import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { Circle, Folder, Image as ImageIcon, Square, Type } from 'lucide-react';
import type { CanvasDoc, Layer } from './model';
import { moveLayerTo, updateLayers } from './ops';

interface Props {
  doc: CanvasDoc;
  selected: string[];
  onSelect: (ids: string[], additive: boolean) => void;
  onChange: (doc: CanvasDoc, mergeKey?: string) => void;
  onEditText: (id: string) => void;
}

const icon = (layer: Layer) => {
  if (layer.type === 'text') return <Type size={12} />;
  if (layer.type === 'image') return <ImageIcon size={12} />;
  if (layer.type === 'ellipse') return <Circle size={12} />;
  return <Square size={12} />;
};

type Row = { kind: 'group'; groupId: string; members: Layer[] } | { kind: 'layer'; layer: Layer; inGroup: boolean };

export default function LayersPanel({ doc, selected, onSelect, onChange, onEditText }: Props) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ id: string; after: boolean } | null>(null);

  // Top of the stack first; a group header goes above each run of its members.
  const rows: Row[] = [];
  const reversed = [...doc.layers].reverse();
  reversed.forEach((layer, i) => {
    if (layer.groupId && reversed[i - 1]?.groupId !== layer.groupId) {
      let j = i;
      const members: Layer[] = [];
      while (j < reversed.length && reversed[j].groupId === layer.groupId) members.push(reversed[j++]);
      rows.push({ kind: 'group', groupId: layer.groupId, members });
    }
    if (!layer.groupId || !collapsed[layer.groupId]) rows.push({ kind: 'layer', layer, inGroup: !!layer.groupId });
  });

  const toggle = (ids: string[], key: 'visible' | 'locked') => {
    const layers = doc.layers.filter((l) => ids.includes(l.id));
    const value = !layers.every((l) => l[key]);
    onChange(updateLayers(doc, ids, { [key]: value }));
  };

  const rename = (id: string, name: string, isGroup: boolean) => {
    setRenaming(null);
    const clean = name.trim();
    if (!clean) return;
    if (isGroup) onChange({ ...doc, groups: { ...doc.groups, [id]: { name: clean } } });
    else onChange(updateLayers(doc, [id], { name: clean }));
  };

  const drop = (targetId: string, after: boolean) => {
    if (!dragId || dragId === targetId) return;
    const from = doc.layers.findIndex((l) => l.id === dragId);
    let to = doc.layers.findIndex((l) => l.id === targetId);
    // The list is drawn top-first, so "after" in the list means lower in the stack.
    if (!after) to += 1;
    if (from < to) to -= 1;
    let next = moveLayerTo(doc, dragId, to);
    // Dropping into / out of a group follows the row it lands next to.
    const target = doc.layers.find((l) => l.id === targetId);
    next = updateLayers(next, [dragId], { groupId: target?.groupId });
    onChange(next);
  };

  const nameInput = (id: string, value: string, isGroup: boolean) => (
    <input
      autoFocus
      defaultValue={value}
      className="ce-layer-name"
      style={{ border: '1px solid #0d99ff', borderRadius: 3, padding: '1px 4px', font: 'inherit' }}
      onBlur={(e) => rename(id, e.target.value, isGroup)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') rename(id, (e.target as HTMLInputElement).value, isGroup);
        if (e.key === 'Escape') setRenaming(null);
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <>
      <h4>Layers <span style={{ fontWeight: 400, textTransform: 'none' }}>{doc.layers.length}</span></h4>
      {doc.layers.length === 0 && <p style={{ padding: '0 12px', color: '#8a8380' }}>No layers yet.</p>}
      <ul className="ce-layers" role="listbox" aria-label="Layers" aria-multiselectable>
        {rows.map((row) => {
          if (row.kind === 'group') {
            const ids = row.members.map((m) => m.id);
            const isSelected = ids.every((id) => selected.includes(id));
            const hidden = row.members.every((m) => !m.visible);
            const locked = row.members.every((m) => m.locked);
            const name = doc.groups[row.groupId]?.name ?? 'Group';
            return (
              <li
                key={`g:${row.groupId}:${ids[0]}`}
                className={`is-group${isSelected ? ' is-selected' : ''}${hidden ? ' is-hidden' : ''}`}
                onClick={(e) => onSelect(ids, e.shiftKey || e.metaKey || e.ctrlKey)}
                onDoubleClick={() => setRenaming(`g:${row.groupId}`)}
                role="option"
                aria-selected={isSelected}
              >
                <button type="button" className="ce-layer-btn is-on" onClick={(e) => { e.stopPropagation(); setCollapsed((c) => ({ ...c, [row.groupId]: !c[row.groupId] })); }} aria-label={collapsed[row.groupId] ? 'Expand group' : 'Collapse group'}>
                  {collapsed[row.groupId] ? '▸' : '▾'}
                </button>
                <span className="ce-layer-icon"><Folder size={12} /></span>
                {renaming === `g:${row.groupId}` ? nameInput(row.groupId, name, true) : <span className="ce-layer-name">{name}</span>}
                <button type="button" className={`ce-layer-btn${locked ? ' is-on' : ''}`} onClick={(e) => { e.stopPropagation(); toggle(ids, 'locked'); }} aria-label={locked ? 'Unlock group' : 'Lock group'}>
                  {locked ? <LockOutlined /> : <UnlockOutlined />}
                </button>
                <button type="button" className={`ce-layer-btn${hidden ? ' is-on' : ''}`} onClick={(e) => { e.stopPropagation(); toggle(ids, 'visible'); }} aria-label={hidden ? 'Show group' : 'Hide group'}>
                  {hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </li>
            );
          }
          const { layer } = row;
          const isSelected = selected.includes(layer.id);
          const drop1 = dropAt?.id === layer.id ? (dropAt.after ? ' drop-after' : ' drop-before') : '';
          return (
            <li
              key={layer.id}
              draggable={renaming !== layer.id}
              onDragStart={(e) => { setDragId(layer.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', layer.id); }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                setDropAt({ id: layer.id, after: e.clientY > rect.top + rect.height / 2 });
              }}
              onDragLeave={() => setDropAt((d) => (d?.id === layer.id ? null : d))}
              onDrop={(e) => { e.preventDefault(); if (dropAt) drop(dropAt.id, dropAt.after); setDragId(null); setDropAt(null); }}
              onDragEnd={() => { setDragId(null); setDropAt(null); }}
              className={`${isSelected ? 'is-selected' : ''}${row.inGroup ? ' is-in-group' : ''}${layer.visible ? '' : ' is-hidden'}${drop1}`}
              onClick={(e) => onSelect([layer.id], e.shiftKey || e.metaKey || e.ctrlKey)}
              onDoubleClick={() => setRenaming(layer.id)}
              role="option"
              aria-selected={isSelected}
              title={layer.type === 'text' ? 'Double-click to rename · double-click the text on the canvas to edit it' : 'Double-click to rename, drag to reorder'}
            >
              <span className="ce-layer-icon">{icon(layer)}</span>
              {renaming === layer.id ? nameInput(layer.id, layer.name, false) : (
                <span className="ce-layer-name" onDoubleClick={(e) => { if (layer.type === 'text' && e.altKey) { e.stopPropagation(); onEditText(layer.id); } }}>{layer.name}</span>
              )}
              <button type="button" className={`ce-layer-btn${layer.locked ? ' is-on' : ''}`} onClick={(e) => { e.stopPropagation(); toggle([layer.id], 'locked'); }} aria-label={layer.locked ? 'Unlock' : 'Lock'}>
                {layer.locked ? <LockOutlined /> : <UnlockOutlined />}
              </button>
              <button type="button" className={`ce-layer-btn${layer.visible ? '' : ' is-on'}`} onClick={(e) => { e.stopPropagation(); toggle([layer.id], 'visible'); }} aria-label={layer.visible ? 'Hide' : 'Show'}>
                {layer.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
