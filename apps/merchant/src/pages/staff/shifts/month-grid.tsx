import clsx from "clsx";
import { TODAY, type Employee } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { addDays, formatWeekday, formatWeekdayDate, startOfMonth, startOfWeek, toISO } from "../_shared/format";
import { useStaffStore } from "../_shared/staff-store";
import { FILL_BLUE, INK, INK_LINK, INK_MUTED, INK_SOFT, LINE } from "../_shared/theme";
import { employeeHours, shiftKey } from "./schedule-utils";

// The frames only draw the week table; the month grid borrows its chrome —
// the 8px card, #cbd5e1 rules, 12px bold header and the pale-blue "today".
export function MonthGrid({ anchor, staff, onPickDay }: { anchor: Date; staff: Employee[]; onPickDay: (day: Date) => void }) {
  const { t, locale } = useI18n();
  const store = useStaffStore();
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const weeks = Math.ceil(((monthStart.getDay() + 6) % 7 + new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  return (
    <div className={clsx("mt-6 overflow-hidden rounded-[8px] border bg-[var(--octo-card)]", LINE)}>
      <div className={clsx("grid grid-cols-7 border-b", LINE)}>
        {cells.slice(0, 7).map((d) => (
          <div key={toISO(d)} className={clsx("flex h-7 items-center justify-center truncate px-3 text-[12px] font-bold leading-3", INK)}>
            {formatWeekday(d, locale)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, index) => {
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
                "flex min-h-[96px] flex-col items-start gap-2 border-e p-2 text-start transition-colors hover:bg-[var(--octo-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D6EFD]/40 [&:nth-child(7n)]:border-e-0",
                LINE,
                index < cells.length - 7 && "border-b",
                isToday && FILL_BLUE,
                !inMonth && "opacity-45"
              )}
            >
              <span className={clsx("text-[14px] font-semibold leading-[14px]", isToday ? INK_LINK : INK)}>{d.getDate()}</span>
              {onShift > 0 ? (
                <>
                  <span className="rounded-[4px] border border-[#0058da] bg-[#f3f7fe] px-2 py-1 text-[12px] font-medium leading-3 text-[#0058da] [[data-theme=dark]_&]:border-[#5b9dff] [[data-theme=dark]_&]:bg-[#0d6efd]/15 [[data-theme=dark]_&]:text-[#5b9dff]">
                    {t("staff.shiftsTab.month.onShift").replace("{count}", String(onShift))}
                  </span>
                  <span className={clsx("text-[12px] font-medium leading-3", INK_SOFT)}>
                    {Math.round(hours)}
                    {t("staff.shiftsTab.hoursUnit")}
                  </span>
                </>
              ) : (
                <span className={clsx("text-[12px] font-medium leading-3", INK_MUTED)}>{t("staff.shiftsTab.month.noShifts")}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
