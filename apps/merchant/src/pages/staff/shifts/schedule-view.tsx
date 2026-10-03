import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import { clearScheduleWeek, copyScheduleWeek, type BulkAssignmentSkipResponse } from "@octopus/api-client";
import { EmptyState } from "@ui/primitives";
import { branches, TODAY, type Branch } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
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
import { StaffIcon } from "../_shared/icon";
import { useStaffLabels } from "../_shared/labels";
import { useCatalogNames } from "../_shared/catalog-names";
import { RowMenu } from "../_shared/row-menu";
import { useStaffStore } from "../_shared/staff-store";
import { FILL_BLUE, INK, INK_LINK, INK_MUTED, INK_SOFT, LINE, LINE_SOFT, TEXT_RED } from "../_shared/theme";
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

// Multi-colour artwork from the frame, so it is an <img> rather than a mask.
const WHATSAPP_URL = new URL("../../../../../assets/Dashboard/icons/staff-sched-whatsapp.svg", import.meta.url).href;

interface Tint {
  fg: string;
  bg: string;
}

function tintVars(tint: Tint): CSSProperties {
  return { "--tint-fg": tint.fg, "--tint-bg": tint.bg } as CSSProperties;
}

// The frame's shift chips, one colour per employee row, cycled. The frames
// only draw the light pastels, so dark mixes the same hue into the card.
const CHIP_TINTS: readonly Tint[] = [
  { fg: "#8b6fd4", bg: "#f6f3fd" },
  { fg: "#0058da", bg: "#f3f7fe" },
  { fg: "#009a39", bg: "#f2f9f3" },
  { fg: "#c77a1d", bg: "#fef9f0" },
  { fg: "#6aa4b5", bg: "#f2fbfb" },
  { fg: "#f03989", bg: "#fff5f9" },
  { fg: "#9e8ae2", bg: "#f6f4fe" },
];

const CHIP =
  "flex w-full items-center justify-center overflow-hidden whitespace-nowrap rounded-[4px] px-1 text-[12px] font-medium leading-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40";
const CHIP_TINTED =
  "border border-[color:var(--tint-fg)] bg-[var(--tint-bg)] text-[color:var(--tint-fg)] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,var(--tint-fg)_18%,var(--octo-card))] [[data-theme=dark]_&]:text-[color:color-mix(in_srgb,var(--tint-fg)_55%,white)]";

// The toolbar's own button metrics: 40px high, 14px medium, 24px icons.
const TOOL_BUTTON =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-[8px] px-3 text-[14px] font-medium leading-[14px] transition-[background-color,filter,opacity] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-50";
const NAV_BUTTON = clsx(
  "grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[4px] border transition-colors hover:bg-[var(--octo-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
  LINE,
  INK_MUTED
);

function SummaryTile({ icon, value, label, tint }: { icon: ReactNode; value: string; label: string; tint: Tint }) {
  return (
    <div
      style={tintVars(tint)}
      className="flex min-w-[150px] flex-1 items-center gap-3 rounded-[12px] border-2 border-[#fefefe] bg-[var(--tint-bg)] p-[6px] drop-shadow-[0px_4px_2.5px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border-[var(--octo-card)] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,var(--tint-fg)_18%,var(--octo-card))]"
    >
      <span aria-hidden className="relative grid h-8 w-8 shrink-0 place-items-center rounded-[4px] bg-[var(--tint-fg)] text-white">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-2 whitespace-nowrap">
        <span className={clsx("text-[24px] font-semibold leading-6", INK)}>{value}</span>
        <span className="text-[14px] font-medium leading-[14px] text-[#6f6f6f] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]">{label}</span>
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
        className={clsx("flex flex-col gap-3 rounded-[24px] border bg-[var(--octo-card)] p-3 xl:flex-row xl:items-center xl:gap-[18px]", LINE)}
      >
        <div className="flex shrink-0 flex-col gap-3">
          <h2 className="text-[18px] font-bold leading-[18px] text-[#16161d] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">{t("staff.shiftsTab.weeklySummary")}</h2>
          <p className={clsx("text-[14px] font-medium leading-[14px]", INK_MUTED)}>{weekRange}</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-[18px] gap-y-3">
          <SummaryTile
            icon={<StaffIcon name="crm-detail-clock.svg" size={24} />}
            value={`${summary.totalHours}${t("staff.shiftsTab.hoursUnit")}`}
            label={t("staff.shiftsTab.totalHours")}
            tint={{ fg: "#0063f6", bg: "#f0f6ff" }}
          />
          <SummaryTile
            icon={<StaffIcon name="staff-sched-users.svg" size={24} />}
            value={String(summary.employeesScheduled)}
            label={t("staff.shiftsTab.totalEmployees")}
            tint={{ fg: "#6903dd", bg: "#f7f0ff" }}
          />
          <SummaryTile
            icon={
              // The frame draws the overtime glyph as a timer with a separate 10px plus set into its lower right.
              <span className="relative block h-6 w-6">
                <StaffIcon name="staff-sched-timer-start.svg" size={24} className="absolute inset-0" />
                <StaffIcon name="staff-sched-timer-plus.svg" size={10} className="absolute left-[11.6px] top-[13px]" />
              </span>
            }
            value={`${summary.overtimeHours}${t("staff.shiftsTab.hoursUnit")}`}
            label={t("staff.shiftsTab.overtime")}
            tint={{ fg: "#b7007a", bg: "#fff0fa" }}
          />
          <SummaryTile
            icon={<StaffIcon name="staff-sched-shift.svg" size={24} glyph={[21.5, 20.5]} className="translate-y-[0.5px]" />}
            value={String(summary.openShifts)}
            label={t("staff.shiftsTab.openShift")}
            tint={{ fg: "#bf8001", bg: "#fffaf0" }}
          />
          <SummaryTile
            icon={<StaffIcon name="staff-sched-money.svg" size={24} />}
            value={locale === "ar" ? formatCurrency(summary.laborCost, locale) : `SAR${formatCurrency(summary.laborCost, locale, false)}`}
            label={t("staff.shiftsTab.estLaborCost")}
            tint={{ fg: "#009331", bg: "#f0fff5" }}
          />
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div role="radiogroup" aria-label={t("staff.shiftsTab.viewMode")} className="inline-flex h-[42px]">
            {(["week", "month"] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={clsx(
                  "w-[66px] border px-1 text-[12px] font-medium leading-3 transition-colors first:rounded-s-[4px] last:rounded-e-[4px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                  mode === m
                    ? clsx("border-[#0d6efd] text-[#0d6efd]", FILL_BLUE)
                    : clsx("bg-[var(--octo-card)] hover:text-[var(--octo-text-primary)]", LINE_SOFT, INK_MUTED)
                )}
              >
                {t(`staff.shiftsTab.${m}`)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button type="button" onClick={() => move(-1)} aria-label={t(mode === "week" ? "staff.shiftsTab.previousWeek" : "staff.shiftsTab.previousMonth")} className={NAV_BUTTON}>
              <StaffIcon name="form-arrow-down.svg" size={24} className="rotate-90 rtl:-rotate-90" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const el = dateInputRef.current;
                  if (el && typeof el.showPicker === "function") el.showPicker();
                }}
                className="flex h-10 items-center gap-2 whitespace-nowrap rounded-[4px] bg-[#f1f5f9] px-2 text-[14px] font-medium leading-[14px] text-[#16161d] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 [[data-theme=dark]_&]:bg-[var(--octo-hover)] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]"
              >
                <StaffIcon name="form-calendar.svg" size={24} className={INK} />
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
            <button type="button" onClick={() => move(1)} aria-label={t(mode === "week" ? "staff.shiftsTab.nextWeek" : "staff.shiftsTab.nextMonth")} className={NAV_BUTTON}>
              <StaffIcon name="form-arrow-down.svg" size={24} className="-rotate-90 rtl:rotate-90" />
            </button>
            {toISO(anchor) !== TODAY && (
              <button type="button" onClick={() => setAnchor(fromISO(TODAY))} className={clsx(TOOL_BUTTON, "px-2 hover:bg-[var(--octo-hover)]", INK_LINK)}>
                {t("staff.shiftsTab.today")}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="relative flex items-center">
            <select
              aria-label={t("staff.filter.allBranches")}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value as "all" | Branch)}
              className={clsx(
                "h-10 appearance-none rounded-[8px] border bg-[var(--octo-card)] pe-12 ps-4 text-[14px] font-medium leading-[14px] transition-colors focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25 [[data-theme=dark]_&]:focus:border-[#0D6EFD]",
                LINE_SOFT,
                INK_MUTED
              )}
            >
              <option value="all">{t("staff.filter.allBranches")}</option>
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <StaffIcon name="form-arrow-down.svg" size={24} className={clsx("pointer-events-none absolute end-4", INK_MUTED)} />
          </span>
          {/* Week-wide copy and clear are not in the frame; they take the toolbar's metrics without an icon. */}
          <button
            type="button"
            disabled={weekBusy}
            onClick={() => void copyWeekForward(null)}
            className={clsx(TOOL_BUTTON, "border border-[#007bff] bg-[var(--octo-card)] text-[#0d6efd] hover:bg-[var(--octo-selected)]")}
          >
            {tx("Copy to next week", "نسخ للأسبوع القادم")}
          </button>
          <button
            type="button"
            disabled={weekBusy}
            onClick={() => setConfirmClear(true)}
            className={clsx(TOOL_BUTTON, "border border-[#d30202] bg-[#fef0f0] text-[#d30202] hover:brightness-95 [[data-theme=dark]_&]:bg-[#d30202]/20 [[data-theme=dark]_&]:text-[#f87171]")}
          >
            {tx("Clear week", "مسح الأسبوع")}
          </button>
          <button
            type="button"
            onClick={() => setWhatsAppOpen(true)}
            className={clsx(TOOL_BUTTON, "border border-[#009a39] bg-[#f2f9f3] text-[#009a39] hover:brightness-95 [[data-theme=dark]_&]:bg-[#009a39]/20 [[data-theme=dark]_&]:text-[#4ade80]")}
          >
            <img src={WHATSAPP_URL} alt="" aria-hidden="true" width={24} height={24} className="h-6 w-6 shrink-0" />
            {t("staff.shiftsTab.sendViaWhatsApp")}
          </button>
          <button type="button" onClick={() => print(false)} className={clsx(TOOL_BUTTON, "border border-[#007bff] bg-[var(--octo-card)] text-[#0d6efd] hover:bg-[var(--octo-selected)]")}>
            <StaffIcon name="crm-detail-export.svg" size={24} />
            {t("staff.shiftsTab.print")}
          </button>
          <button type="button" onClick={() => print(true)} className={clsx(TOOL_BUTTON, "bg-[#007bff] text-white hover:bg-[#0b5ed7]")}>
            <StaffIcon name="crm-detail-export.svg" size={24} />
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
        <div className={clsx("mt-6 rounded-[8px] border bg-[var(--octo-card)]", LINE)}>
          <EmptyState icon={<StaffIcon name="staff-sched-users.svg" size={18} />} title={t("staff.shiftsTab.noStaffTitle")} description={t("staff.shiftsTab.noStaffDescription")} />
        </div>
      ) : (
        <div className={clsx("octo-scroll mt-6 overflow-x-auto rounded-[8px] border bg-[var(--octo-card)]", LINE)}>
          {/* Cells carry their own rules: the frame's column dividers are 46px
              segments inside each 63px row, not full-height table borders. */}
          <table className="w-full min-w-[1146px] table-fixed border-separate border-spacing-0">
            <caption className="sr-only">{`${t("staff.shiftsTab.printTitle")} ${weekRange}`}</caption>
            <colgroup>
              <col className="w-[150px]" />
              {days.map((d) => (
                <col key={toISO(d)} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className={clsx("h-7 truncate border-b px-4 text-center text-[12px] font-bold leading-3", LINE, INK)}>
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
                        "h-7 truncate border-b px-3 text-center text-[12px] font-bold leading-3",
                        LINE,
                        isToday ? clsx(FILL_BLUE, INK_LINK) : INK
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
                const tint = CHIP_TINTS[index % CHIP_TINTS.length];
                const hours = employeeHours(e.id, days, store.shifts);
                const profile = store.profileOf(e.id);
                return (
                  <tr key={e.id}>
                    <th scope="row" className={clsx("border-b py-2 pe-0 ps-1 text-start align-middle font-normal [tr:last-child>&]:border-b-0", LINE)}>
                      <div className={clsx("flex h-[46px] items-start justify-between gap-2 border-e pe-1", LINE)}>
                        <div className="flex min-w-0 flex-col gap-1">
                          <p className={clsx("truncate text-[14px] font-semibold leading-[14px]", INK)}>{e.name}</p>
                          <p className={clsx("truncate text-[12px] font-medium leading-3", INK_SOFT)}>{names.jobTitle(profile?.jobTitle ?? "")}</p>
                          <p
                            className={clsx("text-[12px] leading-3", hours > MAX_WEEK_HOURS ? clsx("font-semibold", TEXT_RED) : clsx("font-medium", INK_SOFT))}
                            title={hours > MAX_WEEK_HOURS ? t("staff.shiftsTab.overLimit").replace("{max}", String(MAX_WEEK_HOURS)) : undefined}
                          >
                            {hours}{t("staff.shiftsTab.hoursUnit")}/ {STANDARD_WEEK_HOURS}{t("staff.shiftsTab.hoursUnit")}
                          </p>
                        </div>
                        <RowMenu
                          align="start"
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
                        <td key={iso} className={clsx("border-b px-0 py-2 align-middle [tr:last-child>&]:border-b-0", LINE)}>
                          <div className={clsx("flex h-[46px] items-center border-e px-3 [td:last-child>&]:border-e-0", LINE)}>
                            {cell || off ? (
                              <button
                                type="button"
                                onClick={() => setEditing({ employeeId: e.id, date: iso })}
                                aria-label={t("staff.shiftsTab.editShiftFor").replace("{name}", e.name).replace("{date}", dateLabel).replace("{shift}", shiftLabel(e.id, d))}
                                style={cell ? tintVars(tint) : undefined}
                                className={clsx(
                                  CHIP,
                                  "h-[30px] transition-[filter,border-color,color]",
                                  cell
                                    ? clsx(CHIP_TINTED, "hover:brightness-95")
                                    : clsx("border border-dashed bg-[var(--octo-card)] hover:border-[#0D6EFD] hover:text-[#0D6EFD]", LINE, INK)
                                )}
                              >
                                {shiftLabel(e.id, d)}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openAssign("assign", { employeeIds: [e.id], dates: [iso] })}
                                aria-label={t("staff.shiftsTab.assignShiftFor").replace("{name}", e.name).replace("{date}", dateLabel)}
                                className={clsx(CHIP, "h-7 bg-[#0d6efd] text-white transition-colors hover:bg-[#0b5ed7] focus-visible:ring-offset-1")}
                              >
                                {t("staff.assignShift.submit")}
                              </button>
                            )}
                          </div>
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
