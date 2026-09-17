// apps/merchant/src/pages/customers/_shared/filter-popover.tsx
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ALL_TAGS, type CustomerTag } from "./types";

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);
  return { open, setOpen, ref };
}

function PopoverTrigger({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
    >
      {label}
      <ChevronDown size={13} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
    </button>
  );
}

export function TagsFilterPopover({ selected, onApply }: { selected: readonly CustomerTag[]; onApply: (tags: readonly CustomerTag[]) => void }) {
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();
  const [draft, setDraft] = useState<CustomerTag[]>([...selected]);

  return (
    <div ref={ref} className="relative">
      <PopoverTrigger label={t("customers.filter.tags")} open={open} onClick={() => { setDraft([...selected]); setOpen((v) => !v); }} />
      {open && (
        <div className="absolute start-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3.5 shadow-lg">
          <div className="flex flex-col gap-2">
            {ALL_TAGS.map((tag) => (
              <Checkbox
                key={tag}
                label={tag}
                checked={draft.includes(tag)}
                onChange={() => setDraft((prev) => (prev.includes(tag) ? prev.filter((t2) => t2 !== tag) : [...prev, tag]))}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => { onApply(draft); setOpen(false); }}
            className="mt-3 w-full rounded-[9px] bg-[#0D6EFD] py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t("customers.filter.apply")}
          </button>
        </div>
      )}
    </div>
  );
}

export interface RangeValue {
  from: string;
  to: string;
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
  const inputType = kind === "date" ? "date" : "text";
  const fromLabel = kind === "currency" ? t("customers.filter.min") : t("customers.filter.from");
  const toLabel = kind === "currency" ? t("customers.filter.max") : t("customers.filter.to");

  return (
    <div ref={ref} className="relative">
      <PopoverTrigger label={label} open={open} onClick={() => { setDraft(value); setOpen((v) => !v); }} />
      {open && (
        <div className="absolute start-0 top-[calc(100%+6px)] z-30 w-[200px] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3.5 shadow-lg">
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
            {fromLabel}
            <input
              type={inputType}
              value={draft.from}
              onChange={(event) => setDraft((d) => ({ ...d, from: event.target.value }))}
              className="rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1.5 text-[12.5px] text-[var(--octo-text-primary)] normal-case"
            />
          </label>
          <label className="mt-2.5 flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
            {toLabel}
            <input
              type={inputType}
              value={draft.to}
              onChange={(event) => setDraft((d) => ({ ...d, to: event.target.value }))}
              className="rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1.5 text-[12.5px] text-[var(--octo-text-primary)] normal-case"
            />
          </label>
          <button
            type="button"
            onClick={() => { onApply(draft); setOpen(false); }}
            className="mt-3 w-full rounded-[9px] bg-[#0D6EFD] py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t("customers.filter.apply")}
          </button>
        </div>
      )}
    </div>
  );
}
