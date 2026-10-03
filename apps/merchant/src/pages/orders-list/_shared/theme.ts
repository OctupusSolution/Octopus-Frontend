// apps/merchant/src/pages/orders-list/_shared/theme.ts
import type { OrderState } from "./types";

export interface StateStyle {
  text: string;
  bg: string;
  dot: string;
}

// Hex colors match this page's own design frames, not any shared token —
// Ready/Accepted share the violet family, Served is the app's usual
// accent blue, the rest follow the mockups' filter-pill dot colors.
export const STATE_STYLE: Record<OrderState, StateStyle> = {
  New: { text: "var(--octo-text-secondary)", bg: "var(--octo-track)", dot: "#94A3B8" },
  Accepted: { text: "#9333EA", bg: "#9333EA1A", dot: "#9333EA" },
  Preparing: { text: "#D97706", bg: "#D977061A", dot: "#D97706" },
  Ready: { text: "#9333EA", bg: "#9333EA1A", dot: "#9333EA" },
  Served: { text: "#0D6EFD", bg: "#0D6EFD1A", dot: "#0D6EFD" },
  Completed: { text: "#16A34A", bg: "#16A34A1A", dot: "#16A34A" },
  Refunded: { text: "#A16207", bg: "#A162071A", dot: "#A16207" },
  Voided: { text: "#6B7280", bg: "#6B72801A", dot: "#6B7280" },
  Canceled: { text: "#DC2626", bg: "#DC26261A", dot: "#DC2626" },
};

export type OrderAction = "cancel" | "void" | "wastage" | "refund" | "payment";

export interface ActionTheme {
  accent: string;
}

// The solid fill of each action's PIN-confirm button, sampled from its own
// "Manager Authentication & Security" frame: red for Cancel, amber for Void,
// violet for Wastage, and the olive-yellow the Refund frame uses (which is
// noticeably greener than the brown-amber the Refund row button carries).
// "payment" has no frame of its own (BACKEND_GAPS.md 6b.18) — it takes the
// same green "Paid Cash" tone order-row.tsx already uses for money in hand,
// not a PIN-confirm colour, since recording a payment needs no approval.
export const ACTION_THEME: Record<OrderAction, ActionTheme> = {
  cancel: { accent: "#DC2626" },
  void: { accent: "#F59E0B" },
  wastage: { accent: "#9333EA" },
  refund: { accent: "#A9A32B" },
  payment: { accent: "#16A34A" },
};
