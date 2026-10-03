// The builder's editing session: document history, selection, the operations
// the toolbars expose, their keyboard shortcuts, and autosave into the draft.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  deleteItems,
  duplicateItems,
  findItem,
  moveItems,
  rotateItems,
  toggleLock,
  allItems,
  type FloorItem,
  type FloorPlanDoc,
  type WriteOutcome,
} from "@/entities/floor-plan";
import { editorReducer, initialEditorState } from "./editor-state";

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || Boolean(target.closest("[role=dialog]")))
  );
}

export function usePlanEditor(initial: () => { doc: FloorPlanDoc; selection?: string[] }, options: { nudgeStep: number; shortcuts?: boolean }) {
  const [state, dispatch] = useReducer(editorReducer, undefined, () => {
    const start = initial();
    return initialEditorState(start.doc, start.selection);
  });

  const commit = useCallback((doc: FloorPlanDoc, selection?: string[]) => dispatch({ type: "commit", doc, selection }), []);
  const select = useCallback((ids: string[]) => dispatch({ type: "select", ids }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback((doc: FloorPlanDoc, selection?: string[]) => dispatch({ type: "reset", doc, selection }), []);

  const { doc, selection } = state;
  const selectedItems = useMemo(
    () => selection.map((id) => findItem(doc, id)).filter((item): item is FloorItem => Boolean(item)),
    [doc, selection]
  );

  const deleteSelected = useCallback(() => {
    if (selection.length === 0) return;
    const next = deleteItems(doc, selection);
    commit(next, selection.filter((id) => findItem(next, id)));
  }, [doc, selection, commit]);

  const duplicateSelected = useCallback(() => {
    if (selection.length === 0) return;
    const result = duplicateItems(doc, selection);
    commit(result.doc, result.addedIds);
  }, [doc, selection, commit]);

  const toggleLockSelected = useCallback(() => {
    if (selection.length > 0) commit(toggleLock(doc, selection));
  }, [doc, selection, commit]);

  const rotateSelected = useCallback(() => {
    if (selection.length > 0) commit(rotateItems(doc, selection));
  }, [doc, selection, commit]);

  const nudge = useCallback(
    (dx: number, dy: number) => {
      if (selection.length > 0) commit(moveItems(doc, selection, dx, dy));
    },
    [doc, selection, commit]
  );

  const latest = useRef({ undo, redo, deleteSelected, duplicateSelected, toggleLockSelected, rotateSelected, nudge, select, doc, step: options.nudgeStep });
  latest.current = { undo, redo, deleteSelected, duplicateSelected, toggleLockSelected, rotateSelected, nudge, select, doc, step: options.nudgeStep };

  useEffect(() => {
    if (options.shortcuts === false) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const api = latest.current;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) api.redo();
        else api.undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        api.redo();
        return;
      }
      if (mod && key === "d") {
        event.preventDefault();
        api.duplicateSelected();
        return;
      }
      if (mod && key === "a") {
        event.preventDefault();
        api.select(allItems(api.doc).map((item) => item.id));
        return;
      }
      if (mod || event.altKey) return;
      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        api.deleteSelected();
      } else if (key === "escape") {
        api.select([]);
      } else if (key === "l") {
        api.toggleLockSelected();
      } else if (key === "r") {
        api.rotateSelected();
      } else if (key.startsWith("arrow")) {
        event.preventDefault();
        const step = event.shiftKey ? 1 : api.step;
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        api.nudge(dx, dy);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [options.shortcuts]);

  return {
    state,
    doc,
    selection,
    selectedItems,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commit,
    select,
    undo,
    redo,
    reset,
    deleteSelected,
    duplicateSelected,
    toggleLockSelected,
    rotateSelected,
    nudge,
  };
}

/** Saves `save()` shortly after the last change, and immediately if the page
 *  unmounts with a change still waiting — leaving within the debounce window
 *  must not lose the last edit. */
export function useAutosave(revision: number, save: () => WriteOutcome, delayMs = 700) {
  const saveRef = useRef(save);
  saveRef.current = save;
  const pending = useRef(false);
  const [status, setStatus] = useState<{ at: number | null; outcome: WriteOutcome | null }>({ at: null, outcome: null });

  useEffect(() => {
    if (revision === 0) return;
    pending.current = true;
    const id = window.setTimeout(() => {
      pending.current = false;
      setStatus({ at: Date.now(), outcome: saveRef.current() });
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [revision, delayMs]);

  useEffect(
    () => () => {
      if (pending.current) saveRef.current();
    },
    []
  );

  const flush = useCallback((): WriteOutcome => {
    pending.current = false;
    const outcome = saveRef.current();
    setStatus({ at: Date.now(), outcome });
    return outcome;
  }, []);

  return { savedAt: status.at, outcome: status.outcome, flush };
}
