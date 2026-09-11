// Draft persistence for the Public Link Builder.
//
// localStorage, not sessionStorage: this is a business setting a merchant
// comes back to next week, not a signup they might abandon in this tab. That
// is the one place it diverges from use-onboarding-draft, which it otherwise
// follows.
//
// Two things make `parseDraft` discard a stored payload rather than trust it:
// a `version` that does not match `DRAFT_VERSION` (a draft written before a
// field existed, or after one was retired), and a `draft` that fails
// `isSiteDraftShape` (a hand-edited or corrupted value — localStorage is
// exactly where those come from). Either way the whole draft is thrown away,
// not patched: a shallow `{ ...EMPTY_SITE_DRAFT, ...parsed.draft }` merge only
// fills in keys that are *missing*, not ones that are present but wrong — a
// stored `pages: null` would survive such a merge and crash the first `.find`
// or `.filter` downstream. Discarding is the honest answer either way.
import { EMPTY_SITE_DRAFT, STEP_COUNT, type SiteDraft } from "./site-draft";

export const DRAFT_KEY = "octo.site-draft";
export const DRAFT_VERSION = 1;

export function serializeDraft(draft: SiteDraft): string {
  return JSON.stringify({ version: DRAFT_VERSION, draft });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/** An entry from `pages` or `sections` — both are arrays of `{ id: string, ... }`. */
function isIdEntryArray(value: unknown): value is { id: string }[] {
  return Array.isArray(value) && value.every((entry) => isRecord(entry) && typeof entry.id === "string");
}

/** Not a full schema — just enough structure that every read this codebase
 *  does on a `SiteDraft` (`.filter`, `.find`, `!.labelKey`, `hero.heading`, …)
 *  is safe against the stored value, without pinning down every leaf field. A
 *  draft that fails this is not worth rescuing field-by-field; see the file
 *  banner. */
function isSiteDraftShape(value: unknown): value is SiteDraft {
  if (!isRecord(value)) return false;

  if (typeof value.step !== "number") return false;
  if (!isRecord(value.theme)) return false;
  if (!isRecord(value.brand) || !isRecord(value.brand.colors) || !isRecord(value.brand.typography)) return false;
  // `preview-model.ts` reads `brand.typography.en.titles` / `.ar.titles` —
  // final review finding F2. `isRecord(value.brand.typography)` alone lets a
  // draft with `typography: {}` (or `typography: { en: 3 }`) through, which
  // crashes there at mount with no boundary to catch it.
  if (!isRecord(value.brand.typography.en) || !isRecord(value.brand.typography.ar)) return false;

  if (!isIdEntryArray(value.pages)) return false;
  if (!isIdEntryArray(value.sections)) return false;

  if (!isRecord(value.navigation) || !isStringArray(value.navigation.hidden)) return false;

  const sectionSettings = value.sectionSettings;
  if (!isRecord(sectionSettings)) return false;
  for (const key of ["hero", "reservations", "waitlist", "menu", "offers"] as const) {
    if (!isRecord(sectionSettings[key])) return false;
  }
  if (!isRecord(sectionSettings.generic)) return false;

  const preview = value.preview;
  if (!isRecord(preview)) return false;
  if (!Array.isArray(preview.testers)) return false;
  if (!(Array.isArray(preview.results) || preview.results === null)) return false;

  if (!isRecord(value.publish)) return false;
  if (!isRecord(value.publish.seo)) return false;
  if (!isRecord(value.publish.customDomain)) return false;

  return true;
}

export function parseDraft(raw: string | null): SiteDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { version?: number; draft?: unknown };
    if (parsed.version !== DRAFT_VERSION) return null;
    if (!isSiteDraftShape(parsed.draft)) return null;
    // Floored, not just clamped (final review finding F2): a fractional step
    // (e.g. 3.5, from a hand-edited or corrupted value) survives
    // `Math.min`/`Math.max` unchanged, and `SITE_STEPS[3.5 - 1]` is
    // `undefined` — `index.tsx` then throws reading `.Component` off it.
    // `Number.isFinite` guards the NaN case the same way (`??` alone would
    // not, since `NaN ?? 1` is still `NaN`).
    const rawStep = parsed.draft.step;
    const step = Number.isFinite(rawStep) ? Math.floor(Math.min(STEP_COUNT, Math.max(1, rawStep))) : 1;
    const stored = parsed.draft;
    // A draft saved before a field existed (e.g. hero.overlay, a whole
    // testModeSettings object) is missing it entirely — a shallow spread
    // leaves such fields `undefined` and the new UI reading them crashes.
    // Merging one level deeper into each nested slice fills in only the keys
    // a stored draft actually lacks, without touching keys it does carry —
    // same "add, never overwrite a present value" rule as the outer merge.
    return {
      ...EMPTY_SITE_DRAFT,
      ...stored,
      step,
      brand: {
        ...EMPTY_SITE_DRAFT.brand,
        ...stored.brand,
        colors: { ...EMPTY_SITE_DRAFT.brand.colors, ...stored.brand.colors },
        typography: {
          en: { ...EMPTY_SITE_DRAFT.brand.typography.en, ...stored.brand.typography.en },
          ar: { ...EMPTY_SITE_DRAFT.brand.typography.ar, ...stored.brand.typography.ar },
        },
      },
      navigation: { ...EMPTY_SITE_DRAFT.navigation, ...stored.navigation },
      sectionSettings: {
        ...EMPTY_SITE_DRAFT.sectionSettings,
        ...stored.sectionSettings,
        hero: { ...EMPTY_SITE_DRAFT.sectionSettings.hero, ...stored.sectionSettings.hero },
        reservations: {
          ...EMPTY_SITE_DRAFT.sectionSettings.reservations,
          ...stored.sectionSettings.reservations,
        },
        waitlist: { ...EMPTY_SITE_DRAFT.sectionSettings.waitlist, ...stored.sectionSettings.waitlist },
        menu: { ...EMPTY_SITE_DRAFT.sectionSettings.menu, ...stored.sectionSettings.menu },
        offers: { ...EMPTY_SITE_DRAFT.sectionSettings.offers, ...stored.sectionSettings.offers },
        generic: { ...EMPTY_SITE_DRAFT.sectionSettings.generic, ...stored.sectionSettings.generic },
      },
      preview: {
        ...EMPTY_SITE_DRAFT.preview,
        ...stored.preview,
        testModeSettings: {
          ...EMPTY_SITE_DRAFT.preview.testModeSettings,
          ...stored.preview.testModeSettings,
        },
      },
      publish: {
        ...EMPTY_SITE_DRAFT.publish,
        ...stored.publish,
        seo: { ...EMPTY_SITE_DRAFT.publish.seo, ...stored.publish.seo },
        customDomain: { ...EMPTY_SITE_DRAFT.publish.customDomain, ...stored.publish.customDomain },
      },
    };
  } catch {
    return null;
  }
}
