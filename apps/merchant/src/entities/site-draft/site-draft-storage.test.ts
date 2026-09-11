import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT, STEP_COUNT } from "./site-draft";
import { DRAFT_VERSION, parseDraft, serializeDraft } from "./site-draft-storage";

describe("round trip", () => {
  it("restores a draft it wrote", () => {
    const draft = { ...EMPTY_SITE_DRAFT, step: 3, brand: { ...EMPTY_SITE_DRAFT.brand, businessName: "Ocean Table" } };
    expect(parseDraft(serializeDraft(draft))).toEqual(draft);
  });
});

describe("parseDraft rejects what it cannot trust", () => {
  it("returns null for nothing stored", () => {
    expect(parseDraft(null)).toBeNull();
  });

  it("returns null rather than throwing on malformed JSON", () => {
    expect(parseDraft("{not json")).toBeNull();
  });

  it("discards a draft written by an older shape", () => {
    const stale = JSON.stringify({ version: DRAFT_VERSION - 1, draft: EMPTY_SITE_DRAFT });
    expect(parseDraft(stale)).toBeNull();
  });

  it("discards a payload with no draft at all", () => {
    expect(parseDraft(JSON.stringify({ version: DRAFT_VERSION }))).toBeNull();
  });
});

describe("parseDraft rejects a corrupted shape rather than half-merging it", () => {
  it("discards a draft whose pages is null", () => {
    const raw = JSON.stringify({ version: DRAFT_VERSION, draft: { ...EMPTY_SITE_DRAFT, pages: null } });
    expect(parseDraft(raw)).toBeNull();
  });

  it("discards a draft whose sections is a string, not an array", () => {
    const raw = JSON.stringify({ version: DRAFT_VERSION, draft: { ...EMPTY_SITE_DRAFT, sections: "x" } });
    expect(parseDraft(raw)).toBeNull();
  });

  it("discards a draft whose sectionSettings is missing hero", () => {
    const { hero: _hero, ...restSectionSettings } = EMPTY_SITE_DRAFT.sectionSettings;
    const raw = JSON.stringify({
      version: DRAFT_VERSION,
      draft: { ...EMPTY_SITE_DRAFT, sectionSettings: restSectionSettings },
    });
    expect(parseDraft(raw)).toBeNull();
  });

  it("discards a draft whose pages array holds a non-object entry", () => {
    const raw = JSON.stringify({ version: DRAFT_VERSION, draft: { ...EMPTY_SITE_DRAFT, pages: [1, 2, 3] } });
    expect(parseDraft(raw)).toBeNull();
  });

  it("still round-trips a well-formed draft — the guard is not so strict it rejects everything", () => {
    const draft = { ...EMPTY_SITE_DRAFT, step: 4, brand: { ...EMPTY_SITE_DRAFT.brand, businessName: "Ocean Table" } };
    expect(parseDraft(serializeDraft(draft))).toEqual(draft);
  });
});

describe("parseDraft normalises the step", () => {
  it("pulls an out-of-range step back into the flow", () => {
    const high = JSON.stringify({ version: DRAFT_VERSION, draft: { ...EMPTY_SITE_DRAFT, step: 99 } });
    expect(parseDraft(high)?.step).toBe(STEP_COUNT);
    const low = JSON.stringify({ version: DRAFT_VERSION, draft: { ...EMPTY_SITE_DRAFT, step: 0 } });
    expect(parseDraft(low)?.step).toBe(1);
  });

  // Final review finding F2: a fractional step survived Math.min/Math.max
  // unchanged, and `SITE_STEPS[3.5 - 1]` is `undefined` — index.tsx then
  // throws reading `.Component` off it.
  it("floors a fractional step to a real step index", () => {
    const raw = JSON.stringify({ version: DRAFT_VERSION, draft: { ...EMPTY_SITE_DRAFT, step: 3.7 } });
    expect(parseDraft(raw)?.step).toBe(3);
    expect(Number.isInteger(parseDraft(raw)!.step)).toBe(true);
  });

});

describe("parseDraft deep-merges new fields into an older stored draft", () => {
  it("fills in fields added after the draft was saved, while keeping the stored values it does carry", () => {
    // Simulates a draft saved before hero.overlay, reservations.cancellationWindow,
    // preview.testModeSettings and publish.publishedAt existed: those keys are
    // simply absent, not present-with-a-value, on the stored slices.
    const { overlay: _overlay, ...heroWithoutOverlay } = EMPTY_SITE_DRAFT.sectionSettings.hero;
    const { cancellationWindow: _cancellationWindow, ...reservationsWithoutWindow } =
      EMPTY_SITE_DRAFT.sectionSettings.reservations;
    const { testModeSettings: _testModeSettings, ...previewWithoutTestMode } = EMPTY_SITE_DRAFT.preview;
    const { publishedAt: _publishedAt, ...publishWithoutPublishedAt } = EMPTY_SITE_DRAFT.publish;

    const stored = {
      ...EMPTY_SITE_DRAFT,
      sectionSettings: {
        ...EMPTY_SITE_DRAFT.sectionSettings,
        hero: { ...heroWithoutOverlay, heading: "Custom heading" },
        reservations: { ...reservationsWithoutWindow, cutOff: "4" },
      },
      preview: previewWithoutTestMode,
      publish: publishWithoutPublishedAt,
    };
    const raw = JSON.stringify({ version: DRAFT_VERSION, draft: stored });

    const parsed = parseDraft(raw);
    expect(parsed).not.toBeNull();
    // Defaults fill the missing fields in.
    expect(parsed!.sectionSettings.hero.overlay).toBe(EMPTY_SITE_DRAFT.sectionSettings.hero.overlay);
    expect(parsed!.sectionSettings.reservations.cancellationWindow).toBe(
      EMPTY_SITE_DRAFT.sectionSettings.reservations.cancellationWindow,
    );
    expect(parsed!.preview.testModeSettings).toEqual(EMPTY_SITE_DRAFT.preview.testModeSettings);
    expect(parsed!.publish.publishedAt).toBeNull();
    // The draft's own values on those same slices survive the merge.
    expect(parsed!.sectionSettings.hero.heading).toBe("Custom heading");
    expect(parsed!.sectionSettings.reservations.cutOff).toBe("4");
  });
});

describe("parseDraft rejects a corrupted typography shape", () => {
  // Final review finding F2: preview-model.ts reads
  // `brand.typography.en.titles` / `.ar.titles`; `isRecord(brand.typography)`
  // alone let `typography: {}` or `typography: { en: 3 }` through.
  it("discards a draft whose typography.en is not an object", () => {
    const raw = JSON.stringify({
      version: DRAFT_VERSION,
      draft: { ...EMPTY_SITE_DRAFT, brand: { ...EMPTY_SITE_DRAFT.brand, typography: { en: 3, ar: {} } } },
    });
    expect(parseDraft(raw)).toBeNull();
  });

  it("discards a draft whose typography has no ar side at all", () => {
    const raw = JSON.stringify({
      version: DRAFT_VERSION,
      draft: { ...EMPTY_SITE_DRAFT, brand: { ...EMPTY_SITE_DRAFT.brand, typography: {} } },
    });
    expect(parseDraft(raw)).toBeNull();
  });
});
