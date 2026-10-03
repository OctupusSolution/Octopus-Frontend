// apps/merchant/src/pages/customers/_shared/theme.ts
// Hex colors match this page's own design frames, same convention as
// orders-list/_shared/theme.ts — not shared design tokens.
import {
  Crown, UtensilsCrossed, Cake, Sparkles, AlertTriangle, Ban, Wallet,
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
  VIP: { text: "#7B6804", bg: "#FEF8D9", icon: Crown },
  "Frequent Diner": { text: "#05752F", bg: "#EDFFF5", icon: UtensilsCrossed },
  "Birthday May": { text: "#8D0DCE", bg: "#FAF1FF", icon: Cake },
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
  /** A frame glyph (file under assets/Dashboard/icons) or a lucide icon. */
  icon: string | LucideIcon;
  tile: string;
  cardBg: string;
}

// The frame reuses a placeholder "x in a circle" glyph for VIP and Total
// Spend; a crown and a wallet are used there instead so a KPI never reads as
// an error state. Card tints are the frame's pastels on light and the same
// hue mixed into the card token on dark.
export const STAT_CARD_THEME: Record<StatCardKey, StatCardTheme> = {
  total: { icon: "crm-stat-total.svg", tile: "#9133C1", cardBg: "bg-[#f9edff] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#9133c1_14%,var(--octo-card))]" },
  active: { icon: "crm-stat-active.svg", tile: "#009A39", cardBg: "bg-[#e9fff2] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#009a39_14%,var(--octo-card))]" },
  newThisMonth: { icon: "crm-stat-new.svg", tile: "#EA6D00", cardBg: "bg-[#fff0e3] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#ea6d00_14%,var(--octo-card))]" },
  vip: { icon: Crown, tile: "#0296AD", cardBg: "bg-[#eafcff] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#0296ad_14%,var(--octo-card))]" },
  returning: { icon: "crm-stat-returning.svg", tile: "#C27C00", cardBg: "bg-[#fff5e1] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#c27c00_14%,var(--octo-card))]" },
  totalSpend: { icon: Wallet, tile: "#0D6EFD", cardBg: "bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#0d6efd_14%,var(--octo-card))]" },
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
  edit: { text: "#0058DA", bg: "#F5F9FF", border: "#F5F9FF" },
  newReservations: { text: "#696700", bg: "#FFFEDC", border: "#CCCBA8" },
  paymentLink: { text: "#7600B1", bg: "#F8E9FF", border: "#EBC0FF" },
  whatsapp: { text: "#009A39", bg: "#F2F9F3", border: "#F2F9F3" },
  email: { text: "#0D6EFD", bg: "#F5F9FF", border: "#F5F9FF" },
  danger: { text: "#D30202", bg: "#FEF0F0", border: "#FEF0F0" },
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

