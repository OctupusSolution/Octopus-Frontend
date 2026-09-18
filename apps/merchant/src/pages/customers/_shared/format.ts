// apps/merchant/src/pages/customers/_shared/format.ts
import type { CustomerRecord } from "./types";

export function customerName(customer: Pick<CustomerRecord, "firstName" | "lastName">): string {
  return `${customer.firstName} ${customer.lastName}`;
}

export function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatReservationDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  const localeTag = locale === "ar" ? "ar-SA" : "en-US";
  const datePart = date.toLocaleDateString(localeTag, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const timePart = date.toLocaleTimeString(localeTag, { hour: "numeric", minute: "2-digit" });
  return `${datePart} - ${timePart}`;
}
