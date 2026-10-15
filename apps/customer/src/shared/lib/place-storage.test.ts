import { describe, expect, it } from "vitest";
import type { ScanOrderConfirmation } from "./place-order";
import { appendSentOrder, cartStorageKey, readSentOrders, sentOrdersKey } from "./place-storage";

function memory(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

const confirmation = (reference: string): ScanOrderConfirmation => ({
  reference,
  currency: "SAR",
  lines: [{ name: "Tea", quantity: 1, lineTotal: 10 }],
  netTotal: 8.7,
  taxTotal: 1.3,
  grandTotal: 10,
});

describe("place storage", () => {
  it("keeps every table's cart and orders apart", () => {
    expect(cartStorageKey("A")).not.toBe(cartStorageKey("B"));
    expect(sentOrdersKey("A")).not.toBe(sentOrdersKey("B"));
    expect(cartStorageKey("A")).not.toBe(sentOrdersKey("A"));
  });

  it("lists sent orders newest first and keeps at most 20", () => {
    const s = memory();
    for (let i = 1; i <= 22; i++) appendSentOrder(s, "A", confirmation(`R${i}`));
    const list = readSentOrders(s, "A");
    expect(list).toHaveLength(20);
    expect(list[0].reference).toBe("R22");
    expect(readSentOrders(s, "B")).toEqual([]);
  });

  it("reads nothing from a missing, broken or absent storage", () => {
    const s = memory();
    s.setItem(sentOrdersKey("A"), "{not json");
    expect(readSentOrders(s, "A")).toEqual([]);
    expect(readSentOrders(null, "A")).toEqual([]);
    s.setItem(sentOrdersKey("B"), JSON.stringify({ not: "a list" }));
    expect(readSentOrders(s, "B")).toEqual([]);
  });

  it("never throws when the storage refuses to write", () => {
    const full = { ...memory(), getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(() => appendSentOrder(full, "A", confirmation("R1"))).not.toThrow();
    expect(() => appendSentOrder(null, "A", confirmation("R1"))).not.toThrow();
  });
});
