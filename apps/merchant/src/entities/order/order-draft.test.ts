import { describe, expect, it } from "vitest";
import type { SellableCatalogResponse, SellableOptionGroupResponse } from "@octopus/api-client";
import {
  addDraftLine,
  buildTakeOrderRequest,
  draftFromTemplate,
  estimateUnitPrice,
  fulfilmentChoices,
  invalidOptionGroup,
  setDraftQuantity,
  toggleOption,
  type DraftLine,
} from "./order-draft";

const size: SellableOptionGroupResponse = {
  groupId: "g-size",
  prompt: "Size",
  multiple: false,
  minSelected: 1,
  maxSelected: 1,
  options: [
    { optionId: "o-small", name: "Small", effectKind: "None", amount: null, isDefault: true, isAvailableNow: true },
    { optionId: "o-large", name: "Large", effectKind: "FixedPrice", amount: 30, isDefault: false, isAvailableNow: true },
  ],
};

const extras: SellableOptionGroupResponse = {
  groupId: "g-extra",
  prompt: "Extras",
  multiple: true,
  minSelected: 0,
  maxSelected: 2,
  options: [
    { optionId: "o-cheese", name: "Cheese", effectKind: "AddAmount", amount: 3, isDefault: false, isAvailableNow: true },
    { optionId: "o-egg", name: "Egg", effectKind: "AddAmount", amount: 4, isDefault: false, isAvailableNow: true },
    { optionId: "o-bacon", name: "Bacon", effectKind: "AddAmount", amount: 5, isDefault: false, isAvailableNow: true },
  ],
};

const catalog: SellableCatalogResponse = {
  catalogId: "cat-1",
  publicationId: "pub-1",
  version: 3,
  displayName: "Main",
  currency: "SAR",
  minorUnits: 2,
  taxStatus: "Inclusive",
  taxRatePercent: 15,
  entries: [
    {
      entryId: "e-burger",
      name: "Burger",
      shortName: null,
      sku: null,
      unitPrice: 25,
      fulfilmentCodes: ["on-site", "collection"],
      allFulfilment: false,
      optionGroupIds: ["g-size", "g-extra"],
      isAvailableNow: true,
    },
  ],
  optionGroups: [size, extras],
};

const baseLine: Omit<DraftLine, "key"> = {
  catalogId: "cat-1",
  entryId: "e-burger",
  name: "Burger",
  unitPrice: 25,
  optionIds: ["o-small"],
  optionNames: ["Small"],
  quantity: 1,
  note: null,
};

describe("cart", () => {
  it("merges the same entry+options+note and removes at zero", () => {
    let lines = addDraftLine([], baseLine);
    lines = addDraftLine(lines, { ...baseLine, quantity: 2 });
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
    lines = addDraftLine(lines, { ...baseLine, note: "no onion" });
    expect(lines).toHaveLength(2);
    expect(setDraftQuantity(lines, lines[0].key, 0)).toHaveLength(1);
  });
});

describe("options", () => {
  it("keeps single-choice groups to one and caps multi-choice at max", () => {
    let selected = toggleOption(catalog.optionGroups, ["o-small"], "g-size", "o-large");
    expect(selected).toEqual(["o-large"]);
    selected = toggleOption(catalog.optionGroups, selected, "g-extra", "o-cheese");
    selected = toggleOption(catalog.optionGroups, selected, "g-extra", "o-egg");
    selected = toggleOption(catalog.optionGroups, selected, "g-extra", "o-bacon");
    expect(selected).toEqual(["o-large", "o-cheese", "o-egg"]);
  });

  it("flags a required group left empty", () => {
    expect(invalidOptionGroup([size, extras], [])?.groupId).toBe("g-size");
    expect(invalidOptionGroup([size, extras], ["o-small"])).toBeNull();
  });

  it("estimates: fixed price replaces the base, add amounts add", () => {
    expect(estimateUnitPrice({ unitPrice: 25 }, [size, extras], ["o-large", "o-cheese"])).toBe(33);
    expect(estimateUnitPrice({ unitPrice: 25 }, [size, extras], ["o-small"])).toBe(25);
  });
});

describe("take order", () => {
  it("builds the backend's TakeOrderCommand, blanks to null and no prices", () => {
    const request = buildTakeOrderRequest({
      businessId: "biz",
      branchId: null,
      sourceCode: "pos",
      fulfilmentCode: "on-site",
      place: { containerId: "plan", resourceId: "spot" },
      attendeeCount: 0,
      customerName: "  ",
      customerPhone: "+966500000000",
      customerEmail: "",
      deliveryAddress: "",
      customerNote: "",
      internalNote: "vip",
      lines: addDraftLine([], baseLine),
    });
    expect(request.resourceContainerId).toBe("plan");
    expect(request.resourceId).toBe("spot");
    expect(request.attendeeCount).toBeNull();
    expect(request.customerName).toBeNull();
    expect(request.internalNote).toBe("vip");
    expect(request.lines).toEqual([{ catalogId: "cat-1", entryId: "e-burger", quantity: 1, optionIds: ["o-small"], note: null }]);
    expect(Object.keys(request.lines[0])).not.toContain("unitPrice");
  });

  it("offers the entries' fulfilment codes", () => {
    expect(fulfilmentChoices(catalog)).toEqual(["on-site", "collection"]);
  });

  it("rebuilds a cart from a duplicate template, dropping unknown entries", () => {
    const lines = draftFromTemplate(
      {
        lines: [
          { catalogId: "cat-1", entryId: "e-burger", quantity: 2, optionIds: ["o-large"], note: null },
          { catalogId: "cat-1", entryId: "e-gone", quantity: 1, optionIds: null, note: null },
        ],
      },
      catalog
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ name: "Burger", quantity: 2, unitPrice: 30, optionNames: ["Large"] });
  });
});
