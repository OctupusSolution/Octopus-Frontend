// apps/merchant/src/pages/customers/_shared/format.ts
import { formatSar } from "@octopus/api-client";
import type { CustomerRecord } from "./types";

export { formatSar };

export function customerName(customer: Pick<CustomerRecord, "firstName" | "lastName">): string {
  return `${customer.firstName} ${customer.lastName}`;
}

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "15 May 2026" (frames' day-first style; built by hand because en-GB
 *  prints September as "Sept"). Arabic uses the ar-SA locale formatter. */
export function formatDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (locale === "ar") return date.toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" });
  return `${date.getDate()} ${EN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Sun, 10 May 2026 - 7:30PM" as on the reservation cards. */
export function formatReservationDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (locale === "ar") {
    const datePart = date.toLocaleDateString("ar-SA", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const timePart = date.toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" });
    return `${datePart} - ${timePart}`;
  }
  const hours = date.getHours();
  const time = `${hours % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")}${hours < 12 ? "AM" : "PM"}`;
  return `${EN_WEEKDAYS[date.getDay()]}, ${formatDate(iso, locale)} - ${time}`;
}

/**
 * Money rule for the whole module: aggregate figures (total / average
 * spend, KPIs) are whole riyals with thousands grouping — "SAR 12,500",
 * as the list frame's "SAR 1500" column reads — and individual
 * transactions (orders, payments, message cost) use `formatSar`'s
 * two-decimal form — "SAR 186.00", as the detail frame shows.
 */
export function formatSarWhole(amount: number): string {
  return `SAR ${Math.round(amount).toLocaleString("en-US")}`;
}
