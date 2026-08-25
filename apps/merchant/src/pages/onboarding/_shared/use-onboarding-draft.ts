// Session-scoped draft persistence. A mid-flow refresh resumes exactly where
// the merchant left off; an abandoned signup does not haunt the browser
// forever, so this is sessionStorage and it clears once the business exists.
//
// DRAFT_VERSION guards the shape: a draft written by the previous ten-step
// flow has fields this one no longer understands, so it is discarded rather
// than rehydrated into something half-valid.
import { useEffect, useReducer, useCallback, useMemo } from "react";
import { draftReducer, EMPTY_DRAFT, type OnboardingDraft } from "./draft";
import { STEP_COUNT } from "./steps";

const DRAFT_KEY = "octopus.onboarding.draft";
const DRAFT_VERSION = 2;

/** `restored` is true only when a valid persisted draft was found — a fresh
 * `EMPTY_DRAFT` (no session, or a discarded stale/corrupt one) is not a restore. */
function readDraft(): { draft: OnboardingDraft; restored: boolean } {
  if (typeof window === "undefined") return { draft: EMPTY_DRAFT, restored: false };
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return { draft: EMPTY_DRAFT, restored: false };
    const parsed = JSON.parse(raw) as { version?: number; draft?: OnboardingDraft };
    if (parsed.version !== DRAFT_VERSION || !parsed.draft) return { draft: EMPTY_DRAFT, restored: false };
    // Merge over EMPTY_DRAFT so a key added after this draft was written is
    // present rather than undefined.
    const merged = { ...EMPTY_DRAFT, ...parsed.draft };
    // `account` is replaced wholesale by the spread above, and the persisted
    // copy has no `password` key at all (see below), so merge it field-wise to
    // bring the empty-string default back rather than leaving it `undefined`.
    merged.account = { ...EMPTY_DRAFT.account, ...(parsed.draft.account ?? {}) };
    // Normalise the step here, in the value the reducer actually holds, rather
    // than clamping it at render time: a page that clamps for display only
    // still has the out-of-range number in state, so Back decrements a value
    // the merchant cannot see and appears to do nothing.
    merged.step = Math.min(Math.max(1, Math.floor(merged.step) || 1), STEP_COUNT);
    return { draft: merged, restored: true };
  } catch {
    return { draft: EMPTY_DRAFT, restored: false };
  }
}

export function useOnboardingDraft() {
  // Read once, on mount, so the reducer seeds from the persisted draft and
  // `restored` reflects that same read — not recomputed on every render.
  const initial = useMemo(readDraft, []);
  const [draft, dispatch] = useReducer(draftReducer, initial.draft);

  useEffect(() => {
    try {
      // The password is deliberately dropped on the way out. The draft is
      // written on every keystroke, so persisting it would leave the
      // merchant's plaintext password sitting in sessionStorage — readable in
      // devtools by anyone at that machine — for the life of the tab. It stays
      // on the type and in memory (the current session still needs it); a
      // resumed draft simply comes back with `account.password: ""` and the
      // merchant retypes it in the account modal.
      const { fullName, email, companyName } = draft.account;
      const persisted = { ...draft, account: { fullName, email, companyName } };
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ version: DRAFT_VERSION, draft: persisted }));
    } catch {
      // Private browsing or a full quota — the wizard still works, it just
      // will not survive a refresh. Not worth interrupting signup over.
    }
  }, [draft]);

  const clear = useCallback(() => {
    window.sessionStorage.removeItem(DRAFT_KEY);
  }, []);

  return { draft, dispatch, clear, restored: initial.restored };
}
