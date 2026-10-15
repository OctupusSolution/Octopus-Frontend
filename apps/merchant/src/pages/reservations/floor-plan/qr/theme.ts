// Colours sampled from the Table QR Codes frames (Figma 2012:185145 and its
// flow). Same convention as live/theme.ts: light is the frame's exact hex,
// dark falls back to the console's token for that role.
import type { QrStatus } from "./qr-store";

export const QR_CHIP: Record<QrStatus, string> = {
  active:
    "bg-[#effff5] text-[#009a39] [[data-theme=dark]_&]:bg-[var(--octo-tone-success-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-success-text)]",
  reprint:
    "bg-[#fffaf0] text-[#c27c00] [[data-theme=dark]_&]:bg-[var(--octo-tone-warning-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-warning-text)]",
  notGenerated:
    "bg-[#f1f5f9] text-[#687280] [[data-theme=dark]_&]:bg-[var(--octo-tone-slate-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-slate-text)]",
  disabled:
    "bg-[#fef0f0] text-[#d30202] [[data-theme=dark]_&]:bg-[var(--octo-tone-danger-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-danger-text)]",
};

export const QR_STATUS_TEXT: Record<QrStatus, string> = {
  active: "text-[#009a39] [[data-theme=dark]_&]:text-[var(--octo-tone-success-text)]",
  reprint: "text-[#c27c00] [[data-theme=dark]_&]:text-[var(--octo-tone-warning-text)]",
  notGenerated: "text-[#687280] [[data-theme=dark]_&]:text-[var(--octo-tone-slate-text)]",
  disabled: "text-[#d30202] [[data-theme=dark]_&]:text-[var(--octo-tone-danger-text)]",
};

/** The status strip at the top of the table modal. */
export const QR_BANNER: Record<QrStatus, string> = {
  active: "bg-[#dcffdc] text-[#009a39] [[data-theme=dark]_&]:bg-[var(--octo-tone-success-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-success-text)]",
  reprint: QR_CHIP.reprint,
  notGenerated: QR_CHIP.notGenerated,
  disabled: QR_CHIP.disabled,
};

/** Summary cards: tinted surface, 2px white border, solid 48px icon box. */
export const QR_CARD = {
  blue: { card: "bg-[#f0f6ff] [[data-theme=dark]_&]:bg-[var(--octo-tone-info-bg)]", icon: "bg-[#0063f6]" },
  green: { card: "bg-[#effff5] [[data-theme=dark]_&]:bg-[var(--octo-tone-success-bg)]", icon: "bg-[#01a036]" },
  amber: { card: "bg-[#fffaf0] [[data-theme=dark]_&]:bg-[var(--octo-tone-warning-bg)]", icon: "bg-[#c27c00]" },
  red: { card: "bg-[#fef0f0] [[data-theme=dark]_&]:bg-[var(--octo-tone-danger-bg)]", icon: "bg-[#d30202]" },
  gray: { card: "bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-tone-slate-bg)]", icon: "bg-[#64748b]" },
} as const;

export const TEXT_SUBTEXT = "text-[#6f6f6f] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
export const TEXT_BLACK = "text-[#0e0e0e] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]";

const BTN = "inline-flex h-12 items-center justify-center gap-2 px-6 text-[18px] font-bold leading-[18px] transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_PRIMARY = `${BTN} rounded-[8px] bg-[#0d6efd] text-white hover:bg-[#0b5ed7]`;
export const BTN_OUTLINE = `${BTN} rounded-[8px] border border-[#0d6efd] text-[#0d6efd] hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[var(--octo-selected)]`;
/** Modal buttons: 12px radius, gray-300 outline. */
export const BTN_MODAL_PRIMARY = `${BTN} w-full rounded-[12px] bg-[#0d6efd] px-3 text-white hover:bg-[#0b5ed7]`;
export const BTN_MODAL_OUTLINE = `${BTN} rounded-[12px] border border-[#cbd5e1] px-3 text-[#0d6efd] hover:bg-[#f5f9ff] [[data-theme=dark]_&]:border-[var(--octo-border-input)] [[data-theme=dark]_&]:hover:bg-[var(--octo-selected)]`;
export const BTN_MODAL_DANGER = `${BTN} rounded-[12px] bg-[#fef0f0] px-3 text-[#d30202] hover:bg-[#fde2e2] [[data-theme=dark]_&]:bg-[var(--octo-tone-danger-bg)]`;
export const BTN_MODAL_WARNING = `${BTN} rounded-[12px] bg-[#fef1db] px-3 text-[#ae6919] hover:bg-[#fde7c2] [[data-theme=dark]_&]:bg-[var(--octo-tone-warning-bg)]`;
