// Gregorian dates with Latin digits in both languages — the frames write
// "May 11, 2026 - 10:45 PM", and a table number or a time next to it should
// never switch numeral systems mid-screen.
export function intlLocale(locale: string): string {
  return locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US";
}

export function formatTime(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

export function formatDate(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "short", day: "numeric", year: "numeric" }).format(timestamp);
}

export function formatDateTime(timestamp: number, locale: string): string {
  return `${formatDate(timestamp, locale)} - ${formatTime(timestamp, locale)}`;
}

function isSameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** "Today, 10:45 AM" for today, the full date otherwise. */
export function formatEdited(timestamp: number, locale: string, t: (key: string) => string, now = Date.now()): string {
  return isSameDay(timestamp, now) ? `${t("floorPlan.time.today")}, ${formatTime(timestamp, locale)}` : formatDateTime(timestamp, locale);
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}
