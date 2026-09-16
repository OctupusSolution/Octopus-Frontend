import { useEffect, useState } from "react";
import { CalendarOff, SquarePen } from "lucide-react";
import clsx from "clsx";
import { EmptyState, Modal } from "@ui/primitives";
import { LEAVE_TYPES, TODAY, type LeaveType } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "../_shared/avatar";
import { buttonClass } from "../_shared/buttons";
import { Field, SelectInput, TextInput } from "../_shared/form";
import { formatShortDate } from "../_shared/format";
import { useStaffLabels } from "../_shared/labels";
import { useStaffStore, type LeaveStatus } from "../_shared/staff-store";
import { ToastBanner, useToast } from "../_shared/toast";

const STATUS_TEXT: Record<LeaveStatus, string> = {
  pending: "text-[var(--octo-text-primary)]",
  approved: "text-[var(--octo-tone-success-text)]",
  rejected: "text-[var(--octo-tone-danger-text)]",
};

type Errors = { employee?: string; start?: string; end?: string };

function AddTimeOffModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (name: string) => void }) {
  const { t } = useI18n();
  const store = useStaffStore();
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<LeaveType>("Annual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setEmployeeId("");
    setType("Annual");
    setStart("");
    setEnd("");
    setErrors({});
  }, [open]);

  const submit = () => {
    const next: Errors = {};
    if (!employeeId) next.employee = t("staff.validation.required");
    if (!start) next.start = t("staff.validation.required");
    if (!end) next.end = t("staff.validation.required");
    else if (start && end < start) next.end = t("staff.validation.dateRange");
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    const employee = store.employees.find((e) => e.id === employeeId)!;
    store.setLeaveRequests((prev) => [
      { id: `LR-${Date.now().toString(36)}`, employeeId, employeeName: employee.name, type, start, end, status: "pending" },
      ...prev,
    ]);
    onAdded(employee.name);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t("staff.timeOff.addTitle")} className="max-w-2xl p-6 [&>h2]:text-[22px] [&>h2]:font-bold">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-2 flex flex-col gap-5"
      >
        <Field label={t("staff.timeOff.employee")} htmlFor="to-employee" required error={errors.employee}>
          <SelectInput id="to-employee" value={employeeId} invalid={!!errors.employee} onChange={(e) => { setEmployeeId(e.target.value); setErrors((p) => ({ ...p, employee: undefined })); }}>
            <option value="">{t("staff.assignShift.selectEmployee")}</option>
            {store.employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t("staff.timeOff.type")} htmlFor="to-type" required>
          <SelectInput id="to-type" value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
            {LEAVE_TYPES.map((lt) => (
              <option key={lt} value={lt}>{t(`staff.timeOffType.${lt.toLowerCase()}`)}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t("staff.timeOff.startDate")} htmlFor="to-start" required error={errors.start}>
          <TextInput id="to-start" type="date" value={start} min={TODAY} invalid={!!errors.start} onChange={(e) => { setStart(e.target.value); setErrors((p) => ({ ...p, start: undefined, end: undefined })); }} />
        </Field>
        <Field label={t("staff.timeOff.endDate")} htmlFor="to-end" required error={errors.end}>
          <TextInput id="to-end" type="date" value={end} min={start || TODAY} invalid={!!errors.end} onChange={(e) => { setEnd(e.target.value); setErrors((p) => ({ ...p, end: undefined })); }} />
        </Field>
        <button type="submit" className={buttonClass("primary", "lg", "mt-1 h-12 w-full text-[16px]")}>
          {t("staff.timeOff.add")}
        </button>
      </form>
    </Modal>
  );
}

export function TimeOffView({ addOpen, onAddOpenChange }: { addOpen: boolean; onAddOpenChange: (open: boolean) => void }) {
  const { t, locale } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const { toast, notify } = useToast();

  const typeLabel = (value: LeaveType) => t(`staff.timeOffType.${value.toLowerCase()}`);

  const decide = (id: string, status: Exclude<LeaveStatus, "pending">) => {
    const request = store.leaveRequests.find((r) => r.id === id);
    if (!request) return;
    store.setLeaveRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    notify(
      t(status === "approved" ? "staff.timeOff.toastApproved" : "staff.timeOff.toastRejected")
        .replace("{employee}", request.employeeName)
        .replace("{type}", typeLabel(request.type))
    );
  };

  const columns = ["employee", "type", "startDate", "endDate", "status", "actions"] as const;

  return (
    <div>
      {store.leaveRequests.length === 0 ? (
        <div className="rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
          <EmptyState icon={<CalendarOff size={18} />} title={t("staff.timeOff.emptyTitle")} description={t("staff.timeOff.emptyDescription")} />
        </div>
      ) : (
        <div className="octo-scroll overflow-x-auto rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
          <table className="w-full min-w-[980px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-[var(--octo-hover)]">
                {columns.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className={clsx(
                      "whitespace-nowrap px-3 py-2 text-[13px] font-medium text-[var(--octo-text-primary)] first:rounded-s-[6px] last:rounded-e-[6px]",
                      col === "employee" ? "text-start ps-16" : "text-center"
                    )}
                  >
                    {t(`staff.timeOff.column.${col}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {store.leaveRequests.map((r) => {
                const profile = r.employeeId ? store.profileOf(r.employeeId) : null;
                const decided = r.status !== "pending";
                return (
                  <tr key={r.id} className="border-b border-[var(--octo-divider)] last:border-b-0">
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar name={r.employeeName} size={44} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[var(--octo-text-primary)]">{r.employeeName}</span>
                          {profile && <span className="block truncate text-[13px] text-[#0D6EFD]">{labels.data("staff.jobTitle", profile.jobTitle)}</span>}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[var(--octo-text-primary)]">{typeLabel(r.type)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[var(--octo-text-primary)]">{formatShortDate(r.start, locale)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[var(--octo-text-primary)]">{formatShortDate(r.end, locale)}</td>
                    <td className={clsx("whitespace-nowrap px-3 py-3 text-center font-medium", STATUS_TEXT[r.status])}>
                      {t(`staff.timeOff.status.${r.status}`)}
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          disabled={decided}
                          onClick={() => decide(r.id, "approved")}
                          title={decided ? t("staff.timeOff.alreadyDecided") : undefined}
                          className={buttonClass("successSoft", "md", "font-medium disabled:opacity-50")}
                        >
                          <SquarePen size={18} aria-hidden />
                          {t("staff.timeOff.approve")}
                        </button>
                        <button
                          type="button"
                          disabled={decided}
                          onClick={() => decide(r.id, "rejected")}
                          title={decided ? t("staff.timeOff.alreadyDecided") : undefined}
                          className={buttonClass("dangerSoft", "md", "font-medium disabled:opacity-50")}
                        >
                          <SquarePen size={18} aria-hidden />
                          {t("staff.timeOff.reject")}
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddTimeOffModal
        open={addOpen}
        onClose={() => onAddOpenChange(false)}
        onAdded={(name) => notify(t("staff.timeOff.toastAdded").replace("{employee}", name))}
      />

      <ToastBanner toast={toast} />
    </div>
  );
}
