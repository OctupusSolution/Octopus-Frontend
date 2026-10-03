// apps/merchant/src/pages/customers/_shared/send-message-wizard/styles.ts
// The wizard frames' colours that have no console token; each carries its own
// dark-theme fallback so the three steps stay in step with one another.
import { PRIMARY_SUBMIT_CLASS } from "../form-controls";

export const SECTION_LABEL_CLASS = "text-[16px] font-medium leading-4 text-[var(--octo-text-primary)]";

export const OUTLINE_CLASS = "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";

export const SELECTED_SURFACE_CLASS = "border-[#0d6efd] bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[#0d6efd]/10";

export const SOFT_BLUE_BG_CLASS = "bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[#0d6efd]/10";

export const BRAND_TEXT_CLASS = "text-[#0058da] [[data-theme=dark]_&]:text-[#0d6efd]";

export const INSET_BG_CLASS = "bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]";

// The steps are spaced by the column's 16px gap, so the shared button's own
// top margin is dropped; the frame's label is 18px bold.
export const STEP_SUBMIT_CLASS = `${PRIMARY_SUBMIT_CLASS} !mt-0 !text-[18px] !font-bold !leading-[18px]`;
