import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import type { ReservationStatus } from "@/shared/api/mock-reservations";
import { STATE_LABEL_KEY } from "./model";
import { TONE } from "./status-pill";
import { useDismiss } from "./use-dismiss";

// Declaration order matches the frame, not the enum's own order.
const STATUS_OPTIONS: readonly ReservationStatus[] = [
  "Pending", "Confirmed", "Arrived", "Seated", "Completed", "No-show", "Cancelled",
];

export interface StatusMenuProps {
  value: ReservationStatus;
  onSelect: (status: ReservationStatus) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatusMenu({ value, onSelect, open, onOpenChange }: StatusMenuProps) {
  const { t } = useI18n();
  const ref = useDismiss(open, () => onOpenChange(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
      >
        {t("reservations.list.row.status")}
        <ChevronDown size={13} className="text-[var(--octo-text-muted)]" />
      </button>

      {open && (
        <div
          role="menu"
          // Evenly separated pills, as the frame draws them. Stacked edge to
          // edge, their rounded corners notched into each other and the list
          // read as unevenly spaced — most visibly in dark mode.
          className="absolute z-20 mt-1 w-44 space-y-1 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1.5 shadow-lg"
        >
          {STATUS_OPTIONS.map((status) => {
            const tone = TONE[status];
            return (
              <button
                key={status}
                type="button"
                role="menuitemradio"
                aria-checked={status === value}
                onClick={() => {
                  onSelect(status);
                  onOpenChange(false);
                }}
                className={clsx(
                  "flex w-full items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-start text-[12px] font-medium transition-colors",
                  tone.bg,
                  tone.text
                )}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone.dot }} />
                {t(STATE_LABEL_KEY[status])}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
