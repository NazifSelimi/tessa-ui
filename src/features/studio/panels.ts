/** Which side panels are open in the Studio, remembered in this browser. */
import { useCallback, useState } from 'react';

export interface PanelPrefs { left: boolean; right: boolean }

export function readPanels(key: string, fallback: PanelPrefs = { left: true, right: true }): PanelPrefs {
  try {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? 'null') as Partial<PanelPrefs> | null;
    if (!saved || typeof saved !== 'object') return fallback;
    return { left: typeof saved.left === 'boolean' ? saved.left : fallback.left, right: typeof saved.right === 'boolean' ? saved.right : fallback.right };
  } catch {
    return fallback;
  }
}

export function usePanels(key: string, fallback?: PanelPrefs) {
  const [panels, setPanels] = useState<PanelPrefs>(() => readPanels(key, fallback));
  const toggle = useCallback((side: keyof PanelPrefs) => {
    setPanels((current) => {
      const next = { ...current, [side]: !current[side] };
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage blocked: still works for this visit */ }
      return next;
    });
  }, [key]);
  return [panels, toggle] as const;
}
