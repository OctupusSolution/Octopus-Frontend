"use client";

import { useI18n } from "@/app/providers";
import { formatAmount } from "@/shared/lib/pricing";

export interface OptionPillProps {
  label: string;
  /** "تكفي 8 افراد" — a qualifier under the label. */
  note?: string;
  /** Rendered as "+30 ر.س" when non-zero, so the cost sits on the control
   *  rather than only moving the total. */
  priceDeltaSar?: number;
  selected: boolean;
  /** Single-choice groups render as radios, multi-choice as checkboxes. */
  multiple?: boolean;
  onSelect: () => void;
}

/** A real button carrying radio or checkbox semantics, not a styled div — the
 *  design draws a control, so keyboard and screen-reader users get one. */
export function OptionPill({
  label, note, priceDeltaSar, selected, multiple = false, onSelect,
}: OptionPillProps) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={`inline-flex items-start gap-2 rounded-full border px-3.5 py-2 text-[12.5px] transition-colors ${
        selected
          ? "border-[#0D6EFD] bg-[var(--octo-selected)] font-semibold text-[var(--octo-text-primary)]"
          : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
      }`}
    >
      <span
        className={`mt-0.5 grid h-[15px] w-[15px] shrink-0 place-items-center border ${
          multiple ? "rounded-[4px]" : "rounded-full"
        } ${selected ? "border-[#0D6EFD]" : "border-[var(--octo-border-input)]"}`}
        aria-hidden="true"
      >
        {selected && (
          <span className={`h-[7px] w-[7px] bg-[#0D6EFD] ${multiple ? "rounded-[1px]" : "rounded-full"}`} />
        )}
      </span>

      <span className="flex flex-col items-start gap-0.5 text-start">
        <span>
          {label}
          {priceDeltaSar !== undefined && priceDeltaSar > 0 && (
            <span className="ms-1.5 text-[9.5px] font-semibold text-[#0D6EFD]">
              +{formatAmount(priceDeltaSar)}
              {t("store.currency")}
            </span>
          )}
        </span>
        {note && <span className="text-[10px] text-[var(--octo-text-muted)]">{note}</span>}
      </span>
    </button>
  );
}
