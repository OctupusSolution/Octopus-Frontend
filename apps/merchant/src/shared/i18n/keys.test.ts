import { describe, expect, it } from "vitest";
import { ar, en } from "@i18n/index";

describe("merchant locale dictionaries", () => {
  it("define exactly the same keys", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it("holds a string for every key in both languages", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(typeof value, `en.${key}`).toBe("string");
    }
    for (const [key, value] of Object.entries(ar)) {
      expect(typeof value, `ar.${key}`).toBe("string");
    }
  });

  // A deliberately empty fragment is legitimate — `onboarding.aside.insights.leadTail`
  // is empty in Arabic because the verb-first word order needs no tail where English
  // needs "will include". So this guard is aimed only at the namespace this plan adds,
  // where every key is a whole phrase and an empty one is always an oversight.
  it("leaves no publicLink key empty in either language", () => {
    for (const key of Object.keys(en).filter((k) => k.startsWith("publicLink."))) {
      expect((en as Record<string, string>)[key], `en.${key}`).toBeTruthy();
      expect((ar as Record<string, string>)[key], `ar.${key}`).toBeTruthy();
    }
  });
});
