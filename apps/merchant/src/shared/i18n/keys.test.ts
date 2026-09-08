import { describe, expect, it } from "vitest";
import { ar, en } from "@i18n/index";

describe("merchant locale dictionaries", () => {
  it("define exactly the same keys", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it("leave no value empty in either language", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key}`).toBeTruthy();
    }
    for (const [key, value] of Object.entries(ar)) {
      expect(value, `ar.${key}`).toBeTruthy();
    }
  });
});
