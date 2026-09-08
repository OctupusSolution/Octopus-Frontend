import { describe, expect, it } from "vitest";
import { EMPTY_DRAFT } from "../_shared/draft";
import { previewModelFromOnboarding } from "./public-link-model";

const t = (key: string) => key;

describe("previewModelFromOnboarding", () => {
  it("renders the tag as a hostname", () => {
    const model = previewModelFromOnboarding(EMPTY_DRAFT, "desktop", t, "en");
    expect(model.url).toBe("restaurant.octopus.app");
  });

  it("falls back to a placeholder hostname when the tag is empty", () => {
    const draft = { ...EMPTY_DRAFT, publicLink: { ...EMPTY_DRAFT.publicLink, tag: "" } };
    expect(previewModelFromOnboarding(draft, "desktop", t, "en").url).toBe("restaurant.octopus.app");
  });

  it("carries the merchant's section order through unchanged", () => {
    const draft = { ...EMPTY_DRAFT, publicLink: { ...EMPTY_DRAFT.publicLink, sections: ["offers", "hero"] } };
    expect(previewModelFromOnboarding(draft, "desktop", t, "en").sections).toEqual(["offers", "hero"]);
  });

  it("uses the translated business-name placeholder when the merchant has not typed one", () => {
    expect(previewModelFromOnboarding(EMPTY_DRAFT, "desktop", t, "en").businessName)
      .toBe("onboarding.businessName");
  });

  it("passes the device through", () => {
    expect(previewModelFromOnboarding(EMPTY_DRAFT, "mobile", t, "en").device).toBe("mobile");
  });

  it("builds a four-price ladder rather than one repeated price", () => {
    const model = previewModelFromOnboarding(EMPTY_DRAFT, "desktop", t, "en");
    expect(model.samplePrices).toHaveLength(4);
    expect(model.samplePrices[0]).not.toBe(model.samplePrices[1]);
    expect(model.sampleWasPrices).toHaveLength(4);
    expect(model.sampleWasPrices[0]).not.toBe(model.sampleWasPrices[1]);
  });
});
