// Class fragments for the Staff frames' own colours. The frames only draw the
// light theme and their greys have no shared token, so each fragment carries
// the frame's hex plus a dark-mode fallback onto the console tokens — the same
// convention as customers/_shared and orders-list/_shared.
export const INK = "text-[#0f172a] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]";
export const INK_SOFT = "text-[#58606c] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
export const INK_MUTED = "text-[#687280] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
export const INK_LINK = "text-[#0058da] [[data-theme=dark]_&]:text-[#5b9dff]";

/** The frames' card / field outline (#cbd5e1). */
export const LINE = "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";
/** The lighter outline used by toolbars, tab rails and table chrome (#e2e8f0). */
export const LINE_SOFT = "border-[#e2e8f0] [[data-theme=dark]_&]:border-[var(--octo-border-card)]";

/** The pale-blue fill behind neutral menu items and selected chips (#f5f9ff). */
export const FILL_BLUE = "bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[#0d6efd]/15";
export const FILL_GREEN = "bg-[#dcffef] [[data-theme=dark]_&]:bg-[#009a39]/20";
export const FILL_AMBER = "bg-[#fff5e4] [[data-theme=dark]_&]:bg-[#f59e0b]/15";
export const FILL_RED = "bg-[#fef0f0] [[data-theme=dark]_&]:bg-[#d30202]/20";

export const TEXT_GREEN = "text-[#009a39] [[data-theme=dark]_&]:text-[#4ade80]";
export const TEXT_AMBER = "text-[#f59e0b]";
export const TEXT_RED = "text-[#d30202] [[data-theme=dark]_&]:text-[#f87171]";
