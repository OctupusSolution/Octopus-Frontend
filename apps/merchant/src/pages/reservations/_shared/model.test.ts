import { describe, expect, it } from "vitest";
import { reservations, TODAY, type Reservation } from "@/shared/api/mock-reservations";
import { clock12, deriveKpis, displayState, EMPTY_FILTERS, isPaid, refundPolicy, visibleRows } from "./model";

function row(over: Partial<Reservation> = {}): Reservation {
  return {
    id: "x", date: TODAY, startMinutes: 19 * 60, durationMinutes: 90,
    ref: "RSV-9000", guest: "Reem Al-Subaie", phone: "+966510002877",
    partySize: 2, area: "Main Dining", table: "T-12", branch: "Riyadh - Olaya",
    source: "Direct Booking", status: "Confirmed", ...over,
  };
}

describe("displayState", () => {
  it("shows the reservation status when the deposit is quiet", () => {
    expect(displayState(row({ status: "Seated" }))).toBe("Seated");
    expect(displayState(row({ status: "Pending", deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state: "unpaid" } }))).toBe("Pending");
    expect(displayState(row({ status: "Confirmed", deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state: "paid" } }))).toBe("Confirmed");
  });

  it("lets four payment states take over the pill", () => {
    const at = (state: "link-sent" | "expired" | "failed" | "refunded") =>
      displayState(row({ status: "Confirmed", deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state } }));
    expect(at("link-sent")).toBe("Link Sent");
    expect(at("expired")).toBe("Expired");
    expect(at("failed")).toBe("Failed");
    expect(at("refunded")).toBe("Refunded");
  });

  it("never lets a payment state hide a cancellation", () => {
    expect(displayState(row({ status: "Cancelled", deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state: "refunded" } }))).toBe("Cancelled");
  });
});

describe("isPaid", () => {
  it("is null when no deposit is required", () => {
    expect(isPaid(row())).toBeNull();
  });
  it("is true only once the money landed", () => {
    expect(isPaid(row({ deposit: { amount: 1, currency: "SAR", type: "Pre Reservation", state: "paid" } }))).toBe(true);
    expect(isPaid(row({ deposit: { amount: 1, currency: "SAR", type: "Pre Reservation", state: "link-sent" } }))).toBe(false);
  });
});

describe("clock12", () => {
  it("formats the frame's times", () => {
    expect(clock12(19 * 60)).toBe("7:00 PM");
    expect(clock12(19 * 60 + 30)).toBe("7:30 PM");
    expect(clock12(23 * 60)).toBe("11:00 PM");
    expect(clock12(12 * 60)).toBe("12:00 PM");
  });
  it("wraps a past-midnight slot back onto the clock", () => {
    expect(clock12(25 * 60)).toBe("1:00 AM");
  });
});

describe("visibleRows", () => {
  const today = reservations.filter((r) => r.date === TODAY);

  it("shows today by default", () => {
    expect(visibleRows(reservations, EMPTY_FILTERS)).toHaveLength(today.length);
  });

  it("narrows by status", () => {
    const out = visibleRows(reservations, { ...EMPTY_FILTERS, status: "Cancelled" });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.status === "Cancelled")).toBe(true);
  });

  it("matches a search against name, phone and ref", () => {
    const target = today[0];
    expect(visibleRows(reservations, { ...EMPTY_FILTERS, query: target.ref }).map((r) => r.id)).toContain(target.id);
    expect(visibleRows(reservations, { ...EMPTY_FILTERS, query: target.guest.slice(0, 4) }).map((r) => r.id)).toContain(target.id);
  });

  it("sorts earliest first by default and latest first on demand", () => {
    const asc = visibleRows(reservations, EMPTY_FILTERS);
    const desc = visibleRows(reservations, { ...EMPTY_FILTERS, sort: "time-desc" });
    expect(asc[0].startMinutes).toBeLessThanOrEqual(asc[asc.length - 1].startMinutes);
    expect(desc[0].startMinutes).toBe(asc[asc.length - 1].startMinutes);
  });
});

describe("deriveKpis", () => {
  it("counts from the rows it is given, not the whole fixture", () => {
    const k = deriveKpis([row({ status: "Confirmed" }), row({ status: "Pending" }), row({ status: "Cancelled" }), row({ status: "No-show" })]);
    expect(k).toMatchObject({ total: 4, confirmed: 1, pending: 1, cancelled: 1, noShow: 1 });
  });

  it("reports each slice as a percentage of the total", () => {
    const k = deriveKpis([row({ status: "Confirmed" }), row({ status: "Confirmed" }), row({ status: "Pending" }), row({ status: "Pending" })]);
    expect(k.confirmedPct).toBe(50);
    expect(k.pendingPct).toBe(50);
  });

  it("does not divide by zero on an empty day", () => {
    expect(deriveKpis([])).toMatchObject({ total: 0, confirmedPct: 0 });
  });
});

describe("refundPolicy", () => {
  const r = row({ startMinutes: 19 * 60 });
  it("refunds in full more than six hours out", () => {
    expect(refundPolicy(r, 12 * 60).tier).toBe("full");
  });
  it("refunds half inside six hours", () => {
    expect(refundPolicy(r, 16 * 60).tier).toBe("partial");
  });
  it("refunds nothing once the slot has started", () => {
    expect(refundPolicy(r, 19 * 60 + 1).tier).toBe("none");
  });
  it("reports the gap in minutes", () => {
    expect(refundPolicy(r, 12 * 60).minutesToEvent).toBe(420);
  });
});
