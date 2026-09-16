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

export type OrderAction = "cancel" | "void" | "wastage" | "refund";

export interface ActionTheme {
  accent: string;
}

export const ACTION_THEME: Record<OrderAction, ActionTheme> = {
  cancel: { accent: "#DC2626" },
  void: { accent: "#D97706" },
  wastage: { accent: "#7C3AED" },
  refund: { accent: "#A16207" },
};
