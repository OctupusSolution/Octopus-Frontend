import { describe, expect, it } from "vitest";
import { blankOffer } from "./draft";
import type { Offer } from "./menu";
import { OFFER_NAME_MAX, isOfferComplete, normalizeOfferSlug, offerIncompleteTabs, validateOffer } from "./offer-validation";

const IMAGE = "data:image/png;base64,AAAA";

function complete(patch: Partial<Offer> = {}): Offer {
  const base = blankOffer("o-1", "Classic Burger Combo");
  return {
    ...base,
    image: IMAGE,
    entries: [
      { itemId: "i-1", qty: 1, price: 90 },
      { itemId: "i-2", qty: 2, price: 20 },
    ],
    pricing: { ...base.pricing, offerPrice: 100 },
    ...patch,
  };
}

describe("validateOffer", () => {
  it("accepts a complete offer", () => {
    expect(validateOffer(complete(), { itemsSubTotal: 130 })).toEqual({});
    expect(isOfferComplete(complete(), { itemsSubTotal: 130 })).toBe(true);
  });

  it("reports every required field of a blank offer, and the tabs they sit on", () => {
    const blank = blankOffer("o-2", "");
    expect(validateOffer(blank)).toMatchObject({
      name: "menuOffer.validation.nameRequired",
      slug: "menuOffer.validation.slugRequired",
      image: "menuOffer.validation.imageRequired",
      entries: "menuOffer.validation.itemsRequired",
      offerPrice: "menuOffer.validation.priceRequired",
    });
    expect(offerIncompleteTabs(blank)).toEqual(["info", "items", "pricing"]);
  });

  it("limits the name length", () => {
    expect(validateOffer(complete({ name: "x".repeat(OFFER_NAME_MAX + 1) })).name).toBe("menuOffer.validation.nameTooLong");
    expect(validateOffer(complete({ name: "x".repeat(OFFER_NAME_MAX) })).name).toBeUndefined();
  });

  it("allows only letters, digits, underscore and hyphen in the slug", () => {
    expect(validateOffer(complete({ slug: "Classic_Burger-Combo2" })).slug).toBeUndefined();
    for (const slug of ["classic burger", "combo!", "كومبو", "a/b"]) {
      expect(validateOffer(complete({ slug })).slug).toBe("menuOffer.validation.slugFormat");
    }
  });

  it("refuses a slug another offer already uses, as the API would compare them", () => {
    expect(normalizeOfferSlug("Classic_Burger_Combo")).toBe("classic-burger-combo");
    expect(validateOffer(complete(), { otherSlugs: ["classic-burger-combo"] }).slug).toBe("menuOffer.validation.slugTaken");
    expect(validateOffer(complete(), { otherSlugs: ["family_meal"] }).slug).toBeUndefined();
  });

  it("needs at least one item and whole quantities of one or more", () => {
    expect(validateOffer(complete({ entries: [] })).entries).toBe("menuOffer.validation.itemsRequired");
    expect(validateOffer(complete({ entries: [{ itemId: "i-1", qty: 0, price: 90 }] })).entries).toBe("menuOffer.validation.qtyMin");
    expect(validateOffer(complete({ entries: [{ itemId: "i-1", qty: 1.5, price: 90 }] })).entries).toBe("menuOffer.validation.qtyMin");
  });

  it("needs a fixed price above zero and not above the items total", () => {
    const priced = (offerPrice: number) => complete({ pricing: { ...complete().pricing, offerPrice } });
    expect(validateOffer(priced(0), { itemsSubTotal: 130 }).offerPrice).toBe("menuOffer.validation.priceRequired");
    expect(validateOffer(priced(131), { itemsSubTotal: 130 }).offerPrice).toBe("menuOffer.validation.priceAboveTotal");
    expect(validateOffer(priced(130), { itemsSubTotal: 130 }).offerPrice).toBeUndefined();
    // No total to compare against: only the positive-price rule applies.
    expect(validateOffer(priced(500)).offerPrice).toBeUndefined();
  });

  it("keeps a discount inside 0–100% or the items total", () => {
    const discounted = (type: "percent" | "amount", value: number, offerPrice = 50) =>
      complete({ pricing: { ...complete().pricing, role: "discount", discount: { type, value }, offerPrice } });
    expect(validateOffer(discounted("percent", 101), { itemsSubTotal: 130 }).discount).toBe("menuOffer.validation.discountPercentRange");
    expect(validateOffer(discounted("percent", -1), { itemsSubTotal: 130 }).discount).toBe("menuOffer.validation.discountRequired");
    expect(validateOffer(discounted("amount", 131), { itemsSubTotal: 130 }).discount).toBe("menuOffer.validation.discountAboveTotal");
    expect(validateOffer(discounted("percent", 25), { itemsSubTotal: 130 })).toEqual({});
    expect(validateOffer(discounted("amount", 30), { itemsSubTotal: 130 })).toEqual({});
    // A discount that takes the whole price leaves nothing to charge.
    expect(validateOffer(discounted("percent", 100, 0), { itemsSubTotal: 130 }).offerPrice).toBe("menuOffer.validation.priceRequired");
  });

  it("refuses an end date before the start date", () => {
    const run = (from: string | null, to: string | null) => complete({ availability: { from, to, window: null } });
    expect(validateOffer(run("2026-08-14", "2026-08-13")).to).toBe("menuOffer.validation.toBeforeFrom");
    expect(validateOffer(run("2026-08-14", "2026-08-14")).to).toBeUndefined();
    expect(validateOffer(run(null, "2026-08-14")).to).toBeUndefined();
    expect(validateOffer(run("14/08/2026", null)).from).toBe("menuOffer.validation.dateInvalid");
  });

  it("requires the time window parts only when the window is set", () => {
    expect(validateOffer(complete())).toEqual({});
    const open = complete({ availability: { from: null, to: null, window: { days: [null, null], start: null, end: null } } });
    expect(validateOffer(open)).toEqual({
      dayFrom: "menuOffer.validation.dayRequired",
      dayTo: "menuOffer.validation.dayRequired",
      timeFrom: "menuOffer.validation.timeRequired",
      timeTo: "menuOffer.validation.timeRequired",
    });
    expect(offerIncompleteTabs(open)).toEqual(["availability"]);
  });

  it("needs the window to end after it starts, and accepts a week-wrapping day range", () => {
    const win = (start: string, end: string) =>
      complete({ availability: { from: null, to: null, window: { days: ["fri", "mon"], start, end } } });
    expect(validateOffer(win("12:00", "12:00")).timeTo).toBe("menuOffer.validation.timeToAfterFrom");
    expect(validateOffer(win("12:00", "10:00")).timeTo).toBe("menuOffer.validation.timeToAfterFrom");
    expect(validateOffer(win("10:00", "12:00"))).toEqual({});
  });

  it("needs at least one channel", () => {
    const none = complete({
      channels: { dineIn: false, takeaway: false, delivery: false, kiosk: false, onlineOrdering: false, mobileApp: false },
    });
    expect(validateOffer(none).channels).toBe("menuOffer.validation.channelRequired");
    expect(offerIncompleteTabs(none)).toEqual(["channels"]);
  });
});
