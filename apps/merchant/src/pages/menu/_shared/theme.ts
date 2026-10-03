// Hex colours match the Menu module's own design frames, same convention as
// customers/_shared/theme.ts — not shared design tokens. Where a frame colour
// has no dark counterpart, the class falls back to the nearest theme token.

/** The frames' outline (#cbd5e1) for cards, fields and dividers. */
export const LINE = "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";
export const FIELD_BORDER = `border ${LINE}`;

/** The frames' body text (#0f172a) and its secondary (#687280). */
export const TEXT = "text-[#0f172a] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]";
export const TEXT_SECONDARY = "text-[#687280] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";

export const FOCUS =
  "transition-colors focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25 [[data-theme=dark]_&]:focus:border-[#0D6EFD]";
export const FOCUS_WITHIN =
  "transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/25 [[data-theme=dark]_&]:focus-within:border-[#0D6EFD]";

/** A field whose value failed validation: the outline turns the frames' red. */
export const FIELD_INVALID = "!border-[#d30202] focus:!ring-[#d30202]/20 focus-within:!ring-[#d30202]/20";

/** 40px text input / select, 12px radius — every form field in the module. */
export const TEXT_INPUT_CLASS = `h-10 w-full rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] px-2 text-[14px] ${TEXT} placeholder:text-[#687280] ${FOCUS}`;
export const TEXTAREA_CLASS = `w-full rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] px-2 py-3 text-[14px] leading-[18px] ${TEXT} placeholder:text-[#687280] ${FOCUS}`;

/** The 48px header buttons ("Import Menu (AI)", "Create New Menu"). */
export const BIG_BUTTON =
  "inline-flex h-12 shrink-0 items-center justify-center gap-1 rounded-[8px] px-3 text-[18px] font-bold leading-[18px] whitespace-nowrap transition-opacity disabled:cursor-not-allowed";
export const BIG_PRIMARY = `${BIG_BUTTON} bg-[#0D6EFD] text-white hover:opacity-90 disabled:bg-[#86b7fe] disabled:hover:opacity-100`;
export const BIG_OUTLINE = `${BIG_BUTTON} border border-[#0D6EFD] text-[#0D6EFD] hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[#0d6efd]/15`;

/** The full-width primary at the foot of every modal. */
export const MODAL_SUBMIT =
  "h-12 w-full shrink-0 rounded-[8px] bg-[#0D6EFD] px-3 text-[18px] font-bold leading-[18px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#86b7fe] disabled:hover:opacity-100 [[data-theme=dark]_&]:disabled:bg-[#1f4a94]";

/** The pale-blue information strip ("You create your menu in … branch"). */
export const INFO_STRIP = "bg-[#f0f4ff] text-[#004bb9] [[data-theme=dark]_&]:bg-[#0d6efd]/15 [[data-theme=dark]_&]:text-[#8ab8ff]";
/** Its red counterpart, shown when a step cannot continue. */
export const ERROR_STRIP = "bg-[#fef0f0] text-[#d30202] [[data-theme=dark]_&]:bg-[#d30202]/15 [[data-theme=dark]_&]:text-[#ff8a8a]";

export type PillTone = "green" | "amber" | "red" | "slate" | "orange" | "violet" | "blue";

/** Status pills as the frames draw them: a 5px dot and 12px medium text on a
 *  pastel. Dark mode mixes the same hue into the card instead of a pastel. */
export const PILL_TONE: Record<PillTone, string> = {
  green: "bg-[#dcffef] text-[#009a39] [[data-theme=dark]_&]:bg-[#009a39]/15",
  amber: "bg-[#fff5e4] text-[#ffb020] [[data-theme=dark]_&]:bg-[#ffb020]/15",
  red: "bg-[#fef0f0] text-[#d30202] [[data-theme=dark]_&]:bg-[#d30202]/15 [[data-theme=dark]_&]:text-[#ff6b6b]",
  slate: "bg-[#f1f5f9] text-[#58606c] [[data-theme=dark]_&]:bg-[var(--octo-track)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]",
  orange: "bg-[#fcf4eb] text-[#d97706] [[data-theme=dark]_&]:bg-[#d97706]/15",
  violet: "bg-[#f7f4ff] text-[#6c4dff] [[data-theme=dark]_&]:bg-[#6c4dff]/15 [[data-theme=dark]_&]:text-[#a895ff]",
  blue: "bg-[#f5f9ff] text-[#0D6EFD] [[data-theme=dark]_&]:bg-[#0d6efd]/15",
};

/** The frames' third grey (#58606c): captions, counts, quiet buttons. */
export const TEXT_GRAY = "text-[#58606c] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
/** Page titles: 24px bold on the frames' near-black (#16161d). */
export const PAGE_TITLE = "text-[24px] font-bold leading-6 text-[#16161d] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]";
/** The grey chip / quiet-button fill (#f1f5f9) and the pale-blue one (#f5f9ff). */
export const SURFACE_SUBTLE = "bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-track)]";
export const SURFACE_BLUE = "bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[#0d6efd]/15";
/** A builder column: 16px radius, the frames' outline, 12px padding. */
export const PANEL = `rounded-[16px] border ${LINE} p-3`;
