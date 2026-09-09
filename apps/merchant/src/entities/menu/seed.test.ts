import { describe, expect, it } from "vitest";
import { SEED_BRANCHES, SEED_MENUS } from "./seed";
import { entryCount, sectionCount } from "./menu";

describe("SEED_MENUS", () => {
  it("seeds the nine menus the frame draws", () => {
    expect(SEED_MENUS).toHaveLength(9);
    expect(SEED_MENUS.map((m) => m.name)).toEqual([
      "All Day Menu",
      "Breakfast Menu",
      "Lunch Menu",
      "Dinner Menu",
      "Ramadan Menu",
      "Kids Menu",
      "May Dinner Menu",
      "Dessert Menu",
      "Adha Eid Menu",
    ]);
  });

  it("covers every status the cards display", () => {
    expect(new Set(SEED_MENUS.map((m) => m.status))).toEqual(
      new Set(["active", "scheduled", "on-hold", "expired", "pending", "archived"]),
    );
  });

  it("reports the frame's counts from real sections and entries", () => {
    for (const menu of SEED_MENUS) {
      expect(sectionCount(menu)).toBe(12);
      expect(entryCount(menu)).toBe(120);
    }
  });

  it("gives every menu channel states consistent with its status", () => {
    for (const menu of SEED_MENUS) {
      const expected = menu.status === "active" ? "live" : menu.status;
      expect(menu.channels.pos, menu.name).toBe(expected);
      expect(menu.channels.publicLink, menu.name).toBe(expected);
    }
  });

  it("uses unique ids", () => {
    expect(new Set(SEED_MENUS.map((m) => m.id)).size).toBe(SEED_MENUS.length);
  });

  it("points every menu at a known branch", () => {
    const ids = new Set(SEED_BRANCHES.map((b) => b.id));
    for (const menu of SEED_MENUS) {
      expect(ids.has(menu.branchId), menu.name).toBe(true);
    }
  });
});
