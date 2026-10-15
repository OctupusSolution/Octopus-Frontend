import { describe, expect, it } from "vitest";
import { previewEntryFromHash } from "./preview-hash";

describe("previewEntryFromHash", () => {
  it("turns the backend's link fragment into the storefront's preview entry", () => {
    expect(previewEntryFromHash("#t=plpv_abc123")).toBe("/_preview?token=plpv_abc123");
  });

  it("keeps the token intact when it holds characters a query must escape", () => {
    expect(previewEntryFromHash("#t=plpv_a%2Bb")).toBe("/_preview?token=plpv_a%2Bb");
    expect(previewEntryFromHash("#t=a+b/c")).toBe(`/_preview?token=${encodeURIComponent("a+b/c")}`);
  });

  it("reads the token among other fragment parameters", () => {
    expect(previewEntryFromHash("#x=1&t=plpv_z")).toBe("/_preview?token=plpv_z");
  });

  it("has nothing to offer without a token", () => {
    expect(previewEntryFromHash("")).toBeNull();
    expect(previewEntryFromHash("#")).toBeNull();
    expect(previewEntryFromHash("#t=")).toBeNull();
    expect(previewEntryFromHash("#token=plpv_x")).toBeNull();
  });
});
