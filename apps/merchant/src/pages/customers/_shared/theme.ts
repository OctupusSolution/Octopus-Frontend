// apps/merchant/src/pages/customers/_shared/theme.ts
// Hex colors match this page's own design frames, same convention as
// orders-list/_shared/theme.ts — not shared design tokens.
import type { ComponentType } from "react";
import { Crown, UtensilsCrossed, Cake, Sparkles, AlertTriangle, Ban, Users, UserCheck, UserPlus, Repeat, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CustomerTag } from "./types";

export interface TagStyle {
  text: string;
  bg: string;
  icon: LucideIcon;
}

export const TAG_STYLE: Record<CustomerTag, TagStyle> = {
  VIP: { text: "#B9860A", bg: "#FDF3D6", icon: Crown },
  "Frequent Diner": { text: "#16A34A", bg: "#DCFCE7", icon: UtensilsCrossed },
  "Birthday May": { text: "#7C3AED", bg: "#EDE9FE", icon: Cake },
  "New Customer": { text: "#0D6EFD", bg: "#DBEAFE", icon: Sparkles },
  "At Risk": { text: "#DC2626", bg: "#FEE2E2", icon: AlertTriangle },
};

export const BLOCKED_STYLE: TagStyle = { text: "#6B7280", bg: "#F1F5F9", icon: Ban };

export type StatCardKey = "total" | "active" | "newThisMonth" | "vip" | "returning" | "totalSpend";

export interface StatCardTheme {
  icon: ComponentType<{ className?: string }>;
  tile: string;
  cardBg: string;
}

// One import per icon keeps this table scannable; semantics were chosen to
// actually match each label (the raw mockup pairs a mismatched icon/label
// on a couple of cards — an easy, low-risk fix over replicating that).
export const STAT_CARD_THEME: Record<StatCardKey, StatCardTheme> = {
  total: { icon: Users, tile: "#8B5CF6", cardBg: "bg-[#8B5CF6]/[0.08]" },
  active: { icon: UserCheck, tile: "#16A34A", cardBg: "bg-[#16A34A]/[0.08]" },
  newThisMonth: { icon: UserPlus, tile: "#F97316", cardBg: "bg-[#F97316]/[0.08]" },
  vip: { icon: Crown, tile: "#0EA5E9", cardBg: "bg-[#0EA5E9]/[0.08]" },
  returning: { icon: Repeat, tile: "#CA8A04", cardBg: "bg-[#CA8A04]/[0.08]" },
  totalSpend: { icon: Wallet, tile: "#0D6EFD", cardBg: "bg-[#0D6EFD]/[0.08]" },
};

export const ROW_ACTION_THEME = {
  newReservations: { text: "#B9860A", bg: "#FDF3D6" },
  paymentLink: { text: "#7C3AED", bg: "#EDE9FE" },
};
