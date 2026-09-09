import { describe, expect, it } from "vitest";
import { reservations, TODAY, type Reservation } from "@/shared/api/mock-reservations";
import {
  availableTagPresets,
  clock12,
  combinePhone,
  deriveKpis,
  detailState,
  displayState,
  EMPTY_FILTERS,
  isPaid,
  phoneDigitsFrom,
  refundPolicy,
  tableLabel,
  TAG_PRESETS,
  timeSlotOptions,
  visibleRows,
} from "./model";

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

describe("tableLabel", () => {
  it("formats a T-NN id into a human label", () => {
    expect(tableLabel("T-12")).toBe("Table 12");
  });

  it("strips a leading zero", () => {
    expect(tableLabel("T-02")).toBe("Table 2");
  });

  it("returns anything that isn't T-NN unchanged, rather than throwing", () => {
    expect(tableLabel("Room A")).toBe("Room A");
    expect(tableLabel("")).toBe("");
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

describe("timeSlotOptions", () => {
  it("builds 48 half-hour slots covering the day", () => {
    const opts = timeSlotOptions();
    expect(opts).toHaveLength(48);
    expect(opts[0]).toMatchObject({ value: 0, label: "12:00 AM" });
    expect(opts[opts.length - 1]).toMatchObject({ value: 23 * 60 + 30, label: "11:30 PM" });
  });

  it("folds in an off-grid current value so it's never lost", () => {
    const opts = timeSlotOptions(13 * 60 + 15);
    expect(opts).toHaveLength(49);
    expect(opts.find((o) => o.value === 13 * 60 + 15)).toMatchObject({ label: "1:15 PM" });
    // stays sorted around the inserted slot
    const index = opts.findIndex((o) => o.value === 13 * 60 + 15);
    expect(opts[index - 1].value).toBeLessThan(13 * 60 + 15);
    expect(opts[index + 1].value).toBeGreaterThan(13 * 60 + 15);
  });

  it("does not duplicate a current value that already sits on the grid", () => {
    expect(timeSlotOptions(13 * 60)).toHaveLength(48);
  });
});

describe("availableTagPresets", () => {
  it("returns every preset when none are used", () => {
    expect(availableTagPresets([])).toEqual([...TAG_PRESETS]);
  });

  it("excludes tags already attached", () => {
    expect(availableTagPresets(["Birthday", "VIP"])).toEqual(["Anniversary", "Allergy"]);
  });

  it("is empty once all four presets are used", () => {
    expect(availableTagPresets([...TAG_PRESETS])).toEqual([]);
  });
});

describe("detailState", () => {
  it("maps the four deposit payment states directly, regardless of reservation status", () => {
    const at = (state: "link-sent" | "paid" | "failed" | "expired", status: Reservation["status"] = "Pending") =>
      detailState(row({ status, deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state } }));
    expect(at("link-sent")).toBe("link-sent");
    expect(at("paid", "Arrived")).toBe("paid");
    expect(at("failed")).toBe("failed");
    expect(at("expired")).toBe("expired");
  });

  it("maps a cancelled deposit to payment-cancelled when the reservation itself isn't cancelled", () => {
    expect(
      detailState(row({ status: "Pending", deposit: { amount: 100, currency: "SAR", type: "Pre Reservation", state: "cancelled" } }))
    ).toBe("payment-cancelled");
  });

  it("falls back to confirmed/pending off the reservation's own status when the deposit is quiet", () => {
    expect(detailState(row({ status: "Confirmed" }))).toBe("confirmed");
    expect(detailState(row({ status: "Pending" }))).toBe("pending");
    expect(detailState(row({ status: "Seated" }))).toBe("pending");
    expect(
      detailState(row({ status: "Confirmed", deposit: { amount: 100, currency: "SAR", type: "Pre Reservation", state: "unpaid" } }))
    ).toBe("confirmed");
    expect(
      detailState(row({ status: "Pending", deposit: { amount: 100, currency: "SAR", type: "Pre Reservation", state: "unpaid" } }))
    ).toBe("pending");
  });

  it("lets a cancelled reservation win over any deposit state, mirroring displayState's own precedence (fix round 1)", () => {
    const at = (deposit?: Reservation["deposit"]) => detailState(row({ status: "Cancelled", deposit }));
    // res-047: cancelled with a refunded deposit — this used to fall
    // through to "pending" since "refunded" matches none of the four
    // direct-mapped deposit states, showing a bogus "Deposit Required"
    // panel on an already-cancelled, already-refunded booking.
    expect(at({ amount: 150, currency: "SAR", type: "Per Guest", state: "refunded" })).toBe("cancelled");
    // Even a deposit that's still (or again) "paid" shouldn't reopen a
    // payment-confirmed panel on a reservation that's cancelled.
    expect(at({ amount: 150, currency: "SAR", type: "Per Guest", state: "paid" })).toBe("cancelled");
    // No deposit at all.
    expect(at(undefined)).toBe("cancelled");
  });
});

describe("phone helpers", () => {
  it("strips the +966 prefix", () => {
    expect(phoneDigitsFrom("+966510002877")).toBe("510002877");
  });

  it("leaves a number without the prefix unchanged", () => {
    expect(phoneDigitsFrom("510002877")).toBe("510002877");
  });

  it("re-adds the prefix", () => {
    expect(combinePhone("510002877")).toBe("+966510002877");
  });
});
