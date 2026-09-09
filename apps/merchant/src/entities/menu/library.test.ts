import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  deleteMenu,
  duplicateMenu,
  fallbackCandidates,
  filterMenus,
  setMenuSchedule,
  setMenuStatus,
} from "./library";
import { WEEKDAYS, type Menu, type MenuStatus } from "./menu";

const NOW = "2026-09-09T12:00:00.000Z";

function make(id: string, name: string, status: MenuStatus, updatedAt: string, branchId = "jeddah"): Menu {
  return {
    id,
    name,
    cover: null,
    status,
    branchId,
    sections: [],
    theme: {
      presetId: "elegant",
      navStyle: "top-bar",
      categoryStyle: "icon-text",
      cardStyle: "classic",
      itemDetails: "same-page",
      stickyAddToCart: true,
      showItemTags: true,
    },
    schedule: {
      type: "all-day",
      start: "00:00",
      end: "23:59",
      days: [...WEEKDAYS],
      timezone: "Asia/Riyadh",
      branchIds: [branchId],
      fallbackMenuId: null,
      allowPreorderOutsideSchedule: false,
    },
    channels: { pos: "live", publicLink: "live", tableQr: "live" },
    updatedAt,
    publishedAt: null,
    version: 1,
  };
}

const LIBRARY: Menu[] = [
  make("a", "All Day Menu", "active", "2026-05-12T10:30:00.000Z"),
  make("b", "Breakfast Menu", "active", "2026-05-14T10:30:00.000Z"),
  make("c", "Ramadan Menu", "scheduled", "2026-05-10T10:30:00.000Z"),
  make("d", "Adha Eid Menu", "archived", "2026-05-16T10:30:00.000Z"),
  make("e", "Riyadh Lunch", "active", "2026-05-11T10:30:00.000Z", "riyadh"),
];

describe("filterMenus", () => {
  it("hides archived menus by default", () => {
    const ids = filterMenus(LIBRARY, DEFAULT_FILTERS).map((m) => m.id);
    expect(ids).not.toContain("d");
  });

  it("shows archived menus when asked", () => {
    const ids = filterMenus(LIBRARY, { ...DEFAULT_FILTERS, includeArchived: true }).map((m) => m.id);
    expect(ids).toContain("d");
  });

  it("sorts most recently updated first by default", () => {
    const ids = filterMenus(LIBRARY, DEFAULT_FILTERS).map((m) => m.id);
    expect(ids).toEqual(["b", "a", "e", "c"]);
  });

  it("sorts by name when asked", () => {
    const names = filterMenus(LIBRARY, { ...DEFAULT_FILTERS, sort: "name" }).map((m) => m.name);
    expect(names).toEqual(["All Day Menu", "Breakfast Menu", "Ramadan Menu", "Riyadh Lunch"]);
  });

  it("matches the search query case-insensitively", () => {
    const ids = filterMenus(LIBRARY, { ...DEFAULT_FILTERS, query: "ramadan" }).map((m) => m.id);
    expect(ids).toEqual(["c"]);
  });

  it("ignores surrounding whitespace in the query", () => {
    const ids = filterMenus(LIBRARY, { ...DEFAULT_FILTERS, query: "  breakfast  " }).map((m) => m.id);
    expect(ids).toEqual(["b"]);
  });

  it("narrows to one area", () => {
    const ids = filterMenus(LIBRARY, { ...DEFAULT_FILTERS, area: "riyadh" }).map((m) => m.id);
    expect(ids).toEqual(["e"]);
  });

  it("narrows to menus live on one channel", () => {
    const held = setMenuStatus(LIBRARY, "a", "on-hold", NOW);
    const ids = filterMenus(held, { ...DEFAULT_FILTERS, channel: "pos" }).map((m) => m.id);
    expect(ids).not.toContain("a");
    expect(ids).toContain("b");
  });
});

describe("setMenuStatus", () => {
  it("cascades the new status onto every channel", () => {
    const next = setMenuStatus(LIBRARY, "a", "on-hold", NOW);
    const menu = next.find((m) => m.id === "a")!;
    expect(menu.status).toBe("on-hold");
    expect(menu.channels).toEqual({ pos: "on-hold", publicLink: "on-hold", tableQr: "on-hold" });
  });

  it("renders channels as Live when the menu goes active", () => {
    const held = setMenuStatus(LIBRARY, "c", "on-hold", NOW);
    const resumed = setMenuStatus(held, "c", "active", NOW);
    expect(resumed.find((m) => m.id === "c")!.channels.pos).toBe("live");
  });

  it("stamps updatedAt", () => {
    const next = setMenuStatus(LIBRARY, "a", "on-hold", NOW);
    expect(next.find((m) => m.id === "a")!.updatedAt).toBe(NOW);
  });

  it("leaves every other menu untouched", () => {
    const next = setMenuStatus(LIBRARY, "a", "on-hold", NOW);
    expect(next.find((m) => m.id === "b")).toEqual(LIBRARY.find((m) => m.id === "b"));
  });
});

describe("duplicateMenu", () => {
  it("inserts the copy directly after its original", () => {
    const next = duplicateMenu(LIBRARY, "a", "a-copy", NOW);
    expect(next.map((m) => m.id)).toEqual(["a", "a-copy", "b", "c", "d", "e"]);
  });

  it("names the copy and marks it unpublished", () => {
    const copy = duplicateMenu(LIBRARY, "a", "a-copy", NOW).find((m) => m.id === "a-copy")!;
    expect(copy.name).toBe("All Day Menu (Copy)");
    expect(copy.status).toBe("pending");
    expect(copy.publishedAt).toBeNull();
    expect(copy.version).toBe(1);
    expect(copy.updatedAt).toBe(NOW);
  });

  it("does not share section arrays with the original", () => {
    const source = [{ ...LIBRARY[0], sections: [
      { id: "s1", kind: "items" as const, name: "Breakfast", image: null, description: "",
        visibility: "visible" as const, displayStyle: "list" as const, color: null, entries: [] },
    ] }];
    const next = duplicateMenu(source, "a", "a-copy", NOW);
    expect(next[1].sections).not.toBe(next[0].sections);
  });

  it("returns the library unchanged for an unknown id", () => {
    expect(duplicateMenu(LIBRARY, "nope", "x", NOW)).toEqual(LIBRARY);
  });
});

describe("deleteMenu", () => {
  it("removes just that menu", () => {
    expect(deleteMenu(LIBRARY, "c").map((m) => m.id)).toEqual(["a", "b", "d", "e"]);
  });
});

describe("setMenuSchedule", () => {
  it("replaces the schedule and stamps updatedAt", () => {
    const next = setMenuSchedule(LIBRARY, "a", { ...LIBRARY[0].schedule, type: "lunch", start: "10:00", end: "12:00" }, NOW);
    const menu = next.find((m) => m.id === "a")!;
    expect(menu.schedule.type).toBe("lunch");
    expect(menu.schedule.start).toBe("10:00");
    expect(menu.updatedAt).toBe(NOW);
  });
});

describe("fallbackCandidates", () => {
  it("never offers the menu being scheduled as its own fallback", () => {
    expect(fallbackCandidates(LIBRARY, "a").map((m) => m.id)).not.toContain("a");
  });

  it("omits archived menus", () => {
    expect(fallbackCandidates(LIBRARY, "a").map((m) => m.id)).not.toContain("d");
  });
});
