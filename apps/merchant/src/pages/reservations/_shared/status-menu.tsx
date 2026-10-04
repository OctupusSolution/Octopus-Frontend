import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import type { ReservationStatus } from "@/shared/api/mock-reservations";
import { STATE_LABEL_KEY } from "./model";
import { MENU_TONE } from "./status-pill";
import { BORDER_300, SURFACE_WHITE, TEXT_PRIMARY } from "./theme";
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
        className={clsx(
          "inline-flex h-8 items-center justify-center gap-1 rounded-[8px] border p-2 text-[14px] font-medium leading-[14px] transition-colors hover:bg-[var(--octo-hover)]",
          BORDER_300,
          SURFACE_WHITE,
          TEXT_PRIMARY
        )}
      >
        {t("reservations.list.row.status")}
        <ShellIcon name="rsv-row-arrow-down.svg" size={24} />
      </button>

      {open && (
        <div
          role="menu"
          // Evenly separated pills, as the frame draws them. Stacked edge to
          // edge, their rounded corners notched into each other and the list
          // read as unevenly spaced — most visibly in dark mode.
          className={clsx(
            "absolute end-0 z-20 mt-[9px] flex w-[146px] flex-col gap-2 rounded-[16px] p-3 shadow-[0_0_12px_0_rgba(0,0,0,0.12)]",
            SURFACE_WHITE
          )}
        >
          {STATUS_OPTIONS.map((status) => {
            const tone = MENU_TONE[status];
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
                  "flex w-full items-center gap-1 rounded-[4px] p-2 text-start text-[12px] font-semibold leading-[12px] transition-opacity hover:opacity-80",
                  tone.bg,
                  tone.text
                )}
              >
                <span className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ backgroundColor: tone.dot }} />
                {t(STATE_LABEL_KEY[status])}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
