"use client";

export interface OptionPillProps {
  label: string;
  selected: boolean;
  /** Single-choice groups render as radios, multi-choice as checkboxes. */
  multiple?: boolean;
  onSelect: () => void;
}

/** A real button carrying radio or checkbox semantics, not a styled div — the
 *  design draws a control, so keyboard and screen-reader users get one. */
export function OptionPill({ label, selected, multiple = false, onSelect }: OptionPillProps) {
  return (
    <button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] transition-colors ${
        selected
          ? "border-[#0D6EFD] bg-[var(--octo-selected)] font-semibold text-[var(--octo-text-primary)]"
          : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
      }`}
    >
      <span
        className={`grid h-[15px] w-[15px] shrink-0 place-items-center border ${
          multiple ? "rounded-[4px]" : "rounded-full"
        } ${selected ? "border-[#0D6EFD]" : "border-[var(--octo-border-input)]"}`}
        aria-hidden="true"
      >
        {selected && (
          <span className={`h-[7px] w-[7px] bg-[#0D6EFD] ${multiple ? "rounded-[1px]" : "rounded-full"}`} />
        )}
      </span>
      {label}
    </button>
  );
}
