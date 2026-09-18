// apps/merchant/src/pages/customers/_shared/theme.ts
// Hex colors match this page's own design frames, same convention as
// orders-list/_shared/theme.ts — not shared design tokens.
import type { ComponentType } from "react";
import {
  Crown, UtensilsCrossed, Cake, Sparkles, AlertTriangle, Ban, Utensils, ChartLine, RefreshCcwDot, BadgeCheck, Wallet,
  MapPin, Banknote, Clock, Star, ChartSpline,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CustomerTag, PaymentRecordStatus, ReservationStatus } from "./types";

export interface TagStyle {
  text: string;
  bg: string;
  icon: LucideIcon;
}

export const TAG_STYLE: Record<CustomerTag, TagStyle> = {
  VIP: { text: "#B9860A", bg: "#FDF3D6", icon: Crown },
  "Frequent Diner": { text: "#16A34A", bg: "#DCFCE7", icon: UtensilsCrossed },
  "Birthday May": { text: "#9333EA", bg: "#F3E8FF", icon: Cake },
  "New Customer": { text: "#0D6EFD", bg: "#DBEAFE", icon: Sparkles },
  "At Risk": { text: "#DC2626", bg: "#FEE2E2", icon: AlertTriangle },
};

export const BLOCKED_STYLE: TagStyle = { text: "#6B7280", bg: "#F1F5F9", icon: Ban };

// Fallback style for a free-text tag (added via "Add Tag") that isn't one of
// the known `CustomerTag` enum values in TAG_STYLE — the frames' blue chip
// (add new customer.png shows custom-looking tags in blue on pale blue).
export const DEFAULT_TAG_STYLE: TagStyle = { text: "#0D6EFD", bg: "#EAF2FF", icon: Sparkles };

export const TAG_LABEL_KEY: Record<CustomerTag, string> = {
  VIP: "customers.tag.vip",
  "Frequent Diner": "customers.tag.frequentDiner",
  "Birthday May": "customers.tag.birthdayMay",
  "New Customer": "customers.tag.newCustomer",
  "At Risk": "customers.tag.atRisk",
};

export type StatCardKey = "total" | "active" | "newThisMonth" | "vip" | "returning" | "totalSpend";

export interface StatCardTheme {
  icon: ComponentType<{ className?: string }>;
  tile: string;
  cardBg: string;
}

// Icons follow CRM.png where the frame's glyph is meaningful (fork/knife,
// chart, refresh, check badge). The frame reuses a placeholder "x in a
// circle" for VIP and Total Spend; a crown and a wallet are used there
// instead so a KPI never reads as an error state.
export const STAT_CARD_THEME: Record<StatCardKey, StatCardTheme> = {
  total: { icon: Utensils, tile: "#A855F7", cardBg: "bg-[#A855F7]/[0.08]" },
  active: { icon: ChartLine, tile: "#22A45D", cardBg: "bg-[#22C55E]/[0.08]" },
  newThisMonth: { icon: RefreshCcwDot, tile: "#F58A2E", cardBg: "bg-[#F97316]/[0.08]" },
  vip: { icon: Crown, tile: "#2BA6B5", cardBg: "bg-[#06B6D4]/[0.07]" },
  returning: { icon: BadgeCheck, tile: "#D49A1F", cardBg: "bg-[#EAB308]/[0.08]" },
  totalSpend: { icon: Wallet, tile: "#3B82F6", cardBg: "bg-[#3B82F6]/[0.05]" },
};

// The detail page's 5 header stat tiles (Total Visits / Total Spend / Last
// Visit / Loyalty Points / Avg Spend) — tinted tile + solid icon badge, per
// customer details.png.
export type DetailStatKey = "totalVisits" | "totalSpend" | "lastVisit" | "loyaltyPoints" | "avgSpend";

export interface DetailStatTileTheme {
  icon: LucideIcon;
  tile: string;
  cardBg: string;
}

export const DETAIL_STAT_TILE_THEME: Record<DetailStatKey, DetailStatTileTheme> = {
  totalVisits: { icon: MapPin, tile: "#3B82F6", cardBg: "bg-[#3B82F6]/[0.07]" },
  totalSpend: { icon: Banknote, tile: "#22A45D", cardBg: "bg-[#22C55E]/[0.07]" },
  lastVisit: { icon: Clock, tile: "#E0559B", cardBg: "bg-[#EC4899]/[0.07]" },
  loyaltyPoints: { icon: Star, tile: "#D49A1F", cardBg: "bg-[#EAB308]/[0.08]" },
  avgSpend: { icon: ChartSpline, tile: "#8B5CF6", cardBg: "bg-[#8B5CF6]/[0.08]" },
};

/** Tinted action-button palette shared by the row quick actions, the bulk
 *  bar and the detail page's action bar (CRM.png / CRM-selected.png /
 *  customer details.png all use the same tints). */
export interface ActionTint {
  text: string;
  bg: string;
  border: string;
}

export const ACTION_TINT = {
  edit: { text: "#0D6EFD", bg: "#EEF4FF", border: "#EEF4FF" },
  newReservations: { text: "#A07C0B", bg: "#FEFBE8", border: "#EFE3A6" },
  paymentLink: { text: "#9333EA", bg: "#FAF5FF", border: "#E9D5FF" },
  whatsapp: { text: "#16A34A", bg: "#F0FDF4", border: "#F0FDF4" },
  email: { text: "#0D6EFD", bg: "#EFF6FF", border: "#EFF6FF" },
  danger: { text: "#EF4444", bg: "#FEF2F2", border: "#FEF2F2" },
} satisfies Record<string, ActionTint>;

export const RESERVATION_STATUS_STYLE: Record<ReservationStatus, { text: string; bg: string }> = {
  Confirmed: { text: "#C99A06", bg: "#FEFBE8" },
  Pending: { text: "#0D6EFD", bg: "#EFF6FF" },
  Cancelled: { text: "#EF4444", bg: "#FEF2F2" },
};

export const PAYMENT_STATUS_STYLE: Record<PaymentRecordStatus, { text: string; bg: string }> = {
  PAID: { text: "#16A34A", bg: "#F0FDF4" },
  PENDING: { text: "#C99A06", bg: "#FEFBE8" },
};

