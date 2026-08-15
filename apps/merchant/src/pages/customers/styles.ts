// Shared style lookups for the Customers module — used by both the list
// table and the profile modal, kept here so neither has to duplicate them.
import type { CustomerSegment, LoyaltyTier } from "@/shared/api/mock-customers";

export const SEGMENT_TONE: Record<CustomerSegment, "success" | "error" | "warning" | "info" | "neutral"> = {
  VIP: "info",
  Regular: "info",
  New: "success",
  "At Risk": "warning",
  Churned: "neutral",
};

export const SEGMENT_STYLE: Partial<Record<CustomerSegment, { backgroundColor: string; color: string }>> = {
  VIP: { backgroundColor: "#885CF61a", color: "#885CF6" },
};

export const LOYALTY_STYLE: Record<LoyaltyTier, string> = {
  Bronze: "bg-[#f2e7dd] text-[#9a6a3a]",
  Silver: "bg-[#eceff1] text-[#607080]",
  Gold: "bg-[#fdf3d6] text-[#b9860a]",
  Platinum: "bg-[#e9e4ff] text-[#6C4DFF]",
};

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
