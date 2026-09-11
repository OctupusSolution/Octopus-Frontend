import { useMemo, useState } from "react";
import { Calendar, CalendarClock, Clock, Users, Wallet } from "lucide-react";
import { Button, EmptyState, Segmented } from "@ui/primitives";
import { scheduleStaff, scheduleShifts, getWeekStart, TODAY, SHIFT_PILL_COLORS, type ScheduleShift } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";

const SUBNAV = ["schedule", "templates", "shiftRoles", "timeOff", "availability"] as const;
type SubnavId = (typeof SUBNAV)[number];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}
function formatShiftTime(shift: ScheduleShift): string {
  return `${shift.start}–${shift.end}`;
}

export function ShiftsTab() {
  const { t } = useI18n();
  const [subnav, setSubnav] = useState<SubnavId>("schedule");
  const [range, setRange] = useState<"week" | "month">("week");
  const weekStart = useMemo(() => getWeekStart(new Date(TODAY)), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const shiftsByEmployeeAndDate = useMemo(() => {
    const map = new Map<string, ScheduleShift>();
    for (const s of scheduleShifts) map.set(`${s.employeeId}|${s.date}`, s);
    return map;
  }, []);

  const totalHours = scheduleStaff.reduce((sum, e) => sum + e.hoursThisWeek, 0);

  return (
    <div className="mt-4">
      <div role="tablist" className="flex flex-wrap items-center gap-4 border-b border-[var(--octo-divider)] pb-2 text-[12.5px]">
        {SUBNAV.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={subnav === id}
            onClick={() => setSubnav(id)}
            className={`-mb-[9px] border-b-2 pb-2 font-medium transition-colors ${
              subnav === id ? "border-[#0D6EFD] text-[var(--octo-text-primary)]" : "border-transparent text-[var(--octo-text-muted)] hover:text-[var(--octo-text-primary)]"
            }`}
          >
            {t(`staff.shiftsTab.subnav.${id}`)}
          </button>
        ))}
      </div>

      {subnav !== "schedule" ? (
        <EmptyState
          className="mt-6"
          icon={<Calendar size={18} />}
          title={t("staff.shiftsTab.comingSoon")}
          description={t("staff.shiftsTab.comingSoonDescription")}
        />
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <p className="text-[13px] font-bold text-[var(--octo-text-primary)]">{t("staff.shiftsTab.weeklySummary")}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { icon: <Clock size={15} />, label: t("staff.shiftsTab.totalHours"), value: `${totalHours}hr`, bg: "bg-[#eaf2ff] text-[#0D6EFD]" },
                { icon: <Users size={15} />, label: t("staff.shiftsTab.totalEmployees"), value: String(scheduleStaff.length), bg: "bg-[#f3e8ff] text-[#9333ea]" },
                { icon: <CalendarClock size={15} />, label: t("staff.shiftsTab.overtime"), value: "12hr", bg: "bg-[#fce7f3] text-[#db2777]" },
                { icon: <Calendar size={15} />, label: t("staff.shiftsTab.openShift"), value: "5", bg: "bg-[#fef3c7] text-[#b45309]" },
                { icon: <Wallet size={15} />, label: t("staff.shiftsTab.estLaborCost"), value: "SAR12.500", bg: "bg-[#dcfce7] text-[#15803d]" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] ${stat.bg}`}>{stat.icon}</span>
                  <span>
                    <span className="block text-[14px] font-bold leading-tight text-[var(--octo-text-primary)]">{stat.value}</span>
                    <span className="block text-[10.5px] text-[var(--octo-text-muted)]">{stat.label}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Segmented
              options={[{ id: "week", label: t("staff.shiftsTab.week") }, { id: "month", label: t("staff.shiftsTab.month") }]}
              value={range}
              onChange={(id) => setRange(id as "week" | "month")}
            />
            <span className="text-[12px] font-medium text-[var(--octo-text-primary)]">{toISO(weekStart)}</span>
            <Button variant="secondary" size="sm" className="ms-auto">{t("staff.shiftsTab.bulkActions")}</Button>
            <Button variant="secondary" size="sm">{t("staff.shiftsTab.sendViaWhatsApp")}</Button>
            <Button variant="secondary" size="sm">{t("staff.shiftsTab.print")}</Button>
            <Button variant="primary" size="sm">{t("staff.shiftsTab.exportPdf")}</Button>
          </div>

          <div className="octo-scroll mt-3 overflow-x-auto rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
            <table className="w-full min-w-[900px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)]">
                  <th className="px-3 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("staff.shiftsTab.allEmployees")}
                  </th>
                  {days.map((d, i) => (
                    <th key={toISO(d)} className="px-3 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                      {DAY_LABELS[i]} {d.getDate()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduleStaff.map((emp, empIndex) => {
                  const color = SHIFT_PILL_COLORS[empIndex % SHIFT_PILL_COLORS.length];
                  return (
                    <tr key={emp.id} className="border-b border-[var(--octo-row-border)] last:border-0">
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="font-semibold text-[var(--octo-text-primary)]">{emp.name}</div>
                        <div className="text-[11px] text-[var(--octo-text-muted)]">{emp.role === "Branch Manager" ? "Restaurant Manager" : emp.role}</div>
                        <div className="text-[10.5px] text-[var(--octo-text-faint)]">{emp.hoursThisWeek}h/ 40h</div>
                      </td>
                      {days.map((d) => {
                        const shift = shiftsByEmployeeAndDate.get(`${emp.id}|${toISO(d)}`);
                        return (
                          <td key={toISO(d)} className="px-3 py-2.5">
                            {shift ? (
                              <span
                                className="inline-flex rounded-[7px] border px-2.5 py-1.5 text-[11px] font-medium"
                                style={{ borderColor: color, color }}
                              >
                                {formatShiftTime(shift)}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-[7px] border border-dashed border-[var(--octo-border-input)] px-2.5 py-1.5 text-[11px] text-[var(--octo-text-faint)]">
                                {t("staff.shiftsTab.off")}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
