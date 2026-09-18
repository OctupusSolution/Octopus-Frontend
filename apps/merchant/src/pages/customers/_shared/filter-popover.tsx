// apps/merchant/src/pages/customers/_shared/filter-popover.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
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

/** Trigger per CRM.png (white, outlined) / CRM-actions.png (solid blue,
 *  white label, chevron up and as wide as its popover while open). A small
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
          "inline-flex h-10 items-center justify-between gap-2 rounded-[8px] border px-3 text-[14px] transition-colors",
          open
            ? "w-[168px] border-[#3B82F6] bg-[#3B82F6] text-white"
            : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          {label}
          {active && !open && <span className="h-1.5 w-1.5 rounded-full bg-[#0D6EFD]" aria-hidden="true" />}
        </span>
        <ChevronDown size={16} className={clsx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute start-0 top-[calc(100%+8px)] z-30 w-[168px] rounded-xl bg-[var(--octo-card)] p-3 shadow-[0_8px_24px_rgba(16,24,40,0.14)]">
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
      className="mt-3 h-10 w-full rounded-[8px] bg-[#3B82F6] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
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
      <div className="flex flex-col gap-3 px-1 pt-1">
        {ALL_TAGS.map((tag) => (
          <Checkbox
            key={tag}
            label={tagLabel(tag)}
            className="!gap-2.5 !text-[14px] [&_input]:h-5 [&_input]:w-5 [&>span:first-child]:h-5 [&>span:first-child]:w-5"
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
  const placeholders = kind === "currency" ? ["SAR 100", "SAR 300"] : kind === "number" ? ["1", "10"] : ["", ""];

  const field = (fieldLabel: string, key: keyof RangeValue, placeholder: string) => (
    <div className="flex flex-col gap-1.5 text-[14px] text-[var(--octo-text-primary)]">
      <span>{fieldLabel}</span>
      {kind === "date" ? (
        <DateField value={draft[key]} onChange={(iso) => setDraft((d) => ({ ...d, [key]: iso }))} placeholder={t("customers.sendMessage.filter.selectDate")} ariaLabel={`${label} ${fieldLabel}`} />
      ) : (
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
          className="h-10 w-full rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25"
        />
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
      <div className="flex flex-col gap-2.5">
        {field(fromLabel, "from", placeholders[0])}
        {field(toLabel, "to", placeholders[1])}
      </div>
      <ApplyButton onClick={() => { onApply(draft); setOpen(false); }} />
    </PopoverShell>
  );
}
