import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  advancedFilterCount,
  computeStats,
  createEntry,
  estimatedSeatingMinutes,
  filterEntries,
  formatJoined,
  markLeft,
  markNotified,
  markSeated,
  moveUp,
  normalizeSaudiMobile,
  percentChange,
  queuePosition,
  seedEntries,
  sortEntries,
  validateGuest,
  type GuestInput,
} from "./model";
import { parseWaitlist } from "./store";

const NOW = new Date(2026, 7, 14, 13, 40).getTime();
const MIN = 60_000;

const input = (over: Partial<GuestInput> = {}): GuestInput => ({
  firstName: "Omar",
  lastName: "Al-Harbi",
  phone: "+966510009999",
  partySize: 4,
  source: "walkIn",
  channel: "whatsapp",
  areaPreference: "Main Dining",
  tablePreference: "",
  note: "",
  ...over,
});

describe("normalizeSaudiMobile", () => {
  it("accepts local, international and spaced forms", () => {
    expect(normalizeSaudiMobile("0510002877")).toBe("+966510002877");
    expect(normalizeSaudiMobile("510002877")).toBe("+966510002877");
    expect(normalizeSaudiMobile("+966 51 000 2877")).toBe("+966510002877");
    expect(normalizeSaudiMobile("00966510002877")).toBe("+966510002877");
  });
  it("rejects landlines and short numbers", () => {
    expect(normalizeSaudiMobile("0112345678")).toBeNull();
    expect(normalizeSaudiMobile("51000")).toBeNull();
  });
});

describe("queue", () => {
  it("numbers only active parties, in rank order", () => {
    const entries = seedEntries(NOW);
    const active = entries.filter((e) => ["waiting", "notified", "onTheWay"].includes(e.status));
    expect(queuePosition(entries, active[0].id)).toBe(1);
    const left = entries.find((e) => e.status === "left")!;
    expect(queuePosition(entries, left.id)).toBeNull();
  });

  it("new guests join at the back with a quote based on who is ahead", () => {
    const entries = seedEntries(NOW);
    const created = createEntry(entries, input(), NOW);
    const next = [...entries, created];
    expect(queuePosition(next, created.id)).toBe(entries.filter((e) => ["waiting", "notified", "onTheWay"].includes(e.status)).length + 1);
    expect(created.history[0].type).toBe("joined");
    expect(created.quotedMin).toBeGreaterThan(5);
  });

  it("moves a party one place up and records it", () => {
    const entries = seedEntries(NOW);
    const second = entries.filter((e) => e.status !== "left" && e.status !== "seated")[1];
    const moved = moveUp(entries, second.id, NOW);
    expect(queuePosition(moved, second.id)).toBe(1);
    expect(moved.find((e) => e.id === second.id)!.history.at(-1)!.type).toBe("movedUp");
  });

  it("leaves the first party where it is", () => {
    const entries = seedEntries(NOW);
    const first = entries[0];
    expect(moveUp(entries, first.id, NOW)).toBe(entries);
  });

  it("has no seating estimate once a party is seated", () => {
    const entries = seedEntries(NOW);
    const seated = markSeated(entries[0], "T12", "Main Dining", NOW);
    expect(estimatedSeatingMinutes([seated, ...entries.slice(1)], seated, NOW)).toBeNull();
  });
});

describe("transitions", () => {
  it("keeps On The Way when a guest is notified again", () => {
    const entry = { ...seedEntries(NOW)[0], status: "onTheWay" as const };
    expect(markNotified(entry, NOW).status).toBe("onTheWay");
  });
  it("stamps when a guest left", () => {
    const left = markLeft(seedEntries(NOW)[1], NOW);
    expect(left.status).toBe("left");
    expect(left.leftAt).toBe(NOW);
  });
});

describe("stats", () => {
  it("counts the live queue and today's outcomes", () => {
    const stats = computeStats(seedEntries(NOW), NOW);
    expect(stats.waitingNow).toBe(8);
    expect(stats.seatedToday).toBe(2);
    expect(stats.leftToday).toBe(2);
    expect(stats.avgWaitMin).toBeGreaterThan(0);
  });
  it("reports percent change to one decimal", () => {
    expect(percentChange(12, 10)).toBe(20);
    expect(percentChange(5, 0)).toBeNull();
  });
});

describe("filter and sort", () => {
  const entries = seedEntries(NOW);
  it("hides seated parties by default", () => {
    expect(filterEntries(entries, DEFAULT_FILTERS).some((e) => e.status === "seated")).toBe(false);
  });
  it("matches phone digits and names", () => {
    expect(filterEntries(entries, { ...DEFAULT_FILTERS, query: "reem" })).toHaveLength(1);
    expect(filterEntries(entries, { ...DEFAULT_FILTERS, query: "0002877" })).toHaveLength(1);
  });
  it("filters by party size bucket and area", () => {
    const big = filterEntries(entries, { ...DEFAULT_FILTERS, partySize: "5-6" });
    expect(big.every((e) => e.partySize >= 5 && e.partySize <= 6)).toBe(true);
    const terrace = filterEntries(entries, { ...DEFAULT_FILTERS, area: "Terrace" });
    expect(terrace.every((e) => e.areaPreference === "Terrace")).toBe(true);
  });
  it("counts changed advanced filters", () => {
    expect(advancedFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(advancedFilterCount({ ...DEFAULT_FILTERS, sources: ["phone"], statuses: ["waiting"] })).toBe(2);
  });
  it("sorts by latest join first", () => {
    const sorted = sortEntries(entries, "joinedLatest", NOW);
    expect(sorted[0].joinedAt).toBeGreaterThanOrEqual(sorted[1].joinedAt);
  });
});

describe("validateGuest", () => {
  const entries = seedEntries(NOW);
  it("requires names, phone and source", () => {
    const errors = validateGuest({ ...input(), firstName: "", lastName: " ", phone: "", source: "" }, entries, null);
    expect(errors).toEqual({ firstName: "required", lastName: "required", phone: "required", source: "required" });
  });
  it("rejects a number already waiting", () => {
    expect(validateGuest(input({ phone: "0510002877" }), entries, null).phone).toBe("duplicate");
    expect(validateGuest(input({ phone: "0510002877" }), entries, entries[0].id).phone).toBeUndefined();
  });
});

describe("formatJoined", () => {
  it("uses the frame's compact English format", () => {
    expect(formatJoined(NOW, "en", "at")).toBe("14AUG2026 at 13:40");
  });
});

describe("parseWaitlist", () => {
  it("round-trips stored entries and drops broken ones", () => {
    const entries = seedEntries(NOW);
    const raw = JSON.stringify({ version: 1, entries: [...entries, { id: 3 }] });
    expect(parseWaitlist(raw)).toEqual(entries);
    expect(parseWaitlist("{")).toBeNull();
  });
  it("keeps elapsed time consistent", () => {
    const entries = seedEntries(NOW);
    expect(NOW - entries[0].joinedAt).toBe(18 * MIN);
  });
});
