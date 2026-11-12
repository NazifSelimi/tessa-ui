/**
 * Undo / redo for the canvas editor. A drag is one step: `checkpoint` is sent
 * when it starts, the live updates use `record: false`, so the whole drag
 * undoes at once. Typing in one field within a second is merged into one step.
 */
import type { CanvasDoc } from './model';

export interface HistoryState {
  past: CanvasDoc[];
  present: CanvasDoc;
  future: CanvasDoc[];
  /** Last merge key and when it was used. */
  lastKey: string | null;
  lastAt: number;
}

export type HistoryAction =
  | { type: 'set'; doc: CanvasDoc; record?: boolean; mergeKey?: string; now?: number }
  | { type: 'checkpoint' }
  /** End of a drag: forget the checkpoint if nothing changed. */
  | { type: 'settle' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; doc: CanvasDoc };

export const HISTORY_LIMIT = 150;
const MERGE_MS = 1000;

export const initHistory = (doc: CanvasDoc): HistoryState => ({ past: [], present: doc, future: [], lastKey: null, lastAt: 0 });

const push = (past: CanvasDoc[], doc: CanvasDoc) => [...past, doc].slice(-HISTORY_LIMIT);

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'set': {
      if (action.doc === state.present) return state;
      if (action.record === false) return { ...state, present: action.doc };
      const now = action.now ?? Date.now();
      const merge = action.mergeKey && action.mergeKey === state.lastKey && now - state.lastAt < MERGE_MS;
      return {
        past: merge ? state.past : push(state.past, state.present),
        present: action.doc,
        future: [],
        lastKey: action.mergeKey ?? null,
        lastAt: now,
      };
    }
    case 'checkpoint':
      return { ...state, past: push(state.past, state.present), future: [], lastKey: null };
    case 'undo': {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future], lastKey: null, lastAt: 0 };
    }
    case 'redo': {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return { past: push(state.past, state.present), present: next, future: rest, lastKey: null, lastAt: 0 };
    }
    case 'settle':
      return dropEmptyCheckpoint(state);
    case 'reset':
      return initHistory(action.doc);
    default:
      return state;
  }
}

/** Drops a checkpoint that turned out to change nothing (a click without a drag). */
export function dropEmptyCheckpoint(state: HistoryState): HistoryState {
  const last = state.past[state.past.length - 1];
  return last === state.present ? { ...state, past: state.past.slice(0, -1) } : state;
}
