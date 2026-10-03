// The import's visual constants, in one place.
//
// The three frames draw the AI flow in a deeper indigo than the console's
// accent blue — it is how the merchant can tell, at a glance, that they are
// looking at something the AI produced. There is no token for it, so it lives
// here as Tailwind classes and nowhere else; every screen imports these rather
// than repeating the hex.
//
// Tailwind's `dark:` variant follows the OS here, not the console's
// `data-theme`, so dark overrides use an arbitrary ancestor variant instead.
// Solid fills keep the same indigo in both themes (white text reads on it);
// indigo *ink* lifts to a lighter violet on dark cards, where #3D1DF3 would sink.

import clsx from "clsx";
import type { Band } from "@/entities/menu/ai-import";

export const AI = {
  solid: "bg-[#3D1DF3] text-white hover:bg-[#3418d8]",
  text: "text-[#3D1DF3] [[data-theme=dark]_&]:text-[#a99bff]",
  border: "border-[#3D1DF3] [[data-theme=dark]_&]:border-[#8b7bff]",
  /** Progress fills, active dots — solid indigo that lifts in dark. */
  fill: "bg-[#3D1DF3] [[data-theme=dark]_&]:bg-[#8b7bff]",
  soft: "bg-[var(--octo-tone-violet-bg)]",
  softBorder: "border-[var(--octo-ai-border)]",
} as const;

/** Tinted secondary button: the frames' "Change File", "Change Image", "View
 *  Extraction Summary". */
export const tintedButton = clsx(
  "inline-flex items-center justify-center gap-2 rounded-[8px] border px-3 text-[13px] font-medium transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50",
  AI.soft,
  AI.softBorder,
  AI.text
);

/** Quiet outline button: "Save as Draft", "Remove", toolbar actions. */
export const outlineButton =
  "inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 text-[13px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-50";

export const card = "rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]";

export const BAND_TONE: Record<Band, { pill: string; box: string; bar: string; ink: string }> = {
  high: {
    pill: "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]",
    box: "border-[var(--octo-tone-success-border)] bg-[rgb(22_163_74/0.07)]",
    bar: "bg-[var(--octo-tone-success-text)]",
    ink: "text-[var(--octo-tone-success-text)]",
  },
  medium: {
    pill: "bg-[var(--octo-tone-warning-bg)] text-[var(--octo-tone-warning-text)]",
    box: "border-[var(--octo-tone-warning-border)] bg-[rgb(245_158_11/0.09)]",
    bar: "bg-[var(--octo-tone-warning-dot)]",
    ink: "text-[var(--octo-tone-warning-text)]",
  },
  low: {
    pill: "bg-[var(--octo-tone-danger-bg)] text-[var(--octo-tone-danger-text)]",
    box: "border-[rgb(239_68_68/0.35)] bg-[rgb(239_68_68/0.07)]",
    bar: "bg-[var(--octo-tone-danger-dot)]",
    ink: "text-[var(--octo-tone-danger-text)]",
  },
};

/** Path from this folder up to apps/, where the artwork lives. */
export const OCTOPUS_ART = new URL("../../../../../assets/Setup/octopus.png", import.meta.url).href;

/** `t()` has no interpolation; every counted label goes through this. */
export function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), template);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
