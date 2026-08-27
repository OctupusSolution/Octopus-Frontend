import { describe, expect, it } from "vitest";
import { ar, en } from "@i18n/index";

// The Arabic dictionary opens with a note asking for exactly this guard.
describe("locale dictionaries", () => {
  it("define exactly the same keys", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it("cover every storefront key in both languages", () => {
    const storeKeys = Object.keys(en).filter((k) => k.startsWith("store."));
    expect(storeKeys.length).toBeGreaterThan(0);
    for (const key of storeKeys) {
      expect((ar as Record<string, string>)[key], key).toBeTruthy();
    }
  });
});
