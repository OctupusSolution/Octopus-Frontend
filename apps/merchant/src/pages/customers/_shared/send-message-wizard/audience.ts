// apps/merchant/src/pages/customers/_shared/send-message-wizard/audience.ts
import { matchesListFilters, type ListFilters } from "../list-filter";
import type { CustomerRecord } from "../types";

export type VisitFrequency = "weekly" | "monthly" | "occasional" | "firstTime";
export const VISIT_FREQUENCIES: readonly VisitFrequency[] = ["weekly", "monthly", "occasional", "firstTime"];

export type AgeRange = "18-24" | "25-30" | "31-40" | "41-50" | "51+";
export const AGE_RANGES: readonly AgeRange[] = ["18-24", "25-30", "31-40", "41-50", "51+"];

const AGE_BOUNDS: Record<AgeRange, [number, number]> = {
  "18-24": [18, 24],
  "25-30": [25, 30],
  "31-40": [31, 40],
  "41-50": [41, 50],
  "51+": [51, Number.POSITIVE_INFINITY],
};

export interface AudienceFilters {
  tag: string;
  visitFrequency: "" | VisitFrequency;
  totalSpendFrom: string;
  totalSpendTo: string;
  lastVisitFrom: string;
  lastVisitTo: string;
  customerSinceFrom: string;
  customerSinceTo: string;
  gender: "" | "Male" | "Female";
  ageRange: "" | AgeRange;
  /** Filters of a saved segment chosen under "Saved Audiences"; ANDed with
   *  the fields above. */
  segment: { id: string; name: string; filters: ListFilters } | null;
}

export const EMPTY_AUDIENCE_FILTERS: AudienceFilters = {
  tag: "",
  visitFrequency: "",
  totalSpendFrom: "",
  totalSpendTo: "",
  lastVisitFrom: "",
  lastVisitTo: "",
  customerSinceFrom: "",
  customerSinceTo: "",
  gender: "",
  ageRange: "",
  segment: null,
};

function monthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

/** Average visit cadence over the customer's lifetime (first visit → last
 *  visit): 4+ a month is weekly, 1+ a month is monthly, anything slower is
 *  occasional, and a single visit is first-time. */
export function visitFrequencyOf(customer: Pick<CustomerRecord, "visits" | "firstVisit" | "lastVisit">): VisitFrequency {
  if (customer.visits <= 1) return "firstTime";
  const perMonth = customer.visits / Math.max(1, monthsBetween(customer.firstVisit, customer.lastVisit));
  if (perMonth >= 4) return "weekly";
  if (perMonth >= 1) return "monthly";
  return "occasional";
}

/** Whole years between `dobIso` and `todayIso`. */
export function ageOn(dobIso: string, todayIso: string): number {
  const dob = new Date(dobIso);
  const today = new Date(todayIso);
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < dob.getUTCMonth() || (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function matchesAudience(customer: CustomerRecord, filters: AudienceFilters, todayIso: string = new Date().toISOString().slice(0, 10)): boolean {
  if (filters.segment && !matchesListFilters(customer, filters.segment.filters)) return false;
  if (filters.tag && !customer.tags.includes(filters.tag)) return false;
  if (filters.visitFrequency && visitFrequencyOf(customer) !== filters.visitFrequency) return false;
  if (filters.totalSpendFrom && customer.totalSpendSar < Number(filters.totalSpendFrom)) return false;
  if (filters.totalSpendTo && customer.totalSpendSar > Number(filters.totalSpendTo)) return false;
  if (filters.lastVisitFrom && customer.lastVisit < filters.lastVisitFrom) return false;
  if (filters.lastVisitTo && customer.lastVisit > filters.lastVisitTo) return false;
  if (filters.customerSinceFrom && customer.customerSince < filters.customerSinceFrom) return false;
  if (filters.customerSinceTo && customer.customerSince > filters.customerSinceTo) return false;
  if (filters.gender && customer.gender !== filters.gender) return false;
  if (filters.ageRange) {
    if (!customer.dateOfBirth) return false;
    const [min, max] = AGE_BOUNDS[filters.ageRange];
    const age = ageOn(customer.dateOfBirth, todayIso);
    if (age < min || age > max) return false;
  }
  return true;
}

/** Customers that can't be messaged (blocked) are never part of an audience. */
export function audienceOf(customers: readonly CustomerRecord[], filters: AudienceFilters, todayIso?: string): CustomerRecord[] {
  return customers.filter((c) => !c.isBlocked && matchesAudience(c, filters, todayIso));
}

/** Per-message price by channel (SAR). WhatsApp's 0.125 reproduces the
 *  frame's 2,312 messages → SAR 289.00. */
export const CHANNEL_COST_SAR = { WhatsApp: 0.125, SMS: 0.1, Email: 0.02 } as const;

export function estimatedCostSar(channel: keyof typeof CHANNEL_COST_SAR, messages: number): number {
  return Math.round(messages * CHANNEL_COST_SAR[channel] * 100) / 100;
}
