import { describe, expect, it } from "vitest";
import type { MenuItem, OrderLine } from "@octopus/api-client";
import type { Menu } from "@/shared/api/menu-document";
import {
  cartSignature,
  idempotencyKeyFor,
  itemRefOf,
  optionIdOf,
  orderableMenu,
  placeProblemOf,
  remapCart,
  toScanLines,
  type PlaceOrdering,
} from "./place-order";

const ordering: PlaceOrdering = {
  basis: "b1",
  items: { i1: "e-1", i2: "e-2" },
  optionGroups: { m1: ["o-a", "o-b", "o-c"] },
};

const item = (id: string, priceSar = 10): MenuItem => ({
  id,
  categoryId: id.split("-").slice(0, 2).join("-"),
  name: id,
  description: "",
  priceSar,
  imageUrl: "",
  available: true,
  availableFor: ["dine_in"],
  inStock: true,
  modifierGroups: [
    {
      id: "m1",
      label: "Size",
      required: false,
      multiple: false,
      options: [
        { id: "m1-0", label: "S", priceDeltaSar: 0 },
        { id: "m1-1", label: "M", priceDeltaSar: 2 },
        { id: "m1-2", label: "L", priceDeltaSar: 4 },
      ],
    },
  ],
});

const menu: Menu = { categories: [], items: [item("cat-1-i1"), item("cat-2-i1"), item("cat-1-i2"), item("cat-1-i3")] };

const line = (over: Partial<OrderLine>): OrderLine => ({
  lineId: "l1",
  menuItemId: "cat-1-i1",
  name: "x",
  unitPriceSar: 10,
  quantity: 1,
  modifiers: [],
  notes: "",
  ...over,
});

describe("refs", () => {
  it("reads the menu ref out of a storefront item id, wherever the item is listed", () => {
    expect(itemRefOf("cat-1-i1")).toBe("i1");
    expect(itemRefOf("cat-12-i40")).toBe("i40");
  });
  it("maps an option by its position in the group", () => {
    expect(optionIdOf(ordering, "m1", "m1-2")).toBe("o-c");
    expect(optionIdOf(ordering, "m1", "m1-9")).toBeNull();
    expect(optionIdOf(ordering, "mX", "mX-0")).toBeNull();
  });
});

describe("orderableMenu", () => {
  it("marks items the order cannot carry as not in stock", () => {
    const out = orderableMenu(menu, ordering);
    expect(out.items.find((i) => i.id === "cat-1-i3")?.inStock).toBe(false);
    expect(out.items.find((i) => i.id === "cat-2-i1")?.inStock).toBe(true);
  });
  it("makes the whole menu browse-only when ordering is off", () => {
    expect(orderableMenu(menu, null).items.every((i) => i.inStock === false)).toBe(true);
  });
});

describe("toScanLines", () => {
  it("sends entry ids, option ids and notes", () => {
    const out = toScanLines(
      [
        line({
          menuItemId: "cat-2-i1",
          quantity: 2,
          notes: " no ice ",
          modifiers: [{ groupId: "m1", optionId: "m1-1", label: "M", priceDeltaSar: 2 }],
        }),
      ],
      ordering
    );
    expect(out).toEqual({ lines: [{ entryId: "e-1", quantity: 2, optionIds: ["o-b"], note: "no ice" }], unknown: [] });
  });
  it("reports lines it cannot send instead of guessing", () => {
    const out = toScanLines([line({ lineId: "bad", menuItemId: "cat-1-i3" })], ordering);
    expect(out.lines).toEqual([]);
    expect(out.unknown).toEqual(["bad"]);
  });
});

describe("remapCart — a republish renumbers the menu's refs", () => {
  // Old menu: i1 = Tea (e-1), i2 = Coffee (e-2); options of m1 = [o-a, o-b, o-c].
  // New menu: a dish was added first, so Tea is i2, Coffee is i3, and m1's options are reordered.
  // The new menu describes m1's options in their new order: [L, S, M].
  const reordered = (id: string, priceSar: number): MenuItem => ({
    ...item(id, priceSar),
    modifierGroups: [
      {
        id: "m1",
        label: "Size",
        required: false,
        multiple: false,
        options: [
          { id: "m1-0", label: "L", priceDeltaSar: 4 },
          { id: "m1-1", label: "S", priceDeltaSar: 0 },
          { id: "m1-2", label: "M", priceDeltaSar: 2 },
        ],
      },
    ],
  });
  const newMenu: Menu = { categories: [], items: [reordered("cat-1-i1", 30), reordered("cat-1-i2", 10), reordered("cat-1-i3", 12)] };
  const newOrdering: PlaceOrdering = {
    basis: "b2",
    items: { i1: "e-new", i2: "e-1", i3: "e-2" },
    optionGroups: { m1: ["o-c", "o-a", "o-b"] },
  };

  it("follows each line to its dish and options by their stable ids, not by position", () => {
    const r = remapCart(
      [
        line({ lineId: "tea", menuItemId: "cat-1-i1", modifiers: [{ groupId: "m1", optionId: "m1-1", label: "M", priceDeltaSar: 2 }] }),
        line({ lineId: "coffee", menuItemId: "cat-2-i2", unitPriceSar: 10 }),
      ],
      ordering,
      newMenu,
      newOrdering
    );
    expect(r.dropped).toEqual([]);
    const tea = r.keep.find((l) => l.lineId === "tea")!;
    expect(tea.menuItemId).toBe("cat-1-i2");
    expect(tea.modifiers[0].optionId).toBe("m1-2"); // o-b now sits third
    const coffee = r.keep.find((l) => l.lineId === "coffee")!;
    expect(coffee.menuItemId).toBe("cat-1-i3");
    expect(coffee.unitPriceSar).toBe(12);
    expect(r.repriced.map((l) => l.lineId)).toEqual(["coffee"]);
    // What is sent is the same dish and option as before the republish.
    expect(toScanLines(r.keep, newOrdering).lines).toEqual([
      { entryId: "e-1", quantity: 1, optionIds: ["o-b"] },
      { entryId: "e-2", quantity: 1 },
    ]);
  });

  it("drops a line whose dish or option no longer exists", () => {
    const gone: PlaceOrdering = { basis: "b3", items: { i1: "e-1" }, optionGroups: { m1: ["o-a"] } };
    const menu3: Menu = { categories: [], items: [item("cat-1-i1")] };
    const r = remapCart(
      [
        line({ lineId: "coffee", menuItemId: "cat-1-i2" }),
        line({ lineId: "large-tea", menuItemId: "cat-1-i1", modifiers: [{ groupId: "m1", optionId: "m1-2", label: "L", priceDeltaSar: 4 }] }),
        line({ lineId: "tea", menuItemId: "cat-1-i1" }),
      ],
      ordering,
      menu3,
      gone
    );
    expect(r.dropped.map((l) => l.lineId)).toEqual(["coffee", "large-tea"]);
    expect(r.keep.map((l) => l.lineId)).toEqual(["tea"]);
  });

  it("drops everything when ordering is off now, and keeps everything when nothing changed", () => {
    expect(remapCart([line({})], ordering, menu, null).dropped).toHaveLength(1);
    expect(remapCart([line({})], ordering, menu, ordering).keep).toHaveLength(1);
  });
});

describe("idempotency", () => {
  it("keeps the key for the same cart and makes a new one for a changed cart", () => {
    let n = 0;
    const mk = () => `k${++n}`;
    const s1 = cartSignature([line({})]);
    const first = idempotencyKeyFor(s1, null, mk);
    expect(idempotencyKeyFor(s1, first, mk).key).toBe(first.key);
    const s2 = cartSignature([line({ quantity: 2 })]);
    expect(idempotencyKeyFor(s2, first, mk).key).not.toBe(first.key);
  });
});

describe("placeProblemOf", () => {
  it("maps the backend's answers", () => {
    expect(placeProblemOf(404, "order.intake.not-found")).toBe("closed");
    expect(placeProblemOf(409, "order.intake.unavailable")).toBe("closed");
    expect(placeProblemOf(409, "order.intake.basis-changed")).toBe("basisChanged");
    expect(placeProblemOf(429, "order.intake.too-many-pending")).toBe("tooManyPending");
    expect(placeProblemOf(429, "rate.limited")).toBe("rateLimited");
    expect(placeProblemOf(422, "validation")).toBe("invalid");
    expect(placeProblemOf(0, undefined)).toBe("network");
    expect(placeProblemOf(500, "x")).toBe("generic");
  });
});
