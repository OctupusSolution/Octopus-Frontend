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
  reconcileCart,
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

describe("reconcileCart", () => {
  it("drops lines whose item or option vanished and flags a changed price", () => {
    const next: Menu = { categories: [], items: [item("cat-1-i1", 12)] };
    const nextOrdering: PlaceOrdering = { basis: "b2", items: { i1: "e-1" }, optionGroups: { m1: ["o-a"] } };
    const r = reconcileCart(
      [
        line({ lineId: "a" }),
        line({ lineId: "b", menuItemId: "cat-1-i2" }),
        line({ lineId: "c", modifiers: [{ groupId: "m1", optionId: "m1-2", label: "L", priceDeltaSar: 4 }] }),
      ],
      next,
      nextOrdering
    );
    expect(r.keep.map((l) => l.lineId)).toEqual(["a"]);
    expect(r.dropped.map((l) => l.lineId)).toEqual(["b", "c"]);
    expect(r.repriced.map((l) => l.lineId)).toEqual(["a"]);
    expect(r.keep[0].unitPriceSar).toBe(12);
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
