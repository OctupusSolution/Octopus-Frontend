import { useMemo, useState } from "react";
import { CalendarOff, Plus } from "lucide-react";
import clsx from "clsx";
import { EmptyState, Modal } from "@ui/primitives";
import { TODAY, type LeaveType } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "../_shared/avatar";
import { buttonClass } from "../_shared/buttons";
import { Field, SelectInput, TextInput } from "../_shared/form";
import { fromISO } from "../_shared/format";
import { useStaffStore, type LeaveStatus } from "../_shared/staff-store";
import { StatusPill } from "../_shared/status-pill";
import { ToastBanner, useToast } from "../_shared/toast";

type Filter = "all" | LeaveStatus;
const LEAVE_TYPES: LeaveType[] = ["Annual", "Sick", "Unpaid", "Emergency"];
const STATUS_TONE = { pending: "warning", approved: "success", declined: "danger" } as const;

function dayCount(start: string, end: string): number {
  return Math.round((fromISO(end).getTime() - fromISO(start).getTime()) / 86_400_000) + 1;
}

export function TimeOffView() {
  const { t, locale } = useI18n();
  const store = useStaffStore();
  const { toast, notify } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<LeaveType>("Annual");
  const [start, setStart] = useState(TODAY);
  const [end, setEnd] = useState(TODAY);
  const [errors, setErrors] = useState<{ employee?: string; dates?: string }>({});

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(locale === "ar" ? "ar-u-ca-gregory-nu-latn" : "en-GB", { day: "numeric", month: "short" }),
    [locale]
  );

  const counts = useMemo(() => {
    const c = { all: store.leaveRequests.length, pending: 0, approved: 0, declined: 0 };
    store.leaveRequests.forEach((r) => (c[r.status] += 1));
    return c;
  }, [store.leaveRequests]);

  const rows = store.leaveRequests.filter((r) => filter === "all" || r.status === filter);
  const typeLabel = (value: LeaveType) => t(`staff.timeOffType.${value.toLowerCase()}`);

  const decide = (id: string, status: LeaveStatus) => {
    const request = store.leaveRequests.find((r) => r.id === id);
    store.setLeaveRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (!request) return;
    const key = status === "approved" ? "staff.shiftsTab.timeOff.toastApprove" : status === "declined" ? "staff.shiftsTab.timeOff.toastDecline" : "staff.shiftsTab.timeOff.toastReopened";
    notify(t(key).replace("{employee}", request.employeeName).replace("{type}", typeLabel(request.type)));
  };

  const submit = () => {
    const next: typeof errors = {};
    if (!employeeId) next.employee = t("staff.validation.required");
    if (!start || !end || end < start) next.dates = t("staff.validation.dateRange");
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    const employee = store.employees.find((e) => e.id === employeeId)!;
    store.setLeaveRequests((prev) => [
      { id: `LR-${Date.now().toString(36)}`, employeeId, employeeName: employee.name, type, start, end, status: "pending" },
      ...prev,
    ]);
    notify(t("staff.shiftsTab.timeOff.toastCreated").replace("{employee}", employee.name));
    setAddOpen(false);
  };

  const filters: Filter[] = ["all", "pending", "approved", "declined"];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-[var(--octo-text-secondary)]">{t("staff.shiftsTab.timeOff.subtitle")}</p>
        <button
          type="button"
          onClick={() => {
            setEmployeeId("");
            setType("Annual");
            setStart(TODAY);
            setEnd(TODAY);
            setErrors({});
            setAddOpen(true);
          }}
          className={buttonClass("primary", "lg")}
        >
          <Plus size={20} aria-hidden />
          {t("staff.shiftsTab.timeOff.add")}
        </button>
      </div>

      <div role="radiogroup" aria-label={t("staff.shiftsTab.timeOff.filterAria")} className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            className={clsx(
              "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
              filter === f
                ? "border-[#0D6EFD] bg-[var(--octo-selected)] text-[#0D6EFD]"
                : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
            )}
          >
            {t(`staff.shiftsTab.timeOff.filter.${f}`)}
            <span className="rounded-full bg-[var(--octo-hover)] px-1.5 text-[12px]">{counts[f]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
          <EmptyState icon={<CalendarOff size={18} />} title={t("staff.shiftsTab.timeOff.emptyTitle")} description={t("staff.shiftsTab.timeOff.emptyDescription")} />
        </div>
      ) : (
        <div className="octo-scroll mt-4 overflow-x-auto rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
          <table className="w-full min-w-[760px] border-collapse text-[14px]">
            <thead>
              <tr className="bg-[var(--octo-hover)]">
                {["employee", "type", "dates", "days", "status", "actions"].map((col) => (
                  <th key={col} scope="col" className="whitespace-nowrap px-4 py-3 text-start text-[13px] font-medium text-[var(--octo-text-primary)]">
                    {t(`staff.shiftsTab.timeOff.column.${col}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--octo-divider)]">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={r.employeeName} size={32} />
                      <span className="font-medium text-[var(--octo-text-primary)]">{r.employeeName}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--octo-text-secondary)]">{typeLabel(r.type)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--octo-text-secondary)]">{fmt.formatRange(fromISO(r.start), fromISO(r.end))}</td>
                  <td className="px-4 py-3 text-[var(--octo-text-secondary)]">{dayCount(r.start, r.end)}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS_TONE[r.status]} label={t(`staff.shiftsTab.timeOff.filter.${r.status}`)} />
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "pending" ? (
                      <span className="flex gap-2">
                        <button type="button" onClick={() => decide(r.id, "approved")} className={buttonClass("successOutline", "sm")}>
                          {t("staff.shiftsTab.timeOff.approve")}
                        </button>
                        <button type="button" onClick={() => decide(r.id, "declined")} className={buttonClass("secondary", "sm", "text-[var(--octo-tone-danger-text)]")}>
                          {t("staff.shiftsTab.timeOff.decline")}
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => decide(r.id, "pending")} className={buttonClass("ghost", "sm")}>
                        {t("staff.shiftsTab.timeOff.undo")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("staff.shiftsTab.timeOff.addTitle")}
        className="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setAddOpen(false)} className={buttonClass("secondary")}>{t("common.cancel")}</button>
            <button type="button" onClick={submit} className={buttonClass("primary")}>{t("staff.shiftsTab.timeOff.submit")}</button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t("staff.shiftsTab.timeOff.column.employee")} htmlFor="to-employee" error={errors.employee}>
            <SelectInput id="to-employee" value={employeeId} invalid={!!errors.employee} onChange={(e) => { setEmployeeId(e.target.value); setErrors((p) => ({ ...p, employee: undefined })); }}>
              <option value="">{t("staff.shiftsTab.timeOff.chooseEmployee")}</option>
              {store.employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t("staff.shiftsTab.timeOff.column.type")} htmlFor="to-type">
            <SelectInput id="to-type" value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
              {LEAVE_TYPES.map((lt) => (
                <option key={lt} value={lt}>{typeLabel(lt)}</option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("staff.shiftsTab.timeOff.from")} htmlFor="to-start" error={errors.dates}>
              <TextInput id="to-start" type="date" value={start} invalid={!!errors.dates} onChange={(e) => { setStart(e.target.value); setErrors((p) => ({ ...p, dates: undefined })); }} />
            </Field>
            <Field label={t("staff.shiftsTab.timeOff.to")} htmlFor="to-end">
              <TextInput id="to-end" type="date" value={end} min={start} onChange={(e) => { setEnd(e.target.value); setErrors((p) => ({ ...p, dates: undefined })); }} />
            </Field>
          </div>
          {start && end && end >= start && (
            <p className="text-[13px] text-[var(--octo-text-secondary)]">
              {t("staff.shiftsTab.timeOff.totalDays").replace("{count}", String(dayCount(start, end)))}
            </p>
          )}
        </div>
      </Modal>

      <ToastBanner toast={toast} />
    </div>
  );
}
