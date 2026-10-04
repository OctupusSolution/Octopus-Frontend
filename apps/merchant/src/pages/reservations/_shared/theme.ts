// Colours sampled from the Reservations design frames, same convention as
// customers/_shared/theme.ts — not shared design tokens. Light is the frame's
// exact hex; dark falls back to the console's own token for that role.
// Every entry is a complete class string so Tailwind's scanner picks it up.

export const TEXT_PRIMARY = "text-[#0f172a] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]";
export const TEXT_SECONDARY = "text-[#687280] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
export const TEXT_SEC_GRAY = "text-[#58606c] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
export const TEXT_TITLE = "text-[#16161d] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]";
export const TEXT_BRAND = "text-[#0d6efd] [[data-theme=dark]_&]:text-[var(--octo-accent)]";
export const TEXT_BRAND_DEEP = "text-[#004bb9] [[data-theme=dark]_&]:text-[var(--octo-accent)]";
export const TEXT_ERROR = "text-[#d30202] [[data-theme=dark]_&]:text-[#f87171]";
export const TEXT_SUCCESS = "text-[#009a39] [[data-theme=dark]_&]:text-[#4ade80]";

export const BORDER_300 = "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";
export const BORDER_200 = "border-[#e2e8f0] [[data-theme=dark]_&]:border-[var(--octo-border-card)]";

export const SURFACE_WHITE = "bg-white [[data-theme=dark]_&]:bg-[var(--octo-card)]";
export const SURFACE_100 = "bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-track)]";
export const SURFACE_BRAND_LIGHT = "bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[var(--octo-selected)]";
export const SURFACE_INFO = "bg-[#f0f4ff] [[data-theme=dark]_&]:bg-[var(--octo-selected)]";
export const SURFACE_RED_LIGHT = "bg-[#fef0f0] [[data-theme=dark]_&]:bg-[rgb(239_68_68_/_0.16)]";
