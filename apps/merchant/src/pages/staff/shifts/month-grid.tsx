import clsx from "clsx";
import { TODAY, type Employee } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { addDays, formatWeekday, formatWeekdayDate, startOfMonth, startOfWeek, toISO } from "../_shared/format";
import { useStaffStore } from "../_shared/staff-store";
import { employeeHours, shiftKey } from "./schedule-utils";

export function MonthGrid({ anchor, staff, onPickDay }: { anchor: Date; staff: Employee[]; onPickDay: (day: Date) => void }) {
  const { t, locale } = useI18n();
  const store = useStaffStore();
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const weeks = Math.ceil(((monthStart.getDay() + 6) % 7 + new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      <div className="grid grid-cols-7 border-b border-[var(--octo-divider)] bg-[var(--octo-hover)]">
        {cells.slice(0, 7).map((d) => (
          <div key={toISO(d)} className="px-2 py-2.5 text-center text-[13px] font-semibold text-[var(--octo-text-primary)]">
            {formatWeekday(d, locale)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const iso = toISO(d);
          const inMonth = d.getMonth() === anchor.getMonth();
          const onShift = staff.filter((e) => store.shifts[shiftKey(e.id, iso)]).length;
          const hours = staff.reduce((sum, e) => sum + employeeHours(e.id, [d], store.shifts), 0);
          const isToday = iso === TODAY;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPickDay(d)}
              aria-label={`${formatWeekdayDate(d, locale)} — ${t("staff.shiftsTab.month.onShift").replace("{count}", String(onShift))}`}
              className={clsx(
                "flex min-h-[96px] flex-col items-start gap-1.5 border-b border-e border-[var(--octo-divider)] p-2 text-start transition-colors hover:bg-[var(--octo-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D6EFD]/40 [&:nth-child(7n)]:border-e-0",
                !inMonth && "bg-[var(--octo-hover)]/0 opacity-45"
              )}
            >
              <span
                className={clsx(
                  "grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[13px] font-semibold",
                  isToday ? "bg-[#0D6EFD] text-white" : "text-[var(--octo-text-primary)]"
                )}
              >
                {d.getDate()}
              </span>
              {onShift > 0 ? (
                <>
                  <span className="rounded-full bg-[var(--octo-tone-info-bg)] px-2 py-0.5 text-[12px] font-medium text-[var(--octo-tone-info-text)]">
                    {t("staff.shiftsTab.month.onShift").replace("{count}", String(onShift))}
                  </span>
                  <span className="text-[12px] text-[var(--octo-text-secondary)]">
                    {Math.round(hours)}
                    {t("staff.shiftsTab.hoursUnit")}
                  </span>
                </>
              ) : (
                <span className="text-[12px] text-[var(--octo-text-faint)]">{t("staff.shiftsTab.month.noShifts")}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
