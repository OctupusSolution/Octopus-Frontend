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

describe("parseDraft normalises the step", () => {
  it("pulls an out-of-range step back into the flow", () => {
    const high = JSON.stringify({ version: DRAFT_VERSION, draft: { ...EMPTY_SITE_DRAFT, step: 99 } });
    expect(parseDraft(high)?.step).toBe(STEP_COUNT);
    const low = JSON.stringify({ version: DRAFT_VERSION, draft: { ...EMPTY_SITE_DRAFT, step: 0 } });
    expect(parseDraft(low)?.step).toBe(1);
  });
});
