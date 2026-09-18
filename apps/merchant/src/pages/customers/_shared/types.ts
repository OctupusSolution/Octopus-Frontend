// apps/merchant/src/pages/customers/_shared/types.ts
// This page's own customer model — mirrors what a real
// `useCustomerList()` / `useCustomer(id)` query would return. Deliberately
// separate from any other module's data.

export type CustomerTag = "VIP" | "Frequent Diner" | "Birthday May" | "New Customer" | "At Risk";
export type CommunicationChannel = "WhatsApp" | "SMS" | "Email";
export type MarketingConsent = "Opted in" | "Opted out";
export type ReservationStatus = "Confirmed" | "Pending" | "Cancelled";
export type PaymentRecordStatus = "PAID" | "PENDING";

export interface CustomerNote {
  date: string; // ISO date
  text: string;
}

export interface ReservationSummary {
  date: string; // ISO datetime
  table: string;
  guests: number;
  status: ReservationStatus;
}

export interface OrderSummary {
  id: string;
  date: string; // ISO date
  items: string;
  totalSar: number;
}

export interface PaymentSummary {
  date: string; // ISO date
  cardLast4: string;
  amountSar: number;
  status: PaymentRecordStatus;
}

export interface CustomerRecord {
  id: string;
  firstName: string;
  lastName: string;
  gender: "Male" | "Female";
  dateOfBirth?: string; // ISO date
  // Free-text: the known `CustomerTag` enum seeds the styled/translated
  // subset (see TAG_STYLE / TAG_LABEL_KEY), but "Add Tag" lets merchants
  // attach arbitrary custom tags beyond that fixed list.
  tags: string[];
  phone: string; // "+9665XXXXXXXX"
  email: string;
  isBlocked: boolean;
  visits: number;
  totalSpendSar: number;
  lastVisit: string; // ISO date
  upcomingReservation?: string; // ISO date
  loyaltyPoints: number;
  avgSpendSar: number;
  customerSince: string; // ISO date
  firstVisit: string; // ISO date
  preferredBranch: string;
  preferredAreaTable: string;
  vipSince?: string; // ISO date
  referredBy?: string;
  marketingConsent: MarketingConsent;
  cuisinePreference: string[];
  dietaryPreference: string;
  occasion: string;
  visitTime: string;
  communicationPreference: CommunicationChannel[];
  specialRequests: string;
  notes: CustomerNote[];
  recentReservations: ReservationSummary[];
  recentOrders: OrderSummary[];
  recentPayments: PaymentSummary[];
}

export const ALL_TAGS: readonly CustomerTag[] = ["VIP", "Frequent Diner", "Birthday May", "New Customer", "At Risk"];
