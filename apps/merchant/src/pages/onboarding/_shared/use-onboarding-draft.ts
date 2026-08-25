// Session-scoped draft persistence. A mid-flow refresh resumes exactly where
// the merchant left off; an abandoned signup does not haunt the browser
// forever, so this is sessionStorage and it clears once the business exists.
//
// DRAFT_VERSION guards the shape: a draft written by the previous ten-step
// flow has fields this one no longer understands, so it is discarded rather
// than rehydrated into something half-valid.
import { useEffect, useReducer, useCallback } from "react";
import { draftReducer, EMPTY_DRAFT, type OnboardingDraft } from "./draft";

const DRAFT_KEY = "octopus.onboarding.draft";
const DRAFT_VERSION = 2;

function readDraft(): OnboardingDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as { version?: number; draft?: OnboardingDraft };
    if (parsed.version !== DRAFT_VERSION || !parsed.draft) return EMPTY_DRAFT;
    // Merge over EMPTY_DRAFT so a key added after this draft was written is
    // present rather than undefined.
    return { ...EMPTY_DRAFT, ...parsed.draft };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function useOnboardingDraft() {
  const [draft, dispatch] = useReducer(draftReducer, undefined, readDraft);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ version: DRAFT_VERSION, draft }));
    } catch {
      // Private browsing or a full quota — the wizard still works, it just
      // will not survive a refresh. Not worth interrupting signup over.
    }
  }, [draft]);

  const clear = useCallback(() => {
    window.sessionStorage.removeItem(DRAFT_KEY);
  }, []);

  return { draft, dispatch, clear };
}
