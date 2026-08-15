import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Send, AlertTriangle } from "lucide-react";
import { Button, Modal, Select, Textarea } from "@ui/primitives";
import {
  branches,
  scheduleStaff,
  scheduleShifts as initialShifts,
  getWeekStart,
  SHIFT_TYPE_COLOR,
  SHIFT_TYPE_TIME,
  REQUIRED_MIN_STAFF_PER_DAY,
  MAX_WEEKLY_HOURS,
  TODAY,
  type ScheduleShift,
  type ShiftType,
  type StaffRole,
} from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";

const ROLE_KEY: Record<StaffRole, string> = {
  Owner: "staff.role.owner",
  "Branch Manager": "staff.role.branchManager",
  Cashier: "staff.role.cashier",
  Waiter: "staff.role.waiter",
  Kitchen: "staff.role.kitchen",
  Driver: "staff.role.driver",
};
const SHIFT_TYPE_KEY: Record<ShiftType, string> = {
  Morning: "staff.schedule.type.morning",
  Evening: "staff.schedule.type.evening",
  Night: "staff.schedule.type.night",
};
const SCHEDULE_ROLES: StaffRole[] = ["Branch Manager", "Cashier", "Waiter", "Kitchen", "Driver"];
const WEEKDAY_KEYS = [
  "staff.schedule.day.sun", "staff.schedule.day.mon", "staff.schedule.day.tue",
  "staff.schedule.day.wed", "staff.schedule.day.thu", "staff.schedule.day.fri", "staff.schedule.day.sat",
];

function pad2(n: number): string { return String(n).padStart(2, "0"); }
function toISO(d: Date): string { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fromISO(iso: string): Date { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(d: Date, n: number): Date { const next = new Date(d); next.setDate(next.getDate() + n); return next; }

function shiftKey(employeeId: string, date: string): string {
  return `${employeeId}__${date}`;
}

export function StaffSchedulePage() {
  const { t, locale } = useI18n();
  const dtLocale = locale === "ar" ? "ar" : "en";
  const [anchor, setAnchor] = useState<Date>(() => getWeekStart(fromISO(TODAY)));
  const [branchFilter, setBranchFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [published, setPublished] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const [shiftMap, setShiftMap] = useState<Map<string, ScheduleShift>>(
    () => new Map(initialShifts.map((s) => [shiftKey(s.employeeId, s.date), s]))
  );

  const [cell, setCell] = useState<{ employeeId: string; date: string } | null>(null);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => toISO(addDays(anchor, i))), [anchor]);
  const weekLabel = useMemo(() => {
    const start = anchor;
    const end = addDays(anchor, 6);
    const startLabel = new Intl.DateTimeFormat(dtLocale, { weekday: "short", day: "numeric", numberingSystem: "latn" }).format(start);
    const endLabel = new Intl.DateTimeFormat(dtLocale, { weekday: "short", day: "numeric", month: "short", year: "numeric", numberingSystem: "latn" }).format(end);
    return `${startLabel} – ${endLabel}`;
  }, [anchor, dtLocale]);

  const rows = useMemo(
    () => scheduleStaff.filter((e) => (branchFilter === "all" || e.branch === branchFilter) && (roleFilter === "all" || e.role === roleFilter)),
    [branchFilter, roleFilter]
  );

  const goPrev = () => { setAnchor((d) => addDays(d, -7)); setPublished(false); };
  const goNext = () => { setAnchor((d) => addDays(d, 7)); setPublished(false); };

  const shiftFor = (employeeId: string, date: string) => shiftMap.get(shiftKey(employeeId, date)) ?? null;

  const weeklyHours = (employeeId: string) =>
    weekDays.reduce((sum, date) => {
      const s = shiftFor(employeeId, date);
      return sum + (s ? SHIFT_TYPE_TIME[s.type].hours : 0);
    }, 0);

  const staffCountForDay = (date: string) => rows.filter((e) => shiftFor(e.id, date)).length;

  const saveShift = (employeeId: string, date: string, patch: { type: ShiftType; start: string; end: string; breakMinutes: number; role: StaffRole; notes: string }) => {
    setShiftMap((prev) => {
      const next = new Map(prev);
      next.set(shiftKey(employeeId, date), { id: `SH-${employeeId}-${date}`, employeeId, date, ...patch });
      return next;
    });
  };
  const clearShift = (employeeId: string, date: string) => {
    setShiftMap((prev) => { const next = new Map(prev); next.delete(shiftKey(employeeId, date)); return next; });
  };

  const copyLastWeek = () => {
    setShiftMap((prev) => {
      const next = new Map(prev);
      for (const emp of rows) {
        for (let i = 0; i < 7; i++) {
          const thisDate = weekDays[i];
          const lastDate = toISO(addDays(fromISO(thisDate), -7));
          const lastShift = prev.get(shiftKey(emp.id, lastDate));
          const key = shiftKey(emp.id, thisDate);
          if (lastShift) next.set(key, { ...lastShift, id: `SH-${emp.id}-${thisDate}`, date: thisDate });
          else next.delete(key);
        }
      }
      return next;
    });
    setBanner(t("staff.schedule.copiedBanner"));
    window.setTimeout(() => setBanner(null), 2500);
  };

  const publish = () => {
    setPublished(true);
    setBanner(t("staff.schedule.publishedBanner"));
    window.setTimeout(() => setBanner(null), 2500);
  };

  const activeShift = cell ? shiftFor(cell.employeeId, cell.date) : null;
  const activeEmployee = cell ? rows.find((e) => e.id === cell.employeeId) ?? scheduleStaff.find((e) => e.id === cell.employeeId) : null;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">{t("staff.schedule.title")}</h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("staff.schedule.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Copy size={13} />} onClick={copyLastWeek}>{t("staff.schedule.copyLastWeek")}</Button>
          <Button variant="primary" icon={<Send size={13} />} onClick={publish} disabled={published}>
            {published ? t("staff.schedule.published") : t("staff.schedule.publish")}
          </Button>
        </div>
      </header>

      {banner && (
        <div className="mt-3 rounded-[9px] bg-[#eafbe9] px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">{banner}</div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-1">
          <button type="button" aria-label={t("reservations.calendar.previous")} onClick={goPrev} className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]">
            <ChevronLeft size={14} className="rtl:rotate-180" />
          </button>
          <span className="min-w-[180px] px-1 text-center text-[13px] font-semibold text-[var(--octo-text-primary)]">{weekLabel}</span>
          <button type="button" aria-label={t("reservations.calendar.next")} onClick={goNext} className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]">
            <ChevronRight size={14} className="rtl:rotate-180" />
          </button>
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Select className="w-[170px]" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="all">{t("staff.filter.allBranches")}</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
          <Select className="w-[150px]" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">{t("staff.filter.allRoles")}</option>
            {SCHEDULE_ROLES.map((r) => <option key={r} value={r}>{t(ROLE_KEY[r])}</option>)}
          </Select>
        </div>
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--octo-text-secondary)]">
          {(["Morning", "Evening", "Night"] as ShiftType[]).map((type) => (
            <span key={type} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SHIFT_TYPE_COLOR[type] }} />
              {t(SHIFT_TYPE_KEY[type])}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--octo-border-input)] bg-[var(--octo-track)]" />
            {t("staff.schedule.type.off")}
          </span>
        </div>

        <div className="octo-scroll overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="sticky start-0 z-10 whitespace-nowrap bg-[var(--octo-card)] px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("staff.col.employee")}
                </th>
                {weekDays.map((date, i) => (
                  <th key={date} className="min-w-[110px] whitespace-nowrap px-2 py-2 text-center text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t(WEEKDAY_KEYS[i])} <span className="text-[#c8c8ce]">{fromISO(date).getDate()}</span>
                  </th>
                ))}
                <th className="min-w-[100px] whitespace-nowrap px-2 py-2 text-end text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("staff.schedule.weeklyHours")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((emp) => {
                const hours = weeklyHours(emp.id);
                const over = hours > MAX_WEEKLY_HOURS;
                return (
                  <tr key={emp.id} className="border-b border-[var(--octo-row-border)] last:border-0">
                    <td className="sticky start-0 z-10 whitespace-nowrap bg-[var(--octo-card)] px-2 py-2.5">
                      <div className="font-semibold text-[var(--octo-text-primary)]">{emp.name}</div>
                      <div className="text-[11px] text-[var(--octo-text-muted)]">{t(ROLE_KEY[emp.role])} · {emp.branch}</div>
                    </td>
                    {weekDays.map((date) => {
                      const shift = shiftFor(emp.id, date);
                      return (
                        <td key={date} className="px-1.5 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => setCell({ employeeId: emp.id, date })}
                            className="w-full rounded-[7px] border px-1.5 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
                            style={
                              shift
                                ? { borderColor: SHIFT_TYPE_COLOR[shift.type], backgroundColor: `${SHIFT_TYPE_COLOR[shift.type]}1A`, color: shift.type === "Night" ? "#081026" : SHIFT_TYPE_COLOR[shift.type] }
                                : { borderColor: "var(--octo-border-input)", backgroundColor: "var(--octo-hover)", color: "var(--octo-text-faint)" }
                            }
                          >
                            {shift ? `${shift.start}–${shift.end}` : "—"}
                          </button>
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-2 py-2.5 text-end">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${over ? "text-[#dc2626]" : "text-[var(--octo-text-primary)]"}`}
                        title={over ? t("staff.schedule.overLimitTooltip") : undefined}
                      >
                        {over && <AlertTriangle size={12} />}
                        {hours}h
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--octo-divider)]">
                <td className="sticky start-0 z-10 whitespace-nowrap bg-[var(--octo-card)] px-2 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("staff.schedule.staffPerDay")}
                </td>
                {weekDays.map((date) => {
                  const count = staffCountForDay(date);
                  const low = count < REQUIRED_MIN_STAFF_PER_DAY;
                  return (
                    <td key={date} className="px-2 py-2.5 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${low ? "bg-[#fef3e8] text-[#c2660a]" : "bg-[var(--octo-track)] text-[var(--octo-text-secondary)]"}`}>
                        {count}
                      </span>
                    </td>
                  );
                })}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <ShiftModal
        open={Boolean(cell)}
        onClose={() => setCell(null)}
        employeeName={activeEmployee?.name ?? ""}
        defaultRole={activeEmployee?.role ?? "Waiter"}
        shift={activeShift}
        onClear={cell ? () => { clearShift(cell.employeeId, cell.date); setCell(null); } : undefined}
        onSave={(patch) => { if (cell) { saveShift(cell.employeeId, cell.date, patch); setCell(null); } }}
      />
    </div>
  );
}

function ShiftModal({
  open,
  onClose,
  employeeName,
  defaultRole,
  shift,
  onClear,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  defaultRole: StaffRole;
  shift: ScheduleShift | null;
  onClear?: () => void;
  onSave: (patch: { type: ShiftType; start: string; end: string; breakMinutes: number; role: StaffRole; notes: string }) => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<ShiftType>(shift?.type ?? "Morning");
  const [start, setStart] = useState(shift?.start ?? SHIFT_TYPE_TIME.Morning.start);
  const [end, setEnd] = useState(shift?.end ?? SHIFT_TYPE_TIME.Morning.end);
  const [breakMinutes, setBreakMinutes] = useState(shift?.breakMinutes ?? 30);
  const [role, setRole] = useState<StaffRole>(shift?.role ?? defaultRole);
  const [notes, setNotes] = useState(shift?.notes ?? "");

  // Re-sync local form state whenever a different cell opens.
  const resetKey = `${shift?.id ?? "new"}-${open}`;
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setType(shift?.type ?? "Morning");
    setStart(shift?.start ?? SHIFT_TYPE_TIME.Morning.start);
    setEnd(shift?.end ?? SHIFT_TYPE_TIME.Morning.end);
    setBreakMinutes(shift?.breakMinutes ?? 30);
    setRole(shift?.role ?? defaultRole);
    setNotes(shift?.notes ?? "");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t("staff.schedule.modal.title")} · ${employeeName}`}
      footer={
        <>
          {onClear && shift && (
            <Button variant="ghost" size="sm" onClick={onClear} className="me-auto">{t("staff.schedule.modal.clear")}</Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" size="sm" onClick={() => onSave({ type, start, end, breakMinutes, role, notes })}>{t("common.save")}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.schedule.modal.start")}</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.schedule.modal.end")}</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]" />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.schedule.modal.break")}</span>
          <input type="number" min={0} step={5} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]" />
        </label>
        <Select label={t("staff.schedule.modal.shiftType")} value={type} onChange={(e) => setType(e.target.value as ShiftType)}>
          <option value="Morning">{t(SHIFT_TYPE_KEY.Morning)}</option>
          <option value="Evening">{t(SHIFT_TYPE_KEY.Evening)}</option>
          <option value="Night">{t(SHIFT_TYPE_KEY.Night)}</option>
        </Select>
        <Select label={t("staff.col.role")} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {SCHEDULE_ROLES.map((r) => <option key={r} value={r}>{t(ROLE_KEY[r])}</option>)}
        </Select>
        <Textarea label={t("staff.schedule.modal.notes")} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
