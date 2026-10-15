// Hex colours are the Waitlist frames' own values, not shared tokens. The
// frames only define the light theme, so each class falls back to the console
// token in dark mode.

export const INK = "text-[#0F172A] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]";
export const SUB = "text-[#687280] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
export const GRAY = "text-[#58606C] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
export const SLATE = "text-[#334155] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
export const DEEP_BLUE = "text-[#004BB9] [[data-theme=dark]_&]:text-[var(--octo-tone-info-text)]";

export const LINE = "border-[#CBD5E1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";
export const LINE_SOFT = "border-[#E2E8F0] [[data-theme=dark]_&]:border-[var(--octo-border-card)]";

export const SURFACE = "bg-white [[data-theme=dark]_&]:bg-[var(--octo-card)]";
export const SURFACE_GRAY = "bg-[#F1F5F9] [[data-theme=dark]_&]:bg-[var(--octo-track)]";
export const SURFACE_BLUE = "bg-[#F5F9FF] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#0D6EFD_12%,var(--octo-card))]";

/** The frame's 48px primary button ("Add To Waitlist", "Next", "Confirm and Seat guest"). */
export const BTN_PRIMARY =
  "inline-flex h-12 items-center justify-center gap-1 rounded-[8px] bg-[#0D6EFD] px-3 py-2 text-[18px] font-bold leading-[18px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45";
/** Its grey "Cancel" sibling. */
export const BTN_NEUTRAL =
  "inline-flex h-12 items-center justify-center rounded-[8px] bg-[#E2E8F0] px-3 py-2 text-[18px] font-bold leading-[18px] text-[#687280] transition-colors hover:bg-[#CBD5E1] [[data-theme=dark]_&]:bg-[var(--octo-track)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";

/** Paints a pastel chip from `--tint-fg` / `--tint-bg`; dark mixes the same hue
 *  into the card surface and lifts the text so it stays readable. */
export const TINT_CLASS =
  "bg-[var(--tint-bg)] text-[color:var(--tint-fg)] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,var(--tint-fg)_18%,var(--octo-card))] [[data-theme=dark]_&]:text-[color:color-mix(in_srgb,var(--tint-fg)_55%,white)]";
