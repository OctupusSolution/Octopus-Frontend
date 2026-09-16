import { describe, expect, it } from "vitest";
import { sampleLayout, type Booking } from "@/entities/floor-plan";
import { croppedToContent, rankTables, slotAt, tableOptions, toneFor, unavailableReason, type TableOption } from "./table-picking";

const doc = sampleLayout();
const at = slotAt("2026-08-08", 19 * 60);
const option = (number: string, partySize = 4, bookings: Booking[] = []) =>
  tableOptions(doc, { at, partySize }, bookings).find((o) => o.table.number === number)!;

describe("slotAt", () => {
  it("adds the minutes to local midnight of the date", () => {
    const d = new Date(slotAt("2026-08-08", 19 * 60 + 30));
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 7, 8, 19, 30]);
  });
});

describe("tableOptions", () => {
  it("names each table's zone from the floor plan", () => {
    expect(option("T4").zoneName).toBe("Terrace");
    expect(option("T11").zoneName).toBe("Main Dining");
    expect(option("T14").zoneName).toBe("Family Zone");
    expect(option("T26").zoneName).toBe("VIP Area");
  });

  it("marks a blocked table blocked, whatever the party", () => {
    expect(option("T7").availability).toBe("blocked");
  });

  it("marks a table too small when the party outgrows it", () => {
    expect(option("T4", 8).availability).toBe("tooSmall");
  });

  it("marks a table booked when this slot already holds a booking for it", () => {
    const t20 = option("T20");
    const booking: Booking = { id: "b", tableId: t20.table.id, at, partySize: 2, guestName: "X", createdAt: 0 };
    expect(option("T20", 4, [booking]).availability).toBe("booked");
  });
});

describe("toneFor", () => {
  const base = (availability: TableOption["availability"]): TableOption => ({ ...option("T20"), availability });

  it("draws each availability in the floor plan's palette", () => {
    expect(toneFor(base("available"))).toBe("available");
    expect(toneFor(base("booked"))).toBe("reserved");
    expect(toneFor(base("blocked"))).toBe("blocked");
    expect(toneFor(base("notReservable"))).toBe("blocked");
    expect(toneFor(base("tooSmall"))).toBe("blocked");
    expect(toneFor(base("largePartyOnly"))).toBe("blocked");
  });

  it("lets a live occupied or cleaning state win when the booking is near", () => {
    expect(toneFor(base("available"), "occupied")).toBe("occupied");
    expect(toneFor(base("available"), "cleaning")).toBe("cleaning");
    expect(toneFor(base("available"), "reserved")).toBe("available");
  });

  it("never lets a live state unblock a table that can't take the party", () => {
    expect(toneFor(base("tooSmall"), "occupied")).toBe("blocked");
  });

  it("explains an unavailable table by its live state first", () => {
    expect(unavailableReason(base("available"), "occupied")).toBe("occupied");
    expect(unavailableReason(base("tooSmall"), "blocked")).toBe("tooSmall");
  });
});

describe("rankTables", () => {
  const make = (id: string, seats: number, zoneId: string | null, availability: TableOption["availability"] = "available"): TableOption => ({
    table: { ...option("T20").table, id, number: id, seats },
    availability,
    zoneId,
    zoneName: zoneId,
  });

  it("prefers the guest's area, then the snuggest fit, then the number", () => {
    const ranked = rankTables(
      [make("T9", 8, "other"), make("T2", 6, "main"), make("T1", 4, "main"), make("T3", 4, "main")],
      { partySize: 4, preferredZoneId: "main" }
    );
    expect(ranked.map((o) => o.table.id)).toEqual(["T1", "T3", "T2", "T9"]);
  });

  it("drops unavailable tables and the one already chosen", () => {
    const ranked = rankTables(
      [make("T1", 4, "main"), make("T2", 4, "main", "booked"), make("T3", 4, "main")],
      { partySize: 4, preferredZoneId: "main", excludeId: "T1" }
    );
    expect(ranked.map((o) => o.table.id)).toEqual(["T3"]);
  });
});

describe("croppedToContent", () => {
  it("shrinks the canvas to the drawing without moving anything", () => {
    const cropped = croppedToContent(doc);
    expect(cropped.width).toBeLessThanOrEqual(doc.width);
    expect(cropped.height).toBeLessThanOrEqual(doc.height);
    expect(cropped.tables).toBe(doc.tables);
  });
});
