import { describe, expect, it } from "vitest";
import {
  WEEKDAYS,
  channelStateFor,
  entryCount,
  sectionCount,
  type Menu,
  type Section,
} from "./menu";

function section(id: string, entries: number): Section {
  return {
    id,
    kind: "items",
    name: id,
    image: null,
    description: "",
    visibility: "visible",
    displayStyle: "list",
    color: null,
    entries: Array.from({ length: entries }, (_, i) => ({
      id: `${id}-${i}`,
      name: `${id} ${i}`,
      shortName: `${id}${i}`,
      description: "",
      sku: "",
      image: null,
      video: null,
      tags: [],
      status: "active" as const,
      availability: { available: true, delivery: true, takeaway: true, dineIn: true },
      schedule: { mode: "all-day" as const },
      modifierGroups: [],
      pricing: { price: 0, vatRate: 0.15 },
      nutrition: { calories: null, protein: null, carb: null, fat: null },
      allergies: { allergens: [], note: "" },
    })),
  };
}

function menu(sections: Section[]): Menu {
  return {
    id: "m1",
    name: "All Day Menu",
    cover: null,
    status: "active",
    branchId: "jeddah-corniche",
    sections,
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
      branchIds: ["jeddah-corniche"],
      fallbackMenuId: null,
      allowPreorderOutsideSchedule: false,
    },
    channels: { pos: "live", publicLink: "live", tableQr: "live" },
    updatedAt: "2026-05-12T10:30:00.000Z",
    publishedAt: "2026-05-12T09:15:00.000Z",
    version: 2,
  };
}

describe("WEEKDAYS", () => {
  it("runs Sunday first, matching the frame's day selector", () => {
    expect(WEEKDAYS).toEqual(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);
  });
});

describe("channelStateFor", () => {
  it("renders an active menu's channels as Live", () => {
    expect(channelStateFor("active")).toBe("live");
  });

  it("passes every other status through unchanged", () => {
    expect(channelStateFor("scheduled")).toBe("scheduled");
    expect(channelStateFor("on-hold")).toBe("on-hold");
    expect(channelStateFor("expired")).toBe("expired");
    expect(channelStateFor("pending")).toBe("pending");
    expect(channelStateFor("archived")).toBe("archived");
  });
});

describe("counts", () => {
  it("counts sections", () => {
    expect(sectionCount(menu([section("a", 2), section("b", 3)]))).toBe(2);
  });

  it("counts entries across all sections", () => {
    expect(entryCount(menu([section("a", 2), section("b", 3)]))).toBe(5);
  });

  it("counts nothing for a menu with no sections", () => {
    expect(sectionCount(menu([]))).toBe(0);
    expect(entryCount(menu([]))).toBe(0);
  });
});
