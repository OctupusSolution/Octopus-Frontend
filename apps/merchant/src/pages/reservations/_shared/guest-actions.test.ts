import { describe, expect, it } from "vitest";
import { TODAY, type Reservation } from "@/shared/api/mock-reservations";
import { buildIcs, buildReceiptHtml, paymentIssueMessage, reminderMessage, whatsappHref } from "./guest-actions";

function row(over: Partial<Reservation> = {}): Reservation {
  return {
    id: "x", date: TODAY, startMinutes: 19 * 60, durationMinutes: 90,
    ref: "RSV-9000", guest: "Reem Al-Subaie", phone: "+966510002877",
    partySize: 4, area: "Main Dining", table: "T-12", branch: "Riyadh - Olaya",
    source: "Direct Booking", status: "Confirmed", ...over,
  };
}

// A stand-in t() that returns real templates for the keys under test, so the
// placeholder substitution is actually exercised (echoing the key back, as
// model.test.ts does, would leave nothing to substitute).
const TEMPLATES: Record<string, string> = {
  "reservations.message.reminder": "Hello {name}, reservation {ref} on {date} at {time} for {guests}.",
  "reservations.message.paymentIssue": "Hello {name}, payment for {ref} failed.",
  "reservations.ics.summary": "Reservation {ref} — {name}",
  "reservations.list.row.guests": "{n} Guests",
  "reservations.list.row.guestOne": "1 Guest",
  "reservations.list.row.guestsTwo": "2 Guests",
  "reservations.detail.title": "Reservation #{ref}",
};
const t = (key: string) => TEMPLATES[key] ?? key;

describe("whatsappHref", () => {
  it("strips everything but digits from the phone and encodes the message", () => {
    expect(whatsappHref("+966 51-000 2877", "Hi there & welcome")).toBe(
      "https://wa.me/966510002877?text=Hi%20there%20%26%20welcome"
    );
  });

  it("encodes Arabic text so the link survives", () => {
    const href = whatsappHref("+966510002877", "مرحبًا");
    expect(href.startsWith("https://wa.me/966510002877?text=%D9%85")).toBe(true);
    expect(decodeURIComponent(href.split("?text=")[1])).toBe("مرحبًا");
  });
});

describe("reminderMessage", () => {
  it("fills every placeholder with the booking's own details", () => {
    const text = reminderMessage(t, row(), "en");
    expect(text).toBe("Hello Reem, reservation #RSV-9000 on Aug 8, 2026 at 7:00 PM for 4 Guests.");
    expect(text).not.toMatch(/\{\w+\}/);
  });

  it("addresses a single-word name without breaking", () => {
    expect(reminderMessage(t, row({ guest: "Reem" }), "en")).toMatch(/^Hello Reem,/);
  });
});

describe("paymentIssueMessage", () => {
  it("names the guest and the reservation", () => {
    expect(paymentIssueMessage(t, row())).toBe("Hello Reem, payment for #RSV-9000 failed.");
  });
});

describe("buildIcs", () => {
  it("is a valid VCALENDAR with CRLF line endings", () => {
    const ics = buildIcs(t, row());
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("starts at the booking time and ends after its duration", () => {
    const ics = buildIcs(t, row({ startMinutes: 19 * 60, durationMinutes: 90 }));
    expect(ics).toContain("DTSTART:20260808T190000");
    expect(ics).toContain("DTEND:20260808T203000");
  });

  it("rolls a past-midnight slot onto the next day", () => {
    const ics = buildIcs(t, row({ startMinutes: 25 * 60, durationMinutes: 120 }));
    expect(ics).toContain("DTSTART:20260809T010000");
    expect(ics).toContain("DTEND:20260809T030000");
  });

  it("rolls an end time that crosses midnight", () => {
    expect(buildIcs(t, row({ startMinutes: 23 * 60, durationMinutes: 90 }))).toContain("DTEND:20260809T003000");
  });

  it("escapes commas, semicolons and newlines in text fields", () => {
    const ics = buildIcs(t, row({ area: "Terrace, North; Upper", notes: "Window seat\nAllergy: nuts" }));
    expect(ics).toContain("LOCATION:Terrace\\, North\\; Upper - Table 12");
    expect(ics).toContain("\\nWindow seat\\nAllergy: nuts");
  });

  it("uses the booking's ref as a stable UID and stamps in UTC form", () => {
    const ics = buildIcs(t, row());
    expect(ics).toContain("UID:RSV-9000@octopus.app");
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });

  it("is deterministic", () => {
    expect(buildIcs(t, row())).toBe(buildIcs(t, row()));
  });
});

describe("buildReceiptHtml", () => {
  const paid = row({
    deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state: "paid",
               paidOn: "Aug 6, 2026 - 3:20 PM", method: "mada **** 1236", txnId: "PAY-123654789" },
  });

  it("carries the payment details", () => {
    const html = buildReceiptHtml(t, paid, "en");
    expect(html).toContain("SAR 200");
    expect(html).toContain("PAY-123654789");
    expect(html).toContain("mada **** 1236");
  });

  it("escapes free-text fields so a name can't inject markup", () => {
    const html = buildReceiptHtml(t, { ...paid, guest: `<img src=x onerror="alert(1)">` }, "en");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("renders right-to-left in Arabic", () => {
    expect(buildReceiptHtml(t, paid, "ar")).toContain('dir="rtl"');
    expect(buildReceiptHtml(t, paid, "en")).toContain('dir="ltr"');
  });

  it("shows a dash rather than 'undefined' when there is no deposit", () => {
    const html = buildReceiptHtml(t, row({ deposit: undefined }), "en");
    expect(html).not.toContain("undefined");
  });
});
