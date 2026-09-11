import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileDown,
  MessageCircle,
  Printer,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import clsx from "clsx";
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
  formatTime,
  formatWeekRange,
  formatWeekdayDate,
  fromISO,
  startOfWeek,
  toISO,
} from "../_shared/format";
import { useStaffLabels } from "../_shared/labels";
import { RowMenu } from "../_shared/row-menu";
import { useStaffStore } from "../_shared/staff-store";
import { StatusPill } from "../_shared/status-pill";
import { ToastBanner, useToast } from "../_shared/toast";
import { BulkActionsModal } from "./bulk-actions-modal";
import { EditShiftModal, type ShiftTarget } from "./edit-shift-modal";
import { MonthGrid } from "./month-grid";
import { printSchedule } from "./print-schedule";
import { employeeHours, formatCurrency, MAX_WEEK_HOURS, shiftKey, STANDARD_WEEK_HOURS, summarizeWeek } from "./schedule-utils";
import { WhatsAppModal } from "./whatsapp-modal";

type ViewMode = "week" | "month";

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

export function ScheduleView() {
  const { t, locale } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const { toast, notify } = useToast();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => fromISO(TODAY));
  const [branchFilter, setBranchFilter] = useState<"all" | Branch>("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ShiftTarget | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [publishedWeeks, setPublishedWeeks] = useState<Set<string>>(() => new Set());

  const weekStart = startOfWeek(anchor);
  const weekStartISO = toISO(weekStart);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(fromISO(weekStartISO), i)), [weekStartISO]);
  const todayISO = TODAY;
  const weekRange = formatWeekRange(weekStart, locale);

  const staff = useMemo(
    () =>
      store.employees.filter(
        (e) => e.role !== "Owner" && !store.isInactive(e.id) && (branchFilter === "all" || e.branch === branchFilter)
      ),
    [store, branchFilter]
  );

  const summary = useMemo(
    () => summarizeWeek(staff, days, store.shifts, store.shiftRoles, branchFilter),
    [staff, days, store.shifts, store.shiftRoles, branchFilter]
  );

  const shiftLabel = (employeeId: string, day: Date) => {
    const cell = store.shifts[shiftKey(employeeId, day)];
    return cell ? `${formatTime(cell.start, locale)}- ${formatTime(cell.end, locale)}` : t("staff.shiftsTab.off");
  };

  const move = (direction: 1 | -1) => setAnchor((prev) => (mode === "week" ? addDays(prev, direction * 7) : addMonths(prev, direction)));

  const copyWeekForward = (employeeIds: string[]) => {
    store.setShifts((prev) => {
      const next = { ...prev };
      for (const id of employeeIds) {
        for (const d of days) {
          const source = prev[shiftKey(id, d)];
          const targetKey = shiftKey(id, addDays(d, 7));
          if (source) next[targetKey] = { ...source };
          else delete next[targetKey];
        }
      }
      return next;
    });
  };

  const clearWeek = (employeeIds: string[]) => {
    store.setShifts((prev) => {
      const next = { ...prev };
      for (const id of employeeIds) for (const d of days) delete next[shiftKey(id, d)];
      return next;
    });
  };

  const scheduledCount = staff.reduce((n, e) => n + days.filter((d) => store.shifts[shiftKey(e.id, d)]).length, 0);
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
        detail: `${labels.data("staff.jobTitle", store.profileOf(e.id)?.jobTitle ?? "")} · ${employeeHours(e.id, days, store.shifts)}h`,
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
          {publishedWeeks.has(weekStartISO) && <StatusPill className="mt-2" tone="success" label={t("staff.shiftsTab.published")} />}
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
          {toISO(anchor) !== todayISO && (
            <button type="button" onClick={() => setAnchor(fromISO(TODAY))} className={buttonClass("ghost", "md")}>
              {t("staff.shiftsTab.today")}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:ms-auto">
          <div className="w-[160px]">
            <SelectInput aria-label={t("staff.filter.allBranches")} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value as "all" | Branch)}>
              <option value="all">{t("staff.filter.allBranches")}</option>
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </SelectInput>
          </div>
          <button type="button" onClick={() => setBulkOpen(true)} className={buttonClass("warningSoft", "md")}>
            {t("staff.shiftsTab.bulkActions")}
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
                  const isToday = toISO(d) === todayISO;
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
                          <p className="truncate text-[13px] text-[var(--octo-text-secondary)]">{labels.data("staff.jobTitle", profile?.jobTitle ?? "")}</p>
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
                              onSelect: () => {
                                copyWeekForward([e.id]);
                                notify(t("staff.shiftsTab.toastCopyWeek").replace("{name}", e.name));
                              },
                            },
                            {
                              key: "delete",
                              label: t("staff.shiftsTab.rowMenu.deleteWeek"),
                              tone: "danger",
                              onSelect: () => {
                                clearWeek([e.id]);
                                notify(t("staff.shiftsTab.toastDeleteWeek").replace("{name}", e.name));
                              },
                            },
                          ]}
                        />
                      </div>
                    </th>
                    {days.map((d) => {
                      const iso = toISO(d);
                      const cell = store.shifts[shiftKey(e.id, iso)];
                      const label = shiftLabel(e.id, d);
                      return (
                        <td key={iso} className="border-e border-[var(--octo-divider)] px-2 py-2 align-middle last:border-e-0">
                          <button
                            type="button"
                            onClick={() => setEditing({ employeeId: e.id, date: iso })}
                            aria-label={t("staff.shiftsTab.editShiftFor").replace("{name}", e.name).replace("{date}", formatWeekdayDate(d, locale)).replace("{shift}", label)}
                            style={cell ? { borderColor: color, color, backgroundColor: `${color}12` } : undefined}
                            className={clsx(
                              "flex h-10 w-full items-center justify-center truncate rounded-[8px] border px-1 text-[13px] font-medium transition-[filter,border-color,color] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                              cell
                                ? "hover:brightness-95"
                                : "border-dashed border-[var(--octo-border-input)] text-[var(--octo-text-primary)] hover:border-[#0D6EFD] hover:text-[#0D6EFD]"
                            )}
                          >
                            {label}
                          </button>
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

      <BulkActionsModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        weekRange={weekRange}
        staffCount={staff.length}
        shiftCount={scheduledCount}
        onPublish={() => {
          setPublishedWeeks((prev) => new Set(prev).add(weekStartISO));
          notify(t("staff.shiftsTab.toastPublished").replace("{range}", weekRange));
        }}
        onCopyForward={() => {
          copyWeekForward(staff.map((e) => e.id));
          notify(t("staff.shiftsTab.toastCopiedAll").replace("{range}", formatWeekRange(addDays(weekStart, 7), locale)));
        }}
        onClear={() => {
          clearWeek(staff.map((e) => e.id));
          notify(t("staff.shiftsTab.toastCleared").replace("{range}", weekRange));
        }}
      />

      <WhatsAppModal
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        staff={staff}
        days={days}
        weekRange={weekRange}
        shiftLabel={shiftLabel}
        notify={notify}
      />

      <ToastBanner toast={toast} />
    </>
  );
}

