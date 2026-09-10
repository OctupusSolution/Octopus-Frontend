// The reducer plus its storage. Writes are debounced so a colour picker
// dragged across the spectrum does not write a hundred times, and each write
// stamps `savedAt` — which is what the "Autosaved..." chip reads. A chip that
// said "saved" without a write behind it would be a lie.
//
// `savedAt` is tracked in its OWN `useState`, not read back off `draft` after
// dispatch (final review finding F6). Two bugs, opposite directions, came
// from the original shape:
//   - `save()` wrote `savedAt` to localStorage but never fed it back into
//     `draft`, so `draft.savedAt` stayed `null` all session — the chip never
//     appeared no matter how many autosaves actually happened.
//   - Routing it through the reducer instead (a `patchDraft`-style action)
//     would have fixed that but created a worse bug: updating `draft.savedAt`
//     changes `draft`, which is the debounce effect's own dependency, which
//     would schedule *another* save, which updates `savedAt` again — an
//     infinite save loop. Keeping `savedAt` outside the reducer's state
//     breaks that cycle: setting it triggers a re-render (so the chip
//     updates) without changing the `draft` reference the effect below
//     watches.
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
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
  const [savedAt, setSavedAt] = useState<number | null>(draft.savedAt);
  const timer = useRef<number | null>(null);

  const save = useCallback((next: SiteDraft) => {
    const at = Date.now();
    try {
      window.localStorage.setItem(DRAFT_KEY, serializeDraft({ ...next, savedAt: at }));
      setSavedAt(at);
    } catch {
      // Private browsing, or storage disabled. The chip must not claim a
      // save that never happened.
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

  return { draft: { ...draft, savedAt }, dispatch: dispatch as (action: SiteAction) => void, save: saveNow };
}
