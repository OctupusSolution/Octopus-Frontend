// Draft persistence for the Public Link Builder.
//
// localStorage, not sessionStorage: this is a business setting a merchant
// comes back to next week, not a signup they might abandon in this tab. That
// is the one place it diverges from use-onboarding-draft, which it otherwise
// follows.
//
// DRAFT_VERSION guards the shape. A draft written before a field existed would
// rehydrate into something half-valid, and the screen that read it would show
// a control with nothing behind it — discarding is the honest answer.
import { EMPTY_SITE_DRAFT, STEP_COUNT, type SiteDraft } from "./site-draft";

export const DRAFT_KEY = "octo.site-draft";
export const DRAFT_VERSION = 1;

export function serializeDraft(draft: SiteDraft): string {
  return JSON.stringify({ version: DRAFT_VERSION, draft });
}

export function parseDraft(raw: string | null): SiteDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { version?: number; draft?: SiteDraft };
    if (parsed.version !== DRAFT_VERSION || !parsed.draft) return null;
    const step = Math.min(STEP_COUNT, Math.max(1, parsed.draft.step ?? 1));
    return { ...EMPTY_SITE_DRAFT, ...parsed.draft, step };
  } catch {
    return null;
  }
}
