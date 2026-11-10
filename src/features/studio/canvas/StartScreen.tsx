/** "New design" screen, like Figma's: a blank frame at a post size, the post from Create, or back to earlier work. */
import { useState } from 'react';
import { Button, InputNumber } from 'antd';
import { ArrowLeft, FilePlus2, History, LayoutTemplate, PenLine } from 'lucide-react';
import type { FramePreset } from './CanvasEditor';

interface Props {
  frames: FramePreset[];
  hasCurrent: boolean;
  previousLabel: string | null;
  onBlank: (width: number, height: number) => void;
  onImportPost?: () => void;
  onOpenIdeas?: () => void;
  onContinue: () => void;
  onPrevious: () => void;
}

export default function StartScreen({ frames, hasCurrent, previousLabel, onBlank, onImportPost, onOpenIdeas, onContinue, onPrevious }: Props) {
  const [custom, setCustom] = useState({ w: 1080, h: 1080 });
  return (
    <div className="ce-start" role="dialog" aria-label="Start a design">
      <div className="ce-start-card">
        <h2>Start a design</h2>
        <p className="ce-start-sub">A blank frame like in Figma, or begin from what you already made.</p>

        <h3><FilePlus2 size={15} /> Blank design</h3>
        <div className="ce-start-sizes">
          {frames.map((f) => {
            const ratio = f.width / f.height;
            return (
              <button key={f.id} type="button" className="ce-start-size" onClick={() => onBlank(f.width, f.height)}>
                <span className="ce-start-shape" style={{ width: ratio >= 1 ? 54 : 54 * ratio, height: ratio >= 1 ? 54 / ratio : 54 }} />
                <strong>{f.label}</strong>
                <small>{f.width} × {f.height}</small>
              </button>
            );
          })}
          <div className="ce-start-size ce-start-custom">
            <strong>Custom</strong>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <InputNumber size="small" min={100} max={4000} value={custom.w} onChange={(v) => setCustom((c) => ({ ...c, w: Number(v) || 1080 }))} style={{ width: 70 }} aria-label="Width" />
              ×
              <InputNumber size="small" min={100} max={4000} value={custom.h} onChange={(v) => setCustom((c) => ({ ...c, h: Number(v) || 1080 }))} style={{ width: 70 }} aria-label="Height" />
            </div>
            <Button size="small" onClick={() => onBlank(custom.w, custom.h)}>Create</Button>
          </div>
        </div>

        <h3><PenLine size={15} /> From what you made</h3>
        <div className="ce-start-actions">
          {onImportPost && (
            <button type="button" className="ce-start-action" onClick={onImportPost}>
              <LayoutTemplate size={18} />
              <span><strong>The post from Create</strong><small>Its texts become layers you can drag and edit</small></span>
            </button>
          )}
          {onOpenIdeas && (
            <button type="button" className="ce-start-action" onClick={onOpenIdeas}>
              <LayoutTemplate size={18} />
              <span><strong>A ready post idea</strong><small>Pick one in Create, then come back here</small></span>
            </button>
          )}
          {previousLabel && (
            <button type="button" className="ce-start-action" onClick={onPrevious}>
              <History size={18} />
              <span><strong>Back to the previous design</strong><small>{previousLabel}</small></span>
            </button>
          )}
          {hasCurrent && (
            <button type="button" className="ce-start-action" onClick={onContinue}>
              <ArrowLeft size={18} />
              <span><strong>Continue the current design</strong><small>Close this and keep working</small></span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
