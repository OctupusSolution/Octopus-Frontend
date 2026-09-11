// Pure builders behind the actions that reach the guest or leave the app:
// the pre-written WhatsApp messages, the calendar export and the deposit
// receipt. None of them needs a server, which is why they can work today.
// No DOM here — the page and the detail dialog hand the results to the
// browser (window.open / a file download); see ./download.ts.
import { TODAY, type Reservation } from "@/shared/api/mock-reservations";
import { addDays, clock12, formatDisplayDate, guestsText, NOW_MINUTES, tableLabel } from "./model";

type Translate = (key: string) => string;

/** Fills `{name}`-style placeholders. `t()` performs no interpolation, and a
 *  plain `.replace` only swaps the first occurrence, so split/join instead. */
function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.split(`{${key}}`).join(value), template);
}

function firstName(r: Reservation): string {
  return r.guest.trim().split(/\s+/)[0] ?? r.guest;
}

/** A wa.me link that opens a chat with the guest, message pre-typed. */
export function whatsappHref(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

/** The row menu's "Send Reminder" text. */
export function reminderMessage(t: Translate, r: Reservation, locale: string): string {
  return fill(t("reservations.message.reminder"), {
    name: firstName(r),
    ref: `#${r.ref}`,
    date: formatDisplayDate(r.date, locale),
    time: clock12(r.startMinutes),
    guests: guestsText(t, r.partySize),
  });
}

/** The detail dialog's "Notify guest" text, for a failed or expired deposit. */
export function paymentIssueMessage(t: Translate, r: Reservation): string {
  return fill(t("reservations.message.paymentIssue"), { name: firstName(r), ref: `#${r.ref}` });
}

/* ================================================================ Calendar */

/** `startMinutes` can run past midnight (a 1:00 AM slot is stored as 25*60),
 *  so fold whole days into the date before formatting. Floating local time:
 *  the booking is at the restaurant's wall-clock time wherever it's opened. */
function icsLocal(dateIso: string, minutes: number): string {
  const dayOffset = Math.floor(minutes / (24 * 60));
  const inDay = minutes - dayOffset * 24 * 60;
  const date = addDays(dateIso, dayOffset).replace(/-/g, "");
  return `${date}T${String(Math.floor(inDay / 60)).padStart(2, "0")}${String(inDay % 60).padStart(2, "0")}00`;
}

/** RFC 5545 text escaping: backslash, semicolon, comma, and newlines. */
function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** An .ics file for the row menu's "Export To Calendar". */
export function buildIcs(t: Translate, r: Reservation): string {
  const location = r.table ? `${r.area} - ${tableLabel(r.table)}` : r.area;
  const description = [guestsText(t, r.partySize), r.phone, r.notes].filter(Boolean).join("\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Octopus//Reservations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${r.ref}@octopus.app`,
    // Deterministic like the rest of the module: stamped at its fixed "now".
    `DTSTAMP:${icsLocal(TODAY, NOW_MINUTES)}Z`,
    `DTSTART:${icsLocal(r.date, r.startMinutes)}`,
    `DTEND:${icsLocal(r.date, r.startMinutes + r.durationMinutes)}`,
    `SUMMARY:${icsText(fill(t("reservations.ics.summary"), { ref: `#${r.ref}`, name: r.guest }))}`,
    `LOCATION:${icsText(location)}`,
    `DESCRIPTION:${icsText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/* ================================================================= Receipt */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A self-contained, printable HTML receipt for the detail dialog's
 *  "Download Receipt" (paid state). Every value is escaped: guest names and
 *  notes are free text. */
export function buildReceiptHtml(t: Translate, r: Reservation, locale: string): string {
  const d = r.deposit;
  const rows: [string, string][] = [
    [t("reservations.detail.paidAmount"), d ? `${d.currency} ${d.amount}` : "—"],
    [t("reservations.detail.paidOn"), d?.paidOn ?? "—"],
    [t("reservations.detail.paymentMethod"), d?.method ?? "—"],
    [t("reservations.detail.transactionId"), d?.txnId ?? "—"],
  ];
  const booking = [
    formatDisplayDate(r.date, locale),
    clock12(r.startMinutes),
    guestsText(t, r.partySize),
    r.table ? `${r.area} - ${tableLabel(r.table)}` : r.area,
  ].join(" · ");
  const title = t("reservations.receipt.title");
  const dir = locale === "ar" ? "rtl" : "ltr";

  return `<!doctype html>
<html lang="${locale === "ar" ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} ${escapeHtml(r.ref)}</title>
<style>
  body { margin: 0; background: #f4f5f7; font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif; color: #111827; }
  main { max-width: 440px; margin: 40px auto; background: #fff; border-radius: 14px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .brand { font-weight: 800; letter-spacing: .06em; color: #0D6EFD; font-size: 13px; }
  h1 { font-size: 20px; margin: 6px 0 2px; }
  .ref { color: #6b7280; margin: 0 0 18px; }
  .status { display: inline-block; background: #e7f6ec; color: #15803d; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 999px; }
  .guest { margin: 18px 0 4px; font-weight: 600; }
  .muted { color: #6b7280; font-size: 13px; margin: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; border-top: 1px solid #eceef1; }
  td { padding: 10px 0; border-bottom: 1px solid #eceef1; }
  td:last-child { text-align: end; font-weight: 600; }
  .thanks { margin-top: 20px; color: #6b7280; font-size: 13px; text-align: center; }
  @media print { body { background: #fff; } main { box-shadow: none; margin: 0 auto; } }
</style>
</head>
<body>
<main>
  <div class="brand">OCTOPUS</div>
  <h1>${escapeHtml(title)}</h1>
  <p class="ref">${escapeHtml(t("reservations.detail.title").replace("{ref}", r.ref))}</p>
  <span class="status">${escapeHtml(t("reservations.detail.state.paid"))}</span>
  <p class="guest">${escapeHtml(r.guest)}</p>
  <p class="muted" dir="ltr">${escapeHtml(r.phone)}</p>
  <p class="muted">${escapeHtml(booking)}</p>
  <table>
${rows.map(([label, value]) => `    <tr><td>${escapeHtml(label)}</td><td dir="ltr">${escapeHtml(value)}</td></tr>`).join("\n")}
  </table>
  <p class="thanks">${escapeHtml(t("reservations.receipt.thanks"))}</p>
</main>
</body>
</html>
`;
}
