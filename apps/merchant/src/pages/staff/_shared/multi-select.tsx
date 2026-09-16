import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { useDismiss } from "./use-dismiss";

export interface MultiOption {
  value: string;
  label: string;
  detail?: string;
}

/**
 * A dropdown of checkboxes that looks like the Staff forms' select fields.
 * `summary` decides what the closed field says; by default it lists the first
 * few picks and a blue "+N" for the rest, as the Modules Access frame does.
 */
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  selectAllLabel,
  summary,
  invalid,
  columns = 1,
  visible = 4,
}: {
  id: string;
  options: readonly MultiOption[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  selectAllLabel: string;
  summary?: (selected: MultiOption[]) => ReactNode;
  invalid?: boolean;
  columns?: 1 | 2;
  visible?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  const selected = options.filter((o) => value.includes(o.value));
  const allSelected = options.length > 0 && selected.length === options.length;
  const inOptionOrder = (next: string[]) => options.map((o) => o.value).filter((v) => next.includes(v));

  const toggle = (optionValue: string) =>
    onChange(inOptionOrder(value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]));

  const extra = selected.length - visible;

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex h-11 w-full items-center gap-2 rounded-[10px] border bg-[var(--octo-card)] px-3 text-start text-[14px] text-[var(--octo-text-primary)] transition-colors focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/20",
          invalid ? "border-[#EF4444]" : "border-[var(--octo-border-input)]"
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected.length === 0 ? (
            <span className="text-[var(--octo-text-faint)]">{placeholder}</span>
          ) : summary ? (
            summary(selected)
          ) : (
            <>
              {selected.slice(0, visible).map((o) => o.label).join(", ")}
              {extra > 0 && <span className="text-[#0D6EFD]">, +{extra}</span>}
            </>
          )}
        </span>
        <ChevronDown size={18} aria-hidden className={clsx("shrink-0 text-[var(--octo-text-secondary)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1.5 shadow-[0_12px_32px_rgba(16,24,40,0.14)]">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] font-semibold text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#0D6EFD]"
              checked={allSelected}
              onChange={() => onChange(allSelected ? [] : options.map((o) => o.value))}
            />
            {selectAllLabel}
          </label>
          <div className="my-1 border-t border-[var(--octo-divider)]" />
          <div className={clsx("octo-scroll grid max-h-64 grid-cols-1 overflow-y-auto", columns === 2 && "sm:grid-cols-2")}>
            {options.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
              >
                <input type="checkbox" className="h-4 w-4 shrink-0 accent-[#0D6EFD]" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.detail && <span className="block truncate text-[12px] text-[var(--octo-text-secondary)]">{o.detail}</span>}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
