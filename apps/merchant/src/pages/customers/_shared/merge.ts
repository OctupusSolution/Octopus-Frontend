// apps/merchant/src/pages/customers/_shared/merge.ts
import type { CustomerRecord } from "./types";

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function earliest(a: string, b: string): string {
  return a < b ? a : b;
}

function latest(a: string, b: string): string {
  return a > b ? a : b;
}

/**
 * Merges duplicate profiles into the first one (it keeps its id, name and
 * contact details): visits and spend add up, tags / notes / history are
 * unioned, first-seen dates take the earliest and last-visit the latest.
 */
export function mergeCustomers(records: readonly CustomerRecord[]): CustomerRecord {
  if (records.length === 0) throw new Error("mergeCustomers needs at least one record");
  const [primary, ...rest] = records;
  return rest.reduce<CustomerRecord>((acc, other) => {
    const visits = acc.visits + other.visits;
    const totalSpendSar = acc.totalSpendSar + other.totalSpendSar;
    return {
      ...acc,
      email: acc.email || other.email,
      tags: unique([...acc.tags, ...other.tags]),
      isBlocked: acc.isBlocked || other.isBlocked,
      visits,
      totalSpendSar,
      avgSpendSar: visits > 0 ? Math.round(totalSpendSar / visits) : 0,
      loyaltyPoints: acc.loyaltyPoints + other.loyaltyPoints,
      lastVisit: latest(acc.lastVisit, other.lastVisit),
      customerSince: earliest(acc.customerSince, other.customerSince),
      firstVisit: earliest(acc.firstVisit, other.firstVisit),
      upcomingReservation: acc.upcomingReservation ?? other.upcomingReservation,
      communicationPreference: unique([...acc.communicationPreference, ...other.communicationPreference]),
      notes: [...acc.notes, ...other.notes].sort((a, b) => a.date.localeCompare(b.date)),
      recentReservations: [...acc.recentReservations, ...other.recentReservations],
      recentOrders: [...acc.recentOrders, ...other.recentOrders],
      recentPayments: [...acc.recentPayments, ...other.recentPayments],
    };
  }, primary);
}
