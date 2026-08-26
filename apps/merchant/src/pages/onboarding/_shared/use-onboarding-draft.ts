// Draft persistence, at two lifetimes.
//
// Automatic saving is session-scoped: a mid-flow refresh resumes exactly where
// the merchant left off, but an abandoned signup does not haunt the browser
// forever, so that copy lives in sessionStorage and clears once the business
// exists.
//
// "Save As Draft" on step 8 is the merchant saying the opposite — they intend to
// come back, after this tab is gone. That press, and only that press, mirrors
// the draft into localStorage; `readDraft` falls back to it when the session
// copy is missing, and `clear` removes both. Without the second lifetime the
// button would either be a no-op (the session copy is already written on every
// keystroke) or a plain "leave the flow" link, which the header already has.
//
// DRAFT_VERSION guards the shape: a draft written by the previous ten-step
// flow has fields this one no longer understands, so it is discarded rather
// than rehydrated into something half-valid.
import { useEffect, useReducer, useCallback, useMemo } from "react";
import { draftReducer, EMPTY_DRAFT, type OnboardingDraft } from "./draft";
import { STEP_COUNT } from "./steps";

const DRAFT_KEY = "octopus.onboarding.draft";
/** The explicitly kept copy. A separate key, not a separate format. */
const KEPT_KEY = "octopus.onboarding.draft.kept";
const DRAFT_VERSION = 2;

/** What actually gets written, at either lifetime.
 *
 *  The password is deliberately dropped on the way out. The session copy is
 *  written on every keystroke, so persisting it would leave the merchant's
 *  plaintext password sitting in storage — readable in devtools by anyone at
 *  that machine — for the life of the tab, and the kept copy would leave it
 *  there for good. It stays on the type and in memory (the current session
 *  still needs it); a resumed draft simply comes back with
 *  `account.password: ""` and the merchant retypes it in the account modal. */
function serialize(draft: OnboardingDraft): string {
  const { fullName, email, companyName } = draft.account;
  const persisted = { ...draft, account: { fullName, email, companyName } };
  return JSON.stringify({ version: DRAFT_VERSION, draft: persisted });
}

/** Rehydrates one stored string, or returns null if there is nothing usable. */
function parseDraft(raw: string | null): OnboardingDraft | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as { version?: number; draft?: OnboardingDraft };
  if (parsed.version !== DRAFT_VERSION || !parsed.draft) return null;
  // Merge over EMPTY_DRAFT so a key added after this draft was written is
  // present rather than undefined.
  const merged = { ...EMPTY_DRAFT, ...parsed.draft };
  // That top-level spread defaults only the top-level keys: every nested object
  // is replaced wholesale by the persisted copy, so a field added to one of them
  // after this draft was written comes back `undefined` and the guarantee above
  // quietly stops holding one level down. `brand.font` (step 8's typeface) is
  // the first field to have been added that way. `account` needs it regardless,
  // since its stored copy has no `password` key at all.
  merged.account = { ...EMPTY_DRAFT.account, ...(parsed.draft.account ?? {}) };
  merged.brand = { ...EMPTY_DRAFT.brand, ...(parsed.draft.brand ?? {}) };
  merged.publicLink = { ...EMPTY_DRAFT.publicLink, ...(parsed.draft.publicLink ?? {}) };
  // Normalise the step here, in the value the reducer actually holds, rather
  // than clamping it at render time: a page that clamps for display only
  // still has the out-of-range number in state, so Back decrements a value
  // the merchant cannot see and appears to do nothing.
  merged.step = Math.min(Math.max(1, Math.floor(merged.step) || 1), STEP_COUNT);
  return merged;
}

/** `restored` is true only when a valid persisted draft was found — a fresh
 * `EMPTY_DRAFT` (nothing stored, or a discarded stale/corrupt one) is not a
 * restore. The session copy wins over the kept one: it is the newer of the two
 * whenever both exist, because it is rewritten on every change. */
function readDraft(): { draft: OnboardingDraft; restored: boolean } {
  if (typeof window === "undefined") return { draft: EMPTY_DRAFT, restored: false };
  try {
    const draft =
      parseDraft(window.sessionStorage.getItem(DRAFT_KEY)) ??
      parseDraft(window.localStorage.getItem(KEPT_KEY));
    return draft ? { draft, restored: true } : { draft: EMPTY_DRAFT, restored: false };
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
      window.sessionStorage.setItem(DRAFT_KEY, serialize(draft));
    } catch {
      // Private browsing or a full quota — the wizard still works, it just
      // will not survive a refresh. Not worth interrupting signup over.
    }
  }, [draft]);

  /** "Save As Draft": keep this draft past the life of the tab. Reports whether
   *  it actually landed, so the caller does not promise a merchant in private
   *  browsing something that silently did not happen. */
  const keep = useCallback((): boolean => {
    try {
      window.localStorage.setItem(KEPT_KEY, serialize(draft));
      return true;
    } catch {
      return false;
    }
  }, [draft]);

  const clear = useCallback(() => {
    // Both lifetimes end when the business exists — a kept draft left behind
    // would offer to resume a signup that has already finished.
    window.sessionStorage.removeItem(DRAFT_KEY);
    try {
      window.localStorage.removeItem(KEPT_KEY);
    } catch {
      // Nothing was kept, or storage is unavailable. Either way there is
      // nothing to clean up.
    }
  }, []);

  return { draft, dispatch, clear, keep, restored: initial.restored };
}
