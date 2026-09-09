import { describe, expect, it } from "vitest";
import { reservations, TODAY, type DepositState, type ReservationStatus } from "./mock-reservations";

const ALL_STATUSES: ReservationStatus[] = [
  "Pending", "Confirmed", "Arrived", "Seated", "Completed", "No-show", "Cancelled",
];
const ALL_DEPOSIT_STATES: DepositState[] = [
  "none", "unpaid", "link-sent", "paid", "expired", "failed", "refunded", "cancelled",
];

describe("reservations fixture", () => {
  it("covers every reservation status today", () => {
    const today = reservations.filter((r) => r.date === TODAY);
    for (const status of ALL_STATUSES) {
      expect(today.some((r) => r.status === status), `missing status ${status}`).toBe(true);
    }
  });

  it("covers every deposit state today", () => {
    const today = reservations.filter((r) => r.date === TODAY);
    for (const state of ALL_DEPOSIT_STATES) {
      const present = today.some((r) => (r.deposit?.state ?? "none") === state);
      expect(present, `missing deposit state ${state}`).toBe(true);
    }
  });

  it("gives every reservation a unique ref", () => {
    const refs = reservations.map((r) => r.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it("gives every reservation an area", () => {
    expect(reservations.every((r) => r.area.length > 0)).toBe(true);
  });

  it("attaches a payment link to every reservation whose deposit was sent or expired", () => {
    for (const r of reservations) {
      const state = r.deposit?.state;
      if (state === "link-sent" || state === "expired") {
        expect(r.paymentLink, `${r.ref} needs a paymentLink`).toBeDefined();
      }
    }
  });

  it("records how a paid deposit was paid", () => {
    for (const r of reservations) {
      if (r.deposit?.state === "paid") {
        expect(r.deposit.paidOn, `${r.ref} needs paidOn`).toBeTruthy();
        expect(r.deposit.method, `${r.ref} needs method`).toBeTruthy();
        expect(r.deposit.txnId, `${r.ref} needs txnId`).toBeTruthy();
      }
    }
  });
});
