// apps/merchant/src/pages/orders-list/_shared/theme.ts
import type { CSSProperties } from "react";
import type { OrderState, PaymentStatus } from "./types";

export interface StateStyle {
  text: string;
  bg: string;
  dot: string;
}

// Hex colors are this page's own Figma frame values, not shared tokens.
// `text`/`bg` are the state chip a row shows under its timeline; `dot` is the
// state's full-strength accent.
export const STATE_STYLE: Record<OrderState, StateStyle> = {
  New: { text: "#58606C", bg: "#E2E8F0", dot: "#58606C" },
  Accepted: { text: "#9A0078", bg: "#FFDCF7", dot: "#9A0078" },
  Preparing: { text: "#CE9633", bg: "#FFF5E1", dot: "#C27C00" },
  Ready: { text: "#B233F1", bg: "#F8E9FF", dot: "#9F00EE" },
  Served: { text: "#0D6EFD", bg: "#F5F9FF", dot: "#0D6EFD" },
  Completed: { text: "#009A39", bg: "#F2FFF7", dot: "#009A39" },
  Refunded: { text: "#9A9700", bg: "#FFFED3", dot: "#9A9700" },
  Voided: { text: "#58606C", bg: "#F1F5F9", dot: "#58606C" },
  Canceled: { text: "#D30202", bg: "#FEF0F0", dot: "#D30202" },
};

export interface Tint {
  text: string;
  bg: string;
}

/** Paints an element from a `Tint` passed through `tintVars`. The frames only
 *  define the light pastels, so dark mixes the same hue into the card surface
 *  and lifts the text towards white to keep it readable. */
export const TINT_CLASS =
  "bg-[var(--tint-bg)] text-[color:var(--tint-fg)] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,var(--tint-fg)_18%,var(--octo-card))] [[data-theme=dark]_&]:text-[color:color-mix(in_srgb,var(--tint-fg)_55%,white)]";

export function tintVars(tint: Tint): CSSProperties {
  return { "--tint-fg": tint.text, "--tint-bg": tint.bg } as CSSProperties;
}

// The filter pills use slightly different pastels from the row chips.
export const ALL_PILL_TINT: Tint = { text: "#0D6EFD", bg: "#F5F9FF" };

export const PILL_TINT: Record<OrderState, Tint> = {
  New: { text: "#58606C", bg: "#E2E8F0" },
  Accepted: { text: "#9A0078", bg: "#FFDCF7" },
  Preparing: { text: "#C27C00", bg: "#FFF3DA" },
  Ready: { text: "#9F00EE", bg: "#F6E4FF" },
  Served: { text: "#0D6EFD", bg: "#F5F9FF" },
  Completed: { text: "#009A39", bg: "#EFFFF5" },
  Refunded: { text: "#9A9700", bg: "#FFFED3" },
  Voided: { text: "#58606C", bg: "#F1F5F9" },
  Canceled: { text: "#D30202", bg: "#FEF0F0" },
};

export const SOURCE_TINT: Tint = { text: "#0058DA", bg: "#F5F9FF" };

export const PAYMENT_TINT: Record<PaymentStatus, Tint> = {
  "Paid Online": { text: "#0058DA", bg: "#F5F9FF" },
  "Paid Cash": { text: "#009A39", bg: "#F5FFF9" },
  Unpaid: { text: "#58606C", bg: "#E2E8F0" },
  "Partially Paid": { text: "#FFB020", bg: "#FFF5E4" },
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

export interface ActionTint extends Tint {
  border: string;
}

// The row's small action buttons. "payment" has no frame, so it borrows the
// "Paid Cash" green.
export const ACTION_TINT: Record<OrderAction, ActionTint> = {
  payment: { text: "#009A39", bg: "#F2FFF7", border: "#B5E3C6" },
  void: { text: "#58606C", bg: "#F1F5F9", border: "#CBD5E1" },
  refund: { text: "#696700", bg: "#FFFEDC", border: "#CCCBA8" },
  wastage: { text: "#7600B1", bg: "#F8E9FF", border: "#EBC0FF" },
  cancel: { text: "#D30202", bg: "#FEF0F0", border: "#F6B1B1" },
};

/** The frames' #cbd5e1 hairline, swapped for the card-border token on dark. */
export const LINE = "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-card)]";
