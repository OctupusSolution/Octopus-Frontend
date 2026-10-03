// apps/merchant/src/pages/customers/_shared/filter-popover.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { CrmCheckbox } from "./crm-checkbox";
import { DateField } from "./form-controls";
import { useTagLabel } from "./tag-chips";
import { ALL_TAGS } from "./types";
import type { RangeValue } from "./list-filter";

export type { RangeValue };

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

/** Trigger per the CRM frames: white and outlined when closed; solid blue,
 *  white label, chevron up and as wide as its popover while open. A small
 *  dot marks a filter that is applied while closed. */
function PopoverShell({
  label,
  open,
  active,
  onToggle,
  children,
  containerRef,
}: {
  label: string;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  children: ReactNode;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={clsx(
          // 7px + the 1px border = the frame's 8px inset.
          "inline-flex h-10 items-center justify-between gap-1 whitespace-nowrap rounded-[8px] border px-[7px] text-[14px] font-medium leading-[14px] transition-colors",
          open
            ? "w-[160px] border-[#0d6efd] bg-[#0d6efd] text-white"
            : "border-[#e2e8f0] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]"
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          {label}
          {active && !open && <span className="h-1.5 w-1.5 rounded-full bg-[#0D6EFD]" aria-hidden="true" />}
        </span>
        <ShellIcon name="crm-arrow-down.svg" size={24} className={clsx("transition-transform", open && "-scale-y-100")} />
      </button>
      {open && (
        <div className="absolute start-0 top-[calc(100%+8px)] z-30 flex w-[160px] flex-col gap-3 rounded-[16px] bg-[var(--octo-card)] p-3 shadow-[0_0_12px_rgba(0,0,0,0.12)]">
          {children}
        </div>
      )}
    </div>
  );
}

function ApplyButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 w-full shrink-0 rounded-[8px] bg-[#0d6efd] text-[14px] font-bold leading-[14px] text-white transition-opacity hover:opacity-90"
    >
      {t("customers.filter.apply")}
    </button>
  );
}

export function TagsFilterPopover({ selected, onApply }: { selected: readonly string[]; onApply: (tags: string[]) => void }) {
  const { t } = useI18n();
  const tagLabel = useTagLabel();
  const { open, setOpen, ref } = usePopover();
  const [draft, setDraft] = useState<string[]>([...selected]);

  return (
    <PopoverShell
      label={t("customers.filter.tags")}
      open={open}
      active={selected.length > 0}
      containerRef={ref}
      onToggle={() => { setDraft([...selected]); setOpen((v) => !v); }}
    >
      <div className="flex flex-col gap-1">
        {ALL_TAGS.map((tag) => (
          <CrmCheckbox
            key={tag}
            label={<span className="min-w-0 truncate text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)]">{tagLabel(tag)}</span>}
            className="h-8 rounded-[4px] p-1"
            checked={draft.includes(tag)}
            onChange={() => setDraft((prev) => (prev.includes(tag) ? prev.filter((t2) => t2 !== tag) : [...prev, tag]))}
          />
        ))}
      </div>
      <ApplyButton onClick={() => { onApply(draft); setOpen(false); }} />
    </PopoverShell>
  );
}

export function RangeFilterPopover({
  label,
  kind,
  value,
  onApply,
}: {
  label: string;
  kind: "number" | "currency" | "date";
  value: RangeValue;
  onApply: (value: RangeValue) => void;
}) {
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();
  const [draft, setDraft] = useState<RangeValue>(value);
  const fromLabel = kind === "currency" ? t("customers.filter.min") : t("customers.filter.from");
  const toLabel = kind === "currency" ? t("customers.filter.max") : t("customers.filter.to");
  const placeholders = kind === "currency" ? ["100", "300"] : kind === "number" ? ["1", "10"] : ["", ""];

  const field = (fieldLabel: string, key: keyof RangeValue, placeholder: string) => (
    <div className="flex flex-col gap-2 text-[14px] leading-[14px] text-[var(--octo-text-primary)]">
      <span className="font-medium">{fieldLabel}</span>
      {kind === "date" ? (
        <DateField value={draft[key]} onChange={(iso) => setDraft((d) => ({ ...d, [key]: iso }))} placeholder={t("customers.sendMessage.filter.selectDate")} ariaLabel={`${label} ${fieldLabel}`} />
      ) : (
        <div className="flex h-10 w-full items-center gap-1 rounded-[4px] border border-[#cbd5e1] bg-[var(--octo-card)] px-2 focus-within:border-[#0d6efd] focus-within:ring-2 focus-within:ring-[#0d6efd]/25 [[data-theme=dark]_&]:border-[var(--octo-border-input)]">
          {kind === "currency" && <span className="shrink-0 text-[var(--octo-text-secondary)]">SAR</span>}
          <input
            type="text"
            inputMode="decimal"
            aria-label={`${label} ${fieldLabel}`}
            value={draft[key]}
            placeholder={placeholder}
            onChange={(event) => {
              const raw = event.target.value;
              setDraft((d) => ({ ...d, [key]: raw.replace(/[^\d.]/g, "") }));
            }}
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:outline-none"
          />
        </div>
      )}
    </div>
  );

  return (
    <PopoverShell
      label={label}
      open={open}
      active={value.from !== "" || value.to !== ""}
      containerRef={ref}
      onToggle={() => { setDraft(value); setOpen((v) => !v); }}
    >
      <div className="flex flex-col gap-2">
        {field(fromLabel, "from", placeholders[0])}
        {field(toLabel, "to", placeholders[1])}
      </div>
      <ApplyButton onClick={() => { onApply(draft); setOpen(false); }} />
    </PopoverShell>
  );
}
