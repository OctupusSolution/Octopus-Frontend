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
//
// Two flows share this hook — signup and add-business — each with its own
// storage keys (an abandoned draft in one must never surface in the other),
// its own step count to normalise against, and, for add-business, a patch
// applied over EMPTY_DRAFT so a fresh draft starts with the account step
// already considered done. `useOnboardingDraft` takes all of that as a config
// rather than assuming signup's values.
import { useEffect, useReducer, useCallback, useMemo } from "react";
import { draftReducer, EMPTY_DRAFT, type OnboardingDraft } from "./draft";

const DRAFT_VERSION = 2;

export interface OnboardingDraftConfig {
  /** sessionStorage key for the auto-saved copy. */
  draftKey: string;
  /** localStorage key for the explicitly kept copy. */
  keptKey: string;
  /** How many steps the active flow has. Used to normalise a restored
   *  `draft.step` into range. */
  stepCount: number;
  /** Applied over EMPTY_DRAFT when there is nothing persisted to restore. */
  patch?: Partial<OnboardingDraft>;
}

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
function parseDraft(raw: string | null, stepCount: number): OnboardingDraft | null {
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
  merged.step = Math.min(Math.max(1, Math.floor(merged.step) || 1), stepCount);
  return merged;
}

/** EMPTY_DRAFT, with the flow's own patch (if any) applied — what a brand new
 *  draft for this flow looks like. */
function freshDraft(config: OnboardingDraftConfig): OnboardingDraft {
  return config.patch ? { ...EMPTY_DRAFT, ...config.patch } : EMPTY_DRAFT;
}

/** `restored` is true only when a valid persisted draft was found — a fresh
 * draft (nothing stored, or a discarded stale/corrupt one) is not a restore.
 * The session copy wins over the kept one: it is the newer of the two
 * whenever both exist, because it is rewritten on every change. */
function readDraft(config: OnboardingDraftConfig): { draft: OnboardingDraft; restored: boolean } {
  if (typeof window === "undefined") return { draft: freshDraft(config), restored: false };
  try {
    const draft =
      parseDraft(window.sessionStorage.getItem(config.draftKey), config.stepCount) ??
      parseDraft(window.localStorage.getItem(config.keptKey), config.stepCount);
    return draft ? { draft, restored: true } : { draft: freshDraft(config), restored: false };
  } catch {
    return { draft: freshDraft(config), restored: false };
  }
}

export function useOnboardingDraft(config: OnboardingDraftConfig) {
  // Read once, on mount, so the reducer seeds from the persisted draft and
  // `restored` reflects that same read — not recomputed on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => readDraft(config), []);
  const [draft, dispatch] = useReducer(draftReducer, initial.draft);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(config.draftKey, serialize(draft));
    } catch {
      // Private browsing or a full quota — the wizard still works, it just
      // will not survive a refresh. Not worth interrupting signup over.
    }
  }, [draft, config.draftKey]);

  /** "Save As Draft": keep this draft past the life of the tab. Reports whether
   *  it actually landed, so the caller does not promise a merchant in private
   *  browsing something that silently did not happen. */
  const keep = useCallback((): boolean => {
    try {
      window.localStorage.setItem(config.keptKey, serialize(draft));
      return true;
    } catch {
      return false;
    }
  }, [draft, config.keptKey]);

  const clear = useCallback(() => {
    // Both lifetimes end when the business exists — a kept draft left behind
    // would offer to resume a signup that has already finished.
    window.sessionStorage.removeItem(config.draftKey);
    try {
      window.localStorage.removeItem(config.keptKey);
    } catch {
      // Nothing was kept, or storage is unavailable. Either way there is
      // nothing to clean up.
    }
  }, [config.draftKey, config.keptKey]);

  return { draft, dispatch, clear, keep, restored: initial.restored };
}
