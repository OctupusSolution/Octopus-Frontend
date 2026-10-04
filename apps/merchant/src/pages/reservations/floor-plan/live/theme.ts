// Colours sampled from the Live Floor Plan frame (Figma 1114:98449), same
// convention as reservations/_shared/theme.ts: light is the frame's exact hex,
// dark falls back to the console's own token for that role. Every entry is a
// complete class string so Tailwind's scanner picks it up.
import type { LiveStatus } from "@/entities/floor-plan";

export const TEXT_KPI_LABEL = "text-[#6f6f6f] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
export const TEXT_TREND_UP = "text-[#04783a] [[data-theme=dark]_&]:text-[var(--octo-tone-success-text)]";
export const TEXT_TREND_DOWN = "text-[#d30202] [[data-theme=dark]_&]:text-[var(--octo-tone-danger-text)]";
export const SURFACE_LEGEND = "bg-[#fbfafc] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]";
export const SURFACE_SEND = "bg-[#dcffdc] [[data-theme=dark]_&]:bg-[var(--octo-tone-success-bg)]";
export const BORDER_CANVAS = "border-[#0f172a] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";

/** Legend chip: tinted surface + the status colour for dot, label and count. */
export const STATUS_CHIP: Record<LiveStatus, string> = {
  cleaning:
    "bg-[#f5f9ff] text-[#0d6efd] [[data-theme=dark]_&]:bg-[var(--octo-tone-info-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-info-text)]",
  available:
    "bg-[#effff5] text-[#009a39] [[data-theme=dark]_&]:bg-[var(--octo-tone-success-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-success-text)]",
  reserved:
    "bg-[#fffaf0] text-[#c27c00] [[data-theme=dark]_&]:bg-[var(--octo-tone-warning-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-warning-text)]",
  blocked:
    "bg-[#f1f5f9] text-[#687280] [[data-theme=dark]_&]:bg-[var(--octo-tone-slate-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-slate-text)]",
  occupied:
    "bg-[#fef0f0] text-[#d30202] [[data-theme=dark]_&]:bg-[var(--octo-tone-danger-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-danger-text)]",
};

/** The status value in the table detail card. */
export const STATUS_TEXT: Record<LiveStatus, string> = {
  cleaning: "text-[#0d6efd] [[data-theme=dark]_&]:text-[var(--octo-tone-info-text)]",
  available: "text-[#009a39] [[data-theme=dark]_&]:text-[var(--octo-tone-success-text)]",
  reserved: "text-[#ad5e03] [[data-theme=dark]_&]:text-[var(--octo-tone-warning-text)]",
  blocked: "text-[#687280] [[data-theme=dark]_&]:text-[var(--octo-tone-slate-text)]",
  occupied: "text-[#d30202] [[data-theme=dark]_&]:text-[var(--octo-tone-danger-text)]",
};

/** Live Summary tiles: 1px border in the tile colour, tinted surface, solid icon box. */
export const TILE_TONES = {
  green: {
    card: "border-[#009a39] bg-[#f0f9f1] [[data-theme=dark]_&]:bg-[var(--octo-tone-success-bg)]",
    icon: "bg-[#009a39]",
  },
  blue: {
    card: "border-[#0d6efd] bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[var(--octo-tone-info-bg)]",
    icon: "bg-[#0d6efd]",
  },
  amber: {
    card: "border-[#ae6919] bg-[#fef8ef] [[data-theme=dark]_&]:bg-[var(--octo-tone-warning-bg)]",
    icon: "bg-[#ae6919]",
  },
  gray: {
    card: "border-[#a1a6b0] bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-tone-slate-bg)]",
    icon: "bg-[#a1a6b0]",
  },
  red: {
    card: "border-[#d30202] bg-[#fef0f0] [[data-theme=dark]_&]:bg-[var(--octo-tone-danger-bg)]",
    icon: "bg-[#d30202]",
  },
  magenta: {
    card: "border-[#bb03ae] bg-[#fef0fd] [[data-theme=dark]_&]:bg-[var(--octo-selected)]",
    icon: "bg-[#bb03ae]",
  },
} as const;

export type TileTone = keyof typeof TILE_TONES;
