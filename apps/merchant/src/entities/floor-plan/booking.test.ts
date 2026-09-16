import { describe, expect, it } from "vitest";
import {
  FIRST_SLOT_HOUR,
  LARGE_PARTY_MIN,
  LAST_SLOT_HOUR,
  SLOT_MINUTES,
  availabilitySummary,
  bookingAt,
  createBooking,
  defaultSlot,
  roundToSlot,
  sameSlot,
  simulatedBooked,
  slotsForDay,
  tableAvailability,
} from "./booking";
import { createTable } from "./model";

const DAY = new Date(2026, 8, 12, 19, 40).getTime();

describe("slots", () => {
  it("rounds down to the half hour", () => {
    expect(new Date(roundToSlot(DAY)).getMinutes()).toBe(30);
    expect(sameSlot(DAY, DAY + 5 * 60_000)).toBe(true);
    expect(sameSlot(DAY, DAY + SLOT_MINUTES * 60_000)).toBe(false);
  });

  it("covers the service window", () => {
    const slots = slotsForDay(DAY);
    expect(new Date(slots[0]).getHours()).toBe(FIRST_SLOT_HOUR);
    expect(new Date(slots[slots.length - 1]).getHours()).toBe(LAST_SLOT_HOUR);
    expect(slots).toHaveLength((LAST_SLOT_HOUR - FIRST_SLOT_HOUR + 1) * (60 / SLOT_MINUTES));
  });

  it("defaults to the next slot still to come", () => {
    expect(defaultSlot(DAY)).toBeGreaterThanOrEqual(DAY);
    // Once service has closed, the next slot is tomorrow's first — never a
    // time that has already passed.
    const afterClose = new Date(2026, 8, 12, 23, 59).getTime();
    const next = defaultSlot(afterClose);
    expect(next).toBeGreaterThan(afterClose);
    expect(new Date(next).getHours()).toBe(FIRST_SLOT_HOUR);
    expect(new Date(next).getDate()).toBe(13);
  });
});

describe("tableAvailability", () => {
  const query = { at: DAY, partySize: 4 };

  it("refuses blocked and non-reservable tables", () => {
    expect(tableAvailability({ ...createTable("T1", 0, 0), blocked: true }, query)).toBe("blocked");
    expect(tableAvailability({ ...createTable("T1", 0, 0), reservable: false }, query)).toBe("notReservable");
  });

  it("refuses a table with too few seats", () => {
    expect(tableAvailability(createTable("T1", 0, 0, { seats: 2 }), query)).toBe("tooSmall");
  });

  it("keeps large-party tables for large parties", () => {
    const table = createTable("T1", 0, 0, { seats: 10, largePartyOnly: true });
    expect(tableAvailability(table, { at: DAY, partySize: 2 })).toBe("largePartyOnly");
    expect(["available", "booked"]).toContain(tableAvailability(table, { at: DAY, partySize: LARGE_PARTY_MIN }));
  });

  it("is stable for the same table and slot", () => {
    const table = createTable("T7", 0, 0, { seats: 6 });
    expect(tableAvailability(table, query)).toBe(tableAvailability(table, query));
  });

  it("marks a table the host booked as busy for that slot only", () => {
    // A table the simulation leaves free, so the stored booking is what shows.
    const table = [...Array(40)]
      .map((_, i) => createTable(`B${i}`, 0, 0, { seats: 8 }))
      .find((candidate) => !simulatedBooked(candidate, DAY))!;
    const bookings = [createBooking(table.id, DAY, 4, "Reem")];
    expect(tableAvailability(table, query, bookings)).toBe("booked");
    expect(tableAvailability(table, { at: DAY + 60 * 60_000, partySize: 4 }, bookings)).not.toBe("booked");
    expect(bookingAt(table.id, DAY, bookings)?.guestName).toBe("Reem");
  });
});

describe("availabilitySummary", () => {
  it("counts free tables and the seats they offer", () => {
    const entries = [
      { table: createTable("T1", 0, 0, { seats: 4 }), availability: "available" as const },
      { table: createTable("T2", 0, 0, { seats: 6 }), availability: "available" as const },
      { table: createTable("T3", 0, 0, { seats: 2 }), availability: "booked" as const },
    ];
    expect(availabilitySummary(entries)).toEqual({ available: 2, unavailable: 1, seats: 10 });
  });
});
