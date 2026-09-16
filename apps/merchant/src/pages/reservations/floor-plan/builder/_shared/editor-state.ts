// The builder's document history. Every change to the plan is a `commit`,
// which is what Undo walks back; selecting things is not. Selections are
// pruned on every step so Undo past an item's creation never leaves the
// inspector pointing at something that no longer exists.
import { findItem, type FloorPlanDoc } from "@/entities/floor-plan";

export const HISTORY_LIMIT = 100;

export interface EditorState {
  doc: FloorPlanDoc;
  past: FloorPlanDoc[];
  future: FloorPlanDoc[];
  selection: string[];
  /** Bumps on every document change, including undo and redo — what autosave
   *  watches. */
  revision: number;
}

export type EditorAction =
  | { type: "commit"; doc: FloorPlanDoc; selection?: string[] }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "select"; ids: string[] }
  | { type: "reset"; doc: FloorPlanDoc; selection?: string[] };

export function initialEditorState(doc: FloorPlanDoc, selection: string[] = []): EditorState {
  return { doc, past: [], future: [], selection: prune(selection, doc), revision: 0 };
}

function prune(ids: readonly string[], doc: FloorPlanDoc): string[] {
  return Array.from(new Set(ids)).filter((id) => findItem(doc, id));
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "commit": {
      const selection = prune(action.selection ?? state.selection, action.doc);
      if (action.doc === state.doc) return { ...state, selection };
      return {
        doc: action.doc,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: [],
        selection,
        revision: state.revision + 1,
      };
    }
    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        doc: previous,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
        selection: prune(state.selection, previous),
        revision: state.revision + 1,
      };
    }
    case "redo": {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return {
        doc: next,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: rest,
        selection: prune(state.selection, next),
        revision: state.revision + 1,
      };
    }
    case "select":
      return { ...state, selection: prune(action.ids, state.doc) };
    case "reset":
      return { ...initialEditorState(action.doc, action.selection), revision: state.revision + 1 };
  }
}
