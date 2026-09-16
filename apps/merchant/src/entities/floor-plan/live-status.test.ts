import { describe, expect, it } from "vitest";
import { createTable } from "./model";
import {
  formatDuration,
  liveCounts,
  minutesBetween,
  resolveLiveState,
  simulatedState,
  simulationAnchor,
  walkInCapacity,
  type LiveTableState,
} from "./live-status";

const ANCHOR = simulationAnchor(Date.UTC(2026, 4, 11, 19, 42));

describe("simulatedState", () => {
  it("is stable for the same table", () => {
    const table = createTable("T22", 0, 0);
    expect(simulatedState(table, ANCHOR)).toEqual(simulatedState({ ...table, id: "other" }, ANCHOR));
  });

  it("always reports a blocked table as blocked", () => {
    for (let n = 1; n <= 40; n += 1) {
      expect(simulatedState({ ...createTable(`T${n}`, 0, 0), blocked: true }, ANCHOR).status).toBe("blocked");
    }
  });

  it("never seats more guests than the table holds", () => {
    for (let n = 1; n <= 60; n += 1) {
      const state = simulatedState(createTable(`T${n}`, 0, 0, { seats: 2 }), ANCHOR);
      expect(state.guests).toBeLessThanOrEqual(2);
    }
  });

  it("produces a realistic mix across a floor", () => {
    const counts = liveCounts(Array.from({ length: 80 }, (_, i) => simulatedState(createTable(`T${i + 1}`, 0, 0), ANCHOR)));
    expect(counts.available).toBeGreaterThan(0);
    expect(counts.occupied).toBeGreaterThan(0);
    expect(counts.reserved + counts.cleaning).toBeGreaterThan(0);
  });
});

describe("resolveLiveState", () => {
  const override: LiveTableState = { status: "cleaning", guests: 0, guestName: "", orderId: "", server: "", note: "", since: ANCHOR };

  it("lets a host's change win over the simulation", () => {
    const table = createTable("T1", 0, 0);
    expect(resolveLiveState(table, { [table.id]: override }, ANCHOR).status).toBe("cleaning");
  });

  it("keeps a configured block even with an override", () => {
    const table = { ...createTable("T1", 0, 0), blocked: true };
    expect(resolveLiveState(table, { [table.id]: override }, ANCHOR).status).toBe("blocked");
  });
});

describe("walkInCapacity", () => {
  const state = (status: LiveTableState["status"]): LiveTableState => ({
    status, guests: 0, guestName: "", orderId: "", server: "", note: "", since: ANCHOR,
  });

  it("is the share of walk-in seats that are free", () => {
    const entries = [
      { table: createTable("T1", 0, 0, { seats: 4 }), state: state("available") },
      { table: createTable("T2", 0, 0, { seats: 4 }), state: state("occupied") },
      { table: createTable("T3", 0, 0, { seats: 8, walkIn: false }), state: state("available") },
    ];
    expect(walkInCapacity(entries)).toBe(50);
  });

  it("is zero when no table takes walk-ins", () => {
    expect(walkInCapacity([])).toBe(0);
  });
});

describe("durations", () => {
  it("counts down to a reservation and up from a seating", () => {
    const now = ANCHOR;
    expect(minutesBetween({ ...simulatedState(createTable("T1", 0, 0), now), status: "reserved", since: now + 65 * 60_000 }, now)).toBe(65);
    expect(minutesBetween({ ...simulatedState(createTable("T1", 0, 0), now), status: "occupied", since: now - 30 * 60_000 }, now)).toBe(30);
  });

  it("formats hours with padded minutes", () => {
    expect(formatDuration(65)).toBe("1h 05m");
    expect(formatDuration(42)).toBe("42m");
  });
});
