// apps/merchant/src/pages/orders-list/_shared/source-filter-popover.tsx
import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import type { OrderSource } from "./types";

const SOURCE_LABEL_KEY: Record<OrderSource, string> = {
  "QR Code": "orders.source.qrCode",
  "POS Order": "orders.source.pos",
  "KIOSK Order": "orders.source.kiosk",
  "Phone Order": "orders.source.phone",
};

const ALL_SOURCES: readonly OrderSource[] = ["QR Code", "POS Order", "KIOSK Order", "Phone Order"];

export function SourceFilterPopover({
  selected,
  onChange,
}: {
  selected: readonly OrderSource[];
  onChange: (next: readonly OrderSource[]) => void;
}) {
  const { t } = useI18n();
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

  function toggle(source: OrderSource) {
    onChange(selected.includes(source) ? selected.filter((s) => s !== source) : [...selected, source]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        aria-label={t("orders.filter.sourceLabel")}
        className={`relative grid h-6 w-6 place-items-center rounded-[4px] transition-colors hover:text-[#0d6efd] ${
          open || selected.length > 0 ? "text-[#0d6efd]" : "text-[var(--octo-text-primary)]"
        }`}
      >
        <ShellIcon name="ord-filter.svg" size={24} />
        {selected.length > 0 && <span className="absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#0d6efd]" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("orders.filter.sourceLabel")}
          className="absolute start-0 top-[calc(100%+8px)] z-30 w-[200px] rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3.5 shadow-lg"
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("orders.filter.sourceLabel")}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {ALL_SOURCES.map((source) => (
              <Checkbox key={source} label={t(SOURCE_LABEL_KEY[source])} checked={selected.includes(source)} onChange={() => toggle(source)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
