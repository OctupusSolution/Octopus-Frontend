// Gregorian dates with Latin digits in both locales: the schedule is read
// against payroll and shift times, where a Hijri calendar would mislead.
const tag = (locale: string) => (locale === "ar" ? "ar-u-ca-gregory-nu-latn" : "en-US");
const longTag = (locale: string) => (locale === "ar" ? "ar-u-ca-gregory-nu-latn" : "en-GB");

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Monday-start week, matching the schedule grid in the Shifts design. */
export function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

export function formatDate(iso: string, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(longTag(locale), { day: "numeric", month: "long", year: "numeric" }).format(fromISO(iso));
}

export function formatDateTime(isoDateTime: string, locale: string): string {
  const [datePart, timePart = "00:00"] = isoDateTime.split("T");
  const date = new Intl.DateTimeFormat(tag(locale), { month: "short", day: "numeric", year: "numeric" }).format(fromISO(datePart));
  return `${date} - ${formatTime(timePart, locale, true)}`;
}

export function formatWeekdayDate(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(tag(locale), { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);
}

export function formatDayHeader(d: Date, locale: string): string {
  const weekday = new Intl.DateTimeFormat(tag(locale), { weekday: "short" }).format(d);
  return `${weekday} ${d.getDate()}`;
}

export function formatWeekday(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(tag(locale), { weekday: "short" }).format(d);
}

export function formatWeekRange(start: Date, locale: string): string {
  const end = addDays(start, 6);
  const fmt = new Intl.DateTimeFormat(longTag(locale), { day: "numeric", month: "long", year: "numeric" });
  return fmt.formatRange(start, end);
}

export function formatMonthYear(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(tag(locale), { month: "long", year: "numeric" }).format(d);
}

/** "09:00" -> "9:00AM" (en) / "9:00 ص" (ar). */
export function formatTime(hhmm: string, locale: string, spaced = false): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (locale === "ar") {
    return new Intl.DateTimeFormat(tag(locale), { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, h, m));
  }
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)}${spaced ? " " : ""}${suffix}`;
}

export function shiftDurationHours(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = toMin(end) - toMin(start);
  if (diff <= 0) diff += 24 * 60;
  return Math.round((diff / 60) * 10) / 10;
}
