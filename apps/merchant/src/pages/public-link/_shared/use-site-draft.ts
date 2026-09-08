// The reducer plus its storage. Writes are debounced so a colour picker
// dragged across the spectrum does not write a hundred times, and each write
// stamps `savedAt` — which is what the "Autosaved just now" chip reads. A chip
// that said "saved" on a timer, without a write behind it, would be a lie.
import { useCallback, useEffect, useReducer, useRef } from "react";
import { EMPTY_SITE_DRAFT, siteDraftReducer, type SiteAction, type SiteDraft } from "./site-draft";
import { DRAFT_KEY, parseDraft, serializeDraft } from "./site-draft-storage";

const DEBOUNCE_MS = 400;

function initial(): SiteDraft {
  try {
    return parseDraft(window.localStorage.getItem(DRAFT_KEY)) ?? EMPTY_SITE_DRAFT;
  } catch {
    // Private browsing, or storage disabled. The builder still works; it just
    // will not survive a refresh.
    return EMPTY_SITE_DRAFT;
  }
}

export function useSiteDraft() {
  const [draft, dispatch] = useReducer(siteDraftReducer, undefined, initial);
  const timer = useRef<number | null>(null);

  const save = useCallback((next: SiteDraft) => {
    try {
      window.localStorage.setItem(DRAFT_KEY, serializeDraft({ ...next, savedAt: Date.now() }));
    } catch {
      // See `initial`.
    }
  }, []);

  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save(draft), DEBOUNCE_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [draft, save]);

  const saveNow = useCallback(() => save(draft), [draft, save]);

  return { draft, dispatch: dispatch as (action: SiteAction) => void, save: saveNow };
}
