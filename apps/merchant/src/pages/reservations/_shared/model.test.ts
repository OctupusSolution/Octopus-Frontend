import { describe, expect, it } from "vitest";
import { reservations, TODAY, type Reservation } from "@/shared/api/mock-reservations";
import {
  addDays,
  applyCancel,
  applyDuplicate,
  applyFormSubmit,
  applyShareLink,
  availableTagPresets,
  clock12,
  combinePhone,
  deriveKpis,
  detailState,
  displayState,
  DISPLAY_STATE_OPTIONS,
  durationMinuteOptions,
  EMPTY_FILTERS,
  formatDisplayDate,
  formatTimestamp,
  freshPaymentLink,
  guestsText,
  hoursMinutesParts,
  isPaid,
  nextId,
  nextRef,
  nowTimestampLabel,
  phoneDigitsFrom,
  refundPolicy,
  sourceLabel,
  tableLabel,
  TAG_PRESETS,
  timeSlotOptions,
  visibleRows,
} from "./model";

// A stand-in `t()` for tests that need one — echoes the key back rather
// than a real translation, since these tests only check *which* key was
// picked, not its English/Arabic wording (that's keys.test.ts's job).
const t = (key: string) => key;

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

  it("lets five payment states take over the pill", () => {
    const at = (state: "link-sent" | "expired" | "failed" | "refunded" | "cancelled") =>
      displayState(row({ status: "Confirmed", deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state } }));
    expect(at("link-sent")).toBe("Link Sent");
    expect(at("expired")).toBe("Expired");
    expect(at("failed")).toBe("Failed");
    expect(at("refunded")).toBe("Refunded");
    // Fix round 4, finding 26 — the guest backed out of paying a deposit
    // link; this used to fall through to the bare "Confirmed"/"Pending"
    // pill with no hint the payment was ever abandoned.
    expect(at("cancelled")).toBe("Payment Cancelled");
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

  it("filters on displayState, not the raw status (fix round 4, finding 20)", () => {
    // Every row in this fixture that a user would see with a "Link Sent"
    // pill has status "Pending", not "Confirmed" — filtering by the raw
    // ReservationStatus "Confirmed" could never surface it, and no filter
    // value could reach it at all before this fix.
    const out = visibleRows(reservations, { ...EMPTY_FILTERS, status: "Link Sent" });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.deposit?.state === "link-sent")).toBe(true);

    // A row whose pill reads "Link Sent" must NOT come back from a
    // "Confirmed" filter, even though some Link Sent rows have status
    // "Confirmed" underneath — this is the bug in the finding itself.
    const confirmedFilter = visibleRows(reservations, { ...EMPTY_FILTERS, status: "Confirmed" });
    expect(confirmedFilter.every((r) => r.deposit?.state !== "link-sent")).toBe(true);
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

  // Fix round 4, finding 2 — date-aware: NOW_MINUTES (14:30) has no date of
  // its own, so a same-clock-time comparison against a future-dated
  // reservation used to read as "already started" (0h 0m, No Refund) no
  // matter how far away the actual date was.
  describe("folds whole days into the gap (fix round 4, finding 2)", () => {
    it("is unaffected for a same-day reservation", () => {
      const sameDay = row({ date: TODAY, startMinutes: 21 * 60 }); // 21:00 today
      // 14:30 -> 21:00 is 6h30m, more than the 6h full-refund threshold.
      expect(refundPolicy(sameDay, 14 * 60 + 30).minutesToEvent).toBe(390);
      expect(refundPolicy(sameDay, 14 * 60 + 30).tier).toBe("full");
    });

    it("adds a full day for a reservation tomorrow, even at an earlier clock time", () => {
      const tomorrow = row({ date: addDays(TODAY, 1), startMinutes: 12 * 60 }); // 12:00 tomorrow
      // 14:30 today -> 12:00 tomorrow is 21h30m away, not "already started".
      const policy = refundPolicy(tomorrow, 14 * 60 + 30);
      expect(policy.minutesToEvent).toBe(21 * 60 + 30);
      expect(policy.tier).toBe("full");
    });

    it("adds a full week for a reservation seven days out", () => {
      const nextWeek = row({ date: addDays(TODAY, 7), startMinutes: 19 * 60 });
      const policy = refundPolicy(nextWeek, 14 * 60 + 30);
      expect(policy.minutesToEvent).toBe(7 * 24 * 60 + 4 * 60 + 30);
      expect(policy.tier).toBe("full");
    });
  });
});

describe("hoursMinutesParts", () => {
  it("splits an exact number of hours", () => {
    expect(hoursMinutesParts(300)).toEqual({ h: 5, m: 0 });
  });
  it("splits hours with a remainder", () => {
    expect(hoursMinutesParts(625)).toEqual({ h: 10, m: 25 });
  });
  it("handles zero", () => {
    expect(hoursMinutesParts(0)).toEqual({ h: 0, m: 0 });
  });
  it("clamps a negative gap (event already started) to zero", () => {
    expect(hoursMinutesParts(-45)).toEqual({ h: 0, m: 0 });
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

  it("falls back to confirmed/progressed/no-show/pending off the reservation's own status when the deposit is quiet", () => {
    expect(detailState(row({ status: "Confirmed" }))).toBe("confirmed");
    expect(detailState(row({ status: "Pending" }))).toBe("pending");
    // Fix round 4, finding 5 — Arrived/Seated/Completed/No-show used to
    // fall into "pending" here (this exact assertion used to read
    // `.toBe("pending")` for Seated, which is the bug findings called
    // out by number — a Seated guest with a quiet deposit showed
    // "Pending (Deposit Required)" and a Share Link button).
    expect(detailState(row({ status: "Arrived" }))).toBe("progressed");
    expect(detailState(row({ status: "Seated" }))).toBe("progressed");
    expect(detailState(row({ status: "Completed" }))).toBe("progressed");
    expect(detailState(row({ status: "No-show" }))).toBe("no-show");
    expect(
      detailState(row({ status: "Confirmed", deposit: { amount: 100, currency: "SAR", type: "Pre Reservation", state: "unpaid" } }))
    ).toBe("confirmed");
    expect(
      detailState(row({ status: "Pending", deposit: { amount: 100, currency: "SAR", type: "Pre Reservation", state: "unpaid" } }))
    ).toBe("pending");
  });

  it("still lets an active deposit flow win over Arrived/Seated/Completed/No-show", () => {
    // Same precedence the four-state test above already asserts for
    // "paid"/"Arrived" — extending it to the other three progressed-ish
    // statuses plus No-show, so a deposit flow never gets masked by the
    // new progressed/no-show fallback.
    const at = (status: Reservation["status"]) =>
      detailState(row({ status, deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state: "link-sent" } }));
    expect(at("Seated")).toBe("link-sent");
    expect(at("Completed")).toBe("link-sent");
    expect(at("No-show")).toBe("link-sent");
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

describe("formatTimestamp / nowTimestampLabel", () => {
  it("formats a date + minutes into the fixture's own timestamp shape", () => {
    expect(formatTimestamp("2026-08-08", 14 * 60 + 30)).toBe("Aug 8, 2026 - 2:30 PM");
  });

  it("pads no leading zero onto the day", () => {
    expect(formatTimestamp("2026-01-05", 0)).toBe("Jan 5, 2026 - 12:00 AM");
  });

  it("stamps the module's fixed now (TODAY at 14:30)", () => {
    expect(nowTimestampLabel()).toBe(`${formatTimestamp(TODAY, 14 * 60 + 30)}`);
  });
});

describe("addDays", () => {
  it("advances the date by the given number of days", () => {
    expect(addDays("2026-08-08", 1)).toBe("2026-08-09");
  });

  it("rolls over a month boundary", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
  });
});

describe("freshPaymentLink", () => {
  it("addresses WhatsApp/phone by default when no channel was recorded", () => {
    const link = freshPaymentLink(row({ ref: "RSV-9000", phone: "+966510002877" }));
    expect(link).toMatchObject({
      url: "https://pay.octopus.app/r/RSV-9000",
      sentVia: "WhatsApp",
      sentTo: "+966510002877",
    });
    expect(link.sentOn).toBe(nowTimestampLabel());
    expect(link.expiresOn).toBe(formatTimestamp(addDays(TODAY, 1), 14 * 60 + 30));
  });

  it("addresses the guest's email when Email was the recorded channel", () => {
    const link = freshPaymentLink(row({ email: "guest@example.com", sendLinkChannels: ["Email"] }));
    expect(link).toMatchObject({ sentVia: "Email", sentTo: "guest@example.com" });
  });

  it("falls back to the phone for Email when no email is on file", () => {
    const link = freshPaymentLink(row({ sendLinkChannels: ["Email"] }));
    expect(link.sentTo).toBe(row().phone);
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

describe("guestsText (fix round 4, finding 25)", () => {
  it("has a singular form for 1", () => {
    expect(guestsText(t, 1)).toBe("reservations.list.row.guestOne");
  });

  it("has its own dual form for 2, distinct from the general plural", () => {
    // Arabic's dual ("ضيفان") is grammatically wrong if formed off the
    // general "{n} ضيوف" template — this needs its own key, not
    // guests.replace("{n}", "2").
    expect(guestsText(t, 2)).toBe("reservations.list.row.guestsTwo");
  });

  it("falls back to the general {n} template for everything else", () => {
    expect(guestsText(t, 3)).toBe("reservations.list.row.guests");
    expect(guestsText(t, 0)).toBe("reservations.list.row.guests");
  });
});

describe("sourceLabel", () => {
  it("maps every source to its key", () => {
    expect(sourceLabel(t, "Direct Booking")).toBe("reservations.source.directBooking");
    expect(sourceLabel(t, "Walk In")).toBe("reservations.source.walkIn");
    expect(sourceLabel(t, "Instagram")).toBe("reservations.source.instagram");
  });
});

describe("durationMinuteOptions (fix round 4, finding 11)", () => {
  it("offers the frame's four whole-hour slots when nothing off-grid is given", () => {
    expect(durationMinuteOptions()).toEqual([60, 120, 180, 240]);
  });

  it("folds in an off-grid current duration so it's never lost", () => {
    // Nine fixture rows are 90-minute bookings — rounding this away is
    // exactly the bug the finding describes.
    expect(durationMinuteOptions(90)).toEqual([60, 90, 120, 180, 240]);
  });

  it("does not duplicate a current value that's already on the grid", () => {
    expect(durationMinuteOptions(120)).toEqual([60, 120, 180, 240]);
  });
});

describe("DISPLAY_STATE_OPTIONS", () => {
  it("covers every value displayState() can return", () => {
    // Cheap guard against the two staying in sync only by accident.
    expect(DISPLAY_STATE_OPTIONS).toContain("Link Sent");
    expect(DISPLAY_STATE_OPTIONS).toContain("Payment Cancelled");
    expect(DISPLAY_STATE_OPTIONS).toHaveLength(12);
  });
});

describe("formatDisplayDate", () => {
  it("formats a date without a weekday, latn digits regardless of locale", () => {
    expect(formatDisplayDate("2026-08-08", "en")).toBe("Aug 8, 2026");
  });
});

/* ========================================================== Final fix wave */
// Tests for the reducers extracted out of index.tsx's closures (fix round
// 4, task A) — every one is a plain (rows, ...) => Reservation[] function
// now, so these exercise the exact bugs findings 1, 3 and 10 described
// without mounting the page.

describe("nextRef / nextId", () => {
  it("scans the highest existing ref/id and increments", () => {
    const rows = [row({ id: "new-2", ref: "RSV-1050" }), row({ id: "new-5", ref: "RSV-1099" })];
    expect(nextRef(rows)).toBe("RSV-1100");
    expect(nextId(rows)).toBe("new-6");
  });

  it("ignores ids/refs that don't match its own shape", () => {
    const rows = [row({ id: "res-041", ref: "RSV-1041" })];
    expect(nextId(rows)).toBe("new-1");
    expect(nextRef(rows)).toBe("RSV-1042");
  });
});

describe("applyFormSubmit", () => {
  const draft = row({ id: "", ref: "", status: "Confirmed" });

  it("add: inserts a new row with a fresh id/ref and status from intent", () => {
    const out = applyFormSubmit([row({ id: "a", ref: "RSV-1" })], draft, "confirm", "add", null);
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ id: "new-1", ref: "RSV-2", status: "Confirmed" });
  });

  it("add: 'pending' intent produces a Pending row even if the draft says otherwise", () => {
    const out = applyFormSubmit([], { ...draft, status: "Confirmed" }, "pending", "add", null);
    expect(out[0].status).toBe("Pending");
  });

  it("edit: preserves the row's existing status regardless of intent — this is finding 1", () => {
    const seated = row({ id: "a", ref: "RSV-1", status: "Seated" });
    // The edit form only ever submits intent "confirm" — this used to
    // recompute status from intent even in edit mode, reverting a Seated
    // booking back to Confirmed.
    const out = applyFormSubmit([seated], { ...draft, status: "Confirmed" }, "confirm", "edit", "a");
    expect(out[0].status).toBe("Seated");
  });

  it("edit: a Cancelled reservation is not resurrected by editing it", () => {
    // RSV-1047's exact case: Cancelled, with cancelledAt/cancelReason set,
    // whose detail dialog's only button is "Edit Reservation".
    const cancelled = row({
      id: "a", ref: "RSV-1047", status: "Cancelled",
      cancelledAt: "Aug 7, 2026 - 5:30 PM", cancelReason: "Guest requested cancellation",
    });
    const out = applyFormSubmit([cancelled], { ...draft, status: "Confirmed" }, "confirm", "edit", "a");
    expect(out[0].status).toBe("Cancelled");
    // Still carries its cancellation record — nothing about this path
    // clears it, since the status never actually changed.
    expect(out[0].cancelledAt).toBe("Aug 7, 2026 - 5:30 PM");
    expect(out[0].cancelReason).toBe("Guest requested cancellation");
  });

  it("edit: keeps the row's own id/ref, not whatever the draft carries", () => {
    const existing = row({ id: "a", ref: "RSV-1041", status: "Pending" });
    const out = applyFormSubmit([existing], { ...draft, id: "ignored", ref: "ignored" }, "confirm", "edit", "a");
    expect(out[0]).toMatchObject({ id: "a", ref: "RSV-1041" });
  });
});

describe("applyCancel", () => {
  const payload = (over: Partial<{ actionType: "guest" | "restaurant" | "no-show"; reason: string; note: string }> = {}) => ({
    actionType: "guest" as const,
    reason: "Change of plans",
    note: "",
    ...over,
  });

  it("guest/restaurant: cancels, stamps cancelledAt, and appends the note to the reason (fix round 4, finding 3)", () => {
    const r = row({ id: "a", startMinutes: 19 * 60 }); // 19:00, > 6h after NOW_MINUTES (14:30)
    const out = applyCancel([r], "a", payload({ note: "Guest called to reschedule." }));
    expect(out[0].status).toBe("Cancelled");
    expect(out[0].cancelledAt).toBeTruthy();
    expect(out[0].cancelReason).toBe("Change of plans — Guest called to reschedule.");
  });

  it("guest/restaurant: leaves the reason bare when no note was entered", () => {
    const r = row({ id: "a" });
    const out = applyCancel([r], "a", payload({ note: "" }));
    expect(out[0].cancelReason).toBe("Change of plans");
  });

  it("refunds the deposit only when the refund tier is full or partial", () => {
    const farOut = row({ id: "a", startMinutes: 21 * 60, deposit: { amount: 100, currency: "SAR", type: "Pre Reservation", state: "paid" } }); // 6.5h out -> full refund
    expect(applyCancel([farOut], "a", payload())[0].deposit?.state).toBe("refunded");

    const alreadyStarted = row({ id: "a", startMinutes: 14 * 60, deposit: { amount: 100, currency: "SAR", type: "Pre Reservation", state: "paid" } }); // tier "none"
    expect(applyCancel([alreadyStarted], "a", payload())[0].deposit?.state).toBe("paid");
  });

  it("never invents a deposit to refund when there wasn't one", () => {
    const noDeposit = row({ id: "a", startMinutes: 19 * 60 });
    expect(applyCancel([noDeposit], "a", payload())[0].deposit).toBeUndefined();
  });

  it("no-show: sets status to No-show, is not a cancellation, and records the reason/note instead of discarding them (fix round 4, finding 3)", () => {
    const r = row({
      id: "a", status: "Confirmed",
      deposit: { amount: 100, currency: "SAR", type: "Pre Reservation", state: "paid" },
    });
    const out = applyCancel([r], "a", payload({ actionType: "no-show", reason: "Other", note: "No call, no show." }));
    expect(out[0].status).toBe("No-show");
    expect(out[0].cancelReason).toBe("Other — No call, no show.");
    // The deposit is untouched — no-show never refunds.
    expect(out[0].deposit?.state).toBe("paid");
    expect(out[0].cancelledAt).toBeUndefined();
  });
});

describe("applyShareLink", () => {
  it("stamps a fresh link and moves the deposit to link-sent", () => {
    const r = row({ id: "a", deposit: { amount: 100, currency: "SAR", type: "Pre Reservation", state: "unpaid" } });
    const out = applyShareLink([r], "a");
    expect(out[0].deposit?.state).toBe("link-sent");
    expect(out[0].paymentLink?.url).toContain(r.ref);
  });

  it("is a no-op on a reservation with no deposit", () => {
    const r = row({ id: "a" });
    const out = applyShareLink([r], "a");
    expect(out[0]).toEqual(r);
  });
});

describe("applyDuplicate (fix round 4, finding 10)", () => {
  it("resets status, deposit progress, link and every timestamp", () => {
    const source = row({
      id: "a", ref: "RSV-1041", status: "Completed",
      deposit: { amount: 100, currency: "SAR", type: "Pre Reservation", state: "paid", paidOn: "Aug 6, 2026 - 3:20 PM", method: "mada **** 1236", txnId: "PAY-123654789" },
      paymentLink: { url: "https://pay.octopus.app/r/RSV-1041", sentVia: "WhatsApp", sentTo: "+966...", sentOn: "x", expiresOn: "y" },
      confirmedOn: "Aug 7, 2026 - 10:06 AM", confirmedMethod: "AUTO (Deposit Paid)",
      cancelledAt: "x", cancelReason: "y",
    });
    const out = applyDuplicate([source], "a");
    expect(out).toHaveLength(2);
    const copy = out[1];
    expect(copy.id).not.toBe(source.id);
    expect(copy.ref).not.toBe(source.ref);
    expect(copy.status).toBe("Pending");
    expect(copy.deposit).toMatchObject({ amount: 100, currency: "SAR", type: "Pre Reservation", state: "unpaid" });
    expect(copy.deposit?.paidOn).toBeUndefined();
    expect(copy.deposit?.txnId).toBeUndefined();
    expect(copy.paymentLink).toBeUndefined();
    expect(copy.confirmedOn).toBeUndefined();
    expect(copy.confirmedMethod).toBeUndefined();
    expect(copy.cancelledAt).toBeUndefined();
    expect(copy.cancelReason).toBeUndefined();
  });

  it("inserts the copy directly after the source row", () => {
    const rows = [row({ id: "a" }), row({ id: "b" })];
    const out = applyDuplicate(rows, "a");
    expect(out.map((r) => r.id)).toEqual(["a", "new-1", "b"]);
  });

  it("keeps a reservation with no deposit copy-able without inventing one", () => {
    const source = row({ id: "a", deposit: undefined });
    expect(applyDuplicate([source], "a")[1].deposit).toBeUndefined();
  });
});
