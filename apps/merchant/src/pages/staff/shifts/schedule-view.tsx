import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CopyPlus,
  Eraser,
  FileDown,
  MessageCircle,
  Printer,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import clsx from "clsx";
import { clearScheduleWeek, copyScheduleWeek, type BulkAssignmentSkipResponse } from "@octopus/api-client";
import { EmptyState } from "@ui/primitives";
import { branches, TODAY, SHIFT_PILL_COLORS, type Branch } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "../_shared/buttons";
import { SelectInput } from "../_shared/form";
import {
  addDays,
  addMonths,
  formatDayHeader,
  formatMonthYear,
  formatWeekRange,
  formatWeekdayDate,
  fromISO,
  startOfWeek,
  toISO,
} from "../_shared/format";
import { useStaffLabels } from "../_shared/labels";
import { useCatalogNames } from "../_shared/catalog-names";
import { RowMenu } from "../_shared/row-menu";
import { useStaffStore } from "../_shared/staff-store";
import { ToastBanner, useToast } from "../_shared/toast";
import { ConfirmModal } from "../_shared/confirm-modal";
import { serverMemberIdOrNull } from "../_shared/staff-sync";
import { staffErrorText, useTx } from "../_shared/text";
import { AssignShiftModal, type AssignPreset } from "./assign-shift-modal";
import { EditShiftModal, type ShiftTarget } from "./edit-shift-modal";
import { MonthGrid } from "./month-grid";
import { printSchedule } from "./print-schedule";
import { employeeHours, formatCurrency, MAX_WEEK_HOURS, pillLabel, shiftKey, STANDARD_WEEK_HOURS, summarizeWeek } from "./schedule-utils";
import { WhatsAppModal } from "./whatsapp-modal";

type ViewMode = "week" | "month";
export type ScheduleDialog = "assign" | "bulkAssign" | null;

function SummaryTile({ icon, value, unit, label, tint, iconBg }: { icon: ReactNode; value: string; unit?: string; label: string; tint: string; iconBg: string }) {
  return (
    <div className={clsx("flex min-w-0 items-center gap-2.5 rounded-[12px] px-3 py-3", tint)}>
      <span aria-hidden className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-white", iconBg)}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block whitespace-nowrap text-[20px] font-bold leading-tight text-[var(--octo-text-primary)]">
          {value}
          {unit && <span className="ms-1 text-[12px] font-semibold text-[var(--octo-text-secondary)]">{unit}</span>}
        </span>
        <span className="line-clamp-2 block text-[13px] leading-snug text-[var(--octo-text-secondary)]">{label}</span>
      </span>
    </div>
  );
}

export function ScheduleView({ dialog, onDialogChange }: { dialog: ScheduleDialog; onDialogChange: (dialog: ScheduleDialog) => void }) {
  const { t, locale } = useI18n();
  const labels = useStaffLabels();
  const names = useCatalogNames();
  const store = useStaffStore();
  const { toast, notify } = useToast();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => fromISO(TODAY));
  const [branchFilter, setBranchFilter] = useState<"all" | Branch>("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ShiftTarget | null>(null);
  const [assignPreset, setAssignPreset] = useState<AssignPreset>({});
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [weekBusy, setWeekBusy] = useState(false);
  const tx = useTx();

  const weekStart = startOfWeek(anchor);
  const weekStartISO = toISO(weekStart);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(fromISO(weekStartISO), i)), [weekStartISO]);
  const weekRange = formatWeekRange(weekStart, locale);
  const schedule = useMemo(() => ({ shifts: store.shifts, offDays: store.offDays }), [store.shifts, store.offDays]);

  const staff = useMemo(
    () =>
      store.employees.filter(
        (e) => e.role !== "Owner" && !store.isInactive(e.id) && (branchFilter === "all" || e.branch === branchFilter)
      ),
    [store, branchFilter]
  );

  const summary = useMemo(() => summarizeWeek(staff, days, schedule), [staff, days, schedule]);

  const shiftLabel = (employeeId: string, day: Date) => {
    const key = shiftKey(employeeId, day);
    const cell = store.shifts[key];
    if (cell) return pillLabel(cell, locale);
    return store.offDays[key] ? t("staff.shiftsTab.off") : "—";
  };

  const move = (direction: 1 | -1) => setAnchor((prev) => (mode === "week" ? addDays(prev, direction * 7) : addMonths(prev, direction)));

  const openAssign = (dialogMode: Exclude<ScheduleDialog, null>, preset: AssignPreset) => {
    setAssignPreset(preset);
    onDialogChange(dialogMode);
  };

  const closeAssign = () => {
    onDialogChange(null);
    setAssignPreset({});
  };

  const skippedText = (skipped: readonly BulkAssignmentSkipResponse[]) =>
    skipped.length ? tx(` ${skipped.length} day(s) already had a shift and were left unchanged.`, ` ${skipped.length} يوم/أيام بها وردية بالفعل وتُركت كما هي.`) : "";

  // POST /schedule/copy: the seven days from this week's start onto the next
  // seven. Days that already hold a shift are skipped and reported, never
  // overwritten. Without a member it copies everyone the caller can reach.
  const copyWeekForward = async (employeeId: string | null, name?: string) => {
    const staffMemberId = employeeId ? serverMemberIdOrNull(employeeId) : null;
    if (employeeId && !staffMemberId) return notify(tx("This member is still being saved.", "ما زال هذا الموظف قيد الحفظ."), "error");
    setWeekBusy(true);
    try {
      const res = await store.scheduleOp((b) =>
        copyScheduleWeek(b, { staffMemberId, fromStart: weekStartISO, toStart: toISO(addDays(fromISO(weekStartISO), 7)) })
      );
      const done = name
        ? t("staff.shiftsTab.toastCopyWeek").replace("{name}", name)
        : tx(`Copied ${res.created} shift(s) to next week.`, `تم نسخ ${res.created} وردية إلى الأسبوع القادم.`);
      notify(`${done}${skippedText(res.skipped)}`);
    } catch (err) {
      notify(staffErrorText(err, tx), "error");
    } finally {
      setWeekBusy(false);
    }
  };

  // POST /schedule/clear over this week (inclusive). Clears within the caller's reach only.
  const clearWeek = async (employeeId: string | null, name?: string) => {
    const staffMemberId = employeeId ? serverMemberIdOrNull(employeeId) : null;
    if (employeeId && !staffMemberId) return notify(tx("This member is still being saved.", "ما زال هذا الموظف قيد الحفظ."), "error");
    setWeekBusy(true);
    try {
      const res = await store.scheduleOp((b) =>
        clearScheduleWeek(b, { staffMemberId, from: weekStartISO, to: toISO(addDays(fromISO(weekStartISO), 6)) })
      );
      notify(
        name
          ? t("staff.shiftsTab.toastDeleteWeek").replace("{name}", name)
          : tx(`Cleared ${res.removed} shift(s) this week.`, `تم مسح ${res.removed} وردية هذا الأسبوع.`)
      );
    } catch (err) {
      notify(staffErrorText(err, tx), "error");
    } finally {
      setWeekBusy(false);
    }
  };

  const branchLabel = branchFilter === "all" ? t("staff.filter.allBranches") : branchFilter;

  const print = (exportPdf: boolean) => {
    if (staff.length === 0) {
      notify(t("staff.shiftsTab.nothingToPrint"), "error");
      return;
    }
    printSchedule({
      documentTitle: `${t("staff.shiftsTab.printTitle")} ${weekRange}`,
      heading: t("staff.shiftsTab.printTitle"),
      subheading: `${weekRange} · ${branchLabel}`,
      employeeHeader: t("staff.shiftsTab.allEmployees"),
      dayHeaders: days.map((d) => formatDayHeader(d, locale)),
      rows: staff.map((e) => ({
        name: e.name,
        detail: `${names.jobTitle(store.profileOf(e.id)?.jobTitle ?? "")} · ${employeeHours(e.id, days, store.shifts)}h`,
        cells: days.map((d) => shiftLabel(e.id, d)),
      })),
      footer: t("staff.shiftsTab.printFooter").replace("{hours}", String(summary.totalHours)).replace("{count}", String(summary.employeesScheduled)),
      dir: locale === "ar" ? "rtl" : "ltr",
      lang: locale,
    });
    if (exportPdf) notify(t("staff.shiftsTab.toastExport"));
  };

  return (
    <>
      <section
        aria-label={t("staff.shiftsTab.weeklySummary")}
        className="flex flex-col gap-4 rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 xl:flex-row xl:items-center"
      >
        <div className="shrink-0 xl:w-[160px]">
          <h2 className="text-[17px] font-bold text-[var(--octo-text-primary)]">{t("staff.shiftsTab.weeklySummary")}</h2>
          <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">{weekRange}</p>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 min-[1400px]:grid-cols-5">
          <SummaryTile icon={<Clock size={24} />} value={`${summary.totalHours}${t("staff.shiftsTab.hoursUnit")}`} label={t("staff.shiftsTab.totalHours")} tint="bg-[var(--octo-tone-info-bg)]" iconBg="bg-[#0D6EFD]" />
          <SummaryTile icon={<Users size={24} />} value={String(summary.employeesScheduled)} label={t("staff.shiftsTab.totalEmployees")} tint="bg-[var(--octo-tone-violet-bg)]" iconBg="bg-[#7C3AED]" />
          <SummaryTile icon={<Timer size={24} />} value={`${summary.overtimeHours}${t("staff.shiftsTab.hoursUnit")}`} label={t("staff.shiftsTab.overtime")} tint="bg-[var(--octo-tone-danger-bg)]" iconBg="bg-[#DB2777]" />
          <SummaryTile icon={<CalendarClock size={24} />} value={String(summary.openShifts)} label={t("staff.shiftsTab.openShift")} tint="bg-[var(--octo-tone-warning-bg)]" iconBg="bg-[#D97706]" />
          <SummaryTile icon={<Wallet size={24} />} value={formatCurrency(summary.laborCost, locale, false)} unit={locale === "ar" ? "ر.س" : "SAR"} label={t("staff.shiftsTab.estLaborCost")} tint="bg-[var(--octo-tone-success-bg)]" iconBg="bg-[#16A34A]" />
        </div>
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label={t("staff.shiftsTab.viewMode")} className="inline-flex h-10 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)]">
          {(["week", "month"] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={clsx(
                "min-w-[68px] rounded-[10px] px-3 text-[14px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                mode === m ? "bg-[var(--octo-selected)] text-[#0D6EFD] ring-1 ring-inset ring-[#0D6EFD]" : "text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
              )}
            >
              {t(`staff.shiftsTab.${m}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => move(-1)} aria-label={t(mode === "week" ? "staff.shiftsTab.previousWeek" : "staff.shiftsTab.previousMonth")} className={buttonClass("secondary", "lg", "w-11 px-0")}>
            <ChevronLeft size={20} className="rtl:rotate-180" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const el = dateInputRef.current;
                if (el && typeof el.showPicker === "function") el.showPicker();
              }}
              className="flex h-11 items-center gap-2 rounded-[10px] bg-[var(--octo-hover)] px-3.5 text-[15px] font-medium text-[var(--octo-text-primary)] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
            >
              <CalendarDays size={20} aria-hidden />
              {mode === "week" ? formatWeekdayDate(anchor, locale) : formatMonthYear(anchor, locale)}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              tabIndex={-1}
              aria-label={t("staff.shiftsTab.pickDate")}
              value={toISO(anchor)}
              onChange={(e) => e.target.value && setAnchor(fromISO(e.target.value))}
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
            />
          </div>
          <button type="button" onClick={() => move(1)} aria-label={t(mode === "week" ? "staff.shiftsTab.nextWeek" : "staff.shiftsTab.nextMonth")} className={buttonClass("secondary", "lg", "w-11 px-0")}>
            <ChevronRight size={20} className="rtl:rotate-180" />
          </button>
          {toISO(anchor) !== TODAY && (
            <button type="button" onClick={() => setAnchor(fromISO(TODAY))} className={buttonClass("ghost", "md")}>
              {t("staff.shiftsTab.today")}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:ms-auto">
          <div className="w-[170px]">
            <SelectInput aria-label={t("staff.filter.allBranches")} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value as "all" | Branch)}>
              <option value="all">{t("staff.filter.allBranches")}</option>
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </SelectInput>
          </div>
          <button type="button" disabled={weekBusy} onClick={() => void copyWeekForward(null)} className={buttonClass("outline", "md")}>
            <CopyPlus size={20} aria-hidden />
            {tx("Copy to next week", "نسخ للأسبوع القادم")}
          </button>
          <button type="button" disabled={weekBusy} onClick={() => setConfirmClear(true)} className={buttonClass("dangerSoft", "md")}>
            <Eraser size={20} aria-hidden />
            {tx("Clear week", "مسح الأسبوع")}
          </button>
          <button type="button" onClick={() => setWhatsAppOpen(true)} className={buttonClass("successOutline", "md")}>
            <MessageCircle size={20} aria-hidden />
            {t("staff.shiftsTab.sendViaWhatsApp")}
          </button>
          <button type="button" onClick={() => print(false)} className={buttonClass("outline", "md")}>
            <Printer size={20} aria-hidden />
            {t("staff.shiftsTab.print")}
          </button>
          <button type="button" onClick={() => print(true)} className={buttonClass("primary", "md")}>
            <FileDown size={20} aria-hidden />
            {t("staff.shiftsTab.exportPdf")}
          </button>
        </div>
      </div>

      {mode === "month" ? (
        <MonthGrid
          anchor={anchor}
          staff={staff}
          onPickDay={(d) => {
            setAnchor(d);
            setMode("week");
          }}
        />
      ) : staff.length === 0 ? (
        <div className="mt-4 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
          <EmptyState icon={<Users size={18} />} title={t("staff.shiftsTab.noStaffTitle")} description={t("staff.shiftsTab.noStaffDescription")} />
        </div>
      ) : (
        <div className="octo-scroll mt-4 overflow-x-auto rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
          <table className="w-full min-w-[1100px] table-fixed border-collapse">
            <caption className="sr-only">{`${t("staff.shiftsTab.printTitle")} ${weekRange}`}</caption>
            <colgroup>
              <col className="w-[210px]" />
              {days.map((d) => (
                <col key={toISO(d)} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="border-b border-e border-[var(--octo-divider)] px-3 py-3 text-center text-[14px] font-semibold text-[var(--octo-text-primary)]">
                  {t("staff.shiftsTab.allEmployees")}
                </th>
                {days.map((d) => {
                  const isToday = toISO(d) === TODAY;
                  return (
                    <th
                      key={toISO(d)}
                      scope="col"
                      aria-current={isToday ? "date" : undefined}
                      className={clsx(
                        "border-b border-e border-[var(--octo-divider)] px-2 py-3 text-center text-[14px] font-semibold last:border-e-0",
                        isToday ? "bg-[var(--octo-selected)] text-[#0D6EFD]" : "text-[var(--octo-text-primary)]"
                      )}
                    >
                      {formatDayHeader(d, locale)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {staff.map((e, index) => {
                const color = SHIFT_PILL_COLORS[index % SHIFT_PILL_COLORS.length];
                const hours = employeeHours(e.id, days, store.shifts);
                const profile = store.profileOf(e.id);
                return (
                  <tr key={e.id} className="border-b border-[var(--octo-divider)] last:border-b-0">
                    <th scope="row" className="border-e border-[var(--octo-divider)] px-3 py-2 text-start align-middle font-normal">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-[var(--octo-text-primary)]">{e.name}</p>
                          <p className="truncate text-[13px] text-[var(--octo-text-secondary)]">{names.jobTitle(profile?.jobTitle ?? "")}</p>
                          <p
                            className={clsx(
                              "text-[13px]",
                              hours > MAX_WEEK_HOURS ? "font-semibold text-[var(--octo-tone-danger-text)]" : "text-[var(--octo-text-secondary)]"
                            )}
                            title={hours > MAX_WEEK_HOURS ? t("staff.shiftsTab.overLimit").replace("{max}", String(MAX_WEEK_HOURS)) : undefined}
                          >
                            {hours}{t("staff.shiftsTab.hoursUnit")}/ {STANDARD_WEEK_HOURS}{t("staff.shiftsTab.hoursUnit")}
                          </p>
                        </div>
                        <RowMenu
                          open={menuId === e.id}
                          onOpenChange={(open) => setMenuId(open ? e.id : null)}
                          ariaLabel={t("staff.grid.moreActions").replace("{name}", e.name)}
                          items={[
                            {
                              key: "copy",
                              label: t("staff.shiftsTab.rowMenu.copyWeek"),
                              onSelect: () => void copyWeekForward(e.id, e.name),
                            },
                            {
                              key: "apply",
                              label: t("staff.shiftsTab.rowMenu.applyMultipleDays"),
                              onSelect: () => openAssign("bulkAssign", { employeeIds: [e.id] }),
                            },
                            {
                              key: "delete",
                              label: t("staff.shiftsTab.rowMenu.deleteWeek"),
                              tone: "danger",
                              onSelect: () => void clearWeek(e.id, e.name),
                            },
                          ]}
                        />
                      </div>
                    </th>
                    {days.map((d) => {
                      const iso = toISO(d);
                      const key = shiftKey(e.id, iso);
                      const cell = store.shifts[key];
                      const off = store.offDays[key];
                      const dateLabel = formatWeekdayDate(d, locale);
                      return (
                        <td key={iso} className="border-e border-[var(--octo-divider)] px-2 py-2 align-middle last:border-e-0">
                          {cell || off ? (
                            <button
                              type="button"
                              onClick={() => setEditing({ employeeId: e.id, date: iso })}
                              aria-label={t("staff.shiftsTab.editShiftFor").replace("{name}", e.name).replace("{date}", dateLabel).replace("{shift}", shiftLabel(e.id, d))}
                              style={cell ? { borderColor: color, color, backgroundColor: `${color}12` } : undefined}
                              className={clsx(
                                "flex h-10 w-full items-center justify-center truncate rounded-[8px] border px-1 text-[13px] font-medium transition-[filter,border-color,color] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                                cell
                                  ? "hover:brightness-95"
                                  : "border-dashed border-[var(--octo-border-input)] text-[var(--octo-text-primary)] hover:border-[#0D6EFD] hover:text-[#0D6EFD]"
                              )}
                            >
                              {shiftLabel(e.id, d)}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAssign("assign", { employeeIds: [e.id], dates: [iso] })}
                              aria-label={t("staff.shiftsTab.assignShiftFor").replace("{name}", e.name).replace("{date}", dateLabel)}
                              className="flex h-10 w-full items-center justify-center truncate rounded-[8px] bg-[#0D6EFD] px-1 text-[13px] font-medium text-white transition-colors hover:bg-[#0b5ed7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 focus-visible:ring-offset-1"
                            >
                              {t("staff.assignShift.submit")}
                            </button>
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
      )}

      <EditShiftModal target={editing} onClose={() => setEditing(null)} notify={notify} />

      <AssignShiftModal mode="single" open={dialog === "assign"} preset={assignPreset} staff={staff} days={days} onClose={closeAssign} notify={notify} />
      <AssignShiftModal mode="bulk" open={dialog === "bulkAssign"} preset={assignPreset} staff={staff} days={days} onClose={closeAssign} notify={notify} />

      <WhatsAppModal
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        staff={staff}
        days={days}
        weekRange={weekRange}
        shiftLabel={shiftLabel}
        notify={notify}
      />

      <ConfirmModal
        open={confirmClear}
        title={tx("Clear this week?", "مسح هذا الأسبوع؟")}
        body={tx(
          `Every shift from ${weekRange} is removed for all members you manage. Time off is not affected.`,
          `ستُحذف كل الورديات في ${weekRange} لكل الموظفين الذين تديرهم. لن تتأثر الإجازات.`
        )}
        confirmLabel={tx("Clear week", "مسح الأسبوع")}
        cancelLabel={t("common.cancel")}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => void clearWeek(null)}
      />

      <ToastBanner toast={toast} />
    </>
  );
}
