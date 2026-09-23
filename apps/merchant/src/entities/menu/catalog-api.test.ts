import { describe, expect, it } from "vitest";
import type { CatalogItemResponse } from "@octopus/api-client";
import { labelCodeFor } from "./catalog-api";
import { itemScheduleFromApi, itemScheduleToApi, nutritionFieldOf, toItem } from "./menu-sync";

const CODE = /^[a-z][a-z0-9-]{1,40}$/;

describe("labelCodeFor", () => {
  it("slugs a typed name into the API's label-code shape", () => {
    expect(labelCodeFor("Spicy Food")).toBe("spicy-food");
    expect(labelCodeFor("  Chef's  Pick!! ")).toBe("chef-s-pick");
  });

  it("always yields a code the API accepts, whatever was typed", () => {
    for (const name of ["9 Grain", "حار", "x", "A".repeat(80), "--"]) {
      expect(labelCodeFor(name)).toMatch(CODE);
    }
  });
});

describe("item schedule mapping", () => {
  it("sends nothing for an all-day item", () => {
    expect(itemScheduleToApi({ mode: "all-day" })).toBeNull();
    expect(itemScheduleFromApi(null)).toEqual({ mode: "all-day" });
  });

  it("round-trips a custom window through DayOfWeek names and HH:mm:ss", () => {
    const dto = itemScheduleToApi({ mode: "custom", start: "06:00", end: "11:30", days: ["sun", "fri"] });
    expect(dto?.windows[0].days).toEqual(["Sunday", "Friday"]);
    const back = itemScheduleFromApi({ ...dto!, windows: [{ ...dto!.windows[0], start: "06:00:00", end: "11:30:00" }] });
    expect(back).toEqual({ mode: "custom", start: "06:00", end: "11:30", days: ["sun", "fri"] });
  });
});

describe("toItem", () => {
  const res: CatalogItemResponse = {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    name: { en: "Shakshuka" },
    shortName: {},
    description: {},
    sku: null,
    image: null,
    video: null,
    tagCodes: ["chef-recommended"],
    status: "Active",
    isUnavailable: false,
    fulfillmentModes: { all: true, codes: [] },
    schedule: null,
    basePrice: { amount: 32, currency: "SAR" },
    facts: [
      { factCode: "calories", amount: 420, unitCode: "kcal" },
      { factCode: "sodium", amount: 0.8, unitCode: "g" },
    ],
    advisories: { labelCodes: ["eggs"], additionalInfo: { en: "Cooked in butter" } },
    modifierGroupIds: [],
    placementCount: 1,
    version: 3,
  };

  it("reads facts, advisories and mirrors known facts into nutrition", () => {
    const item = toItem(res);
    expect(item.facts).toHaveLength(2);
    expect(item.nutrition.calories).toBe(420);
    expect(item.allergies).toEqual({ allergens: ["eggs"], note: "Cooked in butter" });
    expect(item.schedule).toEqual({ mode: "all-day" });
  });

  it("maps only the codes the nutrition strip knows", () => {
    expect(nutritionFieldOf("Carbohydrates")).toBe("carb");
    expect(nutritionFieldOf("sodium")).toBeNull();
  });
});
